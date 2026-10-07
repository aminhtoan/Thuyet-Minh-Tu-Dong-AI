import { model, Schema, type InferSchemaType } from 'mongoose';

const authSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true, select: false },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

export type AuthSessionDocument = InferSchemaType<typeof authSessionSchema>;
export const AuthSession = model<AuthSessionDocument>('AuthSession', authSessionSchema);
