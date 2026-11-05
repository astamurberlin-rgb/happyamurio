// Synthetic-only food-counter regression checks against repository source.
// No browser, network, real account, real journal, or production transport.
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = await readFile(new URL('../shared/food-counters.js', import.meta.url), 'utf8');
const clone = x => JSON.parse(JSON.stringify(x));
const key = 'happy-food-counters-v1:synthetic-a';
const fixture = id => ({ id, cid: 'synthetic-counter', date: '2026-11-05', item: { fid: 'synthetic-food', q: 1, g: 10, u: 'g', t: '08:00' } });
function storage() {
  const map = new Map();
  return { map, failSnapshot: false, get length() { return map.size; }, key: i => [...map.keys()][i], getItem: k => map.get(k) ?? null,
    setItem(k, v) { if (this.failSnapshot && k === key) throw Error('Synthetic quota failure'); map.set(k, String(v)); }, removeItem: k => map.delete(k) };
}
function client(extra = {}) {
  const store = extra.storage || storage();
  const state = { owner: 'synthetic-a', online: true, server: null, gets: 0, puts: 0, applications: 0, status: '', ...extra.state };
  const context = vm.createContext({ crypto: webcrypto, Date, TextEncoder, TextDecoder, setTimeout: () => 1, clearTimeout() {}, setInterval() {} });
  vm.runInContext(source, context);
  const H = context.HappyFoodCounters;
  const api = H.create({ owner: state.owner, currentOwner: () => state.owner, storage: store, online: () => state.online,
    apply() { state.applications++; }, status(s) { state.status = s; },
    get: extra.get || (async () => { state.gets++; return clone(state.server); }),
    put: extra.put || (async (doc, expected, at) => { state.puts++; assert.equal(expected, state.server?.at ?? null); state.server = { at, doc: clone(doc) }; return true; }) });
  return { H, api, store, state, pending: () => [...store.map.keys()].filter(k => k.startsWith(key + ':pending:')).length };
}
const passed = [];
async function test(name, run) { await run(); passed.push(name); }

await test('offline writes survive restart and upload only after reconnection', async () => {
  const A = client({ state: { online: false } }); A.api.update('events', fixture('offline'));
  await A.api.sync(); assert.equal(A.state.gets, 0); assert.equal(A.state.puts, 0); assert.equal(A.pending(), 1);
  A.api.stop(); const B = client({ storage: A.store }); assert.equal(B.api.document().events[0].id, 'offline');
  await B.api.sync(); assert.equal(B.state.server.doc.events.length, 1); assert.equal(B.pending(), 0);
});

await test('read failure retains pending patches and does not claim synchronization', async () => {
  let fail = true; const A = client({ get: async () => { if (fail) throw Error('Synthetic network failure'); return null; } });
  A.api.update('events', fixture('failed-read')); await A.api.sync(); assert.equal(A.pending(), 1); assert.equal(A.state.puts, 0);
  assert.match(A.state.status, /Synthetic network failure/); fail = false; await A.api.sync(); assert.equal(A.pending(), 0);
});

await test('exhausted compare-and-swap retries retain local changes', async () => {
  let writes = 0; const A = client({ put: async () => { writes++; return false; } });
  A.api.update('events', fixture('conflict')); await A.api.sync(); assert.equal(writes, 4); assert.equal(A.pending(), 1);
  assert.equal(A.api.document().events[0].id, 'conflict'); assert.doesNotMatch(A.state.status, /^Счётчики синхронизированы$/);
});

await test('account changes during an in-flight read cannot apply or upload the response', async () => {
  let release; const A = client({ get: () => new Promise(resolve => { release = resolve; }) });
  A.api.update('events', fixture('before-switch')); const running = A.api.sync();
  const applications = A.state.applications; A.state.owner = 'synthetic-b';
  release({ at: 1, doc: A.H.patch(A.H.empty(), 'events', fixture('remote-only'), 'synthetic-server') });
  await running; assert.equal(A.state.applications, applications); assert.equal(A.state.puts, 0); assert.equal(A.pending(), 1);
  assert.throws(() => A.api.update('events', fixture('wrong-owner')), /Аккаунт изменился/);
  assert.equal(A.api.document().events.some(e => e.id === 'remote-only'), false);
});

await test('stopping during an in-flight read prevents response application', async () => {
  let release; const A = client({ get: () => new Promise(resolve => { release = resolve; }) });
  const running = A.api.sync(), applications = A.state.applications; A.api.stop(); release(null); await running;
  assert.equal(A.state.applications, applications); assert.equal(A.state.puts, 0);
});

await test('a pending patch survives a failed compact snapshot write', async () => {
  const A = client(); A.store.failSnapshot = true;
  assert.throws(() => A.api.update('events', fixture('crash-gap')), /Synthetic quota failure/); assert.equal(A.pending(), 1);
  A.api.stop(); A.store.failSnapshot = false; const B = client({ storage: A.store });
  assert.equal(B.api.document().events[0].id, 'crash-gap'); await B.api.sync(); assert.equal(B.pending(), 0);
});

await test('invalid remote format leaves local events and pending patches intact', async () => {
  const A = client({ get: async () => ({ at: 1, doc: { v: 999, definitions: [], events: [] } }) });
  A.api.update('events', fixture('local-safe')); await A.api.sync(); assert.equal(A.pending(), 1); assert.equal(A.state.puts, 0);
  assert.equal(A.api.document().events[0].id, 'local-safe'); assert.match(A.state.status, /Не удалось прочитать/);
});

console.log(JSON.stringify({ repositorySource: true, networkUsed: false, realAccountsUsed: false, passed: passed.length, tests: passed }, null, 2));
