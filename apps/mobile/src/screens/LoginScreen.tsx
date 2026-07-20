import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('arjun.patel@dhwaniai.com');
  const [password, setPassword] = useState('responder123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error?.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0A0A0F', '#12121A', '#0A0A0F']} style={StyleSheet.absoluteFill} />

      {/* Logo */}
      <View style={styles.logoSection}>
        <LinearGradient colors={[theme.colors.primary, theme.colors.accent]} style={styles.logoBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.logoText}>D</Text>
        </LinearGradient>
        <Text style={styles.title}>
          Dhwani<Text style={styles.titleAccent}>AI</Text>
        </Text>
        <Text style={styles.subtitle}>Responder Login</Text>
      </View>

      {/* Form */}
      <View style={styles.formSection}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSubtitle}>Access your responder dashboard</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
            />
          </View>

          <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
            <LinearGradient colors={[theme.colors.primary, theme.colors.primaryLight]} style={[styles.loginBtn, loading && styles.loginBtnDisabled]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.demoBox}>
            <Text style={styles.demoText}>
              Demo: arjun.patel@dhwaniai.com / responder123
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.copyright}>DhwaniAI © {new Date().getFullYear()}</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  logoSection: { alignItems: 'center', paddingTop: 80, marginBottom: 32 },
  logoBox: { width: 64, height: 64, borderRadius: theme.radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...theme.shadows.glow },
  logoText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  titleAccent: { color: theme.colors.primary },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 4, letterSpacing: 2, textTransform: 'uppercase' },
  formSection: { paddingHorizontal: 24, flex: 1 },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: 24, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.card },
  cardTitle: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: 24 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: 8 },
  input: { backgroundColor: theme.colors.elevated, borderRadius: theme.radius.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: theme.fontSize.md, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border },
  loginBtn: { paddingVertical: 16, borderRadius: theme.radius.lg, alignItems: 'center', marginTop: 8 },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#fff', fontSize: theme.fontSize.lg, fontWeight: '700' },
  demoBox: { backgroundColor: theme.colors.elevated, borderRadius: theme.radius.md, padding: 12, marginTop: 16, borderWidth: 1, borderColor: theme.colors.border },
  demoText: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyright: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, textAlign: 'center', paddingBottom: 32 },
});
