# S25.7.9.3.3 — Triển khai GROUPS_V1

Trạng thái: **PARTIAL**. Source/mock tests PASS, chưa kiểm thử persistence/AI/browser thật. Thiết kế chuẩn: [TRANSLATION_GROUP_DESIGN.md](TRANSLATION_GROUP_DESIGN.md); contract chi tiết: [API.md](API.md).

## Vòng đời và an toàn

Plan chỉ đọc nguồn và catalog thật; không coi2 cụm hiển thị là2 câu. Membership phải phủ toàn bộ nguồn đúng một lần, đúng thứ tự, liên tiếp và chỉ gộp candidate boundaries. Source text/time/groupId do server tính; Gemini chỉ trả groupId/translatedText. Không chỉnh transcript hoặc tạo timestamp đích.

Preview trả draft RAM, không tạo Translation, ProcessingJob, ActivityLog hoặc thay đổi Project. TTL15 phút, tối đa50 request/draft (khoảng6.25MiB stored draft, chưa tính overhead/pending snapshot),128KiB/draft; source snapshot96KiB,1000 groups,10000 segments tối đa. Store trả clone; caller không thay draft gốc. Mỗi owner/project/target/sourceRevision một request: cùng key/body nhận cùng draft/error, key/body khác bị409 trong TTL. SDK attempts1, không fallback. Metadata model tối đa1 và generation tối đa1 mỗi preview mới; tests chỉ mock, thực tế bước này0.

Restart mất draft/idempotency; không auto-generate khi GET/reload/approve. ID draft trong URL chỉ là locator; JWT/owner vẫn bắt buộc. Từ chối không lưu, draft giữ server đến TTL để tránh retry tính phí; muốn đổi plan/gọi mới sau lỗi phải đợi TTL hoặc một quyết định kiểm thử được phê duyệt. Không restart chỉ để né idempotency. Không phù hợp multi-instance; persistent review/queue cần thiết kế riêng.

Approve yêu cầu `reviewed=true` và exact outputDigest. Reviewer/time do server cấp. Recheck snapshot/language/owner/draft, coverage/times/text và digest; transaction claim Project/insert Translation, unique index hiện có bảo vệ race. Không overwrite legacy/stale translation. Same receipt chỉ đọc lại bản cùng owner/digest/current revision. TTS chỉ dùng fullText đã approve/current với metadata đầy đủ, không nhân bản group theo từng từ. Schema-only approval không phải chứng minh tuyệt đối về ngữ nghĩa: người dùng phải kiểm tra nghĩa từng cụm/toàn câu, tên riêng, số/địa chỉ, omission/addition.

## Bật sau khi được duyệt

Backend: `GROUP_TRANSLATION_ENABLED=true`. Customer Web: `VITE_GROUP_TRANSLATION_ENABLED=true` và khởi động lại Vite. Cả hai ví dụ `.env.example` mặc định false; chưa thay `.env` thật. Chỉ dùng một backend process. Thao tác Xem trước có thể tính phí, cần người dùng xác nhận; bật flag không tự POST. Mobile/Admin cũ không được giả đọc groups: GET không negotiation trả409.

Trước real rollout: kiểm thử transaction/duplicate-key race trên MongoDB replica-set cách ly, duyệt UI/keyboard/responsive bằng browser, rồi xin quyền riêng cho một provider smoke với budget. Không chạy default Backend `npm test` khi Database writes bị cấm.

## Files của bước triển khai

Backend:

- `src/models/Translation.ts`, `src/validators/translation.validator.ts`, `src/controllers/translation.controller.ts`, `src/routes/project.routes.ts`.
- `src/services/translation/group-plan.ts`, `group-draft-store.ts`, `group-translation.service.ts`, `gemini-group-translation.provider.ts`; `gemini-translation.provider.ts` chỉ export lại safe error mapper.
- `src/services/translation-processing.service.ts` (format/legacy guards), `src/services/narration.service.ts` (approved/current guard).
- `tests/group-translation.test.ts`, `package.json`, `.env.example`.

Customer Web:

- `src/features/translation/GroupTranslationWorkspace.tsx`, `groupTypes.ts`, `groupTranslationService.ts`, `translationService.ts`.
- `src/pages/TranslationPage.tsx`, `src/styles/translation.css`, `.env.example`, `tests/group-translation.test.mjs`.
- Tương thích consumer TTS/Generate: `src/features/voice/useVoiceEditor.ts`, `voiceUtils.ts`, `src/pages/VoicePage.tsx`, `src/features/processing/types.ts`, `generationService.ts`, `src/pages/GeneratePage.tsx`. Chỉ đổi union/count/revision consumer grouped; không thay provider/transport/polling/paid-action logic.

Docs: `API.md`, `ARCHITECTURE.md`, `UI.md`, `PROGRESS.md`, `TRANSLATION_GROUP_DESIGN.md` và tài liệu này. Các thay đổi có sẵn trước task được giữ nguyên, không nhận là kết quả mới.

## Validation thực tế

| Kiểm tra | Kết quả |
| --- | --- |
| Backend grouped + legacy/provider mock suite |48/48 PASS,0 failed/skipped|
| Web toàn bộ tests |112/112 PASS,0 failed/skipped|
| Backend/Web lint, typecheck, build |PASS|
| git diff --check |PASS|
| Backend toàn bộ suite có Database writes |NOT RUN|
| Browser/isolated MongoDB transaction/runtime |NOT RUN|
| Gemini metadata/generation thật |0|
| Database connection/writes, migration |0|

Web build có warning dynamic/static import projectRepository sẵn có, không lỗi build. Không sửa Mobile/Admin/STT/source player/catalog; không commit/push.
