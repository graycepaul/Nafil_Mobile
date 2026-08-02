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
  const { colors, spacing, radius, typography, elevation } = useTheme();
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
    <View style={{ position: 'relative', zIndex: 10 }}>
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
        <View
          style={[
            {
              position: 'absolute',
              top: 72,
              left: 0,
              right: 0,
              backgroundColor: colors.inputBg,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              maxHeight: 220,
              overflow: 'hidden',
            },
            elevation.card,
          ]}
        >
          {loading ? (
            <View style={{ padding: spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : results.length === 0 ? (
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
              ]}
            >
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
                style={({ pressed }) => ({
                  padding: spacing.md,
                  backgroundColor: pressed ? colors.surface : 'transparent',
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                })}
              >
                <Text style={[typography.bodyStrong, { color: colors.text }]}>{estate.name}</Text>
                {estate.address && (
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
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
