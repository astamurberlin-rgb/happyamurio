# Day: device-local time and explicit legacy reconciliation

Local-only candidate from published commit
`10495d7ed519ed2a9d28767d15bf3ba7aa88d0fb` (diagnostic build). No deployment,
real sign-in or live cloud mutation was performed. No user's JSON, journal
content, fingerprint or credential is embedded in source, tests or this report.
The separate default-plan-date fix is not included.

## Narrow behavior change

Automatic `day.mind` activity stays in this device's owner-scoped local DB and
continues recording. It is excluded from authoritative journal payloads,
comparison revisions and dirty notifications. Shared journal restores preserve
the exact current local mind rather than copying another device's timer.
Physical disk and persisted account/session/key checks remain in place: a
foreign tab's passive-only write still cannot be overwritten by stale memory.

Existing cloud payloads containing legacy mind are never silently replaced by
ordinary automatic save, manual save or restore. They require the explicit
**Сверить и сохранить обе истории** operation. If legacy content is malformed,
there is pending uncertain work, or personal differences are not provably
local-only, the operation stops rather than performing a general merge.

## Explicit protocol

1. Capture the current owned local input and fresh full decrypted cloud input.
   Compute/verify full raw snapshot digests. Projection is used separately only
   to compare personal content without passive mind.
2. Prove that every remote personal field is already present and equal locally.
   Additional local records are retained. Remote-only records or different
   overlapping scalars/nonempty arrays refuse the repair and require new review.
3. Ask a custom visible confirmation. Explain that the archive captures the
   original preview, local tracking continues during confirmation, and the two
   histories have no calculated combined total.
4. Recheck local personal revision and reread the exact remote identity
   (at/iv/full digest). Verify durable protected backups of both complete source
   snapshots, with the existing bounded vault and journal headroom checks.
5. Attach the immutable, bounded archive locally before dispatch. It contains
   separate unchanged raw `n/sec/ss` variants and source digests/remote identity.
   No deduplication, summation, maximum or invented session ID is used. The
   archive is at most 262144 UTF-8 bytes. No stored baseline is invented here.
6. Reuse the existing durable CAS/receipt engine with the reviewed remote
   identity as the expected version for this one explicit attempt. Only exact
   conditional PATCH is possible; no first-create or row DELETE. A further GET
   before writing and exact readback verify the current row and accepted payload.
7. Commit/acknowledge only with the existing local/owner guards. Newer personal
   edits remain a separate next version. Unknown outcomes use the existing
   receipt reconciliation/exact-packet retry, never blind new writes.

A crash after local archive attachment but before the attempt may resume only
against the same remote identity and exact raw remote history, reusing the
unchanged archive. The archive cannot be dropped by an ordinary upload, incoming
canonical row, or local import. Valid archive metadata does not bypass the
existing confirmation for deleting the final personal record.

## Raw integrity and collector safety

Cloud readback hashing remains over the full original decrypted payload, never
over a projected payload presented as the old digest. Legacy local baselines
are projected only for semantic comparison; their original snapshot/identity
remain in DB and backups. A clean legacy device can accept a canonical repaired
cloud snapshot while keeping its own local timer.

Before local DB replacement the actual collector is paused. Its object is reset
and an old index is resumed only when the entire copied LOCAL mind array matches
exactly. Otherwise a fresh session index is used, never the old index in an
imported array. A failed replacement resumes the original local collector.
Owner changes stop it. Archived raw histories are never ticked or recomputed.

Settings shows **time on this device**, explicitly says that no combined total
is calculated, and exposes the two separately labelled immutable raw histories
in expandable sections, including after a clean-browser restore. Continuing
local tracking is distinguished from the original preview archive.

## Verification and limits

Focused results: **51/51 PASS**, `tests/passive-focused-results.txt`.
Aggregate results: **284/284 PASS**, `tests/passive-all-results.txt`.

- Pure planner: schema/subset/bounds, duplicates and zero durations, exact resume,
  input immutability and strict archive validation.
- Actual adapter: explicit repair, fresh-browser restore, repeated device edits,
  passive ticks, legacy baseline, personal conflicts, auth/disk/CAS races,
  cancel/late edits, source quota, crash before attempt and lost response.
- Actual index collector VM: local continuity, safe index reset, untouched raw
  archive, paused/failing replacements and account changes.
- A synthetic 182KB Meal cache plus a previously protected conflict, repair and
  eight subsequent edits leaves the recovery vault at **191305 characters**,
  below its 524288-character cap. Unresolved originals were not pruned.
- A separate managed native-click/mock-fetch fixture was confirmed by the
  parent: the exact repair button produced one permitted synthetic scoped send.
  No real backend or authentication was used.

This is not a distributed activity tracker or a general conflict resolver.
Other real personal/settings conflicts still stop safely. Old simultaneously
open versions do not honor the new projection and should be reloaded before
using this candidate. Parent owns independent final review and any publication.
