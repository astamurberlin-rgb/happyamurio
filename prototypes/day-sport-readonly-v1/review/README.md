# Independent review: Day → Sport read-only reader

Offline review dated 6 November 2026. This folder contains only synthetic tests,
source references, results and a report. No full private source checkouts,
credentials, personal journals or runtime sessions are included.

The reviewed module is not connected to Day, Sport, an account or a backend.
See `REVIEW.ru.md` for ranked integration gates and exact tested scope.
`SOURCE-AUDIT.md` explains the verified deployed-source compatibility boundary.

## Standalone reader tests

Node 22+; no dependencies, install, network or source checkouts needed. From this
folder, point `READER_MODULE` at the reader module under review:

```sh
READER_MODULE=../src/sport-measurement-reader.mjs \
  node --test prototype-adversarial.test.mjs
```

Pass `READER_MODULE` explicitly for this bundled layout; the tests retain their
original development-layout default. The path may be relative to the shell's current directory. The module's validator
must remain alongside it. These 14 tests use synthetic records, real WebCrypto
and injected fake transports only.

## Optional exact-source contract/provenance tests

These five tests need the original authorized local Day/Sport checkouts; they
are **not** required to run or test the standalone reader. They do not obtain
source, credentials, accounts or network access. Pass directories explicitly:

```sh
DAY_SOURCE_DIR=../exact-day-source \
SPORT_SOURCE_DIR=../exact-sport-source \
VALIDATOR_SOURCE_FILE=../src/sport-journal-validator.mjs \
  node --test source-contract.test.mjs
```

Expected commits:

- Day: `386ebc402e5fdc37310920304bf167086c30f342`.
- Sport: `b00d4474a79f43a0bd64f23b71556f6a7409fe9f`.

The default checkout layout, if the source environment variables are omitted,
is the sibling `happy-deployed-source-read-20261106/day` and `sport` directories.
Confirm the checkout HEADs yourself; the tests do not fetch or switch branches.

## Recorded verification

- `prototype-adversarial-results.tap`: 14 independent reader tests passed.
- `source-contract-results.tap`: 5 exact-source tests passed.
- `all-results.tap`: combined 19 independent tests passed.
- `author-check-results.log`: reviewed author's syntax checks and 65 tests passed.
- `REVIEW-MANIFEST.json`: reviewed code/test hashes and scope. The test sets overlap;
  these counts must not be presented as unique live cross-app acceptance cases.

Tests never run production scripts, refresh tokens, persistence, import,
migration or publication. The original source checkouts remained clean.
