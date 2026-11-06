# Sport browser checks and measurement clear repair · 6 November 2026

Status: **real Chromium spot checks plus a revised local candidate; not a release**.
This follows the [recovery/CSV build](sync-sport-recovery-build-20261106.md).
No personal records, login, live backend exchange, migration or deployment occurred.

## A browser-only interaction defect was found and fixed

Clearing a known measurement field looked correct before Save, but the previous
value returned. Date and weight edits still saved. The earlier submit-handler
tests missed the global numeric-input helper: on change/blur it interpreted blank
as cancel and restored the value before submission.

The revised candidate excludes only the measurement form from that workout-style
tap-to-replace helper. Measurement fields now use ordinary native editing: focusing
does not automatically erase their value, and an explicit blank reaches the
existing clear logic. Workout controls retain tap-to-replace, blank-cancels and
Escape behavior. The 17 controls, labels, layout and number constraints are unchanged.

The form also checks native validity before reading FormData. A malformed number
can have an empty DOM value; badInput must not be mistaken for intentional deletion.

Real browser retest confirmed clear → Save → reopen → reload. A real JSON download
confirmed the cleared key was absent while metadata, zero/null extensions and a
formula-like quoted extension name survived. Malformed exponent input blocked
Save and retained the prior stored value after closing/reopening.

## What the real UI checks establish

The detailed [results](../patches/sport-sites-v6-browser-b00d447/browser-results.json)
label each case as baseline, repaired or both; they must not be collapsed into a
claim that every flow was rerun on every build.

- Both builds: 17-field save/reload, date moves, close/reopen and hidden extension
  preservation. The clear defect failed on the baseline and passed on the repair.
- Baseline: delete → trash → reload → restore, one Undo, and real CSV downloads.
  Parsed CSV verified BOM, quoting, delimiters, known units and safe extension labels.
- Repair: save-date and restore-date collisions preserved both current/recovery
  records; range, step and malformed-input validation blocked saving without
  silently erasing the input. Browser Back/Forward retained saved records.

These are actual Chromium UI spot checks, not the separate 15-case automated
browser suite. That suite did not execute. Browser quota/readback fault injection,
stale session/owner races, stale Undo injection, mobile viewport, real iPhone,
Safari and installed PWA were not exercised. Corresponding offline code tests do
not fill those browser coverage gaps.

## Isolation and evidence

A separate QA copy was served through the supported private preview. Before app
boot, a diagnostic gate established empty local/session storage; only then were
synthetic guest data and an ownership marker created. No authenticated session was
created. The app document differed from its build only by a restrictive CSP meta
tag inserted first in head. Removing it reproduced the original bytes, as recorded
in [mirror-proof.json](../patches/sport-sites-v6-browser-b00d447/mirror-proof.json).

The policy denies fetch/connect, external resources, workers, frames and native
form submission. A diagnostic fetch produced a connect-src violation. This is
CSP evidence, not a full network packet capture. A clean browser-console claim
is not made because unrelated extension errors were present.

Only owned synthetic storage was removed afterward; the diagnostic gate confirmed
no storage remaining. The tab was closed and preview stopped. Screenshots and
private execution logs are not included in the public checkpoint.

## Saved source and verification

The [combined patch folder](../patches/sport-sites-v6-browser-b00d447/) targets
exact Sport Sites v6 source `b00d4474a79f43a0bd64f23b71556f6a7409fe9f`.
Apply it directly to a clean isolated copy of that base, not on top of an earlier
patch or to this repository's older app. Full separate Site sources and generated
application payloads are not published in this GitHub branch.

The combined patch includes 14 event-sequence regressions in the repository's
aggregate check. The original clear regression fails against the earlier candidate
and passes on the repair. Local build, full repository check and independent review
passed; the existing 36 form, 49 recovery/CSV, 12 additional, 33 AES integration and
22 scheduler checks also pass. Full-suite and individual counts overlap.

All four generated Sport entry HTML files have SHA-256:
`e65cdb2c88fea064d2179f81e90b5a32bb27e1e0c764b808f275f381748e692c`.
Source, patch and full dist hashes are in verification.json/build-files.json. The
previous candidate and exact source checkout remain unchanged.

After applying the patch in an isolated checkout:

```sh
node scripts/build-preview.mjs
npm --offline --update-notifier=false --prefix sport run check
node "$PATCH_DIR/check-measurement-fix.mjs" .
node "$PATCH_DIR/check-recovery-csv.mjs" .
node "$PATCH_DIR/check-independent.mjs" .
```

## Remaining known issues and boundaries

- A guest mutation can display “Синхронизация остановлена” instead of a local-only
  status, despite successful local saving. This misleading banner was observed on
  the baseline and is not fixed or specifically requalified by the clear patch.
- An imported known value off step=.1, such as a fictional 71.25, still blocks
  untouched Save. The repaired form retains it visibly rather than clearing it.
  No range/precision design decision was made.
- Existing last-category cloud confirmation, journal authority and owner/CAS
  protections remain. No actual cloud or cross-app exchange was tested here.

The [common-profile/records proposal](shared-profile-records-plan-20261106.md) is
separate design work, not a feature introduced by this patch. Release and any real
migration still require the missing compatibility and acceptance checks.
