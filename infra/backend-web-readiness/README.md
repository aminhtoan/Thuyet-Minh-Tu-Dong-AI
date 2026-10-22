# READ_ONLY_WEB_READINESS — no execution capability

Separate executable, Docker image and composition. No inheritance from PERMIT
composition, no volumes, Gemini credentials, permit grant or durable storage.
Only `/api/health` and authenticated CUSTOMER/ownership
`GET /api/projects/:id/translations/execution-readiness` are registered. Response
is always `state=LOCKED, executionAllowed=false`; source/permit verification is
explicitly NOT_PERFORMED/NOT_INSPECTED. It does not attest translation readiness.
The old controlled-status route is intentionally absent. Initial Web status may
show BLOCKED; click **Kiểm tra quyền thực thi** for the new readiness response.

CORS allows exactly configured localhost:5173/127.0.0.1:5173 origin(s), GET and
Authorization. OPTIONS is transport preflight only. All other methods (including
HEAD) are 405 before auth/DB work; unknown GETs are 404. No login/refresh route,
activity logging, provider, translation service, permit import or POST registration.

## Private minimum configuration — not provisioned by this step

`read-only-web.example.json` is deliberately UNUSABLE and contains no credentials.
Prepare a separate restrictive-ACL file outside the repository only after secure
configuration approval; set `READ_ONLY_WEB_CREDENTIALS_FILE` to its absolute path.
Required fields are the example keys only. Full execution credentials and extra
fields (Gemini key, real refresh secret, model, permit) are rejected.

The URI must use a **dedicated authenticated read-only MongoDB principal**, exact
database/SRV/replica set. Do not reuse a readWrite URI from execution credentials.
Startup checks hello/deployment and server-returned `connectionStatus` effective
privileges. Only a fixed read-action allowlist scoped to that database is allowed,
including find on users/projects; any write/cluster/cross-database/unknown privilege,
missing or inaccessible privilege proof fails before listener/app/model imports.
autoCreate/autoIndex are disabled before connecting/importing models. No migration,
seed, index or collection creation occurs. Never create/change DB accounts/roles
under this task's no-write authorization. If no suitable account exists, STOP.

Reuse only the existing access JWT verification secret (not a Customer JWT).
Existing auth config requires a refresh secret, so this standalone process creates
an ephemeral unused value; it does not load/rotate the deployment refresh secret.
No tokens are signed or returned by this executable. Customer authentication uses
the existing Web session directly, without export or refresh.

After configuration and isolation are independently verified, operator commands:

```powershell
docker compose -f infra/backend-web-readiness/compose.yaml config --quiet
docker compose -f infra/backend-web-readiness/compose.yaml up -d --build --wait
# Stop only this readiness container; never touch PERMIT volumes:
docker stop --timeout 15 narration-read-only-web-readiness
```

Loopback port 18083 must be free. Do not start concurrently with real controlled
execution; do not stop/reconfigure an existing runtime to obtain the port. Both
Web/backend execution gates stay OFF. This composition has no execution gate to
enable and no permit/Gemini secret mount to add. Do not combine it with PERMIT via
Compose overrides. Readiness global GROUPS_V1 remains false.

## Validation and live gate

Focused tests use synthetic in-memory user/project fixtures, real localhost HTTP,
actual JWT/RBAC/ownership middleware, and mocked Mongoose queries. No real DB writes
or providers. Privilege/startup guard checks are mocked, not a live Mongo privilege
attestation. Tests cover JWT expiry, deleted customer, ADMIN/non-owner, CORS and
GET-only isolation. Live startup/browser requires the missing minimum read-only
configuration; do not mark live CORS/auth PASS based on mocks.

In the existing Customer session, open controlled-preview with preview opt-in,
dedicated origin and execution flag=false, then click readiness. Expect GET only,
authenticated LOCKED and executionAllowed=false. No POST/refresh, token export,
permit or provider work. Do not export unsanitized HAR or Authorization headers.
