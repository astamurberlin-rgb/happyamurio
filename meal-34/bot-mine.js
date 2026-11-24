/* Happy Meal · свои счётчики и свои продукты голосом (решение Астамура 24.11.2026, «Да»).
   «ещё чашку кофе по счётчику» — нажатие счётчика, как «+» на экране (tapAdd); «мои счётчики» — список со счётом за день;
   «поменяй калории у сырников на 220» — правка своего продукта на 100 г тем же путём, что форма (MealProductEditor.quickEdit),
   записанное раньше хранит свой снимок и не меняется; «удали мой продукт сырники» — как «Убрать» в «Мои продукты» (delFood):
   нельзя, если продукт есть в дневнике, счётчике или рецепте. Продукты базы бот не правит.
   Слова и ответы — словарь bot/household-ru.js, раздел my_things; код их только применяет. — Claude · 24.11.2026 */
window.MealBotMine=(function(){
  'use strict';
  function W(){ return (window.HappyMealSpeechData||{}).my_things||null }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] }) }
  function p(s){ return '<p>'+s+'</p>' }
  function chips(list){ return list&&list.length?'<div class="mbChips">'+list.map(function(c){ return '<button class="chip" data-bot="'+esc(c[0])+'">'+esc(c[1])+'</button>' }).join('')+'</div>':'' }
  function T(s,v){ return String(s||'').replace(/\{(\w+)\}/g,function(m,k){ return v&&v[k]!=null?v[k]:'' }) }
  function rx(s,f){ try{ return s?new RegExp(s,f||''):null }catch(e){ return null } }
  function nt(text){ return ' '+String(text||'').toLowerCase().replace(/ё/g,'е').replace(/(\d),(\d)/g,'$1.$2').replace(/[«»"“”?!,;:…()]+/g,' ').replace(/\s+/g,' ').trim()+' ' }
  function words(text){ return nt(text).trim().split(' ').filter(Boolean) }
  function stem(w){ return w.slice(0,Math.max(3,Math.min(5,w.length-1))) }
  function same(a,b){ if(a.length<3||b.length<3) return a===b; var s=stem(a), t=stem(b); return b.indexOf(s)===0||a.indexOf(t)===0 }
  function guard(){ try{ return typeof writeGuard==='function'&&writeGuard() }catch(e){ return true } }
  function signIn(){ return p('Чтобы записывать, войди в аккаунт.') }
  function undo(fn){ return window.MealBot&&MealBot.undoChip?MealBot.undoChip(fn):'' }
  function capf(s){ s=String(s||'').trim(); return s?s.charAt(0).toLocaleUpperCase('ru')+s.slice(1):s }
  function num(v){ return String(Math.round(v*10)/10).replace('.',',') }
  function nums(text){ return typeof MealBotSteps!=='undefined'?MealBotSteps.numbers(text):(String(text).match(/\d+(?:[.,]\d+)?/g)||[]).map(function(x){ return +x.replace(',','.') }) }

  /* ═══════ счётчики ═══════ */
  function taps(){ return (typeof DB!=='undefined'&&DB.taps)||[] }
  function count(c){ try{ return typeof tapCount==='function'?tapCount(c.k):0 }catch(e){ return 0 } }
  function portion(c){ try{ return typeof portTxt==='function'?portTxt(c):c.q+' '+c.u }catch(e){ return c.q+' '+c.u } }
  function off(c){ try{ return typeof tapOff==='function'&&tapOff(c) }catch(e){ return false } }
  /* какие счётчики названы: слова названия счётчика или тот же продукт */
  function tapsFor(rest){
    var ws=words(rest).filter(function(w){ return !/^\d/.test(w)&&w.length>=3 }); if(!ws.length) return [];
    var fid=null; try{ var r=window.MealBot&&MealBot.foodOf?MealBot.foodOf(rest):null; fid=r&&r.fid||null }catch(e){}
    var scored=taps().map(function(c){
      var tw=words(c.t).filter(function(w){ return w.length>=3 }), hit=tw.filter(function(w){ return ws.some(function(q){ return same(q,w) }) }).length;
      var fn=FOODS[c.fid]?words(FOODS[c.fid].n):[], fh=fn.filter(function(w){ return w.length>=3&&ws.some(function(q){ return same(q,w) }) }).length;
      return {c:c,s:hit*10+(fid&&fid===c.fid?5:0)+(hit?0:fh)};
    }).filter(function(x){ return x.s>0 }).sort(function(a,b){ return b.s-a.s });
    return scored.filter(function(x){ return x.s===scored[0].s }).map(function(x){ return x.c });
  }
  function press(S,c,n){
    var C=W().counter;
    if(off(c)) return p(esc(T(C.off,{t:c.t})));
    if(!FOODS[c.fid]||!(c.q>0)) return p(esc(T(C.not_ready,{t:c.t})));
    if(guard()) return signIn();
    if(typeof tapAdd!=='function') return null;
    var before=count(c);
    for(var i=0;i<n;i++) tapAdd(c.k);
    var after=count(c);
    if(after<=before) return p(esc(T(C.not_ready,{t:c.t})));
    var k=n;   // нажали n раз; счёт дня берём после (там же и нажатия с других устройств)
    return p(esc(T(k>1?C.pressed_many:C.pressed,{t:c.t,portion:portion(c),k:k,n:after})))+undo(function(){ if(guard()||typeof tapUndo!=='function') return false; for(var j=0;j<k;j++) tapUndo(c.k); return true });
  }
  function unpress(c,n){
    var C=W().counter;
    if(guard()) return signIn();
    if(!count(c)) return p(esc(T(C.nothing_to_unpress,{t:c.t})));
    for(var i=0;i<n&&count(c);i++) tapUndo(c.k);
    return p(esc(T(C.unpressed,{t:c.t,portion:portion(c),n:count(c)})));
  }
  function listHTML(){
    var C=W().counter, L=taps();
    if(!L.length) return p(esc(C.list_empty))+chips([['st:counter:@start',C.new_button]]);
    return p(esc(C.list_title))+'<ul class="mlHintList">'+L.map(function(c){ return '<li><b>'+esc(c.t)+'</b>, '+esc(portion(c))+': '+count(c)+'</li>' }).join('')+'</ul>'+
      chips(L.filter(function(c){ return !off(c) }).slice(0,6).map(function(c){ return ['mine:plus:'+c.k,T(C.plus_button,{t:c.t})] }));
  }
  function counterSay(S,text){
    var C=W()&&W().counter; if(!C) return null;
    var t=nt(text);
    if((C.list||[]).some(function(r){ var re=rx(r); return re&&re.test(t.trim()) })) return listHTML();
    var cw=rx(C.word,'g'); if(!cw||!rx(C.word).test(t)) return null;
    if(rx(C.not_press).test(t)) return null;   // «как добавить счётчик», «заведи счётчик» — справка и шаги гида
    if(/\d\s*(г|гр|грамм\S*|мл|л)(\s|$)/.test(t)) return null;   // граммы — обычная запись еды (совпадёт со счётчиком — пойдёт в него)
    var minus=rx(C.minus).test(t), rest=t.replace(cw,' ').replace(rx(C.minus,'g'),' ');
    (C.strip||[]).forEach(function(w){ rest=rest.replace(new RegExp('(^|\\s)'+w+'(?=\\s|$)','g'),' ') });
    rest=rest.replace(/(^|\s)(со|с|по|на|в|из)(?=\s|$)/g,' ').replace(/\s+/g,' ').trim();
    var L=taps(); if(!L.length) return p(esc(C.list_empty))+chips([['st:counter:@start',C.new_button]]);
    var n=nums(rest).filter(function(x){ return x===Math.floor(x)&&x>0 })[0]||1;
    if(n>10) return p(esc(C.too_many));
    var name=rest.replace(/(^|\s)\d+(?=\s|$)/g,' ').trim();
    var hit=name?tapsFor(name):(L.length===1?L:[]);
    if(!hit.length&&name) return p(esc(T(C.unknown,{w:name})))+p(esc(T(C.unknown_list,{list:L.map(function(c){ return c.t }).join(', ')})))+chips([['st:counter:@start',C.new_button]]);
    if(hit.length!==1) return p(esc(C.which))+chips((hit.length?hit:L).slice(0,6).map(function(c){ return [(minus?'mine:minus:':'mine:plus:')+c.k,c.t] }));
    return minus?unpress(hit[0],n):press(S,hit[0],n);
  }

  /* ═══════ свои продукты ═══════ */
  function owns(){ return ((typeof DB!=='undefined'&&DB.foods)||[]).filter(function(f){ return f&&f.id&&FOODS[f.id] }) }
  function ownIn(text){
    var ws=words(text), best=null;
    owns().forEach(function(f){
      var nw=words(f.n).filter(function(w){ return w.length>=3 }); if(!nw.length) return;
      var hit=nw.filter(function(w){ return ws.some(function(q){ return same(q,w) }) }).length;
      if(hit===nw.length||hit>=2&&hit>=nw.length-1){ var sc=hit*100+f.n.length; if(!best||sc>best.s) best={f:f,s:sc} }
    });
    return best?best.f:null;
  }
  function usedIn(id){
    var U=[];
    if(Object.keys(DB.days||{}).some(function(d){ return (DB.days[d].items||[]).some(function(x){ return x.fid===id }) })) U.push('days');
    if(taps().some(function(c){ return c.fid===id })) U.push('taps');
    if((DB.recipes||[]).some(function(r){ return (r.lines||[]).some(function(l){ return l.fid===id }) })) U.push('recipes');
    return U;
  }
  function delAsk(f){
    var P=W().product, U=usedIn(f.id);
    if(U.length) return p(esc(T(P.used,{n:f.n,where:U.map(function(k){ return P.used_where[k] }).join(', ')})));
    return p(esc(T(P.ask_delete,{n:f.n})))+chips([['mine:delok:'+f.id,P.delete_button],['mine:delno:'+f.id,P.keep_button]]);
  }
  function delDo(id){
    var P=W().product, i=(DB.foods||[]).findIndex(function(f){ return f.id===id }); if(i<0) return null;
    var f=DB.foods[i];
    if(usedIn(id).length) return delAsk(f);
    if(guard()) return signIn();
    DB.foods.splice(i,1); try{ rebuildLib() }catch(e){} try{ save() }catch(e){} try{ renderAll() }catch(e){}
    return p(esc(T(P.deleted,{n:f.n})))+undo(function(){ if(guard()||(DB.foods||[]).some(function(x){ return x.id===f.id })) return false; DB.foods.splice(Math.min(i,DB.foods.length),0,f); try{ rebuildLib() }catch(e){} try{ save() }catch(e){} try{ renderAll() }catch(e){} return true });
  }
  function delSay(text){
    var P=W()&&W().product; if(!P) return null;
    var t=nt(text).trim(), m=null;
    (P.delete||[]).some(function(r){ m=t.match(rx(r)); return !!m });
    if(!m) return null;
    var name=String(m[1]||'').trim(), L=owns();
    if(!L.length) return p(esc(P.no_own));
    if(!name) return p(esc(P.which_delete))+chips(L.slice(0,8).map(function(f){ return ['mine:del:'+f.id,f.n] }));
    var f=ownIn(name);
    if(!f) return p(esc(T(P.not_own,{w:name,list:L.slice(0,8).map(function(x){ return x.n }).join(', ')})));
    return delAsk(f);
  }
  /* «поменяй калории у сырников на 220», «у моих сырников белка 16», «сырники: жиры 9, углеводы 20» */
  function pat(list){ return new RegExp('(^|\\s)('+list.map(function(w){ return /\*$/.test(w)?w.slice(0,-1).replace(/ё/g,'е')+'[а-я]*':w }).join('|')+')(?=\\s|$)','g') }
  function valuesIn(t){
    var P=W().product, N=P.nutrients, marks=[];
    Object.keys(N).forEach(function(k){ var re=pat(N[k]), m; while((m=re.exec(t))){ marks.push({k:k,at:m.index+m[1].length,end:m.index+m[0].length}) } });
    marks.sort(function(a,b){ return a.at-b.at });
    var out={}, n=0;
    marks.forEach(function(x,i){
      if(out[x.k]!==undefined) return;
      var after=t.slice(x.end,i+1<marks.length?marks[i+1].at:t.length), before=t.slice(i>0?marks[i-1].end:0,x.at);
      var a=nums(after.replace(/(^|\s)(на\s+)?100\s*(г|гр|грамм\S*|мл)(?=\s|$)/g,' ')), b=nums(before.replace(/(^|\s)(на\s+)?100\s*(г|гр|грамм\S*|мл)(?=\s|$)/g,' '));
      var v=a.length?a[0]:b.length?b[b.length-1]:null; if(v!=null){ out[x.k]=v; n++ }
    });
    return {v:out,n:n,said:marks.length};
  }
  function editSay(text){
    var P=W()&&W().product; if(!P) return null;
    var t=nt(text);
    if(!rx(P.edit_verb).test(t.trim())) return null;
    var vals=valuesIn(t); if(!vals.said||!vals.n) return null;
    var f=ownIn(t);
    if(!f){
      /* продукт базы: не правим, говорим прямо (только если названный продукт нашёлся) */
      var bare=t.replace(pat([].concat.apply([],Object.keys(P.nutrients).map(function(k){ return P.nutrients[k] }))),' ').replace(/\d+(\.\d+)?/g,' ').trim().replace(rx(P.edit_verb),' ');
      (P.own_words||[]).forEach(function(w){ bare=bare.replace(new RegExp('(^|\\s)'+w+'(?=\\s|$)','g'),' ') });
      var r=null; try{ r=window.MealBot&&MealBot.foodOf?MealBot.foodOf(bare.trim()):null }catch(e){}
      var bid=r&&(r.fid||(r.alts||[])[0]);
      return bid&&FOODS[bid]?p(esc(T(P.base_product,{n:FOODS[bid].n}))):null;
    }
    if(/(^|\s)(на|в)\s+(штук|порци|упаковк|пачк)/.test(t)) return p(esc(P.piece_basis));
    var v=vals.v, bad=[];
    Object.keys(v).forEach(function(k){ var x=v[k]; if(!(x>=0)||(k==='kcal'?x>900:x>100)) bad.push(P.titles[k]+' '+num(x)) });
    if(bad.length) return p(esc(T(P.bad_value,{what:bad.join(', ')})));
    var food=FOODS[f.id], old={kcal:food.k,prot:food.p,fat:food.f,carb:food.c}, ch=[], diff={};
    Object.keys(v).forEach(function(k){ var o=old[k]; if(o!=null&&Math.abs(o-v[k])<0.05){ return } diff[k]=v[k]; ch.push(P.titles[k]+' '+(o==null?'нет данных':num(o))+' → '+num(v[k])+' '+P.units[k]) });
    if(!ch.length) return p(esc(T(P.same,{n:f.n,changes:Object.keys(v).map(function(k){ return P.titles[k]+' '+num(v[k])+' '+P.units[k] }).join(', ')})));
    if(guard()) return signIn();
    if(!window.MealProductEditor||!MealProductEditor.quickEdit) return null;
    var res;
    try{ res=MealProductEditor.quickEdit(f.id,diff) }catch(e){ return p(esc(e.message)) }
    if(!res) return signIn();
    var back={}; Object.keys(diff).forEach(function(k){ back[k]=old[k]==null?null:old[k] });
    return p(esc(T(P.edited,{n:f.n,changes:ch.join(', ')})))+undo(function(){ if(guard()) return false; try{ return !!MealProductEditor.quickEdit(f.id,back) }catch(e){ return false } });
  }

  /* сообщение человека: html — ответил; null — не про счётчики и свои продукты */
  function say(chat,S,text){
    if(!W()||typeof DB==='undefined'||typeof FOODS==='undefined') return null;
    return delSay(text)||editSay(text)||counterSay(S,text);
  }
  /* кнопки mine:… */
  function tap(chat,S,a){
    if(!W()) return null;
    var k=a.slice(2).join(':'), C=W().counter, P=W().product;
    if(a[1]==='plus'||a[1]==='minus'){ var c=taps().filter(function(x){ return x.k===k })[0]; if(!c) return null; return a[1]==='plus'?press(S,c,1):unpress(c,1) }
    var f=(DB.foods||[]).filter(function(x){ return x.id===k })[0];
    if(a[1]==='del') return f?delAsk(f):null;
    if(a[1]==='delok') return f?delDo(k):null;
    if(a[1]==='delno') return f?p(esc(T(P.kept,{n:f.n}))):null;
    return null;
  }
  return {say:say,tap:tap};
})();
