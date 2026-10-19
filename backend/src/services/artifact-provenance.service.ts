export type ProvenanceState = 'CURRENT' | 'STALE' | 'UNKNOWN';

export type RevisionedRecord = { id?: unknown; _id?: unknown; revision?: number | null };
export type TranslationProvenanceRecord = RevisionedRecord & {
  transcriptId?: unknown;
  sourceTranscriptRevision?: number | null;
};
export type NarrationProvenanceRecord = RevisionedRecord & {
  translationId?: unknown;
  sourceTranslationRevision?: number | null;
};
export type ResultProvenanceRecord = {
  narrationId?: unknown;
  sourceNarrationRevision?: number | null;
};

const id = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const normalized = String(value);
  return normalized && normalized !== 'undefined' && normalized !== 'null' ? normalized : null;
};

export const isRevision = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;

export const nextRevision = (current: unknown): number => {
  if (current === undefined || current === null) return 1;
  if (!isRevision(current) || current === Number.MAX_SAFE_INTEGER) throw new Error('INVALID_REVISION');
  return current + 1;
};

export const revisionCasFilter = (recordId: unknown, expectedRevision: unknown) => {
  const record = id(recordId);
  if (!record || !isRevision(expectedRevision)) throw new Error('INVALID_REVISION_PRECONDITION');
  return { _id: record, revision: expectedRevision } as const;
};

// Make an upstream revision participate in a downstream transaction without
// incrementing it. Concurrent source edits then conflict/revalidate at commit.
export const revisionFenceOperation = (recordId: unknown, expectedRevision: unknown) => {
  const filter = revisionCasFilter(recordId, expectedRevision);
  return { filter, update: { $set: { revision: filter.revision } } } as const;
};

const direct = (
  sourceId: unknown,
  sourceRevision: unknown,
  current: RevisionedRecord | null | undefined,
): ProvenanceState => {
  const expectedId = id(sourceId);
  const currentId = id(current?.id ?? current?._id);
  if (!expectedId || !isRevision(sourceRevision) || !currentId || !isRevision(current?.revision)) return 'UNKNOWN';
  return expectedId === currentId && sourceRevision === current.revision ? 'CURRENT' : 'STALE';
};

const chain = (upstream: ProvenanceState, own: ProvenanceState): ProvenanceState => {
  if (upstream === 'STALE' || own === 'STALE') return 'STALE';
  if (upstream === 'UNKNOWN' || own === 'UNKNOWN') return 'UNKNOWN';
  return 'CURRENT';
};

export const translationProvenance = (
  translation: TranslationProvenanceRecord,
  transcript: RevisionedRecord | null | undefined,
): ProvenanceState => direct(translation.transcriptId, translation.sourceTranscriptRevision, transcript);

export const narrationProvenance = (
  narration: NarrationProvenanceRecord,
  translation: TranslationProvenanceRecord | null | undefined,
  translationState: ProvenanceState,
): ProvenanceState => chain(
  translationState,
  direct(narration.translationId, narration.sourceTranslationRevision, translation),
);

export const resultProvenance = (
  result: ResultProvenanceRecord,
  narration: NarrationProvenanceRecord | null | undefined,
  narrationState: ProvenanceState,
): ProvenanceState => chain(
  narrationState,
  direct(result.narrationId, result.sourceNarrationRevision, narration),
);

export type JobProvenanceRecord = {
  type: 'TRANSCRIPTION' | 'TRANSLATION' | 'TTS' | 'VIDEO_PROCESSING';
  sourceTranscriptId?: unknown;
  sourceTranscriptRevision?: number | null;
  sourceTranslationId?: unknown;
  sourceTranslationRevision?: number | null;
  sourceNarrationId?: unknown;
  sourceNarrationRevision?: number | null;
};

export const jobProvenance = (
  job: JobProvenanceRecord,
  sources: { transcript?: RevisionedRecord | null; translation?: RevisionedRecord | null; narration?: RevisionedRecord | null },
): ProvenanceState => {
  if (job.type === 'TRANSCRIPTION') return 'CURRENT';
  if (job.type === 'TRANSLATION') return direct(job.sourceTranscriptId, job.sourceTranscriptRevision, sources.transcript);
  if (job.type === 'TTS') return direct(job.sourceTranslationId, job.sourceTranslationRevision, sources.translation);
  return direct(job.sourceNarrationId, job.sourceNarrationRevision, sources.narration);
};
