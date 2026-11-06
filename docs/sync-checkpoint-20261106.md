# Happy sync checkpoint · 6 November 2026

Status: **unreleased review candidate**. This checkpoint preserves code and tests;
it does not claim that deployed applications or real-account sync are fixed.

## Source and scope

Based on `astamurberlin-rgb/happyamurio` main commit
`b8ff805511d0287bc3b064583ceda49a8e19b218`. The full 416-file source snapshot was
verified against GitHub blob hashes before editing. Only task files are changed.
Separate Sites builds have not been replaced or synchronized into this branch.
Newer Sites journal/UI adapters must not be overwritten by older GitHub versions.

No personal diaries, measurements, health exports, account credentials, or tokens
are included. All test data are fictional. No production or Supabase schema,
policy, account, or data changes were made.

## Fixed in this candidate

1. Equal-revision measurement conflicts converge regardless of arrival order.
   Deletion wins a tie; stable object-key comparison resolves other ties.
2. Malformed local measurement documents fail closed. They are not silently
   filtered into an empty document and overwritten.
3. Legacy migration adds only missing dates. Existing shared values and deletion
   markers win; existing recovery trash is preserved.
4. Edits made during upload are reconciled and uploaded before reporting that
   all measurements are synchronized. The bounded retry loop remains; exhausted
   attempts report pending synchronization rather than success.
5. Recovery entries are reconciled by immutable ID rather than replacing a stale
   whole array. Delete/restore callbacks refresh current local state; malformed
   recovery bytes are preserved, and interrupted saves retain a recovery copy.
   See [the recovery follow-up](sync-recovery-followup-20261106.md) for scope.
6. Editing a measurement preserves additional numeric fields from the latest
   local record, including fields not present in the form. Stale forms and
   profile changes are rejected. Unknown CSV fields have no guessed unit.
   The original 17 visible fields and ordinary labels are unchanged. See
   [the field-preservation follow-up](sync-field-preservation-20261106.md).
7. Day rechecks the current Day link after refreshing a food counter. A stale
   button cannot add a serving after Meal has disabled that Day link. Existing
   servings and the independent Sport link are preserved.

The measurement document remains version 1, using the same keys and existing
encrypted `sport/measurements` channel. No field-by-field conflict model or
server migration is introduced. Sport's checked-in HTML is rebuilt from source.
App release labels remain unchanged because this is not a release.

## Verification

Use Node.js 18+ (verified on 24.22.1). No dependency installation is needed for
these checks. From the repository root:

```sh
node scripts/sync-shared-ui.mjs
npm --prefix sport run build
npm --prefix sport run check
node scripts/check-layout.mjs
node scripts/check-shared-ui.mjs
node scripts/check-meal-times.mjs
node scripts/check-meal-exports.mjs
node scripts/check-food-counters.mjs
node scripts/check-food-counter-offline-boundaries.mjs
node scripts/check-measurements-model.mjs
node scripts/check-measurements-regressions.mjs
node scripts/check-measurements-recovery.mjs
node scripts/check-measurements-fields.mjs
node scripts/check-measurements-shared.mjs
node scripts/check-measurements-synthetic.mjs
node scripts/check-measurements-two-clients.mjs
node scripts/check-account-profile.mjs
node scripts/check-profile-storage.mjs
node scripts/check-gradients.mjs
node scripts/check-now-draft.cjs
node scripts/check-selfcare.cjs
```

All listed checks pass. Added measurement checks cover 15 merge-contract
scenarios, 15 real-adapter regression scenarios, 16 local recovery scenarios,
nine form/extension scenarios, and 20 separate reference-model scenarios. Seven
additional counter checks cover offline recovery, failed reads,
CAS exhaustion, account changes, stopping, local storage failure, and malformed
remote documents. The original counter suite includes the stale-Day-button test.

The additional six-scenario two-client suite runs two actual adapters with
separate storage against encrypted in-memory server rows. Five scenarios verify
current-candidate behavior. The sixth deliberately reproduces an incompatible
legacy/new-client combination; it is not a successful compatibility test.
See [the mixed-version result](sync-mixed-version-check-20261106.md).

Real-adapter tests execute repository code with AES-GCM and an in-memory REST
substitute, including interrupted migration, repeated edits during all four
upload attempts, and account switching during a sent upload. The separate
20-test reference model is labelled as a model, not evidence about deployed
transport. Existing suites cover profile separation, embedded-view boundaries,
source/build consistency, local paths, UI, exports, timing, and diary regressions.

## Remaining work before release or historical-data import

- Reconcile exact current Day, Meal, and Sport deployment sources and newer
  journal changes. Do not replace whole Sites applications with this branch.
- Test with an authorized separate test account across two browsers/devices:
  read/write, loss of network, reload, concurrent changes, account switch, and
  mixed old/new clients. RLS, real authentication, and actual network transport
  have not been exercised by this checkpoint.
- Old clients use the previous conflict algorithm. The new two-client suite
  confirms repeated resurrection/deletion oscillation with the unmodified
  Meal Sites v12 client. Upgrade compatible consumers together and verify before
  importing historical data; publishing only one side is not safe evidence of
  completed synchronization.
- Old forms also discard additional numeric fields when editing a date. The
  candidate preserves these fields, but cannot make legacy clients safe. No
  new muscle-state controls are enabled before a separate design review.
- Measurement conflicts resolve per date, not per field. Simultaneous independent
  field edits on the same date do not combine automatically.
- Recovery changes now preserve sequential updates from stale tabs and failed
  delete/restore writes. Truly interleaved localStorage read/modify/write
  operations are not atomic, and legacy clients still use the old behavior.
  Recovery entries remain local-only, not synchronized across origins/devices.
- The adapter still uses localStorage without transactional multi-tab write-ahead
  storage. The reference model's stronger persistence behavior must not be
  attributed to the real adapter.
- Keep old installations and browser storage until migration and recovery are
  verified. No historical measurements were imported here.

Recommended next step: review this isolated patch, reconcile exact deployed
sources, then run the controlled cross-app test before release.
