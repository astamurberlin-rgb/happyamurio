# Sport clean interface candidate

Local-only candidate from published private test v4 commit 0aa62a596485ad6cc4eaf8aba9cea529871e53cd. No publication or main-site changes in this task. Keep the same private test origin and storage namespaces if later approved.

Presentation changes: neutral compact sync status on normal screens; full status, conflict/deletion/restart controls and build limitations in Settings. Guard, protocol, encryption, journal projection, session fences, ledger and autosync decisions are unchanged. Local measurement CSV/Print controls are restored without starting the shared measurement engine.

Parity against exact main v24 commit 71dbbaae929247cfe5a82caade37eceef7821f45: core workouts, timers, planning, library, exercise editing and appearance retained. Deliberate restrictions remain: signup/account editing, separate shared measurement/counter/link transport, Meal counter engine, and cross-origin Icon Studio assignments. Do not treat this as full main-site feature replacement. Main storage uses different keys; a main-origin migration requires a separate owner-aware backup/import plan.

An existing signed-in owner's journal synchronizes on load and persisted edits without a Save click. New owned data creates only an absent cloud row. A clean empty/default profile restores automatically; nondefault preferences and guest records are never implicitly claimed. Clean acknowledged baselines may accept a changed cloud version. Dirty divergence, missing remote after a known baseline, and any whole-category clearing require a decision, never last-writer-wins.

The ambient network remains read-only. A single boot-time factory gives the scheduler a private exact Sport journal dispatcher. It constructs only POST ignore-duplicates or UID/app/kind/at/IV PATCH. Side-channel link, measurements, counters, Meal, signup and account edits stay blocked. Manual conflict resolution and auto work share one in-page operation mutex, in addition to the origin-wide Web Lock. Browsers without Web Locks retain export-only fallback.

Every candidate is immutable. Writes verify persisted owner-local bytes and reserve local storage before dispatch. New edits during await remain queued and cannot be labeled saved until their own encrypted server readback. Restore fences the full local revision and editor generation, defers during panels/forms/active workouts/timers, and preserves unrelated local profile metadata. Auth/key/lifecycle changes fence old work. Same-UID auth refresh reloads safely when no draft is open, otherwise shows an actionable restart message without discarding the draft.

Durable statuses include checking, dirty, saving, saved (latest content verified), offline, unknown, retry-needed, conflict, recovery-full, confirmation and restart. Unknown outcomes first use read-only reconciliation. At most two exact-ciphertext retries occur per durable genuine offline→online episode; reload, focus and duplicate online events do not reset the budget. After exhaustion, the existing 30-second foreground check remains read-only. A later confirmed candidate clears uncertainty; an unchanged prior row does not trigger another write unless connectivity genuinely transitions or the user explicitly retries the exact packet. GET/auth preflight and writes have bounded timeouts. Permanent decryption/schema/quota errors do not hot-loop.

The v3 bounded ledger remains: two acknowledged history entries, protected pending and first unresolved conflict, headroom probes and verified local writes. Pending conflicts retain remote ciphertext/digest inside the protected attempt so explicit cloud choice has a usable recovery slot. New unique evidence is never silently pruned; quota/reserve exhaustion stops safely.

Build: node scripts/build-preview.mjs
Full checks: cd sport && npm run check
Automatic actual-AES adapter tests: node sport/scripts/check-automatic-integration.mjs
Independent scheduler tests: node sport/scripts/check-automatic-scheduler.mjs
All fixtures are synthetic with zero production network calls. Historical v3 unit tests now verify retained manual/ambient transport behavior, not the obsolete claim that no automatic controller exists. Narrow transport tests resolve this checkout, not the published v3 checkout.

The user reported successful Sport transfer in both directions between Brave and Safari on the existing test origin. This does not verify iPhone/PWA suspension, quota or every conflict case; automated coverage remains synthetic. Old-version tabs cannot honor new locks. Never-uploaded other-origin data cannot be recovered. The same private test Site may be published only after a separate review/authorization.
