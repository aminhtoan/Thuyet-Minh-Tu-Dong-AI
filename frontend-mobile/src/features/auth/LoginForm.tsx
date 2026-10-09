import { useLocalSearchParams } from 'expo-router';
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
    } catch {
      setFormError('Không thể đăng nhập. Vui lòng kiểm tra thông tin và thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
      {registered === '1' && <InlineMessage variant="success">Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.</InlineMessage>}
      {formError && <InlineMessage variant="error">{formError}</InlineMessage>}
      <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" value={values.email} error={errors.email} onChangeText={(value) => updateField('email', value)} required />
      <PasswordField label="Mật khẩu" placeholder="Nhập mật khẩu" autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="done" value={values.password} error={errors.password} onChangeText={(value) => updateField('password', value)} onSubmitEditing={handleSubmit} required />
      <Button loading={submitting} onPress={handleSubmit}>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</Button>
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
