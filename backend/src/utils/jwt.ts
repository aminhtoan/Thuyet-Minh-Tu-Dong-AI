import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '../constants/user.constants.js';

type TokenType = 'access' | 'refresh';

interface AuthTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  type: TokenType;
  jti?: string;
}

const signToken = (
  payload: Omit<AuthTokenPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: string,
): string => jwt.sign(payload, secret, { expiresIn: expiresIn as SignOptions['expiresIn'] });

const verifyToken = (token: string, secret: string, expectedType: TokenType): AuthTokenPayload => {
  const payload = jwt.verify(token, secret);
  if (
    typeof payload === 'string' ||
    payload.type !== expectedType ||
    typeof payload.sub !== 'string' ||
    !['CUSTOMER', 'ADMIN'].includes(payload.role)
  ) {
    throw new jwt.JsonWebTokenError('Loại token không hợp lệ.');
  }
  return payload as AuthTokenPayload;
};

export const signAccessToken = (userId: string, role: UserRole): string =>
  signToken({ sub: userId, role, type: 'access' }, env.jwtAccessSecret, env.jwtAccessExpiresIn);

export const signRefreshToken = (userId: string, role: UserRole, sessionId: string): string =>
  signToken({ sub: userId, role, type: 'refresh', jti: sessionId }, env.jwtRefreshSecret, env.jwtRefreshExpiresIn);

export const verifyAccessToken = (token: string): AuthTokenPayload =>
  verifyToken(token, env.jwtAccessSecret, 'access');

export const verifyRefreshToken = (token: string): AuthTokenPayload => {
  const payload = verifyToken(token, env.jwtRefreshSecret, 'refresh');
  if (!payload.jti) throw new jwt.JsonWebTokenError('Refresh token không có session ID.');
  return payload;
};

export const getTokenExpiration = (token: string): Date => {
  const payload = jwt.decode(token);
  if (!payload || typeof payload === 'string' || typeof payload.exp !== 'number') {
    throw new jwt.JsonWebTokenError('Token không có thời hạn hợp lệ.');
  }
  return new Date(payload.exp * 1_000);
};

export { jwt };
