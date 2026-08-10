import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 15000,
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/read/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMut = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'EMERGENCY': return { icon: 'warning-outline', color: '#ef4444' };
      case 'ASSIGNMENT': return { icon: 'shield-outline', color: '#ffffff' };
      case 'SYSTEM': return { icon: 'hardware-chip-outline', color: '#a3a3a3' };
      case 'DEVICE': return { icon: 'radio-outline', color: '#a3a3a3' };
      default: return { icon: 'notifications-outline', color: '#737373' };
    }
  };

  const renderNotification = ({ item }: { item: any }) => {
    const { icon, color } = getNotifIcon(item.type);
    return (
      <TouchableOpacity
        onPress={() => !item.read && markReadMut.mutate(item.id)}
        style={[styles.notifCard, !item.read && styles.notifUnread]}
        activeOpacity={0.85}
      >
        <View style={styles.notifIconBox}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.notifTime}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>System Notifications</Text>
          <Text style={styles.headerSubtitle}>{data?.unreadCount || 0} unread dispatch alerts</Text>
        </View>
        {(data?.unreadCount || 0) > 0 && (
          <TouchableOpacity onPress={() => markAllReadMut.mutate()} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={data?.notifications || []}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#ffffff" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#525252" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>No Active Notifications</Text>
            <Text style={styles.emptySubtext}>You will receive alerts here when assigned to field incidents.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: '#737373', marginTop: 2 },
  markAllBtn: { backgroundColor: '#171717', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  markAllText: { fontSize: 11, color: '#ffffff', fontWeight: '600' },
  list: { padding: 20 },
  notifCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: '#ffffff' },
  notifIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#ffffff', marginBottom: 2 },
  notifMessage: { fontSize: 13, color: '#a3a3a3', lineHeight: 18 },
  notifTime: { fontSize: 10, color: '#737373', marginTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', marginLeft: 8, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  emptySubtext: { fontSize: 12, color: '#737373', marginTop: 4, textAlign: 'center' },
});
