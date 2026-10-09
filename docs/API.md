# API Status and Conventions

## Current: S23 FFmpeg / Media Processing

Backend hiện triển khai:

- `GET /api` — metadata tối thiểu của API.
- `GET /api/health` — trạng thái service và trạng thái kết nối MongoDB lấy trực tiếp từ Mongoose. Server chỉ listen sau khi kết nối database thành công.
- `POST /api/auth/register` — Customer tự đăng ký.
- `POST /api/auth/login` — đăng nhập chung cho Customer và Admin.
- `POST /api/auth/refresh` — rotation access/refresh token.
- `POST /api/auth/logout` — revoke refresh session.
- `GET /api/auth/me` — thông tin user hiện tại, yêu cầu access token.
- Customer Project CRUD và source Media subresource dưới `/api/projects`.
- `POST /api/projects/:id/transcription` và `GET /api/projects/:id/transcript`.

## Transcription API (Implemented)

Hai route yêu cầu JWT, role `CUSTOMER` và ownership. POST xử lý đồng bộ: Media → ProcessingJob → STT provider → Transcript/segments. Allowed states: `UPLOADED`, `FAILED` và `TRANSCRIBED`. Lifecycle: `UPLOADED → TRANSCRIBING → TRANSCRIBED`; failure → `FAILED`; atomic state claim chặn request trùng.

GET trả full text cùng ordered timestamp segments. Lỗi chuẩn gồm `TRANSCRIPT_NOT_FOUND`, `MEDIA_NOT_FOUND`, `MEDIA_FILE_MISSING`, `INVALID_PROJECT_STATE`, `TRANSCRIPTION_ALREADY_RUNNING`, `STT_NOT_CONFIGURED`, `STT_FILE_TOO_LARGE`, `STT_TIMEOUT`, `STT_INVALID_RESPONSE`, `STT_PROVIDER_ERROR`. Client không cung cấp filesystem path.

Response sử dụng envelope chuẩn. Auth, Customer Project/Media, STT, Translation, TTS và media-processing backend đã có; Admin business API, queue/worker và frontend integration vẫn **NOT IMPLEMENTED**.

## Result / Media Processing API (Implemented)

`POST /api/projects/:id/process` nhận strict body `{ "narrationId": "..." }`; source video và narration path luôn được resolve phía server. Các route đọc gồm `GET /api/projects/:id/results`, `GET /api/projects/:id/results/:resultId`, và protected `GET /api/projects/:id/results/:resultId/file`. Tất cả yêu cầu JWT, role `CUSTOMER` và ownership; file route hỗ trợ byte Range hợp lệ (`206`) và trả `416` cho range sai.

Xử lý đồng bộ: `GENERATING_AUDIO|FAILED|COMPLETED → PROCESSING_VIDEO → COMPLETED`. Narration thay thế audio gốc; output MP4 H.264/AAC có thời lượng bằng video nguồn, audio ngắn được pad và audio dài bị trim. Request cùng Project/Narration đã hoàn tất trả idempotently; active duplicate trả `VIDEO_PROCESSING_ALREADY_RUNNING`. Lỗi được sanitize, gồm `FFMPEG_NOT_AVAILABLE`, `VIDEO_SOURCE_REQUIRED`, `MEDIA_FILE_MISSING`, `NARRATION_NOT_FOUND`, `NARRATION_FILE_MISSING`, `MEDIA_PROCESSING_TIMEOUT`, `MEDIA_PROCESSING_FAILED`, `MEDIA_PROCESSING_INVALID_OUTPUT`, `RESULT_NOT_FOUND`, `RESULT_FILE_MISSING`.

## Project and Media API (Implemented)

Tất cả route yêu cầu access JWT và role `CUSTOMER`; owner luôn lấy từ authenticated user. Project của user khác được che bằng `404 PROJECT_NOT_FOUND`.

| Method | Path | Input | Success |
| --- | --- | --- | --- |
| `POST` | `/api/projects` | JSON `{ name, description?, sourceLanguage }` | `201`, Project `DRAFT`, progress `0` |
| `GET` | `/api/projects` | Query `search?`, `status?`, `page=1`, `limit=10` (max 100) | `200`, projects + pagination |
| `GET` | `/api/projects/:id` | Valid ObjectId | `200`, safe Project |
| `PATCH` | `/api/projects/:id` | Allow-list `name`, `description`, `sourceLanguage` | `200`, updated Project |
| `DELETE` | `/api/projects/:id` | — | `200`; xóa source Media metadata/file nếu có |
| `POST` | `/api/projects/:id/media` | `multipart/form-data`, field `file` | `201`, safe Media metadata |
| `GET` | `/api/projects/:id/media` | — | `200`, current source Media |
| `DELETE` | `/api/projects/:id/media` | — | `200`; Project trở về `DRAFT`, progress `0` |

Media nhận MP4/WebM/QuickTime video và MPEG/WAV/MP4/M4A/WebM audio theo MIME allow-list. Giới hạn lấy từ `MAX_UPLOAD_SIZE_MB`. Mỗi Project có một source Media; upload mới thay thế file/metadata cũ. Filename lưu trữ do server tạo và API không trả `fileName`, `storagePath` hoặc absolute path.

Các lỗi chính: `400 VALIDATION_ERROR`, `400 FILE_REQUIRED`, `401 AUTH_REQUIRED`, `403 FORBIDDEN`, `404 PROJECT_NOT_FOUND`, `404 MEDIA_NOT_FOUND`, `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`.

## Implemented Foundation and Base

Backend hiện dùng Node.js + Express.js + TypeScript strict, với MongoDB + Mongoose. REST base: `/api`; local backend URL mặc định: `http://localhost:8080/api`. Customer Web dùng `VITE_API_BASE_URL`; Admin Web dùng cùng tên biến trong environment riêng; Mobile đọc `EXPO_PUBLIC_API_BASE_URL`. Các biến public này không được chứa secret.

S18 triển khai access JWT, refresh JWT có persistent hashed session, authentication middleware và typed RBAC middleware. Resource ownership cho Project/Media vẫn thuộc S19. Ẩn điều khiển frontend không tạo security boundary. Trên điện thoại thật, `localhost:8080` là chính điện thoại; khi tích hợp cần dùng địa chỉ LAN có thể truy cập hoặc tunnel phù hợp.

## Authentication API (Implemented)

| Method | Path | Body / auth | Success | Main errors |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | `{ fullName, email, password }`; role/status do server đặt | `201`, safe user + token pair | `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_EXISTS` |
| `POST` | `/api/auth/login` | `{ email, password }` | `200`, safe user + token pair | `400`, `401 INVALID_CREDENTIALS`, `403 ACCOUNT_BLOCKED` |
| `POST` | `/api/auth/refresh` | `{ refreshToken }` | `200`, rotated token pair | `400`, `401 INVALID_TOKEN`, `403 ACCOUNT_BLOCKED` |
| `POST` | `/api/auth/logout` | `{ refreshToken }` | `200`; idempotent revoke | `400 VALIDATION_ERROR` |
| `GET` | `/api/auth/me` | `Authorization: Bearer <accessToken>` | `200`, safe current user | `401 AUTH_REQUIRED/INVALID_TOKEN/TOKEN_EXPIRED`, `403 ACCOUNT_BLOCKED` |

Password yêu cầu 8–128 ký tự, có chữ hoa, chữ thường và chữ số. Email được trim/lowercase. Public registration luôn tạo `CUSTOMER / ACTIVE`; field `role` dư không thể tạo Admin. Sai email và sai password cùng trả generic `INVALID_CREDENTIALS`.

Access token và refresh token dùng secret khác nhau, có claim `type` riêng và không dùng thay thế cho nhau. Refresh session lưu SHA-256 token hash, `expiresAt` và `revokedAt`; token cũ bị vô hiệu sau rotation/logout. Access middleware luôn tải lại user và từ chối user `BLOCKED`. `passwordHash`, raw token và secret không được trả từ API hoặc ghi log.

## Proposed Customer Resources

| Path family | Intended operations |
| --- | --- |
| `/api/auth/**` | Implemented in S18: register, login, refresh, logout, current user. |
| `/api/users/me` | Retrieve/update the authenticated Customer profile; later change-password flow. |
| `/api/projects/**` | Implemented S19: CRUD own projects, search/filter/pagination. |
| `/api/projects/:id/media` | Implemented S19: one source media upload/get/delete/replace. |
| `/api/projects/:id/transcript` | Retrieve/update transcript and timed segments; generation is a proposed sub-action. |
| `/api/projects/:id/translations` | Request/list/edit translations by target language. |
| `/api/projects/:id/narrations` | Request/list narration output using selected voice and speed. |
| `/api/projects/:id/jobs` | Retrieve processing-job progress, failure and retry where supported. |
| `/api/projects/:id/results` | Retrieve preview/download references for completed outputs. |

Project/Media, Transcript, Translation và Narration/TTS routes đã được triển khai. Result và video processing thuộc sprint sau.

### Transcript boundary (S7)

**CURRENT:** Web/Mobile call a mock `getTranscript(projectId)`, `generateTranscript(projectId)` and `saveTranscript(projectId, draft)` service. It accepts route IDs, simulates latency, validates non-empty segments, derives `fullText` from segments and keeps saved drafts in module memory only. Generation does **not** analyze uploaded media, and no endpoint is called.

**PROPOSED:** `POST /api/projects/:id/transcript/generate`, `GET /api/projects/:id/transcript`, `PUT /api/projects/:id/transcript`. A future response may include `id`, `projectId`, `languageCode`, `status`, `fullText` and segments with `id`, numeric `sequence`, `startTime`/`endTime` in seconds, and `text`. Backend contracts, ownership checks, processing jobs and transport are deferred to S20/S24.

### Translation boundary (S8)

**CURRENT:** `translationService.get(projectId, targetLanguage)`, `translate(projectId, transcript, targetLanguage)` and `save(projectId, translation)` use deterministic sample data and module memory. A valid saved S7 transcript is required. Each translation segment retains its source segment ID, sequence and numeric start/end seconds. Save validates text and source alignment. A development-only source fingerprint prevents loading/saving stale translations after transcript edits.

**IMPLEMENTED:** `POST /api/projects/:id/translations` với `{ targetLanguage }`, `GET /api/projects/:id/translations` và `GET /api/projects/:id/translations/:targetLanguage`. Các route yêu cầu JWT, role `CUSTOMER` và ownership. POST xử lý đồng bộ bằng một structured provider request, lưu full text cùng translated segments liên kết source segment. Một Transcript hỗ trợ nhiều target language; target đã hoàn tất trả idempotently, active job cùng target trả `TRANSLATION_ALREADY_RUNNING`.

Lifecycle: `TRANSCRIBED|TRANSLATED|FAILED → TRANSLATING → TRANSLATED`; lỗi provider chuyển sang `FAILED` và có thể retry. Các lỗi chính gồm `TRANSCRIPT_NOT_FOUND`, `INVALID_PROJECT_STATE`, `SAME_SOURCE_TARGET_LANGUAGE`, `TRANSLATION_NOT_FOUND`, `TRANSLATION_NOT_CONFIGURED`, `TRANSLATION_TIMEOUT`, `TRANSLATION_INVALID_RESPONSE` và `TRANSLATION_PROVIDER_ERROR`.

### Voice and narration boundary (S9)

**CURRENT:** `voiceService.getVoices(languageCode)` and `getVoice(id)` return active mock identities. `previewVoice(id)` is a short abortable UI simulation with no audio. `translationService.getSavedTranslation(projectId, language?)` retrieves the selected saved translation (or latest valid saved translation for a direct link with no language). Navigation carries the chosen target language.

`narrationService.getConfig(projectId, language?)` and `saveConfig(projectId, config)` keep configuration in module memory, isolated by project and language. Configuration contains project/translation IDs, language, voice ID and speed; an internal source revision prevents stale saves. Language and active voice availability are validated. There is no `audioPath`, generated audio or provider request.

**IMPLEMENTED S22:** `POST /api/projects/:id/narrations` nhận `{ targetLanguage, voiceId? }`; `GET /api/projects/:id/narrations`; `GET /api/projects/:id/narrations/:narrationId`; và protected `GET /api/projects/:id/narrations/:narrationId/audio`. Tất cả yêu cầu JWT, role `CUSTOMER` và Project ownership. Xử lý đồng bộ; Voice được resolve server-side theo Language/provider, voice mặc định từ environment. Identity idempotent là Translation + Voice + speed; active job trùng trả `TTS_ALREADY_RUNNING`.

Lifecycle S22: `TRANSLATED|FAILED → GENERATING_AUDIO`; sau thành công Project vẫn ở `GENERATING_AUDIO` để S23 tiếp quản, không chuyển `COMPLETED`. Lỗi chính: `TRANSLATION_NOT_FOUND`, `TRANSLATION_EMPTY`, `VOICE_NOT_FOUND`, `VOICE_INACTIVE`, `VOICE_NOT_SUPPORTED`, `TTS_ALREADY_RUNNING`, `TTS_NOT_CONFIGURED`, `TTS_TEXT_TOO_LARGE`, `TTS_TIMEOUT`, `TTS_INVALID_RESPONSE`, `TTS_PROVIDER_ERROR`, `NARRATION_NOT_FOUND`, `NARRATION_AUDIO_NOT_FOUND`.

Future processing: saved Translation → voice/speed configuration → TTS service → narration audio / ProcessingJob → video processing. S9 stops at saved configuration.

### Generate and processing boundary (S10)

**CURRENT:** `generationService.getContext(projectId, language?)` resolves saved transcript, translation, voice and narration settings. `processingService.createSession(context, onUpdate)` returns `getStatus()`, `start(options?)`, `retry(options?)`, `cancel()` and `dispose()`. These are local operations with no HTTP or provider calls. A session owns its timer and abortable start validation, emits copied snapshots, prevents concurrent starts and resets both generation stages on retry. Cancellation/unmount stops the local simulation, not a server job.

Snapshots expose a local run ID, status, optional per-stage percentages, overall percentage, message and safe failure reason. Conceptual project status progresses TRANSLATED → GENERATING_AUDIO → PROCESSING_VIDEO → COMPLETED (FAILED on error), and S11 projects this into the session-only mock repository (not a backend update). Audio-only inputs label the final simulated stage Audio Processing.

**PROPOSED:** `POST /api/projects/:id/generate` with `{ translationId, voiceId, speed }`; `GET /api/projects/:id/status`; `GET /api/projects/:id/jobs`; `GET /api/projects/:id/jobs/:jobId`; `POST /api/projects/:id/jobs/:jobId/retry`; optional `POST /api/projects/:id/jobs/:jobId/cancel`. Backend jobs will resolve saved resources and enforce ownership.

Future flow: frontend generate request → backend ProcessingJob → TTS/narration audio → FFmpeg → Result. Progress transport remains undecided; no polling/SSE/WebSocket is implemented in S10. Backend: **NOT_IMPLEMENTED**. TTS/FFmpeg: **NOT_INTEGRATED**. Narration audio/final video: **NOT_GENERATED**.

## Proposed Admin Resources

Admin Web is a separate application; every route here requires backend `ADMIN` authorization.

| Path family | Intended operations |
| --- | --- |
| `/api/admin/dashboard` | Customer/project/job counts and recent activity. |
| `/api/admin/users/**` | Search/filter/detail and block/unblock Customer accounts. |
| `/api/admin/projects/**` | Search/filter/detail across projects. |
| `/api/admin/jobs/**` | List/filter/detail, especially failures. |
| `/api/admin/languages/**` | View and enable/disable languages. |
| `/api/admin/voices/**` | View/search/filter and enable/disable voices. |
| `/api/admin/logs/**` | View/filter safe activity logs. |
| `/api/admin/settings/**` | Business/application settings only; never server secrets. |

## Response Style (Implemented)

Success with body:

```json
{ "success": true, "data": {} }
```

Error:

```json
{ "success": false, "error": { "code": "SOME_ERROR_CODE", "message": "Human readable message" } }
```

`204 No Content` has no response body. Use 200 OK for retrieval/update, 201 Created for creation, 400 Bad Request for malformed input, 401 Unauthorized for missing/invalid authentication, 403 Forbidden for insufficient role/ownership, 404 Not Found for absent or intentionally concealed resources, 409 Conflict for state conflicts, 413 Payload Too Large for oversized media, 422 Unprocessable Entity for semantically invalid input when adopted, and 500 Internal Server Error for unexpected failures. Do not leak internal stack traces or credentials in errors.

## Status and Processing

Canonical Project statuses: `DRAFT`, `UPLOADED`, `TRANSCRIBING`, `TRANSCRIBED`, `TRANSLATING`, `TRANSLATED`, `GENERATING_AUDIO`, `PROCESSING_VIDEO`, `COMPLETED`, `FAILED`. A `ProcessingJob` has type `TRANSCRIPTION | TRANSLATION | TTS | VIDEO_PROCESSING` and status `QUEUED | PROCESSING | COMPLETED | FAILED | CANCELLED`. S5's local upload UI status is distinct and is not an API status. Realtime delivery (polling/SSE/WebSocket) remains a later design decision.

## Security and Upload Boundary

The backend will derive `userId` from the authenticated principal, reject unauthorized cross-user access, validate request bodies and media metadata/content, and enforce upload limits. S18 đã có identity/RBAC; ownership cho Project/Media bắt đầu ở S19. Store binaries outside MongoDB; persist only metadata and storage references. Never log passwords, JWTs or AI provider secrets. `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MONGODB_URI`, and provider credentials belong in backend environment configuration, not frontend variables.

## Result and History boundary (S11)

**CURRENT:** `resultService.getByProjectId(projectId, language?)` returns a copied mock Result or null when not ready; unknown project rejects. `getHistory()` derives project summaries from the same repository plus completed session metadata. No duplicate history fixtures are maintained. `getDownloadInfo(projectId)` returns `{ available: false, reason }`, never a URL.

Result metadata: id, projectId, languageCode, mediaType, createdAt, availability `MOCK_PREVIEW`; optional saved transcriptCount, translationCount, voiceName and speed. Original source duration/size are labelled separately in UI. READY metadata is not a real file. History uses canonical Project status and carries hasResult; cancelled sessions return to TRANSLATED with no active progress, not a fabricated server cancellation status. Records live only in client memory.

**PROPOSED:** authenticated/ownership-checked `GET /api/projects/:id/results`, history via project listing, and backend-issued download references after real media generation. Exact real-file/download transport is deferred. Real result media and download: **NOT_AVAILABLE**. Backend: **NOT_IMPLEMENTED**.

## S12 Admin frontend boundary

Admin Web screens still require S24.2/S24.3 client wiring, but the backend Admin APIs below are implemented in S24.1 and enforce ADMIN JWT/RBAC.

Implemented contracts under `/api/admin`: dashboard, paginated users/projects/jobs/logs, detail routes, Customer status update, read-only languages/voices and read-only safe settings. Language/Voice/settings writes and Project/Job mutations are intentionally not exposed because current backend does not safely support them.

## S24.1 Voice Catalog and Admin API

All responses use the standard success/error envelope. Query objects are strict; unknown or invalid values return `400 VALIDATION_ERROR`.

### Customer Voice Catalog

| Method | Route | Role | Description |
| --- | --- | --- | --- |
| GET | `/api/voices?language=<code>` | CUSTOMER | Active languages and active voices for the configured TTS provider. `language` is optional. |

Voice DTO exposes the database `id` accepted as `voiceId` by the narration API, language metadata, provider name, display fields and optional preview URL. It does not expose `providerVoiceId`, secrets or provider payloads. Empty catalog/filter returns empty arrays.

`npm run seed:voices` is an explicit idempotent development operation. It runs only for a validated OpenAI `TTS_DEFAULT_VOICE`, only when that provider has no Voice records, and only for existing active Language records. It does not call OpenAI or create languages.

### Admin API

Every route below requires an active `ADMIN` access JWT. Unauthenticated requests return `401`; CUSTOMER returns `403`; blocked users return `403 ACCOUNT_BLOCKED`.

| Method | Route | Query/body |
| --- | --- | --- |
| GET | `/api/admin/dashboard` | Real customer/project/job aggregates, recent projects/jobs/activity |
| GET | `/api/admin/users` | `page`, `limit`, `search`, `status`, `sort` |
| GET | `/api/admin/users/:id` | Customer profile and owned projects |
| PATCH | `/api/admin/users/:id/status` | `{ "status": "ACTIVE" | "BLOCKED" }` |
| GET | `/api/admin/projects` | `page`, `limit`, `search`, `status`, `language`, `mediaType` |
| GET | `/api/admin/projects/:id` | Project, owner, safe media metadata, target languages and jobs |
| GET | `/api/admin/jobs` | `page`, `limit`, `search`, `type`, `status` |
| GET | `/api/admin/jobs/:id` | Processing job with project/customer references |
| GET | `/api/admin/languages` | `search`, `isActive` |
| GET | `/api/admin/voices` | `language`, `languageId`, `provider`, `isActive` |
| GET | `/api/admin/logs` | `page`, `limit`, `search`, `role`, `entityType`, `action`, `days` |
| GET | `/api/admin/settings` | Read-only effective safe configuration |

Blocking a Customer revokes all refresh sessions. Status changes cannot alter roles or Admin accounts. No route exposes password/refresh hashes, JWT/provider/database credentials, storage paths, raw provider payloads, or destructive cross-project mutation. Settings report only safe effective limits/capability flags and return `editable: false`.

## S13 Admin Dashboard contract — PROPOSED / NOT IMPLEMENTED

Future endpoint: `GET /api/admin/dashboard`. Current `adminDashboardService.getDashboard({ signal? })` returns local copied fixtures asynchronously, with no HTTP request. Mock-only scenario/latency options support deterministic tests; they are not API query parameters.

Proposed envelope:

```json
{
  "success": true,
  "data": {
    "stats": { "totalCustomers": 128, "totalProjects": 246, "processing": 8, "failed": 3 },
    "recentProjects": [],
    "processingJobs": [],
    "recentActivities": [],
    "jobSummary": { "queued": 5, "processing": 8, "completedToday": 12, "failed": 3 },
    "generatedAt": "2026-09-26T06:00:00.000Z"
  }
}
```

- recentProjects: id/name, userId/customerName, sourceLanguage/targetLanguage, canonical ProjectStatus, optional known progress, updatedAt.
- processingJobs: id/projectId/projectName, canonical job type/status, optional progress/startedAt, updatedAt.
- recentActivities: id/userId/action/entityType/entityId/description/createdAt (ActivityLog-shaped).
- processing/failed headline statistics count jobs, matching jobSummary. Lists are recent subsets, not the source of aggregate totals.
- generatedAt is the snapshot reference for relative dates; current mock fixtures generate dates relative to each request. These are illustrative snapshots, not live measurements.
- All future access must be backend-authorized for ADMIN. No JWT/RBAC or infrastructure health API exists today.
## S14 Admin Customer APIs — PROPOSED / NOT IMPLEMENTED

Admin Web hiện dùng `adminCustomerService` trong bộ nhớ và không gọi mạng.

- `GET /api/admin/users?page=1&limit=10&search=&status=` — danh sách chỉ gồm `role=CUSTOMER`; trả `items` và `pagination { page, limit, total, totalPages }`.
- `GET /api/admin/users/:id` — chi tiết một khách hàng.
- `PATCH /api/admin/users/:id/status` — body `{ "status": "ACTIVE" | "BLOCKED" }`.

Các endpoint `/api/admin/**` sau này chỉ dành cho ADMIN đã xác thực; CUSTOMER phải nhận `403 Forbidden`. Việc thực thi khóa tài khoản thuộc backend authentication/session ở S18+, không thuộc React S14.

## S15 Admin Project/Job APIs — PROPOSED / NOT IMPLEMENTED

- `GET /api/admin/projects?page=1&limit=10&search=&status=&language=&mediaType=`
- `GET /api/admin/projects/:id`
- `GET /api/admin/projects/:id/jobs`
- `GET /api/admin/jobs?page=1&limit=10&search=&type=&status=`
- `GET /api/admin/jobs/:id`
- `POST /api/admin/jobs/:id/retry`
- `POST /api/admin/jobs/:id/cancel`

List responses dự kiến có `items` và `pagination { page, limit, total, totalPages }`. Future backend phải xác thực ADMIN và kiểm tra quyền retry/cancel.

## S16 Admin System APIs — PROPOSED / NOT IMPLEMENTED

- Languages: `GET/POST /api/admin/languages`, `GET/PATCH /api/admin/languages/:id`, `PATCH /api/admin/languages/:id/status`.
- Voices: `GET/POST /api/admin/voices`, `GET/PATCH /api/admin/voices/:id`, `PATCH /api/admin/voices/:id/status`; optional future `POST /api/admin/voices/:id/preview`.
- Logs: `GET /api/admin/logs`, `GET /api/admin/logs/:id` (read-only).
- Settings: `GET /api/admin/settings`, `PATCH /api/admin/settings`.

All are proposed and unimplemented. `/api/admin/**` requires authenticated ADMIN in the future. Provider credentials, JWT/MongoDB secrets and cloud credentials must never be returned to Admin frontend; they belong to backend environment/secret management.
