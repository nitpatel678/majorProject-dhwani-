import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { EVENT_LABELS, EVENT_ICONS } from '../theme';

export default function NavigateScreen({ route, navigation }: any) {
  const { incident } = route.params;
  const lat = incident.event?.latitude || 28.6139;
  const lng = incident.event?.longitude || 77.2090;

  const openExternalMaps = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* Tactical Map */}
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton
        userInterfaceStyle="dark"
      >
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          title={incident.event?.type?.replace(/_/g, ' ')}
          description={incident.event?.address}
        />
      </MapView>

      {/* Back button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
        <Ionicons name="chevron-back" size={20} color="#ffffff" />
      </TouchableOpacity>

      {/* Tactical Bottom Control Panel */}
      <View style={styles.bottomSheet}>
        <View style={styles.handle} />
        <View style={styles.incidentRow}>
          <View style={styles.iconBox}>
            <Ionicons
              name={(EVENT_ICONS[incident.event?.type] || 'warning-outline') as any}
              size={24}
              color="#ffffff"
            />
          </View>
          <View style={styles.incidentInfo}>
            <Text style={styles.incidentType}>
              {EVENT_LABELS[incident.event?.type] || incident.event?.type?.replace(/_/g, ' ')}
            </Text>
            <Text style={styles.incidentAddress} numberOfLines={2}>{incident.event?.address || 'Tactical Patrol Coordinate'}</Text>
          </View>
          <View style={styles.confidenceBox}>
            <Text style={styles.confValue}>{((incident.event?.confidence || 0.85) * 100).toFixed(0)}%</Text>
            <Text style={styles.confLabel}>Score</Text>
          </View>
        </View>

        <View style={styles.coordRow}>
          <Ionicons name="location-outline" size={14} color="#737373" />
          <Text style={styles.coordText}>GPS: {lat.toFixed(6)}, {lng.toFixed(6)}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={openExternalMaps} activeOpacity={0.85} style={styles.navBtn}>
            <Ionicons name="navigate" size={18} color="#000000" />
            <Text style={styles.navBtnText}>Launch Turn-by-Turn GPS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Resolve', { incident })}
            style={styles.resolveBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-done" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  map: { flex: 1 },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheet: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#262626', alignSelf: 'center', marginBottom: 16 },
  incidentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  incidentInfo: { flex: 1 },
  incidentType: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  incidentAddress: { fontSize: 12, color: '#a3a3a3', marginTop: 2 },
  confidenceBox: { backgroundColor: '#171717', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  confValue: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  confLabel: { fontSize: 9, color: '#737373', textTransform: 'uppercase' },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  coordText: { fontSize: 11, color: '#737373', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  actions: { flexDirection: 'row', gap: 10 },
  navBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  navBtnText: { color: '#000000', fontSize: 14, fontWeight: '700' },
  resolveBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
});
