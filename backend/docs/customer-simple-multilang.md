# S32.3 — Customer SIMPLE multilingual translation

Implemented 2026-11-05. This extends SIMPLE translation only. Previous S32.1/2A/2B
documents describing Customer vi -> en are historical snapshots. No live Gemini,
Atlas, Customer-session or translation-quality acceptance was performed here.

## Contract and compatibility

- Customer `GEMINI_SIMPLE_V1` accepts confirmed sources vi/en/ja/ko/zh and targets
  en/ja/ko/zh, excluding the actual source. There are 16 valid directions.
- Legacy missing source mode/status retains the existing MANUAL/confirmed-source
  interpretation. Unresolved AUTO still fails `SOURCE_LANGUAGE_UNCONFIRMED`.
- Target must also be active in the existing Language catalog for generation.
- Gemini remains the provider. No environment flag/model/quota is changed. Older
  Customer GROUPS_V1 remains vi -> en; controlled/profile contracts are not expanded.
- Source revision hashes, old English attempt keys and binding bytes remain intact.
  Target was already part of attempt keys, input digests, RAM keys, output digests
  and Translation uniqueness. The change passes the selected target into those
  existing mechanisms; it does not rearm FAILED/UNCERTAIN attempts or rewrite rows.

Public Backend API paths (the frontend API helper adds `/api`):

```text
POST /api/projects/:id/translations
  { "targetLanguage": "ja", "format": "GROUPS_V1" }
GET  /api/projects/:id/translations/customer-draft/:targetLanguage
GET  /api/projects/:id/translations/simple-preflight?targetLanguage=ja
GET  /api/projects/:id/translations/drafts/:draftId?targetLanguage=ja
POST /api/projects/:id/translations/drafts/:draftId/approve?targetLanguage=ja
  { "outputDigest": "<existing digest>", "reviewed": true }
```

Existing English draft URL `/customer-draft/en` is unchanged. Missing target query
on old English draft/preflight calls defaults to en. New Web calls always specify
the selected target. Customer draft retrieval/approval validates both target and
the exact durable draft ID before reaching normal RAM draft/approval logic.
Generic non-Customer GROUPS_V1 query validation continues to accept catalog codes;
the Customer-only service independently enforces its four-target allowlist.

Preflight inspects project/source state, the selected target's stored translation,
attempts, process-local drafts and durable conflicts across revisions. Active jobs
remain a project-wide guard. Response includes targetLanguage, sourceLanguage when
available and persistedTranslation. persistedEnglish is retained for old en readers
and is NOT_APPLICABLE for other targets. Deployment identity still means the serving
database/instance identity; it is separate from translation targetLanguage.
Other-process RAM drafts remain UNKNOWN. Preflight never authorizes generation.

## Prompt and byte/output safety

- The original vi -> en instruction prefix/JSON structure remains; directions now
  use the actual source and target names. English uses natural museum narration.
- Japanese requests natural museum narration with consistent polite register.
- Korean requests natural, polite museum narration.
- zh explicitly requires Simplified Chinese / 简体中文 and prohibits Traditional Chinese.
- All prompts preserve names, places, dates/years, numbers and heritage terminology
  in context, treat source as data, preserve group IDs/order, and prohibit added or
  omitted meaning. fullText is context, not permission to import extra group content.
- Input bounds are unchanged: 12,000 JSON UTF-8 bytes, 2,000 UTF-8 bytes/group,
  32 groups, existing output limit and 8,192 output tokens. No fake token estimates,
  truncation, batching, additional language-detection call or retry was introduced.
- JSON/ordered group coverage validation is retained. CJK byte boundaries and output
  preservation are mock-tested. No unreliable character-only heuristic is presented
  as proof of translation language/quality. Human semantic review remains required;
  actual Japanese/Korean quality and Simplified Chinese output need paid-test approval.

## Customer Web behavior

- Selector uses active API catalog entries filtered to en/ja/ko/zh, excluding source.
  Chinese is explicitly labeled giản thể. No voice/TTS capability is assumed.
- Generation/state/draft/approval/preflight requests carry the selected target.
  Workspace does not use project.targetLanguage/latest translation in place of it.
- Target changes clear draft/saved/plan/groups/review/attempt state immediately.
  Read requests are canceled on cleanup and guarded by a monotonically changing
  read epoch, including the interval before the next effect executes.
- During POST generation/approval, target is locked and rapid duplicate submits
  are fenced. No effect or selector starts generation. Failed/uncertain submissions
  still offer read-only recovery, not automatic retry.
- Responses with wrong project/target are rejected for saved translation, attempt,
  draft, plan, generation and approval. New non-English attempt state requires target
  echo; old English state without that field remains compatible.
- Preflight display checks the requested target, uses target-specific saved evidence
  and resets on route target change. No old English evidence is relabeled as ja/ko/zh.
- Existing UI tokens/layout and manual review flow are reused. No design tokens,
  Mobile screens, TTS adapter or voice documents are changed.

## Changed files in S32.3

Backend source:

- src/services/translation/customer-languages.ts (new)
- src/services/translation/gemini-simple-contract.ts
- src/services/translation/gemini-group-translation.provider.ts
- src/services/translation/group-translation.service.ts
- src/services/translation/customer-simple-preflight.ts
- src/services/translation/preflight-runtime-evidence.ts
- src/controllers/translation.controller.ts
- src/routes/project.routes.ts
- src/validators/translation.validator.ts

Backend tests:

- tests/customer-multilang.test.ts (new)
- tests/customer-simple-preflight.test.ts
- tests/source-language.test.ts (preflight mock contract only)
- tests/customer-translation.test.ts (explicit legacy method and current source cap fixture)
- tests/gemini-request-contract.test.ts (explicit legacy method/model selection and
  current SDK schema fixture; production legacy schema unchanged)

Customer Web:

- src/features/translation/customerLanguages.mjs (new)
- src/features/translation/customerLanguages.d.mts (new)
- src/features/translation/GroupTranslationWorkspace.tsx
- src/features/translation/groupTranslationService.ts
- src/features/translation/CustomerSimplePreflight.tsx
- src/features/translation/simplePreflightView.mjs
- src/features/translation/simplePreflightView.d.mts
- src/pages/TranslationPage.tsx
- tests/group-translation.test.mjs
- tests/simple-preflight.test.mjs
- tests/customer-translation.test.mjs

This document and the local multilang-progress ledger/changelog/decisions complete
the handoff. Existing uncommitted S32.2B files were preserved.

## Verification and remaining scope

Focused Backend/Web test files use mocked persistence and SDK/fetch; no configured
MongoDB connection is opened. Coverage includes all valid directions, same-source
and unsupported targets, unconfirmed source, existing translations, target-scoped
draft/attempt/digest/idempotency, owner lock/quota, Unicode, prompt and ordered coverage,
real local JWT route parameter wiring, legacy en reads and COMPLETED rejection.
Web fixtures cover target selection/change, late responses, review/approval,
incorrect responses, explicit API requests and existing workflow regressions.
See the progress ledger for final test totals and typecheck/lint/build results.

Final results: Backend 161/161 tests across 13 focused files PASS, including 27 new
multilingual tests. Customer Web 137/137 tests across 13 focused files PASS, including
11 new target/race/client/preflight cases. Backend typecheck/build/lint PASS. Web
typecheck/build PASS and lint exits 0 with the same three pre-existing warnings
(AudioGuideModal effects and GroupTranslationWorkspace effect dependencies). Web
build retains >500 kB chunk and ineffective repository dynamic-import warnings.
Both design adapter checks and four existing Mobile design/token tests PASS.
No full monorepo or configured-database integration suite was run.

No real Customer browser session, screen-reader/responsive visual acceptance, paid
translation, TTS or media generation is claimed. Mobile language/translation parity
remains a deliberate S32.7 capability gap. Both design adapters and existing Mobile
design/token tests are checked read-only; no Mobile implementation is changed.

S32.4 must define per-target versus aggregate workflow/COMPLETED semantics, bind the
chosen target through voice/narration/result/resume paths, and prove artifact and
concurrency isolation throughout downstream processing. Current source-state gates
remain unchanged: no new translation on COMPLETED or other disallowed project states.
Existing approved receipts/artifacts remain readable without lowering project status.
Gemini ja/ko/zh voice catalog additions and fr cleanup remain S32.5, with separate
database approval. No seed, migration, .env edit, commit or push is included here.
