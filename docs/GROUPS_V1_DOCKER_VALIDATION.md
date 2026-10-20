# AI-TRANSLATE-05.3 — Docker development runtime validation

**PASS for the dedicated mock-only Docker validation composition. Ready for read-only English translation preflight; not authorized/configured for real generation.** Production/default settings stay unchanged.

## Why port 8080 was absent

Previous validation started temporary `app.listen(0)` test servers and closed them; it did not run `npm run dev`/`src/server.ts`. Windows inspection found no backend listener at 8080. There is no evidence that a production backend crashed or that 8080 should have been running; the reason an externally started development server was not running cannot be inferred without its logs. This task provides an explicit separate launcher rather than starting Atlas-backed defaults.

## Runtime / isolation evidence

- New container `narration-backend-validation`, project/image of the same name, Node **22.23.1** Linux (Windows focused tests use 22.23.3), PID 1, actual HTTP port **8081**, mapped **127.0.0.1:18081**. Health endpoint returned HTTP 200 / database connected. No unrelated container changed.
- Docker inspect and cgroup **v1** confirmed memory **536,870,912 bytes**, total memory+swap equal to that limit, CPU quota **1,000,000,000 NanoCPUs**, no restart policy. Node old-space command **256 MiB**; measured total V8 heap ceiling **271,581,184 bytes** (~259 MiB), not an RSS limit. Runner old-space ceiling is independently 128 MiB.
- Host inspection: Docker Engine 29.9.1 Linux, 12 CPUs, Docker VM memory 8,213,676,032 bytes; Windows free physical memory 1,997,556 KiB (~1.90 GiB). Existing containers used approximately 675 MiB combined. The temporary 512 MiB/1 CPU constraint limits validation demand; neither free RAM nor sampled RSS is a guaranteed allocation upper bound or approved production budget.
- Existing host isolation guard verifies the dedicated Mongo container/image/project/volume/network/port and PRIMARY/set/process identity. Extended host check verifies the backend identity, limits, network and expected processId **before fixture runner execution**. Container guard independently checks exact URI/database, cgroup ceiling, absence of `.env`, expected hostname and matching Mongo PRIMARY/processId. Attestation is regenerated on each start, not a reused credentials file.
- Container connects directly to `narration-groups-test-mongodb:27029`, `multilingual_ai_narration_groups_test`, `narration-test-rs`, `directConnection=true`. Replica-set advertised localhost is not used for discovery; no host/replica-set reconfiguration occurred. The existing external test bridge is reused, Mongo is not attached to another network.
- No host/credential/Docker socket mounts; read-only rootfs, non-root, cap-drop and tmpfs. Build allowlist excludes `.env` and uploads. Loopback-only port, bounded logs. Mock provider transport only; global fetch is rejected in server, keys are non-real/empty, and validation route allowlist blocks real STT/TTS/media/auth mutations. No development URI fallback or AI call.

## Consumer policy synchronization

| Consumer | Validation behavior |
| --- | --- |
| Plan | shared admission, exact 128 KiB source gate before materialization, caller/response lifetime |
| Preview | shared admission, complete IDs/text/timestamps/revision/digest; one provider flight per source key |
| Duplicate preview | each caller charged; provider/draft reservation shared |
| Draft/approve | same cache/controller, bounded clone/response; transactional source fence and review checks unchanged |
| Approved GET / compatibility reader | shared source scope plus bounded Translation BSON before hydration; CURRENT/review/coverage verified; legacy format fails closed only within profile |
| TTS start/completion | existing `loadSource` calls inherit the admitted source scope; request and completion Translation reads use the same bounded helper; provenance/review validation unchanged |

Cause of the earlier 96 KiB reader/TTS mismatch: they invoked default `loadSource`/`groupedDto` outside the injected service profile. The new `AsyncLocalStorage` source scope follows the admitted operation and expires when it settles; detached callbacks cannot borrow a finished profile. Outside this test-only scope the default remains **98,304 bytes**, with unchanged production auth/model/routes/provenance rules. No hardcoded museum counts or project IDs are used for admission.

Candidate credits remain **5 MiB per caller lease plus a separate 5 MiB retained provider/draft lease**, **32 MiB aggregate**, **4 active / 2 per owner**. This does not promise four independent providers simultaneously. Draft/transport 128 KiB, output 8,192 tokens and provider timeout 120 seconds unchanged. HTTP JSON ceiling 256 KiB; stored Translation BSON ceiling 128 KiB. The Docker test uses actual 3-second wall-clock TTL for timely cleanup; production cache TTL remains 15 minutes.

Reader/TTS policy evidence:

- Docker authenticated policy check exercises compatibility `getTranslation`, the exact `assertApprovedCurrent/loadSource` validation used at TTS start, and the same validation inside a real Mongo transaction for completion. CURRENT grouped source passes; after fixture transcript revision changes both reader and policy checks reject with 409. Wrong owner returns 404. No narration/result, audio file, speech provider or processing job is created.
- Real isolated MongoDB integration additionally calls the actual narration `generate` entry under the scope: it passes the larger CURRENT source and stops at the deliberately missing fixture media (`MEDIA_NOT_FOUND`) **before** voice/job/provider/file work. ProcessingJob count remains zero. Outside scope, default source gate still rejects the larger fixture. Scoped legacy/unknown format rejects rather than entering an unbounded compatibility path.
- Existing mocked terminal/stale tests cover current/stale/unknown downstream rules. This is full source-policy validation, not an end-to-end real TTS success test or a claim that a 5-minute translation fits the existing TTS text-length limit.

## Actual Docker load evidence

Final image run: bounded warm-up (100 segments), then two rounds of offered concurrency 1/4/16 using synthetic 1,027-segment fixtures. Server sampled every 25 ms; runner independently observed its metrics. Driver uses real loopback HTTP/JWT/ownership, MongoDB and mocked Gemini GroupTransport; no real user content is present. Prior implementation run also passed; table below records final rebuilt image run only.

| Round | Offered | Preview 200 / 503 | Mock generations | Baseline RSS / heap bytes | Peak sampled RSS / heap bytes | Final RSS / heap bytes |
| --- | ---: | --- | ---: | --- | --- | --- |
| Warm-up | 1 | 1 / 0 | 1 | 140292096 / 43461880 | 142155776 / 46399272 | 140455936 / 44207936 |
| 1 | 1 | 1 / 0 | 1 | 147562496 / 51785424 | 153423872 / 55856824 | 153423872 / 45236960 |
| 1 | 4 | 3 / 1 | 3 | 154046464 / 53990560 | 156254208 / 57108904 | 156254208 / 47709152 |
| 1 | 16 | 2 / 14 | 2 | 156286976 / 55046248 | 156581888 / 57079824 | 156581888 / 47268616 |
| 2 | 1 | 1 / 0 | 1 | 156602368 / 55176032 | 156897280 / 55176032 | 156696576 / 42431536 |
| 2 | 4 | 3 / 1 | 3 | 156717056 / 49561560 | 159182848 / 54736872 | 156987392 / 49884512 |
| 2 | 16 | 2 / 14 | 2 | 157003776 / 43865472 | 157069312 / 55276536 | 157069312 / 50483240 |

- Backend peak RSS **159,182,848 bytes (~151.8 MiB)**, heap **57,108,904 bytes (~54.5 MiB)**. Component peaks need not coincide; sampling does not capture instantaneous peaks.
- Cgroup kernel peak at final inspection **238,809,088 bytes (~227.7 MiB)**, below the verified 512 MiB ceiling. This includes runner, healthcheck processes, native buffers/tmpfs/cache, not just PID 1. Measured unused ceiling is not a guaranteed reserve for arbitrary inputs or other workloads.
- Warm-up elapsed 3,836 ms; rounds 4,091/4,217/4,331 and 4,155/5,121/4,439 ms. Includes 3.3 seconds waiting for real TTL. Synthetic provider delay 200 ms; not a long real-provider soak or unlimited stress test.
- Maximum response **53,667 bytes** (warm-up 6,019). All source groups/IDs covered. Admission rejection is expected at capacity; every source flight is generated once even with duplicates.
- Every scenario ends with **0 active, 0 reserved credits, 0 drafts, 0 receipts**. All seven reader/TTS CURRENT checks pass before deliberate stale edits. Exact fixture cleanup verified.
- cgroup `oom_kill=0`, `under_oom=0`, failcnt **0**. Docker `OOMKilled=false`, restart count **0**. No OOM/crash/timeout in final measured runtime; stopped gracefully with exit **0** after evidence capture. Other services and MongoDB volume remain intact.
- Early setup attempts failed closed for a Dockerfile build-context entitlement and cgroup-v2-only assumption; both were corrected without broadening host access. A synthetic JWT fixture omitted existing `type=access`; auth correctly rejected it, fixtures were cleaned, and the fixture was corrected without weakening auth. These are not hidden successful load runs or real AI retries.

## Real museum source preflight

Separate Windows read-only diagnostic again confirmed database `multilingual_ai_narration`, project `6ad5c93a86cf95b7523704a5`, source vi, revision 1, **1,027 segments / 74 groups / 105,958 bytes**, intact digest/coverage. Candidate 128 KiB admission PASS; default 96 KiB admission remains FAIL. No transcript copied to the container/test fixtures, no credentials or text printed, no development writes. No claim of translated output or semantic approval.

## Validation / decision / remaining scope

- DOCKER BACKEND / HTTP LISTENER / MEMORY LIMIT: **PASS / PASS / VERIFIED** in this isolated composition.
- GROUPS_V1 PROFILE CONSISTENCY / READER-TTS POLICY / HTTP LOAD: **PASS** for the scoped mock-only validation composition. Production and ordinary development remain untouched/off.
- Focused mock/security/translation/TTS/source-scope tests **107/107 PASS**; real isolated MongoDB integration **16/16 PASS**; Docker load **7/7 scenarios PASS**; fixtures cleaned. Backend lint/typecheck/build, Compose config and `git diff --check`: **PASS**. Independent guarded read confirmed projects/transcripts/segments/translations/jobs/users/languages all have zero residual documents after cleanup.
- Development/production DB writes **0**; real Gemini/STT/TTS calls **0**; no index/schema/migration changes outside test setup; no Customer Web/MUSEUM/ADMIN07 changes, commit or push.

Ready for **read-only English translation preflight/planning** with the source/profile evidence above. Real English generation remains **NOT RUN**: this environment intentionally refuses Atlas/development fixtures and has no real provider credentials. Before any real call, separately approve the exact real-project/DB mutation scope and a controlled metadata/generation budget, review group boundaries, and choose a non-mock composition without reusing test JWTs/fixtures. Do not merely switch this container's DB/keys or turn global flags on. Human semantic review is still required before approve.

Native memory is bounded only by the container hard ceiling, not exact admission-byte accounting. The process-only credit estimates, pre-admission parser/auth work, arbitrary many clients, larger/multibyte outputs, production multi-process coordination and long real-provider latency are not certified by these small bounded tests. The isolated route allowlist and single-purpose workload are part of the verified assumptions, not a general production safety result. TTS 4,096-character guard remains unchanged.

## Files changed in this step

- New `backend/.dockerignore`, `backend/src/services/translation/group-source-scope.ts`.
- Updated `group-admission.ts`, `group-translation.service.ts`, `translation-processing.service.ts`, `narration.service.ts` for scoped source/bounded artifact readers, preserving defaults.
- Updated `backend/tests/group-response.test.ts`, `backend/tests/groups-mongodb.integration.ts`.
- New `backend/tests/docker-validation/{Dockerfile,isolation.ts,host-precheck.ts,server.ts,load.ts}`.
- New `infra/backend-validation/{compose.yaml,test.env.example,README.md}`, this report; updated `docs/PROGRESS.md`, `infra/mongodb-integration/README.md`.
- Existing uncommitted `app.ts`, API route factory, previous runtime report and other preceding work were retained, not reset or committed.

Start/verify/load/stop commands: [validation README](../infra/backend-validation/README.md). Never use `down -v`, database drop, volume prune or development URI fallback.
