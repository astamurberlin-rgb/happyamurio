/* The chat uses Meal's product index, product labels and selected catalogs. */
window.MealReplacement=(function(){
  var active=null, query='', panel=null, expanded=false, toggle=null;

  function catalogs(){
    var modules={USDA:'MealUSDA',MEXT:'MealCatalog',KFCT:'MealKfct',HM:'MealUzbek',DESSERT:'MealDesserts',PRESERVE:'MealPreserves',SUPP:'HappySupplementsLibrary'};
    var states=[];
    MealSources.catalog.filter(c=>MealSources.enabled(DB,c.id)).forEach(c=>{
      if(c.id==='OWN')return;
      var module=window[modules[c.id]];
      var status=c.id==='BLS'?BLS_ST:module?(module.status?module.status():module.state):'fail';
      if(status==='idle'){
        if(c.id==='BLS')blsLoad();else module.load();
        status='loading';
      }
      states.push({name:c.name,status});
      if(c.id==='HM')states.push({name:'Кавказская кухня',status:kavStatus});
    });
    return states;
  }
  function loading(){return catalogs().some(c=>c.status==='loading'||c.status==='idle')}
  function catalogMessage(){
    var states=catalogs();
    if(states.some(c=>c.status==='loading'||c.status==='idle'))return 'Ищу в каталогах…';
    var failed=states.filter(c=>c.status!=='ok');
    return failed.length?'Не удалось загрузить: '+failed.map(c=>c.name).join(', ')+'. Поиск доступен по остальным каталогам.':'';
  }
  function missingLabel(){return catalogMessage()||'Продукт не найден в библиотеке'}
  var refreshTimer;
  function refresh(){
    if(!panel||!panel.isConnected) return;
    var input=panel.querySelector('input'), results=panel.querySelector('.mlRes');
    if(!input)return;
    clearTimeout(refreshTimer);
    query=input.value;
    var term=query.trim();
    panel.querySelector('.mrClose').hidden=!query&&!toggle;
    if(!term){results.replaceChildren();results._markup='';return}
    var foods=searchLib(term).filter(function(f){return MealSources.available(DB,f)});
    var markup=foods.length?foods.map(function(f){
      return '<div class="mlResRow"><button type="button" class="mlResPick" data-replacement-food="'+escH(f.id)+'"><span>'+escH(f.n)+'</span>'+
        '<small>'+(f.k==null?'—':Math.round(f.k))+' ккал / 100 г · '+escH(catLabel(f))+'</small></button></div>';
    }).join(''):'<p class="mlEmpty" role="status">'+escH(catalogMessage()||'Ничего не найдено. Попробуй другое название.')+'</p>';
    if(loading())refreshTimer=setTimeout(refresh,300);
    if(results._markup!==markup){results.innerHTML=markup;results._markup=markup}
  }
  function close(){
    if(!panel) return;
    var input=panel.querySelector('input');
    input.value='';refresh();input.blur();
    if(toggle){setExpanded(false);toggle.focus({preventScroll:true})}
  }
  function setExpanded(open){
    expanded=open;panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
    if(open){
      var input=panel.querySelector('input');input.focus({preventScroll:true});input.scrollIntoView({block:'nearest'});
    }
  }
  function mount(log,id){
    if(active!==id){query='';expanded=false;active=id}
    toggle=null;
    log.querySelectorAll('[data-clarify-controls],[data-clarify-replace]').forEach(function(el){
      if((el.dataset.clarifyControls||el.dataset.clarifyReplace)!==id)el.hidden=true;
      else if(el.hasAttribute('data-clarify-replace'))toggle=el;
    });
    panel=Array.from(log.querySelectorAll('[data-replacement-slot]')).find(function(el){return el.dataset.replacementSlot===id});
    log.querySelectorAll('[data-replacement-slot]').forEach(function(slot){
      if(slot!==panel) slot.replaceChildren();
    });
    if(!panel) return;
    panel.className='mrSearch';
    panel.insertAdjacentHTML('beforeend','<div class="mrField"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>'+
      '<input type="text" aria-label="Найти замену" placeholder="Найти замену" autocomplete="off" inputmode="search">'+
      '<button type="button" class="mrClose" aria-label="Закрыть поиск" hidden>×</button></div><div class="mlRes"></div>');
    if(toggle){
      panel.hidden=!expanded;toggle.setAttribute('aria-expanded',String(expanded));
      toggle.addEventListener('click',function(){if(expanded)close();else setExpanded(true)});
    }
    var input=panel.querySelector('input');
    input.value=query;
    input.addEventListener('input',refresh);
    input.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();close()}});
    panel.addEventListener('click',function(e){
      if(e.target.closest('.mrClose')){close();return}
      var pick=e.target.closest('[data-replacement-food]');
      if(pick) MealBot.replaceMissing(D,id,pick.dataset.replacementFood);
    });
    refresh();
  }
  return {mount:mount,refresh:refresh,loading,catalogMessage,missingLabel};
})();

(function(){
  var selector='[data-info-food],#mlChat [data-replacement-food],#mlChat [data-saved-pick],#mlChat [data-add-food],#mlChat [data-bot^="pick:"]';
  var hold, timer, consumed;
  function clear(){clearTimeout(timer);hold=null}
  document.addEventListener('pointerdown',function(e){
    clear();consumed=null;
    var node=e.target.closest(selector);
    if(!node||!e.isPrimary||e.button!==0)return;
    var fid=node.dataset.infoFood||node.dataset.replacementFood||node.dataset.savedPick||node.dataset.addFood;
    var ask=D.bot&&D.bot.ask;
    if(!fid&&ask&&node.dataset.bot){
      var parts=node.dataset.bot.split(':');
      if(ask.id===parts[1])fid=ask.q.line.alts[Number(parts[2])];
    }
    if(!fid)return;
    hold={x:e.clientX,y:e.clientY};
    timer=setTimeout(function(){
      if(!node.isConnected)return;
      if(!FOODS[fid]&&fid.startsWith('bls:'))blsUse(fid);
      if(!FOODS[fid])return;
      consumed=node;
      MealControls.product({fid:fid,g:Number(node.dataset.infoGrams)||100});
    },500);
  },true);
  document.addEventListener('pointermove',function(e){
    if(hold&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)>10)clear();
  },true);
  ['pointerup','pointercancel','scroll'].forEach(function(type){document.addEventListener(type,clear,true)});
  document.addEventListener('contextmenu',function(e){if(e.target.closest(selector))e.preventDefault()},true);
  document.addEventListener('click',function(e){
    if(consumed){consumed=null;e.preventDefault();e.stopImmediatePropagation()}
  },true);
})();
