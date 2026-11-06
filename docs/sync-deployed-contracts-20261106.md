# Deployed measurement contracts · 6 November 2026

Status: **source audit and unreleased technical work, not a cross-app release**.
This report supersedes the earlier "exact Day/Sport source unavailable" limitation.
It does not establish live account, browser, RLS, network or device behavior.
No personal records were read, imported or changed. No Site was pushed, saved or
deployed; no permissions, database schema or production data were changed.

## Verified source provenance

- Happy Day, authentication/journal test Site v6:
  `386ebc402e5fdc37310920304bf167086c30f342`.
- Happy Sport, authentication/journal test Site v6:
  `b00d4474a79f43a0bd64f23b71556f6a7409fe9f`.
- Happy Meal · USDA Test: fresh Sites metadata and deployment status identify
  v12, source `2bac958bf29b1e759992b19850660d612dc25005`, with publication
  `succeeded`. The separate product-editor test Site is a different project;
  its v25 must not be substituted for this USDA Site's v12.
- Public review candidate before this follow-up:
  `7b3b5c42de5dce48116e55a8745dad1566ca48aa` in this repository.

Day and Sport were fetched as exact source checkouts. Their HEADs matched Sites
metadata and both stayed clean after audit. Their temporary access was used only
for reads, never for pushes or deployment. This repository contains the findings,
not full copies of the separate Site source repositories or their credentials.

Meal's previously preserved model/adapter fixtures identify the same source
commit now confirmed by fresh metadata. The full Meal repository was not fetched
again in this round. Fixture execution is evidence about those source-linked
modules, not fresh live execution of every current Meal path.

## Current Day: separate journal, separate Sport link

Paths in this section are relative to the exact Day source above.

- `dist/shared/measurements-host.js:7` detects that the configured Sport Site has
  a different origin, displays a separate-login link and returns before creating
  an iframe. It explains that the link transfers neither records nor login.
- Its message handler at line 9 accepts only a matching origin, the exact iframe
  window and `happy-measurements-height`. This resizes a same-origin iframe;
  it is not an identity, key, record or synchronization bridge.
- `dist/day/index.html:5982` loads this host for the trends screen. The older
  shared measurement model packaged in the Site is not loaded there. Its mere
  presence does not prove an active Day measurement conflict.
- `dist/day/day-journal-sync.js:36–43,65–71,219` synchronizes the Day envelope
  `{app:'happyday',v:1,db:…}` through the encrypted **day/journal** row, using
  AAD `uid|day|journal`. This is not the measurement records document.
- `dist/day/auth-read-only.js:60–69` restricts its mutation capability to the
  current owner's day/journal, using create-if-absent or exact prior `at` and
  `iv` conditions. The active automatic journal writer uses that private
  capability. A throwing generic writer does not mean all saving is disabled.
- The executed profile module in `dist/day/index.html:1376–1408` treats missing
  legacy ownership as local, keeps owner partitions separate, and fences auth
  changes. The older packaged profile module is not the executed authority.
- Existing Meal summary reads at `dist/day/index.html:2079–2091` are a separate
  feature; they do not establish shared measurement editing.

Replacing Day with this branch would risk losing newer owner and journal guards.
Keep those guards and the Day journal intact.

## Current Sport: measurements belong to sport/journal

Paths in this section are relative to the exact Sport source above.

- `sport/src/data-transfer.js:3–7` includes measurements and measurementTrash in
  the full backup. The active automatic path uses that full backup
  (`automatic-sync-ui.js:20–25,36–44`, `controlled-sync-ui.js:16–19`).
  Measurements therefore synchronize as part of **sport/journal**, not through
  the legacy dedicated measurement row.
- The journal envelope is `{app:'Happy Sport',version:1,exportedAt,data:{…}}`.
  Its AES-GCM AAD is `uid|sport|journal`; exact owner/namespace/schema validation,
  prior `at` plus `iv` CAS, readback and unknown-outcome reconciliation apply.
- `sport/src/measurements-shared.js:22,35,55,64` bypasses the legacy shared
  persistence, cloud synchronization and storage reconciliation when the deployed
  guard is present. Removing this bypass would introduce a competing writer.
- `sport/src/profile-store.js:22–25` checks owner, observed bytes and writer lock,
  then verifies local readback. Session, lifecycle, local revision and token/key
  fences protect the automatic journal path.
- Existing measurement embeds do not acquire the full-journal writer lock.
  Profile persistence rejects embed writes, automatic readiness excludes embeds,
  and the shared channel stays disabled. Merely changing Day's link to an iframe
  will not produce a working shared editor.

The public candidate's **sport/measurements** document, owner-local keys,
per-date revisions/tombstones and timestamp-only CAS are a different contract.
Neither encrypted row can be copied into the other channel: AAD and payload
schemas differ. The candidate is not a drop-in replacement for current Sport.

## Confirmed preservation and migration risks

1. The deployed form rebuilds values from its 17 visible controls and replaces
   the previous values (`sport/src/measurements-v2.js:39`). A synthetic execution
   confirms that an additional numeric key disappears on an ordinary edit.
   The existing branch fix must be adapted to the actual SportProfiles journal
   context, rather than copying its older adapter or owner logic wholesale.
2. Journal validation accepts finite numbers outside the shared model's 1–500
   range, nulls, and date-shaped strings that are not real calendar dates
   (`data-transfer.js:20–21`). The shared model may silently omit those records.
   Duplicate dates, extension values and recovery entries also need inventory.
   Blind conversion or a normal-startup migration can lose accepted journal data.
3. Journal trash is part of the full backup. Shared recovery is separate and
   local-only. Absence from a snapshot must not be interpreted as a deletion
   tombstone, and assigning a fresh revision must not silently win a conflict.
4. An old Meal measurement client and the fixed dedicated-channel candidate
   still reproduce equal-revision delete/resurrection oscillation. The fresh
   Meal metadata now matches the fixture's source commit, but this remains a
   simulated module-level result, not proof of a personal incident or a live
   Day/Sport/Meal exchange.

The original 17 visible fields and ordinary left/right labels remain the scope.
No new muscle-state controls, reinterpretation of stored measurements, or real
historical import is included.

## Verification performed

All tests used invented records, isolated storage and fake transports. Source
test scripts and dependencies were inspected before execution. No backend or
personal account was contacted by these tests.

From the exact Day checkout:

```sh
node --test tests/auto-adapter.cjs tests/auto-transport.cjs \
  tests/auto-scheduler.cjs tests/profile-partitions.cjs
```

**67 passed, 0 failed.** Covers owner isolation, private capability binding,
durable packets, namespace rejection, persisted identity fences and automatic
journal/recovery behavior.

From the exact Sport checkout:

```sh
node sport/scripts/check-automatic-integration.mjs
node sport/scripts/check-automatic-scheduler.mjs
```

**30 automatic integration cases and 22 scheduler cases passed**, with real
AES and zero real network calls. Three additional focused synthetic boundary
tests passed by reproducing the unknown-field loss and the two validation
contracts' mismatch. Those three assertions describe defects, not fixes.

Total source-audit assertions: **122 passed**. This is separate from this
branch's previously verified 21 build/check commands. It is not 122 live
cross-app acceptance checks. Browser rendering, iPhone/PWA behavior, real auth,
RLS, independent devices and cross-origin delivery remain untested.

## Recommended staged implementation

The product goal is one shared profile and a common collection of records, with
each application using the fields and record types it needs. The current separate
owner journals do not yet implement that goal. Keeping Sport authoritative below
is a transition safeguard, not a proposal to make separate profiles permanent.
The shared design still needs stable record IDs, type/source/version metadata,
clear field ownership, deletion/conflict rules and recoverable migration. A common
UI or account login alone does not make all existing storage one shared record set.

1. Make the smallest field-preservation fix in the current Sport context. Keep
   its journal, owner lock, recovery, import library and transport. Verify stale
   editors, owner changes, failed saves, date moves and all journal-valid extra
   values with targeted synthetic tests. Keep it unpublished until reviewed.
   A subsequent [source-only journal-context patch](sync-sport-journal-candidate-20261106.md)
   implements that bounded form fix, with synthetic tests and explicit release
   limits. It is not a built or deployed application.
   The next [recovery/CSV follow-up](sync-sport-recovery-build-20261106.md) provides
   a locally built and checked combined candidate, still without deployment or
   cross-app acceptance claims.
2. Use **one measurement authority**. The lowest migration-risk first stage keeps
   Sport's journal authoritative. A narrowly scoped authenticated **read-only**
   projection for Day can display measurements and their source status without
   introducing another writer. This is a proposal, not an implemented bridge.
3. Any future editable cross-app view must delegate through the current Sport
   owner/writer context, changing only measurements/trash in the latest complete
   state before ordinary verified persistence. It must not replace sport/journal
   with a measurement-only payload or pass credentials through postMessage.
4. If dedicated-channel bidirectional editing is chosen instead, design and
   review a cutover: guarded dispatcher, CAS/readback/recovery, both-store
   inventory, explicit conflict handling, old-client fencing, rollback and clear
   treatment of historical journal restores. Do not activate both authorities.
5. Only after that boundary is implemented and reviewed, verify with a separate
   authorized test account across browsers/devices. An existing personal profile
   is not a disposable sandbox. No user action is needed for the remaining
   offline candidate work; real-account verification has not been attempted.

Keep old installations and browser storage until migration/recovery is verified.
Do not deploy this entire GitHub branch over the newer Day or Sport Sites.
