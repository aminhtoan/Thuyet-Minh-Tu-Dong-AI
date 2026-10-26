import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Icon } from '../components/common/Icon';
import { useAdminVisitQr } from '../hooks/useAdminVisitQr';
import type { VisitQrItem } from '../types/visitQr';
import '../styles/visit-qr.css';

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return isoString;
  }
}

export function AdminVisitQrPage() {
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('ALL');
  const [deviceType, setDeviceType] = useState('ALL');
  const [os, setOs] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const { data, loading, error, retry } = useAdminVisitQr({
    search,
    source,
    deviceType,
    os,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit: 15,
  });

  const isFiltered = Boolean(
    search.trim() ||
      source !== 'ALL' ||
      deviceType !== 'ALL' ||
      os !== 'ALL' ||
      startDate ||
      endDate,
  );

  const resetFilters = () => {
    setSearch('');
    setSource('ALL');
    setDeviceType('ALL');
    setOs('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <>
      <AdminPageHeader
        title="Lượt quét QR"
        description="Theo dõi lưu lượng khách tham quan quét mã QR bảo tàng hôm nay và toàn thời gian."
        action={
          <Button variant="secondary" onClick={retry} disabled={loading}>
            <Icon name="refresh" />
            <span>Làm mới</span>
          </Button>
        }
      />

      {loading && !data ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="visit-qr-stats">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} style={{ minHeight: '120px' }}>
                <span className="skeleton-block" style={{ width: '60%', height: '14px', marginBottom: '12px' }} />
                <span className="skeleton-block" style={{ width: '40%', height: '28px' }} />
              </Card>
            ))}
          </div>
          <Card className="visit-qr-card" style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Đang tải nhật ký quét mã QR...</p>
          </Card>
        </div>
      ) : error || !data ? (
        <Card className="customer-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <EmptyState
            icon="alert"
            title="Không thể tải dữ liệu quét QR"
            description="Đã xảy ra lỗi khi kết nối với máy chủ. Vui lòng kiểm tra và thử lại."
          />
          <div style={{ marginTop: '16px' }}>
            <Button onClick={retry}>Thử lại</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="visit-qr-stats">
            <StatCard
              label="Lượt khách nghe"
              value={data.summary.totalListens ?? data.summary.listenStats?.total ?? 0}
              icon="wave"
              description={`Web: ${data.summary.listenStats?.web ?? 0} · Mobile: ${data.summary.listenStats?.mobile ?? 0}`}
              tone="primary"
            />
            <StatCard
              label="Lượt quét hôm nay"
              value={data.summary.today}
              icon="qr"
              description="Tổng số lần quét ghi nhận trong ngày"
              tone="primary"
            />
            <StatCard
              label="Khách hôm nay (Unique IP)"
              value={data.summary.todayUnique}
              icon="users"
              description="Số người dùng duy nhất hôm nay"
              tone="primary"
            />
            <StatCard
              label="Tổng lượt quét"
              value={data.summary.total}
              icon="dashboard"
              description="Lũy kế toàn bộ lượt quét hệ thống"
              tone="warning"
            />
            <StatCard
              label="Tổng khách duy nhất"
              value={data.summary.totalUnique}
              icon="users"
              description="Toàn bộ người dùng theo địa chỉ IP"
              tone="warning"
            />
          </div>

          <Card className="visit-qr-card">
            <div className="visit-qr-filters">
              <div className="visit-qr-search">
                <Icon name="search" />
                <input
                  type="search"
                  placeholder="Tìm IP, nguồn, trình duyệt, HĐH..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Tìm kiếm lượt quét"
                />
              </div>

              <label>
                Nguồn quét
                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Tất cả nguồn</option>
                  <option value="footer_web">footer_web</option>
                  <option value="museum_guide">museum_guide</option>
                  <option value="qr_scan">qr_scan</option>
                </select>
              </label>

              <label>
                Thiết bị
                <select
                  value={deviceType}
                  onChange={(e) => {
                    setDeviceType(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Tất cả thiết bị</option>
                  <option value="mobile">Di động (Mobile)</option>
                  <option value="tablet">Máy tính bảng (Tablet)</option>
                  <option value="desktop">Máy tính bàn (Desktop)</option>
                  <option value="unknown">Chưa xác định</option>
                </select>
              </label>

              <label>
                Hệ điều hành
                <select
                  value={os}
                  onChange={(e) => {
                    setOs(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Tất cả HĐH</option>
                  <option value="iOS">iOS (iPhone/iPad)</option>
                  <option value="Android">Android</option>
                  <option value="Windows">Windows</option>
                  <option value="macOS">macOS</option>
                  <option value="Linux">Linux</option>
                </select>
              </label>

              <label>
                Từ ngày
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                />
              </label>

              <label>
                Đến ngày
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                />
              </label>

              {isFiltered && (
                <Button variant="secondary" onClick={resetFilters}>
                  Đặt lại
                </Button>
              )}
            </div>

            {data.items.length === 0 ? (
              <div className="visit-qr-empty">
                <EmptyState
                  icon="qr"
                  title={isFiltered ? 'Không có lượt quét nào phù hợp bộ lọc' : 'Chưa có lượt quét QR nào'}
                  description={
                    isFiltered
                      ? 'Vui lòng thay đổi từ khóa hoặc khoảng thời gian tìm kiếm.'
                      : 'Khi khách tham quan quét mã QR bảo tàng, thông tin sẽ được hiển thị tại đây.'
                  }
                />
                {isFiltered && (
                  <Button variant="secondary" onClick={resetFilters}>
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="visit-qr-table-scroll">
                  <table className="visit-qr-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Địa chỉ IP</th>
                        <th>Thiết bị &amp; HĐH</th>
                        <th>Trình duyệt</th>
                        <th>Nguồn quét</th>
                        <th>Đường dẫn đích</th>
                        <th>Vị trí / Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item: VisitQrItem) => (
                        <tr key={item.id}>
                          <td style={{ whiteSpace: 'nowrap', color: 'var(--secondary)' }}>
                            {formatDate(item.createdAt)}
                          </td>
                          <td>
                            {item.ipAddress ? (
                              <span className="visit-badge--ip">{item.ipAddress}</span>
                            ) : (
                              <span style={{ color: 'var(--muted)' }}>—</span>
                            )}
                          </td>
                          <td>
                            <span className="visit-badge visit-badge--device">
                              {item.deviceType === 'mobile'
                                ? '📱 Mobile'
                                : item.deviceType === 'tablet'
                                  ? '📟 Tablet'
                                  : item.deviceType === 'desktop'
                                    ? '💻 Desktop'
                                    : item.deviceType}
                              {item.os ? ` • ${item.os}` : ''}
                            </span>
                          </td>
                          <td style={{ color: 'var(--secondary)' }}>
                            {item.browser || '—'}
                          </td>
                          <td>
                            <span className="visit-badge visit-badge--source">
                              {item.source}
                            </span>
                          </td>
                          <td>
                            <span className="visit-badge--target" title={item.targetPath}>
                              {item.targetPath}
                            </span>
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: '12px' }}>
                            {item.location || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="visit-qr-pagination">
                  <span>
                    Hiển thị trang <strong>{data.pagination.page}</strong> /{' '}
                    {data.pagination.totalPages || 1} (Tổng cộng{' '}
                    <strong>{data.pagination.total}</strong> lượt quét)
                  </span>
                  <div>
                    <Button
                      variant="secondary"
                      disabled={data.pagination.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Trang trước
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={data.pagination.page >= data.pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Trang sau
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </>
  );
}
