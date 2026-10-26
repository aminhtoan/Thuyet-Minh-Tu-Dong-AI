import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Project } from '../models/Project.js';

interface ProjectUpdate {
  filter: Record<string, unknown>;
  name: string;
  description: string;
}

const updates: ProjectUpdate[] = [
  // 1. Video S22 92a48cec-... (Card 1)
  {
    filter: { name: { $regex: /92a48cec-04e0-4595-9cc4-2bf747bd46b5/i } },
    name: 'Phim tư liệu: Tổng quan Bảo tàng & Không gian Trưng bày',
    description: 'Giới thiệu các gian phòng trưng bày hiện vật lịch sử và văn hóa dân tộc.',
  },
  // 2. Lời chào Bảo tàng (Card 2)
  {
    filter: { _id: '6addd61286437d39a2ffc5f2' },
    name: 'Lời chào & Hướng dẫn tham quan (Tiếng Trung)',
    description: 'Bản thuyết minh chào đón khách tham quan và hướng dẫn các khu vực nổi bật.',
  },
  {
    filter: { _id: '6adcff3f0ddc1981d9991a8d' },
    name: 'Lời chào & Hướng dẫn tham quan (Tiếng Nhật)',
    description: 'Bản thuyết minh chào đón khách tham quan và hướng dẫn các khu vực nổi bật.',
  },
  // 3. Test with Mimi Lion audio (Card 3)
  {
    filter: { _id: '6addab30068d4ea835830a08' },
    name: 'Chuyên đề Động vật: Sư tử trắng Mimi',
    description: 'Câu chuyện về cô sư tử trắng Mimi gắn bó hơn 16 năm tại Thảo Cầm Viên Sài Gòn.',
  },
  // 4. Con khỉ mimi -> Sư tử trắng Mimi (Card 4)
  {
    filter: { _id: '6add171179953b8ffafd7cb0' },
    name: 'Hiện vật Sinh học: Ký ức Sư tử trắng Mimi',
    description: 'Bản ghi nhớ và tư liệu bảo tồn loài sư tử trắng quý hiếm.',
  },
  {
    filter: { _id: '6add6d1d578be687c3cd6dec' },
    name: 'Hiện vật Sinh học: Ký ức Sư tử trắng Mimi (Tiếng Hàn)',
    description: 'Bản ghi nhớ và tư liệu bảo tồn loài sư tử trắng quý hiếm.',
  },
  {
    filter: { _id: '6add1eaa79953b8ffafd7e25' },
    name: 'Hiện vật Sinh học: Ký ức Sư tử trắng Mimi (Tiếng Nhật)',
    description: 'Bản ghi nhớ và tư liệu bảo tồn loài sư tử trắng quý hiếm.',
  },
  {
    filter: { _id: '6add6a52d15c8cdc119377ad' },
    name: 'Hiện vật Sinh học: Ký ức Sư tử trắng Mimi (Tiếng Pháp)',
    description: 'Bản ghi nhớ và tư liệu bảo tồn loài sư tử trắng quý hiếm.',
  },
  // 5. Test (Card 5)
  {
    filter: { _id: '6add14434e578b42a10f74a4' },
    name: 'Khu bảo tồn Động vật quý hiếm & Đa dạng Sinh học',
    description: 'Thuyết minh tư liệu về các loài động vật hoang dã và nỗ lực bảo tồn sinh thái.',
  },
  // 6. Dự án test (Card 6)
  {
    filter: { _id: '6add07d7cf3e34d3250e4f3f' },
    name: 'Gian trưng bày Cổ vật & Di sản Văn hóa Dân tộc',
    description: 'Thuyết minh nguồn gốc và giá trị văn hóa của các cổ vật tiêu biểu.',
  },
  // 7. Other test projects
  {
    filter: { _id: '6add0e64cf3e34d3250e4f5e' },
    name: 'Gian trưng bày Thế giới Tự nhiên',
    description: 'Giới thiệu hệ sinh thái tự nhiên và lịch sử tiến hóa.',
  },
  {
    filter: { _id: '6add06c7cf3e34d3250e4f3a' },
    name: 'Phòng trưng bày Mỹ thuật Cổ truyền',
    description: 'Bộ sưu tập tranh khắc gỗ và mỹ thuật truyền thống.',
  },
  {
    filter: { _id: '6add1dce79953b8ffafd7e10' },
    name: 'Khu di tích Kiến trúc Lịch sử',
    description: 'Tài liệu kiến trúc và khảo cổ học công trình bảo tàng.',
  },
];

async function main() {
  try {
    await connectDatabase(env.mongoUri);
    console.log('Connected to database. Applying project name updates...');

    for (const u of updates) {
      const res = await Project.updateMany(u.filter, {
        $set: {
          name: u.name,
          description: u.description,
        },
      });
      console.log(`Updated ${res.modifiedCount} project(s) -> "${u.name}"`);
    }

    console.log('\nAll projects successfully renamed!');
  } catch (err) {
    console.error('Failed to rename projects:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

void main();
