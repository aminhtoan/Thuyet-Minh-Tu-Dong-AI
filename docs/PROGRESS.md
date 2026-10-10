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

## S24.5 — Full Integration Validation

- Backend regression thực thi lại: 118/118 PASS; lint, typecheck và build PASS. Runtime MongoDB Atlas PASS; `GET /api/health` trả HTTP 200 với `database: connected`; API root HTTP 200 và unknown route HTTP 404.
- Backend tests xác nhận refresh rotation/reuse rejection, blocked users, CUSTOMER/ADMIN RBAC, project ownership/IDOR, protected narration/result delivery, safe DTO/errors và toàn bộ mock-provider pipeline. Không gọi paid AI.
- Customer Web lint/typecheck/build PASS (105 modules). Authenticated Chrome smoke PASS bằng Customer disposable: register/login/logout, refresh rotation, 11-project pagination/search reset, CRUD, WAV upload, retrieval/empty states và cleanup project test.
- Actual protected artifact playback/download trên browser: **NOT RUN** vì disposable Customer không có artifact và validation không được gọi paid AI. Backend protected binary/range regression PASS.
- Customer Mobile lint/typecheck PASS, Expo Doctor 21/21 PASS, Android Hermes export PASS (1.377 modules). Device smoke và protected playback: **NOT RUN** vì không có ADB/device. `frontend-mobile/.env` hiện có API URL không dùng localhost và có hậu tố `/api`; giá trị cụ thể không được ghi vào tài liệu.
- Admin Web test 1/1, lint/typecheck/build PASS (85 modules); API mapping được test bằng mocked HTTP. Authenticated Admin browser smoke: **NOT RUN** vì không có disposable ADMIN credential an toàn; script browser S13 cũ phụ thuộc mock/credential demo nên không được dùng.
- FFmpeg real synthetic composition giữ kết quả S23.5 PASS; S24.5 không gọi lại paid provider. Mobile `npm audit`: 30 findings (11 moderate, 18 high, 1 critical), chủ yếu transitive Expo/Metro toolchain; không chạy `npm audit fix --force` vì đề xuất downgrade/major version không tương thích SDK 57.
- Secret/git safety: backend `.env` được ignore, không có `.env` tracked, credential-pattern scan 0 hit, `git diff --check` PASS.
- Defect sửa trong S24.5: loại bỏ chú thích runtime “Mock revision guard” còn sót ở Customer Web; không thay đổi contract hoặc UI.
- S24 status: **PARTIAL**. Còn thiếu Mobile physical-device smoke, Admin authenticated browser smoke và actual protected artifact playback/download.

## S24.3.1 — Mobile Render Loop Fix

- Nguyên nhân gốc nằm trong `AuthBoundary`: khi cần chuyển hướng, effect vừa gọi `router.replace(...)` vừa đánh dấu pathname nguồn là đã kiểm tra. Vì vậy route nguồn có thể render trước khi navigation commit; tại route `/`, `<Redirect href="/dashboard">` cạnh tranh với chuyển hướng chưa đăng nhập sang `/login`, tạo chuỗi cập nhật navigation lồng nhau trên React Fabric.
- Guard hiện giữ màn hình chờ trong suốt redirect, không đánh dấu route nguồn là hợp lệ và chỉ render children sau khi pathname đích đã được xác thực. SecureStore, refresh-token rotation, Customer API integration và cấu trúc Expo Router được giữ nguyên.
- Validation (2026-10-09): Mobile lint PASS, typecheck PASS, Expo Doctor 21/21 PASS, Android Hermes export PASS (1.377 modules), `npx expo start --clear` PASS và QR Expo Go được hiển thị.
- Physical-device navigation/auth smoke: **NOT RUN** vì môi trường không có ADB hoặc thiết bị/emulator kết nối. Không có test runner Mobile phù hợp để thêm automated render/navigation regression test mà không mở rộng kiến trúc kiểm thử.
- S24.3.1 status: **PARTIAL** cho đến khi xác nhận trên Expo Go Android thật rằng khởi động, login/logout và protected navigation không còn `Maximum update depth exceeded`.

## S24.3.2 — Mobile Register Fix

- Nguyên nhân runtime chính: `frontend-mobile/.env` vẫn dùng địa chỉ LAN mẫu, không trùng IPv4 hiện tại của máy phát triển, nên Expo Go không thể gửi request đăng ký tới backend. Cấu hình local đã được đổi sang địa chỉ LAN hiện tại, giữ đúng cổng `8080` và hậu tố `/api`; giá trị cụ thể không được commit hoặc ghi vào tài liệu.
- Mobile validation trước đây chỉ kiểm tra độ dài mật khẩu, trong khi backend còn yêu cầu chữ hoa, chữ thường và chữ số. Validation Mobile hiện khớp giới hạn backend; form cũng phân loại rõ lỗi network, `EMAIL_ALREADY_EXISTS`, `VALIDATION_ERROR` và lỗi 5xx bằng thông báo tiếng Việt.
- Kiểm tra thật qua cùng LAN base URL: `GET /api/health` HTTP 200; payload đăng ký cố ý không hợp lệ tới được backend và trả HTTP 400, code `VALIDATION_ERROR`. Không tạo tài khoản Atlas chỉ để validation.
- Validation (2026-10-09): Mobile lint PASS, typecheck PASS, Expo Doctor 21/21 PASS, Android Hermes export PASS (1.377 modules); backend regression 118/118 PASS.
- Device register smoke: **NOT RUN** vì môi trường không có ADB/device. S24.3.2 status: **PARTIAL** cho đến khi đăng ký thành công được xác nhận trực tiếp trên Expo Go Android.

## S24.3.3 — Persistent Mobile Navigation Loop Fix

- Nguyên nhân gốc của vòng lặp còn lại: `AuthBoundary` cũ vừa tháo `<Stack>` khỏi cây render khi phiên chưa được kiểm tra, vừa gọi `router.replace()` dựa trên pathname. Navigator vì thế bị điều hướng trước khi/đúng lúc root navigator mount lại; đồng thời `app/index.tsx` có `<Redirect href="/dashboard">`, tạo hai nguồn cập nhật Expo Router store. Stack runtime trên thiết bị (`useSyncState`/`ContextNavigator`) phù hợp với xung đột này.
- Kiến trúc mới luôn mount root `<Stack>`. SecureStore được khởi tạo một lần thành state machine `loading | unauthenticated | authenticated`; ba `Stack.Protected` loại trừ nhau lần lượt mở initialization route, login/register hoặc tabs/projects. Không còn `Redirect`, `usePathname` hay auth `router.replace()` trong boundary/login.
- Luồng: initialization chỉ hiển thị spinner; chưa đăng nhập và logout mở auth routes; login/session restore mở app routes; refresh thành công giữ authenticated, refresh thất bại xóa SecureStore và mở login; đăng ký thành công vẫn điều hướng bình thường về login khi đang unauthenticated.
- Regression test Node mới: 4/4 PASS, xác nhận mỗi auth state chỉ mở đúng một route group và bao phủ loading, unauthenticated/logout, authenticated. Không thêm dependency test.
- Validation (2026-10-09): lint PASS, typecheck PASS, Expo Doctor 21/21 PASS, Android Hermes export PASS (1.378 modules), Metro Android development bundle HTTP 200/PASS (1.361 modules), QR workflow PASS.
- Device runtime: **NOT RUN** vì môi trường không có ADB/device. S24.3.3 status: **PARTIAL**; source/bundle validation không được xem là bằng chứng Android runtime đã hết lỗi.

## S24.3.4 — Mobile Route Registration and Logout UI

- Android device report trước thay đổi xác nhận startup, register, login, Dashboard, Projects và session restoration PASS; logout chưa test vì chưa có UI.
- Warning `[Layout children]: No route named "projects"` xuất hiện vì root Stack khai báo một child `projects` không tồn tại: không có `projects/_layout.tsx`, còn Expo Router nhận từng file `projects/new` và `projects/[projectId]/*` là direct route names. Protected group hiện khai báo đúng toàn bộ route thực tế; project deep links/screens được giữ nguyên.
- Thêm tab `Tài khoản`, lấy tên/email thật từ `GET /api/auth/me`, hiển thị xác nhận trước khi đăng xuất và gọi auth logout hiện có. Backend refresh session được thu hồi khi reachable; local SecureStore luôn được xóa trong `finally`; không gọi `router.replace` khi logout.
- Session store dùng revision và serialized SecureStore mutations. Logout hoặc session mới vô hiệu hóa refresh request cũ, ngăn token rotation đang bay ghi lại phiên sau khi đã logout.
- Regression tests: 6/6 PASS, gồm auth route state machine, logout invalidates in-flight refresh và login mới thắng thao tác logout cũ. Lint/typecheck PASS; Expo Doctor 21/21 PASS; Android Hermes export PASS (1.381 modules); Metro Android bundle HTTP 200/PASS (1.361 modules) và không còn missing-route warning trong output đã kiểm tra.
- Android Expo Go physical-device smoke do người dùng xác nhận: **PASS 8/8** — startup, không còn missing-route warning, Account tab, thông tin tài khoản thật, xác nhận logout, logout về Login, relaunch vẫn logged out, login lại và Dashboard/Projects hoạt động.
- S24.3.4 status: **COMPLETED**. S24.3 tổng thể vẫn PARTIAL cho đến khi project upload và protected media workflow được xác nhận trên thiết bị.

## S24.3.5 — Mobile Project and Protected Media Smoke Preparation

- Android picker hiện dùng `copyToCacheDirectory: true`, giúp multipart upload nhận URI cache ổn định thay vì phụ thuộc quyền đọc `content://` của provider sau khi picker đóng.
- MIME upload được chuẩn hóa từ extension đã validation sang đúng tập backend chấp nhận (`video/mp4`, `video/quicktime`, `video/webm`, `audio/mpeg`, `audio/wav`, `audio/mp4`). Trường hợp picker trả `application/octet-stream` hoặc MIME Android khác không còn làm file MP3/M4A/MOV hợp lệ bị backend từ chối 415.
- Protected result download vẫn gửi Bearer header và lưu vào Expo cache. Khi nhận 401, Mobile dùng refresh rotation single-flight rồi retry đúng một lần; lỗi HTTP/network xóa cache dở dang. Nếu rời Result khi download đang chạy, file hoàn tất muộn cũng được cleanup.
- AI workflow source review: STT, Translation và TTS có native confirmation cảnh báo paid service; validation không gọi các endpoint này. FFmpeg Mobile gọi backend `/process` chỉ cho video có narration READY; Audio dùng narration artifact trực tiếp. Backend contract hiện xử lý đồng bộ nên UI chờ response, không giả lập polling/progress server.
- Validation (2026-10-09): Mobile tests 8/8 PASS, lint/typecheck PASS, Expo Doctor 21/21 PASS, Android Hermes export PASS (1.382 modules), Metro Android development bundle HTTP 200/PASS (1.361 modules). Backend không sửa nên không chạy lại backend regression.
- Device checklist hiện **NOT RUN 10/10** trong môi trường thực thi: create project; Android upload; project detail; transcript/translation; voice; generation status; existing result; protected audio; protected video; share/download. Không gọi paid AI và không sửa dữ liệu Atlas.
- S24.3.5 status: **PARTIAL** cho đến khi người dùng xác nhận các bước Android liên quan. S24.3 vẫn **PARTIAL**.

## S24.3.6 — Android Multipart Upload Fix

- Android Expo Go thực tế báo `Unsupported FormDataPart implementation` khi upload MP4 1,1 MB. Nguyên nhân là client append một object React Native `{ uri, name, type }` rồi ép kiểu thành DOM `Blob`; React Native/Expo SDK 57 không chấp nhận object này như một `FormDataPart`, nên request dừng ở client trước Express/Multer.
- Upload Mobile hiện dùng `expo-file-system/legacy.createUploadTask` với `FileSystemUploadType.MULTIPART`: field giữ đúng `file`, MIME được canonicalize, filename được giữ bằng tên file cache, Bearer token nằm trong header và native layer tự tạo multipart boundary. Không dùng `Blob`, `File`, `FormData` hoặc JSON serialization cho binary upload.
- URI từ Document Picker được copy vào project-scoped `file://` cache trước upload. Chỉ thư mục cache tạm do lần upload tạo ra được cleanup; media development và project có sẵn không bị đụng tới.
- Nếu upload đầu tiên thất bại, client xóa đúng project vừa tạo. Nếu cleanup backend cũng thất bại, retry giữ ID đó và cập nhật/tải lại vào cùng project thay vì tạo bản ghi trùng. HTTP 401 refresh token rồi retry đúng một lần; 400/413/5xx, network và cancel giữ thông báo an toàn bằng tiếng Việt.
- Regression tests: **14/14 PASS**, gồm MP4 MIME, `file://`/`content://`, multipart field/header, không có FormData body/manual boundary, failure cleanup và retry không tạo duplicate. Lint PASS; typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS; Metro Android development bundle HTTP 200/PASS.
- Physical Android retest sau bản sửa: **NOT RUN** trong môi trường thực thi. S24.3.6 và S24.3.5 giữ **PARTIAL** cho đến khi người dùng xác nhận upload thật trên Expo Go.

## S24.3.7 — Android DocumentPicker Cache Fix

- Android device xác nhận native multipart của S24.3.6 đi tới bước chuẩn bị file nhưng thất bại tại `ExponentFileSystem.copyAsync`: URI nguồn đã là bản cache `file://.../cache/DocumentPicker/...` do `copyToCacheDirectory: true`, trong khi client lại copy cache này thêm lần nữa.
- File preparation hiện kiểm tra `getInfoAsync` và đọc thử đúng 1 byte trước upload. URI `file://` hợp lệ được đưa thẳng vào `createUploadTask`, không gọi `copyAsync`; chỉ URI không phải `file://` mới được copy sang project-scoped cache sau khi source đã qua kiểm tra đọc.
- Cache DocumentPicker trực tiếp được giữ khi upload lỗi để nút retry còn dùng được và chỉ cleanup sau upload thành công. URI stale/missing/unreadable trả đúng thông báo “Không thể đọc tệp đã chọn. Vui lòng chọn lại tệp.”; người dùng có thể chọn lại file. Project cleanup/chống duplicate của S24.3.6 được giữ nguyên.
- Regression tests: **20/20 PASS**; lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (1.387 modules); Metro Android development bundle HTTP 200/PASS (1.393 modules).
- Physical Android upload sau sửa: **NOT RUN** trong môi trường thực thi. S24.3.7, S24.3.6 và S24.3.5 tiếp tục **PARTIAL** cho đến khi upload MP4 thật thành công trên Expo Go.

## S24.3.8 — Android File Readability and Native Upload Fix

- Android MP4 31 MB vẫn dừng trước upload với thông báo unreadable. S24.3.7 đã thêm `readAsStringAsync(... Base64, position: 0, length: 1)` như một probe bắt buộc; probe này không phải điều kiện của `createUploadTask` và có thể bị Expo Go/FileSystem Android từ chối dù native uploader vẫn đọc được picker URI.
- Probe Base64 đã được loại bỏ hoàn toàn. Preparation chỉ dùng `getInfoAsync` để xác nhận URI tồn tại và không phải directory, sau đó cho native multipart thử upload trực tiếp. `copyAsync` vẫn không chạy cho picker `file://`; fallback copy chỉ dành cho URI không phải file.
- Development-only diagnostics ghi operation, URI scheme/cache classification, picker/detected size, MIME, `getInfoAsync` result, safe native error và HTTP response status. Log không chứa URI đầy đủ, filename, file content, token, header hoặc credential.
- Error UI phân biệt file missing, access denied, FileSystem incompatibility, network, HTTP response và cancellation. Bearer refresh-once, field `file`, MIME/filename, giới hạn 500 MB và project cleanup/chống duplicate được giữ nguyên.
- Regression tests: **21/21 PASS**, bao gồm unsupported read probe không còn chặn URI hợp lệ và native upload factory thực sự được invoke với multipart metadata. Lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (1.388 modules); Metro Android development bundle HTTP 200/PASS (1.393 modules).
- Physical Android upload sau S24.3.8: **NOT RUN** trong môi trường thực thi. Trạng thái tiếp tục **PARTIAL** cho đến khi người dùng xác nhận upload thật và cung cấp diagnostic operation nếu còn lỗi.

## S24.3.9 — Android Native Upload File Access Fix

- Log thiết bị xác nhận source MP4 tồn tại và đúng size nhưng được phân loại `outside-app-cache`; legacy `uploadTaskStartAsync` từ chối mở URI này trước khi có HTTP response. Vì vậy `getInfoAsync` thành công không đồng nghĩa legacy native uploader có quyền stream cùng đường dẫn trong Expo Go.
- Preparation hiện lấy `Paths.cache` của project làm ranh giới truy cập. Mọi source ngoài ranh giới này, kể cả `file://` của host DocumentPicker, được materialize đúng một lần bằng API SDK 57 hiện đại `File.copy()` vào `Paths.cache/mobile-uploads/<projectId>/<filename>`; không dùng lại legacy `copyAsync` đã thất bại trên thiết bị.
- Destination phải tồn tại, không phải directory và có size bằng source trước khi gọi `createUploadTask`. Native uploader vì thế chỉ nhận project-owned cache URI; original filename, MIME, field `file`, Bearer refresh-once và giới hạn 500 MB được giữ nguyên.
- Diagnostics development-only ghi source category, method `modern-file-copy`, materialization start/success/failure, destination existence/size và native upload start/response/failure; không ghi full URI, token hoặc nội dung file.
- Regression tests: **24/24 PASS**, gồm outside-app-cache materialization, failed materialization chỉ thử một lần, size mismatch, multipart invocation, retry và project cleanup. Lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (1.406 modules); Metro Android development bundle HTTP 200/PASS (1.393 modules).
- Physical Android upload sau S24.3.9: **NOT RUN** trong môi trường thực thi. Trạng thái vẫn **PARTIAL** cho đến khi người dùng xác nhận upload thật thành công.

## S24.3.10 — Android DocumentPicker Permission Fix

- Android device xác nhận cả legacy upload và modern `File.copy()` đều không thể đọc `file://` mà `copyToCacheDirectory: true` tạo dưới host Expo Go: metadata tồn tại nhưng copy báo thiếu `READ` permission. Đây là boundary của host cache, không phải yêu cầu Android storage permission của app.
- Picker Android hiện yêu cầu URI provider trực tiếp bằng `copyToCacheDirectory: false` và materialize ngay trong callback chọn file, khi grant của system picker còn fresh. Exact picker URI chỉ được truyền vào một lần `File.copy()`; React state chỉ nhận URI mới dưới `Paths.cache/picker-uploads/...` sau khi destination tồn tại và đúng size.
- Nếu fresh staging bị permission denied/stale, source không được lưu hoặc retry; UI yêu cầu chọn lại. Khi đổi/xóa file hoặc unmount, staged directory được cleanup. Upload failure giữ staged app-cache URI cho retry; project cleanup/chống duplicate không đổi.
- Không thêm `READ_MEDIA_VIDEO`, broad storage permission hay FormData/Blob workaround. Nếu Expo Go vẫn từ chối fresh provider grant trên thiết bị, bước tiếp theo là xác nhận bằng development build vì Expo Go host sở hữu sandbox/permission khác application binary.
- Regression tests: **29/29 PASS**; lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (1.408 modules). Physical Android upload sau S24.3.10: **NOT RUN**, nên trạng thái **PARTIAL**.

## S24.3.11.1 — Mobile Project UI Polish

- Danh sách dự án đã được tối ưu cho màn hình Android hẹp: tiêu đề/card xuống dòng có kiểm soát, tên dự án hiển thị tối đa hai dòng và metadata không ép badge trạng thái ra ngoài màn hình.
- Bộ lọc trạng thái giữ dạng cuộn ngang, có padding hai đầu và vùng chạm tối thiểu 44 px. Phân trang tách thông tin trang khỏi hai nút điều hướng cân bằng, tránh wrap xen kẽ.
- Màn Chi tiết dự án căn nút quay lại độc lập với tiêu đề, cho tên/trạng thái xuống dòng, phân bố lựa chọn ngôn ngữ theo chiều rộng và xếp thao tác chính theo chiều dọc.
- Màn Bản ghi dùng nhãn trạng thái tiếng Việt chuẩn (`NOT_STARTED` → `Chưa bắt đầu`), xử lý header/status responsive, phân biệt loại phương tiện chưa xác định và chỉ hiện hành động tạo bản ghi khi có media nguồn.
- Touch target nút cỡ nhỏ được nâng lên tối thiểu 44 px. Navigation, backend contract và luồng Android upload S24.3.10 không thay đổi.
- Validation (2026-10-10): Mobile tests **29/29 PASS**; lint PASS; typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (1.408 modules). Không gọi paid AI API.
- Physical Android UI verification: **NOT RUN**, chờ người dùng xác nhận trên thiết bị. S24.3.11.1 giữ trạng thái **PARTIAL** đến khi có xác nhận runtime UI.
