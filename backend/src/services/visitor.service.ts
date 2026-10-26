import { Visitor, type VisitorDocument } from '../models/Visitor.js';
import { parseUserAgent } from '../utils/user-agent.js';

export function getVisitorCode(ip: string | null | undefined, ua: string | null | undefined): string {
  const raw = `${ip || '0.0.0.0'}_${ua || ''}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(0, 4);
  return `Khách #${hex}`;
}

export interface RegisterVisitOptions {
  ipAddress?: string | null;
  userAgent?: string | null;
  type: 'scan' | 'listen';
  languageCode?: string | null;
}

export async function findOrCreateVisitor(options: RegisterVisitOptions): Promise<VisitorDocument> {
  const ip = options.ipAddress?.trim() || null;
  const ua = options.userAgent?.trim() || null;
  const visitorCode = getVisitorCode(ip, ua);
  const parsed = parseUserAgent(ua);
  const now = new Date();

  const isScan = options.type === 'scan';
  const isListen = options.type === 'listen';
  const lang = options.languageCode?.trim()?.toLowerCase();

  const update: Record<string, unknown> = {
    $set: {
      lastVisitAt: now,
      deviceType: parsed.deviceType,
      os: parsed.os,
      browser: parsed.browser,
    },
    $inc: {
      totalScans: isScan ? 1 : 0,
      totalListens: isListen ? 1 : 0,
    },
    $setOnInsert: {
      visitorCode,
      ipAddress: ip,
      userAgent: ua,
      firstVisitAt: now,
    },
  };

  if (lang) {
    update.$addToSet = { languages: lang };
  }

  const visitor = await Visitor.findOneAndUpdate(
    { visitorCode },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return visitor as VisitorDocument;
}
