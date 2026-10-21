# AI-TRANSLATE-05.6: controlled readiness (DENY)

**PARTIAL. Readiness works; real generation remains BLOCKED.** This is a new,
development-mode composition, not the old mock validation server relabeled as
production. It intentionally connects ONLY to the attested isolated MongoDB.
It cannot accept Atlas credentials, a real customer signing secret or AI keys.
Do not change this compose file to point at development/production.

## Implemented and verified

- Dedicated `narration-controlled-readiness` container, loopback `18082`, Node
  old-space 256 MiB, memory+swap ceiling 512 MiB, 1 CPU, restart disabled, bounded
  logs, non-root/read-only rootfs, no credential mounts. The permit-state named
  volume is separate from MongoDB and is retained on stop/recreate.
- Startup rejects credentials, `/app/.env`, wrong hostname/mode/URI, wrong DB,
  non-PRIMARY/replica identity or a process ID different from the verified host
  precheck. Build context is allowlisted; no `.env` is copied.
- Existing JWT verification, available/nondeleted User lookup, CUSTOMER RBAC
  and project-owner middleware are reused. Test signing keys are ephemeral,
  generated only inside this isolated runtime, never returned over HTTP.
- `GET /api/health`; authenticated `GET /api/projects/:id/preflight` only.
  All generation, approve, STT/TTS/video and unrelated routes are denied.
  External fetch is also denied. No grant can activate this server.
- 128 KiB scoped source capability pins project
  `6ad5c93a86cf95b7523704a5`, revision 1, vi -> en and digest
  `81638f2cb62e5f5f010853b047855cb72ace5ddbb2ca083890b51cdd2fe44906`.
  Ownership is checked first; exact source binding is checked before returning a
  plan. The normal/default 96 KiB cap and global flags remain unchanged.
- Same bounded cursor/planning and response ledger: 5 MiB estimated credits per
  caller/work item, aggregate 32 MiB, max active 4 and 2/user. Estimates are NOT
  exact heap/RSS/native accounting. Disconnect does not release unsettled work.
- Independent durable one-use fence: strict explicit grant, <=1-hour expiry,
  owner/source/input/plan/model/caps binding, immutable grant fingerprint per ID,
  exclusive-create claims, file+directory fsync before dispatch, separate stages
  max 1 metadata + 1 generation. Generation requires verified metadata. Failure,
  timeout or crash remains spent/uncertain; no reset/refund/retry path. LOW
  requires `lowExplicitlyApproved=true`. No real grant was issued here.

`OneUsePermitFence` is **not yet connected to the real Gemini transport**. Its
callbacks are a trusted integration boundary, not a network firewall, signed
authorization service, usage meter or guaranteed billing cap. Its directory
must be on durable Linux local storage, protected by the operator; do not restore,
edit or delete spent claims to retry. Unit tests use synthetic grants/callbacks,
not provider requests. Windows directory-fsync support is deliberately not
assumed; unsupported persistence fails closed before dispatch.

## Exact readiness commands (PowerShell)

From repository root; Docker and existing isolated MongoDB must be healthy:

```powershell
Set-Location C:\cnpm\multilingual-ai-narration\backend
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27029/multilingual_ai_narration_groups_test?replicaSet=narration-test-rs&directConnection=true'
$env:TEST_DATABASE_NAME='multilingual_ai_narration_groups_test'
$env:VALIDATION_MONGO_PROCESS_ID=(node --import tsx tests/docker-validation/host-precheck.ts)
if ($LASTEXITCODE -ne 0) { throw 'Isolation precheck failed' }
docker compose -f ../infra/backend-controlled-development/compose.yaml config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Compose validation failed' }
docker compose -f ../infra/backend-controlled-development/compose.yaml up -d --build --wait --wait-timeout 90
if ($LASTEXITCODE -ne 0) { throw 'Readiness startup failed' }
Invoke-RestMethod http://127.0.0.1:18082/api/health
docker exec narration-controlled-readiness node --import tsx --test tests/controlled-development.test.ts tests/controlled-development/http.ts
docker stop --timeout 15 narration-controlled-readiness
```

These commands cannot translate. The HTTP test independently verifies replica
identity before writing four synthetic Users and one synthetic Project, then
deletes and verifies only their tracked IDs. It does NOT create the real museum
project ID or copy real transcript data. It verifies 401, CUSTOMER/ADMIN 403,
wrong-owner 404, deleted-user 401, exact-project denial and blocked mutations.
The synthetic >96 KiB source is tested losslessly inside the capability, then
correctly rejected by the museum digest binding. A successful real museum HTTP
preflight has NOT been demonstrated against this isolated database.

## Validation / decision

- Focused unit/mock suite: 114 discovered, 111 PASS, 0 FAIL, 3 Linux-durability
  checks skipped on Windows. Actual Linux Docker readiness/permit/HTTP tests:
  8/8 PASS, 0 skips (includes those three durable-claim checks).
- Existing real isolated GROUPS_V1 MongoDB suite: 16/16 PASS, exact fixture
  cleanup verified. Transaction/preview/approve/GET remain tested with mock
  provider; no real translation created.
- Container health/listener verified; actual memory limit 536870912 bytes,
  NanoCPUs 1000000000, V8 total heap ceiling 271581184 bytes, OOM/restarts 0.
- No full real-provider load measurement or real-account availability claim.
  Gemini calls 0; development/production DB writes 0. Test fixture writes only.
- Backend lint/typecheck/build and diff-check PASS. Readiness container stopped
  cleanly after verification; test MongoDB, unrelated services and permit volume
  preserved. The actual museum source was NOT re-read from Atlas in this task;
  earlier source evidence is not treated as a fresh execution authorization.

Files created/changed in 05.6 (prior uncommitted files preserved):

- `backend/src/controlled-development/server.ts`
- `backend/src/services/translation/controlled-development.ts`
- `backend/src/services/translation/one-use-permit.ts`
- `backend/src/services/translation/group-admission.ts`
- `backend/src/services/translation/group-source-scope.ts`
- `backend/src/services/translation/bounded-source.ts`
- `backend/src/services/translation/group-translation.service.ts`
- `backend/tests/controlled-development.test.ts`
- `backend/tests/controlled-development/Dockerfile`
- `backend/tests/controlled-development/http.ts`
- `infra/backend-controlled-development/compose.yaml`
- `infra/backend-controlled-development/README.md`
- `docs/GEMINI_CONTROLLED_DEVELOPMENT_READINESS.md`
- `docs/PROGRESS.md`

## Exact remaining execution blockers / next smallest implementation

1. Wire the durable fence around the installed SDK's **actual** metadata and
   generation dispatch, including enforced API/model/output/timeout/response
   settings and optional LOW choice, numeric usage telemetry only. Prove that
   no direct transport path bypasses claims, and test process/container restart
   on the named volume. Current tests prove filesystem claims across independent
   objects, not full execution-container crash recovery.
2. Add a distinct real-development execution composition and explicit deployment
   attestation/credential provisioning outside ALL mock/test containers. Preserve
   the existing real JWT/available-user/ownership checks, scoped admission through
   reader/TTS, RAM draft lifecycle and existing atomic approve. No real execution
   command is published because that composition is not implemented; changing
   this readiness container's URI or enabling a flag is NOT a substitute.
3. Obtain authorized owner identity and review/freeze the full 74-group plan,
   canonical input digest and expiry. Recheck CURRENT source, exact revision/
   digest/coverage, en active, no conflicting English artifact or pending work
   immediately before dispatch. Readiness checks are not a revision lock;
   existing post-provider validation and atomic approval fences remain required.
4. Explicit separate user authorization for <=1 metadata and <=1 generation,
   acceptance of cost/truncation risk, and separate LOW approval if desired.
   Verify model access using ONLY that permitted metadata call; fail closed on
   errors. No hidden countTokens, fallback, retry, continuation or second AI check.
5. Complete draft -> human semantic review -> explicit approve validation in the
   execution composition using mocks first. On timeout/truncation/bad JSON/drift,
   stop with no partial READY. After ambiguous commit inspect read-only receipt,
   never blindly regenerate. No automatic TTS/video.

Model stays `gemini-3.8-flash`; LOW is only an unactivated candidate. Official
[model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
confirms low/medium/high support. [Standard pricing](https://ai.google.dev/gemini-api/docs/pricing)
rechecked 2026-10-21: $0.75/M input and $3.75/M output including thinking through
2026-12-31. Planning 12k input +8192 combined output ~= $0.03972. Conservative
model-max-input envelope (1048576*0.75 +8192*3.75)/1M = $0.817152 (~$0.82),
conditional on Standard/no tools/one request/current rates. Not a guaranteed
invoice ceiling; excludes tax/currency/account-specific pricing. Actual model
token counts, usage, key access and billing tier remain unverified.
