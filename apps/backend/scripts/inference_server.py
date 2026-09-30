"""
DhwaniAI Real-Time Acoustic Inference Server
============================================
High-performance, in-memory FastAPI inference microservice for DhwaniAI.
Keeps TensorFlow Lite model and feature extraction pipelines warm in memory.
Reduces inference latency from 24+ seconds (cold process spawn) to <10ms.
"""

import os
import io
import time
import math
import wave
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict

# =============================================================================
# Constants
# =============================================================================
TARGET_SAMPLE_RATE = 16000
WINDOW_SIZE = 2.5
EXPECTED_SAMPLES = int(TARGET_SAMPLE_RATE * WINDOW_SIZE)  # 40000
FRAME_LENGTH = 512
FRAME_STEP = 256
N_MEL_BINS = 64
SPEC_TIME_STEPS = 155
LOWER_EDGE_HZ = 20.0
UPPER_EDGE_HZ = 8000.0

CLASSES = [
    "SCREAM",
    "GLASS_BREAK",
    "IMPACT_CRASH",
    "GUNSHOT_EXPLOSION",
    "CROWD_PANIC",
    "SIREN",
    "NORMAL"
]

CLASS_LABELS = {
    "SCREAM": "Screaming",
    "GLASS_BREAK": "Glass Breaking",
    "IMPACT_CRASH": "Vehicle Impact",
    "GUNSHOT_EXPLOSION": "Gunshot/Explosion",
    "CROWD_PANIC": "Crowd Panic",
    "SIREN": "Emergency Siren",
    "NORMAL": "Normal Ambient"
}

BASE_CLASS_THRESHOLDS = {
    "GUNSHOT_EXPLOSION": 0.60,
    "IMPACT_CRASH": 0.50,
    "SCREAM": 0.50,
    "GLASS_BREAK": 0.55,
    "CROWD_PANIC": 0.45,
    "SIREN": 0.50,
    "NORMAL": 0.25
}

THREAT_WEIGHTS = {
    "GUNSHOT_EXPLOSION": 1.0,
    "IMPACT_CRASH": 0.90,
    "CROWD_PANIC": 0.75,
    "GLASS_BREAK": 0.70,
    "SCREAM": 0.65,
    "SIREN": 0.30,
    "NORMAL": 0.0
}

# Resolve model path
MODEL_CANDIDATES = [
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "dhwaniai_mobilenetv5.tflite"),
    os.path.join(os.path.dirname(__file__), "..", "models", "dhwaniai_mobilenetv5.tflite"),
    r"C:\Users\HP\Desktop\DUMP\dhwaniai_mobilenetv5.tflite"
]

MODEL_PATH = None
for p in MODEL_CANDIDATES:
    if os.path.exists(p):
        MODEL_PATH = os.path.abspath(p)
        break

if not MODEL_PATH:
    raise FileNotFoundError("Could not find dhwaniai_mobilenetv5.tflite")

# =============================================================================
# Warm Engine Initialization
# =============================================================================
print(f"[InferenceServer] Loading TFLite model from {MODEL_PATH}...")
interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Precompute Mel Filter Bank
dummy_stft = tf.signal.stft(tf.zeros([FRAME_LENGTH], dtype=tf.float32), frame_length=FRAME_LENGTH, frame_step=FRAME_STEP)
num_spectrogram_bins = dummy_stft.shape[-1]
mel_matrix = tf.signal.linear_to_mel_weight_matrix(
    num_mel_bins=N_MEL_BINS,
    num_spectrogram_bins=num_spectrogram_bins,
    sample_rate=TARGET_SAMPLE_RATE,
    lower_edge_hertz=LOWER_EDGE_HZ,
    upper_edge_hertz=UPPER_EDGE_HZ
)
print("[InferenceServer] Warm engine initialized successfully.")

# =============================================================================
# State Tracking for Real-Time Streaming
# =============================================================================
EMERGENCY_CLASSES = ["SCREAM", "GLASS_BREAK", "IMPACT_CRASH", "GUNSHOT_EXPLOSION", "CROWD_PANIC"]

class RobustStreamAssessor:
    def __init__(self):
        self.history: List[Dict] = []
        self.threat_score: int = 0
        self.consecutive_dangerous: int = 0
        self.calm_streak: int = 0
        self.last_alert_time: float = 0.0
        self.active_emergency_start: Optional[float] = None
    
    def reset(self):
        self.history.clear()
        self.threat_score = 0
        self.consecutive_dangerous = 0
        self.calm_streak = 0
        self.last_alert_time = 0.0
        self.active_emergency_start = None

global_assessor = RobustStreamAssessor()

# =============================================================================
# Core DSP & Inference Functions
# =============================================================================
def extract_log_mel_spectrogram(audio: np.ndarray) -> np.ndarray:
    """Extract log-mel spectrogram matching training pipeline."""
    # Ensure correct sample length (40000)
    if len(audio) < EXPECTED_SAMPLES:
        audio = np.pad(audio, (0, EXPECTED_SAMPLES - len(audio)))
    elif len(audio) > EXPECTED_SAMPLES:
        audio = audio[:EXPECTED_SAMPLES]
    
    tensor_audio = tf.convert_to_tensor(audio, dtype=tf.float32)
    stft = tf.signal.stft(tensor_audio, frame_length=FRAME_LENGTH, frame_step=FRAME_STEP)
    magnitude = tf.abs(stft)
    mel_spec = tf.tensordot(magnitude, mel_matrix, 1)
    log_mel = tf.math.log(mel_spec + 1e-6)
    log_mel = tf.expand_dims(log_mel, -1)
    log_mel = log_mel[:SPEC_TIME_STEPS, :N_MEL_BINS, :]
    if log_mel.shape[0] < SPEC_TIME_STEPS:
        padding = tf.zeros([SPEC_TIME_STEPS - log_mel.shape[0], N_MEL_BINS, 1])
        log_mel = tf.concat([log_mel, padding], axis=0)
    
    return log_mel.numpy()

def run_tflite(spectrogram: np.ndarray) -> List[float]:
    input_data = np.expand_dims(spectrogram, axis=0).astype(np.float32)
    interpreter.set_tensor(input_details[0]['index'], input_data)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]['index'])
    return [float(x) for x in output[0]]

def compute_acoustic_physics(samples: np.ndarray, sr: int = TARGET_SAMPLE_RATE) -> Dict[str, float]:
    """Computes DSP spectral and temporal physics features for anti-spoofing."""
    if len(samples) < EXPECTED_SAMPLES:
        s = np.pad(samples, (0, EXPECTED_SAMPLES - len(samples)))
    else:
        s = samples[:EXPECTED_SAMPLES]
        
    rms = float(np.sqrt(np.mean(s ** 2)))
    peak = float(np.max(np.abs(s)))
    crest = peak / (rms + 1e-6)
    
    fft = np.abs(np.fft.rfft(s))
    freqs = np.fft.rfftfreq(len(s), 1 / sr)
    
    e_low = float(np.sum(fft[freqs < 600] ** 2))
    e_mid = float(np.sum(fft[(freqs >= 600) & (freqs < 3000)] ** 2))
    e_high = float(np.sum(fft[freqs >= 3000] ** 2))
    total_e = e_low + e_mid + e_high + 1e-9
    
    centroid = float(np.sum(freqs * fft) / (np.sum(fft) + 1e-9))
    zcr = float(np.mean(np.abs(np.diff(np.sign(s)))) / 2)
    
    return {
        "rms": rms,
        "peak": peak,
        "crest": crest,
        "low_ratio": e_low / total_e,
        "mid_ratio": e_mid / total_e,
        "high_ratio": e_high / total_e,
        "centroid": centroid,
        "zcr": zcr
    }

def assess_threat(
    probabilities: List[float],
    rms: float,
    samples: Optional[np.ndarray] = None,
    sensitivity: float = 1.0,
    rms_floor: float = 0.015,
    min_sustained: int = 2,
    decay_rate: int = 20
) -> Dict:
    normal_prob = probabilities[6]
    em_probs = {CLASSES[i]: probabilities[i] for i in range(6)}
    top_raw_class, top_raw_conf = max(em_probs.items(), key=lambda x: x[1])
    emergency_mass = sum(em_probs.values())
    
    if samples is not None and len(samples) > 0:
        dsp = compute_acoustic_physics(samples)
    else:
        dsp = {
            "rms": rms,
            "peak": 0.0,
            "crest": 1.0,
            "low_ratio": 0.5,
            "mid_ratio": 0.3,
            "high_ratio": 0.2,
            "centroid": 2000.0,
            "zcr": 0.1
        }
        
    peak = dsp["peak"]
    crest_factor = dsp["crest"]
    low_r = dsp["low_ratio"]
    mid_r = dsp["mid_ratio"]
    high_r = dsp["high_ratio"]
    centroid = dsp["centroid"]
    zcr = dsp["zcr"]
    
    is_emergency = False
    validated_class = "NORMAL"
    is_extreme_burst = False
    
    # -------------------------------------------------------------
    # 1. Absolute Noise Floor & Silence
    # -------------------------------------------------------------
    if rms < rms_floor or (rms < 0.010 and peak < 0.08):
        is_emergency = False
        validated_class = "NORMAL"
        
    # -------------------------------------------------------------
    # 2. Loud Human Speech & Voice Filter:
    # Human speech (including loud talking/shouting/whispers) has > 90% energy below 600 Hz.
    # -------------------------------------------------------------
    elif low_r >= 0.90 and high_r < 0.05 and zcr < 0.08:
        is_emergency = False
        validated_class = "NORMAL"
        
    # -------------------------------------------------------------
    # 3. Ambient Street Traffic / Low Rumble Dominance:
    # Indian street walks have dominant low-frequency engine rumble (low_r >= 0.65).
    # Screams, glass breaks, and sirens do NOT have 65%+ energy in rumble!
    # -------------------------------------------------------------
    elif low_r >= 0.65 and top_raw_class in ["SCREAM", "GLASS_BREAK", "SIREN"] and crest_factor < 5.0 and peak < 0.50:
        is_emergency = False
        validated_class = "NORMAL"
        
    # -------------------------------------------------------------
    # 4. Neural Net High Normal Confidence:
    # (Exception: if pure acoustic scream/siren tone exists or massive kinetic detonation exists)
    # -------------------------------------------------------------
    elif normal_prob >= 0.50 and emergency_mass <= 0.45 and not (mid_r >= 0.80 and low_r < 0.10) and not (peak >= 0.70 and rms >= 0.15):
        is_emergency = False
        validated_class = "NORMAL"
        
    else:
        # ---------------------------------------------------------
        # Class-Specific Acoustic & DSP Physics Validation
        # ---------------------------------------------------------
        
        # --- GLASS BREAK ---
        # Window shatter shards: high_r >= 0.07, centroid >= 1900, low_r < 0.50;
        # Heavy bottle smash: crest >= 6.5, peak >= 0.28, low_r < 0.60 (not street rumble)
        if (top_raw_class == "GLASS_BREAK" or em_probs["GLASS_BREAK"] >= 0.15):
            is_window_shatter = (high_r >= 0.07 and centroid >= 1900 and low_r < 0.50)
            is_bottle_smash = (crest_factor >= 6.5 and peak >= 0.28 and low_r < 0.60)
            if is_window_shatter or is_bottle_smash:
                is_emergency = True
                validated_class = "GLASS_BREAK"
                if crest_factor >= 7.5 and peak >= 0.35:
                    is_extreme_burst = True
                    
        # --- GUNSHOT / EXPLOSION ---
        # Impulsive report: crest >= 3.5 and peak >= 0.18.
        # Must not be low-energy street rumble: require (low_r < 0.65) OR (low_r >= 0.65 and peak >= 0.50 and rms >= 0.08)
        # OR massive detonation: (peak >= 0.70 and rms >= 0.15 and em_probs["GUNSHOT_EXPLOSION"] >= 0.18)
        if not is_emergency and (top_raw_class == "GUNSHOT_EXPLOSION" or em_probs["GUNSHOT_EXPLOSION"] >= 0.15):
            is_gun_physics = (low_r < 0.65) or (low_r >= 0.65 and peak >= 0.50 and rms >= 0.08) or (peak >= 0.70 and rms >= 0.15)
            if (crest_factor >= 3.5 and peak >= 0.18 and is_gun_physics) or (peak >= 0.80 and rms >= 0.18 and em_probs["GUNSHOT_EXPLOSION"] >= 0.20):
                is_emergency = True
                validated_class = "GUNSHOT_EXPLOSION"
                if crest_factor >= 6.0 and peak >= 0.30:
                    is_extreme_burst = True
                    
        # --- IMPACT / CAR CRASH ---
        # Automotive metal collision:
        # Requires actual crash activation (Crash >= 12% or top is Crash) and genuine crash energy
        if not is_emergency:
            is_crash_activation = (top_raw_class == "IMPACT_CRASH") or (em_probs["IMPACT_CRASH"] >= 0.12 and emergency_mass >= 0.45)
            is_crash_kinetic = (rms >= 0.06 and peak >= 0.35 and crest_factor >= 3.0) or (em_probs["IMPACT_CRASH"] >= 0.30 and peak >= 0.25)
            # If heavy low rumble (low_r >= 0.75), require top is crash OR crash probability >= 20%
            is_not_rumble = (low_r < 0.75) or (em_probs["IMPACT_CRASH"] >= 0.20) or (top_raw_class == "IMPACT_CRASH")
            if is_crash_activation and is_crash_kinetic and is_not_rumble and not (low_r >= 0.95 and zcr < 0.05):
                is_emergency = True
                validated_class = "IMPACT_CRASH"
                if peak >= 0.50 and crest_factor >= 3.5:
                    is_extreme_burst = True
                    
        # --- SCREAM ---
        # Screams are concentrated in 800-3000 Hz vocal range (mid_r >= 0.25, low_r < 0.50, rms >= 0.015)
        # OR pure acoustic vocal pitch: mid_r >= 0.75, low_r < 0.10, centroid >= 1800, rms >= 0.02
        if not is_emergency:
            is_pure_scream = (mid_r >= 0.75 and low_r < 0.10 and centroid >= 1800 and rms >= 0.02)
            is_standard_scream = (top_raw_class == "SCREAM" or em_probs["SCREAM"] >= 0.10 or emergency_mass >= 0.50) and mid_r >= 0.22 and low_r < 0.50 and rms >= 0.015
            if is_pure_scream or is_standard_scream:
                is_emergency = True
                validated_class = "SCREAM"
                
        # --- CROWD PANIC ---
        # Stampedes and shrieking crowds: elevated RMS (>= 0.030), requires genuine panic activation (em_probs >= 0.22)
        if not is_emergency and (top_raw_class == "CROWD_PANIC" or em_probs["CROWD_PANIC"] >= 0.22):
            if rms >= 0.030 and em_probs["CROWD_PANIC"] >= 0.20 and emergency_mass >= 0.45 and low_r < 0.85:
                is_emergency = True
                validated_class = "CROWD_PANIC"
                
        # --- SIREN ---
        # Pure tonal or dual-tone wail in 700-2500 Hz:
        if not is_emergency:
            is_pure_siren_tone = (mid_r >= 0.60 and low_r <= 0.25 and centroid >= 1100 and rms >= 0.015)
            is_standard_siren = (top_raw_class == "SIREN" or em_probs["SIREN"] >= 0.15) and mid_r >= 0.35 and low_r < 0.40 and rms >= 0.015
            if is_pure_siren_tone or is_standard_siren:
                is_emergency = True
                validated_class = "SIREN"
                
        # Fallback if neural net has overwhelming emergency consensus (> 0.65) and not rejected by speech/rumble
        if not is_emergency and top_raw_conf >= 0.60 and emergency_mass >= 0.70 and rms >= 0.025:
            if low_r < 0.80 and peak >= 0.30:  # Not pure voice or traffic rumble
                is_emergency = True
                validated_class = top_raw_class

    assessor = global_assessor
    now = time.time()
    
    # Sliding history window (last 6 frames)
    if len(assessor.history) >= 6:
        assessor.history.pop(0)
    assessor.history.append({
        "is_emergency": is_emergency,
        "emergency_mass": emergency_mass,
        "top_class": validated_class if is_emergency else "NORMAL",
        "confidence": em_probs.get(validated_class, top_raw_conf) if is_emergency else normal_prob,
        "probabilities": probabilities,
        "rms": rms,
        "crest": crest_factor,
        "timestamp": now
    })
    
    recent_emergencies = [h for h in assessor.history[-3:] if h["is_emergency"]]
    
    if is_emergency:
        assessor.consecutive_dangerous += 1
        assessor.calm_streak = 0
        if assessor.active_emergency_start is None:
            assessor.active_emergency_start = now
            
        conf = em_probs.get(validated_class, top_raw_conf)
        pts = int(conf * 60) + int(emergency_mass * 20) + min(assessor.consecutive_dangerous * 10, 20)
        target_score = min(100, max(50, pts))
        assessor.threat_score = max(assessor.threat_score, target_score)
    else:
        assessor.calm_streak += 1
        assessor.consecutive_dangerous = 0
        assessor.threat_score = max(0, assessor.threat_score - decay_rate)
        if assessor.threat_score < 30:
            assessor.active_emergency_start = None
                
    # Multi-window persistence:
    # Requires either verified extreme burst OR multi-window consensus (>= 2 frames)
    is_sustained = (assessor.consecutive_dangerous >= min_sustained) or (len(recent_emergencies) >= 2) or is_extreme_burst
    
    # Multi-Window Consensus Voting:
    if recent_emergencies:
        class_scores = {c: 0.0 for c in EMERGENCY_CLASSES}
        for h in recent_emergencies:
            for c in EMERGENCY_CLASSES:
                class_scores[c] += h["probabilities"][CLASSES.index(c)]
        consensus_class = max(class_scores.items(), key=lambda x: x[1])[0]
        consensus_conf = class_scores[consensus_class] / len(recent_emergencies)
    else:
        consensus_class = "NORMAL"
        consensus_conf = normal_prob
        
    situation_level = (
        "CRITICAL" if assessor.threat_score >= 70 else
        "WARNING" if assessor.threat_score >= 45 else
        "SUSPICIOUS" if assessor.threat_score >= 20 else
        "NORMAL"
    )
    
    # Alert Trigger: Active ONLY when verified sustained or extreme burst AND score >= 45
    is_alarm_active = assessor.threat_score >= 45 and is_sustained and consensus_class != "NORMAL"
    should_alert_chime = is_alarm_active and ((now - assessor.last_alert_time) > 4.0)
    if should_alert_chime:
        assessor.last_alert_time = now
        
    emergency_duration = round(now - assessor.active_emergency_start, 1) if assessor.active_emergency_start else 0.0
    
    return {
        "predictedClass": consensus_class,
        "rawClass": validated_class if is_emergency else "NORMAL",
        "confidence": round(float(consensus_conf), 4),
        "label": CLASS_LABELS.get(consensus_class, consensus_class),
        "probabilities": [round(p, 4) for p in probabilities],
        "rms": round(rms, 6),
        "threatScore": assessor.threat_score,
        "situationLevel": situation_level,
        "shouldAlert": should_alert_chime,
        "isAlarmActive": is_alarm_active,
        "isSustained": is_sustained,
        "consecutiveCount": assessor.consecutive_dangerous,
        "peakThreatClass": consensus_class,
        "emergencyMass": round(float(emergency_mass), 4),
        "emergencyDuration": emergency_duration,
        "displayMessage": (
            f"🚨 CRITICAL ALARM: Continuous {CLASS_LABELS.get(consensus_class, consensus_class)} ({emergency_duration}s active)"
            if situation_level == "CRITICAL" else
            f"⚠️ WARNING: Elevated threat — {CLASS_LABELS.get(consensus_class, consensus_class)}"
            if situation_level == "WARNING" else
            "Monitoring: Elevated acoustic activity" if situation_level == "SUSPICIOUS" else
            "Environment: Normal / Safe"
        )
    }


# =============================================================================
# FastAPI Application
# =============================================================================
app = FastAPI(title="DhwaniAI Inference Engine", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": "MobileNetV5-Edge",
        "tflite_path": MODEL_PATH,
        "classes": CLASSES
    }

@app.post("/reset")
def reset_state():
    global_assessor.reset()
    return {"status": "reset", "threatScore": 0}

@app.post("/predict-chunk")
async def predict_chunk(
    audio: UploadFile = File(...),
    sensitivity: float = Query(1.0, description="Detection sensitivity multiplier (0.5 - 2.0)"),
    rms_floor: float = Query(0.018, description="Minimum RMS energy floor (0.005 - 0.05)"),
    min_sustained: int = Query(2, description="Minimum consecutive danger windows (1 - 3)"),
    decay_rate: int = Query(20, description="Threat decay per normal window (5 - 30)")
):
    t0 = time.time()
    content = await audio.read()
    
    # Parse audio (supports WAV or raw PCM float32)
    samples: np.ndarray
    try:
        with io.BytesIO(content) as bio:
            with wave.open(bio, 'rb') as wf:
                sr = wf.getframerate()
                n_ch = wf.getnchannels()
                frames = wf.readframes(wf.getnframes())
                if wf.getsampwidth() == 2:
                    raw = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
                elif wf.getsampwidth() == 4:
                    raw = np.frombuffer(frames, dtype=np.float32)
                else:
                    raw = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
                
                if n_ch > 1:
                    raw = raw.reshape(-1, n_ch).mean(axis=1)
                
                # Resample to 16kHz if needed
                if sr != TARGET_SAMPLE_RATE:
                    import scipy.signal as sps
                    raw = sps.resample_poly(raw, TARGET_SAMPLE_RATE, sr)
                samples = raw
    except Exception:
        # Fallback: interpret as float32 PCM directly
        samples = np.frombuffer(content, dtype=np.float32)
    
    if len(samples) == 0:
        samples = np.zeros(EXPECTED_SAMPLES, dtype=np.float32)
    
    # Calculate RMS
    rms = float(np.sqrt(np.mean(samples ** 2)))
    
    # Feature extraction + TFLite inference
    spectrogram = extract_log_mel_spectrogram(samples)
    probabilities = run_tflite(spectrogram)
    
    # Threat assessment with live parameters & dynamic crest factor
    assessment = assess_threat(
        probabilities=probabilities,
        rms=rms,
        samples=samples,
        sensitivity=sensitivity,
        rms_floor=rms_floor,
        min_sustained=min_sustained,
        decay_rate=decay_rate
    )
    
    assessment["latencyMs"] = round((time.time() - t0) * 1000, 2)
    return assessment

class MobileSyncRequest(BaseModel):
    sensitivity: float
    rms_floor: float
    min_sustained: int
    decay_rate: int

@app.post("/sync-mobile")
def sync_mobile_settings(req: MobileSyncRequest):
    """
    Persists the calibrated settings into the Android source code so
    the next APK build automatically uses the verified settings.
    """
    kt_engine_path = r"C:\Users\HP\Desktop\DUMP\DhwaniAI-Guard\app\src\main\java\com\dhwaniai\guard\engine\AcousticInferenceEngine.kt"
    kt_threat_path = r"C:\Users\HP\Desktop\DUMP\DhwaniAI-Guard\app\src\main\java\com\dhwaniai\guard\engine\ThreatAssessmentEngine.kt"
    
    updated = []
    # 1. Update RMS floor & sensitivity in AcousticInferenceEngine.kt
    if os.path.exists(kt_engine_path):
        with open(kt_engine_path, "r", encoding="utf-8") as f:
            code = f.read()
        
        # Update rmsFloor
        import re
        code = re.sub(
            r'val rmsFloor = [0-9\.]+f',
            f'val rmsFloor = {req.rms_floor:.4f}f',
            code
        )
        with open(kt_engine_path, "w", encoding="utf-8") as f:
            f.write(code)
        updated.append("AcousticInferenceEngine.kt")
        
    # 2. Update sustained windows & decay rate in ThreatAssessmentEngine.kt
    if os.path.exists(kt_threat_path):
        with open(kt_threat_path, "r", encoding="utf-8") as f:
            code = f.read()
        
        code = re.sub(
            r'private const val MIN_SUSTAINED_WINDOWS = \d+',
            f'private const val MIN_SUSTAINED_WINDOWS = {req.min_sustained}',
            code
        )
        code = re.sub(
            r'private const val DECAY_RATE = \d+',
            f'private const val DECAY_RATE = {req.decay_rate}',
            code
        )
        with open(kt_threat_path, "w", encoding="utf-8") as f:
            f.write(code)
        updated.append("ThreatAssessmentEngine.kt")
        
    return {
        "status": "success",
        "syncedFiles": updated,
        "calibratedSettings": req.dict()
    }

if __name__ == "__main__":
    import uvicorn
    print("[InferenceServer] Starting FastAPI server on http://127.0.0.1:5002 ...")
    uvicorn.run(app, host="127.0.0.1", port=5002, log_level="info")
