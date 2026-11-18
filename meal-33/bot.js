/* Happy Meal · бот записи еды без ИИ — этап 1. С Meal 33.12 включён у всех; выключатель — в «Для разработчика».
   Слух — диктовка клавиатуры. Понимание — правила в этом файле: бот сам записывает только то, в чём уверен;
   во всём остальном задаёт один короткий вопрос или прямо говорит, что так пока не умеет. Считает и пишет в
   дневник само приложение теми же функциями, что и шторка «Подобрано» (parseText, gramsFor, day, save).
   Модель (этап 2) подключается в одном месте — там, где сейчас ответ «пока так не умею» (deferred). */
var MealBot=(function(){
  var HOURS={'час':1,'один':1,'одну':1,'два':2,'две':2,'три':3,'четыре':4,'пять':5,'шесть':6,'семь':7,'восемь':8,'девять':9,
    'десять':10,'одиннадцать':11,'двенадцать':12};
  var MINS={'пять':5,'десять':10,'пятнадцать':15,'двадцать':20,'тридцать':30,'сорок':40,'пятьдесят':50,'пол':30,'полтора':90};
  var HW='(?:\\d{1,2}|'+Object.keys(HOURS).join('|')+')';
  var NEAR='(?:где[- ]?то|примерно|около|приблизительно)';
  /* другое написание и чужая раскладка распознавания речи */
  var ALIAS=[[/фейху[аяюеи]/g,'фейхоа'],[/americano/g,'американо'],[/cappuccino|капуччино/g,'капучино'],[/espresso|экспрессо/g,'эспрессо'],
    [/flat\s*white|флэт\s*уайт|флет\s*уайт/g,'флэт уайт'],[/latte/g,'латте'],[/sayer/g,'сайра'],[/пека\s*nom/g,'пеканом'],
    [/(^|\s)суп\s+лапша(\s|$)/g,'$1суп с лапшой$2'],[/(^|\s)кемал[яьи](?=\s|$)/g,'$1ткемали'],[/(^|\s)чихуа(?=\s)/g,'$1фейхоа'],[/(^|\s)получай\s+на\s+ложке(?=\s)/g,'$1пол чайной ложки'],[/(^|\s)ашота(?=\s)/g,'$1шота'],[/(^|\s)сырам(?=\s|$)/g,'$1с сыром'],[/(^|\s)(?:на\s+)?перекус(ила|или|ывал[аи]?|ить|е|а|ом)?(?=[\s,.;!?]|$)/g,'$1перекус'],
    [/(^|\s)(съедобн\S*\s+част\S*)(?=\s|$)/g,' '],[/(^|\s)себе(?=[\s,.;!?]|$)/g,' '],[/(^|\s)(цел(ая|ый|ое|ые|иком|ую))(?=[\s,.;!?]|$)/g,' '],
    [/(^|\s)сто(?=\s)/g,'$1100'],[/(^|\s)двести(?=\s)/g,'$1200'],[/(^|\s)триста(?=\s)/g,'$1300'],[/(^|\s)четыреста(?=\s)/g,'$1400'],[/(^|\s)пятьсот(?=\s)/g,'$1500']];
  /* слова-связки диктовки: к еде не относятся */
  var FILL=/(^|\s)(так|значит|запиши|записывай|запись|щас|сейчас|только что|ну|там|короче|я|мне|мы|пожалуйста|это|вот|отметь|отметить|отмечай|добавь|добавить|еще и|тебе скажу|взвешиваю|было|был|была|были|опять|снова|опять-таки|где-то|где то|примерно|около|приблизительно|м{2,}|э+х|э+м+|о+х|а+х|у+х|хм+|ой|ух|эй|блин|кстати|в общем|короче говоря|была|были|ровно)(?=[\s,.;!?]|$)/g;
  /* слова, с которыми правила не справляются честно: это работа модели (этап 2) */
  var DEFER=[[/(^|\s)(пополам|поделил\S*|половину)(\s|$)/,'еда делится на части'],
    [/(^|\s)если(\s|$)/,'условие «если»'],
    [/(^|\s)(посмотри|поищи|найди|проверь)(\s|$)/,'поиск по прошлым записям'],
    [/(^|\s)перенеси(\s|$)/,'перенос записи'],
    [/(^|\s)(потом|позже)\s+скажу/,'вес обещан позже'],
    [/(как(ой|ая|ие|их)[- ]то|непонятн|неизвестн)/,'продукт не назван']];
  var CSS='.mbChips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.mbChips .chip{flex:none;padding:8px 14px;font-size:13.5px}'+
    '.mlB .mbSum{margin-top:8px;font-size:13px;opacity:.86}'+
    '.mlB .mbMiss{white-space:pre-wrap;font:13px/1.45 inherit;margin:8px 0 0;padding:10px 12px;border-radius:14px;background:rgba(0,0,0,.14);user-select:text;-webkit-user-select:text}';
  var booted=false;
  var SP=typeof MealSpeech!=='undefined'&&MealSpeech.ready()?MealSpeech:null, MK=/[≈⊕⊘▽◇△⊙]/g;

  function boot(){
    if(booted) return; booted=true;
    /* меры, которых не было в разборе: шот (эспрессо), миска и пиала как тарелка, бокал как стакан */
    DEF['шот']=30; UFORMS['шот']=['шот','шота','шотов'];
    /* Meal 33.9: слова-меры (кружка, пиала, бокал, половник, кусок…) и их веса — из словаря bot/household-ru.js (bot-speech.js) */
    if(!SP){ var u0=window.unitOf;
      window.unitOf=function(t){ return /^шот(а|ов|ы)?$/.test(t)?'шот':/^(миск|пиал)/.test(t)?'тарелка':/^бокал/.test(t)?'стакан':u0(t) } }
    var st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
    document.getElementById('mlChat').addEventListener('click',function(e){ var b=e.target.closest('[data-bot]'); if(b) tap(b.dataset.bot,b.textContent) });
  }
  function state(chat){ return chat.bot||(chat.bot={pend:[],ask:null,commits:[],seq:0,last:null}) }
  function pad2(n){ return ('0'+n).slice(-2) }
  function hm(d){ return pad2(d.getHours())+':'+pad2(d.getMinutes()) }
  function nrm(s){ return ' '+String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"“”]/g,' ').replace(/\s+/g,' ').trim()+' ' }
  function esc(s){ return escH(s) }
  function p(s){ return '<p>'+s+'</p>' }
  function chips(list){ return list.length?'<div class="mbChips">'+list.map(function(c){ return '<button class="chip" data-bot="'+esc(c[0])+'">'+esc(c[1])+'</button>' }).join('')+'</div>':'' }
  function foodName(l){ var f=l.fid&&FOODS[l.fid]; return f?f.n:cap(l.name) }
  function noteOf(l){
    if(l.inc) return 'в т.ч. '+(l.inc.n||'')+' '+fmt(l.inc.g)+' г';
    if(l.split) return 'из '+fmt(l.split.total)+' г, без части '+fmt(l.split.part)+' г';
    if(l.fromDish) return 'из блюда';
    if(l.cooked) return 'съедено — взял готовое';
    if(l.left) return l.left;
    if(l.waste) return fmt(l.whole)+' г − несъедобное '+fmt(l.waste)+' г';
    return '';
  }
  function row(l,ok,note){ return '<div class="mlRow'+(ok?'':' warn')+'"><span class="g" aria-hidden="true">'+(ok?CHECKI:WARNI)+'</span><span class="n">'+esc(foodName(l))+
    (note?' <small style="font-weight:500;opacity:.8">'+esc(note)+'</small>':'')+'</span><b>'+esc((l.approx?'≈ ':'')+amt(l))+'</b></div>' }
  /* «5 перепёлка» → «5 шт · 500 г» */
  function amt(l){ /* Meal 33.10: мера USDA — русской подписью: «2 чашки США (237 мл) · 316 г» */
    if(l.u&&l.u!=='г'&&l.q!==1&&typeof MealUSDA!=='undefined'&&MealUSDA.unitLabel(FOODS[l.fid],l.u,l.fid)){ var a=amtShort(l); return /\sг$/.test(a)?a:a+' · '+fmt(l.g)+' г' }
    if(l.u&&l.u!=='г'&&l.u!=='мл'&&!DEF[l.u]&&!/^(маленьк|средн|больш)/.test(l.u)&&l.q!==1) return (typeof UFORMS!=='undefined'&&UFORMS[l.u]?amtShort(l):fmt(l.q)+' шт')+' · '+fmt(l.g)+' г'; return amtShort(l) }   // у меры со своим словом — «0,5 буханки · 300 г»

  /* ── время: «в 16:30», «в час дня», «10 утра», «где-то в 2 часа дня», «час назад», «15 минут назад», «вчера» ── */
  function hourOf(w){ return /^\d/.test(w)?+w:HOURS[w] }
  function partHour(h,part){
    if(part==='утра') return h===12?0:h;
    if(part==='дня') return h<8?h+12:h;
    if(part==='вечера') return h<12?h+12:h;
    return h===12?0:h>=8?h+12:h;   // ночи: «11 ночи» — 23:00, «2 ночи» — 02:00
  }
  /* день словами: «вчера», «позавчера», «три дня назад», «в среду», «в прошлую пятницу» — сдвиг от открытого дня */
  var WD=[['воскресень',0],['понедельник',1],['вторник',2],['сред',3],['четверг',4],['пятниц',5],['суббот',6]];
  function dayWords(s){
    var shift=0;
    s=s.replace(/(^|\s)(?:за\s+)?(позавчера\S*|вчера\S*)(?=\s|$)/g,function(m,a,w){ shift=/^поза/.test(w)?-2:-1; return ' ' });
    s=s.replace(/(^|\s)(\d{1,2}|два|три|четыре|пять|шесть|семь)\s+(?:дня|дней|день)\s+назад(?=\s|$)/g,function(m,a,n){ shift=-(/^\d/.test(n)?+n:{'два':2,'три':3,'четыре':4,'пять':5,'шесть':6,'семь':7}[n]); return ' ' });
    s=s.replace(/(^|\s)(?:в|во)\s+(?:(?:прошл\S+|эт\S+)\s+)?(воскресень\S*|понедельник\S*|вторник\S*|сред[уаы]|четверг\S*|пятниц\S*|суббот\S*)(?=\s|$)/g,function(m,a,w){
      var want=WD.filter(function(x){ return w.indexOf(x[0])===0 })[0][1], cur=new Date(curDate+'T12:00:00').getDay(), back=(cur-want+7)%7||7; shift=-back; return ' ' });
    return {text:s,shift:shift};
  }
  function takeTimes(text,now){
    var hits=[];
    function hit(t,approx,shift,amb){ hits.push({t:t,approx:!!approx,shift:shift||0,amb:amb||0}); return ' ' }
    var ds0=dayWords(text), s=ds0.text;
    s=s.replace(new RegExp('(?:^|\\s)(?:('+NEAR+')\\s+)?(?:(?:в|во|к)\\s+)?(\\d{1,2}):(\\d{2})(?!\\d)','g'),function(m,near,h,mi){
      return +h<24&&+mi<60?hit(pad2(+h)+':'+mi,near):m });
    s=s.replace(new RegExp('(?:^|\\s)(?:('+NEAR+')\\s+)?(?:(\\d{1,3}|'+Object.keys(MINS).concat(Object.keys(HOURS)).join('|')+')\\s+)?(полчаса|час(?:а|ов)?|минут(?:у|ы)?|мин)\\s+назад','g'),function(m,near,n,unit){
      var isH=/^час/.test(unit), v=unit==='полчаса'?30:n==null?(isH?60:null):/^\d/.test(n)?(+n)*(isH?60:1):isH?(n==='пол'?30:n==='полтора'?90:(HOURS[n]||0)*60):(MINS[n]||HOURS[n]||null);
      if(!v) return m;
      var d=new Date(now.getTime()-v*60000), a=new Date(now.getFullYear(),now.getMonth(),now.getDate()), b=new Date(d.getFullYear(),d.getMonth(),d.getDate());
      return hit(hm(d),true,Math.round((b-a)/86400000)) });
    s=s.replace(new RegExp('(?:^|\\s)(?:('+NEAR+')\\s+)?(?:часов\\s+)?(?:(?:в|во|к)\\s+)?('+HW+')(?:\\s+час(?:а|ов)?)?\\s+(утра|дня|вечера|ночи)(?=\\s|$)','g'),function(m,near,h,part){
      var v=hourOf(h); return v>=1&&v<=12?hit(pad2(partHour(v,part))+':00',near):m });
    s=s.replace(new RegExp('(?:^|\\s)(?:('+NEAR+')\\s+)?(?:в|к)\\s+(полдень|полночь)','g'),function(m,near,w){ return hit(w==='полдень'?'12:00':'00:00',near) });
    s=s.replace(new RegExp('(?:^|\\s)(?:('+NEAR+')\\s+)?(?:в|во|к)\\s+('+HW+')\\s+час(?:а|ов)?(?=\\s|$)','g'),function(m,near,h){
      var v=hourOf(h); if(!(v>=0&&v<=23)) return m;
      /* «в 5 часов» без «утра/вечера»: ближайшее уже прошедшее */
      var amb=(v>=1&&v<=12)?v:0;
      if(v>=1&&v<=11){ var nowH=now.getHours()+now.getMinutes()/60; if(v+12<=nowH) v+=12 }
      return hit(pad2(v)+':00',near,0,amb) });
    /* «часов в 10», «в 10» — без слова «часов» после числа; не «в 2 раза» и не «в 200 г» */
    s=s.replace(new RegExp('(?:^|\\s)(?:('+NEAR+')\\s+)?(часов\\s+|часа\\s+)?(?:в|к)\\s+(\\d{1,2})(?=\\s|$)(?!\\s+(?:г|гр|грамм\\S*|мл|кг|л|литр\\S*|шт\\S*|раз\\S*|минут\\S*|мин|процент\\S*|%|стакан\\S*|чашк\\S*|тарел\\S*|лож\\S*|кус\\S*|порци\\S*)(?:\\s|$))','g'),function(m,near,ch,h){
      var v=+h; if(!(v>=0&&v<=23)) return m;
      var amb=(v>=1&&v<=12)?v:0;
      if(v>=1&&v<=11){ var nowH=now.getHours()+now.getMinutes()/60; if(v+12<=nowH) v+=12 }
      return hit(pad2(v)+':00',near||ch,0,amb) });
    var dayShift=0;
    dayShift=ds0.shift;
    return {text:s.replace(/\s+/g,' '),hits:hits,dayShift:dayShift};
  }

  /* ── подготовка фразы: поправки числом, тара при названном объёме, размеры, повторы, диапазоны ── */
  var VOL='(?:г|гр|грамм\\S*|мл|миллилитр\\S*|кг|кило\\S*|л|литр\\S*)';
  var CUP='(?:стакан\\S*|чашк\\S*|кружк\\S*|тарелк\\S*|миск\\S*|пиал\\S*|бокал\\S*)';
  function fixes(s){
    ALIAS.forEach(function(r){ s=s.replace(r[0],r[1]) });
    /* «100 г, нет, 200 г» — остаётся последнее число; «стакан, нет, большая чашка» — последняя тара */
    s=s.replace(new RegExp('(\\d+(?:[.,]\\d+)?)\\s*'+VOL+'?\\s*[,.]?\\s*нет\\s*[,.]?\\s*(?=\\d)','g'),' ');
    s=s.replace(new RegExp(CUP+'\\s*[,.]?\\s*нет\\s*[,.]?\\s*(?=(?:больш\\S*|маленьк\\S*)?\\s*'+CUP+')','g'),' ');
    s=s.replace(/(^|\s)(глубок\S*|по вкусу)(?=\s|$)/g,' ');
    if(SP) s=s.replace(/(американо|капучино|латте|раф|флэт уайт|кофе)\s+(?:в\s+котор\S+|с|на)\s+(?:\d+|одним|двумя|тремя|двух|трех)\s+шот\S*(?:\s+(?:кофе|эспрессо))?(?=\s|$)/g,'$1')
      .replace(/(американо|капучино|латте|раф|флэт уайт|кофе)\s*,\s*(?:\d+|одним|двумя|тремя)\s+шот(?:ами|ом)(?:\s+(?:кофе|эспрессо))?(?=\s|$)/g,'$1');   // Meal 33.12: «с тремя шотами» после разбора речи выглядит как «, 3 шотами»
    return s;
  }
  var MEAT=/(^|\s)(мяс|говя|баран|свин|теля|кур(иц|ин)|цыпл|индей|утк|гус|крол|конин|ягн)/;
  var GENW=/^(торт|суп|салат|каш[аиу]|пирог|пирож|бутерброд|сэндвич|сендвич|пицц|конфет|печень[ея]|морожен|булочк|булк|запеканк|рагу|котлет|десерт|выпечк|сладк)/;
  function lastOf(word){
    var ds=Object.keys(DB.days||{}).sort();
    for(var i=ds.length-1;i>=0;i--){ var it=(DB.days[ds[i]].items)||[]; for(var j=it.length-1;j>=0;j--){ var x=it[j]; if(FOODS[x.fid]&&!x.tap&&headOk(x.fid,[word])) return x } }
    return null;
  }
  function lastNamed(re){
    var ds=Object.keys(DB.days||{}).sort();
    for(var i=ds.length-1;i>=0;i--){ var it=(DB.days[ds[i]].items)||[]; for(var j=it.length-1;j>=0;j--){ var x=it[j]; if(FOODS[x.fid]&&!x.tap&&re.test(norm(FOODS[x.fid].n))) return x } }
    return null;
  }
  var GENERIC=/^(мяс(о|а|ом|е)|рыб(а|у|ы|ой)|овощ(и|ей|ами)|фрукт(ы|ов)|ягод(ы|а)|орех(и|ов|а)|сыр(а|ом)?|колбас(а|ы|у)|каш(а|и|у))$/;
  var PREP=/^(с|со|из|в|во|на|без|для|под|по|к|у)$/;
  var SIZE=/^(маленьк|небольш|средн|больш|крупн|глубок)/;
  function kindOf(w){ var n=norm(w); return /^\d+(,\d+)?$/.test(n)||numOf(n)!==null?'N':unitOf(n)?'U':PREP.test(n)||STOP[n]||SIZE.test(n)?'S':'F' }
  function descr(w){ var n=norm(w); return W_ADJL.test(n)||STF.some(function(p){ return p[1].test(n) }) }
  function splitItems(c){
    var out=[], cur=[], hasN=false, hasF=false, last='', prevW='', lastU='', ws=c.split(' ');
    ws.forEach(function(w,i){
      var k=kindOf(w), cut=false;
      if(hasN&&hasF&&!PREP.test(norm(prevW))){
        if((k==='N'||k==='U')&&last==='F') cut=true;                 // «три фейхоа | два мандарина», «…грудки | чашка бульона»
        if(SP&&cut&&k==='N'&&i===ws.length-1&&cur[0]==='1'&&/^\d{2,4}$/.test(w)&&cur.slice(1).every(function(x){ return kindOf(x)==='F' })) cut=false;   // Meal 33.12: «одна груша 180» — вес этой груши
        if(k==='F'&&(last==='N'||last==='U')){                       // «груша 160 | хурма 110»
          var tail=true, more=false; for(var j=i+1;j<ws.length;j++){ var kj=kindOf(ws[j]); if(kj==='F'){ tail=false; break } if(kj==='N'||kj==='U') break }
          for(var j2=i+1;j2<ws.length;j2++){ var k2=kindOf(ws[j2]); if(k2==='N'||k2==='U'){ more=true; break } }
          cut=!(descr(w)&&(tail||SP&&!more));                        // «горбуша 170 консервированная», «грибы 150 солёные опята» — одно целое
        }
        /* Meal 33.12: вес уже назван граммами, а дальше новое число и продукт — это следующая еда: «паштет 30 г | 20 г багета», «лука 50 г | пол чайной ложки масла» */
        if(SP&&k==='N'&&last==='U'&&/^(г|мл|кг|л)$/.test(lastU)&&!/^%/.test(ws[i+1]||'')){
          var j3=i+1; while(ws[j3]!=null&&/^[US]$/.test(kindOf(ws[j3]))) j3++;
          if(ws[j3]!=null&&kindOf(ws[j3])==='F') cut=true;
        }
      }
      /* Meal 33.12: мера без числа тоже начинает новую еду: «щепотка соли | щепотка перца» */
      if(SP&&!cut&&k==='U'&&last==='F'&&hasF&&!hasN&&!PREP.test(norm(prevW))&&cur.some(function(x){ return kindOf(x)==='U' })) cut=true;
      if(cut){ out.push(cur.join(' ')); cur=[]; hasN=hasF=false; lastU='' }
      cur.push(w); if(k==='N') hasN=true; if(k==='F') hasF=true; if(k==='U') lastU=unitOf(norm(w))||''; if(k!=='S') last=k; prevW=w;
    });
    if(cur.length) out.push(cur.join(' '));
    return out;
  }
  var WASTE='(?:остат\\S*(?:\\s+несъедобн\\S*\\s+част\\S*)?|несъедобн\\S*(?:\\s+част\\S*)?|кожур\\S*|кожиц\\S*|косточ\\S*|кост(?:и|ей)|скорлуп\\S*|стерж\\S*|кочерыж\\S*|очистк\\S*|шкурк\\S*|отход\\S*)';
  function chunksOf(s){
    s=' '+s+' ';
    s=s.replace(new RegExp('[\\s,]+(?:и\\s+|а\\s+)?(?:весит\\s+|было\\s+)?'+WASTE+'(?:\\s+(?:весит|было|вес|после еды|осталось|остался|осталась))*\\s+(\\d+(?:[.,]\\d+)?)\\s*(?:г|гр|грамм\\S*)?(?=[\\s,.;!?]|$)','g'),function(m,n){ return ' ⊖'+n.replace(',','.')+' ' });
    s=s.replace(/(\d)[,.](\d)/g,'$1#$2');
    s=s.replace(/(\sиз\s+[а-я]+(ов|ев|ей|ок|ек))\s+и\s+([а-я]+(ов|ев|ей|ок|ек))(?=[\s,.;:!?]|$)/g,'$1 $3');
    if(SP) s=s.replace(/(\sсо?\s+[а-я]+(?:ой|ей|ом|ем|ами|ями|ью))\s+и\s+([а-я]{3,}(?:ой|ей|ом|ем|ами|ями|ью))(?=[\s,.;:!?]|$)/g,'$1 с $2');   // Meal 33.12
    s=s.replace(/[\s,.;!]+нет(?:\s*,?\s*(?:неправильно|не так|не то|ошибся|ошиблась|исправь|точнее))*[\s,.;!]+/g,' , ¶ ');
    if(SP) s=s.replace(/\sеще\s+(?=\d)/g,' , ').replace(/([а-я])\s+([▽◇△])\s*(?=[а-я])/g,'$1 , $2 ');   // Meal 33.12: «груша 180 ещё 180 г гречки» — две еды
    return s.split(/[,.;:!?\n…]+|\s(?:и|а|потом|плюс|затем)\s/).map(function(c){ return c.replace(/#/g,',').replace(/\s+/g,' ').trim() }).filter(Boolean)
      .map(function(c){ var mk=''; c=c.replace(MK,function(x){ mk+=x; return ' ' }).replace(/\s+/g,' ').trim();
        var corr=c.charAt(0)==='¶'; if(corr) c=c.slice(1).trim(); var mn=c.match(/⊖([\d.]+)/); if(mn) c=c.replace(mn[0],' ').replace(/\s+/g,' ').trim();
        var parts=one(c); if(corr&&parts.length) parts[0]='¶'+parts[0]; if(mn&&parts.length) parts[parts.length-1]+=' ⊖'+mn[1]; if(mk&&parts.length){ parts[parts.length-1]+=' '+mk; if(mk.indexOf('⊙')>=0) parts=parts.map(function(x,i){ return i<parts.length-1?x+' ⊙':x }) } return parts })
      .reduce(function(a,c){ return a.concat(c) },[]);
  }
  function one(c0){
    return [c0].filter(Boolean).map(function(c){ if(!/\d/.test(c)) return c; var seen={}; return c.split(' ').filter(function(w,i,ws){ if(kindOf(w)!=='F') return true; if(seen[w]&&ws[i-1]!==w) return false; seen[w]=1; return true }).join(' ') })
      .reduce(function(a,c){ return a.concat(splitItems(c)) },[]);
  }
  function prepChunk(c){
    var o={text:c,raw:c,dup:null,range:null,size:null,corr:c.charAt(0)==='¶'};
    if(o.corr) c=c.slice(1);
    /* пометки словаря: ≈ примерно; ⊕ ⊘ множитель меры; ▽ ◇ △ количество без числа */
    (c.match(MK)||[]).forEach(function(x){ if(x==='⊙') o.own=true; else if(x==='≈') o.approx=true; else if(SP&&SP.marks.fac[x]) o.fac=SP.marks.fac[x]; else if(SP&&SP.marks.vague[x]) o.vague=SP.marks.vague[x] });
    c=c.replace(MK,' ');
    var mn=c.match(/⊖([\d.]+)/); if(mn){ o.minus=+mn[1]; c=c.replace(mn[0],' ') }
    var t=' '+c+' ';
    /* названы граммы или миллилитры — тара рядом лишь описание: «большая чашка 400 мл бульона» */
    if(new RegExp('\\d\\s*'+VOL+'(?=\\s)').test(t)&&new RegExp('\\s'+CUP+'(?=\\s)').test(t))
      t=t.replace(new RegExp('\\s(?:(?:один|одна|одну|больш\\S*|маленьк\\S*)\\s+)?'+CUP+'(?=\\s)','g'),' ');
    /* Meal 33.9: названы граммы или миллилитры — они главнее куска, штуки и другой меры рядом: «кусок хлеба 20 г» — 20 г */
    if(SP&&new RegExp('\\d\\s*'+VOL+'(?=\\s)').test(t)){
      var w0=t.trim().split(/\s+/), keep=[];
      w0.forEach(function(w,i){ var un=unitOf(norm(w));
        if(un&&!/^(г|кг|мл|л)$/.test(un)){ var pv=keep[keep.length-1]; if(pv!=null&&(/^\d+(,\d+)?$/.test(pv)||numOf(norm(pv))!==null)&&!new RegExp('^'+VOL+'$').test(w0[i+1]||'')) keep.pop(); return }
        keep.push(w) });
      t=' '+keep.join(' ')+' ';
    }
    /* Meal 33.12: «одна груша 180» — штука названа, а число в конце без меры — её вес в граммах */
    if(SP){ var og=t.match(/^\s1\s+((?:[а-я-]+\s+){1,3})(\d{2,4})\s$/); if(og&&!og[1].trim().split(/\s+/).some(function(w){ return kindOf(w)!=='F' })) t=' '+og[1]+og[2]+' г ' }
    var words=t.trim().split(/\s+/), out=[];
    words.forEach(function(w,i){
      var prev=out[out.length-1];
      if(prev!=null&&w===prev){
        if(/^\d/.test(w)) return;                       // «50 50 г» — одно число
        o.dup=w; return;                                // «груша груша», «хлеба хлеба»
      }
      if(prev!=null&&/^\d+$/.test(prev)&&/^\d+$/.test(w)){ o.range=[+prev,+w]; out[out.length-1]=w; return }   // «140 150 г», «25 250 г»
      out.push(w);
    });
    t=' '+out.join(' ')+' ';
    var sz=t.match(/\s(маленьк|небольш|средн|больш|крупн)\S*(?=\s)/);
    if(sz){ if(!new RegExp(CUP).test(t)) o.size=/^(маленьк|небольш)/.test(sz[1])?'маленький':/^средн/.test(sz[1])?'средний':'большой'; t=t.replace(sz[0],' ') }
    o.noUnit=!t.trim().split(/\s+/).some(function(w){ return kindOf(w)==='U' });
    o.text=t.replace(/\s+/g,' ').trim();
    o.hasNum=/\d/.test(o.text)||o.text.split(' ').some(function(w){ return numOf(norm(w))!==null||!!unitOf(norm(w)) });
    return o;
  }
  /* Meal 33.9 · решения Астамура 17.11.2026: своя мера человека — первой; не спрашивать, пока есть за что зацепиться */
  function speechLine(l,c){
    preferPlain(l);
    var id=l.fid||l.alts[0], f=FOODS[id]; if(!f) return;
    var mass=new RegExp('\\d\\s*'+VOL+'(?=\\s)').test(' '+c.text+' ');
    if(!mass){ var ou=SP.ownUnit(f,c.raw||c.text); if(ou&&l.u!==ou){ l.u=ou; if(!l.explicit) l.q=1; l.explicit=true; l.g=gramsFor(id,l.q,l.u) } }
    /* у выбранного продукта нет такой меры, а у соседнего есть («пять колец лука» — лук, а не луковый сок) */
    /* …или у соседнего мера своя, а у выбранного только общая («ложка мисо» — паста, а не мисо-суп) */
    function own(fx,u){ return (fx.own&&fx.own[u])||(fx.por&&fx.por[u])||SP.group(fx,u) }
    if(l.explicit&&l.u&&l.u!=='г'&&l.u!=='шт'&&!own(f,l.u)&&!(l.u==='кусок'&&SP.weight(f,'ломтик'))){
      var fw0=String(l.spoken||l.name||'').split(' ').filter(Boolean), had=SP.weight(f,l.u),
          alt=(l.alts||[]).filter(function(x){ return x!==id&&FOODS[x]&&(had?own(FOODS[x],l.u):SP.weight(FOODS[x],l.u))&&headOk(x,fw0) })[0];
      if(alt){ l.alts=[alt].concat(l.alts.filter(function(x){ return x!==alt })); l.fid=alt; l.st='ok'; id=alt; f=FOODS[alt]; l.g=gramsFor(id,l.q,l.u) }
    }
    if(l.explicit&&l.u&&l.u!=='г'&&l.u!=='шт'&&!SP.weight(f,l.u)){
      if(l.u==='кусок'&&SP.weight(f,'ломтик')){ l.u='ломтик'; l.g=gramsFor(id,l.q,l.u) }
      else if(l.u==='порция'&&SP.usual(f,false)){ l.u=SP.usual(f,false); l.g=gramsFor(id,l.q,l.u); l.approx=true }
      else { l.count=l.q; l.countU=l.u; l.explicit=false }
    }
    if(c.fac&&l.explicit&&l.u!=='г'&&!l.facDone){ l.facDone=true; l.q=Math.round(l.q*c.fac*100)/100; l.g=gramsFor(id,l.q,l.u); l.approx=true }
    if(c.approx) l.approx=true;
    if(c.vague&&!l.explicit) l.vague=c.vague;
  }
  /* способ не назван — обычный продукт: «пучок укропа» — свежий укроп, а не семена и не сушёный (правило Астамура 24.10: без способа — сырое) */
  var DRYW=/(семен|сушен|молот|сублимир|порош|консерв|маринов|солен|копчен|вялен|заморож)/;
  function preferPlain(l){
    if(l.pin) return;
    var ids=(l.fid?[l.fid]:[]).concat(l.alts||[]).filter(function(x,i,a){ return x&&FOODS[x]&&a.indexOf(x)===i }); if(ids.length<2) return;
    var said=norm(String(l.spoken||l.name||'')), fw=said.split(' ').filter(Boolean);
    if(!DRYW.test(norm(FOODS[ids[0]].n))||DRYW.test(said)) return;
    var ok=ids.filter(function(x){ return !DRYW.test(norm(FOODS[x].n))&&headOk(x,fw) })[0]; if(!ok) return;
    l.fid=ok; l.alts=[ok].concat(ids.filter(function(x){ return x!==ok })); l.st='ok'; l.picked=true; l.g=gramsFor(ok,l.q,l.u);
  }
  /* обычная мера подставляется только в новой диктовке и после ответа на вопрос; в поправках и заменах («перепиши капучино на кефир») количество остаётся прежним */
  var FILLOK=false;
  /* привычная порция человека: сколько этого продукта он сам называл в последних записях (чаще всего; при равенстве — последнее).
     Записи с «≈», которые бот поставил сам, и нажатия счётчиков не считаются. Решение Астамура 17.11.2026 22:08 */
  function habit(fid){
    var seen=[], ds=Object.keys(DB.days||{}).sort();
    for(var i=ds.length-1;i>=0&&seen.length<5;i--){ var it=(DB.days[ds[i]].items)||[]; for(var j=it.length-1;j>=0&&seen.length<5;j--){ var x=it[j]; if(x.fid===fid&&!x.approx&&!x.tap&&x.q>0&&x.u) seen.push(x) } }
    if(!seen.length) return null;
    var cnt={}, best=null; seen.forEach(function(x){ var k=x.q+'|'+x.u; cnt[k]=(cnt[k]||0)+1 });
    seen.forEach(function(x){ if(!best||cnt[x.q+'|'+x.u]>cnt[best.q+'|'+best.u]) best=x });
    return {q:best.q,u:best.u};
  }
  function habitFill(l){
    if(!SP||!l.fid||l.count||!FOODS[l.fid]||Object.keys(FOODS[l.fid].own||{}).length) return false;   // своя мера человека — первой
    var hb=habit(l.fid); if(!hb) return false;
    var q=Math.round(hb.q*(l.vague||1)*100)/100, g=gramsFor(l.fid,q,hb.u); if(!(g>0)) return false;
    l.q=q; l.u=hb.u; l.g=g; l.explicit=true; l.approx=true; l.usual=true; l.habit=true; return true;
  }
  /* Meal 33.12 · слово человека → точный продукт базы (словарь, product_pins): «квашеная капуста» — капуста, а не её сок */
  var PINC={};
  function pinFid(name){
    var k=norm(name); if(PINC[k]!==undefined&&PINC[k]!==null) return PINC[k];
    var ids=[], r; try{ r=parseText(String(name).replace(/[,—()«»]+/g,' ').replace(/\s+/g,' ').trim()) }catch(e){ r={lines:[]} }
    r.lines.forEach(function(x){ ids=ids.concat([x.fid]).concat(x.alts||[]) });
    var id=ids.filter(function(x){ return x&&FOODS[x]&&norm(FOODS[x].n)===k })[0]||null;
    if(id) PINC[k]=id; return id;
  }
  function pinLine(l,c){
    if(!SP||!SP.pin||c.memPart||l.ofp) return;
    var hit=SP.pin(tokensOf(c.text),c.text,l.u,!!(c.vague||l.vague),!l.explicit); if(!hit) return;
    var id=pinFid(hit.name); if(!id||l.fid===id&&l.st==='ok'&&!l.bls) return;
    l.alts=[id].concat((l.alts||[]).filter(function(x){ return x!==id })).slice(0,4); l.fid=id; l.st='ok'; l.bls=0; l.pin=hit.rule;
    if(!l.explicit){ var f=FOODS[id], u=defUnit(f); l.u=u; l.q=u==='г'?100:1 }
    l.g=gramsFor(id,l.q,l.u);
  }
  function fillUsual(l,force){
    if(!SP||!l.fid||l.count||!(FILLOK||force)) return false;
    if(habitFill(l)) return true;
    var f=FOODS[l.fid], u=SP.usual(f,!!l.vague); if(!u) return false;
    var q=l.vague||1, g=gramsFor(l.fid,q,u); if(!(g>0)) return false;
    l.q=q; l.u=u; l.g=g; l.explicit=true; l.approx=true; l.usual=true; return true;
  }
  function needQty(l){ return !l.explicit&&!isDrink(l.fid)&&!fillUsual(l,true) }
  function histCount(){ var h={}; Object.keys(DB.days||{}).forEach(function(d){ ((DB.days[d]||{}).items||[]).forEach(function(x){ h[x.fid]=(h[x.fid]||0)+1 }) }); return h }

  /* фраза → строки. У каждой строки: ready (можно записать) или ask (о чём спросить) */
  /* «390 г плова, из них 160 г мяса»: блюдо пишется целиком, часть — внутри его веса, не сверху */
  function understand(text){
    var mm=String(text).match(/^(.*?)[\s,]+(?:из них|из которых|из него|из нее|из неё|в том числе|в т\\.?\\s?ч\\.?|включая|внутри)\s+(.*)$/);
    if(!mm) return core(text);
    var tail=mm[2], rest='', sp=tail.match(/^(.*?)[\s,]+(?:и\s+)?(?:еще|потом|затем|плюс|отдельно)\s+(.*)$/);
    if(sp){ tail=sp[1]; rest=sp[2] }
    var head; NOSPLIT=true; try{ head=core(mm[1]) } finally { NOSPLIT=false }   // «гречка с курицей 350 г, из них 120 г курицы» — делит названная часть, а не правило «А с Б»
    var comp=core(tail), more=rest?core(rest):{lines:[]};
    var d=head.lines[head.lines.length-1], c=SP?comp.lines[0]:comp.lines[comp.lines.length-1], extra=SP?comp.lines.slice(1):[];   // Meal 33.12
    if(d&&c&&(c.fid||c.alts.length)){
      var cf=c.fid||c.alts[0];
      var cn=String(c.spoken||c.name||'').split(' ').filter(function(w){ return w&&!NEUTRAL.test(w)&&!GENERIC.test(w) }).join(' ')||String(FOODS[cf].n).split(/[,(—]/)[0].toLowerCase();
      if(d.explicit&&c.g>=d.g){ d.ask='inc'; d.inc={fid:cf,g:c.g,n:cn} }
      else {
        d.inc={fid:cf,g:c.g,n:cn};
        /* «плов» + «баранина» → «Плов с бараниной», если такой есть */
        var cw=String(c.spoken||c.name||'').split(' ').filter(function(w){ return !NEUTRAL.test(w)&&!GENERIC.test(w) }), dn=String(d.spoken||d.name||'');
        if(cw.length&&dn){ var r2=core(dn+' '+cw.join(' ')).lines[0], f2=r2&&(r2.fid||r2.alts[0]);
          if(f2&&f2!==d.fid&&related(f2,dn.split(' '))&&related(f2,cw)){ d.fid=f2; d.alts=[f2].concat(d.alts.filter(function(x){ return x!==f2 })); d.st='ok'; d.g=gramsFor(f2,d.q,d.u); if(d.ask==='pick') d.ask=null } }
      }
    }
    /* часть внутри блюда («из них», «в том числе»): если в базе есть то же блюдо без этой части —
       две записи: блюдо без части = целое − часть, и часть отдельно (мясо — готовое: тушёное, варёное…).
       Нет такого блюда в базе — одна запись с пометкой, а пара «блюдо без части» уходит в список недостающего */
    if(d&&c&&d.inc&&d.ask!=='inc'){
      var dn2=String(d.spoken||d.name||'').trim(), cq=String(c.spoken||c.name||'').split(' ').filter(function(w){ return w&&!GENERIC.test(w) }).join(' ')||String(c.spoken||c.name||'');
      var cstem=norm(cq.split(' ')[0]).slice(0,4), isMeat=MEAT.test(String(c.spoken||c.name||'')+' '+cq);
      /* «омлет с сыром» без «с сыром» — «омлет» */
      var cstems=String(c.spoken||c.name||'').split(' ').concat(cq.split(' ')).map(function(w){ return norm(w).slice(0,3) }).filter(function(x){ return x.length>=3&&!/^(с|со|из|в|на)$/.test(x) });
      var dn2b=(' '+dn2+' ').replace(/\s(с|со)\s+\S+/g,' ').trim();
      var dbare=dn2b.split(' ').filter(function(w){ var n=norm(w); return !cstems.some(function(st){ return n.indexOf(st)===0 })&&!GENERIC.test(n)&&!/^(с|со)$/.test(n)&&!(isMeat&&MEAT.test(n)) }).join(' ')||dn2;
      var dw2=dbare.split(' ').filter(Boolean), pool=[];
      [dbare, dn2, dbare+' без '+cq, dbare+(isMeat?' без мяса':''), dbare+' вегетарианский'].forEach(function(q){ var r=core(q).lines[0]; if(r) pool=pool.concat([r.fid].concat(r.alts||[])) });
      var plain=pool.filter(function(x,i,a){
        if(!x||!FOODS[x]||a.indexOf(x)!==i||!headOk(x,dw2)) return false;
        var n=FOODS[x].n.toLowerCase().replace(/ё/g,'е'), out=n.replace(/\([^)]*\)/g,' ');
        if(cstem&&n.indexOf(cstem)>=0) return false;                        // в названии та же часть — не то
        if(isMeat&&words(x).some(function(w){ return MEAT.test(w) })) return false;
        if(/\s(с|со)\s/.test(out)) return false;                           // «омлет с ветчиной» — другое блюдо
        /* в названии только само блюдо и способ приготовления: «Салат греческий», «Пицца „Четыре сыра“» — уже с чем-то внутри */
        var ws=out.split(/[^a-zа-я0-9%]+/).filter(Boolean), skip=false;
        return ws.every(function(w){
          if(skip){ skip=false; return true }
          if(/^(без|на)$/.test(w)){ skip=true; return true }
          if(/^\d/.test(w)||w==='%'||PREP.test(w)||NEUTRAL.test(w)||STF.some(function(pp){ return pp[1].test(w) })||/^(сыр(ой|ая|ое|ые)|жарен|варен|туш|запеч|печен)/.test(w)) return true;
          return dw2.some(function(q){ return sim(q,w)>=1.8||adjStem(q)&&adjStem(q)===adjStem(w) });
        });
      })[0];
      if(plain&&d.g>c.g){
        var cid=null, same=[];
        if(isMeat){
          [['тушеная','туш'],['вареная','вар'],['запеченная','запеч'],['жареная','жар']].some(function(pr){
            var r=core(cq+' '+pr[0]).lines[0]; if(!r) return false;
            [r.fid].concat(r.alts||[]).forEach(function(x){ if(!x||!FOODS[x]) return; var n=FOODS[x].n.toLowerCase().replace(/ё/g,'е');
              if(n.indexOf(pr[1])<0||/\sс\s(?!маслом)|,\s*с\s/.test(n)||n.indexOf(cstem)<0||same.indexOf(x)>=0) return;
              if(/субпродукт|сердц|печен[ьи]|почк|желуд|язык|хвост|фарш|голяшк|паштет|колбас|сосис|котлет/.test(n)) return;   /* мясо из блюда — не субпродукты */ if(!cid) cid=x; same.push(x) });
            return !!cid });
        }
        if(!cid){
          /* часть — сама по себе: «сулугуни», а не «Абыста с сулугуни» */
          var cw3=cq.split(' ').filter(Boolean), cp=[c.fid].concat(c.alts||[]); var r3=core(cq).lines[0]; if(r3) cp=cp.concat([r3.fid].concat(r3.alts||[]));
          cid=cp.filter(function(x,i,a){ if(!x||!FOODS[x]||a.indexOf(x)!==i) return false; var o=FOODS[x].n.toLowerCase().replace(/ё/g,'е').replace(/\([^)]*\)/g,' ');
            return !/\s(с|со)\s/.test(o)&&headOk(x,cw3) })[0]||null;
        }
        cid=cid||c.fid||c.alts[0];
        var total=d.g;
        d.fid=plain; d.alts=[plain]; d.st='ok'; d.q=Math.round((total-c.g)*10)/10; d.u='г'; d.g=d.q; d.explicit=true; d.ask=null;
        d.inc=null; d.split={total:total,part:c.g,n:cq};
        c.fid=cid; c.alts=same.length?same:[cid].concat((c.alts||[]).filter(function(x){ return x!==cid })); c.picked=c.alts.length>1; c.st='ok'; c.q=c.g; c.u='г'; c.explicit=true; c.ask=null; c.fromDish=dn2;
        head.lines.push(c);
      } else if(!plain) missLog('нет блюда без части',dbare+' без «'+cq+'»',text);
    }
    var res=head; res.lines=head.lines.concat(extra,more.lines); res.others=(head.others||[]).concat(comp.others||[],more.others||[]);
    if(more.meal) res.meal=more.meal; if(!res.orphan) res.orphan=more.orphan;
    return res;
  }
  function core(text){
    var res={lines:[],meal:null,orphan:null}, hist=null;
    if(SP){ /* «ребёнок съел…» — ел не владелец дневника; «мне», «себе», «я» — пометка «это моё» */
      text=(' '+text+' ').replace(/(^|\s)(ребенок|дети|малыш|сын|сынок|дочь|дочка|муж|жена|мама|папа|бабушка|дедушка|брат|сестра|гости|гость|друг|подруга|кот|кошка|собака|пес)\s+(?:не\s+)?⊙/g,'$1$2 ')
        .replace(/(^|\s)(мне|себе|я|сам|сама|у меня)(?=\s)/g,'$1⊙'); }
    var cs=chunksOf(text).map(prepChunk), merged=[];
    var carry=null, carryOther=false, lastOtherFood='', wantFood=false;
    function qtyOf(txt){ return txt.split(' ').filter(function(w){ var k=kindOf(w); return k==='N'||k==='U' }).join(' ') }
    function foodOf(txt){ return txt.split(' ').filter(function(w){ var k=kindOf(w); return k!=='N'&&k!=='U' }).join(' ') }
    cs.forEach(function(c){
      /* аккаунт — одного человека: в дневник идёт только то, что съел он сам. «Положила детям по две котлеты и пюре», «ребёнок съел котлету», «мужу три, мне две»:
         чужое не пишется, и это действует до конца фразы, пока человек не сказал про себя («мне», «я», «съела»). Уронил, пролил — тоже не съедено. Решение Астамура 18.11.2026 */
      var T=' '+c.text+' ', notEaten=NOTEATEN.test(T), other=hasW(SUBJ,T)||hasW(RECIP,T);
      if(other||notEaten){
        if(other){ carryOther=true; var lf0=tokensOf(c.text.replace(RECIP,' ').replace(SUBJ,' ')).join(' ');
          if(lf0&&/\d/.test(c.text)){ lastOtherFood=lf0; wantFood=false } else if(/\d/.test(c.text)) wantFood=true }
        (res.others=res.others||[]).push(c.text); return }
      if(c.own||hasW(OWNW,T)){
        carryOther=false; c.text=T.replace(OWNW,' ').replace(/\s+/g,' ').trim();
        if(!tokensOf(c.text).length&&/\d/.test(c.text)&&lastOtherFood) c.text+=' '+lastOtherFood;      // «мужу три котлеты, мне две» — две котлеты
        if(!c.text) return }
      else if(carryOther){ var lf1=tokensOf(c.text).join(' '); if(lf1&&(wantFood||/\d/.test(c.text))){ lastOtherFood=lf1; wantFood=false } (res.others=res.others||[]).push(c.text); return }
      var food=tokensOf(c.text), last=merged[merged.length-1];
      if(c.corr&&last){
        /* «…, нет, …»: поправка последнего названного. Только число — меняется количество; назван продукт — меняется продукт */
        res.corrected=true;
        if(!food.length&&c.hasNum){ last.text=foodOf(last.text)+' '+c.text; last.hasNum=true; last.soft=null; last.range=c.range; if(c.approx) last.approx=true; return }
        if(food.length){ merged.pop(); if(!c.hasNum&&last.hasNum) c.soft=last.soft||qtyOf(last.text); merged.push(c); return }
        return;
      }
      if(c.corr&&!last){ res.leadNo=true }
      if(last&&last.soft&&!food.length&&c.hasNum){ last.soft=null; last.text+=' '+c.text; last.hasNum=true; return }
      if(!food.length){
        if(!c.hasNum&&!/[а-яa-z]/.test(c.text)) return;
        if(last&&c.hasNum&&!last.hasNum){ last.text+=' '+c.text; last.hasNum=true; last.range=last.range||c.range; if(c.approx) last.approx=true; if(c.fac) last.fac=c.fac; return }   // «борщ, две тарелки»
        /* Meal 33.9: «полвилка капусты, после очистки 400 г» — названный вес заменяет долю и штуки, а не складывается с ними */
        if(SP&&last&&c.hasNum&&last.hasNum&&new RegExp('\\d\\s*'+VOL+'(?=\\s)').test(' '+c.text+' ')&&!new RegExp('\\d\\s*'+VOL+'(?=\\s)').test(' '+last.text+' ')){ last.text=foodOf(last.text)+' '+c.text; last.fac=null; return }
        if(c.hasNum){ res.orphan=c.text; carry=c.text; return }                                // «50 г» — чего? или «160 г мяса, говядина»
        if(hasMeal(c.text)){ c.mealOnly=true; merged.push(c) }                                 // «на ужин» — отдельным куском: относится к тому, что дальше
        else if(last) last.text+=' '+c.text;
        else merged.push(c);
        return;
      }
      /* «160 г мяса, говядина» — общее слово уточнено следующим: одно целое */
      if(last&&last.hasNum&&!c.hasNum&&!c.corr){ var lf=tokensOf(last.text); if(lf.length&&lf.every(function(w){ return GENERIC.test(w) })){ last.text+=' '+c.text; return } }
      if(carry&&!c.hasNum){ c.text=carry+' '+c.text; c.hasNum=true; if(res.orphan===carry) res.orphan=null }
      carry=null;
      merged.push(c);
    });
    /* «А с Б», которого нет в базе одним блюдом, — части по отдельности */
    var cps=[];
    var curMeal=null, tailMeal=null;
    function proc(c){
      if(c.soft){ c.text=c.soft+' '+c.text; c.soft=null }
      var minus=c.minus||0;
      if(c.dup) res.dupSeen=true;
      var r=parseText(c.text); if(c.mealFix&&!r.meal) r.meal=c.mealFix; if(r.meal){ res.meal=curMeal=r.meal; tailMeal=(c.mealOnly&&!r.lines.length)?r.meal:null }
      if(r.lines.length) tailMeal=null;
      if(c.memPart&&!r.lines.length) r.lines=[{id:'l'+(++SEQ),raw:c.text,q:null,u:null,fid:null,alts:[],st:'none',name:c.text,explicit:false}];
      r.lines.forEach(function(l,li){
        l.meal=curMeal;
        if(c.memPart){ if(li) return; var mp=c.memPart;   // блюдо из частей, как человек записывал его раньше
          l.fid=mp.fid; l.alts=[mp.fid]; l.st='ok'; l.q=mp.q; l.u=mp.u; l.g=gramsFor(mp.fid,mp.q,mp.u); l.explicit=true; l.approx=true; l.ask=null; l.spoken=l.name;
          if(!c.comp.fresh) l.sameAs=true; l.comp=c.comp; c.comp.lines.push(l); res.lines.push(l); return }
        if(li===0&&!c.memPart&&r.lines.length>1&&SP&&SP.pin&&SP.pin(tokensOf(c.text),c.text,l.u,!!(c.vague||l.vague),!l.explicit)) r.lines.length=1;   // «грудки с копчёной» — одно название, а не грудка и «копчёный угорь»
        if(r.lines.length===1) pinLine(l,c);
        var f=FOODS[l.fid||l.alts[0]];
        if(c.size&&f&&f.por&&f.por[c.size]&&(l.u==='шт'||!l.explicit||l.u===defUnit(f))){ l.u=c.size; if(!l.explicit){ l.q=1 } l.explicit=true; l.g=gramsFor(l.fid||l.alts[0],l.q,l.u) }
        l.ask=null; l.spoken=l.spoken||l.name;
        if(minus){ l.whole=l.g; l.waste=minus; if(minus>=l.g){ l.ask='waste' } else { l.q=Math.round((l.g-minus)*10)/10; l.u='г'; l.g=l.q; l.explicit=true } minus=0 }
        var fw=String(l.name||'').split(' ').filter(Boolean);
        if(SP&&fw.length&&SP.missing(fw[0])){ l.fid=null; l.alts=[]; l.st='none' }   // «пельмени»: настоящих в базе нет — не подставлять похожее по слову
        /* Meal 33.9: просто «сыр» — последний записанный сыр, иначе гауда; просто «сок» — последний записанный, иначе вопрос (решение Астамура 17.11.2026) */
        var gd=SP&&fw.length===1&&tokensOf(c.text).length===1&&(l.fid||l.alts.length)?SP.generic(fw[0]):null;
        if(gd){
          var wasG=lastNamed(gd.history), gid=null;
          if(wasG){ gid=wasG.fid; l.asBefore=true }
          else if(gd.search){ var rg=parseText(gd.search).lines[0]; gid=rg&&(rg.fid||rg.alts[0])||null; if(gid) l.picked=true }
          if(gid){ l.alts=[gid].concat(l.alts.filter(function(x){ return x!==gid })); l.fid=gid; l.st='ok'; l.bls=0; l.g=gramsFor(gid,l.q,l.u) }
          else if(gd.ask){ var op=gd.options.map(function(sx){ var rf=parseText(sx).lines[0]; return rf&&(rf.fid||rf.alts[0])||null }).filter(function(x,i,a){ return x&&a.indexOf(x)===i });
            if(EATEN) op=op.map(function(x){ return cookedId(x)||x }).filter(function(x,i,a){ return a.indexOf(x)===i });
            if(op.length) l.alts=op.concat(l.alts.filter(function(x){ return op.indexOf(x)<0 })).slice(0,3); l.fid=null; l.st='pick'; l.noAuto=true; l.gdAsk=true; l.bls=0 }
        }
        /* ответ на предложение своими граммами: «соуса 100 г» — тот самый соус, что был предложен, а не первый попавшийся */
        var ofp=OFP&&fw.length===1&&fw[0].length>=4?OFP.filter(function(x){ return FOODS[x.fid]&&norm(FOODS[x.fid].n).split(/[^а-яё]+/).some(function(w){ return w.length>=4&&w.slice(0,4)===norm(fw[0]).slice(0,4) }) })[0]:null;
        if(ofp){ l.fid=ofp.fid; l.alts=[ofp.fid].concat((l.alts||[]).filter(function(x){ return x!==ofp.fid })); l.st='ok'; l.picked=true; l.bls=0; l.ofp=true; l.g=gramsFor(l.fid,l.q,l.u) }
        /* общее слово («торт», «суп», «салат»): был такой раньше — тот же и той же порцией; не было — спросить, какой */
        if(!ofp&&fw.length===1&&GENW.test(fw[0])&&(l.fid||l.alts.length)&&!(gd&&l.fid&&(l.picked||l.asBefore))){
          var was=lastOf(fw[0]);
          if(was){ l.fid=was.fid; l.alts=[was.fid].concat(l.alts.filter(function(x){ return x!==was.fid })); l.st='ok'; l.asBefore=true; l.bls=0;
            if(!l.explicit){ l.q=was.q; l.u=was.u; l.explicit=true; l.sameAs=true } l.g=gramsFor(l.fid,l.q,l.u) }
          else if(l.alts.length>1){ l.fid=null; l.st='pick'; l.noAuto=true; l.bls=0 }
        }
        if(l.st==='ok'&&l.bls&&l.alts.length>1){
          hist=hist||histCount();
          if(hist[l.fid]) l.asBefore=true;
          else if(l.alts.some(function(a){ return hist[a] })||(!exactName(l.fid,fw)&&!sameKcal(l.alts))){ l.fid=null; l.st='pick' }
        }
        if(l.st==='pick'&&!l.noAuto&&l.alts.length&&!l.alts.some(function(a){ return related(a,fw) })){ l.st='none'; l.alts=[] }   // предложенное не похоже ни на одно слово
        if(l.st==='pick'&&l.alts.length&&!l.gdAsk){
          hist=hist||histCount();
          var used=l.alts.filter(function(a){ return hist[a] });
          if(used.length===1&&!WEIGHED){ l.fid=used[0]; l.st='ok'; l.g=gramsFor(l.fid,l.q,l.u); l.asBefore=true }   // «взвесил» — сырое, а не «как раньше»
          else {
            /* среди предложенных ровно один «чистый»: все слова названы, слово — само название, лишнего способа нет
               («розмарин» → свежий, а не сушёный; «белого хлеба» → «Хлеб белый пшеничный», а не гренки) */
            var cl=l.alts.filter(function(a){ return clean(a,fw) });
            if(cl.length===1){ l.fid=cl[0]; l.st='ok'; l.g=gramsFor(l.fid,l.q,l.u) }
          }
        }
        if(c.cookDish) l.cookDish=true;
        if(SP){ var e0=EATEN; if(c.cookDish) EATEN=true; methodFix(l,fw); EATEN=e0 }   // блюдо в соусе — готовое, а не сырое
        if(SP) speechLine(l,c);
        if(c.range&&c.range[0]!==c.range[1]) l.range=c.range;
        if(l.st!=='none'&&l.explicit&&l.u==='г'&&l.q<=10&&c.noUnit&&!(c.range&&c.range[0]!==c.range[1])){ l.count=l.q; l.explicit=false;
          var dk=l.fid||l.alts[0];
          if(SP&&l.q===Math.round(l.q)&&isDrink(dk)){ var df=FOODS[dk]; l.fid=dk; l.st='ok'; l.q=l.count; l.count=null;   // Meal 33.12
            l.u=Object.keys(df.por||{}).length?defUnit(df):/эспрессо|ристретто/i.test(df.n)?'шот':'чашка'; l.g=gramsFor(dk,l.q,l.u); l.explicit=true }
          else if(!byPiece(l)){ l.ask='qty'; if(!l.fid&&l.alts.length) l.fid=l.alts[0], l.st='ok' } }
        else if(l.st==='none') l.ask='name';
        else if(l.st==='pick') l.ask='pick';
        else if(c.range&&c.range[0]!==c.range[1]) l.ask='range', l.range=c.range;
        else if(c.dup&&!l.explicit) l.ask='dup';
   // «пять перепелок» — штуки без веса штуки
        else if(!l.explicit){
          if(l.count) l.ask='qty';                                   // мера без веса («пачка»): спросить один раз и запомнить
          else if(l.vague&&fillUsual(l)){}                            // «немного сметаны» — половина обычной меры, с «≈»
          else if(FILLOK&&habitFill(l)){}                             // сколько человек обычно берёт сам
          else if(isDrink(l.fid)){ var ff=FOODS[l.fid]; if(!Object.keys(ff.por||{}).length){ l.q=1; l.u=/эспрессо|ристретто/i.test(ff.n)?'шот':'чашка'; l.g=gramsFor(l.fid,l.q,l.u) } }
          else if(!fillUsual(l)) l.ask='qty';                         // количество не названо: обычная мера продукта; нет меры — вопрос
        }
        if(c.comp){ l.comp=c.comp; c.comp.lines.push(l) }
        res.lines.push(l);
      });
    }
    merged.forEach(function(c){
      var parts=SP&&!NOSPLIT?splitComposite(c,cps):null;
      if(!parts){ proc(c); return }
      var n0=res.lines.length, cm=curMeal, tm=tailMeal, rm=res.meal, dp=res.dupSeen, cp=parts[0].comp;
      parts.forEach(proc);
      /* первая часть не понята («слойка с пеканом» — какая слойка?) — блюдо остаётся целым, как раньше: вопрос о нём, а не запись одной начинки */
      var a0=cp.lines[0];
      var a0ok=a0&&(a0.fid&&!a0.ask&&a0.g>0||a0.ask==='pick'&&!a0.noAuto&&a0.alts.some(function(x){ return covers(x,String(a0.name||'').split(' ').filter(Boolean)) }));
      if(!cp.ok&&!cp.named&&!a0ok){ res.lines.length=n0; curMeal=cm; tailMeal=tm; res.meal=rm; res.dupSeen=dp; cps.splice(cps.indexOf(cp),1); proc(c) }
    });
    /* «творог с изюмом 220 г» — названный вес всего блюда делится между частями в той же пропорции */
    cps.forEach(function(cp){
      if(!cp.total||!cp.lines.length||!cp.lines.every(function(l){ return l.fid&&!l.ask&&l.g>0 })) return;
      var sum=cp.lines.reduce(function(t,l){ return t+l.g },0), k=cp.total/sum;
      cp.lines.forEach(function(l){ var g=Math.max(1,Math.round(l.g*k)); l.q=g; l.u='г'; l.g=gramsFor(l.fid,g,'г'); l.approx=true });
    });
    res.tailMeal=tailMeal;
    return res;
  }
  /* ── блюдо «А с Б» ──
     Есть такое блюдо в базе или у человека — берётся оно. Нет — части по отдельности обычными порциями; бот предлагает, человек подтверждает или называет свои граммы,
     и в следующий раз блюдо пишется так же без вопроса. Решения Астамура 17.11.2026 21:56 и 22:08. */
  var RECIP=/(^|\s)(кошк[еиу]|кот(у|ам|ятам)|собак[еиу]|пс(у|ам)|отдал\S*|угостил\S*|детям|ребенку|малышу|дочке|дочери|сыну|жене|мужу|маме|папе|бабушке|дедушке|брату|сестре|гостям|другу|подруге)(?=\s|$)/g,
      SUBJ=/(^|\s)(ребенок|дети|малыш|сын|сынок|дочь|дочка|муж|жена|мама|папа|бабушка|дедушка|брат|сестра|гости|гость|друг|подруга|кот|кошка|собака|пес)(?=\s|$)/g,
      OWNW=/(^|\s)(мне|себе|я|сам|сама|у меня)(?=\s|$)/g,
      NOTEATEN=/(^|\s)(уронил\S*|выбросил\S*|выкинул\S*|пролил\S*|разлил\S*|просыпал\S*)(?=\s|$)/;
  function hasW(re,t){ re.lastIndex=0; var r=re.test(t); re.lastIndex=0; return r }
  /* «…но не доела, половину оставила» — пишется съеденная часть; сколько осталось, не сказано — целиком со знаком «≈» и кнопкой «Меньше» */
  var LEFT=null, LEFTK={'половин':0.5,'треть':0.67,'четверт':0.75,'немного':0.9,'чуть':0.9,'почти':0.1};
  var LEFTRE=[/[\s,]+(?:но\s+|а\s+|только\s+)?(?:я\s+)?(?:не\s+дое(?:ли|ла|л)|не\s+осили(?:ли|ла|л)|не\s+вс[её]\s+съе(?:ли|ла|л))(?:[\s,]+(?:где-то\s+|примерно\s+)?(половину|треть|четверть|немного|чуть-чуть|чуть|почти\s+вс[её])\s+(?:оставил[аи]?|осталось|осталась|остался))?(?=[\s,.!?]|$)/i,
              /[\s,]+(?:но\s+|а\s+)?(половину|треть|четверть)\s+(?:оставил[аи]?|не\s+дое(?:ли|ла|л)|осталось|осталась)(?=[\s,.!?]|$)/i,
              /[\s,]+(?:но\s+|а\s+)?(?:оставил[аи]?|осталось|осталась)\s+(половин[ау]|треть|четверть)(?=[\s,.!?]|$)/i];
  function takeLeft(raw){
    var t=String(raw), out=null;
    LEFTRE.forEach(function(re){ if(out) return; var m=re.exec(t); if(!m) return;
      var w=String(m[1]||'').toLowerCase(), key=Object.keys(LEFTK).filter(function(k){ return w.indexOf(k)===0 })[0];
      out={text:(t.slice(0,m.index)+' '+t.slice(m.index+m[0].length)).replace(/\s+/g,' ').trim(),k:key?LEFTK[key]:null,said:m[0].replace(/^[\s,]+/,'')} });
    return out;
  }
  var NOCOUNT=/(не\s+считай|не\s+учитывай|не\s+в\s+сч[её]т|это\s+не\s+записывай|это\s+не\s+надо)/i;
  var COMBK='happy-meal-bot-combos', OFP=null, FRESH=null, NOSPLIT=false, EATEN=false, NEST=0;
  /* «съел курицы 200 г» — сырую курицу не едят: берётся готовая. «Курица 200 г», «взвесил курицу» — сырая, как раньше.
     Овощи, фрукты, зелень без слов о способе — сырые. Решение Астамура 17.11.2026 23:11 */
  var COOKEDN=/(варен|отварн|тушен|жарен|запечен|приготовл|грил)/, WEIGHED=false;
  /* один и тот же продукт в разном приготовлении: «Треска, сырая» и «Треска, жаренная в духовке», «Мясо курицы…, сырое» и «…, варёное» */
  function kindKey(id){ var ws=words(id); return !ws.length?'':ws[0]==='мясо'&&ws[1]?'мясо '+ws[1].slice(0,5):ws[0].slice(0,5) }
  function cookedId(fid){
    var f=FOODS[fid], ck=f&&SP&&SP.cooked?SP.cooked(f):null; if(!ck) return null;
    var r=parseText(ck.search).lines[0], id=r&&(r.fid||r.alts[0]); if(!id||!FOODS[id]||id===fid) return null;
    if(ck.sameKind&&kindKey(id)!==kindKey(fid)) return null;
    return COOKEDN.test(norm(FOODS[id].n))?id:null;
  }
  /* способ приготовления не назван. Порядок тот же, что везде:
     1) как человек сам называл этот продукт в последний раз («жареная курица» вчера — сегодня «курица» тоже жареная; называл сырой — сырая);
     2) сказано «съел» — готовое: мясо, птица, картофель варёные, рыба и грибы жареные, яйцо варёное; сырое остаётся кнопкой замены;
     3) просто назвал или взвесил — сырое. Овощи, фрукты, зелень — сырые. Решения Астамура 17.11.2026 23:11 и 23:41 */
  function methodFix(l,fw){
    if(!l.fid||l.st!=='ok'||l.asBefore||l.cooked||l.said||WEIGHED) return;
    if(Object.keys(statesOf(fw)).length||fw.some(function(w){ return typeof W_FRESH!=='undefined'&&W_FRESH.test(norm(w)) })){ l.said=true; return }   // «свежая курица» — как «сырая»
    var k=kindKey(l.fid), ds=Object.keys(DB.days||{}).sort(), was=null;
    for(var i=ds.length-1;i>=0&&!was;i--){ var it=(DB.days[ds[i]].items)||[]; for(var j=it.length-1;j>=0&&!was;j--){ var x=it[j]; if(x.how&&!x.tap&&FOODS[x.fid]&&kindKey(x.fid)===k) was=x } }
    if(was){ var raw0=l.fid; l.asBefore=true;
      if(was.fid!==raw0){ l.fid=was.fid; l.alts=[was.fid,raw0].concat((l.alts||[]).filter(function(a){ return a!==was.fid&&a!==raw0 })); l.picked=true; l.g=gramsFor(l.fid,l.q,l.u) }
      return }
    if(!EATEN) return;
    var id=cookedId(l.fid); if(!id) return;
    var raw=l.fid; l.fid=id; l.alts=[id,raw].concat((l.alts||[]).filter(function(a){ return a!==id&&a!==raw })); l.picked=true; l.cooked=true; l.g=gramsFor(id,l.q,l.u);
  }
  function memGet(){ try{ return JSON.parse(localStorage.getItem(COMBK)||'{}')||{} }catch(e){ return {} } }
  function memSet(k,parts,n){ try{ var mm=memGet(); mm[k]={n:n>0?n:1,parts:parts}; localStorage.setItem(COMBK,JSON.stringify(mm)) }catch(e){} }
  function memOf(k){ var v=memGet()[k]; return !v?null:Array.isArray(v)?{n:1,parts:v}:v.parts?v:null }
  function compKey(text){ return tokensOf(text).map(function(w){ return w.slice(0,5) }).join('+') }
  /* «с Б» здесь — вид блюда, а не добавка: «пирог с капустой», «суп с лапшой» — не делится */
  var TOPHEAD=/^(суп|борщ|щи$|солянк|окрошк|ух[аиу]$|салат|запеканк|рагу|плов|вареник|пельмен|мант|хинкал|голубц|блин)/, TOPPING=/^(сметан|майонез|кетчуп|горчиц|хрен|аджик|соус|масл|мед|мёд|варень|джем|сгущ|хлеб|сахар|зелень|укроп|петрушк)/;
  var KINDHEAD=/^(торт|суп|борщ|щи$|солянк|окрошк|ух[аиу]$|салат|пирог|пирож|пицц|булочк|булк|запеканк|рагу|плов|вареник|пельмен|мант|хинкал|голубц|чебурек|беляш|шаурм|хачапур|лазань|ролл|суши|рулет|сырок|сырк|блин|слойк|круассан|пончик|кекс|маффин|эклер|вафл|трубочк|печень|пряник|конфет|шоколад|морожен|ватрушк|самс)/;
  var BREADHEAD=/^(бутерброд|сэндвич|сендвич|тост)/;
  var ADJ=/^.{3,}(ый|ий|ая|яя|ое|ее|ые|ие|ого|его|ую|юю|ым|им|ых|их|ыми|ими)$/;
  var ADJF=/^.{2,}(н|ск|ов|ев|ян|чат|ист|лив|ч|ж|ш|щ)(ой|ей)$/;
  /* блюдо «А с Б» есть в базе: в названии А стоит до «с», Б — после, и сверх сказанного не больше одного существительного
     («трубочка со сгущёнкой» — «Вафельная трубочка со сливочной начинкой и сгущёнкой»; «хлеб с маслом» — не «Гренки из хлеба, обжаренные в масле») */
  function dishOk(id,A,B,strict){
    var f=FOODS[id]; if(!f) return false;
    var ws=words(id), W=A.concat(B), same=function(q,w){ return sim(q,w)>=1.8||!!adjStem(q)&&adjStem(q)===adjStem(w) };
    if(!W.every(function(q){ return ws.some(function(w){ return same(q,w) }) })) return false;
    if(f.mine||String(f.src||'')==='Мои') return true;
    var iS=-1; ws.forEach(function(w,i){ if(iS<0&&(w==='с'||w==='со'||w==='в'||w==='под')) iS=i }); if(iS<1) return false;
    if(!A.every(function(q){ return ws.some(function(w,i){ return i<iS&&same(q,w) }) })) return false;
    if(!B.every(function(q){ return ws.some(function(w,i){ return i>iS&&same(q,w) }) })) return false;
    var ex=ws.map(function(w,i){ return {w:w,i:i} }).filter(function(o){ var w=o.w; return w.length>1&&!PREP.test(w)&&w!=='и'&&!W.some(function(q){ return same(q,w) })&&!ADJ.test(w)&&!ADJF.test(w)&&!/^(напиток|блюдо|готов\S*|\d+|%)$/.test(w) });
    /* блюдо с добавкой («блины со сметаной»): в начинке базы не должно быть ничего несказанного — «блины с грибами и сметаной» это другое блюдо */
    if(strict&&ex.some(function(o){ return o.i>iS })) return false;
    return ex.length<=1;
  }
  /* «котлеты в сливочном соусе», «рыба под маринадом» — то же, что «А с Б»: блюдо и то, в чём оно (решение Астамура 18.11.2026 00:55) */
  var SEPW=/\s(?:с|со)\s|\s(?:в|под)\s(?=(?:[а-я-]+\s+){0,2}(?:соус|сметан|подлив|кляр|маринад|сливк|сироп|глазур))/;
  function splitComposite(c,cps){
    if(c.corr||c.dup||c.range||c.minus||c.mealOnly||c.soft||c.size) return null;
    var txt=String(c.text).trim(); if(!SEPW.test(' '+txt+' ')||/^\s*(с|со|в|под)\s/.test(txt)) return null;
    if(SP.pin&&SP.pin(tokensOf(txt),txt,'',false,false)) return null;   // «грудка с кожей», «грудки с копчёной» — одно название
    var W=tokensOf(txt); if(W.length<2) return null;
    var key=compKey(txt), cp={key:key,src:txt,name:cap(txt.split(' ').filter(function(w){ var k=kindOf(w); return k!=='N'&&k!=='U' }).join(' ')),lines:[]};
    function part(t,extra){ var o=prepChunk(t); o.comp=cp; if(c.approx) o.approx=true; if(extra){ Object.keys(extra).forEach(function(k){ o[k]=extra[k] }) } return o }
    var lead=txt.match(/^(\d+(?:,\d+)?)\s*(?:г|гр|грамм[а-я]*|мл)\s/), trail=txt.match(/\s(\d+(?:,\d+)?)\s*(?:г|гр|грамм[а-я]*|мл)$/),
        cnt=!lead&&txt.match(/^(\d+(?:,\d+)?)\s+(?:порци[а-я]*\s+|тарелк[а-я]*\s+|штук[а-я]*\s+)?(?=[а-я])/), num=function(x){ return parseFloat(String(x).replace(',','.')) };
    if(cnt&&unitOf(norm(txt.split(' ')[1]||''))&&!/^(порци|тарелк|штук)/.test(txt.split(' ')[1])) cnt=null;
    /* 1. человек уже записывал это блюдо по частям — так же, без вопроса */
    var meal0=null; try{ meal0=parseText(txt).meal||null }catch(e){}
    cp.n=cnt?num(cnt[1]):1;
    var mo=memOf(key), mem=mo&&mo.parts;
    if(mem&&mem.length&&mem.every(function(x){ return FOODS[x.fid] })){
      /* запомнено для двух котлет, сказано про три — в полтора раза больше */
      var sum=mem.reduce(function(t,x){ return t+(x.g||0) },0), k=FRESH===key?1:trail&&sum?num(trail[1])/sum:cp.n/(mo.n||1);
      cp.ok=true; cp.fresh=FRESH===key; cps.push(cp);
      return mem.map(function(x,i){
        var q=x.q, u=x.u; if(FRESH!==key&&lead&&i===0){ q=num(lead[1]); u='г' } else if(k!==1){ q=Math.max(1,Math.round(x.g*k)); u='г' }
        return part(String(FOODS[x.fid].n).split(/[,(—]/)[0].toLowerCase(),{memPart:{fid:x.fid,q:q,u:u},mealFix:meal0}) });
    }
    /* 2. блюдо из словаря: части и граммы заданы */
    var dc=SP.composite(txt);
    if(dc){ cps.push(cp); cp.name=dc.name; cp.named=true; return dc.parts.map(function(x){ return part(x.w+' '+x.g+' г',{approx:true,mealFix:meal0}) }) }
    /* 3. общее правило */
    var ps=(' '+txt+' ').split(new RegExp(SEPW.source,'g')).map(function(x){ return x.trim() }); if(ps.length<2||ps.length>3||ps.some(function(x){ return !tokensOf(x).length })) return null;
    var head=tokensOf(ps[0]), h0=head[head.length-1]||'';
    /* «суп с лапшой» — вид супа, не делится; «борщ со сметаной», «блины с мёдом» — блюдо и добавка к нему, делится */
    var kh=head.filter(function(w){ return KINDHEAD.test(w) })[0];
    if(kh&&!(TOPHEAD.test(kh)&&ps.slice(1).every(function(x){ return tokensOf(x).some(function(w){ return TOPPING.test(w) }) }))) return null;
    var r0=parseText(txt).lines[0], ids=r0?[r0.fid].concat(r0.alts||[]).filter(function(x,i,a){ return x&&FOODS[x]&&a.indexOf(x)===i }).slice(0,6):[];
    var tailW=W.filter(function(w){ return head.indexOf(w)<0 }); if(ids.some(function(id){ return dishOk(id,head,tailW,!!kh) })) return null;
    var bread=head.some(function(w){ return BREADHEAD.test(w) });
    if(bread) ps[0]=(cnt?String(Math.round(50*num(cnt[1]))):'50')+' г хлеб';                       // бутерброд — 50 г хлеба и то, что на нём
    if(SP.partAs) ps=ps.map(function(x,i){ return i?SP.partAs(x):x });
    var okp=ps.every(function(x,i){ if(bread&&i===0) return true; var tk=tokensOf(x), rp=parseText(x).lines[0], id=rp&&(rp.fid||rp.alts[0]); return !!id&&rp.st!=='none'&&(rp.st==='ok'||related(id,tk)) });
    if(!okp) return null;
    /* вес в конце без веса в начале — это вес всего блюда */
    if(trail&&!lead&&!bread&&num(trail[1])>=50&&!/\d/.test(ps[0])){ cp.total=num(trail[1]); ps[ps.length-1]=ps[ps.length-1].replace(/\s*\d+(?:,\d+)?\s*(?:г|гр|грамм[а-я]*|мл)$/,'').trim(); if(!tokensOf(ps[ps.length-1]).length) return null }
    cps.push(cp);
    var inS=/\s(?:в|под)\s/.test(' '+txt+' ')&&!/\s(?:с|со)\s/.test(' '+ps[0]+' ');
    return ps.map(function(x,i){ return part(x,i===0?{fac:c.fac,vague:c.vague,approx:c.approx||(bread?true:undefined),cookDish:inS||undefined}:null) });
  }

  /* ── запись в дневник: то же, что «Сохранить» в шторке «Подобрано» ── */
  function commit(S,entries){
    if(!entries.length) return null;
    if(writeGuard()) return false;
    var add=[], byDate={};
    entries.forEach(function(en){
      var l=en.line;
      if(String(l.fid).indexOf('bls:')===0&&FOODS[l.fid]&&FOODS[l.fid].tmp) blsUse(l.fid);
      if(en.tap&&en.tap.n){
        /* как нажатие «+» на счётчике: по одной записи на порцию, с меткой счётчика */
        for(var i=0;i<en.tap.n;i++){ var c0=en.tap.c, y={id:'i'+MealData.id(),sec:en.sec,fid:c0.fid,q:c0.q,u:c0.u,g:en.tap.g,t:en.t||null,tap:c0.k}; if(en.tm&&en.t) y.tm=1;
          day(en.date).items.push(y); add.push({date:en.date,item:y,line:l,en:en,hide:i>0}) }
        return;
      }
      var x={id:'i'+MealData.id(),sec:en.sec,fid:l.fid,q:l.q,u:l.u,g:l.g,t:en.t||null,said:l.raw||''}; if(en.tm&&en.t) x.tm=1;
      var nt=noteOf(l); if(nt) x.note=nt; if(l.approx) x.approx=1; if(l.said) x.how=1;   // how — способ приготовления (или «сырое») человек назвал сам
      day(en.date).items.push(x); add.push({date:en.date,item:x,line:l,en:en});
    });
    save();
    try{ if(typeof renderAll==='function') renderAll() }catch(e){}
    var c={id:'c'+(++S.seq),add:add,undone:false,at:Date.now()}; S.commits.push(c);
    /* «перепиши: …» — прежняя запись убирается только теперь, когда новая уже записана (раньше убиралась заранее и могла пропасть) */
    if(S.rewrite){ var old=S.rewrite; S.rewrite=null; if(!old.undone&&old!==c){ undo(S,old); c.replaced=true } }
    return c;
  }
  function undo(S,c){
    if(!c||c.undone) return false;
    if(writeGuard()) return false;
    c.add.forEach(function(a){ var e=day(a.date); e.items=e.items.filter(function(x){ return x.id!==a.item.id }) });
    (c.del||[]).forEach(function(a){ day(a.date).items.push(a.item) });
    c.undone=true; save();
    try{ if(typeof renderAll==='function') renderAll() }catch(e){}
    return true;
  }
  function whenText(en){
    var S0=sec(en.sec), parts=[];
    if(S0) parts.push('«'+S0.t+'»');
    if(en.t) parts.push((en.approx?'около ':'')+en.t);
    if(en.date!==curDate){ var d=new Date(en.date+'T12:00:00'); parts.push(d.getDate()+'.'+pad2(d.getMonth()+1)) }
    return parts.join(' · ');
  }
  function commitHTML(c){
    var groups=[], h='';
    c.add.forEach(function(a){ var k=whenText(a.en), g=groups.filter(function(x){ return x.k===k })[0]; if(!g){ g={k:k,rows:[]}; groups.push(g) } g.rows.push(a) });
    groups.forEach(function(g){
      h+=p('Записал: '+esc(g.k))+'<div class="mlRows">'+g.rows.filter(function(a){ return !a.hide }).map(function(a){
        if(a.en.tap&&a.en.tap.n) return row(a.line,true,'счётчик «'+a.en.tap.c.t+'» +'+a.en.tap.n);
        if(a.line.tapMiss) return row(a.line,true,'в счётчик «'+a.line.tapMiss.t+'» не пошло: там порция '+portTxt(a.line.tapMiss));
        var same=day(a.date).items.filter(function(x){ return x.fid===a.item.fid&&x.sec===a.item.sec }), tot=same.reduce(function(s,x){ return s+(x.g||0) },0);
        return row(a.line,true,[noteOf(a.line),same.length>1?'всего '+fmt(tot)+' г':'',a.line.sameAs?'как в прошлый раз':a.line.habit?'твоя обычная порция':a.line.asBefore?'как раньше':''].filter(Boolean).join(' · ')) }).join('')+'</div>';
    });
    var s=sumOf(c.add.map(function(a){ return a.item }));
    h+='<p class="mbSum">'+Math.round(s.k)+' ккал · Б '+fmt(s.p)+' · Ж '+fmt(s.f)+' · У '+fmt(s.c)+'</p>';
    var sw=[]; c.add.forEach(function(a,i){ if(a.line.picked) a.line.alts.slice(1,3).forEach(function(x,k){ if(FOODS[x]) sw.push(['swap:'+c.id+':'+i+':'+(k+1),FOODS[x].n]) }) });
    if(sw.length) h+='<p class="mlHint">Взял самое близкое. Другое — нажми или скажи: «нет, второй», «нет, '+esc(String(FOODS[c.add.filter(function(a){ return a.line.picked&&FOODS[a.line.alts[1]] })[0].line.alts[1]].n).toLowerCase().split(/[,(—]/)[0].trim())+'».</p>';
    var lm=c.add.some(function(a){ return a.line.usual&&day(a.date).items.indexOf(a.item)>=0 })?[['less:'+c.id,'Меньше'],['more:'+c.id,'Больше']]:[];
    return h+chips(sw.concat(lm,[['undo:'+c.id,'Отменить']]));
  }

  /* ── вопросы: по одному ── */
  function askHTML(S){
    var q=S.pend[0]; S.ask=null; if(!q||q.line.ask==='photo') return '';
    var l=q.line, id='q'+(++S.seq), nm=cap(l.name||''); S.ask={id:id,kind:l.ask,q:q};
    if(l.ask==='what') return p('«'+esc(l.raw)+'» — чего? Назови продукт.');
    if(l.ask==='meal'){ var grp=S.pend.filter(function(x){ return x.grp&&x.grp===q.grp&&x.line.ask==='meal' }).map(function(x){ return foodName(x.line) });
      return p(esc(cap(grp.join(', ')||foodName(l)))+' за '+esc(q.date.slice(8,10)+'.'+q.date.slice(5,7))+' — в какой приём?')+chips(['am','pm','dn','sn'].filter(function(k){ return sec(k) }).map(function(k){ return ['meal:'+id+':'+k,sec(k).t] })) }
    if(l.ask==='name'){ missLog('нет в базе',nm,l.raw); return p('В базе нет «'+esc(nm)+'» — добавил в список недостающего.')+'<p class="mlHint">Если это другое название — скажи его. Или «пропусти».</p>'+chips([['skip:'+id,'Пропустить']]) }
    if(l.ask==='pick') return p(esc(nm)+' — что именно?')+chips(l.alts.slice(0,3).map(function(a,i){ return ['pick:'+id+':'+i,FOODS[a]?FOODS[a].n:a] }).concat([['sheet:'+id,'Другое']]));
    if(l.ask==='range') return p(esc(foodName(l))+' — сколько граммов?')+chips([['num:'+id+':'+l.range[1],l.range[1]+' г'],['num:'+id+':'+l.range[0],l.range[0]+' г']]);
    if(l.ask==='dup') return p(esc(nm||foodName(l))+' — один или два?')+chips([['cnt:'+id+':1','Один'],['cnt:'+id+':2','Два']]);
    if(l.ask==='again') return p('Такое же сообщение я только что записал. Это ещё одна порция?')+chips([['again:'+id+':1','Да, ещё одна'],['again:'+id+':0','Нет, повтор']]);
    var f=FOODS[l.fid], u=f?defUnit(f):'г', one={q:1,u:u,fid:l.fid}; one.g=gramsFor(l.fid,1,u);
    var opts=u==='г'?[['num:'+id+':100','100 г']]:[['unit:'+id,'1 '+uLab(l.fid,1,u)+' · ≈ '+fmt(one.g)+' г']];
    if(l.ask==='waste') return p(esc(foodName(l))+': несъедобное '+fmt(l.waste)+' г больше или равно целому '+fmt(l.whole)+' г. Проверь числа — сколько было целиком?');
    if(l.ask==='inc') return p(esc(foodName(l))+': часть '+fmt(l.inc.g)+' г больше всего блюда '+fmt(l.g)+' г. Сколько весило блюдо целиком?');
    if(l.count&&!l.countU) missLog('нет веса штуки',foodName(l),l.raw);
    if(l.count&&l.countU) return p(esc(foodName(l))+' — '+fmt(l.count)+' '+esc(uLab(l.fid,l.count,l.countU))+'. Сколько граммов в одной мере «'+esc(l.countU)+'»?')+'<p class="mlHint">Запомню у этого продукта, и в следующий раз запишу сразу. Можно сказать и общий вес: «всего 500 г».</p>';
    if(l.count) return p(esc(foodName(l))+' — '+l.count+' шт. Сколько весит одна штука?')+'<p class="mlHint">Запомню, и в следующий раз запишу сразу. Можно сказать и общий вес: «всего 500 г».</p>';
    return p('Сколько: '+esc(foodName(l))+'?')+chips(opts);
  }
  /* «пять перепелок»: если у похожего продукта есть вес штуки — пишем штуками сразу, остальное кнопками */
  /* «штука» — это штука: тарелка, стакан, ложка, упаковка и английские «3 pieces», «1 cup», «oz» штукой не считаются
     (иначе «10 пельменей» становились десятью тарелками супа). Решение Астамура 17.11.2026 23:11 */
  var NOTPIECE=/^(г|мл|кг|л|порция|большая порция|ломтик|кусок|тарелка|стакан|стаканчик|чашка|кружка|бокал|пиала|рюмка|половник|ст\. л\.|ч\. л\.|дес\. л\.|банка|бутылка|пачка|упаковка|горсть|щепотка|пучок|веточка|долька|шот)$|^\d|cup|oz|tbsp|tsp|slice|package|packet|serving|container|bottle|can\b|fl\b|\bg\b|\bml\b/i;
  function pieceUnit(fid){ var por=(FOODS[fid]||{}).por||{}; return Object.keys(por).filter(function(k){ return por[k]>0&&!NOTPIECE.test(k) })[0]||null }
  /* названное слово стоит в самом названии продукта, а не в пояснении в скобках и не после «с»: «Бульон с маульташен (пельмени…)» — не пельмени */
  function coreHas(id,nw){
    var f=FOODS[id]; if(!f) return false;
    var ws=norm(String(f.n).split(/\(|\sс\s|\sсо\s/)[0]).split(/[^a-zа-я0-9%]+/).filter(Boolean);
    return nw.some(function(q){ return ws.some(function(w){ return sim(q,w)>=1.8 }) });
  }
  function byPiece(l){
    /* Meal 33.9: вес штуки из словаря («два онигири», «шесть суши») */
    if(SP&&l.fid&&FOODS[l.fid]&&!pieceUnit(l.fid)&&SP.group(FOODS[l.fid],'шт')){ l.st='ok'; l.u='шт'; l.q=l.count; l.g=gramsFor(l.fid,l.q,'шт'); l.explicit=true; l.ask=null; return true }
    var ids=[l.fid].concat(l.alts||[]);
    var nm0=String(l.spoken||l.name||'').trim(), nw=nm0.split(' ').filter(Boolean);
    if(nm0) [nm0, nm0+' целиком'].forEach(function(q){ var r=parseText(q).lines[0]; if(r) ids=ids.concat([r.fid].concat(r.alts||[])) });
    ids=ids.filter(function(x,i,a){ return x&&FOODS[x]&&a.indexOf(x)===i });
    /* Meal 33.7: у справочников (USDA, MEXT, KFCT) теперь русские названия — штука из основной базы и своих продуктов впереди */
    var hits=ids.filter(function(x){ return pieceUnit(x)&&(!nw.length||coreHas(x,nw)) });
    var hit=hits.filter(function(x){ return !/USDA|MEXT|KFCT/.test(String(FOODS[x].src||'')) })[0];
    /* продукт ещё не выбран из похожих («три печенья» — овсяное или бисквитное): беру первое и вес штуки из словаря, остальные — кнопками замены;
       штука из большого справочника (USDA, MEXT, KFCT) — только если словарь веса не знает */
    if(!hit){ var a0=SP&&!l.fid&&(l.alts||[])[0];
      if(a0&&FOODS[a0]&&SP.group(FOODS[a0],'шт')){ l.fid=a0; l.st='ok'; l.u='шт'; l.q=l.count; l.g=gramsFor(a0,l.q,'шт'); l.explicit=true; l.picked=l.alts.length>1; l.ask=null; return true }
      hit=hits[0]; if(!hit) return false }
    var others=ids.filter(function(x){ return x!==hit });
    l.fid=hit; l.st='ok'; l.u=pieceUnit(hit); l.q=l.count; l.g=gramsFor(hit,l.q,l.u); l.explicit=true; l.alts=[hit].concat(others); l.picked=others.length>0; l.ask=null;
    return true;
  }
  var DESCR=/^(жарен|варен|туш|запеч|печен|копчен|солен|сыр(ой|ая|ое|ые)|свеж|сушен|вялен|гриль|целик|цел(ый|ая|ое|ые|ых)|с\s|без\s|кож|кост|на\s|в\s|масл|духовк|сковород)/;
  function hasMeal(txt){ var SW=Object.keys(secWords()); return String(txt).split(/\s+/).some(function(w){ var n=norm(w); return n.length>2&&SW.some(function(k){ return isSecWord(n,k) }) }) }
  /* раздел по времени: приём пищи начинается со своей первой записи за день (или с обычного часа, если записей нет);
     время попадает в тот приём, который начался последним до него. Раньше всех — в самый первый приём */
  var MEALWIN={am:[4,12],pm:[10,17],dn:[16,24]};
  function byMeal(h,k){ var w=MEALWIN[k]; if(!w) return null; var a=h%12, b=a+12, inA=a>=w[0]&&a<w[1], inB=b>=w[0]&&b<w[1]; return inA&&!inB?a:inB&&!inA?b:inA?a:null }
  /* время записи подходит приёму пищи? «15:00» в завтраке — нет: такое время при переносе снимается */
  function fits(t,k){ var w=MEALWIN[k]; if(!t||!w) return true; var h=+t.slice(0,2); return h>=w[0]&&h<w[1] }
  var DEFSTART={am:0,pm:660,dn:960,sn:1260};
  function hmOf(m){ m=Math.max(0,Math.min(1439,Math.round(m))); return pad2(Math.floor(m/60))+':'+pad2(m%60) }
  function mealTimes(date,k,skip){ return ((DB.days[date]&&DB.days[date].items)||[]).filter(function(x){ return x.sec===k&&x.t&&(!skip||skip.indexOf(x)<0) }).map(function(x){ return mins(x.t) }).sort(function(a,b){ return a-b }) }
  /* какое время поставить записи в приёме k, когда человек времени не назвал. null — не трогать */
  function mealTime(date,k,skip){
    if(!MEALWIN[k]) return null;                                    // перекус бывает когда угодно
    var own=mealTimes(date,k,skip); if(own.length) return hmOf(own[own.length-1]);
    var order=['am','pm','dn'], i=order.indexOf(k), t=null;
    /* привычное: середина по первым записям этого приёма за последние 7 дней, где он был (нужно хотя бы 3) */
    var hist=[], d=new Date(date+'T12:00:00');
    for(var n=0;n<21&&hist.length<7;n++){ d.setDate(d.getDate()-1); var ts=mealTimes(isoOf(d),k); if(ts.length) hist.push(ts[0]) }
    if(hist.length>=3){ hist.sort(function(a,b){ return a-b }); t=hist[Math.floor(hist.length/2)] }
    var prev=i>0?mealTimes(date,order[i-1],skip):[], next=i<2?mealTimes(date,order[i+1],skip):[];
    if(t==null){
      if(next.length) t=next[0]-300; else if(prev.length) t=prev[prev.length-1]+300; else t={am:540,pm:840,dn:1140}[k];
    }
    if(k==='am') t=Math.max(t,420); if(k==='dn') t=Math.min(t,1260);
    if(next.length&&t>=next[0]) t=next[0]-30;                        // не позже начала следующего приёма
    if(prev.length&&t<=prev[prev.length-1]) t=prev[prev.length-1]+30;
    return hmOf(t);
  }
  /* при переносе: своё время оставляем, если оно приёму подходит; ранний ужин без других записей ужина — тоже */
  function movedTime(date,k,t,skip){
    if(!MEALWIN[k]||fits(t,k)) return {t:t,set:false};
    if(k==='dn'&&t&&!mealTimes(date,'dn',skip).length&&mins(t)<960) return {t:t,set:false};
    var nt=mealTime(date,k,skip); return {t:nt,set:!!nt};
  }
  function timeNote(t){ return '<p class="mlHint">Время поставил сам: '+esc(t)+'. Не так — скажи: «нет, в 9 утра».</p>' }
  function mins(t){ return +t.slice(0,2)*60+(+t.slice(3,5)) }
  /* Meal 33.7 · приём по правилам Астамура (17.11.2026). Тот же текст обычным языком — экран «Правила бота»
     в «Для разработчика» (index.html, data-screen="botrules"): поменял правило — поправь и его.
     1) запись ближе 1,5 ч (до или после) — тот же приём; 2) немного еды (до 150 ккал на сообщение или только напитки)
     после приёма — перекус; 3) иначе следующий по порядку приём, если время в его окне; 4) иначе прошлый приём, если
     время в его окне, иначе перекус. Ночью (до 05:00) — перекус. Окна, где приём может начаться: */
  var NEAR=90, SNACK=150, NEWWIN={am:[300,780],pm:[660,1080],dn:[960,1440]}, ORDK=['am','pm','dn'];
  function smallOf(list){
    var ok=list.length>0, k=0, drinks=true;
    list.forEach(function(x){ var fid=x&&(x.fid||(x.alts&&x.alts[0])), g=x&&(x.g>0?x.g:(x.explicit&&fid&&FOODS[fid]?gramsFor(fid,x.q,x.u):0));   // строка ещё без выбранного продукта — по первому похожему
      if(!fid||!FOODS[fid]||!(g>0)){ ok=false; return } k+=nutOf({fid:fid,g:g}).k||0; if(!isDrink(fid)) drinks=false });
    return ok&&(drinks||k<=SNACK);
  }
  function secFor(date,t,small){
    var m=mins(t);
    if(m<300&&sec('sn')) return 'sn';                                 // ночью, с полуночи до пяти, — перекус, а не завтрак
    var ks=sectionsForDate(date).map(function(S0){ return S0.k });
    if(['am','pm','dn','sn'].some(function(k){ return ks.indexOf(k)<0 })) return secForOld(date,t);
    var items=((DB.days[date]&&DB.days[date].items)||[]).filter(function(x){ return x.t&&ks.indexOf(x.sec)>=0 });
    var near=null; items.forEach(function(x){ var d=Math.abs(mins(x.t)-m); if(d<=NEAR&&(!near||d<near.d)) near={k:x.sec,d:d} });
    if(near) return near.k;
    var prev=-1, next=3;
    items.forEach(function(x){ var i=ORDK.indexOf(x.sec), xm=mins(x.t); if(i<0) return; if(xm<m&&i>prev) prev=i; if(xm>m&&i<next) next=i });
    function inWin(i){ var w=NEWWIN[ORDK[i]]; return m>=w[0]&&m<w[1] }
    if(small&&prev>=0) return 'sn';
    for(var i=prev+1;i<=Math.min(next,2);i++) if(inWin(i)) return ORDK[i];
    if(prev>=0&&inWin(prev)) return ORDK[prev];
    return 'sn';
  }
  /* до 33.7: приём начинается со своей первой записи или с обычного часа. Остаётся для дней со своими разделами */
  function secForOld(date,t){
    var m=mins(t), items=(DB.days[date]&&DB.days[date].items)||[], best=null, first=null;
    if(m<300&&sec('sn')) return 'sn';                                 // ночью, с полуночи до пяти, — перекус, а не завтрак
    sectionsForDate(date).forEach(function(S0){
      var ts=items.filter(function(x){ return x.sec===S0.k&&x.t }).map(function(x){ return mins(x.t) });
      var st=ts.length?Math.min.apply(null,ts):DEFSTART[S0.k]; if(st==null) return;
      if(!first||st<first.st) first={k:S0.k,st:st};
      if(st<=m&&(!best||st>=best.st)) best={k:S0.k,st:st};
    });
    return (best||first||{k:secAt(+t.slice(0,2))}).k;
  }
  /* счётчик: сказанное совпало со счётчиком (тот же продукт или его название) и порций целое число — отмечаем в счётчике */
  function tapFor(l){
    var taps=(DB.taps||[]).filter(function(c){ return c&&FOODS[c.fid]&&!(typeof tapOff==='function'&&tapOff(c)) }); if(!taps.length) return null;
    var sp=tokensOf(String(l.spoken||l.name||''));
    var c=taps.filter(function(c){ if(c.fid===l.fid) return true; var tw=tokensOf(norm(c.t)); return sp.length&&tw.length&&tw.every(function(w){ return sp.some(function(q){ return sim(q,w)>=1.8 }) })&&sp.every(function(q){ return tw.some(function(w){ return sim(q,w)>=1.8 }) }) })[0];
    if(!c) return null;
    var cg=gramsFor(c.fid,c.q,c.u); if(!(cg>0)) return null;
    var n=null;
    if(l.count) n=l.count; else if(!l.explicit) n=1;
    else if(l.u===c.u){ var r=l.q/c.q; if(Math.abs(r-Math.round(r))<0.01) n=Math.round(r) }
    if(n==null){ var g=gramsFor(c.fid,l.q,l.u), r2=g/cg; if(r2>=0.97&&Math.abs(r2-Math.round(r2))<=0.03*Math.round(r2)) n=Math.round(r2) }
    return {c:c,n:(n>=1&&n<=30)?n:0,g:cg};
  }
  function setGrams(l,g){ l.q=g; l.u='г'; l.g=gramsFor(l.fid,g,'г'); l.explicit=true }
  function resolved(S){ var q=S.pend.shift(); S.ask=null; q.line.ask=null; return q }
  function finish(S,q,pre){
    if(q.needMeal&&!q.secSet){ q.line.ask='meal'; S.pend.unshift(q); return (pre||'')+askHTML(S) }
    var c=commit(S,[q]);
    if(c===false){ S.pend.unshift(q); return p('Чтобы записывать, войди в аккаунт.') }
    return (pre||'')+commitHTML(c)+askHTML(S);
  }
  function syncLines(chat){ var S=state(chat); chat.lines=S.pend.map(function(q){ return q.line }); chat.src=chat.lines.map(function(){ return 'text' }) }

  /* ответ текстом на заданный вопрос; null — это не ответ, а новое сообщение */
  function answer(S,text){
    var a=S.ask, q=a&&a.q; if(!a||S.pend[0]!==q) return null;
    var l=q.line, t=nrm(text).trim();
    if(/^(пропусти|пропустить|не надо|не важно|неважно|забудь)/.test(t)&&(a.kind==='name'||a.kind==='what'||a.kind==='qty'||a.kind==='pick')) return tapDo(S,'skip',a.id);
    if(a.kind==='meal'){ var mm=mealIn(t.replace(/^(да|ну|в|на|во)\s+/,'')).mk; return mm?tapDo(S,'meal',a.id,mm):null }
    if(a.kind==='again'){ if(/^(да|ещ|еще|ага|угу)/.test(t)) return tapDo(S,'again',a.id,'1'); if(/^(нет|не|повтор)/.test(t)) return tapDo(S,'again',a.id,'0'); return null }
    if(a.kind==='pick'){ var tt0=t.replace(/^(да|ну|давай|пусть|будет)\s+/,'').replace(/[,.!]+$/,''); if(ORD[tt0]!=null&&l.alts[ORD[tt0]]) return tapDo(S,'pick',a.id,String(ORD[tt0]));
      var ws0=tokensOf(tt0), hitA=ws0.length?l.alts.slice(0,3).map(function(x,i){ return i }).filter(function(i){ return ws0.every(function(q){ return /^\d/.test(q)?words(l.alts[i]).indexOf(q)>=0:words(l.alts[i]).some(function(wd){ return sim(q,wd)>=1.8||adjStem(q)&&adjStem(q)===adjStem(wd) }) }) }):[];
      if(hitA.length===1&&!/\d\s*(г|гр|мл)/.test(tt0)) return tapDo(S,'pick',a.id,String(hitA[0]));
      /* «Торт — какой?» → «Захер»: ищем «торт захер» целиком */
      if(ws0.length&&!/\d/.test(tt0)){
        var sp0=String(l.spoken||l.name||'').trim(), cb=understand(fixes(' '+sp0+' '+tt0+' ')).lines[0], cf=cb&&(cb.fid||cb.alts[0]);
        if(cf&&covers(cf,ws0)&&related(cf,sp0.split(' ').filter(Boolean))){
          l.fid=cf; l.alts=[cf].concat((cb.alts||[]).filter(function(x){ return x!==cf })); l.st='ok'; l.noAuto=false; l.g=gramsFor(cf,l.q,l.u);
          if(needQty(l)){ l.ask='qty'; return askHTML(S) } return finish(S,resolved(S));
        }
      } }
    if(a.kind==='dup'){ var m=t.match(/^(да\s+)?(один|одна|одну|одно|1|два|две|2)(\s|$)/); if(!m) return null; return tapDo(S,'cnt',a.id,/^(два|две|2)$/.test(m[2])?'2':'1') }
    var yes=/^\s*(да|ага|угу|это|по-моему|по моему|кажется|наверное|вроде|думаю|точно)[\s,]/.test(nrm(text));
    /* «всего 400 г» на вопрос о весе одной штуки — общий вес */
    if(a.kind==='qty'&&l.count&&/(всего|вместе|все|всё|общ)/.test(nrm(text))){
      var tm=nrm(text).replace(',','.').match(/(\d+(?:\.\d+)?)\s*(кг|кило)?/);
      if(tm){ setGrams(l,(+tm[1])*(tm[2]?1000:1)); return finish(S,resolved(S)) }
    }
    /* «жареные, были целиком» на вопрос о весе — это уточнение продукта, а не новая еда */
    if(a.kind==='qty'||a.kind==='pick'||a.kind==='name'){
      var dw=nrm(text).replace(/[,.!]+/g,' ').replace(/(^|\s)(были|был|была|было|это|они|он|она|да|нет|ну|все|всё|там|точнее)(?=\s|$)/g,' ').trim().split(/\s+/).filter(Boolean);
      if(dw.length&&!/\d/.test(dw.join(' '))&&dw.every(function(w){ return DESCR.test(w)||PREP.test(w) })){
        var base=String(l.spoken||l.name||'').trim(), r2=understand(fixes(' '+base+' '+dw.join(' ')+' ')).lines[0];
        if(r2&&(r2.fid||r2.alts.length)){
          var cnt=l.count||null; l.fid=r2.fid||r2.alts[0]; l.alts=r2.alts.length?r2.alts:[l.fid]; l.st='ok'; l.name=r2.name; l.ask=null;
          if(cnt){ l.count=cnt; if(byPiece(l)) return finish(S,resolved(S)); l.ask='qty'; return askHTML(S) }
          if(l.explicit){ l.g=gramsFor(l.fid,l.q,l.u); return finish(S,resolved(S)) }
          if(isDrink(l.fid)) return finish(S,resolved(S));
          l.ask='qty'; return askHTML(S);
        }
      }
    }
    var u=understand(fixes(nrm(text).replace(/(^|\s)(да|ага|угу|по-моему|по моему|кажется|наверное|вроде|думаю|точно)(?=[\s,.]|$)/g,' ').replace(/^[\s,.]+/,' ').replace(FILL,' ')));
    /* «пять перепелок» → «120 г»: вес одной штуки — запоминаем как свою меру продукта (как «Своя порция» в карточке) */
    if(!u.lines.length&&u.orphan&&l.fid&&l.count&&a.kind==='qty'){
      var gm=String(u.orphan).replace(',','.').match(/(\d+(?:\.\d+)?)/), gv=gm?+gm[1]:0;
      if(/(\s|^)кг|кило/.test(u.orphan)) gv*=1000;
      if(gv>0){
        if(/(всего|вместе|все|всё|общ)/.test(nrm(text))){ setGrams(l,gv); return finish(S,resolved(S)) }
        if(writeGuard()) return p('Чтобы записывать, войди в аккаунт.');
        var f1=FOODS[l.fid]; DB.units=DB.units||{}; DB.units[f1.id]=DB.units[f1.id]||{}; var cu=l.countU||'шт'; DB.units[f1.id][cu]=Math.round(gv*10)/10;
        if(String(f1.id).indexOf('bls:')===0) blsUse(f1.id);
        try{ rebuildLib() }catch(e){}
        l.q=l.count; l.u=cu; l.g=gramsFor(l.fid,l.q,cu); l.explicit=true; l.count=null;
        return finish(S,resolved(S),p('Запомнил: 1 '+esc(cu)+' «'+esc(f1.n)+'» = '+fmt(gv)+' г. Поменять или убрать — в мерах продукта, когда уточняешь запись в списке.'));
      }
    }
    if((a.kind==='waste'||a.kind==='inc')&&!u.lines.length&&u.orphan){
      var nv=+(String(u.orphan).replace(',','.').match(/\d+(?:\.\d+)?/)||[0])[0];
      if(a.kind==='waste'&&nv>l.waste){ l.whole=nv; setGrams(l,Math.round((nv-l.waste)*10)/10); return finish(S,resolved(S)) }
      if(a.kind==='inc'&&nv>l.inc.g){ setGrams(l,nv); return finish(S,resolved(S)) }
      return p('Всё ещё не сходится. Скажи вес целиком, он должен быть больше '+fmt(a.kind==='waste'?l.waste:l.inc.g)+' г.');
    }
    /* одно число с мерой или без: «200 г», «две», «стакан» */
    if(!u.lines.length&&u.orphan&&l.fid){
      var r=parseText((l.name||'продукт')+' '+u.orphan).lines[0];
      if(r&&r.explicit){ l.q=r.q; l.u=r.u; l.g=gramsFor(l.fid,l.q,l.u); l.explicit=true; if(a.kind==='qty'||a.kind==='range'||a.kind==='dup') return finish(S,resolved(S)) }
      return null;
    }
    if(u.lines.length!==1) return null;
    var n=u.lines[0];
    if(a.kind==='name'||a.kind==='pick'||a.kind==='what'){
      /* «да, фундук» — названо, что это. Фраза со своим количеством («400 мл бульона») — новая диктовка, а не ответ */
      if(n.explicit&&!(a.kind==='pick'&&n.fid&&l.alts.indexOf(n.fid)>=0)) return null;
      if(a.kind==='pick'&&!(n.fid&&l.alts.indexOf(n.fid)>=0)){
        var lw=String(l.name||'').split(' ').filter(Boolean), nid=n.fid||n.alts[0];
        /* другое название годится как ответ, только если предложенное не покрывало сказанного («орех бурундука» → «фундук»);
           на «Творог — какой?» слово «груша» или «американо» — уже новая еда */
        var known=l.alts.some(function(x){ return covers(x,lw) });
        if(!related(nid,lw)&&(known||u.dupSeen||!yes)) return null;
      }
      if(n.st==='pick'&&n.alts.length){ l.alts=n.alts; l.name=n.name; l.st='pick'; l.ask='pick'; if(n.explicit){ l.q=n.q; l.u=n.u; l.explicit=true } return askHTML(S) }
      if(n.st!=='ok'||!n.fid) return null;
      l.fid=n.fid; l.alts=n.alts; l.st='ok'; l.name=n.name; if(n.explicit){ l.q=n.q; l.u=n.u } else if(!l.explicit&&a.kind!=='what'){ l.q=n.q; l.u=n.u }
      if(a.kind==='what'&&!n.explicit){ var w=parseText(n.name+' '+l.raw).lines[0]; if(w){ l.q=w.q; l.u=w.u; l.explicit=w.explicit } }
      l.g=gramsFor(l.fid,l.q,l.u);
      if(needQty(l)){ l.ask='qty'; return askHTML(S) }
      return finish(S,resolved(S));
    }
    /* «нет, мясо перепёлки» на вопрос о весе: тот же продукт другим вариантом — меняем продукт, штуки сохраняем */
    if((a.kind==='qty'||a.kind==='range')&&!n.explicit&&(n.fid||n.alts.length)&&related(n.fid||n.alts[0],String(l.spoken||l.name||'').split(' ').filter(Boolean))){
      l.fid=n.fid||n.alts[0]; l.alts=n.alts.length?n.alts:[l.fid]; l.st='ok'; l.name=n.name;
      if(l.count&&byPiece(l)) return finish(S,resolved(S));
      if(isDrink(l.fid)){ l.q=n.q; l.u=n.u; l.g=gramsFor(l.fid,l.q,l.u); return finish(S,resolved(S)) }
      l.ask='qty'; return askHTML(S);
    }
    /* «и груша 200 г» после «…и груша»: тот же продукт, теперь с весом */
    if((a.kind==='qty'||a.kind==='range'||a.kind==='dup')&&n.explicit&&n.fid&&(n.fid===l.fid||n.name===l.name)){
      l.q=n.q; l.u=n.u; l.g=gramsFor(l.fid,l.q,l.u); l.explicit=true; return finish(S,resolved(S));
    }
    return null;
  }
  function tapDo(S,kind,id,arg){
    var a=S.ask; if(!a||a.id!==id) return null;
    var q=a.q, l=q.line;
    if(kind==='skip'){ resolved(S); return p('Пропустил.')+askHTML(S) }
    if(kind==='meal'){ if(!sec(arg)) return null;
      var mine=S.pend.filter(function(x){ return x===q||(x.grp&&x.grp===q.grp&&x.line.ask==='meal') }), gt=mealTime(q.date,arg,null);
      S.pend=S.pend.filter(function(x){ return mine.indexOf(x)<0 }); S.ask=null;
      mine.forEach(function(x){ x.line.ask=null; x.sec=arg; x.secSet=true; x.t=gt; x.tm=false });
      var cm=commit(S,mine); if(cm===false){ mine.forEach(function(x){ x.line.ask='meal'; x.secSet=false }); S.pend=mine.concat(S.pend); return p('Чтобы записывать, войди в аккаунт.') }
      return commitHTML(cm)+(gt?timeNote(gt):'')+askHTML(S) }
    if(kind==='pick'){ var fid=l.alts[+arg]; if(!fid) return null; l.fid=fid; l.st='ok'; l.g=gramsFor(fid,l.q,l.u);
      if(needQty(l)){ l.ask='qty'; return askHTML(S) } return finish(S,resolved(S)) }
    if(kind==='num'){ setGrams(l,+arg); return finish(S,resolved(S)) }
    if(kind==='unit'){ var f=FOODS[l.fid]; l.q=1; l.u=defUnit(f); l.g=gramsFor(l.fid,1,l.u); l.explicit=true; return finish(S,resolved(S)) }
    if(kind==='cnt'){ var f2=FOODS[l.fid], u2=l.u||defUnit(f2); l.q=+arg; l.u=u2; l.g=gramsFor(l.fid,l.q,u2); l.explicit=true; return finish(S,resolved(S)) }
    if(kind==='again'){ var mine=S.pend.filter(function(x){ return x.line.ask==='again' }); S.pend=S.pend.filter(function(x){ return x.line.ask!=='again' }); S.ask=null;
      if(arg==='0') return p('Хорошо, повтор не записываю.')+askHTML(S);
      mine.forEach(function(x){ x.line.ask=null }); var c=commit(S,mine); return c===false?p('Чтобы записывать, войди в аккаунт.'):commitHTML(c)+askHTML(S) }
    return null;
  }

  /* ── вопросы о записанном ── */
  function productInfo(text){
    var u; FILLOK=false; try{ u=core(fixes(' '+text+' ')) }catch(e){ return null }
    var l=u&&u.lines.length===1?u.lines[0]:null; if(!l) return null;
    var id=l.fid||(l.ask==='pick'&&!l.noAuto?l.alts[0]:null); if(!id||!FOODS[id]) return null;
    var g=l.explicit&&l.fid&&l.g>0?l.g:100, s=sumOf([{fid:id,g:g,q:g,u:'г'}]); if(!(s.k>0)&&!(s.p>0)&&!(s.c>0)) return null;
    return p(esc(FOODS[id].n)+', '+fmt(g)+' г: <b>'+Math.round(s.k)+' ккал</b>')+'<p class="mbSum">Б '+fmt(s.p)+' г · Ж '+fmt(s.f)+' г · У '+fmt(s.c)+' г</p><p class="mlHint">Это справка из базы. В дневник ничего не записал.</p>';
  }
  function todayTotals(){
    var items=day(curDate).items, s=sumOf(items), when=curDate===todayISO()?'сегодня':'за этот день';
    if(!items.length) return p('За '+(curDate===todayISO()?'сегодня':'этот день')+' пока ничего не записано.');
    return p('Записано '+when+': <b>'+Math.round(s.k)+' ккал</b>')+'<p class="mbSum">Б '+fmt(s.p)+' г · Ж '+fmt(s.f)+' г · У '+fmt(s.c)+' г · записей: '+items.length+'</p>'+
      '<p class="mlHint">Считаю только сохранённые записи; черновик и несказанное сюда не входят.</p>';
  }
  function todayList(){
    var items=day(curDate).items; if(!items.length) return p('Пока ничего не записано.');
    var h=''; sectionsForDate(curDate).forEach(function(S0){
      var it=items.filter(function(x){ return x.sec===S0.k }); if(!it.length) return;
      h+=p('«'+esc(S0.t)+'» · '+Math.round(sumOf(it).k)+' ккал')+'<div class="mlRows">'+it.map(function(x){ return row({fid:x.fid,q:x.q,u:x.u,g:x.g,name:''},true,x.t||'') }).join('')+'</div>';
    });
    return h+'<p class="mbSum">Всего '+Math.round(sumOf(items).k)+' ккал</p>';
  }
  var CD=null; function cd(){ return CD||curDate }
  function findItem(rest){
    var u=understand(fixes(' '+rest+' ')), items=day(cd()).items, ws=tokensOf(rest);
    var fids=u.lines.map(function(l){ return l.fid }).filter(Boolean);
    for(var i=items.length-1;i>=0;i--){
      var x=items[i], f=FOODS[x.fid], nw=f?norm(f.n).split(/[^a-zа-я0-9]+/).filter(Boolean):[];
      if(fids.indexOf(x.fid)>=0||(ws.length&&ws.every(function(w){ return nw.some(function(n){ return sim(w,n)>=1.8 }) }))) return x;
    }
    return null;
  }
  /* «замени американо на флэт уайт», «вместо капучино флэт уайт», «не капучино, а латте» */
  function replaceCmd(S,what,to){
    var x=findItem(what); if(!x) return p('Не нашёл за этот день записи «'+esc(what)+'». Ничего не менял.');
    var u=understand(fixes(' '+to+' ')), n=u.lines[0];
    /* «исправь грушу на 180 г», «груша не 200, а 180» — только количество */
    if(!n&&u.orphan){
      var f0=FOODS[x.fid], w=parseText((tokensOf(norm(f0?f0.n:what))[0]||'продукт')+' '+u.orphan).lines[0];
      if(w&&w.explicit){ if(writeGuard()) return p('Чтобы менять записи, войди в аккаунт.');
        x.q=w.q; x.u=w.u; x.g=gramsFor(x.fid,x.q,x.u); delete x.tap; touch();
        return p('Поправил:')+'<div class="mlRows">'+row({fid:x.fid,q:x.q,u:x.u,g:x.g,name:''},true,x.t||'')+'</div>' }
    }
    if(!n||!(n.fid||n.alts.length)){ missLog('нет в базе',to,to); return p('В базе нет «'+esc(to)+'» — запись «'+esc(what)+'» оставил, а это добавил в список недостающего.') }
    if(n.explicit){ x.q=n.q; x.u=n.u }
    var ad={item:x,line:{fid:x.fid,q:x.q,u:x.u,g:x.g,alts:n.alts,name:n.name}};
    return swapTo(S,ad,n.fid||n.alts[0]);
  }
  function removeCmd(S,rest){
    var u=understand(fixes(rest)), items=day(cd()).items, hitI=null;
    var fids=u.lines.map(function(l){ return l.fid }).filter(Boolean), words=tokensOf(rest);
    for(var i=items.length-1;i>=0&&!hitI;i--){
      var x=items[i], f=MealProducts.forItem(x,FOODS,DB)||FOODS[x.fid], nw=f?norm(f.n).split(/[^a-zа-я0-9]+/).filter(Boolean):[];
      if(fids.indexOf(x.fid)>=0||(words.length&&words.every(function(w){ return nw.some(function(n){ return sim(w,n)>=1.8 }) }))) hitI=x;
    }
    if(!hitI) return p('Не нашёл такой записи за этот день. Ничего не удалил.');
    if(writeGuard()) return p('Чтобы менять записи, войди в аккаунт.');
    var e=day(cd()); e.items=e.items.filter(function(x){ return x!==hitI }); save();
    try{ if(typeof renderAll==='function') renderAll() }catch(err){}
    var c={id:'c'+(++S.seq),add:[],del:[{date:cd(),item:hitI}],undone:false}; S.commits.push(c);
    return p('Удалил:')+'<div class="mlRows">'+row({fid:hitI.fid,q:hitI.q,u:hitI.u,g:hitI.g,name:''},true,hitI.t||'')+'</div>'+chips([['undo:'+c.id,'Вернуть']]);
  }

  /* ── главный вход: сообщение человека → ответ бота (HTML) ── */
  function reply(chat,m){
    boot();
    var S=state(chat), h;
    if(SP) SP.on(true);
    try{ h=handle(chat,S,m) } finally { if(SP) SP.on(false) }
    syncLines(chat);
    return h;
  }
  function handle(chat,S,m){
    var raw=m.kind==='photo'?m.det:m.text;
    /* Meal 33.9: живая речь → понятный разбору вид (числа словами, диапазон, «полбанана», поправки, пустышки, другие названия) */
    var asked=/\?\s*$/.test(String(raw).trim());
    if(SP&&m.kind!=='photo'){ var rcp=SP.recipe(raw); if(rcp&&!state(chat).ask) return p(esc(rcp)) }
    /* ответ на предложение записать блюдо по частям: «да» — как предложено; свои граммы — как сказал человек; так же блюдо запишется и в следующий раз */
    if(!NEST&&S.rewrite&&!S.pend.length&&!S.offer) S.rewrite=null;
    if(!NEST) LEFT=null;   // замена не состоялась, а человек уже говорит о другом
    var prepped=false; FRESH=null; OFP=null; EATEN=!!(SP&&SP.eaten&&m.kind!=='photo'&&(m.eaten||SP.eaten(String(raw)))); WEIGHED=!!(SP&&SP.weighed&&m.kind!=='photo'&&SP.weighed(String(raw)));
    if(S.offer&&m.kind!=='photo'){ var ofr=S.offer; S.offer=null;
      var b0=nrm(raw).trim().replace(/[?!.,…\s]+$/,'');
      if(/^(нет|неа|не надо|не нужно|не записывай|отмена|отмени|пропусти)$/.test(b0)){ S.rewrite=null; return p('Хорошо, не записываю.') }
      if(/^(да|ага|угу|давай|ок|окей|хорошо|годится|верно|записывай|запиши|пиши|так)( так| запиши| записывай| давай)?$/.test(b0)){ memSet(ofr.key,ofr.parts,ofr.n); FRESH=ofr.key; raw=ofr.raw; prepped=true; EATEN=!!ofr.eaten; WEIGHED=!!ofr.weighed; LEFT=ofr.left||null }
      else { var cust=String(raw).replace(/^\s*(нет|не|неа)[,.!\s]+/i,'').replace(/^\s*(давай|лучше|пусть|запиши)\s+/i,''); if(SP) cust=SP.prepare(cust);
        OFP=ofr.parts; var cu=core(cust), good=cu.lines.filter(function(l){ return l.fid&&l.explicit&&!l.ask&&l.g>0 });
        if(good.length&&good.length===cu.lines.length) memSet(ofr.key,good.map(function(l){ return {fid:l.fid,q:l.q,u:l.u,g:l.g} }),ofr.n);
        raw=ofr.raw.indexOf(ofr.src)>=0?ofr.raw.replace(ofr.src,cust.trim()):cust; prepped=true; EATEN=!!ofr.eaten; WEIGHED=!!ofr.weighed; LEFT=ofr.left||null }
    }
    if(m.kind!=='photo'&&!prepped){
      /* «…это не считай» — сказанное в этом предложении в дневник не идёт */
      if(NOCOUNT.test(String(raw))&&!/^\s*(не\s+считай|не\s+записывай)/i.test(String(raw))){
        var keepS=String(raw).split(/(?<=[.!?;])\s+/).filter(function(x){ return !NOCOUNT.test(x) });
        if(!keepS.length||!tokensOf(keepS.join(' ')).length) return p('Хорошо, это не записываю.');
        raw=keepS.join(' ') }
      LEFT=null; var lf=takeLeft(raw); if(lf&&tokensOf(lf.text).length){ LEFT=lf; raw=lf.text }
    }
    var ORIG=nrm(String(raw)).trim().replace(/[?!.,…\s]+$/,'');
    if(SP&&m.kind!=='photo'&&!S.ask&&/(получил(ось|ась|ись|ся)|вышло)\s+\S+\s+(штук\S*|шт)(\s|,|$)/.test(ORIG)) return p('Похоже, это готовка: сколько получилось штук. В дневник не записал. Скажи, сколько съел ты.');   // как сказано, до разбора речи: по этому тексту узнаются вопросы «что я съел», «сколько я съел»
    if(SP&&m.kind!=='photo'&&!prepped){ raw=SP.prepare(raw);
      /* «ребёнок съел…» — ел не владелец дневника; «мне», «себе», «я» — пометка «это моё» (ставится здесь, пока слова не убраны как пустые) */
      raw=(' '+raw+' ').replace(/(^|\s)(ребенок|дети|малыш|сын|сынок|дочь|дочка|муж|жена|мама|папа|бабушка|дедушка|брат|сестра|гости|гость|друг|подруга|кот|кошка|собака|пес)\s+(?:не\s+)?⊙/g,'$1$2 ')
        .replace(/(^|\s)(мне|себе|сам|сама|у меня)(?=\s)/g,'$1⊙').replace(/\s+/g,' ').trim(); }
    var RAW0=raw;
    var t=nrm(raw), now=new Date(), bare=t.trim().replace(/[?!.,…\s]+$/,'');
    /* служебные фразы */
    if(/^тест(\s|$|овая|овое|овый)/.test(bare)) return p('Это тест. В дневник ничего не добавляю.');
    /* «отмени кофе» — убрать одну запись; «перепиши: груша 250 г» — убрать последнее и записать заново */
    CD=null;
    if(/^(отмени|отменить|убери|удали|сотри|замени|поменяй|исправь|перепиши|вместо|перенеси|перемести)(\s|$)/.test(bare)){
      var dsw=dayWords(' '+bare+' ');
      if(dsw.shift){ var dy=new Date(curDate+'T12:00:00'); dy.setDate(dy.getDate()+dsw.shift); CD=isoOf(dy); bare=dsw.text.replace(/\s+/g,' ').trim(); raw=bare }
    }
    var cx=bare.match(/^(?:отмени|отменить|убери|удали|сотри)\s+(.+)$/);
    if(cx&&!S.pend.length){ var cr=cx[1].replace(/(^|\s)(последн\S*|запись|записи|это|все|всё|его|ее|её|их)(?=\s|$)/g,' ').trim(); if(tokensOf(cr).length) return removeCmd(S,cr) }
    var rw=bare.match(/^(?:перепиши|запиши заново|заново|переделай)[\s,:]+(.+)$/);
    if(rw&&/\sна\s/.test(' '+rw[1]+' ')) rw=null;                                               // «перепиши грушу на банан» — ниже, заменой
    var rw2=bare.match(/^(?:замени|поменяй|исправь|перепиши|переделай)[\s,:]+на\s+(.+)$/);        // «замени на полбанана» — последнюю запись
    if(rw2) rw=[bare,rw2[1]];
    if(rw&&tokensOf(rw[1].replace(FILL,' ')).length){
      var lc=S.commits.filter(function(c){ return !c.undone&&c.add.length }).pop();
      S.rewrite=lc||null;
      var hN, eat0=EATEN, wg0=WEIGHED; NEST++; try{ hN=handle(chat,S,{kind:'text',text:rw[1]}) } finally { NEST-- }
      EATEN=eat0; WEIGHED=wg0;
      if(!lc) return hN;
      if(!S.rewrite) return p('Прежнюю запись заменил.')+hN;
      if(S.pend.length||S.offer) return hN+'<p class="mlHint">Прежнюю запись пока оставил: уберу, когда запишу новую.</p>';
      S.rewrite=null; return hN+p('Прежнюю запись оставил как была.');
    }
    var MV=/(^|\s)(перенеси|перемести|переставь|перекинь|оставь|не трогай)(\s|$)|(^|\s)был[аои]?\s+(на|в|к)\s|(^|\s)(это|эти|то)\s+(на|в)\s/;
    if(m.kind!=='photo'&&MV.test(' '+bare+' ')){ var mvh=moveCmd(chat,S,raw); if(mvh!=null) return mvh }
    if(/^(отмена|отмени|отменить|верни|не записывай|не надо|стоп)(\s|$)/.test(bare)){
      if(S.pend.length){ S.pend=[]; S.ask=null; S.rewrite=null; return p('Хорошо, не записываю.') }
      var lastC=S.commits.filter(function(c){ return !c.undone }).pop();
      if(!lastC) return p('Отменять нечего: в этом диалоге я ещё ничего не записал.');
      return undo(S,lastC)?p('Отменил последнюю запись: '+esc(lastC.add.filter(function(a){ return !a.hide }).map(function(a){ return foodName(a.line) }).join(', ')||'удаление')+'.'):p('Не получилось отменить.');
    }
    if(!/\d/.test(bare)&&/(подожди|погоди|секунд|минутк|сейчас взвешу|взвешиваю|взвешу)/.test(bare)&&tokensOf(bare.replace(/подожди|погоди|секунд\S*|минутк\S*|взвеш\S*/g,' ').replace(FILL,' ')).length===0)
      return p('Жду. Ничего не записываю, пока не скажешь.');
    /* «сколько калорий в 100 г риса?» — вопрос о продукте, а не об итоге дня: ответ из базы, в дневник ничего не идёт */
    var pq=bare.match(/^(?:а\s+)?сколько\s+(?:калори\S*|ккал|белк\S*|жир\S*|углевод\S*)\s+(?:содержится\s+|есть\s+)?во?\s+(.+)$/);
    if(pq&&m.kind!=='photo'){ var pi=productInfo(pq[1]); return pi||deferred('вопрос о питании') }
    if(/сколько\s+(я\s+)?(уже\s+|сегодня\s+|всего\s+)*(калори|ккал|набрал|съел)/.test(ORIG)||/(калори\S*|ккал)\s+(я\s+)?(уже\s+)?(набрал|съел|за сегодня|сегодня)/.test(ORIG)) return todayTotals();
    if(/что\s+(я\s+)?(уже\s+|сегодня\s+)*(записал|записано|съел|ел)(\s|$)/.test(ORIG)||/^(покажи|что)\s+(записи|день|записано|за сегодня)/.test(ORIG)) return todayList();
    if(/(список|чего)\s+(недостающ|не хватает|нет в базе)|что\s+не\s+нашел|ненайденн/.test(bare)) return missShow();
    var rp=bare.match(/^(?:замени|поменяй|исправь|перепиши|переделай)\s+(.+?)\s+на\s+(.+)$/)||bare.match(/^вместо\s+(.+?)\s+(?:запиши\s+|был[аио]?\s+|пил\S*\s+|ел\S*\s+)?(.+)$/)||bare.match(/^(?:нет\s*,?\s*)?не\s+(.+?)\s*,?\s+а\s+(.+)$/)||bare.match(/^(?:у\s+)?(.+?)\s+(?:было\s+|была\s+)?не\s+[\d.,]+\s*[а-я]*\s*,?\s+а\s+(.+)$/);
    if(rp){ var rr=replaceCmd(S,rp[1],rp[2]); if(rr) return rr }
    var del=bare.match(/^(удали|убери|сотри)\s+(.+)$/);
    if(del) return removeCmd(S,del[2]);
    /* «нет, …» — поправка последней записи; раньше ответа на вопрос, кроме вопроса «да / нет» */
    var no=bare.match(/^(?:(?:ой|ах|ай|блин|стоп|так)[\s,.!]+)*(?:нет|не так|неправильно|ошибся|ошиблась|исправь|поправь)(?:[\s,.!]+(.*))?$/);
    if(!no&&!S.ask&&lastAdd(S)&&hasMeal(bare)&&!tokensOf(bare.replace(FILL,' ')).length&&!/\d/.test(bare)) no=[bare,bare];
    if(no&&!(S.ask&&S.ask.kind==='again')&&lastAdd(S)){ var fixd=correct(S,no[1]||''); if(fixd!=null) return fixd+(S.pend.length?askHTML(S):'') }
    /* ответ на заданный вопрос */
    if(S.ask&&m.kind!=='photo'){ var ans=answer(S,raw); if(ans!=null) return ans }
    /* «жареные, были целиком» без вопроса — уточнение последней записи */
    var dw0=bare.replace(/[,.!]+/g,' ').replace(/(^|\s)(были|был|была|было|это|они|он|она|да|ну|все|всё|там|точнее)(?=\s|$)/g,' ').trim().split(/\s+/).filter(Boolean);
    if(!S.ask&&dw0.length&&!/\d/.test(bare)&&dw0.every(function(w){ return DESCR.test(w)||PREP.test(w) })&&lastAdd(S)){
      var ad0=lastAdd(S), base0=String(ad0.line.spoken||ad0.line.name||'').trim(), r0=understand(fixes(' '+base0+' '+dw0.join(' ')+' ')).lines[0], f0=r0&&(r0.fid||r0.alts[0]);
      if(f0&&f0===ad0.item.fid) return p('Так и записано: '+esc(foodName(ad0.line))+'.');
      if(f0){ ad0.line.alts=r0.alts.length?r0.alts:[f0]; var sw0=swapTo(S,ad0,f0); if(sw0) return sw0 }
    }
    if(ORD[bare]!=null&&!S.ask&&lastAdd(S)&&lastAdd(S).line.picked){ var sw1=swapTo(S,lastAdd(S),lastAdd(S).line.alts[ORD[bare]]); if(sw1) return sw1 }
    if(/^(ага|угу|да|ок|окей|хорошо|ладно|спасибо|понял|ясно|привет)[.!]*$/.test(bare)) return p('Ок.')+(S.pend.length?askHTML(S):'');
    /* время и разбор */
    t=t.replace(/^\s*(да|ага|угу)[\s,]+(?=\S)/,' ');
    if(SP) t=t.replace(/\s(?:а\s+|и\s+)?(?:до этого|перед этим|потом|затем|еще)\s+в\s+\d{1,2}\s*$/,' ');   // Meal 33.12
    var tt=takeTimes(t,now), work=fixes(tt.text);
    var why=DEFER.filter(function(d){ return d[0].test(work) })[0];
    if(why){
      /* Meal 33.12: понятное до непонятного места записывается, о непонятном бот говорит прямо. Всё, что после него, не трогается: к чему оно относится — неясно */
      if(SP&&m.kind!=='photo'&&!m.noDefer){
        var sg=String(m.text).split(/[,.;!?\n]+|\s(?:и|а)\s+/).map(function(x){ return x.trim() }).filter(Boolean), cutAt=-1;
        sg.some(function(x,i){ var nx=fixes(nrm(x)); if(DEFER.some(function(d){ return d[0].test(nx) })){ cutAt=i; return true } return false });
        var keepT=cutAt>0?sg.slice(0,cutAt).join(', '):'';
        if(keepT&&tokensOf(keepT.toLowerCase().replace(FILL,' ')).length){
          var hD; NEST++; try{ hD=handle(chat,S,{kind:'text',text:keepT,eaten:m.eaten,noDefer:true}) } finally { NEST-- }
          return hD+'<p class="mlHint">Дальше не разобрал: «'+esc(sg.slice(cutAt).join(', '))+'» — '+esc(why[1])+'. Это не записал. Скажи проще: продукт и вес.</p>';
        }
      }
      return deferred(why[1]);
    }
    if(asked||/^(сколько|почему|зачем|как|какой|какая|какие|чего|можно ли|посоветуй|что лучше)(\s|$)/.test(bare)) return deferred('вопрос о питании');
    var multi=tt.hits.length>1, clauses;
    if(multi){
      /* несколько времён в одной диктовке: части фразы режутся по «ещё / потом / затем», у каждой — своё время */
      clauses=t.replace(/(\d)\.(\d)/g,'$1,$2').split(/[.;!?\n]+|\s(?:а\s+)?(?:еще|потом|затем|после этого)\s/).map(function(c){ return c.trim() }).filter(Boolean).map(function(c){ var x=takeTimes(' '+c+' ',now); return {text:fixes(x.text),hit:x.hits[0]||null,dayShift:x.dayShift} });
      var lastHit=null; clauses.forEach(function(c){ if(c.hit) lastHit=c.hit; else c.hit=lastHit });
      var first=clauses.filter(function(c){ return c.hit })[0]; clauses.forEach(function(c){ if(!c.hit) c.hit=first?first.hit:null });
    } else clauses=[{text:work,hit:tt.hits[0]||null,dayShift:tt.dayShift}];
    var ready=[], asks=[], miss=[], orphan=null, today=curDate===todayISO(), others=[], guessed=null;
    /* человек не ответил на «не нашёл…», а сказал заново — прежний вопрос снимается */
    if(S.ask&&(S.ask.kind==='name'||S.ask.kind==='what')&&S.pend[0]===S.ask.q){ S.pend.shift(); S.ask=null }
    clauses.forEach(function(c){
      FILLOK=true; var u; try{ u=understand(c.text.replace(FILL,' ')) } finally { FILLOK=false }
      if(u.orphan) orphan=u.orphan;
      if(u.others) others=others.concat(u.others);
      var shift=(c.hit?c.hit.shift:0)+(c.dayShift||0), date=curDate;
      if(shift){ var d=new Date(curDate+'T12:00:00'); d.setDate(d.getDate()+shift); date=isoOf(d) }
      /* «в 10» + «на обед» — 10 утра; «в 7» + «на ужин» — 19:00: час без «утра/вечера» читаем по названному приёму */
      if(c.hit&&c.hit.amb){ var mk=(u.lines.filter(function(l){ return l.meal })[0]||{}).meal||u.tailMeal, hr=byMeal(c.hit.amb,mk); if(hr!=null) c.hit.t=pad2(hr)+':00' }
      var time=c.hit?c.hit.t:(today&&!shift?hm(now):null);
      if(u.tailMeal) u.lines.forEach(function(l){ if(!l.meal) l.meal=u.tailMeal });
      var small=smallOf(u.lines), grp='g'+(++SEQ);
      u.lines.forEach(function(l){
        var sk=l.meal||(time?secFor(date,time,small):autoSec()), ld=date, needMeal=!l.meal&&!time;
        /* «на завтрак…», сказанное вечером без времени: время «сейчас» завтраку не ставим — иначе завтрак «начнётся» вечером */
        var lt=time, own=l.meal&&time?mealTimes(date,l.meal,null):[];
        if(l.meal&&!c.hit&&today&&!shift&&mins(time)<300&&ORDK.indexOf(l.meal)>=0){
          /* ночью «на ужин…» без времени — это про вчерашний ужин */
          var dy=new Date(date+'T12:00:00'); dy.setDate(dy.getDate()-1); ld=isoOf(dy); lt=mealTime(ld,l.meal,null); if(lt) guessed=lt;
        }
        else if(l.meal&&!c.hit&&own.length&&mins(time)-own[own.length-1]>NEAR){ lt=hmOf(own[own.length-1]); guessed=lt }   // «на ужин ещё…» позже — к тому ужину
        else if(l.meal&&!c.hit&&(!time||secFor(date,time,small)!==l.meal)){ var mt0=time?movedTime(date,l.meal,time,null):{t:mealTime(date,l.meal,null),set:true}; lt=mt0.t; if(mt0.set&&lt) guessed=lt }
        var en={line:l,date:ld,t:lt,tm:!!c.hit,approx:!!(c.hit&&c.hit.approx),sec:sk};
        if(needMeal){ en.needMeal=true; en.grp=grp }
        l.t=lt; l.tm=c.hit?1:0; l.sec=sk;
        var tc=m.kind!=='photo'&&l.ask!=='range'&&l.ask!=='waste'&&l.ask!=='inc'&&!l.inc&&!l.split&&!l.fromDish&&!l.waste?tapFor(l):null;
        if(tc&&tc.n){ en.tap=tc; l.fid=tc.c.fid; l.st='ok'; l.q=tc.n*tc.c.q; l.u=tc.c.u; l.g=Math.round(tc.n*tc.g*10)/10; l.explicit=true; l.ask=null; l.picked=false; l.count=null }
        else if(tc&&l.fid===tc.c.fid) l.tapMiss=tc.c;
        if(m.kind!=='photo'&&l.ask==='pick'&&!l.noAuto&&l.alts.some(function(x){ return covers(x,String(l.name||'').split(' ').filter(Boolean)) })){
          l.fid=l.alts[0]; l.st='ok'; l.g=gramsFor(l.fid,l.q,l.u); l.picked=true; l.ask=l.range?'range':needQty(l)?'qty':null;
        }
        if(SP&&m.kind!=='photo'&&!en.tap){ var e1=EATEN; if(l.cookDish) EATEN=true; methodFix(l,String(l.name||'').split(' ').filter(Boolean)); EATEN=e1 }   // «съел курицы» — готовая, а не сырая
        if(m.kind==='photo'){ l.ask=l.ask||'photo'; asks.push(en) }
        else if(!l.ask&&needMeal){ l.ask='meal'; asks.push(en) }
        else if(!l.ask) ready.push(en);
        else if(l.ask==='name'&&!/[а-яё]/i.test(String(l.name||''))){}   // Meal 33.12: латиница без единого русского слова — не еда, в список недостающего не идёт
        else if(l.ask==='name'&&!l.explicit) miss.push(l);
        else asks.push(en);
      });
    });
    if(m.kind!=='photo'&&SP){
      /* килограмм и больше одного продукта без слова «съел» — это покупка или готовка, а не порция: «взвесила фарш, полтора кило» */
      var INGR=/^(фарш|мясо|говядин|свинин|баранин|телятин|куриц|курин|филе|рыба|мука|сахар|крупа|рис|гречк|макарон|масло|картофел|лук|морков|капуст|яйц|творог|сыр)/;
      var big=ready.concat(asks).filter(function(en){ var l=en.line; if(!l.fid||en.tap||!l.explicit||isDrink(l.fid)) return false;
        return l.g>=3000||l.g>=1000&&(INGR.test(norm(FOODS[l.fid].n))||SP.group(FOODS[l.fid],'шт')>0&&SP.group(FOODS[l.fid],'шт')<=150) })[0];   // килограмм арбуза съесть можно; килограмм фарша или двадцать котлет — нет
      if(big&&!EATEN) return p('Похоже, это для готовки, а не съедено: '+esc(String(foodName(big.line)).split(/[,(—]/)[0].trim().toLowerCase())+' '+fmt(big.line.g)+' г. В дневник ничего не записал.')+'<p class="mlHint">Если это съел ты — скажи: «съел …». Или скажи, сколько съел ты.</p>';
      /* «не доела, половину оставила» */
      if(LEFT) ready.forEach(function(en){ var l=en.line; if(en.tap||!l.fid||!(l.g>0)) return;
        if(LEFT.k){ l.q=Math.round(l.q*LEFT.k*100)/100; l.g=gramsFor(l.fid,l.q,l.u); l.approx=true; l.left='не доедено — записал съеденную часть' }
        else { l.approx=true; l.usual=true; l.left='не доедено — сколько осталось? «Меньше» — половина' } });
    }
    /* блюда «А с Б» нет в базе, а части понятны: не спрашиваю «что именно?» — предлагаю записать по отдельности; пока человек не ответил, ничего не пишу */
    if(m.kind!=='photo'){
      var allEn=ready.concat(asks), cpL=[]; allEn.forEach(function(en){ var cp=en.line.comp; if(cp&&!cp.ok&&cpL.indexOf(cp)<0) cpL.push(cp) });
      var cp0=cpL.filter(function(cp){ return cp.lines.length>1&&cp.lines.every(function(l){ return l.fid&&l.g>0&&(!l.ask||l.ask==='meal') }) })[0];
      if(cp0){
        S.offer={raw:RAW0,src:cp0.src,key:cp0.key,n:cp0.n||1,eaten:EATEN,weighed:WEIGHED,left:LEFT,parts:cp0.lines.map(function(l){ return {fid:l.fid,q:l.q,u:l.u,g:l.g} })};
        var restN=allEn.filter(function(en){ return en.line.comp!==cp0 }).length+miss.length;
        return p((cp0.named?esc(cp0.name)+' в базе нет. Предлагаю':'Одним блюдом этого в базе нет — предлагаю')+' записать по отдельности: '+
            cp0.lines.map(function(l){ return esc(String(foodName(l)).split(/,\s|\(|—/)[0].trim().toLowerCase())+' '+fmt(l.g)+' г' }).join(' и ')+'.')+
          p('Записать так? Или скажи свои граммы.')+(restN?'<p class="mlHint">Остальное из сообщения запишу вместе с этим.</p>':'')+chips([['offer:1','Записать так']]);
      }
    }
    /* Meal 33.9: «…и груша» записана обычной мерой (≈), а следом «и груша 200 г» — это уточнение той записи, а не вторая груша */
    var spec=[], lc0=S.commits[S.commits.length-1];
    if(SP&&m.kind!=='photo'&&lc0&&!lc0.undone&&lc0.at&&now-lc0.at<120000){
      ready=ready.filter(function(en){ var l=en.line; if(l.usual||!l.explicit||en.tap) return true;
        var ad=lc0.add.filter(function(a){ return a.line.usual&&!a.spec&&a.item.fid===l.fid&&day(a.date).items.indexOf(a.item)>=0 })[0]; if(!ad) return true;
        ad.item.q=l.q; ad.item.u=l.u; ad.item.g=l.g; if(l.approx) ad.item.approx=1; else delete ad.item.approx;
        ad.line.q=l.q; ad.line.u=l.u; ad.line.g=l.g; ad.line.approx=!!l.approx; ad.line.usual=false; ad.spec=true; spec.push(ad); return false });
      if(spec.length) touch();
    }
    var specH=spec.length?p('Уточнил:')+'<div class="mlRows">'+spec.map(function(a){ return row(a.line,true) }).join('')+'</div>':'';
    if(specH&&!ready.length&&!asks.length&&!miss.length) return specH+(S.pend.length?askHTML(S):'');
    if(orphan&&!ready.length&&!asks.length&&!miss.length){
      var ol={id:'l'+(++SEQ),raw:orphan,q:null,u:null,fid:null,alts:[],st:'none',name:'',explicit:false,ask:'what'};
      asks.push({line:ol,date:curDate,t:today?hm(now):null,tm:false,approx:false,sec:autoSec()});
    }
    if(m.kind==='photo'){
      if(!asks.length) return p('Не узнал еду на фото. Скажи или напиши, что это.');
      S.pend=S.pend.concat(asks);
      return p('На фото, похоже:')+'<div class="mlRows">'+asks.map(function(en){ return row(en.line,en.line.st==='ok') }).join('')+'</div><p class="mlHint">Вес на глаз — проверь в списке и сохрани.</p>';
    }
    var othH=others.length?'<p class="mlHint">Не записал — это не съедено тобой: «'+esc(others.join('», «').replace(MK,'').replace(/\s+/g,' ').trim())+'».</p>':'';
    if(!ready.length&&!asks.length&&othH) return othH;
    if(!ready.length&&!asks.length){
      if(miss.length){ miss.forEach(function(l){ missLog('нет в базе',l.name,l.raw) }); return p('В базе нет: «'+esc(miss.map(function(l){ return l.name }).join(', '))+'». Ничего не записал, добавил в список недостающего.') }
      return p('Не нашёл здесь еды. Ничего не записал.');
    }
    /* то же сообщение второй раз подряд за две минуты — возможно, повтор, а не вторая порция */
    var key=bare, h=specH;
    if(S.last&&S.last.key===key&&now-S.last.at<120000&&ready.length&&!S.pend.length){
      ready.forEach(function(en){ en.line.ask='again' }); S.pend=ready.concat(asks); return askHTML(S);
    }
    if(ready.length){
      var c=commit(S,ready);
      if(c===false) return p('Чтобы записывать, войди в аккаунт.');
      h+=commitHTML(c)+(guessed?timeNote(guessed):'')+othH; S.last={key:key,at:+now}; othH='';
    }
    if(miss.length){ miss.forEach(function(l){ missLog('нет в базе',l.name,l.raw) }); h+=p('В базе нет: «'+esc(miss.map(function(l){ return l.name }).join(', '))+'» — не записал, добавил в список недостающего.') }
    /* новое неясное — вперёд: человек сейчас об этом; прежний вопрос вернётся следом */
    var waiting=S.pend.length;
    if(asks.length){ S.pend=asks.concat(S.pend) }
    h+=othH;
    if(S.pend.length) h+=askHTML(S)+(S.pend.length>1?'<p class="mlHint">Потом спрошу ещё: '+(S.pend.length-1)+'.</p>':'');
    return h;
  }
  /* список недостающего в базе: что бот не нашёл и у чего нет веса штуки. Лаборатория — в памяти этого браузера */
  var MISSK='happy-meal-bot-miss';
  function missGet(){ try{ return JSON.parse(localStorage.getItem(MISSK)||'[]') }catch(e){ return [] } }
  function missLog(kind,name,said){
    name=String(name||'').trim(); if(!name||name.length<2) return;
    if(!/[а-яё]/i.test(name)) return;   // Meal 33.12: «log food please» — не название еды
    var L=missGet(), k=kind+'|'+name.toLowerCase(), x=L.filter(function(y){ return y.k===k })[0];
    if(x){ x.n++; x.at=todayISO(); if(said) x.said=String(said).slice(0,80) } else L.push({k:k,kind:kind,name:name,said:String(said||'').slice(0,80),n:1,at:todayISO()});
    try{ localStorage.setItem(MISSK,JSON.stringify(L.slice(-300))) }catch(e){}
  }
  function missText(){
    var L=missGet(); if(!L.length) return '';
    var g={}; L.forEach(function(x){ (g[x.kind]=g[x.kind]||[]).push(x) });
    return Object.keys(g).map(function(k){ return k.charAt(0).toUpperCase()+k.slice(1)+':\n'+g[k].map(function(x){ return '- '+x.name+(x.n>1?' ×'+x.n:'')+(x.said&&x.said.toLowerCase()!==x.name.toLowerCase()?' — «'+x.said+'»':'') }).join('\n') }).join('\n\n');
  }
  function missShow(){
    var t=missText(); if(!t) return p('Список недостающего пуст: пока всё нашлось.');
    return p('Чего не хватает в базе:')+'<pre class="mbMiss">'+esc(t)+'</pre>'+chips([['misscopy:x','Скопировать список'],['missclear:x','Очистить список']]);
  }
  function deferred(why){
    return p('Пока так не умею — '+esc(why)+'. Ничего не записал.')+'<p class="mlHint">Это разберёт модель (этап 2). Сейчас можно сказать проще: продукт и вес.</p>';
  }

  /* ── поправка уже записанного: кнопкой или словом («нет, 200 г», «нет, баранина», «нет, второй») ── */
  function touch(){ save(); try{ if(typeof renderAll==='function') renderAll() }catch(e){} }
  function swapTo(S,ad,fid){
    if(!fid||!FOODS[fid]) return null;
    if(writeGuard()) return p('Чтобы менять записи, войди в аккаунт.');
    if(String(fid).indexOf('bls:')===0&&FOODS[fid].tmp) blsUse(fid);
    var x=ad.item, l=ad.line; x.fid=fid; l.fid=fid; x.how=1; if(!(FOODS[fid].por||{})[x.u]&&x.u!=='г'&&!DEF[x.u]){ x.u='г'; x.q=x.g }
    x.g=gramsFor(fid,x.q,x.u); l.q=x.q; l.u=x.u; l.g=x.g; l.picked=false; touch();
    return p('Заменил:')+'<div class="mlRows">'+row(l,true)+'</div>';
  }
  /* «нет, на завтрак», «нет, в 9 утра» — переносим всё, что записано последним сообщением */
  function moveLast(S,rest){
    function alive(a){ return day(a.date).items.indexOf(a.item)>=0 }
    var c0=S.commits.filter(function(x){ return !x.undone&&x.add.some(alive) }).pop(); if(!c0) return null;
    var c={add:c0.add.filter(alive)};                                          // удалённое и отменённое не переносим
    var t=nrm(rest).replace(/(^|\s)(ой|нет|неправильно|не так|ошибся|ошиблась|исправь|поправь|точнее|это|было|была|а)(?=[\s,.!]|$)/g,' ').replace(/[,.!]+/g,' ');
    var tt=takeTimes(' '+t+' ',new Date()), restT=tt.text.replace(FILL,' ');
    if(tokensOf(restT).length||/\d/.test(restT)) return null;                 // есть еда или числа — это не перенос
    var SW=secWords(), mk=null; restT.split(/\s+/).forEach(function(w){ var n=norm(w); if(n.length>2) Object.keys(SW).forEach(function(k){ if(isSecWord(n,k)) mk=SW[k] }) });
    var hitT=tt.hits[0]||null; if(!mk&&!hitT) return null;
    if(writeGuard()) return p('Чтобы менять записи, войди в аккаунт.');
    var nt=null, guess=null; if(hitT){ nt=hitT.t; if(hitT.amb){ var hr=byMeal(hitT.amb,mk||c.add[0].item.sec); if(hr!=null) nt=pad2(hr)+':00' } }
    c.add.forEach(function(a){
      if(nt){ a.item.t=nt; a.item.tm=1; a.en.t=nt; a.en.tm=true; a.en.approx=hitT.approx }
      if(mk){ if(!nt){ var mt=movedTime(a.date,mk,a.item.t,c.add.map(function(z){ return z.item })); if(mt.set){ a.item.t=mt.t; delete a.item.tm; a.en.t=mt.t; a.en.tm=false; a.en.approx=false; guess=mt.t } }
        a.item.sec=mk; a.en.sec=mk; a.line.meal=mk }
      else if(nt&&!a.line.meal){ a.item.sec='__'; }
    });
    if(nt&&!mk){ var sm=smallOf(c.add.map(function(a){ return a.item })); c.add.forEach(function(a){ if(a.item.sec==='__'){ var k=secFor(a.date,nt,sm); a.item.sec=k; a.en.sec=k } }) }
    touch();
    return p('Перенёс: '+esc(whenText(c.add[0].en)))+'<div class="mlRows">'+c.add.filter(function(a){ return !a.hide }).map(function(a){ return row(a.line,true) }).join('')+'</div>'+(guess?timeNote(guess):'');
  }
  /* перенос по названию: «кофе на завтрак, а перепёлки оставь», «перенеси кофе в обед», «это было на завтрак, а на ужин было 200 г плова» */
  function mealIn(txt){ var SW=secWords(), mk=null, rest=[]; String(txt).split(/\s+/).filter(Boolean).forEach(function(w){ var n=norm(w), k=n.length>2&&Object.keys(SW).filter(function(k){ return isSecWord(n,k) })[0]; if(k) mk=SW[k]; else rest.push(w) }); return {mk:mk,rest:rest.join(' ')} }
  function moveCmd(chat,S,text){
    var t=nrm(text).replace(/(\d)[.,](\d)/g,'$1,$2'), parts=t.split(/[.;!?]+|,?\s+а\s+|,\s*(?=на\s)/).map(function(c){ return c.trim() }).filter(Boolean);
    var out='', did=false, later=[];
    parts.forEach(function(c){
      if(/(^|\s)(оставь|не трогай|пусть\s+(будет|останется|остается))/.test(c)) return;
      var c2=c.replace(/(^|\s)(перенеси|перемести|переставь|перекинь|ой|нет|ошибся|ошиблась|это|эти|то|было|была|были|был|тоже|туда|исправь|поправь)(?=[\s,]|$)/g,' ').replace(/[,]+/g,' ');
      var tt=takeTimes(' '+c2+' ',new Date()), mi=mealIn(tt.text), hitT=tt.hits[0]||null;
      if(!mi.mk&&!hitT){ later.push(c); return }
      var foodTxt=mi.rest.replace(/(^|\s)(на|в|во|к)(?=\s|$)/g,' ').replace(FILL,' ').replace(/\s+/g,' ').trim();
      if(!tokensOf(foodTxt).length){ var r=moveLast(S,c2); if(r){ out+=r; did=true } return }
      var hasQty=foodTxt.split(' ').some(function(w){ var k=kindOf(w); return k==='N'||k==='U' });
      var x=!hasQty&&findItem(foodTxt);
      if(!x){ later.push(c); return }
      if(writeGuard()){ out+=p('Чтобы менять записи, войди в аккаунт.'); did=true; return }
      var nt=null; if(hitT){ nt=hitT.t; if(hitT.amb){ var hr=byMeal(hitT.amb,mi.mk||x.sec); if(hr!=null) nt=pad2(hr)+':00' } }
      if(nt){ x.t=nt; x.tm=1 }
      var g1=null;
      if(mi.mk){ if(!nt){ var mt=movedTime(cd(),mi.mk,x.t,[x]); if(mt.set){ x.t=mt.t; delete x.tm; g1=mt.t } } x.sec=mi.mk } else { var keep=x.sec; x.sec='__'; x.sec=secFor(cd(),nt,smallOf([x]))||keep }
      touch(); did=true;
      out+=p('Перенёс: '+esc(whenText({sec:x.sec,t:x.t,date:cd(),approx:hitT&&hitT.approx})))+'<div class="mlRows">'+row({fid:x.fid,q:x.q,u:x.u,g:x.g,name:''},true)+'</div>'+(g1?timeNote(g1):'');
    });
    if(!did) return null;
    later.forEach(function(c){ out+=handle(chat,S,{kind:'text',text:c}) });
    return out;
  }
  function lastAdd(S){ var c=S.commits.filter(function(x){ return !x.undone&&x.add.some(function(a){ return day(a.date).items.indexOf(a.item)>=0 }) }).pop(); if(!c) return null; var al=c.add.filter(function(a){ return day(a.date).items.indexOf(a.item)>=0 }); return al[al.length-1] }
  var ORD={'первый':0,'первая':0,'первое':0,'первую':0,'второй':1,'вторая':1,'второе':1,'вторую':1,'третий':2,'третья':2,'третье':2,'третью':2};
  function correct(S,rest){
    var ad=lastAdd(S); if(!ad) return p('Поправлять пока нечего: в этом диалоге я ещё ничего не записал.');
    var mv=moveLast(S,rest); if(mv) return mv;
    if(hasMeal(rest)||takeTimes(nrm(rest),new Date()).hits.length){ var mv2=moveCmd(CH.meal,S,rest); if(mv2!=null) return mv2 }
    var l=ad.line, x=ad.item, r=nrm(rest).replace(/(^|\s)(неправильно|не так|не то|ошибся|ошиблась|исправь|поправь|точнее|на|было|была|это|там|а)(?=\s|$)/g,' ').replace(/[,.!]+/g,' ').replace(/\s+/g,' ').trim();
    if(!r) return p('Что поправить в «'+esc(foodName(l))+'»? Скажи вес или продукт — или «отмени».');
    if(ORD[r]!=null){ var f0=l.alts[ORD[r]]; return (f0&&swapTo(S,ad,f0))||p('Такого варианта не было.') }
    if(/^(больше|меньше|побольше|поменьше)$/.test(r)) return p('Сколько? Скажи, например: «нет, 250 г».');
    /* «нет, жареные без кожи» — уточнение того же продукта */
    var rw=r.split(' ').filter(Boolean);
    if(rw.length&&!/\d/.test(r)&&rw.every(function(w){ return DESCR.test(w)||PREP.test(w) })){
      var bq=String(l.spoken||l.name||'').trim(), rr=understand(fixes(' '+bq+' '+r+' ')).lines[0], ff=rr&&(rr.fid||rr.alts[0]);
      if(ff&&ff===x.fid) return p('Так и записано: '+esc(foodName(l))+'.');
      if(ff){ l.alts=rr.alts.length?rr.alts:[ff]; return swapTo(S,ad,ff) }
      return p('Не нашёл «'+esc(bq+' '+r)+'». Запись оставил как была.');
    }
    var u=understand(fixes(' '+r+' '));
    if(!u.lines.length&&u.orphan){
      var w=parseText((tokensOf(norm(foodName(l)))[0]||'продукт')+' '+u.orphan).lines[0]; if(!w||!w.explicit) return null;
      if(writeGuard()) return p('Чтобы менять записи, войди в аккаунт.');
      x.q=w.q; x.u=w.u; x.g=gramsFor(x.fid,x.q,x.u); l.q=x.q; l.u=x.u; l.g=x.g; touch(); learn(l);
      return p('Поправил:')+'<div class="mlRows">'+row(l,true)+'</div>';
    }
    if(u.lines.length===1){
      var n=u.lines[0], fid=n.fid||n.alts[0];
      /* «нет, гречки 150» после «гречка и масло» — поправка той записи, о которой сказано, а не последней */
      var cL=S.commits.filter(function(c){ return !c.undone&&c.add.indexOf(ad)>=0 })[0], rt=tokensOf(r);
      var named=cL&&fid&&cL.add.filter(function(a){ return a!==ad&&day(a.date).items.indexOf(a.item)>=0&&(a.item.fid===fid||rt.length&&headOk(a.item.fid,rt)) })[0];
      if(named&&!(x.fid===fid||rt.length&&headOk(x.fid,rt))){
        ad=named; l=ad.line; x=ad.item;
        if(n.explicit){ if(writeGuard()) return p('Чтобы менять записи, войди в аккаунт.');
          x.q=n.q; x.u=n.u; x.g=gramsFor(x.fid,x.q,x.u); delete x.approx; l.q=x.q; l.u=x.u; l.g=x.g; l.approx=false; l.usual=false; touch(); learn(l);
          return p('Поправил:')+'<div class="mlRows">'+row(l,true)+'</div>' }
      }
      /* «нет, девять процентов», «нет, варёная» — слово из предложенных вариантов */
      var byAlt=l.alts.filter(function(a){ return a!==x.fid&&tokensOf(r).every(function(q){ return words(a).some(function(wd){ return sim(q,wd)>=1.8||adjStem(q)&&adjStem(q)===adjStem(wd) }) }) })[0];
      if(byAlt) fid=byAlt;
      if(!fid){ missLog('нет в базе',r,rest); return p('В базе нет «'+esc(r)+'». Запись оставил как была, а это добавил в список недостающего.') }
      if(n.explicit){ x.q=n.q; x.u=n.u }
      l.alts=n.alts.length?n.alts:l.alts;
      return swapTo(S,ad,fid);
    }
    return null;
  }

  /* поправка части блюда «А с Б» запоминается: в следующий раз блюдо запишется уже с ней */
  function learn(l){
    var cp=l&&l.comp; if(!cp||!cp.key||!cp.lines) return;
    var ps=cp.lines.filter(function(x){ return x.fid&&x.g>0 }).map(function(x){ return {fid:x.fid,q:x.q,u:x.u,g:x.g} });
    if(ps.length) memSet(cp.key,ps,cp.n);
  }
  /* нажатие кнопки в ответе */
  function tap(action,label){
    var chat=CH.meal; if(D!==chat) return;
    var S=state(chat), a=action.split(':'), h=null;
    if(SP) SP.on(true);
    try{ h=tapInner(chat,S,a) } finally { if(SP) SP.on(false) }
    if(h==null) return;
    syncLines(chat);
    chat.msgs.push({id:'m'+(++chat.seq),who:'me',kind:'text',text:label,tapped:1});
    botSay(h,260);
  }
  function tapInner(chat,S,a){
    var h=null;
    if(a[0]==='undo'){ var c=S.commits.filter(function(x){ return x.id===a[1] })[0]; if(!c||c.undone) return;
      h=undo(S,c)?p(c.del?'Вернул запись.':'Отменил. Этих записей в дневнике больше нет.'):null }
    else if(a[0]==='swap'){ var c2=S.commits.filter(function(x){ return x.id===a[1] })[0], ad=c2&&!c2.undone&&c2.add[+a[2]]; if(!ad) return;
      h=swapTo(S,ad,ad.line.alts[+a[3]]) }
    else if(a[0]==='less'||a[0]==='more'){ var c3=S.commits.filter(function(x){ return x.id===a[1] })[0]; if(!c3||c3.undone||writeGuard()) return;
      var kf=a[0]==='less'?0.5:1.5; c3.add.forEach(function(ad){ var l=ad.line; if(!l.usual) return; l.q=Math.round(l.q*kf*100)/100; l.g=gramsFor(l.fid,l.q,l.u); ad.item.q=l.q; ad.item.g=l.g });
      touch(); h=commitHTML(c3) }
    else if(a[0]==='offer'){ if(!S.offer) return; h=handle(chat,S,{kind:'text',text:'да'}) }
    else if(a[0]==='sheet'){ openSheet(chat); return }
    else if(a[0]==='misscopy'){ var mt=missText(); try{ navigator.clipboard.writeText(mt).then(function(){ toast('Список скопирован') },function(){ toast('Не скопировалось — выдели текст вручную') }) }catch(e){ toast('Не скопировалось — выдели текст вручную') } return }
    else if(a[0]==='missclear'){ try{ localStorage.removeItem(MISSK) }catch(e){} h=p('Список очистил.') }
    else h=tapDo(S,a[0],a[1],a[2]);
    return h;
  }
  /* неясное — в шторку «Подобрано»: там поиск по всей библиотеке; время и раздел строк сохраняются */
  function openSheet(chat){
    var S=state(chat); if(!S.pend.length) return;
    var f=S.pend[0];
    M={mode:'diary',said:'',lines:S.pend.map(function(q){ var l=q.line; if(l.st==='none'||!l.fid&&!l.alts.length) l.st='none'; else if(!l.fid) l.st='pick'; l.from='text'; return l }),
       sec:f.sec||autoSec(),open:null,t:f.t||(curDate===todayISO()?nowHM():null),tm:!!f.tm,man:false,back:'day',fromChat:true};
    FIND=null; go('match'); renderMatch();
  }

  /* ── выбор продукта: простое слово — базовый продукт, а не блюдо с ним и не сушёный вариант ──
     Вызывается из parseText. true — совпадение из подключённых библиотек «рыхлое»: сначала спросить основную базу. */
  function words(id){ var f=FOODS[id]; return f?norm(f.n).split(/[^a-zа-я0-9%]+/).filter(Boolean):[] }
  function extraState(id,food){ var fs=statesOf(words(id)), qs=statesOf(food); return Object.keys(fs).some(function(k){ return k!=='raw'&&!qs[k] }) }
  function headOk(id,food){ var w=words(id)[0]; return !!w&&food.some(function(q){ return sim(q,w)>=1.8 }) }
  /* Meal 33.9: «отварная» покрыта названием «…, варёное» — тот же способ приготовления другим словом */
  function covers(id,food){ var ws=words(id), fs=statesOf(ws); return food.every(function(q){ return ws.some(function(w){ return sim(q,w)>=1.8||adjStem(q)&&adjStem(q)===adjStem(w) })||STF.some(function(pp){ return pp[1].test(q)&&fs[pp[0]] }) }) }
  function related(id,food){ var ws=words(id); return food.some(function(q){ return ws.some(function(w){ return sim(q,w)>=1||adjStem(q)&&adjStem(q)===adjStem(w) }) }) }
  /* название — это и есть сказанное слово: «Груша, сырая» для «груша»; «Грибы шиитаке» для «грибы» — нет */
  function exactName(id,food){ return words(id).every(function(w){
    return PREP.test(w)||NEUTRAL.test(w)||/^(напиток|сырой|сырая|сырое|сырые|\d.*)$/.test(w)||food.some(function(q){ return sim(q,w)>=1.8||adjStem(q)&&adjStem(q)===adjStem(w) }) }) }
  /* варианты почти не отличаются по калориям — вопрос ничего не меняет («соль морская» или «каменная») */
  function sameKcal(ids){ var ks=ids.map(function(a){ return FOODS[a]?FOODS[a].k||0:0 }), mx=Math.max.apply(null,ks), mn=Math.min.apply(null,ks); return mx-mn<=Math.max(8,0.15*mx) }
  function clean(id,food){ var ws=words(id), qs=statesOf(food), fs=statesOf(ws);
    for(var k in qs){ if(k!=='raw'&&!fs[k]) return false }              // «солёных помидор» — не «Помидоры, сырые»
    return headOk(id,food)&&!extraState(id,food)&&food.every(function(q){
    return NEUTRAL.test(q)||STF.some(function(pp){ return pp[1].test(q) })||ws.some(function(w){ return sim(q,w)>=1.8||adjStem(q)&&adjStem(q)===adjStem(w) }) }) }
  /* «белого» = «белый»: у коротких корней общий разбор слов осторожничает, прилагательные сравниваем по основе */
  function adjStem(w){ var m=String(w).match(/^(.{3,})(ый|ий|ой|ая|яя|ое|ее|ые|ие|ого|его|ому|ему|ую|юю|ых|их|ым|им|ыми|ими)$/); return m?m[1]:'' }
  function loose(id,food){
    var f=FOODS[id]; if(!f) return false;
    var src=String(f.src||'');
    if(src==='BLS'||src==='Мои'||f.mine) return false;      // свой короткий список и свои продукты — как раньше
    if(!headOk(id,food)||extraState(id,food)) return true;  // «говядина» → «Машкичири с говядиной», «хурма» → «Хурма сушёная»
    return /MEXT|USDA|KFCT/.test(src);                      // большие справочники — после основной базы (Meal 33.9: и корейский KFCT — иначе один и тот же продукт находился то в нём, то в основной базе)
  }
  /* среди точных совпадений сначала те, где слово — само название и нет лишнего способа приготовления */
  function rank(list,food){
    /* Meal 33.10: у продукта своего короткого списка слово может стоять в словах поиска, а не в названии: «Томаты» — это и «помидоры» */
    function head(id){ var f=FOODS[id]; return headOk(id,food)||!!(f&&f.w&&String(id).indexOf('bls:')!==0&&/^(BLS|Мои)$/.test(String(f.src||''))&&f.w.some(function(w){ return food.some(function(q){ return sim(q,w)>=1.8 }) })) }
    return list.map(function(x,i){ return {x:x,i:i,p:(head(x.id)?0:2)+(extraState(x.id,food)?1:0)+(/^(BLS|Мои)$/.test(String((FOODS[x.id]||{}).src||''))?0:1.5)+((FOODS[x.id]||{}).mine?-0.5:0)+(/\s(с|со)\s/.test(' '+String((FOODS[x.id]||{}).n||'').toLowerCase()+' ')&&food.length<2?0.75:0)} })
      .sort(function(a,b){ return a.p-b.p||a.i-b.i }).map(function(o){ return o.x });
  }
  /* включение: проба на этом устройстве (раздел «Для разработчика»). Выключен — Meal работает как без бота */
  var ONK='happy-meal-bot';
  /* Meal 33.12: бот включён у всех (решение Астамура 18.11.2026 23:36). Выключают его в «Для разработчика»; в ячейке хранится только «выключен» */
  function on(){ try{ return localStorage.getItem(ONK)!=='0' }catch(e){ return true } }
  function setOn(v){ try{ if(v) localStorage.removeItem(ONK); else localStorage.setItem(ONK,'0') }catch(e){} }
  function wire(){
    var sw=document.getElementById('mealBotSwitch'); if(!sw) return;
    sw.checked=on();
    sw.addEventListener('change',function(){ setOn(sw.checked); if(typeof CH!=='undefined'&&typeof newChat==='function'){ var sq=CH.meal.seq; CH.meal=newChat('meal'); CH.meal.seq=sq; if(typeof D!=='undefined'&&D&&D.kind==='meal') D=CH.meal }
      if(typeof toast==='function') toast(sw.checked?'Бот записи еды включён':'Бот записи еды выключен') });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire); else wire();
  return {on:on,setOn:setOn,reply:reply,tap:tap,openSheet:openSheet,loose:loose,headOk:headOk,rank:rank,understand:understand,takeTimes:takeTimes,state:state};
})();
