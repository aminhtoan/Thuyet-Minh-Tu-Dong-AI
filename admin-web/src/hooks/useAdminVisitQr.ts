import { useEffect, useState } from 'react';
import { adminVisitQrService } from '../services/adminVisitQrService';
import type { VisitQrFilters, VisitQrListResult } from '../types/visitQr';

export function useAdminVisitQr(filters: VisitQrFilters) {
  const key = `${filters.page}|${filters.limit}|${filters.search}|${filters.source}|${filters.deviceType}|${filters.os}|${filters.startDate}|${filters.endDate}|${filters.visitorDays}`;
  const [state, setState] = useState<{ key: string; data: VisitQrListResult | null; error: boolean }>({
    key: '',
    data: null,
    error: false,
  });
  const [request, setRequest] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    adminVisitQrService
      .getVisitQrs({
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        source: filters.source,
        deviceType: filters.deviceType,
        os: filters.os,
        startDate: filters.startDate,
        endDate: filters.endDate,
        visitorDays: filters.visitorDays,
        signal: controller.signal,
      })
      .then((value) => {
        if (!controller.signal.aborted) {
          setState({ key: `${key}|${request}`, data: value, error: false });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ key: `${key}|${request}`, data: null, error: true });
        }
      });

    return () => controller.abort();
  }, [
    filters.page,
    filters.limit,
    filters.search,
    filters.source,
    filters.deviceType,
    filters.os,
    filters.startDate,
    filters.endDate,
    filters.visitorDays,
    key,
    request,
  ]);

  const currentKey = `${key}|${request}`;
  return {
    data: state.key === currentKey ? state.data : null,
    loading: state.key !== currentKey,
    error: state.key === currentKey && state.error,
    retry: () => setRequest((value) => value + 1),
  };
}
