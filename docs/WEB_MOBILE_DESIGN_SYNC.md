# Đồng bộ thiết kế Customer Web / Mobile — S29.1

## Nguồn cấu hình và phạm vi

`design/customer/tokens.json` là nguồn duy nhất cho palette, semantic colors,
spacing, radius, cỡ/weight chữ, font, brand và tiêu chuẩn component/feedback.
`scripts/customer-design-sync.mjs` sinh adapter trong từng app, không thêm package:

- Web: `src/styles/customer-tokens.generated.css` và `src/design/customer.generated.ts`.
- Mobile: `src/theme/tokens.ts` (giữ export cũ để các consumer không đổi contract).

Không sửa các adapter bằng tay. Từ root chạy:

```powershell
node scripts/customer-design-sync.mjs --write
node scripts/customer-design-sync.mjs
```

Check mặc định chỉ đọc, lỗi nếu thiếu/lệch adapter, chấp nhận LF/CRLF. Cả hai test
suite đều kiểm tra đồng bộ; pretypecheck hai app và prebuild Web cũng chặn drift.
Không tự regenerate trong build để tránh che mất thay đổi chưa được review.
`npm run design:sync` / `npm run design:check` có trong cả hai app.

Web chỉ override biến trong `.app-shell`, `.login-page`, `.register-page`,
`.auth-layout`. Không đổi `tokens.css` gốc hoặc theme Public Museum. CSS vẫn dùng
rem, fallback font và focus/hover. Mobile nhận numeric tokens, native shadows và
elevation; không import CSS/JSON từ ngoài project root vào runtime Metro.

Các giá trị hiện tại được bảo toàn, gồm nền header/sidebar Mobile sáng. Navy có
token riêng; không ép giao diện Mobile thành sidebar desktop. Shadow Web và Native,
full radius và line-height có override rõ ràng trong cấu hình.

## Font và thương hiệu

- Be Vietnam Pro regular/semibold/bold Mobile sao chép từ tài nguyên Web hiện có,
  giữ OFL; test so hash cả font và giấy phép. Không tải font qua mạng.
- Expo57 `useFonts` nạp asset local; có trạng thái chờ và thoát chờ khi lỗi font.
  Không sửa AuthBoundary/Stack/guard. Nguồn:
  [Expo57 font](https://docs.expo.dev/versions/v57.0.0/sdk/font/).
- Button/Input dùng native font family phù hợp. Các Text cũ khác vẫn cần migration
  theo từng component/màn hình; không tuyên bố toàn bộ Mobile đã chuyển font.
- Brand chung đã nối Sidebar/Topbar Web và AuthLayout/MobileHeader Mobile, icon
  bảo tàng tương ứng SVG Web / bank-outline native. Login/Register Web hiện còn
  literal cùng giá trị brand; khi thay tên phải migrate hoặc kiểm tra hai trang này.
- Icon implementation riêng: SVG/Icon Web, MaterialCommunityIcons Mobile. Chia sẻ
  ý nghĩa, size role và accessible label, không chia sẻ JSX/icon library.

## Bảng đối chiếu màn hình thực tế

File máy đọc: `design/customer/screens.json`; test kiểm tra mọi file tồn tại.
Đường dẫn Mobile dưới `frontend-mobile/src/app`, không tạo route mới.

| Web | Mobile | Đối chiếu khi thay đổi |
|---|---|---|
| `/login` LoginPlaceholder | `login.tsx` → LoginForm | Form/validation/focus, bố cục riêng |
| `/register` RegisterPlaceholder | `register.tsx` → RegisterForm | Trường/lỗi/loading, bố cục riêng |
| `/dashboard` DashboardPlaceholder | `(tabs)/dashboard.tsx` → DashboardScreen | Dữ liệu/empty/error; layout riêng |
| `/projects` ProjectsPlaceholder | `(tabs)/projects.tsx` → ProjectsScreen | Bảng Web / danh sách Mobile |
| `/projects/new` NewProjectPlaceholder | `projects/new.tsx` → NewProjectScreen | Form/upload states; picker native riêng |
| `/projects/:id` ProjectDetailPage | `projects/[projectId]/index.tsx` → ProjectDetailScreen | Metadata/save/delete; không ép hai cột |
| `.../transcript` TranscriptPage | `projects/[projectId]/transcript.tsx` → TranscriptScreen | PARTIAL: kiểm tra editing/player capability riêng |
| `.../translation` TranslationPage | `projects/[projectId]/translation.tsx` → TranslationScreen | PARTIAL: Web có group/Customer attempt UI, Mobile dùng editor riêng; không giả định parity |
| `.../voice` VoicePage | `projects/[projectId]/voice.tsx` → VoiceScreen | Lựa chọn voice, loading/error, quyền chuyển bước |
| `.../generate` GeneratePage | `projects/[projectId]/generate.tsx` → GenerateScreen | Tiến trình/guard/cảnh báo chi phí |
| `.../result` ResultPage | `projects/[projectId]/result.tsx` → ResultScreen | Media thực, khả dụng/download/share riêng |
| `/history` HistoryPlaceholder — Thư viện | `(tabs)/history.tsx` → HistoryScreen — Lịch sử | PARTIAL: Mobile còn project history, không đổi nhãn thành thư viện sản phẩm |

Profile: Web `/settings` và Mobile `(tabs)/account.tsx`; Mobile settings alias vẫn
giữ nguyên. Không đổi routes, tab hay API để đạt đối chiếu.

## Component và phản hồi

| Cặp component | Quy tắc chung | Riêng nền tảng |
|---|---|---|
| Button | Primary/secondary/ghost/danger; disabled khi loading; không submit trùng; min touch44 | focus-visible/hover Web; pressed/accessibilityState Native |
| Input | label thật, error/helper liên kết, focus rõ, nội dung nhập không bị mất; min46 | DOM aria vs native label/hint, keyboard/picker riêng |
| Card | surface/border/radius token, tự cao theo nội dung | CSS shadow vs shadow/elevation, padding theo màn hình |
| Badge | success xanh, warning/UNCERTAIN vàng, error đỏ, processing xanh; luôn có text | Không biến badge thành action |
| Spinner/EmptyState/ErrorState | Loading không phải empty; lỗi không phải không dữ liệu; success phải được server xác nhận | aria-live/alert vs native announcement; copy theo tác vụ |

`componentRules` và `feedbackRules` là tiêu chuẩn export, không tự suy diễn trạng
thái Backend hoặc thay thông báo an toàn. Chưa refactor tất cả primitive để dùng
mọi rule field; test và checklist kiểm tra consumer tương ứng. Không thay message
UNCERTAIN thành success, không cung cấp retry/model-switch/claim-reset.

## Quy trình bắt buộc cho Codex / người sửa UI

1. Đọc diff hiện có, tài liệu này và AGENTS của app; xác định màn hình/component
   đối ứng trong manifest. Không sửa màn hình chưa liên quan.
2. Phân loại shared-token / component parity / layout-only / capability gap.
3. Token chung: sửa JSON, generate cả hai adapter, review diff cả hai app.
   Layout-only: giữ layout platform kia, nhưng kiểm tra states, copy, focus/touch.
4. Nếu không có capability tương ứng, ghi PARTIAL/MISSING và lý do; không tạo API,
   route, dữ liệu hay tính năng để che khoảng cách. Bản dịch Mobile là trường hợp
   cần đặc biệt kiểm tra, không coi token parity là generation parity.
5. Thêm test của cặp component; chạy Web tests/lint/typecheck/build và Mobile
   tests/lint/typecheck. Export offline kiểm tra Metro/assets khi đổi font/import.
6. Visual: Web375/768/1024/1280/1440, zoom200%, keyboard; Mobile Android/iOS,
   font scaling, screen reader, keyboard và safe area. Không có thiết bị/browser:
   ghi NOT VERIFIED, không tự PASS.
7. Báo cáo nền tảng đối ứng đã kiểm tra, các khác biệt có chủ ý và phần chưa xác minh.
   Cập nhật UI.md/PROGRESS.md. Không gọi AI/DB để kiểm thử thiết kế.

## Validation không gọi API

```powershell
# từ mỗi app (test runner không cần sandbox subprocess isolation)
node --test --experimental-test-isolation=none tests/*.test.mjs
npm run lint
npm run typecheck
# Web
npm run build
# Mobile: export chỉ bundle, không start app/không login; tắt dotenv/telemetry/network
$env:EXPO_NO_DOTENV='1'; $env:EXPO_OFFLINE='1'; $env:EXPO_NO_TELEMETRY='1'
node node_modules/expo/bin/cli export --platform android --output-dir dist-s291-validation
```

Không bật feature flags, không sửa session/attempt, không dùng dữ liệu giả. Expo
export chỉ xác minh bundling; không thay thế nghiệm thu native trên thiết bị.
