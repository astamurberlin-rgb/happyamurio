# Day automatic-sync candidate (local only)

Derived exactly from published commit
`43bb05dcae346f3b31e3b98b9f8a2ffdaac8a626` in a separate folder,
`day-auto-sync-20261104`. The published checkout and hosting manifest are
unchanged. No publication, live login, real cloud write or historical import
was performed by this worker.

## Ordinary path without Save/Check taps

- Boot/login schedules synchronization automatically for the current account's
  own journal. A durable local change debounces for 750 ms, then runs under an
  exclusive same-origin auto lease.
- First upload freshly reads the cloud and uses create-if-absent, only with a
  nonempty owned journal and no acknowledged history. Missing cloud after any
  known baseline or confirmed receipt is a conflict, never resurrection.
- Later writes compare verified at/iv/content digest and use exact scoped CAS.
  Backup and immutable pending receipt precede mutation. Full decrypt/readback
  precedes acknowledgement.
- A clean new origin restores the account journal after verified backup.
  Known-baseline local data unchanged since acknowledgement can accept a newer
  nonempty remote automatically, after backup and a second fresh-version check.
- Later local edits remain dirty until their own revision has been verified.
  The visible persistent status never equates a successful older packet with
  saving newer edits.
- Local-dirty plus remote-dirty remains a conflict. Empty replacement in either
  direction requires explicit confirmation and preserves recovery evidence.
  A new nonempty local revision can leave an empty-confirmation hold, but cannot
  release an unresolved packet's retry budget or silently resolve a conflict.

## Scope and ownership

The automatic channel can mutate only the current UID's `day/journal` row.
Meal link/cache/counters remain derived and excluded; Meal summaries do not count
as Day journal restoration. Settings stored separately in CFG remain local.
Guest data is never imported into an account automatically. When a legacy owner
marker is absent, ambiguous legacy data remains local, even if signed in.
Existing explicit owner partitions and markers are retained. Different origins
have independent local storage; old-origin migration is not implemented here.

The transport firewall still blocks generic fetch/XHR mutations, unrelated rows,
signup/profile changes, Beacon and WebSocket writes. The actual adapter script
alone can claim the automatic bridge once, synchronously using its exact
same-origin script URL. The bridge stays in that module's closure, not a global
write-enable switch. Each send rechecks the durable immutable pending packet,
namespace, CAS filters, session/key and persisted auth identity. Manual recovery
retains its separate trusted-click capability. Existing CSP remains in place.

## Failure behavior and explicit limits

- Physical offline state retains local changes and resumes on an actual online
  edge. A transient read error while navigator reports online is visibly blocked,
  not falsely called saved or promised an unseen retry. Focus, a new edit or the
  recovery control can request another safe check.
- Unknown outcomes get one delayed readonly reconciliation, at most one exact
  packet retry per observed connectivity cycle, then a final readonly check.
  The budget and not-before deadline are durable. Focus/pageshow/reload cannot
  renew it. The retry never substitutes newer edits.
- Exhausted or conflicting attempts remain visibly held and require recovery.
  There is no periodic polling after the budget is exhausted. This exceptional
  path is intentionally not fully autonomous.
- Successful explicit restore/save/reconciliation clears only the scheduler hold
  under the same auto lease, leaving the packet/recovery records appropriately
  verified. New edits then resume automatic saves.
- External auth changes pause in place instead of reloading an open editor.
  Persisted fences block old-session dispatch before storage-event delivery;
  afterward the screen and unsaved DOM text remain intact. Restart requires an
  explicit checkbox/button confirming that the user saved or copied unfinished
  text. JSON contains only already-recorded data. No draft moves to another UID.
- Missing Web Locks/internal bridge, storage quota or unsupported schema fails
  closed. Local saves remain available where storage permits. Legacy tabs that
  ignore locks cannot be claimed safe simultaneous writers.

The bounded deduplicated recovery vault and single current encrypted attempt
ledger are reused. Quota checks reserve journal headroom before cloud mutation.
No unresolved unique recovery evidence is silently removed.

## Verification

Run all current local synthetic tests:

```
node --test tests/*.cjs
```

New suites:
- `auto-adapter.cjs`: actual core/adapter/firewall/scheduler, real local AES-GCM,
  fake Storage/Web Locks/network, timer-driven no-click Safari-owned-to-clean-
  Brave scenario, later edits, clean-baseline restores, crash/exact retry,
  conflict recovery, unknown holds, account changes, guest/Meal separation,
  empty confirmation, transient errors, and unsaved-editor pause.
- `auto-scheduler.cjs`: fake timers, durable budgets, auth switches, two tabs,
  late edits, offline and new-local-revision confirmation behavior.
- `auto-transport.cjs`: exact adapter binding, one packet, namespace/packet/auth
  negatives, and generic transport writes remaining blocked.

Inherited manual-CAS, recovery-capacity, profile partitions, generic snapshot
core and current draft/travelling UI tests remain in the aggregate. Historical
incompatible scripts remain explicitly archived with their previous failure
mapping in `tests/legacy/README.md`; moving them was not a regression fix.

These tests use synthetic credentials and fabricated journals only. Real Safari,
Brave, live backend roundtrip and production behavior are not claimed verified.
The parent separately owns managed-browser smoke and independent review.
