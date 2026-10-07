import { model, Schema, type InferSchemaType } from 'mongoose';

const translationSegmentSchema = new Schema(
  {
    translationId: { type: Schema.Types.ObjectId, ref: 'Translation', required: true, index: true },
    transcriptSegmentId: { type: Schema.Types.ObjectId, ref: 'TranscriptSegment', required: true, index: true },
    translatedText: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

translationSegmentSchema.index({ translationId: 1, transcriptSegmentId: 1 }, { unique: true });

export type TranslationSegmentDocument = InferSchemaType<typeof translationSegmentSchema>;
export const TranslationSegment = model<TranslationSegmentDocument>('TranslationSegment', translationSegmentSchema);
