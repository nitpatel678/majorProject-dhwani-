import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Cpu, Plus, Search, RotateCw, Power, Battery, Wifi, MapPin, X, Activity } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function DevicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery({
    queryKey: ['devices', search, statusFilter],
    queryFn: () => api.get('/devices', { params: { search: search || undefined, status: statusFilter || undefined } }).then(r => r.data),
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => api.post(`/devices/${id}/toggle`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); toast.success('Device status updated'); },
  });

  const restartMut = useMutation({
    mutationFn: (id: string) => api.post(`/devices/${id}/restart`),
    onSuccess: () => toast.success('Restart command dispatched'),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/devices', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); setShowForm(false); toast.success('Device registered'); },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMut.mutate({
      name: fd.get('name'), serialNumber: fd.get('serialNumber'),
      latitude: parseFloat(fd.get('latitude') as string), longitude: parseFloat(fd.get('longitude') as string),
      address: fd.get('address'),
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white font-display">Device Management</h1>
          <p className="text-sm text-surface-500">{devices?.length || 0} acoustic hardware nodes active</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Register Device
        </motion.button>
      </div>

      {/* New Device Modal/Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleCreate}
            className="card p-6 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="col-span-full flex items-center justify-between border-b border-white/[0.06] pb-3 mb-1">
              <h3 className="text-sm font-semibold text-white">Register New Hardware Node</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-surface-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <input name="name" placeholder="Device Name (e.g. Node-North-01)" className="input" required />
            <input name="serialNumber" placeholder="Serial (DHWN-ESP32-XXX)" className="input font-mono text-xs" required />
            <input name="address" placeholder="Location Address" className="input" />
            <input name="latitude" type="number" step="any" placeholder="Latitude (e.g. 28.6139)" className="input" required />
            <input name="longitude" type="number" step="any" placeholder="Longitude (e.g. 77.2090)" className="input" required />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-xs flex-1 py-3">Submit Registration</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs py-3">Cancel</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Toolbar / Search */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, serial or address..."
            className="input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input w-auto min-w-[150px] bg-[#171717]"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="OFFLINE">Offline</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {/* Devices Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-10 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(devices || []).map((device: any) => {
            const isActive = device.status === 'ACTIVE';
            return (
              <motion.div
                key={device.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-hover p-5 space-y-4 flex flex-col justify-between"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <Cpu size={16} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-white">{device.name}</h3>
                        <p className="text-[10px] text-surface-500 font-mono">{device.serialNumber}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isActive ? 'text-success bg-success/10 border-success/20' : 'text-surface-500 bg-white/[0.03] border-white/[0.06]'
                    }`}>
                      {device.status}
                    </span>
                  </div>

                  <p className="text-xs text-surface-400 flex items-center gap-1 mt-3">
                    <MapPin size={12} className="text-surface-600 shrink-0" />
                    <span className="truncate">{device.address || 'Location unmapped'}</span>
                  </p>
                </div>

                {/* Battery & Signal Telemetry */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-surface-500 mb-1">
                      <span className="flex items-center gap-1"><Battery size={11} /> Power</span>
                      <span className="font-mono text-white">{device.battery || 0}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${device.battery || 0}%`,
                          background: (device.battery || 0) > 50 ? '#ffffff' : (device.battery || 0) > 20 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-surface-500 mb-1">
                      <span className="flex items-center gap-1"><Wifi size={11} /> Signal</span>
                      <span className="font-mono text-white">{device.signalStrength || 0}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full bg-white transition-all" style={{ width: `${device.signalStrength || 0}%` }} />
                    </div>
                  </div>
                </div>

                {/* Footer details */}
                <div className="flex items-center justify-between text-[10px] text-surface-600 font-mono">
                  <span>FW: {device.firmwareVersion || '1.0'}</span>
                  <span>{device._count?.events || 0} events</span>
                  <span>{device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'Never'}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => toggleMut.mutate(device.id)}
                    className="btn-secondary text-xs flex-1 py-2 flex items-center justify-center gap-1.5"
                  >
                    <Power size={13} />
                    {isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => restartMut.mutate(device.id)}
                    className="btn-ghost text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <RotateCw size={13} />
                    Restart
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {devices?.length === 0 && !isLoading && (
        <div className="card text-center py-20 text-surface-600">
          <Activity size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium text-surface-400">No hardware nodes found</p>
          <p className="text-xs text-surface-600 mt-1">Register a hardware node to begin telemetry tracking.</p>
        </div>
      )}
    </motion.div>
  );
}
