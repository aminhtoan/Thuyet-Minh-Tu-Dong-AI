# Safe customer soft-delete operations

## Scope

ADMIN07.2 prepares, but does not execute, a soft-delete for exactly these verified S24 browser-smoke accounts:

- `6ac8e59c475fd1db52cd5d3c`
- `6ac8e5af475fd1db52cd5d66`
- `6ac8ef4684b5977f9b48f23f`

The source allowlist also pins each exact fixture email and the expected name `S24 Disposable Customer`. No name-only or pattern-only cleanup is allowed.

## Dry-run

`npm run audit:s24-customers` is the only command approved in ADMIN07.2. It connects with `autoCreate=false` and `autoIndex=false`, reads the three users, historical project references, dependencies, sessions and ActivityLog counts, then exits before the execution branch.

The dry-run must report:

- environment `development`;
- database `multilingual_ai_narration`;
- the expected deployment fingerprint and replica-set identity;
- exactly three ready candidates and 80 preserved ActivityLog records;
- zero Project, Media, Transcript, Translation, Narration, Result, ProcessingJob and AuthSession dependencies;
- zero database writes.

## ADMIN07.3 execution gates

Execution remains blocked until all conditions below are independently verified:

1. The deployment is confirmed non-production and isolated; `NODE_ENV=development` alone is not proof.
2. The backend and every other writer are stopped or placed behind an operator-controlled maintenance fence. A MongoDB transaction alone does not prevent a separate client from inserting a new dependent document after a read-only precheck.
3. Replica-set transactions are available.
4. An encrypted backup contains exactly the three complete User documents and their 80 ActivityLog documents.
5. The encrypted backup is stored outside the repository/workspace in operator-controlled encrypted storage, can be decrypted in a separate restore rehearsal, and its ciphertext SHA-256 is recorded.
6. An active, non-deleted ADMIN ID is explicitly supplied as `deletedBy`.
7. A final dry-run still passes immediately before execution.

The execution script additionally requires exact deployment fingerprint, backup SHA-256, non-production classification and the literal maintenance confirmation. It uses one transaction, rechecks all identities and dependencies inside that transaction, and performs one conditional `updateOne` per allowlisted User. It never uses `deleteMany`, unbounded `updateMany`, cascading deletion or ProjectStatus updates.

## Backup and rollback

The backup must not be committed or stored unencrypted. It must include internal fields needed for exact recovery, including the original `_id`, lifecycle fields and password hash; access must be restricted as credential material.

Rollback is manual and separately approved. It may only clear `deletedAt`, `deletedReason` and `deletedBy` for the same three IDs when the current soft-delete metadata matches the ADMIN07.3 execution record. Rollback must not delete ActivityLog, restore/reissue AuthSession, alter role/status, or touch projects and artifacts. After rollback, login remains subject to the existing password and account-status checks.

## Audit preservation

Soft-delete keeps the User documents, so existing ActivityLog `userId` references continue resolving. Admin customer list/detail/statistics omit soft-deleted customers, while Admin Logs may still resolve their actor identity. The execution transaction adds `CUSTOMER_SOFT_DELETED` only when ADMIN07.3 is explicitly run.
