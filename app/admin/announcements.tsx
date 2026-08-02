import { useState } from 'react';
import { View, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import { AnnouncementsFeed } from '../../components/AnnouncementsFeed';

export default function AdminAnnouncementsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors, spacing, typography } = useTheme();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function post() {
    if (!title.trim() || !body.trim() || !profile?.estate_id) return;
    setPosting(true);
    setFormError(undefined);
    const { error } = await supabase.from('announcements').insert({
      estate_id: profile.estate_id,
      author_id: profile.id,
      title: title.trim(),
      body: body.trim(),
      severity: 'info',
    });
    setPosting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setTitle('');
    setBody('');
    queryClient.invalidateQueries({ queryKey: ['announcements'] });
  }

  return (
    <AnnouncementsFeed
      ListHeaderComponent={
        <View>
          {formError && <Notice message={formError} />}
          <Input label="Title" value={title} onChangeText={setTitle} />
          <Input label="Message" value={body} onChangeText={setBody} multiline />
          <Button
            label="Post announcement"
            onPress={post}
            loading={posting}
            disabled={!title.trim() || !body.trim()}
          />
          <Text
            style={[
              typography.subheading,
              { color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
            ]}
          >
            All announcements
          </Text>
        </View>
      }
    />
  );
}
