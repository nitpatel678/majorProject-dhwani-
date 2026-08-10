import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line } from 'recharts';
import { BarChart3, TrendingUp, Clock, Bot, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
import api from '../../services/api';

const tooltipStyle = {
  background: '#171717',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  fontSize: 12,
  color: '#fafafa',
};

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white font-display">System Analytics</h1>
        <p className="text-sm text-surface-500">Longitudinal threat trends & officer performance metrics</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Events', value: overview?.totalEvents || 0 },
          { label: 'Incidents', value: overview?.totalIncidents || 0 },
          { label: 'Resolved', value: overview?.resolved || 0 },
          { label: 'False Alarms', value: overview?.falseAlarms || 0 },
          { label: 'AI Accuracy', value: `${overview?.accuracy || 0}%` },
          { label: 'Resolution Rate', value: `${overview?.resolutionRate || 0}%` },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <p className="text-[10px] text-surface-500 uppercase tracking-wider font-mono">{stat.label}</p>
            <p className="text-lg font-semibold text-white font-mono mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trends */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-surface-400 mb-4">Monthly Acoustic Event Trends</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly || []}>
              <defs>
                <linearGradient id="monthlyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke="#ffffff" fill="url(#monthlyGrad)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Response Time */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-surface-400 mb-4">Dispatch Response Time (Minutes)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={responseTime || []}>
              <XAxis dataKey="date" tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="responseMinutes" stroke="#ffffff" strokeWidth={1.5} dot={{ fill: '#ffffff', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Detection by Category */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-surface-400 mb-4">Detections by Classification</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={detection?.byCategory || []} layout="vertical">
              <XAxis type="number" tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="type"
                tick={{ fill: '#737373', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={120}
                tickFormatter={(v: string) => v.replace(/_/g, ' ')}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12} fill="#525252" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Patrol Performance */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-surface-400 mb-4">Officer Resolution Performance</h3>
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar">
            {(responderStats || []).map((r: any) => (
              <div key={r.name} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white text-black font-bold flex items-center justify-center text-xs shrink-0">
                  {r.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-white truncate">{r.name}</span>
                    <span className="text-success font-mono font-semibold">{r.rate}%</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-surface-500 font-mono">
                    <span>{r.resolved}/{r.totalCases} resolved</span>
                    <span>Avg {r.avgResponseTime}m</span>
                    <span>{r.area}</span>
                  </div>
                </div>
              </div>
            ))}
            {(!responderStats || responderStats.length === 0) && (
              <div className="text-center py-10 text-surface-600 text-xs">
                <BarChart3 size={24} className="mx-auto mb-2 opacity-30" />
                <p>No responder analytics available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
