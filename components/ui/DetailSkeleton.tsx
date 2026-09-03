import { View } from 'react-native';
import { Skeleton } from './Skeleton';

/**
 * Placeholder for the issue/announcement detail screens' shared shape — a
 * full-width hero photo followed by a title and a few lines of body text —
 * shown while that record is still loading.
 */
export function DetailSkeleton({ heroHeight }: { heroHeight: number }) {
  return (
    <View>
      <Skeleton style={{ width: '100%', height: heroHeight }} />
      <View className="gap-sm p-lg">
        <Skeleton className="h-6 w-3/4 rounded-sm" />
        <Skeleton className="mt-md h-3 w-full rounded-sm" />
        <Skeleton className="h-3 w-full rounded-sm" />
        <Skeleton className="h-3 w-2/3 rounded-sm" />
      </View>
    </View>
  );
}
