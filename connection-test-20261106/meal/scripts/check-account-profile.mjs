import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../shared/happy-ui.js',import.meta.url),'utf8');
function fixture(){
 const calls=[],saved=[],user={id:'test-user',user_metadata:{display_name:'First',unrelated:'keep'}};
 let offline=false,unauthorized=false;
 const ctx=createContext({Date,AbortSignal,CL:{s:{uid:user.id,name:'Old'},ck:'unchanged-key'},CLOUD:{url:'https://test.invalid',key:'public-test-key'},clToken:async force=>{calls.push({refresh:force});return 'test-token'},clStore:async()=>saved.push(ctx.CL.s.name),fetch:async(url,opts)=>{
 calls.push({url,...opts});if(offline)throw Error('offline');if(unauthorized){unauthorized=false;return {status:401,ok:false,json:async()=>({})}}
 if(opts.method==='PUT')Object.assign(user.user_metadata,JSON.parse(opts.body).data);
 return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(user))};}});
 runInContext(source,ctx);return {ctx,ui:ctx.HappyUI,calls,saved,user,offline(v){offline=v},unauthorized(){unauthorized=true}};
}
const f=fixture();
const fields={email:{value:' test@example.invalid '},password:{value:'test-password',type:'password'},display_name:{value:'New'}};
const a={state:f.ctx.CL,box:()=>({querySelector:s=>fields[s.match(/name="([^"]+)"/)[1]]||null}),paint(){},afterSignIn:async()=>{},refresh:async()=>{},signIn:async(...args)=>{f.calls.push({login:args});return 'ok'}};
let html=f.ui.account({draft:{},connected:false});assert.ok(!html.includes('name="display_name"'));assert.ok(html.includes('data-cl="register"'));
await f.ui.act('register',a);html=f.ui.account({draft:{},connected:false});assert.ok(html.includes('name="display_name"'));assert.ok(html.includes('autocomplete="new-password"'));assert.equal(f.calls.length,0);
await f.ui.act('up',a);assert.deepEqual(Array.from(f.calls.find(x=>x.login).login),['test@example.invalid','test-password','up','New']);
await f.ui.refreshProfile(true);assert.equal(f.ctx.CL.s.name,'First');
await f.ui.saveProfile('  Amurio  ');assert.equal(f.ctx.CL.s.name,'Amurio');assert.equal(f.user.user_metadata.unrelated,'keep');assert.equal(f.ctx.CL.ck,'unchanged-key');
let put=f.calls.filter(x=>x.method==='PUT').at(-1);assert.deepEqual(JSON.parse(put.body),{data:{display_name:'Amurio'}});assert.ok(!put.body.includes('password'));
f.user.user_metadata.display_name='Changed elsewhere';await f.ui.refreshProfile(true);assert.equal(f.ctx.CL.s.name,'Changed elsewhere');
await f.ui.saveProfile('');assert.equal(f.ctx.CL.s.name,'');
f.offline(true);await assert.rejects(f.ui.saveProfile('No network'),/интернет/);assert.equal(f.ctx.CL.s.name,'');f.offline(false);
f.unauthorized();await f.ui.saveProfile('Retry');assert.ok(f.calls.some(x=>x.refresh===true));assert.equal(f.ctx.CL.s.name,'Retry');
await assert.rejects(f.ui.saveProfile('x'.repeat(61)),/60/);
// Late response from the previous account must not change the new session.
let resolve;f.ctx.fetch=()=>new Promise(r=>resolve=r);let pending=f.ui.saveProfile('Late');await new Promise(r=>setTimeout(r,0));f.ctx.CL.s={uid:'other',name:'Other'};resolve({ok:true,status:200,json:async()=>f.user});await assert.rejects(pending,/Аккаунт изменился/);assert.equal(f.ctx.CL.s.name,'Other');
// An older GET cannot overwrite a later successful rename.
const g=fixture();let release;g.ctx.fetch=async(url,o)=>o.method==='GET'?new Promise(r=>release=r):{ok:true,status:200,json:async()=>({id:'test-user',user_metadata:{display_name:'Fresh'}})};
let old=g.ui.refreshProfile(true);await new Promise(r=>setTimeout(r,0));await g.ui.saveProfile('Fresh');release({ok:true,status:200,json:async()=>({id:'test-user',user_metadata:{display_name:'Stale'}})});await old;assert.equal(g.ctx.CL.s.name,'Fresh');
console.log('Passed: separate login/registration, optional metadata name, shared server read/write, empty name, no password/key/diary writes, offline preservation, token retry, account-switch and late-read protection.');
