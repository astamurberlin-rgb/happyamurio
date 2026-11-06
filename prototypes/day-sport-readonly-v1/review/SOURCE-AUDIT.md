# Day → Sport read-only projection: source audit

6 November 2026. Offline source and synthetic execution only. No backend, account,
browser session, journal or credentials were accessed. Exact source checkouts
remained clean. This folder has tests and findings, not full private source copies.

## Exact source identity

- Day `happy-deployed-source-read-20261106/day`, HEAD `386ebc402e5fdc37310920304bf167086c30f342`.
- Sport `happy-deployed-source-read-20261106/sport`, HEAD `b00d4474a79f43a0bd64f23b71556f6a7409fe9f`.
- Prior contracts: `happy-sync-repair-20261106/docs/sync-deployed-contracts-20261106.md`.
- Proposed future common authority: `happy-sync-repair-20261106/proposals/shared-records-v1/DESIGN.ru.md`, not an implemented protocol.

All source line references below are relative to those exact checkouts.

## Verified compatibility, not assumed compatibility

Day `dist/day/index.html:1954–1961` and Sport `sport/src/happy-auth.js:46–52`
use PBKDF2-SHA-256, 600,000 iterations, salt `happyday-sync-v1:<uid>`, AES-GCM
256-bit keys. Executing both exact derivation functions with invented passwords
confirmed equal keys for identical password plus UID. A second password for the
same UID fails decryption. Wrong owner, app and kind AAD also fail. Therefore a
matching authenticated UID alone cannot establish encryption compatibility.
Password changes/recovery and retained old keys are open integration cases.

Sport journal AAD is `<uid>|sport|journal`, whereas Day journal AAD is
`<uid>|day|journal`. This reader must not re-encrypt, replace or reinterpret either
row, or activate the old `sport/measurements` authority.

## Existing transport and auth are not an off-the-shelf projection API

- Day `dist/day/auth-read-only.js:17–35` permits GET/HEAD to the fixed backend
  `app_sync` endpoint. Synthetic execution confirmed a Sport journal GET passes
  and Sport POST/PATCH/PUT/DELETE are rejected. The private Day journal writer
  remains separate; this is not evidence that all application mutation is off.
- Day `dist/day/index.html:1900–1925` uses `hd_cloud_v1` and fences persisted versus
  in-memory UID, access token, refresh token, expiry, raw key and auth generation.
  Every field replacement and cleared storage was tested before any storage event.
- Day `clToken` at 1987–2005 may refresh the session and persist auth. `clRest` at
  2006–2025 invokes it and may retry 401. A strictly zero-persistence reader must
  use only the already-existing unexpired session and fail clearly on expiry/401.
- Day `clGet` at 2044–2053 omits explicit owner filter and row-owner/namespace/count
  checks, uses the current key after an await, and calls `clStore`. Do not use it as
  this prototype's transport. A dedicated fixed GET must select and validate
  `user_id,app,kind,v,iv,data,at` and pin auth/key throughout its asynchronous path.
- Existing Day `dist/shared/measurements-host.js:7–9` has a cross-origin link,
  not a shared session or data bridge. Its postMessage handles only trusted
  iframe sizing. No token/key/journal messaging should be added.

## Projection preservation boundary

Sport `sport/src/data-transfer.js:3–36` validates the full `Happy Sport`/`happy-sport`
version-1 journal and selects known top-level fields. It accepts duplicated dates,
noncalendar date-shaped strings, null measurement values, finite numbers outside
1–500 and unknown measurement/entry fields. `measurementTrash` is retained but
has no shape validator. Synthetic execution confirmed an opaque object-shaped
trash value is accepted. Preserve raw parsed measurement occurrences and leave source trash unchanged;
do not pass them through the old shared measurement normalizer. The Day projection
must not expose recovery contents: a field-presence flag is sufficient. Do not deduplicate
by date, use array index as a stable cross-snapshot record ID, or infer deletion
from absence. A read-only projection should expose no unrelated journal sections.

## Verification

Run from workspace root:

    node --test day-sport-reader-review-20261106/source-contract.test.mjs

Five tests passed. One test contains all actual-crypto cases; one exercises the
actual Day request guard; one covers seven persisted-auth changes; one executes
the exact Sport validator. The fifth verifies byte-for-byte provenance of the
vendored validator and every pure helper. Fake transport only, no real requests. These are source
boundary tests, not deployed cross-app acceptance tests.

## Integration gates even if the pure reader passes

1. An actual Day context adapter must read physical auth storage on every capture,
   invoke the real owner/profile fence and pin key/session/generation. Strings
   supplied by an arbitrary caller do not themselves prove account ownership.
2. Day renderer/event wiring must synchronously clear visible data and retained
   references on logout, owner/key/generation/token changes, storage clear and
   lifecycle exit. A frozen projection already returned to a caller cannot be
   remotely revoked by the reader. `getState()` invalidation alone is not proof
   that old-owner data disappears from a screen.
3. Network GET/CORS, RLS, server uniqueness/visibility, session expiry and refresh,
   key mismatch, offline recovery and distinct origins need separately authorized
   isolated integration tests. No live test is claimed here.
4. Transport cancellation must not be confused with an empty journal. Empty rows,
   valid journal without measurements, decryption failure, invalid schema, auth
   unavailable and cancelled/stale request require distinguishable status.
5. Browser cache/service worker handling and request timeout limits need review;
   zero application persistence alone does not establish all browser cache behavior.
