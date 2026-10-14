export type TranslationGroup = { groupId: string; sequence: number; sourceSegmentIds: string[]; sourceText: string; translatedText: string; startTime: number; endTime: number };
export type GroupPlan = { projectId: string; targetLanguage: string; sourceLanguage: string; sourceRevision: string; groupingVersion: string; sourceSegmentCount: number; groups: TranslationGroup[] };
export type GroupDraft = Omit<GroupPlan, 'sourceSegmentCount'> & { alignmentFormat: 'GROUPS_V1'; state: 'DRAFT'; draftId: string; outputDigest: string; expiresAt: string };
export type GroupTranslation = GroupPlan & { id: string; alignmentFormat: 'GROUPS_V1'; state: 'APPROVED'; fullText: string; groupCount: number; review: { method: 'MANUAL_V1'; reviewedAt: string; outputDigest: string }; createdAt: string; updatedAt: string };
export type SavedGroupTranslation = GroupTranslation & { status: 'SAVED' };
