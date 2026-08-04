import { useState } from 'react';
import { View, Text } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';

export default function SecurityAlertScreen() {
  const profile = useAuthStore((s) => s.profile);
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
    });
    setSending(false);
    if (error) {
      setNotice({ tone: 'error', message: error.message });
      return;
    }
    setTitle('');
    setBody('');
    setNotice({ tone: 'success', message: 'Alert sent. All residents in this estate have been notified.' });
  }

  return (
    <View className="flex-1 bg-white p-xl dark:bg-ink-bg">
      <Text className="mb-lg text-[13px] text-paper-500 dark:text-ink-textMuted">
        This sends an emergency notification to every resident in your estate.
      </Text>

      {notice && <Notice tone={notice.tone} message={notice.message} />}

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
