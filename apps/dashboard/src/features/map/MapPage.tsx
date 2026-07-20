import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useState } from 'react';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';

const MARKER_ICONS: Record<string, string> = {
  device: '📡', responder: '👮', incident: '🚨',
};

function createIcon(type: string, status: string) {
  const bg = type === 'incident' ? '#FF5252' : type === 'responder' ? '#6C5CE7' : '#00D9FF';
  return L.divIcon({
    html: `<div style="background:${bg};width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid rgba(255,255,255,0.3);box-shadow:0 4px 12px rgba(0,0,0,0.3)">${MARKER_ICONS[type]}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Map View</h1>
          <p className="text-sm text-text-secondary">Live locations of devices, responders & incidents</p>
        </div>
        <div className="flex gap-2">
          {[
            { key: 'device', label: 'Devices', color: '#00D9FF', icon: '📡' },
            { key: 'responder', label: 'Responders', color: '#6C5CE7', icon: '👮' },
            { key: 'incident', label: 'Incidents', color: '#FF5252', icon: '🚨' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                filter.includes(f.key)
                  ? 'border border-opacity-30 bg-opacity-15'
                  : 'bg-bg-elevated text-text-muted border border-border opacity-50'
              }`}
              style={filter.includes(f.key) ? { borderColor: f.color, background: `${f.color}15`, color: f.color } : {}}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl flex-1" style={{ height: 'calc(100% - 60px)' }}>
        <MapContainer center={[28.6139, 77.2090]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredMarkers.map((marker: any) => (
            <Marker key={`${marker.type}-${marker.id}`} position={[marker.latitude, marker.longitude]} icon={createIcon(marker.type, marker.status)}>
              <Popup>
                <div style={{ fontFamily: 'Outfit', color: '#0A0A0F', minWidth: 180 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{marker.label}</p>
                  <p style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Type: {marker.type}</p>
                  <p style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Status: {marker.status}</p>
                  {marker.data?.eventType && <p style={{ fontSize: 11, color: '#F44336' }}>Event: {marker.data.eventType.replace(/_/g, ' ')}</p>}
                  {marker.data?.confidence && <p style={{ fontSize: 11 }}>Confidence: {(marker.data.confidence * 100).toFixed(0)}%</p>}
                  {marker.data?.responder && <p style={{ fontSize: 11 }}>Responder: {marker.data.responder}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </motion.div>
  );
}
