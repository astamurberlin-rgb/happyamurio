/* Synthetic-only browser WebCrypto equivalence and transaction race checks.
 * Reads frozen reference files; never edits them or uses private source data.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash, webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const frozen = new URL('../../../strong-native-additive-20261104/', import.meta.url);
const expectedReferenceHash = '26a378cbeabd9bfb2347729cc1859815c0ab8103a11461aeb6ad2ff82fad96b3';
const referenceBytes = fs.readFileSync(new URL('native-planner.mjs', frozen));
assert.equal(createHash('sha256').update(referenceBytes).digest('hex'), expectedReferenceHash, 'Frozen planner changed');
const reference = await import(new URL('native-planner.mjs', frozen));
const referenceCapacity = await import(new URL('capacity-preview.mjs', frozen));
const {current, source, library, decisions} = await import(new URL('fixtures.mjs', frozen));
const clone = structuredClone, same = (a, b) => assert.equal(reference.digest(a), reference.digest(b));
const code = fs.readFileSync(new URL('../src/strong-native-core.js', import.meta.url), 'utf8');
assert.doesNotMatch(code, /(?:node:crypto|\brequire\s*\(|\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage)/);
const transfer = fs.readFileSync(new URL('../src/data-transfer.js', import.meta.url), 'utf8');
const validatorContext = vm.createContext({clone});
vm.runInContext(transfer.slice(transfer.indexOf('const sportDataFields='), transfer.indexOf('function sportBackupInfo')), validatorContext);
function validateData(data) {
  validatorContext.payload = {app: 'Happy Sport', version: 1, data};
  return vm.runInContext('sportValidateBackup(payload)', validatorContext);
}
let hashCount = 0, hashHook = null;
const context = vm.createContext({TextEncoder, Uint8Array, crypto: {subtle: {digest: async (...args) => {
  const value = await webcrypto.subtle.digest(...args);
  const count = ++hashCount;
  if (hashHook) hashHook(count);
  return value;
}}}});
vm.runInContext(code, context, {filename: 'strong-native-core.js'});
const core = context.StrongNativeCore;
let tests = 0;
async function test(name, operation) {
  hashHook = null; hashCount = 0;
  try { await operation(); tests++; console.log('PASS ' + name); }
  finally { hashHook = null; }
}
const bindings = decisions();
const expected = reference.planNativeImport(current, source, bindings, library, {validateData});
const plan = (c = current, s = source, d = bindings, l = library, options = {}) => core.planNativeImport(c, s, d, l, {validateData, ...options});
const preview = await plan();
const capacity = await core.capacityPreview({current, candidate: preview.candidate, uid: current.sportOwner});
await test('browser SHA-256 and occurrence keys exactly match frozen Node reference', async () => {
  for (const value of [null, {}, [0, -0, false, null], {z: 'Ё 🏋️ café', a: {two: 2, one: 1}}]) assert.equal(await core.digest(value), reference.digest(value));
  for (const workout of source.workouts) for (let index = 0; index < workout.exercises.length; index++) assert.equal(await core.occurrenceKey(workout, index), reference.occurrenceKey(workout, index));
});
await test('entire frozen 32/107/391 preview, hashes and all current state match exactly', async () => {
  same(preview, expected);
  same(preview.counts, {sourceWorkouts: 32, groups: 107, sets: 391, add: 32, skip: 0, newDefinitions: 0});
  for (const field of Object.keys(current)) if (!['workouts', 'customExercises'].includes(field)) same(preview.candidate[field], current[field]);
  same(preview.candidate.workouts[0], current.workouts[0]);
  same(validateData(preview.candidate).workouts, preview.candidate.workouts);
  assert.equal(preview.candidate.workouts[1].duration, 244320);
  assert.equal(preview.candidate.workouts[1].exercises[0].sets[0].weight, 90);
  assert.equal(preview.candidate.workouts[1].strongImport.rawArchiveIncluded, false);
  assert.equal(preview.candidate.rawMeasurements, undefined);
  assert.equal(preview.candidate.strongHistory, undefined);
});
await test('all planner arguments snapshot before first hash await', async () => {
  const c = clone(current), s = clone(source), d = clone(bindings), l = clone(library), defs = [];
  hashHook = count => { if (count === 1) {
    c.schedules[0].time = '20:00'; s.workouts[0].exercises[0].sets[0].weight = 999;
    d[Object.keys(d)[0]].targetHash = 'bad'; l[0].name = 'Changed after await';
    defs.push({id: 'too-late'});
  }};
  same(await plan(c, s, d, l, {newDefinitions: defs}), expected);
});
await test('pure planner does not mutate any caller inputs, including deep-frozen objects', async () => {
  const deepFreeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };
  const args = [clone(current), clone(source), clone(bindings), clone(library)];
  args.forEach(deepFreeze); same(await plan(...args), expected);
});
await test('same ID identical content skips; changed same ID refuses without overwrite', async () => {
  const again = await plan(preview.candidate); same(again, reference.planNativeImport(preview.candidate, source, bindings, library, {validateData}));
  assert.equal(again.counts.skip, 32); same(again.candidate, preview.candidate);
  const c = clone(preview.candidate); c.workouts[1].notes += ' edited';
  const blocked = await plan(c); assert.equal(blocked.candidate, null); assert.ok(blocked.conflicts.length);
});
await test('deleted imported IDs require a new explicit preview, no tombstone inference', async () => {
  const c = clone(preview.candidate); c.workouts.splice(1, 1);
  const p = await plan(c); assert.equal(p.counts.add, 1); assert.equal(p.counts.skip, 31);
  await assert.rejects(core.applyNativePreview(c, p, library), /Explicit/);
});
await test('unresolved occurrence and stale mapping block candidate; repeated groups stay separate', async () => {
  const d = clone(bindings), key = reference.occurrenceKey(source.workouts[0], 0);
  delete d[key]; const missing = await plan(current, source, d); assert.equal(missing.candidate, null); assert.equal(missing.unresolved.length, 1);
  d[key] = {...bindings[key], targetHash: 'bad'}; const stale = await plan(current, source, d); assert.equal(stale.candidate, null); assert.ok(stale.conflicts.length);
  d[key] = {...bindings[key], targetId: library[1].id, targetHash: reference.digest(library[1]), loadBasis: 'per_hand', semanticLabel: 'Reviewed simultaneous variant'};
  const p = await plan(current, source, d); same(p, reference.planNativeImport(current, source, d, library, {validateData}));
  const first = p.candidate.workouts[1].exercises;
  assert.notEqual(first[0].id, first[2].id); assert.match(first[0].notes, /Вес каждой гантели/); assert.equal(first[0].sets[0].weight, 90);
});
await test('new definitions stay additive; ID collision and unused definitions refuse', async () => {
  const definition = {id: 'synthetic-new', name: 'Synthetic variant', aliases: [], equipment: [], profile: 'load_reps', metrics: ['reps', 'weight'], scope: 'user'};
  const d = clone(bindings), key = reference.occurrenceKey(source.workouts[0], 0);
  d[key] = {...d[key], targetId: definition.id, targetHash: reference.digest(definition)};
  const p = await plan(current, source, d, library, {newDefinitions: [definition]});
  same(p, reference.planNativeImport(current, source, d, library, {validateData, newDefinitions: [definition]}));
  await assert.rejects(plan(current, source, bindings, library, {newDefinitions: [definition]}), /unused/);
  const collision = await plan(current, source, bindings, library, {newDefinitions: [{...definition, id: library[0].id}]});
  assert.equal(collision.candidate, null); assert.ok(collision.conflicts.some(item => item.reason === 'Definition ID collision'));
});
await test('zero-only placeholders require explicit reviewed metric basis', async () => {
  assert.throws(() => core.sourceMetrics({sets: [{weight: 0, reps: 0}]}), /Metric basis unresolved/);
  same(core.sourceMetrics({metrics: ['weight', 'reps'], sets: [{weight: 0, reps: 0}]}), ['reps', 'weight']);
  const workout = clone(source.workouts[0]); workout.exercises = [{...workout.exercises[0], sets: [{weight: 0, reps: 0, distance: 0, seconds: 0, done: true}]}];
  const d = {[reference.occurrenceKey(workout, 0)]: {status: 'confirmed', sourceWorkoutHash: reference.digest(workout), targetId: library[0].id, targetHash: reference.digest(library[0]), evidence: 'Synthetic zero basis review'}};
  const s = {fileSHA256: 'a'.repeat(64), workouts: [workout]}, p = await plan(current, s, d);
  same(p, reference.planNativeImport(current, s, d, library, {validateData})); assert.equal(p.candidate, null); assert.match(p.unresolved[0].reason, /Metric basis unresolved/);
});
await test('actual validator required; unsafe JSON, duplicate source IDs and remapped export refuse', async () => {
  await assert.rejects(core.planNativeImport(current, source, bindings, library), /validator/);
  const s = clone(source); s.workouts.push(clone(s.workouts[0])); await assert.rejects(plan(current, s), /Duplicate source ID/);
  const remapped = {fileSHA256: source.fileSHA256, workouts: preview.candidate.workouts.slice(1)}; await assert.rejects(plan(current, remapped), /original normalized source/);
  await assert.rejects(core.digest(JSON.parse('{"__proto__": {"polluted": true}}')), /Unsafe JSON/);
  await assert.rejects(core.digest({a: Infinity}), /Unsafe JSON/);
  await assert.rejects(core.digest({a: undefined}), /Unsafe JSON/);
});
await test('explicit current preview confirmation and tamper checks', async () => {
  for (const options of [{}, {confirmed: true}, {confirmed: true, previewHash: 'stale'}]) await assert.rejects(core.applyNativePreview(current, preview, library, options), /Explicit/);
  same(await core.applyNativePreview(current, preview, library, {confirmed: true, previewHash: preview.previewHash}), preview.candidate);
  for (const field of ['candidate', 'metadata']) {
    const p = clone(preview); if (field === 'candidate') p.candidate.workouts[1].title = 'tampered'; else p.counts.add = 0;
    await assert.rejects(core.applyNativePreview(current, p, library, {confirmed: true, previewHash: p.previewHash}), /changed/);
  }
});
await test('pure apply captures input bytes before await', async () => {
  const c = clone(current), p = clone(preview), l = clone(library);
  hashHook = count => { if (count === 1) { c.workouts[0].title = 'late'; p.candidate.workouts.length = 0; l[0].name = 'late'; } };
  same(await core.applyNativePreview(c, p, l, {confirmed: true, previewHash: p.previewHash}), preview.candidate);
});
await test('steady-state capacity matches frozen reference including large Unicode and ledger', async () => {
  for (const extra of [0, 10000, 20000, 30000, 100000]) {
    const c = clone(current); if (extra) c.workouts[0].notes = 'Ж'.repeat(extra);
    const p = await plan(c), args = {current: c, candidate: p.candidate, uid: current.sportOwner};
    same(await core.capacityPreview(args), referenceCapacity.capacityPreview(args));
    if (extra >= 30000) assert.equal((await core.capacityPreview(args)).allowed, false);
  }
  const ledger = {v: 3, uid: current.sportOwner, baseline: null, pending: null, held: null, history: [{localBackup: current, beforeRow: null, kind: 'restore'}], legacy: null};
  const args = {current, candidate: preview.candidate, uid: current.sportOwner, ledger, otherStorageBytes: 123456};
  same(await core.capacityPreview(args), referenceCapacity.capacityPreview(args));
});
await test('capacity snapshots before await; protected pending/held/legacy and full storage refuse', async () => {
  const args = {current: clone(current), candidate: clone(preview.candidate), uid: current.sportOwner};
  hashHook = count => { if (count === 1) { args.current.workouts.length = 0; args.candidate.workouts.length = 0; } };
  same(await core.capacityPreview(args), capacity); hashHook = null;
  for (const kind of ['pending', 'held', 'legacy']) {
    const ledger = {v: 3, uid: current.sportOwner, history: [], [kind]: {protected: true}};
    assert.equal((await core.capacityPreview({current, candidate: preview.candidate, uid: current.sportOwner, ledger})).allowed, false);
  }
  assert.equal((await core.capacityPreview({current, candidate: preview.candidate, uid: current.sportOwner, otherStorageBytes: 4 * 1024 * 1024})).allowed, false);
  await assert.rejects(core.capacityPreview({current, candidate: preview.candidate, uid: current.sportOwner, otherStorageBytes: -1}));
});
function fixture() {
  let state = clone(current), saved = null, writes = 0, epoch = 0, lock = true, phase = null, others = 0, ledger = null, lib = clone(library);
  const adapter = {
    owner: current.sportOwner,
    assertContext() { if (epoch || !lock) throw Error('Context changed'); },
    assertContextAfterCommit() { if (epoch || !lock) throw Error('Context changed'); },
    readState: () => state, readLibrary: () => lib,
    readCapacityContext: () => ({ledger, otherStorageBytes: others}),
    async reserve() { if (phase === 'reserve-quota') throw Error('quota'); if (phase === 'reserve-switch') epoch++; if (phase === 'reserve-edit') state.workouts[0].title = 'changed'; },
    async writeBackup(value) {
      if (phase === 'backup-quota') throw Error('quota');
      if (saved && reference.digest(saved) !== reference.digest(value)) throw Error('Protected backup occupied');
      saved = clone(value); if (phase === 'backup-switch') epoch++; if (phase === 'backup-storage-change') others++;
    },
    async readBackup() { if (phase === 'backup-read-switch') epoch++; return phase === 'bad-backup' ? {...saved, digest: 'bad'} : clone(saved); },
    writeState(next) { writes++; if (phase === 'state-quota') throw Error('quota'); state = clone(next); if (phase === 'crash-after-commit') throw Error('interrupted'); if (phase === 'state-switch') epoch++; },
    get state() { return state; }, get saved() { return saved; }, get writes() { return writes; },
    set phase(value) { phase = value; }, set lock(value) { lock = value; },
    mutateState() { state.workouts[0].title += ' changed'; }, changeLibrary() { lib = [...lib, {...lib[0], id: 'new-id'}]; },
    changeStorage() { others++; }, switchAccount() { epoch++; }, setLedger(value) { ledger = value; }
  };
  return adapter;
}
const request = () => ({preview, library, confirmed: true, confirmedPreviewHash: preview.previewHash, capacity});
let successfulHashCount = 0;
await test('verified full local backup and exact atomic candidate, no cloud success claim', async () => {
  const adapter = fixture(), result = await core.commitNativeImport(adapter, request()); successfulHashCount = hashCount;
  assert.equal(result.status, 'local-verified'); assert.equal(result.cloud, 'not-confirmed'); assert.equal(adapter.writes, 1);
  same(adapter.state, preview.candidate); same(adapter.saved.state, current); assert.equal(adapter.saved.candidateHash, preview.candidateHash);
});
await test('context/quota/backup/readback faults fail safely without a profile write', async () => {
  for (const phase of ['reserve-quota', 'reserve-switch', 'reserve-edit', 'backup-quota', 'backup-switch', 'backup-storage-change', 'backup-read-switch', 'bad-backup']) {
    const adapter = fixture(); adapter.phase = phase;
    await assert.rejects(core.commitNativeImport(adapter, request())); assert.equal(adapter.writes, 0, phase);
  }
});
await test('write failures are explicit uncertain outcomes with preserved recovery hashes', async () => {
  for (const phase of ['state-quota', 'crash-after-commit', 'state-switch']) {
    const adapter = fixture(); adapter.phase = phase;
    await assert.rejects(core.commitNativeImport(adapter, request()), error => error.code === 'STRONG_IMPORT_OUTCOME_UNCERTAIN' && error.candidateHash === preview.candidateHash && error.currentHash === reference.digest(current));
    assert.equal(adapter.writes, 1); same(adapter.saved.state, current);
  }
});
await test('explicit confirmedPreviewHash, live capacity receipt and backup collision required', async () => {
  for (const patch of [{confirmed: false}, {confirmedPreviewHash: undefined}, {confirmedPreviewHash: 'stale'}, {capacity: {...capacity, allowed: false}}, {capacity: {...capacity, peakBytes: 1}}]) {
    const adapter = fixture(); await assert.rejects(core.commitNativeImport(adapter, {...request(), ...patch})); assert.equal(adapter.writes, 0);
  }
  const locked = fixture(); locked.lock = false; await assert.rejects(core.commitNativeImport(locked, request())); assert.equal(locked.writes, 0);
  const occupied = fixture(); await occupied.writeBackup({protected: 'Existing different backup'}); const before = clone(occupied.saved);
  await assert.rejects(core.commitNativeImport(occupied, request()), /Protected backup occupied/); assert.equal(occupied.writes, 0); same(occupied.saved, before);
  const altered = fixture(); altered.changeStorage(); await assert.rejects(core.commitNativeImport(altered, request()), /Capacity/); assert.equal(altered.writes, 0);
});
await test('mutating actual state at every transaction hash await refuses before write or reports uncertain after write', async () => {
  assert.ok(successfulHashCount > 10);
  for (let target = 1; target <= successfulHashCount; target++) {
    const adapter = fixture(); hashCount = 0;
    hashHook = count => { if (count === target) adapter.mutateState(); };
    await assert.rejects(core.commitNativeImport(adapter, request()), error => adapter.writes === 0 || error.code === 'STRONG_IMPORT_OUTCOME_UNCERTAIN');
    assert.ok(adapter.writes <= 1); if (adapter.writes) same(adapter.saved.state, current);
  }
});
await test('library replacement, ownership and storage changes during hash awaits never commit', async () => {
  for (const mutate of ['changeLibrary', 'switchAccount', 'changeStorage']) {
    const adapter = fixture(); hashCount = 0; hashHook = count => { if (count === 1) adapter[mutate](); };
    await assert.rejects(core.commitNativeImport(adapter, request())); assert.equal(adapter.writes, 0, mutate);
  }
});
await test('final atomic adapter call is synchronous; known async write API refuses before invocation', async () => {
  const adapter = fixture(); let called = false; adapter.writeState = async () => { called = true; };
  await assert.rejects(core.commitNativeImport(adapter, request()), /Synchronous writeState/); assert.equal(called, false); assert.equal(adapter.saved, null);
  const unknown = fixture(); unknown.writeState = () => Promise.resolve();
  await assert.rejects(core.commitNativeImport(unknown, request()), error => error.code === 'STRONG_IMPORT_OUTCOME_UNCERTAIN' && /Synchronous/.test(error.cause.message));
});
assert.equal(createHash('sha256').update(fs.readFileSync(new URL('native-planner.mjs', frozen))).digest('hex'), expectedReferenceHash);
console.log(JSON.stringify({tests, transactionHashAwaitRaceCases: successfulHashCount, syntheticOnly: true, actualCandidateValidator: true, frozenReferenceUnchanged: true, noNetwork: true, core: fileURLToPath(new URL('../src/strong-native-core.js', import.meta.url))}));
