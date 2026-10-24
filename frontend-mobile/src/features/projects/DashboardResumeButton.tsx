import { useEffect, useRef, useState } from 'react';
import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { ApiError, api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';
import { createResumeLock, DashboardResumeError, resolveDashboardResume } from './dashboardResume';
import type { Project } from './types';

export function DashboardResumeButton({ projectId, label = 'Tiếp tục' }: { projectId: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(createResumeLock());
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  async function open() {
    await lock.current(async () => {
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setError(null);
      try {
        const path = await resolveDashboardResume(projectId, {
          project: async (id, signal) => (await api<{ project: Project }>(`/projects/${id}`, { signal }, false)).project,
          attempt: (id, signal) => api(`/projects/${id}/translations/customer-draft/en`, { signal }, false),
        }, controller.signal);
        if (mounted.current && !controller.signal.aborted) router.push(path as Href);
      } catch (cause) {
        const message = cause instanceof DashboardResumeError ? cause.message
          : cause instanceof ApiError && cause.status === 401 ? 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.'
            : cause instanceof ApiError && [403, 404].includes(cause.status) ? 'Dự án không còn khả dụng hoặc bạn không có quyền truy cập.'
              : 'Chưa thể tiếp tục dự án an toàn. Không gửi lại yêu cầu xử lý; mở Chi tiết để kiểm tra trạng thái hoặc quyền truy cập.';
        if (mounted.current && !controller.signal.aborted) setError(message);
      } finally {
        if (request.current === controller) request.current = null;
        if (mounted.current) setLoading(false);
      }
    });
  }
  return <View style={styles.container}><Button loading={loading} disabled={loading} wrapLabel accessibilityLabel={`${label} dự án ${projectId}`} onPress={() => void open()}>{loading ? 'Đang mở' : label}</Button>{error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}</View>;
}
const styles = StyleSheet.create({ container: { gap: spacing.sm }, error: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: 22, color: colors.error } });
