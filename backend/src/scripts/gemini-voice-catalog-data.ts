export const GEMINI_VOICE_CATALOG = Object.freeze([
  Object.freeze({ provider: 'gemini', providerVoiceId: 'Kore', name: 'Kore', gender: 'FEMALE', description: 'Gemini Kore — Firm', isActive: true }),
  Object.freeze({ provider: 'gemini', providerVoiceId: 'Fenrir', name: 'Fenrir', gender: 'MALE', description: 'Gemini Fenrir — Excitable', isActive: true }),
] as const);

export class GeminiCatalogError extends Error {}
export function catalogMode(args: string[]): 'dry-run' | 'apply' {
  if (!args.length || (args.length === 1 && args[0] === '--dry-run')) return 'dry-run';
  if (args.length === 1 && args[0] === '--apply') return 'apply';
  throw new GeminiCatalogError('INVALID_ARGUMENTS');
}
export function verifyGeminiTarget(uri: string | undefined, environment: string | undefined, provider: string | undefined) {
  let url: URL;
  try { url = new URL(uri ?? ''); } catch { throw new GeminiCatalogError('INVALID_DATABASE_TARGET'); }
  if (environment !== 'development' || provider !== 'gemini' || url.protocol !== 'mongodb+srv:' || !url.hostname.endsWith('.mongodb.net') || url.pathname !== '/multilingual_ai_narration') {
    throw new GeminiCatalogError('INVALID_DATABASE_TARGET');
  }
}
export function hasVoiceUniqueIndex(indexes: readonly { unique?: boolean; key: Record<string, unknown>; partialFilterExpression?: unknown; sparse?: boolean; collation?: unknown }[]) {
  return indexes.some(i => i.unique === true && !i.partialFilterExpression && !i.sparse && !i.collation &&
    JSON.stringify(Object.entries(i.key)) === JSON.stringify([['provider', 1], ['providerVoiceId', 1], ['languageId', 1]]));
}
export type ExistingVoice = { languageId: unknown; provider: string; providerVoiceId: string; name: string; gender: string; isActive: boolean };
export function planGeminiVoices(rows: readonly ExistingVoice[], languageId: string) {
  const planned: (typeof GEMINI_VOICE_CATALOG[number])[] = [];
  let existing = 0;
  const conflicts: string[] = [];
  for (const voice of GEMINI_VOICE_CATALOG) {
    const matches = rows.filter(r => String(r.languageId) === languageId && r.provider.trim().toLowerCase() === 'gemini' && r.providerVoiceId.trim().toLowerCase() === voice.providerVoiceId.toLowerCase());
    if (!matches.length) planned.push(voice);
    else if (matches.length === 1 && matches[0]!.provider === voice.provider && matches[0]!.providerVoiceId === voice.providerVoiceId && matches[0]!.name === voice.name && matches[0]!.gender === voice.gender && matches[0]!.isActive === true) existing++;
    else conflicts.push(voice.providerVoiceId);
  }
  return { planned, existing, conflicts };
}
export function voiceInsertOperation(voice: typeof GEMINI_VOICE_CATALOG[number], languageId: unknown, now: Date) {
  return { filter: { provider: voice.provider, providerVoiceId: voice.providerVoiceId, languageId }, update: { $setOnInsert: { ...voice, languageId, createdAt: now, updatedAt: now } } };
}
