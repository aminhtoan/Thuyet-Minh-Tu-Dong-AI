import { createAdminCustomerMock } from '../mocks/adminCustomers.mock';
import { adminCustomerScenario } from '../mocks/adminCustomerScenario';
import type { AdminCustomer, CustomerFilters, CustomerListResult, CustomerSort } from '../types/customer';
import type { UserStatus } from '../types/domain';

let customers = createAdminCustomerMock();
const copy = <T>(value: T): T => structuredClone(value);
function wait(signal?: AbortSignal, latencyMs = adminCustomerScenario.latencyMs) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, Math.max(0, latencyMs));
    signal?.addEventListener('abort', abort, { once: true });
  });
}
function sorted(items: AdminCustomer[], sort: CustomerSort) {
  return items.sort((a, b) => sort === 'OLDEST' ? a.createdAt.localeCompare(b.createdAt) : sort === 'NAME_ASC' ? a.fullName.localeCompare(b.fullName, 'vi') : sort === 'NAME_DESC' ? b.fullName.localeCompare(a.fullName, 'vi') : b.createdAt.localeCompare(a.createdAt));
}
async function changeStatus(userId: string, status: UserStatus, signal?: AbortSignal, latencyMs?: number) {
  await wait(signal, latencyMs);
  if (adminCustomerScenario.failNextMutation) { adminCustomerScenario.failNextMutation = false; throw new Error('Customer mutation failed'); }
  const customer = customers.find(item => item.id === userId && item.role === 'CUSTOMER');
  if (!customer) throw new Error('Customer not found');
  if (customer.status !== status) { customer.status = status; customer.updatedAt = new Date().toISOString(); }
  return copy(customer);
}
export const adminCustomerService = {
  async getCustomers(filters: CustomerFilters & { latencyMs?: number } = {}): Promise<CustomerListResult> {
    await wait(filters.signal, filters.latencyMs);
    if (adminCustomerScenario.mode === 'error') throw new Error('Customers unavailable');
    const source = adminCustomerScenario.mode === 'empty' ? [] : customers.filter(item => item.role === 'CUSTOMER');
    const summary = { total: source.length, active: source.filter(item => item.status === 'ACTIVE').length, blocked: source.filter(item => item.status === 'BLOCKED').length, newCustomers: source.filter(item => Date.parse(item.createdAt) >= Date.parse('2026-08-27T00:00:00.000Z')).length };
    const query = filters.search?.trim().toLocaleLowerCase('vi') ?? '';
    let result = source.filter(item => (!query || `${item.fullName} ${item.email}`.toLocaleLowerCase('vi').includes(query)) && (!filters.status || filters.status === 'ALL' || item.status === filters.status));
    result = sorted([...result], filters.sort ?? 'NEWEST');
    const limit = Math.max(1, Math.floor(filters.limit ?? 10));
    const totalPages = Math.max(1, Math.ceil(result.length / limit));
    const page = Math.min(totalPages, Math.max(1, Math.floor(filters.page ?? 1)));
    return copy({ items: result.slice((page - 1) * limit, page * limit), summary, pagination: { page, limit, total: result.length, totalPages } });
  },
  async getCustomerById(userId: string, options: { signal?: AbortSignal; latencyMs?: number } = {}) {
    await wait(options.signal, options.latencyMs);
    if (adminCustomerScenario.mode === 'error') throw new Error('Customer unavailable');
    return copy((adminCustomerScenario.mode === 'empty' ? undefined : customers.find(item => item.id === userId && item.role === 'CUSTOMER')) ?? null);
  },
  blockCustomer: (userId: string, options: { signal?: AbortSignal; latencyMs?: number } = {}) => changeStatus(userId, 'BLOCKED', options.signal, options.latencyMs),
  unblockCustomer: (userId: string, options: { signal?: AbortSignal; latencyMs?: number } = {}) => changeStatus(userId, 'ACTIVE', options.signal, options.latencyMs),
  resetForTests() { customers = createAdminCustomerMock(); adminCustomerScenario.mode = 'success'; adminCustomerScenario.failNextMutation = false; },
};
