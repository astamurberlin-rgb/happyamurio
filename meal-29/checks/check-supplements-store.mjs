/* Meal 29: свои варианты БАДов и приёмы в аккаунте — supplements-store.js (MealSupplementsStore).
   Шаблоны — настоящий каталог supplements из ветки библиотек (git show). Облако — поддельный сервер в памяти с тем же
   условием записи, что у app_sync (PATCH по iv, POST без замены); шифрование — настоящий AES-GCM WebCrypto.
   Проверяется: вид прототипа ↔ записи без потерь; один снимок на версию состава; снимки не удаляются; приём без
   снимка и записи других видов не теряются при правке; мера с совпадающим именем; слияние одинаково в любом порядке;
   чужой владелец и испорченные записи не принимаются; два устройства сходятся при одновременных правках; в облаке
   нет открытого текста, строка привязана к app/kind; смена входа посреди обмена ничего не пишет. */
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const app=new URL('../',import.meta.url),repo=new URL('../../',import.meta.url);
const refs=[process.env.HAPPY_LIBRARIES_REF,'origin/meal-libraries','origin/meal-libraries-supplements'].filter(Boolean);
/* ветка библиотек, в манифесте которой есть каталог БАДов: до выпуска Meal 29 — meal-libraries-supplements */
const git=(ref,path)=>execFileSync('git',['show',ref+':'+path],{cwd:repo,maxBuffer:64*1024*1024,stdio:['ignore','pipe','ignore']});
const ref=refs.find(r=>{try{return !!JSON.parse(git(r,'manifest.json')).libraries.supplements}catch(e){return false}});
assert.ok(ref,'ни в одной ветке библиотек ('+refs.join(', ')+') нет каталога supplements');
const show=path=>git(ref,path),manifest=JSON.parse(show('manifest.json')),entry=manifest.libraries.supplements;
const catalog=JSON.parse(show(entry.url.replace(/^.*\/data\//,'data/')));
assert.equal(catalog.schema,'happy.supplements.templates.v1');assert.equal(catalog.templates.length,entry.templateCount);
const code={};for(const f of ['substances.js','supplements-model.js','supplements-store.js'])code[f]=await readFile(new URL(f,app),'utf8');
/* поддельное облако: строки app_sync */
const cloud=new Map(),log=[];
function server(){
 const rowKey=(u,a,k)=>u+'|'+a+'|'+k,params=q=>Object.fromEntries(q.replace(/^\?/,'').split('&').map(x=>{const i=x.indexOf('=');return [x.slice(0,i),decodeURIComponent(x.slice(i+1))]}));
 return async function clRest(method,query,body,prefer){
  const p=params(query),u=(p.user_id||'').replace(/^eq\./,''),a=(p.app||'').replace(/^eq\./,''),k=(p.kind||'').replace(/^eq\./,'');
  log.push(method+' '+(method==='POST'?body.app+'/'+body.kind:a+'/'+k));
  if(method==='GET'){const r=cloud.get(rowKey(u,a,k));return r?[{v:r.v,iv:r.iv,data:r.data,at:r.at}]:[]}
  if(method==='POST'){const key=rowKey(body.user_id,body.app,body.kind);assert.match(prefer,/ignore-duplicates/);if(cloud.has(key))return [];cloud.set(key,{...body});return [body]}
  if(method==='PATCH'){const key=rowKey(u,a,k),cur=cloud.get(key),iv=p.iv.replace(/^eq\./,'');if(!cur||cur.iv!==iv)return [];cloud.set(key,{...body});return [body]}
  throw Error('метод '+method);
 };
}
const rest=server();
const keyBytes=crypto.getRandomValues(new Uint8Array(32));
async function device(uid,name){
 const store=new Map(),timers=new Set();
 const ck=await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['encrypt','decrypt']);
 const ctx={
  console,crypto,TextEncoder,TextDecoder,Blob,Response,CompressionStream,DecompressionStream,Uint8Array,JSON,Math,Date,Promise,Error,Set,Map,Object,Array,String,Number,
  setTimeout:(f,ms)=>{const t=setTimeout(f,ms);t.unref();timers.add(t);return t},clearTimeout,setInterval:()=>0,
  addEventListener(){},document:{hidden:false,addEventListener(){}},navigator:{onLine:true},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{store.set(k,String(v))},removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size}},
  HappyProfile:{owner:uid,matches:v=>(v||'local')===uid},MealAuthFence:{generation:0,pending:0},
  CL:{s:{uid},ck,ready:true},clOn:()=>true,clRest:(...a)=>rest(...a),
  clUtf:t=>new TextEncoder().encode(t),clB64:u=>Buffer.from(u).toString('base64'),clUnb64:t=>new Uint8Array(Buffer.from(t,'base64'))
 };
 ctx.globalThis=ctx;vm.createContext(ctx);
 for(const f of ['substances.js','supplements-model.js','supplements-store.js'])vm.runInContext(code[f],ctx,{filename:f});
 ctx.MealSupplementsStore.init();ctx.name=name;ctx.storage=store;return ctx;
}
const A=await device('user-1','A'),S=A.MealSupplementsStore,M=A.HappySupplementsModel,Mo=S.model;
const plain=x=>JSON.parse(JSON.stringify(x));
/* вариант по шаблону с примером состава — как saveVariant() прототипа */
function variantFrom(templateId,at){
 const t=catalog.templates.find(x=>x.id===templateId);assert.ok(t,'нет шаблона '+templateId);
 const x=M.normalize(M.draft(t));x.id=crypto.randomUUID();x.revision=1;x.updatedAt=at;return plain(x);
}
function intake(v,quantity,measureId,date,time,section){
 return {id:crypto.randomUUID(),date,time,at:date+'T'+time+':00.000Z',timeSource:'manual',variantId:v.id,variantRevision:v.revision,name:v.name,form:v.form,source:v.source,section:section||null,portion:plain(M.portion(v,quantity,measureId)),snapshot:M.clone(v)};
}
const withExample=catalog.templates.filter(t=>t.example);assert.ok(withExample.length>=10,'в каталоге мало шаблонов с примером состава');
const fish=variantFrom(withExample[0].id,'2026-11-11T08:00:00.000Z'),second=variantFrom(withExample[1].id,'2026-11-11T08:01:00.000Z');
/* 1. запись как в прототипе: вариант, два приёма одной версии, звезда */
await S.write(d=>{d.variants.push(fish,second);d.entries.push(intake(fish,2,'basis','2026-11-11','08:10','am'),intake(fish,1,'basis','2026-11-11','13:05','pm'));d.favoriteIds.push(fish.id)});
let st=S.state();
assert.equal(st.variants.length,2);assert.equal(st.entries.length,2);assert.deepEqual(st.favoriteIds,[fish.id]);
assert.equal(st.entries[0].portion.quantity,2);assert.deepEqual(st.entries[0].snapshot,plain(fish));
let doc=S.document(),snaps=doc.records.filter(r=>r.id.startsWith('snap:'));
assert.equal(snaps.length,1,'одна версия состава — один снимок на все приёмы');
const entryRecord=doc.records.find(r=>r.id.startsWith('entry:')).value;
assert.ok(!('portion' in entryRecord)&&!('snapshot' in entryRecord),'приём хранит ссылку на снимок и количество, не копию состава');
/* 2. правки как в прототипе: количество, мера, удаление, звезда */
const firstId=st.entries[0].id,secondId=st.entries[1].id;
await S.write(d=>{const r=d.entries.find(x=>x.id===firstId);r.portion=plain(M.portion(r.snapshot,3,'basis'))});
await S.write(d=>{d.entries=d.entries.filter(x=>x.id!==secondId);d.favoriteIds=[]});
st=S.state();assert.equal(st.entries.length,1);assert.equal(st.entries[0].portion.quantity,3);assert.deepEqual(st.favoriteIds,[]);
doc=S.document();
assert.ok(doc.records.find(r=>r.id==='entry:'+secondId).deleted,'удалённый приём — отметка удаления, чтобы не вернулся с другого устройства');
assert.ok(doc.records.filter(r=>r.id.startsWith('snap:')).every(r=>!r.deleted),'снимки не удаляются');
/* 3. своя мера с именем «г» при капсулах с массой: выбирается та мера, что дала порцию */
const caps=plain(fish);caps.id=crypto.randomUUID();caps.basis={quantity:1,unit:'капсула',gramsPerUnit:1.4};caps.measures=[{id:'own-g',name:'г',amount:2}];caps.revision=1;
const capsEntry=intake(caps,1,'own-g','2026-11-12','09:00','am');
await S.write(d=>{d.variants.push(caps);d.entries.push(capsEntry)});
st=S.state();const back=st.entries.find(x=>x.id===capsEntry.id);
assert.equal(back.portion.basisUnits,2,'своя мера «г» = 2 капсулы, не граммы основы');assert.deepEqual(back.portion,capsEntry.portion);
/* 4. приём без снимка и записи будущих видов переживают правку */
const raw=JSON.parse(A.storage.get(S.key()));
raw.records.push({id:'entry:lost-snapshot',rev:5,writer:'x',value:{date:'2026-11-10',time:'07:00',snap:'f'.repeat(40),quantity:1,measureId:'basis'}});
raw.records.push({id:'pref:sort',rev:5,writer:'x',value:{order:'time'}});
raw.records.sort((a,b)=>a.id<b.id?-1:1);A.storage.set(S.key(),JSON.stringify(raw));
await S.write(d=>{d.favoriteIds.push(caps.id)});
doc=S.document();
assert.ok(doc.records.find(r=>r.id==='entry:lost-snapshot'&&!r.deleted),'приём без снимка не удалён правкой');
assert.ok(doc.records.find(r=>r.id==='pref:sort'&&!r.deleted),'запись будущего вида не удалена правкой');
assert.ok(!S.state().entries.some(x=>x.id==='lost-snapshot'),'приём без снимка не показывается');
/* 5. ошибка в правке — ничего не записано */
const before=A.storage.get(S.key());
await assert.rejects(S.write(d=>{d.entries.push({id:'bad',date:'2026-11-11',time:'08:00',portion:{quantity:1,measure:'нет такой',basisUnits:1},snapshot:fish})}),/Мера приёма/);
await assert.rejects(S.write(()=>{throw Error('отмена')}),/отмена/);
assert.equal(A.storage.get(S.key()),before,'неудачная правка не меняет сохранённое');
/* 5б. правка, в которой снимка нет, не удаляет его (снимки только копятся) */
{const d=S.document(),vis=Mo.visible(d),without=Object.fromEntries(Object.entries(vis).filter(([id])=>!id.startsWith('snap:')));
 const p=Mo.patch(vis,without,d,'w',Date.now());assert.ok(Object.keys(vis).some(id=>id.startsWith('snap:')));assert.equal(p.records.filter(r=>r.id.startsWith('snap:')).length,0,'снимок не получает отметку удаления')}
/* 6. слияние: одинаково в любом порядке, повтор ничего не меняет; чужое и испорченное не принимается */
const x=Mo.empty('user-1'),y=S.document(),z={v:1,owner:'user-1',records:[{id:'fav:'+fish.id,rev:Number.MAX_SAFE_INTEGER-1,writer:'z',value:{on:true}}]};
assert.deepEqual(Mo.merge(Mo.merge(x,y,'user-1'),z,'user-1'),Mo.merge(z,Mo.merge(y,x,'user-1'),'user-1'));
assert.deepEqual(Mo.merge(y,y,'user-1'),Mo.merge(y,Mo.empty('user-1'),'user-1'));
assert.throws(()=>Mo.check({...y,owner:'user-2'},'user-1'),/другого аккаунта/);
assert.throws(()=>Mo.check({v:1,owner:'user-1',records:[{id:'variant:a b',rev:1,writer:'w',value:{}}]},'user-1'),/Повреждена/);
assert.throws(()=>Mo.check(JSON.parse('{"v":1,"owner":"user-1","records":[{"id":"fav:x","rev":1,"writer":"w","value":{"__proto__":{"on":true}}}]}'),'user-1'),/Недопустимое/);
/* 7. облако: пустой документ не отправляется; первое устройство отправляет, второе получает */
const Z=await device('user-1','Z');await Z.MealSupplementsStore.sync();assert.equal(Z.MealSupplementsStore.status(),'synced');
assert.equal(cloud.size,0,'без добавок строка в облаке не заводится');assert.ok(!log.some(l=>!l.startsWith('GET')),'без добавок — только чтение');
await S.sync();assert.equal(S.status(),'synced');
const row=cloud.get('user-1|meal|supplements');assert.ok(row,'строка meal/supplements в облаке');
assert.equal(cloud.size,1,'другие строки аккаунта не трогаются');
assert.ok(!Buffer.from(row.data,'base64').toString('latin1').includes('variant:'),'в облаке шифр, не открытый текст');
const ck=await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['decrypt']);
await assert.rejects(crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(row.iv,'base64'),additionalData:new TextEncoder().encode('user-1|meal|journal')},ck,Buffer.from(row.data,'base64')),'шифр привязан к meal/supplements');
const B=await device('user-1','B'),SB=B.MealSupplementsStore;
await SB.sync();assert.equal(SB.status(),'synced');
assert.deepEqual(SB.state(),S.state(),'второе устройство видит то же');
/* 8. одновременные правки на двух устройствах сходятся */
const eA=SB.state().entries.find(x=>x.id===firstId);
await SB.write(d=>{const r=d.entries.find(x=>x.id===firstId);r.portion=plain(M.portion(r.snapshot,4,'basis'));r.time='07:55'});
await S.write(d=>{d.entries.push(intake(second,1,'basis','2026-11-11','19:30','dn'))});
await S.write(d=>{d.favoriteIds.push(second.id)});
await SB.sync();await S.sync();await SB.sync();
assert.deepEqual(S.state(),SB.state(),'после обмена устройства совпадают');
const merged=S.state();assert.equal(merged.entries.find(x=>x.id===firstId).portion.quantity,4);assert.equal(merged.entries.find(x=>x.id===firstId).time,'07:55');
assert.ok(merged.entries.some(x=>x.time==='19:30'));assert.ok(merged.favoriteIds.includes(second.id));
assert.notEqual(eA.portion.quantity,4);
/* 9. гонка записи: чужая запись между чтением и записью — повтор по новому iv, ничего не теряется */
const C=await device('user-1','C'),SC=C.MealSupplementsStore;await SC.sync();
await SC.write(d=>{d.entries.push(intake(fish,1,'basis','2026-11-13','08:00','am'))});
const realGet=C.clRest;let raced=false;
C.clRest=async(...a)=>{const r=await realGet(...a);if(!raced&&a[0]==='GET'){raced=true;await SB.write(d=>{d.entries.push(intake(second,2,'basis','2026-11-13','12:00','pm'))});await SB.sync()}return r};
await SC.sync();C.clRest=realGet;await S.sync();await SB.sync();
assert.ok(raced);for(const s of [S,SB,SC])assert.equal(s.state().entries.filter(x=>x.date==='2026-11-13').length,2,'обе записи гонки на месте');
assert.deepEqual(S.state(),SC.state());
/* 10. вход сменился посреди обмена — запись в облако не уходит */
const D=await device('user-1','D'),SD=D.MealSupplementsStore;await SD.write(d=>{d.favoriteIds.push(caps.id)});
const atBefore=cloud.get('user-1|meal|supplements').at,writes=log.filter(l=>!l.startsWith('GET')).length;
D.clRest=async(...a)=>{const r=await rest(...a);if(a[0]==='GET')D.CL.s={uid:'user-2'};return r};
await SD.sync();assert.match(SD.status(),/^error/);
assert.equal(log.filter(l=>!l.startsWith('GET')).length,writes,'после смены входа — ни одной записи в облако');
assert.equal(cloud.get('user-1|meal|supplements').at,atBefore);
/* 10б. вышел из аккаунта, пока шёл ответ облака — запись не уходит */
const F=await device('user-1','F'),SF=F.MealSupplementsStore;await SF.write(d=>{d.favoriteIds.push(second.id)});
const writesF=log.filter(l=>!l.startsWith('GET')).length;
F.clRest=async(...a)=>{const r=await rest(...a);if(a[0]==='GET')F.clOn=()=>false;return r};
await SF.sync();assert.match(SF.status(),/^error/);assert.equal(log.filter(l=>!l.startsWith('GET')).length,writesF,'после выхода — ни одной записи в облако');
/* 11. другой аккаунт на том же устройстве — свой документ */
const E=await device('user-2','E');assert.deepEqual(E.MealSupplementsStore.state().entries,[]);
assert.ok(log.every(l=>/meal\/supplements$/.test(l)),'обмен только со строкой meal/supplements');
console.log('Passed: supplements store — prototype view ↔ records, one snapshot per composition, nothing lost on edit, same-name measures, merge order-independent, foreign/broken data refused; two and three devices converge with concurrent edits and a write race; cloud row encrypted and bound to meal/supplements; sign-in change mid-sync writes nothing. Catalog '+catalog.version+', '+catalog.templates.length+' templates ('+withExample.length+' with examples).');
