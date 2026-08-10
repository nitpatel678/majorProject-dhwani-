import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Settings, LogOut, ChevronDown, Command } from 'lucide-react';

export default function Header() {
  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('dhwaniai_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('dhwaniai_token');
    localStorage.removeItem('dhwaniai_user');
    navigate('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <header className="h-14 bg-black/60 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <p className="text-sm text-surface-400">
          {greeting},{' '}
          <span className="text-white font-medium">{user.name || 'Admin'}</span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-600" />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-14 py-1.5 text-sm text-white placeholder-surface-600 outline-none focus:border-white/[0.12] transition-all"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-white/[0.04] rounded text-[10px] text-surface-600 border border-white/[0.06]">
            <Command size={10} />K
          </kbd>
        </div>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all"
        >
          <Bell size={16} className="text-surface-400" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-[9px] flex items-center justify-center font-bold text-white">
            3
          </span>
        </motion.button>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all"
          >
            <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-[11px] font-bold text-black">
              {(user.name || 'A').charAt(0)}
            </div>
            <span className="hidden md:block text-sm text-surface-300 font-medium">
              {user.name || 'Admin'}
            </span>
            <ChevronDown size={14} className={`text-surface-600 transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2 w-48 bg-surface-900 border border-white/[0.08] rounded-xl py-1.5 z-50 shadow-elevated"
              >
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <p className="text-xs font-medium text-white">{user.name || 'Admin'}</p>
                  <p className="text-[10px] text-surface-500">{user.email || 'admin@dhwaniai.com'}</p>
                </div>
                <button
                  onClick={() => { navigate('/settings'); setShowProfile(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-surface-400 hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-2"
                >
                  <Settings size={14} />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger/5 transition-all flex items-center gap-2"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
