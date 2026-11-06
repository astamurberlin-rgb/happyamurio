/* USDA SR Legacy: public reference data only. No account API or journal writes. */
(function(root){
'use strict';
var data=null,state='idle',pending=null,records=[],definitions={},source={};
function norm(x){return String(x||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim()}
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function selectedName(r){var l=root.DB&&root.DB.catalogLang||'ru';return r.names[l]||r.names.ru||r.names.en}
function displayUnit(u){return ({g:'г',mg:'мг','µg':'мкг',ug:'мкг',kcal:'ккал',kJ:'кДж',IU:'МЕ'})[u]||u}
function finite(x){return typeof x==='number'&&Number.isFinite(x)?x:null}
function fields(r){
 var label='USDA · SR Legacy · FDC '+r.code,standard=root.MealReport.fields().map(function(d){var v=finite(r.nut[d.key]);return {key:d.key,kind:'standard',name:d.title,unit:d.unit,canonicalUnit:d.unit,category:d.group,value:v,status:v==null?'missing':'value',origin:'copied',source:label+' · '+r.sourceUrl,notes:v==null?'В источнике нет сопоставимого числового результата.':''}});
 Object.keys(r.sourceNutrients||{}).forEach(function(id){var def=definitions[id];if(!def||def.standard)return;var v=finite(r.sourceNutrients[id]);standard.push({key:def.key||'prop:usda:'+id,kind:'custom',name:def.name,unit:displayUnit(def.unit),canonicalUnit:displayUnit(def.unit),originalUnit:def.unit,category:'custom',value:v,status:v==null?'missing':'value',origin:'copied',source:label+' · '+r.sourceUrl,notes:'Исходное определение USDA; не подменяет показатель с другим определением.'})});
 return standard;
}
function portionMap(r){
 var out={};(r.portions||[]).forEach(function(p){if(!(p.gramWeight>0))return;var unit=p.modifier||p.measureUnit||'serving';if(typeof unit==='object')unit=unit.name||'serving';var label=(p.amount&&p.amount!==1?p.amount+' ':'')+unit;label=label.trim().slice(0,80);if(!label||label==='г')return;if(out[label]&&out[label]!==p.gramWeight)label=(label.slice(0,65)+' ('+p.gramWeight+' g)').slice(0,80);out[label]=p.gramWeight});return out;
}
function makeFood(r){
 var P=root.MealProducts,f={id:r.id,n:selectedName(r),names:Object.assign({},r.names),catalogSource:'USDA',catalogCode:String(r.code),revision:20180401,src:'USDA',por:portionMap(r),porG:1,k:finite(r.nut.kcal),p:finite(r.nut.prot),f:finite(r.nut.fat),c:finite(r.nut.carb),w:r.searchWords.slice(),
 sourceInfo:{source:'USDA · FoodData Central · SR Legacy',version:'April 2018',url:r.sourceUrl,code:String(r.code),ndbNumber:r.ndbNumber,publicationDate:r.publicationDate,license:'CC0',archiveUrl:source.downloadUrl||source.url,originalNutrients:r.sourceNutrients},
 sourceNotes:'На 100 г съедобной части. SR Legacy, выпуск апреля 2018; публикация записи FDC: '+(r.publicationDate==='4/1/2019'?'01.04.2019':r.publicationDate||'не указана')+'. Это не новые измерения 2026 года. Углеводы по разности (включая клетчатку), витамин A RAE и α-токоферол показаны отдельно: определения отличаются от BLS. Порции — исходные меры USDA в граммах; английские названия сохранены.'};
 // Only selected/inspected foods allocate full composition fields. Snapshot JSON
 // evaluates this enumerable getter and persists independent plain data.
 var composition;Object.defineProperty(f,'composition',{enumerable:true,configurable:true,get:function(){return composition||(composition={version:1,basisGrams:100,fields:fields(r)})},set:function(v){composition=v}});
 return f;
}
function ingest(input){
 if(!input||!Array.isArray(input.foods)||!input.source||!input.nutrientDefinitions)throw Error('Invalid USDA dataset');
 var ids=new Set();input.foods.forEach(function(r){if(!/^usda:\d+$/.test(r.id)||ids.has(r.id)||!r.names||!r.names.en||!r.nut)throw Error('Invalid USDA record');ids.add(r.id);r.searchWords=norm(Object.values(r.names).join(' ')+' '+(r.aliases||[]).join(' ')).split(/[^\p{L}\p{N}]+/u).filter(Boolean)});
 data=input;source=input.source;definitions=input.nutrientDefinitions;records=input.foods;state='ok';return records.length;
}
function append(db,dict,list){var have=new Set(list.map(function(f){return f.id}));records.forEach(function(r){var f=makeFood(r);dict[f.id]=f;if(!have.has(f.id)){list.push(f);have.add(f.id)}else{var i=list.findIndex(function(x){return x.id===f.id});list[i]=f}})}
function refresh(){if(root.rebuildLib)root.rebuildLib();if(root.renderAll)root.renderAll();if(root.FIND&&root.paintFind)root.paintFind();if(root.MealCatalog)root.MealCatalog.renderSettings()}
function load(force){
 if(pending)return pending;if(state==='ok'&&!force)return Promise.resolve(records.length);
 if(root.MealSources&&!root.MealSources.enabled(root.DB,'USDA'))return Promise.resolve(0);
 state='loading';if(root.MealCatalog)root.MealCatalog.renderSettings();
 pending=root.fetch('../meal-data/usda-sr-legacy.json?v=20180401-1').then(function(res){if(!res.ok)throw Error('USDA unavailable');return res.json()}).then(function(input){var n=ingest(input);refresh();return n}).catch(function(){state='fail';if(root.MealCatalog)root.MealCatalog.renderSettings();return 0}).finally(function(){pending=null});return pending;
}
function settingsHTML(){return '<h3>USDA · США</h3><p>FoodData Central · SR Legacy, выпуск апреля 2018. '+(state==='ok'?records.length+' записей.':state==='loading'?'Загрузка справочника…':state==='fail'?'Справочник не загрузился. Сохранённые продукты доступны.':'Справочник загрузится при включении USDA.')+'</p><p>Полный набор SR Legacy из официальной выгрузки; не все типы FoodData Central, без отдельного набора Branded. Дата публикации записи FDC (обычно 2019) не означает дату измерения состава.</p><p>Оригинальные английские названия доступны для поиска. Русские названия добавлены для выбранных специй и зелени; остальная база пока на английском. Неизвестные и несопоставимые нутриенты не заменяются нулями.</p><p>USDA: общественное достояние, CC0. Значения и меры на карточке относятся к конкретному продукту и его состоянию.</p><a href="https://fdc.nal.usda.gov/download-datasets/" target="_blank" rel="noopener noreferrer">Официальная выгрузка ↗</a>'+ (state==='fail'?'<button class="happy-button" data-usda-retry>Повторить загрузку USDA</button>':'')}
function carbHTML(f,grams){
 if(!f||f.catalogSource!=='USDA')return '';
 var field=(f.composition&&f.composition.fields||[]).find(function(x){return x.key==='prop:usda:1005'}),v=field&&field.status==='value'?field.value*grams/f.composition.basisGrams:null;
 return '<section class="happy-card"><h3>Углеводы USDA · включая клетчатку</h3><p><strong>'+(v==null?'—':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3}).format(v)+' г')+'</strong> · на '+esc(grams)+' г</p><p class="happy-note">По разности, как указано в USDA. Это не показатель усвояемых углеводов BLS: в общей строке углеводов остаётся «нет данных», а не ноль. Значение не рассчитано вычитанием клетчатки.</p></section>';
}
function infoHTML(f){var info=f.sourceInfo||{},names=f.names||{},url=info.url;return '<section class="happy-card mc-catalog-info"><span class="mc-source-tag">USDA · SR Legacy · FDC '+esc(f.catalogCode)+'</span><dl class="mc-names"><div><dt>English · оригинал</dt><dd lang="en">'+esc(names.en||f.n)+'</dd></div>'+(names.ru?'<div><dt>Русский · Happy Meal</dt><dd lang="ru">'+esc(names.ru)+'</dd></div>':'')+'</dl><p class="happy-note">'+esc(f.sourceNotes||'На 100 г съедобной части. USDA SR Legacy, апрель 2018.')+'</p>'+(/^https:\/\/fdc\.nal\.usda\.gov\//.test(url||'')?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Запись USDA ↗</a>':'')+'</section>'}
root.MealUSDA={carbHTML:carbHTML,legacyReplacement:function(id){return data&&data.legacySearchReplacements&&data.legacySearchReplacements[id]||null},ingest:ingest,append:append,load:load,settingsHTML:settingsHTML,infoHTML:infoHTML,count:function(){return records.length},status:function(){return state}};
if(root.document)root.document.addEventListener('click',function(ev){if(ev.target.closest('[data-usda-retry]'))load(true)});
})(typeof window!=='undefined'?window:globalThis);
