import postgres from 'npm:postgres@3.4.3';
import { createHandler } from './handler.mjs';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL') ?? '', { prepare: false, max: 1, idle_timeout: 20 });
const fields = sql`path, title, content, version::text as version, updated_at, updated_by`;
const handler = createHandler({
  async authenticate(key: string) {
    // Reuse the existing private verifier. No key or credential verifier is
    // embedded in this public source. HEAD returns no document body.
    // Rotating the existing files key also revokes write access automatically.
    try {
      const url = new URL(`${Deno.env.get('SUPABASE_URL')}/functions/v1/files/README.md`);
      url.searchParams.set('key', key);
      const response = await fetch(url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(10000) });
      return response.status === 200;
    } catch { return false; }
  },
  async update(path: string, version: number, content: string) {
    return await sql.begin(async tx => {
      const [current] = await tx`select ${fields} from ai_shared.documents where path=${path} for update`;
      if (!current) throw { code: 'P0002' };
      // A retry after a lost response must not create a second version.
      if (current.content === content) return current;
      await tx`select * from ai_shared.save_document(${path}, ${version}, ${content}, 'Астамур')`;
      const [saved] = await tx`select ${fields} from ai_shared.documents where path=${path}`;
      return saved;
    });
  },
  async create(path: string, title: string, content: string) {
    return await sql.begin(async tx => {
      await tx`insert into ai_shared.documents (path,title,content,updated_by) values (${path},${title},${content},'Астамур') on conflict (path) do nothing`;
      const [saved] = await tx`select ${fields} from ai_shared.documents where path=${path}`;
      if (saved.content !== content || saved.title !== title) throw { code: '23505' };
      return saved;
    });
  }
});
Deno.serve(handler);
