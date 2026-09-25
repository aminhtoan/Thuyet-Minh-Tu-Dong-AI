# Multilingual AI Narration System

## Project

Vietnamese: Hệ thống thuyết minh tự động đa ngôn ngữ

English: Multilingual AI Narration System

Repository: `multilingual-ai-narration`

## Purpose

Hệ thống cho phép Customer tạo thuyết minh đa ngôn ngữ cho video/audio:

Upload → Speech-to-Text → Edit Transcript → Translate/Edit → Select Voice/Speed → TTS → Media Processing → Preview/Download Result → Project History.

Đây là mục tiêu toàn hệ thống, **không** phải danh sách tính năng đã triển khai. [ARCHITECTURE.md](ARCHITECTURE.md) là nguồn chuẩn cho kiến trúc và domain; [PROGRESS.md](PROGRESS.md) là trạng thái thực tế.

## Actors and Roles

- `CUSTOMER`: có thể register/login khi chưa xác thực; sau đó quản lý tài nguyên của chính mình trên Customer Web/Mobile.
- `ADMIN`: quản lý và giám sát qua Admin Web riêng cùng Admin API.
- Không có actor `GUEST` riêng; không thêm role khác nếu chưa có yêu cầu.
- `UserStatus` dự kiến: `ACTIVE`, `BLOCKED`.

## Applications

| Application | Folder | State |
| --- | --- | --- |
| Customer Web | `frontend-web/` | Implemented UI; React + TypeScript + Vite |
| Customer Mobile | `frontend-mobile/` | Implemented UI; React Native + TypeScript + Expo SDK 57 |
| Admin Web | `admin-web/` | Planned S12; React + TypeScript + Vite; separate app |
| Backend | `backend/` | Planned S17; Node.js + Express.js + TypeScript |

Customer Web and Admin Web will use one backend but remain independent applications. Do not place Admin under `frontend-web/src/admin` or treat `/admin` in Customer Web as the main Admin architecture.

## Persistence and Processing

- MongoDB + Mongoose is the decided backend database/ODM; **no connection exists yet**.
- MongoDB will hold metadata and references, not video/audio binary by default.
- Development media storage is planned under ignored `backend/uploads/`; production may use object storage.
- Long AI/media tasks will use `ProcessingJob` records; provider-facing services remain replaceable.
- FFmpeg is planned for extraction/normalization/merging, not installed in S6.
- AI providers, worker implementation and queue technology are not decided.

## Authentication and Security

- Future authentication: JWT; future authorization: backend-enforced RBAC plus per-project ownership.
- `CUSTOMER` cannot call Admin APIs and cannot access another Customer's projects.
- Secrets, `passwordHash` and privileged settings belong only on the backend; hiding a menu is not authorization.
- Current auth screens only simulate completion; they do not issue JWTs, persist sessions or call an API.

## Current Implementation: S1–S7

- S1: Customer frontend foundations for Web and Mobile.
- S2: design tokens, reusable components, Web AppShell and Mobile Expo Router navigation.
- S3: Web/Mobile login and register UI backed by short mock delay only.
- S4: Dashboard and Projects with static mock repository, search/filter/status/progress UI.
- S5: `/projects/new` project form, media validation and cancellable mock upload on both clients; Web drag/drop and preview; Mobile Expo Document Picker.
- S6: full-stack architecture and domain alignment in documentation; no Admin/Backend scaffolding.
- S7: Web/Mobile Customer Transcript Editor, timestamped segment editing and in-memory mock generate/save; no STT provider.
- No Admin Web, Backend, MongoDB connection, real upload, JWT, AI processing or persistent project creation exists yet.

## Current Sprint and Next Direction

S7 is **Customer Transcript Editor** on Web and Mobile. The next sprint is S8 Customer Translation Editor; it is not implemented. Admin Web starts at S12; Backend starts at S17.

## Domain Alignment Snapshot

- `Project` is the central aggregate owned by one `User`.
- Core domain entities: User, Project, Media, Transcript, TranscriptSegment, Translation, TranslationSegment, Language, Voice, Narration, ProcessingJob, Result, ActivityLog.
- A Project may have many target-language Translations and Narrations.
- `ProjectStatus` describes the aggregate lifecycle; `ProcessingJobStatus` describes a long-running task; S5 `UploadStatus` is local UI state.
- Current Web/Mobile `MediaType` already uses `VIDEO | AUDIO` and the canonical Project status names.
- Current four language codes (`vi`, `en`, `ja`, `ko`) are initial UI options, not a permanent domain limit.
- Segment timestamps are essential for later synchronization with source media.

## Development Topology

- Customer Web: Vite default `http://localhost:5173` (current app).
- Admin Web: planned `http://localhost:5174` (no app or server yet).
- Backend: planned `http://localhost:8080/api` (no app or server yet).
- MongoDB: planned `mongodb://localhost:27017`, database `multilingual_ai_narration` (no connection yet).
- Customer Web and future Admin Web use public `VITE_API_BASE_URL`; Mobile uses public `EXPO_PUBLIC_API_BASE_URL`.
- Server-only configuration will include `MONGODB_URI`, `JWT_SECRET`, token lifetime and upload directory.

## Roadmap Checkpoints

- S7: Customer Transcript Editor with mock generation/save; S8–S11 complete translation, voice/TTS, processing and result/history UI.
- S12–S16: build the separate Admin Web and management screens.
- S17–S23: backend foundation, JWT/RBAC, project/media API and AI/FFmpeg integrations.
- S24–S26: integration, testing/security hardening and deployment automation.
- The detailed sprint-by-sprint roadmap is maintained in [ARCHITECTURE.md](ARCHITECTURE.md).

## Critical Constraints

- Do not rewrite working S1–S5 features solely to match conceptual backend types.
- Existing `ProjectStatus` in both frontends already matches the canonical project lifecycle.
- S4 mock `Project` has one `targetLanguage` for display; future Project may have many Translation records. S5 creation deliberately requests only source language.
- S5 `UploadStatus` is local UI state, separate from `ProjectStatus` and future `ProcessingJobStatus`.
- Keep Mobile on Expo SDK 57 and compatible with a matching Expo Go build; do not eject or add incompatible native dependencies without need.
- Expo Go from the current iPhone App Store does not support SDK 57; Android can use the matching version from expo.dev/go. Physical-device scanning remains to be verified by a developer with a phone.
- Use environment-based public API URLs. On a real phone, `localhost` is the phone; future Mobile backend calls must use a reachable LAN address or tunnel.
- No secrets in client code or Git; backend must revalidate files and enforce access.
- TypeScript strict, reusable components, explicit loading/error/empty states, and honest validation reporting.
