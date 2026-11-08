# CI V1 (S37.2)

## S37.4C — Customer approval scope repair (2026-11-08)

Branch `ci/first-run`, baseline `22e6ca5`. Run #2 reported Backend 87/88 PASS;
Customer Web/Admin/Mobile passed. The supplied job URL returned 404 here:
https://github.com/vuvantai14/multilingual-ai-narration/actions/runs/24242240760/job/128613723971

Verified cause: `customer-multilang.test.ts` called its final idempotent
`approve()` outside `withCustomerTranslation`, unlike earlier approval calls
and the production controller's `normalGroups` wrapper. `enabled()` correctly
rejects an unscoped call unless `GROUP_TRANSLATION_ENABLED=true`. Local
`config/env.ts` uses `dotenv.config()`; the local non-secret feature flag was
true, masking the missing scope. CI has no `.env` and does not set that flag.
This is an ambient-configuration dependency, not a Linux parser difference.
Forcing the flag false reproduced the exact failure locally: 87 PASS/1 FAIL,
`GROUP_TRANSLATION_DISABLED` in the reported test.

The test now pins the legacy group flag false before dynamic application
imports, preventing dotenv from filling it from local configuration, and wraps
the final approval in the same Customer scope used elsewhere. A negative
assertion verifies unscoped approval is still denied without an extra write.
Production source, workflow, runner and all other apps remain unchanged.

Validation with Node 22.23.3 and the existing test network guard:

- Four-file CI runner: 88/88 PASS with inherited flag false and 88/88 PASS
  with inherited flag true; no skips.
- Customer multilingual file alone, absent inherited flag and working directory
  without `.env`: 27/27 PASS. Node's default file/process isolation and sequential
  top-level tests prevent other test files from supplying the missing scope;
  the isolated result confirms no preceding-file dependency.
- Backend lint, typecheck and build PASS. Existing dependencies retained;
  no fresh Linux/GitHub execution is claimed.

READY for CI run #3 after user-approved commit/push. No Atlas access, real
Gemini calls, `.env` edits, commit, push, merge or deployment performed.

## S37.4A repair (2026-11-08)

Current branch: `ci/first-run`, baseline `e0d1a35`. This section supersedes the
historical failure/readiness notes below. S34/S35 has been abandoned; its runtime
state and approvals are not prerequisites for this CI task.

The first Actions run is
https://github.com/vuvantai14/multilingual-ai-narration/actions/runs/24241122537.
Its logs returned 404 to this environment; failures were reproduced locally.

- Backend translation response normalization now narrows unknown JSON instead
  of using five explicit `any` types; normalization behavior is retained.
- STT timestamp parsing now rejects overlaps for every annotation count and
  joins zero-duration words only at exact adjacent positive source boundaries.
  It preserves source timestamps rather than inserting 50 ms or extending them
  across gaps. Existing diagnostics and mapping tests define this contract.
- Customer Web assertions now follow the existing AUTO/MANUAL upload contract.
  The homepage reflow assertion excludes only the two audio-card preview rules
  that intentionally clamp text; it still checks homepage/shared shell rules.
  No Customer Web application code or styles changed.
- Admin/Mobile, workflow, network guard, test allowlist and the existing single
  missing-video exclusion remain unchanged. No additional tests were excluded.

Validation uses portable Node 22.23.3, existing dependencies and the CI network
guard for tests. Backend lint/typecheck/build PASS; CI allowlist 88/88 PASS;
additional `gemini-stt.test.ts` regression 33/33 PASS, including synthetic local
FFmpeg media with mocked provider. Network guard self-test PASS. Customer Web
lint/typecheck/build PASS (five existing lint warnings and existing bundle/import
warnings). Customer Web selected suite: 455/455 PASS; the existing single
missing-video exclusion still applies, so this is not a full-suite PASS.

No clean `npm ci` or GitHub-hosted Linux rerun is claimed. No shared Atlas access,
real provider calls, Admin/Mobile edits, commit, push, merge or deployment.
Push requires user approval after reviewing this local change.

## Scope and execution

Workflow: `.github/workflows/ci.yml`. It runs on pull requests targeting `main`,
pushes to **`ci/first-run`**, and manual dispatch. Node **22.23.3** comes from
`.nvmrc`. Each independent job installs with `npm ci` and caches npm downloads
using its own application's lockfile. Checkout credentials are not persisted;
workflow permissions are `contents: read`. New runs cancel older runs for the
same PR/ref. This workflow contains no deployment or artifact-upload step.

| Job | Commands after `npm ci` |
| --- | --- |
| Backend | `npm run lint`, `npm run typecheck`, `npm run build`, `node ../.github/ci/network-guard.test.mjs`, `node ../.github/ci/run-tests.mjs backend` |
| Customer Web | `npm run lint`, `npm run typecheck`, `npm run build`, `node ../.github/ci/run-tests.mjs customer-web` |
| Admin Web | `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` |
| Customer Mobile | `npm run lint`, `npm run typecheck`, `npm test` |

The Web/Mobile design-check lifecycle scripts also run through npm. Mobile uses
Node tests, with Expo dotenv loading, telemetry and online checks disabled. No
Android Studio, emulator, APK/AAB build, EAS or Docker is required.

## Explicit test coverage

Backend runs only these four reviewed mock files, with test concurrency 1:

- `backend/tests/project-workflow.test.ts`
- `backend/tests/gemini-stt-diagnostics.test.ts`
- `backend/tests/customer-multilang.test.ts`
- `backend/tests/customer-simple-preflight.test.ts`

All four are retained, including currently failing assertions. They use mocks,
source inspection or an HTTP fixture in the test process. Backend's default
`npm test`, database integration tests, seeds, migrations and index-sync scripts
are **NOT RUN**. Expanding this allowlist requires reviewing the new write and
network paths first.

Customer Web runs every `tests/*.test.mjs` file, excluding exactly this named
test in `tests/museum-assets.test.mjs`:

> canonical museum assets retain all eight original media hashes

Its required `frontend-web/public/museum/videos/bao-tang-chung-tich-chien-tranh.mp4`
is absent from Git. The exclusion covers that entire eight-hash assertion; the
other two tests in the same file still run. No replacement video is fabricated.
The runner checks that the excluded name still exists and prints the exclusion
both in the log and GitHub step summary. Node 22 filters this test before counting
executed tests, so its TAP `skipped` count can remain zero. This is **not a full
Customer Web suite PASS**. Restore the original asset and remove the exclusion
together when the asset is available.

Admin/Mobile run their existing `npm test` scripts without excluding tests.
No `continue-on-error` is used, and test failures propagate a nonzero exit code.

## Data and network protection

- No GitHub secrets, production credentials, `.env`, uploads, runtime journals or
  log artifacts are passed/uploaded. npm caches contain dependency downloads,
  not application data.
- Test configuration uses a synthetic MongoDB URI at `127.0.0.1:1`, synthetic
  JWT signing values, empty AI keys and invalid example API URLs. No application
  server or database service starts in the workflow.
- All test processes preload `network-guard.mjs`. It denies outbound TCP/TLS,
  DNS/SRV and UDP, including connections to pre-existing localhost services.
  Only loopback ports opened by that same test process are reachable. Implicit
  listener hosts are bound to loopback for Vite's middleware/WebSocket fixtures.
  Fixture ports are removed on server close.
- tsx's optional cache IPC probe receives `ENOENT` without opening a pipe. Other
  IPC connections/listeners are denied. Any caught accidental network denial
  still makes the process fail at exit; diagnostic output contains reason codes,
  not request bodies, URLs or credentials.
- `network-guard.test.mjs` verifies the denies, permitted local fixture, cleanup
  and nonzero exit for a caught network attempt. It never contacts a provider.
- This JavaScript preload is defense in depth, **not an OS/container firewall**
  or a sandbox against malicious code/native subprocesses. No arbitrary test
  files or live integration suites are admitted by the Backend runner. It is not
  attached to `npm ci`, lint or compilation; dependency installation needs npm
  registry access. No production secrets should be added to this workflow.

## Local validation on 2026-11-08

Source checked: `main` at `c9c2050e264967f1584d0502b7512978314c6a97`.
The previous 19 modified and 3 untracked files were committed externally as
`fix login admin web and login mobile qr` during preparation; this task did not
commit them or alter their application changes.

Validation used portable Node 22.23.3 verified against the official SHA-256
manifest, existing installed dependencies and synthetic test configuration.
System Node and running application servers were not replaced.

| Check | Result |
| --- | --- |
| YAML parse, triggers, job paths, permissions, cache paths, scripts and Node pin | PASS |
| Node syntax checks for CI helper modules | PASS |
| Network guard self-test | PASS |
| Backend four-file allowlist | **FAIL: 78 PASS, 10 FAIL** (88 reported tests, including parent groups) |
| Customer Web selected suite | **FAIL: 453 PASS, 2 FAIL**; one additional asset test explicitly excluded |
| Admin `npm test` | PASS: 35/35 |
| Mobile `npm test` | PASS: 214/214 |
| Backend lint | **FAIL: 5 `no-explicit-any` errors** |
| Web/Admin/Mobile lint | PASS |
| Typecheck (all four apps) | PASS |
| Backend/Web/Admin build | PASS |
| Local clean `npm ci` | NOT RUN: preserves installed dependencies used by live apps |
| GitHub-hosted Linux execution / GitHub workflow engine / actionlint | NOT RUN |
| Native Mobile build / CD / live database / paid AI | NOT RUN (outside scope) |

Existing failures are deliberately not hidden or fixed by this CI-only task:

- `backend/tests/gemini-stt-diagnostics.test.ts`: seven failed leaf assertions
  plus three failed parent groups. Parser expectations differ for overlap,
  zero-duration/precision-collapse intervals and phrase grouping boundaries.
- `backend/src/services/translation/gemini-group-translation.provider.ts:63-68`:
  five explicit `any` lint violations.
- `frontend-web/tests/create-upload-detail-ui.test.mjs:13`: source-text assertion
  expects the previous source-language validation/form contract.
- `frontend-web/tests/museum-routing.test.mjs:362`: source-text assertion rejects
  truncation/overflow CSS present in the current museum styles.

Thus the workflow is prepared, but **a green first CI run is BLOCKED by these
existing application/test discrepancies**. GitHub normally stops the Backend
job at lint, before later Backend commands; local validation ran the allowlist
separately to expose its failures too. No existing tests were rewritten or
silently dropped to make CI green.

## First GitHub run (user action after approval)

1. Review `.github/` and current `git status`.
2. Create the test branch `ci/first-run` from the intended base. If it already
   exists, inspect it first rather than resetting it.
3. Stage only the reviewed `.github` files, then commit/push when authorized.
4. Inspect the **CI V1** run in GitHub Actions. Opening a PR from this branch
   into `main` also triggers CI. No deployment is part of this workflow.
5. Manual **Run workflow** generally becomes available after the workflow is
   present on the default branch; use the configured branch push for the first
   run before merging.

Do not interpret an initial red run as a deployment failure. Fix the listed
application/test issues in a separately authorized change, then rerun CI. This
task does not push, open a PR or configure CD.

## S37.3 first-run readiness review (2026-11-08)

- Branch/HEAD remain `main` / `c9c2050`; tracked working tree is unchanged.
  Exactly the five files under `.github/` are untracked.
- Push trigger and instructions now agree on `ci/first-run`. PRs into `main`
  remain supported. The branch has not been created by this task.
- YAML/job/script/cache checks, helper syntax and the network guard self-test
  passed again using Node 22.23.3. A separate isolated check loaded the actual
  MongoDB driver via Mongoose with a synthetic `.invalid` SRV URI: discovery
  failed with `CI_NETWORK_DENIED` before DNS/network access. No Atlas or Gemini
  request was made. The guard's defense-in-depth limits above still apply.
- No application suites were rerun; the existing failures/exclusion above
  remain open. No clean install or GitHub-hosted execution has been claimed.
- **READY to submit the first CI run**, with existing Backend/Web failures
  expected to keep it red. No business-code changes or deployment are included.

After reviewing and approving the commit locally, the user can run:

```powershell
git switch -c ci/first-run
git add -- .github/workflows/ci.yml .github/ci/run-tests.mjs .github/ci/network-guard.mjs .github/ci/network-guard.test.mjs .github/ci/README.md
git diff --cached --stat
git commit -m "ci: add safe checks for backend web admin and mobile"
git push -u origin ci/first-run
```

These commands are instructions only; this task does not execute them. The
configured push triggers CI without creating a PR or deploying an application.
