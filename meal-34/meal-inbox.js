/* Happy Meal · диктовки шортката «Еда» (Meal 33.15).
   Шорткат на iPhone кладёт сказанное во входящие (Supabase, ai_shared.food_inbox). Meal после входа в аккаунт забирает новые
   диктовки, бот на правилах (bot.js) разбирает каждую и пишет в дневник — временем диктовки, а не временем, когда Meal открыли.
   Чего бот не понял, он спрашивает в диалоге «Что съел»; наугад не пишет.

   Только для владельца входящих: выключатель в «Для разработчика», по умолчанию выключен (решение Астамура 18.11.2026 23:36);
   сервер отдаёт диктовки одному аккаунту (public.meal_inbox_take). Записная книжка работает с теми же строками отдельно:
   её поле status Meal не читает и не меняет, у Meal свои поля meal_taken_at, meal_taken_by, meal_done_at.

   Одна диктовка — одна запись:
   - сервер отдаёт диктовку одному устройству (первому, кто спросил);
   - устройство помнит, что уже подало боту («fed»), и после перезагрузки возвращает только вопросы, а записанное не пишет второй раз;
   - диктовка закрывается на сервере (meal_done_at), когда по ней не осталось вопросов.
   Порядок: сначала все диктовки, по которым вопросов не будет; потом по одной те, где бот спросит, — следующая подаётся после ответа:
   иначе новая диктовка была бы принята за ответ на вопрос.

   Это единственный запрос Meal к серверу мимо общего модуля хранения: входящие — не записи дневника, а очередь шортката. */
var MealInbox=(function(){
  'use strict';
  var KEY='happy-meal-inbox', queue=[], busy=false, pumping=false, confirm=[], told=0, timer=null;
  function load(){ try{ var o=JSON.parse(localStorage.getItem(KEY)||'{}'); return o&&typeof o==='object'?o:{} }catch(e){ return {} } }
  function store(o){ try{ localStorage.setItem(KEY,JSON.stringify(o)) }catch(e){} }
  function on(){ return load().on===1 }
  function device(){ var o=load(); if(!o.dev){ o.dev='m'+Math.random().toString(36).slice(2,10)+Date.now().toString(36); store(o) } return o.dev }
  function mark(id,v){ var o=load(); o.st=o.st||{}; o.st[id]=v; var ks=Object.keys(o.st).map(Number).sort(function(a,b){ return a-b }); while(ks.length>400) delete o.st[ks.shift()]; store(o) }
  function stateOf(id){ return (load().st||{})[id]||null }
  function ready(){
    return on()&&typeof MealBot!=='undefined'&&MealBot.on()&&typeof MealData!=='undefined'&&MealData.signedIn()&&!MealData.outdated()&&
      typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&typeof CH!=='undefined'&&!!CH.meal;
  }
  async function rpc(name,body){
    var C=HappyAccount.CLOUD, token=await MealData.account.token();
    var r=await fetch(C.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:C.key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok) throw new Error('inbox '+r.status);
    return r.json();
  }
  function hm(at){ var d=new Date(at); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2) }
  function dm(at){ var d=new Date(at), t=new Date(); return d.toDateString()===t.toDateString()?'':d.getDate()+' '+['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'][d.getMonth()]+', ' }
  function msgOf(r,extra){ var m={kind:'text',text:r.raw_text,eaten:true,at:r.created_at,inbox:r.id}; if(extra) Object.keys(extra).forEach(function(k){ m[k]=extra[k] }); return m }
  function S(){ return MealBot.state(CH.meal) }
  function blocked(){ var s=S(); return !!(s.pend.length||s.ask||s.offer) }
  function openIds(){ var s=S(), o={}; s.pend.forEach(function(q){ if(q.line&&q.line.inbox) o[q.line.inbox]=1 }); if(s.offer&&s.offer.inbox) o[s.offer.inbox]=1; return o }
  function give(r,replay){
    var chat=CH.meal;
    chat.msgs.push({id:'m'+(++chat.seq),who:'me',kind:'text',text:'Шорткат, '+dm(r.created_at)+hm(r.created_at)+': '+r.raw_text,inbox:r.id});
    mark(r.id,'fed');
    var h; try{ h=MealBot.feed(chat,msgOf(r,replay?{onlyAsk:1}:null)) }catch(e){ h='<p>Не получилось разобрать эту диктовку. Скажи её здесь заново.</p>' }
    if(replay&&!openIds()[r.id]){ chat.msgs.pop(); return }   // записана целиком ещё до перезагрузки — показывать нечего
    chat.msgs.push({who:'bot',kind:'reply',html:(replay?'<p class="mlHint">Остался вопрос по этой диктовке.</p>':'')+h});
    told++;
  }
  /* по каким диктовкам вопросов не осталось — закрыть у себя и на сервере, потом подать следующую */
  function settle(){
    if(!queue.length||typeof CH==='undefined') return;
    var open=openIds(), left=[];
    queue.forEach(function(r){ if(stateOf(r.id)==='fed'&&!open[r.id]){ mark(r.id,'done'); confirm.push(r.id) } else left.push(r) });
    queue=left;
    if(!pumping) setTimeout(function(){ pump(); flush() },0);
  }
  function pump(){
    if(pumping||!ready()) return; pumping=true;
    try{
      /* 1. уже поданные до перезагрузки — только их вопросы; 2. те, где вопроса не будет; 3. одна с вопросом */
      var pass=[function(r){ return stateOf(r.id)==='fed' },
                function(r){ return !stateOf(r.id)&&MealBot.probe(msgOf(r)).clean },
                function(r){ return !stateOf(r.id) }];
      pass.forEach(function(want,pi){
        queue.slice().forEach(function(r){
          if(blocked()||queue.indexOf(r)<0||!want(r)) return;
          if(pi===0&&openIds()[r.id]) return;
          give(r,pi===0);
        });
      });
    } finally { pumping=false }
    var open=openIds(), left=[];
    queue.forEach(function(r){ if(stateOf(r.id)==='fed'&&!open[r.id]){ mark(r.id,'done'); confirm.push(r.id) } else left.push(r) });
    queue=left;
    if(told){
      var n=told, q=blocked(); told=0;
      try{ if(typeof renderChat==='function'&&typeof D!=='undefined'&&D===CH.meal) renderChat() }catch(e){}
      try{ if(typeof renderAll==='function') renderAll() }catch(e){}
      try{ toast('Диктовки с шортката: '+n+(q?'. Есть вопрос — открой «Что съел»':'')) }catch(e){}
    }
  }
  async function flush(){
    if(!confirm.length) return; var ids=confirm.slice();
    try{ await rpc('meal_inbox_done',{p_device:device(),p_ids:ids}); confirm=confirm.filter(function(x){ return ids.indexOf(x)<0 }) }catch(e){}
  }
  async function pull(){
    if(busy||!ready()) return; busy=true;
    try{
      var rows=await rpc('meal_inbox_take',{p_device:device()});
      (Array.isArray(rows)?rows:[]).forEach(function(r){
        if(!r||r.id==null||!r.raw_text) return;
        if(stateOf(r.id)==='done'){ if(confirm.indexOf(r.id)<0) confirm.push(r.id); return }
        if(!queue.some(function(x){ return x.id===r.id })) queue.push({id:r.id,created_at:r.created_at,raw_text:String(r.raw_text)});
      });
      queue.sort(function(a,b){ return a.id-b.id });
      pump(); await flush();
    }catch(e){ /* нет сети или сервер не ответил — в следующий раз */ }
    finally{ busy=false }
  }
  function start(){
    if(timer) return; var tries=0;
    timer=setInterval(function(){ if(!on()){ return } if(ready()){ pull() } if(++tries>40&&ready()){ clearInterval(timer); timer=setInterval(function(){ if(on()&&document.visibilityState==='visible') pull() },60000) } },3000);
    document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') pull() });
  }
  function setOn(v){ var o=load(); if(v) o.on=1; else delete o.on; store(o); if(v) pull() }
  function wire(){
    var sw=document.getElementById('mealInboxSwitch');
    if(sw){ sw.checked=on(); sw.addEventListener('change',function(){ setOn(sw.checked); try{ toast(sw.checked?'Диктовки с шортката включены':'Диктовки с шортката выключены') }catch(e){} }) }
    start();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire); else wire();
  return {on:on,setOn:setOn,pull:pull,settle:settle,queue:function(){ return queue.slice() }};
})();
