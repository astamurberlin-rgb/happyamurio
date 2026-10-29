/* Offline event/controller checks with a DOM double. This does not render CSS or replace browser QA. */
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8'),memory=new Map();
const attr=(s,k)=>new RegExp('\\b'+k+'="([^"]*)"').exec(s)?.[1]??null;
const decode=s=>String(s??'').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&amp;/g,'&');
function node(tag=''){
 const data={};for(const m of tag.matchAll(/data-([\w-]+)="([^"]*)"/g))data[m[1].replace(/-([a-z])/g,(_,v)=>v.toUpperCase())]=decode(m[2]);
 const attrs={},n={dataset:data,id:attr(tag,'id'),value:decode(attr(tag,'value')),disabled:/\bdisabled\b/.test(tag),checked:/\bchecked\b/.test(tag),hidden:/\bhidden\b/.test(tag),inert:false,textContent:'',classList:{toggle(){}},focus(){},setAttribute(k,v){attrs[k]=v},removeAttribute(k){delete attrs[k]},getAttribute(k){return attrs[k]},closest(sel){return sel==='button'&&tag.startsWith('<button')?n:null}};return n;
}
let active=null;
const doc={activeElement:null,body:{children:[],appendChild(n){active=n;this.children.push(n)}},createElement(){
 let html='',nodes=[],byId=new Map(),rows=new Map(),listeners={};
 const box={...node(),className:'',set innerHTML(value){html=value;nodes=[...value.matchAll(/<(?:button|input|select|textarea|p|div)\b[^>]*>/g)].map(m=>node(m[0]));byId=new Map(nodes.filter(n=>n.id).map(n=>[n.id,n]));rows=new Map();for(const m of value.matchAll(/<article[^>]*data-field="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)){const controls=[...m[2].matchAll(/<(?:input|select|textarea)\b[^>]*data-row="[^"]+"[^>]*>/g)].map(m=>node(m[0])),row={dataset:{field:decode(m[1])},querySelector(sel){const k=/data-row="([^"]+)"/.exec(sel)?.[1];return controls.find(n=>n.dataset.row===k)}};controls.forEach(n=>{n.closest=sel=>sel==='[data-field]'?row:null});rows.set(decode(m[1]),row)}},get innerHTML(){return html},setAttribute(){},addEventListener(k,fn){listeners[k]=fn},querySelector(sel){if(sel==='[aria-invalid="true"]')return nodes.find(n=>n.getAttribute('aria-invalid')==='true')||null;return null},querySelectorAll(sel){if(sel==='[data-up="save"]')return nodes.filter(n=>n.dataset.up==='save');return []},remove(){doc.body.children=doc.body.children.filter(n=>n!==box);active=null},listeners,byId:()=>byId,rows:()=>rows,nodes:()=>nodes};return box;
 },getElementById(id){if(id==='addOwnProduct')return {addEventListener(){}};return active?.byId().get(id)||null},querySelector(){return null},contains(){return false}};
let quota=false;
const c=vm.createContext({document:doc,crypto:webcrypto,Blob,TextEncoder,Intl,URL,clearTimeout,setTimeout,localStorage:{getItem:k=>memory.get(k)||null,setItem(k,v){if(quota){const e=Error('quota');e.name='QuotaExceededError';throw e}memory.set(k,v)}},K:{db:'hdm_db_v1'},DB:{sections:[],foods:[],days:{},propertyDefs:[]},FOODS:{},BLS:{keys:[]},BLS_ST:'ok',blsVal:()=>null,isDrink:()=>false,escH:s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),renderAll(){},renderJournal(){},linkWrite(){},toast(){},jrShareBlob(){}});
vm.runInContext('window=globalThis',c);vm.runInContext(await read('shared/meal-products-model.js'),c);c.document=undefined;vm.runInContext(await read('meal/report.js'),c);c.document=doc;
c.rawGet=async k=>memory.get(k)||null;c.rebuildLib=()=>{c.FOODS=Object.fromEntries(c.DB.foods.map(f=>[f.id,f]))};
vm.runInContext(await read('meal/user-products.js'),c);
function change(id,value){const t=doc.getElementById(id);assert.ok(t,`visible controller input ${id}`);t.value=value;active.listeners.input({target:t,type:'input'})}
function action(act){const t=active.nodes().find(n=>n.dataset.up===act);assert.ok(t,`action ${act}`);active.listeners.click({target:t})}
function rowChange(key,field,value){const row=active.rows().get(key);assert.ok(row,`row ${key}`);const t=row.querySelector(`[data-row="${field}"]`);assert.ok(t,field);assert.ok(!t.disabled);t.value=value;active.listeners.change({target:t,type:'change'})}
async function settled(){await new Promise(resolve=>setImmediate(resolve))}
await c.MealProductEditor.create('');change('upName','Кизил — местный сорт');rowChange('kcal','status','value');rowChange('kcal','value','50');
change('upNotes','Местный образец <без разметки>');change('upPortionName','горсть');change('upPortionGrams','60');action('portion-add');change('upPortionLabel0','моя горсть');change('upPortion0','65');
action('library');change('upPropertyName','Антоцианы');change('upPropertyUnit','мг');change('upPropertyValue','120');doc.getElementById('upPropertyCategory').value='phy';action('new-property');
assert.ok(active.innerHTML.includes('Антоцианы'));assert.ok(!active.innerHTML.includes('data-up="coefficient"'));assert.equal(c.DB.foods.length,0);
action('save');await settled();assert.equal(active,null);assert.equal(c.DB.foods.length,1);assert.equal(c.DB.foods[0].k,50);assert.equal(c.DB.foods[0].composition.fields.find(f=>f.kind==='custom').value,120);
assert.equal(c.DB.foods[0].por['моя горсть'],65);assert.equal(c.DB.foods[0].notes,'Местный образец <без разметки>');
const id=c.DB.foods[0].id,saved=memory.get(c.K.db);assert.equal(JSON.parse(saved).foods[0].n,'Кизил — местный сорт');
await c.MealProductEditor.edit(c.DB.foods[0]);change('upName','Несохранённое название');action('cancel');assert.ok(!doc.getElementById('upLeave').hidden);action('discard');assert.equal(memory.get(c.K.db),saved);assert.equal(c.DB.foods[0].n,'Кизил — местный сорт');
await c.MealProductEditor.edit(c.DB.foods[0]);const pro=doc.getElementById('upPro');pro.checked=true;active.listeners.change({target:pro,type:'change'});assert.ok(active.innerHTML.includes('data-up="coefficient"'));assert.ok(active.innerHTML.includes('Версия 1'));action('select-all');change('upFactor','0,8');action('coefficient');action('save');await settled();assert.equal(c.DB.foods[0].k,40);assert.equal(c.DB.foods[0].composition.fields.find(f=>f.kind==='custom').value,96);assert.equal(c.DB.foods[0].revision,2);
await c.MealProductEditor.edit(c.DB.foods[0]);change('upName','Не должно сохраниться');quota=true;action('save');await settled();assert.ok(active);assert.match(doc.getElementById('upStatus').textContent,/нет места/);assert.equal(c.DB.foods[0].n,'Кизил — местный сорт');quota=false;action('discard');
await c.MealProductEditor.edit(c.DB.foods[0]);const other=JSON.parse(memory.get(c.K.db));other.foods[0].revision++;memory.set(c.K.db,JSON.stringify(other));change('upRegion','Тест');action('save');await settled();assert.match(doc.getElementById('upStatus').textContent,/другом окне/);assert.ok(active);action('discard');
assert.equal(c.DB.foods[0].id,id);
c.searchLib=()=>[{id:'base:cherry',n:'Вишня',src:'Test',k:55,p:1,f:0.5,c:12,por:{горсть:60}}];
await c.MealProductEditor.create('Новый сорт');change('upNotes','Свои заметки');change('upPortionName','чашка');change('upPortionGrams','150');action('portion-add');action('copy-from');change('upCopyQ','вишня');active.listeners.click({target:node('<button data-up="copy-pick" data-id="base:cherry">')});action('copy-apply');
assert.equal(doc.getElementById('upName').value,'Новый сорт');assert.equal(doc.getElementById('upNotes').value,''); // DOM double does not parse textarea content.
assert.ok(active.innerHTML.includes('Свои заметки'));assert.equal(doc.getElementById('upPortion0').value,'150');assert.ok(active.innerHTML.includes('Вишня'));action('share');assert.ok(active.innerHTML.includes('Новый сорт'));assert.ok(active.innerHTML.includes('Свои заметки'));assert.ok(active.innerHTML.includes('чашка = 150 г'));assert.ok(active.innerHTML.includes('55 ккал'));action('back');action('discard');

console.log('Passed offline controller checks: Free create/custom property/save/reopen; cancel with draft retention; Pro selected coefficients/history; durable storage failure leaves draft intact; stale persisted revision rejects overwrite. CSS, focus geometry and touch interaction remain unverified.');
