import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated, Vibration } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme, EVENT_LABELS, EVENT_ICONS } from '../theme';
import api from '../services/api';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = new Animated.Value(1);

  const { data: incidents, refetch: refetchIncidents } = useQuery({
    queryKey: ['my-incidents'],
    queryFn: () => api.get('/incidents', { params: { status: 'ASSIGNED' } }).then(r => r.data),
    refetchInterval: 10000,
  });

  const { data: stats } = useQuery({
    queryKey: ['responder-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
  });

  useEffect(() => {
    // Pulse animation for critical alerts
    const assignedIncidents = incidents?.filter((i: any) => i.responderId === user?.id && (i.status === 'ASSIGNED' || i.status === 'ONGOING'));
    if (assignedIncidents?.length > 0) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [incidents]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchIncidents();
    setRefreshing(false);
  };

  const myIncidents = incidents?.filter((i: any) => 
    i.responderId === user?.id && ['ASSIGNED', 'ONGOING'].includes(i.status)
  ) || [];

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#12121A']} style={StyleSheet.absoluteFill} />
      
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{user?.name || 'Responder'}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.statusText}>{user?.status || 'AVAILABLE'} · {user?.area}</Text>
            </View>
          </View>
          <View style={styles.avatarContainer}>
            <LinearGradient colors={[theme.colors.primary, theme.colors.accent]} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.avatarText}>{(user?.name || 'R').charAt(0)}</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Active Alert Banner */}
        {myIncidents.length > 0 && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Alert', { incident: myIncidents[0] })}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#FF5252', '#D32F2F']} style={styles.alertBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <View style={styles.alertLeft}>
                  <Text style={styles.alertIcon}>🚨</Text>
                  <View>
                    <Text style={styles.alertTitle}>ACTIVE ALERT</Text>
                    <Text style={styles.alertSubtitle}>
                      {myIncidents[0].event?.type?.replace(/_/g, ' ')} · {myIncidents[0].priority}
                    </Text>
                    <Text style={styles.alertAddress} numberOfLines={1}>
                      {myIncidents[0].event?.address || 'Unknown location'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'Active Alerts', value: myIncidents.length, icon: '🚨', color: theme.colors.danger },
            { label: 'Today\'s Events', value: stats?.todayAlerts || 0, icon: '📊', color: theme.colors.info },
            { label: 'Devices Online', value: `${stats?.activeDevices || 0}/${stats?.totalDevices || 0}`, icon: '📡', color: theme.colors.accent },
            { label: 'AI Accuracy', value: `${stats?.aiAccuracy || 0}%`, icon: '🤖', color: theme.colors.primaryLight },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* My Assignments */}
        <Text style={styles.sectionTitle}>My Assignments ({myIncidents.length})</Text>
        {myIncidents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>No active assignments</Text>
            <Text style={styles.emptySubtext}>You're all clear. Stay on standby.</Text>
          </View>
        ) : (
          myIncidents.map((incident: any) => (
            <TouchableOpacity
              key={incident.id}
              onPress={() => navigation.navigate('Alert', { incident })}
              activeOpacity={0.8}
              style={styles.incidentCard}
            >
              <View style={[styles.incidentIcon, { backgroundColor: `${theme.colors[incident.event?.type as keyof typeof theme.colors] || theme.colors.danger}15` }]}>
                <Text style={{ fontSize: 24 }}>{EVENT_ICONS[incident.event?.type] || '🚨'}</Text>
              </View>
              <View style={styles.incidentInfo}>
                <Text style={[styles.incidentType, { color: theme.colors[incident.event?.type as keyof typeof theme.colors] || theme.colors.danger }]}>
                  {EVENT_LABELS[incident.event?.type] || incident.event?.type?.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.incidentAddress} numberOfLines={1}>{incident.event?.address || 'Unknown'}</Text>
                <View style={styles.incidentMeta}>
                  <View style={[styles.priorityBadge, { backgroundColor: incident.priority === 'CRITICAL' ? `${theme.colors.danger}20` : `${theme.colors.warning}20` }]}>
                    <Text style={[styles.priorityText, { color: incident.priority === 'CRITICAL' ? theme.colors.danger : theme.colors.warning }]}>
                      {incident.priority}
                    </Text>
                  </View>
                  <Text style={styles.incidentTime}>{new Date(incident.createdAt).toLocaleTimeString()}</Text>
                </View>
              </View>
              <View style={styles.confidenceBox}>
                <Text style={styles.confidenceValue}>{((incident.event?.confidence || 0) * 100).toFixed(0)}%</Text>
                <Text style={styles.confidenceLabel}>conf</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Recent System Events */}
        <Text style={styles.sectionTitle}>Recent Alerts</Text>
        {(incidents || []).slice(0, 5).map((incident: any) => (
          <View key={incident.id} style={styles.recentItem}>
            <View style={[styles.recentDot, { backgroundColor: theme.colors[incident.event?.type as keyof typeof theme.colors] || theme.colors.textMuted }]} />
            <View style={styles.recentInfo}>
              <Text style={styles.recentType}>{incident.event?.type?.replace(/_/g, ' ')}</Text>
              <Text style={styles.recentAddress} numberOfLines={1}>{incident.event?.address}</Text>
            </View>
            <View style={styles.recentRight}>
              <View style={[styles.statusBadge, {
                backgroundColor: incident.status === 'RESOLVED' ? `${theme.colors.success}15` : incident.status === 'ASSIGNED' ? `${theme.colors.warning}15` : `${theme.colors.info}15`
              }]}>
                <Text style={[styles.statusBadgeText, {
                  color: incident.status === 'RESOLVED' ? theme.colors.success : incident.status === 'ASSIGNED' ? theme.colors.warning : theme.colors.info
                }]}>{incident.status}</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  userName: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  avatarContainer: {},
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '900', color: '#fff' },
  alertBanner: { borderRadius: theme.radius.lg, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  alertIcon: { fontSize: 36 },
  alertTitle: { fontSize: theme.fontSize.lg, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  alertSubtitle: { fontSize: theme.fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  alertAddress: { fontSize: theme.fontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2, maxWidth: 200 },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 12, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '47%', backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: theme.fontSize.xxl, fontWeight: '800' },
  statLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 4 },
  emptyState: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, marginBottom: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: theme.fontSize.lg, fontWeight: '600', color: theme.colors.text },
  emptySubtext: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 4 },
  incidentCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 3, borderLeftColor: theme.colors.danger },
  incidentIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  incidentInfo: { flex: 1 },
  incidentType: { fontSize: theme.fontSize.md, fontWeight: '700' },
  incidentAddress: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
  incidentMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: theme.fontSize.xs, fontWeight: '700' },
  incidentTime: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  confidenceBox: { alignItems: 'center' },
  confidenceValue: { fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.text },
  confidenceLabel: { fontSize: 9, color: theme.colors.textMuted, textTransform: 'uppercase' },
  recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  recentDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  recentInfo: { flex: 1 },
  recentType: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text },
  recentAddress: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 },
  recentRight: { marginLeft: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 9, fontWeight: '700' },
});
