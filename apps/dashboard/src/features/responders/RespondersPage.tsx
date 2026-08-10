import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Shield, Search, Phone, MapPin, Clock, Briefcase, Activity } from 'lucide-react';
import api from '../../services/api';

export default function RespondersPage() {
  const [search, setSearch] = useState('');

  const { data: responders, isLoading } = useQuery({
    queryKey: ['responders', search],
    queryFn: () => api.get('/responders', { params: { search: search || undefined } }).then(r => r.data),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white font-display">Responder Patrols</h1>
          <p className="text-sm text-surface-500">{responders?.length || 0} active field officers & emergency units</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-600" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by officer name, badge or area..."
          className="input pl-9"
        />
      </div>

      {/* Responder Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="flex gap-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <div className="skeleton h-4 w-28" />
                  <div className="skeleton h-3 w-16" />
                </div>
              </div>
              <div className="skeleton h-12 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(responders || []).map((r: any) => {
            const isAvailable = r.status === 'AVAILABLE' || r.status === 'ON_DUTY';
            return (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-hover p-5 space-y-4 flex flex-col justify-between"
              >
                {/* Officer Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-black font-bold flex items-center justify-center text-sm shrink-0">
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-white truncate">{r.name}</h3>
                    <p className="text-[10px] text-surface-500 font-mono">
                      {r.rank || 'Officer'} · Badge #{r.badge}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isAvailable ? 'bg-success pulse-success' : 'bg-surface-600'
                      }`} />
                      <span className={`text-[11px] font-medium ${
                        isAvailable ? 'text-success' : 'text-surface-500'
                      }`}>
                        {r.status}
                      </span>
                      {r.isOnline && (
                        <span className="text-[10px] text-surface-400 font-mono ml-1">· Online</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs">
                  <div>
                    <span className="text-surface-600 flex items-center gap-1 text-[10px]"><MapPin size={10} /> Zone / Area</span>
                    <p className="text-white font-medium truncate mt-0.5">{r.area || 'General Patrol'}</p>
                  </div>
                  <div>
                    <span className="text-surface-600 flex items-center gap-1 text-[10px]"><Briefcase size={10} /> Active Cases</span>
                    <p className="text-white font-mono font-medium mt-0.5">{r._count?.incidents || 0}</p>
                  </div>
                  <div>
                    <span className="text-surface-600 flex items-center gap-1 text-[10px]"><Clock size={10} /> Shift Hours</span>
                    <p className="text-white font-medium truncate mt-0.5">{r.shiftStart || '08:00'} - {r.shiftEnd || '20:00'}</p>
                  </div>
                  <div>
                    <span className="text-surface-600 flex items-center gap-1 text-[10px]"><Phone size={10} /> Direct Comms</span>
                    <p className="text-white font-mono font-medium truncate mt-0.5">{r.phone || '—'}</p>
                  </div>
                </div>

                {/* Footer Email & Last Seen */}
                <div className="flex items-center justify-between text-[10px] text-surface-600 font-mono pt-1">
                  <span className="truncate max-w-[140px]">{r.email}</span>
                  <span>{r.lastSeen ? `Active ${new Date(r.lastSeen).toLocaleTimeString()}` : 'Offline'}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {responders?.length === 0 && !isLoading && (
        <div className="card text-center py-20 text-surface-600">
          <Shield size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium text-surface-400">No field responders found</p>
          <p className="text-xs text-surface-600 mt-1">Responder accounts will be listed here once registered.</p>
        </div>
      )}
    </motion.div>
  );
}
