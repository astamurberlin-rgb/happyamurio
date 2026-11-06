# Archived test sources, not current acceptance tests

These six copied sources are retained unchanged as `.cjs.txt` historical
artifacts. Moving them is test-suite organization, **not a product regression
fix**. No product/core file was changed while classifying or migrating coverage.
Do not run these as current test-build acceptance tests. Their relative paths
and old APIs describe the original source checkout, not this directory.

## Original broad-run result

Parent's `/tmp/review-day-all-final.txt` recorded **155 cases: 142 passed,
13 failed**. The 13 failures were one legacy adapter script, nine assertions in
the legacy retention suite, two obsolete UI scripts, and one browser launch.
The quota review below passed but tested a different checkout, so it was also
removed from current discovery to avoid misleading coverage.

## Exact classification and replacement coverage

### journal-adapter.cjs.txt: one failed file

First result was `unavailable`, expected `uploaded`. Its VM fixture never loads
`clAssertStoredSession` or a persisted auth identity, so the updated context
correctly fails closed. Even after repairing that fixture, it expects automatic
upload on boot/edit and automatic populated-local restore, all disabled in this
explicit-save test build.

Current replacements:
- `controlled-adapter.cjs`: real crypto/transport/manual save, fresh-origin restore,
  versioned edit/delete, divergent conflict, explicit restore, persisted auth,
  no-Web-Locks and quota tests.
- `auth-read-only.cjs`: boot/login checks never upload, empty-only restore,
  populated protection and account switches.
- Added actual Day default model + HappyCare initialization test, including
  screen/train/numeric/history/imported archive/unknown-field preservation.

### recovery-retention.cjs.txt: nine failed assertions, one passing assertion

Exact old names and failure reasons:

1. `100 KB plus 10 edits stays bounded and uploaded (original reviewer workload)`:
   boot/run correctly returned read-only, not uploaded.
2. `250 successive 100 KB edits keep syncing with two acknowledged checkpoints`:
   same obsolete automatic-upload expectation.
3. `120 alternating device edits/restores rotate only acknowledged history`:
   remote was never seeded because automatic upload is disabled; later fixture
   edit dereferenced a nonexistent day. It also expects populated auto-restore.
4. `unresolved conflict bytes and each preserved unique pair remain pinned at cap`:
   fixture attempted to seed remote via automatic upload, leaving remote absent.
5. `capacity preflight fails before adding backup or writing cloud, preserving ordinary-save room`:
   read-only mode stopped before upload preflight, correctly returning
   cloud-write-disabled rather than recovery-capacity.
6. `headroom reserve accounts for next DB growth, not only the backup bytes`:
   same obsolete automatic-upload preflight assumption.
7. `post-commit compaction failure keeps current data and pending recovery; later retry acknowledges safely`:
   no automatic upload/commit occurred, so expected uploaded was obsolete.
8. `uncertain cloud outcome is pinned until a fresh read confirms that exact upload`:
   no automatic request occurred, so cloudWriteUncertain was absent.
9. `legacy archive conversion preserves all unresolved snapshots but drops duplicated revision tokens`:
   absent remote + populated local is read-only, so no destructive transition or
   backup migration was needed. The old test expected an implicit upload backup.

The old `stale temporary probe is removed on next ordinary save and startup,
leaving all recovery checkpoints` passed. It has nevertheless been ported to an
actual current fixture with a verified nonempty recovery checkpoint.

Current replacements in `controlled-adapter.cjs`:
- 100 KB + 40 explicit edits and 40 alternating explicit saves/manual restores.
- Unresolved unique snapshot pinned at the cap; overflow changes neither vault
  nor cloud.
- Capacity probe fails before backup/mutation while ordinary local save works.
- Crash-left reserve cleanup on save/start preserves actual checkpoints.
- Post-commit compaction failure preserves current data; a later read retries
  only local acknowledgement, never cloud upload.
- Unknown/lost-response ledger, readonly reconciliation and exact explicit retry.
- Legacy conflict migration preserves unique snapshots and drops duplicated
  serialized revision strings.

The 250/120 stress-loop lengths were not re-claimed for the current build. Current
large-payload stress counts are explicitly 40 edits and 40 device alternations.

### review-bflow-5110.cjs.txt: one failed file

The extractor's end marker `async function saveRoutedCheckin` no longer exists.
`indexOf` returns -1, so it feeds a truncated file tail into VM and reports
`SyntaxError: Unexpected token '}'`. This is not a syntax error in the full UI.

### review-routed-5110.cjs.txt: one failed file

It likewise extracts/invokes removed `saveRoutedCheckin`; the VM has no such
function and reports `ctx.saveRoutedCheckin is not a function`.

Both old APIs were already absent in checkout HEAD before this sync patch.
Current source uses `saveTravellingCheckin`. Unchanged current
`review-draft-5112.cjs` and `review-travelling-5111.cjs` pass their draft migration,
zero-value, target preservation and additive-save assertions. Full UI syntax
also passes. No UI production function was modified to satisfy obsolete scripts.

### browser-smoke.cjs.txt: one blocked file

Chromium failed before assertions:
`process_singleton_posix.cc:297 ... socket() failed: Operation not permitted (1)`.
The launch was not retried or bypassed here. This script also expects automatic
journal upload (`assert.ok(journal)` after boot) and is not valid for this build.
The parent separately completed managed-browser guest/form/export/disabled-save
and disabled-restore UI smoke plus native trusted-click/mock-fetch tests.
Those are separate evidence, not a claimed pass of this archived script.

### review-day-quota-fixed.cjs.txt: passing but wrong checkout

Absolute paths point to `day-profile-fix-nov4`, the earlier write-enabled
candidate. Its PASS is not evidence for this auth-test build. Current large
journal and quota tests above load only this checkout's modules.
