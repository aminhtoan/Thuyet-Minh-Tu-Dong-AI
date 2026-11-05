import { useEffect, useState } from 'react';
import { adminCustomerService } from '../services/adminCustomerService';
import type { CustomerFilters, CustomerListResult, CustomerSummary } from '../types/customer';

export function useAdminCustomers(filters: CustomerFilters) {
  const key = `${filters.page}|${filters.limit}|${filters.search}|${filters.status}|${filters.sort}`;
  const [state, setState] = useState<{ key: string; data: CustomerListResult | null; summary: CustomerSummary | null; error: boolean }>({ key: '', data: null, summary: null, error: false });
  const [request, setRequest] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    adminCustomerService.getCustomers({ page: filters.page, limit: filters.limit, search: filters.search, status: filters.status, sort: filters.sort, signal: controller.signal }).then(value => { if (!controller.signal.aborted) setState({ key: `${key}|${request}`, data: value, summary: value.summary, error: false }); }).catch(() => { if (!controller.signal.aborted) setState(previous => ({ key: `${key}|${request}`, data: null, summary: previous.summary, error: true })); });
    return () => controller.abort();
  }, [filters.page, filters.limit, filters.search, filters.status, filters.sort, key, request]);
  const currentKey = `${key}|${request}`;
  return { data: state.key === currentKey ? state.data : null, summary: state.summary, loading: state.key !== currentKey, error: state.key === currentKey && state.error, retry: () => setRequest(value => value + 1) };
}
