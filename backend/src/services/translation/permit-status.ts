import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { digest } from './group-plan.js';
import type { OneUsePermit } from './one-use-permit.js';

// Observation only: never opens/creates a fence, claims an allowance, or repairs
// missing state. Any partial/ambiguous claim must prevent another attempt.
export async function readPermitStatus(directory: string, permit: Readonly<OneUsePermit>, now = Date.now()) {
  const marker = async (stage: string, expected: string, required = false) => {
    const path = join(directory, `${permit.id}.${stage}`);
    try {
      const stat = await lstat(path);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== Buffer.byteLength(expected) || await readFile(path, 'utf8') !== expected) throw new Error('INVALID_MARKER');
      return true;
    } catch (error) {
      if (!required && error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return false;
      throw error;
    }
  };
  try {
    await marker('binding', digest(permit), true);
    const metadata = await marker('metadata-spent', 'SPENT_OR_UNCERTAIN');
    const generation = await marker('generation-spent', 'SPENT_OR_UNCERTAIN');
    const verified = await marker('metadata-verified', 'VERIFIED');
    if (metadata || generation) return 'REQUEST_CONSUMED' as const;
    if (verified || now < permit.issuedAt || now >= permit.expiresAt) return 'BLOCKED' as const;
    return 'UNUSED' as const;
  } catch { return 'BLOCKED' as const; }
}
