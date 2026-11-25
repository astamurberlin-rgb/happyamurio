/* Happy Meal · каталог «Сладкие заготовки» — данные Михалыча (ChatGPT, комплект 1.0 от 14.11.2026), подключение Claude (Meal 33.3).
   Файл — запись манифеста «sweet-preserves» ветки meal-libraries, контракт тот же, что у десертов (happy-independent-food-library/1.0).
   27 записей. 7 своих карточек по справочникам (Скурихин и Волгарев 1987, Скурихин и Тутельян 2002, ГОСТ 7061-88) становятся
   продуктами каталога HM-PRESERVE. 20 записей с ID BLS и USDA второго продукта не создают: существующая карточка получает русское
   название (у USDA), слова поиска и отметку «Входит в «Сладкие заготовки»», состав у неё прежний.
   Ключи нутриентов «ref:…» хранят смысл источника; в поля Meal переносятся только совместимые по смыслу и единице, остальное —
   своими строками. Неизвестное — не ноль, «следы» — не число. Аккаунт и дневник модуль не пишет. */
(function(root){
'use strict';
var SCHEMA='happy-independent-food-library/1.0', LIBRARY='sweet-preserves', REVISION=20261116, TITLE='Сладкие заготовки', LIB={version:'',date:'',author:''};
var state='idle', pending=null, foods=[], members={}, memberIds=[], taggedRows=-1;
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function norm(x){return String(x||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim()}
function words(s){return norm(s).split(/[^\p{L}\p{N}]+/u).filter(function(w){return w.length>1})}
function finite(x){return typeof x==='number'&&Number.isFinite(x)?x:null}
function ruDate(x){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x||''));return m?(+m[3])+' '+['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'][+m[2]-1]+(m[1]!==String(new Date().getFullYear())?' '+m[1]:''):String(x||'')}
var UNIT_RU={g:'г',mg:'мг',ug:'мкг',kcal:'ккал'};
/* Поле источника → поле Meal [ключ, единица]. Только совместимые по смыслу:
   усвояемые углеводы и «Углеводы» справочников — сахара и крахмал, как «Углеводы» BLS (клетчатка в них отдельной строкой);
   НЭ — строка «ниациновый эквивалент», витамин PP — строка «ниацин» (решение Астамура 24.11.2026); РЭ, ТЭ — как строки A и E у BLS; «Пищевые волокна» 2002 — клетчатка Meal; NaCl по таблице — соль. */
var MAP={energy_kcal:['kcal','kcal'],protein_g:['prot','g'],fat_g:['fat','g'],available_carbohydrate_source_g:['carb','g'],carbohydrate_as_reported_g:['carb','g'],
 total_sugars_g:['sug','g'],starch_g:['sta','g'],dietary_fiber_source_g:['fib','g'],water_g:['water','g'],alcohol_g:['alc','g'],saturated_fat_source_g:['sfa','g'],
 cholesterol_mg:['chol','mg'],salt_sodium_chloride_source_g:['salt','g'],sodium_mg:['na','mg'],potassium_mg:['k','mg'],calcium_mg:['ca','mg'],magnesium_mg:['mg','mg'],
 phosphorus_mg:['p','mg'],iron_mg:['fe','mg'],vitamin_c_mg:['vC','mg'],thiamin_mg:['b1','mg'],riboflavin_mg:['b2','mg'],niacin_equivalent_source_mg:['b3ne','mg'],vitamin_pp_source_mg:['b3','mg'],
 retinol_equivalent_source_ug:['vA','ug'],tocopherol_equivalent_source_mg:['vE','mg'],beta_carotene_mg:['bcar','mg']};
/* Своими строками: старая «клетчатка» — не пищевые волокна; колонка «A» — ретинол, не РЭ;
   «Каротин» — не только бета-каротин; органические кислоты и зола — полей в Meal нет. */
var OWN={legacy_crude_fiber_source_g:'Клетчатка (методика справочника 1987)',vitamin_a_column_a_source_ug:'Витамин A (ретинол)',
 carotene_source_ug:'Каротин',organic_acids_as_malic_acid_g:'Органические кислоты (в пересчёте на яблочную)',organic_acids_source_g:'Органические кислоты',ash_g:'Зола'};
function P(){return root.MealProducts}
function firstSource(r){var s=r.sourceContext&&r.sourceContext.sources;return s&&s[0]&&s[0].title?String(s[0].title):''}
function fields(r,input){
 var fs=root.MealReport.fields(),label='Happy Meal · '+TITLE+' '+LIB.version+(firstSource(r)?' · '+firstSource(r):''),std={},custom=[];
 r.nutrients.forEach(function(n){
  var name=n.key.replace(/^ref:/,''),m=MAP[name],v=finite(n.value);
  var field={value:v,status:n.status==='value'?'value':'missing',origin:'copied',source:label,notes:n.status==='value'?'':n.status==='trace'?'Следы: в источнике не число.':'В источнике нет значения: неизвестно, не ноль.'};
  if(n.status==='trace')field.sourceQualifier={state:'trace'};
  if(m){if(m[1]!==n.unit)throw Error('Preserve unit '+n.key);if(std[m[0]])throw Error('Preserve nutrient mapped twice: '+m[0]);std[m[0]]=field}
  else if(OWN[name])custom.push(Object.assign({key:'prop:preserve:'+name,kind:'custom',name:OWN[name],unit:UNIT_RU[n.unit],canonicalUnit:UNIT_RU[n.unit],originalUnit:n.unit,category:'custom'},field));
  else throw Error('Unknown preserve nutrient '+n.key);
 });
 return fs.map(function(d){return Object.assign({key:d.key,kind:'standard',name:d.title,unit:d.unit,canonicalUnit:d.unit,category:d.group},std[d.key]||{value:null,status:'missing',origin:'copied',source:label,notes:'В источнике нет значения: неизвестно, не ноль.'})}).concat(custom);
}
function makeFood(r,input){
 var ctx=r.sourceContext||{},lim=(r.limitations||[]).map(String),title=String(r.titleRu).trim();
 var f={id:r.id,n:title,names:{ru:title},catalogSource:'HM-PRESERVE',revision:r.revision==null?REVISION:r.revision,src:TITLE+' · справочник',por:{},porG:1,porNote:'',
  composition:{version:1,basisGrams:100,fields:fields(r,input)},
  sourceInfo:{source:'Happy Meal · '+TITLE,version:input.version,date:input.date,author:input.author,recordKind:r.recordKind,category:r.category||null,
   sources:(ctx.sources||[]).map(function(s){return {title:String(s.title||''),url:/^https:\/\//.test(s.url||'')?s.url:null}}),method:ctx.method||null,recipe:ctx.recipe||null,limitations:lim,
   originalNutrients:r.nutrients.map(function(n){return {key:n.key,value:n.value,unit:n.unit,status:n.status}})},
  sourceNotes:'На 100 г. '+(firstSource(r)?firstSource(r)+'. ':'')+(lim[0]||'')};
 P().project(f);
 f.w=words(f.n+' '+(r.aliases||[]).join(' '));
 return f;
}
function ingest(input){
 if(!input||input.schema!==SCHEMA||input.library!==LIBRARY||!Array.isArray(input.foods)||!input.nutrientDefinitions||typeof input.version!=='string')throw Error('Invalid preserves library');
 var ids=new Set(),own=[],mem={},memIds=[];
 LIB={version:input.version.split('.').slice(0,2).join('.'),date:ruDate(input.date),author:String(input.author||'')};
 input.foods.forEach(function(r){
  if(!r||typeof r.id!=='string'||ids.has(r.id)||!String(r.titleRu||'').trim()||!r.basis||r.basis.type!=='mass'||r.basis.grams!==100||!Array.isArray(r.nutrients)||r.eligibleForImport!==true||(r.revision!=null&&!(Number.isSafeInteger(r.revision)&&r.revision>=REVISION)))throw Error('Invalid preserve record');
  ids.add(r.id);
  r.nutrients.forEach(function(n){var d=input.nutrientDefinitions[n.key];if(!d||d.unit!==n.unit||['value','missing','trace'].indexOf(n.status)<0||(n.value==null)!==(n.status!=='value'))throw Error('Invalid preserve nutrient '+n.key)});
  if(/^hmpreserve:/.test(r.id)){var f=makeFood(r,input);P().validate(f);own.push(f)}
  else if(/^(bls|usda):/.test(r.id)){mem[r.id]={id:r.id,titleRu:String(r.titleRu).trim(),aliases:(r.aliases||[]).map(String),note:(r.limitations||[]).map(String).join(' ')};memIds.push(r.id)}
  else throw Error('Unknown preserve identity '+r.id);
 });
 foods=own;members=mem;memberIds=memIds;taggedRows=-1;state='ok';return own.length;
}
function owns(f){return !!(f&&f.catalogSource==='HM-PRESERVE'&&/^hmpreserve:/.test(f.id)&&f.composition)}
function member(f){return f&&!owns(f)&&members[f.id]||null}
/* Отметка существующей карточки: без второго продукта и без изменения её состава. */
function mark(f,m,db){
 if(!f||f.preserveCollection)return;
 f.preserveCollection={title:m.titleRu};
 if(f.catalogSource==='USDA'&&f.names&&!f.names.ru){f.names=Object.assign({},f.names,{ru:m.titleRu});var l=db&&db.catalogLang||'ru';if(l==='ru'||!f.names[l])f.n=m.titleRu}
 f.w=(f.w||[]).slice();words(m.titleRu+' '+m.aliases.join(' ')).forEach(function(w){if(f.w.indexOf(w)<0)f.w.push(w)});
}
/* Строки BLS ищутся по своим массивам: слова названия в коллекции — в строку синонимов BLS_X (как у десертов). */
function tagBls(){
 var B=root.BLS,X=root.BLS_X;if(state!=='ok'||!B||!Array.isArray(B.f)||!Array.isArray(X)||B.f.length===taggedRows)return;
 var index={};B.f.forEach(function(r,i){index[r[0]]=i});
 memberIds.forEach(function(id){
  if(!/^bls:/.test(id))return;var i=index[id.slice(4)];if(i==null||typeof X[i]!=='string')return;
  var have=words(B.f[i][1]+' '+X[i]),add=words(members[id].titleRu+' '+members[id].aliases.join(' ')).filter(function(w){return have.indexOf(w)<0});
  if(add.length)X[i]=(X[i]+' '+add.join(' ')).trim();
 });
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
 if(root.MealSources&&!root.MealSources.enabled(root.DB,'PRESERVE'))return Promise.resolve(0);
 state='loading';if(root.MealCatalog)root.MealCatalog.renderSettings();
 pending=Promise.resolve().then(function(){return root.HappyFoodLibraries.getJson(LIBRARY)}).then(function(input){var n=ingest(input);refresh();return n}).catch(function(){state='fail';if(root.MealCatalog)root.MealCatalog.renderSettings();return 0}).finally(function(){pending=null});
 return pending;
}
function counts(){return {own:foods.length,members:memberIds.length,total:foods.length+memberIds.length}}
function settingsHTML(){
 var c=counts(),status=state==='ok'?c.total+' позиций: '+c.own+' карточек по справочникам и '+c.members+' отметок у продуктов BLS и USDA.':state==='loading'?'Загрузка каталога…':state==='fail'?'Каталог не загрузился. Сохранённые записи доступны.':'Каталог загрузится при первом поиске.';
 return '<h3>'+TITLE+'</h3><p>Варенья, джемы, компоты, фрукты в сиропе и цукаты. '+status+'</p><p>'+(LIB.version?'Версия '+esc(LIB.version)+' ('+esc([LIB.author,LIB.date].filter(Boolean).join(', '))+'). ':'')+'Неизвестное значение — не ноль. Доля плодов и добавленный сахар — только если они есть в источнике.</p>';
}
function membershipHTML(f){var m=member(f);return m?'<p class="happy-note">Входит в «'+TITLE+'»'+(norm(m.titleRu)!==norm(f.n)?' как «'+esc(m.titleRu)+'»':'')+'.'+(m.note?' '+esc(m.note):'')+'</p>':''}
function infoHTML(f){
 if(!owns(f))return '';
 var info=f.sourceInfo||{},src=(info.sources||[])[0]||{},what=(info.limitations||[])[0]||'';
 return '<section class="happy-card mc-catalog-info"><span class="mc-source-tag">'+TITLE+' · справочник</span>'+
  (what?'<p class="happy-note">'+esc(what.charAt(0).toUpperCase()+what.slice(1))+'</p>':'')+
  (src.title?'<p>'+esc(src.title)+(src.url?' <a href="'+esc(src.url)+'" target="_blank" rel="noopener noreferrer">↗</a>':'')+'</p>':'')+'</section>';
}
function footer(f){if(!owns(f))return null;var by=[LIB.author,LIB.date].filter(Boolean).join(', ');return 'Каталог «'+TITLE+'»'+(by?' · '+by:'')}
root.MealPreserves={ingest:ingest,append:append,load:load,owns:owns,member:member,membershipHTML:membershipHTML,infoHTML:infoHTML,footer:footer,settingsHTML:settingsHTML,counts:counts,status:function(){return state},foods:function(){return foods.slice()},memberIds:function(){return memberIds.slice()}};
if(root.document){root.document.addEventListener('click',function(ev){if(ev.target.closest('[data-preserve-retry]'))load(true)});load()}   // как desserts.js: модуль стоит после catalog.js и стартует сам
})(typeof window!=='undefined'?window:globalThis);
