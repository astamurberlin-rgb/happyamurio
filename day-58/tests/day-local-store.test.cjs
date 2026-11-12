'use strict';
/* Update 56: DayLocalStore — the IndexedDB facade with a synchronous cache for Day's journal-scale keys.
   A minimal in-memory IndexedDB stand-in (open/transaction/objectStore/get/put/delete/getAll/getAllKeys)
   exercises: which keys are owned, cache load, ordered writes and flush(), migration from localStorage with
   read-back verification and the format guard left for older releases, the IndexedDB-wins rule with archived
   copies, the blocked state, fallback to localStorage, routing of other keys, cross-tab refresh through
   BroadcastChannel and inside a lock, the headroom estimate, and the wiring in index.html / the journal adapter. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '../day-local-store.js'), 'utf8');
const page = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const adapter = fs.readFileSync(path.join(__dirname, '../day-journal-sync.js'), 'utf8');
const accountData = fs.readFileSync(path.join(__dirname, '../day-account-data.js'), 'utf8');
const tick = () => new Promise(r => setTimeout(r, 0));
const U = 'happy-user:7b1c-uid:';

function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {m, get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)};
}
function fakeIndexedDB(options = {}) {
  // One database with one object store; transactions complete on a macrotask like a real engine.
  const data = options.data || new Map(); const failPut = options.failPut || (() => false); let opens = 0;
  return {
    opens: () => opens, data,
    open(name) {
      opens++; const r = {result: null, error: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null};
      setTimeout(() => {
        if (options.failOpen) { r.error = Error('synthetic open failure'); r.onerror?.({target: r}); return; }
        const stores = new Set(options.existing ? ['values'] : []);
        const db = {objectStoreNames: {contains: n => stores.has(n)}, createObjectStore(n) { stores.add(n); }, close() {},
          transaction(storeName, mode) {
            assert.ok(stores.has(storeName), 'store exists'); const t = {error: null, oncomplete: null, onerror: null, onabort: null}; const ops = [];
            const store = {
              get: k => { const q = {result: undefined, error: null, onsuccess: null}; ops.push(() => { q.result = data.has(k) ? data.get(k) : undefined; q.onsuccess?.({target: q}); }); return q; },
              getAll: () => { const q = {result: []}; ops.push(() => { q.result = [...data.keys()].sort().map(k => data.get(k)); }); return q; },
              getAllKeys: () => { const q = {result: []}; ops.push(() => { q.result = [...data.keys()].sort(); }); return q; },
              put: (v, k) => { assert.equal(mode, 'readwrite'); const q = {result: k}; ops.push(() => { if (failPut(k, v)) throw Object.assign(Error('synthetic quota'), {name: 'QuotaExceededError'}); data.set(k, v); }); return q; },
              delete: k => { assert.equal(mode, 'readwrite'); const q = {}; ops.push(() => { data.delete(k); }); return q; }
            };
            setTimeout(() => { try { for (let i = 0; i < ops.length; i++) ops[i](); t.oncomplete?.({target: t}); } catch (e) { t.error = e; t.onabort?.({target: t}); } }, 0);
            return {objectStore: () => store, get error() { return t.error; }, set oncomplete(f) { t.oncomplete = f; }, set onerror(f) { t.onerror = f; }, set onabort(f) { t.onabort = f; }};
          }};
        r.result = db; if (!options.existing) r.onupgradeneeded?.({target: r}); r.onsuccess?.({target: r});
      }, 0);
      return r;
    }
  };
}
function channelClass() {
  const ends = [];
  return class BC { constructor(name) { this.name = name; this.onmessage = null; ends.push(this); } postMessage(m) { for (const e of ends) if (e !== this && e.name === this.name) setTimeout(() => e.onmessage?.({data: m}), 0); } };
}
function realm({storage, BroadcastChannel, navigator} = {}) {
  const c = vm.createContext({localStorage: storage || fakeStorage(), BroadcastChannel, navigator, setTimeout, clearTimeout, console, Promise, Map, Set, Error, String, Number, Object, Array, JSON, Date});
  c.globalThis = c; vm.runInContext(source, c); c.DayLocalStore = vm.runInContext('DayLocalStore', c); c.dayStorage = vm.runInContext('dayStorage', c); return c;
}
const journal = JSON.stringify({fmt: 49, days: {'2026-11-09': {cp: {wake: {energy: 5}}}}, metrics: []});

test('journal-scale keys are owned in every account scope; sign-in, settings, format number and links are not', () => {
  const c = realm(); const own = c.DayLocalStore.owned;
  for (const k of ['hd_db_v1', 'hd_db_prev_v1', 'hd_backup_v1', 'hd_journal_safety_v1', 'hd_test_journal_create_v1', 'hd_journal_auto_v1']) { assert.equal(own(k), true, k); assert.equal(own(U + k), true, U + k); }
  for (const k of ['hd_fmt_v1', U + 'hd_fmt_v1', 'happy-auth:day', 'hd_cloud_v1', 'hd_cfg_v1', 'hd_key_v1', 'hd_link_sport_v1', 'hd_link_meal_v1', 'hd_profile_source_v1', 'happy-profile-legacy-owner:day', 'happy-day.arc-style.v1', 'hd_journal_safety_v1:space-probe-v2', U + 'hd_journal_safety_v1:space-probe-v2', c.DayLocalStore.MARK, 'happy-food-counters']) assert.equal(own(k), false, k);
  assert.equal(c.DayLocalStore.baseName(U + 'hd_db_v1'), 'hd_db_v1'); assert.equal(c.DayLocalStore.baseName('happy-user:broken'), null);
});

test('without indexedDB the facade is plain localStorage and is not blocked when nothing has moved', async () => {
  const ls = fakeStorage({[U + 'hd_db_v1']: journal, 'happy-auth:day': '{"s":{"uid":"7b1c-uid"}}'}); const c = realm({storage: ls});
  assert.equal(await c.DayLocalStore.open({indexedDB: undefined, formatGuard: '56'}), 'localStorage');
  assert.equal(c.DayLocalStore.blocked, false); assert.equal(c.dayStorage.getItem(U + 'hd_db_v1'), journal);
  c.dayStorage.setItem(U + 'hd_journal_auto_v1', '{"x":1}'); assert.equal(ls.getItem(U + 'hd_journal_auto_v1'), '{"x":1}');
  assert.equal(c.DayLocalStore.diagnostics().backend, 'localStorage'); assert.equal(c.dayStorage.length, 3);
  await c.DayLocalStore.flush(); assert.equal(c.DayLocalStore.headroom(), null, 'no estimate without navigator.storage');
});

test('migration moves the diary of every scope to IndexedDB, verifies it, frees localStorage and leaves the format guard for older releases', async () => {
  const ls = fakeStorage({[U + 'hd_db_v1']: journal, [U + 'hd_journal_safety_v1']: '{"v":2}', [U + 'hd_test_journal_create_v1']: '{"v":2,"status":"confirmed"}', [U + 'hd_fmt_v1']: '49',
    hd_db_v1: '{"days":{},"metrics":[]}', hd_fmt_v1: '49', 'happy-auth:day': '{"s":{"uid":"7b1c-uid"}}', hd_cfg_v1: '{"weight":80}', hd_link_sport_v1: '{"days":{}}', 'happy-profile-legacy-owner:day': 'local', [U + 'hd_journal_safety_v1:space-probe-v2']: 'day-recovery-space-v2\nx'});
  const idb = fakeIndexedDB(); const c = realm({storage: ls});
  assert.equal(await c.DayLocalStore.open({indexedDB: idb, formatGuard: '56'}), 'indexedDB');
  assert.deepEqual([...idb.data.keys()].sort(), ['hd_db_v1', U + 'hd_db_v1', U + 'hd_journal_safety_v1', U + 'hd_test_journal_create_v1'].sort());
  for (const k of ['hd_db_v1', U + 'hd_db_v1', U + 'hd_journal_safety_v1', U + 'hd_test_journal_create_v1']) assert.equal(ls.getItem(k), null, k + ' left localStorage');
  assert.equal(ls.getItem(U + 'hd_fmt_v1'), '56', 'format guard for the account scope'); assert.equal(ls.getItem('hd_fmt_v1'), '56', 'format guard for the legacy scope');
  assert.equal(ls.getItem(c.DayLocalStore.MARK), '1');
  for (const [k, v] of [['happy-auth:day', '{"s":{"uid":"7b1c-uid"}}'], ['hd_cfg_v1', '{"weight":80}'], ['hd_link_sport_v1', '{"days":{}}'], ['happy-profile-legacy-owner:day', 'local'], [U + 'hd_journal_safety_v1:space-probe-v2', 'day-recovery-space-v2\nx']]) assert.equal(ls.getItem(k), v, k + ' untouched');
  assert.equal(c.dayStorage.getItem(U + 'hd_db_v1'), journal); assert.equal(c.dayStorage.getItem('hd_cfg_v1'), '{"weight":80}', 'other keys are read from localStorage');
  assert.equal(c.dayStorage.getItem(U + 'hd_fmt_v1'), '56', 'the format number is read from localStorage, where older releases also see it');
  const d = c.DayLocalStore.diagnostics(); assert.equal(d.backend, 'indexedDB'); assert.equal(JSON.stringify(d.migrated), '{"copied":4,"verified":true,"archived":0}'); assert.equal(d.keys, 4); assert.equal(d.blocked, false);
  const keys = []; for (let i = 0; i < c.dayStorage.length; i++) keys.push(c.dayStorage.key(i));
  assert.ok(keys.includes(U + 'hd_db_v1') && keys.includes('hd_cfg_v1') && keys.includes(U + 'hd_fmt_v1') && !keys.includes(U + 'hd_db_v1:x'), 'listing: IndexedDB keys plus the rest of localStorage');
  // A later open on the same device: nothing to move, the guard stays.
  const c2 = realm({storage: ls}); assert.equal(await c2.DayLocalStore.open({indexedDB: idb, formatGuard: '56'}), 'indexedDB');
  assert.equal(JSON.stringify(c2.DayLocalStore.diagnostics().migrated), '{"copied":0,"verified":true,"archived":0}'); assert.equal(ls.getItem(U + 'hd_fmt_v1'), '56'); assert.equal(c2.dayStorage.getItem(U + 'hd_db_v1'), journal);
});

test('without a formatGuard the migration leaves no format number behind', async () => {
  const ls = fakeStorage({[U + 'hd_db_v1']: journal}); const c = realm({storage: ls});
  await c.DayLocalStore.open({indexedDB: fakeIndexedDB()}); assert.equal(ls.getItem(U + 'hd_fmt_v1'), null); assert.equal(ls.getItem(U + 'hd_db_v1'), null);
});

test('a copy already in IndexedDB wins; a differing localStorage copy is archived, not discarded', async () => {
  const idb = fakeIndexedDB({existing: true, data: new Map([[U + 'hd_db_v1', journal]])});
  const ls = fakeStorage({[U + 'hd_db_v1']: '{"days":{"old":1}}', [U + 'hd_journal_auto_v1']: '{"a":1}'}); const c = realm({storage: ls});
  await c.DayLocalStore.open({indexedDB: idb, formatGuard: '56'});
  assert.equal(c.dayStorage.getItem(U + 'hd_db_v1'), journal); assert.equal(c.dayStorage.getItem(U + 'hd_journal_auto_v1'), '{"a":1}');
  const archived = [...idb.data.keys()].filter(k => k.startsWith(U + 'hd_db_v1:localstorage-copy:')); assert.equal(archived.length, 1); assert.equal(idb.data.get(archived[0]), '{"days":{"old":1}}');
  assert.equal(ls.getItem(U + 'hd_db_v1'), null); assert.equal(ls.getItem(U + 'hd_fmt_v1'), '56'); assert.equal(c.DayLocalStore.diagnostics().migrated.archived, 1);
  assert.equal(c.DayLocalStore.diagnostics().keys, 2, 'archived copies stay outside the app view');
});

test('writes are visible at once, committed in order, and flush() waits for them; other keys never enter IndexedDB', async () => {
  const idb = fakeIndexedDB({existing: true}); const c = realm({storage: fakeStorage()});
  await c.DayLocalStore.open({indexedDB: idb});
  c.dayStorage.setItem(U + 'hd_db_v1', 'a'); c.dayStorage.setItem(U + 'hd_db_v1', 'b'); c.dayStorage.setItem(U + 'hd_journal_auto_v1', 'L'); c.dayStorage.removeItem(U + 'hd_journal_auto_v1');
  assert.equal(c.dayStorage.getItem(U + 'hd_db_v1'), 'b', 'synchronous read-after-write'); assert.equal(c.DayLocalStore.diagnostics().pendingWrites, 4);
  await c.DayLocalStore.flush();
  assert.equal(idb.data.get(U + 'hd_db_v1'), 'b'); assert.equal(idb.data.has(U + 'hd_journal_auto_v1'), false); assert.equal(c.DayLocalStore.diagnostics().pendingWrites, 0);
  c.dayStorage.setItem('happy-auth:day', 'cell'); c.dayStorage.setItem(U + 'hd_fmt_v1', '56'); await c.DayLocalStore.flush();
  assert.equal(idb.data.has('happy-auth:day'), false); assert.equal(idb.data.has(U + 'hd_fmt_v1'), false, 'the format number stays in localStorage');
});

test('a failed IndexedDB write surfaces from flush() and the cache returns to what is really stored', async () => {
  const idb = fakeIndexedDB({existing: true, data: new Map([[U + 'hd_db_v1', 'stored']]), failPut: (k, v) => v === 'huge'}); const c = realm({storage: fakeStorage()});
  await c.DayLocalStore.open({indexedDB: idb});
  c.dayStorage.setItem(U + 'hd_db_v1', 'huge'); assert.equal(c.dayStorage.getItem(U + 'hd_db_v1'), 'huge');
  await assert.rejects(c.DayLocalStore.flush(), e => e.name === 'QuotaExceededError');
  await tick(); await tick(); assert.equal(c.dayStorage.getItem(U + 'hd_db_v1'), 'stored', 'self-healed from IndexedDB'); assert.equal(idb.data.get(U + 'hd_db_v1'), 'stored');
  await c.DayLocalStore.flush(); assert.equal(c.DayLocalStore.diagnostics().error, null, 'the error is reported once');
  c.dayStorage.setItem(U + 'hd_db_v1', 'fine'); await c.DayLocalStore.flush(); assert.equal(idb.data.get(U + 'hd_db_v1'), 'fine');
});

test('blocked: the diary already moved but IndexedDB cannot be opened — the facade says so instead of starting empty', async () => {
  const c1 = realm({storage: fakeStorage({'happy-day-store:indexeddb-v1': '1', 'hd_fmt_v1': '56'})});
  assert.equal(await c1.DayLocalStore.open({indexedDB: undefined}), 'localStorage'); assert.equal(c1.DayLocalStore.blocked, true); assert.match(c1.DayLocalStore.blockedReason, /IndexedDB/);
  const c2 = realm({storage: fakeStorage({'happy-day-store:indexeddb-v1': '1'})});
  assert.equal(await c2.DayLocalStore.open({indexedDB: fakeIndexedDB({failOpen: true})}), 'localStorage'); assert.equal(c2.DayLocalStore.blocked, true); assert.equal(c2.DayLocalStore.blockedReason, 'synthetic open failure');
  assert.equal(c2.DayLocalStore.diagnostics().blocked, true);
  // Not yet moved and IndexedDB failing: plain localStorage, nothing lost, not blocked.
  const ls = fakeStorage({[U + 'hd_db_v1']: journal}); const c3 = realm({storage: ls});
  assert.equal(await c3.DayLocalStore.open({indexedDB: fakeIndexedDB({failOpen: true}), formatGuard: '56'}), 'localStorage'); assert.equal(c3.DayLocalStore.blocked, false); assert.equal(ls.getItem(U + 'hd_db_v1'), journal); assert.equal(ls.getItem(U + 'hd_fmt_v1'), null);
});

test('another tab’s committed write reaches this tab through the channel; refresh() inside a lock reads IndexedDB directly', async () => {
  const BC = channelClass(); const idb = fakeIndexedDB({existing: true});
  const a = realm({storage: fakeStorage(), BroadcastChannel: BC}), b = realm({storage: fakeStorage(), BroadcastChannel: BC});
  await a.DayLocalStore.open({indexedDB: idb}); await b.DayLocalStore.open({indexedDB: idb});
  const seen = []; b.DayLocalStore.onChange(k => seen.push(k));
  a.dayStorage.setItem(U + 'hd_db_v1', 'from-a'); await a.DayLocalStore.flush(); await tick(); await tick(); await tick();
  assert.equal(b.dayStorage.getItem(U + 'hd_db_v1'), 'from-a'); assert.deepEqual(seen, [U + 'hd_db_v1']);
  // A write that reached IndexedDB without a channel message (the message is still in flight): refresh() sees it.
  idb.data.set(U + 'hd_journal_safety_v1', 'vault'); assert.equal(b.dayStorage.getItem(U + 'hd_journal_safety_v1'), null);
  await b.DayLocalStore.refresh([U + 'hd_journal_safety_v1', U + 'hd_fmt_v1', U + 'hd_db_v1']); assert.equal(b.dayStorage.getItem(U + 'hd_journal_safety_v1'), 'vault'); assert.deepEqual(seen, [U + 'hd_db_v1', U + 'hd_journal_safety_v1']);
});

test('headroom() uses the browser estimate when there is one', async () => {
  const c = realm({storage: fakeStorage(), navigator: {storage: {estimate: async () => ({quota: 10 * 1048576, usage: 4 * 1048576})}}});
  await c.DayLocalStore.open({indexedDB: fakeIndexedDB()}); assert.equal(c.DayLocalStore.headroom(), 6 * 1048576); assert.equal(c.DayLocalStore.diagnostics().estimate.quota, 10 * 1048576);
});

test('index.html and the journal adapter are wired to the facade', () => {
  assert.ok(page.indexOf('<script src="./day-local-store.js?v=57"></script>') < page.indexOf('<script id="happy-profile-storage">'), 'facade loads before the profile layer');
  assert.ok(page.includes('HappyProfiles.create("day",{storage:dayStorage})'));
  assert.match(page, /var FMT=56,/); assert.ok(page.includes("DayLocalStore.open({formatGuard:String(FMT)})"), 'the facade opens with the format guard as soon as FMT is defined'); assert.ok(page.includes("try{ await DayLocalStore.open() }catch(e){}\n  if(DayLocalStore.blocked){"), 'init awaits the facade before reading');
  assert.ok(page.includes('await DayLocalStore.open();\n  try{ return dayStorage.getItem(k) }'), 'rawBaseGet reads through the facade after open');
  assert.ok(page.includes("if(DayLocalStore.owned(k)){ try{ await DayLocalStore.flush() }"), 'rawBaseSet flushes journal-scale writes');
  assert.ok(page.includes("if(DayLocalStore.blocked){ RO=true;"), 'blocked storage makes the app read-only');
  assert.ok(!/localStorage\.(getItem|setItem|removeItem)\((physical\(\)|HappyProfile\.key\((BACKUP|TEST_CREATE_KEY|AUTO_KEY)\))/.test(adapter), 'journal keys are not read from localStorage directly');
  assert.ok(adapter.includes('await refreshStore([physical(),HappyProfile.key(BACKUP),HappyProfile.key(TEST_CREATE_KEY),HappyProfile.key(AUTO_KEY)])'), 'withLock re-reads the journal keys');
  assert.ok(adapter.includes('await refreshStore(k);clearProbe();'), 'writeLocal re-reads the journal before checkDisk');
  assert.equal((adapter.match(/await flushStore\(\)/g) || []).length >= 8, true, 'every lock that writes flushes before release');
  assert.ok(adapter.includes("if(storeBackend()==='indexedDB'){const free=root.DayLocalStore.headroom()"), 'the localStorage probe is skipped in IndexedDB');
  assert.ok(adapter.includes("root.DayLocalStore.onChange(k=>{if(k===physical())adoptExternal('channel')"), 'other tabs are heard through the facade and their journal is taken over');
  assert.ok(adapter.includes("if(store().getItem(k)!==diskObserved&&await reconcile())return;"), 'a save after another tab\u2019s save merges instead of refusing');
  assert.ok(adapter.includes("try{await reconcile();}catch(_){}return fn();"), 'every journal lock takes the other tab\u2019s journal over first');
  assert.ok(page.includes('.day-sync-bar>*{display:none!important}') && page.includes('day-sync-line') && !page.includes('secondary:HappyUI.lastText(CL.last)'), 'header without status and settings button; sync line under the account buttons; no «Связь обновлена»');
  assert.ok(adapter.includes('id="day-storage-state"'), 'storage line in the developer section');
  assert.ok(accountData.includes('journal=root.dayStorage||root.localStorage'));
});
