import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8'),html=await read('meal/index.html');
const c=vm.createContext({Intl,console,DB:{days:{},foods:[],bls:{},units:{},recipes:[],favs:[]},FOODS:{},LIST:[],WORDS:[],BLS_TMP:{}});
for(const p of ['meal/portions.js','meal/sources.js','meal/backup-model.js','shared/meal-products-model.js','meal/report.js','meal/catalog.js'])vm.runInContext(await read(p),c);
const P=c.MealProducts,M=c.MealPortions,C=c.MealCatalog,clone=x=>JSON.parse(JSON.stringify(x));
Object.assign(c,{norm:P.norm,cookingName:x=>x,sim:()=>0});
vm.runInContext(html.slice(html.indexOf("var DEF={'г'"),html.indexOf('function parsePortion(')),c);
vm.runInContext(html.slice(html.indexOf('var BASE=['),html.indexOf('function newFood(')),c);
vm.runInContext(html.slice(html.indexOf('var SPOON_OK='),html.indexOf('function edHTML(')),c);
const data=JSON.parse(await read('meal-data/mext2023.json')),bls=JSON.parse(await read('meal-data/bls40.json'));
C.ingest(data);C.addRecipes();c.rebuildLib();
assert.equal(c.FOODS['mext:07054'].por['маленький'],55);
assert.equal(c.FOODS['mext:07054'].por['шт'],69);
assert.equal(c.FOODS['mext:07054'].por['большой'],90);
assert.equal(c.FOODS['mext:07168'].por['шт'],81);
assert.equal(c.gramsFor('mext:07054',2,'большой'),180);
assert.equal(c.unitName(c.FOODS['mext:07054'],'шт'),'средний');
assert.deepEqual(clone(c.unitList(c.FOODS['mext:07054']).slice(0,4)),['г','маленький','шт','большой']);
c.DB.catalogLang='en';c.rebuildLib();assert.match(c.FOODS['mext:07054'].n,/kiwi/i);assert.equal(c.FOODS['mext:07054'].por['шт'],69);
c.DB.units['mext:07054']={'шт':83,'мой плод':97};c.rebuildLib();
assert.equal(c.FOODS['mext:07054'].por['шт'],83);assert.equal(M.approximate(c.FOODS['mext:07054'],'шт'),false);
delete c.DB.units['mext:07054'];c.rebuildLib();assert.equal(c.FOODS['mext:07054'].por['шт'],69);
assert.equal(c.unitWeightLabel(c.FOODS['mext:05032'],'шт'),'≈ 0,17');
assert.equal(c.FOODS['mext:05032'].por['шт'],0.17);assert.equal(c.gramsFor('mext:05032',10,'шт'),1.7);
for(const [id,values] of [['mext:12004',[38,44,50]],['mext:12005',[38,44,50]],['mext:12021',[35,40,46]]]){
 assert.deepEqual(['маленький','шт','большой'].map(k=>c.FOODS[id].por[k]),values,id);
}
assert.equal(c.unitName(c.FOODS['mext:12021'],'шт'),'среднее яйцо');
assert.equal(c.FOODS['mext:07012'].por['очень крупная ягода'],27);
assert.equal(c.FOODS['mext:07124'].por['ст. л.'],9.2);
assert.equal(c.FOODS['mext:07124'].defU,'г');
const old={id:'qa-old',fid:'mext:07054',q:1,u:'шт',g:72,sec:'am'};
c.DB.days={'2026-10-30':{items:[old]}};c.DB.recipes=[{id:'qa-recipe',items:[{fid:'mext:07054',g:72}]}];
P.snapshotItems(c.DB,c.FOODS);const before=JSON.stringify([c.DB.days,c.DB.recipes,c.DB.productSnapshots]);
const own=P.fromFood(c.FOODS['mext:07054'],c.MealReport.fields(),()=>null,{copy:true});own.por['шт']=111;c.DB.foods.push(own);
c.rebuildLib();assert.equal(c.FOODS[own.id].por['шт'],111);assert.equal(JSON.stringify([c.DB.days,c.DB.recipes,c.DB.productSnapshots]),before);
const hyd=c.MealBackup.hydrate({},clone(c.DB));assert.equal(hyd.days['2026-10-30'].items[0].g,72);
const exported=c.MealReport.records(hyd,c.FOODS,{a:'2026-10-30',b:'2026-10-30'},()=>null)[0];
assert.ok(Math.abs(exported.values.k-P.value(P.forItem(old,c.FOODS,c.DB),'k')*.72)<1e-6);
// Cached-only catalog entries must be independent objects, including during localization/portion refresh.
const offline=vm.createContext({Intl,console,DB:clone(c.DB),FOODS:{}});
for(const p of ['shared/meal-products-model.js','meal/report.js','meal/catalog.js'])vm.runInContext(await read(p),offline);
const prior=JSON.stringify(offline.DB);offline.MealCatalog.append(offline.DB,offline.FOODS,[]);
offline.FOODS['mext:07054'].por['шт']=999;assert.equal(JSON.stringify(offline.DB),prior);
// Every actual catalog food is audited: explicit types cannot receive whole-fruit measures.
const audit=[],counts=new Map();
for(const r of bls.f){
 const f={id:'bls:'+r[0],b:r[0],n:r[1],src:'BLS',por:{}};c.porFix(f);
 if(f.portionProfile){audit.push({id:f.id,name:f.n,profile:f.portionProfile.id,measures:f.portionProfile.measures});counts.set(f.portionProfile.id,(counts.get(f.portionProfile.id)||0)+1)}
}
for(const f of Object.values(c.FOODS))if(f.catalogSource==='MEXT'&&f.portionProfile){audit.push({id:f.id,name:f.names.ru,profile:f.portionProfile.id,measures:f.portionProfile.measures});counts.set(f.portionProfile.id,(counts.get(f.portionProfile.id)||0)+1)}
for(const name of ['Сок киви','Киви сушёный','Клубничное варенье','Клубника в сиропе','Яйцо куриное, сухой порошок','Яйцо куриное, белок','Яичница-глазунья с беконом','Миндальная паста','Орех свиной (часть бедра), сырой','Грецкий орех молотый'])assert.equal(M.match({n:name,src:'BLS'}),null,name);
for(const id of ['R552000','N310400','G230100','D4A8400','Y872460','K110143','F545100','X651012','X610253','F411100','F413100']){
 const row=bls.f.find(r=>r[0]===id);assert.ok(row,id);assert.equal(M.match({n:row[1],b:id,src:'BLS'}),null,row[1]);
}
for(const id of ['07155','07088','07117','07082','02018','02064'])assert.equal(M.match(c.FOODS['mext:'+id]),null,id);
const cherry={n:'Томаты черри',src:'BLS',por:{шт:15}};c.porFix(cherry);assert.equal(cherry.por['шт'],17);assert.equal(cherry.por['маленький'],undefined);
for(const r of M.records){for(const weight of Object.values(r.measures))assert.ok(weight>0&&Number.isFinite(weight));assert.ok(r.fdc.length>0,r.id)}
if(process.argv.includes('--audit')){await writeFile(new URL('../../portion_research/matches.json',import.meta.url),JSON.stringify(audit,null,2));console.log(JSON.stringify(Object.fromEntries(counts),null,2))}
console.log('Passed: sourced edible measures, MEXT RU/EN, kiwi and fried-egg sizes, berry/spoon and kernel conversion, exclusions, personal overrides, copy/history/offline/backup/export preservation.');
