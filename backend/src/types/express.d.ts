import type { UserRole, UserStatus } from '../constants/user.constants.js';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      fullName: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      avatarUrl: string | null;
    }

    interface Request {
      user?: AuthenticatedUser;
      validated?: { body?: unknown; params?: unknown; query?: unknown };
      ownedProjectId?: string;
    }
  }
}

export {};
