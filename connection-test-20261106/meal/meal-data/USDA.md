# USDA SR Legacy reference snapshot

Full **SR Legacy final April 2018** snapshot from USDA FoodData Central; FDC record publication date is **1 April 2019**, not new 2019 measurements. Retrieved 1 November 2026. July 2018 manganese corrections for NDB 23424/23425 are present. This is **not all FoodData Central**, Foundation, FNDDS, or the current Branded database. SR Legacy itself includes some historical brand-name foods as well as generic foods.

## Sources and license

- [Official downloads](https://fdc.nal.usda.gov/download-datasets/)
- [Exact JSON ZIP](https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip)
- [SR Legacy documentation](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR-Legacy/SR-Legacy_Doc.pdf)
- [FDC license: public domain / CC0 1.0](https://fdc.nal.usda.gov/api-guide/#licensing)

Attribution: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central. SR Legacy, final April 2018 release; FDC publication 2019. Field mapping and selected Russian translations: Happy Meal. No USDA endorsement implied.

## Rebuild and verification

Download the exact public ZIP outside this repository, then:

```sh
python scripts/build-usda.py --archive /absolute/path/sr-legacy.zip
```

Standard-library Python only; no API key or runtime third-party service. The importer pins archive SHA-256 `0fe8ae486a2c8eb42cb96413f058deb51863a46c8fb8eeb4b1fb45006dd338ef`. A changed archive fails closed for review.

Verified: **7,793 unique FDC IDs**, **644,125 numeric nutrient values**, **149 nutrient definitions**, **14,449 original household portions**, **48 curated Russian names/alias records** (all 42 `Spices, ...` records plus six fresh herbs/stock). These source counts match the SR Legacy documentation. Asset: approximately 15.9 MB uncompressed / 3.1 MB gzip. Original English names remain for every record; English-only coverage is explicit, not silently auto-translated.

Paprika is FDC **171329** (282 kcal/100 g, teaspoon 2.3 g); black pepper **170931** (251 kcal/100 g, ground teaspoon 2.3 g, whole teaspoon 2.9 g). Pure red/cayenne pepper **170932** (sodium 30 mg/100 g) is not chili-powder seasoning **171319** (sodium 2,870 mg/100 g). No cultivar stronger than the original description is claimed. Original portions preserve `amount`, modifier, and `gramWeight`; the gram weight belongs to that stated amount, not automatically one unit.

## Schema and definition safety

`source` records release/publication/download hashes/license. `nutrientDefinitions` centralizes original nutrient IDs, names, original units, standard target keys, and conversion factors. Every food contains `sourceNutrients` (all original numeric amounts), compatible `nut` fields, `portions`, source URL, FDC ID and NDB number. Custom fields are materialized by the loader as `prop:usda:<nutrientId>` for definitions that are not safely equivalent to the app's existing standard fields. The raw archive retains additional statistical/derivation metadata that is not duplicated in this compact catalog.

- **Carbohydrate by difference (1005)** stays separate, includes fiber. BLS `CHO` is available carbohydrate, the sum of sugars, starch, available oligosaccharides and polyols. No blind substitution or inferred fiber subtraction. Therefore USDA available-carb total may be unknown even while its reported total carbohydrate is visible in source details.
- Vitamin A RAE/IU, alpha-tocopherol, separate vitamin K forms, cystine, and unspecified 18:2/18:3 fatty acids remain separate. No invented total omega-3/omega-6 or salt.
- Folate standard is reported total folate, not dietary folate equivalents; niacin is not niacin equivalents.
- EPA/DPA/DHA are converted g→mg; fluoride and beta-carotene µg→mg. Original values remain intact.
- Explicit zero is retained. Missing/non-equivalent data stays unknown, never synthesized as zero.

Definition sources: [BLS 4.0 documentation, §5.3](https://www.openagrar.de/servlets/MCRFileNodeServlet/openagrar_derivate_00069363/BLS_4_0_Dokumentation_DE.pdf); [USDA SR28 documentation, carbohydrate](https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/sr28_doc.pdf). SR Legacy refers detailed food-method documentation back to SR28.

`legacySearchReplacements` identifies eight prior hand-entered generic herb entries for **new-search de-duplication only**. Historical IDs, compositions, and diaries must remain untouched. Old `bbf` is **not** an exact alias: its app name claims bone stock with fat removed, whereas the USDA item only says home-prepared beef stock. It must not be silently rewritten as that product.
