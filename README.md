# Happy Meal · standalone food libraries

This dedicated branch contains public reference data only. Do not merge it into application branches. App releases starting with Meal 22.11-usda-test.15 read the shared v1 manifest at this branch's stable raw URL. Older application releases remain unchanged.

Update data independently of applications: create a data commit, validate exact IDs, composition schema and hashes, then update manifest.json atomically to reference the new immutable data commit. Keep schema v1 and existing canonical IDs; breaking formats require a new manifest major version. The app checks the manifest on startup; restarting it picks up published compatible library updates.

USDA and the 53-card Uzbek collection use lossless gzip. Decode before parsing JSON; SHA-256 values in the manifest cover the uncompressed UTF-8 JSON. USDA original SHA-256: 2fb25ebb266524ab4a1b564097ca54a5f56ecca29306a5667908b4abb7be2201. Uzbek canonical records and nutrient values are unchanged from standalone library 1.7.0; internal file provenance identifiers are omitted from this public delivery package.

No accounts, credentials, personal recipes, journals, or database writes are part of these libraries. Historical food snapshots in users' journals must not be recalculated when a reference library changes.
