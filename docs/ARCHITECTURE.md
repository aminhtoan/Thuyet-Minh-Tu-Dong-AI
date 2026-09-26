# System Architecture

## Overview

The intended system is a multilingual narration platform with two business actors, two Customer clients, a separate Admin client, and one backend. **This document is the architecture source of truth, not a claim that planned applications or APIs already exist.** S1–S5 implemented Customer frontend UI and local mocks only; S6 aligns the future full-stack design.

## Actors

| Actor / role | Access |
| --- | --- |
| `CUSTOMER` | Register/login while unauthenticated; after authentication, manage only their own projects, media and generated artifacts. |
| `ADMIN` | Use the separate Admin Web and protected Admin APIs for management and monitoring. |

There is no separate `GUEST` business actor. An unauthenticated Customer can only register or log in. The only roles are `CUSTOMER` and `ADMIN`; `UserStatus` is `ACTIVE` or `BLOCKED`.

## Client Applications

| Application | Folder | Stack | State |
| --- | --- | --- | --- |
| Customer Web | `frontend-web/` | React, TypeScript, Vite | Implemented UI, mock services |
| Customer Mobile | `frontend-mobile/` | React Native, TypeScript, Expo SDK 57 | Implemented UI, mock services; matching Expo Go required |
| Admin Web | `admin-web/` | React, TypeScript, Vite | S12 foundation implemented; separate application, not `/admin` in Customer Web |

Both Customer clients and the future Admin Web will use the same backend API. Customer Web and Mobile do not need identical UI components. Do not add `admin-web/` or a shared package in S6.

## Technology Stack and Repository Structure

```text
multilingual-ai-narration/
├── frontend-web/      Customer Web (implemented)
├── frontend-mobile/   Customer Mobile (implemented)
├── admin-web/         Admin Web (S12 foundation implemented)
├── backend/           Node.js + Express.js + TypeScript (planned S17; absent today)
├── docs/
└── README.md
```

The planned database is MongoDB with Mongoose. FFmpeg is planned for media operations. AI providers are not yet selected. No backend, database connection, Admin app, media worker, or AI integration exists in S6.

## Authentication and Authorization

The backend will issue JWTs after registration/login and support logout and current-user retrieval; refresh tokens may be added when the implementation is designed. A Customer account gets role `CUSTOMER`; an Admin account gets `ADMIN`. Frontends must never store or expose `passwordHash`. Current S3 auth is only a delayed UI mock with no JWT, persistent session, or server-side identity.

Authorization uses backend-enforced RBAC **and** resource ownership. Admin APIs require `ADMIN`; a `CUSTOMER` request to an Admin endpoint returns 403. Project/media queries must derive ownership from the authenticated user, not trust a client-supplied `userId`; Customer A cannot access Customer B's project. Blocking a user is enforced server-side. Hiding frontend navigation is not a security boundary.

## Domain Model

Conceptual entities and important fields (not Mongoose schemas yet):

| Entity | Fields / purpose |
| --- | --- |
| `User` | `id`, `fullName`, `email`, `passwordHash` (backend only), `role`, `status`, `avatarUrl`, `createdAt`, `updatedAt`; owns projects. |
| `Project` | `id`, `userId`, `name`, `description`, `sourceLanguage`, `status`, `progress`, `createdAt`, `updatedAt`; central aggregate. |
| `Media` | `id`, `projectId`, `originalName`, `fileName`, `mediaType`, `mimeType`, `fileSize`, `duration`, `storagePath`, `createdAt`; input media metadata. |
| `Transcript` | `id`, `projectId`, `languageCode`, `fullText`, `status`, `createdAt`, `updatedAt`; original-language transcript. |
| `TranscriptSegment` | `id`, `transcriptId`, `sequence`, `startTime`, `endTime`, `text`, `createdAt`, `updatedAt`; timed segment. |
| `Translation` | `id`, `projectId`, `sourceLanguage`, `targetLanguage`, `status`, `createdAt`, `updatedAt`; one target-language translation. |
| `TranslationSegment` | `id`, `translationId`, `transcriptSegmentId`, `translatedText`, `createdAt`, `updatedAt`; aligns to source segment. |
| `Language` | `id`, `code`, `name`, `nativeName`, `isActive`; language catalog. Vietnamese, English, Japanese and Korean are the initial set, not a permanent limit. |
| `Voice` | `id`, `languageId`, `provider`, `providerVoiceId`, `name`, `gender`, `description`, `previewUrl`, `isActive`, `createdAt`, `updatedAt`; belongs to a language. |
| `Narration` | `id`, `projectId`, `translationId`, `voiceId`, `languageCode`, `speed`, `audioPath`, `duration`, `status`, `createdAt`; TTS audio. |
| `ProcessingJob` | `id`, `projectId`, `type`, `status`, `progress`, `errorMessage`, `startedAt`, `completedAt`, `createdAt`; tracks long-running work. |
| `Result` | `id`, `projectId`, `narrationId`, `languageCode`, `videoPath`, `audioPath`, `duration`, `fileSize`, `createdAt`; preview/download output. |
| `ActivityLog` | `id`, `userId`, `action`, `entityType`, `entityId`, `description`, `createdAt`; safe audit metadata, never credentials. |

`MediaType` is `VIDEO | AUDIO`. `ProcessingJobType` is `TRANSCRIPTION | TRANSLATION | TTS | VIDEO_PROCESSING`. `ProcessingJobStatus` is `QUEUED | PROCESSING | COMPLETED | FAILED | CANCELLED`.

Canonical `ProjectStatus` is `DRAFT | UPLOADED | TRANSCRIBING | TRANSCRIBED | TRANSLATING | TRANSLATED | GENERATING_AUDIO | PROCESSING_VIDEO | COMPLETED | FAILED`. These values already match S4 Web/Mobile mock types; they are **not** the S5 local `UploadStatus` (`idle | selected | validating | uploading | success | failed | cancelled`). The upload state is transient UI state, not a database project/job status.

S4 mock `Project` currently requires a single `targetLanguage` for display, and the S5 creation form intentionally asks only for `sourceLanguage`. The future domain supports **many** `Translation` records per project; target languages are selected in the translation workflow. Do not force an artificial target-language choice into S5.

## Domain Relationships

```text
User 1 ── N Project
  └── N ActivityLog
Project 1 ── N Media
        1 ── 0..1 Transcript ── N TranscriptSegment
        1 ── N Translation ── N TranslationSegment ── 1 TranscriptSegment
        1 ── N Narration ── 1 Voice
        1 ── N ProcessingJob
        1 ── N Result ── 1 Narration
Language 1 ── N Voice
```

The cardinalities above describe intended relationships, not physical MongoDB embedding decisions. Timed transcript segments retain numeric seconds for audio/video synchronization. S7 Customer editors use route `projectId`, a mock transcript service and editable segment drafts; they derive `fullText` on save. This is frontend-only in-memory behavior, not STT or a backend model. S8 Translation editors read the saved transcript and preserve each source segment ID, sequence and timing in translated segments. Translation services store separate in-memory records per project/target language and detect stale source revisions. S9 consumes the saved target-language Translation and validates active Voice selection and speech speed before saving an in-memory narration configuration. Preview is a cancellable UI simulation. No audio path, TTS request or GENERATING_AUDIO project transition is created.

## Customer Scope

Customer capabilities planned across later sprints: register/login/logout; view/update profile and change password; dashboard; create/view/update/delete/search/filter own projects; upload video/audio; generate/view/edit transcript; select target language and translate/view/edit text; browse/preview/select voice and speed, generate narration; inspect progress/failures and retry where supported; preview/download video or audio results; history. S1–S10 currently cover UI foundations, mock auth, Dashboard/Projects, mock media upload, mock Transcript/Translation editors, Voice/TTS configuration, and simulated Generate/Processing—not the whole list.

## Admin Scope

The separate Admin Web will provide login/logout; dashboard metrics (customers, projects, processing/completed/failed, activity); customer search/detail/block/unblock; all-project search/detail; processing-job list, filters, failures and detail; language enable/disable; voice view/search/filter/enable/disable; activity logs; and business/application settings. Admin transcript editing is not in scope. Admin settings must not reveal `JWT_SECRET`, MongoDB passwords, provider secrets, server credentials, or private keys.

## Backend and Database Architecture

The planned `backend/` owns Express REST routes/controllers, request validation, authentication/RBAC/ownership middleware, domain services, Mongoose repositories/models, and asynchronous processing orchestration. Controllers should coordinate rather than contain AI/provider business logic. Separate provider-facing interfaces (`SpeechToTextService`, `TranslationService`, `TextToSpeechService`, `MediaProcessingService`) allow later replacement without changing domain workflows. Provider, queue and worker implementations are deferred.

MongoDB is the system of record for domain metadata and references; Mongoose is the planned ODM. Use `MONGODB_URI` from backend environment configuration, not source constants. Development convention: `mongodb://localhost:27017`, database `multilingual_ai_narration`. Schema design, indexes, transactions and migrations are deferred to backend sprints.

## Media Storage

Do **not** store video/audio binaries directly in MongoDB by default. Development storage is planned under ignored `backend/uploads/` with `source/`, `audio/`, `narrations/` and `results/`; MongoDB holds metadata, storage paths and URLs/references. Production can replace local files with object storage. The backend must revalidate type, size, authorization and safe filenames/paths; S5's 500 MB check is only frontend validation. No files are actually uploaded or persisted by S5.

## AI Processing Pipeline

```text
Customer upload → Media storage → Speech-to-Text → Transcript
→ Translation → Translated text → Text-to-Speech (voice + speed)
→ Narration audio → FFmpeg/media processing → Result preview/download
```

S10 renders generation summaries and local processing sessions from saved translation/voice settings. The session service owns deterministic stage progress, start locking, cancellation and retry; screen cleanup disposes timers. S11 completion records only in-memory Result metadata and updates a shared frontend project projection; it creates no media and persists no authoritative backend Project/ProcessingJob state.

Long operations are represented by `ProcessingJob`; project status summarizes the aggregate stage. FFmpeg is expected to extract/normalize audio when needed and merge narration into final media. No FFmpeg package, AI provider, job queue or live processing is installed in S6.

## API Architecture

The **proposed**, not implemented, REST base is `/api` on the Node/Express backend. Customer resources are `/api/auth/**`, `/api/users/me`, `/api/projects/**` and project subresources `media`, `transcript`, `translations`, `narrations`, `jobs`, `results`. Admin resources are `/api/admin/dashboard`, `/api/admin/users/**`, `/api/admin/projects/**`, `/api/admin/jobs/**`, `/api/admin/languages/**`, `/api/admin/voices/**`, `/api/admin/logs/**`, `/api/admin/settings/**`. See [API.md](API.md) for proposed route and response conventions. Realtime transport (SSE/WebSocket) is undecided, not a current API.

## Environment Strategy and Security Principles

- Customer Web and planned Admin Web: `VITE_API_BASE_URL` (public client configuration, no secrets).
- Mobile: `EXPO_PUBLIC_API_BASE_URL` (public Expo configuration, no secrets). On a physical phone, `localhost:8080` points to the phone, **not** the developer PC; use the PC LAN address or a suitable tunnel when the backend exists. Do not hard-code a sample IP in production code.
- Backend (future): `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `UPLOAD_DIR`; AI provider credentials are server-only environment variables or secure configuration.
- Never commit secrets; validate input and media server-side; enforce least privilege, ownership and authorization at every protected API; avoid logging passwords, JWTs and provider keys.

## Development Ports

| Service | Planned URL | Exists now? |
| --- | --- | --- |
| Customer Web | `http://localhost:5173` (Vite default) | Yes |
| Admin Web | `http://localhost:5174` | Yes (S12 mock foundation) |
| Backend API | `http://localhost:8080/api` | No |
| MongoDB | `mongodb://localhost:27017` | No repository connection |

## Roadmap

| Sprint | Focus | State |
| --- | --- | --- |
| S1 | Frontend Foundation | Completed in code |
| S2 | Design System + App Shell | Completed in code |
| S3 | Authentication UI | Completed in code (mock) |
| S4 | Dashboard + Projects | Completed in code (mock data) |
| S5 | New Project + Media Upload | Completed in code (mock upload) |
| S6 | Full-stack Architecture & Domain Alignment | Completed in documentation |
| S7 | Customer Transcript Editor | Completed in frontend with mock service |
| S8 | Customer Translation Editor | Completed in frontend with mock service |
| S9 | Customer Voice & TTS UI | Completed in frontend with mock configuration |
| S10 | Customer Generate & Processing UI | Completed in frontend with mock processing |
| S11 | Customer Result & History | Completed with mock metadata; no real files |
| S11.5 | Customer Web Visual Redesign | Completed; Web-only, domain unchanged |
| S12 | Admin Web Foundation | Completed; mock UI only |
| S13 | Admin Dashboard | Completed; mock service and dashboard states |
| S14 | Admin Customer Management | Completed; mock frontend/service only |
| S15 | Admin Projects & Processing Jobs | Completed; mock frontend/services only |
| S16 | Admin Languages, Voices, Logs & Settings | Completed; mock frontend/services only |
| S17 | Backend Foundation: Node.js, Express, TypeScript, MongoDB, Mongoose | Planned |
| S18 | Authentication, JWT & RBAC | Planned |
| S19 | Project & Media API | Planned |
| S20 | Speech-to-Text Integration | Planned |
| S21 | Translation Integration | Planned |
| S22 | Text-to-Speech Integration | Planned |
| S23 | FFmpeg Media Processing | Planned |
| S24 | Full Frontend/Backend Integration | Planned |
| S25 | Testing, Security & Hardening | Planned |
| S26 | CI/CD & Deployment | Planned |

## S11 Result boundary

Each client has its own session-only result service (no shared package/backend). Completed processing records project/language, segment counts, voice, speed and timestamp. Existing completed project fixtures expose only known metadata. The repository publishes immutable project snapshots to Dashboard/Projects/History; Result lookup preserves the last completed metadata per language. Later failed/cancelled runs do not delete earlier completed metadata. History actions follow the latest project status. Full reload clears session overlays/results. Real preview/download and durable ownership-checked storage remain backend integration work.

## S12 Admin foundation

Independent `admin-web/` React/TypeScript/Vite package, npm lockfile, strict TypeScript; no Customer/Mobile imports or shared router. Customer stays on localhost:5173; Admin uses localhost:5174 (strictPort); future backend localhost:8080/api is not implemented.

Routes: /login, / → /dashboard, /users, /projects, /jobs, /languages, /voices, /logs, /settings, plus not-found fallback. Mock login validates inputs then navigates; all preview routes intentionally remain public. No security boundary, session, password persistence, JWT or fake tokens. Real JWT/RBAC belongs to S18.

Admin fixtures use centralized mock sources and service boundaries. Public VITE_API_BASE_URL prepares integration only; no HTTP calls. ADMIN monitors/configures without editing Customer transcripts/translations/narration. S13–S16 Admin screens are implemented locally; backend enforcement remains deferred.

### S13 Dashboard service boundary

AdminDashboardPage composes dashboard cards through useAdminDashboard → adminDashboardService.getDashboard → centralized typed fixtures. The service owns simulated latency, AbortSignal cancellation and copied snapshots. Unmount cancels pending work; refresh retains existing data while busy; failed requests expose a safe retry UI. There is no polling, transport, persistent state or connection to Customer fixtures. S12 navigation and management placeholders stay unchanged except removal of sprint/demo labels from the shared shell.
## S14 Admin customer boundary

`AdminUsersPage` và `AdminCustomerDetailPage` chỉ giao tiếp qua `adminCustomerService`. Service sở hữu độ trễ mô phỏng, truy vấn kết hợp, phân trang, bản sao dữ liệu và mutation; component không sửa trực tiếp fixture. Nguồn mock tập trung chỉ chứa view-model `AdminCustomer` có `role=CUSTOMER`. Khi có backend, boundary này được thay bằng Admin API mà không đổi domain/UI. Trạng thái frontend không phải RBAC hay security boundary.

## S15 Admin operations boundary

Project và ProcessingJob dùng kho mock quan hệ chung, truy cập qua `adminProjectService` và `adminJobService`. Service sở hữu lọc/phân trang, latency, clone snapshot và retry/cancel. UI không chỉnh nội dung Customer. Retry chỉ FAILED → QUEUED; cancel chỉ QUEUED/PROCESSING → CANCELLED. Đây không phải worker hoặc authorization boundary.

## S16 Admin system boundary

Language và Voice dùng catalog mock quan hệ chung; ActivityLog là read-only; SystemSettings là cấu hình in-memory. Bốn service sở hữu validation, latency và mutation. Không có hard delete, localStorage, real audio preview, secret fields, backend health claims hoặc frontend security enforcement.
