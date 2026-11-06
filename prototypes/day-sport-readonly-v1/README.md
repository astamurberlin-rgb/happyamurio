# Day → Sport measurement reader: offline prototype

**Not connected, built into either app, published, or deployed.** No accounts,
personal records, backend requests, credentials, database changes, or app storage
were used. Sport `sport/journal` remains the only measurement authority. This is
a transition toward one profile/common records, not a second measurement writer.

## Run

Node 22 or later, no dependencies or install step:

```sh
npm test
npm run check
```

Current local result: **65 passed, 0 failed**.

The tests use real WebCrypto AES-GCM, synthetic keys/owners/data, and explicitly
injected fake transports. Ambient fetch, localStorage, sessionStorage, IndexedDB,
CacheStorage and postMessage are blocked during tests. The production app test
suites/build/browser/device/RLS tests are not implied by these results.

## Files

- `src/sport-measurement-reader.mjs`: fixed-namespace GET-only reader, context and
  request fencing, bounded streamed response, overall deadline, immutable view.
- `src/sport-journal-validator.mjs`: small frozen **pure validation subset** of
  deployed Sport plus its validation-only dependencies. No app setup or writes.
- `test/`: dependency-injected synthetic acceptance and failure cases.
- `provenance.json`: exact source commits, file SHA-256 hashes and extraction
  boundaries. No full Site copies or credentials are included.
- `docs/REPORT.ru.md`: results, compatibility limits and integration prerequisites.

## API boundary

```js
createSportMeasurementReader({
  captureContext, fetchRead, crypto, publishableKey,
  now: Date.now, deadlineMs: 20_000
})
```

There is deliberately no global-fetch fallback and no live adapter example.
`fetchRead` must be a trusted fetch-compatible dependency. The reader fixes the
verified source backend origin, `/rest/v1/app_sync`, GET, owner filter,
`app=eq.sport`, `kind=eq.journal`, selected columns, no request body, no cookies,
no redirect, no-store and no-referrer. It never calls `clToken`, `clGet`, `clRest`,
refresh/login endpoints, storage, imports, merges, legacy `sport/measurements`,
postMessage, timers for background polling, or mutation endpoints. Its only timer
is the bounded active-read deadline (20 seconds; injectable 1–120,000 ms for tests).
The deadline races the complete fetch/body/decrypt/digest pipeline, aborts where
possible and fences every late completion. Browser event-loop suspension may
also suspend the timer; this is not an OS-level hard wall-clock kill.

`captureContext()` is a **trusted in-origin authentication adapter**, not data
from a message, a journal or an arbitrary object pretending to authenticate:

```text
{
  owner, profileOwner,
  session: { uid, at, exp, ... },
  key: non-extractable AES-GCM-256 CryptoKey with decrypt usage,
  generation: nonnegative monotonic safe integer,
  memoryFence: current Day authentication fence,
  persistedFence: freshly checked physical Day authentication fence
}
```

The prototype pins owner, profile, session reference, token and expiry values,
key reference, generation and equal fence strings. Before each dispatch and after
every async boundary it recaptures and compares them. Key/auth lifecycle changes,
including A→B→A, must increment generation. The adapter must verify actual Day
`clAssertStoredSession()`/`clMemoryFence()`/`clPersistedFence()`, `CL.authFence`,
`HappyProfile.matches(uid)` and the current trusted session, without refreshing
or saving. Equal strings supplied by an untrusted caller prove **nothing** about
an authenticated account or storage. The module does not authenticate a JWT or
prove RLS. Those remain host/backend prerequisites. A token that expires within
60 seconds fails closed; the reader never silently refreshes it.

The exact Day/Sport key derivations match only for the same actual UID and
password. Origins and auth storage are separate. A real key mismatch is
`decrypt-failed`, not a reason to copy a token/key, fall back to another owner,
read legacy storage or assume an empty journal.

## Results and mandatory consumer behavior

The API is `read()`, `getState()`, `invalidate()`, `dispose()`. No writer exists.
All states/results are frozen. `ready` and `empty` include a deeply frozen view:

```text
projection: {
  source: { app:'sport', kind:'journal', owner, version:1,
            observedAt, rowAt, iv, digest },
  measurements: [ each original parsed measurement occurrence, in source order ],
  recovery: { fieldPresent: true | false }
}
```

`digest` identifies exact decrypted snapshot bytes; it is not a revision,
tombstone, server signature or proof that the snapshot is still the latest.
`rowAt` is source metadata, not a trustworthy clock for conflict resolution.
Indices are positions within this snapshot, **not stable record IDs**. Dates are
never deduplicated, sorted, corrected or used as identity. Unknown live record
fields and finite numeric/null values stay unchanged. `__proto__`, `constructor`
and `prototype` keys are rejected, matching the deployed journal's security
rule, rather than silently stripped. Losslessness means parsed measurement
values/occurrences/order, not JSON whitespace or original number spelling.

`recovery.fieldPresent` says only whether the `measurementTrash` field existed.
It does **not** promise an array, count or recoverable content. Trash contents,
workouts, notes and other journal sections are not returned. Reading does not
change Sport's originals. Since the authority is encrypted as one document,
**the whole Sport journal must be downloaded/decrypted transiently in memory**
before this narrow view can be produced. A backend view cannot extract
measurements from the ciphertext; this prototype is not field-level access
control or a secure-memory-erasure mechanism.

States are distinct: `idle`, `loading`, `missing` (zero matching server rows),
`empty` (valid full journal, zero live measurements), `ready`, `unavailable`,
`error`, `superseded`, `disposed`. Errors expose only fixed codes, no body or
credential details. No stale last-good snapshot accompanies an error/timeout.
A fresh read clears the old view immediately. `getState()` rechecks identity and
clears a now-stale in-memory view. New requests supersede old responses.
`invalidate()`/`dispose()` clear current state synchronously. If an already
pending transport ignores abort, its read promise may settle only at its original
deadline (up to 20 seconds), with `superseded`; it cannot repopulate current state.

**A previously returned JS object cannot be revoked.** Before any future UI
integration, the host must synchronously clear its DOM and all retained result
references on sign-in/out, auth/key/physical storage changes, pagehide and
navigation; increment generation; and call `invalidate()`/`dispose()` as
appropriate. Consumers must render `getState()`, not cached results from an
old `read()` promise. Unknown text must be rendered as text, never innerHTML.
Do not write a projection to Day's journal/storage/cache. There is no UI event
wiring in this prototype; it cannot claim to erase an already rendered app view.

## Explicit limits

No real cross-origin session/access/CORS, real account identity, RLS, key recovery,
PWA/service-worker caching, storage events, browser rendering, mobile devices or
latest-server-snapshot behavior has been verified. Read-only does not mean fresh
or synchronized with unsaved Sport local changes. Full UI integration and any
future deployment/data test require separate decisions and verification described
in the report. Neither deployed source checkout nor the existing Sport candidate
was edited.
