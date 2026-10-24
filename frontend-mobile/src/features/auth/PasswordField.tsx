import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Input } from '@/components/common/Input';
import { colors, radius } from '@/theme/tokens';

type PasswordFieldProps = Omit<ComponentProps<typeof Input>, 'secureTextEntry' | 'rightElement'>;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
  return <Input {...props} secureTextEntry={!visible} rightElement={<Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: visible }} hitSlop={8} style={({ pressed }) => [styles.toggle, pressed && styles.pressed]} onPress={() => setVisible((current) => !current)}><MaterialCommunityIcons accessible={false} name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} /></Pressable>} />;
}

const styles = StyleSheet.create({ toggle: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md }, pressed: { backgroundColor: colors.primaryLight } });
