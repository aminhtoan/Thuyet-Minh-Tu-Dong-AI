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
| Admin Web | `admin-web/` | S24.4 API-integrated Admin client; React + TypeScript + Vite; separate app |
| Backend | `backend/` | S17 foundation implemented; Node.js + Express.js + TypeScript + Mongoose |

Customer Web and Admin Web will use one backend but remain independent applications. Do not place Admin under `frontend-web/src/admin` or treat `/admin` in Customer Web as the main Admin architecture.

## Persistence and Processing

- MongoDB + Mongoose is the backend database/ODM. S17 có connection lifecycle; việc chạy thật cần `MONGODB_URI` trỏ tới MongoDB reachable.
- MongoDB will hold metadata and references, not video/audio binary by default.
- Development media storage is planned under ignored `backend/uploads/`; production may use object storage.
- Long AI/media tasks will use `ProcessingJob` records; provider-facing services remain replaceable.
- FFmpeg is planned for extraction/normalization/merging, not installed in S6.
- STT, Translation và TTS dùng provider abstraction với OpenAI adapter; worker và queue technology chưa được quyết định.

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
- S17–S23 backend đã có foundation, auth/RBAC, Project/Media, STT, Translation, TTS và FFmpeg media-processing. Máy phát triển cần `ffmpeg`/`ffprobe` trong PATH hoặc cấu hình binary tương ứng.

## Current Sprint and Next Direction

S9–S16.5 frontend scope đã hoàn thành. Backend pipeline đến Result đã triển khai; hướng tiếp theo là S24 frontend/backend integration.

## Domain Alignment Snapshot

- `Project` is the central aggregate owned by one `User`.
- Customer Project ownership được enforce từ access token. Mỗi Project có tối đa một source Media; binary development nằm dưới ignored `backend/uploads/`, MongoDB chỉ lưu metadata/path nội bộ.
- STT dùng provider abstraction với OpenAI `whisper-1` adapter, xử lý đồng bộ, lưu Transcript cùng ordered timestamp segments và ProcessingJob history. Retry từ `FAILED`; active request trùng bị chặn.
- Translation dùng provider abstraction và OpenAI text adapter, xử lý structured batch đồng bộ, lưu nhiều target language với source segment alignment. Target đã hoàn tất trả idempotently; retry và active-job protection được backend enforce.
- TTS dùng OpenAI `gpt-4o-mini-tts`, voice resolve từ catalog theo target language, lưu MP3 dưới project-scoped uploads và chỉ trả protected audio URL. Identity là Translation + Voice + speed; Project giữ `GENERATING_AUDIO` sau thành công cho S23.
- Media processing dùng abstraction với FFmpeg/FFprobe, server-owned paths và protected Result access. Narration thay audio gốc, output H.264/AAC MP4 theo duration video nguồn; MongoDB chỉ giữ metadata/path tương đối. `COMPLETED` nghĩa là Result cuối đã được tạo và probe hợp lệ.
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

## S25.1 Customer Web/Mobile UI Consistency Decision (2026-10-10)

- Customer Web và Customer Mobile phải dùng cùng backend data/API contract, project lifecycle, paid-action confirmation, terminology và outcome. Layout được phép khác theo nền tảng nhưng phải tạo cảm giác cùng một sản phẩm.
- Shared journey chuẩn: Auth → Dashboard/Projects → Create + Upload → Transcript → Translation → Voice/TTS → Generate/Processing → Result → History/Account. Không client nào tự gọi paid AI khi mở màn hình hoặc tạo fake success để lấp API thiếu.
- Web giữ sidebar, keyboard/mouse, drag-and-drop và browser download. Mobile giữ Expo Router/tabs, touch target, DocumentPicker/native multipart, app-cache protected playback và native sharing.
- Android upload và Project Detail đã PASS trên thiết bị là regression boundary: không thay transport/file lifecycle hoặc hành vi editing chỉ để đồng nhất visual.
- Canonical Vietnamese status/terminology và unified token contract được định nghĩa tại `docs/UI.md`. Các client vẫn có implementation riêng phù hợp React DOM/React Native.
- Audit xác nhận các parity gap cần xử lý sau: Web/Mobile token primary khác nhau; navigation Account/Settings khác nhau; Web còn English/internal enum copy; Mobile WorkflowSteps chưa render bước Kết quả; một số feedback/validation/confirmation chưa cùng mức độ.
- S25.1 chỉ audit/documentation. Backend, database và API contract không đổi; S24.3.12.2 real Mobile Whisper validation vẫn **POSTPONED**.

## S25.2 Cross-platform Foundation Decision (2026-10-10)

- Web và Mobile giữ implementation riêng nhưng cùng một canonical Vietnamese display dictionary cho Project/Transcript/Translation/Voice/Processing state. Backend enum values không được dịch hoặc thay đổi trong request/response.
- ProjectStatus phải hiển thị chi tiết, không gom `UPLOADED`, `TRANSCRIBING`, `TRANSCRIBED`, `TRANSLATING`, `TRANSLATED`, `GENERATING_AUDIO` và `PROCESSING_VIDEO` thành một nhãn “Đang xử lý”.
- Workflow UI chuẩn có 6 bước theo thứ tự Tải lên, Bản ghi, Bản dịch, Giọng đọc, Tạo thuyết minh, Kết quả. Mobile dùng horizontal scroll để bảo toàn thứ tự trên màn hình hẹp.
- Android upload staging/native multipart và Project Detail editing là protected regression boundary. S25.2 chỉ thêm test/decision guard cho Bearer + refresh-once, cleanup/retry, cache synchronization và duplicate-save; không thay transport đã PASS vật lý.
- Source validation S25.2 PASS nhưng browser smoke và physical Android smoke chưa chạy; không suy diễn runtime PASS. S24.3.12.2 vẫn POSTPONED và không có paid AI call.

## S24 Integration Decisions (2026-10-08)

- Web sessions use per-tab `sessionStorage`; Mobile stores the token pair with Expo SecureStore. All clients use one refresh request at a time, rotate the pair, retry a failed request once, and clear the session when refresh fails.
- Customer and Admin route guards are role-specific; backend RBAC remains the security boundary.
- Customer project creation and multipart media upload now call the real backend. Fetch does not expose portable upload progress here, so the UI does not invent intermediate percentages.
- `VITE_API_BASE_URL` defaults to `http://localhost:8080/api` for local web development. Mobile has no localhost fallback for physical devices; configure `EXPO_PUBLIC_API_BASE_URL` with the computer's reachable LAN address.
- S24.1 đã bổ sung Voice Catalog và Admin APIs. S24.2.1 Customer Web và S24.3 Customer Mobile đã bỏ runtime mock Customer, dùng backend thật; Transcript/Translation vẫn chỉ đọc vì chưa có update API. Không gọi paid provider trong validation S24.3.

## S24.1 Backend API Decisions (2026-10-09)

- Customer `GET /api/voices` and the minimal `/api/admin/*` read/monitoring API are implemented with backend JWT/RBAC and strict validation.
- Project target language is represented as `targetLanguages[]`, derived from persisted ready Translations; no single target language is invented.
- Admin can only change CUSTOMER status. Blocking revokes refresh sessions; Admin roles/status cannot be changed through this API.
- Languages, voices and safe runtime settings are read-only. Existing Admin mock create/edit/retry/cancel controls must be disabled or omitted during frontend integration unless a later backend scope explicitly adds safe mutations.

## S24.2 Customer Web Decisions (2026-10-09)

- `frontend-web` đã bỏ runtime mock khỏi các màn Customer và dùng backend cho auth, project/media, STT, translation, voice/TTS, processing, result/history.
- `frontend-mobile` đã bỏ runtime mock khỏi các màn Customer; dùng SecureStore + refresh single-flight, API pagination/CRUD/upload, AI workflow có xác nhận và tải artifact có Bearer token vào Expo cache trước khi phát/chia sẻ.
- `admin-web` đã bỏ production runtime mock và gọi Admin API thật cho Dashboard, Users, Projects, Jobs, Languages, Voices, Logs và Settings. Chỉ Customer status có mutation; catalog, jobs và settings giữ read-only.
- Protected audio/video được fetch bằng Bearer token và phát qua Blob URL; không đưa token vào URL.
- STT, Translation và TTS chỉ bắt đầu sau xác nhận rõ ràng của người dùng. Không có paid provider call trong validation tự động.
- Transcript/Translation đang read-only vì backend chưa có update endpoint; UI không giả lập persistence.
- S24.2.1 hoàn tất server-side Customer Projects pagination và authenticated Chrome smoke bằng tài khoản disposable. Smoke không gọi paid AI; project test đã được cleanup.
- Protected binary transport được xác nhận bởi frontend Bearer-to-Blob implementation và backend regression. Actual browser playback của artifact không chạy vì tài khoản disposable không có artifact và không được tạo qua paid provider trong validation.
- Voice seed is explicit and idempotent, uses existing active languages plus validated configured OpenAI voice, and never calls a paid provider.

## S24.5 Validation Snapshot (2026-10-09)

- Backend 118/118 regression, Atlas health, Customer disposable browser smoke và mọi package lint/typecheck/build đã PASS.
- Mobile source/Expo validation PASS nhưng device smoke chưa chạy do không có ADB/device. `EXPO_PUBLIC_API_BASE_URL` hiện đã được cấu hình bằng URL không dùng localhost; giá trị cụ thể không được ghi vào tài liệu.
- Admin source/API-mapping validation PASS nhưng authenticated browser smoke chưa chạy vì không có disposable ADMIN credential được provision an toàn.
- Actual protected artifact playback trên Web/Mobile và paid-provider end-to-end smoke chưa chạy. S24 vẫn PARTIAL; không đồng nhất build PASS với runtime PASS.

## S24.3.1 Mobile Auth Guard Decision (2026-10-09)

- `AuthBoundary` không được render children của pathname nguồn trong lúc đang redirect theo trạng thái SecureStore. Việc đánh dấu pathname nguồn là đã kiểm tra trước khi `router.replace(...)` commit có thể cho phép redirect cấp route chạy đồng thời và gây navigation ping-pong/maximum update depth trên React Fabric.
- Khi redirect sang `/login` hoặc `/dashboard`, guard giữ trạng thái chờ; pathname đích sẽ được kiểm tra trong effect kế tiếp rồi mới render. Không thay đổi SecureStore, refresh rotation, Expo Router architecture hoặc API contract.
- Source validation, Android export và Metro QR đã PASS; physical-device smoke vẫn NOT RUN do không có ADB/device trong môi trường validation.

## S24.3.2 Mobile Registration Decision (2026-10-09)

- Expo Go phải dùng `EXPO_PUBLIC_API_BASE_URL` trỏ tới IPv4 LAN hiện tại của máy chạy backend, cổng `8080`, hậu tố `/api`; địa chỉ mẫu trong `.env.example` không phải cấu hình runtime. `.env` local không được commit và giá trị URL cụ thể không ghi vào tài liệu.
- Register payload giữ contract `{ fullName, email, password }`. Mobile validation đồng bộ với backend: họ tên 2–100 ký tự; mật khẩu 8–128 ký tự, có chữ hoa, chữ thường và chữ số.
- Register UI ánh xạ lỗi an toàn: lỗi transport thành “Không kết nối được máy chủ.”; HTTP 409/`EMAIL_ALREADY_EXISTS`, HTTP 400/`VALIDATION_ERROR` và HTTP 5xx có thông báo tiếng Việt riêng. Login/logout, SecureStore, refresh rotation và `AuthBoundary` không thay đổi.
- LAN health và invalid-register response đã được xác nhận trực tiếp; đăng ký thành công trên thiết bị vẫn NOT RUN do không có ADB/device.

## S24.3.3 Mobile Navigation State Machine (2026-10-09)

- Root Expo Router navigator phải luôn được mount. Auth initialization không được trả `null` thay cho `<Stack>` rồi gọi navigation API, vì điều đó cập nhật router store trong khi navigator root chưa sẵn sàng hoặc đang bị tháo/mount lại.
- Auth route ownership chỉ thuộc `Stack.Protected` trong root layout: `loading` mở `index`, `unauthenticated` mở `login/register`, `authenticated` mở `(tabs)/projects`. Các guard loại trừ nhau và dùng snapshot ổn định từ session store.
- `index.tsx` chỉ là initialization UI, không còn `<Redirect>`. Login không tự replace sau thành công; `session.set()` chuyển state sang authenticated và protected stack thực hiện transition. `session.clear()` từ logout hoặc refresh failure chuyển về unauthenticated.
- Register thành công vẫn có thể replace về login vì đây là navigation trong cùng public group, không phải auth guard. Các navigation nghiệp vụ project/workflow không thay đổi.
- Automated state-machine tests và toàn bộ source/Expo/Metro validation PASS; runtime Expo Go Android vẫn NOT RUN do không có device/ADB trong môi trường thực thi.

## S24.3.4 Mobile Routes and Logout (2026-10-09)

- Root `Stack.Protected` phải dùng route names đúng theo direct children Expo Router tạo ra. Khi chưa có `projects/_layout.tsx`, không khai báo `projects`; khai báo `projects/new` và từng `projects/[projectId]/*` route hiện hữu để bảo vệ toàn bộ project workflow mà không sinh warning.
- Mobile tabs hiện giữ các tab cũ và thêm `Tài khoản`. Account đọc identity thật qua `/auth/me`; logout có native confirmation, thử revoke refresh session phía backend, rồi luôn xóa SecureStore/local auth state. `Stack.Protected` tự chuyển về Login; logout không điều hướng thủ công.
- Mọi session mutation được serialize và có revision. Refresh chỉ được ghi token mới khi revision lúc response về vẫn là revision lúc request bắt đầu; logout/session mới làm response cũ mất hiệu lực.
- Android Expo Go report do người dùng xác nhận sau S24.3.4: PASS 8/8 cho startup, missing-route warning, Account, identity thật, logout confirmation, logout về Login, relaunch logged out và login lại/Dashboard/Projects. S24.3.4 **COMPLETED**.

## S24.3.5 Mobile Project/Media Smoke Decisions (2026-10-09)

- Document Picker copy file được chọn vào cache trước upload để Android storage-provider URI còn đọc được ổn định. Multipart field tiếp tục là `file`; không tự đặt `Content-Type` boundary.
- Client validation dùng filename/size/MIME, còn upload MIME được canonicalize theo extension đã chấp nhận để khớp chính xác Multer allowlist backend. Backend vẫn là nơi tái kiểm tra loại và kích thước file.
- Protected narration/result URL chỉ là path API; Mobile tải bằng Bearer header vào Expo cache rồi mới truyền local `file://` URI cho `expo-audio` hoặc `expo-video`. Token không nằm trong URL.
- Protected binary download có refresh-once khi 401 và cùng single-flight refresh rotation với JSON API. Partial/abandoned cache files được cleanup; download/network errors không bị trình bày thành playback thành công.
- STT/Translation/TTS là paid operations và chỉ chạy sau confirmation. S24.3.5 source validation không gọi chúng. Existing persisted artifacts có thể dùng cho device smoke; không tạo output AI giả.
- Customer processing API hiện đồng bộ: màn hình chờ request STT/Translation/TTS/FFmpeg thực tế hoàn tất và refresh project sau response; không có Customer job-status polling endpoint để Mobile giả lập polling.
- Remaining Android checklist cần xác nhận thủ công: project create/upload/detail, read-only transcript/translation retrieval, voice catalog, existing generation/result state, protected audio/video playback và sharing. Source validation PASS không thay thế device PASS.

## S24.3.6 Android Multipart Upload Decision (2026-10-09)

- Không append React Native file descriptor `{ uri, name, type }` vào DOM `FormData` bằng ép kiểu `Blob`; Expo Go SDK 57/React Native có thể từ chối part đó với `Unsupported FormDataPart implementation` trước khi request tới backend.
- Mobile media upload dùng native `expo-file-system/legacy.createUploadTask` + `MULTIPART`. Native transport tự tạo boundary, gửi field `file`, Bearer header và MIME backend hỗ trợ; generic JSON API client vẫn dùng cho các request còn lại và refresh session.
- Document Picker vẫn copy vào cache; upload service tiếp tục copy sang một project-scoped `file://` URI có basename bằng filename đã sanitize. Cách này ổn định quyền đọc Android và giữ filename multipart mà không chuyển qua `Blob`/`File`.
- Upload 401 dùng refresh rotation hiện có và retry một lần. Project được tạo trong lần thử chỉ bị xóa khi chính upload đó thất bại; nếu cleanup không thành công, ID được giữ cho nút retry nhằm tránh tạo duplicate. Không bao giờ cleanup project có sẵn ngoài flow hiện tại.
- Source/tests/Expo/Android bundle đã PASS; physical-device MP4 upload sau sửa vẫn cần người dùng xác nhận, nên S24.3.5/S24.3.6 vẫn PARTIAL.

## S24.3.7 DocumentPicker URI Lifecycle Decision (2026-10-09)

- Với `copyToCacheDirectory: true`, DocumentPicker đã trả một local cache URI cho Expo APIs. Không copy mù quáng URI `file://` đó sang cache lần nữa; Android Expo Go thực tế có thể từ chối `copyAsync` dù URI DocumentPicker là nguồn dành cho immediate read.
- Trước upload, client yêu cầu file tồn tại, không phải directory và đọc thử 1 byte bằng FileSystem. URI local hợp lệ được upload trực tiếp. Chỉ source không phải `file://` mới dùng project-scoped copy fallback, và destination được kiểm tra lại trước native multipart.
- Direct picker cache không bị xóa khi upload thất bại/cancel để retry còn dùng được; chỉ cleanup sau upload thành công. Copied fallback cache luôn được cleanup best-effort. URI đã stale hoặc không đọc được yêu cầu người dùng chọn lại file bằng thông báo tiếng Việt cố định.
- Native multipart field `file`, MIME/filename, Bearer refresh-once, giới hạn 500 MB và project cleanup/chống duplicate không thay đổi. Physical Android upload vẫn cần retest trước khi đánh dấu hoàn thành.

## S24.3.8 Android Readability and Diagnostics Decision (2026-10-09)

- Không dùng `readAsStringAsync`/Base64 probe làm điều kiện trước native upload. Việc API đọc chuỗi với partial binary options không thành công không chứng minh `createUploadTask` không thể đọc cùng local URI.
- `getInfoAsync` là preflight duy nhất: missing/directory bị từ chối; local `file://` hợp lệ được truyền thẳng cho native multipart. Native transport là phép thử đọc/upload thực sự và lỗi của nó được phân loại riêng.
- Development diagnostics chỉ lưu metadata an toàn: operation, URI scheme, `document-picker-cache | app-cache | outside-app-cache`, size, MIME, getInfo result, sanitized error type/message và HTTP status. Full URI, file content, Authorization/JWT và secrets không được log.
- UI tách missing file, access denied, FileSystem incompatibility, network, HTTP và user cancellation. Retry giữ picker cache khi thất bại và project ID chỉ khi cleanup project mới tạo không thành công; không tạo duplicate hoặc xóa dữ liệu ngoài flow.
- Automated/source/Expo bundle validation PASS; physical Android MP4 upload vẫn cần xác nhận trước khi S24.3.8 hoặc S24.3 tổng thể được xem là hoàn thành.

## S24.3.9 Project-Owned Upload Materialization (2026-10-10)

- Expo Go Android có thể trả DocumentPicker `file://` dưới cache của host Expo, nằm ngoài `Paths.cache` của project. Metadata API vẫn thấy file, nhưng legacy upload task có thể từ chối stream URI đó với `Location isn't readable`.
- `Paths.cache` hiện là authority để phân loại app-controlled upload files. Source nằm ngoài cache này không được gửi thẳng tới uploader; client dùng modern SDK 57 `File.copy()` đúng một lần để materialize vào `mobile-uploads/<projectId>/<safe-original-name>`.
- Không quay lại legacy `copyAsync` đối với source đã xác nhận thất bại. Destination được kiểm tra tồn tại và đối chiếu size với source trước native multipart. Materialized directory được cleanup best-effort sau success/failure; source picker không bị xóa.
- Development diagnostics chỉ chứa URI category/scheme, method, size, existence, sanitized native error và HTTP status. Full local path, filename, content, Authorization và secrets không được log.
- Backend contract, authentication refresh, field `file`, MIME, 500 MB validation và project cleanup/chống duplicate không đổi. Physical-device success vẫn là điều kiện hoàn thành.

## S24.3.10 Fresh Picker Grant Strategy (2026-10-10)

- `copyToCacheDirectory: true` trong Expo Go SDK 57 trên thiết bị đã trả `file://` thuộc host cache: `getInfoAsync` thấy metadata nhưng native upload và modern copy đều bị từ chối READ. Không giải quyết bằng storage permission vì source nằm trong sandbox của Expo Go host.
- Mobile dùng `copyToCacheDirectory: false` để nhận URI do Android system picker cấp quyền, rồi materialize ngay trong cùng async selection callback bằng modern `File.copy()` vào project-owned `Paths.cache`. URI provider không bị decode/normalize/reconstruct và không được lưu vào React state.
- Chỉ staged asset tồn tại, đúng size và nằm trong app cache mới được chọn cho upload. Permission/stale failure yêu cầu fresh picker selection; không retry lại inaccessible source. Staged file được giữ cho network/HTTP retry và cleanup khi replace/remove/unmount/success.
- Native multipart field `file`, original name/MIME, 500 MB validation, Bearer refresh-once và project cleanup/chống duplicate được giữ nguyên. Không có full URI/token/file content trong diagnostics.
- Người dùng đã xác nhận same-callback staging và physical Android MP4 upload sau S24.3.10: **PASS** trên Expo Go. Giữ nguyên chiến lược này; không quay lại host-cache URI hoặc FormData/Blob.

## S24.3.11.1 Mobile Project UI Decision (2026-10-10)

- Mobile project list ưu tiên bố cục co giãn cho Android hẹp: status filter là horizontal scroll có padding an toàn; pagination luôn có dòng thông tin riêng và hai nút điều hướng cùng hàng.
- Project card, Project Detail và Transcript header cho phép nội dung dài xuống dòng mà không che badge hay thao tác. Nút nhỏ và chip có vùng chạm tối thiểu 44 px; lựa chọn ngôn ngữ tự phân bố theo chiều rộng khả dụng.
- Badge bản ghi nhận mã trạng thái nguyên bản để `getDisplayStatus` ánh xạ `NOT_STARTED` thành `Chưa bắt đầu`; không biến mã thành `NOT STARTED` trước khi ánh xạ.
- Transcript chỉ cho phép bắt đầu STT khi có metadata media nguồn. Đây là kiểm tra hiển thị/an toàn phía client, không thay đổi API hay tự gọi paid provider.
- S24.3.10 Android upload implementation, auth/navigation, Backend, Customer Web và Admin Web không thay đổi. Source/Expo/Android export PASS; physical Android UI verification vẫn **NOT RUN**.

## S24.3.11.2 Mobile Project Detail Decisions (2026-10-10)

- Project update lấy response thật từ `PATCH /projects/:id`, enrich và thay đúng entry trong repository cache. Detail subscribe cache này thay vì giữ bản sao local độc lập; Projects page reload khi focus để đồng bộ dữ liệu server sau khi quay lại.
- Project edit contract phía Mobile khớp backend: `name` trim, bắt buộc và tối đa 150; `description` trim và tối đa 1.000; `sourceLanguage` chỉ nhận code có trong catalog Mobile. Save dùng synchronous ref gate để ngăn hai request đồng thời trước khi state `saving` kịp render.
- Update không tạo project, không tự thay status và không can thiệp upload/cleanup S24.3.10. Server response là nguồn sự thật cho status và persisted fields.
- Workflow route tiếp tục truyền project ID qua params. STT/Translation/TTS chỉ chạy sau hành động/confirmation hiện có; mở màn hình không tự gọi paid provider. UPLOADED project có prerequisite/empty states cho các bước chưa sẵn sàng.
- Media nguồn chỉ expose metadata qua authenticated ownership-checked API; hiện không có backend source-media streaming route. Không thêm public/raw URL hoặc playback giả. Protected narration/result vẫn dùng Bearer download vào cache và local playback.
- Automated/source/Expo export validation PASS; người dùng đã xác nhận Physical Android Project Detail functional test **PASS 7/7**, nên S24.3.11.2 **COMPLETED**.

## S24.3.12 Mobile STT Workflow Decisions (2026-10-10)

- STT backend là synchronous request: `POST /projects/:id/transcription` giữ request đến khi provider và transaction hoàn tất. Project status vẫn chuyển `TRANSCRIBING` ngay từ đầu; Mobile hiển thị trạng thái local trong request và poll `GET /projects/:id` mỗi 2,5 giây chỉ khi mở lại một project đang `TRANSCRIBING`.
- Không có automatic paid request: mount chỉ GET transcript/project. POST cần native confirmation; cancellation không phải lỗi. Client ref gate và backend atomic status guard cùng ngăn duplicate submission.
- Backend cho phép start/retry từ `UPLOADED`, `FAILED`, `TRANSCRIBED`; `TRANSCRIBING` trả 409. Success tạo/cập nhật transcript trong transaction rồi chuyển `TRANSCRIBED`; provider failure chuyển `FAILED`, giữ response sanitized và không xóa transcript thành công cũ trước khi có transaction mới.
- Transcript segment response có stable database `id`, zero-based `index`, optional-safe numeric timestamps và text. Mobile fallback key chỉ hỗ trợ response cũ; timestamp chỉ render khi start/end đều tồn tại.
- Mobile STT request dùng Bearer/refresh-once từ API client, timeout 5 phút và thông báo lỗi tiếng Việt. Sau POST thực sự, project repository luôn refresh để phản ánh `TRANSCRIBED` hoặc `FAILED`.
- Regression chỉ dùng mock provider và test-owned records/files có cleanup; không gọi OpenAI/Whisper thật và không sửa project development hiện có. Physical Android STT vẫn **NOT RUN**.

## S25.3 Customer Navigation and Interaction Decisions (2026-10-10)

- Canonical Customer navigation labels trên Web/Mobile là: Bảng điều khiển, Dự án của tôi, Tạo thuyết minh, Lịch sử và Tài khoản. Route/Expo Router architecture không đổi.
- Web tiếp tục dùng `/settings` cho màn Tài khoản. Mobile chỉ hiển thị một tab Tài khoản; tab Settings placeholder bị ẩn, còn route cũ delegate sang Account để giữ tương thích điều hướng hiện có.
- Account chỉ hiển thị dữ liệu phiên/API đang hỗ trợ: họ tên, email, vai trò và logout. Không giả lập profile edit, password, avatar hoặc system setting. Loading/error/retry và logout confirmation là bắt buộc.
- Paid STT/Translation/TTS action luôn cần confirmation nhất quán; cancel không được gọi API. Web dùng browser confirmation guard hiện có, Mobile giữ native Alert. Auth forms có synchronous ref lock bên cạnh loading state để chống double-submit.
- Copy Customer ưu tiên tiếng Việt; thuật ngữ người dùng dùng “máy chủ”, “giọng đọc” và dictionary status thống nhất, trong khi technical/API identifiers giữ nguyên.
- S25.3 source validation PASS: Web 7/7 tests + lint/typecheck/build; Mobile 47/47 tests + lint/typecheck; Expo Doctor 21/21; Android Hermes export 1.414 modules. Browser và physical Android runtime **NOT RUN**. Android upload implementation không đổi; S24.3.12.2 vẫn POSTPONED.

## S25.4 Customer Visual System Decisions (2026-10-10)

- Canonical visual tokens cho cả Web/Mobile: primary `#5850EC`, accent `#794CFF`, background `#F8FAFC`, surface trắng, text chính `#0F172A`; spacing 4px scale; radius 6/10/12/20/full; shadow dùng sắc `#0F172A` với opacity thấp.
- Web tiếp tục dùng CSS variables và CSS modules hiện có; Mobile tiếp tục dùng React Native `StyleSheet`/theme tokens. Không tạo shared runtime package và không đưa browser CSS vào React Native.
- Button có primary/secondary/ghost/danger, touch/click target tối thiểu 44px, hover/pressed/disabled/loading rõ ràng. Input/select/textarea có min-height 48px, focus/error/disabled state. Card/Badge/Progress/Empty/Error/PageHeader dùng cùng hierarchy và semantic colors.
- Customer chưa có shared custom Dialog thực tế. Paid/destructive confirmation tiếp tục dùng guard/browser confirmation trên Web và native Alert trên Mobile; không thêm dependency chỉ để thay đổi presentation trong bước design-system.
- Token tests khóa palette và minimum interaction sizes giữa hai nền tảng. Validation: Web 9/9 tests + lint/typecheck/build; Mobile 49/49 tests + lint/typecheck; Expo Doctor 21/21; Android Hermes export 1.414 modules.
- Browser/physical-device visual smoke **NOT RUN**. Business logic, route, backend/API, native upload, auth refresh và protected media không đổi. S24.3.12.2 vẫn POSTPONED.

## S25.5 Dashboard and Project List Decisions (2026-10-10)

- Dashboard/Web và Mobile cùng ưu tiên: welcome → statistics → supported quick actions → recent projects. Statistics chỉ derive từ project repository/API hiện có; không tạo analytics hoặc số liệu giả.
- Canonical CTA là “Tạo thuyết minh”; danh sách là “Dự án của tôi”. Web giữ bốn workflow shortcuts hiện hữu, Mobile cung cấp hai destination trực tiếp phù hợp màn hình nhỏ: create và project list.
- Loading/error/empty không được làm mất context điều hướng. Dashboard Mobile vẫn giữ statistics/actions; Projects Mobile vẫn giữ heading/search/filter trong khi phần danh sách hiển thị loading/error/retry.
- Project list hai nền tảng tiếp tục dùng server-side pagination và reset page về 1 khi search/status đổi. Mobile tiếp tục reload khi focus để đồng bộ cache sau Project Detail; không thay repository contract.
- Web responsive card/pagination có breakpoint 600/420/360px, tránh horizontal page overflow ở 375/320px. Mobile action/filter/pagination có target tối thiểu 44px, accessibility labels và text wrapping.
- Source validation: Web 11/11 tests + lint/typecheck/build; Mobile 51/51 tests + lint/typecheck; Expo Doctor 21/21; Android Hermes export 1.414 modules. Browser NOT RUN (Chrome automation unavailable), physical Android NOT RUN (`adb` unavailable).
- Không thay backend/API/data, native upload, auth refresh, Project Detail hoặc AI workflow. S24.3.12.2 vẫn POSTPONED.
