# Mixed measurement clients: synthetic compatibility result

This is a follow-up to the unreleased sync checkpoint. Application source and
production services are unchanged by this follow-up; only tests and documentation
are added. No real account, network connection, browser storage, or personal
measurements are used.

## What the new test runs

`node scripts/check-measurements-two-clients.mjs`

Two independent VM contexts execute the actual measurement model and adapter.
Each has its own storage map. A shared fake REST service retains AES-GCM encrypted
rows, validates the expected owner and conditional write contract, and simulates
first-write collisions and offline errors. This verifies the adapter's behavior,
not real server authentication, RLS, browser event timing, or installed apps.

The six scenarios cover:

1. Independent current clients merge different dates and stop rewriting once
   they agree.
2. Simultaneous first inserts collide and retry without losing either date.
3. Offline edits survive locally and combine with another client's changes on
   reconnect.
4. Equal-revision edits and deletions converge in both arrival orders.
5. Switching accounts during an already-sent upload does not populate the new
   profile or write to its server row. The old request may still finish for its
   original owner.
6. A **known mixed-version failure**, reproduced intentionally and asserted by
   the test rather than counted as successful interoperability.

## Confirmed mixed-version failure

The unchanged legacy fixture is the embedded measurement client from Meal Sites
v12, source commit `2bac958bf29b1e759992b19850660d612dc25005`. Its model is also
byte-identical to the pre-fix GitHub main model. Fixture hashes are checked by the
test before it runs. This fixture is not the standalone Sport Sites v6 build.

With a live measurement and a deletion for the same date and revision:

- The fixed client writes the deletion.
- The old client reads that deletion but merges its live record back in and
  uploads it.
- The fixed client restores the deletion on its next synchronization.
- The sequence repeats. Three cycles cause seven total server writes, while
  both clients repeatedly report synchronization success despite disagreeing.

This is a reproducible code-level failure in a controlled fake transport. It
does not establish that any personal record has been affected.

## Deployment and migration implications

An isolated fix to one consumer is insufficient. All compatible consumers of
the measurement document need the same conflict rule, followed by a controlled
cross-browser check. Historical data must not be imported merely because the
individual clients display a success message.

There is a separate integration gap: the earlier verified deployment report
describes the standalone Sport test storing measurements within its journal,
whereas Meal's embedded legacy adapter uses the dedicated measurement document.
The currently accessible metadata identifies those deployed source revisions,
but their exact Day/Sport source bytes were not retrieved in this follow-up.
The archived report is not a fresh source audit or permission to activate a new
channel. The GitHub checkpoint must not replace whole deployed applications.

Before release: obtain permitted exact deployment sources, reconcile channels
without losing journal fields, test with an authorized clean account, and verify
rollback and mixed-version handling. Existing personal profiles are not empty
test sandboxes. No real-account verification or historical import was performed.
