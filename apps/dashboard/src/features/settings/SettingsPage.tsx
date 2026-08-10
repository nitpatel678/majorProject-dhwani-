import { motion } from 'framer-motion';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Settings, User, Bell, Bot, Palette, Check, Save } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'General', icon: Settings },
  { id: 'Account', icon: User },
  { id: 'Notifications', icon: Bell },
  { id: 'Model Config', icon: Bot },
  { id: 'Theme', icon: Palette },
];

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white font-display">System Settings</h1>
        <p className="text-sm text-surface-500">Configure system rules, AI threshold sensitivity, and accounts</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl w-fit">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                active
                  ? 'bg-white text-black font-semibold shadow-glow-white'
                  : 'text-surface-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={14} />
              {t.id}
            </button>
          );
        })}
      </div>

      {/* Main Settings Card */}
      <div className="card p-6">
        {activeTab === 'General' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-sm font-semibold text-white">General Command Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-2">Auto-assign Patrol Units</label>
                <select
                  defaultValue={settings?.auto_assign}
                  className="input bg-[#171717]"
                  onChange={e => updateMut.mutate({ auto_assign: e.target.value })}
                >
                  <option value="true font-mono">Enabled (Nearest Unit)</option>
                  <option value="false">Disabled (Manual Dispatch)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-2">Max Response Radius (km)</label>
                <input
                  type="number"
                  defaultValue={settings?.max_response_radius_km || 10}
                  className="input font-mono text-xs"
                  onBlur={e => updateMut.mutate({ max_response_radius_km: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Account' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-sm font-semibold text-white">Operator Account Profile</h3>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="w-14 h-14 rounded-xl bg-white text-black flex items-center justify-center text-xl font-bold font-display">
                {(user.name || 'A').charAt(0)}
              </div>
              <div>
                <p className="text-base font-semibold text-white">{user.name || 'Administrator'}</p>
                <p className="text-xs text-surface-500 font-mono">{user.email || 'admin@dhwaniai.com'}</p>
                <span className="badge-neutral text-[10px] mt-1 font-mono">{user.role || 'COMMAND_ADMIN'}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-2">Name</label>
                <input defaultValue={user.name} className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-2">Email Address</label>
                <input defaultValue={user.email} className="input text-surface-500 cursor-not-allowed" disabled />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Notifications' && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-semibold text-white mb-2">Notification Routing</h3>
            {['Critical Emergency Sirens & Crashes', 'Patrol Assignment Updates', 'System Health Warnings', 'Hardware Node Disconnections'].map(pref => (
              <div key={pref} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="text-xs font-medium text-white">{pref}</p>
                  <p className="text-[11px] text-surface-500">Dispatch live notifications to dashboard header</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-10 h-5 bg-white/[0.08] rounded-full peer peer-checked:bg-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-black after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Model Config' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-sm font-semibold text-white">Neural Inference Calibration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-2">Danger Confidence Cutoff (0 - 1)</label>
                <input
                  type="number" step="0.05" min="0" max="1"
                  defaultValue={settings?.danger_threshold || 0.3}
                  className="input font-mono text-xs"
                  onBlur={e => updateMut.mutate({ danger_threshold: e.target.value })}
                />
                <p className="text-[10px] text-surface-600 mt-1">Minimum confidence threshold to record an event</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-2">Acoustic Gain Sensitivity</label>
                <select
                  defaultValue={settings?.audio_sensitivity || 'medium'}
                  className="input bg-[#171717]"
                  onChange={e => updateMut.mutate({ audio_sensitivity: e.target.value })}
                >
                  <option value="low">Low (High Noise Immunity)</option>
                  <option value="medium">Balanced Standard</option>
                  <option value="high">High (High Sensitivity)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-2">Active Architecture Model</label>
                <input defaultValue={settings?.model_version || 'MobileNetV5-Edge (TFLite)'} className="input text-surface-500 font-mono text-xs" disabled />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Theme' && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-semibold text-white">Appearance Theme</h3>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {[
                { name: 'Monochrome Dark', bg: '#0a0a0a', active: true },
                { name: 'Pure Obsidian', bg: '#000000', active: false },
                { name: 'Charcoal Minimal', bg: '#121212', active: false },
              ].map(theme => (
                <div
                  key={theme.name}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    theme.active ? 'border-white bg-white/[0.04]' : 'border-white/[0.06] opacity-60'
                  }`}
                >
                  <div className="w-full h-10 rounded-lg mb-2 border border-white/[0.1]" style={{ background: theme.bg }} />
                  <p className="text-xs font-medium text-white text-center">{theme.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
