import { View, Text, Image } from 'react-native';
import { useTheme } from '../../context/theme-context';
import { UserIcon } from './icons';

function initials(name?: string | null) {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || null;
}

/**
 * Circular avatar — the photo if set, initials if a name is known, otherwise
 * a generic person glyph. A bare "?" read as an error state rather than "no
 * name yet", which is misleading while a profile is still loading.
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
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface }}
      />
    );
  }

  const label = initials(name);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {label ? (
        <Text style={{ fontSize: size * 0.36, fontWeight: '700', color: colors.primary }}>
          {label}
        </Text>
      ) : (
        <UserIcon color={colors.primary} size={size * 0.5} />
      )}
    </View>
  );
}
