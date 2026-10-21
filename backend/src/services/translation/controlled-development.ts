import { AsyncLocalStorage } from 'node:async_hooks';
import { revision, type SourceSnapshot } from './group-plan.js';
import { AppError } from '../../utils/app-error.js';
import type { OneUsePermitFence } from './one-use-permit.js';
import { controlledPolicy } from './controlled-target.js';

// This capability is deliberately absent from the normal server composition.
// DENY means readiness only: no provider or database mutation is authorized.
const scope = new AsyncLocalStorage<{ ownerId: string; active: boolean; projectId?: string; fence?: OneUsePermitFence }>();
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
  const current = scope.getStore();
  if (!controlledScopeActive() || projectId !== (current?.fence?.permit.projectId ?? current?.projectId) ||
    (ownerId !== undefined && ownerId !== scope.getStore()?.ownerId) ||
    (targetLanguage !== undefined && targetLanguage !== (current?.fence?.permit.targetLanguage ?? controlledPolicy.targetLanguage))) {
    throw new AppError(403, 'CONTROLLED_SCOPE_DENIED', 'Controlled development scope does not authorize this operation.');
  }
}
export async function withControlledSource<T>(ownerId: string, work: () => Promise<T>, projectId?: string) {
  if (process.env.NODE_ENV !== 'development' || process.env.CONTROLLED_PROVIDER_MODE !== 'DENY' || !/^[a-f\d]{24}$/i.test(ownerId)) throw new Error('CONTROLLED_READINESS_ONLY');
  if (projectId !== undefined && !/^[a-f\d]{24}$/i.test(projectId)) throw new Error('CONTROLLED_READINESS_ONLY');
  const context = { ownerId, projectId, active: true };
  try { return await scope.run(context, work); } finally { context.active = false; }
}
export function assertControlledSource(projectId: string, source: SourceSnapshot) {
  assertControlledRequest(projectId);
  const permit = scope.getStore()?.fence?.permit;
  if (Buffer.byteLength(JSON.stringify(source)) > controlledPolicy.sourceBytes || source.segments.length > controlledPolicy.maxSegments) throw new AppError(413, 'TRANSLATION_DRAFT_TOO_LARGE', 'Dữ liệu lời thoại vượt giới hạn xử lý. Vui lòng sử dụng video ngắn hơn hoặc giảm lượng lời thoại rồi thử lại.');
  if (source.languageCode !== controlledPolicy.sourceLanguage || (permit && (source.transcriptRevision !== permit.revision || revision(source) !== permit.sourceDigest))) {
    throw new AppError(409, 'SOURCE_REVISION_MISMATCH', 'Approved source binding no longer matches.');
  }
}
