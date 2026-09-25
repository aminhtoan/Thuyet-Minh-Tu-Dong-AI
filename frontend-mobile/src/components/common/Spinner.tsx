import { ActivityIndicator, View, type ColorValue, type ViewProps } from 'react-native';
import { colors } from '@/theme/tokens';

type SpinnerProps = ViewProps & { size?: 'small' | 'large'; label?: string; color?: ColorValue };

export function Spinner({ size = 'small', label = 'Loading', color = colors.primary, ...props }: SpinnerProps) {
  return <View accessibilityRole="progressbar" accessibilityLabel={label} {...props}><ActivityIndicator size={size} color={color} /></View>;
}
