# Multilingual AI Narration System

**Hệ thống thuyết minh tự động đa ngôn ngữ**

Repository hiện cung cấp ba ứng dụng frontend cho quy trình:

```text
Media → Speech-to-Text → Transcript → Translation
→ Voice / Text-to-Speech → Media Processing → Result
```

Các màn hình và luồng frontend hiện vẫn dùng dữ liệu cùng service mô phỏng. Backend đã có foundation, MongoDB Atlas và auth/JWT/RBAC thật, nhưng frontend chưa tích hợp API. Speech-to-Text, dịch máy, Text-to-Speech và xử lý media/FFmpeg vẫn là mục tiêu tương lai.

## Trạng thái hiện tại

| Thành phần | Trạng thái |
| --- | --- |
| Customer Web | Đã triển khai phạm vi frontend hiện tại bằng React; dữ liệu, upload, xác thực và xử lý dùng mock/in-memory service khi chưa có backend. |
| Admin Web | Đã triển khai các màn hình chính từ Dashboard đến Customers, Projects, Jobs, Languages, Voices, Logs và Settings; dữ liệu và mutation là mock/in-memory. |
| Customer Mobile | Đã có frontend React Native + Expo Router cho các luồng Customer tương ứng; dùng mock service và không gọi backend thật. |
| Backend | **S17–S19 đã triển khai.** Có foundation, auth/JWT/RBAC, Customer Project CRUD và Media upload. |
| MongoDB | **MongoDB Atlas đã kết nối và runtime validation PASS.** Development database là `multilingual_ai_narration`; frontend chưa dùng persistence phía server. |
| Authentication / JWT / RBAC | **Đã triển khai ở backend.** Frontend login/register vẫn là mock và chưa gọi API thật. |
| AI và media | STT, Translation provider, TTS provider và FFmpeg pipeline đều **chưa tích hợp**. |

Mock frontend không phải security boundary, không ngăn đăng nhập thật và không tạo file audio/video kết quả thực. Dữ liệu in-memory có thể mất khi reload ứng dụng.

## Chức năng frontend hiện có

### Customer Web và Mobile

- Login/Register mô phỏng, Dashboard, danh sách và lịch sử dự án.
- Tạo dự án, chọn media và upload mô phỏng.
- Transcript Editor và Translation Editor theo segment.
- Chọn giọng đọc, tốc độ và preview mô phỏng.
- Generate/Processing mô phỏng với trạng thái, retry và cancel.
- Result metadata và History trong phiên; chưa có binary để preview/download thật.

### Admin Web

- Dashboard tổng quan.
- Quản lý Customer: tìm kiếm, lọc, chi tiết, khóa/mở khóa mô phỏng.
- Theo dõi Project và Processing Job; retry/cancel job mô phỏng.
- Quản lý Language và Voice; không hard-delete dữ liệu quan hệ.
- Activity Logs chỉ đọc.
- System Settings mô phỏng, không chứa hoặc hiển thị secret.

## Công nghệ sử dụng

### Frontend hiện tại

- **Customer Web:** React, TypeScript, Vite.
- **Admin Web:** React, TypeScript, Vite.
- **Customer Mobile:** React Native, TypeScript, Expo SDK 57, Expo Router.

### Backend hiện tại

- Node.js, Express.js, TypeScript.
- MongoDB và Mongoose.
- bcrypt password hashing, access/refresh JWT, refresh-session revocation và RBAC.

### Backend dự kiến tiếp theo

- Speech-to-Text và transcript generation.

### Xử lý dự kiến

- Speech-to-Text.
- Translation.
- Text-to-Speech.
- FFmpeg media processing.

Các provider AI, queue và worker cụ thể chưa được lựa chọn hoặc tích hợp.

## Cấu trúc dự án

```text
multilingual-ai-narration/
├── frontend-web/          # Customer Web
├── frontend-mobile/       # Customer Mobile (Expo)
├── admin-web/             # Admin Web độc lập
├── backend/               # Backend foundation (Express + TypeScript + Mongoose)
├── docs/
│   ├── CONTEXT.md
│   ├── PROGRESS.md
│   ├── UI.md
│   ├── API.md
│   └── ARCHITECTURE.md
├── .gitignore
├── .gitattributes
└── README.md
```

`backend/` là package độc lập được tạo ở S17. Admin Web là một ứng dụng riêng, không nằm trong router của Customer Web.

## Yêu cầu môi trường

- Node.js.
- npm.
- Git.
- Trình duyệt hiện đại.
- VS Code hoặc editor tương đương được khuyến nghị.
- Expo Go tương thích với Expo SDK 57 nếu kiểm thử trên điện thoại thật.

Repository hiện không khai báo một phiên bản Node.js bắt buộc cụ thể. Nên dùng phiên bản Node.js còn được hỗ trợ và tương thích với Vite/Expo đang được khóa trong từng `package.json`.

## Chạy Customer Web

```powershell
cd C:\cnpm\multilingual-ai-narration\frontend-web
npm install
npm run dev
```

Vite sẽ in URL phát triển, thông thường là `http://localhost:5173`.

Các lệnh hiện có:

```powershell
npm run lint
npm run typecheck
npm run build
npm run preview
```

Sau khi build, dùng `npm run preview`; không cần cài hoặc gọi `vite` global.

## Chạy Admin Web

```powershell
cd C:\cnpm\multilingual-ai-narration\admin-web
npm install
npm run dev
```

Admin Web dùng `http://localhost:5174` với strict port.

Các lệnh hiện có:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

Các route chính:

```text
/login
/dashboard
/users
/users/:userId
/projects
/projects/:projectId
/jobs
/jobs/:jobId
/languages
/voices
/logs
/settings
```

Admin login hiện là preview public có validation mô phỏng; chưa tạo session, JWT hoặc quyền ADMIN thật.

## Chạy Customer Mobile

```powershell
cd C:\cnpm\multilingual-ai-narration\frontend-mobile
npm install
npx expo start
```

Expo development server sẽ hiển thị QR code. Trên điện thoại Android có Expo Go tương thích SDK 57, kết nối điện thoại và máy tính cùng mạng LAN rồi quét QR để mở ứng dụng.

Nếu thiết bị không kết nối được qua LAN:

```powershell
npx expo start --tunnel
```

Tunnel cần Internet và có thể yêu cầu `@expo/ngrok`. Expo Go từ iOS App Store có thể không hỗ trợ SDK 57; khi đó cần Expo Go tương thích hoặc development build phù hợp.

Các scripts Mobile hiện có:

```powershell
npm start
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
```

Entry point hiện tại là `expo-router/entry`. Khi backend được triển khai, điện thoại thật không thể dùng `localhost` của máy tính làm API host; cần địa chỉ LAN hoặc tunnel có thể truy cập.

## Chạy Backend

Backend dùng MongoDB Atlas và cần file environment cục bộ chứa URI hợp lệ:

```powershell
cd C:\cnpm\multilingual-ai-narration\backend
npm install
Copy-Item .env.example .env
npm run dev
```

Mặc định API dùng `http://localhost:8080/api`. Kiểm tra health tại `GET /api/health`; trường `database` phản ánh trạng thái Mongoose thật. Không commit `.env` và không đưa `MONGODB_URI` hoặc secret vào frontend.

Ngoài Atlas URI, `.env` phải có hai JWT secret khác nhau, thời hạn access/refresh và các biến `ADMIN_SEED_*` nếu chạy seed. Dùng placeholder trong `.env.example`; không commit giá trị thật.

Các lệnh kiểm tra:

```powershell
npm run lint
npm run typecheck
npm run build
npm test
npm run seed:admin
npm start
```

Auth, Project CRUD và source Media upload routes đã có. File development nằm trong ignored `backend/uploads/`; `MAX_UPLOAD_SIZE_MB` cấu hình giới hạn. STT, AI provider, FFmpeg, queue/worker và frontend integration chưa có.

## Cổng phát triển

| Dịch vụ | Địa chỉ | Trạng thái |
| --- | --- | --- |
| Customer Web | `http://localhost:5173` | Hiện có |
| Admin Web | `http://localhost:5174` | Hiện có |
| Backend API | `http://localhost:8080/api` | Foundation hiện có; chỉ listen sau khi kết nối MongoDB |
| MongoDB Atlas | Database `multilingual_ai_narration` | Đã xác nhận kết nối runtime |

## Kiểm tra và build

Mỗi ứng dụng có dependencies và scripts riêng; chạy lệnh trong đúng thư mục ứng dụng.

Customer Web:

```powershell
cd frontend-web
npm run lint
npm run typecheck
npm run build
```

Admin Web:

```powershell
cd admin-web
npm run lint
npm run typecheck
npm test
npm run build
```

Customer Mobile:

```powershell
cd frontend-mobile
npm run lint
npm run typecheck
```

Admin browser regression script `node scripts/verify-browser.mjs` cần Admin Vite server tại `127.0.0.1:5174` và một Chrome instance riêng bật remote debugging tại `127.0.0.1:9223`; đây là script hỗ trợ phát triển, không phải lệnh bắt buộc để chạy ứng dụng.

## Backend hiện tại và API tương lai

Foundation, auth và Customer Project/Media endpoints đã có. Các contract STT/Translation/TTS/processing trong [docs/API.md](docs/API.md) vẫn **PROPOSED / NOT IMPLEMENTED**.

- S17: Backend Foundation với Node.js, Express, TypeScript, MongoDB và Mongoose — đã hoàn thành trong code.
- S18: Authentication, JWT và backend-enforced RBAC — đã hoàn thành trong backend; frontend chưa tích hợp.
- S19: Project + Media API — đã hoàn thành trong backend; frontend chưa tích hợp.
- S20 trở đi: STT, Translation, TTS và FFmpeg.

Secret như `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MONGODB_URI`, API keys và provider credentials phải nằm ở backend environment/secret management; không đưa vào frontend hoặc Admin Settings.

## Tài liệu

- [Bối cảnh và trạng thái hệ thống](docs/CONTEXT.md)
- [Tiến độ hiện tại](docs/PROGRESS.md)
- [Đặc tả UI](docs/UI.md)
- [API đề xuất](docs/API.md)
- [Kiến trúc và roadmap](docs/ARCHITECTURE.md)

Các tài liệu trên là nguồn chi tiết. `docs/PROGRESS.md` phản ánh sprint thực tế; `docs/ARCHITECTURE.md` mô tả kiến trúc mục tiêu và phải được đọc cùng cảnh báo về những phần chưa triển khai.
