import type { IconName } from '../common/Icon';
export const navigation: { group: string; items: { to: string; label: string; icon: IconName }[] }[] = [
  { group: 'TỔNG QUAN', items: [{ to: '/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' }] },
  { group: 'QUẢN LÝ', items: [{ to: '/users', label: 'Cán bộ biên tập', icon: 'users' }, { to: '/projects', label: 'Dự án', icon: 'projects' }, { to: '/jobs', label: 'Công việc xử lý', icon: 'jobs' }, { to: '/visit-qr', label: 'Lượt quét QR', icon: 'qr' }] },
  { group: 'CẤU HÌNH', items: [{ to: '/languages', label: 'Ngôn ngữ', icon: 'languages' }, { to: '/voices', label: 'Giọng đọc', icon: 'voices' }] },
  { group: 'HỆ THỐNG', items: [{ to: '/logs', label: 'Nhật ký', icon: 'logs' }, { to: '/settings', label: 'Cài đặt', icon: 'settings' }] },
];
