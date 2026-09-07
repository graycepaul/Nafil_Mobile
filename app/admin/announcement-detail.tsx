import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { friendlyDbError } from '../../lib/db-errors';
import { pickPhoto } from '../../lib/pick-photo';
import { uploadAnnouncementPhoto } from '../../lib/announcement-photo';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { relativeTime } from '../../lib/format';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Toast } from '../../components/ui/Toast';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Notice';
import { emergencyLabel } from '../../components/AnnouncementsFeed';
import type { Announcement } from '../../types/database';

type AnnouncementWithEstate = Announcement & { estate: { name: string } | null };

const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** Ticks every 30s so the edit affordance disappears promptly once the window closes, not just on the next unrelated re-render. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function AdminAnnouncementDetailScreen() {
  const { id, toast: toastTone, toastMsg } = useLocalSearchParams<{ id: string; toast?: string; toastMsg?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const isSuperAdmin = profile?.role === 'super_admin';
  const now = useNow(30_000);
  // Read once on arrival - the toast is transient, it's fine if it wouldn't
  // replay on a later re-visit to this same URL (state resets per mount).
  const [toast] = useState(() =>
    toastTone && toastMsg ? { tone: toastTone as 'success' | 'error', message: toastMsg } : undefined
  );
  const [toastVisible, setToastVisible] = useState(!!toast);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editPhoto, setEditPhoto] = useState<{ uri: string; mimeType: string | null } | null>();
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string>();

  const { data: announcement, isLoading } = useQuery({
    queryKey: ['announcement_admin', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*, estate:estates(name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as AnnouncementWithEstate;
    },
    enabled: !!id,
  });

  const canEdit =
    !!announcement &&
    announcement.author_id === profile?.id &&
    now - new Date(announcement.created_at).getTime() < EDIT_WINDOW_MS;

  function startEditing() {
    if (!announcement) return;
    setEditTitle(announcement.title);
    setEditBody(announcement.body);
    setEditPhoto(
      announcement.photo_url ? { uri: announcement.photo_url, mimeType: null } : undefined
    );
    setEditError(undefined);
    setEditing(true);
  }

  async function addEditPhoto() {
    const result = await pickPhoto();
    if ('uri' in result) setEditPhoto({ uri: result.uri, mimeType: result.mimeType });
    else if ('error' in result) setEditError(result.error);
  }

  async function saveEdit() {
    if (!announcement || !editTitle.trim() || !editBody.trim()) return;
    setSaving(true);
    setEditError(undefined);
    try {
      let photoUrl: string | null = announcement.photo_url;
      if (editPhoto === null) {
        photoUrl = null;
      } else if (editPhoto && editPhoto.uri !== announcement.photo_url) {
        photoUrl = await uploadAnnouncementPhoto(announcement.estate_id, editPhoto);
      }

      const { error } = await supabase
        .from('announcements')
        .update({ title: editTitle.trim(), body: editBody.trim(), photo_url: photoUrl })
        .eq('id', announcement.id);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['announcement_admin', id] });
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setEditing(false);
    } catch (err) {
      setEditError(friendlyDbError(err));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-ink-bg">
        <View style={{ paddingTop: insets.top + 16 }} className="flex-row items-center gap-md px-lg pb-lg">
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
          <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Announcement</Text>
        </View>
        <View className="gap-sm p-lg">
          <Skeleton className="h-6 w-3/4 rounded-sm" />
          <Skeleton className="mt-md h-3 w-full rounded-sm" />
          <Skeleton className="h-3 w-full rounded-sm" />
          <Skeleton className="h-3 w-2/3 rounded-sm" />
        </View>
      </View>
    );
  }

  if (!announcement) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <Text className="text-paper-900 dark:text-ink-text">Announcement not found.</Text>
      </View>
    );
  }

  const isEmergency = announcement.severity === 'emergency';

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      {toast && toastVisible && (
        <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToastVisible(false)} />
      )}
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md px-lg pb-lg"
      >
        <Pressable
          onPress={() => (editing ? setEditing(false) : router.back())}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="flex-1 text-[22px] font-bold text-paper-900 dark:text-ink-text">
          {editing ? 'Edit announcement' : 'Announcement'}
        </Text>
        {canEdit && !editing && (
          <Pressable
            onPress={startEditing}
            accessibilityRole="button"
            accessibilityLabel="Edit announcement"
            hitSlop={8}
          >
            <Ionicons name="pencil-outline" color={colors.onHeaderBg} size={20} />
          </Pressable>
        )}
      </View>

      {editing ? (
        <ScrollView contentContainerClassName="p-lg">
          {editError && <Notice message={editError} />}
          <Notice
            tone="success"
            message="You can edit this for 15 minutes after posting. It won't be sent as a new alert."
          />
          <Input label="Title" showLabel value={editTitle} onChangeText={setEditTitle} />
          <Input label="Message" showLabel value={editBody} onChangeText={setEditBody} multiline />

          <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">
            Photo - optional
          </Text>
          <View className="mb-lg">
            {editPhoto ? (
              <View className="relative w-full">
                <Image source={{ uri: editPhoto.uri }} className="h-40 w-full rounded-md" />
                <Pressable
                  onPress={() => setEditPhoto(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  hitSlop={8}
                  className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-danger"
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={addEditPhoto}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
                className="h-40 w-full items-center justify-center gap-xs rounded-md border border-dashed border-paper-200 dark:border-ink-border"
              >
                <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
                <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">Tap to add a photo</Text>
              </Pressable>
            )}
          </View>

          <Button
            label="Save changes"
            onPress={saveEdit}
            loading={saving}
            disabled={!editTitle.trim() || !editBody.trim()}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerClassName="p-lg">
          {announcement.photo_url && (
            <RemoteImage uri={announcement.photo_url} className="mb-lg h-56 w-full rounded-md" />
          )}
          {isEmergency && (
            <View className="mb-sm">
              <StatusBadge label={emergencyLabel(announcement.category)} tone="danger" />
            </View>
          )}
          <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">{announcement.title}</Text>
          <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
            {relativeTime(announcement.created_at)}
            {isSuperAdmin && announcement.estate?.name ? ` · ${announcement.estate.name}` : ''}
          </Text>
          <Text className="mt-lg text-[15px] leading-[22px] text-paper-900 dark:text-ink-text">
            {announcement.body}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
