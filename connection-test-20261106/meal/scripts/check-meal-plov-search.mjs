/* Regression diagnosis: native BLS plovs and HM recipes must coexist, not replace one another. */
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'),html=read('meal/index.html');
const c=vm.createContext({Intl,DB:{days:{},sections:[],foods:[],favs:[],bls:{},units:{}},FOODS:{},LIST:[],WORDS:[],BLS_TMP:{}});
for(const p of ['meal/sources.js','shared/meal-products-model.js','meal/report.js','meal/usda.js','meal/catalog.js','meal/uzbek.js'])vm.runInContext(read(p),c);
c.MealCatalog.ingest(JSON.parse(read('meal-data/mext2023.json')));c.MealUSDA.ingest(JSON.parse(read('meal-data/usda-sr-legacy.json')));
Object.assign(c,{norm:c.MealProducts.norm,cookingName:x=>x,porFix:()=>{},sim:()=>0});
vm.runInContext(html.slice(html.indexOf('var BASE=['),html.indexOf('function newFood(')),c);c.rebuildLib();
vm.runInContext(html.slice(html.indexOf('function searchLib('),html.indexOf('var STARI=')),c);
c.SEQ=0;vm.runInContext(html.slice(html.indexOf("var DEF={'г'"),html.indexOf('function parsePortion(')),c);
c.location={protocol:'https:'};c.blsRerender=()=>{};vm.runInContext(html.slice(html.indexOf('var BLS=null'),html.indexOf('function blsRerender(')),c);
const bls=JSON.parse(read('meal-data/bls40.json')),ids=['X890733','X890662','X890632','Y560723'];const original=Object.fromEntries(ids.map(id=>[id,JSON.stringify(bls.f.find(r=>r[0]===id))]));
c.blsReady(bls);
function hasNative(){const found=c.searchLib('плов').map(f=>f.id);for(const id of ids)assert.ok(found.includes('bls:'+id),id);}
hasNative(); // Native search works even before Uzbek recipes arrive.
c.MealUzbek.ingest(JSON.parse(read('meal-data/uzbek-recipes.json')));c.rebuildLib();hasNative();
assert.equal(c.searchLib('плов').length,6);assert.equal(c.searchLib('плов с курицей')[0].id,'bls:Y560723');assert.equal(c.searchLib('плов с зирой').filter(f=>f.catalogSource==='HM-UZ').length,2);
for(const id of ids){assert.equal(JSON.stringify(c.BLS_BY[id]),original[id]);assert.equal(c.MealSources.sourceOf(c.blsFoodObj(id)),'BLS');}
for(let n=0;n<3;n++){c.rebuildLib();hasNative();assert.equal(c.searchLib('плов').length,6);}
c.MealSources.setEnabled(c.DB,'HM',false);c.rebuildLib();hasNative();assert.equal(c.searchLib('плов').length,4);
c.MealSources.setEnabled(c.DB,'HM',true);c.MealSources.setEnabled(c.DB,'BLS',false);c.rebuildLib();assert.equal(c.searchLib('плов').length,2);
c.MealSources.setEnabled(c.DB,'BLS',true);c.rebuildLib();hasNative();
vm.runInContext(html.slice(html.indexOf('function recentIds('),html.indexOf('function phOf(')),c);
c.DB.pick='recent';assert.equal(c.pickList('плов').length,0);c.DB.pick='fav';assert.equal(c.pickList('плов').length,0);c.DB.pick='all';assert.equal(c.pickList('плов').length,6);
assert.equal(Object.keys(c.DB.days).length,0);assert.equal(c.DB.foods.length,0);
console.log('Passed full plov search: four unchanged native BLS IDs including chicken + two own-library recipes; before/after load and repeated rebuild; source switches independent; recent/favourites scope explains empty lists but does not delete foods. No diary changes.');
