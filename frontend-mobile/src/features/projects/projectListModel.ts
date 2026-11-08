import type { Project, ProjectStatusFilter } from './types';

export type ProjectListFilters = { query: string; status: ProjectStatusFilter; period: string; from: string; to: string; sort: string };
export const defaultProjectListFilters: ProjectListFilters = { query: '', status: 'ALL', period: 'ALL', from: '', to: '', sort: 'NEWEST' };
export const projectPeriodOptions = [['ALL', 'Tất cả thời gian'], ['TODAY', 'Hôm nay'], ['WEEK', '7 ngày gần đây'], ['MONTH', 'Tháng này'], ['YEAR', 'Năm nay'], ['CUSTOM', 'Khoảng ngày tùy chọn']] as const;
export const projectSortOptions = [['NEWEST', 'Mới nhất'], ['OLDEST', 'Cũ nhất'], ['NAME_ASC', 'Tên A–Z'], ['NAME_DESC', 'Tên Z–A']] as const;
export function projectDateError(filters: ProjectListFilters) {
  if (filters.period !== 'CUSTOM') return '';
  if (!filters.from || !filters.to) return 'Vui lòng chọn ngày bắt đầu và ngày kết thúc.';
  if (!validDate(filters.from) || !validDate(filters.to)) return 'Vui lòng nhập ngày hợp lệ theo YYYY-MM-DD.';
  return filters.from > filters.to ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' : '';
}
function dateParts(value: string) { const [y, m, d] = value.split('-').map(Number); return { y, m, d }; }
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { y, m, d } = dateParts(value), date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
const normalize = (value: string) => value.trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
// Port of Web projectListFilters + historyFilters: only complete account data enters this selector.
export function filterAndSortProjects(projects: readonly Project[], filters: ProjectListFilters, now = new Date()) {
  if (projectDateError(filters)) return [];
  let start: Date | undefined, end: Date | undefined;
  if (filters.period !== 'ALL') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (filters.period === 'WEEK') start.setDate(start.getDate() - 6);
    if (filters.period === 'MONTH') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 1); }
    if (filters.period === 'YEAR') { start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear() + 1, 0, 1); }
    if (filters.period === 'CUSTOM') {
      const from = dateParts(filters.from), to = dateParts(filters.to);
      start = new Date(from.y, from.m - 1, from.d); end = new Date(to.y, to.m - 1, to.d + 1);
    }
  }
  const items = projects.filter(project => normalize(project.name).includes(normalize(filters.query)) && (filters.status === 'ALL' || project.status === filters.status) && (!start || (project.createdAt && Date.parse(project.createdAt) >= start.getTime() && Date.parse(project.createdAt) < end!.getTime())));
  const compare = new Intl.Collator('vi', { sensitivity: 'base', numeric: true }).compare;
  return items.sort((a, b) => { const delta = filters.sort.startsWith('NAME') ? compare(a.name, b.name) : (Date.parse(a.createdAt ?? '') || 0) - (Date.parse(b.createdAt ?? '') || 0); return (filters.sort === 'OLDEST' || filters.sort === 'NAME_ASC' ? delta : -delta) || a.id.localeCompare(b.id); });
}
export function projectListPage(items: readonly Project[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / 10));
  const page = Math.min(Math.max(1, Number.isInteger(requestedPage) ? requestedPage : 1), totalPages);
  return { projects: items.slice((page - 1) * 10, page * 10), page, totalPages, total: items.length };
}
export function projectListLanguagePair(project: Project) {
  const labels: Record<string, string> = { vi: 'Tiếng Việt', en: 'Tiếng Anh', ja: 'Tiếng Nhật', ko: 'Tiếng Hàn' };
  const display = (code: string | null | undefined) => { if (typeof code !== 'string' || !code.trim()) return 'Chưa xác định'; const normalized = code.toLowerCase(); if (labels[normalized]) return labels[normalized]; try { return new Intl.DisplayNames(['vi'], { type: 'language' }).of(normalized) ?? code.toUpperCase(); } catch { return code.toUpperCase(); } };
  const state = project.metadataState?.translation;
  const target = project.targetLanguage ? display(project.targetLanguage) : state === undefined || state === 'EMPTY' ? 'Chưa dịch' : state === 'ERROR' ? 'Không tải được bản dịch' : 'Chưa xác định';
  return `${display(project.sourceLanguage)} → ${target}`;
}
export function projectListActionLabel(project: Project) {
  const workflow = project.workflow;
  if (!workflow || workflow.step === 'UNKNOWN' || workflow.state === 'BLOCKED' || (workflow.step === 'UPLOAD' && (workflow.state !== 'READY' || !workflow.canResume))) return 'Xem chi tiết';
  return workflow.state === 'FAILED' ? 'Mở bước gặp lỗi' : workflow.state === 'PROCESSING' ? 'Xem tiến trình' : workflow.step === 'RESULT' ? 'Xem kết quả' : workflow.step === 'UPLOAD' ? 'Tiếp tục tải lên' : 'Tiếp tục';
}
