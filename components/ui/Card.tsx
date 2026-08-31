import { View, type ViewProps, type ViewStyle } from 'react-native';

interface CardProps extends ViewProps {
  accent?: 'default' | 'danger';
  style?: ViewStyle;
  className?: string;
}

const ACCENT_CLASSES: Record<'default' | 'danger', string> = {
  default: 'border-paper-200 dark:border-ink-border bg-paper-50 dark:bg-ink-surface',
  danger: 'border-danger bg-danger-muted dark:bg-danger-mutedDark',
};

export function Card({ accent = 'default', style, className, children, ...props }: CardProps) {
  return (
    <View
      style={style}
      className={`mb-md rounded-md border p-md ${ACCENT_CLASSES[accent]} ${className ?? ''}`}
      {...props}
    >
      {children}
    </View>
  );
}
