# Isolated Docker Backend validation — AI-TRANSLATE-05.3

Mock-only, synthetic-fixture environment. Not a launcher for real translation or Atlas access. Default development/production flags, model and 96 KiB source gate remain unchanged. Full report: [Docker validation](../../docs/GROUPS_V1_DOCKER_VALIDATION.md).

## Requirements / resource policy

- Existing healthy `narration-groups-test-mongodb`, Mongo 8.0.17, `narration-test-rs`, dedicated test DB and `narration-groups-test_integration-only` network. Never use demo/other containers.
- Docker Linux Engine. Backend is a new container on the **existing external test network**, no Mongo reconfiguration/extra network attachment required.
- Backend ceiling 512 MiB, memory+swap 512 MiB (no extra swap), 1 CPU, PID limit 128, Node old-space 256 MiB. Restart disabled; loopback-only host port 18081; bounded 2 × 2 MiB logs; non-root/read-only rootfs/cap-drop/no-new-privileges; tmpfs 64 MiB. No host mounts, Docker socket or credentials.
- Host had ~1.90 GiB free RAM, Docker VM ~7.65 GiB total and ~0.66 GiB existing container usage at inspection. The temporary 512 MiB ceiling was selected to limit additional demand, not because measured peaks guarantee safety or host RAM is reserved. Do not treat this as a production configuration.
- Official Node 22.23.1 image is digest-pinned. Build context is allowlisted to package files, source, tests and tsconfig; `.env`, uploads and Windows node_modules are excluded. No dependency/lock changes.

## Start, verify, test (PowerShell from `backend/`)

Use a task terminal. Never set/change `MONGODB_URI` or load development `.env` as validation configuration.

```powershell
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27029/multilingual_ai_narration_groups_test?replicaSet=narration-test-rs&directConnection=true'
$env:TEST_DATABASE_NAME='multilingual_ai_narration_groups_test'
$env:VALIDATION_MONGO_PROCESS_ID=(node --import tsx tests/docker-validation/host-precheck.ts)
if ($LASTEXITCODE -ne 0) { throw 'Mongo isolation precheck failed' }
docker compose --env-file ../infra/backend-validation/test.env.example -f ../infra/backend-validation/compose.yaml config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Compose config invalid' }
docker compose --env-file ../infra/backend-validation/test.env.example -f ../infra/backend-validation/compose.yaml up -d --build --wait --wait-timeout 90
if ($LASTEXITCODE -ne 0) { throw 'Validation backend not healthy' }
node --import tsx tests/docker-validation/host-precheck.ts --backend
if ($LASTEXITCODE -ne 0) { throw 'Backend identity/isolation failed; do not write fixtures' }
Invoke-RestMethod http://127.0.0.1:18081/api/health
docker exec narration-backend-validation node --max-old-space-size=128 --import tsx tests/docker-validation/load.ts
if ($LASTEXITCODE -ne 0) { throw 'Load test failed; inspect sanitized output and fixture cleanup' }
```

Host precheck reuses the existing Docker/Mongo isolation guard, then validates backend image/project/network/loopback mapping, health, no host mounts, memory/CPU/OOM/restart settings and the expected Mongo process identity. Container precheck requires the exact test URI/database/hostname, no `/app/.env`, the cgroup memory ceiling and the same PRIMARY/set/processId. There is no development fallback. The processId is deployment attestation, **not a secret**. Do not hardcode a stale ID after Mongo restarts.

The container intentionally uses NODE_ENV=test to retain existing fail-closed profile guards. This is a development **validation** composition, not permission to set a real development/production server to test mode. The only enabled flag is local to the isolated server process. Ephemeral JWT secrets are generated in-container, kept only in protected tmpfs, never mounted/logged/copied into Git. All requests still pass real JWT/CUSTOMER/ownership validation. Auth/register, STT/TTS/job/media mutations and unrelated routes are blocked by the validation route allowlist. The additional authenticated `validation-policy` operation checks reader/TTS source validators only, not speech generation.

## Measurements / cleanup

Server PID 1 samples memory every 25 ms. The load client is a second heap-limited Node process in the same container; container cgroup peak includes it, health probes and tmpfs/page-cache, while backend RSS/heap metrics refer to PID 1 only. Cgroup v1/v2 are detected; absence of verifiable limits blocks startup. Metrics contain no transcript or credentials.

One warm-up and two rounds 1/4/16 only. Each uses synthetic fixture IDs, mock metadata/generation, authenticated plan/preview/approve/GET/reader/TTS validation, wrong-owner and stale-revision checks, then real wall-clock 3-second test draft TTL cleanup. The production 15-minute TTL is unchanged. Finally removes exact tracked fixture IDs (including translations by tracked project IDs), verifies zero residual fixtures, never drops DB/collections/volumes. Do not run integration suites simultaneously because fixtures may share the `en` catalog entry.

```powershell
docker inspect narration-backend-validation --format '{{.State.OOMKilled}} {{.RestartCount}} {{.HostConfig.Memory}}'
docker stop --timeout 15 narration-backend-validation
```

Stop only this container after testing. Keep MongoDB/data volume and unrelated resources. Do not use `down -v`/prune. Failed startup or tests must not trigger any real AI retry. Build and cgroup/auth-fixture issues encountered during implementation were fixed without changing production auth or data validation.
