/* Happy Meal · библиотека десертов 1.0 — коллекция ChatGPT (09.11.2026), подключение Claude (Update 25).
   Публичные справочные данные: файл читается с ветки meal-libraries общим загрузчиком (manifest id «desserts»);
   ни аккаунт, ни дневник модуль не пишет.
   97 записей: 30 собственных карточек (этикетки производителей, две расчётные модели, расчёт по рецепту) становятся
   продуктами каталога HM-DESSERT. 67 записей с ID BLS / USDA / кавказской / узбекской библиотек не создают второй
   продукт — существующая карточка получает принадлежность к коллекции: слово «десерт» в поиске, русское название
   для USDA, отметка в карточке. Неизвестное значение — не ноль; «менее N» — верхняя граница, не точное число. */
(function(root){
'use strict';
var SCHEMA='happy-independent-food-library/1.0', LIBRARY='desserts', REVISION=20261109;
var state='idle', pending=null, data=null, foods=[], members={}, memberIds=[], taggedRows=-1;
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function norm(x){return String(x||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim()}
function words(s){return norm(s).split(/[^\p{L}\p{N}]+/u).filter(function(w){return w.length>1})}
function finite(x){return typeof x==='number'&&Number.isFinite(x)?x:null}
function fmt(v){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3}).format(v)}
var UNIT_RU={g:'г',mg:'мг',ug:'мкг','µg':'мкг',kcal:'ккал',kJ:'кДж',IU:'МЕ'};
function u(x){return x==='ug'?'µg':x}
/* Этикетки: подтверждённые соответствия полям Meal (единица источника совпадает с единицей поля). Остальное — своё свойство карточки. */
var LABEL_MAP={energy_kcal:['kcal','kcal'],protein:['prot','g'],fat:['fat','g'],carbohydrate:['carb','g'],saturates:['sfa','g'],sugars:['sug','g'],salt:['salt','g'],fibre:['fib','g'],sodium_mg:['na','mg'],cholesterol_mg:['chol','mg'],vitamin_d_ug:['vD','ug'],calcium_mg:['ca','mg'],iron_mg:['fe','mg'],potassium_mg:['k','mg']};
var LABEL_RU={energy_kcal:'Энергия',energy_kj:'Энергия, кДж',protein:'Белки',fat:'Жиры',carbohydrate:'Углеводы по этикетке',saturates:'Насыщенные жирные кислоты',sugars:'Сахара',salt:'Соль',fibre:'Клетчатка',sodium_mg:'Натрий',cholesterol_mg:'Холестерин',trans_fat:'Трансжиры',added_sugars:'Добавленные сахара',vitamin_d_ug:'Витамин D',calcium_mg:'Кальций',iron_mg:'Железо',potassium_mg:'Калий'};
/* Этикетки США: «Total Carbohydrate» включает клетчатку — это не поле «Углеводы» Meal (как и у USDA 1005): показывается отдельной строкой. */
var US_LABEL=/-us$/;
var REGION={uk:'Великобритания',us:'США',ru:'Россия',es:'Испания',de:'Германия',fr:'Франция',it:'Италия',nz:'Новая Зеландия',au:'Австралия'};
var KIND={branded_label:'этикетка производителя',assembled_model:'расчётная модель из готовых компонентов',recipe_estimate:'расчёт по рецепту'};
var FLAG_RU={portion_energy_kj_inconsistent:'Энергия порции в кДж на странице производителя не совпадает с пересчётом из значения на 100 г; в карточке — пересчёт из 100 г, значение сайта сохранено как расхождение источника.'};
var MASS={source_declared_portion:'порция по данным производителя',source_average_mass:'средняя масса изделия по данным производителя',source_approximate_mass:'приблизительная масса изделия',recipe_author_declared:'масса по рецепту автора'};
/* USDA-ключи расчётных моделей: та же таблица соответствий, что у справочника USDA в Meal — [поле Meal или null, множитель единиц, название, единица USDA]. */
var USDA={"1003":["prot",1,"Protein","g"],"1004":["fat",1,"Total lipid (fat)","g"],"1005":[null,1,"Carbohydrate, by difference","g"],"1007":[null,1,"Ash","g"],"1008":["kcal",1,"Energy","kcal"],"1009":["sta",1,"Starch","g"],"1010":["suc",1,"Sucrose","g"],"1011":["glc",1,"Glucose","g"],"1012":["fru",1,"Fructose","g"],"1013":["lac",1,"Lactose","g"],"1014":["mal",1,"Maltose","g"],"1018":["alc",1,"Alcohol, ethyl","g"],"1051":["water",1,"Water","g"],"1057":[null,1,"Caffeine","mg"],"1058":[null,1,"Theobromine","mg"],"1062":[null,1,"Energy","kJ"],"1075":["gal",1,"Galactose","g"],"1079":["fib",1,"Fiber, total dietary","g"],"1087":["ca",1,"Calcium, Ca","mg"],"1089":["fe",1,"Iron, Fe","mg"],"1090":["mg",1,"Magnesium, Mg","mg"],"1091":["p",1,"Phosphorus, P","mg"],"1092":["k",1,"Potassium, K","mg"],"1093":["na",1,"Sodium, Na","mg"],"1095":["zn",1,"Zinc, Zn","mg"],"1098":["cu",1,"Copper, Cu","mg"],"1099":["fl",0.001,"Fluoride, F","µg"],"1101":["mn",1,"Manganese, Mn","mg"],"1103":[null,1,"Selenium, Se","µg"],"1104":[null,1,"Vitamin A, IU","IU"],"1105":[null,1,"Retinol","µg"],"1106":[null,1,"Vitamin A, RAE","µg"],"1107":["bcar",0.001,"Carotene, beta","µg"],"1108":[null,1,"Carotene, alpha","µg"],"1109":[null,1,"Vitamin E (alpha-tocopherol)","mg"],"1110":[null,1,"Vitamin D (D2 + D3), International Units","IU"],"1111":[null,1,"Vitamin D2 (ergocalciferol)","µg"],"1112":[null,1,"Vitamin D3 (cholecalciferol)","µg"],"1114":["vD",1,"Vitamin D (D2 + D3)","µg"],"1120":[null,1,"Cryptoxanthin, beta","µg"],"1122":[null,1,"Lycopene","µg"],"1123":[null,1,"Lutein + zeaxanthin","µg"],"1125":[null,1,"Tocopherol, beta","mg"],"1126":[null,1,"Tocopherol, gamma","mg"],"1127":[null,1,"Tocopherol, delta","mg"],"1128":[null,1,"Tocotrienol, alpha","mg"],"1129":[null,1,"Tocotrienol, beta","mg"],"1130":[null,1,"Tocotrienol, gamma","mg"],"1131":[null,1,"Tocotrienol, delta","mg"],"1162":["vC",1,"Vitamin C, total ascorbic acid","mg"],"1165":["b1",1,"Thiamin","mg"],"1166":["b2",1,"Riboflavin","mg"],"1167":["b3",1,"Niacin","mg"],"1170":["b5",1,"Pantothenic acid","mg"],"1175":["b6",1,"Vitamin B-6","mg"],"1177":["b9",1,"Folate, total","µg"],"1178":["b12",1,"Vitamin B-12","µg"],"1180":[null,1,"Choline, total","mg"],"1183":[null,1,"Vitamin K (Menaquinone-4)","µg"],"1184":[null,1,"Vitamin K (Dihydrophylloquinone)","µg"],"1185":[null,1,"Vitamin K (phylloquinone)","µg"],"1186":[null,1,"Folic acid","µg"],"1187":[null,1,"Folate, food","µg"],"1190":[null,1,"Folate, DFE","µg"],"1198":[null,1,"Betaine","mg"],"1210":["trp",1,"Tryptophan","g"],"1211":["thr",1,"Threonine","g"],"1212":["ile",1,"Isoleucine","g"],"1213":["leu",1,"Leucine","g"],"1214":["lys",1,"Lysine","g"],"1215":["met_",1,"Methionine","g"],"1216":[null,1,"Cystine","g"],"1217":["phe_",1,"Phenylalanine","g"],"1218":["tyr_",1,"Tyrosine","g"],"1219":["val",1,"Valine","g"],"1220":["arg",1,"Arginine","g"],"1221":["his",1,"Histidine","g"],"1222":["ala",1,"Alanine","g"],"1223":["asp",1,"Aspartic acid","g"],"1224":["glu",1,"Glutamic acid","g"],"1225":["gly",1,"Glycine","g"],"1226":["pro",1,"Proline","g"],"1227":["ser",1,"Serine","g"],"1228":[null,1,"Hydroxyproline","g"],"1242":[null,1,"Vitamin E, added","mg"],"1246":[null,1,"Vitamin B-12, added","µg"],"1253":["chol",1,"Cholesterol","mg"],"1257":[null,1,"Fatty acids, total trans","g"],"1258":["sfa",1,"Fatty acids, total saturated","g"],"1259":[null,1,"SFA 4:0","g"],"1260":[null,1,"SFA 6:0","g"],"1261":[null,1,"SFA 8:0","g"],"1262":[null,1,"SFA 10:0","g"],"1263":[null,1,"SFA 12:0","g"],"1264":[null,1,"SFA 14:0","g"],"1265":[null,1,"SFA 16:0","g"],"1266":[null,1,"SFA 18:0","g"],"1267":[null,1,"SFA 20:0","g"],"1268":[null,1,"MUFA 18:1","g"],"1269":[null,1,"PUFA 18:2","g"],"1270":[null,1,"PUFA 18:3","g"],"1271":[null,1,"PUFA 20:4","g"],"1272":["dha",1000,"PUFA 22:6 n-3 (DHA)","g"],"1273":[null,1,"SFA 22:0","g"],"1274":[null,1,"MUFA 14:1","g"],"1275":[null,1,"MUFA 16:1","g"],"1276":[null,1,"PUFA 18:4","g"],"1277":[null,1,"MUFA 20:1","g"],"1278":["epa",1000,"PUFA 20:5 n-3 (EPA)","g"],"1279":[null,1,"MUFA 22:1","g"],"1280":["dpa",1000,"PUFA 22:5 n-3 (DPA)","g"],"1283":[null,1,"Phytosterols","mg"],"1285":[null,1,"Stigmasterol","mg"],"1286":[null,1,"Campesterol","mg"],"1288":[null,1,"Beta-sitosterol","mg"],"1292":["mufa",1,"Fatty acids, total monounsaturated","g"],"1293":["pufa",1,"Fatty acids, total polyunsaturated","g"],"1299":[null,1,"SFA 15:0","g"],"1300":[null,1,"SFA 17:0","g"],"1301":[null,1,"SFA 24:0","g"],"1303":[null,1,"TFA 16:1 t","g"],"1304":[null,1,"TFA 18:1 t","g"],"1305":[null,1,"TFA 22:1 t","g"],"1306":[null,1,"TFA 18:2 t not further defined","g"],"1307":[null,1,"PUFA 18:2 i","g"],"1310":[null,1,"TFA 18:2 t,t","g"],"1311":[null,1,"PUFA 18:2 CLAs","g"],"1312":[null,1,"MUFA 24:1 c","g"],"1313":[null,1,"PUFA 20:2 n-6 c,c","g"],"1314":[null,1,"MUFA 16:1 c","g"],"1315":[null,1,"MUFA 18:1 c","g"],"1316":["la",1,"PUFA 18:2 n-6 c,c","g"],"1317":[null,1,"MUFA 22:1 c","g"],"1321":[null,1,"PUFA 18:3 n-6 c,c,c","g"],"1323":[null,1,"MUFA 17:1","g"],"1325":[null,1,"PUFA 20:3","g"],"1329":[null,1,"Fatty acids, total trans-monoenoic","g"],"1331":[null,1,"Fatty acids, total trans-polyenoic","g"],"1332":[null,1,"SFA 13:0","g"],"1333":[null,1,"MUFA 15:1","g"],"1404":["ala3",1,"PUFA 18:3 n-3 c,c,c (ALA)","g"],"1405":[null,1,"PUFA 20:3 n-3","g"],"1406":[null,1,"PUFA 20:3 n-6","g"],"1408":[null,1,"PUFA 20:4 n-6","g"],"1409":[null,1,"PUFA 18:3i","g"],"1410":[null,1,"PUFA 21:5","g"],"1411":[null,1,"PUFA 22:4","g"],"1412":[null,1,"MUFA 18:1-11 t (18:1t n-7)","g"],"2000":["sug",1,"Total Sugars","g"]};
function P(){return root.MealProducts}
function region(r){var m=/-([a-z]{2})$/.exec(r.id);return m&&REGION[m[1]]||''}
function sourceLabel(r){return 'Happy Meal · Десерты 1.0 · '+(KIND[r.recordKind]||r.recordKind)+(r.sourceUrls&&r.sourceUrls[0]?' · '+r.sourceUrls[0]:'')}
function target(r,n){
 var parts=n.key.split(':'),ns=parts[0],name=parts[parts.length-1];
 if(ns==='label'){
  var m=LABEL_MAP[name],us=US_LABEL.test(r.id)&&name==='carbohydrate';
  if(m&&!us&&m[1]===n.unit)return {kind:'standard',key:m[0],factor:1};
  return {kind:'custom',key:'prop:dessert:'+name,name:(LABEL_RU[name]||name)+(us?' США (включая клетчатку)':''),unit:UNIT_RU[n.unit]||n.unit,originalUnit:n.unit};
 }
 if(ns==='usda'){
  var d=USDA[parts[1]];
  if(d&&d[0]&&u(d[3])===u(n.unit))return {kind:'standard',key:d[0],factor:d[1]};
  return {kind:'custom',key:'prop:usda:'+parts[1],name:d?d[2]:'USDA '+parts[1],unit:UNIT_RU[n.unit]||n.unit,originalUnit:n.unit};
 }
 return {kind:'custom',key:'prop:dessert:'+norm(n.key).replace(/[^a-z0-9]+/g,'-'),name:n.key,unit:UNIT_RU[n.unit]||n.unit,originalUnit:n.unit};
}
function noteFor(r,n,t){
 var q=n.qualifier||'',unit=UNIT_RU[n.unit]||n.unit,out=[];
 if(q==='less_than')out.push('Этикетка: менее '+fmt(n.value)+' '+unit+' — верхняя граница, не точное число; в итогах учитывается как граница.');
 else if(q==='derived_from_rounded_label')out.push('Пересчёт на 100 г из округлённой таблицы производителя на порцию'+(r.sourceContext&&r.sourceContext.sourceBasisGrams?' '+r.sourceContext.sourceBasisGrams+' г':'')+'.');
 else if(q==='derived_from_kj')out.push('Килокалории рассчитаны из килоджоулей этикетки.');
 else if(q==='label_value')out.push('Значение этикетки производителя.');
 else if(r.recordKind==='assembled_model')out.push('Сумма готовых компонентов модели, не измерение.');
 else if(r.recordKind==='recipe_estimate')out.push('Расчёт по рецепту: сумма ингредиентов ÷ выход автора; потери не откалиброваны.');
 if(t.kind==='custom'&&t.key==='prop:dessert:carbohydrate')out.push('Определение углеводов этикетки США отличается от BLS; в общей строке «Углеводы» остаётся «нет данных», не ноль.');
 else if(t.kind==='standard'&&t.key==='carb'&&r.recordKind==='branded_label')out.push('Углеводы — как указано на этикетке '+(region(r)||'региона')+'; определение может отличаться от BLS.');
 if(n.status==='missing')out.push('В источнике нет значения: неизвестно, не ноль.');
 return out.join(' ');
}
function fields(r){
 var fs=root.MealReport.fields(),label=sourceLabel(r),origin=r.recordKind==='branded_label'?'copied':'calculated',std={},custom=[];
 r.nutrients.forEach(function(n){
  var t=target(r,n),v=finite(n.value),field={value:v==null?null:(t.factor&&t.factor!==1?v*t.factor:v),status:v==null?'missing':'value',origin:origin,source:label,notes:noteFor(r,n,t)};
  if(n.qualifier==='less_than'&&v!=null)field.sourceQualifier={state:'less_than',bound:field.value};
  if(t.kind==='standard'){if(std[t.key])throw Error('Dessert nutrient mapped twice: '+t.key);std[t.key]=field}
  else custom.push(Object.assign({key:t.key,kind:'custom',name:t.name,unit:t.unit,canonicalUnit:t.unit,originalUnit:t.originalUnit,category:'custom'},field));
 });
 var seen={};custom.forEach(function(c){if(seen[c.key])throw Error('Dessert custom property twice: '+c.key);seen[c.key]=1});
 return fs.map(function(d){return Object.assign({key:d.key,kind:'standard',name:d.title,unit:d.unit,canonicalUnit:d.unit,category:d.group},std[d.key]||{value:null,status:'missing',origin:origin,source:label,notes:'В источнике нет значения: неизвестно, не ноль.'})}).concat(custom);
}
function portions(r){
 var por={},notes=[];
 (r.portions||[]).forEach(function(p){
  var g=finite(p.grams);if(!(g>0))return;
  var pieces=finite(p.approximatePieces),count=finite(p.count);
  if(count>0&&!pieces){por['шт']=g;notes.push('Изделие '+fmt(g)+' г — '+(MASS[p.massQualification]||'по данным источника')+' ('+count+' шт в партии).')}
  else if(pieces===1){por['шт']=g;por['порция']=g;notes.push('Изделие '+fmt(g)+' г — '+(MASS[p.massQualification]||'по данным источника')+'.')}
  else if(pieces>1){por['порция ≈ '+pieces+' шт']=g;por['порция']=g;notes.push('Порция '+fmt(g)+' г ≈ '+pieces+' шт — '+(MASS[p.massQualification]||'по данным источника')+'; масса одной штуки не устанавливается.')}
  else{por['порция']=g;notes.push('Порция '+fmt(g)+' г — '+(MASS[p.massQualification]||'по данным источника')+'.')}
  if(p.notes)notes.push(String(p.notes));
 });
 if(!Object.keys(por).length)notes.push('Размер порции источником не задан: запись по введённым граммам.');
 return {por:por,note:notes.join(' ')};
}
function makeFood(r,input){
 var ctx=r.sourceContext||{},p=portions(r),label=r.recordKind==='branded_label',reg=region(r),lim=(r.limitations||[]).map(String);
 var f={id:r.id,n:String(r.titleRu).trim(),names:{ru:String(r.titleRu).trim()},catalogSource:'HM-DESSERT',revision:REVISION,
  src:label?'Десерты · этикетка':r.recordKind==='assembled_model'?'Десерты · расчётная модель':'Десерты · расчёт по рецепту',
  por:p.por,porG:1,porNote:p.note,
  composition:{version:1,basisGrams:100,fields:fields(r)},
  sourceInfo:{source:'Happy Meal · библиотека десертов',version:input.version,date:input.date,author:input.author,recordKind:r.recordKind,region:reg||null,urls:(r.sourceUrls||[]).filter(function(x){return /^https:\/\//.test(x)}),retrievedOn:ctx.retrievedOn||null,status:ctx.status||null,carbohydrateDefinition:ctx.carbohydrateDefinition||null,missingNutrients:ctx.missingNutrients||null,limitations:lim,qualityFlags:(r.qualityFlags||[]).map(function(x){return FLAG_RU[x]||String(x)}),rejectedSourceObservations:r.rejectedSourceObservations||null,
   originalNutrients:r.nutrients.map(function(n){return {key:n.key,value:n.value,unit:n.unit,qualifier:n.qualifier||null}}),
   model:r.recordKind==='branded_label'?null:{ingredients:ctx.ingredients||null,yieldGrams:ctx.yieldGrams||ctx.declaredFinishedYieldGrams||null,method:ctx.method||null},
   packageWeightGrams:finite(ctx.packageWeightGrams)},
  sourceNotes:'На 100 г. '+(label?'Этикетка производителя'+(reg?' · '+reg:''):KIND[r.recordKind]||r.recordKind)+(ctx.retrievedOn?', получена '+ctx.retrievedOn:'')+'. '+lim.join(' ')};
 P().project(f);
 var slug=r.id.replace(/^hmdessert:(label:)?/,'').split('-').filter(function(w){return w.length>2&&!/^\d+g?$/.test(w)&&!REGION[w]});
 f.w=words(f.n+' '+(r.aliases||[]).join(' ')+' десерт '+slug.join(' '));
 return f;
}
function ingest(input){
 if(!input||input.schema!==SCHEMA||!Array.isArray(input.foods)||!input.nutrientDefinitions||typeof input.version!=='string')throw Error('Invalid dessert library');
 var ids=new Set(),own=[],mem={},memIds=[];
 input.foods.forEach(function(r){
  if(!r||typeof r.id!=='string'||ids.has(r.id)||!String(r.titleRu||'').trim()||!r.basis||r.basis.type!=='mass'||r.basis.grams!==100||!Array.isArray(r.nutrients)||r.eligibleForImport!==true)throw Error('Invalid dessert record');
  ids.add(r.id);
  r.nutrients.forEach(function(n){var d=input.nutrientDefinitions[n.key];if(!d||d.unit!==n.unit||(n.value==null)!==(n.status==='missing'))throw Error('Invalid dessert nutrient '+n.key)});
  if(/^hmdessert:/.test(r.id)){var f=makeFood(r,input);P().validate(f);own.push(f)}
  else if(/^(bls|usda|kav|hmuz):/.test(r.id)){var m={id:r.id,titleRu:String(r.titleRu).trim(),aliases:(r.aliases||[]).map(String)};mem[r.id]=m;memIds.push(r.id);if(/^kav:/.test(r.id)){mem['bls:'+r.id.slice(4)]=m;memIds.push('bls:'+r.id.slice(4))}}
  else throw Error('Unknown dessert identity '+r.id);
 });
 data=input;foods=own;members=mem;memberIds=memIds;taggedRows=-1;state='ok';return own.length;
}
function owns(f){return !!(f&&f.catalogSource==='HM-DESSERT'&&/^hmdessert:/.test(f.id)&&f.composition)}
function member(f){return f&&!owns(f)&&members[f.id]||null}
/* Принадлежность существующей карточки к коллекции: без второго продукта и без изменения её состава. */
function mark(f,m,db){
 if(!f||f.dessertCollection)return;
 f.dessertCollection={title:m.titleRu};
 if(f.catalogSource==='USDA'&&f.names&&!f.names.ru){f.names.ru=m.titleRu;var l=db&&db.catalogLang||'ru';if(l==='ru'||!f.names[l])f.n=m.titleRu}
 f.w=f.w||[];words(m.titleRu+' '+m.aliases.join(' ')+' десерт').forEach(function(w){if(f.w.indexOf(w)<0)f.w.push(w)});
}
/* Строки BLS и кавказской кухни ищутся по своим массивам: слово «десерт» — в запасной строке синонимов BLS_X. */
function tagBls(){
 var B=root.BLS,X=root.BLS_X;if(state!=='ok'||!B||!Array.isArray(B.f)||!Array.isArray(X)||B.f.length===taggedRows)return;
 var index={};B.f.forEach(function(r,i){index[r[0]]=i});
 memberIds.forEach(function(id){if(!/^bls:/.test(id))return;var i=index[id.slice(4)];if(i==null||typeof X[i]!=='string')return;if(X[i].indexOf('десерт')<0)X[i]=(X[i]+' десерт').trim()});
 taggedRows=B.f.length;
}
function append(db,dict,list){
 if(state!=='ok')return;
 foods.forEach(function(saved){var f=P().clone(saved);dict[f.id]=f;var i=list.findIndex(function(x){return x.id===f.id});if(i<0)list.push(f);else list[i]=f});
 memberIds.forEach(function(id){var f=dict[id];if(f)mark(f,members[id],db)});
 tagBls();
}
function refresh(){if(root.rebuildLib)root.rebuildLib();if(root.renderAll)root.renderAll();if(root.FIND&&root.paintFind)root.paintFind();if(root.MealCatalog)root.MealCatalog.renderSettings()}
function load(force){
 if(pending)return pending;if(state==='ok'&&!force)return Promise.resolve(foods.length);
 if(root.MealSources&&!root.MealSources.enabled(root.DB,'DESSERT'))return Promise.resolve(0);
 state='loading';if(root.MealCatalog)root.MealCatalog.renderSettings();
 pending=Promise.resolve().then(function(){return root.HappyFoodLibraries.getJson(LIBRARY)}).then(function(input){var n=ingest(input);refresh();return n}).catch(function(){state='fail';if(root.MealCatalog)root.MealCatalog.renderSettings();return 0}).finally(function(){pending=null});
 return pending;
}
function counts(){var own=foods.length,mem=memberIds.filter(function(id){return !/^bls:Z/.test(id)||!members['kav:'+id.slice(4)]}).length;return {own:own,members:mem,total:own+mem}}
function settingsHTML(){
 var c=counts(),head='<h3>Десерты · коллекция</h3>';
 var status=state==='ok'?c.total+' записей: '+c.own+' карточек этикеток и расчётных моделей в этой базе и '+c.members+' отметок у продуктов BLS, USDA, кавказской и узбекской кухни.':state==='loading'?'Загрузка библиотеки…':state==='fail'?'Библиотека не загрузилась. Сохранённые продукты и записи доступны.':'Библиотека загрузится при включении.';
 return head+'<p>Библиотека десертов 1.0 (ChatGPT, 09.11.2026). '+status+'</p><p>Этикетка относится к своему продукту и региону; расчётные модели помечены и не выдаются за измерения. Неизвестные микроэлементы остаются неизвестными — не нулями. «Менее N» на этикетке показывается как граница. Углеводы этикеток США (включая клетчатку) — отдельной строкой, как у USDA.</p><p>Продукты BLS, USDA и кухонь, входящие в коллекцию, остаются в своих базах (без второй карточки): у них появляется слово «десерт» в поиске, у записей USDA — русское название. Семь черновых позиций набора в приложение не входят.</p>'+(state==='fail'?'<button class="happy-button" data-dessert-retry>Повторить загрузку десертов</button>':'');
}
function membershipHTML(f){var m=member(f);return m?'<p class="happy-note">Входит в коллекцию «Десерты 1.0» Happy Meal'+(norm(m.titleRu)!==norm(f.n)?' как «'+esc(m.titleRu)+'»':'')+'. Состав — из своей базы, без изменений.</p>':''}
function infoHTML(f){
 if(!owns(f))return '';
 var info=f.sourceInfo||{},lim=info.limitations||[],less=(f.composition.fields||[]).filter(function(x){return x.sourceQualifier&&x.sourceQualifier.state==='less_than'});
 return '<section class="happy-card mc-catalog-info"><span class="mc-source-tag">Happy Meal · Десерты 1.0 · '+esc(KIND[info.recordKind]||info.recordKind||'')+(info.region?' · '+esc(info.region):'')+'</span>'+
  '<p class="happy-note">'+esc(f.sourceNotes||'На 100 г.')+'</p>'+
  (f.porNote?'<p class="happy-note">'+esc(f.porNote)+'</p>':'')+
  (less.length?'<p class="happy-note">'+less.map(function(x){return esc(x.name)+': менее '+fmt(x.value)+' '+esc(x.unit)}).join('; ')+' — верхняя граница по этикетке.</p>':'')+
  (info.qualityFlags&&info.qualityFlags.length?'<p class="happy-note">Отметки проверки: '+info.qualityFlags.map(esc).join('; ')+'</p>':'')+
  (info.model&&info.model.ingredients?'<details><summary>Компоненты модели</summary><ul>'+info.model.ingredients.map(function(i){return '<li>'+esc(typeof i==='string'?i:(i.name||i.id||'')+(i.grams?' — '+fmt(i.grams)+' г':'')+(i.sourceId?' · '+i.sourceId:''))+'</li>'}).join('')+'</ul>'+(info.model.yieldGrams?'<p class="happy-note">Выход '+fmt(info.model.yieldGrams)+' г.</p>':'')+'</details>':'')+
  (info.urls||[]).map(function(url){return '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Источник ↗</a>'}).join(' ')+
  '<p class="happy-note">'+esc(footer(f))+'</p></section>';
}
function footer(f){if(!owns(f))return null;var info=f.sourceInfo||{};return 'Библиотека десертов 1.0 · ChatGPT, 09.11.2026 · '+(KIND[info.recordKind]||'')+(info.retrievedOn?', получено '+info.retrievedOn:'')+'. Подключение: Happy Meal Update 25. Неизвестное значение — не ноль.'}
root.MealDesserts={ingest:ingest,append:append,load:load,owns:owns,member:member,membershipHTML:membershipHTML,infoHTML:infoHTML,footer:footer,settingsHTML:settingsHTML,counts:counts,status:function(){return state},foods:function(){return foods.slice()},memberIds:function(){return memberIds.slice()}};
if(root.document){root.document.addEventListener('click',function(ev){if(ev.target.closest('[data-dessert-retry]'))load(true)});load()}   // как uzbek.js: модуль стоит после catalog.js, поэтому стартует сам
})(typeof window!=='undefined'?window:globalThis);
