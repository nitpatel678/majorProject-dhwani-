import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme } from '../theme';
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
      case 'EMERGENCY': return { icon: 'warning', color: theme.colors.danger };
      case 'ASSIGNMENT': return { icon: 'person-add', color: theme.colors.primary };
      case 'SYSTEM': return { icon: 'information-circle', color: theme.colors.info };
      case 'DEVICE': return { icon: 'hardware-chip', color: theme.colors.accent };
      default: return { icon: 'notifications', color: theme.colors.textSecondary };
    }
  };

  const renderNotification = ({ item }: { item: any }) => {
    const { icon, color } = getNotifIcon(item.type);
    return (
      <TouchableOpacity
        onPress={() => !item.read && markReadMut.mutate(item.id)}
        style={[styles.notifCard, !item.read && styles.notifUnread]}
        activeOpacity={0.8}
      >
        <View style={[styles.notifIcon, { backgroundColor: `${color}15` }]}>
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
      <LinearGradient colors={['#0A0A0F', '#12121A']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>{data?.unreadCount || 0} unread</Text>
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
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>You'll be notified when alerts are assigned</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.text },
  headerSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
  markAllBtn: { backgroundColor: theme.colors.elevated, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  markAllText: { fontSize: theme.fontSize.xs, color: theme.colors.primaryLight, fontWeight: '600' },
  list: { padding: 20 },
  notifCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 16, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  notifIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  notifMessage: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 18 },
  notifTime: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginLeft: 8, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 64, marginBottom: 16, opacity: 0.3 },
  emptyText: { fontSize: theme.fontSize.lg, fontWeight: '600', color: theme.colors.textSecondary },
  emptySubtext: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 4 },
});
