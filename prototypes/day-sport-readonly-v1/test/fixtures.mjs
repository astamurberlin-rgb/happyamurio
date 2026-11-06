import {webcrypto} from 'node:crypto';
export const NOW = 1_800_000_000_000;
export const owner = 'synthetic-owner-a';
export const crypto = webcrypto;
export const makeKey = () => crypto.subtle.generateKey({name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
export function journal(measurements = []) {
  return {app:'Happy Sport',version:1,exportedAt:'2026-11-06T00:00:00Z',data:{version:1,
    workouts:[],measurements,customExercises:[],templates:[],active:null,
    energy:{burn:0,intake:0,steps:0,training:0,minutes:0}}};
}
export async function encryptedRow(payload, key, options = {}) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const uid = options.owner || owner;
  const plaintext = options.plaintext ?? JSON.stringify(payload);
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,
    additionalData:new TextEncoder().encode(options.aad || uid+'|sport|journal')}, key,
    new TextEncoder().encode(plaintext));
  return {user_id:uid,app:'sport',kind:'journal',v:1,at:1234,
    iv:Buffer.from(iv).toString('base64'),data:Buffer.from(ciphertext).toString('base64')};
}
export function context(key) {
  return {owner,profileOwner:owner,key,generation:1,memoryFence:'synthetic-fence-a',persistedFence:'synthetic-fence-a',
    session:{uid:owner,at:'synthetic-access-a',rt:'synthetic-refresh-a',exp:NOW+3_600_000}};
}
export const response = rows => new Response(JSON.stringify(rows), {status:200,headers:{'Content-Type':'application/json'}});
export function deferred() { let resolve, reject; const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}; }
