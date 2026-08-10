import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Mic, Upload, FileAudio, Play, Pause, RotateCcw, Brain, Activity,
  ShieldAlert, Layers, Flame, Sparkles, Clock, Cpu, X, Loader2, CheckCircle2,
  AlertTriangle, Volume2, UserX, Car, Skull, Siren
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

// =============================================================================
// Constants
// =============================================================================

const EVENT_LABELS: Record<string, string> = {
  SCREAM: 'Scream', GLASS_BREAK: 'Glass Break', IMPACT_CRASH: 'Impact / Crash',
  GUNSHOT_EXPLOSION: 'Gunshot / Explosion', CROWD_PANIC: 'Crowd Panic', SIREN: 'Siren', NORMAL: 'Normal',
};

const EVENT_ICONS: Record<string, any> = {
  SCREAM: UserX, GLASS_BREAK: Flame, IMPACT_CRASH: Car,
  GUNSHOT_EXPLOSION: Skull, CROWD_PANIC: AlertTriangle, SIREN: Siren, NORMAL: Volume2,
};

const SITUATION_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', label: 'CRITICAL THREAT' },
  WARNING: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', label: 'WARNING' },
  SUSPICIOUS: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', label: 'SUSPICIOUS' },
  NORMAL: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', label: 'NORMAL' },
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
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <motion.circle
            cx="100" cy="100" r="80" fill="none" stroke={cfg.color}
            strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-bold font-display text-white"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            {score}
          </motion.span>
          <span className="text-[11px] text-surface-500 font-mono">/ 100 THREAT</span>
        </div>
      </div>
      <motion.div
        className="mt-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {cfg.label}
      </motion.div>
    </div>
  );
}

function EventTimeline({ aggregated, duration }: {
  timeline: TimelineEntry[]; aggregated: AggregatedEvent[]; duration: number;
}) {
  if (!aggregated.length) return null;
  return (
    <div className="space-y-3">
      {/* Visual timeline bar */}
      <div className="relative h-10 rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
        {aggregated.map((seg, i) => {
          const left = (seg.start / duration) * 100;
          const width = Math.max(((seg.end - seg.start) / duration) * 100, 1.5);
          const isDanger = !['NORMAL', 'SIREN'].includes(seg.class);

          return (
            <motion.div
              key={i}
              className="absolute top-0 h-full flex items-center justify-center cursor-pointer group"
              style={{
                left: `${left}%`, width: `${width}%`,
                background: isDanger ? '#ef4444' : '#525252',
                opacity: 0.85,
                borderRight: '1px solid rgba(0,0,0,0.5)',
              }}
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <span className="text-[9px] font-mono font-bold text-white truncate px-1">
                {width > 8 ? EVENT_LABELS[seg.class] : ''}
              </span>
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-surface-900 border border-white/[0.1] rounded-lg px-2.5 py-1 text-xs shadow-elevated whitespace-nowrap text-white font-mono">
                  {EVENT_LABELS[seg.class]} ({seg.start.toFixed(1)}s–{seg.end.toFixed(1)}s)
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-surface-600 font-mono">
        <span>0:00</span>
        {duration > 5 && <span>{(duration / 2).toFixed(1)}s</span>}
        <span>{duration.toFixed(1)}s</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {aggregated.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-mono">
            <span className="text-white font-medium">{EVENT_LABELS[seg.class]}</span>
            <span className="text-surface-500">{seg.start.toFixed(1)}s–{seg.end.toFixed(1)}s</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WindowList({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
      {timeline.map((w, i) => {
        const Icon = EVENT_ICONS[w.class] || Volume2;
        const isDangerous = !['NORMAL', 'SIREN'].includes(w.class) && w.confidence >= 0.3;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`p-3 rounded-xl border transition-all ${
              isDangerous
                ? 'bg-danger/10 border-danger/20'
                : 'bg-white/[0.02] border-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Icon size={14} className={isDangerous ? 'text-danger' : 'text-surface-400'} />
                <span className="text-xs font-mono text-surface-400">
                  {w.start.toFixed(1)}s – {w.end.toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${isDangerous ? 'text-danger' : 'text-white'}`}>
                  {EVENT_LABELS[w.class]}
                </span>
                <span className="text-[11px] font-mono text-surface-500">
                  {(w.confidence * 100).toFixed(1)}%
                </span>
              </div>
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
    <div className="overflow-x-auto custom-scrollbar">
      <div className="min-w-[500px]">
        <div className="flex mb-1">
          <div className="w-28 shrink-0" />
          {timeline.map((w, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-surface-600 font-mono">
              {w.start.toFixed(1)}s
            </div>
          ))}
        </div>

        {CLASS_ORDER.map((cls, classIdx) => (
          <div key={cls} className="flex items-center mb-1">
            <div className="w-28 shrink-0 text-[10px] text-surface-400 text-right pr-2 truncate">
              {EVENT_LABELS[cls]}
            </div>
            {timeline.map((w, winIdx) => {
              const prob = w.probabilities[classIdx] || 0;
              return (
                <div
                  key={winIdx}
                  className="flex-1 mx-0.5 rounded-sm"
                  style={{
                    height: 16,
                    background: cls === 'NORMAL' ? '#ffffff' : '#ef4444',
                    opacity: Math.max(prob, 0.04),
                  }}
                  title={`${EVENT_LABELS[cls]}: ${(prob * 100).toFixed(1)}%`}
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

  const drawWaveform = (f: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buffer = await audioCtx.decodeAudioData(e.target?.result as ArrayBuffer);
        const rawData = buffer.getChannelData(0);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = (canvas.width = canvas.offsetWidth * 2);
        const height = (canvas.height = 100 * 2);
        ctx.scale(2, 2);
        ctx.clearRect(0, 0, width, height);

        const step = Math.ceil(rawData.length / width);
        const amp = 40;
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;

        for (let i = 0; i < width; i++) {
          let min = 1.0, max = -1.0;
          for (let j = 0; j < step; j++) {
            const datum = rawData[i * step + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
          }
          ctx.moveTo(i, (1 + min) * amp);
          ctx.lineTo(i, (1 + max) * amp);
        }
        ctx.stroke();
      } catch {
        // waveform fallback
      }
    };
    reader.readAsArrayBuffer(f);
  };

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
    accept: { 'audio/*': ['.wav', '.mp3', '.m4a', '.ogg'] },
    maxFiles: 1,
  });

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
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Unknown error';
      toast.error(`Analysis failed: ${detail}`);
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white font-display flex items-center gap-2.5">
          <Mic size={20} className="text-white" />
          Acoustic Event Analysis Lab
        </h1>
        <p className="text-sm text-surface-500">
          Upload audio clips for windowed TFLite neural inference & Threat Engine scoring
        </p>
      </div>

      {!result ? (
        /* UPLOAD STATE */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            {/* Dropzone */}
            <div {...getRootProps()}>
              <motion.div
                whileHover={{ scale: 1.005 }}
                className={`card p-8 text-center cursor-pointer transition-all border-dashed ${
                  isDragActive ? 'border-white bg-white/[0.04]' : 'border-white/[0.1] hover:border-white/[0.2]'
                }`}
              >
                <input {...getInputProps()} />
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <Upload size={20} className="text-white" />
                </div>
                <p className="text-sm font-medium text-white">
                  {isDragActive ? 'Drop audio file here...' : 'Drag & drop audio file, or click to browse'}
                </p>
                <p className="text-xs text-surface-600 mt-1">WAV or MP3 format · Max 50MB</p>
              </motion.div>
            </div>

            {/* File Info */}
            {file && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center">
                      <FileAudio size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[200px]">{file.name}</p>
                      <p className="text-[10px] text-surface-500 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button onClick={reset} className="text-surface-500 hover:text-white text-sm">
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Waveform */}
            {file && (
              <div className="card p-4">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-2 font-mono">Waveform Analysis</p>
                <canvas ref={canvasRef} className="w-full rounded-xl bg-white/[0.01]" style={{ height: 80 }} />
              </div>
            )}

            {/* Analyze Button */}
            {file && (
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={handleAnalyze} disabled={analyzing}
                className="w-full btn-primary py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Executing Neural Inference Pipeline...
                  </>
                ) : (
                  <>
                    <Brain size={18} />
                    Run Acoustic Analysis Pipeline
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* Right Empty Card */}
          <div className="card p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
            <Brain size={40} className="text-surface-700 mb-3" />
            <p className="text-base font-medium text-white">Upload audio to begin</p>
            <p className="text-xs text-surface-500 mt-1 max-w-sm">
              The pipeline splits audio into 2.5s windows, generates Mel spectrograms, executes MobileNetV5-Edge TFLite model, and evaluates co-occurrence temporal threat metrics.
            </p>
          </div>
        </div>
      ) : (
        /* RESULTS STATE */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Threat Gauge */}
            <div className="card p-6 flex flex-col items-center justify-center">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-2 font-mono">Threat Assessment</p>
              <ThreatGauge score={result.threatScore} level={result.situationLevel} />
            </div>

            {/* Explanation */}
            <div className="card p-5 lg:col-span-2 flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-2 font-mono">AI Situation Assessment</p>
                <p className="text-sm text-surface-200 leading-relaxed">{result.explanation}</p>

                {result.recommendations?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/[0.06]">
                    <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-2 font-mono">Recommended Dispatch</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.recommendations.map((rec, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-surface-300">
                          {rec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.06] mt-4 flex items-center justify-between">
                <span className="text-[10px] text-surface-600 font-mono">Model: {result.pipeline.modelVersion}</span>
                <button onClick={reset} className="btn-ghost text-xs py-1 px-3 flex items-center gap-1.5">
                  <RotateCcw size={13} /> New Analysis
                </button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Duration', val: `${result.audioDuration}s` },
              { label: 'Windows', val: result.totalWindows },
              { label: 'Threat Windows', val: result.dangerousEventCount },
              { label: 'Latency', val: `${result.processingTime}ms` },
              { label: 'Window Size', val: `${result.pipeline.windowSize}s` },
              { label: 'Overlap', val: `${result.pipeline.overlapPercent}%` },
            ].map(s => (
              <div key={s.label} className="card p-3 text-center">
                <p className="text-base font-semibold text-white font-mono">{s.val}</p>
                <p className="text-[10px] text-surface-500 font-mono mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-white/[0.06]">
              {[
                { id: 'timeline' as const, label: 'Event Timeline', count: result.aggregatedEvents.length },
                { id: 'windows' as const, label: 'Window Analysis', count: result.totalWindows },
                { id: 'heatmap' as const, label: 'Probability Heatmap' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-4 text-xs font-medium transition-all relative ${
                    activeTab === tab.id ? 'text-white bg-white/[0.04]' : 'text-surface-500 hover:text-surface-300'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-mono">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === 'timeline' && (
                <EventTimeline timeline={result.timeline} aggregated={result.aggregatedEvents} duration={result.audioDuration} />
              )}
              {activeTab === 'windows' && <WindowList timeline={result.timeline} />}
              {activeTab === 'heatmap' && <ProbabilityHeatmap timeline={result.timeline} />}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
