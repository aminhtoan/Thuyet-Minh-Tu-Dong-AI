# S32.2B — Customer source language

Implemented 2026-11-05. Code/mock checks PASS; live Customer session, visual browser
acceptance and Atlas confirmation remain NOT VERIFIED. No real API write or paid AI call.

## Behavior

- New project defaults AUTO. MANUAL first selects vi and offers vi/en/ja/ko/zh.
  AUTO requests omit sourceLanguage; switching mode preserves the user's manual choice.
- Detail/transcript show mode, confirmed source and localized status. Missing source
  is "Chưa xác định". Detected source is shown only when returned by Backend.
- Legacy projects lacking mode use MANUAL and their actual stored language; no
  re-confirmation or artifact changes. Name/description saves omit unchanged source.
- Transcript remains readable for the specific AUTO NEEDS_CONFIRMATION workflow
  blocked at TRANSLATION. This exception does not authorize transcription/translation.
- The confirmation selector starts empty: there is no guessed Vietnamese selection.
  It submits POST /projects/:id/source-language/confirm with the loaded transcript's
  positive expectedRevision and explicit sourceLanguage, through the existing API client.
- A ref lock blocks rapid duplicate submits; loading disables controls. Successful
  confirmation refreshes project and transcript before enabling translation. Source
  language must match on both objects. The UI announces successful refresh.
- Revision conflict, dependent artifacts/attempts, active job, auth and other errors
  stay visible. Recovery requires explicit "Tải lại dữ liệu" GETs; no automatic POST
  retry or silent replacement of expectedRevision. If POST succeeded but refresh
  failed, only data reload is offered before another decision can be made.
- Translation route blocks unresolved source before mounting generation/preflight
  workspaces. Existing SIMPLE vi -> en, targets, quota, attempt and artifact contracts
  remain unchanged. Accepting five source languages does not enable new directions.

## Files

New:

- src/features/projects/sourceLanguage.ts
- src/features/projects/sourceLanguageService.ts
- src/features/projects/SourceLanguageSummary.tsx
- src/features/transcript/SourceLanguageConfirmation.tsx
- src/styles/source-language.css
- tests/source-language.test.mjs
- docs/source-language-auto-manual.md

Updated:

- src/pages/NewProjectPlaceholder.tsx
- src/pages/ProjectDetailPage.tsx
- src/pages/TranscriptPage.tsx
- src/pages/TranslationPage.tsx
- src/features/projects/types.ts
- src/features/projects/projectRepository.ts
- src/features/projects/uploadService.ts
- src/features/projects/projectUtils.ts
- src/features/projects/ProjectCard.tsx
- src/features/projects/projectListPresentation.ts
- src/features/transcript/types.ts
- src/features/transcript/transcriptService.ts
- src/features/transcript/useTranscriptEditor.ts
- src/features/translation/GroupTranslationWorkspace.tsx
- src/features/translation/useTranslationEditor.ts
- src/features/results/resultUtils.ts
- src/pages/DashboardPlaceholder.tsx
- src/pages/GeneratePage.tsx
- tests/project-form-polish.test.mjs
- tests/transcript-compact-ui.test.mjs

Dashboard/list/result/generation changes only make existing language displays null-safe;
they do not redesign these screens. Common components and existing tokens are reused.

## Verification

- TypeScript PASS; build PASS; lint exit 0 with three existing warnings (two effect
  warnings in AudioGuideModal, one dependency warning in GroupTranslationWorkspace).
- Build warns about >500 kB chunk and ineffective pre-existing dynamic repository
  import. No dependency/configuration changes were made to suppress warnings.
- 146/146 tests across 19 focused Customer Web files PASS, including 21 new source
  cases: create payload/UI, five manual languages, legacy source, actual revision,
  successful/failed confirmation, duplicate submit, conflicts, GET-only recovery,
  unknown-source route/continue guards, summary and nullable list behavior.
- Both design adapter checks PASS. Mobile's two existing design/token test files
  PASS (4/4); no Mobile source changes or functional parity claim.
- No browser/CDP tool or browser automation package was available in this session.
  Responsive and accessibility checks cover fixture markup/control behavior and
  token-based CSS; actual 375/768/1024/1440 layout, focus/keyboard, zoom and screen
  reader acceptance remain PARTIAL, not visually certified.

## Mobile capability gap and next phase

Corresponding NewProjectScreen, ProjectDetailScreen, TranscriptScreen and
TranslationScreen remain unchanged. Mobile does not yet implement AUTO/MANUAL or
source confirmation; that is an explicit S32.7 capability gap. Customer Web is the
baseline and was not reduced to match Mobile.

Next authorized step must be requested separately: S32.3 translation en/ja/ko/zh.
No Backend, .env, MongoDB, Admin /logs, tokens, seeds or paid Gemini behavior was
changed or executed here. The multilang-progress ledger records the handoff.
