import assert from 'node:assert/strict';
import {randomBytes, randomUUID} from 'node:crypto';
import {createHandler} from '../functions/account-key/handler.mjs';

export async function checkKeyHandler() {
  const alice = randomUUID(), bob = randomUUID();
  const sessions = new Map(), records = new Map(), kms = new Map();
  let unavailable = false;
  function session(uid) {
    const id = randomUUID();
    const token = 'test.' + Buffer.from(JSON.stringify({session_id:id})).toString('base64url') + '.' + randomUUID();
    sessions.set(token,{uid,id});
    return token;
  }
  const first = session(alice), second = session(alice), stranger = session(bob);
  const handler = createHandler({
    verify(token) { const s = sessions.get(token); return s && {id:s.uid}; },
    keyRecord({p_user,p_session,p_ciphertext}) {
      assert.ok([...sessions.values()].some(s=>s.id===p_session && s.uid===p_user));
      if (p_ciphertext && !records.has(p_user)) {
        records.set(p_user,{ciphertext:p_ciphertext,state:'active',keyVersion:2,wrapVersion:1});
      }
      return records.get(p_user) ?? {state:'provision'};
    },
    generate(owner) {
      const ciphertext = randomUUID();
      kms.set(ciphertext,{owner,raw:randomBytes(32).toString('base64')});
      return {p_ciphertext:ciphertext,p_kms_key_id:'test'};
    },
    unwrap(owner,{ciphertext}) {
      if (unavailable) throw new Error('KMS unavailable');
      const wrapped = kms.get(ciphertext);
      assert.equal(owner,wrapped.owner);
      return wrapped.raw;
    }
  });
  const call = (token,body={action:'open'}) => handler(new Request('https://test.invalid/account-key',{
    method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(body)
  }));
  const [phone,otherPhone] = await Promise.all([call(first),call(second)]);
  assert.equal(phone.status,200);
  assert.equal(phone.headers.get('cache-control'),'no-store');
  const {key} = await phone.json();
  assert.equal(Buffer.from(key,'base64').length,32);
  assert.equal((await otherPhone.json()).key,key);
  assert.notEqual((await (await call(stranger)).json()).key,key);
  assert.equal((await call(stranger,{action:'open',uid:alice})).status,400);
  assert.equal((await call(first.replace(/\.[^.]+$/,'.invalid'))).status,401);
  sessions.delete(first);
  assert.equal((await call(first)).status,401);
  unavailable = true;
  const lost = await call(second);
  assert.equal(lost.status,503);
  assert.deepEqual(await lost.json(),{error:'Account key temporarily unavailable'});
  unavailable = false;
  assert.equal((await (await call(second)).json()).key,key);
  console.log('Account key handler passed: two phones, racing login, second account, revoked session and KMS retry');
}
await checkKeyHandler();

// Exercise the private test provider's real WebCrypto implementation. Capture
// what is persisted and what reaches the browser across two isolated sessions.
import {vaultEnvelope} from '../functions/account-key/vault.mjs';
const project = 'https://private-test.invalid';
const adapter = vaultEnvelope(project), owner = randomUUID(), other = randomUUID();
const wrappingKey = randomBytes(32).toString('base64');
const candidate = await adapter.generate(owner,2,{wrappingKey});
const stored = {ciphertext:candidate.p_ciphertext,keyVersion:2,wrapVersion:2,wrappingKey};
const firstKey = await adapter.unwrap(owner,stored);
assert.equal(Buffer.from(firstKey,'base64').length,32);
assert.equal(Buffer.from(candidate.p_ciphertext,'base64').length,60);
assert.notEqual(candidate.p_ciphertext,firstKey);
assert.notEqual((await adapter.generate(owner,2,{wrappingKey})).p_ciphertext,candidate.p_ciphertext);
await assert.rejects(adapter.unwrap(other,stored));
await assert.rejects(adapter.unwrap(owner,{...stored,keyVersion:3}));
await assert.rejects(vaultEnvelope('https://other.invalid').unwrap(owner,stored));
const tampered = Buffer.from(stored.ciphertext,'base64');
tampered[59] ^= 1;
await assert.rejects(adapter.unwrap(owner,{...stored,ciphertext:tampered.toString('base64')}));
const handler = createHandler({
  verify: () => ({id:owner}),
  keyRecord: () => ({...stored,state:'active'}),
  ...adapter
});
const token = 'test.' + Buffer.from(JSON.stringify({session_id:randomUUID()})).toString('base64url') + '.test';
const response = await handler(new Request(project, {method:'POST',
  headers:{authorization:'Bearer '+token},body:JSON.stringify({action:'open'})}));
assert.deepEqual(await response.json(),{state:'active',keyVersion:2,key:firstKey});
console.log('Vault envelope passed: AES-256-GCM, owner/project/version binding, integrity and private response');

const needsPassword = createHandler({
  verify: () => ({id:owner}),
  keyRecord: () => { throw Object.assign(new Error('Legacy row present'), {code:'HAP07'}); },
  ...adapter
});
const changed = await needsPassword(new Request(project, {method:'POST',
  headers:{authorization:'Bearer '+token},body:JSON.stringify({action:'begin_empty'})}));
assert.equal(changed.status,409);
assert.equal((await changed.json()).code,'legacy_password');
