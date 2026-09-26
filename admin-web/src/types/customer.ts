import type { ProjectStatus, UserRole, UserStatus } from './domain';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRecentProject {
  id: string;
  name: string;
  languagePair: string;
  status: ProjectStatus;
  updatedAt: string;
}

export interface AdminCustomer extends User {
  role: 'CUSTOMER';
  projectCount: number;
  completedProjectCount: number;
  processingProjectCount: number;
  failedProjectCount: number;
  lastActiveAt: string;
  recentProjects: CustomerRecentProject[];
}

export type CustomerSort = 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'NAME_DESC';
export interface CustomerFilters { page?: number; limit?: number; search?: string; status?: UserStatus | 'ALL'; sort?: CustomerSort; signal?: AbortSignal }
export interface CustomerSummary { total: number; active: number; blocked: number; newCustomers: number }
export interface CustomerPagination { page: number; limit: number; total: number; totalPages: number }
export interface CustomerListResult { items: AdminCustomer[]; summary: CustomerSummary; pagination: CustomerPagination }
