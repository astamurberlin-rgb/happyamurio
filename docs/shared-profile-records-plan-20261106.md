# Common Happy profile and records: proposed next steps

The goal is one logical profile and one authoritative collection of records.
Day, Meal and Sport display and edit their relevant types through a shared contract,
instead of maintaining competing authoritative copies.

[Full concrete design, in Russian](../proposals/shared-records-v1/DESIGN.ru.md)
includes the schema, stable IDs, provenance, revisions, deletion/recovery rules,
old-client protection, migration inventory, rollback and staged acceptance gates.

Recommended sequence:

1. Keep Auth as the sole source of display_name. Propose a common encrypted
   profile for shared settings, without creating an editable duplicate of the name.
2. First build a read-only measurement projection from the existing Sport journal.
   This is a transition step, not the final bidirectional model.
3. Propose a common encrypted authority with stable record IDs, explicit types,
   versioned payloads, revisions, tombstones and durable operation receipts.
   A single encrypted snapshot is only a candidate for the measured first wave;
   it is not an established capacity solution for all historical app data.
4. Before cutover, verify backend fencing or complete isolation of old writers.
   Never continuously reimport old full-journal snapshots after activation.
5. Inventory unsupported/duplicate/unowned data without dropping it. Real migration
   needs a separate reviewed preview, recoverable checkpoint and explicit go-ahead.

[Proposal files and reproduction](../proposals/shared-records-v1/README.md) contain
JSON Schema, invented migration/native-creation examples and 28 passing offline
checks. Those checks validate only the proposed structure and listed invariants.
They do not validate encryption, CAS, server fencing, live sync or migration.

Still required before all-three-app implementation: the complete exact Meal v12
source, schema-only review of actual backend constraints/grants, crypto compatibility,
size/contention measurements, and an isolated test environment. No credentials,
SQL, personal-data processing, deployment or new common runtime was introduced.
