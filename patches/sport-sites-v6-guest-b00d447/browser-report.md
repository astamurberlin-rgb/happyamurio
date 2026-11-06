# Happy Sport guest status: actual browser QA

## Result

**The guest-status repair passes the exercised Chromium UI cases.** Native guest save/edit/clear/reopen/reload/delete/restore/Undo keep the honest banner **«Локальный режим · без облака»**. Settings says that cloud sync is off, requires an existing account, and guest records are not transferred automatically. «Проверить сейчас» preserves that state. No cloud-saved or misleading sync-stopped claim appeared in these cases.

Frozen and post-QA Sport HTML SHA-256: `c1c463d7840db9bd9044b91befad018f05ce89613e93648d2f95132ade131069`.
All four generated entry copies match. The candidate was not modified by QA.

## What was actually exercised

- Started only after a diagnostic page showed localStorage and sessionStorage both empty. Initialized an owned synthetic guest, with no account.
- Saved 2026-02-02 weight 71/waist 81; moved to 2026-02-03, changed weight to 72.5 and cleared waist. Reopen and real reload retained 72.5 and the empty waist. An unsaved weight 90 edit was discarded.
- Native 0, 501 and 71.25 saves were rejected with rangeUnderflow, rangeOverflow and stepMismatch respectively. Invalid values remained visible; close/reopen preserved stored 72.5. This confirms the earlier clearing/validation repair in the exercised case. The existing 0.1 precision restriction remains.
- Deleted to trash, reloaded, restored, then separately deleted and used timely Undo. The record returned once with local-only status. An earlier expired Undo target was not counted as a pass.
- Read settings before/after mutations and used guest Check now twice.
- Navigated away to the diagnostic page and used real browser Back. Sport booted through checking/default home and returned to local-only mode.

These are actual UI spot checks, not the full portable automated suite. Only weight and waist were populated in this run; do not infer all-field, extension, export, collision or authenticated failure coverage from it. Offline implementation tests are separate evidence, not counted as real browser cases.

## Lifecycle limit

A persisted BFCache return and the new **«Синхронизация приостановлена»** recovery path were **not established in the browser**. Real Back looked like a fresh boot. The read-only browser evaluator did not expose performance timing (`performance` was undefined). No synthetic pagehide/pageshow dispatch was used. Lifecycle stopped/reload assertions therefore remain offline-only coverage.

## Isolation and byte proof

Used only the supported daemon-owned managed preview and an isolated Chromium browser, not a personal browser or production Site. The QA on-disk Sport HTML adds one restrictive CSP meta as the first child of head. Removing that exact tag reproduces the frozen candidate bytes, verified in `mirror-proof.json`.

**This is an on-disk proof, not equality of the served DOM.** The managed preview injects an additional live-reload script. DOM inspection showed `var socket = new WebSocket(address)` and reload/refreshCSS handlers. That constructor was blocked by the application transport guard, with the error «Прямые записи отключены. Журнал Sport сохраняется только через защищённую проверку версии.» The stored QA HTML ends at line 9556; the stack points to injected line 9577 via the guard at line 693. No private preview URL is retained in this report.

The first protective CSP was also observed in app DOM. It denies all connect traffic and excludes external resources, workers, frames and form submissions. A deliberate diagnostic fetch produced a connect-src securitypolicyviolation. No protection was relaxed. This is policy/DOM evidence, not a complete packet capture.

Console inspection additionally showed browser-extension metadata errors. No clean-console claim is made. The blocked live-reload error is a preview interaction, not demonstrated cloud-sync failure or data loss.

## Cleanup and limits

The ownership marker was verified, exactly four owned synthetic keys were removed, and the page reported both stores empty. The QA-created tab was closed. Preview stop and status both reported stopped. No login, real data, Site creation/deployment, screenshot upload, source push, or local Chromium fallback occurred.

No real storage quota/readback fault, corrupted-store, account/owner change, live backend, cloud sync, cross-app integration, mobile, Safari/iPhone/PWA or confirmed BFCache test was performed. Genuine storage/auth failure behavior must not be called browser-verified from this report. Per-scenario statuses and tooling caveats are in `browser-results.json`.
