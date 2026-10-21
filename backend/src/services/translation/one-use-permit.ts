import { open, realpath, lstat, readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { z } from 'zod';
import { controlledTarget } from './controlled-target.js';
import type { GroupProviderInput, GroupTransport } from './gemini-group-translation.provider.js';
import { digest } from './group-plan.js';

const permitSchema = z.object({
  id: z.string().uuid(), approval: z.literal('EXPLICIT_USER_APPROVAL'),
  ownerId: z.string().regex(/^[a-f\d]{24}$/), projectId: z.literal(controlledTarget.projectId),
  revision: z.literal(1), sourceDigest: z.literal(controlledTarget.sourceDigest),
  sourceLanguage: z.literal('vi'), targetLanguage: z.literal('en'),
  model: z.literal(controlledTarget.model), apiVersion: z.literal('v1beta'),
  inputDigest: z.string().regex(/^[a-f\d]{64}$/), planDigest: z.string().regex(/^[a-f\d]{64}$/),
  thinking: z.enum(['DEFAULT', 'LOW']), lowExplicitlyApproved: z.boolean(),
  maxOutputTokens: z.literal(8192), timeoutMs: z.literal(120000), responseBytes: z.literal(131072),
  metadataRequests: z.literal(1), generationRequests: z.literal(1), retries: z.literal(0),
  tokenChargeEnvelopeUsd: z.literal(0.82), pricingVerifiedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  issuedAt: z.number().int().nonnegative(), expiresAt: z.number().int().positive(),
  deploymentId: z.string().regex(/^[a-f\d]{64}$/).optional(),
}).strict();
export type OneUsePermit = z.infer<typeof permitSchema>;
const opened = new WeakSet<OneUsePermitFence>();

// Local durable, single-host fence, NOT a cryptographic authorization service or
// billing cap. Operator must protect this directory and never restore/reset it.
// Claim is fsynced BEFORE dispatch; crashes/timeouts permanently spend the stage.
export class OneUsePermitFence {
  private constructor(private readonly directory: string, readonly permit: Readonly<OneUsePermit>, private readonly now: () => number) {}
  static async open(directory: string, grant: unknown, now = Date.now) {
    const permit = permitSchema.parse(grant);
    if (!isAbsolute(directory) || !['development', 'test'].includes(process.env.NODE_ENV ?? '') || (permit.thinking === 'LOW' && !permit.lowExplicitlyApproved) || permit.expiresAt <= now() || permit.issuedAt > now() || permit.expiresAt - permit.issuedAt > 3600000) throw new Error('PROVIDER_PERMIT_INVALID');
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(directory) !== directory) throw new Error('PROVIDER_PERMIT_DIRECTORY_INVALID');
    const fence = new OneUsePermitFence(directory, Object.freeze({ ...permit }), now);
    try { await fence.marker('binding', digest(permit)); }
    catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error;
      const path = join(directory, `${permit.id}.binding`), stat = await lstat(path);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== 64 || await readFile(path, 'utf8') !== digest(permit)) throw new Error('PROVIDER_PERMIT_BINDING_MISMATCH');
    }
    opened.add(fence);
    return fence;
  }
  assertUsable(ownerId = this.permit.ownerId) {
    if (!opened.has(this) || ownerId !== this.permit.ownerId || this.now() >= this.permit.expiresAt) throw new Error('PROVIDER_PERMIT_INVALID');
  }
  assertInput(model: string, input: GroupProviderInput) {
    this.assertUsable();
    if (model !== this.permit.model || digest(input) !== this.permit.inputDigest || digest(input.groups.map(g => g.groupId)) !== this.permit.planDigest || input.sourceLanguage !== 'vi' || input.targetLanguage !== 'en') throw new Error('PROVIDER_PERMIT_BINDING_MISMATCH');
  }
  private async marker(stage: string, content: string) {
    if (this.now() >= this.permit.expiresAt) throw new Error('PROVIDER_PERMIT_EXPIRED');
    const file = await open(join(this.directory, `${this.permit.id}.${stage}`), 'wx', 0o600);
    try { await file.writeFile(content); await file.sync(); } finally { await file.close(); }
    // Linux deployment requires durable directory entries as well as file data.
    // On unsupported filesystems this fails CLOSED before a provider call.
    const directory = await open(this.directory, 'r');
    try { await directory.sync(); } finally { await directory.close(); }
  }
  async metadata(model: string, verifySource: () => Promise<void>, call: () => Promise<{ supportedActions?: string[] }>) {
    this.assertUsable();
    if (model !== this.permit.model) throw new Error('PROVIDER_PERMIT_BINDING_MISMATCH');
    await verifySource();
    await this.marker('metadata-spent', 'SPENT_OR_UNCERTAIN');
    const result = await call();
    if (!result.supportedActions?.includes('generateContent')) throw new Error('PROVIDER_MODEL_UNAVAILABLE');
    await this.marker('metadata-verified', 'VERIFIED');
    return result;
  }
  async generation(model: string, input: GroupProviderInput, verifySource: () => Promise<void>, call: () => ReturnType<GroupTransport['generate']>) {
    this.assertInput(model, input);
    const verifiedPath = join(this.directory, `${this.permit.id}.metadata-verified`);
    const verified = await lstat(verifiedPath);
    if (!verified.isFile() || verified.isSymbolicLink() || verified.size !== 8 || await readFile(verifiedPath, 'utf8') !== 'VERIFIED') throw new Error('PROVIDER_METADATA_NOT_VERIFIED');
    await verifySource();
    await this.marker('generation-spent', 'SPENT_OR_UNCERTAIN');
    return call(); // No retry, refund, deletion or reset path.
  }
}
