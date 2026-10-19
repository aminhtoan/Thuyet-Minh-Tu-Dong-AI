import { model, Schema, type InferSchemaType } from 'mongoose';
import { USER_ROLES, USER_STATUSES } from '../constants/user.constants.js';

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, required: true, default: 'CUSTOMER' },
    status: { type: String, enum: USER_STATUSES, required: true, default: 'ACTIVE' },
    avatarUrl: { type: String, trim: true },
    deletedAt: { type: Date, default: null },
    deletedReason: { type: String, trim: true, maxlength: 200 },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model<UserDocument>('User', userSchema);
