import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

const EVENT_COLORS: Record<string, string> = {
  SCREAM: '#FF5252', GLASS_BREAK: '#FFB74D', IMPACT_CRASH: '#FF7043',
  GUNSHOT_EXPLOSION: '#F44336', CROWD_PANIC: '#E91E63', SIREN: '#42A5F5', NORMAL: '#66BB6A',
};
const EVENT_LABELS: Record<string, string> = {
  SCREAM: 'Scream', GLASS_BREAK: 'Glass Break', IMPACT_CRASH: 'Impact / Crash',
  GUNSHOT_EXPLOSION: 'Gunshot / Explosion', CROWD_PANIC: 'Crowd Panic', SIREN: 'Siren', NORMAL: 'Normal',
};

interface AnalysisResult {
  prediction: string;
  confidence: number;
  inferenceTime: number;
  probabilities: Record<string, number>;
  top3: Array<{ label: string; probability: number }>;
  modelVersion: string;
  inputDuration: number;
  sampleRate: number;
}

export default function AudioTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f) {
      setFile(f);
      setAudioUrl(URL.createObjectURL(f));
      setResult(null);
      drawWaveform(f);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/wav': ['.wav'], 'audio/mpeg': ['.mp3'] },
    maxFiles: 1,
  });

  const drawWaveform = async (audioFile: File) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const rawData = audioBuffer.getChannelData(0);
    
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 200;
    ctx.clearRect(0, 0, width, height);

    const step = Math.ceil(rawData.length / width);
    const amp = height / 2;

    // Background
    ctx.fillStyle = '#12121A';
    ctx.fillRect(0, 0, width, height);

    // Waveform
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#6C5CE7');
    gradient.addColorStop(0.5, '#00D9FF');
    gradient.addColorStop(1, '#A78BFA');

    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < width; i++) {
      let min = 1.0, max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = rawData[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();

    // Center line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.moveTo(0, amp);
    ctx.lineTo(width, amp);
    ctx.stroke();
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('audio', file);

      const { data } = await api.post('/audio/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(data);
      toast.success('Analysis complete!');
    } catch (error) {
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const probabilityChartData = result
    ? Object.entries(result.probabilities).map(([key, value]) => ({
        name: EVENT_LABELS[key] || key,
        probability: parseFloat((value * 100).toFixed(1)),
        fill: EVENT_COLORS[key] || '#8B8BA3',
      })).sort((a, b) => b.probability - a.probability)
    : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-3">
          🎙️ AI Audio Analyzer
        </h1>
        <p className="text-sm text-text-secondary">
          Upload a WAV file to classify acoustic events using the DhwaniAI MobileNet model
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload & Audio */}
        <div className="space-y-4">
          {/* Dropzone */}
          <motion.div
            {...getRootProps()}
            whileHover={{ scale: 1.01 }}
            className={`glass-card p-10 text-center cursor-pointer transition-all border-2 border-dashed ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-5xl mb-4">{isDragActive ? '📂' : '🎵'}</div>
            <p className="text-sm font-medium text-text-primary">
              {isDragActive ? 'Drop your audio file here' : 'Drag & drop a WAV file, or click to browse'}
            </p>
            <p className="text-xs text-text-muted mt-2">Supports WAV and MP3 formats · Max 50MB</p>
          </motion.div>

          {/* File Info */}
          {file && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">🎵</div>
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                    <p className="text-[11px] text-text-muted">{(file.size / 1024).toFixed(1)} KB · {file.type}</p>
                  </div>
                </div>
                <button onClick={() => { setFile(null); setAudioUrl(null); setResult(null); }} className="text-text-muted hover:text-danger text-sm">✕</button>
              </div>
            </motion.div>
          )}

          {/* Audio Player */}
          {audioUrl && (
            <div className="glass-card p-4 space-y-3">
              <p className="text-xs text-text-muted uppercase tracking-wider">Audio Player</p>
              <audio ref={audioRef} src={audioUrl} controls className="w-full h-10 rounded-lg" style={{ filter: 'invert(0.85) hue-rotate(180deg)' }} />
            </div>
          )}

          {/* Waveform */}
          {file && (
            <div className="glass-card p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Waveform</p>
              <canvas ref={canvasRef} className="w-full rounded-xl" style={{ height: 100 }} />
            </div>
          )}

          {/* Analyze Button */}
          {file && !result && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Analyzing...
                </>
              ) : (
                <>🧠 Analyze Audio</>
              )}
            </motion.button>
          )}
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          <AnimatePresence>
            {result ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                {/* Primary Prediction */}
                <div className="glass-card p-6 text-center" style={{ borderColor: `${EVENT_COLORS[result.prediction]}30`, borderWidth: 2 }}>
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Detected Sound</p>
                  <p className="text-3xl font-bold font-display mb-1" style={{ color: EVENT_COLORS[result.prediction] }}>
                    {EVENT_LABELS[result.prediction] || result.prediction}
                  </p>
                  <p className="text-5xl font-black font-display" style={{ color: EVENT_COLORS[result.prediction] }}>
                    {(result.confidence * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-text-muted mt-1">Confidence Score</p>
                  
                  {/* Confidence bar */}
                  <div className="mt-4 w-full h-3 rounded-full bg-bg-elevated overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.confidence * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: EVENT_COLORS[result.prediction] }}
                    />
                  </div>
                </div>

                {/* Top 3 */}
                <div className="glass-card p-5">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Top 3 Predictions</p>
                  <div className="space-y-3">
                    {result.top3.map((pred, i) => (
                      <div key={pred.label} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-bg-elevated flex items-center justify-center text-xs font-bold text-text-muted">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{EVENT_LABELS[pred.label] || pred.label}</span>
                            <span style={{ color: EVENT_COLORS[pred.label] }}>{(pred.probability * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pred.probability * 100}%` }}
                              transition={{ duration: 0.8, delay: i * 0.1 }}
                              className="h-full rounded-full"
                              style={{ background: EVENT_COLORS[pred.label] }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Probability Chart */}
                <div className="glass-card p-5">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Full Probability Distribution</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={probabilityChartData} layout="vertical">
                      <XAxis type="number" tick={{ fill: '#5A5A72', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#8B8BA3', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                      <Tooltip contentStyle={{ background: '#1A1A25', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="probability" radius={[0, 6, 6, 0]} barSize={16}>
                        {probabilityChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Model Info */}
                <div className="glass-card p-5">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Model Information</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-bg-elevated">
                      <p className="text-text-muted">Model</p>
                      <p className="font-medium font-mono">{result.modelVersion}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-elevated">
                      <p className="text-text-muted">Inference Time</p>
                      <p className="font-medium font-mono text-accent">{result.inferenceTime}ms</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-elevated">
                      <p className="text-text-muted">Sample Rate</p>
                      <p className="font-medium font-mono">{result.sampleRate} Hz</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-elevated">
                      <p className="text-text-muted">Clip Duration</p>
                      <p className="font-medium font-mono">{result.inputDuration}s</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={() => { setFile(null); setAudioUrl(null); setResult(null); }} className="btn-secondary flex-1">
                    🔄 New Analysis
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-10 text-center">
                <div className="text-6xl mb-4 opacity-30">🧠</div>
                <p className="text-lg font-medium text-text-secondary">Upload an audio file to begin</p>
                <p className="text-sm text-text-muted mt-2">
                  The AI model will analyze the audio and classify the detected sound event
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2 max-w-xs mx-auto">
                  {['Scream', 'Glass Break', 'Gunshot', 'Crowd Panic', 'Siren', 'Crash'].map(type => (
                    <div key={type} className="px-3 py-2 rounded-lg bg-bg-elevated/50 text-xs text-text-muted">
                      {type}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
