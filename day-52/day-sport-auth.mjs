/* Unreleased Day → Sport integration. Auth observation only: no refresh or writes. */
export function createDaySportAuth({host, onInvalidate = () => {}}) {
  let generation = 0, disposed = false;
  function invalidate() {
    if (generation === Number.MAX_SAFE_INTEGER) disposed = true;
    else ++generation;
    onInvalidate();
  }
  const lifecycle = host.DaySportLifecycle;
  const validLifecycle = () => lifecycle === host.DaySportLifecycle && lifecycle?.phase === 'day-sport-lifecycle-v1' &&
    ['beginAuth','snapshot','subscribe'].every(name => typeof lifecycle[name] === 'function');
  const unsubscribe = validLifecycle() ? lifecycle.subscribe(invalidate) : () => {};
  function beginAuth() {
    if (!validLifecycle()) { invalidate(); return () => {}; }
    return lifecycle.beginAuth();
  }
  function captureContext() {
    if (disposed || !validLifecycle() || typeof host.clTestPolicy !== 'function') throw Error('authentication-unavailable');
    const transition = lifecycle.snapshot();
    if (!transition || !Number.isSafeInteger(transition.generation) || transition.generation < 0 ||
        transition.pending !== 0 || transition.failed !== false) throw Error('authentication-unavailable');
    host.clTestPolicy(); // Preserve Day's fail-closed transport protection; never refresh.
    const cl = host.CL, profile = host.HappyProfile;
    if (!cl || cl.busy || cl.ready !== true || !cl.s || !cl.ck || !profile ||
        typeof profile.matches !== 'function' || !profile.matches(cl.s.uid) ||
        profile.owner !== cl.s.uid || typeof host.clAssertStoredSession !== 'function' ||
        typeof host.clMemoryFence !== 'function' || typeof host.clPersistedFence !== 'function') {
      throw Error('authentication-unavailable');
    }
    const asserted = host.clAssertStoredSession();
    const memoryFence = host.clMemoryFence(), persistedFence = host.clPersistedFence();
    if (asserted !== cl.authFence || memoryFence !== cl.authFence || persistedFence !== cl.authFence ||
        !profile.matches(cl.s.uid)) throw Error('authentication-unavailable');
    return {owner:cl.s.uid, profileOwner:profile.owner, session:cl.s, key:cl.ck,
      generation, memoryFence, persistedFence};
  }
  function dispose() { disposed = true; unsubscribe(); invalidate(); }
  return Object.freeze({captureContext, beginAuth, invalidate, dispose});
}
