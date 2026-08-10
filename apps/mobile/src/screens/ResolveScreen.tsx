import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { EVENT_LABELS, EVENT_ICONS } from '../theme';
import api from '../services/api';

export default function ResolveScreen({ route, navigation }: any) {
  const { incident } = route.params;
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const resolveMut = useMutation({
    mutationFn: () => api.post(`/incidents/${incident.id}/resolve`, {
      description: description || `Incident resolved on-site by responder`,
      evidenceNotes,
      imageUrls: images,
    }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      Alert.alert('Field Incident Logged', 'Incident report submitted and status updated to RESOLVED.', [
        { text: 'Acknowledge', onPress: () => navigation.navigate('Main') },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to transmit incident log. Please retry.');
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Error', 'Camera access is required to capture field evidence.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Modal Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="close" size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>INCIDENT FIELD RESOLUTION</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Incident Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.iconBox}>
            <Ionicons
              name={(EVENT_ICONS[incident.event?.type] || 'warning-outline') as any}
              size={22}
              color="#ffffff"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryType}>
              {EVENT_LABELS[incident.event?.type] || incident.event?.type?.replace(/_/g, ' ')}
            </Text>
            <Text style={styles.summaryAddress} numberOfLines={1}>{incident.event?.address || 'Tactical Sector'}</Text>
          </View>
        </View>

        {/* Resolution Notes Input */}
        <Text style={styles.label}>Field Action Report *</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter on-site findings, tactical intervention summary, and resolution..."
          placeholderTextColor="#525252"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Evidence Notes Input */}
        <Text style={styles.label}>Witness & Evidence Observations</Text>
        <TextInput
          style={styles.textArea}
          value={evidenceNotes}
          onChangeText={setEvidenceNotes}
          placeholder="Optional witness testimonies, physical evidence serials..."
          placeholderTextColor="#525252"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Photo Upload Buttons */}
        <Text style={styles.label}>Photographic Evidence Capture</Text>
        <View style={styles.photoRow}>
          <TouchableOpacity onPress={takePhoto} activeOpacity={0.85} style={styles.photoBtn}>
            <Ionicons name="camera-outline" size={22} color="#ffffff" />
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.85} style={styles.photoBtn}>
            <Ionicons name="images-outline" size={22} color="#ffffff" />
            <Text style={styles.photoBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {images.length > 0 && (
          <View style={styles.imageGrid}>
            {images.map((uri, i) => (
              <View key={i} style={styles.imageThumb}>
                <TouchableOpacity
                  onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                  style={styles.removeImage}
                >
                  <Ionicons name="close-circle" size={18} color="#ef4444" />
                </TouchableOpacity>
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={20} color="#737373" />
                  <Text style={styles.imageNumber}>Ev. #{i + 1}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Submit Action */}
        <TouchableOpacity
          onPress={() => resolveMut.mutate()}
          disabled={resolveMut.isPending}
          activeOpacity={0.85}
          style={styles.submitBtn}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#000000" />
          <Text style={styles.submitBtnText}>
            {resolveMut.isPending ? 'Transmitting Field Log...' : 'Submit Resolution & Close Alert'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 11, fontWeight: '800', color: '#737373', letterSpacing: 1.5 },
  scroll: { padding: 20 },
  summaryCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryType: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  summaryAddress: { fontSize: 12, color: '#737373', marginTop: 2 },
  label: { fontSize: 11, fontWeight: '700', color: '#737373', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1 },
  textArea: {
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 90,
  },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderStyle: 'dashed',
  },
  photoBtnText: { fontSize: 13, color: '#ffffff', marginTop: 6, fontWeight: '600' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  imageThumb: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  removeImage: { position: 'absolute', top: 2, right: 2, zIndex: 1 },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#171717', alignItems: 'center', justifyContent: 'center' },
  imageNumber: { fontSize: 9, color: '#737373', marginTop: 2 },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    marginTop: 28,
  },
  submitBtnText: { color: '#000000', fontSize: 15, fontWeight: '700' },
});
