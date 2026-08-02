import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../context/theme-context';
import { Avatar } from './Avatar';
import { StatusBadge } from './StatusBadge';

interface IDCardViewProps {
  photoUrl?: string | null;
  name: string;
  /** Second line under the name — unit no. for a resident, relationship for a household member. */
  subtitle?: string | null;
  estateName?: string | null;
  code: string;
  revoked?: boolean;
}

/**
 * The credential shown at the gate — for the resident themselves, or for
 * anyone on their household/frequent-visitor allow list. The photo and name
 * are just for the security guard's own visual check; the QR is what
 * actually matters; it encodes `code`, which security scans and looks up
 * against the estate's live database. A card with a copied photo but a
 * made-up or already-revoked code fails that lookup — the printed card is
 * never itself the proof of anything.
 */
export function IDCardView({ photoUrl, name, subtitle, estateName, code, revoked }: IDCardViewProps) {
  const { colors, spacing, radius, typography, elevation } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        },
        elevation.raised,
      ]}
    >
      <View
        style={{
          backgroundColor: colors.brandField,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={[typography.micro, { color: colors.onHero }]}>NAFIL ESTATES</Text>
        {estateName && (
          <Text style={[typography.micro, { color: colors.onHeroMuted }]} numberOfLines={1}>
            {estateName.toUpperCase()}
          </Text>
        )}
      </View>

      <View style={{ padding: spacing.xl, alignItems: 'center' }}>
        <Avatar uri={photoUrl} name={name} size={72} />
        <Text style={[typography.subheading, { color: colors.text, marginTop: spacing.md }]}>
          {name}
        </Text>
        {subtitle && (
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            {subtitle}
          </Text>
        )}

        {revoked && (
          <View style={{ marginTop: spacing.sm }}>
            <StatusBadge label="Revoked" tone="danger" />
          </View>
        )}

        <View
          style={{
            marginTop: spacing.xl,
            padding: spacing.md,
            backgroundColor: '#fff',
            borderRadius: radius.md,
            opacity: revoked ? 0.35 : 1,
          }}
        >
          <QRCode value={code} size={140} />
        </View>
        <Text
          style={[
            typography.bodyStrong,
            { color: colors.text, letterSpacing: 2, marginTop: spacing.md },
          ]}
        >
          {code}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' }]}>
          {revoked ? 'This code no longer works.' : 'Show this to security at the gate.'}
        </Text>
      </View>
    </View>
  );
}
