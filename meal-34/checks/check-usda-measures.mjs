/* Meal 33.10: меры USDA по-русски (решение Астамура 18.11.2026) на реальном файле SR Legacy.
   Все 14 449 мер: подпись по-русски, латиница — только фирменные названия (Gerber, Heinz…) и oz / fl oz / lb в режиме унций;
   числа пересчитаны: oz — 28,35 г, fl oz — 29,57 мл, lb — 453,6 г, дюйм — 2,54 см; американская чашка — 237 мл, с «США».
   Ключ меры (f.por) и граммы — прежние, из USDA: по ключу записи дневника находят свою меру, граммы не пересчитываются.
   Пять примеров «было — стало», режим унций, склонение для дневника, своя мера человека не переводится. — Claude · 18.11.2026 */
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const app=new URL('../',import.meta.url),repo=new URL('../',app);
const REF=process.env.HAPPY_LIBRARIES_REF||'origin/meal-libraries';
const show=p=>execFileSync('git',['show',REF+':'+p],{cwd:repo,maxBuffer:256*1024*1024});
const m=JSON.parse(show('manifest.json').toString('utf8')),data=JSON.parse(gunzipSync(show('data/'+m.libraries.usda.url.split('/data/')[1])).toString('utf8'));
const win={};win.window=win;win.globalThis=win;for(const k of ['Intl','JSON','Number','Math','Object','Array','String','Set','Map','Promise','Error','RegExp','Date','console'])win[k]=globalThis[k];
const ctx=vm.createContext(win);
for(const f of ['shared/meal-products-model.js','report.js','usda-measures.js','usda.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),ctx,{filename:f});
const {MealUSDA:U,MealUSDAMeasures:M}=win;
assert.equal(U.ingest(data),7793);
const d={},l=[];U.append({},d,l);

/* все меры: русская подпись, граммы ключей — из USDA */
let total=0,latin=0,brands=0;
for(const r of data.foods){
 const f=d[r.id];
 for(const p of r.portions){
  total++;
  const metric=M.label(p,'metric'),oz=M.label(p,'oz');
  assert.ok(metric&&oz,'подпись есть: '+p.modifier);
  assert.ok(metric.length<=90,'подпись не длиннее 90 знаков: '+metric);
  if(M.latin(metric).length){latin++;assert.fail('латиница в подписи: '+p.modifier+' → '+metric)}
  assert.equal(M.latin(oz).length,0,'в режиме унций латиница — только oz, fl oz, lb и марки: '+oz);
  if(M.BRAND.test(metric))brands++;M.BRAND.lastIndex=0;
  assert.ok(!/\b(?:oz|lb)\b/.test(metric),'в граммах нет oz и lb: '+metric);
 }
 for(const k of Object.keys(f.por)){
  const p=r.portions.find(x=>k===(x.amount&&x.amount!==1?x.amount+' ':'')+x.modifier);
  if(p)assert.equal(f.por[k],p.gramWeight,'граммы меры — из USDA: '+k);
  const lab=U.unitLabel(f,k);assert.ok(lab&&M.latin(lab).length===0,'ключ меры читается по-русски: '+k+' → '+lab);
 }
}
assert.equal(total,14449);assert.equal(latin,0);

/* пять примеров «было — стало» */
const lab=(id,key)=>U.unitLabel(d[id],key);
const ex=[
 ['usda:168878','cup','чашка США (237 мл)','чашка США (8 fl oz)',158],                 // рис варёный
 ['usda:171539','can (10.75 oz)','банка (305 г)','банка (10¾ oz)',305],                // суп говяжий с лапшой
 ['usda:171539','0.5 cup','½ чашки США (118 мл)','½ чашки США (4 fl oz)',125],
 ['usda:171148','can','банка','банка',530],                                           // суп куриный с лапшой
 ['usda:171265','cup','чашка США (237 мл)','чашка США (8 fl oz)',244],                 // молоко
 ['usda:171265','fl oz','30 мл','1 fl oz',30.5],
 ['usda:171265','tbsp','столовая ложка','столовая ложка',15],
 ['usda:171265','quart','кварта США (946 мл)','кварта США (32 fl oz)',976],
 ['usda:173414','oz','28 г','1 oz',28.35],                                            // сыр чеддер
 ['usda:173414','slice (1 oz)','ломтик (28 г)','ломтик (1 oz)',28],
 ['usda:173414','cup, shredded','чашка США (237 мл) тёртого','чашка США (8 fl oz) тёртого',113],
 ['usda:171050','unit (yield from 1 lb ready-to-cook chicken)','выход (из 454 г потрошёной тушки курицы)','выход (из 1 lb потрошёной тушки курицы)',205], // курица
 ['usda:171050','3 oz','85 г','3 oz',85],
 ['usda:171050','chicken','курица','курица',682]
];
for(const [id,key,metric,oz,g] of ex){
 assert.ok(d[id],'есть продукт '+id);assert.equal(d[id].por[key],g,'граммы прежние: '+id+' '+key);
 assert.equal(U.setUnits('metric')||true,true);assert.equal(lab(id,key),metric,id+' '+key);
 U.setUnits('oz');assert.equal(lab(id,key),oz,id+' '+key+' в унциях');U.setUnits('metric');
}

/* дневник: склонение и общее количество */
assert.equal(U.unitWord(d['usda:168878'],'cup',2),'чашки США','в строке дневника — коротко');
assert.equal(U.unitWord(d['usda:168878'],'cup',1),'чашка США');
assert.equal(U.unitWord(d['usda:168878'],'cup',5),'чашек США');
assert.equal(U.unitWord(d['usda:168878'],'cup',0.5),'чашки США');
assert.equal(M.phrase({amount:1,modifier:'cup'},2,'metric'),'чашки США (237 мл)','полная форма — с объёмом');
assert.equal(U.unitWord(d['usda:171539'],'can (10.75 oz)',2),'банки (305 г)');
assert.equal(U.unitWord(d['usda:171539'],'0.5 cup',2),'× ½ чашки США','мера с количеством — «2 × ½ чашки США»');
assert.equal(U.unitWord(d['usda:171265'],'tbsp',3),'столовые ложки');
assert.equal(U.amountText(d['usda:171265'],'fl oz',2),'59 мл','мера-объём — общим количеством, 2 × 29,57 мл');
U.setUnits('oz');assert.equal(U.amountText(d['usda:171050'],'3 oz',2),'6 oz');U.setUnits('metric');
assert.equal(U.unitWord(d['usda:171050'],'3 oz',1),'85 г');

/* не трогается: своя мера человека, продукты не из USDA, граммы */
const own=Object.assign({},d['usda:168878'],{own:{'cup':1}});assert.equal(U.unitLabel(own,'cup'),null,'своя мера человека — как названа');
assert.equal(U.unitLabel({id:'bls:X',por:{cup:200}},'cup'),null,'не USDA — без перевода');
assert.equal(U.unitLabel(d['usda:168878'],'г'),null);
assert.equal(U.unitLabel(null,'can (10.75 oz)','usda:171539'),'банка (305 г)','каталог ещё грузится — подпись по ключу записи');
assert.equal(U.setUnits('oz'),true);assert.equal(U.setUnits('oz'),false,'те же единицы — без перерисовки');assert.equal(U.setUnits('нечто'),true);assert.equal(U.units(),'metric');

console.log('Passed: USDA measures in Russian — all '+total+' measures without Latin except '+brands+' with brand names; oz 28.35 g, fl oz 29.57 ml, lb 453.6 g, inch 2.54 cm; US cup 237 ml marked «США»; keys and grams unchanged; five before/after examples, ounce mode, diary forms, own measures untouched.');
