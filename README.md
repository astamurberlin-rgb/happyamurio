# Happy Meal · standalone food libraries

This dedicated branch contains public reference data only. Do not merge it into application branches. Happy Meal Update 23 at https://astamurberlin-rgb.github.io/happyamurio/meal-23/ and later compatible releases read the shared v1 manifest at this branch's stable raw URL. Earlier applications remain unchanged.

## Current Uzbek library

Version **1.10.1**, public delivery **1.10.1-meal23.2**, 60 cards (not 60 complete nutritional analyses), released 2026-11-07. All previous 53 canonical compositions and IDs are preserved. All 60 source-release compositions, numeric/null fields and 125 canonical portions are unchanged. The six historical salt fields remain unknown. Nishalda is a partial-information card: its full canonical nutrients stay null, while the source notes explicitly identify the known subtotal and conditional range.

The distribution package adds Nishalda search words derived from its existing names and aliases and the catalogs metadata required by the unchanged Update 23 loader and aliases the ingredient source IDs/notes for its current detail view. Private artifact/page locators are omitted. The original standalone release has SHA-256 13325820db2559e1b7cc4fd7e984b56a936d410073f64747e2ccf4e7fb1fe98b. The manifest contains the public delivery hash; it is intentionally different because of metadata-only adaptations and compact encoding.

**Prepared, not published: 1.10.2** (`data/uzbek-recipes-1.10.2-meal23.2.json.gz`, 2026-11-12). Two cards change, same IDs, `revision` 2. Nishalda: title «Нишалда»; energy, protein, fat and carbohydrate become the known-ingredient subtotal per 100 g (344.3884 kcal, 0.58844 g, 0.00172 g, 85.42296 g — recomputed from BLS 4.0 for sugar 854 g, egg white 56 g, citric acid 1 g, gelatine 0.4 g per 1000 g yield) marked `estimated`; every other nutrient stays null; the long summary and the etmak note leave the card text; recipe, references, approximate range and known properties stay in the record; ingredient notes are in Russian. Navat with grape juice: no retailer or SKU in its title, captions and service ingredient ID (owner's rule of 2026-11-12: no brands or sellers in user-facing names and descriptions); retailer, SKU and links stay in `provenance`, `sourceResearch` and URLs; composition unchanged. The other 58 cards are byte-identical. Diary entries keep their snapshot of revision 1. Checked with the Uzbek loaders of Meal 23–30. See `data/uzbek-1.10.2-validation.json`.

BLS attribution: Max Rubner-Institut (2025), Bundeslebensmittelschlüssel (BLS), Version 4.0, Karlsruhe. The official [FAQ, question 17](https://www.blsdb.de/faq) permits free use, including application/software development. Unsupported CC BY labels for BLS in the source archive are clarified in this delivery; this does not relicense separate research articles. Source names, public references, calculation assumptions and unknowns are retained. USDA FoodData Central / SR Legacy is public-domain source data; recipe adaptations and translations are Happy Meal.

## Desserts library 1.0 (2026-11-09)

`desserts` — 97 records selected by ChatGPT (schema `happy-independent-food-library/1.0`): 30 own cards (manufacturer labels, two assembled models, one recipe estimate) and 67 collection marks on records that already exist in BLS, USDA, Caucasian and Uzbek libraries (no duplicate products). Seven draft positions are excluded and not published here. Manifest `bytes`/`sha256` refer to the uncompressed JSON and match the source package `SHA256SUMS.txt`. First compatible reader: Happy Meal Update 25 (`desserts.js`). Details: [data/DESSERTS.md](data/DESSERTS.md). Earlier applications ignore unknown manifest entries.

— Claude · 09.11.2026 14:58

## Desserts library 1.1 (prepared 2026-11-12, not published)

`data/desserts-1.1.json.gz` — 103 records: the 97 records of 1.0 unchanged plus four own cards — «Орешки с варёной сгущёнкой», «Чизкейк Нью-Йорк, классический», «Поссет лимонный», «Эклер с заварным кремом и сахарной пудрой» — and two collection marks on existing Uzbek cards (Nishalda, navat with grape juice). User-facing names, aliases and notes carry no brands or sellers; source names, codes and links stay in `sourceContext` and `sourceUrls`. Data: ChatGPT handoff 2026-11-12, sources re-checked by ChatGPT; label keys normalised to the 1.0 vocabulary so Meal 25–30 read them without code changes. Thiamin, riboflavin, niacin and folic acid of the cheesecake are held in `sourceContext` until a Meal release maps them. Two orange possets are deferred (`data/desserts-deferred/`). Details: [data/DESSERTS.md](data/DESSERTS.md).

— Claude · 12.11.2026 15:20

## Supplements catalog 1.0.0 (2026-11-11)

`supplements` — 31 unbranded supplement templates for Happy Meal Update 29 and later (schema `happy.supplements.templates.v1`): names, components mapped to Meal substance IDs, and for 29 templates a sourced example of one open label (serving basis, amounts, link, quote, check date). Examples are not dose recommendations; `null` means unknown, not zero. Templates by Mikhalych (ChatGPT) with Astamur; released as a standalone library by Claude. Personal variants and intake records are not stored here: they live in the account document (`app_sync` meal/supplements). Details: `data/SUPPLEMENTS.md`.

— Claude · 11.11.2026 23:55

## Updates and rollback

Create a data commit, validate exact IDs, schema and hashes, then update manifest.json to reference that immutable commit. Keep schema happy.food-libraries.v1 and canonical IDs. Breaking formats require a new manifest major version. The app checks the manifest once on startup; close and reopen to obtain the latest compatible library. Already-open sessions retain their loaded snapshot.

New agreed application releases use separate named directories and URLs, retain the shared loader, and do not overwrite old application pages. Data libraries are intentionally independent: compatible releases share the manifest, while prior data commits and versioned files remain available. Rolling back an application page alone does not roll back the shared catalog. Historical diary compositions are snapshot-based and must not be recalculated when a catalog changes.

USDA and Uzbek collections use lossless gzip. Decode before parsing JSON; manifest SHA-256 and byte size refer to uncompressed UTF-8 JSON. Previous 1.7.0 remains at https://raw.githubusercontent.com/astamurberlin-rgb/happyamurio/b91cde66108f46a0de736ff58743aa1bdece58e9/data/uzbek-recipes.json.gz . No old file is removed by this release.

## Validation

Data validation reproduced 1841 known canonical values and checked 2719 nulls and 9500 fields of 125 portions. Ten integration tests cover all 60 cards, repeated ingest/append, Nishalda missing totals and explanatory text, prior records, journal snapshots, invalid identities, gzip/hash/length verification, retry after integrity/network errors and URL restrictions. The unchanged Update 23 startup test also passed. See data/uzbek-1.10.1-validation.json.

No accounts, credentials, personal recipes, journals, database writes, or application-code changes are included.
