/* Day 59 · счётчики еды из Happy Meal.
   Счётчик (название, продукт, порция) принадлежит Meal: Day читает его из витрины meal/foods и показывает, если
   Meal назначил его в Day. Нажатие принадлежит Day: каждое — отдельная запись его документа foodtaps, Meal читает
   их оттуда. В дневнике в памяти счётчики Meal и их нажатия — только вид: DB.taps (mealCounterId) и day.taps
   (counterEventId); в свои настройки и дни Day их не кладёт (day-docs.js). Формат записей — shared/happy-food.js.
   Название, продукт и порция такого счётчика меняются в Happy Meal. Убрать счётчик со страницы Day можно здесь
   (Астамур 14.11.2026 22:34): в документ нажатий кладётся отметка, Day счётчик больше не показывает, а Meal
   выключает у него показ в Day. Сам счётчик и записанные порции остаются. Порцию может поправить и убрать и Meal. */
(function(root){
  'use strict';
  const F=root.HappyFood,clone=x=>JSON.parse(JSON.stringify(x));
  let baseSave=null,baseline={},applying=false,started=false;
  const signedIn=()=>!!(root.DayData&&root.DayData.signedIn());
  const tapsDoc=()=>signedIn()?root.DayData.store.doc(F.TAPS.name):null;
  const foodsDoc=()=>signedIn()?root.DayData.store.neighbor(F.FOODS.app,F.FOODS.name):null;
  /* счётчики Meal, показанные в Day */
  function foods(){
    const d=foodsDoc(),t=tapsDoc();if(!d||d.newer)return [];
    const off=t&&!t.newer?F.hidden(t.all()):{};   // убранные со страницы Day, пока Meal не выключил им показ
    return F.foods(d.all()).filter(x=>F.linked(x,'day')&&!off[x.id]);
  }
  /* свои нажатия; сделанные, пока связь с Meal выключена, не учитываются */
  function taps(){
    const d=tapsDoc();if(!d||d.newer)return [];
    return F.taps(d.all()).filter(t=>!root.DayAppLinks||root.DayAppLinks.mealEventOn(t.date,t.item&&t.item.t,t.at));
  }
  /* вид в дневнике: счётчики Meal среди счётчиков Day и их нажатия по дням */
  function apply(){applying=true;try{
    const defs=foods(),ids=new Set(defs.map(d=>d.id));
    root.DB.taps=root.DB.taps.filter(c=>!c.mealCounterId||ids.has(c.mealCounterId));
    defs.forEach(d=>{let c=root.DB.taps.find(c=>c.mealCounterId===d.id);if(!c){c={k:'meal-'+d.id};root.DB.taps.push(c)}Object.assign(c,{t:d.title,step:1,mealCounterId:d.id,mealPortion:F.portion(d)})});
    Object.values(root.DB.days).forEach(day=>Object.keys(day.taps||{}).forEach(k=>{day.taps[k]=day.taps[k].filter(x=>!x.counterEventId);if(!day.taps[k].length)delete day.taps[k]}));
    baseline={};
    taps().forEach(t=>{
      baseline[t.id]=t;if(!ids.has(t.cid))return;
      const k='meal-'+t.cid,day=root.day(t.date);day.taps||(day.taps={});day.taps[k]||(day.taps[k]=[]);
      day.taps[k].push({t:t.item.t||null,n:1,counterEventId:t.id});
    });
  }finally{applying=false}}
  /* вид после правки у Meal, на другом устройстве или своего нажатия */
  function refresh(){
    if(!started)return;apply();
    if(root.renderAll)root.renderAll();if(root.renderTapSheet)root.renderTapSheet();
    // порции со счётчиков входят в «съедено» кольца энергии — открытый экран «Активность» пересчитывается сразу
    try{if(root.SelfCare&&root.SelfCare.mealChanged)root.SelfCare.mealChanged()}catch(e){}
  }
  /* нажатия, как они сейчас выглядят в дневнике: время могли поправить, нажатие — снять */
  function values(){
    const out={};
    Object.keys(root.DB.days).forEach(date=>{const t=root.DB.days[date].taps||{};Object.keys(t).forEach(k=>t[k].forEach(rec=>{
      const old=rec.counterEventId&&baseline[rec.counterEventId];if(!old)return;
      const e=clone(old);e.date=date;e.item.t=rec.t||null;out[e.id]=e;
    }))});
    /* нажатия счётчиков, которые сейчас не показаны (Meal убрал счётчик из Day), остаются как есть */
    Object.keys(baseline).forEach(id=>{if(!out[id]&&!root.DB.taps.some(c=>c.mealCounterId===baseline[id].cid))out[id]=baseline[id]});
    return out;
  }
  /* перед каждой записью дневника: правки нажатий уходят в документ foodtaps */
  function capture(){
    if(applying||!started)return;const d=tapsDoc();if(!d||d.newer)return;
    const now=values(),changes=[];
    Object.keys(now).forEach(id=>{if(JSON.stringify(now[id])!==JSON.stringify(baseline[id])){const value=clone(now[id]);delete value.id;changes.push({id,value})}});
    Object.keys(baseline).forEach(id=>{if(!now[id])changes.push({id,deleted:true})});
    baseline=now;
    if(changes.length){d.putMany(changes).catch(root.DayData.report);try{if(root.SelfCare&&root.SelfCare.mealChanged)root.SelfCare.mealChanged()}catch(e){}}
  }
  const short=d=>typeof d.portionText==='string'&&d.portionText.trim()&&d.portionText.length<=80?d.portionText.trim():d.q+' '+d.u;
  function init(){
    if(started)return;started=true;
    baseSave=root.save;root.save=function(){try{capture()}catch(e){root.toast(e.message)}baseSave()};
    const oldAdd=root.tapAdd;root.tapAdd=function(k){
      const c=root.tapDef(k);if(!c||!c.mealCounterId)return oldAdd(k);if(root.lockGuard())return;
      const d=foods().find(x=>x.id===c.mealCounterId),doc=tapsDoc();if(!d||!doc)return;
      const t=root.curDate===root.todayISO()?root.nowHM():null;
      doc.put(F.tapId('day'),F.tap(d,root.curDate,t)).catch(root.DayData.report);
      refresh();root.toast(d.title+' +'+short(d)+' · Happy Meal');
    };
    const html=root.tapsHTML;root.tapsHTML=function(e){let result=html(e);root.DB.taps.filter(c=>c.mealCounterId).forEach(c=>{
      result=result.replace('>'+root.escH(c.t)+'</button>','>'+root.escH(c.t)+'<small class="fc-day-portion">'+root.escH(c.mealPortion||'')+' · Meal</small></button>');
    });return result};
    document.getElementById('tapList').addEventListener('click',e=>{
      const b=e.target.closest('[data-ren],[data-del]');if(!b)return;
      const c=root.DB.taps[Number((b.dataset.ren||b.dataset.del).slice(1))];if(!c||!c.mealCounterId)return;
      e.stopImmediatePropagation();
      if(!b.dataset.del){root.toast('Название, продукт и порция этого счётчика настраиваются в Happy Meal.');return}
      root.confirmBox('Убрать счётчик «'+c.t+'» из Happy Day? В Happy Meal он останется, записанные порции — тоже.','Убрать').then(ok=>{
        if(!ok||root.writeGuard())return;
        const doc=tapsDoc(),mark=F.hide(c.mealCounterId);if(!doc||doc.newer)return;
        doc.put(mark.id,mark.value).catch(root.DayData.report);
        refresh();if(root.renderTaps)root.renderTaps();
        root.toast('Счётчик убран из Happy Day. Вернуть: Happy Meal → настройки счётчика → включить Happy Day.');
      });
    },true);
    const f=foodsDoc(),t=tapsDoc();
    if(f)f.subscribe(refresh);
    if(t)t.subscribe(e=>{if(e.origin!=='local')refresh()});
    apply();
  }
  root.HappyDayCounters={init,capture,apply,refresh,foods,taps};
})(globalThis);
