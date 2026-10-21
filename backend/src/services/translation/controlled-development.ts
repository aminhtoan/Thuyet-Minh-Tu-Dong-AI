import { AsyncLocalStorage } from 'node:async_hooks';
import { revision, type SourceSnapshot } from './group-plan.js';
import { AppError } from '../../utils/app-error.js';

// This capability is deliberately absent from the normal server composition.
// DENY means readiness only: no provider or database mutation is authorized.
export const controlledTarget = Object.freeze({
  projectId: '6ad5c93a86cf95b7523704a5', transcriptRevision: 1,
  sourceDigest: '81638f2cb62e5f5f010853b047855cb72ace5ddbb2ca083890b51cdd2fe44906',
  sourceLanguage: 'vi', targetLanguage: 'en', model: 'gemini-3.8-flash',
});
const scope = new AsyncLocalStorage<{ ownerId: string; active: boolean }>();
export function controlledScopeActive() {
  return process.env.NODE_ENV === 'development' && process.env.CONTROLLED_PROVIDER_MODE === 'DENY' && scope.getStore()?.active === true;
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
