import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/theme-context';
import { Input } from '../ui/Input';
import type { Estate } from '../../types/database';

interface EstatePickerProps {
  value: Estate | null;
  onChange: (estate: Estate) => void;
  error?: string;
}

/**
 * Type-ahead search over the estate directory rather than a free-text field.
 * A resident typing "victoria gardns" and admin having to guess which real
 * estate they meant is worse for everyone than picking from real rows —
 * this way the join request is always unambiguous.
 */
export function EstatePicker({ value, onChange, error }: EstatePickerProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<Estate[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value && query === value.name) return; // just selected, don't re-search
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('estates')
        .select('*')
        .ilike('name', `%${query.trim()}%`)
        .order('name')
        .limit(8);
      if (!cancelled) {
        setResults((data as Estate[]) ?? []);
        setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <View className="relative z-10">
      <Input
        label="Estate"
        placeholder="Search for your estate"
        value={query}
        onChangeText={(v) => {
          setQuery(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        error={error}
      />

      {open && query.trim().length > 0 && (
        <View className="absolute inset-x-0 top-[72px] max-h-[220px] overflow-hidden rounded-md border border-paper-200 bg-white shadow-lg dark:border-ink-border dark:bg-ink-surface">
          {loading ? (
            <View className="items-center p-lg">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : results.length === 0 ? (
            <Text className="p-lg text-center text-[13px] text-paper-500 dark:text-ink-textMuted">
              No estate found matching “{query.trim()}”.
            </Text>
          ) : (
            results.map((estate) => (
              <Pressable
                key={estate.id}
                onPress={() => {
                  onChange(estate);
                  setQuery(estate.name);
                  setOpen(false);
                }}
                className="border-b border-paper-200 p-md active:bg-paper-50 dark:border-ink-border dark:active:bg-ink-raised"
              >
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                  {estate.name}
                </Text>
                {estate.address && (
                  <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                    {estate.address}
                  </Text>
                )}
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}
