// Exercises the real adapter with fictional data, AES-GCM and an in-memory REST substitute.
// No network, browser account, real storage, tokens, or personal measurements are used.
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const model = await readFile(new URL('../shared/measurements-model.js', import.meta.url), 'utf8');
const adapter = await readFile(new URL('../sport/src/measurements-shared.js', import.meta.url), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const date = '2026-11-01';
const prefix = 'happy-measurements-v1:';
const marker = 'happy-measurements-migrated-v1';
const live = (day = date, rev = 10, weight = 80) => ({ date: day, rev, values: { weight } });
const documentOf = (...records) => ({ v: 1, records });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }

async function fixture({ local, legacy = [], migrated = true, trash, server = null } = {}) {
  const storage = new Map();
  if (migrated) storage.set(marker, '1');
  if (local !== undefined) storage.set(prefix + 'owner-a', typeof local === 'string' ? local : JSON.stringify(local));
  if (trash !== undefined) storage.set(prefix + 'owner-a:trash', JSON.stringify(trash));
  const key = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const control = { server: copy(server), at: server ? 1 : null, writes: 0, beforeWrite: null, failRead: false, failWrite: false, failLocal: false };
  const run = code => vm.runInContext(code, ctx);
  const ctx = vm.createContext({
    console, TextEncoder, URLSearchParams, crypto: webcrypto,
    location: { search: '', origin: 'https://test.invalid' },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem(k, v) { if (control.failLocal || control.failKey === k) throw Error('local write failed'); storage.set(k, v); } },
    state: { measurements: copy(legacy), measurementTrash: [], sportOwner: 'owner-a' },
    CL: { ready: true, s: { uid: 'owner-a' }, ck: key }, CL_KEY: 'session',
    oldPersist() {}, persist() {}, renderMeasurements: () => '', render() {}, sportAuthDo: async () => {},
    clLoad: () => new Promise(() => {}), clOn: () => !!ctx.CL.s && !!ctx.CL.ck,
    clUtf: s => new TextEncoder().encode(s), clB64: bytes => Buffer.from(bytes).toString('base64'),
    async clAt() { if (control.failRead) throw Error('read failed'); return control.at; },
    async clGet() { if (control.failRead) throw Error('read failed'); return copy(control.server); },
    async clRest(method, path, row) {
      if (control.beforeWrite) { const callback = control.beforeWrite; control.beforeWrite = null; await callback(); }
      if (control.failWrite) throw Error('write failed');
      if (method === 'POST' && control.server) return [];
      if (method === 'PATCH' && !path.endsWith('at=eq.' + control.at)) return [];
      const bytes = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(row.iv, 'base64'), additionalData: new TextEncoder().encode(row.user_id + '|sport|measurements') }, key, Buffer.from(row.data, 'base64'));
      control.server = JSON.parse(new TextDecoder().decode(bytes));
      control.at = row.at;
      control.writes++;
      return [row];
    },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null },
    window: { addEventListener() {} }, setInterval() {}, setTimeout() {}, clearTimeout() {},
    MF: [], journalTab: 'workouts', view: 'diary', esc: String,
  });
  vm.runInContext(model, ctx); vm.runInContext(adapter, ctx);
  return { storage, control, ctx, run, sync: () => run('hmSync()'), current: () => JSON.parse(storage.get(prefix + 'owner-a')), status: () => run('hmStatus') };
}

await test('malformed local documents fail closed and preserve exact bytes', async () => {
  for (const local of ['{', 'null', '', '{"v":1}', '{"v":1,"records":{}}', '{"v":2,"records":[]}', JSON.stringify(documentOf(live(date, 10, null)))]) {
    const f = await fixture({ local }); await f.sync();
    assert.equal(f.storage.get(prefix + 'owner-a'), local);
    assert.equal(f.control.writes, 0);
    assert.match(f.status(), /формат|прочитать/);
  }
});

await test('valid empty document remains usable', async () => {
  const f = await fixture({ local: documentOf() }); await f.sync();
  assert.equal(f.control.server.records.length, 0);
  assert.match(f.status(), /^Все замеры синхронизированы$/);
});

await test('migration never resurrects a shared tombstone', async () => {
  const tombstone = { date, rev: 999, deleted: true };
  const f = await fixture({ migrated: false, legacy: [live()], local: documentOf(tombstone) });
  f.run('hmSelect()'); assert.deepEqual(f.current(), documentOf(tombstone));
  assert.equal(f.run('state.measurements.length'), 0);
});

await test('migration preserves current values and imports only missing dates', async () => {
  const original = live(date, 999, 81), missing = live('2026-11-02', 1, 82);
  const f = await fixture({ migrated: false, legacy: [live(), missing], local: documentOf(original) });
  f.run('hmSelect()');
  assert.deepEqual(f.current().records[0], original);
  assert.equal(f.current().records[1].values.weight, 82);
  assert.equal(f.storage.get(marker), '1');
  const first = f.storage.get(prefix + 'owner-a');
  f.run('hmOwner=null;hmSelect()');
  assert.equal(f.storage.get(prefix + 'owner-a'), first);
});

await test('migration preserves existing recovery trash', async () => {
  const trash = [{ id: 'fictional-deleted-entry', date }];
  const f = await fixture({ migrated: false, local: documentOf(), trash });
  f.run('hmSelect()'); assert.deepEqual(JSON.parse(f.storage.get(prefix + 'owner-a:trash')), trash);
});

await test('edit during upload reaches server before synchronized status', async () => {
  const f = await fixture({ local: documentOf(live()) });
  const started = deferred(), release = deferred();
  f.control.beforeWrite = async () => { started.resolve(); await release.promise; };
  const pending = f.sync(); await started.promise;
  f.run('state.measurements[0].values.weight=81;persist()');
  assert.doesNotMatch(f.status(), /^Все замеры синхронизированы$/);
  release.resolve(); await pending;
  assert.equal(f.control.writes, 2);
  assert.equal(f.control.server.records[0].values.weight, 81);
  assert.deepEqual(f.current().records, f.control.server.records);
  assert.match(f.status(), /^Все замеры синхронизированы$/);
});

await test('a newer date during upload is not dropped', async () => {
  const f = await fixture({ local: documentOf(live()) });
  f.control.beforeWrite = async () => f.run('state.measurements.push({date:"2026-11-02",values:{weight:82}});persist()');
  await f.sync(); assert.equal(f.control.server.records.length, 2); assert.equal(f.control.writes, 2);
});

await test('read error cannot replace the server or local data', async () => {
  const f = await fixture({ local: documentOf(live()) }); f.control.failRead = true;
  await f.sync(); assert.equal(f.control.writes, 0); assert.equal(f.current().records[0].values.weight, 80);
  assert.doesNotMatch(f.status(), /^Все замеры синхронизированы$/);
});

await test('write error keeps the local update for retry', async () => {
  const f = await fixture({ local: documentOf(live()) }); f.control.failWrite = true;
  await f.sync(); assert.equal(f.control.writes, 0); assert.equal(f.current().records.length, 1);
  f.control.failWrite = false; await f.sync(); assert.equal(f.control.server.records.length, 1);
});

await test('malformed remote document is never overwritten', async () => {
  const server = documentOf(live(date, 10, null));
  const f = await fixture({ local: documentOf(live()), server }); await f.sync();
  assert.deepEqual(f.control.server, server); assert.equal(f.control.writes, 0);
});

await test('already synchronized client does not create extra revisions', async () => {
  const f = await fixture({ local: documentOf(live()) }); await f.sync();
  await f.sync(); await f.sync(); assert.equal(f.control.writes, 1);
});

await test('local write failure does not claim synchronization', async () => {
  const f = await fixture({ local: documentOf(live()) }); f.control.failLocal = true;
  await f.sync(); assert.equal(f.control.writes, 0); assert.match(f.status(), /local write failed/);
});

await test('interrupted migration retries without changing already imported values', async () => {
  const f = await fixture({ migrated: false, legacy: [live()], local: documentOf() });
  f.control.failKey = marker;
  assert.throws(() => f.run('hmSelect()'), /local write failed/);
  const imported = f.storage.get(prefix + 'owner-a');
  assert.equal(f.current().records.length, 1);
  assert.equal(f.storage.has(marker), false);
  f.control.failKey = null; f.run('hmSelect()');
  assert.equal(f.storage.get(prefix + 'owner-a'), imported);
  assert.equal(f.storage.get(marker), '1');
});

await test('continuous edits exhaust bounded attempts without false success', async () => {
  const f = await fixture({ local: documentOf(live()) });
  const edit = async () => { f.run('state.measurements[0].values.weight++;persist()'); f.control.beforeWrite = edit; };
  f.control.beforeWrite = edit; await f.sync();
  assert.equal(f.control.writes, 4);
  assert.equal(f.current().records[0].values.weight, 84);
  assert.equal(f.control.server.records[0].values.weight, 83);
  assert.doesNotMatch(f.status(), /^Все замеры синхронизированы$/);
  f.control.beforeWrite = null; await f.sync();
  assert.equal(f.control.server.records[0].values.weight, 84);
  assert.match(f.status(), /^Все замеры синхронизированы$/);
});

await test('account switch during sent upload cannot populate the new profile', async () => {
  const f = await fixture({ local: documentOf(live()) });
  const started = deferred(), release = deferred();
  f.control.beforeWrite = async () => { started.resolve(); await release.promise; };
  const pending = f.sync(); await started.promise;
  f.ctx.CL.s = { uid: 'owner-b' }; f.run('hmSelect()');
  release.resolve(); await pending;
  assert.equal(f.run('hmOwner'), 'owner-b');
  assert.equal(f.run('state.measurements.length'), 0);
  assert.equal(JSON.parse(f.storage.get(prefix + 'owner-b')).records.length, 0);
  assert.equal(f.current().records[0].values.weight, 80);
  assert.equal(f.control.server.records[0].values.weight, 80);
  assert.doesNotMatch(f.status(), /^Все замеры синхронизированы$/);
});

console.log(`RESULT ${passed}/15 adapter regressions passed. Network and real accounts: none.`);
