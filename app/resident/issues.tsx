import { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { relativeTime } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Notice';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { WrenchIcon, PlusIcon } from '../../components/ui/icons';
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

export default function IssuesScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { colors, spacing, typography } = useTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const { new: openOnLoad } = useLocalSearchParams<{ new?: string }>();
  const [formOpen, setFormOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
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
          style={{ paddingHorizontal: spacing.lg }}
        >
          <View style={{ transform: [{ rotate: formOpen ? '45deg' : '0deg' }] }}>
            <PlusIcon color={colors.onHeaderBg} size={24} />
          </View>
        </Pressable>
      ),
    });
  }, [navigation, formOpen, colors.onHeaderBg, spacing.lg]);

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
    const { error } = await supabase.from('issues').insert({
      estate_id: profile.estate_id,
      resident_id: profile.id,
      category: category.trim(),
      description: description.trim(),
    });
    setSubmitting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setCategory('');
    setDescription('');
    setFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ['issues', profile.id] });
    queryClient.invalidateQueries({ queryKey: ['dashboard_open_issues'] });
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          {formOpen && (
            <Card style={{ marginBottom: spacing.lg }}>
              {formError && <Notice message={formError} />}
              <Input
                label="Category"
                placeholder="e.g. Plumbing, Electrical, Security"
                value={category}
                onChangeText={setCategory}
              />
              <Input
                label="Description"
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <Button
                label="Report issue"
                onPress={submitIssue}
                loading={submitting}
                disabled={!category.trim() || !description.trim()}
              />
            </Card>
          )}
          <Text
            style={[
              typography.subheading,
              { color: colors.text, marginBottom: spacing.sm },
            ]}
          >
            Your reports
          </Text>
        </View>
      }
      data={issues ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          icon={<WrenchIcon color={colors.textMuted} size={26} />}
          title="No issues reported"
          message="Anything broken or worth flagging? Tap + up top to report it."
        />
      }
      renderItem={({ item }) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1 }]}>
              {item.category}
            </Text>
            <StatusBadge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
          </View>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
            {item.description}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
            {relativeTime(item.created_at)}
            {item.resolved_at ? ` · resolved ${relativeTime(item.resolved_at)}` : ''}
          </Text>
        </Card>
      )}
    />
  );
}
