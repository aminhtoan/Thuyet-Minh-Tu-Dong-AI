import type { Request, RequestHandler } from 'express';
import { AppError } from '../../utils/app-error.js';
import type { GroupAdmission } from './group-admission.js';

// Lab response ceiling, independent of unchanged provider/draft caps. Never used
// by the default application controller; no production profile is activated.
export const GROUP_RESPONSE_BYTES = 256 * 1024;
export function boundedGroupJson(value: unknown, limit = GROUP_RESPONSE_BYTES): string {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > GROUP_RESPONSE_BYTES) throw new Error('GROUP_RESPONSE_LIMIT_INVALID');
  const parts: string[] = []; let bytes = 0, nodes = 0;
  const seen = new Set<object>();
  const overflow = () => new AppError(413, 'TRANSLATION_RESPONSE_TOO_LARGE', 'Dữ liệu phản hồi vượt giới hạn thử nghiệm.');
  const append = (part: string) => { bytes += Buffer.byteLength(part); if (bytes > limit) throw overflow(); parts.push(part); };
  const string = (text: string) => { if (text.length > limit) throw overflow(); append(JSON.stringify(text)); };
  const visit = (item: unknown, depth = 0): void => {
    if (++nodes > 100000 || depth > 32) throw overflow();
    if (item === null || item === undefined) { append('null'); return; }
    if (typeof item === 'string') { string(item); return; }
    if (typeof item === 'boolean' || typeof item === 'number') { append(JSON.stringify(item)); return; }
    if (item instanceof Date) { string(item.toISOString()); return; }
    if (typeof item !== 'object' || seen.has(item)) throw overflow();
    seen.add(item);
    if (Array.isArray(item)) {
      append('['); for (let i = 0; i < item.length; i++) { if (i) append(','); visit(item[i], depth + 1); } append(']');
    } else {
      if (Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw overflow();
      append('{'); let first = true;
      for (const key of Object.keys(item)) {
        const child = (item as Record<string, unknown>)[key]; if (child === undefined) continue;
        if (!first) append(','); first = false; string(key); append(':'); visit(child, depth + 1);
      }
      append('}');
    }
    seen.delete(item);
  };
  visit(value); return parts.join('');
}

export function groupResponseHandler(admission: GroupAdmission, work: (req: Request) => Promise<unknown>): RequestHandler {
  return async (req, res, next) => {
    try {
      await admission.responseScope(req.user?.id ?? '', async () => {
        let terminal = res.destroyed || res.writableFinished;
        let done!: () => void;
        const ended = new Promise<void>(resolve => { done = resolve; });
        const finish = () => { if (terminal) return; terminal = true; res.off('finish', finish); res.off('close', finish); res.off('error', finish); done(); };
        if (terminal) done(); else { res.once('finish', finish); res.once('close', finish); res.once('error', finish); }
        // A stalled socket is closed, but its operation lease is NOT released
        // until underlying Mongo/provider work also settles.
        const timer = setTimeout(() => res.destroy(), 120000); timer.unref();
        try {
          try {
            const value = await work(req);
            if (!terminal) res.type('json').send(boundedGroupJson(value));
          } catch (error) { if (!terminal) next(error); }
          await ended;
        } finally { clearTimeout(timer); }
      });
    } catch (error) { next(error); }
  };
}
