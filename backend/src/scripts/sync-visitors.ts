import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { VisitQR } from '../models/VisitQR.js';
import { ListenEvent } from '../models/ListenEvent.js';
import { Visitor } from '../models/Visitor.js';
import { getVisitorCode } from '../services/visitor.service.js';
import { parseUserAgent } from '../utils/user-agent.js';

async function main() {
  try {
    await connectDatabase(env.mongoUri);
    console.log('Connected to DB. Starting Visitor sync...');

    const [allScans, allListens] = await Promise.all([
      VisitQR.find({}).sort({ createdAt: 1 }),
      ListenEvent.find({}).sort({ createdAt: 1 }),
    ]);

    console.log(`Processing ${allScans.length} scans and ${allListens.length} listen events...`);

    // Map by visitorCode
    const visitorMap = new Map<string, {
      visitorCode: string;
      ipAddress: string | null;
      userAgent: string | null;
      deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
      os: string | null;
      browser: string | null;
      totalScans: number;
      totalListens: number;
      languages: Set<string>;
      firstVisitAt: Date;
      lastVisitAt: Date;
    }>();

    for (const scan of allScans) {
      const code = getVisitorCode(scan.ipAddress, scan.userAgent);
      const parsed = parseUserAgent(scan.userAgent);
      const createdAt = scan.createdAt ? new Date(scan.createdAt) : new Date();

      if (!visitorMap.has(code)) {
        visitorMap.set(code, {
          visitorCode: code,
          ipAddress: scan.ipAddress || null,
          userAgent: scan.userAgent || null,
          deviceType: parsed.deviceType,
          os: parsed.os,
          browser: parsed.browser,
          totalScans: 1,
          totalListens: 0,
          languages: new Set(),
          firstVisitAt: createdAt,
          lastVisitAt: createdAt,
        });
      } else {
        const v = visitorMap.get(code)!;
        v.totalScans += 1;
        if (createdAt < v.firstVisitAt) v.firstVisitAt = createdAt;
        if (createdAt > v.lastVisitAt) v.lastVisitAt = createdAt;
        if (scan.ipAddress && !v.ipAddress) v.ipAddress = scan.ipAddress;
        if (scan.userAgent && !v.userAgent) v.userAgent = scan.userAgent;
      }
    }

    for (const listen of allListens) {
      const code = getVisitorCode(listen.ipAddress, listen.userAgent);
      const parsed = parseUserAgent(listen.userAgent);
      const createdAt = listen.createdAt ? new Date(listen.createdAt) : new Date();

      if (!visitorMap.has(code)) {
        visitorMap.set(code, {
          visitorCode: code,
          ipAddress: listen.ipAddress || null,
          userAgent: listen.userAgent || null,
          deviceType: parsed.deviceType,
          os: parsed.os,
          browser: parsed.browser,
          totalScans: 0,
          totalListens: 1,
          languages: new Set(listen.languageCode ? [listen.languageCode.toLowerCase()] : []),
          firstVisitAt: createdAt,
          lastVisitAt: createdAt,
        });
      } else {
        const v = visitorMap.get(code)!;
        v.totalListens += 1;
        if (listen.languageCode) v.languages.add(listen.languageCode.toLowerCase());
        if (createdAt < v.firstVisitAt) v.firstVisitAt = createdAt;
        if (createdAt > v.lastVisitAt) v.lastVisitAt = createdAt;
        if (listen.ipAddress && !v.ipAddress) v.ipAddress = listen.ipAddress;
        if (listen.userAgent && !v.userAgent) v.userAgent = listen.userAgent;
      }
    }

    console.log(`Upserting ${visitorMap.size} distinct visitors into 'visitors' collection...`);

    const visitorDbMap = new Map<string, string>(); // code -> _id

    for (const v of visitorMap.values()) {
      const doc = await Visitor.findOneAndUpdate(
        { visitorCode: v.visitorCode },
        {
          $set: {
            ipAddress: v.ipAddress,
            userAgent: v.userAgent,
            deviceType: v.deviceType,
            os: v.os,
            browser: v.browser,
            totalScans: v.totalScans,
            totalListens: v.totalListens,
            languages: Array.from(v.languages),
            firstVisitAt: v.firstVisitAt,
            lastVisitAt: v.lastVisitAt,
          },
          $setOnInsert: {
            visitorCode: v.visitorCode,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      visitorDbMap.set(v.visitorCode, doc._id.toString());
      console.log(`Visitor: ${doc.visitorCode} | IP: ${doc.ipAddress || '—'} | Scans: ${doc.totalScans} | Listens: ${doc.totalListens}`);
    }

    // Link VisitQR records
    let updatedScans = 0;
    for (const scan of allScans) {
      const code = getVisitorCode(scan.ipAddress, scan.userAgent);
      const visitorId = visitorDbMap.get(code);
      if (visitorId) {
        await VisitQR.updateOne({ _id: scan._id }, { $set: { visitorId } });
        updatedScans++;
      }
    }

    // Link ListenEvent records
    let updatedListens = 0;
    for (const listen of allListens) {
      const code = getVisitorCode(listen.ipAddress, listen.userAgent);
      const visitorId = visitorDbMap.get(code);
      if (visitorId) {
        await ListenEvent.updateOne({ _id: listen._id }, { $set: { visitorId } });
        updatedListens++;
      }
    }

    console.log(`\nSync finished successfully:`);
    console.log(`- Created/Updated: ${visitorMap.size} Visitor records in collection 'visitors'`);
    console.log(`- Linked ${updatedScans} VisitQR records to their Visitor`);
    console.log(`- Linked ${updatedListens} ListenEvent records to their Visitor`);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

void main();
