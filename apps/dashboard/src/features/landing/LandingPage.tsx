import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Radio, ShieldCheck, Cpu, BarChart3, MapPin, Zap, Activity } from 'lucide-react';
import { useRef } from 'react';

export default function LandingPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.25], [1, 0.95]);

  const features = [
    {
      icon: Radio,
      title: 'Live Acoustic Monitor',
      desc: 'Continuous real-time waveform analysis across hundreds of distributed microphone nodes.',
    },
    {
      icon: Cpu,
      title: 'Edge Neural Processing',
      desc: 'On-device MobileNet inference engine detecting gunshots, screams, crashes, and sirens in < 50ms.',
    },
    {
      icon: ShieldCheck,
      title: 'Tactical Field Dispatch',
      desc: 'Automatic responder coordination with priority-weighted geofence assignment engine.',
    },
    {
      icon: BarChart3,
      title: 'Predictive Heatmap Analytics',
      desc: 'Historical incident pattern recognition with time-series anomaly forecasting.',
    },
    {
      icon: MapPin,
      title: 'GPS Incident Triangulation',
      desc: 'Multi-sensor fusion pinpointing acoustic events with ±5m spatial resolution.',
    },
    {
      icon: Zap,
      title: 'Sub-Second Alert Pipeline',
      desc: 'End-to-end detection-to-dispatch latency under 800ms via WebSocket push channels.',
    },
  ];

  const stats = [
    { value: '<50ms', label: 'Inference Latency' },
    { value: '96.4%', label: 'Detection Accuracy' },
    { value: '24/7', label: 'Always-On Network' },
    { value: '±5m', label: 'Location Precision' },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* ─── Fixed Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DhwaniAI" className="w-8 h-8 rounded-lg" />
            <span className="text-[15px] font-semibold tracking-tight font-display">
              DhwaniAI
            </span>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/login')}
              className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-xl hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.08)]"
            >
              Command Center
              <ArrowRight size={14} className="inline ml-1.5" />
            </motion.button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.015] rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
        </div>

        {/* Floating waveform lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-[600px] h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
              style={{ top: `${38 + i * 6}%` }}
              animate={{ x: ['-100px', '100px', '-100px'], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-4xl text-center">
          {/* Status chip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs text-white/60 font-medium tracking-wide">
              Neural Acoustic Grid — All Nodes Active
            </span>
          </motion.div>

          {/* Logo mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 150 }}
            className="mb-8"
          >
            <img
              src="/logo.png"
              alt="DhwaniAI"
              className="w-20 h-20 mx-auto rounded-2xl shadow-[0_0_60px_rgba(255,255,255,0.08)]"
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] font-display"
          >
            <span className="text-white">Acoustic</span>
            <br />
            <span className="text-white/40">Intelligence for</span>
            <br />
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Public Safety
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-base md:text-lg text-white/40 max-w-xl mx-auto leading-relaxed"
          >
            AI-powered acoustic monitoring that detects dangerous sound events in
            real-time and dispatches emergency responders before anyone dials for help.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(255,255,255,0.12)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/login')}
              className="px-8 py-3.5 bg-white text-black font-semibold rounded-xl text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-all"
            >
              Enter Command Center
              <ArrowRight size={16} />
            </motion.button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3.5 text-sm font-medium text-white/50 hover:text-white border border-white/[0.08] hover:border-white/[0.16] rounded-xl transition-all"
            >
              Explore Capabilities
            </button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-5 h-8 rounded-full border border-white/[0.15] flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-1.5 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ─── Stats Bar ─── */}
      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-bold text-white font-display tracking-tight">
                {s.value}
              </p>
              <p className="text-xs text-white/30 mt-2 uppercase tracking-widest font-medium">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 max-w-2xl"
          >
            <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] font-medium mb-3">
              System Capabilities
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white font-display tracking-tight">
              Engineered for
              <br />
              <span className="text-white/40">mission-critical response</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="group p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center mb-4 group-hover:bg-white/[0.1] transition-colors">
                    <Icon size={18} className="text-white/60" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-xs text-white/30 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative z-10 py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] font-medium mb-3">
              Pipeline Architecture
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white font-display tracking-tight">
              Sound to safety in milliseconds
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Capture', desc: 'Distributed microphone nodes continuously record environmental audio.' },
              { step: '02', title: 'Classify', desc: 'MobileNet neural engine identifies threat signatures with 96.4% accuracy.' },
              { step: '03', title: 'Dispatch', desc: 'Nearest available responder receives GPS coordinates and tactical intel.' },
              { step: '04', title: 'Resolve', desc: 'Field officers log evidence and close incidents from mobile devices.' },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <p className="text-5xl font-bold text-white/[0.04] font-display mb-3">{s.step}</p>
                <h3 className="text-sm font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-white/30 leading-relaxed">{s.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-8 -right-3 w-6 h-[1px] bg-white/[0.08]" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/[0.06] relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-white/[0.02] rounded-full blur-[100px]" />
              <div className="relative z-10">
                <Activity size={28} className="mx-auto mb-6 text-white/40" />
                <h2 className="text-2xl md:text-3xl font-bold text-white font-display tracking-tight mb-4">
                  Ready to deploy acoustic intelligence?
                </h2>
                <p className="text-sm text-white/30 max-w-md mx-auto mb-8">
                  Access the live command center to monitor events, coordinate responders,
                  and analyze acoustic data across your city.
                </p>
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(255,255,255,0.12)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/login')}
                  className="px-8 py-3.5 bg-white text-black font-semibold rounded-xl text-sm inline-flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                >
                  Open Command Center
                  <ArrowRight size={16} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DhwaniAI" className="w-6 h-6 rounded-md" />
            <span className="text-sm text-white/30">
              DhwaniAI © {new Date().getFullYear()} — Acoustic Safety Intelligence
            </span>
          </div>
          <p className="text-[11px] text-white/20">
            Encrypted Public Safety Network • All Systems Operational
          </p>
        </div>
      </footer>
    </div>
  );
}
