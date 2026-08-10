import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useState } from 'react';
import { MapPin, Cpu, Shield, AlertTriangle, Filter } from 'lucide-react';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';

function createIcon(type: string) {
  const bg = type === 'incident' ? '#ef4444' : type === 'responder' ? '#ffffff' : '#737373';
  const color = type === 'responder' ? '#000000' : '#ffffff';
  const symbol = type === 'incident' ? '!' : type === 'responder' ? 'R' : 'D';

  return L.divIcon({
    html: `<div style="background:${bg};color:${color};width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;font-family:sans-serif;border:1px solid rgba(255,255,255,0.2);box-shadow:0 4px 12px rgba(0,0,0,0.6)">${symbol}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function MapPage() {
  const [filter, setFilter] = useState<string[]>(['device', 'responder', 'incident']);

  const { data: markers } = useQuery({
    queryKey: ['map-markers'],
    queryFn: () => api.get('/map/markers').then(r => r.data),
    refetchInterval: 15000,
  });

  const toggleFilter = (type: string) => {
    setFilter(prev => prev.includes(type) ? prev.filter(f => f !== type) : [...prev, type]);
  };

  const filteredMarkers = (markers || []).filter((m: any) => filter.includes(m.type));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white font-display">Geospatial Map</h1>
          <p className="text-sm text-surface-500">Live telemetry coordinates for nodes, patrols & active incidents</p>
        </div>
        <div className="flex gap-2 items-center">
          <Filter size={14} className="text-surface-600 mr-1" />
          {[
            { key: 'device', label: 'Nodes', icon: Cpu },
            { key: 'responder', label: 'Patrols', icon: Shield },
            { key: 'incident', label: 'Incidents', icon: AlertTriangle },
          ].map(f => {
            const Icon = f.icon;
            const active = filter.includes(f.key);
            return (
              <button
                key={f.key}
                onClick={() => toggleFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  active
                    ? 'bg-white text-black font-semibold shadow-glow-white'
                    : 'bg-white/[0.03] text-surface-500 border border-white/[0.06] hover:text-white'
                }`}
              >
                <Icon size={13} /> {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Card Container */}
      <div className="card overflow-hidden rounded-2xl flex-1 border border-white/[0.08]" style={{ height: 'calc(100% - 60px)' }}>
        <MapContainer center={[28.6139, 77.2090]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredMarkers.map((marker: any) => (
            <Marker key={`${marker.type}-${marker.id}`} position={[marker.latitude, marker.longitude]} icon={createIcon(marker.type)}>
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', color: '#0a0a0a', minWidth: 160 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{marker.label}</p>
                  <p style={{ fontSize: 11, color: '#525252', marginBottom: 2 }}>Type: {marker.type}</p>
                  <p style={{ fontSize: 11, color: '#525252', marginBottom: 2 }}>Status: {marker.status}</p>
                  {marker.data?.eventType && <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Event: {marker.data.eventType.replace(/_/g, ' ')}</p>}
                  {marker.data?.confidence && <p style={{ fontSize: 11 }}>Confidence: {(marker.data.confidence * 100).toFixed(0)}%</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </motion.div>
  );
}
