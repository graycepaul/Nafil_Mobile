import { View, Text, Image } from 'react-native';
import { useTheme } from '../../context/theme-context';

function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/** Circular avatar — the photo if set, otherwise initials on a tinted background. */
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
      <Text style={{ fontSize: size * 0.36, fontWeight: '700', color: colors.primary }}>
        {initials(name)}
      </Text>
    </View>
  );
}
