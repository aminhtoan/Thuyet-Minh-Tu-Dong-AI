import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Input } from '@/components/common/Input';
import { colors } from '@/theme/tokens';

type PasswordFieldProps = Omit<ComponentProps<typeof Input>, 'secureTextEntry' | 'rightElement'>;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Hide password' : 'Show password';
  return <Input {...props} secureTextEntry={!visible} rightElement={<Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={styles.toggle} onPress={() => setVisible((current) => !current)}><MaterialCommunityIcons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} /></Pressable>} />;
}

const styles = StyleSheet.create({ toggle: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' } });
