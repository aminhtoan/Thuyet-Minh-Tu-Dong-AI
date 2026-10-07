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
| Admin Web | `admin-web/` | S12–S16 primary mock Admin screens implemented; React + TypeScript + Vite; separate app |
| Backend | `backend/` | S17 foundation implemented; Node.js + Express.js + TypeScript + Mongoose |

Customer Web and Admin Web will use one backend but remain independent applications. Do not place Admin under `frontend-web/src/admin` or treat `/admin` in Customer Web as the main Admin architecture.

## Persistence and Processing

- MongoDB + Mongoose is the backend database/ODM. S17 có connection lifecycle; việc chạy thật cần `MONGODB_URI` trỏ tới MongoDB reachable.
- MongoDB will hold metadata and references, not video/audio binary by default.
- Development media storage is planned under ignored `backend/uploads/`; production may use object storage.
- Long AI/media tasks will use `ProcessingJob` records; provider-facing services remain replaceable.
- FFmpeg is planned for extraction/normalization/merging, not installed in S6.
- AI providers, worker implementation and queue technology are not decided.

## Authentication and Security

- S18 backend authentication dùng bcrypt, access/refresh JWT, persistent hashed refresh sessions và backend-enforced RBAC. Per-project ownership bắt đầu ở S19.
- `CUSTOMER` cannot call Admin APIs and cannot access another Customer's projects.
- Secrets, `passwordHash` and privileged settings belong only on the backend; hiding a menu is not authorization.
- Current frontend auth screens vẫn mô phỏng và chưa gọi API S18; backend hiện đã phát JWT và lưu refresh session thật.

## Current Implementation: S1–S11

- S1: Customer frontend foundations for Web and Mobile.
- S2: design tokens, reusable components, Web AppShell and Mobile Expo Router navigation.
- S3: Web/Mobile login and register UI backed by short mock delay only.
- S4: Dashboard and Projects with static mock repository, search/filter/status/progress UI.
- S5: `/projects/new` project form, media validation and cancellable mock upload on both clients; Web drag/drop and preview; Mobile Expo Document Picker.
- S6: full-stack architecture and domain alignment in documentation; no Admin/Backend scaffolding.
- S7: Web/Mobile Customer Transcript Editor, timestamped segment editing and in-memory mock generate/save; no STT provider.
- S8: Web/Mobile Translation Editor with saved transcript context, aligned segments, target languages, mock translation and save/reset. Real translation is planned S21.
- S9: Web/Mobile Voice & TTS configuration, active language-scoped voices, simulated preview, speed selection and mock save/reset. Voice data is MOCK; TTS is NOT_INTEGRATED; narration audio is NOT_GENERATED.
- S10: saved-configuration generation summary, confirmation and simulated narration/media progress on Web/Mobile, with completed/failed/cancelled states, retry and timer cleanup. Processing is MOCK; real TTS/FFmpeg are NOT_INTEGRATED and no output media is generated.
- S12: separate Admin foundation with mock login and the shell later completed across S13–S16.
- S17 foundation, S18 auth/JWT/RBAC và S19 Project CRUD/Media upload đã có trong backend. Chưa có STT hoặc AI processing.

## Current Sprint and Next Direction

S9–S16.5 frontend scope đã hoàn thành. S17 foundation, S18 auth và S19 Project/Media API đã có trong backend; hướng tiếp theo là S20 Speech-to-Text.

## Domain Alignment Snapshot

- `Project` is the central aggregate owned by one `User`.
- Customer Project ownership được enforce từ access token. Mỗi Project có tối đa một source Media; binary development nằm dưới ignored `backend/uploads/`, MongoDB chỉ lưu metadata/path nội bộ.
- Core domain entities: User, Project, Media, Transcript, TranscriptSegment, Translation, TranslationSegment, Language, Voice, Narration, ProcessingJob, Result, ActivityLog.
- A Project may have many target-language Translations and Narrations.
- `ProjectStatus` describes the aggregate lifecycle; `ProcessingJobStatus` describes a long-running task; S5 `UploadStatus` is local UI state.
- Current Web/Mobile `MediaType` already uses `VIDEO | AUDIO` and the canonical Project status names.
- Current four language codes (`vi`, `en`, `ja`, `ko`) are initial UI options, not a permanent domain limit.
- Segment timestamps are essential for later synchronization with source media.

## Development Topology

- Customer Web: Vite default `http://localhost:5173` (current app).
- Admin Web: `http://localhost:5174` (S12 mock foundation; strict port).
- Backend: `http://localhost:8080/api` khi MongoDB kết nối thành công.
- Development database: MongoDB Atlas, database `multilingual_ai_narration`. URI và credential chỉ nằm trong `backend/.env`, không ghi vào source hoặc tài liệu.
- Customer Web and future Admin Web use public `VITE_API_BASE_URL`; Mobile uses public `EXPO_PUBLIC_API_BASE_URL`.
- Server-only configuration gồm `MONGODB_URI`, hai JWT secret riêng, token lifetimes và upload directory.

## Roadmap Checkpoints

- S7–S10: Transcript/Translation editors, Voice/TTS configuration and Generate/Processing use mock services. S11 provides mock Result & History; S11.5 is Customer UI/UX Polish.
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
