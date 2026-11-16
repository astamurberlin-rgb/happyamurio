/* Happy Meal · KFCT — Корея: Korean Food Composition Table 10.4 (RDA / NICS, Республика Корея), Meal 33.4.
   Данные — комплект Михалыча (ChatGPT, 16.11.2026: выгрузка официального Excel 10.4, 3 366 продуктов, 20 групп, 131 поле на 100 г
   съедобной части; русские названия — его черновик), 130 недостающих русских названий и 5 совпадавших — Claude (17.11.2026).
   Файл — запись манифеста «kfct» ветки meal-libraries (схема happy-meal-kfct/1). В файле значения как в источнике: число,
   «-» (нет данных), «Tr» (следы), «(x)» (в скобках — оценённое или заимствованное). Перенос в поля Meal — здесь, только совместимое
   по смыслу и единице (те же правила, что у MEXT): RAE — не ретиноловый эквивалент BLS, витамин E KFCT — своей строкой.
   Углеводы (Астамур и Михалыч 17.11.2026): в KFCT — «углеводы всего» вместе с клетчаткой; в Meal, как у BLS и MEXT, углеводы
   без клетчатки, поэтому в поле «Углеводы» — всего минус клетчатка (≈, расчёт), а «углеводы всего» — своей строкой рядом.
   Клетчатка не указана — в поле идут углеводы всего (≈). Неизвестное — не ноль.
   ID — kfct:<код>, отдельно от BLS, USDA и MEXT; продукты других баз не подменяются. Каталог включён у всех (Астамур 17.11.2026:
   «тестим на максимуме»). Аккаунт и дневник модуль не пишет. */
(function(root){
'use strict';
var SCHEMA='happy-meal-kfct/1', LIBRARY='kfct', ID='KFCT', TITLE='KFCT · Южная Корея', REVISION=20261117;
var state='idle', pending=null, foods={}, list=[], meta=null;
var UNIT={kcal:'ккал',g:'г',mg:'мг','μg':'мкг'};
/* Поле KFCT → [поле Meal, множитель]. Множитель — только перевод единиц (мкг → мг, мг → г). */
var MAP={A10100:['kcal',1],A10200:['water',1],A10300:['prot',1],A10400:['fat',1],
 A10700:['sug',1],A10701:['suc',1],A10702:['glc',1],A10703:['fru',1],A10704:['lac',1],A10705:['mal',1],A10706:['gal',1],
 A10800:['fib',1],A10801:['fbs',1],A10802:['fbi',1],
 B10100:['ca',1],B10200:['fe',1],B10300:['mg',1],B10400:['p',1],B10500:['k',1],B10600:['na',1],B10700:['zn',1],B10800:['cu',1],B10900:['mn',1],B11100:['mo',1],B11200:['i',1],
 C10103:['bcar',0.001],C20100:['b1',1],C20200:['b2',1],C20300:['b3',1],C20500:['b5',1],C20600:['b6',1],C20700:['b7',1],C20901:['b9',1],C21200:['b12',1],C21300:['vC',1],C10200:['vD',1],C10400:['vK',1],
 D10209:['his',0.001],D10201:['ile',0.001],D10202:['leu',0.001],D10203:['lys',0.001],D10204:['met_',0.001],D10302:['cys_',0.001],D10205:['phe_',0.001],D10301:['tyr_',0.001],
 D10206:['thr',0.001],D10207:['trp',0.001],D10208:['val',0.001],D10303:['ala',0.001],D10210:['arg',0.001],D10304:['asp',0.001],D10305:['glu',0.001],D10306:['gly',0.001],D10307:['pro',0.001],D10308:['ser',0.001],
 E10100:['chol',1],E10400:['sfa',1],E10500:['mufa',1],E10600:['pufa',1],E10700:['n3',1],E10800:['n6',1],E10601:['la',0.001],E10602:['ala3',0.001],E10610:['epa',1],E10612:['dpa',1],E10614:['dha',1],
 Z10100:['salt',1]};
var CONVERT={'kcal>ккал':1,'g>г':1,'mg>мг':1,'μg>мкг':1,'μg>мг':0.001,'mg>г':0.001};
/* Своими строками: показатели без поля в Meal или с другим определением. */
var OWN={A10600:'Углеводы всего (с клетчаткой)',A10500:'Зола',C10100:'Витамин A (RAE)',C10102:'Ретинол',B11000:'Селен',
 C20301:'Ниациновый эквивалент',C20900:'Фолат (пищевые фолатные эквиваленты)',C20902:'Фолиевая кислота (синтетическая)',C10300:'Витамин E (KFCT)',
 C10301:'Альфа-токоферол',C10201:'Витамин D2',C10202:'Витамин D3',C10401:'Витамин K1',C10402:'Витамин K2',D10309:'Таурин',E10200:'Жирные кислоты, всего',E10900:'Трансжирные кислоты, всего'};
/* Поле Meal пустое, потому что значение есть своей строкой — карточка пишет, где смотреть. */
var ELSEWHERE={vA:'KFCT_RAE',vE:'KFCT_vitamin_E'};
function P(){return root.MealProducts}
function norm(x){return String(x||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim()}
function words(s){return norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean)}
function esc(x){return root.escH?root.escH(x):String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function lang(){var l=root.DB&&root.DB.catalogLang;return l==='en'?'en':'ru'}
function name(f){return f.names[lang()]||f.names.ru||f.names.en}
/* Значение источника → {value, status, qualifier, note}. */
function cell(raw){
 if(typeof raw==='number'&&Number.isFinite(raw))return {value:raw,status:'value',q:null,note:''};
 if(raw==='Tr'||raw==='(Tr)')return {value:null,status:'missing',q:{raw:raw,state:'trace',estimated:raw==='(Tr)'},note:'Tr — следовое количество, не числовой ноль.'};
 var m=typeof raw==='string'&&/^\((-?\d+(?:\.\d+)?)\)$/.exec(raw);
 if(m)return {value:+m[1],status:'value',q:{raw:raw,state:'value',estimated:true},note:'В скобках в KFCT: оценённое или заимствованное значение.'};
 if(raw==='-'||raw==null)return {value:null,status:'missing',q:raw==null?null:{raw:raw,state:'missing',estimated:false},note:'В источнике нет данных: неизвестно, не ноль.'};
 throw Error('KFCT value '+raw);
}
function round(x){return Math.round(x*1e6)/1e6}
/* Углеводы Meal = углеводы всего KFCT минус клетчатка (как «Углеводы» BLS и MEXT — без клетчатки). Всегда ≈: это расчёт. */
function carbs(r,idx){
 var t=cell(r.v[idx.A10600]),fib=cell(r.v[idx.A10800]);
 if(t.status!=='value')return {value:null,status:'missing',sourceQualifier:t.q,notes:t.note};
 if(fib.status==='value')return {value:round(Math.max(0,t.value-fib.value)),status:'value',sourceQualifier:{state:'value',estimated:true,derived:'KFCT_total_minus_fiber'},notes:'Рассчитано: углеводы всего '+t.value+' г минус клетчатка '+fib.value+' г (KFCT).'};
 return {value:t.value,status:'value',sourceQualifier:{state:'value',estimated:true,derived:'KFCT_total_fiber_unknown'},notes:'Клетчатка в KFCT не указана: это углеводы всего.'};
}
function makeFood(r){
 var fs=root.MealReport.fields(),label='KFCT 10.4 · '+r.c,std={},custom=[],idx=meta.index;
 Object.keys(MAP).forEach(function(code){
  var m=MAP[code],c=cell(r.v[idx[code]]);
  std[m[0]]={value:c.value==null?null:round(c.value*m[1]),status:c.status,sourceQualifier:c.q,notes:c.note};
 });
 std.carb=carbs(r,idx);
 Object.keys(ELSEWHERE).forEach(function(k){var c=cell(r.v[idx[k==='vA'?'C10100':'C10300']]);std[k]={value:null,status:'missing',sourceQualifier:{state:'missing',reason:ELSEWHERE[k]},notes:c.status==='value'?'Другое определение в KFCT — своей строкой ниже.':c.note}});
 Object.keys(OWN).forEach(function(code){
  var d=meta.fields[code],c=cell(r.v[idx[code]]),u=UNIT[d.unit];
  if(c.status!=='value'&&!c.q)return;   // пустые свои строки не показываем
  custom.push({key:'prop:kfct:'+code,kind:'custom',name:OWN[code],names:{ru:OWN[code],en:d.en,ko:d.ko},unit:u,canonicalUnit:u,category:'custom',value:c.value,status:c.status,origin:'copied',source:label,sourceQualifier:c.q,notes:c.note,sourceIdentifier:d.tag||code});
  // как в источнике: «углеводы всего» и сразу под ними «из них клетчатка» (то же число, что в строке «Клетчатка»)
  if(code==='A10600'&&c.status==='value'){var fb=cell(r.v[idx.A10800]);if(fb.status==='value')custom.push({key:'prop:kfct:A10600_fiber',kind:'custom',name:'из них клетчатка',names:{ru:'из них клетчатка',en:'of which dietary fiber',ko:'식이섬유'},unit:'г',canonicalUnit:'г',category:'custom',value:fb.value,status:'value',origin:'copied',source:label,sourceQualifier:fb.q,notes:fb.note,sourceIdentifier:'FIBTG'})}
 });
 var fields=fs.map(function(d){var x=std[d.key]||{value:null,status:'missing',sourceQualifier:null,notes:'В KFCT такого показателя нет.'};return {key:d.key,kind:'standard',name:d.title,unit:d.unit,canonicalUnit:d.unit,category:d.group,value:x.value,status:x.status,origin:'copied',source:label,sourceQualifier:x.sourceQualifier,notes:x.notes}}).concat(custom);
 var g=meta.groups[r.g]||{},refuse=typeof r.r==='number'&&r.r>0?r.r:0;
 var f={id:'kfct:'+r.c,n:r.n.ru,names:{ru:r.n.ru,en:r.n.en,ko:r.n.ko},catalogSource:'KFCT',catalogCode:r.c,revision:meta.revision,src:'KFCT',por:{},porG:1,
  sourceInfo:{source:'KFCT 10.4 · Korean Food Composition Table',version:'10.4',url:meta.source.url,code:r.c,attribution:meta.source.attribution,group:{ko:g.ko,ru:g.ru},scientificName:r.s||null,sourceOfRow:r.o||null},
  sourceNotes:'На 100 г съедобной части.'+(refuse?' Отходы при разделке в источнике: '+String(refuse).replace('.',',')+' % — из взвешенной порции не вычитаются.':''),
  ediblePortion:{basisGrams:100,discardPercent:refuse,meaning:'nutrients_per_100g_edible_portion'},composition:{version:1,basisGrams:100,fields:fields}};
 P().project(f);
 f.w=words([r.n.ru,r.n.en,r.n.ko].concat(r.a||[]).join(' '));
 f.n=name(f);
 return f;
}
function ingest(input){
 if(!input||input.schema!==SCHEMA||!Array.isArray(input.foods)||!Array.isArray(input.fieldOrder)||!input.fields||input.basisGrams!==100||!(Number.isSafeInteger(input.revision)&&input.revision>=REVISION))throw Error('Invalid KFCT library');
 var index={};input.fieldOrder.forEach(function(k,i){index[k]=i});
 var fsByKey={};root.MealReport.fields().forEach(function(d){fsByKey[d.key]=d});
 Object.keys(MAP).forEach(function(code){var d=input.fields[code],t=fsByKey[MAP[code][0]];if(!d||index[code]==null||!t)throw Error('KFCT field '+code);if(CONVERT[d.unit+'>'+t.unit]!==MAP[code][1])throw Error('KFCT unit '+code+' '+d.unit+'>'+t.unit)});
 Object.keys(OWN).forEach(function(code){if(!input.fields[code]||index[code]==null||!UNIT[input.fields[code].unit])throw Error('KFCT field '+code)});
 meta={revision:input.revision,version:String(input.version||''),source:input.source||{},fields:input.fields,groups:input.groups||[],index:index};
 var out={},ids=[];
 input.foods.forEach(function(r){
  if(!r||typeof r.c!=='string'||!/^[A-Za-z0-9]+$/.test(r.c)||out['kfct:'+r.c]||!r.n||!String(r.n.ru||'').trim()||!r.n.en||!r.n.ko||!Array.isArray(r.v)||r.v.length!==input.fieldOrder.length)throw Error('Invalid KFCT record');
  var f=makeFood(r);out[f.id]=f;ids.push(f.id);
 });
 foods=out;list=ids;state='ok';return ids.length;
}
function owns(f){return !!(f&&f.catalogSource==='KFCT'&&/^kfct:/.test(String(f.id||'')))}
/* Как MEXT (Meal 33.1): копия в списке поиска делит состав и источник с каталогом, меры, названия и слова — свои. */
function append(db,dict,arr){
 if(state!=='ok'||(root.MealSources&&!root.MealSources.enabled(db,ID)))return;
 var have=new Set(arr.map(function(x){return x.id}));
 list.forEach(function(id){var saved=foods[id],f=Object.assign({},saved);f.por=Object.assign({},saved.por||{});f.names=Object.assign({},saved.names);f.w=saved.w.slice();f.n=name(f);dict[id]=f;if(!have.has(id)){have.add(id);arr.push(f)}else{var i=arr.findIndex(function(x){return x.id===id});arr[i]=f}});
}
function refresh(){if(root.rebuildLib)root.rebuildLib();if(root.renderAll)root.renderAll();if(root.FIND&&root.paintFind)root.paintFind();if(root.MealCatalog)root.MealCatalog.renderSettings()}
function load(force){
 if(pending)return pending;if(state==='ok'&&!force)return Promise.resolve(list.length);
 if(root.MealSources&&!root.MealSources.enabled(root.DB,ID)){state='idle';return Promise.resolve(0)}
 state='loading';if(root.MealCatalog)root.MealCatalog.renderSettings();
 pending=Promise.resolve().then(function(){return root.HappyFoodLibraries.getJson(LIBRARY)}).then(function(input){var n=ingest(input);refresh();return n}).catch(function(){state='fail';if(root.MealCatalog)root.MealCatalog.renderSettings();return 0}).finally(function(){pending=null});
 return pending;
}
function settingsHTML(){
 var status=state==='ok'?list.length+' продуктов в 20 группах.':state==='loading'?'Загрузка каталога…':state==='fail'?'Каталог не загрузился. Сохранённые записи доступны.':'Каталог загрузится, когда его включишь.';
 return '<h3>'+TITLE+'</h3><p>Korean Food Composition Table 10.4, RDA / NICS. '+status+'</p>'+
  '<p>Корейские и английские названия — оригинал, русские — перевод Happy Meal. Значения на 100 г съедобной части. В таблице «углеводы всего» — вместе с клетчаткой; в дневник, как у других каталогов, идут углеводы без клетчатки (≈, расчёт).</p>'+
  '<p>KOGL Type 1: использование с указанием источника. Перевод и сопоставление показателей — Happy Meal, без подтверждения RDA.</p>'+
  '<a href="https://www.nics.go.kr/food/kfi/fct/fctIntro/list" target="_blank" rel="noopener noreferrer">Исходная таблица ↗</a> · <a href="https://www.kogl.or.kr/info/licenseTypeEn.do" target="_blank" rel="noopener noreferrer">Условия KOGL ↗</a>'+
  (state==='fail'?'<button class="happy-button" data-kfct-retry>Повторить загрузку</button>':'');
}
function infoHTML(f){
 if(!owns(f))return '';
 var n=f.names||{},i=f.sourceInfo||{},g=i.group||{};
 return '<section class="happy-card mc-catalog-info"><span class="mc-source-tag">'+TITLE+'</span><dl class="mc-names">'+
  [['Русский','ru'],['English','en'],['한국어','ko']].map(function(x){return '<div><dt>'+x[0]+'</dt><dd lang="'+x[1]+'">'+esc(n[x[1]]||'—')+'</dd></div>'}).join('')+'</dl>'+
  (g.ru?'<p class="happy-note">Группа: '+esc(g.ru)+'.'+(i.scientificName?' '+esc(i.scientificName)+'.':'')+'</p>':'')+
  '<p class="happy-note">'+esc(f.sourceNotes||'На 100 г съедобной части.')+'</p>'+
  '<a href="https://www.nics.go.kr/food/kfi/fct/fctIntro/list" target="_blank" rel="noopener noreferrer">Таблица KFCT ↗</a></section>';
}
function footer(f){return owns(f)?'KFCT 10.4 · RDA / NICS, Корея (2025)':null}
root.MealKfct={ingest:ingest,append:append,load:load,owns:owns,infoHTML:infoHTML,footer:footer,settingsHTML:settingsHTML,status:function(){return state},
 count:function(){return list.length},food:function(id){return foods[id]||null},MAP:MAP,OWN:OWN};
if(root.document){root.document.addEventListener('click',function(ev){if(ev.target.closest('[data-kfct-retry]'))load(true)});load()}
})(typeof window!=='undefined'?window:globalThis);
