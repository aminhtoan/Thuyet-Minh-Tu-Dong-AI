import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { DEMO_DATABASE, DEMO_EMAIL, DEMO_MARKER, demoProjects, validateDemoEnvironment } from './demo-project-data.js';

async function run() {
  const mode = process.argv[2];
  if (!mode || !['seed', 'cleanup'].includes(mode)) throw new Error('Chọn seed hoặc cleanup.');
  const uri = validateDemoEnvironment(process.env);
  await mongoose.connect(uri, { dbName: DEMO_DATABASE, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  if (!db || db.databaseName !== DEMO_DATABASE) throw new Error('Sai Database đích.');
  const user = await User.findOne({ email: DEMO_EMAIL, fullName: DEMO_MARKER, role: 'CUSTOMER', status: 'ACTIVE' });
  if (!user) throw new Error('Cần tài khoản demo riêng đúng định danh; không sử dụng tài khoản thật.');
  const records = demoProjects();
  const ids = records.map(record => new mongoose.Types.ObjectId(record._id));
  const existing = await Project.find({ _id: { $in: ids } });
  if (existing.some(record => !record.userId.equals(user._id) || record.description !== DEMO_MARKER || record.status !== 'DRAFT')) {
    throw new Error('Dữ liệu đã thay đổi hoặc xung đột định danh; dừng, không ghi/xóa.');
  }
  // Never delete media/artifacts or cascade through workflow records.
  if (mode === 'cleanup') {
    for (const collection of await db.listCollections({}, { nameOnly: true }).toArray()) {
      if (collection.name === Project.collection.name) continue;
      if (await db.collection(collection.name).findOne({ $or: [{ projectId: { $in: ids } }, { entityId: { $in: ids } }, { projectId: { $in: ids.map(String) } }, { entityId: { $in: ids.map(String) } }] })) {
        throw new Error('Có dữ liệu liên quan; cleanup từ chối để bảo vệ media/workflow.');
      }
    }
    const result = await Project.deleteMany({ _id: { $in: ids }, userId: user._id, description: DEMO_MARKER, status: 'DRAFT' });
    console.info(`Đã xóa ${result.deletedCount} dự án demo; giữ nguyên tài khoản và mọi tệp.`);
  } else {
    for (const record of records) {
      if (existing.some(item => item._id.toString() === record._id)) continue;
      await new Project({ ...record, userId: user._id }).validate();
      await Project.collection.insertOne({ ...record, _id: new mongoose.Types.ObjectId(record._id), userId: user._id });
    }
    console.info(`Dự án demo thuộc tài khoản test: ${await Project.countDocuments({ _id: { $in: ids }, userId: user._id, description: DEMO_MARKER })}`);
  }
}
void run().catch(() => {
  // Do not print driver errors: they can include credentials/hostnames.
  console.error('Thao tác demo bị từ chối hoặc không thành công. Kiểm tra cấu hình, định danh và dữ liệu liên quan; không có cleanup toàn cục.');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
