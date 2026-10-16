# UI Specification

## UI05.5 — Compact Date Filter Popover (2026-10-17)

- Bộ lọc thời gian của biểu đồ Dashboard được thu gọn thành một nút có icon lịch, nhãn chế độ đã áp dụng (`Theo ngày/tháng/năm`) và chevron. Tiêu đề cùng khoảng thời gian đã chọn luôn hiển thị; date/month/year inputs chỉ mount khi popover mở nên card không còn khoảng trống điều khiển dư.
- Popover rộng tối đa `310px`, radius `14px`, shadow nhẹ và dùng typography Be Vietnam Pro của Dashboard. Bên trong giữ đủ ba chế độ, control thời gian native, `Đặt lại` và `Áp dụng`; container hẹp dùng chiều rộng theo content area để không gây tràn toàn trang.
- Giá trị trong popover là **bản nháp**. Đổi chế độ/ngày/tháng/năm hoặc `Đặt lại` chưa tác động biểu đồ; chỉ `Áp dụng` mới cập nhật state thống kê. `Đặt lại` đưa bản nháp về chế độ Ngày và ngày hiện tại, đúng mặc định UI05.4.
- Accessibility: trigger native button có `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`; mode dùng `aria-pressed`; focus chuyển vào lựa chọn hiện hành khi mở. Click ngoài đóng không áp dụng; Escape đóng và trả focus về trigger; Apply cũng đóng và trả focus. Focus-visible và touch target tối thiểu được giữ rõ ràng.
- Logic `createdAt`, timezone thiết bị, bucket Ngày/Tháng/Năm, fail-closed dataset, API và Donut Chart không đổi. Regression kiểm tra cấu trúc popover, draft/apply/reset, click ngoài, Escape/focus và responsive CSS.
- Source validation **PASS**: Web tests `138/138`, lint, typecheck, production build và `git diff --check`. Build còn warning dynamic/static import `projectRepository.ts` đã có sẵn, không liên quan UI05.5. Browser visual **NOT RUN** vì Computer Use không khởi tạo được kernel assets (`path not found`); chưa coi responsive/keyboard runtime là PASS.

## UI05.4 — Dashboard Date / Month / Year Filter (2026-10-17)

- Card biểu đồ đổi thành `Thống kê dự án theo thời gian`, có segmented control `Ngày | Tháng | Năm`, control thời gian native và nút `Đặt lại`. Chế độ Ngày mặc định hôm nay và hiển thị 7 ngày kết thúc tại ngày chọn; Tháng hiển thị đủ 28/29/30/31 ngày; Năm hiển thị 12 tháng.
- Thống kê chỉ dùng `project.createdAt`. Ngày/tháng không có dự án vẫn có bucket `0`; trục Y tiếp tục bắt đầu từ 0 với scale tuyến tính. Tooltip và mô tả screen reader dùng ngày/tháng/năm đầy đủ cùng số dự án.
- Nhóm lịch theo **múi giờ cục bộ của thiết bị** bằng `getFullYear/getMonth/getDate`; phép tạo ngày dùng constructor lịch cục bộ thay vì trừ milliseconds, tránh lệch ở ranh giới tháng/năm và môi trường có DST. Giao diện công khai chú thích múi giờ này.
- Data integrity giữ fail-closed: Dashboard vẫn chỉ gọi `/projects?page=1&limit=100`; nếu `pagination.total > projects.length`, biểu đồ không tính số liệu từ tập thiếu mà hiển thị `Chưa đủ dữ liệu để lập biểu đồ`. Không tải vô hạn, không thêm request và không sửa Backend/API.
- Desktop đặt tiêu đề và bộ lọc cùng hàng khi đủ chỗ; container hẹp cho phép xuống hàng. Biểu đồ tháng có vùng cuộn ngang focusable riêng (`min-width: 1120px`), không làm tràn toàn trang; control xếp dọc và rộng toàn phần ở container `<=420px`.
- Áp dụng UI UX Pro Max: control native có label, segmented button có `aria-pressed`, focus ring rõ, biểu đồ có dữ liệu văn bản tương đương và vùng cuộn tháng có accessible name. Donut Chart và các khu vực Dashboard khác không đổi.
- Source validation **PASS**: Web tests `135/135`, lint, typecheck, production build và `git diff --check`. Browser visual **NOT RUN** do Computer Use không khởi tạo được kernel assets (`path not found`); chưa coi responsive/scroll/tooltip trực quan là PASS.

## UI05.3 — Remove Duplicate KPI Cards (2026-10-17)

- Đã xóa hoàn toàn hàng bốn KPI độc lập (`Tổng dự án`, `Hoàn thành`, `Đang xử lý`, `Thất bại`) khỏi Dashboard để tránh lặp lại thông tin đã có trong biểu đồ Donut. Component, markup, token và các selector CSS chỉ phục vụ hàng KPI cũng được loại bỏ.
- Analytics hiện nằm ngay sau bốn Quick Actions theo khoảng cách section chuẩn của Dashboard, không còn vùng trống trung gian. Biểu đồ cột 7 ngày và Donut Chart giữ nguyên bố cục 60/40, dữ liệu thật, trạng thái loading/error/empty và responsive theo container.
- Donut tiếp tục hiển thị tổng dự án ở tâm, các nhóm `Hoàn thành`, `Đang xử lý`, `Thất bại`, `Khác`, cùng số lượng, tỷ lệ phần trăm, progress bar và nội dung hỗ trợ screen reader. Không thay đổi logic phân loại hoặc API.
- Regression xác nhận không còn `DashboardMetric`, `dashboard-kpis`, `dashboard-metric` hay token KPI; đồng thời bảo vệ thứ tự Quick Actions → Analytics và cơ chế fail-closed khi dữ liệu phân trang chưa đầy đủ.
- Source validation **PASS**: Web tests `132/132`, lint, typecheck, production build và `git diff --check`. Browser visual **NOT RUN** do Computer Use không khởi tạo được kernel assets (`path not found`); chưa coi responsive visual là PASS.

## UI05.2 — Advanced Dashboard Analytics (2026-10-17)

- Vùng thống kê Dashboard dùng dữ liệu dự án thật hiện có và tách thành hai tầng: bốn KPI độc lập phía trên (`Tổng dự án`, `Hoàn thành`, `Đang xử lý`, `Thất bại`), sau đó Analytics 60/40 gồm biểu đồ cột 7 ngày và donut trạng thái. Card dùng Be Vietnam Pro, radius/shadow/tokens Navy–Purple hiện có; Hero, Quick Actions, Sidebar, Header, bảng dự án và hoạt động không đổi.
- KPI có số lớn, icon SVG từ thư viện hiện có, màu nền nhấn theo semantic token và hover transform/elevation nhẹ. `Tổng dự án` tiếp tục lấy `pagination.total` khi có; ba số phân loại chỉ hiển thị khi dataset đầy đủ, nếu không hiển thị `—` thay vì suy diễn từ một trang API.
- Biểu đồ cột có trục Y tuyến tính bắt đầu từ 0, tick nguyên, gridline nhẹ và chiều cao cột đúng `value / scale.maximum` — bỏ mức tối thiểu 8% cũ. Mỗi ngày có tooltip ngày đầy đủ + số dự án khi hover hoặc keyboard focus, figcaption cho screen reader và trạng thái rỗng/thiếu dữ liệu rõ ràng.
- Donut SVG responsive dùng tối đa bốn nhóm: Hoàn thành, Đang xử lý, Thất bại và Khác. `Khác` là phần còn lại thực tế (ví dụ `DRAFT`), không gán vào processing. Tổng nằm giữa; hover/focus segment hoặc legend cập nhật thông tin nhóm. Legend luôn có tên, số lượng, phần trăm, progress bar và mô tả văn bản hỗ trợ screen reader; zero/incomplete dataset fail-closed.
- Responsive theo container Dashboard: Analytics 60/40 khi rộng, xếp dọc khi `<=980px`; donut/legend xếp dọc khi `<=620px`; KPI 4 → 2 → 1 cột. Tooltip biên đầu/cuối được neo trong vùng biểu đồ; reduced-motion tắt transition/transform liên quan.
- Source/regression **PASS**: Web tests `132/132`, lint, typecheck, production build và `git diff --check`. Browser visual 320/375/768/1024/1440 **NOT RUN** vì Computer Use không khởi tạo được kernel assets (`path not found`); chưa coi tỷ lệ trực quan là PASS.

## UI04 — Dashboard Hero & Quick Actions (2026-10-15)

- Giữ nguyên Be Vietnam Pro, Navy/Purple, gradient Hero, thứ tự Dashboard và toàn bộ route/logic hiện có. Hero dùng bố cục hai vùng rõ ràng khi đủ rộng: copy/CTA bên trái, minh họa CSS hiện có bên phải; chiều cao tối thiểu giảm từ `238px` xuống `208px`, artwork thu về `168px` và CTA giữ target tối thiểu `44px`. Không tạo hoặc thêm asset mới.
- Quick Actions giữ đúng bốn semantic link: `Tạo thuyết minh` tới `/projects/new`; `Bản ghi`, `Bản dịch`, `Giọng đọc` tiếp tục tới luồng chọn dự án `/projects`. Card đồng chiều cao tối thiểu `112px`, icon `44px`, padding/typography thống nhất; nội dung dài được wrap thay vì cắt.
- Trạng thái tương tác có hover, focus-visible 2px/offset 3px, active và reduced-motion. Icon trang trí tiếp tục `aria-hidden`; navigation giữ nhãn truy cập `Lối tắt sáng tạo`.
- Breakpoint dựa trên chiều rộng thật của container Dashboard, không chỉ viewport: trên `980px` hiển thị 4 cột, từ `560–980px` hiển thị 2 cột, dưới/equal `560px` hiển thị 1 cột. Khi container không quá `760px`, artwork trang trí được ẩn để ưu tiên copy/CTA và tránh tràn ngang.
- Source/regression **PASS**: Web tests `126/126`, lint, typecheck, production build và `git diff --check`. Browser visual smoke 320/375/768/1024/1440 **NOT RUN** vì không có browser/app kết nối; chưa coi responsive visual là PASS.

## UI03 — Sidebar & Header refinement (2026-10-15)

- Giữ nhận diện Navy `#111C32`, Primary `#5850EC`, routes và nội dung Header đã duyệt. Sidebar desktop rộng `252px`; brand/logo được căn trên hàng 48px, menu item cao 48px, icon 20px, gap 12px; active/hover/focus vẫn dùng Navy/Purple và indicator cạnh trái.
- Header cơ sở cao 72px và chia ba vùng rõ ràng: context/tiêu đề, tìm kiếm tối đa 440px, tài khoản. Các route `/projects`, `/projects/new`, `/history`, `/settings` tiếp tục giữ tiêu đề lớn/subtitle và quy tắc ẩn search đã duyệt; Header có subtitle dùng min-height 80px để không cắt nội dung. Search vẫn submit tới `/projects?q=...`; Profile, cập nhật tên thật, menu tài khoản và logout không đổi nghiệp vụ.
- Responsive: tại `<=1023px` Sidebar chuyển thành drawer có backdrop; tại `<=1199px` Profile thu gọn về avatar để bảo toàn bề rộng; tại `<=640px` search xuống hàng riêng. Shell dùng `min-width: 0`, wrap/ellipsis có title phù hợp và `overflow-x: clip` ở container để tránh tràn toàn trang; cần browser thật xác nhận tại 320/375/768/1024/1440.
- Drawer accessibility: drawer đóng có `inert` + `aria-hidden`; khi mở, nội dung nền có `inert`, khóa cuộn body, focus vào nút Đóng, giữ Tab/Shift+Tab trong drawer, Escape/backdrop/nút đóng/điều hướng đều đóng và trả focus về nút menu. Có role dialog/aria-modal trong drawer mode, target 44–48px, focus ring rõ và reduced-motion.
- Source/tests **122/122 PASS** (5 regression UI03 mới), lint/typecheck/build và `git diff --check` ghi tại PROGRESS. Browser visual/keyboard smoke **NOT RUN** vì inventory không có browser hoặc app kết nối; chưa coi responsive visual là PASS.

## UI02 — Dashboard typography & design foundation (2026-10-14)

- Phương án C: giữ Navy `#111C32`, Primary `#5850EC`, Accent `#794CFF`, nền `#F8FAFC`, cấu trúc Sidebar/Header/hero/quick actions/chart/KPI/projects/activity và tất cả dữ liệu/routes. Không đổi `DashboardPlaceholder.tsx`, `dashboardMetrics.mjs`, global tokens hoặc shared components.
- Dashboard dùng Be Vietnam Pro self-hosted 400/600/700 (Google Fonts v12, TTF nguyên bản, đủ glyph tiếng Việt đã test). Assets và SIL OFL1.1 tại `frontend-web/src/assets/fonts/be-vietnam-pro/`; `dashboard-fonts.css` đăng ký `font-display: swap`, `.dashboard` mới chọn font; fallback Segoe UI/Arial/sans-serif. Không Google font request lúc runtime, không dependency/package mới; không preload toàn site để tránh tải font cho trang không dùng. Ba assets tổng369520 bytes (~361KiB), chưa nén WOFF2 hoặc đo CLS/runtime cache.
- Tokens cục bộ `--dashboard-*`: title26–28px, section20px, body15px (button/feedback14px), table13px/chart12px, KPI30px; tên quick action giữ17px. Line-height1.3 heading/1.5–1.6 nội dung; số dùng tabular-nums.
- Spacing8/12/16/24/32px: section gap24px desktop/16px nhỏ, card padding24px/16px nhỏ, quick actions padding16px/12px khi thiếu diện tích; cards16px, KPI14px radius, border/shadow tokens hiện có. Giữ ratios/breakpoints cấu trúc; không đổi phép tính chiều cao bar8% (để UI05 xử lý riêng).
- Tên dự án/nội dung dài wrap thay vì bị ellipsis/cắt; quick-action text flex có min-width0, KPI/badge wrap, section-heading cho xuống hàng, chart labels12px không bị rule9px cũ ghi đè. CSS `.section-heading` trong Dashboard được scope lại để không ảnh hưởng trang khác.
- Áp dụng UI UX Pro Max: font-display/fallback, typography hierarchy, scope, long-token wrapping và layout co giãn. Source/tests117/117 + lint/typecheck/build PASS; Browser visual375/768/1024/1440 **NOT RUN** vì inventory không có browser kết nối. Chưa xác nhận visual/CLS/spacing bằng screenshot; chờ duyệt trước UI03.

## S25.7.9.3.3 — Bản dịch theo cụm và duyệt thủ công

- Consumer Web bật riêng bằng `VITE_GROUP_TRANSLATION_ENABLED=true`, default OFF; Backend cũng cần flag tương ứng. Không đổi Transcript/player/grouping display cũ, Sidebar/Header hay routes. Nhánh legacy giữ nguyên.
- Chọn Language thật → GET plan, không tự POST. Candidate groups không được coi là các câu ngữ nghĩa chắc chắn. Có nút gộp liền kề/khôi phục plan và checkbox chấp nhận ranh giới; người dùng xác nhận chi phí trước Xem trước bản dịch. Không sửa nguồn hoặc ép21 từ thành21 bản dịch.
- Draft hiển thị Bản gốc | Bản dịch với `mm:ss.SSS`; ranh giới đóng băng. Có thời hạn nháp, cảnh báo RAM/restart và checklist nghĩa/tên riêng/số/địa chỉ/thêm-bỏ nội dung. Chỉ Duyệt và lưu khi người dùng đánh dấu đã kiểm tra; có Từ chối (không persist). Nháp không cho tiếp tục Giọng đọc.
- Draft ID nằm query `draft`, chỉ là locator, không thay JWT/ownership; reload đọc GET draft, không gọi AI. Mất/hết hạn có lỗi rõ ràng. Retry dữ liệu chỉ GET; duplicate-submit có ref lock. API lỗi không báo đã lưu; chỉ response approve thành công mới hiện saved/Voice link.
- Áp dụng UI UX Pro Max: label rõ, semantic checkbox/button, aria-live/error, loading/disabled, dùng tokens/components hiện có; hai cột desktop/1 cột dưới768, nội dung dài wrap. Voice/Generate chỉ bổ sung union consumer/count theo cụm, không đổi paid-confirmation/workflow.
- Tests Web112/112, lint/typecheck/build PASS. UI state tests chạy component thật qua harness mock (không DOM/browser thật). Browser visual/responsive/real approval NOT RUN. Không fake dữ liệu production.

## S25.7.9.2.1 — Translation catalog empty/error handling

- Dropdown lấy duy nhất Language active từ GET /api/voices như backend validation, không static fallback. Loại source language và normalize mã; mọi mã thực có trong catalog được chọn (không gate bằng4 mã cũ), nhãn tiếng Việt theo Intl.DisplayNames/fallback tên thật.
- Có aria-describedby/status cho loading, lỗi và catalog rỗng; empty: Chưa có ngôn ngữ đích được cấu hình. Vui lòng liên hệ quản trị viên để bổ sung ngôn ngữ được hỗ trợ. Select/Dịch khóa khi không có option, selected/draft cũ được clear, error có đường retry GET hiện có. Giữ placeholder/layout/timestamp/confirmation; chọn ngôn ngữ không gửi POST.
- DB read-only hiện xác minh0 Language; không thể hiển thị English thật nếu không cấu hình dữ liệu có phép. Source/hook fixtures không phải runtime catalog và không seed dữ liệu production. Browser E2E NOT RUN; source tests không chứng minh dropdown đã có options trên tài khoản thật.

## S25.7.9.2 — Gemini Translation feedback

- Giữ giao diện so sánh và nhóm display S25.7.9.1, timestamp mm:ss.SSS. Select có placeholder Chọn ngôn ngữ cần dịch, không tự chọn mục đầu; target từ deep link/project có thể mở lại nếu hợp lệ. Nút Dịch disabled khi chưa chọn hoặc đang xử lý, loading Đang dịch bằng AI..., saved feedback chỉ sau GET/POST thật; chưa dịch hiện Chưa có bản dịch cho ngôn ngữ đã chọn.
- UI UX Pro Max áp dụng explicit selection, loading/disabled, cancellation không báo thất bại giả. Ref in-flight chặn hai lần nhấn trước render, confirmation hiện có trước POST vẫn giữ; hủy trở lại chờ dịch, lỗi provider tiếng Việt hiển thị và retry qua thao tác người dùng. Không auto-trigger translation.
- Mapping không xác minh thì không hiển thị nội dung dưới timestamp sai và khóa tiếp tục đến giọng đọc. Reload đọc bản dịch được backend lưu, không mock runtime. Không sửa player/Transcript grouping/Sidebar/Mobile/Admin. Browser E2E NOT RUN.

## S25.7.9.1 — Bản dịch đồng bộ Bản ghi

- Tái sử dụng groupTranscriptSegments chỉ cho presentation: punctuation/pause và giới hạn như Bước2; bản gốc/API/Database giữ nguyên toàn bộ phân đoạn. Hai cột Bản gốc | Bản dịch trên desktop, một cột dưới700px; văn bản chỉ đọc chọn/copy được, tự co theo nội dung, padding12px và focus rõ theo UI UX Pro Max. Giữ design tokens/ngôn ngữ đích/nút Dịch và confirmation hiện có.
- Giữ backend segment ID đã có trong Transcript DTO dưới metadata frontend backendSegmentId (không đổi logical id). Translation DTO index phải khớp sequence-1 và sourceSegmentId phải khớp ID thật; kiểm tra nguồn/ngôn ngữ/phiên bản trong workspace. Chỉ nhóm bản dịch khi mapping đầy đủ, duy nhất, đúng thứ tự/timestamp/nội dung không rỗng; ghép bằng membership của cụm gốc, không nhóm độc lập bản dịch hoặc đoán mapping theo vị trí mảng.
- Mapping không an toàn: giữ từng phân đoạn, hiển thị lý do, không ghép nội dung chưa xác minh. Chưa có bản dịch: cụm bản gốc và thông báo chờ dịch, không sinh văn bản giả. Timestamp thống nhất mm:ss.SSS (ví dụ00:06.700), giữ phút/giây/mili giây thay vì bỏ giây. Không đổi backend/schema/provider, không AI calls/Atlas writes.
- Browser visual/E2E NOT RUN; fixture/mock kiểm tra UI/mapping không chứng minh dữ liệu dự án thật đã được dịch.

## S25.7.8.10 — Bản ghi: compact read-only presentation

- Giữ layout hai cột; native audio/video controls được giữ để bảo vệ hành vi playback đã xác nhận. Audio có icon sóng âm, container nền nhẹ; không thêm custom progress/volume hoặc autoplay.
- Segment padding12px và gap8px; số thứ tự/timestamp cùng header, nút Play icon16px với target44px, có focus và accessible label. Nội dung là vùng văn bản chỉ đọc tự co, chọn/copy được, giữ xuống dòng và wrap từ dài; không textarea/input giả hay chức năng lưu.
- Timestamp mm:ss.SSS, highlight chỉ khi phát trong khoảng start<=time<end; seeked đồng bộ ngay, pause/ended bỏ highlight, không auto-scroll. Màu active nằm sau rule nền trong CSS để không bị ghi đè. Mobile header wrap và hai cột chuyển một cột theo breakpoint hiện có.
- UI UX Pro Max áp dụng readable text, visible focus, touch target và feedback không phụ thuộc màu. Mục tiêu compact bằng spacing/natural-height, chưa đo tỷ lệ giảm20–30% trên browser. Browser visual sau polish NOT RUN; giữ nguyên transcript/provider/API/DB và các màn hình khác.

## S25.7.8.9 — Player phương tiện nguồn

- Transcript giữ hai cột: card nguồn có nút tải được bảo vệ, HTML5 audio/video native controls/play/pause/volume/seek; không autoplay. Video contain16:9 responsive, audio full-width; filename/metadata thật giữ nguyên. Loading/auth/network/404/unsupported/codec errors bằng tiếng Việt, retry download hoặc reload player tùy lỗi.
- Button “Phát từ …” trong mỗi cụm có accessible label/focus/44px, disabled trước metadata; seek đúng startTime và play có xử lý rejection. Active theo start<=currentTime<end, chỉ khi phát; nhãn “Đang phát” và viền primary/lavender, không tự scroll và không sửa transcript. Khoảng nghỉ không highlight.
- UI UX Pro Max dùng native controls/click-to-play/focus/nhãn không phụ thuộc màu. Authenticated blob + cleanup/abort, không query token/public URL. Chưa có progressive download; cần chờ tải đầy đủ, video lớn có chi phí bộ nhớ. Browser E2E NOT RUN; mock tests không chứng minh playback thực tế.

## S25.7.8.8 — Bản ghi: cụm hiển thị và giây lẻ

- Chỉ lớp hiển thị Web gộp word-like segments: dấu kết câu/pause0.6s, tối đa18 từ/8s/120 ký tự; phrase đã có giữ riêng. Không thay nguyên bản editor.draft/API, transcript lưu hoặc dữ liệu Translation/TTS.
- Mỗi cụm dùng startTime từ word đầu/endTime word cuối và nội dung đúng thứ tự. Reject timeline invalid/overlap, không sort hoặc tạo mốc giả. Hiển thị mm:ss.SSS (phút:giây.mili giây) với nhãn giải thích; không đổi helper timestamp màn Bản dịch.
- Heading cho biết số cụm hiển thị và số segments gốc; label phân đoạn tiếng Việt. Giữ read-only/actions/auth, chưa thêm playback phương tiện nguồn. Browser NOT RUN; không gọi AI/ghi Database.

## S25.7.7.12 — Final Account spacing (hiện tại)

- Card max-width840→820px, padding desktop32→24px dọc/32px ngang; content margin24→20/padding-top24→16; rows16→14px, hàng Email padding-bottom8px. Mục tiêu giảm chiều cao khoảng10–15% bằng spacing, chưa đo browser. Không fixed height/clip/giảm chữ hoặc touch target.
- Nút Chỉnh sửa align-self:flex-start ngang đầu identity/name trên desktop; giữ outline/focus/min-height44px. Mobile vẫn button xuống hàng và thông tin stacked, long text wrap; margin8 + main padding24 giữ offset32px desktop.
- Không đổi Account component, edit/save/cancel/API/auth/dropdown/logout hoặc layout chung. Giữ việc bỏ thông báo “Đã cập nhật họ và tên” theo yêu cầu riêng trước bước này; lỗi vẫn hiển thị. Browser1440/768/375 NOT RUN; source validation ghi tại PROGRESS.

## S25.7.7.11 — Account Profile SaaS Modern (hiện tại)

- Giữ một card trắng 840px/radius16/padding32; card cách Header32px bằng main padding24 + margin8 (mobile16+8). Avatar80px, tên24–28px/email/badge role thật gộp đầu card; nút Chỉnh sửa outline primary bên phải, focus rõ và không icon.
- Badge nền #EDE9FE/chữ #4338CA/border #A5A0FA, padding6/12. Hai hàng semantic dl Họ và tên/Email có divider, padding dọc16px, không ô nền xám hay hàng role trùng. Mobile label trên/value dưới, button xuống hàng, email/tên dài wrap.
- Giữ nguyên API/authService/updateName/subscription Header, validation2–100/trim, double-submit/loading/Hủy/error/success. Success chỉ sau response thành công, không có sẵn lúc mở trang. Không thay Backend/Header/Sidebar/auth/logout hoặc API contract.
- UI UX Pro Max áp dụng hierarchy/grouping/focus/form semantics; browser edit/save/cancel/logout/responsive1440/768/375 NOT RUN, không ghi thử Database. Source validation ghi tại PROGRESS.

## S25.7.7.9 — Chỉnh sửa họ và tên Customer Web

- Giữ card compact S25.7.7.8; thêm Chỉnh sửa cạnh giá trị Họ và tên. Form inline có label/autofill/focus, Lưu thay đổi/Hủy, loading/disabled, feedback success/status và lỗi/alert. Không card/banner mới; email/role chỉ đọc, logout vẫn trong Profile dropdown.
- Tên trim/2–100 ký tự như backend, hỗ trợ tiếng Việt; validate blur, chặn tên sai và double-submit. Hủy chỉ bỏ draft; API lỗi giữ tên cũ. Chỉ cập nhật UI sau response thành công.
- Không có Auth Context trong Web hiện tại: dùng authService + subscription profile in-memory để Header cập nhật tên/avatar/dropdown; response GET khởi tạo cũ không ghi đè update mới. Account cập nhật state từ safe user trả về; reload gọi GET `/auth/me`.
- UI UX Pro Max áp dụng form onSubmit, label/focus/error recovery và controls wrap nhỏ; không thay layout trang khác, session/JWT hoặc tokens.
- Browser edit/cancel/reload/logout/responsive NOT RUN; không ghi thử Atlas. Source tests không thay thế runtime persistence.

## Design

- Modern AI SaaS
- Clean, minimal, professional
- Blue/white with a soft gray background
- Rounded cards and subtle shadows
- Clear typography, consistent spacing and accessible contrast

## Customer Web (`frontend-web/`)

Desktop layout: Sidebar + Topbar + Main Workspace.

Desktop tận dụng multiple columns, editor lớn và sidebar navigation.

## Customer Mobile (`frontend-mobile/`)

Mobile layout: Header + Single-column Content + Bottom Navigation khi phù hợp.

Không copy desktop layout trực tiếp sang mobile.

## Customer Screen Status

- Implemented UI: Login, Register, Dashboard, Projects, New Project / mock Upload, Customer Transcript Editor (S7), Customer Translation Editor (S8), Customer Voice & TTS Configuration (S9), Customer Generate & Processing (S10).
- Existing placeholders: Settings.
- Implemented S11: Result and History. S11.5 Customer Web Visual Redesign completed; Profile completion later.

## Admin Web (`admin-web/`, S12 foundation)

Admin Web is a **separate application**, not a route or component section inside Customer Web. S12–S16 now provide all primary mock Admin screens; backend integration remains future work.

## Component Inventory and Future Patterns

- Implemented shared patterns: Button, Input, Card, Badge, Spinner, ProgressBar, EmptyState, ErrorState, PageHeader/Sidebar/Topbar on Web, and header/tab navigation on Mobile.
- Later patterns as needed: Select, Modal, Dialog and Toast.
- Implemented project-specific patterns: ProjectCard, filters and status badges.

## Implemented Design System

### Foundations

- Matching Web and Mobile color, spacing, radius and typography tokens
- Soft gray application background, white surfaces and blue primary palette
- Responsive spacing, accessible contrast and restrained shadows

### Common Components

- Button: primary, secondary, ghost and danger variants; disabled and loading states
- Input: label, helper, error, required and disabled states
- Card and Badge
- Spinner and ProgressBar
- EmptyState and ErrorState

### Web Application Shell

- Persistent desktop Sidebar with active route highlighting
- Responsive navigation drawer for tablet and mobile widths
- Sticky Topbar, user placeholder and reusable PageHeader
- Login and Register screens remain outside the application shell

### Mobile Application Shell

- Expo Router tab navigation for Dashboard, Projects, History and Settings
- Safe-area-aware MobileHeader and scrollable screen container
- New Project remains a stack route outside the tab bar

Dashboard and Projects are implemented with development mock data.

## Authentication UI

### Web

- Responsive split-screen `AuthLayout` shared by Login and Register
- Accessible email and password controls with inline field/form errors
- Password visibility controls and loading submit states

### Mobile

- Native Login and Register layouts with Safe Area handling
- Keyboard-avoiding, scrollable forms with mobile keyboard configuration
- Accessible password visibility controls and inline validation

Authentication uses a short mock UI flow only. Backend authentication and persistent sessions are not connected.

## Dashboard and Projects

### Web

- Responsive Dashboard statistics and recent-project list
- Projects page with combined local search and status filtering
- Desktop project rows collapse into readable cards on smaller screens

### Mobile

- Two-column statistics and native project cards on Dashboard
- FlatList-based Projects screen with search and horizontally scrollable filter chips
- Dashboard and Projects CTAs navigate to the implemented New Project screen

### Project Components

- `StatCard`, `ProjectCard`, `ProjectStatusBadge` and project filters
- Friendly language pairs, relative update dates and processing progress
- Separate empty states for no project data and no matching results

Project screens use clearly marked development mock data. Backend project APIs are not connected.

## New Project and Media Upload (S5)

- Web `/projects/new`: project name, source language, accessible browse input, drag-and-drop with active state, validated file card, video/audio preview, and upload progress.
- Mobile `/projects/new`: project name, source-language chips, Expo Document Picker for existing video/audio, validated metadata card, and upload progress. Keyboard avoidance and safe areas are supported.
- Both frontends support cancel, retry, success and error states. Upload is simulated locally; no media is sent or persisted. Continue returns to Projects; the sample uploaded project opens the S7 Transcript Editor.

## Customer Transcript Editor (S7)

- Web `/projects/:projectId/transcript`: two-column media information and timestamped segment editor, collapsing to one column on narrow screens. A mock project without a playable URL shows honest media metadata rather than a broken video/audio player. The segment list has an internal scroll area on desktop.
- Mobile `/projects/[projectId]/transcript`: single-column FlatList with timestamped multiline inputs, KeyboardAvoidingView and safe-area padding; no new native media dependency.
- Both clients load by route `projectId`, generate ten development-only sample segments, allow correction/reset/save, validate empty text, show dirty/saved/loading/error/empty states and offer retry. Full text is derived from segments on save.
- Generated/saved transcripts live only in mock service memory for the current app session. No STT provider, backend or persistent media exists. Continue to Translation is enabled only for a valid, saved transcript with no pending edits.

## Customer Translation Editor (S8)

- Web `/projects/:projectId/translation`: source language, labelled target selector excluding the source, and paired Original/Translation rows sharing the same segment timestamps. Rows stack on narrow screens.
- Mobile `/projects/[projectId]/translation`: accessible target-language choices, single-column segment cards, multiline translation inputs, FlatList and keyboard avoidance.
- Both clients require a saved S7 transcript, show read-only source text, generate deterministic samples, validate empty/whitespace text, and support save/reset plus loading/empty/error/retry states.
- Language changes are disabled while dirty. Reset restores the last saved translation, or discards an initial unsaved generation. Back to Transcript asks before discarding pending edits.
- Saved translations are separate per project/language and live only in module memory. Source ID/sequence/timing are preserved; changing the saved transcript invalidates older translations.
- Vietnamese-to-English S7 samples have matching English copy. Other languages use deterministic mock copy; edited source text gets an explicitly labelled sample. No provider is called.
- Continue to Voice/TTS opens the saved target-language context only when the translation is valid and has no pending edits.

## Customer Voice & TTS Configuration (S9)

- Web `/projects/:projectId/voice?language=en`: saved translation language/segment/character summary, first two translated segments, active voice cards, gender filtering and optional name search. Three-column cards collapse to two and then one column.
- Mobile `/projects/[projectId]/voice`: target language is passed with the project ID, single-column FlatList cards, gender filters, comfortable Preview/Select actions and speed presets from 0.5x to 2.0x.
- One selected voice is stored by ID. Selected cards show a text/check indicator. Inactive or unrelated-language voices are never selectable.
- Preview is explicitly labelled as simulation with no audio. Only one preview runs at a time; Stop, switching previews, filtering, saving and unmount cancel its timer. Failures support retry.
- Web uses a labelled speed range (0.5–2.0, step 0.1); Mobile uses existing buttons with 0.5/0.75/1.0/1.25/1.5/2.0 presets. No new native package is required.
- Both clients validate voice/language/speed, show configuration and dirty/saved state, save to mock memory and reset to the last saved values (or empty voice/default speed initially).
- Back to Translation preserves target language and warns before discarding pending configuration. A changed saved translation invalidates older narration configuration.
- Loading, unavailable translation, empty voice catalog, unmatched filters and retryable failures are supported. WorkflowSteps is shared with S7/S8.
- Continue to Generate opens S10 only when configuration is valid, saved and unchanged. Project ID and target language are preserved. Real TTS is NOT_INTEGRATED and narration audio is NOT_GENERATED.

## Customer Generate & Processing (S10)

- Web `/projects/:projectId/generate?language=en` and Mobile `/projects/[projectId]/generate` load the saved S9 configuration. Missing/invalid settings show a Voice Settings action; loading and load failures are explicit.
- Generation Summary shows project/media, source/target languages, transcript/translation segment counts, voice and speed. Edit Translation/Edit Voice preserve language. A review checkbox confirms settings before Generate Video (Generate Audio for audio-only projects).
- Shared WorkflowSteps highlights Generate. Upload/Transcript/Translation/Voice start completed; only Narration Generation and Video Processing (Audio Processing for audio source) are simulated.
- Overall progress averages the two remaining stages; percentages are finite and clamped to 0–100. Reusable ProcessingStage supports status text/icons and optional progress for future indeterminate tasks.
- Default processing is deterministic and succeeds. The service owns all timers; synchronous start locking prevents double starts. Start/retry revalidate saved settings.
- During STARTING/PROCESSING, Generate and settings edits are unavailable. Cancel stops immediately. Navigation/unmount disposes the session; Mobile also cancels on blur. Browser refresh warns during processing.
- Failed state identifies stage/reason and offers retry. Retry/restart resets both stages to 0 and removes stale errors/timers. Completed state says simulation complete and explicitly states that no output file exists.
- Completed View Result opens the project/language-specific S11 screen. Navigation cancels active processing but retains completed mock metadata in memory; reload resets all session data.
- Web summary/pipeline columns become one column below 950px. Mobile uses the existing scrollable screen, safe-area layout and accessible progress components without native dependencies.
- Failure testing: set `features/processing/mockProcessingScenario.ts` → `failFirstAttemptAt` to `start`, `narration` or `media` in the desired client. A new session fails once at that stage; retry succeeds by default. Service `start/retry({ failAt })` can test repeated failures.
- Regression checks: from `frontend-web`, run `node scripts/verify-processing.mjs` for both clients. Optional `node scripts/verify-processing-browser.mjs` requires Vite at 127.0.0.1:5175 and a separate temporary Chrome profile with remote debugging at 127.0.0.1:9223. No test framework is installed.

## Customer Result & History (S11)

- Web `/projects/:projectId/result?language=en`; Mobile `/projects/[projectId]/result`. Completed Generate preserves project and target language.
- Result marks all five workflow steps complete and shows saved run metadata: source/target, media type, segment counts, voice, speed and completion date.
- Existing completed S4 fixtures are reopenable; unavailable saved voice/count/speed fields say so instead of inventing values.
- Duration and size, when present, are explicitly original-source metadata. No fake output paths, media player, URL, blob or file.
- Dark video/audio placeholder and visibly explained disabled Download. MOCK_PREVIEW means metadata only, not a playable result.
- Result handles loading, retryable error, unknown ID/language and not-ready states; Back to Projects/View History remain available.
- History derives from the same project repository plus session results. Case-insensitive project search combines with All/Draft/Processing/Completed/Failed filters; separate empty/no-match states and clear filters.
- Shared ProjectCard actions keep Dashboard, Projects and History aligned: completed → Result; failed/processing → Generate; draft/uploaded → Transcript. Missing saved settings are handled by the existing Generate guard.
- Session processing updates project status/progress; cancelled/disposed work clears active progress. Completed metadata survives route changes, not reload. History is a project summary, not a durable job audit.
- Web Result uses two columns collapsing below 800px; Mobile Result is single-column with safe areas. Mobile History reuses FlatList/filter chips; no dependencies added.
- New S11 copy and completion dates use Vietnamese; existing S1–S10 English labels are preserved. Broad localization/polish is deferred to S11.5.

## S11.5 Customer Web Visual Redesign

- Visual authority: user IMAGE 1 (light AI SaaS dashboard), not IMAGE 2 (previous dark-sidebar UI). Product stays **Người kể chuyện AI**, with multilingual narration subtitle.
- Web-only visual pass. Mobile layout, project data, mock services and S1–S11 processing/editor behavior remain unchanged.
- One light lavender sidebar (232px), compact icon navigation, soft active indicator and neutral mock workspace card. No premium plan, notifications, growth analytics or invented feature routes.
- White compact topbar with project search. Submitting navigates to existing Projects via `?q=`; existing case-insensitive filtering is reused, including subsequent searches while already on Projects.
- Content uses a 1464px outer maximum including 32px horizontal padding (1400px usable); tablet 24px, phone 16px. This replaces the previous narrow/empty composition.
- Dashboard: roughly 250px blue/lavender gradient hero, new-project CTA and original CSS/SVG video/wave/microphone/language illustration (VI/EN/JA/KO only). Illustration is decorative, not playable media.
- Four quick actions: new project; transcript/translation/voice require choosing a project and therefore link to Projects, never a fabricated global editor.
- Recent project table-style rows use existing project name, media icon, language codes, status, known progress and real workflow action. No fake thumbnails or durations.
- Desktop 2.15:1 project/right-panel grid. Right panel has actual project counts in 2×2 compact statistics and recent project updates (not a new activity service). Below 1250px the side panels move beneath projects; below 600px they stack.
- Indigo primary (#5850ec), violet accent (#794cff), lavender soft state, white cards, subtle #f7f8fd background. Existing token names are reused; previous dark-sidebar/stat-card styles are replaced, not layered alongside a second theme.
- Cards use 10–12px radius and subtle borders/shadows. Primary buttons remain solid; only hero CTA/illustration uses decorative gradients.
- Existing system font, 24–34px hero heading, 17px section headings, compact 12–14px body hierarchy. SVG Icon component extended consistently; no icon/font dependency added.
- Projects and History use the same compact rows, filters, status badges and column headings. Completed/processing/draft/failed are soft green/blue/neutral/red.
- New Project preserves the three-step upload logic, with lavender numbered sections and softer media dropzone. Workflow cards, inputs, buttons and badges inherit the shared tokens.
- Web reusable stepper now displays six steps through Kết quả; prior stages show SVG checks and the current step uses indigo. Mobile stepper is unchanged.
- Responsive checks: Dashboard at 1920/1440/1366/1024/768/375px; Projects/New Project/History/Transcript/Translation/Voice/Generate/Result at 1440/1024/768/375px. No page overflow detected.
- Validation: lint/typecheck/build, existing service/browser regression and `node scripts/verify-redesign-browser.mjs` (same Vite 5175/temporary Chrome 9223 setup). New script covers topbar search, actual mock-upload form and responsive pages.

## S12 Admin UI

- Independent AdminAppShell/Sidebar/Topbar/PageContainer/PageHeader; light surfaces and indigo accents, no Customer hero.
- Waveform brand “Người kể chuyện AI / Trang quản trị”, ADMIN badge and administrator placeholder. No fake search or notification system.
- Sidebar groups TỔNG QUAN, QUẢN LÝ, CẤU HÌNH, HỆ THỐNG. Active links use aria-current, font weight and edge indicator, not color alone.
- Split login layout with labelled email/password, inline errors and explicit mock/no-real-credentials warning. No identity verification or credential/token storage.
- Dashboard shows four mock statistics, sample projects, job status summary, activity and S13 scope note. Fixtures are centralized; no charts/live monitoring.
- Users S14, Projects/Jobs S15 and Languages/Voices/Logs/Settings S16 are now implemented; no primary sidebar destination remains a placeholder.
- Shared Card/Button/Badge/StatusBadge/StatCard/EmptyState; existing inline SVG icon approach reused without cross-app imports or new library.
- Sidebar is persistent from 1024px. Smaller widths use native modal dialog with focus containment, Escape and navigation close. Skip link and focus indicators included.
- Tested at 1920/1440/1366/1024/768/375px. Tables scroll internally; login stacks. All routes support Vite refresh.
- Customer/Mobile remain unchanged during S12.

## S13 Admin Dashboard

- Preserves approved S12 light shell/sidebar/topbar, ADMIN identity, cards, tokens and typography. Removes S12/MOCK PREVIEW/next-sprint presentation from the dashboard and sidebar; one shell notice identifies illustrative data. Workload card additionally clarifies that it is not infrastructure monitoring.
- Four statistics: total customers/projects, processing jobs, failed jobs; supporting descriptions and semantic tones. StatCard supports optional comparison text, but no unsupported growth figures/range selector is shown.
- RecentProjectsCard: five projects, customer, language pair, specific canonical status, known progress and localized update time; Xem tất cả links to /projects.
- ProcessingJobsCard: five recent/active jobs, Vietnamese job type/status, known progress, start/update time; link to /jobs. No cancel/retry management actions.
- SystemStatusCard summarizes queued/processing/completed-today/failed jobs, never API/MongoDB/provider health.
- RecentActivityCard: six centralized ActivityLog-shaped records with category icons, descriptions and timestamps. Activity is illustrative, not evidence of implemented management operations.
- Desktop grid remains approximately 65/35; below 1200px sections stack. Stat cards become 2×2 below 1024px. Narrow tables scroll internally, never the entire page.
- Initial request: skeleton statistics and panels. Refresh: previous snapshot stays visible with aria-busy and disabled “Đang tải…” button. Failure: Vietnamese error and Thử lại; zero-data snapshot: four zero stats, workload zeros, and independent project/job/activity empty messages.
- Service owns all simulated latency and cleanup; no polling or page reload. Progress has accessible labels/min/max/value; tables use column headers, times use shared Intl/Date formatting.
- Developer testing: `src/mocks/adminDashboardScenario.ts` mode success/error/empty and latencyMs. Defaults success/350ms. Change mode then refresh/retry; no public simulation-control UI. Browser regression temporarily switches scenarios and restores defaults.
- Validation: npm lint/typecheck/build/test, browser routes/refresh/active state/drawer and 1920/1440/1366/1024/768/375px; loading/error/retry/empty/refresh/navigation cancellation covered.
## S14 Admin Customer Management

- `/users` hiển thị bốn thống kê được suy ra từ cùng nguồn mock, tìm theo tên/email, lọc trạng thái, sắp xếp và phân trang 10 bản ghi/trang.
- Bảng semantic chỉ hiển thị tài khoản `CUSTOMER`; trạng thái dùng mapping chuẩn `ACTIVE`/`BLOCKED`.
- `/users/:userId` hiển thị hồ sơ chỉ đọc, tổng hợp dự án và dự án gần đây với `ProjectStatus` chuẩn.
- Khóa/mở khóa dùng native dialog có nhãn/focus, pending, chống gửi lặp và phản hồi thành công/lỗi.
- Có skeleton, lỗi/thử lại, empty trước/sau bộ lọc, not-found và responsive table/detail.
- UI dùng mock trong bộ nhớ; trạng thái frontend không ngăn đăng nhập và không phải ranh giới bảo mật.

## S15 Admin Projects & Processing Jobs

- `/projects`: thống kê từ 18 project mock, tìm tên dự án/khách hàng/email, lọc trạng thái/ngôn ngữ/phương tiện và phân trang.
- `/projects/:projectId`: tổng quan chỉ đọc, customer link, media metadata, pipeline, related jobs và result metadata trung thực.
- `/jobs`: thống kê từ 26 job quan hệ hợp lệ, tìm mã/dự án, lọc type/status và phân trang.
- `/jobs/:jobId`: project/customer links, progress, lỗi mock, retry FAILED và cancel QUEUED/PROCESSING qua dialog.
- Có skeleton, lỗi/thử lại, empty, not-found và responsive table/detail.

## S16 Admin Languages, Voices, Logs & Settings

- `/languages`: derived summary/voice counts, search/status filter, add/edit validation and confirmed enable/disable without hard delete.
- `/voices`: derived summary, combined filters, add/edit/enable/disable and honest preview-unavailable feedback; every voice references a language.
- `/logs`: read-only search/category/role/time filters, pagination and accessible detail dialog without invented IP/token/stack data.
- `/settings`: general, upload, processing, narration defaults and honest system-information cards; dirty save/reset, validation and mock feedback.
- All modules have loading/error/empty states, responsive filters/tables/forms/dialogs and service-owned latency.

## S16.5 — Chuẩn hóa tiếng Việt

- Customer Web, Customer Mobile và Admin Web sử dụng tiếng Việt làm ngôn ngữ hiển thị chính.
- Thuật ngữ nghiệp vụ được thống nhất: Bảng điều khiển, Dự án, Bản ghi, Bản dịch, Giọng đọc, Tạo thuyết minh và Kết quả.
- Các giá trị kỹ thuật như route, enum, mã ngôn ngữ, tên nhà cung cấp và định dạng tệp vẫn được giữ nguyên.
- Dữ liệu mẫu bằng ngôn ngữ nguồn/đích có thể giữ nguyên để minh họa đúng quy trình đa ngôn ngữ.
- Mobile đã hoàn tất Việt hóa New Project, Transcript, Translation, Voice, Generate, Result cùng loading/error/empty state, alert và nội dung hỗ trợ tiếp cận.

## S24 Integration State

### S24.3.4 Customer Mobile Account

- Thanh tab Mobile giữ Dashboard, Projects, History và Settings, đồng thời thêm `Tài khoản` với icon outline từ thư viện hiện có.
- Màn hình Tài khoản hiển thị tên và email thật của Customer từ `/api/auth/me`; có loading/error state và không dùng profile fixture.
- Nút nguy hiểm `Đăng xuất` luôn hiển thị, yêu cầu xác nhận native. Logout thu hồi phiên backend khi reachable và luôn xóa phiên local; protected navigation tự đưa người dùng về Login.
- Không có redirect thủ công trong logout, không thêm native dependency và không thay đổi Expo managed workflow.

### S24.2 Customer Web

- Customer Web giữ nguyên visual shell nhưng dữ liệu runtime đến từ backend: auth, projects/media, transcript, translation, voice/TTS, processing và result/history.
- Transcript/Translation hiển thị read-only vì chưa có API update; không hiển thị save giả.
- Voice preview bị vô hiệu hóa khi catalog không có preview URL. Tốc độ TTS hiển thị cố định 1.0x theo backend.
- Result phát/tải protected video hoặc audio qua Blob URL. Project detail hỗ trợ cập nhật và xóa có xác nhận.
- Mobile và Admin Web không thay đổi trong S24.2.
- S24.2.1: `/projects` có Previous/Next server-side, tổng số record/trang, URL-backed search/status/page, loading/error/empty states và reset trang khi đổi bộ lọc.

## S24.4 Admin Web Integration

- Giữ nguyên Admin shell, navigation, responsive layout và theme hiện có.
- Dashboard, Customers, Projects, Jobs, Languages, Voices, Logs và Settings hiển thị dữ liệu thật từ `/api/admin/*` với loading/error/empty states.
- Users, Projects, Jobs và Logs dùng phân trang/bộ lọc phía server theo contract backend.
- Project hiển thị `targetLanguages[]` và source media thật; không suy diễn một target language duy nhất.
- Retry/Cancel Job, thêm/sửa catalog và lưu Settings không hiển thị thành công giả. Các màn không có mutation backend được trình bày ở chế độ chỉ đọc.

- Existing visual layouts and themes are unchanged.
- Login/register errors now come from the sanitized backend contract; Customer and Admin application routes require an authenticated role-specific session.
- New Project on Web/Mobile creates a real project and uploads real media. No intermediate upload percentage is fabricated.
- Screens whose services are still mock remain integration gaps and must not be treated as production data.

## S25.1 — Customer Web UI Audit and Design Plan

Phạm vi audit ngày 2026-10-10 chỉ gồm `frontend-web`. Đây là kế hoạch cải thiện giao diện; chưa có component, style, route, API hay hành vi ứng dụng nào được thay đổi trong S25.1. Các mô tả mock ở những mục lịch sử phía trên đã lỗi thời tại một số nơi; trạng thái tích hợp hiện hành được ghi trong `docs/CONTEXT.md` và `docs/PROGRESS.md`.

### Route và màn hình hiện có

| Route thực tế | Màn hình | Trạng thái UI hiện tại |
| --- | --- | --- |
| `/` | Điều hướng vào ứng dụng | Chuyển đến `/dashboard`; chưa có Landing/Home công khai. |
| `/login`, `/register` | Đăng nhập, đăng ký | Có split layout, validation, loading và lỗi từ API. |
| `/dashboard` | Bảng điều khiển | Có hero, quick actions, dự án gần đây, thống kê và hoạt động gần đây. |
| `/projects` | Danh sách dự án | Có tìm kiếm, lọc trạng thái, phân trang server-side, loading/error/empty. |
| `/projects/new` | Tạo dự án và tải phương tiện | Một luồng ba bước; Upload Media không phải route riêng. |
| `/projects/:projectId` | Chi tiết dự án | Có sửa tên, mô tả, ngôn ngữ nguồn, tiếp tục workflow và xóa. |
| `/projects/:projectId/transcript` | Bản ghi | Có metadata, trạng thái STT, segments và prerequisite/error state; chỉnh sửa đang read-only theo API hiện tại. |
| `/projects/:projectId/translation` | Bản dịch | Có chọn ngôn ngữ đích, so sánh segments, trạng thái dịch; chỉnh sửa đang read-only theo API hiện tại. |
| `/projects/:projectId/voice` | Giọng đọc | Có catalog, bộ lọc, cấu hình được backend hỗ trợ và empty/error state. |
| `/projects/:projectId/generate` | Tạo thuyết minh/xử lý | Có bước xác nhận, tiến trình, polling/trạng thái lỗi và điều hướng đến kết quả. |
| `/projects/:projectId/result` | Kết quả/xuất | Có metadata, protected playback/download qua Blob URL và trạng thái chưa sẵn sàng. |
| `/history` | Lịch sử | Có danh sách, tìm kiếm/lọc và mở lại workflow/kết quả. |
| `/settings` | Tài khoản/Cài đặt | Hiện chỉ đọc tên, email, vai trò và đăng xuất; chưa có API cập nhật hồ sơ/mật khẩu. |
| `*` | Không tìm thấy | Có màn hình 404 nhưng nội dung còn hoàn toàn bằng tiếng Anh. |

Tên file `*Placeholder.tsx` là di sản đặt tên, không đồng nghĩa màn hình chỉ là placeholder. Dashboard, Projects, New Project, History, Login, Register và Settings đều đang render chức năng thật ở mức được mô tả trên.

### Màn hình thiếu hoặc chưa hoàn chỉnh trong phạm vi hiện tại

- Chưa có Landing/Home công khai. Việc thêm Landing cần một quyết định route rõ ràng vì `/` hiện thuộc luồng vào Dashboard; không tự tạo route hoặc nội dung marketing trong đợt polish.
- Upload Media đã tồn tại bên trong `/projects/new`; không tạo `/upload` riêng và không tách business flow.
- Profile/Settings chỉ có thông tin tài khoản và đăng xuất. Không thiết kế nút lưu hồ sơ, đổi mật khẩu, gói thuê bao hoặc tùy chọn hệ thống khi backend chưa hỗ trợ.
- Transcript và Translation hiển thị dữ liệu thật nhưng không được trình bày như editor có thể lưu cho đến khi có update API.
- Source media chỉ có metadata vì backend chưa có protected source-media playback endpoint; không hiển thị player giả hoặc URL storage.
- Voice preview chỉ khả dụng khi catalog trả về preview an toàn. Empty catalog phải tiếp tục là trạng thái hợp lệ.

### Vấn đề UI/UX chính đã xác nhận

1. **Ngôn ngữ chưa thống nhất:** `/projects/new` còn các chuỗi như `Project name`, `Source language`, `Browse Files`, `Change`, `Remove`, `Upload & Continue`, `Validating`; Translation còn thông báo reset tiếng Anh; 404 còn `Page not found`/`Go back`; workflow/status vẫn có nhãn kỹ thuật như `SAVED`, `WAITING`, `PROCESSING`, `Upload`, `Video Processing`; `Customer`, `Backend`, `Metadata` xuất hiện trong copy hướng người dùng.
2. **Hệ token chưa đủ chặt:** token nền tảng đã có nhưng CSS màn hình vẫn chứa nhiều màu, kích thước, radius và khoảng cách hard-code; `--font-size-sm` và `--font-size-md` cùng là `0.875rem`, làm giảm phân cấp; một số nội dung chỉ 9–11px, khó đọc ở mật độ màn hình cao.
3. **Form không đồng nhất:** Project Detail dùng input/select/textarea thô bên trong class của auth form; New Project trộn `Input`, select tùy biến và button copy tiếng Anh; feedback thành công/lỗi chưa có một pattern chung.
4. **Trạng thái kỹ thuật lộ ra UI:** nhiều Badge render trực tiếp enum backend và dùng `replace('_', ' ')` thay vì nhãn tiếng Việt tập trung. Điều này tạo copy không đồng nhất giữa Project Card, Transcript, Translation, Voice và Generate.
5. **Shell/accessibility:** `aria-label` của sidebar, overlay và menu còn tiếng Anh; chưa có skip link; chưa có cơ chế đưa focus/announce khi đổi route; nút tài khoản chỉ hiện chữ `U` thay vì dữ liệu người dùng; overlay đóng sidebar có label tiếng Anh.
6. **Điều hướng workflow:** PageHeader, nút quay lại và WorkflowSteps có thứ bậc/hình thức khác nhau theo màn hình; breadcrumb/project context chưa nhất quán. Quick action Transcript/Translation/Voice đều đưa về Projects nhưng chưa giải thích rõ bước chọn dự án.
7. **Responsive:** shell có breakpoint tốt ở 1023/640px, các workspace chính có breakpoint riêng; tuy nhiên topbar search cạnh avatar/menu dễ chật ở 320–375px, action group dài có thể wrap thiếu trật tự, bảng giả bằng CSS Grid cần thứ tự đọc rõ khi chuyển card, và các toolbar/bộ lọc cần kiểm tra touch target 44px.
8. **Loading/empty/error:** component dùng chung đã có nhưng cách đặt trong trang chưa nhất quán; một số loading state thiếu khung/bối cảnh trang, Result “chưa sẵn sàng” chưa dùng EmptyState, và Project Detail không có success feedback rõ ràng sau lưu.
9. **Semantic/accessibility:** danh sách dự án là CSS Grid dạng bảng chứ không phải bảng semantic; có thể giữ card-list responsive nhưng header `aria-hidden` không cung cấp quan hệ cột cho assistive technology. Các confirm dùng `window.confirm`, không đồng nhất giao diện và khó quản lý focus. Icon phương tiện trong Transcript dùng ký tự `▶`/`♫` thay vì Icon component hiện có.
10. **Copy và naming:** tiêu đề `Dự án`/`Dự án mới` chưa hoàn toàn khớp navigation `Dự án của tôi`/`Tạo thuyết minh`; thuật ngữ nên cố định: “Giọng đọc”, “Phương tiện”, “Bản ghi”, “Bản dịch”, “Tạo thuyết minh”, “Kết quả”.

### Design system đề xuất

Giữ hướng visual đã được duyệt: AI SaaS sáng, nền trắng/xám rất nhạt, primary xanh indigo và accent tím; không redesign cấu trúc hay thay theme.

**Màu sắc**

- Primary: `#5850EC`; hover: `#4538CF`; soft: `#F0EEFF`.
- Accent: `#794CFF`; soft: `#EEE9FF`. Gradient chỉ dùng cho hero/chi tiết trang trí.
- Background: `#F7F8FD`; surface: `#FFFFFF`; secondary surface: `#F4F5FB`; border: `#E9ECF5`.
- Text primary: `#182044`; secondary: `#606B8B`; muted: `#737F9B`.
- Semantic success/warning/error/info tiếp tục dùng token hiện có. Mỗi trạng thái phải có chữ/icon, không chỉ dựa vào màu.

**Typography**

- Giữ font stack Inter/system hiện có; không thêm font dependency.
- Đề xuất scale: 12px caption, 14px body nhỏ, 16px body mặc định, 18/20px section heading, 24–30px page heading, 32–40px hero.
- Body line-height 1.5–1.6; heading 1.2–1.3. Hạn chế nội dung chức năng dưới 12px.

**Spacing, radius và elevation**

- Dùng lưới 4px: 4, 8, 12, 16, 24, 32, 48.
- Control cao tối thiểu 40px desktop và vùng tương tác tối thiểu 44×44px ở viewport cảm ứng.
- Radius: 6px cho phần tử nhỏ, 10px control/card nhỏ, 12px card chính, 20px hero; pill chỉ cho badge/chip.
- Shadow nhẹ cho surface nổi; trạng thái phân cấp chủ yếu bằng border, spacing và nền.

**Component rules**

- Một hệ Button/Input/Select/Textarea thống nhất với default, hover, focus, disabled, loading và error.
- Chuẩn hóa PageHeader gồm title, description, breadcrumb/context và action area responsive.
- Badge nhận status domain và tự ánh xạ nhãn tiếng Việt; không render enum trực tiếp.
- EmptyState/ErrorState/LoadingState giữ cùng chiều rộng, icon, heading, copy và CTA.
- Modal/Dialog dùng cho xác nhận thao tác tốn phí hoặc phá hủy, quản lý focus và Escape; chỉ triển khai khi bước code được duyệt.
- WorkflowSteps là nguồn điều hướng ngữ cảnh duy nhất của quy trình và phải hiển thị tên bước tiếng Việt ở mọi breakpoint.

**Responsive và accessibility**

- Desktop từ 1200px, tablet 768–1199px, mobile browser 320–767px; kiểm tra ít nhất 1440, 1024, 768, 375 và 320px.
- Desktop giữ sidebar; tablet/mobile dùng drawer hiện tại. Ở mobile, topbar ưu tiên menu + context, search có thể chiếm hàng riêng thay vì co quá nhỏ.
- Không tạo horizontal page overflow. Table/list dài được cuộn trong vùng chứa hoặc chuyển thành card có nhãn trường rõ ràng.
- Thêm skip link, focus-visible rõ, focus sau route change, `aria-live` cho tác vụ bất đồng bộ, label tiếng Việt và thứ tự tab hợp lý.
- Tôn trọng `prefers-reduced-motion`; không dùng animation để truyền đạt trạng thái duy nhất.

### Checklist cải thiện theo màn hình

1. **Landing/Home:** hiện chưa có route. Trước khi triển khai, quyết định có giữ `/` → `/dashboard` hay tạo landing công khai. Nếu được duyệt, chỉ mô tả năng lực thật, CTA đến Login/Register, không quảng bá tính năng/gói chưa có backend.
2. **Login/Register (`/login`, `/register`):** giữ split layout; cân lại headline trên tablet, chuẩn hóa mobile brand với waveform brand, Việt hóa toàn bộ aria/copy, rà autocomplete/error announcement và trạng thái submit.
3. **Dashboard (`/dashboard`):** giữ nguyên bố cục hero/quick actions/grid; thống nhất tên action với route, tăng cỡ chữ phụ quá nhỏ, ánh xạ status tiếng Việt và làm rõ rằng action workflow cần chọn dự án.
4. **Project List (`/projects`):** giữ pagination API và URL filters; chuẩn hóa title “Dự án của tôi”, status label, row/card semantic; bảo đảm header cột không truncate, pagination và filters không tràn ở 320px.
5. **Create Project (`/projects/new`):** Việt hóa toàn bộ form, validation, file card, progress và fallback error; dùng chung form controls; giữ create→upload và cleanup hiện tại, không thay contract.
6. **Project Detail (`/projects/:projectId`):** dùng form component chuẩn, thêm success feedback không gây nhảy layout, hiển thị status/media bằng nhãn tiếng Việt, tách action nguy hiểm, giữ update/delete API hiện có.
7. **Upload Media:** tiếp tục là bước trong `/projects/new`; làm rõ accept/500 MB, drag/drop, preview, cancel/retry và progress. Không tạo màn hình/route/business flow riêng.
8. **Transcript (`/projects/:projectId/transcript`):** hiển thị trạng thái STT tiếng Việt, CTA xác nhận rõ chi phí/xử lý, dùng Icon component, phân biệt chưa có/đang xử lý/thất bại/đã có transcript; giữ read-only và không tạo save giả.
9. **Translation (`/projects/:projectId/translation`):** Việt hóa confirm/reset/status, làm rõ prerequisite và hành động gọi dịch, giữ paired segments dễ đọc ở desktop và xếp dọc trên mobile; không bật edit/save khi API chưa hỗ trợ.
10. **Voice/Narration (`/projects/:projectId/voice`):** thống nhất “Giọng đọc”, phân cấp catalog/filter/config, đảm bảo empty catalog và unavailable preview rõ ràng, chỉ cho cấu hình backend thật hỗ trợ.
11. **Result/Export (`/projects/:projectId/result`, `/history`):** dùng EmptyState cho chưa có kết quả, giữ protected Blob playback/download, hiển thị metadata và lỗi tải nhất quán; History dùng cùng card/status/pagination pattern khi backend contract cho phép.
12. **Profile/Settings (`/settings`):** đổi copy `Customer`/role enum sang nhãn thân thiện, hiển thị avatar initials thực, thêm xác nhận đăng xuất và trạng thái lỗi an toàn. Không thêm edit profile/password/subscription khi chưa có API.

Ngoài danh sách trên, `/projects/:projectId/generate` cần được polish cùng nhóm Voice/Result: Việt hóa stage/status, giữ bước xác nhận trước paid processing, làm rõ polling/retry và không mô phỏng thành công. Trang `*` cần được Việt hóa đầy đủ và có CTA an toàn về Dashboard/Dự án thay vì chỉ phụ thuộc lịch sử trình duyệt.

### Thứ tự triển khai đề xuất

1. **Nền tảng:** chốt token, typography, status/copy dictionary tiếng Việt và audit accessibility dùng chung.
2. **Shell:** Sidebar, Topbar, responsive drawer, PageHeader, skip link và route focus.
3. **Shared states/forms:** Button, Input, Select, Textarea, Badge, Dialog, loading/empty/error/success.
4. **Auth và 404:** bề mặt độc lập, ít rủi ro regression.
5. **Projects core:** Project List → Create/Upload → Project Detail; ưu tiên luồng CRUD/upload thật.
6. **Workflow:** Transcript → Translation → Voice → Generate → Result; triển khai theo dependency và giữ confirmation paid action.
7. **Dashboard, History, Settings:** tái sử dụng component đã ổn định, loại bỏ copy/status riêng lẻ.
8. **Responsive/a11y regression:** kiểm tra bàn phím, screen reader labels, 1440/1024/768/375/320px, sau đó lint/typecheck/build và browser smoke không gọi paid AI.

### S25.1 bổ sung — Yêu cầu nhất quán Customer Web/Mobile

Customer Web và Customer Mobile dùng cùng domain, backend data và API contract. Hai nền tảng không cần bố cục giống nhau, nhưng phải thống nhất năng lực, thứ tự hành trình, thuật ngữ, trạng thái, mức độ xác nhận và kết quả của thao tác. Khác biệt chỉ được giữ khi có lý do nền tảng rõ ràng.

#### Ma trận parity theo màn hình

| Nhóm màn hình/hành trình | Customer Web | Customer Mobile | Parity và khoảng trống |
| --- | --- | --- | --- |
| Entry/Landing | `/` chuyển tới `/dashboard`; không có landing công khai | `index` là màn khởi tạo phiên, `Stack.Protected` chọn auth/app | Cùng không có landing marketing. Giữ như hiện tại đến khi có quyết định sản phẩm chung. |
| Login/Register | `/login`, `/register`; form, validation, refresh session | `login`, `register`; form native, validation, SecureStore | Chức năng chính khớp. Copy lỗi và quy tắc validation phải dùng cùng wording/contract. |
| Dashboard | Hero, quick actions, 4 thống kê, recent projects, activity | 4 thống kê và recent projects | Core data khớp; Mobile thiếu quick actions/activity, nhưng không bắt buộc sao chép hero. Cần quyết định action tối thiểu chung. |
| Project List | Search/status/server pagination; table-card responsive | Search/status/server pagination; FlatList, chip cuộn ngang | Chức năng khớp. Label title/CTA/filter và status đang chưa hoàn toàn đồng nhất. |
| Create + Upload | `/projects/new`; drag/drop, file input, preview | `projects/new`; DocumentPicker, app-cache preparation, native multipart | Business flow/API khớp. Giữ drag/drop cho Web và picker native cho Mobile; Web còn nhiều copy tiếng Anh. |
| Project Detail | Sửa tên/mô tả/ngôn ngữ, xóa, mở workflow | Cùng chức năng; success feedback, validation và native delete dialog rõ hơn | Mobile đang hoàn thiện hơn về feedback/validation. Web cần đạt cùng hành vi, không đổi contract. |
| Transcript/STT | Metadata, confirmation paid action, status/segments, retry, read-only | Cùng API/lifecycle; timeout, polling và duplicate guard đã được củng cố | Cần rà parity timeout/polling/double-submit và cùng nhãn trạng thái. Real device/provider smoke vẫn hoãn. |
| Translation | Chọn target, confirmation, paired segments, retry, read-only | Cùng chức năng trên FlatList/native dialog | Core khớp. Web còn confirm/reset copy tiếng Anh; pattern dialog khác nền tảng nhưng nội dung/quyết định phải giống. |
| Voice/TTS | Catalog/filter/config, confirmation paid action, preview khi có | Cùng catalog/config/confirmation, UI touch-first | Core khớp. Phải thống nhất thuật ngữ “Giọng đọc”, empty catalog, preview unavailable và speed 1.0x do backend. |
| Generate/Processing | Review checkbox, start, progress, retry, result navigation | Cùng hành trình trên màn hình cuộn | Core khớp. Nhãn stage/status kỹ thuật còn khác nhau; không được tự tạo success trên một nền tảng. |
| Result/Export | Protected fetch → Blob URL, browser audio/video, download | Protected fetch → app cache, expo-audio/video, native share | Kết quả và bảo mật khớp; download Web và share sheet Mobile là khác biệt nền tảng hợp lệ. |
| History | Project/result history, local search/filter | Cùng dữ liệu và card/filter native | Gần parity; cần đồng nhất scope “lịch sử dự án” và trạng thái empty/filter. |
| Account/Settings | `/settings` gộp identity và logout | `account` có identity/logout; `settings` là placeholder riêng | Lệch IA rõ ràng. Không thêm setting giả; ưu tiên gộp hoặc định nghĩa vai trò hai tab để tránh tab rỗng. |
| Not Found/Invalid route | Có 404 riêng, hiện còn tiếng Anh | Expo Router chưa có màn hình not-found chuyên biệt trong inventory hiện tại | Mobile thiếu fallback tương đương; chỉ bổ sung khi triển khai mà không phát sinh nghiệp vụ. |

#### Hành trình Customer dùng chung

1. Khởi tạo phiên → chưa đăng nhập thì Login/Register, đã đăng nhập thì Dashboard.
2. Dashboard/Projects → Tạo dự án → nhập metadata → chọn và tải một video/audio.
3. Project Detail/List → mở Bản ghi; chỉ bắt đầu STT sau xác nhận paid action.
4. Có Bản ghi → chọn ngôn ngữ và xác nhận tạo Bản dịch.
5. Có Bản dịch → chọn Giọng đọc; xác nhận TTS trước khi tạo narration.
6. Kiểm tra cấu hình → xác nhận tạo thuyết minh → theo dõi processing.
7. Hoàn thành → Result → phát và tải xuống/chia sẻ protected artifact.
8. Projects/History cho phép mở lại đúng bước dựa trên trạng thái backend; Account cho phép đăng xuất và xóa phiên an toàn.

Mọi bước phải giữ nguyên `projectId`, target language và ownership. Không nền tảng nào được tự gọi STT/Translation/TTS khi mở màn hình; không dùng mock runtime để bù một API chưa có; refresh-once, lỗi 401 và dữ liệu sau reload phải có cùng ý nghĩa.

#### Thuật ngữ và trạng thái chuẩn

Tên điều hướng/action ưu tiên dùng chung: **Bảng điều khiển**, **Dự án của tôi**, **Tạo thuyết minh**, **Lịch sử**, **Tài khoản**; “Cài đặt” chỉ dùng khi có tùy chọn thật. Thuật ngữ workflow: **Phương tiện**, **Bản ghi**, **Bản dịch**, **Giọng đọc**, **Tạo thuyết minh**, **Kết quả**. Không dùng “Giọng nói” cho TTS UI và không hiển thị `Customer`, `Backend`, enum hoặc internal stage trong copy hướng người dùng.

| ProjectStatus | Nhãn tiếng Việt chuẩn |
| --- | --- |
| `DRAFT` | Bản nháp |
| `UPLOADED` | Đã tải lên |
| `TRANSCRIBING` | Đang tạo bản ghi |
| `TRANSCRIBED` | Đã tạo bản ghi |
| `TRANSLATING` | Đang dịch |
| `TRANSLATED` | Đã dịch |
| `GENERATING_AUDIO` | Đang tạo giọng đọc |
| `PROCESSING_VIDEO` | Đang xử lý video |
| `COMPLETED` | Hoàn thành |
| `FAILED` | Thất bại |

UI state dùng các nhãn: `NOT_STARTED` → **Chưa bắt đầu**, `LOADING` → **Đang tải**, `READY` → **Sẵn sàng**, `SAVING` → **Đang lưu**, `SAVED` → **Đã lưu**, `WAITING` → **Chờ xử lý**, `PROCESSING` → **Đang xử lý**, `CANCELLED` → **Đã hủy**. Mapping phải tập trung ở mỗi client và có cùng output; không dùng phép thay `_` bằng khoảng trắng trực tiếp trong component.

#### Unified design system

- **Brand:** tên “Người kể chuyện AI”, waveform/AI narration motif, nền sáng và indigo/violet. Cùng logo concept và tone copy, không bắt buộc cùng kích thước/layout.
- **Color contract:** primary `#5850EC`, primary pressed/hover `#4538CF`, primary soft `#F0EEFF`, accent `#794CFF`, accent soft `#EEE9FF`, background `#F7F8FD`, surface `#FFFFFF`, secondary surface `#F4F5FB`, text `#182044/#606B8B/#737F9B`, border `#E9ECF5`. Semantic colors success/warning/error/info dùng cùng giá trị hiện có. Mobile đang dùng primary `#2563EB` và cần được đưa về contract này ở bước implementation.
- **Typography:** cùng hierarchy tương đương: caption 12, supporting 14, body 16, section 18/20, page 24–30, hero 32–40; Web dùng px/rem, Mobile dùng density-independent units. Giữ system/Inter stack phù hợp nền tảng.
- **Spacing:** thang 4/8/12/16/24/32/48; không yêu cầu cùng số cột nhưng cùng nhịp dọc và mật độ thông tin.
- **Radius:** 6 nhỏ, 10 control/card nhỏ, 12 card chính, 20 hero, full cho chip/badge/avatar. Mobile token hiện có 8px cho cả `md/lg` cần được rà ở implementation.
- **Behavior:** Button có primary/secondary/ghost/danger và loading/disabled; form có label/helper/error/required; Badge luôn có text; async state có loading/empty/error/retry; destructive/paid action luôn xác nhận; success/error feedback được announce.
- **Touch/keyboard:** Mobile tối thiểu 44×44px, hỗ trợ keyboard avoidance và native back; Web có focus-visible, tab order, Enter/Space, pointer hover và shortcut chỉ khi discoverable.

#### Quy tắc riêng theo nền tảng

**Web**

- Giữ sidebar, sticky topbar, desktop multi-column và drawer ở viewport nhỏ.
- Giữ drag-and-drop, file input và browser preview trong Create Project; vẫn phải có browse button dùng bàn phím được.
- Dùng dialog Web quản lý focus cho paid/destructive confirmation thay cho copy khác biệt; giữ browser download cho result.
- Table/list có thể rộng hơn nhưng phải chuyển sang card có nhãn rõ ở mobile-browser, không tạo horizontal page overflow.

**Mobile**

- Giữ Expo Router protected stack, bottom tabs, native back và single-column/FlatList.
- Giữ DocumentPicker, file URI preparation và native multipart đã PASS trên Android; không thay bằng FormData/Blob Web.
- Giữ native Alert cho confirmation, app cache cho protected media, expo-audio/video và native share sheet.
- Hạn chế số tab trực tiếp; không giữ tab Settings rỗng cạnh Account. Chip ngang phải cuộn được và control có touch target tối thiểu 44px.

#### Khác biệt cần xử lý theo ưu tiên

**P0 — tính đúng và hành trình**

1. Không đụng tới Android upload/project editing đã PASS; tạo regression gate trước mọi token/component migration.
2. Đồng bộ exact `ProjectStatus`/UI-state label; Web hiện gom nhiều trạng thái thành “Đang xử lý”, còn Mobile có mapping chi tiết.
3. Sửa WorkflowSteps Mobile đang có state Result ở index 5 nhưng mảng chỉ render 5 bước, vì vậy không hiển thị chip “Kết quả”.
4. Rà parity confirmation, duplicate prevention, timeout/polling và retry cho STT/Translation/TTS/processing mà không gọi paid provider.

**P1 — navigation, copy và feedback**

5. Thống nhất tên Dashboard/Projects/Create trên sidebar, tabs, PageHeader và CTA.
6. Giải quyết `Settings` placeholder + `Account` trên Mobile so với `/settings` gộp trên Web; không tạo setting backend giả.
7. Việt hóa Web New Project, Translation confirmation/reset, 404, aria-label và mọi stage/status còn tiếng Anh.
8. Đưa Web Project Detail lên parity với Mobile về validation, success feedback và destructive confirmation.

**P2 — visual/component consistency**

9. Đồng bộ color/radius/typography tokens, brand icon và semantic tone giữa hai client.
10. Chuẩn hóa Button/Form/Badge/Empty/Error/Loading/WorkflowSteps behavior; implementation vẫn tách theo React DOM và React Native.
11. Cân nhắc quick actions tối thiểu trên Mobile và not-found fallback; không sao chép hero/activity nếu không cải thiện hành trình.
12. Chạy responsive/a11y/browser/device regression riêng cho từng nền tảng; visual similarity không thay thế functional runtime validation.

## S25.2 — P0 Cross-platform Foundation

### Unified status dictionary đã triển khai

- Web và Mobile có dictionary cùng cấu trúc cho `ProjectStatus`, Transcript, Translation, Voice/TTS và Processing. Backend enum/API payload giữ nguyên; chỉ display label được chuyển sang tiếng Việt.
- Project filter, Project badge và các Badge workflow lấy nhãn từ dictionary thay vì tự ánh xạ hoặc render enum. Web nay phân biệt đầy đủ: Bản nháp, Đã tải lên, Đang tạo bản ghi, Đã tạo bản ghi, Đang dịch, Đã dịch, Đang tạo giọng đọc, Đang xử lý video, Hoàn thành và Thất bại.
- UI states dùng chung: Đang tải, Chưa bắt đầu, Đang tạo bản ghi, Đang dịch, Sẵn sàng, Đang lưu, Đã lưu, Chờ xử lý, Đang khởi tạo, Đang xử lý, Hoàn thành, Thất bại và Đã hủy.
- Web processing stage titles đã đổi sang Tải lên, Bản ghi, Bản dịch, Cấu hình giọng đọc, Tạo giọng đọc và Xử lý video/âm thanh.

### Mobile WorkflowSteps

- Thứ tự chuẩn gồm đúng 6 bước: Tải lên → Bản ghi → Bản dịch → Giọng đọc → Tạo thuyết minh → Kết quả.
- Component Mobile hiển thị rõ completed/current/locked, có accessibility label cho từng bước và state selected/disabled.
- Trên màn hình hẹp, stepper cuộn ngang thay vì ép wrap làm đảo nhịp đọc. Route, permission và workflow action không thay đổi.

### Regression boundary

- Không thay DocumentPicker staging, app-controlled cache, native multipart field `file`, MIME/filename, cleanup, retry-project hoặc Project Detail update behavior.
- Regression suite bao phủ picker staging/permission/stale URI, native multipart/Bearer/no manual boundary, refresh chỉ một lần sau HTTP 401, upload cleanup/retry không tạo project trùng, validation/edit cache synchronization và duplicate-save gate.
- Cross-platform tests khóa completeness của dictionary, exact Vietnamese parity và sáu workflow labels theo đúng thứ tự.

### Parity còn lại sau P0

- Account/Settings information architecture, navigation wording và token màu/radius vẫn chờ P1/P2.
- Web New Project, Translation confirm/reset, 404 và một số copy kỹ thuật chưa được polish toàn bộ trong S25.2.
- Browser visual/runtime và Android physical-device verification chưa chạy trong S25.2; source tests/build/export không thay thế runtime verification.
- S24.3.12.2 real Whisper vẫn POSTPONED.

## S25.3 — P1 Navigation & Interaction Parity

### Điều hướng chuẩn

| Ý nghĩa | Web | Mobile |
|---|---|---|
| Tổng quan | Bảng điều khiển | Bảng điều khiển |
| Danh sách dự án | Dự án của tôi | Dự án của tôi |
| Luồng tạo/upload | Tạo thuyết minh | Tạo thuyết minh |
| Lịch sử | Lịch sử | Lịch sử |
| Phiên người dùng | Tài khoản | Tài khoản |

- Web giữ sidebar/topbar, `/projects`, `/projects/new`, `/history`, `/settings` và active-state theo route chính xác.
- Mobile giữ bottom tabs/native stack. Chỉ Tài khoản là destination hiển thị; Settings cũ là alias tương thích và không tạo tab trùng lặp.

### Account và phản hồi

- Account hiển thị dữ liệu phiên thật: họ tên, email, vai trò Khách hàng; có loading, error, retry và logout confirmation.
- Không cung cấp profile edit, password change, avatar upload hay setting chưa có API.
- Logout Web điều hướng về Login sau khi xóa phiên; Mobile không ép `router.replace`, để auth state và `Stack.Protected` quyết định.

### Quy tắc form và confirmation

- Login/Register dùng cùng validation tiếng Việt và chặn double-submit bằng khóa đồng bộ kết hợp disabled/loading.
- STT, Translation và TTS phải xác nhận rõ đây có thể là tác vụ AI tính phí. Hủy confirmation không gọi API và không đổi workflow state.
- Web dùng confirmation guard hiện có; Mobile dùng native Alert. Mọi lỗi tải account đều có retry, mọi thao tác bận có disabled/loading rõ ràng.

### Phần còn lại cho P2

- Đồng bộ visual tokens màu, typography, radius và trạng thái component mà không ép Web/Mobile có layout giống nhau.
- Chạy browser responsive/keyboard/a11y smoke và physical Android visual smoke; source test/build/export không thay thế runtime verification.

## S25.4 — Unified Visual Design System

### Token chuẩn

| Nhóm | Giá trị chuẩn |
|---|---|
| Primary | `#5850EC` |
| Accent | `#794CFF` |
| Background | `#F8FAFC` |
| Surface | `#FFFFFF` |
| Text primary | `#0F172A` |
| Text secondary / muted | `#475569` / `#64748B` |
| Border | `#E2E8F0` |
| Spacing | 4, 8, 16, 24, 32, 48px |
| Radius | 6, 10, 12, 20px và full |

- Success, warning, error và info luôn dùng cùng semantic meaning; badge không truyền đạt trạng thái chỉ bằng màu.
- Web dùng CSS variables; Mobile dùng `theme/tokens.ts`. Hai implementation độc lập theo nền tảng nhưng được regression test để giữ palette parity.

### Chuẩn component

- **Button:** tối thiểu 44px, primary/secondary/ghost/danger, loading khóa tương tác, pressed/hover/focus/disabled khác biệt rõ.
- **Input/Select/Textarea:** cao tối thiểu 48px, label/helper/error liên kết accessibility, focus ring indigo, disabled surface trung tính.
- **Card:** surface trắng, border nhẹ, radius 12px, shadow tiết chế; interactive card chỉ nâng nhẹ khi hover/focus trên Web.
- **Badge:** pill nhỏ, luôn có text, semantic background nhạt và foreground đủ tương phản.
- **Loading/Progress/Empty/Error:** nội dung tiếng Việt, live/accessibility role phù hợp, retry action dùng Button chuẩn.
- **PageHeader/MobileScreen:** hierarchy title/description/action tương đồng; action Web wrap ở màn hình hẹp, Mobile giữ single-column và safe area.
- Customer hiện không có custom Dialog dùng chung. Confirmation giữ browser guard/native Alert hiện hữu; chưa thêm UI library.

### Parity và giới hạn

- Cùng màu nhận diện, hierarchy, status semantics, terminology và icon meaning; navigation/file picker vẫn theo quy ước riêng của Web/Mobile.
- Không redesign từng trang trong S25.4. Screen-level density/spacing, responsive visual QA, browser keyboard/contrast và Android device visual QA là bước tiếp theo.
- Source/build/export PASS không được xem là browser hoặc physical-device visual PASS.

## S25.5 — Dashboard & Project List Polish

### Information hierarchy dùng chung

1. Welcome/page heading và CTA **Tạo thuyết minh**.
2. Thống kê dự án từ repository/API thật: Tổng số dự án, Hoàn thành, Đang xử lý, Thất bại.
3. Quick actions chỉ trỏ tới destination đang hỗ trợ.
4. Dự án gần đây hoặc danh sách dự án, với status/language/action cùng ý nghĩa.
5. Loading, error/retry, empty và filtered-empty giữ nguyên page context.

### Dashboard

- Web giữ hero và bốn workflow shortcuts hiện hữu. Mobile dùng hai shortcut trực tiếp phù hợp touch/small screen: Tạo thuyết minh và Dự án của tôi.
- Mobile không thay toàn màn hình bằng loading/error; welcome, statistics và actions vẫn ổn định, phần recent projects chịu async state.
- Không thêm growth, duration, activity API hoặc metric chưa tồn tại. Mọi count derive từ project data thật đã tải.

### Project List

- Cả hai nền tảng dùng title **Dự án của tôi**, CTA **Tạo thuyết minh**, search theo tên, exact status filter và server pagination.
- Search/filter reset page về 1. Mobile giữ `useFocusEffect` reload để phản ánh Project Detail edit khi quay lại.
- Web chuyển project row thành card flow ở màn hẹp; pagination dùng hai cột nút và dòng thông tin riêng, sau đó co về một cột nội dung ở 360px.
- Mobile giữ filter chips cuộn ngang, action target tối thiểu 44px, accessible project/action labels và live page information.

### Runtime validation gap

- Browser visual smoke **NOT RUN** vì Chrome automation không khả dụng trong môi trường hiện tại.
- Physical Android visual smoke **NOT RUN** vì không có `adb` khả dụng. Source tests/build/export không thay thế hai kiểm tra này.

## S25.6 — Create Project, Upload Media & Project Detail

### Parity checklist đã triển khai

| Hành vi | Web | Mobile |
|---|---|---|
| Tạo dự án | Tên, mô tả, ngôn ngữ nguồn | Tên, mô tả, ngôn ngữ nguồn |
| Validation | Inline, required, giới hạn ký tự | Inline, required, giới hạn ký tự |
| Chọn tệp | File picker và drag/drop hiện có | Native DocumentPicker và staging hiện có |
| Tiến trình upload | Loading không xác định, không giả phần trăm | Progress thật từ native upload callback |
| Khôi phục lỗi | Hủy, retry, chọn tệp khác | Hủy, retry, fresh selection khi URI hết quyền |
| Detail | Badge, metadata, workflow, edit/save | Badge, metadata, workflow, edit/save |

### Quy tắc trình bày

- Create giữ ba khu vực rõ ràng: thông tin dự án, tệp phương tiện và hành động tải lên. Control có focus/touch target tối thiểu 44px; action không bị cắt ở 320–375px.
- Tên tệp dài phải wrap; thông tin loại/dung lượng không làm tràn card. Web preview dùng nhãn accessibility tiếng Việt; Mobile không thay native transport đã kiểm chứng.
- Project Detail đặt trạng thái cạnh tiêu đề, WorkflowSteps cuộn ngang trên Mobile và responsive trên Web; metadata dùng nhãn–giá trị rõ ràng. Save có disabled/loading, success/error live feedback và chống gửi trùng.
- Chỉ action phù hợp trạng thái được dùng làm CTA tiếp tục. Bước khóa vẫn là presentation, không tự gọi STT/Translation/TTS. Không hiển thị source-media playback khi API chưa hỗ trợ.

### Runtime validation gap

- Browser visual smoke: **NOT RUN**. Physical Android visual smoke: **NOT RUN**. Build/export và source tests không thay thế kiểm tra giao diện trên runtime thật.

## S25.7 — AI Workflow Screens

### Parity checklist

| Màn hình | Nội dung và action chuẩn |
|---|---|
| Bản ghi | Metadata nguồn, segment/timestamp chỉ đọc, confirmation STT, processing/error/retry |
| Bản dịch | Ngôn ngữ nguồn/đích, nội dung song song chỉ đọc, confirmation dịch, prerequisite rõ ràng |
| Giọng đọc | Catalog thật, filter/chọn/preview theo khả năng API, cấu hình đã chọn, confirmation TTS |
| Tạo thuyết minh | Tóm tắt workflow, confirmation, trạng thái tổng/stage, progress thật, failure/retry/result |
| Kết quả | Metadata hoàn thành, protected playback, Web download, Mobile native share, retry/error |

### Quy tắc trạng thái và an toàn

- Badge luôn dùng nhãn tiếng Việt chung; không hiển thị trực tiếp `SAVED`, `WAITING`, `PROCESSING`, `COMPLETED` hoặc enum kỹ thuật khác.
- Transcript/Translation không hiển thị control chỉnh sửa khi chưa có update API. Action AI chỉ chạy sau confirmation hiện có; mount/navigation không tự kích hoạt request trả phí.
- Voice preview chỉ bật khi backend cung cấp URL an toàn trong DTO. Không dựng audio/sample/preview giả.
- Progress tổng và stage chỉ hiển thị khi processing snapshot có số liệu. Không nội suy hoặc mô phỏng phần trăm trong UI.
- Protected artifact không được đưa token vào URL: Web dùng Blob URL được tải bằng Bearer; Mobile dùng file cache nội bộ cho expo-audio/expo-video/expo-sharing.

### Runtime validation gap

- Browser visual smoke: **NOT RUN**. Physical Android visual smoke: **NOT RUN**. Real paid STT/Translation/TTS: **NOT RUN**; S24.3.12.2 vẫn POSTPONED.

## S25.7.1 — Minimal Login Polish

- Customer Web Login giữ nguyên hai cột: brand navy bên trái và form sáng bên phải. Không thêm illustration, animation, gradient, Remember Me hoặc Quên mật khẩu.
- CSS polish được scope bằng `.login-page`, nên Register giữ nguyên presentation. Desktop dùng heading/line-height tiết chế và form tối đa 27rem; tablet cân lại tỷ lệ cột; dưới 720px ưu tiên form một cột; 320–375px giảm padding/radius an toàn.
- Viewport dùng `100svh` cho Login để tránh cuộn ngoài ý muốn trên trình duyệt mobile. Focus, error, hover, disabled/loading và target tối thiểu 44px tiếp tục kế thừa design system.
- Browser visual verification vẫn **NOT RUN**; source responsive rules không thay thế duyệt giao diện thật.

## S25.7.2 — Minimal Register Polish

- Customer Web Register dùng cùng brand navy, typography, visual waveform và form width với Login đã duyệt; không tạo branding hoặc illustration riêng.
- `.register-page` scope độc lập giữ Login không đổi. Form bốn trường dùng spacing 14px, heading/footer 16px và padding dọc co giãn để vừa desktop thông thường; viewport thấp giảm thêm spacing nhưng vẫn cuộn tự nhiên nếu cần.
- Dưới 720px ưu tiên form một cột; dưới 360px giảm padding/radius mà không cắt input, nút hoặc liên kết Đăng nhập. Focus/error/loading/disabled và keyboard navigation kế thừa component hiện có.
- Browser visual verification **NOT RUN**; cần người dùng duyệt tại 1440/1024/768/375/320px.

## S25.7.3 — Customer Web Dashboard

- Dashboard giữ nhận diện sáng tối giản, hero gradient và minh họa CSS hiện có; bốn lối tắt dùng đúng route thật và không tự kích hoạt tác vụ AI.
- Sidebar bỏ hoàn toàn thẻ quảng bá, giữ Tài khoản ở đáy. Recent Projects chỉ hiển thị tên, thời điểm cập nhật, ngôn ngữ nguồn, trạng thái và link chi tiết từ API.
- Biểu đồ “Số dự án theo ngày” dùng `createdAt` thật trong 7 ngày gần nhất. Khi response phân trang không chứa toàn bộ dữ liệu, UI hiển thị trạng thái chưa đủ dữ liệu thay vì nội suy; các thống kê phân loại cũng hiển thị `—` trong trường hợp này.
- Hoạt động gần đây được ghi rõ là cập nhật trạng thái dự án, không giả làm activity log. Responsive rules hỗ trợ desktop, tablet và mobile 320–375px; bảng chuyển sang layout gọn trên màn hình hẹp.
- Browser visual verification: **NOT RUN**; source responsive rules không thay thế kiểm tra trình duyệt thật.

### S25.7.3.2 — Sidebar navy

- Customer Web Sidebar dùng nền navy `#111C32`, đồng bộ cột thương hiệu Login/Register. Brand màu trắng, subtitle slate sáng và waveform nằm trong khối primary.
- Navigation giữ nguyên route và cấu trúc; hover dùng lớp trắng trong suốt, active dùng primary trong suốt với chỉ báo violet bên trái. Focus ring và touch target 44px được giữ rõ trên nền tối.
- Tài khoản tiếp tục neo ở đáy, ngăn với navigation bằng đường viền tối giản. Không thêm card quảng bá hoặc chức năng mới.
## S25.7.5 — Tạo thuyết minh Customer Web

- Header riêng `/projects/new`: tiêu đề/mô tả lớn, liên kết về danh sách và Profile hiện có; không có search hoặc tiêu đề trùng trong nội dung.
- Ba card trắng: chi tiết dự án (tên/mô tả hai cột, ngôn ngữ bên dưới), phương tiện (dropzone tím nhạt, metadata/preview thật), tải lên (heading trái/action phải). Mobile Web chuyển form/action sang một cột.
- Giữ label, lỗi gần trường, focus ring và trạng thái disabled/loading; không thêm panel mẹo. Textarea giữ giới hạn 1000 ký tự hiện có.
- Source validation PASS; browser visual/interaction smoke NOT RUN. Chờ người dùng duyệt, chưa đối chiếu ảnh minh họa cuối cùng.

## S25.7.4.6 — Project List phương án A

### S25.7.4.12.1 — Compact table polish

- Giữ Header/Sidebar/Profile, filter hai hàng và logic thật/demo. Banner demo rút gọn theo copy đã yêu cầu; badge demo có chú thích “Giả lập · Không có tệp thật”, thao tác chỉ nhãn trung tính, không workflow.
- Caption semantic giữ cho screen reader nhưng ẩn trực quan bằng CSS scoped: sửa tiêu đề trùng do lớp sr-only trước đây chưa có style. Không xóa title Header.
- Table padding 10px dọc, dòng ngắn khoảng 68px; tên tối đa hai dòng, title đầy đủ và focus mở toàn bộ tên. Ngôn ngữ dùng nhãn Tiếng Việt/Anh/Nhật/Hàn; ngôn ngữ khác Intl.DisplayNames vi hoặc fallback code, không đổi dữ liệu/API. Ngày dùng dd/MM/yyyy khi có createdAt hợp lệ.
- Pagination vẫn 10 dòng, clamp về trang có dữ liệu; summary Hiển thị x–y / tổng dự án và số trang hiện tại nền primary. Trên mobile filter xếp dọc, bảng cuộn trong vùng có focus, không cố định chiều cao nội dung dài.
- Tests/source validation PASS; browser responsive 1440/768/375, Enter/focus/interaction thực tế NOT RUN. Không thay global tokens hoặc UI màn khác; chờ duyệt.

### S25.7.4.11 — Frontend fixture mode

- Chỉ Project List: `VITE_PROJECT_LIST_DEMO=true` **và** Vite DEV; mặc định OFF. Production build không bật kể cả flag=true.
- Development terminal tại frontend-web: `$env:VITE_PROJECT_LIST_DEMO = 'true'` rồi `npm run dev`. Tắt bằng `Remove-Item Env:VITE_PROJECT_LIST_DEMO` và restart Vite. Không đổi .env/API.
- 20 fixture riêng, 4 DRAFT/3 UPLOADED/5 processing/6 COMPLETED/2 FAILED; các trạng thái chỉ mô phỏng UI, không media URL/transcript/translation/result/progress giả. Nhãn Dữ liệu demo và giải thích rõ; tên/thao tác demo không liên kết workflow.
- API loader không mount ở nhánh demo. Demo OFF giữ loader/API/error/retry hiện có. Search/date/status/sort và phân trang 10 dòng dùng cùng logic trên toàn bộ fixture, không ghi DB. Auth guard và Header/session thật không bị thay thế: vẫn cần phiên Customer hợp lệ để mở route; đây không phải chế độ offline toàn ứng dụng. Dashboard/History vẫn dùng dữ liệu thật, không nhận fixture.
- Browser visual/interaction verification NOT RUN; source tests không thay thế duyệt giao diện.

- Card lọc hai hàng desktop: tìm kiếm + thời gian; trạng thái + sắp xếp + Tìm kiếm. Gap 16px, control tối thiểu 48px; mobile xếp dọc.
- Submit bằng Enter/nút, lọc AND theo tên không phân biệt hoa/thường/dấu, trạng thái và ngày tạo local. Sáu lựa chọn thời gian, bốn kiểu sắp xếp toàn tập; không nút xóa bộ lọc.
- Bảng semantic sáu cột, liên kết dùng Project Detail/workflow hiện có, badge dictionary; màn hình hẹp cuộn trong vùng bảng có thể focus. Empty phân biệt chưa có dữ liệu và không có kết quả, không CTA.
- API chưa hỗ trợ ngày/sort: đọc toàn bộ các trang thật trước lọc/sort và phân trang client 10 dòng. Không coi 100 bản ghi đầu là toàn bộ. Dataset lớn có thể chậm; offset pagination không cung cấp snapshot khi dữ liệu thay đổi đồng thời.
- Header/Profile/Sidebar và các màn hình khác giữ nguyên. Browser visual/responsive verification NOT RUN, chờ người dùng duyệt.

## S25.7.6 — Customer Web History Professional Table

### S25.7.6.4 — Final compact polish

- Numeric pagination động: trang trước, các số trang, trang sau; current primary/white + aria-current, nhãn keyboard/focus. Tập nhiều trang giữ đầu/cuối/lân cận và dấu …; không hardcode 2 trang. Summary tổng riêng, giữ 10 bản ghi/trang/full-data filter/reset/clamp.
- Bỏ mô tả giả lập lặp từng badge; banner demo nói rõ dữ liệu mô phỏng, không có kết quả AI thật và không thực hiện nghiệp vụ. Chỉ xem demo vẫn là nhãn, không đổi fixture/flag/auth/API.
- Table padding dọc 8px, dòng ngắn 68px, giữ border/name two-line/focus disclosure; pagination flex wrap và target nút số tối thiểu 44px. Không chỉnh Header/Sidebar/bộ lọc/màn khác.
- Source validation PASS, browser 1440/768/375 và thao tác click/keyboard thực tế NOT RUN; chờ duyệt. Quy tắc này thay mô tả phụ dưới badge của S25.7.6.3.

### S25.7.6.3 — History UI and frontend demo (current behavior)

- Bảng semantic 5 cột: tên, ngôn ngữ tiếng Việt, ngày tạo createdAt dd/MM/yyyy (thiếu/invalid dùng —), trạng thái, thao tác. Không coi updatedAt là thời điểm hoàn thành. Xem chi tiết giữ route Project Detail; không thêm Xem kết quả khi chưa xác minh artifact.
- Border ngang/dọc 1px theo token #E2E8F0, header nền nhẹ, dòng ngắn khoảng 68px, tên hai dòng/title/focus mở đầy đủ. Tablet/mobile cuộn trong vùng bảng, không chuyển thành card. Header/Sidebar/Profile không đổi.
- Filter tên case-insensitive hiện có, thời gian theo createdAt local và status AND; Enter/submit reset trang 1, full API pages rồi client pagination 10 dòng; summary tổng và trang primary. Không thêm reset/CTA/stats. Tìm không dấu chưa được mở rộng ở History; giữ behavior API-mode hiện có.
- VITE_HISTORY_DEMO=true + Vite DEV, mặc định OFF/Production không bật, độc lập VITE_PROJECT_LIST_DEMO. 20 fixture tái sử dụng generator nhưng ID History riêng; ghi Giả lập, không media/result, demo action nhãn Chỉ xem demo, API list loader không mount. Vẫn cần auth/session thật, không bypass login.
- Bật trong terminal frontend-web: `$env:VITE_HISTORY_DEMO = 'true'` rồi `npm run dev`; tắt bằng `Remove-Item Env:VITE_HISTORY_DEMO` rồi restart Vite. OFF dùng nguyên API loader/route/error/retry; không DB/AI calls trong tests.
- Source tests/lint/typecheck/build PASS; browser 1440/768/375 và interaction thực tế NOT RUN. Các ghi chú 6 cột/card/mobile/giới hạn 100 ở phần lịch sử bên dưới là snapshot cũ, được thay bởi behavior này.

S25.7.6.1: bộ lọc riêng History có tên, thời gian theo `createdAt` với ranh giới ngày local, trạng thái, submit/Enter và reset. Loader riêng đọc đủ API pages trước khi lọc client-side; phân trang 10 kết quả từ tập đã lọc, không thay service chung. Responsive controls xuống hàng; ngày tùy chọn dùng native date inputs. Browser verification NOT RUN.

- Header riêng `/history` có tiêu đề lớn và mô tả, giữ Profile; không search/tiêu đề trùng hoặc CTA tạo mới.
- Bảng semantic có tên dự án, loại phương tiện (thiếu metadata hiển thị chưa có phương tiện), ngôn ngữ, thời điểm cập nhật, trạng thái chi tiết và liên kết Project Detail. Không coi thời điểm cập nhật là thời điểm tạo kết quả.
- Search/filter vẫn chạy theo logic hiện tại; tablet cuộn trong vùng bảng, dưới 600px hàng trình bày như card. Empty/loading/error tách biệt, retry và xóa bộ lọc giữ nguyên.
- History dùng project repository hiện có, không API lịch sử riêng hay pagination riêng; dữ liệu hiện bị giới hạn 100 dự án từ repository. Không hiển thị tổng hoặc phân trang giả.
- Source validation PASS; browser visual/interaction smoke NOT RUN, chờ duyệt.

## S25.7.7.1 — Customer Web Tài khoản

- Route `/settings` dùng Header lớn “Tài khoản”, subtitle “Quản lý thông tin cá nhân và phiên đăng nhập.” và Profile hiện có; không search hoặc tiêu đề lặp trong nội dung. Chỉ áp dụng thay đổi Header cho route này.
- Nội dung tối đa 960px, hai card trắng/border/shadow nhẹ: Hồ sơ cá nhân (avatar chữ đầu, họ tên/email/role thật, chỉ đọc) và Bảo mật và phiên đăng nhập (shield-check, đăng xuất). Không thêm đổi mật khẩu, 2FA hoặc chỉnh hồ sơ.
- Giữ logout confirmation/service/lock và điều hướng hiện tại. Semantic section/dl, nút 44px/focus; hai cột thông tin chuyển một cột trên màn nhỏ, email/tên dài wrap, Header cho phép xuống hàng. Không thay tokens/Sidebar/màn khác.
- Source tests 55/55 và lint/typecheck/build PASS. Browser visual, dữ liệu phiên/đăng xuất thực tế và responsive 1440/768/375 NOT RUN; chờ người dùng duyệt.

## S25.7.7.3 — Account refinement (thay thế bố cục S25.7.7.1)

- Header giữ “Tài khoản”/Profile, subtitle “Quản lý thông tin cá nhân của bạn.” Không search hoặc tiêu đề trùng.
- Một card căn giữa max-width 960px. Avatar Primary 64px và tên/email/badge vai trò theo `authService.me()`/profileIdentity; divider trước “Thông tin cá nhân”. Semantic dl với Họ và tên/Email/Vai trò, vùng nền nhạt chỉ đọc, không input giả hoặc chức năng sửa.
- Grid 2 cột desktop, 1 cột dưới 480px; summary min-width 0 và wrap tên/email dài. Giữ tokens, border/shadow nhẹ, loading/error/retry.
- Đã bỏ card Bảo mật và phiên đăng nhập và logout trong card; logout vẫn truy cập từ Profile dropdown, logic không đổi.
- Tests 55/55, lint/typecheck/build/diff check PASS. Browser responsive 1440/768/375, dữ liệu phiên và logout thực tế NOT RUN; chờ người dùng duyệt. Không commit/push.

## S25.7.7.4 — Modern Account Profile UI (snapshot trước S25.7.7.5)

- Giữ Header “Tài khoản”/subtitle/Profile, không search/tiêu đề lặp. Banner lavender gradient nhẹ token primary-light/background, radius 16px/border nhẹ/padding 32px; avatar Primary 80px cạnh tên/email/badge role từ tài khoản thật.
- Card Thông tin cá nhân riêng bên dưới, icon user outline trang trí aria-hidden, dl chỉ đọc gồm Họ và tên/Email/Vai trò. Không card Thông tin tài khoản/Bảo mật, không thống kê/CTA/sửa hồ sơ hoặc logout nội dung. Đăng xuất chỉ qua Profile dropdown hiện có, logic giữ nguyên.
- Max-width 960px/căn giữa/gap 24px; grid desktop 2 cột, dưới 480px 1 cột, banner mobile dọc, tablet/mobile giảm padding 24/20px; tên/email dài wrap. Giữ semantic color tokens, loading/error/retry.
- Tests 55/55 và lint/typecheck/build/diff check PASS; browser visual/data/logout responsive 1440/768/375 NOT RUN. Chờ người dùng duyệt; không commit/push.

## S25.7.7.5 — Account single profile card (snapshot trước Phương án B)

- Route `/settings` → SettingsPlaceholder → AccountProfile: chỉ một section/card, max-width 880px căn giữa; cover lavender 150px, avatar Primary 88px chồng ranh giới 44px, nội dung trắng với tên/email/badge role một lần. Cover không chứa identity.
- Không còn banner riêng/card con/dl/ô giống input/icon trang trí. API chỉ có tên/email/role nên không thêm divider hoặc mục Thông tin cá nhân trống. Dữ liệu lấy từ authService.me/profileIdentity hiện có; không thay API/auth/logout.
- Xóa CSS banner/fields cũ; selector mới account-profile scoped. Tablet padding 24px, mobile 20px/cover 140px, tên/email wrap. Header/Sidebar/Profile dropdown giữ nguyên, logout chỉ trong dropdown.
- Tests 57/57 PASS (có React-rendered markup assertions, không coi là DOM runtime); lint/typecheck/build/diff check PASS. Browser DOM/visual/responsive 1440/768/375 và logout thực tế NOT RUN. Chờ người dùng duyệt; không commit/push.

## S25.7.7.6 — Account Phương án B (snapshot trước compact)

- Một card max-width1000px/margin-top32px/border/radius16/shadow nhẹ/overflow hidden. Cover gradient lavender min-height300px, 2 đường cong pseudo-element opacity .08 không animation và không icon. Avatar116px viền trắng4px, tên26–30px/email16px/role badge căn giữa.
- Phần trắng padding32px, Thông tin cá nhân22px và 3 hàng Họ và tên/Email/Vai trò, semantic dl không input/icon. Hàng min-height60px/nền background/radius12/gap12, label trái/value phải. Lặp ba giá trị giữa cover và rows là yêu cầu Phương án B, thay quy tắc S25.7.7.5.
- Tablet padding24px; mobile cover min-height270px/avatar92px/padding20px, hàng label trên/value dưới. Min-height cho phép nội dung dài tăng chiều cao; wrap tên/email. Route `/settings` vẫn SettingsPlaceholder/AccountProfile, Header/Sidebar và logout qua dropdown không đổi.
- Tests57/57/lint/typecheck/build/diff check PASS. Browser visual/1440/768/375 và logout thực tế NOT RUN; chưa đối chiếu ảnh minh họa trực tiếp. Chờ duyệt, không commit/push.

### S25.7.7.7 — Account layout correction

- Sóng bị clip ngay cover bằng overflow hidden, không vượt sang phần trắng; nội dung/avatar layer1/flex-shrink0 trong normal flow, không margin âm. Theo UI UX Pro Max giữ containment/layering và tránh cắt nội dung dài bằng min-height.
- Card margin desktop0 vì main có padding-top24px; mobile dưới480 margin8+main padding16=24px. Header chung không sửa. Ba hàng vẫn grid/align center/min-height60/padding ngang24; mobile stacked labels, tên/email wrap.
- Tests58/58/lint/typecheck/build/diff check PASS. Browser avatar/Header/clip/responsive1440/768/375/logout NOT RUN; source checks không chứng minh runtime PASS. Không commit/push; chờ duyệt.

## S25.7.7.8 — Account compact (bố cục hiện tại)

- Một card trắng max-width840px/padding32px/border/radius16/shadow nhẹ; bỏ hoàn toàn cover/gradient/sóng/pseudo-elements/chiều cao cover. Summary avatar80px bên trái + tên/email/badge thật bên phải gap24px, không center toàn card.
- Divider nhẹ, Thông tin cá nhân và semantic dl grid2 cột desktop/1 mobile. Label trên, giá trị ngay dưới gap6px; field gap20px/nền background/padding16px, không input/icon hoặc value căn mép phải.
- Tablet card padding24px/mobile20px; summary wrap khi thiếu chỗ, tên/email overflow-wrap:anywhere. Giữ Header/Sidebar/auth/load/retry/logout dropdown. Card offset dùng main padding24px; mobile16+margin8px.
- Tests58/58/lint/typecheck/build/diff check PASS; browser1440/768/375/dữ liệu phiên/logout NOT RUN. Chờ người dùng duyệt, không commit/push.
