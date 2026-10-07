import bcrypt from 'bcryptjs';

const PASSWORD_COST = 12;

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, PASSWORD_COST);

export const comparePassword = (password: string, passwordHash: string): Promise<boolean> =>
  bcrypt.compare(password, passwordHash);
