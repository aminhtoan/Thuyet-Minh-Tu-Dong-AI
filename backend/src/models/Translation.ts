import { model, Schema, type InferSchemaType } from 'mongoose';
import { CONTENT_STATUSES } from '../constants/project.constants.js';

const translationSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    transcriptId: { type: Schema.Types.ObjectId, ref: 'Transcript', required: true, index: true },
    sourceLanguage: { type: String, required: true, trim: true, lowercase: true },
    targetLanguage: { type: String, required: true, trim: true, lowercase: true },
    fullText: { type: String, required: true, trim: true },
    status: { type: String, enum: CONTENT_STATUSES, required: true, default: 'READY' },
    revision: { type: Number, min: 1, validate: Number.isInteger },
    sourceTranscriptRevision: { type: Number, min: 1, validate: Number.isInteger },
    alignmentFormat: { type: String, enum: ['SEGMENTS_V1', 'GROUPS_V1'] },
    sourceRevision: String,
    groupingVersion: String,
    groups: { type: [new Schema({
      groupId: { type: String, required: true }, sequence: { type: Number, required: true },
      sourceSegmentIds: { type: [Schema.Types.ObjectId], required: true },
      sourceText: { type: String, required: true }, translatedText: { type: String, required: true },
      startTime: { type: Number, required: true, min: 0 }, endTime: { type: Number, required: true, min: 0 },
    }, { _id: false })], default: undefined },
    review: { type: new Schema({
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      reviewedAt: { type: Date, required: true }, sourceRevision: { type: String, required: true },
      outputDigest: { type: String, required: true }, method: { type: String, enum: ['MANUAL_V1'], required: true },
    }, { _id: false }), default: undefined },
  },
  { timestamps: true },
);

translationSchema.index({ transcriptId: 1, targetLanguage: 1 }, { unique: true });
translationSchema.pre('validate', function () {
  if (this.alignmentFormat === 'GROUPS_V1' && (!this.groups?.length || !this.sourceRevision || !this.groupingVersion || !this.review || this.review.sourceRevision !== this.sourceRevision)) {
    this.invalidate('review', 'GROUPS_V1 requires approved groups and a matching source revision.');
  }
  if (this.alignmentFormat === 'GROUPS_V1' && this.groups?.length) {
    const ids = this.groups.flatMap(g => g.sourceSegmentIds.map(String));
    if (new Set(ids).size !== ids.length || new Set(this.groups.map(g => g.groupId)).size !== this.groups.length || this.groups.some((g, i) =>
      !g.sourceSegmentIds.length || g.sequence !== i + 1 || !/^[a-f0-9]{64}$/.test(g.groupId) || !g.sourceText.trim() || !g.translatedText.trim() ||
      !Number.isFinite(g.startTime) || !Number.isFinite(g.endTime) || g.endTime <= g.startTime || (i > 0 && g.startTime < this.groups![i - 1]!.endTime)) ||
      this.fullText !== this.groups.map(g => g.translatedText).join(' ') || !/^[a-f0-9]{64}$/.test(this.review?.outputDigest ?? '')) {
      this.invalidate('groups', 'GROUPS_V1 requires unique ordered source coverage and valid immutable boundaries.');
    }
  }
});

export type TranslationDocument = InferSchemaType<typeof translationSchema>;
export const Translation = model<TranslationDocument>('Translation', translationSchema);
