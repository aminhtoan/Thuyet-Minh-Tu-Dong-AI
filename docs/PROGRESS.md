# Project Progress

## S37.4C — Backend CI GROUP_TRANSLATION_DISABLED (2026-11-08)

- Branch ci/first-run, baseline22e6ca5. Run #2: Backend87/88, other three apps
  PASS per user. Locally reproduced exact failure with legacy group flag false.
- Root cause: final test approval lacked Customer AsyncLocalStorage scope;
  local dotenv-loaded GROUP_TRANSLATION_ENABLED=true hid the missing scope.
  Pin legacy flag false in test setup, wrap final approval consistently with
  controller, and assert unscoped approval remains denied with no extra write.
- Only backend/tests/customer-multilang.test.ts and progress/CI documentation
  changed. Production guard, workflow, runner and other apps unchanged.
- Node22.23.3: four-file mock runner88/88 PASS with inherited flag false/true;
  isolated multilingual file without .env27/27 PASS; Backend lint/typecheck/build
  PASS. Existing network guard active. READY for run #3; hosted result pending.
- No Atlas access, real Gemini, .env edits, commit/push/merge or deployment.

## Current context — S37.4A / CI V1 (2026-11-08)

- User explicitly abandoned S34/S35 testing. Do not resume, restore or integrate
  that source, or use its old approvals/expiry/progress to guide current work.
- Project restored to collaborator main e10cae0, followed by Admin/Mobile fixes
  in c9c2050. Current work is CI V1 on ci/first-run at e0d1a35.
- First GitHub run: https://github.com/vuvantai14/multilingual-ai-narration/actions/runs/24241122537
  Backend/Customer Web failed; Admin/Mobile passed. Preserve Admin/Mobile.
- S37.4A fixes Backend typing/parser failures and outdated Customer Web test
  assertions. See .github/ci/README.md for validation and test scope.
- Local Node22.23.3: Backend/Web lint, typecheck and build PASS; Backend CI
  allowlist88/88, additional mocked STT33/33, Web selected suite455/455 and
  network guard self-test PASS. Existing one missing-video exclusion retained;
  no additional skips. Web has five existing lint warnings and bundle warnings.
- Shared MongoDB Atlas and real Gemini calls are out of scope. No commit,
  push or merge without explicit user approval. GitHub-hosted rerun pending.

## Mobile — Nullable source-language crash fix (2026-11-08)

- Reproduced ProjectCard `toUpperCase` and My Projects `toLowerCase` crashes
  with null AUTO source fixtures. Updated Project/DTO types and guarded source
  labels across project cards, lists, transcript, translation and result metadata.
- Added `frontend-mobile/tests/project-source-language.test.mjs`: nullable
  data, actual ProjectCard labels, Web parity, GET-only repository preservation
  and result metadata. Mobile focused tests 48/48; related Web tests 24/24 PASS.
- Mobile/Web typecheck and design checks PASS; Web build PASS. Mobile lint:
  0 errors, 1 existing warning; Web lint: 0 errors, 5 existing warnings.
- No environment, Backend, Atlas or AI changes. Existing Admin fixes preserved.
  No Metro restart or device acceptance performed; reload Android to verify.

## S32 — Current progress entrypoint

For S32 Multilingual, use [the scoped progress ledger](../.agents/skills/multilang-progress/PROGRESS.md)
and [project skill](../.agents/skills/multilang-progress/SKILL.md). This file retains the wider project history;
S32 phase status, decisions and handoffs are maintained in that skill folder to avoid duplicate ledgers.

## S30 — Listen Analytics: Detailed MP3 & Language Breakdown (2026-10-25): FULL

- Backend Aggregation: Added `getListenBreakdown()` in [backend/src/services/analytics.service.ts](file:///o:/multilingual-ai-narration/backend/src/services/analytics.service.ts) aggregating Top 5 MP3 narrations (`topAudios`) and Top 5 languages (`topLanguages`) via MongoDB aggregation pipelines (`$group`, `$sort`, `$limit`) with localized names and country flags.
- Admin API Integration: Integrated `listenAnalytics` into `GET /api/admin/dashboard` in [backend/src/services/admin.service.ts](file:///o:/multilingual-ai-narration/backend/src/services/admin.service.ts) and `GET /api/analytics/listen-stats` in [backend/src/controllers/analytics.controller.ts](file:///o:/multilingual-ai-narration/backend/src/controllers/analytics.controller.ts).
- Admin Web UI:
  - Added [admin-web/src/components/dashboard/TopAudiosCard.tsx](file:///o:/multilingual-ai-narration/admin-web/src/components/dashboard/TopAudiosCard.tsx) displaying ranked Top 5 MP3 narrations with rank badge, title, language flag/tag, total listens, and web/mobile distribution.
  - Added [admin-web/src/components/dashboard/LanguageDistributionCard.tsx](file:///o:/multilingual-ai-narration/admin-web/src/components/dashboard/LanguageDistributionCard.tsx) displaying Top 5 languages with flag, percentage distribution progress bar, listen counts, and platform breakdown.
  - Mounted cards in [admin-web/src/pages/AdminDashboardPage.tsx](file:///o:/multilingual-ai-narration/admin-web/src/pages/AdminDashboardPage.tsx) ensuring "Hoạt động gần đây" stays at the very bottom, with silent 5s background polling in [admin-web/src/hooks/useAdminDashboard.ts](file:///o:/multilingual-ai-narration/admin-web/src/hooks/useAdminDashboard.ts).
- Mobile & Dev Connectivity:
  - Configured dev CORS in [backend/src/app.ts](file:///o:/multilingual-ai-narration/backend/src/app.ts) to permit all ngrok tunnel domains (including `.ngrok-free.dev`) and LAN IPs.
  - Improved [frontend-mobile/src/features/museum/MuseumScreens.tsx](file:///o:/multilingual-ai-narration/frontend-mobile/src/features/museum/MuseumScreens.tsx) with immediate stream readiness and direct user-gesture audio playback/tracking, resolving mobile browser autoplay blocking.
- Public Vietnamese Audio: Ensured Tiếng Việt (🇻🇳) is always present as the first/default language option across all published audio guide cards, streaming original source media via `GET /api/projects/public-audio/:id/source` and recording listen analytics under `languageCode: 'vi'`.
- Verification & Testing:
  - Admin Web: 16/16 tests PASS (`npm test`), `tsc --noEmit` PASS, `oxlint` PASS (0 errors, 0 warnings).
  - Backend: `node --import tsx --test tests/analytics.test.ts` (5/5 PASS), `tsc --noEmit` PASS, `eslint` PASS.
  - Frontend Web: 47/47 tests PASS (`tests/analytics-listen.test.mjs`, `tests/museum-routing.test.mjs`).
  - Frontend Mobile: 207/207 tests PASS (`npm test`), `tsc --noEmit` PASS.


- Root cause CONFIRMED: installed SDK58 converts Tabs.Screen href:null to hidden;
  its useVisibleTabsWithRedirect then replaces focused Account with Dashboard.
  Tested actual installed SDK processing/redirect with isolated navigator fixtures.
  Removed hidden flag only from Account; custom bar continues to expose four main
  entries. Existing `/account` screen/URL reused, no duplicate or new tab button.
- Profile GET now bounded15s, abortable and ends loading on success/error/timeout.
  Existing session identity/sequence guards suppress old profiles and late replies.
  Logout revoke is bounded15s with no retry; existing local token/cache cleanup
  preserved; Account sends guest to Login so normal login can be performed again.
- Pixel7 live: avatar from Dashboard opened Account after fix; actual profile and
  logout button displayed, loading finished. Back returned to Dashboard. Existing
  authenticated session preserved. No real logout/login automated. Metro running;
  bounded ReactNativeJS log scan found no matching exception categories, not proof
  of global log absence. Exact360/393dp and real logout/login MANUAL PENDING.
- Validation: Mobile206/206 tests PASS (0 skip), TypeScript/ESLint PASS, Android
  Metro/Hermes export PASS, token/Museum sync and diff-check PASS. New tests cover
  installed SDK redirect reproduction/fix, hung profile timeout/error/manual GET
  retry, late-reply isolation and logout timeout cleanup. No real test accounts/DB.
- Files: `(tabs)/_layout.tsx`, features/auth/useCurrentUser.ts, authService.ts,
  AccountScreen.tsx; header-account-navigation/customer-navigation-parity,
  navigation-interaction/dashboard-ui-polish tests; UI/PROGRESS docs. Existing
  Header `/account` destination, protected guards, four main tabs preserved.
- Safety: no Customer Web/Admin/Backend/Public Museum/config/database/AI changes,
  no Gemini/TTS/render, no UNCERTAIN action, no commit/push. No next step started.

## S29.4F — Customer Mobile Header Navigation Fix (2026-10-24): PARTIAL

- Implemented: shared icon/brand touch region→existing Public Museum `/`, avatar
  →existing `/account` or guest `/login`, current CUSTOMER initial,48dp targets,
  duplicate navigation protection and existing back behavior. Explicit user home
  destination takes precedence over audited Web Sidebar `/dashboard`; no Web edit.
- Account/Header share session-scoped authenticated useCurrentUser; late GETs and
  old account data cannot overwrite the current profile. Kept real name/email,
  errors/retry and original logout confirmation, added duplicate-submit lock.
- Reused authService/SecureStore session cleanup and protected-route redirect;
  cleared project cache on logout/new login and guarded pending cache responses
  by epoch. No new authentication provider, Backend API or workflow route added.
- Files: MobileHeader.tsx, AccountScreen.tsx, authService.ts,
  features/projects/projectRepository.ts; new features/auth/useCurrentUser.ts and
  tests/header-account-navigation.test.mjs; updated navigation/Dashboard mocks;
  UI/PROGRESS docs. Prior S29.4D working-tree changes retained.
- Tested: Mobile203/203 PASS (8 new tests), navigation/authentication regressions,
  TypeScript/ESLint (no warnings), Android Metro/Hermes, shared-token/Museum sync,
  diff-check PASS. Final focused8 tests rerun after hook dependency cleanup.
- Logout/login only mocked, with real session/authService compiled against isolated
  SecureStore/fetch fixtures: tokens removed, private guards disabled, account B
  restored correctly, offline server logout still clears local session. Project
  cache delayed-response race tested. No real session logged out or credential read.
- Manual QA pending: Pixel7 exact360/393dp, logo/home, avatar/account/back and
  user-driven logout/login acceptance. Emulator capture did not reliably show app;
  no click into that capture. Do not interpret mock/layout success as visual PASS.
- Safety: no Web/Backend/Public Museum UI/config/database edits or writes, no AI/
  TTS/render, no attempt reset/retry, no commit/push. No next-step work.

## S29.4D — Customer Mobile Result Screen Web Parity (2026-10-24): PARTIAL

- Audited actual Web ResultPage/useResult/resultService/resultUtils, RESULT guard,
  language rules, authenticated media and Backend artifact DTO paths. Confirmed
  original Mobile blocked noncatalog results via isLanguageCode and fetched
  artifacts before project/workflow checks. Result had no matching Web guard,
  eager cache download and an unsafe out-of-scope processing CTA when empty.
- Implemented fresh authenticated project-first result load and equivalent RESULT
  guard, normalized confirmed language independent of the unchanged AI catalog,
  identity/path validation, in-memory authenticated streaming, safe player states,
  blur/session cleanup, manual save/cache cleanup and project/library navigation.
  Metadata and summary now follow actual Web section order with Customer tokens.
- New: features/results/resultAccess.ts, resultMedia.ts, ResultPlayer.tsx and
  tests/result-parity.test.mjs. Modified ResultScreen.tsx, useResult.ts,
  resultService.ts, resultUtils.ts; updated ai-workflow-ui/sdk58-migration tests
  for extracted players. UI/PROGRESS docs updated. S29.4C library retained.
- Automated validation: Mobile195/195 PASS, Web400/400 PASS,0 skipped;15 new RESULT
  tests. Mobile TypeScript/ESLint, Android Metro/Hermes PASS; shared token/Museum
  synchronization and diff-check PASS. No live API/media fixture or real database
  used by tests. Hermes export needed approved sandbox escalation for compiler.
- Manual QA pending: Pixel7 exact360/393dp, real eligible audio/video range stream,
  codecs/loading/seek/pause/fullscreen, native save filename/location, safe area and
  back navigation. No real result opened/created in this step. Native export sheet
  is the platform download equivalent, not guaranteed automatic filesystem save.
- No Web/Backend/Public Museum/Login/Register/authentication/workflow AI/config or
  catalog changes; no MongoDB writes, Gemini/TTS/render/jobs, old-attempt reset or
  retry, commit/push. No S29.5 work started.

## S29.4 — Customer Mobile My Projects (2026-10-24, PARTIAL)

- Audited actual Web ProjectsPlaceholder/Topbar, useCompleteHistory,
  historyFilters/projectListFilters/projectListPresentation, projectDataState,
  repository/actions/route guard; Mobile ProjectsScreen/useProjectPage/cards and
  protected routes. Published pre-edit gap table; full audit in UI.md.
- Web confirmed: complete account reads via page100; client search (Vietnamese
  accent-insensitive), status+local createdAt time filters, four sorts, pages10.
  Name link→details; one workflow action. No progress/update column or inline
  edit/delete. No demo behavior ported to Mobile.
- Implemented complete bounded acquisition, native draft/apply/reset filters,
  same selectors/sort/tie-break/page rules, real-data cards and metadata feedback.
  Cap100 pages/10,000 projects fails closed rather than truncating; changing totals,
  duplicate IDs and incomplete pages rejected. Existing list JWT client/ownership
  API unchanged. Stale reads cancelled through metadata GET signals.
- Projects continuation reuses S29.3.3 protected GET/resume/attempt checks and labels
  from verified workflow; no AI dispatch. DashboardResumeButton optional label keeps
  Dashboard default behavior. New card variant does not alter shared ProjectCard.
  Existing vi→en attempt endpoint and Mobile target-language/editor limitations
  remain; unsupported cases block safely. No new Backend endpoint/workflow.
- Files created: ProjectListCard.tsx, ProjectListFilters.tsx, projectListModel.ts,
  projectListData.ts, useCompleteProjectList.ts, my-projects-parity.test.mjs.
  Updated ProjectsScreen.tsx, DashboardResumeButton.tsx (label only), types.ts,
  projectRepository.ts (metadata/cancellation), sdk58-migration.test.mjs (multiline
  optional-footer source assertion), UI.md/PROGRESS.md. No dependency/token/env edits.
- Tests: Mobile158/158, Web400/400 PASS, zero skipped; both lint/TypeScript PASS;
  Android Metro/Hermes offline export PASS; Web build PASS after sandbox EPERM
  escalation, existing mixed-import advisory only. Token/Museum hash sync and
  diff-check PASS. New tests cover multipage scope, caps/duplicates/data drift,
  actual Web filter/sort/pagination/language comparisons, draft/reset/errors,
  401 handling, title route, metadata, stale-reply cancellation, native layout
  and Dashboard-safe reuse (17 new My Projects tests).
- Pixel7 live: actual list/cards, first/last page, pagination1/2→2/2, bottom
  clearance, filter disclosure and four sorts observed. No workflow/mutation
  buttons clicked. Exact360/393dp, accessibility/font scaling, all filter cases,
  detail/resume and real empty/error acceptance remain MANUAL PENDING. PARTIAL;
  prior Dashboard manual acceptance statuses are preserved, not marked complete.
- Safety: no Web/Backend/Admin/Public Museum/Login/Register/auth/config edits,
  no MongoDB writes or Gemini/TTS calls, no attempt reset/retry, commit/push.
  Stopped at S29.4; no S29.5 work.

## S29.3.3B — Dashboard time filter (2026-10-24, PARTIAL)

- Audited Web/Mobile metrics, filters, chart, dataset, repository and loading hook.
  Month means one bucket per local calendar day, using createdAt, not updatedAt.
  There is no end-of-day midnight cutoff; month1–12 converts once to index0–11.
  Missing/duplicate account data suppresses charts rather than producing totals.
- Pixel7 live: October2026 early visible days were zero; horizontal swipe revealed
  positive bars for dates17/18/19/21. The apparent all-zero result was the viewport,
  not missing monthly data. Counting formula and approved chart UI unchanged.
- Separate confirmed filter defect fixed: valid date/month/year edits now keep
  the draft anchor synchronized across mode changes before Apply, with Web-like
  month-end clamping. Invalid text is retained for validation. No request added.
- Changed DashboardTimeFilter.tsx, dashboard-charts.test.mjs,
  dashboard-functional-parity.test.mjs, UI.md/PROGRESS.md. Preserved prior changes.
- Mobile141/141 PASS, TypeScript/ESLint PASS, Android Metro/Hermes offline PASS,
  token/Museum hash synchronization and diff-check PASS. Added tests against Web
  for first/last day, outside month, leap day, Dec/Jan, UTC/Vietnam/LosAngeles,
  empty data, unique date buckets and draft mode-switch/apply/reset. Windows
  timezone fixture restores Date cache after each comparison.
- Monthly-data visibility verified on Pixel7; full post-fix filter acceptance
  remains MANUAL PENDING. Overall PARTIAL. No Web/Backend/config/auth/workflow
  edits, AI calls, MongoDB writes, attempt reset/retry, commit or push.

## S29.3.3 — Customer Mobile Dashboard Functional Parity (2026-10-24, PARTIAL)

- Audited actual Web DashboardPlaceholder, projectRepository/useProjects,
  dashboardMetrics, projectUtils, projectAction/workflowRouteGuard/dashboardResume;
  checked current Backend list bounds, owned project workflow and Customer attempt
  GET. No runtime/API/database operations used for audit or tests.
- Dataset parity: isolated Dashboard hook reads one page100, same as Web. Verified
  total/unique IDs required before both charts can claim account statistics.
  Accounts over100 or missing pagination show incomplete feedback; no unbounded
  reads/aggregation. Refresh on Dashboard focus; safe read retry on load error.
- Added day/month/year native filter with draft/applied/reset semantics. Local
  createdAt calendar, month-end clamp, leap-year coverage, bar-only changes;
  unchanged donut/recents/activity. Scrollable month/year chart labels stay inside
  card. S29.3.2 render order/no KPI/four Customer tabs preserved.
- Continue: fresh owned project GET, validated existing workflow route, target
  language and result artifact; eight-second timeout, abort-on-unmount, duplicate
  lock, visible safe errors. Extra existing vi→en attempt GET blocks UNCERTAIN and
  other unsafe states. No processing POST, refresh, automatic retry or AI call.
  Missing/disabled attempt endpoint or unsupported Mobile target language blocks
  safely; existing Customer draft review editor parity remains out of scope.
- Files this step: DashboardScreen; ProjectCard (Dashboard action only); project
  types; DashboardCharts/dashboardChartMetrics; new dashboardData,
  useDashboardProjects, dashboardResume, DashboardResumeButton,
  DashboardTimeFilter; three existing Dashboard tests and new
  dashboard-functional-parity.test.mjs; UI.md/PROGRESS.md. Existing S29.2/S29.3.2
  dirty changes preserved; no dependencies/config/tokens modified this step.
- Final validation: Mobile136/136, Web400/400 PASS, zero skipped; both lint and
  TypeScript PASS; Web build PASS with existing mixed-import advisory; Android
  Metro/Hermes offline export PASS (initial sandbox Hermes spawn EPERM; approved
  export-only escalation); design-token and Museum data/image hash sync PASS;
  git diff --check PASS. Web source-check expected local useProjects name; retained
  that local name via explicit Dashboard-hook import alias without editing Web.
- MANUAL PENDING: Pixel7 360/393dp, screen-reader/font scaling/filter keyboard,
  chart scrolling, navigation/focus/safe area and actual authenticated Backend
  responses. Functional account-wide statistics above100 remain unavailable in
  both current Web and Mobile. Not claiming COMPLETE or full translation parity.
- Safety: no Web/Backend/Public Museum/Login/Register/Customer tabs edits this
  step; no live MongoDB access/writes, Gemini/TTS calls, attempt resets/retries,
  environment changes, commit or push. Stopped at S29.3.3.

## S29.3.2 — Customer Mobile Dashboard Web Parity (2026-10-24, PARTIAL)

- Audited actual Web render/source/selectors before editing. Confirmed no KPI
  cluster. Reference order: Hero/create ->4 quick links -> successful charts ->
  recent projects -> recent activity (or existing loading/error feedback).
- Removed Mobile Dashboard's KPI import/render only, retained StatCard/statistics
  selectors. Matched four quick links/copy/routes and ordering, used Web's same
  real local Hero image/copy, increased recent display limit4->5, added matching
  status-derived activity up to4 items with empty state and existing/history link.
  Optional MobileScreen.headerContent avoids duplicate intro; other screens unchanged.
- Changed this step: DashboardScreen.tsx, new DashboardHero.tsx, MobileScreen.tsx,
  dashboard-ui-polish.test.mjs, dashboard-project-list-ui.test.mjs, UI.md/PROGRESS.md.
  Preserved all pre-existing S29 changes including Public navigation and chart
  dependency, and kept Customer four-tab layout untouched. No new dependencies.
- Validation executed: Mobile121/121, Web400/400, both lint/typecheck, Web build,
  token synchronization, Museum image/content hashes, Android Metro/Hermes and
  diff-check PASS. Export ignored .expo/validation/s2932-android (1456 modules/37
  assets). Web retains pre-existing ineffective-dynamic-import warning.
- NOT acceptance-complete: first20/unknown completeness vs Web full-account data;
  missing metadata flags, chart month/year controls, interactive donut, and Web's
  guarded single resume action. Existing Mobile project actions/media/progress
  retained to avoid workflow changes; Mobile history is not the Web library.
  Full before/after comparison and gaps documented in UI.md. No fake parity claim.
- Visual QA Pixel7/360/393dp MANUAL PENDING: no emulator observation this step.
  Need inspect section order/no KPIs, real-data cards/chart legends, scrolling to
  activity end, text scaling and native safe areas. Do not close S29.3.2 as fully
  complete until visual acceptance and remaining functional differences are resolved.
- No Web/Backend/Admin/Public/Login/Register modifications, API changes, credentials
  or env edits, database access/writes, Gemini/TTS/video processing, attempt changes,
  runtime restart, commit or push.

## S29.3.1 — Customer Mobile Dashboard charts (2026-10-24)

- Added DashboardCharts.tsx and dashboardChartMetrics.ts; DashboardScreen renders
  the two stacked chart cards only after successful loading, keeping KPI2x2 and
  all existing quick/recent/navigation UI. Uses existing projects/selector; no
  additional request, repository, API or workflow changes.
- Ported Web's default local-calendar7-day grouping, integer scale, one-decimal
  status percentages and donut arc geometry. Regression compares Web outputs
  directly. COMPLETED remains a status, never inferred from progress100. Missing
  createdAt is reported/excluded rather than fabricated from updatedAt.
- Explicit scope on each card: loaded projects, not whole account (existing first20
  repository limit and lack of completeness metadata retained). Mobile intentionally
  supports default7-day chart only, not Web's month/year filter/hover controls.
- Installed only direct dependency react-native-svg15.16.0 using Expo SDK58 install;
  package.json/lockfile changed (+13 transitive packages per npm), no native folders
  or config edits. Expo docs/bundledNativeModules confirm Expo Go support. Native
  Views render bars; SVG Circle/G primitives render donut. Shared fonts/tokens.
- Mobile118/118 PASS, including new chart7/7 and retained Dashboard9/9; ESLint,
  TypeScript, token sync, Museum hashes and diff-check PASS. Offline Android
  Metro/Hermes PASS (1456 modules/37 assets), ignored .expo/validation/s2931-android.
  Web400/400, lint/typecheck/build PASS without Web edits; existing build warning.
  npm reports5 high vulnerabilities; no security audit/remediation or broad upgrades
  attempted. Pixel7/360/393dp, font scaling/TalkBack/native SVG visual QA pending.
- Files: DashboardCharts.tsx, dashboardChartMetrics.ts, DashboardScreen.tsx,
  dashboard-charts.test.mjs, dashboard-ui-polish.test.mjs, Mobile package/lockfile,
  docs/UI.md and PROGRESS.md. All pre-existing changes preserved. No runtime
  restart, credentials/config edits, Gemini/TTS, database access/writes, attempt
  operations, commit or push.

## S29.3 — Customer Mobile Dashboard UI refinement (2026-10-24)

- Audited existing Mobile Dashboard against Customer Web and shared design rules.
  Added scoped Dashboard header/scroll styles; clear full-width48dp create CTA,
  explicit2x2 KPI rows, shared fonts/semantic accents and compact quick actions.
  Dashboard-only project card variant keeps two-line names, bounded status,
  readable progress and stacked48dp wrapped actions. Other cards retain defaults.
- Shared Badge/ProgressBar gain optional text styling only; status mapping,
  progress normalization, projectAction, data fetching/auth/business logic unchanged.
  Regression covers TRANSLATING at100% still not completed, actual navigation
  targets, loading/error/empty, KPI rows, badge colors and four Customer tabs.
- Customer bottom navigator retains four routes/native safe-area ownership;
  equal-flex items, Be Vietnam Pro labels and explicit below-icon positioning.
  No Public Museum/Login/Register changes or cross-area navigation coupling.
- Mobile111/111 (Dashboard9/9), TypeScript, ESLint and offline Android Metro/Hermes
  PASS (1341 modules/37 assets); artifact .expo/validation/s293-android ignored.
  Shared token sync/Museum hashes/diff-check PASS. Web400/400, lint/typecheck/build
  PASS; existing ineffective-dynamic-import build warning remains, no Web edits.
- Capability limit preserved: repository currently loads first20 projects;
  Mobile KPIs use loaded records, not a new global statistics API. Pixel7/iOS,
  small phones, enlarged fonts, scrolling/footer and native safe areas remain
  Visual QA MANUAL PENDING; no claim of live-data/device validation.
- Source changes: DashboardScreen, StatCard, ProjectCard, ProjectStatusBadge,
  MobileHeader, MobileScreen, Badge, ProgressBar, Customer tabs/_layout and new
  dashboard-ui-polish.test.mjs plus these docs. Preserved pre-existing dirty work.
  No new dependencies/token changes/config edits, Gemini/TTS, database access,
  attempt operations, service restart, commit or push.

## S29.2B.4 — Fix full-width Public Museum navigation (2026-10-24)

- Root cause confirmed in installed Expo Router/Radix: Slot merges a direct
  child's style callback as an object, removing the old Pressable's flex styles.
  Added a ref-forwarding tab button boundary so styles are created after Slot.
  Existing Link navigation preserved. Removed bar row maxWidth; explicit100%
  bar/row width and flex1/minWidth0 tabs. Safe area/ScrollView placement unchanged.
- Regression uses the installed merge implementation to reproduce previous failure
  and verify native style callback/ref/event preservation. Checks equal widths and
 48dp target allocation at360/393/411/1024dp; physical render MANUAL PENDING.
- Public19/19/all Mobile102/102 tests PASS; final TypeScript PASS after correcting
  ref typing to ComponentRef<typeof Pressable> for RN0.88. ESLint and offline
  Android Metro/Hermes PASS (1341 modules/37 assets); asset/hash/token sync and
  diff-check PASS. Ignored artifact .expo/validation/s292b4-android.
- Only MuseumUI/theme/tests and these docs changed for B.4; preserved earlier dirty
  work. No Hero/CTA/images/content/Customer navigation/Web/Backend/Admin changes,
  Gemini/TTS/database access, config edits, attempt actions or commit/push.

## S29.2B.3 — Fix Public Museum bottom navigation alignment (2026-10-24)

- Changed only public tab layout and final Home CTA styling (theme/MuseumUI plus
  tests/docs). Centered five equal tabs with11sp wrapping labels,8dp separation,
 48dp minimum touch width and80dp minimum height; preserved active purple/icons.
  Final CTA uses explicit white text/dark purple with navy pressed feedback.
- Previous styles confirmed flex-start/12sp/2dp tab gaps. No source evidence of
  a low-contrast final CTA color pair; actual device appearance cause remains
  unverified. No safe-area duplication or absolute overlay found; retained the
  single SafeAreaView and bar outside ScrollView without extra bottom insets.
- Public18/18/all Mobile101/101 PASS. TypeScript, ESLint, asset/hash sync, token
  sync and diff-check PASS. Offline Android Metro/Hermes PASS,1341 modules/37
  assets; ignored artifact .expo/validation/s292b3-android. Device visual QA
  MANUAL PENDING (360dp/Pixel7, system font scaling, Android/iOS bottom safe area).
- No Hero/image/content/route/auth changes. No Web/Backend/Admin/Customer screen
  changes, Gemini/TTS/database operations, config changes, reset/retry or commit/push.

## S29.2B.2 — Final Public Museum Mobile UI polish (2026-10-24)

- Limited changes to Home's three CTA appearances and Public bottom navigation.
  Reused Web's white primary/light outline Hero hierarchy and purple final CTA;
  added scoped variants, readable pressed states and keyboard-focus treatment.
  Equal-width tabs now reserve centered icon/label slots, allow labels to wrap
  and retain48dp minimum touch width, active state and safe-area space.
- Public16/16/all Mobile99/99 PASS; ESLint, TypeScript and offline Android
  Metro/Hermes PASS (1341 modules/37 assets). Museum content/image hashes,
  Customer token sync and diff-check PASS. Export retained under ignored
  .expo/validation/s292b2-android. No services restarted.
- User's Pixel7 visual approval applies to B.1. Visual QA of these B.2 changes:
  MANUAL PENDING. Preserved Hero sizing, all images/copy/routes, Login/Register,
  Customer Dashboard, Web/Backend/Admin. No Gemini/TTS or database access/writes,
  config changes, attempt operations, commit or push.

## S29.2B.1 — Fix Public Museum Mobile Hero image (2026-10-24)

- Confirmed root cause in installed React Native Image: local source dimensions
  precede style; old aspectRatio-only sizing retained source height. Moved ratio
  ownership to a View with explicit100%x100% absolute Image child. Hero remains
  contain, capped at200dp with paired16:9 width cap and navy letterboxing; copy
  and both CTA links unchanged. Same fix covers Intro/topic/poster images.
- Added regressions for native source-dimension override,16:9/200dp cap across
  logical viewport widths, shared Intro frame and accessible failure sizing.
  Public14/14 and all Mobile97/97 PASS; TypeScript, ESLint, offline Android
  Metro/Hermes (1341 modules/37 assets), asset/hash sync, token sync and diff-check
  PASS. Bundle artifact: ignored .expo/validation/s292b1-android.
- Pixel7 visual QA MANUAL PENDING; expected sizing is not a device observation.
  Preserved routes, bottom navigation/safe area, Login/Register, Customer Dashboard,
  Web and Backend. No Gemini/TTS, MongoDB access/writes, config changes or commit/push.

## S29.2B — Public Museum Mobile UI Refinement (2026-10-24)

- Scoped edits to MuseumUI/MuseumScreens/theme and Public UI tests. Brand-only
  header; five-item fixed-in-layout bottom links with icons/active/focus/pressed
  feedback. Bar is outside scrolling content and inside safe-area edges, never
  an overlay. Workspace entry/auth/Customer tabs and every S29.2A route unchanged.
- Hero image displayed fully at16:9 above navy copy; primary/secondary CTA hierarchy
  clarified. Improved intro typography/rhythm and two-column language cards with
  natural equal-row sizing, wrapping text, neutral glyphs and unchanged availability.
- Four additional regressions cover bar placement/safe-area props,48dp targets,
  active detail paths/Customer isolation, Hero contain/CTA hierarchy and two-column
  non-interactive language cards. Mobile95/95 tests PASS (focused Public12/12).
  TypeScript, Museum snapshot/image hashes, Customer token sync and diff-check PASS.
- Final ESLint (all Mobile src/tests and focused modified files) PASS. Offline
  Android Metro/Hermes export PASS (1341 modules,37 assets), artifact retained in
  ignored .expo/validation/s292b-android. No runtime services started/restarted.
- No new native device QA performed: Pixel7/iOS layout, actual scrolling, hardware
  Back, font scaling and TalkBack remain MANUAL PENDING. No runtime restart, real
  auth, source-video opening, Gemini/TTS, database writes or attempt actions.
  No Web/Backend/Admin/Login/Register/Dashboard/config/dependency changes; no commit/push.

## S29.2A — Public Museum Web → Expo Mobile (2026-10-24)

- Audited actual Web Home/Explore/Videos/About, video/exhibition detail, header/
  footer, image slots, public catalogs and permission records. Web has one public
  video and no published exhibitions; no Backend/Admin/API duplication needed.
- Added native public screens, shell/navigation/footer, isolated Museum style roles,
  local images/fallback and published-only detail handling. `/` is now public for
  every session state. Workspace entry reuses auth bootstrap; login still goes to
  existing Dashboard, logout/private guard rejection to Museum Home. No Customer
  Dashboard/tab redesign or changes to S29.2 auth forms/UI/authentication.
- Added build-time museum-mobile-sync with Web publication filters and SHA-256
  checks; seven JPG assets copied unchanged, catalog/asset adapter generated locally.
  No runtime dependency on Web/Vite, auth API, database or private project data.
- Video detail native playback PARTIAL/BLOCKED by existing website-only permission.
  Preserved license/credit and original-source action; no MP4 bundled/streamed,
  no invented audio/captions and no unavailable-language interactions.
- Added8 public museum mock/contract tests and1 actual SDK URL matcher regression;
  updated existing root tests for public home, guest workspace, loading, login/
  logout guard destinations and deep links. Mobile91/91 PASS. Physical Pixel7 QA
  MANUAL PENDING; no native rendering or real auth/logout call was claimed tested.
- Final validation: Mobile TypeScript/ESLint, Android Metro/Hermes export (1341
  modules,37 assets), Web400/400 regression, Customer token sync, Museum snapshot/
  image hashes, script syntax and diff-check PASS. Temporary export remains at
  frontend-mobile/dist-s292a-public-validation: cleanup was not executed because
  automatic approval review hit its usage limit. No approval bypass attempted.
- Flat listing routes avoid stale Windows typed-route watcher `/index` entries;
  refreshed generated types using SDK58 CLI, no type casts/Router patch/config
  bypass. Restart Metro from frontend-mobile if a running instance retains old
  route context. Existing uncommitted root/auth work preserved.
- No Gemini/TTS, MongoDB writes, attempt/quota operations, Web/Backend/Admin edits,
  credentials/config changes, dependency installs or commit/push.

## S29.2 — Mobile Auth UI Refinement (2026-10-24)

- Scoped to Login/Register, AuthLayout and opt-in common-control presentation.
  Read Web counterparts and synchronization rulebook; tokens/adapters unchanged.
  Added shared native AuthFooter/authFormStyles and completed auth font families,
  readable16sp helper/error text, compact420dp card, aligned brand/tagline and
  adaptive padding. No Dashboard, Web, Public Museum, Admin or Backend edits.
- Improved safe-area/keyboard/scroll props, 48dp link/toggle targets, wrapping CTA,
  keyboard Next and first-error focus. Kept existing form fields, validation rules,
  password behavior, auth API contracts, submit locks and guard-owned navigation.
  RN0.88 native input ref uses ComponentRef<typeof TextInput>, not the component type.
- Added9 mocked UI tests; Mobile82/82 and Web400/400 regression tests PASS.
  Mobile TypeScript/ESLint, read-only token synchronization and Web lint/typecheck/
  build PASS. Offline Android Metro/Hermes export PASS (1321 modules,30 assets),
  temporary export removed after validation; diff-check PASS.
  Web build retains existing mixed static/dynamic import advisory;
  sandbox spawn EPERM resolved by an approved local build, no source workaround.
- Physical Pixel7/iOS keyboard, safe areas, real font rendering, scrolling with
  large text and TalkBack remain MANUAL PENDING; tests do not prove visual QA.
  No real auth, AI/TTS, MongoDB, translation-attempt or quota operations, config
  changes, dependencies, commit/push. Prior uncommitted root-route work preserved.

## S28.2 — SDK58 root URL regression verification (2026-10-24)

- Preserved the pending S28.1 bootstrap fix: always-registered index, loading until
  session restoration, explicit Login/Dashboard redirects and unchanged auth guards.
  No additional speculative navigation/config/UI changes made in S28.2.
- Added root-url-matching.test.mjs exercising the installed Router58.0.25 route
  discovery, native URL extraction and linking matcher against actual app filenames.
  Both linking configs match custom-scheme `/` and Expo Go QR roots to index;
  Login/Dashboard/deep links match existing screens and unknown paths match Not Found.
  Native URL-unwrapping and route imports are stubbed: no session/API/database use.
- Live Metro8081 manifest identifies frontend-mobile with routerRoot=src/app;
  served Android development bundle contains root index and Dashboard redirect.
  These observations do not prove which bundle the phone executed. The continuing
  phone error is NOT REPRODUCED locally; stale device state/cache is a hypothesis,
  not a confirmed root cause. Earlier component-only tests did not cover URL matching.
- Mobile 73/73 tests, TypeScript/design check, ESLint (Expo config), offline Android
  Metro/Hermes export (1319 modules, 30 assets) and diff-check PASS. Temporary export
  output removed after validation; the running Metro process was not restarted.
  Physical-device cold start/reload/logout and deep-link
  verification MANUAL PENDING. Restart Metro with `npx expo start --clear` from
  frontend-mobile (stop that Metro terminal first), fully close/reopen Expo Go and
  rescan its new QR. Do not clear SecureStore or reset project/translation data.
- No Backend/Web/Admin/auth/API/data changes, AI/TTS calls or commit/push.

## S28.1 — Fix SDK58 startup Unmatched Route (2026-10-24)

- Found root `index` guarded by loading only; once session restoration completed,
  the launch URL `/` no longer had an accessible bootstrap screen. The existing
  index only rendered a spinner and provided no deterministic auth redirect.
- Keep index outside Protected groups. Reuse the same loading UI, redirect logged
  out users to `/login`, authenticated users to `/(tabs)/dashboard`. Public/private
  guards now explicitly redirect rejected access through `/`; auth, SecureStore,
  valid screen registrations, scheme and generated Not Found remain unchanged.
- Added component-level mocked startup/reload/login/logout and guard regression
  tests. Mobile 69/69 tests, TypeScript/design check, direct ESLint (Expo config)
  and Expo Doctor 20/20 PASS. Offline Android Metro/Hermes export PASS (1319
  modules, 30 assets); initial sandbox EPERM resolved with approved compiler run.
- Physical Android Expo Go QA NOT VERIFIED: verify cold start with/without session,
  reload, login/logout, valid authenticated deep links and unknown-route Not Found.
  Component mocks do not replace native navigation tests. No UI/API/Backend/Web/
  Admin/database/config changes, AI/TTS calls, attempt actions or commit/push.

## S28 — Expo SDK58 Upgrade (2026-10-24)

- Mobile upgraded Expo57→58.0.17, React19.2.3→19.3.0, RN0.86.3→0.88.0,
  Router58.0.25 and Expo-compatible native modules/types/eslint config.
  See docs/EXPO_SDK58_UPGRADE.md for full version table and recovery notes.
- Removed obsolete Tabs initialRouteName; dashboard stays first declared tab.
  Kept SPA/synchronous Expo Web behavior explicit. RN0.88 FlatList nullable slots
  migrated to undefined with no condition/handler changes. No UI redesign.
- Clean npm ci/lock alignment PASS after old peer-tree and Windows path issues;
  old partial dependencies/lock retained under .expo. Native android/ios absent,
  no native reset/prebuild. SecureStore/API/upload/audio/video contracts unchanged.
- Expo Doctor20/20, dependency check, TypeScript,64/64 tests, direct ESLint with
  Expo flat config, Android/iOS Metro/Hermes exports and diff-check PASS.
  Expo npm-run-lint wrapper NOT COMPLETED (environment hang); escalation retry
  unexecuted due approval reviewer usage limit. Native Expo Go58 QA NOT VERIFIED.
- Targeted shell-quote update removed critical finding; five high upstream npm
  audit findings remain, no force downgrade. No Backend/Web/Admin edits, AI/TTS,
  MongoDB/attempt actions, credentials/config endpoint changes or commit/push.

## S29.1 — Customer Web/Mobile Design Synchronization (2026-10-24)

- Added canonical design/customer tokens + real screen manifest, deterministic
  script/adapters, drift checks and frontend AGENTS synchronization rules.
  New rulebook: docs/WEB_MOBILE_DESIGN_SYNC.md. Existing dirty files preserved.
- Web: Customer-only CSS import, generated brand for Sidebar/Topbar; tests updated
  to check config rather than hardcoded names. Public Museum unchanged.
- Mobile: existing token exports generated from shared config with platform
  overrides, local licensed Be Vietnam Pro fonts, loader and Button/Input family,
  shared Header/Auth brand. No screens/routes/API/workflow redesigned.
- Fixed pre-existing navigation parity test assumption: Mobile Lịch sử remains
  project history, Web Thư viện is product library. Explicit PARTIAL, not fake parity.
- Web400/400 and Mobile60/60 PASS; both lint/typecheck PASS. Web build PASS (existing
  mixed-import advisory). Offline Android export1417 modules/31 assets PASS after
  sandbox spawn EPERM resolved through approved local export outside sandbox.
  No app startup, dotenv, telemetry, provider request or database access.
- Visual QA NOT VERIFIED; no connected browser/native app. iOS/native runtime and
  font scaling/screen reader still pending. Further Text/token migration is scoped
  per component; current work establishes the mechanism, not complete visual parity.
- No Gemini/MongoDB/attempt/config credential actions, Backend/Admin/Public Museum
  edits, dependency install, commit or push. No next step started.

## Translation Page — UI Refinement (2026-10-24)

- Friendlier pending/UNCERTAIN summary, unchanged read-only status reload renamed
  Kiểm tra trạng thái. Provider HTTP/code/phase in collapsed diagnostic details;
  no-draft state explicit, real draft/review/saved rendering unchanged.
- Compact group/language cards consistent with Transcript. Changes limited to
  GroupTranslationWorkspace.tsx, translation.css, customer-translation.test.mjs,
  group-translation.test.mjs and these docs. Previous working-tree edits preserved.
- Focused31/31; Web396/396 and lint/typecheck/build/diff-check PASS. Existing Vite
  mixed-import advisory remains non-blocking. Visual QA NOT VERIFIED: no browser.
- No API/backend/auth/workflow/idempotency changes, Gemini requests, MongoDB writes,
  attempt retry/reset/bypass/model change, configuration changes or commit/push.

## Transcript Video — Oversized Portrait Player Fix (2026-10-24)

- Corrected the previous height:auto/aspect-ratio:auto override which let portrait
  video grow too tall. Only Transcript opts into a16:9, max360px dark frame; video
  width/height100%, object-fit contain; both cards keep natural independent height.
- Changed SourceMediaPlayer.tsx (optional presentation wrapper, default off),
  TranscriptPage.tsx, transcript.css, transcript-compact-ui.test.mjs and these docs.
  No media source/control/seek/API/data/workflow changes; prior edits preserved.
- Focused18/18; Web396/396, lint/typecheck/build/diff-check PASS. Existing Vite mixed
  import advisory unchanged. Real9:16/16:9 and mobile Visual QA NOT VERIFIED:
  connected browser unavailable. No Gemini/MongoDB/attempt actions or commit/push.

## Transcript Page — UI Polish (2026-10-24)

- Consolidated header/project/language/status, reduced redundant headings and
  card/segment spacing. Kept two columns, six workflow steps and metadata/player.
- Native video ratio preserved through transcript-scoped CSS; compact Phát label
  keeps precise accessible timestamp and seek behavior. Continue is primary purple,
  right-aligned; original saved/valid draft guard and navigation unchanged.
- Changed pages/TranscriptPage.tsx, features/transcript/TranscriptSegmentEditor.tsx,
  styles/transcript.css, tests/transcript-compact-ui.test.mjs and these two docs.
  Preserved pending Project Detail changes from previous task.
- Focused30/30; Web395/395 PASS. Lint/typecheck/build/diff-check PASS. Existing Vite
  projectRepository mixed static/dynamic import advisory remains non-blocking.
- Visual QA NOT VERIFIED (no connected browser); responsive375–1440px, native
  media loading/playback and keyboard interaction still require manual review.
- No Backend/API/data/workflow/auth changes, Gemini calls, MongoDB writes,
  attempt reset/retry/bypass, configuration changes or commit/push.

## S28 — Project Detail UI/UX Redesign (2026-10-23)

- Compact six-step summary with unchanged workflow resolution/navigation;
  balanced media/information columns and mobile stack. Existing authenticated
  source player reused for verified audio/video, including loading/error handling.
- Compact metadata and46px form controls; existing unsaved/save feedback retained.
  Save/Continue stay together, destructive Delete isolated with original confirm.
- Changed pages/ProjectDetailPage.tsx, styles/project-detail.css,
  tests/project-form-polish.test.mjs, tests/create-upload-detail-ui.test.mjs,
  docs/UI.md and docs/PROGRESS.md. Preserved unrelated uncommitted changes.
- Focused16/16 and full Web393/393 PASS; lint/typecheck/build/diff-check PASS.
  Build retains the existing non-blocking projectRepository mixed-import advisory.
- Visual QA NOT VERIFIED (no connected browser); responsive sizes375–1440px,
  zoom200%, authorized real-media playback/error states require manual inspection.
- No Backend/API/auth/ownership/workflow changes, real upload, Gemini request,
  MongoDB write, attempt reset/retry, commit or push. No next task started.

## S28 — Final Narration Library UI Polish (2026-10-23)

- Compact150px desktop Search, toolbar responsive to optional language selector;
  mobile button full-width. Scoped empty card padding/gap reduced, content centered
  with no fixed height. Exact15–20% rendered reduction remains unverified without
  browser. Product cards and server-evidence eligibility untouched.
- Changed pages/HistoryPlaceholder.tsx (empty-state class only),
  styles/narration-library.css, tests/narration-library.test.mjs, docs/UI.md and
  docs/PROGRESS.md. Preserved all prior uncommitted work.
- Web391/391 PASS; lint/typecheck/build/diff-check PASS. Existing Vite advisory
  non-blocking. Visual QA NOT VERIFIED: empty browser inventory. Manual toolbar,
  empty-state height and narrow-screen review needed. Skill ui-ux-pro-max informed
  spacing; no other screens/API/workflow/auth, Gemini calls, MongoDB writes,
  attempts reset or commit/push.

## S28 — Customer Narration Library UI (2026-10-23)

- Replaced /history table with responsive3/2/1 product cards and verified media/
  narration language, icon fallback, manual search/media/language filters and
 12-item paging. Empty creation CTA/loading/error/partial evidence states included.
- Sidebar label/icon and Topbar title/description updated; existing /history links
  in Dashboard/Result renamed only. No routes or API/auth/workflow changes.
- Reused server workflow artifact attestation and RESULT access guard in pure
  libraryPresentation.ts. Requires COMPLETED project/workflow, no active job,
  matching result/narration artifact and language provenance; incomplete evidence
  excluded with notice. No fabricated thumbnail/language/result or source-media
  substitution. Legacy demo branch no longer used in library; helper files/data
  preserved. One product per verified current project workflow, not all versions;
  protected file availability still checked on existing Result page, not probed here.
- Files: pages/HistoryPlaceholder.tsx; new features/results/libraryPresentation.ts,
  styles/narration-library.css; Sidebar.tsx, Topbar.tsx, navigationLabels.mjs;
  DashboardPlaceholder.tsx/ResultPage.tsx (link text only). Tests: new
  narration-library.test.mjs; history-demo, history-pagination, data-state-integrity,
  navigation-interaction and shell-refinement updated for new authorized UI;
  docs/UI.md and docs/PROGRESS.md. Unrelated working-tree changes preserved.
- Web390/390 PASS, library5/5 PASS; lint/typecheck/build/diff-check PASS, existing
  Vite advisory only. Visual QA NOT VERIFIED (no browser connected). Manual card
  widths/focus/live file access remain. ui-ux-pro-max informed reflow; no real API
  request, Gemini call, MongoDB write, attempt reset or commit/push; Backend,
  Public Museum, Mobile and Admin unchanged.

## S28.7.3 — Create Project Page UI Redesign (2026-10-23)

- Limited changes to pages/NewProjectPlaceholder.tsx, styles/upload.css,
  tests/create-upload-detail-ui.test.mjs and docs/UI.md/PROGRESS.md. Preserved
  existing uncommitted work; no other screen or transport/handler changes.
- Content centered/max1024px, compact section padding/gaps; name+language row,
  full-width description below; step labels updated to Thông tin dự án/Tệp phương
  tiện/Hoàn tất. Desktop dropzone min176→136px with horizontal presentation,
  mobile stacked; actions compact, natural page scroll retained.
- Validation, MIME/max500MB, locks, status/feedback, real API and destination
  unchanged. Existing mock tests cover invalid selected file/no upload, mock
  success/existing destination, upload cancellation guards and unchanged limits.
  Updated assertions verify labels, DOM order, full-width description and sizing.
- Web385/385 PASS; lint/typecheck/build/diff-check PASS, existing Vite mixed-import
  warning remains. Visual QA NOT VERIFIED (no connected browser); responsive,
  zoom, long errors and keyboard review remain manual. Skill ui-ux-pro-max
  informed grouping; no Gemini calls, MongoDB writes or real upload, old attempts
  untouched, no config/Backend/Public/Mobile/Admin changes, no commit/push.

## S28.7.2 — Customer Projects List UI Redesign (2026-10-23)

- Compact Projects toolbar/table/pagination, one creation CTA to existing route,
  shorter Projects-only Topbar description/title and14px Sidebar brand text.
  Rows60px when content fits, name column32%, six columns/real-data/action mappings
  unchanged. Preserved two-line names with full title/ARIA and focus expansion.
- Reused default-closed filters and applied count, preserving selection on toggle.
  Conditional reset/footer checks draft defaults; no automatic apply or fetch.
  New mock interaction verifies open/close retention, reset without URL mutation,
  Search apply/page-one and active count. No real Customer/API/DB requests run.
- Files: pages/ProjectsPlaceholder.tsx; components/layout/Topbar.tsx (Projects copy
  only); styles/project-list.css, shell.css (brand only); tests/projects-foundation,
  projects-table-redesign, header-profile, dashboard-project-list-ui; new
  tests/projects-compact-interaction.test.mjs; docs/UI.md and docs/PROGRESS.md.
- Web385/385 PASS; lint/typecheck/build/diff-check PASS. Legacy tests prohibiting
  the now-authorized CTA updated; no API/workflow/filter semantics changed.
  Existing Vite advisory non-blocking. Visual QA NOT VERIFIED: no connected browser;
  manual widths, keyboard, Sidebar wrapping and long-content checks remain.
- ui-ux-pro-max informed disclosure/density. Gemini0, MongoDB writes0; no Dashboard,
  Login/Register, Public/Mobile/Admin/Backend/config or attempts changed;
  preserved uncommitted work, no commit/push.

## S28.7.1 — Dashboard Visual Polish & Real Museum Banner (2026-10-23)

- Dashboard banner now uses existing museum hero.jpg with navy overlay, requested
  copy, radius16px/min240px and existing creation CTA. No image/old asset deleted.
  Compact shortcuts, chart-card spacing, donut display, recent rows and activity;
  actual project data/calculations/filter/request/navigation logic unchanged.
- Sidebar/Dashboard Topbar brand updated, matching museum icon via new
  components/layout/MuseumBrandIcon.tsx. Login/Register unchanged in this step.
- Changed DashboardPlaceholder.tsx, Sidebar.tsx, Topbar.tsx, AppShell.tsx,
  styles/dashboard.css, styles/shell.css, tests/dashboard-hero-actions.test.mjs,
  tests/customer-shell-a11y.test.mjs (new icon mock), docs/UI.md, docs/PROGRESS.md;
  added MuseumBrandIcon.tsx. Existing uncommitted auth work preserved.
- Web383/383 PASS; lint/typecheck/build/diff-check PASS. Initial shell mock failures
  fixed by declaring the new icon dependency; no production auth behavior altered.
  Existing Vite import advisory non-blocking. Visual QA NOT VERIFIED: empty browser
  inventory; responsive widths/crop/zoom/focus and actual chart layout need manual QA.
- ui-ux-pro-max guided contrast/reflow. Gemini0, MongoDB writes0; no Backend,
  Public/Mobile/Admin, config, attempt or API changes; no commit/push.

## S28.6.7 — Compact & Centered Login/Register (2026-10-23)

- Shared max420px auth block and28px desktop card padding,28–30px headings,
  input/control44–46px minima and46px submit minimum. Field gaps14–16px; no
  reduced font size or forced single-screen form. Grid centering preserved;
  natural page growth keeps Register actions reachable in low viewports.
- Brand, panel colors, photo/gradient/right copy and business logic unchanged.
  Updated styles/login.css, styles/register.css, tests/login-museum.test.mjs,
  tests/register-museum.test.mjs, docs/UI.md and docs/PROGRESS.md. No components
  or handlers changed; prior uncommitted work preserved.
- Web382/382 PASS; lint/typecheck/build/diff-check PASS. Existing Vite mixed-import
  warning remains. Visual QA NOT VERIFIED: no connected browser; manual widths,
  low-height/long-error/zoom/focus checks remain. ui-ux-pro-max informed spacing.
- Gemini0, MongoDB writes0, old attempts untouched; no commit/push.

## S28.6.6 — Register Form Color & Contrast Polish (2026-10-23)

- Scoped Register palette overrides: panel#E9EDF7, card#FFFFFF/#D8DEEC,
  input#F1F4FA/#D3DAE9, heading/label/value/brand#14213D. Preserved purple CTA;
  explicit focus/error precedence, readable placeholder and subtle icon emphasis.
  Compact low-height desktop spacing retains natural scrolling and font/control
  sizes. No shared token, Login layout, photo, gradient or copy changes.
- Changed styles/register.css, tests/register-museum.test.mjs, docs/UI.md and
  docs/PROGRESS.md only in this step. Prior uncommitted work preserved.
- Web381/381 PASS; lint/typecheck/build/diff-check PASS. New tests cover scoped
  color/focus/error/short-height rules and4.5:1 text contrast pairs. Existing Vite
  import advisory non-blocking. Visual QA NOT VERIFIED: browser inventory empty;
  real screenshot/layout/focus/zoom review remains manual.
- ui-ux-pro-max informed contrast. No auth/validation/API/config changes, real
  registration, Gemini calls, MongoDB writes or old attempts changed; no commit/push.

## S28.6.5 — Customer Register Visual Redesign (2026-10-23)

- Register mirrors approved Login brand/card/photo with42/58 desktop, tablet
  rebalance and form-first mobile. Reuses styles/login.css without editing it;
  new styles/register.css contains only scoped layout/compact spacing overrides.
  Existing LoginPlaceholder and RegisterForm unchanged during this step.
- Preserved all four fields/password guidance, validation/error focus, visibility,
  loading, duplicate-submit lock, API/auth and redirect. No real submit performed.
- Changed: pages/RegisterPlaceholder.tsx; new styles/register.css and
  tests/register-museum.test.mjs; tests/login-museum.test.mjs and
  register-polish.test.mjs updated for current supported Register layout;
  docs/UI.md, docs/PROGRESS.md. Existing uncommitted Login work preserved.
- Web379/379 PASS, lint/typecheck/build/diff-check PASS. Tests compare exact brand
  and photo markup across Login/Register and retain existing auth regressions.
  Vite mixed-import advisory remains non-blocking. Visual QA NOT VERIFIED: no
  connected browser; responsive/zoom/crop still require manual checks.
- ui-ux-pro-max informed spacing. Gemini0, MongoDB writes0; no Backend/Public/
  Mobile/Admin, config or old attempts changed; commit/pushNO.

## S28.6.4 — Login Brand Highlight (2026-10-23)

- Updated only Login brand markup/styles:20–22px bold navy name,24px museum icon
  in48px purple tile,11px purple tagline,20–24px card gap. Existing form layout,
  card, museum photo/copy, authentication/validation/redirect untouched.
- Files: pages/LoginPlaceholder.tsx, styles/login.css,
  tests/login-museum.test.mjs, docs/UI.md, docs/PROGRESS.md.
- Web376/376 PASS; lint/typecheck/build/diff-check PASS. Existing Vite mixed-import
  warning remains. Visual QA NOT VERIFIED; manual narrow-screen wrapping review
  needed. ui-ux-pro-max guided hierarchy; no Register/other screen changes.
- No Gemini calls, MongoDB writes, old attempts changed or commit/push.

## S28.6.3 — Customer Login Form Card (2026-10-23)

- Added white max440px Login card (radius16px, #E5EAF2 border, subtle shadow,
  padding32px desktop/24px mobile/20px small mobile) on #F5F7FB left panel.
  Brand stays outside immediately above, aligned left. Heading/form/register link
  inside; existing photo, copy, columns, validation, auth and redirect unchanged.
- Files: pages/LoginPlaceholder.tsx, styles/login.css,
  tests/login-museum.test.mjs, docs/UI.md, docs/PROGRESS.md. Earlier uncommitted
  Login redesign preserved; no shared Register or other screen changes.
- Web375/375 PASS; lint/typecheck/build/diff-check PASS. Existing Vite dynamic
  import warning non-blocking. Visual QA NOT VERIFIED: browser inventory empty;
  manual responsive/focus review remains. ui-ux-pro-max informed card grouping.
- Gemini0, MongoDB writes0; no attempts touched, config changes or commit/push.

## S28.6.1 — Customer Login Museum Photo Redesign (2026-10-23)

- LoginPlaceholder now composes the existing unmodified LoginForm in its own
  form-left/photo-right42/58 layout. Added styles/login.css, scoped to login-museum
  classes; no shared AuthLayout/auth.css/Register changes in this step.
- Brand changed locally to “Thuyết minh bảo tàng” with museum SVG; one H1
  “Chào mừng trở lại”. Existing hero photograph inspected/reused without altering
  image files or source/license records. Navy overlay, requested slogan and
  description at bottom; tablet columns rebalance and mobile hides photo.
- Added tests/login-museum.test.mjs for heading/brand, existing form ordering,
  asset existence, Register isolation and responsive CSS. Existing auth validation,
  focus-error, password visibility and duplicate-submit tests still pass.
- Validation: full Web374/374 PASS; auth-focused12/12 PASS; lint/typecheck/build
  PASS. Existing projectRepository mixed-import advisory remains. Visual QA NOT
  VERIFIED (no connected browser); manually verify requested widths/crop/zoom.
- ui-ux-pro-max informed contrast, reflow and mobile priority. No real login,
  Gemini calls, database writes, config/Backend/Public/Mobile/Admin changes,
  attempt resets or commit/push. Existing uncommitted work preserved.

## S28.5 — Customer Transcript UI/UX Polish (2026-10-23)

- Confirmed /projects/:projectId/transcript and existing workspace/player/editor.
  Changes limited to TranscriptSegmentEditor.tsx, styles/transcript.css,
  tests/transcript-compact-ui.test.mjs and UI/PROGRESS docs.
- Removed nested transcript list scrolling; kept responsive two-column/stacked
  architecture, native media aspect ratio, controls and timestamp seek unchanged.
  Compact editor spacing, wrapping and focus clearance use current Customer tokens.
- Added editing border, explicit unchanged/unsaved/saving status, aria-busy and
  textarea status/error associations. Displays existing validator errors without
  altering save rules, feature gate, max length, locks, CAS or conflict handling.
  Existing saved/downstream warnings remain; no automatic save or new request.
- Full Web371/371 and focused28/28 PASS; lint/typecheck/build PASS; existing Vite
  mixed-import advisory non-blocking. Browser inventory empty: Visual QA NOT
  VERIFIED. Manual checks needed at375/768/1024/1280/1440px, keyboard, long content,
  native video/audio and real screen-reader feedback. No real media/API action run.
- ui-ux-pro-max informed form feedback, reflow and scrolling; no redesign.
  No Gemini calls, MongoDB writes, config/Backend/Museum/Mobile/Admin changes,
  attempts touched or commit/push. Unrelated uncommitted work preserved.
- Proposed S28.6: Customer Translation UI consistency/accessibility review, retaining
  all UNCERTAIN/provider warnings and current safety guards. Not started.

## S28.4 — Customer Project Forms & Upload UI/UX Polish (2026-10-23)

- Improved required/helper copy and linked upload errors, persistent supported
  formats/500MB guidance, long filename wrapping and visible native-picker focus.
  Preserved name validation differences (create3–100/detail required/max150),
  MIME/size rules, submit locks, cancellation and existing upload/save/delete APIs.
- Detail now shows unsaved/saving/saved status and warns on browser unload and
  explicit local exit links; no global router/auth/workflow change. Sidebar,
  WorkflowSteps and SPA history navigation remain outside this limited warning.
  Failed saves retain input; stale success is suppressed while edits are pending.
- Create success explains the existing list-to-project-to-Transcript next step;
  empty project copy uses device-neutral navigation wording. Scoped CSS only.
- Changed: pages/NewProjectPlaceholder.tsx, ProjectDetailPage.tsx,
  ProjectsPlaceholder.tsx; styles/upload.css, project-detail.css;
  tests/project-form-polish.test.mjs, dashboard-project-list-ui.test.mjs; UI/PROGRESS.
  Prior S28.2/S28.3 uncommitted work preserved.
- Validation: Web368/368 PASS, focused17/17 PASS, lint/typecheck/build PASS.
  Build required approved sandbox escalation; existing projectRepository dynamic
  import advisory remains non-blocking. Visual QA NOT VERIFIED: no connected
  browser; widths375/768/1024/1280/1440, zoom, keyboard/focus and long content still
  need manual checks. No real create/upload, Gemini calls or MongoDB writes;
  no config, attempt, Public Museum, Mobile, Admin or Backend changes; no commit/push.
- Suggested S28.5: Transcript editor/player UI feedback and accessibility, preserving
  current transcript validation and workflow guards; not started.

## S28.3 — Customer Auth UI/UX Polish (2026-10-23)

- Single task H1, subordinate existing slogan, matching27rem forms/spacing,
  responsive shrinkable columns and long-error wrapping; preserved blue/navy,
  Be Vietnam Pro and all current copy/fields. Auth-only styles do not affect Public.
- Added first-invalid-field focus in visual order after submit, preserving values
  and existing validators/ARIA associations. Form busy state and existing submit
  locks/redirects retained. Safe register request messages classified using current
  status/codes, with no API/auth/session changes or raw exceptions in UI.
- Files for this step: components/layout/AuthLayout.tsx; features/auth/LoginForm.tsx,
  RegisterForm.tsx, loginError.mjs, loginError.d.mts; styles/auth.css;
  tests/auth-accessibility.test.mjs (new); docs/UI.md, docs/PROGRESS.md.
  Prior S28.2 dirty files preserved, not overwritten/reverted.
- Focused12/12 PASS; full Web363/363 PASS,0 failures/skips; lint/typecheck/build/
  diff-check PASS. New test children-prop lint warning corrected; existing Vite
  projectRepository chunk warning remains non-blocking.
- Visual QA NOT VERIFIED, no browser available. Manual widths375/768/1024/1280/
 1440, keyboard/screen-reader/password-manager, zoom/long-error rendering pending.
- Gemini0, MongoDB writes0; only mocks, no real auth requests, no changes to JWT,
  refresh/logout/RBAC/redirect, validation rules, workflow, Public/Mobile/Admin/
  Backend/config, uncertain attempts or commit/push. Only S28.3.
- Proposed S28.4: project creation/detail/upload form consistency and next-step
  guidance, preserving existing validation/API limits unless separately approved.

## S28.2 — Customer Web Shell & Design System Polish (2026-10-23)

- Added keyboard-only skip link and focusable main. Route changes wait for drawer
  closure before focusing main; sidebar same-route navigation supported. Escape/
  close/backdrop restoration and existing Tab/inert/scroll-lock behavior preserved.
- Added safe persistent Vietnamese logout-failure alert and explicit login link;
  no success state/navigation or auto-resubmit on failure. Existing authentication
  unchanged, including local-session clearing even when server logout rejects.
  Disabled failed logout action and excluded disabled account items from arrow keys.
- Customer-only CSS improves button reflow/icons, pressed feedback without movement,
  reduced-motion and responsive full-width Topbar error. Tokens/typography/layout
  retained; no Dashboard/Projects/workflow source or Public Museum edits.
- Changed: components/layout/AppShell.tsx, Topbar.tsx, styles/shell.css,
  tests/customer-shell-a11y.test.mjs (new), docs/UI.md, docs/PROGRESS.md.
- Full Web357/357 PASS,0 failed/skipped; lint/typecheck/build/diff-check PASS.
  Focused shell/profile tests initially15/15 PASS, then full suite includes5 new
  behavior/CSS tests. Initial mock failures fixed (DOM method and async VM timing),
  not application safety bypasses. Existing Vite chunk warning non-blocking.
- Visual QA NOT VERIFIED: no enabled browser.375/768/1024/1280/1440 viewport and
  real focus/long-text/zoom/reduced-motion tests require manual checking. Only
  mocked auth calls, no real session inspection/login/logout or database access.
- Gemini0, MongoDB writes0, uncertain-attempt operations0; no Backend/Mobile/Admin,
  API/routes/auth service/config changes, commit/push or work beyond S28.2.
- Proposed S28.3: Login/Register heading hierarchy and focus/error presentation;
  keep authentication/validation contracts and project/business changes separately scoped.

## S27.6 — Final Public Museum UI/UX Polish (2026-10-23)

- Standardized previously homepage-only compact Header/Footer proportions across
  all public pages. Aligned About CTA/body rhythm; added scoped token transitions,
  pressed CTA state and non-shrinking icons without changing shared Customer CSS.
- Bounded breadcrumb wrapping/separators, scrollable mobile menu for small/zoomed
  viewports, and menu-trigger hover. Removed misleading raised hover from passive
  homepage topic cards; actual navigation/video cards keep interaction feedback.
- Existing public copy/media/URLs/licence, real statuses and all application
  logic remain unchanged. No redundant technical notices found on main rendered
  pages; loading/errors, unpublished-language states and required rights kept.
- Files for this step: styles/museum-layout.css, museum-theme.css, museum-home.css,
  museum-about.css; tests/museum-design-system.test.mjs, museum-routing.test.mjs;
  docs/UI.md and docs/PROGRESS.md. Prior uncommitted work preserved.
- Validation: Web352/352 PASS,0 failed/skipped; lint/typecheck/build/diff-check
  PASS. Build outside sandbox; existing chunk warning non-blocking. Asset hash
  regressions included and PASS; no media altered.
- Visual QA NOT VERIFIED: browser inventory empty. Manual responsive widths375/
 768/1024/1280/1440, zoom100/200%, keyboard/focus/menu and playback still pending.
  This does not complete S27.5 browser acceptance or claim actual visual PASS.
- No Customer/Mobile/Admin/Backend, config/API/routes/business changes; Gemini0,
  MongoDB writes0, attempt retry/reset0, commit/push NO. Only S27.6, no new features.

## S27.3.6.3 — Final Public Video Detail Polish (2026-10-23)

- Prioritized short “Nguồn video gốc” link and removed only the redundant source
  link-label wording from adjacent metadata. Existing YouTube label remains;
  distinct author credits and full licence conditions remain visible/unchanged.
  No unverified removal of supposed optional licence text. No data/catalog edits.
- Improved source link typography/underline,24px target, screen-reader new-tab
  hint; retained muted14px copy, wrapping, focus ring and compact12px player gap.
  No changes to main layout/video/title/language choices/navigation or playback.
- Files for this step: MuseumVideoDetailPage.tsx, museum-video.css,
  museum-routing.test.mjs, docs/UI.md, docs/PROGRESS.md. Previous dirty work kept.
- Web350/350 PASS,0 failed/skipped; lint/typecheck/build/diff-check PASS. Build
  outside sandbox; existing chunk warning non-blocking. Browser inventory empty,
  Visual QA NOT VERIFIED (responsive/zoom/focus/playback not visually exercised).
- Gemini calls0, MongoDB writes0, uncertain-attempt operations0; no Customer,
  Mobile/Admin/Backend/API/routes/config changes; no commit/push. Only S27.3.6.3.

## S27.3.6.2 — Clean Public Video Detail Annotations (2026-10-23)

- Replaced source/rights panel with a compact inline credit paragraph beneath
  video, preserving external source URL, complete original licence/credit and
  non-link fallback metadata. No large heading, border/background/padding or
  empty panel remains; wrapping is allowed on narrow screens.12px player gap.
- Retained “Sẵn sàng” / “Đang chuẩn bị”, actual media/thumbnail, playback, loading,
  errors, breadcrumb/title and both navigation buttons. Real transcript/chapters
  still available; no fake content or changes to video eligibility/business logic.
- Files for this step: MuseumVideoDetailPage.tsx, museum-video.css,
  museum-routing.test.mjs, docs/UI.md, docs/PROGRESS.md. Earlier dirty work kept.
- Web349/349 PASS,0 failures/skips; lint/typecheck/build/diff-check PASS. Build
  outside sandbox; existing non-blocking projectRepository chunk warning remains.
  Visual QA NOT VERIFIED (not exercised in a browser).
- Gemini0, MongoDB writes0; no Customer/Mobile/Admin/Backend changes, no attempt
  retry/reset, media/config/source-rights changes or commit/push. Only S27.3.6.2.

## S27.3.6.1 — Normalize Public Museum Assets (2026-10-23)

- Validation: Web348/348 PASS,0 failed/skipped; lint/typecheck/build/diff-check
  PASS. Verified8/8 canonical built media byte-identical; source legacy image
  references0. Build retains non-blocking projectRepository chunk warning.
- Inventoried both requested directories, all8 media,4 .gitkeep files, source
  references and SHA-256. No original media duplicates. Copied6 JPEGs to canonical
  public/museum/images and verified unchanged hashes; poster/MP4 unchanged,
  captions still empty. No image processing, new media or fake captions.
- Updated homeImages configuration/allowlist, Vite filename inventory, editorial
  image path guard, routing/image fixtures and documentation. Existing media URL
  guards retain legacy museum-media compatibility; no files there to migrate.
- Kept six old /images/museum URLs as byte-identical compatibility copies because
  external references cannot be verified. Deleted0 files. This is an explicit
  retention exception, not a claim that the old directory is empty/removed.
- Added real-file hash/inventory regressions; pre-existing dirty changes remain.
  No Customer/Backend/Mobile/Admin, API, route, config-secret or database changes;
  Gemini0, MongoDB writes0, uncertain-attempt operations0, no commit/push.

## S27.3.6 — Public Museum Video Detail Polish (2026-10-23)

- Validation: Web345/345 PASS,0 failures/skips; lint/typecheck/build/diff-check
  PASS. Initial new chapter-time assertion adapted to the test helper's separated
  JSX text nodes; full suite rerun PASS. Build passed outside sandbox after EPERM;
  existing projectRepository dynamic-import warning unchanged.
- Refined only public video detail presentation: compact breadcrumb/title/copy,
  centered16:9 player, equal language choices with clear ready/unavailable states,
  compact full source/rights block and consistent back/Explore navigation.
- Removed redundant missing-transcript and original-language notices; retained
  genuine transcripts/chapters and all native playback, error/timeout/caption and
  publication/availability guards. No source URLs, media files or licence changes.
- Files changed for this step: MuseumVideoDetailPage.tsx,
  MuseumVideoLanguages.tsx, museum-video.css, museum-routing.test.mjs,
  museum-video.test.mjs, docs/UI.md and docs/PROGRESS.md. Prior About-page and
  other uncommitted changes preserved; no work on another page.
- Browser inventory empty: Visual QA NOT VERIFIED; actual playback, keyboard,
  focus/overflow,375/768/1024/1280/1440 widths and zoom100/200% need manual review.
- No Gemini calls or MongoDB writes; no uncertain-attempt retry/reset, Customer,
  Backend, Mobile, Admin, API, route, configuration or business changes; no commit/push.

## S27.3.5 — Complete Public Museum About Page (2026-10-23)

- Replaced the `/ve-bao-tang` placeholder with an image/text introduction, existing
  homepage facade asset and approved Home/Explore copy. Preserved h1, public shell,
  palette/font and existing `/kham-pha` CTA destination. Added two informational
  cards: “Về bảo tàng” and “Hành trình khám phá”; no invented historical facts.
- Scoped responsive styles: two-column introduction on desktop, stacked at≤1023px;
  two information cards stack at≤767px. Fluid type,16px body, bounded4:3 image,
 44px CTA, focus ring and original image fallback. No development notices shown.
- Files: MuseumAboutPage.tsx (new), museum-about.css (new), AppRouter.tsx,
  museum-routing.test.mjs, docs/UI.md and docs/PROGRESS.md. Preserved existing
  uncommitted work and source/licence metadata; image files unchanged.
- Validation: Web342/342 PASS,0 failed/skipped; lint/typecheck/build/diff-check
  PASS. Two initial new assertion failures (router-added attribute and a regex
  matching text-transform) corrected; full suite rerun PASS. Existing Vite
  projectRepository chunk warning remains non-blocking.
- Visual QA NOT VERIFIED: no browser available in tool inventory. Manual widths
 375/768/1024/1280/1440 and zoom100/200% remain to check. No claim of visual PASS.
- Gemini calls0; MongoDB writes0; no uncertain-attempt changes, Customer/Backend/
  Mobile/Admin/config/business changes, commit/push or work beyond S27.3.5.

## S27.3.4 — Final Public Museum Narration Listing (2026-10-23)

- Refined listing-only hero/spacing and centered featured video card: max1120px,
  1.1:1 two-column desktop layout, unchanged16:9 real poster, readable title/body,
  24–40px gap/20–32px padding. Tablet≤1023px/mobile stack thumbnail before copy.
  Added decorative Play SVG and explicit token focus ring to the existing public
  detail-navigation CTA; no autoplay/player/API/business changes or new media/data.
- Shared Header/Footer/font/tokens, exact breadcrumb/title/description, catalog
  publication/rights guards, empty states and detail language/player logic intact.
  No fake content or development notices added. No fixed-height Footer spacer.
- Changed: MuseumVideosPage.tsx, museum-video.css, museum-routing.test.mjs and
  UI/PROGRESS docs. Existing unrelated dirty work preserved. No Customer/Mobile/
  Admin/Backend/config/database changes, Gemini calls, uncertain-attempt operations,
  commit/push or work beyond S27.3.4.
- Browser inventory empty: Visual QA NOT VERIFIED; actual widths375/768/1024/1280/
  1440, zoom100/200%, hover/focus/keyboard and poster crop require manual checking.
- Validation: Web340/340 PASS,0 skipped/failed; lint/typecheck/production build and
  diff-check PASS. New mock/SSR tests cover listing-only scope, exact existing data,
  thumbnail-first DOM order, decorative Play/navigation,1120px bounds, tablet stack,
  focus and absence of fixed-height fillers; existing player/security tests pass.
  Build used approved sandbox escalation; existing projectRepository mixed-import
  warning remains. Gemini0, MongoDB writes0; no approve/TTS/render or retries.

## S27.3.3.1 — Clean Public Museum UI Text (2026-10-23)

- Removed development/future-approval copy and exhibition preparation badges from
  Explore/Home and the global Footer development notice. Preserved useful intro,
  all topic titles/descriptions/assets and non-interactive unpublished cards.
  Neutral About/video/image absence feedback replaces development promises; local
  alt text no longer contains demo-stage commentary. Existing image/source/license
  documents unchanged, no fake publication/content or functionality introduced.
- Essential language/media availability, loading/error/security/Not Found, public
  transcript absence and credit/license feedback preserved. No API/route/business
  or shared design-system changes. No Customer/Mobile/Admin/Backend/data changes,
  Gemini or MongoDB writes, uncertain-attempt operations, commit/push.
- This step modifies MuseumExplorePage.tsx, MuseumHomePage.tsx, MuseumVideosPage.tsx,
  MuseumExhibitionPage.tsx, MuseumPlaceholderPage.tsx, MuseumFooter.tsx,
  MuseumHomeImage.tsx, homeImages.ts alt text, museum-routing.test.mjs,
  museum-home-images.test.mjs and UI/PROGRESS docs. Prior dirty work preserved.
- Validation: Web338/338 PASS,0 skipped/failed; lint/typecheck/production build and
  diff-check PASS. Added public-route regressions for absence of development copy,
  intact images/titles and inert cards, retained language states and error paths.
  Build used approved sandbox escalation; existing mixed-import warning remains.
- Visual QA NOT VERIFIED: no browser surface available; actual viewport/zoom,
  whitespace and focus checks require manual review. Only S27.3.3.1 performed.

## S27.3.3 — Public Museum Explore (2026-10-23)

- Refined `/kham-pha` title/breadcrumb/intro/section spacing and replaced its single
  unpublished-content placeholder with three image preparation cards. Reused exact
  homepage exhibitionHistory/People/Peace slots and their existing images/copy.
  No new images or demo captions. Static Đang chuẩn bị badges, no dead links/buttons;
  original public Thuyết minh CTA preserved. Responsive3/2/1 grid,16:10 images,
  equal-height natural-flow cards and comfortable catalog/Footer separation.
- Published catalog/detail behavior, source validation, all routes/API/business
  rules, shared Header/Footer/tokens, homepage and Customer UI unchanged. The new
  preparation descriptors are presentation-only, not fake published exhibitions or
  database data. Existing source/license docs and image files left intact.
- Changed this step: MuseumExplorePage.tsx, museum-explore.css,
  museum-routing.test.mjs, docs/UI.md and docs/PROGRESS.md. Preserved three prior
  dirty files/edits from homepage caption removal; no reset/checkout/commit/push.
- Validation: Web337/337 PASS,0 skipped/failed; lint/typecheck/production build and
  diff-check PASS. New tests cover exact shared images, alt/loading/dimensions,
  three preparation states, no fake detail route or interactive preview, missing
  image fallback and responsive rules; existing published-content regressions pass.
  Build used approved sandbox escalation; existing mixed-import advisory remains.
- Visual QA NOT VERIFIED: browser inventory empty. Manually check375/768/1024/1280/
  1440px, zoom100/200%, crop/overflow/focus and bottom spacing. No Backend/Mobile/
  Admin/API/config/data changes, Gemini calls or MongoDB writes, attempt retry/reset
  or work beyond S27.3.3.

## S27.3.2.5 — Refine Multilingual Section (2026-10-23)

- Updated only the homepage multilingual description/cards: existing language icon,
  Vietnamese heading/English subtitle hierarchy, neutral static preparation badge,
  compact14px padding and4/2/1 grid. No flags, links, selectable state, audio/provider
  feature or fake content; all four languages/preparation statuses retained.
- Files: MuseumHomePage.tsx, museum-home.css, museum-routing.test.mjs, UI/PROGRESS
  docs. Other sections, shared icon implementation and unrelated dirty work intact.
- Browser inventory empty: Visual QA NOT VERIFIED; actual375/768/1024/1280/1440
  wrapping/zoom/focus still require manual QA. No Customer/Backend/Mobile/Admin,
  API/config/data/attempt changes, Gemini/MongoDB writes, commit/push or next step.
- Web333/333 PASS,0 skipped/failed; lint/typecheck/production build/diff-check PASS.
  Mock/SSR regressions cover exact description, four languages, decorative SVGs,
  no interactive controls/flags/media, neutral badges and4/2/1 layout rules.
  Existing Vite projectRepository mixed-import warning remains non-blocking;
  build used approved sandbox escalation. No new dependencies.

## S27.3.2.4 — Final Museum Homepage Cleanup (2026-10-23)

- Removed development-only captions and section image notice from homepage.
  MuseumHomeImage filters the known development caption only, keeps source/credit
  captions and alt text, and never renders empty caption elements. Removed stale
  shared-notice props/ARIA/CSS and extra explicit Hero grid row; existing sizes,
  images, functional states and navigation preserved. User image-use approval
  recorded without inventing license/author/history metadata.
- Changes: MuseumHomePage.tsx, MuseumHomeImage.tsx, museum-home.css,
  museum-routing.test.mjs, museum-home-images.test.mjs; UI/PROGRESS/MUSEUM_IMAGES docs.
  No Customer/Mobile/Admin/Backend/config/API changes, data/attempt operations,
  Gemini or MongoDB writes, commit/push or next-page work.
- Browser inventory empty: Visual QA NOT VERIFIED. Viewport375/768/1024/1280/1440
  spacing/crop/focus and actual absence of odd whitespace require manual review.
- Validation: Web332/332 PASS,0 skipped/failed; lint/typecheck/build/diff-check PASS.
  Tests verify all six images still render with alt/loading/dimensions but no demo
  captions/notice/empty caption nodes, fallback and individual credits preserved.
  SHA-256 image inventory unchanged. Existing Vite mixed-import advisory remains;
  approved sandbox escalation used for build. Gemini0, MongoDB writes0.

## S27.3.2.3 — Museum Homepage Visual Refinement (2026-10-23)

- Compact homepage-only Header/Footer via PublicMuseumLayout pathname modifier;
  balanced500px-minimum Hero,44–52px desktop heading,32–48px section spacing,
 480px intro/520px video media bounds,16px cards, compact image notice and closing
  CTA. Existing content, demo assets, poster, routes, preparation states, theme and
  Customer functionality preserved. Measurements before/after in docs/UI.md.
- No six browser screenshots were supplied in this turn. Browser inventory empty;
  Visual QA NOT VERIFIED: requested widths375/768/1024/1280/1440, zoom100/200%, crop,
  keyboard/focus and overflow must be checked manually. No claimed visual PASS.
- Changes: PublicMuseumLayout.tsx, museum-home.css, museum-layout.css,
  museum-routing.test.mjs and UI/PROGRESS docs. Existing uncommitted work preserved.
  No Backend/Mobile/Admin/config/API changes, Gemini calls, MongoDB writes,
  uncertain-attempt operations, commit/push or next-page work.
- Validation: Web332/332 PASS,0 failed/skipped; lint/typecheck/build/diff-check
  PASS. Two assertion issues fixed: text-transform incorrectly matched a transform
  scaling ban; shared breakpoint-order test now scopes shared styles separately
  from homepage-only overrides. Production build used approved sandbox escalation;
  pre-existing projectRepository mixed-import advisory remains non-blocking.

## S27.3.2.2 — Final Museum Homepage / Full-width Hero (2026-10-23)

- Implemented full-width cover Hero with navy gradient and safe separate caption,
  balanced intro,3/2/1-column equal-height editorial cards, single shared demo
  notice with accessible associations, language-card spacing, equal video columns
  and unified closing CTA panel. All publication/CTA/authentication behavior intact.
- Existing six demo images and real video poster preserved; inspected Hero locally
  (1960x1102), no image edits/downloads/generation. Existing shared navy Footer was
  reviewed and retained to avoid unrelated page changes. No Customer/Mobile/Admin/
  Backend/config/API changes. No Gemini, MongoDB writes, attempt retry/reset or
  commit/push; no S27.3.3 work.
- Mock/SSR tests cover full-width Hero/content/caption/CSS bounds, fallback through
  image errors, shared-vs-individual captions, cards and existing public/protected
  routes. Browser unavailable: Visual QA NOT VERIFIED at all requested sizes/zoom;
  visual crop/sharpness, keyboard and overflow require manual verification.
- Validation: full Web330/330 PASS,0 skipped/failed; lint/typecheck/production build
  PASS. Build used approved sandbox escalation; existing projectRepository mixed
  dynamic/static import advisory remains non-blocking. git diff --check PASS.
- Files for this step: MuseumHomePage.tsx, MuseumHomeImage.tsx, museum-home.css,
  museum-routing.test.mjs, museum-home-images.test.mjs, UI.md, PROGRESS.md and
  MUSEUM_IMAGES.md. Earlier uncommitted work preserved.

## S27.3.2.1 — Museum Homepage Image Slots (2026-10-23)

- **Implementation/tests PASS; visual QA NOT VERIFIED.** Added six centralized
  local image slots and public/museum/images/.gitkeep, no demo/generated images.
  Hero/introduction, three preparation cards and featured-video area share an
  accessible image/fallback component. Real approved poster retained and preferred
  for its featured video; no media replaced or moved. Custom/demo images are
  visibly labeled unverified presentation assets, not historical evidence.
- Web **327/327 PASS**,0 failed/skipped; lint/typecheck/production build and
  diff-check PASS. One new assertion initially included the section's legitimate
  Explore CTA; corrected scope to cards. Build required sandbox escalation after
  spawn EPERM; existing projectRepository mixed-import advisory remains.
- Browser inventory empty: responsive viewport375/768/1024/1280/1440,200% zoom and
  actual image-failure visual behavior NOT VERIFIED. Mock tests cover six slots,
  loading/alt/dimensions, missing assets, poster priority/publication guards and
  error fall-through. User copy/replacement guidance: docs/MUSEUM_IMAGES.md.
- Changes limited to homepage page/CSS, MuseumHomeImage.tsx, homeImages.ts,
  publicMediaAssets.ts inventory, .gitkeep, two Web tests and related docs.
  No Customer/Mobile/Admin/Backend, route/API/business changes; existing dirty
  work preserved. Gemini0, MongoDB writes0, no reset/retry, commit/push or next-page work.

## S27.3.2 — Public Museum Homepage (2026-10-23)

- **SOURCE/TEST PASS; visual QA NOT VERIFIED.** Refined public homepage Hero/title/
  lead/CTA/media proportions, introduction editorial rule, section/card spacing,
  blue section backgrounds and closing CTA. Shared Public Header/Footer CSS now
  wraps long labels and reflows on narrow screens, with existing navigation/dialog
  logic intact. Exact approved blue palette and Customer work preserved.
- Existing authorized video poster reused for Hero only when catalog publication,
  rights and public asset checks pass. Real 640x360 frame inspected locally; no crop,
  generated image, hotlink, new asset or changed source catalog. Explicit dimensions,
  alt/caption and image-error/missing-asset fallback. A higher-resolution approved
  museum photo is still desirable; fallback is not claimed as a real photograph.
- Three editorial groups/four target languages and homepage video placeholder stay
  as existing preparation states. No new exhibition/history/media capability/data.
- Full Web **320/320 PASS**, lint/typecheck/build/diff-check PASS; existing Vite
  projectRepository dynamic-import warning unchanged. Browser inventory empty:
  viewport375/768/1024/1280/1440, zoom200%, actual page scrolling and focus NOT VERIFIED.
- This step changes only frontend-web/src/pages/MuseumHomePage.tsx,
  src/styles/{museum-home,museum-layout}.css, tests/museum-routing.test.mjs,
  docs/UI.md and this file. No Customer/Mobile/Admin/Backend/config changes;
  Gemini **0**, MongoDB writes **0**, attempt retries/resets **0**, commit/push NO.
- Stop at S27.3.2. Before S27.3.3: browser visual regression for homepage/public shell;
  obtain approved high-resolution Hero image if available. No next step started.

## S27.3.1.1 — Restore blue Public / Customer Web theme (2026-10-23)

- **SOURCE/TEST PASS; visual QA NOT VERIFIED.** Selective color-only patches restore
  original Customer resolved color tokens and blue hero gradient, preserving shared
  aliases, typography/layout/accessibility and earlier S27.2.1/1.1 work. Public Museum
  now shares blue/purple/navigation/CTA/cards/breadcrumb and navy footer, not wine.
- Current palette: #5850EC primary, #794CFF accent, #111C32 dark/sidebar, #F8FAFC
  background, #F1F5F9 section, #FFFFFF cards. Warm brand colors/names removed from CSS;
  only semantic error/warning red/yellow and real unmodified imagery can retain warm
  colors. Success and processing/info remain green and blue respectively.
- Changed this step: frontend-web/src/styles/{tokens,museum-theme,museum-layout,
  museum-home,auth,components,dashboard,shell,projects,upload,workflow}.css;
  tests/{unified-web-theme,design-tokens,museum-design-system,dashboard-foundation,
  shell-refinement,sidebar-navy-theme}.test.mjs; docs/UI.md and this file.
- Full Web **317/317 PASS**, lint/typecheck/build/diff-check PASS. Browser inventory
  empty, no actual viewport/zoom verification. Existing Vite dynamic import warning
  unchanged. No API/provider/business/route/asset/config changes; no database access,
  Gemini calls, attempt reset/retry, commit or push. No destructive Git operations.

## S27.3.1 — Unified Web design system (2026-10-23)

- **SOURCE/TEST PASS; visual QA NOT VERIFIED.** Shared palette: primary #7B252B,
  background #FAF7F0, section #F1E8D8, dark #242321, accent #B58A4B, card #FFFFFF.
  Public Museum and Customer/auth now share primitive/semantic tokens while Museum
  editorial typography/container variants remain scoped. Be Vietnam Pro retained;
  common component spacing/radius/shadows aliased without business layout changes.
- Customer purple hardcodes removed from sidebar/profile/account, auth, upload,
  hero/chart decoration, focus and workflow. White-label CTA avoids a low-contrast
  bronze gradient; functional bronze ink and strong borders have separate tokens.
  Success/warning/error/info values and chart statuses retained. Processing marker
  stays semantically blue rather than inheriting brand red; UNCERTAIN warning intact.
- New tests cover shared palette resolution/no cycles, measured contrast pairs,
  unchanged status tokens and absence of old purple. Historical palette assertions
  updated only for the newly approved Web identity; Mobile assertions unchanged.
  Full Web **317/317 PASS**, lint/typecheck/build/diff-check PASS. Existing Vite
  ineffective dynamic import warning remains. Browser apps/browsers empty: actual
  responsive 375/768/1024/1280/1440px and zoom/interaction visual checks NOT VERIFIED.
- Files for this step: frontend-web/src/styles/{tokens,museum-theme,museum-home,
  account,auth,components,dashboard,project-detail,projects,results,shell,upload,
  workflow}.css; frontend-web/tests/{dashboard-foundation,design-tokens,header-profile,
  museum-design-system,shared-foundation-accessibility,shell-refinement,
  sidebar-navy-theme,unified-web-theme}.test.mjs; docs/UI.md and this file.
- Earlier S27.2.1/1.1 changes preserved; no changes to Translation logic, routes,
  Backend/Mobile/Admin, config, real images/logo/content, data or dependencies.
  Gemini calls **0**, MongoDB writes **0**; no bom dan reset/retry or commit/push.
- Stop at S27.3.1. Remaining work: real-browser visual regression for Public/Customer/
  auth and per-page spacing/contrast confirmation; no subsequent step activated.

## S27.2.1.1 — Final Translation UI source review (2026-10-23)

- Consolidated duplicate summary/attempt panels into one compact status card;
  unchanged provider/UNCERTAIN safety text and GET-only result check remain visible.
  Reduced vertical padding without fixed height, truncation or sticky overlays;
  added scroll clearance for focusable feedback, group/review cards and disclosure.
- Mock render checks confirm one PageHeader, project heading, WorkflowSteps and
  attempt-result action across pending/uncertain/failed/expired states. Router page
  selects one workspace branch; no extra workspace header was added.
- Full Web regression **313/313 PASS**, lint/typecheck/production build PASS;
  existing ineffective projectRepository dynamic-import warning remains.
- Visual QA **NOT VERIFIED**: no screenshot supplied for this request, browser
  inventory apps/browsers empty. Top/middle/bottom scrolling, target viewports and
  zoom still need real browser comparison, not inferred from source/mock checks.
- No Backend/API/config/database changes, Gemini requests, attempt retry/reset,
  commit or push. Prior S27.2.1 work preserved.

## S27.2.1 — Customer Translation UI polish (2026-10-23)

- **SOURCE/MOCK PASS; visual QA NOT VERIFIED.** Corrected AI confirmation to explain
  durable Customer draft storage before approval; approved group translations and
  legacy saved records have separate labels. Processing/UNCERTAIN/provider warnings
  remain prominent; GET-only result recovery and all submission/approval guards stay.
- Renamed local close action to “Đóng bản xem nháp” with truthful non-deletion/reload
  guidance. No reject/delete API or change to draft persistence was introduced.
- SIMPLE diagnostics now follow main content in an initially collapsed native
  disclosure, still development-only/manual GET and never authorize generation.
  Token-based responsive cards/actions, heading hierarchy, language attributes,
  disabled-action guidance, live feedback and manual-result focus added.
- Full Web tests **311/311 PASS**, focused group/Customer/SIMPLE **32/32 PASS**;
  lint/typecheck/build/diff-check PASS. Sandbox EPERM required no-child-process test
  isolation and approved build escalation. Existing projectRepository dynamic import
  warning remains. Browser inventory empty: target widths/200% zoom/real keyboard
  and screen-reader testing NOT VERIFIED. No live Customer/API test performed.
- Changed: frontend-web src pages/TranslationPage.tsx, features/translation/
  {GroupTranslationWorkspace.tsx,CustomerSimplePreflight.tsx}, styles/translation.css;
  tests/{group-translation.test.mjs,simple-preflight.test.mjs}; docs/UI.md and this file.
- Gemini calls **0**, MongoDB writes **0**, config/Backend changes **0**; existing
  bom dan UNCERTAIN attempt untouched. No Museum/Admin/Mobile changes, commit/push.
- Before S27.2.2: manually verify translation reflow/focus and states using safe mock
  fixtures; then proceed to Transcript UI polish without changing AI/workflow guards.

## AI-TRANSLATE-05.8.4L — Dynamic controlled project binding (2026-10-22)

- **Implementation/mock PASS; real execution not authorized/activated.** Runtime
  policy no longer hardcodes museum project/revision/digest. Strict permit schema
  accepts valid project ID/positive revision/SHA-256 bindings with unchanged model,
  thinking approval, expiry/request/token/transport caps. Immutable fingerprint and
  exclusive fsynced marker logic unchanged, no reset/refund or old permit reused.
- Added internal read-only execution-binding helper and pure pre-issuance grant
  comparison. Verifies available CUSTOMER/owner, vi/en support, project status,
  jobs/English records/local drafts, bounded source and final revision, computes
  canonical source/input/ordered-plan hashes server-side. No public issuer or
  client-authoritative digest. Deployment remains attested config/hello + hostname.
  Startup revalidates source before durable fence open; each SDK stage revalidates
  again. Existing JWT/RBAC/ownership and exact-permit project scope preserved.
- Controlled source cap now **98304 bytes /10000 segments**, no 128 KiB override;
  execution/readiness/admission/collector guards consistent. Production defaults
  unchanged. Oversize fails before provider/claim. Existing museum data/permits and
  unrelated changes untouched. Historical museum read-only script now owns its
  historical constants instead of treating them as runtime authorization.
- Web GET-only viewer takes dynamic route project and validates server status scope
  before draft parsing. Consumed status includes safe scope metadata. Source errors,
  approval labels and generationEnabled=false retained; no legacy fallback or
  generation/approve action. Production viewer absent; visual QA NOT RUN.
- New pure/mock binding tests cover independent A/B sources, owner/customer/role,
  language/job/artifact/draft conflicts, source/cap/revision/order, input/plan/source/
  deployment mismatch, expiry and absent execution scope. Real localhost HTTP/JWT
  tests verify A/B own scopes and cross-owner/project rejection, no provider methods.
  Existing consumed-marker/status tests PASS; **11 Linux-only durable/SDK tests skip
  on Windows**, not counted as replay/restart PASS for this revision. Combined
  Backend regression: **71 discovered, 60 PASS, 0 FAIL, 11 SKIPPED**; new dynamic
  binding tests **7/7 PASS**. Full Web **277/277 PASS**. Backend/Web lint, typecheck
  and production builds PASS; git diff --check PASS. Existing Vite chunk warning
  unchanged. Browser/live source verification NOT RUN. No isolated DB or Docker
  tests run; Linux durability revalidation remains a separate execution gate.
- Files this step: backend src controlled-development/{execution-binding.ts (new),
  execution-server.ts, execution-source.ts, execution-status.ts, server.ts}; services/
  translation/{controlled-target.ts, controlled-development.ts, one-use-permit.ts,
  bounded-source.ts, group-admission.ts}; tests/{dynamic-execution-binding.test.ts
  (new), controlled-development.test.ts, controlled-execution.test.ts,
  controlled-execution/fixtures.ts, controlled-execution/http.test.ts,
  controlled-status.test.ts, read-only-museum-source.preflight.ts,
  read-only-translation-diagnostic.test.ts}; frontend controlledPreviewClient.mjs/
  .d.mts, ControlledTranslationPreviewPage.tsx, controlled-translation-preview tests;
  docs/API.md, docs/UI.md, docs/PROGRESS.md, controlled execution README.
- Database writes **0**, Gemini calls **0**, real permit issuance/claims **0**;
  no runtime start, credential/session changes, global flags, museum data changes,
  volume access/reset, dependencies, commit or push. New tests use in-memory
  synthetic approved-shaped objects only, never open durable permit storage.


## AI-TRANSLATE-05.8.4I — New video preflight & source-limit UI (2026-10-22)

- Development diagnostic generalized from pinned museum project to any CUSTOMER-
  owned project using existing ID/ownership middleware. Production remains denied.
  Old controlled execution/permit remains museum-pinned; no authorization or provider
  changes. Global GROUPS_V1 flags and 98304-byte/10000-segment caps unchanged.
- Below-cap source checks reuse loadSource/canonical digest/candidateGroups and
  ordered coverage, allowing arbitrary valid revisions/counts. Over cap never plans
  or materializes full source; safe actual bytes/count or lower bound returned.
  English records/jobs and process-local RAM draft checks retained, global absence
  UNKNOWN. Source readiness does not certify model access or authorize generation.
- Added manual GET-only check in existing Translation workflow for each own project,
  retry=false with timeout/abort, explicit Vietnamese oversize/status messages and
  actual numeric limits. Development legacy/group generation and retry controls stay
  disabled; production unchanged. Existing /projects/new link only navigates, no fake
  data/new project/upload/AI executed; museum media/transcript untouched.
- Backend focused diagnostic 9/9 and combined mock regression **48/48 PASS**. Web
  focused tests **5/5 PASS**, including SSR Vietnamese message/limits and mutation
  guard checks. Full Web suite **276/276 PASS**, no failures/skips. Backend/Web lint,
  typecheck/build PASS; existing Vite chunk warning unchanged. Three old source-
  structure assertions updated to reflect wrapper-key and stricter generation guard;
  no Museum tests or application files touched. Browser/live diagnostic/upload NOT RUN.
- Files in this step: backend route + read-only-diagnostic service/test; frontend
  TranslationPage, GroupTranslationWorkspace, TranslationSourcePreflight component,
  sourcePreflight helper/types, source-preflight tests and three related regression
  assertions; docs/API/UI/PROGRESS. All earlier uncommitted work preserved.
- Database writes **0**, Gemini calls **0**, permit claims **0**, runtime unlock **0**;
  no session writes, global flags, dependencies, commit or push. Short video eligibility
  depends on actual transcript bytes/count, not a promised duration threshold. Real
  translation remains blocked pending separate execution authorization/integration.


## AI-TRANSLATE-05.8.4G — Controlled read-only diagnostic (2026-10-22)

- Minimal development-only ordinary Backend GET `/api/projects/:id/translations/read-only-diagnostic`; JWT/CUSTOMER/ownership plus exact museum project. Production/wrong scope 404. Source code only, runtime not restarted/unlocked and no user browser credentials accessed.
- Bounded numeric source-size observation then existing loadSource/canonical digest/group coverage only below unchanged 98304-byte cap. Source above cap returns BLOCKED_SOURCE_CAP with measured actual bytes when available, no full source retained/planned and no CURRENT/group PASS claim. Metadata-only existence checks for persisted English records and active English jobs; local RAM draft count has PROCESS_LOCAL_ONLY/global UNKNOWN, never claims all processes inspected.
- No provider, mutation, permit, controlled scope, hidden source-cap override, feature flag activation or authentication change. No login/refresh, TTS/FFmpeg or source/translation DB writes. Snapshot checks are observations, not concurrency locks. Existing uncommitted Museum/Admin/controlled work preserved.
- Focused diagnostic tests **9/9 PASS**; combined diagnostic/GROUPS_V1/legacy/status regression **48/48 PASS**, no skips. Backend lint/typecheck/build and diff-check PASS. Includes exact 98304/98305 UTF-8 byte boundary. Live diagnostic NOT RUN (requires user-initiated authenticated GET with retry=false). Known historical snapshot 105958 >98304 means expected source-cap blocker, not a new measured live result. Gemini calls=0, DB writes=0, permit claims=0, commit/push NO.


## WEB-TRANSLATE-03 — Customer Web controlled preview UI (2026-10-22)

- **Controlled entry/status/draft viewer source + mock PASS; real runtime/browser NOT RUN.** Added DEV-only lazy authenticated route with inner opt-in/exact-project gate. Default flag OFF and explicit dedicated loopback origin required. No change to legacy guard, ordinary API origin, GROUPS_V1 global flags or real execution startup.
- GET-only client consumes existing authenticated controlled-status/draft endpoints, never POST/refresh/retry/fallback. READY/BLOCKED/REQUEST_CONSUMED reflect validated response; transport/auth/unknown fail closed. generationEnabled=false is required, no generation/approve action added. No random permit ID, token in URL/logs, secret configuration or real permit consumption.
- Read-only draft viewer accepts existing UUID, validates draft source/scope/format/expiry/group structure, shows Vietnamese snapshot and English text with timestamps. No draft yields honest unloaded/error state, not artificial content. Existing draft GET auth verified with real HTTP/JWT middleware and mocked persistence/service; no provider dispatch or DB connection used. Viewer does not certify CURRENT provenance after later edits.
- Validation: **271/271 Web tests PASS** (17 new); **58/58 Backend focused mock tests PASS**, no skips. Web lint/typecheck/production build and backend lint PASS; diff-check PASS. Production controlled-page/status markers absent. Initial regression failures were VM test harness unable to parse new import.meta flag in router; moved opt-in into the isolated DEV page without modifying Museum tests/pages. A test regex accidentally matched LOCKED inside BLOCKED and was corrected. Build sandbox spawn EPERM resolved by approved local build execution. Existing projectRepository chunk warning unchanged.
- Changed this step: frontend-web/.env.example; src/routes/AppRouter.tsx; src/features/translation/controlledPreviewClient.mjs and .d.mts; src/pages/ControlledTranslationPreviewPage.tsx; src/styles/controlled-translation-preview.css; tests/controlled-translation-preview.test.mjs; backend/tests/controlled-status.test.ts; docs/UI.md; docs/PROGRESS.md; infra/backend-controlled-execution/README.md. Earlier uncommitted Backend/permit work retained.
- Manual instructions in controlled README. Do not arm real execution just to view this screen. Missing runtime/credentials/permit correctly remain blocked; no real English draft exists yet. Gemini calls **0**, development/production/all DB writes **0**; no real permit provisioned/consumed/reset, global flags enabled, AI/TTS/render, commit or push.


## WEB-TRANSLATE-02 — Controlled translation Web integration (2026-10-21)

- **Web integration BLOCKED; read-only status foundation source/mock PASS.** Following task item 10, stopped at the missing authenticated readiness contract instead of wiring a browser generation action. No Customer Web, MUSEUM, ADMIN07, provider dispatch, production limits or global flags changed.
- Added dedicated execution status GET behind existing JWT/CUSTOMER/available-user/ownership and exact permit-owner/project checks. Read-only permit evidence checks do not create/open/rearm/consume grants; missing/corrupt state fails closed, any spent allowance returns REQUEST_CONSUMED. Bounded source verification checks the existing revision/digest/input/coverage binding and exact MEDIUM configuration. Response never includes secrets/text/raw errors and is no-store.
- READY is local evidence only and still has generationEnabled=false; no provider readiness is inferred. LOCKED/missing-credential runtime does not expose authenticated status; DRAFT_READY/Web preview controls remain future integration work. Existing draft GET and one-use SDK dispatch are unchanged. No real permit provisioned/consumed, runtime activated, provider called or draft created.
- New status tests **13/13 PASS**. Combined controlled status/execution/readiness/GROUPS_V1/Gemini/legacy mock suite: **74 discovered, 63 PASS, 0 FAIL, 11 Linux-only skips on Windows**. Includes source/permit mismatch, malformed/expired/missing claims, status concurrency, JWT/RBAC/deleted-user/ownership, GROUPS_V1 mock draft/approval and legacy fail-closed regressions. Linux durability was not rerun; no integration DB tests. Backend lint/typecheck/build PASS. Initial sandbox test launch hit spawn EPERM; same mock-only tests passed with approved execution permission. Browser NOT RUN.
- Gemini requests **0**; development/production DB writes **0**, all DB writes **0**. Only disposable synthetic files/HTTP mocks used and cleaned. Prior uncommitted work preserved; no commit/push. Next: separately implement the gated dedicated-origin Web client/status UX and exact approved permit binding, then mock validate before considering any real execution.


## UI07.6.6.1 — Transcript Revision & Downstream Provenance Foundation (2026-10-19)

- **COMPLETED — source/unit/mock validation; DB integration NOT RUN.** Đã thêm schema additive cho monotonic Transcript/Translation/Narration revision, source provenance trên Translation/Narration/Result và source snapshots trên ProcessingJob. Không có default giả: legacy thiếu field vẫn UNKNOWN.
- Helper chung phân loại CURRENT/STALE/UNKNOWN trên toàn chuỗi. Translation/TTS/video capture source revision khi bắt đầu và revalidate trong transaction trước commit; workflow batch loại STALE/UNKNOWN khỏi evidence. Không xóa artifact cũ, không đổi status hàng loạt, không migration/seed và không thêm index.
- Transcription content write mới khởi tạo revision 1 hoặc tăng revision hiện hành bằng compare condition; `GET transcript` trả revision additive. Chưa thêm PATCH segment hoặc UI edit.
- Focused unit/mock tests bao phủ initialization/CAS, current-stale-unknown, legacy, chain mismatch, late job, STT revision initialization và workflow fail-closed: **57/57 PASS**. Backend lint/typecheck/build và `git diff --check` PASS.
- Database writes: 0; AI/TTS requests: 0; integration với MongoDB transaction cách ly: NOT RUN.

## UI07.6.6 — Manual Transcript Segment Editing (2026-10-19)

- **BLOCKED — audit completed; unsafe mutation not implemented.** Backend chưa có PUT/PATCH transcript, Transcript/Segment chưa có revision để chống concurrent overwrite, và frontend editor hiện read-only đúng với API contract.
- GROUPS_V1 có source revision/digest nhưng legacy `SEGMENTS_V1` chỉ kiểm tra segment IDs, nên sửa text tại chỗ có thể làm bản dịch cũ vẫn bị coi là current. Narration/Result không lưu source revision; workflow summary vẫn có thể đọc artifact READY cũ. Vì vậy chưa thể bảo đảm translation consistency hoặc ngăn TTS/Result dùng dữ liệu lỗi thời mà không mở rộng contract/schema.
- Đã ghi proposal fail-closed trong `docs/API.md`: compare-and-set bằng `expectedRevision`, owner-only single-segment mutation, transaction cập nhật segment/fullText/revision, lỗi 409 khi conflict và provenance/stale state không phá hủy cho Translation/Narration/Result. Cần người dùng phê duyệt schema/backward compatibility và policy artifact trước khi triển khai.
- Không sửa application source, không ghi Database, không gọi AI, không chạy migration/seed và không thay đổi Mobile/Admin. Browser verification không áp dụng cho UI chưa được triển khai.
- Validation không ghi DB: Web tests **197/197 PASS**, Web lint/typecheck/build PASS; Backend workflow + GROUPS_V1/Gemini translation mock tests **55/55 PASS**, Backend lint/typecheck/build PASS. Lần chạy test đầu trong sandbox gặp `spawn EPERM`; kết quả PASS là lần chạy lại ngoài sandbox, không có provider/Database write.

## UI07.6.5 — Remove Transcript Helper Text (2026-10-18)

- **PARTIAL — source validation; Browser Desktop NOT RUN.** Đã bỏ đúng năm chú thích được yêu cầu khỏi Transcript, gồm mô tả PageHeader, read-only notice, player security helper, thống kê cụm/phân đoạn và footer read-only. Empty-state instruction “Tạo bản ghi để bắt đầu kiểm tra” chỉ còn khi chưa có transcript và không phải thống kê động bị yêu cầu xóa.
- WorkflowRouteGuard, recovery khi route bị chặn, quyền tạo/thử lại, Stepper, player auto-load, segment/timestamp, action tiếp tục và các trạng thái loading/error/empty/unknown không đổi. CSS không dùng được dọn trong scope Transcript; không sửa shared guard hoặc màn hình khác.
- Regression xác nhận các helper không còn được render trong Transcript và bảo toàn protected player/no-autoplay. Web tests **197/197 PASS**; lint, typecheck, production build và `git diff --check` PASS. Build giữ warning dynamic/static import `projectRepository.ts` đã có từ trước; không sửa Backend/API/Database/Mobile/Admin, không commit/push.

## UI07.6.4 — Transcript Media Player Auto-Load & Reload Fix (2026-10-18)

- **PARTIAL — source/regression validation; Browser Desktop NOT RUN.** Root cause là `SourceMediaPlayer` trước đây chỉ gọi loader từ nút thủ công; Blob URL chỉ tồn tại trong component memory nên reload luôn quay lại nút tải. Player nay auto-load khi media metadata được Backend xác nhận, reload tự tạo lại Blob URL, vẫn dùng protected `apiBlob`/refresh-once và không autoplay.
- StrictMode probe được loại trước request bằng microtask + AbortSignal; request có lifecycle abort và timeout 120 giây, late result không set state, Blob URL được revoke khi unmount/đổi media. UI phân biệt loading/ready/empty/error/unknown, có retry tải và retry phát, không khởi tạo STT/Translation/TTS.
- Blob transport hiện giữ toàn bộ response trong browser memory. Auto-load bị chặn trên 100 MiB với thông báo streaming dependency; upload limit 500 MB không đổi. Phát tệp lớn hiệu quả vẫn cần Backend/auth contract cho native range streaming, chưa được thay đổi trong bước Frontend-only này.
- Focused source-playback tests đã bổ sung cho state decision, StrictMode single request, authenticated transport, reload/remount identity, timeout/cleanup, no-autoplay và no-AI mutation. Web tests **197/197 PASS**; lint, typecheck, production build và `git diff --check` PASS. Build giữ warning dynamic/static import `projectRepository.ts` đã có từ trước; không sửa Backend/API/Database/Mobile/Admin, không gọi AI, không commit/push.

## UI07.6.2 — Clickable Workflow Stepper (2026-10-18)

- **PARTIAL — source/regression PASS; Browser Desktop NOT RUN.** Stepper sáu bước nay điều hướng client-side bằng semantic React Router links tới Project Detail/Transcript/Translation/Voice/Generate/Result của cùng project. Bước đang hiển thị không tạo navigation; Enter và Space đều được hỗ trợ, cùng hover/active/focus-visible và lý do khóa bằng tiếng Việt.
- Quyền click fail-closed qua cả presentation resolver và `resolveWorkflowRouteAccess`: completed/current/processing/failed chỉ mở khi Backend workflow có bằng chứng phù hợp; upcoming, `BLOCKED/UNKNOWN`, workflow thiếu/mâu thuẫn, Result thiếu artifact và route cần ngôn ngữ nhưng thiếu provenance đều disabled. Query `language` chỉ dùng target đáng tin cậy; Stepper không tạo mutation và không thay thế deep-link guard ở trang đích.
- Regression bao phủ matrix 1–6, current/upcoming, matching và ambiguous FAILED, PROCESSING, missing/BLOCKED/UNKNOWN workflow, missing target language, project ID, keyboard semantics, route-guard reuse và no-mutation. Web tests **195/195 PASS**; lint, typecheck và production build PASS. Build giữ warning dynamic/static import `projectRepository.ts` đã có từ trước.
- Không sửa Backend/API/Database/Mobile/Admin, không gọi AI, không thêm dependency, không commit/push.

## UI07.6.1 — Premium Workflow Stepper Redesign (2026-10-18)

- **PARTIAL — source/regression PASS; Browser Desktop NOT RUN.** Shared WorkflowSteps đã được thay bằng horizontal stepper sáu bước dùng trực tiếp Backend workflow DTO. Bộ đếm, `aria-current` và trạng thái completed/current/upcoming chỉ xuất hiện khi workflow có bằng chứng nhất quán; `BLOCKED/UNKNOWN` và dữ liệu mâu thuẫn fail-closed về giao diện trung tính.
- Failure/processing stage chỉ được ánh xạ khi job type khớp `workflow.step`: TRANSCRIPTION → Bản ghi, TRANSLATION → Bản dịch, TTS → Giọng đọc, VIDEO_PROCESSING → Tạo thuyết minh. Project `FAILED` không rõ stage không còn bị trình bày sai như lỗi Transcript; render không tạo mutation, retry, job hay navigation.
- Card Navy/Purple/Be Vietnam Pro có header, trạng thái mô tả, progress line theo vị trí bước (không phải provider progress), marker có biểu tượng/nhãn, wrap tên dài, focus-visible, local horizontal scroll dưới 700px và reduced-motion. Project Detail cùng toàn bộ workflow pages, kể cả GROUPS_V1, dùng cùng contract.
- Web tests **190/190 PASS**; lint, typecheck và production build PASS. Build giữ warning dynamic/static import `projectRepository.ts` đã có từ trước. Không sửa Backend/API/Database/Mobile/Admin, không gọi AI, không thêm dependency, không commit/push.

## UI07.5.1 — Create Project Desktop UI Polish (2026-10-18)

- **PARTIAL — source/regression PASS; Browser Desktop NOT RUN.** Đã giảm density card và dropzone của `/projects/new`, bỏ guidance định dạng/500 MB bị lặp và giữ một bản có liên kết `aria-describedby`. File đã chọn vẫn hiển thị metadata/preview/thay/xóa/validation thật.
- Nút Quay lại/Tạo dự án và trạng thái Đang kiểm tra dùng chung vùng căn phải trên desktop; mobile vẫn full-width. Loading/disabled/cancel/retry/success và upload transport không đổi; không thêm progress phần trăm giả.
- Web tests **183/183 PASS**; lint, typecheck và production build PASS. `git diff --check` PASS sau cập nhật. Không sửa Backend/Mobile/Admin, không thêm dependency, không commit/push.

## UI07.4.1 — Fix Project Table Overflow & Pagination (2026-10-18)

- **PARTIAL — source/regression PASS; Browser Desktop NOT RUN.** Đã bỏ `min-width: 920px` gây tràn desktop, cân lại sáu cột theo `28/12/16/13/13/18`, tăng vùng Thao tác và cho nội dung dài wrap an toàn. “Mở bước gặp lỗi”, icon, route và workflow/data-state safety được giữ nguyên.
- Pagination đã bỏ dòng thống kê “Hiển thị x–y / tổng dự án”; ba control Trang trước / Trang hiện tại / Trang sau được căn giữa, không đổi logic hoặc API. Mobile hẹp vẫn cuộn trong vùng bảng riêng.
- Web tests **182/182 PASS**; lint, typecheck và production build PASS. `git diff --check` PASS sau cập nhật. Không sửa Backend/Mobile/Admin, không thêm dependency, không commit/push.

## UI07.5 — Create Project & Project Detail UI/UX (2026-10-18)

- **PARTIAL — source/regression validation; Browser Desktop NOT RUN.** Create Project có heading “Tạo dự án mới”, CTA “Tạo dự án”, back action, drag/drop có keyboard alternative, thông tin định dạng/500 MB và file preview/thay/xóa rõ ràng hơn; không thêm progress giả hoặc thay upload transport.
- Project Detail có PageHeader theo tên/status thật, workflow state feedback, progress từ Backend khi có, media state `ERROR/UNKNOWN/LOADING` tường minh, form label đầy đủ và DRAFT resume chọn/thay/xóa/cancel/retry. Không có mutation khi chỉ mở trang và không tự retry FAILED.
- CSS Detail đã tách khỏi Auth/Voice thành scope riêng; desktop có workflow summary cùng grid media/form, responsive một cột dưới 1100px. Logic create cleanup và existing-project upload vẫn tách biệt; upload lỗi/hủy của DRAFT không xóa project.
- Regression bổ sung cho title/CTA/drag alternative, file type/size, workflow/media states, DRAFT existing-ID safety, duplicate-submit boundary và CSS isolation. Không gọi AI/TTS, không ghi Database, không sửa Backend/Mobile/Admin và không commit/push.

## UI07.4 — Shared Typography, Page Header & Accessibility (2026-10-18)

- **PARTIAL — source/regression validation; Browser Desktop NOT RUN.** Đã đưa Be Vietnam Pro tự lưu lên toàn Customer Web qua global foundation, bổ sung `--font-size-xs`, giữ nguyên Navy/Purple và không đổi layout đã duyệt của Login/Register/Sidebar/Dashboard/Projects.
- Shared PageHeader có ID duy nhất và quan hệ title/description cho assistive technology; Empty/Error state không còn fixed ID; ProgressBar, PasswordField và PlaceholderPage dùng nhãn/copy tiếng Việt. Icon trạng thái dùng SVG hiện có thay cho ký tự trang trí.
- Focus-visible được tăng độ rõ; reduced-motion dừng spinner và bỏ transition không thiết yếu. Không đổi route, workflow, data-state contract, API hay business logic; không sửa Backend/Mobile/Admin và không thêm dependency.
- Regression mới bao phủ font/token, PageHeader, component IDs, nhãn trợ năng, focus và reduced motion. Browser Desktop 1024/1280/1440 **NOT RUN**; Mobile/Expo **DEFERRED**.

## UI07.3 — Web Data-State Integrity (2026-10-18)

- **PARTIAL — source/regression validation; Browser Desktop NOT RUN.** Đã loại bỏ fallback biến lỗi media thành `null` và lỗi translation thành `[]`; repository nay giữ trạng thái metadata riêng theo từng project: `READY/EMPTY/ERROR/UNKNOWN` và bảo toàn partial success.
- Project List, History và Project Detail không còn hiển thị “Chưa có tệp/Chưa dịch” khi request chưa được xác minh. Dashboard/History/Projects có cảnh báo dữ liệu chưa đầy đủ; empty toàn trang chỉ xuất hiện sau list API thành công với 0 bản ghi, còn list API lỗi tiếp tục dùng ErrorState/retry.
- Dashboard giữ tính toán từ status/createdAt đã xác nhận và không hạ enrichment lỗi thành số 0. Pagination completeness guard hiện có được giữ nguyên. Workflow action/guard từ UI07.2 không thay đổi.
- Regression bổ sung cho collection loading/ready/empty/error, media success/not-found/error, translation success/empty/error/unknown, partial project failure và feedback của ba màn hình. Không gọi AI, không ghi Database, không sửa Backend/Mobile/Admin/API/dependency, không commit/push.
- Backend vẫn dùng 2 enrichment request/project nên chi phí N+1 còn tồn tại; đây là rủi ro hiệu năng riêng, không được che bằng fallback. Browser Desktop và DB-backed integration UI06.7.2–3 vẫn pending.

## UI07.2 — Web Workflow Deep-Link Guards & Language Catalog (2026-10-18)

- **PARTIAL — source/regression PASS; Browser Desktop và Backend DB integration PENDING.** Đã áp dụng guard dựa hoàn toàn trên Backend workflow DTO cho Transcript, Translation, Voice, Generate và Result. Không redirect tự động, không mutation khi chỉ mở/reload URL; recovery fail-closed có focus và liên kết về Project Detail.
- Mutation chỉ được bật tại bước hiện tại khi `state` là `READY/FAILED` và `canResume=true`; `PROCESSING`/bước đã qua là chỉ đọc. `BLOCKED/UNKNOWN/missing`, future step, target mismatch và Result chưa có artifact đúng loại đều bị chặn. Artifact Result hợp lệ vẫn xem được khi `canResume=false`.
- Translation tiếp tục dùng Language active từ `GET /api/voices`, không static allowlist; test xác nhận `vi/en/ja/ko/zh/fr`. Voice/TTS vẫn cần Voice thật từ response lọc theo language; không tạo voice giả hoặc mặc định target. Nhãn ngôn ngữ mở rộng bằng `Intl.DisplayNames`.
- Web tests **165/165 PASS**; lint/typecheck/build và `git diff --check` được chạy trong validation UI07.2. Không gọi AI/TTS, không ghi Database, không sửa Backend/Mobile/Admin/API/dependency, không commit/push.
- Backend contract gap còn lại: `GET /api/voices` đang ghép Language translation và Voice catalog trong một response; frontend phân biệt bằng `voices`, nhưng API chưa có capability field riêng cho translation/TTS. Workflow DTO/audio terminal DB integration UI06.7.2–3 vẫn pending trên DB test cách ly.
- Browser Desktop: **NOT RUN**; Mobile/Expo: **DEFERRED**.

## UI07.1 — Full Website UI/UX Audit (2026-10-18)

- **AUDIT COMPLETED — source evidence only; Browser Desktop NOT RUN.** Đã audit 14 route pages Customer Web, AppShell/Sidebar/Topbar, shared components, page styles, feature hooks/services và 33 file test. Browser inventory trả `apps: []`, `browsers: []`; responsive 1024/1280/1440 chưa được xác nhận trực quan. Mobile browser/Expo **DEFERRED**.
- P0: `projectRepository` vẫn biến lỗi media/translation enrichment thành dữ liệu vắng và tạo 2 request phụ/project; workflow deep links chưa đồng loạt gate theo `workflow.state/canResume`; Voice/Generate/Result dùng static language list `vi/en/ja/ko` dù catalog runtime có thể gồm `zh/fr`; workflow DTO/audio terminal integration UI06.7.2–3 vẫn pending trên DB test cách ly.
- P1: Be Vietnam Pro mới áp dụng cho Dashboard/Projects, còn workflow pages kế thừa Inter/system; PageHeader/state hierarchy và CSS scope chưa đồng nhất; Generate còn hiển thị project status suy ra client; History tiếp tục tải toàn bộ pages rồi enrich client-side. Login/Register, Sidebar, Dashboard và các layout đã được duyệt được đánh dấu **preserve**, không đề xuất redesign lại.
- P2: shared Empty/Error state có ID cố định, fallback aria-label của ProgressBar còn tiếng Anh, token `--font-size-xs` chưa được khai báo và component PlaceholderPage chưa dùng còn copy tiếng Anh.
- Kế hoạch UI07.2–UI07.10 được ghi tại `docs/UI.md`: ưu tiên workflow/data safety, sau đó shared foundation, Create/Detail, Transcript/Translation, Voice, Generate/Result, auxiliary pages và cuối cùng browser/accessibility release gate.
- Không sửa application source, Backend/API/Database, Mobile/Admin, dependency hoặc dữ liệu; không gọi AI và không ghi DB. UI06.5/UI06.6 vẫn chưa có bằng chứng triển khai. Audit chỉ cập nhật `docs/UI.md` và `docs/PROGRESS.md`; không commit/push.

## UI06.7.4 — Web Workflow Navigation & DRAFT Resume (2026-10-18)

- **PARTIAL — frontend source/regression PASS; Browser Desktop và Backend integration pending.** Customer Web tiêu thụ `workflow` optional từ Project List/Detail DTO và ánh xạ `UPLOAD / TRANSCRIPT / TRANSLATION / VOICE / GENERATE / RESULT`; `UNKNOWN`, thiếu contract, blocked, provenance ngôn ngữ không hợp lệ hoặc destination chưa hỗ trợ đều fail-closed về Project Detail.
- `projectAction` không còn suy đoán failure stage từ `ProjectStatus`; FAILED chỉ mở bước do Backend cung cấp và không tự retry. Query `language` chỉ được tạo từ `workflow.targetLanguage` có provenance tin cậy và được màn hình đích hiện tại hỗ trợ.
- Project Detail có upload tối thiểu cho `UPLOAD + READY + canResume`: dùng đúng project ID và `POST /projects/:id/media`, giữ validation 500 MB/FormData field `file`, loading/cancel/error/success, retry và synchronous double-submit lock. Transport upload project hiện hữu không create/delete project; cleanup DELETE vẫn chỉ nằm trong wrapper tạo project mới.
- Opening/navigating không gọi STT/Translation/TTS/processing. Existing Create Project vẫn dùng flow create → upload; cache refresh sau upload là best-effort và không biến upload thành thất bại giả.
- Web tests **159/159 PASS** (gồm 6 workflow-navigation tests mới); lint, typecheck, production build và `git diff --check` PASS. Build giữ warning dynamic/static import `projectRepository.ts` đã có từ trước. Browser Desktop **NOT RUN** vì phiên làm việc không có browser/tab khả dụng; Database writes **0**, AI requests **0**, không sửa Backend/Mobile/Admin và không commit/push.

## UI06.7.3 — Audio-only Terminal State (2026-10-18)

- **PARTIAL — source/unit PASS; transaction integration PENDING.** TTS completion dùng Media hiện tại để đặt AUDIO `COMPLETED/100`, giữ VIDEO `GENERATING_AUDIO/100`; không dựa vào progress và không thay video Result rule.
- Narration READY, TTS job COMPLETED và Project terminal status nằm trong cùng transaction, có re-read owner/status/media/job và conditional update. Project/job bị xóa hoặc đổi state làm transaction abort; failure cleanup không ghi đè state mới. Active job khác trì hoãn terminal state và reconciliation transaction hoàn tất AUDIO khi workflow idle.
- Idempotent lookup đã bao gồm `projectId`; duplicate completion không gọi provider lại và có thể reconcile legacy AUDIO an toàn. Không schema/index/route/dependency change.
- Pure unit/mock suite `test:tts-terminal` **11/11 PASS**: audio/video decision, missing/wrong-project Narration, conflict, duplicate decision, video Result guard và toàn bộ workflow resolver UI06.7.2. DB integration tests đã được cập nhật cho Media fixture, AUDIO success/idempotency và failure, nhưng **NOT RUN** vì `.env` trỏ MongoDB SRV `multilingual_ai_narration` và suite ghi/xóa fixture.
- Backend lint, typecheck, build và `git diff --check` **PASS**. Database writes **0**, AI/TTS requests **0**, không commit/push.

## UI06.7.2 — Backend Workflow Summary Contract (2026-10-18)

- **PARTIAL — source/unit validation PASS; DB-backed integration NOT RUN.** `GET /api/projects` và `GET /api/projects/:id` bổ sung workflow summary additive; create/update DTO, route paths, state machine, schema/index và frontend không đổi.
- Resolver thu thập Media, READY Transcript/Translation/Narration, Result và latest ProcessingJob bằng sáu batch reads cố định cho cả page. Không có query theo từng Project; job latest dùng aggregate trên index `projectId + createdAt` hiện có. Project IDs luôn bắt nguồn từ query owner-scoped đã xác thực CUSTOMER.
- Đủ 10 ProjectStatus, target-language provenance, `progress=0`, audio/video artifact và FAILED fail-closed. Job lỗi thiếu/mâu thuẫn trả `UNKNOWN/BLOCKED`; raw provider error được loại bỏ và code không nhận diện được thành `PROCESSING_FAILED`.
- Unit regression mới **7/7 PASS**, bao phủ 10 status, cả bốn failure stage, progress/provenance, failure ambiguity/sanitization, audio/video artifact và six-read query guard. Project/Media integration đã bổ sung List/Detail backward compatibility + workflow và giữ IDOR hiện có, nhưng **NOT RUN** vì `.env` hiện trỏ MongoDB SRV database `multilingual_ai_narration` và suite có ghi/xóa fixture; không dùng database này khi chưa xác minh isolation.
- Backend lint, typecheck, build và `git diff --check` PASS. Sandbox ban đầu chặn tiến trình con của tsx/esbuild bằng `spawn EPERM`; focused unit suite chạy lại ngoài sandbox PASS.
- Không đổi MongoDB schema/index, không migration/seed, không gọi AI, không sửa Web/Mobile/Admin, không commit/push. Frontend chưa sử dụng summary; DRAFT upload resume và route mapping vẫn là scope tiếp theo.

## UI06.7.1 — Project Workflow Contract & Navigation Design (2026-10-18)

- **DESIGN COMPLETED — pending approval; no application/API/Database changes.** Verified existing routes/screens, DRAFT create-upload flow, owner-guarded media API, ProcessingJob types, STT/Translation/TTS/video state transitions, protected Result resolution and current workflow tests.
- DRAFT can reuse `POST /projects/:id/media`, but Web currently always creates a new project before upload. Proposed safe route is existing Project Detail with a reusable existing-ID upload component; failure must never delete that existing project.
- FAILED stage already exists in ProcessingJob but is not exposed to Customer Web. Frontend-only cannot recover it safely. Recommended additive `workflow` summary returns domain step/state, safe job/failure metadata, trusted target-language provenance and artifact readiness; frontend alone maps it to existing routes and never auto-retries.
- Audio-only recommendation: TTS success stores READY Narration and sets Project `COMPLETED`; video stays `GENERATING_AUDIO` until explicit composition reaches `PROCESSING_VIDEO` then `COMPLETED`. Existing Result UI already reads protected Narration as an audio artifact, so no fake Result record is needed.
- Option A frontend-only is lower risk but incomplete after reload and fail-closed for FAILED/ambiguous jobs. Option B frontend + minimal Backend contract is recommended for correctness and recovery. Required approvals: Option B, audio terminal semantics, Project Detail as DRAFT upload host, and whether failure correlation without a new Project job-reference field is sufficient.
- Detailed matrix, contract and regression plan are recorded in `docs/UI.md`. Mobile verification remains deferred. No tests/build were rerun because this step changes documentation only; `git diff --check` is required before handoff. No commit/push.

## UI06.7 — My Projects Navigation & Data Safety Review (2026-10-18)

- **AUDIT COMPLETED — không sửa application source.** Đã đối chiếu `/projects`, đủ 10 `ProjectStatus`, các route Transcript/Translation/Voice/Generate/Result, Project Detail Web/Mobile tham khảo, repository/filter/presentation hooks và Project API/ownership guards. Không tìm thấy bằng chứng UI06.5/UI06.6 đã được triển khai trong source, tests hoặc docs.
- Phát hiện P0: mapping hiện tại đẩy `TRANSCRIBING`, `TRANSCRIBED`, `TRANSLATING`, `TRANSLATED` và mọi `FAILED` vào `/generate`, trong khi các màn hình nghiệp vụ tương ứng nằm ở Transcript/Translation/Voice và `FAILED` không cho biết bước lỗi. `DRAFT` vào Transcript nhưng không có đường tiếp tục upload. Audio TTS hoàn tất không đưa project sang trạng thái terminal ở Backend.
- Phát hiện P0 về tính đúng dữ liệu: hai enrichment request/project nuốt mọi lỗi qua `Promise.allSettled`, khiến lỗi auth/network/server có thể bị trình bày thành `Chưa có tệp` hoặc `Chưa dịch`. Không có mutation nào được thực hiện trong audit.
- Fetch hiện tải toàn bộ page `limit=100` tuần tự rồi lọc/sort/page 10 ở client, đồng thời gọi media + translations cho từng project. Công thức HTTP ước tính `ceil(N/100)+2N`; tương ứng 21/201/2.010 request với 10/100/1.000 project, chưa tính DB queries nội bộ. Offset pagination thiếu tie-break/snapshot nên có rủi ro thiếu/trùng khi dữ liệu thay đổi trong lúc tải.
- URL deep-link/reload hoạt động với `q/status/period/sort/from/to/page`, nhưng invalid URL không được canonicalize; custom-date URL lỗi có thể hiện no-results thay vì validation; page vượt biên chỉ clamp presentation; dùng replace nên Back không lưu từng lần filter/page. JWT không nằm trong URL, Backend bắt buộc auth/role/ownership và chống IDOR bằng query `userId`/owner middleware.
- Web tests **153/153 PASS** sau khi chạy lại ngoài worker sandbox (lần đầu không chạy test nào vì `spawn EPERM`); lint, typecheck, production build và `git diff --check` PASS. Build còn warning dynamic/static import `projectRepository.ts` đã có sẵn. Browser Desktop **NOT RUN**: không có Backend/Web server lắng nghe ở các cổng dự án trong phiên audit. Mobile browser/Expo **DEFERRED**; không commit/push.

## UI06.4 — Professional Project Table Redesign (2026-10-17)

- **PARTIAL — source/regression PASS, browser visual verification pending.** Bảng `/projects` giữ nguyên sáu cột và semantic table, nhưng đã có `colgroup` chuyên nghiệp với Tên dự án chiếm `30%`, header xám nhạt, hàng `68px`, border đều, hover/focus-within nhẹ và typography Be Vietnam Pro `13/14px`.
- Tên dài/Unicode giữ nguyên, tối đa hai dòng và có full title; accessible name thêm ngày tạo, trạng thái và ID để phân biệt dự án trùng tên. Audio/Video dùng icon system hiện có; trường hợp thiếu `mediaType` vẫn báo `Chưa có tệp`, không suy đoán. Cặp ngôn ngữ, mười status mappings và badge semantics không đổi.
- Route chi tiết/workflow, filter UI06.3, pagination, dữ liệu/API và `projectAction` không đổi. Nhãn thao tác vẫn là `Tiếp tục`: nhãn `Thử xử lý lại` của `projectAction` chưa được đưa lên bảng vì route hiện chỉ mở màn hình xử lý, chưa chứng minh có mutation retry; chuyển việc đối chiếu nhãn–route sang UI06.7.
- Responsive dùng `min-width: 920px` và vùng cuộn ngang cục bộ có accessible name/focus, không làm tràn toàn trang. Thêm 6 regression tests cho sáu cột, tỷ lệ, tên dài/trùng/Unicode, media fallback, ngôn ngữ/status, route thao tác và accessibility/overflow.
- Web tests **153/153 PASS**; lint, typecheck, production build và `git diff --check` PASS. Build còn warning dynamic/static import `projectRepository.ts` có sẵn, không liên quan UI06.4. Browser visual/keyboard tại 320/375/768/1024/1440 **NOT RUN**. Không commit/push.

## UI06.3 — My Projects compact filter toolbar (2026-10-17)

- **PARTIAL — source/regression PASS, browser visual verification pending.** `/projects` có toolbar gọn gồm Search, disclosure `Bộ lọc` và Primary `Tìm kiếm`; bộ lọc Thời gian/Trạng thái/Sắp xếp cùng khoảng ngày tùy chọn được thu vào panel nâng cao, mặc định đóng. Table, pagination, Header và Sidebar không đổi.
- Draft/submit contract được giữ nguyên: toggle không áp dụng/xóa giá trị; submit hợp lệ ghi đủ `q/status/period/sort/from/to/page` và reset page về 1. `Đặt lại` chỉ reset draft; validation khoảng ngày mở panel và giữ dữ liệu nhập. Badge đếm advanced filters từ applied URL state nên không báo nhầm draft chưa áp dụng.
- Disclosure có `aria-expanded`, `aria-controls`, `aria-hidden` và `inert` khi đóng; focus ring rõ, native keyboard behavior và reduced-motion được bảo vệ. Responsive desktop một hàng, mobile search full-width + hai nút không tràn, advanced controls một cột; CSS mới chỉ nằm trong `.projects-page`.
- Thêm 5 regression tests cho disclosure/inert, draft-submit URL, reset, custom-date + đủ 10 status, responsive/focus/reduced-motion; cập nhật 1 foundation test UI06.2. Web tests **147/147 PASS**; lint, typecheck, production build và `git diff --check` PASS. Build còn warning `projectRepository.ts` đã có sẵn.
- Browser visual/keyboard 320/375/768/1024/1440 **NOT RUN**; cần xác nhận thực tế animation, wrapping badge và Tab order. Không commit/push.

## UI06.2 — My Projects design foundation (2026-10-17)

- **PARTIAL — source/regression PASS, browser visual verification pending.** Trang `/projects` đã có scope `.projects-page`, dùng lại Be Vietnam Pro của UI02 và thang chữ `26–28/19/15/14/13px`; không tải lại font, không đổi global tokens hay shared component.
- Panel dự án dùng radius 16px, border/shadow nhẹ và spacing theo hệ `12/16/24/32px`. Header route, filter, table, empty/loading/error và pagination được cân chỉnh ở lớp trình bày nhưng giữ nguyên markup chức năng, URL query parameters, search/filter/sort, phân trang và navigation.
- Responsive bảo vệ `min-width: 0`; bảng rộng cuộn ngang trong chính card, filter về một cột tại `<=700px` và card về radius 14px tại `<=420px`. Không sửa Dashboard, Backend, Mobile, Admin, API, Database hoặc dữ liệu.
- Thêm 4 regression tests cho page scope/logic boundary, font reuse, typography/card foundation và overflow responsive. Web tests **142/142 PASS**; lint, typecheck, production build và `git diff --check` PASS. Lần test đầu trong sandbox bị `spawn EPERM` trước khi chạy test; chạy lại đúng suite với quyền thực thi PASS.
- Browser visual 320/375/768/1024/1440 **NOT RUN**; chưa xác nhận trực quan font metrics, độ rộng cột và cuộn bảng. Không commit/push.

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
## UI07.6.6.2 — Safe Transcript Segment Edit API

- Backend bổ sung `PATCH /api/projects/:id/transcript/segments/:segmentId`, strict validation, JWT CUSTOMER ownership và kiểm tra ownership lần nữa trong transaction.
- CAS bắt buộc `expectedRevision`; text segment, `Transcript.fullText` và revision được ghi nguyên tử. No-op không tăng revision; concurrent request cùng revision nhận `409 TRANSCRIPT_REVISION_CONFLICT`.
- Chặn chỉnh sửa khi STT đang chạy. Transcript legacy thiếu revision fail-closed; không backfill/migration, không reset ProjectStatus, không xóa downstream artifact và không tự chạy AI/TTS/video.
- Downstream stale safety tiếp tục dựa trên provenance UI07.6.6.1; job cũ hoàn tất muộn không thể trở thành CURRENT.
- Unit/mock tests: 21/21 PASS (gồm provenance, validation Unicode/strict body, fullText, no-op, CAS, rollback, ownership, not-found, active STT và legacy). Backend lint/typecheck/build PASS. Database writes: 0; AI requests: 0. Integration MongoDB transaction test vẫn PENDING cho database test replica-set cách ly.

## UI07.6.6.3 — Workflow Stale Guards & Downstream Safety

- Workflow batch đã được xác nhận chỉ chuyển CURRENT Translation/Narration/Result/job vào resolver; status TRANSLATED/GENERATING_AUDIO/COMPLETED với evidence stale/legacy trả UNKNOWN/BLOCKED và không sửa ProjectStatus.
- Bổ sung no-increment revision fence tại transaction commit của Translation, GROUPS_V1 approve, TTS và video để đóng race với PATCH transcript.
- Narration/Result detail và protected file fail-closed bằng mã provenance; list không trả artifact STALE/UNKNOWN như dữ liệu sử dụng được. Artifact/file cũ không bị xóa.
- Focused stale-guard tests 23/23 PASS; provenance/workflow/GROUPS_V1/translation/audio-terminal regression 58/58 PASS. Backend lint/typecheck/build PASS; `git diff --check` PASS sau validation cuối.
- Database writes: 0; AI/TTS requests: 0. MongoDB transaction integration trên replica-set test cách ly vẫn PENDING; không sử dụng development database.
## UI07.6.6.4 — Manual Transcript Segment Editor

- **PARTIAL (SOURCE/UNIT READY, RUNTIME WRITE GATED OFF)** ngày 2026-10-19.
- Customer Web đã tích hợp editor một-segment-mỗi-lần, validation trim/rỗng/4000 ký tự/no-op, loading/double-submit guard, cancel không gọi API, giữ draft khi lỗi và xử lý riêng conflict 409.
- Transcript DTO nay nhận `revision`; service dùng endpoint PATCH hiện có và Bearer/refresh flow chung. Sau save, state cập nhật theo response rồi refetch transcript/workflow; timestamp, sequence và segment ID không thể chỉnh trong UI.
- Feature flag `VITE_TRANSCRIPT_SEGMENT_EDIT_ENABLED=false` là mặc định và bị giới hạn `import.meta.env.DEV`; chưa bật ghi runtime vì MongoDB transaction integration trên replica-set test cách ly vẫn PENDING.
- Không sửa Backend/Database/Mobile/Admin, không gọi AI và không chạy PATCH trên development database. Browser verification NOT RUN.

## UI07.6.7 — Translation Desktop UI Polish

- **SOURCE COMPLETE** ngày 2026-10-19: tinh gọn Header, project context, language selector và khoảng cách của Translation; xóa đúng các helper text dư thừa, giữ nguyên thông báo lỗi/loading/processing và bảo vệ workflow/provenance.
- Bản gốc/Bản dịch tiếp tục hiển thị hai cột trên desktop với timestamp chính xác, border phân tách, text wrapping và không dùng overflow hidden để che nội dung. Responsive hiện có vẫn chuyển một cột dưới 700px.
- Không sửa Backend/API/Database, không bật transcript edit, không gọi AI và không thay đổi language catalog hoặc business logic.
- Browser Desktop 1024/1280/1440: **NOT RUN**.

## UI07.7.1 — Voice UI Audit & Safe Design Preview

- **AUDIT COMPLETED / PREVIEW SOURCE READY** ngày 2026-10-19. Voice route thật vẫn fail-closed bằng Backend workflow; không sửa resolver, guard, Backend hay Database.
- Bổ sung route preview opt-in `/design-preview/voice`, chỉ render trong Vite development khi `VITE_VOICE_DESIGN_PREVIEW_ENABLED=true`, mặc định OFF và vẫn yêu cầu `RequireAuth`.
- Preview dùng dữ liệu minh họa có banner `DESIGN PREVIEW`, không mount hooks/services, không gọi API/TTS/AI và khóa toàn bộ control có thể tạo mutation. Transcript edit flag không thay đổi.
- Audit ghi nhận P1: header/project context chưa đồng bộ Transcript/Translation, summary/helper text còn dài, speed fixed 1.0x chiếm card riêng; P0 contract gap: preview audio chưa có cơ chế authenticated playback đáng tin cậy.
- Browser Desktop 1024/1280/1440: **NOT RUN**.

## UI07.7.1.2 — Smart Project Resume Navigation

- **SOURCE COMPLETE** ngày 2026-10-19. Dashboard recent projects refetch workflow summary qua Project Detail API trước khi gọi `projectAction`; các route upload/transcript/translation/voice/generate/result dùng chung contract điều hướng đã có.
- Chỉ điều hướng trực tiếp khi Backend trả `workflow.canResume=true` và guard xác nhận route hợp lệ. UNKNOWN/BLOCKED/missing/API error/mismatched project fail-closed về Project Detail kèm thông báo; không suy luận từ status, không mutation và không bypass deep-link guard.
- Nút hành động hiển thị `Tiếp tục` khi workflow đã tải trong danh sách cho phép resume, nếu không giữ `Xem chi tiết`; click có loading và synchronous lock chống gửi lặp. Link tên dự án và route Project Detail vẫn còn nguyên.
- Web tests **213/213 PASS**; lint, typecheck, production build và `git diff --check` PASS.
- Browser Desktop: **NOT RUN**.

## UI07.7.1.3 — Fix Dashboard Smart Resume Infinite Loading

- **SOURCE COMPLETE** ngày 2026-10-19. Sửa guard mount bị giữ `false` sau StrictMode effect replay — nguyên nhân response bị bỏ qua, không `navigate` và spinner không kết thúc trong development.
- Resume fetch nay chỉ đọc Project Detail DTO thay vì chờ Media/Translation enrichment; timeout 8 giây + AbortController, cleanup khi unmount và `finally` bảo đảm mở khóa/loading. Auth refresh được giới hạn 15 giây.
- Success tiếp tục dùng mapping workflow chung. Reject/timeout/UNKNOWN/BLOCKED fail-closed về Project Detail; navigation exception giữ Dashboard, hiện lỗi ngắn và cho phép thử lại.
- Không sửa Backend/Database/Mobile/Admin, không gọi AI/TTS và không bật feature flag.
- Web tests **216/216 PASS**; lint và typecheck PASS. Browser verification: NOT RUN.

## UI07.7.1.4 — Dashboard Action Column Alignment

- **SOURCE COMPLETE** ngày 2026-10-19. Root cause là action track chỉ tối thiểu 80px và rule typography phía dưới ghi đè `nowrap` thành `normal`, làm “Xem chi tiết” xuống hai dòng.
- Grid năm cột nay dành tối thiểu 112px cho Thao tác, giảm nhẹ minima/gap của các cột giữa và giữ tên dự án là cột ưu tiên. Action header/cell căn giữa; nút rộng ổn định 7rem, label và spinner luôn cùng một hàng; row min-height 68px.
- Giữ Smart Resume, timeout/fallback/guard và dữ liệu Backend nguyên vẹn. Bảng vẫn dùng overflow cục bộ khi viewport thực sự hẹp, không dùng overflow hidden cho toàn trang.
- Web tests **217/217 PASS**; lint, typecheck, production build và `git diff --check` PASS. Browser Desktop: NOT RUN.

## UI07.7.1.5 — Unified Dashboard Continue Action

- **SOURCE COMPLETE** ngày 2026-10-19. Tất cả action trong bảng Dự án gần đây hiển thị duy nhất “Tiếp tục”; spinner + “Đang mở”, khóa double-click, timeout, AbortController và cleanup `finally` được giữ nguyên.
- Thay đổi chỉ thuộc presentation: Smart Resume vẫn dùng Project workflow DTO và helper chung. UNKNOWN/BLOCKED/missing/API error vẫn về Project Detail an toàn; không suy luận từ ProjectStatus và không bypass WorkflowRouteGuard.
- Link tên dự án vẫn mở Project Detail. Không sửa Backend/Database/Mobile/Admin, không gọi AI/TTS và không thêm dependency.
- Web tests **218/218 PASS**; lint, typecheck, production build và `git diff --check` PASS. Browser Desktop: **NOT RUN**.

## ADMIN07.2 — Safe Customer Soft-delete Implementation & Precheck

- **IMPLEMENTATION PREPARED, NOT EXECUTED** ngày 2026-10-19. User schema có lifecycle fields additive; legacy User thiếu `deletedAt` vẫn active và không có migration/backfill.
- Login, refresh, protected access, profile update và Admin customer list/detail/statistics fail-closed cho soft-deleted User. Public DTO không lộ lifecycle metadata; ActivityLog actor vẫn resolve qua User document được giữ lại.
- Cleanup service/script khóa đúng ba S24 Disposable Customer bằng ID + exact fixture identity, kiểm tra toàn bộ dependency/session/log, dùng transaction và conditional `updateOne`; không có HTTP endpoint hay startup hook.
- Online dry-run chỉ đọc PASS: `development`, database `multilingual_ai_narration`, replica-set transaction available, 3/3 identities đúng, 80 ActivityLog, 33 historical project IDs và mọi dependency/session bằng 0. Database writes: 0.
- Execution **BLOCKED** vì production isolation chưa được chứng minh và backup/maintenance fence chưa được thực hiện. Không soft-delete, không migration/seed/cleanup, không AI call và không commit/push.

## MUSEUM-02 — Museum Design System Foundation

- **SOURCE COMPLETE** ngày 2026-10-19. Bổ sung theme `.museum-theme` được scope độc lập, đúng palette kem/đỏ trầm/than/vàng đồng đã duyệt và tiếp tục dùng font Be Vietnam Pro local.
- Token Museum bao gồm color, typography, spacing, radius, shadow, container, breakpoint tham chiếu, focus và reduced-motion. Token Navy/Purple hiện tại không bị thay đổi hoặc ghi đè ngoài Museum subtree.
- Thêm các primitive `MuseumButton`, `MuseumCard`, `MuseumBadge`, `MuseumContainer`, `MuseumSectionHeading`; ba primitive control/surface tái sử dụng component Customer hiện có thay vì nhân đôi hành vi.
- Chưa thêm hoặc đổi route; chưa áp theme lên Dashboard/Projects/Workflow/Auth. Không sửa Backend/Database/Mobile/Admin, không gọi AI/TTS và không đụng cleanup ADMIN07.2.
- Validation: Web tests **221/221 PASS**; lint, typecheck, production build và `git diff --check` PASS. Browser visual: **NOT RUN** vì chưa có route mount Museum foundation trong MUSEUM-02.

## MUSEUM-03 — Public Museum Layout & Routing

- **SOURCE COMPLETE** ngày 2026-10-19. Thêm PublicMuseumLayout, MuseumHeader, MuseumNavigation, MuseumFooter và trang placeholder dùng Design System MUSEUM-02.
- Root `/` hiển thị Museum công khai; thêm Khám phá, Thuyết minh và Về bảo tàng, hỗ trợ trailing slash và public 404. Workspace Customer vẫn nằm trong RequireAuth, giữ nguyên workflow/ownership guards.
- Language selector là shell disabled với vi/en/th/ko/zh-CN; chưa có i18n hoặc dữ liệu thuyết minh công khai. Menu mobile dùng native modal dialog, Escape, focus return, body scroll lock và tự đóng theo navigation/breakpoint.
- Web tests **227/227 PASS**; lint, typecheck, production build và `git diff --check` PASS. Browser: **NOT RUN**, không có browser khả dụng. Responsive/keyboard thực tế tại các viewport yêu cầu còn chờ QA.
- Không sửa Backend/Database/Admin/Mobile, không gọi AI/TTS, không chạy ADMIN07 cleanup, không thêm dependency và không commit/push. Foundation sẵn sàng triển khai nội dung MUSEUM-04 sau duyệt.

## MUSEUM-04 — War Remnants Museum Homepage

- **SOURCE COMPLETE** ngày 2026-10-19. Thay root placeholder bằng MuseumHomePage với sáu section theo yêu cầu, Museum tokens và CSS riêng; PublicMuseumLayout/navigation/Customer guards được giữ nguyên.
- Không có media bảo tàng hợp lệ trong source. Dùng visual typography có nhãn chờ ảnh, ba chủ đề biên tập dự kiến, bốn ngôn ngữ dự kiến vi → en/th/ko/zh-CN và video empty state; không có media giả, gọi API protected, dịch/TTS hoặc mutation.
- Cần người dùng cung cấp ảnh bảo tàng có quyền sử dụng, nội dung chủ đề được duyệt, video public và poster trước khi hoàn thiện nội dung thực. Browser visual: **NOT RUN**, không có browser khả dụng. Chưa xác nhận visual tại các viewport yêu cầu.
- Không sửa Backend/Database/Admin/Mobile, không đụng ADMIN07, không thêm dependency và không commit/push. Sẵn sàng phát triển MUSEUM-05 với gate nội dung/asset nêu trên.
- Validation: Web tests **232/232 PASS**; lint, typecheck, production build và `git diff --check` PASS; Browser **NOT RUN**. Có năm regression mới cho homepage render, CTA, language presentation, video empty state và responsive CSS; các tests public/protected routing vẫn PASS.

## MUSEUM-05 — Museum Explore & Exhibition Pages

- **SOURCE COMPLETE** ngày 2026-10-19. Thêm trang Khám phá editorial và route `/kham-pha/:slug` với breadcrumb, nội dung có nguồn, khu vực ảnh và CTA thuyết minh; giữ PublicMuseumLayout/Museum tokens và protected routes.
- Catalog typed hiện rỗng do chưa có chuyên đề xác minh. Hiển thị empty state, không đưa chủ đề dự kiến từ homepage thành dữ liệu thật. Filter công bố loại draft, thiếu nguồn/nội dung và slug trùng; ảnh local có alt/caption/credit, không sử dụng Project/Result riêng tư.
- Focused Museum routing/render tests **16/16 PASS**; gồm listing/detail, trailing slash, breadcrumb/CTA, invalid slug, empty/draft/missing-source, escaping, public image boundary và protected route regression. Nội dung minh họa chỉ nằm trong test.
- Browser **NOT RUN**, không có browser khả dụng. Cần nội dung chuyên đề/nguồn đã xác minh và ảnh có quyền sử dụng trước khi xuất bản entry thật. Sẵn sàng cho MUSEUM-06 ở mức nền tảng source.
- Không sửa Backend/Database/Admin/Mobile, không đụng ADMIN07, không gọi AI/TTS, không thêm dependency và không commit/push.
- Validation MUSEUM-05: Web tests **237/237 PASS**; lint, typecheck, production build và `git diff --check` PASS. Build giữ cảnh báo dynamic/static import có sẵn của `projectRepository.ts`.

## MUSEUM-05.2 — Real UI Polish

- **SOURCE COMPLETE** ngày 2026-10-19. Header 80px/mobile 72px, bỏ language helper và giữ accessible label; hero max 60px/spacing gọn hơn; ba card editorial, language cards, video placeholder, CTA và footer được tinh chỉnh trong Museum scope.
- Không đổi route, nội dung catalog, auth/workflow guard hoặc tính năng; không tạo slug/media giả. Menu mobile, disabled language shell và thông báo đang chuẩn bị được giữ nguyên. Footer không có thông tin liên hệ chưa xác minh.
- Web tests **238/238 PASS**; lint, typecheck, production build và `git diff --check` PASS. Các cặp text/background mới kiểm tra được đạt contrast AA; build giữ cảnh báo chunking cũ của projectRepository.
- Browser verification tại 375/768/1024/1280/1440: **NOT RUN**, không có browser khả dụng. Ba ảnh người dùng đề cập không có trong context hiện tại; chưa khẳng định visual hoặc overflow PASS. Asset ảnh/video thật vẫn còn chờ.
- Không sửa Backend/Database/Admin/Mobile hoặc ADMIN07; không thêm dependency, không gọi AI/TTS và không commit/push.

### Bổ sung MUSEUM-05.2 — Explore Page UI Polish

- **SOURCE COMPLETE**: thu gọn hero/breadcrumb riêng cho Explore listing, cân typography và hai cột intro, thêm đường nhấn editorial và giảm chiều cao empty state. Giữ catalog rỗng, nội dung, route và Museum Design System hiện có.
- Header/language selector/footer dùng chung bản polish của homepage; không thêm ảnh, slug hoặc chuyên đề. Responsive source giữ một cột dưới 768px, không dùng overflow hidden để che nội dung.
- Web tests **238/238 PASS**; lint, typecheck, production build và `git diff --check` PASS. Build còn cảnh báo chunking có sẵn. Browser desktop/mobile **NOT RUN** do không có browser khả dụng; ảnh tham khảo không xuất hiện trong context hiện tại.
- Chỉ sửa MuseumExplorePage, museum-explore.css và docs; không sửa Backend/Database/Admin/Mobile/ADMIN07, không commit/push.

### Bổ sung MUSEUM-05.2 — Final Homepage Polish

- **SOURCE COMPLETE**: cải thiện thứ bậc số/tiêu đề/spacing của ba card editorial, đưa tên tiếng Việt và mã ngôn ngữ lên rõ hơn, dựng poster chờ video bằng typography/CSS, tăng padding và chia nhóm footer, cân section/CTA cuối.
- Giữ ba nhóm chưa công bố, bốn ngôn ngữ đang chuẩn bị và video empty state. Không thêm nội dung lịch sử, ảnh, chuyên đề, slug hoặc chức năng chưa xác minh. Không sửa Backend/Database/Admin/Mobile/ADMIN07; không commit/push.
- Web tests **238/238 PASS**; lint, typecheck, production build và `git diff --check` PASS. Browser desktop/mobile **NOT RUN**, không có browser khả dụng; chưa đối chiếu ảnh toàn trang hoặc đo overflow thực tế. Build giữ cảnh báo chunking có sẵn của projectRepository.

## MUSEUM-06 — Public Video Narration Experience

- **SOURCE COMPLETE** ngày 2026-10-19. Thêm public video list/detail tại `/thuyet-minh` (hỗ trợ trailing slash) và `/thuyet-minh/:slug`, MuseumVideoPlayer HTML5, MuseumVideoLanguages và CSS Museum scope. Catalog mặc định rỗng, chưa công bố video thật.
- Contract typed kiểm tra visibility/publication, nguồn/quyền, slug và asset local. Vite inventory chỉ lấy tên file; vi phải AVAILABLE trước khi entry xuất bản. Bốn mã đích en/th/ko/zh-CN có available/processing/unavailable rõ ràng, không chọn variant thiếu media hoặc lệch metadata ngôn ngữ.
- Player metadata preload, không autoplay; loading/error/retry và timeout 15s, pause khi unmount/source switch. Caption/transcript gắn đúng language; thay instance video khi chuyển nguồn, không dùng protected URL, query video URL hoặc token. Không tạo transcript/media giả.
- Focused tests **28/28 PASS** cho contract/public boundaries, list/detail, trạng thái ngôn ngữ, đồng bộ transcript/caption, native controls, lỗi/timeout/retry và regression routing. Chỉ mock inventory/fixture trong tests, không tạo file video hoặc ghi DB.
- Browser **NOT RUN**, không có browser khả dụng. Playback/codec/WebVTT thật, quyền/ngữ nghĩa/timing và visual responsive còn chờ asset hợp lệ. Hướng dẫn tích hợp tại docs/UI.md; sẵn sàng nối video thật và tiếp tục MUSEUM-07 ở mức source.
- Giữ nguyên các thay đổi MUSEUM-05.2/ADMIN07 đang có; không sửa Backend/Database/Admin/Mobile, không gọi AI/TTS, không thêm dependency và không commit/push.
- Validation cuối: Web tests **249/249 PASS**, lint/typecheck/production build/diff-check PASS. Browser **NOT RUN**. Database reads/writes: **0**; AI/TTS requests: **0**. Build giữ cảnh báo chunking cũ của projectRepository.ts.

## MUSEUM-06.1 — Tạo thư mục và chuẩn bị tích hợp video thật

- **PREPARED — PUBLICATION PENDING** ngày 2026-10-19. Tạo ba thư mục public/museum/videos, posters, captions có .gitkeep. MP4 `bao-tang-chung-tich-chien-tranh.mp4` xuất hiện trong lúc validation, không do agent tạo/copy. ffprobe read-only xác nhận MP4 23.762.139 byte, H.264 640×360, AAC, 307.478639 giây. Chưa xác minh quyền/nội dung và browser playback.
- Mở rộng inventory/allowlist đúng loại asset cho đường dẫn mới, giữ tương thích museum-media cũ. Chuẩn bị một draft trong catalog hiện có, PRIVATE/DRAFT, quyền chưa xác nhận, cả vi/en/th/ko/zh-CN đều UNAVAILABLE. Catalog công khai vẫn 0 video.
- Git ignore chặn file trong museum/videos, cho phép .gitkeep; không stage/commit video. Public directory vẫn phục vụ file trực tiếp: người dùng cần xác nhận quyền trước khi copy video, sau đó kiểm tra file thật và duyệt metadata/publication.
- Focused tests **10/10 PASS**; browser playback thật **NOT RUN**. File ở public có thể được phục vụ trực tiếp khi dev server chạy; DRAFT chỉ ẩn catalog. Không sửa Backend/Database/Admin/Mobile/ADMIN07, không gọi AI/TTS và không commit/push.
- Validation: Web tests **251/251 PASS**, lint/typecheck/build/diff-check PASS; build giữ cảnh báo chunking có sẵn. MP4 tồn tại nhưng entry chưa công bố và vi vẫn UNAVAILABLE; không có media được đưa vào Git index.

## MUSEUM-06.2 — Publish Real Vietnamese Museum Video

- **BLOCKED — REQUIRED EDITORIAL METADATA MISSING**. Xác nhận quyền đăng công khai của người dùng đã được ghi nhận; không yêu cầu xác nhận lại. Cập nhật title/description đúng yêu cầu và vi AVAILABLE, giữ bốn ngôn ngữ đích UNAVAILABLE.
- File verification PASS: ffprobe xác nhận H.264/AAC, 640×360, 307.478639 giây, 23.762.139 byte; FFmpeg giải mã toàn bộ audio/video sang null không lỗi. Không sửa/copy/thay thế MP4 hoặc đưa vào Git.
- Chưa PUBLIC/PUBLISHED vì contract bắt buộc sourceAttribution.label/reference và rights.credit/license, hiện chưa có dữ liệu. Không tự gán tác giả, giấy phép hay nguồn. Public catalog vẫn 0 và slug entry còn Not Found. CTA “Xem video” đã chuẩn bị cho card được công bố.
- Web tests **251/251 PASS**; lint, typecheck, build và git diff --check PASS. Browser QA **NOT RUN**, không có browser; không báo playback PASS chỉ từ decode. Build còn cảnh báo chunking có sẵn.
- Chỉ sửa Customer Web/tests/docs, giữ thay đổi chưa commit; không sửa Backend/Database/Admin/Mobile/ADMIN07, không gọi AI/TTS và không commit/push.

## MUSEUM-06.2.2 — Publish Authorized YouTube-sourced Video

- **PUBLIC/PUBLISHED — SOURCE VALIDATION PASS**. Dỡ blocker MUSEUM-06.2 bằng nguồn YouTube `https://youtu.be/_MN6nsn-XDM`, credit và quyền cho phép đăng lại cụ thể theo người dùng cung cấp. Không gán Creative Commons, tác giả/kênh chưa xác minh hoặc quyền sở hữu.
- Catalog có **1** video công khai; route list/detail dùng MP4 local hiện có. vi AVAILABLE; en/th/ko/zh-CN UNAVAILABLE. Credit có link tới video gốc; không có media/transcript/subtitle giả và không sử dụng protected endpoints.
- SHA256 MP4 giữ nguyên từ lần full decode PASS ở MUSEUM-06.2; không thay file hoặc đưa MP4 vào Git. Giữ nguyên các thay đổi chưa commit và ADMIN07.
- Web tests **253/253 PASS**; lint/typecheck/production build/diff-check PASS. Build còn cảnh báo chunking có sẵn. Browser playback **NOT RUN**, không có browser khả dụng; tác giả/kênh chưa xác minh vì không đọc được trang nguồn.
- Chỉ cập nhật Customer Web/tests/docs. Database/AI/TTS requests: **0**; không sửa Backend/Admin/Mobile, không commit/push hoặc deploy hosting.

## MUSEUM-06.4 — Public Video UI Polish

- **SOURCE PASS**. Một video dùng featured card; nhiều video dùng responsive grid. Có poster thật trích tại giây 35 bằng FFmpeg (JPEG 640×360, 52.655 byte), thêm posterUrl vào catalog; không đổi nguồn/quyền, trạng thái công bố hoặc routes.
- Player 16:9 căn giữa, không dành cột trống khi thiếu transcript; có transcript thật mới mở hai cột desktop. Selector compact, vi sẵn sàng/bốn ngôn ngữ đích chưa có; credit YouTube gọn và giữ link/license nguyên vẹn.
- Web tests **254/254 PASS**; lint/typecheck/build/diff-check PASS. Regression kiểm tra featured/grid, poster ở card/player, transcript present/absent và các guards hiện có. MP4 hash không đổi; video vẫn không đưa vào Git.
- Browser QA desktop/mobile **NOT RUN**, không có browser khả dụng. Chỉ xem ảnh poster local; chưa khẳng định visual, controls, playback hoặc overflow ở các viewport yêu cầu. Build còn cảnh báo chunking cũ.
- Không sửa Backend/Database/Admin/Mobile/ADMIN07, không tạo AI audio/transcript/caption, không thêm dependency và không commit/push.

## AI-TRANSLATE-05 — GROUPS_V1 admission/source policy

- PARTIAL: explicit isolated-test admission verified; complete runtime/process memory admission remains BLOCKED. Global flags OFF; no production budget approved.
- Shared test controller bounds active/per-user operations and retained draft credits, single-flight before full source loading, idempotent cleanup and active TTL. Pending work stays reserved until underlying settlement, not client disconnect.
- Default source remains 98,304 bytes. Test-only injection permits a validated 128 KiB source profile with 5 MiB/request estimated credits, 32 MiB aggregate, 4 active / 2 per owner; these credits are NOT measured heap bounds. Synthetic 100/1,027 accepted, 2,000/5,000 and long-text overflow rejected without truncation; digest/coverage preserved.
- Focused regression/benchmark 92/92 PASS; isolated MongoDB transaction/source suite 14/14 PASS, cleanup verified. Backend lint/typecheck/build PASS. No development/production writes or real AI calls.
- HTTP response/waiter fan-out, GET/approve allocations, native buffers and real deployment headroom remain outside complete accounting. Keep runtime disabled; see `docs/GROUPS_V1_ADMISSION_POLICY.md` before any larger-source/runtime activation.

## AI-TRANSLATE-05.1 — Response lifecycle and candidate development profile

- Test-profile response/waiter/GET/approve accounting implemented: each caller holds a slot through operation settlement and HTTP finish/close; shared provider work keeps separate retained draft credit. No early release on disconnect, no duplicate provider generation, active TTL and idempotent release preserved.
- Explicit isolated-test controller/router injection keeps real JWT/CUSTOMER/ownership/validation. Default production controllers, source cap 98,304 bytes and flags OFF are preserved. Added bounded JSON serialization and server-side stored-BSON projection for profile reads; no exact native-memory guarantee claimed.
- Full-path HTTP + real isolated MongoDB + installed SDK fetch-mock concurrency 1/4/16 verified; fixture cleanup PASS. Real museum source read-only preflight PASS: revision 1, 1,027 segments, 74 groups, 105,958 bytes, digest/coverage intact. No AI calls or development/production writes.
- Development profile remains BLOCKED: actual backend deployment headroom/OS memory limit and consistent composition across remaining default downstream consumers are not established. See `docs/GROUPS_V1_RESPONSE_LIFECYCLE.md` for samples, assumptions, bounded-vs-estimated resources and exact next gate. No feature activation, Customer Web/MUSEUM/ADMIN07 changes, commit or push.
- Validation: focused regression/benchmark **99/99 PASS**, real isolated MongoDB integration **15/15 PASS** with fixture cleanup, backend lint/typecheck/build/diff-check PASS. Memory observations are samples, not exact reservation or production headroom evidence.

## AI-TRANSLATE-05.2 — Development runtime memory validation

- **BLOCKED for development activation**: no identified backend process/listener at configured port 8080; no verified deployment memory/RSS allowance. Physical RAM availability is not a process budget. Default scripts/source cap/flags unchanged.
- Added test-only application/API composition factories preserving default exports and auth/security middleware. Integration now exercises the full application HTTP stack, real isolated MongoDB, installed SDK fetch mocks, bounded warm-up and two rounds of concurrency 1/4/16 with 10 ms memory sampling.
- Focused tests **99/99 PASS**; isolated application/MongoDB integration **16/16 PASS**, fixture cleanup PASS. Backend lint/typecheck/build PASS. Lab runner `--max-old-space-size=512` observed total V8 heap ceiling 560 MiB; not an RSS limit or approved development budget.
- Sampled maxima including warm-up: RSS 228,659,200 / heap 117,756,432 bytes; response max 53,223 bytes for synthetic 1,027-segment source. All measured scenarios finish TTL with 0 credits/active/drafts/receipts; no OOM/crash/timeout. Data-dependent scheduling/rejections documented.
- Development profile consistency remains BLOCKED outside the test composition: default grouped readers/TTS still use 96 KiB and there is no approved non-test admission launcher. See `docs/GROUPS_V1_DEVELOPMENT_RUNTIME.md` for exact evidence/measurements and three concrete next fixes. No AI calls, development/production writes, global flags, Customer Web/MUSEUM/ADMIN07 changes or commit/push.

## AI-TRANSLATE-05.3 — Isolated Docker development validation

- Dedicated Backend container/actual loopback listener and health PASS; 512 MiB memory+swap ceiling, 1 CPU, Node old-space 256 MiB, non-root/read-only/no credential mounts, bounded logs. Existing test MongoDB/network reused after host/container deployment-identity guards. Default flags/source cap unchanged.
- Scoped source policy now reaches compatibility reader and TTS start/completion validators; bounded Translation reads preserve production behavior outside scope. Source/revision/review/coverage remain fail-closed. No speech/job generation.
- Docker warm-up + two rounds 1/4/16: **7/7 scenarios PASS**. Backend sampled peak RSS/heap 159,182,848 / 57,108,904 bytes; cgroup peak 238,809,088 bytes including runner/probes/cache. OOM/failcnt/restarts 0; all scenarios TTL cleanup 0 credits/active/drafts/receipts; fixtures cleanup PASS. Container stopped cleanly, Mongo volume/unrelated services preserved.
- Museum read-only preflight PASS: 105,958 bytes, revision 1, 1,027 segments, 74 groups, digest/coverage intact. No customer content copied into fixtures.
- Focused translation/TTS/security tests **107/107 PASS**, isolated MongoDB integration **16/16 PASS**. See `docs/GROUPS_V1_DOCKER_VALIDATION.md` for full measurements, validation assumptions, changes and readiness. Ready for read-only English preflight, not real generation; real provider/DB-write authority still separate. Development/production writes and AI calls 0; no global flags, Customer Web/MUSEUM/ADMIN07 changes, commit/push.

## AI-TRANSLATE-05.4 — English translation read-only preflight

- Source PASS: project 6ad5c93a86cf95b7523704a5, vi → active en, revision 1, 1,027 segments/74 candidate groups, 105,958 bytes, exact digest/coverage intact. English records 0, running TRANSLATION jobs 0. Optional read-only diagnostic exposes aggregate sizes/digest/config presence only.
- Overall **BLOCKED for real execution**: ordinary runtime retains 96 KiB/flags OFF; validation container is stopped/mock-only/test-DB restricted; exact configured gemini-3.8-flash availability/thinking/context/pricing not verified without provider calls.
- Local provider payload 19,501 bytes / 16,425 characters; output ID/framing baseline 7,361 characters. Approximate input 6k–12k, visible output 3.7k–6.7k tokens under stated assumptions; not model token counts. One response plausible, no proven batching requirement, no cap changes. Expected 1 metadata + 1 generation, SDK retries 0; cost UNKNOWN.
- Proposed one-run/draft/human-review/atomic-approve plan and restart/TTL/multi-instance duplicate-billing limitations: `docs/ENGLISH_TRANSLATION_PREFLIGHT.md`. No plan execution, AI/DB writes, flags, application/MUSEUM/ADMIN07 changes or commit/push.
- Validation: read-only preflight PASS; non-writing focused tests **107/107 PASS**; backend lint/typecheck/build/diff-check PASS. No integration fixture writes in this step.

## AI-TRANSLATE-05.5 — Gemini documentation verification / controlled runtime design

- Official public docs checked: configured stable gemini-3.8-flash exists, input/output limits 1,048,576 / 65,536. Account/key/quota access remains unverified; no metadata API request. Local SDK 2.28.0 defaults to Developer API v1beta; no Vertex/Enterprise overrides detected.
- Default medium thinking shares application 8,192 output cap and is billable. One request plausible but not guaranteed; LOW thinking is proposed for separate approval, not applied. No batching/model/cap change.
- Standard prices verified on official pricing page; conditional token-cost estimates and conservative envelope documented in `docs/GEMINI_CONTROLLED_DEVELOPMENT_READINESS.md`, with date/tax/account assumptions. Prior UNKNOWN pricing is historical; actual account availability still blocked.
- Proposed separate non-test controlled-development composition: scoped 128 KiB/admission, hard memory/CPU limits, JWT/ownership, reader/TTS source consistency, readiness provider DENY, durable one-shot permit and explicit preview/manual atomic approval. Not implemented/launched or supplied real credentials; default flags/settings unchanged.
- Non-provider focused tests **107/107 PASS**; lint/typecheck/build/diff-check PASS. Gemini calls/DB writes/global activation 0; no application/Customer Web/MUSEUM/ADMIN07/container changes or commit/push.

## AI-TRANSLATE-05.6 — Controlled readiness and one-use permit preparation

- **PARTIAL; real generation BLOCKED.** Separate development-mode Docker readiness implemented, provider DENY, no AI/customer credentials, only attested isolated test MongoDB. Health/listener 127.0.0.1:18082 PASS; 512 MiB memory+swap, 1 CPU, Node old-space 256 MiB (actual total heap ceiling 271581184 bytes), OOM/restarts 0. Container stopped cleanly; permit named volume/MongoDB/unrelated services preserved.
- Existing JWT, available/nondeleted User lookup, CUSTOMER RBAC and ownership reused. Actual HTTP tests verify unauthenticated/invalid/deleted user, ADMIN and other owner rejections, owned synthetic project outside scope denied and all provider/mutation routes blocked. No real museum project fixture or customer transcript copied into test DB; exact tracked fixture cleanup 0 remaining.
- Explicit DENY source scope permits 128 KiB only with the pinned museum project/revision/digest/vi->en binding; new lossless synthetic >96 KiB admission/boundary tests PASS and unrelated synthetic digest rejected. Default 96 KiB/global flags remain unchanged. Real museum source was not re-read in this step; successful real-museum HTTP preflight remains unverified.
- Durable permit primitive added: strict owner/source/input/group-ID/model/caps/expiry binding, immutable fingerprint, atomic exclusive claims + file/directory fsync, max 1 metadata/1 generation, metadata verification prerequisite, no retry/refund after failures/timeouts, LOW needs explicit approval. Linux tests PASS across independent fence instances and 16 concurrent claims. No real grant issued. This primitive is NOT wired to actual SDK dispatch; no claim of end-to-end real-provider one-use enforcement or container-crash recovery.
- Focused unit/mock tests: **114 discovered / 111 PASS / 0 FAIL / 3 Windows skips**. Linux Docker readiness/permit/HTTP: **8/8 PASS**, including the skipped durability cases. Actual isolated GROUPS_V1 MongoDB integration **16/16 PASS**, cleanup verified. Backend lint/typecheck/build/compose config/diff-check PASS. Integration load remains mocked, not proof of real-account feasibility.
- Model remains gemini-3.8-flash; LOW candidate not activated. Official Standard pricing rechecked; conditional token estimate ~$0.03972 and conservative ~$0.82 token envelope documented, not an invoice cap or verified account price/quota.
- Exact commands/files/remaining implementation gates: `infra/backend-controlled-development/README.md`. Real SDK fence/config/usage integration and a separately attested real-development credential/execution composition are still required; no executable real-generation command is claimed. Current readiness server intentionally cannot be armed by environment flags or a grant.
- Gemini calls **0**; development/production DB writes **0**; only isolated synthetic fixture writes/cleanup. No Customer Web/MUSEUM/ADMIN07, provider/model/dependency/global flag changes, commit or push; earlier uncommitted work preserved.

## AI-TRANSLATE-05.7 — Complete one-use Gemini dispatch

- **Implementation/mock validation PASS; real execution NOT activated.** Added adapter using the installed GoogleGenAI SDK, exact model/API paths, bounded custom fetch, one GET/one POST maximum, attempts=1, no redirect/fallback/extra endpoint. Durable permit is consumed/fsynced before SDK dispatch; verified model identity/actions required. Normal unfenced provider is denied throughout controlled execution. Same schema/instruction/output cap/timeout/response cap; LOW sent only with explicit permit approval; numeric usage only.
- Added separate execution app/server/Docker composition on 127.0.0.1:18083, default LOCKED. Secret files are loaded only after later explicit enable, never copied to images, env files or mock/readiness. Strict SRV/database/replica/deployment hash validation, no backend/.env fallback; no credentials/DB/SDK access in LOCKED mode. Preserves existing JWT + CUSTOMER + available-user + ownership and bounded response/admission/draft lifecycle; approve requires explicit matching review header/body and retains existing atomic transaction. Other routes/STT/TTS/video denied.
- Scoped 128 KiB profile pins approved project/revision/digest/vi->en only; 96 KiB defaults and global flags unchanged. Rechecks available owner, ownership/status/language/jobs/artifacts and exact source/group coverage/input hashes before EACH SDK stage. Read-only museum recheck PASS: revision 1, 1027 segments, 74 groups, 105958 bytes, exact pinned digest, en active, 0 English records / active translation jobs. New --permit-binding emits only UNAPPROVED identity/hashes, not text/secrets or an active grant.
- Linux real-SDK-fetch-mock/readiness/HTTP auth tests **14/14 PASS** (no skips); existing focused regression **107/107 PASS**; actual isolated MongoDB integration **16/16 PASS**, exact fixture cleanup. Named-volume restart/kill-start verified boot count 1->4 with mock dispatch remaining 1 metadata +1 generation. Separate SIGKILL test after durable generation claim but before native POST: recovery refuses reuse; mock metadata=1, generation=0. Exact synthetic permit fixtures cleaned; real permit volume/other volumes preserved.
- Execution composition listener/health verified LOCKED with placeholders, 512 MiB RAM+swap /1 CPU/Node old-space 256 MiB, OOM/restarts 0. Docker Desktop initially stopped; started normally; unrelated containers/volumes were not edited/deleted. An early worker check was interrupted during Docker startup, then repeated successfully. Crash harness adjusted for Linux PID-1 signal behavior; actual crash test uses external docker kill, not a guessed crash outcome. Task-created validation/execution containers stopped afterward.
- Backend lint/typecheck/build, Compose configs and diff-check PASS. Exact secret schemas, future approval/preconditions, single preview/manual approval commands and files changed documented in `infra/backend-controlled-execution/README.md`. No outstanding known code blocker in tested scope; real deployment startup/key/quota remain unverified until separately approved execution, not claimed PASS.
- Gemini calls **0**, real translation drafts **0**, development/production DB writes **0**. Only isolated synthetic fixture writes/cleanup. No real credentials provisioned or permit issued, real generation enabled, global flags, provider/model/dependency changes, Customer Web/MUSEUM/ADMIN07 changes, commit or push. Prior uncommitted work preserved.

## AI-TRANSLATE-05.8.1 — Explicit MEDIUM thinking support

- **PASS for implementation/mock gate; STOP before real execution.** Added MEDIUM to the strict one-use permit thinking enum, preserving DEFAULT/LOW semantics. The immutable persisted fingerprint binds MEDIUM exactly; same-ID changes to DEFAULT/LOW fail closed. No real permit provisioned, consumed, edited, reset or rearmed.
- Controlled SDK adapter explicitly serializes ThinkingLevel.MEDIUM; DEFAULT still omits thinkingConfig and LOW retains its explicit-approval check. Added validation of the actual serialized SDK POST thinking settings before native fetch to reject configuration drift, missing mode or unexpected budget/settings. Model gemini-3.8-flash, v1beta, 8192 output tokens, 120-second timeout, response/draft caps and zero retries unchanged.
- Installed SDK 2.28.0 enum verified locally; official public model documentation confirms medium support. No authenticated Gemini API verification. Linux network-disabled mock SDK/permit/readiness/HTTP checks **16/16 PASS**, including MEDIUM acceptance/serialization, persisted binding, rejection before dispatch on known mismatch, frozen permit, 16 concurrent attempts and duplicate/reopened fences. DEFAULT/LOW regressions PASS. Existing focused unit/mock suite **107/107 PASS**; backend lint/typecheck/build and diff-check PASS.
- MEDIUM synthetic named-volume worker verified across restart and abrupt kill/start: boots 1->3, exact mock dispatch remains metadata=1 / generation=1. Exact synthetic fixture cleanup PASS; worker stopped; real execution/readiness containers and real permit volume not activated or modified. No MongoDB tests or writes required.
- Exact files: backend/src/services/translation/one-use-permit.ts; backend/src/services/translation/controlled-gemini.provider.ts; backend/tests/controlled-execution.test.ts; backend/tests/controlled-execution/durability-worker.ts; infra/backend-controlled-execution/README.md; docs/PROGRESS.md. Current approved MEDIUM guidance/sample updated; no Customer Web/MUSEUM/ADMIN07 or dependency/global configuration changes, commit or push.
- Gemini API calls **0**; development/production DB writes **0** (all DB writes **0**), real drafts/approval/TTS/video **0**. Real source/ownership/key/quota preflight not rerun; those gates remain mandatory when the user explicitly resumes controlled 05.8. No automatic real execution following this mock validation.
# AI-TRANSLATE-05.8.4O.2 — Secure Web execution integration

- Implementation + mock validation only. Existing CUSTOMER session now supports
  direct dedicated-origin readiness and one manually confirmed controlled POST;
  no token export, bridge/proxy or public permit issuer. Operator provisioning,
  authentication, ownership and durable fence remain unchanged.
- New protected execution-readiness/controlled-preview routes; strict Origin,
  fixed confirmation + fingerprint, server-derived canonical plan/idempotency,
  source/deployment verification and conservative one-submission process latch.
  Both backend and frontend execution gates default OFF. Global GROUPS_V1 OFF,
  limits unchanged. Existing read-only status contract is preserved.
- Native confirmation/disabled/loading/UNCERTAIN UI, no automatic POST/retry/
  refresh/approve/TTS/render. Source/default auth and unrelated pages untouched.
- Focused Web 31/31 PASS; full Web 290/290 PASS. Backend expanded regression:
  66 tests, 55 PASS, 0 FAIL, 11 Linux-only SKIPPED on Windows; new Web-execution
  tests 3/3 PASS. Backend/Web lint/typecheck/build PASS. Existing Vite chunk warning
  unchanged. Browser NOT RUN; no real controlled runtime startup, provider,
  credential, DB or real permit use. Historical M.2 Linux 24/24 is not claimed as
  a rerun of these new routes. Default production bundle excludes controlled UI.
- Files: backend execution-app.ts, execution-server.ts, new web-execution.ts and
  web-execution.test.ts; frontend controlledPreviewClient.mjs/.d.mts,
  ControlledTranslationPreviewPage.tsx, controlled-translation-preview.css,
  .env.example, controlled-translation-preview.test.mjs, new
  controlled-web-execution.test.mjs; execution compose.yaml/README.md;
  docs/API.md, docs/UI.md, docs/PROGRESS.md.
- Real Gemini metadata/generation 0/0; development/production DB writes 0;
  real permit provisioning/claims 0; no source data/session/secret changes,
  global activation, dependencies, commit or push. Existing uncommitted work retained.

## AI-TRANSLATE-05.8.4P.1 — Safe read-only Web readiness

- Implemented standalone READ_ONLY_WEB_READINESS server/app/policy + separate
  Dockerfile/Compose/minimal unusable example/README. No PERMIT inheritance/mounts,
  provider/fence/translation imports or mutation routes. Health + authenticated
  CUSTOMER-owned project GET and CORS OPTIONS only; executionAllowed always false.
- Strict read-only Mongo effective privilege proof, database/SRV/replica identity,
  autoCreate/autoIndex=false before model imports. No real refresh/Gemini secrets;
  unrelated auth implementation reused, unused ephemeral local refresh config only.
- Isolated synthetic in-memory fixtures/localhost HTTP and privilege guards tested.
  Combined mock regression 20/20 PASS, no skips; no Mongo integration/write fixture
  creation claimed. Backend lint/typecheck/build, Compose config (unusable non-secret
  example only) and git diff --check PASS. No Customer UI/source data or credentials modified.
- Live authenticated readiness/CORS BLOCKED: READ_ONLY_WEB_CREDENTIALS_FILE unset
  and conventional private minimal file absent. No runtime started and no execution
  credentials reused. Need separately supplied read-only DB principal + access JWT
  verification secret; do not create DB accounts/roles under no-write scope.
- Files: backend/src/controlled-development/read-only-web-{app,policy,server}.ts,
  backend/tests/read-only-web-readiness.test.ts; infra/backend-web-readiness/
  {Dockerfile,compose.yaml,read-only-web.example.json,README.md}; docs/API/UI/PROGRESS.
- Gemini requests 0, DB writes 0, real permit issuance/claims/storage access 0;
  global activation 0; no commit/push. Existing unrelated changes preserved.

## AI-TRANSLATE-05.8.4Q — Normal Customer automatic authorization/idempotency

- Implementation/mock PASS; real activation PARTIAL/BLOCKED pending new ledger
  Mongo replica-set integration. Normal JWT/CUSTOMER/ownership API now supports
  server-derived vi->en GROUPS_V1 draft without per-project permits. Both Customer
  rollout flags ship OFF; existing global GROUPS_V1 remains OFF. P.1 and operator
  controlled execution code/config/secrets/storage are not modified by Q.
- Durable translationattempts _id claims, immutable source/input/plan/config binding,
  majority+journal before provider, persisted bounded draft recovery with original
  UUID/expiry. Crashes/timeouts/ambiguous claims stay spent, no retry/reclaim/TTL
  deletion. Source limits unchanged and checked again before SDK stages. Old
  ordinary preview blocked during rollout to avoid another generation path.
- Provisional bounded rollout: 3 attempts/user/day, 20 globally/day, 2 active/process
  and 1/user/process. Counter failure overreserves rather than refunds, external
  calls cannot exceed acknowledged quota. Not a production load/memory guarantee.
- Existing Group workspace and review/approval reused; same-origin normal POST,
  no JWT export/readiness dependency, retry=false, no automatic generation/approve/
  TTS/render. Legacy alignment safety preserved when rollout OFF. Configured normal
  Gemini model unchanged, DEFAULT thinking unchanged; controlled MEDIUM unaffected.
- Focused Backend 45/45 mocked tests PASS (12 new ledger/service/auth tests), no
  skips. Full Web 293/293 PASS. Backend/Web lint/typecheck/build and diff-check
  PASS; existing Vite chunk warning unchanged. Native Mongo
  claim/quota operations tested with mocks, NOT claimed integration PASS. No real
  source preflight, browser, provider, runtime restart or isolated DB run in Q.
- Files: backend models/TranslationAttempt.ts, services/translation/{customer-attempt,
  customer-scope,group-translation.service,group-draft-store,gemini-group-translation.
  provider}.ts, controller/route/validator translation changes, backend .env.example,
  tests/customer-{attempt,translation}.test.ts; frontend TranslationPage,
  GroupTranslationWorkspace, groupTranslationService, .env.example and
  tests/customer-translation.test.mjs; docs API/UI/PROGRESS. Existing unrelated work
  preserved; no extra readiness-account provisioning or dependency changes.
- Gemini calls 0, development/production/all real DB writes 0, real permit
  provisioning/claims 0, commit/push NO. Before first billable action: run new
  isolated-ledger/approval-race tests, configure/verify deployment caps/provider
  access and thinking choice, enable only Customer rollout flags explicitly,
  authenticated project source recheck, click normal Dịch tiếng Anh once, review
  DRAFT only. No per-project permit/readiness service required.

## AI-TRANSLATE-05.8.4R — Consolidated integration PASS; real execution BLOCKED

- Dedicated Mongo 8.0.17 narration-test-rs /127.0.0.1:27029 test deployment verified
  by existing isolation guard before fixtures. Consolidated new Customer test 9/9
  PASS, no skips: durable majority claim, 16 duplicates, quota user3/global20,
  separate Node-process draft recovery retaining UUID/expiry with no new dispatch,
  provider failure, lost insert/save acknowledgement, approval rollback/revision
  race, atomic duplicate approval and MEDIUM serialization through installed SDK.
  Exact synthetic fixture/quota cleanup PASS; no dev/production fixture writes.
- Added explicit CUSTOMER_TRANSLATION_THINKING=DEFAULT|MEDIUM support for ordinary
  Customer provider, serialized config verification and thinking in immutable
  attempt binding. Default unchanged, no live config changed. Existing controlled
  MEDIUM/fence and P.1 untouched. Focused mock regression 45/45 PASS; final Backend
  lint/typecheck/build and git diff --check PASS. Test replica stopped after exact
  fixture cleanup (its initial state was stopped); volume retained.
- Live read-only DB source: target 6ad8fef53f42eeadef99b7ad still READY/revision1,
  265 segments/26821 bytes/22 groups/ordered coverage265, all three expected hashes
  MATCH, owner record ACTIVE CUSTOMER, English records0/active jobs0, deployment
  identity MATCH. Authenticated current session NOT VERIFIED; other-process RAM
  drafts UNKNOWN. Private key PRESENT/model configured match, provider access not
  contacted. Ordinary Backend health200, Customer/global flags OFF, current live
  thinking not MEDIUM; flags/settings not modified because mandatory session gate
  did not pass.
- Computer Use initialization/list_apps worked, but window inspection was stopped
  by tool because current Chrome URL could not be determined sufficiently to enforce
  policy. No subsequent app input, JWT extraction/manufacture or alternate auth
  bypass. Thus no enabling rollout, real Customer dispatch or claimed Web draft.
- R files: backend/tests/customer-mongodb.integration.ts, helpers/customer-recovery.
  worker.ts, gemini-group-translation.provider.ts, group-translation.service.ts,
  backend/.env.example (nonsecret DEFAULT only), docs/API.md and docs/PROGRESS.md.
- Real Gemini metadata/generation0/0, real draft NOT CREATED, real approval/TTS/
  rendering0, development/production writes0, real permit claims0, commit/push NO.
  Isolated test DB writes occurred only for disposable fixtures and were cleaned.
  Need accessible authenticated Web session, fresh source/conflicts, explicitly
  select MEDIUM with existing limits, enable Customer flags and click once; never
  use a copied token or bypass the existing JWT/ownership middleware.

## AI-TRANSLATE-05.8.4S — execution lifecycle fix (2026-10-22)

- Confirmed code defect: durable claim preceded quota/provider, but no catch
  persisted failure phase or code. Expected AppError responses were not logged by
  the general error handler. Thus source/quota/config/provider/output/save errors
  all left CLAIMED, and subsequent reads returned the same generic 409. The
  original historical failure and provider receipt cannot be reconstructed from
  that row alone; no retrospective claim that Gemini was or was not called.
- Added versioned durable pre-dispatch CAS phases, sanitized failure terminal
  states/logs, and fail-closed SDK fetch boundary. Legacy claim is never upgraded,
  reset or rearmed. Current project 6ad8fef53f42eeadef99b7ad remains untouched;
  no safe automatic recovery is demonstrated for its missing draft/UNKNOWN call.
- Transient source reads recover once, lost save acknowledgements recover by GET
  or one idempotent save of identical validated draft bytes. No provider/claim/
  quota retry, quota refund, cap increase or configuration/feature-flag change.
- Existing authenticated Customer draft GET now exposes sanitized execution state.
  Web blocks generation for every existing attempt across refresh, explains
  uncertain results in Vietnamese and offers GET-only result checks. No manual
  permit required for normal new-project flow; approval remains explicit.
- Safe mock regression and isolated Mongo integration exercised actual source,
  durable phases, draft reload/restart, quota, duplicate/concurrent requests,
  timeout/response failures, lost acknowledgements, approval rollback/races and
  ownership. Only synthetic isolated fixtures were written and exactly cleaned.
  Default `npm test` Backend suite was not used because it includes development
  DB-writing tests; focused mock regression is used instead.
- S file scope: TranslationAttempt.ts; customer-attempt.ts; new customer-execution.ts;
  gemini-group-translation.provider.ts; group-translation.service.ts;
  translation.controller.ts; customer-attempt/customer-execution/customer-translation
  tests and customer-mongodb.integration.ts; GroupTranslationWorkspace.tsx;
  groupTranslationService.ts; new customerAttemptPresentation.mjs/.d.mts;
  Web customer-translation.test.mjs and group-translation.test.mjs;
  docs/API.md, UI.md, PROGRESS.md.
- Real Gemini requests0; development/production writes0; real claim/permit resets0;
  no source/project data changed, no approval/TTS/rendering, no commit/push.
  New-project path is source/mock/integration verified, not live Gemini verified.
- Final validation: Backend focused mock regression76/76; Web298/298; isolated
  Customer + GROUPS_V1 Mongo integration26/26, skipped0, fixture cleanup PASS.
  Backend and Web lint/typecheck/build PASS. Existing Vite dynamic/static import
  chunk warning remains non-blocking. Browser NOT RUN; real provider NOT RUN.
  Status: source/integration fix PASS; historical attempt recovery BLOCKED by
  missing dispatch evidence/draft. No claim of successful real English translation.

### Gemini translation failure follow-up (2026-10-22)

- Live read-only Mongo verified new project 6ad95e93928d1af477ce1928 attempt
  625927be...: UNCERTAIN, executionVersion1, GENERATION_DISPATCHING,
  TRANSLATION_PROVIDER_ERROR, created00:54:19.840Z / failed00:54:29.920Z,
  English records0 / durable draft0. Metadata stage had completed before generation
  dispatch. Old project6ad8fef53f42eeadef99b7ad remains unversioned CLAIMED unchanged.
- Confirmed error propagation defect: SDK numeric HTTP status survived provider
  mapping but was discarded by GROUPS_V1 service AppError construction. Corrected
  with sanitized TranslationProviderFailure and numeric providerHttpStatus in
  durable failure update/logging. Diagnostic acknowledgement now reflects matched
  CAS rather than assuming a write matched. No raw SDK errors or provider text saved.
- STT and translation both use process.env.GEMINI_API_KEY.trim() and installed
  @google/genai2.28.0. STT uses gemini-3.5-transcribe Files+interactions.create;
  translation uses gemini-3.8-flash models.get then generateContent/v1beta with JSON
  schema, output8192, timeout120s and no provider retries. Key unchanged/PRESENT.
  STT success alone does not establish translation model access, quota or valid
  generation response. Official model reference confirms gemini-3.8-flash exists:
  https://ai.google.dev/gemini-api/docs/generate-content/whats-new-gemini-3.8
- Actual generation failure's historical HTTP status/body is unavailable: cannot
  assert invalid JSON schema, HTTP400, provider5xx, quota/billing or a common
  provider outage as root cause. No speculative model/key/configuration changes.
  Current backend/.env Customer flag OFF/thinkingDEFAULT; live localhost8080 health
  unreachable at inspection. These are current observations, not proof of the
  environment used by the prior generation. No service was started or flag enabled.
- No old attempts reset/retried, no real Gemini calls, DB writes0. Changes confined
  to provider-failure.ts, group-translation.service.ts, customer-attempt.ts,
  TranslationAttempt.ts, focused customer-translation tests and API/PROGRESS docs.
- Single focused regression run75/75 PASS, skipped0, including actual installed
  SDK mocked HTTP400/402/500/503 through service and attempt persistence arguments;
  one metadata+generation per new synthetic source, replay blocked and private
  response details absent from public errors/logs. Backend lint/typecheck/build
  and git diff --check PASS. Real translation remains unverified/blocked, not fixed
  by changing an API key or replaying an uncertain attempt.

### Translation + quota one-pass follow-up (2026-10-22)

- Live reads only: owner quota3/3, global3/20 for UTC2026-10-22. Besides the named
  old CLAIMED and project6ad95e93928d1af477ce1928 UNCERTAIN, the same owner has
  project6ad95da1efb6fc8dbf637a71 UNCERTAIN/GENERATION_DISPATCHING (00:50Z).
  These account for the three conservative reservations. None stores historical
  providerHttpStatus; cannot infer HTTP400/503 or a configuration fix from absence.
- Latest project6ad9c7c733d690c49e84b719 is FAILED_PRE_DISPATCH/PREPARING with
  TRANSLATION_DAILY_LIMIT at08:23:20.578Z (15:23:20 Vietnam), NOT another Gemini
  failure. It has no draft/English record and no provider dispatch. No new HTTP
  evidence exists because quota correctly stopped that request first.
- Confirmed quota defects corrected for future attempts: reservation moved from
  unconditional claim-time to provider boundary, and sequential owner/global
  increments replaced with one atomic transaction including per-attempt receipt.
  Config/source failures consume0; global denial cannot burn owner quota; duplicates
  cannot count twice. Unknown quota commits/no receipt acknowledgement never send
  provider. Daily caps3/20 and UTC day unchanged. No live counters/claims refunded,
  reset, modified or migrated; no API key/model/provider change without evidence.
- Validation: focused Backend regression80/80 PASS; lint/typecheck/build PASS.
  Isolated Mongo integration BLOCKED this run: Docker Engine named pipe absent.
  Integration tests updated for real reservation receipts, pre-dispatch0 and
  global-cap rollback, but NOT claimed executed against a replica set this run.
  No development/production fallback; DB writes0, Gemini calls0, commit/push NO.
  Live Gemini root cause remains UNKNOWN. Do not make more attempts/projects to
  bypass quota or replay any historical claim. New quota transaction behavior
  remains pending isolated integration verification before claiming runtime ready.

### Quota replica-set integration completed (2026-10-22)

- Docker Engine29.9.2 available. Dedicated mongo8.0.17/narration-test-rs at
  127.0.0.1:27029 verified by existing strict guard before fixture writes;
  multilingual_ai_narration_groups_test only, no development fallback.
- Existing combined Customer+GROUPS_V1 integration26/26 PASS. Added two direct
  quota regressions and reran affected Customer suite12/12 PASS; GROUPS_V1 remains
  16/16 PASS. Injected receipt-write failure rolled back BOTH owner/global counters
  before mock dispatch. Five distinct concurrent attempts for one owner admitted
  exactly3, wrote3 receipts, counted3 globally, and reread/restart added0. Sixteen
  duplicate ledger instances admitted1; receipt/day persisted. Global-cap denial
  rolled back owner insertion. Source/revision/approval transaction regressions PASS.
- Exact synthetic fixture and quota-key cleanup PASS; no database/volume drops.
  No production code defect found in this validation. Changes this follow-up:
  tests/customer-mongodb.integration.ts and docs/PROGRESS.md only.
- Offline actual .env inspection: gemini / gemini-3.8-flash, thinkingDEFAULT,
  keyPRESENT, SDK2.28.0; Customer flagOFF, global GROUPS_V1 flagOFF. SDK mock verifies
  explicit MEDIUM, maxOutputTokens8192, metadata1/generation1 and no retries.
  Timeout120s unchanged. These validate configuration/serialization, NOT live
  provider model access/quota/availability or success of a real translation.
- Historical live attempts/counters unchanged. Real Gemini calls0; development/
  production writes0; no real permit/claim/retry/reset, no feature activation,
  no TTS/render or commit/push. Historical provider failure still UNKNOWN because
  its HTTP status was never saved; this validation does not manufacture that evidence.
- Next real call requires available legitimate daily quota, loaded corrected
  Backend/Web, explicit Customer activation/approval, a verified current source
  with no existing attempt/conflicts, then ONE manual English translation click.
  Do not replay CLAIMED/UNCERTAIN or the existing failed attempts or create projects
  to bypass quota. Stop at validated draft; no automatic approval/provider retry.

### Configurable Customer quotas — replace Q trial constants

- Removed fixed3/user/day and20/global/day from normal runtime. Backend variables
  CUSTOMER_TRANSLATION_DAILY_USER_LIMIT / CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT
  default20/200, validate positive integer ranges1..1000 /1..10000. No unlimited
  sentinel; bad settings fail before a fresh claim/charge/dispatch. Same policy
  should be deployed across workers. Per-request policy snapshot avoids mid-request
  configuration drift; old attempt binding and persisted counters stay unchanged.
- Finite attempt reservations constrain activity but are not a USD billing cap.
  Per-call source/output/timeout/response caps, process concurrency and no retries
  unchanged. No real flags/model/key/credentials or backend/.env were modified.
  .env.example documents settings. Raising limits cannot replay old attempts;
  no historical counter/claim reset, refund, source mutation or real Gemini call.
- Small3/20 limits now exist only as explicit test-process overrides. Added parser/
  invalid-config/no-replay regression and isolated integration showing four
  independent owned projects work with normal defaults and are charged only once.
- Consolidated validation: Backend focused83/83 PASS; isolated Customer+GROUPS_V1
  Mongo integration29/29 PASS (skipped0); exact fixture cleanup PASS; Backend lint,
  typecheck, build and git diff --check PASS. New default test completed4 distinct
  project drafts using mocks, with4 reservations and0 duplicate charges on reload.
  No application production defect observed during integration. No Web source
  changes. Real Gemini0, development/production writes0, no reset or commit/push.

## Translation HTTP 400 request-contract check — 2026-10-22

- Historical failure cause remains UNKNOWN beyond confirmed HTTP400. Actual
  installed SDK2.28.0 serialization matches documented v1beta generateContent,
  JSON schema output, model identifier and DEFAULT/explicit MEDIUM configuration.
  No evidence justifies changing model, key, thinking or payload parameters.
  STT shares the API key but uses a different model and interactions endpoint;
  STT success does not prove generateContent succeeds.
- Added bounded, allowlisted HTTP400 status/reason/parameter-root extraction,
  propagated through existing provider/service failure mapping into the existing
  durable attempt failure record and safe log. No raw body, descriptions, prompts,
  headers, credentials or arbitrary field paths retained. Absent details remain
  UNSPECIFIED. Existing claims/quota/source/API contract unchanged.
- Regression covers real SDK mock serialization, local output validation,
  sanitization/bounds/schema persistence validation and mock SDK→service→attempt
  propagation with no retry. No real provider or database calls used.
- Existing uncertain attempts remain untouched and cannot be safely replayed.
  Future eligible attempts retain safety guards, but historical400 resolution
  cannot be claimed without specific provider evidence. No automatic real test.
- Validation:83 existing regression tests PASS;6 new tests PASS after fixing the
  MEDIUM test fixture to enable its test-only Customer scope (initial run88/89).
  Backend lint, typecheck, build and git diff --check PASS. Initial sandbox test
  launch was blocked by Windows spawn EPERM; mock-only suite ran outside sandbox.
  Real Gemini calls0, database writes0, attempt resets0, commit/pushNO.

## Gemini fallback preparation and400/503 guidance — 2026-10-22

- Primary remains gemini-3.8-flash; configurable candidate fallback defaults to
  gemini-3.6-flash. PRIMARY default, FALLBACK explicit server-only pre-attempt
  selection. No automatic switch/retry. Selected model captured in durable binding
  and async scope so configuration drift cannot dispatch a different model.
  Old attempt keys/claims/quota and controlled permit workflow unchanged.
- Added distinct safe initial error and authenticated status/Web guidance for
  HTTP400/503, without exposing internal diagnostic bodies or raw errors. Reload
  remains GET-only. No UI generation unlock or frontend fallback selection.
- Official docs checked:400 may be malformed request/API version or unmet
  regional/billing prerequisites;503 availability. Actual billing/access cannot
  be inferred from documentation or the earlier503. Historical400 root cause
  remains UNKNOWN; no speculative payload/model/API-key change implemented.
- Validation: initial focused Backend91/96 (four subtests plus parent failed due
  to missing inspect mock); corrected only the new test fixture, affected file6/6
  PASS on rerun. All96 focused cases now verified across runs. Web299/299 PASS.
  Backend/Web lint, typecheck, build PASS; Vite existing mixed static/dynamic import
  advisory remains. Browser NOT RUN. No Mongo integration run needed for config/
  safe-read mapping; all persistence mocked, no DB connection or writes.
- Real `.env`/credentials/rollout flags unchanged. Gemini calls0, database writes0,
  old attempt resets/retries0, commit/pushNO. Real execution requires separate
  approval and a fresh eligible source/attempt, not replay of any uncertain record.

## S26.3 — GEMINI_SIMPLE_V1

- Implemented optional server-selected normal Customer method, GROUPS_V1 default
  retained. Reuses existing SDK/transport, pre-dispatch fences, transactional quota,
  source verifier/group planner and durable draft pipeline. No new API/provider
  fallback or Web mutation route. SIMPLE omits schema/MIME/thinking configuration,
  requests JSON in its instruction and validates strictly with original local
  schema, exact IDs/order/count/nonempty translations and STOP finish reason.
- Bound method/model before claim/dispatch; changing method cannot rearm any old
  attempt. Existing GROUPS_V1 binding unchanged. Controlled/legacy paths unaffected.
  Source IDs/timestamps/revision/digests remain derived from immutable source.
- Small-source one-generation scope:32 groups,2000 UTF-8 bytes/group,12000 JSON
  input bytes; general96KiB/10000 source limits also retained. Larger input rejected
  before claim, never silently truncated or partially translated. No long-video
  multi-call batching or fake timestamps. Conservative bytes≠exact token budget.
- Focused Backend113/113 PASS,0 skipped; tests include one/multiple groups,
  malformed JSON/markdown, missing/duplicate/wrong/reordered IDs, empty/truncated
  response,400/429/503, timeout/response overflow, DEFAULT-only thinking, method
  drift, durable replay across method switch, quota/auth/source and GROUPS_V1
  regression. Initial lint found prefer-const in new test, corrected. Backend
  lint/typecheck/build PASS. No Web files changed; existing UI handles validated
  drafts/errors and duplicate-submit guard. Browser/live verification NOT RUN.
- No real Gemini calls, MongoDB connections/writes, rollout activation, key change,
  attempt reset, commit/push. Real successful S26 plain-text diagnostic does NOT
  prove this new JSON-instruction strategy works live. Requires separate request
  approval, fresh eligible owned CURRENT source, quota/model/access verification
  and runtime restart after explicit method configuration. Stop at draft review.

## S26.6 — SIMPLE Customer integration validation

- PASS on isolated MongoDB8.0.17 replica set narration-test-rs, loopback27029,
  database multilingual_ai_narration_groups_test. Existing isolation guard verified
  explicit URI/database, distinct development endpoint, Docker image/project/
  volume/network, PRIMARY and host/container process identity before fixture writes.
- Added real SDK fetch-mock + JWT HTTP + real isolated Mongo coverage to existing
  customer-mongodb.integration.ts. Three synthetic source groups preserve exact
  source IDs/order/timestamps/revision/digest. Draft survives status GET and duplicate
  POST without another provider call. reviewed=false cannot approve; explicit
  reviewed=true atomically creates one READY translation and TRANSLATED project.
  Source digest unchanged. No automatic approval in application flow.
- Missing groups/malformed JSON produce FAILED_RESPONSE with no draft; timeout/
  HTTP503 produce UNCERTAIN with no draft. Duplicate POST returns409 without SDK
  redispatch, each attempt has exactly one test quota reservation. Test-specific
  caps raised only within this synthetic subtest and restored; actual .env untouched.
  Existing suite verifies JWT/ownership, quota transaction rollback, concurrency,
  restart recovery, approval/edit race and legacy GROUPS_V1 behavior.
- Validation: isolated Customer integration14/14 PASS, Backend mock113/113 PASS,
  Web mock299/299 PASS;0 skipped. Backend/Web lint/typecheck/build PASS. Existing
  Vite static/dynamic import advisory remains. Browser rendering NOT RUN; Web
  validation is mock/source regression, not live browser proof. diff-check PASS.
- Exact fixture cleanup PASS; only run-owned IDs/counters removed, no database or
  volume drop. Test Mongo stopped afterwards (initial state stopped), volume kept.
  Development/production connections/writes0; real Gemini0. Test-only Gemini key,
  metadata/generation responses and English content synthetic. No real key/model/
  .env change, old attempt reset, Customer activation, commit or push.
- Remaining: real multi-group generation quality/token usage and live Customer
  browser flow are unverified. One-group S26.5 success plus isolated integration
  do not establish production reliability. Real test requires separate approval,
  fresh owned CURRENT source within SIMPLE limits, no conflicting attempts,
  quota/API access and explicit SIMPLE+DEFAULT configuration. Normal Customer
  provider includes one metadata GET plus one generation POST; a POST-only approval
  still cannot authorize that full path. No real execution initiated here.

## S26.12 — Customer SIMPLE preflight

- Implemented development-only GET simple-preflight, JWT/CUSTOMER/ownership and
  no-store; reused bounded source/planner and shared exact provider-input builder
  with SIMPLE runtime validation. No alternate source serialization or cap change.
  Reports CURRENT/revision/digest/counts/byte sizes/coverage without private text.
- Durable attempt, saved English and active project jobs read-only checks plus
  RAM-draft PROCESS_LOCAL_ONLY/other-process UNKNOWN. Source digest checked twice
  to detect drift. Does not authorize or reserve a future request.
- Quota read/deployment attestation contract absent: explicitly NOT VERIFIED and
  overall BLOCKED/generationAuthorized=false. Safe actual serving-process method/
  Customer flag/DEFAULT-thinking are returned, not disk-only configuration guesses.
- Added user-click-only Customer Web panel in both Translation branches. Existing
  session/API GET, no token export/refresh/retry, timeout/unmount/double-click guards.
  No generation, mutation or auto-enablement, and no dependency or route redesign.
- Mock validation: Backend initial100/101, Web302/303; fixed new empty-fullText
  boundary fixture and obsolete JSX-wrapper assertion only. Affected Backend4/4
  and Web6/6 PASS on rerun; all101 Backend and303 Web cases verified across runs.
  Includes JWT/ADMIN/non-owner/production rejection, source boundaries, UNCERTAIN,
  unknown quota/deployment, fail-closed forged responses and accessible SSR.
  Backend/Web lint/typecheck/build and git diff --check PASS. Browser/live GET
  NOT RUN. Existing Vite mixed static/dynamic import advisory unchanged.
- Files: customer-simple-preflight service/test; project.routes; shared SIMPLE
  payload builder + group service call sites; CustomerSimplePreflight component,
  simplePreflightView module/declaration/test, TranslationPage and adjusted Web
  regression assertion; existing diagnostic route regression; API/UI/PROGRESS docs.
- Gemini0, MongoDB connections/writes0 (all models/network mocked); old attempts/
  quota/transcripts unchanged, no .env/restart/rollout/commit/push. User can perform
  authenticated GET on bom dan manually after source is loaded by their runtime;
  no live status for that project has been fabricated. Stop before real execution.

## S26.13 — final evidence contracts (not real translation activation)

- Extended existing authenticated development simple-preflight GET, preserving
  JWT/CUSTOMER/ownership/no-store. Added read-only existing quota ledger observation
  using current configuration/UTC keys; no new quota or attempt system. Missing
  counters0 used, malformed data/errors fail NOT VERIFIED. No claim/reservation.
- Added actual serving Mongoose connection hello observation with opaque database/
  replica membership fingerprint and ephemeral instance ID. VERIFIED observation
  is distinct from intended-target operator approval (still NOT VERIFIED). No URI,
  names/hosts or credentials returned. No separate database connection created.
- Project/owner/en durable-attempt existence across revisions is read cross-process;
  arbitrary RAM-only drafts in other processes cannot be inspected. Overall
  cross-process safety remains UNKNOWN/BLOCKED, no fake global CLEAR, no shared
  registry or broad infrastructure added. Preflight never enables generation.
- Backend31/31 relevant mock tests PASS,0 skipped; lint/typecheck/build/diff-check
  PASS. Covers quota config/missing/full/corrupt rows, no writes, scoped durable
  conflicts, live-connection mock fingerprint/no secrets and independent errors.
  No Frontend source change; S26.12 panel stays conservative; new evidence visible
  through existing authenticated Network response. No live Customer GET/session
  available to validate bom dan quota or deployment, so live values NOT VERIFIED.
- Files: new preflight-runtime-evidence.ts + test; customer-simple-preflight.ts +
  test; API/PROGRESS documentation. No runtime .env/restart/model/key/flags changes.
  Real Gemini0; MongoDB connections/writes0 (tests mock DB reads); no old attempts
  modified/reset; commit/pushNO. Remaining: user-initiated authenticated GET,
  intended-deployment approval and other-process RAM uncertainty; no automatic
  Customer enablement or real translation initiated.

## S26.18 — fix preflight aggregation

- Confirmed root cause: constant BLOCKED/generationAuthorized=false plus unconditional
  deployment/RAM reason codes; Web also rejected every status except BLOCKED and
  hardcoded unknown evidence. Replaced aggregation with concrete BLOCKED vs missing
  mandatory-evidence UNKNOWN vs computed scoped READY. GET generationAuthorized
  remains false deliberately (not a dispatch permit); readyForManualExecution true
  only for READY. No JWT/ownership/quota/durable execution guard changed.
- Serving-connection observation now compares actual database name to explicitly
  user-approved development target multilingual_ai_narration plus development mode
  and Atlas member-host checks, not fingerprint alone. Wrong target is MISMATCH.
  No URI/credentials returned, .env modified, source data changed or Mongo connected
  during validation. Named-target policy is not approval for production.
- Other-process RAM remains UNKNOWN, now an explicit scoped-readiness warning,
  never CLEAR. READY covers normal Customer durable path, not global/operator RAM
  absence. Known attempts/drafts/jobs/English records, exhausted quota, source drift
  or bounds/runtime failures remain blocking. Mandatory missing evidence UNKNOWN.
- Web displays validated READY/BLOCKED/UNKNOWN, actual safe quota and target evidence;
  no flag activation or generation/approval action. Mock regressions: Backend40/40,
  Web304/304 PASS,0 skipped. Backend/Web lint/typecheck/build and diff-check PASS.
  Existing Vite mixed-import advisory remains. Browser and live bom dan preflight
  NOT RUN. No claim of current runtime READY while SIMPLE remains disabled.
- Changed: customer-simple-preflight.ts, preflight-runtime-evidence.ts, both Backend
  tests; simplePreflightView.mjs/declaration, CustomerSimplePreflight.tsx, Web test;
  API/UI/PROGRESS docs. Skill ui-ux-pro-max informed non-misleading live status copy.
  Gemini0, database writes/connections0; no attempts/reservations, .env change,
  restart, commit/push. Can prepare separate configuration approval; not executed.
## S29.4B — Customer Mobile navigation (2026-10-24): PARTIAL

- Audited actual Web Sidebar/Topbar/routes/library eligibility and Mobile tab
  layouts, auth guards, header, create form, legacy history and account screens.
- Implemented four main navigation slots matching Web order and semantic icons;
  new SDK 58 tab bar uses emitter/navigateToTab, native safe insets, equal widths,
  keyboard hiding and shared Customer tokens. Account is reached from avatar,
  with back navigation; existing logout/session implementation stays intact.
- Reused the existing create form in `/(tabs)/create`; preserved `/projects/new`
  as a protected redirect and retained tab state. Existing `/history`, `/account`
  and `/settings` remain accessible without being primary tabs.
- Missing: a native completed-products library matching Web. Its fourth slot is
  disabled rather than opening legacy all-status history or a fabricated screen.
  This is an explicit implementation dependency for a separately scoped step;
  no claim of four fully functional tabs or completed library parity.
- Changes: CustomerBottomNavigation.tsx, MobileHeader.tsx, tab layout/create,
  projects/new compatibility route, NewProjectScreen.tsx, navigation label module
  and declaration; customer-navigation-parity, dashboard-ui-polish,
  navigation-interaction and sdk58-migration tests; UI/PROGRESS docs.
- Validation: Mobile 167/167 tests PASS; Web regression 400/400 PASS. Mobile
  TypeScript, ESLint and Android Metro/Hermes export PASS. Token synchronization,
  Museum asset synchronization and diff-check PASS. Pixel 7 observed Dashboard
  and create navigation; exact 360/393dp and full account/back, keyboard, safe-area
  and tab-state visual acceptance remain MANUAL PENDING.
- No real upload, create, logout, Gemini/TTS, MongoDB writes, attempt reset,
  authentication/workflow guard change, Web/Backend/Public Museum source change,
  commit or push. No next step started.
## S29.4C — Customer Mobile Narration Library Web Parity (2026-10-24): PARTIAL

- Implemented native `/library` and enabled fourth Customer tab. Preserved
  `/history` as legacy all-status project history, Account via avatar and three
  existing tabs. Reused Button/Card/Input/Spinner/EmptyState/ErrorState, current
  tokens, authenticated projectRepository and complete-page loader.
- Audited actual Web HistoryPlaceholder, useCompleteHistory, libraryPresentation,
  RESULT guard, repository and ResultPage. Eligibility, descending updatedAt order,
  metadata, search/media/language, manual apply, pages12 and read-only result action
  now match. No fake products, preview thumbnails or extra library actions added.
- Files added: app/(tabs)/library.tsx, screens/LibraryScreen.tsx,
  features/results/libraryPresentation.ts, features/results/useLibrary.ts,
  tests/narration-library.test.mjs. Updated CustomerBottomNavigation, tab layout,
  ProjectWorkflow/DTO types and navigation/Dashboard tests, UI/PROGRESS docs.
  Existing S29.4B edits retained; no other screen redesigned.
- Tested: Mobile180/180, Web400/400 PASS (0 skipped). Mobile TypeScript/ESLint,
  Android Metro/Hermes, Web lint/typecheck/build, token/Museum synchronization and
  diff-check PASS. New tests13 cover Web selector parity, missing artifact/language,
  multiple API pages,401/403, filters/pagination, states, result navigation and
  session-race isolation. All automated data/API fixtures are isolated mocks.
- Pixel7 visually observed real empty library and active tab. No actual completed
  artifact available in observed state, no media opened. Exact360/393dp, large
  text/gesture safe area and avatar/back remain MANUAL PENDING. Expo Go overlay
  obscured avatar; no emulator setting/authentication change made.
- Known dependency: pre-existing Mobile ResultScreen limits language to its
  vi/en/ja/ko catalog; Web accepts verified normalized codes. Existing native
  result playback/share and legacy-history return remain unchanged. This step
  does not certify result playback or full end-to-end parity for every language.
- Safety: no Web/Backend/Public Museum/Login/Register/config/API/guard changes,
  no MongoDB writes, AI/TTS/render/job dispatch, UNCERTAIN retry/reset, commit or
  push. No S29.5 work started.
## S30.1 — Video MP4 processing fix (2026-10-25): PARTIAL

- Read-only investigation of project `6addad0fd70ccfecdc62b77c` found three
  VIDEO_PROCESSING jobs FAILED with MEDIA_PROCESSING_FAILED and no Result.
  Existing narration `6addade8d70ccfecdc62b7af` is READY, English MP3. No existing
  project, job, narration, translation or attempt was changed.
- Confirmed and reproduced a Result transaction defect on the isolated MongoDB
  8.0.17 replica set: parallel operations on the same session intermittently
  raise MongoServerError 117. Replaced transaction Promise.all reads and revision
  fence writes with sequential awaits. Historical jobs discarded their detailed
  errors, so code 117 cannot be attributed conclusively to each old failure.
  Reference: https://mongoosejs.com/docs/transactions.html#note-about-parallelism-in-transactions
- Fixed post-commit confirmation handling: a subsequent read failure preserves
  the committed Result, completed job and artifact, returning a safe confirmation
  error. Preparation failures now enter the job failure handler as well.
- Added bounded, sanitized stage/exit/signal/duration diagnostics for FFprobe,
  FFmpeg, validation and persistence failures. Optional ProcessingJob diagnostics
  are excluded from ordinary queries. Customer responses expose no server path,
  raw stderr or private database error. No logging service or dependency added.
  Previously these handled errors produced neither structured processing logs
  nor persisted cause details, explaining why a terminal could show startup only;
  this does not establish where historical terminal output was captured.
- FFmpeg remains a child process of the Backend request, not a separate worker.
  Existing MP3 narration is explicitly mapped and encoded as AAC in MP4; changing
  TTS_AUDIO_FORMAT or regenerating narration is unnecessary. Output now requires
  H.264 video, AAC audio, MP4 container and a nonempty artifact before persistence.
- Real input FFprobe: H.264 360x640, 28.142585 seconds; English MP3 narration
  24kHz mono, 10.848 seconds. Independent render using the patched adapter created
  a 1,573,111-byte H.264/AAC MP4, 28.142583 seconds. Both video/audio decode passed;
  audio mapping uses the existing English narration, with silence padded to source
  duration. SHA-256 checks confirmed both inputs unchanged; temporary output was
  removed. Manual viewing/listening and actual Customer Result playback remain
  NOT VERIFIED. A separate real FFmpeg regression passed Unicode/space paths and
  portrait input. No Unicode workaround or media replacement was necessary.
- Validation: 35 distinct Backend test cases PASS (including Node's parent test
  count): 7 diagnostics/process tests, 8 isolated Result lifecycle cases, 19
  provenance/workflow/stale-guard cases and 1 real FFmpeg Unicode/decode case.
  The initial combined run passed 33 cases; the affected Result suite was rerun
  after adding preparation failure coverage and passed 8/8. Web workflow/result
  regression 28/28 PASS. Backend TypeScript, ESLint, build and diff-check PASS.
  Windows sandbox initially blocked child processes (EPERM); permitted local
  executions passed. The legacy media test that connects using normal .env was
  deliberately not run; all persistence fixtures used a verified Docker-only
  replica set and were cleaned without touching development/production data.
- Changed: backend/src/models/ProcessingJob.ts; result.service.ts;
  media-processing/{ffmpeg-media-processor,media-processor.interface,
  processing-diagnostics}.ts; tests/{media-diagnostics,media-ffmpeg-real,
  result-isolated}.test.ts; this progress entry. Existing unrelated Mobile/Web
  and documentation changes were preserved.
- Real workflow retry NOT performed. Separate approval would authorize an
  authenticated owner POST `/api/projects/6addad0fd70ccfecdc62b77c/process` with
  `{"narrationId":"6addade8d70ccfecdc62b7af"}` after rechecking current guards.
  It creates a NEW VIDEO_PROCESSING job, preserves the three old failures, writes
  a Result/artifact on success, updates Project/job lifecycle and activity logs,
  and fences upstream revisions transactionally without changing their content
  or revision values. It does not translate, call TTS/AI or touch UNCERTAIN
  attempts. No retry, development/production MongoDB writes, API-key/config change,
  commit or push occurred. End-to-end completion awaits approved workflow run
  and authenticated Result playback/download verification.
## S30.3 — Customer translation HTTP 504 handling (2026-10-25): PARTIAL

- Read-only recheck of `6addb6e3e12594669c2bd4d3`: attempt remains UNCERTAIN /
  GENERATION_DISPATCHING, TRANSLATION_PROVIDER_ERROR, numeric HTTP evidence 504,
  from 08:00:00.558Z to 08:02:00.784Z (15:00–15:02 local). No persisted draft,
  requestId/responseId/transport diagnostics, English translation, narration or
  Result. Original stdout logs were not available as repository log files.
  The exact historical gateway/Google service producing the 504 is INCONCLUSIVE;
  elapsed time alone is not proof of a local timeout or provider execution.
- Rebuilt the source plan with existing pure planner/contract, without writes:
  READY revision1, 4 groups, 41 segments, 250 source bytes, 947 JSON bytes, largest
  group109 bytes; SIMPLE limits PASS and attempt source revision still matches.
  No evidence of an input-limit failure, FFmpeg dispatch or missing source revision.
- Confirmed defects fixed: HTTP408/504 mapped to TRANSLATION_TIMEOUT while keeping
  numeric HTTP evidence; attempt status now exposes safe 408/429/504 codes as well
  as 400/503. Old database rows are unchanged and their 504 is now visible to Web.
  Web diagnostic feedback explains uncertain timeout and forbids resubmission;
  the important safety warning remains visible, technical details collapsible.
- Added optional durable operator diagnostics: HTTP_RESPONSE / LOCAL_ABORT /
  NETWORK, METADATA/GENERATION, elapsed milliseconds and allowlisted opaque
  request correlation headers. No raw headers, body, prompts or API key logged.
  Expired signals are checked before durable dispatch and before fetch, including
  the interval after metadata/source validation. A local abort is not assigned a
  synthetic HTTP status and cannot inherit successful metadata as its error origin.
- Preserved model/method/thinking, shared120-second overall deadline, SDK timeout,
  one metadata/one generation request, zero retries, output8192 tokens, response
  byte limit, per-owner/global admission, JWT/ownership, quotas, revision/digest
  guards and durable unique attempt key. No arbitrary timeout increase, batching
  change, model fallback or claim reset. Client disconnect does not authorize a
  second request. No translation is completed without validated durable draft.
- Recovery: existing generateContent transport is synchronous; the documented
  API contract provides no result-lookup method used by this app. No durable old
  request ID or saved bytes exist to reconcile this attempt. Do not assume a
  response ID can retrieve missing output. Lost save acknowledgement recovery
  continues to read/reuse the same already-validated saved bytes, never regenerate.
  References: https://ai.google.dev/api/generate-content and
  https://ai.google.dev/gemini-api/docs/troubleshooting . No provider call made.
- Resolved prior7 regression FAILs through verified fixture issues: ADMIN's
  owner-free lookup had no matching project, so assert PROJECT_NOT_FOUND/404 and
  zero dispatch rather than expecting a later403; restore mutable mock user role
  in finally to stop cascading failures. Explicitly isolate legacy tests from the
  development CUSTOMER_TRANSLATION_ENABLED value. No production auth/route guard
  changed and no assertion was broadened to accept arbitrary failures.
- Validation: Backend focused translation/timeout/attempt/workflow/Result guards
  95/95 PASS (previous run78 PASS/7 FAIL); Web403/403 PASS; both TypeScript/build
  and lint exit0; design token synchronization and diff-check PASS. Web retains
  existing exhaustive-deps warning in GroupTranslationWorkspace and build dynamic
  import warning in projectRepository; unrelated files were preserved.
  Tests cover HTTP504, local and pre-dispatch timeouts, durable failed/uncertain
  attempts across restart, duplicates/concurrency, save-ack recovery, sanitization,
  revision guards and GET-only UI recovery. Persistence/provider tests are mocks;
  no new real MongoDB integration or real provider execution was performed.
- Mobile counterpart reviewed through the existing Web/Mobile parity contract;
  its attempt feedback capability remains separate/PARTIAL and was not modified.
  Web runtime visual QA and real translation end-to-end remain NOT VERIFIED.
  No live MongoDB writes, attempts, AI/TTS calls, narration/Result changes, .env
  edits, explicit runtime restart, commit or push. Existing unrelated changes kept.
  Any future real AI test needs separate approval. This step does not authorize
  replaying the current UNCERTAIN attempt, even with a changed timeout/model.
## S30.4 — Customer AUDIO generation disabled button (2026-10-25): PARTIAL

- Read-only project `6addbb022c02bfbe89cce9bd` (test3): AUDIO source, Project
  COMPLETED/progress100; transcript READY revision1; approved English translation
  READY revision1, GROUPS_V1; narration READY revision1, speed1, audio/mpeg142892
  bytes and file exists at recorded size. TTS job COMPLETED at08:19:27.754Z;
  no queued/processing job, no video Result. Attempt DRAFT/SAVING, not UNCERTAIN.
- Confirmed cause: GenerateWorkspace's disabled expression included !canMutate;
  current Backend workflow is RESULT/COMPLETED, so revisiting GENERATE is read-only.
  processingService nevertheless unconditionally constructed WAITING with the
  media stage pending. A checked checkbox could not override !canMutate. This was
  stale/local UI state mapping, not failed TTS or missing MP3.
- Backend contract remains unchanged: AUDIO's CURRENT READY narration is its
  result, with protected narration audio endpoint; only VIDEO needs a separate
  /process job and MP4 Result. TTS progress100 alone is insufficient. Verified
  workflow/artifact/language evidence is now mapped to COMPLETED on initialization
  and manual Xem ket qua navigation; no processing POST or artificial audio job.
- Added generationReadiness guard, shared by actual Generate UI and processing
  session. Missing artifact, processing/UNKNOWN/mismatched workflow or language
  remain blocked with a specific explanation; VIDEO retains workflow+confirmation
  guards and synchronous duplicate-click prevention. Service rechecks fresh
  context before dispatch, never locally invents AUDIO completion, and disables
  API automatic refresh/resubmit for the video mutation. Generation context now
  reloads Backend project instead of reusing the pre-TTS cached workflow.
- Changed only Web pages/GeneratePage.tsx, features/processing/{generationService,
  processingService,generationReadiness}.ts, tests/audio-generation.test.mjs,
  tests/workflow-deep-link-guards.test.mjs and this entry. No Backend production
  source, Mobile, Admin, API, workflow state or database record changed this step.
- Tests: new8/8 actual workspace/service/mock tests PASS. Web full run410 PASS/
  1 FAIL exposed an outdated exact-source assertion for the disabled expression;
  updated it to require all three guards (mutation, checkbox, readiness), not to
  accept an arbitrary expression. Final full Web run411/411 PASS and affected
  UI/guard suites14/14 PASS. Backend
  AUDIO-terminal/Result-provenance/workflow/attempt regressions37/37 PASS. Both
  TypeScript, lint and build exit0. Existing Web exhaustive-deps and dynamic-import
  warnings remain unrelated. Web/Mobile token checks and Mobile counterpart
  workflow/result mock regressions19/19 PASS; Mobile source not modified and its
  separate generation implementation has not been migrated in this scope.
- Real Customer browser refresh, Xem ket qua navigation, playback and download
  of this existing MP3 remain MANUAL PENDING. No browser session used, no AI/TTS,
  audio/video processing, job/claim/reservation, MongoDB writes, attempt reset,
  config change, commit or push. Completion here is code/mock validation only;
  runtime end-to-end acceptance remains PARTIAL until manual review.
## S30.4 — Reused-video translation investigation (2026-10-25): PARTIAL

- Read-only comparison: A `6addad0fd70ccfecdc62b77c` and B
  `6addb6e3e12594669c2bd4d3` contain the identical1,716,601-byte source video,
  SHA256 `d39c7908450f711331b00971365cbb4128185ff9d02c45db732e01dfb6421de2`.
  Same owner verified internally; both attempts' owner/project bindings match.
  Both transcripts READY revision1 with41 segments; fullText, ordered segment
  texts and complete sequence/text/timestamp hashes match. Transcript/segment IDs
  differ, so sourceSnapshot digests correctly differ. Both rebuilt snapshots match
  their own attempt sourceRevision and yield4 groups; renaming is not an input.
- A is COMPLETED with an approved READY GROUPS_V1 translation containing4 groups;
  its durable attempt remains DRAFT/SAVING. B is TRANSCRIBED, has no English
  translation or durable draft, and remains UNCERTAIN/GENERATION_DISPATCHING with
  numeric504 from15:00–15:02 local. Native durable keys differ (`b6cc9c...` versus
  `5541b7...`), as do configuration bindings. No request/response correlation ID
  exists in either historical record. No changes were made to these records.
- Actual translation collections: translations (group output embedded),
  translationattempts and legacy translationsegments; no TranslationBatch or
  separate GroupTranslation collection/model exists in this application. Neither
  project has legacy TranslationSegment rows; no invented batch status reported.
- Durable key is digest([CUSTOMER_TRANSLATION_V1, ownerId, projectId, target,
  sourceRevision]); RAM single-flight cache key also includes ownerId/projectId/
  target/sourceRevision. Source revision hashes the complete transcript snapshot,
  including transcript/segment IDs and revision, not filename/video SHA/name.
  Provider receives fullText, language codes, group IDs and group source text,
  not the uploaded video or project name. No cross-project video-hash cache or
  deduplication found. Existing per-owner/global capacity/quota are intentional
  shared limits, not shared attempt claims; no such rejection explains B's504.
- New mock regressions execute actual GroupTranslationService, GroupDraftStore
  and CustomerAttemptStore native-key/CAS code with all storage/provider replaced:
  same video, same transcript with different media, same filename/different bytes,
  same hash/different projects, independent draft/claim, same-project idempotency,
  completed A versus new B, and an identical source fingerprint across A/B/C.
  A/C drafts survive B504; restarting the attempt store cannot resend B or mutate
  its failed claim. Test fixture uses real native key computation, not a substitute
  JSON key. All HTTP and MongoDB connections are forbidden or mocked in tests.
- Confirmed installed SDK behavior via mocked SDK fetch: timeout120000ms becomes
  X-Server-Timeout:120 in the outbound request. One metadata and one generation
  request maximum;504 maps to timeout and never retries. This establishes a server
  deadline mechanism, but without historical response/log correlation it cannot
  prove which upstream component produced B's504 or why execution exceeded it.
  No evidence ties504 to repeated video; transient load or other upstream causes
  remain unproven. No speculative cache/key/timeout/provider production fix made.
- Files added/updated in this step only: backend/tests/reused-media-translation.test.ts
  and this progress entry. Existing S30.3 timeout diagnostics and unrelated S30.4
  AUDIO/Web changes preserved; no FFmpeg/Result/Mobile/Admin changes.
- Validation: Backend combined100/100 PASS, then affected reused-media suite6/6
  PASS after adding the SDK deadline test (101 distinct cases in total); Web
  411/411 PASS; Backend/Web TypeScript, ESLint exit0, build and diff-check PASS.
  Existing Web exhaustive-deps and dynamic-import warnings remain unchanged.
- Real repeated-video acceptance is NOT RUN. With separate approval, use a new
  eligible owned project and existing translation UI once, then inspect persisted
  draft and diagnostics. Do not reset/retry B or reuse its UNCERTAIN claim. Actual
  provider outcome for a future attempt is not guaranteed by mock tests. No real
  AI/TTS calls, database writes, attempts/jobs, config changes, commit or push.
## S30.6 — Result VIDEO voice metadata parity (2026-10-25): PARTIAL

- Read-only verification: test3 `6addbb022c02bfbe89cce9bd` and test video trung
  `6addbf3422ee238cff209ff6` are COMPLETED. Their saved CURRENT narration records
  both contain speed1 and voiceId resolving to Alloy/providerVoiceId alloy. The
  VIDEO Result `6addbfae22ee238cff20a02d` references exactly narration
  `6addbfa422ee238cff20a029`, sourceNarrationRevision1. No missing stored metadata
  or broken Result/narration linkage found; TTS/video jobs are completed.
- Confirmed Web mapping defect: Result API exposes narrationId, while narration
  API serializer exposes voice/name and speed. resultService already loads both
  lists but discarded voiceName/speed on its VIDEO return branch. ResultPage uses
  useResult -> resultService -> resultRows, so the missing values became Khong co
  du lieu. AUDIO populated both fields from its selected narration.
- Fixed only Web resultService: join a selected video's exact narrationId within
  the requested project and matching target language; never select the newest
  unrelated narration or current voice configuration. AUDIO/VIDEO share metadata
  validation: nonempty voice name, finite positive recorded speed. Missing fields
  remain missing independently; no default Alloy/1x or fabricated data. Result
  selection/playback routes and artifact fields otherwise preserved. No API,
  Backend production, workflow, authentication, media file or database change.
- Added tests/result-voice-metadata.test.mjs (7/7 PASS): real service mapping and
  resultRows for both artifact types, missing/invalid metadata, independently
  missing fields, exact older narration linkage, project/language isolation and
  selected video's own metadata. Updated Backend downstream-stale-guards test to
  verify actual serializers expose narration voice/speed and correct Result FK.
  Only these two test files, Web resultService and this progress entry changed.
- Validation: Customer Result/Generate/workflow subset25/25 PASS; Backend related
  suite37/37 PASS, affected serializer/stale suite3/3 PASS after added assertions;
  Backend/Web TypeScript, ESLint exit0, builds and diff-check PASS. Web retains
  exhaustive-deps/dynamic-import warnings and bundle-size warning. Full Web suite
  is NOT PASS:379 PASS/39 FAIL of418; failures are Public Museum VM/CommonJS
  harness errors (Cannot use import.meta outside a module). Running its public
  anonymous-routing case alone reproduces the same error; Customer pages are
  markers in that harness, not the Result service under change. No unrelated
  Public Museum source/tests changed to hide those failures.
- Mobile Result counterpart reviewed; it retains a separate VIDEO mapping and
  metadata parity gap, left unchanged per scope. Mobile result mock tests15/15
  and both design-token checks PASS. This step does not claim Mobile metadata fix.
- Expected existing Web results after reload: Alloy and1x for both verified
  projects, drawn from each actual narration. Customer authenticated browser/API
  end-to-end visual acceptance remains MANUAL PENDING; database evidence plus
  serializer/mock tests do not substitute for that acceptance. No AI/TTS calls,
  media processing, MongoDB writes, attempts/jobs, reset/retry, config changes,
  commit or push. Full-suite Museum failures and manual UI review keep overall
  status PARTIAL despite the focused metadata correction passing.
## S31.2 — Admin Dashboard UI/UX and data audit (2026-10-25): PARTIAL

- Audited UI/PROGRESS, Dashboard/cards/hook/service/layout/navigation, Customer
  tokens and existing Backend admin.service.dashboard source before editing.
  Root inaccuracies were project KPI descriptions claiming jobs and unconditional
  mock banners on an API-driven UI. The observed9 failed projects versus28 failed
  jobs is not a contradiction: many jobs can belong to one project.15 completed
  today is a job count based on Backend-local midnight, not completed projects.
- Existing authenticated ADMIN GET /api/admin/dashboard remains the sole data
  source. Server countDocuments aggregates are used directly; recentProject/job/
  activity lists are5/5/6 and never treated as full-system lists. Customer count
  filters role CUSTOMER and deletedAt:null; project total includes all Project
  documents; processing covers TRANSCRIBING/TRANSLATING/GENERATING_AUDIO/
  PROCESSING_VIDEO; failed projects use FAILED. Job counters are separate and
  TranslationAttempt failures/UNCERTAIN are not included. No Backend edit.
- No authenticated browser session/API query was used, so the user's latest
  9/31/0/9 and15/28 figures remain independently NOT VERIFIED; only their source
  definitions are verified. No DB privileges substituted for ADMIN authentication.
- Added pure dashboardMetrics KPI definitions/aggregate validation. Service marks
  successfully validated existing API data, rejects unavailable/malformed counts
  and lists, preserves raw statuses (including FAILED with progress100), and has
  no runtime fixture fallback. Refresh has a synchronous pending lock and abort
  fence; safe error handling hides unavailable counts, ignores late/unmounted
  responses and allows a later read-only refresh to recover.
- UI: improved4 KPI cards, full-width recent-project table, job/summary columns,
  activity list, scoped Be Vietnam Pro/purple/slate tokens, readable cards/table
  spacing, responsive grids, focus and reduced-motion. Removed stale mock labels;
  added source/update notice and collapsed definitions. Admin brand changed to
  Thuyết minh bảo tàng; all routes/active-state/auth logic remain intact.
- Files changed this step: admin-web/src/pages/AdminDashboardPage.tsx;
  hooks/useAdminDashboard.ts; services/adminDashboardService.ts; types/dashboard.ts;
  utils/dashboardMetrics.ts (new); dashboard/{SystemStatusCard,ProcessingJobsCard,
  RecentProjectsCard,RecentActivityCard}.tsx; layout/{AdminAppShell,AdminSidebar,
  AdminMuseumMark}.tsx (last new); styles/{dashboard,admin-shell}.css (last new);
  tests/dashboard-parity.test.mjs (new); docs/UI.md and this entry. S31.1 Login and
  unrelated Customer/Backend/Mobile changes preserved without overwrite.
- Validation: Admin15/15 PASS, including7 Dashboard tests for units, server totals,
  malformed data, no fake fallback, loading/error, refresh duplicates/recovery/
  abort, status-vs-progress, navigation and responsive/token contracts. TypeScript,
  ESLint/build/diff-check PASS. Customer shell/brand/Dashboard/Result regression
  24/24 PASS; no Customer source changed. Browser visual QA1280/1440/1920 and
  tablet/mobile-browser, live authentication/API counters and refresh remain
  MANUAL PENDING. Source/CSS tests do not constitute visual acceptance.
- No real data/API/config/Backend/auth/session/role change; no Gemini/TTS/FFmpeg,
  MongoDB write, new/retried/reset job/attempt, commit or push. No Admin Mobile or
  S31.3 implemented. Overall PARTIAL pending authenticated live/visual acceptance.
