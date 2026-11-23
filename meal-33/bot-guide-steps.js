/* Happy Meal · шаги бота-гида (слой 3, Астамур 23.11.2026, «Да, всё по порядку А–Г»): фастинг по схеме, счётчик и
   время приёмов пищи — вопросом с кнопками на общем механизме bot-steps.js; ответить можно и словами или голосом.
   Записывают то же и так же, что экраны: фастинг — MealFast.record и DB.mealRules (как «Настроить приёмы пищи»),
   счётчик — DB.taps (как окно счётчика), время приёмов — MealPeriods.draft/moveEdge/apply (как экран приёмов).
   После сохранения — кнопка «Отменить» (MealBot.undoChip). Слова и ответы — словарь bot/household-ru.js, раздел guide_steps.
   — Claude · 23.11.2026 */
var MealBotGuide=(function(){
  if(typeof MealBotSteps==='undefined') return null;
  var M=MealBotSteps, p=M.p, esc=M.esc;
  function G(){ return (window.HappyMealSpeechData||{}).guide_steps||{} }
  function rx(s){ try{ return s?new RegExp(s):null }catch(e){ return null } }
  function T(s,v){ return String(s||'').replace(/\{(\w+)\}/g,function(m,k){ return v&&v[k]!=null?v[k]:'' }) }
  function nt(text){ return String(text||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"“”?!,…]+/g,' ').replace(/\s+/g,' ').trim() }
  function ck(m){ return MealPeriods.clock(m) }
  function snap(m){ return Math.round(m/15)*15 }
  function guard(){ try{ return typeof writeGuard==='function'&&writeGuard() }catch(e){ return true } }
  function signIn(){ return {html:p('Чтобы сохранить, войди в аккаунт. Потом нажми «Сохранить» ещё раз.'),keep:true} }
  function touch(){ try{ save() }catch(e){} try{ if(typeof renderAll==='function') renderAll() }catch(e){} }
  function undo(fn){ return window.MealBot&&MealBot.undoChip?MealBot.undoChip(fn):'' }
  function note(){ var n=G().undo_note; return n?'<p class="mlHint">'+esc(n)+'</p>':'' }
  function cap(s){ s=String(s||''); return s.charAt(0).toUpperCase()+s.slice(1) }
  /* время словами: «12:30», «в 12», «в восемь вечера», «полдень» → минуты от полуночи, шаг 15 минут; нет — null */
  function timeOf(text){
    var t=nt(text), W=G().time_words||{}, m, h;
    for(var k in W) if(new RegExp('(^|\\s)'+k+'(\\s|$)').test(t)) return W[k];
    if((m=t.match(/(?:^|\D)(\d{1,2})[:.](\d{2})(?!\d)/))){ h=+m[1]; var mi=+m[2]; if(h>24||mi>59||h===24&&mi) return null; return snap(h*60+mi) }
    var ns=M.numbers(t).filter(function(n){ return n>=0&&n<=24 }); if(!ns.length) return null;
    h=ns[ns.length-1]; if(/(вечера|дня)(\s|$)/.test(t)&&h<12) h+=12; if(/ночи(\s|$)/.test(t)&&h===12) h=0;
    return snap(h*60);
  }

  /* ═══════ фастинг по схеме: часы без еды → когда первая еда → дни ═══════ */
  var DAYS={all:[1,2,3,4,5,6,7],work:[1,2,3,4,5],weekend:[6,7]}, DAYS_T={all:'каждый день',work:'по будням',weekend:'по выходным'};
  function curHours(){ try{ var f=MealPeriods.rules(DB).fast; return Math.round(MealPeriods.duration(f)/60) }catch(e){ return 16 } }
  function hoursIn(text){ var ns=M.numbers(text).filter(function(n){ return n===Math.floor(n) }); if(!ns.length) return null; return ns[0] }
  function fastWin(v){ return {a:((v.end-v.hours*60)%1440+1440)%1440,b:v.end} }
  var fast=M.define({
    id:'fast', title:'Фастинг',
    start:function(text){
      if(typeof MealFast==='undefined'||typeof MealPeriods==='undefined') return null;
      var t=nt(text).replace(/[.]+$/,''), F=G().fast||{}, m=t.match(rx(F.start)), init={};
      if(!m){ var s=t.match(rx(F.start_scheme)); if(!s) return null;
        var h=hoursIn(s[1]); if(h==null||h<12||h>23||h===curHours()) return null;   // та же схема — просто включить (короткая команда)
        init.hours=h; return init }
      var h2=m[1]&&hoursIn(m[1]); if(h2>=12&&h2<=23) init.hours=h2;
      return init;
    },
    steps:[
      { key:'hours', label:'Часы без еды',
        ask:function(){ var F=G().fast||{}; return {text:esc(F.ask_hours),chips:F.hours_chips||[]} },
        parse:function(text){ var h=hoursIn(text); if(h==null) return null; if(h<12||h>23) return {error:esc((G().fast||{}).bad_hours)}; return {hours:h} },
        chip:function(v){ return {hours:+v} } },
      { key:'end', label:'Первая еда',
        ask:function(){ var F=G().fast||{}; return {text:esc(F.ask_end),chips:F.end_chips||[]} },
        parse:function(text){ var m=timeOf(text); if(m==null) return /\d/.test(text)?{error:esc((G().fast||{}).bad_time)}:null; return {end:m%1440} },
        chip:function(v){ return {end:+v} } },
      { key:'days', label:'Дни',
        ask:function(){ var F=G().fast||{}; return {text:esc(F.ask_days),chips:F.days_chips||[]} },
        parse:function(text){ var k=M.pick(text,(G().fast||{}).days); return k?{days:k}:null } }
    ],
    summary:function(st){ var w=fastWin(st.v); return {text:p(T((G().fast||{}).summary,{h:st.v.hours,a:ck(w.a),b:ck(w.b),days:DAYS_T[st.v.days]}))} },
    save:function(st){
      if(guard()) return signIn();
      var R=MealPeriods.rules(DB), w=fastWin(st.v), now=Date.now(), before=JSON.stringify(DB.mealRules||null);
      var nf={on:true,a:w.a,b:w.b,d:DAYS[st.v.days].slice()}, hist=MealFast.record(DB,nf,now);
      DB.mealRules=Object.assign({kcal:R.kcal,gap:R.gap},DB.mealRules||{},{fast:nf,fastVersions:hist}); touch();
      var after=JSON.stringify(DB.mealRules), sn=''; try{ sn=MealFast.startNote?MealFast.startNote(now):'' }catch(e){}
      return p(esc(T((G().fast||{}).saved,{a:ck(w.a),b:ck(w.b),days:DAYS_T[st.v.days]})))+(sn?'<p class="mlHint">'+esc(sn.replace(/\.?$/,'.'))+'</p>':'')+
        undo(function(){ if(JSON.stringify(DB.mealRules)!==after) return false; DB.mealRules=JSON.parse(before); if(!DB.mealRules) delete DB.mealRules; touch(); return true });
    },
    cancelled:(G().fast||{}).cancelled||'Хорошо, фастинг не менял.'
  });
  fast.fields={hours:['часы','схему','схема'],end:['первая еда','первую еду','время еды'],days:['дни','день недели']};

  /* ═══════ счётчик: продукт → порция → где показывать → название ═══════ */
  function foodOf(text){ return window.MealBot&&MealBot.foodOf?MealBot.foodOf(text):null }
  function fname(fid){ var f=FOODS[fid]; return f?f.n:'' }
  function shortName(fid){ return cap(fname(fid).split(/[,(]/)[0].trim()).slice(0,40) }
  function unitOk(fid,u){ var f=FOODS[fid]; return u==='г'||!!(f&&f.por&&f.por[u]>0) }
  function grams(fid,q,u){ try{ return typeof gramsFor==='function'?gramsFor(fid,q,u):(u==='г'?q:0) }catch(e){ return u==='г'?q:0 } }
  function portionText(v){ var u=v.u==='г'?'г':(typeof uLab==='function'?uLab(v.food,v.q,v.u):v.u); return String(v.q).replace('.',',')+' '+u+(v.u==='г'?'':' ('+Math.round(v.g)+' г)') }
  function portionIn(fid,text){
    var t=nt(text), f=FOODS[fid]||{}, ns=M.numbers(t), q=ns.length?ns[0]:null, u=null;
    Object.keys(f.por||{}).forEach(function(k){ if(u||!(f.por[k]>0)) return; var st=k.toLowerCase().replace(/ё/g,'е').slice(0,Math.max(2,Math.min(5,k.length-1)));
      if(t.split(' ').some(function(w){ return w.indexOf(st)===0 })) u=k });
    if(!u&&/(^|\s|\d)(г|гр|грамм\S*|мл|миллилитр\S*)(\s|$)/.test(t)) u='г';
    if(!u&&q!=null&&q>=5) u='г';
    if(!u) return null;
    if(q==null) q=1;
    if(!(q>0&&q<=5000)) return null;
    var g=grams(fid,q,u); if(!(g>0)) return null;
    return {q:q,u:u,g:g};
  }
  function taken(t){ try{ return typeof nameTaken==='function'?nameTaken(DB.taps||[],t):(DB.taps||[]).some(function(c){ return String(c.t).toLowerCase()===String(t).toLowerCase() }) }catch(e){ return false } }
  function freeName(t){ if(!taken(t)) return t; for(var i=2;i<20;i++) if(!taken(t+' '+i)) return t+' '+i; return t }
  var counter=M.define({
    id:'counter', title:'Счётчик',
    start:function(text){
      if(!Array.isArray((typeof DB!=='undefined'&&DB.taps)||null)) return null;
      var m=nt(text).replace(/[.]+$/,'').match(rx((G().counter||{}).start)); if(!m) return null;
      var said=(m[1]||'').trim(); if(!said) return true;
      var r=foodOf(said); return r&&r.fid?{food:r.fid}:{said:said};
    },
    steps:[
      { key:'food', label:'Продукт', noEdit:false,
        ask:function(st){ var C=G().counter||{}, r=st.v.said?foodOf(st.v.said):null;
          if(r&&r.alts) return {text:esc(C.pick),chips:r.alts.map(function(id){ return [id,fname(id)] })};
          return {text:esc(C.ask_food),hint:'Скажи название, например «кофе» или «вода».'} },
        parse:function(text){ var C=G().counter||{}, r=foodOf(text);
          if(!r) return {error:esc(T(C.none,{food:text}))};
          if(r.fid) return {food:r.fid};
          return {error:esc(C.pick),chips:r.alts.map(function(id){ return ['food:'+id,fname(id)] })} },
        chip:function(v){ return FOODS[v]?{food:v}:null } },
      { key:'portion', label:'Порция', numeric:true,
        ask:function(st){ var f=FOODS[st.v.food]||{}, ch=Object.keys(f.por||{}).filter(function(k){ return f.por[k]>0 }).slice(0,3).map(function(k){ return ['1|'+k,'1 '+(typeof uLab==='function'?uLab(st.v.food,1,k):k)] });
          return {text:esc((G().counter||{}).ask_portion),chips:ch.concat([['100|г','100 г'],['200|г','200 г']])} },
        parse:function(text,st){ var r=portionIn(st.v.food,text); if(!r) return /\d/.test(text)?{error:esc((G().counter||{}).bad_portion)}:null; return {portion:r,q:r.q,u:r.u,g:r.g} },
        chip:function(v,st){ var a=String(v).split('|'), q=+a[0], u=a[1]; if(!unitOk(st.v.food,u)) return null; var g=grams(st.v.food,q,u); return g>0?{portion:{q:q,u:u,g:g},q:q,u:u,g:g}:null } },
      { key:'where', label:'Где показывать',
        ask:function(){ var C=G().counter||{}; return {text:esc(C.ask_where),chips:C.where_chips||[]} },
        parse:function(text){ var k=M.pick(text,(G().counter||{}).where); return k?{where:k}:null } },
      { key:'title', label:'Название',
        ask:function(st){ var d=freeName(shortName(st.v.food)); return {text:esc((G().counter||{}).ask_title),chips:[['@title','«'+d+'»']]} },
        parse:function(text){ var t=cap(String(text||'').trim().replace(/^(назови|назовем|название|пусть будет)\s+/i,'').replace(/[.!]+$/,'')).slice(0,40); if(!t) return null;
          if(taken(t)) return {error:esc(T((G().counter||{}).taken,{t:t}))}; return {title:t} } }
    ],
    command:function(name,st){ if(name==='title') return {set:{title:freeName(shortName(st.v.food))}}; return null },
    summary:function(st){ var v=st.v, f=FOODS[v.food]||{}, k=f.k!=null?Math.round(f.k*v.g/100):'?', C=G().counter||{};
      return {text:p(T(C.summary,{t:esc(v.title),portion:esc(portionText(v)),k:k,where:esc((C.where_text||{})[v.where]||'')}))} },
    save:function(st){
      if(guard()) return signIn();
      var v=st.v; if(taken(v.title)) return {html:p(esc(T((G().counter||{}).taken,{t:v.title}))),keep:true};
      if(String(v.food).indexOf('bls:')===0&&typeof blsUse==='function') blsUse(v.food);
      var c={k:'p'+MealData.id(),t:v.title,fid:v.food,q:v.q,u:v.u,g:v.g,libraryConfirmed:true};
      if(v.where&&v.where!=='none') c.targets={day:v.where==='day'||v.where==='both',sport:v.where==='sport'||v.where==='both'};
      DB.taps=DB.taps||[]; DB.taps.push(c); touch(); try{ if(window.HappyMealCounters&&HappyMealCounters.neighbors) HappyMealCounters.neighbors() }catch(e){}
      return p(esc(T((G().counter||{}).saved,{t:v.title})))+undo(function(){ var i=DB.taps.indexOf(c); if(i<0) return false; DB.taps.splice(i,1); touch(); try{ HappyMealCounters.neighbors() }catch(e){} return true });
    },
    cancelled:(G().counter||{}).cancelled||'Хорошо, счётчик не завёл.'
  });
  counter.fields={food:['продукт'],portion:['порцию','порция'],where:['показ','где показывать'],title:['название','назови']};

  /* ═══════ время приёмов пищи: какой приём → с какого → до какого; соседние сдвигаются ═══════ */
  function rowsNow(){ return MealPeriods.draft(DB,Date.now()) }
  function rowOf(text,rows){ var ws=nt(text).split(' ');
    return (rows||rowsNow().rows).filter(function(r){ var n=nt(r.t), st=n.slice(0,Math.max(3,Math.min(5,n.length-1))); return ws.some(function(w){ return w.indexOf(st)===0 })||(' '+nt(text)+' ').indexOf(' '+n+' ')>=0 })[0]||null }
  function edge(d,i,e){ return i>=0&&!!MealPeriods.limits(d.rows,i,e).other }   // у края есть сосед — край можно двигать
  function idx(d,k){ for(var i=0;i<d.rows.length;i++) if(d.rows[i].k===k) return i; return -1 }
  /* черновик с новым временем; ошибка — {error} */
  function moved(v){
    var d=rowsNow(), i=idx(d,v.row); if(i<0) return {error:'Такого приёма больше нет.'};
    var r=d.rows[i], P=G().period||{};
    if(v.a!=null&&v.a!==r.a){ var L=MealPeriods.limits(d.rows,i,'a'); if(!L.other) return {error:esc(T(P.fixed_a,{t:r.t,a:ck(r.a)}))}; if(v.a<L.min||v.a>L.max) return {error:esc(T(P.limit,{t:r.t,min:ck(L.min),max:ck(L.max)}))}; MealPeriods.moveEdge(d.rows,i,'a',v.a) }
    if(v.b!=null&&v.b!==r.b){ var L2=MealPeriods.limits(d.rows,i,'b'); if(!L2.other) return {error:esc(T(P.fixed_b,{t:r.t,b:ck(r.b)}))}; if(v.b<L2.min||v.b>L2.max) return {error:esc(T(P.limit_b,{t:r.t,min:ck(L2.min),max:ck(L2.max)}))}; MealPeriods.moveEdge(d.rows,i,'b',v.b) }
    return d;
  }
  function rangeIn(text){ var t=nt(text), a=null, b=null, m;
    if((m=t.match(/(?:^|\s)(?:с|со)\s+(.+?)(?=\s+до\s|$)/))) a=timeOf(m[1]);
    if((m=t.match(/(?:^|\s)до\s+(.+)$/))) b=timeOf(m[1]);
    if(a==null&&b==null&&(m=t.match(/(?:^|\s)(?:на|в|к)\s+(.+)$/))) a=timeOf(m[1]);
    if(a==null&&b==null) return null;
    if(b===0) b=1440;
    return {a:a,b:b} }
  var period=M.define({
    id:'period', title:'Время приёмов пищи',
    start:function(text){
      if(typeof MealPeriods==='undefined'||!MealPeriods.draft) return null;
      var t=nt(text).replace(/[.]+$/,''), P=G().period||{}, m=t.match(rx(P.start_meal));
      if(m){ var r=rowOf(m[1]); if(!r) return null; var g=rangeIn(m[2]); if(!g) return null;
        var d0=rowsNow(), i0=idx(d0,r.k), init={row:r.k};
        if(g.a!=null&&edge(d0,i0,'a')) init.a=g.a; if(g.b!=null&&edge(d0,i0,'b')) init.b=g.b;
        if(init.a==null) init.a=r.a; if(init.b==null) init.b=r.b;   // последний приём суток кончается в полночь: «до 23» у ужина не меняется
        return init }
      return t.match(rx(P.start))?true:null;
    },
    steps:[
      { key:'row', label:'Приём',
        ask:function(){ return {text:esc((G().period||{}).ask_row),chips:rowsNow().rows.map(function(r){ return [r.k,r.t] })} },
        parse:function(text){ var r=rowOf(text); return r?{row:r.k}:null },
        chip:function(v){ return idx(rowsNow(),v)>=0?{row:v}:null } },
      { key:'a', label:'Начало', numeric:true, when:function(st){ var d=rowsNow(); return edge(d,idx(d,st.v.row),'a') },
        ask:function(st){ var d=rowsNow(), r=d.rows[idx(d,st.v.row)]||{}; return {text:esc(T((G().period||{}).ask_a,{t:r.t,a:ck(r.a),b:ck(r.b)})),chips:[['@keepa',T((G().period||{}).keep,{v:ck(r.a)})]]} },
        parse:function(text,st){ var m=timeOf(text); if(m==null) return /\d/.test(text)?{error:esc((G().period||{}).bad_time)}:null; var d=moved({row:st.v.row,a:m}); return d.error?{error:d.error}:{a:m} } },
      { key:'b', label:'Конец', numeric:true, when:function(st){ var d=rowsNow(); return edge(d,idx(d,st.v.row),'b') },
        ask:function(st){ var d=moved({row:st.v.row,a:st.v.a}), r=d.rows?d.rows[idx(d,st.v.row)]:{}; return {text:esc(T((G().period||{}).ask_b,{t:r.t})),chips:[['@keepb',T((G().period||{}).keep,{v:ck(r.b)})]]} },
        parse:function(text,st){ var m=timeOf(text); if(m==null) return /\d/.test(text)?{error:esc((G().period||{}).bad_time)}:null; if(m===0) m=1440; var d=moved({row:st.v.row,a:st.v.a,b:m}); return d.error?{error:d.error}:{b:m} } }
    ],
    command:function(name,st){
      var d=moved({row:st.v.row,a:st.v.a}); if(d.error) return p(d.error);
      var r=d.rows[idx(d,st.v.row)];
      if(name==='keepa') return {set:{a:rowsNow().rows[idx(rowsNow(),st.v.row)].a}};
      if(name==='keepb') return {set:{b:r.b}};
      return null;
    },
    summary:function(st){
      var d=moved(st.v), P=G().period||{}; if(d.error) return {text:p(d.error),chips:[['@edit','Поправить'],['@cancel','Отмена']]};
      var old=rowsNow().rows, was={}; old.forEach(function(r){ was[r.k]=r.a+'-'+r.b });
      return {text:p(esc(P.summary))+'<p class="mbSum">'+d.rows.map(function(r){ var ch=was[r.k]!==r.a+'-'+r.b;
        return (r.k===st.v.row?'<b>':'')+esc(r.t)+' '+ck(r.a)+'–'+ck(r.b)+(r.k===st.v.row?'</b>':'')+(ch&&r.k!==st.v.row?' · '+esc(P.moved):'') }).join('<br>')+'</p>'};
    },
    save:function(st){
      if(guard()) return signIn();
      var d=moved(st.v); if(d.error) return {html:p(d.error),keep:true};
      var before=JSON.stringify({s:DB.sections||null,r:DB.mealRules||null});
      var used=function(key){ return Object.keys(DB.days||{}).some(function(x){ return ((DB.days[x]||{}).items||[]).some(function(it){ return it.sec===key }) }) };
      MealPeriods.apply(DB,d,used,typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10)); touch();
      var after=JSON.stringify({s:DB.sections||null,r:DB.mealRules||null});
      return p(esc((G().period||{}).saved))+undo(function(){ if(JSON.stringify({s:DB.sections||null,r:DB.mealRules||null})!==after) return false; var o=JSON.parse(before); DB.sections=o.s; if(o.r) DB.mealRules=o.r; else delete DB.mealRules; touch(); return true });
    },
    cancelled:(G().period||{}).cancelled||'Хорошо, время приёмов не менял.'
  });
  period.fields={a:['начало','с какого'],b:['конец','до какого'],row:['приём']};

  /* ═══════ базы продуктов (звено первой настройки): какие включить кроме немецкой ═══════ */
  var CATS={usda:{USDA:true},asia:{MEXT:true,KFCT:true},all:{USDA:true,MEXT:true,KFCT:true}};
  function catSet(id,on){ if(!MealSources.setEnabled(DB,id,on)) return false; var L={USDA:'MealUSDA',KFCT:'MealKfct'}[id]; if(on&&L&&window[L]&&window[L].load) try{ window[L].load() }catch(e){} return true }
  M.define({
    id:'catalogs', title:'Базы продуктов',
    start:function(){ return null },   // только звеном цепочки; одной фразой — короткая команда «включи американскую базу»
    steps:[{ key:'set', label:'Базы',
      ask:function(){ var C=G().catalogs||{}; return {text:esc(C.ask),chips:C.chips||[]} },
      parse:function(text){ var k=M.pick(text,(G().catalogs||{}).words); return k?{set:k}:null } }],
    summary:function(st){ var C=G().catalogs||{}; return {text:p(esc((C.text||{})[st.v.set]||''))} },
    save:function(st){
      if(st.v.set==='keep') return p(esc((G().catalogs||{}).kept||'Базы оставил как есть.'));
      if(guard()) return signIn();
      var want=CATS[st.v.set]||{}, before=JSON.stringify(DB.foodSources||null);
      ['USDA','MEXT','KFCT'].forEach(function(id){ if(MealSources.enabled(DB,id)!==!!want[id]) catSet(id,!!want[id]) });
      try{ if(typeof rebuildLib==='function') rebuildLib() }catch(e){} touch();
      var after=JSON.stringify(DB.foodSources||null);
      return p(esc((G().catalogs||{}).saved))+undo(function(){ if(JSON.stringify(DB.foodSources||null)!==after) return false; DB.foodSources=JSON.parse(before); if(!DB.foodSources) delete DB.foodSources; try{ rebuildLib() }catch(e){} touch(); return true });
    },
    cancelled:'Хорошо, базы не менял.'
  });


  /* ═══════ рецепт шагами (слой 3 · Г): название → состав словами → итог; сохраняется в «Мои рецепты», как кнопка «Сохранить» ═══════ */
  function kcalOf(ls){ return Math.round(ls.reduce(function(a,l){ var f=FOODS[l.fid]; return a+(f&&f.k!=null?f.k*l.g/100:0) },0)) }
  function linesIn(text){
    var ls=window.MealBot&&MealBot.linesOf?MealBot.linesOf(text):null; if(!ls||!ls.length) return null;   // тот же разбор, что у еды: общее слово — обычный выбор («молоко» → 2,5 %)
    var bad=ls.filter(function(l){ return !l.fid||!(l.g>0) });
    if(bad.length) return {error:esc(T((G().recipe||{}).bad_lines,{w:bad.map(function(l){ return l.name||'?' }).join(', ')}))};
    return {lines:ls.map(function(l){ return {fid:l.fid,q:l.q,u:l.u,g:l.g} })};
  }
  function recipeName(v){ var n=String(v.name||'').trim(); return n?cap(n):(typeof autoName==='function'?autoName(v.lines):'Мой рецепт') }
  M.define({
    id:'recipe', title:'Рецепт',
    start:function(text){ var m=nt(text).replace(/[.]+$/,'').match(rx((G().recipe||{}).start)); if(!m) return null;
      var n=(m[1]||'').replace(/^(?:под названием|с названием|называется|название)\s+/,'').trim(); return n?{name:n}:true },
    steps:[
      { key:'name', label:'Название', optional:true,
        ask:function(){ var R=G().recipe||{}; return {text:esc(R.ask_name),chips:[['@auto',R.auto_name||'Назови по продуктам']]} },
        parse:function(text){ var t=String(text||'').trim().replace(/[.!]+$/,'').slice(0,60); return t?{name:t}:null } },
      { key:'lines', label:'Состав',
        ask:function(){ var R=G().recipe||{}; return {text:esc(R.ask_lines),hint:esc(R.hint_lines||'')} },
        parse:function(text){ return linesIn(text) } }
    ],
    command:function(name){ if(name==='auto') return {set:{name:''}}; return null },
    summary:function(st){ var v=st.v;
      return {text:p(T((G().recipe||{}).summary,{t:esc(recipeName(v)),k:kcalOf(v.lines)}))+'<div class="mlRows">'+v.lines.map(function(l){ return window.MealBot&&MealBot.rowHTML?MealBot.rowHTML(l):esc(fname(l.fid)+' '+l.g+' г') }).join('')+'</div>'} },
    save:function(st){
      if(guard()) return signIn();
      var v=st.v, r={id:'my'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),t:recipeName(v),lines:v.lines.map(function(l){ return {fid:l.fid,q:l.q,u:l.u,g:l.g} }),ts:Date.now()};
      DB.recipes=DB.recipes||[]; DB.recipes.unshift(r); touch(); try{ if(typeof renderMine==='function') renderMine() }catch(e){}
      return p(esc(T((G().recipe||{}).saved,{t:r.t})))+undo(function(){ var i=(DB.recipes||[]).indexOf(r); if(i<0) return false; DB.recipes.splice(i,1); touch(); try{ renderMine() }catch(e){} return true });
    },
    cancelled:(G().recipe||{}).cancelled||'Хорошо, рецепт не сохранил.'
  });

  /* ═══════ БАД шагами (слой 3 · Г): какая добавка → своя уже есть — записать приём; есть шаблон в каталоге — открыть
     «БАДы»; нет нигде — открыть «Добавить». Свою добавку по этикетке заводят на экране: там состав и меры ═══════ */
  function supFind(t){ return window.MealBot&&MealBot.supFind?MealBot.supFind(t):null }
  function openSupp(){ setTimeout(function(){ try{ MealBot.tap('go:supplements','') }catch(e){} },60) }
  M.define({
    id:'supp', title:'БАД',
    start:function(text){
      if(typeof HappySupplements==='undefined') return null;
      var t=nt(text).replace(/[.]+$/,''), m=t.match(rx((G().supp||{}).start)); if(!m) return null;
      if(/\d/.test(t)&&/(капсул|таблет|драже|мерн|скуп|саше)/.test(t)) return null;   // «добавь магний 2 таблетки» — приём, не новая добавка
      var said=(m[1]||'').trim(); return said?{name:said}:true },
    steps:[{ key:'name', label:'Добавка',
      ask:function(){ return {text:esc((G().supp||{}).ask_name)} },
      parse:function(text){ var t=String(text||'').trim(); return t?{name:t}:null } }],
    summary:function(st){
      var U=G().supp||{}, f=supFind(st.v.name)||{none:st.v.name};
      if(f.variant){ var ms=HappySupplementsModel.measureOptions(f.variant)[0]; st.v._v=f.variant.id; st.v._m=ms&&ms.id;
        return {text:p(esc(T(U.mine,{n:f.variant.name,m:ms?ms.name:''}))),chips:[['@log',T(U.log_button,{m:ms?ms.name:''})],['@open','Открыть «БАДы»'],['@cancel','Не надо']]} }
      if(f.template) return {text:p(esc(T(U.template,{n:f.template.name}))),chips:[['@open','Открыть «БАДы»'],['@cancel','Не надо']]};
      return {text:p(esc(T(U.none,{n:f.none||st.v.name}))),chips:[['@open','Открыть «БАДы»'],['@cancel','Не надо']]};
    },
    command:function(name,st,S){
      var U=G().supp||{};
      if(name==='open'){ S.steps=null; openSupp(); return p(esc(U.opened||'Открываю «БАДы».')) }
      if(name==='log'){ if(guard()) return p('Чтобы записать, войди в аккаунт.'); S.steps=null;
        try{ HappySupplements.logIntake({variantId:st.v._v,quantity:1,measureId:st.v._m,date:typeof curDate!=='undefined'?curDate:null,time:null,section:typeof autoSec==='function'?autoSec():null}).catch(function(e){ try{ toast(e.message) }catch(_){} }) }catch(e){ return p(esc(e.message)) }
        return p(esc(U.logged||'Записал приём.')) }
      return null;
    },
    save:function(){ return '' },
    cancelled:(G().supp||{}).cancelled||'Хорошо.'
  });
  /* ═══════ первая настройка цепочкой (слой 3 · В): цель → приёмы пищи → фастинг → базы → счётчик. После каждого звена —
     «Дальше: …» (механизм) и «Пропустить …» — следующее звено можно пропустить ═══════ */
  var CHAIN=['goals','period','fast','catalogs','counter'];
  CHAIN.forEach(function(id,i){
    var fl=M.flow(id), nx=CHAIN[i+1], nn=CHAIN[i+2]; if(!fl||!nx) return;
    fl.next=nx;
    if(!nn||fl._chained) return; fl._chained=true;
    var sv=fl.save;
    fl.save=function(st){ var r=sv.apply(fl,arguments), keep=r&&typeof r==='object'&&r.keep, h=r&&typeof r==='object'?r.html:r||'';
      if(keep) return r;
      var nf=M.flow(nx), nnf=M.flow(nn); if(!nf||!nnf) return r;
      return h+M.chips([['st:'+nn+':@start',T((G().chain||{}).skip,{t:nf.title,n:nnf.title})]]);
    };
  });
  return {timeOf:timeOf,portionIn:portionIn};
})();
