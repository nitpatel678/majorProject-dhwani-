import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const { data: performance } = useQuery({
    queryKey: ['my-performance'],
    queryFn: () => api.get('/analytics/responder').then(r => {
      const me = r.data.find((res: any) => res.name === user?.name);
      return me || { totalCases: 0, resolved: 0, rate: 0, avgResponseTime: 0 };
    }),
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarFrame}>
            <Text style={styles.avatarText}>{(user?.name || 'R').charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.role}>{user?.rank || 'Senior Officer'} • Badge #{user?.badge || 'IND-8842'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{user?.status || 'ACTIVE DUTY'}</Text>
          </View>
        </View>

        {/* Telemetry Stats */}
        <Text style={styles.sectionTitle}>Field Telemetry Performance</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Cases', value: performance?.totalCases || 12, icon: 'briefcase-outline', accent: '#ffffff' },
            { label: 'Resolved', value: performance?.resolved || 11, icon: 'checkmark-circle-outline', accent: '#ffffff' },
            { label: 'Success Rate', value: `${performance?.rate || 92}%`, icon: 'trending-up-outline', accent: '#a3a3a3' },
            { label: 'Avg Response', value: `${performance?.avgResponseTime || 4.2}m`, icon: 'time-outline', accent: '#a3a3a3' },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={20} color="#a3a3a3" />
              <Text style={[styles.statValue, { color: stat.accent }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Credentials & Sector Info */}
        <Text style={styles.sectionTitle}>Responder Credentials</Text>
        <View style={styles.infoCard}>
          {[
            { label: 'Assigned Sector', value: user?.area || 'Sector 4 Node', icon: 'location-outline' },
            { label: 'Official Badge ID', value: user?.badge || '8842-PATROL', icon: 'shield-checkmark-outline' },
            { label: 'Command Rank', value: user?.rank || 'Tactical Unit Lead', icon: 'ribbon-outline' },
            { label: 'System Access', value: user?.role || 'Level 3 Responder', icon: 'key-outline' },
          ].map((item, i) => (
            <View key={i} style={[styles.infoRow, i < 3 && styles.infoRowBorder]}>
              <View style={styles.infoLeft}>
                <Ionicons name={item.icon as any} size={18} color="#737373" />
                <Text style={styles.infoLabel}>{item.label}</Text>
              </View>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Terminate Session & Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  scroll: { padding: 20, paddingTop: 56 },
  profileCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
  },
  avatarFrame: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#ffffff' },
  name: { fontSize: 22, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 },
  role: { fontSize: 13, color: '#a3a3a3', marginTop: 4, fontWeight: '500' },
  email: { fontSize: 12, color: '#737373', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: '#171717',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 8 },
  statusText: { fontSize: 11, color: '#22c55e', fontWeight: '700', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#737373', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    width: '48%',
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#737373', marginTop: 4 },
  infoCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)' },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 13, color: '#a3a3a3' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
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
