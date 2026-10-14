# S25.7.9.3.2 — Thiết kế Translation Group

**Thiết kế gốc S25.7.9.3.2.** Nội dung bên dưới ghi lại quyết định ở bước thiết kế. Source đã được triển khai theo phê duyệt S25.7.9.3.3, validation bằng mock; trạng thái runtime PARTIAL và rollout OFF. Xem [GROUPS_V1_IMPLEMENTATION.md](GROUPS_V1_IMPLEMENTATION.md). Không chạy migration/ghi MongoDB/gọi Gemini trong bước triển khai.

## 1. Hiện trạng được kiểm tra

Project `6acc3011dab289e21fb39f0f`, Database `multilingual_ai_narration`. Snapshot đã xác minh tại S25.7.9.3.1: dự án `truong dai hoc`, nguồn vi, 21 segment, chưa có bản dịch en, metadata model PASS và generation0. Không kiểm tra lại Database ở bước thiết kế này.

- `Transcript`: một record/project, languageCode, fullText, status và timestamps.
- `TranscriptSegment`: transcriptId, sequence, startTime/endTime, text; ID MongoDB thật, unique(transcriptId,sequence).
- `Translation`: projectId, transcriptId, sourceLanguage/targetLanguage, fullText, status; unique(transcriptId,targetLanguage).
- `TranslationSegment`: một transcriptSegmentId + translatedText bắt buộc, unique(translationId,transcriptSegmentId). Không có many-to-many group.
- POST `/api/projects/:id/translations` nhận targetLanguage, xử lý provider rồi lưu transaction; GET list/detail trả segment index/sourceSegmentId/text. JWT CUSTOMER ACTIVE/ownership và Language active bắt buộc.
- Provider Gemini nhận toàn transcript, yêu cầu từng index/ID; validation kiểm tra cấu trúc, không chứng minh ngữ nghĩa. Guard hiện tại chặn transcript word-level trước job/provider/save; không tháo guard để thử may rủi.

### Giới hạn gốc

“Tiểu học”, “tọa lạc”, tên riêng và địa chỉ gồm nhiều từ nhưng mang nghĩa theo cụm. Tiếng Anh có thể đổi thứ tự/số từ. Đủ21 IDs và21 text không rỗng không chứng minh21 cặp có alignment đúng.

Không đặt cả câu vào một ID rồi bỏ trống20 ID; không lặp cả câu21 lần; không chia English sentence theo số từ hoặc tạo timestamp đích để lấp contract cũ.

## 2. Group hiển thị hiện tại không phải group nghiệp vụ

`TranscriptPage` dùng `groupTranscriptSegments` từ `transcriptPresentation.mjs`: dấu kết câu, pause>=0.6s, tối đa18 từ/8s/120 ký tự; phrase sẵn có giữ riêng. Output giữ ID đầu cụm, không chứa toàn bộ source IDs.

`TranslationPage` gọi `buildTranslationPresentation`: kiểm tra các bản dịch1:1 rồi gộp theo membership suy từ index/ID đầu của các cụm nguồn. Đây là projection, không ghi Database. Formatter `mm:ss.SSS` chỉ hiển thị timestamp, không sửa số gốc.

Snapshot dự án có2 cụm display:

| Cụm | Source sequences | Source time | Nhận xét |
| --- | --- | --- | --- |
| 1 | 1–18 | 0.800–6.600s | Đến “Long Châu,”; chứa trường, tên riêng và phần đầu địa chỉ |
| 2 | 19–21 | 6.700–7.300s | “tỉnh Vĩnh Long.” |

Ranh giới2 cụm xuất phát từ giới hạn18 từ, không phải2 câu độc lập. Có thể dùng làm đề xuất ban đầu nếu người duyệt chấp nhận, nhưng không bắt buộc mọi bản dịch phải có2 cụm. Nếu boundary cắt tên riêng/cụm nghĩa, gộp các cụm liên tiếp trước generation; một câu21 từ có thể thành1 Translation Group. Không đổi21 TranscriptSegment hoặc layout Bước2 để ép đồng bộ số card.

## 3. Lựa chọn lưu trữ: groups nhúng trong Translation

Đề xuất thêm trường tùy chọn có phiên bản vào **model Translation hiện có**, không tạo collection TranslationGroup. Giữ nguyên model/collection TranslationSegment cho legacy; không lưu group giả vào đó.

Parent Translation giữ toàn bộ trường hiện tại và thêm:

- alignmentFormat: `SEGMENTS_V1` hoặc `GROUPS_V1`; thiếu trường thì đọc như legacy, không tự ghi default vào DB cũ.
- sourceRevision: SHA-256 của snapshot canonical gồm transcriptId, languageCode, fullText và từng ID/sequence/text/start/end; updatedAt có thể bổ sung, không dùng mỗi updatedAt làm bằng chứng.
- groupingVersion: phiên bản policy server tạo cụm.
- groups: mảng embedded TranslationGroup, chỉ dùng cho GROUPS_V1.
- review: reviewedBy, reviewedAt, sourceRevision, outputDigest, method=`MANUAL_V1`. Server lấy reviewer từ JWT; client không được tự khai reviewer/time/role.

TranslationGroup đề xuất:

| Trường | Kiểu/nguồn | Quy tắc |
| --- | --- | --- |
| groupId | string ổn định do server cấp | Gắn sourceRevision/policy/ordered source IDs; không lấy ID do Gemini tự tạo |
| sequence | integer | Liên tục từ1, theo nguồn |
| sourceSegmentIds | ObjectId[] | Đúng ID gốc, có thứ tự, liên tiếp và không rỗng |
| startTime/endTime | number | Bằng start của member đầu/end của member cuối |
| sourceText | string snapshot | Ghép text nguồn bằng formatter xác định; không do Gemini trả |
| translatedText | string | Nội dung đích theo cụm; không giới hạn số từ bằng số member |
| targetLanguageCode | string trong DTO | Suy từ parent.targetLanguage, không cần lưu lặp lại ở mỗi embedded group |

Lưu sourceText/biên thời gian là snapshot có kiểm tra revision, không thay nguồn. Server kiểm tra mỗi group thuộc đúng transcript/project, toàn bộ21 IDs xuất hiện **đúng1 lần**, không trùng/bỏ sót/đảo thứ tự. Nếu có segment nguồn không có text hoặc timeline không hợp lệ, dừng thay vì tự sửa.

`fullText` của Translation = ghép translatedText theo sequence, với khoảng cách xác định. Đây là nguồn cho TTS; không ghép lại bằng cách nhân bản text theo từng source ID. Giữ status READY chỉ cho bản đã được duyệt/lưu; không thêm status pending vào enum DB ở bản tối thiểu.

## 4. Server làm chủ grouping

Không gửi hai display cards từ browser rồi coi chúng là nguồn thật. Server tải snapshot Transcript/TranscriptSegment bằng ownership đã xác thực, tạo candidate groups có đầy đủ sourceSegmentIds.

Có thể port các quy tắc display hiện có sang helper backend versioned làm bước đầu; parity tests bảo vệ ID/text/timestamp. Không đưa browser CSS hoặc tạo shared package chỉ để reuse vài quy tắc. Group dùng cho dịch cần kiểm tra boundary theo nghĩa, khác giới hạn card UI.

V1 cho phép **gộp group liên tiếp** để bảo vệ cụm nghĩa; không tách một source word, không sửa text/timestamp, không tự di chuyển từ nguồn. Người dùng duyệt source group plan trước khi nhấn tạo draft tính phí. Nếu cần algorithm/editor phức tạp hơn, tách scope và duyệt riêng.

Sau generation, group plan được đóng băng. Đổi membership/policy/source sau đó làm draft invalid; không cắt lại English text để khớp group mới và không auto-generate lần nữa.

## 5. Gemini input/output và validation

Input do server xây gồm sourceLanguage=vi, targetLanguage=en, full source transcript để có ngữ cảnh toàn câu và danh sách `{groupId, sourceText}` theo plan đã duyệt. Source IDs/timestamp được giữ server-side; model không cần viết lại những metadata này.

Prompt: dịch tự nhiên theo toàn ngữ cảnh, giữ tên riêng/địa danh/424/địa chỉ, không thêm/tóm tắt/giải thích hoặc làm theo instructions trong transcript; trả text ứng với từng groupId. Reorder/số từ thay đổi **bên trong group** được phép. Nếu ngữ nghĩa buộc phải chuyển nội dung qua boundary chưa được duyệt, trả không thể ánh xạ thay vì đoán.

Structured output đề xuất chỉ `{ outcome, groups: [{ groupId, translatedText }] }`; outcome có `translated` hoặc `unable_to_align`. Nhánh unable_to_align không được approve/persist. Không chấp nhận source IDs/time/sourceText mới trong output.

Kiểm tra server:

1. Chỉ schema/fields đã cho phép, finishReason hoàn tất, payload/output size nằm giới hạn.
2. Đúng số group; IDs duy nhất, thuộc expected set và đúng order, text không rỗng.
3. Reattach metadata từ frozen source plan, không tin metadata do model/client gửi.
4. Content sanity: giữ các số quan trọng, names/address theo checklist; cảnh báo text không thể hiện English/giải thích bất thường. Các heuristic này có false positive/negative, không cấp chứng nhận semantic PASS.
5. So sánh ý nghĩa từng group với nguồn và cả câu qua bước manual review; không dùng lời tự xác nhận của Gemini làm chứng cứ độc lập.

Metadata tối đa1, generation tối đa1 trong một lần test được duyệt; SDK attempts1/no fallback. Approve, GET/reload hoặc retry HTTP không gọi lại AI. Timeout/unknown result yêu cầu quyết định mới của người dùng, không tự retry generation.

## 6. Hai giai đoạn: draft rồi manual approve

Luồng đề xuất:

```text
Snapshot + duyệt source groups → 1 generation → structural validation
→ draft chưa lưu → người dùng duyệt nghĩa → source/version recheck
→ transaction lưu Translation GROUPS_V1 → TTS khi người dùng yêu cầu
```

Draft không phải Translation READY, không cập nhật Project TRANSLATED, không cho TTS. Tối thiểu cho backend đơn tiến trình hiện tại: in-memory draft store **có giới hạn số lượng/kích thước/TTL** (đề xuất15 phút), scoped user/project/language/sourceRevision, opaque draftId và outputDigest. Đây là tài nguyên draft rõ ràng, không phải global boolean che lỗi; không thêm DB collection chỉ để thử1 request.

JWT/ownership vẫn bắt buộc cho mọi draft GET/approve; biết draftId không cho truy cập tài nguyên người khác. Không log transcript/bản dịch/key/token. Lock và idempotency key cho preview tránh double submit trong tiến trình; cached result không gọi thêm generation. Client chỉ giữ draftId, không giữ API key hoặc được quyền tự sửa metadata server.

Người duyệt cần so sánh tên trường, Nguyễn Hữu Huân, số424 và toàn địa chỉ; đánh giá omission/addition, ý nghĩa, English tự nhiên và group boundary. V1 chỉ **chấp nhận hoặc từ chối**, không tự thêm UI chỉnh sửa English nếu chưa có contract riêng. Từ chối = không persist, không báo thành công giả.

Approve chỉ gửi draftId + outputDigest đã xem; server đọc text từ draft store, không nhận body Translation tùy ý. Server recheck user/project, Language active, existing target, source hash/membership/time và draft chưa hết hạn/đã bị thay đổi. Review cần gắn đúng outputDigest để không duyệt nhầm phiên bản.

Trong transaction: đọc nguồn lại và kiểm tra hash, insert một Translation gồm groups/review/fullText; cập nhật đúng Project thành TRANSLATED bằng điều kiện ownership/state hiện có. Không upsert overwrite target có sẵn, không deleteMany legacy segments. Unique(transcriptId,targetLanguage) hiện có chặn race: bản dịch khác đã tồn tại thì409. Nếu retry approve sau response lost, chỉ trả receipt cũ khi cùng draft/outputDigest; không generate hoặc ghi đè.

Preview V1 không ghi ProcessingJob/ActivityLog/Project trước approve để tránh metadata “đã dịch” giả và DB changes trước review. UI dùng local state cho generation/review pending. Điều này là khác biệt có chủ ý so với service sync hiện tại: Admin chưa theo dõi preview job trong bản tối thiểu; monitoring persistent là scope bổ sung, không giả vờ queue/job hiện có đã giải quyết.

In-memory store mất khi restart/TTL; tuyệt đối không tự regenerate. V1 chỉ phù hợp single-process. Khi cần nhiều instance hoặc draft bền vững, phải duyệt riêng persistent draft store/idempotency; không tuyên bố exactly-once qua crash chỉ bằng mutex RAM.

## 7. API đề xuất, chưa tồn tại

Giữ API segment cũ cho SEGMENTS_V1; guard word-level hiện tại vẫn bật. Bổ sung rõ nhánh GROUPS_V1 thay vì gỡ guard chung:

| Thao tác đề xuất | Vai trò | Ý nghĩa |
| --- | --- | --- |
| GET `/api/projects/:id/translations/plan/:targetLanguage` | CUSTOMER owner | Read-only server grouping plan/sourceRevision/groupingVersion từ nguồn thật, để người dùng duyệt boundary trước generation; không AI/DB writes |
| POST `/api/projects/:id/translations/preview` | CUSTOMER owner | targetLanguage, groupingVersion/sourceRevision, plan gộp nhóm được server validate và idempotency key; một generation, trả draftId/source/groups/outputDigest/expiry, chưa lưu Translation |
| GET `/api/projects/:id/translations/drafts/:draftId` | CUSTOMER owner | Đọc draft còn hạn, không AI; phục hồi UI qua draftId |
| POST `/api/projects/:id/translations/drafts/:draftId/approve` | CUSTOMER owner | Approve digest đã xem, transaction lưu; không AI |
| GET `/api/projects/:id/translations/:targetLanguage?format=groups-v1` | CUSTOMER owner | Đọc legacy hoặc grouped DTO có alignmentFormat discriminator |

Danh sách translations giữ summary hiện có và thêm alignmentFormat/sourceSegmentCount/groupCount/reviewed khi phù hợp; không gọi groupCount là số word segments.

Route plan/draft nhiều path segments không trùng GET `/:targetLanguage` hiện có. Khi triển khai cần kiểm tra router matching/validation cụ thể. GET plan là bước chuẩn bị miễn phí; POST preview không được âm thầm thay source/group plan đã được duyệt nếu revision đổi.

Client cũ GET không khai hỗ trợ format vẫn nhận legacy DTO như cũ. Nếu record mới là GROUPS_V1, trả409 `TRANSLATION_FORMAT_UNSUPPORTED`, không đưa fake segments hoặc mảng21 text. Client cập nhật dùng query format mới và xử lý union SEGMENTS_V1/GROUPS_V1. Đây là compatibility guard, **không phải** hỗ trợ grouped hoàn chỉnh cho Mobile/Admin chưa cập nhật.

Lỗi mới đề xuất: SOURCE_REVISION_MISMATCH, TRANSLATION_REVIEW_REQUIRED, TRANSLATION_DRAFT_EXPIRED, TRANSLATION_DRAFT_CHANGED, TRANSLATION_ALREADY_EXISTS, TRANSLATION_FORMAT_UNSUPPORTED, TRANSLATION_MAPPING_FAILED. Giữ safe JSON errors/JWT/RBAC, không đưa raw provider payload. Tất cả routes/errors mới cần duyệt API contract trước triển khai.

## 8. Customer Web và TTS

Web types/API mapper dùng discriminated union; không biến group thành21 TranslationSegment. TranslationPage hiển thị trực tiếp frozen sourceText | translatedText của group, timestamp mm:ss.SSS từ biên nguồn. Có thể là2 card như snapshot hoặc1 card nếu plan duyệt cả câu. Không chạy groupTranscriptSegments lần nữa trên English hay sourceText snapshot để thay membership.

UI cần source-plan review, paid generation confirmation, pending semantic review, accept/reject và saved state thật. Reload lấy draft nếu còn hạn, hoặc GET bản được approve; mất draft hiển thị lỗi, không auto retry AI. Nút tiếp tục Voice chỉ bật khi approved/saved/source còn khớp. Không sửa TranscriptPage, source player hoặc21 source segments.

TTS hiện lấy Translation.fullText/targetLanguage và Voice active, không cần21 translated segments. Với GROUPS_V1, giữ đường gọi provider/fullText và giới hạn4096 ký tự; bổ sung guard review MANUAL_V1 và source revision/group metadata current **trước** idempotent narration hoặc provider call. Không claim source ranges là timestamp English audio; thời lượng TTS/FFmpeg vẫn theo pipeline thực, không tạo duration/sync giả.

Legacy TTS giữ hành vi hiện tại trong V1, không tự đánh dấu đã manual review. Source-staleness chung của legacy là vấn đề cần test/đánh giá riêng, không âm thầm đổi policy tất cả bản cũ trong bước grouped này. Language active không đồng nghĩa đã có Voice.

## 9. Backward compatibility và migration

- **Cần schema/code/API thay đổi được duyệt**, nhưng **không cần bulk data migration** để mở thêm optional GROUPS_V1 fields.
- Existing Translation thiếu alignmentFormat = SEGMENTS_V1; existing TranslationSegment giữ nguyên ID/text/FK và DTO cũ. Không auto-regroup/migrate/review các bản dịch cũ, không biến review absent thành reviewed=true.
- Unique index hiện tại giữ nguyên. Một transcript/target chỉ có một Translation: nếu legacy English tồn tại, dừng; không tự thay bằng group hoặc overwrite stale data.
- Vì STT hiện upsert cùng transcriptId nhưng thay segment IDs, revision hash cần kiểm tra ở approve/read/TTS. Hash mismatch = stale, không trình bày bản cũ như mới. Lưu nhiều revision song song/archive bản cũ sẽ cần quyết định index/version riêng, không nằm trong thay đổi nhỏ nhất.
- Rollout backend schema + new format routes/guards trước, Web consumer có format negotiation sau; dùng feature flag OFF mặc định để chưa cho tạo grouped trước khi client/review hoàn chỉnh. Rollback flag OFF không xóa group records; legacy clients báo unsupported thay vì đọc sai.

## 10. Files dự kiến thay đổi khi được duyệt

- Backend `models/Translation.ts`: optional versioned groups/review/sourceRevision; Transcript/TranscriptSegment/TranslationSegment giữ nguyên.
- Helpers mới dưới `services/translation/`: source grouping/version hash, group validation, bounded draft store/review workflow.
- `translation-provider.interface.ts`, `gemini-translation.provider.ts`: contextual groups/IDs và output union; giữ legacy adapter, không sửa STT/TTS provider.
- Translation processing service/controller/validators và `routes/project.routes.ts`: tách preview/approve, format-aware GET, safe persistence không overwrite.
- `services/narration.service.ts`: approved/current grouped guard; provider TTS/FFmpeg giữ nguyên.
- Web translation types/service/hook/presentation/TranslationPage và component review gọn; không sửa grouping TranscriptPage/player/auth/navigation.
- Backend/Web tests, `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/UI.md`, `docs/PROGRESS.md`. Mobile/Admin adapters chỉ khi scope parity được duyệt; trước đó phải fail safely với format mới.

## 11. Validation cần có trước real generation

1. 21 IDs coverage đúng1 lần, source-text/times immutable, grouping determinism, boundary không cắt tên/cụm đã duyệt.
2. Missing/duplicate/reordered group IDs, extra metadata, empty output, refusal/truncated response đều không persist.
3. Manual review chưa có/false/digest khác không save/TTS; reviewer lấy JWT, cross-owner/blocked/IDOR bị từ chối.
4. Transcript đổi giữa preview/approve, existing target race, TTL/restart/duplicate POST/response lost đều fail safely; không paid auto retry.
5. Approve transaction/save/readback/group DTO/fullText; legacy reads unchanged, old clients unsupported mới có thông báo, không fake segments.
6. TTS nhận fullText đúng1 lần mỗi group theo order, check approved/revision/size; không thay timestamp English giả.
7. Tests provider/DB mocks và isolated persistence trước; real Gemini chỉ sau phê duyệt mới với budget rõ ràng. Không gọi AI để tự kiểm chứng output.

## 12. Khuyến nghị và điểm cần duyệt

Chọn **embedded GROUPS_V1 + preview/manual approve**, không mở thêm collection hoặc bulk migration ở V1. Duyệt riêng: fields mới, format-negotiated routes, bounded RAM draft store giới hạn single-process, tiêu chí người duyệt và policy grouping trước generation.

Rủi ro chính: UI groups bị nhầm semantic groups; hash/source race; unreviewed draft bị coi READY; TTS nói lặp vì adapter fake21 segments; stale legacy target không thể overwrite; draft mất khi restart; human review có thể sai. Schema validation/heuristics/manual review đều không chứng minh tuyệt đối, cần báo mức độ xác minh thực tế.

**Không gọi generation ở bước thiết kế.** Guard hiện tại tiếp tục chặn project này đến khi flow grouped/review được duyệt, triển khai và kiểm thử.
