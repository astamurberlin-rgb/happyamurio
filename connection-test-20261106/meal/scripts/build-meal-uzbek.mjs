import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const c=vm.createContext({});
for(const p of ['shared/meal-products-model.js','meal/report.js','meal/uzbek-recipe-model.js'])vm.runInContext(await read(p),c);
const d=JSON.parse(await read('meal-data/uzbek-draft.json'));
const braw=await read('meal-data/bls40.json'),bls=JSON.parse(braw),uraw=await read('meal-data/usda-sr-legacy.json'),usda=JSON.parse(uraw);
const hash=s=>createHash('sha256').update(s).digest('hex');
if(hash(braw)!==d.basis.sha256)throw Error('BLS source has changed: verify mappings before rebuilding.');
const sourceById=Object.fromEntries(d.sources.map(s=>[s.id,s]));
const supported={
 'hmuz:plov-mutton':{name:'Плов узбекский с бараниной',en:'Uzbek plov with mutton',variant:'Баранина',revision:3},
 'hmuz:plov-beef':{name:'Плов узбекский с говядиной',en:'Uzbek plov with beef',variant:'Говядина',revision:3},
 'hmuz:shurpa-mutton':{name:'Шурпа с бараниной',en:'Shurpa with mutton',variant:'Баранина',revision:1},
 'hmuz:shurpa-beef':{name:'Шурпа с говядиной',en:'Shurpa with beef',variant:'Говядина',revision:1},
 'hmuz:manty-mutton':{name:'Манты с бараниной, без соуса',en:'Mutton manty without sauce',variant:'Баранина · без соуса',revision:1},
 'hmuz:samsa-mutton-oven':{name:'Самса с бараниной, духовая',en:'Oven-baked mutton samsa',variant:'Баранина · духовая',revision:1}
};
const sourceLabels={'susu-uzbek-plov':'ЮУрГУ (2020)','susu-uzbek-shurpa':'ЮУрГУ (2020)','kgtu-2022-manty':'КГТУ (2022)','tekhnolog-ttk5352-samsa':'ТТК5352 · копия коммерческой карты (2019)'};
const foods=Object.entries(supported).map(([id,display])=>{
 const r=d.recipes.find(r=>r.id===id);
 if(!r||r.releaseStatus!=='estimated-ready')throw Error('Recipe not explicitly ready for estimated release: '+id);
 const source=sourceById[r.sourceId],yieldSource=sourceById[r.yieldSourceId];
 if(!source||!yieldSource||!sourceLabels[r.sourceId])throw Error('Missing recipe/yield provenance: '+id);
 const calc=c.MealUzbekRecipeModel.evaluate(r,bls,{usda,method:'raw-total-over-finished-yield'});
 const catalogs=[...new Set(r.ingredients.map(i=>i.sourceId.split(':')[0].toUpperCase()))];
 if(catalogs.some(x=>!['BLS','USDA'].includes(x)))throw Error('Unverified source catalog for this batch.');
 const note='Расчётная оценка, не лабораторное измерение. Выход готового блюда учтён; потери отдельных нутриентов при приготовлении пока не откалиброваны. Коэффициенты Скурихина не применены.'+(id.startsWith('hmuz:plov-')?' Область применения найденной строки для плова не подтверждена.':'')+(r.estimateNote?' '+r.estimateNote:'');
 const derivations=r.ingredients.flatMap(i=>Object.entries(i.derivedNutrients||{}).map(([key,method])=>({ingredientId:i.sourceId,key,...method,sourceValues:Object.fromEntries((method.sourceIds||[]).map(nid=>[nid,usda.foods.find(f=>f.id===i.sourceId)?.sourceNutrients?.[nid]??null]))})));
 const ingredients=r.ingredients.map(i=>{
  if(!i.derivedNutrients)return i;
  const derivedNutrients=Object.fromEntries(Object.entries(i.derivedNutrients).map(([key,method])=>{
   const external=usda.foods.find(f=>f.id===i.sourceId),inputValues=Object.fromEntries((method.sourceIds||[]).map(nid=>[nid,external?.sourceNutrients?.[nid]??null]));
   const valid=key==='carb'&&method.method==='available-carbohydrate-by-difference'&&['1005','1079'].every(nid=>usda.nutrientDefinitions[nid]?.unit==='g'&&Number.isFinite(inputValues[nid])&&inputValues[nid]>=0);
   const residual=valid?inputValues['1005']-inputValues['1079']:null;
   return [key,{...method,inputValues,resultPer100g:residual!=null&&residual>=0?residual:null,unit:'g',basisGrams:100,methodReferences:(method.methodSources||[]).map(sid=>{if(!sourceById[sid])throw Error('Unknown derivation reference: '+sid);return sourceById[sid];})}];
  }));
  return {...i,derivedNutrients};
 });
 const fields=c.MealReport.fields().map(def=>{
  const v=calc.fields.find(x=>x.key===def.key);
  if(!v)throw Error('Unknown canonical nutrient: '+def.key);
  const derived=derivations.filter(x=>x.key===def.key),derivationNote=derived.length?' '+derived.map(x=>x.note).join(' '):'';
  return {key:def.key,kind:'standard',name:def.title,unit:def.unit,canonicalUnit:def.unit,category:def.group,value:v.valuePer100g,status:v.valuePer100g==null?'missing':'value',origin:'calculated',source:'Happy Meal · BLS 4.0 + USDA SR Legacy · '+r.id,estimated:v.valuePer100g!=null,sourceQualifier:v.valuePer100g==null?null:{estimated:true},notes:v.valuePer100g==null?'Нет полного сопоставимого состава всех ингредиентов или поправки на испарение воды.':note+derivationNote};
 });
 const aliases=[...new Set([r.name.replace(' — черновик',' — оценка'),...(r.aliases||[])])];
 // Vessel size is not universal: shurpa bowl is the recipe target, plov pialas are user-measured.
 const portions=r.portions.filter(p=>p.id!=='100g').map(p=>p.id==='bowl'?{...p,label:'миска по рецептуре',status:'recipe-serving-target',editable:true}:p);
 if(portions.some(p=>!Number.isFinite(p.grams)||p.grams<=0))throw Error('Unknown portion weight: '+id);
 const portionNote=id.startsWith('hmuz:plov-')?'Пиала маленькая 300 г и большая 500 г — пользовательские измерения для плова (02.11.2026), не универсальный стандарт посуды. Меры можно изменить; миску можно задать своей мерой. 350 г — порция исходной рецептуры; состав всегда на 100 г.':id.startsWith('hmuz:shurpa-')?'500 г — выход порции исходной рецептуры; «миска по рецептуре» — этот целевой вес, не универсальный размер посуды. Взвесь свою миску и измени меру; состав всегда на 100 г.':id.startsWith('hmuz:samsa-')?r.portionNote:'60 г — одна штука этой рецептуры; 300 г — пять мантов без отдельно подаваемого уксуса. Это не универсальный размер мантов. Свою массу можно изменить; состав всегда на 100 г.';
 const referenceIds=[r.sourceId,r.yieldSourceId,r.seasoningSourceId,...derivations.flatMap(x=>x.methodSources||[]),r.calibration?.sourceId].filter(Boolean);
 const references=[...new Set(referenceIds)].map(sid=>{if(!sourceById[sid])throw Error('Unknown source ID: '+sid);return sourceById[sid];});
 const f={
  id:r.id,n:display.name,names:{ru:display.name,en:display.en},aliases,
  catalogCuisine:{id:'uzbek',name:'Узбекская кухня'},catalogSource:'HM-UZ',catalogCode:r.id.slice(5),catalogFamily:r.family,catalogVariant:{ru:display.variant},revision:display.revision,src:'Happy Meal · расчёт',
  por:Object.fromEntries(portions.map(p=>[p.label,p.grams])),porG:1,composition:{version:1,basisGrams:100,fields},
  sourceInfo:{source:'Happy Meal · BLS 4.0 + USDA SR Legacy',catalogs,version:1,url:source.url,code:r.id,attribution:'BLS 4.0 · Max Rubner-Institut (2025), CC BY 4.0. USDA FoodData Central · SR Legacy (2018), CC0.',inputHashes:{BLS:hash(braw),USDA:hash(uraw)}},
  sourceNotes:note,
  recipe:{...r,ingredients,name:undefined,revision:display.revision,status:'published-estimate',portions,calibration:{...r.calibration,status:'unverified-not-applied',note},catalogs,source,sourceLabel:sourceLabels[r.sourceId],yieldSource,references,portionNote,nutrientDerivations:derivations,calculationMethod:calc.method,rawInputGrams:calc.rawInputGrams,knownRawSubtotals:calc.fields.map(x=>({key:x.key,value:x.rawIngredientSubtotalPer100g,complete:x.missingIngredients.length===0}))}
 };
 c.MealProducts.project(f);
 f.w=[...new Set([...f.w,...aliases.flatMap(x=>c.MealProducts.norm(x).split(/[^\p{L}\p{N}]+/u).filter(Boolean)),'узбекский',...(id.startsWith('hmuz:plov-')?['зира','плов','ош']:[])])];
 c.MealProducts.validate(f);
 return f;
});
await writeFile(new URL('../meal-data/uzbek-recipes.json',import.meta.url),JSON.stringify({version:2,basisGrams:100,cuisine:{id:'uzbek',name:'Узбекская кухня'},foods},null,2)+'\n');
console.log('Built '+foods.length+' explicitly estimated recipes from actual BLS + USDA; no retention coefficients invented.');
