import { model, Schema, type InferSchemaType } from 'mongoose';

const voiceSchema = new Schema(
  {
    languageId: { type: Schema.Types.ObjectId, ref: 'Language', required: true, index: true },
    provider: { type: String, required: true, trim: true },
    providerVoiceId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    gender: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    previewUrl: { type: String, trim: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

voiceSchema.index({ languageId: 1, isActive: 1 });
voiceSchema.index({ provider: 1, providerVoiceId: 1, languageId: 1 }, { unique: true });

export type VoiceDocument = InferSchemaType<typeof voiceSchema>;
export const Voice = model<VoiceDocument>('Voice', voiceSchema);
