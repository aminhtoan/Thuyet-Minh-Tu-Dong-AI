import { z } from 'zod';
import mongoose from 'mongoose';

export const trackListenSchema = z.object({
  body: z.object({
    platform: z.enum(['web', 'mobile'], {
      message: 'Nền tảng phải là web hoặc mobile.',
    }),
    projectId: z
      .string()
      .trim()
      .refine((val) => !val || mongoose.isValidObjectId(val), {
        message: 'Mã dự án không hợp lệ.',
      })
      .optional(),
    narrationId: z
      .string()
      .trim()
      .refine((val) => !val || mongoose.isValidObjectId(val), {
        message: 'Mã thuyết minh không hợp lệ.',
      })
      .optional(),
    languageCode: z.string().trim().max(10).optional(),
  }),
});
