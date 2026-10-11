import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { InlineMessage } from '@/components/common/InlineMessage';
import { Input } from '@/components/common/Input';
import { spacing } from '@/theme/tokens';
import { ApiError } from '@/lib/api';
import { authService } from './authService';
import { PasswordField } from './PasswordField';
import type { FormErrors, RegisterFormValues } from './types';
import { validateRegister } from './validation';

const initialValues: RegisterFormValues = { fullName: '', email: '', password: '', confirmPassword: '' };

function registerErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Không kết nối được máy chủ.';
  if (error.code === 'EMAIL_ALREADY_EXISTS' || error.status === 409) return 'Email đã tồn tại.';
  if (error.code === 'VALIDATION_ERROR' || error.status === 400) return 'Dữ liệu đăng ký không hợp lệ.';
  if (error.status >= 500) return 'Lỗi máy chủ. Vui lòng thử lại sau.';
  return error.message || 'Không thể tạo tài khoản. Vui lòng thử lại.';
}

export function RegisterForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors<RegisterFormValues>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  function updateField(field: keyof RegisterFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, ...(field === 'password' ? { confirmPassword: undefined } : {}) }));
    setFormError('');
  }

  async function handleSubmit() {
    if (submitLock.current) return;
    const nextValues = { ...values, fullName: values.fullName.trim(), email: values.email.trim() };
    const nextErrors = validateRegister(nextValues);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submitLock.current = true;
    setSubmitting(true);
    setFormError('');
    try {
      await authService.register(nextValues);
      router.replace({ pathname: '/login', params: { registered: '1' } });
    } catch (error) {
      setFormError(registerErrorMessage(error));
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
      {formError && <InlineMessage variant="error">{formError}</InlineMessage>}
      <Input label="Họ và tên" placeholder="Nhập họ và tên" autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="next" value={values.fullName} error={errors.fullName} onChangeText={(value) => updateField('fullName', value)} required />
      <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" value={values.email} error={errors.email} onChangeText={(value) => updateField('email', value)} required />
      <PasswordField label="Mật khẩu" placeholder="Tạo mật khẩu" helperText="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số." autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="next" value={values.password} error={errors.password} onChangeText={(value) => updateField('password', value)} required />
      <PasswordField label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu" autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="done" value={values.confirmPassword} error={errors.confirmPassword} onChangeText={(value) => updateField('confirmPassword', value)} onSubmitEditing={handleSubmit} required />
      <Button loading={submitting} onPress={handleSubmit}>{submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</Button>
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
