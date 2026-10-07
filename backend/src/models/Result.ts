import { model, Schema, type InferSchemaType } from 'mongoose';

const resultSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    narrationId: { type: Schema.Types.ObjectId, ref: 'Narration', required: true },
    languageCode: { type: String, required: true, trim: true, lowercase: true },
    videoPath: { type: String, required: true, trim: true },
    audioPath: { type: String, trim: true },
    mimeType: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 0 },
    fileSize: { type: Number, required: true, min: 1 },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
  },
  { timestamps: true },
);

resultSchema.index({ projectId: 1, languageCode: 1 });
resultSchema.index({ projectId: 1, narrationId: 1 }, { unique: true });

export type ResultDocument = InferSchemaType<typeof resultSchema>;
export const Result = model<ResultDocument>('Result', resultSchema);
