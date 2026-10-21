import type { OneUsePermitFence } from '../services/translation/one-use-permit.js';
import { permitSchema } from '../services/translation/one-use-permit.js';
import type { GroupAdmission } from '../services/translation/group-admission.js';
import { digest } from '../services/translation/group-plan.js';
import { readExecutionStatus } from './execution-status.js';

// An observation, never a lease or a permit issuer. Startup attests deployment;
// readExecutionStatus rechecks source/input/plan/deployment through the verifier.
export async function webExecutionReadiness(fence: OneUsePermitFence, admission: GroupAdmission, enabled: boolean,
  verify?: Parameters<typeof readExecutionStatus>[2]) {
  const denied = (state: 'LOCKED' | 'EXPIRED' | 'CONSUMED' | 'MISMATCHED') => ({ state, executionAllowed: false as const });
  if (!enabled || process.env.NODE_ENV !== 'development') return denied('LOCKED');
  try {
    const p = permitSchema.parse(fence.permit);
    const state = await fence.readStatus();
    if (state === 'REQUEST_CONSUMED') return denied('CONSUMED');
    if (Date.now() >= p.expiresAt) return denied('EXPIRED');
    if (state !== 'UNUSED' || !p.deploymentId || p.thinking !== 'MEDIUM') return denied('MISMATCHED');
    const status = await readExecutionStatus(fence, admission, verify);
    if (status.state === 'REQUEST_CONSUMED') return denied('CONSUMED');
    if (status.state !== 'READY' || !('source' in status)) return denied('MISMATCHED');
    return { state: 'READY' as const, executionAllowed: true as const, authorizationId: digest(p),
      expiresAt: p.expiresAt, scope: status.scope, source: status.source,
      limits: { metadataRequests: 1, generationRequests: 1, retries: 0, timeoutMs: 120000, maxOutputTokens: 8192 } };
  } catch { return denied('MISMATCHED'); }
}
