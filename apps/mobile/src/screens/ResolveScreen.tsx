import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { theme, EVENT_LABELS, EVENT_ICONS } from '../theme';
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
      Alert.alert('✅ Resolved', 'Incident has been marked as resolved.', [
        { text: 'OK', onPress: () => navigation.navigate('Main') },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to resolve incident. Please try again.');
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
      Alert.alert('Permission', 'Camera access is required to take evidence photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#12121A']} style={StyleSheet.absoluteFill} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resolve Incident</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Incident Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>{EVENT_ICONS[incident.event?.type] || '🚨'}</Text>
          <View>
            <Text style={styles.summaryType}>
              {EVENT_LABELS[incident.event?.type] || incident.event?.type?.replace(/_/g, ' ')}
            </Text>
            <Text style={styles.summaryAddress} numberOfLines={1}>{incident.event?.address}</Text>
          </View>
        </View>

        {/* Resolution Notes */}
        <Text style={styles.label}>Resolution Notes *</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what happened and how the incident was resolved..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Evidence Notes */}
        <Text style={styles.label}>Evidence Notes</Text>
        <TextInput
          style={styles.textArea}
          value={evidenceNotes}
          onChangeText={setEvidenceNotes}
          placeholder="Any evidence collected, witness statements, etc."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Photo Evidence */}
        <Text style={styles.label}>Photo Evidence</Text>
        <View style={styles.photoRow}>
          <TouchableOpacity onPress={takePhoto} style={styles.photoBtn}>
            <Ionicons name="camera" size={24} color={theme.colors.primary} />
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={styles.photoBtn}>
            <Ionicons name="images" size={24} color={theme.colors.primary} />
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
                  <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
                </TouchableOpacity>
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image" size={24} color={theme.colors.textMuted} />
                  <Text style={styles.imageNumber}>{i + 1}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={() => resolveMut.mutate()}
          disabled={resolveMut.isPending}
          activeOpacity={0.8}
          style={{ marginTop: 24 }}
        >
          <LinearGradient colors={[theme.colors.success, '#00C853']} style={styles.submitBtn}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.submitBtnText}>
              {resolveMut.isPending ? 'Submitting...' : 'Resolve Incident'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  scroll: { padding: 20 },
  summaryCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, borderWidth: 1, borderColor: theme.colors.border },
  summaryIcon: { fontSize: 36 },
  summaryType: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text },
  summaryAddress: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2, maxWidth: 250 },
  label: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8, marginTop: 16 },
  textArea: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 16, fontSize: theme.fontSize.md, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, minHeight: 100 },
  photoRow: { flexDirection: 'row', gap: 12 },
  photoBtn: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed' },
  photoBtnText: { fontSize: theme.fontSize.sm, color: theme.colors.primary, marginTop: 8, fontWeight: '600' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  imageThumb: { width: 72, height: 72, borderRadius: theme.radius.md, overflow: 'hidden', position: 'relative' },
  removeImage: { position: 'absolute', top: -2, right: -2, zIndex: 1 },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: theme.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  imageNumber: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 },
  submitBtn: { borderRadius: theme.radius.lg, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitBtnText: { color: '#fff', fontSize: theme.fontSize.lg, fontWeight: '800' },
});
