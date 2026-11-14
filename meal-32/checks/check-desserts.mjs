/* Библиотека десертов → Happy Meal: адаптер desserts.js на реальном файле библиотеки.
   С десертов 1.2 (12.11.2026) выпуск читает запись манифеста «desserts2»; Meal 25–30 остаются на «desserts» (1.1).
   Файл: аргумент командной строки (путь к desserts-1.2.json или .json.gz), иначе — файл записи «desserts2» из ветки
   библиотек (HAPPY_LIBRARIES_REF, по умолчанию origin/meal-libraries). Для проверки снимков дневника нужна и прежняя
   запись «desserts» (1.1) — из той же ветки или вторым аргументом.
   Проверяет: разбор и валидацию 34 собственных карточек, 69 отметок принадлежности, порции и единицы, расчёт на
   50/100/150 г, границы «менее», углеводы этикеток США отдельной строкой, отсутствие второго продукта на один ID,
   включение/отключение базы; с 1.2 — ревизию карточки из записи, витамины чизкейка (B1; ниацин и фолиевая кислота —
   своими строками; B2 — «≈» оценка по USDA 172711, рибофлавин изготовителя — в рабочих данных; B3/B9 — «нет данных»),
   модель козинака целиком, типовые названия 27 карточек 1.0 без марок и продавцов (состав прежний) и снимки дневника
   до и после обновления. */
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const here=new URL('./',import.meta.url),app=new URL('../',here),repo=new URL('../',app);
const REF=process.env.HAPPY_LIBRARIES_REF||'origin/meal-libraries';
const git=p=>execFileSync('git',['show',REF+':'+p],{cwd:repo,maxBuffer:64*1024*1024});
const text=b=>b[0]===31&&b[1]===139?gunzipSync(b).toString('utf8'):b.toString('utf8');
let manifest=null;try{manifest=JSON.parse(git('manifest.json').toString('utf8'))}catch(e){}
const entryFile=id=>{const e=manifest&&manifest.libraries[id];assert.ok(e,'в манифесте '+REF+' нет записи «'+id+'»');return text(git('data/'+e.url.split('/data/')[1]))};
const data=JSON.parse(process.argv[2]?text(await readFile(process.argv[2])):entryFile('desserts2'));
const prev=JSON.parse(process.argv[3]?text(await readFile(process.argv[3])):entryFile('desserts'));
assert.equal(data.version,'1.2.0','файл записи desserts2 — десерты 1.2.0');
assert.equal(prev.version,'1.1.0','прежняя запись desserts — 1.1.0 (для Meal 25–30)');
function boot(){
 const win={};win.window=win;win.globalThis=win;win.Intl=Intl;win.JSON=JSON;win.Number=Number;win.Math=Math;win.Object=Object;win.Array=Array;win.String=String;win.Set=Set;win.Map=Map;win.Promise=Promise;win.Error=Error;win.RegExp=RegExp;win.Date=Date;win.console=console;
 return win;
}
const win=boot(),ctx=vm.createContext(win);
const code={};for(const f of ['shared/meal-products-model.js','report.js','sources.js','desserts.js'])code[f]=await readFile(new URL(f,app),'utf8');
for(const f in code)vm.runInContext(code[f],ctx,{filename:f});
const {MealProducts:P,MealReport,MealSources,MealDesserts}=win;
const plain=x=>JSON.parse(JSON.stringify(x));   // объекты из контекста vm: сравнивать по содержимому, не по прототипу
assert.ok(P&&MealReport&&MealSources&&MealDesserts,'модули загружены');
assert.ok(code['desserts.js'].includes("LIBRARY='desserts2'"),'выпуск читает запись манифеста desserts2');

// 1. Разбор
const own=MealDesserts.ingest(structuredClone(data));
assert.equal(own,34,'34 собственные карточки');
const foods=MealDesserts.foods(),memberIds=MealDesserts.memberIds();
assert.equal(memberIds.filter(id=>!/^bls:Z/.test(id)||!memberIds.includes('kav:'+id.slice(4))).length,69,'69 записей других библиотек');
assert.equal(MealDesserts.counts().total,103);
assert.equal(data.foods.filter(f=>f.id.startsWith('hmdessert:')).length,34);
assert.ok(!data.foods.some(f=>f.eligibleForImport!==true),'черновики не попали в файл');
for(const f of foods){P.validate(f);assert.equal(f.catalogSource,'HM-DESSERT');assert.ok(f.w.includes('десерт'),'слово поиска «десерт»: '+f.id)}
assert.equal(new Set(foods.map(f=>f.id)).size,34,'ID уникальны');
assert.equal(new Set(foods.map(f=>f.n.toLowerCase())).size,34,'названия уникальны');
assert.ok(!foods.some(f=>memberIds.includes(f.id)),'собственная карточка не дублирует запись другой библиотеки');

// 2. Основные нутриенты и единицы
const byId=Object.fromEntries(data.foods.map(r=>[r.id,r]));
const us=foods.filter(f=>/-us$/.test(f.id));
assert.equal(us.length,6,'шесть этикеток США');
for(const f of foods){
 const r=byId[f.id],vals=Object.fromEntries(r.nutrients.map(n=>[n.key.split(':').pop(),n]));
 const kcal=r.recordKind==='branded_label'?vals.energy_kcal:vals['1008'],prot=r.recordKind==='branded_label'?vals.protein:vals['1003'],fat=r.recordKind==='branded_label'?vals.fat:vals['1004'];
 assert.equal(P.value(f,'kcal'),kcal.value,'ккал '+f.id);assert.equal(P.value(f,'prot'),prot.value,'белки '+f.id);assert.equal(P.value(f,'fat'),fat.value,'жиры '+f.id);
 assert.equal(f.k,kcal.value);assert.equal(f.p,prot.value);assert.equal(f.f,fat.value);
 if(r.recordKind==='branded_label'&&!/-us$/.test(f.id))assert.equal(P.value(f,'carb'),vals.carbohydrate.value,'углеводы этикетки '+f.id);
 else{assert.equal(P.value(f,'carb'),null,'углеводы США/USDA по разности — не поле Meal: '+f.id);const custom=f.composition.fields.find(x=>x.key==='prop:dessert:carbohydrate'||x.key==='prop:usda:1005');assert.ok(custom&&custom.status==='value','отдельная строка углеводов: '+f.id)}
 for(const field of f.composition.fields){assert.ok(field.status!=='value'||(Number.isFinite(field.value)&&field.value>=0));if(field.kind==='custom')assert.ok(field.key.startsWith('prop:'))}
 // ключ этикетки без русского названия на экране не выходит
 for(const field of f.composition.fields)if(field.kind==='custom'&&field.key.startsWith('prop:dessert:'))assert.ok(!/^[a-z0-9_]+$/.test(field.name),'английский ключ вместо названия: '+f.id+' '+field.name);
 for(const g of [50,100,150]){const v=P.value(f,'kcal')*g/100;assert.ok(Math.abs(v-kcal.value*g/100)<1e-9)}
 assert.equal(f.composition.basisGrams,100);
}
const brownie=foods.find(f=>f.id==='hmdessert:brownie-icecream-60-40');
const dhaSrc=byId[brownie.id].nutrients.find(n=>n.key==='usda:1272');
if(dhaSrc&&dhaSrc.value!=null)assert.equal(P.value(brownie,'dha'),dhaSrc.value*1000,'ДГК г → мг');
const haribo=foods.find(f=>f.id==='hmdessert:label:haribo-goldbears-uk');
assert.equal(P.value(haribo,'na'),null,'соль есть, натрий этикетка не даёт — не ноль');
assert.equal(P.value(haribo,'salt'),byId[haribo.id].nutrients.find(n=>n.key.endsWith(':salt')).value);

// 3. Граница «менее»
const less=foods.flatMap(f=>f.composition.fields.filter(x=>x.sourceQualifier&&x.sourceQualifier.state==='less_than').map(x=>[f.id,x.key,x.value]));
assert.equal(less.length,2,'две границы «менее» в наборе');
assert.deepEqual(plain(less.map(x=>x[0]+' '+x[1]+' '+x[2]).sort()),['hmdessert:label:haribo-goldbears-uk fat 0.5','hmdessert:label:haribo-rainbow-strips-zing-uk prot 0.5'],'жиры Goldbears и белки Rainbow Strips — «менее 0,5 г»');
assert.ok(haribo.composition.fields.find(x=>x.key==='fat').notes.includes('верхняя граница'));

// 4. Порции
assert.deepEqual(plain(haribo.por),{'порция ≈ 10 шт':25,'порция':25});
const kozinaki=foods.find(f=>f.id==='hmdessert:seed-kozinaki-deluxe-440g');assert.deepEqual(plain(kozinaki.por),{'шт':22});
const pasquier=foods.find(f=>f.id==='hmdessert:label:pasquier-pain-au-chocolat-fr');assert.deepEqual(plain(pasquier.por),{'шт':45,'порция':45});
const noPortion=foods.filter(f=>!Object.keys(f.por).length);assert.equal(noPortion.length,8,'восемь карточек без размера порции — запись по граммам');
for(const f of foods)for(const [label,g] of Object.entries(f.por)){assert.ok(label&&label!=='г'&&label.length<=80&&g>0)}
assert.ok(noPortion.every(f=>f.porNote.includes('по введённым граммам')));

// 5. Принадлежность без второго продукта
const dict={},list=[];
const usdaFood={id:'usda:172711',n:'Cake, cheesecake, commercially prepared',names:{en:'Cake, cheesecake, commercially prepared'},catalogSource:'USDA',src:'USDA',w:['cake','cheesecake','commercially','prepared'],k:321,p:5.5,f:22.5,c:null,por:{}};
const uzFood={id:'hmuz:chak-chak-sugar-lemon-syrup',n:'Чак-чак в сахарно-лимонном сиропе, без мёда',names:{ru:'Чак-чак в сахарно-лимонном сиропе, без мёда'},catalogSource:'HM-UZ',w:['чак','сахарно','лимонном','сиропе','без','меда'],por:{}};
const blsPicked={id:'bls:D300200',n:'Торт «Захер»',w:['торт','захер'],src:'BLS',b:'D300200',por:{}};
for(const f of [usdaFood,uzFood,blsPicked]){dict[f.id]=f;list.push(f)}
win.BLS={f:[['D300200','Торт «Захер»','',''],['Y996440','Сорбет лимонный','',''],['X100000','Яблоко','','']]};win.BLS_X=['','',''];
MealDesserts.append({catalogLang:'ru'},dict,list);
assert.equal(list.length,37,'34 новых + 3 прежних, без дублей');
assert.equal(dict['usda:172711'].names.ru,'Чизкейк, промышленный','русское название USDA из коллекции');
assert.ok(dict['usda:172711'].w.includes('чизкейк')&&dict['usda:172711'].w.includes('десерт'));
assert.equal(dict['usda:172711'].k,321,'состав карточки USDA не тронут');
assert.ok(dict['hmuz:chak-chak-sugar-lemon-syrup'].dessertCollection&&dict['hmuz:chak-chak-sugar-lemon-syrup'].w.includes('десерт'));
assert.ok(dict['bls:D300200'].dessertCollection);
assert.deepEqual(plain(win.BLS_X),['десерт','десерт',''],'слово «десерт» у строк BLS коллекции и только у них');
assert.ok(MealDesserts.membershipHTML(dict['usda:172711']).includes('«Десерты»')&&!MealDesserts.membershipHTML(dict['usda:172711']).includes('1.0'),'Meal 31.1: без номера версии');
assert.equal(MealDesserts.membershipHTML({id:'bls:X100000',n:'Яблоко'}),'');
// повторный rebuild: отметки не задваиваются
const before=dict['usda:172711'].w.length;MealDesserts.append({catalogLang:'ru'},dict,list);assert.equal(dict['usda:172711'].w.length,before);assert.equal(list.length,37);
// английский язык каталога: имя остаётся английским, русское доступно
const en='Cake, cheesecake, commercially prepared',dictEn={'usda:172711':{id:'usda:172711',n:en,names:{en:en},catalogSource:'USDA',src:'USDA',w:['cake','cheesecake'],por:{}}};MealDesserts.append({catalogLang:'en'},dictEn,[]);
assert.equal(dictEn['usda:172711'].n,en);assert.equal(dictEn['usda:172711'].names.ru,'Чизкейк, промышленный');

// 6. Переключатель баз
assert.ok(MealSources.catalog.some(s=>s.id==='DESSERT'),'база «Десерты» в переключателе');
const db={};assert.equal(MealSources.enabled(db,'DESSERT'),true,'включена по умолчанию');
assert.equal(MealSources.sourceOf(haribo),'DESSERT');assert.equal(MealSources.sourceOf(dict['usda:172711']),'USDA','запись USDA из коллекции остаётся в USDA');
assert.ok(MealSources.setEnabled(db,'DESSERT',false));assert.equal(MealSources.available(db,haribo),false,'выключение скрывает собственные карточки');
assert.equal(MealSources.available(db,dict['usda:172711']),true,'…но не записи USDA');
assert.ok(MealSources.setEnabled(db,'DESSERT',true));assert.equal(MealSources.available(db,haribo),true);

// 7. Карточка и настройки: версия и дата — из файла библиотеки, не из кода; в карточке — без пояснений-перестраховок (Meal 31.1)
assert.ok(MealDesserts.infoHTML(haribo).includes('Великобритания')&&!MealDesserts.infoHTML(haribo).includes('верхняя граница'),'Meal 31.1: «< 0,5 г» — в таблице, без пояснения в карточке');
assert.ok(!MealDesserts.infoHTML(pasquier).includes('Отметки проверки')&&!MealDesserts.infoHTML(pasquier).includes('portion_energy_kj'),'Meal 31.1: флаги проверки — в данных, не в карточке');
assert.ok(MealDesserts.infoHTML(foods.find(f=>f.id==='hmdessert:label:kyivbkk-french-eclair-ua')).includes('Украина'),'регион этикетки Украины назван');
for(const f of foods)assert.ok(!/Десерты 1\.[01]/.test(MealDesserts.infoHTML(f)+MealDesserts.footer(f)),'в карточке нет прежней версии: '+f.id);
for(const f of foods)for(const x of f.composition.fields)assert.ok(x.sourceQualifier&&x.sourceQualifier.estimated?x.source.includes('FDC 172711')&&x.source.includes('оценка по близкому продукту'):x.source.startsWith('Happy Meal · Десерты 1.2 · '),'источник поля — версия из файла или сама оценка: '+f.id+' '+x.key);
assert.equal(MealDesserts.footer(haribo),'Каталог «Десерты» · ChatGPT, 12.11.2026','подпись — автор и дата из файла');
assert.ok(MealDesserts.settingsHTML().includes('103 записей')&&MealDesserts.settingsHTML().includes('Библиотека десертов 1.2'));
assert.equal(MealDesserts.status(),'ok');

// 8. Снимок в дневник: без служебных полей и с полным составом
const snap=P.snapshot(dict['hmdessert:label:haribo-goldbears-uk']);assert.ok(!snap.w&&snap.composition.fields.length===77,'76 стандартных полей Meal + 1 своё (кДж)');

// 9. Ревизия карточки — из записи; без поля — прежняя 20261109
const NY='hmdessert:label:jon-donaire-new-york-25386-us',KZ='hmdessert:seed-kozinaki-deluxe-440g';
for(const f of foods)assert.equal(f.revision,byId[f.id].revision==null?20261109:byId[f.id].revision,'ревизия '+f.id);
const renamed=data.foods.filter(r=>r.sourceContext&&r.sourceContext.titleDecision).map(r=>r.id);
assert.equal(renamed.length,27,'27 карточек 1.0 переименованы');
assert.deepEqual(plain(foods.filter(f=>f.revision!==20261109).map(f=>f.id).sort()),[KZ,NY,...renamed].sort(),'новая ревизия — у двух исправленных и 27 переименованных карточек');
for(const bad of [5,'20261112',20261109.5,20261109]){const d=structuredClone(data);d.foods.find(r=>r.id===KZ).revision=bad;assert.throws(()=>MealDesserts.ingest(d),/Invalid dessert record/,'неверная ревизия отклоняется: '+bad)}
MealDesserts.ingest(structuredClone(data));

// 10. Чизкейк Нью-Йорк: тиамин — B1; ниацин и фолиевая кислота — своими строками; B2 — оценка ≈ 0,19 мг по USDA 172711
//     (решение Астамура и Михалыча 12.11 17:47), рибофлавин изготовителя 0,013 — в рабочих данных; B3, B9 — нет данных, не ноль
const ny=MealDesserts.foods().find(f=>f.id===NY),field=k=>ny.composition.fields.find(x=>x.key===k);
assert.equal(P.value(ny,'b1'),0.021,'B1 — тиамин изготовителя');
for(const k of ['b3','b9'])assert.equal(P.value(ny,k),null,'чизкейк: '+k+' — нет данных'),assert.equal(field(k).status,'missing');
assert.equal(P.value(ny,'b2'),0.19,'B2 — оценка 0,19 мг');assert.equal(field('b2').sourceQualifier.estimated,true,'B2 помечен как оценка (≈)');
assert.ok(field('b2').source.includes('FDC 172711')&&field('b2').notes.includes('0,193'),'источник оценки B2 — USDA 172711, 0,193 мг');
const b2=byId[NY].nutrients.find(n=>n.key==='usda:1166');assert.ok(b2&&b2.qualifier==='estimated_from_similar_product'&&b2.estimate.fdcId===172711&&b2.estimate.sourceValue===0.193&&b2.estimate.sourceUrl.endsWith('/172711/nutrients'),'рабочие данные оценки B2');
for(const x of ny.composition.fields)if(x.key!=='b2')assert.ok(!(x.sourceQualifier&&x.sourceQualifier.estimated),'оценка — только B2: '+x.key);
assert.equal(field('prop:dessert:niacin').value,0.166);assert.equal(field('prop:dessert:niacin').unit,'мг');assert.equal(field('prop:dessert:niacin').name,'Ниацин (без триптофана)');
assert.ok(field('prop:dessert:niacin').notes.includes('ниациновый эквивалент'));
assert.equal(field('prop:dessert:folic_acid').value,4.307);assert.equal(field('prop:dessert:folic_acid').unit,'мкг');assert.equal(field('prop:dessert:folic_acid').name,'Фолиевая кислота');
assert.ok(field('prop:dessert:folic_acid').notes.includes('не общий фолат'));
assert.ok(!ny.composition.fields.some(x=>/riboflavin|рибофлавин/i.test(x.key+' '+(x.kind==='custom'?x.name:''))),'рибофлавин — только в строке B2, своей строки нет');
assert.ok(!JSON.stringify(byId[NY].nutrients).includes(':riboflavin')&&byId[NY].sourceContext.heldNotShown.fields.riboflavin.value===0.013&&byId[NY].sourceContext.heldNotShown.fields.riboflavin.source.includes('Rich'),'рибофлавин изготовителя 0,013 — только в рабочих данных, с источником');
assert.ok(!MealDesserts.infoHTML(ny).includes('172711')&&!/рибофлавин|USDA/i.test(ny.sourceNotes),'в карточке нет поясняющей строки про B2');
assert.ok(!('heldForNextMealRelease' in byId[NY].sourceContext),'отложенные поля не лежат в двух местах');
assert.equal(P.value(ny,'kcal'),356.459);assert.equal(P.value(ny,'ca'),76.276);assert.equal(ny.n,'Чизкейк Нью-Йорк, классический');
assert.ok(Math.abs(P.value(ny,'b1')*113/100-0.02373)<1e-12,'порция 113 г');

// 11. Козинак: вся модель — по очищенному кунжуту, одна ревизия для КБЖУ и минералов
const kz=MealDesserts.foods().find(f=>f.id===KZ),src=byId[KZ];
assert.deepEqual(plain(src.sourceContext.ingredients.map(i=>i.sourceId+' '+i.grams)),['usda:170562 250','usda:169412 50','usda:169655 120','usda:169640 30','usda:173468 2'],'ингредиенты рецепта, очищенный кунжут');
assert.equal(src.nutrients.length,16,'16 показателей из одного набора ингредиентов');
const exp={kcal:529.7954545454545,prot:14.156818181818181,fat:36.215909090909086,fib:6.218181818181818,sug:34.35909090909091,na:187.36363636363635,ca:51.92727272727272,fe:3.7494545454545447,mg:224.00454545454545,p:451.0681818181818,k:412.65,zn:3.623863636363636,cu:1.1863181818181818,mn:1.278590909090909};
for(const [k,v] of Object.entries(exp))assert.ok(Math.abs(P.value(kz,k)-v)<1e-9,'козинак '+k+': '+P.value(kz,k));
assert.ok(Math.abs(kz.composition.fields.find(x=>x.key==='prop:usda:1103').value-34.24136363636364)<1e-9,'селен');
assert.ok(Math.abs(kz.composition.fields.find(x=>x.key==='prop:usda:1005').value-45.584090909090904)<1e-9,'углеводы по разности — отдельной строкой');
for(const k of ['b1','b2','vE','leu','sfa'])assert.equal(P.value(kz,k),null,'витамины, аминокислоты и жирные кислоты не заполнены: '+k);
assert.ok(Math.abs(P.value(kz,'kcal')*22/100-116.555)<1e-9,'плитка 22 г');

// 13. Типовые названия: в видимых текстах собственных карточек нет марок, продавцов и кодов; состав переименованных — прежний
const BRANDS=['HARIBO','Goldbears','Rainbow Strips','Z!NG','Trolli','Glühwürmchen','Sour Brite','Crawlers','Chupa','Cola Faces','Pasquier','Pastoret','Cinnabon','Minibon','Pecanbon','CinnaPack','Hostess','Donettes','Guzman','Ekler','МясновЪ','Мяснов','Кондитерские традиции','WIENER','Сибторг','Бонжур','Дом выпечки','Cheeseberry','FARFOR','Prime Star','Dartmoor','Coop','Croccante','Brittle-Brittle','Tesco','Rich\'s','Jon Donaire','Nuttinelle','DukesHill','Kyiv','Deluxe'];
for(const r of data.foods.filter(r=>r.id.startsWith('hmdessert:'))){
 const f=MealDesserts.foods().find(x=>x.id===r.id),visible=[f.n,f.sourceNotes,f.porNote,MealDesserts.infoHTML(f).replace(/<a [^>]*>[^<]*<\/a>/g,'')].join(' ').toLowerCase();
 for(const b of BRANDS)assert.ok(!visible.includes(b.toLowerCase()),'марка или продавец на экране: '+r.id+' — '+b);
 assert.ok(!/ean\s?\d{8}|\b\d{12,13}\b/i.test(visible),'код товара на экране: '+r.id);
}
const prevById=Object.fromEntries(prev.foods.map(r=>[r.id,r]));
for(const id of renamed){const a=prevById[id],b=byId[id];
 assert.equal(b.sourceContext.titleAsInSource,a.titleRu,'исходное название — в рабочих данных: '+id);
 for(const k of ['nutrients','portions','basis','recordKind','sourceUrls'])assert.equal(JSON.stringify(b[k]),JSON.stringify(a[k]),'переименование не меняет '+k+': '+id);
}
const bears=MealDesserts.foods().find(f=>f.id==='hmdessert:label:haribo-goldbears-uk');
assert.equal(bears.n,'Мармеладные мишки');assert.ok(bears.w.includes('haribo'),'марка находит карточку в поиске (слово технического ID), на экран не выводится');
assert.ok(byId['hmdessert:label:coop-hazelnut-croccante-it'].sourceContext.ean==='8001120693037','штрихкод — в рабочих данных');
const lemon=data.foods.filter(r=>r.titleRu==='Сорбет лимонный').map(r=>r.id).sort();
assert.deepEqual(lemon,['bls:Y996440','hmdessert:label:dartmoor-lemon-sorbet-uk'],'два «Сорбета лимонных» — разные записи, не объединены');

// 12. Дневник: запись до обновления хранит свой снимок, новая — новый (ключ id@ревизия)
const old=boot(),octx=vm.createContext(old);for(const f in code)vm.runInContext(code[f],octx,{filename:f});
old.MealDesserts.ingest(structuredClone(prev));
const oldKz=old.MealDesserts.foods().find(f=>f.id===KZ);assert.equal(oldKz.revision,20261109);assert.equal(old.MealProducts.value(oldKz,'ca'),null,'в 1.1 кальция не было');
const BEARS='hmdessert:label:haribo-goldbears-uk';
const diary={days:{'2026-11-10':{items:[{id:'a',fid:KZ,g:22,sec:'b'},{id:'n1',fid:NY,g:113,sec:'b'},{id:'h1',fid:BEARS,g:25,sec:'b'}]}}};
old.MealProducts.snapshotItems(diary,Object.fromEntries(old.MealDesserts.foods().map(f=>[f.id,f])));
const inDiary=JSON.parse(JSON.stringify(diary));
inDiary.days['2026-11-13']={items:[{id:'b',fid:KZ,g:22,sec:'b'},{id:'n2',fid:NY,g:113,sec:'b'},{id:'h2',fid:BEARS,g:25,sec:'b'}]};
const dictNew=Object.fromEntries(MealDesserts.foods().map(f=>[f.id,f]));
P.snapshotItems(inDiary,dictNew);
const item=(d,i)=>inDiary.days[d].items[i],at=(d,i)=>P.forItem(item(d,i),dictNew,inDiary);
assert.equal(item('2026-11-10',0).productRevision,KZ+'@20261109');assert.equal(item('2026-11-13',0).productRevision,KZ+'@20261112');
assert.ok(Math.abs(P.value(at('2026-11-10',0),'kcal')-523.2045454545454)<1e-9,'прежняя запись — прежний состав');
assert.equal(P.value(at('2026-11-10',0),'ca'),null);
assert.ok(Math.abs(P.value(at('2026-11-13',0),'kcal')-529.7954545454545)<1e-9&&Math.abs(P.value(at('2026-11-13',0),'ca')-51.92727272727272)<1e-9,'новая запись — новый состав');
assert.equal(P.value(at('2026-11-10',1),'b1'),null);assert.equal(P.value(at('2026-11-13',1),'b1'),0.021,'чизкейк: новая запись с B1');
assert.equal(P.value(at('2026-11-10',1),'b2'),null);assert.equal(P.value(at('2026-11-13',1),'b2'),0.19,'чизкейк: новая запись с B2 ≈ 0,19');
assert.equal(at('2026-11-10',2).n,'HARIBO Goldbears, UK','прежняя запись — с прежним названием');assert.equal(at('2026-11-13',2).n,'Мармеладные мишки','новая запись — с типовым названием');
assert.equal(P.value(at('2026-11-13',2),'kcal'),P.value(at('2026-11-10',2),'kcal'),'состав мишек тот же');
assert.equal(Object.keys(inDiary.productSnapshots).length,6,'по снимку на каждую ревизию трёх карточек');

console.log('Passed desserts 1.2 (desserts2): 34 own cards (6 US labels), 69 marks, 103 total; revision from records (29 changed cards → 20261112, others 20261109); New York cheesecake B1 0.021 mg, niacin and folic acid in own rows, B2 ≈ 0.19 mg estimated from USDA 172711 (manufacturer 0.013 kept in working data), B3/B9 unknown; kozinaki 16 nutrients from one hulled-sesame model; 27 cards renamed without brands/sellers/codes on screen, composition unchanged, original names in working data, brand still searchable via ID; diary snapshots before/after kept apart; portions, bounds, source switch, card and settings text from the library file.');
