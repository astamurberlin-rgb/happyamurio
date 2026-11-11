(function(root){
  'use strict';
  const H=root.HappyFoodCounters;
  let engine,baseSave,baseline={},definitions={},applying=false,dialog=null,draft=null;
  const $=id=>document.getElementById(id),esc=x=>root.escH(x),clone=H.copy;
  function owner(){return root.HappyProfile?root.HappyProfile.owner:(root.CL.s&&root.CL.s.uid||'local')}
  function currentOwner(){return root.CL.s&&root.CL.s.uid||'local'}
  function ready(c){const f=c&&root.FOODS[c.fid];return !!(f&&Number(c.q)>0&&c.u&&(c.g>0||c.u==='г'||f.por&&f.por[c.u]>0)&&(c.libraryConfirmed||f.b||f.composition||root.BASE.some(r=>r[0]===c.fid)||[f.k,f.p,f.f,f.c].some(x=>x>0)))}
  function foodSnapshot(fid){const f=clone(root.FOODS[fid]);f.counterValues=f.counterValues||{};
    if(root.BLS&&root.BLS.keys&&f.b)root.BLS.keys.forEach(k=>{f.counterValues[k]=root.blsVal(f.b,k)});
    if(root.MealProducts&&root.MealReport)root.MealReport.fields().forEach(k=>{f.counterValues[k.key]=root.MealProducts.value(f,k.key,root.blsVal)});
    Object.assign(f.counterValues,{kcal:f.k,prot:f.p,fat:f.f,carb:f.c});return f;
  }
  /* Meal 29: продукт-добавка (supplement-counters.js) с более новой версией состава заменяет прежнюю копию */
  function rememberFood(f){const old=root.FOODS[f.id];
    if(old){const s=f.supplement,o=old.supplement;if(!s||!o||(Number(s.revision)||0)<=(Number(o.revision)||0))return;
      const i=root.DB.foods.findIndex(x=>x.id===f.id);if(i<0)return;const food=clone(f);food.w=food.w||[];food.por=food.por||{};root.DB.foods[i]=food;root.rebuildLib();return}
    const food=clone(f);food.w=food.w||root.norm(food.n).split(/\s+/);food.por=food.por||{};
    root.DB.foods.push(food);root.rebuildLib();}
  const SUP=()=>root.MealSupplementCounters;
  /* порция добавки: снимок продукта-добавки — из общего описания счётчика или из самого счётчика */
  function supplementFood(c){if(!c)return null;const d=c.mealCounterId&&definitions[c.mealCounterId],f=d&&d.food&&d.food.id===c.fid?d.food:c.food&&c.food.id===c.fid?c.food:root.FOODS[c.fid];return f&&f.supplement?f:null}
  function values(){const out={};Object.keys(root.DB.days).forEach(date=>(root.DB.days[date].items||[]).forEach(item=>{
    const c=root.DB.taps.find(c=>c.k===item.tap&&c.mealCounterId);
    if(c&&!item.counterEventId)item.counterEventId='serving:'+c.mealCounterId+':'+date+':'+item.id;
    if(!item.counterEventId)return;if(item.counterFood&&item.counterFood.id!==item.fid)item.counterFood=root.FOODS[item.fid]?foodSnapshot(item.fid):undefined;
    const old=baseline[item.counterEventId],cid=c?c.mealCounterId:old&&old.cid;
    if(!cid)return;const payload=clone(item);delete payload.id;delete payload.tap;delete payload.counterEventId;
    out[item.counterEventId]={id:item.counterEventId,cid,date,item:payload};
  }));return out;}
  function strip(x){const y=clone(x);delete y.rev;delete y.writer;return y}
  function capture(){
    if(applying||!engine)return;
    const now=values();Object.keys(now).forEach(id=>{if(!H.same(now[id],baseline[id]))engine.update('events',now[id])});
    Object.keys(baseline).forEach(id=>{if(!now[id])engine.update('events',{id,cid:baseline[id].cid,date:baseline[id].date,deleted:true})});
    const present=new Set(root.DB.taps.filter(c=>c.mealCounterId).map(c=>c.mealCounterId));
    Object.keys(definitions).forEach(id=>{if(!present.has(id))engine.update('definitions',{...definitions[id],deleted:true})});
    baseline=clone(now);for(const id of Object.keys(definitions))if(!present.has(id))delete definitions[id];
    root.DB.mealCounters=engine.document();
  }
  function apply(doc){
    if(root.bkBusy)return;
    applying=true;
    try{
      const active=doc.definitions.filter(d=>!d.deleted),ids=new Set(doc.definitions.map(d=>d.id));
      root.DB.taps=root.DB.taps.filter(c=>!c.mealCounterId||!ids.has(c.mealCounterId)||active.some(d=>d.id===c.mealCounterId));
      definitions={};active.forEach(d=>{
        // Update 24: one button per shared counter. If the journal merge brought a second tap with the
        // same mealCounterId (p… from this device, shared-… created before the journal arrived), keep the
        // first and move the others' servings to it, otherwise portions split across two rows.
        const same=root.DB.taps.filter(c=>c.mealCounterId===d.id);
        if(same.length>1){const keep=same[0];same.slice(1).forEach(extra=>{Object.values(root.DB.days).forEach(day=>(day.items||[]).forEach(item=>{if(item.tap===extra.k)item.tap=keep.k}));root.DB.taps.splice(root.DB.taps.indexOf(extra),1)});}
        let c=root.DB.taps.find(c=>c.mealCounterId===d.id);if(!c){c={k:'shared-'+d.id};root.DB.taps.push(c)}
        Object.assign(c,{t:d.title,fid:d.fid,q:d.q,u:d.u,g:d.g,mealCounterId:d.id,libraryConfirmed:true});rememberFood(d.food);definitions[d.id]=strip(d);
        // Meal 29: у добавки меры свои (из «Мои добавки»), в «свои меры» продукта они не записываются
        root.DB.units=root.DB.units||{};if(d.u!=='г'&&!(d.food&&d.food.supplement)){root.DB.units[d.fid]=root.DB.units[d.fid]||{};root.DB.units[d.fid][d.u]=d.g/d.q;root.porFix(root.FOODS[d.fid])}
      });
      const preferred=e=>root.MealJournal&&root.MealJournal.preferJournal(e.id,e.rev);
      const known=new Set(doc.events.filter(e=>!preferred(e)).map(e=>e.id));
      Object.values(root.DB.days).forEach(day=>{day.items=(day.items||[]).filter(item=>!known.has(item.counterEventId))});
      doc.events.filter(e=>!e.deleted&&!preferred(e)).sort((a,b)=>(a.created||a.rev)-(b.created||b.rev)||a.id.localeCompare(b.id)).forEach(e=>{
        const c=root.DB.taps.find(c=>c.mealCounterId===e.cid),item=clone(e.item);if(item.counterFood)rememberFood(item.counterFood);
        const d=root.DB.days[e.date]||(root.DB.days[e.date]={items:[]});d.items=d.items||[];
        // Linking existing servings supplies their original IDs, so no copy is added.
        const existing=d.items.find(x=>x.id===item.originId&&(!c||x.tap===c.k));
        if(existing)d.items.splice(d.items.indexOf(existing),1);
        delete item.originId;item.id=e.id;item.counterEventId=e.id;item.tap=c?c.k:'shared-'+e.cid;
        if(!root.sec(item.sec))item.sec=root.DB.sections.find(s=>s.k==='sn')?.k||root.DB.sections[0].k;
        d.items.push(item);
      });
      root.DB.mealCounters=clone(doc);baseline=values();baseSave();
      if(root.renderAll)root.renderAll();
    }finally{applying=false}
  }
  function status(s){const n=$('foodCounterStatus');if(n)n.textContent=s}
  function init(){
    baseSave=root.save;root.save=function(){try{capture()}catch(e){root.toast(e.message)}baseSave()};
    root.editTap=edit;
    root.tapAdd=function(k){const c=root.tapDef(k);if(!ready(c)){edit(root.DB.taps.indexOf(c));return}
      const g=c.g||root.gramsFor(c.fid,c.q,c.u),item={id:'i'+H.id(),sec:root.autoSec(),fid:c.fid,q:c.q,u:c.u,g,t:root.curDate===root.todayISO()?root.nowHM():null,tap:k};
      if(c.mealCounterId){item.counterEventId='serving:'+H.id();item.counterFood=clone(definitions[c.mealCounterId]?.food||foodSnapshot(c.fid))}
      else{const sf=supplementFood(c);if(sf)item.counterFood=clone(sf)}   // Meal 29: состав добавки — в самой записи
      root.day(root.curDate).items.push(item);root.save();root.renderDay();root.toast(c.t+' +'+root.portTxt(c));
    };
    const oldTaps=root.tapsHTML;root.tapsHTML=function(){let html=oldTaps();root.DB.taps.forEach(c=>{const before='<button class="tpNm" data-tinfo="'+esc(c.k)+'"><b>'+esc(c.t)+'</b><small>'+esc(root.portTxt(c))+'</small>';const note=ready(c)?root.portTxt(c):'Выбрать продукт';/* Update 25: без «· Day · Sport» — связь видна в редактировании счётчика */html=html.replace(before,'<button class="tpNm" data-tinfo="'+esc(c.k)+'"><b>'+esc(c.t)+'</b><small>'+esc(note)+'</small>')});return html+'<p class="happy-note food-counter-status" id="foodCounterStatus" role="status">'+esc(engine?engine.status():'')+'</p>'};
    document.getElementById('mlTaps').addEventListener('click',e=>{const b=e.target.closest('[data-tinfo]');if(!b)return;e.stopImmediatePropagation();edit(root.DB.taps.findIndex(c=>c.k===b.dataset.tinfo))},true);
    try{engine=H.create({owner:owner(),currentOwner,backup:root.DB.mealCounters,apply,capture,status,online:root.clOn,
      get:()=>H.transport().get(),put:(...a)=>H.transport().put(...a)});}catch(e){root.toast(e.message)}
    const after=root.clAfterIn;root.clAfterIn=function(){if(engine)engine.sync();return after&&after()};
    const oldRebuild=root.rebuildLib;root.rebuildLib=function(){oldRebuild();if(dialog&&!dialog.hidden&&draft&&!draft.fid)results()};
    document.addEventListener('happy-supplements-changed',()=>{if(dialog&&!dialog.hidden&&draft&&!draft.fid)results()});
  }
  function ensure(){if(dialog)return;dialog=document.createElement('section');dialog.id='foodCounterEditor';dialog.className='food-counter-editor';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','fcTitle');document.body.appendChild(dialog);
    dialog.addEventListener('click',e=>{const b=e.target.closest('[data-fc]');if(!b)return;const act=b.dataset.fc;
      if(act==='close')close();if(act==='choose'){const f=draft.results.find(f=>f.id===b.dataset.id);if(!f)return;draft.fid=f.id;draft.food=clone(f);
        if(f.supplement){const s=f.supplement,u=SUP().units(f)[0]||'г';draft.u=u;draft.q=u===s.basis.unit&&(u==='г'||u==='мл')?s.basis.quantity:u==='г'?Math.round(s.basis.quantity*s.unitGrams*1000)/1000:1}
        else{draft.q=f.por&&Object.keys(f.por).length?1:100;draft.u=root.defUnit(f)}draft.title=f.n;render();}
      if(act==='change'){draft.fid=null;render()}
      if(act==='save')commit();
      if(act==='plus'||act==='minus'){let q=Number($('fcQuantity').value.replace(',','.'))||0;const u=$('fcUnit').value,step=draft.food&&draft.food.supplement?(u==='г'||u==='мл'?(q<20?1:5):1):u==='г'?(q<50?5:10):(q<2||['ст. л.','ч. л.','стакан','чашка'].includes(u)?.5:1);$('fcQuantity').value=Math.min(100000,Math.max(step,Math.round((q+(act==='plus'?step:-step))*1000)/1000));preview();}
      if(act==='unit'||act==='custom'){
        const u=act==='custom'?'__custom':b.dataset.unit;let mass;try{mass=portion().g}catch{};
        $('fcUnit').value=u;draft.u=u;$('fcCustom').hidden=u!=='__custom';
        if(u==='г')$('fcQuantity').value=mass?Math.round(mass*1000)/1000:100;else $('fcQuantity').value=1;
        dialog.querySelectorAll('[data-fc="unit"],[data-fc="custom"]').forEach(x=>{const on=x===b;x.classList.toggle('on',on);if(x.dataset.fc==='unit')x.setAttribute('aria-pressed',String(on));else x.setAttribute('aria-expanded',String(on))});preview();
        if(u==='__custom')$('fcPortionName').focus();
      }
    });
    dialog.addEventListener('input',e=>{if(e.target.id==='fcSearch'){draft.query=e.target.value;results();return}if(['fcQuantity','fcUnit','fcPortionName','fcPortionGrams','fcName'].includes(e.target.id))preview()});
    dialog.addEventListener('change',e=>{if(e.target.id==='fcUnit'){draft.u=e.target.value;const box=$('fcCustom');if(box)box.hidden=draft.u!=='__custom';preview()}});
    dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const nodes=[...dialog.querySelectorAll('button,input,select,a[href]')].filter(x=>!x.disabled&&x.getClientRects().length),i=nodes.indexOf(document.activeElement);if((e.shiftKey&&i<=0)||(!e.shiftKey&&i===nodes.length-1)){e.preventDefault();nodes[e.shiftKey?nodes.length-1:0].focus()}}});
  }
  function edit(i){ensure();const c=root.DB.taps[i],ok=ready(c);draft={key:c&&c.k,index:i,fid:ok?c.fid:null,food:ok?clone(supplementFood(c)||root.FOODS[c.fid]):null,title:c?c.t:'',q:c?c.q:1,u:c?c.u:'г',query:'',prior:document.activeElement};dialog.hidden=false;
    draft.outside=[...document.body.children].filter(n=>n!==dialog).map(n=>{const prev=n.inert;n.inert=true;return[n,prev]});document.body.classList.add('food-counter-open');render();
  }
  function close(){if(!draft)return;const prior=draft.prior;draft.outside.forEach(([n,prev])=>n.inert=prev);dialog.hidden=true;draft=null;document.body.classList.remove('food-counter-open');if(prior&&document.contains(prior))prior.focus()}
  /* Meal 29: счётчик добавки — меры из «Мои добавки», условные граммы не показываются */
  function supplementBody(d,f){const S=SUP(),s=f.supplement,units=S.units(f,d.u),num=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);
    const note=s.variantId?(S.newer(f)?'Состав этой добавки изменился в «Мои добавки». Сохрани счётчик — новые порции посчитаются по новому составу.':'Добавка из «Мои добавки». Состав и меры правятся там.'):'Оценочный пример состава из каталога БАДов. При создании счётчика добавка сохранится в «Мои добавки» — там её можно поправить под свою упаковку.';
    return '<div class="happy-card"><h3>'+esc(f.n)+'</h3><p class="happy-note">'+esc(note)+'</p><button class="happy-button" data-fc="change">Выбрать другой продукт</button></div><label>Название счётчика<input class="happy-input" id="fcName" maxlength="100" value="'+esc(d.title)+'"></label>'+
      '<div class="mlW fc-quantity"><div class="tpStp"><button type="button" data-fc="minus" aria-label="Уменьшить количество">−</button><label class="v"><span class="mlQtyMain"><input id="fcQuantity" type="text" inputmode="decimal" value="'+esc(d.q)+'" aria-label="Количество"><i id="fcQuantityUnit">'+esc(S.unitWord(d.q,d.u))+'</i></span><small class="mlInlineEq" id="fcQuantityGrams"></small></label><button type="button" data-fc="plus" aria-label="Увеличить количество">+</button></div></div>'+
      '<input type="hidden" id="fcUnit" value="'+esc(d.u)+'"><div class="mlUnits fc-units" role="group" aria-label="Мера">'+units.map(u=>'<button type="button" class="chip'+(u===d.u?' on':'')+'" data-fc="unit" data-unit="'+esc(u)+'" aria-pressed="'+(u===d.u)+'">'+(u==='г'?'Граммы':esc(u)+(s.massUnknown||!(f.por[u]>0)?'':' <small>'+num(f.por[u])+' г</small>'))+'</button>').join('')+'</div>'+
      '<div class="fc-grid" id="fcCustom" hidden><input type="hidden" id="fcPortionName"><input type="hidden" id="fcPortionGrams"></div><p id="fcPreview" class="happy-note"></p>';
  }
  function render(){const d=draft,f=d.food,c=root.DB.taps.find(c=>c.k===d.key);
    dialog.innerHTML='<div class="fc-shell"><header><h2 id="fcTitle">'+(c?'Счётчик':'Новый счётчик')+'</h2><button class="happy-button" data-fc="close">Закрыть</button></header>'+
      (!d.fid?'<label>Продукт или добавка<input class="happy-input" id="fcSearch" type="search" autocomplete="off" placeholder="Название продукта или добавки" value="'+esc(d.query)+'"></label>'+(c?'<p class="happy-note">Выбери точный продукт для этого счётчика. Прежние записи сохранятся.</p>':'')+'<div id="fcResults"></div>':f&&f.supplement?supplementBody(d,f):
      '<div class="happy-card"><h3>'+esc(f.n)+'</h3><button class="happy-button" data-fc="change">Выбрать другой продукт</button></div><label>Название счётчика<input class="happy-input" id="fcName" maxlength="100" value="'+esc(d.title)+'"></label><div class="mlW fc-quantity"><div class="tpStp"><button type="button" data-fc="minus" aria-label="Уменьшить количество">−</button><label class="v"><span class="mlQtyMain"><input id="fcQuantity" type="text" inputmode="decimal" value="'+esc(d.q)+'" aria-label="Количество"><i id="fcQuantityUnit">'+esc(d.u)+'</i></span><small class="mlInlineEq" id="fcQuantityGrams"></small></label><button type="button" data-fc="plus" aria-label="Увеличить количество">+</button></div></div><input type="hidden" id="fcUnit" value="'+esc(d.u)+'"><div class="mlUnits fc-units" role="group" aria-label="Вес или порция">'+root.unitList(f,d.u).map(u=>'<button type="button" class="chip'+(u===d.u?' on':'')+'" data-fc="unit" data-unit="'+esc(u)+'" aria-pressed="'+(u===d.u)+'">'+(u==='г'?'Граммы':esc(root.unitName(f,u))+' <small>'+root.unitWeightLabel(f,u)+' г</small>')+'</button>').join('')+'<button type="button" class="chip add" data-fc="custom" aria-expanded="false">+ Добавить свою</button></div>'+(root.MealPortions&&root.MealPortions.note(f)?'<p class="happy-note">'+esc(root.MealPortions.note(f))+'</p>':'')+'<div class="fc-grid" id="fcCustom" hidden><label>Название порции<input class="happy-input" id="fcPortionName" maxlength="40" placeholder="Моя чашка"></label><label>Масса одной порции, г<input class="happy-input" id="fcPortionGrams" inputmode="decimal" placeholder="Например, 200"></label></div><p id="fcPreview" class="happy-note"></p>')+
      (d.fid?'<div class="happy-card"><h3>Синхронизация счётчика</h3>'+['day','sport'].map(a=>'<label class="fc-sync-row"><span>Happy '+(a==='day'?'Day':'Sport')+'</span><input type="checkbox" role="switch" id="fcSync-'+a+'"'+(H.linked(definitions[c&&c.mealCounterId],a)?' checked':'')+'></label>').join('')+'<p class="happy-note">Выключи связь, чтобы скрыть счётчик в выбранном приложении. Записанные порции сохранятся.</p></div>':'')+
      '<p id="fcError" class="happy-note happy-error" role="status"></p><footer class="fc-actions"><button class="happy-button primary" data-fc="save"'+(!d.fid?' disabled':'')+'>'+(c?'Сохранить':'Создать')+'</button></footer><p class="happy-note">Для связи между приложениями войди в один аккаунт Happy. Нажатия будут общими.</p></div>';
    if(!d.fid){results();$('fcSearch').focus()}else{preview();$('fcQuantity').focus()}
  }
  function results(){if(!draft||draft.fid||!$('fcResults'))return;const S=SUP(),sup=S?S.search(draft.query):[];draft.results=sup.concat(root.searchLib(draft.query).slice(0,35-sup.length));   // Meal 29: и свои добавки
    $('fcResults').innerHTML=draft.results.map(f=>'<button class="fc-result" data-fc="choose" data-id="'+esc(f.id)+'"><b>'+esc(f.n)+'</b><small>'+(f.supplement?esc(S.resultNote(f)):f.k==null?'Калорийность не указана':Math.round(f.k)+' ккал / 100 г')+'</small></button>').join('')||'<p class="happy-note">Не найдено. Уточни название или сначала создай свой продукт в библиотеке или добавку в «Мои добавки».</p>';
    if(root.BLS_ST==='loading')$('fcResults').innerHTML+='<p class="happy-note">Библиотека загружается…</p>';
  }
  function portion(){const q=Number($('fcQuantity').value.replace(',','.')),u=$('fcUnit').value,custom=u==='__custom',unit=custom?$('fcPortionName').value.trim():u,per=custom?Number($('fcPortionGrams').value.replace(',','.')):u==='г'?1:root.unitG(draft.food,u);
    if(!Number.isFinite(q)||q<=0||q>100000||!Number.isFinite(per)||per<=0||!unit||(custom&&unit==='г'))throw new Error('Укажи положительное количество, название и массу порции.');
    const g=Math.round(q*per*1000)/1000;if(g<=0||g>1000000)throw new Error('Проверь массу порции.');return {q,u:unit,g,custom,per};
  }
  function preview(){if(!draft||!draft.fid)return;try{
    if(draft.food.supplement){const S=SUP(),s=draft.food.supplement,p=portion(),k=draft.food.k,num=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);
      $('fcQuantityUnit').textContent=S.unitWord(p.q,p.u);$('fcQuantityGrams').textContent=p.u==='г'||s.massUnknown?'':'= '+num(p.g)+' г';$('fcQuantity').style.width=root.qtyW($('fcQuantity').value);
      $('fcPreview').textContent=S.counterLabel(draft.food,p.q,p.u,p.g)+' · '+(k==null?'калорийность не указана':num(Math.round(k*p.g/10)/10)+' ккал');$('fcError').textContent='';return}
    const p=portion(),k=draft.food.k;$('fcQuantityUnit').textContent=p.custom?p.u:root.uLab(draft.fid,p.q,p.u);$('fcQuantityGrams').textContent=p.u==='г'?'':'= '+new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(p.g)+' г';$('fcQuantity').style.width=root.qtyW($('fcQuantity').value);$('fcPreview').textContent=p.q+' '+p.u+' = '+p.g+' г'+(k==null?'':' · '+Math.round(k*p.g/100)+' ккал');$('fcError').textContent=''}catch(e){$('fcPreview').textContent='';$('fcQuantityGrams').textContent='';$('fcQuantityUnit').textContent=$('fcUnit').value==='__custom'?($('fcPortionName').value||'порция'):$('fcUnit').value;$('fcError').textContent=e.message}}
  async function commit(){const d=draft,button=dialog.querySelector('[data-fc="save"]');try{
    const targets={day:!!$('fcSync-day')?.checked,sport:!!$('fcSync-sport')?.checked},link=targets.day||targets.sport;
    let p=portion();const title=$('fcName').value.trim();if(!title)throw new Error('Укажи название счётчика.');
    const taken=c=>root.nameTaken(root.DB.taps,title,c?root.DB.taps.indexOf(c):undefined);
    let c=root.DB.taps.find(c=>c.k===d.key);if(taken(c))throw new Error('Счётчик с таким названием уже есть.');
    if((link||c&&c.mealCounterId)&&!engine)throw new Error('Связь со счётчиками пока недоступна. Перезагрузи приложение.');
    let f;
    if(d.food&&d.food.supplement){
      // Meal 29: добавка — свежий вариант из «Мои добавки» (шаблон каталога сначала сохраняется туда)
      const S=SUP();if(!S)throw new Error('Добавки ещё загружаются. Попробуй ещё раз.');
      if(button)button.disabled=true;try{f=await S.resolve(d.food)}finally{if(button)button.disabled=false}
      if(draft!==d)return;
      const per=p.u==='г'?(f.supplement.massUnknown?0:1):f.por&&f.por[p.u];if(!(per>0))throw new Error('Мера «'+p.u+'» изменилась в «Мои добавки». Выбери её снова.');
      p={q:p.q,u:p.u,g:Math.round(p.q*per*1000)/1000,custom:false,per};rememberFood(f);
      c=root.DB.taps.find(c=>c.k===d.key);if(taken(c))throw new Error('Счётчик с таким названием уже есть.');
    }else{f=root.FOODS[d.fid]||root.blsUse(d.fid);if(!f)throw new Error('Продукт не загрузился. Выбери его снова.')}
    if(p.custom){root.DB.units[f.id]=root.DB.units[f.id]||{};root.DB.units[f.id][p.u]=p.per;root.porFix(f)}
    if(!c){c={k:'p'+H.id()};root.DB.taps.push(c)}Object.assign(c,{t:title,fid:f.id,q:p.q,u:p.u,g:p.g,libraryConfirmed:true});
    if(f.supplement)c.food=clone(f);else delete c.food;
    if(link||c.mealCounterId){if(!c.mealCounterId)c.mealCounterId=H.id();
      const def={id:c.mealCounterId,title:c.t,fid:c.fid,q:c.q,u:c.u,g:c.g,food:f.supplement?clone(f):foodSnapshot(c.fid),targets};
      if(f.supplement)def.portionText=SUP().counterLabel(f,c.q,c.u,c.g);   // Day 57.7 и Sport 40.5 показывают её вместо «q u · g г»
      engine.update('definitions',def);definitions[def.id]=def;
      Object.keys(root.DB.days).forEach(date=>(root.DB.days[date].items||[]).filter(x=>x.tap===c.k).forEach(x=>{if(!x.counterEventId)x.originId=x.id;if(!x.counterFood&&root.FOODS[x.fid])x.counterFood=foodSnapshot(x.fid)}));
    }
    root.save();if(engine)apply(engine.document());const shared=!!c.mealCounterId;close();root.renderAll();root.toast(shared?'Счётчик сохранён · связь обновляется':'Счётчик сохранён');if(engine)engine.sync();
  }catch(e){if(draft===d&&$('fcError'))$('fcError').textContent=e.message}}
  root.HappyMealCounters={init,edit,ready,capture,apply};
})(globalThis);
