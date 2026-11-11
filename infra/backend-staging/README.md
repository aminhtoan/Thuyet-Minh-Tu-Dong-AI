# S39.5C: staging packaging, offline only

No deployment, real MongoDB connection, Gemini request or environment-file edit
is authorized by this document. The existing application workflow is unchanged.

## Package

`backend/Dockerfile` uses Node 22.23.3-bookworm-slim, npm ci in build and runtime
stages, compiled TypeScript, runtime-only npm dependencies, Debian FFmpeg and
FFprobe, CA certificates and the non-root node user. Docker build context MUST
be `backend`, for example `docker build -t narration-backend:<commit> backend`
from the repository root. This command requires Docker and package/image network
access and has NOT been executed in this task. The image tag and apt packages
are not digest/version locked; fully reproducible supply-chain pinning remains
future work. FFmpeg libx264/AAC/libmp3lame must be verified in the built image.

`.dockerignore` uses an allowlist for manifests, TypeScript config/source and
three runtime staging scripts. It excludes environment files, node_modules,
uploads, build outputs and unrelated tests/docs. Docker COPY names are explicit;
no build arguments accept secrets. Application secrets belong in the hosting
secret manager/runtime environment, never a frontend VITE variable or image.

## Persistent storage and one instance

Image default UPLOAD_DIR is `/data/uploads`. An operator MUST explicitly mount
a persistent named volume or bind mount there; the directory existing inside
the image is NOT evidence of a persistent mount. Preflight rejects relative,
root and temporary storage paths, verifies binaries and a fresh private file's
write/read/delete permissions. It cannot prove the underlying disk persists
across replacement. Host permissions must allow the node UID/GID (verify with
the image); no automatic recursive chown touches mounted user media.

Run ONE application process/container only, without an autoscaling policy.
GROUPS_V1 drafts and some locks are process-local. Two developers can use this
one HTTPS API; do not run two writers with separate disks against the same
project records. Staging must have its own database, credentials and storage.
No existing uploads are migrated or copied by these packaging files.

Before approving any deployment, verify restart persistence with a synthetic
file: create it in the isolated staging volume, replace the container using the
same mount, and confirm SHA256 remains identical. This is NOT VERIFIED without
Docker/runtime infrastructure. Never run `down -v`, volume prune, or automatic
media cleanup during release/rollback.

## Health

Container startup preloads `staging/preflight.mjs` before server.ts executes.
It checks executables and storage only; failure exits with a fixed message,
without printing secret values. Docker health invokes a separate script which
reads only `http://127.0.0.1:PORT/api/health`, requiring status ok and database
connected, then probes binaries/storage. No Gemini request is made. Database
readiness uses the application's existing endpoint, not a new direct MongoDB
connection. Offline tests substitute fake HTTP responses and never start app.

Health timeout: 15s; interval 30s; startup grace 60s; three failures. Docker
marks unhealthy but does not itself implement release rollback or job recovery.
The probe does not validate Gemini quota, migrations, external domains, codecs
or a persistent mount. Do not interpret health PASS as full E2E PASS.

## Timeout audit (recommendations only)

| Layer | Current evidence | Follow-up before LIVE |
| --- | --- | --- |
| HTTP server | server.ts does not set requestTimeout/headersTimeout; actual Node defaults apply | Measure upload and long-response behavior; review each timeout separately, do not blindly set unlimited |
| Client | frontend-web/src/lib/api.ts defaults requests to 120000ms | STT/translation + media overhead can exceed client deadline; timeout can leave work running, never retry AI blindly |
| Gemini STT | AbortSignal/SDK 120000ms, one generation dispatch | Retain current provider policy; no live call in this task |
| Gemini Translation | 120000ms and bounded response | Same; no retry/model changes |
| Gemini TTS | S39.2 provider has no explicit overall SDK request deadline here | Review provider deadline separately with approval; conversion timeout is not a provider timeout |
| WAV to MP3 | S39.2 child-process timeout 120000ms | Retained unchanged |
| FFmpeg processing | FFMPEG_TIMEOUT_MS defaults to 300000ms per command | Whole workflow may include several commands; account for aggregate time and resource usage |
| Reverse proxy | No production proxy supplied in this package | Verify upload limit >= MAX_UPLOAD_SIZE_MB (default 200MiB) plus multipart overhead; assess read/idle/connect timeouts and client deadline together |

Do not extend just the proxy timeout and claim the entire chain is fixed.
Long operations may eventually need durable jobs/polling, outside packaging.

## Manual release and rollback plan (not executed)

1. Select a CI-passing immutable commit. Record current image digest, config
   version and volume identity; retain the previous image/release.
2. Review startup Mongoose auto-index/create behavior before using any shared
   database. Packaging does not change it; no migration/index/seed command runs.
3. Block new media/AI submissions at the deployment boundary. Confirm no QUEUED
   or PROCESSING jobs and no active uploads/requests; the drain gate is manual
   and NOT implemented by Docker health. If uncertain, do not deploy.
4. Start the candidate only against isolated staging resources. Never overlap
   two active writer replicas. Validate health/auth and synthetic upload,
   playback/download/codec behavior, then restart-persistence checks.
5. A real Gemini rehearsal requires separate explicit authorization and bounded
   cost. Record the final source SHA and results before requesting promotion.
6. On failure, stop admissions and candidate, return to previous image/config
   with the SAME persistent mount. Do not rollback/delete database or media.
   Reconcile interrupted jobs manually; a client retry is not a safe drain.

Do not attach automatic CD or switch production traffic in this task.

## Offline validation

From backend, with existing dependencies:

    npm run typecheck
    npm run build
    node --test staging/runtime-checks.test.mjs

The staging runtime tests use a minted directory under scratch, real local
binary version checks and fake loopback health responses. Existing
tests/demo-media-synthetic.test.ts verifies synthetic WAV -> MP3 -> H264/AAC
MP4 with mocked Gemini and isolated temporary files. No real uploads are used.
Docker build/run, actual volume replacement, Linux permission behavior, real
database readiness and real Gemini are NOT VERIFIED until separately executed.

Docker Desktop is one Windows option, not a deployment prerequisite: a Linux
Docker Engine/remote build host can validate the same package. Without either,
only local Node/FFmpeg validation can be claimed. No Compose stack is needed
for this single-service preparation and no local MongoDB was added.

### Executed results (S39.5C)

| Check | Actual result |
| --- | --- |
| Backend typecheck/build | PASS |
| Runtime configuration/storage/mock health (Node 22.23.3) | 3/3 PASS |
| Existing resolver, mocked TTS conversion and synthetic media regression | 4/4 PASS |
| Runtime script syntax (`node --check`) | PASS |
| git diff --check | PASS |
| Docker CLI availability | NOT AVAILABLE on this machine |
| Docker image build/start, Linux codecs/permissions, persistent volume replacement | NOT RUN |
| Real database/AI/cloud/E2E | NOT RUN |

Packaging status: PARTIAL, ready for a subsequent isolated Docker build and
container validation. This is not authorization or evidence of a live deploy.
