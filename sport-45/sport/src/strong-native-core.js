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
  root.StrongNativeCore = Object.freeze({version: 1, digest, canonicalStringify, occurrenceKey, sourceMetrics, planNativeImport, applyNativePreview});
})(globalThis);
