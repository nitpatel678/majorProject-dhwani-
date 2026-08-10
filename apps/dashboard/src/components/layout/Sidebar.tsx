import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Radio,
  Cpu,
  Shield,
  AlertTriangle,
  Mic,
  Map,
  BarChart3,
  Settings,
  Activity,
} from 'lucide-react';

const mainNav = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/monitoring', label: 'Live Monitor', icon: Radio, live: true },
  { path: '/devices', label: 'Devices', icon: Cpu },
  { path: '/responders', label: 'Responders', icon: Shield },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/audio-test', label: 'AI Audio Lab', icon: Mic },
];

const insightNav = [
  { path: '/map', label: 'Map View', icon: Map },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const renderLink = (item: typeof mainNav[0] & { live?: boolean }) => (
    <NavLink key={item.path} to={item.path} end={item.path === '/'}>
      {() => {
        const active = isActive(item.path);
        const Icon = item.icon;
        return (
          <motion.div
            className={`sidebar-link relative ${active ? 'active' : ''}`}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Active indicator bar */}
            {active && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
            <span>{item.label}</span>
            {item.live && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
            )}
          </motion.div>
        );
      }}
    </NavLink>
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-black border-r border-white/[0.06] flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
            <span className="text-black text-sm font-bold font-display">D</span>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-white tracking-tight font-display">
              DhwaniAI
            </h1>
            <p className="text-[10px] text-surface-600 uppercase tracking-[0.15em]">
              Command Center
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] text-surface-600 uppercase tracking-[0.15em] font-medium">
          Main Menu
        </p>
        {mainNav.map(renderLink)}

        <p className="px-3 py-2 mt-5 text-[10px] text-surface-600 uppercase tracking-[0.15em] font-medium">
          Insights
        </p>
        {insightNav.map(renderLink)}
      </nav>

      {/* Status Footer */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02]">
          <div className="relative">
            <Activity size={14} className="text-success" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-success pulse-success" />
          </div>
          <div>
            <p className="text-xs font-medium text-surface-300">System Online</p>
            <p className="text-[10px] text-surface-600">All services active</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
