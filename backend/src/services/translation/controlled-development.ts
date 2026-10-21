import { AsyncLocalStorage } from 'node:async_hooks';
import { revision, type SourceSnapshot } from './group-plan.js';
import { AppError } from '../../utils/app-error.js';
import type { OneUsePermitFence } from './one-use-permit.js';
import { controlledTarget } from './controlled-target.js';
export { controlledTarget } from './controlled-target.js';

// This capability is deliberately absent from the normal server composition.
// DENY means readiness only: no provider or database mutation is authorized.
const scope = new AsyncLocalStorage<{ ownerId: string; active: boolean; fence?: OneUsePermitFence }>();
export function controlledScopeActive() {
  const current = scope.getStore();
  return process.env.NODE_ENV === 'development' && current?.active === true &&
    (current.fence ? process.env.CONTROLLED_PROVIDER_MODE === 'PERMIT' : process.env.CONTROLLED_PROVIDER_MODE === 'DENY');
}
export function controlledReadinessActive() { return controlledScopeActive() && !scope.getStore()?.fence; }
export function assertDispatchScope(fence: OneUsePermitFence) {
  if (!controlledScopeActive() || scope.getStore()?.fence !== fence) throw new Error('CONTROLLED_DISPATCH_SCOPE_DENIED');
  fence.assertUsable(scope.getStore()!.ownerId);
}
export async function withPermittedSource<T>(fence: OneUsePermitFence, ownerId: string, work: () => Promise<T>) {
  if (process.env.NODE_ENV !== 'development' || process.env.CONTROLLED_PROVIDER_MODE !== 'PERMIT') throw new Error('CONTROLLED_EXECUTION_DENIED');
  fence.assertUsable(ownerId);
  const context = { ownerId, active: true, fence };
  try { return await scope.run(context, work); } finally { context.active = false; }
}
export function assertControlledRequest(projectId: string, ownerId?: string, targetLanguage?: string) {
  if (!controlledScopeActive() || projectId !== controlledTarget.projectId ||
    (ownerId !== undefined && ownerId !== scope.getStore()?.ownerId) ||
    (targetLanguage !== undefined && targetLanguage !== controlledTarget.targetLanguage)) {
    throw new AppError(403, 'CONTROLLED_SCOPE_DENIED', 'Controlled development scope does not authorize this operation.');
  }
}
export async function withControlledSource<T>(ownerId: string, work: () => Promise<T>) {
  if (process.env.NODE_ENV !== 'development' || process.env.CONTROLLED_PROVIDER_MODE !== 'DENY' || !/^[a-f\d]{24}$/i.test(ownerId)) throw new Error('CONTROLLED_READINESS_ONLY');
  const context = { ownerId, active: true };
  try { return await scope.run(context, work); } finally { context.active = false; }
}
export function assertControlledSource(projectId: string, source: SourceSnapshot) {
  assertControlledRequest(projectId);
  if (source.transcriptRevision !== controlledTarget.transcriptRevision || source.languageCode !== controlledTarget.sourceLanguage || revision(source) !== controlledTarget.sourceDigest) {
    throw new AppError(409, 'SOURCE_REVISION_MISMATCH', 'Approved source binding no longer matches.');
  }
}
