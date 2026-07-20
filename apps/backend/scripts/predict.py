"""
DhwaniAI - Audio Prediction Script
Loads the trained MobileNet model and runs inference on a WAV file.
Outputs JSON with probabilities.

Usage: python predict.py <audio_path> <model_path>
"""

import sys
import json
import numpy as np

CLASSES = ["SCREAM", "GLASS_BREAK", "IMPACT_CRASH", "GUNSHOT_EXPLOSION", "CROWD_PANIC", "SIREN", "NORMAL"]
TARGET_SAMPLE_RATE = 16000
CLIP_DURATION = 2.5
EXPECTED_AUDIO_LENGTH = int(TARGET_SAMPLE_RATE * CLIP_DURATION)

def preprocess_audio(file_path):
    """Load and preprocess audio to mel spectrogram matching training pipeline."""
    import librosa
    
    raw_signal, _ = librosa.load(file_path, sr=TARGET_SAMPLE_RATE, mono=True)
    
    if len(raw_signal) < EXPECTED_AUDIO_LENGTH:
        raw_signal = np.pad(raw_signal, (0, EXPECTED_AUDIO_LENGTH - len(raw_signal)), 'constant')
    else:
        raw_signal = raw_signal[:EXPECTED_AUDIO_LENGTH]
    
    return raw_signal.astype(np.float32)

def audio_to_spectrogram(audio):
    """Convert audio waveform to log-mel spectrogram matching training pipeline."""
    import tensorflow as tf
    
    stft_matrix = tf.signal.stft(audio, frame_length=512, frame_step=256)
    magnitude_map = tf.abs(stft_matrix)
    
    mel_matrix = tf.signal.linear_to_mel_weight_matrix(
        num_mel_bins=64,
        num_spectrogram_bins=257,
        sample_rate=TARGET_SAMPLE_RATE,
        lower_edge_hertz=20.0,
        upper_edge_hertz=8000.0
    )
    
    mel_spectrogram = tf.tensordot(magnitude_map, mel_matrix, 1)
    log_mel = tf.math.log(mel_spectrogram + 1e-6)
    log_mel = tf.expand_dims(log_mel, -1)
    
    # Ensure correct shape
    log_mel = log_mel[:155, :64, :]
    if log_mel.shape[0] < 155:
        padding = tf.zeros([155 - log_mel.shape[0], 64, 1])
        log_mel = tf.concat([log_mel, padding], axis=0)
    
    return log_mel

def predict(audio_path, model_path):
    """Run inference and return predictions."""
    
    if model_path.endswith('.tflite'):
        import tensorflow as tf
        
        audio = preprocess_audio(audio_path)
        spectrogram = audio_to_spectrogram(audio)
        input_data = tf.expand_dims(spectrogram, 0).numpy()
        
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
        
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        
        interpreter.set_tensor(input_details[0]['index'], input_data.astype(np.float32))
        interpreter.invoke()
        
        output = interpreter.get_tensor(output_details[0]['index'])
        probabilities = output[0].tolist()
    else:
        import tensorflow as tf
        
        model = tf.keras.models.load_model(model_path)
        
        audio = preprocess_audio(audio_path)
        spectrogram = audio_to_spectrogram(audio)
        input_data = tf.expand_dims(spectrogram, 0)
        
        output = model.predict(input_data, verbose=0)
        probabilities = output[0].tolist()
    
    return {"probabilities": probabilities}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: predict.py <audio_path> <model_path>"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    model_path = sys.argv[2]
    
    try:
        result = predict(audio_path, model_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
