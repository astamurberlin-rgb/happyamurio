# Private read-only Day comparison

Local candidate based exactly on published commit
`356189ed6f85293a2757ef868474d04cec96e413`. The separate semantic-empty fix is
not included. No real profile login, cloud request, data mutation or deployment
was performed in this work. Real Safari exports were never copied into this
candidate, its tests, fixtures or report artifacts.

## User flow

Settings has **Подготовить сверку**, followed by a visible **Скачать файл** link
only after successful preparation. The second user gesture downloads a Blob
JSON file; there is no synthesized async click, new tab or API URL navigation.
This is intentional for browser/iOS download restrictions. Actual iPhone file
delivery is not claimed verified by synthetic tests.

The private file contains only:

- Current owned `day/journal` snapshot and SHA-256 digest.
- Its valid owned baseline snapshot/identity, when present.
- One fresh GET's decrypted owned remote journal and safe version identity,
  or an explicit absent result.
- Observed content comparison, allowlisted receipt status/version metadata,
  and up to 24 recovery entries' action/state/reason/version metadata.

It does not contain auth objects, passwords, access/refresh tokens, encryption
keys, request headers, ciphertext, CFG, Meal, other app namespaces, recovery
graph nodes, raw/live backups, or arbitrary metadata/error strings. User-written
Day journal contents are intentionally included for the requested private
comparison. The observation is not a repair or proof of the historical cause of
a conflict. An absent receipt is not evidence that no cloud save ever happened.

## Read-only boundary

- Dedicated fixed-scope GET uses the already-valid pinned token. It never calls
  clRest, clToken, auth refresh, creator, sync engines, backup, commit, restore,
  scheduler reset/notify/flush, or storage setters/removers.
- Expiring/expired sessions and 401 stop honestly without refresh or retry.
- The existing auto lease is acquired non-blockingly during preparation. A busy
  sync refuses preparation rather than queueing or forcing synchronization.
  Other manual sync buttons are gated in memory while preparation is active.
- Persistent owner/session/key plus local DB and receipt/recovery revision are
  checked before/after every await and again before Blob creation and Download.
  These internal fences are never serialized into the report.
- Snapshot limit: 3,000,000 UTF-8 bytes each. Streamed response limit: 4,008,192
  bytes. Final report limit: 10,000,000 bytes. Absolute preparation deadline:
  20 seconds. Unsupported response streaming fails closed.
- The Blob is revoked on failure, pagehide, auth pause or after ten minutes.
  Pagehide during preparation also prevents a late artifact. A stale download
  click is cancelled and asks for a new comparison. No persisted data is cleared.

## Changed files

- `dist/day/day-diagnostic.js`: isolated reader/comparison/metadata core.
- `dist/day/day-journal-sync.js`: dedicated pinned GET, local-only UI and guards.
- `dist/day/index.html`: load the diagnostic core before the adapter.
- `tests/auto-adapter-fixture.cjs`: loads the new module for actual integration.
- `tests/diagnostic-export.cjs`: 20 focused synthetic integration tests.

## Verification

- Focused integration: **20/20 PASS**, output
  `tests/diagnostic-focused-results.txt`.
- Current aggregate: **233/233 PASS**, output
  `tests/diagnostic-all-results.txt`.
- Tests cover zero physical storage writes/removes; one GET with no refresh;
  auth/CFG/Meal/cipher/recovery secret sentinels; malformed/foreign metadata;
  auth/local/evidence races across digest/stream/decryption; expiry/401;
  crypto/response failure; size/timeout; busy lease; duplicate preparation;
  explicit download fence; and artifact revocation, including late pagehide.
- No test uses the user's real journal or credentials.
- Hosting manifest unchanged; no semantic-empty or full-sync behavior changes.
- Parent separately confirmed managed-browser guest UI: section/button visible,
  download hidden, signed-out preparation returns safe error without a file.

`DIAGNOSTIC-FROZEN-SHA256.txt` identifies this candidate. The inherited
`AUTO-FROZEN-SHA256.txt` describes the previous build only. Parent owns final
independent review and any release.
