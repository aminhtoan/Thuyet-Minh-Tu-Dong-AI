import { model, Schema, type InferSchemaType } from 'mongoose';

const activityLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    description: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export type ActivityLogDocument = InferSchemaType<typeof activityLogSchema>;
export const ActivityLog = model<ActivityLogDocument>('ActivityLog', activityLogSchema);
