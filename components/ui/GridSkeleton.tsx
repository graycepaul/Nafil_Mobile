import { View } from 'react-native';
import { Skeleton } from './Skeleton';

/** Placeholder for the marketplace's aspect-square photo grid while it loads. */
export function GridSkeleton({ numColumns = 2, count = 6 }: { numColumns?: number; count?: number }) {
  return (
    <View className="flex-row flex-wrap gap-md p-lg lg:p-2xl">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className="aspect-square rounded-md"
          style={{ width: `${100 / numColumns - 2}%` }}
        />
      ))}
    </View>
  );
}
