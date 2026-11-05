# Historical compatibility witness, not an application update

These are unmodified historical source files verified against the local **Meal
Sites v12 checkout**, commit `2bac958bf29b1e759992b19850660d612dc25005`:

- `shared/measurements-model.js` → `measurements-model.js`
- `sport/src/measurements-shared.js` → `measurements-shared.js`

They are **not current standalone Sport v6**, whose source was unavailable. This
fixture cannot establish that deployment's behavior. No archive was downloaded or
retried for this test. Both files also match the public GitHub main baseline commit
`b8ff805511d0287bc3b064583ceda49a8e19b218` at the original paths listed above.
Their Git blob hashes are `94964cbc93db769f262cdb516173c632584143f3` (model) and
`63ee0c3bed9ead6af86df3f18f21ccd3fcc0b3a0` (adapter).

SHA-256 hashes of the original source and copied fixture:

- Model: `7b2c6ce3286513a71c7d4657106726c72c0701be2d55cb0893c50b68accd3660`
- Adapter: `dfa114dd0ca059735ceb27212c05aeb42acc6afd064709ea55de94ee3f486965`

`node scripts/check-measurements-two-clients.mjs` checks both hashes at startup.
Do not fix or modernize these historical fixtures: their purpose is to reproduce
a mixed-version failure without modifying historical source.

## What the test demonstrates

Two instances of the actual current adapter execute in independent VM contexts,
each with its own in-memory localStorage. Their only shared data is the fake REST
server, which retains AES-GCM ciphertext and per-owner keys. Reads decrypt through
the stubbed cloud helpers; writes use the actual adapter's encryption and CAS code.
The fake server implements first-write ignore-duplicates and timestamp PATCH CAS.

The scenarios cover current/current convergence, a deliberately synchronized first
POST collision, offline edits and reconnection, equal-revision edit/edit and
edit/delete conflicts in both arrival orders, and account switching after a request
has been sent. No network primitive is provided to either VM. All identities, keys
and measurement records are freshly generated or fictional.

The final scenario **expects a known failure**, not successful compatibility: the
legacy client resurrects an equal-revision deletion, the candidate restores the
tombstone, and three repeated cycles produce seven writes without convergence.
Both adapters can show synchronized status after their individual writes. A green
test means the witness reproduced as expected; it does not mean mixed deployments
are safe.

The test stubs cloud helper functions, account authorization, DOM and timers. It
cannot verify actual RLS, authentication, network behavior, browser event delivery,
iOS installation isolation, standalone Sport v6, or deployed end-to-end sync.
