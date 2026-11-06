# Uzbek cuisine: limited estimated release

2026-11-02. Private Happy Meal USDA Test, version22.11-usda-test.6, base989031efac7d31c973d3909a3c93586a762ea608. No diary entries, personal products, storage, authentication, import or icon changes. No GitHub/main publication.

## Reproducible artifacts
- `meal-data/uzbek-draft.json`: research definitions for two plov variants, two shurpa variants and manty; exact source masses/output, ingredient mappings and unresolved evidence. Its full-release gate remains false.
- `meal/uzbek-recipe-model.js`: pure evaluator with verified nutrient-specific retention mode and explicitly uncorrected estimated mode. No storage/network writes.
- `scripts/build-meal-uzbek.mjs`: builds **only two adapted plov estimates** into `meal-data/uzbek-recipes.json` from actual local BLS + USDA files, with input hashes, canonical units and complete provenance.
- `meal/uzbek.js`: read-only reference-food module, visible Uzbek library category, source information/footer. Catalog append retains existing snapshot behavior and source toggles. CSV identifies actual BLS + USDA instead of prior generic MEXT-recipe label.
- `scripts/check-meal-uzbek{,-ui}.mjs`: source/calculation/model/search/export regression tests. Synthetic diary fixtures only; no real diary write.
- `docs/uzbek/sources.md`: evidence and uncertainty. Copyrighted source-page images are not redistributed in Site.

## Calculation and limitations
Source plov uses79g edible raw meat,100g dry rice,25g onion,80g carrot,30g vegetable oil,3g salt,1.5g «тмин», plus100g cooking water from its1:1 instruction. Raw input418.5g, source finished yield350g. Soaking/rinsing water is not retained ingredient. White rice, shoulder, sunflower oil and **cumin/zira USDA170923** are explicit own-recipe adaptations; ambiguous source spice is not claimed botanically exact. Skurikhin31% mass loss is not applied again.

User authorized existing BLS→USDA→MEXT fallback for missing ingredients. Actual used catalogs are BLS + USDA only. USDA canonical `nut` values already per100g; no ounce/pound or microgram reconversion. In general1oz=28.349523125g,1lb=453.59237g; these recipes already use grams, so neither conversion is applied. Cups need food-specific gramWeight, never universal volume-to-weight. USDA dill5sprigs=1g is not5g.

Finished yield accounts for concentration; final moisture remains unknown. Published nutrients are explicitly **estimates without established thermal-retention adjustment**, not lab measurements or Skurikhin-calibrated values. Source qualifiers display≈. USDA available carbohydrate, vitamin definitions and absent ingredient fields remain unknown, not zero. Existing strict whole-recipe completeness is preserved: an incomplete nutrient is not represented as a complete total. Known raw subtotals remain diagnostic metadata, not lower-bound nutritional claims.

The actual Skurikhin plov row is read, but scope unresolved. Alternative USDA retention6 covers only selected vitamins/minerals and no matched full vegetable cooking chain; no arbitrary factors applied. Full requested processing calibration remains pending.

## Portions
On published plov variants only:100g basis;350g source recipe serving; small piala300g and large piala500g are explicit user-measured weights, editable through existing custom portions. They are not universal dish/shape standards. No personal family/intake story is catalogued. Bowl can be named/weighed via existing own measure; no invented bowl standard. Samsa triangle/square-envelope stay pending, not fixed masses.

## Deferred dishes
Shurpa: fresh dill mapped to USDA172233, but salt/spice amounts unspecified and raw-fat kind an explicit unresolved choice; do not publish incomplete totals. Manty: source300g/5pcs gives60g each, flour75g includes5g dusting, vinegar15g is separate; red-pepper form/greasing retention remain uncertain. Samsa source/fat/shape-weight not adequate for release. These are not claimed shipped.

## Verification
All meal checks plus counters, sharedUI and layout run against final changes. Added tests cover input hashes, raw/cooked basis, independent output arithmetic, per100g/300g/500g scaling, IDs, true0 vs missing, repeated USDA conversion, source-pref discovery, variants, independent copies, synthetic exports, immutable historical composition and offline favourites. Browser QA uses existing local preview only, with no diary saves. Physical iPhone not tested. Sport unchanged; node_modules absent so Sport build/check not rerun.

## Test7 presentation correction (2026-11-02)
Canonical shared-catalog names are «Плов узбекский с бараниной» and «Плов узбекский с говядиной»; former names remain searchable aliases. The visible Uzbek block in the personal Library screen was removed at user request; internal `catalogCuisine.id=uzbek` is retained. No foods, nutrient values or historical diary snapshots were removed or changed. Empty-search diagnostics explain disabled catalogs and link to existing settings without enabling them automatically. The separately approved blue/turquoise Meals icon replaces current icon references; source provenance is in `docs/meal-icon-20261102.md`.

## Test8 supported batch
Six shared estimated foods: two existing plovs, lamb/beef shurpa, lamb manty without vinegar, oven samsa. Every item keeps exact ingredient IDs and per-dish provenance, internal cuisine metadata and independent portions. Plov revision3 adds only an explicitly documented ingredient carbohydrate estimate; calories/protein/fat and original source catalogs remain unchanged. Historical snapshots retain their original composition.

Shurpa source500g output and own selected seasoning are disclosed. Manty300g/5pieces excludes15g vinegar; full grease transfer remains an estimate. Samsa is an explicit own adaptation of the net table at https://tekhnolog.com/2019/03/31/samsa-duhovaya-s-myasom-ttk5352/ :10pieces1495g raw ingredients→1200g final target. Source intermediate65g dough+77g filling differs from149.5g raw table perpiece; the table is the chosen formulation, not a validated measured yield. BLS raw sheep intermuscular fat replaces unavailable tailfat explicitly. Final10g sunflower oil is assumed transferred after baking. Triangle/source shape and square-envelope/own shape both target120g, editable, never a universal shape weight. Source nutrition is not imported.

All prepared-food values remain estimates without verified thermal-retention adjustment. The correct recipe-local carbohydrate formula is USDA1005−1079;1005 already excludes alcohol. Generated records preserve input values, formula, source method links and estimated status. No global USDA remap, energy recalculation, absent-value zero fill or repeated yield/conversion.

Browser QA uses an unsigned localhost preview. A locally-created manty test fixture remains after a denied cleanup action; no retry or bypass was made. It is browser-local only, not a catalog, repository or deployment artifact. No live user account/diary was accessed. Synthetic script fixtures remain separate from runtime user storage.
