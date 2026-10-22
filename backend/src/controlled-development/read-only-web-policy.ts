import { z } from 'zod';

export const readOnlyWebConfig = z.object({
  mongoUri: z.string().min(1), databaseName: z.literal('multilingual_ai_narration'),
  expectedSrvHost: z.string().regex(/^[a-z0-9.-]+\.mongodb\.net$/i), expectedReplicaSet: z.string().min(1).max(100),
  jwtAccessSecret: z.string().min(32),
  corsOrigins: z.array(z.enum(['http://localhost:5173', 'http://127.0.0.1:5173'])).min(1).max(2),
}).strict(); // Full execution credential files (Gemini/refresh/permit) are deliberately rejected.

// Server-proven effective privileges, not a name/role-name heuristic. Unknown,
// cross-database, cluster or write privileges fail closed before app imports.
export function assertReadOnlyPrivileges(status: unknown, databaseName: string) {
  const info = (status as { authInfo?: { authenticatedUsers?: unknown[]; authenticatedUserPrivileges?: Array<{ resource?: { db?: string; collection?: string }; actions?: string[] }> } })?.authInfo;
  const privileges = info?.authenticatedUserPrivileges;
  const reads = new Set(['find', 'changeStream', 'collStats', 'dbHash', 'dbStats', 'killCursors', 'listCollections', 'listIndexes', 'planCacheRead', 'listSearchIndexes']);
  if (!Array.isArray(info?.authenticatedUsers) || info.authenticatedUsers.length !== 1 || !Array.isArray(privileges) || !privileges.length) throw new Error('READINESS_DB_PRIVILEGES_UNVERIFIED');
  for (const privilege of privileges) {
    if (privilege.resource?.db !== databaseName || typeof privilege.resource.collection !== 'string' || Object.keys(privilege.resource).some(key => !['db', 'collection'].includes(key)) ||
      !Array.isArray(privilege.actions) || !privilege.actions.length || privilege.actions.some(action => !reads.has(action))) throw new Error('READINESS_DB_NOT_READ_ONLY');
  }
  for (const collection of ['users', 'projects']) {
    if (!privileges.some(p => ['', collection].includes(p.resource!.collection!) && p.actions!.includes('find'))) throw new Error('READINESS_DB_READ_ACCESS_MISSING');
  }
}
