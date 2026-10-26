export interface VisitQrItem {
  id: string;
  source: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown' | string;
  os: string | null;
  browser: string | null;
  targetPath: string;
  location: string | null;
  createdAt: string;
}

export interface VisitQrSummary {
  totalListens?: number;
  listenStats?: {
    total: number;
    web: number;
    mobile: number;
  };
  today: number;
  todayUnique: number;
  total: number;
  totalUnique: number;
}

export interface VisitQrPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VisitQrFilters {
  page?: number;
  limit?: number;
  search?: string;
  source?: string;
  deviceType?: string;
  os?: string;
  startDate?: string;
  endDate?: string;
  signal?: AbortSignal;
}

export interface VisitQrListResult {
  items: VisitQrItem[];
  summary: VisitQrSummary;
  pagination: VisitQrPagination;
}
