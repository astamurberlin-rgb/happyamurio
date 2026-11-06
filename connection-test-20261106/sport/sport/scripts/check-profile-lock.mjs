import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../src/profile-lock.js',import.meta.url),'utf8');
let held=false;
const locks={async request(name,options,fn){assert.equal(options.ifAvailable,true);if(held)return fn(null);held=true;try{return await fn({name})}finally{held=false}}};
function page({supported=true,search='',guardReady=true}={}){
 const events={},elements=[],page={children:[],replaceChildren(){this.children=[]},append(...c){this.children.push(...c)}};
 const context=createContext({SportReadOnlyTest:guardReady?{ready:true}:undefined,URLSearchParams,location:{search,reload(){}},navigator:{locks:supported?locks:null},window:{addEventListener:(n,f)=>events[n]=f},document:{getElementById:id=>id==='page'?page:{textContent:'SYNTHETIC APP'},createElement:tag=>({tag,style:{},addEventListener(){}}),body:{appendChild:node=>elements.push(node)}}});runInContext(source,context);return {context,events,elements,page};
}
const a=page();assert.equal(a.elements.length,1);assert.equal(a.context.SportWriterLock.held,true);
const b=page();assert.equal(b.elements.length,0);assert.match(b.page.children[1].textContent,/другой вкладке/);
a.events.pagehide();await new Promise(resolve=>setImmediate(resolve));assert.equal(held,false);assert.equal(a.context.SportWriterLock.held,false);
const c=page();assert.equal(c.elements.length,1);c.events.pagehide();await new Promise(resolve=>setImmediate(resolve));
const old=page({supported:false});assert.equal(old.elements.length,0);assert.match(old.page.children[1].textContent,/недоступна/);
const embed=page({search:'?embed=measurements'});assert.equal(embed.elements.length,1);assert.equal(held,false);
console.log('Passed: full-journal Web Lock precedes boot/migration, secondary-tab and unsupported-browser blocking, lifecycle release, and separate measurement embed path.');
// No-Web-Locks fallback exports only the saved active profile, without app boot or writes.
{
 const data={version:1,sportOwner:'A',workouts:[{id:'A-private'}]},saved=new Map([['auth_readonly_hd_cloud_v1',JSON.stringify({s:{uid:'A'}})],['auth-readonly-happy-sport-prototype-v1:profile:A',JSON.stringify(data)],['auth-readonly-happy-sport-prototype-v1',JSON.stringify({version:1,sportOwner:'B',workouts:[{id:'B-private'}]})]]);
 const root={children:[],replaceChildren(){this.children=[]},append(...c){this.children.push(...c)}},events=[];let boots=0,writes=0,downloads=0,exported='';
 const c=createContext({URLSearchParams,Date,location:{search:'',reload(){}},navigator:{},window:{},setTimeout(){},localStorage:{getItem:k=>saved.get(k)||null,setItem(){writes++}},Blob:class{constructor(parts){exported=parts.join('')}},URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}},document:{getElementById:id=>id==='page'?root:{textContent:'APP MUST NOT BOOT'},createElement:tag=>({tag,style:{},listeners:{},addEventListener(n,f){this.listeners[n]=f},click(){downloads++}}),body:{appendChild(){boots++}}}});
 runInContext(source,c);const buttons=root.children.filter(n=>n.tag==='button');assert.equal(buttons.length,2);assert.equal(buttons[1].textContent,'Выгрузить сохранённый журнал');buttons[1].listeners.click();assert.equal(JSON.parse(exported).data.workouts[0].id,'A-private');assert.ok(!exported.includes('B-private'));assert.equal(boots,0);assert.equal(writes,0);assert.equal(downloads,1);
}
console.log('Passed: unsupported-lock export-only fallback preserves storage, does not boot or authenticate, and excludes another account\'s legacy data.');
// Delayed fallback clicks are fenced by the exact session/key and rendering generation.
function readonlyFixture(){
 const initial={s:{uid:'A',at:'fixture-access-A',rt:'fixture-refresh-A'},k:'fixture-key-A'},saved=new Map([['auth_readonly_hd_cloud_v1',JSON.stringify(initial)],['auth-readonly-happy-sport-prototype-v1:profile:A',JSON.stringify({version:1,sportOwner:'A',workouts:[{id:'A-private',title:'old'}]})],['auth-readonly-happy-sport-prototype-v1:profile:B',JSON.stringify({version:1,sportOwner:'B',workouts:[{id:'B-private'}]})]]);
 const root={children:[],replaceChildren(){this.children=[]},append(...nodes){this.children.push(...nodes)}},events={},downloads=[],blobs=new Map();let writes=0,boots=0,revokes=0,urlHook=null,blob;
 const c=createContext({URLSearchParams,Date,location:{search:'',reload(){}},navigator:{},window:{addEventListener:(name,fn)=>events[name]=fn},setTimeout(){},localStorage:{getItem:k=>saved.get(k)??null,setItem(){writes++}},Blob:class{constructor(parts){blob=parts.join('')}},URL:{createObjectURL(){const url='blob:fixture-'+blobs.size;blobs.set(url,blob);urlHook?.();return url},revokeObjectURL(url){revokes++;blobs.delete(url)}},document:{getElementById:id=>id==='page'?root:{textContent:'MUST NOT BOOT'},createElement:tag=>({tag,style:{},listeners:{},addEventListener(n,f){this.listeners[n]=f},click(){if(tag==='a')downloads.push(JSON.parse(blobs.get(this.href)))}}),body:{appendChild(){boots++}}}});
 runInContext(source,c);return {saved,root,events,downloads,initial,c,buttons:()=>root.children.filter(n=>n.tag==='button'&&n.textContent.startsWith('Выгрузить')),setUrlHook:fn=>urlHook=fn,stats:()=>({writes,boots,revokes,urls:blobs.size})};
}
for(const change of ['logout','account','same-uid-session','same-uid-key','same-uid-refresh']){
 const e=readonlyFixture(),stale=e.buttons()[0],next=JSON.parse(JSON.stringify(e.initial));
 if(change==='logout')e.saved.set('auth_readonly_hd_cloud_v1',JSON.stringify({s:null,k:null}));
 else{if(change==='account')next.s.uid='B';if(change==='same-uid-session')next.s.at='new-fixture-access';if(change==='same-uid-key')next.k='new-fixture-key';if(change==='same-uid-refresh')next.s.rt='new-fixture-refresh';e.saved.set('auth_readonly_hd_cloud_v1',JSON.stringify(next));}
 stale.listeners.click();assert.equal(e.downloads.length,0,change);assert.equal(e.stats().urls,0,change);assert.equal(e.stats().boots,0);assert.equal(e.stats().writes,0);
 if(change!=='logout'){const fresh=e.buttons()[0];assert.notEqual(fresh,stale);fresh.listeners.click();assert.equal(e.downloads.length,1);assert.equal(e.downloads[0].data.workouts[0].id,change==='account'?'B-private':'A-private');assert.ok(!JSON.stringify(e.downloads[0]).includes('fixture-access'));assert.ok(!JSON.stringify(e.downloads[0]).includes('fixture-key'));}
}
// The same session exports only a fresh, revalidated current journal, never a captured payload.
for(const change of ['replaced','deleted','owner-changed','version-changed','corrupt']){
 const e=readonlyFixture(),button=e.buttons()[0],key='auth-readonly-happy-sport-prototype-v1:profile:A';
 if(change==='replaced')e.saved.set(key,JSON.stringify({version:1,sportOwner:'A',workouts:[{id:'A-new',title:'fresh'}]}));
 if(change==='deleted')e.saved.delete(key);
 if(change==='owner-changed')e.saved.set(key,JSON.stringify({version:1,sportOwner:'B',workouts:[{id:'B-private'}]}));
 if(change==='version-changed')e.saved.set(key,JSON.stringify({version:2,sportOwner:'A'}));
 if(change==='corrupt')e.saved.set(key,'{bad');
 button.listeners.click();assert.equal(e.downloads.length,change==='replaced'?1:0,change);if(change==='replaced')assert.equal(e.downloads[0].data.workouts[0].id,'A-new');assert.equal(e.stats().writes,0);
}
// Storage notifications reset controls; detached buttons remain invalid even after A→B→A.
{
 const e=readonlyFixture(),stale=e.buttons()[0],original=e.saved.get('auth_readonly_hd_cloud_v1');e.saved.set('auth_readonly_hd_cloud_v1',JSON.stringify({s:{uid:'B'},k:'fixture-B'}));e.events.storage({key:'auth_readonly_hd_cloud_v1'});e.saved.set('auth_readonly_hd_cloud_v1',original);e.events.storage({key:'auth_readonly_hd_cloud_v1'});stale.listeners.click();assert.equal(e.downloads.length,0);e.buttons()[0].listeners.click();assert.equal(e.downloads[0].data.workouts[0].id,'A-private');
}
{
 const e=readonlyFixture(),stale=e.buttons()[0];e.events.storage({key:null});stale.listeners.click();assert.equal(e.downloads.length,0);e.saved.clear();e.events.storage({key:null});assert.equal(e.buttons().length,0);stale.listeners.click();assert.equal(e.downloads.length,0);
}
{
 const e=readonlyFixture(),stale=e.buttons()[0];e.saved.set('auth-readonly-happy-sport-prototype-v1:profile:A',JSON.stringify({version:1,sportOwner:'A',workouts:[{id:'A-new'}]}));e.events.storage({key:'auth-readonly-happy-sport-prototype-v1:profile:A'});stale.listeners.click();assert.equal(e.downloads.length,0);e.buttons()[0].listeners.click();assert.equal(e.downloads[0].data.workouts[0].id,'A-new');
}
// A session replacement at URL preparation is checked again before download and revoked.
{
 const e=readonlyFixture();e.setUrlHook(()=>e.saved.set('auth_readonly_hd_cloud_v1',JSON.stringify({s:{uid:'B'},k:'new-fixture-key'})));e.buttons()[0].listeners.click();assert.equal(e.downloads.length,0);assert.equal(e.stats().revokes,1);assert.equal(e.stats().urls,0);
}
console.log('Passed: delayed fallback logout/account/session/key/refresh fences, fresh journal validation, storage-clear and detached-button invalidation, A→B→A generation fence, and pre-download revocation.');

const unsafe=page({guardReady:false});assert.equal(unsafe.elements.length,0);assert.match(unsafe.page.children[1].textContent,/Защита чтения/);unsafe.events.pagehide();await new Promise(resolve=>setImmediate(resolve));
console.log('Passed: absent or failed read-only guard prevents all app boot and authentication.');
