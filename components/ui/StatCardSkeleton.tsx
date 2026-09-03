import { View } from 'react-native';
import { Skeleton } from './Skeleton';

/** Placeholder matching `StatCard`'s shape while dashboard counts load. */
export function StatCardSkeleton() {
  return (
    <View className="flex-1 rounded-lg border border-paper-200 bg-paper-50 p-md dark:border-ink-border dark:bg-ink-surface">
      <Skeleton className="mb-sm h-8 w-8 rounded-md" />
      <Skeleton className="h-7 w-10 rounded-sm" />
      <Skeleton className="mt-1.5 h-3 w-16 rounded-sm" />
    </View>
  );
}
