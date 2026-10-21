import { randomUUID } from 'node:crypto';
import { digest } from '../../src/services/translation/group-plan.js';
import { controlledTarget } from '../../src/services/translation/controlled-target.js';
export const owner = '0123456789abcdef01234567';
export const input = { fullText: 'Synthetic test only.', sourceLanguage: 'vi', targetLanguage: 'en', groups: [{ groupId: 'a'.repeat(64), sourceText: 'Synthetic test only.' }] };
export const grant = () => ({ id: randomUUID(), approval: 'EXPLICIT_USER_APPROVAL', ownerId: owner, projectId: controlledTarget.projectId, revision: 1, sourceDigest: controlledTarget.sourceDigest,
  sourceLanguage: 'vi', targetLanguage: 'en', model: controlledTarget.model, apiVersion: 'v1beta', inputDigest: digest(input), planDigest: digest(input.groups.map(g => g.groupId)),
  thinking: 'DEFAULT', lowExplicitlyApproved: false, maxOutputTokens: 8192, timeoutMs: 120000, responseBytes: 131072, metadataRequests: 1, generationRequests: 1, retries: 0,
  tokenChargeEnvelopeUsd: 0.82, pricingVerifiedOn: '2026-10-21', issuedAt: Date.now() - 1000, expiresAt: Date.now() + 900000 });
export const sdkJson = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
export const metadata = () => sdkJson({ name: `models/${controlledTarget.model}`, supportedGenerationMethods: ['generateContent'] });
export const output = () => sdkJson({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify({ outcome: 'translated', groups: [{ groupId: input.groups[0]!.groupId, translatedText: 'Synthetic mock output.' }] }) }] } }], usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10, thoughtsTokenCount: 5, totalTokenCount: 35 } });
