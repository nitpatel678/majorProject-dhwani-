import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('arjun.patel@dhwaniai.com');
  const [password, setPassword] = useState('responder123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Authentication Error', 'Please fill in both email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Authentication Failed', error?.response?.data?.error || 'Invalid credentials. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Brand Header */}
      <View style={styles.logoSection}>
        <View style={styles.logoFrame}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>
          Dhwani<Text style={styles.titleAccent}>AI</Text>
        </Text>
        <Text style={styles.subtitle}>Responder Mobile Node</Text>
      </View>

      {/* Login Card */}
      <View style={styles.formSection}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Responder Authentication</Text>
          <Text style={styles.cardSubtitle}>Enter credentials to connect to live alert grid</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Official Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#737373" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="responder@dhwaniai.com"
                placeholderTextColor="#525252"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#737373" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••••"
                placeholderTextColor="#525252"
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85} style={styles.loginBtn}>
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={styles.loginBtnText}>Authenticate</Text>
                <Ionicons name="arrow-forward" size={16} color="#000000" style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.demoBox}>
            <Ionicons name="key-outline" size={14} color="#a3a3a3" style={{ marginRight: 6 }} />
            <Text style={styles.demoText}>
              Demo: arjun.patel@dhwaniai.com / responder123
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.copyright}>DhwaniAI Acoustic Safety Network • Encrypted Portal</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  logoSection: { alignItems: 'center', paddingTop: 64, marginBottom: 28 },
  logoFrame: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    boxShadow: '0 0 24px rgba(255, 255, 255, 0.06)',
  },
  logoImage: { width: 48, height: 48 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 },
  titleAccent: { color: '#a3a3a3' },
  subtitle: { fontSize: 11, color: '#737373', marginTop: 4, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' },
  formSection: { paddingHorizontal: 24, flex: 1 },
  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#737373', marginBottom: 20 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 12, color: '#a3a3a3', marginBottom: 6, fontWeight: '500' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: '#ffffff',
  },
  loginBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnRow: { flexDirection: 'row', alignItems: 'center' },
  loginBtnText: { color: '#000000', fontSize: 15, fontWeight: '700' },
  demoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 10,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  demoText: { color: '#a3a3a3', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyright: { color: '#525252', fontSize: 10, textAlign: 'center', paddingBottom: 28 },
});
