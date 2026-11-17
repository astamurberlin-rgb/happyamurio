/* Happy Meal · бот записи еды без ИИ — этап 1, черновик для лаборатории.
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
    [/(^|\s)суп\s+лапша(\s|$)/g,'$1суп с лапшой$2'],[/кемал[яьи]/g,'ткемали'],[/(^|\s)сырам(?=\s|$)/g,'$1с сыром'],[/(^|\s)(?:на\s+)?перекус(ила|или|ывал[аи]?|ить|е|а|ом)?(?=[\s,.;!?]|$)/g,'$1перекус'],
    [/(^|\s)(съедобн\S*\s+част\S*)(?=\s|$)/g,' '],[/(^|\s)себе(?=[\s,.;!?]|$)/g,' '],[/(^|\s)(цел(ая|ый|ое|ые|иком|ую))(?=[\s,.;!?]|$)/g,' '],
    [/(^|\s)сто(?=\s)/g,'$1100'],[/(^|\s)двести(?=\s)/g,'$1200'],[/(^|\s)триста(?=\s)/g,'$1300'],[/(^|\s)четыреста(?=\s)/g,'$1400'],[/(^|\s)пятьсот(?=\s)/g,'$1500']];
  /* слова-связки диктовки: к еде не относятся */
  var FILL=/(^|\s)(так|значит|запиши|записывай|запись|щас|сейчас|только что|ну|там|короче|я|мне|мы|пожалуйста|это|вот|отметь|отметить|отмечай|добавь|добавить|еще и|тебе скажу|взвешиваю|было|был|была|были|опять|снова|опять-таки|где-то|где то|примерно|около|приблизительно|м{2,}|э+х|э+м+|о+х|а+х|у+х|хм+|ой|ух|эй|блин|кстати|в общем|короче говоря|была|были)(?=[\s,.;!?]|$)/g;
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

  function boot(){
    if(booted) return; booted=true;
    /* меры, которых не было в разборе: шот (эспрессо), миска и пиала как тарелка, бокал как стакан */
    DEF['шот']=30; UFORMS['шот']=['шот','шота','шотов'];
    var u0=window.unitOf;
    window.unitOf=function(t){ return /^шот(а|ов|ы)?$/.test(t)?'шот':/^(миск|пиал)/.test(t)?'тарелка':/^бокал/.test(t)?'стакан':u0(t) };
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
    if(l.waste) return fmt(l.whole)+' г − несъедобное '+fmt(l.waste)+' г';
    return '';
  }
  function row(l,ok,note){ return '<div class="mlRow'+(ok?'':' warn')+'"><span class="g" aria-hidden="true">'+(ok?CHECKI:WARNI)+'</span><span class="n">'+esc(foodName(l))+
    (note?' <small style="font-weight:500;opacity:.8">'+esc(note)+'</small>':'')+'</span><b>'+esc(amt(l))+'</b></div>' }
  /* «5 перепёлка» → «5 шт · 500 г» */
  function amt(l){ if(l.u&&l.u!=='г'&&l.u!=='мл'&&!DEF[l.u]&&!/^(маленьк|средн|больш)/.test(l.u)&&l.q!==1) return fmt(l.q)+' шт · '+fmt(l.g)+' г'; return amtShort(l) }

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
    return s;
  }
  var MEAT=/(^|\s)(мяс|говя|баран|свин|теля|кур(иц|ин)|цыпл|индей|утк|гус|крол|конин|ягн)/;
  var GENW=/^(торт|суп|салат|каш[аиу]|пирог|пирож|бутерброд|сэндвич|сендвич|пицц|конфет|печень[ея]|морожен|булочк|булк|запеканк|рагу|котлет|десерт|выпечк|сладк)/;
  function lastOf(word){
    var ds=Object.keys(DB.days||{}).sort();
    for(var i=ds.length-1;i>=0;i--){ var it=(DB.days[ds[i]].items)||[]; for(var j=it.length-1;j>=0;j--){ var x=it[j]; if(FOODS[x.fid]&&!x.tap&&headOk(x.fid,[word])) return x } }
    return null;
  }
  var GENERIC=/^(мяс(о|а|ом|е)|рыб(а|у|ы|ой)|овощ(и|ей|ами)|фрукт(ы|ов)|ягод(ы|а)|орех(и|ов|а)|сыр(а|ом)?|колбас(а|ы|у)|каш(а|и|у))$/;
  var PREP=/^(с|со|из|в|во|на|без|для|под|по|к|у)$/;
  var SIZE=/^(маленьк|небольш|средн|больш|крупн|глубок)/;
  function kindOf(w){ var n=norm(w); return /^\d+(,\d+)?$/.test(n)||numOf(n)!==null?'N':unitOf(n)?'U':PREP.test(n)||STOP[n]||SIZE.test(n)?'S':'F' }
  function descr(w){ var n=norm(w); return W_ADJL.test(n)||STF.some(function(p){ return p[1].test(n) }) }
  function splitItems(c){
    var out=[], cur=[], hasN=false, hasF=false, last='', prevW='', ws=c.split(' ');
    ws.forEach(function(w,i){
      var k=kindOf(w), cut=false;
      if(hasN&&hasF&&!PREP.test(norm(prevW))){
        if((k==='N'||k==='U')&&last==='F') cut=true;                 // «три фейхоа | два мандарина», «…грудки | чашка бульона»
        if(k==='F'&&(last==='N'||last==='U')){                       // «груша 160 | хурма 110»
          var tail=true; for(var j=i+1;j<ws.length;j++){ var kj=kindOf(ws[j]); if(kj==='F'){ tail=false; break } if(kj==='N'||kj==='U') break }
          cut=!(descr(w)&&tail);                                     // «горбуша 170 консервированная» — одно целое
        }
      }
      if(cut){ out.push(cur.join(' ')); cur=[]; hasN=hasF=false }
      cur.push(w); if(k==='N') hasN=true; if(k==='F') hasF=true; if(k!=='S') last=k; prevW=w;
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
    s=s.replace(/[\s,.;!]+нет(?:\s*,?\s*(?:неправильно|не так|не то|ошибся|ошиблась|исправь|точнее))*[\s,.;!]+/g,' , ¶ ');
    return s.split(/[,.;:!?\n…]+|\s(?:и|а|потом|плюс|затем)\s/).map(function(c){ return c.replace(/#/g,',').replace(/\s+/g,' ').trim() }).filter(Boolean)
      .map(function(c){ var corr=c.charAt(0)==='¶'; if(corr) c=c.slice(1).trim(); var mn=c.match(/⊖([\d.]+)/); if(mn) c=c.replace(mn[0],' ').replace(/\s+/g,' ').trim();
        var parts=one(c); if(corr&&parts.length) parts[0]='¶'+parts[0]; if(mn&&parts.length) parts[parts.length-1]+=' ⊖'+mn[1]; return parts })
      .reduce(function(a,c){ return a.concat(c) },[]);
  }
  function one(c0){
    return [c0].filter(Boolean).map(function(c){ if(!/\d/.test(c)) return c; var seen={}; return c.split(' ').filter(function(w,i,ws){ if(kindOf(w)!=='F') return true; if(seen[w]&&ws[i-1]!==w) return false; seen[w]=1; return true }).join(' ') })
      .reduce(function(a,c){ return a.concat(splitItems(c)) },[]);
  }
  function prepChunk(c){
    var o={text:c,dup:null,range:null,size:null,corr:c.charAt(0)==='¶'};
    if(o.corr) c=c.slice(1);
    var mn=c.match(/⊖([\d.]+)/); if(mn){ o.minus=+mn[1]; c=c.replace(mn[0],' ') }
    var t=' '+c+' ';
    /* названы граммы или миллилитры — тара рядом лишь описание: «большая чашка 400 мл бульона» */
    if(new RegExp('\\d\\s*'+VOL+'(?=\\s)').test(t)&&new RegExp('\\s'+CUP+'(?=\\s)').test(t))
      t=t.replace(new RegExp('\\s(?:(?:один|одна|одну|больш\\S*|маленьк\\S*)\\s+)?'+CUP+'(?=\\s)','g'),' ');
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
  function histCount(){ var h={}; Object.keys(DB.days||{}).forEach(function(d){ ((DB.days[d]||{}).items||[]).forEach(function(x){ h[x.fid]=(h[x.fid]||0)+1 }) }); return h }

  /* фраза → строки. У каждой строки: ready (можно записать) или ask (о чём спросить) */
  /* «390 г плова, из них 160 г мяса»: блюдо пишется целиком, часть — внутри его веса, не сверху */
  function understand(text){
    var mm=String(text).match(/^(.*?)[\s,]+(?:из них|из которых|из него|из нее|из неё|в том числе|в т\\.?\\s?ч\\.?|включая|внутри)\s+(.*)$/);
    if(!mm) return core(text);
    var tail=mm[2], rest='', sp=tail.match(/^(.*?)[\s,]+(?:и\s+)?(?:еще|потом|затем|плюс|отдельно)\s+(.*)$/);
    if(sp){ tail=sp[1]; rest=sp[2] }
    var head=core(mm[1]), comp=core(tail), more=rest?core(rest):{lines:[]};
    var d=head.lines[head.lines.length-1], c=comp.lines[comp.lines.length-1];
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
    var res=head; res.lines=head.lines.concat(more.lines); res.others=(head.others||[]).concat(comp.others||[],more.others||[]);
    if(more.meal) res.meal=more.meal; if(!res.orphan) res.orphan=more.orphan;
    return res;
  }
  function core(text){
    var res={lines:[],meal:null,orphan:null}, hist=null;
    var cs=chunksOf(text).map(prepChunk), merged=[];
    var carry=null;
    function qtyOf(txt){ return txt.split(' ').filter(function(w){ var k=kindOf(w); return k==='N'||k==='U' }).join(' ') }
    function foodOf(txt){ return txt.split(' ').filter(function(w){ var k=kindOf(w); return k!=='N'&&k!=='U' }).join(' ') }
    cs.forEach(function(c){
      if(/(^|\s)(кошк[еиу]|кот(у|ам|ятам)|собак[еиу]|пс(у|ам)|отдал\S*|угостил\S*|детям|ребенку|жене|мужу|другу|подруге)(\s|$)/.test(' '+c.text+' ')){ (res.others=res.others||[]).push(c.text); return }
      var food=tokensOf(c.text), last=merged[merged.length-1];
      if(c.corr&&last){
        /* «…, нет, …»: поправка последнего названного. Только число — меняется количество; назван продукт — меняется продукт */
        res.corrected=true;
        if(!food.length&&c.hasNum){ last.text=foodOf(last.text)+' '+c.text; last.hasNum=true; last.soft=null; last.range=c.range; return }
        if(food.length){ merged.pop(); if(!c.hasNum&&last.hasNum) c.soft=last.soft||qtyOf(last.text); merged.push(c); return }
        return;
      }
      if(c.corr&&!last){ res.leadNo=true }
      if(last&&last.soft&&!food.length&&c.hasNum){ last.soft=null; last.text+=' '+c.text; last.hasNum=true; return }
      if(!food.length){
        if(!c.hasNum&&!/[а-яa-z]/.test(c.text)) return;
        if(last&&c.hasNum&&!last.hasNum){ last.text+=' '+c.text; last.hasNum=true; last.range=last.range||c.range; return }   // «борщ, две тарелки»
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
    var curMeal=null, tailMeal=null;
    merged.forEach(function(c){
      if(c.soft){ c.text=c.soft+' '+c.text; c.soft=null }
      var minus=c.minus||0;
      if(c.dup) res.dupSeen=true;
      var r=parseText(c.text); if(r.meal){ res.meal=curMeal=r.meal; tailMeal=(c.mealOnly&&!r.lines.length)?r.meal:null }
      if(r.lines.length) tailMeal=null;
      r.lines.forEach(function(l){
        l.meal=curMeal;
        var f=FOODS[l.fid||l.alts[0]];
        if(c.size&&f&&f.por&&f.por[c.size]&&(l.u==='шт'||!l.explicit||l.u===defUnit(f))){ l.u=c.size; if(!l.explicit){ l.q=1 } l.explicit=true; l.g=gramsFor(l.fid||l.alts[0],l.q,l.u) }
        l.ask=null; l.spoken=l.spoken||l.name;
        if(minus){ l.whole=l.g; l.waste=minus; if(minus>=l.g){ l.ask='waste' } else { l.q=Math.round((l.g-minus)*10)/10; l.u='г'; l.g=l.q; l.explicit=true } minus=0 }
        var fw=String(l.name||'').split(' ').filter(Boolean);
        /* общее слово («торт», «суп», «салат»): был такой раньше — тот же и той же порцией; не было — спросить, какой */
        if(fw.length===1&&GENW.test(fw[0])&&(l.fid||l.alts.length)){
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
        if(l.st==='pick'&&l.alts.length&&!l.alts.some(function(a){ return related(a,fw) })){ l.st='none'; l.alts=[] }   // предложенное не похоже ни на одно слово
        if(l.st==='pick'&&l.alts.length){
          hist=hist||histCount();
          var used=l.alts.filter(function(a){ return hist[a] });
          if(used.length===1){ l.fid=used[0]; l.st='ok'; l.g=gramsFor(l.fid,l.q,l.u); l.asBefore=true }
          else {
            /* среди предложенных ровно один «чистый»: все слова названы, слово — само название, лишнего способа нет
               («розмарин» → свежий, а не сушёный; «белого хлеба» → «Хлеб белый пшеничный», а не гренки) */
            var cl=l.alts.filter(function(a){ return clean(a,fw) });
            if(cl.length===1){ l.fid=cl[0]; l.st='ok'; l.g=gramsFor(l.fid,l.q,l.u) }
          }
        }
        if(l.st!=='none'&&l.explicit&&l.u==='г'&&l.q<=10&&c.noUnit&&!(c.range&&c.range[0]!==c.range[1])){ l.count=l.q; l.explicit=false; if(!byPiece(l)){ l.ask='qty'; if(!l.fid&&l.alts.length) l.fid=l.alts[0], l.st='ok' } }
        else if(l.st==='none') l.ask='name';
        else if(l.st==='pick') l.ask='pick';
        else if(c.range&&c.range[0]!==c.range[1]) l.ask='range', l.range=c.range;
        else if(c.dup&&!l.explicit) l.ask='dup';
   // «пять перепелок» — штуки без веса штуки
        else if(!l.explicit){
          if(isDrink(l.fid)){ var ff=FOODS[l.fid]; if(!Object.keys(ff.por||{}).length){ l.q=1; l.u=/эспрессо|ристретто/i.test(ff.n)?'шот':'чашка'; l.g=gramsFor(l.fid,l.q,l.u) } }
          else l.ask='qty';
        }
        res.lines.push(l);
      });
    });
    res.tailMeal=tailMeal;
    return res;
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
      var nt=noteOf(l); if(nt) x.note=nt;
      day(en.date).items.push(x); add.push({date:en.date,item:x,line:l,en:en});
    });
    save();
    try{ if(typeof renderAll==='function') renderAll() }catch(e){}
    var c={id:'c'+(++S.seq),add:add,undone:false}; S.commits.push(c);
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
        return row(a.line,true,[noteOf(a.line),same.length>1?'всего '+fmt(tot)+' г':'',a.line.sameAs?'как в прошлый раз':a.line.asBefore?'как раньше':''].filter(Boolean).join(' · ')) }).join('')+'</div>';
    });
    var s=sumOf(c.add.map(function(a){ return a.item }));
    h+='<p class="mbSum">'+Math.round(s.k)+' ккал · Б '+fmt(s.p)+' · Ж '+fmt(s.f)+' · У '+fmt(s.c)+'</p>';
    var sw=[]; c.add.forEach(function(a,i){ if(a.line.picked) a.line.alts.slice(1,3).forEach(function(x,k){ if(FOODS[x]) sw.push(['swap:'+c.id+':'+i+':'+(k+1),FOODS[x].n]) }) });
    if(sw.length) h+='<p class="mlHint">Взял самое близкое. Другое — нажми или скажи: «нет, второй», «нет, '+esc(String(FOODS[c.add.filter(function(a){ return a.line.picked })[0].line.alts[1]].n).toLowerCase().split(/[,(—]/)[0].trim())+'».</p>';
    return h+chips(sw.concat([['undo:'+c.id,'Отменить']]));
  }

  /* ── вопросы: по одному ── */
  function askHTML(S){
    var q=S.pend[0]; S.ask=null; if(!q||q.line.ask==='photo') return '';
    var l=q.line, id='q'+(++S.seq), nm=cap(l.name||''); S.ask={id:id,kind:l.ask,q:q};
    if(l.ask==='what') return p('«'+esc(l.raw)+'» — чего? Назови продукт.');
    if(l.ask==='name'){ missLog('нет в базе',nm,l.raw); return p('В базе нет «'+esc(nm)+'» — добавил в список недостающего.')+'<p class="mlHint">Если это другое название — скажи его. Или «пропусти».</p>'+chips([['skip:'+id,'Пропустить']]) }
    if(l.ask==='pick') return p(esc(nm)+' — что именно?')+chips(l.alts.slice(0,3).map(function(a,i){ return ['pick:'+id+':'+i,FOODS[a]?FOODS[a].n:a] }).concat([['sheet:'+id,'Другое']]));
    if(l.ask==='range') return p(esc(foodName(l))+' — сколько граммов?')+chips([['num:'+id+':'+l.range[1],l.range[1]+' г'],['num:'+id+':'+l.range[0],l.range[0]+' г']]);
    if(l.ask==='dup') return p(esc(nm||foodName(l))+' — один или два?')+chips([['cnt:'+id+':1','Один'],['cnt:'+id+':2','Два']]);
    if(l.ask==='again') return p('Такое же сообщение я только что записал. Это ещё одна порция?')+chips([['again:'+id+':1','Да, ещё одна'],['again:'+id+':0','Нет, повтор']]);
    var f=FOODS[l.fid], u=f?defUnit(f):'г', one={q:1,u:u,fid:l.fid}; one.g=gramsFor(l.fid,1,u);
    var opts=u==='г'?[['num:'+id+':100','100 г']]:[['unit:'+id,'1 '+uLab(l.fid,1,u)+' · ≈ '+fmt(one.g)+' г']];
    if(l.ask==='waste') return p(esc(foodName(l))+': несъедобное '+fmt(l.waste)+' г больше или равно целому '+fmt(l.whole)+' г. Проверь числа — сколько было целиком?');
    if(l.ask==='inc') return p(esc(foodName(l))+': часть '+fmt(l.inc.g)+' г больше всего блюда '+fmt(l.g)+' г. Сколько весило блюдо целиком?');
    if(l.count) missLog('нет веса штуки',foodName(l),l.raw);
    if(l.count) return p(esc(foodName(l))+' — '+l.count+' шт. Сколько весит одна штука?')+'<p class="mlHint">Запомню, и в следующий раз запишу сразу. Можно сказать и общий вес: «всего 500 г».</p>';
    return p('Сколько: '+esc(foodName(l))+'?')+chips(opts);
  }
  /* «пять перепелок»: если у похожего продукта есть вес штуки — пишем штуками сразу, остальное кнопками */
  function pieceUnit(fid){ var por=(FOODS[fid]||{}).por||{}; return Object.keys(por).filter(function(k){ return por[k]>0&&!/^(г|мл|порция|ломтик|кусок)$/.test(k) })[0]||null }
  function byPiece(l){
    var ids=[l.fid].concat(l.alts||[]);
    var nm0=String(l.spoken||l.name||'').trim(), nw=nm0.split(' ').filter(Boolean);
    if(nm0) [nm0, nm0+' целиком'].forEach(function(q){ var r=parseText(q).lines[0]; if(r) ids=ids.concat([r.fid].concat(r.alts||[])) });
    ids=ids.filter(function(x,i,a){ return x&&FOODS[x]&&a.indexOf(x)===i });
    /* Meal 33.7: у справочников (USDA, MEXT, KFCT) теперь русские названия — штука из основной базы и своих продуктов впереди */
    var hits=ids.filter(function(x){ return pieceUnit(x)&&(!nw.length||related(x,nw)) });
    var hit=hits.filter(function(x){ return !/USDA|MEXT|KFCT/.test(String(FOODS[x].src||'')) })[0]||hits[0]; if(!hit) return false;
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
  function secFor(date,t){
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
    if(a.kind==='again'){ if(/^(да|ещ|еще|ага|угу)/.test(t)) return tapDo(S,'again',a.id,'1'); if(/^(нет|не|повтор)/.test(t)) return tapDo(S,'again',a.id,'0'); return null }
    if(a.kind==='pick'){ var tt0=t.replace(/^(да|ну|давай|пусть|будет)\s+/,'').replace(/[,.!]+$/,''); if(ORD[tt0]!=null&&l.alts[ORD[tt0]]) return tapDo(S,'pick',a.id,String(ORD[tt0]));
      var ws0=tokensOf(tt0), hitA=ws0.length?l.alts.slice(0,3).map(function(x,i){ return i }).filter(function(i){ return ws0.every(function(q){ return /^\d/.test(q)?words(l.alts[i]).indexOf(q)>=0:words(l.alts[i]).some(function(wd){ return sim(q,wd)>=1.8||adjStem(q)&&adjStem(q)===adjStem(wd) }) }) }):[];
      if(hitA.length===1&&!/\d\s*(г|гр|мл)/.test(tt0)) return tapDo(S,'pick',a.id,String(hitA[0]));
      /* «Торт — какой?» → «Захер»: ищем «торт захер» целиком */
      if(ws0.length&&!/\d/.test(tt0)){
        var sp0=String(l.spoken||l.name||'').trim(), cb=understand(fixes(' '+sp0+' '+tt0+' ')).lines[0], cf=cb&&(cb.fid||cb.alts[0]);
        if(cf&&covers(cf,ws0)&&related(cf,sp0.split(' ').filter(Boolean))){
          l.fid=cf; l.alts=[cf].concat((cb.alts||[]).filter(function(x){ return x!==cf })); l.st='ok'; l.noAuto=false; l.g=gramsFor(cf,l.q,l.u);
          if(!l.explicit&&!isDrink(cf)){ l.ask='qty'; return askHTML(S) } return finish(S,resolved(S));
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
        var f1=FOODS[l.fid]; DB.units=DB.units||{}; DB.units[f1.id]=DB.units[f1.id]||{}; DB.units[f1.id]['шт']=Math.round(gv*10)/10;
        if(String(f1.id).indexOf('bls:')===0) blsUse(f1.id);
        try{ rebuildLib() }catch(e){}
        l.q=l.count; l.u='шт'; l.g=gramsFor(l.fid,l.q,'шт'); l.explicit=true;
        return finish(S,resolved(S),p('Запомнил: 1 шт «'+esc(f1.n)+'» = '+fmt(gv)+' г. Поменять или убрать — в мерах продукта, когда уточняешь запись в списке.'));
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
      if(!l.explicit&&!isDrink(l.fid)){ l.ask='qty'; return askHTML(S) }
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
    if(kind==='pick'){ var fid=l.alts[+arg]; if(!fid) return null; l.fid=fid; l.st='ok'; l.g=gramsFor(fid,l.q,l.u);
      if(!l.explicit&&!isDrink(fid)){ l.ask='qty'; return askHTML(S) } return finish(S,resolved(S)) }
    if(kind==='num'){ setGrams(l,+arg); return finish(S,resolved(S)) }
    if(kind==='unit'){ var f=FOODS[l.fid]; l.q=1; l.u=defUnit(f); l.g=gramsFor(l.fid,1,l.u); l.explicit=true; return finish(S,resolved(S)) }
    if(kind==='cnt'){ var f2=FOODS[l.fid], u2=l.u||defUnit(f2); l.q=+arg; l.u=u2; l.g=gramsFor(l.fid,l.q,u2); l.explicit=true; return finish(S,resolved(S)) }
    if(kind==='again'){ var mine=S.pend.filter(function(x){ return x.line.ask==='again' }); S.pend=S.pend.filter(function(x){ return x.line.ask!=='again' }); S.ask=null;
      if(arg==='0') return p('Хорошо, повтор не записываю.')+askHTML(S);
      mine.forEach(function(x){ x.line.ask=null }); var c=commit(S,mine); return c===false?p('Чтобы записывать, войди в аккаунт.'):commitHTML(c)+askHTML(S) }
    return null;
  }

  /* ── вопросы о записанном ── */
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
    var S=state(chat), h=handle(chat,S,m);
    syncLines(chat);
    return h;
  }
  function handle(chat,S,m){
    var raw=m.kind==='photo'?m.det:m.text, t=nrm(raw), now=new Date(), bare=t.trim().replace(/[?!.,…\s]+$/,'');
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
    if(rw&&!/\sна\s/.test(' '+rw[1]+' ')&&tokensOf(rw[1].replace(FILL,' ')).length){
      var lc=S.commits.filter(function(c){ return !c.undone&&c.add.length }).pop(); if(lc) undo(S,lc);
      return (lc?p('Прежнюю запись убрал.'):'')+handle(chat,S,{kind:'text',text:rw[1]});
    }
    var MV=/(^|\s)(перенеси|перемести|переставь|перекинь|оставь|не трогай)(\s|$)|(^|\s)был[аои]?\s+(на|в|к)\s|(^|\s)(это|эти|то)\s+(на|в)\s/;
    if(m.kind!=='photo'&&MV.test(' '+bare+' ')){ var mvh=moveCmd(chat,S,raw); if(mvh!=null) return mvh }
    if(/^(отмена|отмени|отменить|верни|не записывай|не надо|стоп)(\s|$)/.test(bare)){
      if(S.pend.length){ S.pend=[]; S.ask=null; return p('Хорошо, не записываю.') }
      var lastC=S.commits.filter(function(c){ return !c.undone }).pop();
      if(!lastC) return p('Отменять нечего: в этом диалоге я ещё ничего не записал.');
      return undo(S,lastC)?p('Отменил последнюю запись: '+esc(lastC.add.filter(function(a){ return !a.hide }).map(function(a){ return foodName(a.line) }).join(', ')||'удаление')+'.'):p('Не получилось отменить.');
    }
    if(!/\d/.test(bare)&&/(подожди|погоди|секунд|минутк|сейчас взвешу|взвешиваю|взвешу)/.test(bare)&&tokensOf(bare.replace(/подожди|погоди|секунд\S*|минутк\S*|взвеш\S*/g,' ').replace(FILL,' ')).length===0)
      return p('Жду. Ничего не записываю, пока не скажешь.');
    if(/сколько\s+(я\s+)?(уже\s+|сегодня\s+|всего\s+)*(калори|ккал|набрал|съел)/.test(bare)||/(калори\S*|ккал)\s+(я\s+)?(уже\s+)?(набрал|съел|за сегодня|сегодня)/.test(bare)) return todayTotals();
    if(/что\s+(я\s+)?(уже\s+|сегодня\s+)*(записал|записано|съел|ел)(\s|$)/.test(bare)||/^(покажи|что)\s+(записи|день|записано|за сегодня)/.test(bare)) return todayList();
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
    var tt=takeTimes(t,now), work=fixes(tt.text);
    var why=DEFER.filter(function(d){ return d[0].test(work) })[0];
    if(why) return deferred(why[1]);
    if(/\?\s*$/.test(String(raw).trim())||/^(сколько|почему|зачем|как|какой|какая|какие|чего|можно ли|посоветуй|что лучше)(\s|$)/.test(bare)) return deferred('вопрос о питании');
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
      var u=understand(c.text.replace(FILL,' '));
      if(u.orphan) orphan=u.orphan;
      if(u.others) others=others.concat(u.others);
      var shift=(c.hit?c.hit.shift:0)+(c.dayShift||0), date=curDate;
      if(shift){ var d=new Date(curDate+'T12:00:00'); d.setDate(d.getDate()+shift); date=isoOf(d) }
      /* «в 10» + «на обед» — 10 утра; «в 7» + «на ужин» — 19:00: час без «утра/вечера» читаем по названному приёму */
      if(c.hit&&c.hit.amb){ var mk=(u.lines.filter(function(l){ return l.meal })[0]||{}).meal||u.tailMeal, hr=byMeal(c.hit.amb,mk); if(hr!=null) c.hit.t=pad2(hr)+':00' }
      var time=c.hit?c.hit.t:(today&&!shift?hm(now):null);
      if(u.tailMeal) u.lines.forEach(function(l){ if(!l.meal) l.meal=u.tailMeal });
      u.lines.forEach(function(l){
        var sk=l.meal||(time?secFor(date,time):autoSec());
        /* «на завтрак…», сказанное вечером без времени: время «сейчас» завтраку не ставим — иначе завтрак «начнётся» вечером */
        var lt=time;
        if(l.meal&&!c.hit&&(!time||secFor(date,time)!==l.meal)){ var mt0=time?movedTime(date,l.meal,time,null):{t:mealTime(date,l.meal,null),set:true}; lt=mt0.t; if(mt0.set&&lt) guessed=lt }
        var en={line:l,date:date,t:lt,tm:!!c.hit,approx:!!(c.hit&&c.hit.approx),sec:sk};
        l.t=lt; l.tm=c.hit?1:0; l.sec=sk;
        var tc=m.kind!=='photo'&&l.ask!=='range'&&l.ask!=='waste'&&l.ask!=='inc'&&!l.inc&&!l.split&&!l.fromDish&&!l.waste?tapFor(l):null;
        if(tc&&tc.n){ en.tap=tc; l.fid=tc.c.fid; l.st='ok'; l.q=tc.n*tc.c.q; l.u=tc.c.u; l.g=Math.round(tc.n*tc.g*10)/10; l.explicit=true; l.ask=null; l.picked=false; l.count=null }
        else if(tc&&l.fid===tc.c.fid) l.tapMiss=tc.c;
        if(m.kind!=='photo'&&l.ask==='pick'&&!l.noAuto&&l.alts.some(function(x){ return covers(x,String(l.name||'').split(' ').filter(Boolean)) })){
          l.fid=l.alts[0]; l.st='ok'; l.g=gramsFor(l.fid,l.q,l.u); l.picked=true; l.ask=(!l.explicit&&!isDrink(l.fid))?'qty':null;
        }
        if(m.kind==='photo'){ l.ask=l.ask||'photo'; asks.push(en) }
        else if(!l.ask) ready.push(en);
        else if(l.ask==='name'&&!l.explicit) miss.push(l);
        else asks.push(en);
      });
    });
    if(orphan&&!ready.length&&!asks.length&&!miss.length){
      var ol={id:'l'+(++SEQ),raw:orphan,q:null,u:null,fid:null,alts:[],st:'none',name:'',explicit:false,ask:'what'};
      asks.push({line:ol,date:curDate,t:today?hm(now):null,tm:false,approx:false,sec:autoSec()});
    }
    if(m.kind==='photo'){
      if(!asks.length) return p('Не узнал еду на фото. Скажи или напиши, что это.');
      S.pend=S.pend.concat(asks);
      return p('На фото, похоже:')+'<div class="mlRows">'+asks.map(function(en){ return row(en.line,en.line.st==='ok') }).join('')+'</div><p class="mlHint">Вес на глаз — проверь в списке и сохрани.</p>';
    }
    var othH=others.length?'<p class="mlHint">Не записал чужую порцию: «'+esc(others.join('», «'))+'».</p>':'';
    if(!ready.length&&!asks.length&&othH) return othH;
    if(!ready.length&&!asks.length){
      if(miss.length){ miss.forEach(function(l){ missLog('нет в базе',l.name,l.raw) }); return p('В базе нет: «'+esc(miss.map(function(l){ return l.name }).join(', '))+'». Ничего не записал, добавил в список недостающего.') }
      return p('Не нашёл здесь еды. Ничего не записал.');
    }
    /* то же сообщение второй раз подряд за две минуты — возможно, повтор, а не вторая порция */
    var key=bare, h='';
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
    var x=ad.item, l=ad.line; x.fid=fid; l.fid=fid; if(!(FOODS[fid].por||{})[x.u]&&x.u!=='г'&&!DEF[x.u]){ x.u='г'; x.q=x.g }
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
    if(nt&&!mk) c.add.forEach(function(a){ if(a.item.sec==='__'){ var k=secFor(a.date,nt); a.item.sec=k; a.en.sec=k } });
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
      if(mi.mk){ if(!nt){ var mt=movedTime(cd(),mi.mk,x.t,[x]); if(mt.set){ x.t=mt.t; delete x.tm; g1=mt.t } } x.sec=mi.mk } else { var keep=x.sec; x.sec='__'; x.sec=secFor(cd(),nt)||keep }
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
      x.q=w.q; x.u=w.u; x.g=gramsFor(x.fid,x.q,x.u); l.q=x.q; l.u=x.u; l.g=x.g; touch();
      return p('Поправил:')+'<div class="mlRows">'+row(l,true)+'</div>';
    }
    if(u.lines.length===1){
      var n=u.lines[0], fid=n.fid||n.alts[0];
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

  /* нажатие кнопки в ответе */
  function tap(action,label){
    var chat=CH.meal; if(D!==chat) return;
    var S=state(chat), a=action.split(':'), h=null;
    if(a[0]==='undo'){ var c=S.commits.filter(function(x){ return x.id===a[1] })[0]; if(!c||c.undone) return;
      h=undo(S,c)?p(c.del?'Вернул запись.':'Отменил. Этих записей в дневнике больше нет.'):null }
    else if(a[0]==='swap'){ var c2=S.commits.filter(function(x){ return x.id===a[1] })[0], ad=c2&&!c2.undone&&c2.add[+a[2]]; if(!ad) return;
      h=swapTo(S,ad,ad.line.alts[+a[3]]) }
    else if(a[0]==='sheet'){ openSheet(chat); return }
    else if(a[0]==='misscopy'){ var mt=missText(); try{ navigator.clipboard.writeText(mt).then(function(){ toast('Список скопирован') },function(){ toast('Не скопировалось — выдели текст вручную') }) }catch(e){ toast('Не скопировалось — выдели текст вручную') } return }
    else if(a[0]==='missclear'){ try{ localStorage.removeItem(MISSK) }catch(e){} h=p('Список очистил.') }
    else h=tapDo(S,a[0],a[1],a[2]);
    if(h==null) return;
    syncLines(chat);
    chat.msgs.push({id:'m'+(++chat.seq),who:'me',kind:'text',text:label,tapped:1});
    botSay(h,260);
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
  function covers(id,food){ var ws=words(id); return food.every(function(q){ return ws.some(function(w){ return sim(q,w)>=1.8||adjStem(q)&&adjStem(q)===adjStem(w) }) }) }
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
    return /MEXT|USDA/.test(src);                           // большие справочники — после основной базы
  }
  /* среди точных совпадений сначала те, где слово — само название и нет лишнего способа приготовления */
  function rank(list,food){
    return list.map(function(x,i){ return {x:x,i:i,p:(headOk(x.id,food)?0:2)+(extraState(x.id,food)?1:0)+(/^(BLS|Мои)$/.test(String((FOODS[x.id]||{}).src||''))?0:1.5)+(/\s(с|со)\s/.test(' '+String((FOODS[x.id]||{}).n||'').toLowerCase()+' ')&&food.length<2?0.75:0)} })
      .sort(function(a,b){ return a.p-b.p||a.i-b.i }).map(function(o){ return o.x });
  }
  /* включение: проба на этом устройстве (раздел «Для разработчика»). Выключен — Meal работает как без бота */
  var ONK='happy-meal-bot';
  function on(){ try{ return localStorage.getItem(ONK)==='1' }catch(e){ return false } }
  function setOn(v){ try{ if(v) localStorage.setItem(ONK,'1'); else localStorage.removeItem(ONK) }catch(e){} }
  function wire(){
    var sw=document.getElementById('mealBotSwitch'); if(!sw) return;
    sw.checked=on();
    sw.addEventListener('change',function(){ setOn(sw.checked); if(typeof CH!=='undefined'&&typeof newChat==='function'){ var sq=CH.meal.seq; CH.meal=newChat('meal'); CH.meal.seq=sq; if(typeof D!=='undefined'&&D&&D.kind==='meal') D=CH.meal }
      if(typeof toast==='function') toast(sw.checked?'Бот записи еды включён':'Бот записи еды выключен') });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire); else wire();
  return {on:on,setOn:setOn,reply:reply,tap:tap,openSheet:openSheet,loose:loose,headOk:headOk,rank:rank,understand:understand,takeTimes:takeTimes,state:state};
})();
