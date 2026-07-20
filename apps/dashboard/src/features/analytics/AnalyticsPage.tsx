import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line } from 'recharts';
import api from '../../services/api';

const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function AnalyticsPage() {
  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get('/analytics/overview').then(r => r.data),
  });

  const { data: responseTime } = useQuery({
    queryKey: ['analytics-response-time'],
    queryFn: () => api.get('/analytics/response-time').then(r => r.data),
  });

  const { data: detection } = useQuery({
    queryKey: ['analytics-detection'],
    queryFn: () => api.get('/analytics/detection').then(r => r.data),
  });

  const { data: responderStats } = useQuery({
    queryKey: ['analytics-responder'],
    queryFn: () => api.get('/analytics/responder').then(r => r.data),
  });

  const { data: monthly } = useQuery({
    queryKey: ['analytics-monthly'],
    queryFn: () => api.get('/analytics/monthly-trends').then(r => r.data),
  });

  const EVENT_COLORS: Record<string, string> = {
    SCREAM: '#FF5252', GLASS_BREAK: '#FFB74D', IMPACT_CRASH: '#FF7043',
    GUNSHOT_EXPLOSION: '#F44336', CROWD_PANIC: '#E91E63', SIREN: '#42A5F5', NORMAL: '#66BB6A',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Analytics</h1>
        <p className="text-sm text-text-secondary">Performance metrics and trends</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Events', value: overview?.totalEvents || 0, color: '#42A5F5' },
          { label: 'Incidents', value: overview?.totalIncidents || 0, color: '#FFB74D' },
          { label: 'Resolved', value: overview?.resolved || 0, color: '#00E676' },
          { label: 'False Alarms', value: overview?.falseAlarms || 0, color: '#78909C' },
          { label: 'AI Accuracy', value: `${overview?.accuracy || 0}%`, color: '#A78BFA' },
          { label: 'Resolution Rate', value: `${overview?.resolutionRate || 0}%`, color: '#00D9FF' },
        ].map(stat => (
          <motion.div key={stat.label} variants={itemVariants} className="glass-card p-4">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold font-display mt-1" style={{ color: stat.color }}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Monthly Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={monthly || []}>
              <defs>
                <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D9FF" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00D9FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: '#5A5A72', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5A5A72', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1A1A25', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#00D9FF" fill="url(#monthlyGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Response Time */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Response Time (minutes)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={responseTime || []}>
              <XAxis dataKey="date" tick={{ fill: '#5A5A72', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5A5A72', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1A1A25', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="responseMinutes" stroke="#A78BFA" strokeWidth={2} dot={{ fill: '#A78BFA', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Detection by Category */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Detection by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={detection?.byCategory || []} layout="vertical">
              <XAxis type="number" tick={{ fill: '#5A5A72', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="type" tick={{ fill: '#8B8BA3', fontSize: 10 }} axisLine={false} tickLine={false} width={120}
                tickFormatter={(v: string) => v.replace(/_/g, ' ')} />
              <Tooltip contentStyle={{ background: '#1A1A25', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
                {(detection?.byCategory || []).map((entry: any, index: number) => (
                  <Cell key={index} fill={EVENT_COLORS[entry.type] || '#8B8BA3'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Responder Performance */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Responder Performance</h3>
          <div className="space-y-3">
            {(responderStats || []).map((r: any) => (
              <div key={r.name} className="p-3 rounded-xl bg-bg-elevated/50 flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary-light">
                  {r.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-success">{r.rate}%</span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-text-muted mt-0.5">
                    <span>{r.resolved}/{r.totalCases} resolved</span>
                    <span>Avg {r.avgResponseTime}m</span>
                    <span>{r.area}</span>
                  </div>
                </div>
              </div>
            ))}
            {(!responderStats || responderStats.length === 0) && (
              <p className="text-text-muted text-sm text-center py-6">No responder data available</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
