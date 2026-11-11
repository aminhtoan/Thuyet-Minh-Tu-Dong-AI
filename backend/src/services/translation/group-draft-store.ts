import { randomUUID } from 'node:crypto';
import { drainRuntime, detached } from '../../maintenance/runtime.js';
import { scheduleCapability } from '../../maintenance/scheduled.js';
import { AppError } from '../../utils/app-error.js';
import type { TranslationGroup } from './group-plan.js';
import type { GroupAdmission } from './group-admission.js';

export type GroupDraft = { draftId: string; ownerId: string; projectId: string; transcriptId: string; transcriptRevision: number; sourceLanguage: string; targetLanguage: string; sourceRevision: string; groupingVersion: string; groups: TranslationGroup[]; outputDigest: string; expiresAt: string; alignmentFormat: 'GROUPS_V1'; state: 'DRAFT' };
type Entry = { expires: number; signature: string; promise: Promise<GroupDraft>; cancelExpiry?: () => void; release?: () => void };
type ScheduleExpiry = (callback: () => void, delay: number) => () => void;
const scheduleExpiry: ScheduleExpiry = (callback, delay) => {
  return scheduleCapability((run,ms)=>{const timer=setTimeout(run,ms);timer.unref();return ()=>clearTimeout(timer);},callback,delay);
};
// One process only. A failed generation is retained until TTL: same key never retries AI.
export class GroupDraftStore {
  private drafts = new Map<string, GroupDraft>();
  private requests = new Map<string, Entry>();
  private approvals = new Map<string, Promise<unknown>>();
  constructor(private readonly clock = Date.now, private readonly ttl = 15 * 60_000, private readonly capacity = 50, private readonly schedule: ScheduleExpiry = scheduleExpiry, private readonly runtime=drainRuntime) {
    const reference = new WeakRef(this);
    this.runtime.observe(randomUUID(), () => {
      const store = reference.deref();
      return store ? {
        liveDrafts: [...store.drafts.values()].filter(d => Date.parse(d.expiresAt) > store.clock()).length,
        pending: [...store.requests.values()].filter(e => e.expires === Number.POSITIVE_INFINITY).length + store.approvals.size,
      } : {liveDrafts:0,pending:0};
    });
  }
  private prune() {
    for (const [id, draft] of this.drafts) if (Date.parse(draft.expiresAt) <= this.clock()) this.drafts.delete(id);
    for (const [key, entry] of this.requests) if (entry.expires <= this.clock()) { entry.cancelExpiry?.(); entry.release?.(); this.requests.delete(key); }
  }
  async preview(key: string, signature: string, create: () => Promise<Omit<GroupDraft, 'draftId' | 'expiresAt' | 'state' | 'alignmentFormat'>>, admission?: { ownerId: string; controller: GroupAdmission }): Promise<GroupDraft> {
 return this.runtime.track('activeOperations',async()=>{
    this.prune(); const existing = this.requests.get(key);
    if (existing) { if (existing.signature !== signature) throw new AppError(409, 'TRANSLATION_DRAFT_CHANGED', 'Mã yêu cầu đã được dùng cho kế hoạch khác.'); return structuredClone(await existing.promise); }
    if (this.requests.size >= this.capacity) throw new AppError(503, 'TRANSLATION_DRAFT_CAPACITY', 'Bộ nhớ bản nháp đã đầy. Vui lòng thử lại sau.');
    const lease = admission?.controller.acquire(admission.ownerId, true);
    const expires = this.clock() + this.ttl;
    const promise = Promise.resolve().then(create).then(value => {
      if (this.clock() >= expires) throw this.expired();
      const draft: GroupDraft = { ...value, draftId: randomUUID(), expiresAt: new Date(expires).toISOString(), alignmentFormat: 'GROUPS_V1', state: 'DRAFT' };
      if (Buffer.byteLength(JSON.stringify(draft)) > 128 * 1024) throw new AppError(413, 'TRANSLATION_DRAFT_TOO_LARGE', 'Bản nháp vượt giới hạn bộ nhớ.');
      this.drafts.set(draft.draftId, structuredClone(draft)); return draft;
    });
    // Pending entries may not expire while the provider is in flight.
    const entry: Entry = { expires: Number.POSITIVE_INFINITY, signature, promise, release: lease?.release }; this.requests.set(key, entry);
    void detached(() => promise.then(() => lease?.settled(), () => lease?.release()).catch(() => undefined));
    // Start expiry only after underlying work settles, never just on disconnect
    // or elapsed TTL while the transport still owns its buffers/closures.
    const expireWhenSettled = () => {
      entry.expires = expires;
      if (this.requests.get(key) !== entry) return;
      entry.cancelExpiry = this.schedule(() => {
        if (this.requests.get(key) !== entry) return;
        this.prune();
        // Timers can fire slightly before the injected wall clock reaches TTL.
        if (this.requests.get(key) === entry) expireWhenSettled();
      }, Math.max(1, expires - this.clock()));
    };
    void detached(() => promise.finally(expireWhenSettled).catch(() => undefined));
    return structuredClone(await promise);

 });
}
  private expired() { return new AppError(410, 'TRANSLATION_DRAFT_EXPIRED', 'Bản nháp đã hết hạn hoặc máy chủ đã khởi động lại. Không tự động dịch lại.'); }
  restore(draft: GroupDraft) {
 return this.runtime.runSync(()=>{
    this.prune();
    if (!Number.isFinite(Date.parse(draft.expiresAt)) || Date.parse(draft.expiresAt) <= this.clock()) throw this.expired();
    if (Buffer.byteLength(JSON.stringify(draft)) > 128 * 1024 || (!this.drafts.has(draft.draftId) && this.drafts.size >= this.capacity)) throw new AppError(503, 'TRANSLATION_DRAFT_CAPACITY', 'Bộ nhớ bản nháp đã đầy.');
    if (this.drafts.has(draft.draftId)) return this.get(draft.draftId, draft.ownerId, draft.projectId);
    this.drafts.set(draft.draftId, structuredClone(draft));
    this.schedule(() => this.drafts.delete(draft.draftId), Math.max(1, Date.parse(draft.expiresAt) - this.clock()));
    return structuredClone(draft);

 });
}
  // Read-only observation: no prune, clone, TTL extension or cross-process claim.
  inspectConflicts(projectId: string, targetLanguage: string) {
    let count = 0;
    for (const draft of this.drafts.values()) if (draft.projectId === projectId && draft.targetLanguage === targetLanguage && Date.parse(draft.expiresAt) > this.clock()) count++;
    return { visibility: 'PROCESS_LOCAL_ONLY' as const, count, globalAbsence: 'UNKNOWN' as const };
  }
  get(id: string, ownerId: string, projectId: string): GroupDraft {
 return this.runtime.runSync(()=>{
    this.prune(); const draft = this.drafts.get(id);
    if (!draft || draft.ownerId !== ownerId || draft.projectId !== projectId) throw this.expired();
    return structuredClone(draft);

 });
}
  approve<T>(id: string, action: () => Promise<T>): Promise<T> {
 return this.runtime.runSync(()=>{
    const pending = this.approvals.get(id); if (pending) return pending as Promise<T>;
    const promise = this.runtime.track('pendingApprovals', async () => {try{return await Promise.resolve().then(action);}finally{this.approvals.delete(id);}}); this.approvals.set(id, promise); return promise;

 });
}
}
export const groupDraftStore = new GroupDraftStore();
