import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const dayDir = resolve(process.env.DAY_SOURCE_DIR || root + 'happy-deployed-source-read-20261106/day');
const sportDir = resolve(process.env.SPORT_SOURCE_DIR || root + 'happy-deployed-source-read-20261106/sport');
const day = readFileSync(dayDir + '/dist/day/index.html', 'utf8');
const sport = readFileSync(sportDir + '/sport/src/happy-auth.js', 'utf8');
const guard = readFileSync(dayDir + '/dist/day/auth-read-only.js', 'utf8');
const transfer = readFileSync(sportDir + '/sport/src/data-transfer.js', 'utf8');
function fixture(which = 'day') {
  const storage = new Map(), calls = [], writes = [];
  const c = vm.createContext({ crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, URL, AbortController, setTimeout, clearTimeout,
    btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'),
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => { writes.push(k); storage.set(k,v); } },
    fetch: async (...args) => { calls.push(args); return { ok:true, status:200, text:async ()=>'[]' }; }, navigator: {},
    location: {href:'https://synthetic-day.invalid/'}, HappyProfile: { matches: x => x === 'owner-synthetic' },
  });
  vm.runInContext(which === 'day' ? day.slice(day.indexOf('var CLOUD='), day.indexOf('/* ── блок «Аккаунт»')) : sport, c);
  if (which === 'day') vm.runInContext(guard,c);
  c.CL.s = { uid:'owner-synthetic', at:'not-real-access', rt:'not-real-refresh', exp:Date.now()+3600000 };
  c.CL.kraw = 'synthetic-only'; c.CL.ck = {}; c.CL.authGeneration = 'generation-1';
  storage.set(c.CL_KEY,JSON.stringify({s:c.CL.s,k:c.CL.kraw,g:c.CL.authGeneration}));
  if (which === 'day') c.CL.authFence = c.clPersistedFence();
  return { c, storage, calls, writes };
}

test('exact Day/Sport derivation interoperates only for the actual same key', async () => {
  const d = fixture(), s = fixture('sport');
  await d.c.clDerive('invented-test-password-one', 'owner-synthetic');
  await s.c.clDerive('invented-test-password-one', 'owner-synthetic');
  assert.equal(d.c.CL.kraw, s.c.CL.kraw);
  const iv = new Uint8Array(12).fill(9), aad = new TextEncoder().encode('owner-synthetic|sport|journal');
  const data = new TextEncoder().encode('{"synthetic":true}');
  const ciphertext = await webcrypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},s.c.CL.ck,data);
  const result = await webcrypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad},d.c.CL.ck,ciphertext);
  assert.deepEqual(new Uint8Array(result), data);
  await d.c.clDerive('invented-test-password-two','owner-synthetic');
  await assert.rejects(webcrypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad},d.c.CL.ck,ciphertext));
  for (const badAAD of ['other-owner|sport|journal','owner-synthetic|day|journal','owner-synthetic|sport|measurements']) {
    await assert.rejects(webcrypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(badAAD)},s.c.CL.ck,ciphertext));
  }
  assert.equal(d.calls.length+s.calls.length+d.writes.length+s.writes.length,0);
});

test('actual Day guard permits fixed Sport journal GET but denies all Sport write methods', async () => {
  const f=fixture(), url=f.c.CLOUD.url+'/rest/v1/app_sync?select=user_id,app,kind,v,iv,data,at&user_id=eq.owner-synthetic&app=eq.sport&kind=eq.journal';
  await f.c.fetch(url,{method:'GET'}); assert.equal(f.calls.length,1);
  for (const method of ['POST','PATCH','PUT','DELETE']) await assert.rejects(f.c.fetch(url,{method}),{code:'AUTH_TEST_READ_ONLY'});
  assert.equal(f.calls.length,1); assert.equal(f.writes.length,0);
});

test('Day persisted auth fence rejects owner, access, refresh, key, expiry, generation and cleared auth before storage event', () => {
  for(const mutate of [o=>o.s.uid='other-owner',o=>o.s.at='changed',o=>o.s.rt='changed',o=>o.s.exp--,o=>o.k='changed',o=>o.g='changed',()=>null]) {
    const f=fixture(); assert.equal(f.c.clAssertStoredSession(),f.c.CL.authFence);
    let o=JSON.parse(f.storage.get(f.c.CL_KEY)); const value=mutate(o); if(value===null)f.storage.delete(f.c.CL_KEY);else f.storage.set(f.c.CL_KEY,JSON.stringify(o));
    assert.throws(()=>f.c.clAssertStoredSession()); assert.equal(f.calls.length+f.writes.length,0);
  }
});

test('Sport source validator accepts duplicate/impossible dates, nulls/outside old range, extension keys and opaque recovery', () => {
  const c=vm.createContext({clone:x=>JSON.parse(JSON.stringify(x)),KEY:'synthetic-key'});
  vm.runInContext(transfer.slice(0,transfer.indexOf('function sportBackupInfo(')),c);
  const source={ app:'Happy Sport', version:1, data:{version:1,workouts:[],measurements:[
    {date:'2026-02-31',values:{waist:0,extension:1000,nullValue:null,negative:-1}},
    {date:'2026-02-31',values:{waist:99},extra:{opaque:'retained'}}
  ],customExercises:[],templates:[],energy:{burn:0,intake:0,steps:0,training:0,minutes:0},measurementTrash:{unexpectedShape:{kept:true}}}};
  assert.deepEqual(JSON.parse(JSON.stringify(c.sportValidateBackup(source))),source.data);
});

test('vendored validator and all pure dependency excerpts exactly match the audited Sport source',()=>{
  const validatorPath=resolve(process.env.VALIDATOR_SOURCE_FILE || root+'day-sport-readonly-prototype-20261106/src/sport-journal-validator.mjs');
  const actual=readFileSync(validatorPath,'utf8');
  const expected=transfer.slice(transfer.indexOf('function sportValidateBackup('),transfer.indexOf('function sportBackupInfo(')).trim();
  const received=actual.slice(actual.indexOf('function sportValidateBackup('),actual.indexOf('// A validator only')).trim();
  assert.equal(received,expected);
  assert.ok(actual.includes(transfer.split('\n').find(line=>line.startsWith('const sportDataFields='))));
  const timers=readFileSync(sportDir+'/sport/src/free-timer.js','utf8');
  assert.ok(actual.includes(timers.slice(timers.indexOf('function validateFreeTimer('),timers.indexOf('function freeSession(')).trim()));
  const player=readFileSync(sportDir+'/sport/src/exercise-player.js','utf8');
  for(const fn of ['parsePlayerMetric','parsePlayerDistance'])assert.ok(actual.includes(player.split('\n').find(line=>line.startsWith('function '+fn+'('))));
  const food=readFileSync(sportDir+'/shared/food-counters.js','utf8');
  assert.ok(actual.includes(food.slice(food.indexOf('  const number='),food.indexOf('  function linked(')).trim()));
});
