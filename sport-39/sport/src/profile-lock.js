/* One full-journal writer per origin, acquired BEFORE migration or app boot.
 * A second tab cannot edit or sync. Browser releases the lock when this page closes.
 * Measurement embeds have a separate store and never write the full Sport journal.
 */
var SportWriterLock={held:false,embed:new URLSearchParams(location.search).get('embed')==='measurements'};
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
if(SportWriterLock.embed)sportStartApp();
else if(!navigator.locks?.request)sportBootBlocked('В этой вкладке недоступна безопасная запись журнала. Запись и синхронизация отключены; данные не изменены. Для работы открой Sport отдельно в обновлённом браузере.');
else {
  const LOCK='auth-readonly-happy-sport-full-journal-writer-v1';
  // Update 38.3: the lock is released on pagehide (back/forward cache). On return the page
  // takes the lock again in place instead of reloading.
  // Update 38.4: a second tab is never blocked — it takes the journal over (Web Locks `steal`);
  // the tab that loses the lock stops writing and shows a banner with «Продолжить здесь».
  // Whichever tab the owner is looking at owns the journal; stale in-memory data never writes back.
  function sportLockLost(){
    if(sportReadOnlyActive)return;
    SportWriterLock.held=false;sportReadOnlyActive=true;++sportReadOnlyGeneration;
    if(document.getElementById('sport-lock-banner'))return;
    const bar=document.createElement('div');bar.id='sport-lock-banner';bar.className='sport-lock-banner';bar.setAttribute('role','status');
    const text=document.createElement('span');text.textContent='Sport открыт в другом окне — здесь только просмотр.';
    const resume=document.createElement('button');resume.type='button';resume.className='button';resume.textContent='Продолжить здесь';resume.addEventListener('click',()=>location.reload());
    bar.append(text,resume);document.body.appendChild(bar);
  }
  function holdLock(onHeld){
    return navigator.locks.request(LOCK,{mode:'exclusive',steal:true},async lock=>{
      if(!lock){onHeld(false);return;}
      SportWriterLock.held=true;onHeld(true);
      await new Promise(resolve=>window.addEventListener('pagehide',()=>{SportWriterLock.held=false;resolve()},{once:true}));
    }).catch(error=>{
      if(error&&error.name==='AbortError'&&SportWriterLock.held){sportLockLost();return;}
      throw error;
    });
  }
  window.addEventListener('pageshow',event=>{
    if(!event.persisted||SportWriterLock.held||sportReadOnlyActive)return;
    holdLock(held=>{if(!held)location.reload()}).catch(()=>location.reload());
  });
  holdLock(held=>{
    if(!held){sportBootBlocked('Не удалось получить право записи журнала. Нажми «Повторить открытие».');return;}
    sportStartApp();
  }).catch(()=>sportBootBlocked('Не удалось защитить запись журнала. Закрой другие вкладки Sport и повтори. Данные не изменены.'));
}
