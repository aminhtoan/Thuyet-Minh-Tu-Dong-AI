# AI-TRANSLATE-05 — admission and source policy

Follow-up: [AI-TRANSLATE-05.1 response lifecycle](GROUPS_V1_RESPONSE_LIFECYCLE.md) implements isolated-test caller/waiter, GET/approve and serialization accounting. This document records the earlier baseline; development/production activation is still blocked as detailed in the follow-up.

Status: PARTIAL. Explicit isolated-test admission/source policy verified; complete runtime memory admission remains BLOCKED. Global flags remain OFF. No production budget is approved.

## Runtime evidence and scope

Observed on this Windows test host: Node 22.23.3, V8 heap limit 4,345,298,944 bytes, host RAM 16,948,453,376 bytes, NODE_OPTIONS absent in the diagnostic shell. This is NOT evidence of an application deployment/container memory allowance. No backend container memory limit, production baseline, other workload headroom or production concurrency allowance has been established. The MongoDB container limit is not a backend memory budget.

The default application singleton has no test policy injected. Source remains 98,304 bytes; draft and provider transport caps remain 128 KiB, output remains 8,192 tokens and timeout remains 120 seconds. No environment file, flag, model, provider, frontend or schema changed. Existing process-local draft capacity is 50 receipts, TTL 15 minutes; it is not a deployment-wide reservation.

## Explicit lab profile (not production configuration)

`new GroupAdmission(policy)` validates `NODE_ENV=test`; pass the same controller as the third `GroupTranslationService` constructor argument. Tests explicitly supply these values; there is no environment-driven activation or development fallback:

| Setting | Lab value |
| --- | ---: |
| Source exact JSON byte ceiling | 131,072 |
| Estimated credit per admitted operation | 5,242,880 (5 MiB) |
| Aggregate retained/pending credits per shared controller | 33,554,432 (32 MiB) |
| Active operations | 4 |
| Active operations per owner | 2 |

Credits are a configurable experiment, not measured allocation sizes. The lab floor `32 × sourceBytes + 8 × 128 KiB` deliberately allows multiple expanded source/planning/response/draft representations, but is NOT a proven upper bound on JavaScript heap or native memory. The 128 KiB test source ceiling is supported by regression and isolated MongoDB tests below, not an assertion that arbitrary 128 KiB inputs fit provider output/token budgets. The lab profile retains at most six 5 MiB receipts under its 32 MiB credit ceiling, and at most four active operations; draft retention may reject a new request even when no provider is active.

All configured numeric fields must be positive safe integers. Invalid/test-external configuration fails closed. `collectBoundedSource` rejects custom byte ceilings outside test and above 128 KiB. Exact byte accounting includes UTF-8, JSON escaping, delimiters and the complete header/segments. The existing independent 10,000 segment and 1,000 group limits remain. No partial source, compaction, truncation or altered digest is returned.

## Lifecycle and authorization

- Planning acquires before source loading and releases when its service operation settles. Its returned HTTP response is NOT leased.
- Preview checks ownership/project state/active target language before cache lookup. Full source loading, validation, planning and provider work run inside the single-flight create closure, after reservation.
- Key includes owner, project, target and source revision. Identical requests share one reservation and provider invocation; changed body on the same key returns `TRANSLATION_DRAFT_CHANGED` before full plan validation. A fresh invalid plan still returns the mapping error. Neither path calls AI.
- Pending reservation persists across client disconnect, elapsed TTL or an observer timeout until the underlying promise actually settles. No synthetic cancellation claims to free an SDK operation.
- Success releases active/per-user slots, retaining conservative full credit while cached draft/promise exists. Active TTL removes both and releases credit idempotently.
- Failure/overflow/expiration releases credit after settlement, stores no draft, and retains the bounded-count failed receipt to prevent automatic retries. Receipt error/stack memory is not byte-reserved.
- Cached preview checks current transcript revision before returning. Approval still revalidates ownership, revision/digest and transcript write fence inside the existing transaction. No authentication/ownership/legacy alignment rule is bypassed.

The controller must be shared across the services/stores it accounts for. Multiple controllers or processes do not share capacity. This injection is for trusted isolated test runners, not a public API capability or permission to use a development database.

## Evidence

Synthetic source, no real transcript used:

| Segments | Snapshot bytes | Test profile |
| --- | ---: | --- |
| 100 | 10,139 | accepted |
| 1,027 | 106,109 | accepted, default still rejects |
| 2,000 | 208,411 | rejected |
| 5,000 | 525,842 | rejected |

Few segments with very long text are also rejected. Exact 131,072-byte boundary passes; adding Unicode beyond it rejects. Accepted sources preserve every ID/text/timestamp/sequence, canonical digest and ordered group coverage. Counts are test fixtures, not hardcoded admission rules or promised video lengths.

Concurrency 1/4/16 accepts 1/4/4 and rejects 0/0/12 for distinct owners; same-owner active limit and retained-draft aggregate exhaustion have separate tests. Store and HTTP mock tests exercise single-flight, canceled HTTP client, late underlying completion, overflow/failure, active TTL and idempotent cleanup. The provider/SDK byte-bound and timeout behavior retain existing mock coverage.

One isolated HTTP sample (bytes, not deterministic limits):

| Offered concurrency | Baseline heap | Pending heap | Completed heap | Completed RSS |
| --- | ---: | ---: | ---: | ---: |
| 1 | 15,565,816 | 13,891,424 | 15,294,768 | 79,769,600 |
| 4 | 15,626,064 | 16,504,416 | 16,148,320 | 82,939,904 |
| 16 | 16,297,416 | 18,100,480 | 22,000,272 | 101,261,312 |

GC, previous scenarios, HTTP client/server and test framework contribute to samples. They neither match credits nor prove peak memory. Integration uses only the verified `multilingual_ai_narration_groups_test` replica set at loopback port 27029, synthetic fixtures and mock provider. Larger-source test exercises actual bounded cursor, plan/preview/atomic approval/provenance and TTL release. Default gate remains unchanged before/after. Cleanup uses tracked fixture IDs only.

## Remaining blockers / next step

This is bounded admission of known test operations, NOT complete process memory admission:

- Duplicate waiters, draft GET clones and JSON/HTTP response copies have no fan-out/response-lifetime lease. Planning releases before HTTP finish; approve/read concurrency is not admitted separately.
- Request JSON parsing, cheap metadata queries, BSON/driver/SDK/native transport chunk allocation, JSON/digest temporary copies, error receipts, GC and unrelated work remain outside exact byte reservation. A bounded transport body does not bound an incoming native chunk before it arrives.
- No process-wide OS memory limit, full application peak/headroom profile, multi-process coordinator or production concurrency budget has been verified.
- Default grouped GET/TTS use the default source gate. A test-only larger approval does not enable larger artifacts across real application consumers; this is intentional fail-closed behavior, not production readiness.

Next: design and test bounded waiter/HTTP response/approve-read lifetimes, then profile the actual deployed backend under a declared OS limit and shared controller. Separately approve a development-only end-to-end profile across grouped readers/consumers. Keep global GROUPS_V1 flags OFF until those gates and an explicit controlled real English-generation approval are satisfied. No real Gemini request or development/production write was made here.

## Validation

Focused regression/benchmark: 92/92 PASS. Isolated MongoDB suite: 14/14 PASS, including test-profile larger source and unchanged default gate. Backend lint/typecheck/build PASS. See execution report for final diff check. Never use the ordinary DB-writing test suite against development. Integration commands are documented in `infra/mongodb-integration/README.md`.
