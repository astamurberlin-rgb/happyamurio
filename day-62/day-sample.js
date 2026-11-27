/* Day · пример Amurio: записи Day по общему сценарию (shared/happy-sample.js). Кнопки — в «Для разработчика»,
   видны только в тестовом аккаунте (HappySample.EMAIL) и в лаборатории. Заполняет только пустой дневник.
   Отметки шкал, теги, экранное время, работа, кофе и заметки кладутся в дневник в памяти и уходят обычной записью Day.
   — Claude со слов Астамура · 25.11.2026 */
(function(){
 'use strict';
 var TAGS={wake:['Антидепрессант','Бессонная ночь'],am:[],pm:['Дневной сон','Психотерапия','Психиатр','Прогулка'],
  eve:['Алкоголь','Наркотики','Марафон','Расставание','Работа допоздна','Instagram']};
 function rng(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
 var clamp=function(v,a,b){return Math.min(b,Math.max(a,v))};
 var hm=function(h){h=clamp(h,0,23.98);var H=Math.floor(h),M=Math.floor((h-H)*60);return String(H).padStart(2,'0')+':'+String(M).padStart(2,'0')};
 function allowed(){return !!(window.HappySample&&window.DayBoot&&DayBoot.store&&HappySample.allowed(DayBoot.account))}
 function build(){
  var days={};
  HappySample.days(HappySample.today()).forEach(function(d){
   if(!d.logged)return;
   var r=rng(9000+d.i),e={cp:{},tags:{},train:null,screen:{},note:d.note||'',num:{}};
   var scale=function(x){return Math.round(clamp(1+6*(x+(r()-.5)*.12),1,7)*100)/100};
   var w=d.well,bad=1-w,wake=d.wake==null?13:d.wake,m=d.month;
   var put=function(key,time,values,tags){
    var c={time:hm(time)};Object.keys(values).forEach(function(k){c[k]=scale(values[k])});
    if(tags.length){c.tags={};tags.forEach(function(t){c.tags[t]=true})}
    e.cp[key]=c;
   };
   var eveTags=d.tags.filter(function(t){return t!=='Бессонная ночь'});
   if(d.training)eveTags.push('Тренировка');
   if(d.overwork&&d.work>540)eveTags.push('Работа допоздна');
   if(d.i<HappySample.EVENTS.instagramHidden&&d.screen>330)eveTags.push('Instagram');
   if(d.marathon){
    /* тег живёт в своём разделе: «Бессонная ночь» — утро, остальное — вечер */
    put('wake',7,{wakeup:w*.5,sleepy:bad,anx:bad,drive:w*.6},['Бессонная ночь']);
    put('eve',22,{energy:w,focus:w*.6,drive:w*.5,anx:bad},eveTags);
   }else{
    var count=m<=2?(r()<.5?1:2):m<=4?(r()<.4?2:3):m<=6?(r()<.3?3:4):(r()<.25?4:5);
    var wakeTags=[];if(d.medicine)wakeTags.push('Антидепрессант');if(d.phone)wakeTags.push('Сразу в телефон');if(m>=3&&r()<.8)wakeTags.push('Умывание');
    put('wake',wake,{wakeup:w-(d.sleep<6?.12:0)+(d.crash?-.1:0),sleepy:bad+(d.sleep>10?.1:0),anx:bad*(m<5?1:.85),drive:w},wakeTags);
    var pick=['eve','am','pm','dn'].slice(0,count-1);
    if(pick.indexOf('am')>=0)put('am',wake+1.2,{energy:w+(d.sweet?.1:0),focus:w+(d.sweet?.02:.05),drive:w,anx:bad*.9},
     [d.sweet?'Сладкий завтрак':m>=5?'Полноценный завтрак':r()<.5?'Лёгкий завтрак':'Плотный завтрак']);
    var pmTags=[];if(d.nap)pmTags.push('Дневной сон');if(d.therapy)pmTags.push('Психотерапия');if(d.psychiatrist)pmTags.push('Психиатр');if(d.walk&&!d.training)pmTags.push('Прогулка');
    /* сладкое утром — провал после обеда: закономерность, которую Amurio замечает на пятом месяце */
    if(pick.indexOf('pm')>=0||pmTags.length)put('pm',clamp(wake+6,12,17.5),{energy:w-(d.sweet?.22:0)-(d.nap?.05:0),focus:w-(d.sweet?.15:0),drive:w-(d.sweet?.1:0),anx:bad},pmTags);
    if(pick.indexOf('dn')>=0)put('dn',clamp(wake+10,18,21.5),{energy:w,focus:w-.03,drive:w,anx:bad*.9},[]);
    if(pick.indexOf('eve')>=0||eveTags.length)put('eve',clamp(d.bed==null||d.bed<12&&d.bed>=0?23.3:d.bed+23,21.5,23.7),
     {energy:w+(d.training?.08:0)-(d.overwork?.1:0),focus:w-.05,drive:w,anx:bad*(d.walk||d.training?.75:1)+(d.grief?.1:0)},eveTags);
   }
   e.cnt={screen:d.screen};if(d.work>20)e.cnt.work=d.work;
   var coffee=d.marathon?5:Math.round(clamp((m<=2?3.5:m<=5?2.5:1.5)+(r()-.5)*2,0,6));
   if(coffee){e.taps={coffee:[]};for(var k=0;k<coffee;k++)e.taps.coffee.push({t:hm(clamp(wake+.3+k*2.4+r(),0,23.5)),n:1})}
   days[d.date]=e;
  });
  return days;
 }
 /* день без записей: приложение само заводит пустой сегодняшний день при открытии */
 function blank(e){
  var has=function(x){return !!x&&typeof x==='object'&&Object.keys(x).some(function(k){var v=x[k];return v!=null&&v!==''&&!(typeof v==='object'&&!Object.keys(v).length)})};
  return !e||!(has(e.cp)||has(e.tags)||has(e.cnt)||has(e.taps)||has(e.cntLog)||has(e.num)||has(e.screen)||e.note||e.train||(e.now&&e.now.length));
 }
 function shared(name){try{return DayBoot.store.shared('sport',name)}catch(e){return null}}
 async function fill(){
  if(!allowed())return;
  if(Object.keys(DB.days||{}).some(function(d){return !blank(DB.days[d])})){toast('В дневнике уже есть записи. Пример кладётся только в пустой дневник.');return}
  Object.keys(TAGS).forEach(function(key){
   var S=DB.sections.filter(function(x){return x.k===key})[0];
   TAGS[key].forEach(function(t){if(DB.tags.indexOf(t)<0)DB.tags.push(t);if(S){S.tags=S.tags||[];if(S.tags.indexOf(t)<0)S.tags.push(t)}});
  });
  DB.days=build();
  saveNow();
  var result=await HappySample.fillShared(shared('body'),shared('profile'));
  renderAll();
  toast('Пример Amurio: '+Object.keys(DB.days).length+' дней'+(result.measurements?' и '+result.measurements+' замеров':''));
 }
 async function clear(){
  if(!allowed())return;
  DB.days={};saveNow();
  var n=await HappySample.clearShared(shared('body'));
  renderAll();
  toast('Пример убран'+(n?': дни и '+n+' замеров':''));
 }
 function paint(){var box=document.getElementById('sampleBox');if(box)box.hidden=!allowed()}
 document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('[data-sample]');if(!b)return;
  b.disabled=true;
  (b.getAttribute('data-sample')==='fill'?fill():clear()).catch(function(err){toast(String(err&&err.message||err))}).then(function(){b.disabled=false});
 });
 window.DaySample={build:build,fill:fill,clear:clear,paint:paint,allowed:allowed};
 if(window.DayBoot&&DayBoot.ready&&DayBoot.ready.then)DayBoot.ready.then(paint,paint);
 document.addEventListener('pointerdown',paint,true);
})();
