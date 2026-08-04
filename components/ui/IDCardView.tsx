import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
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
  return (
    <View className="overflow-hidden rounded-lg border border-paper-200 bg-white shadow-lg dark:border-ink-border dark:bg-ink-raised">
      <View className="flex-row items-center justify-between bg-brand-800 px-lg py-sm dark:bg-brand-900">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.6px] text-white">
          NAFIL ESTATES
        </Text>
        {estateName && (
          <Text
            className="text-[11px] font-semibold uppercase tracking-[0.6px] text-brand-100 dark:text-brand-200"
            numberOfLines={1}
          >
            {estateName.toUpperCase()}
          </Text>
        )}
      </View>

      <View className="items-center p-xl">
        <Avatar uri={photoUrl} name={name} size={72} />
        <Text className="mt-md text-lg font-semibold text-paper-900 dark:text-ink-text">{name}</Text>
        {subtitle && (
          <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">{subtitle}</Text>
        )}

        {revoked && (
          <View className="mt-sm">
            <StatusBadge label="Revoked" tone="danger" />
          </View>
        )}

        <View className={`mt-xl rounded-md bg-white p-md ${revoked ? 'opacity-35' : ''}`}>
          <QRCode value={code} size={140} />
        </View>
        <Text className="mt-md text-base font-semibold tracking-[2px] text-paper-900 dark:text-ink-text">
          {code}
        </Text>
        <Text className="mt-xs text-center text-[13px] text-paper-500 dark:text-ink-textMuted">
          {revoked ? 'This code no longer works.' : 'Show this to security at the gate.'}
        </Text>
      </View>
    </View>
  );
}
