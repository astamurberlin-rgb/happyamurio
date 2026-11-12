/* Boot path of Sport. Up to 38.x one tab held a full-journal Web Lock; since 39.1 every tab writes and the tabs
 * merge (see the end of this file). Measurement embeds have a separate store and never write the full journal.
 */
var SportWriterLock={held:true,embed:new URLSearchParams(location.search).get('embed')==='measurements'};
var sportReadOnlyGeneration=0,sportReadOnlyActive=false;
function sportBootBlocked(message){
  sportReadOnlyActive=true;++sportReadOnlyGeneration;
  const page=document.getElementById('page');page.replaceChildren();
  const title=document.createElement('h1');title.textContent='Журнал защищён';
  const p=document.createElement('p');p.textContent=message;p.style.cssText='margin:20px 0;line-height:1.5';
  const retry=document.createElement('button');retry.className='button';retry.textContent='Повторить открытие';retry.addEventListener('click',()=>location.reload());
  page.append(title,p,retry);sportReadOnlyExports(page);
}
function sportReadOnlyExports(page){
  // Read-only fallback: never boot the app, migrate, authenticate, or contact cloud.
  try{
    const base='auth-readonly-happy-sport-prototype-v1',authKey='auth_readonly_hd_cloud_v1',authRaw=localStorage.getItem(authKey),generation=sportReadOnlyGeneration,owner=JSON.parse(authRaw||'null')?.s?.uid||'local';
    const current=()=>generation===sportReadOnlyGeneration&&localStorage.getItem(authKey)===authRaw;
    const changed=()=>sportBootBlocked('Вход или сохранённая копия изменились. Выбери выгрузку заново для текущего профиля.');
    const candidates=[[base+':profile:'+encodeURIComponent(owner),'Выгрузить сохранённый журнал'],[base,'Выгрузить исходную копию']];
    const seen=new Set();
    // Update 39: journal copies live in IndexedDB once the boot path opened the facade; before that (or without it) they are still in localStorage.
    const journalStore=typeof SportLocalStore!=='undefined'&&SportLocalStore.backend==='indexedDB'?sportStorage:localStorage;
    for(const [key,label] of candidates){
      const raw=journalStore.getItem(key);if(!raw||seen.has(raw))continue;let data;try{data=JSON.parse(raw)}catch{continue}
      if(data?.version!==1||(data.sportOwner||'local')!==owner)continue;seen.add(raw);
      const button=document.createElement('button');button.className='button';button.style.marginTop='12px';button.textContent=label;
      button.addEventListener('click',()=>{
        let url;
        try{
          // Never export the payload captured when these controls were rendered.
          // Fence the exact persisted session/key and UI generation, including a
          // storage event's A→B→A cycle, before reading and immediately before download.
          if(!current()){changed();return;}
          const fresh=JSON.parse(journalStore.getItem(key)||'null');
          if(fresh?.version!==1||(fresh.sportOwner||'local')!==owner||!current()){changed();return;}
          const payload={app:'Happy Sport',version:1,exportedAt:new Date().toISOString(),data:fresh};
          url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
          if(!current()){URL.revokeObjectURL(url);changed();return;}
          const a=document.createElement('a');a.href=url;a.download='happy-sport-readonly-'+new Date().toISOString().slice(0,10)+'.json';
          if(!current()){URL.revokeObjectURL(url);changed();return;}
          a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
        }catch{if(url)URL.revokeObjectURL(url);changed();}
      });page.append(button);
    }
    if(seen.size){const note=document.createElement('p');note.textContent='Это выгрузка уже сохранённой копии. Редактирование и облачная синхронизация здесь отключены.';note.style.marginTop='12px';page.append(note);}
  }catch{}
}
window.addEventListener?.('storage',event=>{if(sportReadOnlyActive&&(event.key==null||event.key==='auth_readonly_hd_cloud_v1'||event.key==='auth-readonly-happy-sport-prototype-v1'||event.key.startsWith('auth-readonly-happy-sport-prototype-v1:profile:')))sportBootBlocked('Вход или сохранённые данные изменились. Проверь текущий профиль перед выгрузкой.');});
/* Update 39: the journal storage (IndexedDB facade) is opened and migrated BEFORE the app script runs, so every
   synchronous read in the app already sees the cache. If IndexedDB is unavailable the facade stays on localStorage. */
function sportStartApp(){if(!globalThis.SportReadOnlyTest?.ready){sportBootBlocked('Защита чтения не запустилась. Вход и приложение отключены; записи не изменены. Обнови страницу.');return;}
  SportLocalStore.open().catch(()=>'localStorage').then(()=>{sportReadOnlyActive=false;++sportReadOnlyGeneration;const script=document.createElement('script');script.textContent=document.getElementById('sport-app-source').textContent;document.body.appendChild(script);});}
/* Update 39.1 (owner, 09.11.2026): no exclusive writer any more — every tab boots as a writer and the tabs merge
   their journals through the storage facade (profile-store.js adopt/save, BroadcastChannel in local-store.js).
   The former Web Lock, the «Журнал защищён» screen and the «Sport открыт в другом окне» banner are gone. Web Locks,
   when the browser has them, only serialize automatic sync runs (automatic-sync-ui.js); without them the cloud
   compare-and-swap still protects the journal. */
SportWriterLock.held=true;
sportStartApp();
