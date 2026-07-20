import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

export default function SplashScreen() {
  const scaleAnim = new Animated.Value(0.5);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#12121A', '#0A0A0F']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        <LinearGradient colors={[theme.colors.primary, theme.colors.accent]} style={styles.logoBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.logoText}>D</Text>
        </LinearGradient>
        <Text style={styles.title}>
          Dhwani<Text style={styles.titleAccent}>AI</Text>
        </Text>
        <Text style={styles.subtitle}>Responder</Text>
      </Animated.View>
      <Animated.View style={[styles.loading, { opacity: opacityAnim }]}>
        <View style={styles.loadingBar}>
          <Animated.View style={[styles.loadingFill, { width: '60%' }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' },
  logoContainer: { alignItems: 'center' },
  logoBox: { width: 80, height: 80, borderRadius: theme.radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...theme.shadows.glow },
  logoText: { fontSize: 36, fontWeight: '900', color: '#fff' },
  title: { fontSize: 32, fontWeight: '800', color: theme.colors.text },
  titleAccent: { color: theme.colors.primary },
  subtitle: { fontSize: theme.fontSize.md, color: theme.colors.textMuted, marginTop: 4, letterSpacing: 4, textTransform: 'uppercase' },
  loading: { position: 'absolute', bottom: 100, width: 120 },
  loadingBar: { height: 3, backgroundColor: theme.colors.elevated, borderRadius: 2, overflow: 'hidden' },
  loadingFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 2 },
});
