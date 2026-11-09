/* Personal Day settings and device-originated time. Account records contain
   domain data only. Authentication and shared app caches keep their own keys. */
(function(root) {
  'use strict';
  const copy=v=>JSON.parse(JSON.stringify(v));
  const dayKeys=['weight','kcal','prot'];
  let ready=false,renderedConflicts=null;
  function device(){
    const owner=root.HappyProfile?.owner;
    if(!owner||owner==='local')return null;
    const k=root.HappyProfile.key('hd_profile_source_v1');
    let id=root.localStorage.getItem(k);
    if(!id){id=root.crypto.randomUUID();root.localStorage.setItem(k,id);if(root.localStorage.getItem(k)!==id)throw Error('Не удалось сохранить источник времени в профиле.');}
    return id;
  }
  function captureGoals(){
    if(!ready||!root.CFG||root.HappyProfile?.owner==='local')return;
    const val=Object.fromEntries(dayKeys.map(k=>[k,Number.isFinite(root.CFG[k])?root.CFG[k]:null]));
    if(root.DB.accountPreferences?.goals||Object.values(val).some(x=>x!==null)){
      (root.DB.accountPreferences||={}).goals=val;
    }
  }
  function renderPreferences(db) {
    if(!root.CFG)return;
    const goals=db.accountPreferences?.goals||{};
    for(const k of dayKeys) {
      root.CFG[k]=Number.isFinite(goals[k])?goals[k]:null;
      const e=root.document?.getElementById('cfg'+k[0].toUpperCase()+k.slice(1));
      if(e)e.value=root.CFG[k]??'';
    }
    root.dispatchEvent?.(new root.CustomEvent('happy-profile-appearance'));
    if(db.accountPreferences?.arc)root.dispatchEvent?.(new root.CustomEvent('happy-arc-style',{detail:db.accountPreferences.arc}));
    renderConflicts();
  }
  function begin(){
    ready=true;
    if(root.HappyProfile?.owner==='local')return;
    if(!root.DB.accountPreferences?.goals)captureGoals();
    capturePendingArc();captureTime();renderPreferences(root.DB);
  }
  function captureTime(){
    if(!ready||root.HappyProfile?.owner==='local')return;
    const days={};
    for(const [date,d] of Object.entries(root.DB.days||{})) {
      if(d.mind?.sec>0&&Array.isArray(d.mind.ss)) days[date]=copy(d.mind);
    }
    if(!Object.keys(days).length)return;
    const id=device(), all=root.DB.accountActivity||={};
    // Raw sessions from another device are never filed under this device.
    // Keep prior days outside this local view (e.g. after a cloud restore).
    all[id]={...all[id],...days};
  }
  function relatedTime(date){
    const sources=root.DB?.accountActivity;
    if(!sources)return [];
    return Object.keys(sources).sort().map(id=>sources[id]?.[date]?.sec).filter(sec=>Number.isFinite(sec)&&sec>0);
  }
  function capturePendingArc(){
    if(!ready||root.HappyProfile?.owner==='local')return;
    const key=root.HappyProfile.key('happy-day.arc-style.v1')+':pending';
    const raw=root.localStorage.getItem(key);
    if(!raw)return;
    try{
      const cfg=JSON.parse(raw);
      if(cfg?.version!==1 || !Array.isArray(cfg.colors) || cfg.colors.length!==3)return;
      const prefs=root.DB.accountPreferences||={};
      if(JSON.stringify(prefs.arc)!==JSON.stringify(cfg))appearance('arc',cfg);
      // Never discard the hand-off before the account's own local DB contains it.
      const physical=root.HappyProfile.key(root.K.db),journal=root.dayStorage||root.localStorage; // Update 56: the journal is read through the IndexedDB facade
      if(JSON.stringify(JSON.parse(journal.getItem(physical)||'{}').accountPreferences?.arc)===JSON.stringify(cfg)
          && root.localStorage.getItem(key)===raw)root.localStorage.removeItem(key);
    }catch(_){} // Keep the original pending value for the next open/focus.
  }
  root.addEventListener?.('storage',e=>{if(ready&&e.key===root.HappyProfile?.key('happy-day.arc-style.v1')+':pending')capturePendingArc();});
  root.addEventListener?.('focus',capturePendingArc);
  function appearance(kind,value){
    if(!ready||!root.DB||root.HappyProfile?.owner==='local')return;
    const prefs=root.DB.accountPreferences||={};prefs[kind]=copy(value);root.save();
  }
  function renderConflicts(){
    const conflicts=root.DB?.accountConflicts||{}, doc=root.document;
    const section=doc?.querySelector('[data-happy-section="account"]');
    if(!section)return;
    let panel=doc.getElementById('profile-conflicts');
    if(!panel&&!Object.keys(conflicts).length)return;
    if(!panel){panel=doc.createElement('details');panel.id='profile-conflicts';panel.className='happy-card';section.append(panel);}
    const ids=Object.keys(conflicts);panel.hidden=!ids.length;
    const revision=JSON.stringify(conflicts);if(renderedConflicts===revision&&panel.childElementCount)return;renderedConflicts=revision;
    const summary=doc.createElement('summary');summary.textContent='Разные версии записей · '+ids.length;
    panel.replaceChildren(summary);
    for(const id of ids){
      const e=conflicts[id],title=doc.createElement('p');
      title.textContent=e.path.map(x=>typeof x==='string'?x:(x.id||'Порядок')).join(' / ');panel.append(title);
      e.choices.forEach((item,i)=>{
        const button=doc.createElement('button');button.type='button';button.className='happy-button';
        const v=item.present?(typeof item.value==='string'?item.value:JSON.stringify(item.value)):'Удалить значение';
        button.textContent='Выбрать: '+v.slice(0,160);button.title=v;
        button.onclick=async()=>{
          if(!await root.confirmBox('Использовать этот вариант в профиле?','Выбрать вариант'))return;
          // The account may have changed while the user was deciding.
          if(!root.HappyProfile.matches(root.HappyProfile.owner)||root.DB.accountConflicts?.[id]!==e)return;
          if(root.HappyDayProfileData.resolve(root.DB,id,i)){root.save();renderPreferences(root.DB);root.renderAll();}
        };
        panel.append(button);
      });
    }
  }
  root.DayAccountData={begin,captureGoals,captureTime,relatedTime,appearance,renderPreferences,renderConflicts};
})(globalThis);
