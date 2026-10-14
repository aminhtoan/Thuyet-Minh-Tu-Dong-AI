import { z } from 'zod';

export const languageCatalogSchema = z.object({
  code: z.enum(['vi', 'en', 'ja', 'ko', 'zh', 'fr']),
  name: z.string().trim().min(1).max(100),
  nativeName: z.string().trim().min(1).max(100),
  isActive: z.boolean(),
}).strict();
export type CatalogRecord = z.infer<typeof languageCatalogSchema>;
export const LANGUAGE_CATALOG: readonly CatalogRecord[] = Object.freeze([
  { code: 'vi', name: 'Tiếng Việt', nativeName: 'Tiếng Việt', isActive: true },
  { code: 'en', name: 'Tiếng Anh', nativeName: 'English', isActive: true },
  { code: 'ja', name: 'Tiếng Nhật', nativeName: '日本語', isActive: true },
  { code: 'ko', name: 'Tiếng Hàn', nativeName: '한국어', isActive: true },
  { code: 'zh', name: 'Tiếng Trung', nativeName: '中文', isActive: true },
  { code: 'fr', name: 'Tiếng Pháp', nativeName: 'Français', isActive: true },
].map(record => Object.freeze(languageCatalogSchema.parse(record))));

export class LanguageCatalogError extends Error {
  constructor(code: string) { super(code); }
}
export type SeedOptions = { write: boolean; offline: boolean; database?: string; environment?: string; approved: boolean };
export function parseCatalogOptions(args: readonly string[]): SeedOptions {
  const options: SeedOptions = { write: false, offline: false, approved: false };
  const seen = new Set<string>();
  for (const arg of args) {
    const [flag, ...parts] = arg.split('='); const value = parts.join('=');
    if (!flag || seen.has(flag)) throw new LanguageCatalogError('INVALID_OPTIONS');
    seen.add(flag);
    if (arg === '--write') options.write = true;
    else if (arg === '--dry-run') options.write = false;
    else if (arg === '--offline') options.offline = true;
    else if (flag === '--confirm-db' && /^[A-Za-z0-9_-]{1,63}$/.test(value)) options.database = value;
    else if (flag === '--confirm-env' && ['development', 'test'].includes(value)) options.environment = value;
    else if (arg === '--approve-write=LANGUAGE_CATALOG') options.approved = true;
    else throw new LanguageCatalogError('INVALID_OPTIONS');
  }
  if ((seen.has('--write') && seen.has('--dry-run')) || (options.offline && options.write)) throw new LanguageCatalogError('INVALID_OPTIONS');
  return options;
}
export function verifyCatalogTarget(options: SeedOptions, environment: string | undefined, uri: string | undefined, actualDatabase?: string): void {
  if (!options.environment || !['development', 'test'].includes(environment ?? '') || options.environment !== environment || !options.database) throw new LanguageCatalogError('DATABASE_ENVIRONMENT_NOT_CONFIRMED');
  if (options.write && !options.approved) throw new LanguageCatalogError('WRITE_NOT_APPROVED');
  let database: string;
  try {
    if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) throw new Error();
    database = decodeURIComponent(new URL(uri).pathname.slice(1));
  } catch { throw new LanguageCatalogError('INVALID_DATABASE_CONFIGURATION'); }
  if (database !== options.database || (actualDatabase !== undefined && actualDatabase !== options.database)) throw new LanguageCatalogError('DATABASE_TARGET_MISMATCH');
}
export function planLanguageCatalog(existing: readonly { code: string; isActive?: boolean }[]) {
  const existingCodes = existing.map(record => record.code.trim().toLowerCase());
  const codes = new Set(existingCodes);
  if (codes.size !== existingCodes.length) throw new LanguageCatalogError('EXISTING_DUPLICATE_CODES');
  return {
    create: LANGUAGE_CATALOG.filter(record => !codes.has(record.code)),
    keep: LANGUAGE_CATALOG.filter(record => codes.has(record.code)).map(record => record.code),
    inactive: existing.filter(record => record.isActive === false && LANGUAGE_CATALOG.some(proposed => proposed.code === record.code.trim().toLowerCase())).map(record => record.code),
  };
}
export interface CatalogStore {
  read(): Promise<Array<{ code: string; isActive?: boolean }>>;
  hasUniqueCodeIndex(): Promise<boolean>;
  insertMissing(record: CatalogRecord): Promise<boolean>;
}
export async function prepareLanguageCatalog(store: CatalogStore, write = false) {
  const plan = planLanguageCatalog(await store.read());
  let created = 0;
  if (write) {
    if (!await store.hasUniqueCodeIndex()) throw new LanguageCatalogError('UNIQUE_CODE_INDEX_REQUIRED');
    for (const record of plan.create) if (await store.insertMissing(languageCatalogSchema.parse(record))) created++;
  }
  return { mode: write ? 'write' : 'dry-run', ...plan, created };
}
