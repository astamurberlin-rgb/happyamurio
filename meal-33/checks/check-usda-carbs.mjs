/* Meal 33.5: углеводы USDA для дневника (решение Астамура 17.11.2026) на реальном файле SR Legacy.
   Готовое значение без клетчатки — если есть; иначе углеводы по разности (1005) минус клетчатка (1079), если известны оба
   (≈, не меньше нуля); иначе прочерк. Ревизия продуктов — 20261117 (старые записи хранят снимки @20180401). */
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
for(const f of ['shared/meal-products-model.js','report.js','usda.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),ctx,{filename:f});
const {MealProducts:P,MealUSDA:U}=win;
assert.equal(U.ingest(data),7793);
const d={},l=[];U.append({},d,l);
const carb=id=>P.value(d[id],'carb'),field=id=>d[id].composition.fields.find(x=>x.key==='carb');
assert.equal(carb('usda:168878'),27.8,'рис варёный: 28,2 − 0,4');assert.equal(d['usda:168878'].c,27.8);assert.equal(field('usda:168878').sourceQualifier.estimated,true);assert.match(field('usda:168878').notes,/минус клетчатка/);
assert.equal(carb('usda:170645'),64.1,'абрикосовый джем: 64,4 − 0,3');assert.equal(d['usda:170645'].revision,20261117);
const noFib=data.foods.find(r=>r.sourceNutrients['1005']!=null&&r.sourceNutrients['1079']==null);assert.equal(carb(noFib.id),null,'клетчатки нет — прочерк');assert.match(field(noFib.id).notes,/не указана/);
let counted=0,clamped=0;for(const r of data.foods){const s=r.sourceNutrients,v=carb(r.id);if(s['1005']!=null&&s['1079']!=null){counted++;assert.equal(v,Math.round(Math.max(0,s['1005']-s['1079'])*1e6)/1e6);if(s['1079']>s['1005'])clamped++}else assert.equal(v,null)}
assert.equal(counted,7231);
const custom=d['usda:168878'].composition.fields.find(x=>x.key==='prop:usda:1005');assert.equal(custom.value,28.2,'углеводы с клетчаткой — своей строкой, как были');
P.validate(d['usda:168878']);
console.log('Passed: USDA carbs for the diary — total minus fibre for '+counted+' of 7793 records ('+clamped+' clamped to 0), dash where fibre is unknown, revision 20261117.');
