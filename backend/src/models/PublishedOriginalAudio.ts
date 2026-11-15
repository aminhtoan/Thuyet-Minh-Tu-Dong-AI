import { model, Schema, type InferSchemaType } from 'mongoose';

const schema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceMediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true },
  sourceFingerprint: { type: String, required: true },
  languageCode: { type: String, required: true },
  rightsDeclaration: { type: String, required: true },
  rightsReference: { type: String, required: true },
  rightsDeclaredAt: { type: Date, required: true },
  requestedAt: { type: Date, required: true },
  artifactStatus: { type: String, enum: ['PENDING', 'PROCESSING', 'READY', 'FAILED'], default: 'PENDING', required: true },
  preparationId: String,
  preparationStartedAt: Date,
  preparationErrorCode: String,
  artifactPath: String,
  artifactDigest: String,
  fileSize: Number,
  duration: Number,
  mimeType: String,
  publicationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'], default: 'PENDING', required: true },
  authorizationMode: { type: String, enum: ['ADMIN_DIRECT'] },
  publicationEnabled: { type: Boolean, default: false, required: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewReason: String,
  version: { type: Number, default: 0, required: true },
}, { timestamps: true });
schema.index({ projectId: 1, sourceFingerprint: 1, createdAt: -1 });
schema.index({ projectId: 1, sourceFingerprint: 1, authorizationMode: 1 }, { unique: true, partialFilterExpression: { authorizationMode: 'ADMIN_DIRECT' } });
// This model is additive. Importing it does not backfill or approve existing media.
export const PublishedOriginalAudio = model('PublishedOriginalAudio', schema);
export type PublishedOriginalAudioDocument = InferSchemaType<typeof schema>;
