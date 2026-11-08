# S38.2 — Staging preparation, no deployment

Status: prepared for offline verification. No hosting provider has been selected.
The JSON manifest is an inert design contract, not an executable Compose/service
definition. There is no deploy command, hosting account, secret, remote health
check or cloud resource creation in the preparation workflow.

## Baseline and scope

- Branch: chore/cd-staging-prep, based on verified origin/main
  6689944c6c2654d447e2838bfde5dcbb089d8572 (merge PR #4).
- Previous ci/first-run branch and all ignored development files are preserved.
- S34/S35 is abandoned. No source restoration or old approval reuse.
- Additional owner authorization: read-only Admin job audio API and tests.
- No commit, push, PR, deploy, hosting purchase, real Atlas/AI access or changes
  to development .env/media are authorized by this preparation task.

## Proposed topology (provider still requires approval)

Two independent Vercel projects, one long-running Docker Backend instance with
a dedicated persistent media volume, and a separately authorized staging MongoDB
database/user. Prefer a managed Docker service for lower operational overhead;
a VPS with Compose remains an option. Nothing here provisions either option.
Keep one instance: some draft/request state is in memory and media is local.
Mobile APK/build/distribution and object storage are outside this scope.

## Backend image

Build context: backend; Dockerfile: backend/Dockerfile.
Node 22.23.3 bookworm-slim is pinned to Docker Hub manifest digest
sha256:3ed98443660ff48413b5af19ecefce3b9d50845a901a43420d47cc63a9fddbe9.
Tag/digest metadata was checked against the public Docker Hub tag endpoint on
2026-11-08; the image was not pulled or built.

Build stage uses npm ci, TypeScript, and npm prune --omit=dev. Runtime contains
compiled output, production dependencies, Node, FFmpeg/ffprobe and CA certificates.
It runs as the node user (verify UID/GID on the eventual host; normally 1000),
with direct node dist/server.js as PID 1. .dockerignore is an allowlist and
explicit COPY statements never include .env, uploads, logs or runtime journals.
There are no database calls, seeds or migrations in image build/entrypoint.
Runtime startup connects only after configuration validation; build does not.

Docker healthcheck is a loopback-only GET /api/health on PORT (default 8080).
It runs only in a future started container, not in this workflow. This proves
only HTTP plus Mongoose connection state, not disk durability, actual DB
permissions, index presence, FFmpeg performance or AI readiness.

Docker build: NOT RUN. npm and apt layers require network access, so an offline
build cannot be demonstrated safely from current evidence.

## Staging environment

Examples are documentation only and must not be deployed as credentials.
Never copy a development .env. Runtime staging does not implicitly load .env;
APP_ENV=staging must be supplied externally. NODE_ENV stays production.

Backend required fields:

| Variable | Requirement |
| --- | --- |
| APP_ENV / NODE_ENV | staging / production |
| MONGODB_URI | reviewed staging credential and explicit URI database path |
| STAGING_DATABASE_NAME | explicit lowercase name ending _staging; must match URI |
| STAGING_ISOLATION_ACK | dedicated-database-and-user-reviewed, only after review |
| STAGING_MEDIA_ACK | persistent-volume-reviewed, only after volume review |
| UPLOAD_DIR | absolute normalized directory under /var/lib/narration-staging/ |
| CORS_ORIGINS | comma-separated exact HTTPS origins; no wildcard/local origins |
| JWT_ACCESS_SECRET / JWT_REFRESH_SECRET | separate staging-only values, at least 32 characters, no placeholders |
| JWT_ACCESS_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN | required, choose and review TTLs (examples: 15m / 1d) |
| PORT / MAX_UPLOAD_SIZE_MB | examples 8080 / 200; match host/proxy limits |
| CUSTOMER_TRANSLATION_ENABLED / GROUP_TRANSLATION_ENABLED | false for initial staging |
| GEMINI_API_KEY / GOOGLE_API_KEY / OPENAI_API_KEY | absent or empty; nonempty values are rejected |
| CONTROLLED_PROVIDER_MODE | absent/empty |

APP_ENV is independent of NODE_ENV. Development behavior is unchanged without
the staging discriminator. Runtime validation is fail-closed, errors contain
field codes rather than credentials. Operator acknowledgements are declarations,
not cryptographic proof of isolation or a technical permission boundary.
Real AI keys require a future separately approved policy change; S38.2 does not
fix or exercise STT/Translation/TTS business logic.

## Database isolation and indexes

Require a dedicated staging database and principal. Prefer a separate project/
cluster if budget allows; a separate database on the shared cluster still shares
CPU, quotas and failure domains. The owner must verify the principal's actual
grants and network access independently, using separately approved procedures.
Do not copy existing business data by default. Use synthetic accounts/data only
after explicit provisioning approval.

The validator rejects missing/mismatched URI database names and conflicting
dbName options, and connectDatabase pins dbName explicitly. This cannot prove
which cluster or privileges a credential has; isolation remains NOT VERIFIED.
Use a database-scoped least-privilege runtime user; ideally a custom CRUD role
without DDL/admin actions. Never give CI the connection credential.

The normal server imports database policy before app/models. Staging sets global
autoCreate=false and autoIndex=false and repeats them on connect. This prevents
Mongoose startup collection/index initialization; it is not a read-only database
firewall. Ordinary application APIs can still write when invoked, and inserts
may create missing collections under permissive grants.

Existing services use transactions and unique indexes. An independent approved
provisioning step must establish the required collections/indexes, transaction
support and grants. There is no automatic seed, migration, syncIndexes or job
reset in deployment. Missing indexes are a deploy blocker, not permission to
silently create them. Image rollback cannot undo database writes or index changes.

## Media persistence, backup and rollback

Persistent volume identity: dedicated-staging-media (design name only).
Mount at /var/lib/narration-staging/media and set UPLOAD_DIR to that exact path.
The validator rejects a relative/development path. It cannot prove a real mount:
before deploy, verify host mount identity, owner, capacity and backup policy.
Mounts can shadow image directory ownership; establish UID/GID on an empty
dedicated staging volume with separate approval, never chown shared uploads.

Media and narration/result paths are relative to uploadRoot. No path conversion
or transfer of existing development files is performed. Temporary extracted WAV
can remain on temporary storage; budget for input + WAV + output + partial files.
Proxy upload limit must match the 200 MiB example, and timeouts must accommodate
multiple FFmpeg/AI operations. No load/performance claim is made here.

Before accepting traffic: independently verify read/write/rename permissions
with disposable synthetic files on the staging volume, never existing media.
Pause mutations/drain jobs for a consistent DB + media backup, record image
digest and environment version, and copy encrypted backups off the instance.
Test restoring into a second disposable staging location, not over the active
volume. Retention and recovery objectives require owner approval.

Rollback selects a previously approved image digest and previous frontend
deployment, retaining the same volume and compatible database. Do not delete,
recreate or prune volumes. Restore DB/media only as a separately approved,
coordinated recovery; code rollback alone does not recover deleted files.

## Frontend projects and build-time settings

Use separate projects rooted at frontend-web and admin-web. Both need access to
repository files outside root because they share the staging build checker.
Customer additionally runs scripts/customer-design-sync.mjs, reading
design/customer/tokens.json and checking frontend-mobile/src/theme/tokens.ts.
Enable Vercel's Include source files outside Root Directory option and ensure
changes to shared inputs trigger the future release build.

Install: npm ci. Build: npm run build -- --mode staging. Output: dist.
Pin the host Node major compatible with .nvmrc and verify supported versions.
SPA rewrites already exist per project; unchanged, pending hosted deep-link/
asset smoke tests.

Supply VITE_API_BASE_URL as the exact HTTPS Backend /api base, VITE_APP_ORIGIN
as that frontend's exact HTTPS public origin, and Admin VITE_PUBLIC_MUSEUM_URL
as the Customer site's HTTPS origin. The frontend examples use .invalid domains.
Staging mode disables implicit .env loading and accepts these from the build
process environment. Missing, HTTP, local, wildcard, credential-bearing URLs
and public secret variable names fail before bundling. Translation flags in the
Customer example are false. Do not use production mode as a substitute for
--mode staging: deployment automation must enforce the staging command.

VITE_* / EXPO_PUBLIC_* are public. Never put database, JWT or provider credentials
there. Build frontend artifacts for staging; CI V1's example.invalid API URL is
not a release configuration. Backend CORS must include exactly the two real
staging origins; its broad development/Vercel behavior is bypassed in staging.

React Router contains a bare localhost parsing-base literal. A staging-only
render hook replaces that exact bare literal with VITE_APP_ORIGIN; it does not
mask localhost:port endpoints or edit dependencies. Development is untouched.
Run scripts/check-staging-bundle.mjs after both staging builds to check emitted
JS/HTML for local endpoints and common secret patterns. This is heuristic, not
proof that arbitrary secrets can never be bundled; manually review the diff and
release environment too.

## Admin job audio

The demo localhost file is removed. A manual click sends authenticated GET
/api/admin/jobs/:id/audio to the configured API; it never automatically refreshes,
generates, approves or retries. The client rejects redirects and non-MP3 responses,
plays a Blob URL and revokes it on navigation/unmount.

The route remains behind the existing JWT and ADMIN authorization layers and ID
validation. It accepts only COMPLETED TTS jobs with source/voice/revision/time
evidence. A unique narration must match project, translation revision, voice,
language and execution window (plus narrationId when present); zero/multiple
matches fail closed. The existing getAudio path rechecks current upstream
provenance and file availability. No job/artifact backfill or database write.
Legacy incomplete evidence or stale artifacts return an error rather than a
different project's, language's or voice's audio. Real historical coverage is
NOT VERIFIED; tests use mocked DB records and an isolated synthetic MP3 fixture.

## CI gate and preparation workflow

Existing CI V1 is unchanged: PR into main, push ci/first-run, manual dispatch.
It does NOT currently run automatically on main pushes. Backend's four-file
allowlist and Customer's existing missing-video exclusion are unchanged; the
new Backend tests are run explicitly during offline validation.

cd-staging.yml has workflow_dispatch only and contents:read. Its only run steps
execute dependency-free local validation/tests; no hosting credentials, cloud
CLI, SSH, deploy API, DB driver, provider client or artifact upload. There is no
deploy job. The candidate must be a full commit SHA, contain CI V1, descend from
the verified PR #4 baseline and be an ancestor of origin/main. Shell expressions
and refs are rejected. These checks are metadata checks, NOT CI success proof.

GitHub normally requires a workflow_dispatch workflow to exist on the default
branch before it can be dispatched; it has not been committed or put there.
Hosted Actions execution remains NOT VERIFIED. Do not merge it just to test it
without owner approval.

Future CD must verify all four required CI jobs for the exact main release SHA,
independent approval, immutable image/artifact identity and environment version,
then deploy, GET-only health/static/deep-link smoke, and report. No auto-deploy
from feature branches or separate hosting Git integration may bypass that gate.
Main CI trigger/rulesets, GitHub plan support for environment reviewers and the
actual provider integration need a separately approved implementation. Never
trust merely a PR head check for a different merge SHA.

## Validation and outstanding prerequisites

Use Node 22.23.3 and existing dependencies. Config tests use synthetic URLs/keys.
Backend tests run with .github/ci/network-guard.mjs and mocked connections.
Do not run default Backend npm test (integration paths), start server.ts,
invoke real media jobs, or install dependencies for this preparation.
The HTTP tests bind their own loopback fixture only; they never contact a running
development Backend, remote health endpoint, shared Atlas or Gemini.

READY OFFLINE describes source/config validation only.
REQUIRES HOSTING: provider/region/domain, memory/CPU, proxy, monitoring, backups.
REQUIRES SECRETS: staging-only DB principal/JWTs in runtime secret storage.
REQUIRES MANUAL APPROVAL: commits/push/PR, infrastructure/index provisioning,
real deployment and any future AI/media acceptance.
NOT VERIFIED: container build/run, actual DB isolation/grants/indexes, durable
mount, restore, hosted frontend routing, provider performance, exact-SHA CI gate,
GitHub Environment/ruleset configuration and hosted workflow behavior.

Next S38.3 requires owner review of this diff and a concrete infrastructure/
credentials/approval plan. Do not automatically proceed.

## Offline evidence (2026-11-08)

- Node22.23.3: Backend, Customer Web and Admin lint/typecheck/build PASS.
  Both frontend builds used synthetic HTTPS staging URLs, not development .env.
  Missing/HTTP staging configuration is rejected; existing development .env
  files were not edited. Customer retains five existing lint warnings and
  existing large-chunk/dynamic-import warnings.
- Existing Backend four-file mock allowlist: 88/88 PASS.
- New Backend tests: staging policy 5/5 and Admin job audio 2/2 PASS, including
  actual local HTTP JWT/RBAC, stale provenance denial and synthetic file read.
  Network guard preloaded; database connect and model reads mocked.
- Customer Web selected CI suite: 455/455 PASS, existing single missing-video
  exclusion unchanged. Admin suite: 36/36 PASS.
- Preparation tests: 4/4 PASS; manifest/candidate checker PASS; workflow YAML
  parse/manual-only scope PASS; network guard self-test PASS.
- Both staging bundles scanned: no localhost/LAN endpoints, MongoDB URI or
  common private-key/token patterns detected. Manual diff review still required.
- Docker/container/remote staging tests NOT RUN; real isolation/persistence and
  exact-main-SHA hosted CI remain NOT VERIFIED.

## Review inventory

Modified (14):

- .gitignore
- backend/.gitignore
- backend/Dockerfile
- backend/src/config/env.ts
- backend/src/config/database.ts
- backend/src/app.ts
- backend/src/server.ts
- backend/src/routes/admin.routes.ts
- frontend-web/src/config/env.ts
- frontend-web/vite.config.ts
- admin-web/src/config/env.ts
- admin-web/vite.config.ts
- admin-web/src/pages/AdminJobDetailPage.tsx
- docs/PROGRESS.md

New (18):

- .github/workflows/cd-staging.yml
- backend/.env.staging.example
- backend/src/config/staging.ts
- backend/src/services/admin-job-audio.service.ts
- backend/src/controllers/admin-job-audio.controller.ts
- backend/tests/staging-config.test.ts
- backend/tests/admin-job-audio.test.ts
- frontend-web/.env.staging.example
- admin-web/.env.staging.example
- admin-web/src/services/adminJobAudio.ts
- admin-web/tests/job-audio.test.mjs
- infra/staging/manifest.json
- infra/staging/README.md
- scripts/check-staging-prep.mjs
- scripts/check-staging-bundle.mjs
- scripts/staging-frontend.mjs
- scripts/staging-frontend.d.mts
- scripts/staging-prep.test.mjs

No files are staged or committed. Existing CI V1 and Mobile have no diff.
The common secret-pattern scan of all 32 changed/new text files found no match;
this complements manual review and is not a guarantee against every secret form.
