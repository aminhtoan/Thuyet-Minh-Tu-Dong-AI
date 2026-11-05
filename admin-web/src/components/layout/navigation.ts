import type { IconName } from '../common/Icon';
export type NavigationLink = { to: string; label: string; icon: IconName };
export type NavigationItem = NavigationLink | { id: string; label: string; icon: IconName; children: NavigationLink[] };
export const navigation: { group: string; items: NavigationItem[] }[] = [
  { group: 'TỔNG QUAN', items: [{ to: '/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' }] },
  { group: 'QUẢN LÝ NỘI DUNG', items: [{ to: '/users', label: 'Quản lý người dùng', icon: 'users' }, { to: '/projects', label: 'Dự án thuyết minh', icon: 'projects' }, { to: '/jobs', label: 'Công việc xử lý', icon: 'jobs' }] },
  { group: 'KHÁCH THAM QUAN', items: [{ to: '/visit-qr', label: 'Thống kê truy cập', icon: 'qr' }] },
  { group: 'HỆ THỐNG', items: [
    { id: 'language-voices', label: 'Ngôn ngữ & Giọng đọc', icon: 'languages', children: [{ to: '/languages', label: 'Ngôn ngữ', icon: 'languages' }, { to: '/voices', label: 'Giọng đọc', icon: 'voices' }] },
    { to: '/logs', label: 'Nhật ký hệ thống', icon: 'logs' },
    { to: '/settings', label: 'Cấu hình hệ thống', icon: 'settings' },
  ] },
];
export const navigationLinks = navigation.flatMap(group => group.items.flatMap(item => 'children' in item ? item.children : [item]));
export function navigationMatches(link: NavigationLink, pathname: string) {
  return link.to === pathname || (['/users', '/projects', '/jobs'].includes(link.to) && pathname.startsWith(link.to + '/'));
}
export function navigationTitle(pathname: string) {
  return navigationLinks.find(link => navigationMatches(link, pathname))?.label ?? 'Không tìm thấy trang';
}
