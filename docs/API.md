# API Status and Conventions

## UI07.6.6.1 — Transcript revision & downstream provenance foundation (2026-10-19)

Schema additive, không migration tự động:

- `Transcript.revision?: integer >= 1`: content write mới khởi tạo `1`; mỗi lần thay toàn bộ transcript hợp lệ tăng đơn điệu. `updatedAt` không được dùng làm revision. Transcript legacy thiếu field là `UNKNOWN`, không được tự gán revision khi đọc.
- `Translation.revision?`, `Translation.sourceTranscriptRevision?` liên kết bản dịch với đúng revision Transcript. GROUPS_V1 tiếp tục giữ SHA-256 `sourceRevision` và nay đồng thời giữ monotonic transcript revision.
- `Narration.revision?`, `Narration.sourceTranslationRevision?` liên kết audio với đúng Translation revision.
- `Result.sourceNarrationRevision?` liên kết video kết quả với đúng Narration revision.
- `ProcessingJob` có source ID/revision tương ứng cho Translation, TTS và Video Processing. Job hoàn tất chỉ được commit nếu snapshot nguồn vẫn khớp trong transaction.

`artifact-provenance.service.ts` phân loại `CURRENT / STALE / UNKNOWN`:

- `CURRENT`: source ID và revision của artifact khớp chính xác source hiện hành, đồng thời toàn bộ upstream chain CURRENT.
- `STALE`: có đủ provenance và xác định source ID/revision đã thay đổi.
- `UNKNOWN`: thiếu provenance, revision không hợp lệ, source không tồn tại hoặc dữ liệu legacy không đủ bằng chứng. UNKNOWN không bao giờ được coi là CURRENT.

Luồng tạo mới fail-closed:

- Translation chụp Transcript revision trước provider và tái kiểm tra transcript/segments/job snapshot trong transaction lưu.
- TTS chỉ dùng Translation CURRENT; chụp Translation revision và tái kiểm tra toàn chuỗi trước khi tạo Narration READY.
- Video processing chỉ dùng Narration CURRENT; chụp Narration revision và tái kiểm tra Transcript → Translation → Narration trước khi tạo Result/COMPLETED.
- Workflow summary batch lọc bỏ artifact/job STALE hoặc UNKNOWN mà không thêm N+1 query và không xóa dữ liệu cũ.

`GET transcript` thêm `revision` (`null` cho legacy). Danh sách Translation thêm `provenanceState`; đọc một Translation cụ thể fail-closed với `409 TRANSLATION_PROVENANCE_INVALID` nếu không CURRENT. Tạo artifact mới từ transcript legacy thiếu revision trả `409 TRANSCRIPT_REVISION_UNAVAILABLE` cho đến khi có kế hoạch migration/khởi tạo được phê duyệt.

Chưa có PATCH transcript segment, UI edit, migration hay endpoint xóa artifact trong bước này.

## UI07.6.6 — Chỉnh sửa thủ công phân đoạn bản ghi (BLOCKED, 2026-10-19)

Audit source xác nhận Backend hiện chỉ có `POST /api/projects/:id/transcription` và `GET /api/projects/:id/transcript`; chưa có endpoint cập nhật transcript an toàn để tái sử dụng. `Transcript` và `TranscriptSegment` cũng chưa có revision/version dùng cho optimistic concurrency.

Chưa triển khai mutation vì các ràng buộc dữ liệu sau chưa được đáp ứng:

- Legacy translation `SEGMENTS_V1` chỉ kiểm tra tập `sourceSegmentId`; sửa nội dung nhưng giữ nguyên ID sẽ khiến bản dịch cũ vẫn bị coi là hiện hành.
- `Narration` và `Result` chưa lưu provenance của transcript/translation revision. Artifact READY cũ có thể tiếp tục được workflow và TTS sử dụng sau khi transcript thay đổi.
- Workflow summary hiện đọc artifact READY, chưa có trạng thái stale để phân biệt dữ liệu phụ thuộc phiên bản transcript cũ.
- Không có compare-and-set để phát hiện hai phiên cùng sửa một phân đoạn; timestamp Mongoose không phải write precondition.

Contract tối thiểu đề xuất, **chưa triển khai**:

- Transcript có revision ổn định (hash nội dung chuẩn hóa hoặc version tăng đơn điệu).
- Endpoint owner-only cập nhật đúng một segment nhận `text` đã trim và `expectedRevision`; giữ nguyên segment ID, sequence, start/end, đồng thời cập nhật `fullText` và revision trong một transaction/compare-and-set.
- Revision không khớp trả `409 TRANSCRIPT_REVISION_CONFLICT`; transcript không READY, STT đang xử lý, workflow `BLOCKED/UNKNOWN`, hoặc artifact policy chưa cho phép đều phải fail-closed.
- Translation, Narration và Result lưu source revision/provenance và có trạng thái stale không phá hủy; workflow/TTS chỉ sử dụng artifact còn current. Không tự xóa bản dịch đã duyệt hay artifact đã tạo.
- Server chỉ lấy owner từ JWT/project middleware, chỉ cho sửa trường `text`, validate nội dung Unicode tiếng Việt và giới hạn độ dài thống nhất với Web.

Do thay đổi trên cần quyết định schema, migration/backward compatibility và chính sách đối với bản dịch/narration/result đã tồn tại, bước này không thêm route, schema hay Database write.

## S25.7.9.3.3 — GROUPS_V1 (source implemented, runtime chưa kiểm thử)

Mọi endpoint bên dưới dùng JWT CUSTOMER ACTIVE và ownership dự án. Plan/preview/draft/approve yêu cầu `GROUP_TRANSLATION_ENABLED=true` (mặc định OFF). Envelope `{ success: true, data: ... }` và error JSON hiện có giữ nguyên.

| Method / endpoint (prefix `/api/projects/:id/translations`) | Request / response |
| --- | --- |
| GET `/plan/:targetLanguage` | `{ plan: { projectId, sourceLanguage, targetLanguage, sourceRevision, groupingVersion, sourceSegmentCount, groups } }`, chỉ đọc |
| POST `/preview` | Body `{ targetLanguage, sourceRevision, groupingVersion: "phrase-candidates-v1", groups: [[sourceSegmentId, ...], ...], idempotencyKey: UUID }`; trả `{ draft }`, không ghi DB |
| GET `/drafts/:draftId` | Trả `{ draft }` còn hạn của đúng chủ dự án, không gọi AI |
| POST `/drafts/:draftId/approve` | Body strict `{ outputDigest: SHA256, reviewed: true }`; trả `{ translation }` đã duyệt, không gọi AI |
| GET `/:targetLanguage?format=groups-v1` | Trả `{ translation }`, discriminator `alignmentFormat: SEGMENTS_V1 / GROUPS_V1` |

Group chứa `groupId, sequence, ordered sourceSegmentIds, sourceText, translatedText, startTime, endTime`; DTO bản đã lưu thêm `targetLanguageCode` suy từ parent. Draft: `state=DRAFT`, `draftId, expiresAt, outputDigest, sourceRevision, groupingVersion`. Bản đã lưu: `state=APPROVED`, `fullText`, `review { method: MANUAL_V1, reviewedAt, outputDigest }`, `groupCount/sourceSegmentCount`; không có mảng segment giả. Reviewer luôn lấy từ JWT ở server.

GET cũ không có format vẫn đọc legacy; gặp grouped trả409 `TRANSLATION_FORMAT_UNSUPPORTED`. POST legacy không được ghi đè grouped. List thêm `alignmentFormat` và count đúng format; legacy `segmentCount` giữ nguyên.

Lỗi:400 `VALIDATION_ERROR`, `SAME_SOURCE_TARGET_LANGUAGE`, `TRANSLATION_LANGUAGE_NOT_SUPPORTED`;401/403 auth/RBAC;404 project/transcript/translation;409 `SOURCE_REVISION_MISMATCH`, `TRANSLATION_MAPPING_FAILED`, `TRANSLATION_REVIEW_REQUIRED`, `TRANSLATION_DRAFT_CHANGED`, `TRANSLATION_ALREADY_EXISTS`, `INVALID_PROJECT_STATE`, `TRANSLATION_FORMAT_UNSUPPORTED`;410 `TRANSLATION_DRAFT_EXPIRED`;413 `TRANSLATION_DRAFT_TOO_LARGE`;503 `GROUP_TRANSLATION_DISABLED`, `TRANSLATION_DRAFT_CAPACITY`, `TRANSLATION_NOT_CONFIGURED`;502 các mã lỗi Gemini Translation đã sanitise (key/model/quota/timeout/network/response/mapping/provider).

Nháp RAM TTL15 phút, tối đa50 request/nháp,128KiB/nháp; input snapshot tối đa96KiB/1000 cụm/10000 source segments. Một owner/project/target/revision bị khóa trong TTL: cùng idempotency key/payload trả cùng kết quả hoặc lỗi; key/payload khác trả409, kể cả sau lỗi chưa rõ kết quả. Pending không bị evict. Sau TTL/restart cần thao tác và xác nhận mới; không bảo đảm exactly-once qua restart/multi-instance. Xem [GROUPS_V1_IMPLEMENTATION.md](GROUPS_V1_IMPLEMENTATION.md).

## S25.7.8.9 — File phương tiện nguồn (Implemented)

- `GET /api/projects/:id/media/file` và HEAD: Bearer access JWT, CUSTOMER, user ACTIVE và ownership theo middleware hiện có. Không ký URL/token query hoặc public uploads. Trả đúng file Media hiện tại theo DB, không nhận storage path từ client; kiểm tra path containment và realpath để chặn symlink ra ngoài uploads.
- Chỉ MP3 `audio/mpeg` và MP4 `video/mp4`. `200` full streaming, `Content-Length`, `Accept-Ranges: bytes`, `Cache-Control: private, no-store`, `nosniff`. Single Range `bytes=start-end`, `start-`, `-suffix` trả206/Content-Range; end quá size được clamp, range sai hoặc multi-range trả416/`bytes */size`. HEAD trả metadata full, không body. Node createReadStream, dừng khi client disconnect; không đọc full file vào RAM server.
- Lỗi chuẩn401 auth,403 role/blocked,404 PROJECT_NOT_FOUND/MEDIA_NOT_FOUND/MEDIA_FILE_MISSING,400 ID không hợp lệ,415 UNSUPPORTED_MEDIA_TYPE. Không trả filename nội bộ/path/token. Không ghi Database/schema/transcript.
- Web gọi endpoint bằng apiBlob (Bearer + refresh-once hiện có), rồi phát từ object URL cục bộ; không dùng API URL trực tiếp trong HTML src. Tải toàn bộ tệp khi người dùng nhấn tải, không progressive streaming trên Web; browser seek trong blob đã tải, nên file lớn cần bộ nhớ/thời gian tương ứng. URL revoke + abort khi unmount, không cache persistent.
- Tests dùng route/auth thật, Mongoose mocks và fixture byte trong temp riêng; không kết nối Atlas hoặc gọi AI. Browser playback/E2E chưa chạy.

## Current: S23 FFmpeg / Media Processing

Backend hiện triển khai:

- `GET /api` — metadata tối thiểu của API.
- `GET /api/health` — trạng thái service và trạng thái kết nối MongoDB lấy trực tiếp từ Mongoose. Server chỉ listen sau khi kết nối database thành công.
- `POST /api/auth/register` — Customer tự đăng ký.
- `POST /api/auth/login` — đăng nhập chung cho Customer và Admin.
- `POST /api/auth/refresh` — rotation access/refresh token.
- `POST /api/auth/logout` — revoke refresh session.
- `GET /api/auth/me` — thông tin user hiện tại, yêu cầu access token.
- `PATCH /api/auth/me` — cập nhật riêng `fullName` của tài khoản đã xác thực (S25.7.7.9).
- Customer Project CRUD và source Media subresource dưới `/api/projects`.
- `POST /api/projects/:id/transcription` và `GET /api/projects/:id/transcript`.

## Transcription API (Implemented)

### S25.7.8.4 — Provider Gemini

Endpoint và success DTO không đổi: `POST /api/projects/:id/transcription` (Bearer CUSTOMER + ownership, không body), `GET /api/projects/:id/transcript`. Gemini là default khi thiếu `STT_PROVIDER`; đặt `STT_PROVIDER=gemini`, `GEMINI_API_KEY` chỉ tại backend, `GEMINI_STT_MODEL=gemini-3.5-transcribe`. `.env` hiện có không tự ghi đè; `STT_PROVIDER=openai` vẫn giữ Whisper với `OPENAI_API_KEY`/`STT_MODEL` riêng. Translation/TTS không chuyển provider.

- SDK `@google/genai` 2.28.0: Files API + Interactions transcription verbatim/word timestamps, language hint `vi-VN`; không dịch hoặc smart formatting, không tự fallback model. Kiểm tra model bằng SDK models.get với cùng key trước khi upload. Chưa xác minh quyền model trên key thật vì chưa được duyệt gọi API.
- MP3 gửi trực tiếp; MP4/video và audio MP4 tách WAV tạm bằng FFmpeg, FFprobe xác nhận có audio và thời lượng. Giới hạn ứng dụng bảo thủ: nguồn/audio tạm tối đa500MiB và nguồn tối đa1 giờ (không phải tuyên bố giới hạn của Gemini). Dùng path nội bộ đã kiểm tra ownership; không đổi storage file hoặc schema.
- Mỗi word annotation thật thành một segment (`start_offset/end_offset` giây → `startTime/endTime`, sequence1-based); từ chối thiếu/âm/đảo chiều/chồng lấn hoặc vượt thời lượng, không sort/clip/suy diễn timestamps. Nếu không có lời nói hoặc annotations hợp lệ, không lưu transcript. Không thể bảo đảm độ chính xác nhận dạng chỉ bằng validation cấu trúc.
- Deadline SDK120s; không tự retry transcription; kiểm tra Files ACTIVE, cleanup remote file do request tạo và thư mục WAV tạm riêng. Remote cleanup là best effort (Files có cơ chế hết hạn). Không log key/URI/file content/raw response; development log chỉ provider/code/httpStatus. `store:false` cho interaction.

| Lỗi mới | HTTP | Ý nghĩa |
| --- | --- | --- |
| `STT_INVALID_KEY` | 503 | Key bị provider từ chối |
| `STT_MODEL_UNAVAILABLE` | 503 | Model không hỗ trợ/cấu hình sai hoặc không có quyền |
| `STT_QUOTA_EXCEEDED` | 429 | Quota hoặc rate limit |
| `STT_INVALID_FILE` | 422 | Không đọc/probe/extract được, thiếu audio hoặc vượt thời lượng ứng dụng |
| `STT_NO_SPEECH` | 502 | Không có lời nói trong output |

Các lỗi cũ giữ: thiếu key503 `STT_NOT_CONFIGURED`, file quá lớn413, timeout/response/provider error502. Retry thất bại không ghi đè transcript/segments cũ; project/job vẫn ghi FAILED. Không có fake transcript trong runtime.

Nguồn: [Audio transcription chính thức](https://ai.google.dev/gemini-api/docs/transcribe), [SDK Google Gen AI](https://github.com/googleapis/js-genai). Source/mock tests không thay thế real-provider validation.

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

### Project workflow summary (UI06.7.2)

`GET /api/projects` và `GET /api/projects/:id` giữ nguyên toàn bộ trường Project hiện có và bổ sung trường `workflow`. Đây là contract additive; các response create/update không bắt buộc trả trường này.

```text
workflow: {
  step: UPLOAD | TRANSCRIPT | TRANSLATION | VOICE | GENERATE | RESULT | UNKNOWN
  state: READY | PROCESSING | FAILED | COMPLETED | BLOCKED
  canResume: boolean
  mediaType: AUDIO | VIDEO | null
  targetLanguage: { code, source: JOB | TRANSLATION | NARRATION | RESULT } | null
  processing: { jobId, type, status, progress } | null
  failure: { jobId, type, code, failedAt } | null
  artifact: { narrationReady, resultReady }
}
```

- Backend trả domain step, không trả route của frontend và không tự khởi chạy/retry tác vụ.
- `targetLanguage` chỉ có khi có nguồn đáng tin cậy từ job hoặc artifact READY; lỗi enrichment không được biến thành ngôn ngữ suy đoán.
- `processing.progress` bảo toàn giá trị `0`. `failure.code` chỉ trả mã nằm trong allow-list; lỗi provider không nhận diện được được chuẩn hóa thành `PROCESSING_FAILED`, không lộ raw error.
- Với `FAILED`, job mới nhất phải là job failed có `completedAt` và đủ artifact tiên quyết. Bằng chứng thiếu/mâu thuẫn trả `UNKNOWN/BLOCKED`, `canResume=false`.
- Audio có Narration READY được coi là Result artifact. Từ UI06.7.3, TTS completion chuyển Project nguồn AUDIO sang `COMPLETED/100`; workflow summary vẫn nhận diện bản ghi legacy còn ở `GENERATING_AUDIO`.
- List resolver đọc Media, Transcript, Translation, Narration, Result và ProcessingJob theo batch cho toàn bộ page; không query theo từng Project. Tất cả project ID đầu vào đã được giới hạn bởi ownership của authenticated CUSTOMER.

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
| `PATCH` | `/api/auth/me` | Bearer JWT + strict JSON `{ "fullName": "Nguyễn Ánh" }` | `200`, `{ user: safeUser }` trong success envelope | `400 VALIDATION_ERROR`, `401 AUTH_REQUIRED/INVALID_TOKEN/TOKEN_EXPIRED`, `403 ACCOUNT_BLOCKED`, `500 INTERNAL_SERVER_ERROR` |

S25.7.7.9: tên trim đầu/cuối, dài 2–100 ký tự theo JavaScript string length, hỗ trợ tiếng Việt; mọi trường dư (userId/id/email/role/password…) bị từ chối. ID luôn lấy từ user do authentication middleware xác minh. Chỉ `$set.fullName` trên user ACTIVE, Mongoose tự cập nhật timestamp; không đổi email/role/password/schema/session. GET `/auth/me` sau reload đọc lại Database. Không tạo `/users/me` trùng; phần đề xuất dưới đây là kế hoạch lịch sử, không phải endpoint đã triển khai. Kiểm thử mới dùng model mock, không ghi Atlas.

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

### Gemini Translation — S25.7.9.2

S25.7.9.3.2 DESIGN ONLY: [Group Translation design](TRANSLATION_GROUP_DESIGN.md) đề xuất preview/draft/manual approve và format-negotiated GROUPS_V1 DTO. Các endpoints/fields/errors đó **chưa tồn tại**; contract runtime hiện tại vẫn segment-based và fail-closed word-level. Không tự thay schema hoặc dùng21 fake segments để biểu diễn nhóm.

S25.7.9.3.1: Gemini word-level transcript gồm nhiều segment toàn single-word bị từ chối trước tạo job/provider với HTTP409 `TRANSLATION_MAPPING_FAILED` và thông báo cần ánh xạ theo cụm/câu. Provider cũng guard trước metadata/generation. Đủ ID/thứ tự/nonempty không chứng minh semantic alignment; không tự chia English sentence thành21 fragments hoặc tạo timestamp. Schema/DTO hiện tại chưa hỗ trợ many-to-many phrase alignment; thay đổi này chỉ fail-closed, không thêm schema/endpoint. Metadata model bằng key hiện tại đã kiểm tra1 request PASS; generation thực chưa chạy.

- Giữ `POST /api/projects/:id/translations` body `{ targetLanguage }`, `GET /api/projects/:id/translations` và `GET /api/projects/:id/translations/:targetLanguage`; JWT CUSTOMER ACTIVE và ownership hiện có không đổi. Không có endpoint/collection/schema mới. Validation language-code hiện tại + Language active trong catalog thật; target thiếu/inactive trả400 TRANSLATION_LANGUAGE_NOT_SUPPORTED trước provider. Web chọn từ catalog đang có, không tạo danh sách provider giả; DB integration fixtures cần Language active tương ứng.
- Default/`TRANSLATION_PROVIDER=gemini` dùng `@google/genai`2.28.0, `GEMINI_API_KEY` backend-only, `GEMINI_TRANSLATION_MODEL=gemini-3.8-flash`. OpenAI explicit vẫn dùng `TRANSLATION_MODEL`; STT/TTS không đổi. Model text/structured output xác minh qua [tài liệu Google](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en); quyền key cụ thể chưa xác minh. Khi người dùng nhấn Dịch, `models.get` kiểm tra generateContent trước một generation request; timeout120s, SDK attempts1, không auto retry/fallback.
- Gửi full transcript + toàn bộ segment gốc, ID/start/end/index; không gửi cụm display. Structured response chỉ nhận segments `{index,sourceSegmentId,text}`, đủ/duy nhất/đúng thứ tự/không rỗng, không nhận timestamps do AI tạo. Lưu bằng ID segment thật/timestamp nguồn có sẵn, transaction hiện tại; kiểm tra lại nguồn trước ghi. Backend GET/POST idempotence chỉ dùng bản dịch khớp tập source IDs hiện tại; bản dịch stale trả404 TRANSLATION_NOT_FOUND để có thể dịch lại, không xóa dữ liệu cũ ở GET.
- Gemini errors sanitized: TRANSLATION_NOT_CONFIGURED(503); TRANSLATION_INVALID_KEY, TRANSLATION_MODEL_UNAVAILABLE, TRANSLATION_QUOTA_EXCEEDED, TRANSLATION_TIMEOUT, TRANSLATION_NETWORK_ERROR, TRANSLATION_INVALID_RESPONSE, TRANSLATION_MAPPING_FAILED, TRANSLATION_PROVIDER_ERROR(502). HTTP401/403/404/429 từ provider không trả raw payload. Development logging chỉ provider/code/httpStatus. Lỗi không ghi đè bản dịch đã lưu.
- Giới hạn: mapping1:1 là kiểm tra cấu trúc, không chứng minh chất lượng dịch hoặc alignment ngữ nghĩa từng từ. Prompt dùng toàn ngữ cảnh, giữ tên riêng/địa chỉ/số liệu và yêu cầu trả rỗng nếu không thể map chính xác; không chia câu dịch theo số từ hay tạo timestamp. Với word-level STT, ngôn ngữ đổi trật tự từ có thể không map tự nhiên1:1; cần duyệt kết quả thật trước công bố workflow PASS. Không có schema mới để lưu phrase-alignment.
- Source/mock PASS; real Gemini/model metadata bằng key dự án, Atlas persistence và browser E2E NOT RUN. Không gửi transcript ra Google trong validation này.

### Translation boundary (S8 — lịch sử)

**S8 HISTORICAL MOCK:** `translationService.get(projectId, targetLanguage)`, `translate(projectId, transcript, targetLanguage)` and `save(projectId, translation)` originally used sample data and module memory. Current Customer Web uses backend GET/POST and read-only presentation; profile/transcript/translation data is not generated from these historical mock services.

**IMPLEMENTED:** `POST /api/projects/:id/translations` với `{ targetLanguage }`, `GET /api/projects/:id/translations` và `GET /api/projects/:id/translations/:targetLanguage`. Các route yêu cầu JWT, role `CUSTOMER` và ownership. POST xử lý đồng bộ bằng một structured provider request, lưu full text cùng translated segments liên kết source segment. Một Transcript hỗ trợ nhiều target language; target đã hoàn tất trả idempotently, active job cùng target trả `TRANSLATION_ALREADY_RUNNING`.

Lifecycle: `TRANSCRIBED|TRANSLATED|FAILED → TRANSLATING → TRANSLATED`; lỗi provider chuyển sang `FAILED` và có thể retry. Các lỗi chính gồm `TRANSCRIPT_NOT_FOUND`, `INVALID_PROJECT_STATE`, `SAME_SOURCE_TARGET_LANGUAGE`, `TRANSLATION_NOT_FOUND`, `TRANSLATION_NOT_CONFIGURED`, `TRANSLATION_TIMEOUT`, `TRANSLATION_INVALID_RESPONSE` và `TRANSLATION_PROVIDER_ERROR`.

### Voice and narration boundary (S9)

**CURRENT:** `voiceService.getVoices(languageCode)` and `getVoice(id)` return active mock identities. `previewVoice(id)` is a short abortable UI simulation with no audio. `translationService.getSavedTranslation(projectId, language?)` retrieves the selected saved translation (or latest valid saved translation for a direct link with no language). Navigation carries the chosen target language.

`narrationService.getConfig(projectId, language?)` and `saveConfig(projectId, config)` keep configuration in module memory, isolated by project and language. Configuration contains project/translation IDs, language, voice ID and speed; an internal source revision prevents stale saves. Language and active voice availability are validated. There is no `audioPath`, generated audio or provider request.

**IMPLEMENTED S22:** `POST /api/projects/:id/narrations` nhận `{ targetLanguage, voiceId? }`; `GET /api/projects/:id/narrations`; `GET /api/projects/:id/narrations/:narrationId`; và protected `GET /api/projects/:id/narrations/:narrationId/audio`. Tất cả yêu cầu JWT, role `CUSTOMER` và Project ownership. Xử lý đồng bộ; Voice được resolve server-side theo Language/provider, voice mặc định từ environment. Identity idempotent là Translation + Voice + speed; active job trùng trả `TTS_ALREADY_RUNNING`.

Lifecycle hiện tại: `TRANSLATED|FAILED → GENERATING_AUDIO`; sau TTS thành công, transaction chỉ đặt Project `COMPLETED/100` khi source Media hiện tại là AUDIO, Narration vừa tạo là READY/đúng Project và không còn job active mâu thuẫn. Source VIDEO giữ `GENERATING_AUDIO/100` để bước xử lý video tiếp quản; chỉ transaction tạo Result video hợp lệ mới đặt `COMPLETED`. Narration, TTS job và Project completion được ghi trong cùng transaction; update có filter trạng thái để không ghi đè Project/job đã thay đổi. Lỗi chính: `TRANSLATION_NOT_FOUND`, `TRANSLATION_EMPTY`, `MEDIA_NOT_FOUND`, `VOICE_NOT_FOUND`, `VOICE_INACTIVE`, `VOICE_NOT_SUPPORTED`, `TTS_ALREADY_RUNNING`, `TTS_NOT_CONFIGURED`, `TTS_TEXT_TOO_LARGE`, `TTS_TIMEOUT`, `TTS_INVALID_RESPONSE`, `TTS_PROVIDER_ERROR`, `NARRATION_NOT_FOUND`, `NARRATION_AUDIO_NOT_FOUND`.

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

> S24.2 update: Customer Web hiện gọi các Customer API được mô tả trong tài liệu này thay cho mock runtime. Protected narration/result files được tải bằng Bearer JWT qua fetch Blob. Các mô tả `CURRENT` cũ về mock Customer UI phía trên chỉ còn là lịch sử S7–S11, không phản ánh runtime `frontend-web` hiện tại. Backend vẫn chưa có PUT/PATCH transcript hoặc translation.

> S24.3 update: Customer Mobile cũng gọi các Customer API thật. Artifact được tải với Bearer JWT bằng `expo-file-system` vào cache riêng rồi phát bằng `expo-audio`/`expo-video` hoặc chia sẻ bằng `expo-sharing`; JWT không được gắn vào URL. Các mô tả mock lịch sử phía trên không phản ánh runtime `frontend-mobile` hiện tại.

S24.2.1 Customer Projects gọi `GET /api/projects?page=<n>&limit=10&search=<text>&status=<canonical-status>`. UI dùng trực tiếp `pagination { page, limit, total, totalPages }`, reset `page=1` khi đổi search/status và không còn xem 100 record đầu là toàn bộ dữ liệu.

All responses use the standard success/error envelope. Query objects are strict; unknown or invalid values return `400 VALIDATION_ERROR`.

### Customer Voice Catalog

| Method | Route | Role | Description |
| --- | --- | --- | --- |
| GET | `/api/voices?language=<code>` | CUSTOMER | Active languages and active voices for the configured TTS provider. `language` is optional. |

Voice DTO exposes the database `id` accepted as `voiceId` by the narration API, language metadata, provider name, display fields and optional preview URL. It does not expose `providerVoiceId`, secrets or provider payloads. Empty catalog/filter returns empty arrays.

`npm run seed:voices` is an explicit idempotent development operation. It runs only for a validated OpenAI `TTS_DEFAULT_VOICE`, only when that provider has no Voice records, and only for existing active Language records. It does not call OpenAI or create languages.

S25.7.9.2.2 bổ sung `npm run seed:languages` (mặc định dry-run; `--offline` để preview không kết nối DB). Catalog đề xuất vi/en/ja/ko/zh/fr, cần confirm env/DB và approval flag riêng trước ghi, unique code index prerequisite, chỉ setOnInsert/bỏ qua existing; không tạo voices hoặc sửa schema/API. Chưa seed thật. Xem [LANGUAGE_CATALOG.md](LANGUAGE_CATALOG.md). `/api/voices` vẫn trả active languages kể cả khi voices rỗng; Language metadata không bảo đảm TTS runtime khả dụng.

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
## UI07.6.6.2 — Chỉnh sửa an toàn một phân đoạn bản ghi

`PATCH /api/projects/:id/transcript/segments/:segmentId` yêu cầu JWT CUSTOMER và quyền sở hữu dự án.

```json
{
  "text": "Nội dung đã chỉnh sửa",
  "expectedRevision": 3
}
```

- `text` được trim, không được rỗng và tối đa 4000 ký tự; body không chấp nhận field ngoài contract.
- `expectedRevision` là số nguyên dương bắt buộc. Revision không khớp trả `409 TRANSCRIPT_REVISION_CONFLICT`.
- Transcript legacy thiếu revision trả `409 TRANSCRIPT_REVISION_UNAVAILABLE`; API không tự backfill.
- Khi có thay đổi, segment text, `Transcript.fullText` và revision mới được ghi trong cùng MongoDB transaction. Timestamp, sequence và segment ID không thay đổi.
- No-op trả thành công nhưng không tăng revision. STT đang chạy trả `409 TRANSCRIPT_EDIT_NOT_ALLOWED`.
- Response trả transcript `{ id, revision, fullText }`, segment đã cập nhật và `downstream { requiresRevalidation, artifactsPreserved, regenerationStarted }`. Artifact cũ được giữ nguyên, không có job AI/TTS/video nào tự khởi động.
- Revision/provenance hiện có khiến Translation/Narration/Result và job hoàn tất muộn trở thành `STALE` hoặc `UNKNOWN`; workflow tiếp tục fail-closed thay vì dùng artifact lỗi thời.

## UI07.6.6.3 — Downstream stale guards

- Translation completion và GROUPS_V1 approve đặt write-fence theo revision của Transcript trong cùng transaction ghi Translation.
- TTS completion đặt write-fence cho Transcript và Translation; video completion đặt write-fence cho Transcript, Translation và Narration. Fence không tăng revision nhưng làm concurrent upstream edit phát sinh write conflict/revalidation trước commit.
- `GET /api/projects/:id/narrations/:narrationId` và endpoint audio trả `409 NARRATION_PROVENANCE_INVALID` khi chain là STALE/UNKNOWN. Danh sách narration chỉ trả artifact CURRENT.
- `GET /api/projects/:id/results/:resultId` và endpoint file trả `409 RESULT_PROVENANCE_INVALID` khi chain là STALE/UNKNOWN. Danh sách result chỉ trả artifact CURRENT.
- Translation detail tiếp tục trả `409 TRANSLATION_PROVENANCE_INVALID`; Translation list có `provenanceState` để phân biệt CURRENT/STALE/UNKNOWN.
- Legacy artifact thiếu revision/provenance là UNKNOWN, không được tự gán CURRENT hoặc backfill.
