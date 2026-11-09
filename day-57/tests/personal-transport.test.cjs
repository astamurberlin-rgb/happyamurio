'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const test=require('node:test'),assert=require('node:assert/strict');
const code=fs.readFileSync(path.join(__dirname,'../auth-read-only.js'),'utf8');
const uid='11111111-1111-4111-8111-111111111111';
const base='https://astamurberlin-rgb.github.io/happyamurio/day-52/';
const page=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const counterSource=page.match(/<script id="hd-food-adapter" src="([^"]+)"/)[1];
function setup(bundled=false,owner=uid){
  const uid=owner;
  const requestLog=[],elements={};
  const element=(id,name)=>elements[id]={id,src:bundled?'data:text/javascript;base64,QQ==':new URL(name,base).href};
  const auth=element('hd-auth-transport','auth-read-only.js');
  const journal=element('hd-journal-adapter','day-journal-sync.js');
  const counters=element('hd-food-adapter',counterSource);
  const CL={s:{uid,at:'synthetic-token',rt:'synthetic-refresh',exp:123},ck:{},kraw:'key',authGeneration:'login-1'};
  const stored=JSON.stringify({s:CL.s,k:CL.kraw,g:CL.authGeneration});
  const realm={URL,Headers,AbortController,setTimeout,clearTimeout,CL,CLOUD:{url:'https://geqziziycpclhnucnsyx.supabase.co',key:'public-test-key'},
    location:{href:base},localStorage:{getItem:()=>stored},HappyProfile:{matches:owner=>owner===uid},
    document:{currentScript:auth,getElementById:id=>elements[id],addEventListener(){}},
    fetch:async(url,options)=>{requestLog.push({url,options});return {ok:true};}};
  vm.runInNewContext(code,realm);
  const c={owner:uid,generation:1,session:CL.s,key:CL.ck};
  function bind(){realm.document.currentScript=journal;return realm.HappyAuthReadOnly.bindJournalAdapter({context:()=>c,guard(){},packet(){}});}
  return {realm,c,journal,counters,bind,requestLog};
}
for(const bundled of [false,true]){
  test(`${bundled?'single HTML':'site'}: exact owner and conditional journal write only`,async()=>{
    const f=setup(bundled),policy=f.realm.HappyAuthReadOnly;
    assert.equal(policy.canWriteDay(uid),true);assert.equal(policy.canWriteDay('someone-else'),false);
    await assert.rejects(f.realm.fetch('https://geqziziycpclhnucnsyx.supabase.co/rest/v1/app_sync',{method:'POST'}));
    await assert.rejects(f.realm.fetch('https://hukwmanrupbbgliwiwgy.supabase.co/rest/v1/app_sync',{method:'GET'}));
    const channel=f.bind();
    assert.throws(()=>f.bind());
    const row={user_id:uid,app:'day',kind:'journal',v:1,iv:'B'.repeat(16),data:'QQ==',at:2};
    await channel.begin(f.c,()=>{}).send(JSON.stringify(row),'synthetic-token',{at:1,iv:'A'.repeat(16),digest:'b'.repeat(64)});
    assert.equal(f.requestLog.length,1);assert.equal(f.requestLog[0].options.method,'PATCH');
    const url=new URL(f.requestLog[0].url);
    assert.equal(url.hostname,'geqziziycpclhnucnsyx.supabase.co');
    assert.equal(url.searchParams.get('user_id'),'eq.'+uid);assert.equal(url.searchParams.get('app'),'eq.day');
    assert.equal(url.searchParams.get('kind'),'eq.journal');assert.equal(url.searchParams.get('at'),'eq.1');
    assert.equal(url.searchParams.get('iv'),'eq.'+'A'.repeat(16));
    await assert.rejects(channel.begin(f.c,()=>{}).send(JSON.stringify({...row,user_id:'someone-else'}),'synthetic-token',null));
    const stale=channel.begin(f.c,()=>{});f.realm.CL.kraw='changed-key';
    await assert.rejects(stale.send(JSON.stringify(row),'synthetic-token',null));
    assert.equal(f.requestLog.length,1);
  });
  test(`${bundled?'single HTML':'site'}: unrecognized script cannot claim the channel`,()=>{
    const f=setup(bundled);f.realm.document.currentScript={id:'wrong-script',src:bundled?'data:text/javascript;base64,QQ==':base+'wrong.js'};
    assert.throws(()=>f.realm.HappyAuthReadOnly.bindJournalAdapter({context:()=>f.c,guard(){},packet(){}}));
    assert.throws(()=>f.realm.HappyAuthReadOnly.bindFoodCounterAdapter());
    if(!bundled){
      f.realm.document.currentScript={id:'hd-food-adapter',src:new URL('../shared/food-counters.js',base).href};
      assert.throws(()=>f.realm.HappyAuthReadOnly.bindFoodCounterAdapter());
    }
    f.realm.document.currentScript=f.counters;
    assert.equal(typeof f.realm.HappyAuthReadOnly.bindFoodCounterAdapter(),'function');
  });
}
test('standalone transport is identical to the tested source and all script resources are embedded',()=>{
  const release=path.basename(path.join(__dirname,'..')),html=fs.readFileSync(path.join(__dirname,'../Happy-Day-'+release.split('-')[1]+'.html'),'utf8');
  const transport=html.match(/<script id="hd-auth-transport" src="data:text\/javascript;base64,([^"]+)"/);
  assert.ok(transport);assert.equal(Buffer.from(transport[1],'base64').toString(),code);
  for(const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g))assert.ok(m[1].startsWith('data:text/javascript;base64,'));
  assert.ok(!html.includes('sb_publishable_XJ7dN8-Xq95uzIAJgF8QmA_FMwAdBPn'));
});

for(const bundled of [false,true]){
 test(`${bundled?'single HTML':'site'}: another account can save its own first journal`,async()=>{
  const owner='22222222-2222-4222-8222-222222222222',f=setup(bundled,owner),channel=f.bind();
  assert.equal(f.realm.HappyAuthReadOnly.canWriteDay(owner),true);assert.equal(f.realm.HappyAuthReadOnly.canWriteDay(uid),false);
  const row={user_id:owner,app:'day',kind:'journal',v:1,iv:'B'.repeat(16),data:'QQ==',at:2};
  await channel.begin(f.c,()=>{}).send(JSON.stringify(row),'synthetic-token',null);
  assert.equal(f.requestLog[0].options.method,'POST');assert.equal(JSON.parse(f.requestLog[0].options.body).user_id,owner);
  assert.equal(f.requestLog[0].options.headers.Prefer,'resolution=ignore-duplicates,return=representation');
 });
}
test('signup is allowed, while profile update changes only the current display name',async()=>{
 const f=setup(),url='https://geqziziycpclhnucnsyx.supabase.co/auth/v1/';
 await f.realm.fetch(url+'signup',{method:'POST',body:JSON.stringify({email:'synthetic@example.invalid',password:'synthetic-only'})});
 const options={method:'PUT',headers:{Authorization:'Bearer synthetic-token'},body:JSON.stringify({data:{display_name:'Second profile'}})};
 await f.realm.fetch(url+'user',options);assert.equal(f.requestLog.length,2);
 for(const body of [{password:'new-password'},{email:'other@example.invalid'},{data:{display_name:'Name',admin:true}},{data:{display_name:'x'.repeat(61)}}]){
  await assert.rejects(f.realm.fetch(url+'user',{...options,body:JSON.stringify(body)}));
 }
 await assert.rejects(f.realm.fetch(url+'user',{...options,headers:{Authorization:'Bearer wrong-account'}}));
 f.realm.CL.authGeneration='new-login';await assert.rejects(f.realm.fetch(url+'user',options));
 assert.equal(f.requestLog.length,2);
});
