import { useState } from 'react';
import { Text, Keyboard, Pressable, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import { AlertCategoryPicker } from '../../components/AlertCategoryPicker';
import type { AlertCategory } from '../../types/database';

export default function SecurityAlertScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [category, setCategory] = useState<AlertCategory>('other');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; message: string }>();

  async function sendAlert() {
    if (!title.trim() || !body.trim() || !profile?.estate_id) return;
    setSending(true);
    setNotice(undefined);

    const { error } = await supabase.from('announcements').insert({
      estate_id: profile.estate_id,
      author_id: profile.id,
      title: title.trim(),
      body: body.trim(),
      severity: 'emergency',
      category,
    });

    if (error) {
      setSending(false);
      setNotice({ tone: 'error', message: error.message });
      return;
    }

    // The announcement above is what residents see if they open the app;
    // this is the part that reaches them even if they don't — a push
    // straight to their phone. If it fails, the alert has still gone out
    // in-app, so this is reported as its own (non-fatal) notice rather than
    // rolled back.
    try {
      const result = await apiPost<{ recipients: number; tickets_sent: number; errors: string[] }>(
        '/alerts/broadcast',
        { title: title.trim(), body: body.trim(), category }
      );
      // A 200 response only means the backend accepted the request and tried
      // — Expo's API can still reject the whole batch (as it silently did
      // until a payload bug was fixed here), leaving tickets_sent at 0 with
      // no thrown error. `recipients` alone can't tell success from that.
      if (result.tickets_sent === 0 && result.recipients > 0) {
        setNotice({
          tone: 'error',
          message: `Announcement posted, but the push notification didn't send to any of the ${result.recipients} device${result.recipients === 1 ? '' : 's'} found.${result.errors[0] ? ` (${result.errors[0]})` : ''}`,
        });
      } else if (result.tickets_sent < result.recipients) {
        setNotice({
          tone: 'success',
          message: `Alert sent: ${result.tickets_sent} of ${result.recipients} device${result.recipients === 1 ? '' : 's'} notified, plus the in-app announcement.`,
        });
      } else {
        setNotice({
          tone: 'success',
          message: `Alert sent: ${result.recipients} device${result.recipients === 1 ? '' : 's'} notified, plus the in-app announcement.`,
        });
      }
    } catch (pushError) {
      setNotice({
        tone: 'error',
        message: `Announcement posted, but the push notification failed: ${(pushError as Error).message}`,
      });
    }

    setSending(false);
    setTitle('');
    setBody('');
  }

  return (
    // Tapping anywhere outside the inputs dismisses the keyboard — without
    // this, the keyboard had no dismiss route on this screen (multiline body
    // text swallows the return key, and there's no "Done" bar), which could
    // leave the tab bar hidden behind it with no way back except sending.
    <Pressable onPress={() => Keyboard.dismiss()} className="flex-1 bg-white dark:bg-ink-bg" accessible={false}>
      <ScrollView contentContainerClassName="p-xl" keyboardShouldPersistTaps="handled">
        <Text className="mb-lg text-[13px] text-paper-500 dark:text-ink-textMuted">
          Sends an emergency push notification to every resident&apos;s phone in your estate, and
          posts it as an in-app announcement.
        </Text>

        {notice && <Notice tone={notice.tone} message={notice.message} />}

        <AlertCategoryPicker value={category} onChange={setCategory} />

        <Input
          label="Alert title"
          showLabel
          placeholder="e.g. Security breach at Gate 2"
          value={title}
          onChangeText={setTitle}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        <Input
          label="Details"
          showLabel
          placeholder="What's happening, and what should residents do?"
          value={body}
          onChangeText={setBody}
          multiline
          multilineHeight={110}
        />

        <Button
          label="Send emergency alert"
          variant="danger"
          onPress={sendAlert}
          loading={sending}
          disabled={!title.trim() || !body.trim()}
          className="mt-sm"
        />
      </ScrollView>
    </Pressable>
  );
}
