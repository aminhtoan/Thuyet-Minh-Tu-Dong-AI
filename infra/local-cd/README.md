# S39.6B.1 - Windows Docker Desktop local CD package

Latest Backend coverage evidence is in
[S39.6C.2B.2-COVERAGE.md](S39.6C.2B.2-COVERAGE.md). Normal-server synthetic
quiescence can now issue short-lived process-bound certificates; unknown scopes
still block. Backend replacement scripts remain disabled. No running image has
been updated with this maintenance source.

## Latest: S39.6C.2A frontend-only operations

See [S39.6C.2A-ACCEPTANCE.md](S39.6C.2A-ACCEPTANCE.md) for actual image IDs,
journals, checksums and the executed synthetic tests. Frontend upgrade and
rollback are now accepted for config-only synthetic derivative images; Backend
operations still block because process drain is unobservable. This supersedes
the blanket frontend rollback-blocked description in the historical B.1 text.
Read the acceptance limits before invoking Upgrade-Local.ps1 or Rollback-Local.ps1.

## B.2N latest acceptance: Windows loopback PASS

This supersedes the internal-only publication failure described below. On the
tested Docker Desktop engine, frontends attached only to the internal bridge
had HostConfig bindings but empty actual published ports and no Windows TCP
listener. Connecting the SAME running frontend containers to a new non-internal
bridge immediately populated 127.0.0.1:5180/5181 and Windows HTTP smoke passed.
No image rebuild, container deletion or recreation was required.

Current topology: backend and MongoDB remain only on `narration-s396-isolated`
(internal=true). Frontend proxies join it AND `narration-s396-frontend` (bridge,
non-internal). Only the two exact loopback ports are published. Dual-homed
frontends may have outbound access; the entire stack is NOT claimed offline.
No Internet/Atlas/Gemini reachability probe or AI call was made.

`compose.yaml` now describes this topology for subsequent builds. The existing
release snapshot/images are immutable and unchanged. The current runtime-only
attachment is recorded separately in `.state/<release>/loopback-topology.json`;
do not use the old snapshot Compose for a future replacement without reviewing
that configuration drift. `Connect-FrontendLoopback.ps1` verifies the release,
healthy owned containers, image IDs, bind addresses, volume identity and port
availability, then connects only existing frontends; it never recreates core
services. This acceptance operation is not an upgrade/rollback bypass.

`Test-RestartAcceptance.ps1` applies only to this empty synthetic environment:
zero users/projects/jobs/attempts/artifacts, AI keys blank and flags off. It
stops frontend admissions, rechecks emptiness, stops Backend, restarts the same
MongoDB container and starts the same application containers. It verifies
PRIMARY, database fixture, media sentinel SHA256, IDs/images/mounts and reruns
Windows HTTP smoke. It must NOT be used to drain real projects/RAM drafts.

Actual results: both Windows frontends/root/deep links 200; proxied health 200
JSON; missing API 404 JSON; unauthenticated Admin API 401 JSON; all four healthy.
Restart/persistence PASS, same IDs/images/mounts. SHA256 before/after:

- Media: bf75d73173297e9e0ab4f52d2dac335bff819b9418e7555ab4c4c3ae27dd3c1f
- Database fixture: 6b3dcd3f3b3483aaa369b0f8e762d75a17205d57d05b2b8220f4ad0f3c8624d2

Evidence is in `.state/<release>/restart-acceptance.json`. S39.5 containers and
volumes were not touched. No production/AI E2E, upgrade or rollback is claimed.

## B.2R acceptance update

Transaction test now lives in transaction-test.js and is passed to mongosh
`--file /dev/stdin` using a redirected stdin process. Windows PowerShell 5.1
legacy argument passing had stripped JS quotes in the earlier --eval command.
Acceptance-Helpers.ps1 validates the existing S39.6 MongoDB/network/volume
identity. Test-MongoTransaction.ps1 verifies PRIMARY, real commit/readback and
abort. Resume-FirstDeployment.ps1 accepts ONLY a first resume: no prior Backend
or frontend container, no business rows/jobs, and the same checksum-verified
release/images. It uses --no-recreate and never cold-creates existing volumes.
Test-Smoke.ps1 also sends the media sentinel program through stdin, avoiding
the same quoting issue. Existing upgrade/rollback draft guards remain in place.

Executed against sha-ddb3ca117aad-82899dbf02a9: PRIMARY, commit and abort PASS;
all four services healthy. Internal-network HTTP tests: both roots/deep links
200 HTML, health 200 JSON, missing API 404 JSON and unauthenticated Admin API
401 JSON. Backend UID=1000. Host HTTP smoke FAIL: configured 127.0.0.1 binds
exist in HostConfig, but Docker NetworkSettings.Ports is empty for both static
services on the internal-only network; Windows cannot connect to 5180/5181.
No topology/source-app change or container recreation was attempted. Restart
and persistence acceptance were NOT RUN after this failure. Overall PARTIAL.
The original release snapshot/images remain unchanged; these new test/resume
tools are acceptance tooling outside that already-built snapshot.

This change creates packaging/scripts only. Do NOT run Build-Release,
Deploy-Local, Test-Smoke or Rollback-Local without the next explicit approval.
No GitHub Actions deployment workflow is added. Current status is PARTIAL for
B.2: cold deployment is prepared; upgrade/rollback deliberately fail closed.

## Architecture and isolation

Four services: one backend, Customer static Nginx, Admin static Nginx, MongoDB
8.0.17 with a single-node `s396rs` replica set. Only these ports are published:

| Address | Service |
| --- | --- |
| http://127.0.0.1:5180 | Customer Web |
| http://127.0.0.1:5181 | Admin Web |

Backend and MongoDB have NO host port. Network `narration-s396-isolated` is
internal-only; no service attaches a second network. MongoDB URI is fixed to
`mongodb:27017/s396_local_cd?replicaSet=s396rs`. No Atlas, real accounts or AI
keys are accepted by this configuration. Translation feature flags are off.
Synthetic JWT strings are for this isolated environment only, never production.

New external volumes `narration-s396-database` and `narration-s396-media` are
separate from all S39.5 volumes. Cold deploy refuses existing volumes rather
than silently reusing them. It labels only newly created volumes. No script
deletes volumes/containers, prunes Docker, resets DB, migrates or seeds users.

MongoDB health initially calls rs.initiate ONLY for NotYetInitialized on the
dedicated fresh volume. Persisted `local` replica-set state survives restart.
Later probes verify set name, single member `mongodb:27017` and primary status;
unexpected topology blocks health, never rs.reconfig. No host port/directConnection
is used. Actual first election/restart persistence is NOT VERIFIED in B.1.

## Build contexts and identity

Windows PowerShell 5.1 or later, Git and Docker Desktop in Linux-container mode
are required. Scripts reject inherited DOCKER_HOST/DOCKER_CONTEXT and non-local
Windows named-pipe endpoints. The target is the local Desktop daemon only.

Build-Release enumerates Git tracked + untracked non-ignored build inputs,
copies them into a new `.state/<release>/snapshot`, excluding `.env*`, private
key files, dependencies, uploads, outputs and runtime state. Docker builds from
this snapshot, not the mutable working tree. Deletions are reflected by absence.
Required ignored build inputs will cause a build failure, never an implicit
fallback to the developer's environment. Do not place credentials inside source
or public assets: exclusion rules are not a general secret detector.

Identity: HEAD + SHA256 of ordered path/content hashes. Tag format is
`sha-<12 HEAD hex>-<12 snapshot hash hex>`, including dirty source. Manifest
stores full HEAD/hash, file hashes, dirty status, image tags and immutable local
image IDs. SHA-derived tags are never overwritten by this script. Registry
RepoDigest may not exist for a local build; image ID is the rollback identity.
Dirty builds are explicitly NOT claimed to be the exact GitHub CI-passing SHA.
Dependency base images/apt packages are not fully digest-pinned yet.

The frontend Dockerfile is invoked from the repository snapshot root with its
adjacent Dockerfile-specific ignore file. `APP` is selected by the build script
as frontend-web/admin-web. It copies design tokens, customer-design-sync.mjs and
the Mobile generated adapter, because Customer prebuild validates both Web and
Mobile adapters. No Mobile app is built. Backend retains its own existing
Dockerfile and restricted backend context unchanged by B.1.

Both browsers use `/api` (same-origin Nginx proxy), not a Docker service hostname.
Admin public museum URL is `http://127.0.0.1:5180/`. SPA fallback applies only to
frontend paths. `/api/` is proxied without rewriting backend errors to HTML.
CORS allows the two exact 127.0.0.1 origins. Use these addresses consistently,
not localhost aliases. Nginx has 201MiB upload and 360s upstream read/send limits;
these do not override the existing frontend/provider deadlines. No app timeout
or business logic changed. Existing dev ports 5173/5174/8080 can remain separate;
deploy refuses occupied 5180/5181 and never stops another process for a port.

## Commands for the NEXT approved step (not executed in B.1)

From the repository root:

    powershell -File infra/local-cd/Validate-Offline.ps1
    powershell -File infra/local-cd/Build-Release.ps1
    powershell -File infra/local-cd/Deploy-Local.ps1 -ReleaseId sha-<head>-<snapshot>
    powershell -File infra/local-cd/Test-Smoke.ps1 -ReleaseId sha-<head>-<snapshot>
    powershell -File infra/local-cd/Rollback-Local.ps1 -ReleaseId sha-<previous>-<snapshot>

Validate-Offline alone renders Compose and performs syntax/static checks; it
never builds/runs containers. Build-Release creates images and downloads build
dependencies, so it requires B.2 approval. Pre-pull mongo:8.0.17 separately if
absent; deploy uses --pull never and --no-build. No existing `.env` is read by
Compose: the release-specific `images.properties` contains only validated tags.
Do not set inherited LOCALCD_* image variables; scripts reject them.

Executed B.1 validation: PowerShell AST syntax PASS for every script; Docker
Compose config schema plus four services, exact loopback ports, internal network,
external S39.6 volumes, fixed local DB URI and blank AI keys PASS. Mocked guard
tests PASS for command argument preservation, image-tag binding, cold-only
deployment, zero-jobs-but-unknown-RAM rejection and active-job rejection.
Static Dockerfile/input/exclusion and Nginx route checks PASS; git diff --check
PASS. Nginx native `nginx -t`, Docker image builds, runtime election/startup,
smoke, persistence/upgrade and actual rollback have NOT run in B.1. Existing
S39.5 containers remain stopped and their volumes unchanged.

Run guard-only tests with:

    powershell -File infra/local-cd/Test-GuardsOffline.ps1

## Fail-closed deploy, smoke and rollback limits

An exclusive local operation lock serializes build/deploy/rollback. Before any
up, scripts verify snapshot checksums, image IDs, Compose, ports and cold-volume
absence. Cold deploy then creates only its two dedicated volumes and starts
the four services. On failure it leaves all resources for inspection; no cleanup
or automatic rollback occurs. Partially created resources cause later deploys
to stop for review, never overwrite them.

If an existing Backend is found, scripts query only the isolated DB for QUEUED
or PROCESSING ProcessingJobs. A failed query blocks. Even zero jobs is NOT proof
that there are no RAM drafts or active admissions. Existing APIs cannot expose
that state. Therefore upgrade and rollback are BLOCKED, including a stopped
Backend, until a separate maintenance/drain procedure is reviewed. There is no
"force", checkbox receipt or unverifiable user assertion to bypass this gate.
Rollback script validates the old manifest/image and knownGood smoke marker,
then fails closed; B.1 does NOT claim functioning end-to-end automatic rollback.

Smoke only performs GET checks on both frontends: root/deep links, local-ready,
API health, missing API (404) and Admin auth (401). It executes runtime health
inside Backend, then creates/compares a fixed synthetic sentinel on the new
S39.6 media volume. `knownGood` means these smoke checks passed, not full E2E.
Smoke does not restart containers or prove MongoDB transaction/data persistence.
B.2 must separately rehearse restart and compare sentinel/database fixture
hashes using isolated synthetic data, under explicit authorization.

Release rollback must preserve database and media volume IDs, keep the previous
images, and check database compatibility. Never run down -v, volume prune,
automatic migrations, or rs.reconfig. Do not point scripts at S39.5/Atlas data.

## When unhealthy

Read-only diagnostics: `docker compose ... ps`, `docker inspect` health logs,
`docker logs` for the S39.6 containers, disk/permissions and MongoDB election.
Use the exact compose file and images.properties stored with that release.
Database/Backend has no published port; diagnose using scoped docker exec only
after runtime approval. Do not print environment secrets or reset volumes.
MongoDB wrong hostname/set blocks health; resolve configuration deliberately.
Backend preflight checks FFmpeg/FFprobe and non-root storage. No API key should
be inserted to make a health check pass.

## Local scripts versus GitHub CD

Docker drain acceptance and remaining replacement restrictions are recorded in
[S39.6C.2B.3-ACCEPTANCE.md](S39.6C.2B.3-ACCEPTANCE.md). The new drain consumer
is check-only and does not authorize or perform Backend replacement.

These scripts are manually invoked deployment automation, not GitHub-driven CD.
No self-hosted runner or automatic deployment is configured here. Future runner
work requires trusted commits/workflows only, explicit local environment scope,
CI result/source binding, operation concurrency, safe drain and an approved
rollback procedure. Do not run untrusted pull-request code on this Docker host.
