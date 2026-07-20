import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('admin@dhwaniai.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('dhwaniai_token', data.token);
      localStorage.setItem('dhwaniai_user', JSON.stringify(data.user));
      onLogin();
      toast.success('Welcome back!');
      navigate('/');
    } catch {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg gradient-mesh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -80, 0], y: [0, 60, 0], scale: [1, 0.8, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/8 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -80, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-danger/5 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary via-primary-light to-accent flex items-center justify-center shadow-glow"
          >
            <span className="text-3xl font-black text-white font-display">D</span>
          </motion.div>
          <h1 className="text-3xl font-bold font-display">
            Dhwani<span className="text-gradient">AI</span>
          </h1>
          <p className="text-text-secondary text-sm mt-1">Smart Acoustic Public Safety Monitoring</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold mb-1">Sign In</h2>
          <p className="text-text-muted text-sm mb-6">Access the command center</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="glass-input"
                placeholder="admin@dhwaniai.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="glass-input"
                placeholder="••••••••"
                required
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  <span>Sign In</span>
                  <span>→</span>
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 p-3 rounded-xl bg-bg-elevated/50 border border-border">
            <p className="text-[11px] text-text-muted text-center">
              Demo: <span className="text-text-secondary font-mono">admin@dhwaniai.com</span> / <span className="text-text-secondary font-mono">admin123</span>
            </p>
          </div>
        </div>

        <p className="text-center text-text-muted text-xs mt-6">
          DhwaniAI © {new Date().getFullYear()} · AI-Powered Safety
        </p>
      </motion.div>
    </div>
  );
}
