import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut, ChevronDown, AlertTriangle, Radio, Shield } from 'lucide-react';

export default function Header() {
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('dhwaniai_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('dhwaniai_token');
    localStorage.removeItem('dhwaniai_user');
    navigate('/login');
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  // Sample notifications (would come from API in production)
  const notifications = [
    { id: 1, type: 'emergency', title: 'Critical: Gunshot Detected', desc: 'Sector 7, Connaught Place', time: '2 min ago', read: false },
    { id: 2, type: 'assignment', title: 'Responder Assigned', desc: 'Officer Patel dispatched to incident #1042', time: '8 min ago', read: false },
    { id: 3, type: 'system', title: 'Device Node Reconnected', desc: 'Mic-Node-12 back online', time: '1 hour ago', read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'emergency': return <AlertTriangle size={14} className="text-red-400" />;
      case 'assignment': return <Shield size={14} className="text-white/60" />;
      default: return <Radio size={14} className="text-white/40" />;
    }
  };

  return (
    <header className="h-14 bg-black/60 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <p className="text-sm text-surface-400">
          {greeting},{' '}
          <span className="text-white font-medium">{user.name || 'Admin'}</span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
            className="relative p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all"
          >
            <Bell size={16} className="text-surface-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-[9px] flex items-center justify-center font-bold text-white">
                {unreadCount}
              </span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2 w-80 bg-surface-900 border border-white/[0.08] rounded-xl z-50 shadow-elevated overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <p className="text-xs font-semibold text-white">Notifications</p>
                  <span className="text-[10px] text-surface-500">{unreadCount} unread</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer ${
                        !n.read ? 'bg-white/[0.01]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center mt-0.5 shrink-0">
                          {getNotifIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{n.title}</p>
                          <p className="text-[11px] text-surface-500 truncate">{n.desc}</p>
                          <p className="text-[10px] text-surface-600 mt-1">{n.time}</p>
                        </div>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white mt-2 shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { navigate('/dashboard/incidents'); setShowNotifs(false); }}
                  className="w-full px-4 py-2.5 text-[11px] text-center text-surface-400 hover:text-white hover:bg-white/[0.02] transition-all font-medium"
                >
                  View All Incidents
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
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
                  onClick={() => { navigate('/dashboard/settings'); setShowProfile(false); }}
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
