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
  totalVisitors?: number;
  total: number;
  totalUnique: number;
}

export interface VisitQrPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VisitorListenStat {
  visitorId: string;
  ipAddress: string | null;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown' | string;
  os: string | null;
  browser: string | null;
  totalListens: number;
  language: string;
  languageCode?: string;
  lastListenedAt: string;
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
  visitorDays?: number;
  signal?: AbortSignal;
}

export interface VisitorProfile {
  id: string;
  visitorCode: string;
  ipAddress: string | null;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown' | string;
  os: string | null;
  browser: string | null;
  totalScans: number;
  totalListens: number;
  languages?: string[];
  firstVisitAt: string;
  lastVisitAt: string;
}

export interface VisitQrListResult {
  items: VisitQrItem[];
  topVisitors?: VisitorListenStat[];
  visitors?: VisitorProfile[];
  summary: VisitQrSummary;
  pagination: VisitQrPagination;
}

