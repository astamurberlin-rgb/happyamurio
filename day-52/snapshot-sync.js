/* Conservative JSON snapshot synchronization. No credentials or network globals. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HappySnapshotSync = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function fault(code, message) { const e = new Error(message || code); e.code = code; return e; }
  function token(value) { return (typeof value === 'string' && value.length > 0) || (typeof value === 'number' && Number.isFinite(value)); }
  // Comparison is canonical JSON, never a timestamp-based last-write-wins rule.
  function stable(value) {
    const ancestors = new Set();
    function visit(v) {
      if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
      if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
      if (typeof v !== 'object' || !v || ancestors.has(v)) throw fault('invalid-snapshot', 'Snapshot must contain finite, acyclic JSON data.');
      ancestors.add(v);
      let out;
      if (Array.isArray(v)) {
        const parts = [];
        for (let i = 0; i < v.length; i++) {
          if (!Object.prototype.hasOwnProperty.call(v, i)) throw fault('invalid-snapshot', 'Sparse arrays are not JSON snapshots.');
          parts.push(visit(v[i]));
        }
        if (Object.keys(v).some(k => !/^(0|[1-9][0-9]*)$/.test(k) || Number(k) >= v.length)) throw fault('invalid-snapshot');
        out = '[' + parts.join(',') + ']';
      } else {
        if (Object.prototype.toString.call(v) !== '[object Object]' || 'toJSON' in v || Object.getOwnPropertySymbols(v).length) throw fault('invalid-snapshot');
        out = '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + visit(v[k])).join(',') + '}';
      }
      ancestors.delete(v);
      return out;
    }
    return visit(value);
  }
  function copy(value) { return JSON.parse(stable(value)); }

  function create(options) {
    const o = options || {};
    for (const [name, fn] of Object.entries({getContext: o.getContext, isEmpty: o.isEmpty,
      'local.read': o.local && o.local.read, 'local.backup': o.local && o.local.backup,
      'local.commit': o.local && o.local.commit, 'cloud.read': o.cloud && o.cloud.read,
      'cloud.compareAndSwap': o.cloud && o.cloud.compareAndSwap})) {
      if (typeof fn !== 'function') throw new TypeError(name + ' must be a function');
    }
    let pending = null, last = {state: 'idle'};
    function context() {
      const c = o.getContext();
      return c && typeof c.owner === 'string' && c.owner && c.owner !== 'local' && token(c.generation)
        ? {owner: c.owner, generation: c.generation} : null;
    }
    function same(c) { const now = context(); return !!now && now.owner === c.owner && now.generation === c.generation; }
    function guard(c) { if (!same(c)) throw fault('stale-context', 'Account or session generation changed.'); return true; }
    function checkSnapshot(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw fault('invalid-snapshot', 'Snapshot must be a JSON object.');
      const encoded = stable(value), snapshot = JSON.parse(encoded);
      if (o.validate && o.validate(snapshot) === false) throw fault('invalid-snapshot');
      const empty = o.isEmpty(snapshot);
      if (typeof empty !== 'boolean') throw fault('invalid-snapshot', 'isEmpty must return a boolean.');
      return {snapshot, encoded, empty};
    }
    function localValue(raw, c) {
      if (!raw || !token(raw.revision)) throw fault('invalid-local', 'Local adapter must return a revision.');
      const result = {...checkSnapshot(raw.snapshot), revision: raw.revision, baseline: null};
      if (raw.baseline != null) {
        if (raw.baseline.owner !== c.owner || !token(raw.baseline.remoteVersion)) throw fault('invalid-baseline', 'Baseline owner or version is invalid.');
        result.baseline = {...checkSnapshot(raw.baseline.snapshot), remoteVersion: raw.baseline.remoteVersion, owner: c.owner};
      }
      return result;
    }
    function remoteValue(raw) {
      if (raw === null) return null; // undefined/error is never interpreted as absent.
      if (!raw || !token(raw.version)) throw fault('invalid-remote', 'Cloud adapter must return null or a versioned snapshot.');
      return {...checkSnapshot(raw.snapshot), version: raw.version};
    }
    async function run() {
      let c, cloudWritten = false, cloudWriteUncertain = false, backupId;
      try {
        c = context();
        if (!c) return {state: 'unavailable', reason: 'signed-out-or-context-unready'};
        const initialRaw = await o.local.read({...c}); guard(c);
        const local = localValue(initialRaw, c);
        const remoteRaw = await o.cloud.read({...c}); guard(c);
        const remote = remoteValue(remoteRaw);
        // Check again after cloud/decryption latency, including in-memory unsaved edits.
        const current = localValue(await o.local.read({...c}), c); guard(c);
        const baseStamp = v => v.baseline ? stable({snapshot: v.baseline.snapshot, remoteVersion: v.baseline.remoteVersion, owner: c.owner}) : null;
        if (current.revision !== local.revision || current.encoded !== local.encoded || baseStamp(current) !== baseStamp(local)) {
          return {state: 'local-changed', reason: 'local-changed-during-read'};
        }
        let action, reason;
        if (!remote) {
          if (local.baseline) { action = 'blocked'; reason = 'remote-missing-after-baseline'; }
          else if (local.empty) return {state: 'empty', reason: 'nothing-to-sync'};
          else action = 'upload';
        } else if (local.encoded === remote.encoded) {
          if (local.baseline && local.baseline.encoded === local.encoded && local.baseline.remoteVersion === remote.version) return {state: 'current'};
          action = 'acknowledge';
        } else if (!local.baseline) {
          if (local.empty && !remote.empty) action = 'restore';
          else { action = 'conflict'; reason = remote.empty ? 'remote-empty-without-baseline' : 'different-without-baseline'; }
        } else {
          const localChanged = local.encoded !== local.baseline.encoded;
          const remoteChanged = remote.encoded !== local.baseline.encoded;
          if (localChanged && remoteChanged) { action = 'conflict'; reason = 'both-changed'; }
          else if (localChanged) {
            if (local.empty) { action = 'blocked'; reason = 'empty-local-would-overwrite'; }
            else action = 'upload';
          } else if (remoteChanged) {
            if (remote.empty) { action = 'blocked'; reason = 'empty-remote-would-overwrite'; }
            else action = 'restore';
          } else throw fault('invalid-state');
        }
        if(o.readOnlyCloud && action==='upload')return {state:'read-only',reason:'cloud-write-disabled'};
        if(o.readOnlyCloud && action==='restore' && !local.empty && !o.allowVerifiedBaselineRestore)return {state:'read-only',reason:'populated-local-restore-disabled'};
        // Backup is append-only, owner-scoped, durable and verified by the adapter.
        // No mutation of live local or cloud state happens until this succeeds.
        const saved = await o.local.backup({...c}, {
          action, reason: reason || null,
          local: {snapshot: copy(local.snapshot), revision: local.revision},
          remote: remote ? {snapshot: copy(remote.snapshot), version: remote.version} : null,
          baseline: local.baseline ? {owner: c.owner, snapshot: copy(local.baseline.snapshot), remoteVersion: local.baseline.remoteVersion} : null
        }); guard(c);
        if (!saved || saved.durable !== true || !token(saved.id)) throw fault('backup-not-durable', 'A durable backup is required before synchronization.');
        backupId = saved.id;
        if (action === 'conflict' || action === 'blocked') return {state: action, reason, backupId};
        const fresh = localValue(await o.local.read({...c}), c); guard(c);
        if (fresh.revision !== local.revision || fresh.encoded !== local.encoded || baseStamp(fresh) !== baseStamp(local)) return {state: 'local-changed', reason: 'local-changed-before-write', backupId};
        let acceptedSnapshot = remote && remote.snapshot, acceptedVersion = remote && remote.version;
        if (action === 'upload') {
          guard(c);
          cloudWriteUncertain = true;
          const result = await o.cloud.compareAndSwap({...c}, {
            expectedVersion: remote ? remote.version : null,
            snapshot: copy(local.snapshot), guard: () => guard(c)
          });
          // An owner switch may occur after a pinned old-owner request commits.
          cloudWritten = !!(result && result.ok === true);
          if (result && typeof result.ok === 'boolean') cloudWriteUncertain = false;
          guard(c);
          if (!result || typeof result.ok !== 'boolean') throw fault('invalid-write-result');
          if (!result.ok) return {state: 'conflict', reason: 'remote-changed-during-write', backupId};
          if (!token(result.version)) throw fault('uncertain-cloud-write', 'Cloud write returned no version; reread before any retry.');
          acceptedSnapshot = local.snapshot; acceptedVersion = result.version;
        }
        if(o.allowVerifiedBaselineRestore && action==='restore'){
          const verify=remoteValue(await o.cloud.read({...c}));guard(c);
          if(!verify||verify.version!==acceptedVersion||verify.encoded!==stable(acceptedSnapshot))return {state:'conflict',reason:'remote-changed-during-restore',backupId};
          const latest=localValue(await o.local.read({...c}),c);guard(c);
          if(latest.revision!==local.revision||latest.encoded!==local.encoded)return {state:'local-changed',reason:'local-changed-before-restore',backupId};
        }
        guard(c);
        const commit = await o.local.commit({...c}, {
          expectedRevision: local.revision,
          verifiedBaselineRestore:!!(o.allowVerifiedBaselineRestore&&action==='restore'&&local.baseline&&!local.empty&&local.encoded===local.baseline.encoded),
          snapshot: copy(action === 'restore' ? acceptedSnapshot : local.snapshot),
          baseline: {owner: c.owner, snapshot: copy(acceptedSnapshot), remoteVersion: acceptedVersion},
          guard: () => guard(c)
        }); guard(c);
        if (!commit || typeof commit.ok !== 'boolean') throw fault('invalid-commit-result');
        if (!commit.ok) return {state: 'local-changed', reason: 'local-changed-during-commit', cloudWritten, backupId};
        return {state: action === 'restore' ? 'restored' : action === 'upload' ? 'uploaded' : 'current', cloudWritten, backupId};
      } catch (error) {
        let changed = false;
        try { changed = !!c && !same(c); } catch (_) { changed = !!c; }
        return {state: changed || (error && error.code) === 'stale-context' ? 'stale-context' : 'error',
          reason: changed ? 'stale-context' : (error && error.code) || 'adapter-error', message: String(error && error.message || error),
          cloudWritten, cloudWriteUncertain, ...(backupId === undefined ? {} : {backupId})};
      }
    }
    function sync() {
      if (pending) return pending;
      pending = run().then(result => { last = result; return result; }).finally(() => { pending = null; });
      return pending;
    }
    return Object.freeze({sync, status: () => ({...last})});
  }
  return Object.freeze({create, stable, copy});
});
