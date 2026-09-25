import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { InlineMessage } from '@/components/common/InlineMessage';
import { Input } from '@/components/common/Input';
import { spacing } from '@/theme/tokens';
import { authService } from './authService';
import { PasswordField } from './PasswordField';
import type { FormErrors, LoginFormValues } from './types';
import { validateLogin } from './validation';

const initialValues: LoginFormValues = { email: '', password: '' };

export function LoginForm() {
  const { registered } = useLocalSearchParams<{ registered?: string }>();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors<LoginFormValues>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof LoginFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  }

  async function handleSubmit() {
    const nextValues = { ...values, email: values.email.trim() };
    const nextErrors = validateLogin(nextValues);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError('');
    try {
      await authService.login(nextValues);
      router.replace('/dashboard');
    } catch {
      setFormError('Unable to sign in. Please check your credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
      {registered === '1' && <InlineMessage variant="success">Account created. You can now sign in.</InlineMessage>}
      {formError && <InlineMessage variant="error">{formError}</InlineMessage>}
      <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" value={values.email} error={errors.email} onChangeText={(value) => updateField('email', value)} required />
      <PasswordField label="Password" placeholder="Enter your password" autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="done" value={values.password} error={errors.password} onChangeText={(value) => updateField('password', value)} onSubmitEditing={handleSubmit} required />
      <Button loading={submitting} onPress={handleSubmit}>{submitting ? 'Signing in...' : 'Sign In'}</Button>
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
