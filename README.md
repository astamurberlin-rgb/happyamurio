# Happy Meal · standalone food libraries

This dedicated branch contains public reference data only. Do not merge it into application branches. Happy Meal Update 23 at https://astamurberlin-rgb.github.io/happyamurio/meal-23/ and later compatible releases read the shared v1 manifest at this branch's stable raw URL. Earlier applications remain unchanged.

## Current Uzbek library

Version **1.10.1**, public delivery **1.10.1-meal23.1**, 60 cards (not 60 complete nutritional analyses), released 2026-11-07. All previous 53 canonical compositions and IDs are preserved. All 60 source-release compositions, numeric/null fields and 125 canonical portions are unchanged. The six historical salt fields remain unknown. Nishalda is a partial-information card: its full canonical nutrients stay null, while the source notes explicitly identify the known subtotal and conditional range.

The distribution package adds the Nishalda catalogs metadata required by the unchanged Update 23 loader and aliases the ingredient source IDs/notes for its current detail view. Private artifact/page locators are omitted. The original standalone release has SHA-256 13325820db2559e1b7cc4fd7e984b56a936d410073f64747e2ccf4e7fb1fe98b. The manifest contains the public delivery hash; it is intentionally different because of metadata-only adaptations and compact encoding.

BLS attribution: Max Rubner-Institut (2025), Bundeslebensmittelschlüssel (BLS), Version 4.0, Karlsruhe. The official [FAQ, question 17](https://www.blsdb.de/faq) permits free use, including application/software development. Unsupported CC BY labels for BLS in the source archive are clarified in this delivery; this does not relicense separate research articles. Source names, public references, calculation assumptions and unknowns are retained. USDA FoodData Central / SR Legacy is public-domain source data; recipe adaptations and translations are Happy Meal.

## Updates and rollback

Create a data commit, validate exact IDs, schema and hashes, then update manifest.json to reference that immutable commit. Keep schema happy.food-libraries.v1 and canonical IDs. Breaking formats require a new manifest major version. The app checks the manifest once on startup; close and reopen to obtain the latest compatible library. Already-open sessions retain their loaded snapshot.

New agreed application releases use separate named directories and URLs, retain the shared loader, and do not overwrite old application pages. Data libraries are intentionally independent: compatible releases share the manifest, while prior data commits and versioned files remain available. Rolling back an application page alone does not roll back the shared catalog. Historical diary compositions are snapshot-based and must not be recalculated when a catalog changes.

USDA and Uzbek collections use lossless gzip. Decode before parsing JSON; manifest SHA-256 and byte size refer to uncompressed UTF-8 JSON. Previous 1.7.0 remains at https://raw.githubusercontent.com/astamurberlin-rgb/happyamurio/b91cde66108f46a0de736ff58743aa1bdece58e9/data/uzbek-recipes.json.gz . No old file is removed by this release.

## Validation

Data validation reproduced 1841 known canonical values and checked 2719 nulls and 9500 fields of 125 portions. Nine integration tests cover all 60 cards, repeated ingest/append, Nishalda missing totals and explanatory text, prior records, journal snapshots, invalid identities, gzip/hash/length verification, retry after integrity/network errors and URL restrictions. The unchanged Update 23 startup test also passed. See data/uzbek-1.10.1-validation.json.

No accounts, credentials, personal recipes, journals, database writes, or application-code changes are included.
