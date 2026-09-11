import { useState } from 'react';
import { Text, Keyboard, Pressable, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { friendlyDbError } from '../../lib/db-errors';
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

    // Goes to security_alerts, not announcements - reaches the estate's
    // admin/super_admin only (see 0044_security_alerts_to_admin.sql's
    // notify_security_alert_reported), never a direct resident-facing
    // broadcast. Admin reviews it and decides whether it's worth posting a
    // real announcement - that's their call, not security's, every time.
    const { error } = await supabase.from('security_alerts').insert({
      estate_id: profile.estate_id,
      author_id: profile.id,
      title: title.trim(),
      body: body.trim(),
      category,
    });

    setSending(false);

    if (error) {
      setNotice({ tone: 'error', message: friendlyDbError(error) });
      return;
    }

    setNotice({ tone: 'success', message: 'Sent to admin.' });
    setTitle('');
    setBody('');
  }

  return (
    // Tapping anywhere outside the inputs dismisses the keyboard - without
    // this, the keyboard had no dismiss route on this screen (multiline body
    // text swallows the return key, and there's no "Done" bar), which could
    // leave the tab bar hidden behind it with no way back except sending.
    <Pressable onPress={() => Keyboard.dismiss()} className="flex-1 bg-white dark:bg-ink-bg" accessible={false}>
      <ScrollView contentContainerClassName="p-xl" keyboardShouldPersistTaps="handled">
        <Text className="mb-lg text-[13px] text-paper-500 dark:text-ink-textMuted">
          Sends this straight to your estate&apos;s admin - not to residents. Admin will follow
          up directly, or post an announcement if residents need to know.
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
          placeholder="What's happening, and what should admin know?"
          value={body}
          onChangeText={setBody}
          multiline
          multilineHeight={110}
        />

        <Button
          label="Send to admin"
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
