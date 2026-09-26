import { useEffect, useState } from 'react';
import { adminCustomerService } from '../services/adminCustomerService';
import type { AdminCustomer } from '../types/customer';
export function useAdminCustomer(userId: string) {
  const [state, setState] = useState<{ key: string; customer: AdminCustomer | null; error: boolean }>({ key: '', customer: null, error: false }); const [request, setRequest] = useState(0); const key = `${userId}|${request}`;
  useEffect(() => { const controller = new AbortController(); adminCustomerService.getCustomerById(userId, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setState({ key, customer: value, error: false }); }).catch(() => { if (!controller.signal.aborted) setState({ key, customer: null, error: true }); }); return () => controller.abort(); }, [userId, request, key]);
  return { customer: state.key === key ? state.customer : null, setCustomer: (customer: AdminCustomer) => setState({ key, customer, error: false }), loading: state.key !== key, error: state.key === key && state.error, retry: () => setRequest(value => value + 1) };
}
