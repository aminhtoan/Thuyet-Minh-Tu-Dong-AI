# UI Specification

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
