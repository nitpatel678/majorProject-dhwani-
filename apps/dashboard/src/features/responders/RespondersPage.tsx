import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import api from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#00E676', BUSY: '#FFB74D', OFFLINE: '#78909C', ON_DUTY: '#42A5F5',
};

export default function RespondersPage() {
  const [search, setSearch] = useState('');

  const { data: responders, isLoading } = useQuery({
    queryKey: ['responders', search],
    queryFn: () => api.get('/responders', { params: { search: search || undefined } }).then(r => r.data),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Responder Management</h1>
          <p className="text-sm text-text-secondary">{responders?.length || 0} registered responders</p>
        </div>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search responders..." className="glass-input max-w-sm" />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse space-y-3">
              <div className="h-12 w-12 bg-bg-elevated rounded-xl" />
              <div className="h-4 w-32 bg-bg-elevated rounded" />
              <div className="h-3 w-20 bg-bg-elevated rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(responders || []).map((r: any) => (
            <motion.div key={r.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card-hover p-5 space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-bold text-white shrink-0">
                  {r.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{r.name}</h3>
                  <p className="text-[11px] text-text-muted">{r.rank} · {r.badge}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[r.status] }} />
                    <span className="text-[11px]" style={{ color: STATUS_COLORS[r.status] }}>{r.status}</span>
                    {r.isOnline && <span className="text-[10px] text-success ml-1">● Online</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-text-muted">Area</p>
                  <p className="text-text-primary font-medium">{r.area || '—'}</p>
                </div>
                <div>
                  <p className="text-text-muted">Cases</p>
                  <p className="text-text-primary font-medium">{r._count?.incidents || 0}</p>
                </div>
                <div>
                  <p className="text-text-muted">Shift</p>
                  <p className="text-text-primary font-medium">{r.shiftStart || '—'} — {r.shiftEnd || '—'}</p>
                </div>
                <div>
                  <p className="text-text-muted">Phone</p>
                  <p className="text-text-primary font-medium truncate">{r.phone || '—'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-text-muted pt-2 border-t border-border">
                <span>{r.email}</span>
                <span>{r.lastSeen ? `Seen ${new Date(r.lastSeen).toLocaleTimeString()}` : 'Never'}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
