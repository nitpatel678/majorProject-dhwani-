import { motion } from 'framer-motion';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

const tabs = ['General', 'Account', 'Notifications', 'Model Config', 'Theme'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('General');
  const user = JSON.parse(localStorage.getItem('dhwaniai_user') || '{}');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: (data: Record<string, string>) => api.put('/settings', data),
    onSuccess: () => toast.success('Settings saved'),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Settings</h1>
        <p className="text-sm text-text-secondary">System configuration and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-surface/50 p-1 rounded-xl w-fit border border-border">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-primary/20 text-primary-light' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="glass-card p-6">
        {activeTab === 'General' && (
          <div className="space-y-6">
            <h3 className="font-semibold">General Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Auto-assign Responders</label>
                <select defaultValue={settings?.auto_assign} className="glass-input"
                  onChange={e => updateMut.mutate({ auto_assign: e.target.value })}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">Max Response Radius (km)</label>
                <input type="number" defaultValue={settings?.max_response_radius_km} className="glass-input"
                  onBlur={e => updateMut.mutate({ max_response_radius_km: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Account' && (
          <div className="space-y-6">
            <h3 className="font-semibold">Account Information</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-white">
                {(user.name || 'A').charAt(0)}
              </div>
              <div>
                <p className="text-lg font-semibold">{user.name}</p>
                <p className="text-sm text-text-muted">{user.email}</p>
                <span className="badge-primary text-[10px] mt-1">{user.role}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Name</label>
                <input defaultValue={user.name} className="glass-input" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">Email</label>
                <input defaultValue={user.email} className="glass-input" disabled />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Notifications' && (
          <div className="space-y-6">
            <h3 className="font-semibold">Notification Preferences</h3>
            {['Emergency Alerts', 'Assignment Updates', 'System Messages', 'Device Offline Alerts'].map(pref => (
              <div key={pref} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{pref}</p>
                  <p className="text-xs text-text-muted">Receive push and in-app notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-bg-elevated rounded-full peer peer-checked:bg-primary/60 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Model Config' && (
          <div className="space-y-6">
            <h3 className="font-semibold">AI Model Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Danger Threshold</label>
                <input type="number" step="0.05" min="0" max="1" defaultValue={settings?.danger_threshold} className="glass-input"
                  onBlur={e => updateMut.mutate({ danger_threshold: e.target.value })}
                />
                <p className="text-[11px] text-text-muted mt-1">Minimum confidence to trigger an alert (0-1)</p>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">Audio Sensitivity</label>
                <select defaultValue={settings?.audio_sensitivity} className="glass-input"
                  onChange={e => updateMut.mutate({ audio_sensitivity: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">Model Version</label>
                <input defaultValue={settings?.model_version} className="glass-input" disabled />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">Notifications</label>
                <select defaultValue={settings?.notification_enabled} className="glass-input"
                  onChange={e => updateMut.mutate({ notification_enabled: e.target.value })}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Theme' && (
          <div className="space-y-6">
            <h3 className="font-semibold">Appearance</h3>
            <div className="grid grid-cols-3 gap-4 max-w-md">
              {[
                { name: 'Dark', bg: '#0A0A0F', active: true },
                { name: 'Midnight', bg: '#0F172A', active: false },
                { name: 'Charcoal', bg: '#1A1A2E', active: false },
              ].map(theme => (
                <button key={theme.name}
                  className={`p-4 rounded-xl border-2 transition-all ${theme.active ? 'border-primary' : 'border-border hover:border-border-hover'}`}
                >
                  <div className="w-full h-12 rounded-lg mb-2" style={{ background: theme.bg }} />
                  <p className="text-xs font-medium">{theme.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
