import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: 'pulse-outline',
    title: 'AI Acoustic Intelligence',
    description: 'Real-time deep audio spectral classifier scanning for emergency distress signatures.',
  },
  {
    id: '2',
    icon: 'notifications-circle-outline',
    title: 'Real-Time Dispatch',
    description: 'Instant tactical alert notifications streamed to active field responders.',
  },
  {
    id: '3',
    icon: 'navigate-circle-outline',
    title: 'Tactical Navigation',
    description: 'GPS route guidance directly to acoustic incident coordinates.',
  },
  {
    id: '4',
    icon: 'checkmark-done-circle-outline',
    title: 'Rapid Incident Field Log',
    description: 'File encrypted audio evidence, field status reports, and resolve incidents.',
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
      <View style={styles.cardFrame}>
        <View style={styles.iconCircle}>
          <Ionicons name={item.icon as any} size={48} color="#ffffff" />
        </View>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Dhwani<Text style={{ color: '#a3a3a3' }}>AI</Text></Text>
        </View>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

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

      <View style={styles.footer}>
        <View style={styles.dotsContainer}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, currentIndex === i && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.nextBtn}>
          <Text style={styles.nextText}>
            {currentIndex === slides.length - 1 ? 'Enter Command Portal' : 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#000000" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 28, height: 28, marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  skipText: { color: '#a3a3a3', fontSize: 12, fontWeight: '600' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  cardFrame: {
    width: '100%',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  slideTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 12 },
  slideDescription: { fontSize: 14, color: '#a3a3a3', textAlign: 'center', lineHeight: 22 },
  footer: { paddingHorizontal: 24, paddingBottom: 40 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#262626', marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: '#ffffff' },
  nextBtn: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { color: '#000000', fontSize: 15, fontWeight: '700' },
});
