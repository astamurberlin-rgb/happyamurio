# Happy Meal · standalone food libraries

This dedicated branch contains public reference data only. Do not merge it into application branches. Happy Meal Update 23 at https://astamurberlin-rgb.github.io/happyamurio/meal-23/ and later compatible releases read the shared v1 manifest at this branch's stable raw URL. Earlier applications remain unchanged.

## Current Uzbek library

Version **1.10.1**, public delivery **1.10.1-meal23.2**, 60 cards (not 60 complete nutritional analyses), released 2026-11-07. All previous 53 canonical compositions and IDs are preserved. All 60 source-release compositions, numeric/null fields and 125 canonical portions are unchanged. The six historical salt fields remain unknown. Nishalda is a partial-information card: its full canonical nutrients stay null, while the source notes explicitly identify the known subtotal and conditional range.

The distribution package adds Nishalda search words derived from its existing names and aliases and the catalogs metadata required by the unchanged Update 23 loader and aliases the ingredient source IDs/notes for its current detail view. Private artifact/page locators are omitted. The original standalone release has SHA-256 13325820db2559e1b7cc4fd7e984b56a936d410073f64747e2ccf4e7fb1fe98b. The manifest contains the public delivery hash; it is intentionally different because of metadata-only adaptations and compact encoding.

**Published 2026-11-12 15:41: 1.10.2** (`data/uzbek-recipes-1.10.2-meal23.2.json.gz`, 2026-11-12). Two cards change, same IDs, `revision` 2. Nishalda: title «Нишалда»; energy, protein, fat and carbohydrate become the known-ingredient subtotal per 100 g (344.3884 kcal, 0.58844 g, 0.00172 g, 85.42296 g — recomputed from BLS 4.0 for sugar 854 g, egg white 56 g, citric acid 1 g, gelatine 0.4 g per 1000 g yield) marked `estimated`; every other nutrient stays null; the long summary and the etmak note leave the card text; recipe, references, approximate range and known properties stay in the record; ingredient notes are in Russian. Navat with grape juice: no retailer or SKU in its title, captions and service ingredient ID (owner's rule of 2026-11-12: no brands or sellers in user-facing names and descriptions); retailer, SKU and links stay in `provenance`, `sourceResearch` and URLs; composition unchanged. The other 58 cards are byte-identical. Diary entries keep their snapshot of revision 1. Checked with the Uzbek loaders of Meal 23–30. See `data/uzbek-1.10.2-validation.json`.

**Prepared 2026-11-12, published together with 1.10.4: 1.10.3** (`data/uzbek-recipes-1.10.3-meal23.2.json.gz`, 2026-11-12). Three dairy products get generic names without brands, agreed by Astamur: «Катык 3%», «Каймак 45%», «Сузьма 9%» (same IDs, `revision` 2). Same pattern as navat in 1.10.2: brand off the name, captions, notes, recipe label, ingredient name and service ID, sourceInfo and field sources, and off the catalog code shown in the search result line (`qatiq-3pct`, `qaymoq-45pct`, `suzma-9pct`; the old code stays in `provenance.formerCatalogCode`); composition and portions unchanged; brand, manufacturer, references and URLs stay in `provenance`, `sourceResearch` and links; the brand stays a search word. The other 57 cards are identical. Diary entries keep their snapshot of revision 1. Checked with the Uzbek loaders of Meal 23–30. Open: the second suzma card (Halalmilk, not in the agreed list) still carries its brand and appears as a variant next to «Сузьма 9%»; the navat code in the search line still names the retailer and SKU (see `open` in `data/uzbek-1.10.3-validation.json`).

**Published 2026-11-13: 1.10.4** (`data/uzbek-recipes-1.10.4-meal23.2.json.gz`, 2026-11-13; built on 1.10.3, which was never published on its own). Owner's rules of 2026-11-13 (00:09 measures «либо порция либо нет», 00:22 names without reassurance, 11:16 «Добивай мелкие правки»). Measures: «порция»; example serving sizes («Порция N г, пример») become «маленькая порция» / «порция» / «большая порция»; pieces «шт»; «четверть лепёшки»; «упаковка»; the measured piala sizes «маленькая пиала», «большая пиала»; gram-only examples and duplicates are dropped (15) — grams are always available, and the app shows the grams of a measure in its pill; `recipe.portions` and `canonicalPortions` carry the same measures; old labels in `provenance.formerPortionLabels`. Names: 14 lose qualifiers such as «справочный ориентир…», «справочная сборка», «(расчётная оценка)», «домашняя адаптация» (old name in `provenance.formerName`); the second suzma becomes «Сузьма 6%» with the brand off the card as in 1.10.3 (code `suzma-6pct`); navat with grape juice gets the code `navat-grape-juice-spices`. All 60 records `revision` + 1, so diary entries keep their snapshot; composition values unchanged. Checked with the Uzbek loaders of Meal 23–31. See `data/uzbek-1.10.4-validation.json`.

— Claude · 13.11.2026 11:45

— Claude · 12.11.2026 19:40

BLS attribution: Max Rubner-Institut (2025), Bundeslebensmittelschlüssel (BLS), Version 4.0, Karlsruhe. The official [FAQ, question 17](https://www.blsdb.de/faq) permits free use, including application/software development. Unsupported CC BY labels for BLS in the source archive are clarified in this delivery; this does not relicense separate research articles. Source names, public references, calculation assumptions and unknowns are retained. USDA FoodData Central / SR Legacy is public-domain source data; recipe adaptations and translations are Happy Meal.

## Desserts library 1.0 (2026-11-09)

`desserts` — 97 records selected by ChatGPT (schema `happy-independent-food-library/1.0`): 30 own cards (manufacturer labels, two assembled models, one recipe estimate) and 67 collection marks on records that already exist in BLS, USDA, Caucasian and Uzbek libraries (no duplicate products). Seven draft positions are excluded and not published here. Manifest `bytes`/`sha256` refer to the uncompressed JSON and match the source package `SHA256SUMS.txt`. First compatible reader: Happy Meal Update 25 (`desserts.js`). Details: [data/DESSERTS.md](data/DESSERTS.md). Earlier applications ignore unknown manifest entries.

— Claude · 09.11.2026 14:58

## Desserts library 1.1 (prepared 2026-11-12, published 2026-11-12 15:41)

`data/desserts-1.1.json.gz` — 103 records: the 97 records of 1.0 unchanged plus four own cards — «Орешки с варёной сгущёнкой», «Чизкейк Нью-Йорк, классический», «Поссет лимонный», «Эклер с заварным кремом и сахарной пудрой» — and two collection marks on existing Uzbek cards (Nishalda, navat with grape juice). User-facing names, aliases and notes carry no brands or sellers; source names, codes and links stay in `sourceContext` and `sourceUrls`. Data: ChatGPT handoff 2026-11-12, sources re-checked by ChatGPT; label keys normalised to the 1.0 vocabulary so Meal 25–30 read them without code changes. Thiamin, riboflavin, niacin and folic acid of the cheesecake are held in `sourceContext` until a Meal release maps them. Two orange possets are deferred (`data/desserts-deferred/`). Details: [data/DESSERTS.md](data/DESSERTS.md).

— Claude · 12.11.2026 15:20

## Desserts library 1.2 (prepared 2026-11-12, not published)

`data/desserts-1.2.json.gz` — the same 103 records as 1.1; two cards change composition and 27 cards of 1.0 get generic names without brands or sellers (list by Mikhalych, agreed by Astamur; composition unchanged, original names kept in `sourceContext.titleAsInSource`); the other 74 records are unchanged. Kozinaki: the whole recipe model is recomputed with hulled sesame (USDA 169412 instead of whole 170150) and gains nine minerals; New York cheesecake: thiamin, niacin and folic acid from the manufacturer's per-100 g table enter the composition; riboflavin is an estimate of 0.19 mg from the similar commercial cheesecake USDA FDC 172711 (0.193 mg), marked as estimated, while the manufacturer's 0.013 mg is kept in working data. All 29 changed cards carry a per-record `revision` (20261112) so new diary entries get new snapshots while old entries keep theirs. Meal 25–30 assign one fixed revision and do not know the new label keys, so 1.2 is published under a separate manifest entry, `desserts2`, read by the next Meal release; `desserts` stays at 1.1. Details: [data/DESSERTS.md](data/DESSERTS.md).

— Claude · 12.11.2026 17:20; 17:52; 18:55

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
