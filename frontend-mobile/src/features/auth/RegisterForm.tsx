import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { InlineMessage } from '@/components/common/InlineMessage';
import { Input } from '@/components/common/Input';
import { spacing } from '@/theme/tokens';
import { authService } from './authService';
import { PasswordField } from './PasswordField';
import type { FormErrors, RegisterFormValues } from './types';
import { validateRegister } from './validation';

const initialValues: RegisterFormValues = { fullName: '', email: '', password: '', confirmPassword: '' };

export function RegisterForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors<RegisterFormValues>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof RegisterFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, ...(field === 'password' ? { confirmPassword: undefined } : {}) }));
    setFormError('');
  }

  async function handleSubmit() {
    const nextValues = { ...values, fullName: values.fullName.trim(), email: values.email.trim() };
    const nextErrors = validateRegister(nextValues);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError('');
    try {
      await authService.register(nextValues);
      router.replace({ pathname: '/login', params: { registered: '1' } });
    } catch {
      setFormError('Unable to create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
      {formError && <InlineMessage variant="error">{formError}</InlineMessage>}
      <Input label="Full name" placeholder="Your full name" autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="next" value={values.fullName} error={errors.fullName} onChangeText={(value) => updateField('fullName', value)} required />
      <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" value={values.email} error={errors.email} onChangeText={(value) => updateField('email', value)} required />
      <PasswordField label="Password" placeholder="Create a password" helperText="Password must contain at least 8 characters." autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="next" value={values.password} error={errors.password} onChangeText={(value) => updateField('password', value)} required />
      <PasswordField label="Confirm password" placeholder="Repeat your password" autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="done" value={values.confirmPassword} error={errors.confirmPassword} onChangeText={(value) => updateField('confirmPassword', value)} onSubmitEditing={handleSubmit} required />
      <Button loading={submitting} onPress={handleSubmit}>{submitting ? 'Creating account...' : 'Create Account'}</Button>
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
