import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#42A5F5', ASSIGNED: '#FFB74D', ONGOING: '#AB47BC', RESOLVED: '#66BB6A',
  FALSE_ALARM: '#78909C', ESCALATED: '#F44336',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#66BB6A', MEDIUM: '#FFB74D', HIGH: '#FF7043', CRITICAL: '#F44336',
};

export default function IncidentsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents', statusFilter],
    queryFn: () => api.get('/incidents', { params: { status: statusFilter || undefined } }).then(r => r.data),
  });

  const { data: responders } = useQuery({
    queryKey: ['responders-list'],
    queryFn: () => api.get('/responders').then(r => r.data),
  });

  const assignMut = useMutation({
    mutationFn: ({ id, responderId }: { id: string; responderId: string }) =>
      api.post(`/incidents/${id}/assign`, { responderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Responder assigned');
    },
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => api.post(`/incidents/${id}/resolve`, { description: 'Resolved from dashboard' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setSelectedIncident(null);
      toast.success('Incident resolved');
    },
  });

  const statuses = ['', 'OPEN', 'ASSIGNED', 'ONGOING', 'RESOLVED', 'FALSE_ALARM', 'ESCALATED'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Incident Management</h1>
        <p className="text-sm text-text-secondary">{incidents?.length || 0} total incidents</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === s
                ? 'bg-primary/20 text-primary-light border border-primary/30'
                : 'bg-bg-elevated text-text-muted border border-border hover:border-border-hover'
            }`}
          >
            {s || 'All'}
            {s && <span className="ml-1 opacity-50">({incidents?.filter((i: any) => i.status === s).length || 0})</span>}
          </button>
        ))}
      </div>

      {/* Incident List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse flex gap-4">
              <div className="w-12 h-12 bg-bg-elevated rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-bg-elevated rounded" />
                <div className="h-3 w-32 bg-bg-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {(incidents || []).map((incident: any) => (
              <motion.div key={incident.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedIncident(incident)}
                className="glass-card-hover p-5 cursor-pointer flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${PRIORITY_COLORS[incident.priority]}15`, border: `1px solid ${PRIORITY_COLORS[incident.priority]}30` }}
                >
                  <span className="text-lg">{incident.priority === 'CRITICAL' ? '🔴' : incident.priority === 'HIGH' ? '🟠' : '🟡'}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{incident.description || 'No description'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge text-[10px]" style={{ background: `${STATUS_COLORS[incident.status]}15`, color: STATUS_COLORS[incident.status], borderColor: `${STATUS_COLORS[incident.status]}30` }}>
                      {incident.status}
                    </span>
                    <span className="text-[10px] text-text-muted">{incident.event?.type?.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-text-muted">· {new Date(incident.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {incident.responder ? (
                    <p className="text-xs text-text-secondary">{incident.responder.name}</p>
                  ) : (
                    <select
                      onClick={e => e.stopPropagation()}
                      onChange={e => assignMut.mutate({ id: incident.id, responderId: e.target.value })}
                      className="glass-input text-xs py-1 px-2 max-w-[140px]"
                      defaultValue=""
                    >
                      <option value="" disabled>Assign</option>
                      {(responders || []).map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedIncident(null)}
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="glass-card p-8 w-full max-w-lg max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Incident Details</h2>
                <button onClick={() => setSelectedIncident(null)} className="text-text-muted hover:text-text-primary text-xl">✕</button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <span className="badge text-xs" style={{ background: `${STATUS_COLORS[selectedIncident.status]}15`, color: STATUS_COLORS[selectedIncident.status] }}>
                    {selectedIncident.status}
                  </span>
                  <span className="badge text-xs" style={{ background: `${PRIORITY_COLORS[selectedIncident.priority]}15`, color: PRIORITY_COLORS[selectedIncident.priority] }}>
                    {selectedIncident.priority}
                  </span>
                </div>

                <p className="text-sm text-text-secondary">{selectedIncident.description}</p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-bg-elevated">
                    <p className="text-text-muted">Event Type</p>
                    <p className="text-text-primary font-medium">{selectedIncident.event?.type?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-bg-elevated">
                    <p className="text-text-muted">Confidence</p>
                    <p className="text-text-primary font-medium">{((selectedIncident.event?.confidence || 0) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-bg-elevated">
                    <p className="text-text-muted">Location</p>
                    <p className="text-text-primary font-medium truncate">{selectedIncident.event?.address || '—'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-bg-elevated">
                    <p className="text-text-muted">Responder</p>
                    <p className="text-text-primary font-medium">{selectedIncident.responder?.name || 'Unassigned'}</p>
                  </div>
                </div>

                {selectedIncident.status !== 'RESOLVED' && selectedIncident.status !== 'FALSE_ALARM' && (
                  <div className="flex gap-2 pt-4">
                    <button onClick={() => resolveMut.mutate(selectedIncident.id)} className="btn-primary text-sm flex-1">
                      ✓ Resolve
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
