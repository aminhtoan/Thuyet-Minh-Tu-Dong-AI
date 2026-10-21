import { AppError } from '../../utils/app-error.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { withGroupSourceScope } from './group-source-scope.js';
import { controlledScopeActive } from './controlled-development.js';

export type GroupTestPolicy = Readonly<{
  sourceBytes: number; processCredits: number; requestCredits: number;
  maxActive: number; maxActivePerUser: number;
}>;
const exhausted = () => new AppError(503, 'TRANSLATION_CAPACITY_EXHAUSTED', 'Hệ thống đang hết dung lượng dịch thử nghiệm. Vui lòng thử lại sau.');
// Explicit isolated-test configuration only. These are estimated credits, NOT
// a hard heap/native-memory bound or production deployment recommendation.
export function groupTestPolicy(options: GroupTestPolicy): GroupTestPolicy {
  if (process.env.NODE_ENV !== 'test' && !controlledScopeActive()) throw new Error('GROUP_TEST_POLICY_REQUIRES_TEST_ENV');
  for (const key of ['sourceBytes', 'processCredits', 'requestCredits', 'maxActive', 'maxActivePerUser'] as const) {
    const value = options[key];
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('GROUP_TEST_POLICY_INVALID');
  }
  if (options.sourceBytes > 128 * 1024 || options.requestCredits < options.sourceBytes * 32 + 8 * 128 * 1024 || options.processCredits < options.requestCredits || options.maxActivePerUser > options.maxActive) throw new Error('GROUP_TEST_POLICY_INVALID');
  return Object.freeze({ ...options });
}
export class GroupAdmission {
  private readonly scope = new AsyncLocalStorage<{ ownerId: string; active: boolean }>();
  private credits = 0;
  private active = 0;
  private users = new Map<string, number>();
  readonly policy: GroupTestPolicy;
  constructor(policy: GroupTestPolicy) { this.policy = groupTestPolicy(policy); }
  snapshot() { return Object.freeze({ reservedCredits: this.credits, active: this.active }); }
  acquire(ownerId: string, retainedInScope = false) {
    const { policy } = this;
    const scoped = this.scope.getStore();
    const countsActive = !(retainedInScope && scoped?.active && scoped.ownerId === ownerId);
    if (!ownerId || (countsActive && (this.active >= policy.maxActive || (this.users.get(ownerId) ?? 0) >= policy.maxActivePerUser)) || this.credits + policy.requestCredits > policy.processCredits) throw exhausted();
    this.credits += policy.requestCredits;
    if (countsActive) { this.active++; this.users.set(ownerId, (this.users.get(ownerId) ?? 0) + 1); }
    let working = countsActive, released = false;
    const settled = () => {
      if (!working) return; working = false; this.active--;
      const count = (this.users.get(ownerId) ?? 1) - 1;
      if (count) this.users.set(ownerId, count); else this.users.delete(ownerId);
    };
    return {
      // Full conservative credit stays charged while the draft/promise is cached.
      settled,
      release: () => { if (released) return; released = true; settled(); this.credits -= policy.requestCredits; },
    };
  }
  // Each HTTP caller/waiter owns a slot until BOTH work and response settle.
  // A retained provider/draft lease is separately charged, without double-counting
  // the enclosing HTTP active slot. Credits are still conservative estimates.
  async responseScope<T>(ownerId: string, work: () => Promise<T>): Promise<T> {
    const lease = this.acquire(ownerId);
    const scoped = { ownerId, active: true };
    try { return await this.scope.run(scoped, () => withGroupSourceScope(this, work)); } finally { scoped.active = false; lease.release(); }
  }
  operationLease(ownerId: string) {
    const scoped = this.scope.getStore();
    if (scoped?.active && scoped.ownerId === ownerId) return { settled() {}, release() {} };
    return this.acquire(ownerId);
  }
  async operation<T>(ownerId: string, work: () => Promise<T>): Promise<T> {
    const current = this.scope.getStore();
    if (current?.active && current.ownerId === ownerId) return work();
    const lease = this.operationLease(ownerId);
    const scoped = { ownerId, active: true };
    try { return await this.scope.run(scoped, () => withGroupSourceScope(this, work)); } finally { scoped.active = false; lease.release(); }
  }
}
