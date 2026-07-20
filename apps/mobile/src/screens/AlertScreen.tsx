import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Vibration, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { theme, EVENT_LABELS, EVENT_ICONS } from '../theme';
import api from '../services/api';
import * as Haptics from 'expo-haptics';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#66BB6A', MEDIUM: '#FFB74D', HIGH: '#FF7043', CRITICAL: '#F44336',
};

export default function AlertScreen({ route, navigation }: any) {
  const { incident } = route.params;
  const queryClient = useQueryClient();
  const eventType = incident.event?.type || 'UNKNOWN';
  const confidence = (incident.event?.confidence || 0) * 100;

  const acceptMut = useMutation({
    mutationFn: () => api.post(`/incidents/${incident.id}/assign`, { responderId: incident.responderId }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
      navigation.navigate('Navigate', { incident });
    },
  });

  const resolveMut = useMutation({
    mutationFn: () => api.post(`/incidents/${incident.id}/resolve`, { description: 'Resolved on-site' }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
      navigation.goBack();
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
      <LinearGradient colors={['#0A0A0F', '#12121A']} style={StyleSheet.absoluteFill} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alert Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Event Type Hero */}
        <LinearGradient
          colors={[`${theme.colors[eventType as keyof typeof theme.colors] || theme.colors.danger}30`, 'transparent']}
          style={styles.heroSection}
        >
          <Text style={styles.heroIcon}>{EVENT_ICONS[eventType] || '🚨'}</Text>
          <Text style={[styles.heroType, { color: theme.colors[eventType as keyof typeof theme.colors] || theme.colors.danger }]}>
            {EVENT_LABELS[eventType] || eventType.replace(/_/g, ' ')}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: theme.colors[eventType as keyof typeof theme.colors] || theme.colors.danger }]}>
                {confidence.toFixed(0)}%
              </Text>
              <Text style={styles.heroStatLabel}>Confidence</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{incident.priority}</Text>
              <Text style={styles.heroStatLabel}>Priority</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, {
                color: incident.status === 'RESOLVED' ? theme.colors.success : incident.status === 'ASSIGNED' ? theme.colors.warning : theme.colors.info
              }]}>{incident.status}</Text>
              <Text style={styles.heroStatLabel}>Status</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Location */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={18} color={theme.colors.danger} />
            <Text style={styles.cardTitle}>Location</Text>
          </View>
          <Text style={styles.addressText}>{incident.event?.address || 'Location not available'}</Text>
          <Text style={styles.coordsText}>
            {incident.event?.latitude?.toFixed(6)}, {incident.event?.longitude?.toFixed(6)}
          </Text>
          <TouchableOpacity onPress={openMaps} style={styles.mapBtn}>
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={styles.mapBtnText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={18} color={theme.colors.info} />
            <Text style={styles.cardTitle}>Details</Text>
          </View>
          <Text style={styles.descText}>{incident.description || 'No description available'}</Text>
          
          <View style={styles.detailGrid}>
            {[
              { label: 'Device', value: incident.event?.device?.name || 'N/A' },
              { label: 'Inference Time', value: `${incident.event?.inferenceTime || 0}ms` },
              { label: 'Created', value: new Date(incident.createdAt).toLocaleString() },
              { label: 'Assigned', value: incident.assignedAt ? new Date(incident.assignedAt).toLocaleString() : 'Pending' },
            ].map((item, i) => (
              <View key={i} style={styles.detailItem}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionSection}>
          {incident.status === 'ASSIGNED' && (
            <>
              <TouchableOpacity onPress={() => navigation.navigate('Navigate', { incident })} activeOpacity={0.8}>
                <LinearGradient colors={[theme.colors.primary, theme.colors.primaryLight]} style={styles.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="navigate" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Navigate to Location</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('Resolve', { incident })} activeOpacity={0.8} style={styles.resolveBtn}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
              </TouchableOpacity>
            </>
          )}

          {incident.status === 'ONGOING' && (
            <TouchableOpacity onPress={() => navigation.navigate('Resolve', { incident })} activeOpacity={0.8}>
              <LinearGradient colors={[theme.colors.success, '#00C853']} style={styles.actionBtn}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Resolve Incident</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  scroll: { padding: 20 },
  heroSection: { borderRadius: theme.radius.xl, padding: 28, alignItems: 'center', marginBottom: 20 },
  heroIcon: { fontSize: 64, marginBottom: 12 },
  heroType: { fontSize: theme.fontSize.xxl, fontWeight: '900', marginBottom: 20 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStatItem: { alignItems: 'center', flex: 1 },
  heroStatValue: { fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.text },
  heroStatLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2, textTransform: 'uppercase' },
  heroDivider: { width: 1, height: 32, backgroundColor: theme.colors.border },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text },
  addressText: { fontSize: theme.fontSize.md, color: theme.colors.text, lineHeight: 22 },
  coordsText: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingVertical: 12, paddingHorizontal: 16, marginTop: 12, alignSelf: 'flex-start' },
  mapBtnText: { color: '#fff', fontWeight: '700', fontSize: theme.fontSize.sm },
  descText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 20 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  detailItem: { width: '47%', backgroundColor: theme.colors.elevated, borderRadius: theme.radius.md, padding: 12 },
  detailLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: 4 },
  detailValue: { fontSize: theme.fontSize.sm, color: theme.colors.text, fontWeight: '600' },
  actionSection: { gap: 12, marginTop: 8 },
  actionBtn: { borderRadius: theme.radius.lg, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionBtnText: { color: '#fff', fontSize: theme.fontSize.lg, fontWeight: '700' },
  resolveBtn: { borderRadius: theme.radius.lg, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.success + '30' },
  resolveBtnText: { color: theme.colors.success, fontSize: theme.fontSize.md, fontWeight: '700' },
});
