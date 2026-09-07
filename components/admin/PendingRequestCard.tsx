import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { getIdDocumentSignedUrl } from '../../lib/id-document';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { RemoteImage } from '../ui/RemoteImage';
import type { EstateJoinRequest, JoinRequestWithApplicant } from '../../types/database';

const CATEGORY_LABEL: Record<NonNullable<EstateJoinRequest['resident_category']>, string> = {
  civilian: 'Civilian',
  personnel: 'Personnel',
};

/**
 * A pending join request needs its identity document fetched as a
 * short-lived signed URL (the storage bucket is private - see
 * 0039_resident_id_verification.sql), and that's only worth doing once the
 * admin actually asks to see it, not for every pending card on screen. Its
 * own component so that fetch's hooks aren't conditionally called inside a
 * FlatList's renderItem.
 */
export function PendingRequestCard({
  request,
  estateName,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  request: JoinRequestWithApplicant & { estate: { name: string } | null };
  estateName?: string;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const { colors } = useTheme();
  const [showId, setShowId] = useState(false);

  const {
    data: signedUrl,
    isLoading: loadingSignedUrl,
    error: signedUrlError,
  } = useQuery({
    queryKey: ['id_document_signed_url', request.id_document_path],
    queryFn: () => getIdDocumentSignedUrl(request.id_document_path!),
    enabled: showId && !!request.id_document_path,
    staleTime: 4 * 60_000,
  });

  return (
    <Card className="mb-md">
      <View className="flex-row items-center gap-md">
        <Avatar uri={request.applicant?.avatar_url} name={request.applicant?.full_name} size={44} />
        <View className="flex-1">
          <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
            {request.applicant?.full_name ?? 'Unnamed'}
          </Text>
          <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
            Unit {request.unit_no}
            {request.applicant?.phone ? ` · ${request.applicant.phone}` : ''}
            {estateName ? ` · ${estateName}` : ''}
          </Text>
        </View>
      </View>

      <View className="mt-md flex-row flex-wrap items-center gap-sm">
        {request.resident_category ? (
          <View className="flex-row items-center gap-xs rounded-full bg-paper-100 px-sm py-1 dark:bg-ink-surface">
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} />
            <Text className="text-[12px] font-medium text-paper-500 dark:text-ink-textMuted">
              {CATEGORY_LABEL[request.resident_category]}
              {request.service_number ? ` · ${request.service_number}` : ''}
            </Text>
          </View>
        ) : (
          <Text className="text-[12px] text-paper-500 dark:text-ink-textMuted">
            Submitted before ID verification was required.
          </Text>
        )}
      </View>

      {request.id_document_path && (
        <View className="mt-sm">
          <Pressable
            onPress={() => setShowId((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showId ? 'Hide ID document' : 'View ID document'}
            className="flex-row items-center gap-xs self-start"
          >
            <Ionicons name={showId ? 'eye-off-outline' : 'eye-outline'} size={15} color={colors.primary} />
            <Text className="text-[13px] font-semibold text-brand-800 dark:text-brand-300">
              {showId ? 'Hide ID document' : 'View ID document'}
            </Text>
          </Pressable>

          {showId && (
            <View className="mt-sm">
              {loadingSignedUrl && (
                <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">Loading...</Text>
              )}
              {signedUrlError && (
                <Text className="text-[13px] text-danger">Could not load this document.</Text>
              )}
              {signedUrl && <RemoteImage uri={signedUrl} className="h-56 w-full rounded-md" />}
            </View>
          )}
        </View>
      )}

      <View className="mt-md flex-row gap-sm">
        <Button label="Approve" onPress={onApprove} loading={approving} className="flex-1" />
        <Button
          label="Reject"
          variant="secondary"
          onPress={onReject}
          loading={rejecting}
          className="flex-1"
        />
      </View>
    </Card>
  );
}
