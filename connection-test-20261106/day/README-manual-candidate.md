# Day controlled cloud-sync test candidate

Private project: `appgprj_6aeafab3dd008191bd0d6c6318abdf3a`.
Checkout: `day-auth-test-20261104`. This does not replace the main Day app.
The hosting manifest was not changed. No publication, real authentication,
real cloud mutation, or historical import was performed by this worker.

## Enabled scope

Existing-account login, token refresh and local logout remain enabled.
Background boot/login/edit/import/online/visibility checks remain read-only.
Automatic restore is allowed only into an empty local copy, after a verified
local recovery backup. A populated local copy is never automatically replaced.

Explicit **Save journal to cloud** operates only on `day/journal`:

- Without a remote row and without a previous baseline, creates a nonempty
  snapshot using the unique `(user_id, app, kind)` key and
  `POST ...?on_conflict=user_id,app,kind`, `resolution=ignore-duplicates`.
- For later versions, compares the current decrypted remote snapshot against
  a verified owner-scoped baseline containing `at`, `iv` and canonical SHA-256.
  The only update is a conditional PATCH filtered by exact owner/app/kind/at/iv.
  No unconditional overwrite or cloud-row DELETE exists.
- Missing baseline, unexpected remote version, or a concurrent winner stops
  the write. No timestamp-based last-write-wins or automatic merge is used.
- Deletions are part of the next explicit snapshot. Replacing a populated
  remote with an empty journal requires a separate visible confirmation with
  the remote day count and a verified backup. An empty first row is refused.
- Success requires the returned row to match the request exactly, then a fresh
  decrypt/readback with exact at/iv/ciphertext and canonical content equality.
  Later local edits remain local and are explicitly reported as unsent.

Explicit **Accept cloud copy** previews local and remote day counts, shows a
visible confirmation (including a special empty-cloud warning), backs up local
and remote snapshots, rereads the exact remote version and only then commits.
It can resolve a populated-local conflict without clearing browser storage.
An unresolved request that can still match its original baseline must first be
reconciled. No historical data is fabricated or imported.

## Durable attempts and safe retries

One bounded current-attempt ledger stores the exact encrypted row, digest and
expected CAS identity before dispatch. Web Locks plus exact prior-ledger
comparison prevent another tab from replacing an unfinished attempt. Confirmed
attempts may rotate to a new explicitly requested revision; unresolved ones do
not. Confirmed baselines are persisted even when newer local edits exist.

Timeout, interruption or an uncertain response triggers no automatic repeat.
A separate readonly check distinguishes:

- Exact candidate at/iv/ciphertext/digest: acknowledge verified completion.
- Exact original baseline, or absence for a create: offer a separate explicit
  retry. A new click and confirmation reread the remote and decrypt/verify the
  stored candidate with the current account key. Only that same ciphertext, IV
  and CAS condition may be retried. New edits are not substituted.
- Any other version: conflict. An explicit backed-up cloud restore may resolve it.

If the original delayed request and a retry race, only one can satisfy the same
CAS or unique-key insertion. A late result cannot replace a newer ledger.

## Transport and account isolation

`auth-read-only.js` remains the first application script. Generic fetch/XHR
mutations are blocked. Only the exact trusted save button grants one short-lived,
single-send capability for scoped INSERT or conditional PATCH. It cannot enable
other rows, profiles, signup, link/counter/measurement writes, RPC or storage
endpoints. Beacon and WebSocket transports are blocked.

The trusted-click window is cleared with a macrotask, not a capture-listener
microtask, to preserve real browser onclick handling. The parent independently
verified the original microtask failure and macrotask success with native clicks
and a fake fetch backend. A final candidate browser check remains parent's work.

The capability independently pins UID, in-memory session/key and persisted
access/refresh tokens, expiry, raw key and random login generation before and
after native fetch. Adapter/core fences also run around awaits, local revisions,
backup, receipts and commits. Storage clear and same-UID auth changes invalidate
the profile. Old refresh success/failure and profile metadata saves cannot revive
logout or overwrite a newer stored session. Auth state is never copied between
apps. The only Sport link is the separately supplied test origin; it explicitly
requires its own login and is navigation, not synchronization.

The application auth/REST entrypoints fail closed if the firewall is absent.
CSP uses `form-action 'none'` and restricts connect-src to self and the exact
Supabase host. Model API-key input/save remain disabled.

## Recovery capacity

The existing compact recovery graph is capped at 524,288 UTF-16 characters.
It retains the latest acknowledged pre-restore checkpoint and up to two ordinary
acknowledged checkpoints, rotating only acknowledged redundancy. Unresolved or
unique unacknowledged evidence is never silently evicted. An unsafe overflow
blocks synchronization before cloud mutation. Local restore/write safeguards
remain in place.

The attempt ledger retains one current encrypted payload, not an unbounded
history. Before ledger writes, a temporary reserve probe proves space for the
next journal save plus at least 256 Ki characters of headroom. Crash-left reserve
probes are cleared by ordinary saves/startup; recovery checkpoints are untouched.
Quota before a pending ledger prevents dispatch. Quota after verified readback
retains the old pending ledger and reports that reconciliation is needed.

Synthetic large-journal results:
- 100 KB journal + 40 explicit edits: recovery 302,495 chars; current receipt
  133,928; live DB 200,415. All 40 conditional updates succeeded.
- 40 alternating two-origin edits/manual restores: maximum recovery 303,681
  chars; maximum receipt 80,592. No background cloud write occurred.

## Acceptance commands

Run from this checkout:

```
node --test tests/controlled-cas.cjs tests/controlled-adapter.cjs tests/controlled-transport.cjs tests/auth-read-only.cjs tests/auth-persisted-fence.cjs
node tests/profile-partitions.cjs
```

These use fabricated journals, synthetic credentials, real local AES-GCM/SHA-256,
mock Storage/Web Locks and fake network responses. They cover races, crashes,
exact retries, async confirmation false/cancel, quota, malformed responses,
account/key switches, restored baselines, deletions, conflicts, bounded retention
and side-channel mutation prevention. No test contacts the live backend.

The earlier one-shot controlled-create test was superseded by controlled-cas.
Other copied candidate suites describe the original write-enabled candidate and
are not the acceptance suite for this restricted test build. See
`README-base-candidate.md` only for that earlier context.

Known limits: settings remain local; other app summaries/counters/measurements
are not written by this build; different origins do not share local storage;
missing Web Locks disables manual cloud mutation; legacy tabs that ignore the
locks cannot be claimed cross-tab safe. Keep all test tabs on the updated build.

## Test discovery audit

The historical broad run was **142/155**, not an all-tests pass. Six obsolete or
external-checkout scripts are now preserved unchanged under `tests/legacy/` as
`.cjs.txt`; their exact failures, old assumptions, browser permission blocker and
current replacement checks are mapped in `tests/legacy/README.md`. This move is
not claimed as a product regression fix. Useful defaults/recovery checks were
ported to current fixtures; no production/core code changed during that audit.

Current focused acceptance is **106 passing cases**. Current top-level test
files can also be run with `node --test tests/*.cjs`; this includes the generic
snapshot engine and current draft/travelling UI checks. The archived browser
launch remains blocked, not passed. Managed-browser results are separate.
