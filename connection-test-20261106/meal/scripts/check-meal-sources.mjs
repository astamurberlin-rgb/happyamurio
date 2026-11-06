/* Source choices affect new selection, never the recorded food composition. */
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const html=await read('meal/index.html');
const c=vm.createContext({Intl,console,DB:{days:{},sections:[],foods:[],favs:[],bls:{},units:{}},FOODS:{},LIST:[],WORDS:[],BLS_TMP:{}});
for(const file of ['meal/sources.js','meal/backup-model.js','shared/meal-products-model.js','meal/report.js','meal/catalog.js'])vm.runInContext(await read(file),c);
const S=c.MealSources,C=c.MealCatalog,P=c.MealProducts;
assert.equal(S.enabled(c.DB,'BLS'),true);
assert.equal(S.sourceOf({id:'egg',src:'BLS',own:{}}),'BLS');
assert.equal(S.sourceOf({id:'bls:ZA01A',src:'BLS',b:'ZA01A'}),'HM');
C.ingest(JSON.parse(await read('meal-data/mext2023.json')));C.addRecipes();
Object.assign(c,{norm:P.norm,cookingName:x=>x,porFix:()=>{},sim:()=>0});
vm.runInContext(html.slice(html.indexOf('var BASE=['),html.indexOf('function newFood(')),c);
c.rebuildLib();
const saury=c.FOODS['mext:10173'];
const copy=P.fromFood(saury,c.MealReport.fields(),()=>null,{copy:true});copy.n='Моя сайра';copy.w=['моя','сайра'];c.DB.foods.push(copy);
c.DB.days={'2026-10-31':{items:[{id:'qa-entry',fid:saury.id,sec:'dn',g:150}]}};
c.DB.favs=[saury.id];c.DB.recipes=[{id:'qa-recipe',items:[{fid:saury.id,g:150}]}];
c.rebuildLib();C.cacheUsed(c.DB,c.FOODS);P.snapshotItems(c.DB,c.FOODS);
const history=JSON.stringify([c.DB.days,c.DB.recipes,c.DB.productSnapshots]);
vm.runInContext(html.slice(html.indexOf('function searchLib('),html.indexOf('var STARI=')),c);
assert.ok(c.searchLib('さんま').some(f=>f.id===saury.id));
assert.ok(S.setEnabled(c.DB,'MEXT',false));c.rebuildLib();
assert.equal(c.searchLib('さんま').length,0);
assert.ok(c.searchLib('сайра').some(f=>f.id===copy.id));
assert.equal(c.FOODS[saury.id].id,saury.id);
assert.equal(P.value(P.forItem(c.DB.days['2026-10-31'].items[0],c.FOODS,c.DB),'epa'),1500);
assert.equal(JSON.stringify([c.DB.days,c.DB.recipes,c.DB.productSnapshots]),history);
const hydrated=c.MealBackup.hydrate({},JSON.parse(JSON.stringify(c.DB)));
assert.equal(S.enabled(hydrated,'MEXT'),false);
assert.equal(c.MealReport.records(hydrated,c.FOODS,{a:'2026-10-31',b:'2026-10-31'},()=>null)[0].values.epa,2250);
for(const source of ['HM','USDA','OWN'])assert.ok(S.setEnabled(c.DB,source,false));
assert.equal(S.setEnabled(c.DB,'BLS',false),false);
assert.ok(S.enabled(c.DB,'BLS'));
assert.ok(S.setEnabled(c.DB,'MEXT',true));assert.ok(S.setEnabled(c.DB,'BLS',false));c.rebuildLib();
assert.ok(c.LIST.length>0&&c.LIST.every(f=>S.sourceOf(f)==='MEXT'));
assert.equal(S.codeEnabled(c.DB,'X651013'),false);
assert.equal(S.codeEnabled(c.DB,'ZA01A'),false);
assert.ok(S.setEnabled(c.DB,'HM',true));assert.equal(S.codeEnabled(c.DB,'ZA01A'),true);
for(let i=0;i<3;i++){S.setEnabled(c.DB,'MEXT',false);c.rebuildLib();S.setEnabled(c.DB,'MEXT',true);c.rebuildLib()}
assert.equal(new Set(c.LIST.map(f=>f.id)).size,c.LIST.length);
assert.ok(S.preferences({foodSources:Object.fromEntries(S.catalog.map(s=>[s.id,false]))}).BLS);
// Use real BLS search and parser code: disabled cached/default entries cannot leak back.
const data=JSON.parse(await read('meal-data/bls40.json'));
c.SEQ=0;c.curDate='2026-10-31';
vm.runInContext(html.slice(html.indexOf('function sectionsForDate('),html.indexOf('function sec(k)')),c);
vm.runInContext(html.slice(html.indexOf("var DEF={'г'"),html.indexOf('function parsePortion(')),c);
c.location={protocol:'https:'};c.blsRerender=()=>{};
vm.runInContext(html.slice(html.indexOf('var BLS=null'),html.indexOf('function blsRerender(')),c);
c.blsReady(data);
assert.equal(c.blsSearch('картофель',25,{partial:true}).length,0);
S.setEnabled(c.DB,'BLS',true);assert.ok(c.blsSearch('картофель',25,{partial:true}).length>0);
c.rebuildLib();assert.equal(c.parseText('кола зеро 100 г').lines[0].fid,'bls:N331000');
S.setEnabled(c.DB,'BLS',false);c.rebuildLib();
for(const line of c.parseText('кола зеро 100 г').lines){
 for(const fid of [line.fid,...line.alts].filter(Boolean))assert.notEqual(S.sourceOf(c.FOODS[fid]),'BLS');
}
// Every widget row retains a track for unknown, zero and nonzero progress.
Object.assign(c,{escH:String,erTone:()=> '#aaaaaa',erClamp:(v,a,b)=>Math.max(a,Math.min(b,v)),erN:x=>x});
vm.runInContext(html.slice(html.indexOf('function erRowHTML('),html.indexOf('function erFit(')),c);
for(const value of [null,0,0.5,1.5]){
 const row=c.erRowHTML(180,'Клетчатка','—',value);assert.ok(row.includes('class="erBar"'));assert.ok(!row.includes('erBar no'));
 if(value==null)assert.ok(row.includes('width:0%'));
}
console.log('Passed: source defaults, last-source guard, persisted preferences, all-disabled recovery; MEXT/own-copy search, BLS search exclusion; recipe/history/snapshot/export preservation; repeated toggles without duplicates; empty widget tracks.');
// Settings keep browsing independent from activation and gate Japanese on MEXT.
const holder={innerHTML:'',querySelector:()=>({scrollLeft:0})};c.document={getElementById:()=>holder};
c.DB.catalogLang='ja';S.setEnabled(c.DB,'BLS',true);S.setEnabled(c.DB,'MEXT',false);
C.renderSettings();assert.match(holder.innerHTML,/data-source-card="MEXT"/);assert.equal((holder.innerHTML.match(/data-food-source=/g)||[]).length,1);assert.ok(!holder.innerHTML.includes('<details>'));
assert.match(holder.innerHTML,/data-catalog-lang="ja"[^>]*disabled/);
assert.equal(C.name({names:{ru:'Русское',ja:'日本語'}}),'Русское');
S.setEnabled(c.DB,'MEXT',true);C.renderSettings();assert.ok(!/data-catalog-lang="ja"[^>]*disabled/.test(holder.innerHTML));assert.equal(C.name({names:{ru:'Русское',ja:'日本語'}}),'日本語');
console.log('Passed: one open source card, independent carousel, Japanese disabled/restored without losing preference.');
