import { model, Schema, type InferSchemaType } from 'mongoose';

const transcriptSegmentSchema = new Schema(
  {
    transcriptId: { type: Schema.Types.ObjectId, ref: 'Transcript', required: true, index: true },
    sequence: { type: Number, required: true, min: 1, validate: Number.isInteger },
    startTime: { type: Number, required: true, min: 0 },
    endTime: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(this: { startTime: number }, value: number) {
          return value >= this.startTime;
        },
        message: 'endTime phải lớn hơn hoặc bằng startTime.',
      },
    },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

transcriptSegmentSchema.index({ transcriptId: 1, sequence: 1 }, { unique: true });

export type TranscriptSegmentDocument = InferSchemaType<typeof transcriptSegmentSchema>;
export const TranscriptSegment = model<TranscriptSegmentDocument>('TranscriptSegment', transcriptSegmentSchema);
