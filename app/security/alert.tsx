import { useState } from 'react';
import { View, Text } from 'react-native';
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
      const result = await apiPost<{ recipients: number }>('/alerts/broadcast', {
        title: title.trim(),
        body: body.trim(),
        category,
      });
      setNotice({
        tone: 'success',
        message: `Alert sent — ${result.recipients} device${result.recipients === 1 ? '' : 's'} notified, plus the in-app announcement.`,
      });
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
    <View className="flex-1 bg-white p-xl dark:bg-ink-bg">
      <Text className="mb-lg text-[13px] text-paper-500 dark:text-ink-textMuted">
        Sends an emergency push notification to every resident's phone in your estate, and
        posts it as an in-app announcement.
      </Text>

      {notice && <Notice tone={notice.tone} message={notice.message} />}

      <AlertCategoryPicker value={category} onChange={setCategory} />

      <Input label="Alert title" value={title} onChangeText={setTitle} />
      <Input label="Details" value={body} onChangeText={setBody} multiline multilineHeight={110} />

      <Button
        label="Send emergency alert"
        variant="danger"
        onPress={sendAlert}
        loading={sending}
        disabled={!title.trim() || !body.trim()}
        className="mt-sm"
      />
    </View>
  );
}
