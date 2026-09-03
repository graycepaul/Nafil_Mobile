import { View, Text } from 'react-native';
import { useTheme } from '../../context/theme-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { RemoteImage } from './RemoteImage';

function initials(name?: string | null) {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || null;
}

/**
 * Circular avatar — the photo if set, initials if a name is known, otherwise
 * a generic person glyph. A bare "?" read as an error state rather than "no
 * name yet", which is misleading while a profile is still loading.
 *
 * `size` is a runtime number (callers pass 36/44/56/88…), so width/height/
 * radius stay as `style` — Tailwind's className extraction is static and
 * can't resolve a template-interpolated arbitrary value like `w-[${size}px]`.
 * Everything that IS static (colors, layout) is className.
 */
export function Avatar({
  uri,
  name,
  size = 88,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
}) {
  const { colors } = useTheme();

  if (uri) {
    return (
      <RemoteImage
        uri={uri}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="bg-paper-50 dark:bg-ink-surface"
      />
    );
  }

  const label = initials(name);

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center bg-brand-50 dark:bg-brand-900"
    >
      {label ? (
        <Text
          style={{ fontSize: size * 0.36 }}
          className="font-bold text-brand-800 dark:text-brand-300"
        >
          {label}
        </Text>
      ) : (
        <Ionicons name="person-outline" color={colors.primary} size={size * 0.5} />
      )}
    </View>
  );
}
