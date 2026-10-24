import { useId, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type InputProps = TextInputProps & { label?: string; helperText?: string; error?: string; required?: boolean; rightElement?: ReactNode; inputRef?: Ref<ComponentRef<typeof TextInput>>; appearance?: 'default' | 'auth' };

export function Input({ label, helperText, error, required, rightElement, inputRef, appearance = 'default', editable = true, style, onFocus, onBlur, ...props }: InputProps) {
  const nativeId = useId();
  const [focused, setFocused] = useState(false);
  const auth = appearance === 'auth';
  return (
    <View style={styles.field}>
      {label && <Text nativeID={`${nativeId}-label`} style={[styles.label, auth && styles.authLabel]}>{label}{required && <Text style={styles.required}> *</Text>}</Text>}
      <View style={[styles.control, auth && styles.authControl, focused && styles.controlFocused, error && styles.controlError, !editable && styles.controlDisabled]}>
        <TextInput ref={inputRef} accessibilityLabel={auth ? label : undefined} accessibilityLabelledBy={label ? `${nativeId}-label` : undefined} accessibilityHint={error ?? helperText} accessibilityState={{ disabled: !editable }} editable={editable} placeholderTextColor={colors.textMuted} style={[styles.input, auth && styles.authInput, style]} onFocus={(event) => { setFocused(true); onFocus?.(event); }} onBlur={(event) => { setFocused(false); onBlur?.(event); }} {...props} />
        {rightElement}
      </View>
      {(error || helperText) && <Text accessibilityLiveRegion={auth && error ? 'polite' : undefined} style={[styles.message, auth && styles.authMessage, error && styles.error]}>{error ?? helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm }, label: { fontFamily: typography.family.semibold, color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold }, required: { color: colors.error },
  control: { minHeight: 48, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  controlFocused: { borderColor: colors.primary, borderWidth: 2 }, controlError: { borderColor: colors.error, borderWidth: 2 }, controlDisabled: { backgroundColor: colors.surfaceSecondary, opacity: 0.72 },
  input: { fontFamily: typography.family.regular, minWidth: 0, flex: 1, minHeight: 46, paddingHorizontal: 14, color: colors.textPrimary, fontSize: typography.size.md },
  message: { color: colors.textMuted, fontSize: typography.size.sm }, error: { color: colors.error },
  // Opt-in auth appearance leaves all project/workflow fields unchanged.
  authLabel: { fontSize: typography.size.md, lineHeight: typography.lineHeight.normal },
  authControl: { minHeight: 52, backgroundColor: colors.background },
  authInput: { paddingVertical: spacing.sm, lineHeight: typography.lineHeight.normal },
  authMessage: { fontFamily: typography.family.regular, color: colors.textSecondary, fontSize: typography.size.md, lineHeight: typography.lineHeight.normal },
});
