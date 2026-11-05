# S32.2A — Backend source language contract

Implementation and mock verification: 2026-11-05. No Atlas migration, data write,
paid provider call, or real media generation was performed for verification.

## Project creation and compatibility

`POST /api/projects` retains `name` and optional `description` and accepts:

```json
{ "name": "Example", "sourceLanguageMode": "AUTO" }
```

```json
{ "name": "Example", "sourceLanguageMode": "MANUAL", "sourceLanguage": "vi" }
```

- New MANUAL input accepts `vi`, `en`, `ja`, `ko`, `zh` only.
- Legacy requests supplying `sourceLanguage` without mode remain MANUAL.
- New requests omitting both language and mode default to AUTO.
- Stored legacy projects without mode are interpreted as MANUAL with their
  existing source. No fields are backfilled and no migration is required.
- AUTO must not supply a language hint. `null` or omission means unresolved;
  `auto`, `unknown`, or a fabricated `vi` are never persisted as a source.
- Existing legacy transcript language validation and read behavior are retained.

Project responses expose `sourceLanguageMode`, nullable `sourceLanguage`, nullable
`detectedSourceLanguage`, and `sourceLanguageStatus`:

| Status | Meaning |
| --- | --- |
| PENDING_DETECTION | AUTO has not produced usable speech yet |
| NEEDS_CONFIRMATION | Transcript exists but reliable primary-language evidence is absent/unsupported |
| CONFIRMED | MANUAL/user confirmation, or supported provider metadata evidence |

Transcript `languageCode` (API: `language`) may be null only with explicit
`sourceLanguageStatus=NEEDS_CONFIRMATION`. A successful speech transcription may
be TRANSCRIBED while translation remains blocked; this is not project COMPLETED.

## STT behavior

AUTO omits Gemini `language_codes`; verbatim mode and word timestamps are retained.
There is one existing STT operation, with no extra detection AI operation.
The internal `SttResult.languageDetection` channel requires
`{ languageCode, evidence: 'PROVIDER_METADATA' }`. Input hints and transcript text
are not evidence. Supported metadata locale aliases normalize to application codes.

**The current Gemini adapter has no verified primary-language metadata extraction.**
It deliberately leaves that channel absent. Its actual AUTO responses therefore
require user confirmation; mock metadata tests verify the future service contract,
not a claim that Gemini currently supplies that metadata. No confidence is invented.
Mixed speech retains provider text/timestamps without guessing its main language.

MANUAL sends `vi-VN`, `en-US`, `ja-JP`, `ko-KR`, or `cmn-Hans-CN` respectively.
Stored Chinese code remains `zh`. The OpenAI STT compatibility adapter retains its
old MANUAL behavior but rejects AUTO, which is implemented for Gemini only.
`STT_NO_SPEECH` remains a failed job/project; no transcript success is fabricated.

## Confirming an unresolved source

```http
POST /api/projects/:id/source-language/confirm
Content-Type: application/json

{ "sourceLanguage": "vi", "expectedRevision": 1 }
```

Existing authentication applies. The service also requires project ownership;
Admin role alone does not bypass that ownership check. The body is strict and
cannot supply detection evidence/status or other project fields.

The endpoint requires a READY/SAVED, nonempty transcript, current positive revision,
an AUTO project in NEEDS_CONFIRMATION, and no dependent translation/narration/result,
durable translation attempt/draft, or active job. A transaction and revision/state
fences set Project/Transcript source to CONFIRMED and increment transcript revision.
Mode and real detection evidence are preserved; artifacts are never rewritten.
Repeating the same confirmed language with the current revision is a no-write no-op.
Stale revision returns 409.

Changing an **already established** transcript language is deliberately refused with
`SOURCE_LANGUAGE_REVISION_REQUIRED`, even before artifacts exist. A dedicated
revision workflow is needed to safely fence RAM drafts and other process claims.
Existing artifacts/attempts instead produce `SOURCE_LANGUAGE_HAS_DEPENDENTS`.
Generic Project PATCH cannot bypass confirmation: a changed mode/source is allowed
only before any transcript/work, in DRAFT/UPLOADED/FAILED with no dependencies.
Unchanged legacy source plus ordinary project metadata edits remain supported.

## Translation guards and boundaries

- Unresolved source fails closed with HTTP 409 `SOURCE_LANGUAGE_UNCONFIRMED` in
  legacy/grouped generation and grouped source loading. SIMPLE preflight exposes
  this reason code. Project workflow summaries cannot advertise translation READY
  for an unresolved source.
- Existing locks, quotas, attempt keys, idempotency, status transitions and
  transcript/source revision checks are retained.
- Customer SIMPLE remains vi → en. Confirming en/ja/ko/zh does **not** enable new
  translation directions. Targets, multi-target completion and Mobile are later steps.
- No schema/index/collection migration or seed is included. Transactions use the
  existing deployment requirement; live transaction behavior has not been accepted.
- Customer Web/Mobile have not been updated to collect/display source confirmation.
  S32.2B must handle nullable language/status, confirm using current revision, reload
  after 409, and only allow translation once source is CONFIRMED.

## Focused verification

Run in `backend` (all persistence/provider behavior in these tests is mocked):

```powershell
node --import tsx --test --test-concurrency=1 tests/source-language.test.ts tests/group-translation.test.ts tests/gemini-simple.test.ts tests/customer-simple-preflight.test.ts tests/translation-mock.test.ts tests/transcript-edit.test.ts tests/project-workflow.test.ts tests/gemini-stt-diagnostics.test.ts tests/stt-debug.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Do not substitute the default integration suite: some older integration files use
configured MongoDB. Real Gemini/STT and Atlas transaction acceptance remain unrun.
