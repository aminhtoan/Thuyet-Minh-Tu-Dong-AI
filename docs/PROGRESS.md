# Project Progress

## Current Sprint

S11.5 Customer Web Visual Redesign

## Status

COMPLETED (Customer Web visual scope)

## Reference

- IMAGE 1: target light AI narration SaaS dashboard.
- IMAGE 2: previous heavy dark-sidebar application.
- Brand preserved: Người kể chuyện AI / Thuyết minh đa ngôn ngữ.

## Updated

- AppShell: shared shell with wider desktop workspace and responsive padding.
- Sidebar: light lavender, compact icons, clear active item, neutral mock workspace area.
- Topbar: project search wired to existing Projects filter; truthful user placeholder.
- Dashboard Hero: restrained blue/violet gradient, CTA, CSS/SVG media/wave/microphone illustration.
- Quick Actions: four cards mapped to existing routes; project-required actions open Projects.
- Recent Projects: compact table-style rows, media placeholders, language/status/progress/actions.
- Quick Statistics: actual repository counts, compact 2×2 panel; no invented growth data.
- Recent Activity: derived from latest project updates, not a backend event system.
- Projects: same filters and workflow actions, URL-based topbar search.
- New Project: shared card/input styles, numbered sections and soft media dropzone.
- History: same compact visual language, existing search/filter/reopen behavior.
- Workflow shared UI: tokens, cards/buttons/inputs/badges, reusable six-step Web stepper.
- Responsive: desktop, tablet and phone Web layouts.

## Preserved

- S1–S11 domain logic and project mock fixtures.
- All routes, projectId and target-language propagation.
- Transcript/translation save/reset/validation and voice settings.
- Processing confirmation, progress, cancel/retry and cleanup.
- Result metadata, unavailable real media/download and History.
- Existing S5 mock upload behavior (no persisted new project).
- Mobile unchanged during S11.5; prior S11 changes remain intact.
- No dependencies added, no remote/random image assets.

## Validation

- Web lint: PASS (oxlint; no warnings)
- Web typecheck: PASS
- Web build: PASS
- Tests: PASS (existing standalone Node service + Chrome browser checks)
- npm test: NOT_AVAILABLE (no package script; no new test framework)
- S1–S11 implemented Customer workflow regression: PASS
- Service tests also pass against unchanged Mobile feature modules.
- Dashboard widths: 1920, 1440, 1366, 1024, 768, 375 — PASS
- Projects/upload/history/workflow route overflow checks: 1440, 1024, 768, 375 — PASS
- Topbar search → Projects filter: PASS
- New Project form → valid synthetic WAV → mock upload → Projects: PASS
- Transcript → Translation → Voice → Generate → Processing → Result → History: PASS
- Failure/retry, cancellation/navigation cleanup and result re-open: PASS
- No uncaught browser runtime exceptions.

## Test Commands

From frontend-web:
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `node scripts/verify-processing.mjs`
- `node scripts/verify-processing-browser.mjs`
- `node scripts/verify-redesign-browser.mjs`

Browser scripts require Vite at 127.0.0.1:5175 and separate temporary Chrome debugging at 127.0.0.1:9223.

## Known Issues / Scope

- Session data still resets on reload; no backend/persistence or real AI/media output.
- Old workflow labels still include English; this pass is visual redesign, not complete localization.
- Settings remains the existing placeholder; no fake notifications, subscription or analytics.
- Mobile visual redesign and physical-device interaction are outside this pass.
- Auth remains mock; regression does not claim real authentication or real media processing.

## Next

S12 Admin Web Foundation — not started.
