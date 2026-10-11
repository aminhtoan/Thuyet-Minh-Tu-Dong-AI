import { Link } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Icon, type IconName } from '../components/common/Icon';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { ProjectStatusBadge } from '../features/projects/ProjectStatusBadge';
import { buildDailyProjectSeries, hasCompleteProjectDataset } from '../features/projects/dashboardMetrics.mjs';
import { calculateProjectStatistics, formatRelativeDate, getProjectStatusLabel, getRecentProjects, languageNames } from '../features/projects/projectUtils';
import { useProjects } from '../features/projects/useProjects';
import type { Project } from '../features/projects/types';
import '../styles/dashboard.css';

const quickActions: { title: string; detail: string; icon: IconName; route: string }[] = [
  { title: 'Tạo thuyết minh', detail: 'Bắt đầu với video hoặc âm thanh', icon: 'video', route: '/projects/new' },
  { title: 'Bản ghi', detail: 'Chọn dự án để xem bản ghi', icon: 'document', route: '/projects' },
  { title: 'Bản dịch', detail: 'Chọn dự án và ngôn ngữ đích', icon: 'language', route: '/projects' },
  { title: 'Giọng đọc', detail: 'Chọn dự án để cấu hình giọng đọc', icon: 'mic', route: '/projects' },
];

function DailyProjectsChart({ projects, complete }: { projects: readonly Project[]; complete: boolean }) {
  if (!complete) return <div className="dashboard-chart__empty" role="status"><Icon name="alert" width="22" /><strong>Chưa đủ dữ liệu để lập biểu đồ</strong><span>Danh sách hiện tại chưa chứa tất cả dự án trong tài khoản.</span></div>;
  const series = buildDailyProjectSeries(projects);
  const maximum = Math.max(...series.map((day: { value: number }) => day.value), 1);
  const hasData = series.some((day: { value: number }) => day.value > 0);
  return <div className="dashboard-chart" role="img" aria-label={hasData ? `Số dự án được tạo trong 7 ngày qua: ${series.map((day: { fullLabel: string; value: number }) => `${day.fullLabel}: ${day.value}`).join(', ')}` : 'Chưa có dự án nào được tạo trong 7 ngày qua'}>
    <div className="dashboard-chart__plot">{series.map((day: { key: string; label: string; value: number }) => <div className="dashboard-chart__column" key={day.key}><span className="dashboard-chart__value">{day.value}</span><span className="dashboard-chart__track"><span className="dashboard-chart__bar" style={{ height: `${hasData ? Math.max((day.value / maximum) * 100, day.value ? 8 : 0) : 0}%` }} /></span><span className="dashboard-chart__label">{day.label}</span></div>)}</div>
    {!hasData && <p>Chưa có dự án mới trong 7 ngày qua.</p>}
  </div>;
}

function DashboardMetric({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'success' | 'info' | 'error' }) {
  return <div className={`dashboard-metric dashboard-metric--${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

export function DashboardPlaceholder() {
  const { projects, pagination, isLoading, error, reload } = useProjects();
  const complete = hasCompleteProjectDataset(projects.length, pagination);
  const statistics = calculateProjectStatistics(projects);
  const recent = getRecentProjects(projects);
  const metricValue = (value: number) => complete ? value : '—';

  return <div className="dashboard">
    <section className="dashboard-hero">
      <div className="dashboard-hero__copy"><span className="dashboard-eyebrow">CHÀO MỪNG TRỞ LẠI!</span><h1>Tạo thuyết minh đa ngôn ngữ<br />cho video của bạn</h1><p>Một không gian cho bản ghi, bản dịch và giọng đọc.<br className="desktop-break" /> Tiếp tục quy trình thuyết minh đa ngôn ngữ của bạn.</p><Link className="button button--primary button--md hero-cta" to="/projects/new"><Icon name="plus" width="19" />Tạo thuyết minh</Link></div>
      <div className="hero-art" aria-hidden="true"><div className="hero-art__orbit" /><div className="hero-art__video"><div className="hero-art__scene"><span /><i /><b /></div><div className="hero-art__timeline"><Icon name="video" width="15" /><span /></div></div><div className="hero-art__wave"><Icon name="wave" width="104" /></div><div className="hero-art__mic"><Icon name="mic" width="32" /></div><div className="hero-art__languages">{['VI', 'EN', 'JA', 'KO'].map((language, index) => <span key={language}><b>{['Vi', 'En', 'あ', '한'][index]}</b>{language}</span>)}</div></div>
    </section>
    <nav className="quick-actions" aria-label="Lối tắt sáng tạo">{quickActions.map((action) => <Link className="quick-action" to={action.route} key={action.title}><span className="quick-action__icon"><Icon name={action.icon} width="24" /></span><span><strong>{action.title}</strong><small>{action.detail}</small></span></Link>)}</nav>
    {isLoading ? <Card className="dashboard-state"><Spinner size="lg" label="Đang tải bảng điều khiển" /><p>Đang tải dữ liệu dự án...</p></Card> : error ? <Card className="dashboard-state"><ErrorState title="Không thể tải bảng điều khiển" description={error} onRetry={() => void reload()} /></Card> : <>
      <div className="dashboard-overview">
        <Card className="dashboard-chart-card"><div className="section-heading"><div><h2>Số dự án theo ngày</h2><p>7 ngày gần nhất</p></div></div><DailyProjectsChart projects={projects} complete={complete} /></Card>
        <Card className="dashboard-statistics"><div className="section-heading"><div><h2>Thống kê nhanh</h2>{!complete && <p>Phân loại cần dữ liệu toàn bộ tài khoản</p>}</div></div><div className="dashboard-metrics"><DashboardMetric label="Tổng số dự án" value={pagination?.total ?? statistics.total} /><DashboardMetric label="Hoàn thành" value={metricValue(statistics.completed)} tone="success" /><DashboardMetric label="Đang xử lý" value={metricValue(statistics.processing)} tone="info" /><DashboardMetric label="Thất bại" value={metricValue(statistics.failed)} tone="error" /></div></Card>
      </div>
      <div className="dashboard-grid">
        <Card className="dashboard-projects"><div className="section-heading"><h2>Dự án gần đây</h2><Link to="/projects">Xem tất cả <Icon name="arrow" width="14" /></Link></div>
          {recent.length ? <div className="dashboard-recent-table"><div className="dashboard-recent-table__head" aria-hidden="true"><span>Tên dự án</span><span>Cập nhật</span><span>Ngôn ngữ nguồn</span><span>Trạng thái</span><span>Thao tác</span></div>{recent.map((project) => <article className="dashboard-recent-row" key={project.id}><strong><Link to={`/projects/${project.id}`}>{project.name}</Link></strong><time dateTime={project.updatedAt}>{formatRelativeDate(project.updatedAt)}</time><span>{languageNames[project.sourceLanguage] ?? project.sourceLanguage.toUpperCase()}</span><ProjectStatusBadge status={project.status} /><Link className="dashboard-recent-row__action" to={`/projects/${project.id}`}>Xem chi tiết</Link></article>)}</div> : <EmptyState title="Chưa có dự án" description="Tạo dự án đầu tiên để bắt đầu quy trình thuyết minh." action={<Link className="button button--primary button--sm" to="/projects/new">Tạo thuyết minh</Link>} />}
        </Card>
        <Card className="dashboard-activity"><div className="section-heading"><div><h2>Hoạt động gần đây</h2><p>Cập nhật trạng thái dự án</p></div></div>{recent.length ? <ul>{recent.slice(0, 4).map((project) => <li key={project.id}><span className={`activity-icon activity-icon--${project.status.toLowerCase()}`}><Icon name={project.status === 'COMPLETED' ? 'check' : project.status === 'FAILED' ? 'alert' : 'history'} width="14" /></span><div><p><strong>{project.name}</strong> · {getProjectStatusLabel(project.status)}</p><time dateTime={project.updatedAt}>{formatRelativeDate(project.updatedAt)}</time></div></li>)}</ul> : <p className="dashboard-activity__empty">Chưa có hoạt động gần đây</p>}<Link className="activity-history" to="/history">Xem lịch sử <Icon name="arrow" width="14" /></Link></Card>
      </div>
    </>}
  </div>;
}
