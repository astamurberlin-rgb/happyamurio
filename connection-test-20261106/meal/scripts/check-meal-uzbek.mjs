import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const raw=await read('meal-data/bls40.json'),bls=JSON.parse(raw),data=JSON.parse(await read('meal-data/uzbek-draft.json')),usda=JSON.parse(await read('meal-data/usda-sr-legacy.json'));
const c=vm.createContext({});vm.runInContext(await read('meal/uzbek-recipe-model.js'),c);const M=c.MealUzbekRecipeModel;
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-10,`${label}: ${a} != ${b}`);
const field=(out,key)=>out.fields.find(f=>f.key===key);
const by=Object.fromEntries(bls.f.map(r=>[r[0],r])),ub=Object.fromEntries(usda.foods.map(r=>[r.id,r]));
assert.equal(createHash('sha256').update(raw).digest('hex'),data.basis.sha256);assert.equal(usda.basisGrams,100);
assert.equal(data.releaseGate.canPublish,false);
const pendingSamsa=data.backlog.find(r=>r.id==='hmuz:samsa');
if(pendingSamsa)assert.ok(pendingSamsa.portions.every(p=>p.grams===null&&p.editable===true));
assert.equal(data.sources.find(s=>s.id==='skurikhin-2002-losses').applied,false);
const expectedIds=['hmuz:plov-mutton','hmuz:plov-beef','hmuz:shurpa-mutton','hmuz:shurpa-beef','hmuz:manty-mutton','hmuz:samsa-mutton-oven'];
assert.deepEqual(data.recipes.map(r=>r.id).sort(),expectedIds.sort());
const options={usda,method:'raw-total-over-finished-yield'};
const beforeCatalog=JSON.stringify(usda),beforeBls=JSON.stringify(bls);
function independentlyRead(i,key){
 if(i.blsCode)return by[i.blsCode][4+bls.keys.indexOf(key)];
 const r=ub[i.sourceId];
 if(key==='carb'&&i.derivedNutrients?.carb&&r.nut.carb==null)return r.sourceNutrients['1005']-r.sourceNutrients['1079'];
 return r.nut[key];
}
for(const r of data.recipes){
 const before=JSON.stringify(r),out=M.evaluate(r,bls,options);assert.equal(JSON.stringify(r),before);assert.equal(out.canPublish,false);assert.equal(out.fields.length,76);
 assert.ok(data.sources.some(s=>s.id===r.yieldSourceId));assert.ok(data.sources.some(s=>s.id===r.sourceId));
 for(const i of r.ingredients){
  assert.ok(i.grams>0);assert.equal(i.basis,'raw-edible');
  if(i.blsCode){assert.equal(i.sourceId,'bls:'+i.blsCode);assert.ok(by[i.blsCode]);}
  else{assert.ok(ub[i.sourceId]);assert.equal(ub[i.sourceId].id,'usda:'+ub[i.sourceId].code);assert.equal(i.inputBasisGrams,100);}
  if(i.derivedNutrients?.carb){assert.equal(i.derivedNutrients.carb.estimated,true);assert.deepEqual(i.derivedNutrients.carb.sourceIds,['1005','1079']);for(const sourceId of i.derivedNutrients.carb.methodSources||[])assert.ok(data.sources.some(s=>s.id===sourceId),'derivation source exists: '+sourceId);}
 }
 for(const key of ['kcal','prot','fat','carb']){
  const vals=r.ingredients.map(i=>independentlyRead(i,key));assert.ok(vals.every(v=>typeof v==='number'&&Number.isFinite(v)),r.id+' '+key+' inputs');
  const expected=r.ingredients.reduce((sum,i,j)=>sum+vals[j]*i.grams/100,0)/r.yieldGrams*100;
  near(field(out,key).valuePer100g,expected,r.id+' '+key);assert.equal(field(out,key).status,'estimated');
  for(const grams of [100,350,500,60,300,120])near(M.portion(out,grams).find(f=>f.key===key).value,expected*grams/100,`${r.id} ${key} ${grams}g`);
 }
 assert.equal(field(out,'water').valuePer100g,null,'raw water must not become final moisture');
 for(const p of r.portions)if(p.grams===null)assert.throws(()=>M.portion(out,p.grams));else assert.ok(p.grams>0);
 for(const grams of [null,0,-1,NaN,Infinity,'100'])assert.throws(()=>M.portion(out,grams));
 assert.throws(()=>M.evaluate({...r,ingredientBasis:'cooked'},bls,options));assert.throws(()=>M.evaluate({...r,yieldGrams:0},bls,options));
 assert.throws(()=>M.evaluate({...r,ingredients:[{...r.ingredients[0],basis:'cooked'}]},bls,options));
 assert.throws(()=>M.evaluate({...r,ingredients:[{...r.ingredients[0],sourceId:'bls:WRONG'}]},bls,options));
 assert.throws(()=>M.evaluate({...r,ingredients:[{sourceId:'usda:NOT-REAL',grams:1,basis:'raw-edible'}]},bls,options));
 assert.ok(M.evaluate(r,bls,{usda}).fields.every(f=>f.valuePer100g===null),'no unverified retention treated as known');
 assert.equal(JSON.stringify(M.evaluate(r,bls,options)),JSON.stringify(out),'repeat evaluation is idempotent');
 if(r.id.includes('plov')){
  assert.equal(out.yieldGrams,350);assert.equal(out.rawInputGrams,418.5);
  assert.equal(r.ingredients.find(i=>i.blsCode==='C352000').grams,100,'dry rice input only');
  assert.equal(r.ingredients.find(i=>i.sourceId==='usda:170923').grams,1.5);
  const unmapped={...r,ingredients:r.ingredients.map(i=>i.sourceId==='usda:170923'?{...i,sourceId:null}:i)};
  assert.ok(M.evaluate(unmapped,bls,options).fields.every(f=>f.valuePer100g===null));
 }
 if(r.id.includes('shurpa')){
  near(out.rawInputGrams,719.05,'adapted shurpa raw input');assert.equal(out.yieldGrams,500);
  assert.equal(r.ingredients.find(i=>i.sourceId==='usda:172233').grams,4);
  assert.equal(r.ingredients.find(i=>i.blsCode==='R111000').grams,3);assert.equal(r.ingredients.find(i=>i.blsCode==='R258100').grams,.05);
  assert.match(r.adaptation,/адаптация/i);assert.match(r.ingredients.find(i=>i.blsCode==='R111000').mappingNote,/не цифра исходной/);
  const unknownSalt={...r,unquantifiedAdditions:[{name:'Salt without a measured amount'}]};
  assert.ok(M.evaluate(unknownSalt,bls,options).fields.every(f=>f.valuePer100g===null),'unquantified additions cannot silently become zero');
 }
 if(r.id.includes('manty')){
  assert.equal(out.rawInputGrams,341.5);assert.equal(out.yieldGrams,300);assert.equal(r.portions.find(p=>p.id==='piece').grams*5,300);
  assert.equal(r.ingredients.find(i=>i.blsCode==='C214100').grams,75,'dusting flour already included');assert.equal(r.excludedSide.grams,15);
  assert.equal(r.ingredients.find(i=>i.blsCode==='N110000').grams,50);assert.match(r.adaptation,/максимального переноса/);
 }
 if(r.id.includes('samsa')){
  assert.equal(out.rawInputGrams,1495);assert.equal(out.yieldGrams,1200);
  assert.equal(r.yieldEvidenceType,'own-target');assert.equal(r.yieldEvidence.status,'own-recipe-target-not-measured');
  assert.equal(r.yieldEvidence.pieces,10);assert.equal(r.yieldEvidence.targetGramsPerPiece,120);
  assert.equal(out.yieldRatioBasis,'own-target');near(out.yieldRatio,1200/1495,'samsa target ratio, not observed loss');assert.equal(out.observedYieldRatio,undefined);
  const masses={'bls:C214100':430,'bls:N110000':200,'bls:R111000':24,'bls:U805800':40,'bls:U866100':370,'bls:G480100':420,'bls:R258100':.6,'usda:170923':.4,'bls:Q320000':10};
  assert.equal(r.ingredients.length,Object.keys(masses).length);for(const i of r.ingredients)assert.equal(i.grams,masses[i.sourceId],i.sourceId+' once-scaled source-net input');
  const fat=r.ingredients.find(i=>i.sourceId==='bls:U805800'),oil=r.ingredients.find(i=>i.sourceId==='bls:Q320000');
  assert.match(fat.mappingNote,/замена|замен/i);assert.match(fat.mappingNote,/не курдюк/i);assert.match(oil.mappingNote,/ПОСЛЕ выпечки/i);
  assert.match(r.processNote,/149[.,]5/);assert.match(r.processNote,/65.*77.*142/);assert.match(r.processNote,/расхождение/);
  assert.match(r.portionNote,/не измеренный/);assert.match(r.portionNote,/Форма сама по себе массу не задаёт/);
  const src=data.sources.find(x=>x.id===r.sourceId);assert.equal(src.sourceNutritionUsed,false);assert.equal(src.sourceType,'commercial-technical-card-copy');
  assert.equal(src.url,'https://tekhnolog.com/2019/03/31/samsa-duhovaya-s-myasom-ttk5352/');
  assert.deepEqual(r.portions.map(p=>p.id).sort(),['square-envelope','triangle']);
  for(const p of r.portions){assert.equal(p.grams,120);assert.equal(p.editable,true);assert.match(p.status,/target-not-measured/);if(p.sourceId)assert.ok(data.sources.some(s=>s.id===p.sourceId));}
  assert.deepEqual(JSON.parse(JSON.stringify(M.portion(out,r.portions[0].grams))),JSON.parse(JSON.stringify(M.portion(out,r.portions[1].grams))),'shape alone must not change composition');
  // Oil is an after-baking addition: all10g are included once in target1200g, never yield-scaled separately.
  const withoutOil={...r,ingredients:r.ingredients.filter(i=>i.sourceId!=='bls:Q320000')};
  const noOil=M.evaluate(withoutOil,bls,options);near(field(out,'kcal').valuePer100g-field(noOil,'kcal').valuePer100g,by.Q320000[4]*10/1200,'finishing oil once');
 }
}
assert.equal(JSON.stringify(usda),beforeCatalog,'global USDA must not gain derived carbohydrate');assert.equal(JSON.stringify(bls),beforeBls);
// The packaged public catalog must correspond to this exact draft calculation, not stale output.
const generated=JSON.parse(await read('meal-data/uzbek-recipes.json'));
assert.equal(generated.basisGrams,100);assert.deepEqual(generated.foods.map(f=>f.id).sort(),expectedIds.sort());
for(const f of generated.foods){
 const r=data.recipes.find(r=>r.id===f.id),out=M.evaluate(r,bls,options);
 assert.equal(f.composition.basisGrams,100);assert.equal(f.recipe.yieldGrams,r.yieldGrams);
 if(f.id.includes('samsa')){assert.equal(generated.foods.filter(x=>x.id.includes('samsa')).length,1);assert.equal(Object.keys(f.por).length,2);assert.ok(Object.values(f.por).every(g=>g===120));assert.equal(f.recipe.yieldEvidenceType,'own-target');assert.match(f.recipe.portionNote,/не измеренный/);}
 assert.deepEqual(f.recipe.ingredients.map(i=>i.sourceId),r.ingredients.map(i=>i.sourceId));
 assert.deepEqual(f.sourceInfo.catalogs,[...new Set(r.ingredients.map(i=>i.sourceId.split(':')[0].toUpperCase()))]);
 for(const v of out.fields){const saved=f.composition.fields.find(x=>x.key===v.key);assert.ok(saved);if(v.valuePer100g===null){assert.equal(saved.value,null);assert.equal(saved.status,'missing');}else{near(saved.value,v.valuePer100g,f.id+' generated '+v.key);assert.equal(saved.estimated,true);}}
 for(const key of ['kcal','prot','fat','carb'])for(const grams of Object.values(f.por)){const saved=f.composition.fields.find(x=>x.key===key);near(saved.value*grams/100,M.portion(out,grams).find(x=>x.key===key).value,f.id+' generated portion');}
}
// Synthetic controls independently prove one yield divisor and nutrient-specific factors.
const synthetic={id:'test-only',status:'ready',ingredientBasis:'raw-edible',yieldGrams:200,ingredients:[{sourceId:'bls:TEST',blsCode:'TEST',name:'Synthetic',grams:100,basis:'raw-edible',retention:{kcal:{factor:.9,status:'verified-applicable',sourceId:'test'},prot:{factor:.8,status:'verified-applicable',sourceId:'test'}}}]};
const out=M.evaluate(synthetic,{keys:['kcal','prot','fat'],f:[['TEST','','','',200,10,null]]});
assert.equal(field(out,'kcal').valuePer100g,90);assert.equal(field(out,'prot').valuePer100g,4);assert.equal(field(out,'fat').valuePer100g,null);assert.equal(M.portion(out,350)[0].value,315);
const zeros=M.evaluate(synthetic,{keys:['kcal','prot'],f:[['TEST','','','',0,0]]});assert.equal(zeros.fields[0].valuePer100g,0);
const estimate=M.evaluate({...synthetic,ingredients:[{...synthetic.ingredients[0],retention:null}]},{keys:['kcal','prot'],f:[['TEST','','','',200,10]]},{method:'raw-total-over-finished-yield'});
assert.equal(estimate.fields[0].valuePer100g,100);assert.equal(estimate.fields[0].status,'estimated');assert.match(estimate.estimateNote,/не учтены/);
// Actual canonical unit conversion has already happened in the importer.
const cumin=ub['usda:170923'],dill=ub['usda:172233'];assert.equal(cumin.nut.kcal*1.5/100,5.625);assert.equal(cumin.nut.bcar,.762);assert.equal(cumin.sourceNutrients['1107'],762);
const spice={id:'test-cumin',status:'ready',ingredientBasis:'raw-edible',yieldGrams:100,ingredients:[{sourceId:cumin.id,name:cumin.names.ru,grams:1.5,basis:'raw-edible'}]};
const once=M.evaluate(spice,bls,options),twice=M.evaluate(spice,bls,options);assert.equal(JSON.stringify(once),JSON.stringify(twice));
near(field(once,'bcar').valuePer100g,.762*.015,'canonical beta-carotene mg only once');assert.equal(once.fields[0].valuePer100g,5.625);assert.equal(field(once,'carb').valuePer100g,null,'derivation is recipe opt-in');
assert.throws(()=>M.evaluate(spice,bls,{...options,usda:{...usda,basisGrams:28.349523125}}));
assert.throws(()=>M.evaluate({...spice,ingredients:[{...spice.ingredients[0],inputBasisGrams:28.349523125}]},bls,options));
assert.throws(()=>M.evaluate(spice,bls,{...options,mext:{basisGrams:1,foods:[]}}));
// Synthetic MEXT control tests the fallback's own per100g gate without substituting another food.
const mext={basisGrams:100,foods:[{id:'mext:TEST',nut:{kcal:200,bcar:1.5}}]},mrecipe={...spice,ingredients:[{sourceId:'mext:TEST',grams:10,inputBasisGrams:100,basis:'raw-edible'}]};
assert.equal(field(M.evaluate(mrecipe,bls,{method:options.method,mext}),'kcal').valuePer100g,20);
near(field(M.evaluate(mrecipe,bls,{method:options.method,mext}),'bcar').valuePer100g,.15,'MEXT canonical mg unchanged');
assert.equal(dill.portions.find(p=>p.amount===5).gramWeight,1);assert.equal(dill.portions.find(p=>/cup/.test(p.modifier)).gramWeight,8.9);
console.log('Passed Uzbek: six source-backed adaptations; independent BLS+USDA macros; 100/350/500/60/300/120g scaling; raw inputs/single yield; explicit recipe-local carb estimate; missing/zero safeguards; source IDs; labelled shurpa seasoning and manty grease; samsa1495g→1200g own target, equal editable shapes, fat proxy/source mismatch/after-bake oil once; immutable catalogs; USDA canonical units applied once.');
