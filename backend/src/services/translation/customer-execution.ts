import { AsyncLocalStorage } from 'node:async_hooks';
import { AppError } from '../../utils/app-error.js';

export type ExecutionPhase = 'PREPARING' | 'METADATA_DISPATCHING' | 'METADATA_RECEIVED' | 'GENERATION_DISPATCHING' | 'GENERATION_RECEIVED' | 'SAVING';
export type ExecutionTrace = { phase: ExecutionPhase; metadata: boolean; generation: boolean; response: boolean; record: (phase: ExecutionPhase) => Promise<void>; reserve?: () => Promise<void>; reservation?: Promise<void>; metadataPending?: boolean };
const context = new AsyncLocalStorage<ExecutionTrace>();
export const withCustomerExecution = <T>(trace: ExecutionTrace, work: () => Promise<T>) => context.run(trace, work);
export async function customerDispatch(kind: 'METADATA' | 'GENERATION') {
  const trace = context.getStore();
  if (!trace) return; // Ordinary GROUPS_V1/operator providers retain their own guards.
  if (kind === 'METADATA' ? trace.metadata || trace.metadataPending : trace.generation || trace.phase !== 'METADATA_RECEIVED') throw new AppError(409, 'TRANSLATION_ATTEMPT_UNCERTAIN', 'Không gửi lại yêu cầu dịch.');
  // Configuration and source verification already passed. Reserve at the first
  // external boundary, not when merely creating a claim. Share duplicate waiters.
  if (kind === 'METADATA') trace.metadataPending = true;
  const phase = kind === 'METADATA' ? 'METADATA_DISPATCHING' : 'GENERATION_DISPATCHING';
  // Durable majority+journal acknowledgement is required BEFORE external dispatch.
  // If this write is ambiguous, the caller throws and must not send anything.
  try { await trace.record(phase); }
  catch { throw new AppError(503, 'TRANSLATION_ATTEMPT_FENCE_FAILED', 'Không xác nhận được dấu mốc an toàn. Chưa gửi yêu cầu tiếp theo; không tự thử lại.'); }
  trace.phase = phase;
  if (kind === 'METADATA' && trace.reserve) await (trace.reservation ??= trace.reserve());
  if (kind === 'METADATA') trace.metadata = true; else trace.generation = true;
}
export async function customerResponse(kind: 'METADATA' | 'GENERATION') {
  const trace = context.getStore();
  if (!trace) return;
  if (kind === 'GENERATION') trace.response = true;
  const phase = kind === 'METADATA' ? 'METADATA_RECEIVED' : 'GENERATION_RECEIVED';
  await trace.record(phase);
  trace.phase = phase;
}

// Only failed READS may be repeated. No quota/claim/provider operation uses this.
export async function recoverCustomerRead<T>(read: () => Promise<T>): Promise<T> {
  try { return await read(); } catch (error) {
    if (!(error instanceof Error) || !['MongoNetworkError', 'MongoNetworkTimeoutError', 'MongoServerSelectionError'].includes(error.name)) throw error;
    return read(); // One bounded recovery, never a provider retry.
  }
}
