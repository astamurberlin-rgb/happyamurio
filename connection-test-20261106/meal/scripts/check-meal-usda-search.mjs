import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('meal/index.html');const c=vm.createContext({Intl,console,DB:{days:{},sections:[],foods:[],favs:[],bls:{},units:{}},FOODS:{},LIST:[],WORDS:[],BLS_TMP:{}});
for(const f of ['meal/sources.js','shared/meal-products-model.js','meal/report.js','meal/usda.js','meal/catalog.js'])vm.runInContext(read(f),c);
c.MealCatalog.ingest(JSON.parse(read('meal-data/mext2023.json')));c.MealUSDA.ingest(JSON.parse(read('meal-data/usda-sr-legacy.json')));
Object.assign(c,{norm:c.MealProducts.norm,cookingName:x=>x,porFix:()=>{},sim:()=>0});
vm.runInContext(html.slice(html.indexOf('var BASE=['),html.indexOf('function newFood(')),c);
let start=performance.now();c.rebuildLib();console.log('Full library rebuild ms',Math.round(performance.now()-start));
vm.runInContext(html.slice(html.indexOf('function searchLib('),html.indexOf('var STARI=')),c);
c.SEQ=0;vm.runInContext(html.slice(html.indexOf("var DEF={'г'"),html.indexOf('function parsePortion(')),c);
c.location={protocol:'https:'};c.blsRerender=()=>{};vm.runInContext(html.slice(html.indexOf('var BLS=null'),html.indexOf('function blsRerender(')),c);c.blsReady(JSON.parse(read('meal-data/bls40.json')));
for(const q of ['паприка','паприка молотая','перец кайенский','перец черный','chili powder','Spices, pepper, red or cayenne']){start=performance.now();let found=c.searchLib(q);console.log(q,Math.round(performance.now()-start)+'ms',found.slice(0,4).map(f=>f.id+':'+f.n));assert(found.some(f=>f.catalogSource==='USDA'),q)}
assert.equal(c.searchLib('паприка')[0].id,'usda:171329');
let pap=c.searchLib('паприка молотая');assert.equal(pap[0].catalogSource,'USDA');assert(!/raw|сыр/i.test(pap[0].n));
let words=c.WORDS.length;c.rebuildLib();assert.equal(c.WORDS.length,words);assert.equal(new Set(c.LIST.map(f=>f.id)).size,c.LIST.length);
assert(c.FOODS.dil);assert(!c.LIST.some(f=>f.id==='dil'));assert(c.LIST.some(f=>f.id==='usda:172233'));
c.MealSources.setEnabled(c.DB,'USDA',false);c.rebuildLib();assert(!c.searchLib('paprika').some(f=>f.catalogSource==='USDA'));assert(c.FOODS['usda:171329']);
c.MealSources.setEnabled(c.DB,'USDA',true);c.rebuildLib();assert(c.searchLib('paprika').some(f=>f.catalogSource==='USDA'));
console.log('Passed full USDA+BLS+MEXT searches, source priority among matching states, repeated rebuilds, toggle and legacy-ID preservation.');
