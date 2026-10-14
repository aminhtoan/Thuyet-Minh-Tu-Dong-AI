# Chuẩn bị Language catalog — S25.7.9.2.2

## Kết quả S25.7.9.2.4 (2026-10-12)

Người dùng đã phê duyệt đúng6 Language cho Database `multilingual_ai_narration`, environment `development`. Precheck và dry-run cuối xác minh0 records/unique code index; script write đã chạy **một lần**, created6, không retry. Đọc lại xác nhận vi/en/ja/ko/zh/fr đúng tên/nativeName, cả6 active, không trùng mã. Không ghi đè records, sửa index/schema hay dữ liệu khác; không tạo Voice, không gọi AI.

Service thật dùng bởi GET /api/voices đọc Atlas trả6 Language/0 Voice. HTTP localhost chưa có token trả401 AUTH_REQUIRED; authenticated HTTP và dropdown dự án truong dai hoc/English/nút Dịch NOT RUN do không có browser session kết nối. Seed/database verification PASS, overall integration PARTIAL. Không tạo tài khoản/session để kiểm thử, không nhấn Dịch. Các hướng dẫn dưới đây được giữ để tham khảo; **không cần chạy lại seed**.

## Hướng dẫn chuẩn bị và thực thi an toàn

## Schema và dữ liệu đề xuất

Tái sử dụng model `Language`: `code` (required/lowercase/unique index), `name`, `nativeName` (required/trim), `isActive` (boolean), timestamps. Không sửa schema, thêm collection hoặc migration.

| code | name | nativeName | isActive |
| --- | --- | --- | --- |
| vi | Tiếng Việt | Tiếng Việt | true |
| en | Tiếng Anh | English | true |
| ja | Tiếng Nhật | 日本語 | true |
| ko | Tiếng Hàn | 한국어 | true |
| zh | Tiếng Trung | 中文 | true |
| fr | Tiếng Pháp | Français | true |

Các mã hợp lệ với validators hiện có. Tài liệu [Google Gemini language support](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/google-models#language-support) liệt kê các ngôn ngữ này; [OpenAI Docs về TTS](https://developers.openai.com/api/docs/guides/text-to-speech#supported-languages) cũng hỗ trợ các ngôn ngữ tương ứng. Đây là căn cứ chuẩn bị metadata, không phải chứng nhận Gemini model/key cụ thể hay chất lượng dịch/giọng đọc đã chạy thật. Quyền truy cập model và AI runtime vẫn chưa xác minh.

## Translation và TTS không phải cùng điều kiện khả dụng

`GET /api/voices` có JWT CUSTOMER, trả `{ languages, voices }`: toàn bộ Language active (hoặc lọc theo query `language`) và Voice active của TTS provider đã cấu hình. Ngôn ngữ không bị loại chỉ vì chưa có Voice. DTO Language gồm `id`, `code`, `name`, `nativeName`.

Translation yêu cầu target khác source và Language active. TTS còn yêu cầu Voice thực tương ứng `languageId`, active, đúng provider và cấu hình key/model/voice hợp lệ. Catalog này **không tạo Voice**, preview, media hoặc kết quả AI. Không quảng cáo TTS sẵn sàng chỉ vì có Language.

Repository chưa có Language seed chuẩn trước bước này. `seed:voices` chỉ dùng Language active có sẵn, không thể thay thế Language setup; giữ nguyên script đó và không chạy trong bước này.

## Kiểm tra không kết nối Database

Trong thư mục `backend`:

```powershell
npm run test:language-catalog
npm run seed:languages -- --dry-run --offline
```

Offline preview validate cả catalog và Mongoose schema, hiển thị đề xuất; `existingRecords: UNKNOWN`, không giả định Database rỗng. Mặc định script không ghi. Không có confirmation flags thì chế độ online bị từ chối trước khi connect.

## Dry-run online — chỉ sau khi xác nhận đúng môi trường

Backend đọc `MONGODB_URI` và `NODE_ENV` từ môi trường/`.env` hiện có, không chứa URI trong script hoặc lệnh. Xác minh thủ công deployment, credentials và Database trước khi chạy. Database khác tên hoặc `NODE_ENV=development` không tự chứng minh cách ly Production.

```powershell
npm run seed:languages -- --dry-run --confirm-env=development --confirm-db=multilingual_ai_narration
```

Tên trên là ví dụ theo cấu hình dự án; thay bằng Database thực đã được duyệt. Confirm environment phải khớp `NODE_ENV`, chỉ cho phép development/test; confirm DB phải khớp Database trong URI và Database thực sau kết nối. Online dry-run chỉ đọc catalog, không tạo index/collection. Auto index/create đều OFF; lỗi driver không in URI/credential.

## Chế độ ghi — yêu cầu phê duyệt rõ ràng

Sau khi người dùng phê duyệt rõ ràng deployment/Database/môi trường và 6 records, mới được chạy:

```powershell
npm run seed:languages -- --write --confirm-env=development --confirm-db=multilingual_ai_narration --approve-write=LANGUAGE_CATALOG
```

- Chặn production, sai/thiếu xác nhận, offline+write và flags không hợp lệ.
- Kiểm tra catalog hiện có; bỏ qua mọi code đã tồn tại, không ghi đè tên/nativeName/isActive, không tự bật lại inactive.
- Yêu cầu unique index `code` đã có theo schema; nếu thiếu, dừng trước ghi với `UNIQUE_CODE_INDEX_REQUIRED`. Không tự tạo index/migration; cần xem xét và phê duyệt bước chuẩn bị index riêng.
- Chỉ dùng `$setOnInsert`/upsert các bản ghi thiếu; unique index bảo vệ chạy đồng thời. Duplicate code do một seed khác vừa tạo được kiểm tra và bỏ qua; xung đột khác bị từ chối. Nếu lỗi giữa chừng, có thể đã chèn một phần; chạy lại idempotent sau khi kiểm tra, không tự rollback/xóa dữ liệu.
- Không delete/cleanup, không sửa records khác, không gọi AI và không seed voices.

## Validation thực tế

Catalog tests12/12 PASS; offline preview PASS (connections0/writes0); backend lint/typecheck/build và git diff --check PASS. Mock tests gồm empty/existing/inactive/idempotence/concurrency/validation/env guards/unique index, GET /api/voices thật qua HTTP/JWT với persistence mock và Translation validator.

Online dry-run/index thực/seed thật và đọc lại collection: PASS ở S25.7.9.2.4. Authenticated HTTP/dropdown thật sau seed và Gemini/TTS generation: NOT RUN. Không tự gọi AI để kiểm tra.
