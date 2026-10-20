# AI-TRANSLATE-05.1 — response/waiter lifecycle and candidate development profile

Status: lifecycle accounting PASS in the explicitly injected isolated-test HTTP profile. Development activation remains BLOCKED. No production memory guarantee or production budget is approved. This document supersedes the listed response/waiter gaps in AI-TRANSLATE-05 where addressed below; its other deployment/native-memory caveats still apply.

## Audit / bounded vs estimated vs outside accounting

| Consumer/resource | Before | Explicit test profile now |
| --- | --- | --- |
| Plan | source service lease released before HTTP serialization | caller lease survives operation, serialization and response terminal event |
| Preview owner | retained source/provider/draft credit | separate caller lease plus retained provider/draft lease |
| Duplicate preview | unlimited waiting callers/clones | each admitted waiter uses a caller slot/credit before service work; one provider flight |
| Draft GET | clone without response lease | authenticated/owned `readDraft`, caller slot/credit through response |
| Approve, duplicate approve | shared transaction promise, uncounted callers | each caller admitted; shared approval action preserved; response lease through finish/close |
| Approved GET | full document + default source gate | owned read with MongoDB `$bsonSize` projection before hydration; same injected source policy and HTTP lease |
| Native chunks / V8 / sockets | not exactly accounted | still not exactly accounted; no invented heap/native-byte guarantee |

Hard test-profile bounds: source exact JSON 131,072 bytes, independent existing 10,000 segment / 1,000 group limits; stored Translation BSON 131,072 bytes before hydration; HTTP successful response JSON 262,144 bytes, 100,000 traversal nodes, depth 32. These independent limits may reject some otherwise valid large drafts; they do not truncate them. BSON bytes are not JSON bytes, and neither is heap size.

The HTTP ceiling is new **test-only** response policy, not an increase to the existing 128 KiB provider transport/draft caps. Those caps, 8,192 output tokens and 120-second provider timeout remain unchanged. The serializer counts actual UTF-8 JSON fragments and refuses overflow before sending any partial success. Individual string escaping and parts/join copies remain bounded by structural limits but are not exact heap accounting.

Estimated credit profile remains source 128 KiB / 5 MiB per lease / 32 MiB shared aggregate / 4 active callers / 2 callers per owner. Caller response and retained provider/draft each receive their own conservative 5 MiB credit. A preview can therefore require 10 MiB initially. Capacity may reject before the active-call ceiling: four independent previews plus four retained leases would cost 40 MiB, exceeding 32 MiB. This is intentional fail-closed admission, not a promise to run four generations simultaneously. Duplicate waiters add caller leases, not another AI invocation or draft lease.

## Implementation / lifetime

`groupProfileControllers(service, admission)` plus `createProjectRouter(handlers)` is explicit test-process injection, with the same JWT, CUSTOMER RBAC, project ownership and request validators as the default router. The default singleton/controllers/routes do not activate this profile; there is no `.env` activation or flag change. Constructor still requires `NODE_ENV=test`.

`groupResponseHandler` acquires before service/materialization, attaches finish/close/error listeners and keeps its operation lease until **both** underlying work and response terminal state settle. Closing a client or destroying a stalled socket does not release an active Mongo/provider operation. A stalled response socket is destroyed after 120 seconds; no claim is made that this cancels its provider work. An underlying operation that never settles retains a bounded slot indefinitely and causes safe capacity rejection, rather than fictitious release/retry.

AsyncLocalStorage joins nested service operations to the same owner response scope, avoiding duplicate active-slot accounting. Retained provider/draft bytes are charged separately. The scope token becomes inactive on release, so a detached callback cannot borrow an expired slot. Different owners cannot share the scope. All releases are idempotent.

Success keeps retained draft credit until active TTL; failure/overflow keeps no draft and releases only after actual settlement. Failed receipts retain the original bounded-count retry protection. Early draft expiry can release draft credit while an unfinished HTTP response still holds its independent caller credit. GET/approve operations use the same controller and aggregate ceiling. Direct backend/internal consumers outside the injected HTTP surface are not automatically reconfigured; raw synchronous compatibility APIs do not create persistent HTTP leases.

Approval's ownership checks, transactional source revision/digest revalidation, transcript fence, unique-key/idempotency logic and rollback remain. Legacy translation safety is unchanged. Profile GET rejects wrong format, missing ownership, stale provenance and oversized records; it never treats legacy/UNKNOWN artifacts as CURRENT.

## Full-path evidence (synthetic data only)

Real isolated MongoDB replica set, actual JWT/ownership/validation/controller/service, installed Gemini SDK and bounded streaming fetch adapter. SDK HTTP metadata and generation responses are mocked locally; no request reaches Gemini. Each synthetic source has 1,027 segments; IDs/text/times/revision/digest/coverage are preserved through plan/preview/approve/GET. No real user transcript is used as a test fixture.

One measured run, bytes; scenarios run in one integration process without isolated-GC peak profiling:

| Offered concurrency | SDK mock generations | Successful preview responses | Capacity rejection | Client cancellation | Pending credits | Baseline heap | Pending heap | Completed heap | Completed RSS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 1 | 0 | 0 | 10,485,760 | 166,204,544 | 171,795,880 | 169,046,176 | 302,243,840 |
| 4 | 3 | 2 | 1 | 1 | 31,457,280 | 231,610,768 | 245,884,232 | 245,545,640 | 379,588,608 |
| 16 | 2 | 3 | 13 | 0 | 26,214,400 | 281,287,400 | 289,658,328 | 303,006,304 | 438,013,952 |

At concurrency 16 a duplicate shares a generation; attempted cancellation can affect an already-rejected request, hence zero canceled responses in that sample. Counts depend on request scheduling, while upper limits, single-flight, release and zero residual credits are asserted. Fixture construction, Mongoose, mock instrumentation, HTTP clients, prior scenarios and GC contribute to the growing baseline; these figures are not clean per-request costs, deterministic peaks or a production headroom claim.

The suite also exercises authenticated draft GET, atomic approve, grouped GET, cross-owner/unknown-user rejection, oversized-record GET/approve rejection before hydration, unchanged default gate, concurrent approval/edit races, rollback and active TTL. Fixtures are tracked and removed only from the guarded test DB. No development/production writes or AI calls.

## Real museum source: read-only preflight PASS

Explicit opt-in `backend/tests/read-only-museum-source.preflight.ts` reads only project `6ad5c93a86cf95b7523704a5` from configured development database `multilingual_ai_narration`; it refuses a different database/environment. It imports no application startup/models/provider, disables auto-index/create and issues no writes. It uses bounded projections/cursor, source validation and a final revision recheck, not a replay through a mutation endpoint.

Observed: Vietnamese, revision 1, 1,027 segments, 74 candidate groups, exact snapshot **105,958 bytes**, intact digest/ordered coverage/fullText. Candidate 128 KiB admission PASS; unchanged 98,304-byte default admission FAIL. This is source admission only, not provider token/output feasibility, semantic translation verification or approval to call AI. No transcript text/credentials are printed. Read-only script execution sets the collector's lab environment only in its own process, not global backend flags.

## Actual runtime/development readiness: BLOCKED

Configured `.env`: development, port 8080, GROUP_TRANSLATION_ENABLED=false, no NODE_OPTIONS. Diagnostic Node 22.23.3 reports V8 heap ceiling 4,345,298,944 bytes. Windows Node working-set observations were approximately 33.2 and 37.7 MB; sanitized process inspection did not identify either command as the backend server. These are not measurements of a verified backend deployment under load. No backend OS/container memory ceiling, steady-state application baseline or reserved headroom has been established. Infrastructure contains the standalone demo and isolated MongoDB configurations, not an approved constrained backend deployment profile.

Remaining outside complete memory accounting:

- Native network/TLS/SDK/driver chunks before JS checks, socket/kernel buffers, allocator/GC behavior and BSON/JSON temporary representations. The application also parses request bodies up to 1 MiB before route-level admission; test load used a 128 KiB body parser.
- Authentication/ownership/metadata queries before the profile handler, other routes/workloads and error receipts; no global connection/body-parser admission or cross-process coordinator exists.
- The HTTP and stored-BSON ceilings are finite data bounds, not exact 5 MiB heap guarantees. Response success may already be committed to the DB when delivery subsequently fails; existing approve idempotency handles retrying delivery without another AI call.
- Default application grouped readers/TTS/workflow consumers still use the default 96 KiB source gate. The injected test GET validates the larger profile, but this does not silently reconfigure all real downstream consumers.

Next before first real English translation: establish/verify a constrained development backend runtime and headroom; approve a development-only composition that consistently injects the shared controller/source policy across all intended grouped consumers, with fail-closed handling for remaining defaults. Repeat the full-path load profile there. Keep flags OFF and do not call Gemini until that gate and explicit controlled generation authorization pass. Production remains blocked regardless of development verification.

## Validation / files

Focused regression/benchmark: **99/99 PASS**. Real isolated MongoDB integration: **15/15 PASS**, fixture cleanup verified. Backend lint/typecheck/build and `git diff --check`: PASS. Real museum read-only preflight: PASS. Run only explicit safe focused files and `tests/groups-mongodb.integration.ts` with the existing explicit URI/database isolation guard; no ordinary DB-writing suite against development. Read-only museum preflight is a separate explicit diagnostic.

Files touched for AI-TRANSLATE-05.1:

- `backend/src/services/translation/group-admission.ts`
- `backend/src/services/translation/group-draft-store.ts`
- `backend/src/services/translation/group-translation.service.ts`
- `backend/src/services/translation/group-response.ts`
- `backend/src/controllers/translation.controller.ts`
- `backend/src/routes/project.routes.ts`
- `backend/tests/group-response.test.ts`
- `backend/tests/groups-mongodb.integration.ts`
- `backend/tests/read-only-museum-source.preflight.ts`
- `docs/GROUPS_V1_RESPONSE_LIFECYCLE.md`
- `docs/GROUPS_V1_ADMISSION_POLICY.md`
- `docs/PROGRESS.md`
- `infra/mongodb-integration/README.md`
