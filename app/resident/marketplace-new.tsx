import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Notice';
import { LISTING_CATEGORIES, type ListingCategory } from '../../components/resident/marketplace-mock';

/**
 * Frontend-only mockup. See `wallet.tsx` for the "no backend yet" disclaimer.
 * Submitting doesn't persist anywhere; it just confirms the form works and
 * sends the resident back to the (still mock) listings feed.
 */
export default function NewMarketplaceListingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ListingCategory>('Other');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const canSubmit = title.trim() && Number(price) > 0 && description.trim();

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(undefined);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    router.back();
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md px-lg pb-lg"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">New listing</Text>
      </View>

      <ScrollView contentContainerClassName="p-lg">
        {error && <Notice message={error} />}

        <Input label="Title" showLabel placeholder="e.g. 3-seater fabric sofa" value={title} onChangeText={setTitle} />

        <Select
          label="Category"
          showLabel
          value={category}
          onChange={setCategory}
          options={LISTING_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />

        <Input
          label="Price (₦)"
          showLabel
          placeholder="e.g. 25000"
          keyboardType="number-pad"
          value={price}
          onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
        />

        <Input
          label="Description"
          showLabel
          placeholder="Condition, pickup details, anything a buyer should know"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text className="mb-lg text-[13px] text-paper-500 dark:text-ink-textMuted">
          Photos aren&apos;t supported yet in this preview. They&apos;ll be added once the listing
          form is wired up to the backend.
        </Text>

        <Button label="Publish listing" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} />
      </ScrollView>
    </View>
  );
}
