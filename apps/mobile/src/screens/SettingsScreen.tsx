import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert('Terminate Session', 'Are you sure you want to sign out of active dispatch?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const SettingItem = ({ icon, label, value, onToggle, showArrow }: { icon: string; label: string; value?: boolean; onToggle?: (v: boolean) => void; showArrow?: boolean }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIconBox}>
          <Ionicons name={icon as any} size={18} color="#a3a3a3" />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {onToggle !== undefined && value !== undefined ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#171717', true: '#ffffff' }}
          thumbColor={value ? '#000000' : '#525252'}
        />
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={16} color="#737373" />
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>System Settings</Text>

        {/* Account Header */}
        <Text style={styles.sectionTitle}>Active Responder Account</Text>
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>{(user?.name || 'R').charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.accountName}>{user?.name}</Text>
              <Text style={styles.accountEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Field Dispatch Alerts</Text>
        <View style={styles.card}>
          <SettingItem icon="notifications-outline" label="Push Dispatch Notifications" value={pushEnabled} onToggle={setPushEnabled} />
          <View style={styles.divider} />
          <SettingItem icon="volume-high-outline" label="Acoustic Emergency Siren" value={soundEnabled} onToggle={setSoundEnabled} />
          <View style={styles.divider} />
          <SettingItem icon="hardware-chip-outline" label="Haptic Tactile Pulse" value={vibrationEnabled} onToggle={setVibrationEnabled} />
        </View>

        {/* Privacy */}
        <Text style={styles.sectionTitle}>Tactical Location Privacy</Text>
        <View style={styles.card}>
          <SettingItem icon="location-outline" label="Live GPS Coordinate Broadcast" value={locationEnabled} onToggle={setLocationEnabled} />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Image source={require('../../assets/logo.png')} style={styles.appLogo} resizeMode="contain" />
          <Text style={styles.appInfoTitle}>
            Dhwani<Text style={{ color: '#a3a3a3' }}>AI</Text> Responder
          </Text>
          <Text style={styles.appInfoVersion}>Version 1.0.0 • Build 2026.1</Text>
          <Text style={styles.appInfoCopy}>
            Encrypted Public Safety Acoustic Network
          </Text>
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Disconnect Node Session</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  scroll: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#737373', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1.5 },
  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  accountRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  accountAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#171717', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  accountAvatarText: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  accountName: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  accountEmail: { fontSize: 12, color: '#737373', marginTop: 2 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { fontSize: 14, color: '#ffffff', fontWeight: '500' },
  divider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)', marginHorizontal: 16 },
  appInfo: { alignItems: 'center', paddingVertical: 28 },
  appLogo: { width: 36, height: 36, marginBottom: 8 },
  appInfoTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  appInfoVersion: { fontSize: 11, color: '#737373', marginTop: 4 },
  appInfoCopy: { fontSize: 10, color: '#525252', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
});
