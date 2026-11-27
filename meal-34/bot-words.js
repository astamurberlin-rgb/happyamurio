/* Happy Meal · личные слова человека (решение Астамура 27.11.2026, «Да»).
   «пышка — это пончик», «пышкой я называю пончик», «это пончик, я так называю», «у нас это называется кура» — слово запоминается
   только у этого человека: DB.words в его аккаунте Meal (документ products), на всех его устройствах, не в общем словаре.
   Перед разбором фразы (bot-speech.js, prepare) слово человека меняется на обычное в любой форме: «две пышки» — «две пончик»,
   дальше всё как всегда. «Мои слова» — список с кнопками «Забыть», «забудь пышку» — удалить. Из диктовок шортката не запоминаю.
   Слова и ответы — словарь bot/household-ru.js, раздел my_words; код их только применяет. — Claude · 27.11.2026 */
window.MealBotWords=(function(){
  'use strict';
  var ENDS='(?:ами|ями|ою|ею|ой|ей|ом|ем|ам|ям|ах|ях|ов|ев|а|я|о|е|ы|и|у|ю|ь|й)';
  var END=new RegExp(ENDS+'$');
  function W(){ return (window.HappyMealSpeechData||{}).my_words||null }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] }) }
  function p(s){ return '<p>'+s+'</p>' }
  function chips(list){ return list&&list.length?'<div class="mbChips">'+list.map(function(c){ return '<button class="chip" data-bot="'+esc(c[0])+'">'+esc(c[1])+'</button>' }).join('')+'</div>':'' }
  function T(s,v){ return String(s||'').replace(/\{(\w+)\}/g,function(m,k){ return v&&v[k]!=null?v[k]:'' }) }
  function rx(s,f){ try{ return s?new RegExp(s,f||''):null }catch(e){ return null } }
  function nz(s){ return String(s||'').toLowerCase().replace(/ё/g,'е') }
  function clean(t){ return String(t||'').toLowerCase().replace(/[«»"“”?!,;:…()]+/g,' ').replace(/\s[—–-]\s/g,' — ').replace(/^[—–-]\s*/,'').replace(/[.]+(\s|$)/g,' ').replace(/\s+/g,' ').trim() }
  function plain(t){ return t.replace(/\s—\s/g,' ').replace(/\s+/g,' ').trim() }
  function rxq(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') }
  function stem(w){ var s=w.replace(END,''); return s.length>=3?s:w }
  function keyOf(x){ return plain(nz(x)).split(' ').map(stem).join(' ') }
  function reOf(x){
    var parts=plain(nz(x)).split(' ').map(function(w){ var s=stem(w); return s===w?rxq(w)+(w.length>=4?ENDS+'?':''):rxq(s)+ENDS+'?' });
    return new RegExp('(^|[\\s,.;:!?⊙≈])'+parts.join('\\s+')+'(?=[\\s,.;:!?]|$)','g');
  }
  function store(){ return typeof DB!=='undefined'&&DB?(DB.words&&typeof DB.words==='object'&&!Array.isArray(DB.words)?DB.words:null):null }
  function entries(){ var s=store()||{}; return Object.keys(s).map(function(k){ return {k:k,e:s[k]} }).filter(function(x){ return x.e&&x.e.w&&x.e.to }) }
  /* слово человека → обычное, до разбора фразы; длинные слова раньше коротких */
  var RC={};
  function apply(s){
    var L=entries(); if(!L.length) return s;
    L.sort(function(a,b){ return b.e.w.length-a.e.w.length }).forEach(function(x){
      var re=RC[x.e.w]||(RC[x.e.w]=reOf(x.e.w)); re.lastIndex=0;
      s=s.replace(re,function(m,a){ return a+nz(x.e.to) }) });
    return s;
  }
  function guard(){ try{ return typeof writeGuard==='function'&&writeGuard() }catch(e){ return true } }
  function saveAll(){ try{ save() }catch(e){} try{ if(typeof renderAll==='function') renderAll() }catch(e){} }
  function undo(fn){ return window.MealBot&&MealBot.undoChip?MealBot.undoChip(fn):'' }
  /* знает ли база слово без личных слов человека */
  function known(y){
    var L=null, keep=DB.words; DB.words=null;
    try{ L=window.MealBot&&MealBot.linesOf?MealBot.linesOf(y):null }catch(e){ L=null } finally { DB.words=keep }
    return !!(L&&L.length&&L.every(function(l){ return l.fid }));
  }
  /* винительный «курицу» — в именительный «курица» для показа и замены */
  function nom(y){ return y.split(' ').map(function(w,i,a){ return i===a.length-1&&/[^аеиоуыэюя]у$/.test(w)&&w.length>4?w.slice(0,-1)+'а':i===a.length-1&&/[^аеиоуыэюя]ю$/.test(w)&&w.length>4?w.slice(0,-1)+'я':w }).join(' ') }
  /* творительный «курой», «пышкой», «бутером» — в именительный: это слово человека */
  function instr(w){ return /(?:ой|ей|ом|ем|ами|ями)$/.test(w)&&w.length>=5 }
  function fromInstr(w){ return w.replace(/ами$|ями$/,'ы').replace(/([жшчщц])ей$/,'$1а').replace(/ей$/,'я').replace(/ой$/,'а').replace(/ем$/,'ь').replace(/ом$/,'') }
  function words(s){ return s?s.split(' ').filter(Boolean):[] }

  /* разбор фразы: {x, y, mk} — x слово человека, y обычное название; null — не про слова */
  function parse(t,D){
    var mk=rx(D.markers), hasMk=!!(mk&&mk.test(' '+t+' ')), rem=rx(D.remember), hasRem=!!(rem&&rem.test(t)), pl=rx(D.place,'g');
    var s=t; if(hasMk) s=(' '+s+' ').replace(rx(D.markers,'g'),' ').trim();
    if(hasRem) s=s.replace(rem,'');
    var hasPl=!!(pl&&pl.test(' '+s+' ')); if(hasPl) s=(' '+s+' ').replace(rx(D.place,'g'),' ').trim();
    var ld=rx(D.lead); if(ld) s=s.replace(ld,'');
    s=s.replace(/\s+/g,' ').trim().replace(/^—\s*|\s*—$/g,'');
    var strong=hasMk||hasRem||hasPl, m;
    /* «пышка — это пончик», «пышка значит пончик» */
    m=new RegExp('^([а-яё-]+(?: [а-яё-]+)?) (?:— )?(?:'+D.is_words+')(?: — )?(?: это)? (.+)$').exec(s);
    if(m&&m[1]!=='это'&&!/\d/.test(m[2])) return {x:m[1],y:m[2],strong:strong,mk:hasMk,how:'is'};
    /* «пышкой я называю пончик», «я называю курицу курой», «обычно я курицу называю курой» */
    var C=D.call;
    m=new RegExp('^(?:(?:я|мы) )?(?:обычно |всегда |так )?(?:(?:я|мы) )?'+C+' ([а-яё-]+) ([а-яё-]+)$').exec(s)
      ||new RegExp('^(?:(?:я|мы) )?([а-яё-]+) (?:(?:я|мы) )?(?:обычно |всегда )?'+C+' ([а-яё-]+)$').exec(s)
      ||new RegExp('^([а-яё-]+) (?:(?:я|мы) )?(?:обычно |всегда )?'+C+' ([а-яё-]+(?: [а-яё-]+)?)$').exec(s);
    if(m){ var a=m[1], b=m[2];
      if(instr(a)&&!instr(b)) return {x:fromInstr(a),y:nom(b),strong:true,mk:hasMk,how:'call'};
      if(instr(b)&&!instr(a)) return {x:fromInstr(b),y:nom(a),strong:true,mk:hasMk,how:'call'};
      return {x:null,y:null,strong:true,mk:true,how:'unclear',a:a,b:b} }
    /* «у нас это называется кура» — слово человека названо, обычное — последнее записанное */
    var na=rx(D.named_as); if(na&&na.test(s)&&(strong||/^(?:это|оно|она|он)\s/.test(s))){ var xn=s.replace(na,'').trim(); if(xn&&!/\d/.test(xn)) return {x:xn,y:null,strong:true,mk:true,how:'named'} }
    if(!hasMk) return null;
    /* «это пончик, я так называю» — обычное названо, слово человека — то, что бот не узнал */
    var sy=rx(D.strip_y), y=s; while(sy&&sy.test(y)) y=y.replace(sy,'');
    y=y.trim(); if(/\d/.test(y)) return null;
    return {x:null,y:y||null,strong:true,mk:true,how:'mk'};
  }
  function recent(S,turn){ return turn!=null&&(S.turn||0)-turn<=2 }
  /* последнее, что бот не узнал: «В базе нет: «пышка»» или вопрос «что это?» */
  function missOf(S){ var wm=S.wordMiss; return wm&&wm.w&&recent(S,wm.turn)?wm:null }
  /* последняя запись в этом диалоге: что человек сказал */
  function lastSaid(S,chat){
    for(var i=(S.commits||[]).length-1;i>=0;i--){ var c=S.commits[i]; if(c.undone||!c.add||!c.add.length) continue; if(!recent(S,c.turn)) return null;
      var a=c.add[c.add.length-1], l=a.line||{};
      /* как человек сказал («курица 150 г» → «курица»), а не как бот назвал («мясо курицы») */
      var me=(chat&&chat.msgs||[]).filter(function(x){ return x.who==='me'&&typeof x.text==='string' }), prev=c.add.length===1&&me.length>=2?me[me.length-2].text:'';
      var said=clean(prev||l.raw||'').replace(/[⊙≈⊕⊘▽◇△]/g,' ').split(' ').filter(function(w){ return w&&!/\d/.test(w)&&!/^(?:г|гр|грамм[а-я]*|кг|мл|л|литр[а-я]*|шт|штук[а-я]*|съел[а-я]*|съела|поел[а-я]*|выпил[а-я]*|ел|ела)$/.test(w) }).join(' ');
      return said&&words(said).length<=3?said:clean(l.spoken||l.name||'')||null }
    return null;
  }
  function fit(D,x){ var w=words(x); return w.length>=1&&w.length<=(D.max_words_x||2)&&x.length>=2&&x.length<=30&&!/\d/.test(x) }
  function bad(D,x){ var f=rx(D.forbidden); return words(x).some(function(w){ return f&&f.test(w) }) }

  function define(chat,S,D,x,y,miss){
    x=plain(x); y=plain(y);
    if(!fit(D,x)||words(y).length>(D.max_words_y||3)) return {html:p(esc(D.too_long))};
    if(bad(D,x)) return {html:p(esc(T(D.forbidden_reply,{x:x})))};
    if(keyOf(x)===keyOf(y)) return {html:p(esc(T(D.same,{x:x,y:y})))};
    if(!known(y)) return {html:p(esc(T(D.unknown_target,{x:x,y:y})))};
    if(guard()) return {html:p(esc(D.sign_in))};
    DB.words=store()||{}; var k=keyOf(x), was=DB.words[k]||null;
    if(was&&nz(was.to)===nz(y)&&nz(was.w)===nz(x)) return {html:p(esc(T(D.saved,{x:x,y:y})))};
    if(!was&&entries().length>=(D.limit||300)) return {html:p(esc(T(D.full,{n:entries().length})))};
    var before=was?JSON.parse(JSON.stringify(was)):null, now={w:x,to:y,at:typeof todayISO==='function'?todayISO():''};
    DB.words[k]=now; RC={}; saveAll();
    var html=p(esc(was?T(D.replaced,{x:x,y:y,was:was.to}):T(D.saved,{x:x,y:y})))+undo(function(){
      var cur=(store()||{})[k]; if(!cur||JSON.stringify(cur)!==JSON.stringify(now)||guard()) return false;
      if(before) DB.words[k]=before; else delete DB.words[k]; RC={}; saveAll(); return true });
    /* сказанное раньше, которое бот не узнал, — записать теперь; вопрос «что это?» про это слово снимается */
    var rerun=null;
    if(miss&&miss.raw&&reOf(x).test(' '+nz(miss.raw)+' ')){
      var drop=(S.pend||[]).filter(function(q){ var l=q.line||{}; return (l.ask==='name'||l.st==='none')&&reOf(x).test(' '+nz(clean(l.spoken||l.name||''))+' ') });
      if(drop.length){ S.pend=S.pend.filter(function(q){ return drop.indexOf(q)<0 }); if(S.ask&&drop.indexOf(S.ask.q)>=0) S.ask=null }
      rerun=miss.raw; S.wordMiss=null;
    }
    return {html:html,rerun:rerun};
  }
  function listHTML(D){
    var L=entries().sort(function(a,b){ return a.e.w.localeCompare(b.e.w,'ru') });
    if(!L.length) return p(esc(D.list_empty));
    var top=L.slice(0,12);
    return p(esc(D.list_head))+p(top.map(function(x){ return esc(T(D.list_row,{x:x.e.w,y:x.e.to})) }).join('<br>'))
      +(L.length>top.length?p(esc(T(D.list_more,{n:L.length-top.length}))):'')
      +chips(top.map(function(x){ return ['words:forget:'+x.k,T(D.forget_btn,{x:x.e.w})] }));
  }
  function forget(D,k,label){
    var s=store(); if(!s||!s[k]) return p(esc(T(D.not_found,{x:label})));
    if(guard()) return p(esc(D.sign_in));
    var was=s[k]; delete s[k]; RC={}; saveAll();
    return p(esc(T(D.forgot,{x:was.w})))+undo(function(){ var c=store(); if(guard()||c&&c[k]) return false; DB.words=c||{}; DB.words[k]=was; RC={}; saveAll(); return true });
  }
  function findKey(x){ var k=keyOf(x), s=store()||{}; if(s[k]) return k;
    var hit=entries().filter(function(e){ var re=reOf(e.e.w); re.lastIndex=0; return re.test(' '+nz(x)+' ') })[0]; return hit?hit.k:null }

  /* фраза человека → {html, rerun} или null; m.inbox — диктовка шортката: не запоминаю */
  function say(chat,S,raw,m){
    var D=W(); if(!D||typeof raw!=='string'||typeof DB==='undefined') return null;
    var t=clean(raw); if(!t) return null;
    if(m&&m.inbox){ var pi=parse(t,D); if(!pi||!pi.strong&&!(pi.x&&pi.y&&!known(pi.x)&&known(pi.y))) return null;
      return {html:p(esc(pi.x&&pi.y?T(D.inbox,{x:pi.x,y:pi.y}):D.inbox_bare)),inbox:true} }
    /* ответ на «что значит пышка?» */
    if(S.wordAsk){ var wa=S.wordAsk; S.wordAsk=null;
      if(recent(S,wa.turn)){ var cw=rx(D.cancel_words); if(cw&&cw.test(t)) return {html:p(esc(D.cancelled))};
        var pa=parse(t,D); if(pa&&pa.x&&pa.y) return define(chat,S,D,pa.x,pa.y,wa.miss);
        var sy=rx(D.strip_y), y=pa&&pa.y||t; while(sy&&sy.test(y)) y=y.replace(sy,'');
        if(y&&!/\d/.test(y)&&known(y)) return define(chat,S,D,wa.w,y,wa.miss) } }
    if((D.list||[]).some(function(r){ var re=rx(r); return re&&re.test(t) })) return {html:listHTML(D)};
    var fa=rx(D.forget_all); if(fa&&fa.test(t)){ var n=entries().length; if(!n) return {html:p(esc(D.list_empty))}; if(guard()) return {html:p(esc(D.sign_in))};
      var all=JSON.parse(JSON.stringify(store())); DB.words={}; RC={}; saveAll();
      return {html:p(esc(T(D.forgot_all,{n:n})))+undo(function(){ if(guard()||entries().length) return false; DB.words=all; RC={}; saveAll(); return true })} }
    var fg=rx(D.forget), mf=fg&&fg.exec(t); if(mf&&entries().length){ var k=findKey(plain(mf[1]).replace(/^(?:слово|название)\s+/,'')); if(k) return {html:forget(D,k,mf[1])} }
    var r=parse(t,D); if(!r) return null;
    if(r.how==='unclear') return {html:p(esc(D.ask_word))};
    var miss=missOf(S);
    if(r.x&&r.y){
      /* без «я так называю», «запомни», «у нас»: «пышка — это пончик» — только если слово человека бот не знает, а обычное знает */
      if(!r.strong&&(known(r.x)||!known(r.y)||bad(D,r.x))) return null;
      return define(chat,S,D,r.x,r.y,miss&&reOf(plain(r.x)).test(' '+nz(miss.raw)+' ')?miss:null) }
    if(r.x&&!r.y){ var ls=lastSaid(S,chat); if(ls&&keyOf(ls)!==keyOf(r.x)&&known(ls)) return define(chat,S,D,r.x,ls,null);
      if(!fit(D,plain(r.x))) return {html:p(esc(D.too_long))};
      S.wordAsk={w:plain(r.x),turn:S.turn||0,miss:null}; return {html:p(esc(T(D.ask_target,{x:plain(r.x)})))} }
    if(!r.x&&r.y){ if(miss) return define(chat,S,D,miss.w,r.y,miss);
      var ls2=lastSaid(S,chat); if(ls2&&keyOf(ls2)!==keyOf(r.y)&&!known(ls2)) return define(chat,S,D,ls2,r.y,null);
      return {html:p(esc(D.ask_word))} }
    /* одно «я так называю»: слово — то, что бот не узнал или что записал последним; обычное название спрошу */
    var w=miss?miss.w:lastSaid(S,chat);
    if(!w) return {html:p(esc(D.ask_word))};
    if(!fit(D,w)) return {html:p(esc(D.too_long))};
    S.wordAsk={w:w,turn:S.turn||0,miss:miss}; return {html:p(esc(T(D.ask_target,{x:w})))};
  }
  function tap(chat,S,a){
    var D=W(); if(!D) return null;
    if(a[1]==='forget'&&a[2]){ var k=a.slice(2).join(':'); return forget(D,k,k) }
    return null;
  }
  return {apply:apply,say:say,tap:tap,list:function(){ return entries().map(function(x){ return {word:x.e.w,to:x.e.to} }) }};
})();
