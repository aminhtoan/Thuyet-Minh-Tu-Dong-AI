import { adminApi } from '../lib/api';
import type { VisitQrFilters, VisitQrListResult } from '../types/visitQr';

export const adminVisitQrService = {
  async getVisitQrs(filters: VisitQrFilters = {}): Promise<VisitQrListResult> {
    const params = new URLSearchParams({
      page: String(filters.page ?? 1),
      limit: String(filters.limit ?? 15),
    });

    if (filters.search?.trim()) params.set('search', filters.search.trim());
    if (filters.source?.trim() && filters.source !== 'ALL') params.set('source', filters.source.trim());
    if (filters.deviceType?.trim() && filters.deviceType !== 'ALL') params.set('deviceType', filters.deviceType.trim());
    if (filters.os?.trim() && filters.os !== 'ALL') params.set('os', filters.os.trim());
    if (filters.startDate?.trim()) params.set('startDate', filters.startDate.trim());
    if (filters.endDate?.trim()) params.set('endDate', filters.endDate.trim());

    return adminApi<VisitQrListResult>(`/admin/visit-qr?${params}`, { signal: filters.signal });
  },
};
