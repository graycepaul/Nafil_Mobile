import { useLayoutEffect, useState } from 'react';
import { View, Text, Image, Pressable, Keyboard } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { pickPhoto } from '../../lib/pick-photo';
import { uploadAnnouncementPhoto } from '../../lib/announcement-photo';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import { Overlay } from '../../components/ui/Overlay';
import { AnnouncementsFeed, type AnnouncementSort } from '../../components/AnnouncementsFeed';
import { AlertCategoryPicker } from '../../components/AlertCategoryPicker';
import { SearchAndEstateFilter } from '../../components/admin/SearchAndEstateFilter';
import type { AlertCategory } from '../../types/database';

const SORT_LABELS: Record<AnnouncementSort, string> = {
  date: 'Date',
  estate: 'Estate',
  type: 'Alert type',
};

export default function AdminAnnouncementsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [category, setCategory] = useState<AlertCategory>('other');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string | null }>();
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; message: string }>();
  const [sortBy, setSortBy] = useState<AnnouncementSort>('date');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortOptions: AnnouncementSort[] = ['date', 'type'];
  const [listSearch, setListSearch] = useState('');

  const targetEstateId = profile?.estate_id;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setFormOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={formOpen ? 'Close form' : 'Post announcement'}
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

  async function addPhoto() {
    const result = await pickPhoto();
    if ('uri' in result) setPhoto({ uri: result.uri, mimeType: result.mimeType });
  }

  async function post() {
    if (!title.trim() || !body.trim() || !targetEstateId) return;
    setPosting(true);
    setNotice(undefined);

    let photoUrl: string | null = null;
    if (photo) {
      try {
        photoUrl = await uploadAnnouncementPhoto(targetEstateId, photo);
      } catch (uploadError) {
        setPosting(false);
        setNotice({ tone: 'error', message: (uploadError as Error).message });
        return;
      }
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        estate_id: targetEstateId,
        author_id: profile!.id,
        title: title.trim(),
        body: body.trim(),
        severity: emergency ? 'emergency' : 'info',
        category: emergency ? category : null,
        photo_url: photoUrl,
      })
      .select('id')
      .single();

    if (error || !data) {
      setPosting(false);
      setNotice({ tone: 'error', message: error?.message ?? 'Could not post this announcement.' });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['announcements'] });

    let toast: { tone: 'success' | 'error'; message: string } = {
      tone: 'success',
      message: 'Announcement posted.',
    };

    if (emergency) {
      // Same reasoning as security's Alert screen: the announcement above
      // is the in-app record, this is the part that reaches a resident's
      // phone even if they never open the app. A push failure here doesn't
      // undo the announcement — it's surfaced as its own toast instead.
      try {
        const result = await apiPost<{ recipients: number; tickets_sent: number; errors: string[] }>(
          '/alerts/broadcast',
          { title: title.trim(), body: body.trim(), category, estate_id: targetEstateId }
        );
        // A 200 response only means the backend accepted the request and tried
        // — Expo's API can still reject the whole batch, leaving tickets_sent
        // at 0 with no thrown error. `recipients` alone can't tell success
        // from that.
        if (result.tickets_sent === 0 && result.recipients > 0) {
          toast = {
            tone: 'error',
            message: `Announcement posted, but the push notification didn't send to any of the ${result.recipients} device${result.recipients === 1 ? '' : 's'} found.${result.errors[0] ? ` (${result.errors[0]})` : ''}`,
          };
        } else if (result.tickets_sent < result.recipients) {
          toast = {
            tone: 'success',
            message: `Alert sent: ${result.tickets_sent} of ${result.recipients} device${result.recipients === 1 ? '' : 's'} notified, plus the in-app announcement.`,
          };
        } else {
          toast = {
            tone: 'success',
            message: `Alert sent: ${result.recipients} device${result.recipients === 1 ? '' : 's'} notified, plus the in-app announcement.`,
          };
        }
      } catch (pushError) {
        toast = {
          tone: 'error',
          message: `Announcement posted, but the push notification failed: ${(pushError as Error).message}`,
        };
      }
    }

    setPosting(false);
    setTitle('');
    setBody('');
    setPhoto(undefined);
    setEmergency(false);
    setFormOpen(false);
    router.push(`/admin/announcement-detail?id=${data.id}&toast=${toast.tone}&toastMsg=${encodeURIComponent(toast.message)}`);
  }

  return (
    <>
    <AnnouncementsFeed
      sortBy={sortBy}
      search={listSearch}
      ListHeaderComponent={
        <View>
          {formOpen && (
            <View className="mb-lg">
          {notice && <Notice tone={notice.tone} message={notice.message} />}

          <Pressable
            onPress={() => setEmergency((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: emergency }}
            className="mb-lg flex-row items-center justify-between rounded-md border border-paper-200 p-md dark:border-ink-border"
          >
            <View className="flex-1 pr-md">
              <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                Emergency alert
              </Text>
              <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                Also pushes straight to every resident&apos;s phone, not just the in-app feed.
              </Text>
            </View>
            <View
              className={`h-6 w-6 items-center justify-center rounded-full border-[1.5px] ${
                emergency ? 'border-danger bg-danger' : 'border-paper-200 dark:border-ink-border'
              }`}
            >
              {emergency && <View className="h-2.5 w-2.5 rounded-full bg-white" />}
            </View>
          </Pressable>

          {emergency && <AlertCategoryPicker value={category} onChange={setCategory} />}

          <Input
            label="Title"
            showLabel
            placeholder="e.g. New visitor gate hours"
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <Input
            label="Message"
            showLabel
            placeholder="What do residents need to know?"
            value={body}
            onChangeText={setBody}
            multiline
          />

          <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">
            Photo — optional
          </Text>
          <View className="mb-lg flex-row gap-sm">
            {photo ? (
              <View className="relative">
                <Image source={{ uri: photo.uri }} className="h-20 w-20 rounded-md" />
                <Pressable
                  onPress={() => setPhoto(undefined)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  hitSlop={8}
                  className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-danger"
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ) : (
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
            label={emergency ? 'Send emergency alert' : 'Post announcement'}
            variant={emergency ? 'danger' : 'primary'}
            onPress={post}
            loading={posting}
            disabled={!title.trim() || !body.trim()}
          />
            </View>
          )}
          <View className="mb-sm mt-xl flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-paper-900 dark:text-ink-text">
              All announcements
            </Text>
            <Pressable
              onPress={() => setSortMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${SORT_LABELS[sortBy]}`}
              className="flex-row items-center gap-xs"
            >
              <Ionicons name="swap-vertical-outline" size={16} color={colors.primary} />
              <Text className="text-[13px] font-semibold text-brand-800 dark:text-brand-300">
                Sort: {SORT_LABELS[sortBy]}
              </Text>
            </Pressable>
          </View>
          <SearchAndEstateFilter
            search={listSearch}
            onSearchChange={setListSearch}
            placeholder="Search announcements"
          />
        </View>
      }
    />

      <Overlay visible={sortMenuOpen} onDismiss={() => setSortMenuOpen(false)}>
        <View className="rounded-lg bg-white p-xs dark:bg-ink-bg">
          {sortOptions.map((option, index) => {
            const active = sortBy === option;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  setSortBy(option);
                  setSortMenuOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`flex-row items-center justify-between px-md py-md ${
                  index === 0 ? '' : 'border-t border-paper-200 dark:border-ink-border'
                }`}
              >
                <Text
                  className={`text-base ${
                    active ? 'font-semibold text-brand-800 dark:text-brand-300' : 'text-paper-900 dark:text-ink-text'
                  }`}
                >
                  Sort by {SORT_LABELS[option]}
                </Text>
                {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </Overlay>
    </>
  );
}
