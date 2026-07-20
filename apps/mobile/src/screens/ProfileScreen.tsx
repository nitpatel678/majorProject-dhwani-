import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
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
      <LinearGradient colors={['#0A0A0F', '#12121A']} style={StyleSheet.absoluteFill} />
      
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient colors={[theme.colors.primary, theme.colors.accent]} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.avatarText}>{(user?.name || 'R').charAt(0)}</Text>
          </LinearGradient>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.role}>{user?.rank} · {user?.badge}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
            <Text style={styles.statusText}>{user?.status}</Text>
          </View>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Cases', value: performance?.totalCases || 0, icon: 'briefcase', color: theme.colors.info },
            { label: 'Resolved', value: performance?.resolved || 0, icon: 'checkmark-circle', color: theme.colors.success },
            { label: 'Success Rate', value: `${performance?.rate || 0}%`, icon: 'trending-up', color: theme.colors.primaryLight },
            { label: 'Avg Response', value: `${performance?.avgResponseTime || 0}m`, icon: 'time', color: theme.colors.accent },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Info */}
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.infoCard}>
          {[
            { label: 'Area', value: user?.area || '—', icon: 'location' },
            { label: 'Badge', value: user?.badge || '—', icon: 'shield-checkmark' },
            { label: 'Rank', value: user?.rank || '—', icon: 'star' },
            { label: 'Role', value: user?.role || '—', icon: 'person' },
          ].map((item, i) => (
            <View key={i} style={[styles.infoRow, i < 3 && styles.infoRowBorder]}>
              <View style={styles.infoLeft}>
                <Ionicons name={item.icon as any} size={18} color={theme.colors.textMuted} />
                <Text style={styles.infoLabel}>{item.label}</Text>
              </View>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 20, paddingTop: 60 },
  profileCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...theme.shadows.glow },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#fff' },
  name: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text },
  role: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 4 },
  email: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: theme.colors.elevated, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: theme.fontSize.xs, color: theme.colors.success, fontWeight: '700' },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '47%', backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 16, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  statValue: { fontSize: theme.fontSize.xxl, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 4 },
  infoCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 24 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  infoValue: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.danger + '30' },
  logoutText: { color: theme.colors.danger, fontSize: theme.fontSize.md, fontWeight: '700' },
});
