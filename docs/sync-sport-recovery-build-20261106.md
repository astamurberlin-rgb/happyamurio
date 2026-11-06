# Sport measurement recovery, CSV and local build · 6 November 2026

Status: **locally built, tested and independently reviewed; not published**.
This continues the [journal-context form patch](sync-sport-journal-candidate-20261106.md)
and targets exact Sport Sites v6 source
`b00d4474a79f43a0bd64f23b71556f6a7409fe9f`.

No personal measurements, account operations, live backend writes, schema or
access changes, imports or deployment were involved. Data in all tests are
fictional. The original source checkout remains clean. No Site credential was
used in this stage.

## Completed changes

**Deletion and recovery.** Both handlers now construct a separate next journal
state and use the existing verified SportProfiles writer. Current memory, recovery
entries and success messages change only after that write succeeds. Quota failures
leave the prior record/trash intact and allow a normal retry. A write that fails
readback is treated as uncertain: no success, no premature memory replacement and
no blind retry across changed persisted bytes.

Delete actions bind to the form token, date, full record snapshot and owner/auth
context. Trash actions bind to a separate list token and immutable entry snapshot.
Undo uses the exact successful deletion's entry and context. Changed records,
duplicate dates or entry IDs, replaced entries, repeated undo, changed sessions,
owners, writer locks and stale callbacks fail safely. Unrelated journal sections
and journal-valid extension values are preserved.

**CSV and print.** Known field names and units remain. Unknown CSV headers use
`Дополнительное поле: ` without inventing units. Quoting handles delimiters,
quotes and newlines; potentially formula-leading strings are neutralized while
actual numeric negatives stay numeric text. Exports also reject inconsistent
authenticated/session/journal ownership. No new form fields or muscle-state
variants are enabled.

**Existing synchronization protections stay in place.** The actual authority is
still the complete sport/journal, with its current encryption, CAS, recovery
ledger and owner fences. sport/measurements remains disabled. The change does not
introduce a second writer or a cross-origin bridge.

Deleting the last measurement still triggers the existing whole-category cloud
confirmation. Restoring the last trash entry can likewise empty the trash category
and require that confirmation. The tests verify the pending decision and subsequent
explicit-consent CAS; this patch does not bypass either protection. Local success
must not be confused with automatic cloud confirmation.

## Reproducible artifacts

[`patches/sport-sites-v6-recovery-b00d447/`](../patches/sport-sites-v6-recovery-b00d447/)
contains:

- `combined.patch`: the complete form, recovery and CSV changes plus relevant
  repository test updates, based directly on the exact b00d447 source.
- Three independent-entry-point synthetic harnesses: form preservation,
  recovery/CSV and additional review regressions.
- `verification.json`: base/candidate source hashes, patch/harness hashes,
  test results and limitations.
- `build-files.json`: every generated dist file's size and SHA-256.

Apply the combined patch to a clean exact-base copy. Do not stack it on the
earlier patch or apply it to this repository's older Sport app. Full private Site
repositories and generated application payloads are not copied into this public
GitHub checkpoint. The private build backup is for preservation and verification,
not authorization to use a new origin with personal records.

In an isolated copy, with `PATCH_DIR` set to the artifact folder:

```sh
git apply --check "$PATCH_DIR/combined.patch"
git apply "$PATCH_DIR/combined.patch"
node scripts/build-preview.mjs
npm --offline --update-notifier=false --prefix sport run check
node "$PATCH_DIR/check-measurement-fix.mjs" .
node "$PATCH_DIR/check-recovery-csv.mjs" .
node "$PATCH_DIR/check-independent.mjs" .
```

The build scripts were inspected before execution. They read local source and
assets, regenerate only the isolated copy's outputs and reject nonempty personal
seed arrays. They do not log in, publish, upload or contact the backend. No
dependency installation or previously stopped cloud startup flow was attempted.

## Verification results

- Local preview build: passed.
- Full repository check: passed, including source/HTML syntax, source-output
  consistency, 100 local paths and 93 icons.
- Form preservation harness: **36 passed**.
- Recovery/CSV harness: **49 passed**.
- Additional independent regressions: **12 passed**, not duplicates of those 49.
- Actual AES automatic integration suite: **33 passed**. This includes real
  form, deletion and restore handlers through the unchanged fake-server journal
  pipeline, including the existing category-clear decisions.
- Scheduler suite: **22 passed**.
- Patch applicability and original-source cleanliness: passed.

The full suite includes some of the separately listed tests; do not add all totals
together as distinct scenarios. All four generated entry HTML files are identical:
`sport/index.html`, `sport/dist/index.html`, `dist/index.html`,
`dist/sport/index.html`. SHA-256:
`f68775d7ac8fb6b9eaaa9bc2718fa2cb2466c7a2740a41767b84db52469fb319`.

Old aggregate fixtures were updated to use the actual profile store and validator,
complete synthetic journal data, and form tokens. Their existing removal, restore,
empty-state, conflict and paired-field assertions were retained, not disabled.
Independent review found no remaining blocker within this bounded patch.

## Still not a cross-app release

- No visual browser, iPhone/PWA, actual authentication/RLS, real device or
  cross-origin acceptance test was performed. Generated parity is not visual QA.
- The generic application's persistence error handling outside these measurement
  handlers remains unchanged. This is not a journal-wide transactional rewrite.
- Native min/max/step constraints still apply to imported visible known values.
  Handler preservation does not prove browser acceptance of an out-of-range or
  off-step existing control. Hidden extensions have no such form controls.
- Dates retain the current schema's date-shaped contract. No historical values
  were reclassified, dropped or migrated. Storage is not made transactional across
  arbitrary old clients by this patch.
- The user goal remains one profile and a common record collection, with each app
  using its relevant parts. Current channel differences, legacy data ownership,
  stable IDs, conflict/deletion rules and safe cutover still need design and testing.
  See the [deployed-contract audit](sync-deployed-contracts-20261106.md).

Keep existing installations, browser storage and historical backups. This verified
local build must not replace whole Day, Meal or Sport Sites without resolving the
integration boundary and completing the appropriate release checks.
