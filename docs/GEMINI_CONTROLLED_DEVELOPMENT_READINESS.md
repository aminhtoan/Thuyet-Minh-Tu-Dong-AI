# AI-TRANSLATE-05.5 — Gemini readiness and controlled development runtime proposal

> Follow-up AI-TRANSLATE-05.6: credential-free development DENY readiness is now
> implemented and verified, plus a separately tested durable permit primitive.
> Real SDK permit integration / real-development execution composition remain
> BLOCKED. See `infra/backend-controlled-development/README.md`. The original
> 05.5 design/evidence below is retained as historical context, not an activation.

Checked 2026-10-21. **MODEL VERIFIED in public official documentation; API-key access/quota and actual execution remain BLOCKED/unverified.** This task proposes, but does not implement/start, a separate real-development runtime. It does not invoke any Gemini endpoint, including metadata/countTokens, enable flags, mount secrets or write MongoDB.

## Official evidence and local configuration

| Item | Evidence / result |
| --- | --- |
| Exact stable model | `gemini-3.8-flash`, matches actual configured/default model |
| Official limits | input 1,048,576; output 65,536 tokens; structured output supported |
| Source | [Google model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), checked on date above |
| SDK/API actually used | installed `@google/genai` 2.28.0; `models.get` then `models.generateContent`, not Interactions |
| API version | source does not override it; installed SDK Gemini Developer API default is `v1beta` |
| Cloud/endpoint override inspection | Vertex/Enterprise flags and Gemini base URL override absent; no secret values printed |
| Actual provider/key/flag | Gemini, key PRESENT, GROUP_TRANSLATION_ENABLED=false |
| App limits unchanged | 8,192 output tokens, 120 seconds shared metadata+generation deadline, 128 KiB provider/draft caps, one candidate, SDK attempts=1 |

Public listing proves model existence/specifications, **not access for this key, project/region, billing standing or live service availability**. Those require separately authorized account inspection or one authenticated metadata request; neither was made. [Rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits) describes project-level RPM/TPM/RPD and account-specific limits visible in AI Studio; no numeric quota for this account was verified. On 429, stop rather than follow generic retry advice.

## Thinking and one-response feasibility

Official [generateContent thinking guidance](https://ai.google.dev/gemini-api/docs/generate-content/thinking): default **medium**; low/medium/high supported, not minimal. Thinking shares the output cap and billing. Hitting the cap can truncate output with MAX_TOKENS. Levels are not exact token budgets.

The application sets no thinking configuration, therefore does **not** reserve all 8,192 tokens for translated JSON. Local 05.4 source measurements remain: 19,501 UTF-8 input bytes / 16,425 characters, 74 groups, 4,736 group-ID characters; mandatory empty JSON envelope 7,361 characters. They are not model token counts or generated translations.

Planning-only estimates retained from 05.4:

- Input ~6k–12k tokens, including prompt/schema allowance.
- Visible JSON ~3.7k–6.7k tokens, of which ~2.2k–3.7k is ID/framing overhead and ~1.5k–3k is illustrative English prose allowance.
- At the upper visible estimate, thinking must fit within **1,492** remaining tokens. At the lower visible estimate, **4,492** remain. Medium thinking provides no hard guarantee of either.

Inference: **one generation is plausible, not guaranteed at 8,192**. No batching is implemented/authorized. Propose separately approved `thinkingLevel=low` with mock serialization tests; no cap/model change or numeric-budget guarantee. No thinking configuration was changed here.

If a controlled call truncates: reject, save no partial READY translation, stop. A new batching design/approval must use contiguous GROUPS_V1 boundaries, preserve the immutable source digest, collect/validate all ordered groups into one complete draft, and approve atomically once. Do not automatically call another batch or increase output limits. Current service has no such multi-call coordinator.

## Price and cost envelope — verified rate, conditional calculation

Official [Standard pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.8-flash): **$0.75/M input; $3.75/M output including thinking**, through **2026-12-31**. Recheck rates before execution; account tier/access remains unverified.

Our arithmetic, USD token charges only, no tools/cache storage/retries/taxes/conversion:

| Assumption | Calculation | Amount |
| --- | --- | ---: |
| Planning input upper estimate, entire combined output cap | `(12000 × .75 + 8192 × 3.75) / 1e6` | **$0.03972** |
| Conservative official input maximum, same output cap | `(1048576 × .75 + 8192 × 3.75) / 1e6` | **$0.817152** |

**$0.04 is not an enforced ceiling.** Proposed authorization envelope: **$0.82** for one generation under these Standard-rate/model/cap assumptions; not a cloud billing-control guarantee or total tax-inclusive invoice limit. A tighter ceiling requires a verified input-token bound. Failure may still incur charges. No cost was incurred via Gemini in this task.

## Separate controlled development runtime — proposal, not installed

Keep `infra/backend-validation` unchanged as the synthetic/mock/isolated-DB environment. Do not point it at Atlas, set NODE_ENV=test against real projects, inject real keys into it, reuse its synthetic JWTs, or relax its isolation guard.

Proposed new composition: `infra/backend-controlled-development/`, separate image/container/project, loopback host **18082** (must be checked before creation), NODE_ENV=development. It must be explicitly implemented/reviewed later; no runnable compose file or automatic launch is added now.

| Concern | Proposed control |
| --- | --- |
| OS budget | 512 MiB memory+swap ceiling, 1 CPU, 128 PIDs, Node old-space 256 MiB, restart=no; hard ceilings, not exact heap reservations |
| Isolation | non-root/read-only rootfs/cap-drop, bounded tmpfs, no Docker socket, distinct network, 2 × 2 MiB logs, healthcheck, no fixture/seed/migration/startup index writes |
| Admission | one shared controller, 5 MiB estimated caller/retained-work leases, 32 MiB aggregate, 4 active / 2 per owner; one-shot gate restricts real generation further to one |
| Source policy | 128 KiB only for the approved owner/project/vi→en/source-revision/digest scope; unapproved/default/production remain 96 KiB |
| Auth | existing JWT verification + CUSTOMER RBAC + database ownership; never signed fixture identity for a real customer |
| Consumers | same admitted scope for plan/preview/duplicate waiters/draft/approve/GET/compatibility reader/TTS source checks; preserve stale/unknown/review fences; no TTS generation allowed |
| Readiness mode | provider adapter DENY, no SDK client with real credentials, preview/generation/approve/STT/TTS/video routes unregistered or fail-closed; network egress policy blocks provider traffic; only read-only authenticated plan/GET/health |
| Credentials | no production/development secret mounts in test containers; readiness mocks use synthetic credentials only. Real execution credentials later require separate approval into the distinct non-test development runtime via operator-managed secrets, never Git/build context or inherited `.env` fallback |
| DB | explicit approved deployment/database fingerprint and project allowlist; readiness DB access read-only. Real artifact-write authority is a separate future gate, never fixture writes into development |
| Single call | durable one-shot permit outside RAM, consumed atomically before provider submission; spent/uncertain permit never automatically reissued on process restart |

Current implementation rejects GroupAdmission/source-scope/router injection outside NODE_ENV=test. That protection must **not** simply be removed. A future explicit CONTROLLED_DEVELOPMENT policy must validate runtime identity, scope, route permissions and permit before admission. Global flags remain OFF; a scoped capability must not unlock every project. Raw read/approve calls cannot bypass response/waiter accounting. Re-run mocked full HTTP + isolated Mongo tests in that composition before granting real generation.

Readiness source inspection stays read-only; no real customer data is copied into mock fixtures. Any future real credentials belong only to the separately approved non-test execution runtime, not this proposal or existing tests. No Windows-wide memory settings, Docker containers/networks/volumes or MongoDB configuration were changed here.

## Exact one-run preconditions and proposed procedure

Authority scope: database **multilingual_ai_narration**, project **6ad5c93a86cf95b7523704a5**, source **vi**, target **en**, revision **1**, source digest **81638f2cb62e5f5f010853b047855cb72ace5ddbb2ca083890b51cdd2fe44906**. Source from 05.4 has 1,027 segments and 74 candidate groups; it must be re-read before execution rather than treated as an eternal snapshot.

1. Implement/verify the separate readiness composition with provider DENY, JWT/ownership and shared profile as above; keep real secrets absent during mock/readiness tests. Obtain explicit authorized customer identity, approved deployment/project scope and a human-reviewed group plan. Recompute payload estimates if boundaries merge; do not infer sentences from word counts or visual UI clusters.
2. Verify source is CURRENT, digest/revision unchanged, en active, no existing English artifact, no conflicting work, and admission capacity available. DB zero processing-job count alone cannot exclude RAM previews: use one known instance/operator, inspect its pending state, no rolling deployment or auto-restart.
3. Obtain separate permission for **one metadata request** and **one generation**, exact stable model and price envelope/date. User must accept truncation risk and choose whether to separately approve LOW thinking; no automatic model/setting change. Account Standard billing/rate/access checks must pass; fail closed if they cannot be established. Known requested token-charge envelope is $0.82 under the stated verified-rate assumptions, not $0.04 guessed as a cap.
4. Before submission, freeze a permit containing owner/project/target/source+group-plan digest, model/API, input policy, output cap, thinking choice, price date/envelope, allowed metadata/generation counters and expiry. Use atomic durable consumption, one instance and no retry/fallback/continuation loop. Failure to persist the permit blocks submission. No permit is created in this task.
5. First metadata call verifies the exact configured model/access/capabilities; failure stops before generation. Then submit **one** existing GROUPS_V1 preview request with stable body/idempotency key. Keep maxOutputTokens=8192, shared 120s timeout, 128 KiB transport/draft caps, candidateCount=1, SDK attempts=1, no tools. This expected success path has **2 provider requests total**, not 74. No countTokens or second AI checker is authorized.
6. Reject incomplete/non-STOP output, schema/ID/order/coverage mismatch, overflow, empty text or source drift. Only a complete validated response becomes a RAM draft, never Translation READY. Numeric usage diagnostics should be implemented/reviewed before the real run (input/output/thinking counts only); the current transport drops usageMetadata, so do not claim post-call billing telemetry already exists. Never log reasoning, raw response, transcript or keys.
7. Human compares all groups for semantic alignment, omissions/names/numbers. No additional AI validation. Explicit user confirmation of that exact draft/outputDigest is required for approve; source revision/digest/fences are rechecked in the existing transaction. No automatic approve, narration, result or transcript mutation.
8. Before commit failure: transaction rollback; no partial READY record. After an ambiguous commit/delivery: inspect read-only or approved-record receipt first, never assume rollback, overwrite/delete or repeat generation. After later source change, old artifact remains preserved but fails CURRENT checks.

Failure matrix:

| Event | Safe response |
| --- | --- |
| 401/403, unavailable model, 429 | stop; no provider/model fallback or retry |
| Timeout/disconnect | hold reservations until work settles; mark permit spent/uncertain, inspect without issuing generation again |
| MAX_TOKENS, invalid JSON, missing/duplicate/reordered group | no partial draft/READY; stop, require a new decision |
| Revision/digest changed | reject preview/approve, preserve old artifacts; request a new source/plan decision |
| Draft TTL/restart | no automatic regeneration; permit must survive restart, unlike RAM draft |
| Commit response lost | read-only verification/idempotent receipt; no blind mutation or deletion |

## Decision and validation

- Public model identifier/specification/pricing uncertainty is resolved from official documentation. Account/key availability/quota remains **BLOCKED** without a permitted authenticated check. Thinking consumption is variable; one generation remains plausible, not guaranteed at 8192.
- Controlled development runtime: **DESIGN READY, IMPLEMENTATION/ACTIVATION BLOCKED** pending explicit scoped non-test policy, durable permit/readiness-DENY controls and validation. No real runtime or provider configuration was edited/launched here. The known mock environment is not relabeled as a real execution environment.
- Relevant non-provider focused tests **107/107 PASS**. Backend lint/typecheck/build and `git diff --check` **PASS**. No DB-writing integration suite was run in this task; existing isolation and stopped/running Docker resources were preserved.
- Exact files changed: `docs/GEMINI_CONTROLLED_DEVELOPMENT_READINESS.md`, `docs/PROGRESS.md`. Previous uncommitted preflight/source/runtime work remains untouched. No application source, provider/model, Customer Web/MUSEUM/ADMIN07 or dependencies changed; no commit/push.
- Gemini API calls **0**, development/production DB writes **0**, real generation **0**, global flags activated **0**. Public documentation browsing is not a Gemini API request; no credentials accompanied it.
