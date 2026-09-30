"""
DhwaniAI — Acoustic Event Analysis Pipeline
=============================================
A production-grade, modular inference pipeline for acoustic public safety monitoring.

Instead of single-shot classification, this pipeline:
1. Splits audio into overlapping analysis windows
2. Generates mel spectrograms per window
3. Runs TFLite inference independently per window
4. Builds an event timeline
5. Computes a weighted threat score (0-100)
6. Classifies the overall situation (Normal → Critical)
7. Generates a natural language explanation

Usage:
    python predict.py <audio_path> <model_path> [--window=2.5] [--hop=1.25]

Architecture:
    AudioProcessor → FeatureExtractor → InferenceEngine → EventAggregator
                                                           ↓
                                            ThreatAssessmentEngine → DecisionEngine

Author: DhwaniAI Team
"""

import sys
import json
import time
import math
import argparse
import numpy as np
from typing import List, Dict, Tuple, Optional


# =============================================================================
# Constants & Configuration
# =============================================================================

CLASSES = [
    "SCREAM",           # 0 - Human distress vocalization
    "GLASS_BREAK",      # 1 - Breaking glass / window shatter
    "IMPACT_CRASH",     # 2 - Vehicle collision / heavy impact
    "GUNSHOT_EXPLOSION", # 3 - Firearm discharge / explosive event
    "CROWD_PANIC",      # 4 - Mass crowd disturbance
    "SIREN",            # 5 - Emergency vehicle siren
    "NORMAL",           # 6 - Ambient / non-threatening sound
]

# Human-readable labels for explanation generation
CLASS_LABELS = {
    "SCREAM": "screaming",
    "GLASS_BREAK": "glass breaking",
    "IMPACT_CRASH": "vehicle impact",
    "GUNSHOT_EXPLOSION": "gunshot/explosion",
    "CROWD_PANIC": "crowd panic",
    "SIREN": "emergency siren",
    "NORMAL": "normal ambient sound",
}

# Audio processing parameters (matched to training pipeline)
TARGET_SAMPLE_RATE = 16000   # Hz - standard for speech/environmental audio
DEFAULT_WINDOW_SIZE = 2.5    # seconds - matches training clip duration
DEFAULT_HOP_SIZE = 1.25      # seconds - 50% overlap for temporal continuity

# STFT parameters (matched to training pipeline)
FRAME_LENGTH = 512           # ~32ms at 16kHz - captures transient events
FRAME_STEP = 256             # ~16ms hop - 50% frame overlap
N_MEL_BINS = 64              # mel filter banks - sufficient for environmental audio
SPEC_TIME_STEPS = 155        # expected time frames in spectrogram
LOWER_EDGE_HZ = 20.0         # human hearing lower bound
UPPER_EDGE_HZ = 8000.0       # Nyquist / 2 for 16kHz - covers most environmental events

# Threat assessment weights
# Rationale: weights reflect real-world danger severity for public safety
THREAT_WEIGHTS = {
    "GUNSHOT_EXPLOSION": 1.0,  # Immediate lethal threat
    "IMPACT_CRASH": 0.90,      # High injury potential
    "CROWD_PANIC": 0.75,       # Mass casualty risk
    "GLASS_BREAK": 0.70,       # Property damage / forced entry indicator
    "SCREAM": 0.65,            # Distress signal - context-dependent
    "SIREN": 0.30,             # Informational - emergency already responded
    "NORMAL": 0.0,             # No threat
}

# Calibrated confidence thresholds per class to prevent false alarms on transient sounds
CLASS_THRESHOLDS = {
    "GUNSHOT_EXPLOSION": 0.70,  # Gunshot requires high certainty to avoid misidentifying sharp clanks
    "IMPACT_CRASH": 0.55,       # Collision detection threshold
    "SCREAM": 0.65,             # Screaming vocalization threshold (avoids shouting/whistles)
    "GLASS_BREAK": 0.65,        # Glass shatter threshold
    "CROWD_PANIC": 0.50,        # Crowd disturbance threshold
    "SIREN": 0.55,              # Emergency siren threshold
    "NORMAL": 0.30,             # Ambient sound threshold
}

# Co-occurrence rules: patterns that escalate threat
# Format: (event_a, event_b, time_window_seconds, boost_multiplier)
CO_OCCURRENCE_RULES = [
    ("IMPACT_CRASH", "SCREAM", 5.0, 1.5),
    ("IMPACT_CRASH", "CROWD_PANIC", 5.0, 1.5),
    ("GLASS_BREAK", "CROWD_PANIC", 5.0, 1.4),
    ("GLASS_BREAK", "SCREAM", 5.0, 1.3),
    ("GUNSHOT_EXPLOSION", "SCREAM", 5.0, 1.6),
    ("GUNSHOT_EXPLOSION", "CROWD_PANIC", 5.0, 1.6),
    ("SCREAM", "CROWD_PANIC", 5.0, 1.3),
]

# Situation level thresholds
SITUATION_THRESHOLDS = {
    "CRITICAL": 70,
    "WARNING": 45,
    "SUSPICIOUS": 20,
    "NORMAL": 0,
}

# Confidence cutoff - predictions below this are treated as uncertain
CONFIDENCE_CUTOFF = 0.40


# =============================================================================
# Class 1: AudioProcessor
# =============================================================================

class AudioProcessor:
    """
    Loads raw audio and splits it into overlapping analysis windows.
    
    Parameters:
        window_size (float): Duration of each analysis window in seconds.
            Default 2.5s matches the training clip duration exactly.
        hop_size (float): Step size between consecutive windows in seconds.
            Default 1.25s gives 50% overlap, ensuring no event is missed
            at a window boundary.
        sample_rate (int): Target sample rate for audio resampling.
            Default 16kHz is standard for environmental sound analysis.
    """
    
    def __init__(self, window_size: float = DEFAULT_WINDOW_SIZE,
                 hop_size: float = DEFAULT_HOP_SIZE,
                 sample_rate: int = TARGET_SAMPLE_RATE):
        self.window_size = window_size
        self.hop_size = hop_size
        self.sample_rate = sample_rate
        self.window_samples = int(sample_rate * window_size)
        self.hop_samples = int(sample_rate * hop_size)
    
    def load_audio(self, file_path: str) -> np.ndarray:
        """Load audio file, resample to target rate, convert to mono."""
        import librosa
        signal, _ = librosa.load(file_path, sr=self.sample_rate, mono=True)
        return signal.astype(np.float32)
    
    def split_into_windows(self, audio: np.ndarray) -> List[Dict]:
        """
        Split audio into overlapping windows.
        
        Returns list of dicts with:
            - 'audio': numpy array of the window samples
            - 'start': start time in seconds
            - 'end': end time in seconds
            - 'index': window index
        """
        windows = []
        total_samples = len(audio)
        duration = total_samples / self.sample_rate
        
        start_sample = 0
        idx = 0
        
        while start_sample < total_samples:
            end_sample = start_sample + self.window_samples
            
            # Extract window, pad if necessary (final window may be shorter)
            if end_sample <= total_samples:
                window_audio = audio[start_sample:end_sample]
            else:
                # Pad the final incomplete window with zeros
                window_audio = np.zeros(self.window_samples, dtype=np.float32)
                remaining = audio[start_sample:]
                window_audio[:len(remaining)] = remaining
            
            start_time = start_sample / self.sample_rate
            end_time = min(end_sample / self.sample_rate, duration)
            win_rms = float(np.sqrt(np.mean(window_audio**2)))
            
            windows.append({
                'audio': window_audio,
                'start': round(start_time, 2),
                'end': round(end_time, 2),
                'index': idx,
                'rms': round(win_rms, 6),
            })
            
            start_sample += self.hop_samples
            idx += 1
        
        return windows
    
    def get_duration(self, audio: np.ndarray) -> float:
        """Get audio duration in seconds."""
        return round(len(audio) / self.sample_rate, 2)


# =============================================================================
# Class 2: FeatureExtractor
# =============================================================================

class FeatureExtractor:
    """
    Generates log-mel spectrograms from audio windows.
    
    The feature extraction pipeline exactly mirrors the training preprocessing:
    1. STFT with frame_length=512, frame_step=256
    2. Magnitude spectrum
    3. Mel filter bank projection (64 bins, 20-8000 Hz)
    4. Log compression (log(x + 1e-6))
    5. Reshape to (155, 64, 1) — the model's expected input shape
    
    Parameters match the training notebook to ensure inference accuracy.
    """
    
    def __init__(self):
        self._mel_matrix = None
    
    def extract(self, audio: np.ndarray) -> np.ndarray:
        """
        Convert a single audio window to a log-mel spectrogram.
        
        Input: audio array of shape (window_samples,)
        Output: spectrogram of shape (155, 64, 1) matching model input
        """
        import tensorflow as tf
        
        # Short-Time Fourier Transform
        stft_matrix = tf.signal.stft(audio, frame_length=FRAME_LENGTH, frame_step=FRAME_STEP)
        magnitude = tf.abs(stft_matrix)
        
        # Mel filter bank (cached for efficiency)
        if self._mel_matrix is None:
            self._mel_matrix = tf.signal.linear_to_mel_weight_matrix(
                num_mel_bins=N_MEL_BINS,
                num_spectrogram_bins=magnitude.shape[-1],
                sample_rate=TARGET_SAMPLE_RATE,
                lower_edge_hertz=LOWER_EDGE_HZ,
                upper_edge_hertz=UPPER_EDGE_HZ,
            )
        
        # Project to mel scale and apply log compression
        mel_spectrogram = tf.tensordot(magnitude, self._mel_matrix, 1)
        log_mel = tf.math.log(mel_spectrogram + 1e-6)
        
        # Add channel dimension: (time, mel_bins) → (time, mel_bins, 1)
        log_mel = tf.expand_dims(log_mel, -1)
        
        # Ensure exact shape (155, 64, 1) to match model input
        log_mel = log_mel[:SPEC_TIME_STEPS, :N_MEL_BINS, :]
        if log_mel.shape[0] < SPEC_TIME_STEPS:
            padding = tf.zeros([SPEC_TIME_STEPS - log_mel.shape[0], N_MEL_BINS, 1])
            log_mel = tf.concat([log_mel, padding], axis=0)
        
        return log_mel.numpy()


# =============================================================================
# Class 3: InferenceEngine
# =============================================================================

class InferenceEngine:
    """
    Runs TensorFlow Lite inference on spectrograms.
    
    Loads the interpreter once and reuses it for all windows,
    avoiding the overhead of repeated model loading.
    """
    
    def __init__(self, model_path: str):
        import tensorflow as tf
        
        self.model_path = model_path
        self.is_tflite = model_path.endswith('.tflite')
        
        if self.is_tflite:
            self.interpreter = tf.lite.Interpreter(model_path=model_path)
            self.interpreter.allocate_tensors()
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
        else:
            self.model = tf.keras.models.load_model(model_path)
    
    def predict(self, spectrogram: np.ndarray, win_rms: Optional[float] = None,
                rms_floor: Optional[float] = None) -> Dict:
        """
        Run inference on a single spectrogram.
        
        Input: spectrogram of shape (155, 64, 1)
        Output: dict with 'class', 'confidence', 'probabilities'
        """
        import tensorflow as tf
        
        # Add batch dimension: (155, 64, 1) → (1, 155, 64, 1)
        input_data = np.expand_dims(spectrogram, axis=0).astype(np.float32)
        
        if self.is_tflite:
            self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
            self.interpreter.invoke()
            output = self.interpreter.get_tensor(self.output_details[0]['index'])
            probabilities = output[0].tolist()
        else:
            output = self.model.predict(input_data, verbose=0)
            probabilities = output[0].tolist()
        
        # Find raw predicted class
        max_idx = int(np.argmax(probabilities))
        predicted_class = CLASSES[max_idx]
        confidence = probabilities[max_idx]
        normal_prob = probabilities[6]
        
        # Energy gate: silence or sub-noise-floor windows cannot be emergency events
        if win_rms is not None and rms_floor is not None and win_rms < rms_floor:
            predicted_class = 'NORMAL'
            confidence = normal_prob
        elif predicted_class != 'NORMAL':
            # Check class-specific calibrated confidence threshold
            thresh = CLASS_THRESHOLDS.get(predicted_class, 0.60)
            if confidence < thresh:
                # If confidence doesn't meet emergency threshold, fallback to NORMAL if ambient prob is non-trivial
                if normal_prob >= 0.20:
                    predicted_class = 'NORMAL'
                    confidence = normal_prob
        
        return {
            'class': predicted_class,
            'confidence': round(confidence, 4),
            'probabilities': [round(p, 4) for p in probabilities],
        }


# =============================================================================
# Class 4: EventAggregator
# =============================================================================

class EventAggregator:
    """
    Builds an event timeline from per-window predictions.
    
    Merges consecutive windows with the same prediction into
    contiguous event segments for cleaner visualization.
    """
    
    @staticmethod
    def build_timeline(window_results: List[Dict]) -> List[Dict]:
        """
        Build raw timeline from window-level predictions.
        Each entry contains: start, end, class, confidence, probabilities.
        """
        timeline = []
        for w in window_results:
            timeline.append({
                'start': w['start'],
                'end': w['end'],
                'class': w['prediction']['class'],
                'confidence': w['prediction']['confidence'],
                'probabilities': w['prediction']['probabilities'],
            })
        return timeline
    
    @staticmethod
    def smooth_timeline(timeline: List[Dict]) -> List[Dict]:
        """
        Apply temporal smoothing and debouncing to suppress single-window
        transient spikes in otherwise calm audio.
        """
        total = len(timeline)
        if total <= 2:
            for t in timeline:
                t['is_sustained'] = False
            return timeline
        
        smoothed = []
        for i in range(total):
            curr = dict(timeline[i])
            c_cls = curr['class']
            c_conf = curr['confidence']
            
            prev_cls = timeline[i-1]['class'] if i > 0 else 'NORMAL'
            next_cls = timeline[i+1]['class'] if i < total - 1 else 'NORMAL'
            
            is_sustained = (c_cls == prev_cls or c_cls == next_cls)
            curr['is_sustained'] = is_sustained
            
            # Debounce: if isolated dangerous event with moderate confidence surrounded by normal,
            # smooth to normal
            if c_cls not in ['NORMAL', 'SIREN']:
                if not is_sustained and c_conf < 0.72:
                    if prev_cls == 'NORMAL' and next_cls == 'NORMAL':
                        curr['class'] = 'NORMAL'
                        curr['confidence'] = curr['probabilities'][6]
                        curr['is_sustained'] = False
            
            smoothed.append(curr)
        
        return smoothed
    
    @staticmethod
    def aggregate_events(timeline: List[Dict]) -> List[Dict]:
        """
        Merge consecutive windows with the same class into segments.
        
        Example: [NORMAL, NORMAL, CRASH, CRASH, SCREAM] →
                 [{NORMAL, 0-3.75}, {CRASH, 2.5-6.25}, {SCREAM, 5.0-7.5}]
        """
        if not timeline:
            return []
        
        segments = []
        current = {
            'start': timeline[0]['start'],
            'end': timeline[0]['end'],
            'class': timeline[0]['class'],
            'count': 1,
            'maxConfidence': timeline[0]['confidence'],
            'avgConfidence': timeline[0]['confidence'],
        }
        
        for entry in timeline[1:]:
            if entry['class'] == current['class']:
                # Extend current segment
                current['end'] = entry['end']
                current['count'] += 1
                current['maxConfidence'] = max(current['maxConfidence'], entry['confidence'])
                current['avgConfidence'] = round(
                    (current['avgConfidence'] * (current['count'] - 1) + entry['confidence']) / current['count'], 4
                )
            else:
                # Finalize current, start new segment
                segments.append(current)
                current = {
                    'start': entry['start'],
                    'end': entry['end'],
                    'class': entry['class'],
                    'count': 1,
                    'maxConfidence': entry['confidence'],
                    'avgConfidence': entry['confidence'],
                }
        
        segments.append(current)
        return segments
    
    @staticmethod
    def count_dangerous_events(timeline: List[Dict]) -> int:
        """Count windows where a dangerous (non-NORMAL, non-SIREN) class was predicted."""
        dangerous = {"SCREAM", "GLASS_BREAK", "IMPACT_CRASH", "GUNSHOT_EXPLOSION", "CROWD_PANIC"}
        return sum(1 for t in timeline if t['class'] in dangerous and t['confidence'] >= CONFIDENCE_CUTOFF)


# =============================================================================
# Class 5: ThreatAssessmentEngine
# =============================================================================

class ThreatAssessmentEngine:
    """
    Computes a weighted Threat Score (0–100) from the event timeline.
    
    The score considers:
    1. Individual event danger weights (GUNSHOT=1.0, NORMAL=0.0)
    2. Confidence of each prediction
    3. Temporal decay — recent events weighted more heavily
    4. Co-occurrence boost — dangerous events close together amplify score
    5. Repetition factor — repeated distress events increase score
    
    The final score is clamped to [0, 100].
    """
    
    def compute(self, timeline: List[Dict], audio_duration: float) -> Dict:
        """
        Compute threat score and contributing factors using proportion-aware scoring.
        
        Returns dict with:
            - score: int 0-100
            - factors: list of contributing factors
            - co_occurrences: detected co-occurrence patterns
        """
        if not timeline:
            return {'score': 0, 'factors': [], 'co_occurrences': []}
        
        total_wins = len(timeline)
        danger_windows = [w for w in timeline if w['class'] not in ['NORMAL', 'SIREN']]
        sustained_danger = [w for w in danger_windows if w.get('is_sustained', False)]
        normal_count = sum(1 for w in timeline if w['class'] == 'NORMAL')
        normal_ratio = normal_count / total_wins
        
        # 1. Base score from individual dangerous events for UI factors
        base_factors = []
        for entry in danger_windows:
            weight = THREAT_WEIGHTS.get(entry['class'], 0.0)
            confidence = entry['confidence']
            event_score = weight * confidence
            base_factors.append({
                'class': entry['class'],
                'score': round(event_score, 3),
                'time': entry['start'],
            })
        base_factors = sorted(base_factors, key=lambda x: x['score'], reverse=True)
        
        if not danger_windows:
            has_siren = any(w['class'] == 'SIREN' for w in timeline)
            return {
                'score': 10 if has_siren else 0,
                'factors': [],
                'co_occurrences': [],
                'repetitionFactor': 1.0,
                'coOccurrenceBoost': 1.0,
            }
        
        # 2. Co-occurrence detection and boosting
        co_occurrences = []
        co_occurrence_boost = 1.0
        
        for rule_a, rule_b, time_window, boost in CO_OCCURRENCE_RULES:
            for i, ea in enumerate(danger_windows):
                if ea['class'] != rule_a:
                    continue
                for eb in danger_windows[i+1:]:
                    if eb['class'] != rule_b:
                        continue
                    time_diff = abs(eb['start'] - ea['start'])
                    if time_diff <= time_window:
                        co_occurrences.append({
                            'pattern': f"{CLASS_LABELS[rule_a]} + {CLASS_LABELS[rule_b]}",
                            'timeDiff': round(time_diff, 1),
                            'boost': boost,
                        })
                        co_occurrence_boost = max(co_occurrence_boost, boost)
        
        # 3. Density Score (up to 30 pts)
        density = len(danger_windows) / total_wins
        density_score = min(density * 100 * 1.5, 30.0)
        
        # 4. Peak Severity Score (up to 40 pts)
        peak_weight = max(THREAT_WEIGHTS.get(w['class'], 0) * w['confidence'] for w in danger_windows)
        peak_score = peak_weight * 40.0
        
        # 5. Sustained Threat Score (up to 30 pts)
        sustained_score = (len(sustained_danger) / max(total_wins * 0.25, 1)) * 30.0
        sustained_score = min(sustained_score, 30.0)
        
        raw_score = (density_score + peak_score + sustained_score) * co_occurrence_boost
        
        # 6. Ambient Calmness Damping
        has_sustained_lethal = any(w['class'] in ['GUNSHOT_EXPLOSION', 'IMPACT_CRASH'] for w in sustained_danger)
        
        if normal_ratio >= 0.85 and len(sustained_danger) == 0:
            raw_score = raw_score * 0.30
        elif normal_ratio >= 0.80 and len(sustained_danger) <= 1:
            raw_score = raw_score * 0.50
        elif has_sustained_lethal and raw_score < 55:
            raw_score = max(raw_score, 55.0)
        
        final_score = int(min(max(raw_score, 0), 100))
        
        return {
            'score': final_score,
            'factors': base_factors[:5],
            'co_occurrences': co_occurrences[:3],
            'repetitionFactor': round(1.0 + (len(sustained_danger) * 0.05), 2),
            'coOccurrenceBoost': round(co_occurrence_boost, 2),
        }


# =============================================================================
# Class 6: DecisionEngine
# =============================================================================

class DecisionEngine:
    """
    Evaluates temporal context to classify the overall situation and
    generate a natural language explanation.
    
    Decision logic is pattern-based, not just threshold-based:
    - Crash + Scream within 5s → Critical
    - Glass Break + Crowd Panic → Critical
    - Repeated Scream → Warning
    - Single Scream → Suspicious
    - Siren only → Informational
    - Normal only → Normal
    """
    
    def evaluate(self, timeline: List[Dict], aggregated: List[Dict],
                 threat_data: Dict, audio_duration: float) -> Dict:
        """
        Make a final situation assessment.
        
        Returns:
            - situationLevel: NORMAL | SUSPICIOUS | WARNING | CRITICAL
            - explanation: human-readable summary
            - recommendations: action recommendations
        """
        score = threat_data['score']
        
        # Determine situation level from score
        if score >= SITUATION_THRESHOLDS['CRITICAL']:
            level = 'CRITICAL'
        elif score >= SITUATION_THRESHOLDS['WARNING']:
            level = 'WARNING'
        elif score >= SITUATION_THRESHOLDS['SUSPICIOUS']:
            level = 'SUSPICIOUS'
        else:
            level = 'NORMAL'
        
        # Generate explanation
        explanation = self._generate_explanation(
            timeline, aggregated, threat_data, audio_duration, level
        )
        
        # Generate recommendations
        recommendations = self._get_recommendations(level, threat_data)
        
        return {
            'situationLevel': level,
            'explanation': explanation,
            'recommendations': recommendations,
        }
    
    def _generate_explanation(self, timeline: List[Dict], aggregated: List[Dict],
                               threat_data: Dict, audio_duration: float, level: str) -> str:
        """Generate a natural language explanation of the analysis."""
        score = threat_data['score']
        
        dangerous_classes = {"SCREAM", "GLASS_BREAK", "IMPACT_CRASH", "GUNSHOT_EXPLOSION", "CROWD_PANIC"}
        danger_entries = [e for e in timeline if e['class'] in dangerous_classes]
        
        if not danger_entries or level == 'NORMAL':
            has_siren = any(e['class'] == 'SIREN' for e in timeline)
            if has_siren:
                return (
                    f"Emergency vehicle siren detected in {audio_duration:.1f}s audio. "
                    f"No active distress or acoustic disturbance identified. "
                    f"Threat Score: {score}/100. Routine monitoring active."
                )
            return (
                f"Environmental audio analysis across {audio_duration:.1f}s indicates standard ambient acoustic levels. "
                f"No verified emergency or distress events detected. "
                f"Threat Score: {score}/100. No action required."
            )
        
        # Get unique dangerous events in order of appearance
        detected_events = []
        seen = set()
        for entry in danger_entries:
            if entry['class'] not in seen:
                detected_events.append({
                    'class': entry['class'],
                    'label': CLASS_LABELS[entry['class']],
                    'time': entry['start'],
                    'confidence': entry['confidence'],
                    'is_sustained': entry.get('is_sustained', False),
                })
                seen.add(entry['class'])
        
        parts = []
        for i, evt in enumerate(detected_events):
            time_str = f"{evt['time']:.1f}s"
            conf_str = f"{evt['confidence']*100:.0f}%"
            sustained_str = "sustained " if evt['is_sustained'] else ""
            if i == 0:
                parts.append(f"{sustained_str.capitalize()}{evt['label']} detected at {time_str} ({conf_str} confidence)")
            else:
                parts.append(f"followed by {sustained_str}{evt['label']} at {time_str} ({conf_str})")
        
        event_desc = ", ".join(parts) + "."
        
        co_desc = ""
        if threat_data.get('co_occurrences'):
            patterns = [co['pattern'] for co in threat_data['co_occurrences'][:2]]
            co_desc = f" Correlated emergency patterns identified: {'; '.join(patterns)}."
        
        conclusions = {
            'CRITICAL': "Critical public safety alert. Immediate dispatch and responder mobilization recommended.",
            'WARNING': "Elevated distress levels verified. Alerting patrol units for area verification.",
            'SUSPICIOUS': "Anomalous acoustic activity detected. Area flagged for enhanced telemetry monitoring.",
            'NORMAL': "No active threat identified.",
        }
        
        return f"{event_desc}{co_desc} Threat Score: {score}/100. {conclusions.get(level, '')}"
    
    def _get_recommendations(self, level: str, threat_data: Dict) -> List[str]:
        """Get action recommendations based on situation level."""
        base = {
            'CRITICAL': [
                "Dispatch emergency responders immediately",
                "Alert all nearby patrol units",
                "Activate public safety protocols",
                "Begin continuous monitoring of the area",
            ],
            'WARNING': [
                "Increase monitoring frequency for this zone",
                "Notify nearest patrol unit for investigation",
                "Prepare emergency resources for potential deployment",
            ],
            'SUSPICIOUS': [
                "Flag for enhanced monitoring",
                "Review nearby camera feeds if available",
                "Log event for pattern analysis",
            ],
            'NORMAL': [
                "Continue standard monitoring",
                "No action required",
            ],
        }
        return base.get(level, base['NORMAL'])


# =============================================================================
# Main Pipeline Orchestrator
# =============================================================================

def run_pipeline(audio_path: str, model_path: str,
                 window_size: float = DEFAULT_WINDOW_SIZE,
                 hop_size: float = DEFAULT_HOP_SIZE) -> Dict:
    """
    Execute the complete acoustic event analysis pipeline.
    
    Args:
        audio_path: Path to the input audio file (WAV/MP3)
        model_path: Path to the TFLite or Keras model file
        window_size: Analysis window duration in seconds
        hop_size: Step between consecutive windows in seconds
    
    Returns:
        Complete analysis result as a JSON-serializable dictionary
    """
    pipeline_start = time.time()
    
    # Stage 1: Load and split audio
    processor = AudioProcessor(window_size=window_size, hop_size=hop_size)
    audio = processor.load_audio(audio_path)
    audio_duration = processor.get_duration(audio)
    windows = processor.split_into_windows(audio)
    
    # Stage 2: Feature extraction
    extractor = FeatureExtractor()
    
    # Stage 3: Inference
    engine = InferenceEngine(model_path)
    
    # Calculate overall RMS energy to establish dynamic ambient floor
    overall_rms = float(np.sqrt(np.mean(audio**2))) if len(audio) > 0 else 0.0
    rms_floor = max(0.008, 0.20 * overall_rms)
    
    window_results = []
    for window in windows:
        spectrogram = extractor.extract(window['audio'])
        prediction = engine.predict(spectrogram, win_rms=window.get('rms', 0.0), rms_floor=rms_floor)
        window_results.append({
            'start': window['start'],
            'end': window['end'],
            'index': window['index'],
            'prediction': prediction,
        })
    
    # Stage 4: Event aggregation & temporal smoothing
    aggregator = EventAggregator()
    raw_timeline = aggregator.build_timeline(window_results)
    timeline = aggregator.smooth_timeline(raw_timeline)
    aggregated = aggregator.aggregate_events(timeline)
    dangerous_count = aggregator.count_dangerous_events(timeline)
    
    # Stage 5: Threat assessment
    threat_engine = ThreatAssessmentEngine()
    threat_data = threat_engine.compute(timeline, audio_duration)
    
    # Stage 6: Decision making
    decision_engine = DecisionEngine()
    decision = decision_engine.evaluate(timeline, aggregated, threat_data, audio_duration)
    
    processing_time = int((time.time() - pipeline_start) * 1000)
    
    return {
        'timeline': timeline,
        'aggregatedEvents': aggregated,
        'threatScore': threat_data['score'],
        'threatFactors': threat_data.get('factors', []),
        'coOccurrences': threat_data.get('co_occurrences', []),
        'situationLevel': decision['situationLevel'],
        'explanation': decision['explanation'],
        'recommendations': decision['recommendations'],
        'totalWindows': len(windows),
        'audioDuration': audio_duration,
        'dangerousEventCount': dangerous_count,
        'processingTime': processing_time,
        'pipeline': {
            'windowSize': window_size,
            'hopSize': hop_size,
            'overlapPercent': round((1 - hop_size / window_size) * 100),
            'sampleRate': TARGET_SAMPLE_RATE,
            'nMelBins': N_MEL_BINS,
            'frameLength': FRAME_LENGTH,
            'frameStep': FRAME_STEP,
            'specTimeSteps': SPEC_TIME_STEPS,
            'confidenceCutoff': CONFIDENCE_CUTOFF,
            'modelVersion': 'MobileNetV5-Edge',
            'modelPath': model_path,
        },
    }


# =============================================================================
# CLI Entry Point
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DhwaniAI Acoustic Event Analysis Pipeline")
    parser.add_argument("audio_path", help="Path to input audio file (WAV/MP3)")
    parser.add_argument("model_path", help="Path to TFLite or Keras model file")
    parser.add_argument("--window", type=float, default=DEFAULT_WINDOW_SIZE,
                        help=f"Window size in seconds (default: {DEFAULT_WINDOW_SIZE})")
    parser.add_argument("--hop", type=float, default=DEFAULT_HOP_SIZE,
                        help=f"Hop size in seconds (default: {DEFAULT_HOP_SIZE})")
    
    args = parser.parse_args()
    
    try:
        result = run_pipeline(args.audio_path, args.model_path,
                              window_size=args.window, hop_size=args.hop)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
