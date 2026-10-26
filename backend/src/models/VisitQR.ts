import { model, Schema, type InferSchemaType } from 'mongoose';

const visitQRSchema = new Schema(
  {
    source: { type: String, trim: true, default: 'qr_unknown', index: true },
    ipAddress: { type: String, trim: true, default: null, index: true },
    userAgent: { type: String, trim: true, default: null },
    deviceType: { type: String, trim: true, default: 'mobile' }, // mobile | tablet | desktop | unknown
    os: { type: String, trim: true, default: null }, // iOS | Android | Windows | macOS | Linux | Unknown
    browser: { type: String, trim: true, default: null }, // Safari | Chrome | Firefox | Zalo | etc.
    targetPath: { type: String, trim: true, default: '/' },
    location: { type: String, trim: true, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

visitQRSchema.index({ createdAt: -1 });
visitQRSchema.index({ source: 1, createdAt: -1 });
visitQRSchema.index({ ipAddress: 1, createdAt: -1 });

export type VisitQRDocument = InferSchemaType<typeof visitQRSchema>;
export const VisitQR = model<VisitQRDocument>('VisitQR', visitQRSchema);
