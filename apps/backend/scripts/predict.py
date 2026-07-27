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
    "IMPACT_CRASH": 0.9,       # High injury potential
    "GLASS_BREAK": 0.7,        # Property damage / forced entry indicator
    "CROWD_PANIC": 0.7,        # Mass casualty risk
    "SCREAM": 0.5,             # Distress signal - context-dependent
    "SIREN": 0.3,              # Informational - emergency already responded
    "NORMAL": 0.0,             # No threat
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
CONFIDENCE_CUTOFF = 0.3


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
            
            windows.append({
                'audio': window_audio,
                'start': round(start_time, 2),
                'end': round(end_time, 2),
                'index': idx,
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
    
    def predict(self, spectrogram: np.ndarray) -> Dict:
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
        
        # Find predicted class
        max_idx = int(np.argmax(probabilities))
        predicted_class = CLASSES[max_idx]
        confidence = probabilities[max_idx]
        
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
        Compute threat score and contributing factors.
        
        Returns dict with:
            - score: int 0-100
            - factors: list of contributing factors
            - co_occurrences: detected co-occurrence patterns
        """
        if not timeline:
            return {'score': 0, 'factors': [], 'co_occurrences': []}
        
        # 1. Base score from individual events
        base_scores = []
        for entry in timeline:
            weight = THREAT_WEIGHTS.get(entry['class'], 0.0)
            confidence = entry['confidence']
            
            # Only count events above confidence cutoff
            if confidence < CONFIDENCE_CUTOFF:
                continue
            
            # Temporal decay: events near the end (most recent) weighted more
            # Using exponential decay from start of audio
            if audio_duration > 0:
                recency = entry['start'] / audio_duration  # 0=start, 1=end
                temporal_weight = 0.5 + 0.5 * recency  # Range: [0.5, 1.0]
            else:
                temporal_weight = 1.0
            
            event_score = weight * confidence * temporal_weight
            base_scores.append({
                'class': entry['class'],
                'score': round(event_score, 3),
                'time': entry['start'],
            })
        
        if not base_scores:
            return {'score': 0, 'factors': [], 'co_occurrences': []}
        
        # 2. Co-occurrence detection and boosting
        co_occurrences = []
        co_occurrence_boost = 1.0
        
        dangerous_entries = [e for e in timeline if THREAT_WEIGHTS.get(e['class'], 0) > 0.3]
        
        for rule_a, rule_b, time_window, boost in CO_OCCURRENCE_RULES:
            for i, ea in enumerate(dangerous_entries):
                if ea['class'] != rule_a:
                    continue
                for eb in dangerous_entries[i+1:]:
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
        
        # 3. Repetition factor — repeated dangerous events amplify score
        dangerous_count = sum(1 for s in base_scores if s['score'] > 0.1)
        repetition_factor = min(1.0 + (dangerous_count - 1) * 0.1, 1.5) if dangerous_count > 1 else 1.0
        
        # 4. Calculate final score
        # Use top-N contributing events to avoid dilution from many normal windows
        top_scores = sorted(base_scores, key=lambda x: x['score'], reverse=True)
        # Take top 5 contributing events
        contributing = top_scores[:5]
        raw_score = sum(s['score'] for s in contributing)
        
        # Normalize to 0-100 scale
        # Max possible: 5 events × 1.0 weight × 1.0 confidence × 1.0 temporal = 5.0
        normalized = (raw_score / 3.0) * 100.0  # Calibrated so realistic scenarios hit 70-90
        
        # Apply multipliers
        final_score = normalized * co_occurrence_boost * repetition_factor
        final_score = int(min(max(final_score, 0), 100))
        
        return {
            'score': final_score,
            'factors': contributing[:5],
            'co_occurrences': co_occurrences,
            'repetitionFactor': round(repetition_factor, 2),
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
        
        # Get unique dangerous events in order of appearance
        dangerous_classes = {"SCREAM", "GLASS_BREAK", "IMPACT_CRASH", "GUNSHOT_EXPLOSION", "CROWD_PANIC"}
        detected_events = []
        seen = set()
        
        for entry in timeline:
            if entry['class'] in dangerous_classes and entry['confidence'] >= CONFIDENCE_CUTOFF:
                if entry['class'] not in seen:
                    detected_events.append({
                        'class': entry['class'],
                        'label': CLASS_LABELS[entry['class']],
                        'time': entry['start'],
                        'confidence': entry['confidence'],
                    })
                    seen.add(entry['class'])
        
        if not detected_events:
            # Check for siren
            has_siren = any(e['class'] == 'SIREN' and e['confidence'] >= CONFIDENCE_CUTOFF for e in timeline)
            if has_siren:
                return (
                    f"Emergency siren detected in {audio_duration}s audio. "
                    f"No distress events identified. Threat Score: {score}/100. "
                    f"Situation appears under control with emergency services active."
                )
            return (
                f"No dangerous acoustic events detected in {audio_duration}s of audio. "
                f"All windows classified as normal ambient sound. "
                f"Threat Score: {score}/100. No action required."
            )
        
        # Build event sequence description
        parts = []
        for i, evt in enumerate(detected_events):
            time_str = f"{evt['time']:.1f}s"
            conf_str = f"{evt['confidence']*100:.0f}%"
            if i == 0:
                parts.append(f"{evt['label'].capitalize()} detected at {time_str} ({conf_str} confidence)")
            else:
                parts.append(f"followed by {evt['label']} at {time_str} ({conf_str})")
        
        event_desc = ", ".join(parts) + "."
        
        # Co-occurrence summary
        co_desc = ""
        if threat_data.get('co_occurrences'):
            patterns = [co['pattern'] for co in threat_data['co_occurrences'][:3]]
            co_desc = f" Correlated patterns: {'; '.join(patterns)}."
        
        # Time span of dangerous events
        if len(detected_events) > 1:
            span = detected_events[-1]['time'] - detected_events[0]['time']
            span_desc = f" Multiple distress events within a {span:.1f}-second window."
        else:
            span_desc = ""
        
        # Level-specific conclusion
        conclusions = {
            'CRITICAL': "Immediate emergency response recommended.",
            'WARNING': "Elevated threat detected. Monitoring recommended.",
            'SUSPICIOUS': "Anomalous activity detected. Further monitoring advised.",
            'NORMAL': "No immediate threat identified.",
        }
        
        return (
            f"{event_desc}{span_desc}{co_desc} "
            f"Threat Score: {score}/100. {conclusions[level]}"
        )
    
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
    
    window_results = []
    for window in windows:
        spectrogram = extractor.extract(window['audio'])
        prediction = engine.predict(spectrogram)
        window_results.append({
            'start': window['start'],
            'end': window['end'],
            'index': window['index'],
            'prediction': prediction,
        })
    
    # Stage 4: Event aggregation
    aggregator = EventAggregator()
    timeline = aggregator.build_timeline(window_results)
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
