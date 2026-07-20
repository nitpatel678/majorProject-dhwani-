import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

const EVENT_COLORS: Record<string, string> = {
  SCREAM: '#FF5252', GLASS_BREAK: '#FFB74D', IMPACT_CRASH: '#FF7043',
  GUNSHOT_EXPLOSION: '#F44336', CROWD_PANIC: '#E91E63', SIREN: '#42A5F5', NORMAL: '#66BB6A',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#66BB6A', MEDIUM: '#FFB74D', HIGH: '#FF7043', CRITICAL: '#F44336',
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-3">
            Live Monitoring
            <span className="w-3 h-3 rounded-full bg-danger animate-pulse" />
          </h1>
          <p className="text-sm text-text-secondary">Real-time incoming alerts</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">{uniqueEvents.length}</p>
          <p className="text-xs text-text-muted">Total Events</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f
                ? 'bg-primary/20 text-primary-light border border-primary/30'
                : 'bg-bg-elevated text-text-muted border border-border hover:border-border-hover'
            }`}
          >
            {f === 'all' ? 'All Events' : f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Alert Cards */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {uniqueEvents.map((event: any, index: number) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.03 }}
              className={`glass-card-hover p-5 flex items-center gap-5 ${
                event.type === 'GUNSHOT_EXPLOSION' || event.type === 'CROWD_PANIC' ? 'border-l-2 border-l-danger' : ''
              }`}
            >
              {/* Type Indicator */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: `${EVENT_COLORS[event.type]}15`, border: `1px solid ${EVENT_COLORS[event.type]}30` }}
              >
                {event.type === 'SCREAM' ? '😱' : event.type === 'GLASS_BREAK' ? '🪟' : event.type === 'IMPACT_CRASH' ? '💥' :
                 event.type === 'GUNSHOT_EXPLOSION' ? '🔫' : event.type === 'CROWD_PANIC' ? '👥' : event.type === 'SIREN' ? '🚨' : '🔊'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm" style={{ color: EVENT_COLORS[event.type] }}>
                    {event.type.replace(/_/g, ' ')}
                  </span>
                  {event.incident?.priority === 'CRITICAL' && (
                    <span className="badge-danger text-[10px]">CRITICAL</span>
                  )}
                </div>
                <p className="text-xs text-text-muted truncate">{event.address || 'Location unknown'}</p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Device: {event.device?.name || 'N/A'} · {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Confidence */}
              <div className="text-center shrink-0">
                <p className="text-lg font-bold font-display" style={{ color: EVENT_COLORS[event.type] }}>
                  {(event.confidence * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-text-muted">Confidence</p>
              </div>

              {/* Status */}
              <div className="shrink-0">
                <span className={`badge text-[10px] ${
                  event.incident?.status === 'RESOLVED' ? 'badge-success' :
                  event.incident?.status === 'ASSIGNED' ? 'badge-warning' :
                  event.incident?.status === 'ESCALATED' ? 'badge-danger' : 'badge-info'
                }`}>
                  {event.incident?.status || 'OPEN'}
                </span>
              </div>

              {/* Responder */}
              <div className="text-right shrink-0 min-w-[100px]">
                {event.incident?.responder ? (
                  <p className="text-xs text-text-secondary">{event.incident.responder.name}</p>
                ) : (
                  <p className="text-xs text-text-muted">Unassigned</p>
                )}
              </div>
            </motion.div>
          ))}

          {uniqueEvents.length === 0 && (
            <div className="text-center py-20 text-text-muted">
              <p className="text-5xl mb-4">📡</p>
              <p className="text-lg font-medium">No alerts detected</p>
              <p className="text-sm mt-1">The system is actively monitoring. Alerts will appear here in real-time.</p>
            </div>
          )}
        </div>
      </AnimatePresence>
    </motion.div>
  );
}
