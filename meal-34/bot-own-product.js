/* Happy Meal · свой продукт через чат бота (Meal 33.37, решение Астамура 22.11.2026 «Да, по плану»).
   Здесь — только как понять ответ: просьбу завести продукт, калории и БЖУ «как на упаковке», вес штуки.
   Слова — в словаре bot/household-ru.js, раздел own_product. Сохраняет форма своих продуктов (MealProductEditor.quick). */
window.MealOwnProduct=(function(){
  'use strict';
  var KEYS=['kcal','prot','fat','carb'];
  function data(){ var d=window.HappyMealSpeechData; return d&&d.own_product||null }
  function nz(s){ return String(s||'').normalize('NFC').toLocaleLowerCase('ru').replace(/ё/g,'е') }
  function rx(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+') }
  /* слово целиком: «у» в «углеводы» не ловится, «б» в «б.ю.» тоже (после него точка) */
  function word(list){ return new RegExp('(^|[^а-яa-z0-9])('+list.slice().sort(function(a,b){ return b.length-a.length }).map(rx).join('|')+')(?=$|[^а-яa-z0-9.])','g') }
  function has(text,list){ return !!list&&!!list.length&&word(list).test(nz(text)) }
  function fix(t){ var d=data(); (d&&d.speech_fixes||[]).forEach(function(f){ t=t.replace(word([nz(f.heard)]),function(m,a){ return a+f.means }) }); return t }

  /* числа словами: «двести пятьдесят» → 250, «десять и пять» не трогаем */
  function numbers(t){
    var N=(window.HappyMealSpeechData||{}).numbers||{}, C=N.cardinals||{};
    return t.replace(/[а-я]+(?:\s+[а-я]+)*/g,function(run){
      var out=[],acc=null;
      run.split(/\s+/).forEach(function(w){
        if(Object.prototype.hasOwnProperty.call(C,w)&&!/^(пару|пара|парочка|парочку|десяток|дюжина|дюжину)$/.test(w)){
          var v=C[w]; if(acc!=null&&acc%10===0&&v<acc&&String(v).length<String(acc).length) acc+=v; else { if(acc!=null) out.push(String(acc)); acc=v }
        } else { if(acc!=null){ out.push(String(acc)); acc=null } out.push(w) }
      });
      if(acc!=null) out.push(String(acc));
      return out.join(' ');
    });
  }
  function prep(text){
    var t=' '+nz(text).replace(/[«»"“”]/g,' ')+' ';
    t=fix(t);
    t=numbers(t);
    t=t.replace(/(\d),(\d)/g,'$1.$2').replace(/(\d)\s*(г|гр|грамм[а-я]*|мл|ккал)(?=[^а-я]|$)/g,'$1 $2');
    return t.replace(/\s+/g,' ');
  }

  /* «заведи продукт сырок б.ю. александров» → {name:'сырок б.ю. александров'}; «как добавить свой продукт» → {how:true};
     «заведи блюдо» → {dish:true}. Иначе null — обычная запись еды. */
  function request(text){
    var d=data(); if(!d) return null;
    var t=nz(text).trim(), nouns=word(d.start_nouns), dish=word(d.dish_nouns);
    if(has(t,d.how_to_ru)&&(nouns.test(t)||(dish.lastIndex=0,dish.test(t)))) return {how:true};
    nouns.lastIndex=0; dish.lastIndex=0;
    var m=nouns.exec(t), isDish=false;
    if(!m){ m=dish.exec(t); isDish=!!m }
    if(!m) return null;
    var before=t.slice(0,m.index+m[1].length);
    if(!has(before,d.start_verbs)) return null;          // «съел молочный продукт» — не просьба завести
    if(isDish) return {dish:true};
    var rest=t.slice(m.index+m[0].length).replace(/^[\s:,—-]+/,'');
    var name=rest.split(/\s(?=\d)|[,;]/)[0];
    var stop=word([].concat(KEYS.reduce(function(a,k){ return a.concat(d.nutrients[k]) },[]),d.basis.per100,d.basis.piece));
    var s=stop.exec(' '+name+' '); if(s) name=(' '+name+' ').slice(0,s.index+s[1].length);
    name=name.replace(/^(под названием|называется|с названием)\s+/,'').trim();
    var out={name:name?name.charAt(0).toLocaleUpperCase('ru')+name.slice(1):''}, n=nutrition(rest);
    if(n.found) out.nutrition=n;
    return out;
  }

  /* «250 ккал, белки 10, жиры 15, углеводы 20», «10 белков 15 жиров», «250 10 15 20», «на батончик 40 г 180 ккал» */
  function nutrition(text){
    var d=data(), t=prep(text), out={kcal:null,prot:null,fat:null,carb:null,basis:null,basisG:null,found:0};
    if(!d) return out;
    /* основа: «на 100 г» / «на штуку 40 г» / «в батончике 40 г» */
    var p100=word(d.basis.per100), piece=word(d.basis.piece);
    if(p100.test(t)){ out.basis='100'; t=t.replace(word(d.basis.per100),' ') }
    else { piece.lastIndex=0; var pm=piece.exec(t); if(pm){ out.basis='piece';
      var g=/^\s*(?:\d+\s+)?(\d+(?:\.\d+)?)\s+(?:г|гр|грамм[а-я]*|мл)(?![а-я])/.exec(t.slice(pm.index+pm[0].length))||/(\d+(?:\.\d+)?)\s+(?:г|гр|грамм[а-я]*|мл)\s*$/.exec(t.slice(0,pm.index));
      if(g){ out.basisG=+g[1]; t=t.replace(g[0],' ') } t=t.replace(pm[2],' ') } }
    var g2=/(?:^|\s)(?:на|в)\s+(\d+(?:\.\d+)?)\s+(?:г|гр|грамм[а-я]*|мл)(?![а-я])/.exec(t);
    if(g2&&+g2[1]!==100&&!out.basisG){ out.basis='piece'; out.basisG=+g2[1]; t=t.replace(g2[0],' ') }
    t=t.replace(/(^|[^а-я])(г|гр|грамм[а-я]*)(?![а-я])/g,'$1 ');
    /* токены: число или показатель */
    var tokens=[], re=new RegExp('(\\d+(?:\\.\\d+)?)|'+word(KEYS.reduce(function(a,k){ return a.concat(d.nutrients[k]) },[])).source,'g'), m;
    var which={}; KEYS.forEach(function(k){ d.nutrients[k].forEach(function(w){ which[nz(w)]=k }) });
    while((m=re.exec(t))){ if(m[1]!=null) tokens.push({n:+m[1]}); else tokens.push({k:which[m[3]]}) }
    /* «бжу 17 5 3», «белки жиры углеводы 10 15 20»: подряд показатели, следом столько же чисел */
    for(var i=0;i<tokens.length;i++){
      var j=i; while(j<tokens.length&&tokens[j].k) j++;
      var keys=tokens.slice(i,j); if(keys.length<2){ continue }
      var e=j; while(e<tokens.length&&tokens[e].n!=null&&e-j<keys.length) e++;
      var nums=tokens.slice(j,e); keys=keys.slice(keys.length-nums.length);   // «ккал белки жиры углеводы 17 5 3» — числа к последним трём
      if(nums.length>=2) keys.forEach(function(x,q){ if(out[x.k]==null){ out[x.k]=nums[q].n; nums[q].used=true; x.done=true; out.found++ } });
      i=j;
    }
    var firstNum=tokens.findIndex(function(x){ return x.n!=null }), firstKey=tokens.findIndex(function(x){ return x.k });
    var numFirst=firstNum>=0&&(firstKey<0||firstNum<firstKey);
    tokens.forEach(function(x,i){
      if(!x.k||x.done||out[x.k]!=null) return;
      var a=tokens[numFirst?i-1:i+1], b=tokens[numFirst?i+1:i-1];
      var pick=a&&a.n!=null&&!a.used?a:b&&b.n!=null&&!b.used?b:null;
      if(pick){ out[x.k]=pick.n; pick.used=true; out.found++ }
    });
    if(!tokens.some(function(x){ return x.k })){
      var nums=tokens.filter(function(x){ return x.n!=null }).map(function(x){ return x.n });
      var order=nums.length===4?KEYS:nums.length===3?['prot','fat','carb']:null;
      if(order) order.forEach(function(k,i){ out[k]=nums[i]; out.found++ });
    }
    return out;
  }

  /* калории по БЖУ; null — сходится или не из чего считать */
  function check(v){
    var c=(data()||{}).kcal_check||{ratio:0.33,min_kcal:40};
    if(v.kcal==null||v.prot==null||v.fat==null||v.carb==null) return null;
    var est=Math.round(4*v.prot+9*v.fat+4*v.carb), diff=Math.abs(est-v.kcal);
    return diff>c.min_kcal&&diff>c.ratio*Math.max(est,v.kcal)?est:null;
  }
  /* на 100 г из «на штуку»: 180 ккал на батончик 40 г → 450 ккал на 100 г */
  function per100(v){
    var k=v.basis==='piece'&&v.basisG>0?100/v.basisG:1, out={};
    KEYS.forEach(function(x){ out[x]=v[x]==null?null:Math.round(v[x]*k*10)/10 });
    return out;
  }
  /* «40 г», «батончик 40 грамм», «сорок» → граммы штуки */
  function grams(text){
    var t=prep(text), m=/(\d+(?:\.\d+)?)/.exec(t);
    return m&&+m[1]>0&&+m[1]<=5000?+m[1]:null;
  }
  function pieceWord(text){
    var d=data(); if(!d) return null; var m=word(d.piece_words).exec(nz(text)); return m?m[2]:null;
  }
  function unknown(text){ var d=data(); return !!d&&has(text,d.unknown_ru) }
  return {request:request,nutrition:nutrition,check:check,per100:per100,grams:grams,pieceWord:pieceWord,unknown:unknown,keys:KEYS};
})();

/* Сценарий пошаговых вопросов (bot-steps.js): название → калории и БЖУ → на 100 г или на штуку → вес штуки →
   сверка калорий с БЖУ → вес порции → итог. Сохраняет MealProductEditor.quick — тот же путь, что у формы.
   Запуск: фраза («заведи продукт…»), кнопка «Завести свой продукт» у «нет в базе» (тогда после сохранения строка записывается). */
window.MealOwnProductFlow=(function(){
  if(typeof MealBotSteps==='undefined'||!window.MealOwnProduct) return null;
  var M=MealBotSteps, O=window.MealOwnProduct, p=M.p, esc=M.esc;
  var NUT=['kcal','prot','fat','carb'], TITLE={kcal:'Калории',prot:'Белки',fat:'Жиры',carb:'Углеводы'}, UNIT={kcal:'ккал',prot:'г',fat:'г',carb:'г'};
  function n1(v){ return String(Math.round(v*10)/10).replace('.',',') }
  function capf(s){ s=String(s||'').trim(); return s?s.charAt(0).toLocaleUpperCase('ru')+s.slice(1):s }
  function known(st){ return NUT.some(function(k){ return st.v[k]!=null }) }
  function vals(st){ var o={}; NUT.forEach(function(k){ o[k]=st.v[k]==null?null:st.v[k] }); o.basis=st.v.basis; o.basisG=st.v.basisG; return o }
  function per100(st){ return O.per100(vals(st)) }
  /* найденное разбором → поля сценария; одно голое число — в спрошенный показатель */
  function fromNut(n,key,text){
    var out={};
    NUT.forEach(function(k){ if(n[k]!=null) out[k]=n[k] });
    if(n.basis) out.basis=n.basis;
    if(n.basisG) out.basisG=n.basisG;
    /* голое число — в спрошенный показатель; «банан 120 г» — не ответ, а еда (уйдёт в дневник) */
    if(!n.found&&key&&!/[а-яa-z]{3,}/i.test(String(text).toLowerCase().replace(/ккал|калори[а-я]*|грамм[а-я]*|примерно|около|где-то/g,' '))){ var g=M.numbers(text); if(g.length===1) out[key]=g[0] }
    return out;
  }
  function similar(name){
    if(typeof searchLib!=='function') return [];
    /* «кекс от бабушки» целиком не найти — убираем слова с конца, пока не найдётся */
    var ws=String(name||'').trim().split(/\s+/), list=[];
    while(ws.length&&!list.length){ list=searchLib(ws.join(' ')).filter(function(f){ return f.src!=='Мои'&&(typeof MealSources==='undefined'||MealSources.available(DB,f)) }); ws.pop() }
    return list.slice(0,3);
  }
  function likeError(st){
    var list=similar(st.v.name);
    if(!list.length) return {error:'Похожего в базе не нашёл. Можно сохранить без калорий и дописать потом в форме.',chips:[['@skipnut','Сохранить без калорий'],['@form','Заполню в форме']]};
    return {error:'Возьму состав у похожего продукта из базы, название оставлю твоё. Какой ближе?',chips:list.map(function(f){ return ['@from:'+f.id,f.n] })};
  }
  function nutParse(key){
    return function(text,st){
      if(O.unknown(text)) return key==='kcal'?likeError(st):{prot:null,fat:null,carb:null};
      var r=fromNut(O.nutrition(text),key,text);
      return Object.keys(r).length?r:null;
    };
  }
  var flow={
    id:'own', title:'Свой продукт',
    start:function(text){ var r=O.request(text); if(!r||r.how||r.dish) return null; var init={}; if(r.name) init.name=r.name; if(r.nutrition) Object.assign(init,fromNut(r.nutrition)); return init },
    intro:function(st){ return st.v.askId?'Заведу свой продукт в «Мои продукты» и сразу запишу его.':'Заведу свой продукт в «Мои продукты».' },
    fields:{name:['назван*','имя','название'],kcal:['калори*','ккал','калорийн*'],prot:['белк*','белок'],fat:['жир*'],carb:['углевод*'],piece:['порци*','вес штуки','штук*']},
    steps:[
      {key:'name',label:'Название',ask:function(st){ var sg=st.v.suggest; return sg?{text:'Как назвать продукт? Можно оставить, как услышал, или сказать своё название.',chips:[['@usename',capf(sg)]]}:{text:'Как назвать продукт? Например: «Сырок Б.Ю. Александров».'} },
        parse:function(text){ var t=String(text||'').trim(), C=(window.HappyMealSpeechData||{}).chat_steps||{};
          if(!/[а-яa-z]/i.test(t)) return {error:'Скажи название словами.'};
          if(M.find(t,C.edit)&&M.find(t,flow.fields.name)) return null;   // «поправь название» — это просьба, а не новое название
          return {name:capf(t).slice(0,200)} }},
      {key:'kcal',label:'Калории',when:function(st){ return !st.v.from },
        ask:function(){ return {text:'Сколько в нём калорий и БЖУ? Скажи как на упаковке: «на 100 г 250 ккал, белки 10, жиры 15, углеводы 20».',chips:[['@like','Не знаю — возьми похожий'],['@form','Заполню в форме']]} },
        parse:nutParse('kcal'),optional:true},
      {key:'prot',label:'Белки',when:function(st){ return !st.v.from },
        ask:function(){ return {text:'А белки, жиры и углеводы? Можно тремя числами: «10 15 20».',chips:[['@nobju','Не знаю']]} },parse:nutParse('prot'),optional:true},
      {key:'fat',label:'Жиры',when:function(st){ return !st.v.from&&st.v.prot!==null },ask:function(){ return {text:'Сколько жиров?'} },parse:nutParse('fat'),optional:true},
      {key:'carb',label:'Углеводы',when:function(st){ return !st.v.from&&st.v.prot!==null },ask:function(){ return {text:'Сколько углеводов?'} },parse:nutParse('carb'),optional:true},
      {key:'basis',label:'На 100 г или на штуку',when:function(st){ return !st.v.from&&known(st) },
        ask:function(){ return {text:'Это на 100 г или на одну штуку (упаковку)?',chips:[['100','На 100 г'],['piece','На штуку']]} },
        parse:function(text){ var n=O.nutrition(text); if(n.basis) return n.basisG?{basis:n.basis,basisG:n.basisG}:{basis:n.basis}; if(/100|сто/.test(text)) return {basis:'100'}; if(O.pieceWord(text)) return {basis:'piece'}; return null }},
      {key:'basisG',label:'Вес штуки',numeric:true,when:function(st){ return st.v.basis==='piece' },
        ask:function(){ return {text:'Сколько весит одна штука? Посмотри на упаковке, например «40 г».'} },
        parse:function(text){ var g=O.grams(text); return g?{basisG:g}:null }},
      {key:'ok',noEdit:true,when:function(st){ return !st.v.from&&O.check(per100(st))!=null },
        ask:function(st){ var v=per100(st); return {text:'По белкам, жирам и углеводам выходит около '+n1(O.check(v))+' ккал на 100 г, а сказано '+n1(v.kcal)+'. Так и записать?',chips:[['yes','Да, так на упаковке'],['@fix:kcal','Скажу заново']]} },
        chip:function(){ return {ok:true} },
        parse:function(text,st){ if(M.only(text,(window.HappyMealSpeechData.chat_steps||{}).yes)) return {ok:true}; var n=O.nutrition(text); if(n.found){ var r=fromNut(n); delete st.v.ok; return r } return null }},
      {key:'piece',label:'Вес порции',optional:true,numeric:true,when:function(st){ return st.v.basis!=='piece' },
        ask:function(st){ return {text:'Сколько весит одна штука или порция? Например «40 г». Не нужно — скажи «пропусти».'} },
        parse:function(text){ var g=O.grams(text); return g?{piece:g,pieceWord:O.pieceWord(text)}:null }}
    ],
    summary:function(st){
      var v=per100(st), f=st.v.from&&typeof FOODS!=='undefined'&&FOODS[st.v.from], rows=[];
      if(f) rows.push('Состав — как у «'+esc(f.n)+'»');
      else NUT.forEach(function(k){ rows.push(TITLE[k]+': '+(v[k]==null?'нет данных':n1(v[k])+' '+UNIT[k])) });
      var g=st.v.basis==='piece'?st.v.basisG:st.v.piece;
      return {text:p('«'+esc(st.v.name)+'»'+(f?'':' — на 100 г:'))+'<ul class="mlHintList">'+rows.map(function(r){ return '<li>'+r+'</li>' }).join('')+'</ul>'+(g?p('Одна штука — '+n1(g)+' г.'):'')+p('Сохранить в «Мои продукты»?'),
        chips:[['@save','Сохранить'],['@edit','Поправить'],['@form','В форме'],['@cancel','Отмена']]};
    },
    command:function(name,st,S,args){
      if(name==='like') return M.chips?(function(){ var e=likeError(st); return p(e.error)+M.chips(e.chips.map(function(c){ return ['st:own:'+c[0],c[1]] })) })():null;
      if(name==='from'){ var fid=args.join(':'); if(String(fid).indexOf('bls:')===0&&typeof blsUse==='function') blsUse(fid); return FOODS[fid]?{set:{from:fid}}:null }
      if(name==='usename') return st.v.suggest?{set:{name:capf(st.v.suggest).slice(0,200)}}:null;
      if(name==='nobju') return {set:{prot:null,fat:null,carb:null}};
      if(name==='skipnut') return {set:{kcal:null,prot:null,fat:null,carb:null}};
      if(name==='form'){ var nm=st.v.name||'', ask=st.v.askId, chat=CH.meal; S.steps=null;
        if(window.MealProductEditor) MealProductEditor.create(nm,function(food){ if(ask&&window.MealBot) MealBot.replaceMissing(chat,ask,food.id) });
        return p('Открыл форму своего продукта.') }
      return null;
    },
    save:function(st){
      var v=per100(st), g=st.v.basis==='piece'?st.v.basisG:st.v.piece, por={}, food;
      if(g) por[st.v.basis==='piece'||!st.v.pieceWord?'шт':st.v.pieceWord]=g;
      try{ food=MealProductEditor.quick({name:st.v.name,per100:st.v.from?{}:v,from:st.v.from?FOODS[st.v.from]:null,por:por}) }
      catch(e){ return {html:p(esc(e.message))+(/уже есть/.test(e.message)?p('Скажи другое название: «поправь название».'):''),keep:true} }
      if(!food) return {html:p('Сначала войди в аккаунт — без входа продукт не сохранить.'),keep:true};
      var ask=st.v.askId, chat=CH.meal;
      if(ask&&window.MealBot) setTimeout(function(){ MealBot.replaceMissing(chat,ask,food.id) },0);
      return p('Сохранил «'+esc(food.n)+'» в «Мои продукты».'+(ask?'':' Теперь его можно называть, когда записываешь еду.'));
    },
    cancelled:'Хорошо, продукт не завёл.'
  };
  M.define(flow);
  return flow;
})();
