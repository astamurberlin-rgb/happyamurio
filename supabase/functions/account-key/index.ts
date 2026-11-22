// The private Meal test runs entirely inside the test Supabase project.
import { createHandler } from './handler.mjs';
import { url, verify, keyRecord } from './supabase.ts';
import { vaultEnvelope } from './vault.mjs';

Deno.serve(createHandler({
  verify,
  keyRecord: (params: Record<string, unknown>) => keyRecord('happy_vault_account_key', params),
  ...vaultEnvelope(url)
}));
