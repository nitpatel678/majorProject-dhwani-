import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

// =============================================================================
// Constants
// =============================================================================

const EVENT_COLORS: Record<string, string> = {
  SCREAM: '#FF5252', GLASS_BREAK: '#FFB74D', IMPACT_CRASH: '#FF7043',
  GUNSHOT_EXPLOSION: '#F44336', CROWD_PANIC: '#E91E63', SIREN: '#42A5F5', NORMAL: '#66BB6A',
};
const EVENT_LABELS: Record<string, string> = {
  SCREAM: 'Scream', GLASS_BREAK: 'Glass Break', IMPACT_CRASH: 'Impact / Crash',
  GUNSHOT_EXPLOSION: 'Gunshot / Explosion', CROWD_PANIC: 'Crowd Panic', SIREN: 'Siren', NORMAL: 'Normal',
};
const EVENT_ICONS: Record<string, string> = {
  SCREAM: '🗣️', GLASS_BREAK: '🪟', IMPACT_CRASH: '💥',
  GUNSHOT_EXPLOSION: '🔫', CROWD_PANIC: '👥', SIREN: '🚨', NORMAL: '✅',
};
const SITUATION_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  CRITICAL: { color: '#F44336', bg: 'rgba(244,67,54,0.12)', icon: '🚨', label: 'CRITICAL' },
  WARNING: { color: '#FF9800', bg: 'rgba(255,152,0,0.12)', icon: '⚠️', label: 'WARNING' },
  SUSPICIOUS: { color: '#FFC107', bg: 'rgba(255,193,7,0.12)', icon: '🔍', label: 'SUSPICIOUS' },
  NORMAL: { color: '#66BB6A', bg: 'rgba(102,187,106,0.12)', icon: '✅', label: 'NORMAL' },
};
const CLASS_ORDER = ['SCREAM', 'GLASS_BREAK', 'IMPACT_CRASH', 'GUNSHOT_EXPLOSION', 'CROWD_PANIC', 'SIREN', 'NORMAL'];

// =============================================================================
// Types
// =============================================================================

interface TimelineEntry {
  start: number;
  end: number;
  class: string;
  confidence: number;
  probabilities: number[];
}

interface AggregatedEvent {
  start: number;
  end: number;
  class: string;
  count: number;
  maxConfidence: number;
  avgConfidence?: number;
}

interface ThreatFactor { class: string; score: number; time: number; }
interface CoOccurrence { pattern: string; timeDiff: number; boost: number; }

interface PipelineResult {
  timeline: TimelineEntry[];
  aggregatedEvents: AggregatedEvent[];
  threatScore: number;
  threatFactors: ThreatFactor[];
  coOccurrences: CoOccurrence[];
  situationLevel: string;
  explanation: string;
  recommendations: string[];
  totalWindows: number;
  audioDuration: number;
  dangerousEventCount: number;
  processingTime: number;
  pipeline: {
    windowSize: number;
    hopSize: number;
    overlapPercent: number;
    sampleRate: number;
    nMelBins: number;
    frameLength: number;
    frameStep: number;
    specTimeSteps: number;
    confidenceCutoff: number;
    modelVersion: string;
  };
}

// =============================================================================
// Components
// =============================================================================

function ThreatGauge({ score, level }: { score: number; level: string }) {
  const cfg = SITUATION_CONFIG[level] || SITUATION_CONFIG.NORMAL;
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
          <motion.circle
            cx="100" cy="100" r="80" fill="none" stroke={cfg.color}
            strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-black font-display"
            style={{ color: cfg.color }}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-text-muted mt-1">/ 100</span>
        </div>
      </div>
      <motion.div
        className="mt-3 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest"
        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        {cfg.icon} {cfg.label}
      </motion.div>
    </div>
  );
}

function EventTimeline({ timeline, aggregated, duration }: {
  timeline: TimelineEntry[]; aggregated: AggregatedEvent[]; duration: number;
}) {
  if (!aggregated.length) return null;
  return (
    <div className="space-y-3">
      {/* Visual timeline bar */}
      <div className="relative h-12 rounded-xl overflow-hidden bg-bg-elevated border border-border">
        {aggregated.map((seg, i) => {
          const left = (seg.start / duration) * 100;
          const width = Math.max(((seg.end - seg.start) / duration) * 100, 1);
          return (
            <motion.div
              key={i}
              className="absolute top-0 h-full flex items-center justify-center cursor-pointer group"
              style={{
                left: `${left}%`, width: `${width}%`,
                background: `${EVENT_COLORS[seg.class]}CC`,
                borderRight: i < aggregated.length - 1 ? '1px solid rgba(0,0,0,0.3)' : 'none',
              }}
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              title={`${EVENT_LABELS[seg.class]} (${seg.start}s - ${seg.end}s)`}
            >
              <span className="text-[9px] font-bold text-white/90 truncate px-1">
                {width > 8 ? EVENT_LABELS[seg.class] : ''}
              </span>
              {/* Tooltip on hover */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
                  <span className="font-semibold" style={{ color: EVENT_COLORS[seg.class] }}>
                    {EVENT_LABELS[seg.class]}
                  </span>
                  <span className="text-text-muted ml-2">
                    {seg.start.toFixed(1)}s – {seg.end.toFixed(1)}s
                  </span>
                  <span className="text-text-muted ml-2">
                    ({(seg.maxConfidence * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Time axis */}
      <div className="flex justify-between text-[10px] text-text-muted font-mono px-1">
        <span>0:00</span>
        {duration > 5 && <span>{Math.floor(duration / 2)}s</span>}
        <span>{duration.toFixed(1)}s</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {aggregated.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-bg-elevated text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: EVENT_COLORS[seg.class] }} />
            <span className="text-text-secondary">{EVENT_LABELS[seg.class]}</span>
            <span className="text-text-muted">
              {seg.start.toFixed(1)}s–{seg.end.toFixed(1)}s
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WindowList({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
      {timeline.map((w, i) => {
        const isDangerous = !['NORMAL', 'SIREN'].includes(w.class) && w.confidence >= 0.3;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`p-3 rounded-xl border transition-all ${
              isDangerous
                ? 'bg-danger/5 border-danger/20'
                : 'bg-bg-elevated/50 border-border/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{EVENT_ICONS[w.class] || '🔊'}</span>
                <span className="text-xs font-mono text-text-muted">
                  {w.start.toFixed(1)}s – {w.end.toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: EVENT_COLORS[w.class] }}>
                  {EVENT_LABELS[w.class]}
                </span>
                <span className="text-[11px] font-mono text-text-muted">
                  {(w.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            {/* Mini probability bars */}
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-bg-card">
              {CLASS_ORDER.map((cls, ci) => (
                <div
                  key={cls}
                  style={{
                    width: `${(w.probabilities[ci] || 0) * 100}%`,
                    background: EVENT_COLORS[cls],
                    opacity: w.probabilities[ci] > 0.1 ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function ProbabilityHeatmap({ timeline }: { timeline: TimelineEntry[] }) {
  if (!timeline.length) return null;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Header row - window indices */}
        <div className="flex mb-1">
          <div className="w-28 shrink-0" />
          {timeline.map((w, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-text-muted font-mono px-0.5">
              {w.start.toFixed(1)}s
            </div>
          ))}
        </div>

        {/* Class rows */}
        {CLASS_ORDER.map((cls, classIdx) => (
          <div key={cls} className="flex items-center mb-0.5">
            <div className="w-28 shrink-0 text-[10px] text-text-secondary pr-2 text-right truncate">
              {EVENT_LABELS[cls]}
            </div>
            {timeline.map((w, winIdx) => {
              const prob = w.probabilities[classIdx] || 0;
              const opacity = Math.max(prob, 0.03);
              return (
                <motion.div
                  key={winIdx}
                  className="flex-1 mx-0.5 rounded-sm cursor-pointer group relative"
                  style={{
                    height: 18,
                    background: EVENT_COLORS[cls],
                    opacity,
                  }}
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                  transition={{ delay: (classIdx * timeline.length + winIdx) * 0.005 }}
                  title={`${EVENT_LABELS[cls]}: ${(prob * 100).toFixed(1)}% at ${w.start}s`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function AudioTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'windows' | 'heatmap'>('timeline');
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
    ctx.fillStyle = '#12121A';
    ctx.fillRect(0, 0, width, height);

    const step = Math.ceil(rawData.length / width);
    const amp = height / 2;

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

      const { data } = await api.post('/audio/analyze-pipeline', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      setResult(data);
      toast.success('Pipeline analysis complete!');
    } catch (error) {
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setAudioUrl(null);
    setResult(null);
    setActiveTab('timeline');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-3">
          🎙️ Acoustic Event Analysis Lab
        </h1>
        <p className="text-sm text-text-secondary">
          Upload audio for windowed AI inference, event timeline analysis, and threat assessment
        </p>
      </div>

      {!result ? (
        /* ============= UPLOAD STATE ============= */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                {isDragActive ? 'Drop your audio file here' : 'Drag & drop an audio file, or click to browse'}
              </p>
              <p className="text-xs text-text-muted mt-2">Supports WAV and MP3 · Max 50MB</p>
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
                  <button onClick={reset} className="text-text-muted hover:text-danger text-sm">✕</button>
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
            {file && (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleAnalyze} disabled={analyzing}
                className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Running Pipeline Analysis...
                  </>
                ) : (
                  <>🧠 Run Acoustic Analysis Pipeline</>
                )}
              </motion.button>
            )}
          </div>

          {/* Right: Empty state */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-10 text-center flex flex-col items-center justify-center">
            <div className="text-6xl mb-4 opacity-30">🧠</div>
            <p className="text-lg font-medium text-text-secondary">Upload audio to begin analysis</p>
            <p className="text-sm text-text-muted mt-2 max-w-sm">
              The pipeline will split audio into overlapping windows, run AI inference on each,
              build an event timeline, compute a threat score, and generate situation assessment.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2 max-w-xs">
              {['Timeline', 'Threat Score', 'Windowed AI', 'Co-occurrence', 'Explanation', 'Heatmap'].map(f => (
                <div key={f} className="px-3 py-2 rounded-lg bg-bg-elevated/50 text-xs text-text-muted">{f}</div>
              ))}
            </div>
          </motion.div>
        </div>
      ) : (
        /* ============= RESULTS STATE ============= */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

          {/* Row 1: Threat Gauge + Explanation + Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Threat Gauge */}
            <motion.div
              className="glass-card p-6 flex flex-col items-center justify-center"
              style={{
                borderColor: `${SITUATION_CONFIG[result.situationLevel]?.color || '#66BB6A'}30`,
                borderWidth: 2,
              }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            >
              <p className="text-xs text-text-muted uppercase tracking-wider mb-4">Threat Assessment</p>
              <ThreatGauge score={result.threatScore} level={result.situationLevel} />
            </motion.div>

            {/* Explanation */}
            <motion.div
              className="glass-card p-5 lg:col-span-2 flex flex-col"
              initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            >
              <p className="text-xs text-text-muted uppercase tracking-wider mb-3">AI Assessment</p>
              <p className="text-sm text-text-primary leading-relaxed flex-1">
                {result.explanation}
              </p>

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Recommended Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {result.recommendations.map((rec, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-bg-elevated text-text-secondary">
                        {rec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Co-occurrences */}
              {result.coOccurrences?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Detected Patterns</p>
                  <div className="flex flex-wrap gap-2">
                    {result.coOccurrences.map((co, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-danger/10 text-danger border border-danger/20">
                        {co.pattern} ({co.timeDiff}s apart, {co.boost}x boost)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Row 2: Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Duration', value: `${result.audioDuration}s`, icon: '⏱️' },
              { label: 'Windows', value: result.totalWindows, icon: '📊' },
              { label: 'Dangerous', value: result.dangerousEventCount, icon: '⚡' },
              { label: 'Processing', value: `${result.processingTime}ms`, icon: '🔄' },
              { label: 'Window Size', value: `${result.pipeline.windowSize}s`, icon: '📐' },
              { label: 'Overlap', value: `${result.pipeline.overlapPercent}%`, icon: '🔗' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="glass-card p-3 text-center"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <span className="text-lg">{stat.icon}</span>
                <p className="text-lg font-bold font-display mt-1">{stat.value}</p>
                <p className="text-[10px] text-text-muted">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Row 3: Audio Player + Waveform */}
          {audioUrl && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted uppercase tracking-wider">Audio Playback</p>
                <button onClick={reset} className="text-xs text-text-muted hover:text-primary transition-colors">
                  🔄 New Analysis
                </button>
              </div>
              <audio ref={audioRef} src={audioUrl} controls className="w-full h-10 rounded-lg" style={{ filter: 'invert(0.85) hue-rotate(180deg)' }} />
              <canvas ref={canvasRef} className="w-full rounded-xl" style={{ height: 80 }} />
            </div>
          )}

          {/* Row 4: Tabs for Timeline / Windows / Heatmap */}
          <div className="glass-card overflow-hidden">
            {/* Tab Header */}
            <div className="flex border-b border-border">
              {[
                { id: 'timeline' as const, label: '📊 Event Timeline', count: result.aggregatedEvents.length },
                { id: 'windows' as const, label: '🔍 Window Analysis', count: result.totalWindows },
                { id: 'heatmap' as const, label: '🌡️ Probability Heatmap' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-4 text-xs font-medium transition-all relative ${
                    activeTab === tab.id
                      ? 'text-primary bg-primary/5'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-bg-elevated text-[10px]">
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-5">
              <AnimatePresence mode="wait">
                {activeTab === 'timeline' && (
                  <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <EventTimeline
                      timeline={result.timeline}
                      aggregated={result.aggregatedEvents}
                      duration={result.audioDuration}
                    />
                  </motion.div>
                )}
                {activeTab === 'windows' && (
                  <motion.div key="windows" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <WindowList timeline={result.timeline} />
                  </motion.div>
                )}
                {activeTab === 'heatmap' && (
                  <motion.div key="heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ProbabilityHeatmap timeline={result.timeline} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Row 5: Pipeline Config */}
          <motion.div
            className="glass-card p-5"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          >
            <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Pipeline Configuration</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
              {[
                { label: 'Model', value: result.pipeline.modelVersion },
                { label: 'Sample Rate', value: `${result.pipeline.sampleRate} Hz` },
                { label: 'Mel Bins', value: result.pipeline.nMelBins },
                { label: 'Frame Length', value: result.pipeline.frameLength },
                { label: 'Frame Step', value: result.pipeline.frameStep },
                { label: 'Spec Time Steps', value: result.pipeline.specTimeSteps },
                { label: 'Confidence Cutoff', value: `${(result.pipeline.confidenceCutoff * 100)}%` },
                { label: 'Window Size', value: `${result.pipeline.windowSize}s` },
                { label: 'Hop Size', value: `${result.pipeline.hopSize}s` },
                { label: 'Overlap', value: `${result.pipeline.overlapPercent}%` },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl bg-bg-elevated">
                  <p className="text-text-muted">{item.label}</p>
                  <p className="font-medium font-mono mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
