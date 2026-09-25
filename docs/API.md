# API Status and Conventions

## Current: No Backend API

**There is no implemented HTTP API in this repository.** S1–S5 Customer Web/Mobile use local mock auth, a static mock project repository, and a cancellable mock upload service. S7 adds a local mock transcript service; generation, retrieval and save use in-memory sample data only. S5 sends no media to a server and persists no new project. No JWT, RBAC middleware, Admin API, MongoDB connection, STT provider or AI endpoint exists. The paths below are **proposed**, subject to backend-sprint refinement.

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
