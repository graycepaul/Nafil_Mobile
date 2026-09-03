import { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable, Image } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { relativeTime } from '../../lib/format';
import { pickPhoto } from '../../lib/pick-photo';
import { uploadIssuePhotos } from '../../lib/issue-photos';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Notice';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { Issue, IssueStatus } from '../../types/database';

const STATUS_TONE: Record<IssueStatus, BadgeTone> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
};

const STATUS_LABEL: Record<IssueStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
};

const MAX_PHOTOS = 4;

export default function IssuesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const router = useRouter();
  const { new: openOnLoad } = useLocalSearchParams<{ new?: string }>();
  const [formOpen, setFormOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoMimeTypes, setPhotoMimeTypes] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function addPhoto() {
    if (photos.length >= MAX_PHOTOS) return;
    const result = await pickPhoto();
    if ('uri' in result) {
      setPhotos((prev) => [...prev, result.uri]);
      setPhotoMimeTypes((prev) => ({ ...prev, [result.uri]: result.mimeType }));
    } else if ('error' in result) setFormError(result.error);
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-opens on repeat deep link even after the resident closes it
    if (openOnLoad) setFormOpen(true);
  }, [openOnLoad]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setFormOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={formOpen ? 'Close form' : 'Report issue'}
          hitSlop={8}
          className="px-lg"
        >
          <View style={{ transform: [{ rotate: formOpen ? '45deg' : '0deg' }] }}>
            <Ionicons name="add" color={colors.onHeaderBg} size={24} />
          </View>
        </Pressable>
      ),
    });
  }, [navigation, formOpen, colors.onHeaderBg]);

  const { data: issues, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['issues', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Issue[];
    },
    enabled: !!profile,
  });

  async function submitIssue() {
    if (!category.trim() || !description.trim() || !profile?.estate_id) return;
    setFormError(undefined);
    setSubmitting(true);
    try {
      const photoUrls =
        photos.length > 0
          ? await uploadIssuePhotos(
              profile.id,
              photos.map((uri) => ({ uri, mimeType: photoMimeTypes[uri] ?? null }))
            )
          : [];
      const { error } = await supabase.from('issues').insert({
        estate_id: profile.estate_id,
        resident_id: profile.id,
        category: category.trim(),
        description: description.trim(),
        photo_urls: photoUrls,
      });
      if (error) throw error;
      setCategory('');
      setDescription('');
      setPhotos([]);
      setPhotoMimeTypes({});
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['issues', profile.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_open_issues'] });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not report this issue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
    <FlatList
      className="bg-white dark:bg-ink-bg"
      contentContainerClassName="p-xl"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          {formOpen && (
            <Card className="mb-lg">
              {formError && <Notice message={formError} />}
              <Input
                label="Category"
                showLabel
                placeholder="e.g. Plumbing, Electrical, Security"
                value={category}
                onChangeText={setCategory}
              />
              <Input
                label="Description"
                showLabel
                placeholder="What's the issue, and where?"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">
                Photos ({photos.length}/{MAX_PHOTOS}) — optional
              </Text>
              <View className="mb-lg flex-row flex-wrap gap-sm">
                {photos.map((uri) => (
                  <View key={uri} className="relative">
                    <Image source={{ uri }} className="h-20 w-20 rounded-md" />
                    <Pressable
                      onPress={() => removePhoto(uri)}
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                      hitSlop={8}
                      className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-danger"
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </Pressable>
                  </View>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <Pressable
                    onPress={addPhoto}
                    accessibilityRole="button"
                    accessibilityLabel="Add photo"
                    className="h-20 w-20 items-center justify-center rounded-md border border-dashed border-paper-200 dark:border-ink-border"
                  >
                    <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>

              <Button
                label="Report issue"
                onPress={submitIssue}
                loading={submitting}
                disabled={!category.trim() || !description.trim()}
              />
            </Card>
          )}
          <Text className="mb-sm text-lg font-semibold text-paper-900 dark:text-ink-text">
            Your reports
          </Text>
        </View>
      }
      data={issues ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          icon={<Ionicons name="build-outline" color={colors.textMuted} size={26} />}
          title="No issues reported"
          message="Anything broken or worth flagging? Tap + up top to report it."
        />
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/resident/issue-detail?id=${item.id}`)}>
          <Card className="flex-row gap-md">
            {item.photo_urls[0] && (
              <Image source={{ uri: item.photo_urls[0] }} className="h-16 w-16 rounded-md" />
            )}
            <View className="flex-1">
              <View className="flex-row items-start justify-between gap-sm">
                <Text className="flex-1 text-base font-semibold text-paper-900 dark:text-ink-text">
                  {item.category}
                </Text>
                <StatusBadge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
              </View>
              <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted" numberOfLines={1}>
                {item.description}
              </Text>
              <Text className="mt-sm text-[13px] text-paper-500 dark:text-ink-textMuted">
                {relativeTime(item.created_at)}
                {item.resolved_at ? ` · resolved ${relativeTime(item.resolved_at)}` : ''}
              </Text>
            </View>
          </Card>
        </Pressable>
      )}
    />

      <Pressable
        onPress={() => router.push('/resident/announcements')}
        accessibilityRole="button"
        accessibilityLabel="Announcements"
        className="absolute bottom-xl right-xl h-14 w-14 items-center justify-center rounded-full bg-brand-800 shadow-lg active:opacity-90 dark:bg-brand-500"
      >
        <Ionicons name="megaphone-outline" color="#fff" size={22} />
      </Pressable>
    </View>
  );
}
