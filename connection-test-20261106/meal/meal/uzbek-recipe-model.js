/* Pure draft calculation. No diary, network, storage or implicit source substitutions. */
(function(root){
'use strict';
function evaluate(recipe,bls,options){
 options=options||{};
 var estimated=options.method==='raw-total-over-finished-yield';
 if(recipe.ingredientBasis!=='raw-edible')throw Error('Expected raw edible ingredient weights; cooked inputs would double-apply yield.');
 if(!(Number.isFinite(recipe.yieldGrams)&&recipe.yieldGrams>0))throw Error('A positive documented finished yield or explicit own target is required.');
 var rows=Object.fromEntries(bls.f.map(r=>[r[0],r]));
 var usda=options.usda,mext=options.mext;
 if(usda&&usda.basisGrams!==100)throw Error('USDA canonical input must be per 100 grams.');
 var usdaBy=Object.fromEntries((usda&&usda.foods||[]).map(r=>[r.id,r]));
 if(mext&&mext.basisGrams!==100)throw Error('MEXT canonical input must be per 100 grams.');
 var mextBy=Object.fromEntries((mext&&mext.foods||[]).map(r=>[r.id,r]));
 var inputs=recipe.ingredients.map(i=>{
  if(!(Number.isFinite(i.grams)&&i.grams>0)||i.basis!=='raw-edible')throw Error('Invalid ingredient mass or basis.');
  if(i.blsCode&&i.sourceId!=='bls:'+i.blsCode)throw Error('Ingredient source ID mismatch.');
  if(i.blsCode&&!rows[i.blsCode])throw Error('Ingredient is not in the actual BLS catalog.');
  var external=i.sourceId&&i.sourceId.startsWith('usda:')?usdaBy[i.sourceId]:i.sourceId&&i.sourceId.startsWith('mext:')?mextBy[i.sourceId]:null;
  if(external&&i.inputBasisGrams!=null&&i.inputBasisGrams!==100)throw Error('External ingredient basis must be per 100 grams.');
  if(i.sourceId&&!i.blsCode&&!external)throw Error('Mapped external source record is unavailable.');
  return {ingredient:i,row:i.blsCode?rows[i.blsCode]:null,external:external};
 });
 var fields=bls.keys.map((key,index)=>{
  var knownRaw=0,knownAdjusted=0,missing=(recipe.unquantifiedAdditions||[]).map(i=>i.name+' (масса не указана)'),retentionMissing=[];
  inputs.forEach(({ingredient:i,row,external})=>{
   // Both imported external `nut` maps are already per100g in canonical units. Never reconvert.
   var v=row?row[4+index]:external&&external.nut[key];
   var derivation=i.derivedNutrients&&i.derivedNutrients[key];
   if(v==null&&key==='carb'&&external&&i.sourceId.startsWith('usda:')&&derivation&&derivation.method==='available-carbohydrate-by-difference'){
    var ids=['1005','1079'],parts=ids.map(id=>external.sourceNutrients&&external.sourceNutrients[id]);
    if(ids.every((id,j)=>usda.nutrientDefinitions&&usda.nutrientDefinitions[id]&&usda.nutrientDefinitions[id].unit==='g'&&typeof parts[j]==='number'&&Number.isFinite(parts[j])&&parts[j]>=0)){
     // USDA1005 already excludes alcohol: subtract dietary fiber only.
     var residual=parts[0]-parts[1];if(residual>=0)v=residual;
    }
   }
   if(typeof v!=='number'||!Number.isFinite(v)){missing.push(i.sourceId||i.name);return;}
   var raw=v*i.grams/100;knownRaw+=raw;
   // Retention is ingredient- and nutrient-specific, never a blanket energy calibration.
   var evidence=i.retention&&i.retention[key];
   if(!evidence||evidence.status!=='verified-applicable'||!evidence.sourceId){retentionMissing.push(i.sourceId);return;}
   if(!(Number.isFinite(evidence.factor)&&evidence.factor>=0&&evidence.factor<=1))throw Error('Invalid retention factor.');
   knownAdjusted+=raw*evidence.factor;
  });
  var complete=!missing.length&&!retentionMissing.length;
  var hasEstimate=estimated&&!missing.length&&key!=='water'; // Raw water is not finished moisture after cooking.
  return {key,status:complete?'calculated':hasEstimate?'estimated':'missing',valuePer100g:complete?knownAdjusted/recipe.yieldGrams*100:hasEstimate?knownRaw/recipe.yieldGrams*100:null,rawIngredientSubtotalPer100g:knownRaw/recipe.yieldGrams*100,adjustedKnownSubtotalPer100g:knownAdjusted/recipe.yieldGrams*100,missingIngredients:missing,unverifiedRetentionIngredients:retentionMissing};
 });
 var rawMass=inputs.reduce((s,x)=>s+x.ingredient.grams,0);
 return {id:recipe.id,method:estimated?'raw-total-over-finished-yield':'verified-nutrient-retention',estimateNote:estimated?'Расчётная оценка суммы сырых ингредиентов на готовый выход. Потери при приготовлении не учтены; это не калибровка по Скурихину.':null,yieldGrams:recipe.yieldGrams,rawInputGrams:rawMass,yieldRatio:recipe.yieldGrams/rawMass,yieldRatioBasis:recipe.yieldEvidenceType||'documented-recipe-output',fields,canPublish:recipe.status==='ready'&&fields.filter(f=>['kcal','prot','fat','carb'].includes(f.key)).every(f=>f.status==='calculated'||f.status==='estimated')};
}
function portion(result,grams){if(!(Number.isFinite(grams)&&grams>0))throw Error('Measured or explicitly estimated positive portion weight is required.');return result.fields.map(f=>({key:f.key,value:f.valuePer100g==null?null:f.valuePer100g*grams/100,status:f.status}));}
root.MealUzbekRecipeModel={evaluate:evaluate,portion:portion};
})(typeof window!=='undefined'?window:globalThis);
