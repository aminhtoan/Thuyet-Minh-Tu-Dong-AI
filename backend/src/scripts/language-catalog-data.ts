import { z } from 'zod';

export const languageCatalogSchema = z.object({
  code: z.string().trim().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/).max(10),
  name: z.string().trim().min(1).max(100),
  nativeName: z.string().trim().min(1).max(100),
  isActive: z.boolean(),
}).strict();
export type CatalogRecord = z.infer<typeof languageCatalogSchema>;
export const LANGUAGE_CATALOG: readonly CatalogRecord[] = Object.freeze([
  // Core languages
  { code: 'vi', name: 'Ti\u1ebfng Vi\u1ec7t', nativeName: 'Ti\u1ebfng Vi\u1ec7t', isActive: true },
  { code: 'en', name: 'Ti\u1ebfng Anh', nativeName: 'English', isActive: true },
  { code: 'ja', name: 'Ti\u1ebfng Nh\u1eadt', nativeName: '\u65e5\u672c\u8a9e', isActive: true },
  { code: 'ko', name: 'Ti\u1ebfng H\u00e0n', nativeName: '\ud55c\uad6d\uc5b4', isActive: true },
  { code: 'zh', name: 'Ti\u1ebfng Trung (gi\u1ea3n th\u1ec3)', nativeName: '\u4e2d\u6587\uff08\u7b80\u4f53\uff09', isActive: true },
  // European
  { code: 'fr', name: 'Ti\u1ebfng Ph\u00e1p', nativeName: 'Fran\u00e7ais', isActive: true },
  { code: 'de', name: 'Ti\u1ebfng \u0110\u1ee9c', nativeName: 'Deutsch', isActive: true },
  { code: 'es', name: 'Ti\u1ebfng T\u00e2y Ban Nha', nativeName: 'Espa\u00f1ol', isActive: true },
  { code: 'it', name: 'Ti\u1ebfng \u00dd', nativeName: 'Italiano', isActive: true },
  { code: 'pt', name: 'Ti\u1ebfng B\u1ed3 \u0110\u00e0o Nha', nativeName: 'Portugu\u00eas', isActive: true },
  { code: 'ru', name: 'Ti\u1ebfng Nga', nativeName: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', isActive: true },
  { code: 'nl', name: 'Ti\u1ebfng H\u00e0 Lan', nativeName: 'Nederlands', isActive: true },
  { code: 'pl', name: 'Ti\u1ebfng Ba Lan', nativeName: 'Polski', isActive: true },
  // South/Southeast Asia
  { code: 'th', name: 'Ti\u1ebfng Th\u00e1i', nativeName: '\u0e44\u0e17\u0e22', isActive: true },
  { code: 'id', name: 'Ti\u1ebfng Indonesia', nativeName: 'Bahasa Indonesia', isActive: true },
  { code: 'ms', name: 'Ti\u1ebfng Mã Lai', nativeName: 'Bahasa Melayu', isActive: true },
  { code: 'hi', name: 'Ti\u1ebfng Hindi', nativeName: '\u0939\u093f\u0928\u094d\u0926\u0940', isActive: true },
  // Middle East
  { code: 'ar', name: 'Ti\u1ebfng \u1ea2 R\u1eadp', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', isActive: true },
  { code: 'tr', name: 'Ti\u1ebfng Th\u1ed5 Nh\u0129 K\u1ef3', nativeName: 'T\u00fcrk\u00e7e', isActive: true },
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

