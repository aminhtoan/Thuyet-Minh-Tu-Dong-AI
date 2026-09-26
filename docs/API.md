# API Status and Conventions

## Current: No Backend API

**There is no implemented HTTP API in this repository.** S1–S5 Customer Web/Mobile use local mock auth, a static mock project repository, and a cancellable mock upload service. S7 adds a local mock transcript service, S8 a local mock translation service, S9 mock voice/narration configuration services, and S10 a mock processing session; generation, retrieval and save use in-memory sample data only. S5 sends no media to a server and persists no new project. No JWT, RBAC middleware, Admin API, MongoDB connection, STT provider or AI endpoint exists. The paths below are **proposed**, subject to backend-sprint refinement.

## Proposed Stack and Base

The future backend is Node.js + Express.js + TypeScript, with MongoDB + Mongoose. REST base: `/api`; planned local backend URL: `http://localhost:8080/api`. Customer Web uses `VITE_API_BASE_URL`; future Admin Web uses the same variable name in its own environment. Mobile already reads `EXPO_PUBLIC_API_BASE_URL`. These public client variables must never contain secrets.

The backend owns authentication (JWT), RBAC and resource ownership checks. `CUSTOMER` may access only their own projects; `ADMIN` may access Admin management routes. A frontend-hidden control provides no security. On a physical phone, `localhost:8080` is the phone, not the development PC; configure a reachable PC LAN address or appropriate tunnel after the backend exists.

## Proposed Customer Resources

| Path family | Intended operations |
| --- | --- |
| `/api/auth/**` | Register, login, logout; optional refresh-token flow when designed. |
| `/api/users/me` | Retrieve/update the authenticated Customer profile; later change-password flow. |
| `/api/projects/**` | Create, list, get, update and delete own projects; search/filter via validated query parameters. |
| `/api/projects/:id/media` | Upload/list source media; backend checks owner, file type and size. |
| `/api/projects/:id/transcript` | Retrieve/update transcript and timed segments; generation is a proposed sub-action. |
| `/api/projects/:id/translations` | Request/list/edit translations by target language. |
| `/api/projects/:id/narrations` | Request/list narration output using selected voice and speed. |
| `/api/projects/:id/jobs` | Retrieve processing-job progress, failure and retry where supported. |
| `/api/projects/:id/results` | Retrieve preview/download references for completed outputs. |

Illustrative routes, **not implemented or finalized**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/users/me`, `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`, `POST /api/projects/:id/media`. Earlier drafts used `POST /projects/:id/upload`; the canonical proposed resource family is now `/api/projects/:id/media`. Request/response schemas and upload transport will be decided during S19/S24.

### Transcript boundary (S7)

**CURRENT:** Web/Mobile call a mock `getTranscript(projectId)`, `generateTranscript(projectId)` and `saveTranscript(projectId, draft)` service. It accepts route IDs, simulates latency, validates non-empty segments, derives `fullText` from segments and keeps saved drafts in module memory only. Generation does **not** analyze uploaded media, and no endpoint is called.

**PROPOSED:** `POST /api/projects/:id/transcript/generate`, `GET /api/projects/:id/transcript`, `PUT /api/projects/:id/transcript`. A future response may include `id`, `projectId`, `languageCode`, `status`, `fullText` and segments with `id`, numeric `sequence`, `startTime`/`endTime` in seconds, and `text`. Backend contracts, ownership checks, processing jobs and transport are deferred to S20/S24.

### Translation boundary (S8)

**CURRENT:** `translationService.get(projectId, targetLanguage)`, `translate(projectId, transcript, targetLanguage)` and `save(projectId, translation)` use deterministic sample data and module memory. A valid saved S7 transcript is required. Each translation segment retains its source segment ID, sequence and numeric start/end seconds. Save validates text and source alignment. A development-only source fingerprint prevents loading/saving stale translations after transcript edits.

**PROPOSED:** `POST /api/projects/:id/translations` with `{ targetLanguage }`, `GET /api/projects/:id/translations`, `GET /api/projects/:id/translations/:targetLanguage`, and `PUT /api/projects/:id/translations/:targetLanguage`. Future responses include project/source/target language, status and aligned translated segments. Backend: **NOT_IMPLEMENTED**. Translation provider: **NOT_INTEGRATED**, planned S21.

### Voice and narration boundary (S9)

**CURRENT:** `voiceService.getVoices(languageCode)` and `getVoice(id)` return active mock identities. `previewVoice(id)` is a short abortable UI simulation with no audio. `translationService.getSavedTranslation(projectId, language?)` retrieves the selected saved translation (or latest valid saved translation for a direct link with no language). Navigation carries the chosen target language.

`narrationService.getConfig(projectId, language?)` and `saveConfig(projectId, config)` keep configuration in module memory, isolated by project and language. Configuration contains project/translation IDs, language, voice ID and speed; an internal source revision prevents stale saves. Language and active voice availability are validated. There is no `audioPath`, generated audio or provider request.

**PROPOSED:** `GET /api/voices?language=en`, `GET /api/voices/:voiceId`, `POST /api/projects/:id/narrations/preview`, `POST /api/projects/:id/narrations`, and `GET /api/projects/:id/narrations`. The backend will distinguish draft configuration, preview and actual generation contracts when implemented. Backend: **NOT_IMPLEMENTED**. Real TTS: **NOT_INTEGRATED**.

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

## Proposed Response Style

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

The backend will derive `userId` from the authenticated principal, reject unauthorized cross-user access, validate request bodies and media metadata/content, and enforce upload limits. Store binaries outside MongoDB; persist only metadata and storage references. S5's 500 MB validation is a client-side hint, **not** a server guarantee. Never log passwords, JWTs or AI provider secrets. `JWT_SECRET`, `MONGODB_URI`, and provider credentials belong in backend environment configuration, not frontend variables.

## Result and History boundary (S11)

**CURRENT:** `resultService.getByProjectId(projectId, language?)` returns a copied mock Result or null when not ready; unknown project rejects. `getHistory()` derives project summaries from the same repository plus completed session metadata. No duplicate history fixtures are maintained. `getDownloadInfo(projectId)` returns `{ available: false, reason }`, never a URL.

Result metadata: id, projectId, languageCode, mediaType, createdAt, availability `MOCK_PREVIEW`; optional saved transcriptCount, translationCount, voiceName and speed. Original source duration/size are labelled separately in UI. READY metadata is not a real file. History uses canonical Project status and carries hasResult; cancelled sessions return to TRANSLATED with no active progress, not a fabricated server cancellation status. Records live only in client memory.

**PROPOSED:** authenticated/ownership-checked `GET /api/projects/:id/results`, history via project listing, and backend-issued download references after real media generation. Exact real-file/download transport is deferred. Real result media and download: **NOT_AVAILABLE**. Backend: **NOT_IMPLEMENTED**.

## S12 Admin frontend boundary

Admin Web exists, but **all Admin APIs remain proposed and unimplemented**. Dashboard now reads through the S13 asynchronous mock service (src/services/adminDashboardService.ts); validateMockAdminLogin only validates and navigates. Preview routes are public; no HTTP client/call, session, JWT or RBAC. VITE_API_BASE_URL=http://localhost:8080/api is public preparation, never a secret.

Future contracts under /api/admin: GET dashboard/users/projects/jobs/languages/voices/logs/settings; GET user/project/job by ID; PATCH user status; POST/PATCH languages/voices; PATCH settings. Future backend must enforce ADMIN authorization. No Customer content-editing API is introduced.

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
