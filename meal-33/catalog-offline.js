/* Meal 28 · «Скачать для работы без интернета» в карточках каталогов (Настройки → Каталоги).
   Настоящая загрузка — HappyFoodLibraries.offline (food-libraries.js): файлы каталога проверяются и только
   целиком ложатся на устройство. Кнопка: стрелка — скачать; кольцо с квадратом — идёт загрузка, нажатие отменяет;
   галочка — скачано, нажатие убирает каталог с телефона (4 с можно «Вернуть», до этого ничего не удаляется);
   стрелка с подписью «Обновить» — на телефоне прежняя версия. «Мои продукты» и так на устройстве — кнопки нет.
   Дизайн кнопки — из прототипа магазина (Михалыч и Астамур, 11.11.2026), там она была только анимацией. */
(function(root){
 'use strict';
 const jobs=new Map(),known=new Map(),removing=new Map();
 let loading=null,loadedAt=0;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const api=()=>root.HappyFoodLibraries&&root.HappyFoodLibraries.offline;
 function downloadable(id){const o=api();return !!o&&o.available()&&o.librariesOf(id).length>0}
 function size(n){return n>=1048576?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n/1048576)+' МБ':Math.max(1,Math.round(n/1024))+' КБ'}
 /* none · loading · saved · update · error · stopped */
 function stateOf(id){
  if(jobs.has(id))return 'loading';
  if(removing.has(id))return 'none';
  const k=known.get(id);return k?k.state:'none';
 }
 function percent(id){const j=jobs.get(id);return j?Math.max(0,Math.min(99,Math.floor(j.progress*100))):0}
 function markup(id){
  if(!downloadable(id))return '';
  const s=stateOf(id),p=percent(id),cls=s==='loading'?' is-loading':s==='saved'?' is-saved':'';
  const title=s==='loading'?'Остановить загрузку':s==='saved'?'Убрать с телефона':s==='update'?'Скачать новую версию':'Скачать для работы без интернета';
  return '<button type="button" class="mc-download'+cls+'" data-catalog-download="'+esc(id)+'" title="'+title+'" aria-label="'+title+'" aria-describedby="catalogOffline-'+esc(id)+'">'+
   '<svg class="mc-download-ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="mc-download-track" cx="22" cy="22" r="19"/><circle class="mc-download-progress" cx="22" cy="22" r="19" pathLength="100" style="stroke-dashoffset:'+(100-p)+'"/></svg>'+
   '<svg class="mc-download-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-6-6 6 6 6-6"/></svg>'+
   '<svg class="mc-download-done" viewBox="0 0 24 24" aria-hidden="true"><path d="m5.5 12.5 4.2 4.2 8.8-9.4"/></svg>'+
   '<span class="mc-download-stop" aria-hidden="true"></span></button>';
 }
 function caption(id){return {loading:'Отменить',saved:'Скачано',update:'Обновить',error:'Повторить'}[stateOf(id)]||'Скачать'}
 function note(id){
  if(!downloadable(id))return '';
  const s=stateOf(id),k=known.get(id)||{};
  if(s==='loading')return 'Скачивание · '+percent(id)+' %';
  if(s==='saved')return 'На телефоне'+(k.size?' · '+size(k.size):'')+' · поиск работает без интернета';
  if(s==='update')return 'Есть новая версия. Скачанная работает, пока не обновишь';
  if(s==='error')return k.message||'Не получилось скачать. Проверь интернет и попробуй ещё раз';
  if(s==='stopped')return 'Скачивание остановлено';
  return 'Скачай, чтобы искать в каталоге без интернета';
 }
 function paint(id){
  const d=root.document,b=d.querySelector('[data-catalog-download="'+id+'"]');if(!b)return;
  const focused=d.activeElement===b;b.outerHTML=markup(id);
  if(focused){const next=d.querySelector('[data-catalog-download="'+id+'"]');if(next)next.focus({preventScroll:true})}
  const n=d.getElementById('catalogOffline-'+id);if(n)n.textContent=note(id);
  const c=d.getElementById('catalogDownloadCaption-'+id);if(c)c.textContent=caption(id);
 }
 function paintAll(){const o=api();if(o)o.catalogs.forEach(paint)}
 /* что уже на телефоне; описание каталогов — то, что Meal прочитал при запуске (без сети — сохранённое) */
 function refresh(force){
  const o=api();if(!o||!o.available())return Promise.resolve();
  if(loading)return loading;if(!force&&loadedAt&&Date.now()-loadedAt<600000)return Promise.resolve();
  loading=(async()=>{
   let live=null;try{const m=await root.HappyFoodLibraries.manifest();live=m&&!m.offline?m:null}catch(e){}
   for(const id of o.catalogs){
    if(jobs.has(id))continue;
    try{const st=await o.status(id,live),prev=known.get(id);if(!(prev&&(prev.state==='error'||prev.state==='stopped')&&st.state==='none'))known.set(id,{state:st.state,size:st.size})}catch(e){}
   }
   loadedAt=Date.now();paintAll();
  })().finally(()=>{loading=null});
  return loading;
 }
 function start(id){
  const o=api();if(!o)return;
  const ctrl=new AbortController(),job={progress:0,ctrl:ctrl,painted:0};jobs.set(id,job);paint(id);
  o.download(id,p=>{job.progress=p;const now=Date.now();if(now-job.painted>150){job.painted=now;paint(id)}},ctrl.signal)
   .then(st=>{known.set(id,{state:st.state,size:st.size})})
   .catch(e=>{
    if(e&&e.name==='AbortError'){known.set(id,{state:'stopped'});return}
    const offline=root.navigator&&root.navigator.onLine===false||e&&(e.name==='TypeError'||/fetch|network|сет|связ/i.test(e.message||''));
    known.set(id,{state:'error',message:offline?'Нет интернета. Каталог скачается, когда появится связь':'Не получилось скачать. Попробуй ещё раз'});
   })
   .finally(()=>{jobs.delete(id);paint(id)});
 }
 /* убрать: сразу видно «Скачать», «Вернуть» — 4 с; удаление — после */
 function remove(id){
  const o=api();if(!o)return;
  const before=known.get(id);
  const timer=setTimeout(()=>{removing.delete(id);o.remove(id).then(()=>known.set(id,{state:'none',size:0}),()=>{if(before)known.set(id,before)}).finally(()=>paint(id))},4200);
  removing.set(id,timer);paint(id);
  if(typeof root.toast==='function')root.toast('Каталог убран с телефона',()=>{clearTimeout(removing.get(id));removing.delete(id);paint(id)});
 }
 function press(id){
  const s=stateOf(id);
  if(s==='loading'){const j=jobs.get(id);if(j)j.ctrl.abort();return}
  if(s==='saved'){remove(id);return}
  if(removing.has(id)){clearTimeout(removing.get(id));removing.delete(id);paint(id);return}
  start(id);
 }
 root.document.addEventListener('click',e=>{const b=e.target.closest('[data-catalog-download]');if(!b)return;e.preventDefault();press(b.dataset.catalogDownload)});
 root.HappyCatalogOffline={markup,caption,note,refresh,downloadable,state:stateOf};
})(window);
