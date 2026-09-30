import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Mic, MicOff, Upload, FileAudio, Play, Pause, RotateCcw, Brain, Activity,
  ShieldAlert, Layers, Flame, Sparkles, Clock, Cpu, X, Loader2, CheckCircle2,
  AlertTriangle, Volume2, VolumeX, UserX, Car, Skull, Siren, Sliders,
  Bell, BellRing, Smartphone, Check, ArrowRight, Zap, RefreshCw, Radio
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

// =============================================================================
// Constants & Color Mappings
// =============================================================================

const EVENT_LABELS: Record<string, string> = {
  SCREAM: 'Scream',
  GLASS_BREAK: 'Glass Break',
  IMPACT_CRASH: 'Vehicle Impact',
  GUNSHOT_EXPLOSION: 'Gunshot / Explosion',
  CROWD_PANIC: 'Crowd Panic',
  SIREN: 'Emergency Siren',
  NORMAL: 'Normal Ambient',
};

const EVENT_ICONS: Record<string, any> = {
  SCREAM: UserX,
  GLASS_BREAK: Flame,
  IMPACT_CRASH: Car,
  GUNSHOT_EXPLOSION: Skull,
  CROWD_PANIC: AlertTriangle,
  SIREN: Siren,
  NORMAL: Volume2,
};

const SITUATION_CONFIG: Record<string, { color: string; bg: string; label: string; ringColor: string }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', label: 'CRITICAL EMERGENCY', ringColor: '#ef4444' },
  WARNING: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: 'ELEVATED WARNING', ringColor: '#f59e0b' },
  SUSPICIOUS: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', label: 'SUSPICIOUS ACTIVITY', ringColor: '#3b82f6' },
  NORMAL: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', label: 'ENVIRONMENT SAFE', ringColor: '#22c55e' },
};

const CLASS_ORDER = ['SCREAM', 'GLASS_BREAK', 'IMPACT_CRASH', 'GUNSHOT_EXPLOSION', 'CROWD_PANIC', 'SIREN', 'NORMAL'];

// =============================================================================
// Sound Synthesizer for Real-Time Alarm
// =============================================================================
function playAlertChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio synthesis not permitted without prior user gesture
  }
}

// =============================================================================
// Client-Side WAV Encoder (16kHz 16-bit Mono)
// =============================================================================
function encodeWAV(samples: Float32Array, sampleRate: number = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16 bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples clamped to int16
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// =============================================================================
// Subcomponents
// =============================================================================

function LiveThreatGauge({ score, level }: { score: number; level: string }) {
  const cfg = SITUATION_CONFIG[level] || SITUATION_CONFIG.NORMAL;
  const circumference = 2 * Math.PI * 72;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle
            cx="80" cy="80" r="72"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
          />
          <motion.circle
            cx="80" cy="80" r="72"
            fill="none"
            stroke={cfg.ringColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 10px ${cfg.ringColor}80)`,
            }}
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute flex flex-col items-center justify-center">
          <motion.span
            key={score}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-4xl font-extrabold font-mono tracking-tight"
            style={{ color: cfg.color }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] uppercase font-mono tracking-widest text-surface-500 mt-0.5">
            / 100 THREAT
          </span>
        </div>
      </div>

      <div
        className="mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
        style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30` }}
      >
        <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: cfg.color }} />
        {cfg.label}
      </div>
    </div>
  );
}

// =============================================================================
// Top-Right Emergency Alert Card (User Request)
// =============================================================================
interface EmergencyAlert {
  id: string;
  className: string;
  confidence: number;
  threatScore: number;
  situationLevel: string;
  timestamp: string;
  message: string;
  emergencyDuration?: number;
  isAlarmActive?: boolean;
}

function TopRightAlertPopup({ alert, onDismiss }: { alert: EmergencyAlert | null; onDismiss: () => void }) {
  if (!alert) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, x: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        className="fixed top-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] rounded-2xl p-4 shadow-2xl backdrop-blur-xl border border-danger/60 bg-black/95 text-white"
        style={{
          boxShadow: '0 20px 50px rgba(239, 68, 68, 0.45), 0 0 35px rgba(239, 68, 68, 0.3)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-danger/25 border border-danger/60 flex items-center justify-center shrink-0 animate-pulse">
              <AlertTriangle size={20} className="text-danger" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-danger text-black flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                  ALERT DETECTED
                </span>
                {alert.emergencyDuration !== undefined && alert.emergencyDuration > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white font-bold">
                    {alert.emergencyDuration}s ACTIVE
                  </span>
                )}
                <span className="text-[11px] font-mono text-surface-400">{alert.timestamp}</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                Acoustic Threat Alert
              </h4>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-surface-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-surface-200 mt-2.5 leading-relaxed bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.08] font-medium">
          Acoustic anomaly detected exceeding baseline safety thresholds.
        </p>

        <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
          <span className="text-surface-400">
            Threat Score: <strong className="text-danger font-extrabold">{alert.threatScore}/100</strong>
          </span>
          <span className="text-surface-400">
            Status: <strong className="text-danger font-bold uppercase">{alert.situationLevel}</strong>
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// Main AI Audio Lab Component
// =============================================================================

export default function AudioTestPage() {
  // Mode switcher: 'live' or 'file'
  const [labMode, setLabMode] = useState<'live' | 'file'>('live');

  // Live state
  const [isListening, setIsListening] = useState(false);
  const [liveAudioLevel, setLiveAudioLevel] = useState(0);
  const [liveResult, setLiveResult] = useState<any>(null);
  const [liveHistory, setLiveHistory] = useState<any[]>([]);
  const [activeAlert, setActiveAlert] = useState<EmergencyAlert | null>(null);

  // Calibration parameters (calibrated defaults: 1.0x sensitivity, 0.018 noise floor, 2 sustained windows)
  const [sensitivity, setSensitivity] = useState<number>(1.0);
  const [rmsFloor, setRmsFloor] = useState<number>(0.018);
  const [minSustained, setMinSustained] = useState<number>(2);
  const [decayRate, setDecayRate] = useState<number>(20);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isBuildingApk, setIsBuildingApk] = useState<boolean>(false);

  // File upload state (existing pipeline)
  const [file, setFile] = useState<File | null>(null);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [fileResult, setFileResult] = useState<any>(null);
  const [fileActiveTab, setFileActiveTab] = useState<'timeline' | 'windows' | 'heatmap'>('timeline');

  // Web Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rollingSamplesRef = useRef<Float32Array>(new Float32Array(40000)); // 2.5s @ 16kHz
  const samplesFilledRef = useRef<number>(0);
  const lastSendTimeRef = useRef<number>(0);

  // Real-time canvas visualizer
  const visualizerDataRef = useRef<number[]>(new Array(64).fill(0));

  // Clean up Web Audio on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Visualizer Animation Loop
  useEffect(() => {
    let animId: number;
    const renderVisualizer = () => {
      const canvas = canvasRef.current;
      if (canvas && isListening) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          ctx.clearRect(0, 0, width, height);

          // Draw animated waveform bars
          const bars = visualizerDataRef.current;
          const barWidth = width / bars.length;
          for (let i = 0; i < bars.length; i++) {
            const h = Math.max(4, bars[i] * height * 1.5);
            const x = i * barWidth;
            const y = (height - h) / 2;

            const isAlert = liveResult?.threatScore >= 45;
            ctx.fillStyle = isAlert ? '#ef4444' : '#22c55e';
            ctx.fillRect(x + 1, y, barWidth - 2, h);
          }
        }
      }
      animId = requestAnimationFrame(renderVisualizer);
    };

    animId = requestAnimationFrame(renderVisualizer);
    return () => cancelAnimationFrame(animId);
  }, [isListening, liveResult]);

  // Resample arbitrary browser audio sample rates (44.1k, 48k, etc.) to exactly 16000 Hz
  const resampleTo16k = (input: Float32Array, inSampleRate: number): Float32Array => {
    if (inSampleRate === 16000) return input;
    const ratio = inSampleRate / 16000;
    const outLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const origPos = i * ratio;
      const idx = Math.floor(origPos);
      const frac = origPos - idx;
      const s0 = input[idx] || 0;
      const s1 = input[idx + 1] !== undefined ? input[idx + 1] : s0;
      output[i] = s0 + frac * (s1 - s0);
    }
    return output;
  };

  // Keep a live mutable ref of tuning sliders to eliminate React stale closures
  const paramsRef = useRef({ sensitivity, rmsFloor, minSustained, decayRate });
  useEffect(() => {
    paramsRef.current = { sensitivity, rmsFloor, minSustained, decayRate };
  }, [sensitivity, rmsFloor, minSustained, decayRate]);

  // Start Live Listening
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      mediaStreamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      rollingSamplesRef.current = new Float32Array(40000);
      samplesFilledRef.current = 0;
      lastSendTimeRef.current = Date.now();

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const inSampleRate = audioCtx.sampleRate || 16000;

        // Calculate instantaneous RMS for UI visualizer & level meter
        let maxAmp = 0;
        let sumSq = 0;
        for (let i = 0; i < inputData.length; i++) {
          const v = Math.abs(inputData[i]);
          if (v > maxAmp) maxAmp = v;
          sumSq += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSq / inputData.length);
        setLiveAudioLevel(rms);

        // Update visualizer frequency bars
        const step = Math.floor(inputData.length / 64);
        const newBars = [];
        for (let i = 0; i < 64; i++) {
          newBars.push(Math.abs(inputData[i * step] || 0));
        }
        visualizerDataRef.current = newBars;

        // Cleanly resample to 16000 Hz before placing into the 40000-sample window
        const resampled = resampleTo16k(inputData, inSampleRate);
        const buf = rollingSamplesRef.current;
        const chunkLen = resampled.length;

        if (chunkLen < buf.length) {
          buf.copyWithin(0, chunkLen);
          buf.set(resampled, buf.length - chunkLen);
        }
        samplesFilledRef.current = Math.min(buf.length, samplesFilledRef.current + chunkLen);

        // Every 1.0 second (1000ms), send current 2.5s window to backend
        const now = Date.now();
        if (now - lastSendTimeRef.current >= 1000 && samplesFilledRef.current >= 20000) {
          lastSendTimeRef.current = now;
          sendAudioChunk(buf.slice());
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      setIsListening(true);
      toast.success('Live acoustic monitoring activated!');
    } catch (err: any) {
      console.error('Microphone error:', err);
      toast.error(`Microphone access error: ${err.message || 'Check browser permissions'}`);
    }
  };

  // Stop Live Listening
  const stopListening = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
    setLiveAudioLevel(0);
  };

  // Send Audio Chunk to Fast Warm Inference Endpoint
  const sendAudioChunk = async (samples: Float32Array) => {
    try {
      const wavBlob = encodeWAV(samples, 16000);
      const formData = new FormData();
      formData.append('audio', wavBlob, 'live_chunk.wav');

      const current = paramsRef.current;
      const queryParams = `sensitivity=${current.sensitivity}&rms_floor=${current.rmsFloor}&min_sustained=${current.minSustained}&decay_rate=${current.decayRate}`;

      // Call our warm endpoint (supports direct port 5002 or proxied backend)
      let data: any;
      try {
        const res = await fetch(`http://127.0.0.1:5002/predict-chunk?${queryParams}`, {
          method: 'POST',
          body: formData,
        });
        data = await res.json();
      } catch {
        // Fallback to Express backend route if port 5002 is not directly accessible
        const res = await api.post(`/audio/live-chunk?${queryParams}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        data = res.data;
      }

      setLiveResult(data);

      // Append to live history
      setLiveHistory((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          className: data.predictedClass,
          confidence: data.confidence,
          threatScore: data.threatScore,
          situationLevel: data.situationLevel,
        },
        ...prev.slice(0, 24),
      ]);

      // Persistent emergency alert tracking (only active if predictedClass is a true emergency)
      if (data.isAlarmActive && data.threatScore >= 45 && data.predictedClass !== 'NORMAL') {
        if (data.shouldAlert) {
          playAlertChime();
        }
        setActiveAlert({
          id: 'active_emergency',
          className: data.predictedClass,
          confidence: data.confidence,
          threatScore: data.threatScore,
          situationLevel: data.situationLevel,
          timestamp: new Date().toLocaleTimeString(),
          message: data.displayMessage,
          emergencyDuration: data.emergencyDuration,
          isAlarmActive: true,
        });
      } else if (data.threatScore < 25 || data.predictedClass === 'NORMAL') {
        // Gracefully clear active emergency alert once quiet environment resumes
        setActiveAlert(null);
      }
    } catch (err: any) {
      console.warn('[LiveChunk] Frame error:', err.message);
    }
  };

  // Reset Live Threat State
  const handleResetThreat = async () => {
    try {
      await fetch('http://127.0.0.1:5002/reset', { method: 'POST' }).catch(() => {});
      setLiveResult((prev: any) => (prev ? { ...prev, threatScore: 0, situationLevel: 'NORMAL' } : null));
      setActiveAlert(null);
      toast.success('Threat state reset to safe ambient levels');
    } catch {
      toast.error('Failed to reset threat state');
    }
  };

  // Sync Calibrated Parameters to Android APK Codebase
  const handleSyncToMobile = async () => {
    setIsSyncing(true);
    try {
      const payload = {
        sensitivity,
        rms_floor: rmsFloor,
        min_sustained: minSustained,
        decay_rate: decayRate,
      };

      const res = await fetch('http://127.0.0.1:5002/sync-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Sync failed');
      toast.success('Calibrated parameters synced into Android Guard project!');
    } catch (err: any) {
      toast.error(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Build New APK with Calibrated Parameters
  const handleBuildApk = async () => {
    setIsBuildingApk(true);
    const toastId = toast.loading('Compiling Android APK with calibrated settings (Gradle build)...');
    try {
      // Sync first
      await fetch('http://127.0.0.1:5002/sync-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensitivity,
          rms_floor: rmsFloor,
          min_sustained: minSustained,
          decay_rate: decayRate,
        }),
      }).catch(() => {});

      const res = await api.post('/audio/build-apk');
      toast.success(res.data.message || 'APK compiled successfully!', { id: toastId });
    } catch (err: any) {
      toast.error(`Build failed: ${err?.response?.data?.detail || err.message}`, { id: toastId });
    } finally {
      setIsBuildingApk(false);
    }
  };

  // File upload logic (existing timeline pipeline)
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f) {
      setFile(f);
      setFileResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.wav', '.mp3', '.m4a', '.ogg'] },
    maxFiles: 1,
  });

  const handleAnalyzeFile = async () => {
    if (!file) return;
    setAnalyzingFile(true);
    try {
      const formData = new FormData();
      formData.append('audio', file);

      const { data } = await api.post('/audio/analyze-pipeline', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      setFileResult(data);
      toast.success('Timeline analysis complete!');
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.response?.data?.error || error?.message;
      toast.error(`Analysis failed: ${detail}`);
    } finally {
      setAnalyzingFile(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Top-Right Emergency Alert Card */}
      <TopRightAlertPopup alert={activeAlert} onDismiss={() => setActiveAlert(null)} />

      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-bold text-white font-display flex items-center gap-3">
            <Mic size={24} className="text-white" />
            Acoustic Event Analysis Lab
          </h1>
          <p className="text-xs text-surface-400 mt-1">
            Real-time neural acoustic listening, live YouTube audio testing, and calibrated threshold tuning
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          <button
            onClick={() => setLabMode('live')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              labMode === 'live'
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-surface-400 hover:text-white'
            }`}
          >
            <Radio size={14} className={labMode === 'live' ? 'animate-pulse text-danger' : ''} />
            Live Continuous Mic
          </button>
          <button
            onClick={() => setLabMode('file')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              labMode === 'file'
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-surface-400 hover:text-white'
            }`}
          >
            <Upload size={14} />
            Upload WAV Clip
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: LIVE CONTINUOUS MIC (PRIMARY REQUEST) */}
      {/* ========================================================================= */}
      {labMode === 'live' && (
        <div className="space-y-6">
          {/* Top Control Bar & Live Status */}
          <div className="card p-5 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-white/[0.03] to-white/[0.01]">
            <div className="flex items-center gap-4">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all shadow-lg ${
                  isListening
                    ? 'bg-danger text-white hover:bg-danger/90 shadow-danger/25 animate-pulse'
                    : 'bg-white text-black hover:bg-surface-200 shadow-white/10'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff size={18} /> Stop Live Monitoring
                  </>
                ) : (
                  <>
                    <Mic size={18} /> Start Real-Time Listening
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isListening ? 'bg-success animate-ping' : 'bg-surface-600'
                  }`}
                />
                <span className="text-xs font-mono text-surface-400">
                  {isListening ? 'MICROPHONE ACTIVE (16kHz PCM)' : 'OFFLINE (Click to activate)'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleResetThreat}
                className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 border border-white/[0.08]"
                title="Reset threat accumulator to 0"
              >
                <RotateCcw size={13} /> Reset Threat Score
              </button>
            </div>
          </div>

          {/* Grid Layout: Visualizer, Threat Gauge, and Live Probabilities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Live Audio Oscilloscope & dB Meter */}
            <div className="card p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-surface-400 flex items-center gap-1.5">
                    <Activity size={14} className="text-white" /> Audio Input Spectrum
                  </span>
                  <span className="text-xs font-mono font-semibold text-white">
                    {(liveAudioLevel * 1000).toFixed(1)} RMS
                  </span>
                </div>

                <div className="h-32 rounded-xl bg-black/60 border border-white/[0.08] p-2 flex items-center justify-center overflow-hidden relative">
                  <canvas ref={canvasRef} width={280} height={100} className="w-full h-full" />
                  {!isListening && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-surface-500 font-mono">
                      Microphone inactive
                    </div>
                  )}
                </div>

                {/* Energy Noise Floor Indicator */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-surface-500">
                    <span>Noise Gate: {rmsFloor}</span>
                    <span>
                      {liveAudioLevel >= rmsFloor ? (
                        <span className="text-success font-bold">● Active Audio Detected</span>
                      ) : (
                        <span className="text-surface-600">○ Below Noise Floor</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className={`h-full ${
                        liveAudioLevel >= rmsFloor ? 'bg-success' : 'bg-surface-600'
                      }`}
                      style={{ width: `${Math.min(100, (liveAudioLevel / 0.02) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Engine Stats */}
              <div className="pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-center text-[10px] font-mono text-surface-400">
                <div className="p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-surface-500 block">WARM LATENCY</span>
                  <span className="text-xs text-white font-bold">{liveResult?.latencyMs || '5.2'} ms</span>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-surface-500 block">HOP INTERVAL</span>
                  <span className="text-xs text-white font-bold">1.0 s</span>
                </div>
              </div>
            </div>

            {/* Column 2: Live Threat Gauge & Classification */}
            <div className="card p-6 flex flex-col items-center justify-center space-y-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-surface-400">
                Temporal Threat Assessment
              </span>
              <LiveThreatGauge
                score={liveResult?.threatScore || 0}
                level={liveResult?.situationLevel || 'NORMAL'}
              />

              {/* Current primary prediction card */}
              <div className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center">
                <span className="text-[10px] uppercase font-mono text-surface-500 block">
                  Current Classification
                </span>
                <div className="flex items-center justify-center gap-2 mt-1">
                  {React.createElement(EVENT_ICONS[liveResult?.predictedClass || 'NORMAL'] || Volume2, {
                    size: 18,
                    className:
                      liveResult?.predictedClass !== 'NORMAL' ? 'text-danger' : 'text-success',
                  })}
                  <span className="text-sm font-bold text-white">
                    {EVENT_LABELS[liveResult?.predictedClass || 'NORMAL'] || 'Normal Ambient'}
                  </span>
                  <span className="text-xs font-mono text-surface-400">
                    ({((liveResult?.confidence || 0.85) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: Real-Time Class Probabilities */}
            <div className="card p-5 space-y-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-surface-400 block mb-1">
                Neural Class Probabilities (7 Classes)
              </span>

              <div className="space-y-2">
                {CLASS_ORDER.map((cls, idx) => {
                  const prob = liveResult?.probabilities?.[idx] || (cls === 'NORMAL' ? 0.85 : 0.02);
                  const isDangerous = cls !== 'NORMAL' && cls !== 'SIREN';
                  const isCurrent = liveResult?.predictedClass === cls;
                  const Icon = EVENT_ICONS[cls] || Volume2;

                  return (
                    <div key={cls} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          <Icon
                            size={13}
                            className={
                              isCurrent
                                ? isDangerous
                                  ? 'text-danger'
                                  : 'text-success'
                                : 'text-surface-500'
                            }
                          />
                          <span className={isCurrent ? 'text-white font-bold' : 'text-surface-400'}>
                            {EVENT_LABELS[cls]}
                          </span>
                        </div>
                        <span className={isCurrent ? 'text-white font-bold' : 'text-surface-500'}>
                          {(prob * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div
                          className={`h-full ${
                            isDangerous ? 'bg-danger' : cls === 'SIREN' ? 'bg-info' : 'bg-success'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(2, prob * 100))}%`,
                            opacity: isCurrent ? 1 : 0.4,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Real-Time Parameter Calibration Drawer (The User's specific testing need!) */}
          <div className="card p-6 border-white/[0.1] bg-black/60 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders size={18} className="text-white" />
                  Live Detection Calibration & Mobile Sync
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">
                  Tune threshold sensitivity on YouTube playback or live sounds, then sync winning values to APK
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncToMobile}
                  disabled={isSyncing}
                  className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 font-semibold"
                >
                  {isSyncing ? <Loader2 size={13} className="animate-spin" /> : <Smartphone size={13} />}
                  Sync Settings to Android Code
                </button>

                <button
                  onClick={handleBuildApk}
                  disabled={isBuildingApk}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold shadow-lg shadow-white/10"
                >
                  {isBuildingApk ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  Compile Updated APK
                </button>
              </div>
            </div>

            {/* Slider Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Slider 1: Sensitivity */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-white">Detection Sensitivity</label>
                  <span className="text-xs font-mono font-bold text-white">{sensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="w-full accent-white cursor-pointer"
                />
                <p className="text-[10px] text-surface-500 leading-tight">
                  Higher = lower confidence needed to trigger alarms (ideal for laptop speaker playback).
                </p>
              </div>

              {/* Slider 2: RMS Noise Floor */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-white">RMS Noise Floor Gate</label>
                  <span className="text-xs font-mono font-bold text-white">{rmsFloor.toFixed(4)}</span>
                </div>
                <input
                  type="range"
                  min="0.0005"
                  max="0.015"
                  step="0.0005"
                  value={rmsFloor}
                  onChange={(e) => setRmsFloor(parseFloat(e.target.value))}
                  className="w-full accent-white cursor-pointer"
                />
                <p className="text-[10px] text-surface-500 leading-tight">
                  Audio below this energy is treated as silent ambient. Keep low (0.002) for distant sound.
                </p>
              </div>

              {/* Slider 3: Sustained Windows */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-white">Sustained Windows</label>
                  <span className="text-xs font-mono font-bold text-white">
                    {minSustained} {minSustained === 1 ? 'window (Instant)' : 'windows'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map((val) => (
                    <button
                      key={val}
                      onClick={() => setMinSustained(val)}
                      className={`flex-1 py-1 rounded-lg text-xs font-mono font-semibold border transition-all ${
                        minSustained === val
                          ? 'bg-white text-black border-white'
                          : 'bg-white/[0.03] text-surface-400 border-white/[0.08] hover:text-white'
                      }`}
                    >
                      {val === 1 ? '1 (Fast)' : `${val} Wins`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-surface-500 leading-tight">
                  Number of consecutive 2.5s danger detections required before triggering an alert.
                </p>
              </div>

              {/* Slider 4: Decay Rate */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-white">Threat Decay Speed</label>
                  <span className="text-xs font-mono font-bold text-white">
                    {decayRate === 4 ? 'Slow (4 pts)' : decayRate === 8 ? 'Normal (8 pts)' : 'Fast (15 pts)'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {[
                    { label: 'Slow', val: 4 },
                    { label: 'Normal', val: 8 },
                    { label: 'Fast', val: 15 },
                  ].map((d) => (
                    <button
                      key={d.val}
                      onClick={() => setDecayRate(d.val)}
                      className={`flex-1 py-1 rounded-lg text-xs font-mono font-semibold border transition-all ${
                        decayRate === d.val
                          ? 'bg-white text-black border-white'
                          : 'bg-white/[0.03] text-surface-400 border-white/[0.08] hover:text-white'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-surface-500 leading-tight">
                  How quickly the threat meter cools down when quiet ambient sound returns.
                </p>
              </div>
            </div>
          </div>

          {/* Live Recent Event History */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-surface-400">
                Live Acoustic Event Feed (Last 25 Windows)
              </span>
              <span className="text-xs text-surface-500 font-mono">{liveHistory.length} frames logged</span>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1.5">
              {liveHistory.map((item, idx) => {
                const isThreat = item.className !== 'NORMAL' && item.className !== 'SIREN';
                const Icon = EVENT_ICONS[item.className] || Volume2;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                      isThreat
                        ? 'bg-danger/10 border-danger/30 text-white'
                        : 'bg-white/[0.015] border-white/[0.04] text-surface-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-surface-500 text-[10px]">{item.timestamp}</span>
                      <Icon size={14} className={isThreat ? 'text-danger' : 'text-surface-500'} />
                      <span className={`font-semibold ${isThreat ? 'text-white' : 'text-surface-300'}`}>
                        {EVENT_LABELS[item.className] || item.className}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span>Conf: {(item.confidence * 100).toFixed(0)}%</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.situationLevel === 'CRITICAL'
                            ? 'bg-danger text-black'
                            : item.situationLevel === 'WARNING'
                            ? 'bg-warning text-black'
                            : item.situationLevel === 'SUSPICIOUS'
                            ? 'bg-info text-white'
                            : 'bg-white/[0.05] text-surface-400'
                        }`}
                      >
                        {item.situationLevel} ({item.threatScore})
                      </span>
                    </div>
                  </div>
                );
              })}

              {liveHistory.length === 0 && (
                <div className="text-center py-8 text-surface-600 text-xs font-mono">
                  No frames processed yet. Click &quot;Start Real-Time Listening&quot; to begin.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FILE PIPELINE ANALYSIS (WAV / MP3 UPLOAD) */}
      {/* ========================================================================= */}
      {labMode === 'file' && (
        <div className="space-y-6">
          {!fileResult ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div {...getRootProps()}>
                  <motion.div
                    whileHover={{ scale: 1.005 }}
                    className={`card p-8 text-center cursor-pointer transition-all border-dashed ${
                      isDragActive
                        ? 'border-white bg-white/[0.04]'
                        : 'border-white/[0.1] hover:border-white/[0.2]'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <Upload size={20} className="text-white" />
                    </div>
                    <p className="text-sm font-medium text-white">
                      {isDragActive ? 'Drop audio file here...' : 'Drag & drop WAV/MP3 file, or click to browse'}
                    </p>
                    <p className="text-xs text-surface-600 mt-1">WAV or MP3 format · Max 50MB</p>
                  </motion.div>
                </div>

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
                      <button onClick={() => setFile(null)} className="text-surface-500 hover:text-white text-sm">
                        <X size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {file && (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleAnalyzeFile}
                    disabled={analyzingFile}
                    className="w-full btn-primary py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {analyzingFile ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Executing Neural Inference Pipeline...
                      </>
                    ) : (
                      <>
                        <Brain size={18} />
                        Run Timeline Analysis Pipeline
                      </>
                    )}
                  </motion.button>
                )}
              </div>

              <div className="card p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                <Brain size={40} className="text-surface-700 mb-3" />
                <p className="text-base font-medium text-white">Upload test audio for full timeline</p>
                <p className="text-xs text-surface-500 mt-1 max-w-sm">
                  Evaluates entire audio duration across overlapping 2.5s windows with co-occurrence pattern
                  matching and natural language explanation generation.
                </p>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="card p-6 flex flex-col items-center justify-center">
                  <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-2 font-mono">
                    Threat Assessment
                  </p>
                  <LiveThreatGauge score={fileResult.threatScore} level={fileResult.situationLevel} />
                </div>

                <div className="card p-5 lg:col-span-2 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-2 font-mono">
                      AI Situation Assessment
                    </p>
                    <p className="text-sm text-surface-200 leading-relaxed">{fileResult.explanation}</p>

                    {fileResult.recommendations?.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/[0.06]">
                        <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-2 font-mono">
                          Recommended Response
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {fileResult.recommendations.map((rec: string, i: number) => (
                            <span
                              key={i}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-surface-300"
                            >
                              {rec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] mt-4 flex items-center justify-between">
                    <span className="text-[10px] text-surface-600 font-mono">
                      Model: {fileResult.pipeline?.modelVersion || 'MobileNetV5-Edge'}
                    </span>
                    <button
                      onClick={() => setFileResult(null)}
                      className="btn-ghost text-xs py-1 px-3 flex items-center gap-1.5"
                    >
                      <RotateCcw size={13} /> New File Analysis
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Duration', val: `${fileResult.audioDuration}s` },
                  { label: 'Windows', val: fileResult.totalWindows },
                  { label: 'Threat Windows', val: fileResult.dangerousEventCount },
                  { label: 'Latency', val: `${fileResult.processingTime}ms` },
                  { label: 'Window Size', val: `${fileResult.pipeline?.windowSize || 2.5}s` },
                  { label: 'Overlap', val: `${fileResult.pipeline?.overlapPercent || 50}%` },
                ].map((s) => (
                  <div key={s.label} className="card p-3 text-center">
                    <p className="text-base font-semibold text-white font-mono">{s.val}</p>
                    <p className="text-[10px] text-surface-500 font-mono mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Timeline Segments */}
              <div className="card p-5 space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-surface-400 block mb-1">
                  Contiguous Event Segments
                </span>
                <div className="flex flex-wrap gap-2">
                  {fileResult.aggregatedEvents?.map((seg: any, i: number) => {
                    const isThreat = seg.class !== 'NORMAL' && seg.class !== 'SIREN';
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono ${
                          isThreat
                            ? 'bg-danger/10 border-danger/30 text-white'
                            : 'bg-white/[0.03] border-white/[0.06] text-surface-300'
                        }`}
                      >
                        <span className="font-bold">{EVENT_LABELS[seg.class]}</span>
                        <span className="text-surface-500">
                          {seg.start.toFixed(1)}s – {seg.end.toFixed(1)}s
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10">
                          {(seg.maxConfidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
