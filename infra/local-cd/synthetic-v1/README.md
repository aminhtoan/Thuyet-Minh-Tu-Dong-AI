# Docker CD V1: disposable synthetic stacks

Requirements: Node >=22, Git, Linux Docker Engine and Compose >=2.33
(gw_priority support). Windows Docker Desktop and GitHub-hosted Ubuntu supported.
No Atlas/AI credentials or development .env needed. Never insert real user data.

```powershell
node --test infra/local-cd/synthetic-v1/guards.test.mjs
node infra/local-cd/synthetic-v1/run.mjs run --run-id my-s397-test
node infra/local-cd/synthetic-v1/run.mjs smoke --state infra/local-cd/.state/synthetic-v1/my-s397-test/state.json
```

Each new run has a private nonce and projects narration-s397-v1-<run-id>-a,
-bad and -recovery. Each has isolated MongoDB/media volumes and an internal
network. Only Nginx joins an additional bridge and publishes selected dynamic
127.0.0.1 ports. Backend/MongoDB have no host ports or external network. Frontends
can have outbound connectivity; the entire environment is not claimed air-gapped.
Ports are recorded in manifests and compiled into Admin's museum link/CORS.

Build uses a filtered snapshot including dirty/untracked application source,
package locks, design-check assets and packaging. It excludes .env*, key files,
uploads, node_modules, build/cache outputs and .git. Manifest records HEAD/dirty,
source hashes and immutable image IDs. This does not claim exact source passed CI.
Derived test images use private release tags verified against pinned IDs before
and after build; every deployment uses image IDs, never mutable latest.

The pipeline validates planned names, builds three images, deploys A, waits for
health and tests Web/Admin SPA/proxy/auth boundaries. It creates only sentinel,
transaction and media fixtures and checks restart persistence. Frontend A-B-A
uses label-only candidate images with identical JS/API, verifies smoke and checks
Backend/MongoDB IDs/StartedAt and data checksums unchanged. The process follows
S39.6C.2A principles; its Windows/fixed-project PowerShell functions are not called
on unrelated projects. Existing Dockerfile/Nginx/Mongo init behavior is reused.

Failure tests stop a partial deploy after MongoDB creation and reject a Backend
candidate with a deliberately failing healthcheck. Recovery creates a NEW stack
from A's verified manifest with NEW synthetic DB/media. It stops only this run's
A frontends to free ports. A's Backend/MongoDB are not replaced. Fresh fixtures
are intentional: no in-flight jobs or user-data preservation is promised.

After success, recovery is healthy on the selected ports. Old A Backend/MongoDB,
stopped frontends and unhealthy failure fixtures are retained locally for review.
State, release manifests, journal events and logs live below .state/synthetic-v1/.
Each action has an exclusive per-run lock; a crashed run with a stale lock requires
manual inspection, not automatic replay. Failed smoke exits nonzero and cannot
mark the overall acceptance successful. Recreated listener readiness has bounded
transport retries; actual HTTP error statuses are never masked.

Explicit cleanup, only for this run's owned disposable resources:

```powershell
node infra/local-cd/synthetic-v1/run.mjs cleanup --state infra/local-cd/.state/synthetic-v1/my-s397-test/state.json
```

Cleanup verifies dedicated state path/project scope and nonce labels on ALL
containers/networks/volumes before deleting ANY. Non-fixture records in the app
database block cleanup. Unknown ownership/query failures fail closed. No down -v,
prune, image removal, filesystem snapshot deletion or resource adoption is used.
Local source snapshots/logs remain. Do not manually add real records to these stacks.

GitHub workflow Docker CD V1 is workflow_dispatch only, GitHub-hosted Ubuntu,
unique run/attempt scoped, no secrets, registry push, Vercel or production deploy.
It exports JSON/log evidence and always attempts scoped cleanup. Cancellation or
runner failure can interrupt cleanup; hosted-runner deallocation is not a cleanup
PASS receipt. GitHub status remains NOT RUN until an actual workflow succeeds.

Production replacement/rollback and zero downtime remain BLOCKED. Existing
FENCING_COVERAGE_UNPROVEN, maintenance, authorization and safety gates are untouched.
