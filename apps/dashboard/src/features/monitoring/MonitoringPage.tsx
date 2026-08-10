import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Radio, AlertTriangle, Shield, Volume2, Flame, UserX, Car, Skull, Siren, Filter, Activity } from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

const EVENT_ICONS: Record<string, any> = {
  SCREAM: UserX,
  GLASS_BREAK: Flame,
  IMPACT_CRASH: Car,
  GUNSHOT_EXPLOSION: Skull,
  CROWD_PANIC: AlertTriangle,
  SIREN: Siren,
  NORMAL: Volume2,
};

const EVENT_BADGES: Record<string, string> = {
  SCREAM: 'text-danger bg-danger/10 border-danger/20',
  GLASS_BREAK: 'text-warning bg-warning/10 border-warning/20',
  IMPACT_CRASH: 'text-warning bg-warning/10 border-warning/20',
  GUNSHOT_EXPLOSION: 'text-danger bg-danger/10 border-danger/20',
  CROWD_PANIC: 'text-danger bg-danger/10 border-danger/20',
  SIREN: 'text-info bg-info/10 border-info/20',
  NORMAL: 'text-success bg-success/10 border-success/20',
};

export default function MonitoringPage() {
  const [filter, setFilter] = useState('all');
  const [liveEvents, setLiveEvents] = useState<any[]>([]);

  const { data } = useQuery({
    queryKey: ['events', filter],
    queryFn: () => api.get('/events', { params: { type: filter === 'all' ? undefined : filter, limit: 50 } }).then(r => r.data),
    refetchInterval: 10000,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewEvent = (eventData: any) => {
      setLiveEvents(prev => [eventData.event || eventData, ...prev].slice(0, 50));
    };
    socket.on('new_event', handleNewEvent);
    return () => { socket.off('new_event', handleNewEvent); };
  }, []);

  const allEvents = [...liveEvents, ...(data?.events || [])];
  const uniqueEvents = allEvents.filter((e, i, arr) => arr.findIndex(a => a.id === e.id) === i);
  const filters = ['all', 'SCREAM', 'GLASS_BREAK', 'IMPACT_CRASH', 'GUNSHOT_EXPLOSION', 'CROWD_PANIC', 'SIREN'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white font-display flex items-center gap-2.5">
            Live Monitoring
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
          </h1>
          <p className="text-sm text-surface-500">Real-time acoustic event stream</p>
        </div>
        <div className="text-right flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-right">
            <span className="text-sm font-semibold text-white font-mono">{uniqueEvents.length}</span>
            <span className="text-[10px] text-surface-500 uppercase tracking-wider block">Total Events</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <Filter size={14} className="text-surface-600 shrink-0 mr-1" />
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              filter === f
                ? 'bg-white text-black font-semibold shadow-glow-white'
                : 'bg-white/[0.03] text-surface-400 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {f === 'all' ? 'All Events' : f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Event List */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-2.5">
          {uniqueEvents.map((event: any, index: number) => {
            const Icon = EVENT_ICONS[event.type] || Volume2;
            const badgeStyle = EVENT_BADGES[event.type] || 'text-surface-400 bg-white/[0.05] border-white/[0.06]';
            const isCritical = event.type === 'GUNSHOT_EXPLOSION' || event.type === 'CROWD_PANIC' || event.incident?.priority === 'CRITICAL';

            return (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: index * 0.02 }}
                className={`card-hover p-4 flex items-center gap-4 ${
                  isCritical ? 'border-l-2 border-l-danger' : ''
                }`}
              >
                {/* Icon Container */}
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-white" />
                </div>

                {/* Event Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeStyle}`}>
                      {event.type.replace(/_/g, ' ')}
                    </span>
                    {isCritical && (
                      <span className="badge-danger text-[10px] uppercase font-bold tracking-wider">CRITICAL</span>
                    )}
                  </div>
                  <p className="text-xs text-surface-400 truncate">{event.address || 'Location unknown'}</p>
                  <p className="text-[10px] text-surface-600 mt-0.5 font-mono">
                    Device: {event.device?.name || 'Sens-01'} · {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Confidence */}
                <div className="text-center shrink-0 px-3">
                  <p className="text-base font-semibold font-mono text-white">
                    {(event.confidence * 100).toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-surface-600 uppercase tracking-wider">Confidence</p>
                </div>

                {/* Status */}
                <div className="shrink-0">
                  <span className={`badge text-[10px] font-semibold uppercase ${
                    event.incident?.status === 'RESOLVED' ? 'badge-success' :
                    event.incident?.status === 'ASSIGNED' ? 'badge-warning' :
                    event.incident?.status === 'ESCALATED' ? 'badge-danger' : 'badge-neutral'
                  }`}>
                    {event.incident?.status || 'OPEN'}
                  </span>
                </div>

                {/* Responder */}
                <div className="text-right shrink-0 min-w-[110px] hidden sm:block">
                  <p className="text-xs text-surface-300 font-medium">
                    {event.incident?.responder ? event.incident.responder.name : 'Unassigned'}
                  </p>
                  <p className="text-[10px] text-surface-600">Responder</p>
                </div>
              </motion.div>
            );
          })}

          {uniqueEvents.length === 0 && (
            <div className="card text-center py-20 text-surface-600">
              <Radio size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium text-surface-400">No alerts detected</p>
              <p className="text-xs text-surface-600 mt-1 max-w-sm mx-auto">
                System is actively listening. Incoming acoustic detections will show here instantly.
              </p>
            </div>
          )}
        </div>
      </AnimatePresence>
    </motion.div>
  );
}
