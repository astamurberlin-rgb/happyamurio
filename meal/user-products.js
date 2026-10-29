/* In-app mobile editor. Global food references are read-only; drafts are detached. */
(function(root){
'use strict';
var doc=root.document,P=root.MealProducts,box,session,prior,outside=[],urls=[];
var ORIGIN={copied:'Скопировано из исходного продукта',laboratory:'Измерено лабораторно',calculated:'Рассчитано',user:'Введено пользователем'};
var STATUS={value:'Числовое значение',missing:'Нет данных',not_detected:'Не обнаружено'};
var GROUPS=[['main','Калории и БЖУ']].concat(root.MealReport.groups.map(function(g){return g[0]==='phy'?['phy','Фитонутриенты']:g})).concat([['custom','Другие свойства']]);
function e(id){return doc.getElementById(id)}
function esc(x){return root.escH(x)}
function num(x){return x==null?'':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:9,useGrouping:false}).format(x)}
function catalog(){return root.MealReport.fields(root.BLS&&root.BLS.keys)}
function pro(){return !!session.pro}
function error(text){var el=e('upStatus');if(el){el.textContent=text;el.classList.toggle('happy-error',!!text)}}
function label(text,control){return '<label class="up-label">'+text+control+'</label>'}
function input(id,value,extra){return '<input class="happy-input" id="'+id+'" value="'+esc(value||'')+'" '+(extra||'')+'>'}
function options(map,current){return Object.keys(map).map(function(k){return '<option value="'+esc(k)+'" '+(k===current?'selected':'')+'>'+esc(map[k])+'</option>'}).join('')}
function close(force){
 if(!box)return;
 if(!force&&dirty()){
   e('upLeave').hidden=false;e('upLeaveStay').focus();return;
 }
 box.remove();box=null;session=null;outside.forEach(function(x){x[0].inert=x[1]});outside=[];urls.forEach(function(u){URL.revokeObjectURL(u)});urls=[];
 if(prior&&doc.contains(prior))prior.focus();
}
function dirty(){return session&&P.changes(session.initial,session.draft).length>0}
function mount(){
 prior=doc.activeElement;box=doc.createElement('section');box.className='up-editor';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','upTitle');doc.body.appendChild(box);
 outside=Array.from(doc.body.children).filter(function(n){return n!==box}).map(function(n){var was=n.inert;n.inert=true;return [n,was]});
 box.addEventListener('click',click);box.addEventListener('input',change);box.addEventListener('change',change);
 box.addEventListener('toggle',function(ev){if(ev.target.dataset.group)session.open[ev.target.dataset.group]=ev.target.open},true);
 box.addEventListener('keydown',function(ev){
   if(ev.key==='Escape'){ev.preventDefault();if(session.view!=='edit'){session.view='edit';render()}else close()}
   if(ev.key==='Tab'){var nodes=Array.from(box.querySelectorAll('button,input,select,textarea,a[href],summary')).filter(function(n){return !n.disabled&&n.getClientRects().length}),a=nodes[0],b=nodes[nodes.length-1];if(ev.shiftKey&&doc.activeElement===a){ev.preventDefault();b.focus()}else if(!ev.shiftKey&&doc.activeElement===b){ev.preventDefault();a.focus()}}
 });
}
async function open(food,options){
 options=options||{};
 if(box)return;
 if(root.DB.productsVersion>1){root.toast('Формат продуктов новее редактора. Обнови Happy Meal.');return}
 if(food&&food.b&&root.BLS_ST!=='ok'){root.toast('Дождись загрузки базы состава, чтобы скопировать все нутриенты');return}
 var draft,sourceInfo=null;
 if(food&&food.b){var kav=root.kavOf&&root.kavOf(food.b),bls=root.BLS;sourceInfo=kav?{source:root.KAV&&root.KAV.src||'Happy Meal · Кавказская кухня',record:P.clone(kav),version:root.KAV&&root.KAV.v,code:food.b}:{source:bls&&bls.src||food.src,url:bls&&bls.url,version:bls&&bls.v,note:bls&&bls.note,code:food.b}}
 try{draft=P.fromFood(food,food?catalog():null,root.blsVal,{copy:!!options.copy,name:options.name||'',sourceInfo:sourceInfo});if(food&&options.copy){draft.por=Object.assign({},draft.por,(root.DB.units||{})[food.id]||{});draft.drink=!!root.isDrink(food.id)}}
 catch(ex){root.toast(ex.message);return}
 session={draft:draft,initial:P.clone(draft),original:options.copy?null:food,expected:draft.revision||0,cb:options.onSave,pro:!!root.DB.productToolsPro,view:'edit',query:'',filter:'',selected:[],open:{main:true},undo:null,saving:false};
 draft.por=Object.assign({},draft.por,(root.DB.units||{})[draft.id]||{});draft.porG=1;delete draft.porOwn;delete draft.own;session.initial=P.clone(draft);
 mount();render();e('upClose').focus();
}
function render(){
 var s=session,f=s.draft;
 box.innerHTML='<div class="up-shell"><header class="up-head"><div><small>HAPPY MEAL · МОИ ПРОДУКТЫ</small><h2 id="upTitle">'+(s.view==='library'?'Добавить свойство':s.view==='copy'?'Копирование состава':s.view==='share'?'Поделиться':s.original?'Редактировать продукт':'Свой продукт')+'</h2></div><button class="happy-button up-close" id="upClose" aria-label="Закрыть редактор">×</button></header>'+
 '<div id="upLeave" class="happy-card up-leave" hidden><p>Сохранить изменения перед выходом?</p><div class="happy-actions"><button class="happy-button primary" data-up="save">Сохранить</button><button class="happy-button" data-up="discard">Выйти без сохранения</button><button class="happy-button" id="upLeaveStay" data-up="stay">Продолжить</button></div></div>'+
 '<p class="happy-note" id="upStatus" role="status" aria-live="polite"></p>'+
 (s.view==='library'?libraryHTML():s.view==='copy'?copyHTML():s.view==='share'?shareHTML():editorHTML())+'</div>';
}
function editorHTML(){
 var s=session,f=s.draft,c=f.composition;
 return '<section class="happy-card up-card">'+label('Название продукта',input('upName',f.n,'maxlength="200" autocomplete="off"'))+
 '<button class="happy-button up-wide" data-up="copy-from">Скопировать свойства из…</button>'+
 '<div class="up-grid">'+label('Сорт',input('upVariety',f.variety,'maxlength="150"'))+label('Регион происхождения',input('upRegion',f.region,'maxlength="150"'))+'</div>'+
 label('Состояние продукта',input('upState',f.state,'placeholder="Сырой, варёный, замороженный…" maxlength="150"'))+
 label('Описание','<textarea class="happy-input" id="upDescription" rows="2" maxlength="3000">'+esc(f.description)+'</textarea>')+
 label('Заметки','<textarea class="happy-input" id="upNotes" rows="3" maxlength="5000" placeholder="Наблюдения, особенности сорта, как измеряли порцию…">'+esc(f.notes||'')+'</textarea>')+
 '<label class="up-check"><input type="checkbox" id="upDrink" '+(f.drink?'checked':'')+'>Это напиток</label>'+
 (f.copiedFrom?'<p class="happy-note">Основа: '+esc(f.copiedFrom.name)+' · '+esc(f.copiedFrom.source)+'<br>Самостоятельная копия. Показатели другого продукта требуют проверки.</p>':'')+'</section>'+
 portionsHTML()+'<button class="happy-button up-wide up-share" data-up="share">Поделиться / печать</button>'+
 '<section class="happy-card up-card"><h3>Нутриенты и свойства</h3><div class="up-basis">'+label('Масса основы, г',input('upBasis',num(c.basisGrams),'inputmode="decimal"'))+'<button class="happy-button" data-up="basis">Пересчитать</button></div><p class="happy-note">Все значения ниже — на '+esc(num(c.basisGrams))+' г. Смена основы пересчитывает значения, сохраняя состав на 100 г.</p><p class="up-macros" id="upMacros">'+macroText()+'</p>'+
 label('Найти показатель',input('upFilter',s.filter,'type="search" placeholder="Витамин C, белки…"'))+
 '<div id="upFields">'+fieldsHTML()+'</div><button class="happy-button up-wide" data-up="library">+ Добавить свойство</button>'+
 (s.undo?'<button class="happy-button up-wide" data-up="undo">Вернуть «'+esc(s.undo.field.name)+'»</button>':'')+
 '<p class="happy-note">«Нет данных» и «Не обнаружено» хранятся отдельно и не прибавляются к итогу как ноль.</p></section>'+
 proHTML()+'<footer class="up-footer"><button class="happy-button" data-up="cancel">Отмена</button><button class="happy-button primary" data-up="save">Сохранить продукт</button></footer><p class="happy-note up-tail">Записанные порции сохраняют состав на момент добавления.</p>';
}
function portionsHTML(){
 return '<section class="happy-card up-card"><h3>Свои порции</h3><p class="happy-note">Масса одной порции в граммах. Уже записанная еда сохраняет прежнюю массу.</p>'+Object.keys(session.draft.por).map(function(name,i){return '<div class="up-portion">'+label('Название',input('upPortionLabel'+i,name,'maxlength="80"'))+label('Масса, г',input('upPortion'+i,num(session.draft.por[name]),'inputmode="decimal"'))+'<button class="happy-button" data-up="portion-update" data-index="'+i+'" data-name="'+esc(name)+'" aria-label="Применить массу: '+esc(name)+'">✓</button><button class="happy-button" data-up="portion-remove" data-name="'+esc(name)+'" aria-label="Удалить порцию: '+esc(name)+'">×</button></div>'}).join('')+'<div class="up-grid">'+label('Название порции',input('upPortionName','','maxlength="80" placeholder="Горсть, чашка…"'))+label('Масса, г',input('upPortionGrams','','inputmode="decimal"'))+'</div><button class="happy-button up-wide" data-up="portion-add">+ Добавить порцию</button></section>';
}
function syncPortions(){
 var next=Object.create(null);Object.keys(session.draft.por).forEach(function(old,i){var input=e('upPortionLabel'+i);if(!input)return;var name=input.value.trim(),grams=P.number(e('upPortion'+i).value);if(!name||name==='г'||name.length>80||['__proto__','prototype','constructor'].includes(name)||!(grams>0))throw Error('Проверь название и массу порции');if(Object.keys(next).some(function(k){return P.norm(k)===P.norm(name)}))throw Error('Названия порций должны отличаться');next[name]=grams;if(session.draft.defU===old)session.draft.defU=name;});session.draft.por=next;
}
function copyHTML(){
 var picked=session.copySelected;
 return '<button class="happy-button up-back" data-up="back">‹ К продукту</button>'+
 (picked?'<section class="happy-card up-card up-copy-picked" id="upCopyPicked" tabindex="-1"><div class="up-copy-heading"><small>Выбран исходный продукт</small><div class="up-copy-title"><h3>'+esc(picked.n)+'</h3><button class="mlIco" data-up="copy-info" aria-label="Информация о выбранном продукте" aria-expanded="'+!!session.copyDetails+'">'+root.INFOI+'</button></div><p class="happy-note">'+(picked.k==null?'—':num(picked.k))+' ккал / 100 г · '+esc(picked.src||'Библиотека')+'</p></div>'+(session.copyDetails?'<div class="up-source-facts">'+root.MealControls.factsHTML(picked,100,'На 100 г')+'</div>':'')+'</section>':
 '<section class="happy-card up-card"><h3>Скопировать свойства из…</h3>'+label('Найти исходный продукт',input('upCopyQ',session.copyQuery,'type="search" placeholder="Найти: творог, банан…" autocomplete="off"'))+'<div class="mlRes" id="upCopyResults">'+copyResults()+'</div></section>')+
 '<footer class="up-footer up-copy-footer"><button class="happy-button" data-up="back">Отмена</button><button class="happy-button primary" id="upCopyApply" data-up="copy-apply" '+(picked?'':'disabled')+'>Скопировать состав</button></footer>';
}
function copyResults(){
 session.copyResults=session.copyQuery.trim()?root.searchLib(session.copyQuery).filter(function(f){return f.id!==session.draft.id}):[];
 if(!session.copyQuery.trim())return '';
 if(!session.copyResults.length)return '<p class="mlEmpty">Продукт не найден</p>';
 return root.resHTML('',session.copyResults.slice(0,25)).replace(/data-fact="pick"/g,'data-up="copy-pick"').replace(/data-fact="facts"/g,'data-up="copy-result-info"').replace(/data-fact="star"/g,'data-up="copy-star"');
}
function selectCopySource(id,details){
 var food=session.copyResults.find(function(f){return f.id===id});if(!food)throw Error('Обнови поиск и выбери продукт');
 session.copySelected=food;session.copyDetails=!!details;render();var picked=e('upCopyPicked');picked.focus();if(picked.scrollIntoView)picked.scrollIntoView({block:'start',behavior:'smooth'});
}
function copyComposition(){
 var food=session.copySelected;if(!food)throw Error('Выбери исходный продукт');if(food.b&&root.BLS_ST!=='ok')throw Error('Дождись загрузки базы состава');
 var info=food.copiedFrom&&food.copiedFrom.sourceInfo;
 if(food.b){var kav=root.kavOf&&root.kavOf(food.b);info=kav?{source:root.KAV&&root.KAV.src,record:P.clone(kav),code:food.b}:{source:root.BLS&&root.BLS.src,url:root.BLS&&root.BLS.url,version:root.BLS&&root.BLS.v,code:food.b}}
 var copied=P.fromFood(food,catalog(),root.blsVal,{copy:true,sourceInfo:info});session.draft.composition=copied.composition;session.draft.copiedFrom=copied.copiedFrom;P.project(session.draft);session.view='edit';session.filter='';session.selected=[];render();
}
function reportBody(){var f=session.draft;return '<h1>'+esc(f.n||'Свой продукт')+'</h1><p>'+[f.variety,f.region,f.state].filter(Boolean).map(esc).join(' · ')+'</p>'+(f.description?'<h2>Описание</h2><p>'+esc(f.description)+'</p>':'')+(f.notes?'<h2>Заметки</h2><p>'+esc(f.notes)+'</p>':'')+'<h2>Порции</h2><p>'+Object.keys(f.por).map(function(k){return esc(k)+' = '+num(f.por[k])+' г'}).join('; ')+'</p><h2>Состав на '+num(f.composition.basisGrams)+' г</h2><table><thead><tr><th>Показатель</th><th>Значение</th><th>Происхождение и источник</th></tr></thead><tbody>'+f.composition.fields.map(function(x){return '<tr><td>'+esc(x.name)+'</td><td>'+(x.status==='value'?num(x.value)+' '+esc(x.unit):esc(STATUS[x.status]))+'</td><td>'+esc(ORIGIN[x.origin])+(x.source?'<br>'+esc(x.source):'')+(x.measuredAt?'<br>'+esc(x.measuredAt):'')+(x.lab?'<br>'+esc(x.lab):'')+(x.method?'<br>'+esc(x.method):'')+(x.notes?'<br>'+esc(x.notes):'')+'</td></tr>'}).join('')+'</tbody></table><p>Happy Meal · '+(dirty()?'Черновик, изменения не сохранены':'Сохранённая карточка')+'</p>'}
function reportDocument(){return '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(session.draft.n)+'</title><style>body{font:15px system-ui,sans-serif;color:#222;max-width:900px;margin:24px auto;padding:16px}h1{overflow-wrap:anywhere}p{white-space:pre-wrap}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{text-align:left;vertical-align:top;padding:10px 5px;border-bottom:1px solid #ddd;overflow-wrap:anywhere}th:nth-child(2){width:22%}thead{display:table-header-group}tr{break-inside:avoid}@page{size:A4;margin:14mm}</style><body>'+reportBody()+'</body></html>'}
function shareHTML(){return '<button class="happy-button" data-up="back">‹ К продукту</button><div class="happy-actions up-share-actions"><button class="happy-button" data-up="share-file">Поделиться карточкой</button><button class="happy-button" data-up="print">Печать / PDF</button></div><p class="happy-note">Предпросмотр текущих данных. Для PDF выбери сохранение в меню печати.</p><article class="up-report">'+reportBody()+'</article>'}
function printProduct(){var frame=doc.createElement('iframe');frame.title='Печать продукта';frame.className='up-print-frame';frame.onload=function(){try{frame.contentWindow.focus();frame.contentWindow.print()}catch(ex){error('Печать недоступна в этом окне. Открой Happy Meal в Safari.')}};frame.srcdoc=reportDocument();box.appendChild(frame)}
function renderOwnLibrary(){var node=e('libraryOwnProducts');if(!node)return;var foods=root.DB.foods||[];node.innerHTML=foods.length?'<div class="eyebrow"><span>Мои продукты</span></div>'+foods.map(function(f){return '<button class="happy-button up-own-product" data-own-product="'+esc(f.id)+'"><span>'+esc(f.n)+'<small>Порций: '+Object.keys(f.por||{}).length+' · Мои</small></span><span aria-hidden="true">›</span></button>'}).join(''):''}
function macroText(){var f=session.draft;return ['kcal','prot','fat','carb'].map(function(k,i){var v=P.value(f,k);return ['Ккал','Б','Ж','У'][i]+' '+(v==null?'—':num(v))}).join(' · ')+' / 100 г'}
function rowHTML(f){
 var idx=session.draft.composition.fields.indexOf(f),selected=session.selected.includes(f.key),units=f.kind==='standard'?Array.from(new Set([f.canonicalUnit].concat(P.unitFactor(f.unit,'г')!=null?['г','мг','мкг']:[]))):null;
 return '<article class="up-field" data-field="'+esc(f.key)+'"><div class="up-field-top">'+(pro()?'<label class="up-select"><input type="checkbox" data-row="selected" '+(selected?'checked':'')+' aria-label="Выбрать '+esc(f.name)+'"></label>':'')+'<b>'+esc(f.name)+'</b><button class="happy-button up-remove" data-up="remove" data-index="'+idx+'" aria-label="Удалить показатель '+esc(f.name)+'">×</button></div>'+
 (f.kind==='custom'?'<small class="up-tag">Своё свойство'+(f.mapsTo?' · сопоставлено: '+esc(f.mapsTo):' · отдельно от стандартных нутриентов')+'</small>':'')+
 '<div class="up-value">'+label('Значение','<input class="happy-input" data-row="value" inputmode="decimal" value="'+num(f.value)+'" '+(f.status==='value'?'':'disabled')+' aria-label="'+esc(f.name)+': значение">')+
 label('Единица',units?'<select class="happy-input" data-row="unit" aria-label="'+esc(f.name)+': единица">'+units.map(function(u){return '<option '+(u===f.unit?'selected':'')+'>'+esc(u)+'</option>'}).join('')+'</select>':'<input class="happy-input" data-row="unit" maxlength="24" value="'+esc(f.unit)+'" aria-label="'+esc(f.name)+': единица">')+'</div>'+
 label('Результат','<select class="happy-input" data-row="status" aria-label="'+esc(f.name)+': результат">'+options(STATUS,f.status)+'</select>')+
 '<details class="up-details"><summary>Источник и свойства</summary>'+label('Происхождение','<select class="happy-input" data-row="origin">'+options(ORIGIN,f.origin)+'</select>')+
 label('Источник', '<input class="happy-input" data-row="source" value="'+esc(f.source)+'" maxlength="1000" placeholder="Ссылка, этикетка, справочник">')+
 label('Примечание','<textarea class="happy-input" data-row="notes" rows="2" maxlength="2000">'+esc(f.notes||'')+'</textarea>')+
 (f.kind==='custom'?label('Название свойства','<input class="happy-input" data-row="name" value="'+esc(f.name)+'" maxlength="150">')+label('Категория','<select class="happy-input" data-row="category">'+options(Object.fromEntries(GROUPS),f.category)+'</select>')+label('Явное сопоставление','<select class="happy-input" data-row="mapsTo"><option value="">Без сопоставления</option>'+catalog().filter(function(d){return P.unitFactor(f.unit,d.unit)!=null}).map(function(d){return '<option value="'+esc(d.key)+'" '+(f.mapsTo===d.key?'selected':'')+'>'+esc(d.title)+' · '+esc(d.unit)+'</option>'}).join('')+'</select>'):'')+
 '<div class="up-lab"><b>Лабораторные данные · Pro</b>'+label('Дата измерения','<input class="happy-input" data-row="measuredAt" type="date" value="'+esc(f.measuredAt||'')+'" '+(pro()?'':'disabled')+'>')+
 label('Лаборатория','<input class="happy-input" data-row="lab" value="'+esc(f.lab||'')+'" maxlength="300" '+(pro()?'':'disabled')+'>')+label('Метод и предел обнаружения','<input class="happy-input" data-row="method" value="'+esc(f.method||'')+'" maxlength="1000" '+(pro()?'':'disabled')+'>')+'</div>'+
 (f.copiedFrom?'<p class="happy-note">Скопировано из «'+esc(f.copiedFrom.productName)+'». Исходные данные и источник сохранены.</p>':'')+'</details></article>';
}
function fieldsHTML(){
 var filter=P.norm(session.filter),fields=session.draft.composition.fields;
 return GROUPS.map(function(g){var list=fields.filter(function(f){return f.category===g[0]&&(!filter||P.norm(f.name+' '+f.key).includes(filter))});if(!list.length)return '';return '<details class="up-group" data-group="'+g[0]+'" '+(filter||session.open[g[0]]?'open':'')+'><summary>'+g[1]+'<span>'+list.length+'</span></summary>'+list.map(rowHTML).join('')+'</details>'}).join('')||'<p class="happy-note">Нет показателей. Добавь нужное свойство из библиотеки.</p>';
}
function proHTML(){
 var s=session;
 return '<section class="happy-card up-card"><div class="up-pro-title"><h3>Инструменты Pro</h3><span class="up-tag">Тестовый доступ</span></div><label class="up-check"><input id="upPro" type="checkbox" '+(pro()?'checked':'')+'>Включить Pro без оплаты</label><p class="happy-note">Создание, копирование и редактирование доступны в Free. Pro добавляет коэффициенты, лабораторные метаданные, историю и экспорт.</p>'+
 (pro()?'<div class="up-coefficient"><h4>Массовый коэффициент</h4><p class="happy-note">Отметь показатели галочками. Пересчитываются только числовые значения.</p><div class="happy-actions"><button class="happy-button" data-up="select-all">Выбрать числовые</button><button class="happy-button" data-up="select-none">Снять выбор</button></div>'+label('Коэффициент',input('upFactor','1','inputmode="decimal"'))+'<button class="happy-button up-wide" data-up="coefficient">Применить к выбранным ('+s.selected.length+')</button></div>'+
 '<details class="up-details"><summary>История изменений · '+((s.original&&s.original.history||[]).length)+'</summary>'+historyHTML()+'</details><details class="up-details"><summary>Экспорт продукта</summary><p class="happy-note">Полный JSON и таблица CSV сохранённого продукта, включая состояния, источники и историю в JSON.</p><div class="happy-actions"><button class="happy-button" data-up="export-json" '+(s.original?'':'disabled')+'>JSON</button><button class="happy-button" data-up="export-csv" '+(s.original?'':'disabled')+'>CSV</button></div></details>':'')+'</section>';
}
function historyHTML(){
 var history=session.original&&session.original.history||[];
 if(!history.length)return '<p class="happy-note">Изменения появятся после сохранения продукта.</p>';
 var names={n:'Название',variety:'Сорт',region:'Регион',state:'Состояние',description:'Описание',notes:'Заметки',drink:'Напиток',por:'Меры порции',basisGrams:'Масса основы'};
 function show(x){if(x==null)return '—';if(typeof x==='object'&&x.name)return x.name+': '+(x.status==='value'?num(x.value)+' '+x.unit:STATUS[x.status])+' · '+ORIGIN[x.origin]+(x.source?' · '+x.source:'')+(x.measuredAt?' · '+x.measuredAt:'')+(x.notes?' · '+x.notes:'');return typeof x==='object'?JSON.stringify(x):String(x)}
 return history.slice().reverse().map(function(h){return '<details class="up-history"><summary>Версия '+h.revision+' · '+esc(new Date(h.at).toLocaleString('ru-RU'))+'</summary>'+h.changes.map(function(c){return '<p><b>'+esc(names[c.path]||(c.after||c.before||{}).name||c.path)+'</b><br>'+esc(show(c.before))+' → '+esc(show(c.after))+'</p>'}).join('')+'</details>'}).join('');
}
function libraryHTML(){
 return '<button class="happy-button" data-up="back">‹ К продукту</button><section class="happy-card up-card">'+label('Поиск в общей библиотеке',input('upLibraryQ',session.query,'type="search" placeholder="Например, антоцианы" autocomplete="off"'))+'<div id="upLibraryResults">'+libraryResults()+'</div></section><section class="happy-card up-card"><h3>Создать новое свойство</h3>'+label('Название',input('upPropertyName',session.query,'maxlength="150"'))+'<div class="up-grid">'+label('Единица измерения',input('upPropertyUnit','мг','maxlength="24" placeholder="мг, мкг, %…"'))+label('Значение на '+num(session.draft.composition.basisGrams)+' г',input('upPropertyValue','','inputmode="decimal" placeholder="Пусто — нет данных"'))+'</div>'+label('Категория','<select class="happy-input" id="upPropertyCategory">'+options(Object.fromEntries(GROUPS),'phy')+'</select>')+'<p class="happy-note">Своё свойство получит отдельный идентификатор. В стандартные нутриенты оно попадёт только после явного сопоставления.</p><button class="happy-button primary up-wide" data-up="new-property">Добавить свойство</button></section>';
}
function definitions(){return catalog().map(function(d){return {key:d.key,kind:'standard',name:d.title,unit:d.unit,canonicalUnit:d.unit,category:d.group}}).concat(root.DB.propertyDefs||[])}
function libraryResults(){
 var q=P.norm(session.query),have=new Set(session.draft.composition.fields.map(function(f){return f.key}));
 var list=definitions().filter(function(d){return !have.has(d.key)&&(!q||P.norm(d.name+' '+d.key).includes(q))});
 return list.slice(0,35).map(function(d){return '<button class="happy-button up-library-row" data-up="add-property" data-key="'+esc(d.key)+'"><span>'+esc(d.name)+'<small>'+esc(d.unit)+' · '+esc(Object.fromEntries(GROUPS)[d.category]||d.category)+(d.kind==='custom'?' · своё':'')+'</small></span><span>+</span></button>'}).join('')+(list.length>35?'<p class="happy-note">Уточни название, чтобы сузить поиск.</p>':'')||'<p class="happy-note">Не найдено среди доступных свойств. Создай его ниже.</p>';
}
function addProperty(def,value){
 if(session.draft.composition.fields.some(function(f){return f.key===def.key}))throw Error('Это свойство уже добавлено');
 var field=Object.assign(P.clone(def),{value:value,status:value==null?'missing':'value',origin:'user',source:'',notes:''});
 session.draft.composition.fields.push(field);session.open[field.category]=true;session.filter=field.name;session.view='edit';render();var node=box.querySelector('[data-field] input[data-row="value"]');if(node)node.focus();
}
function change(ev){
 if(!session||session.saving)return;var t=ev.target;
 if(t.id==='upCopyQ'){if(ev.type!=='input')return;session.copyQuery=t.value;e('upCopyResults').innerHTML=copyResults();return}
 if(t.id==='upLibraryQ'){if(ev.type!=='input')return;session.query=t.value;e('upLibraryResults').innerHTML=libraryResults();return}
 if(t.id==='upFilter'){session.filter=t.value;e('upFields').innerHTML=fieldsHTML();return}
 if(t.id==='upPro'&&ev.type==='change'){session.pro=t.checked;render();return}
 var props={upName:'n',upVariety:'variety',upRegion:'region',upState:'state',upDescription:'description',upNotes:'notes',upDrink:'drink'};
 if(props[t.id]){session.draft[props[t.id]]=t.id==='upDrink'?t.checked:t.value;return}
 var row=t.closest('[data-field]');if(!row||!t.dataset.row)return;
 var f=session.draft.composition.fields.find(function(x){return x.key===row.dataset.field}),key=t.dataset.row;if(!f)return;
 if(key==='selected'){if(ev.type==='change'){session.selected=t.checked?Array.from(new Set(session.selected.concat(f.key))):session.selected.filter(function(k){return k!==f.key});var button=box.querySelector('[data-up="coefficient"]');if(button)button.textContent='Применить к выбранным ('+session.selected.length+')'}return}
 try{
   error('');
   if(key==='value'){if(!t.value.trim()){f.value=null;f.status='missing'}else{f.value=P.number(t.value);f.status='value'}row.querySelector('[data-row="status"]').value=f.status;if(f.origin==='copied'||f.origin==='calculated')f.origin='user';}
   else if(key==='status'&&ev.type==='change'){f.status=t.value;f.value=null;if(f.status==='value'){f.value=0;row.querySelector('[data-row="value"]').value='0'}else row.querySelector('[data-row="value"]').value='';row.querySelector('[data-row="value"]').disabled=f.status!=='value';if(f.origin==='copied'||f.origin==='calculated')f.origin='user';}
   else if(key==='unit'&&ev.type==='change'){
     if(f.kind==='standard'){var factor=P.unitFactor(f.unit,t.value);if(f.value!=null&&factor!=null){f.value=Number((f.value*factor).toPrecision(12));row.querySelector('[data-row="value"]').value=num(f.value)}}
     f.unit=t.value;if(f.kind==='custom'&&f.mapsTo&&!P.unitFactor(f.unit,f.canonicalUnit)){f.mapsTo='';delete f.canonicalUnit;error('Сопоставление снято: единицы несовместимы')}
   }else if(key==='mapsTo'&&ev.type==='change'){
     var target=catalog().find(function(d){return d.key===t.value});f.mapsTo=t.value;if(target)f.canonicalUnit=target.unit;else delete f.canonicalUnit;
   }else if(!['value','status','unit','mapsTo'].includes(key))f[key]=t.value;
   P.project(session.draft);if(e('upMacros'))e('upMacros').textContent=macroText();
 }catch(ex){t.setAttribute('aria-invalid','true');error(ex.message);return}
 t.removeAttribute('aria-invalid');
}
async function persist(next){
 var serialized=JSON.stringify(next);
 if(root.winStore){await root.window.storage.set(root.K.db,serialized,false)}else root.localStorage.setItem(root.K.db,serialized);
 var raw=await root.rawGet(root.K.db);if(raw!==serialized)throw Error('Не удалось проверить сохранение. Изменения остались в редакторе.');
}
async function save(){
 if(session.saving)return;
 var s=session;
 try{
   if(s.view==='edit')syncPortions();
   if(box.querySelector('[aria-invalid="true"]'))throw Error('Исправь отмеченное числовое значение');
   if(e('upBasis')&&P.number(e('upBasis').value)!==s.draft.composition.basisGrams)throw Error('Нажми «Пересчитать», чтобы применить массу основы');
   P.validate(s.draft);s.saving=true;box.querySelectorAll('[data-up="save"]').forEach(function(b){b.disabled=true});
   // Check the persisted revision, so a stale editor cannot overwrite another tab.
   var raw=await root.rawGet(root.K.db),stored=raw?JSON.parse(raw):null,storedFood=stored&&(stored.foods||[]).find(function(f){return f.id===s.draft.id});
   if(storedFood&&(storedFood.revision||0)!==s.expected)throw Error('Продукт изменён в другом окне. Закрой редактор и открой его заново.');
   if(s.original&&stored&&!storedFood)throw Error('Продукт удалён в другом окне. Закрой редактор и открой библиотеку.');
   var base=root.saveT?P.clone(root.DB):(stored||root.DB);
   if(stored){base.foods=stored.foods||[];base.propertyDefs=stored.propertyDefs||[]}
   var next=P.upsert(base,s.draft,{expectedRevision:s.expected});next.db.productToolsPro=s.pro;
   if(next.db.units)delete next.db.units[s.draft.id];
   P.snapshotItems(next.db,Object.assign({},root.FOODS,{[next.food.id]:next.food}));
   clearTimeout(root.saveT);root.saveT=null;await persist(next.db);root.DB=next.db;root.rebuildLib();root.linkWrite();
   var callback=s.cb,food=root.FOODS[next.food.id];close(true);root.renderAll();if(doc.querySelector('[data-screen="journal"].on'))root.renderJournal();root.toast('«'+food.n+'» сохранён');if(callback)callback(food);
 }catch(ex){s.saving=false;if(box)box.querySelectorAll('[data-up="save"]').forEach(function(b){b.disabled=false});error(ex.name==='QuotaExceededError'?'На устройстве нет места. Экспортируй резервную копию и освободи хранилище.':ex.message)}
}
function exportProduct(format){
 var food=session.original;if(!food||!pro())return;
 function cell(v){if(v==null)return '';var s=String(v);if(/^[\s]*[=+@-]/.test(s))s="'"+s;return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
 var text,blob;if(format==='json')text=JSON.stringify({schema:'happy.meal.product.v1',product:food},null,2);
 else{text='\uFEFF'+[['ID','Название','Свойство','Тип','Сопоставление','Основа, г','Единица','Значение','Результат','Происхождение','Источник','Дата измерения','Лаборатория','Метод','Примечание']].concat(food.composition.fields.map(function(f){return [food.id,food.n,f.name,f.kind,f.mapsTo||'',food.composition.basisGrams,f.unit,f.value,STATUS[f.status],ORIGIN[f.origin],f.source,f.measuredAt,f.lab,f.method,f.notes]})).map(function(r){return r.map(cell).join(';')}).join('\r\n')}
 blob=new Blob([text],{type:format==='json'?'application/json':'text/csv;charset=utf-8'});root.jrShareBlob('happy-meal-product.'+format,blob,blob.type,'Продукт экспортирован');
}
function click(ev){
 var b=ev.target.closest('button');if(!b||!session||session.saving)return;
 if(b.id==='upClose'){close();return}
 var act=b.dataset.up;if(!act)return;
 try{
   error('');
   if(session.view==='edit'&&!['cancel','discard','stay','portion-remove'].includes(act))syncPortions();
   if(act==='cancel')close();
   if(act==='discard')close(true);
   if(act==='stay')e('upLeave').hidden=true;
   if(act==='save')save();
   if(act==='copy-from'){session.view='copy';session.copyQuery='';session.copyResults=[];session.copySelected=null;session.copyDetails=false;render();e('upCopyQ').focus()}
   if(act==='copy-pick'||act==='copy-result-info')selectCopySource(b.dataset.fid||b.dataset.id,act==='copy-result-info');
   if(act==='copy-info'){session.copyDetails=!session.copyDetails;render()}
   if(act==='copy-star'){var id=b.dataset.fid;if(String(id).indexOf('bls:')===0)root.blsUse(id);root.DB.favs=root.DB.favs||[];var i=root.DB.favs.indexOf(id);if(i<0)root.DB.favs.unshift(id);else root.DB.favs.splice(i,1);root.save();e('upCopyResults').innerHTML=copyResults()}
   if(act==='copy-apply')copyComposition();
   if(act==='portion-add'){var name=e('upPortionName').value.trim(),grams=P.number(e('upPortionGrams').value);if(!name||name.length>80||name==='г'||['__proto__','prototype','constructor'].includes(name))throw Error('Укажи название порции, например «горсть»');if(!(grams>0))throw Error('Масса порции должна быть больше нуля');if(Object.keys(session.draft.por).some(function(k){return P.norm(k)===P.norm(name)}))throw Error('Такая порция уже есть. Измени её массу выше.');session.draft.por[name]=grams;render()}
   if(act==='portion-update')render();
   if(act==='portion-remove'){delete session.draft.por[b.dataset.name];if(session.draft.defU===b.dataset.name)delete session.draft.defU;render()}
   if(act==='share'){session.view='share';render()}
   if(act==='share-file'){var html=reportDocument();root.jrShareBlob('happy-meal-product.html',new Blob([html],{type:'text/html'}),'text/html','Карточка передана')}
   if(act==='print')printProduct();
   if(act==='library'){session.view='library';session.query='';render();e('upLibraryQ').focus()}
   if(act==='back'){session.view='edit';render()}
   if(act==='basis'){session.draft=P.rebase(session.draft,P.number(e('upBasis').value));render()}
   if(act==='remove'){var index=+b.dataset.index;session.undo={index:index,field:P.clone(session.draft.composition.fields[index])};session.draft.composition.fields.splice(index,1);P.project(session.draft);render()}
   if(act==='undo'&&session.undo){session.draft.composition.fields.splice(session.undo.index,0,session.undo.field);session.open[session.undo.field.category]=true;session.undo=null;render()}
   if(act==='select-all'){session.selected=session.draft.composition.fields.filter(function(f){return f.status==='value'}).map(function(f){return f.key});render()}
   if(act==='select-none'){session.selected=[];render()}
   if(act==='coefficient'){if(!pro())return;session.draft=P.coefficient(session.draft,session.selected,P.number(e('upFactor').value));render();error('Коэффициент применён в черновике. Сохрани продукт.')}
   if(act==='add-property'){var def=definitions().find(function(d){return d.key===b.dataset.key});if(def)addProperty(def,null)}
   if(act==='new-property'){
     var name=e('upPropertyName').value.trim(),unit=e('upPropertyUnit').value.trim(),category=e('upPropertyCategory').value,v=e('upPropertyValue').value.trim();if(!name||!unit)throw Error('Укажи название и единицу измерения');
     var def=(root.DB.propertyDefs||[]).find(function(d){return P.norm(d.name)===P.norm(name)&&P.norm(d.unit)===P.norm(unit)})||{key:P.uid('prop:'),kind:'custom',name:name,unit:unit,category:category};addProperty(def,v?P.number(v):null);
   }
   if(act==='export-json')exportProduct('json');if(act==='export-csv')exportProduct('csv');
 }catch(ex){error(ex.message)}
}
function renderJournalProperties(){
 var node=e('jrCustomProperties');if(!node)return;var range=root.jrRange(),db={days:{},productSnapshots:root.DB.productSnapshots};
 Object.keys(root.DB.days||{}).forEach(function(d){if(d>=range.a&&d<=range.b)db.days[d]=root.DB.days[d]});
 var exchange=P.exchange(db,root.FOODS,[],root.blsVal),sums={},days=root.JR_DATA&&root.JR_DATA.days||1;
 Object.values(exchange.days).forEach(function(day){day.custom.forEach(function(p){var key=p.id+'|'+p.unit,a=sums[key]||(sums[key]={name:p.name,unit:p.unit,value:null,known:0,missing:0,notDetected:0,mapsTo:p.mapsTo});if(p.value!=null)a.value=(a.value||0)+p.value;a.known+=p.known;a.missing+=p.missing;a.notDetected+=p.notDetected})});
 var list=Object.values(sums);node.hidden=!list.length;
 node.innerHTML=list.length?'<div class="eyebrow"><span>Пользовательские свойства</span></div><section class="happy-card"><p class="happy-note">'+(range.a===range.b?'За день':'В среднем за день с записями')+' · свойства учитываются отдельно. Частичный итог включает только известные значения.</p>'+list.map(function(p){return '<div class="up-journal-property"><span>'+esc(p.name)+'<small>'+(p.mapsTo?'Сопоставлено: '+esc(p.mapsTo):'Без сопоставления')+(p.missing?' · нет данных: '+p.missing+' порц.':'')+(p.notDetected?' · не обнаружено: '+p.notDetected+' порц.':'')+'</small></span><b>'+(p.value==null?p.notDetected?'Не обнаружено':'—':num(p.value/days)+' '+esc(p.unit))+'</b></div>'}).join('')+'</section>':'';
}
root.MealProductEditor={create:function(name,callback){return open(null,{name:name,onSave:callback})},edit:function(food){return open(food)},copy:function(food,callback){return open(food,{copy:true,onSave:callback})},renderJournalProperties:renderJournalProperties,renderLibrary:renderOwnLibrary};
if(e('libraryCreateProduct'))e('libraryCreateProduct').addEventListener('click',function(){root.MealProductEditor.create('')});
if(e('libraryOwnProducts'))e('libraryOwnProducts').addEventListener('click',function(ev){var b=ev.target.closest('[data-own-product]');if(b&&root.FOODS[b.dataset.ownProduct])root.MealControls.product({fid:b.dataset.ownProduct,g:100})});
doc.getElementById('addOwnProduct').addEventListener('click',function(){root.MealProductEditor.create('')});
})(window);
