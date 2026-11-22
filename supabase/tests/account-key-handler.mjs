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
