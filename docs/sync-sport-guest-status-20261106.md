# Sport guest status and read-only Day preparation · 6 November 2026

Status: unreleased exact-source candidate. No personal records, account sign-in,
backend operation, database change or deployment occurred.

## Correct guest and stopped states

The previous post-save listener attempted to capture a cloud context for every
local mutation. For a genuine guest, it produced the misleading “Синхронизация
остановлена” error despite successful local saving. The scheduler now classifies
the context before attempting cloud work and verifies the local saved snapshot.

- A genuine guest sees “Локальный режим · без облака”. Settings explain that cloud
  synchronization is off and guest records do not transfer automatically. This
  describes the mode, not a promise of permanent storage or a backup.
- Lost sessions, foreign/unowned data, failed guard/lock and persistence failures
  stay errors. They are not converted into guest or cloud-saved success.
- A stopped lifecycle gets “Синхронизация приостановлена” and a reload path. Check
  and reload do not silently revive the stopped writer. Account-change restart
  still takes priority.
- Authenticated offline, unknown outcome, conflict, consent and server-verified
  saved states keep their prior meanings. No extra measurement writer is enabled.

A failed ordinary local write still uses its existing error UI. Since failed writes
may not notify the scheduler, the neutral mode label itself makes no saved claim.
A later check detects a missing/mismatching snapshot or failed read. The separate
post-write readback test covers bytes successfully written followed by a failed
immediate readback: uncertainty remains blocked, the bytes are not rolled back or
silently discarded, and no cloud call follows.

## Offline verification and reproduction

Build and full aggregate check passed. Real-AES integration has 50 passing cases,
including 17 new guest/lifecycle cases. An old mislabeled guest test was corrected:
it simulated a lost authenticated session and must remain an error. Scheduler 22,
input events 14, form 36, recovery/CSV 49, additional 12, and one standalone
post-write readback case passed. Counts overlap the full suite; do not sum them.
The guest-mutation regression fails against the previous candidate and passes here.

The [combined patch](../patches/sport-sites-v6-guest-b00d447/combined.patch) applies
directly to clean Sport Sites v6 `b00d4474a79f43a0bd64f23b71556f6a7409fe9f`, not over
an earlier patch or this repository's older app. It includes all earlier field,
recovery/CSV and native-input repairs. Applying and rebuilding in an isolated copy
matched all 661 candidate files. Source originals and previous candidates remained
unchanged. Full Site repositories and generated application payloads are not
published in this branch.

All four generated Sport entry HTML copies have SHA-256:
`c1c463d7840db9bd9044b91befad018f05ce89613e93648d2f95132ade131069`.
Changed source hashes, patch hash, dist manifest and apply proof are in the
[artifact folder](../patches/sport-sites-v6-guest-b00d447/).

```sh
# From an isolated exact-base checkout, before applying the combined patch:
git apply --check "$PATCH_DIR/combined.patch"
git apply "$PATCH_DIR/combined.patch"
node scripts/build-preview.mjs
npm --offline --update-notifier=false --prefix sport run check
node "$PATCH_DIR/check-measurement-fix.mjs" .
node "$PATCH_DIR/check-recovery-csv.mjs" .
node "$PATCH_DIR/check-independent.mjs" .
node "$PATCH_DIR/check-postwrite-readback.mjs" .
```

## Browser evidence and remaining scope

Actual Chromium guest Save/edit/clear/reopen/reload, Delete/trash reload/Restore,
and timely Undo retained the local-only banner. Settings and Check now were
accurate. Native invalid values remained visible and blocked. Only weight/waist
were populated in this run; it does not repeat the earlier all-field/export tests.
See the [browser report](../patches/sport-sites-v6-guest-b00d447/browser-report.md)
and [per-case results](../patches/sport-sites-v6-guest-b00d447/browser-results.json).

Real navigation away and Back produced a fresh boot. The BFCache stopped/reload
path was not established in the browser and remains offline-only coverage.
Storage/auth fault injection, live sync, and actual mobile/PWA were not exercised.

The isolated QA origin was empty before boot, used only synthetic guest data,
and had CSP denying connections, external resources, workers, frames and forms.
A diagnostic fetch was blocked. On-disk mirror bytes differ only by that CSP,
but the managed preview adds a live-reload script to the served DOM; its WebSocket
was blocked by the app guard. Extension noise also appeared, so no clean-console
or full packet-capture claim is made. Only the four owned test keys were removed;
both stores were confirmed empty, the QA tab closed and preview stopped.

The [read-only Sport-to-Day prototype](sync-day-sport-readonly-20261106.md) is
separate, unconnected code. This Sport patch does not activate shared profiles,
cross-app editing or a data migration. Native imported-value range/step limits
remain unchanged. Real auth, live backend exchange, mobile/Safari/PWA and actual
old-client compatibility remain unverified.
