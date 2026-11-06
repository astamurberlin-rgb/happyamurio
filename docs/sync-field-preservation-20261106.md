# Measurement field preservation · 6 November 2026

Status: **unreleased technical candidate**, continuing saved commit
`aace534969706f6809ac4ea0334fd1b898bde1f4`. No personal measurements were imported
or used as fixtures. No production, account, permission, or database changes.

## Confirmed loss and correction

The previous form recreated `values` using only its fixed field list. Additional
numeric keys survived the measurement model and CSV export but disappeared when
an existing date was edited. A synthetic execution of the actual previous submit
handler reproduced that loss.

The candidate now reads the latest local record before saving and preserves its
additional numeric fields. Present known controls can be changed or explicitly
cleared; an absent control is not interpreted as a clear. Date changes retain the
extra fields and cannot overwrite an occupied destination. A record containing
only preserved extensions can remain valid after its last known field is cleared.

An open form is bound to its token, original date, selected profile, and effective
authenticated profile. If a known submitted field changed since opening, the
source record disappeared, or the profile changed, saving is rejected with a
request to reopen. This includes the interval after authentication changes but
before the selected measurement owner has refreshed. Newly received or changed
extension fields are taken from the latest document, not an obsolete form copy.

Unknown CSV headers use the literal prefix `Дополнительное поле: ` and do not
invent a unit. The prefix also prevents an unknown key from becoming a leading
spreadsheet formula. Known fields retain their existing names and units. Unknown
keys are not inserted into the form as HTML.

## Visible scope is unchanged

The original 17 numeric controls and ordinary left/right labels remain. No new
relaxed/contracted state controls, extra history rows for those states, or
unspecified-state labels are enabled in this candidate. New variants require a
separate design review. Proposed state names occur only in invented extension
fixtures to test preservation; they are not a finalized application schema.

Existing generic arm measurements are not reclassified. No quadriceps-to-thigh
conversion or other historical-data mapping is performed. Height, age, and other
new entry fields are not introduced. Storage keys, document version 1, encrypted
channel, and server schema remain unchanged. Sport HTML is rebuilt from source;
released version numbers are unchanged.

## Verification

Run `node scripts/check-measurements-fields.mjs`. The nine synthetic scenarios
execute the real form handler, model, local adapter, recovery functions, and CSV
generation with isolated storage and a stubbed DOM. They check:

1. Original 17 controls and ordinary labels, with future extension controls absent.
2. Additional fields surviving a complete form submit and explicit known clears.
3. Partial controls, date moves, local persistence, and JSON/model round trips.
4. Latest extension additions, updates, and removals while the form is open.
5. Deleted source, occupied date, malformed input, and unreadable local state.
6. Delete/recovery retaining generic, proposed-state, and other extra values.
7. CSV value fidelity, explicit unknown headers, and no guessed units.
8. Stale blank/changed known controls and selected/authenticated owner changes.
9. Unknown-only records and harmless handling of HTML/formula-like key names.

The prior 20 build/check commands plus this suite pass: **21/21**. The full list
is in [the checkpoint report](sync-checkpoint-20261106.md). This is function and
generated-markup verification, not visual browser, iOS, real-account, or deployed
Sites validation.

## Compatibility and release limits

Preserving extra keys in this candidate does not fix legacy clients: an old form
can still discard them when it edits the same date. The separate old/new deletion
oscillation also remains reproduced. Do not partially deploy or import history
on the strength of these checks.

The wire model still resolves conflicts by entire date. Local stale-form rejection
is not field-level merge across devices. localStorage is still not transactional
across tabs. Exact deployed Day/Sport source reconciliation and an authorized
clean test account remain prerequisites for a real cross-app verification.
