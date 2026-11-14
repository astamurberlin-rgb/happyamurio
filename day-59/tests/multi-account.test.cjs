'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const test=require('node:test'),assert=require('node:assert/strict');
const page=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const profiles=page.slice(page.indexOf('/* A diary belongs to one account.'),page.indexOf('var HappyProfile=HappyProfiles.create("day"'));
assert.ok(profiles.length>1000);
const signup=page.slice(page.indexOf('async function clSignIn('),page.indexOf('async function clSignOut('));
const ui=page.match(/<script id="happy-shared-ui">([\s\S]*?)<\/script>/)[1];
function profile(storage){
 const events={},realm={localStorage:storage,addEventListener:(name,fn)=>events[name]=fn};
 vm.runInNewContext(profiles,realm);
 let reload=0,paused=0;
 const api=realm.HappyProfiles.create('day',{reload:()=>reload++,pause:()=>paused++});
 return {api,realm,events,reloads:()=>reload,pauses:()=>paused};
}
test('guest, account A and account B keep separate journals and recover their own records after returning',async()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const auth=uid=>storage.setItem('happy-auth:day',JSON.stringify({s:uid?{uid,at:'token-'+uid}:null,k:'key-'+uid,g:'login-'+uid}));
 const read=k=>Promise.resolve(storage.getItem(k)),write=(k,v)=>storage.setItem(k,v);
 const guest=profile(storage);await guest.api.write('diary','guest-entry',write);
 auth('A');assert.equal(guest.api.changed('A'),true);assert.equal(guest.api.matches(null),false);
 const a=profile(storage);assert.equal(a.api.getSync('diary'),null);await a.api.write('diary','account-A-entry',write);
 auth(null);a.api.changed(null);const guestAgain=profile(storage);assert.equal(await guestAgain.api.read('diary',read,write),'guest-entry');
 auth('B');const b=profile(storage);assert.equal(await b.api.read('diary',read,write),null);await b.api.write('diary','account-B-entry',write);
 auth('A');const returned=profile(storage);assert.equal(returned.api.getSync('diary'),'account-A-entry');
 assert.equal(storage.getItem('happy-user:B:diary'),'account-B-entry');assert.equal(storage.getItem('diary'),'guest-entry');
});
test('another tab changing account immediately invalidates the old profile',()=>{
 const data=new Map([['happy-auth:day',JSON.stringify({s:{uid:'A',at:'a'},k:'key-A',g:'one'})]]);
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},f=profile(storage);
 assert.equal(f.api.matches('A'),true);
 const next=JSON.stringify({s:{uid:'B',at:'b'},k:'key-B',g:'two'});storage.setItem('happy-auth:day',next);
 f.events.storage({key:'happy-auth:day',newValue:next});
 assert.equal(f.api.matches('A'),false);assert.equal(f.api.matches('B'),false);assert.equal(f.pauses(),1);
});
function authFixture(response){
 const writes=[],requests=[],CL={s:null,ck:null,authFence:'original'};
 const realm={CL,CLOUD:{url:'https://auth.test.invalid'},DB:{guest:true},CFG:{},K:{db:'db',cfg:'cfg'},
  clOn:()=>false,clPersistedFence:()=>CL.authFence,clTestPolicy:()=>({assertAllowed(){}}),
  rawSet:async(k,v)=>writes.push([k,v]),clAuth:async(path,body)=>{requests.push({path,body});return response;},
  clSes:j=>({uid:j.user.id,at:j.access_token}),clDerive:async(pw,uid)=>{CL.ck={uid};},
  clNewGeneration:()=>'new-login',clStore:async()=>writes.push(['auth']),
  HappyProfile:{changed:uid=>{writes.push(['profile',uid]);return true;}}
 };
 realm.window=realm;vm.runInNewContext(signup,realm);
 return {realm,requests,writes,CL};
}
test('registration awaiting email confirmation does not sign in or assign guest data',async()=>{
 const f=authFixture({user:{id:'new-user'}});
 assert.equal(await f.realm.clSignIn('another@example.invalid','synthetic-password','up','Another'),'confirm');
 assert.equal(f.requests[0].path,'signup');assert.equal(f.requests[0].body.data.display_name,'Another');
 assert.equal(f.CL.s,null);assert.ok(!f.writes.some(([key])=>key==='auth'||key==='profile'));
});
test('existing login and immediately confirmed signup activate the returned user, not a fixed account',async()=>{
 for(const mode of ['in','up']){
  const f=authFixture({access_token:'synthetic-token',user:{id:'new-independent-user'}});
  assert.equal(await f.realm.clSignIn('different@example.invalid','synthetic-password',mode,'New'),'reload');
  assert.equal(f.CL.s.uid,'new-independent-user');assert.equal(f.CL.ck.uid,'new-independent-user');
  assert.ok(f.writes.some(([key,uid])=>key==='profile'&&uid==='new-independent-user'));
 }
});
test('registration UI is available, confirmation clears the password and failed signup preserves the form',async()=>{
 const fields={email:{value:'new@example.invalid'},password:{value:'synthetic-password',type:'password'},display_name:{value:'New'}};
 const box={querySelector:selector=>fields[selector.match(/name="([^"]+)"/)[1]]||null};
 const realm={document:{addEventListener(){}},CL:{s:null},AbortSignal};vm.runInNewContext(ui,realm);
 const state={busy:false},actions={state,box:()=>box,paint(){},signIn:async()=>'confirm',afterSignIn:async()=>{throw Error('must not log in');}};
 await realm.HappyUI.act('register',actions);
 assert.match(realm.HappyUI.account({draft:realm.HappyUI.draft(box)}),/new-password/);
 await realm.HappyUI.act('up',actions);assert.equal(fields.password.value,'');assert.match(state.msg,/Подтверди почту/);
 await realm.HappyUI.act('register',actions);fields.password.value='retry-password';
 actions.signIn=async()=>{throw Error('delivery failed');};await realm.HappyUI.act('up',actions);
 assert.equal(state.err,'delivery failed');assert.equal(fields.password.value,'retry-password');assert.equal(state.busy,false);
});
