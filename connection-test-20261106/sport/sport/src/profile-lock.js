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
    for(const [key,label] of candidates){
      const raw=localStorage.getItem(key);if(!raw||seen.has(raw))continue;let data;try{data=JSON.parse(raw)}catch{continue}
      if(data?.version!==1||(data.sportOwner||'local')!==owner)continue;seen.add(raw);
      const button=document.createElement('button');button.className='button';button.style.marginTop='12px';button.textContent=label;
      button.addEventListener('click',()=>{
        let url;
        try{
          // Never export the payload captured when these controls were rendered.
          // Fence the exact persisted session/key and UI generation, including a
          // storage event's A→B→A cycle, before reading and immediately before download.
          if(!current()){changed();return;}
          const fresh=JSON.parse(localStorage.getItem(key)||'null');
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
function sportStartApp(){if(!globalThis.SportReadOnlyTest?.ready){sportBootBlocked('Защита чтения не запустилась. Вход и приложение отключены; записи не изменены. Обнови страницу.');return;}sportReadOnlyActive=false;++sportReadOnlyGeneration;const script=document.createElement('script');script.textContent=document.getElementById('sport-app-source').textContent;document.body.appendChild(script);}
if(SportWriterLock.embed)sportStartApp();
else if(!navigator.locks?.request)sportBootBlocked('В этой вкладке недоступна безопасная запись журнала. Запись и синхронизация отключены; данные не изменены. Для работы открой Sport отдельно в обновлённом браузере.');
else navigator.locks.request('auth-readonly-happy-sport-full-journal-writer-v1',{mode:'exclusive',ifAvailable:true},async lock=>{
  if(!lock){sportBootBlocked('Sport уже открыт в другой вкладке. Чтобы не перезаписать записи, закрой её и нажми «Повторить открытие».');return;}
  SportWriterLock.held=true;
  const closed=new Promise(resolve=>window.addEventListener('pagehide',()=>{SportWriterLock.held=false;resolve()},{once:true}));
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
  sportStartApp();await closed;
}).catch(()=>sportBootBlocked('Не удалось защитить запись журнала. Закрой другие вкладки Sport и повтори. Данные не изменены.'));
