/* Real MEXT records exercise the same model, search, snapshots and diary export as the app. */
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(await read('meal-data/mext2023.json'));
const c=vm.createContext({crypto:webcrypto,Intl,console,DB:{days:{},foods:[],favs:[],catalogLang:'ru'},FOODS:{},LIST:[]});
for(const file of ['shared/meal-products-model.js','meal/report.js','meal/catalog.js'])vm.runInContext(await read(file),c);
const {MealCatalog:C,MealProducts:P,MealReport:R}=c;
C.ingest(data);C.addRecipes();C.append(c.DB,c.FOODS,c.LIST);
assert.equal(data.foods.length,520);assert.equal(c.LIST.length,529);assert.equal(new Set(c.LIST.map(f=>f.id)).size,c.LIST.length);
for(const f of c.LIST){assert.equal(P.validate(f),true);assert.equal(f.b,undefined);for(const l of ['ru','en','ja'])assert.ok(f.names[l]);}
const saury=c.FOODS['mext:10173'];assert.equal(saury.k,287);assert.equal(P.value(saury,'epa'),1500);assert.equal(P.value(saury,'dha'),2200);assert.equal(P.value(saury,'ile'),0.86);assert.equal(P.value(saury,'vC'),0);assert.equal(P.value(saury,'vA'),null);assert.equal(P.value(saury,'vE'),null);
assert.ok(saury.composition.fields.some(x=>x.kind==='custom'&&/RAE/.test(x.name)&&x.value===16));
for(const query of ['сайра','Pacific saury','さんま'])assert.ok(C.search(query,c.LIST).some(f=>f.id===saury.id));
assert.ok(C.variants(saury).every(f=>f.catalogFamily==='saury-skin'));
assert.ok(!C.search('сайра',c.LIST).some(f=>f.names.ru.startsWith('Сайда')));
const bls={id:'bls:TEST',n:'Исходный BLS',w:['исходный'],src:'BLS',b:'TEST'};c.FOODS[bls.id]=bls;c.LIST.push(bls);C.append(c.DB,c.FOODS,c.LIST);assert.equal(c.FOODS[bls.id],bls);assert.equal(new Set(c.LIST.map(f=>f.id)).size,c.LIST.length);
c.DB.catalogLang='ja';C.append(c.DB,c.FOODS,c.LIST);assert.equal(c.FOODS[saury.id].n,saury.names.ja);assert.ok(C.search('сайра',c.LIST).length);c.DB.catalogLang='ru';C.append(c.DB,c.FOODS,c.LIST);
const before=JSON.stringify(saury),copy=P.fromFood(saury,R.fields(),()=>null,{copy:true,sourceInfo:saury.sourceInfo});copy.n='Сайра — моя копия';P.validate(copy);assert.equal(copy.catalogSource,undefined);assert.equal(copy.names,undefined);assert.notEqual(copy.id,saury.id);assert.equal(copy.copiedFrom.code,'10173');assert.equal(P.value(copy,'epa'),1500);assert.ok(copy.copiedFrom.sourceInfo.originalValues);P.fieldFor(copy,'epa').value=100;assert.equal(JSON.stringify(saury),before);
const item={id:'test-only',fid:saury.id,sec:'dn',g:150,q:150,u:'г',t:'18:00'};c.DB.days={'2026-10-29':{items:[item]}};c.DB.favs=[saury.id];C.cacheUsed(c.DB,c.FOODS);assert.ok(P.snapshotItems(c.DB,c.FOODS));const saved=JSON.parse(JSON.stringify(c.DB));
const rows=R.records(saved,c.FOODS,{a:'2026-10-29',b:'2026-10-29'},()=>null);assert.equal(rows[0].values.kcal,430.5);assert.equal(rows[0].values.epa,2250);assert.equal(rows[0].values.dha,3300);assert.equal(rows[0].values.vC,0);assert.equal(rows[0].values.vA,null);assert.equal(rows[0].code,'10173');assert.match(rows[0].nutrientSource,/MEXT/);
const exchange=P.exchange(saved,c.FOODS,R.fields(),()=>null);assert.equal(exchange.days['2026-10-29'].standard.epa.value,2250);assert.equal(exchange.days['2026-10-29'].standard.vA.missing,1);
// A catalogue update cannot rewrite the composition already recorded in the diary.
c.FOODS[saury.id]=P.clone(saury);P.fieldFor(c.FOODS[saury.id],'epa').value=1;assert.equal(P.value(P.forItem(item,c.FOODS,saved),'epa'),1500);
// Load only persisted data, with no network catalogue, and retain favourites and facts.
const offline=vm.createContext({crypto:webcrypto,Intl,DB:saved,FOODS:{},LIST:[]});for(const file of ['shared/meal-products-model.js','meal/report.js','meal/catalog.js'])vm.runInContext(await read(file),offline);offline.MealCatalog.append(saved,offline.FOODS,offline.LIST);assert.equal(offline.MealProducts.value(offline.FOODS[saury.id],'epa'),1500);assert.ok(offline.MealCatalog.search('さんま',offline.LIST).length);
const traceFood=c.LIST.find(f=>f.composition&&f.composition.fields.some(x=>x.sourceQualifier?.state==='trace'));
const trace=traceFood.composition.fields.find(x=>x.sourceQualifier?.state==='trace');assert.equal(trace.value,null);assert.equal(trace.status,'missing');assert.match(C.amount(null,trace.unit,trace),/Tr/);
assert.equal(C.amount(0,'г',{status:'value'}),'0 г');assert.equal(C.amount(null,'г',{status:'missing'}),'—');assert.equal(C.amount(null,'г',{status:'not_detected'}),'Не обнаружено');
const poke=c.FOODS['hmjp:tuna-poke'],recipe=poke.recipe;assert.equal(recipe.yieldGrams,407);assert.ok(poke.composition.fields.every(f=>f.origin==='calculated'));assert.equal(poke.catalogSource,'HM-JP');
const expected=recipe.ingredients.reduce((sum,i)=>sum+c.FOODS[i.id].k*i.grams,0)/407;assert.ok(Math.abs(poke.k-expected)<1e-9);assert.equal(P.value(poke,'vA'),null);assert.ok(poke.recipe.ingredients.every(i=>i.source.code));
const unknown=c.LIST.find(f=>f.catalogSource==='MEXT'&&P.value(f,'carb')==null);assert.ok(unknown);c.fmt=String;
assert.equal(C.totalText([{fid:unknown.id,g:100}],'carb',0),'—');assert.equal(C.coverage([{fid:unknown.id,g:100}],'carb').missing,1);assert.equal(C.totalText([{fid:unknown.id,g:100},{fid:saury.id,g:100}],'carb',0.1),'≥ 0.1');
const html=await read('meal/index.html');Object.assign(c,{norm:P.norm,sim:()=>0});vm.runInContext(html.slice(html.indexOf('function searchLib('),html.indexOf('var STARI=')),c);assert.ok(c.searchLib('さんま').some(f=>f.id==='mext:10173'));assert.ok(c.searchLib('tuna poke').some(f=>f.id==='hmjp:tuna-poke'));
console.log('Passed: 520 real MEXT records + 9 explicit recipes; RU/EN/JA search; stable source IDs and variants; units EPA/DHA and amino acids; separate RAE/tocopherols; trace/zero/missing; independent copies; 150 g diary macros/micros/export/exchange; immutable historical composition; offline reload and favourites; recipe yields and incomplete nutrients.');
