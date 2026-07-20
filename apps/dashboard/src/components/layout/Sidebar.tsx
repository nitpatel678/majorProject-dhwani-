import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/monitoring', label: 'Live Monitor', icon: '🔴' },
  { path: '/devices', label: 'Devices', icon: '📡' },
  { path: '/responders', label: 'Responders', icon: '👮' },
  { path: '/incidents', label: 'Incidents', icon: '🚨' },
  { path: '/audio-test', label: 'AI Audio Lab', icon: '🎙️' },
  { path: '/map', label: 'Map View', icon: '🗺️' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-bg-surface/50 backdrop-blur-2xl border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-bold">
            D
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary font-display tracking-tight">
              Dhwani<span className="text-gradient">AI</span>
            </h1>
            <p className="text-[10px] text-text-muted uppercase tracking-[0.2em]">Command Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-4 py-2 text-[10px] text-text-muted uppercase tracking-[0.2em] font-medium">
          Main Menu
        </p>
        {navItems.slice(0, 6).map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'}>
            {() => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <motion.div
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                  {item.path === '/monitoring' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-danger animate-pulse" />
                  )}
                </motion.div>
              );
            }}
          </NavLink>
        ))}

        <p className="px-4 py-2 mt-4 text-[10px] text-text-muted uppercase tracking-[0.2em] font-medium">
          Insights
        </p>
        {navItems.slice(6).map((item) => (
          <NavLink key={item.path} to={item.path}>
            {() => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <motion.div
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </motion.div>
              );
            }}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-border">
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
          <div>
            <p className="text-xs font-medium text-text-primary">System Online</p>
            <p className="text-[10px] text-text-muted">All services operational</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
