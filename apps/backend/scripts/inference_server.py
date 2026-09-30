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

def assess_threat(
    probabilities: List[float],
    rms: float,
    samples: Optional[np.ndarray] = None,
    sensitivity: float = 1.0,
    rms_floor: float = 0.018,
    min_sustained: int = 2,
    decay_rate: int = 20
) -> Dict:
    normal_prob = probabilities[6]
    em_probs = {c: probabilities[CLASSES.index(c)] for c in EMERGENCY_CLASSES}
    top_class, top_conf = max(em_probs.items(), key=lambda x: x[1])
    emergency_mass = sum(em_probs.values())
    
    # Calculate transient peak and crest factor
    peak = float(np.max(np.abs(samples))) if samples is not None and len(samples) > 0 else 0.0
    crest_factor = peak / (rms + 1e-6)
    
    is_emergency = False
    is_extreme_burst = False
    
    # 1. Normal Sound & Noise Floor Rejection:
    # Ambient murmurs, quiet rooms, and soft voices have high normal_prob, low emergency mass, or low RMS
    if normal_prob >= 0.35 or emergency_mass < 0.58 or rms < rms_floor:
        is_emergency = False
    else:
        req_thresh = BASE_CLASS_THRESHOLDS.get(top_class, 0.50) / max(sensitivity, 0.5)
        
        # Path 1: Impulsive Sounds (Gunshot, Glass Break, Vehicle Impact Crash)
        # Must have a sharp transient crest factor (crest >= 3.8) to eliminate human speech & whispering (crest ~ 2.8)
        if top_class in ["GUNSHOT_EXPLOSION", "GLASS_BREAK", "IMPACT_CRASH"]:
            is_valid_impulse = (crest_factor >= 3.8) and (peak >= 0.25) and (top_conf >= req_thresh or emergency_mass >= 0.75)
            if is_valid_impulse:
                is_emergency = True
                # Immediate burst trigger for true high-energy gunshots, crashes, or glass shatter
                if (crest_factor >= 6.0 and peak >= 0.30 and top_conf >= 0.65) or (emergency_mass >= 0.85 and peak >= 0.45 and crest_factor >= 3.8):
                    is_extreme_burst = True
                    
        # Path 2: Sustained Sounds (Scream, Siren, Crowd Panic)
        # Tonal vocalization or sirens: requires sustained multi-window presence
        else:
            if top_class == "CROWD_PANIC":
                # Strict check for crowd panic to avoid mistaking street murmur for stampede
                is_emergency = (top_conf >= 0.55) and (emergency_mass >= 0.70) and (rms >= 0.025)
            else: # SCREAM or SIREN
                is_emergency = (top_conf >= req_thresh or emergency_mass >= 0.60) and (rms >= 0.022)
    
    assessor = global_assessor
    now = time.time()
    
    # Sliding history window (last 6 frames)
    if len(assessor.history) >= 6:
        assessor.history.pop(0)
    assessor.history.append({
        "is_emergency": is_emergency,
        "emergency_mass": emergency_mass,
        "top_class": top_class if is_emergency else "NORMAL",
        "confidence": top_conf if is_emergency else normal_prob,
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
            
        # Responsive threat score tied directly to actual neural confidence
        conf_pts = int(top_conf * 60)
        mass_pts = int((emergency_mass - normal_prob) * 25)
        streak_pts = min(assessor.consecutive_dangerous * 10, 20)
        target_score = min(100, conf_pts + mass_pts + streak_pts)
        assessor.threat_score = max(assessor.threat_score, target_score)
    else:
        assessor.calm_streak += 1
        assessor.consecutive_dangerous = 0
        # Swift decay when ambient/normal returns (drop decay_rate points per window)
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
        "rawClass": top_class,
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
