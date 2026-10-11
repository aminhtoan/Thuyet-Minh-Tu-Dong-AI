import { createHash } from 'node:crypto';

export const DEMO_DATABASE = 'multilingual_ai_narration_ui_demo';
export const DEMO_EMAIL = 'ui-demo@example.invalid';
export const DEMO_MARKER = '[S25.7.4.7 UI DEMO]';
export function validateDemoEnvironment(values: NodeJS.ProcessEnv) {
  if (!['development', 'test'].includes(values.NODE_ENV ?? '') || values.DEMO_DATABASE_CONFIRMED !== DEMO_DATABASE) {
    throw new Error('Phải xác nhận Database demo riêng và môi trường development/test.');
  }
  const uri = values.DEMO_MONGODB_URI;
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) throw new Error('Thiếu URI Database demo hợp lệ.');
  let database: string;
  try { database = new URL(uri).pathname.slice(1); } catch { throw new Error('URI demo không hợp lệ.'); }
  if (database !== DEMO_DATABASE) throw new Error('Từ chối Database không thuộc allowlist demo.');
  return uri;
}
export function demoProjects(now = new Date()) {
  const names = ['Mùa thu Hà Nội', 'Da Nang Travel', 'Giới thiệu sản phẩm', 'mua', 'Hành trình khám phá văn hóa và ẩm thực Việt Nam dành cho du khách quốc tế', 'An Giang', 'Bài học đầu tiên', 'Bao ve moi truong', 'Du lịch miền Tây', 'Câu chuyện hôm nay', 'Huong dan su dung', 'Khám phá thiên nhiên', 'Video khóa học', 'Nghệ thuật kể chuyện', 'Công ty của tôi', 'Am thanh', 'Chuyến đi cuối tuần', 'Tài liệu tháng trước', 'Dự án đầu năm', 'Kỷ niệm năm ngoái'];
  return names.map((name, index) => {
    const createdAt = new Date(now);
    if (index < 5) createdAt.setDate(createdAt.getDate() - index);
    else if (index < 10) createdAt.setDate(Math.max(1, createdAt.getDate() - index));
    else createdAt.setMonth(createdAt.getMonth() - (index - 9), 1);
    return { _id: createHash('sha256').update(`${DEMO_MARKER}:${index}`).digest('hex').slice(0, 24), name, description: DEMO_MARKER, sourceLanguage: ['vi', 'en', 'ja', 'ko'][index % 4], status: 'DRAFT', progress: 0, createdAt, updatedAt: createdAt };
  });
}
