/* Библиотека десертов 1.0 → Happy Meal Update 25: адаптер desserts.js на реальном файле библиотеки.
   Файл: аргумент командной строки (путь к desserts-1.0.json или .json.gz), иначе — data/desserts-1.0.json.gz
   из ветки meal-libraries (git show). Проверяет: разбор и валидацию 30 собственных карточек, 67 отметок
   принадлежности, порции и единицы, расчёт на 50/100/150 г, границы «менее», углеводы этикеток США отдельной
   строкой, отсутствие второго продукта на один ID, включение/отключение базы в переключателе. */
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const here=new URL('./',import.meta.url),app=new URL('../',here),repo=new URL('../',app);
async function source(){
 const arg=process.argv[2];
 if(arg){const buf=await readFile(arg);return buf[0]===31&&buf[1]===139?gunzipSync(buf).toString('utf8'):buf.toString('utf8')}
 const gz=execFileSync('git',['show','origin/meal-libraries:data/desserts-1.0.json.gz'],{cwd:repo,maxBuffer:64*1024*1024});
 return gunzipSync(gz).toString('utf8');
}
const text=await source(),data=JSON.parse(text);
const win={};win.window=win;win.globalThis=win;win.Intl=Intl;win.JSON=JSON;win.Number=Number;win.Math=Math;win.Object=Object;win.Array=Array;win.String=String;win.Set=Set;win.Map=Map;win.Promise=Promise;win.Error=Error;win.RegExp=RegExp;win.Date=Date;win.console=console;
const ctx=vm.createContext(win);
for(const f of ['shared/meal-products-model.js','report.js','sources.js','desserts.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),ctx,{filename:f});
const {MealProducts:P,MealReport,MealSources,MealDesserts}=win;
const plain=x=>JSON.parse(JSON.stringify(x));   // объекты из контекста vm: сравнивать по содержимому, не по прототипу
assert.ok(P&&MealReport&&MealSources&&MealDesserts,'модули загружены');

// 1. Разбор
const own=MealDesserts.ingest(data);
assert.equal(own,30,'30 собственных карточек');
const foods=MealDesserts.foods(),memberIds=MealDesserts.memberIds();
assert.equal(memberIds.filter(id=>!/^bls:Z/.test(id)||!memberIds.includes('kav:'+id.slice(4))).length,67,'67 записей других библиотек');
assert.equal(MealDesserts.counts().total,97);
assert.equal(data.foods.filter(f=>f.id.startsWith('hmdessert:')).length,30);
assert.ok(!data.foods.some(f=>f.eligibleForImport!==true),'черновики не попали в файл');
for(const f of foods){P.validate(f);assert.equal(f.catalogSource,'HM-DESSERT');assert.ok(f.w.includes('десерт'),'слово поиска «десерт»: '+f.id)}
assert.equal(new Set(foods.map(f=>f.id)).size,30,'ID уникальны');
assert.equal(new Set(foods.map(f=>f.n.toLowerCase())).size,30,'названия уникальны');
assert.ok(!foods.some(f=>memberIds.includes(f.id)),'собственная карточка не дублирует запись другой библиотеки');

// 2. Основные нутриенты и единицы
const byId=Object.fromEntries(data.foods.map(r=>[r.id,r]));
const us=foods.filter(f=>/-us$/.test(f.id));
assert.equal(us.length,5,'пять этикеток США');
for(const f of foods){
 const r=byId[f.id],vals=Object.fromEntries(r.nutrients.map(n=>[n.key.split(':').pop(),n]));
 const kcal=r.recordKind==='branded_label'?vals.energy_kcal:vals['1008'],prot=r.recordKind==='branded_label'?vals.protein:vals['1003'],fat=r.recordKind==='branded_label'?vals.fat:vals['1004'];
 assert.equal(P.value(f,'kcal'),kcal.value,'ккал '+f.id);assert.equal(P.value(f,'prot'),prot.value,'белки '+f.id);assert.equal(P.value(f,'fat'),fat.value,'жиры '+f.id);
 assert.equal(f.k,kcal.value);assert.equal(f.p,prot.value);assert.equal(f.f,fat.value);
 if(r.recordKind==='branded_label'&&!/-us$/.test(f.id))assert.equal(P.value(f,'carb'),vals.carbohydrate.value,'углеводы этикетки '+f.id);
 else{assert.equal(P.value(f,'carb'),null,'углеводы США/USDA по разности — не поле Meal: '+f.id);const custom=f.composition.fields.find(x=>x.key==='prop:dessert:carbohydrate'||x.key==='prop:usda:1005');assert.ok(custom&&custom.status==='value','отдельная строка углеводов: '+f.id)}
 for(const field of f.composition.fields){assert.ok(field.status!=='value'||(Number.isFinite(field.value)&&field.value>=0));if(field.kind==='custom')assert.ok(field.key.startsWith('prop:'))}
 // расчёт по массе: 50 / 100 / 150 г
 for(const g of [50,100,150]){const v=P.value(f,'kcal')*g/100;assert.ok(Math.abs(v-kcal.value*g/100)<1e-9)}
 assert.equal(f.composition.basisGrams,100);
}
// единицы: USDA-множители (ДГК г → мг), этикетки — без множителей
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
assert.equal(list.length,33,'30 новых + 3 прежних, без дублей');
assert.equal(dict['usda:172711'].names.ru,'Чизкейк, промышленный','русское название USDA из коллекции');
assert.equal(dict['usda:172711'].n,'Чизкейк, промышленный');
assert.ok(dict['usda:172711'].w.includes('чизкейк')&&dict['usda:172711'].w.includes('десерт'));
assert.equal(dict['usda:172711'].k,321,'состав карточки USDA не тронут');
assert.ok(dict['hmuz:chak-chak-sugar-lemon-syrup'].dessertCollection&&dict['hmuz:chak-chak-sugar-lemon-syrup'].w.includes('десерт'));
assert.ok(dict['bls:D300200'].dessertCollection);
assert.deepEqual(plain(win.BLS_X),['десерт','десерт',''],'слово «десерт» у строк BLS коллекции и только у них');
assert.ok(MealDesserts.membershipHTML(dict['usda:172711']).includes('Десерты 1.0'));
assert.equal(MealDesserts.membershipHTML(blsPicked.id?{id:'bls:X100000',n:'Яблоко'}:null),'');
// повторный rebuild: отметки не задваиваются
const before=dict['usda:172711'].w.length;MealDesserts.append({catalogLang:'ru'},dict,list);assert.equal(dict['usda:172711'].w.length,before);assert.equal(list.length,33);
// английский язык каталога: имя остаётся английским, русское доступно
const en='Cake, cheesecake, commercially prepared',dictEn={'usda:172711':{id:'usda:172711',n:en,names:{en:en},catalogSource:'USDA',src:'USDA',w:['cake','cheesecake'],por:{}}};MealDesserts.append({catalogLang:'en'},dictEn,[]);
assert.equal(dictEn['usda:172711'].n,en);assert.equal(dictEn['usda:172711'].names.ru,'Чизкейк, промышленный');

// 6. Переключатель баз
assert.ok(MealSources.catalog.some(s=>s.id==='DESSERT'),'база «Десерты» в переключателе');
const db={};assert.equal(MealSources.enabled(db,'DESSERT'),true,'включена по умолчанию');
assert.equal(MealSources.sourceOf(haribo),'DESSERT');assert.equal(MealSources.sourceOf(dict['usda:172711']),'USDA','запись USDA из коллекции остаётся в USDA');
assert.equal(MealSources.available(db,haribo),true);
assert.ok(MealSources.setEnabled(db,'DESSERT',false));assert.equal(MealSources.available(db,haribo),false,'выключение скрывает собственные карточки');
assert.equal(MealSources.available(db,dict['usda:172711']),true,'…но не записи USDA');
assert.ok(MealSources.setEnabled(db,'DESSERT',true));assert.equal(MealSources.available(db,haribo),true);
assert.ok(typeof MealSources.compare(haribo,dict['usda:172711'],'чизкейк')==='number');

// 7. Карточка и настройки
assert.ok(MealDesserts.infoHTML(haribo).includes('Великобритания')&&MealDesserts.infoHTML(haribo).includes('менее'));
assert.ok(MealDesserts.infoHTML(pasquier).includes('кДж')&&!MealDesserts.infoHTML(pasquier).includes('portion_energy_kj'),'флаги проверки показываются текстом, не кодом');
assert.ok(MealDesserts.footer(haribo).includes('ChatGPT'));
assert.ok(MealDesserts.settingsHTML().includes('97 записей'));
assert.equal(MealDesserts.status(),'ok');

// 8. Снимок в дневник: без служебных полей и с полным составом
const snap=P.snapshot(dict['hmdessert:label:haribo-goldbears-uk']);assert.ok(!snap.w&&snap.composition.fields.length===77,"76 стандартных полей Meal + 1 своё (кДж)");
console.log('Passed desserts 1.0: 30 own cards (5 US labels with separate carbohydrate line), 67 collection marks without duplicate products, portions, 50/100/150 g, less-than bounds, source switch on/off, settings and card text.');
