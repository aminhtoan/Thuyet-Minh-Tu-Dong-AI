import { prepareExecutionBinding } from './execution-binding.js';
import type { GroupAdmission } from '../services/translation/group-admission.js';
import type { OneUsePermitFence } from '../services/translation/one-use-permit.js';
import { assertDispatchScope } from '../services/translation/controlled-development.js';
import { AppError } from '../utils/app-error.js';

// Called again at each permitted SDK stage, not merely on startup/HTTP entry.
export async function verifyExecutionSource(fence: OneUsePermitFence, admission: GroupAdmission) {
  assertDispatchScope(fence);
  const p = fence.permit;
  const binding = await prepareExecutionBinding(p.projectId, p.ownerId, p.deploymentId ?? '', admission);
  if (binding.revision !== p.revision || binding.sourceDigest !== p.sourceDigest || binding.inputDigest !== p.inputDigest || binding.planDigest !== p.planDigest || binding.model !== p.model) throw new AppError(409, 'SOURCE_REVISION_MISMATCH', 'Approved binding no longer matches.');
  return { revision: binding.revision, digest: binding.sourceDigest, segmentCount: binding.segmentCount, groupCount: binding.groupCount, coverage: binding.coverage };
}
