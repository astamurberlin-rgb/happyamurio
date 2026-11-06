'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {create, stable, copy} = require('../dist/day/snapshot-sync.js');
const empty = () => ({db: {days: {}, importedHistory: {items: []}, unknownFuture: {preserve: 'yes'}}});
const full = note => ({db: {days: {'2026-11-04': {note}}, importedHistory: {items: [{source: 'synthetic', value: 17}]}, unknownFuture: {preserve: 'yes'}}});
const isEmpty = s => Object.values(s.db.days).every(d => !d.note) && !s.db.importedHistory.items.length;
const error = code => Object.assign(new Error(code), {code});
const deferred = () => { let resolve; const promise = new Promise(r => {resolve = r}); return {promise, resolve}; };
class Cloud {
  constructor() { this.rows = new Map(); this.writes = []; this.serial = 0; this.offline = false; this.beforeRead = null; this.beforeCAS = null; this.afterCAS = null; }
  seed(owner, snapshot) { const row = {snapshot: copy(snapshot), version: 'v' + (++this.serial)}; this.rows.set(owner, row); return copy(row); }
  async read(c) {
    if (this.beforeRead) await this.beforeRead(c);
    if (this.offline) throw error('offline');
    return this.rows.has(c.owner) ? copy(this.rows.get(c.owner)) : null;
  }
  async compareAndSwap(c, request) {
    if (this.beforeCAS) await this.beforeCAS(c, request);
    request.guard();
    if (this.offline) throw error('offline');
    const current = this.rows.get(c.owner);
    if ((current ? current.version : null) !== request.expectedVersion) return {ok: false};
    const row = this.seed(c.owner, request.snapshot);
    this.writes.push({owner: c.owner, snapshot: copy(request.snapshot)});
    if (this.afterCAS) await this.afterCAS(c, request);
    return {ok: true, version: row.version};
  }
}
function device(cloud = new Cloud(), snapshot = empty()) {
  let ctx = {owner: 'alice', generation: 1};
  const records = new Map([['alice', {snapshot: copy(snapshot), revision: 1, baseline: null}]]);
  const backups = [], commits = [];
  const hooks = {read: null, backup: null, commit: null};
  const opts = {
    getContext: () => ctx,
    isEmpty,
    validate: s => !!s.db && !!s.db.days && Array.isArray(s.db.importedHistory.items),
    local: {
      async read(c) { if (hooks.read) await hooks.read(c); return copy(records.get(c.owner)); },
      async backup(c, evidence) {
        if (hooks.backup) await hooks.backup(c, evidence);
        const id = 'b' + (backups.length + 1); backups.push({id, ...c, evidence: copy(evidence)});
        return {durable: true, id};
      },
      async commit(c, request) {
        if (hooks.commit) await hooks.commit(c, request);
        request.guard();
        const r = records.get(c.owner);
        if (r.revision !== request.expectedRevision) return {ok: false};
        records.set(c.owner, {snapshot: copy(request.snapshot), baseline: copy(request.baseline), revision: r.revision + 1});
        commits.push({owner: c.owner, snapshot: copy(request.snapshot)});
        return {ok: true, revision: r.revision + 1};
      }
    },
    cloud: {read: c => cloud.read(c), compareAndSwap: (c, r) => cloud.compareAndSwap(c, r)}
  };
  return {
    opts, records, cloud, backups, commits, hooks,
    engine: create(opts),
    get snapshot() { return copy(records.get(ctx.owner).snapshot); },
    get record() { return records.get(ctx.owner); },
    edit(next) { const r = records.get(ctx.owner); records.set(ctx.owner, {...r, snapshot: copy(next), revision: r.revision + 1}); },
    switch(owner) { ctx = {owner, generation: ctx.generation + 1}; if (owner && !records.has(owner)) records.set(owner, {snapshot: empty(), revision: 1, baseline: null}); },
    relogin() { ctx = {...ctx, generation: ctx.generation + 1}; this.engine = create(opts); },
    baseline(snapshot, remoteVersion) { this.record.baseline = {owner: ctx.owner, snapshot: copy(snapshot), remoteVersion}; }
  };
}

test('first login restores populated remote into empty local, preserving unknown/imported history fields', async () => {
  const d = device(); const remote = d.cloud.seed('alice', full('remote'));
  assert.equal((await d.engine.sync()).state, 'restored');
  assert.deepEqual(d.snapshot, remote.snapshot);
  assert.equal(d.backups.length, 1); assert.deepEqual(d.backups[0].evidence.local.snapshot, empty());
  assert.equal(d.record.baseline.owner, 'alice'); assert.equal(d.record.baseline.remoteVersion, remote.version);
  assert.equal(d.cloud.writes.length, 0);
});

test('nonempty local uploads to absent remote and is restored after logout/relogin on separate origin', async () => {
  const cloud = new Cloud(), a = device(cloud, full('own')), b = device(cloud);
  assert.equal((await a.engine.sync()).state, 'uploaded');
  b.switch(null); assert.equal((await b.engine.sync()).state, 'unavailable'); b.switch('alice'); b.relogin();
  assert.equal((await b.engine.sync()).state, 'restored'); assert.deepEqual(b.snapshot, a.snapshot);
  assert.equal((await b.engine.sync()).state, 'current'); assert.equal(cloud.writes.length, 1);
});

test('empty local and absent remote do not create an empty cloud journal', async () => {
  const d = device(); assert.equal((await d.engine.sync()).state, 'empty'); assert.equal(d.cloud.writes.length, 0); assert.equal(d.commits.length, 0);
});

test('offline first read retains local journal and retry after reconnect uploads it', async () => {
  const d = device(undefined, full('offline note')); d.cloud.offline = true;
  assert.equal((await d.engine.sync()).reason, 'offline'); assert.deepEqual(d.snapshot, full('offline note')); assert.equal(d.commits.length, 0);
  d.cloud.offline = false; assert.equal((await d.engine.sync()).state, 'uploaded');
});

test('password/decryption failure is not interpreted as absent remote', async () => {
  const d = device(undefined, full('local')); d.opts.cloud.read = async () => {throw error('decrypt-failed');};
  assert.equal((await d.engine.sync()).reason, 'decrypt-failed'); assert.equal(d.cloud.writes.length, 0); assert.equal(d.commits.length, 0);
  assert.deepEqual(d.snapshot, full('local'));
});

test('different populated journals without baseline stop and preserve both in backup', async () => {
  const d = device(undefined, full('local')); d.cloud.seed('alice', full('remote'));
  const result = await d.engine.sync(); assert.equal(result.state, 'conflict'); assert.equal(result.reason, 'different-without-baseline');
  assert.deepEqual(d.snapshot, full('local')); assert.deepEqual(d.backups[0].evidence.remote.snapshot, full('remote'));
  assert.equal(d.cloud.writes.length, 0); assert.equal(d.commits.length, 0);
});

test('equal snapshots canonicalize object keys and establish baseline without uploading', async () => {
  const d = device(undefined, full('same')); const remote = copy(d.snapshot);
  remote.db = {unknownFuture: remote.db.unknownFuture, importedHistory: remote.db.importedHistory, days: remote.db.days};
  d.cloud.seed('alice', remote); assert.equal((await d.engine.sync()).state, 'current'); assert.ok(d.record.baseline); assert.equal(d.cloud.writes.length, 0);
});

test('established remote-only change safely fast-forwards unchanged populated local', async () => {
  const cloud = new Cloud(), a = device(cloud, full('base')), b = device(cloud);
  await a.engine.sync(); await b.engine.sync(); a.edit(full('new')); await a.engine.sync();
  const before = copy(b.snapshot); assert.equal((await b.engine.sync()).state, 'restored'); assert.deepEqual(b.snapshot, full('new'));
  assert.deepEqual(b.backups.at(-1).evidence.local.snapshot, before);
});

test('both changed from common baseline stop rather than choosing timestamp or merging guesses', async () => {
  const cloud = new Cloud(), a = device(cloud, full('base')), b = device(cloud);
  await a.engine.sync(); await b.engine.sync(); a.edit(full('A')); b.edit(full('B')); await a.engine.sync();
  const result = await b.engine.sync(); assert.equal(result.state, 'conflict'); assert.equal(result.reason, 'both-changed');
  assert.deepEqual(b.snapshot, full('B')); assert.deepEqual(cloud.rows.get('alice').snapshot, full('A'));
});

test('local emptied after baseline never overwrites populated cloud', async () => {
  const d = device(undefined, full('base')); await d.engine.sync(); d.edit(empty());
  const result = await d.engine.sync(); assert.equal(result.state, 'blocked'); assert.equal(result.reason, 'empty-local-would-overwrite');
  assert.deepEqual(d.cloud.rows.get('alice').snapshot, full('base')); assert.deepEqual(d.snapshot, empty());
});

test('empty remote never overwrites populated unchanged local', async () => {
  const d = device(undefined, full('base')); await d.engine.sync(); d.cloud.seed('alice', empty());
  const result = await d.engine.sync(); assert.equal(result.state, 'blocked'); assert.equal(result.reason, 'empty-remote-would-overwrite'); assert.deepEqual(d.snapshot, full('base'));
});

test('remote disappearance after established baseline requires review rather than automatic resurrection', async () => {
  const d = device(undefined, full('base')); await d.engine.sync(); d.cloud.rows.delete('alice');
  assert.equal((await d.engine.sync()).reason, 'remote-missing-after-baseline'); assert.equal(d.cloud.writes.length, 1);
});

test('populated local versus empty remote without baseline requires review', async () => {
  const d = device(undefined, full('base')); d.cloud.seed('alice', empty());
  assert.equal((await d.engine.sync()).reason, 'remote-empty-without-baseline'); assert.deepEqual(d.snapshot, full('base')); assert.equal(d.cloud.writes.length, 0);
});

test('owner switch while cloud read is in flight cannot apply previous owner data', async () => {
  const d = device(); d.cloud.seed('alice', full('alice')); d.cloud.beforeRead = async () => {d.switch('bob');};
  assert.equal((await d.engine.sync()).state, 'stale-context'); assert.deepEqual(d.snapshot, empty()); assert.equal(d.commits.length, 0);
});

test('logout then login with same UID invalidates previous generation', async () => {
  const d = device(); d.cloud.seed('alice', full('alice')); d.cloud.beforeRead = async () => {d.switch(null); d.switch('alice');};
  assert.equal((await d.engine.sync()).state, 'stale-context'); assert.equal(d.commits.length, 0);
});

test('owner switch during backup forbids cloud write', async () => {
  const d = device(undefined, full('alice')); d.hooks.backup = async () => {d.switch('bob');};
  assert.equal((await d.engine.sync()).state, 'stale-context'); assert.equal(d.cloud.writes.length, 0);
});

test('owner switch inside final local commit guard forbids restoring wrong UID', async () => {
  const d = device(); d.cloud.seed('alice', full('alice')); d.hooks.commit = async () => {d.switch('bob');};
  assert.equal((await d.engine.sync()).state, 'stale-context'); assert.equal(d.commits.length, 0); assert.deepEqual(d.snapshot, empty());
});

test('owner switch at cloud dispatch guard prevents wrong-identity write', async () => {
  const d = device(undefined, full('alice')); d.cloud.beforeCAS = async () => {d.switch('bob');};
  assert.equal((await d.engine.sync()).state, 'stale-context'); assert.equal(d.cloud.writes.length, 0);
});

test('owner switch after pinned cloud commit may finish old-owner write but never touches new owner', async () => {
  const d = device(undefined, full('alice')); d.cloud.afterCAS = async () => {d.switch('bob');};
  const r = await d.engine.sync(); assert.equal(r.state, 'stale-context'); assert.equal(r.cloudWritten, true);
  assert.deepEqual(d.cloud.rows.get('alice').snapshot, full('alice')); assert.equal(d.cloud.rows.has('bob'), false); assert.equal(d.commits.length, 0);
});

test('local edit while remote read is in flight preserves new local edit', async () => {
  const d = device(); d.cloud.seed('alice', full('remote')); d.cloud.beforeRead = async () => {d.edit(full('new local'));};
  assert.equal((await d.engine.sync()).state, 'local-changed'); assert.deepEqual(d.snapshot, full('new local')); assert.equal(d.commits.length, 0);
});

test('local edit during backup prevents stale upload', async () => {
  const d = device(undefined, full('old')); d.hooks.backup = async () => {d.edit(full('new'));};
  assert.equal((await d.engine.sync()).state, 'local-changed'); assert.equal(d.cloud.writes.length, 0);
});

test('local edit during cloud CAS cannot be overwritten by baseline commit', async () => {
  const d = device(undefined, full('old')); d.cloud.afterCAS = async () => {d.edit(full('new'));};
  const r = await d.engine.sync(); assert.equal(r.state, 'local-changed'); assert.equal(r.cloudWritten, true);
  assert.deepEqual(d.snapshot, full('new')); assert.deepEqual(d.cloud.rows.get('alice').snapshot, full('old')); assert.equal(d.record.baseline, null);
});

test('local edit at final restore commit fails revision CAS without losing edit', async () => {
  const d = device(); d.cloud.seed('alice', full('remote')); d.hooks.commit = async () => {d.edit(full('new'));};
  assert.equal((await d.engine.sync()).state, 'local-changed'); assert.deepEqual(d.snapshot, full('new')); assert.equal(d.commits.length, 0);
});

test('same engine joins concurrent sync calls into one operation', async () => {
  const d = device(undefined, full('same')), gate = deferred(); d.cloud.beforeRead = () => gate.promise;
  const a = d.engine.sync(), b = d.engine.sync(); assert.equal(a, b); gate.resolve();
  assert.equal((await a).state, 'uploaded'); assert.equal(d.cloud.writes.length, 1);
});

test('two writers racing to create absent row cannot overwrite each other', async () => {
  const cloud = new Cloud(), a = device(cloud, full('A')), b = device(cloud, full('B')), gate = deferred(); let arrivals = 0;
  cloud.beforeCAS = async () => { if (++arrivals === 2) gate.resolve(); await gate.promise; };
  const results = await Promise.all([a.engine.sync(), b.engine.sync()]);
  assert.deepEqual(results.map(r => r.state).sort(), ['conflict', 'uploaded']); assert.equal(cloud.writes.length, 1);
  assert.deepEqual(a.snapshot, full('A')); assert.deepEqual(b.snapshot, full('B'));
});

test('two writers racing from shared baseline cannot replace newer revision', async () => {
  const cloud = new Cloud(), a = device(cloud, full('base')), b = device(cloud); await a.engine.sync(); await b.engine.sync();
  a.edit(full('A')); b.edit(full('B')); const gate = deferred(); let arrivals = 0;
  cloud.beforeCAS = async () => {if (++arrivals === 2) gate.resolve(); await gate.promise;};
  const results = await Promise.all([a.engine.sync(), b.engine.sync()]);
  assert.deepEqual(results.map(r => r.state).sort(), ['conflict', 'uploaded']); assert.equal(cloud.writes.length, 2);
});

test('backup quota failure prevents any local apply and cloud write', async () => {
  for (const restoring of [true, false]) {
    const d = device(undefined, restoring ? empty() : full('local')); if (restoring) d.cloud.seed('alice', full('remote'));
    d.hooks.backup = async () => {throw error('quota-exceeded');};
    assert.equal((await d.engine.sync()).reason, 'quota-exceeded'); assert.equal(d.commits.length, 0); assert.equal(d.cloud.writes.length, 0);
    assert.deepEqual(d.snapshot, restoring ? empty() : full('local'));
  }
});

test('nondurable backup return fails closed', async () => {
  const d = device(undefined, full('local')); d.opts.local.backup = async () => ({durable: false, id: 'fake'});
  assert.equal((await d.engine.sync()).reason, 'backup-not-durable'); assert.equal(d.cloud.writes.length, 0);
});

test('commit quota failure leaves snapshot and backup recoverable', async () => {
  const d = device(); d.cloud.seed('alice', full('remote')); d.hooks.commit = async () => {throw error('quota-exceeded');};
  assert.equal((await d.engine.sync()).reason, 'quota-exceeded'); assert.deepEqual(d.snapshot, empty()); assert.equal(d.backups.length, 1); assert.equal(d.commits.length, 0);
});

test('network failure after server write reports uncertainty; next run reads before retry', async () => {
  const d = device(undefined, full('local')); d.cloud.afterCAS = async () => {throw error('network-response-lost');};
  const r = await d.engine.sync(); assert.equal(r.state, 'error'); assert.equal(r.cloudWriteUncertain, true); assert.equal(d.record.baseline, null);
  d.cloud.afterCAS = null; assert.equal((await d.engine.sync()).state, 'current'); assert.equal(d.cloud.writes.length, 1);
});

test('a local baseline owned by another UID is rejected', async () => {
  const d = device(undefined, full('local')); d.record.baseline = {owner: 'bob', snapshot: full('local'), remoteVersion: 'x'};
  assert.equal((await d.engine.sync()).reason, 'invalid-baseline'); assert.equal(d.cloud.writes.length, 0);
});

test('undefined cloud response is error, never permission to upload', async () => {
  const d = device(undefined, full('local')); d.opts.cloud.read = async () => undefined;
  assert.equal((await d.engine.sync()).reason, 'invalid-remote'); assert.equal(d.cloud.writes.length, 0);
});

test('invalid JSON and unsupported schema block without replacing anything', async () => {
  const d = device(); d.cloud.rows.set('alice', {snapshot: {bad: true}, version: 'v1'});
  assert.equal((await d.engine.sync()).reason, 'invalid-snapshot'); assert.equal(d.commits.length, 0);
  assert.throws(() => stable({a: undefined}), /Snapshot/); assert.throws(() => stable({a: Infinity}), /Snapshot/);
  const cycle = {}; cycle.self = cycle; assert.throws(() => stable(cycle), /Snapshot/);
  assert.throws(() => stable({a: new Date()})); assert.throws(() => stable([, 'x']));
});

test('atomic local metadata commit failure after successful cloud upload remains recoverable on relogin', async () => {
  const d = device(undefined, full('local')); d.hooks.commit = async () => {throw error('quota-exceeded');};
  const r = await d.engine.sync(); assert.equal(r.cloudWritten, true); assert.equal(d.record.baseline, null);
  d.hooks.commit = null; d.relogin(); assert.equal((await d.engine.sync()).state, 'current'); assert.ok(d.record.baseline); assert.equal(d.cloud.writes.length, 1);
});

test('remote changes between read and conditional upload return conflict with no forced retry', async () => {
  const d = device(undefined, full('base')); await d.engine.sync(); d.edit(full('local edit'));
  d.cloud.beforeCAS = async () => {d.cloud.seed('alice', full('remote edit'));};
  const r = await d.engine.sync(); assert.equal(r.reason, 'remote-changed-during-write'); assert.deepEqual(d.snapshot, full('local edit')); assert.equal(d.cloud.writes.length, 1);
});

test('remote same contents but newer version only updates baseline revision', async () => {
  const d = device(undefined, full('base')); await d.engine.sync(); const version = d.cloud.seed('alice', full('base')).version;
  assert.equal((await d.engine.sync()).state, 'current'); assert.equal(d.record.baseline.remoteVersion, version); assert.equal(d.cloud.writes.length, 1);
});
