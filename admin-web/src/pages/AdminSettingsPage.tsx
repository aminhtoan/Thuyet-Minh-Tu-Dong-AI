import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { useAdminSettings } from '../hooks/useAdminSettings';
import { settingsGroups } from '../utils/settingsPresentation';
import '../styles/system.css';
import '../styles/settings.css';

export function AdminSettingsPage() {
  const { data, loading, error, retry } = useAdminSettings();
  const groups = settingsGroups(data);
  return <div className="settings-page">
    <AdminPageHeader title="Cấu hình hệ thống" description="Cấu hình hiệu lực an toàn từ backend (chỉ đọc)." />
    <p className="settings-readonly-note">Chỉ xem thông tin. Trang này không hỗ trợ chỉnh sửa cấu hình.</p>
    <LoadingState loading={loading}>
      {loading ? <Card className="settings-placeholder"><p>Đang tải cấu hình hệ thống…</p></Card> : error ?
        <Card><ErrorState title="Không thể tải cấu hình hệ thống" description="Hãy kiểm tra kết nối hoặc phiên đăng nhập và thử lại. Chưa có dữ liệu cấu hình để hiển thị." onRetry={retry} /></Card> :
        !groups.length ? <Card><EmptyState icon="settings" title="Chưa có dữ liệu cấu hình" description="Request đã hoàn tất nhưng không có trường cấu hình được hỗ trợ để hiển thị." /></Card> :
          <div className="settings-grid">{groups.map(group => <section key={group.id} aria-labelledby={`settings-${group.id}`}>
            <Card><h2 id={`settings-${group.id}`}>{group.title}</h2><dl>{group.fields.map(field => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></Card>
          </section>)}</div>}
    </LoadingState>
  </div>;
}
