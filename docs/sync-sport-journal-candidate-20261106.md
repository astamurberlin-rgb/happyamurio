# Sport journal measurement preservation · 6 November 2026

Status: **unreleased source-only patch for the exact current Sport Site**.
This is not a replacement app and has not been built or published. The earlier
dedicated-channel candidate and this patch target different storage contracts.
See the [source audit](sync-deployed-contracts-20261106.md) before using either.

## Saved artifacts and target

The patch targets Sport source commit
`b00d4474a79f43a0bd64f23b71556f6a7409fe9f`, Site v6. Artifacts are in
[`patches/sport-sites-v6-b00d447/`](../patches/sport-sites-v6-b00d447/):

- `measurement-preservation.patch`: form-source change and one automatic
  integration regression. No transport, server, access or storage-schema change.
- `check-measurement-fix.mjs`: standalone synthetic tests that load the actual
  target's profile store, validator and measurement form code.
- `verification.json`: exact base, artifact and changed-file hashes, test totals
  and verification limits.

Only this narrow diff, synthetic harness and verification material are saved
here. Full separate Site source repositories, account information, keys, personal
records and exports are not included. The original source checkout stayed clean;
implementation used an isolated copy with no remote credentials.

## What the patch changes

The form previously rebuilt values using only its 17 known controls. It now
starts from the latest record and preserves unknown fields accepted by the
current journal validator, including null, zero, negative and large numbers.
Changing a date or clearing displayed fields retains these extensions and record
metadata. Missing form controls are not interpreted as requests to clear data.
No fields or relaxed/contracted variants are added to the interface or schema.

An opening snapshot binds the form token, original date, selected owner,
authenticated UID/token/key identities, stored authentication generation and
lifecycle generation. The current authenticated journal must belong to that
owner. Stale known fields, owner/session changes, deleted or ambiguous source
dates and occupied destinations reject the save rather than overwriting them.
Unknown fields come from the latest record, not the opening snapshot.

The handler constructs and validates a new complete journal state, retaining
unrelated sections. It calls the existing verified owner writer directly because
the generic persist wrapper swallows storage errors. Only a successful verified
write replaces in-memory state and displays success. The current automatic-save
listener reads state in a deferred microtask, after that replacement. A regression
executes form save through real AES and the unchanged journal CAS pipeline.

The patch does not activate sport/measurements, alter journal encryption or
introduce a second writer. An embedded screen still cannot save the full journal.

## Verification and reproduction

Start from a separate, permitted checkout of the exact base SHA. Do not apply this
patch to this repository's older Sport directory or to a working production copy.
With `PATCH_DIR` pointing at the saved artifacts and `CANDIDATE` at that isolated
checkout, the relevant commands are:

```sh
git -C "$CANDIDATE" apply --check "$PATCH_DIR/measurement-preservation.patch"
git -C "$CANDIDATE" apply "$PATCH_DIR/measurement-preservation.patch"
node --check "$CANDIDATE/sport/src/measurements-v2.js"
node "$PATCH_DIR/check-measurement-fix.mjs" "$CANDIDATE"
(cd "$CANDIDATE" && node sport/scripts/check-automatic-integration.mjs)
(cd "$CANDIDATE" && node sport/scripts/check-automatic-scheduler.mjs)
```

All listed checks passed against the final isolated candidate. The saved
verification file records the totals. Targeted cases cover preservation, known
clears, date moves, stale forms, ownership changes, quota/readback failures,
unchanged unrelated sections, guest profiles and blocked embed writes. The
integration suite includes the new full-journal form-to-AES/CAS case. The
scheduler suite remains unchanged. All transports, storage and records are
synthetic; there were no real network calls or account operations.

Independent review reproduced and then verified fixes for in-place session
mutation, raw-key replacement and journal-owner mismatch. It also checked that
the actual deferred save listener observes the committed state. Syntax, diff
applicability and original-checkout cleanliness were verified.

## Explicit limits

- Source-only: generated HTML was intentionally not rebuilt. No claim of
  source/build parity or deployable artifact is made. Full build and release
  checks remain pending; no previously stopped startup workflow was retried.
- The patch fixes form submission. Existing delete/restore handlers and the
  application's generic persistence-error handling are not repaired here.
- The earlier candidate's CSV header/unit fix is not ported by this patch.
- A write that changes storage but fails verification is an uncertain local
  outcome. It shows no success, retains prior memory, and the existing
  observed-bytes guard blocks a blind retry. This is not a transaction or a
  guarantee of browser durability; it does not silently roll back storage.
- Existing HTML min/max and step=.1 constraints can prevent an unrelated edit if
  an imported *visible* known value is outside the UI range or step. The handler preserves unchanged
  values when reached; browser acceptance was not tested. Hidden extensions do
  not have form controls and do not have this native-validation issue.
- Date validation remains the existing date-shaped contract. No migration,
  historical reinterpretation, calendar-rule change or personal import occurred.
- No visual browser, iPhone/PWA, live auth/RLS, cross-origin, independent-device
  or cross-app acceptance test was run. There is no new cross-app bridge.

Next safe work is to review failure handling for deletion/recovery and the CSV
port, then build and verify the exact-source candidate under an approved release
workflow. Cross-app integration still needs the single-authority design described
in the source audit; saving this patch does not make that integration complete.
