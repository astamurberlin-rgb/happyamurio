# Measurement recovery follow-up · 6 November 2026

Status: **unreleased review candidate**, continuing commit
`6ae4547dd069d987e019687f386a6b6891dcb079` on the existing synchronization branch.
No production application, account, personal record, permission, or server schema
was changed. Test records are fictional and the tests make no network requests.

## Confirmed defect

Each tab previously saved its entire cached recovery array during any persist.
If tab A deleted a measurement, tab B could erase its recovery entry by saving
unrelated state before receiving the storage event. The old code fails the new
regression with expected recovery IDs `["a"]` versus actual `[]`.

A stale restore callback could also recreate a measurement after another tab
had already restored and deleted it again. This is a code-level reproduction,
not a finding that any user's data was affected.

## Bounded correction

- Recovery entries keep immutable IDs. Persist applies this tab's additions and
  removals to the latest stored array, preserving other tabs' completed changes.
  An untouched stale entry is not added back after another tab removes it.
- Delete and restore callbacks read the current measurement document and recovery
  entries before acting. Restoring cannot replace an already occupied date.
- Invalid recovery documents and colliding IDs fail closed without replacing the
  saved bytes. Existing valid `{ id, record }` recovery entries need no migration.
- A new recovery copy is written before the deletion document. A restored entry
  is removed from recovery only after the restored document is saved. A storage
  failure can leave a redundant copy, but the tested failure points do not erase
  the only durable copy.
- Relevant storage events refresh local state without rewriting an old document.
  State and baselines remain separated by account.

The correction does not introduce a new server channel or document schema.
The checked-in Sport HTML is rebuilt from the changed sources. Released version
labels are unchanged because this is not a release.

## Verification

Run `node scripts/check-measurements-recovery.mjs` from the repository root.
All 16 cases pass on the candidate. Against the prior adapter/UI source, the
same cases give 3 passes and 13 failures; an unmodified run fails on the first
stale-tab data-loss assertion. The scenarios cover:

1. Stale unrelated saves and two sequential additions.
2. No resurrection of a removed recovery entry.
3. Stale restore after restore/delete, and an occupied target date.
4. Deletion preserving the latest record as its recovery copy.
5. Recovery storage events and account separation.
6. Malformed initial or subsequently changed recovery data.
7. Failure before/after document save during delete and restore.
8. Malformed measurement documents and recovery-ID collisions.

The existing adapter, model, two-client, counter, profile, and UI/build checks
are retained. The complete command list is in
[the checkpoint report](sync-checkpoint-20261106.md).
The mixed old/new-client test still intentionally reproduces the known failure,
not successful compatibility with an old installation.

## Boundaries that remain

- Tests execute actual source in isolated VM contexts with synthetic storage and
  data. They do not prove browser event timing, real authentication, RLS, iOS,
  or production transport behavior.
- The fix covers sequential stale tabs. localStorage has no transaction spanning
  the document and recovery array; truly interleaved read/modify/write races
  remain possible. No multi-tab atomicity guarantee is claimed.
- Recovery entries remain local to one origin/profile. They are not an additional
  cross-device backup. Existing legacy clients do not gain this protection until
  they are upgraded.
- Per-date measurement conflicts still do not merge independent fields. The
  documented old/new deletion oscillation still blocks a partial rollout.

## Current Day/Sport source boundary

Sites metadata was rechecked on 6 November without retrieving source archives,
creating credentials, or changing access. It still reports:

- Day v6: source commit `386ebc402e5fdc37310920304bf167086c30f342`.
- Sport v6: source commit `b00d4474a79f43a0bd64f23b71556f6a7409fe9f`.

These exact commits were absent from the accessible local repository copies.
Metadata is not source verification. The GitHub candidate must not replace
either whole Site, and the earlier journal/channel difference remains unresolved.

To advance the deployment comparison safely, provide source-only exports of
those exact versions, excluding credentials, `.env` files, and personal exports,
or separately authorize the supported temporary source-repository access flow.
A clean authorized test account is also needed before actual cross-app exchange
can be claimed. Existing personal profiles must not be used as disposable tests.

Until then, retain the branch as a review candidate, keep original data and old
storage, and do not import historical measurements or deploy only one consumer.
