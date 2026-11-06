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

async function fixture({ local, legacy = [], migrated = true, trash, server = null, storage = new Map() } = {}) {
  if (migrated) storage.set(marker, '1');
  if (local !== undefined) storage.set(prefix + 'owner-a', typeof local === 'string' ? local : JSON.stringify(local));
  if (trash !== undefined) storage.set(prefix + 'owner-a:trash', JSON.stringify(trash));
  const key = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const control = { server: copy(server), at: server ? 1 : null, writes: 0, beforeWrite: null, failRead: false, failWrite: false, failLocal: false };
  const run = code => vm.runInContext(code, ctx);
  const listeners = {};
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
    window: { addEventListener(name, fn) { listeners[name]=fn; } }, setInterval() {}, setTimeout() {}, clearTimeout() {},
    MF: [], journalTab: 'workouts', view: 'diary', esc: String,
  });
  vm.runInContext(model, ctx); vm.runInContext(adapter, ctx);
  const ui = await readFile(new URL('../sport/src/measurements-v2.js', import.meta.url), 'utf8');
  vm.runInContext(ui.slice(ui.indexOf('function removeMeasurement('), ui.indexOf("document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const action=")), ctx);
  Object.assign(ctx, { closeSheet() {}, goto() {}, toast() {}, dateLabel: String, comparisonDate: null });
  return { storage, control, ctx, run, listeners, sync: () => run('hmSync()'), current: () => JSON.parse(storage.get(prefix + 'owner-a')), status: () => run('hmStatus') };
}

const entry = (id, day = date) => ({ id, record: { date: day, values: { weight: 80 } } });
const readTrash = f => JSON.parse(f.storage.get(prefix + 'owner-a:trash') || '[]');
const ids = f => readTrash(f).map(e => e.id).sort();
async function pair(trash = [], records = []) {
 const a = await fixture({trash, local:documentOf(...records)});
 const b = await fixture({storage:a.storage});
 a.run('hmSelect()');b.run('hmSelect()');return {a,b};
}
await test('stale unrelated persist retains another tab recovery addition', async()=>{
 const {a,b}=await pair();a.ctx.state.measurementTrash.push(entry('a'));a.run('persist()');b.run('persist()');assert.deepEqual(ids(a),['a']);
});
await test('sequential stale additions retain both recovery entries', async()=>{
 const {a,b}=await pair();a.ctx.state.measurementTrash.push(entry('a'));a.run('persist()');b.ctx.state.measurementTrash.push(entry('b','2026-11-02'));b.run('persist()');assert.deepEqual(ids(a),['a','b']);
});
await test('stale unrelated persist cannot resurrect a restored recovery entry', async()=>{
 const {a,b}=await pair([entry('a')]);a.run('restoreMeasurement("a")');b.run('persist()');assert.deepEqual(ids(a),[]);assert.equal(a.current().records[0].values.weight,80);
});
await test('stale restore callback cannot resurrect after another tab restore then delete', async()=>{
 const {a,b}=await pair([entry('a')]);a.run('restoreMeasurement("a");removeMeasurement("2026-11-01")');b.run('restoreMeasurement("a")');assert.equal(a.current().records[0].deleted,true);assert.equal(readTrash(a).length,1);assert.notEqual(ids(a)[0],'a');
});
await test('stale restore cannot overwrite a newly occupied date', async()=>{
 const {a,b}=await pair([entry('a')]);a.run('state.measurements.push({date:"2026-11-01",values:{weight:90}});persist()');b.run('restoreMeasurement("a")');assert.equal(a.current().records[0].values.weight,90);assert.deepEqual(ids(a),['a']);
});
await test('stale delete uses latest record for recovery', async()=>{
 const {a,b}=await pair([], [live()]);a.run('state.measurements[0].values.weight=91;persist()');b.run('removeMeasurement("2026-11-01")');assert.equal(readTrash(a)[0].record.values.weight,91);assert.equal(a.current().records[0].deleted,true);
});
await test('trash storage event refreshes recovery state and baseline', async()=>{
 const {a,b}=await pair();a.ctx.state.measurementTrash.push(entry('a'));a.run('persist()');b.listeners.storage({key:prefix+'owner-a:trash'});assert.equal(b.run('state.measurementTrash[0].id'),'a');b.run('persist()');assert.deepEqual(ids(a),['a']);
});
await test('malformed recovery bytes fail closed before writes', async()=>{
 for(const raw of ['', '{', 'null','{}','[{}]',JSON.stringify([entry('a'),entry('a')])]){
  const f=await fixture({local:documentOf(live())});f.storage.set(prefix+'owner-a:trash',raw);const before=f.storage.get(prefix+'owner-a');assert.throws(()=>f.run('hmSelect()'),/удалённые|удалённых/);assert.equal(f.storage.get(prefix+'owner-a:trash'),raw);assert.equal(f.storage.get(prefix+'owner-a'),before);
 }
});
await test('malformed trash arriving after load is not replaced by persist', async()=>{
 const f=await fixture({local:documentOf(live()),trash:[]});f.run('hmSelect()');f.storage.set(prefix+'owner-a:trash','null');assert.throws(()=>f.run('persist()'),/формат/);assert.equal(f.storage.get(prefix+'owner-a:trash'),'null');
});
await test('failed restore document save retains recovery copy', async()=>{
 const f=await fixture({local:documentOf(),trash:[entry('a')]});f.run('hmSelect()');f.control.failKey=prefix+'owner-a';assert.throws(()=>f.run('restoreMeasurement("a")'),/local write failed/);assert.deepEqual(ids(f),['a']);assert.equal(f.current().records.length,0);
});
await test('failed delete document save keeps recovery and original', async()=>{
 const f=await fixture({local:documentOf(live()),trash:[]});f.run('hmSelect()');f.control.failKey=prefix+'owner-a';assert.throws(()=>f.run('removeMeasurement("2026-11-01")'),/local write failed/);assert.equal(readTrash(f).length,1);assert.equal(f.current().records[0].values.weight,80);
});
await test('malformed document cannot trigger a trash write', async()=>{
 const f=await fixture({local:documentOf(),trash:[]});f.run('hmSelect()');f.ctx.state.measurementTrash.push(entry('a'));f.storage.set(prefix+'owner-a','{');assert.throws(()=>f.run('persist()'));assert.deepEqual(ids(f),[]);
});
await test('failed recovery addition prevents document deletion', async()=>{
 const f=await fixture({local:documentOf(live()),trash:[]});f.run('hmSelect()');f.control.failKey=prefix+'owner-a:trash';assert.throws(()=>f.run('removeMeasurement("2026-11-01")'),/local write failed/);assert.equal(f.current().records[0].values.weight,80);
});
await test('failed recovery retirement retains saved restore and recovery copy', async()=>{
 const f=await fixture({local:documentOf(),trash:[entry('a')]});f.run('hmSelect()');f.control.failKey=prefix+'owner-a:trash';assert.throws(()=>f.run('restoreMeasurement("a")'),/local write failed/);assert.equal(f.current().records[0].values.weight,80);assert.deepEqual(ids(f),['a']);
});
await test('same recovery ID collision cannot overwrite either document', async()=>{
 const {a,b}=await pair();a.ctx.state.measurementTrash.push(entry('same'));a.run('persist()');b.ctx.state.measurementTrash.push(entry('same','2026-11-02'));assert.throws(()=>b.run('persist()'),/изменился/);assert.equal(readTrash(a)[0].record.date,date);
});
await test('old profile recovery event cannot contaminate selected account', async()=>{
 const f=await fixture({local:documentOf(),trash:[entry('a')]});f.run('hmSelect()');f.ctx.CL.s={uid:'owner-b'};f.run('hmSelect()');f.listeners.storage({key:prefix+'owner-a:trash'});assert.equal(f.run('state.measurementTrash.length'),0);assert.deepEqual(ids(f),['a']);
});
console.log(`RESULT ${passed}/16 recovery scenarios passed. Sequential VM tabs only; no localStorage atomicity claim.`);
