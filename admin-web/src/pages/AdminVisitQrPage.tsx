import { useState, useMemo } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { SearchField } from '../components/common/FormFields';
import type { VisitQrListResult } from '../types/visitQr';
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
  const [advancedOpen, setAdvancedOpen] = useState<boolean | null>(null);
  const [os, setOs] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [visitorDays, setVisitorDays] = useState<number | 'ALL'>(30);
  const [visitorLanguage, setVisitorLanguage] = useState('ALL');
  const [visitorPage, setVisitorPage] = useState(1);
  const [visitorPageSize, setVisitorPageSize] = useState(5);

  const [profileSearch, setProfileSearch] = useState('');
  const [profilePage, setProfilePage] = useState(1);
  const [profilePageSize, setProfilePageSize] = useState(5);

  const { data: currentData, loading, error, retry } = useAdminVisitQr({
    search,
    source,
    deviceType,
    os,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    visitorDays: visitorDays === 'ALL' ? undefined : visitorDays,
    page,
    limit: pageSize,
  });

  const [lastData, setLastData] = useState<VisitQrListResult | null>(null);
  if (currentData && currentData !== lastData) setLastData(currentData);
  const data = currentData ?? (loading ? lastData : null);

  const filteredVisitors = useMemo(() => {
    const list = data?.topVisitors || [];
    if (visitorLanguage === 'ALL') return list;
    return list.filter((v) => {
      const codeMatch = Boolean(v.languageCode && v.languageCode.toLowerCase() === visitorLanguage.toLowerCase());
      const labelMatch = v.language.toLowerCase().includes(visitorLanguage.toLowerCase());
      return codeMatch || labelMatch;
    });
  }, [data?.topVisitors, visitorLanguage]);

  const totalVisitorPages = Math.max(1, Math.ceil(filteredVisitors.length / visitorPageSize));
  const paginatedVisitors = useMemo(() => {
    const start = (visitorPage - 1) * visitorPageSize;
    return filteredVisitors.slice(start, start + visitorPageSize);
  }, [filteredVisitors, visitorPage, visitorPageSize]);

  const filteredProfiles = useMemo(() => {
    const list = data?.visitors || [];
    if (!profileSearch.trim()) return list;
    const q = profileSearch.trim().toLowerCase();
    return list.filter(
      (v) =>
        v.visitorCode.toLowerCase().includes(q) ||
        (v.ipAddress && v.ipAddress.toLowerCase().includes(q)) ||
        (v.os && v.os.toLowerCase().includes(q)) ||
        (v.browser && v.browser.toLowerCase().includes(q)),
    );
  }, [data?.visitors, profileSearch]);

  const totalProfilePages = Math.max(1, Math.ceil(filteredProfiles.length / profilePageSize));
  const paginatedProfiles = useMemo(() => {
    const start = (profilePage - 1) * profilePageSize;
    return filteredProfiles.slice(start, start + profilePageSize);
  }, [filteredProfiles, profilePage, profilePageSize]);

  const isFiltered = Boolean(
    search.trim() ||
      source !== 'ALL' ||
      deviceType !== 'ALL' ||
      os !== 'ALL' ||
      startDate ||
      endDate,
  );

  const advancedCount = Number(os !== 'ALL') + Number(Boolean(startDate)) + Number(Boolean(endDate));
  const advancedExpanded = advancedOpen ?? advancedCount > 0;

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
    <div className="visit-page">
      <AdminPageHeader
        title="Thống kê truy cập"
        description="Theo dõi lượt quét QR, lượt nghe và IP duy nhất của hệ thống."
        action={
          <Button variant="secondary" onClick={retry} disabled={loading}>
            <Icon name="refresh" />
            <span>Làm mới</span>
          </Button>
        }
      />

      {data ? (          <div className="visit-qr-stats">
            <StatCard
              label="Lượt nghe"
              value={data.summary.totalListens ?? data.summary.listenStats?.total ?? 0}
              icon="wave"
              description={`Web: ${data.summary.listenStats?.web ?? 0} · Mobile: ${data.summary.listenStats?.mobile ?? 0}`}
              tone="primary"
            />
            <StatCard
              label="Lượt quét hôm nay"
              value={data.summary.today}
              icon="qr"
              description="Lượt quét trong ngày"
              tone="primary"
            />
            <StatCard
              label="IP duy nhất hôm nay"
              value={data.summary.todayUnique}
              icon="users"
              description="Địa chỉ IP khác nhau"
              tone="primary"
            />
            <StatCard
              label="Tổng lượt quét"
              value={data.summary.total}
              icon="dashboard"
              description="Lũy kế toàn hệ thống"
              tone="warning"
            />
            <StatCard
              label="Tổng IP duy nhất"
              value={data.summary.totalUnique}
              icon="users"
              description="Đếm IP, không đếm người"
              tone="warning"
            />
          </div>) : loading ? <div className="visit-qr-stats visit-kpi-skeleton" aria-label="Đang tải 5 chỉ số">{[1,2,3,4,5].map(i => <Card key={i}><span aria-hidden="true" className="skeleton-block" /></Card>)}</div> : null}
      <Card className="visit-qr-card visit-controls">            <div className="visit-qr-filters">
              <SearchField id="visit-search" label="Tìm kiếm lượt quét" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm IP, nguồn, trình duyệt, HĐH..." />

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

            </div>
            <div id="visit-advanced-filters" className="visit-advanced-filters" hidden={!advancedExpanded}>
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

</div><div className="visit-filter-footer"><div className="visit-filter-actions">
              <Button variant="ghost" aria-expanded={advancedExpanded} aria-controls="visit-advanced-filters" onClick={() => setAdvancedOpen(!advancedExpanded)}>
                <Icon name="chevronDown" className={advancedExpanded ? 'visit-chevron visit-chevron--open' : 'visit-chevron'} />
                Bộ lọc nâng cao{advancedCount > 0 && <span className="visit-advanced-count">{advancedCount} đang áp dụng</span>}
              </Button>              {isFiltered && (
                <Button variant="secondary" onClick={resetFilters}>
                  Đặt lại
                </Button>
              )}
            </div><div className="visit-period"><span id="visit-period-label">Khoảng thời gian thống kê tần suất nghe</span>                <div className="visitor-filter-tabs" role="group" aria-label="Bộ lọc thời gian">
                  {[
                    { label: '7 ngày (1 tuần)', value: 7 },
                    { label: '14 ngày (2 tuần)', value: 14 },
                    { label: '30 ngày (1 tháng)', value: 30 },
                    { label: 'Tất cả thời gian', value: 'ALL' as const },
                  ].map((tab) => (
                    <button
                      key={tab.label}
                      type="button"
                      aria-pressed={visitorDays === tab.value}
                      className={`visitor-tab-btn ${visitorDays === tab.value ? 'visitor-tab-btn--active' : ''}`}
                      onClick={() => {
                        setVisitorDays(tab.value);
                        setVisitorPage(1);
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div></div></div></Card>
      <p className="visit-data-status" role="status">{loading ? (data ? 'Đang tải; đang hiển thị kết quả lần đọc trước.' : 'Đang tải thống kê…') : error ? 'Chưa tải được thống kê.' : 'Số liệu từ API quản trị.'}</p>
      <LoadingState loading={loading} label="">
      {loading && !data ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          <Card className="visit-qr-card" style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Đang tải nhật ký quét mã QR...</p>
          </Card>
        </div>
      ) : error || !data ? (
        <Card className="customer-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <ErrorState title="Không thể tải dữ liệu quét QR" description="Hãy kiểm tra kết nối và thử lại. Bộ lọc được giữ nguyên." onRetry={retry} />
        </Card>
      ) : (
        <>


          <Card className="visit-qr-card">


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
                <div className="visit-qr-table-scroll" tabIndex={0} role="region" aria-label="Nhật ký quét QR">
                  <table className="visit-qr-table"><caption className="sr-only">Nhật ký quét QR</caption>
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Địa chỉ IP</th>
                        <th>Thiết bị &amp; HĐH</th>
                        <th>Trình duyệt</th>
                        <th>Nguồn quét</th>
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
                                ? 'Mobile'
                                : item.deviceType === 'tablet'
                                  ? 'Tablet'
                                  : item.deviceType === 'desktop'
                                    ? 'Desktop'
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="visit-qr-pagination">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>
                      Hiển thị trang <strong>{data.pagination.page}</strong> /{' '}
                      {data.pagination.totalPages || 1} (Tổng cộng{' '}
                      <strong>{data.pagination.total}</strong> lượt quét)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--secondary)' }}>Hiển thị:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        aria-label="Số dòng mỗi trang"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {[5, 10, 15, 20, 30].map((size) => (
                          <option key={size} value={size}>
                            {size} / trang
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
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

          {/* Bảng thống kê tần suất nghe của khách tham quan */}
          <Card className="visit-qr-card visitor-frequency-card">
            <div className="visitor-frequency-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="wave" style={{ color: 'var(--primary)', width: '20px', height: '20px' }} />
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    Tần suất nghe của khách tham quan
                  </h2>
                </div>
                <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                  Thống kê khách tham quan nghe bao nhiêu lần, sử dụng thiết bị và ngôn ngữ gì.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label
                    htmlFor="visitor-lang-filter"
                    style={{ fontSize: '12px', fontWeight: 500, color: 'var(--secondary)', whiteSpace: 'nowrap' }}
                  >
                    Ngôn ngữ:
                  </label>
                  <select
                    id="visitor-lang-filter"
                    value={visitorLanguage}
                    onChange={(e) => {
                      setVisitorLanguage(e.target.value);
                      setVisitorPage(1);
                    }}
                    style={{
                      minHeight: '32px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="ALL">Tất cả ngôn ngữ</option>
                    <option value="vi">Tiếng Việt (VI)</option>
                    <option value="en">Tiếng Anh (EN)</option>
                    <option value="zh">Tiếng Trung (ZH)</option>
                    <option value="ja">Tiếng Nhật (JA)</option>
                    <option value="ko">Tiếng Hàn (KO)</option>
                    <option value="fr">Tiếng Pháp (FR)</option>
                  </select>
                </div>


              </div>
            </div>

            {filteredVisitors.length === 0 ? (
              <div className="visit-qr-empty" style={{ padding: '36px 20px' }}>
                <EmptyState
                  icon="wave"
                  title="Chưa có lượt nghe nào phù hợp"
                  description="Không tìm thấy khách tham quan nào khớp với bộ lọc thời gian hoặc ngôn ngữ được chọn."
                />
              </div>
            ) : (
              <>
                <div className="visit-qr-table-scroll" tabIndex={0} role="region" aria-label="Tần suất nghe">
                  <table className="visit-qr-table"><caption className="sr-only">Tần suất nghe</caption>
                    <thead>
                      <tr>
                        <th scope="col">Khách tham quan</th>
                        <th scope="col">Thiết bị &amp; Trình duyệt</th>
                        <th scope="col">Số lần nghe</th>
                        <th scope="col">Ngôn ngữ nghe</th>
                        <th scope="col">Lần nghe gần nhất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedVisitors.map((v, index) => (
                        <tr key={v.visitorId + index}>
                          <td>
                            <span className="visit-badge visit-badge--source" style={{ fontWeight: 600 }}>
                              {v.visitorId}
                            </span>
                          </td>
                          <td>
                            <span className="visit-badge visit-badge--device">
                              {v.deviceType === 'mobile'
                                ? 'Mobile'
                                : v.deviceType === 'tablet'
                                  ? 'Tablet'
                                  : 'Desktop'}
                              {v.os ? ` • ${v.os}` : ''}
                              {v.browser ? ` (${v.browser})` : ''}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 10px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: 'var(--primary)',
                                borderRadius: '9999px',
                                fontWeight: 700,
                                fontSize: '13px',
                              }}
                            >
                              {v.totalListens} lượt
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 9px',
                                background: 'var(--surface-muted, #f1f5f9)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}
                            >
                              {v.language}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap', color: 'var(--secondary)' }}>
                            {formatDate(v.lastListenedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="visit-qr-pagination">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>
                      Hiển thị trang <strong>{visitorPage}</strong> /{' '}
                      {totalVisitorPages}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--secondary)' }}>Hiển thị:</span>
                      <select
                        value={visitorPageSize}
                        onChange={(e) => {
                          setVisitorPageSize(Number(e.target.value));
                          setVisitorPage(1);
                        }}
                        aria-label="Số dòng khách tham quan mỗi trang"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {[5, 10, 15, 20, 30].map((size) => (
                          <option key={size} value={size}>
                            {size} / trang
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Button
                      variant="secondary"
                      disabled={visitorPage <= 1}
                      onClick={() => setVisitorPage((p) => Math.max(1, p - 1))}
                    >
                      Trang trước
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={visitorPage >= totalVisitorPages}
                      onClick={() => setVisitorPage((p) => p + 1)}
                    >
                      Trang sau
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Bảng danh sách hồ sơ khách tham quan (Visitors Entity) */}
          <Card className="visit-qr-card visitor-frequency-card">
            <div className="visitor-frequency-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="users" style={{ color: 'var(--primary)', width: '20px', height: '20px' }} />
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    Hồ sơ khách tham quan (Bảng Visitor)
                  </h2>
                </div>
                <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                  Danh sách khách riêng biệt được lưu trữ trong bảng cơ sở dữ liệu riêng, tổng hợp số lần quét QR và nghe audio.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Tìm theo mã hoặc IP..."
                  value={profileSearch}
                  onChange={(e) => {
                    setProfileSearch(e.target.value);
                    setProfilePage(1);
                  }}
                  aria-label="Tìm kiếm hồ sơ khách tham quan"
                  style={{
                    minHeight: '32px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '12px',
                    width: '180px',
                  }}
                />
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--primary)',
                  }}
                >
                  {filteredProfiles.length} khách trong CSDL
                </span>
              </div>
            </div>

            {filteredProfiles.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                <EmptyState
                  icon="search"
                  title="Không tìm thấy khách tham quan"
                  description="Chưa có dữ liệu hồ sơ khách tham quan nào khớp với từ khóa tìm kiếm."
                />
              </div>
            ) : (
              <>
                <div className="visit-qr-table-scroll" tabIndex={0} role="region" aria-label="Hồ sơ khách tham quan">
                  <table className="visit-qr-table"><caption className="sr-only">Hồ sơ khách tham quan</caption>
                    <thead>
                      <tr>
                        <th scope="col">Mã khách</th>
                        <th scope="col">Địa chỉ IP</th>
                        <th scope="col">Thiết bị &amp; Hệ điều hành</th>
                        <th scope="col">Lượt quét QR</th>
                        <th scope="col">Lượt nghe</th>
                        <th scope="col">Lần đầu ghé thăm</th>
                        <th scope="col">Hoạt động gần nhất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProfiles.map((v) => (
                        <tr key={v.id}>
                          <td>
                            <span className="visit-badge visit-badge--source" style={{ fontWeight: 600 }}>
                              {v.visitorCode}
                            </span>
                          </td>
                          <td>
                            <code
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                background: 'var(--surface-muted, #f1f5f9)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                color: 'var(--text)',
                              }}
                            >
                              {v.ipAddress || '—'}
                            </code>
                          </td>
                          <td>
                            <span className="visit-badge visit-badge--device">
                              {v.deviceType === 'mobile'
                                ? 'Mobile'
                                : v.deviceType === 'tablet'
                                  ? 'Tablet'
                                  : 'Desktop'}
                              {v.os ? ` • ${v.os}` : ''}
                              {v.browser ? ` (${v.browser})` : ''}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                              {v.totalScans}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--secondary)', marginLeft: '3px' }}>lần</span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '3px 8px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: 'var(--primary)',
                                borderRadius: '9999px',
                                fontWeight: 600,
                                fontSize: '12px',
                              }}
                            >
                              {v.totalListens} lượt
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap', color: 'var(--secondary)', fontSize: '12px' }}>
                            {formatDate(v.firstVisitAt)}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', color: 'var(--text)', fontSize: '12px', fontWeight: 500 }}>
                            {formatDate(v.lastVisitAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="visit-qr-pagination">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>
                      Hiển thị trang <strong>{profilePage}</strong> / {totalProfilePages}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--secondary)' }}>Hiển thị:</span>
                      <select
                        value={profilePageSize}
                        onChange={(e) => {
                          setProfilePageSize(Number(e.target.value));
                          setProfilePage(1);
                        }}
                        aria-label="Số dòng hồ sơ khách mỗi trang"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {[5, 10, 15, 20].map((size) => (
                          <option key={size} value={size}>
                            {size} / trang
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Button
                      variant="secondary"
                      disabled={profilePage <= 1}
                      onClick={() => setProfilePage((p) => Math.max(1, p - 1))}
                    >
                      Trang trước
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={profilePage >= totalProfilePages}
                      onClick={() => setProfilePage((p) => p + 1)}
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
    </LoadingState></div>
  );
}
