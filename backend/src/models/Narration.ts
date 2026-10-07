import { model, Schema, type InferSchemaType } from 'mongoose';
import { NARRATION_STATUSES } from '../constants/project.constants.js';

const narrationSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    translationId: { type: Schema.Types.ObjectId, ref: 'Translation', required: true },
    voiceId: { type: Schema.Types.ObjectId, ref: 'Voice', required: true },
    languageCode: { type: String, required: true, trim: true, lowercase: true },
    speed: { type: Number, required: true, min: 0.5, max: 2 },
    audioPath: { type: String, trim: true },
    duration: { type: Number, min: 0 },
    status: { type: String, enum: NARRATION_STATUSES, required: true, default: 'READY' },
  },
  { timestamps: true },
);

export type NarrationDocument = InferSchemaType<typeof narrationSchema>;
export const Narration = model<NarrationDocument>('Narration', narrationSchema);
