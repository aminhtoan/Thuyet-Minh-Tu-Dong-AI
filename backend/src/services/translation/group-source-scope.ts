import { AsyncLocalStorage } from 'node:async_hooks';
import type { GroupAdmission } from './group-admission.js';
import { controlledScopeActive } from './controlled-development.js';

const sourceScope = new AsyncLocalStorage<{ admission: GroupAdmission; active: boolean }>();
// Isolated composition only; production/default readers keep their 96 KiB cap.
export function scopedGroupAdmission() {
  const scope = sourceScope.getStore();
  return scope?.active ? scope.admission : undefined;
}
export async function withGroupSourceScope<T>(admission: GroupAdmission, work: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV !== 'test' && !controlledScopeActive()) throw new Error('GROUP_SOURCE_SCOPE_REQUIRES_TEST_ENV');
  const scope = { admission, active: true };
  try { return await sourceScope.run(scope, work); } finally { scope.active = false; }
}
