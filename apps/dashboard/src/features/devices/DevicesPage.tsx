import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#00E676', OFFLINE: '#78909C', DISABLED: '#FFB74D', MAINTENANCE: '#42A5F5',
};

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); toast.success('Device toggled'); },
  });

  const restartMut = useMutation({
    mutationFn: (id: string) => api.post(`/devices/${id}/restart`),
    onSuccess: () => toast.success('Restart command sent'),
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Device Management</h1>
          <p className="text-sm text-text-secondary">{devices?.length || 0} devices registered</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          + Register Device
        </button>
      </div>

      {/* New Device Form */}
      {showForm && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleCreate}
          className="glass-card p-6 grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          <input name="name" placeholder="Device Name" className="glass-input" required />
          <input name="serialNumber" placeholder="Serial Number (DHWN-ESP32-XXX)" className="glass-input" required />
          <input name="latitude" type="number" step="any" placeholder="Latitude" className="glass-input" required />
          <input name="longitude" type="number" step="any" placeholder="Longitude" className="glass-input" required />
          <input name="address" placeholder="Address / Location" className="glass-input col-span-2" />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm flex-1">Register</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </motion.form>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search devices..." className="glass-input max-w-xs" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-input max-w-[180px]">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="OFFLINE">Offline</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {/* Device Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse space-y-3">
              <div className="h-4 w-32 bg-bg-elevated rounded" />
              <div className="h-3 w-20 bg-bg-elevated rounded" />
              <div className="h-3 w-full bg-bg-elevated rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(devices || []).map((device: any) => (
            <motion.div key={device.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-card-hover p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{device.name}</h3>
                  <p className="text-[11px] text-text-muted font-mono">{device.serialNumber}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[device.status] }} />
                  <span className="text-xs" style={{ color: STATUS_COLORS[device.status] }}>{device.status}</span>
                </div>
              </div>

              <p className="text-xs text-text-muted">{device.address || '—'}</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-text-muted">Battery</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${device.battery || 0}%`,
                        background: (device.battery || 0) > 50 ? '#00E676' : (device.battery || 0) > 20 ? '#FFB74D' : '#FF5252',
                      }} />
                    </div>
                    <span className="text-[11px] text-text-secondary">{device.battery || 0}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted">Signal</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${device.signalStrength || 0}%` }} />
                    </div>
                    <span className="text-[11px] text-text-secondary">{device.signalStrength || 0}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-text-muted">
                <span>FW: {device.firmwareVersion}</span>
                <span>{device._count?.events || 0} events</span>
                <span>{device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'Never'}</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => toggleMut.mutate(device.id)} className="btn-secondary text-xs flex-1 py-2">
                  {device.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => restartMut.mutate(device.id)} className="btn-ghost text-xs py-2">
                  Restart
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {devices?.length === 0 && !isLoading && (
        <div className="text-center py-20 text-text-muted">
          <p className="text-5xl mb-4">📡</p>
          <p className="text-lg font-medium">No devices found</p>
          <p className="text-sm mt-1">Register your first IoT device to get started</p>
        </div>
      )}
    </motion.div>
  );
}
