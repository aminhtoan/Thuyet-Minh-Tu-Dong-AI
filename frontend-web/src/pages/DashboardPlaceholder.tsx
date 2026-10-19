import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Icon, type IconName } from '../components/common/Icon';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { ProjectStatusBadge } from '../features/projects/ProjectStatusBadge';
import { resolveDashboardResume } from '../features/projects/dashboardResume.mjs';
import { projectAction } from '../features/projects/projectAction';
import { projectRepository } from '../features/projects/projectRepository';
import { buildLinearProjectScale, buildProjectStatusDistribution, buildProjectTimeSeries, hasCompleteProjectDataset, type ProjectStatusDistributionDatum, type ProjectTimeRange } from '../features/projects/dashboardMetrics.mjs';
import { calculateProjectStatistics, formatRelativeDate, getProjectStatusLabel, getRecentProjects, languageNames } from '../features/projects/projectUtils';
import { useProjects } from '../features/projects/useProjects';
import { hasIncompleteProjectMetadata } from '../features/projects/projectDataState';
import type { Project } from '../features/projects/types';
import '../styles/dashboard.css';

const quickActions: { title: string; detail: string; icon: IconName; route: string }[] = [
  { title: 'Tạo thuyết minh', detail: 'Bắt đầu với video hoặc âm thanh', icon: 'video', route: '/projects/new' },
  { title: 'Bản ghi', detail: 'Chọn dự án để xem bản ghi', icon: 'document', route: '/projects' },
  { title: 'Bản dịch', detail: 'Chọn dự án và ngôn ngữ đích', icon: 'language', route: '/projects' },
  { title: 'Giọng đọc', detail: 'Chọn dự án để cấu hình giọng đọc', icon: 'mic', route: '/projects' },
];

const monthOptions = Array.from({ length: 12 }, (_, index) => ({ value: index, label: `Tháng ${index + 1}` }));

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function updateLocalDate(date: Date, next: { year?: number; month?: number; day?: number }) {
  const year = next.year ?? date.getFullYear();
  const month = next.month ?? date.getMonth();
  const maximumDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(next.day ?? date.getDate(), maximumDay));
}

function chartRangeDescription(mode: ProjectTimeRange, anchor: Date) {
  if (mode === 'month') return `Tháng ${anchor.getMonth() + 1}/${anchor.getFullYear()}`;
  if (mode === 'year') return `Năm ${anchor.getFullYear()}`;
  return `7 ngày kết thúc ngày ${new Intl.DateTimeFormat('vi-VN').format(anchor)}`;
}

function ProjectTimeFilters({ mode, anchor, onApply }: {
  mode: ProjectTimeRange;
  anchor: Date;
  onApply: (mode: ProjectTimeRange, date: Date) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftMode, setDraftMode] = useState<ProjectTimeRange>(mode);
  const [draftAnchor, setDraftAnchor] = useState(() => new Date(anchor));
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeModeRef = useRef<HTMLButtonElement>(null);

  const closePopover = useCallback((returnFocus = false) => {
    setIsOpen(false);
    if (returnFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    activeModeRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) closePopover();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePopover(true);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closePopover, isOpen]);

  const openPopover = () => {
    setDraftMode(mode);
    setDraftAnchor(new Date(anchor));
    setIsOpen(true);
  };

  const resetDraft = () => {
    setDraftMode('day');
    setDraftAnchor(new Date());
  };

  const applyDraft = () => {
    onApply(draftMode, draftAnchor);
    closePopover(true);
  };

  const modeLabel = mode === 'day' ? 'ngày' : mode === 'month' ? 'tháng' : 'năm';

  return <div className="dashboard-chart-filters" ref={containerRef}>
    <button
      type="button"
      className="dashboard-chart-filters__trigger"
      ref={triggerRef}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls="dashboard-time-filter-popover"
      onClick={() => isOpen ? closePopover() : openPopover()}
    >
      <Icon name="calendar" width="18" />
      <span>Theo {modeLabel}</span>
      <Icon className="dashboard-chart-filters__chevron" name="chevronDown" width="16" />
    </button>
    {isOpen && <div className="dashboard-chart-filters__popover" id="dashboard-time-filter-popover" role="dialog" aria-label="Bộ lọc thời gian">
      <p className="dashboard-chart-filters__label">Khoảng thống kê</p>
      <div className="dashboard-chart-filters__segments" role="group" aria-label="Khoảng thời gian thống kê">
        {([['day', 'Ngày'], ['month', 'Tháng'], ['year', 'Năm']] as const).map(([value, label]) => <button type="button" ref={draftMode === value ? activeModeRef : undefined} className={draftMode === value ? 'is-active' : ''} aria-pressed={draftMode === value} onClick={() => setDraftMode(value)} key={value}>{label}</button>)}
      </div>
      <div className="dashboard-chart-filters__period">
      {draftMode === 'day' ? <label><span>Ngày kết thúc</span><input type="date" value={formatDateInput(draftAnchor)} onChange={(event) => {
        const [year, month, day] = event.target.value.split('-').map(Number);
        if (year && month && day) setDraftAnchor(new Date(year, month - 1, day));
      }} /></label> : <>
        {draftMode === 'month' && <label><span>Tháng</span><select value={draftAnchor.getMonth()} onChange={(event) => setDraftAnchor(updateLocalDate(draftAnchor, { month: Number(event.target.value) }))}>{monthOptions.map((month) => <option value={month.value} key={month.value}>{month.label}</option>)}</select></label>}
        <label><span>Năm</span><input type="number" inputMode="numeric" min="1970" max="9999" value={draftAnchor.getFullYear()} onChange={(event) => {
          const year = Number(event.target.value);
          if (Number.isInteger(year) && year >= 1970 && year <= 9999) setDraftAnchor(updateLocalDate(draftAnchor, { year }));
        }} /></label>
      </>}
      </div>
      <div className="dashboard-chart-filters__actions">
        <button type="button" className="dashboard-chart-filters__reset" onClick={resetDraft}>Đặt lại</button>
        <button type="button" className="dashboard-chart-filters__apply" onClick={applyDraft}>Áp dụng</button>
      </div>
    </div>
    }
  </div>;
}

function ProjectTimeChart({ projects, complete, mode, anchor }: { projects: readonly Project[]; complete: boolean; mode: ProjectTimeRange; anchor: Date }) {
  if (!complete) return <div className="dashboard-chart__empty" role="status"><Icon name="alert" width="22" /><strong>Chưa đủ dữ liệu để lập biểu đồ</strong><span>Danh sách hiện tại chưa chứa tất cả dự án trong tài khoản.</span></div>;
  const series = buildProjectTimeSeries(projects, mode, anchor);
  const scale = buildLinearProjectScale(Math.max(...series.map((day: { value: number }) => day.value), 0));
  const hasData = series.some((day: { value: number }) => day.value > 0);
  const rangeLabel = chartRangeDescription(mode, anchor);
  return <figure className="dashboard-chart" aria-labelledby="project-time-chart-title">
    <figcaption className="visually-hidden">{hasData ? `Số dự án được tạo trong ${rangeLabel.toLocaleLowerCase('vi')}: ${series.map((day: { fullLabel: string; value: number }) => `${day.fullLabel}: ${day.value}`).join(', ')}` : `Chưa có dự án nào được tạo trong ${rangeLabel.toLocaleLowerCase('vi')}`}</figcaption>
    <div className="dashboard-chart__body">
      <div className="dashboard-chart__axis" aria-hidden="true">{scale.ticks.map((tick) => <span key={tick}>{tick}</span>)}</div>
      <div className="dashboard-chart__scroll" tabIndex={mode === 'month' ? 0 : undefined} aria-label={mode === 'month' ? 'Biểu đồ theo ngày, cuộn ngang để xem toàn bộ tháng' : undefined}>
        <div className={`dashboard-chart__plot dashboard-chart__plot--${mode}`} style={{ '--chart-columns': series.length } as CSSProperties}>
          <div className="dashboard-chart__gridlines" aria-hidden="true">{scale.ticks.map((tick) => <span key={tick} />)}</div>
          {series.map((day: { key: string; label: string; fullLabel: string; value: number }, index: number) => {
            const tooltipId = `project-time-${day.key}`;
            return <div className="dashboard-chart__column" tabIndex={0} aria-label={`${day.fullLabel}: ${day.value} dự án`} aria-describedby={tooltipId} key={day.key}>
              <span className="dashboard-chart__track"><span className="dashboard-chart__bar" style={{ height: `${hasData ? (day.value / scale.maximum) * 100 : 0}%` }}><span className="dashboard-chart__value">{day.value}</span></span></span>
              <span className="dashboard-chart__label">{day.label}</span>
              <span className="dashboard-chart__tooltip" id={tooltipId} role="tooltip" data-edge={index === 0 ? 'start' : index === series.length - 1 ? 'end' : undefined}>{day.fullLabel}<strong>{day.value} dự án</strong></span>
            </div>;
          })}
        </div>
      </div>
    </div>
    {!hasData && <p>Chưa có dự án trong khoảng thời gian đã chọn.</p>}
    <small className="dashboard-chart__timezone">Dữ liệu được nhóm theo múi giờ thiết bị.</small>
  </figure>;
}

const DONUT_RADIUS = 68;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function StatusDonutChart({ statistics, complete }: { statistics: ReturnType<typeof calculateProjectStatistics>; complete: boolean }) {
  const [activeKey, setActiveKey] = useState<ProjectStatusDistributionDatum['key'] | null>(null);
  if (!complete) return <div className="dashboard-chart__empty" role="status"><Icon name="alert" width="22" /><strong>Chưa đủ dữ liệu trạng thái</strong><span>Cần toàn bộ danh sách dự án để tính tỷ lệ chính xác.</span></div>;

  const distribution = buildProjectStatusDistribution(statistics);
  const visibleGroups = distribution.filter((item) => item.value > 0);
  const activeGroup = distribution.find((item) => item.key === activeKey) ?? null;

  if (!statistics.total) return <div className="dashboard-donut__empty" role="status"><div className="dashboard-donut__empty-ring"><strong>0</strong><span>Tổng dự án</span></div><p>Chưa có dữ liệu trạng thái dự án.</p></div>;

  return <div className="dashboard-donut" aria-describedby="status-distribution-summary">
    <p className="visually-hidden" id="status-distribution-summary">{distribution.map((item) => `${item.label}: ${item.value} dự án, ${item.percentage}%`).join('. ')}</p>
    <div className="dashboard-donut__visual">
      <svg viewBox="0 0 200 200" role="group" aria-label="Phân bố trạng thái dự án">
        <circle className="dashboard-donut__track" cx="100" cy="100" r={DONUT_RADIUS} />
        {visibleGroups.map((item, index) => {
          const arcLength = (item.percentage / 100) * DONUT_CIRCUMFERENCE;
          const segmentGap = Math.min(4, arcLength * .18);
          const dashLength = Math.max(0, arcLength - segmentGap);
          const dashOffset = -visibleGroups.slice(0, index).reduce((sum, group) => sum + (group.percentage / 100) * DONUT_CIRCUMFERENCE, 0);
          return <circle
            className={`dashboard-donut__segment dashboard-donut__segment--${item.key}`}
            cx="100" cy="100" r={DONUT_RADIUS}
            strokeDasharray={`${dashLength} ${DONUT_CIRCUMFERENCE - dashLength}`}
            strokeDashoffset={dashOffset}
            tabIndex={0}
            role="img"
            aria-label={`${item.label}: ${item.value} dự án, ${item.percentage}%`}
            onMouseEnter={() => setActiveKey(item.key)}
            onMouseLeave={() => setActiveKey(null)}
            onFocus={() => setActiveKey(item.key)}
            onBlur={() => setActiveKey(null)}
            key={item.key}
          ><title>{item.label}: {item.value} dự án, {item.percentage}%</title></circle>;
        })}
        <text className="dashboard-donut__value" x="100" y="96" textAnchor="middle">{activeGroup?.value ?? statistics.total}</text>
        <text className="dashboard-donut__label" x="100" y="118" textAnchor="middle">{activeGroup?.label ?? 'Tổng dự án'}</text>
      </svg>
    </div>
    <ul className="dashboard-donut__legend">{visibleGroups.map((item) => <li
      className={`dashboard-donut__legend-item dashboard-donut__legend-item--${item.key}`}
      tabIndex={0}
      aria-label={`${item.label}: ${item.value} dự án, ${item.percentage}%`}
      onMouseEnter={() => setActiveKey(item.key)}
      onMouseLeave={() => setActiveKey(null)}
      onFocus={() => setActiveKey(item.key)}
      onBlur={() => setActiveKey(null)}
      key={item.key}
    >
      <div><span className="dashboard-donut__legend-name"><i aria-hidden="true" />{item.label}</span><strong>{item.value} · {item.percentage}%</strong></div>
      <span className="dashboard-donut__progress" aria-hidden="true"><span style={{ '--status-progress': `${item.percentage}%` } as CSSProperties} /></span>
    </li>)}</ul>
  </div>;
}

function DashboardProjectAction({ project }: { project: Project }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const resumeLock = useRef(false);
  const mountedRef = useRef(true);
  const requestControllerRef = useRef<AbortController | null>(null);
  const cachedAction = projectAction(project);
  const cachedCanResume = project.workflow?.canResume === true && cachedAction.available && cachedAction.step !== 'unknown';
  const label = cachedCanResume ? 'Tiếp tục' : 'Xem chi tiết';

  useEffect(() => {
    // React StrictMode replays setup/cleanup in development. Resetting the ref
    // in every setup prevents the rehearsal cleanup from looking like a real
    // unmount and suppressing navigation forever.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestControllerRef.current?.abort();
    };
  }, []);

  async function openProject() {
    if (resumeLock.current) return;
    resumeLock.current = true;
    setLoading(true);
    setResumeError(null);
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const destination = await resolveDashboardResume(
        project.id,
        (projectId, signal) => projectRepository.getProjectForResume(projectId, signal),
        projectAction,
        { signal: controller.signal },
      );
      if (!mountedRef.current || controller.signal.aborted) return;
      navigate(destination.path, {
        state: destination.notice ? { resumeNavigationNotice: destination.notice } : undefined,
      });
    } catch {
      if (mountedRef.current && !controller.signal.aborted) {
        setResumeError('Không thể mở dự án. Vui lòng thử lại.');
      }
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
      resumeLock.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }

  return <div className="dashboard-recent-row__action-cell"><Button
    type="button"
    variant="ghost"
    size="sm"
    className="dashboard-recent-row__action"
    loading={loading}
    disabled={loading}
    aria-label={`${label} dự án ${project.name}`}
    onClick={() => void openProject()}
  >{loading ? 'Đang mở' : label}</Button>{resumeError && <small role="alert">{resumeError}</small>}</div>;
}

export function DashboardPlaceholder() {
  const { projects, pagination, isLoading, error, reload } = useProjects();
  const [chartMode, setChartMode] = useState<ProjectTimeRange>('day');
  const [chartAnchor, setChartAnchor] = useState(() => new Date());
  const complete = hasCompleteProjectDataset(projects.length, pagination);
  const statistics = calculateProjectStatistics(projects);
  const recent = getRecentProjects(projects);
  const hasIncompleteMetadata = hasIncompleteProjectMetadata(projects);
  return <div className="dashboard">
    <section className="dashboard-hero">
      <div className="dashboard-hero__copy"><span className="dashboard-eyebrow">CHÀO MỪNG TRỞ LẠI!</span><h1>Tạo thuyết minh đa ngôn ngữ<br />cho video của bạn</h1><p>Một không gian cho bản ghi, bản dịch và giọng đọc.<br className="desktop-break" /> Tiếp tục quy trình thuyết minh đa ngôn ngữ của bạn.</p><Link className="button button--primary button--md hero-cta" to="/projects/new"><Icon name="plus" width="19" />Tạo thuyết minh</Link></div>
      <div className="hero-art" aria-hidden="true"><div className="hero-art__orbit" /><div className="hero-art__video"><div className="hero-art__scene"><span /><i /><b /></div><div className="hero-art__timeline"><Icon name="video" width="15" /><span /></div></div><div className="hero-art__wave"><Icon name="wave" width="104" /></div><div className="hero-art__mic"><Icon name="mic" width="32" /></div><div className="hero-art__languages">{['VI', 'EN', 'JA', 'KO'].map((language, index) => <span key={language}><b>{['Vi', 'En', 'あ', '한'][index]}</b>{language}</span>)}</div></div>
    </section>
    <nav className="quick-actions" aria-label="Lối tắt sáng tạo">{quickActions.map((action) => <Link className="quick-action" to={action.route} key={action.title}><span className="quick-action__icon"><Icon name={action.icon} width="24" /></span><span><strong>{action.title}</strong><small>{action.detail}</small></span></Link>)}</nav>
    {isLoading ? <Card className="dashboard-state"><Spinner size="lg" label="Đang tải bảng điều khiển" /><p>Đang tải dữ liệu dự án...</p></Card> : error ? <Card className="dashboard-state"><ErrorState title="Không thể tải bảng điều khiển" description={error} onRetry={() => void reload()} /></Card> : <>
      {hasIncompleteMetadata && <p className="dashboard-data-notice" role="status"><strong>Dữ liệu chưa đầy đủ.</strong> Thống kê trạng thái dùng dữ liệu dự án đã xác nhận; một số metadata phương tiện hoặc bản dịch chưa tải được.</p>}
      <div className="dashboard-overview dashboard-analytics">
        <Card className="dashboard-chart-card"><div className="dashboard-chart-card__header"><div><h2 id="project-time-chart-title">Thống kê dự án theo thời gian</h2><p>{chartRangeDescription(chartMode, chartAnchor)}</p></div><ProjectTimeFilters mode={chartMode} anchor={chartAnchor} onApply={(nextMode, nextAnchor) => { setChartMode(nextMode); setChartAnchor(nextAnchor); }} /></div><ProjectTimeChart projects={projects} complete={complete} mode={chartMode} anchor={chartAnchor} /></Card>
        <Card className="dashboard-donut-card"><div className="section-heading"><div><h2>Trạng thái dự án</h2><p>Phân bố trên toàn bộ dự án</p></div></div><StatusDonutChart statistics={statistics} complete={complete} /></Card>
      </div>
      <div className="dashboard-grid">
        <Card className="dashboard-projects"><div className="section-heading"><h2>Dự án gần đây</h2><Link to="/projects">Xem tất cả <Icon name="arrow" width="14" /></Link></div>
          {recent.length ? <div className="dashboard-recent-table"><div className="dashboard-recent-table__head" aria-hidden="true"><span>Tên dự án</span><span>Cập nhật</span><span>Ngôn ngữ nguồn</span><span>Trạng thái</span><span>Thao tác</span></div>{recent.map((project) => <article className="dashboard-recent-row" key={project.id}><strong><Link to={`/projects/${project.id}`}>{project.name}</Link></strong><time dateTime={project.updatedAt}>{formatRelativeDate(project.updatedAt)}</time><span>{languageNames[project.sourceLanguage] ?? project.sourceLanguage.toUpperCase()}</span><ProjectStatusBadge status={project.status} /><DashboardProjectAction project={project} /></article>)}</div> : <EmptyState title="Chưa có dự án" description="Tạo dự án đầu tiên để bắt đầu quy trình thuyết minh." action={<Link className="button button--primary button--sm" to="/projects/new">Tạo thuyết minh</Link>} />}
        </Card>
        <Card className="dashboard-activity"><div className="section-heading"><div><h2>Hoạt động gần đây</h2><p>Cập nhật trạng thái dự án</p></div></div>{recent.length ? <ul>{recent.slice(0, 4).map((project) => <li key={project.id}><span className={`activity-icon activity-icon--${project.status.toLowerCase()}`}><Icon name={project.status === 'COMPLETED' ? 'check' : project.status === 'FAILED' ? 'alert' : 'history'} width="14" /></span><div><p><strong>{project.name}</strong> · {getProjectStatusLabel(project.status)}</p><time dateTime={project.updatedAt}>{formatRelativeDate(project.updatedAt)}</time></div></li>)}</ul> : <p className="dashboard-activity__empty">Chưa có hoạt động gần đây</p>}<Link className="activity-history" to="/history">Xem lịch sử <Icon name="arrow" width="14" /></Link></Card>
      </div>
    </>}
  </div>;
}
