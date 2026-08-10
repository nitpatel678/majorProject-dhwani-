import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { theme } from '../theme';

export default function SplashScreen() {
  const scaleAnim = new Animated.Value(0.8);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
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
        <Text style={styles.subtitle}>Acoustic Safety Monitor</Text>
      </Animated.View>
      <Animated.View style={[styles.footer, { opacity: opacityAnim }]}>
        <View style={styles.loadingBar}>
          <Animated.View style={styles.loadingFill} />
        </View>
        <Text style={styles.versionText}>v1.0 • Encrypted Responder Node</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoFrame: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)',
  },
  logoImage: {
    width: 64,
    height: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: '#a3a3a3',
  },
  subtitle: {
    fontSize: 12,
    color: '#737373',
    marginTop: 6,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  loadingBar: {
    width: 140,
    height: 3,
    backgroundColor: '#171717',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingFill: {
    width: '70%',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  versionText: {
    fontSize: 11,
    color: '#525252',
    letterSpacing: 0.5,
  },
});
