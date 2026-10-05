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
