# UI Specification

## S29.3.3B — Dashboard time-filter verification (2026-10-24, PARTIAL)

Month retains one bucket per local calendar day and horizontal scrolling. Pixel7
October2026 initially showed zero early days; swiping revealed positive later
days. No artificial values or layout changes added. Formula unchanged:
count(createdAt local date equals bucket key); day uses seven inclusive dates,
year twelve local months. No updatedAt or midnight end-boundary filtering.

DashboardTimeFilter synchronizes valid day/month/year edits into the draft date
before switching modes, matching Web's single draft anchor. Month-end clamps on
edit, including leap years; Apply/reset/close semantics retained. ui-ux-pro-max
guidance informed truthful data and consistent draft/applied state, not changing
the chart to manufacture nonzero bars.

Mobile141/141, TypeScript, ESLint, Android Metro/Hermes, token/image sync and
diff-check PASS. Isolated boundary/timezone/mode-switch comparisons use actual
Web selectors. Pixel7 monthly data visibility VERIFIED; full post-fix filter
interaction Visual QA MANUAL PENDING. No Web/Backend/database/AI/config edits.

## S29.3.3 — Customer Mobile Dashboard Functional Parity (2026-10-24, PARTIAL)

### Verified Web audit and scoped Mobile implementation

| Area | Actual Web source | Mobile change |
|---|---|---|
| Dataset | projectRepository/useProjects: GET /projects?page=1&limit=100; pagination retained; NOT an all-pages aggregation | Dashboard-only hook reuses projectRepository.listPage with page1/limit100, reloads on focus, ignores cancelled results. Existing Projects/repository consumers unchanged. |
| Completeness | Dashboard suppresses both charts when pagination.total exceeds loaded records | Both charts require verified first-page total equal to unique loaded IDs. Missing metadata/duplicates fail closed. More than100 records: explicit incomplete-data feedback, not partial account statistics. No pagination loop. |
| Statistics | dashboardMetrics/projectUtils: createdAt in device-local calendar; COMPLETED by status only; processing status set, FAILED, residual Other | Same selectors/one-decimal percentage and integer scale. No progress100 completion inference or invented data. |
| Time filter | DashboardPlaceholder: day/default today (seven days including anchor), month (all calendar days), year (12 months); draft/apply/reset; bar only | Native accessible disclosure/radio/input controls; reset changes draft only; apply commits; close/reopen restores applied values. Month/year labels scroll inside chart, not the page. Donut/recent projects/activity unaffected. |
| Continue | Fresh owned GET /projects/:id, workflow.canResume, projectAction/workflowRouteGuard, trusted target language and result artifact checks; eight-second bound | Fresh GET, exact returned ID, same current-step route mapping, eight-second timeout/cancellation, synchronous duplicate lock, localized error and no navigation on failed verification. No cached status/progress routing. |

Routes reused: /projects/:id, /transcript, /translation, /voice, /generate,
/result, with verified language query when available; no new routes/endpoints.
List enrichment retains existing media/translations GETs and current session client.
Continue GETs explicitly disable auth refresh/resubmission; no generation POST.

### Safety differences and capability limits

- Backend project workflow does not incorporate normal Customer TranslationAttempt.
  For translation and later steps, additionally use existing authenticated GET
  /projects/:id/translations/customer-draft/en. UNCERTAIN, PROCESSING, NOT_SENT,
  EXPIRED, failure or unknown attempt states block Continue. Public API status is
  DRAFT_SAVED (not the storage enum DRAFT). Existing saved Customer drafts do not
  enter Mobile's legacy translation editor; later steps still require fresh
  Backend workflow/language/artifact evidence. Transcript/upload navigation does
  not require a source that may not exist yet.
- This existing attempt GET is vi→en-specific and requires Customer translation
  enabled. If unavailable, Continue for translation/later steps fails closed;
  other-language Customer attempt parity is not claimed. Mobile's existing
  language catalog is also narrower than Web: unsupported targets are blocked,
  never silently replaced. No new API or translation UI invented to hide gaps.
- Web's error fallback can open project details with a notice. Mobile deliberately
  remains on Dashboard with an accessible error and existing Chi tiết action.
- Existing protected destination screens remain unchanged; this is navigation,
  not new mutation authority or a workflow lock. Backend remains authoritative
  for subsequent explicit actions. No opening/clicking Continue calls AI.
- S29.3.2 Hero, four quick links, charts/recent/activity order, no KPI and four
  Customer tabs retained. No new dependency or shared-token changes. ui-ux-pro-max
  guidance informed48dp controls, visible errors, draft disclosure and data scope.

### Validation and unverified work

Mobile136/136 and Web400/400 regression tests PASS; both lint/typecheck PASS;
Web production build PASS (existing mixed static/dynamic import advisory).
Offline Android Metro/Hermes export PASS after sandbox spawn EPERM was resolved
with export-only escalation. Customer token sync and Museum content/image hashes
PASS. git diff --check PASS. No Web/Backend/Museum/Login/Register source edits.

Visual QA: MANUAL PENDING on Pixel7 at360/393dp, including filter keyboard,
month/year horizontal chart labels, font scaling, screen reader, timeout/errors,
return-to-Dashboard refresh, final scroll and safe area. Mock layout assertions
and Hermes compilation are not device acceptance. Live authenticated workflow
integration NOT RUN. Overall PARTIAL, not a claim of full Mobile translation parity.
No Gemini/TTS, database access/writes, attempt reset/retry or commit/push.

## S29.3.2 — Customer Mobile Dashboard Web Parity (2026-10-24, PARTIAL)

### Source audit (not based on previous UI docs)

Reference: frontend-web/src/pages/DashboardPlaceholder.tsx, dashboardMetrics.mjs,
projectUtils.ts, useProjects.ts and projectRepository.ts. Web render order:
Hero photo/eyebrow/heading/description/create CTA; four quick links; loading/error
or successful content; metadata notice if applicable; time chart + status donut;
recent projects (up to5); recent activity (up to4). No four-KPI cluster is rendered.
Web grouping uses createdAt/local time, integer linear scale; donut uses actual
COMPLETED/processing/FAILED/residual counts and one-decimal percentages. Web offers
day/month/year filters and blocks charts when the account dataset is incomplete.
Web's recent action performs supported Backend checks before navigation, not a
generation call. Activity derives from project statuses/updatedAt, not an audit API.

| Component | Web now | Mobile before | Mobile after / action |
|---|---|---|---|
| Header | Customer brand/navigation | Customer native header | Kept, no navigation edits |
| Hero/CTA | Museum photo + welcome copy + create | Plain page heading + CTA | Reuses same local photo/Web copy, native dark scrim, existing create route |
| Four KPIs | Absent |4 cards | Removed Dashboard render/import; selectors/StatCard retained |
| Quick links | Create, Transcript, Translation, Voice | Create, My projects |4 labels/details/routes match source; stacked phone rows |
| Charts | Time columns + status donut | Same two, before quick links | Retained formulas/colors; moved after quick links; existing scoped-data warning retained |
| Recent projects | Up to5 rows | Up to4 cards | Up to5 native cards; current Mobile actions/workflow preserved |
| Activity | Up to4 status updates | Missing | Added corresponding section from same recent data, empty state/history route |
| Bottom nav | Desktop shell |4 native Customer tabs | Kept unchanged, separate Public navigation |

### Implemented / tested

- DashboardHero uses existing assets/museum/images/hero.jpg (same content as Web),
  no asset edits/downloads. Content-height card, bounded absolute Image dimensions,
  navy scrim, shared Be Vietnam Pro/tokens and existing48dp create Button. No
  duplicate MobileScreen heading: optional headerContent replaces only Dashboard's
  intro; other consumers unchanged. No dependency/config/auth/API changes.
- Loading/error now occur after quick links like Web; charts/recent/activity are
  withheld until success. Successful empty still shows chart empty states, recent
  empty/create CTA and activity empty. The same actual project records are passed
  to charts/cards/activity; no fabricated counts/history. COMPLETED is never based
  on progress. Source-driven regression compares four link labels/details/routes,
  section ordering/no KPIs, recent limit5/activity4, Hero copy/asset and empty states.
- Mobile121/121 PASS, TypeScript/ESLint PASS, Customer tokens/Museum image hashes
  PASS, offline Android Metro/Hermes PASS (1456 modules/37 assets), diff-check PASS.
  Web400/400 plus lint/typecheck/build PASS with no Web source changes (existing
  ineffective-dynamic-import warning only). Auth/navigation regressions included.

### Remaining parity gaps / not complete

- Mobile repository currently loads first20 projects without collection pagination
  completeness or enrichment-result flags. Web's full-account statistics and
  metadata/incomplete-list notice cannot be claimed from those records. Existing
  explicit loaded-record scope remains; data layer was not expanded in this UI step.
- Mobile chart remains default7-day range; Web's editable day/month/year controls
  and interactive donut focus/hover are not ported. Native static labels/legends
  expose values. Zero-value legend rows remain visible on Mobile, unlike Web.
- Existing Mobile ProjectCard retains language pair/media/progress and two actions;
  Web uses source-language column and guarded single Tiếp tục. No cosmetic relabel
  was used to pretend identical workflow checks. Mobile history is still project
  history, not Web's verified product library; activity link truthfully says Xem lịch sử.
- Visual QA: NOT VERIFIED / MANUAL PENDING. Need Pixel7 at360/393dp to compare
  Hero/quick links/charts/recent/activity ordering; confirm no KPI, no overflow,
  large-font labels, safe-area4-tab navigation and scroll to final activity link.
  No automated emulator screenshots or live Customer session checks were performed.
  S29.3.2 is PARTIAL, not acceptance-complete; remaining functional parity and
  physical visual QA must be resolved before declaring full Web parity.

## S29.3.1 — Customer Mobile Dashboard charts (2026-10-24)

- Audited Web ProjectTimeChart/StatusDonutChart and dashboardMetrics.mjs. Web uses
  createdAt grouped by device-local date (default seven days, optional month/year),
  linear integer ticks and four status buckets: completed/success, processing/info,
  failed/error, residual other/textMuted. Percentages round to one decimal; zero,
  loading/error and incomplete-full-dataset states are distinct.
- Mobile now places two separate stacked cards after the unchanged2x2 KPIs.
  Bar chart uses the same seven-day default/calendar/linear-scale formula and
  direct counts/date labels. Donut uses the same distribution and arc/gap formula,
  semantic tokens, native-font total and wrapping text legends with counts/%.
  Added react-native-svg15.16.0 via Expo install (SDK58's recommended bundled module);
  bars use native Views. No larger chart framework or animation dependency.
- Both cards receive the existing useProjects projects, no API/client/hooks added.
  Status counts reuse calculateProjectStatistics; progress100 never changes status.
  Mobile repository still loads up to20 records and lacks completeness metadata:
  both charts explicitly say they cover loaded projects, NOT the entire account.
  Web's full-account/incomplete-dataset contract is not claimed on Mobile. No
  pagination fetching or business logic changes. Date-missing/invalid records
  excluded from time series with a visible count; never substitute updatedAt.
- Default range is seven days ending today; Web month/year filters and hover
  interactions are not added in this step. Native labels/legend provide all values
  without requiring hover. Empty time range has explicit text, zero total uses
  only the empty ring (no fabricated slices). Loading/error uses existing parent
  feedback with charts withheld until successful load.
- Cards shrink to available width, seven equal bar columns/minWidth0,200dp bounded
  donut, wrapping legends; no text line truncation, no screen-height sizing. Shared
  tokens/Be Vietnam Pro preserved; no changes to quick actions, recent cards, tabs,
  Public Museum, Login/Register or Web source.
- Mobile118/118 (charts7/7 plus Dashboard9/9), lint/typecheck, Android Metro/Hermes,
  token sync, Museum content/hash check and diff-check PASS. Web400/400 and
  lint/typecheck/build PASS, existing ineffective-dynamic-import warning remains.
  npm install reported5 high vulnerabilities; not assessed/remediated in chart
  scope, no audit-fix/force upgrade performed. Dependency readiness is not a
  security audit. Visual QA Pixel7/360/393dp, large fonts, TalkBack and SVG native
  rendering: MANUAL PENDING; offline export does not verify real device visuals.

## S29.3 — Customer Mobile Dashboard refinement (2026-10-24)

- Compared DashboardScreen/MobileHeader/ProjectCard/StatCard and Customer Tabs
  with Web DashboardPlaceholder, shared tokens and WEB_MOBILE_DESIGN_SYNC.md.
  Existing Mobile gaps: missing font-family on most text,47%-width wrapping KPIs,
 220dp project title minimum,44dp small actions and crowded metadata/badges.
- Dashboard-only header/scroll variants use shared Thuyết minh bảo tàng branding,
  bank-outline icon and Be Vietnam Pro. Description matches Web's museum content
  management message; full-width48dp Tạo thuyết minh CTA keeps/projects/new.
  No new banner/image, chart, route or feature was added.
- Four KPIs use two explicit stretch rows with equal flex/minWidth0 cards,
 112dp minimum height,14sp labels and28sp bold values. Reserved label area aligns
  values; cards may grow with large system fonts rather than clip. Status accent
  colors retain shared success/info/error meanings. Hide KPI values during load
  or error rather than showing an apparent confirmed zero; empty success shows0.
- Quick actions retain their two routes, use64dp minimum rows,40dp icon containers,
  wrapping text and pressed feedback. Xem tất cả now has an actual48dp target.
- Dashboard ProjectCard variant uses12dp padding/8dp gaps, removes220dp minimum,
  keeps two-line project name and puts bounded/wrapping status below the title.
  Actions stack at48dp with wrapped labels. Metadata/progress/badge use shared
  fonts; common Badge/ProgressBar expose optional text style only, leaving default
  consumers' styling/normalization unchanged. Non-Dashboard cards keep old layout.
- projectAction, projectUtils, repository, status mapping and API are unchanged.
  COMPLETED alone controls completed action/statistic; progress100 is not completion.
  Failed action still only navigates to the existing workflow screen, never dispatches.
  Existing repository fetches first20 projects: Mobile KPIs/recent projects remain
  scoped to loaded records, unlike Web's complete aggregation. No parity claimed.
- Four native Customer tabs preserved, with equal flex items/minWidth0,11sp shared
  labels below icons and purple active tint. Native navigator still owns bottom
  safe-area sizing; no absolute bar, fixed height or duplicate bottom inset. Public
  Museum's separate five-item bar and all S29.2 work remain untouched.
- Mobile111/111 tests (new Dashboard9/9), ESLint, TypeScript, offline Android
  Metro/Hermes, token sync, Museum hash check and diff-check PASS. Web regression
 400/400, lint/typecheck/build PASS without Web source changes. Web build retains
  its projectRepository ineffective-dynamic-import warning (nonblocking).
- Visual QA: NOT VERIFIED. Pixel7/small phone360/393dp: header wrapping, CTA,
  KPI2x2/equal rows, long names/badges, large font scaling, action targets, scroll
  to final card, all four native tabs and Android/iOS system-bar clearance need
  manual verification. Offline export is not device acceptance.

## S29.2B.4 — Full-width Public Museum bottom navigation (2026-10-24)

- Confirmed installed Expo Link/asChild uses a Radix Slot merge that spreads a
  direct child's function-valued style into an object. Old PublicTab placed its
  Pressable style callback directly under Link: native flex/spacing/active styles
  were lost. Previous tests bypassed Link/Slot and therefore missed the defect.
- PublicTab now passes a ref-forwarding PublicTabButton through Link. That child
  creates the Pressable callback AFTER Slot merge; Link onPress/ref remain intact.
  Scoped only to Public tabs; other Museum links and Customer navigation unchanged.
- Bar and row explicitly width100%; removed row maxWidth760. Tabs flex1/zero basis,
  minWidth0, centered icon/text, unchanged11sp wrapping labels/active purple. Bar
  remains a sibling after ScrollView inside the existing single safe-area boundary.
- Regression runs the installed Radix merge, reproduces old style loss and checks
  new native callbacks, ref, events and equal-width styles after merge. Arithmetic
  coverage at360/393/411/1024dp confirms width allocation and48dp minimum targets;
  this is not a native screenshot/layout measurement.
- Public19/19/all Mobile102/102, TypeScript, ESLint, Android Metro/Hermes, image/hash
  and token checks, diff-check PASS. Visual QA Pixel7/360/393dp and iOS safe area:
  MANUAL PENDING. No Hero/CTA/content/asset changes in this step.

## S29.2B.3 — Bottom navigation alignment and final CTA (2026-10-24)

- Confirmed previous tab styles used flex-start,12sp labels and only2dp between
  columns. Tabs now use flex1/zero basis, centered icon+label groups,11sp/16dp
  labels with a32dp minimum text area and no vertical shrinking.8dp gaps and4dp
  inner horizontal padding separate labels; labels wrap rather than truncate.
  Five targets fit320/360/375/393/411dp arithmetic checks with minimum48dp width
  and80dp height. Active purple/fill/icon assets remain unchanged.
- Final Home CTA now explicitly owns its white foreground, independent of the
  legacy primary flag, on dark purple #3730A3 (pressed navy). Existing source was
  already purple/white; device-specific cause of perceived low contrast remains
  unverified. This scoped treatment does not change Hero CTAs or any route.
- Safe area remains applied once by MuseumFrame. The navigation is a nonshrinking
  sibling after flex1 ScrollView, not an overlay; no extra bottom inset/padding
  was introduced. Regression checks cover CTA/footer in scrolling content.
- Public18/18 and all Mobile101/101 PASS; lint, typecheck, offline Android
  Metro/Hermes, Museum asset/hash sync, Customer token sync and diff-check PASS.
  Visual QA on Pixel7/iOS and enlarged system fonts: MANUAL PENDING; mock layout
  assertions are not device-render evidence. Hero/images/content remain unchanged.

## S29.2B.2 — Final Public Museum Mobile CTA/navigation polish (2026-10-24)

- Home-only CTA variants mirror Public Web: white/text-dark Hero primary,
  light-outline/white-text secondary, purple/white final CTA. Minimum52dp height,
  bold labels,12dp radius and distinct pressed/focus feedback. Other MuseumLink
  callers retain their existing styles; routes/actions/content are unchanged.
- Five public bottom links use equal zero-basis columns, centered40x28dp icon
  slots and centered wrapping labels with a two-line minimum area. Minimum48dp
  width/80dp height; natural growth supports larger text without line truncation.
  Selected fill/top-border and filled icon remain; safe-area/layout reservation
  unchanged. No overlay, animation or Customer navigation changes.
- Public16/16/all Mobile99/99 tests, ESLint, TypeScript, Android Metro/Hermes,
  asset/content hash sync, Customer token sync and diff-check PASS. Contrast tests
  cover the three CTA variants in normal/pressed states (at least4.5:1).
- User confirmed B.1 Hero/image/cards/navigation on Pixel7. B.2 visual changes
  remain MANUAL PENDING: reload and inspect CTA prominence and all five labels,
  including increased system font size. Hero16:9/cap/assets are unchanged.

## S29.2B.1 — Public Museum Mobile image sizing fix (2026-10-24)

- Confirmed native Image merges local asset width/height before custom styles.
  Width100% plus aspectRatio alone left the original source height defined;
  S29.2B's mocked ratio-prop check did not cover native source-style merging.
- MuseumImage now reserves its ratio on a View frame. The absolute child Image
  explicitly sets both width and height100%, so asset dimensions cannot size it.
  Hero uses contain, a navy background,16:9 and a200dp height cap paired with a
 355.56dp width cap to retain the ratio. Expected height at375dp viewport is193dp;
  typical Pixel7 logical widths reach200dp. No viewport-height dependency.
- Hero title/description/both CTAs remain directly below the frame, unchanged.
  Intro/topic images retain4:3 and posters16:9 with their existing cover behavior;
  they receive the same intrinsic-height correction without redesign. Accessible
  load-error fallback reserves the same frame. Original assets/credits unchanged.
- Mobile97/97 tests PASS (Public14/14), TypeScript/ESLint and offline Android
  Metro/Hermes PASS. Museum image/content hash check and Customer token sync PASS.
  Visual QA: NOT VERIFIED; reload Pixel7 to check actual image sizing/copy/CTAs,
  scrolling, About imagery and bottom navigation. No runtime/auth/data changes.

## S29.2B — Public Museum Mobile UI refinement (2026-10-24)

- Preserved all S29.2A routes/content/catalogs/asset bytes and S29.2 Login/Register
  and Customer Dashboard. Public Museum theme remains isolated from Customer tokens.
- MuseumFrame now has a compact, brand-only header and five-item bottom navigation:
  Trang chủ, Khám phá, Thuyết minh, Giới thiệu, Của tôi. Uses existing Expo Router
  links/paths, no new route groups or nested Tabs. Của tôi still enters the existing
  auth-aware /khong-gian-cua-toi route. Customer bottom navigation is unchanged.
- Bottom navigation is a non-shrinking sibling after the flex1 ScrollView, within
  the existing four-edge SafeAreaView. No absolute-position overlay or guessed
  bottom inset; layout reserves the bar's natural height. Five equal items with
  min48dp width/min64dp height, outline/filled icons, labels, selected tint/top-border,
  pressed and keyboard-focus feedback. Nested detail paths select their parent;
  partial-prefix paths do not. Labels may wrap/grow with system text scaling.
- Removed cramped header links and workspace CTA; interface-language text moved
  to footer without changing content. Existing footer links remain available.
- Hero keeps the full image in a separate16:9 contain frame, not a portrait crop
  determined by text/CTA height. Navy copy area uses28/38sp heading,16/26sp lead,
  compact20dp padding and distinct solid-primary/outlined-secondary actions. No
  edits to source image, metadata or watermark. Final native crop/render QA pending.
- Intro uses24/34sp heading and16/28sp body with consistent12/16dp rhythm and its
  existing responsive4:3 image. Planned-language cards use exactly two rows of two
  equal flexible cards,44dp neutral glyph tiles,16sp names, natural text wrapping
  and compact non-interactive status badges. No fixed card/text height or truncation.
- UI/UX checklist informed reserved safe-area layout, five-item navigation, native
  touch targets and readable wrapping; not a redesign of underlying navigation/auth.
- Visual QA: MANUAL PENDING for this revision on Pixel7/iOS: gesture + three-button
  navigation safe areas, footer reachability, all five destinations and Android Back,
  deep-link active tabs, large text/landscape, TalkBack and actual image framing.
  Source photos inspected, but this is not native-screen visual acceptance.

## S29.2A — Public Museum on Expo Mobile (2026-10-24)

| Web | Native route / screen | Parity |
| --- | --- | --- |
| `/` MuseumHomePage | `/` MuseumHomeScreen | Hero, introduction, three non-interactive topics, four planned languages, featured video and CTA |
| `/kham-pha` MuseumExplorePage | `/kham-pha` MuseumExploreScreen | Same editorial previews; no fabricated exhibition links |
| `/thuyet-minh` MuseumVideosPage | `/thuyet-minh` MuseumVideosScreen | Published/public/rights-confirmed catalog and real poster |
| `/ve-bao-tang` MuseumAboutPage | `/ve-bao-tang` MuseumAboutScreen | Existing introduction, image and two information cards |
| `/thuyet-minh/:slug` MuseumVideoDetailPage | `/thuyet-minh/[slug]` MuseumVideoDetailScreen | Metadata, availability, attribution, navigation; external source playback only |
| `/kham-pha/:slug` MuseumExhibitionPage | `/kham-pha/[slug]` MuseumExhibitionScreen | Published-only lookup; currently empty catalog, same Not Found state |

- Native Public style roles are isolated in features/museum/theme.ts and checked
  against Web tokens.css/museum-theme.css. Purple/navy/cream-free surfaces, local
  Be Vietnam Pro, adaptive scrolling cards, native48dp links, alt labels, selected
  navigation, wrapping text and image failure fallback. UI/UX checklist informed
  native touch/accessibility; no Customer CSS, dashboard tabs or auth UI reused.
  Hero uses a navy scrim rather than adding a gradient dependency. No new package.
- Opening `/` always renders Public Museum, including while session restores.
  `/khong-gian-cua-toi` reuses the previous root bootstrap: loading → Login for a
  guest / existing Dashboard for an authenticated session. Login success's public
  guard redirects via that entry; private guard failure/logout returns `/`.
  Protected project screens and JWT/role/storage/API logic are unchanged. A guest
  deep link to a private screen stays blocked and returns the museum, not private
  content. Public deep links do not require authentication.
- `scripts/museum-mobile-sync.mjs` snapshots the real Web public catalog using its
  existing publication filters, image slots, editorial topics and languages. It
  copies seven existing JPGs byte-for-byte to frontend-mobile/assets/museum and
  emits a local JSON catalog/static require map. No API/DB, Metro external imports,
  fake data or automatically published content. Web source/assets remain untouched.
  Additional home/about prose is copied from the corresponding existing Web pages.
- Check: `node scripts/museum-mobile-sync.mjs`. Intentional Web catalog/image update:
  `node scripts/museum-mobile-sync.mjs --write`, review generated diff and run tests.
  Rights/source metadata and docs/MUSEUM_IMAGES.md remain authoritative; tests check
  copied-image hashes, not an assertion that images are verified historical records.
- IMPORTANT RIGHTS LIMITATION: Web video permission explicitly covers reposting on
  the website only. No MP4 copied, streamed or autoplayed in the native app. Detail
  opens the validated original YouTube URL only on a deliberate user press, shows
  the existing credit/license and safe open-error feedback. Native player parity
  is BLOCKED pending permission covering mobile redistribution. No fake transcript,
  translated audio or captions; only Vietnamese exists at the real source.
- Visual/device QA MANUAL PENDING: Pixel7 cold start, guest navigation, auth entry,
  real login/logout (separate user action), Android Back, custom-scheme detail links,
  safe area, image crop, large text/TalkBack, footer reachability and source handoff.
  No real authentication, external-link opening or playback performed by Codex.

## S29.2 — Mobile Login/Register refinement (2026-10-24)

- Compared the actual Web Login/Register pages/forms and login.css, not the unused
  legacy AuthLayout. Reuse shared purple/navy brand, museum icon, tagline, white
  card and Be Vietnam Pro; retain a native single-column layout (no desktop photo
  panel). Existing shared tokens/adapters unchanged; no Web/Dashboard redesign.
- Mobile AuthLayout: aligned brand/card container max420dp, adaptive16/24dp card
  padding, heading24sp, descriptions16sp/24 line-height. All auth Text uses the
  appropriate local Be Vietnam Pro family. Labels, password guidance and feedback
  use16sp rather than14sp; spacing between fields is16dp rather than24dp.
- Auth-only Input appearance: min52dp control, readable helpers, native label/hint,
  error announcement and focus/error borders. Button wrapLabel and InlineMessage
  textStyle are opt-in additions; default shared-control rendering is preserved.
  Auth CTA/link/password toggle min48dp, pressed feedback, footer link focus border,
  wrapping text and no fixed text/card height or disabled font scaling.
- Explicit four-edge SafeAreaView, bounded KeyboardAvoidingView/ScrollView chain;
  iOS padding / Android height behavior, one natural scrolling region with bottom
  content padding, handled taps and keyboard dismissal on drag. Keyboard Next moves
  to the next input; invalid submit focuses the first invalid field. Existing
  validation, entered data, password visibility, autofill, loading, submit lock,
  auth calls, guards and redirect contracts retained.
- UI/UX skill informed touch targets, native keyboard handling and readable text;
  matched to current SDK58/RN docs rather than blindly applying older stack advice.
- Mock tests cover widths320/375/393/768 and platform layout props, field styles,
  visibility, keyboard focus, request errors and single-flight behavior. They do
  not measure native scrolling, rendered text or the actual software keyboard.
  Visual QA: NOT VERIFIED / MANUAL PENDING on Pixel7 and iOS. Verify keyboard open
  at every field, scroll to Register CTA/footer, large text/landscape, TalkBack,
  error focus and password toggle. No login/register API calls were made for QA.

## S29.1 — Customer Web/Mobile Design Synchronization (2026-10-24)

- Canonical config `design/customer/tokens.json` generates Customer-scoped Web CSS,
  brand/rules TS and Mobile tokens.ts through `scripts/customer-design-sync.mjs`.
  Deterministic read-only drift checks in both test suites, both pretypecheck hooks
  and Web prebuild. Platform shadows/radius/line-height remain explicit overrides.
- Existing shared palette/scales preserved. No Public Museum token/theme edits;
  Customer CSS scope cannot target :root or Museum. No external runtime imports
  into Metro, no added dependency, no navigation/API changes.
- Shared brand consumed in Web Sidebar/Topbar and Mobile Header/AuthLayout, native
  museum icon. Local Be Vietnam Pro font files/OFL reused with hash test; Expo57
  useFonts loader, common Button/Input font integration. Screen-specific native
  Text and literal Web auth branding still need incremental migration; not full
  visual parity. No unrelated page redesign performed.
- Real screen manifest `design/customer/screens.json` verifies12 source pairs;
  history/library, transcript and translation have explicit capability gaps.
  `docs/WEB_MOBILE_DESIGN_SYNC.md` defines component/state rules, correspondence,
  change checklist and platform QA. Frontend AGENTS point future Codex work to it.
- Skills design-system/ui-ux-pro-max informed semantic layers and platform-specific
  implementations; CSS is not reused as React Native styles.
- Web400/400, Mobile60/60 PASS; both lint/typecheck PASS; Vite build and offline
  Android Metro/Hermes export PASS. Read-only sync/diff-check PASS. Visual QA NOT
  VERIFIED: no browser/device connected. iOS export/device QA not executed.

## Translation Page — UI Refinement (2026-10-24)

- Retained shell/project title/six workflow steps and language selection behavior.
  Pending attempt card now reads Bản dịch chưa sẵn sàng. UNCERTAIN explains duplicate
  processing risk without technical HTTP/code noise; safety warning remains visible.
- Kiểm tra trạng thái uses the same reload handler and existing authenticated GET
  path, never generation. Collapsed native details holds provider HTTP/code/phase
  and detailed feedback, keyboard focus visible. Customer request errors also keep
  technical messages in details rather than the primary alert.
- Actual draft/saved rendering and review guards unchanged; no draft/no groups
  gets a truthful empty state, no fabricated translations or enabled next action.
- Group workspace gap16px, cards20px/16px mobile, language select46px and balanced
  source/target columns with existing responsive single-column fallback. Skill
  ui-ux-pro-max guided visible safety alerts plus secondary diagnostic disclosure.
- Focused31/31; full Web396/396, lint/typecheck/build/diff-check PASS. Visual QA
  NOT VERIFIED: browser inventory empty; responsive and keyboard manual QA pending.

## Transcript Video — Bounded Player Fix (2026-10-24)

- Supersedes the native-height rule below: portrait9:16 must not determine the
  player height. Transcript alone opts into a16:9 frame, width100%, max-height360px,
  dark background; inner video fills the frame with object-fit contain. No crop
  or stretch. Width-driven height scales down on mobile; cards align-self start.
- Optional framedVideo presentation prop defaults false for all other consumers;
  audio, media loading/errors, controls, timestamp handlers and metadata unchanged.
  Error messages remain outside the bounded frame. ui-ux-pro-max informed responsive
  containment without modifying playback behavior.
- Focused18/18; Web396/396, lint/typecheck/build/diff-check PASS. Visual QA NOT
  VERIFIED: no browser connected; inspect actual9:16/16:9 videos and mobile manually.

## Transcript Page — UI Polish (2026-10-24)

- Consolidated workspace header: one Bản ghi page heading, project name/source
  language description, existing computed status and Back link. Removed redundant
  intro block and unconditional server-saved wording; segment heading shortened.
- Kept six-step WorkflowSteps, status calculation and two-column media/segments
  layout unchanged; <=900px stacks naturally. Cards20px padding,16px on mobile;
  segment padding12→10px, list gap16→10px, inner gap8→6px, no nested scrolling.
- Existing authenticated video/audio player and metadata retained without autoplay.
  Transcript-scoped video height/aspect-ratio auto preserves native source ratio
  rather than forcing16:9; other player consumers are unaffected.
- Play label shortened to Phát; exact sequence/start timestamp remains in its
  accessible name and original seek callback. Desktop control36px minimum,
  mobile/coarse-pointer44px. Existing focus/disabled/error/edit feedback preserved.
- Continue uses primary purple, right-aligned below segments with readiness text;
  existing canContinue guard and translation destination unchanged.
- ui-ux-pro-max guided compact controls without reducing touch target usability.
  Focused30/30 and full Web395/395 PASS; lint/typecheck/build/diff-check PASS.
  Visual QA NOT VERIFIED: browser inventory empty. Manually verify375/768/1024/
  1280/1440px, long project/file/segment text, native video ratios and keyboard focus.

## S28 — Project Detail UI/UX Redesign (2026-10-23)

- `/projects/:projectId` retains the six-step workflow component and guards.
  Detail-only stepper padding12px (previous20/22px), header gap14px (22px),
  step minimum height76px (88px); marker, state and navigation logic unchanged.
- Media left / project information right: equal flexible columns, stacked at
  <=900px; cards padded16px on narrow screens. Filename spans metadata width;
  type/size share a row, stack on mobile, long text wraps naturally.
- Reuses SourceMediaPlayer with authenticated existing media GET, native controls,
  no autoplay, existing loading/error/reload behavior. Only verified AUDIO/VIDEO
  metadata mounts the player. Video16:9/object-fit contain; no invented URL,
  thumbnail or media. Unsupported metadata keeps truthful preview limitation.
- Form controls minimum46px; retained validation, saving/saved/unsaved feedback,
  leave confirmation and Save/Continue handlers. Delete is a separate section
  outside the form with the original destructive confirmation and disabled guards.
- Skill ui-ux-pro-max guided scoped spacing, labels, submit feedback and native
  media controls. No shared shell, API, workflow or data changes.
- Web393/393 PASS; lint/typecheck/build/diff-check PASS. Visual QA NOT VERIFIED:
  no connected browser. Manually verify375/768/1024/1280/1440px, long filenames,
  keyboard focus, real audio/video loading/errors and200% zoom before acceptance.

## S28 — Final Library UI Polish (2026-10-23)

- Library search submit150px desktop, width100% on narrow mobile. Toolbar uses
  three columns without language data, four when a second direct label exists;
  search/media stay on one desktop row, two-column tablet and stacked mobile.
  Query/filter handlers and product-card CSS remain unchanged.
- Added scoped empty-card class: outer padding20px, inner16px with uniform12px
  gaps and reset icon/heading/description margins. Centered content retains natural
  height; mobile padding16/12px. Reduction targets15–20% through spacing, not fixed
  height or clipping; exact rendered percentage NOT VERIFIED without browser.
- ui-ux-pro-max informed grouping/spacing. Web391/391 PASS, lint/typecheck/build/
  diff-check PASS, existing Vite mixed-import advisory only. Visual QA NOT VERIFIED:
  no connected browser; manual desktop/tablet/mobile and long-text checks remain.
- Only HistoryPlaceholder.tsx (empty class), narration-library.css,
  narration-library.test.mjs and UI/PROGRESS changed in this step; no data/service,
  product eligibility, Sidebar/Header, route or other-screen changes.

## S28 — Customer Narration Library (2026-10-23)

- /history retained, menu position unchanged; label “Thư viện thuyết minh” and video
  icon replace history wording. Topbar single H1 plus approved description; links
  from Dashboard/Result now say Xem thư viện without changing destinations.
- Replaced project-history table with white radius16px product cards,3 columns
  above1000px content width,2 below,1 below560px. Natural name wrapping, explicit
  media/language metadata, existing result route with verified language parameter,
  visible keyboard focus/hover and reduced-motion. No thumbnail data exists in
  current project DTO: video/audio icons are used, not source-media thumbnails.
- Reuses useCompleteHistory, existing JWT/ownership API and RESULT route guard.
  Product requires project COMPLETED, workflow COMPLETED, no active processing,
  guard-approved type-specific artifact and language source RESULT for video or
  NARRATION for audio. Status alone, translated source, job language or demo records
  never become products. Missing proof on completed rows gets partial-data notice.
  This is server workflow attestation, not a fresh file download/existence probe;
  Result page still verifies/loads protected output through its original API.
- Search and media/language filters are display-only, manual submit, with draft/
  applied separation; language options only from verified products.12 cards/page,
  previous/next buttons and safe bounds. Empty CTA to /projects/new; loading,
  API error/reload and filtered empty distinct. Legacy demo helpers/history records
  remain untouched, but library no longer uses the demo branch. Old status/date
  filter UI replaced by product-oriented controls; API/history storage unchanged.
- ui-ux-pro-max informed card reflow and accessibility. Web390/390 PASS,
  focused library5/5 PASS, lint/typecheck/build/diff-check PASS; existing Vite
  mixed-import advisory. Visual QA NOT VERIFIED: browser inventory empty. Manual
 375/768/1024/1280/1440px, keyboard, long names and real protected result access
  remain. No live API/DB/provider requests made during validation.

## S28.7.3 — Create Project Page Redesign (2026-10-23)

- /projects/new content max1024px, centered,14px section gaps,18px/20px desktop
  card padding. Step1 “Thông tin dự án”: name and source-language columns in DOM
  order, then full-width description. Step2 “Tệp phương tiện”, step3 “Hoàn tất”.
  Existing required,3–100 name/max1000 description and all errors unchanged.
- Dropzone desktop horizontal icon/copy/picker reduces min-height176→136px (~23%).
  Mobile stacks at<=700px, natural growth with min144px; no fixed-height clipping
  or reduced copy/control text. Formats/500MB shown once, file selection/drag/drop,
  preview, cancel/failure/success and upload handlers unchanged. Final actions
  min46px, compact padding, stack on mobile; success still leads to /projects.
- ui-ux-pro-max informed field grouping/reflow. Web385/385 PASS, lint/typecheck/
  build/diff-check PASS; existing Vite advisory only. Visual QA NOT VERIFIED:
  browser inventory empty and no current screenshots attached. Manually check
 375/768/1024/1280/1440px, low-height viewports, long errors/file names, focus and
  drag/drop presentation. No real upload or project creation performed.

## S28.7.2 — Customer Projects List Redesign (2026-10-23)

- Kept route-aware single H1 in Topbar, shortened Projects-only description to
  “Quản lý và tiếp tục các dự án thuyết minh.”; title24–26px. Added one explicit
  “Tạo dự án” CTA above the panel pointing to existing /projects/new, no mutation.
- Reused existing initially-closed filter disclosure, inert/aria-expanded controls,
  draft/applied separation and active advanced-filter count. Reset/footer now
  appear only when draft selections differ from defaults; reset still edits draft
  only and Search remains required to apply. No debounce/query/paging changes.
- Toolbar padding16px, controls46px minimum, search input44px minimum. Table retains
  six columns, name32%/action16%, short rows60px with8px vertical cells. Existing
  two-line names, title/full accessible names and focus-unclamp retained. Long/error
  rows may grow rather than clip. Scroll stays within table on narrow screens.
  Centered pagination uses12px gaps/padding. Sidebar brand text15→14px, width/menu
  unchanged; natural wrapping remains supported rather than forced nowrap.
- ui-ux-pro-max informed disclosure, density and reflow. Web385/385 PASS;
  lint/typecheck/build/diff-check PASS. Existing Vite mixed-import warning only.
  Visual QA NOT VERIFIED: browser inventory empty, no attached current screenshots.
  Check375/768/1024/1280/1440px, logo wrapping, long project names, filter keyboard
  and scroll/actions manually. Mock interaction tests are not visual verification.

## S28.7.1 — Customer Dashboard & Real Museum Banner (2026-10-23)

- Dashboard hero reuses /museum/images/hero.jpg, the existing1960x1102 photograph
  inspected during Login work. No asset moved/removed/edited; source/rights record
  in MUSEUM_IMAGES.md unchanged, no new attribution/license claims. Removed rendered
  video/wave illustration, leaving old CSS/assets intact. Full-container banner
  radius16px/min-height240px, natural growth, navy left-to-right overlay and white
  requested eyebrow/heading/description. CTA still /projects/new; mobile stronger
  overlay/crop and wrapping preserve copy without fixed-height clipping.
- Four existing shortcuts compacted to min100px/padding14px; analytics card minimum
 320px, donut max200px, recent rows min60px and activity gaps12px. Chart axis/bar
  geometry, calculations, dataset completeness warnings, filters and actions kept.
- Sidebar now “Thuyết minh bảo tàng” with museum SVG matching Login/Register;
  Dashboard Topbar shows that brand, other page titles/search/account unchanged.
  Shell fallback name updated. No menu routes/drawer/auth behavior changed.
- ui-ux-pro-max informed hierarchy, wrapping and readable overlays. Web383/383
  PASS; lint/typecheck/build/diff-check PASS. Existing Vite mixed-import advisory
  remains. Visual QA NOT VERIFIED: no connected browser. Manually review
 375/768/1024/1280/1440px, crop, CTA/focus, charts and drawer/header wrapping.

## S28.6.7 — Compact & Centered Auth Layout (2026-10-23)

- Shared museum-auth content/card max420px (previous440), desktop padding28px
  (previous32), heading28–30px. Existing Grid center alignment keeps the entire
  brand+card block centered horizontally/vertically when space permits, with no
  fixed left margin, transform or absolute positioning. Brand/card alignment and
 20–24px gap retained; photo/copy/gradient, columns and panel colors unchanged.
- Native input min44px inside min46px control, visibility toggle44px and submit
  min46px; natural growth allowed for text scaling/wrapped labels. Login form
  gap16px, Register14px including short desktop heights; field internal gap6px.
  Mobile card24px/20px padding retained. No fixed form height or clipping.
- ui-ux-pro-max informed hierarchy and target sizes. Web382/382 PASS;
  lint/typecheck/build/diff-check PASS; existing Vite mixed-import advisory only.
  Visual QA NOT VERIFIED: browser inventory empty and no current screenshots
  attached. Manually check375/768/1024/1280/1440px and short-height/long-error cases.
- CSS/tests/docs only; no auth, validation, API, data or media changes.

## S28.6.6 — Register Form Color & Contrast (2026-10-23)

- Register-only panel#E9EDF7, white card with#D8DEEC border and subtle navy shadow;
  input control surface#F1F4FA/border#D3DAE9, transparent native input, navy#14213D
  heading/labels/value/brand and readable#59657A placeholders. Purple CTA unchanged.
  Explicit focus-within and invalid-input rules override neutral/hover borders;
  shared error text, ARIA, focus and reduced-motion behavior retained.
- Brand icon gains a subtle purple border/shadow without sizing/layout changes.
  Desktop<=800px height uses24px vertical card padding,12px form gap and16px
  heading/footer gaps. No fixed height, clipping or forced screen fit; page scroll
  remains natural. Mobile shadow reduced. Login CSS/markup, photo/gradient/copy,
  fields, guidance and all auth/validation logic unchanged.
- ui-ux-pro-max informed contrast and hierarchy. Automated relative-luminance
  checks pass4.5:1 for the tested navy/white,panel,input, placeholder/input and
  primary/input pairs; this is not a claim of complete visual/WCAG verification.
- Web381/381 PASS; lint/typecheck/build/diff-check PASS. Existing Vite mixed-import
  advisory remains. Visual QA NOT VERIFIED: no connected browser or attached
  current screenshot; manually review low desktop heights and responsive states.

## S28.6.5 — Register Visual Redesign (2026-10-23)

- Register now reuses Login's visual CSS primitives: form-left42%/photo-right58%,
  tablet50/50 below1024px, single form below768px. Exact same hero.jpg, alt text,
  gradient, photo position and bottom-panel copy; no asset/license change.
- Same navy20–22px brand, decorative24px museum SVG in48px purple tile and11px
  tagline. White max440px/radius16px card on#F5F7FB with existing responsive
  padding/shadow. Register-only14px form gap and20px heading/footer spacing keep
  four fields compact. Natural height and page scroll permit long errors/zoom.
- RegisterForm untouched: full name, email, both password visibility controls,
  exact password guidance, validation, first-error focus, submit lock, loading,
  auth request and login redirect retained. Login page/CSS unchanged in this step.
  Existing shared field/button/focus/error styles remain applicable.
- ui-ux-pro-max informed form spacing and responsive priorities. Web379/379 PASS;
  lint/typecheck/build/diff-check PASS. Existing Vite mixed-import warning only.
  Visual QA NOT VERIFIED: browser inventory empty. Check375/768/1024/1280/1440px,
  long errors, zoom and keyboard manually; no real registration performed.

## S28.6.4 — Login Brand Highlight (2026-10-23)

- Login-only brand name now20–22px/700, navy#121F3B, below the unchanged28–36px
  task heading scale. Decorative museum icon24px in a48px light-purple tile.
  Added11px purple “NỀN TẢNG ĐA NGÔN NGỮ” under the name, with4px text gap;
  shrinkable copy wraps naturally. Brand/card gap remains24px desktop/20px mobile.
- ui-ux-pro-max informed subordinate type hierarchy. Card, form, photo/gradient,
  right-panel text and authentication unchanged. Web376/376 PASS;
  lint/typecheck/build/diff-check PASS, existing Vite mixed-import advisory only.
  Visual QA NOT VERIFIED: browser unavailable in preceding connected inventory;
  actual brand wrapping still needs manual verification.

## S28.6.3 — Login Form Card (2026-10-23)

- Login heading, existing LoginForm and registration link now share a white card:
  max440px including padding/border, radius16px, border#E5EAF2, desktop padding32px
  and subtle navy shadow. Left panel background#F5F7FB; logo/name outside the card,
  aligned at its left edge with24px separation. Existing global border-box retained.
- Mobile card padding24px (20px below401px) and reduced shadow; width100% of the
  shrinkable parent, no fixed height/overflow clipping. Existing field/button
  full-width and focus/error styles retained. ui-ux-pro-max informed grouping and
  spacing without new fields or behavior. Photo/copy/42:58 desktop unchanged.
- Web375/375 PASS; lint/typecheck/build/diff-check PASS. Existing Vite mixed-import
  advisory remains. Visual QA NOT VERIFIED: no connected browser. Check card fit,
  wrapping and keyboard focus at375/768/1024/1280/1440px manually.
- Changed LoginPlaceholder.tsx, styles/login.css, tests/login-museum.test.mjs and
  UI/PROGRESS only. No Register/auth/API/data changes or real requests.

## S28.6.1 — Login with Existing Museum Photograph (2026-10-23)

- Login alone now uses a dedicated login-museum layout: form first in DOM and
  desktop42/58 columns, rebalanced50/50 below1024px, form-only below768px.
  Shared AuthLayout/Register are unchanged. Min-height rather than fixed height
  allows long errors/zoom to expand naturally; all columns and form are shrinkable.
- Local brand is “Thuyết minh bảo tàng” with a decorative museum-building SVG;
  task H1 is “Chào mừng trở lại”. Unmodified LoginForm retains Email/password,
  visibility, validation focus, busy/submit locks and authentication/redirect.
- Inspected hero.jpg and museum-intro.jpg. Reuses /museum/images/hero.jpg
  (1960x1102) as full-height cover at38% center; bottom navy gradient supports the
  requested slogan/description below the main facade. No file moved/edited, new
  historical claim or license invented. Existing rights/source record remains
  in MUSEUM_IMAGES.md; no separate mandatory credit is documented for this asset.
- ui-ux-pro-max informed readable overlay text, natural reflow and form-first
  mobile presentation. Palette/Be Vietnam Pro and shared input/focus styles kept.
- Web374/374 PASS, auth-focused12/12 PASS, lint/typecheck/build PASS. Existing
  Vite mixed-import warning remains. Visual QA NOT VERIFIED: browser inventory
  empty. Check375/768/1024/1280/1440px, photo crop, contrast, keyboard and zoom
  manually; static assertions are not visual verification.

## S28.5 — Customer Transcript UI/UX Polish (2026-10-23)

- Verified actual route /projects/:projectId/transcript: TranscriptPage renders
  TranscriptWorkspace, SourceMediaPlayer and TranscriptSegmentEditor. Existing
  workflow guards, feature-gated editing, seek and source loading are unchanged.
- Removed the transcript list's desktop max-height/inner scrolling, leaving page
  scrolling at every width. Retained 2:3 media/editor columns above900px and stacked
  layout below; native video16:9, audio controls and all media lifecycle unchanged.
  Reduced editor spacing, added shrinkable/wrapping content and focus clearance.
- Editing has a distinct border plus explicit unchanged/unsaved/saving text.
  Textarea references counter, status and inline error; busy state is announced.
  Existing validator supplies empty/oversize messages without changing validity,
  save-disable conditions, max4000, CAS/revision/conflict or request handlers.
  Server success and downstream-revalidation feedback remain intact.
- ui-ux-pro-max Quick Reference informed no nested scroll, truthful state feedback,
  text reflow and focus. Local searches returned unrelated smooth-scroll advice,
  so no smooth scrolling or new shortcut was introduced.
- Web371/371 PASS, focused28/28 PASS, lint/typecheck/build PASS. Existing Vite
  mixed-import advisory remains. Visual QA NOT VERIFIED (empty browser inventory):
  manually check375/768/1024/1280/1440px, keyboard focus, long text, native media
  and actual screen-reader announcements. Editing remains conditional on its
  current gate; this step does not enable it or save real transcript data.
- No API, services, Backend, other screens, config, Gemini or MongoDB changes.

## S28.4 — Customer Project Forms and Upload (2026-10-23)

- Kept create/detail contracts distinct: create name remains 3–100 characters;
  detail remains required/max150; description max1000 and media max500MB unchanged.
  Required/helper/error text now describes the current UI contract accurately.
- Selected files retain visible format/size guidance and full wrapping filenames.
  File errors are associated through aria-invalid/aria-describedby; keyboard focus
  reveals the native picker, alongside the existing explicit picker button.
  Upload progress remains indeterminate; no fabricated percentage or real upload.
- Detail reports unsaved/saving/saved states, retains values on failed save and
  hides stale success after editing. UI-only beforeunload and explicit local
  back/next links warn before discarding edits. This is not a global router blocker:
  Sidebar, WorkflowSteps and browser SPA back navigation are not intercepted.
- Create success retains /projects destination and explains opening the saved
  project to continue to Transcript. Empty-list guidance no longer assumes a
  left-side menu. Scoped wrapping, shrinkable controls, focus and reduced-motion
  rules preserve existing responsive layouts, colors and Be Vietnam Pro.
- ui-ux-pro-max guided truthful submit feedback and form accessibility. Web368/368
  PASS (17 focused), lint/typecheck/build PASS; existing Vite mixed-import advisory
  remains. Visual QA NOT VERIFIED: browser inventory empty. Manually verify
  375/768/1024/1280/1440px, long filenames/errors, keyboard and warning behavior.
- No API, Backend, Museum, Mobile, Admin, validation-policy or workflow changes.
  Tests use mock services only: no project creation, real upload or MongoDB writes.

## S28.3 — Customer Login/Register UI and Accessibility (2026-10-23)

- AuthLayout retains existing copy/navy branding but makes the slogan a paragraph
  (24–32px) and keeps exactly one task H1 (28–36px). Empty descriptions no longer
  render blank paragraphs. Both forms share27rem maximum width,16px field gaps,
  left-aligned task headings and consistent label/body/footer rhythm.
- Removed fixed minimum-column pressure at tablet widths through scoped equal
  minmax(0,1fr) columns; existing≤720px single-panel layout retained. Shrinkable
  fields,16px input text and natural wrapping for long error/help/footer text;
  no clipping/nowrap or fixed card heights. Error border/focus-within ring,
  stable pressed CTA and reduced-motion scoped only to login/register wrappers.
- Invalid submit still calls unchanged validators, retains all values and focuses
  the first invalid field in visual order on the next animation frame. The form
  connection is checked to avoid focus after unmount. Input's existing unique
  IDs, labels, aria-invalid and described-by remain intact, including PasswordField.
- Added form aria-busy while preserving synchronous submit locks, loading button,
  password visibility/autocomplete, payload normalization and exact redirects.
  Register displays safe messages for known EMAIL_ALREADY_EXISTS,400,429,5xx and
  network/timeout errors; unknown errors remain generic. No raw error text/logs.
- ui-ux-pro-max informed task hierarchy, first-error focus and readable reflow.
  Focused12/12 and full Web363/363 PASS; lint/typecheck/build/diff-check PASS.
  Existing projectRepository dynamic-import warning remains non-blocking.
- Visual QA NOT VERIFIED: browser inventory empty. Manual375/768/1024/1280/1440,
  keyboard focus/error announcement, long errors, zoom and password-manager checks
  pending. Mock-only form tests made no real login/register or database requests.

## S28.2 — Customer Shell Accessibility and Feedback (2026-10-23)

- Preserved Customer Sidebar/Topbar layout, palette, Be Vietnam Pro, route titles,
  search and authentication services. No Public Museum style/layout changes.
- Added first-focusable “Chuyển đến nội dung chính” link scoped to app-shell,
  visible only on focus, targeting customer-main with tabindex=-1 and a main ref.
  It is inert while the modal drawer is open. Initial mount does not steal focus;
  pathname changes focus main after the drawer/body becomes non-inert. Query-only
  changes do not move focus. Drawer navigation (including same-route clicks)
  targets main; Escape/close/backdrop preserve menu-trigger focus restoration.
- Existing drawer Tab/Shift+Tab trap, Escape, body scroll-lock, modal semantics
  and inert background retained. Focus tests exercise actual handlers/effects with
  mocked DOM/hooks, not a live browser or account.
- Failed logout now renders persistent Vietnamese role=alert feedback outside
  the profile menu, plus an explicit /login link. No failure navigation/success
  claim, raw exception rendering or automatic retry. Existing authService.logout
  still clears the local session in finally; UI says server logout is unconfirmed,
  never promises the user remains authenticated. Further logout clicks disabled
  after failure; account-menu arrow navigation skips disabled items.
- Scoped button wrapping, line-height1.45, non-shrinking SVG icons and no pressed
  position shift. Reduced-motion overrides for Customer buttons/fields/cards;
  existing spacing/radius/font/color tokens and disabled styling retained.
  Error feedback spans Topbar grid and naturally wraps at narrow widths.
- ui-ux-pro-max informed skip-link, predictable focus and readable error feedback.
  Full Web357/357 PASS,0 failures/skips; lint/typecheck/build/diff-check PASS.
  Existing projectRepository dynamic-import build warning remains non-blocking.
- Visual QA NOT VERIFIED: browser inventory empty. Manual375/768/1024/1280/1440,
  100% zoom, Tab/Shift+Tab/Escape, route-change focus, long button/error text and
  reduced-motion checks pending. Do not test logout failure by mutating real auth
  sessions solely for visual QA; use mocks or separately approved test accounts.

## S27.6 — Final Public Museum UI Consistency (2026-10-23)

- Inspection found homepage-only compact Header/Footer overrides, larger About
  CTA text/padding, and raised hover styling on non-clickable homepage topic cards.
  Compact shell now applies to every public route:72px desktop/68px mobile header,
  shared logo/nav/language-control sizing,28–40px footer padding and consistent
  column gaps. The homepage marker remains but no longer controls shell sizes.
- About CTA aligned to existing14px/1.5,10×16px padding,44px minimum target;
  About body line-height1.65 matches other introductions. Public CTA transitions
  and pressed primary state use existing tokens; icons cannot shrink. Shared
  visible focus and reduced-motion overrides retained, not replaced by hover only.
- Breadcrumb items now have bounded width/wrapping and non-shrinking separators.
  Mobile dialog explicitly scrolls vertically and contains overscroll for short
  viewports/zoom; unchanged open/close/Escape/focus behavior. No fixed text heights,
  horizontal clipping, forced zoom or layout transforms introduced.
- Removed elevated topic-card hover affordance because these cards are read-only.
  Clickable video cards retain hover/focus feedback. No routes, copy, files/media,
  credits/licence text or publication/language availability changed. Existing
  real loading/error/empty states retained; no development notices found on the
  five main public pages in rendered regression tests.
- ui-ux-pro-max informed focus consistency, readable reflow and truthful affordance.
  Web352/352 PASS,0 failed/skipped; lint/typecheck/build/diff-check PASS. Existing
  projectRepository dynamic-import warning remains non-blocking. Browser inventory
  empty: Visual QA NOT VERIFIED at375/768/1024/1280/1440 and zoom100/200%; manual
  menu/keyboard/focus, footer wrapping and video playback checks remain required.

## S27.3.6.3 — Final Video Source Polish (2026-10-23)

- Public detail source link now reads “Nguồn video gốc”, with a screen-reader
  new-tab hint, unchanged safe source URL and noopener/noreferrer. Link uses
 14px semibold primary text, underline,24px minimum height and existing focus ring.
- Only the exact redundant credit pattern “Nguồn video: {source label} — xem
  video gốc” is shortened to the existing source label beside the link. Distinct
  author credits are not normalized; all licence text remains fully visible.
  No evidence identifies licence clauses as optional, so none were hidden/moved.
  Non-link fallback still includes full credit/source label/reference/licence.
- Existing14px/1.65 muted text,12px player gap and natural wrapping retained;
  no nowrap, clipping, disclosure or extra panel. ui-ux-pro-max informed readable
  reflow and clear keyboard focus. Player/layout/languages/navigation unchanged.
- Web350/350 PASS,0 failed/skipped; lint/typecheck/build/diff-check PASS. Existing
  non-blocking projectRepository dynamic-import warning retained. Browser inventory
  empty: Visual QA NOT VERIFIED; actual responsive/focus/zoom need manual checking.

## S27.3.6.2 — Compact Video Credit Line (2026-10-23)

- Removed the large “Nguồn và quyền sử dụng” panel/heading from public video
  detail. Source link and complete original rights/licence text now form one
  compact paragraph directly after the player, before any genuine transcript.
  An inline separator is decorative; all credit/licence text remains visible,
  never truncated, hidden in a tooltip or removed from the catalog.
- No-link attribution fallback retains credit, source label and reference.
  External-link allowlist and noopener/noreferrer unchanged. Source-only text is
 14px/1.65 using existing muted/primary tokens; paragraph naturally wraps with
  overflow-wrap:anywhere,12px player gap. Removed obsolete panel CSS, no empty box.
- Loading, media/caption error, native player, language availability statuses,
  breadcrumb/title and both navigation actions unchanged. No technical/internal
  notices added. ui-ux-pro-max informed readable wrapping rather than forced nowrap.
- Web349/349 PASS,0 failures/skips; lint/typecheck/build/diff-check PASS. Existing
  projectRepository chunk warning remains non-blocking. Visual QA NOT VERIFIED;
  real browser rendering/playback not exercised in this step. No API/data changes.

## S27.3.6.1 — Public Museum Resource Normalization (2026-10-23)

- Validation: Web348/348 PASS,0 failed/skipped; lint/typecheck/build/diff-check
  PASS. Built output contains8/8 canonical media with original SHA-256; no old
  image URLs remain in application source. Existing chunk warning non-blocking.
- Canonical homepage/explore/about image URLs changed from `/images/museum/` to
  `/museum/images/`; six original JPEGs copied byte-for-byte, no re-encoding.
  Config, strict image allowlist, Vite inventory and related fixtures updated.
- Video/poster/caption roots remain `/museum/videos/`, `/museum/posters/`,
  `/museum/captions/`. Source links, publication/rights guards, media and UI
  behavior unchanged. Editorial image guard accepts canonical image paths and
  retains legacy museum-media compatibility; no actual legacy media present.
- Eight original media hashes unique; six intentional compatibility pairs now
  exist across old/new image locations. External URL use cannot be established,
  so old assets preserved, no deletions. MUSEUM_IMAGES.md records sizes, hashes,
  mapping, sources/rights and compatibility limits. Historical local path mentions
  in these docs updated; original source/licence information preserved.

## S27.3.6 — Public Museum Video Detail (2026-10-23)

- Added detail-only presentation scope for `/thuyet-minh/:slug`; actual catalog,
  MP4/poster URLs, source link, publication/variant guards and player logic remain
  unchanged. Shared Header/Footer, Be Vietnam Pro and blue/purple tokens retained.
- Detail container max1120px, centered player max1040px with existing16:9 contain
  sizing. Title28–40px, description16px/1.65, compact breadcrumb/section spacing.
  When a genuine transcript exists it follows the player, without narrowing video.
- Language choices retain native fieldset/legend/radios and availability guards:
  5 desktop /3 tablet /2 mobile columns, equal-height cards, wrapping labels,
  ready text and selected token background. Unavailable choices remain disabled
  with dashed border/cursor; status text remains readable, not faded away.
- Removed redundant original-language line and missing-public-transcript notice.
  Genuine transcripts/chapters still render. Loading, native playback controls,
  metadata preload, media error/timeout, caption error and retry behavior unchanged.
- Source block uses compact responsive layout with full original credit, external
  link and licence text intact (no collapsed/hidden rights). Navigation uses a
  labelled nav, outlined back link and existing primary Explore CTA,44px minimum
  targets and3px token focus rings. Small mobile navigation stacks, no clipping.
- ui-ux-pro-max informed disabled-state distinction, readable wrapping and focus.
  Browser inventory empty: Visual QA NOT VERIFIED, including actual playback,
  responsive375/768/1024/1280/1440 and zoom100/200%. Mock tests do not prove visual
  or real media loading success. No Customer/API/backend/data changes.
- Validation: Web345/345 PASS,0 failures/skips; lint/typecheck/build/diff-check
  PASS. Build required running outside sandbox after spawn EPERM; existing
  projectRepository dynamic-import chunk warning remains non-blocking.

## S27.3.5 — Public Museum About Page (2026-10-23)

- `/ve-bao-tang` now renders MuseumAboutPage rather than the generic placeholder.
  Retains the exact page title, public breadcrumb, shared Header/Footer, Be Vietnam
  Pro and existing blue/purple semantic tokens; no route URL or API changes.
- Introduction uses the existing homepage museumIntro facade photo (1200×900,
  4:3, object-fit cover), via MuseumHomeImage with its existing lazy loading,
  accessible alt and failure fallback. Image files, watermark, source and licence
  metadata in MUSEUM_IMAGES.md remain unchanged. No development captions added.
- Desktop introduction has equal image/text columns with24–48px gap; at≤1023px
  image precedes text in one column. Copy is reused from Home/Explore, without
  adding historical claims, dates or visitor information. CTA “Khám phá bảo tàng”
  links only to the existing `/kham-pha`, with44px minimum height and focus ring.
- Two non-interactive information cards, “Về bảo tàng” and “Hành trình khám phá”,
  reuse existing approved copy. Two columns become one at≤767px. Body text16px,
  readable line length, fluid headings, natural height and wrapping; no spacers
  or truncated text. All new style selectors are scoped to museum-about.
- ui-ux-pro-max guidance informed fluid images, readable body text and reflow.
  Visual QA: NOT VERIFIED (browser inventory empty); widths375/768/1024/1280/1440,
  zoom100/200%, actual focus and image crop still require manual browser checking.
- Validation: Web342/342 PASS (0 failures/skips), lint/typecheck/build/diff-check
  PASS. Build retains the existing non-blocking projectRepository dynamic-import
  warning. No Customer/Backend/Mobile/Admin, API, data or image changes.

## S27.3.4 — Narration listing refinement (2026-10-23)

- `/thuyet-minh` keeps its breadcrumb, title “Thuyết minh bảo tàng”, introduction,
  actual catalog/MP4/poster, public links and shared shell/tokens/font. The listing
  now has a dedicated museum-video--listing modifier; all new CSS is listing-only.
- Single-video card is centered with1120px maximum width (previous1100), balanced
  1.1:1 media/copy columns,20–32px padding,24–40px gap and unchanged16:9 thumbnail.
  At≤1023px it stacks in DOM order, image above copy;≤479px uses16px padding.
  Text wraps naturally without fixed card heights, truncation or large spacers.
- Title scale22–28px, body16px/1.65, CTA44px minimum with decorative18px Play SVG.
  CTA still navigates to the same public detail route, never triggers playback on
  the list. Hover/focus-within card styles preserved; explicit3px token focus ring
  for title/CTA. No image/video/data/schema/player behavior changed.
- Listing hero/section spacing aligns with Explore, using natural32–48px top and
  48–64px bottom spacing, not empty viewport fillers. Empty/error/availability and
  credits preserved; development copy was already removed in S27.3.3.1.
- ui-ux-pro-max informed visible keyboard focus, readable reflow and bounded media.
  Browser inventory empty: Visual QA NOT VERIFIED, including375/768/1024/1280/1440,
  hover/keyboard and zoom100/200%. Mock rules do not imply actual visual PASS.
- Validation: Web340/340 PASS,0 failed/skipped; lint/typecheck/build/diff-check PASS.
  Existing projectRepository mixed-import warning remains non-blocking. Build used
  approved sandbox escalation. One new CSS assertion was narrowed to distinguish
  forbidden fixed height from the required44px minimum touch target.

## S27.3.3.1 — Clean Public Museum visitor copy (2026-10-23)

- Removed publication/development announcements from Explore introduction/catalog,
  homepage exhibition heading and Footer: no “Chuyên đề đang được chuẩn bị”,
  “sau khi được duyệt”, future-publication promises or “Website ... phát triển”.
  Removed Đang chuẩn bị badges only from exhibition cards on Explore/Home; cards
  remain static, without links/buttons, publication changes or fake detail pages.
- Retained visitor-facing titles, descriptions, images, navigation and content.
  Homepage video introduction now describes the video without a future release
  promise. About/video/image empty states use neutral absence messages instead of
  development/approval copy; 404/error/source/license feedback preserved.
- Removed development terminology from local image alt text while keeping text
  alternatives and all file paths. Source/license documentation remains untouched;
  no historical claims, new images or rights metadata invented.
- Important availability remains visible: four planned homepage languages and video
  language selector/player states, loading/error/caption failures, absent public
  transcripts and Not Found. No authentication, availability or publishing guard
  changed. ui-ux-pro-max informed separating visitor copy from essential feedback.
- Layout/tokens/font/responsive/Header/navigation unchanged; removed text nodes do
  not leave empty badge/notice containers. Footer branding/links retained.
- Web338/338 PASS,0 failed/skipped; lint/typecheck/build/diff-check PASS. Browser
  inventory empty: Visual QA NOT VERIFIED. Existing mixed-import build advisory
  remains; approved sandbox escalation used for production build.

## S27.3.3 — Explore Museum page (2026-10-23)

- `/kham-pha` keeps its public routes, breadcrumb, approved introductory copy,
  blue tokens/Be Vietnam Pro and shared Header/Footer. Listing-only CSS refines the
  muted intro surface, balanced title scale, breadcrumb spacing, paragraph measure,
  section rhythm and catalog bottom spacing; detail-page styling unchanged.
- When no published exhibitions exist, replace the single empty placeholder with
  three non-interactive preparation cards: Lịch sử và ký ức, Câu chuyện con người,
  Giá trị của hòa bình. Existing homepage descriptions and image slots reused;
  no new assets, demo captions, fake detail links or publication records.
- MuseumHomeImage reuses the centralized asset inventory, alt/dimensions/lazy loading,
  no-caption policy and missing/error fallback. Cards have16:10 cover images,16px
  padding, equal grid heights, natural text wrapping and neutral Đang chuẩn bị badges.
  Grid stays3 columns desktop,2 at≤1023px,1 at≤767px. Existing Thuyết minh CTA retained.
- Previews are not catalog entries. Published entries continue through the unchanged
  source/publication filter and original approved-detail path. Unknown, draft,
  duplicate or incomplete entries still cannot expose detail content. No private API.
- ui-ux-pro-max informed stable media areas, shrinkable columns and semantic
  non-interactive preparation feedback; no clipping or animation introduced.
- Web337/337 PASS,0 failed/skipped; lint/typecheck/build/diff-check PASS. Existing
  projectRepository mixed-import warning unchanged. Visual QA NOT VERIFIED: browser
  inventory empty; actual375/768/1024/1280/1440, zoom, crop/focus and Footer spacing
  require manual review. Mock layout checks do not establish visual PASS.

## S27.3.2.5 — Multilingual section refinement (2026-10-23)

- Only homepage “Lắng nghe theo cách của bạn” changed. Replaced technical source
  copy with the user-specified introduction about historical stories across languages.
  Four existing English/Thai/Korean/Simplified Chinese entries retained; no new data.
- Reused the existing neutral language SVG (decorative aria-hidden), not flags.
  Compact two-column card content:32px icon,16px prominent Vietnamese heading and
  13px English subtitle (lang=en);14px padding,8/12px gaps, natural equal grid height.
- Đang chuẩn bị is a12px neutral text span badge with muted surface/text and border,
  not a button/link, tab stop or playback action. No primary-action color treatment,
  full-width divider or unnecessary empty space. Desktop4 columns, tablet2 at≤1023,
  mobile1 at≤767. Long names wrap; no fixed content height or added animation.
- ui-ux-pro-max guided contextual decorative-icon semantics and static status clarity.
  Existing blue tokens/Be Vietnam Pro and all other homepage sections remain intact;
  no demo-image captions reintroduced. Browser inventory empty: Visual QA NOT VERIFIED.
- Validation: Web333/333 PASS,0 skipped/failed; lint/typecheck/build/diff-check PASS.
  Existing projectRepository mixed-import advisory remains; approved sandbox
  escalation used for production build. Tests assert exact copy/languages,
  decorative icons, non-interactive status and compact4/2/1 responsive rules.

## S27.3.2.4 — Homepage caption cleanup (2026-10-23)

- User confirms rights for existing images. Removed development/demo captions from
  Hero, intro, exhibition images and fallback demo thumbnail; removed the shared
  exhibition notice and its aria-describedby wiring/styles. No empty figcaption,
  notice border/padding or reserved empty Hero caption row. No replacement copy.
- Individual source/license captions remain, including the existing video poster
  source caption. Alt text, eager/lazy loading, image-error fallback and all assets
  preserved. ui-ux-pro-max informed retaining text alternatives and stable media.
- S27.3.2.3 proportions, blue palette/font, public links, three editorial/four
  language preparation states and all Customer behavior unchanged. Source metadata
  remains in MUSEUM_IMAGES.md with a dated current-policy note; no invented rights.
- Browser inventory empty: Visual QA NOT VERIFIED at375/768/1024/1280/1440, including
  real whitespace/reflow. Mock/SSR checks are not visual verification.
- Web332/332 PASS; lint/typecheck/production build/diff-check PASS. SHA-256 checks
  confirm all files in public/images/museum unchanged. Existing projectRepository
  static/dynamic import build warning remains; build used approved escalation.

## S27.3.2.3 — Compact homepage refinement (2026-10-23)

- Preserved S27.3.2.2 full-width image/gradient/captions, palette, Be Vietnam Pro,
  public links and preparation states. Only homepage CSS plus a pathname-scoped
  shell class changed; other Public routes and Customer UI retain existing styles.
- Desktop Header minimum76→72px, vertical padding12→8px; compact brand/actions,
 44px interactive targets retained. Mobile Header minimum68px; existing menu
  breakpoint/keyboard behavior unchanged. No fixed maximum height.
- Hero minimum600→500px desktop,550→480px tablet; text grows naturally if needed.
  Heading maximum56→52px (desktop44–52px), mobile32–40px; content padding48–88→32–40px.
  CTA padding13×20→10×16px, compact13px caption in a separate lower row.
- Section spacing40–72→32–48px; section headings28–40→24–32px. Intro image bounded
  to480px, paragraph measure56→52ch. Video thumbnail bounded520px with .9:1 columns.
  Demo images and poster unchanged, cover positions preserved pending browser QA.
- Exhibition padding20–28→16px, image4:3→16:10, language padding24→16px.
  Notice padding12×16→8×12px; CTA panel24–48→20–32px; Footer padding40–64→28–40px,
  column gap32→24px (mobile16), notice margin/padding32/24→20/16px.
- ui-ux-pro-max informed readable body/reflow and44px targets; no global scaling,
  truncation, animations or functional changes. Six referenced100% screenshots were
  not attached to this request; changes use supplied requirements/source evidence.
  Browser inventory empty: Visual QA NOT VERIFIED at375/768/1024/1280/1440 and
 100/200% zoom; crop, keyboard, overflow and actual compact proportions need review.
- Validation: Web332/332 PASS, lint/typecheck/production build/diff-check PASS;
  existing projectRepository mixed-import warning unchanged. No real browser QA.

## S27.3.2.2 — Final homepage / full-width Hero (2026-10-23)

- Homepage Hero now uses the existing local hero image as a full-bleed cover layer
  outside MuseumContainer. Navy left-to-right gradient, left-aligned copy/CTAs,
  minimum600px desktop/550px tablet, content-driven mobile height. Caption occupies
  its own grid row, not an absolute overlay on CTAs. No viewport-width overflow hack,
  fixed maximum height, animation, route or business changes.
- Introduction is an equally sized image/copy two-column layout, vertically centered;
  mobile stacks. Editorial cards retain three preparation badges, equal desktop
  heights and3/2/1-column responsive rules. Demo disclaimer appears once per section,
  associated with each demo image via aria-describedby; individual source captions
  remain visible when not the shared demo caption.
- Language cards, real video poster/copy columns and closing CTA panel use consistent
  spacing. Existing navy Footer, Be Vietnam Pro, palette, protected Customer behavior
  and secondary authenticated editor link preserved. ui-ux-pro-max informed contrast,
  wrapping, image fallbacks and reserved media space.
- Existing demo assets retained byte-for-byte. Hero measured1960x1102; no new photo
  or historical-source claim. Full-width crop/sharpness still needs human review,
  especially at high-DPI/large displays. Featured video retains approved640x360 poster
  ahead of the demo thumbnail. No private data/API accessed.
- Browser inventory empty: Visual QA NOT VERIFIED, including375/768/1024/1280/1440,
  zoom100/200%, real keyboard focus/crop/overflow and reduced-motion behavior.
- Full Web330/330 PASS; lint/typecheck/build/diff-check PASS. Existing build warning
  about projectRepository static/dynamic imports remains, not introduced here.

## S27.3.2.1 — Museum homepage image slots (2026-10-23)

- Six homepage-only slots in `features/museum/homeImages.ts`: hero, museumIntro,
  exhibitionHistory, exhibitionPeople, exhibitionPeace, featuredVideo. Copy paths,
  sizes, replacement and editorial caveats are in [MUSEUM_IMAGES.md](MUSEUM_IMAGES.md).
- `MuseumHomeImage` reserves 16:9/4:3 space, uses object-fit cover, descriptive alt,
  eager Hero/lazy below-fold images and error fall-through to styled fallback.
  Vite asset inventory avoids requests for known missing files. Demo captions stay
  explicit; three editorial cards remain non-interactive and Đang chuẩn bị.
- Hero may reuse the existing approved real video poster; featuredVideo prioritizes
  that exact video's poster. No real image/video overwritten; six custom files are
  absent initially. No image downloading/generation, new publication or data/API change.
- ui-ux-pro-max guided reserved dimensions, image scaling and below-fold loading.
  Blue tokens, public CTAs and Customer workflows unchanged. Web327/327 PASS;
  lint/typecheck/build/diff-check PASS. Visual QA NOT VERIFIED: no browser surface;
  viewport375/768/1024/1280/1440 and zoom200% still require manual checking.

## AI-TRANSLATE-05.8.4L — Dynamic controlled preview contract (2026-10-22)

- Existing `/projects/:projectId/translation/controlled-preview` now accepts a valid
  dynamic project ID in development, still RequireAuth + opt-in default OFF, fixed
  explicit dedicated loopback origin, GET-only and no ordinary API fallback.
- READY/REQUEST_CONSUMED status must supply authenticated server scope matching the
  route project, positive revision and SHA-256 source digest. Draft GET is validated
  against that exact returned binding; no hardcoded museum digest, default language
  selection or fake source metadata. Wrong project/owner still rejected by Backend.
- Source preflight/errors from 05.8.4I remain generic per-project; no limit increase.
  Viewer continues to label drafts unapproved, display readiness/blocked/consumed,
  and keep generationEnabled=false without generation or Approve controls. Legacy
  Dịch button is not connected to controlled dispatch. No layout/visual redesign.
- Production build excludes controlled viewer. Browser verification NOT RUN;
  no real source/draft, permit, credentials or runtime accessed in this step.


## AI-TRANSLATE-05.8.4I — New video source-limit feedback (2026-10-22)

- Existing TranslationPage now hosts a development-only read-only source check,
  keyed by actual project ID/target so results cannot leak across projects. User
  presses “Kiểm tra nguồn”; existing API client sends only diagnostic GET with
  retry=false, 15-second timeout + abort. No automatic login/refresh, upload, new
  project, translation, permit or generation. Production workspace behavior stays
  unchanged; development generation/retry actions fail closed in both legacy and
  GROUPS_V1 workspaces, irrespective of successful diagnostic. Other workflow
  guards, language selection and artifact viewing remain in place.
- Oversize: “Dữ liệu lời thoại vượt giới hạn xử lý. Vui lòng sử dụng video ngắn hơn
  hoặc giảm lượng lời thoại rồi thử lại.” Actual bytes/98304 and segments/10000 are
  shown only when known; count overflow may show “Ít nhất 10.001”. Unknown sizes are
  not invented. Link “Tạo dự án với video khác” navigates to existing /projects/new,
  does not create a project or alter the museum project. Existing upload validation
  and STT remain unchanged; this task did not run them or authorize AI calls.
- Source not ready/revision missing, GROUPS_V1 disabled, controlled execution not
  approved, auth/ownership and unexpected failures have separate allowlisted
  Vietnamese messages, no raw API error text. Successful local source checks still
  warn that RAM drafts in other processes are UNKNOWN and generation is not granted.
- Shared Card/Button/typography kept. ui-ux-pro-max guided readable recovery text,
  live status and a GET-only retry action without focus stealing. No redesign or
  Museum/Admin/Mobile changes. Browser visual/real upload verification NOT RUN.


## WEB-TRANSLATE-03 — Controlled read-only preview UI (2026-10-22)

- Source/mock PASS: authenticated development route `/projects/6ad5c93a86cf95b7523704a5/translation/controlled-preview`. Lazy page is absent from production routes/bundle. Inside the page, DEV + `VITE_CONTROLLED_TRANSLATION_PREVIEW_ENABLED=true` + exact project are all required before requests. Default is OFF; disabled development page shows unavailable content without making requests. Existing TranslationPage/legacy/GROUPS_V1 mutation UI and workflow guards are unchanged.
- Separate GET-only client accepts only explicitly configured `VITE_CONTROLLED_TRANSLATION_ORIGIN=http://127.0.0.1:18083`. No ordinary API fallback, refresh POST, retries, generation or approve methods. Uses existing session access token in Authorization header only, timeout 15 seconds combined with abort, redirects denied, cookies omitted, no-store. No keys/permit/credentials are configured in frontend. Expired JWT fails closed; sign in again outside this screen.
- Displays server READY/BLOCKED/REQUEST_CONSUMED. Network/auth/unknown or mismatched response becomes local BLOCKED labeled not server-confirmed. Never invents LOCKED/DRAFT_READY, and generationEnabled=true is rejected. READY remains local readiness only; no generation or approve button exists.
- Existing controlled draft GET verified behind JWT/CUSTOMER/owner/permit scope. User supplies an existing draft UUID, not a permit ID. Client validates pinned project/revision/digest/vi/en, draft format/expiry and group structure; shows Vietnamese snapshot and English draft side by side, stacked on narrow screens. REQUEST_CONSUMED may still read an existing draft. This is unapproved snapshot review, not proof current workflow remains CURRENT; expired/missing/restarted drafts are errors, never regenerated. No draft discovery or generation added.
- Shared PageHeader/Card/Button, Navy/Purple/Be Vietnam Pro reused; CSS scoped to `.controlled-translation-preview`. Skill ui-ux-pro-max informed explicit read-only labeling, live status/error feedback, labeled input and shrinkable responsive columns. No Museum/Admin styling changed.
- Web tests **271/271 PASS**, including **17 new mock client/safety tests**; Backend status/GROUPS_V1/Gemini/legacy mock regression **58/58 PASS**. Backend HTTP status test extended to verify existing draft GET authorization/read-only mock response. Web lint/typecheck/build, backend lint and diff-check PASS. Production bundle check finds no controlled page/status markers. Vite retains existing projectRepository chunk warning. Browser/manual responsive verification **NOT RUN**; no runtime started, no real draft/permit touched, Gemini calls/DB writes **0**.


## WEB-TRANSLATE-02 — Controlled Web integration gate (2026-10-21)

- **BLOCKED for Web generation integration; minimal read-only Backend status support implemented under task item 10.** The prior runtime exposed only public health, not authenticated readiness. Customer Web/TranslationPage/GroupTranslationWorkspace are deliberately unchanged; legacy alignment and workflow guards remain intact. No new frontend flag is enabled and there is no controlled Web entry point yet.
- Authenticated dedicated-runtime `GET /api/projects/:id/translations/controlled-status` now checks permit evidence and the existing pinned CURRENT source verifier. Returns READY/BLOCKED/REQUEST_CONSUMED, always `generationEnabled=false`. READY is local readiness only, never provider-access/billing approval. See docs/API.md for the exact contract.
- Future UI must represent LOCKED (health-only runtime), BLOCKED (unavailable status/auth/credentials/source), REQUEST_CONSUMED (no retry) and DRAFT_READY (validated authenticated draft), with no fallback to legacy/ordinary provider, no random permit ID and no approve action. Those Web states/actions are not claimed implemented in this foundation step.
- No real runtime was started and no real permit/credentials accessed. Browser verification NOT RUN. Mock status tests 13/13 PASS; broader unit/mock regression 63 PASS, 0 FAIL, 11 Windows/Linux-only skips; lint/typecheck/build PASS. No Gemini or DB calls/writes.


## UI07.6.6.1 — Transcript revision foundation (2026-10-19)

- Backend foundation đã có revision/provenance fail-closed nhưng Customer Web vẫn read-only; không thêm nút “Chỉnh sửa”, textarea hoặc PATCH call trong bước này.
- `GET transcript` có revision additive; artifact legacy thiếu provenance được Backend phân loại UNKNOWN và workflow không coi là CURRENT. UI hiện tại tiếp tục dùng recovery/blocked state thay vì tự suy đoán hoặc tự chạy lại AI.
- Bước UI edit tương lai phải gửi `expectedRevision`, giữ nguyên segment ID/timestamp/sequence, xử lý conflict 409 và refresh dữ liệu trước khi người dùng quyết định lại. Không optimistic-success trước response server.

## UI07.6.6 — Manual Transcript Segment Editing (BLOCKED, 2026-10-19)

- Audit xác nhận Transcript Web hiện cố ý read-only: editor hook không mutation, `saveTranscript` báo Backend chưa hỗ trợ và mỗi segment chỉ render nội dung/timestamp. Vì Backend chưa có revision compare-and-set và downstream artifacts chưa có invalidation an toàn, nút “Chỉnh sửa” chưa được đưa vào giao diện để tránh hứa một thao tác có thể làm bản dịch/TTS/Kết quả cũ trở nên sai mà hệ thống vẫn coi là hợp lệ.
- Thiết kế sẵn sàng triển khai sau khi contract được duyệt: mỗi segment có nút “Chỉnh sửa”; editor inline dùng label rõ ràng và textarea chứa nội dung hiện tại; “Lưu thay đổi”/“Hủy” có touch target tối thiểu 44px, focus-visible, trạng thái loading chống double-submit, validation inline tiếng Việt và vùng `role=status`/`alert` phù hợp. Hủy không mutation; lỗi conflict giữ bản server và yêu cầu người dùng tải lại thay vì ghi đè âm thầm.
- Timestamp, sequence, segment ID và Workflow Stepper phải bất biến. UI chỉ bật chỉnh sửa khi Backend xác nhận transcript READY, workflow cho phép và không có STT đang xử lý; `BLOCKED/UNKNOWN` fail-closed.
- Sau khi lưu, UI phải đồng bộ revision từ response và trình bày rõ các bản dịch/narration/result đã stale theo policy Backend. Không tự chạy STT, dịch, TTS hoặc tự xóa artifact đã duyệt.
- Hướng dẫn UI UX Pro Max được áp dụng cho phương án tương lai: validation gần control, async state ổn định, thông báo lỗi truy cập được bằng bàn phím/screen reader và không dùng optimistic success trước response server.

Không có application UI/CSS nào được thay đổi trong bước audit này.

## UI07.6.5 — Remove Transcript Helper Text (2026-10-18)

- Transcript bỏ năm dòng helper được chỉ định tại PageHeader, read-only notice, protected-player note, số cụm/phân đoạn động và footer read-only để giảm nhiễu thị giác. Chỉ presentation của Transcript thay đổi; dữ liệu transcript, phép nhóm hiển thị và timestamp vẫn nguyên vẹn.
- Heading, project/status, Workflow Stepper, player, segments và action tiếp tục được giữ. Trạng thái loading/error/empty/unknown, lỗi seek/playback, WorkflowRouteRecovery khi deep link bị chặn và toàn bộ guard/mutation permissions không đổi.
- CSS không dùng của player note và footer status được loại bỏ; khoảng cách action còn lại tiếp tục theo nhịp spacing hiện có. Thay đổi không lan sang Translation hoặc các consumer khác của shared guard.

## UI07.6.4 — Transcript Media Player Auto-Load & Reload Fix (2026-10-18)

- Transcript tự chuẩn bị phương tiện nguồn ngay khi Project metadata xác nhận media `READY`; reload tạo lại authenticated Blob URL trong bộ nhớ, không còn yêu cầu nhấn “Tải phương tiện để phát”. Player native vẫn không autoplay và chỉ phát sau thao tác của người dùng.
- Luồng tải tiếp tục dùng `apiBlob` với Bearer session và refresh-once; token không đi vào URL. Trạng thái `LOADING / READY / EMPTY / ERROR / UNKNOWN` tách biệt, lỗi tải có “Thử tải lại”, timeout 120 giây và metadata chưa xác minh không bị trình bày thành không có tệp.
- Lifecycle hoãn auto-load một microtask để React StrictMode có thể cleanup probe trước request; unmount/project-media change abort request, bỏ qua late result và revoke Object URL đúng owner. Media identity bao gồm project, metadata state, loại, tên và kích thước nên không phát nhầm Blob cũ.
- Vì transport hiện tại dùng `response.blob()`, Frontend giới hạn auto-load ở 100 MiB để tránh giữ tệp tới 500 MB trong RAM. Tệp lớn cần contract streaming có xác thực mà native media element có thể dùng (Backend Range hiện có nhưng Bearer token không thể gắn vào `src`); UI báo dependency này thay vì tải không kiểm soát. Không đổi upload limit, Backend hay API.

## UI07.6.2 — Clickable Workflow Stepper (2026-10-18)

- Horizontal Stepper sáu bước giữ nguyên presentation UI07.6.1 nhưng các bước được phép nay là React Router links: Tải lên → Project Detail, Bản ghi → Transcript, Bản dịch → Translation, Giọng đọc → Voice, Tạo thuyết minh → Generate, Kết quả → Result. Mọi URL giữ đúng project ID; query `language` chỉ được thêm từ `workflow.targetLanguage` có provenance đã được route guard tin cậy.
- Resolver navigation tái sử dụng `resolveWorkflowRouteAccess` làm nguồn quyền truy cập. Bước đã hoàn thành và bước processing/failed có bằng chứng có thể mở ở chế độ guard cho phép; bước tương lai, `BLOCKED/UNKNOWN`, workflow thiếu/mâu thuẫn, Result thiếu artifact hoặc route cần target language nhưng thiếu provenance đều không tạo link. Deep-link guard tại trang đích vẫn là lớp kiểm tra cuối cùng.
- Mỗi page truyền `pageStep` tường minh; bước của chính trang đang xem là phần tử không tương tác nên không tạo navigation/reload. Workflow state và `aria-current="step"` vẫn chỉ bắt nguồn từ Backend workflow DTO, không suy đoán từ URL hay page prop.
- Link có hover/active/focus-visible, con trỏ rõ ràng, kích hoạt bằng Enter và Space; bước khóa có `aria-disabled`, nhãn trạng thái và lý do tiếng Việt qua accessible label/title. Không có click handler trên bước khóa, mutation, retry, approve hoặc processing job. Reduced-motion và responsive/local scroll của UI07.6.1 được giữ nguyên.

## UI07.6.1 — Premium Workflow Stepper (2026-10-18)

- `WorkflowSteps` nay nhận trực tiếp `Project.workflow` từ Backend tại Project Detail, Transcript, Translation (legacy và GROUPS_V1), Voice, Generate và Result. Thành phần không suy đoán bước hiện tại từ URL hoặc `ProjectStatus`, không điều hướng, retry hay tạo processing job khi render.
- Stepper giữ đúng sáu bước trong card trắng: header “Quy trình tạo thuyết minh”, bộ đếm đáng tin cậy “Bước X / 6”, đường tiến trình mảnh và marker có cả biểu tượng lẫn nhãn trạng thái. Bước hoàn thành dùng dấu kiểm xanh lá; bước hiện tại/đang xử lý dùng tím; bước sắp tới dùng xám; bước lỗi chỉ dùng đỏ khi `workflow.failure.jobType` khớp bước Backend đã xác nhận.
- Resolver fail-closed: `PROCESSING` cần processing job khớp bước; `FAILED` cần failure job khớp bước; dữ liệu thiếu, mâu thuẫn, `BLOCKED` hoặc `UNKNOWN` đều hiển thị trung tính, không có `aria-current` hay bộ đếm bước. Trạng thái `COMPLETED` tại Result còn yêu cầu artifact đúng loại media. Không dùng phần trăm provider để tạo tiến độ giả.
- Desktop dùng sáu cột cân bằng; tên dài được wrap. Dưới 700px, chỉ vùng stepper cuộn ngang cục bộ với nhãn trợ năng, không làm tràn toàn trang. Focus-visible, trạng thái bằng văn bản và `prefers-reduced-motion` được hỗ trợ. Source/regression PASS; Browser Desktop 1024/1280/1440 chưa chạy.

## UI07.5.1 — Create Project Desktop UI Polish (2026-10-18)

- Giữ nguyên ba bước, trường tên/mô tả/ngôn ngữ, helper/validation/character count và toàn bộ upload workflow của UI07.5. Desktop giảm khoảng cách giữa card từ 18px xuống 16px, khoảng cách nội bộ từ 16px xuống 14px và padding card còn 22px dọc/24px ngang; mobile tiếp tục dùng padding 16px và layout một cột.
- Dropzone desktop giảm từ 210px xuống 176px; icon, drag-and-drop, keyboard/single-pointer “Chọn tệp”, định dạng thật và giới hạn 500 MB vẫn còn. Danh sách định dạng/dung lượng chỉ xuất hiện một lần trong dropzone; khối “Chưa có tệp” lặp bên dưới đã được bỏ.
- Khi có tệp, metadata/preview/thay đổi/xóa/validation vẫn dùng dữ liệu thật. Bước 3 căn cùng vùng action cho trạng thái idle/selected/validating; disabled và `aria-busy` tiếp tục do Button dùng chung quản lý, upload chỉ dùng spinner indeterminate, không có phần trăm giả.
- Không đổi API, upload transport, validation, route hoặc business logic. Source/regression PASS; Browser Desktop 1024/1280/1440 chưa chạy.

## UI07.4.1 — Project table overflow & pagination (2026-10-18)

- Bảng `/projects` giữ semantic table sáu cột và workflow action hiện có, nhưng bỏ `min-width: 920px` ở desktop. `table-layout: fixed`, tổng độ rộng 100% và tỷ lệ cột mới `28/12/16/13/13/18` ưu tiên Tên dự án và Thao tác; padding ngang giảm có kiểm soát ở vùng desktop 701–1199px.
- Nhãn hành động, media, ngôn ngữ, badge và trạng thái demo được phép wrap trong ô thay vì tràn/cắt. Nhãn nghiệp vụ “Mở bước gặp lỗi” và icon mũi tên được giữ nguyên; không đổi route, workflow mapping hoặc data-state contract. Màn hình dưới 701px tiếp tục cuộn ngang bên trong region bảng, không làm tràn toàn trang.
- Pagination bỏ dòng “Hiển thị x–y / tổng dự án”, giữ Trang trước / Trang hiện tại / Trang sau và căn giữa cụm điều khiển. Logic phân trang, URL, filter và tổng dữ liệu không thay đổi.
- Source/regression validation PASS; browser đo overflow thực tế tại 1024/1280/1440 chưa chạy.

## UI07.5 — Create Project & Project Detail UI/UX (2026-10-18)

- Route `/projects/new` dùng page heading “Tạo dự án mới” với mô tả ngắn và đường quay lại danh sách hiện có. Ba card nghiệp vụ giữ nguyên thứ tự, form giới hạn chiều rộng, CTA chính đổi thành “Tạo dự án”; drag-and-drop luôn có nút chọn tệp thay thế cho keyboard/single-pointer, metadata tệp, thay/xóa, preview, validation định dạng và giới hạn 500 MB vẫn dùng logic thật hiện có.
- Upload không hiển thị progress giả vì browser transport hiện tại không cung cấp phần trăm trung gian đáng tin cậy. Loading dùng trạng thái indeterminate, cancel/retry/success giữ nguyên; create flow vẫn tạo project rồi upload, còn DRAFT resume chỉ upload vào project ID hiện hữu.
- Project Detail đưa tên thật, mô tả và status badge vào PageHeader; card tiến độ trình bày rõ `PROCESSING`, `FAILED`, `COMPLETED` và fail-closed khi workflow không khả dụng. Progress chỉ hiển thị khi Backend cung cấp ProcessingJob; mở trang không tạo/retry tác vụ.
- Media card phân biệt `ERROR`, `UNKNOWN/LOADING` với `EMPTY`, không biến lỗi metadata thành “chưa có tệp”. DRAFT có chọn/thay/xóa tệp, cancel/retry và success CTA; transport `POST /projects/:id/media`, double-submit guard và nguyên tắc không xóa DRAFT khi lỗi được giữ nguyên.
- Form Detail dùng scope `project-detail-*` riêng với label/input association, feedback và responsive actions; đã loại bỏ coupling với `auth-form` và `voice-actions`. Desktop dùng workflow card toàn chiều rộng cùng media/form grid; tự xếp một cột dưới 1100px và giữ controls đầy chiều rộng ở màn hình hẹp.
- Không đổi Backend/API/Database, route, workflow/navigation, Dashboard/Sidebar/Projects/Auth hoặc dependency. Browser Desktop chưa xác minh trực quan; Mobile/Expo deferred.

## UI07.4 — Shared Typography, Page Header & Accessibility (2026-10-18)

- Customer Web dùng thống nhất bộ font Be Vietnam Pro tự lưu trong repository với `font-display: swap`; font được nạp một lần từ `global.css`, không thêm CDN/dependency và vẫn có fallback Segoe UI/Arial/system. Dashboard và Projects giữ nguyên các scope typography đã duyệt, không đổi bố cục riêng.
- Token nền tảng Navy/Purple được giữ nguyên; bổ sung `--font-size-xs: 0.75rem` để loại bỏ biến chưa khai báo và dùng token này cho caption/badge. PageHeader giữ hierarchy `h1 + description + actions`, bổ sung quan hệ `aria-labelledby`/`aria-describedby` bằng `useId`, vùng copy chống tràn và actions có thể wrap an toàn.
- EmptyState và ErrorState không còn ID DOM cố định khi render nhiều lần; title/description dùng ID duy nhất và icon SVG từ hệ icon hiện có. ProgressBar có nhãn mặc định tiếng Việt cùng `aria-valuetext`; nút hiện/ẩn mật khẩu và PlaceholderPage không còn copy tiếng Anh.
- Focus toàn cục dùng viền Primary rõ ràng thay cho màu tím quá trong suốt. Khi `prefers-reduced-motion: reduce`, spinner dừng quay và transition của button/input/card/progress được tắt. Không tự động chuyển focus khi dữ liệu cập nhật và không thay đổi workflow/navigation/business logic.
- Phạm vi chỉ là shared foundation Customer Web. Login/Register, Sidebar, Dashboard, Project List và các workflow page không bị redesign. Browser Desktop 1024/1280/1440 chưa được xác minh trực quan; Mobile/Expo deferred.

## UI07.3 — Web Data-State Integrity (2026-10-18)

- Customer Web dùng hợp đồng trạng thái `LOADING / READY / EMPTY / ERROR / UNKNOWN`. `EMPTY` chỉ được dùng sau response thành công xác nhận không có dữ liệu; lỗi request và payload không đủ bằng chứng không còn bị trình bày như dữ liệu rỗng.
- Enrichment theo từng project giữ hai trạng thái độc lập cho media và translation. `MEDIA_NOT_FOUND` là bằng chứng media `EMPTY`; lỗi mạng, quyền, máy chủ hoặc mã lỗi khác là `ERROR`. Translation response `[]` là `EMPTY`; request thất bại là `ERROR`; payload không xác định là `UNKNOWN`.
- `Promise.allSettled` tiếp tục bảo toàn partial success: project row, status, workflow và metadata tải thành công vẫn được giữ. Project List/History hiển thị nhãn “Không tải được…” hoặc “Chưa xác định” thay vì “Chưa có tệp/Chưa dịch”; có cảnh báo dữ liệu chưa đầy đủ bằng `role=status` mà không thay bảng bằng error toàn trang.
- Dashboard chỉ tính chart/status từ Project DTO và vẫn fail-closed khi pagination chưa đầy đủ; lỗi enrichment phụ không bị tính thành 0. Dashboard công khai metadata chưa đầy đủ nhưng giữ các số liệu project/status đã xác nhận. Project Detail cũng phân biệt media `EMPTY`, `ERROR` và `UNKNOWN`.
- Không đổi API/Backend/Database, workflow navigation, filter/pagination hay layout đã duyệt. Browser Desktop chưa xác minh; Mobile/Expo deferred.

## UI07.2 — Workflow deep-link guards và Language Catalog (2026-10-18)

- Năm route workflow `Transcript / Translation / Voice / Generate / Result` đều tải Project Detail DTO trước rồi quyết định quyền truy cập bằng `workflow.step`, `workflow.state`, `canResume`, artifact và provenance của `targetLanguage`; không suy đoán từ `ProjectStatus` và không tự tạo/retry job khi mở URL, reload hoặc Back/Forward.
- Guard tách **xem** và **mutation**: bước hiện tại `READY/FAILED + canResume=true` mới cho tạo/thử lại; `PROCESSING` và artifact của bước đã qua là chỉ đọc. `BLOCKED`, `UNKNOWN`, thiếu workflow, liên kết đi trước quy trình, target không hợp lệ/không khớp đều fail-closed tại chỗ với liên kết về Project Detail, không redirect tự động nên không tạo loop.
- Result chỉ tải protected result khi `workflow.state=COMPLETED` và artifact đúng loại được xác nhận (`AUDIO → narrationReady`, `VIDEO → resultReady`). `canResume=false` không chặn xem artifact hợp lệ. Recovery heading nhận focus; thông báo tiếng Việt nói rõ không có tác vụ nào được tạo.
- Translation lấy Language active từ `GET /api/voices`, bỏ giới hạn frontend `vi/en/ja/ko`; catalog hợp lệ có thể hiển thị `zh/fr` và các code BCP-47 đơn giản khác. Voice/TTS vẫn gọi catalog theo ngôn ngữ và chỉ khả dụng khi response có Voice thật; Language active không được coi là bằng chứng có TTS. Không tự tạo voice hoặc tự chọn target khác.
- Các nhãn ngôn ngữ Voice/Generate/Result dùng `Intl.DisplayNames('vi')` với fallback an toàn, không đổi code gửi API. Lỗi/loading/empty catalog hiện có được giữ; target từ query phải khớp provenance workflow khi backend đã xác định target.
- Regression: deep link current/prior/future, `PROCESSING/FAILED/BLOCKED/UNKNOWN/missing`, result Audio/Video, target mismatch, `zh/fr`, focus/no redirect loop và mutation button guards. Browser Desktop **NOT RUN**; Backend DTO DB integration vẫn **PENDING**.

## UI07.1 — Full Website UI/UX Audit (2026-10-18)

### Phạm vi và bằng chứng

- **AUDIT COMPLETED ở mức source; Browser Desktop NOT RUN.** Đã đối chiếu router, AppShell/Sidebar/Topbar, toàn bộ 14 page component Customer Web, shared components, page CSS, feature hooks/services và 33 file test hiện có. Browser inventory của phiên audit trả `apps: []`, `browsers: []`; chưa xác nhận trực quan tại 1024/1280/1440px.
- Không sửa application source, Backend/API/Database, Mobile/Admin, dependency hay dữ liệu. UI06.5/UI06.6 vẫn **chưa có bằng chứng triển khai**. Workflow DTO và audio terminal UI06.7.2/UI06.7.3 mới source/unit PASS; DB-backed integration vẫn **PENDING**.
- Nhận diện Navy `#111C32`, Primary `#5850EC`, Accent `#794CFF` và nền sáng đã nhất quán ở token/shell. Be Vietnam Pro mới được scope cho Dashboard và `/projects`; các trang còn lại vẫn kế thừa `Inter`/system từ `--font-family`, nên chưa đạt typography Website thống nhất.

### Bảng audit theo màn hình

| Page | Current UI | Problems | Severity | Recommended changes | Priority |
|---|---|---|---|---|---|
| Shell / Header / Sidebar | Navy shell, desktop sidebar 252px, sticky topbar, profile menu và accessible mobile drawer đã có regression tests | Page title có hai pattern khác nhau; font ứng dụng chưa thống nhất; lỗi tải profile/logout không có feedback rõ. Chưa kiểm tra clipping/focus bằng browser | Significant consistency/accessibility | Chuẩn hóa app-only typography, page-heading contract và error feedback; giữ nguyên Sidebar/Profile đã duyệt | P1 |
| Dashboard | Hero, 4 quick actions, time chart Ngày/Tháng/Năm, donut, recent projects và activity dùng dữ liệu API; có trạng thái incomplete dataset | Chỉ page đầu tối đa 100 dự án được repository tải; chart biết fail-closed nhưng recent/activity vẫn chỉ phản ánh tập hiện có. Recent list dùng layout giả bảng; visual chart/popover chưa được kiểm tra thật | Data context + polish | Giữ layout UI04–UI05; công khai phạm vi dữ liệu cho mọi module, bổ sung semantics/reflow QA, không đổi chart logic | P1 |
| Dự án của tôi | Compact filter toolbar, semantic 6-column table, URL filters, pagination và workflow-based action đã triển khai | Media/translation enrichment nuốt lỗi request và hiển thị như dữ liệu vắng; 2 request phụ/project tạo N+1. Bảng `min-width: 920px` cần browser QA ở content width 1024 | Incorrect data presentation | Tách `absent/loading/error/unknown`, ưu tiên summary batch từ Backend; giữ filter/table đã duyệt | P0 |
| Tạo thuyết minh | Compact 3-step form, validation, drag/drop, cancel/retry, double-submit guard và cleanup | Sau thành công chỉ về danh sách, không mở trực tiếp project vừa tạo; page dùng font nền tảng cũ. Browser drag/drop/overflow chưa xác minh | Workflow clarity | Trả project ID từ create-upload flow để CTA đi đúng detail/next step nếu contract hiện có cho phép; chỉ polish presentation | P1 |
| Chi tiết dự án | Summary, WorkflowSteps, media metadata, edit/delete và DRAFT resume upload đúng project ID | Form tái dùng class `auth-form`, action tái dùng `voice-actions`, tạo coupling CSS ngoài domain; media enrichment lỗi vẫn có thể giống “chưa có”; DRAFT UI chưa browser tested | Maintainability + data safety | Tạo scope riêng Detail, dùng trạng thái metadata tường minh, giữ upload/API/edit/delete hiện tại | P0/P1 |
| Bản ghi | Protected media player, grouped read-only transcript, precise timestamp, loading/error/retry và confirmation trong service | Deep link chỉ chặn `DRAFT`, chưa dùng `workflow.state/canResume`; workflow blocked/unknown vẫn có thể hiện CTA tạo STT. Layout/type vẫn thuộc visual foundation cũ | Paid-action safety | Thêm route-level workflow gate fail-closed trước CTA; giữ provider/API/transcript grouping và confirmation hiện có | P0 |
| Bản dịch | Legacy comparison và optional GROUPS_V1; language catalog có loading/error/empty; paid preview có confirmation | Legacy/GROUPS_V1 tạo hai hierarchy khác nhau; deep link chưa kiểm tra workflow. GROUPS runtime/persistence và real provider vẫn pending | Safety + consistency | Dùng chung shell/state hierarchy; gate theo workflow; giữ draft/approval semantics và không trình bày mock là dữ liệu thật | P0/P1 |
| Giọng đọc | Catalog thật, filter/search, selected state, preview error, config summary và TTS confirmation | `isLanguageCode` chỉ nhận `vi/en/ja/ko`, có thể chặn `zh/fr` từ catalog thật ở deep link; nút “Tạo giọng đọc” thực chất lưu/gọi TTS cần diễn đạt trạng thái rõ hơn; speed disabled chiếm diện tích lớn | Functional inconsistency | Validation theo catalog/provenance thay vì static list; làm rõ save/generation state, giữ confirmation và Backend contract | P0/P1 |
| Tạo thuyết minh / Processing | Configuration summary, confirmation checkbox, progress/stages, retry và Result CTA | Snapshot/session chủ yếu được dựng client; dòng “trạng thái dự án” dùng `getSimulatedProjectStatus`. Reload recovery và audio terminal phụ thuộc integration UI06.7.2–3 chưa chạy | Misleading runtime state | Chỉ trình bày server-authoritative workflow/job state; không coi progress cục bộ là persisted truth; giữ explicit start/retry | P0 dependency |
| Kết quả | Protected blob playback/download cho audio/video, metadata, empty/error/loading states | Static language guard có cùng lỗi catalog; empty Result luôn gợi ý `/generate` mà chưa xét workflow blocked/unknown; loading/error presentation chưa đồng bộ workspace | Navigation safety | Gate CTA theo workflow summary, giữ protected media; chuẩn hóa result layout/state hierarchy | P0/P1 |
| Lịch sử | Filter tên/thời gian/status, semantic table, pagination, empty/no-result và dev-only fixture banner | Tải toàn bộ server pages rồi enrich từng project; cùng lỗi N+1 và lỗi metadata bị biến thành empty. Client-side filter không scale; visual 1024 chưa xác minh | Data correctness/performance | Chia trạng thái metadata, thiết kế server query/summary ở bước contract riêng; giữ UI/filter đã duyệt | P0/P1 |
| Tài khoản | Một profile card thật, edit display name, validation/loading/error; logout giữ trong profile dropdown | Typography khác Dashboard/Projects; logout failure ở Topbar bị nuốt; browser edit/long email chưa chạy | Feedback + polish | Giữ layout đã duyệt, bổ sung app font/feedback và browser accessibility QA | P1/P2 |
| Login / Register | Hai cột tối giản đã được người dùng duyệt; validation, loading và double-submit guard | Không có regression visual browser trong phiên hiện tại; không nên bị ảnh hưởng bởi việc chuẩn hóa app shell/font | Verification only | Đóng băng presentation; chỉ chạy visual/keyboard regression, không redesign | P2 |
| 404 | Tiếng Việt, card đơn giản, nút quay lại | Chỉ dùng `window.history.back()` nên direct entry có thể không có đường về an toàn; không có link Dashboard/Login theo auth state | Recovery path | Thêm fallback route có chủ đích sau khi xác minh auth behavior; giữ trang tối giản | P1 |

### Vấn đề xuyên suốt và mức ưu tiên

- **P0 — data/workflow safety:** (1) phân biệt enrichment lỗi với dữ liệu thật sự không tồn tại; (2) các workflow deep link phải dùng `workflow.step/state/canResume` trước khi bật mutation/paid action; (3) bỏ static language allow-list tại Voice/Generate/Result khi catalog Backend là nguồn thật; (4) chưa coi workflow DTO/audio terminal là runtime PASS trước DB integration cách ly.
- **P1 — consistency/usability:** Be Vietnam Pro và page hierarchy chưa thống nhất ngoài Dashboard/Projects; page CSS còn coupling (`auth-form`, `voice-actions`); Generate/Result chưa trình bày state server-authoritative sau reload; History/Projects chưa scale vì tải toàn bộ + enrich N+1.
- **P2 — polish/accessibility:** shared `EmptyState`/`ErrorState` dùng ID cố định nên có nguy cơ trùng ID khi một page render nhiều state; `ProgressBar` có fallback aria-label tiếng Anh; `--font-size-xs` được dùng nhưng chưa khai báo trong tokens; PlaceholderPage còn copy tiếng Anh dù hiện không nằm trong router. Đây là cleanup có kiểm soát, không phải lý do redesign màn đã duyệt.

### Kế hoạch UI07.2–UI07.10

| Step | Mục tiêu | File dự kiến | Phần phải giữ nguyên | Tests / dependency |
|---|---|---|---|---|
| UI07.2 | P0 workflow guard cho deep link và catalog language validation | `AppRouter.tsx`, workflow pages, `projectAction.ts`, language/catalog helpers, workflow tests | Route paths, confirmations, API mutations | Exhaustive workflow/deep-link/no-mutation tests; phụ thuộc DTO integration contract UI06.7.2 |
| UI07.3 | P0 data-state integrity cho Projects/Dashboard/History | `projectRepository.ts`, `useCompleteHistory.ts`, list/history/dashboard presentation + tests; Backend summary contract chỉ đề xuất riêng nếu cần | Filter URL, table, chart calculations, ownership | absent/error/unknown, partial failure, request-count tests; cần quyết định Backend batch summary trước implementation |
| UI07.4 | Shared Website foundation và accessibility primitives | `tokens.css`, `global.css`, `components.css`, `PageHeader`, state/progress components, page scopes | Login/Register/Sidebar/Dashboard/Projects presentation đã duyệt | unique IDs, Vietnamese aria labels, font loading/fallback, no cross-page visual regression |
| UI07.5 | Create Project + Project Detail workspace polish | `NewProjectPlaceholder.tsx`, `ProjectDetailPage.tsx`, `upload.css`, `project-detail.css`, upload tests | create/upload/cleanup, DRAFT resume, auth/500 MB/API | create success destination, error/retry/double-submit, 1024/1280/1440 visual |
| UI07.6 | Transcript + Translation consistency | `TranscriptPage.tsx`, `TranslationPage.tsx`, `GroupTranslationWorkspace.tsx`, related CSS/tests | protected media, grouping, GROUPS draft/approve, paid confirmation | legacy/GROUP states, locked workflow, empty/error/retry, no provider call in tests; GROUPS integration still prerequisite |
| UI07.7 | Voice catalog and TTS interaction polish | `VoicePage.tsx`, voice hooks/services, `voice.css`, tests | real voice data, confirmation, saved-config contract | dynamic catalog, long names, empty/error/preview, duplicate-submit, no real TTS |
| UI07.8 | Generate + Result server-state UX | `GeneratePage.tsx`, `ResultPage.tsx`, processing/result hooks/styles/tests | explicit start/retry, protected playback/download | reload/poll/failure/audio-video terminal tests; depends isolated Backend integration UI06.7.2–3 |
| UI07.9 | Auxiliary pages and recovery polish | `HistoryPlaceholder.tsx`, `SettingsPlaceholder.tsx`, `NotFoundPage.tsx`, related CSS/tests | approved History/Account/Auth layouts and real data | logout failure, direct-entry 404, long content, keyboard/contrast; Login/Register visual regression only |
| UI07.10 | Desktop visual/accessibility release gate | all Customer Web routes and existing test suite; docs only unless a verified defect is found | Business logic/API/routes and approved brand | Browser 1024/1280/1440, keyboard/focus, zoom/overflow, axe-equivalent manual checklist, tests/lint/typecheck/build; Mobile/Expo remains deferred |

Thứ tự bắt buộc là UI07.2 → UI07.3 trước khi polish workflow, vì giao diện đẹp không được che trạng thái dữ liệu hoặc quyền thao tác không đáng tin cậy. UI07.4 có thể thực hiện sau khi chốt boundaries, rồi UI07.5–UI07.9; UI07.10 chỉ là release gate sau khi Backend integration cách ly và browser thật sẵn sàng.

## UI06.7.4 — Web workflow navigation and DRAFT resume (2026-10-18)

- Project List, Project Card và Project Detail dùng một resolver route dựa trên `project.workflow`; không còn chọn màn hình từ `ProjectStatus` đơn lẻ. `workflow` thiếu/mâu thuẫn, `UNKNOWN/BLOCKED`, `canResume=false` hoặc target language không có provenance phù hợp đều đưa người dùng về Project Detail với giải thích, không tạo job và không retry.
- Route mapping: `UPLOAD` → Project Detail; `TRANSCRIPT` → Transcript; `TRANSLATION` → Translation; `VOICE` → Voice; `GENERATE` → Generate; `RESULT` → Result. `language` chỉ xuất hiện khi đến từ `JOB | TRANSLATION | NARRATION | RESULT`; các bước Voice/Generate/Result bắt buộc có target được destination hiện tại hỗ trợ.
- Matrix UI thực thi: DRAFT → UPLOAD; UPLOADED/TRANSCRIBING → TRANSCRIPT; TRANSCRIBED/TRANSLATING → TRANSLATION; TRANSLATED → VOICE; GENERATING_AUDIO → VOICE, GENERATE hoặc RESULT theo summary; PROCESSING_VIDEO → GENERATE; COMPLETED → RESULT; FAILED → explicit failure step; evidence mơ hồ → Detail/blocked.
- DRAFT resume nằm trong Project Detail và chỉ hiển thị cho `UPLOAD + READY + canResume`. File picker giữ format/500 MB validation, trạng thái loading/cancel/retry/error/success và focus native; upload dùng existing project ID, field `file`, Bearer/refresh từ API client. Lỗi không DELETE dự án hiện hữu và retry không POST tạo project mới.
- Create Project giữ wrapper create → upload → cleanup đúng project vừa tạo. Upload transport được tách khỏi lifecycle create/cleanup; cache refresh sau thành công là best-effort. Không có mutation khi chỉ mở route; AI actions vẫn cần thao tác/confirmation ở màn hình nghiệp vụ.
- UI UX Pro Max được áp dụng cho fail-closed navigation, deep link ổn định, lỗi có recovery path, disabled/loading rõ và control tối thiểu 44px. Browser responsive/keyboard vẫn cần smoke thực tế; Mobile/Expo deferred.

## UI06.7.3 — Audio-only terminal state (2026-10-18)

- TTS success giờ phân nhánh theo source Media đã xác minh: AUDIO + READY Narration đúng Project + không có active job mâu thuẫn → Project `COMPLETED/100`; VIDEO → giữ `GENERATING_AUDIO/100` cho bước FFmpeg. Progress 100 một mình không bao giờ tạo terminal state.
- Narration READY, TTS job COMPLETED và Project status được ghi trong cùng MongoDB transaction. Transaction đọc lại Project ownership/status, Media và current TTS job; conditional updates dừng khi Project/job đã bị xóa hoặc thay đổi.
- Nếu có job active khác, completion hiện tại giữ `GENERATING_AUDIO`; bước reconciliation transaction chỉ đặt AUDIO thành COMPLETED sau khi không còn job active và đã có READY Narration. Duplicate request dùng đúng Project/Translation/Voice Narration và reconciliation idempotent, không gọi TTS lại.
- Failure update chỉ áp dụng cho TTS job còn PROCESSING và Project còn GENERATING_AUDIO, nên lỗi muộn không ghi đè một Project đã COMPLETED hoặc đổi state. Workflow summary giữ rule AUDIO COMPLETED + READY Narration → RESULT; VIDEO COMPLETED thiếu Result → UNKNOWN/BLOCKED.
- Customer Web/Mobile/Admin không đổi. DB-backed TTS/video integration vẫn pending vì backend `.env` trỏ tới MongoDB SRV development; chỉ pure unit/mock tests được phép chạy trong bước này.

## UI06.7.2 — Backend workflow summary contract (2026-10-18)

- Backend Project List/Detail DTO đã có `workflow` additive theo thiết kế UI06.7.1. Backend trả domain step/state và evidence an toàn; frontend vẫn chịu trách nhiệm ánh xạ route, nên chưa có thay đổi navigation hay UI trong bước này.
- Resolver xử lý đủ 10 ProjectStatus và fail-closed thành `UNKNOWN/BLOCKED` khi media/artifact/job mới nhất không đủ hoặc mâu thuẫn. `FAILED` chỉ resume khi job failed mới nhất xác định được stage và đủ prerequisite; raw provider error không được trả về.
- Ngôn ngữ đích mang provenance `JOB | TRANSLATION | NARRATION | RESULT`; `progress=0` được giữ nguyên. Audio có READY Narration được trình bày là Result artifact qua summary mà không đổi state machine legacy.
- Project List dùng sáu batch reads cố định cho Media, Transcript, Translation, Narration, Result và latest ProcessingJob, không query theo từng row. Existing ownership/RBAC bao quanh Project query trước khi resolver đọc evidence.
- Customer Web chưa tiêu thụ contract trong UI06.7.2. DRAFT reusable upload, route mapping, polling và explicit retry vẫn thuộc bước frontend tiếp theo; không được tự retry chỉ vì mở trang.

## UI06.7.1 — Project workflow contract and navigation design (2026-10-18)

### Evidence and decision

- Design/audit only; application source, routes, API and state machine remain unchanged. UI UX Pro Max guidance applied: deep links must preserve the current workflow state, back paths must be predictable, and an unavailable destination must explain why instead of guessing a route.
- Existing `POST /api/projects/:id/media` is owner-guarded and already changes the project to `UPLOADED`; it can resume a real `DRAFT`. The Web upload service cannot reuse it because it always creates a new project first and deletes that newly-created project on upload failure.
- Failure stage exists in `ProcessingJob.type` (`TRANSCRIPTION`, `TRANSLATION`, `TTS`, `VIDEO_PROCESSING`) with a safe `errorMessage` code, but Customer API exposes no job/workflow summary. `Project.status=FAILED` alone therefore cannot select a correct retry screen.
- TTS completion persists a READY Narration and COMPLETED TTS job but deliberately leaves Project at `GENERATING_AUDIO`. Result Web already treats a READY Narration as an audio artifact, so audio-only projects can safely use `COMPLETED` after TTS; video projects must remain `GENERATING_AUDIO` until explicit FFmpeg processing succeeds.

### Recommended navigation contract

| Project status | Current route | Recommended destination | Required trusted data | Resume | Backend support |
|---|---|---|---|---|---|
| `DRAFT` | Transcript | Project Detail with existing-project upload | owned project; media absent | Yes, after Web upload UI is reusable | Existing upload API is sufficient; workflow summary recommended |
| `UPLOADED` | Transcript | Transcript | readable source media | Yes | No new mutation; summary improves validation |
| `TRANSCRIBING` | Generate | Transcript processing state | active TRANSCRIPTION job | Partially today; robust after reload with polling | Yes |
| `TRANSCRIBED` | Generate | Translation | READY transcript | Yes | Summary recommended, existing read APIs sufficient |
| `TRANSLATING` | Generate | Translation with trusted target language | active TRANSLATION job and target language | Partially today | Yes |
| `TRANSLATED` | Generate | Voice with trusted target language | current approved/READY translation | Yes | Summary recommended |
| `GENERATING_AUDIO` | Generate | Voice while TTS is active; Generate when READY narration exists for video; Result for legacy audio narration | media type, TTS job, READY narration, target language | Ambiguous today | Yes |
| `PROCESSING_VIDEO` | Generate | Generate processing state | active VIDEO_PROCESSING job and narration language | Not reliably after reload today | Yes |
| `COMPLETED` | Result | Result | READY narration for audio or Result for video, with trusted language | Yes | Summary recommended |
| `FAILED` | Generate | Transcript/Translation/Voice/Generate selected from failed job type; Project Detail if unknown | latest failure causally matching current status | No safe resume today | Required |

`projectId` remains a path parameter. `language` is added only when returned from a current ProcessingJob, approved/READY Translation, READY Narration or Result. Missing, conflicting or failed enrichment never produces a language query. Opening a project never starts or retries AI processing.

### Proposed additive Backend contract

Extend the safe Project DTO returned by list/detail with an optional `workflow` object, computed server-side in batches and protected by existing ownership rules:

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

- Backend returns domain `step`, never a frontend URL. Web owns route mapping.
- `failure.code` is an allow-listed safe code, not raw provider output. When Project is `FAILED`, use a failed job only if it is the latest causally consistent job; otherwise return `UNKNOWN/BLOCKED` and do not guess.
- List resolution must batch Media/Translation/Narration/Result/ProcessingJob lookups; adding one workflow request per row would recreate the N+1 problem.
- Polling reads this summary only. Retry remains an explicit, confirmed action on the correct workflow screen.
- No schema change is required for a fail-closed first version. A later `currentJobId/lastFailedJobId` reference would give stronger causal guarantees but is not part of the minimal proposal.

### Audio-only terminal rule

- During TTS: `GENERATING_AUDIO`, ProcessingJob `TTS/PROCESSING`.
- TTS success with AUDIO source: transaction stores READY Narration, completes job and sets Project `COMPLETED/100`. Result page reads the protected Narration; no fake video Result is created.
- TTS success with VIDEO source: Project remains `GENERATING_AUDIO/100`; the user explicitly starts video composition, then `PROCESSING_VIDEO` → `COMPLETED` only after a valid Result is stored.
- TTS failure remains `FAILED`; workflow summary points back to Voice using the failed TTS job and trusted target language.

### Options

- **A — Frontend-only:** route DRAFT to Project Detail; split existing upload transport so it can upload to an existing ID; map linear statuses; send FAILED/ambiguous processing states to Project Detail. Low complexity and low API risk, but partial correctness, no reliable active-job recovery, no failure-stage recovery, and audio status remains inconsistent.
- **B — Frontend + minimal Backend contract (recommended):** add the workflow summary, batch resolution and audio terminal rule; Web uses one fail-closed resolver. Medium complexity/regression risk, but correct FAILED routing, trusted language provenance and reliable reload recovery.

### Expected implementation and regression scope

- Web: `projectAction.ts`, project types/repository, `ProjectsPlaceholder.tsx`, `ProjectDetailPage.tsx`, reusable upload UI/`uploadService.ts`, and processing pages/hooks that consume/poll workflow summary.
- Backend: project serializer/service/controller contract, a workflow-summary service using ProcessingJob and artifact models, `narration.service.ts`, and related route/service tests. Existing route paths can remain unchanged.
- Tests: exhaustive 10-status resolver matrix; missing/conflicting workflow fail-closed; DRAFT upload uses the existing ID and never creates/deletes another project; FAILED mapping for all four job types plus unknown; target-language provenance; no navigation-triggered mutation; active-job reload/poll; audio TTS → COMPLETED; video TTS → GENERATING_AUDIO → PROCESSING_VIDEO → COMPLETED; ownership/IDOR; legacy Project DTO compatibility; list query-count guard preventing N+1.
- Mobile/Admin remain deferred and unchanged. Before implementation, approve Option B, the audio terminal rule, Project Detail as the DRAFT upload host, and whether the minimal no-schema failure correlation is sufficient.

## UI06.7 — My Projects navigation and data-safety audit (2026-10-18)

- Audit-only: không sửa navigation, data fetching, Backend/API/Database hoặc giao diện. Không tìm thấy bằng chứng source/test/docs cho UI06.5 hoặc UI06.6; trạng thái hai bước này chưa được xác nhận.
- Mapping hiện tại của `projectAction` chỉ có ba nhánh: `DRAFT`/`UPLOADED` → Transcript, `COMPLETED` → Result, tám trạng thái còn lại → Generate. Đối chiếu màn hình đích cho thấy `TRANSCRIBING` phải quay lại Transcript; `TRANSCRIBED`/`TRANSLATING` phải vào Translation; `TRANSLATED` phải vào Voice. `FAILED` không mang thông tin bước lỗi nên không thể điều hướng retry an toàn chỉ từ `ProjectStatus`. `DRAFT` vào Transcript nhưng màn hình chỉ báo phải upload trước và không có route tiếp tục upload dự án hiện hữu.
- `GENERATING_AUDIO`/`PROCESSING_VIDEO` vào Generate là đúng hướng ở mức route, nhưng trạng thái xử lý không được khôi phục từ customer job API khi reload. Đặc biệt audio TTS kết thúc vẫn giữ project ở `GENERATING_AUDIO`; frontend chỉ đánh dấu session cục bộ hoàn tất, nên danh sách không có trạng thái terminal đáng tin cậy cho audio.
- `/projects` dùng `useCompleteHistory`: tải tuần tự tất cả trang server với `limit=100`, sau đó lọc/sort/phân trang 10 dòng ở client. Mỗi project được enrich bằng hai HTTP request riêng (media và translations). Ước tính HTTP request là `ceil(N/100) + 2N`: 21 request cho 10 project, 201 cho 100 và 2.010 cho 1.000; đây là ước tính theo source, không phải số đo runtime.
- Enrichment dùng `Promise.allSettled` rồi biến mọi lỗi media thành `media=null` và mọi lỗi translation thành danh sách rỗng. UI vì vậy có thể hiển thị `Chưa có tệp`/`Chưa dịch` cho cả 404 hợp lệ, 401/403, lỗi mạng hoặc lỗi server. Cần mô hình trạng thái `loading/absent/error/unknown` tách biệt trước khi coi dữ liệu là rỗng.
- Backend có server-side pagination/search/status và ownership guard theo user đã xác thực. Tuy nhiên offset pagination sắp xếp chỉ theo `createdAt` và không có snapshot/tie-break `_id`; dữ liệu tạo đồng thời giữa các page có thể làm thiếu/trùng, còn dedupe client chỉ loại trùng chứ không khôi phục bản ghi bị bỏ sót.
- URL `q/status/period/sort/from/to/page` hỗ trợ reload và Back/Forward đồng bộ draft. Submit luôn reset page 1. Giá trị URL không hợp lệ được fallback nhưng không canonicalize; custom date không hợp lệ nhập trực tiếp qua URL có thể trở thành tập rỗng mà không hiện lỗi; page vượt biên được clamp trong UI nhưng URL vẫn giữ số sai. Filter/pagination dùng `replace`, nên lịch sử browser không lưu từng lần thay đổi.
- Security source review: route web có `RequireAuth`; API gửi Bearer token và refresh-once, không đưa token vào URL. Backend project routes yêu cầu CUSTOMER, truy vấn theo `userId` hoặc `requireProjectOwner`, trả 404 chung cho ID không thuộc user. UI guard không thay thế authorization server. Không thấy logging token/credentials trong luồng được audit.
- Ưu tiên đề xuất: P0 sửa workflow resolver theo bước thực và trạng thái lỗi, tách lỗi enrichment khỏi dữ liệu vắng mặt, xác định terminal state cho audio. P1 bổ sung list-summary/batch metadata và server filter/sort/date hoặc endpoint query phù hợp, stable pagination, customer processing status, canonical URL/error handling. P2 giữ target language tường minh khi có nhiều bản dịch, bảo toàn progress `0`, và thêm matrix/request-count/history regression tests.
- Validation: Web tests `153/153`, lint, typecheck, production build và `git diff --check` PASS; lần test sandbox đầu tiên không chạy case nào do `spawn EPERM`, chạy lại đúng suite ngoài worker sandbox PASS. Browser desktop không chạy vì không có Backend/Web server đang lắng nghe; Mobile/Expo deferred.

## UI06.4 — Professional Project Table Redesign (2026-10-17)

- Bảng `/projects` tiếp tục dùng semantic `<table>` với `caption`, `thead`, `tbody`, `th scope="col"` và `th scope="row"`; thêm `colgroup` để giữ đủ sáu cột theo tỷ lệ ổn định: Tên dự án `30%`, Phương tiện `13%`, Ngôn ngữ `19%`, Ngày tạo `14%`, Trạng thái `14%`, Thao tác `10%`.
- Typography giữ Be Vietnam Pro; header `13px`, nội dung `14px`, hàng cao `68px`, padding `12px 14px`, nền header xám nhạt, border dọc/ngang mảnh và hover/focus-within tím rất nhẹ. Status badge chỉ được chuẩn hóa trong `.projects-page .project-list-status`, không đổi mapping 10 trạng thái hoặc shared badge.
- Tên dự án giữ nguyên Unicode và tối đa hai dòng, có `title` đầy đủ; accessible name bổ sung ngày tạo, trạng thái và project ID để phân biệt tên trùng. Link chi tiết và route workflow không đổi.
- Phương tiện chỉ hiển thị icon `video` hoặc `wave` khi `mediaType` lần lượt là `VIDEO`/`AUDIO`; dữ liệu thiếu tiếp tục hiển thị `Chưa có tệp`, không suy đoán. Ngôn ngữ tiếp tục dùng `projectListLanguagePair` với dữ liệu nguồn/đích thật và fallback hiện có.
- Cột thao tác giữ nhãn trung tính `Tiếp tục` và route từ `projectAction().step`. Chưa dùng trực tiếp nhãn động vì `FAILED → Thử xử lý lại` hiện chỉ là điều hướng tới `/generate`, không tự thực hiện retry; cần đối chiếu nhãn–hành vi riêng ở UI06.7.
- Responsive: bảng có `min-width: 920px` và chỉ cuộn ngang trong region `project-list-table-scroll`; page không bị tràn. Region, project link và action link có focus-visible; hover motion tắt dưới `prefers-reduced-motion`.
- Validation: Web tests `153/153`, lint, typecheck, production build và `git diff --check` PASS. Browser visual/keyboard tại 320/375/768/1024/1440 **NOT RUN**.

## UI06.3 — My Projects compact filter toolbar (2026-10-17)

- Bộ lọc `/projects` dùng progressive disclosure trong scope `.projects-page`: hàng chính gồm ô tìm kiếm tên dự án, nút `Bộ lọc` có icon/chevron và nút Primary `Tìm kiếm`; Thời gian, Trạng thái, Sắp xếp, khoảng ngày tùy chọn và `Đặt lại` nằm trong panel nâng cao mặc định đóng.
- Giữ nguyên cơ chế draft → submit. Mở/đóng panel không gọi filter, không đổi URL và không xóa lựa chọn; submit hợp lệ vẫn ghi `q/status/period/sort/from/to/page`, đặt `page=1`, rồi thu panel. `Đặt lại` chỉ đưa draft về mặc định và có hướng dẫn phải nhấn `Tìm kiếm` để áp dụng. Validation khoảng ngày giữ nguyên, hiển thị `role="alert"` và tự mở panel để người dùng sửa.
- Trạng thái áp dụng lấy từ URL/applied state, không lấy từ draft: nút hiển thị badge số bộ lọc nâng cao đang thực sự áp dụng. Search tiếng Việt không dấu, phép kết hợp AND, đủ 10 `ProjectStatus`, sort/period và toàn bộ dữ liệu/route hiện có không đổi.
- Accessibility: disclosure là native button với `aria-expanded`/`aria-controls`; panel đóng có `aria-hidden` + `inert` nên control không lọt vào Tab order; focus-visible rõ và icon trang trí không lặp screen-reader text. Chuyển động nhẹ của panel/chevron tắt dưới `prefers-reduced-motion`.
- Responsive: desktop giữ Search/Bộ lọc/Tìm kiếm cùng hàng; tại `<=700px`, search chiếm toàn hàng và hai nút chia hai cột, advanced controls xếp dọc; input/select dùng 16px trên màn hình hẹp để tránh browser zoom. Tại `<=420px`, badge rút gọn còn số đếm; bảng và pagination không thay đổi trong UI06.3.
- Source validation **PASS**: Web tests `147/147`, lint, typecheck, production build và `git diff --check` PASS. Build còn warning dynamic/static import `projectRepository.ts` có sẵn. Browser visual/keyboard tại 320/375/768/1024/1440 **NOT RUN**.

## UI06.2 — My Projects design foundation (2026-10-17)

- Trang `/projects` có wrapper `.projects-page` riêng để giới hạn typography, spacing, card, bảng và responsive; không đổi form, URL query parameters, filter/sort, phân trang, dữ liệu hay điều hướng hiện có. Các selector mới đều nằm dưới scope trang hoặc route-specific Topbar, tránh lan sang Dashboard và các màn hình Customer Web khác.
- Tái sử dụng Be Vietnam Pro đã self-host từ UI02, không nhân bản `@font-face`, asset hoặc dependency. Thang chữ cục bộ: page title `26–28px`, section title `19px`, body `15px`, table/control `14px`, label/secondary `13px`; màu Navy/Purple và token nền sáng giữ nguyên.
- Card danh sách dùng radius `16px` (`14px` ở màn hình rất hẹp), border token và shadow nhẹ. Khoảng cách nội bộ được chuẩn hóa theo `12/16/24/32px`; filter, table và pagination giữ nguyên cấu trúc chức năng của UI06.1.
- Responsive: page/panel có `min-width: 0`; bảng `min-width: 800px` cuộn ngang trong vùng riêng có accessible label/focus, không làm tràn toàn trang. Filter chuyển một cột tại `<=700px`; custom dates, nút tìm kiếm, demo notice và pagination co giãn theo content area.
- Source validation **PASS**: Web tests `142/142`, lint, typecheck, production build và `git diff --check`. Build còn cảnh báo dynamic/static import `projectRepository.ts` đã có sẵn, không liên quan UI06.2. Browser visual 320/375/768/1024/1440 **NOT RUN**; chưa coi responsive visual là PASS.

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
## UI07.6.6.2 — Transcript edit API foundation

Backend đã có API chỉnh sửa một phân đoạn với ownership, optimistic concurrency và transaction. Customer Web chưa được sửa trong bước này: chưa có nút/textarea chỉnh sửa. Khi UI được triển khai sau, client phải gửi revision đang hiển thị, xử lý `409 TRANSCRIPT_REVISION_CONFLICT` bằng yêu cầu tải lại và không tự chạy lại Translation/TTS/Video. Response cho biết downstream cần được xác minh lại nhưng giữ nguyên artifact cũ.

## UI07.6.6.3 — Workflow stale safety

Không thay đổi Customer Web. Contract workflow hiện chỉ xem CURRENT artifact là bằng chứng hoàn thành; ProjectStatus cũ không tự mở khóa bước khi provenance đã stale. API chi tiết/file của Narration và Result trả lỗi provenance rõ ràng thay vì phát artifact STALE/UNKNOWN. API list loại artifact không CURRENT; Translation list tiếp tục cung cấp `provenanceState`. WorkflowRouteGuard/Web navigation đã được audit và vẫn fail-closed khi Backend trả `UNKNOWN/BLOCKED`.
## UI07.6.6.4 — Manual Transcript Segment Editor (2026-10-19)

- Customer Web đã có editor theo từng `TranscriptSegment` nguồn: số thứ tự/timestamp chỉ đọc, textarea tối đa 4000 ký tự, bộ đếm, Lưu/Hủy, focus khi mở và trả focus khi đóng. Chỉ một editor được mở tại một thời điểm; lưu có synchronous lock chống double-submit và giữ draft khi request lỗi.
- Editor gọi đúng `PATCH /api/projects/:id/transcript/segments/:segmentId` với `expectedRevision`, cập nhật response tại chỗ rồi refetch Transcript và Project workflow. Conflict `TRANSCRIPT_REVISION_CONFLICT` giữ nội dung đang nhập và cung cấp thao tác tải lại; không tự retry hay gọi AI.
- Vì MongoDB replica-set transaction integration còn PENDING, runtime gate `VITE_TRANSCRIPT_SEGMENT_EDIT_ENABLED` chỉ hoạt động trong Vite development và mặc định `false`. Khi gate tắt, UI tiếp tục dùng grouped read-only presentation hiện tại và tuyệt đối không gửi PATCH.
- Khi gate bật, trang hiển thị các segment nguồn thay vì cụm presentation để không bao giờ ghi text của một cụm vào một segment đơn. Quyền chỉnh sửa fail-closed khi thiếu revision/backend segment ID, workflow UNKNOWN/BLOCKED/PROCESSING/FAILED hoặc chưa qua bước transcript.
- Thông báo downstream chỉ xuất hiện khi workflow trước mutation xác nhận đã đi đến Voice/Generate/Result hoặc có artifact narration/result; response `requiresRevalidation` đơn lẻ không được dùng để suy đoán có artifact.
- Browser Desktop: NOT RUN. Việc bật gate và PATCH thật phải chờ MongoDB replica-set integration trên database test cách ly.

## UI07.6.7 — Translation Desktop UI Polish (2026-10-19)

- Page Header chỉ giữ tiêu đề “Bản dịch” và hành động quay lại; project context dùng nhãn “DỰ ÁN”, tên thật và badge trạng thái Backend. Trạng thái editor vẫn hiển thị riêng để không làm mất phản hồi tải/dịch/lưu.
- Card chọn ngôn ngữ được thu gọn thành ba vùng: ngôn ngữ nguồn, catalog ngôn ngữ đích và nút Dịch. Catalog/API, workflow guard và provenance giữ nguyên; loading/error/empty của catalog vẫn được thông báo rõ ràng.
- Đã loại bỏ các helper text và dòng thống kê cụm/phân đoạn dư thừa theo UI07.6.7. So sánh Bản gốc/Bản dịch vẫn dùng timestamp chính xác, hai cột desktop, wrapping an toàn và chuyển một cột ở màn hình hẹp.
- GROUPS_V1 dùng cùng Page Header, project context và language card compact; lifecycle preview/approve không thay đổi.
- Browser Desktop 1024/1280/1440: NOT RUN; không kết luận visual PASS khi chưa đo trong trình duyệt thực tế.

## UI07.7.1 — Voice UI Audit & Safe Design Preview (2026-10-19)

### Audit hiện trạng

- Route thật `/projects/:projectId/voice` gọi `resolveWorkflowRouteAccess` trước khi mount `useVoiceEditor`; workflow UNKNOWN/BLOCKED tiếp tục fail-closed về recovery, không tải catalog, không tạo narration và không bị preview bypass.
- Header “Giọng đọc và thuyết minh” cùng subtitle dài chưa đồng nhất thuật ngữ ngắn “Giọng đọc” ở stepper. Project context mới chỉ có tên + trạng thái editor, chưa có eyebrow “DỰ ÁN” hoặc badge ProjectStatus thật.
- Summary đang lặp số cụm/ký tự và trích đoạn bản dịch, làm card cao. Toolbar ép tiêu đề chiếm cả hàng; filter/search và card giọng đọc cần được gom compact hơn ở bước polish thực tế.
- `voiceService.previewVoice` chủ động từ chối phát cả khi có `previewUrl` vì chưa xác minh cơ chế authenticated media; vì vậy Audio Preview hiện chỉ có unavailable/error state, chưa thể coi là hoàn thiện.
- Speed range bị disabled vì Backend chỉ hỗ trợ 1.0x nhưng vẫn chiếm một card lớn. Các helper có thể cân nhắc bỏ/gộp: subtitle PageHeader, thống kê cụm/ký tự, trích đoạn dài, “Máy chủ hiện hỗ trợ tốc độ đọc cố định 1.0x.” và “Tạo giọng đọc sẽ gọi dịch vụ TTS sau khi bạn xác nhận.”; vẫn phải giữ confirmation và lỗi thật.
- Grid 3 cột chuyển 2 cột dưới 1100px và 1 cột dưới 650px; không có min-width gây tràn rõ ràng trong source. Browser 1024/1280/1440 chưa được đo thực tế.

### Design Preview an toàn

- Route `/design-preview/voice` chỉ tồn tại khi đồng thời là Vite development và `VITE_VOICE_DESIGN_PREVIEW_ENABLED=true`; mặc định OFF và vẫn nằm sau `RequireAuth` + `AppShell`. Không có link trong Sidebar và route không tồn tại ở production.
- Preview không mount `useVoiceEditor`, không import/call service, không gọi Voice/TTS/AI API và không có control mutation khả dụng. Stepper nhận workflow không xác định nên mọi bước fail-closed; route workflow thật không thay đổi.
- Mọi voice/project nội dung minh họa được gắn banner `DESIGN PREVIEW`; toàn bộ filter, search, chọn/nghe thử và CTA đều disabled. Preview chỉ đánh giá hierarchy, card density, wrapping và responsive; không xác minh dữ liệu, ownership, audio playback hay workflow thật.

## UI07.7.1.2 — Smart Project Resume Navigation (2026-10-19)

- Hành động tại bảng Dự án gần đây trên Dashboard tải lại Project Detail DTO trước khi điều hướng, sau đó tái sử dụng duy nhất `projectAction`/`WorkflowRouteGuard`; không suy luận bước từ `ProjectStatus` hoặc tạo bộ mapping độc lập.
- Workflow có `canResume=true` và route hợp lệ mở trực tiếp bước `UPLOAD`, `TRANSCRIPT`, `TRANSLATION`, `VOICE`, `GENERATE` hoặc `RESULT`. Ngôn ngữ đích chỉ được đưa vào URL khi helper hiện có xác minh provenance tin cậy.
- Workflow thiếu, `UNKNOWN`, `BLOCKED`, không thể resume, response không khớp hoặc request lỗi đều fail-closed về Project Detail. Trang chi tiết hiển thị thông báo phục hồi cục bộ; route và link tên dự án tới Project Detail vẫn được giữ nguyên.
- Nút dùng loading/disabled state và synchronous lock chống double-click. Việc mở dự án không gọi mutation, không retry job và lớp deep-link guard vẫn là kiểm tra cuối cùng.

## UI07.7.1.3 — Smart Resume Infinite Loading Fix (2026-10-19)

- Root cause là lifecycle guard không tương thích React StrictMode: cleanup thử nghiệm đặt `mountedRef=false`, setup kế tiếp không khôi phục `true`, nên response thành công bị bỏ qua trước `navigate` và loading không được reset. Effect nay đặt lại ref ở mỗi setup và chỉ abort request trong cleanup thực tế.
- Dashboard resume chỉ gọi Project Detail DTO để lấy workflow; không còn chờ enrichment Media/Translation không cần thiết. Thao tác có timeout 8 giây, truyền AbortSignal xuống transport và luôn giải phóng loading/lock trong `finally`.
- Refresh-token request có timeout 15 giây và fail-closed bằng cách xóa session khi refresh thất bại; không còn shared refresh promise pending vô hạn.
- Timeout/reject/workflow không tin cậy vẫn mở Project Detail cùng thông báo phục hồi. Chỉ khi bản thân `navigate` thất bại và trang không đổi, lỗi ngắn xuất hiện ngay tại action để người dùng thử lại.

## UI07.7.1.4 — Dashboard Action Column Alignment (2026-10-19)

- Cột Dự án gần đây được cân lại theo năm track với cột Thao tác tối thiểu 112px; các cột Cập nhật/Ngôn ngữ/Trạng thái co giãn nhẹ để giữ bảng trong content area Desktop.
- Action cell và header cột cuối căn giữa, row có min-height 68px và nội dung căn giữa theo chiều dọc. Nút có chiều rộng ổn định 7rem nên đổi giữa “Tiếp tục”, “Xem chi tiết” và spinner + “Đang mở” không làm xê dịch cột.
- `white-space: nowrap` chỉ áp dụng cho action button và các span trực tiếp bên trong; tên dự án/badge vẫn được wrap an toàn. Container bảng giữ `max-width: 100%` và overflow cục bộ cho viewport hẹp, không che nội dung hoặc gây tràn toàn trang.

## UI07.7.1.5 — Unified Dashboard Continue Action (2026-10-19)

- Mọi hàng trong bảng “Dự án gần đây” dùng duy nhất nhãn hành động “Tiếp tục”; trạng thái loading vẫn hiển thị spinner cùng “Đang mở” trên một dòng.
- Nhãn được thống nhất chỉ ở lớp trình bày. Smart Resume vẫn tải Project DTO mới nhất, dùng `projectAction` và chỉ mở bước workflow khi `canResume=true` cùng dữ liệu đáng tin cậy.
- Workflow UNKNOWN/BLOCKED/thiếu dữ liệu hoặc lỗi API tiếp tục fail-closed về Project Detail kèm thông báo an toàn. Link tên dự án vẫn luôn mở Project Detail.
- Kích thước và căn chỉnh cột Thao tác từ UI07.7.1.4 được giữ nguyên, không thay đổi layout Dashboard hoặc WorkflowRouteGuard.

## MUSEUM-02 — Museum Design System Foundation (2026-10-19)

- Customer Web có namespace `.museum-theme` độc lập cho hướng giao diện Bảo tàng Chứng tích Chiến tranh. Theme dùng nền kem `#F3EBDD`, surface `#FFFDF8`, đỏ trầm `#7A292E`, than `#242321`, vàng đồng `#B08A52`, border `#D8CCB8` và muted text `#625D55`.
- Token Museum bao phủ typography Be Vietnam Pro, thang spacing 4/8px, radius, shadow, content/readable/wide containers, breakpoint tham chiếu 375/768/1024/1280/1440, focus ring và motion. Các alias token Customer chỉ được remap bên trong `.museum-theme`; `:root`, Dashboard, Projects, Workflow, Auth, Admin và Mobile không thay đổi.
- Primitive dùng lại `Button`, `Card` và `Badge` qua `MuseumButton`, `MuseumCard`, `MuseumBadge`; `MuseumContainer` và `MuseumSectionHeading` bổ sung bố cục public page. Section heading dùng ID tạo bởi React cho quan hệ title/description và hỗ trợ h1/h2/h3.
- Chưa route nào mount `.museum-theme` trong MUSEUM-02. Theme chỉ là foundation cho Public Museum shell ở MUSEUM-03; không có thay đổi route, API, dữ liệu hoặc nghiệp vụ.

## MUSEUM-03 — Public Museum Layout & Routing (2026-10-19)

- `PublicMuseumLayout` mount `.museum-theme` riêng, dùng MuseumContainer, MuseumButton và MuseumCard từ MUSEUM-02. Có semantic header/nav/main/footer, skip link và focus main khi đổi trang public.
- Public routes: `/`, `/kham-pha`, `/thuyet-minh`, `/ve-bao-tang`. React Router nhận cả `/kham-pha/` và `/thuyet-minh/`. Root không còn redirect tới Dashboard. Các trang là placeholder công khai ghi rõ nội dung đang chuẩn bị; URL không khớp hiển thị 404 trong Museum layout.
- Header dùng brand chữ BẢO TÀNG CHỨNG TÍCH CHIẾN TRANH, bốn liên kết với active state, Đăng nhập hoặc Không gian biên tập theo session hiện có. Kiểm tra session chỉ quyết định link hiển thị; RequireAuth và Backend vẫn quyết định quyền truy cập.
- Bộ chọn ngôn ngữ chỉ là shell disabled, hiện Tiếng Việt và thông báo giới hạn giao diện. Các mã dự kiến `en`, `th`, `ko`, `zh-CN` chưa khả dụng; không bật i18n hoặc tuyên bố có bản dịch/giọng đọc.
- Dưới 1280px chuyển sang menu dialog native: focus containment, Escape, nút đóng, trả focus, body scroll lock và cleanup. Menu đóng khi điều hướng hoặc chuyển sang desktop. Controls tối thiểu 44px; giữ focus/reduced-motion tokens của Museum.
- Routes Customer, Auth, WorkflowRouteGuard và protected media không thay đổi. Public components không tải Project/Result, không gọi mutation và không public hóa endpoint/Blob URL.
- Validation source/regression: 227/227 Web tests PASS; lint, typecheck, production build và diff-check PASS. Browser tại 375/768/1024/1280/1440: NOT RUN vì không có browser khả dụng; keyboard/focus/overflow thực tế còn cần visual QA.

## MUSEUM-04 — War Remnants Museum Homepage (2026-10-19)

- `/` dùng `MuseumHomePage` trong PublicMuseumLayout. Sáu section: Hero, Giới thiệu, Không gian trưng bày, Thuyết minh đa ngôn ngữ, Video nổi bật và CTA cuối trang. Giữ Museum tokens, Be Vietnam Pro và CSS scope `.museum-theme .museum-home…`.
- Hero dùng nền than đậm, chữ kem, CTA Khám phá/Thuyết minh và visual typography trừu tượng có caption “Hình ảnh bảo tàng đang được chuẩn bị”. Không có ảnh/video bảo tàng hợp lệ trong repository, không tải ảnh ngoài hay mô phỏng tư liệu lịch sử.
- Giới thiệu không có số liệu lịch sử. Ba card nội dung là chủ đề biên tập dự kiến được ghi rõ đang chuẩn bị, không phải danh mục hiện vật/trưng bày đã xác minh. Bốn ngôn ngữ `en/th/ko/zh-CN` được trình bày thành danh sách dự kiến, nguồn `vi`; chưa có thao tác dịch, TTS hoặc phát video.
- Video giữ tỷ lệ 16:9 với “Video đang được chuẩn bị” và link `/thuyet-minh`, không dùng Project/Result API hoặc Blob URL. CTA vào Không gian biên tập chỉ hiện khi có session; authorization tiếp tục do RequireAuth/Backend kiểm tra.
- Responsive: hero/intro/video chuyển một cột dưới 768px; nhóm ngôn ngữ 4/2/1 cột; text dài wrap và CTA xếp dọc trên màn hình hẹp. Focus trên hero dùng màu sáng, link tối thiểu 44px, visual có tỷ lệ dành chỗ trước, giảm motion kế thừa Museum theme.
- Asset cần bổ sung: ảnh thật bảo tàng cho hero; ảnh giới thiệu và ảnh đại diện chủ đề đã duyệt kèm quyền sử dụng/caption; video public và poster hợp lệ. Chỉ công bố phiên bản ngôn ngữ nào đã có nội dung thực và được duyệt. Hình minh họa chọn trước không có trong context hiện tại nên chưa thể đối chiếu bố cục theo ảnh.
- Browser 375/768/1024/1280/1440: NOT RUN vì không có browser khả dụng; responsive/contrast/focus mới được review ở mức source và test render.
- Validation: Web tests **232/232 PASS**; lint, typecheck, production build và `git diff --check` PASS. Build giữ cảnh báo chunking có sẵn của `projectRepository.ts`.

## MUSEUM-05 — Museum Explore & Exhibition Pages (2026-10-19)

- `/kham-pha` và `/kham-pha/` dùng MuseumExplorePage trong PublicMuseumLayout. Hero có breadcrumb, tiêu đề Khám phá bảo tàng, giới thiệu editorial hai cột và vùng Các chuyên đề. Không có catalog được xác minh trong repository, nên runtime hiển thị “Chuyên đề đang được chuẩn bị”, không dùng ba chủ đề dự kiến của homepage như chuyên đề thật.
- Thêm `/kham-pha/:slug` với MuseumExhibitionPage: breadcrumb, title/summary, nội dung theo section, ảnh/caption/credit hoặc placeholder, nguồn tham chiếu, quay lại Khám phá và CTA `/thuyet-minh`. Slug không công bố/không hợp lệ hiển thị Not Found trong Museum layout. Đây là fallback giao diện SPA, không thay đổi HTTP server routing.
- `features/museum/exhibitions.ts` định nghĩa MuseumExhibition typed với slug, title, summary, sections, nguồn và ngày xác minh, trạng thái draft/ready, ảnh tùy chọn. Catalog thực tế là mảng rỗng. Chỉ render entry ready có nguồn/nội dung đầy đủ và slug duy nhất; trạng thái ready là quyết định biên tập website, không chứng minh bảo tàng đã phê duyệt. Việc xác minh nội dung vẫn phải do người biên tập thực hiện trước khi đưa vào catalog.
- Ảnh chỉ nhận đường dẫn local `/museum-media/...` có alt/caption/credit; chặn external URL, traversal, protected API và Blob URL. Quy tắc đường dẫn không chứng minh quyền sử dụng: chỉ thêm file đã kiểm tra nguồn/quyền vào `frontend-web/public/museum-media/` khi có asset được duyệt. Bước này không thêm ảnh hay tạo thư mục chứa media giả.
- Asset/nội dung cần cung cấp: tên và mô tả chuyên đề chính xác, nội dung từng mục và nguồn tham chiếu, quyết định cho phép công bố; ảnh tổng quan/chuyên đề thật kèm alt, chú thích, tác giả/quyền sử dụng. Nội dung minh họa chỉ có trong test fixtures, không đi vào ứng dụng.
- CSS scope `.museum-theme .museum-explore…`: card grid 3/2/1 cột, intro/empty state chuyển một cột dưới 768px; breadcrumb và CTA wrap, focus kế thừa Museum theme, control tối thiểu 44px, hình có kích thước dành chỗ trước. Không đổi homepage, auth/workflow guards hay Customer routes.
- Browser 375/768/1024/1280/1440: NOT RUN, không có browser khả dụng. Detail với nội dung thực còn chờ catalog/asset được cung cấp; render chỉ kiểm thử bằng fixture được ghi rõ nội bộ.
- Validation: Web tests **237/237 PASS**; lint, typecheck, production build và `git diff --check` PASS. Build còn cảnh báo chunking có sẵn của `projectRepository.ts`.

## MUSEUM-05.2 — Real UI Polish (2026-10-19)

- Header thu từ min-height 100px xuống 80px, mobile 72px; select rộng 124px để tránh intrinsic width của tên ngôn ngữ dài chiếm quá nhiều chỗ. Bỏ helper “Hiện hỗ trợ giao diện tiếng Việt” và aria-describedby tương ứng; giữ label liên kết qua htmlFor ở dạng visually-hidden, select vẫn disabled và menu mobile giữ cơ chế dialog/focus/Escape/scroll lock.
- Hero giảm cỡ chữ tối đa 72px → 60px, line-height 1.22, padding tối đa 64px, khoảng cách hai cột tối đa 56px; visual typography giới hạn 430px và không thêm ảnh.
- Ba card editorial giữ nguyên nội dung/trạng thái dự kiến, bố cục ba cột desktop và một cột dưới 768px. Cải thiện padding, border vàng đồng, khoảng cách nhãn/số/tiêu đề và hover nhẹ. Không thêm tabindex hoặc hành vi giả cho card chưa có chuyên đề thật.
- Language cards giữ đủ English/Thai/Korean/Simplified Chinese với trạng thái chuẩn bị, trình bày code như nhãn nhỏ; không bật chức năng. Video placeholder 16:9 chuyển nền than đậm với icon trang trí, không có nút phát giả hoặc media URL.
- CTA cuối dùng grid cân đối và xếp dọc trên mobile. Footer nền than, đường nhấn vàng đồng, brand hai dòng và link công khai; không thêm liên hệ chưa xác minh. Focus ring sáng trên hero/footer tối.
- Tính contrast theo token: chữ kem trên nền than 15.45:1, chữ border trên nền than 9.91:1, muted trên surface-muted 5.10:1, primary trên surface 9.46:1. Các cặp chữ này đạt WCAG AA; không thay thế audit accessibility trên browser.
- Web tests **238/238 PASS**; lint, typecheck, production build và `git diff --check` PASS. Browser 375/768/1024/1280/1440: **NOT RUN**, inventory không có browser; ba ảnh tham khảo không có trong context hiện tại nên chưa đối chiếu bằng ảnh. Giữ breakpoint/responsive source, chưa xác nhận overflow thực tế. Vẫn cần ảnh/video bảo tàng thật có quyền sử dụng.

### Bổ sung MUSEUM-05.2 — Explore Page UI Polish

- Trang listing có modifier `.museum-explore--listing` để thu gọn hero riêng: padding 16/32px, breadcrumb margin dưới 16px, h1 tối đa 36px. Breadcrumb vẫn là nav với Trang chủ → Khám phá và chỉ một h1; không thêm tiêu đề trùng.
- Phần giới thiệu giữ hai cột cân đối, gap tối đa 48px, padding tối đa 48px, h2 tối đa 32px và body line-height 1.75. Đường nhấn vàng đồng ở cạnh heading tạo nhịp editorial; không thêm ảnh, số liệu hoặc nội dung lịch sử mới.
- Empty state giảm vùng trang trí xuống 156px desktop/112px mobile, border nhấn nhẹ và spacing ngắn hơn. Catalog vẫn rỗng, không tạo slug/chuyên đề. Trên màn hình dưới 768px intro/empty state vẫn xếp một cột.
- Header 80px/mobile 72px, language selector disabled, MuseumContainer và footer dùng chung với homepage từ MUSEUM-05.2; không sửa shared shell hoặc trang chi tiết trong phần bổ sung này.
- Web tests **238/238 PASS**; lint, typecheck, build và `git diff --check` PASS. Browser desktop/mobile **NOT RUN**, không có browser khả dụng và chưa có ảnh chụp tham khảo trong context; chưa xác nhận overflow thực tế.

### Bổ sung MUSEUM-05.2 — Final Homepage Polish

- Ba card editorial giữ nguyên nội dung dự kiến và nhãn chuẩn bị; số thứ tự dùng tabular numerals 32px, có divider tách phần đầu, tiêu đề 18–20px và body line-height 1.75. Hover chỉ đổi border/shadow; card vẫn không có link slug hoặc thao tác giả.
- Language cards hiển thị tên tiếng Việt ở h3, tên tiếng Anh bên dưới với lang=en, mã en/th/ko/zh-CN giữ đúng cách viết và trạng thái chuẩn bị. Giữ nguồn vi và không thêm chọn/dịch/phát media.
- Video placeholder chuyển thành poster typography với hình khối CSS và dải trạng thái, không phải poster chụp bảo tàng hay media thật. Vùng 16:9 có min-block-size 224px để có chỗ cho chữ ở màn hình hẹp, không nút phát/URL video.
- Section padding 40–64px, CTA cuối có primary link và workspace link xếp theo nhóm. Footer padding 40–64px, chia brand/Khám phá/Thuyết minh; mobile chuyển hai nhóm link dưới brand. Không thêm liên hệ hoặc tuyên bố bản quyền chưa xác minh.
- Web tests **238/238 PASS**, lint/typecheck/build/diff-check PASS. Browser desktop/mobile **NOT RUN**, inventory không có browser và ảnh toàn trang không có trong context. Chưa xác nhận wrapping, alignment hoặc overflow thực tế ở 375/768/1024/1280/1440; các breakpoint/keyboard/reduced-motion được giữ ở source.

## MUSEUM-06 — Public Video Narration Experience (2026-10-19)

### Routes và giao diện

- `/thuyet-minh` và `/thuyet-minh/` dùng MuseumVideosPage: hero, breadcrumb, danh sách video đã công bố hoặc “Video đang được chuẩn bị”. `/thuyet-minh/:slug` dùng MuseumVideoDetailPage với breadcrumb, heading/description, language selector, player, transcript/chapters nếu có, nguồn/quyền và CTA về danh sách/Khám phá. Slug không công bố hiển thị Not Found trong PublicMuseumLayout (fallback SPA, không sửa HTTP server).
- Giữ Museum Design System/Be Vietnam Pro, shell/guards hiện tại. Desktop có player lớn bên cạnh bản ghi; dưới 1024px bản ghi xuống dưới, dưới 768px language controls hai cột và danh sách video một cột. Radio label tối thiểu 44px, focus-visible, thông báo role=status/alert, text wrap và reduced motion kế thừa theme. Browser chưa chạy nên chưa xác nhận overflow/keyboard thực tế.

### Public video contract

- `features/museum/publicVideos.ts` định nghĩa MuseumPublicVideo: slug/title/description, posterUrl tùy chọn, sourceAttribution, rights (confirmed/license/credit/verificationReference), visibility PUBLIC/PRIVATE, publishedStatus DRAFT/PUBLISHED, sourceLanguage vi và languageVariants. Catalog `museumPublicVideos` mặc định rỗng, không đọc Project/Result hoặc API private.
- Variant gắn với đúng một mã vi/en/th/ko/zh-CN, state AVAILABLE/PROCESSING/UNAVAILABLE, videoUrl, captionUrl/captionLanguage tùy chọn, transcript có language/text và chapters tùy chọn với startTime/title. Chapters phải có thời gian hữu hạn, không âm và tăng dần. Không tạo segment, transcript hoặc dữ liệu AI để lấp giao diện.
- Chỉ xuất bản khi PUBLIC + PUBLISHED, title/description/source/quyền đầy đủ, confirmed=true, slug duy nhất/hợp lệ và video vi AVAILABLE tồn tại trong asset inventory. Khai báo quyền/nguồn là quyết định biên tập có trách nhiệm, không phải xác minh bản quyền tự động hoặc xác nhận bảo tàng phê duyệt.
- `publicMediaAssets.ts` dùng Object.keys(import.meta.glob) để lập inventory tên file local tại build/dev startup, không import bytes video vào JS. Chỉ nhận đường dẫn `/museum-media/...` (ASCII chữ/số/gạch ngang/gạch dưới, thư mục con được phép); video mp4/webm, poster avif/webp/png/jpg/jpeg, caption vtt. File thiếu/extension sai, URL ngoài, query/hash, traversal, protected endpoint/Blob URL bị từ chối. Inventory xác nhận file có mặt, không xác minh codec/nội dung/quyền của file.

### Player và ngôn ngữ

- MuseumVideoPlayer dùng HTML5 video controls, playsInline, preload=metadata, không autoplay, có poster nếu file hợp lệ. Loading tối đa 15 giây rồi error có retry; retry chỉ tải lại media local. Khi error không hiển thị nút phát giả; late metadata/canPlay không hồi sinh player đã báo lỗi. Unmount/source switch pause video cũ và cleanup timer.
- Chỉ variant AVAILABLE có media trong inventory và metadata ngôn ngữ nhất quán mới được chọn. PROCESSING hiển thị “Đang xử lý”; variant thiếu/không khả dụng hiển thị “Đang chuẩn bị”. Radio disabled không đổi lựa chọn; không tự chọn ngôn ngữ thay thế, không đọc video URL từ query string.
- Chuyển ngôn ngữ cập nhật player/transcript cùng lúc và tạo instance player mới theo slug/language/video/caption; không giữ audio/text track cũ. Transcript sai mã ngôn ngữ hoặc captionLanguage không khớp chặn variant. Caption hợp lệ dùng track kind=captions, srcLang đúng variant; thiếu/lỗi file VTT không gắn track hoặc báo lỗi, không lấy phụ đề ngôn ngữ khác. Nội dung thực của media/transcript/VTT vẫn cần duyệt thủ công và playback QA.

### Tích hợp video thật

1. Cung cấp video tiếng Việt có quyền công bố, nguồn tham chiếu và credit/license đã xác nhận. Cung cấp riêng các bản en/th/ko/zh-CN thực sự có sẵn; không khai báo AVAILABLE khi chưa có file.
2. Sau khi được duyệt, đặt file tại `frontend-web/public/museum-media/` bằng tên tương thích quy tắc đường dẫn; chỉ đưa tài liệu được phép public vào thư mục này. Đây là public directory: catalog gate không phải access control cho file đã đặt trong đó. Không sao chép upload/result riêng tư vào public directory. Bước MUSEUM-06 chưa thêm file hoặc tạo media giả.
3. Thêm một entry typed trong museumPublicVideos; giữ draft cho đến khi nguồn/quyền/nội dung được duyệt. Ghi nhận verificationReference nội bộ trong source, không đưa secrets vào bất kỳ field nào. Quyền phải bao phủ mọi variant/poster/caption được công bố.
4. Chỉ thêm transcript và VTT thật cho đúng language variant. Kiểm tra WebVTT syntax, lời thoại, timing và chapters theo thời lượng video; kiểm tra container/codec trước khi công bố. Không có AI/TTS hoặc hệ thống biên tập VTT trong bước này.
5. Restart Vite/rebuild để cập nhật asset inventory. Kiểm tra list/detail, từng lựa chọn ngôn ngữ, pause khi chuyển, playback/captions, lỗi file và responsive 375/768/1024/1280/1440 trước phát hành. Nếu file bị gỡ sau build, runtime player báo lỗi; sửa catalog/assets và rebuild.

- Asset còn thiếu: video vi, các bản ngôn ngữ thực, poster được phép dùng, nguồn/quyền sử dụng, transcript/VTT và chapters đã duyệt nếu có. Không có bản video thật nào được công bố trong MUSEUM-06. Không có Backend/API mới, không mutation/AI request.
- Focused tests: **28/28 PASS** với asset inventory/metadata mock và fixture chỉ trong tests. Browser: **NOT RUN**, không có browser khả dụng. Real-video playback, semantic caption matching và build với media thật còn chờ asset.
- Validation cuối: Web tests **249/249 PASS**; lint, typecheck, production build và `git diff --check` PASS. Build còn cảnh báo dynamic/static import có sẵn của projectRepository.ts. Database reads/writes: 0; AI/TTS requests: 0.

## MUSEUM-06.1 — Thư mục và chuẩn bị video thật (2026-10-19)

- Đã tạo `frontend-web/public/museum/videos/`, `posters/`, `captions/`, mỗi thư mục có `.gitkeep`. File `frontend-web/public/museum/videos/bao-tang-chung-tich-chien-tranh.mp4` chưa có ở lần precheck đầu nhưng xuất hiện trong lúc validation. Agent không tạo/copy file. Kiểm tra read-only bằng ffprobe: MP4, 23.762.139 byte, H.264 640×360, audio AAC, 307.478639 giây. Chưa kiểm tra playback/nội dung tiếng Việt hoặc xác nhận quyền sử dụng; không tạo transcript/subtitle/poster giả.
- URL dự kiến: `/museum/videos/bao-tang-chung-tich-chien-tranh.mp4`. Asset inventory MUSEUM-06 được mở rộng cho `/museum/videos/` (mp4/webm), `/museum/posters/` (avif/webp/png/jpg/jpeg), `/museum/captions/` (vtt), giữ đường dẫn legacy `/museum-media/`. Guard yêu cầu đúng thư mục theo loại asset và file thực có trong inventory; vẫn chặn protected/external/query/traversal URLs.
- Tái sử dụng catalog `museumPublicVideos` trong `features/museum/publicVideos.ts`, không tạo catalog mới. Chuẩn bị đúng một entry slug `bao-tang-chung-tich-chien-tranh`, trạng thái PRIVATE/DRAFT, rights.confirmed=false, nguồn/license/credit còn trống. Variant vi giữ URL dự kiến và UNAVAILABLE; en/th/ko/zh-CN đều UNAVAILABLE, không có file/transcript/caption giả.
- Catalog công khai vẫn có **0 video**. `/thuyet-minh` giữ empty state, slug nháp trả Not Found. HTML5 player MUSEUM-06 giữ nguyên và chỉ hoạt động khi publication/rights/source/media gates đều hợp lệ.
- `frontend-web/.gitignore` bỏ qua toàn bộ file trong `public/museum/videos/`, ngoại trừ `.gitkeep`, để tránh đưa video lớn vào Git ngoài ý muốn. Git ignore không ngăn Vite phục vụ/copy file khi dev/build; chưa có media trong index và không commit/push.

### Các bước người dùng còn cần thực hiện

1. Xác nhận có quyền công bố video và cung cấp nguồn, credit, license cùng bằng chứng/quyết định cho phép sử dụng. Phải thực hiện trước khi đặt file trong public directory: PRIVATE/DRAFT chỉ ẩn catalog, không bảo vệ URL file tĩnh.
2. File đã ở đường dẫn chính xác ở trên, không cần copy lại. Container/codec/thời lượng đã đọc bằng ffprobe; còn cần xác minh nội dung tiếng Việt, playback và chất lượng. Không lấy thêm dữ liệu từ protected Customer upload/result nếu chưa được phép. File trong public có thể được truy cập trực tiếp khi dev server chạy, dù catalog vẫn DRAFT; cần xác nhận quyền trước khi triển khai/công bố.
3. Sau khi file và quyền được kiểm tra, điền metadata còn thiếu và chuyển vi thành AVAILABLE, visibility PUBLIC, publishedStatus PUBLISHED. Không chuyển en/th/ko/zh-CN cho tới khi có variant hợp lệ riêng. Không tự đặt source/rights chỉ để mở khóa UI.
4. Restart Vite/rebuild để cập nhật inventory rồi kiểm tra list/detail/HTML5 player. Video được cung cấp riêng ngoài Git khi triển khai; chỉ thêm poster/VTT đã xác minh nếu có. Không yêu cầu tạo phụ đề/transcript mới để công bố video gốc.

- Focused video tests **10/10 PASS**, bao gồm draft không thể công bố chỉ bằng copy file và allowlist thư mục mới/legacy. Real-media metadata đã kiểm tra bằng ffprobe; browser playback **NOT RUN**, quyền sử dụng chưa xác nhận.
- Validation cuối: Web tests **251/251 PASS**; lint, typecheck, production build và `git diff --check` PASS. Build giữ cảnh báo chunking có sẵn của projectRepository. Không có media trong Git index; Database/AI/TTS requests: 0.

## MUSEUM-06.2 — Publish Real Vietnamese Museum Video (2026-10-19)

- **PUBLICATION BLOCKED — REQUIRED METADATA MISSING**. Đã ghi nhận xác nhận của người dùng có quyền đăng công khai bằng rights.confirmed=true và verificationReference trỏ tới yêu cầu MUSEUM-06.2. Không cần xác nhận lại quyền này.
- Giữ một entry hiện có, cập nhật title “Bảo tàng Chứng tích Chiến tranh — Video giới thiệu” và description theo yêu cầu. vi AVAILABLE dùng `/museum/videos/bao-tang-chung-tich-chien-tranh.mp4`; en/th/ko/zh-CN vẫn UNAVAILABLE. Không thêm transcript/caption/poster giả. Thêm CTA “Xem video” trên card cho entry thực sự được công bố.
- Xác minh file read-only: 23.762.139 byte, MP4, H.264 640×360, AAC, 307.478639 giây. ffprobe metadata PASS; FFmpeg giải mã toàn bộ video/audio vào null với -xerror PASS. Không thay thế, encode lại hoặc ghi MP4; file vẫn Git ignored và không nằm trong Git index.
- Contract isPublishedPublicVideo yêu cầu sourceAttribution.label, sourceAttribution.reference, rights.credit, rights.license có nội dung. Bốn trường này còn trống, nên entry giữ PRIVATE/DRAFT và public catalog vẫn 0. Xác nhận quyền không tự động cung cấp tác giả, dòng credit, nguồn tham chiếu hoặc tên/điều kiện giấy phép. Không điền dữ liệu suy đoán hoặc làm yếu guard để xuất bản.
- Cần người dùng cung cấp chính xác tên nguồn/tham chiếu, dòng credit và mô tả giấy phép/điều kiện sử dụng muốn công bố. Sau khi có thông tin này mới xét PUBLIC/PUBLISHED. URL file tĩnh đã ở public vẫn có thể truy cập trực tiếp nếu server chạy; trạng thái draft không phải access control cho file.
- Web tests **251/251 PASS**; lint/typecheck/build/diff-check PASS. Test xác nhận quyền đã ghi nhận nhưng metadata thiếu vẫn chặn publish. Build giữ cảnh báo chunking cũ. Browser QA **NOT RUN**, inventory không có browser: chưa kiểm tra play/pause/seek/volume/fullscreen/network/console/responsive hoặc xác nhận lời thoại tiếng Việt bằng phát thực tế.

## MUSEUM-06.2.2 — Publish Authorized YouTube-sourced Video (2026-10-19)

- Metadata được bổ sung theo đúng thông tin người dùng: sourceAttribution.label=YouTube, reference=`https://youtu.be/_MN6nsn-XDM`, credit “Nguồn video: YouTube — xem video gốc”. Contract đã có field reference nên dùng field này cho source URL, không tạo catalog hoặc trường URL trùng chức năng.
- License mô tả quyền cho phép cụ thể để tải/đăng lại trên website theo xác nhận của người dùng, không phải Creative Commons. VerificationReference ghi rõ yêu cầu MUSEUM-06.2.2 và xác nhận của người dùng về sự cho phép của chủ kênh; không tuyên bố đã xác minh độc lập văn bản cho phép hoặc sở hữu video. Không điền tác giả/kênh: lần truy cập nguồn không đọc được metadata (cache miss).
- Entry `bao-tang-chung-tich-chien-tranh` chuyển PUBLIC/PUBLISHED. Có đúng **1 video** qua publication gate khi kiểm tra với file local thực. vi AVAILABLE; en/th/ko/zh-CN UNAVAILABLE. MP4 giữ nguyên, SHA256 không đổi so với MUSEUM-06.2 đã giải mã toàn bộ thành công: E2C4D40DBF7F0D4F6337655DA5C2C094AC1D7955A631EADD2146447C1152EC64.
- Danh sách `/thuyet-minh` hiển thị card và CTA Xem video; `/thuyet-minh/bao-tang-chung-tich-chien-tranh` hiển thị player MP4 local (controls, metadata preload, không autoplay), selector ngôn ngữ, trạng thái chưa có bản ghi và link credit tới YouTube gốc. Link mới chỉ nhận HTTPS YouTube/youtu.be video URL, mở tab mới với noopener/noreferrer; không dùng URL nguồn làm media player URL.
- Không thêm poster, transcript, VTT hoặc audio giả. Poster fallback theo Museum Design System; caption không được bật vì chưa có file thật. Protected Project/Result và workflow không thay đổi. File MP4 vẫn Git ignored, chưa đưa vào Git index; không commit/push.
- Validation: Web tests **253/253 PASS**; lint, typecheck, production build và `git diff --check` PASS. Test actual catalog kiểm tra list/detail, original-source credit link, vi/target states, invalid slug, query media URL bị bỏ qua và không có caption/autoplay. Build còn cảnh báo chunking có sẵn của projectRepository.
- Browser playback/QA **NOT RUN**, không có browser khả dụng. Chưa kiểm tra play/pause/seek/volume/fullscreen/network/console và viewport 375/768/1024/1280/1440 thực tế. Đây là publication trong source/local production build, không phải deploy lên hosting bên ngoài.

## MUSEUM-06.4 — Public Video UI Polish (2026-10-19)

- Danh sách dùng featured card rộng tối đa 1100px khi chỉ có một video, poster/copy hai cột trên desktop và xếp dọc dưới 768px. Từ hai video trở lên dùng grid responsive 3/2/1 cột. Card có typography/spacing, hover/focus-within nhẹ và giữ CTA Xem video; không đổi routes hoặc hành vi điều hướng.
- Đã trích poster JPEG từ frame **35 giây** của MP4 thật bằng FFmpeg, không AI/ảnh ngoài: `public/museum/posters/bao-tang-chung-tich-chien-tranh.jpg`, 640×360, 52.655 byte. Đã xem ảnh trích để chọn cảnh không gian ngoài trời; frame logo giây 15 do tác vụ tạo đã được thay bằng frame này. Chỉ thêm posterUrl vào entry, giữ nguyên title/description, nguồn/quyền, PUBLIC/PUBLISHED và các variant.
- Detail: player 16:9 một cột, căn giữa tối đa 1040px khi chưa có transcript; thông báo thiếu bản ghi gọn dưới player, không chiếm cột riêng. Chỉ thêm cột bên cạnh khi variant có transcript thật, vẫn xếp dọc dưới 1024px. Chapters thật nếu có vẫn được hiển thị, không tạo nội dung mới.
- Selector giảm padding và số dòng, giữ radio/label, mã ngôn ngữ và trạng thái sẵn sàng/chuẩn bị; vi AVAILABLE, en/th/ko/zh-CN UNAVAILABLE. Credit YouTube bỏ dòng nguồn lặp khi đã có link credit, giữ nguyên license và link gốc, không rút gọn hoặc thay đổi quyền sử dụng.
- Native controls không bị phủ/cắt; giữ playsInline, metadata preload, không autoplay và lifecycle/error/retry hiện có. Focus-visible/reduced-motion kế thừa Museum theme; không dùng overflow hidden để che lỗi layout.
- Validation: Web tests **254/254 PASS**; lint, typecheck, production build và `git diff --check` PASS. MP4 SHA256 không đổi. Browser QA 375/768/1024/1280/1440 **NOT RUN**, không có browser khả dụng; xem poster local không đồng nghĩa đã kiểm tra giao diện hoặc playback trong browser. Build giữ cảnh báo chunking có sẵn của projectRepository.
# AI-TRANSLATE-05.8.4O.2 — Controlled execution UI

Existing DEV/RequireAuth controlled preview page now has a separate, default-OFF
manual execution section. No Dashboard/Museum/legacy translation UI changes.
`VITE_CONTROLLED_TRANSLATION_EXECUTION_ENABLED=false` is the new default;
preview opt-in and explicit `http://127.0.0.1:18083` origin remain required.
Backend independently requires operator `CONTROLLED_WEB_EXECUTION_ENABLE=true`,
a separately approved/provisioned scoped permit and existing deployment/source
checks. Flags are configuration gates, never authorization on their own.

User explicitly checks execution readiness (GET), reviews server-reported scope,
model/MEDIUM/expiry, checks the cost/no-retry confirmation, then clicks the one-time
English translation action. No POST on mount, polling, refresh or readiness PASS.
No token clipboard/export, auth bridge, refresh or ordinary API fallback.
Client/module + server submission latches prevent repeated clicks; provider fence
remains final authority. Timeout/disconnect/invalid response shows UNCERTAIN with
no retry action. Validated DRAFT only; existing authenticated draft GET viewer
remains available. No Approve/TTS/render controls. Accessible native checkbox,
disabled buttons, live status text and isolated wrapping styles preserve layout.

Browser/live generation NOT RUN. Mock regression/build results in PROGRESS.md.
Skill ui-ux-pro-max informed explicit confirmation, contextual feedback, loading
and disabled semantics; no redesign or new dependency.

## AI-TRANSLATE-05.8.4P.1 — Read-only authenticated readiness composition

No Customer UI edits. Existing manual “Kiểm tra quyền thực thi” consumes the new
standalone readiness GET with the Customer session, execution UI stays OFF. Returned
LOCKED means authenticated read-only mode, not an approved permit or CURRENT-source
attestation. Initial controlled-status GET is intentionally unavailable/404; manual
execution-readiness is the only project GET supported. No POST/login/refresh path.
Live browser verification BLOCKED pending minimum private read-only Mongo/JWT config;
mock HTTP CORS/auth results do not count as live session PASS.

## AI-TRANSLATE-05.8.4Q — Normal Customer workflow (rollout OFF)

`VITE_CUSTOMER_TRANSLATION_ENABLED=false` by default. When separately enabled with
the Backend rollout, TranslationPage uses existing GROUPS_V1 workspace directly,
after existing WorkflowRouteGuard decisions. P.1/read-only-diagnostic/controlled
readiness are not mandatory gates. No per-project setup or operator permit UI.
Existing en language catalog choice, source-group review and explicit cost
confirmation precede “Dịch tiếng Anh”. Server generates final canonical plan;
Customer rollout hides client-side group merging. No POST on mount/GET/reload.

Normal same-origin API sends the existing session, with refresh/retry=false for
generation. Double-submit and failed-request latch disable another generation;
read-only reload recovers the matching persisted unexpired draft, never regenerates.
Errors use existing alert region and explain data-only reload. Successful draft
is not yet approved or usable by Voice; existing explicit semantic review and
transactional approval remain separate. No automatic navigation/jobs/TTS/render.
Other normal/legacy pages and controlled/P.1 operator entry points are preserved.

Skill ui-ux-pro-max informed loading/error recovery and semantic feedback only;
no redesign/theme changes. Browser NOT RUN. New ledger persistence remains subject
to isolated Mongo integration before rollout; do not click a real billable action
based solely on mocked tests. Normal provider thinking is its existing DEFAULT,
not automatically changed to MEDIUM from the separate controlled experiment.

### S — Customer translation execution feedback

Customer workspace uses the existing authenticated customer-draft GET to display
server-derived attempt state alongside any validated durable draft. Existing
attempts (including legacy CLAIMED/UNCERTAIN) prevent offering a new generation
after browser refresh; network/POST errors keep the one-submit latch. Recovery
button checks results using GET with refresh/retry=false, never AI regeneration.
Vietnamese feedback distinguishes preparing/not sent, processing, persisted
unapproved draft, definite pre-dispatch failure, failed response, expired draft
and uncertain dispatch. UNCERTAIN explicitly says not to click Translate again
and to seek support for the first request. Unknown server states fail closed.
Draft copy now correctly distinguishes persisted Customer drafts from RAM-only
ordinary GROUPS_V1 drafts. Explicit semantic approval remains separate; no
automatic approval, TTS, rendering, permit, new readiness service or redesign.
ui-ux-pro-max informed semantic status/error feedback and safe recovery guidance.
Browser/live playback/generation verification: NOT RUN in S.

S26.6: Web mock regression299/299 PASS for existing Customer draft/status/error,
GET-only recovery, one-submit latch and separate review/approve controls. No Web
source/layout changes required for SIMPLE (draft alignment format stays GROUPS_V1).
Isolated Backend JWT HTTP integration additionally verifies three-group draft GET
and explicit approval contract. Real browser rendering and real multi-group Gemini
display remain NOT RUN; no Customer flag automatically enabled.

### S26.12 — SIMPLE preflight on Customer Translation

Development Translation page now includes “Kiểm tra điều kiện SIMPLE” in both
normal Customer and existing legacy/preflight branches, after workflow access
checks. Open `/projects/:projectId/translation?language=en`, then click
“Kiểm tra SIMPLE (không gọi AI)”. No check runs on mount/polling. Uses existing
authenticated API client GET with refresh/retry=false, timeout15s, double-click
lock and abort-on-unmount. Production hides the panel; Backend rejects production.

Shows CURRENT, revision, shortened digest, counts, source/input UTF-8 bytes and
largest group, SIMPLE limits, coverage, attempt/conflicts, process-local RAM
visibility and safe runtime method/flags. Quota and deployment identity show
NOT VERIFIED; overall BLOCKED cannot be turned into READY by source PASS. Existing
generation controls/flags/ownership/workflow remain independent and unchanged.
No action enables translation, approves a draft, creates a project or invokes AI.
Semantic status/live region plus labelled definition list; existing visual tokens
reused. ui-ux-pro-max informed explicit error/recovery and read-only status copy.
Browser verification NOT RUN; mock/SSR coverage only.

S26.18 supersedes fixed BLOCKED/NOT VERIFIED presentation: SIMPLE panel now shows
server READY/BLOCKED/UNKNOWN after validating readiness evidence, actual safe quota
remaining and target match. READY includes the other-process RAM UNKNOWN warning
and never enables/clicks translation or claims global RAM clearance. Status remains
semantic live text (ui-ux-pro-max feedback guidance); no layout redesign or new
execution action. Missing/contradictory READY evidence is rendered BLOCKED. Browser
verification NOT RUN; Web304/304 mock tests PASS.

## S27.3.2 — Public Museum Homepage polish (2026-10-23)

- Homepage-only Hero uses the existing local 640x360 poster extracted from the
  authorized public introduction video. Reuses public catalog visibility/publication/
  rights confirmation and asset-path checks; no catalog/media/rights edits. Caption
  identifies it as a video frame, not a newly sourced museum photograph. Original
  aspect ratio/object-fit contain, explicit dimensions/alt and image-error typography
  fallback retained. Private/draft/unapproved/missing assets do not produce an image.
- Navy Hero, slightly smaller responsive title, improved lead/CTA rhythm and a
  shrinkable two-column desktop composition; tablet/mobile stack without truncation.
  Introduction gets an editorial rule; section spacing, light-blue section surfaces,
  topic card rhythm and closing CTA proportions refined using existing blue tokens.
  Three editorial topics and four unavailable target languages remain preparation
  content; no fake exhibition, language availability or playback control introduced.
- Public Header/Footer reviewed; only their shared public stylesheet changed:
  flexible header/navigation/actions, 76px desktop min-height, readable notice text,
  long-label wrapping, footer one-column reflow on narrow phones and visible focus.
  Existing modal/Escape/focus-return/auth links remain unchanged. Customer styles,
  global tokens, routes, APIs and business behavior untouched in this step.
- ui-ux-pro-max informed readable text measure, non-cropped real-media reuse,
  responsive reflow and semantic hierarchy. No generated or externally sourced image.
- Full Web tests **320/320 PASS**, lint/typecheck/build/diff-check PASS. New mock/SSR
  tests cover approved poster/fallback admission, unavailable/private source rejection,
  image failure handler presence and public-only reflow constraints. Existing Vite
  ineffective dynamic import warning remains non-blocking.
- Visual QA **NOT VERIFIED**: browser inventory empty; target widths
  375/768/1024/1280/1440 and zoom200% not inspected. Local poster visually inspected
  as an asset only, not a screenshot of the rendered site. The 640x360 video frame
  remains lower resolution than a dedicated approved Hero photograph.
- Files: MuseumHomePage.tsx, museum-home.css, museum-layout.css,
  museum-routing.test.mjs, docs/UI.md, docs/PROGRESS.md. No Customer/Mobile/Admin/
  Backend changes, Gemini calls, MongoDB writes, retries/resets, commit/push.

## S27.3.1.1 — Restore blue Web theme (2026-10-23, current palette)

This supersedes the wine/cream/bronze palette below. The shared token architecture
is retained, but neutral `--brand-primary/background/accent` names now resolve to
the original Customer colors: Primary #5850EC, Accent #794CFF, Dark/Sidebar #111C32,
Background #F8FAFC, Section #F1F5F9 and Card #FFFFFF. Original Customer hover #4538CF,
pressed #3730A3, primary-soft #F0EEFF, accent-soft #EEE9FF, text #0F172A/#475569/
#64748B, border #E2E8F0 and blue Dashboard hero gradient are restored exactly by
resolved value. Public aliases use the same colors for navigation, CTA, breadcrumb,
cards and border; footer uses shared navy. Editorial layouts/assets are unchanged.

- Removed wine/cream/bronze primitive names and identity colors from Web CSS,
  including warm dark-card text/scrims. Customer hero illustration, sidebar active,
  account/form/upload/auth/icon/chart accents are blue/purple again. Shared focus
  visibility, typography, reflow and S27.2.1 Translation improvements retained.
- Red error #C62828 and pale red error surfaces remain semantic; warning #B45309
  with #FFFBEB still denotes warning/UNCERTAIN, not a cream brand surface. Green
  success #15803D and blue processing/info #0369A1 remain unchanged. Original photos,
  posters, logos and content were not recolored or replaced.
- `design-system` guided alias-only color migration; no Git reset/checkout/restore,
  full-file restoration, API/business changes or data access. Focused tests validate
  original resolved values, shared Museum aliases, contrast pairs, semantic statuses
  and absence of wine/cream/bronze CSS. Full Web317/317 PASS; lint/typecheck/build and
  diff-check PASS. Existing ineffective dynamic-import warning is non-blocking.
- Visual QA NOT VERIFIED: browser inventory empty; responsive widths/zoom need
  browser verification. No Backend/Mobile/Admin/config changes, Gemini or MongoDB
  writes, attempt replay/reset, commit/push. Historical palette notes below are not
  the current design specification.

## S27.3.1 — Unified Public / Customer Web design system (2026-10-23, superseded palette)

Shared primitive → semantic → component tokens now live in `frontend-web/src/styles/tokens.css`.
Museum aliases the same primitives in its scoped theme; no route, content, asset or
business layout changes. Local Be Vietnam Pro is retained. Customer spacing/radius
scales remain unchanged; Museum component spacing/type sizes/radius/shadows now
reuse these aliases, while editorial display sizes, line-height and containers stay scoped.

| Role | Previous Customer / Public | Shared Web value |
| --- | --- | --- |
| Primary | #5850EC / #7A292E | #7B252B |
| Background | #F8FAFC / #F3EBDD | #FAF7F0 |
| Section | #F1F5F9 / #EDE2D0 | #F1E8D8 |
| Dark | #111C32 sidebar / #242321 | #242321 |
| Accent | #794CFF / #B08A52 | #B58A4B |
| Card | #FFFFFF / #FFFDF8 | #FFFFFF |

- Replaced Customer purple hardcodes in sidebar active/focus, profile menu/account
  role, upload, auth, workflow decoration and Dashboard hero/charts. Remaining
  pages inherit shared semantic tokens. Identity gradients on buttons use wine
  and dark-wine, not white text over bright bronze. Functional bronze ink #806137
  is distinct from decorative bronze; chart bars use wine/bronze-ink.
- Semantic success #15803D, warning #B45309, error #C62828, info #0369A1 and their
  light surfaces are unchanged. Processing workflow markers use info blue rather
  than inheriting the new wine identity. Status chart/legend colors remain semantic;
  Translation UNCERTAIN remains warning with its existing text and replay guards.
- Border #D8CCB8, stronger control-hover border #8A7B67, muted text #625D55 and
  light-on-dark text/focus support the palette. Tests calculate >=4.5:1 for selected
  normal text/action pairs, >=3:1 for selected focus/data/control pairs, and check
  alias cycles and old-purple absence. These are source checks, not full WCAG certification.
- `design-system` guided shared primitive/semantic/component roles; `ui-ux-pro-max`
  guided contrast/interaction review. No new system-wide visual redesign or feature.
- Full Web tests **317/317 PASS**, including 4 new theme tests. Lint/typecheck/build
  and diff-check PASS. Tests use no-child-process isolation because sandbox spawning
  is restricted; build used approved escalation. Existing ineffective dynamic import
  warning for projectRepository remains non-blocking.
- Visual QA **NOT VERIFIED**: browser inventory has no apps/browsers. Verify Public,
  auth and Customer pages at 375/768/1024/1280/1440px, 200% zoom, hover/focus/disabled
  and chart differentiation before page-specific completion. No live API exercise.
- S27.2.1 Translation source/CSS/tests preserved. No Backend/Mobile/Admin/config,
  logo/media/data changes; Gemini0, MongoDB writes0, no retry/reset/commit/push.

## S27.2.1.1 — Final Translation review (2026-10-23)

The Customer attempt message now shares one compact status card with the summary
heading instead of a second consecutive panel. Safe provider/UNCERTAIN copy and
GET-only result check are retained, with no truncated text or fixed-height clamp.
Scroll clearance supports focus visibility below the shell header. ui-ux-pro-max
guided reduction of redundant hierarchy without collapsing safety information.
Mock tests confirm one page header/project heading/workflow per workspace and one
result-check control for each attempt state. Web313/313, lint/typecheck/build PASS.
Visual QA NOT VERIFIED: no attached screenshot and no connected browser; scrolling,
responsive widths and zoom must still be checked manually. No API/business changes.

## S27.2.1 — Customer Translation UI polish (2026-10-23)

- Customer group workspace distinguishes a durable server-saved draft, an approved
  GROUPS_V1 translation, legacy saved data, processing and uncertain attempts. AI
  confirmation explains draft storage separately from approval; ordinary group-mode
  RAM drafts keep their existing non-durable description.
- “Đóng bản xem nháp” replaces “Từ chối bản nháp”, with explicit text that closing
  does not delete/reject a server draft and it may reappear on reload. Existing local
  close/query behavior is unchanged; no new mutation API.
- Development-only SIMPLE check follows the main workflow in a native, initially
  closed details/summary disclosure. Opening it never performs a request. Manual GET
  semantics and READY/BLOCKED/UNKNOWN validation remain unchanged. Attempt warnings
  and provider 400/503 errors stay outside the disclosure, above source controls.
- Reuses Customer color/type/spacing tokens. Group cards have separate headings and
  timestamps, source/translation surfaces and language attributes. Actions wrap on
  narrow screens; technical definition lists stack. Disabled generation/approval
  actions have persistent aria-describedby guidance. Live status/alert regions and
  post-manual-action focus expose completion/errors without focusing on initial load.
  ui-ux-pro-max informed progressive disclosure, truthful feedback and focus handling.
- Validation: full Web mock/regression tests **311/311 PASS**, including **32/32**
  focused group/Customer/SIMPLE tests; lint/typecheck/production build PASS and
  git diff --check PASS. Node process-isolation tests and initial Vite build hit
  sandbox spawn EPERM: tests ran with --experimental-test-isolation=none; production
  build passed with approved sandbox escalation. Vite reports an ineffective dynamic
  import warning for projectRepository; no build failure.
- Visual QA **NOT VERIFIED**: browser inventory had no apps/browsers. Actual
  375/768/1024/1280/1440px, 200% zoom, keyboard/screen-reader and focus behavior still
  require browser verification. Mock focus/disclosure checks are not visual QA.
- No Backend/API/config, Museum, Mobile or Admin changes; no Gemini calls, MongoDB
  writes, attempt resets, automatic approval, TTS/render, commit or push.

### Customer provider400/503 feedback — 2026-10-22

Existing authenticated attempt status now supplies only a safe numeric provider
HTTP status when400/503 evidence exists. Vietnamese status messages distinguish
request rejection (request/API permissions/billing need checking; cause unknown)
from temporary503 availability. Both retain the no-retry/no-model-switch warning
and existing GET-only recovery action. Unknown/legacy rows do not invent HTTP
evidence. No model selector, mutation/retry button, layout or theme change added.
ui-ux-pro-max error-clarity/semantic-feedback guidance informed the copy; existing
status/live regions are preserved. Browser verification NOT RUN; mock Web tests299
PASS, lint/typecheck/production build PASS.
