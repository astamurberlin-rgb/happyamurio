/* Каталог «Сладкие заготовки» → Happy Meal: адаптер preserves.js на реальном файле каталога (Meal 33.3).
   Файл: аргумент командной строки (путь к sweet-preserves-1.0.json), иначе — файл записи «sweet-preserves» из ветки
   библиотек (HAPPY_LIBRARIES_REF, по умолчанию origin/meal-libraries).
   Проверяет: 7 своих карточек и 20 отметок BLS / USDA без второго продукта; поля источника → поля Meal только совместимые
   (старая клетчатка, витамин PP, колонка «A», каротин, кислоты и зола — своими строками); неизвестное и «следы» — не ноль;
   расчёт на 50 и 200 г; отметка не меняет состав существующей карточки; русское название USDA; слова поиска BLS;
   включение и отключение каталога; снимок в дневник с «нет данных», а не нулём. */
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const here=new URL('./',import.meta.url),app=new URL('../',here),repo=new URL('../',app);
const REF=process.env.HAPPY_LIBRARIES_REF||'origin/meal-libraries';
const git=p=>execFileSync('git',['show',REF+':'+p],{cwd:repo,maxBuffer:16*1024*1024}).toString('utf8');
let data;
if(process.argv[2])data=JSON.parse(await readFile(process.argv[2],'utf8'));
else{const m=JSON.parse(git('manifest.json')),e=m.libraries['sweet-preserves'];assert.ok(e,'в манифесте '+REF+' нет записи «sweet-preserves»');data=JSON.parse(git('data/'+e.url.split('/data/')[1]))}
assert.equal(data.version,'1.0.0');

const win={};win.window=win;win.globalThis=win;for(const k of ['Intl','JSON','Number','Math','Object','Array','String','Set','Map','Promise','Error','RegExp','Date','console'])win[k]=globalThis[k];
const ctx=vm.createContext(win);
for(const f of ['shared/meal-products-model.js','report.js','sources.js','preserves.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),ctx,{filename:f});
const {MealProducts:P,MealSources,MealPreserves:M}=win;
const plain=x=>JSON.parse(JSON.stringify(x));

// 1. Разбор: 7 карточек, 20 отметок, без повторов
assert.equal(M.ingest(structuredClone(data)),7,'7 своих карточек');
const foods=M.foods(),byId=Object.fromEntries(foods.map(f=>[f.id,f])),memberIds=M.memberIds();
assert.equal(memberIds.length,20,'20 отметок');
assert.equal(memberIds.filter(id=>id.startsWith('bls:')).length,11);assert.equal(memberIds.filter(id=>id.startsWith('usda:')).length,9);
assert.deepEqual(plain(M.counts()),{own:7,members:20,total:27});
for(const f of foods){P.validate(f);assert.equal(f.catalogSource,'HM-PRESERVE');assert.equal(f.composition.basisGrams,100);assert.equal(f.revision,20261116);assert.deepEqual(plain(f.por),{})}
assert.equal(new Set(foods.map(f=>f.n)).size,7,'названия карточек разные');
const v=(f,k)=>P.value(f,k),field=(f,k)=>f.composition.fields.find(x=>x.key===k);

// 2. Поля: справочник 1987 (кизиловое варенье)
const kiz=byId['hmpreserve:cornelian-cherry-preserve'];
assert.equal(kiz.n,'Кизиловое варенье');
for(const [k,x] of Object.entries({kcal:276,prot:0.4,fat:0,carb:71.7,sug:71.4,sta:0.3,water:26.3,na:10,k:109,ca:25,mg:11,p:14,fe:1.7,vC:5.5,salt:0}))assert.equal(v(kiz,k),x,'кизил '+k);
assert.equal(v(kiz,'fib'),null,'старая «клетчатка» не идёт в поле «Клетчатка»');
assert.equal(field(kiz,'prop:preserve:legacy_crude_fiber_source_g').value,0.2);
assert.equal(field(kiz,'prop:preserve:legacy_crude_fiber_source_g').name,'Клетчатка (методика справочника 1987)');
assert.equal(v(kiz,'bcar'),null,'бета-каротин — следы, не число');assert.equal(field(kiz,'bcar').sourceQualifier.state,'trace');
for(const k of ['b1','b2','b3','b3ne'])assert.equal(v(kiz,k),null,'кизил '+k+' — нет данных');
assert.equal(field(kiz,'b3').status,'missing','витамин PP — строка «B3 — ниацин» (Астамур 24.11.2026)');
assert.equal(field(kiz,'fat').status,'value','жиры 0 напечатаны в справочнике');
// малиновое варенье: B1, B2 и бета-каротин числом
const mal=byId['hmpreserve:raspberry-preserve-skurikhin'];
assert.equal(v(mal,'b1'),0.01);assert.equal(v(mal,'b2'),0.04);assert.equal(v(mal,'bcar'),0.02);assert.equal(v(mal,'kcal'),275);

// 3. ГОСТ: только энергия, углеводы и витамин C; белки, жиры, клетчатка — неизвестно, не ноль
for(const [id,kcal,carb,vc] of [['hmpreserve:cherry-preserve-gost',248,62,7],['hmpreserve:blackcurrant-preserve-gost',220,55,50]]){
 const f=byId[id];assert.equal(v(f,'kcal'),kcal);assert.equal(v(f,'carb'),carb);assert.equal(v(f,'vC'),vc);
 for(const k of ['prot','fat','fib','sug'])assert.equal(v(f,k),null,id+' '+k+' — нет данных');
 for(const k of ['prot','fat','fib'])assert.equal(field(f,k).status,'missing');
 assert.equal(f.p,null,'белки карточки — null, не 0');assert.equal(f.f,null);assert.equal(f.k,kcal);
}

// 4. Справочник 2002 (компоты): пищевые волокна → «Клетчатка»; НЭ → B3 НЭ, PP → B3 ниацин, РЭ, ТЭ → A, E; колонка «A», каротин — своими строками
const kr=byId['hmpreserve:gooseberry-blackcurrant-compote'],ap=byId['hmpreserve:apple-compote-skurikhin-reference'];
for(const [k,x] of Object.entries({kcal:58,prot:0.3,fat:0.1,carb:13.9,sug:13.9,fib:1.2,vA:5,vE:0.2,b3ne:0.1,b3:0.1,b1:0.01,b2:0.01,vC:13,sfa:0,chol:0,alc:0,sta:0}))assert.equal(v(kr,k),x,'крыжовник '+k);
assert.ok(!field(kr,'prop:preserve:vitamin_pp_source_mg'),'PP — не своей строкой, а «B3 — ниацин»');assert.equal(field(kr,'prop:preserve:vitamin_a_column_a_source_ug').value,0);
assert.equal(field(kr,'prop:preserve:carotene_source_ug').value,30);assert.equal(field(kr,'prop:preserve:carotene_source_ug').unit,'мкг');
assert.equal(v(kr,'bcar'),null,'«Каротин» не перенесён в бета-каротин');
assert.equal(v(ap,'kcal'),55);assert.equal(v(ap,'carb'),13.6);assert.equal(v(ap,'fib'),0.4);assert.equal(ap.n,'Яблочный компот с плодами');
for(const f of foods){const keys=f.composition.fields.map(x=>x.key);assert.equal(new Set(keys).size,keys.length,'поле один раз: '+f.id)}

// 5. Расчёт на 50 и 200 г — как в дневнике (значение на 100 г × граммы / 100)
for(const f of foods)for(const k of ['kcal','prot','carb','vC']){const x=v(f,k);if(x==null)continue;for(const g of [50,200])assert.ok(Math.abs(x*g/100-(k==='kcal'?f.k:k==='prot'?f.p:k==='carb'?f.c:x)*g/100)<1e-9,f.id+' '+k)}
assert.equal(kiz.k*50/100,138);assert.equal(kiz.k*200/100,552);

// 6. Отметки у существующих карточек: без второго продукта, состав прежний, русское название USDA, слова BLS
const usda={id:'usda:168819',n:'Marmalade, orange',names:{en:'Marmalade, orange'},catalogSource:'USDA',src:'USDA',w:['marmalade','orange'],por:{},composition:{version:1,basisGrams:100,fields:[{key:'kcal',value:246,status:'value'}]}};
const before=plain(usda.composition),dict={'usda:168819':usda},list=[usda];
win.BLS={f:[['S135000','Мармелад цитрусовый (джем)','',''],['F606902','Мандарины в сиропе, консервированные, без жидкости','',''],['X100000','Яблоко','','']]};win.BLS_X=['','',''];
M.append({catalogLang:'ru'},dict,list);
assert.equal(list.length,8,'7 новых + 1 прежний, без дублей');
assert.equal(dict['usda:168819'].n,'Апельсиновый джем');assert.equal(dict['usda:168819'].names.en,'Marmalade, orange');
assert.deepEqual(plain(dict['usda:168819'].composition),before,'отметка не меняет состав');
assert.ok(dict['usda:168819'].w.includes('апельсиновый')&&dict['usda:168819'].w.includes('джем'));
assert.equal(win.BLS_X[0].trim(),'','у «Мармелада цитрусового (джем)» все слова названия уже есть');
assert.ok(win.BLS_X[1].includes('дольки')&&win.BLS_X[1].includes('мандарина'),'«Дольки мандарина» находят строку BLS');
assert.equal(win.BLS_X[2],'','чужая строка BLS не тронута');
const w1=dict['usda:168819'].w.length;M.append({catalogLang:'ru'},dict,list);assert.equal(dict['usda:168819'].w.length,w1,'повторная сборка не задваивает слова');assert.equal(list.length,8);
assert.ok(M.membershipHTML({id:'bls:Y841363',n:'Компот вишнёвый'}).includes('Ягоды вместе с заливкой'),'пояснение отметки');
assert.equal(M.membershipHTML({id:'bls:X100000',n:'Яблоко'}),'');
const en={id:'usda:168819',n:'Marmalade, orange',names:{en:'Marmalade, orange'},catalogSource:'USDA',src:'USDA',w:[],por:{}},dEn={'usda:168819':en};M.append({catalogLang:'en'},dEn,[]);
assert.equal(dEn['usda:168819'].n,'Marmalade, orange','по-английски — английское имя');assert.equal(dEn['usda:168819'].names.ru,'Апельсиновый джем');

// 7. Переключатель каталогов
assert.ok(MealSources.catalog.some(s=>s.id==='PRESERVE'));
const db={};assert.equal(MealSources.enabled(db,'PRESERVE'),true,'включён по умолчанию');
assert.equal(MealSources.sourceOf(kiz),'PRESERVE');assert.equal(MealSources.sourceOf(dict['usda:168819']),'USDA');
assert.ok(MealSources.setEnabled(db,'PRESERVE',false));assert.equal(MealSources.available(db,kiz),false,'выключение скрывает свои карточки');
assert.equal(MealSources.available(db,dict['usda:168819']),true,'…но не карточки USDA');assert.ok(MealSources.setEnabled(db,'PRESERVE',true));

// 8. Карточка, настройки, подпись
assert.equal(M.footer(kiz),'Каталог «Сладкие заготовки» · ChatGPT, 14 ноября');
assert.ok(M.infoHTML(kiz).includes('Скурихин и Волгарев, 1987')&&M.infoHTML(kiz).includes('Готовое варенье'));
assert.ok(M.settingsHTML().includes('27 позиций: 7 карточек по справочникам и 20 отметок'));
const BRANDS=/ecofood|ашан|перекр|megamarket|sber/i;for(const f of foods)assert.ok(!BRANDS.test(f.n+' '+f.w.join(' ')+' '+M.infoHTML(f)),'без марок и продавцов: '+f.id);

// 9. Снимок в дневник: неизвестное — «нет данных», не ноль
const gost=byId['hmpreserve:cherry-preserve-gost'],snap=P.snapshot(gost);
assert.ok(!snap.w);assert.equal(snap.composition.fields.find(x=>x.key==='prot').value,null);assert.equal(snap.composition.fields.find(x=>x.key==='prot').status,'missing');
const diary={days:{'2026-11-16':{items:[{id:'a',fid:gost.id,g:50,sec:'b'},{id:'b',fid:kiz.id,g:200,sec:'b'}]}}};
P.snapshotItems(diary,Object.fromEntries(foods.map(f=>[f.id,f])));
const it=diary.days['2026-11-16'].items,sa=diary.productSnapshots[it[0].productRevision];
assert.equal(it[0].productRevision,gost.id+'@20261116');assert.equal(P.value(sa,'prot'),null,'в снимке дневника белки — нет данных');assert.equal(P.value(sa,'kcal'),248);

// 10. Неверный файл не принимается
assert.throws(()=>M.ingest({...structuredClone(data),library:'desserts2'}),/Invalid preserves library/);
const bad=structuredClone(data);bad.foods[0].nutrients.push({key:'ref:unknown_field',value:1,unit:'g',status:'value'});bad.nutrientDefinitions['ref:unknown_field']={unit:'g'};
assert.throws(()=>M.ingest(bad),/Unknown preserve nutrient/,'неизвестный ключ — ошибка, не тихий пропуск');
M.ingest(structuredClone(data));

console.log('Passed sweet preserves 1.0.0: 7 own cards, 20 marks (11 BLS, 9 USDA), 27 total; source fields mapped by meaning, unknown and trace not zero, marks keep composition.');
