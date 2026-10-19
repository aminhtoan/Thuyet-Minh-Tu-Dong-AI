import type mongoose from 'mongoose';
import type { UserDocument } from '../models/User.js';

export interface UserAvailabilityRecord {
  deletedAt?: Date | null;
}

/** MongoDB `{ field: null }` intentionally matches both null and missing legacy fields. */
export const availableUserFilter = (filter: mongoose.QueryFilter<UserDocument>): mongoose.QueryFilter<UserDocument> => ({
  ...filter,
  deletedAt: null,
});

export const isUserAvailable = (user: UserAvailabilityRecord): boolean => user.deletedAt == null;
