// Meal 31: ускоренный журнал даёт тот же результат, что журнал Meal 30.
// Два «телефона» под одним аккаунтом и поддельное облако; одни и те же случайные правки проигрываются на коде Meal 30
// (эталон) и на коде Meal 31. Сверяются: записи-заплатки каждого сохранения, документ журнала, дневник на обоих
// телефонах и облачная копия. Отдельно — что без изменений Meal 31 ничего не пишет и не отправляет.
// Запуск из корня репозитория: node meal-31/checks/check-journal-speed.mjs
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import assert from 'node:assert/strict';

const here=new URL('../',import.meta.url),reference=new URL('../../meal-30/',import.meta.url);
const text=async(base,f)=>readFile(new URL(f,base),'utf8');
const SRC={old:{model:await text(reference,'journal-model.js'),sync:await text(reference,'journal-sync.js')},
           new:{model:await text(here,'journal-model.js'),sync:await text(here,'journal-sync.js')}};
const UID='00000000-0000-4000-8000-000000000001';
const key=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);
const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((o,k)=>(o[k]=v[k],o),{}):v);
const clone=x=>JSON.parse(JSON.stringify(x));

function world(kind,seedDb){
 const server={row:null,gets:0,heads:0,puts:0},ls=new Map(),idb=new Map();let tick=1000,ids=0;   // время задаёт шаг проигрывания: у обоих выпусков одни и те же отметки
 const localStorage={get length(){return ls.size},key:i=>[...ls.keys()][i]??null,getItem:k=>ls.has(k)?ls.get(k):null,setItem:(k,v)=>{ls.set(k,String(v))},removeItem:k=>{ls.delete(k)}};
 function device(name){
  const c={console,JSON,Object,Array,Map,Set,Math,Number,String,Promise,Error,TypeError,Uint8Array,TextDecoder,TextEncoder,Blob,Response,
   CompressionStream:globalThis.CompressionStream,DecompressionStream:globalThis.DecompressionStream,crypto:webcrypto,localStorage,
   setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,navigator:{onLine:true},
   document:{hidden:false,getElementById:()=>null,addEventListener:()=>{}},addEventListener:()=>{},
   Date:{now:()=>tick},
   HappyFoodCounters:{id:()=>name+'-'+(++ids)},HappyProfile:{owner:UID,matches:o=>o===UID},
   CL:{s:{uid:UID},ck:key,err:''},clOn:()=>true,K:{db:'hdm_db_v1'},
   clUtf:s=>new TextEncoder().encode(s),clB64:b=>Buffer.from(b).toString('base64'),clUnb64:s=>new Uint8Array(Buffer.from(s,'base64')),
   MealBackup:{validate:()=>true},rebuildLib:()=>{},renderAll:()=>{c.renders++},linkWrite:()=>{},renders:0,writes:0,
   rawGet:async k=>idb.has(name+k)?idb.get(name+k):null,rawSet:async(k,v)=>{c.writes++;idb.set(name+k,v);return v},
   clRest:async(method,query,row)=>{
    if(method==='GET'){if(/select=iv,at/.test(query))server.heads++;else server.gets++;return server.row?[clone(server.row)]:[]}
    if(method==='POST'){if(server.row)return [];server.row=clone(row);server.puts++;return [row]}
    const want=decodeURIComponent(/iv=eq\.([^&]+)/.exec(query)[1]);if(!server.row||server.row.iv!==want)return [];server.row=clone(row);server.puts++;return [row]},
  };
  c.globalThis=c;vm.createContext(c);vm.runInContext(SRC[kind].model,c);vm.runInContext(SRC[kind].sync,c);
  c.DB=clone(seedDb);c.MealJournal.init(true);return c;
 }
 return {server,ls,A:device('A'),B:device('B'),step:n=>{tick=1000+n*1000}};
}
const patches=w=>[...w.ls.entries()].filter(([k])=>k.includes(':pending:')).map(([k,v])=>[k,v]).sort((a,b)=>a[0]<b[0]?-1:1);
// Номера заплаток и отметки времени у двух выпусков свои (Meal 30 берёт новый номер и при пустом сохранении): сверяем содержание —
// какие записи, с какими значениями, что удалено, в каком порядке.
const bare=d=>d&&{v:d.v,owner:d.owner,records:d.records.map(r=>r.deleted?{id:r.id,deleted:true}:{id:r.id,value:r.value})};
const content=w=>patches(w).map(([,v])=>stable(bare(JSON.parse(v)))).sort();
const plain=db=>{const o=clone(db);delete o.__journalSync;delete o.__journalBaseline;return o};
// пустой день без записей и заметок журнал не передаёт (так и в Meal 30) — при сверке двух телефонов его не считаем
const filled=json=>{const o=JSON.parse(json);for(const d of Object.keys(o.days))if(!o.days[d].items.length&&Object.keys(o.days[d]).length===1)delete o.days[d];return stable(o)};
async function cloud(w){if(!w.server.row)return null;const r=w.server.row;let bytes=new Uint8Array(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(r.iv,'base64'),additionalData:new TextEncoder().encode(UID+'|meal|journal')},key,Buffer.from(r.data,'base64')));
 if(bytes[0]===31&&bytes[1]===139)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());return JSON.parse(new TextDecoder().decode(bytes))}

// случайные правки: одинаковая последовательность для обоих миров (свой генератор, не Math.random)
function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
const snapshot=n=>({id:'food'+n,n:'Продукт '+n,revision:1,composition:{basisGrams:100,fields:Array.from({length:40},(_,i)=>({key:'k'+i,kind:'standard',name:'Показатель '+i,unit:'мг',status:'value',value:n*i/7,origin:'reference'}))}});
function seed(){const db={days:{},sections:[{k:'am',t:'Завтрак'},{k:'pm',t:'Обед'}],goals:{k:2200},foods:[],recipes:[],taps:[],productSnapshots:{},mealCounters:{x:1},units:{},bls:{}};
 for(let d=1;d<=20;d++){const date='2026-10-'+String(d).padStart(2,'0');db.days[date]={items:[],note:'день '+d};for(let j=0;j<6;j++){const n=(d*3+j)%25;db.productSnapshots['food'+n+'@1']=snapshot(n);db.days[date].items.push({id:'i'+d+'_'+j,sec:j%2?'pm':'am',fid:'food'+n,q:1,u:'г',g:100+j,t:'12:0'+j,productRevision:'food'+n+'@1'})}}
 return db}
let made=0;
function mutate(db,r){
 const dates=Object.keys(db.days),date=dates[Math.floor(r()*dates.length)],day=db.days[date],x=r();
 if(x<.30){const n=Math.floor(r()*40);if(!db.productSnapshots['food'+n+'@1'])db.productSnapshots['food'+n+'@1']=snapshot(n);day.items.push({id:'n'+(++made),sec:'am',fid:'food'+n,q:1,u:'г',g:50+Math.floor(r()*200),t:'09:15',productRevision:'food'+n+'@1'})}
 else if(x<.55&&day.items.length){const it=day.items[Math.floor(r()*day.items.length)];it.g=Math.floor(r()*300);it.q=it.g/100}
 else if(x<.70&&day.items.length){day.items.splice(Math.floor(r()*day.items.length),1)}
 else if(x<.78&&day.items.length>1){day.items.push(day.items.shift())}
 else if(x<.85){db.goals={k:1800+Math.floor(r()*900),p:Math.floor(r()*150)}}
 else if(x<.90){day.note='заметка '+Math.floor(r()*1e6)}
 else if(x<.94){const d='2026-11-'+String(1+Math.floor(r()*28)).padStart(2,'0');if(!db.days[d])db.days[d]={items:[]}}
 else if(x<.97){db.taps=[{k:'t'+Math.floor(r()*5),n:Math.floor(r()*9)}]}
 else {/* ничего не меняем: «нажатие без изменений» */}
}
async function play(kind,seedNumber,steps){
 made=0;const w=world(kind,seed()),r=rng(seedNumber),trace=[];
 await w.A.MealJournal.sync();await w.B.MealJournal.sync();
 for(let i=0;i<steps;i++){
  w.step(i+1);const dev=r()<.5?w.A:w.B;mutate(dev.DB,r);dev.MealJournal.capture();trace.push(stable(content(w)));
  const x=r();if(x<.35)await dev.MealJournal.sync();else if(x<.5){await w.A.MealJournal.sync();await w.B.MealJournal.sync()}
 }
 for(let i=0;i<3;i++){await w.A.MealJournal.sync();await w.B.MealJournal.sync()}
 return {w,trace,A:stable(plain(w.A.DB)),B:stable(plain(w.B.DB)),docA:stable(bare(w.A.MealJournal.document())),docB:stable(bare(w.B.MealJournal.document())),cloud:stable(bare(await cloud(w))),left:patches(w).length};
}

let runs=0;
for(const seedNumber of [1,2,3,5,8,13,21,34,55,89,144,233]){
 const a=await play('old',seedNumber,90),b=await play('new',seedNumber,90);runs++;
 assert.deepEqual(b.trace,a.trace,'заплатки каждого сохранения совпадают с Meal 30 (набор '+seedNumber+')');
 assert.equal(b.A,a.A,'дневник на первом телефоне — как в Meal 30 (набор '+seedNumber+')');
 assert.equal(b.B,a.B,'дневник на втором телефоне — как в Meal 30 (набор '+seedNumber+')');
 assert.equal(b.docA,a.docA,'документ журнала на первом телефоне — как в Meal 30');
 assert.equal(b.docB,a.docB,'документ журнала на втором телефоне — как в Meal 30');
 assert.equal(b.cloud,a.cloud,'облачная копия — как в Meal 30');
 assert.equal(filled(b.A),filled(b.B),'оба телефона сошлись');assert.equal(b.docA,b.cloud,'журнал телефона равен облачной копии');
 assert.equal(b.left,0,'неотправленных заплаток не осталось');
}

// Без изменений Meal 31 ничего не пишет и не пересылает
{const w=await play('new',7,40).then(x=>x.w),d=w.A,s=w.server;
 const before={writes:d.writes,puts:s.puts,gets:s.gets,heads:s.heads,ls:stable([...w.ls.entries()])};
 for(let i=0;i<25;i++){assert.equal(d.MealJournal.capture(i%5===0),false,'сохранение без изменений не создаёт записей');assert.equal(d.MealJournal.unsaved(),false)}
 for(let i=0;i<10;i++)await d.MealJournal.sync();
 assert.equal(d.writes,before.writes,'без изменений дневник на устройство не переписывается');
 assert.equal(s.puts,before.puts,'без изменений журнал в облако не отправляется');
 assert.equal(s.gets,before.gets,'без изменений журнал из облака не скачивается');
 assert.equal(s.heads,before.heads+10,'вместо этого — короткая проверка отметки облачной копии');
 assert.equal(stable([...w.ls.entries()]),before.ls);
 // изменение на втором телефоне доходит: отметка в облаке другая → полный обмен
 const other=w.B,date=Object.keys(other.DB.days)[0];other.DB.days[date].items.push({id:'late',sec:'am',fid:'food1',q:1,u:'г',g:77,t:'10:00',productRevision:'food1@1'});
 other.MealJournal.capture();await other.MealJournal.sync();await d.MealJournal.sync();
 assert.ok(d.DB.days[date].items.some(x=>x.id==='late'&&x.g===77),'запись со второго телефона пришла');
 assert.equal(filled(stable(plain(d.DB))),filled(stable(plain(other.DB))));
 // правка на этом телефоне: одна заплатка, одна отправка
 const puts=s.puts;d.DB.days[date].items[0].g=333;assert.equal(d.MealJournal.capture(),true);assert.equal(d.MealJournal.unsaved(),true);
 await d.MealJournal.sync();assert.equal(s.puts,puts+1,'изменение уходит в облако одним запросом');
 await other.MealJournal.sync();assert.equal(other.DB.days[date].items[0].g,333);
 // снимок состава, исправленный на месте (так код Meal не делает), всё равно уходит: его ловит полный обход перед обменом
 const snap=Object.keys(d.DB.productSnapshots)[0];d.DB.productSnapshots[snap].n='Исправлено на месте';
 await d.MealJournal.sync();await other.MealJournal.sync();assert.equal(other.DB.productSnapshots[snap].n,'Исправлено на месте','правка снимка состава дошла до второго телефона');
}
console.log('Passed: Meal 31 journal equals Meal 30 on '+runs+' random two-device histories (patches, journals, cloud copy); nothing is written or sent without changes');
