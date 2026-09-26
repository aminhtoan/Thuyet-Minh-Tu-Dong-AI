import { useEffect, useState } from 'react';
import { adminCustomerService } from '../services/adminCustomerService';
import type { CustomerFilters, CustomerListResult } from '../types/customer';

export function useAdminCustomers(filters: CustomerFilters) {
  const key = `${filters.page}|${filters.limit}|${filters.search}|${filters.status}|${filters.sort}`;
  const [state, setState] = useState<{ key: string; data: CustomerListResult | null; error: boolean }>({ key: '', data: null, error: false });
  const [request, setRequest] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    adminCustomerService.getCustomers({ page: filters.page, limit: filters.limit, search: filters.search, status: filters.status, sort: filters.sort, signal: controller.signal }).then(value => { if (!controller.signal.aborted) setState({ key: `${key}|${request}`, data: value, error: false }); }).catch(() => { if (!controller.signal.aborted) setState({ key: `${key}|${request}`, data: null, error: true }); });
    return () => controller.abort();
  }, [filters.page, filters.limit, filters.search, filters.status, filters.sort, key, request]);
  const currentKey = `${key}|${request}`;
  return { data: state.key === currentKey ? state.data : null, loading: state.key !== currentKey, error: state.key === currentKey && state.error, retry: () => setRequest(value => value + 1) };
}
