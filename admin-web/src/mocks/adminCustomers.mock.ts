import type { AdminCustomer, CustomerRecentProject } from '../types/customer';
import type { ProjectStatus, UserStatus } from '../types/domain';

const names = [
  ['kh-001', 'Nguyễn Văn An', 'nguyen.an@demo.example', 'ACTIVE', 12, 7, 4, 1, 4],
  ['kh-002', 'Trần Minh Bình', 'minh.binh@demo.example', 'BLOCKED', 4, 3, 0, 1, 45],
  ['kh-003', 'Lê Hoàng Minh', 'hoang.minh@demo.example', 'ACTIVE', 8, 6, 2, 0, 9],
  ['kh-004', 'Phạm Ngọc Anh', 'ngoc.anh@demo.example', 'ACTIVE', 6, 4, 1, 1, 18],
  ['kh-005', 'Võ Thanh Tùng', 'thanh.tung@demo.example', 'BLOCKED', 3, 2, 0, 1, 70],
  ['kh-006', 'Đặng Thu Hà', 'thu.ha@demo.example', 'ACTIVE', 15, 11, 3, 1, 2],
  ['kh-007', 'Bùi Quốc Huy', 'quoc.huy@demo.example', 'ACTIVE', 2, 1, 1, 0, 26],
  ['kh-008', 'Đỗ Mai Lan', 'mai.lan@demo.example', 'ACTIVE', 9, 7, 2, 0, 12],
  ['kh-009', 'Hồ Gia Bảo', 'gia.bao@demo.example', 'BLOCKED', 5, 2, 2, 1, 95],
  ['kh-010', 'Ngô Thảo Vy', 'thao.vy@demo.example', 'ACTIVE', 7, 5, 2, 0, 7],
  ['kh-011', 'Dương Đức Long', 'duc.long@demo.example', 'ACTIVE', 11, 8, 2, 1, 31],
  ['kh-012', 'Lý Khánh Linh', 'khanh.linh@demo.example', 'ACTIVE', 1, 0, 1, 0, 1],
  ['kh-013', 'Huỳnh Nhật Nam', 'nhat.nam@demo.example', 'BLOCKED', 6, 4, 1, 1, 58],
  ['kh-014', 'Trương Yến Nhi', 'yen.nhi@demo.example', 'ACTIVE', 10, 8, 2, 0, 22],
] as const;

const statuses: ProjectStatus[] = ['COMPLETED', 'PROCESSING_VIDEO', 'TRANSLATING', 'FAILED'];
const projectNames = ['Giới thiệu sản phẩm', 'Hành trình miền Trung', 'Khóa học trực tuyến', 'Phim tài liệu du lịch'];
function isoDaysAgo(days: number, hour = 9) { return new Date(Date.UTC(2026, 8, 26 - days, hour)).toISOString(); }
function projects(customerIndex: number, count: number): CustomerRecentProject[] {
  return Array.from({ length: Math.min(count, 4) }, (_, index) => ({
    id: `du-an-${customerIndex + 1}-${index + 1}`,
    name: projectNames[(customerIndex + index) % projectNames.length],
    languagePair: ['VI → EN', 'VI → JA', 'EN → VI', 'VI → KO'][(customerIndex + index) % 4],
    status: statuses[index % statuses.length],
    updatedAt: isoDaysAgo(index, 8 + index),
  }));
}

export function createAdminCustomerMock(): AdminCustomer[] {
  return names.map(([id, fullName, email, status, projectCount, completed, processing, failed, joinedDays], index) => ({
    id, fullName, email, status: status as UserStatus, role: 'CUSTOMER', projectCount,
    completedProjectCount: completed, processingProjectCount: processing, failedProjectCount: failed,
    createdAt: isoDaysAgo(joinedDays), updatedAt: isoDaysAgo(index % 9), lastActiveAt: isoDaysAgo(index % 5, 12),
    recentProjects: projects(index, projectCount),
  }));
}
