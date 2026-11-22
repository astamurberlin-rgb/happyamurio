export const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error('Missing function configuration');
  return value;
};
export const url = required('SUPABASE_URL').replace(/\/$/, '');
const defaultKey = (name: string, legacy: string): string => {
  const keys = JSON.parse(Deno.env.get(name) || '{}');
  return keys.default || required(legacy);
};
const anon = defaultKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
const serviceRole = defaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');

export async function verify(token: string) {
  const result = await fetch(url + '/auth/v1/user', {
    headers: {apikey: anon, Authorization: 'Bearer ' + token},
    redirect: 'error'
  });
  if (result.status === 401 || result.status === 403) return null;
  if (!result.ok) throw new Error('Auth unavailable');
  return result.json();
}
export async function keyRecord(rpc: string, params: Record<string, unknown>) {
  const result = await fetch(url + '/rest/v1/rpc/' + rpc, {
    method: 'POST',
    headers: {apikey: serviceRole, 'Content-Type': 'application/json',
      ...(serviceRole.startsWith('sb_secret_') ? {} : {Authorization: 'Bearer ' + serviceRole})},
    body: JSON.stringify(params),
    redirect: 'error'
  });
  const row = await result.json();
  if (!result.ok) throw Object.assign(new Error('Key lookup failed'), {code: row.code});
  return row;
}
