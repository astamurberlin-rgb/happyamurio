/* OFFLINE PROTOTYPE. Not loaded by Day or Sport. No auth setup, refresh, or writer. */
import {assertDeployedSportJournal} from './sport-journal-validator.mjs';

const ENDPOINT = 'https://geqziziycpclhnucnsyx.supabase.co/rest/v1/app_sync';
const MAX_RESPONSE_BYTES = 4_100_000;
const MAX_CIPHER_CHARS = 4_000_000;
const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const failure = code => Object.assign(new Error(code), {code});
const status = (state, code) => Object.freeze({state, ...(code ? {code} : {})});

function freezeTree(value) {
  if (value === null || typeof value !== 'object') return value;
  // Iterative traversal avoids deep extension objects overflowing the call stack.
  const pending = [value];
  while (pending.length) {
    const current = pending.pop();
    for (const [key, child] of Object.entries(current)) {
      if (RESERVED.has(key)) throw failure('snapshot-schema');
      if (child !== null && typeof child === 'object') pending.push(child);
    }
    Object.freeze(current);
  }
  return value;
}

function base64(value) {
  if (typeof value !== 'string' || value.length % 4 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw failure('row-schema');
  }
  const text = atob(value);
  if (btoa(text) !== value) throw failure('row-schema');
  return Uint8Array.from(text, character => character.charCodeAt(0));
}

function validateRow(value, owner) {
  if (!object(value) || value.user_id !== owner || value.app !== 'sport' ||
      value.kind !== 'journal' || value.v !== 1 || !Number.isSafeInteger(value.at) ||
      value.at < 0 || typeof value.iv !== 'string' || !/^[A-Za-z0-9+/]{16}$/.test(value.iv) ||
      typeof value.data !== 'string' || !value.data.length || value.data.length > MAX_CIPHER_CHARS) {
    throw failure('row-schema');
  }
  const iv = base64(value.iv), cipher = base64(value.data);
  if (iv.length !== 12 || cipher.length < 16) throw failure('row-schema');
  return {iv, cipher};
}

function validateSnapshot(value) {
  // Current automatic writer always wraps data. Do not accept the old flat backup alias.
  if (!object(value) || value.app !== 'Happy Sport' || value.version !== 1 ||
      !object(value.data) || value.data.version !== 1) throw failure('snapshot-schema');
  try { assertDeployedSportJournal(value); freezeTree(value); }
  catch { throw failure('snapshot-schema'); }
  return value;
}

function pinContext(raw, now) {
  if (!raw || !raw.session || !raw.key) throw failure('authentication-required');
  const s = raw.session;
  if (typeof raw.owner !== 'string' || !raw.owner || raw.owner !== s.uid ||
      raw.profileOwner !== raw.owner || typeof s.at !== 'string' || !s.at ||
      !Number.isFinite(s.exp) || s.exp <= now + 60_000 ||
      !Number.isSafeInteger(raw.generation) || raw.generation < 0 ||
      typeof raw.memoryFence !== 'string' || !raw.memoryFence ||
      raw.memoryFence !== raw.persistedFence || raw.key.type !== 'secret' || raw.key.extractable !== false ||
      raw.key.algorithm?.name !== 'AES-GCM' || raw.key.algorithm?.length !== 256 ||
      !raw.key.usages?.includes('decrypt')) throw failure('authentication-required');
  return Object.freeze({owner:raw.owner, profileOwner:raw.profileOwner, session:s,
    token:s.at, refreshToken:s.rt, expiresAt:s.exp, key:raw.key, generation:raw.generation,
    memoryFence:raw.memoryFence, persistedFence:raw.persistedFence});
}

function sameContext(a, b) {
  return Object.keys(a).every(key => a[key] === b[key]);
}

async function boundedBody(response, guard) {
  if (!response.body || typeof response.body.getReader !== 'function') throw failure('response-schema');
  const reader = response.body.getReader(), parts = [];
  let size = 0;
  try {
    for (;;) {
      guard();
      const {done, value} = await reader.read();
      guard();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw failure('response-schema');
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) throw failure('response-too-large');
      parts.push(value);
    }
  } catch (error) {
    // Cancellation is advisory and must not delay the fence/error result.
    Promise.resolve(reader.cancel()).catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes)); }
  catch { throw failure('response-schema'); }
}

/**
 * captureContext is a TRUSTED in-origin auth adapter, never imported JSON or postMessage.
 * It must synchronously verify Day's current/persisted session and profile ownership;
 * generation must advance on every auth/key/lifecycle change, including A -> B -> A.
 * This module verifies consistency, not the authenticity of a caller's fabricated token.
 * fetchRead is explicitly injected: there is deliberately no global fetch fallback.
 */
export function createSportMeasurementReader({captureContext, fetchRead, crypto, publishableKey, now = Date.now, deadlineMs = 20_000}) {
  if (typeof captureContext !== 'function' || typeof fetchRead !== 'function' ||
      !crypto?.subtle || typeof publishableKey !== 'string' || !publishableKey ||
      typeof now !== 'function' || !Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 120_000) {
    throw new TypeError('Explicit reader dependencies and bounded deadline required');
  }
  let sequence = 0, controller = null, bound = null, current = status('idle'), disposed = false;
  const capture = () => pinContext(captureContext(), now());

  function clear(state, code) {
    ++sequence;
    controller?.abort(); controller = null; bound = null;
    current = status(state, code);
    return current;
  }
  function invalidate() { return clear(disposed ? 'disposed' : 'unavailable', 'context-invalidated'); }
  function getState() {
    if (bound) {
      try { if (!sameContext(bound, capture())) return clear('unavailable', 'context-changed'); }
      catch { return clear('unavailable', 'context-changed'); }
    }
    return current;
  }
  async function read() {
    if (disposed) return status('disposed');
    clear('loading');
    const request = sequence;
    let context;
    try { context = capture(); }
    catch { current = status('unavailable', 'authentication-required'); return current; }
    bound = context;
    const abort = new AbortController(); controller = abort;
    function guard() {
      if (request !== sequence || disposed) throw failure('superseded');
      try { if (!sameContext(context, capture())) throw failure('context-changed'); }
      catch { throw failure('context-changed'); }
    }
    async function run() { try {
      const query = '?select=user_id,app,kind,v,iv,data,at&user_id=eq.' +
        encodeURIComponent(context.owner) + '&app=eq.sport&kind=eq.journal';
      guard();
      const response = await fetchRead(ENDPOINT + query, {
        method:'GET', headers:Object.freeze({apikey:publishableKey, Authorization:'Bearer ' + context.token}),
        signal:abort.signal, cache:'no-store', credentials:'omit', redirect:'error', referrerPolicy:'no-referrer'
      });
      guard();
      if (response?.status === 401 || response?.status === 403) throw failure('access-denied');
      if (!response || response.status !== 200 || response.ok !== true || response.redirected === true) {
        throw failure('http-error');
      }
      const rows = await boundedBody(response, guard);
      guard();
      if (!Array.isArray(rows) || rows.length > 1) throw failure('response-schema');
      if (!rows.length) { current = status('missing'); return current; }
      const row = rows[0], {iv, cipher} = validateRow(row, context.owner);
      let plaintext;
      try {
        plaintext = await crypto.subtle.decrypt({name:'AES-GCM', iv,
          additionalData:new TextEncoder().encode(context.owner + '|sport|journal')}, context.key, cipher);
      } catch { guard(); throw failure('decrypt-failed'); }
      guard();
      let snapshot;
      try { snapshot = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(plaintext)); }
      catch { throw failure('snapshot-schema'); }
      validateSnapshot(snapshot);
      // Fingerprint exact plaintext bytes, not a normalization or measurement-date map.
      const hash = await crypto.subtle.digest('SHA-256', plaintext);
      guard();
      const digest = Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, '0')).join('');
      const data = snapshot.data;
      const projection = freezeTree({
        source:{app:'sport', kind:'journal', owner:context.owner, version:1,
          observedAt:now(), rowAt:row.at, iv:row.iv, digest},
        measurements:data.measurements,
        recovery:{fieldPresent:Object.hasOwn(data, 'measurementTrash')}
      });
      guard();
      current = Object.freeze({state:data.measurements.length ? 'ready' : 'empty', projection});
      return current;
    } catch (error) {
      // Never expose raw server errors, response bodies, ciphertext, tokens, or journal sections.
      if (request !== sequence || disposed) return status('superseded');
      try { guard(); }
      catch { return clear('unavailable', 'context-changed'); }
      const safeCodes = new Set(['access-denied','http-error','response-schema','response-too-large',
        'row-schema','decrypt-failed','snapshot-schema']);
      current = status('error', safeCodes.has(error?.code) ? error.code : 'read-failed');
      return current;
    } finally { if (request === sequence) controller = null; } }
    // Abort is advisory. The race finishes even if an injected transport/crypto ignores it.
    let deadline;
    const timeout = new Promise(resolve => {
      deadline = setTimeout(() => {
        if (request !== sequence || disposed) { resolve(status('superseded')); return; }
        try { guard(); } catch { resolve(clear('unavailable', 'context-changed')); return; }
        resolve(clear('error', 'timeout'));
      }, deadlineMs);
    });
    try { return await Promise.race([run(), timeout]); }
    finally { clearTimeout(deadline); }
  }
  function dispose() { disposed = true; return clear('disposed'); }
  // Consumers must render getState(), clear the view on invalidate(), and drop previous results.
  // JS cannot revoke copies already retained by a consumer. There is no UI wired in this prototype.
  return Object.freeze({read, getState, invalidate, dispose});
}
