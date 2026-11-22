/* Happy Meal · пошаговые вопросы в чате бота (мастера): вопрос, под ним кнопки, ответить можно и словами или голосом.
   Сценарий только описывает шаги, механизм ведёт разговор: «назад», «пропусти», «отмена», «поправь рост», «да, сохрани»,
   кнопки старых вопросов, еду посреди вопросов (еда пишется как обычно, вопрос повторяется). Без ИИ: правила и словарь.
   Общие слова (назад, отмена, да…) — словарь bot/household-ru.js, раздел chat_steps; слова сценария — его раздел там же.
   Решение Астамура 22.11.2026: мастер целей — первый сценарий; свой продукт и гид по функциям строятся поверх.

   MealBotSteps.define({
     id:'goals', title:'Цели',
     start(text) → начальные значения {…} или null — фраза запускает сценарий (вызывается, пока сценарий не идёт);
     steps:[{ key, label,                      // label — подпись кнопки «Поправить: …»
              when(st) → bool,                  // нужен ли шаг (нет — пропускается); по умолчанию нужен
              ask(st) → {text, chips:[[значение, подпись]…], hint},
              parse(text, st) → null | {поле: значение, …} | {error:'html'},   // можно сразу несколько полей
              chip(value, st) → {поле: значение, …},                            // по умолчанию {key: value}
              optional:true,                    // «пропусти» ставит null и идёт дальше
              numeric:true,                     // ответ — число: сообщение с едой («банан 120 г») идёт мимо, в дневник
              // parse может вернуть {error, chips:[['@команда','подпись']]} — объяснение и кнопки над повтором вопроса
              noEdit:true }],                   // не показывать в «Поправить»
     summary(st) → {text, chips} ,              // итог: по умолчанию кнопки «Сохранить · Поправить · Отмена»
     save(st) → html | {html, keep:true},       // запись делает сценарий; keep — остаться в итоге (например, нужен вход)
     command(имя, st, S) → html | {set:{…}},    // свои кнопки «@имя»; {set} — поставить поля и идти дальше
     any(text, st) → {set:{…}} | null,          // ответ, который годится на любом шаге (смена цели посреди вопросов)
     next:'id',                                 // после сохранения — кнопка «Дальше: <title>», если такой сценарий есть
     cancelled:'текст при отмене' });
   MealBotSteps.start(chat, id, init) → html — запуск из другого места (кнопка, другой сценарий).
   st: {id, v:{поле: значение}, src:{поле: 'said'|'known'}, cur, mode:'ask'|'summary'|'edit', hist:[]}.
   v[поле] === undefined — ещё не известно; null — пропущено.
   — Claude · 22.11.2026 */
var MealBotSteps=(function(){
  var FLOWS={}, ORDER=[];
  function D(){ return (window.HappyMealSpeechData||{}) }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] }) }
  function p(s){ return '<p>'+s+'</p>' }
  function chips(list){ return list&&list.length?'<div class="mbChips">'+list.map(function(c){ return '<button class="chip" data-bot="'+esc(c[0])+'">'+esc(c[1])+'</button>' }).join('')+'</div>':'' }

  /* ── слова ── */
  function words(text){ return String(text||'').toLowerCase().replace(/ё/g,'е').replace(/(\d)[.,](\d)/g,'$1‚$2').replace(/[^a-zа-я0-9‚\s-]+/g,' ').replace(/‚/g,',').split(/\s+/).filter(Boolean) }
  function wordOk(pat,w){ pat=pat.replace(/ё/g,'е'); return /\*$/.test(pat)?w.indexOf(pat.slice(0,-1))===0:w===pat }
  /* последнее совпадение из списка фраз: {at, end, phrase}; перед «не» — не считается */
  function find(text,list){
    var FIL=(D().chat_steps||{}).fillers||[], keep=function(w){ return FIL.indexOf(w)<0 };
    var ws=(Array.isArray(text)?text:words(text)).filter(keep), best=null;
    (list||[]).forEach(function(ph){
      var pw=String(ph).toLowerCase().replace(/ё/g,'е').split(/\s+/).filter(Boolean).filter(keep); if(!pw.length) return;
      for(var i=0;i+pw.length<=ws.length;i++){
        var ok=true; for(var j=0;j<pw.length&&ok;j++) ok=wordOk(pw[j],ws[i+j]);
        if(!ok||pw[0]!=='не'&&(ws[i-1]==='не'||ws[i-2]==='не'&&/^(хочу|хотим|надо|нужно|буду|стану|собираюсь|планирую)$/.test(ws[i-1]))) continue;
        var end=i+pw.length;
        if(!best||end>best.end||end===best.end&&pw.length>best.len) best={at:i,end:end,len:pw.length,phrase:ph};
      }
    });
    return best;
  }
  /* из словаря вида {значение:[фразы]} — значение, сказанное последним */
  function pick(text,map){
    var best=null; Object.keys(map||{}).forEach(function(k){ var f=find(text,map[k]); if(f&&(!best||f.end>best.f.end||f.end===best.f.end&&f.len>best.f.len)) best={k:k,f:f} });
    return best?best.k:null;
  }
  function only(text,list){ var ws=words(text), f=find(ws,list); return !!f&&ws.length-f.len<=1 }   // фраза — почти всё сообщение
  /* числа: «82», «82,5», «восемьдесят два с половиной», «тысяча восемьсот», «80, нет, 82» → все по порядку */
  function numbers(text){
    var N=D().numbers||{}, C=N.cardinals||{}, SC=N.scales||{}, ws=words(text), out=[], cur=null, part=0;
    function flush(){ if(cur!=null){ out.push(cur+part); cur=null; part=0 } }
    for(var i=0;i<ws.length;i++){
      var w=ws[i];
      if(/^\d+(,\d+)?$/.test(w)){ flush(); out.push(parseFloat(w.replace(',','.'))); continue }
      if(/^\d+(,\d+)?[a-zа-я]+$/.test(w)){ flush(); out.push(parseFloat(w.replace(',','.'))); continue }   // «82кг»
      if(C[w]!=null&&!/^(пару|пара|парочка|парочку|десяток|дюжина|дюжину)$/.test(w)){
        var v=C[w]; if(cur==null){ cur=0; part=0 }
        if(v>=100){ part+=v } else if(v>=20&&part%100===0){ part+=v } else if(v<20&&part%10===0){ part+=v } else { flush(); cur=0; part=v }
        continue }
      if(SC[w]!=null){ var base=cur==null?1:(cur+part||1); cur=base*SC[w]; part=0; continue }
      if((w==='с'||w==='и')&&/^половин/.test(ws[i+1]||'')){ if(cur!=null) part+=0.5; else if(out.length) out[out.length-1]+=0.5; i++; continue }
      if(w==='половиной'||w==='половинкой'){ continue }
      if(cur!=null&&/^(кг|килограм\S*|кило|см|сантиметр\S*|ккал|калори\S*|лет|год\S*)$/.test(w)){ flush(); continue }
      flush();
    }
    flush();
    return out;
  }

  /* ── механизм ── */
  function define(flow){ if(!FLOWS[flow.id]) ORDER.push(flow.id); FLOWS[flow.id]=flow; return flow }
  function stepOf(fl,key){ return fl.steps.filter(function(s){ return s.key===key })[0] }
  function need(fl,st,s){ return !s.when||s.when(st) }
  function setVals(st,vals){ Object.keys(vals||{}).forEach(function(k){ if(k==='error') return; st.v[k]=vals[k]; st.src[k]='said' }) }
  function nextStep(fl,st){ return fl.steps.filter(function(s){ return need(fl,st,s)&&st.v[s.key]===undefined })[0] }
  function askHTML(fl,st,s,pre){
    var a=s.ask(st)||{}, nav=[];
    if(st.hist.length) nav.push(['st:'+fl.id+':@back','Назад']);
    if(s.optional) nav.push(['st:'+fl.id+':'+s.key+':@skip','Пропустить']);
    var hint=a.hint||(!st.hinted?'Отвечай кнопкой или словами. «Назад» — прошлый вопрос, «отмена» — выйти.':'');
    st.hinted=true;
    return (pre||'')+p(a.text)+chips((a.chips||[]).map(function(c){ return [c[0].charAt(0)==='@'?'st:'+fl.id+':'+c[0]:'st:'+fl.id+':'+s.key+':'+c[0],c[1]] }).concat(nav))+(hint?'<p class="mlHint">'+hint+'</p>':'');
  }
  function summaryHTML(fl,st,pre){
    st.mode='summary'; st.cur=null;
    var sm=fl.summary(st)||{}, ch=sm.chips||[['@save','Сохранить'],['@edit','Поправить'],['@cancel','Отмена']];
    return (pre||'')+sm.text+chips(ch.map(function(c){ return ['st:'+fl.id+':'+c[0],c[1]] }));
  }
  function advance(fl,st,pre){
    var s=nextStep(fl,st);
    if(!s) return summaryHTML(fl,st,pre);
    if(st.cur&&st.cur!==s.key&&st.mode==='ask') st.hist.push(st.cur);
    st.mode='ask'; st.cur=s.key;
    return askHTML(fl,st,s,pre);
  }
  function begin(S,fl,init){
    var st={id:fl.id,v:{},src:{},cur:null,mode:'ask',hist:[],hinted:false};
    if(fl.init) fl.init(st);   // известное заранее (профиль) — src 'known'
    setVals(st,init||{});
    S.steps=st;
    return advance(fl,st,fl.intro?p(fl.intro(st)):'');
  }
  function errHTML(fl,st,s,vals){ return p(vals.error)+(vals.chips?chips(vals.chips.map(function(c){ return ['st:'+fl.id+':'+c[0],c[1]] })):'')+askHTML(fl,st,s) }
  function editHTML(fl,st){
    st.mode='edit';
    var list=fl.steps.filter(function(s){ return !s.noEdit&&need(fl,st,s) }).map(function(s){ return ['st:'+fl.id+':@fix:'+s.key,s.label||s.key] });
    return p('Что поправить?')+chips(list.concat([['st:'+fl.id+':@sum','Ничего, к итогу']]));
  }
  function reask(fl,st,key,pre){
    var s=stepOf(fl,key); if(!s) return null;
    delete st.v[key]; delete st.src[key];
    st.mode='ask'; st.cur=key;
    return askHTML(fl,st,s,pre);
  }
  function cancel(S,fl){ S.steps=null; return p(fl.cancelled||'Хорошо, ничего не сохранил.') }
  function doSave(S,fl,st){
    var r=fl.save(st), keep=r&&typeof r==='object'&&r.keep, h=r&&typeof r==='object'?r.html:r||'';
    if(keep) return h;
    S.steps=null;
    var nx=fl.next&&FLOWS[fl.next];   // цепочка первой настройки: «Дальше: …», если следующий сценарий есть
    return h+(nx?chips([['st:'+nx.id+':@start','Дальше: '+(nx.title||nx.id)]]):'');
  }
  /* поле, названное словами («рост», «поправь вес»), и значение для него в той же фразе */
  function fieldSaid(fl,st,text){
    var F=fl.fields||{}, key=pick(text,F); if(!key) return null;
    var s=stepOf(fl,key); if(!s||!need(fl,st,s)&&key!=='target') return null;
    var vals=s.parse?s.parse(text,st):null;
    return {key:key,vals:vals&&!vals.error?vals:null};
  }

  /* ответ словами; null — сообщение не для мастера (еда или старт не подошёл) */
  function turn(chat,S,text,isFood){
    var st=S.steps, fl=st&&FLOWS[st.id], C=D().chat_steps||{};
    if(!fl){
      for(var i=0;i<ORDER.length;i++){ var f=FLOWS[ORDER[i]], init=f.start&&f.start(text); if(init) return begin(S,f,init===true?{}:init) }
      return null;
    }
    if(st.mode==='summary'||st.mode==='edit'){
      if(only(text,C.yes)&&st.mode==='summary') return doSave(S,fl,st);
      if(only(text,C.cancel)) return cancel(S,fl);
      var fs=fieldSaid(fl,st,text);
      if(fs&&fs.vals){ setVals(st,fs.vals); return advance(fl,st) }
      if(fs) return reask(fl,st,fs.key);
      if(only(text,C.no)||find(text,C.edit)) return editHTML(fl,st);
      if(isFood&&isFood(text)) return null;
      return p('Не понял.')+summaryHTML(fl,st);
    }
    var s=stepOf(fl,st.cur);
    if(only(text,C.back)) return back(fl,st);
    if(only(text,C.cancel)) return cancel(S,fl);
    if(s.numeric&&isFood&&isFood(text)) return null;   // «банан 120 г» на вопрос о весе — это еда, а не ответ
    var vals=s.parse?s.parse(text,st):null;
    if(vals&&vals.error) return errHTML(fl,st,s,vals);
    var any=fl.any&&fl.any(text,st);   // ответ на другой вопрос сценария («не худеть, держать вес» на вопрос о поле)
    if(any&&any.set&&!(vals&&Object.keys(vals).length)){ setVals(st,any.set); return advance(fl,st,any.say?p(any.say):'') }
    if(vals&&Object.keys(vals).length){ setVals(st,vals); return advance(fl,st) }
    if(only(text,C.skip)){
      if(s.optional){ st.v[s.key]=null; st.src[s.key]='said'; return advance(fl,st) }
      return p(s.required||'Без этого не посчитать.')+askHTML(fl,st,s);
    }
    var fs2=fieldSaid(fl,st,text);
    if(fs2&&fs2.key!==s.key&&(find(text,C.edit)||fs2.vals)){ if(fs2.vals){ setVals(st,fs2.vals); return advance(fl,st) } return reask(fl,st,fs2.key) }
    if(isFood&&isFood(text)) return null;
    return p('Не понял.')+askHTML(fl,st,s);
  }
  function back(fl,st){
    var prev=st.hist.pop(); if(!prev) return p('Это первый вопрос.')+askHTML(fl,st,stepOf(fl,st.cur));
    return reask(fl,st,prev);
  }
  /* вопрос ещё раз — после еды, записанной посреди мастера */
  function again(S){
    var st=S.steps, fl=st&&FLOWS[st.id]; if(!fl) return '';
    if(st.mode==='summary') return summaryHTML(fl,st,'<p class="mlHint">Вернёмся к настройке.</p>');
    if(st.mode==='edit') return editHTML(fl,st);
    var s=stepOf(fl,st.cur); st.hinted=true; return s?askHTML(fl,st,s,'<p class="mlHint">Вернёмся к настройке.</p>'):'';
  }
  /* кнопка: st:<сценарий>:<поле>:<значение> или st:<сценарий>:@команда */
  function tap(chat,S,a){
    var fl=FLOWS[a[1]]; if(!fl) return null;
    var st=S.steps;
    if(a[2]==='@start') return begin(S,fl,{});
    if(!st||st.id!==fl.id) return null;
    var cmd=a[2];
    if(cmd==='@back') return st.mode==='ask'?back(fl,st):null;
    if(cmd==='@cancel') return cancel(S,fl);
    if(cmd==='@save') return st.mode==='summary'?doSave(S,fl,st):null;
    if(cmd==='@edit') return editHTML(fl,st);
    if(cmd==='@sum') return summaryHTML(fl,st);
    if(cmd==='@fix') return reask(fl,st,a[3]);
    if(cmd.charAt(0)==='@'&&fl.command){ var r=fl.command(cmd.slice(1),st,S,a.slice(3)); if(r&&typeof r==='object'&&r.set){ setVals(st,r.set); return advance(fl,st) } return r }
    var s=stepOf(fl,cmd); if(!s) return null;
    if(st.mode==='ask'&&st.cur!==s.key) return null;   // кнопка старого вопроса
    if(a[3]==='@skip'){ if(!s.optional) return null; st.v[s.key]=null; st.src[s.key]='said'; return advance(fl,st) }
    var val=a.slice(3).join(':'), vals=s.chip?s.chip(val,st):(function(){ var o={}; o[s.key]=val; return o })();
    if(!vals) return null;
    if(vals.error) return p(vals.error)+askHTML(fl,st,s);
    setVals(st,vals); return advance(fl,st);
  }
  function start(chat,id,init){ var fl=FLOWS[id]; if(!fl) return ''; var S=chat.bot||(window.MealBot&&MealBot.state(chat)); return begin(S,fl,init||{}) }
  function active(S){ return !!(S&&S.steps&&FLOWS[S.steps.id]) }
  return {define:define,turn:turn,tap:tap,again:again,start:start,active:active,find:find,pick:pick,only:only,words:words,numbers:numbers,chips:chips,p:p,esc:esc,flow:function(id){ return FLOWS[id] }};
})();
