import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('dhwaniai_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('dhwaniai_token');
    localStorage.removeItem('dhwaniai_user');
    navigate('/login');
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <header className="h-16 bg-bg-surface/30 backdrop-blur-xl border-b border-border flex items-center justify-between px-8 sticky top-0 z-30">
      <div>
        <p className="text-sm text-text-secondary">
          {greeting}, <span className="text-text-primary font-medium">{user.name || 'Admin'}</span>
        </p>
        <p className="text-[11px] text-text-muted">
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search..."
            className="w-64 bg-bg-elevated/50 border border-border rounded-xl px-4 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-primary/50 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-bg-hover rounded text-[10px] text-text-muted border border-border">
            ⌘K
          </kbd>
        </div>

        {/* Notification */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-xl bg-bg-elevated/50 border border-border hover:border-border-hover transition-all"
        >
          <span className="text-lg">🔔</span>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-[10px] flex items-center justify-center font-bold">
            3
          </span>
        </motion.button>

        {/* Profile */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-bg-elevated/50 border border-border hover:border-border-hover transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white">
              {(user.name || 'A').charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-text-primary">{user.name || 'Admin'}</p>
              <p className="text-[10px] text-text-muted">{user.role || 'ADMIN'}</p>
            </div>
          </motion.button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-48 glass-card py-2 z-50"
              >
                <button
                  onClick={() => { navigate('/settings'); setShowProfile(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
                >
                  ⚙️ Settings
                </button>
                <hr className="border-border my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 transition-all"
                >
                  🚪 Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
