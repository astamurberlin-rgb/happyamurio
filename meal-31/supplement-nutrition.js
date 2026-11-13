/* Read-only nutrition projection. Intake snapshots are never rewritten (H068, прототип Михалыча и Астамура).
   Meal 29: снимки приёмов — в документе аккаунта (supplements-store.js). У строки приёма — правило приёма пищи
   (решение Астамура 11.11.2026): energy — калории приёма (нет на этикетке — по БЖУ: 4·Б + 9·Ж + 4·У, только для
   правила, не в итоги); с Meal 30 opensMeal и breaksFast — одно: «Сбрасывает окно голодания?» (Астамур 12.11):
   своё true / false из варианта, иначе — больше 4 ккал за приём, для любой формы. */
(function(root){'use strict';
  function finite(n){return typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;}
  function dateOK(d){var n=new Date(d+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(d||'')&&Number.isFinite(n.getTime())&&n.toISOString().slice(0,10)===d;}
  /* Meal 29: только приёмы периода — копия всех приёмов на каждую строку дня за год записей стала бы заметной */
  function entries(range){return root.HappySupplements&&root.HappySupplements.getEntries?root.HappySupplements.getEntries(range||null):[];}
  function variants(){return root.HappySupplements&&root.HappySupplements.getVariants?root.HappySupplements.getVariants():[];}
  function inRange(d,r){return dateOK(d)&&(!r||d>=r.a&&d<=r.b);}
  var PILL=/капсул|таблет|драже|пастил|леденц|мармелад/i;
  function pill(unit){return PILL.test(String(unit||''));}
  function mealRule(snapshot,values){
    var kcal=finite(values.kcal),p=finite(values.prot),f=finite(values.fat),c=finite(values.carb);
    var energy=kcal!==null?kcal:p===null&&f===null&&c===null?null:4*(p||0)+9*(f||0)+4*(c||0);
    var basis=snapshot&&snapshot.basis||{},own=snapshot&&typeof snapshot.opensMeal==='boolean'?snapshot.opensMeal:null;
    var breaks=energy!==null&&energy>4;
    var opens=own!==null?own:breaks;   // Meal 30: «Сбрасывает окно голодания?» — Да / Нет / по умолчанию больше 4 ккал, для любой формы
    return {energy:energy,breaksFast:opens,opensMeal:opens,pill:pill(basis.unit)};
  }
  function nutritionRows(range,list,fields,sections){
    var names={},fs=fields||root.HappySubstances&&root.HappySubstances.fields||[];
    (sections||root.DB&&root.DB.sections||[]).forEach(function(s){names[s.k]=s.t;});
    return (list||entries(range)).filter(function(e){return inRange(e.date,range);}).map(function(e,index){
      var p=e.portion||{},cs=Array.isArray(p.components)?p.components:[],mapped=root.HappySubstances?root.HappySubstances.values(cs):{values:{},statuses:{},unmapped:cs,issues:[]},values={},statuses={};
      fs.forEach(function(f){values[f.key]=finite(mapped.values[f.key]);statuses[f.key]=mapped.statuses[f.key]||'missing';});
      Object.keys(mapped.values).forEach(function(k){values[k]=finite(mapped.values[k]);statuses[k]=mapped.statuses[k];});
      var rule=mealRule(e.snapshot,values);
      return {energy:rule.energy,breaksFast:rule.breaksFast,opensMeal:rule.opensMeal,pill:rule.pill,kind:'supplement',date:e.date,section:names[e.section]||e.section||'Без раздела',sectionKey:e.section||'',id:e.id||'',foodId:e.variantId||'',name:e.name||'Добавка',grams:finite(p.grams),quantity:finite(p.quantity),unit:p.measure||'',time:/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time||'')?e.time:'',manual:!!e.time&&e.timeSource!=='added',source:e.source||'Этикетка добавки · источник не указан',nutrientSource:'Сохранённый состав добавки · версия '+(e.variantRevision||0),code:'',values:values,statuses:statuses,components:cs.map(function(c){return Object.assign({},c);}),unmapped:mapped.unmapped.map(function(c){return Object.assign({},c);}),issues:mapped.issues.slice(),index:index};
    }).sort(function(a,b){return a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')||a.index-b.index;});
  }
  function dayRows(date,section){return nutritionRows({a:date,b:date}).filter(function(r){return section===undefined||r.sectionKey===(section||'');});}
  function coverage(rows,key,base){var c={known:base&&base.known||0,missing:base&&base.missing||0};(rows||[]).forEach(function(r){if(finite(r.values[key])===null)c.missing++;else c.known++;});return c;}
  function totals(rows){var out={k:0,p:0,f:0,c:0,fib:0},keys={k:'kcal',p:'prot',f:'fat',c:'carb',fib:'fib'};Object.keys(keys).forEach(function(k){(rows||[]).forEach(function(r){out[k]+=finite(r.values[keys[k]])||0;});});return out;}
  function customKey(c,variantId,index){
    if(c.substanceId)return null;
    if(c.customId)return String(c.customId);
    // Legacy identity belongs to a variant component, never to a matching name.
    return variantId?'legacy:'+variantId+':'+(c.id||'component-'+index):null;
  }
  function convertCustom(n,from,to){var weights={'г':1,'мг':.001,'мкг':.000001};n=finite(n);if(n===null)return null;if(from===to)return n;return weights[from]&&weights[to]?n*weights[from]/weights[to]:null;}
  function customTotals(range,list,saved){
    var groups=Object.create(null),all=list||entries(),own=saved||variants();
    function register(c,variantId,index,source){var key=customKey(c,variantId,index);if(!key)return null;if(!groups[key])groups[key]={id:key,name:c.name||'Своё вещество',unit:c.unit||'',value:null,known:0,missing:0,conflicts:0,entries:0,legacy:key.indexOf('legacy:')===0,origins:[]};var g=groups[key];if(source&&g.origins.indexOf(source)<0)g.origins.push(source);return g;}
    // Current variant titles/units are presentation only; quantities always come from intake snapshots.
    own.forEach(function(v){(v.components||[]).forEach(function(c,i){register(c,v.id,i,v.name||'Сохранённый вариант');});});
    all.forEach(function(e){((e.portion||{}).components||[]).forEach(function(c,i){register(c,e.variantId||'entry:'+e.id,i,e.name||'Сохранённый приём');});});
    all.filter(function(e){return inRange(e.date,range);}).forEach(function(e){
      var seen=Object.create(null);
      ((e.portion||{}).components||[]).forEach(function(c,i){var g=register(c,e.variantId||'entry:'+e.id,i,e.name||'Сохранённый приём');if(g)(seen[g.id]||(seen[g.id]=[])).push(c);});
      Object.keys(seen).forEach(function(key){var g=groups[key],cs=seen[key];g.entries++;if(cs.length!==1){g.conflicts++;return;}var c=cs[0],n=convertCustom(c.amount,c.unit,g.unit);if(n===null){if(finite(c.amount)!==null)g.conflicts++;else g.missing++;return;}g.value=(g.value||0)+n;g.known++;});
    });
    return Object.keys(groups).map(function(k){var g=groups[k];g.status=g.conflicts?'conflict':g.known?'value':'missing';return g;});
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  /* Meal 29: порции со счётчиков добавок — записи еды с продуктом-добавкой (supplement-counters.js); свои вещества
     их состава тоже идут в «Созданные мной». Стандартные вещества они дают через запись еды — здесь не считаются. */
  function counterEntries(){return root.MealSupplementCounters&&root.MealSupplementCounters.entries?root.MealSupplementCounters.entries():[];}
/* Meal 30 (Астамур 12.11 10:14): «Мои микроэлементы» — своя рамка внизу журнала; строка как остальные показатели
     журнала: смахнуть влево — звёздочка, отмеченное появляется в «Избранном» (id custom:<ключ>). */
  function customAll(range){return customTotals(range,entries().concat(counterEntries()));}
  function customRowHTML(g,days,ctx,fav){var id='custom:'+g.id,key=ctx+':'+id,note=g.conflicts?'есть конфликт значений или единиц':g.missing&&g.value!==null?'часть значений неизвестна':'';
    var value=g.value===null?'—':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3}).format(g.value/(days||1))+' '+g.unit;
    var star=typeof root.jrStarSvg==='function'?root.jrStarSvg(fav,'jrSi'):'★';
    return '<div class="jrSw" data-sw="'+esc(key)+'"><button class="jrStar'+(fav?' on':'')+'" data-star="'+esc(id)+'" aria-label="'+(fav?'Убрать из избранного':'В избранное')+': '+esc(g.name)+'">'+star+'</button><div class="jrRow"><div class="jrR1"><span class="jrN">'+esc(g.name)+'</span><span class="jrVR"><b class="jrV">'+esc(value)+'</b></span></div>'+(note?'<p class="jrMiss">'+esc(note)+'</p>':'')+'</div></div>';}
  function isFav(id){return typeof root.jrIsFav==='function'&&root.jrIsFav(id);}
  function customGroupHTML(range,days){var list=customAll(range);if(!list.length)return '';return '<section class="card jrList jrMyMicro" data-supplement-custom><div class="jrGh"><span>Мои микроэлементы</span></div><div class="jrGb">'+list.map(function(g){return customRowHTML(g,days,'own',isFav('custom:'+g.id));}).join('')+'</div></section>';}
  function customFavHTML(id,range,days){var key=String(id).slice(7),g=customAll(range).filter(function(x){return x.id===key;})[0];return g?customRowHTML(g,days,'fav',true):'';}
  function customTitle(id){var key=String(id).slice(7),g=customAll(null).filter(function(x){return x.id===key;})[0];return g?g.name:'Свой показатель';}
  function extendJournal(){
    if(!root.JR_N||!root.HappySubstances)return;
    root.HappySubstances.fields.forEach(function(f){
      if(f.group==='main'||f.key==='fib')return;
      if(!root.JR_N[f.key])root.JR_N[f.key]={id:f.key,t:f.title,u:f.unit,rec:null};
      if(!root.JR_BLS[f.key])root.JR_BLS[f.key]=f.key;
      var group=root.JR_GROUPS.find(function(g){return g.k===f.group;});if(group&&!group.rows.includes(f.key))group.rows.push(f.key);
    });
    // Presentation only: parent, its known constituents, then a two-acid subtotal.
    // Canonical IDs, units, goals and all stored values remain unchanged.
    var omega=['n3','ala3','epa','dpa','dha','epadha'],fat=root.JR_GROUPS.find(function(g){return g.k==='fat';});
    var titles={n3:'Омега-3, всего',ala3:'ALA · альфа-линоленовая',epa:'EPA · ЭПК',dpa:'DPA · ДПК',dha:'DHA · ДГК',epadha:'EPA + DHA · ЭПК + ДГК'};
    omega.forEach(function(id){if(root.JR_N[id])root.JR_N[id].t=titles[id];});
    if(fat){var at=fat.rows.findIndex(function(id){return omega.includes(id);}),rest=fat.rows.filter(function(id){return !omega.includes(id);});rest.splice(at<0?rest.length:at,0,...omega);fat.rows=rest;}
  }
  var api={nutritionRows:nutritionRows,dayRows:dayRows,coverage:coverage,totals:totals,customTotals:customTotals,customGroupHTML:customGroupHTML,customFavHTML:customFavHTML,customTitle:customTitle,mealRule:mealRule,pill:pill};root.HappySupplementNutrition=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  extendJournal();
  if(root.document)root.document.addEventListener('happy-supplements-changed',function(){
    if(root.renderDay)root.renderDay();if(root.SECK&&root.renderSec)root.renderSec();if(root.renderJournal)root.renderJournal();
  });
})(typeof globalThis!=='undefined'?globalThis:this);
