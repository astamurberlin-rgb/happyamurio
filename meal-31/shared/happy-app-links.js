/* Happy · связь приложений — свитч на пару приложений, в обе стороны (решения Астамура 12.11.2026 11:50–11:55).

   Переключение — {pair:'day|meal', on:true|false, at:<мс>, by:'meal'}: кто и когда включил или выключил связь пары.
   Состояние пары — по последнему переключению из любого из двух приложений; переключений нет — связь включена.
   Пока связь выключена, между двумя приложениями ничего не передаётся: событие соседа (тренировка, приём пищи,
   порция со счётчика) со временем после выключения не учитывается и не отмечается; что было до выключения,
   остаётся. Включили обратно — показывается всё, и то, что было, пока связь была выключена (Астамур 12.11, до 12:50).

   Каждое приложение хранит известные ему переключения в области аккаунта (ключ `hd_app_links_v1`) и отдаёт свои
   пары соседям в своей сводке: Meal — `meal/link`, Sport — `sport/link`, Day — `day/link` (поле `links`).
   Чистые функции, без сети и хранилища; копии в выпусках сверяет `check-shared`.

   — Claude · 12.11.2026 12:05 */
(function(root){'use strict';
  var APPS=['day','meal','sport'], MAX=200, KEY='hd_app_links_v1', PAIRS=/^(day\|meal|day\|sport|meal\|sport)$/;
  function pairOf(a,b){ return APPS.indexOf(a)>=0&&APPS.indexOf(b)>=0&&a!==b?[a,b].sort().join('|'):null }
  function valid(t){
    return !!t&&typeof t==='object'&&typeof t.pair==='string'&&PAIRS.test(t.pair)&&typeof t.on==='boolean'&&
      Number.isSafeInteger(t.at)&&t.at>0&&typeof t.by==='string'&&t.pair.split('|').indexOf(t.by)>=0;
  }
  function order(x,y){ return x.at-y.at||(x.by<y.by?-1:x.by>y.by?1:0)||(x.on===y.on?0:x.on?1:-1) }
  /* любые списки переключений → один список без повторов, по времени, не длиннее MAX */
  function merge(){
    var seen=Object.create(null), out=[], i;
    for(i=0;i<arguments.length;i++){
      var L=arguments[i]; if(!Array.isArray(L)) continue;
      L.forEach(function(t){
        if(!valid(t)) return;
        var k=t.pair+'|'+t.by+'|'+t.at+'|'+(t.on?1:0); if(seen[k]) return; seen[k]=1;
        out.push({pair:t.pair,on:t.on,at:t.at,by:t.by});
      });
    }
    return out.sort(order).slice(-MAX);
  }
  function of(list,a,b){ var p=pairOf(a,b); return p?merge(list).filter(function(t){ return t.pair===p }):[] }
  /* связь пары в момент time (мс); без time — сейчас */
  function on(list,a,b,time){
    var L=of(list,a,b), t=time==null?Infinity:time, st=true;
    for(var i=0;i<L.length&&L[i].at<=t;i++) st=L[i].on;
    return st;
  }
  /* новое переключение: время не раньше последнего известного, чтобы оно победило и при сбитых часах */
  function toggle(list,a,b,value,by,now){
    var p=pairOf(a,b), L=merge(list); if(!p||p.split('|').indexOf(by)<0) return L;
    var last=L.length?L[L.length-1].at:0, at=Math.max(Number.isSafeInteger(now)?now:Date.now(),last+1);
    return merge(L,[{pair:p,on:!!value,at:at,by:by}]);
  }
  /* переключения пар этого приложения — для его сводки */
  function forApp(list,app){ return merge(list).filter(function(t){ return t.pair.split('|').indexOf(app)>=0 }) }
  /* дата дня (YYYY-MM-DD) → мс начала и конца по местному времени */
  function dayBounds(date){
    var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date||'')); if(!m) return null;
    var s=new Date(+m[1],+m[2]-1,+m[3]).getTime(); return [s,new Date(+m[1],+m[2]-1,+m[3]+1).getTime()-1];
  }
  /* связь сейчас выключена — с какого момента (мс); включена — null */
  function offSince(list,a,b){ var L=of(list,a,b); return L.length&&!L[L.length-1].on?L[L.length-1].at:null }
  /* итоги соседа за день (съедено за день и т. п.): связь включена — берутся всегда; выключена — за дни,
     начавшиеся до выключения (день выключения — целиком: итог дня не делится) */
  function dayOn(list,a,b,date){
    var off=offSince(list,a,b); if(off===null) return true;
    var r=dayBounds(date); return !!r&&r[0]<off;
  }
  /* событие соседа в день date и время 'HH:MM' (или мс): связь включена — отмечается всегда; выключена — если
     оно было до выключения; время неизвестно — по дню */
  function eventOn(list,a,b,date,time){
    var off=offSince(list,a,b); if(off===null) return true;
    if(typeof time==='number') return time<off;
    var r=dayBounds(date), m=/^(\d{1,2}):(\d{2})/.exec(String(time||''));
    if(!r) return false;
    return m?r[0]+(+m[1]*60+(+m[2]))*60000<off:dayOn(list,a,b,date);
  }
  function key(owner){ return !owner||owner==='local'?KEY:'happy-user:'+encodeURIComponent(owner)+':'+KEY }
  function read(storage,owner){ try{ return merge(JSON.parse(storage.getItem(key(owner))||'[]')) }catch(e){ return [] } }
  function write(storage,owner,list){ try{ storage.setItem(key(owner),JSON.stringify(merge(list))); return true }catch(e){ return false } }
  var api={APPS:APPS,KEY:KEY,pairOf:pairOf,valid:valid,merge:merge,of:of,on:on,toggle:toggle,forApp:forApp,
    offSince:offSince,dayOn:dayOn,eventOn:eventOn,key:key,read:read,write:write};
  root.HappyAppLinks=api;
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
