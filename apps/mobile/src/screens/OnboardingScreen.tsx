import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: '🎙️',
    title: 'AI-Powered Detection',
    description: 'Advanced acoustic analysis using MobileNet AI model to detect dangerous sounds in real-time',
    gradient: [theme.colors.primary, '#4C3DB5'],
  },
  {
    id: '2',
    icon: '🚨',
    title: 'Instant Alerts',
    description: 'Receive critical alerts the moment an emergency event is detected near your patrol area',
    gradient: [theme.colors.danger, '#D32F2F'],
  },
  {
    id: '3',
    icon: '🗺️',
    title: 'Smart Navigation',
    description: 'GPS-guided navigation to incident locations with real-time responder coordination',
    gradient: [theme.colors.accent, '#00B8D9'],
  },
  {
    id: '4',
    icon: '📋',
    title: 'Quick Resolution',
    description: 'File reports, upload evidence, and resolve incidents directly from your device',
    gradient: [theme.colors.success, '#00C853'],
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const handleSkip = () => {
    navigation.replace('Login');
  };

  const renderSlide = ({ item }: { item: typeof slides[0] }) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.iconContainer}>
        <LinearGradient colors={item.gradient as [string, string]} style={styles.iconGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.icon}>{item.icon}</Text>
        </LinearGradient>
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#12121A']} style={StyleSheet.absoluteFill} />
      
      <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, currentIndex === i && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
        <LinearGradient colors={[theme.colors.primary, theme.colors.primaryLight]} style={styles.nextBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={styles.nextText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  skipBtn: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
  skipText: { color: theme.colors.textMuted, fontSize: theme.fontSize.md, fontWeight: '500' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconContainer: { marginBottom: 40 },
  iconGradient: { width: 120, height: 120, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 56 },
  slideTitle: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text, textAlign: 'center', marginBottom: 12 },
  slideDescription: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.elevated, marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: theme.colors.primary },
  nextBtn: { marginHorizontal: 24, marginBottom: 40 },
  nextBtnGradient: { paddingVertical: 16, borderRadius: theme.radius.lg, alignItems: 'center' },
  nextText: { color: '#fff', fontSize: theme.fontSize.lg, fontWeight: '700' },
});
