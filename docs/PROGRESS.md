# Project Progress

## Current Sprint

S17 Backend Foundation

## Status

COMPLETED (backend foundation + MongoDB Atlas runtime validation)

## Implemented

- Backend độc lập tại `backend/` dùng Node.js, Express, TypeScript strict, MongoDB và Mongoose.
- Cấu hình môi trường tập trung, kết nối database trước khi listen và graceful shutdown cho `SIGINT`/`SIGTERM`.
- Express app có JSON/urlencoded limits, CORS allowlist, `/api`, `/api/health`, 404 và central error handler.
- Envelope API thống nhất cho success/error cùng `AppError` có HTTP status và mã lỗi an toàn.
- 13 Mongoose model: User, Project, Media, Transcript, TranscriptSegment, Translation, TranslationSegment, Language, Voice, Narration, ProcessingJob, Result và ActivityLog.
- Enum, quan hệ tham chiếu, timestamps, validation và index nền tảng đồng bộ với domain S6–S16.
- Chỉ lưu metadata/đường dẫn media; chưa lưu binary và chưa tạo business endpoint.

## Architecture / Boundaries

- Backend là package độc lập; không import từ Customer Web, Mobile hoặc Admin Web.
- MongoDB là system of record dự kiến; URI chỉ đọc từ environment và không được log.
- Authentication/JWT/RBAC, CRUD, upload, AI provider, queue/worker và FFmpeg vẫn nằm ngoài S17.
- Ba frontend vẫn dùng mock/service hiện tại và chưa được nối với backend.

## Validation

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- MongoDB Atlas connection: PASS với database `multilingual_ai_narration`.
- Runtime `GET /api`, `GET /api/health` và JSON 404: PASS.
- Frontend không thay đổi trong S17.

## Important Files

- `backend/src/app.ts`, `backend/src/server.ts`
- `backend/src/config/env.ts`, `backend/src/config/database.ts`
- `backend/src/routes/`, `backend/src/controllers/`, `backend/src/middleware/`
- `backend/src/models/`, `backend/src/constants/`
- `backend/package.json`, `backend/.env.example`

## Known Limitations

- Cần file `.env` chứa `MONGODB_URI` Atlas hợp lệ để chạy server thực tế; credential không được commit.
- Chưa có auth/JWT/RBAC, business CRUD, upload hoặc frontend integration.
- Chưa tích hợp STT, Translation, TTS, FFmpeg, queue hay worker.

## Next

S18 Authentication, JWT & RBAC.

## S16.5 — Full Vietnamese Localization

- Customer Web Vietnamese localization: PASS
- Admin Web Vietnamese localization: PASS
- Mobile Vietnamese localization: PASS
- Customer validation: PASS
- Admin validation: PASS
- Mobile validation: PASS
- Frontend Freeze: YES
- Đã thống nhất thuật ngữ TTS thành “Giọng đọc”; giữ nguyên enum, route, identifier và các giá trị kỹ thuật.
- Không bổ sung backend, API, cơ sở dữ liệu hoặc tích hợp AI thực.
