import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { Spinner } from '@/components/common/Spinner';
import { MobileScreen } from '@/components/layout/MobileScreen';
import { authService, type AuthUser } from '@/features/auth/authService';
import { confirmAction } from '@/lib/confirm';
import { confirmationMessages } from '@/localization/confirmationMessages.mjs';
import { colors, spacing, typography } from '@/theme/tokens';

export function AccountScreen() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void authService.me()
      .then(({ user: nextUser }) => { if (active) setUser(nextUser); })
      .catch(() => { if (active) setError('Không thể tải thông tin tài khoản.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadAttempt]);

  function retryLoad() {
    setError('');
    setLoading(true);
    setLoadAttempt((attempt) => attempt + 1);
  }

  async function logout() {
    if (loggingOut || !(await confirmAction('Đăng xuất?', confirmationMessages.logout))) return;
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // authService always clears the local session; Stack.Protected owns navigation.
    }
  }

  return (
    <MobileScreen title="Tài khoản" description="Thông tin tài khoản đang đăng nhập và bảo mật phiên.">
      {loading ? <Spinner label="Đang tải thông tin tài khoản" /> : error ? <ErrorState title="Không thể tải tài khoản" description={error} retryLabel="Thử lại" onRetry={retryLoad} /> : user ? (
        <Card>
          <View style={styles.profile}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{user.fullName.trim().charAt(0).toUpperCase()}</Text></View>
            <View style={styles.identity}>
              <Text style={styles.name}>{user.fullName}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <Text style={styles.role}>Khách hàng</Text>
            </View>
          </View>
        </Card>
      ) : null}
      <Card>
        <View style={styles.actions}>
          <View style={styles.copy}>
            <Text style={styles.sectionTitle}>Phiên đăng nhập</Text>
            <Text style={styles.description}>Đăng xuất sẽ thu hồi refresh token trên máy chủ khi có kết nối và xóa phiên an toàn trên thiết bị.</Text>
          </View>
          <Button variant="danger" loading={loggingOut} onPress={() => void logout()}>{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</Button>
        </View>
      </Card>
    </MobileScreen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: colors.primaryLight },
  avatarText: { color: colors.primary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  identity: { minWidth: 0, flex: 1, gap: spacing.xs },
  name: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold },
  email: { color: colors.textSecondary, fontSize: typography.size.sm },
  role: { color: colors.textMuted, fontSize: typography.size.sm },
  actions: { gap: spacing.lg },
  copy: { gap: spacing.xs },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  description: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 21 },
});
