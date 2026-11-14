/* Meal 32 · счётчики еды.
   Счётчик (название, продукт, порция) принадлежит Meal и лежит в его дневнике (DB.taps). Счётчик, которому в окне
   включён показ в Happy Day или Happy Sport, Meal кладёт в свою витрину — документ meal/foods общего модуля: название,
   порция и числа одной порции (калории, белки, жиры, углеводы, клетчатка на 100 г), без каталога и состава. Каталог
   добавок и их состав остаются в Meal (Астамур 14.11.2026): соседям — только счётчик.
   Нажатие лежит у приложения, где нажали (Астамур 14.11.2026): своё нажатие Meal — обычная запись дневника;
   нажатия Day и Sport лежат у них (day/foodtaps, sport/foodtaps), Meal показывает их в дне как порции с отметкой nb —
   чьё нажатие. В документы Meal такая порция не кладётся. Поправить и убрать её можно и здесь (Астамур 14.11.2026
   22:34: счётчик показан — порции прибавляются и убавляются): правка уходит в саму запись нажатия, документы нажатий
   у Meal общие с соседом. Состав порции Meal берёт у себя — по своему счётчику и своему продукту. В сводке для
   соседей (meal/summary) посчитанные нажатия названы в cs, непосчитанные — в skipped.
   Счётчик, убранный со страницы Day или Sport, остаётся в Meal: у него выключается показ в этом приложении.
   Формат — shared/happy-food.js. */
(function(root){
  'use strict';
  const F=root.HappyFood;
  let baseSave,dialog=null,draft=null,started=false,skippedIds=[],base=new Map(),gone=new Map();
  const $=id=>document.getElementById(id),esc=x=>root.escH(x),clone=x=>JSON.parse(JSON.stringify(x));
  const newId=()=>root.MealData.id();
  const signedIn=()=>!!(root.MealData&&root.MealData.signedIn());
  const APP_NAME={day:'Happy Day',sport:'Happy Sport'};
  function ready(c){const f=c&&root.FOODS[c.fid];return !!(f&&Number(c.q)>0&&c.u&&(c.g>0||c.u==='г'||f.por&&f.por[c.u]>0)&&(c.libraryConfirmed||f.b||f.composition||root.BASE.some(r=>r[0]===c.fid)||[f.k,f.p,f.f,f.c].some(x=>x>0)))}
  /* Meal 29: продукт-добавка (supplement-counters.js) с более новой версией состава заменяет прежнюю копию */
  function rememberFood(f){const old=root.FOODS[f.id];
    if(old){const s=f.supplement,o=old.supplement;if(!s||!o||(Number(s.revision)||0)<=(Number(o.revision)||0))return;
      const i=root.DB.foods.findIndex(x=>x.id===f.id);if(i<0)return;const food=clone(f);food.w=food.w||[];food.por=food.por||{};root.DB.foods[i]=food;root.rebuildLib();return}
    const food=clone(f);food.w=food.w||root.norm(food.n).split(/\s+/);food.por=food.por||{};
    root.DB.foods.push(food);root.rebuildLib();}
  const SUP=()=>root.MealSupplementCounters;
  /* порция добавки: снимок продукта-добавки — из самого счётчика, иначе из дневника */
  function supplementFood(c){if(!c)return null;const f=c.food&&c.food.id===c.fid?c.food:root.FOODS[c.fid];return f&&f.supplement?f:null}
  const linked=(c,app)=>!!(c&&c.targets&&c.targets[app]===true);
  const shown=c=>linked(c,'day')||linked(c,'sport');

  /* ── витрина: счётчики, показанные в Day и Sport ── */
  /* числа одной порции для соседей: на 100 г; чего нет — null (тогда «съедено» у соседа подождёт сводку Meal) */
  function showcaseFood(c){
    const f=supplementFood(c)||root.FOODS[c.fid];if(!f||typeof f.n!=='string'||!f.n)return null;
    const P=root.MealProducts,num=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;
    const value=(key,own)=>{let v=null;try{v=P&&P.value?P.value(f,key,root.blsVal):null}catch(e){}return num(v)!==null?num(v):num(own)};
    const out={id:c.fid,n:f.n.slice(0,400),k:value('kcal',f.k),p:value('prot',f.p),f:value('fat',f.f),c:value('carb',f.c)},fib=value('fib',null);
    if(fib!==null)out.counterValues={fib};
    return out;
  }
  function publish(){
    if(!signedIn())return;
    const doc=root.MealData.store.doc(F.FOODS.name),wanted=new Map();if(doc.newer)return;
    root.DB.taps.forEach(c=>{
      if(!shown(c)||typeof c.k!=='string'||!c.k||c.k.length>150)return;
      const targets={day:linked(c,'day'),sport:linked(c,'sport')},title=String(c.t||'').slice(0,400);
      const food=ready(c)?showcaseFood(c):null,g=c.g>0?c.g:food?root.gramsFor(c.fid,c.q,c.u):0;
      if(food&&g>0&&title){
        const v={title,fid:c.fid,q:c.q,g,u:c.u,food,targets},sf=supplementFood(c);
        if(sf&&SUP())v.portionText=SUP().counterLabel(sf,c.q,c.u,g);
        wanted.set(c.k,v);return;
      }
      /* продукт счётчика сейчас не читается (каталог ещё не загрузился): прежняя запись витрины остаётся */
      const old=doc.get(c.k);if(old)wanted.set(c.k,Object.assign(old,{targets}));
    });
    root.MealData.publish(F.FOODS.name,wanted);
  }

  /* ── порции, нажатые в Day и Sport: вид в дневнике ── */
  const tapsDoc=app=>root.MealData.store.shared(app,F.TAPS_NAME);
  const sig=(date,x)=>JSON.stringify([date,x.sec,x.fid,x.q,x.u,x.g,x.t||null]);
  /* нажатие → порция дня; null — посчитать нельзя (ни счётчика, ни продукта) */
  function viewItem(app,t,c){
    const it=t.item;let counterFood=null,known=false;
    if(c&&c.fid===it.fid){const sf=supplementFood(c);if(sf)counterFood=clone(sf);else known=!!root.FOODS[c.fid]}
    if(!counterFood&&!known){
      /* счётчика уже нет или у него другой продукт: продукт из дневника, иначе — числа из самого нажатия */
      if(root.FOODS[it.fid])known=true;
      else if(it.counterFood&&it.counterFood.id===it.fid&&typeof it.counterFood.n==='string'&&it.counterFood.n)counterFood=Object.assign({w:[],por:{}},clone(it.counterFood));
    }
    if(!counterFood&&!known)return null;
    const sections=root.DB.sections,sec=root.sec(it.sec)?it.sec:(sections.find(s=>s.k==='sn')||sections[0]||{}).k;if(!sec)return null;
    const item={id:'nb:'+t.id,nb:app,counterEventId:t.id,sec,fid:it.fid,q:it.q,u:it.u,g:it.g,t:it.t||null};
    if(c)item.tap=c.k;if(counterFood)item.counterFood=counterFood;
    return item;
  }
  /* собрать вид заново: по документам нажатий Day и Sport, как они лежат сейчас */
  function neighbors(){
    const days=root.DB.days;
    Object.keys(days).forEach(date=>{const items=days[date]&&days[date].items;if(Array.isArray(items)&&items.some(x=>x&&x.nb))days[date].items=items.filter(x=>!(x&&x.nb))});
    skippedIds=[];base=new Map();
    if(signedIn())F.TAP_APPS.forEach(app=>{
      const doc=root.MealData.store.neighbor(app,F.TAPS_NAME);if(doc.newer)return;
      F.taps(doc.all()).forEach(t=>{
        /* нажатие, сделанное, пока связь с приложением была выключена, не берётся; номер нажатия начинается с названия приложения */
        const on=t.id.indexOf(app+'-')===0&&(!root.MealAppLinks||root.MealAppLinks.tapOn(app,t.date,t.item.t,t.at));
        const item=on?viewItem(app,t,root.DB.taps.find(c=>c.k===t.cid)):null;
        if(!item){skippedIds.push(t.id);return}
        root.day(t.date).items.push(item);base.set(t.id,{app,t,sig:sig(t.date,item)});
      });
    });
  }
  /* порция соседа, как она выглядит в дневнике после правки, → запись нажатия; null — такую запись сосед не прочтёт */
  function edited(t,date,x){
    const value=clone(t),it=value.item;delete value.id;value.date=date;
    it.q=x.q;it.u=x.u;it.g=x.g;it.t=x.t||null;it.sec=x.sec;
    if(it.fid!==x.fid){it.fid=x.fid;delete it.counterFood}
    return F.taps([{id:t.id,value}]).length?value:null;
  }
  /* перед каждой записью дневника: порцию соседа поправили или убрали здесь — меняется или убирается само нажатие */
  function capture(){
    if(!started)return;
    const now=new Map();
    Object.keys(root.DB.days).forEach(date=>(root.DB.days[date].items||[]).forEach(x=>{
      if(!x||!x.nb)return;const id=x.counterEventId;
      /* «Вернуть» после удаления: порция снова в дне — нажатие кладётся обратно */
      if(!base.has(id)&&gone.has(id)&&x.id==='nb:'+id){base.set(id,Object.assign(gone.get(id),{sig:''}));gone.delete(id)}
      if(base.has(id)&&!now.has(id)&&x.id==='nb:'+id){now.set(id,{date,x});return}
      delete x.nb;delete x.counterEventId;x.id='i'+newId();   // копия порции соседа — обычная запись Meal
    }));
    const changes={},names=[];let refused=false;
    base.forEach((b,id)=>{
      const cur=now.get(id);if(cur&&sig(cur.date,cur.x)===b.sig)return;
      const doc=signedIn()&&!root.RO?tapsDoc(b.app):null,value=cur?edited(b.t,cur.date,cur.x):null;
      if(!doc||doc.newer||(cur&&!value)){refused=true;if(!names.includes(APP_NAME[b.app]))names.push(APP_NAME[b.app]);return}
      (changes[b.app]=changes[b.app]||[]).push(cur?{id,value}:{id,deleted:true});
      if(cur){b.t=Object.assign(clone(value),{id});b.sig=sig(cur.date,cur.x)}
      else{gone.set(id,{app:b.app,t:b.t});base.delete(id)}
    });
    Object.keys(changes).forEach(app=>tapsDoc(app).putMany(changes[app]).catch(root.MealData.report));
    if(!refused)return;
    neighbors();   // незаписанное возвращается как было
    setTimeout(()=>{try{root.renderAll();root.toast('Эту порцию сейчас не изменить: она записана в '+names.join(' и '))}catch(e){}},0);
  }
  /* счётчик убрали со страницы Day или Sport — у него выключается показ в этом приложении; сам счётчик остаётся */
  function applyHidden(){
    if(!signedIn()||root.RO)return false;let changed=false;
    F.TAP_APPS.forEach(app=>{
      const doc=root.MealData.store.neighbor(app,F.TAPS_NAME);if(doc.newer)return;
      const off=F.hidden(doc.all());
      root.DB.taps.forEach(c=>{if(off[c.k]&&linked(c,app)){c.targets[app]=false;if(!shown(c))delete c.targets;changed=true}});
    });
    return changed;
  }
  /* вид порций соседей и показ счётчиков — заново по документам нажатий */
  function sync(){neighbors();if(started&&applyHidden())root.save()}
  /* нажатия соседей поменялись (здесь, в другой вкладке, на другом устройстве) */
  let timer=null;
  function refresh(){clearTimeout(timer);timer=setTimeout(()=>{if(!started)return;sync();try{root.renderAll()}catch(e){}try{root.linkWrite()}catch(e){}},60)}

  function init(){
    if(started)return;started=true;
    baseSave=root.save;root.save=function(){try{capture();publish()}catch(e){root.toast(e.message)}baseSave()};
    root.editTap=edit;
    /* Meal 30 (Астамур 12.11 10:19): продукт из отключённой или не купленной библиотеки — счётчик тусклый и неактивный */
    root.tapOff=function(c){const MS=root.MealSources;if(!MS||!c||!c.fid)return false;const f=supplementFood(c)||root.FOODS[c.fid]||(c.food&&c.food.id===c.fid?c.food:null);return !!f&&!MS.available(root.DB,f)};
    root.tapAdd=function(k){const c=root.tapDef(k);if(!ready(c)){edit(root.DB.taps.indexOf(c));return}
      if(root.writeGuard())return;
      const g=c.g||root.gramsFor(c.fid,c.q,c.u),item={id:'i'+newId(),sec:root.autoSec(),fid:c.fid,q:c.q,u:c.u,g,t:root.curDate===root.todayISO()?root.nowHM():null,tap:k};
      const sf=supplementFood(c);if(sf)item.counterFood=clone(sf);   // Meal 29: состав добавки — в самой записи
      root.day(root.curDate).items.push(item);root.save();root.renderDay();root.toast(c.t+' +'+root.portTxt(c));
    };
    /* «−» убирает последнюю порцию счётчика за день, где бы её ни нажали: по времени, без времени — последнюю в списке */
    root.tapUndo=function(k){
      const e=root.day(root.curDate),all=e.items.filter(x=>x.tap===k);if(!all.length)return;
      if(root.writeGuard())return;
      let it=all[0];all.forEach(x=>{if((x.t||'')>=(it.t||''))it=x});
      e.items.splice(e.items.indexOf(it),1);root.save();root.renderDay();root.toast(root.tapDef(k).t+' −'+root.amtShort(it));
    };
    const oldTaps=root.tapsHTML;root.tapsHTML=function(){let html=oldTaps();root.DB.taps.forEach(c=>{const before='<button class="tpNm" data-tinfo="'+esc(c.k)+'"><b>'+esc(c.t)+'</b><small>'+esc(root.portTxt(c))+'</small>';const note=ready(c)?root.portTxt(c):'Выбрать продукт';html=html.replace(before,'<button class="tpNm" data-tinfo="'+esc(c.k)+'"><b>'+esc(c.t)+'</b><small>'+esc(note)+'</small>')});return html};
    document.getElementById('mlTaps').addEventListener('click',e=>{if(e.target.closest('.tpOff')){e.stopImmediatePropagation();e.preventDefault();root.toast('Библиотека с данным продуктом отключена');return}const b=e.target.closest('[data-tinfo]');if(!b)return;e.stopImmediatePropagation();edit(root.DB.taps.findIndex(c=>c.k===b.dataset.tinfo))},true);
    const oldRebuild=root.rebuildLib;root.rebuildLib=function(){oldRebuild();if(dialog&&!dialog.hidden&&draft&&!draft.fid)results()};
    document.addEventListener('happy-supplements-changed',()=>{if(dialog&&!dialog.hidden&&draft&&!draft.fid)results()});
    /* свою правку порции соседа вид уже содержит; остальное — другая вкладка, сосед, другое устройство */
    if(signedIn())F.TAP_APPS.forEach(app=>root.MealData.store.neighbor(app,F.TAPS_NAME).subscribe(e=>{if(e.origin!=='local')refresh()}));
    sync();
    if(signedIn()&&!root.RO)try{publish()}catch(e){}
  }
  function ensure(){if(dialog)return;dialog=document.createElement('section');dialog.id='foodCounterEditor';dialog.className='food-counter-editor';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','fcTitle');document.body.appendChild(dialog);
    dialog.addEventListener('click',e=>{const b=e.target.closest('[data-fc]');if(!b)return;const act=b.dataset.fc;
      if(act==='close'&&!(b.classList.contains('fc-grip')&&gdy>=6))close();
      if(act==='delete'){const i=draft?root.DB.taps.findIndex(x=>x.k===draft.key):-1;close();if(i>=0&&typeof root.delTap==='function')root.delTap(i);return}   /* Meal 30: корзина — тот же вопрос, что «−» в настройках; записанные порции остаются */
      if(act==='choose'){const f=draft.results.find(f=>f.id===b.dataset.id);if(!f)return;draft.fid=f.id;draft.food=clone(f);
        if(f.supplement){const s=f.supplement,u=SUP().units(f)[0]||'г';draft.u=u;draft.q=u===s.basis.unit&&(u==='г'||u==='мл')?s.basis.quantity:u==='г'?Math.round(s.basis.quantity*s.unitGrams*1000)/1000:1}
        else{draft.q=f.por&&Object.keys(f.por).length?1:100;draft.u=root.defUnit(f)}draft.title=f.n;render();}
      if(act==='change'){draft.fid=null;render()}
      if(act==='save')commit();
      if(act==='plus'||act==='minus'){let q=Number($('fcQuantity').value.replace(',','.'))||0;const u=$('fcUnit').value,step=draft.food&&draft.food.supplement?(u==='г'||u==='мл'?(q<20?1:5):1):u==='г'?(q<50?5:10):(q<2||['ст. л.','ч. л.','стакан','чашка'].includes(u)?.5:1);$('fcQuantity').value=String(Math.min(100000,Math.max(step,Math.round((q+(act==='plus'?step:-step))*1000)/1000))).replace('.',',');preview();}
      if(act==='unit'||act==='custom'){
        const u=act==='custom'?'__custom':b.dataset.unit;let mass;try{mass=portion().g}catch{};
        $('fcUnit').value=u;draft.u=u;$('fcCustom').hidden=u!=='__custom';
        if(u==='г')$('fcQuantity').value=String(mass?Math.round(mass*1000)/1000:100).replace('.',',');else $('fcQuantity').value=1;
        dialog.querySelectorAll('[data-fc="unit"],[data-fc="custom"]').forEach(x=>{const on=x===b;x.classList.toggle('on',on);if(x.dataset.fc==='unit')x.setAttribute('aria-pressed',String(on));else x.setAttribute('aria-expanded',String(on))});preview();
        if(u==='__custom')$('fcPortionName').focus();
      }
    });
    let gy=null,gdy=0;   // Meal 30: черточка — потянуть вниз больше чем на 70 точек или нажать
    dialog.addEventListener('touchstart',e=>{if(!e.target.closest('.fc-grip'))return;gy=e.touches[0].clientY;gdy=0;dialog.style.transition='none'},{passive:true});
    dialog.addEventListener('touchmove',e=>{if(gy===null)return;gdy=Math.max(0,e.touches[0].clientY-gy);dialog.style.transform='translateY('+gdy+'px)'},{passive:true});
    const gend=()=>{if(gy===null)return;gy=null;dialog.style.transition='transform .26s cubic-bezier(.22,.75,.25,1)';if(gdy>70){dialog.style.transform='translateY(110%)';setTimeout(()=>{dialog.style.transition='';dialog.style.transform='';gdy=0;close()},200)}else{dialog.style.transform='';setTimeout(()=>{dialog.style.transition='';gdy=0},280)}};
    dialog.addEventListener('touchend',gend);dialog.addEventListener('touchcancel',gend);
    dialog.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.fc-grip')){e.preventDefault();close()}});
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
      '<div class="mlW fc-quantity"><div class="tpStp"><button type="button" data-fc="minus" aria-label="Уменьшить количество">−</button><label class="v"><span class="mlQtyMain"><input id="fcQuantity" type="text" inputmode="decimal" value="'+esc(String(d.q).replace('.',','))+'" aria-label="Количество"><i id="fcQuantityUnit">'+esc(S.unitWord(d.q,d.u))+'</i></span><small class="mlInlineEq" id="fcQuantityGrams"></small></label><button type="button" data-fc="plus" aria-label="Увеличить количество">+</button></div></div>'+
      '<input type="hidden" id="fcUnit" value="'+esc(d.u)+'"><div class="mlUnits fc-units" role="group" aria-label="Мера">'+units.map(u=>'<button type="button" class="chip'+(u===d.u?' on':'')+'" data-fc="unit" data-unit="'+esc(u)+'" aria-pressed="'+(u===d.u)+'">'+(u==='г'?'Граммы':esc(u)+(s.massUnknown||!(f.por[u]>0)?'':' <small>'+num(f.por[u])+' г</small>'))+'</button>').join('')+'</div>'+
      '<div class="fc-grid" id="fcCustom" hidden><input type="hidden" id="fcPortionName"><input type="hidden" id="fcPortionGrams"></div><p id="fcPreview" class="happy-note"></p>';
  }
  function render(){const d=draft,f=d.food,c=root.DB.taps.find(c=>c.k===d.key);
    dialog.innerHTML='<div class="fc-shell"><div class="fc-grip" data-fc="close" role="button" tabindex="0" aria-label="Закрыть"><i></i></div><header><h2 id="fcTitle">'+(c?'Счётчик':'Новый счётчик')+'</h2></header>'+
      (!d.fid?'<label>Продукт или добавка<input class="happy-input" id="fcSearch" type="search" autocomplete="off" placeholder="Название продукта или добавки" value="'+esc(d.query)+'"></label>'+(c?'<p class="happy-note">Выбери точный продукт для этого счётчика. Прежние записи сохранятся.</p>':'')+'<div id="fcResults"></div>':f&&f.supplement?supplementBody(d,f):
      '<div class="happy-card"><h3>'+esc(f.n)+'</h3><button class="happy-button" data-fc="change">Выбрать другой продукт</button></div><label>Название счётчика<input class="happy-input" id="fcName" maxlength="100" value="'+esc(d.title)+'"></label><div class="mlW fc-quantity"><div class="tpStp"><button type="button" data-fc="minus" aria-label="Уменьшить количество">−</button><label class="v"><span class="mlQtyMain"><input id="fcQuantity" type="text" inputmode="decimal" value="'+esc(String(d.q).replace('.',','))+'" aria-label="Количество"><i id="fcQuantityUnit">'+esc(d.u)+'</i></span><small class="mlInlineEq" id="fcQuantityGrams"></small></label><button type="button" data-fc="plus" aria-label="Увеличить количество">+</button></div></div><input type="hidden" id="fcUnit" value="'+esc(d.u)+'"><div class="mlUnits fc-units" role="group" aria-label="Вес или порция">'+root.unitList(f,d.u).map(u=>'<button type="button" class="chip'+(u===d.u?' on':'')+'" data-fc="unit" data-unit="'+esc(u)+'" aria-pressed="'+(u===d.u)+'">'+(u==='г'?'Граммы':esc(root.unitName(f,u))+' <small>'+root.unitWeightLabel(f,u)+' г</small>')+'</button>').join('')+'<button type="button" class="chip add" data-fc="custom" aria-expanded="false">+ Добавить свою</button></div>'+(root.MealPortions&&root.MealPortions.note(f)?'<p class="happy-note">'+esc(root.MealPortions.note(f))+'</p>':'')+'<div class="fc-grid" id="fcCustom" hidden><label>Название порции<input class="happy-input" id="fcPortionName" maxlength="40" placeholder="Моя чашка"></label><label>Масса одной порции, г<input class="happy-input" id="fcPortionGrams" inputmode="decimal" placeholder="Например, 200"></label></div><p id="fcPreview" class="happy-note"></p>')+
      (d.fid?'<div class="happy-card"><h3>Синхронизация счётчика</h3>'+['day','sport'].map(a=>'<label class="fc-sync-row"><span>Happy '+(a==='day'?'Day':'Sport')+'</span><input type="checkbox" role="switch" id="fcSync-'+a+'"'+(linked(c,a)?' checked':'')+(root.MealAppLinks&&!root.MealAppLinks.on(a)?' disabled title="Связь с Happy '+(a==='day'?'Day':'Sport')+' выключена в настройках"':'')+'></label>').join('')+'<p class="happy-note">Выключи связь, чтобы скрыть счётчик в выбранном приложении. Записанные порции сохранятся.</p></div>':'')+
      '<p id="fcError" class="happy-note happy-error" role="status"></p><footer class="fc-actions'+(c?' has-delete':'')+'">'+(c?'<button type="button" class="happy-button fc-delete" data-fc="delete" aria-label="Удалить счётчик">'+(root.BINI||'Удалить')+'</button>':'')+'<button class="happy-button primary" data-fc="save"'+(!d.fid?' disabled':'')+'>'+(c?'Сохранить':'Создать')+'</button></footer><p class="happy-note">Счётчик показывается в отмеченных приложениях. Порции, нажатые там, приходят в дневник Meal сами.</p></div>';
    if(!d.fid){results();$('fcSearch').focus()}else{preview();$('fcQuantity').focus()}
  }
  function results(){if(!draft||draft.fid||!$('fcResults'))return;const S=SUP(),sup=S?S.search(draft.query):[];const MS=root.MealSources,supOn=!MS||MS.enabled(root.DB,'SUPP'),own=supOn?sup:[];draft.results=own.concat(root.searchLib(draft.query).filter(f=>!MS||MS.available(root.DB,f)).slice(0,35-own.length));   // Meal 30: отключённая или не купленная библиотека не ищется   // Meal 29: и свои добавки
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
    const p=portion(),k=draft.food.k;$('fcQuantityUnit').textContent=p.custom?p.u:root.uLab(draft.fid,p.q,p.u);$('fcQuantityGrams').textContent=p.u==='г'?'':'= '+new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(p.g)+' г';$('fcQuantity').style.width=root.qtyW($('fcQuantity').value);const nf=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);$('fcPreview').textContent=nf(p.q)+' '+(p.custom?p.u:root.uLab(draft.fid,p.q,p.u))+' = '+nf(p.g)+' г'+(k==null?'':' · '+Math.round(k*p.g/100)+' ккал');$('fcError').textContent=''}catch(e){$('fcPreview').textContent='';$('fcQuantityGrams').textContent='';$('fcQuantityUnit').textContent=$('fcUnit').value==='__custom'?($('fcPortionName').value||'порция'):$('fcUnit').value;$('fcError').textContent=e.message}}
  async function commit(){const d=draft,button=dialog.querySelector('[data-fc="save"]');try{
    if(root.writeGuard())return;
    const targets={day:!!$('fcSync-day')?.checked,sport:!!$('fcSync-sport')?.checked};
    let p=portion();const title=$('fcName').value.trim();if(!title)throw new Error('Укажи название счётчика.');
    const taken=c=>root.nameTaken(root.DB.taps,title,c?root.DB.taps.indexOf(c):undefined);
    let c=root.DB.taps.find(c=>c.k===d.key);if(taken(c))throw new Error('Счётчик с таким названием уже есть.');
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
    if(!c){c={k:'p'+newId()};root.DB.taps.push(c)}Object.assign(c,{t:title,fid:f.id,q:p.q,u:p.u,g:p.g,libraryConfirmed:true});
    if(f.supplement)c.food=clone(f);else delete c.food;
    if(targets.day||targets.sport)c.targets=targets;else delete c.targets;
    /* показ включён снова — отметка «убран со страницы» у соседа снимается */
    F.TAP_APPS.forEach(app=>{if(!targets[app])return;const doc=tapsDoc(app),mark=F.hide(c.k).id;if(!doc.newer&&doc.get(mark))doc.remove(mark).catch(root.MealData.report)});
    root.save();neighbors();close();root.renderAll();root.toast('Счётчик сохранён');
  }catch(e){if(draft===d&&$('fcError'))$('fcError').textContent=e.message}}
  root.HappyMealCounters={init,edit,ready,neighbors:sync,publish,skipped:()=>skippedIds.slice()};
})(globalThis);
