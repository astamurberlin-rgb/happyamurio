# Day reads Sport measurements: offline prototype · 6 November 2026

A small [standalone prototype](../prototypes/day-sport-readonly-v1/README.md) now
implements a read-only measurement projection. It is not loaded by Day or Sport,
and it has not contacted a real account or backend. Sport's current encrypted
`sport/journal` remains the only authority. There is no write, import, persistent
cache, date merge, migration, auth refresh or legacy `sport/measurements` fallback.

Exact Day and Sport source inspection confirms matching PBKDF2-SHA-256 derivation
parameters. Compatible reads still require the same actual UID and password-derived
key; separate origins and login storage do not establish a shared session.
Existing Day clGet/clToken helpers are deliberately not reused because they can
refresh or persist auth state and do not provide the narrow validation contract.

The reader uses one fixed GET with owner/namespace filtering, validates the response
and encrypted full-journal envelope, pins owner/key/session/persisted fence and
lifecycle generation, bounds response size and total asynchronous waiting, and
rejects late responses. It exposes immutable live measurements preserving order,
duplicate dates, zero/null, finite extensions and accepted date-shaped strings.
Trash contents, workouts, notes and credentials are not returned. Missing cloud
row, valid empty data, auth unavailability and read/decrypt failures are distinct.

65 synthetic tests and module syntax checks passed. Tests use real WebCrypto,
fake transport and no ambient network or storage. [Independent review](../prototypes/day-sport-readonly-v1/review/REVIEW.ru.md) passed
19 cases: 14 adversarial reader tests and 5 exact-source contract/provenance tests.
These overlap the author tests and must not be summed as unique acceptance cases. These are offline
contracts, not live three-app acceptance.

## Before connecting it to Day

- This approach must fetch and decrypt the whole Sport journal transiently, even
  though only measurements leave the reader. It is not field-level backend access.
- A trusted Day auth adapter and immediate UI/reference cleanup on auth, key,
  storage, navigation and lifecycle changes are still missing. Previously returned
  JavaScript objects cannot be revoked; a renderer must discard them itself.
- Test actual CORS/RLS, key mismatch/changes, browser caches/service workers and
  devices in a separately authorized isolated environment. No personal account is
  a disposable test fixture.
- A successful read is only the last observed cloud snapshot, not proof that every
  local Sport edit has synchronized. Snapshot digests and array positions are not
  durable record IDs.

[Full Russian report](../prototypes/day-sport-readonly-v1/docs/REPORT.ru.md), source
provenance, reproducible tests and hashes are bundled. The broader
[shared-profile/records plan](shared-profile-records-plan-20261106.md) remains a
proposal, with its migration and old-writer protections still required.
