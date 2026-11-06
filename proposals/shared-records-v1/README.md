# Happy shared profile and records: offline design candidate

Start with [the Russian design](DESIGN.ru.md). This is a proposal grounded in exact
Day/Sport source and source-linked Meal measurement fixtures, not an application
release, implemented API, migration, database inspection, or full Meal audit.

Files:

- `common-envelope.schema.json`: structural proposal, JSON Schema 2020-12.
- `synthetic-envelope.json`: invented staged snapshot, not an import file.
- `synthetic-bootstrap.json`: empty new profile, migration=null and no legacy refs.
- `synthetic-native-create.json`: native record creation with truthful provenance.
- `synthetic-legacy-map.json`: identical legacy IDs in different collections stay separate.
- `synthetic-inventory.json`: invented loss-prevention inventory examples.
- `build_contract.py`: deterministic generator, local files only.
- `check_contract.py`: structural and selected invariant checks, local files only.
- `verification.json`: exact scope of checks and untested boundaries.

Run `python check_contract.py` in this directory with Python and `jsonschema`
already installed. No dependency installation, cryptographic key generation,
network request, personal-data read, or backend write is performed. The 28 passing
checks do NOT implement or validate production synchronization, CAS, encryption,
server fencing, device behavior, migration, or full Meal compatibility. Schema
validation alone does not authorize writes or verify semantic payload safety.

Proposed namespace `common/records` and command names in the design are not known
to exist. Backend constraints and current SDK/RLS/API documentation must be
reviewed before implementation. Full current Meal source is a blocking input for
any all-three-app bidirectional release. This directory contains no credentials,
private source copies, user records, deployment payloads, or SQL migrations.

Commands in this proposal are single-target. Every accepted operation has its own
global document revision and receipt; migration batches have stable child IDs.
Restore retains original provenance and records the action separately.
