/* Meal 32: свои варианты БАДов и приёмы — документ supps общего модуля (supplements-store.js, MealSupplementsStore).
   Шаблоны — настоящий каталог supplements из ветки библиотек (git show). Хранилище — модель «запись → последняя правка»
   (checks/store-model.mjs); сам общий модуль (шифрование, облако, сведение) проверяют scripts/check-happy-store.mjs и
   сценарий meal_store.
   Проверяется: вид прототипа ↔ записи без потерь; один снимок на версию состава; снимки не удаляются; приём без
   снимка и записи других видов не теряются при правке; мера с совпадающим именем; ошибка в правке ничего не пишет;
   без входа запись не принимается; два устройства сходятся при одновременных правках; правка с другого устройства
   видна сразу; второй аккаунт видит только своё; в файле выгрузки — все добавки. */
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {world} from './store-model.mjs';
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
const W=world();
function device(uid,name,signedIn=true){
 const store=W.device(uid),asked=[];
 const ctx={console,crypto,TextEncoder,TextDecoder,Uint8Array,JSON,Math,Date,Promise,Error,Set,Map,Object,Array,String,Number,setTimeout,clearTimeout,
  HappyStore:{NEWER:'Записано более новой версии приложения. Открой последнюю версию.'},askSignIn:()=>asked.push(1),
  MealData:{signedIn:()=>ctx.in,outdated:()=>false,store}};
 ctx.in=signedIn;ctx.globalThis=ctx;vm.createContext(ctx);
 for(const f of ['substances.js','supplements-model.js','supplements-store.js'])vm.runInContext(code[f],ctx,{filename:f});
 ctx.MealSupplementsStore.init();ctx.name=name;ctx.store=store;ctx.asked=asked;return ctx;
}
const A=device('user-1','A'),S=A.MealSupplementsStore,M=A.HappySupplementsModel,Mo=S.model;
const records=ctx=>ctx.store.doc('supps').all(),raw=ctx=>[...ctx.store.local].filter(([k])=>k.startsWith('meal/supps\n'));
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
let st=plain(S.state());
assert.equal(st.variants.length,2);assert.equal(st.entries.length,2);assert.deepEqual(st.favoriteIds,[fish.id]);
assert.equal(st.entries[0].portion.quantity,2);assert.deepEqual(st.entries[0].snapshot,plain(fish));
assert.equal(records(A).filter(r=>r.id.startsWith('snap:')).length,1,'одна версия состава — один снимок на все приёмы');
const entryRecord=records(A).find(r=>r.id.startsWith('entry:')).value;
assert.ok(!('portion' in entryRecord)&&!('snapshot' in entryRecord),'приём хранит ссылку на снимок и количество, не копию состава');
assert.ok(records(A).every(r=>r.id.length<=200),'номер записи помещается в предел модуля');
/* 2. правки как в прототипе: количество, мера, удаление, звезда */
const firstId=st.entries[0].id,secondId=st.entries[1].id;
await S.write(d=>{const r=d.entries.find(x=>x.id===firstId);r.portion=plain(M.portion(r.snapshot,3,'basis'))});
await S.write(d=>{d.entries=d.entries.filter(x=>x.id!==secondId);d.favoriteIds=[]});
st=plain(S.state());assert.equal(st.entries.length,1);assert.equal(st.entries[0].portion.quantity,3);assert.deepEqual(st.favoriteIds,[]);
assert.ok(raw(A).find(([k,r])=>k.endsWith('entry:'+secondId)&&r.deleted),'удалённый приём — отметка удаления, чтобы не вернулся с другого устройства');
assert.ok(raw(A).filter(([k])=>k.includes('\nsnap:')).every(([,r])=>!r.deleted),'снимки не удаляются');
/* 3. своя мера с именем «г» при капсулах с массой: выбирается та мера, что дала порцию */
const caps=plain(fish);caps.id=crypto.randomUUID();caps.basis={quantity:1,unit:'капсула',gramsPerUnit:1.4};caps.measures=[{id:'own-g',name:'г',amount:2}];caps.revision=1;
const capsEntry=intake(caps,1,'own-g','2026-11-12','09:00','am');
await S.write(d=>{d.variants.push(caps);d.entries.push(capsEntry)});
st=plain(S.state());const back=st.entries.find(x=>x.id===capsEntry.id);
assert.equal(back.portion.basisUnits,2,'своя мера «г» = 2 капсулы, не граммы основы');assert.deepEqual(back.portion,capsEntry.portion);
/* 4. приём без снимка и записи будущих видов переживают правку */
await A.store.doc('supps').putMany([{id:'entry:lost-snapshot',value:{date:'2026-11-10',time:'07:00',snap:'f'.repeat(40),quantity:1,measureId:'basis'}},{id:'pref:sort',value:{order:'time'}}]);
await S.write(d=>{d.favoriteIds.push(caps.id)});
assert.ok(records(A).some(r=>r.id==='entry:lost-snapshot'),'приём без снимка не удалён правкой');
assert.ok(records(A).some(r=>r.id==='pref:sort'),'запись будущего вида не удалена правкой');
assert.ok(!S.state().entries.some(x=>x.id==='lost-snapshot'),'приём без снимка не показывается');
/* 5. ошибка в правке — ничего не записано; следующая правка проходит */
const before=JSON.stringify(raw(A));
await assert.rejects(S.write(d=>{d.entries.push({id:'bad',date:'2026-11-11',time:'08:00',portion:{quantity:1,measure:'нет такой',basisUnits:1},snapshot:fish})}),/Мера приёма/);
await assert.rejects(S.write(()=>{throw Error('отмена')}),/отмена/);
assert.equal(JSON.stringify(raw(A)),before,'неудачная правка не меняет сохранённое');
/* 5б. правка, в которой снимка нет, не удаляет его (снимки только копятся) */
{const vis=Mo.visible(records(A)),without=Object.fromEntries(Object.entries(vis).filter(([id])=>!id.startsWith('snap:')));
 assert.ok(Object.keys(vis).some(id=>id.startsWith('snap:')));assert.equal(Mo.changes(vis,without).filter(x=>x.id.startsWith('snap:')).length,0,'снимок не получает отметку удаления')}
/* 6. негодные записи документа пропускаются по одной */
{const vis=Mo.visible([{id:'variant:a b',value:{}},{id:'fav:x',value:JSON.parse('{"__proto__":{"on":true}}')},{id:'fav:ok',value:{on:true}},{id:'fav:строка',value:1}]);
 assert.deepEqual(Object.keys(vis),['fav:ok'])}
/* 7. без входа запись не принимается: приложение предлагает войти */
{const N=device('user-1','N',false);
 await assert.rejects(N.MealSupplementsStore.write(d=>{d.favoriteIds.push('x')}),/Войди в аккаунт/);assert.equal(N.asked.length,1);
 assert.equal(N.store.writes,0);assert.deepEqual(plain(N.MealSupplementsStore.state()),{schema:1,variants:[],entries:[],favoriteIds:[]})}
/* 8. второе устройство получает то же; правка с другого устройства видна сразу, без перезапуска */
A.store.sync();
const B=device('user-1','B'),SB=B.MealSupplementsStore;let told=0;SB.onChange(()=>told++);
B.store.sync();
assert.deepEqual(plain(SB.state()),plain(S.state()),'второе устройство видит то же');assert.ok(told>0,'экран второго устройства узнал о правке');
/* 9. одновременные правки на двух устройствах сходятся */
const eA=plain(SB.state()).entries.find(x=>x.id===firstId);
await SB.write(d=>{const r=d.entries.find(x=>x.id===firstId);r.portion=plain(M.portion(r.snapshot,4,'basis'));r.time='07:55'});
await S.write(d=>{d.entries.push(intake(second,1,'basis','2026-11-11','19:30','dn'))});
await S.write(d=>{d.favoriteIds.push(second.id)});
B.store.sync();A.store.sync();B.store.sync();
assert.deepEqual(plain(S.state()),plain(SB.state()),'после обмена устройства совпадают');
const merged=plain(S.state());assert.equal(merged.entries.find(x=>x.id===firstId).portion.quantity,4);assert.equal(merged.entries.find(x=>x.id===firstId).time,'07:55');
assert.ok(merged.entries.some(x=>x.time==='19:30'));assert.ok(merged.favoriteIds.includes(second.id));
assert.notEqual(eA.portion.quantity,4);
/* 10. «Выгрузить дневник»: в файле — все добавки со снимком состава и порцией */
{const file=plain(S.exportState());
 assert.equal(file.schema,'happy.meal.supplements.v1');assert.equal(file.entries.length,S.state().entries.length);assert.ok(file.entries.every(e=>e.snapshot&&e.portion),'в файле — приёмы со снимком состава и порцией')}
/* 11. другой аккаунт — свой документ */
const E=device('user-2','E');E.store.sync();assert.deepEqual(plain(E.MealSupplementsStore.state()).entries,[]);
console.log('Passed: supplements in the shared store — prototype view ↔ records, one snapshot per composition, nothing lost on edit, same-name measures, broken records skipped one by one, no write without sign-in; two devices converge with concurrent edits; another account sees only its own. Catalog '+catalog.version+', '+catalog.templates.length+' templates ('+withExample.length+' with examples).');
