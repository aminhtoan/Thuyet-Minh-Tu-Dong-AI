import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';
import { AuthSession } from '../models/AuthSession.js';
import { User, type UserDocument } from '../models/User.js';
import type { UserRole, UserStatus } from '../constants/user.constants.js';
import { AppError } from '../utils/app-error.js';
import { getTokenExpiration, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/password.js';

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export interface SafeUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export const updateDisplayName = async (userId: string, fullName: string): Promise<SafeUser> => {
  const user = await User.findOneAndUpdate(
    { _id: userId, status: 'ACTIVE' },
    { $set: { fullName } },
    { returnDocument: 'after', runValidators: true },
  );
  if (!user) throw new AppError(401, 'INVALID_TOKEN', 'Tài khoản không còn khả dụng.');
  return serializeUser(user);
};

export const serializeUser = (user: UserDocument & { _id: Types.ObjectId }): SafeUser => ({
  id: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  status: user.status,
  avatarUrl: user.avatarUrl ?? null,
});

const recordActivity = async (userId: Types.ObjectId, action: string, description: string): Promise<void> => {
  try {
    await ActivityLog.create({ userId, action, entityType: 'User', entityId: userId, description });
  } catch {
    // Audit logging is best-effort and must not break a successful authentication action.
  }
};

const createTokenPair = async (user: UserDocument & { _id: Types.ObjectId }): Promise<TokenPair> => {
  const sessionId = new Types.ObjectId();
  const userId = user._id.toString();
  const accessToken = signAccessToken(userId, user.role);
  const refreshToken = signRefreshToken(userId, user.role, sessionId.toString());

  await AuthSession.create({
    _id: sessionId,
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getTokenExpiration(refreshToken),
  });

  return { accessToken, refreshToken };
};

const duplicateEmailError = (): AppError =>
  new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email đã được sử dụng.');

export const register = async (input: RegisterInput): Promise<{ user: SafeUser } & TokenPair> => {
  if (await User.exists({ email: input.email })) throw duplicateEmailError();

  try {
    const user = await User.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });
    const tokens = await createTokenPair(user);
    void recordActivity(user._id, 'USER_REGISTERED', 'Người dùng đã đăng ký tài khoản.');
    return { user: serializeUser(user), ...tokens };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      throw duplicateEmailError();
    }
    throw error;
  }
};

export const login = async (input: LoginInput): Promise<{ user: SafeUser } & TokenPair> => {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.');
  }
  if (user.status === 'BLOCKED') {
    throw new AppError(403, 'ACCOUNT_BLOCKED', 'Tài khoản đã bị khóa.');
  }

  const tokens = await createTokenPair(user);
  void recordActivity(user._id, 'USER_LOGIN', 'Người dùng đã đăng nhập.');
  return { user: serializeUser(user), ...tokens };
};

export const refresh = async (rawToken: string): Promise<TokenPair> => {
  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Refresh token không hợp lệ.');
  }

  const revokedSession = await AuthSession.findOneAndUpdate(
    {
      _id: payload.jti,
      userId: payload.sub,
      tokenHash: hashToken(rawToken),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { revokedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!revokedSession) throw new AppError(401, 'INVALID_TOKEN', 'Refresh token không hợp lệ.');

  const user = await User.findById(payload.sub);
  if (!user) throw new AppError(401, 'INVALID_TOKEN', 'Refresh token không hợp lệ.');
  if (user.status === 'BLOCKED') throw new AppError(403, 'ACCOUNT_BLOCKED', 'Tài khoản đã bị khóa.');
  return createTokenPair(user);
};

export const logout = async (rawToken: string): Promise<void> => {
  try {
    const payload = verifyRefreshToken(rawToken);
    const session = await AuthSession.findOneAndUpdate(
      { _id: payload.jti, userId: payload.sub, tokenHash: hashToken(rawToken), revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (session) void recordActivity(session.userId, 'USER_LOGOUT', 'Người dùng đã đăng xuất.');
  } catch {
    // Logout is intentionally idempotent and reveals no token/session details.
  }
};
