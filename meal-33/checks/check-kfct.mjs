/* KFCT 10.4 → Happy Meal: адаптер kfct.js на реальном файле каталога (Meal 33.4).
   Файл: аргумент командной строки (путь к kfct-10.4.json или .json.gz), иначе — запись «kfct» манифеста ветки библиотек
   (HAPPY_LIBRARIES_REF, по умолчанию origin/meal-libraries).
   Проверяет: 3 366 продуктов с ID kfct:<код> и русскими названиями; поля KFCT → поля Meal только совместимые, единицы
   переведены (мкг → мг, мг → г); «Углеводы» Meal — всего минус клетчатка (≈), «углеводы всего» и «из них клетчатка» — своими
   строками; RAE и витамин E KFCT — своими строками, в общих полях пусто с подсказкой; «-» — нет данных, «Tr» — следы, «(x)» — оценённое; спорная ячейка — без числа; отходы не вычитаются;
   каталог включён у всех, выключенный в поиск не попадает, включённый — без дублей; английские названия при языке English. */
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const here=new URL('./',import.meta.url),app=new URL('../',here),repo=new URL('../',app);
const REF=process.env.HAPPY_LIBRARIES_REF||'origin/meal-libraries';
const show=p=>execFileSync('git',['show',REF+':'+p],{cwd:repo,maxBuffer:64*1024*1024});
const unzip=b=>JSON.parse((b[0]===31&&b[1]===139?gunzipSync(b):b).toString('utf8'));
let data;
if(process.argv[2])data=unzip(await readFile(process.argv[2]));
else{const m=JSON.parse(show('manifest.json').toString('utf8')),e=m.libraries.kfct;assert.ok(e,'в манифесте '+REF+' нет записи «kfct»');data=unzip(show('data/'+e.url.split('/data/')[1]));assert.equal(e.foodCount,3366)}
assert.equal(data.schema,'happy-meal-kfct/1');assert.equal(data.foods.length,3366);

const win={};win.window=win;win.globalThis=win;for(const k of ['Intl','JSON','Number','Math','Object','Array','String','Set','Map','Promise','Error','RegExp','Date','console'])win[k]=globalThis[k];
const ctx=vm.createContext(win);
for(const f of ['shared/meal-products-model.js','report.js','sources.js','kfct.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),ctx,{filename:f});
const {MealProducts:P,MealSources:S,MealKfct:K}=win;

// 1. Разбор
assert.equal(K.ingest(structuredClone(data)),3366);assert.equal(K.status(),'ok');assert.equal(K.count(),3366);
const food=c=>K.food('kfct:'+c),v=(f,k)=>P.value(f,k),field=(f,k)=>f.composition.fields.find(x=>x.key===k);
const names=new Set();
for(const r of data.foods){const f=food(r.c);assert.ok(f,'нет '+r.c);assert.ok(/\S/.test(f.names.ru)&&/[а-яё]/i.test(f.names.ru),'русское название '+r.c);names.add(f.names.ru.toLowerCase())}
assert.equal(names.size,3366,'русские названия не повторяются');
for(const r of data.foods.filter((_,i)=>i%97===0)){const f=food(r.c);P.validate(f);assert.equal(f.catalogSource,'KFCT');assert.equal(f.composition.basisGrams,100);assert.equal(S.sourceOf(f),'KFCT')}

// 2. Овёс плёнчатый сырой: поля и единицы
const oat=food('A001001A010a');
for(const [k,x] of Object.entries({kcal:388,water:11.7,prot:9.88,fat:8.84,fib:7.6,fbs:2.5,fbi:5.2,sug:0.92,suc:0.92,ca:52,fe:5.3,mg:127,p:361,k:423,na:3,zn:2.13,cu:0.247,mn:5.883,mo:96.08,b1:0.372,b2:0.077,b3:1.415,b5:0.799,b6:0.223,b7:6.64,b9:24,vC:0,chol:0,sfa:1.51,mufa:4.24,pufa:2.85,n3:0.08,n6:2.77,salt:0}))assert.equal(v(oat,k),x,'овёс '+k);
assert.equal(v(oat,'ile'),0.272,'изолейцин 272 мг → 0,272 г');assert.equal(v(oat,'la'),2.7645,'линолевая 2764,5 мг → г');assert.equal(v(oat,'ala3'),0.07927);assert.equal(v(oat,'epa'),0,'EPA — в мг, как в Meal');
assert.equal(v(oat,'carb'),60.43,'углеводы Meal = всего 68,03 минус клетчатка 7,6');assert.equal(field(oat,'carb').sourceQualifier.estimated,true);assert.match(field(oat,'carb').notes,/минус клетчатка/);
assert.equal(field(oat,'prop:kfct:A10600').value,68.03);assert.equal(field(oat,'prop:kfct:A10600').name,'Углеводы всего (с клетчаткой)');
assert.equal(field(oat,'prop:kfct:A10600_fiber').value,7.6);assert.equal(field(oat,'prop:kfct:A10600_fiber').name,'из них клетчатка');
{const ids=oat.composition.fields.filter(x=>x.kind==='custom').map(x=>x.key);assert.equal(ids.indexOf('prop:kfct:A10600_fiber'),ids.indexOf('prop:kfct:A10600')+1,'«из них клетчатка» сразу под «углеводами всего»')}
{const rice=data.foods.find(r=>typeof r.v[data.fieldOrder.indexOf('A10600')]==='number'&&r.v[data.fieldOrder.indexOf('A10800')]==='-'),f=food(rice.c);assert.equal(v(f,'carb'),rice.v[data.fieldOrder.indexOf('A10600')],'клетчатка не указана — углеводы всего');assert.match(field(f,'carb').notes,/не указана/)}
{const neg=food('G0050000000a');assert.equal(v(neg,'carb'),0,'клетчатки больше, чем углеводов всего, — ноль, не минус')}
{const k=data.foods.find(r=>r.c==='F2050070009a'),i=n=>k.v[data.fieldOrder.indexOf(n)];assert.equal(v(food('F2050070009a'),'carb'),Math.round((i('A10600')-i('A10800'))*1e6)/1e6,'кимчи: всего минус клетчатка')}
assert.equal(v(oat,'vA'),null);assert.equal(field(oat,'vA').sourceQualifier.reason,'KFCT_RAE');assert.equal(v(oat,'vE'),null);assert.equal(field(oat,'prop:kfct:C10300').value,1.09);
assert.equal(field(oat,'prop:kfct:B11000').value,1.61,'селен — своя строка');assert.equal(oat.k,388);assert.equal(oat.p,9.88);assert.equal(oat.f,8.84);
// бета-каротин мкг → мг
const bc=data.foods.find(r=>typeof r.v[data.fieldOrder.indexOf('C10103')]==='number'&&r.v[data.fieldOrder.indexOf('C10103')]>100);
assert.equal(v(food(bc.c),'bcar'),Math.round(bc.v[data.fieldOrder.indexOf('C10103')]*1e3)/1e6,'бета-каротин мкг → мг');

// 3. Нет данных, следы, скобки, спорная ячейка
const tr=food('A008000A050a');assert.equal(v(tr,'glc'),null);assert.equal(field(tr,'glc').sourceQualifier.state,'trace');
const dash=food('A0020000009a');assert.equal(v(dash,'sug'),null);assert.equal(field(dash,'sug').status,'missing');assert.equal(field(dash,'sug').sourceQualifier.state,'missing');
const est=food('A012000A039a');assert.equal(v(est,'water'),95);assert.equal(field(est,'water').sourceQualifier.estimated,true);
assert.equal(v(food('D0070000001a'),'leu'),null,'спорный лейцин (1.800) — без числа');
assert.equal(v(food('A008000A050a'),'prot')!=null,true);
// кудрания сырая (сверка комплекта)
assert.equal(food('H114000B130a').k,74);
// отходы — пометка, не вычет
const ref=data.foods.find(r=>r.r>0),rf=food(ref.c);assert.ok(rf.sourceNotes.includes('не вычитаются'));assert.equal(rf.ediblePortion.discardPercent,ref.r);
assert.equal(rf.k,ref.v[0]==='-'?null:typeof ref.v[0]==='number'?ref.v[0]:+String(ref.v[0]).replace(/[()]/g,''),'калории на 100 г съедобной части как в источнике');

// 4. Каталог в поиске: по умолчанию выключен, включённый — без дублей; язык English
assert.equal(S.enabled({},'KFCT'),true,'каталог включён у всех (Астамур 17.11)');assert.equal(S.enabled({foodSources:{KFCT:false}},'KFCT'),false);
assert.equal(S.enabled({},'MEXT'),true,'остальные — как были');
{const db={foodSources:{KFCT:false}},d={},l=[];win.DB=db;K.append(db,d,l);assert.equal(l.length,0,'выключен — в поиск не попадает')}
{const db={foodSources:{KFCT:true}},d={},l=[];win.DB=db;K.append(db,d,l);assert.equal(l.length,3366);K.append(db,d,l);assert.equal(l.length,3366,'повторная сборка без дублей');
 assert.equal(d['kfct:A001001A010a'].n,'Овёс, плёнчатый, шлифованный, в сыром виде');assert.ok(d['kfct:A001001A010a'].w.includes('귀리')&&d['kfct:A001001A010a'].w.includes('oat'),'поиск по корейскому и английскому');
 assert.equal(d['kfct:A001001A010a'].composition,food('A001001A010a').composition,'состав общий с каталогом, без копии');
 db.catalogLang='en';K.append(db,d,l);assert.equal(d['kfct:A001001A010a'].n,'Oat(Gwiri), Covered, Polished, Raw')}
// снимок в дневник: «нет данных», не ноль
{const snap=P.snapshot?P.snapshot(food('A0020000009a')):null;if(snap)assert.equal(P.value(snap,'sug'),null)}

// 5. Названия Claude (130 и 5 совпадавших) — в файле, без английского вместо русского
assert.equal(data.names.claude.length,135);assert.equal(food('K1780000000a').names.ru,'Карп зеркальный (хянъо) — сырой');assert.notEqual(food('K1490000000a').names.ru,food('K1780000000a').names.ru);

// 6. Испорченный файл и чужая единица — ошибка, а не тихие нули
assert.throws(()=>K.ingest({schema:'x',foods:[]}));
{const bad=structuredClone(data);bad.fields.B10100.unit='g';assert.throws(()=>K.ingest(bad),/KFCT unit/)}
{const bad=structuredClone(data);bad.foods[1].c=bad.foods[0].c;assert.throws(()=>K.ingest(bad))}
{const bad=structuredClone(data);bad.foods[0].v[0]='abc';assert.throws(()=>K.ingest(bad),/KFCT value/)}
console.log('Passed: KFCT 10.4 — 3366 foods with Russian names, Meal fields only where compatible (units converted), carbs without fiber (total and fiber as own rows), RAE/vitamin E as own rows, missing/trace/estimated kept, catalog on by default and without duplicates, English names on request.');
