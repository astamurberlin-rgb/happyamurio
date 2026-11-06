# Day clean UI candidate, 2026-11-04

Local-only candidate. Nothing published; no real authentication, journal reads or writes performed. User data is not present in tests or source. Intended destination, only after review and parent approval, is the existing private Day test origin. The old main site remains unchanged.

## Source identity

- Exact input: test v5 commit `771eb3f5b9076d26d08f66a5a62743c3d0ce190c`, clean checkout `../day-auth-test-20261104`.
- Retained hosting project: `appgprj_6aeafab3dd008191bd0d6c6318abdf3a`. Manifest unchanged. Do not create a new Site or point this candidate at the main project.
- Main source comparison: `../loss-audit-nov2/source`, clean commit `35d3786264d03b354f711ffb06b2f4f8218b5c34`.
- Read-only Sites metadata on November 4 at 16:24 UTC: main project `appgprj_6ae6ed0f91d881919f15d8d701dc1e37` latest saved version16, same35d3786 source, associated deployment `appgdep_6ae8b7a52c2081918d298e4ec17996d3`. No newer main version found. This is metadata/source evidence, not a fresh authenticated live-browser verification.
- `../day-wheel-test` is clean but older commit `c81540d4324fcc38e65883e128f5c330ac5a1329`, version51.9; it is not the canonical migration baseline.

## Changes

Five dist files only:

- `dist/day/index.html`: removes the persistent yellow diagnostic instruction banner and current Test naming; keeps a neutral status strip plus Settings access. Account restrictions move into a closed details section. Backup/import remain visible. Existing auth-pause warning still appears only on an actual session change, protecting unfinished editor text. No auth or storage logic changes beyond error wording.
- `dist/day/day-journal-sync.js`: concise persistent status with the full explanation retained in Settings. Manual sync/restore, private diagnostic export and separately labelled time archives remain wired under closed details. Held retries explicitly require action rather than pretending to run. No snapshot, CAS, backup, receipt, archive, owner or scheduler-policy changes.
- `dist/day/selfcare-ui.js`: Sport labels lose test wording; same approved URL and separate-account explanation.
- `dist/day/manifest.webmanifest` and `dist/index.html`: normal HappyDay/Day naming. Manifest ID/start URL/scope/icons unchanged.

`auth-read-only.js` is intentionally retained, first-loaded and byte-identical. CSP, scoped automatic capability, conditional writes, persisted auth/session fences and all fail-closed paths remain.

## Main features and deliberate limitations

Test v5 retains main51.10–51.14 appearance themes/live preview, wheel/carousel, travelling drafts, first-Save reveal/second-Save commit, fixed arc/font, Aiko icon, current selfcare core, counters, energy and assets. Do not replace these with older wheel51.9.

This is a cleaner interface on the same safe implementation, not full main feature parity:

- Existing-account login, refresh, profile reads and local-scope logout work. Signup and profile editing remain disabled.
- External API and screenshot parsing remain unavailable; API-key input/save stay disabled and no saved API key is loaded.
- Local counters continue working and existing shared data remains readable. Outgoing shared counters, link/summaries and measurements writes remain blocked. Only scoped own `day/journal` mutations are permitted.
- Meal navigation remains unavailable. Sport links still use the approved private Sport origin and require a separate login; navigation is not synchronization.
- CFG preferences and continuing passive time remain device-local. Historical passive-time variants remain separately archived; no combined total is invented.
- Guest/unowned diaries are never silently assigned to an account. Old-main and other-origin local storage is not automatically migrated. Same current test origin retains its existing browser storage.
- Conflicts, legacy cloud passive histories, empty replacement and uncertain outcomes retain their existing safety holds and explicit recovery path.

Re-enabling disabled features requires a separate scoped capability design and review, not removing the firewall or CSP.

## Validation

- `node --test tests/clean-ui.cjs`:6/6 PASS. Actual Settings builder bindings/collapsed sections, current/dirty/readback/hold presentation, actual automatic coordinator save/dirty/auth pause, capability disclosure and fixed published protection hashes.
- `node --test tests/*.cjs`:290/290 PASS. Existing284 behavioral/source tests retained; two assertions expecting the obsolete yellow banner/test wording were updated to require clean chrome without changing their safety checks.
- All Day JavaScript plus inline entrypoint scripts:19 syntax checks PASS.
- `tests/clean-ui-focused-results.txt` and `tests/clean-ui-all-results.txt` contain results.
- Nine critical modules are asserted byte-identical to publishedv5: transport guard, snapshot sync, controlled CAS, auto scheduler, diagnostic core, passive planner, profile partitioning, shared counters and selfcare core.
- Parent owns managed guest browser smoke and independent reviewer approval. No real account E2E or fresh production verification is claimed here.

## Release boundary

No publication is authorized by this artifact. Parent must review the diff and browser result, retain the current test project/origin and packaging identity, and obtain the intended release authorization. Original main and test source checkouts were not edited. Rollback is the exact verified v5 source above.
