import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { EVENT_LABELS, EVENT_ICONS } from '../theme';
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
    const assignedIncidents = incidents?.filter((i: any) => i.responderId === user?.id && (i.status === 'ASSIGNED' || i.status === 'ONGOING'));
    if (assignedIncidents?.length > 0) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.logoRow}>
              <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
              <Text style={styles.headerBrand}>Dhwani<Text style={{ color: '#a3a3a3' }}>AI</Text></Text>
            </View>
            <Text style={styles.userName}>{greeting}, {user?.name?.split(' ')[0] || 'Officer'}</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{user?.status || 'ONLINE'} • Patrol Area: {user?.area || 'Sector 4'}</Text>
            </View>
          </View>
          <View style={styles.avatarFrame}>
            <Text style={styles.avatarText}>{(user?.name || 'R').charAt(0)}</Text>
          </View>
        </View>

        {/* Active Emergency Dispatch Banner */}
        {myIncidents.length > 0 && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Alert', { incident: myIncidents[0] })}
              activeOpacity={0.88}
              style={styles.alertBanner}
            >
              <View style={styles.alertLeft}>
                <View style={styles.alertIconBadge}>
                  <Ionicons name="warning" size={24} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.alertBadgeRow}>
                    <Text style={styles.alertTagText}>CRITICAL DISPATCH</Text>
                    <Text style={styles.alertPriorityBadge}>{myIncidents[0].priority}</Text>
                  </View>
                  <Text style={styles.alertTitle}>
                    {EVENT_LABELS[myIncidents[0].event?.type] || myIncidents[0].event?.type?.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.alertAddress} numberOfLines={1}>
                    {myIncidents[0].event?.address || 'Incident Location'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Quick Stats Grid */}
        <Text style={styles.sectionTitle}>System Telemetry</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'Active Alerts', value: myIncidents.length, icon: 'warning-outline', accent: '#ef4444' },
            { label: 'Today Alerts', value: stats?.todayAlerts || 0, icon: 'bar-chart-outline', accent: '#ffffff' },
            { label: 'Sensors Online', value: `${stats?.activeDevices || 0}/${stats?.totalDevices || 0}`, icon: 'radio-outline', accent: '#a3a3a3' },
            { label: 'Model Conf.', value: `${stats?.aiAccuracy || 96}%`, icon: 'hardware-chip-outline', accent: '#ffffff' },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <View style={styles.statTop}>
                <Ionicons name={stat.icon as any} size={18} color="#a3a3a3" />
                <Text style={[styles.statValue, { color: stat.accent }]}>{stat.value}</Text>
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Assigned Incidents Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Assigned Incidents ({myIncidents.length})</Text>
        </View>
        
        {myIncidents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={42} color="#525252" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>All Sector Coordinates Clear</Text>
            <Text style={styles.emptySubtext}>Acoustic monitoring sensors scanning in baseline mode.</Text>
          </View>
        ) : (
          myIncidents.map((incident: any) => (
            <TouchableOpacity
              key={incident.id}
              onPress={() => navigation.navigate('Alert', { incident })}
              activeOpacity={0.8}
              style={styles.incidentCard}
            >
              <View style={styles.incidentIconBox}>
                <Ionicons
                  name={(EVENT_ICONS[incident.event?.type] || 'alert-circle-outline') as any}
                  size={24}
                  color="#ffffff"
                />
              </View>
              <View style={styles.incidentInfo}>
                <Text style={styles.incidentType}>
                  {EVENT_LABELS[incident.event?.type] || incident.event?.type?.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.incidentAddress} numberOfLines={1}>{incident.event?.address || 'Sector 4'}</Text>
                <View style={styles.incidentMeta}>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>{incident.priority}</Text>
                  </View>
                  <Text style={styles.incidentTime}>{new Date(incident.createdAt).toLocaleTimeString()}</Text>
                </View>
              </View>
              <View style={styles.confidenceBox}>
                <Text style={styles.confidenceValue}>{((incident.event?.confidence || 0.85) * 100).toFixed(0)}%</Text>
                <Text style={styles.confidenceLabel}>Confidence</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Recent System Alerts Log */}
        <Text style={styles.sectionTitle}>Recent Acoustic Events</Text>
        {(incidents || []).slice(0, 5).map((incident: any) => (
          <View key={incident.id} style={styles.recentItem}>
            <Ionicons
              name={(EVENT_ICONS[incident.event?.type] || 'notifications-outline') as any}
              size={18}
              color="#a3a3a3"
              style={{ marginRight: 12 }}
            />
            <View style={styles.recentInfo}>
              <Text style={styles.recentType}>{incident.event?.type?.replace(/_/g, ' ')}</Text>
              <Text style={styles.recentAddress} numberOfLines={1}>{incident.event?.address || 'District Node'}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{incident.status}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  scroll: { padding: 20, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  userInfo: { flex: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  headerLogo: { width: 22, height: 22, marginRight: 8 },
  headerBrand: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  userName: { fontSize: 24, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 6 },
  statusText: { fontSize: 11, color: '#737373', fontWeight: '500' },
  avatarFrame: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  alertBanner: {
    backgroundColor: '#0a0a0a',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ef4444',
    boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)',
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  alertIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertTagText: { fontSize: 10, fontWeight: '800', color: '#ef4444', letterSpacing: 1 },
  alertPriorityBadge: { fontSize: 9, fontWeight: '700', color: '#ffffff', backgroundColor: '#171717', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  alertTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff', marginTop: 2 },
  alertAddress: { fontSize: 11, color: '#a3a3a3', marginTop: 2 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#737373', marginBottom: 12, marginTop: 12, textTransform: 'uppercase', letterSpacing: 1.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    width: '48%',
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#737373', marginTop: 8, fontWeight: '500' },
  emptyState: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  emptySubtext: { fontSize: 12, color: '#737373', marginTop: 4, textAlign: 'center' },
  incidentCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#ffffff',
  },
  incidentIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  incidentInfo: { flex: 1 },
  incidentType: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  incidentAddress: { fontSize: 12, color: '#a3a3a3', marginTop: 2 },
  incidentMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: '#171717' },
  priorityText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
  incidentTime: { fontSize: 10, color: '#737373' },
  confidenceBox: { alignItems: 'center', paddingLeft: 8 },
  confidenceValue: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  confidenceLabel: { fontSize: 9, color: '#737373', textTransform: 'uppercase' },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  recentInfo: { flex: 1 },
  recentType: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  recentAddress: { fontSize: 11, color: '#737373', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: '#171717' },
  statusBadgeText: { fontSize: 9, fontWeight: '700', color: '#a3a3a3' },
});
