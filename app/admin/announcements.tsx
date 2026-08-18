import { useState } from 'react';
import { View, Text, Pressable, Keyboard } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import { AnnouncementsFeed } from '../../components/AnnouncementsFeed';
import { AlertCategoryPicker } from '../../components/AlertCategoryPicker';
import type { AlertCategory } from '../../types/database';

export default function AdminAnnouncementsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const isSuperAdmin = profile?.role === 'super_admin';
  const [emergency, setEmergency] = useState(false);
  const [category, setCategory] = useState<AlertCategory>('other');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [estateId, setEstateId] = useState<string | undefined>(profile?.estate_id ?? undefined);
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; message: string }>();

  const { data: estates } = useQuery({
    queryKey: ['all_estates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estates').select('id, name').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: isSuperAdmin,
  });

  const targetEstateId = isSuperAdmin ? estateId : profile?.estate_id;

  async function post() {
    if (!title.trim() || !body.trim() || !targetEstateId) return;
    setPosting(true);
    setNotice(undefined);

    const { error } = await supabase.from('announcements').insert({
      estate_id: targetEstateId,
      author_id: profile!.id,
      title: title.trim(),
      body: body.trim(),
      severity: emergency ? 'emergency' : 'info',
      category: emergency ? category : null,
    });

    if (error) {
      setPosting(false);
      setNotice({ tone: 'error', message: error.message });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['announcements'] });

    if (emergency) {
      // Same reasoning as security's Alert screen: the announcement above
      // is the in-app record, this is the part that reaches a resident's
      // phone even if they never open the app. A push failure here doesn't
      // undo the announcement — it's surfaced as its own notice instead.
      try {
        const result = await apiPost<{ recipients: number }>('/alerts/broadcast', {
          title: title.trim(),
          body: body.trim(),
          category,
          estate_id: targetEstateId,
        });
        setNotice({
          tone: 'success',
          message: `Alert sent: ${result.recipients} device${result.recipients === 1 ? '' : 's'} notified, plus the in-app announcement.`,
        });
      } catch (pushError) {
        setNotice({
          tone: 'error',
          message: `Announcement posted, but the push notification failed: ${(pushError as Error).message}`,
        });
      }
    } else {
      setNotice({ tone: 'success', message: 'Announcement posted.' });
    }

    setPosting(false);
    setTitle('');
    setBody('');
    setEmergency(false);
  }

  return (
    <AnnouncementsFeed
      showEstate={isSuperAdmin}
      ListHeaderComponent={
        <View>
          {notice && <Notice tone={notice.tone} message={notice.message} />}

          {isSuperAdmin && estates && estates.length > 1 && (
            <View className="mb-lg">
              <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">Estate</Text>
              <View className="flex-row flex-wrap gap-sm">
                {estates.map((e) => {
                  const active = estateId === e.id;
                  return (
                    <Pressable
                      key={e.id}
                      onPress={() => setEstateId(e.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      className={`rounded-full border px-md py-xs ${
                        active
                          ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300'
                          : 'border-paper-200 dark:border-ink-border'
                      }`}
                    >
                      <Text
                        className={`text-[13px] font-medium ${
                          active ? 'text-white dark:text-ink-bg' : 'text-paper-500 dark:text-ink-textMuted'
                        }`}
                      >
                        {e.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

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
          <Button
            label={emergency ? 'Send emergency alert' : 'Post announcement'}
            variant={emergency ? 'danger' : 'primary'}
            onPress={post}
            loading={posting}
            disabled={!title.trim() || !body.trim()}
          />
          <Text className="mb-sm mt-xl text-lg font-semibold text-paper-900 dark:text-ink-text">
            All announcements
          </Text>
        </View>
      }
    />
  );
}
