import { View } from 'react-native';
import { Skeleton } from './Skeleton';

/**
 * Placeholder for a `Card`-shaped list row while its query is loading, so a
 * list of reports/announcements/residents/etc. holds its shape and fades in
 * rather than flashing from a spinner straight to populated rows.
 * `media` mirrors the left-thumbnail layout used by issue/announcement/
 * marketplace cards; without it, it's a plain title+subtitle row.
 */
export function CardSkeleton({ media = false }: { media?: boolean }) {
  return (
    <View className="mb-md flex-row items-center gap-md rounded-md border border-paper-200 p-md dark:border-ink-border">
      {media && <Skeleton className="h-16 w-16 rounded-md" />}
      <View className="flex-1 gap-sm">
        <Skeleton className="h-4 w-2/3 rounded-sm" />
        <Skeleton className="h-3 w-full rounded-sm" />
        <Skeleton className="h-3 w-1/3 rounded-sm" />
      </View>
    </View>
  );
}

/** Renders `count` `CardSkeleton`s — the usual stand-in for a loading list. */
export function CardSkeletonList({ count = 4, media = false }: { count?: number; media?: boolean }) {
  return (
    <View className="p-xl">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} media={media} />
      ))}
    </View>
  );
}
