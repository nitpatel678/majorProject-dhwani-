import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const EVENT_COLORS: Record<string, string> = {
  SCREAM: '#FF5252', GLASS_BREAK: '#FFB74D', IMPACT_CRASH: '#FF7043',
  GUNSHOT_EXPLOSION: '#F44336', CROWD_PANIC: '#E91E63', SIREN: '#42A5F5', NORMAL: '#66BB6A',
};

function StatCard({ label, value, icon, trend, color }: {
  label: string; value: string | number; icon: string; trend?: string; color?: string;
}) {
  return (
    <motion.div variants={itemVariants} className="glass-card-hover p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold font-display" style={{ color: color || '#F0F0F5' }}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center text-lg">
          {icon}
        </div>
      </div>
      {trend && <p className="text-xs text-success mt-2">{trend}</p>}
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="h-3 w-20 bg-bg-elevated rounded mb-3" />
      <div className="h-7 w-16 bg-bg-elevated rounded" />
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
        <div><h1 className="text-2xl font-bold font-display">Dashboard</h1></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const pieData = categoryData?.map((c: any) => ({ name: c.type.replace(/_/g, ' '), value: c.count, color: EVENT_COLORS[c.type] || '#8B8BA3' })) || [];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Title */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Dashboard</h1>
          <p className="text-sm text-text-secondary">Real-time system overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-text-muted">Live</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Devices" value={stats?.totalDevices || 0} icon="📡" color="#42A5F5" />
        <StatCard label="Active Devices" value={stats?.activeDevices || 0} icon="✅" color="#00E676" />
        <StatCard label="Today's Alerts" value={stats?.todayAlerts || 0} icon="🚨" color="#FFB74D" />
        <StatCard label="Emergency" value={stats?.emergencyAlerts || 0} icon="⚠️" color="#FF5252" />
        <StatCard label="Active Responders" value={stats?.activeResponders || 0} icon="👮" color="#A78BFA" />
        <StatCard label="Resolved" value={stats?.resolvedIncidents || 0} icon="✔️" color="#00E676" />
        <StatCard label="Pending" value={stats?.pendingIncidents || 0} icon="⏳" color="#FFB74D" />
        <StatCard label="False Positives" value={stats?.falsePositives || 0} icon="❌" color="#78909C" />
        <StatCard label="Avg Response" value={`${stats?.avgResponseTime || 0}m`} icon="⏱️" color="#00D9FF" />
        <StatCard label="AI Accuracy" value={`${stats?.aiAccuracy || 0}%`} icon="🤖" color="#A78BFA" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Alerts Chart */}
        <motion.div variants={itemVariants} className="glass-card p-6 lg:col-span-2">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Alert Trends (7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData || []}>
              <defs>
                <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6C5CE7" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6C5CE7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#5A5A72', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5A5A72', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1A1A25', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#8B8BA3' }}
              />
              <Area type="monotone" dataKey="count" stroke="#6C5CE7" fill="url(#alertGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Distribution */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Event Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1A1A25', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {pieData.slice(0, 4).map((item: any) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-text-secondary">{item.name}</span>
                </div>
                <span className="text-text-primary font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Recent Events</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {(recentActivity || []).slice(0, 8).map((event: any) => (
              <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated/50 hover:bg-bg-hover transition-all">
                <div className="w-2 h-2 rounded-full" style={{ background: EVENT_COLORS[event.type] || '#8B8BA3' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.type.replace(/_/g, ' ')}</p>
                  <p className="text-[11px] text-text-muted">{event.address || 'Unknown'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary">{(event.confidence * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-text-muted">{new Date(event.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            {(!recentActivity || recentActivity.length === 0) && (
              <div className="text-center py-8 text-text-muted text-sm">
                <p className="text-3xl mb-2">📭</p>
                <p>No recent events</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">System Health</h3>
          <div className="space-y-4">
            {[
              { label: 'API Server', status: health?.serverStatus === 'healthy', value: 'Operational' },
              { label: 'Database', status: health?.database === 'connected', value: 'Connected' },
              { label: 'Socket.io', status: health?.socketio === 'active', value: 'Active' },
              { label: 'Device Network', status: true, value: `${health?.deviceHealth?.online || 0}/${health?.deviceHealth?.total || 0} Online` },
              { label: 'Avg Battery', status: (health?.deviceHealth?.avgBattery || 0) > 30, value: `${health?.deviceHealth?.avgBattery || 0}%` },
              { label: 'Avg Signal', status: (health?.deviceHealth?.avgSignal || 0) > 50, value: `${health?.deviceHealth?.avgSignal || 0}%` },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.status ? 'bg-success' : 'bg-danger'} ${item.status ? '' : 'animate-pulse'}`} />
                  <span className="text-sm text-text-secondary">{item.label}</span>
                </div>
                <span className="text-sm text-text-primary font-medium">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[11px] text-text-muted">
              Uptime: {health ? Math.floor(health.uptime / 3600) + 'h ' + Math.floor((health.uptime % 3600) / 60) + 'm' : '—'}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
