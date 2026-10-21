import type { OneUsePermitFence } from '../services/translation/one-use-permit.js';
import type { GroupAdmission } from '../services/translation/group-admission.js';
import { withPermittedSource } from '../services/translation/controlled-development.js';
import { controlledPolicy } from '../services/translation/controlled-target.js';
import { verifyExecutionSource } from './execution-source.js';

// Minimal read-only contract foundation, NOT authorization to generate. Web
// dispatch integration remains disabled until a separate implementation gate.
export async function readExecutionStatus(fence: OneUsePermitFence, admission: GroupAdmission, verify = verifyExecutionSource) {
  const blocked = { state: 'BLOCKED' as const, generationEnabled: false as const, reasonCode: 'CONTROLLED_READINESS_BLOCKED' };
  try {
    const p = fence.permit;
    const scope = { projectId: p.projectId, transcriptRevision: p.revision, sourceDigest: p.sourceDigest, sourceLanguage: p.sourceLanguage, targetLanguage: p.targetLanguage, model: p.model, thinking: p.thinking };
    const permitState = await fence.readStatus();
    if (permitState === 'REQUEST_CONSUMED') return { state: 'REQUEST_CONSUMED' as const, generationEnabled: false as const, reasonCode: 'CONTROLLED_REQUEST_CONSUMED', scope };
    if (permitState !== 'UNUSED' || p.thinking !== 'MEDIUM' || p.model !== controlledPolicy.model || p.sourceLanguage !== 'vi' || p.targetLanguage !== 'en') return blocked;
    const source = await withPermittedSource(fence, p.ownerId, () => admission.operation(p.ownerId, () => verify(fence, admission)));
    if (source.revision !== p.revision || source.digest !== p.sourceDigest || source.segmentCount <= 0 || source.coverage !== source.segmentCount || source.groupCount <= 0) return blocked;
    // A concurrent dispatcher may have claimed an allowance during verification.
    const after = await fence.readStatus();
    if (after === 'REQUEST_CONSUMED') return { state: 'REQUEST_CONSUMED' as const, generationEnabled: false as const, reasonCode: 'CONTROLLED_REQUEST_CONSUMED', scope };
    if (after !== 'UNUSED') return blocked;
    return { state: 'READY' as const, generationEnabled: false as const, reasonCode: 'WEB_DISPATCH_NOT_ENABLED',
      scope: { projectId: p.projectId, transcriptRevision: p.revision, sourceDigest: p.sourceDigest, sourceLanguage: p.sourceLanguage, targetLanguage: p.targetLanguage, model: p.model, thinking: p.thinking },
      source: { segmentCount: source.segmentCount, groupCount: source.groupCount, coverage: source.coverage } };
  } catch { return blocked; } // Never return raw DB/credential/permit error details.
}
