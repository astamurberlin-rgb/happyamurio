/* Happy Meal · мастер целей в чате бота (сценарий для bot-steps.js). Решение Астамура 22.11.2026.
   Цель → пол → дата рождения → рост → вес → желаемый вес → активность → итог «Сохранить». Что уже есть в профиле,
   не спрашивается, но видно в итоге. Расчёт — тот же, что у экрана «Настроить цели»: функции shared/happy-goals.js
   (Миффлин — Сан Жеор × активность, поправка и доли БЖУ — из последней сохранённой цели или по умолчанию 10 % и 25/27/48).
   Записывает приложение: «Цели на день» и версия цели (MealAccount.saveGoals), профиль и замер веса (HappyPerson),
   общая цель веса (HappyGoals.saveSharedWeight). Клетчатку мастер не трогает. Слова — словарь, раздел goal_setup.
   — Claude · 22.11.2026 */
var MealBotGoals=(function(){
  if(typeof MealBotSteps==='undefined') return null;
  var M=MealBotSteps, p=M.p, esc=M.esc;
  function G(){ return (window.HappyMealSpeechData||{}).goal_setup||{} }
  function H(){ return window.HappyGoals }
  function n1(v){ return String(Math.round(v*10)/10).replace('.',',') }
  function n0(v){ return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g,' ') }
  function today(){ return typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10) }
  function person(){ try{ return window.HappyPerson?HappyPerson.data():null }catch(e){ return null } }
  function signed(){ try{ return typeof MealData!=='undefined'&&MealData.signedIn() }catch(e){ return false } }
  function lastGoal(){ try{ return H().goalFor((typeof DB!=='undefined'&&DB.goalVersions)||[],today())||null }catch(e){ return null } }
  function curKcal(){ var v=parseFloat(String(((typeof DB!=='undefined'&&DB.goals)||{}).k||'').replace(',','.')); return v>0?v:0 }
  var KIND_LABEL={loss:'Снизить вес',maintain:'Держать вес',recomp:'Подтянуть тело, вес тот же',gain:'Набрать вес'};
  var ACT=[['1.4','Сижу почти весь день'],['1.6','Немного движения'],['1.8','Много движения'],['2','Высокая активность']];
  function actLabel(a){ var x=ACT.filter(function(r){ return +r[0]===+a })[0]; return x?x[1].toLowerCase():'' }

  /* ── разбор ответов ── */
  function lastNum(text,lo,hi){ var ns=M.numbers(text).filter(function(v){ return v>=lo&&v<=hi }); return ns.length?ns[ns.length-1]:null }
  function targetIn(text){ var ws=M.words(text), i=ws.lastIndexOf('до'); if(i<0) return null; var n=M.numbers(ws.slice(i+1).join(' '))[0]; return n>=30&&n<=300?n:null }
  function parseHeight(text){
    var ws=M.words(text), mi=-1;
    ws.forEach(function(w,i){ if((G().height_meter_words||[]).indexOf(w)>=0) mi=i });
    if(mi>=0){ var rest=M.numbers(ws.slice(mi+1).join(' '))[0]; if(rest!=null&&rest<100) return 100+rest; if(mi===0||!M.numbers(ws.slice(0,mi).join(' ')).length) return 100 }
    var ns=M.numbers(text); if(!ns.length) return null;
    var v=ns[ns.length-1]; if(v>1&&v<2.6) v=Math.round(v*100);
    return v;
  }
  function parseDate(text){
    var t=String(text||'').toLowerCase().replace(/ё/g,'е'), y,m,d,mm;
    if((mm=t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))){ y=+mm[1]; m=+mm[2]; d=+mm[3] }
    else if((mm=t.match(/(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{2,4})/))){ d=+mm[1]; m=+mm[2]; y=+mm[3] }
    else {
      var ws=M.words(t), MS=G().months||{}, mi=-1;
      ws.forEach(function(w,i){ Object.keys(MS).forEach(function(k){ if(mi<0&&(/\*$/.test(k)?w.indexOf(k.slice(0,-1))===0:w===k)){ mi=i; m=MS[k] } }) });
      if(mi<0) return null;
      var before=M.numbers(ws.slice(0,mi).join(' ')), after=M.numbers(ws.slice(mi+1).join(' '));
      d=before[before.length-1]; y=after[0];
      if(d==null||y==null) return {error:'Не разобрал дату. Скажи числами, например 15.05.1990.'};
    }
    if(y<100){ var cy=new Date().getFullYear()%100; y+=y>cy?1900:2000 }
    var dt=new Date(Date.UTC(y,m-1,d));
    if(!(m>=1&&m<=12&&d>=1&&d<=31)||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d) return {error:'Такой даты нет. Скажи ещё раз, например 15.05.1990.'};
    var iso=y+'-'+('0'+m).slice(-2)+'-'+('0'+d).slice(-2), age=H().ageAt(iso,today());
    if(!(age>=5&&age<=110)) return {error:'Проверь год рождения.'};
    if(!(age>=19&&age<=78)) return {error:'Расчёт работает для возраста 19–78 лет. Можно задать калории вручную или поправить дату.',chips:[['@manual','Задать калории'],['@cancel','Отмена']]};
    return {birthday:iso};
  }

  /* ── расчёт: те же функции, что у экрана целей ── */
  function plan(st){
    var h=H(), v=st.v, date=today(), last=lastGoal();
    var g=Object.assign({calc:{sex:'',activity:0,adjustment:10},shares:[25,27,48],method:'manual',calories:null},h.weightOnly(last),last||{});
    g.calc=Object.assign({sex:'',activity:0,adjustment:10},g.calc||{});
    if(!Array.isArray(g.shares)||g.shares.length!==3||Math.abs(g.shares.reduce(function(a,b){ return a+b },0)-100)>.01) g.shares=[25,27,48];
    if(v.kind==='manual'){ g=Object.assign({},g,{method:'manual',calories:v.calories}); return {g:g,ok:v.calories>0} }
    var cur=v.weight;
    g=h.chooseKind(g,v.kind,cur);
    if((v.kind==='loss'||v.kind==='gain')&&v.target) g=h.moveWeight(g,v.target,cur);
    g=h.calculateGoal(g,{sex:v.sex,birthday:v.birthday,heightCm:v.height},cur,Object.assign({},g.calc,{activity:+v.activity,sex:v.sex}),date);
    return {g:g,ok:g.calculationBase!==undefined,age:h.ageAt(v.birthday,date)};
  }
  function macros(g){ var gr=H().grams(g); return '<p class="mbSum">Б '+n0(gr[0])+' г · Ж '+n0(gr[1])+' г · У '+n0(gr[2])+' г</p>' }

  var flow=M.define({
    id:'goals', title:'Цели',
    fields:null,
    init:function(st){
      var d=person(), pr=d&&d.profile||{};
      if(pr.sex){ st.v.sex=pr.sex; st.src.sex='known' }
      if(pr.birthday){ st.v.birthday=pr.birthday; st.src.birthday='known' }
      if(pr.heightCm){ st.v.height=pr.heightCm; st.src.height='known' }
      if(d&&d.latest&&d.latest.kg){ st.v.weight=d.latest.kg; st.src.weight='known'; st.weightDate=d.latest.date }
      var lg=lastGoal(); if(lg&&lg.calc&&[1.4,1.6,1.8,2].indexOf(+lg.calc.activity)>=0){ st.v.activity=String(lg.calc.activity); st.src.activity='known' }
    },
    start:function(text){
      var g=G();
      if(M.find(text,g.start)){
        var init={}, k=M.pick(text,g.kinds); if(M.find(text,g.manual)) k='manual';
        if(k){ init.kind=k; var tg=targetIn(text); if(tg&&(k==='loss'||k==='gain')) init.target=tg }
        return init;
      }
      /* «мой вес 80», «я вешу 80 кг» — замер или начало настройки */
      if(M.find(text,g.weight_said)){ var w=lastNum(text,30,300); if(w!=null&&M.words(text).length<=6) return {weight:w,_said:true} }
      return null;
    },
    intro:function(st){ return st.v._said?'Вес '+n1(st.v.weight)+' кг. Могу записать его замером на сегодня или сразу настроить цель.':'Настроим цель. Это займёт минуту.' },
    steps:[
      {key:'kind',label:'Цель',
        ask:function(st){ var ch=Object.keys(KIND_LABEL).map(function(k){ return [k,KIND_LABEL[k]] }).concat([['manual','Знаю свои калории']]);
          if(st.v._said) ch.push(['@weightonly','Только записать вес']);
          return {text:'Какая цель?',chips:ch} },
        chip:function(v){ return v==='manual'||KIND_LABEL[v]?{kind:v}:null },
        parse:function(text){ var g=G(); if(M.find(text,g.manual)) return {kind:'manual'};
          var k=M.pick(text,g.kinds); if(!k) return null; var o={kind:k}, tg=targetIn(text); if(tg&&(k==='loss'||k==='gain')) o.target=tg; return o }},
      {key:'calories',numeric:true,label:'Калории',when:function(st){ return st.v.kind==='manual' },
        ask:function(){ return {text:'Сколько калорий в день?',hint:'Например: 1800 или «тысяча восемьсот».'} },
        parse:function(text){ var ns=M.numbers(text); if(!ns.length) return null; var v=ns[ns.length-1]; return v>=500&&v<=10000?{calories:Math.round(v)}:{error:'Укажи от 500 до 10 000 ккал.'} }},
      {key:'sex',label:'Пол',when:function(st){ return st.v.kind!=='manual' },
        ask:function(){ return {text:'Пол? Он нужен для формулы расхода.',chips:[['male','Мужской'],['female','Женский']]} },
        chip:function(v){ return v==='male'||v==='female'?{sex:v}:null },
        parse:function(text){ var s=M.pick(text,G().sex); return s?{sex:s}:null }},
      {key:'birthday',numeric:true,label:'Дата рождения',when:function(st){ return st.v.kind!=='manual' },
        required:'Без даты рождения не посчитать: в формуле возраст.',
        ask:function(){ return {text:'Дата рождения?',hint:'Например: 15.05.1990 или «15 мая 1990».'} },
        parse:function(text){ var r=parseDate(text); if(r) return r;
          var ws=M.words(text); if(M.numbers(text).length&&ws.some(function(w){ return (G().age_words||[]).indexOf(w)>=0 })||/^\d{1,2}$/.test(String(text).trim()))
            return {error:'Нужна дата рождения, а не возраст: так расчёт не устареет через год. Например: 15.05.1990.'};
          return null }},
      {key:'height',numeric:true,label:'Рост',when:function(st){ return st.v.kind!=='manual' },
        ask:function(){ return {text:'Рост в сантиметрах?',hint:'Например: 175 или «метр семьдесят пять».'} },
        parse:function(text){ var h=parseHeight(text); if(h==null) return null; return h>=100&&h<=250?{height:Math.round(h*10)/10}:{error:'Не похоже на рост. Скажи в сантиметрах, например 175.'} }},
      {key:'weight',numeric:true,label:'Вес сейчас',when:function(st){ return st.v.kind!=='manual' },
        ask:function(){ return {text:'Сколько весишь сейчас, кг?',hint:'Например: 82 или 82,5.'} },
        parse:function(text){ var ns=M.numbers(text); if(!ns.length) return null; var v=ns[ns.length-1]; return v>=30&&v<=300?{weight:Math.round(v*10)/10}:{error:'Не похоже на вес. Скажи в килограммах, например 82.'} }},
      {key:'target',numeric:true,label:'Желаемый вес',optional:true,when:function(st){ return st.v.kind==='loss'||st.v.kind==='gain' },
        ask:function(st){ return {text:'До какого веса '+(st.v.kind==='loss'?'снизить':'набрать')+', кг?',hint:'Можно пропустить.'} },
        parse:function(text,st){ var ns=M.numbers(text); if(!ns.length) return null; var v=ns[ns.length-1];
          if(!(v>=30&&v<=300)) return {error:'Не похоже на вес. Скажи в килограммах, например 75.'};
          var cur=st.v.weight, band=.5;
          if(cur!=null&&st.v.kind==='loss'&&v>=cur-band) return {error:'Для снижения нужен вес меньше текущего ('+n1(cur)+' кг). Или скажи «держать вес».'};
          if(cur!=null&&st.v.kind==='gain'&&v<=cur+band) return {error:'Для набора нужен вес больше текущего ('+n1(cur)+' кг). Или скажи «держать вес».'};
          return {target:Math.round(v*10)/10} }},
      {key:'activity',label:'Активность',when:function(st){ return st.v.kind!=='manual' },
        ask:function(){ return {text:'Сколько движения в обычный день? Тренировки не считай.',chips:ACT} },
        chip:function(v){ return ACT.some(function(r){ return r[0]===v })?{activity:v}:null },
        parse:function(text){ var a=M.pick(text,G().activity); return a?{activity:a}:null }}
    ],
    summary:function(st){
      var v=st.v, r=plan(st), g=r.g, had=curKcal(), now=had?'<p class="mlHint">Сейчас в целях: '+n0(had)+' ккал.</p>':'';
      if(v.kind==='manual'){
        var pc=H().percentages(g.shares);
        return {text:p('Норма — <b>'+n0(g.calories)+' ккал</b> в день.')+macros(g)+'<p class="mlHint">Белки, жиры и углеводы — '+pc.join(' / ')+' %, как на экране целей.</p>'+now+p('Сохранить?')};
      }
      if(!r.ok){
        var why=!(r.age>=19&&r.age<=78)?'Расчёт работает для возраста 19–78 лет.':'Не получилось посчитать: проверь данные.';
        return {text:p(why+' Можно задать калории вручную.'),chips:[['@manual','Задать калории'],['@edit','Поправить'],['@cancel','Отмена']]};
      }
      var src=[], k=v.kind, adj=g.calc.adjustment, base=Math.round(g.calculationBase/10)*10;
      ['sex','birthday','height','weight','activity'].forEach(function(f){ if(st.src[f]==='known') src.push({sex:'пол',birthday:'дата рождения',height:'рост',weight:'вес',activity:'активность'}[f]) });
      var goalLine=KIND_LABEL[k]+(v.target?': '+n1(v.weight)+' → '+n1(v.target)+' кг':'')+'. ';
      var calcLine='Расход за день ≈ '+n0(base)+' ккал'+(k==='loss'?', минус '+adj+' %':k==='gain'?', плюс '+adj+' %':'')+'. ';
      var data=(v.sex==='male'?'Мужской':'Женский')+', '+r.age+' '+years(r.age)+', рост '+n1(v.height)+' см, вес '+n1(v.weight)+' кг'+(st.src.weight==='known'&&st.weightDate?' (замер '+st.weightDate.slice(8,10)+'.'+st.weightDate.slice(5,7)+')':'')+', '+actLabel(v.activity)+'.';
      return {text:p('Твоя норма — <b>'+n0(g.calories)+' ккал</b> в день.')+macros(g)+
        '<p class="mlHint">'+esc(goalLine+calcLine+data)+(src.length?' '+esc(cap(src.join(', '))+' — из профиля.'):'')+'</p>'+now+p('Сохранить?')};
    },
    any:function(text,st){
      var g=G(); if(M.find(text,g.manual)) return {set:{kind:'manual'},say:'Хорошо, калории задашь вручную.'};
      var k=M.pick(text,g.kinds_switch);   // только явные слова цели: «держать вес», «похудеть» if(!k||k===st.v.kind) return null;
      var o={kind:k}, tg=targetIn(text); if(tg&&(k==='loss'||k==='gain')) o.target=tg; return {set:o,say:'Понял, цель: '+KIND_LABEL[k].toLowerCase()+'.'};
    },
    command:function(cmd,st,S){
      if(cmd==='manual'){ delete st.v.calories; return {set:{kind:'manual'}} }
      if(cmd==='weightonly'){
        if(guard()) return p('Чтобы записать вес, войди в аккаунт. Потом скажи вес ещё раз.');
        var kg=st.v.weight; S.steps=null;
        HappyPerson.addWeight(today(),kg).catch(fail);
        return p('Записал замер: '+n1(kg)+' кг на сегодня.');
      }
      return null;
    },
    save:function(st){
      if(guard()) return {html:p('Чтобы сохранить, войди в аккаунт. Потом нажми «Сохранить» ещё раз.'),keep:true};
      var r=plan(st), g=r.g, v=st.v, date=today(), h=H();
      if(!r.ok) return {html:p('Не получилось посчитать. Поправь данные или задай калории вручную.'),keep:true};
      var cal=Math.round(g.calories), goal=Object.assign({},JSON.parse(JSON.stringify(g)),{calories:cal}), gr=h.grams(goal), r1=function(x){ return String(Math.round(x*10)/10) };
      MealAccount.saveGoals({versions:h.saveVersion((typeof DB!=='undefined'&&DB.goalVersions)||[],goal,date),goals:{k:String(cal),p:r1(gr[0]),f:r1(gr[1]),c:r1(gr[2])}});
      /* профиль, замер и общая цель веса — после «Целей на день»: кольцо меняется сразу */
      (async function(){
        if(v.kind==='manual') return;
        var d=person(), pr=d&&d.profile||{}, patch={};
        if(st.src.sex==='said'&&v.sex!==pr.sex) patch.sex=v.sex;
        if(st.src.birthday==='said'&&v.birthday!==pr.birthday) patch.birthday=v.birthday;
        if(st.src.height==='said'&&v.height!==pr.heightCm) patch.heightCm=v.height;
        if(Object.keys(patch).length) await HappyPerson.update(patch);
        if(st.src.weight==='said'&&!(d&&d.latest&&d.latest.kg===v.weight&&d.latest.date===date)) await HappyPerson.addWeight(date,v.weight);
        await h.saveSharedWeight(goal,date);
      })().catch(fail);
      return p('Сохранил: <b>'+n0(cal)+' ккал</b> в день.')+macros(goal)+'<p class="mlHint">Норма уже на кольце дня. Поменять можно в «Настройки → Настроить цели».</p>';
    },
    cancelled:'Хорошо, цели не менял.'
  });
  flow.fields=G().fields||{};
  function years(a){ var m10=a%10, m100=a%100; return m10===1&&m100!==11?'год':m10>=2&&m10<=4&&(m100<12||m100>14)?'года':'лет' }
  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1) }
  function guard(){ try{ return typeof writeGuard==='function'?writeGuard():!signed() }catch(e){ return true } }
  function fail(e){ try{ toast((e&&e.message)||'Не получилось сохранить') }catch(_){} }
  /* первое сообщение пустого чата: целей ещё нет — кнопка «Настроить цель» */
  function hello(chat){
    if(!chat||chat.kind!=='meal'||chat.msgs.length||!signed()||curKcal()>0) return '';
    return M.chips([['st:goals:@start','Настроить цель за минуту']]);
  }
  return {hello:hello,plan:plan,parseDate:parseDate,parseHeight:parseHeight};
})();
