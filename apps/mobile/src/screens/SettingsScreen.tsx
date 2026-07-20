import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const SettingItem = ({ icon, label, value, onToggle, showArrow }: { icon: string; label: string; value?: boolean; onToggle?: (v: boolean) => void; showArrow?: boolean }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={20} color={theme.colors.primaryLight} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {onToggle !== undefined && value !== undefined ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: theme.colors.elevated, true: theme.colors.primary + '60' }}
          thumbColor={value ? theme.colors.primary : theme.colors.textMuted}
        />
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#12121A']} style={StyleSheet.absoluteFill} />
      
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <LinearGradient colors={[theme.colors.primary, theme.colors.accent]} style={styles.accountAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.accountAvatarText}>{(user?.name || 'R').charAt(0)}</Text>
            </LinearGradient>
            <View>
              <Text style={styles.accountName}>{user?.name}</Text>
              <Text style={styles.accountEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <SettingItem icon="notifications" label="Push Notifications" value={pushEnabled} onToggle={setPushEnabled} />
          <View style={styles.divider} />
          <SettingItem icon="volume-high" label="Alert Sounds" value={soundEnabled} onToggle={setSoundEnabled} />
          <View style={styles.divider} />
          <SettingItem icon="phone-portrait" label="Vibration" value={vibrationEnabled} onToggle={setVibrationEnabled} />
        </View>

        {/* Privacy */}
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.card}>
          <SettingItem icon="location" label="Location Sharing" value={locationEnabled} onToggle={setLocationEnabled} />
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <SettingItem icon="information-circle" label="App Version" showArrow />
          <View style={styles.divider} />
          <SettingItem icon="shield-checkmark" label="Privacy Policy" showArrow />
          <View style={styles.divider} />
          <SettingItem icon="document-text" label="Terms of Service" showArrow />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoTitle}>
            Dhwani<Text style={{ color: theme.colors.primary }}>AI</Text> Responder
          </Text>
          <Text style={styles.appInfoVersion}>Version 1.0.0 · Build 1</Text>
          <Text style={styles.appInfoCopy}>
            AI-Powered Acoustic Safety · © {new Date().getFullYear()}
          </Text>
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
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
  title: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text, marginBottom: 24 },
  sectionTitle: { fontSize: theme.fontSize.xs, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 8, marginTop: 20, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  accountRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  accountAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  accountAvatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  accountName: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text },
  accountEmail: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: `${theme.colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: theme.fontSize.sm, color: theme.colors.text, fontWeight: '500' },
  divider: { height: 1, backgroundColor: theme.colors.border, marginHorizontal: 16 },
  appInfo: { alignItems: 'center', paddingVertical: 24 },
  appInfoTitle: { fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.text },
  appInfoVersion: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 4 },
  appInfoCopy: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.danger + '30' },
  logoutText: { color: theme.colors.danger, fontSize: theme.fontSize.md, fontWeight: '700' },
});
