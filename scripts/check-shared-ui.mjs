import {readFile} from 'node:fs/promises';
import {createContext,runInContext,Script} from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const source=await read('shared/happy-ui.js'),css=await read('shared/happy-ui.css');new Script(source);
const context=createContext({Date});runInContext(source,context);const ui=context.HappyUI;
const draft={email:'test@example.invalid',password:'test-only-password',visible:false};
const html=ui.account({draft});assert.ok(html.includes('data-cl="register"'));assert.ok(html.includes('data-happy-ui-submit'));assert.ok(!html.includes('width:100%'));
assert.ok(ui.account({sport:true,draft}).includes('data-happy="register"'));
assert.ok(!ui.account({draft:{email:'"><script>bad()</script>',password:'"&'}}).includes('<script>bad()'));
const connected=ui.account({connected:true,email:'<b>name</b>'});assert.ok(connected.includes('&lt;b&gt;name&lt;/b&gt;'));assert.ok(!connected.includes('name="password"'));
function fixture(overrides={}){
 const fields={email:{value:' TEST@example.invalid '},password:{value:'test-only-password',type:'password'}};
 const state={busy:false,err:'',msg:''},calls=[];
 const adapter={state,box:()=>({querySelector:s=>s.includes('email')?fields.email:fields.password}),paint(){calls.push('paint')},signIn:async(email,pw,mode)=>{calls.push([email,pw,mode]);return 'ok'},signOut(){calls.push('out')},afterSignIn:async()=>{calls.push('after')},refresh:async()=>{calls.push('refresh')},...overrides};
 return {adapter,state,calls,fields};
}
let f=fixture();await ui.act('in',f.adapter);assert.deepEqual(f.calls.find(Array.isArray),['test@example.invalid','test-only-password','in']);assert.ok(f.calls.includes('after'));assert.equal(f.state.busy,false);
f=fixture({signIn:async()=> 'confirm'});await ui.act('up',f.adapter);assert.match(f.state.msg,/Подтверди почту/);assert.ok(!f.calls.includes('after'));assert.equal(f.state.busy,false);
f=fixture({signIn:async()=>{throw Error('Нет сети')}});await ui.act('in',f.adapter);assert.equal(f.state.err,'Нет сети');assert.equal(f.fields.password.value,'test-only-password');assert.equal(f.state.busy,false);
f=fixture();f.fields.password.value='short';await ui.act('up',f.adapter);assert.ok(!f.calls.some(Array.isArray));await ui.act('in',f.adapter);assert.ok(f.calls.some(Array.isArray));
f=fixture();f.state.busy=true;await ui.act('in',f.adapter);assert.equal(f.calls.length,0);
f=fixture();await ui.act('sync',f.adapter);assert.ok(f.calls.includes('refresh'));await ui.act('out',f.adapter);assert.ok(f.calls.includes('out'));
for(const app of ['day','meal']){
 const page=await read(app+'/index.html');assert.ok(page.includes(css));assert.ok(page.includes(source.replaceAll('</','<\\/')));
 const order=[...page.matchAll(/<section[^>]*data-happy-section="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(order,['account','backup','links']);
 const ids=[...page.matchAll(/\bid="([^"\s<>]+)"/g)].map(m=>m[1]).filter(id=>!id.includes('+'));
 for(const id of app==='day'?['clBox','expJson','impJson','expCsv','wipe','backupAge','bkPrev','bkBack']:['clBox','bkIn','bkOut','bkFile','bkWhen'])assert.equal(ids.filter(x=>x===id).length,1,app+': duplicate/missing '+id);
}
const sport=await read('sport/index.html');assert.ok(sport.includes(css));assert.ok(sport.includes(source));
console.log('Passed: shared account UI, escaped input, login/signup/confirmation, duplicate submit guard, offline errors and draft retention; same components and settings order in all apps; backup controls retained once.');
