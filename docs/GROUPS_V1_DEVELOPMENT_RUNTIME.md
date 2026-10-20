# AI-TRANSLATE-05.2 — development runtime memory validation

Decision: **BLOCKED for development activation / first real English generation**. Full application HTTP-stack load validation passes in the isolated test process. It is not a measurement of a running development backend or a production safety certification.

## Actual runtime inspection

- `backend/package.json`: development starts `tsx watch src/server.ts`; built start is `node dist/server.js`. `server.ts` connects `env.mongoUri`, then listens on `env.port`. No application heap/RSS budget is specified by either script. Watcher memory, server child memory and FFmpeg subprocess memory are distinct.
- Sanitized `.env` inspection: development, port 8080, GROUP_TRANSLATION_ENABLED=false, no configured/inherited NODE_OPTIONS in the diagnostic shell. No credentials were printed; no environment file was changed. This task does not start the default server against its development database.
- At this task's Windows process inspection: three Node processes (working sets 32,919,552 / 25,006,080 / 46,235,648 bytes), none identified as `src/server`, `dist/server` or the backend directory. No listening connection was found on port 8080. Therefore backend PID, server uptime, actual server V8 heap limit and `process.memoryUsage()` baseline are **not verified**. Unrelated Node processes are not substituted as backend evidence.
- Windows reported total visible RAM 16,551,224 KiB and free physical RAM 1,447,916 KiB (about 1.38 GiB free at that instant). This is shared/variable availability, not a guaranteed per-process reservation. No global Windows setting or unrelated process/container was changed.
- Infrastructure defines MongoDB demo and isolated replica-set containers, not an approved memory-limited backend container. The demo launcher uses its own guarded local environment; it was not run or changed. A MongoDB container limit cannot establish backend headroom. Windows Job Object/private-commit/process limits were not established.

Concrete outcome: ACTUAL DEVELOPMENT RUNTIME **BLOCKED**, MEMORY HEADROOM **BLOCKED**. Do not infer a deployable budget from physical RAM, an unrelated Node process, default V8 heap limits or a successful isolated test.

## Profile consistency audit

| Consumer | Explicit isolated profile | Current development/default composition |
| --- | --- | --- |
| Plan | shared controller, source cap, caller/response lease | default singleton, 96 KiB source gate |
| Preview | caller admission before source, separate retained provider/draft credit | no profile injected, feature OFF |
| Duplicate preview | one provider operation, each HTTP waiter admitted | existing single-flight, profile not enabled |
| Draft store / GET | same store/controller, TTL cleanup, owned `readDraft`, HTTP lease | compatibility synchronous draft getter, no profile lease |
| Approve | same controller, operation/response lease, transaction/CAS/digest fence | existing default transaction, no profile composition |
| Approved GET | same source policy, bounded stored BSON before hydration and response JSON | `translation-processing.service.ts` invokes default `groupedDto` |
| TTS grouped source | not invoked by this translation-only load | `narration.service.ts` uses default `loadSource` at request and transaction boundaries |

The isolated translation profile is internally consistent. **Development-wide consistency remains BLOCKED**: `GroupAdmission` construction deliberately rejects non-test environments; no approved development entry point composes the shared controller across the default readers/consumers. Bypassing the constructor or setting a real development backend to NODE_ENV=test is NOT a recommended fix. Default 98,304-byte source admission still rejects the 105,958-byte museum source. Provenance/current checks must not be bypassed to change this.

Other backend process consumers not covered by the translation credit ledger include 1 MiB JSON/urlencoded parsing before route admission, auth/ownership queries, transcript/list queries, narration `readFile` (whole audio buffer), provider/native/TLS/driver buffers, socket buffers and other routes' concurrency. Media upload is disk-backed and size-limited, not a reason to equate maximum file size to a guaranteed memory allocation. STT/TTS/video activity and FFmpeg child processes were not run or measured. Workflow summary/artifact queries and default TTS source validation do not inherit an injected translation HTTP controller automatically.

## Test implementation (production defaults preserved)

`createApp` and `createApiRouter` now expose composition factories. The existing `app`/`apiRouter` exports call those factories with the same defaults. Alternate routers are accepted **only in NODE_ENV=test**; development/production override rejection is regression-tested. No routes, auth/RBAC/ownership validators, Helmet/CORS/body-parser settings or default limits were removed or weakened.

The integration harness uses the real application stack (including its 1 MiB body parsers, Helmet, CORS, API routes, auth/ownership and error middleware), not a reduced fixture-only Express application. `/api/health` confirms the isolated database connection; security headers are checked. Project controllers alone are explicitly wired to the shared lab policy. Requests go through real loopback HTTP, real Mongoose and the installed Gemini SDK with a local bounded-fetch mock. No network call reaches Gemini; synthetic content only.

Test-only configuration:

| Parameter | Value / meaning |
| --- | --- |
| Node | 22.23.3 |
| Test launch | `node --max-old-space-size=512 --import tsx --test tests/groups-mongodb.integration.ts` |
| Observed V8 total heap ceiling | 587,202,560 bytes (560 MiB); **not** a 512 MiB RSS limit |
| Source | 128 KiB exact JSON bytes |
| Credit | 5 MiB per caller lease and separately per retained provider/draft lease |
| Aggregate | 32 MiB estimated credits per shared controller |
| Active callers | maximum 4 total / 2 per owner |
| Draft / provider transport | unchanged 128 KiB each |
| Successful HTTP JSON / stored Translation BSON | test-profile ceilings 256 KiB / 128 KiB respectively |
| Output / provider timeout | unchanged 8,192 tokens / 120 seconds |

The heap command is an explicit **lab-only measurement constraint**, not an approved development deployment value, not a native-memory cap and not evidence that a 32 MiB credit ledger precisely bounds allocations. Default npm scripts and .env remain unchanged. Four independent previews may exhaust aggregate credits before four provider calls: each needs both caller and retained-work credit. Safe capacity rejection is expected.

## Bounded load results

One warm-up (100 synthetic segments), then **two** rounds of concurrency 1/4/16 with 1,027-segment synthetic transcripts. Four owners exercise duplicate waiters, per-user/global admission and provider single-flight. The run also performs authenticated plan, draft GET, approve, approved GET, wrong-user checks and oversized artifact rejection. Transaction/rollback/concurrency/edit-race regression remains in the same suite.

Memory sampling every 10 ms, plus explicit baseline/final samples. Samples cover preview through subsequent reads/approve/TTL, but not every instantaneous allocation or earlier fixture setup. Same process/client/test framework/fixtures and preceding tests contribute to values; no forced GC or peak-guarantee claim. MiB values below are rounded; logs emit raw bytes, sample counts, external/arrayBuffers, timings, response sizes and ledger values.

| Round | Offered concurrency | Baseline RSS / heap MiB | Sampled peak RSS / heap MiB | Final RSS / heap MiB | Preview 200 / 503 / canceled | Mock generations |
| --- | ---: | --- | --- | --- | --- | ---: |
| Warm-up | 1 | 216.4 / 102.8 | 218.1 / 112.3 | 194.1 / 53.0 | 1 / 0 / 0 | 1 |
| 1 | 1 | 208.8 / 82.4 | 210.8 / 97.9 | 201.1 / 58.5 | 1 / 0 / 0 | 1 |
| 1 | 4 | 206.0 / 79.9 | 207.8 / 94.0 | 193.0 / 48.1 | 2 / 1 / 1 | 3 |
| 1 | 16 | 207.8 / 86.5 | 210.7 / 104.7 | 201.6 / 74.4 | 4 / 12 / 0 | 2 |
| 2 | 1 | 208.6 / 95.9 | 208.6 / 97.3 | 207.6 / 84.2 | 1 / 0 / 0 | 1 |
| 2 | 4 | 206.5 / 66.1 | 211.9 / 87.6 | 201.0 / 75.5 | 2 / 1 / 1 | 3 |
| 2 | 16 | 206.9 / 68.7 | 211.7 / 92.9 | 201.4 / 74.7 | 2 / 13 / 1 | 2 |

- Maximum observed sampled RSS/heap including warm-up: **228,659,200 / 117,756,432 bytes** (218.1 / 112.3 MiB). Post-warm-up maxima: 222,212,096 / 109,786,080 bytes (211.9 / 104.7 MiB). These component maxima need not occur simultaneously.
- Measured phases: 419 ms warm-up; subsequent rounds 586/666/747 and 581/733/710 ms. 33–44 samples/phase. Provider latency is a short mocked gate, not a real 120-second provider session; no long-duration soak/cost simulation is claimed.
- Maximum successful response: 5,971 bytes warm-up, **53,223 bytes** for the 1,027-segment fixture. Total consumed HTTP body bytes per scenario: warm-up 43,445; round 1 396,241 / 445,899 / 546,727; round 2 396,241 / 445,899 / 447,915. Response size is data-dependent, not fixed by segment count.
- Pending credit observations: 10 MiB at concurrency 1; 30 MiB at concurrency 4; 30/25 MiB at concurrency 16. No scenario exceeds configured aggregate/active bounds. At completion and TTL every scenario has **0 active, 0 credits, 0 drafts, 0 receipts**. TTL uses the existing injected deterministic clock/scheduler; it is not a claim of waiting 15 minutes wall time. Existing real-timer/lifecycle unit coverage remains.
- Duplicate caller scheduling can change accepted/rejected/canceled counts; each source flight has exactly one mocked SDK generation. A canceled client does not cancel/release underlying provider work prematurely. No OOM, process crash, operation timeout, unhandled rejection or partial draft occurred in the measured run.
- Full fixture cleanup PASS using tracked IDs only, no database drop/volume removal. Development/production writes **0**, real Gemini calls **0**. No real customer transcript was loaded into these fixtures.

## Concrete blockers and smallest next fix

1. **No identified running development backend at the configured endpoint.** Establish a dedicated development-validation launcher with explicit environment/identity, loopback port, isolated DB guard and mock-only provider; keep the Atlas development URI untouched. Capture its actual PID/heap/baseline rather than substituting test-runner observations.
2. **No approved process/RSS headroom contract.** Specify and verify the launcher/container/Job Object memory ceiling and allowed co-located work, then repeat the bounded warm-up/1/4/16 sampling there. A Node old-space setting alone does not cap native RSS or reserve host RAM. Do not choose a production budget from these samples.
3. **No non-test end-to-end profile composition.** Implement a separately approved, explicit development-only composition that shares one controller/source policy across plan/preview/draft/approve/GET, and decide whether other grouped readers/TTS remain intentionally blocked or use the same verified source policy. Preserve production defaults and prevent a profile from bypassing response accounting or source/provenance checks.

No other speculative blocker is required for this decision. Native allocation precision remains a limitation to document/manage within the runtime headroom contract, not a reason to fabricate an exact heap ledger. First real English translation remains **NOT READY** until those concrete gates pass and a controlled real-generation authorization is supplied. Global flags stay OFF.

## Validation and changed files

- Focused mock/security/regression/benchmark: **99/99 PASS**.
- Real isolated MongoDB/application HTTP integration: **16/16 PASS**; warm-up and both concurrency rounds included; fixture cleanup PASS.
- Backend lint/typecheck/build and `git diff --check`: PASS.
- Changed: `backend/src/app.ts`, `backend/src/routes/index.ts`, `backend/tests/groups-mongodb.integration.ts`, this document, `docs/PROGRESS.md`, `infra/mongodb-integration/README.md`.

Use the existing explicit test URI/database variables and isolation guard from the integration README before executing the command above. Never use backend/.env as the fixture-write fallback. No real backend server was started against development, no flags were enabled globally, no Customer Web/MUSEUM/ADMIN07 code or data was changed, and no commit/push was made.
