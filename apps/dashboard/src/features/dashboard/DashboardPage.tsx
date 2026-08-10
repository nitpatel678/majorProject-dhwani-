import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../services/api';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Cpu, Wifi, AlertTriangle, Siren, Shield, CheckCircle2,
  Clock, Target, Bot, TrendingUp, Zap, Activity,
} from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const EVENT_COLORS: Record<string, string> = {
  SCREAM: '#ef4444', GLASS_BREAK: '#f59e0b', IMPACT_CRASH: '#f97316',
  GUNSHOT_EXPLOSION: '#dc2626', CROWD_PANIC: '#ec4899', SIREN: '#3b82f6', NORMAL: '#22c55e',
};

const STAT_ICONS: Record<string, any> = {
  'Total Devices': Cpu,
  'Active Devices': Wifi,
  "Today's Alerts": AlertTriangle,
  'Emergency': Siren,
  'Active Responders': Shield,
  'Resolved': CheckCircle2,
  'Pending': Clock,
  'False Positives': Target,
  'Avg Response': Zap,
  'AI Accuracy': Bot,
};

function StatCard({ label, value, trend }: {
  label: string; value: string | number; trend?: string;
}) {
  const Icon = STAT_ICONS[label] || Activity;
  return (
    <motion.div variants={item} className="card-hover p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-surface-500 uppercase tracking-wider mb-1.5 font-medium">{label}</p>
          <p className="text-xl font-semibold text-white font-display">{value}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <Icon size={15} className="text-surface-400" />
        </div>
      </div>
      {trend && <p className="text-[11px] text-success mt-2 flex items-center gap-1"><TrendingUp size={12} />{trend}</p>}
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-4">
      <div className="skeleton h-3 w-20 mb-3" />
      <div className="skeleton h-6 w-14" />
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: chartData } = useQuery({
    queryKey: ['daily-alerts'],
    queryFn: () => api.get('/dashboard/charts/daily-alerts').then(r => r.data),
  });

  const { data: categoryData } = useQuery({
    queryKey: ['category-distribution'],
    queryFn: () => api.get('/dashboard/charts/category-distribution').then(r => r.data),
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => api.get('/dashboard/recent-activity').then(r => r.data),
  });

  const { data: health } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.get('/dashboard/system-health').then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-xl font-semibold text-white font-display">Dashboard</h1></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const pieData = categoryData?.map((c: any) => ({
    name: c.type.replace(/_/g, ' '),
    value: c.count,
    color: EVENT_COLORS[c.type] || '#525252',
  })) || [];

  const tooltipStyle = {
    background: '#171717',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    fontSize: 12,
    color: '#fafafa',
  };

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-5">
      {/* Title */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white font-display">Dashboard</h1>
          <p className="text-sm text-surface-500">Real-time system overview</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-surface-500">Live</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Devices" value={stats?.totalDevices || 0} />
        <StatCard label="Active Devices" value={stats?.activeDevices || 0} />
        <StatCard label="Today's Alerts" value={stats?.todayAlerts || 0} />
        <StatCard label="Emergency" value={stats?.emergencyAlerts || 0} />
        <StatCard label="Active Responders" value={stats?.activeResponders || 0} />
        <StatCard label="Resolved" value={stats?.resolvedIncidents || 0} />
        <StatCard label="Pending" value={stats?.pendingIncidents || 0} />
        <StatCard label="False Positives" value={stats?.falsePositives || 0} />
        <StatCard label="Avg Response" value={`${stats?.avgResponseTime || 0}m`} />
        <StatCard label="AI Accuracy" value={`${stats?.aiAccuracy || 0}%`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Alerts */}
        <motion.div variants={item} className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-medium text-surface-400 mb-4">Alert Trends — 7 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData || []}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#525252', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#525252', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#737373' }} />
              <Area type="monotone" dataKey="count" stroke="#ffffff" fill="url(#grad)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Pie */}
        <motion.div variants={item} className="card p-5">
          <h3 className="text-sm font-medium text-surface-400 mb-4">Event Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                {pieData.map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieData.slice(0, 4).map((item: any) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-surface-400">{item.name}</span>
                </div>
                <span className="text-white font-medium font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Events */}
        <motion.div variants={item} className="card p-5">
          <h3 className="text-sm font-medium text-surface-400 mb-4">Recent Events</h3>
          <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
            {(recentActivity || []).slice(0, 8).map((event: any) => (
              <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: EVENT_COLORS[event.type] || '#525252' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">{event.type.replace(/_/g, ' ')}</p>
                  <p className="text-[11px] text-surface-600">{event.address || 'Unknown location'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-surface-400 font-mono">{(event.confidence * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-surface-600">{new Date(event.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            {(!recentActivity || recentActivity.length === 0) && (
              <div className="text-center py-10 text-surface-600 text-sm">
                <Activity size={24} className="mx-auto mb-2 opacity-30" />
                <p>No recent events</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div variants={item} className="card p-5">
          <h3 className="text-sm font-medium text-surface-400 mb-4">System Health</h3>
          <div className="space-y-3">
            {[
              { label: 'API Server', ok: health?.serverStatus === 'healthy', value: 'Operational' },
              { label: 'Database', ok: health?.database === 'connected', value: 'Connected' },
              { label: 'Socket.io', ok: health?.socketio === 'active', value: 'Active' },
              { label: 'Device Network', ok: true, value: `${health?.deviceHealth?.online || 0}/${health?.deviceHealth?.total || 0} Online` },
              { label: 'Avg Battery', ok: (health?.deviceHealth?.avgBattery || 0) > 30, value: `${health?.deviceHealth?.avgBattery || 0}%` },
              { label: 'Avg Signal', ok: (health?.deviceHealth?.avgSignal || 0) > 50, value: `${health?.deviceHealth?.avgSignal || 0}%` },
            ].map(h => (
              <div key={h.label} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${h.ok ? 'bg-success' : 'bg-danger animate-pulse'}`} />
                  <span className="text-sm text-surface-400">{h.label}</span>
                </div>
                <span className="text-sm text-white font-medium">{h.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.04]">
            <p className="text-[11px] text-surface-600">
              Uptime: {health ? Math.floor(health.uptime / 3600) + 'h ' + Math.floor((health.uptime % 3600) / 60) + 'm' : '—'}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
