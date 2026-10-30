(function(root){
  'use strict';
  const H=root.HappyFoodCounters,clone=H.copy;
  let engine,baseSave,baseline={},definitions={},applying=false;
  const owner=()=>root.HappyProfile?root.HappyProfile.owner:(root.CL.s&&root.CL.s.uid||'local');
  const currentOwner=()=>root.CL.s&&root.CL.s.uid||'local';
  function values(){const out={};Object.keys(root.DB.days).forEach(date=>{const taps=root.DB.days[date].taps||{};Object.keys(taps).forEach(k=>taps[k].forEach(rec=>{if(!rec.counterEventId)return;const old=baseline[rec.counterEventId];if(!old)return;
    const e=clone(old);e.date=date;e.item.t=rec.t||null;if(e.item.t!==old.item.t)e.item.tm=1;out[e.id]=e;
  }))});return out;}
  function capture(){if(applying||!engine)return;
    const now=values();Object.keys(now).forEach(id=>{if(!H.same(now[id],baseline[id]))engine.update('events',now[id])});
    Object.keys(baseline).forEach(id=>{if(!now[id])engine.update('events',{id,cid:baseline[id].cid,date:baseline[id].date,deleted:true})});
    const present=new Set(root.DB.taps.filter(c=>c.mealCounterId).map(c=>c.mealCounterId));
    Object.keys(definitions).forEach(id=>{if(!present.has(id)){engine.update('definitions',{...definitions[id],deleted:true});delete definitions[id]}});
    baseline=now;root.DB.mealCounters=engine.document();
  }
  function apply(doc){applying=true;try{
    const active=doc.definitions.filter(d=>!d.deleted),ids=new Set(doc.definitions.map(d=>d.id));
    root.DB.taps=root.DB.taps.filter(c=>!c.mealCounterId||!ids.has(c.mealCounterId)||active.some(d=>d.id===c.mealCounterId));
    definitions={};active.forEach(d=>{let c=root.DB.taps.find(c=>c.mealCounterId===d.id);if(!c){c={k:'meal-'+d.id};root.DB.taps.push(c)}Object.assign(c,{t:d.title,step:1,mealCounterId:d.id,mealPortion:d.q+' '+d.u+' · '+d.g+' г'});definitions[d.id]=clone(d)});
    const known=new Set(doc.events.map(e=>e.id));Object.values(root.DB.days).forEach(day=>Object.keys(day.taps||{}).forEach(k=>{day.taps[k]=day.taps[k].filter(x=>!known.has(x.counterEventId))}));
    baseline={};doc.events.filter(e=>!e.deleted).sort((a,b)=>(a.created||a.rev)-(b.created||b.rev)||a.id.localeCompare(b.id)).forEach(e=>{const c=root.DB.taps.find(c=>c.mealCounterId===e.cid),k=c?c.k:'meal-'+e.cid,day=root.day(e.date);day.taps=day.taps||{};day.taps[k]=day.taps[k]||[];
      day.taps[k].push({t:e.item.t||null,n:1,counterEventId:e.id});const b=clone(e);delete b.rev;delete b.writer;baseline[e.id]=b;
    });
    root.DB.mealCounters=clone(doc);baseSave();if(root.renderAll)root.renderAll();if(root.renderTapSheet)root.renderTapSheet();
  }finally{applying=false}}
  function status(s){const el=document.getElementById('foodCounterStatus');if(el)el.textContent=s}
  function init(){if(root.RO)return;
    baseSave=root.save;root.save=function(){try{capture()}catch(e){root.toast(e.message)}baseSave()};
    const oldAdd=root.tapAdd;root.tapAdd=function(k){const c=root.tapDef(k);if(!c||!c.mealCounterId)return oldAdd(k);if(root.lockGuard())return;
      try{if(!engine)throw new Error('Связь со счётчиками недоступна. Перезагрузи приложение.');engine.refresh();const d=engine.document().definitions.find(d=>d.id===c.mealCounterId&&!d.deleted);if(!d)return;
        const t=root.curDate===root.todayISO()?root.nowHM():null,h=t?Number(t.slice(0,2)):12,sec=h<11?'am':h<16?'pm':h<21?'dn':'sn';
        engine.update('events',{id:'serving:'+H.id(),cid:d.id,date:root.curDate,item:{fid:d.fid,q:d.q,u:d.u,g:d.g,t,sec,counterFood:clone(d.food)}});
        apply(engine.document());root.toast(d.title+' +'+d.q+' '+d.u+' · Happy Meal');
      }catch(e){root.toast(e.message)}
    };
    const html=root.tapsHTML;root.tapsHTML=function(e){let result=html(e);root.DB.taps.filter(c=>c.mealCounterId).forEach(c=>{
      result=result.replace('>'+root.escH(c.t)+'</button>','>'+root.escH(c.t)+'<small class="fc-day-portion">'+root.escH(c.mealPortion||'')+' · Meal</small></button>');
    });return result+'<p class="happy-note food-counter-status" id="foodCounterStatus" role="status">'+root.escH(engine?engine.status():'')+'</p>'};
    document.getElementById('tapList').addEventListener('click',e=>{const b=e.target.closest('[data-ren]');if(!b)return;const c=root.DB.taps[Number(b.dataset.ren.slice(1))];if(c&&c.mealCounterId){e.stopImmediatePropagation();root.toast('Название, продукт и порция этого счётчика настраиваются в Happy Meal.')}},true);
    try{engine=H.create({owner:owner(),currentOwner,backup:root.DB.mealCounters,apply,capture,status,online:root.clOn,get:()=>H.transport().get(),put:(...a)=>H.transport().put(...a)})}catch(e){root.toast(e.message)}
    const after=root.clAfterIn;root.clAfterIn=function(){if(engine)engine.sync();return after&&after()};
  }
  root.HappyDayCounters={init,capture,apply};
})(globalThis);
