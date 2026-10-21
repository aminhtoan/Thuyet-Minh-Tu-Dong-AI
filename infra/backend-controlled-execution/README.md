# AI-TRANSLATE-05.7 — one-use controlled Gemini dispatch

Implementation/mock validation PASS; **real generation is NOT enabled or run**.
This supersedes 05.6's missing-SDK-dispatch/execution-composition blockers.

## Separation / limits

| Runtime | Identity / port | Credentials / network / state |
| --- | --- | --- |
| Old readiness | narration-controlled-readiness / 18082 | unchanged, isolated test DB, provider DENY |
| Mock durability | narration-dispatch-durability | network NONE, no secrets, synthetic permit volume ONLY |
| Mock crash recovery | narration-dispatch-crash | same isolated synthetic volume, no secrets/network |
| Real execution composition | narration-controlled-execution / 18083 | defaults LOCKED; only explicit later approval may mount real secret files and connect to pinned Atlas deployment |

Execution image contains source/tests/dependencies, **not** `.env`, keys, uploads
or customer media. Real credentials are Docker read-only secret file mounts at
execution time only, never image layers or mock/readiness mounts. Unconfigured
committed defaults contain no secrets and are rejected if someone attempts to
arm them. LOCKED startup does not read credentials or connect MongoDB/SDK.

Execution limits remain 512 MiB RAM+swap, 1 CPU, Node old-space 256 MiB, 128 PIDs,
non-root/read-only rootfs, restart=no, bounded logs. Host binding is loopback only.
Source profile: 128 KiB, 5 MiB estimated credits, aggregate 32 MiB, 4 active and
2/user. These credits are estimates, not exact heap/native-memory accounting.
Default application source cap stays 96 KiB; global GROUPS_V1 flags stay OFF.

## Dispatch fence (actual installed SDK, not just an application mock)

- A strict approved permit binds owner, pinned project/revision/digest/vi->en,
  canonical provider input, ordered group IDs, exact model/API/caps/expiry and
  explicit LOW choice. Real execution additionally requires deploymentId binding
  to the approved SRV hostname, database and actual replica set.
- File `wx` claims and file+directory fsync occur **before** SDK calls. Metadata
  max 1; generation max 1; verified metadata required first. Claims are never
  refunded, deleted or reset after timeout/crash/HTTP error/ambiguous delivery.
  An immutable grant fingerprint prevents reusing an ID with different settings.
- A per-SDK-invocation network gate also allows only one GET and one POST to the
  exact HTTPS Developer API v1beta model paths. Redirects, query parameters,
  unexpected endpoints/methods and extra SDK fetches are rejected. SDK attempts=1
  (zero retries); no countTokens, fallback, tools, queue or batching.
- Controlled runtime denies global fetch; only the fenced SDK's captured native
  fetch can reach the provider. The normal unfenced GROUPS_V1 provider is denied
  throughout the execution process, including outside active request scope.
- Output cap 8192, shared 120-second signal, response byte cap 128 KiB, draft cap
  128 KiB, one candidate, same system instruction/schema/map validation. Default
  thinking is unchanged; LOW is serialized ONLY when explicitly approved in the
  permit. Numeric token usage only is emitted, never raw response/reasoning/text.
- Each stage rechecks available CUSTOMER owner, ownership, project state, active
  en, no active project jobs, no conflicting English artifact, bounded CURRENT
  source/revision/digest and exact ordered coverage/input/group hashes. The normal
  preview still rechecks revision after generation; approve still uses existing
  revision fence/transaction/review digest. A pre-dispatch read is not a DB lock;
  later edits must (and do) fail preview/approval, not become READY.
- This one trial freezes the existing candidate-group plan. Merged/changed group
  memberships do not match the approved canonical input and fail closed before
  metadata; no billing for a silently changed plan is authorized.
- Drafts remain in RAM with existing TTL/single-flight/admission lifecycle. A
  restart may lose the draft but MUST NOT regenerate it. All STT/TTS/video and
  unrelated routes are denied. Approval requires explicit reviewed body AND
  `X-Controlled-Review` equal to the exact outputDigest; it is never automatic.

The local operator/root/Docker administrator is trusted: protect permit storage,
never restore an old volume backup, edit claims or issue a new permit to retry an
uncertain attempt. This is single-host durable fencing, not distributed consensus,
a signed permission service, an exact memory guarantee or a provider billing cap.

## Validation evidence (2026-10-21)

- Existing focused regression: **107/107 PASS**.
- Linux actual-SDK-fetch-mock + permit/readiness + execution HTTP: **14/14 PASS**,
  0 skips. Covers 16 concurrent attempts, duplicate/reopened claims, missing scope,
  unfenced provider denial, LOW/default, stale source, changed input, 429/timeouts,
  invalid/truncated/missing/oversized JSON and no partial draft.
- Existing real isolated MongoDB GROUPS_V1 integration: **16/16 PASS**, including
  atomic approve/GET, rollback, concurrent approvals/edit races and ownership.
  Exact fixture cleanup verified. No user transcript copied to fixtures.
- Named-volume restart and abrupt kill/start: boot count 1 -> 4, total mock SDK
  dispatch stays 2 (1 metadata + 1 generation). A separate crash-window test
  durably spends generation, then is killed BEFORE the stand-in native POST;
  restart refuses both repeat metadata and generation, mock dispatch remains
  metadata=1 / generation=0. Synthetic state is cleaned exactly, never volume roots.
- Real execution composition started **LOCKED** with unconfigured placeholders:
  HTTP health PASS, actual memory=536870912 bytes, CPU=1000000000 NanoCPUs,
  OOM/restarts=0. No real credentials loaded. Containers created here are stopped
  after checks; existing MongoDB and unrelated resources/volumes are preserved.
- Real museum read-only preflight PASS: revision 1, 1027 segments, 74 groups,
  105958 bytes, exact pinned digest and ordered full coverage; en active,
  English records=0, active translation jobs=0, available CUSTOMER owner confirmed.
  Binding output is UNAPPROVED, not a permit. No content/secret printed.
- Backend lint/typecheck/build, both Compose configs, diff-check: PASS.
- Gemini calls=0, real drafts=0, development/production writes=0. Only synthetic
  isolated MongoDB fixtures and mock permit files were created/cleaned.

No claim of real model-key/quota access, actual token usage or successful real
translation is made. Only the separately authorized metadata call can test access.

## Commands safe now (no real credentials or provider)

From repository root, with Docker available:

```powershell
$env:CONTROLLED_EXECUTION_ENABLE='false'
$env:CONTROLLED_CREDENTIALS_FILE=(Resolve-Path infra/backend-controlled-execution/credentials.unconfigured.json).Path
$env:CONTROLLED_PERMIT_FILE=(Resolve-Path infra/backend-controlled-execution/permit.unconfigured.json).Path
docker compose -f infra/backend-controlled-execution/compose.yaml config --quiet
docker compose -f infra/backend-controlled-execution/compose.yaml up -d --build --wait --wait-timeout 90
Invoke-RestMethod http://127.0.0.1:18083/api/health # must say LOCKED
docker stop --timeout 15 narration-controlled-execution
```

Mock tests: `docker compose -f infra/backend-controlled-execution/validation.compose.yaml up -d --build --wait`;
then `docker exec narration-dispatch-durability node --import tsx --test tests/controlled-execution.test.ts tests/controlled-execution/http.test.ts tests/controlled-development.test.ts`.
The mock compose file has no secret definitions and network_mode=none. Never add
real credentials/Atlas to that file. Tests intentionally require Linux directory
fsync; Windows-skipped cases are not a substitute for these executed Linux tests.

## Separately approved real execution — DO NOT RUN YET

There is no outstanding known implementation blocker in the tested dispatch
scope. Preconditions are an explicit operator/user approval, protected credentials
and fresh source/identity/billing verification. Real-deployment startup is not
claimed verified here; it will fail closed before accepting requests on mismatch.

1. Accept at most **one metadata + one generation**, no retry, fixed model
   gemini-3.8-flash and current output/truncation/cost risk. LOW requires separate
   explicit approval; otherwise keep DEFAULT/false. No TTS/video is authorized.
2. Run the read-only binding command from backend (no Gemini calls):

   ```powershell
   node --import tsx tests/read-only-museum-source.preflight.ts --translation --permit-binding
   ```

   It must PASS and end with permitBinding=UNAPPROVED. Confirm project/owner,
   source revision/digest/coverage, inputDigest, ordered group planDigest and
   deploymentId. All jobs must be idle, not just translation jobs (execution
   checks all types again). Re-run if anything changes. Do not paste source text.

3. Outside the repository/build context, create protected operator-owned files:
   - `controlled-credentials.json`: strict fields `mongoUri`, `databaseName`
     (`multilingual_ai_narration`), `expectedSrvHost` (exact URI hostname),
     `expectedReplicaSet` (from binding), `model` (`gemini-3.8-flash`),
     `geminiApiKey`, existing development `jwtAccessSecret`/`jwtRefreshSecret`,
     `corsOrigins` (explicit Customer origin list). Keys/secrets are never literal
     command arguments. URI must explicitly include the database path and use
     mongodb+srv; existing backend/.env is never changed or mounted.
   - `controlled-permit.json`: strict grant shown below, populated only after
     explicit approval with fresh binding values. <=1-hour validity, UUID ID.
     DEFAULT/false is the default; LOW/true ONLY if explicitly approved. Review
     current rates/account tier; $0.82 is the earlier conditional token envelope,
     not a provider-enforced invoice ceiling (see 05.5 documentation).

   Required grant keys (no extra keys):

   ```json
   {
     "id": "<new UUID; do not issue another after an uncertain attempt>",
     "approval": "EXPLICIT_USER_APPROVAL",
     "ownerId": "<verified CUSTOMER owner ID>",
     "projectId": "6ad5c93a86cf95b7523704a5",
     "revision": 1,
     "sourceDigest": "81638f2cb62e5f5f010853b047855cb72ace5ddbb2ca083890b51cdd2fe44906",
     "sourceLanguage": "vi", "targetLanguage": "en",
     "model": "gemini-3.8-flash", "apiVersion": "v1beta",
     "inputDigest": "<fresh binding inputDigest>",
     "planDigest": "<fresh binding planDigest>",
     "deploymentId": "<fresh binding deploymentId>",
     "thinking": "DEFAULT", "lowExplicitlyApproved": false,
     "maxOutputTokens": 8192, "timeoutMs": 120000, "responseBytes": 131072,
     "metadataRequests": 1, "generationRequests": 1, "retries": 0,
     "tokenChargeEnvelopeUsd": 0.82, "pricingVerifiedOn": "<YYYY-MM-DD>",
     "issuedAt": 0, "expiresAt": 0
   }
   ```

   This sample is deliberately INVALID/unarmed. Replace issuedAt/expiresAt with
   approved current UTC Unix milliseconds; no active grant is stored in Git.

4. **After separate approval only**, set paths to those private files, arm just
   this separate container and obtain health. Startup performs read-only source
   verification; startup/health do not call metadata or generation.

   ```powershell
   $env:CONTROLLED_CREDENTIALS_FILE='<absolute private credentials file>'
   $env:CONTROLLED_PERMIT_FILE='<absolute private approved permit file>'
   $env:CONTROLLED_EXECUTION_ENABLE='true'
   docker compose -f infra/backend-controlled-execution/compose.yaml config --quiet
   docker compose -f infra/backend-controlled-execution/compose.yaml up -d --build --wait --wait-timeout 90
   Invoke-RestMethod http://127.0.0.1:18083/api/health # PERMIT, not a billing/access PASS
   ```

5. Use the owner's valid access token from existing Customer authentication,
   privately provided as CONTROLLED_CUSTOMER_TOKEN; never put it in a URL, file
   committed to Git, log, screenshot or literal shell history. GET plan is read-only.

   ```powershell
   if (!$env:CONTROLLED_CUSTOMER_TOKEN) { throw 'Owner access token required' }
   $headers=@{Authorization="Bearer $env:CONTROLLED_CUSTOMER_TOKEN"}
   $base='http://127.0.0.1:18083/api/projects/6ad5c93a86cf95b7523704a5/translations'
   $plan=(Invoke-RestMethod "$base/plan/en" -Headers $headers).data.plan
   $permit=Get-Content -Raw -LiteralPath $env:CONTROLLED_PERMIT_FILE | ConvertFrom-Json
   if ($plan.sourceRevision -ne $permit.sourceDigest -or $plan.transcriptRevision -ne 1) { throw 'Source changed' }
   $memberships=@($plan.groups | ForEach-Object { ,@($_.sourceSegmentIds) })
   $body=@{targetLanguage='en';sourceRevision=$plan.sourceRevision;groupingVersion=$plan.groupingVersion;groups=$memberships;idempotencyKey=$permit.id} | ConvertTo-Json -Depth 20
   # BILLABLE: invoke ONCE only after the separate approval above.
   $preview=Invoke-RestMethod "$base/preview" -Method Post -Headers $headers -ContentType application/json -Body $body -TimeoutSec 180
   ```

   Expected success path: 1 metadata, then 1 generation, then validated RAM draft.
   Do not loop/retry the POST. Invalid metadata/name/actions, timeout, 429, invalid
   JSON, MAX_TOKENS, missing/duplicate IDs, overflow or changed revision => STOP.
   A timeout/disconnect is uncertain, not authorization to repeat or replace a
   permit. Review only sanitized numeric usage/claims. After restart the RAM draft
   may be gone; do not regenerate. No partial Translation READY is written.

6. Human reviews the entire draft for alignment/omissions/names/numbers. Only
   after a **second explicit approval of that draft** may the existing atomic
   approve endpoint be invoked. This is a real DB write, NOT authorized now:

   ```powershell
   $draft=$preview.data.draft
   $reviewHeaders=@{Authorization=$headers.Authorization;'X-Controlled-Review'=$draft.outputDigest}
   $approval=@{outputDigest=$draft.outputDigest;reviewed=$true} | ConvertTo-Json
   Invoke-RestMethod "$base/drafts/$($draft.draftId)/approve" -Method Post -Headers $reviewHeaders -ContentType application/json -Body $approval
   Invoke-RestMethod "$base/en`?format=groups-v1" -Headers $headers
   ```

   Approval rechecks source/revision/review within existing transaction; failures
   roll back. If the commit response is ambiguous, inspect GET/receipt read-only
   first; never assume rollback, regenerate, overwrite or delete artifacts.
   Use the existing auth flow to refresh an expired token, not a new generation.

7. Stop only `narration-controlled-execution`; retain its durable volume/claims.
   Clear private token/path environment variables and protect/private review
   output. Never use `down -v`, prune, delete spent claims or enable global flags.
   Prioritize Customer Web UI/UX after the separately approved trial.

## Files changed in 05.7

- `backend/src/services/translation/{controlled-target,controlled-gemini.provider}.ts`
- Existing `controlled-development.ts`, `one-use-permit.ts`, `group-translation.service.ts`, `gemini-group-translation.provider.ts`
- `backend/src/controlled-development/execution-{app,server,source}.ts`
- `backend/tests/controlled-execution.test.ts`
- `backend/tests/controlled-execution/{Dockerfile,fixtures.ts,http.test.ts,durability-worker.ts,crash-worker.ts,cleanup.ts}`
- Existing read-only museum preflight (additive --permit-binding; earlier edits preserved)
- `infra/backend-controlled-execution/{compose.yaml,validation.compose.yaml,credentials.unconfigured.json,permit.unconfigured.json,README.md}`
- Documentation follow-up entries in `docs/GEMINI_CONTROLLED_DEVELOPMENT_READINESS.md`, `docs/PROGRESS.md`

No Customer Web/MUSEUM/ADMIN07, dependency/provider/model/default-budget changes,
commit/push, real secret provisioning or real permit issuance.
