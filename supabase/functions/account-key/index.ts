import { AwsClient } from 'npm:aws4fetch@1.0.20';
import { createHandler } from './handler.mjs';

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error('Missing function configuration');
  return value;
};
const url = required('SUPABASE_URL').replace(/\/$/, '');
const defaultKey = (name: string, legacy: string): string => {
  const keys = JSON.parse(Deno.env.get(name) || '{}');
  return keys.default || required(legacy);
};
const anon = defaultKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
const serviceRole = defaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');

async function verify(token: string) {
  const result = await fetch(url + '/auth/v1/user', {
    headers: {apikey: anon, Authorization: 'Bearer ' + token},
    redirect: 'error'
  });
  if (result.status === 401 || result.status === 403) return null;
  if (!result.ok) throw new Error('Auth unavailable');
  return result.json();
}
async function keyRecord(params: Record<string, unknown>) {
  const result = await fetch(url + '/rest/v1/rpc/happy_account_key', {
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
function context(owner: string, version: number) {
  return {project: url, account: owner, key_version: String(version)};
}
async function kms(keyId: string, operation: string, params: Record<string, unknown>) {
  // Pin the partition and use a full key ARN. On decrypt use the ARN stored
  // alongside the envelope, so a future wrapping key does not strand old rows.
  const region = /^arn:aws:kms:([a-z0-9-]+):[0-9]{12}:key\/[a-fA-F0-9-]+$/.exec(keyId)?.[1];
  if (!region) throw new Error('Invalid KMS key ARN');
  const aws = new AwsClient({
    accessKeyId: required('HAPPY_AWS_ACCESS_KEY_ID'),
    secretAccessKey: required('HAPPY_AWS_SECRET_ACCESS_KEY'),
    sessionToken: Deno.env.get('HAPPY_AWS_SESSION_TOKEN'),
    service: 'kms', region,
    retries: 2
  });
  const result = await aws.fetch('https://kms.' + region + '.amazonaws.com/', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': 'TrentService.' + operation},
    body: JSON.stringify({KeyId: keyId, ...params}),
    redirect: 'error'
  });
  if (!result.ok) throw new Error('KMS request failed');
  return result.json();
}
async function generate(owner: string, version: number) {
  const keyId = required('HAPPY_KMS_KEY_ARN');
  const generated = await kms(keyId, 'GenerateDataKeyWithoutPlaintext', {
    KeySpec: 'AES_256', EncryptionContext: context(owner, version)
  });
  if (!generated.CiphertextBlob || generated.KeyId !== keyId) throw new Error('Invalid KMS result');
  return {p_ciphertext: generated.CiphertextBlob, p_kms_key_id: keyId};
}
async function unwrap(owner: string, record: {kmsKeyId: string; ciphertext: string; keyVersion: number}) {
  const result = await kms(record.kmsKeyId, 'Decrypt', {
    CiphertextBlob: record.ciphertext, EncryptionContext: context(owner, record.keyVersion)
  });
  if (result.KeyId !== record.kmsKeyId) throw new Error('Unexpected wrapping key');
  return result.Plaintext;
}
Deno.serve(createHandler({verify, keyRecord, generate, unwrap}));
