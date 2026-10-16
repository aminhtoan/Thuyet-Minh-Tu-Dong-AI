# Project Progress

## UI05.5 — Compact Date Filter Popover (2026-10-17)

- **PARTIAL — source/regression PASS, browser visual verification pending.** Bộ lọc Ngày/Tháng/Năm được thu gọn thành trigger icon lịch + nhãn chế độ + chevron; inputs chỉ xuất hiện trong popover `310px`, không chiếm chiều cao card khi đóng. Giữ nguyên tiêu đề và khoảng thời gian đã áp dụng.
- State lựa chọn được tách thành draft: thay đổi control và `Đặt lại` không làm biểu đồ đổi ngay; `Áp dụng` mới cập nhật `chartMode/chartAnchor`. Reset khôi phục draft về Ngày/hôm nay; click ngoài hoặc Escape hủy phần chưa áp dụng. Không đổi phép nhóm `createdAt`, timezone, API, dữ liệu hay nghiệp vụ.
- Popover hỗ trợ click ngoài, Escape, focus vào mode hiện hành khi mở và focus return về trigger khi Escape/Apply; trigger có disclosure ARIA, mode giữ `aria-pressed`, control/button có focus-visible và target phù hợp. CSS responsive neo popover trong content area ở container hẹp, không tạo horizontal overflow toàn trang.
- Thêm 3 regression tests cho draft/apply/reset, outside/Escape/focus, kích thước/responsive và cập nhật test control hiện có. Web tests **138/138 PASS**; lint, typecheck, production build và `git diff --check` PASS. Lần test đầu trong worker sandbox bị `spawn EPERM` trước khi chạy test; chạy lại đúng suite ngoài sandbox PASS.
- Browser visual **NOT RUN**: Computer Use không khởi tạo được kernel assets do `path not found`. Chưa xác nhận trực quan popover tại 320/375/768/1024/1440; không commit/push.

## UI05.4 — Dashboard Date / Month / Year Filter (2026-10-17)

- **PARTIAL — source/regression PASS, browser visual verification pending.** Biểu đồ 7 ngày được mở rộng thành thống kê Ngày/Tháng/Năm với segmented control, date/month/year controls và nút đặt lại; không đổi Donut, Hero, Quick Actions, Shell, bảng dự án hoặc nghiệp vụ.
- Pure metrics tạo 7 ngày kết thúc tại ngày chọn, đủ số ngày lịch của tháng và 12 tháng của năm; bucket trống bằng 0, scale Y tuyến tính bắt đầu từ 0. Nhóm `createdAt` theo múi giờ thiết bị, đã test ranh giới năm và tháng 2 nhuận.
- Data integrity: giữ request hiện có giới hạn 100 dự án và `hasCompleteProjectDataset`. Dataset phân trang chưa đủ hiển thị trạng thái thiếu dữ liệu thay vì thống kê sai; không phát sinh request vô hạn, không sửa Backend/API/Database.
- Responsive: header/filter wrap theo container; tháng 31 cột cuộn ngang bên trong biểu đồ và vùng cuộn hỗ trợ keyboard focus; mobile control xếp dọc, không mở rộng toàn trang. Loading/error/retry và empty state hiện có được giữ.
- Thêm 3 regression tests cho ba chế độ thời gian, năm nhuận/ranh giới local date, control/a11y và guard `limit=100`; cập nhật regression tooltip/empty state. Web tests **135/135 PASS**; lint, typecheck, production build và `git diff --check` PASS. Build còn cảnh báo dynamic/static import `projectRepository.ts` đã có sẵn, không liên quan UI05.4.
- Browser visual **NOT RUN**: Computer Use không khởi tạo được kernel assets do `path not found`; không coi responsive/scroll/tooltip trực quan là PASS. Không commit/push.

## UI05.3 — Remove Duplicate KPI Cards (2026-10-17)

- **PARTIAL — source/regression PASS, browser visual verification pending.** Đã xóa hàng bốn KPI độc lập khỏi Dashboard và dọn toàn bộ JSX/CSS/token chỉ dùng cho KPI; Analytics nối trực tiếp sau Quick Actions bằng spacing section hiện có, không tạo khoảng trắng dư.
- Giữ nguyên biểu đồ cột 7 ngày, Donut Chart với tổng/số lượng/tỷ lệ, phân loại `Khác`, dữ liệu fail-closed, Hero, Quick Actions, Shell, Dự án gần đây và Hoạt động gần đây. Không đổi route, API, business logic hoặc dữ liệu.
- Regression UI05.2 được cập nhật để xác nhận KPI đã bị loại bỏ nhưng chart/Donut và trạng thái thiếu dữ liệu vẫn nguyên vẹn. Web tests **132/132 PASS**; lint, typecheck, production build và `git diff --check` PASS. Build còn cảnh báo dynamic/static import `projectRepository.ts` đã có sẵn, không liên quan UI05.3.
- Browser visual **NOT RUN**: Computer Use không khởi tạo được kernel assets do `path not found`. Chưa xác nhận trực quan tại 320/375/768/1024/1440. Không sửa Backend/Mobile/Admin/API/Database, không commit/push.

## UI05.2 — Advanced Dashboard Analytics (2026-10-17)

- **PARTIAL — source/regression PASS, browser visual verification pending.** Bốn KPI được tách thành hàng độc lập với icon/semantic tone/số lớn; Analytics dùng tỷ lệ 60/40 cho bar chart 7 ngày và donut trạng thái, cùng card height/padding/radius. Không sửa Hero/Quick Actions/Shell/recent projects/activity, route hoặc dữ liệu/API.
- Bar chart dùng scale tuyến tính có tick 0, bỏ minimum-height 8% từng làm sai tỷ lệ; có gridline, giá trị, tooltip ngày/số dự án cho hover + focus, figcaption screen reader và empty/incomplete state. Donut SVG có segment gap, tổng ở giữa, legend count/percentage/progress, hover/focus đồng nhất và mô tả văn bản.
- Data integrity: completed/processing/failed tái sử dụng thống kê hiện có; trạng thái chưa phân loại được giữ riêng trong `Khác`. Dataset phân trang chưa đầy đủ không tính tỷ lệ hoặc KPI nhóm; total vẫn dùng `pagination.total`. Zero dataset không sinh phần trăm giả.
- Thêm 2 pure helper + declaration cho linear scale/status distribution và 6 regression tests UI05.2; cập nhật regression foundation để xác nhận không còn bar floor. Web tests **132/132 PASS**; lint/typecheck/production build và `git diff --check` PASS. Build còn warning dynamic/static import `projectRepository.ts` đã có sẵn, không liên quan UI05.2.
- Browser visual 320/375/768/1024/1440 **NOT RUN**: Computer Use thất bại khi khởi tạo kernel assets do `path not found`. Cần browser thật xác nhận tooltip clipping, SVG focus và tỷ lệ card. Không Backend/Mobile/Admin/API/Database change, không AI call/DB write, không commit/push.

## UI04 — Dashboard Hero & Quick Actions (2026-10-15)

- **PARTIAL — source/regression PASS, browser visual verification pending.** Hero được thu gọn (`min-height: 208px`), giữ gradient và artwork CSS hiện có theo bố cục copy trái/artwork phải; artwork ẩn khi container hẹp để ưu tiên heading/description/CTA. Không thêm asset/library và không đổi Dashboard JSX, dữ liệu hoặc nghiệp vụ.
- Quick Actions đồng chiều cao, icon/padding/copy nhất quán; có hover/focus-visible/active/reduced-motion và wrap nội dung dài. Container query theo content width: 4 cột rộng, 2 cột trung bình, 1 cột hẹp. Routes giữ nguyên: `/projects/new` và ba luồng chọn dự án `/projects`.
- Thêm 4 regression test cho Hero, route/semantic Quick Actions, container breakpoints và interaction/reduced-motion. Web tests **126/126 PASS**; lint/typecheck/production build và `git diff --check` PASS. Build còn warning dynamic/static import `projectRepository.ts` đã có sẵn, không liên quan UI04.
- Browser visual 320/375/768/1024/1440 **NOT RUN**: Computer Use trả `apps: []`, `browsers: []`. Cần browser thật xác nhận tỷ lệ Hero/artwork, chiều cao card và overflow trước khi đánh dấu visual hoàn tất.
- Chỉ `frontend-web/src/styles/dashboard.css`, test UI04 và docs thay đổi trong bước này. Không sửa Backend/Mobile/Admin/API/Database, không AI call/DB write, không commit/push.

## UI03 — Sidebar & Header refinement (2026-10-15)

- **PARTIAL — source/regression PASS, browser visual/interaction verification pending.** Sidebar desktop `252px`, menu item 48px/icon 20px/gap 12px, brand alignment và active/hover/focus được chuẩn hóa trên Navy/Purple hiện có. Header cơ sở 72px dùng ba vùng context/search/account; search max 440px, mobile xuống hàng; Header có title/subtitle giữ min-height 80px để tránh cắt copy đã duyệt.
- Giữ nguyên routes, search `/projects?q=...`, Profile lấy user thật, dropdown, logout, tiêu đề/subtitle đặc thù và quy tắc không hiện Header Search trên Projects/Create/History/Account. Không đổi Dashboard/KPI/chart/table/project data/API/business logic.
- Drawer `<=1023px`: backdrop, nút đóng 44px, body scroll lock, `inert`/`aria-hidden` khi đóng và nền inert khi mở, focus ban đầu, Tab/Shift+Tab containment, Escape và focus return về menu. Added pure focus-wrap helper/declaration và close icon trong icon component hiện có; không cài library.
- Web tests **122/122 PASS** (từ 117, thêm 5 test UI03); lint/typecheck/build và `git diff --check` PASS. Lần test sandbox đầu nhận `spawn EPERM`, chạy lại cùng suite ngoài worker sandbox PASS; đây không phải defect source.
- Browser visual/keyboard smoke 320/375/768/1024/1440 **NOT RUN**: Computer Use trả `apps: []`, `browsers: []`. Chưa xác nhận kích thước thực, scroll, overlay/focus trên browser; cần người dùng duyệt trước UI04.
- Chỉ Customer Web shell/tests/docs thay đổi. Không sửa Backend/Mobile/Admin/API/Database, không AI call/DB write, không commit/push.

## UI02 — Dashboard typography & design foundation (2026-10-14)

- Source implementation hoàn tất; **PARTIAL — chờ browser visual verification/người dùng duyệt**. Be Vietnam Pro self-hosted3 weights + license/fallback/swap chỉ áp dụng Dashboard, không global typography/dependency change. Local scale26–28/20/15/12–13/30px, spacing8/12/16/24/32, card radius16/KPI14px và subtle border/shadow.
- Files: `frontend-web/src/styles/dashboard.css`, `dashboard-fonts.css`, font assets `regular.ttf/semibold.ttf/bold.ttf/OFL.txt`, `frontend-web/tests/dashboard-foundation.test.mjs`, `docs/UI.md`, `docs/PROGRESS.md`. Không sửa Dashboard JSX/Sidebar/Header/global styles/tokens/project repository/dashboardMetrics, Backend/Mobile/Admin/API/Database.
- Web `npm test` **117/117 PASS** (5 regression mới kiểm tra TTF weight/glyph tiếng Việt/license/font scope/scale/wrapping và bảo toàn routes/order/chart/KPI guards); lint/typecheck/production build PASS. Build xuất3 local font assets, còn warning dynamic/static import projectRepository đã có sẵn. `git diff --check` PASS.
- Browser375/768/1024/1440 **NOT RUN**: Computer Use inventory apps[]/browsers[]; không coi CSS/source tests là responsive visual PASS. Runtime font loading/fallback CLS và nội dung thực cần duyệt trên trình duyệt. Font footprint~361KiB; tối ưu WOFF2 nếu cần ở bước sau, không cài tooling trong UI02.
- Không gọi Backend/AI, không ghi Database, không thêm production fixtures, không commit/push. Chart/KPI semantics và logic chưa đổi theo scope UI02; chờ xác nhận trước UI03.

## S25.7.9.3.3 — GROUPS_V1 implementation (2026-10-12)

- **PARTIAL — source/mock validation PASS; runtime/provider/persistence chưa được phép kiểm thử.** Schema optional embedded groups/review, canonical revision/digest, merge-only source plan, Gemini group adapter, RAM preview và transactional/manual approve đã triển khai. Unique index/Transcript/TranslationSegment legacy không đổi, không migration.
- Routes plan/preview/draft/approve + format-aware GET, JWT CUSTOMER ACTIVE/ownership và strict payloads. Preview không ghi job/status/log/Translation; approve insert-only chống overwrite, duplicate/concurrent idempotent; TTS approved/current-only cho GROUPS_V1. Web có plan review, paid preview confirm, semantic review/reject, draft restore và states thật; Voice/Generate union mapping không fake segment.
- Backend `npm run test:group-translation`: **48/48 PASS**, gồm grouped/mock JWT service/routes/provider và legacy regression mock (20 tests grouped mới +28 legacy/provider trước đó). Backend lint/typecheck/build PASS. Default backend `npm test` **NOT RUN** vì suite dùng Database thật và có writes; không suy diễn baseline118/118 là đã chạy lại.
- Web `npm test`: **112/112 PASS** (11 grouped tests mới, baseline101). Web lint/typecheck/build PASS. `git diff --check` PASS. Sandbox Node/Vite spawn EPERM đã chạy lại thành công với quyền thực thi; build còn warning dynamic/static import projectRepository đã có sẵn.
- Database connections/writes **0**, real Gemini metadata/generation **0**, STT/TTS **0**; không đổi `.env` thật/catalog/Atlas/index, không commit/push. Backend/Web flags OFF mặc định. Browser/isolated MongoDB transaction/real provider **NOT RUN**.
- Giới hạn: RAM TTL15 phút/50 entries/128KiB draft, input96KiB/1000 groups/10000 source IDs; mất nháp và idempotency qua restart, không multi-instance. Source review/manual meaning review không chứng minh ngữ nghĩa tuyệt đối. Chờ duyệt UI và quyền kiểm thử runtime cách ly trước rollout; chưa gọi dịch dự án thật. Chi tiết/file manifest tại [GROUPS_V1_IMPLEMENTATION.md](GROUPS_V1_IMPLEMENTATION.md).

## S25.7.9.3.2 — Group-based Translation design

- DESIGN COMPLETE / PENDING APPROVAL. Đối chiếu schemas, grouping display, Translation APIs/service và TTS fullText. Thiết kế tại TRANSLATION_GROUP_DESIGN.md: optional embedded GROUPS_V1 trong Translation, ordered sourceSegmentIds/biên nguồn/sourceText/review/sourceRevision, giữ legacy TranslationSegment.
- Đề xuất server-owned grouping có source plan review, contextual Gemini group response, draft chưa persist rồi manual approve/digest/revision recheck; không giả ánh xạ21 từ. Hai group UI là giới hạn18 từ, không bắt buộc2 câu nghiệp vụ. TTS giữ fullText nhưng cần guard approved/current cho grouped.
- APIs preview/draft/approve và format negotiation chỉ là đề xuất, chưa tồn tại. Schema/code migration cần phê duyệt, bulk data migration không cần mặc định; không đổi unique index hay overwrite legacy. RAM draft V1 giới hạn single-process/TTL, monitoring và multi-instance persistence là scope riêng.
- Bước này chỉ viết tài liệu, source/schema/index/Database/transcript không sửa; DB writes0, Gemini metadata/generation0, không commit/push. git diff --check PASS; không chạy tests/build không liên quan vì không đổi application code. Chờ người dùng duyệt thiết kế.

## S25.7.9.3.1 — Safe Gemini execution: BLOCKED by word-level semantic mapping

- Read-only Atlas precheck: multilingual_ai_narration/development, project6acc3011dab289e21fb39f0f (truong dai hoc), TRANSCRIBED, transcript READY/vi/21 nonempty original segments, targeten active, existing English translations0. Nội dung có các cụm Tiểu học/tọa lạc và tên riêng/địa chỉ tách từng từ; không đồng nhất1 source word với1 English word.
- User cho phép tối đa1 metadata +1 generation. Đã gọi đúng1 models.get với SDK retry attempts1/timeout15s, model gemini-3.8-flash metadata PASS/supports generateContent. Generation0, không gửi transcript tới Google, không retry/fallback/STT/TTS.
- Thêm fail-closed guard cho Gemini word-level transcript nhiều segment toàn single-word: provider dừng trước metadata/generation; API dừng409 TRANSLATION_MAPPING_FAILED trước tạo ProcessingJob/claim Project/status/log/save. Đây là rejection của granularity không đủ tin cậy, KHÔNG chứng nhận semantic correctness của phrase responses. Existing valid translations/read routes giữ nguyên. Không schema/index/source transcript mutation.
- Gemini Translation mock28/28 PASS (2 regression mới: provider no-call, route no-job/no-write); backend lint/typecheck/build và git diff --check PASS. Full DB-writing suite NOT RUN. Actual English result/Database save/GET Translation/browser NOT RUN; Atlas writes0 trong bước này.
- BLOCKED: TranslationSegment hiện chỉ có một transcriptSegmentId và translatedText không rỗng; không lưu tùy tiện 21 English fragments hay lặp câu/để trống để đủ số lượng. Đề xuất phrase/sentence translation với danh sách sourceSegmentIds và thời gian lấy biên nguồn, semantic review trước persist; cần phê duyệt schema/contract riêng, chưa triển khai. Không commit/push, không gọi thêm Google.

## S25.7.9.2.4 — Language catalog seed execution

- User phê duyệt đúng6 Language tại multilingual_ai_narration/development. Precheck actual DB/unique-code index và online dry-run cuối PASS, existing0/conflicts0. Script write chạy1 lần/không retry, inserted6. Readback actual DB xác nhận6 records vi/en/ja/ko/zh/fr đúng tên/nativeName, active6, duplicate0, unique index vẫn hợp lệ. Không overwrite/reactivate records, không sửa schema/index/projects/users/transcript; không tạo Voice, AI requests0.
- Actual catalog service cho GET /api/voices đọc Atlas trả6 Language/0 Voice PASS. Local HTTP GET không auth trả401 AUTH_REQUIRED (không coi là authenticated API PASS). CUA inventory browsers[]; không có phiên trình duyệt kết nối để mở truong dai hoc/Bản dịch. English selection/loại Vietnamese/nút Dịch runtime NOT RUN; không nhấn Dịch hoặc mint token/tạo session để test.
- Seed + readback PASS, overall PARTIAL do thiếu authenticated HTTP/browser checks. Database changes chỉ6 Language mới; không commit/push. Cần người dùng kiểm tra dropdown bằng phiên đăng nhập hiện có, không chạy lại seed và không gọi AI nếu chưa duyệt riêng.

## S25.7.9.2.2 — Language catalog preparation

- Preparation implemented, chưa seed thật. Kiểm tra Language schema/catalog DTO/Translation target active/TTS Voice requirements. Chuẩn bị6 Language metadata vi/en/ja/ko/zh/fr (nativeName bắt buộc), không tạo Voice/AI results; provider language support đối chiếu tài liệu chính thức, runtime model/key/quality UNKNOWN. Không sửa schema/routes/TTS/STT/Admin/Mobile.
- Seed Language mới vì seed:voices hiện có không tạo languages. Idempotent setOnInsert, bỏ qua existing kể cả inactive, schema validation, unique-code-index prerequisite/concurrent duplicate guard; không overwrite/delete. Offline preview và default dry-run, explicit env/db/write approval, actual DB check, auto index/create OFF; production/sai target thiếu consent bị chặn. Không in secrets/driver errors.
- Catalog12/12 tests PASS với in-memory store + DB mocks và real JWT/HTTP GET /api/voices; offline dry-run PASS connections0/writes0. Backend lint/typecheck/build/git diff --check PASS; Gemini Translation mock regression26/26 PASS. Không chạy DB-writing npm test hoặc online seed/dry-run. Database writes0, AI API calls0; không commit/push.
- Hướng dẫn tại LANGUAGE_CATALOG.md. Cần user duyệt deployment/DB/env/6 records, rồi online read-only plan và unique index verification trước seed; DB name/env label không chứng minh Production isolation. Dropdown runtime vẫn thiếu catalog cho tới bước ghi được duyệt; TTS vẫn cần Voice thật riêng.

## S25.7.9.2.1 — Translation language dropdown

- PARTIAL: nguyên nhân runtime xác minh bằng đọc-only MongoDB cấu hình hiện tại: collection languages có0 bản ghi/0 active; không có dữ liệu để GET /api/voices trả options. Không phải TTS voice filter làm mất ngôn ngữ (backend trả toàn bộ Language active). Không ghi Atlas/seed/cleanup; không thêm static fallback làm vượt validation Language.exists.
- Sửa lỗi frontend phụ: bỏ guard isLanguageCode chỉ4 mã khỏi TranslationPage, chọn theo catalog thật và membership trong hook; normalize/dedupe mã/loại nguồn không phân biệt hoa thường. Dùng Intl.DisplayNames tiếng Việt với fallback tên catalog; không tạo danh sách supported mới. Deep-link target cũng kiểm tra catalog thay vì4 mã tĩnh.
- State loading/READY/EMPTY/ERROR rõ; empty xóa selected target/draft cũ và khóa select/Dịch; lỗi tải giữ metadata bản gốc và cho retry GET. Nút Dịch chỉ enabled khi selected catalog target/busy=false/không failed, không gọi AI khi chọn. UI UX Pro Max áp dụng empty/error recovery, không redesign.
- Web101/101 tests PASS; lint/typecheck/build và git diff --check PASS. Tests mô phỏng catalog vi/en/ja/ko/zh/fr chỉ trong runner, kiểm tra English/French selection, loading/error/retry/empty/loại Vietnamese, no POST, transcript immutable. Backend Translation mock26/26 PASS; không sửa backend. Browser dropdown E2E NOT RUN, English runtime selectable:NO do catalog thật rỗng. Warning build dynamic import có sẵn.
- Cần người dùng cho phép cấu hình Language catalog active trong DB đích đã xác nhận trước khi options thật xuất hiện. seed:voices hiện chỉ tạo voices từ Language có sẵn, không tạo languages và không khắc phục collection rỗng. Không tự chạy seed, không AI calls/Atlas writes, không commit/push.

## S25.7.9.2 — Gemini Translation integration

- PARTIAL: source/mock implemented, real runtime NOT RUN. Gemini default và cấu hình local TRANSLATION_PROVIDER=gemini; key hiện có PRESENT (không sửa/in key), model fallback gemini-3.8-flash theo tài liệu Google text/structured output. SDK2.28.0 có sẵn không cài thêm. OpenAI explicit giữ lại, STT/TTS không đổi. Model access với key thật UNKNOWN; không gọi metadata/generation.
- Full transcript/all original IDs/timestamps/index đưa vào một contextual structured generation; kiểm tra IDs/thứ tự/nội dung không rỗng, reject malformed/mapping lỗi/timestamps giả/extra fields. Không dùng2 cụm display thay21 segments. Transaction và FK segment có sẵn; kiểm tra nguồn trước ghi, bản dịch stale không được mở như bản dịch hiện hành; thất bại không ghi đè bản dịch cũ. Schema/migration0, Atlas writes0.
- Web placeholder/chọn ngôn ngữ rõ, disabled/loading, success từ saved API data, cancellation NOT_STARTED, ref guard double-submit; nhóm/time/confirmation/auth giữ nguyên. UI UX Pro Max chỉ feedback/selection, không redesign.
- New backend mock26/26 PASS; safe existing regression75/75 PASS (profile/filename/source-media/STT/Gemini STT + synthetic FFmpeg), tổng101/101 chạy an toàn không DB connection. Full npm test bộ118 có Atlas writes NOT RUN theo ràng buộc; không gọi đây là full regression PASS. Web96/96 PASS gồm5 hook/UI tests mới. Backend/Web lint/typecheck/build và git diff --check PASS. Build Web còn warning dynamic import có sẵn. Target phải tồn tại/active trong Language catalog thật, unsupported400 trước provider; fixtures DB integration phải chuẩn bị catalog tương ứng.
- Chưa xác minh real Gemini quality, tên riêng và semantic per-word alignment: mock không chứng minh chất lượng dịch, đặc biệt21 từ→2 cụm không có phrase-level storage contract. Provider không tự chia văn bản theo số từ; nếu không thể mapping yêu cầu fail. Browser E2E/model key access/Atlas persistence NOT RUN. Không sửa Mobile/Admin, không commit/push; chờ duyệt trước test Google thật.

## S25.7.9.1 — Translation UI consistency

- Source validation PASS; browser/runtime PARTIAL, chờ duyệt. Bản dịch dùng quy tắc nhóm Bản ghi trong lớp hiển thị, giữ21 phân đoạn gốc và timestamp mm:ss.SSS; read-only text tự co thay textarea disabled, hai cột responsive, trạng thái chờ dịch rõ ràng.
- Sửa mapping frontend bỏ qua ID thật: giữ Transcript DTO segment.id làm backendSegmentId, không đổi logical id; Translation sourceSegmentId phải khớp trước khi ghép, index theo sequence-1 không theo vị trí mảng. Group chỉ khi mapping một-một đầy đủ; thiếu/trùng/khác ID/thời gian/thứ tự thì từng phân đoạn kèm cảnh báo, nội dung chưa xác minh không ghép. Không API/schema/backend/provider changes, không mutation dữ liệu gốc.
- Web91/91 tests PASS (7 tests mới + cập nhật assertion timestamp cũ); lint/typecheck/build và git diff --check PASS. Coverage:21 từ bảo toàn/immutable, chờ dịch, bản dịch thật qua fixture có kiểm soát, mapping theo ID/source membership, stale/missing IDs, invalid timeline/index, DOM read-only/timestamps và responsive source boundaries. Build warning dynamic import có sẵn.
- Browser visual/E2E và dữ liệu dịch dự án thật NOT RUN. AI requests0; Atlas writes0; không sửa Mobile/Admin; không commit/push. Chờ người dùng duyệt giao diện.

## S25.7.8.10 — Transcript UI/UX final polish

- Source implemented; runtime PARTIAL, chờ người dùng duyệt. Giữ hai cột và native audio/video controls; bổ sung icon sóng âm và container audio gọn. Không thay transport/auth/provider/grouping/API/Database.
- Segment padding 16→12px, header số thứ tự/timestamp và nút Play gọn; thay textarea disabled bằng văn bản chỉ đọc có thể chọn/copy, chiều cao tự nhiên. Giữ mm:ss.SSS, focus/target44px, responsive wrapping. Sửa thứ tự CSS để active border/background không bị rule nền ghi đè; seeked cập nhật highlight ngay, pause/ended bỏ highlight, không auto-scroll.
- Web tests84/84 PASS; lint/typecheck/build và git diff --check PASS. Build còn warning dynamic import có sẵn. Ba regression tests mới kiểm tra DOM render, seek chính xác/disabled và CSS/native-control boundaries; không thay cho browser E2E.
- Người dùng xác nhận trước polish: MP3 playback và seek00:06.700 hoạt động. Browser visual/E2E sau polish NOT RUN; MP4 runtime chưa xác minh trong bước này. Không gọi AI, không ghi Atlas, không commit/push.

## S25.7.8.9 — Source Media Player

- SOURCE IMPLEMENTED / runtime PARTIAL: GET/HEAD source media file với JWT CUSTOMER ACTIVE/ownership, MIME MP3/MP4, Range206/416/suffix/open-ended, stream/abort/cache-private/path + realpath containment. Chỉ đọc file/metadata, không DB writes/schema changes/public uploads/query JWT.
- Web authenticated apiBlob + refresh-once hiện có, object URL native controls và cleanup/abort, tải theo thao tác (không autoplay). Transcript cụm có button seek/focus44px/ready guard; highlight theo currentTime và nhãn Đang phát, không scroll/transcript mutation/Gemini calls. Giữ hai cột/themes/AI/Translation/TTS/Mobile/Admin.
- Backend streaming tests14/14 PASS với route/auth thật + DB mocks/file fixtures; Web81/81 PASS gồm seek/play mocks, highlight, single-flight/error/retry/cleanup. Backend/Web lint/typecheck/build và git diff --check PASS; build warning dynamic import cũ. Browser E2E playback MP3/MP4/seek/refresh NOT RUN: chưa có browser session kiểm thử đã xác thực và không provision account/ghi Atlas trong bước này. Bytes HTTP/source tests không chứng minh codec/browser playback; regression DB cũ không chạy.
- Giới hạn: Web tải full blob trước phát, video lớn dùng bộ nhớ tương ứng; server vẫn streaming/Range. Không ghi Atlas, AI calls0, không commit/push; chờ duyệt.

## S25.7.8.8 — Transcript display grouping

- Customer Web display-only projection: nhóm word-like segments theo kết câu hoặc pause>=0.6s; giới hạn18 từ/8s/120 ký tự, giữ nguyên thứ tự/từ và start đầu/end cuối. Phrase/sentence có sẵn không gộp thêm. Không sửa provider/API/DB/schema/dữ liệu transcript21 segments người dùng báo đã lưu, không gọi lại Gemini.
- Timestamp riêng màn Bản ghi dạng mm:ss.SSS, ví dụ00:00.120→00:00.480, không cắt phần giây lẻ; helper Translation cũ không đổi. Timestamp lỗi/overlap không sort/clip/tạo giả mà hiển thị lỗi và retry load bằng GET. Số cụm hiển thị và số segment gốc ghi rõ.
- Unit tests grouping/punctuation/pause/order/immutable data/long runs/timestamps và integration source-boundary: Web74/74 PASS; lint/typecheck/build/git diff --check PASS (warning dynamic import có sẵn). Browser và dữ liệu dự án thật NOT RUN. UI UX Pro Max dùng derived data không effect/state sync; không thêm source playback, không ghi Atlas/paid AI/commit/push.

## S25.7.8.4 — Gemini STT integration

- Kiểm tra flags cuối lượt: Gemini selected=true, key PRESENT; không sửa `.env` thật hoặc gọi Google. Regression profile/filename mock19/19 PASS (ngoài42 Gemini/STT tests).

- IMPLEMENTED / runtime PARTIAL: thêm Google Gen AI SDK2.28.0, Gemini default và `.env.example`; giữ OpenAI explicit, API success DTO/controller/ownership/transaction/schema/frontend/Mobile/Admin/Translation/TTS không đổi. `.env` thật không sửa; cần người dùng cấu hình GEMINI_API_KEY/STT_PROVIDER/GEMINI_STT_MODEL.
- Model chuyên dụng gemini-3.5-transcribe theo tài liệu Google: Interactions verbatim/word timestamps/vi-VN; model access check trước upload, Files API/ACTIVE/cleanup, MP4 tách WAV và probe bằng FFmpeg, MP3 trực tiếp. Giới hạn ứng dụng500MiB/1 giờ. Timestamps thật map từng word; reject thiếu/âm/đảo thứ tự/chồng/vượt duration, không giả tạo.
- Phân biệt missing/invalid key, model permission, quota, invalid media, no speech, timeout/invalid response. Development chỉ log provider/code/status, không retry paid generation; preserve transcript cũ nếu lỗi. Không ghi Atlas hoặc gọi Gemini thật.
- Gemini + STT integration mock42/42 PASS; FFmpeg/FFprobe9.0.2 đã chạy extraction synthetic MP4 thật (Gemini mock), cleanup tệp test PASS. Backend lint/typecheck/build/diff check PASS. npm install báo audit0 vulnerabilities; SDK deprecated dependency warning node-domexception không gây lỗi. GEMINI_API_KEY hiện PRESENT (không in/kiểm tra key thật); GEMINI_STT_MODEL chưa đặt, dùng default. Real Gemini/model availability với key thật/browser STT E2E NOT RUN; chỉ chứng minh source/mock. Bộ regression có ghi Atlas không chạy. Không commit/push; chờ duyệt.

## S25.7.8.1 — Vietnamese upload filename encoding

- Root cause tái hiện bằng HTTP multipart thật: Multer mặc định defParamCharset=latin1 giải mã filename UTF-8 thành mojibake trước mediaService.upload. Frontend FormData không chuyển đổi tên; Media.originalName lưu giá trị nhận được, API/UI chỉ đọc lại.
- Chỉ đổi upload middleware sang defParamCharset=utf8; không chuyển latin1→UTF8 trên chuỗi đã giải mã, không sửa storage UUID/path/schema/API/UI. Charset khai báo rõ vẫn do parser xử lý.
- test:filename không connect DB: model mock + Mongoose validation, upload file synthetic vào mkdtemp riêng; cleanup chỉ thư mục test. 11/11 PASS gồm baseline lỗi cũ, ASCII/4 tên yêu cầu/Unicode/ký tự tổ hợp/literal Ã©/MP4 và explicit charset; API reload trả đúng originalName, storage metadata không lộ. Backend lint/typecheck/build và git diff --check PASS. Browser upload/reload/detail và Atlas persistence NOT RUN; bộ regression DB cũ không chạy vì chưa xác minh DB test riêng.
- Dữ liệu cũ không sửa tự động. Phương án: người dùng xác nhận tên gốc cho từng Media ID, backup/dry-run rồi chỉ cập nhật originalName với điều kiện giá trị cũ khớp; tuyệt đối giữ fileName/storagePath/projectId. Không tự suy đoán từ pattern mojibake (có thể là tên hợp lệ); migration cần phê duyệt riêng. Không commit/push/paid AI hoặc ghi Atlas.

## S25.7.7.12 — Final Account UI polish

- CSS-only layout: max-width840→820px; padding dọc32→24, content margin20/padding-top16, rows14 và cuối Email8px. Mục tiêu giảm chiều cao10–15% bằng khoảng trắng, không ép height hoặc che nội dung; chưa đo thực tế browser.
- Nút Chỉnh sửa lên đầu hàng tên với align-self:flex-start, giữ44px/outline/focus và mobile xuống hàng. Giữ avatar/font/badge/2 rows/Header/Sidebar/business logic; không thêm lại success text đã bỏ theo yêu cầu người dùng.
- Web tests66/66 PASS; lint/typecheck/build và git diff --check PASS. Build còn warning dynamic import có sẵn. Browser1440/768/375/edit/logout NOT RUN. Không sửa Backend/DB/API/Mobile/Admin/màn khác, không commit/push; chờ duyệt.

## S25.7.7.11 — Account Profile SaaS Modern

- SOURCE IMPLEMENTED: một card trắng840px, avatar80px + tên/email/role và Chỉnh sửa outline bên phải. Hai hàng thông tin Họ và tên/Email có đường phân cách, bỏ các ô nền xám và role row trùng. Không gradient/banner/sóng/card phụ.
- Giữ S25.7.7.9 edit/save/cancel/validation/loading/error/success và đồng bộ Header, dữ liệu thật, API hiện có; không viết lại business logic. Header/Sidebar/logout không sửa. Responsive button wrap và rows stacked mobile; theo UI UX Pro Max grouping/focus/semantic form.
- Web tests65/65 PASS; lint/typecheck/build PASS, git diff --check PASS. Warning dynamic import có sẵn không gây build fail. Browser1440/768/375/edit/save/cancel/logout NOT RUN. Không ghi DB/paid AI/dependency/Backend/Mobile/Admin changes, không commit/push; chờ duyệt.

## S25.7.7.9 — Edit user display name

- IMPLEMENTED, runtime còn chờ xác minh: Customer Account inline Chỉnh sửa/Lưu thay đổi/Hủy, trim/2–100 ký tự Unicode, loading/validation/error/success, double-submit lock; email/role không chỉnh sửa.
- API mới PATCH `/api/auth/me`: authenticate + strict payload chỉ fullName, userId từ phiên đã xác thực; atomic `$set.fullName` trên ACTIVE, safe user DTO, giữ email/role/password/session/schema. Không có API update profile cũ để tái sử dụng.
- Account state và Header subscription cập nhật tên/avatar từ response thành công; không Auth Context hiện có, không cache credentials mới. Reload đọc GET me từ Database; persistence thật chưa kiểm thử ghi.
- Backend test:profile dùng HTTP route/auth thật + Mongoose model mock, không connect Database: 8/8 PASS. Backend lint/typecheck/build PASS. Bộ npm test cũ NOT RUN vì các integration tests ghi Database từ env, chưa xác minh DB riêng.
- Web tests64/64 PASS, lint/typecheck/build PASS, git diff --check PASS; build warning dynamic import có sẵn. Lượt sandbox ban đầu bị spawn EPERM, đã chạy lại thành công ngoài sandbox. Browser NOT RUN. Không ghi Atlas, seed/cleanup/migration/paid AI/commit/push/Production deployment. Giữ Mobile/Admin và chức năng AI.

## S25.7.7.8 — Account compact profile

- SOURCE/RENDER VALIDATION PASS: một card trắng max-width840px/padding32px/avatar80px bên trái; tên/email/role gộp bên phải gap24px. Bỏ cover/gradient/sóng/pseudo-elements/chiều cao cố định và CSS positioning cũ.
- Divider trước Thông tin cá nhân; semantic dl grid2 cột desktop/1 mobile, mỗi label trên/value dưới gap6px, field gap20px/nền background không input/không icon. Giữ dữ liệu thật/authService.me/Header/Sidebar/logout dropdown, không API/backend/mobile/admin changes.
- UI UX Pro Max dùng grouping/semantic/readability/wrap dài. Card cách Header bằng main padding24px (mobile16+margin8), tablet padding24/mobile20px và summary wrap an toàn.
- Tests58/58 PASS, lint/typecheck/build/diff check PASS; dynamic import warning cũ. Browser1440/768/375/data/logout NOT RUN; ảnh tham chiếu không có trong lượt này nên chưa đối chiếu trực tiếp. Không commit/push; chờ duyệt.

## S25.7.7.7 — Account layout fix

- SOURCE VALIDATION PASS: cover clip sóng bằng overflow hidden riêng (trước chỉ card clip); nội dung cover có layer1/flex-shrink0, avatar trong normal flow không margin âm. Header sticky normal flow giữ nguyên; khoảng cách card dùng main padding24px, mobile padding16+margin8px, không cộng margin32 dư.
- Giữ 3 hàng grid label/value, vertical center/min-height60/padding24px; mobile stack khi thiếu chỗ. Không đổi Phương án B/auth/logout/routes/màn khác.
- Tests58/58 PASS, lint/typecheck/build/diff check PASS; warning dynamic import cũ. Browser1440/768/375/avatar overlap/logout NOT RUN; chưa xác nhận nguyên nhân avatar bị che trên runtime hoặc đối chiếu ảnh (ảnh không đính kèm lượt này). Không commit/push; chờ duyệt.

## S25.7.7.6 — Account profile Phương án B

- SOURCE/RENDER VALIDATION PASS: một card 1000px/radius16/overflow hidden; cover lavender min-height300px, 2 sóng CSS nhẹ không animation, avatar116px và tên/email/role căn giữa. Phần trắng tiêu đề Thông tin cá nhân và 3 hàng semantic dl label/value. Lặp identity có chủ đích theo Phương án B.
- Mobile avatar92px/cover min-height270px, hàng label trên/value dưới và wrap dài; không fixed height cắt nội dung. Bỏ avatar overlap/layout cũ. Không icon/input/CTA/secondary card. Route/header/Sidebar/authService.me/loader/retry/logout dropdown giữ nguyên.
- Tests57/57 PASS (React-rendered markup: một card/3 rows/dữ liệu role thật/no icons), lint/typecheck/build/diff check PASS; dynamic import warning cũ. Browser visual/1440/768/375/dữ liệu phiên/logout runtime NOT RUN; chưa có ảnh tham chiếu trực tiếp trong lượt này để đối chiếu pixel.
- Không sửa Backend/DB/Mobile/Admin/màn khác, không commit/push; chờ duyệt. UI UX Pro Max áp dụng semantic/readability/long-text responsive.

## S25.7.7.5 — Account complete layout redesign

- SOURCE/RENDER VALIDATION PASS: `/settings` vẫn dùng SettingsPlaceholder, render AccountProfile một card duy nhất max-width 880px. Cover 150px (mobile 140px) lavender; avatar 88px overlap 44px; nội dung trắng chỉ hiển thị tên/email/role một lần.
- Bỏ banner/card thông tin tách rời, dl/ô giống input/icon trang trí và CSS layout cũ. Không thêm mục thông tin trống vì API hiện chỉ có tên/email/role. Header/Sidebar/Profile dropdown/logout/auth/load/retry giữ nguyên.
- Tests 57/57 PASS, gồm React renderToStaticMarkup kiểm tra một section/card, số lần xuất hiện dữ liệu, avatar/cover và escaping; đây không phải DOM/browser runtime. Lint/typecheck/build/diff check PASS; warning dynamic import cũ.
- Browser DOM/visual và logout thực tế NOT RUN; responsive source có tablet/mobile padding và long-text wrapping. Không sửa Backend/DB/Mobile/Admin/màn khác, không commit/push; chờ duyệt.

## S25.7.7.4 — Modern Account Profile UI

- SOURCE VALIDATION PASS: banner lavender nhẹ dùng token hiện có, padding desktop 32px/avatar 80px, tên/email/role thật; card Thông tin cá nhân trắng riêng bên dưới, semantic read-only dl/grid 2 cột và icon user outline.
- Header/Profile/authService.me/loading/error/retry không đổi. Không card Thông tin tài khoản/Bảo mật, không logout trong nội dung; dropdown giữ logout/confirmation/service hiện có. Không sửa màn khác/API/Backend/DB/Mobile/Admin.
- Responsive source: max-width 960px, tablet padding 24px, mobile banner dọc/padding 20px/grid 1 cột và wrap tên/email. Áp dụng UI UX Pro Max cho hierarchy/token/semantic/overflow, không thêm dependency.
- Web tests 55/55 PASS, lint/typecheck/build/diff check PASS; warning dynamic import có sẵn. Browser visual/data/logout và 1440/768/375 NOT RUN. Không commit/push; chờ duyệt.

## S25.7.7.3 — Account UI refinement

- SOURCE VALIDATION PASS: một card hồ sơ tối đa 960px, avatar 64px/tên/email/badge role thật, divider và Thông tin cá nhân chỉ đọc có label/vùng nền nhạt; grid desktop 2 cột, mobile 1 cột.
- Subtitle `/settings`: “Quản lý thông tin cá nhân của bạn.” Không search/tiêu đề trùng. Bỏ card bảo mật và nút logout trong nội dung; Profile dropdown vẫn có logout với confirmation/service/guard/navigation không đổi.
- UI UX Pro Max hướng dẫn semantic read-only data, token hiện có và wrap dữ liệu dài. Không sửa API/auth/Backend/DB/Mobile/Admin/màn khác. Giữ loading/error/retry account.
- Tests 55/55 PASS, lint/typecheck/build và git diff --check PASS. Build còn warning dynamic import có sẵn; browser dữ liệu/avatar/logout/responsive 1440/768/375 NOT RUN. Không commit/push; chờ duyệt.

## S25.7.7.1 — Account UI redesign

- SOURCE VALIDATION PASS: Header riêng `/settings` có tiêu đề lớn/subtitle, không search hay tiêu đề lặp; Profile dropdown giữ nguyên.
- Hai card Hồ sơ cá nhân và Bảo mật và phiên đăng nhập: dữ liệu thật từ `authService.me()`, avatar dùng profileIdentity, vai trò tiếng Việt theo role thật; thông tin chỉ đọc. Giữ nguyên confirmation/logout lock/service/navigation, loading/error/retry.
- Áp dụng UI UX Pro Max: phân cấp chữ, semantic section/dl, focus và nút tối thiểu 44px, card responsive/long text. Không sửa Backend/DB/Mobile/Admin hoặc logic xác thực.
- Web tests 55/55 PASS; lint/typecheck/build PASS. Build còn warning dynamic import cũ. Browser visual/data/logout và responsive 1440/768/375 NOT RUN; chưa coi source tests là runtime PASS. Không commit/push; chờ duyệt.

## S25.7.6.4 — History final UI polish

- SOURCE VALIDATION PASS: numeric pagination/current page/ellipsis động + summary; bỏ demo note lặp dưới badge, banner giải thích đầy đủ; padding bảng 8px/dòng ngắn 68px.
- Giữ History filter/10 records/page/API full-page loader/routes/auth/demo flag/fixtures. Không sửa màn khác, Backend/DB/Docker/Mobile/Admin; không paid AI/seed/cleanup/commit/push.
- Web tests 53/53 PASS, lint/typecheck/build và git diff --check PASS; build warning dynamic import cũ. Browser visual/interaction responsive NOT RUN; chờ người dùng duyệt.

## S25.7.6.3 — History UI and demo fixtures

- SOURCE VALIDATION PASS, browser visual/interaction NOT RUN. History 5-column table theo createdAt, Vietnamese language labels, horizontal/vertical borders, compact rows/name disclosure và vùng scroll responsive.
- VITE_HISTORY_DEMO=true + DEV, mặc định OFF và độc lập Project List flag; 20 fixture không artifact, trạng thái giả lập và không business action. API OFF giữ useCompleteHistory full-page loader và Project Detail route; không sửa Project List/Backend/DB/Mobile/Admin/Docker.
- Filter AND/Enter reset, 10 dòng/page, tổng thực và current page primary; empty/loading/error giữ rõ. Web tests 51/51 PASS, lint/typecheck/build và git diff --check PASS; dynamic import warning cũ không lỗi. Không commit/push/paid AI; chờ duyệt.

## S25.7.4.12.1 — Project List UI polish

- SOURCE VALIDATION PASS; browser visual/interaction NOT RUN. Banner demo gọn; caption trùng ẩn trực quan đúng semantic; nhãn ngôn ngữ tiếng Việt; table gọn/tên hai dòng + focus disclosure; pagination summary và số trang primary.
- Giữ 20 fixture/flag DEV mặc định OFF; mô phỏng trạng thái ghi rõ không có tệp thật; không business links/API list trong demo. API OFF vẫn loader/routes/auth thật, không chỉnh Backend/DB/Docker/Mobile/Admin/màn khác.
- Web tests 48/48 PASS; lint/typecheck/build PASS; git diff --check PASS. Build có cảnh báo dynamic import cũ, không lỗi. Không commit/push/AI call; chờ duyệt responsive và UI thực tế.

## S25.7.4.11 — Frontend Demo Fixtures (No Docker)

- Chuẩn bị fixture 20 Project chỉ trong Customer Web Project List, explicit VITE_PROJECT_LIST_DEMO=true + DEV, mặc định OFF/Production không bật. Nhãn demo rõ và chặn business links; không ghi DB/seed/cleanup/AI.
- Demo dùng cùng filter/sort/client pagination; API loader chỉ mount ở nhánh OFF. Không sửa Backend/Mobile/Admin/Docker/auth. Vẫn cần session Customer hiện có; không giả login và không fixture Dashboard/History.
- Runtime/browser NOT RUN, chờ duyệt. Tests bổ sung guard flag, fixture shape, filter/date/sort/pagination và chặn route/API trong nhánh demo. Không commit/push.
- Validation: Web tests 45/45 PASS; lint/typecheck/production build và git diff --check PASS. Build giữ cảnh báo dynamic import hiện có (không lỗi). Áp dụng UI UX Pro Max về nhãn dữ liệu mô phỏng và trạng thái read-only; không redesign.

## S25.7.4.10 — Docker MongoDB Demo preparation

- Chuẩn bị `infra/mongodb-demo/`: Compose mongo:8.0.17, loopback 27018, volume/network/container riêng, auth + app readWrite user + authenticated healthcheck. Secrets file mount gitignored, không dùng credential Atlas.
- Backend launcher/config mẫu riêng 8081, Web env hướng 8081 với origin 5175. Backend guard kiểm tra Local endpoint và config; không sửa backend/.env/schema/API/UI.
- Docker Desktop installed; CLI 28.5.2, Compose 2.40.3, Engine unavailable/service stopped. Không khởi động Docker/container/pull image, không seed/cleanup. Runtime isolation/auth chưa xác minh.
- Chờ người dùng mở Docker Desktop, tạo Local secrets và phê duyệt up. Không commit; hướng dẫn start/stop giữ volume tại infra/mongodb-demo/README.md.

## S25.7.4.9 — Local MongoDB Development preparation

- Community Server chưa phát hiện trong PATH/vị trí mặc định/process; Docker Desktop có, CLI 28.5.2 nhưng Engine unavailable/service stopped. Không có local listener 27017/27018 theo netstat.
- Đề xuất Local `_ui_demo` khớp seed allowlist, backend riêng 8081/Web 5175; template và checklist auth/endpoint/proxy verification ở `docs/LOCAL_DEVELOPMENT.md`.
- Chưa xác minh cách ly Production/auth Local, chưa kết nối hoặc tạo dữ liệu, không khởi động/cài phần mềm, không chạy seed/cleanup. Chờ người dùng duyệt thiết lập Local.

## S25.7.4.8 — Development database safety audit

- Hoàn tất audit cấu hình/source, chưa xác minh cách ly hạ tầng/quyền. Đề xuất `multilingual_ai_narration_dev` trên deployment và credential riêng, không quyền ghi Production.
- Script hiện allowlist `_ui_demo`, chưa đổi sang `_dev`; phải đồng bộ sau khi duyệt. NODE_ENV/tên Database không đủ chứng minh cách ly. Cleanup có race check/delete; không chạy với writer đồng thời.
- Hướng dẫn chuyển backend/Web sang bản sao + cấu hình/cổng/origin riêng trong `docs/DEMO_PROJECTS.md`. Không sửa application/schema/API.
- Pure tests 2/2 PASS; không kết nối, seed, cleanup hoặc tạo Atlas resource. Có thể cho phép seed: NO, chờ xác nhận đích/quyền và phê duyệt. Không commit.

## S25.7.4.7 — Demo projects development only

- Script và hướng dẫn: `backend/src/scripts/seed-demo-projects.ts`, `docs/DEMO_PROJECTS.md`. **Seed/cleanup NOT RUN**, không kết nối hoặc ghi Atlas trong bước này.
- Chưa xác minh Database test tách biệt. Guard bắt buộc NODE_ENV development/test, URI riêng DEMO_MONGODB_URI, database allowlist và xác nhận rõ ràng; không load/fallback backend/.env.
- Chuẩn bị 20 DRAFT (thay phân bổ trạng thái dự kiến vì không được giả mạo media/jobs/results). Tài khoản CUSTOMER demo riêng, ID ổn định, marker/owner kiểm soát seed/cleanup; cleanup từ chối dữ liệu liên quan và không xóa tài khoản/tệp.
- Kiểm tra UI với dữ liệu seed và database idempotence/cleanup runtime NOT RUN. Chờ người dùng xác nhận đích và cho phép chạy; không commit.
- Validation: tests thuần `node --import tsx --test tests/demo-projects.test.ts` 2/2 PASS (guard môi trường/Database và 20 record schema/API-valid); backend lint/typecheck/build và git diff --check PASS. Không chạy backend regression/database runtime trong bước chuẩn bị này.

## Current Sprint

S23 FFmpeg / Media Processing

## Status

COMPLETED — implementation, regression và real FFmpeg smoke test đã PASS

## Implemented

- MediaProcessor abstraction và FFmpeg/FFprobe implementation dùng `spawn`, argument array, `shell:false`, timeout cấu hình.
- API xử lý video, Result metadata/list/detail và protected MP4 streaming có HTTP Range.
- Narration thay thế audio gốc; H.264/AAC MP4, thời lượng theo source video, output được FFprobe kiểm tra.
- ProcessingJob VIDEO_PROCESSING, retry, idempotency, concurrency protection và project-scoped cleanup.
- S23 regression và real FFmpeg smoke test PASS với FFmpeg/FFprobe 9.0.2.

## S23.5 Real FFmpeg Validation

- FFmpeg `9.0.2-full_build-www.gyan.dev`: PASS.
- FFprobe `9.0.2-full_build-www.gyan.dev`: PASS.
- Fixture tổng hợp tạm: video màu 320×240 dài 2 giây và tone audio dài 1 giây; không dùng AI API hoặc media người dùng.
- `FfmpegMediaProcessor` composition: PASS; output MP4 có video stream, audio stream, duration dương và file size khác 0 theo FFprobe.
- Fixture/output tạm được xóa sau test; không xóa development media.
- Full regression: 101 passed, 0 failed, 0 skipped.
- Lint, typecheck, build: PASS.
- MongoDB Atlas và `GET /api/health`: PASS.
- Terminal process cũ chưa nhận WinGet PATH mới; development `.env` cục bộ đang trỏ tới binary đã cài và vẫn được Git ignore. Mở terminal/VS Code mới để `ffmpeg` và `ffprobe` hoạt động trực tiếp qua PATH.

- TTS provider abstraction và OpenAI `/v1/audio/speech` adapter, model cấu hình `gpt-4o-mini-tts`, MP3.
- API tạo/lấy narration và protected audio; dùng Translation hoàn tất và Voice catalog server-side.
- Audio nằm trong project-scoped filesystem; MongoDB chỉ lưu metadata/path tương đối.
- Hỗ trợ nhiều language/voice, idempotency, retry, active-job concurrency protection và cleanup khi xóa Project.
- S18–S22: 91 tests PASS; S22 dùng mock provider, không tiêu thụ OpenAI credit.

- Translation provider abstraction và OpenAI Responses API adapter với structured JSON output.
- API tạo/lấy bản dịch đồng bộ theo segment; lưu `Translation` và `TranslationSegment` theo source alignment.
- Hỗ trợ nhiều target language, idempotency, retry và khóa active job cùng target.
- S18–S21: 82 tests PASS; S21 tests dùng mock provider, không tiêu thụ OpenAI credit.

- STT abstraction và OpenAI `whisper-1` adapter; synchronous transcription/transcript endpoints.
- Transcript/ordered timestamp segments persistence và ProcessingJob lifecycle.
- Retry/failure handling, atomic duplicate protection và safe provider errors.
- S18–S20: 72 tests PASS; real OpenAI smoke NOT RUN vì thiếu API key.

- Customer Project CRUD với search, status filter, pagination và ownership enforcement.
- Multipart audio/video upload, MIME/size validation và server-generated filename.
- Một source Media mỗi Project; replacement/delete/project-delete cleanup metadata và file.
- Binary lưu dưới ignored `backend/uploads/`; MongoDB chỉ lưu metadata/path nội bộ.
- Client không thể gán `userId`, `status`, `progress`; Admin bị chặn khỏi Customer routes.

- `POST /api/auth/register`, `login`, `refresh`, `logout` và `GET /api/auth/me`.
- bcrypt password hashing; safe user serialization không trả `passwordHash`.
- Access/refresh JWT dùng secret và token type riêng.
- Persistent `AuthSession` chỉ lưu SHA-256 refresh-token hash; rotation, reuse rejection và logout revocation.
- Authentication middleware tải lại User và từ chối tài khoản `BLOCKED`; typed RBAC middleware cho `CUSTOMER`/`ADMIN`.
- Zod validation, Helmet, auth rate limiting và error codes thống nhất.
- `npm run seed:admin` idempotent, không hard-code credential và không nâng quyền Customer.
- ActivityLog best-effort cho register/login/logout, không log password/token.

## Architecture / Boundaries

- `users` dùng chung cho Customer/Admin; không có collection actor riêng.
- `authsessions` cung cấp server-side refresh revocation; raw refresh token không được lưu.
- Project ownership, CRUD, upload, AI provider, queue/worker và FFmpeg vẫn ngoài S18.
- Ba frontend vẫn dùng mock/service hiện tại và chưa được nối với backend.

## S19 Validation

- S18 + S19 regression: PASS — 63 tests, 0 failed.
- Atlas data và filesystem fixtures được cleanup đúng phạm vi.
- Lint, typecheck, build: PASS.
- Frontend không thay đổi.

## Validation

- `npm test`: PASS — 35 tests (parent + 34 cases), dữ liệu Atlas được cô lập và cleanup theo ID/email test.
- `npm run lint`, `npm run typecheck`, `npm run build`: PASS.
- MongoDB Atlas/Auth runtime: PASS trong test process với DNS workaround của môi trường.
- Frontend không thay đổi trong S18.

## Important Files

- `backend/src/controllers/auth.controller.ts`, `services/auth.service.ts`
- `backend/src/routes/auth.routes.ts`, `validators/auth.validator.ts`
- `backend/src/middleware/authenticate.middleware.ts`, `authorize.middleware.ts`
- `backend/src/models/AuthSession.ts`, `utils/jwt.ts`, `utils/password.ts`
- `backend/src/scripts/seed-admin.ts`, `backend/tests/auth.test.ts`

## Known Limitations

- Local `.env` cần bổ sung các biến JWT khác nhau và `ADMIN_SEED_*` trước khi chạy/seed; credential không được commit.
- Chưa có Project/Media CRUD, upload hoặc frontend auth integration.
- Chưa tích hợp TTS, FFmpeg, queue hay worker; frontend chưa gọi backend thật.

## Next

S24 Full Frontend / Backend Integration.

## S16.5 — Full Vietnamese Localization

- Customer Web Vietnamese localization: PASS
- Admin Web Vietnamese localization: PASS
- Mobile Vietnamese localization: PASS
- Customer validation: PASS
- Admin validation: PASS
- Mobile validation: PASS
- Frontend Freeze: YES
- Đã thống nhất thuật ngữ TTS thành “Giọng đọc”; giữ nguyên enum, route, identifier và các giá trị kỹ thuật.
- Không bổ sung backend, API, cơ sở dữ liệu hoặc tích hợp AI thực.

## S24 — Frontend / Backend Integration (PARTIAL)

- Customer Web: real register/login/logout/me session client, refresh-token rotation with single-flight retry, protected routes, and real project creation + multipart media upload.
- Customer Mobile: same real authentication flow, refresh token stored with `expo-secure-store`, protected navigation, and real project creation + media upload. Physical devices must set `EXPO_PUBLIC_API_BASE_URL` to a reachable LAN address.
- Admin Web: real ADMIN login/me/logout client and ADMIN route guard. Management screens remain explicitly mock because the backend has no admin business APIs.
- Still not integrated: real project list/detail/edit/delete UI, transcript/translation/narration/processing/result screens, protected binary playback/download, Customer voice catalog, and Admin dashboard/users/projects/jobs/languages/voices/logs/settings.
- S24.1 resolved the Customer voice-catalog and Admin monitoring API blockers. Editor save/update endpoints remain absent; no endpoint was invented and no paid AI request was made.
- Validation (2026-10-08): backend 101/101 tests PASS; backend lint/typecheck/build PASS; health PASS with Atlas `database: connected`; Customer Web lint/typecheck/build PASS; Admin Web lint/typecheck/build and 1/1 test PASS; Mobile lint/typecheck PASS; Expo Doctor 21/21 PASS.
- S24 status: **PARTIAL**. Next work must close the API gaps and replace the remaining mock services before S24 can be marked complete.

## S24.1 — Missing Backend APIs

- Customer active Voice Catalog: implemented with CUSTOMER JWT and safe DTOs.
- Admin dashboard, users/status, projects, jobs, languages, voices, logs and read-only settings: implemented with ADMIN JWT/RBAC.
- No database redesign, fake production rows, destructive Project/Job Admin mutations or paid AI calls.
- New S24.1 suite: 17 tests PASS (16 behavioral subtests plus parent), including auth/RBAC, blocked accounts, empty catalog, pagination/filter/search, safe DTOs, status validation, refresh revocation, no privilege escalation and no destructive mutation.
- Full regression: 118 passed, 0 failed, 0 skipped (baseline 101 + 17 S24.1 tests).
- `npm run lint`, `npm run typecheck`, `npm run build`: PASS.
- MongoDB Atlas runtime and `GET /api/health` with `database: connected`: PASS on 2026-10-09.
- S24.1 status: **COMPLETED**. Next: S24.2 Customer Web Integration.

## S24.2 — Customer Web Full API Integration

- Customer Web dùng API thật cho register/login/me/logout, refresh-token rotation, danh sách/chi tiết/cập nhật/xóa project, tạo project và multipart media upload.
- Workflow Customer dùng backend thật: STT, Translation, Voice Catalog, TTS, FFmpeg processing, Result/History, phát và tải artifact có JWT qua Blob URL.
- Các thao tác có thể gọi AI tính phí (STT, Translation, TTS) đều yêu cầu xác nhận người dùng. Validation không tự gọi paid provider.
- Backend chưa có endpoint sửa transcript/translation; UI hiển thị dữ liệu persisted ở chế độ chỉ đọc thay vì giả lập lưu thành công.
- Validation (2026-10-09): Customer Web typecheck/lint/build PASS (105 modules; package không có test script). Backend regression 118/118 PASS; backend lint/typecheck/build PASS. Manual authenticated browser smoke chưa chạy vì không có test credential được cung cấp; không gọi paid AI.
- S24.2 status: **PARTIAL** cho đến khi hoàn tất browser smoke có tài khoản test và pagination UI phía Customer Projects. Next: S24.3 Admin Web Integration.

## S24.2.1 — Customer Web Final Validation

- Customer Projects dùng server-side `page`, `limit=10`, `search` và exact canonical `status`; Previous/Next hiển thị tổng số/trang từ response backend. Search/filter reset về trang 1 và state được giữ trong URL.
- Chrome/CDP browser smoke: PASS với Customer disposable đăng ký qua API UI; register/login/logout, refresh rotation tự động, 11 project qua 2 trang, search reset, create/detail/update/delete và WAV upload đều PASS. Các project test đã được xóa; không xóa development data và không gọi paid AI endpoint.
- Existing artifact retrieval: transcript thiếu trả controlled 404; translation/narration/result list và Voice Catalog (kể cả empty state) trả response thật. Transcript/Translation vẫn read-only.
- Protected binary: frontend Bearer fetch → Blob URL và backend protected narration/result/range tests PASS. Actual browser playback/download của artifact không chạy vì disposable account không có artifact và validation bị cấm gọi paid AI.
- Validation: Customer Web lint/typecheck/build PASS; browser smoke PASS; backend 118/118 tests, lint/typecheck/build PASS; Atlas health `database: connected`.
- S24.2.1 status: **COMPLETED**. Next: S24.3 Customer Mobile Integration.

## S24.3 — Customer Mobile Full API Integration

- Mobile dùng backend thật cho auth/refresh/logout, project server-side pagination/search/filter, project create/detail/update/delete và multipart media upload với field `file`.
- STT, Translation và TTS gọi endpoint thật sau xác nhận rõ thao tác có thể tính phí; validation không gọi paid AI. Transcript và Translation giữ read-only vì backend chưa có update API.
- Voice Catalog, processing, result/history dùng dữ liệu backend. Protected audio/video được tải bằng Bearer JWT vào Expo cache; không đưa token vào URL; playback dùng `expo-audio`/`expo-video`, tải/chia sẻ dùng `expo-sharing`.
- Đã xóa các runtime mock repository/service/fixture Customer Mobile. Giữ Expo managed workflow và Expo Go compatibility.
- Validation (2026-10-09): lint PASS (0 lỗi, 0 cảnh báo), typecheck PASS, Expo Doctor 21/21 PASS, Android Expo export PASS (1,377 modules), Metro/Expo Go QR LAN PASS.
- Physical-device authenticated smoke, actual upload/playback/download: **NOT RUN** vì môi trường không có thiết bị Android/iOS kết nối. Không gọi paid AI và không tạo/xóa dữ liệu Atlas.
- S24.3 status: **PARTIAL** chỉ vì chưa chạy physical-device smoke. Next: S24.4 Admin Web Integration.

## S24.4 — Admin Web Full API Integration

- Admin auth tiếp tục dùng JWT thật, refresh rotation single-flight, role guard và backend ADMIN RBAC.
- Dashboard, Users/detail/status, Projects/detail, Jobs/detail, Languages, Voices, Activity Logs và safe Settings đã dùng S24.1 Admin APIs thật.
- Users/Projects/Jobs/Logs truyền search/filter/sort/page/limit đến backend; Customer status mutation có confirmation và refresh dữ liệu.
- Projects hiển thị owner, media metadata, toàn bộ `targetLanguages[]` và related jobs; không tạo target language giả.
- Languages, Voices và Settings là read-only. Retry/Cancel Job không còn tạo thành công giả.
- Đã xóa toàn bộ production runtime mock/fixture/store/scenario khỏi `admin-web/src`.
- Validation (2026-10-09): Admin lint PASS, typecheck PASS, build PASS (85 modules), test PASS 1/1. Backend không đổi nên không chạy lại 118-test regression.
- Authenticated browser smoke: **NOT RUN** vì không có disposable ADMIN credential được provision an toàn; không register/elevate Customer và không dùng credential cá nhân.
- S24.4 status: **PARTIAL** chỉ vì authenticated browser smoke chưa chạy. Next: S24.5 Full Integration Validation.

## S24.5 — Full Integration Validation

- Backend regression thực thi lại: 118/118 PASS; lint, typecheck và build PASS. Runtime MongoDB Atlas PASS; `GET /api/health` trả HTTP 200 với `database: connected`; API root HTTP 200 và unknown route HTTP 404.
- Backend tests xác nhận refresh rotation/reuse rejection, blocked users, CUSTOMER/ADMIN RBAC, project ownership/IDOR, protected narration/result delivery, safe DTO/errors và toàn bộ mock-provider pipeline. Không gọi paid AI.
- Customer Web lint/typecheck/build PASS (105 modules). Authenticated Chrome smoke PASS bằng Customer disposable: register/login/logout, refresh rotation, 11-project pagination/search reset, CRUD, WAV upload, retrieval/empty states và cleanup project test.
- Actual protected artifact playback/download trên browser: **NOT RUN** vì disposable Customer không có artifact và validation không được gọi paid AI. Backend protected binary/range regression PASS.
- Customer Mobile lint/typecheck PASS, Expo Doctor 21/21 PASS, Android Hermes export PASS (1.377 modules). Device smoke và protected playback: **NOT RUN** vì không có ADB/device. `frontend-mobile/.env` hiện có API URL không dùng localhost và có hậu tố `/api`; giá trị cụ thể không được ghi vào tài liệu.
- Admin Web test 1/1, lint/typecheck/build PASS (85 modules); API mapping được test bằng mocked HTTP. Authenticated Admin browser smoke: **NOT RUN** vì không có disposable ADMIN credential an toàn; script browser S13 cũ phụ thuộc mock/credential demo nên không được dùng.
- FFmpeg real synthetic composition giữ kết quả S23.5 PASS; S24.5 không gọi lại paid provider. Mobile `npm audit`: 30 findings (11 moderate, 18 high, 1 critical), chủ yếu transitive Expo/Metro toolchain; không chạy `npm audit fix --force` vì đề xuất downgrade/major version không tương thích SDK 57.
- Secret/git safety: backend `.env` được ignore, không có `.env` tracked, credential-pattern scan 0 hit, `git diff --check` PASS.
- Defect sửa trong S24.5: loại bỏ chú thích runtime “Mock revision guard” còn sót ở Customer Web; không thay đổi contract hoặc UI.
- S24 status: **PARTIAL**. Còn thiếu Mobile physical-device smoke, Admin authenticated browser smoke và actual protected artifact playback/download.

## S24.3.1 — Mobile Render Loop Fix

- Nguyên nhân gốc nằm trong `AuthBoundary`: khi cần chuyển hướng, effect vừa gọi `router.replace(...)` vừa đánh dấu pathname nguồn là đã kiểm tra. Vì vậy route nguồn có thể render trước khi navigation commit; tại route `/`, `<Redirect href="/dashboard">` cạnh tranh với chuyển hướng chưa đăng nhập sang `/login`, tạo chuỗi cập nhật navigation lồng nhau trên React Fabric.
- Guard hiện giữ màn hình chờ trong suốt redirect, không đánh dấu route nguồn là hợp lệ và chỉ render children sau khi pathname đích đã được xác thực. SecureStore, refresh-token rotation, Customer API integration và cấu trúc Expo Router được giữ nguyên.
- Validation (2026-10-09): Mobile lint PASS, typecheck PASS, Expo Doctor 21/21 PASS, Android Hermes export PASS (1.377 modules), `npx expo start --clear` PASS và QR Expo Go được hiển thị.
- Physical-device navigation/auth smoke: **NOT RUN** vì môi trường không có ADB hoặc thiết bị/emulator kết nối. Không có test runner Mobile phù hợp để thêm automated render/navigation regression test mà không mở rộng kiến trúc kiểm thử.
- S24.3.1 status: **PARTIAL** cho đến khi xác nhận trên Expo Go Android thật rằng khởi động, login/logout và protected navigation không còn `Maximum update depth exceeded`.

## S24.3.2 — Mobile Register Fix

- Nguyên nhân runtime chính: `frontend-mobile/.env` vẫn dùng địa chỉ LAN mẫu, không trùng IPv4 hiện tại của máy phát triển, nên Expo Go không thể gửi request đăng ký tới backend. Cấu hình local đã được đổi sang địa chỉ LAN hiện tại, giữ đúng cổng `8080` và hậu tố `/api`; giá trị cụ thể không được commit hoặc ghi vào tài liệu.
- Mobile validation trước đây chỉ kiểm tra độ dài mật khẩu, trong khi backend còn yêu cầu chữ hoa, chữ thường và chữ số. Validation Mobile hiện khớp giới hạn backend; form cũng phân loại rõ lỗi network, `EMAIL_ALREADY_EXISTS`, `VALIDATION_ERROR` và lỗi 5xx bằng thông báo tiếng Việt.
- Kiểm tra thật qua cùng LAN base URL: `GET /api/health` HTTP 200; payload đăng ký cố ý không hợp lệ tới được backend và trả HTTP 400, code `VALIDATION_ERROR`. Không tạo tài khoản Atlas chỉ để validation.
- Validation (2026-10-09): Mobile lint PASS, typecheck PASS, Expo Doctor 21/21 PASS, Android Hermes export PASS (1.377 modules); backend regression 118/118 PASS.
- Device register smoke: **NOT RUN** vì môi trường không có ADB/device. S24.3.2 status: **PARTIAL** cho đến khi đăng ký thành công được xác nhận trực tiếp trên Expo Go Android.

## S24.3.3 — Persistent Mobile Navigation Loop Fix

- Nguyên nhân gốc của vòng lặp còn lại: `AuthBoundary` cũ vừa tháo `<Stack>` khỏi cây render khi phiên chưa được kiểm tra, vừa gọi `router.replace()` dựa trên pathname. Navigator vì thế bị điều hướng trước khi/đúng lúc root navigator mount lại; đồng thời `app/index.tsx` có `<Redirect href="/dashboard">`, tạo hai nguồn cập nhật Expo Router store. Stack runtime trên thiết bị (`useSyncState`/`ContextNavigator`) phù hợp với xung đột này.
- Kiến trúc mới luôn mount root `<Stack>`. SecureStore được khởi tạo một lần thành state machine `loading | unauthenticated | authenticated`; ba `Stack.Protected` loại trừ nhau lần lượt mở initialization route, login/register hoặc tabs/projects. Không còn `Redirect`, `usePathname` hay auth `router.replace()` trong boundary/login.
- Luồng: initialization chỉ hiển thị spinner; chưa đăng nhập và logout mở auth routes; login/session restore mở app routes; refresh thành công giữ authenticated, refresh thất bại xóa SecureStore và mở login; đăng ký thành công vẫn điều hướng bình thường về login khi đang unauthenticated.
- Regression test Node mới: 4/4 PASS, xác nhận mỗi auth state chỉ mở đúng một route group và bao phủ loading, unauthenticated/logout, authenticated. Không thêm dependency test.
- Validation (2026-10-09): lint PASS, typecheck PASS, Expo Doctor 21/21 PASS, Android Hermes export PASS (1.378 modules), Metro Android development bundle HTTP 200/PASS (1.361 modules), QR workflow PASS.
- Device runtime: **NOT RUN** vì môi trường không có ADB/device. S24.3.3 status: **PARTIAL**; source/bundle validation không được xem là bằng chứng Android runtime đã hết lỗi.

## S24.3.4 — Mobile Route Registration and Logout UI

- Android device report trước thay đổi xác nhận startup, register, login, Dashboard, Projects và session restoration PASS; logout chưa test vì chưa có UI.
- Warning `[Layout children]: No route named "projects"` xuất hiện vì root Stack khai báo một child `projects` không tồn tại: không có `projects/_layout.tsx`, còn Expo Router nhận từng file `projects/new` và `projects/[projectId]/*` là direct route names. Protected group hiện khai báo đúng toàn bộ route thực tế; project deep links/screens được giữ nguyên.
- Thêm tab `Tài khoản`, lấy tên/email thật từ `GET /api/auth/me`, hiển thị xác nhận trước khi đăng xuất và gọi auth logout hiện có. Backend refresh session được thu hồi khi reachable; local SecureStore luôn được xóa trong `finally`; không gọi `router.replace` khi logout.
- Session store dùng revision và serialized SecureStore mutations. Logout hoặc session mới vô hiệu hóa refresh request cũ, ngăn token rotation đang bay ghi lại phiên sau khi đã logout.
- Regression tests: 6/6 PASS, gồm auth route state machine, logout invalidates in-flight refresh và login mới thắng thao tác logout cũ. Lint/typecheck PASS; Expo Doctor 21/21 PASS; Android Hermes export PASS (1.381 modules); Metro Android bundle HTTP 200/PASS (1.361 modules) và không còn missing-route warning trong output đã kiểm tra.
- Android Expo Go physical-device smoke do người dùng xác nhận: **PASS 8/8** — startup, không còn missing-route warning, Account tab, thông tin tài khoản thật, xác nhận logout, logout về Login, relaunch vẫn logged out, login lại và Dashboard/Projects hoạt động.
- S24.3.4 status: **COMPLETED**. S24.3 tổng thể vẫn PARTIAL cho đến khi project upload và protected media workflow được xác nhận trên thiết bị.

## S24.3.5 — Mobile Project and Protected Media Smoke Preparation

- Android picker hiện dùng `copyToCacheDirectory: true`, giúp multipart upload nhận URI cache ổn định thay vì phụ thuộc quyền đọc `content://` của provider sau khi picker đóng.
- MIME upload được chuẩn hóa từ extension đã validation sang đúng tập backend chấp nhận (`video/mp4`, `video/quicktime`, `video/webm`, `audio/mpeg`, `audio/wav`, `audio/mp4`). Trường hợp picker trả `application/octet-stream` hoặc MIME Android khác không còn làm file MP3/M4A/MOV hợp lệ bị backend từ chối 415.
- Protected result download vẫn gửi Bearer header và lưu vào Expo cache. Khi nhận 401, Mobile dùng refresh rotation single-flight rồi retry đúng một lần; lỗi HTTP/network xóa cache dở dang. Nếu rời Result khi download đang chạy, file hoàn tất muộn cũng được cleanup.
- AI workflow source review: STT, Translation và TTS có native confirmation cảnh báo paid service; validation không gọi các endpoint này. FFmpeg Mobile gọi backend `/process` chỉ cho video có narration READY; Audio dùng narration artifact trực tiếp. Backend contract hiện xử lý đồng bộ nên UI chờ response, không giả lập polling/progress server.
- Validation (2026-10-09): Mobile tests 8/8 PASS, lint/typecheck PASS, Expo Doctor 21/21 PASS, Android Hermes export PASS (1.382 modules), Metro Android development bundle HTTP 200/PASS (1.361 modules). Backend không sửa nên không chạy lại backend regression.
- Device checklist hiện **NOT RUN 10/10** trong môi trường thực thi: create project; Android upload; project detail; transcript/translation; voice; generation status; existing result; protected audio; protected video; share/download. Không gọi paid AI và không sửa dữ liệu Atlas.
- S24.3.5 status: **PARTIAL** cho đến khi người dùng xác nhận các bước Android liên quan. S24.3 vẫn **PARTIAL**.

## S24.3.6 — Android Multipart Upload Fix

- Android Expo Go thực tế báo `Unsupported FormDataPart implementation` khi upload MP4 1,1 MB. Nguyên nhân là client append một object React Native `{ uri, name, type }` rồi ép kiểu thành DOM `Blob`; React Native/Expo SDK 57 không chấp nhận object này như một `FormDataPart`, nên request dừng ở client trước Express/Multer.
- Upload Mobile hiện dùng `expo-file-system/legacy.createUploadTask` với `FileSystemUploadType.MULTIPART`: field giữ đúng `file`, MIME được canonicalize, filename được giữ bằng tên file cache, Bearer token nằm trong header và native layer tự tạo multipart boundary. Không dùng `Blob`, `File`, `FormData` hoặc JSON serialization cho binary upload.
- URI từ Document Picker được copy vào project-scoped `file://` cache trước upload. Chỉ thư mục cache tạm do lần upload tạo ra được cleanup; media development và project có sẵn không bị đụng tới.
- Nếu upload đầu tiên thất bại, client xóa đúng project vừa tạo. Nếu cleanup backend cũng thất bại, retry giữ ID đó và cập nhật/tải lại vào cùng project thay vì tạo bản ghi trùng. HTTP 401 refresh token rồi retry đúng một lần; 400/413/5xx, network và cancel giữ thông báo an toàn bằng tiếng Việt.
- Regression tests: **14/14 PASS**, gồm MP4 MIME, `file://`/`content://`, multipart field/header, không có FormData body/manual boundary, failure cleanup và retry không tạo duplicate. Lint PASS; typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS; Metro Android development bundle HTTP 200/PASS.
- Physical Android retest sau bản sửa: **NOT RUN** trong môi trường thực thi. S24.3.6 và S24.3.5 giữ **PARTIAL** cho đến khi người dùng xác nhận upload thật trên Expo Go.

## S24.3.7 — Android DocumentPicker Cache Fix

- Android device xác nhận native multipart của S24.3.6 đi tới bước chuẩn bị file nhưng thất bại tại `ExponentFileSystem.copyAsync`: URI nguồn đã là bản cache `file://.../cache/DocumentPicker/...` do `copyToCacheDirectory: true`, trong khi client lại copy cache này thêm lần nữa.
- File preparation hiện kiểm tra `getInfoAsync` và đọc thử đúng 1 byte trước upload. URI `file://` hợp lệ được đưa thẳng vào `createUploadTask`, không gọi `copyAsync`; chỉ URI không phải `file://` mới được copy sang project-scoped cache sau khi source đã qua kiểm tra đọc.
- Cache DocumentPicker trực tiếp được giữ khi upload lỗi để nút retry còn dùng được và chỉ cleanup sau upload thành công. URI stale/missing/unreadable trả đúng thông báo “Không thể đọc tệp đã chọn. Vui lòng chọn lại tệp.”; người dùng có thể chọn lại file. Project cleanup/chống duplicate của S24.3.6 được giữ nguyên.
- Regression tests: **20/20 PASS**; lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (1.387 modules); Metro Android development bundle HTTP 200/PASS (1.393 modules).
- Physical Android upload sau sửa: **NOT RUN** trong môi trường thực thi. S24.3.7, S24.3.6 và S24.3.5 tiếp tục **PARTIAL** cho đến khi upload MP4 thật thành công trên Expo Go.

## S24.3.8 — Android File Readability and Native Upload Fix

- Android MP4 31 MB vẫn dừng trước upload với thông báo unreadable. S24.3.7 đã thêm `readAsStringAsync(... Base64, position: 0, length: 1)` như một probe bắt buộc; probe này không phải điều kiện của `createUploadTask` và có thể bị Expo Go/FileSystem Android từ chối dù native uploader vẫn đọc được picker URI.
- Probe Base64 đã được loại bỏ hoàn toàn. Preparation chỉ dùng `getInfoAsync` để xác nhận URI tồn tại và không phải directory, sau đó cho native multipart thử upload trực tiếp. `copyAsync` vẫn không chạy cho picker `file://`; fallback copy chỉ dành cho URI không phải file.
- Development-only diagnostics ghi operation, URI scheme/cache classification, picker/detected size, MIME, `getInfoAsync` result, safe native error và HTTP response status. Log không chứa URI đầy đủ, filename, file content, token, header hoặc credential.
- Error UI phân biệt file missing, access denied, FileSystem incompatibility, network, HTTP response và cancellation. Bearer refresh-once, field `file`, MIME/filename, giới hạn 500 MB và project cleanup/chống duplicate được giữ nguyên.
- Regression tests: **21/21 PASS**, bao gồm unsupported read probe không còn chặn URI hợp lệ và native upload factory thực sự được invoke với multipart metadata. Lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (1.388 modules); Metro Android development bundle HTTP 200/PASS (1.393 modules).
- Physical Android upload sau S24.3.8: **NOT RUN** trong môi trường thực thi. Trạng thái tiếp tục **PARTIAL** cho đến khi người dùng xác nhận upload thật và cung cấp diagnostic operation nếu còn lỗi.

## S24.3.9 — Android Native Upload File Access Fix

- Log thiết bị xác nhận source MP4 tồn tại và đúng size nhưng được phân loại `outside-app-cache`; legacy `uploadTaskStartAsync` từ chối mở URI này trước khi có HTTP response. Vì vậy `getInfoAsync` thành công không đồng nghĩa legacy native uploader có quyền stream cùng đường dẫn trong Expo Go.
- Preparation hiện lấy `Paths.cache` của project làm ranh giới truy cập. Mọi source ngoài ranh giới này, kể cả `file://` của host DocumentPicker, được materialize đúng một lần bằng API SDK 57 hiện đại `File.copy()` vào `Paths.cache/mobile-uploads/<projectId>/<filename>`; không dùng lại legacy `copyAsync` đã thất bại trên thiết bị.
- Destination phải tồn tại, không phải directory và có size bằng source trước khi gọi `createUploadTask`. Native uploader vì thế chỉ nhận project-owned cache URI; original filename, MIME, field `file`, Bearer refresh-once và giới hạn 500 MB được giữ nguyên.
- Diagnostics development-only ghi source category, method `modern-file-copy`, materialization start/success/failure, destination existence/size và native upload start/response/failure; không ghi full URI, token hoặc nội dung file.
- Regression tests: **24/24 PASS**, gồm outside-app-cache materialization, failed materialization chỉ thử một lần, size mismatch, multipart invocation, retry và project cleanup. Lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (1.406 modules); Metro Android development bundle HTTP 200/PASS (1.393 modules).
- Physical Android upload sau S24.3.9: **NOT RUN** trong môi trường thực thi. Trạng thái vẫn **PARTIAL** cho đến khi người dùng xác nhận upload thật thành công.

## S24.3.10 — Android DocumentPicker Permission Fix

- Android device xác nhận cả legacy upload và modern `File.copy()` đều không thể đọc `file://` mà `copyToCacheDirectory: true` tạo dưới host Expo Go: metadata tồn tại nhưng copy báo thiếu `READ` permission. Đây là boundary của host cache, không phải yêu cầu Android storage permission của app.
- Picker Android hiện yêu cầu URI provider trực tiếp bằng `copyToCacheDirectory: false` và materialize ngay trong callback chọn file, khi grant của system picker còn fresh. Exact picker URI chỉ được truyền vào một lần `File.copy()`; React state chỉ nhận URI mới dưới `Paths.cache/picker-uploads/...` sau khi destination tồn tại và đúng size.
- Nếu fresh staging bị permission denied/stale, source không được lưu hoặc retry; UI yêu cầu chọn lại. Khi đổi/xóa file hoặc unmount, staged directory được cleanup. Upload failure giữ staged app-cache URI cho retry; project cleanup/chống duplicate không đổi.
- Không thêm `READ_MEDIA_VIDEO`, broad storage permission hay FormData/Blob workaround. Nếu Expo Go vẫn từ chối fresh provider grant trên thiết bị, bước tiếp theo là xác nhận bằng development build vì Expo Go host sở hữu sandbox/permission khác application binary.
- Regression tests: **29/29 PASS**; lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (1.408 modules). Người dùng đã xác nhận physical Android MP4 upload sau S24.3.10: **PASS**.

## S24.3.11.1 — Mobile Project UI Polish

- Danh sách dự án đã được tối ưu cho màn hình Android hẹp: tiêu đề/card xuống dòng có kiểm soát, tên dự án hiển thị tối đa hai dòng và metadata không ép badge trạng thái ra ngoài màn hình.
- Bộ lọc trạng thái giữ dạng cuộn ngang, có padding hai đầu và vùng chạm tối thiểu 44 px. Phân trang tách thông tin trang khỏi hai nút điều hướng cân bằng, tránh wrap xen kẽ.
- Màn Chi tiết dự án căn nút quay lại độc lập với tiêu đề, cho tên/trạng thái xuống dòng, phân bố lựa chọn ngôn ngữ theo chiều rộng và xếp thao tác chính theo chiều dọc.
- Màn Bản ghi dùng nhãn trạng thái tiếng Việt chuẩn (`NOT_STARTED` → `Chưa bắt đầu`), xử lý header/status responsive, phân biệt loại phương tiện chưa xác định và chỉ hiện hành động tạo bản ghi khi có media nguồn.
- Touch target nút cỡ nhỏ được nâng lên tối thiểu 44 px. Navigation, backend contract và luồng Android upload S24.3.10 không thay đổi.
- Validation (2026-10-10): Mobile tests **29/29 PASS**; lint PASS; typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (1.408 modules). Không gọi paid AI API.
- Physical Android UI verification: **NOT RUN**, chờ người dùng xác nhận trên thiết bị. S24.3.11.1 giữ trạng thái **PARTIAL** đến khi có xác nhận runtime UI.

## S24.3.11.2 — Mobile Project Detail Functional Test

- Project Detail cập nhật tên, mô tả và ngôn ngữ nguồn qua đúng `PATCH /api/projects/:id`. Validation Mobile nay khớp backend: tên bắt buộc, tối đa 150 ký tự; mô tả tối đa 1.000 ký tự; ngôn ngữ phải thuộc catalog Mobile đang hỗ trợ.
- Save có khóa đồng bộ độc lập với React render để chặn double-tap tạo hai PATCH đồng thời. UI phân biệt thông báo thành công/lỗi và vô hiệu hóa form/action trong lúc lưu.
- Repository dùng project DTO do PATCH trả về, enrich lại media/translation metadata và thay đúng cache entry theo ID. `useProject` theo dõi trực tiếp repository snapshot nên Detail/header nhận giá trị persisted mới; status từ backend được giữ nguyên và không tạo project mới.
- Danh sách server-side tự reload khi màn Projects được focus lại, vì vậy quay về từ Detail sẽ lấy tên/trạng thái mới từ backend thay vì giữ page snapshot cũ.
- Source review xác nhận Transcript/Translation/Voice/Result giữ nguyên `projectId`, không tự gọi paid AI. UPLOADED project mở Transcript với empty state và chỉ gọi STT sau thao tác xác nhận của người dùng; Translation/Voice/Result hiển thị prerequisite/empty state tương ứng.
- Media nguồn hiện chỉ có API metadata có JWT/ownership; backend chưa cung cấp endpoint stream/download source media nên không thêm playback giả. Narration/result hiện tiếp tục tải protected artifact bằng Bearer vào Expo cache, refresh-once khi 401 và chỉ phát local URI.
- Regression tests bổ sung cho validation/normalize, duplicate-save gate và cache replacement không tạo duplicate/không đổi status. Validation (2026-10-10): Mobile tests **33/33 PASS**; lint PASS; typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (1.409 modules); `git diff --check` PASS.
- Không gọi paid AI và không mutate/xóa project Atlas hiện có. Người dùng đã xác nhận Physical Android Project Detail functional test **PASS 7/7**; S24.3.11.2 **COMPLETED**.

## S24.3.12 — Mobile STT Workflow Validation

- Contract xác nhận: `POST /api/projects/:id/transcription` chạy đồng bộ và trả `{ project: { id, status: "TRANSCRIBED" }, transcript }`; `GET /api/projects/:id/transcript` trả transcript persisted. JWT CUSTOMER và project ownership bắt buộc; generic API client refresh-once khi HTTP 401.
- Backend chuyển nguyên tử `UPLOADED | FAILED | TRANSCRIBED → TRANSCRIBING`; request trùng khi đang chạy trả 409 `TRANSCRIPTION_ALREADY_RUNNING`. Thành công lưu transcript/segments, job COMPLETED và project TRANSCRIBED; provider failure giữ lỗi client an toàn, job/project FAILED và cho phép retry. Existing transcript chỉ được thay trong transaction thành công.
- Backend transcript segment DTO bổ sung `id` thật để khớp key/alignment Mobile; `index`, `startTime`, `endTime`, `text` giữ nguyên. Backend regression dùng mock STT xác nhận lifecycle, concurrency, retry, ownership, safe errors và persistence.
- Mobile không POST khi mở màn hình. Confirmation là bắt buộc; hủy giữ `NOT_STARTED`/transcript hiện có thay vì chuyển FAILED. Synchronous ref gate ngăn double-tap trước khi React render; backend atomic status tiếp tục là lớp chống duplicate thứ hai.
- Trong request đồng bộ, UI hiển thị `TRANSCRIBING`. Nếu app mở lại khi project đang xử lý, màn hình poll project metadata mỗi 2,5 giây bằng GET, không hiện action tạo thêm, và tự tải transcript khi status thành `TRANSCRIBED`. Không có polling endpoint/job giả.
- Request STT có timeout client 5 phút, refresh-once qua API client, thông báo tiếng Việt cho timeout/401/network/already-running/missing media và retry theo backend contract. Project cache được refresh sau mọi POST thực sự, kể cả failure; confirmation cancellation không refresh hoặc gọi API.
- Mapper transcript chấp nhận segments thiếu an toàn, tạo fallback key chỉ khi server cũ thiếu ID và chỉ hiển thị timestamp khi cả start/end hợp lệ. UI dùng nhãn trạng thái tiếng Việt.
- Validation (2026-10-10): backend transcription tests **10/10 PASS** với provider mock và test-owned Atlas data cleanup; backend lint/typecheck/build PASS. Mobile tests **38/38 PASS**; lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (1.410 modules); `git diff --check` PASS.
- Real Whisper/OpenAI call: **NOT RUN**. Physical Android STT smoke: **NOT RUN**. S24.3.12 status **PARTIAL**; source/mock validation không chứng minh real paid-provider/device end-to-end.

## S24.3.12.2 — Real Mobile Whisper STT Validation

- **POSTPONED** theo quyết định hiện tại. Chưa thực hiện real paid OpenAI/Whisper call và chưa xác nhận STT end-to-end trên thiết bị Android.
- Việc hoãn không thay đổi kết quả source/mock validation của S24.3.12 và không được diễn giải là runtime PASS.

## S25.1 — Customer Web UI Audit and Design Plan

- **COMPLETED (AUDIT/PLAN ONLY)** ngày 2026-10-10.
- Đã đối chiếu toàn bộ route, page, layout, component dùng chung và CSS trong `frontend-web` với trạng thái tích hợp/API hiện tại.
- Đã lập inventory route thực tế, xác định màn hình thiếu/chưa hoàn chỉnh, vấn đề localization, token, form, responsive, navigation, accessibility và loading/empty/error state.
- Đã bổ sung vào `docs/UI.md` design tokens đề xuất, checklist 12 nhóm màn hình và thứ tự triển khai. Kế hoạch giữ `/projects/new` là luồng Create + Upload hiện có, không phát sinh route hoặc business flow giả.
- Không chỉnh sửa source Customer Web, Backend, Mobile hoặc Admin; không thay API/database; không gọi paid AI API.
- Bước đề xuất tiếp theo: triển khai foundation/tokens/localization và shared components trước, sau đó polish shell và từng workflow theo thứ tự trong `docs/UI.md`.
- Bổ sung cross-platform audit ngày 2026-10-10: đã đối chiếu route/screen, navigation, form, validation, confirmation, async states, project lifecycle và protected-result behavior giữa `frontend-web` và `frontend-mobile`.
- `docs/UI.md` nay có feature parity matrix, shared Customer journey, canonical Vietnamese labels/statuses, unified Web/Mobile token contract, platform-specific rules và backlog P0/P1/P2.
- Khoảng trống nổi bật: Mobile tách Account khỏi Settings placeholder trong khi Web gộp; Mobile WorkflowSteps chưa render nhãn Kết quả; Web còn copy/status tiếng Anh và Project Detail feedback yếu hơn Mobile; brand primary token chưa đồng nhất.
- Trạng thái S25.1 vẫn **COMPLETED (AUDIT/PLAN ONLY)**. Chưa sửa UI/source; Android upload và project editing đã xác nhận không thay đổi. S24.3.12.2 tiếp tục **POSTPONED**.

## S25.2 — P0 Cross-platform Foundation and Regression Guard

- **COMPLETED (SOURCE VALIDATION)** ngày 2026-10-10; browser runtime và physical Android runtime **NOT RUN**.
- Web/Mobile dùng dictionary nhãn tiếng Việt đồng nhất cho toàn bộ 10 `ProjectStatus` cùng Transcript, Translation, Voice/TTS và Processing states; backend enum/API contract không đổi.
- Web project badge/filter/detail và generic Badge không còn hiển thị/gom sai enum kỹ thuật. Processing stage titles được Việt hóa.
- Mobile WorkflowSteps đã có đủ 6 bước, gồm “Kết quả”, cuộn ngang trên màn hình hẹp và phân biệt completed/current/locked bằng visual + accessibility state.
- Không thay implementation Android DocumentPicker staging/native multipart hoặc Project Detail editing. Bổ sung guard refresh-once cho native upload mà không đổi flow thành công.
- Tests: Web **2/2 PASS**; Mobile **42/42 PASS**. Mobile suite tiếp tục bao phủ staging, field `file`, Bearer, retry/cleanup, list-cache sync và duplicate-save, đồng thời thêm refresh-once/status/workflow parity.
- Web lint/typecheck/build PASS. Mobile lint/typecheck PASS. Expo Doctor **21/21 PASS**. Android Hermes export PASS (1.412 modules). `git diff --check` PASS.
- Không sửa Backend/Admin/database, không gọi paid AI và không thay dữ liệu dự án. S24.3.12.2 vẫn **POSTPONED**.
- Còn lại cho P1: Account/Settings IA, navigation/copy tiếng Việt, Web form/confirmation feedback; cho P2: color/radius/typography tokens và shared component visual behavior.

## S25.3 — P1 Web/Mobile Navigation and Interaction Parity

- **COMPLETED (SOURCE VALIDATION)** ngày 2026-10-10; browser runtime và physical Android runtime **NOT RUN**.
- Web/Mobile dùng cùng nhãn điều hướng: **Bảng điều khiển**, **Dự án của tôi**, **Tạo thuyết minh**, **Lịch sử**, **Tài khoản**. Web giữ sidebar/topbar và route hiện có; Mobile giữ bottom tabs, ẩn tab Settings trùng lặp nhưng route cũ vẫn hiển thị màn Tài khoản để không làm hỏng deep link.
- Account Web/Mobile hiển thị họ tên, email, vai trò Khách hàng từ phiên thật; có loading, error, retry và logout confirmation. Không thêm profile editing, password/avatar hoặc setting giả. Mobile tiếp tục để `Stack.Protected` tự chuyển về Login sau logout.
- Chuỗi người dùng còn sót trong New Project, media validation, Transcript, Translation, Voice/TTS, Result, processing, 404 và accessibility được Việt hóa. Thuật ngữ hiển thị dùng “máy chủ” thay cho “backend”; API identifiers và enum không đổi.
- Confirmation trả phí cho STT, Translation và TTS dùng cùng nội dung cảnh báo trên Web/Mobile; Web dùng confirmation guard, Mobile giữ native Alert. Hủy confirmation không gọi API. Login/Register dùng validation parity và synchronous submit lock để chặn double-submit trước khi state kịp render.
- Regression tests: Web **7/7 PASS**; Mobile **47/47 PASS**, bao gồm navigation/account destination, confirmation cancellation, validation parity, auth duplicate-submit và toàn bộ boundary upload/project editing cũ.
- Web lint/typecheck/build PASS. Mobile lint/typecheck PASS. Expo Doctor **21/21 PASS**. Android Hermes export PASS (**1.414 modules**). Không gọi paid AI API, không sửa Backend/Admin/database và không thay implementation Android upload.
- Browser verification: **NOT RUN**. Physical Android verification: **NOT RUN**. S24.3.12.2 real Whisper tiếp tục **POSTPONED**.
- Còn lại cho P2: đồng bộ visual tokens/component behavior và chạy responsive/a11y/browser/device visual regression thực tế.

## S25.4 — P2 Unified Web & Mobile Visual Design System

- **COMPLETED (SOURCE VALIDATION)** ngày 2026-10-10; browser visual smoke và physical Android visual smoke **NOT RUN**.
- Web/Mobile dùng cùng visual identity: primary `#5850EC`, accent `#794CFF`, background `#F8FAFC`, surface `#FFFFFF`, text chính `#0F172A`; semantic success/warning/error/info giữ ý nghĩa thống nhất. Spacing theo bội số 4px, radius chuẩn 6/10/12/20/full và shadow nhẹ.
- Web shared styles được polish cho Button, Input, select, textarea, Card, Badge, Progress, Spinner, Empty/Error State và PageHeader: control tối thiểu 44–48px, focus ring indigo, hover/pressed/disabled rõ ràng, action header wrap ở màn hình hẹp.
- Mobile tokens chuyển từ blue cũ sang indigo/violet chuẩn. Button giữ touch target tối thiểu 44px, pressed/disabled state thống nhất; Input có focused/error/disabled border rõ ràng; Card/Badge/Progress/feedback kế thừa palette/radius/elevation mới. Không import CSS Web vào React Native.
- Không có shared custom Dialog hiện hữu trong Customer Web/Mobile; confirmation architecture S25.3 được giữ nguyên (browser confirm guard và native Alert), không thêm UI library hoặc thay đổi business flow.
- Bổ sung token regression test hai chiều. Web tests **9/9 PASS**, lint/typecheck/build PASS. Mobile tests **49/49 PASS**, lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (**1.414 modules**); `git diff --check` PASS.
- Không sửa Backend/Admin/database/API/routes; không thay Android picker/native upload, JWT refresh, Project Detail, workflow permission hay protected media. Không gọi paid AI API; S24.3.12.2 tiếp tục **POSTPONED**.
- Còn lại: screen-level spacing/density polish, browser responsive/keyboard/contrast visual smoke và physical Android visual smoke trên thiết bị thật.

## S25.5 — Dashboard & Project List Web/Mobile UI Polish

- **COMPLETED (SOURCE VALIDATION)** ngày 2026-10-10. Browser visual smoke và physical Android visual smoke **NOT RUN**.
- Web Dashboard giữ hero đã duyệt, chuẩn hóa CTA “Tạo thuyết minh”, quick actions, zero/loading/error/retry và recent projects. Thống kê tiếp tục được tính duy nhất từ project repository/API hiện có; không thêm metric hoặc fixture giả.
- Mobile Dashboard giữ hierarchy tương đương Web: welcome, bốn thống kê thật, hai quick actions được hỗ trợ (Tạo thuyết minh/Dự án của tôi), recent projects và loading/error/retry/empty state mà không che mất toàn bộ header.
- Web Project List đổi title/CTA theo canonical terminology, giữ search/status/server pagination, thêm live pagination status và responsive card/pagination layout cho 600/420/360px, bao phủ mục tiêu 375/320px ở source CSS.
- Mobile Project List luôn giữ page heading, search và filter khi loading/error; giữ page reset khi search/filter, focus reload/cache synchronization, server pagination và bổ sung accessibility label cho pagination/project actions.
- Regression tests bổ sung khóa real repository usage, supported quick actions, filter/page reset và focus reload. Web **11/11 PASS**; Mobile **51/51 PASS**. Web lint/typecheck/build PASS; Mobile lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (**1.414 modules**); `git diff --check` PASS.
- Browser visual smoke: **NOT RUN** vì browser automation báo Chrome không khả dụng. Physical Android visual smoke: **NOT RUN** vì `adb` không có trong môi trường/PATH. Không claim runtime PASS.
- Không sửa Backend/Admin/database/API, Android upload, JWT refresh, Project Detail hay AI workflows; không gọi paid AI API. S24.3.12.2 tiếp tục **POSTPONED**.

## S25.6 — Create Project, Upload Media & Project Detail UI Polish

- **COMPLETED (SOURCE VALIDATION)** ngày 2026-10-11; browser visual smoke và physical Android visual smoke **NOT RUN**.
- Create Project Web/Mobile nay dùng cùng các trường backend hỗ trợ: tên bắt buộc, mô tả tùy chọn và ngôn ngữ nguồn bắt buộc; có inline validation, disabled/loading state, giới hạn ký tự và bố cục phù hợp màn hình hẹp/keyboard.
- Upload Web giữ browser multipart hiện có và dùng trạng thái tải không xác định thay vì phần trăm giả; giữ chọn lại, hủy, retry, lỗi và success feedback. Mobile giữ nguyên DocumentPicker staging, native multipart, Bearer refresh-once, progress thật, retry/cleanup và chống duplicate project đã physical PASS.
- Project Detail Web/Mobile có status badge, mô tả, metadata phương tiện, WorkflowSteps, edit validation, save success/error và action tiếp tục theo trạng thái. Web bổ sung synchronous save lock; Mobile tiếp tục dùng `runProjectSaveOnce`. Không thêm source-media playback vì backend chưa có endpoint tương ứng.
- Regression tests: Web **14/14 PASS**, Mobile **54/54 PASS**. Web lint/typecheck/build PASS; Mobile lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (**1.414 modules**); `git diff --check` PASS.
- Không sửa Backend/Admin/database/API/routes, không gọi paid AI và không thay Android upload transport. S24.3.12.2 vẫn **POSTPONED**.

## S25.7 — AI Workflow Screens Web/Mobile UI Polish

- **COMPLETED (SOURCE VALIDATION)** ngày 2026-10-11; browser visual smoke và physical Android visual smoke **NOT RUN**.
- Transcript Web/Mobile giữ read-only theo API hiện tại, trình bày metadata nguồn, timestamp/segment, loading/processing/error/retry và confirmation STT có sẵn. Copy Web không còn quảng bá chỉnh sửa hoặc “bản ghi mẫu”.
- Translation và Voice/TTS dùng nhãn trạng thái tiếng Việt từ dictionary chung thay vì enum kỹ thuật; giữ target/voice catalog thật, empty/filter/error states, confirmation trả phí và duplicate-submit guard trong service. Không thêm editor, sample hoặc preview URL giả.
- Generate/Processing hiển thị trạng thái tổng và từng stage bằng tiếng Việt; chỉ render progress do snapshot thực sự cung cấp, giữ nguyên polling/session/timeout/state transition hiện có.
- Result có badge hoàn thành, metadata dễ đọc, nhãn accessibility cho media Web và feedback lỗi native share trên Mobile. Web vẫn phát/tải Blob URL nội bộ; Mobile vẫn phát/chia sẻ local cache tải bằng Bearer, không lộ protected URL/token.
- Regression tests: Web **18/18 PASS**, Mobile **58/58 PASS**. Web lint/typecheck/build PASS; Mobile lint/typecheck PASS; Expo Doctor **21/21 PASS**; Android Hermes export PASS (**1.414 modules**); `git diff --check` PASS.
- Không gọi paid AI, không chạy STT/Translation/TTS job, không sửa Backend/Admin/database/API. S24.3.12.2 tiếp tục **POSTPONED**.

## S25.7.1 — Minimal Customer Web Login UI Polish

- **COMPLETED (SOURCE VALIDATION)** ngày 2026-10-11; browser visual verification **NOT RUN** vì browser runtime không khả dụng.
- Giữ nguyên bố cục hai cột, nền navy, brand/slogan/waveform và form đăng nhập. Login-only CSS giảm heading, cân spacing/form width, xử lý desktop thấp và mobile 320–375px bằng `100svh` mà không tác động Register.
- Login giữ API/JWT/refresh/navigation/validation/loading và synchronous duplicate-submit lock. Error mapping an toàn phân biệt 401, validation, network/timeout và 5xx mà không hiển thị chi tiết nội bộ.
- Web tests **21/21 PASS**; lint/typecheck/build PASS; `git diff --check` PASS. Không sửa Mobile/Admin/Backend/database/API.

## S25.7.2 — Minimal Customer Web Register UI Polish

- **COMPLETED (SOURCE VALIDATION)** ngày 2026-10-11; browser visual verification **NOT RUN**.
- Register dùng wrapper/CSS riêng `.register-page`, đồng bộ typography, brand spacing và form width 27rem với Login đã duyệt nhưng không thay Login. Giữ đủ họ tên, email, mật khẩu, xác nhận mật khẩu, hai visibility control, submit và link quay lại Login.
- Giảm form gap, heading/footer margin và padding dọc; dùng `100svh` cho viewport thường, breakpoint chiều cao thấp cho desktop và cuộn tự nhiên khi nội dung thực sự vượt viewport. Không dùng overflow để che nội dung.
- Web tests **24/24 PASS**; lint/typecheck/build PASS; `git diff --check` PASS. API/validation/JWT/double-submit/navigation giữ nguyên; không sửa Mobile/Admin/Backend/database.

## S25.7.3 — Customer Web Dashboard Redesign

- **COMPLETED (SOURCE VALIDATION)** ngày 2026-10-11; browser visual verification **NOT RUN**.
- Dashboard Customer Web đã được polish theo phong cách tối giản: sidebar sạch, hero cân đối, bốn quick actions, recent projects từ API, biểu đồ 7 ngày và bốn metric trạng thái.
- Chart và metric phân loại chỉ dùng dataset đầy đủ theo pagination metadata; nếu thiếu trang, UI báo chưa đủ dữ liệu/hiển thị `—`, không suy diễn hoặc tạo số liệu giả. Tổng dự án dùng `pagination.total` thật khi có.
- Empty/loading/error/activity states dùng dữ liệu thật; activity được mô tả chính xác là cập nhật trạng thái dự án. Không sửa Login/Register, Mobile, Admin, Backend, database hay API contract.
- Web tests **28/28 PASS**; lint/typecheck/build PASS; browser visual verification **NOT RUN**.

## S25.7.3.2 — Customer Web Sidebar Navy Theme

- Sidebar Customer Web đổi sang navy `#111C32` đồng bộ Login/Register; brand, hover, active, focus và khu vực Tài khoản được tinh chỉnh cho nền tối.
- Route, active-state logic, responsive drawer và authentication không đổi. Browser visual verification **NOT RUN**.
- Web tests **29/29 PASS**; lint/typecheck/build PASS; `git diff --check` PASS.
## S25.7.5 — Customer Web Create Narration UI

- PARTIAL — source validation ngày 2026-10-11: Web tests 36/36 PASS; lint, typecheck, production build PASS. Browser visual/interaction smoke NOT RUN; ảnh minh họa cuối cùng không được đính kèm trong phiên này.
- Route `/projects/new` có heading/mô tả lớn trong Header và liên kết quay lại danh sách cạnh Profile. Nội dung gồm ba card: chi tiết dự án, phương tiện, tải lên.
- Mô tả dùng textarea giữ giới hạn hiện có 1000 ký tự; upload hiển thị guidance, trạng thái chưa chọn và metadata/preview thật. Giữ upload handler, multipart, validation, retry/cancellation và success flow; không gọi AI trả phí.
- Chờ người dùng duyệt giao diện và kiểm tra responsive/interaction trên trình duyệt. Không commit.

## S25.7.4.6 — Project List phương án A

- PARTIAL: hoàn thành source UI/filter/sort/table; browser visual/interaction verification NOT RUN.
- API data thật đọc đủ pages; lọc AND tên/ngày tạo/trạng thái, sort toàn tập và phân trang 10 dòng. Giữ routes và không đổi backend/API.
- Web tests 41/41 PASS, lint/typecheck/build PASS. Không paid AI, không sửa Mobile/Admin, không commit. Chờ duyệt; dataset lớn và thay đổi đồng thời là giới hạn của full-fetch/offset API.

## S25.7.6 — Customer Web History Professional Table

S25.7.6.1: triển khai bộ lọc tên/ngày tạo/trạng thái AND, submit/Enter, reset về trang 1; loader riêng History đọc đầy đủ API pages và client pagination 10 kết quả. Source lint/typecheck/build PASS; browser verification NOT RUN. Không đổi Backend/Header/Profile/API. Việc tải metadata toàn bộ history có thể tốn thời gian với dataset lớn; pagination theo offset không bảo đảm snapshot nếu dữ liệu thay đổi đồng thời.

- PARTIAL ngày 2026-10-11: UI/source hoàn tất; browser visual/interaction smoke NOT RUN.
- Header riêng Lịch sử, semantic table sáu cột từ dữ liệu thật, ngày giờ vi-VN, dictionary trạng thái, Project Detail link, empty/loading/error và responsive card/scroll. Bỏ các CTA tạo mới.
- Không đổi service/API/search/filter nghiệp vụ. Giới hạn sẵn có: repository đọc tối đa 100 dự án, History chưa có pagination riêng; không suy diễn tổng bản ghi.
- Web tests 36/36 PASS; lint/typecheck/build PASS. Không gọi paid AI, không commit; chờ người dùng duyệt.
