/* FAO/USDA carbohydrate-by-difference is a recipe-local estimate, never a global remap. */
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const usda=JSON.parse(await read('meal-data/usda-sr-legacy.json')),bls=JSON.parse(await read('meal-data/bls40.json'));
const c=vm.createContext({});vm.runInContext(await read('meal/uzbek-recipe-model.js'),c);const M=c.MealUzbekRecipeModel;
const field=(o,k)=>o.fields.find(f=>f.key===k),clone=x=>structuredClone(x);
const derivation={method:'available-carbohydrate-by-difference',formula:'USDA1005 - USDA1079',sourceIds:['1005','1079'],estimated:true};
const fixture={basisGrams:100,nutrientDefinitions:{1005:{unit:'g'},1079:{unit:'g'},1018:{unit:'g'}},foods:[{id:'usda:TEST',nut:{kcal:123,prot:3,fat:4},sourceNutrients:{1005:40,1079:10,1018:0}}]};
const recipe={id:'test-only',status:'ready',ingredientBasis:'raw-edible',yieldGrams:200,ingredients:[{sourceId:'usda:TEST',grams:100,basis:'raw-edible',derivedNutrients:{carb:derivation}}]};
const run=(u=fixture,r=recipe)=>M.evaluate(r,bls,{usda:u,method:'raw-total-over-finished-yield'});
const before=JSON.stringify(fixture),out=run();assert.equal(field(out,'carb').valuePer100g,15);assert.equal(field(out,'carb').status,'estimated');assert.equal(field(out,'kcal').valuePer100g,61.5);
assert.equal(JSON.stringify(run()),JSON.stringify(out));assert.equal(JSON.stringify(fixture),before);assert.equal(fixture.foods[0].nut.carb,undefined);
for(const alcohol of [7,0,null,undefined]){const u=clone(fixture);if(alcohol===undefined)delete u.foods[0].sourceNutrients['1018'];else u.foods[0].sourceNutrients['1018']=alcohol;assert.equal(field(run(u),'carb').valuePer100g,15,'USDA1005 already excludes alcohol; do not require/subtract1018');}
for(const id of ['1005','1079']){
 for(const value of [undefined,null,NaN,Infinity,-Infinity,-1,'40']){const u=clone(fixture);if(value===undefined)delete u.foods[0].sourceNutrients[id];else u.foods[0].sourceNutrients[id]=value;assert.equal(field(run(u),'carb').valuePer100g,null,`${id} ${String(value)} stays unknown`);}
 for(const unit of ['mg','µg','oz',undefined]){const u=clone(fixture);u.nutrientDefinitions[id].unit=unit;assert.equal(field(run(u),'carb').valuePer100g,null,`${id} requires grams`);}
 const u=clone(fixture);delete u.nutrientDefinitions[id];assert.equal(field(run(u),'carb').valuePer100g,null,'missing definition stays unknown');
}
{const u=clone(fixture);delete u.nutrientDefinitions;assert.equal(field(run(u),'carb').valuePer100g,null,'no unit definitions means no validated derivation');}
for(const [total,fiber,expected]of[[10,20,null],[10,10,0],[0,0,0]]){const u=clone(fixture);Object.assign(u.foods[0].sourceNutrients,{1005:total,1079:fiber});assert.equal(field(run(u),'carb').valuePer100g,expected,'negative is unknown, actual zero is zero');}
{const r=clone(recipe);delete r.ingredients[0].derivedNutrients;assert.equal(field(run(fixture,r),'carb').valuePer100g,null,'not an automatic global inference');}
{const u=clone(fixture);u.foods[0].nut.carb=7;assert.ok(Math.abs(field(run(u),'carb').valuePer100g-3.5)<1e-12,'existing canonical value is not overwritten');}
const sourceBefore=JSON.stringify(usda);
for(const [id,total,fiber]of[['usda:170923',44.2,10.5],['usda:170918',49.9,38],['usda:170932',56.6,27.2],['usda:172233',7.02,2.1]]){
 const f=usda.foods.find(r=>r.id===id);assert.equal(f.sourceNutrients['1005'],total);assert.equal(f.sourceNutrients['1079'],fiber);assert.equal(f.nut.carb,undefined);
 const r={...recipe,yieldGrams:350,ingredients:[{...recipe.ingredients[0],sourceId:id,grams:1.5}]};
 const o=run(usda,r);assert.ok(Math.abs(field(o,'carb').valuePer100g-(total-fiber)*1.5/350)<1e-12);
 assert.ok(Math.abs(field(o,'kcal').valuePer100g-f.nut.kcal*1.5/350)<1e-12,'energy remains independently supplied by source, not4/4/9');
 for(const grams of [100,350,500,60,300])assert.ok(Math.abs(M.portion(o,grams).find(x=>x.key==='carb').value-(total-fiber)*1.5/350*grams/100)<1e-12);
 assert.equal(field(o,'sta').valuePer100g,null,'residual is not starch');assert.equal(JSON.stringify(run(usda,r)),JSON.stringify(o));
}
assert.equal(JSON.stringify(usda),sourceBefore,'all source maps and original nutrients unchanged');
console.log('Passed recipe-local carbohydrate:1005−1079 only; no duplicate alcohol subtraction; complete finite nonnegative gram inputs; missing/bad units/negative residual stay unknown; true zero; opt-in and canonical precedence; real cumin/caraway/cayenne/dill; portion scaling; unchanged source energy/catalogs; idempotence.');
