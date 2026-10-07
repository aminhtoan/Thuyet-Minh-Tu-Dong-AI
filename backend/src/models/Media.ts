import { model, Schema, type InferSchemaType } from 'mongoose';
import { MEDIA_TYPES } from '../constants/project.constants.js';

const mediaSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true, index: true },
    originalName: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    mediaType: { type: String, enum: MEDIA_TYPES, required: true },
    mimeType: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 0 },
    duration: { type: Number, min: 0 },
    storagePath: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export type MediaDocument = InferSchemaType<typeof mediaSchema>;
export const Media = model<MediaDocument>('Media', mediaSchema);
