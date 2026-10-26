import { model, Schema, type InferSchemaType, type Types } from 'mongoose';

const visitorSchema = new Schema(
  {
    visitorCode: { type: String, required: true, unique: true, index: true }, // e.g. "Khách #6208"
    ipAddress: { type: String, trim: true, default: null, index: true },
    userAgent: { type: String, trim: true, default: null },
    deviceType: { type: String, enum: ['mobile', 'tablet', 'desktop', 'unknown'], default: 'unknown' },
    os: { type: String, trim: true, default: null },
    browser: { type: String, trim: true, default: null },
    totalScans: { type: Number, required: true, default: 0, min: 0 },
    totalListens: { type: Number, required: true, default: 0, min: 0 },
    languages: [{ type: String, trim: true, lowercase: true }],
    firstVisitAt: { type: Date, default: Date.now },
    lastVisitAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

visitorSchema.index({ lastVisitAt: -1 });
visitorSchema.index({ totalListens: -1 });
visitorSchema.index({ totalScans: -1 });

export type VisitorDocument = InferSchemaType<typeof visitorSchema> & { _id: Types.ObjectId };
export const Visitor = model<VisitorDocument>('Visitor', visitorSchema);

