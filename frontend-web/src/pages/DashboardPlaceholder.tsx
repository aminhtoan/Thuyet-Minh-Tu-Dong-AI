import { Link } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Icon, type IconName } from '../components/common/Icon';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { ProjectCard } from '../features/projects/ProjectCard';
import { StatCard } from '../features/projects/StatCard';
import { calculateProjectStatistics, getRecentProjects, formatRelativeDate } from '../features/projects/projectUtils';
import { useProjects } from '../features/projects/useProjects';
import '../styles/dashboard.css';

const quickActions: { title: string; detail: string; icon: IconName; route: string }[] = [
  { title: 'Tạo dự án mới', detail: 'Bắt đầu với video hoặc âm thanh', icon: 'video', route: '/projects/new' },
  { title: 'Bản ghi', detail: 'Chọn dự án để chỉnh sửa văn bản', icon: 'document', route: '/projects' },
  { title: 'Bản dịch', detail: 'Chọn dự án và ngôn ngữ đích', icon: 'language', route: '/projects' },
  { title: 'Giọng đọc', detail: 'Chọn dự án để cấu hình giọng', icon: 'mic', route: '/projects' },
];
export function DashboardPlaceholder() {
  const { projects, isLoading, error } = useProjects();
  if (isLoading) return <Card><Spinner label="Đang tải bảng điều khiển" /></Card>;
  if (error) return <Card><ErrorState title="Không tải được dự án" description={error} /></Card>;
  const statistics = calculateProjectStatistics(projects);
  const recent = getRecentProjects(projects);
  return <div className="dashboard">
    <section className="dashboard-hero">
      <div className="dashboard-hero__copy"><span className="dashboard-eyebrow">CHÀO MỪNG TRỞ LẠI!</span><h1>Tạo thuyết minh đa ngôn ngữ<br />cho video của bạn</h1><p>Một không gian cho bản ghi, bản dịch và giọng đọc.<br className="desktop-break" /> Khám phá quy trình sáng tạo với dữ liệu mô phỏng.</p><Link className="button button--primary button--md hero-cta" to="/projects/new"><Icon name="plus" width="19" />Tạo dự án mới</Link></div>
      <div className="hero-art" aria-hidden="true">
        <div className="hero-art__orbit" />
        <div className="hero-art__video"><div className="hero-art__scene"><span /><i /><b /></div><div className="hero-art__timeline"><Icon name="video" width="15" /><span /></div></div>
        <div className="hero-art__wave"><Icon name="wave" width="104" /></div>
        <div className="hero-art__mic"><Icon name="mic" width="32" /></div>
        <div className="hero-art__languages">{['VI', 'EN', 'JA', 'KO'].map((language, i) => <span key={language}><b>{['Vi', 'En', 'あ', '한'][i]}</b>{language}</span>)}</div>
      </div>
    </section>
    <nav className="quick-actions" aria-label="Lối tắt sáng tạo">{quickActions.map(action => <Link className="quick-action" to={action.route} key={action.title}><span className="quick-action__icon"><Icon name={action.icon} width="24" /></span><span><strong>{action.title}</strong><small>{action.detail}</small></span></Link>)}</nav>
    <div className="dashboard-grid">
      <Card className="dashboard-projects"><div className="section-heading"><h2>Dự án gần đây</h2><Link to="/projects">Xem tất cả <Icon name="arrow" width="14" /></Link></div>
        {recent.length ? <><div className="project-table-heading" aria-hidden="true"><span>Tên dự án</span><span>Ngôn ngữ</span><span>Trạng thái</span><span>Thao tác</span></div><div className="project-list">{recent.map(project => <ProjectCard key={project.id} project={project} compact />)}</div></> : <EmptyState title="Chưa có dự án" description="Bắt đầu với video hoặc âm thanh của bạn." action={<Link to="/projects/new">Tạo dự án mới</Link>} />}
        <p className="dashboard-footnote">Dữ liệu mô phỏng · Các dự án được cập nhật gần đây nhất</p>
      </Card>
      <aside className="dashboard-side">
        <Card className="dashboard-statistics"><div className="section-heading"><h2>Thống kê nhanh</h2><span>Hiện tại</span></div><div className="stats-grid">
          <StatCard label="Tổng số dự án" value={statistics.total} supportingText="Tất cả dự án trong phiên" />
          <StatCard label="Hoàn thành" value={statistics.completed} supportingText="Metadata kết quả sẵn sàng" tone="success" />
          <StatCard label="Đang xử lý" value={statistics.processing} supportingText="Dự án đang trong quy trình" tone="info" />
          <StatCard label="Thất bại" value={statistics.failed} supportingText="Dự án cần kiểm tra" tone="error" />
        </div></Card>
        <Card className="dashboard-activity"><div className="section-heading"><h2>Hoạt động gần đây</h2></div><p className="activity-caption">Theo cập nhật trạng thái dự án</p><ul>{recent.slice(0, 4).map(project => <li key={project.id}><span className={'activity-icon activity-icon--' + project.status.toLowerCase()}><Icon name={project.status === 'COMPLETED' ? 'check' : project.status === 'FAILED' ? 'alert' : 'history'} width="14" /></span><div><p>{project.status === 'COMPLETED' ? 'Hoàn thành' : project.status === 'FAILED' ? 'Cần kiểm tra' : project.status === 'DRAFT' ? 'Bản nháp' : 'Trong quy trình'}: <strong>{project.name}</strong></p><time dateTime={project.updatedAt}>{formatRelativeDate(project.updatedAt)}</time></div></li>)}</ul><Link className="activity-history" to="/history">Xem lịch sử <Icon name="arrow" width="14" /></Link></Card>
      </aside>
    </div>
  </div>;
}
