# Japanese reference foods in Happy Meal

This is a curated, adapted catalogue of **520 official food codes in 278 variant families**. It is not the full Japanese database and does not replace the BLS catalogue. All source IDs use the separate `mext:` namespace.

Source: Ministry of Education, Culture, Sports, Science and Technology, Japan (MEXT), *Standard Tables of Food Composition in Japan, eighth edition, Supplement 2023*. The official download files used here incorporate the corrections dated **27 March 2026**. The original Japanese names are preserved verbatim. The Russian and English display names are translations prepared by Happy Meal; they are not official MEXT translations.

## Sources and reuse

- [Official edition and download index](https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html)
- [Main composition table](https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_02.xlsx)
- [Amino acids per 100 g edible food](https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_04.xlsx)
- [Fatty acids per 100 g edible food](https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_09.xlsx)
- [Available carbohydrates, individual sugars and polyols](https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_13.xlsx)
- [MEXT reuse terms](https://www.mext.go.jp/b_menu/1351168.htm), checked 29 October 2026. These permit reuse, translation/adaptation and commercial use with attribution and identification of modifications. The terms expressly say numeric data are outside copyright protection, and are compatible with CC BY 4.0. No MEXT logo, photographs or third-party illustrations are included.

Required attribution appears in the dataset's `source.attribution` and the application source panel. Each food links to its official MEXT food-detail page and retains its food code. The exact downloaded workbook SHA-256 values are in `source.downloads`.

## Files and reproducibility

`mext2023.json` contains the adapted records and source metadata. `mext-selection.json` is the readable selection manifest. `scripts/build-mext.py` contains the hand-curated translations, selection and deterministic import rules. It reads the list of existing Happy Meal canonical keys from `bls40.json`, but does not change that file.

Build with Python 3.10+ and openpyxl:

```sh
python scripts/build-mext.py --cache /tmp/happy-meal-mext
```

Official workbook downloads are cached outside the repository. A repeated build with the same workbook bytes produces the same JSON. Do not silently substitute a newer workbook with different food-code definitions; review corrections and rerun the audit first.

Each record contains:

- `names.ru/en/ja`, exact `code`, source namespace and a family that preserves fish species and meat cut/skin distinctions.
- `variant.ru/en/ja`; the Japanese pill uses a short distinguishing part of the original name or a documented concise translation, while the full original remains in `names.ja`.
- `nut`: existing Happy Meal nutrient keys; numbers only when the source supplies a compatible numeric result.
- `qualifiers`: original scalar or marker, numeric/missing/trace state, whether the value was parenthesised, and which source table supplied it.
- `extraProperties`: 20 separately identified MEXT properties per food, including selenium, retinol activity equivalents, tocopherol forms, alternative carbohydrate/protein/fat definitions, niacin equivalents and cystine. These are custom source properties with `prop:mext:` IDs, not automatically mapped standard nutrients.
- `sourceRaw`: every nonempty original cell after the identity columns in the four imported tables, including unmapped individual fatty acids and original notes. `sourceColumns` and `sourceUnits` provide global column identifiers and units. Original scalar strings, parentheses and `Tr` remain intact.
- `ediblePortion`: a 100 g edible-food basis and the source discard percentage. `sourceNotesRu` always identifies the edible basis. Source Japanese notes are preserved in `notesJa`.

## Meaning of numbers and missing data

| Source result | Imported meaning |
| --- | --- |
| Numeric `0` | Explicit numeric zero, retained as zero. |
| Parenthesised value, e.g. `(0.1)` | Numeric value with `estimated: true`; parentheses are retained in the qualifier. |
| `Tr` or `(Tr)` | Trace amount; numeric value is null, not zero and not “not detected”. Parentheses remain an independent flag. |
| Dash, blank, absent supplementary food row | No usable numeric result. This does not establish biological absence. |
| Incompatible nutrient definition | Null in the shared standard key; source value preserved under its own property. |

No nutrients are filled from a neighbouring food, another cooking state, another species, or another database. No missing carbohydrate is replaced with total carbohydrate by difference. Consequently, some records have known energy but incomplete macros.

### Explicit mapping decisions

- `carb` is MEXT `CHOAVL`, available carbohydrate **mass**, main column 15. Total carbohydrate by difference, available carbohydrate by difference, and monosaccharide equivalents remain separate source properties.
- `prot` and `fat` use the ordinary reported protein and lipid columns. Amino-acid-derived protein and triacylglycerol-equivalent fat remain separate properties. Energy is the MEXT value, not recalculated by a generic 4/4/9 formula.
- `vA` stays null: MEXT RAE is not silently equated with the BLS retinol-equivalent definition. MEXT RAE is preserved as `prop:mext:vitamin_a_rae` in `мкг RAE`.
- `vE` stays null: alpha-tocopherol is preserved separately and not silently equated with the existing vitamin-E-equivalent key.
- `b3` is niacin, not niacin equivalents. `b9` is reported food folate, not dietary folate equivalents.
- Amino acids are converted from mg per 100 g food to app grams. This is the edible-food table, not the nitrogen-normalised or protein-normalised table. MEXT cystine is retained as `prop:mext:cystine`; it is not silently put in the app field currently labelled cysteine (`cys_`).
- EPA, n-3 DPA and DHA stay in app **mg**. LA and ALA are converted from source mg to app grams. Aggregate fatty acid classes are already in grams.
- Beta-carotene is converted from source µg to app mg. Beta-carotene equivalents remain separate.
- Total sugars are not invented by summing incomplete individual sugar columns. Chloride, fluoride and other unreported keys stay null.

## Scope and audit

Category counts: cereals 63; potatoes and starches 20; sugars and syrups 4; legumes/soy 35; nuts/seeds 20; vegetables 95; fruit 59; mushrooms 21; seaweeds 14; fish/seafood 98; meat 30; eggs 13; dairy 18; fats/oils 10; seasonings/stocks 20.

The selected official codes join to 520 main-table rows, 474 amino-acid rows, 475 fatty-acid rows and 338 carbohydrate rows. There are **29,543 numeric standard-field values**, **770 trace standard-field results** and **7,723 parenthesised standard-field results**. Among the four macro keys, energy is present for all 520; protein is nonnumeric for 2, fat for 12, and available carbohydrate for 73. “Nonnumeric” includes traces as well as absent values.

Validation performed:

- All 520 food codes exist in the corrected official workbook; IDs and codes are unique. Every record has all shared keys and nonempty RU/EN/JA names. No unsupported numeric sentinel or marker is accepted.
- Numeric/trace/missing and estimated flags are checked independently; explicit zero stays numeric. All exported numeric values are finite and nonnegative.
- Same-code joins are enforced across the four workbooks. Supplementary rows are never borrowed.
- Source header identifiers and units were inspected against the mapping. Saury was independently checked against the official web record, including amino-acid and fatty-acid units.
- Raw saury `10173`: 287 kcal, protein 18.1 g, fat 25.6 g, available carbohydrate 0.1 g (source-estimated), EPA 1,500 mg, n-3 DPA 310 mg, DHA 2,200 mg; isoleucine 860 mg becomes 0.86 g.
- Cooked white rice `01088`: 156 kcal and 34.6 g available carbohydrate. Skinless farmed Atlantic salmon `10438`: 223 kcal, 19.6 g protein, 17 g fat.
- Translations were checked for preparation, species, edible portion and liquid/syrup treatment. Important corrections: canned adzuki is in syrup; pineapple and loquat cans include heavy syrup; whipped cream includes sugar; the canned tuna types have explicit yellowfin/albacore identities; drained versus undrained canned fish is labelled.
- All 520 records pass the application's actual `MealCatalog.ingest` and `MealProducts.validate`. Copying saury to a user product also validates, preserves its cystine property separately, and retains the correct EPA/DPA/DHA and amino-acid unit scales.

### Chestnuts, mandarins and saury

Japanese chestnuts `05010/05011` are **shelled and peeled**, with shell and inner skin discarded (30% raw, 20% boiled). Chinese roasted chestnuts `05013` are also shelled and peeled, with 20% discard. These are edible-kernel nutrients; the discard percentage is metadata, not a second nutrient profile for the shell.

Satsuma `07027` is peeled segments with membranes (20% discard); `07029` is pulp without membranes (25% discard). Both are 49 kcal, but their available carbohydrate and fiber values differ. Apple with/without skin remains separate where MEXT provides separate official codes; no claim of dietary significance is inferred from the label alone.

Saury `10173` is raw flesh with skin from filleted fish; the note gives 35% discard if starting with a whole fish. `10174` was grilled whole and then evaluated as edible flesh with skin, excluding head, viscera, bones and fins. `10177` is seasoned canned saury **drained**; `10178` kabayaki includes the liquid. No record represents bones or shell as edible food unless explicitly stated by its source.

### Limitations

- This is a selected 520-code catalogue, not all 2,538 main-table food codes. The selection prioritises basic foods and common Japanese ingredients.
- The six official instant-ramen entries describe instant products and preparation states; they are not restaurant ramen. Four prepared entries include the soup and seasonings. MEXT identifies those prepared values as estimates from corresponding dry products, preserved in the source notes.
- Sushi and poke recipes are assembled separately by Happy Meal and must be labelled calculated recipes. They are not MEXT laboratory records.
- RU/EN names are editorial translations, not certified translations. Japanese originals and source codes remain available for verification.
- The separate detailed dietary-fiber-method and organic-acid workbooks are not yet imported. Total fiber and total organic acids from the main table are retained. Unmapped individual fatty acids from the imported fatty-acid workbook are preserved losslessly in `sourceRaw`, but not all currently have standalone editable custom-property rows in the app.
- A missing or trace marker alone does not determine whether a substance was not tested, was below the reporting threshold, or is biologically absent. The importer intentionally makes no such inference. A source-method review remains necessary for those claims.

The dataset is around 9.1 MB uncompressed / 0.64 MB gzip. The runtime may choose a compact read model, but source provenance and qualifiers must be retained when a record is copied into a user product or diary snapshot.
