// The adapter verifies the Supabase bearer before any claim or owner is used.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff'
};
const reply = (status, body) => new Response(JSON.stringify(body), {status, headers});

function sessionId(token) {
  try {
    const body = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(body)).session_id;
  } catch { return null; }
}

export function createHandler({verify, keyRecord, generate, unwrap, wrapVersion = 1}) {
  return async function handle(request) {
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers});
    if (request.method !== 'POST') return reply(405, {error: 'POST required'});
    const bearer = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') || '');
    if (!bearer) return reply(401, {error: 'Sign in required'});
    let body;
    try { body = await request.json(); } catch { return reply(400, {error: 'Invalid request'}); }
    if (!body || Object.keys(body).length !== 1 || !['open','begin','finish'].includes(body.action)) {
      return reply(400, {error: 'Invalid account key request'});
    }
    try {
      const user = await verify(bearer[1]);
      const session = sessionId(bearer[1]);
      if (!uuid.test(user?.id) || user.is_anonymous || !uuid.test(session)) {
        return reply(401, {error: 'Verified user session required'});
      }
      const params = {p_user: user.id, p_session: session, p_action: body.action};
      let record = await keyRecord(params);
      if (record.state === 'provision') {
        const candidate = await generate(user.id, 2, record);
        // A simultaneous login may have installed a different candidate.
        // Only the persisted winner is ever decrypted or returned.
        record = await keyRecord({...params, ...candidate});
      }
      if (record.state === 'legacy') return reply(200, {state: 'legacy'});
      if (!['migrating','active'].includes(record.state) || record.wrapVersion !== wrapVersion || record.keyVersion !== 2) {
        return reply(409, {error: 'Unsupported account key version'});
      }
      const key = await unwrap(user.id, record);
      if (typeof key !== 'string' || atob(key).length !== 32) throw new Error('Invalid account key');
      return reply(200, {state: record.state, keyVersion: record.keyVersion, key});
    } catch (error) {
      if (error.code === 'HAP03') return reply(401, {error: 'Session expired'});
      if (error.code === 'HAP04') return reply(409, {error: 'Migration incomplete'});
      if (error.code === 'HAP06') return reply(409, {error: 'Unsupported key storage provider'});
      if (error.code === 'HAP05') return reply(409, {error: 'Unsupported cloud document version'});
      return reply(503, {error: 'Account key temporarily unavailable'});
    }
  };
}
