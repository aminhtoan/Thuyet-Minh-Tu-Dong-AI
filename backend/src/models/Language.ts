import { model, Schema, type InferSchemaType } from 'mongoose';

const languageSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    nativeName: { type: String, required: true, trim: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

export type LanguageDocument = InferSchemaType<typeof languageSchema>;
export const Language = model<LanguageDocument>('Language', languageSchema);
