# Day profile persistence repair candidate, 2026-11-04

LOCAL ONLY. Based on deployed Day 51.14 Test / Sites 16, source 35d3786264d03b354f711ffb06b2f4f8218b5c34. No publication, real-account access, or external data writes were performed.

## Verified root causes

The existing app scopes journals by UID in local origin storage but only retrieves Meal summaries after login. It has no full Day journal cloud backup/restore. Different test domains have independent journals. Guest records can remain under hd_db_v1 while a signed-in UID sees a separate empty journal. Signout does not delete either partition. Existing Day measurements iframe points to GitHub Sport on another origin, so it cannot inherit the Day session.

## Candidate changes

- Adds conservative encrypted day/journal synchronization using existing authenticated Supabase REST protocol and AES-GCM, with UID-bound additional data. No credentials in journal payloads.
- Reads before writing; server conditional insert/update (CAS), not unconditional upsert.
- First-time empty local journal restores populated remote. Populated local without remote uploads. Conflicting populated snapshots stop, preserving both in local safety evidence. With a known baseline, one-sided edits fast-forward; concurrent edits stop.
- Empty snapshots cannot replace populated snapshots. Offline, wrong keys, quota failures and owner switches stop without interpreting failure as empty cloud.
- Writes snapshot and sync baseline together under a Web Lock; all new-version DB writers use the same lock and compare the observed stored revision before writing. Backs up before changes. A window.storage backend and browsers without Web Locks are explicitly unsupported for automatic sync; local saving remains available.
- Detects other-tab storage changes before synchronization; does not silently reconcile them.
- Shows journal status separately from generic account/link status, and a guarded export option for guest records on the same site. It never enumerates another UID or implicitly assigns guest data to an account.
- Retains separate Meal-derived cache and shared counters locally. CFG preferences and unsaved drafts are not promised to sync. Saved DB journal fields, including importedHistory and future unknown fields, are retained. Shared counter definitions/events and Meal cache are excluded from this snapshot and preserved through their existing separate protocols.
- Day logout uses scope=local so it does not intentionally revoke sessions in other apps.
- Cross-origin measurements UI shows an explicit Sport link and separate-login explanation instead of silently embedding a different auth context. Sport destination is the parent-approved current published https://happy-sport-icons-review-20261028.amuramore.chatgpt.site/. Cross-origin auth is not passed; opening the link is not proof of measurement exchange.

## Limits before release

This does not recover records that were never uploaded from an older origin, and cannot inspect the user's phone. The old site/export must be preserved. A conflicting history needs explicit reconciliation, not an overwrite button. Password changes can make existing encrypted records unreadable; the patch stops and reports this.

Unit/adapter checks and managed-browser guest UI smoke passed. Actual cloud-authenticated end-to-end verification is NOT complete. An initial standalone Chromium launch failed with a socket permission error; the supported Sites managed-preview/CUA path subsequently worked without permission changes. No real Supabase writes were made; RLS/production network acceptance is not claimed. Old-version tabs do not honor the new locks and must be closed before use. Recovery storage is bounded and reserves space for the next journal save. A journal or unresolved recovery set too large for that safe budget pauses cloud sync before mutation. See the exact retention and quota policy below.

## Tests

- node --test ../day-sync-core-nov4/snapshot-sync.test.cjs: 36 passing tests.
- node tests/journal-adapter.cjs: passing actual AES-GCM plus fake REST server adapter scenarios (upload, new-origin restore, UID isolation, remote update, concurrent conflict, offline, quota, owner switch, empty overwrite, corrupt ciphertext).
- Node syntax checks of all inline scripts and new/modified JS: pass.
- tests/browser-smoke.cjs: prepared with synthetic auth and all external calls intercepted; launch blocked before page creation (not a pass).

## Files

- dist/day/snapshot-sync.js: abstract synchronization engine.
- dist/day/day-journal-sync.js: encrypted REST/storage/status adapter.
- dist/day/index.html: script inclusion, startup/save hooks, baseline loading, local-scope signout.
- dist/shared/measurements-host.js: cross-origin session explanation.

Additional inherited regression checks: review-draft-5112.cjs and review-travelling-5111.cjs pass. Older review-bflow-5110.cjs and review-routed-5110.cjs fail identically on the untouched deployed source and this candidate (stale function extraction / removed saveRoutedCheckin), so they are not counted as passes or new regressions.

Managed-preview verification update: supported `sites-preview` + CUA browser successfully booted Day, opened Settings, showed signed-out local-only journal status, and switched Journal → Measurements to the explicit cross-origin Sport link/explanation. No app-origin browser errors; only unrelated browser-extension metadata errors. This supersedes the earlier lack of any browser smoke, but does not establish real-account or end-to-end production cloud synchronization. The standalone Playwright script remains unrun due its environment restriction. Auth/session data were not entered or inspected in browser.

Final review hardening: refresh responses are pinned to the initiating session/key; a late refresh cannot revive logout or clear a new account. Full-journal requests also recheck owner/key immediately after token await and before network dispatch, including 401 retries. Integration uses random-IV CAS revisions rather than wall-clock revisions. Both candidate auth changes were exercised with delayed synthetic responses, not real login.

Final test rerun after auth hardening: core 36/36, expanded adapter suite, exact UID/guest profile suite, inherited 51.11 and 51.12 journal regressions PASS. Final managed-browser Settings screenshot inspected: status card and explanatory text render without overlap or stale development wording. No publication performed.


## Bounded recovery retention (P1 quota fix)

The original candidate stored the serialized revision token and repeated complete
local/remote/baseline/raw/in-memory snapshots in an append-only array. The review
workload (a 100,000-character note plus ten edits) produced 10,519,303 recovery
characters for a 200,299-character live DB. That design has been replaced.

The owner-scoped `hd_journal_safety_v1` key now contains a version-2 vault. It uses
structurally deduplicated JSON nodes and references, rather than repeated snapshot
strings. The full own journal, baseline, remote snapshot, persisted DB, and current
in-memory DB remain recoverable. Valid raw JSON is preserved semantically, not
byte-for-byte whitespace; malformed raw storage is preserved verbatim. Operational
revision strings are never stored because they already duplicate the full DB.

Retention is explicit:

- Keep at most two ordinary **acknowledged** upload/acknowledge checkpoints.
- Keep the latest **successfully committed** pre-restore checkpoint. A previous
  successfully committed restore checkpoint can rotate only when its old local
  source was an acknowledged baseline, or the first-restore local was empty.
- Acknowledgement occurs only after the complete local journal and matching
  baseline have been durably committed. A later fresh remote read can also
  establish the exact result of an uncertain upload.
- Pending, failed, uncertain, conflict, and blocked records are never evicted.
  Their unique recovery data remains pinned. If those records do not fit safely,
  sync pauses before replacing any local/cloud journal. There is no automatic
  conflict resolution or deletion of unresolved copies.
- The archive is capped at **524,288 UTF-16 code units** (at most 1 MiB of UTF-16
  character data). Optional acknowledged ordinary history yields first under
  byte pressure, down to zero. The last pre-restore safety checkpoint and all
  unresolved evidence remain protected. This is bounded recovery protection,
  not unlimited historical undo.
- Unreferenced deduplication nodes are removed only after their acknowledged
  checkpoints have become eligible for rotation. Referenced recovery data is
  not removed. Repeated identical evidence does not create new checkpoints.

Before changing the archive, the adapter temporarily probes actual localStorage
capacity while holding the same exclusive journal lock. The probe must fit:

1. Any increase in archive size.
2. The anticipated increase from the next complete journal+baseline commit.
3. Additional spare space of at least 262,144 code units, or one current/next
   journal size, whichever is larger.

The probe uses a conservative non-ASCII filler, is read back, and is removed
before the backup write. No persistent filler consumes the reserved headroom.
A quota failure leaves the previous archive and journal unchanged and prevents
the subsequent cloud/local sync mutation. Ordinary local saves do not append
recovery history. A probe left by a crashed tab is removed on startup or the next
ordinary save, without removing recovery checkpoints. Concurrent unrelated
applications or future journal growth can still consume origin storage; the
capacity check is a guarantee about that operation, not unlimited device space.

If post-commit acknowledgement/compaction fails, the newly committed journal is
still reported as saved, and the existing recovery record remains pending. A
later run retries acknowledgement against the exact durable baseline. It never
rolls back good journal data merely because cleanup failed.

Legacy version-1 arrays are converted conservatively with all recoverable
snapshot contents retained and duplicated revision strings excluded. Because
legacy entries have no reliable completion receipts, they are not guessed to
be acknowledged or silently discarded. If safe conversion does not fit, sync
stops and leaves the original archive untouched.

### Quota regression evidence

All of these use fabricated data and fake REST/Storage implementations:

- `node tests/recovery-retention.cjs`: **10/10 pass**.
- Same 100 KB + ten-edit review workload: recovery **301,591 characters**, live
  DB **200,299**, final state **uploaded** (roughly 97% less recovery storage).
- **250 successive 100 KB edits**: every sync succeeds; recovery plateaus at
  **301,600 characters** with two acknowledged checkpoints.
- **120 alternating-device edits and 120 restores**: all succeed; maximum recovery
  **502,427 characters**, below the 524,288 limit. Old acknowledged restore
  checkpoints rotate instead of blocking normal two-device use.
- Protected conflict cap, capacity/headroom failure, orphaned probe cleanup on
  save/start, failed post-commit compaction/retry, uncertain upload confirmation,
  and conservative legacy conversion all pass.
- `tests/review-day-quota-fixed.cjs` reproduces the review workload unchanged.
  The original `/tmp/review-day-quota.cjs` was not modified. The fixed fixture
  adds only the missing standard Storage APIs `removeItem`, `length`, and `key`.

This remains a local candidate. These checks do not establish real-account,
production storage, live Supabase, or device-specific browser quota behavior.
