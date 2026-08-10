import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EVENT_LABELS, EVENT_ICONS } from '../theme';
import api from '../services/api';
import * as Haptics from 'expo-haptics';

export default function AlertScreen({ route, navigation }: any) {
  const { incident } = route.params;
  const queryClient = useQueryClient();
  const eventType = incident.event?.type || 'UNKNOWN';
  const confidence = (incident.event?.confidence || 0.85) * 100;

  const acceptMut = useMutation({
    mutationFn: () => api.post(`/incidents/${incident.id}/assign`, { responderId: incident.responderId }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
      navigation.navigate('Navigate', { incident });
    },
  });

  const openMaps = () => {
    const lat = incident.event?.latitude;
    const lng = incident.event?.longitude;
    if (lat && lng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TACTICAL ALERT DISPATCH</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Event Hero Card */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconBox}>
            <Ionicons
              name={(EVENT_ICONS[eventType] || 'warning-outline') as any}
              size={38}
              color="#ffffff"
            />
          </View>
          <Text style={styles.heroType}>
            {EVENT_LABELS[eventType] || eventType.replace(/_/g, ' ')}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{confidence.toFixed(0)}%</Text>
              <Text style={styles.heroStatLabel}>AI Confidence</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{incident.priority}</Text>
              <Text style={styles.heroStatLabel}>Priority</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{incident.status}</Text>
              <Text style={styles.heroStatLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* Incident Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={18} color="#ffffff" />
            <Text style={styles.cardTitle}>Acoustic Coordinates</Text>
          </View>
          <Text style={styles.addressText}>{incident.event?.address || 'Sector Patrol Point'}</Text>
          <Text style={styles.coordsText}>
            GPS: {incident.event?.latitude?.toFixed(6) || '28.6139'}, {incident.event?.longitude?.toFixed(6) || '77.2090'}
          </Text>
          <TouchableOpacity onPress={openMaps} activeOpacity={0.8} style={styles.mapBtn}>
            <Ionicons name="navigate-outline" size={16} color="#000000" />
            <Text style={styles.mapBtnText}>Launch Maps Navigation</Text>
          </TouchableOpacity>
        </View>

        {/* Telemetry Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle-outline" size={18} color="#a3a3a3" />
            <Text style={styles.cardTitle}>Inference Telemetry</Text>
          </View>
          <Text style={styles.descText}>{incident.description || 'Acoustic monitoring node detected suspicious high-decibel waveform spike.'}</Text>
          
          <View style={styles.detailGrid}>
            {[
              { label: 'Sensor Device', value: incident.event?.device?.name || 'Mic Node 04' },
              { label: 'Latency', value: `${incident.event?.inferenceTime || 45}ms` },
              { label: 'Detected At', value: new Date(incident.createdAt).toLocaleTimeString() },
              { label: 'Assigned', value: incident.assignedAt ? new Date(incident.assignedAt).toLocaleTimeString() : 'Immediate' },
            ].map((item, i) => (
              <View key={i} style={styles.detailItem}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Panel */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Navigate', { incident })}
            activeOpacity={0.85}
            style={styles.actionBtnPrimary}
          >
            <Ionicons name="navigate" size={18} color="#000000" />
            <Text style={styles.actionBtnPrimaryText}>Start GPS Tactical Guidance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Resolve', { incident })}
            activeOpacity={0.85}
            style={styles.actionBtnSecondary}
          >
            <Ionicons name="checkmark-done-circle-outline" size={18} color="#ffffff" />
            <Text style={styles.actionBtnSecondaryText}>Log Incident Resolution</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 11, fontWeight: '800', color: '#737373', letterSpacing: 1.5 },
  scroll: { padding: 20 },
  heroSection: {
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroIconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroType: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 20, textAlign: 'center' },
  heroStats: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  heroStatItem: { alignItems: 'center', flex: 1 },
  heroStatValue: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  heroStatLabel: { fontSize: 10, color: '#737373', marginTop: 2, textTransform: 'uppercase', fontWeight: '500' },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  addressText: { fontSize: 15, color: '#ffffff', lineHeight: 22, fontWeight: '600' },
  coordsText: { fontSize: 11, color: '#737373', marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  mapBtnText: { color: '#000000', fontWeight: '700', fontSize: 13 },
  descText: { fontSize: 13, color: '#a3a3a3', lineHeight: 20 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  detailItem: { width: '48%', backgroundColor: '#171717', borderRadius: 10, padding: 12 },
  detailLabel: { fontSize: 10, color: '#737373', marginBottom: 4, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, color: '#ffffff', fontWeight: '600' },
  actionSection: { gap: 10, marginTop: 8 },
  actionBtnPrimary: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  actionBtnPrimaryText: { color: '#000000', fontSize: 15, fontWeight: '700' },
  actionBtnSecondary: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionBtnSecondaryText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
