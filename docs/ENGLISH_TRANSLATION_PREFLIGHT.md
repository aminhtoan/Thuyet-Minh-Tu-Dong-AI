# AI-TRANSLATE-05.4 — English translation read-only preflight

Decision: **BLOCKED for a first real generation with the currently configured runtime. Source readiness PASS.** No Gemini request, feature activation or database write was performed. No application source was changed in this step.

## Source evidence (read-only)

Executed the existing `tests/read-only-museum-source.preflight.ts` with optional `--translation` diagnostics. It imports no application startup/models/provider and disables auto-create/index, uses bounded cursor/projections, checks coverage/fullText/order/times and rechecks transcript revision after reading metadata. The new diagnostics expose only digest, counters/configuration names and local sizes, never transcript text or credentials.

| Field | Observed |
| --- | --- |
| Database / environment | multilingual_ai_narration / configured development |
| Project | 6ad5c93a86cf95b7523704a5 |
| Project / transcript state | TRANSCRIBED / valid READY-or-SAVED source, current revision rechecked |
| Transcript revision | 1 |
| Canonical source SHA-256 digest (`sourceRevision`) | 81638f2cb62e5f5f010853b047855cb72ace5ddbb2ca083890b51cdd2fe44906 |
| Source / target | vi / en (catalog en active) |
| Segments / candidate groups | 1,027 / 74; ordered full coverage, no missing/duplicate IDs |
| Snapshot | 105,958 exact JSON bytes; candidate 128 KiB passes, default 98,304 bytes rejects |
| English records | 0, including legacy/stale/non-READY records; no conflicting CURRENT translation |
| Running TRANSLATION jobs | 0 QUEUED/PROCESSING |
| Full source text size | 4,699 JS characters, 1,028 whitespace-separated units |
| Largest candidate group source text | 88 JS characters |

CURRENT here means the root transcript snapshot matched the stored current revision and canonical source integrity checks. It is not a semantic certification of the STT text or a claim that a translation already exists. The 74 groups are heuristic candidates, not 74 human-approved sentences. Merge-only boundary review must happen before generation; if groups change, recompute plan/output estimates.

## Provider configuration and request flow

- Provider configured **gemini**; exact configured/default translation model **gemini-3.8-flash**. API key **PRESENT**, value never printed. Availability/access/context window/pricing are **NOT VERIFIED** in this zero-Gemini-call task. A configuration string or previous mock metadata PASS cannot prove real model availability.
- Global GROUP_TRANSLATION_ENABLED **false**. Actual Docker inspection showed validation container **exited**, not currently healthy/running as the request context assumed; it was stopped cleanly at the end of 05.3. Its configuration remains mock-only and rejects a development/Atlas target. It was not restarted or repointed here.
- Current default runtime source gate is 96 KiB. The tested 128 KiB admission/source scope is intentionally test-only; constructor/source-scope guards reject normal development activation. A separately approved real-development composition is still needed, not NODE_ENV=test against real data or swapping credentials into the fixture container.
- Existing API: GET `/api/projects/:id/translations/plan/en`; POST `/api/projects/:id/translations/preview`; GET `/api/projects/:id/translations/drafts/:draftId`; POST `/api/projects/:id/translations/drafts/:draftId/approve`; GET `/api/projects/:id/translations/en?format=groups-v1`. JWT/CUSTOMER/ownership and validators remain mandatory.
- Provider input: `{fullText,sourceLanguage:"vi",targetLanguage:"en",groups:[{groupId,sourceText}]}`. Source text appears as both full context and per-group context. IDs/timestamps/coverage remain server-side integrity data, not a 1:1 word translation task.
- Output schema: strict `{outcome:"translated"|"unable_to_align",groups:[{groupId:string,translatedText:nonempty trimmed string <=32000 chars}]}`; at most 1,000 groups. Exact ID count, order, uniqueness and matching input IDs required. Actual success for this plan requires exactly 74 translated groups and finishReason STOP; unable_to_align/missing/duplicate/reordered/blank/invalid JSON rejects.
- maxOutputTokens **8,192**, candidateCount **1**, MIME application/json and JSON schema. No explicit thinking-budget configuration exists; model-specific accounting/behavior is unverified. Timeout **120 seconds** shared AbortSignal spanning metadata + generation, with SDK HTTP timeout also 120 seconds.
- Provider transport response cap **131,072 bytes**, includes SDK JSON envelope, enforced before SDK JSON buffering/parsing. RAM draft cap **131,072 bytes**; validation successful HTTP JSON cap **262,144 bytes** and stored-record BSON cap **131,072 bytes** remain independent. No cap is raised.
- Expected real provider HTTP requests on success: **1 models.get metadata + 1 generateContent = 2**. If metadata fails or lacks generateContent support, **0 generation**. This is not 74 generation requests. Existing GROUPS_V1 provider has no batching loop/fallback.

## Local token estimates / one-response feasibility

Measured locally without transmitting source or using a provider tokenizer:

- Provider input: **16,425 JS characters / 19,501 UTF-8 bytes**, before SDK wrapper/system instruction/schema overhead.
- Group IDs: **4,736 characters** (74 SHA-256 hex IDs).
- Required output JSON envelope with empty text slots: **7,361 ASCII bytes/characters**. Empty slots are used only for size accounting, never a returned/stored/claimed translation.

Planning estimates, **not Gemini countTokens results**:

- Input roughly **6,000–12,000 tokens**, including an allowance for instructions/schema. Assumptions: repeated Vietnamese content ~1.25–2.5 chars/token, hex IDs ~2–3 chars/token, JSON framing ~2–4 chars/token, plus prompt/schema overhead. These are deliberately approximate local heuristics; neither bytes nor Vietnamese whitespace units are model tokens or English word counts.
- Visible output roughly **3,700–6,700 tokens** under an illustrative 1,500–3,000 English-prose-token allowance plus ~2,200–3,700 framing/ID tokens. No English translation was generated to make this estimate. Verbosity/proper names/escaping/tokenizer can change it; any model thinking tokens may consume additional output budget depending on the real model.
- Therefore **one generation is plausibly sufficient**, with 74 short source groups, but **not cleared/guaranteed** under the actual model. The upper visible estimate leaves only about 1,500 tokens under 8,192; unknown thinking behavior/long output remains a concrete truncation risk. Input context support cannot be certified until the exact model is verified.
- **Batching required: NO on present sizing evidence**; this is not proof that batching will never be needed. Do not increase caps or automatically issue a second generation on truncation. A real invalid/truncated response requires stopping and a new approved decision.

If later evidence requires batching: design bounded consecutive group-ID batches from the immutable source/group-plan digest, preserve full context, never split a group/word or drop coverage. Approve a maximum request count/cost separately; validate each batch and aggregate all groups in original order into one complete draft, then one atomic human approval. Failure discards incomplete aggregate, no partial READY writes. The current service does **not** implement this orchestration; do not simulate it by independently approving partial batches or assume it is authorized now.

## Cost / retries / failure safety

Estimated API cost and maximum monetary cost: **UNKNOWN**. No verified pricing for this exact configured model is available in the inspected repository/evidence. No live price or model request was made. Do not substitute another Flash model's pricing. If rates are later verified, estimate `(inputTokens × inputRate + billableOutputTokens × outputRate)/1e6`, accounting for that model's thinking/caching/tier rules. An API error/timeout may still incur cost; zero DB writes does not mean zero billing.

Installed SDK `@google/genai` is configured with `retryOptions.attempts=1`. Local SDK code explicitly counts the initial call and passes `retries=attempts-1`, hence **0 automatic provider retries** for both metadata and generation. No fallback provider/model is selected by GROUPS_V1. MongoDB transaction callback retries do not include provider generation.

Single-flight key includes owner/project/target/source revision; same key/body shares one provider result; changed body returns TRANSLATION_DRAFT_CHANGED. Failed receipts prevent another provider attempt in the same process until TTL. UI has confirmation/double-submit protection; the API client can replay a request once after 401 token refresh, but authentication normally rejects before provider execution. No generic network/502/timeout retry exists in the inspected client.

**Duplicate billing is not globally solved:** preview/drafts/receipts are RAM-only, not persisted as a durable generation job. The DB running-job count does not reveal an in-memory GROUPS_V1 preview. Multiple instances, process restart, expired TTL or changed source revision can allow another charged call. For the first run require one known instance, one owner/operator/project/language, no automatic restart/retry, and stop after any ambiguous outcome. Do not claim provider-side idempotency from the UUID.

Failure outcomes:

- Invalid JSON, refusal, non-STOP finish, over-byte response, wrong/missing/duplicate/reordered groups, empty text, timeout or expired preview rejects; no complete draft published, no Translation READY write.
- Source changed during generation: preview final revision check rejects returning it; a RAM receipt may remain until TTL, but approval always rechecks source/digest/revision, fences transcript and rejects stale content. No automatic retranslation.
- Preview performs reads/provider work and stores a RAM draft only. Default TTL is 15 minutes from request start, so generation consumes part of the semantic review window. Restart/TTL discards the draft; do not regenerate without fresh authorization.
- Only manual review + explicit approve writes Translation/project in the existing transaction. Precommit failure rolls back both; no partial Translation READY state from that transaction. If commit succeeded but response/delivery later fails, data may already exist: inspect read-only/idempotent receipt, never assume rollback or delete/retry blindly. A later source edit can leave preserved READY-status artifacts marked STALE by provenance, never treated as CURRENT.

## Minimal proposed first execution plan — NOT executed

1. Separately approve/implement a **real development-only** bounded composition with verified memory/admission and consistent grouped readers; leave production defaults/global flags unchanged. Do not repurpose the mock fixture container/DB or reuse synthetic JWTs. Keep real CUSTOMER authentication/ownership and restrict target to project **6ad5c93a86cf95b7523704a5**, database **multilingual_ai_narration**, vi → en only.
2. Immediately before calling provider, re-read source and require revision **1**, digest **81638f2cb62e5f5f010853b047855cb72ace5ddbb2ca083890b51cdd2fe44906**, active en, no English artifact, no conflicting work and sufficient reservation. Any change stops for a fresh plan. Review/merge candidate boundaries with user; recompute plan/group IDs/payload if edited. No assumed semantic certification from UI groups or schema.
3. Obtain explicit authority for maximum **1 metadata request and 1 generation request**, cost **UNKNOWN unless exact rates are first verified/approved**. No countTokens/additional AI validation request is included. Metadata verifies configured **gemini-3.8-flash** and generateContent support; failure stops before generation, without changing model.
4. Make one preview POST using the reviewed memberships, stable idempotency key/source digest and target en. Keep 8,192 output tokens, 120 seconds, 128 KiB transport/draft, one candidate and no retries. Single process/operator; no real TTS/STT/video calls.
5. Abort on metadata/model/access/quota errors, timeout/disconnect with unknown outcome, non-STOP finish, overflow, invalid schema/coverage/order, empty text, source drift or unavailable capacity. Do not retry, switch model, split into new calls or increase caps automatically. Collect only sanitized diagnostic codes/counters, not provider raw response or credentials.
6. On structurally valid draft, human compares all grouped Vietnamese/English content for meaning, names, numbers, omissions and boundaries. No extra AI checking. Any suspect group: **do not approve/save**. Inspect within TTL; expiration requires a new decision, not automatic re-generation.
7. Only after explicit semantic approval, POST approve once with exact draft/outputDigest/reviewed=true. Read back approved translation/CURRENT provenance/coverage/English UI on the same source. Transcript/IDs/timestamps stay unchanged; do not create narration/result. If approval fails before commit, transaction rollback; after ambiguous commit, read-only verification first. Never auto-delete or overwrite an approved artifact as rollback.

## Remaining blockers / validation / files

Concrete blockers to real execution:

1. No approved non-mock real-development 128 KiB composition for the museum DB; normal runtime remains 96 KiB/flags OFF, validation container stopped/mock-only/test-target restricted.
2. Exact model availability/access/input-context/thinking/output accounting and monetary pricing remain unverified with Gemini calls prohibited. A controlled metadata check requires separate authorization; UNKNOWN cost requires explicit acceptance or verified pricing before any billable generation.

Group boundary review and explicit one-run authority are execution gates, not reasons to fabricate a successful translation here. Source admission/integrity and absence of an English conflict are PASS.

Executed: read-only source/English metadata preflight **PASS**; relevant non-writing focused tests **107/107 PASS**; backend lint/typecheck/build and `git diff --check` **PASS** after diagnostic/documentation edits. No fixture integration suite was run in this read-only step. Real Gemini requests **0**; all DB writes **0**, including development/production. No flags, provider/model, Customer Web/MUSEUM/ADMIN07 source or prior uncommitted work were changed; no commit/push.

Exact files changed in this step: `backend/tests/read-only-museum-source.preflight.ts` (optional metadata/local-size diagnostics only), `docs/ENGLISH_TRANSLATION_PREFLIGHT.md`, `docs/PROGRESS.md`. All other worktree changes predate this request and were preserved.
