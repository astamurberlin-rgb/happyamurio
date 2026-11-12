/* Meal 29 · счётчик добавки. Решение Астамура 12.11.2026 01:48: «Добавки это же такая же база продуктов как и
   остальные, нажимаешь добавить счетчик находишь добавку выбираешь в какое приложение еще подключить и везде должно
   быть»; 02:01 — «доделать все и выпустить».
   Добавка в счётчике — обычная запись еды с «продуктом-добавкой»: так её одинаково понимают Meal 28 и 29, Day и
   Sport (общий документ счётчиков; состав едет в самой записи, counterFood). Продукт-добавка (id «supp:<вариант>»)
   собирается из сохранённого варианта «Мои добавки»: состав на 100 условных граммов, где условный грамм — масса одной
   единицы основы (капсулы, таблетки, мл…), если она указана на этикетке. Масса единицы не указана — грамм условный
   (1 единица = 1 г) и граммы нигде не показываются: supplement.massUnknown. В поиске еды и в «Мои продукты» такой
   продукт не показывается — добавки ищутся и правятся в «Мои добавки». Приём пищи и голодание — по правилу БАДов
   (supplement-nutrition.js, mealRule): больше 4 ккал за нажатие — голодание прервано; приём открывают порошок и
   жидкость, капсулы и таблетки — нет, если в варианте не выбрано иначе. */
(function(root){'use strict';
  var PREFIX='supp:',TEMPLATE='supp-template:';
  var FORMS={'капсула':['капсула','капсулы','капсул'],'таблетка':['таблетка','таблетки','таблеток'],'мерная ложка':['мерная ложка','мерные ложки','мерных ложек'],'порция':['порция','порции','порций'],'пастилка':['пастилка','пастилки','пастилок'],'капля':['капля','капли','капель'],'стик':['стик','стика','стиков']};
  function fmt(n){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n)}
  function plural(n,a){n=Math.abs(Number(n));return a[!Number.isInteger(n)?1:n%100>=11&&n%100<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2]}
  function finite(n){return typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null}
  function clone(x){return JSON.parse(JSON.stringify(x))}
  function norm(x){return String(x==null?'':x).toLowerCase().replace(/ё/g,'е')}
  function own(o,k){return !!o&&Object.prototype.hasOwnProperty.call(o,k)}
  /* продукт-добавка или null */
  function of(food){var s=food&&food.supplement;return s&&typeof s==='object'&&s.basis&&typeof s.basis==='object'&&finite(s.unitGrams)>0?food:null}
  function isSupplementId(id){return typeof id==='string'&&(id.indexOf(PREFIX)===0||id.indexOf(TEMPLATE)===0)}
  function unitWord(q,u){return own(FORMS,u)?plural(q,FORMS[u]):u}
  /* «2 капсулы», «1 мерная ложка», «30 г» — без условных граммов */
  function portionText(q,u){return fmt(q)+' '+unitWord(q,u)}
  /* подпись порции счётчика для Day и Sport: условные граммы не показываются, настоящие — да */
  function counterLabel(f,q,u,g){var s=of(f)&&f.supplement,text=portionText(q,u);return s&&!s.massUnknown&&u!=='г'&&finite(g)?text+' · '+fmt(g)+' г':text}
  function unitGrams(b){return b.unit==='г'?1:b.gramsPerUnit>0?b.gramsPerUnit:1}
  function massUnknown(b){return b.unit!=='г'&&!(b.gramsPerUnit>0)}
  function variants(){try{return root.HappySupplements&&root.HappySupplements.getVariants?root.HappySupplements.getVariants():[]}catch(e){return []}}
  function templates(){var L=root.HappySupplementsLibrary;return L&&Array.isArray(L.templates)?L.templates:[]}
  function allowed(){try{return !!(root.HappyCollections&&root.HappyCollections.canUseSupplements&&root.HappyCollections.canUseSupplements()===true)}catch(e){return false}}
  /* вариант «Мои добавки» → продукт-добавка */
  function food(v){
    var M=root.HappySupplementsModel,S=root.HappySubstances,b=v&&v.basis;
    if(!v||!v.id||!b||!(b.quantity>0)||!b.unit)throw Error('Добавка без основы: открой её в «Мои добавки» и проверь количество и единицу.');
    var ug=unitGrams(b),q=b.quantity,mapped=S?S.values(v.components||[]):{values:{}},counterValues={};
    Object.keys(mapped.values).forEach(function(k){var x=finite(mapped.values[k]);counterValues[k]=x===null?null:x/q*100/ug});
    var measures=(M?M.measureOptions(v):[{id:'basis',name:b.unit,amount:1}]).filter(function(m){return m&&m.name&&finite(m.amount)>0}),por={};
    measures.forEach(function(m){if(m.name!=='г'&&!own(por,m.name))por[m.name]=m.amount*ug});
    function value(k){return own(counterValues,k)?counterValues[k]:null}
    var s={v:1,variantId:String(v.id),templateId:v.templateId||null,revision:v.revision||0,basis:{quantity:q,unit:b.unit,gramsPerUnit:b.unit==='г'?1:b.gramsPerUnit>0?b.gramsPerUnit:null},
      unitGrams:ug,massUnknown:massUnknown(b),measures:measures.map(function(m){return {id:String(m.id),name:m.name,amount:m.amount}}),components:clone(v.components||[]),source:String(v.source||'')};
    if(typeof v.opensMeal==='boolean')s.opensMeal=v.opensMeal;
    if(v.form)s.form=String(v.form);
    return {id:PREFIX+v.id,n:v.name,w:[],src:'добавка',k:value('kcal'),p:value('prot'),f:value('fat'),c:value('carb'),counterValues:counterValues,por:por,porG:1,
      defU:b.unit==='г'?(Object.keys(por)[0]||'г'):b.unit,revision:v.revision||0,supplement:s};
  }
  /* шаблон каталога с примером состава: в поиске счётчика; сохранится в «Мои добавки» при создании счётчика */
  function templateFood(t){var M=root.HappySupplementsModel,d=M.draft(t);d.id='template';var f=food(d);f.id=TEMPLATE+t.id;f.supplement.variantId=null;f.supplement.templateId=t.id;f.supplement.example=true;return f}
  function matches(x,q){q=norm(q).trim();if(!q)return true;return norm(x.name+' '+(x.form||'')+' '+(x.components||[]).map(function(c){return c.name}).join(' ')).indexOf(q)>=0}
  function search(query){
    var list=variants(),out=[];
    list.filter(function(v){return matches(v,query)}).forEach(function(v){try{out.push(food(v))}catch(e){}});
    if(String(query||'').trim()&&allowed()){
      var taken={};list.forEach(function(v){if(v.templateId)taken[v.templateId]=1});
      templates().filter(function(t){return t.example&&!taken[t.id]&&matches(t,query)}).forEach(function(t){try{out.push(templateFood(t))}catch(e){}});
    }
    return out.slice(0,12);
  }
  /* строка в результатах поиска счётчика */
  function resultNote(f){var s=f.supplement,k=finite(f.k),one=k===null?null:k*s.unitGrams/100;
    return (s.variantId?'Мои добавки':'Каталог БАДов · оценочный пример')+' · 1 '+unitWord(1,s.basis.unit)+' — '+(one===null?'калорийность не указана':fmt(Math.round(one*10)/10)+' ккал')}
  /* меры счётчика: основа, свои меры, граммы — если масса известна */
  function units(f,cur){var s=f.supplement,list=s.measures.map(function(m){return m.name}).filter(function(n,i,a){return n!=='г'&&a.indexOf(n)===i});
    if(!s.massUnknown)list.push('г');if(cur&&list.indexOf(cur)<0)list.push(cur);return list}
  /* перед сохранением счётчика: свежий вариант из «Мои добавки»; шаблон — сохранить вариантом */
  function resolve(f){var s=f.supplement;
    if(s.variantId){var v=variants().filter(function(x){return String(x.id)===s.variantId})[0];return Promise.resolve(v?food(v):clone(f))}
    if(s.templateId){if(!root.HappySupplements||!root.HappySupplements.saveTemplate)return Promise.reject(Error('Каталог БАДов ещё не готов. Попробуй ещё раз.'));
      return root.HappySupplements.saveTemplate(s.templateId).then(food)}
    return Promise.resolve(clone(f));
  }
  /* в «Мои добавки» состав исправили после сохранения счётчика */
  function newer(f){var s=of(f)&&f.supplement;if(!s||!s.variantId)return false;var v=variants().filter(function(x){return String(x.id)===s.variantId})[0];return !!v&&(v.revision||0)>(s.revision||0)}
  function openVariant(id){var v=variants().filter(function(x){return String(x.id)===String(id)})[0];if(!v||!root.HappySupplements||!root.HappySupplements.openVariant)return false;root.HappySupplements.openVariant(v.id);return true}
  /* приём с порции счётчика — для «Созданные мной» и выгрузки: состав этикетки на нажатую порцию */
  function portion(f,item){var s=of(f)&&f.supplement,g=finite(item&&item.g);if(!s||g===null)return null;var units=g/s.unitGrams,factor=units/s.basis.quantity;
    return {quantity:finite(item.q),measure:item.u||'',basisUnits:units,grams:s.massUnknown?null:g,components:(s.components||[]).map(function(c){var x=clone(c);x.amount=finite(c.amount)===null?null:c.amount*factor;return x})}}
  function entries(range){var out=[],db=root.DB,days=db&&db.days||{},P=root.MealProducts;
    Object.keys(days).forEach(function(date){if(range&&(date<range.a||date>range.b))return;((days[date]||{}).items||[]).forEach(function(item){
      var f=of(P&&P.forItem?P.forItem(item,root.FOODS||{},db):null)||of((root.FOODS||{})[item.fid]);if(!f)return;var p=portion(f,item);if(!p)return;
      out.push({id:'counter:'+(item.id||''),date:date,section:item.sec||'',variantId:f.supplement.variantId||'',name:f.n,portion:p,counter:true});
    })});
    return out}
  /* правило приёма пищи для записи с продуктом-добавкой; null — не добавка. Правило — HappySupplementNutrition.mealRule;
     пока supplement-nutrition.js не загружен (он подключается в конце страницы), — та же формула здесь */
  var PILL=/капсул|таблет|драже|пастил|леденц|мармелад/i;
  function rule(s,values){var kcal=finite(values.kcal),p=finite(values.prot),fa=finite(values.fat),c=finite(values.carb);
    var energy=kcal!==null?kcal:p===null&&fa===null&&c===null?null:4*(p||0)+9*(fa||0)+4*(c||0),pill=PILL.test(String(s.basis&&s.basis.unit||'')),breaks=energy!==null&&energy>4;
    var opens=typeof s.opensMeal==='boolean'?s.opensMeal:breaks;   // Meal 30: как в supplement-nutrition.js
    return {energy:energy,breaksFast:opens,opensMeal:opens,pill:pill}}
  function mealRule(f,item){var s=of(f)&&f.supplement,N=root.HappySupplementNutrition,P=root.MealProducts;if(!s)return null;
    var g=finite(item&&item.g);function v(k){var n=P&&P.value?P.value(f,k):finite(f[{kcal:'k',prot:'p',fat:'f',carb:'c'}[k]]);return n==null||g===null?null:n*g/100}
    var values={kcal:v('kcal'),prot:v('prot'),fat:v('fat'),carb:v('carb')};
    return N&&N.mealRule?N.mealRule(s,values):rule(s,values)}
  root.MealSupplementCounters={prefix:PREFIX,of:of,isSupplementId:isSupplementId,food:food,templateFood:templateFood,search:search,resultNote:resultNote,units:units,unitWord:unitWord,
    portionText:portionText,counterLabel:counterLabel,resolve:resolve,newer:newer,openVariant:openVariant,portion:portion,entries:entries,mealRule:mealRule,rule:rule};
})(typeof globalThis!=='undefined'?globalThis:this);
