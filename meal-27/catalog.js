/* Read-only reference foods. MEXT identifiers never enter the BLS namespace. */
(function(root){
'use strict';
var P=root.MealProducts, foods={}, source=null, state='loading';
var LANGS={ru:'Русский',en:'English',ja:'日本語'},libraryQuery='',selectedSource='BLS';
function esc(x){return root.escH?root.escH(x):String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function norm(x){return String(x||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim()}
function lang(){var l=root.DB&&LANGS[root.DB.catalogLang]?root.DB.catalogLang:'ru';return l==='ja'&&root.MealSources&&!root.MealSources.enabled(root.DB,'MEXT')?'ru':l}
function name(f){return f.names&&(f.names[lang()]||f.names.ru||f.names.en)||f.n}
// A saved composition is evidence for its diary entry, not a new library product.
// Verify against the actually loaded native catalog; prefixes alone are not proof.
function verifiedReference(f){
 if(!f||typeof f.b!=='string'||f.id!=='bls:'+f.b)return null;
 if((root.DB&&root.DB.foods||[]).some(x=>x&&x.id===f.id))return null;
 var code=f.b,by=root.BLS_BY;
 if(!by||!Object.prototype.hasOwnProperty.call(by,code)||!Array.isArray(by[code])||by[code][0]!==code)return null;
 var regional=!!(root.KAV_M&&Object.prototype.hasOwnProperty.call(root.KAV_M,code))||!!(root.KAV&&Array.isArray(root.KAV.f)&&root.KAV.f.some(r=>r[0]===code));
 var n=typeof root.blsName==='function'?root.blsName(code):by[code][1];
 return {code:code,kind:regional?'KAV':'BLS',name:n,regional:regional};
}
function normalizeReference(f){
 if(!f||(f.catalogSource!=='BLS'&&f.catalogSource!=='HM'))return f;
 var ref=verifiedReference(f);if(!ref)return f;
 var view=P.clone(f);delete view.catalogSource;view.n=ref.name;view.src='BLS';
 if(ref.regional&&typeof root.kavLabel==='function')view.kav=root.kavLabel(ref.code);
 return view;
}
function mextRecipe(f){return !!(f&&f.catalogSource==='HM-JP'&&f.recipe&&Array.isArray(f.recipe.ingredients)&&f.recipe.ingredients.length&&f.sourceInfo&&f.sourceInfo.source==='Happy Meal · расчёт по MEXT')}
function nativeWrapper(f){return !!(f&&typeof f.b==='string'&&f.id==='bls:'+f.b&&(f.catalogSource==='BLS'||f.catalogSource==='HM'))}
function qualifierNote(q){return !q?'':q.state==='trace'?'Tr — следовое количество, не числовой ноль.':q.estimated?'В скобках в MEXT: оценённое значение.':q.state==='missing'?'В источнике нет числового результата.':''}
function makeFood(r,src){
 var fs=root.MealReport.fields(), label='MEXT · '+r.code, fields=fs.map(d=>{
   var q=r.qualifiers&&r.qualifiers[d.key],v=r.nut[d.key];
   return {key:d.key,kind:'standard',name:d.title,unit:d.unit,canonicalUnit:d.unit,category:d.group,value:typeof v==='number'?v:null,status:typeof v==='number'?'value':'missing',origin:'copied',source:label+' · '+r.sourceUrl,sourceQualifier:P.clone(q)||null,notes:qualifierNote(q)};
 });
 (r.extraProperties||[]).forEach(x=>fields.push(Object.assign({kind:'custom',origin:'copied',source:label+' · '+r.sourceUrl,status:x.value==null?'missing':'value',category:'custom',notes:''},P.clone(x))));
 var f={id:r.id,n:r.names.ru,names:P.clone(r.names),catalogSource:'MEXT',catalogCode:r.code,catalogFamily:r.family,catalogVariant:P.clone(r.variant),revision:src.revision||20260327,src:'MEXT',por:{},porG:1,sourceInfo:{source:'MEXT · Standard Tables of Food Composition in Japan',version:src.edition,url:r.sourceUrl,code:r.code,attribution:src.attribution,tables:P.clone(src.downloads),originalValues:P.clone(r.sourceRaw),fieldTables:P.clone(r.sourceTables),notesJa:r.notesJa},sourceNotes:r.sourceNotesRu||'На 100 г съедобной части. '+(r.notesRu||''),ediblePortion:P.clone(r.ediblePortion),composition:{version:1,basisGrams:100,fields:fields}};
 P.project(f);f.w=norm(Object.values(r.names).join(' ')+' '+(r.aliases||[]).join(' ')).split(/[^\p{L}\p{N}]+/u).filter(Boolean);f.n=name(f);return f;
}
function ingest(data){source=data.source;foods={};data.foods.forEach(r=>{foods[r.id]=makeFood(r,source)});state='ok';return foods}
function append(db,dict,list){
 var cached=Object.assign({},db.referenceFoods||{});
 Object.values(db.productSnapshots||{}).forEach(f=>{if(f.catalogSource&&!nativeWrapper(f)&&!verifiedReference(f)&&!cached[f.id])cached[f.id]=f});
 Object.values(Object.assign(cached,foods)).forEach(saved=>{if(!saved.catalogSource||nativeWrapper(saved)||verifiedReference(saved))return;var f=P.clone(saved);f.n=name(f);if(!f.w)f.w=norm(Object.values(f.names||{ru:f.n}).join(' ')).split(/[^\p{L}\p{N}]+/u).filter(Boolean);dict[f.id]=f;if(!list.some(x=>x.id===f.id))list.push(f)});
 if(root.MealUSDA)root.MealUSDA.append(db,dict,list);
 if(root.MealUzbek)root.MealUzbek.append(db,dict,list);
 if(root.MealDesserts)root.MealDesserts.append(db,dict,list);   // после USDA и кухонь: отметки коллекции ставятся на уже собранные карточки
}
function cacheUsed(db,dict){
 // Diary records already carry versioned composition snapshots; avoid storing them twice.
 var ids=new Set(db.favs||[]);(db.taps||[]).forEach(c=>ids.add(c.fid));
 (db.recipes||[]).forEach(r=>(r.items||r.lines||[]).forEach(i=>ids.add(i.fid)));
 ids.forEach(id=>{var f=dict[id];if(f&&f.catalogSource)(db.referenceFoods||(db.referenceFoods={}))[id]=P.snapshot(f)});
}
function coverage(items,key){
 var known=0,missing=0;(items||[]).forEach(i=>{if(!(i.g>0))return;var f=P.forItem(i,root.FOODS,root.DB);if(P.value(f,key,root.blsVal)==null)missing++;else known++});return {known:known,missing:missing};
}
function totalText(items,key,v){var c=coverage(items,key);return c.missing?(c.known?'≥ '+root.fmt(v):'—'):root.fmt(v)}
function matches(f,q){var query=norm(q),hay=norm(Object.values(f.names||{ru:f.n}).join(' ')+' '+(f.w||[]).join(' ')+' '+(Array.isArray(f.aliases)?f.aliases.join(' '):''));return query.split(/\s+/).every(t=>hay.includes(t))}
function search(q,list){
 if(!norm(q))return [];
 return list.filter(f=>f.catalogSource&&(!root.MealSources||root.MealSources.available(root.DB,f))&&matches(f,q)).sort((a,b)=>Number(norm(name(b))===norm(q))-Number(norm(name(a))===norm(q))).slice(0,30);
}
function variants(f){return f&&f.catalogFamily?Object.values(root.FOODS||foods).filter(x=>x.catalogSource===f.catalogSource&&x.catalogFamily===f.catalogFamily&&(!root.MealSources||root.MealSources.available(root.DB,x))).sort((a,b)=>String(a.catalogCode).localeCompare(String(b.catalogCode))):[]}
function variantHTML(f,preview){
 var all=variants(f);if(all.length<2)return '';
 return '<div class="mlVar mc-catalog-variants" role="group" aria-label="Варианты продукта">'+all.map(v=>'<button class="chip'+(v.id===f.id?' on':'')+'" '+(preview?'data-catalog-preview':'data-catalog-variant')+'="'+esc(v.id)+'" aria-pressed="'+(v.id===f.id)+'">'+esc(v.catalogVariant&&(v.catalogVariant[lang()]||v.catalogVariant.ru)||name(v))+'</button>').join('')+'</div>';
}
function infoHTML(f){
 var dessert=root.MealDesserts?root.MealDesserts.membershipHTML(f):'';
 if(root.MealDesserts&&root.MealDesserts.owns(f))return root.MealDesserts.infoHTML(f);
 return infoHTMLBase(f)+dessert;
}
function infoHTMLBase(f){
 var ref=verifiedReference(f);
 if(ref)return '<section class="happy-card mc-catalog-info"><span class="mc-source-tag">'+esc(ref.kind==='KAV'?'Happy Meal · региональная библиотека':'BLS · Германия')+'</span><p>'+esc(ref.name)+' · '+esc(ref.code)+'</p><p class="happy-note">'+esc(ref.kind==='KAV'?'Существующая карточка региональной библиотеки Happy Meal. Это не рецепт на базе MEXT.':'Bundeslebensmittelschlüssel 4.0 · Max Rubner-Institut (2025).')+'</p></section>';
 if(!f.catalogSource)return '';
 if(f.catalogSource==='USDA'&&root.MealUSDA)return root.MealUSDA.infoHTML(f);
 if(root.MealUzbek&&root.MealUzbek.owns(f))return root.MealUzbek.infoHTML(f);
 if(f.catalogSource!=='MEXT'&&!mextRecipe(f))return '<section class="happy-card mc-catalog-info"><p class="happy-note">Источник справочника не подтверждён. Сохранённый состав записи не изменён.</p></section>';
 var names=f.names||{},isMext=f.catalogSource==='MEXT',url=f.sourceInfo&&f.sourceInfo.url;
 return '<section class="happy-card mc-catalog-info"><span class="mc-source-tag">'+esc(isMext?'MEXT · Япония · '+f.catalogCode:'Happy Meal · расчётный рецепт')+'</span><dl class="mc-names">'+Object.keys(LANGS).map(l=>'<div><dt>'+LANGS[l]+'</dt><dd lang="'+l+'">'+esc(names[l]||'—')+'</dd></div>').join('')+'</dl>'+
 '<p class="happy-note">'+esc(f.sourceNotes||'На 100 г съедобной части.')+'</p>'+(url&&/^https:\/\/(?:www\.mext\.go\.jp|fooddb\.mext\.go\.jp)\//.test(url)?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Таблицы MEXT ↗</a>':'')+
 (f.recipe?'<details><summary>Ингредиенты и расчёт</summary><ul>'+f.recipe.ingredients.map(i=>'<li>'+esc(i.name)+' — '+i.grams+' г</li>').join('')+'</ul><p class="happy-note">Выход: '+f.recipe.yieldGrams+' г. Сумма состава ингредиентов ÷ выход × 100. Если по ингредиенту нет результата, итоговый показатель остаётся неизвестным. Соус включён только в указанном количестве.</p></details>':'')+'</section>';
}
function sourceFooter(f){if(root.MealDesserts&&root.MealDesserts.owns(f))return root.MealDesserts.footer(f);if(root.MealUzbek&&root.MealUzbek.owns(f))return root.MealUzbek.footer(f);var ref=verifiedReference(f);if(ref)return ref.kind==='KAV'?'Happy Meal · региональная библиотека · '+ref.code+'. Сохранённый состав существующей карточки.':'BLS 4.0 · Max Rubner-Institut (2025) · '+ref.code+'.';return f.catalogSource==='USDA'?'USDA FoodData Central · SR Legacy, апрель 2018 · CC0. Оригинальные названия и значения USDA; выбранные русские названия — Happy Meal.':f.catalogSource==='MEXT'?'MEXT, таблицы 2023 с исправлениями от 27.03.2026. Переводы и подборка: Happy Meal.':mextRecipe(f)?'Расчёт Happy Meal по ингредиентам MEXT. Это заданный рецепт, состав ресторанного блюда может отличаться.':f.catalogSource?'Источник справочника не подтверждён; сохранённый состав записи не изменён.':null}
function amount(v,unit,field){
 var q=field&&field.sourceQualifier;
 if(q&&q.state==='trace'&&field.status!=='value')return 'Следы (Tr)';
 if(q&&q.state==='less_than'&&v!=null)return '< '+new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3}).format(v)+' '+esc(unit);
 if(field&&field.status==='not_detected')return 'Не обнаружено';
 if(v==null){if(q&&q.reason==='MEXT_RAE_not_equivalent_to_BLS_RE')return 'См. RAE ниже';if(q&&q.reason==='MEXT_alpha_tocopherol_not_equivalent_to_BLS_vitamin_E_equivalent')return 'См. α-токоферол ниже';return '—'}
 return (q&&q.estimated?'≈ ':'')+new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3}).format(v)+' '+esc(unit);
}
function renderSettings(){
 var el=root.document&&root.document.getElementById('mealSources');if(!el)return;
 var bodies={BLS:'<h3>BLS · Германия</h3><p>Max Rubner-Institut (2025): Bundeslebensmittelschlüssel, Version 4.0. Русские названия — перевод Happy Meal.</p><a href="https://www.blsdb.de/" target="_blank" rel="noopener noreferrer">BLS ↗</a>',
 MEXT:'<h3>MEXT · Япония</h3><p>Standard Tables of Food Composition in Japan, 2023. Исправления от 27.03.2026. '+(state==='ok'?Object.values(foods).filter(f=>f.catalogSource==='MEXT').length+' продуктов и вариантов.':state==='loading'?'Загрузка подборки…':'Подборка не загрузилась. Сохранённые записи доступны.')+'</p><p>Японские названия — оригинал. Английский и русский — переводы Happy Meal. Значения на 100 г съедобной части; состояние и отходы указаны в карточке.</p><p>Коммерческое использование и переработка разрешены условиями MEXT. Подборка и переводы изменены Happy Meal, без подтверждения со стороны MEXT.</p><a href="https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html" target="_blank" rel="noopener noreferrer">Исходные таблицы ↗</a> · <a href="https://www.mext.go.jp/b_menu/1351168.htm" target="_blank" rel="noopener noreferrer">Условия использования ↗</a>'+ (state==='fail'?'<button class="happy-button" data-catalog-retry>Повторить загрузку</button>':''),
 HM:'<h3>Happy Meal · рецепты</h3><p>Узбекская кухня: адаптированные плов, шурпа, манты и самса по BLS + USDA; выход учтён, потери нутриентов ещё не откалиброваны. Суши и поке: расчёт по указанным массам ингредиентов MEXT. Кавказская кухня: расчёты по рецептам и BLS 4.0; сулугуни — по справочнику И. М. Скурихина и соавторов.</p><p>Неизвестное значение сохраняется пустым. Отсутствие числа не означает отсутствие вещества. Рецепт и источник видны в карточке.</p>'};
 bodies.USDA=root.MealUSDA?root.MealUSDA.settingsHTML():'<p>USDA: модуль справочника недоступен. Сохранённые записи не изменены.</p>';
 bodies.DESSERT=root.MealDesserts?root.MealDesserts.settingsHTML():'<p>Десерты: модуль библиотеки недоступен. Сохранённые записи не изменены.</p>';
 bodies.OWN='<p>Созданные тобой продукты и копии. Отключение скрывает их из нового поиска, но сохраняет продукты, рецепты и записи дневника.</p>';
 var prefs=root.MealSources.preferences(root.DB),count=Object.values(prefs).filter(Boolean).length;
 var src=root.MealSources.catalog.find(s=>s.id===selectedSource)||root.MealSources.catalog[0],on=prefs[src.id],last=on&&count===1;
 var old=el.querySelector('.mc-source-pills'),scroll=old?old.scrollLeft:0;
 el.innerHTML='<div class="mc-source-pills" role="group" aria-label="Информация о пищевой базе">'+root.MealSources.catalog.map(s=>'<button class="chip'+(s.id===src.id?' on':'')+'" data-source-card="'+s.id+'" aria-pressed="'+(s.id===src.id)+'">'+esc(s.id==='BLS'?'BLS':s.id==='HM'?'Happy Meal':s.id==='DESSERT'?'Десерты':s.name)+'</button>').join('')+'</div>'+
 '<div class="happy-card mc-source-body"><div class="mc-source-head"><div><h3>'+esc(src.name)+'</h3><small>'+(last?'Последняя включённая база':on?'В поиске':'Выключена')+'</small></div><input class="happy-switch" type="checkbox" role="switch" id="mealSource-'+src.id+'" data-food-source="'+src.id+'" aria-label="'+esc(src.name)+'" aria-describedby="mealSourceHelp" '+(on?'checked ':'')+(last?'disabled ':'')+'></div>'+bodies[src.id].replace(/<h3>.*?<\/h3>/,'')+'</div>'+
 '<p class="happy-note mc-source-help" id="mealSourceHelp">Хотя бы одна база всегда включена. Свитч включает базу в поиск. Кнопки сверху переключают только информацию. Записанная еда и рецепты сохраняются.</p>'+
 '<p class="happy-note">Язык названий MEXT и переведённой части USDA</p><div class="mc-source-pills" role="group" aria-label="Язык названий MEXT">'+Object.keys(LANGS).map(l=>'<button class="chip'+(lang()===l?' on':'')+'" data-catalog-lang="'+l+'" aria-pressed="'+(lang()===l)+'" '+(l==='ja'&&!prefs.MEXT?'disabled ':'')+'>'+LANGS[l]+'</button>').join('')+'</div><p class="happy-note">'+(!prefs.MEXT?'Японский станет доступен после включения MEXT. ':'')+'Этот выбор меняет названия MEXT и переведённой части USDA, а не язык всех баз. Включённая MEXT поддерживает поиск по русским, английским и японским названиям. BLS не переведена на японский; поиск в других базах использует имеющиеся названия и синонимы.</p>';
 el.querySelector('.mc-source-pills').scrollLeft=scroll;
}
async function load(){
 state='loading';renderSettings();
 if(root.MealUSDA)root.MealUSDA.load();
 if(root.MealDesserts)root.MealDesserts.load();
 try{ingest(await root.HappyFoodLibraries.getJson('mext'));addRecipes();root.rebuildLib();if(root.renderAll)root.renderAll();if(root.paintFind&&root.FIND)root.paintFind()}
 catch(e){state='fail'}renderSettings();
}
/* Explicit, editable sample recipes. Cooked rice mass is used; no hidden cooking yield. */
function addRecipes(){
 var definitions=[
  ['shoyu-ramen','ramen-recipe',{ru:'Рамен сёю с курицей — рецепт',en:'Chicken shoyu ramen — recipe',ja:'鶏しょうゆラーメン（レシピ）'},{ru:'Сёю с курицей',en:'Chicken shoyu',ja:'鶏しょうゆ'},[['01048',180],['17024',300],['11288',70],['12005',50],['17007',15],['06227',10]]],
  ['miso-ramen','ramen-recipe',{ru:'Рамен мисо с курицей — рецепт',en:'Chicken miso ramen — recipe',ja:'鶏みそラーメン（レシピ）'},{ru:'Мисо с курицей',en:'Chicken miso',ja:'鶏みそ'},[['01048',180],['17024',300],['11288',70],['12005',50],['17045',25],['06227',10]]],
  ['mushroom-ramen','ramen-recipe',{ru:'Рамен с шиитаке и шпинатом — рецепт',en:'Shiitake and spinach ramen — recipe',ja:'しいたけとほうれん草のラーメン（レシピ）'},{ru:'Шиитаке и шпинат',en:'Shiitake and spinach',ja:'しいたけ・ほうれん草'},[['01048',180],['17022',300],['06268',60],['17007',15],['05018',5],['06227',10]]],

  ['salmon-nigiri','sushi-nigiri',{ru:'Суши нигири с лососем — рецепт',en:'Salmon nigiri — recipe',ja:'サーモンにぎり（レシピ）'},{ru:'Лосось',en:'Salmon',ja:'サーモン'},[['01088',40],['10438',20],['17016',2]]],
  ['tuna-nigiri','sushi-nigiri',{ru:'Суши нигири с тунцом — рецепт',en:'Tuna nigiri — recipe',ja:'まぐろにぎり（レシピ）'},{ru:'Тунец',en:'Tuna',ja:'まぐろ'},[['01088',40],['10252',20],['17016',2]]],
  ['cucumber-maki','sushi-maki',{ru:'Суши маки с огурцом — рецепт',en:'Cucumber maki — recipe',ja:'かっぱ巻き（レシピ）'},{ru:'Огурец',en:'Cucumber',ja:'きゅうり'},[['01088',120],['06065',40],['09004',3],['17016',6]]],
  ['salmon-maki','sushi-maki',{ru:'Суши маки с лососем — рецепт',en:'Salmon maki — recipe',ja:'サーモン巻き（レシピ）'},{ru:'Лосось',en:'Salmon',ja:'サーモン'},[['01088',120],['10438',50],['09004',3],['17016',6]]],
  ['salmon-poke','poke',{ru:'Поке с лососем — рецепт',en:'Salmon poke bowl — recipe',ja:'サーモンポキ丼（レシピ）'},{ru:'Лосось',en:'Salmon',ja:'サーモン'},[['01088',150],['10438',90],['07006',50],['06065',60],['06016',40],['17007',12],['05018',5]]],
  ['tuna-poke','poke',{ru:'Поке с тунцом — рецепт',en:'Tuna poke bowl — recipe',ja:'まぐろポキ丼（レシピ）'},{ru:'Тунец',en:'Tuna',ja:'まぐろ'},[['01088',150],['10252',90],['07006',50],['06065',60],['06016',40],['17007',12],['05018',5]]]
 ];
 definitions.forEach(d=>{
   var ingredients=d[4].map(i=>({food:foods['mext:'+i[0]],grams:i[1]}));if(ingredients.some(i=>!i.food))return;
   var mass=ingredients.reduce((s,i)=>s+i.grams,0), fields=root.MealReport.fields().map(def=>{
     var vals=ingredients.map(i=>P.value(i.food,def.key)),known=vals.every(v=>v!=null),v=known?vals.reduce((s,v,j)=>s+v*ingredients[j].grams,0)/mass:null;
     return {key:def.key,kind:'standard',name:def.title,unit:def.unit,canonicalUnit:def.unit,category:def.group,value:v,status:known?'value':'missing',origin:'calculated',source:'Happy Meal · рецепт 1 · ингредиенты MEXT',notes:known?'Расчёт по массам готовых ингредиентов.':'Нет результата по одному или нескольким ингредиентам.'};
   });
   ingredients[0].food.composition.fields.filter(x=>x.kind==='custom').forEach(def=>{
     var parts=ingredients.map(i=>i.food.composition.fields.find(x=>x.key===def.key&&x.unit===def.unit)),known=parts.every(x=>x&&x.status==='value');
     fields.push({key:def.key,kind:'custom',name:def.name,unit:def.unit,category:def.category,value:known?parts.reduce((sum,x,j)=>sum+x.value*ingredients[j].grams,0)/mass:null,status:known?'value':'missing',origin:'calculated',source:'Happy Meal · рецепт 1 · ингредиенты MEXT',notes:known?'Расчёт по готовым съедобным ингредиентам.':'Нет результата по одному или нескольким ингредиентам.'});
   });
   var f={id:'hmjp:'+d[0],n:d[2].ru,names:d[2],catalogSource:'HM-JP',catalogFamily:d[1],catalogVariant:d[3],catalogCode:d[0],revision:1,src:'Happy Meal · расчёт',por:{'порция':mass},porG:1,composition:{version:1,basisGrams:100,fields:fields},sourceInfo:{source:'Happy Meal · расчёт по MEXT',version:1},sourceNotes:'Пример рецепта Happy Meal. Масса готовых съедобных ингредиентов; состав рассчитан, не измерен в лаборатории.',recipe:{yieldGrams:mass,ingredients:ingredients.map(i=>({id:i.food.id,name:i.food.names.ru,grams:i.grams,source:i.food.sourceInfo}))}};
   P.project(f);f.w=norm(Object.values(f.names).join(' ')).split(/[^\p{L}\p{N}]+/u).filter(Boolean);foods[f.id]=f;
 });
}
root.MealCatalog={ingest:ingest,append:append,cacheUsed:cacheUsed,coverage:coverage,totalText:totalText,search:search,matches:matches,name:name,variants:variants,variantHTML:variantHTML,infoHTML:infoHTML,sourceFooter:sourceFooter,verifiedReference:verifiedReference,normalizeReference:normalizeReference,amount:amount,renderSettings:renderSettings,status:function(){return state},load:load,addRecipes:addRecipes};
if(root.document){
 root.document.addEventListener('change',function(ev){
   var b=ev.target.closest('[data-food-source]');if(!b)return;
   var id=b.dataset.foodSource,open=Array.from(root.document.querySelectorAll('#mealSources details')).map(d=>d.open);
   if(!root.MealSources.setEnabled(root.DB,id,b.checked)){b.checked=true;if(root.toast)root.toast('Оставь включённой хотя бы одну базу');return}
   if(id==='USDA'&&b.checked&&root.MealUSDA)root.MealUSDA.load();
   if(id==='DESSERT'&&b.checked&&root.MealDesserts)root.MealDesserts.load();
   root.rebuildLib();root.save();root.renderAll();if(root.FIND&&root.paintFind)root.paintFind();
   root.document.querySelectorAll('#mealSources details').forEach((d,i)=>{d.open=!!open[i]});
   var next=root.document.getElementById('mealSource-'+id);if(next&&!next.disabled)next.focus({preventScroll:true});
 });
 root.document.addEventListener('click',function(ev){
   var b=ev.target.closest('[data-source-card],[data-catalog-lang],[data-catalog-variant],[data-catalog-retry]');if(!b)return;
   if(b.dataset.sourceCard){selectedSource=b.dataset.sourceCard;renderSettings();var next=root.document.querySelector('[data-source-card="'+selectedSource+'"]');if(next)next.focus({preventScroll:true});return}
   if(b.dataset.catalogLang){if(b.dataset.catalogLang==='ja'&&!root.MealSources.enabled(root.DB,'MEXT'))return;root.DB.catalogLang=b.dataset.catalogLang;root.rebuildLib();root.save();root.renderAll()}
   if(b.hasAttribute('data-catalog-retry'))load();
   if(b.dataset.catalogVariant){var card=b.closest('.mlItem');if(!card)return;var w=card.dataset.w,l=root.lineOf(w,card.dataset.id),g=l.g;root.setFood(l,b.dataset.catalogVariant);l.q=g;l.u='г';l.g=g;root.keep(w);root.rer(w)}
 });
 load();
}
})(typeof window!=='undefined'?window:globalThis);
