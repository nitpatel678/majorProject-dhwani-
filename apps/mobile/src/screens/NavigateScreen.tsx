import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { theme, EVENT_ICONS } from '../theme';

const { width } = Dimensions.get('window');

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
      {/* Map */}
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
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.handle} />
        <View style={styles.incidentRow}>
          <Text style={styles.incidentIcon}>{EVENT_ICONS[incident.event?.type] || '🚨'}</Text>
          <View style={styles.incidentInfo}>
            <Text style={styles.incidentType}>{incident.event?.type?.replace(/_/g, ' ')}</Text>
            <Text style={styles.incidentAddress} numberOfLines={2}>{incident.event?.address || 'Unknown'}</Text>
          </View>
          <View style={styles.confidenceBox}>
            <Text style={styles.confValue}>{((incident.event?.confidence || 0) * 100).toFixed(0)}%</Text>
          </View>
        </View>

        <View style={styles.coordRow}>
          <Ionicons name="location" size={14} color={theme.colors.textMuted} />
          <Text style={styles.coordText}>{lat.toFixed(6)}, {lng.toFixed(6)}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={openExternalMaps} activeOpacity={0.8} style={{ flex: 1 }}>
            <LinearGradient colors={[theme.colors.primary, theme.colors.primaryLight]} style={styles.navBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="navigate" size={20} color="#fff" />
              <Text style={styles.navBtnText}>Start Navigation</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Resolve', { incident })}
            style={styles.resolveBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  map: { flex: 1 },
  backBtn: { position: 'absolute', top: 56, left: 16, width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', ...theme.shadows.card, borderWidth: 1, borderColor: theme.colors.border },
  bottomSheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: theme.colors.border },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.textMuted, alignSelf: 'center', marginBottom: 16 },
  incidentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  incidentIcon: { fontSize: 40, marginRight: 12 },
  incidentInfo: { flex: 1 },
  incidentType: { fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.text },
  incidentAddress: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
  confidenceBox: { backgroundColor: theme.colors.elevated, borderRadius: theme.radius.md, padding: 10, alignItems: 'center' },
  confValue: { fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.text },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  coordText: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  actions: { flexDirection: 'row', gap: 12 },
  navBtn: { borderRadius: theme.radius.lg, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  navBtnText: { color: '#fff', fontSize: theme.fontSize.md, fontWeight: '700' },
  resolveBtn: { width: 56, height: 56, borderRadius: theme.radius.lg, backgroundColor: theme.colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.success + '30' },
});
