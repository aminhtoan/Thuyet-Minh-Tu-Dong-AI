import { model, Schema, type InferSchemaType } from 'mongoose';

const listenEventSchema = new Schema(
  {
    visitorId: { type: Schema.Types.ObjectId, ref: 'Visitor', default: null, index: true },
    platform: { type: String, enum: ['web', 'mobile'], required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    narrationId: { type: Schema.Types.ObjectId, ref: 'Narration', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    languageCode: { type: String, trim: true, lowercase: true, default: null },
    userAgent: { type: String, trim: true, default: null },
    ipAddress: { type: String, trim: true, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

listenEventSchema.index({ platform: 1, createdAt: -1 });
listenEventSchema.index({ createdAt: -1 });

export type ListenEventDocument = InferSchemaType<typeof listenEventSchema>;
export const ListenEvent = model<ListenEventDocument>('ListenEvent', listenEventSchema);
