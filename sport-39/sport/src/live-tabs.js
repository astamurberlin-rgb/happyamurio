/* Update 39.1 · live tabs. Every Sport tab writes; a journal stored by another tab is merged into this tab's
 * in-memory state (profile-store.js adopt → SportControlledCAS.mergeData: record lists by id, this tab's value for a
 * field changed in both) and the screen is redrawn — unless a sheet is open or a workout is being edited, then the
 * redraw waits for the sheet to close. Triggers: the storage channel (local-store.js BroadcastChannel), the tab
 * becoming visible or focused, and every automatic-sync step (sportAutoSaved). No banners, no reloads. */
let sportAdoptPending=false,sportAdoptBusy=false;
function sportAdoptExternal(){
  if(typeof SPORT_MEASURE_EMBED!=='undefined'&&SPORT_MEASURE_EMBED)return false;
  if(sportAdoptBusy||typeof state==='undefined'||!state)return false;
  sportAdoptBusy=true;
  try{
    const result=SportProfiles.adopt(clone(state));
    if(!result.changed)return false;
    const next=result.data;
    for(const k of Object.keys(state))if(!Object.hasOwn(next,k))delete state[k];
    Object.assign(state,next);
    if(typeof sportAutoObserved!=='undefined')sportAutoObserved=SportControlled.canonical(sportBackup().data);
    if(sheetKind||document.querySelector('#modal-root .sheet'))sportAdoptPending=true;else render();
    return true;
  }catch(e){return false}
  finally{sportAdoptBusy=false}
}
function sportAdoptAfterSheet(){if(!sportAdoptPending)return;sportAdoptPending=false;try{render()}catch{}}
/* persist() merged another tab's journal into state: redraw now, or after the open sheet closes. */
function sportAfterMerge(){if(typeof sportAutoObserved!=='undefined')sportAutoObserved=SportControlled.canonical(sportBackup().data);if(sheetKind||document.querySelector('#modal-root .sheet'))sportAdoptPending=true;else render();}
(()=>{
  const key=SportProfiles.key();
  SportLocalStore.onChange(k=>{if(k===key)sportAdoptExternal()});
  const poke=()=>{SportLocalStore.refresh(key).then(()=>sportAdoptExternal()).catch(()=>sportAdoptExternal())};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)poke()});
  window.addEventListener('focus',poke);
  window.addEventListener('pageshow',event=>{if(event.persisted)poke()});
  const liveClose=closeSheet;closeSheet=function(...args){const r=liveClose(...args);sportAdoptAfterSheet();return r};
})();
