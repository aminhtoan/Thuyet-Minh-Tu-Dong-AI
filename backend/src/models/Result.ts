import { model, Schema, type InferSchemaType } from 'mongoose';

const resultSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    narrationId: { type: Schema.Types.ObjectId, ref: 'Narration', required: true },
    languageCode: { type: String, required: true, trim: true, lowercase: true },
    videoPath: { type: String, trim: true },
    audioPath: { type: String, trim: true },
    duration: { type: Number, min: 0 },
    fileSize: { type: Number, min: 0 },
  },
  { timestamps: true },
);

resultSchema.index({ projectId: 1, languageCode: 1 });

export type ResultDocument = InferSchemaType<typeof resultSchema>;
export const Result = model<ResultDocument>('Result', resultSchema);
