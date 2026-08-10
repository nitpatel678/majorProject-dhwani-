import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, X, ChevronRight, Filter, UserCheck, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

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
      toast.success('Incident marked resolved');
    },
  });

  const statuses = ['', 'OPEN', 'ASSIGNED', 'ONGOING', 'RESOLVED', 'FALSE_ALARM', 'ESCALATED'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-1xl text-xl font-semibold text-white font-display">Incident Management</h1>
          <p className="text-sm text-surface-500">{incidents?.length || 0} security & dispatch incidents</p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter size={14} className="text-surface-600 mr-1 shrink-0" />
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === s
                ? 'bg-white text-black font-semibold shadow-glow-white'
                : 'bg-white/[0.03] text-surface-400 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {s || 'All Statuses'}
            {s && (
              <span className="ml-1.5 opacity-50 font-mono">
                ({incidents?.filter((i: any) => i.status === s).length || 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Incident List */}
      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 flex gap-4">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-48" />
                <div className="skeleton h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence>
            {(incidents || []).map((incident: any) => {
              const isCritical = incident.priority === 'CRITICAL';
              return (
                <motion.div
                  key={incident.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  onClick={() => setSelectedIncident(incident)}
                  className={`card-hover p-4 cursor-pointer flex items-center gap-4 ${
                    isCritical ? 'border-l-2 border-l-danger' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isCritical ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-white/[0.04] border-white/[0.06] text-white'
                  }`}>
                    {isCritical ? <ShieldAlert size={18} /> : <AlertCircle size={18} />}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{incident.description || 'Dispatched incident'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        incident.status === 'RESOLVED' ? 'bg-success/10 text-success border border-success/20' :
                        incident.status === 'ESCALATED' ? 'bg-danger/10 text-danger border border-danger/20' :
                        'bg-white/[0.04] text-surface-300 border border-white/[0.06]'
                      }`}>
                        {incident.status}
                      </span>
                      <span className="text-[11px] text-surface-500 uppercase tracking-wider font-mono">
                        {incident.event?.type?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-surface-600">
                        · {new Date(incident.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Responder Assignment Dropdown or Name */}
                  <div className="text-right shrink-0">
                    {incident.responder ? (
                      <div className="flex items-center gap-1.5 text-xs text-surface-300 font-medium">
                        <UserCheck size={14} className="text-success" />
                        <span>{incident.responder.name}</span>
                      </div>
                    ) : (
                      <select
                        onClick={e => e.stopPropagation()}
                        onChange={e => assignMut.mutate({ id: incident.id, responderId: e.target.value })}
                        className="input text-xs py-1 px-2.5 max-w-[150px] bg-[#171717]"
                        defaultValue=""
                      >
                        <option value="" disabled>Assign Patrol</option>
                        {(responders || []).map((r: any) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <ChevronRight size={16} className="text-surface-600 shrink-0" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Incident Details Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedIncident(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="card p-7 w-full max-w-lg shadow-elevated"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-5">
                <div>
                  <h2 className="text-base font-semibold text-white">Incident Details</h2>
                  <p className="text-xs text-surface-500 font-mono">ID: {selectedIncident.id}</p>
                </div>
                <button onClick={() => setSelectedIncident(null)} className="text-surface-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <span className="badge-neutral text-xs">{selectedIncident.status}</span>
                  <span className="badge-danger text-xs">{selectedIncident.priority} PRIORITY</span>
                </div>

                <p className="text-sm text-surface-300 leading-relaxed">{selectedIncident.description}</p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-surface-500">Event Type</p>
                    <p className="text-white font-medium mt-0.5">{selectedIncident.event?.type?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-surface-500">Detection Confidence</p>
                    <p className="text-white font-mono font-medium mt-0.5">{((selectedIncident.event?.confidence || 0) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-surface-500">Location</p>
                    <p className="text-white font-medium truncate mt-0.5">{selectedIncident.event?.address || '—'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-surface-500">Assigned Patrol</p>
                    <p className="text-white font-medium mt-0.5">{selectedIncident.responder?.name || 'Unassigned'}</p>
                  </div>
                </div>

                {selectedIncident.status !== 'RESOLVED' && selectedIncident.status !== 'FALSE_ALARM' && (
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => resolveMut.mutate(selectedIncident.id)}
                      className="btn-primary text-sm flex-1 flex items-center justify-center gap-2 py-3"
                    >
                      <CheckCircle2 size={16} />
                      Mark Incident Resolved
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
