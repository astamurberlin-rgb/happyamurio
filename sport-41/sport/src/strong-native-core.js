/* Strong native additive import. Browser-only pure planning and fenced local transaction.
 * No parser, auth, persistence, network, raw archive, or cloud-success claim is embedded.
 * Hash-compatible with frozen native-planner.mjs (2026-11-04, SHA-256 26a378cb…).
 */
(function (root) {
  'use strict';
  const unsafe = new Set(['__proto__', 'constructor', 'prototype']);
  const metricOrder = ['seconds', 'distance', 'reps', 'weight'];
  function safe(value) {
    JSON.stringify(value, (key, item) => {
      if (unsafe.has(key) || typeof item === 'number' && !Number.isFinite(item) ||
          ['undefined', 'function', 'symbol', 'bigint'].includes(typeof item)) throw Error('Unsafe JSON');
      return item;
    });
    return value;
  }
  const copy = value => JSON.parse(JSON.stringify(safe(value)));
  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  const snapshot = value => freeze(copy(value));
  const sort = value => Array.isArray(value) ? value.map(sort) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])])) : value;
  const canonicalStringify = value => JSON.stringify(sort(safe(value)));
  async function hashText(text) {
    if (!root.crypto?.subtle) throw Error('WebCrypto SHA-256 is required');
    const bytes = new TextEncoder().encode(text);
    const hash = await root.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
  }
  // Serialization completes before the first await, including when callers mutate objects.
  async function digest(value) { return hashText(canonicalStringify(value)); }
  async function occurrenceKey(workout, index) {
    const fixed = snapshot(workout);
    return JSON.stringify([fixed.id, index, await digest(fixed.exercises[index])]);
  }
  function sourceMetrics(exercise) {
    const found = new Set(Array.isArray(exercise.metrics) ? exercise.metrics : []);
    for (const key of metricOrder) if (exercise.sets.some(set => Number.isFinite(set[key]) && set[key] > 0)) found.add(key);
    if ([...found].some(key => !metricOrder.includes(key))) throw Error('Unsupported source metric');
    const metrics = metricOrder.filter(key => found.has(key));
    if (!metrics.length) throw Error('Metric basis unresolved: zero-only placeholders need explicit reviewed metrics');
    return metrics;
  }
  async function planNativeImport(currentInput, sourceInput, decisionInput, libraryInput, options = {}) {
    const validateData = options.validateData;
    if (typeof validateData !== 'function') throw Error('Actual Sport validator required');
    // All caller-owned inputs are detached and immutable before any asynchronous hash.
    const current = snapshot(currentInput), input = snapshot(sourceInput), decisions = snapshot(decisionInput);
    const effectiveLibrary = snapshot(libraryInput), newDefinitions = snapshot(options.newDefinitions || []);
    validateData(copy(current));
    if (!input || !Array.isArray(input.workouts) || !input.workouts.length || input.workouts.length > 2000 || !/^[a-f0-9]{64}$/.test(input.fileSHA256)) throw Error('Invalid source');
    if (new Set(input.workouts.map(workout => workout.id)).size !== input.workouts.length) throw Error('Duplicate source ID');
    validateData({...copy(current), workouts: copy(input.workouts)});
    const defs = new Map(effectiveLibrary.map(exercise => [exercise.id, copy(exercise)]));
    if (defs.size !== effectiveLibrary.length) throw Error('Duplicate effective library ID');
    const unresolved = [], conflicts = [], proposed = new Map(), used = new Set();
    for (const definition of newDefinitions) {
      if (!definition || typeof definition.id !== 'string' || definition.scope !== 'user' || proposed.has(definition.id)) throw Error('Invalid new definition');
      if (defs.has(definition.id) && await digest(defs.get(definition.id)) !== await digest(definition)) conflicts.push({exerciseId: definition.id, reason: 'Definition ID collision'});
      else if (!defs.has(definition.id)) { proposed.set(definition.id, copy(definition)); defs.set(definition.id, copy(definition)); }
    }
    validateData({...copy(current), customExercises: [...copy(current.customExercises), ...copy([...proposed.values()])]});
    const incoming = [];
    for (const source of input.workouts) {
      if (source.strongImport) throw Error('Use original normalized source, not an already remapped export');
      const workout = copy(source), sourceHash = await digest(source);
      for (let index = 0; index < workout.exercises.length; index++) {
        const original = source.exercises[index], exercise = workout.exercises[index];
        const decision = decisions[await occurrenceKey(source, index)];
        if (!decision || decision.status !== 'confirmed') {
          unresolved.push({workoutId: workout.id, index, sourceId: exercise.id, sourceName: exercise.name}); continue;
        }
        const target = defs.get(decision.targetId);
        if (!target || decision.sourceWorkoutHash !== sourceHash || decision.targetHash !== await digest(target)) {
          conflicts.push({workoutId: workout.id, index, reason: 'Source or effective target changed'}); continue;
        }
        if (!['unknown', 'total_external', 'per_hand', 'plates_only', 'machine_display', 'assistance'].includes(decision.loadBasis || 'unknown')) throw Error('Unsupported load basis');
        if (typeof decision.evidence !== 'string' || !decision.evidence || decision.evidence.length > 120) throw Error('Reviewed mapping evidence required');
        try { exercise.metrics = sourceMetrics(original); }
        catch (error) {
          if (!error.message.startsWith('Metric basis unresolved')) throw error;
          unresolved.push({workoutId: workout.id, index, sourceId: original.id, sourceName: original.name, reason: error.message}); continue;
        }
        exercise.id = target.id; exercise.name = target.name;
        const basisLabels = {total_external: 'Вес указан общий', per_hand: 'Вес каждой гантели; не сумма', plates_only: 'Только добавленные блины; без массы тела и рычага', machine_display: 'Вес как на шкале тренажёра', assistance: 'Вес помощи, не внешняя нагрузка'};
        const semanticNote = [basisLabels[decision.loadBasis], decision.semanticLabel].filter(Boolean).join('. ');
        const annotations = [original.name !== target.name ? 'Название в источнике: ' + original.name : null, semanticNote].filter(Boolean);
        if (decision.semanticLabel !== undefined && (typeof decision.semanticLabel !== 'string' || decision.semanticLabel.length > 500)) throw Error('Invalid occurrence semantic label');
        if (annotations.length) exercise.notes = [original.notes || '', 'Импорт Strong: ' + annotations.join('. ')].filter(Boolean).join('\n');
        exercise.strongImport = {v: 1, sourceId: original.id, sourceName: original.name, semanticNote, groupIndex: index, loadBasis: decision.loadBasis || 'unknown', evidence: decision.evidence};
        used.add(target.id);
      }
      workout.strongImport = {v: 1, format: 'Strong CSV', fileSHA256: input.fileSHA256, sourceWorkoutHash: sourceHash, rawArchiveIncluded: false};
      incoming.push(workout);
    }
    for (const id of proposed.keys()) if (!used.has(id)) throw Error('Unrequested unused new definition');
    const existing = new Map(current.workouts.map(workout => [workout.id, workout]));
    if (existing.size !== current.workouts.length) throw Error('Duplicate current workout ID');
    const adds = [], skips = [];
    for (const workout of incoming) {
      const prior = existing.get(workout.id);
      if (!prior) adds.push(workout);
      else if (await digest(prior) === await digest(workout)) skips.push(workout.id);
      else conflicts.push({workoutId: workout.id, reason: 'Same workout ID has different content; no overwrite'});
    }
    const out = {
      version: 1, sourceFileSHA256: input.fileSHA256, expectedCurrent: await digest(current), expectedLibrary: await digest(effectiveLibrary),
      counts: {sourceWorkouts: incoming.length, groups: incoming.reduce((n, workout) => n + workout.exercises.length, 0), sets: incoming.reduce((n, workout) => n + workout.exercises.reduce((m, exercise) => m + exercise.sets.length, 0), 0), add: adds.length, skip: skips.length, newDefinitions: proposed.size},
      addIDs: adds.map(workout => workout.id), unresolved, conflicts, candidate: null,
      warnings: ['Raw Strong rows and historical measurements are not included or cloud-backed by this import.', 'Missing IDs may have been deleted earlier; this preview can propose adding them again. No tombstone history is inferred.']
    };
    if (unresolved.length || conflicts.length) return out;
    const candidate = copy(current);
    candidate.workouts = [...candidate.workouts, ...adds];
    candidate.customExercises = [...candidate.customExercises, ...proposed.values()];
    const roundtrip = snapshot(validateData(copy(candidate)));
    if (await digest(roundtrip.workouts) !== await digest(candidate.workouts) || await digest(roundtrip.customExercises) !== await digest(candidate.customExercises)) throw Error('Native projection would lose imported fields');
    out.candidate = candidate; out.candidateHash = await digest(candidate);
    out.previewHash = await digest({...out, candidate: null});
    return out;
  }
  async function applyNativePreview(currentInput, previewInput, libraryInput, options = {}) {
    const current = snapshot(currentInput), preview = snapshot(previewInput), library = snapshot(libraryInput);
    const confirmed = options.confirmed, previewHash = options.previewHash;
    if (!confirmed || !preview.previewHash || previewHash !== preview.previewHash) throw Error('Explicit current preview confirmation required');
    if (!preview.candidate || preview.unresolved.length || preview.conflicts.length) throw Error('Unresolved preview');
    if (await digest(current) !== preview.expectedCurrent || await digest(library) !== preview.expectedLibrary || await digest(preview.candidate) !== preview.candidateHash) throw Error('Preview changed');
    const clean = {...preview, candidate: null}; delete clean.previewHash;
    if (await digest(clean) !== preview.previewHash) throw Error('Preview metadata changed');
    return copy(preview.candidate);
  }
  async function capacityPreview(args) {
    const {current, candidate, uid, ledger = null, otherStorageBytes = 0, maxBytes = 3 * 1024 * 1024, totalBudget = 4 * 1024 * 1024} = snapshot(args);
    if (typeof uid !== 'string' || !uid || !Number.isSafeInteger(otherStorageBytes) || otherStorageBytes < 0) throw Error('Verified owner/storage accounting required');
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || !Number.isSafeInteger(totalBudget) || totalBudget <= 0) throw Error('Invalid storage budget');
    if (ledger && (ledger.v !== 3 || !Array.isArray(ledger.history) || ledger.uid !== uid || ledger.pending || ledger.held || ledger.legacy)) return {allowed: false, reason: 'Resolve or export protected pending/held recovery first; never discard it for import'};
    const size = value => JSON.stringify(value).length * 2;
    const envelope = {app: 'Happy Sport', version: 1, exportedAt: '2099-12-31T23:59:59.999Z', data: candidate};
    const n = new TextEncoder().encode(JSON.stringify(envelope)).length;
    const row = {user_id: uid, app: 'sport', kind: 'journal', v: 1, iv: 'i'.repeat(24), data: 'x'.repeat(4 * Math.ceil((n + 16) / 3)), at: 9999999999999};
    const baseline = {row, digest: 'd'.repeat(64), data: candidate};
    const pending = {id: 'p'.repeat(36), kind: 'write', status: 'pending', row, digest: 'd'.repeat(64), data: candidate, expected: row, localBackup: candidate, removed: {}};
    let state = ledger ? copy(ledger) : {v: 3, uid, baseline: null, pending: null, held: null, history: [], legacy: null};
    const shapes = [state];
    for (let index = 0; index < 4; index++) {
      shapes.push({...state, pending: {...pending, expected: state.baseline?.row || null}});
      state = {...state, baseline, pending: null, history: [...state.history, {localBackup: candidate, beforeRow: state.baseline?.row || null, kind: 'restore'}].slice(-2)};
      shapes.push(state);
    }
    const projectedLedgerBytes = Math.max(...shapes.map(size)), currentBackupBytes = size(current), localBytes = size(candidate);
    const largest = Math.max(localBytes, ...shapes.map(shape => size(shape.baseline?.data || {})));
    const reserve = Math.max(512 * 1024, 2 * largest + 128 * 1024);
    const peakBytes = otherStorageBytes + localBytes + currentBackupBytes + 4096 + projectedLedgerBytes + reserve;
    const allowed = row.data.length <= 4000000 && projectedLedgerBytes <= maxBytes && peakBytes <= totalBudget;
    return {allowed, reason: allowed ? 'Fits projected ordinary steady state; future growth or unresolved conflicts can still stop sync' : 'Insufficient steady-state native-v5 recovery budget; do not import', expectedCurrent: await digest(current), expectedCandidate: await digest(candidate), expectedLedger: ledger ? await digest(ledger) : null, projectedLedgerBytes, localBytes, currentBackupBytes, reserve, otherStorageBytes, peakBytes, maxBytes, totalBudget};
  }
  /* Adapter contract: lifetime writer lock and shared sync gate are already held.
   * assertContext fences uid/session/key/auth generation/editor+storage revision.
   * All read methods and writeState MUST be synchronous. Optional readLibrary reads
   * the actual current effective library; otherwise the caller's library is checked.
   * readCapacityContext counts all same-origin key/value UTF-16 bytes, excluding only
   * current profile, ledger and this exact transaction's verified backup/probe keys.
   * reserve performs+verifies a physical quota probe and removes it before returning.
   * writeBackup refuses an occupied different protected backup, readBackup reads it.
   * writeState performs the atomic existing profile-store save and updates its fence.
   * No await occurs between the final live fence and that atomic write.
   */
  async function commitNativeImport(adapter, request) {
    const liveLibrary = request.library;
    const preview = snapshot(request.preview), library = snapshot(request.library), capacity = snapshot(request.capacity || null);
    const confirmed = request.confirmed, confirmedPreviewHash = request.confirmedPreviewHash;
    const owner = adapter.owner;
    let committed = false, current, candidate, backup;
    function synchronous(value) { if (value && typeof value.then === 'function') throw Error('Synchronous adapter operation required'); return value; }
    function context(afterCommit = false) {
      synchronous((afterCommit ? adapter.assertContextAfterCommit : adapter.assertContext).call(adapter));
      if (!owner || adapter.owner !== owner) throw Error('Owner mismatch');
    }
    context();
    if (typeof adapter.writeState !== 'function' || Object.prototype.toString.call(adapter.writeState) === '[object AsyncFunction]') throw Error('Synchronous writeState adapter required');
    current = snapshot(synchronous(adapter.readState()));
    if (current.sportOwner && current.sportOwner !== owner) throw Error('Owner mismatch');
    const currentText = canonicalStringify(current), libraryText = canonicalStringify(library);
    function liveFence(capacityText) {
      context();
      if (canonicalStringify(synchronous(adapter.readState())) !== currentText) throw Error('Current journal changed before import');
      if (canonicalStringify(adapter.readLibrary ? synchronous(adapter.readLibrary()) : liveLibrary) !== libraryText) throw Error('Effective library changed');
      if (capacityText !== undefined && canonicalStringify(synchronous(adapter.readCapacityContext())) !== capacityText) throw Error('Capacity context changed or receipt altered');
      context();
    }
    async function guarded(operation) {
      liveFence();
      const value = await operation();
      liveFence();
      return value;
    }
    candidate = snapshot(await guarded(() => applyNativePreview(current, preview, library, {confirmed, previewHash: confirmedPreviewHash})));
    const candidateHash = await guarded(() => digest(candidate)), currentHash = await guarded(() => digest(current));
    if (!capacity?.allowed || capacity.expectedCurrent !== currentHash || capacity.expectedCandidate !== candidateHash) throw Error('Capacity preview unavailable or stale');
    const capacityHash = await guarded(() => digest(capacity));
    async function checkCapacity() {
      liveFence();
      const live = snapshot(synchronous(adapter.readCapacityContext())), liveText = canonicalStringify(live);
      const fresh = await guarded(() => capacityPreview({current, candidate, uid: owner, ledger: live.ledger, otherStorageBytes: live.otherStorageBytes}));
      liveFence(liveText);
      const freshHash = await guarded(() => digest(fresh));
      liveFence(liveText);
      if (!fresh.allowed || freshHash !== capacityHash) throw Error('Capacity context changed or receipt altered');
      return liveText;
    }
    await checkCapacity();
    await guarded(() => adapter.reserve(copy(capacity)));
    await checkCapacity();
    backup = snapshot({v: 1, kind: 'native-strong-pre-import', owner, state: current, digest: currentHash, candidateHash, status: 'prepared'});
    await guarded(() => adapter.writeBackup(copy(backup)));
    await checkCapacity();
    const verified = snapshot(await guarded(() => adapter.readBackup()));
    await checkCapacity();
    if (await guarded(() => digest(verified)) !== await guarded(() => digest(backup))) throw Error('Pre-import backup verification failed');
    const finalCapacityText = await checkCapacity();
    liveFence(finalCapacityText);
    try {
      // From this line onwards, an exception is an uncertain outcome, never retry.
      committed = true;
      synchronous(adapter.writeState(copy(candidate)));
      context(true);
      const readback = snapshot(synchronous(adapter.readState()));
      if (canonicalStringify(readback) !== canonicalStringify(candidate)) throw Error('Local readback mismatch');
      const verifiedHash = await digest(readback);
      context(true);
      if (canonicalStringify(synchronous(adapter.readState())) !== canonicalStringify(candidate) || verifiedHash !== candidateHash) throw Error('Local readback changed');
      return {status: 'local-verified', candidateHash, backupHash: currentHash, cloud: 'not-confirmed'};
    } catch (cause) {
      if (!committed) throw cause;
      const error = Error('Local import outcome uncertain; preserve backup and inspect, do not retry blindly');
      error.code = 'STRONG_IMPORT_OUTCOME_UNCERTAIN'; error.cause = cause;
      error.currentHash = currentHash; error.candidateHash = candidateHash; error.backupHash = backup.digest;
      throw error;
    }
  }
  root.StrongNativeCore = Object.freeze({version: 1, digest, canonicalStringify, occurrenceKey, sourceMetrics, planNativeImport, applyNativePreview, capacityPreview, commitNativeImport});
})(globalThis);
