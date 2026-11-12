// H129: a separate authenticated write channel. The original files reader is unchanged.
export const MAX_CONTENT_BYTES = 2_000_000;
export const ORIGIN = 'https://astamurberlin-rgb.github.io';
export function createHandler({ authenticate, update, create }) {
  return async function handle(req) {
    const headers = {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Access-Control-Allow-Origin': ORIGIN, 'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, x-notes-key'
    };
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    const origin = req.headers.get('origin');
    if (origin && origin !== ORIGIN) return reply({ error: 'origin' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return reply({ error: 'method' }, 405);
    const key = req.headers.get('x-notes-key') || '';
    if (!key || key.length > 2048 || !await authenticate(key)) return reply({ error: 'unauthorized' }, 401);
    if (!req.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'content_type' }, 415);
    // Bound the streamed body too; Content-Length alone is not trustworthy.
    let body;
    try {
      const reader = req.body?.getReader();
      if (!reader) return reply({ error: 'invalid' }, 400);
      let size = 0; const chunks = [];
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > MAX_CONTENT_BYTES + 100_000) { await reader.cancel(); return reply({ error: 'too_large' }, 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let at = 0;
      for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
      body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch { return reply({ error: 'invalid' }, 400); }
    if (!body || typeof body !== 'object' || typeof body.path !== 'string' ||
        body.path.length > 300 || !/^[a-zA-Z0-9_./-]+\.md$/.test(body.path) || body.path.includes('..') || body.path.startsWith('/') ||
        typeof body.content !== 'string' || body.content.includes('\0') || !body.content.trim()) return reply({ error: 'invalid' }, 400);
    if (new TextEncoder().encode(body.content).length > MAX_CONTENT_BYTES) return reply({ error: 'too_large' }, 413);
    try {
      if (body.mode === 'create') {
        if (!/^personal\/[0-9a-f-]{36}\.md$/.test(body.path) || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 180) return reply({ error: 'invalid' }, 400);
        return reply({ document: await create(body.path, body.title.trim(), body.content) });
      }
      if (body.mode !== 'update' || !Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 1) return reply({ error: 'invalid' }, 400);
      return reply({ document: await update(body.path, body.expectedVersion, body.content) });
    } catch (err) {
      if (err.code === '40001' || err.code === '23505') return reply({ error: 'conflict' }, 409);
      if (err.code === 'P0002') return reply({ error: 'not_found' }, 404);
      // Do not log document text, request bodies, keys or SQL parameters.
      return reply({ error: 'server' }, 500);
    }
  };
}
