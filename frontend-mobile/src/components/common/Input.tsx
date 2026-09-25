import { useId, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type InputProps = TextInputProps & { label?: string; helperText?: string; error?: string; required?: boolean; rightElement?: ReactNode };

export function Input({ label, helperText, error, required, rightElement, editable = true, style, ...props }: InputProps) {
  const nativeId = useId();
  return (
    <View style={styles.field}>
      {label && <Text nativeID={`${nativeId}-label`} style={styles.label}>{label}{required && <Text style={styles.required}> *</Text>}</Text>}
      <View style={[styles.control, error && styles.controlError, !editable && styles.controlDisabled]}>
        <TextInput accessibilityLabelledBy={label ? `${nativeId}-label` : undefined} accessibilityHint={error ?? helperText} accessibilityState={{ disabled: !editable }} editable={editable} placeholderTextColor={colors.textMuted} style={[styles.input, style]} {...props} />
        {rightElement}
      </View>
      {(error || helperText) && <Text style={[styles.message, error && styles.error]}>{error ?? helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm }, label: { color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold }, required: { color: colors.error },
  control: { minHeight: 48, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  controlError: { borderColor: colors.error }, controlDisabled: { backgroundColor: '#EEF1F5', opacity: 0.7 },
  input: { minWidth: 0, flex: 1, minHeight: 46, paddingHorizontal: 14, color: colors.textPrimary, fontSize: typography.size.md },
  message: { color: colors.textMuted, fontSize: typography.size.sm }, error: { color: colors.error },
});
