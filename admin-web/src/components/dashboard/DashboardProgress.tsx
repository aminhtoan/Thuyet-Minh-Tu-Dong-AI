import { clampProgress } from '../../utils/dashboardFormat';
export function DashboardProgress({ value, label }: { value?: number; label: string }) {
  if (value === undefined) return <span className="muted">Chưa có tiến độ</span>;
  const progress = clampProgress(value);
  return <div className="dashboard-progress"><div className="dashboard-progress__track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: progress + '%' }} /></div><span>{progress}%</span></div>;
}
