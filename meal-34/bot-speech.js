/* Happy Meal 33.9 · бытовая речь для бота записи еды.
   Слова и веса лежат в одном файле-словаре bot/household-ru.js (HappyMealSpeechData); здесь — только то, как их применять.
   prepare(фраза) приводит живую речь к виду, который понимает разбор Meal: числа словами, диапазоны, «полбанана»,
   названный объём посуды, доля упаковки, поправки «вернее…», слова-пустышки, уменьшительные и другие названия.
   Пометки внутри текста (их читает bot.js): ≈ — примерно; ⊕ ⊘ — множитель меры (с горкой, неполный);
   ▽ ◇ △ — количество без числа (мало, обычная мера, много).
   Решения Астамура 17.11.2026: не спрашивать без крайней необходимости; своя мера человека — первой. — Claude · 17.11.2026 */
var MealSpeech=(function(){
  var D=window.HappyMealSpeechData||null, active=false;
  var U2={}, MW=[], ALIASES=[], PROT=[], FM=[], COMP=[], UM=[], CARD={}, CARDRE=null, SPLIT=null, EATRE=null, DROP=null, APPROX=null, CORR=null, CORRM=null, CORRN=null, CHOICE=null, FACT=[], VAGUE=[];
  var CNT=null, MARK={0.5:'▽',1:'◇',1.5:'△'}, FMARK={1.5:'⊕',0.8:'⊘'};
  var B0='(^|[\\s,.;:!?(])', B1='(?=[\\s,.;:!?)]|$)';
  /* после «с»: «2 ложками мёда 200 г», «двумя столовыми ложками сметаны, всего 300 г» — ложки добавки и вес всего блюда в конце */
  var SPOONTOT=/^\d+(?:,\d+)?\s+(?:(?:(?:чайн|столов|десертн|больш)[а-я]*\s+)?(?:ложк|ложечк)[а-я]*|(?:ст|ч)\.?\s?л\.?|десложк[а-я]*)\s+(?:(?!(?:и|а)\s)[а-я-]+\s+){0,2}[а-я-]+\s*,?\s+(?:(?:это\s+)?(?:всего|итого|в сумме|общий вес|на вс[её])\s+)?\d+(?:,\d+)?\s*(?:г|гр|грам+[а-я]*)(?=\s*$|\s*[,.;!?]|\s+(?:и|а|потом|плюс|затем)\s)/;
  function nz(s){ return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/́/g,'') }
  function rx(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') }
  function alt(forms){ return forms.map(nz).filter(Boolean).sort(function(a,b){ return b.length-a.length }).map(function(x){ return rx(x).replace(/[\s-]+/g,'[\\s-]+') }).join('|') }
  function phrase(forms){ return new RegExp(B0+'(?:'+alt(forms)+')'+B1,'g') }
  function num(s){ return parseFloat(String(s).replace(',','.')) }
  function out(n){ return String(Math.round(n*100)/100).replace('.',',') }

  function build(){
    if(!D) return;
    (D.measures||[]).forEach(function(m){
      if(!m.unit) return;
      var singles=m.forms.map(nz).filter(function(f){ return !/[\s.]/.test(f) });
      singles.forEach(function(f){ if(!m.only_for) U2[f]=m.unit });
      if(m.token) U2[m.token]=m.unit;
      var multi=m.forms.map(nz).filter(function(f){ return /\s/.test(f)&&f.indexOf('.')<0 });
      if(multi.length) MW.push({re:phrase(multi),to:m.token||singles[0]||m.unit});
      if(m.only_for) MW.push({re:new RegExp(B0+'(?:'+alt(m.forms)+')(\\s+(?:'+String(m.only_for).replace(/^\^/,'')+'))','g'),to:m.unit==='чашка'?'чашка':m.unit,keep:2});
    });
    (D.diminutives_and_food_aliases||[]).forEach(function(e){
      if(e.bot!=='alias'||!e.search_as) return;
      var to=nz(e.search_as), kf=(e.keep_forms||[]).map(nz), forms=e.forms.map(nz).filter(function(f){ return f!==to&&kf.indexOf(f)<0 });
      if(forms.length) ALIASES.push({re:phrase(forms),to:to,len:Math.max.apply(null,forms.map(function(f){ return f.length })),sk:e.skip_if?new RegExp(e.skip_if):null});
    });
    ALIASES.sort(function(a,b){ return b.len-a.len });
    PROT=(D.protected_phrases||[]).map(nz);
    /* мера по кухне: у японского продукта (база MEXT) — японская порция, у корейского (KFCT) — корейская; такие правила идут первыми */
    FM=(D.food_measures||[]).map(function(r){ return {re:new RegExp(r.match),unit:r.unit,g:r.g,src:r.src?new RegExp(r.src):null} })
      .sort(function(a,b){ return (b.src?1:0)-(a.src?1:0) });
    COMP=(D.composite_dishes||[]).map(function(c){ return {said:c.said,dish:new RegExp(c.dish_in_base),parts:c.parts,offer:c.mode==='offer',name:c.name_ru||''} });
    UM=(D.usual_measures||[]).map(function(r){ return {re:new RegExp(r.match),unit:r.unit} });
    var N=D.numbers||{};
    Object.keys(N.cardinals||{}).forEach(function(k){ CARD[nz(k)]=N.cardinals[k] });
    Object.keys(N.scales||{}).forEach(function(k){ CARD[nz(k)]=N.scales[k] });
    Object.keys(N.colloquial_candidates||{}).forEach(function(k){ CARD[nz(k)]=N.colloquial_candidates[k] });
    var cw=alt(Object.keys(CARD));
    if(N.count_words&&N.count_words.length) CNT=new RegExp('(^|\\s)(\\d+)\\s+(?=(?:'+N.count_words.join('|')+')(?=[\\s,.;!?]|$))','g');
    CARDRE=new RegExp('(^|[\\s,.;:!?(–-])((?:'+cw+')(?:[\\s-]+(?:'+cw+'))*)(?=[\\s,.;:!?)–-]|$)','g');
    var drop=[], corr=[], corrM=[], corrN=[], approx=[], split=[], choice=[];
    (D.fillers_and_operators||[]).forEach(function(e){ if(e.bot==='drop') drop=drop.concat(e.forms); if(e.bot==='correction') corr=corr.concat(e.forms); if(e.bot==='correction_mid') corrM=corrM.concat(e.forms); if(e.bot==='correction_number') corrN=corrN.concat(e.forms); if(e.bot==='split') split=split.concat(e.forms); if(e.bot==='choice') choice=choice.concat(e.forms) });
    CHOICE=choice.length?phrase(choice):null;
    SPLIT=split.length?phrase(split):null;
    (D.approximation||[]).forEach(function(e){
      if(e.bot==='approx') approx=approx.concat(e.forms);
      if(e.bot==='drop') drop=drop.concat(e.forms);
      if(e.bot==='factor') FACT.push({re:phrase(e.forms),mark:FMARK[e.factor]||''});
    });
    (D.part_qualifiers||[]).forEach(function(e){ if(e.bot==='drop') drop=drop.concat(e.forms) });
    (D.qualitative_amounts||[]).forEach(function(e){ if(e.bot==='vague') VAGUE.push({forms:e.forms,mark:MARK[e.factor]||'◇'}) });
    EATRE=D.eaten_context&&D.eaten_context.verbs?phrase(D.eaten_context.verbs.filter(function(v){ return (D.eaten_context.meal_verbs||[]).indexOf(v)<0 })):null;   // «перекусил», «пообедал» остаются словами: по ним узнаётся приём пищи
    DROP=phrase(drop); CORR=phrase(corr); CORRM=corrM.length?phrase(corrM):null; CORRN=corrN.length?new RegExp(B0+'(?:'+alt(corrN)+')\\s+(?=\\d)','g'):null; APPROX=phrase(approx.filter(function(f){ return nz(f)!=='типа' }));
    /* меры Meal: общий вес и подписи — из словаря */
    if(typeof DEF!=='undefined') (D.measures||[]).forEach(function(m){ if(m.unit&&m.general!=null&&m.unit!=='шт') DEF[m.unit]=m.general });
    if(typeof UFORMS!=='undefined') Object.keys(D.unit_forms||{}).forEach(function(u){ if(!UFORMS[u]) UFORMS[u]=D.unit_forms[u] });
    if(typeof window.unitOf==='function'){ var u0=window.unitOf; window.unitOf=function(t){ if(active&&U2[t]) return U2[t]; return u0(t) } }
  }

  /* блюдо из словаря, которого нет в базе («творог с изюмом»): части и граммы для предложения «записать по отдельности» */
  function composite(text){
    if(!D) return null;
    var s=' '+String(text)+' ', res=null;
    COMP.forEach(function(c){
      if(!c.offer||res) return;
      var m=new RegExp('\\s(?:(\\d+(?:,\\d+)?)\\s+)?(?:'+c.said+')(?:\\s+(\\d+(?:,\\d+)?)\\s*(?:г|гр|грам+[а-я]*))?\\s$').exec(s); if(!m||hasDish(c.dish)) return;
      var tot=c.parts.reduce(function(t,x){ return t+x.g },0), k=m[2]?num(m[2])/tot:(m[1]?num(m[1]):1);
      /* названный вес всего блюда («творог с изюмом 300 г»): добавка — своими граммами, основа — остаток (решение Астамура 22.11.2026);
         добавка больше четверти названного («гречка с грибами, всего 200 г») — в той же пропорции, как раньше */
      var add=c.parts.slice(1).reduce(function(t,x){ return t+x.g },0), W=m[2]?num(m[2]):0;
      if(W&&add<=W/4){ res={name:c.name,parts:c.parts.map(function(x,i){ return {w:x.search,g:i?x.g:Math.round(W-add)} })}; return }
      res={name:c.name,parts:c.parts.map(function(x){ return {w:x.search,g:Math.round(x.g*k)} })};
    });
    return res;
  }
  /* слово, под которым в базе лежит другое («пельмени» — вареники с картошкой): пока настоящего продукта нет, бот говорит «в базе нет» */
  function missing(word){
    var w=nz(word); return ((D&&D.known_missing)||[]).some(function(e){ return new RegExp(e.said).test(w)&&!hasDish(new RegExp(e.unless_in_base)) });
  }
  /* напитка нет в базе («компот из фейхоа», «узвар»): похожие того же вида — поисковые слова из словаря (missing_similar, решение Астамура 24.11.2026) */
  function similarKind(word){
    var w=nz(word), e=((D&&D.missing_similar)||[]).filter(function(x){ return new RegExp(x.said).test(w) })[0];
    return e?{options:e.options.slice(),kind:new RegExp(e.same_kind||'.')}:null;
  }
  /* Meal 33.12 · слово человека → точное название продукта в базе (product_pins): «квашеная капуста» — капуста, а не её сок.
     tokens — слова еды из куска фразы; text — весь кусок; unit — мера строки; vague — количество без числа. Сам продукт по названию находит бот (bot.js, pinFid) */
  function pin(tokens,text,unit,vague,bare){
    var P=(D&&D.product_pins)||[], T=(tokens||[]).map(nz), full=' '+nz(text)+' ', hit=null;
    if(!T.length) return null;
    P.some(function(e){
      var all=(e.all||[]).map(function(x){ return new RegExp(x) }), opt=(e.opt||[]).map(function(x){ return new RegExp(x) });
      if(e.not&&new RegExp(e.not).test(full)) return false;
      if(!all.every(function(re){ return T.some(function(t){ return re.test(t) }) })) return false;
      if(!T.every(function(t){ return all.concat(opt).some(function(re){ return re.test(t) }) })) return false;
      if(e.unit&&!(new RegExp(e.unit).test(String(unit||''))||(e.vague&&vague))) return false;
      if(e.bare&&!bare) return false;
      hit={name:e.name,rule:e.id}; return true });
    return hit;
  }
  /* сказано «съел», «поел» — и не сказано «взвесил», «сырой»: речь о готовой еде */
  function eaten(raw){
    var E=(D&&D.eaten_context)||null; if(!E) return false;
    var t=' '+nz(raw).replace(/[^a-zа-я0-9]+/g,' ')+' ';
    function has(list){ return (list||[]).some(function(w){ return t.indexOf(' '+nz(w)+' ')>=0 }) }
    return has(E.verbs)&&!has(E.raw_words);
  }
  function weighed(raw){
    var E=(D&&D.eaten_context)||null; if(!E) return false;
    var t=' '+nz(raw).replace(/[^a-zа-я0-9]+/g,' ')+' ';
    return (E.weigh_words||[]).some(function(w){ return t.indexOf(' '+nz(w)+' ')>=0 });
  }
  function cooked(f){
    var E=(D&&D.eaten_context)||null; if(!E||!f) return null;
    var n=nz(f.n), hit=(E.cooked_for||[]).filter(function(x){ return new RegExp(x.raw).test(n) })[0];
    return !hit?null:hit.search?{search:hit.search,sameKind:false}:{search:n.split(',')[0]+' '+hit.add,sameKind:true};
  }
  /* часть блюда, как она названа в базе: «в сливочном соусе» — «Соус белый (основа) со сливками» */
  function partAs(text){
    var t=nz(text), hit=((D&&D.composite_part_as)||[]).filter(function(x){ return new RegExp(x.said).test(t) })[0];
    return hit?t.replace(new RegExp(x_said(hit)),hit.search):text;
  }
  function x_said(h){ return h.said }
  function hasDish(re){
    try{ if(typeof LIST==='undefined'||typeof FOODS==='undefined') return false;
      return LIST.some(function(x){ var f=FOODS[x.id]||x; return f&&re.test(nz(f.n)) }) }catch(e){ return false }
  }
  /* вес меры у группы продуктов («бокал вина» — 150, «стакан овсяных хлопьев» — 100): после своей меры и меры продукта, до общего веса */
  var gc={};
  function group(f,u){
    if(!f||!FM.length) return 0;
    var k=f.id+'|'+u; if(gc[k]!=null) return gc[k];
    var n=nz(f.n), src=String(f.src||''), hit=FM.filter(function(r){ return r.unit===u&&r.re.test(n)&&(!r.src||r.src.test(src)) })[0];
    return gc[k]=hit?hit.g:0;
  }
  function weight(f,u){ return (f&&f.por&&f.por[u])||group(f,u)||(typeof DEF!=='undefined'&&DEF[u])||0 }
  /* обычная мера продукта, когда количество не названо: своя мера → мера продукта → мера по словарю */
  function usual(f,vague){
    if(!f) return null;
    var own=Object.keys(f.own||{}); if(own.length) return own[0];
    var n=nz(f.n), um=UM.filter(function(r){ return r.re.test(n) })[0], du=typeof defUnit==='function'?defUnit(f):'г';
    if(um&&weight(f,um.unit)) return um.unit;
    if(du&&du!=='г'&&du!=='мл'&&weight(f,du)) return du;
    return null;
  }
  /* своя мера, названная своими словами: у супа есть «тарелка 500 г» или «моя большая кружка» — она первая */
  function ownUnit(f,text){
    var own=Object.keys((f&&f.own)||{}); if(!own.length) return null;
    var toks=nz(text).split(/[^a-zа-я0-9]+/).filter(Boolean).map(function(w){ return w.slice(0,4) });
    var hits=own.filter(function(u){ var ws=nz(u).split(/[^a-zа-я0-9]+/).filter(function(w){ return w.length>1 }); return ws.length&&ws.every(function(w){ return toks.indexOf(w.slice(0,4))>=0 }) });
    return hits.sort(function(a,b){ return b.length-a.length })[0]||null;
  }

  function numberRun(run){
    var ws=run.split(/[\s-]+/), nums=[], cur=null, lastOrd=9;
    function ord(v){ return v>=1000?4:v>=100?3:v>=20?2:v>=10?1:0 }
    ws.forEach(function(w){
      var v=CARD[w];
      if(v>=1000){ cur=(cur==null?1:cur)*v; lastOrd=4; return }
      var o=ord(v);
      if(cur!=null&&(o>=lastOrd||(lastOrd===1)||(lastOrd===4&&false))){ nums.push(cur); cur=null }
      cur=(cur||0)+v; lastOrd=o;
    });
    if(cur!=null) nums.push(cur);
    /* «два три яйца» — диапазон, а не 5 */
    return nums.length===2&&nums[0]<nums[1]?nums[0]+'–'+nums[1]:nums.join(' ');
  }

  function prepare(raw){
    if(!D) return raw;
    var s=' '+nz(raw).replace(/[«»"“”]/g,' ').replace(/\s+/g,' ').trim()+' ', keep=[], NV=D.named_volumes||{}, N=D.numbers||{};
    /* ранние искажения речи (speech_fixes с early): до разбора блюд и мер — «макароны с курицей сливочном соусе» → «… в сливочном соусе» (22.11.2026) */
    (D.speech_fixes||[]).forEach(function(e){ if(e.early) s=s.replace(new RegExp(e.match,'g'),e.to) });
    function hold(txt){ keep.push(txt); return '\u0001'+String.fromCharCode(0x2460+keep.length-1) }
    PROT.forEach(function(p){ s=s.replace(new RegExp(rx(p).replace(/\s+/g,'\\s+'),'g'),function(m){ return hold(m) }) });
    s=s.replace(/(мук\S*\s+)типа(\s+\d)/g,function(m,a,b){ return a+hold('типа')+b });
    s=s.replace(/\d+(?:\s*[–—-]\s*\d+){2,}/g,function(m){ return hold(m) });
    s=s.replace(/(\d)\.(\d)/g,'$1,$2');
    /* слитная диктовка: «150гр», «хлеб30г» */
    s=s.replace(/(\d)(г|гр|грам+[а-я]*|мл|кг|л|шт)(?=[\s,.;!?])/g,'$1 $2').replace(/([а-я])(\d)/g,'$1 $2');
    /* заголовок перед списком с весами: «бутерброд: хлеб 30 г, масло 5 г» — записываются части, а не «бутерброд» поверх них */
    s=s.replace(/^\s*([а-я][а-я ]{2,28}):\s*(?=[^:]*\d[^:]*,[^:]*\d)/,function(m,hd){ return /(завтрак|обед|ужин|перекус|полдник|вчера|сегодня|утр|вечер|ноч)/.test(hd)?m:' ' });
    /* «кефир ноль пять» — пол-литра */
    /* …а перед процентом, ложкой, граммами — просто число: «сахар ноль пять ложки» — 0,5 ложки (слова — в словаре) */
    var NB=NV.spoken_decimals_as_number_before?new RegExp('^\\s+'+NV.spoken_decimals_as_number_before):null;
    Object.keys(NV.spoken_decimals||{}).sort(function(a,b){ return b.length-a.length }).forEach(function(k){
      s=s.replace(new RegExp(B0+rx(k)+B1,'g'),function(m,a,off,str){ var v=NV.spoken_decimals[k]; return a+(NB&&NB.test(str.slice(off+m.length))?out(v/1000):v+' мл') }) });
    /* доли словами */
    s=s.replace(/(^|\s)три\s+четверти(?=\s)/g,'$1 0,75').replace(/(^|\s)две\s+трети(?=\s)/g,'$1 0,67');
    s=s.replace(/(^|\s)(?:одн[ау]\s+)?пят(?:ую|ая)(?=\s)/g,'$1 0,2').replace(/(^|\s)две\s+пятых(?=\s)/g,'$1 0,4');   // «одну пятую пачки» (Т2, 25.11.2026)
    /* «одну треть стакана», «одна половина яблока» — одна доля, а не 1 + доля; «полторы тысячи» — 1500, «полтысячи» — 500 (хвосты разборов, 22.11.2026) */
    s=s.replace(/(^|\s)одн(?:а|у|ой)\s+(?=(?:треть|трети|четверть|четверти|половин[а-я]*)(?=\s))/g,'$1');
    s=s.replace(/(^|\s)полтор[аы]\s+тысяч[аи]?(?=\s)/g,'$1 1500').replace(/(^|\s)пол[\s-]?тысяч[аи]?(?=\s)/g,'$1 500');
    s=s.replace(/(^|\s)в(\s+(?:\d+|один|одну|два|две|три|четыре)\s+шот)/g,'$1с$2');   // «американо в два шота» — крепость, а не время «в два»
    s=s.replace(/(^|\s)(я|сам|сама)\s+(?:одна|один|одни)(?=\s)/g,'$1$2');
    s=s.replace(/(\S)\s+да\s+(?=(?:я|сам|сама)\s)/g,'$1 ');   // «съели, да я одна всё съела» — «да» не еда   // «я одна всё съела» — не число (Т3, 25.11.2026)
    s=s.replace(CARDRE,function(m,a,run,off){ if(/\sна\s*$/.test(s.slice(0,off)+a)&&/^пар/.test(run)) return m; return a+numberRun(run) });
    s=s.replace(/(\d+(?:,\d+)?)\s+с\s+половиной(?=\s)/g,function(m,n){ return out(num(n)+0.5) }).replace(/(\d+(?:,\d+)?)\s+с\s+четвертью(?=\s)/g,function(m,n){ return out(num(n)+0.25) });
    /* числа-ловушки (разбор отчёта GPT, тема Т3, решение Астамура 25.11.2026):
       «килограмм без ста граммов» — 900 г, «литр без ста» — 900 мл; «сорок штук, господи, граммов сорок» — 40 г: то же число, мера поменялась на граммы;
       «две штуки, съел по двенадцать» — 24 г */
    s=s.replace(/(^|\s)(?:(\d+(?:,\d+)?)\s+)?(кг|кило|килограм+[а-я]*|л|литр[а-я]*)\s+без\s+(\d+(?:,\d+)?)(?:\s*(?:г|гр|грам+[а-я]*|мл|мил+илитр[а-я]*))?(?=[\s,.;!?])/g,function(m,a,n,u,k){
      var big=(n?num(n):1)*1000, v=big-num(k); return v>0&&num(k)<big/2?a+out(v)+(/^(л|литр)/.test(u)?' мл':' г'):m });
    s=unitSwap(s);
    function unitSwap(s){ return s.replace(/(^|\s)(\d+(?:,\d+)?)\s+(?:штук[а-я]*|шт)\s*,?\s+(?:(?:нет|то есть|вернее|точнее|[а-я]{4,})\s*,?\s+)?(?:граммов|грамм|грамма|гр|г)\s+(\d+(?:,\d+)?)((?:\s+[а-я]+)?)(?=[\s,.;!?])/g,function(m,a,n,k,w,off,all){
      if(num(n)!==num(k)) return m;
      var t=w.trim(), prev=all.slice(Math.max(0,off-40),off).split(/\s+/).filter(Boolean);
      if(t&&t.length>=4&&prev.some(function(x){ return x.slice(0,4)===t.slice(0,4) })) w='';   // «…граммов сорок вишни» — продукт назван второй раз
      return a+k+' г'+w }) }
    s=s.replace(/(^|\s)(\d+)\s+(штук[а-я]*|шт)((?:\s+[а-я]+){0,2}?)\s+по\s+(\d+(?:,\d+)?)(?:\s*(?:г|гр|грам+[а-я]*))?(?=[\s,.;!?])/g,function(m,a,n,u,mid,k){
      return num(k)>=5&&num(n)<=20?a+out(num(n)*num(k))+' г'+mid:m });
    s=s.replace(/(^|\s)(?:половин(?:а|у|ы|ка|ку|ки)|пол)(?=\s)/g,'$1 0,5').replace(/(^|\s)треть(?=\s)/g,'$1 0,33').replace(/(^|\s)четверт(?:ь|инк\S*)(?=\s)/g,'$1 0,25')
       .replace(/(^|\s)полтор[аы](?=\s)/g,'$1 1,5');
    /* «полбанана», «полпачки», «пол-литра», «полкило» */
    var exact=N.half_prefix_exact||[], stems=N.half_prefix_stems||[];
    s=s.replace(/(^|\s)пол-?([а-я]{3,})(?=[\s,.;:!?])/g,function(m,a,rest){
      var w='пол'+rest;
      if(/^литр(а|у|ы)?$/.test(rest)) return a+'500 мл';
      if(/^литров/.test(rest)) return m;
      if(/^кило/.test(rest)) return a+'500 г';
      if(U2[rest]) return a+'0,5 '+rest;                                         // «полтарелки», «полстакана», «полпорции» — половина меры
      if(exact.indexOf(w)>=0||stems.some(function(x){ return w.indexOf(x)===0 })) return m;
      return a+'0,5 '+rest });
    /* «стакан и ещё полстакана молока» — одна мера: 1,5 стакана (хвосты разборов, 22.11.2026) */
    s=s.replace(/(^|\s)(?:(\d+(?:,\d+)?)\s+)?([а-я]+)\s+и\s+(?:еще\s+)?(\d+(?:,\d+)?)\s+([а-я]+)(?=\s)/g,function(m,a,n1,w1,n2,w2){
      return U2[w1]&&U2[w1]===U2[w2]?a+out((n1?num(n1):1)+num(n2))+' '+w2:m });
    /* «несколько ложек сметаны» — три меры с «≈»; «12 яиц», «15 конфет» — штуки при любом числе (слова — numbers.count_words) */
    s=s.replace(/(^|\s)несколько\s+([а-я]+)(?=\s)/g,function(m,a,w){ return U2[w]?a+'≈ 3 '+w:m });
    if(CNT) s=s.replace(CNT,function(m,a,n){ return +n>10?a+n+' шт ':m });
    /* диапазон: середина и «≈» */
    function mid(a,b){ a=num(a); b=num(b); return a<b&&b<=a*4?out((a+b)/2):null }
    s=s.replace(/(^|\s)от\s+(\d+(?:,\d+)?)\s+до\s+(\d+(?:,\d+)?)(?=\s)/g,function(m,p,a,b){ var x=mid(a,b); return x?p+'≈ '+x:m });
    s=s.replace(/(\d+(?:,\d+)?)\s*(?:[–—-]|\sили\s)\s*(\d+(?:,\d+)?)(?![\d:])(?!\s*[–—-]\s*\d)/g,function(m,a,b){ var x=mid(a,b); return x?'≈ '+x:m });
    /* названный объём посуды важнее меры: «2-литровая бутылка», «пол-литровая кружка» */
    var cont='(?:'+(NV.containers||[]).map(rx).join('|')+')[а-я]*';
    s=s.replace(new RegExp('(\\d+(?:,\\d+)?)\\s*-?\\s*х?\\s*-?\\s*литров[а-я]*\\s+'+cont,'g'),function(m,n){ return out(num(n)*1000)+' мл' });
    Object.keys(NV.adjectives||{}).sort(function(a,b){ return b.length-a.length }).forEach(function(k){
      s=s.replace(new RegExp('(?:(\\d+(?:,\\d+)?)\\s+)?'+rx(k).replace('-','-?')+'[а-я]*\\s+'+cont,'g'),function(m,n){ return out((n?num(n):1)*NV.adjectives[k])+' мл' }) });
    /* блюдо из частей, которого нет в базе: «бутерброд с сыром» — хлеб 50 г и сыр 25 г (решение Астамура 17.11.2026); есть такое блюдо в базе — берётся оно */
    COMP.forEach(function(c){
      if(c.offer) return;
      s=s.replace(new RegExp('(^|\\s)(?:(\\d+(?:,\\d+)?)\\s+)?(?:'+c.said+')(?:\\s+(\\d+(?:,\\d+)?)\\s*(?:г|гр|грам+[а-я]*)(?=[\\s,.;!?]|$))?','g'),function(m,a,n,gr){
        if(hasDish(c.dish)) return m;
        var tot=c.parts.reduce(function(t,x){ return t+x.g },0), k=gr?num(gr)/tot:(n?num(n):1);
        return a+c.parts.map(function(x){ return x.search+' ≈ '+out(Math.round(x.g*k))+' г' }).join(', ')+',' });
    });
    /* «2 банки по 250 г»; «полпачки творога, пачка 180 г» */
    var PK='(пачк|пачеч|банк|баноч|бутыл|упаков|плитк|пакет|коробк)', UN='(г|гр|грам+[а-я]*|мл|мил+илитр[а-я]*|л|литр[а-я]*|кг|кило[а-я]*)';
    function grams(v,u){ v=num(v); return /^(кг|кило)/.test(u)||/^(л|литр)/.test(u)?v*1000:v }
    function unitWord(u){ return /^(мл|миллилитр|л$|литр)/.test(u)?'мл':'г' }
    s=s.replace(new RegExp('(\\d+(?:,\\d+)?)\\s+'+PK+'[а-я]*\\s+по\\s+(\\d+(?:,\\d+)?)\\s*'+UN+B1,'g'),function(m,n,pk,v,u){ return out(num(n)*grams(v,u))+' '+unitWord(u) });
    var dm=new RegExp('[\\s,]+(?:(?:на|в)\\s+)?'+PK+'[а-я]*\\s+(?:весит\\s+|это\\s+|была?\\s+|на\\s+)?(\\d+(?:,\\d+)?)\\s*'+UN+B1).exec(s);
    if(dm){
      var stem=dm[1], before=s.slice(0,dm.index), um=new RegExp('(?:(\\d+(?:,\\d+)?)\\s+)?'+stem+'[а-я]*').exec(before);
      if(um){ var q=um[1]?num(um[1]):1;
        s=before.slice(0,um.index)+out(q*grams(dm[2],dm[3]))+' '+unitWord(dm[3])+before.slice(um.index+um[0].length)+' '+s.slice(dm.index+dm[0].length) }
    }
    /* часть от целого и остаток (разбор отчёта GPT, тема Т2, решение Астамура 25.11.2026):
       «пачка 200 г, я от неё одну пятую съела» — 40 г; «половину отлил, остальное выпил» — другая половина;
       «сыр был 160 г, … у оставшегося куска 117» — 43 г; «две горстки по 20» — 40 г, «от пачки в 120 г» — откуда взято, не съедено;
       «тарелка пустая 180 г, с кашей 480, после еды с остатком 230» — 250 г */
    var FR={'0,67':2/3,'0,33':1/3};
    /* «киви четыре, хотя одно ещё лежит, съела три» — три: лежит, осталось — не съедено */
    s=s.replace(/(^|\s)(\d+)\s*,?\s+(?:хотя\s+|но\s+)?(\d+)\s+(?:еще|ещё)\s+(?:лежит|лежат|осталось|остался|осталась|остались)(?:\s*,?\s+(?:съел[аи]?|съели)\s+(\d+))?(?=[\s,.;!?]|$)/g,function(m,a,n,k,e){
      var v=num(n)-num(k); if(!(v>0)) return m; return a+(e&&num(e)!==v?e:out(v)) });
    s=s.replace(/(^|\s)(\d+(?:,\d+)?)\s*(г|гр|грам+[а-я]*|мл|мил+илитр[а-я]*)(?=\s)((?:\s+(?!(?:и|а|потом|плюс)\s)[^\s\d,.;]+){0,6}?)\s+(0,\d+)((?:\s+[^\s\d,.;]+){0,3})(?=[\s,.;!?]|$)/g,function(m,a,n,u,mid,f,tail){
      var k=FR[f]||num(f); if(!(k>0&&k<1)) return m;
      var TW=/^(?:съел[аи]?|выпил[аи]?|отпил[аи]?|отъел[аи]?|поел[аи]?|отлил[аи]?|вылил[аи]?|оставил[аи]?|убрал[аи]?|отложил[аи]?|отдал[аи]?|его|ее|нее|него|их|них|банки|пачки|пакета|бутылки|упаковки|коробки|обратно|остальное|я)$/,
          VB=/(^|\s)(?:съел|выпил|отпил|отъел|поел|отлил|вылил|оставил|убрал|отложил|отдал)[аи]?(?=\s|$)/, tw=tail.trim().split(/\s+/).filter(Boolean);
      if(!tw.length||!tw.every(function(x){ return TW.test(x) })||!VB.test(mid+' '+tail)) return m;
      if(/^\s*(?:отлил|отлила|вылил|вылила|оставил|оставила|убрал|убрала|отложил|отложила|отдал|отдала)(?=\s|$)/.test(tail)) k=1-k;
      mid=mid.split(/\s+/).filter(function(x){ return x&&!TW.test(x)&&!/^(от|у)$/.test(x) }).join(' ');   // «я от неё», «отлил обратно» — уже учтено в граммах
      return a+out(Math.round(num(n)*k))+' '+(/^м/.test(u)?'мл':'г')+(mid?' '+mid:'')+(VB.test(mid+' '+tail)&&/(съел|выпил|отпил|поел|отъел)/.test(mid+' '+tail)?' съела':'') });
    s=s.replace(/(^|\s)(\d+(?:,\d+)?)\s*(г|гр|грам+[а-я]*|мл)(?=\s)([^\d]{0,80}?)\s(?:у\s+)?(?:оставш[а-я]*|остат(?:ок|ка|ком)|осталось|остался|осталась)((?:\s+[а-я]+){0,2}?)\s+(\d+(?:,\d+)?)(?:\s*(?:г|гр|грам+[а-я]*|мл))?(?=[\s,.;!?]|$)/g,function(m,a,n,u,mid,w,b){
      if(/(^|\s)(?:с|со)\s*$/.test(mid)) return m;
      return num(b)<num(n)?a+out(num(n)-num(b))+' '+u+' ':m });
    s=s.replace(/(^|\s)(?:тарелк[а-я]*\s+)?пуст[а-я]*\s+\d+(?:,\d+)?\s*(?:г|гр|грам+[а-я]*)?\s+(?:с|со)\s+([а-я]+)\s+(\d+(?:,\d+)?)\s*(?:г|гр|грам+[а-я]*)?\s+(?:после\s+еды\s+)?(?:с\s+)?остат[а-я]*\s+(\d+(?:,\d+)?)(?:\s*(?:г|гр|грам+[а-я]*))?(?=[\s,.;!?]|$)/g,function(m,a,w,x,y){
      return num(y)<num(x)?a+w+' '+out(num(x)-num(y))+' г ':m });
    s=s.replace(/(^|\s)от\s+(?:пачк|упаковк|банк|пакет|коробк)[а-я]*\s+(?:в|на)?\s*\d+(?:,\d+)?\s*(?:г|гр|грам+[а-я]*|мл)(?=\s)(?=.*\d)/g,'$1');
    s=s.replace(/(^|\s)(\d+)((?:\s+[а-я]+(?:ые|ых|ие|их))?)\s+(горст[а-я]*|ложк[а-я]*|кусоч[а-я]*|кусок|куска|кусков|ломтик[а-я]*)\s+по\s+(\d+(?:,\d+)?)(?:\s*(?:г|гр|грам+[а-я]*))?(?=[\s,.;!?]|$)/g,function(m,a,n,adj,u,k){
      return num(n)<=20?a+out(num(n)*num(k))+' г':m });
    /* «яичница из 2 яиц» — два жареных яйца */
    s=s.replace(/(?:яичниц[а-я]*|глазунь[а-я]*)\s+из\s+(\d+)\s+яиц[а-я]*/g,'$1 яйца жареные');
    /* «омлет из двух яиц» — омлет весом около 60 г на яйцо (яйцо и немного молока), а не яйцо отдельно (хвосты разборов, 22.11.2026) */
    s=s.replace(/(омлет[а-я]*)\s+из\s+(\d+)\s+яиц[а-я]*/g,function(m,w,n){ return w+' ≈ '+(num(n)*60)+' г' });
    /* «маленькая тарелка борща» — две трети тарелки (sizes.small_dish) */
    var SD=(D.sizes||{}).small_dish;
    if(SD) s=s.replace(new RegExp('(^|\\s)(?:(\\d+(?:,\\d+)?)\\s+)?(?:'+SD.words.join('|')+')[а-я]*\\s+((?:'+SD.units.join('|')+')[а-я]*)','g'),function(m,a,n,u){ return a+out((n?num(n):1)*SD.factor)+' '+u });
    /* толщина рядом с мерой — не продукт: «три тонких ломтика» */
    s=s.replace(/(^|\s)(?:тонк|толст)[а-я]*\s+(?=(?:ломт|кус|кружоч|слайс|дольк|колец|кольц)[а-я]*)/g,'$1');
    /* отдельный продукт со своим количеством: «чай с 2 ложками сахара», «борщ 300 г со сметаной 20 г», «мёд в чай».
       Ложки добавки и вес в конце — блюдо «А с Б»: «творог с двумя ложками мёда 200 г» — 200 г всего блюда, а не мёда (решение Астамура 22.11.2026) */
    s=s.replace(/\sсо?\s+(?=\d+(?:,\d+)?\s+[а-я])(?!\d+(?:,\d+)?\s*(?:%|процент))/g,function(m,off,all){ return SPOONTOT.test(all.slice(off+m.length))?m:', ' });
    s=s.replace(/(\d+(?:,\d+)?\s*(?:г|гр|грам+[а-я]*|мл)\s+)со?\s+(?=[а-я]+\s+\d)/g,'$1, ');
    /* «молоко в кофе 50 мл» — 50 мл молока, а не кофе; уже названный напиток второй раз не пишется (хвосты разборов, 22.11.2026) */
    s=s.replace(/\sв\s+(чай|кофе|какао|кашу|суп)(?:\s+(\d+(?:,\d+)?\s*(?:г|гр|грам+[а-я]*|мл)))?(?=[\s,.;!?])/g,function(m,d,q,off,all){
      var seen=q&&new RegExp('(^|\\s)'+d.slice(0,3)).test(all.slice(0,off));
      return (q?' '+q:'')+(seen?'':', '+d) });
    /* состав после веса блюда: «салат 250 г, там огурцы, помидоры…» — записывается блюдо, части не дублируются */
    s=s.replace(/(\d\s*(?:г|гр|грам+[а-я]*|мл)\s*),?\s+(?:там|в составе|внутри|состав)\s+[^.;!?]*/g,'$1 ');
    /* «стебли 5 г выбросил» — несъедобный остаток: вычитается один раз */
    s=s.replace(/(?:стебл|ножк|хвостик|черешк)[а-я]*\s+(\d+(?:,\d+)?)\s*(?:г|гр|грам+[а-я]*)?\s+(?:выбросил|убрал|отрезал|срезал)[а-я]*/g,'кожура $1 г');
    /* поправки внутри фразы */
    /* «ой, не сто, а сто пятьдесят грамм риса» — в начале диктовки; «груша не 200, а 180» остаётся поправкой записи */
    s=s.replace(/^(\s*(?:(?:ой|ах|ну|так|блин|нет)[\s,]+)*)не\s+\d+(?:,\d+)?\s*(?:[а-я.]+\s*)?,?\s+а\s+(?=\d)/,'$1');
    s=s.replace(CORR,function(m,a){ return a+', нет, ' });
    /* Meal 34.13 · поправка посреди фразы: «поправка», «оговорка», «стоп», «перепутал наоборот», «не то сказал», «хотя» — как «вернее»,
       но только после уже названного числа (в начале фразы «стоп» — не поправка) и если дальше что-то сказано. «Двести с небольшим, ну запиши двести» — число заменяет число */
    if(CORRM) s=s.replace(CORRM,function(m,a,off,all){ return /\d/.test(all.slice(0,off))&&/[а-я0-9]/.test(all.slice(off+m.length))?a+', нет, '+(/\sне$/.test(m)?'не ':''):m });
    s=s.replace(/,\s*нет,\s*не\s+[а-я]{3,}\s+(?=[а-я]{3,})/g,', нет, ');   // «хотя не суп, бульон грибной» — назван новый продукт
    s=s.replace(/(^|\s)([а-я]{3,})\s+(?:оставил|оставила|оставили|не стал[аи]?\s+есть)(?=[\s,.;!?]|$)/g,function(m,a,w){ return U2[w]||/^(последн|остальн|половин|треть|четверт)/.test(w)?m:a });   // «желток съела, белок оставила» — оставленное не съедено
    if(CORRN) s=s.replace(CORRN,function(m,a,off,all){ return /\d/.test(all.slice(0,off))?a+', нет, ':m });
    /* после поправки: «нет, 5 грамм это сыр» — сыр 5 г; «два с половиной это дома» — пояснение, не еда (Т1, 25.11.2026) */
    s=s.replace(/(,\s*нет,\s*)(\d+(?:,\d+)?\s*(?:г|гр|грам+[а-я]*|мл))\s+это\s+([а-я]{3,})(?=[\s,.;!?]|$)/g,'$1$3 $2');
    s=s.replace(/(?:\s(?:\d+(?:,\d+)?\s+)?)это\s+(?:дома|обычно|раньше|на работе|у мамы)(?=[\s,.;!?]|$)/g,function(m,off,all){ return /,\s*нет,/.test(all.slice(0,off))?' ':m });
    s=s.replace(/(^|[\s,])нет[\s,]+(?:нет[\s,]+)+/g,'$1нет, ');
    /* многословные меры → одно слово */
    MW.forEach(function(r){ s=s.replace(r.re,function(m,a,tail){ return a+r.to+(r.keep?tail:'') }) });
    /* «стакан с четвертью», «ложка с половиной» */
    s=s.replace(/(^|\s)([а-я]+)\s+с\s+(половиной|четвертью)(?=[\s,.;!?])/g,function(m,a,w,k){ return U2[w]?a+(k==='половиной'?'1,5 ':'1,25 ')+w:m });
    /* размеры другими словами: «мелкий огурец», «огромное яблоко» */
    var SZ=(D.sizes||{}).say_as||{}; Object.keys(SZ).forEach(function(k){ s=s.replace(phrase(SZ[k]),function(m,a){ return a+k }) });
    /* пустышки, приблизительность, наполнение, количество без числа */
    s=s.replace(/(^|\s)(?:плюс[\s-]+минус)\s+\d+(?:,\d+)?(?:\s*(?:г|гр|грам+[а-я]*|мл))?(?=[\s,.;!?])/g,'$1≈ ');
    s=s.replace(APPROX,function(m,a){ return a+'≈' });
    s=s.replace(/(^|[\s,])типа(?=\s)/g,'$1≈');
    FACT.forEach(function(r){ s=s.replace(r.re,function(m,a){ return a+r.mark }) });
    if(SPLIT) s=s.replace(SPLIT,function(m,a){ return a+', ' });
    if(EATRE) s=s.replace(EATRE,function(m,a){ return a+'⊙' });   // «съел», «поела» — пометка: дальше то, что человек съел сам
    s=s.replace(DROP,function(m,a){ return a });
    s=s.replace(DROP,function(m,a){ return a });
    s=unitSwap(s);   // «сорок штук, господи, граммов сорок» — после того как убраны вставки
    VAGUE.slice().sort(function(a,b){ return 0 }).forEach(function(v){ s=s.replace(phrase(v.forms),function(m,a){ return a+v.mark }) });
    /* «щедро посыпал сыром»: пометка количества остаётся при продукте, который назван после глагола */
    s=s.replace(/([≈▽◇△])\s*,\s*(?=[а-я])/g,', $1 ');
    /* «ложка сахара» в чай или кофе — чайная */
    if(/(^|\s)(чай|чая|чаю|чае|кофе|какао)(?=[\s,.])/.test(s)&&/сахар/.test(s)&&!/столов/.test(s)) s=s.replace(/(^|\s)(ложк[а-я]*)(?=\s)/g,'$1чайная $2');
    /* другие названия и уменьшительные */
    var skip=new RegExp('(?:^|[\\s,])(?:'+(D.alias_skip_after||[]).join('|')+')\\s*$');
    var skipStem=new RegExp('(?:^|[\\s,])(?:'+(D.alias_skip_after_stems||['~']).join('|')+')[а-я]*\\s*$');
    ALIASES.forEach(function(r){ s=s.replace(r.re,function(m,a,off,all){ var before=s.slice(0,off)+a;
      if(r.sk&&r.sk.test(before+'«»'+all.slice(off+m.length))) return m;   // «блин, съел два яйца» — восклицание, а не блины
      return skip.test(before)||(m.trim().indexOf(' ')<0&&skipStem.test(before))?m:a+r.to }) });
    s=s.replace(/\u0001(.)/g,function(m,c){ return keep[c.charCodeAt(0)-0x2460] });
    return s.replace(/\s+/g,' ').replace(/(\s,)+/g,',').replace(/^[\s,]+/,'').trim();
  }

  /* «готовлю суп на четверых» — рецепт, а не съеденная порция */
  function recipe(raw){
    if(!D) return null;
    var e=(D.compound_and_intent_rules||[]).filter(function(x){ return x.bot==='recipe' })[0]; if(!e) return null;
    return new RegExp(B0+'(?:'+alt(e.forms)+')'+B1).test(' '+nz(raw)+' ')?e.reply_ru:null;
  }
  /* общее слово («сыр», «сок»): что брать, когда человек не уточнил */
  function generic(word){
    var w=nz(word), e=((D&&D.generic_defaults)||[]).filter(function(x){ return new RegExp(x.said).test(w) })[0];
    return e?{id:e.id,history:new RegExp(e.history),search:e.default_search||null,ask:!!e.ask,options:e.ask_options||(e.first_search?[e.first_search]:[])}:null;
  }
  build();
  return {ready:function(){ return !!D }, version:function(){ return D?D.dictionary_version:'' }, prepare:prepare, group:group, weight:weight, usual:usual, ownUnit:ownUnit,
    wordForms:function(){ return (D&&D.dish_word_forms)||[] }, advice:function(){ return (D&&D.dish_advice)||null }, recipe:recipe, generic:generic, composite:composite, partAs:partAs, missing:missing, similarKind:similarKind, pin:pin, eaten:eaten, weighed:weighed, cooked:cooked, unitKnown:function(t){ return U2[t]||null }, choice:function(){ return CHOICE },
    on:function(v){ active=!!v }, isOn:function(){ return active },
    marks:{approx:'≈',fac:{'⊕':1.5,'⊘':0.8},vague:{'▽':0.5,'◇':1,'△':1.5},own:'⊙',all:/[≈⊕⊘▽◇△⊙]/g}};
})();
