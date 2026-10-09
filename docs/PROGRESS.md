# Project Progress

## Current Sprint

S23 FFmpeg / Media Processing

## Status

COMPLETED — implementation, regression và real FFmpeg smoke test đã PASS

## Implemented

- MediaProcessor abstraction và FFmpeg/FFprobe implementation dùng `spawn`, argument array, `shell:false`, timeout cấu hình.
- API xử lý video, Result metadata/list/detail và protected MP4 streaming có HTTP Range.
- Narration thay thế audio gốc; H.264/AAC MP4, thời lượng theo source video, output được FFprobe kiểm tra.
- ProcessingJob VIDEO_PROCESSING, retry, idempotency, concurrency protection và project-scoped cleanup.
- S23 regression và real FFmpeg smoke test PASS với FFmpeg/FFprobe 9.0.2.

## S23.5 Real FFmpeg Validation

- FFmpeg `9.0.2-full_build-www.gyan.dev`: PASS.
- FFprobe `9.0.2-full_build-www.gyan.dev`: PASS.
- Fixture tổng hợp tạm: video màu 320×240 dài 2 giây và tone audio dài 1 giây; không dùng AI API hoặc media người dùng.
- `FfmpegMediaProcessor` composition: PASS; output MP4 có video stream, audio stream, duration dương và file size khác 0 theo FFprobe.
- Fixture/output tạm được xóa sau test; không xóa development media.
- Full regression: 101 passed, 0 failed, 0 skipped.
- Lint, typecheck, build: PASS.
- MongoDB Atlas và `GET /api/health`: PASS.
- Terminal process cũ chưa nhận WinGet PATH mới; development `.env` cục bộ đang trỏ tới binary đã cài và vẫn được Git ignore. Mở terminal/VS Code mới để `ffmpeg` và `ffprobe` hoạt động trực tiếp qua PATH.

- TTS provider abstraction và OpenAI `/v1/audio/speech` adapter, model cấu hình `gpt-4o-mini-tts`, MP3.
- API tạo/lấy narration và protected audio; dùng Translation hoàn tất và Voice catalog server-side.
- Audio nằm trong project-scoped filesystem; MongoDB chỉ lưu metadata/path tương đối.
- Hỗ trợ nhiều language/voice, idempotency, retry, active-job concurrency protection và cleanup khi xóa Project.
- S18–S22: 91 tests PASS; S22 dùng mock provider, không tiêu thụ OpenAI credit.

- Translation provider abstraction và OpenAI Responses API adapter với structured JSON output.
- API tạo/lấy bản dịch đồng bộ theo segment; lưu `Translation` và `TranslationSegment` theo source alignment.
- Hỗ trợ nhiều target language, idempotency, retry và khóa active job cùng target.
- S18–S21: 82 tests PASS; S21 tests dùng mock provider, không tiêu thụ OpenAI credit.

- STT abstraction và OpenAI `whisper-1` adapter; synchronous transcription/transcript endpoints.
- Transcript/ordered timestamp segments persistence và ProcessingJob lifecycle.
- Retry/failure handling, atomic duplicate protection và safe provider errors.
- S18–S20: 72 tests PASS; real OpenAI smoke NOT RUN vì thiếu API key.

- Customer Project CRUD với search, status filter, pagination và ownership enforcement.
- Multipart audio/video upload, MIME/size validation và server-generated filename.
- Một source Media mỗi Project; replacement/delete/project-delete cleanup metadata và file.
- Binary lưu dưới ignored `backend/uploads/`; MongoDB chỉ lưu metadata/path nội bộ.
- Client không thể gán `userId`, `status`, `progress`; Admin bị chặn khỏi Customer routes.

- `POST /api/auth/register`, `login`, `refresh`, `logout` và `GET /api/auth/me`.
- bcrypt password hashing; safe user serialization không trả `passwordHash`.
- Access/refresh JWT dùng secret và token type riêng.
- Persistent `AuthSession` chỉ lưu SHA-256 refresh-token hash; rotation, reuse rejection và logout revocation.
- Authentication middleware tải lại User và từ chối tài khoản `BLOCKED`; typed RBAC middleware cho `CUSTOMER`/`ADMIN`.
- Zod validation, Helmet, auth rate limiting và error codes thống nhất.
- `npm run seed:admin` idempotent, không hard-code credential và không nâng quyền Customer.
- ActivityLog best-effort cho register/login/logout, không log password/token.

## Architecture / Boundaries

- `users` dùng chung cho Customer/Admin; không có collection actor riêng.
- `authsessions` cung cấp server-side refresh revocation; raw refresh token không được lưu.
- Project ownership, CRUD, upload, AI provider, queue/worker và FFmpeg vẫn ngoài S18.
- Ba frontend vẫn dùng mock/service hiện tại và chưa được nối với backend.

## S19 Validation

- S18 + S19 regression: PASS — 63 tests, 0 failed.
- Atlas data và filesystem fixtures được cleanup đúng phạm vi.
- Lint, typecheck, build: PASS.
- Frontend không thay đổi.

## Validation

- `npm test`: PASS — 35 tests (parent + 34 cases), dữ liệu Atlas được cô lập và cleanup theo ID/email test.
- `npm run lint`, `npm run typecheck`, `npm run build`: PASS.
- MongoDB Atlas/Auth runtime: PASS trong test process với DNS workaround của môi trường.
- Frontend không thay đổi trong S18.

## Important Files

- `backend/src/controllers/auth.controller.ts`, `services/auth.service.ts`
- `backend/src/routes/auth.routes.ts`, `validators/auth.validator.ts`
- `backend/src/middleware/authenticate.middleware.ts`, `authorize.middleware.ts`
- `backend/src/models/AuthSession.ts`, `utils/jwt.ts`, `utils/password.ts`
- `backend/src/scripts/seed-admin.ts`, `backend/tests/auth.test.ts`

## Known Limitations

- Local `.env` cần bổ sung các biến JWT khác nhau và `ADMIN_SEED_*` trước khi chạy/seed; credential không được commit.
- Chưa có Project/Media CRUD, upload hoặc frontend auth integration.
- Chưa tích hợp TTS, FFmpeg, queue hay worker; frontend chưa gọi backend thật.

## Next

S24 Full Frontend / Backend Integration.

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

## S24 — Frontend / Backend Integration (PARTIAL)

- Customer Web: real register/login/logout/me session client, refresh-token rotation with single-flight retry, protected routes, and real project creation + multipart media upload.
- Customer Mobile: same real authentication flow, refresh token stored with `expo-secure-store`, protected navigation, and real project creation + media upload. Physical devices must set `EXPO_PUBLIC_API_BASE_URL` to a reachable LAN address.
- Admin Web: real ADMIN login/me/logout client and ADMIN route guard. Management screens remain explicitly mock because the backend has no admin business APIs.
- Still not integrated: real project list/detail/edit/delete UI, transcript/translation/narration/processing/result screens, protected binary playback/download, Customer voice catalog, and Admin dashboard/users/projects/jobs/languages/voices/logs/settings.
- S24.1 resolved the Customer voice-catalog and Admin monitoring API blockers. Editor save/update endpoints remain absent; no endpoint was invented and no paid AI request was made.
- Validation (2026-10-08): backend 101/101 tests PASS; backend lint/typecheck/build PASS; health PASS with Atlas `database: connected`; Customer Web lint/typecheck/build PASS; Admin Web lint/typecheck/build and 1/1 test PASS; Mobile lint/typecheck PASS; Expo Doctor 21/21 PASS.
- S24 status: **PARTIAL**. Next work must close the API gaps and replace the remaining mock services before S24 can be marked complete.

## S24.1 — Missing Backend APIs

- Customer active Voice Catalog: implemented with CUSTOMER JWT and safe DTOs.
- Admin dashboard, users/status, projects, jobs, languages, voices, logs and read-only settings: implemented with ADMIN JWT/RBAC.
- No database redesign, fake production rows, destructive Project/Job Admin mutations or paid AI calls.
- New S24.1 suite: 17 tests PASS (16 behavioral subtests plus parent), including auth/RBAC, blocked accounts, empty catalog, pagination/filter/search, safe DTOs, status validation, refresh revocation, no privilege escalation and no destructive mutation.
- Full regression: 118 passed, 0 failed, 0 skipped (baseline 101 + 17 S24.1 tests).
- `npm run lint`, `npm run typecheck`, `npm run build`: PASS.
- MongoDB Atlas runtime and `GET /api/health` with `database: connected`: PASS on 2026-10-09.
- S24.1 status: **COMPLETED**. Next: S24.2 Customer Web Integration.

## S24.2 — Customer Web Full API Integration

- Customer Web dùng API thật cho register/login/me/logout, refresh-token rotation, danh sách/chi tiết/cập nhật/xóa project, tạo project và multipart media upload.
- Workflow Customer dùng backend thật: STT, Translation, Voice Catalog, TTS, FFmpeg processing, Result/History, phát và tải artifact có JWT qua Blob URL.
- Các thao tác có thể gọi AI tính phí (STT, Translation, TTS) đều yêu cầu xác nhận người dùng. Validation không tự gọi paid provider.
- Backend chưa có endpoint sửa transcript/translation; UI hiển thị dữ liệu persisted ở chế độ chỉ đọc thay vì giả lập lưu thành công.
- Validation (2026-10-09): Customer Web typecheck/lint/build PASS (105 modules; package không có test script). Backend regression 118/118 PASS; backend lint/typecheck/build PASS. Manual authenticated browser smoke chưa chạy vì không có test credential được cung cấp; không gọi paid AI.
- S24.2 status: **PARTIAL** cho đến khi hoàn tất browser smoke có tài khoản test và pagination UI phía Customer Projects. Next: S24.3 Admin Web Integration.

## S24.2.1 — Customer Web Final Validation

- Customer Projects dùng server-side `page`, `limit=10`, `search` và exact canonical `status`; Previous/Next hiển thị tổng số/trang từ response backend. Search/filter reset về trang 1 và state được giữ trong URL.
- Chrome/CDP browser smoke: PASS với Customer disposable đăng ký qua API UI; register/login/logout, refresh rotation tự động, 11 project qua 2 trang, search reset, create/detail/update/delete và WAV upload đều PASS. Các project test đã được xóa; không xóa development data và không gọi paid AI endpoint.
- Existing artifact retrieval: transcript thiếu trả controlled 404; translation/narration/result list và Voice Catalog (kể cả empty state) trả response thật. Transcript/Translation vẫn read-only.
- Protected binary: frontend Bearer fetch → Blob URL và backend protected narration/result/range tests PASS. Actual browser playback/download của artifact không chạy vì disposable account không có artifact và validation bị cấm gọi paid AI.
- Validation: Customer Web lint/typecheck/build PASS; browser smoke PASS; backend 118/118 tests, lint/typecheck/build PASS; Atlas health `database: connected`.
- S24.2.1 status: **COMPLETED**. Next: S24.3 Customer Mobile Integration.

## S24.3 — Customer Mobile Full API Integration

- Mobile dùng backend thật cho auth/refresh/logout, project server-side pagination/search/filter, project create/detail/update/delete và multipart media upload với field `file`.
- STT, Translation và TTS gọi endpoint thật sau xác nhận rõ thao tác có thể tính phí; validation không gọi paid AI. Transcript và Translation giữ read-only vì backend chưa có update API.
- Voice Catalog, processing, result/history dùng dữ liệu backend. Protected audio/video được tải bằng Bearer JWT vào Expo cache; không đưa token vào URL; playback dùng `expo-audio`/`expo-video`, tải/chia sẻ dùng `expo-sharing`.
- Đã xóa các runtime mock repository/service/fixture Customer Mobile. Giữ Expo managed workflow và Expo Go compatibility.
- Validation (2026-10-09): lint PASS (0 lỗi, 0 cảnh báo), typecheck PASS, Expo Doctor 21/21 PASS, Android Expo export PASS (1,377 modules), Metro/Expo Go QR LAN PASS.
- Physical-device authenticated smoke, actual upload/playback/download: **NOT RUN** vì môi trường không có thiết bị Android/iOS kết nối. Không gọi paid AI và không tạo/xóa dữ liệu Atlas.
- S24.3 status: **PARTIAL** chỉ vì chưa chạy physical-device smoke. Next: S24.4 Admin Web Integration.

## S24.4 — Admin Web Full API Integration

- Admin auth tiếp tục dùng JWT thật, refresh rotation single-flight, role guard và backend ADMIN RBAC.
- Dashboard, Users/detail/status, Projects/detail, Jobs/detail, Languages, Voices, Activity Logs và safe Settings đã dùng S24.1 Admin APIs thật.
- Users/Projects/Jobs/Logs truyền search/filter/sort/page/limit đến backend; Customer status mutation có confirmation và refresh dữ liệu.
- Projects hiển thị owner, media metadata, toàn bộ `targetLanguages[]` và related jobs; không tạo target language giả.
- Languages, Voices và Settings là read-only. Retry/Cancel Job không còn tạo thành công giả.
- Đã xóa toàn bộ production runtime mock/fixture/store/scenario khỏi `admin-web/src`.
- Validation (2026-10-09): Admin lint PASS, typecheck PASS, build PASS (85 modules), test PASS 1/1. Backend không đổi nên không chạy lại 118-test regression.
- Authenticated browser smoke: **NOT RUN** vì không có disposable ADMIN credential được provision an toàn; không register/elevate Customer và không dùng credential cá nhân.
- S24.4 status: **PARTIAL** chỉ vì authenticated browser smoke chưa chạy. Next: S24.5 Full Integration Validation.
