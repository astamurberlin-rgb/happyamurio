// Run in an empty, disposable PostgreSQL database as its owner (with CREATEROLE).
// HAPPY_TEST_DATABASE_URL=postgresql://... node supabase/tests/account-key-postgres.cjs
// Requires the "pg" Node package. Refuses a database with existing Happy/Auth objects.
const assert = require('node:assert/strict');
const {readFile} = require('node:fs/promises');
const {resolve} = require('node:path');
const {randomUUID} = require('node:crypto');
const {Client} = require('pg');

async function main() {
  const connectionString = process.env.HAPPY_TEST_DATABASE_URL;
  if (!connectionString) throw new Error('Set HAPPY_TEST_DATABASE_URL for a disposable database');
  const client = new Client({connectionString}), writer = new Client({connectionString});
  await Promise.all([client.connect(),writer.connect()]);
  const query = (text, params) => client.query(text,params);
  try {
    assert.equal((await query("select to_regnamespace('auth') or_auth")).rows[0].or_auth,null);
    assert.equal((await query("select to_regclass('public.app_sync') as existing")).rows[0].existing,null);
    await query(`
      create schema auth;
      do $$ begin
        if not exists(select from pg_roles where rolname='anon') then create role anon; end if;
        if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if;
        if not exists(select from pg_roles where rolname='service_role') then create role service_role; end if;
      end $$;
      create table auth.users(id uuid primary key, raw_app_meta_data jsonb, raw_user_meta_data jsonb);
      create table auth.sessions(id uuid primary key, user_id uuid,not_after timestamptz);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    `);
    await query(await readFile(resolve(__dirname,'../app_sync_test_setup.sql'),'utf8'));
    const createUser = async(provider, managed=false) => {
      const uid=randomUUID(), session=randomUUID();
      await query('insert into auth.users values($1,$2,$3)',[uid,{provider},managed?{happy_key_mode:'managed-v1'}:{}]);
      await query('insert into auth.sessions values($1,$2,null)',[session,uid]);
      return {uid,session};
    };
    const rpc = async({uid,session},action='open',candidate=null) => (await query(
      'select public.happy_account_key($1,$2,$3,$4,$5) as result',[uid,session,action,candidate,candidate?'arn-for-test':null])).rows[0].result;
    const old = await createUser('email');
    const schema = await readFile(resolve(__dirname,'../account_key.sql'),'utf8');
    await query(schema);
    const google = await createUser('google'), email = await createUser('email',true);
    const olderClient = await createUser('email'), racing = await createUser('email');
    const insert = (user,kind,version) => query("insert into public.app_sync (user_id,app,kind,v,iv,data,at) values($1,'day',$2,$3,'AAAAAAAAAAAAAAAA','test',1)",[user.uid,kind,version]);

    assert.deepEqual(await rpc(old),{state:'legacy'});
    assert.deepEqual(await rpc(olderClient),{state:'legacy'});
    assert.deepEqual(await rpc(google),{state:'provision'});
    assert.deepEqual(await rpc(email),{state:'provision'});
    await insert(email,'setup',2);
    assert.deepEqual(await rpc(email),{state:'legacy'});
    assert.equal((await rpc(google,'open','first')).state,'active');
    assert.equal((await rpc(google,'open','second')).ciphertext,'first');
    await assert.rejects(rpc({uid:old.uid,session:google.session}),{code:'HAP03'});

    await insert(old,'journal',1); // archived v1 remains usable
    await insert(old,'setup',2);
    assert.equal((await rpc(old,'begin','wrapped')).state,'migrating');
    await assert.rejects(insert(old,'care',2),{code:'HAP01'});
    await assert.rejects(rpc(old,'finish'),{code:'HAP04'});
    assert.equal((await rpc(old)).ciphertext,'wrapped');
    await query("update public.app_sync set v=3 where user_id=$1 and kind='setup'",[old.uid]);
    assert.equal((await rpc(old,'finish')).state,'active');
    assert.equal((await rpc(old,'finish')).ciphertext,'wrapped');
    await assert.rejects(insert(olderClient,'care',3),{code:'HAP02'});
    await insert(olderClient,'future',4);
    await assert.rejects(rpc(olderClient,'begin','candidate'),{code:'HAP05'});
    assert.equal((await rpc(olderClient)).state,'legacy');

    await writer.query('begin');
    await writer.query("insert into public.app_sync (user_id,app,kind,v,iv,data,at) values($1,'meal','setup',2,'AAAAAAAAAAAAAAAA','test',1)",[racing.uid]);
    const waiting = rpc(racing,'begin','raced');
    await writer.query('commit');
    assert.equal((await waiting).state,'migrating');
    await assert.rejects(rpc(racing,'finish'),{code:'HAP04'});

    const fenced = await createUser('email');
    await writer.query('begin');
    await writer.query("select public.happy_account_key($1,$2,'begin','candidate','arn-for-test')",[fenced.uid,fenced.session]);
    const outdated = assert.rejects(insert(fenced,'care',2),{code:'HAP01'});
    await writer.query('commit');
    await outdated;

    await query('set role authenticated');
    await query("select set_config('request.jwt.claim.sub',$1,false)",[google.uid]);
    await assert.rejects(rpc(old),{code:'42501'});
    await assert.rejects(query('select * from happy_private.account_keys'),{code:'42501'});
    assert.deepEqual((await query('select * from public.app_sync where user_id=$1',[old.uid])).rows,[]);
    await assert.rejects(insert(old,'care',3),{code:'42501'});
    await query('reset role');
    await query('delete from auth.sessions where id=$1',[google.session]);
    await assert.rejects(rpc(google),{code:'HAP03'});
    const preVaultNew = await createUser('google');
    // Standard PostgreSQL ships pgcrypto. This private fixture supplies the
    // two Supabase Vault interfaces used by the migration on hosted Postgres.
    await query(`
      create schema vault;
      create table vault.test_secrets(name text primary key,decrypted_secret text);
      create view vault.decrypted_secrets as select * from vault.test_secrets;
      create function vault.create_secret(value text, key_name text, description text) returns uuid
      language plpgsql as $$ begin
        insert into vault.test_secrets values(key_name,value);
        return gen_random_uuid();
      end $$;
    `);
    const vaultBootstrap = await readFile(resolve(__dirname,'../account_key_vault.sql'),'utf8');
    const vaultAPI = await readFile(resolve(__dirname,'../account_key_vault_api.sql'),'utf8');
    await assert.rejects(query(vaultBootstrap),{code:'HAP06'});
    await query('rollback');
    assert.equal((await rpc(old)).ciphertext,'wrapped'); // Original provider still works.
    // This disposable database has just served as the old-provider fixture.
    // Remove only those generated users before simulating the fresh rollout.
    await query('delete from auth.users where id in (select user_id from happy_private.account_keys where ciphertext is not null)');
    await query(vaultBootstrap);
    await query(vaultAPI);
    const vRPC = async({uid,session},action='open',ciphertext=null) => (await query(
      'select public.happy_vault_account_key($1,$2,$3,$4) as result',[uid,session,action,ciphertext])).rows[0].result;
    const secondVault = await createUser('google');
    await query('set role service_role');
    const pending = await vRPC(preVaultNew);
    assert.equal(pending.state,'provision');
    assert.equal(Buffer.from(pending.wrappingKey,'base64').length,32);
    assert.notEqual((await vRPC(secondVault)).wrappingKey,pending.wrappingKey);
    assert.deepEqual(await vRPC(email),{state:'legacy'});
    await assert.rejects(vRPC({uid:preVaultNew.uid,session:secondVault.session}),{code:'HAP03'});
    await assert.rejects(rpc(secondVault),{code:'42501'});
    await assert.rejects(vRPC(preVaultNew,'open','bad'),{code:'22023'});
    const {vaultEnvelope} = await import('../functions/account-key/vault.mjs');
    const envelope = vaultEnvelope('https://private-test.invalid');
    const built = await envelope.generate(preVaultNew.uid,2,pending);
    const created = await vRPC(preVaultNew,'open',built.p_ciphertext);
    assert.equal(created.wrapVersion,2);
    const firstKey = await envelope.unwrap(preVaultNew.uid,created);
    const loser = await envelope.generate(preVaultNew.uid,2,pending);
    assert.equal(await envelope.unwrap(preVaultNew.uid,await vRPC(preVaultNew,'open',loser.p_ciphertext)),firstKey);
    assert.equal((await vRPC(email,'begin',built.p_ciphertext)).state,'migrating');
    await assert.rejects(vRPC(email,'finish'),{code:'HAP04'});
    await query('reset role');
    const keyRow = (await query('select wrap_version,ciphertext from happy_private.account_keys where user_id=$1',[preVaultNew.uid])).rows[0];
    assert.deepEqual(keyRow,{wrap_version:2,ciphertext:built.p_ciphertext});
    // Upgrade an already installed Vault endpoint without rotating its master.
    await query(vaultAPI);
    assert.equal(await envelope.unwrap(preVaultNew.uid,await vRPC(preVaultNew)),firstKey);
    const noData = await createUser('email'), changed = await createUser('email');
    assert.deepEqual(await vRPC(noData),{state:'legacy'});
    const emptyPending = await vRPC(noData,'begin_empty');
    assert.equal(emptyPending.state,'provision');
    const emptyKey = await envelope.generate(noData.uid,2,emptyPending);
    assert.equal((await vRPC(noData,'begin_empty',emptyKey.p_ciphertext)).state,'migrating');
    assert.equal((await vRPC(noData,'finish')).state,'active');
    assert.equal((await vRPC(noData,'begin_empty',built.p_ciphertext)).ciphertext,emptyKey.p_ciphertext);
    const beforeRace = await vRPC(changed,'begin_empty');
    const racedKey = await envelope.generate(changed.uid,2,beforeRace);
    await writer.query('begin');
    await writer.query("insert into public.app_sync (user_id,app,kind,v,iv,data,at) values($1,'meal','setup',2,'AAAAAAAAAAAAAAAA','test',1)",[changed.uid]);
    const blocked = assert.rejects(vRPC(changed,'begin_empty',racedKey.p_ciphertext),{code:'HAP07'});
    await writer.query('commit');
    await blocked;
    assert.deepEqual(await vRPC(changed),{state:'legacy'});
    await query('set role authenticated');
    await query("select set_config('request.jwt.claim.sub',$1,false)",[changed.uid]);
    await insert(changed,'care',2); // Old releases can continue writing after a rejected transition.
    await query('reset role');
    await assert.rejects(vRPC({uid:changed.uid,session:noData.session},'begin_empty'),{code:'HAP03'});
    await query('set role authenticated');
    await assert.rejects(vRPC(preVaultNew),{code:'42501'});
    await assert.rejects(query('select * from vault.decrypted_secrets'),{code:'42501'});
    await query('reset role');
    console.log('Vault SQL passed: session check, two accounts, retry, envelope version, consent, private KEK');
    console.log('PostgreSQL passed: enrollment, wrapping race, fenced writes, retry, versions, RLS and session revocation');
  } finally {
    await Promise.all([client.end(),writer.end()]);
  }
}
module.exports = main;
if (require.main === module) main().catch(e=>{console.error(e);process.exitCode=1;});
