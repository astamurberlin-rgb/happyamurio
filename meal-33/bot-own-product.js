/* Happy Meal · свой продукт через чат бота (Meal 33.36, решение Астамура 22.11.2026 «Да, по плану»).
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
