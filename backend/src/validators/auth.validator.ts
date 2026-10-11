import { z } from 'zod';

const email = z.string().trim().email('Email không hợp lệ.').max(254).transform((value) => value.toLowerCase());
export const profileNameSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Họ và tên phải có ít nhất 2 ký tự.').max(100, 'Họ và tên không được vượt quá 100 ký tự.'),
  }).strict(),
});
const password = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
  .max(128, 'Mật khẩu không được vượt quá 128 ký tự.')
  .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất một chữ hoa.')
  .regex(/[a-z]/, 'Mật khẩu phải có ít nhất một chữ thường.')
  .regex(/[0-9]/, 'Mật khẩu phải có ít nhất một chữ số.');

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự.').max(100),
    email,
    password,
  }),
});

export const loginSchema = z.object({
  body: z.object({ email, password: z.string().min(1).max(128) }),
});

export const refreshTokenSchema = z.object({
  body: z.object({ refreshToken: z.string().trim().min(1) }),
});
