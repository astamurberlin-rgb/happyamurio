'use strict';
/* Update 55: the sign-in identity is account + key + login generation. A token refresh in another tab
   (new access/refresh tokens in the stored cell) is adopted, never reported as «вход изменился»;
   a real change of account, key or generation still stops every operation. Token refresh is single-flight
   in the tab and serialized across tabs. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const {webcrypto} = require('node:crypto');

const page = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = page.indexOf("var CL_KEY='happy-auth:day'");
const end = page.indexOf('async function clRest(', start);
assert.ok(start >= 0 && end > start, 'auth block present');
const ctxStart = page.indexOf('function clMealReadContext(){', end);
const ctxEnd = page.indexOf('\nasync function clMealReadReady(', ctxStart);
assert.ok(ctxStart > 0 && ctxEnd > ctxStart, 'meal read context present');
const code = page.slice(start, end) + '\n' + page.slice(ctxStart, ctxEnd);
assert.ok(/function clAdoptStored\(/.test(code) && /clRefreshing/.test(code) && /happy-auth-refresh:day/.test(code), 'Update 55 identity code present');
assert.ok(!/\{uid:a\.s\.uid,at:a\.s\.at/.test(code), 'fence must not include tokens');

function storage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k),
    key: i => [...m.keys()][i], get length() { return m.size; }
  };
}
function locks() {
  // Minimal Web Locks: exclusive, FIFO per name.
  const queues = new Map(); const log = [];
  return {log, request(name, options, fn) {
    if (typeof options === 'function') { fn = options; options = {}; }
    const prev = queues.get(name) || Promise.resolve();
    const run = prev.then(async () => { log.push('lock ' + name); try { return await fn(); } finally { log.push('unlock ' + name); } });
    queues.set(name, run.catch(() => {}));
    return run;
  }};
}
function fixture(opts = {}) {
  const ls = storage();
  const cell = {s: {uid: 'u1', at: 'tok-1', rt: 'ref-1', exp: Date.now() + 3600e3, email: 'a@b.c', name: ''}, k: 'key-1', last: 5, g: 'gen-1'};
  ls.setItem('happy-auth:day', JSON.stringify(cell));
  const calls = [];
  const realm = {
    console, setTimeout, clearTimeout, Promise, JSON, Date, Error, Math, String, Number, Array, Object, TextEncoder, TextDecoder, btoa, atob,
    crypto: webcrypto, localStorage: ls, navigator: opts.locks === false ? {} : {locks: locks()},
    rawGet: async k => ls.getItem(k), rawSet: async (k, v) => { ls.setItem(k, v); },
    HappyAuthReadOnly: {phase: 'existing-account-read-only', assertAllowed() {}},
    CLOUD: {url: 'https://test.invalid', key: 'anon'},
    K: {db: 'db', cfg: 'cfg'}, DB: {}, CFG: {},
    fetch: async () => { throw Error('no network in test'); },
    DaySportLifecycle: {beginAuth: () => () => {}, snapshot: () => ({failed: false, pending: 0, generation: 1})},
    DayJournal: {authChanged() { calls.push('authChanged'); }, invalidate() {}},
    toastLong() {}, toast() {}
  };
  realm.globalThis = realm; realm.window = realm;
  vm.createContext(realm);
  vm.runInContext(code, realm);
  const CL = realm.CL;
  CL.s = JSON.parse(JSON.stringify(cell.s)); CL.kraw = cell.k; CL.ck = {key: 1}; CL.authGeneration = cell.g; CL.last = cell.last; CL.authFence = realm.clAuthFence(JSON.stringify(cell));
  realm.HappyProfile = {owner: 'u1', matches: uid => uid === (CL.s && CL.s.uid), changed(v) { calls.push('profile ' + v); }};
  realm.clAuth = async (pathName, body) => { calls.push('clAuth ' + pathName + ' ' + body.refresh_token); return opts.auth ? opts.auth(body) : {access_token: 'tok-2', refresh_token: 'ref-2', expires_in: 3600, user: {id: 'u1', email: 'a@b.c'}}; };
  const store = (patch) => { const c = JSON.parse(ls.getItem('happy-auth:day')); ls.setItem('happy-auth:day', JSON.stringify(Object.assign(c, patch))); };
  return {realm, CL, ls, calls, store};
}

test('another tab refreshed the tokens: the stored cell is adopted, not reported as a changed sign-in', () => {
  const {realm, CL, store} = fixture();
  store({s: {uid: 'u1', at: 'tok-9', rt: 'ref-9', exp: Date.now() + 7200e3}, last: 7});
  assert.doesNotThrow(() => realm.clAssertStoredSession());
  assert.equal(CL.s.at, 'tok-9'); assert.equal(CL.s.rt, 'ref-9'); assert.equal(CL.last, 7);
  assert.equal(realm.clPersistedFence(), CL.authFence);
});

for (const [what, patch] of [['account', {s: {uid: 'u2', at: 'x', rt: 'y', exp: Date.now() + 1e6}}], ['key', {k: 'key-2'}], ['generation', {g: 'gen-2'}], ['sign-out', {s: null, k: null, g: 'gen-3'}]]) {
  test('a real change of ' + what + ' in the stored cell still stops the operation', () => {
    const {realm, CL, store} = fixture();
    store(patch);
    assert.throws(() => realm.clAssertStoredSession(), /Сохранённый вход изменился/);
    assert.equal(CL.s && CL.s.at, 'tok-1', 'memory session untouched');
  });
}

test('forced refresh is single-flight: two concurrent calls make one network request', async () => {
  const {realm, CL, calls} = fixture();
  const [a, b] = await Promise.all([realm.clToken(true), realm.clToken(true)]);
  assert.equal(a, 'tok-2'); assert.equal(b, 'tok-2'); assert.equal(CL.s.rt, 'ref-2');
  assert.equal(calls.filter(x => x.startsWith('clAuth')).length, 1);
  assert.equal(JSON.parse(realm.localStorage.getItem('happy-auth:day')).s.at, 'tok-2', 'new tokens stored');
  assert.ok(realm.navigator.locks.log.includes('lock happy-auth-refresh:day:u1'), 'cross-tab lock taken');
});

test('tokens refreshed by another tab while waiting are adopted without a network request', async () => {
  const {realm, CL, calls, store} = fixture();
  store({s: {uid: 'u1', at: 'tok-5', rt: 'ref-5', exp: Date.now() + 7200e3}});
  const t = await realm.clToken(true);
  assert.equal(t, 'tok-5'); assert.equal(CL.s.rt, 'ref-5');
  assert.equal(calls.filter(x => x.startsWith('clAuth')).length, 0);
});

test('a failed refresh with newer same-account tokens on disk adopts them instead of signing out', async () => {
  const {realm, CL, calls, store} = fixture({auth: () => { store({s: {uid: 'u1', at: 'tok-7', rt: 'ref-7', exp: Date.now() + 7200e3}}); throw Error('Вход устарел — войди заново'); }});
  const t = await realm.clToken(true);
  assert.equal(t, 'tok-7'); assert.ok(CL.s, 'still signed in'); assert.ok(!calls.includes('profile null'));
});

test('a stale refresh token with nothing newer on disk still signs out', async () => {
  const {realm, CL, calls} = fixture({auth: () => { throw Error('Вход устарел — войди заново'); }});
  await assert.rejects(realm.clToken(true), /устарел/);
  assert.equal(CL.s, null); assert.ok(calls.includes('profile null'));
  assert.equal(JSON.parse(realm.localStorage.getItem('happy-auth:day')).s, null, 'cell cleared');
});

test('a refresh after the account changed underneath does not revive the old session', async () => {
  const {realm, CL, store} = fixture({auth: () => { store({s: {uid: 'u2', at: 'o', rt: 'p', exp: Date.now() + 1e6}, k: 'key-2', g: 'gen-2'}); return {access_token: 'late', refresh_token: 'late-r', expires_in: 3600, user: {id: 'u1'}}; }});
  await assert.rejects(realm.clToken(true), /Аккаунт изменился/);
  assert.notEqual(CL.s && CL.s.at, 'late');
  assert.equal(JSON.parse(realm.localStorage.getItem('happy-auth:day')).s.uid, 'u2', 'the newer sign-in on disk is kept');
});

test('a read context survives a token refresh but not an account change', async () => {
  const {realm, CL, store} = fixture();
  const guard = realm.clMealReadContext();
  store({s: {uid: 'u1', at: 'tok-3', rt: 'ref-3', exp: Date.now() + 7200e3}});
  assert.doesNotThrow(guard, 'same identity, fresh tokens');
  assert.equal(CL.s.at, 'tok-3');
  store({g: 'gen-2'});
  assert.throws(guard, /Контекст чтения сводки изменился|Сохранённый вход изменился/);
});

test('without Web Locks the refresh still runs single-flight', async () => {
  const {realm, calls} = fixture({locks: false});
  await Promise.all([realm.clToken(true), realm.clToken(true), realm.clToken(true)]);
  assert.equal(calls.filter(x => x.startsWith('clAuth')).length, 1);
});
