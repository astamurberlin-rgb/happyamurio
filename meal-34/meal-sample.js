/* Meal · пример Amurio: дневник еды по общему сценарию (shared/happy-sample.js). Кнопки — в «Для разработчика»,
   видны только в тестовом аккаунте (HappySample.EMAIL) и в лаборатории. Заполняет только пустой дневник.
   Еда меняется вместе с историей: булочки, энергетики и пиво в начале, сладкий завтрак и «жор» в середине,
   ровные три приёма с белком в конце. Продукты — из встроенного набора и национальных баз Meal.
   — Claude со слов Астамура · 25.11.2026 */
(function(){
 'use strict';
 function rng(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
 var clamp=function(v,a,b){return Math.min(b,Math.max(a,v))};
 var hm=function(h){h=clamp(h,0,23.98);var H=Math.floor(h),M=Math.floor((h-H)*60);return String(H).padStart(2,'0')+':'+String(M).padStart(2,'0')};
 var BUN='mext:15071',CHIPS='mext:15103',ENERGY='kfct:P0090160009a',BEER='mext:16006',COLA='mext:16053',PIZZA='usda:170317',ICE='usda:167575';
 /* наборы: [продукт, количество, мера] */
 var M={
  junkAm:[[[BUN,150,'г'],['cfm',1,'чашка']],[['dch',50,'г'],['cof',1,'чашка']],[['btn',3,'ломтик'],['hon',2,'ст. л.'],['cfm',1,'чашка']]],
  junkMain:[[[PIZZA,350,'г'],[COLA,500,'мл']],[[CHIPS,120,'г'],[ENERGY,500,'мл']],[['btn',4,'ломтик'],['but',4,'ч. л.'],['fet',3,'ломтик']],[['pas',350,'г'],['but',3,'ч. л.']]],
  sweetAm:[[['btn',3,'ломтик'],['hon',2,'ст. л.'],['but',2,'ч. л.'],['cfm',1,'чашка']],[[BUN,180,'г'],['cfm',1,'чашка']],[['oat',60,'г'],['hon',3,'ст. л.'],['ban',1,'шт'],['mil',1,'стакан']]],
  goodAm:[[['egg',3,'шт'],['brd',2,'ломтик'],['tom',1,'шт'],['cof',1,'чашка']],[['oat',80,'г'],['mil',1,'стакан'],['blu',1,'горсть'],['wal',5,'шт']],[['tv5',250,'г'],['ban',1,'шт'],['cof',1,'чашка']]],
  lunch:[[['buc',300,'г'],['chk',200,'г'],['cuc',1,'шт'],['olv',1,'ст. л.']],[['ric',300,'г'],['sal',180,'г'],['bro',150,'г']],[['pas',300,'г'],['chk',180,'г'],['tom',2,'шт'],['olv',1,'ст. л.']],[['len',300,'г'],['egg',2,'шт'],['brd',2,'ломтик'],['avo',1,'маленький']]],
  dinner:[[['pot',3,'шт'],['sal',180,'г'],['cuc',1,'шт'],['tom',1,'шт']],[['ric',250,'г'],['tun',150,'г'],['avo',1,'маленький']],[['buc',250,'г'],['chk',200,'г'],['bro',200,'г']],[['egg',3,'шт'],['pot',2,'шт'],['fet',3,'ломтик'],['tom',2,'шт']]],
  snack:[[['yog',200,'г'],['wal',5,'шт']],[['app',1,'шт'],['alm',1,'горсть']],[['kef',1,'стакан'],['ban',1,'шт']],[['tv5',150,'г'],['hon',1,'ч. л.']]],
  sweet:[[[ICE,150,'г']],[['dch',40,'г']],[[BUN,120,'г']],[['btn',2,'ломтик'],['pea',2,'ст. л.'],['hon',1,'ст. л.']]]
 };
 function allowed(){return !!(window.HappySample&&window.MealBoot&&MealBoot.store&&HappySample.allowed(MealBoot.account))}
 function build(){
  var days={};
  HappySample.days(HappySample.today()).forEach(function(d){
   if(!d.logged)return;
   var r=rng(7000+d.i),m=d.month,items=[],wake=d.wake==null?13:d.wake;
   var one=function(list){return list[Math.floor(r()*list.length)]};
   var add=function(sec,time,set,scale){
    set.forEach(function(x,k){
     if(!FOODS[x[0]])return;
     var q=x[2]==='г'||x[2]==='мл'?Math.round(x[1]*(scale||1)/10)*10:x[1];
     items.push({id:'i'+MealData.id(),sec:sec,fid:x[0],q:q,u:x[2],g:gramsFor(x[0],q,x[2]),t:hm(time+k*.03),said:''});
    });
   };
   if(d.marathon){
    add('sn',clamp(3+r()*3,0,23),[[ENERGY,500,'мл'],['cof',2,'чашка']]);
   }else if(m<=2){
    /* 1–2 приёма, поздно; после марафона — день обжорства */
    if(r()<.6||d.crash)add('am',wake+.8,one(M.junkAm));
    add(d.crash?'pm':'dn',d.crash?wake+3:clamp(wake+8,18,23.5),one(M.junkMain),d.crash?1.6:1);
    if(d.crash){add('dn',clamp(wake+7,18,23.5),one(M.junkMain),1.5);add('sn',clamp(wake+5,12,23),one(M.sweet),1.5)}
    else if(r()<.4)add('sn',clamp(wake+11,0,23.6),one(M.sweet));
    if(d.alcohol)add('sn',22.5,[[BEER,1500,'мл'],[CHIPS,80,'г']]);
   }else{
    var big=m===4?1.15:m===5||m===6?1.3:m>=7?1.15:1;
    add('am',wake+.9,d.sweet?one(M.sweetAm):one(M.goodAm),big);
    add('pm',clamp(wake+5.5,12.5,16.5),m<=4&&r()<.4?one(M.junkMain):one(M.lunch),big);
    add('dn',clamp(wake+11,18.5,22),m<=3&&r()<.3?one(M.junkMain):one(M.dinner),big);
    if(m>=5||r()<.6)add('sn',clamp(wake+8.5,15.5,19),one(M.snack));
    /* сладкое: с утра уходит на пятом месяце, после обеда остаётся; после расставания и тренировок — больше */
    if(d.grief||m<=6&&r()<(m<=4?.6:.4)||m>=7&&r()<.15)add('sn',clamp(wake+6.5,13.5,17.5),one(M.sweet),d.grief?1.5:1);
    if(d.training&&m>=4){add('sn',20.2,[['whp',1,'мерка'],['mil',1,'стакан']]);if(m<=6)add('dn',21.3,[['ric',200,'г'],['egg',2,'шт']])}
   }
   if(items.length)days[d.date]={items:items};
  });
  return days;
 }
 function shared(name){try{return MealBoot.store.shared('sport',name)}catch(e){return null}}
 var empty=function(){return !Object.keys(DB.days||{}).some(function(d){return DB.days[d]&&(DB.days[d].items||[]).length})};
 async function fill(){
  if(!allowed())return;
  if(!empty()&&!window.HAPPY_LAB){toast('В дневнике уже есть записи. Пример кладётся только в пустой дневник.');return}
  DB.days=build();save();saveNow();   // сразу: запись общих документов ниже пересобирает дневник из хранилища
  var result=await HappySample.fillShared(shared('body'),shared('profile'));
  renderAll();
  toast('Пример Amurio: '+Object.keys(DB.days).length+' дней еды'+(result.measurements?' и '+result.measurements+' замеров':''));
 }
 async function clear(){
  if(!allowed())return;
  DB.days={};save();saveNow();
  var n=await HappySample.clearShared(shared('body'));
  renderAll();
  toast('Пример убран'+(n?': еда и '+n+' замеров':''));
 }
 function paint(){var box=document.getElementById('sampleBox');if(box)box.hidden=!allowed()}
 document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('[data-sample]');if(!b)return;
  b.disabled=true;
  (b.getAttribute('data-sample')==='fill'?fill():clear()).catch(function(err){toast(String(err&&err.message||err))}).then(function(){b.disabled=false});
 });
 window.MealSample={build:build,fill:fill,clear:clear,paint:paint,allowed:allowed};
 if(window.MealBoot&&MealBoot.ready&&MealBoot.ready.then)MealBoot.ready.then(paint,paint);
 document.addEventListener('pointerdown',paint,true);
})();
