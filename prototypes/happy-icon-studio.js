/* Happy Icon Studio v1 — public image library; no access to Happy journal storage. */
'use strict';
(function(){
const REPO='astamurberlin-rgb/happyamurio';
const KEY='happy_icon_studio_v1';
const CATEGORIES=[
  ['strength','Силовые и зал'],['cardio','Бег и кардио'],['water','Водные виды'],
  ['games','Игровые и единоборства'],['winter','Зимние и ролики'],
  ['wellness','Разминка и восстановление'],['outdoor','Природа и движение'],
  ['adaptive','Адаптивный спорт'],['other','Другое']
];
const CATEGORY_MAP={strength:[1,2,3,4,5,6,7,8,9],cardio:[10,11,12,13,17,36],water:[14,31,32],
  games:[19,20,21,22,23,24,25,26],winter:[28,29,30],wellness:[15,16,18],
  outdoor:[33,34],adaptive:[35],other:[37]};
const LABELS={done:'Готово · PNG',review:'Кандидат',todo:'Не сделано'};
const SYMBOLS={strength:'▰',cardio:'↗',water:'≈',games:'◈',winter:'✳',wellness:'✦',outdoor:'⌁',adaptive:'◉',other:'+'};
const $=id=>document.getElementById(id);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categoryName=id=>(CATEGORIES.find(x=>x[0]===id)||['other','Другое'])[1];
let manifest={reviewIds:[],planned:[]},items=[],filtered=[],selected='sport:07_pullup_bar_rings';
let app='sport',filterStatus='all',mode='light',iconSize=68,mediaDb=null,toastTimer;
let state={status:{},notes:{},custom:[]};
const media={};

function notify(s){const el=$('toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800);}
function readState(){try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');return {status:d.status&&typeof d.status==='object'?d.status:{},notes:d.notes&&typeof d.notes==='object'?d.notes:{},custom:Array.isArray(d.custom)?d.custom:[]};}catch(e){return {status:{},notes:{},custom:[]};}}
function saveState(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){notify('Не удалось сохранить в браузере. Экспортируй JSON.');}}
function categoryFor(n){return Object.keys(CATEGORY_MAP).find(k=>CATEGORY_MAP[k].includes(Number(n)))||'other';}
function safeUrl(s){if(!s)return '';try{const u=new URL(s,location.href);if(u.protocol==='https:'||u.origin===location.origin&&u.protocol==='http:')return u.href;}catch(e){}return '';}
function allItems(){return items.concat(state.custom.map(c=>Object.assign({variant:'planned',origin:'custom',status:c.src?'review':'todo'},c)));}
function findItem(id){return allItems().find(i=>i.id===id);}
function statusOf(i){return ['done','review','todo'].includes(state.status[i.id])?state.status[i.id]:i.status;}
function noteOf(i){return Object.prototype.hasOwnProperty.call(state.notes,i.id)?state.notes[i.id]:(i.note||'');}
function imageOf(i){return media[i.id]||(i.src?safeUrl(i.src):'');}
function currentLabel(i){return i.label+(i.character?' · '+i.character:'');}
function imageMarkup(i,cls){const src=imageOf(i);return src?'<img class="'+(cls||'')+'" src="'+esc(src)+'" alt="'+esc(i.label)+'" loading="lazy" decoding="async">':'<span class="placeholder-sign" aria-hidden="true">'+esc(SYMBOLS[i.category]||'+')+'</span>';}
function openDb(){return new Promise(resolve=>{if(!window.indexedDB){resolve(null);return;}try{const q=indexedDB.open('happy-icon-studio-images-v1',1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('images'))q.result.createObjectStore('images');};q.onsuccess=()=>resolve(q.result);q.onerror=()=>resolve(null);}catch(e){resolve(null);}});}
function mediaGet(id){return new Promise(resolve=>{if(!mediaDb){resolve(null);return;}try{const r=mediaDb.transaction('images','readonly').objectStore('images').get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>resolve(null);}catch(e){resolve(null);}});}
function mediaPut(id,value){return new Promise(resolve=>{if(!mediaDb){resolve(false);return;}try{const tx=mediaDb.transaction('images','readwrite');tx.objectStore('images').put(value,id);tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);}catch(e){resolve(false);}});}
function mediaClear(){return new Promise(resolve=>{if(!mediaDb){resolve();return;}try{const tx=mediaDb.transaction('images','readwrite');tx.objectStore('images').clear();tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();}catch(e){resolve();}});}
function fileAsDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader;r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Файл не прочитан'));r.readAsDataURL(file);});}
async function loadMedia(){for(const item of state.custom){const s=await mediaGet(item.id);if(typeof s==='string'&&s.startsWith('data:image/'))media[item.id]=s;}}
function setupOptions(){
  for(const id of ['category','new-category']){$(id).innerHTML=(id==='category'?'<option value="all">Все виды</option>':'')+CATEGORIES.map(([val,label])=>'<option value="'+val+'">'+esc(label)+'</option>').join('');}
  $('new-category').value='strength';
}
async function start(){
  setupOptions();state=readState();mediaDb=await openDb();await loadMedia();bind();
  try{
    const [catalogResponse,manifestResponse]=await Promise.all([fetch('../sport/sport-icons/catalog.json',{cache:'no-cache'}),fetch('./happy-icon-studio-manifest.json',{cache:'no-cache'})]);
    if(!catalogResponse.ok||!manifestResponse.ok)throw new Error('HTTP '+catalogResponse.status+' / '+manifestResponse.status);
    const catalog=await catalogResponse.json();manifest=await manifestResponse.json();
    if(!Array.isArray(catalog)||!Array.isArray(manifest.planned))throw new Error('Некорректный каталог');
    items=catalog.map(c=>({
      id:c.id,label:c.label,title:c.title,number:c.number,
      category:categoryFor(c.number),variant:c.group,origin:'github',
      src:'../sport/'+c.src,character:'',
      status:manifest.reviewIds.includes(c.id)?'review':'done',
      note:manifest.reviewIds.includes(c.id)?'Есть PNG в GitHub, но требуется сравнение с новым вариантом.':'Файл существует в GitHub. Это не означает окончательное художественное утверждение.'
    })).concat(manifest.planned.map(p=>({
      id:p.id,label:p.label,category:p.category||'other',variant:'planned',origin:'plan',
      character:p.character||'',src:'',status:'todo',note:p.note||''
    })));
    if(!allItems().some(i=>i.id===selected))selected=allItems()[0]?.id;
    render();
  }catch(e){$('icon-grid').innerHTML='<div class="empty" style="display:block;grid-column:1/-1">Не удалось открыть каталог PNG. Запусти студию с GitHub Pages. <a href="../sport/sport-icons/catalog.json">Проверить источник ↗</a></div>';$('results-count').textContent='Ошибка загрузки';notify('Ошибка загрузки каталога: '+e.message);}
}
function counts(){const vals=allItems().map(statusOf);return {total:vals.length,done:vals.filter(v=>v==='done').length,review:vals.filter(v=>v==='review').length,todo:vals.filter(v=>v==='todo').length};}
function renderStats(){
  const c=counts();$('sport-total').textContent=c.total||'—';
  $('stats').innerHTML=[
    ['◈',c.total,'Всего позиций'],['✓',c.done,'Готово по статусу'],['◌',c.review,'На утверждение'],['＋',c.todo,'Ещё не сделано']
  ].map(x=>'<div class="stat"><span class="stat-icon">'+x[0]+'</span><div><strong>'+x[1]+'</strong><span>'+x[2]+'</span></div></div>').join('');
}
function renderGrid(){
  const q=$('search').value.trim().toLocaleLowerCase('ru'),cat=$('category').value,variant=$('variant').value,sort=$('sort').value;
  filtered=allItems().filter(i=>(!q||(i.label+' '+i.title+' '+i.character+' '+i.id+' '+categoryName(i.category)).toLocaleLowerCase('ru').includes(q))&&(cat==='all'||i.category===cat)&&(variant==='all'||(variant==='planned'?['planned'].includes(i.variant):i.variant===variant))&&(filterStatus==='all'||statusOf(i)===filterStatus));
  const rank={done:0,review:1,todo:2},categoryOrder=CATEGORIES.map(x=>x[0]);
  filtered.sort((a,b)=>sort==='name'?a.label.localeCompare(b.label,'ru'):sort==='status'?(rank[statusOf(a)]-rank[statusOf(b)]||a.label.localeCompare(b.label,'ru')):categoryOrder.indexOf(a.category)-categoryOrder.indexOf(b.category)||a.label.localeCompare(b.label,'ru')||a.id.localeCompare(b.id));
  $('results-count').textContent='Показано '+filtered.length+' из '+allItems().length+' · '+new Set(filtered.map(i=>i.category)).size+' категорий';
  $('empty').hidden=filtered.length!==0;
  $('icon-grid').innerHTML=filtered.map(i=>{
    const s=statusOf(i);return '<button type="button" class="icon-tile '+(selected===i.id?'is-active':'')+'" data-id="'+esc(i.id)+'" aria-label="'+esc(currentLabel(i)+', '+LABELS[s])+'" aria-pressed="'+String(selected===i.id)+'"><span class="icon-media '+(imageOf(i)?'':'placeholder')+'">'+imageMarkup(i)+'</span><span class="icon-status status-'+s+'"><i class="status-dot"></i>'+esc(LABELS[s])+'</span><span class="icon-name" title="'+esc(i.label)+'">'+esc(i.label)+'</span><span class="icon-sub">'+esc(i.character||categoryName(i.category))+'</span></button>';
  }).join('');
}
function previewImage(i,cls){return '<span class="'+cls+'">'+imageMarkup(i)+'</span>';}
function renderDetail(){
  const i=findItem(selected);
  if(!i){$('inspector-content').innerHTML='<p class="hint">Выбери иконку из библиотеки.</p>';return;}
  const st=statusOf(i),src=imageOf(i),note=noteOf(i);
  $('inspector-content').innerHTML=
    '<div class="inspector-top"><div class="inspector-thumb">'+imageMarkup(i)+'</div><div><div class="inspector-name">'+esc(i.label)+'</div><div class="inspector-id">'+esc(i.id)+'</div><span class="icon-status status-'+st+'"><i class="status-dot"></i>'+esc(LABELS[st])+'</span></div></div>'+
    '<div class="scene-picker"><span>Предпросмотр карточек Sport</span><div class="switch-row"><button type="button" class="'+(mode==='light'?'on':'')+'" data-scene="light">День</button><button type="button" class="'+(mode==='night'?'on':'')+'" data-scene="night">Ночь</button></div></div>'+
    '<div class="preview-stack" style="--icon-size:'+iconSize+'px"><div class="sport-scene '+(mode==='night'?'night':'')+'"><p class="scene-label">Happy Sport · карточка тренировки</p><div class="workout-card">'+previewImage(i,'workout-image')+'<div><h3>'+esc(i.label)+'</h3><p>Тренировка · 45 мин</p><span class="workout-tag">Начать</span></div></div></div>'+
    '<div class="sport-scene '+(mode==='night'?'night':'')+'" style="min-height:auto;padding:13px"><p class="scene-label">Happy Sport · строка библиотеки</p><div class="mini-list">'+previewImage(i,'row-image')+'<div><strong>'+esc(i.label)+'</strong><small>'+esc(categoryName(i.category))+'</small></div><span class="arr">›</span></div></div></div>'+
    '<div class="preview-settings"><div class="size-line"><span>Размер иконки · без растягивания</span><strong id="size-value">'+iconSize+' px</strong></div><input type="range" id="size-slider" min="38" max="100" value="'+iconSize+'" step="2" aria-label="Размер иконки"></div>'+
    '<div class="detail-fields"><label><span>Статус</span><select id="detail-status"><option value="done" '+(st==='done'?'selected':'')+'>Готово · файл создан</option><option value="review" '+(st==='review'?'selected':'')+'>Кандидат · на утверждение</option><option value="todo" '+(st==='todo'?'selected':'')+'>Не сделано · в планах</option></select></label>'+
    '<label><span>Заметки и правки</span><textarea id="detail-note" rows="3" placeholder="Что исправить перед утверждением…">'+esc(note)+'</textarea></label>'+
    '<div class="detail-bottom"><button type="button" class="button light" id="save-detail">Сохранить правки</button><button type="button" class="button" id="copy-id">Скопировать ID</button></div></div>'+
    '<div class="source-line">Источник: '+(src&&!src.startsWith('data:')?'<a href="'+esc(src)+'" target="_blank" rel="noopener">Открыть оригинал PNG ↗</a>':src?'Локально добавленный файл':'Пока нет файла')+'<div class="inspector-section">'+esc(i.origin==='github'?'Существует в GitHub · вариант '+(i.variant==='people'?'персонажа':'базовый'):i.origin==='plan'?'Позиция из плана':"Локально добавленная позиция")+'</div></div>';
  $('detail-status').addEventListener('change',e=>{state.status[i.id]=e.target.value;saveState();renderStats();renderGrid();notify('Статус обновлён в этом браузере');});
  $('save-detail').addEventListener('click',()=>{state.notes[i.id]=$('detail-note').value;saveState();notify('Заметка сохранена локально');});
  $('copy-id').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(i.id);notify('ID скопирован');}catch(e){notify(i.id);}});
  $('size-slider').addEventListener('input',e=>{iconSize=Number(e.target.value);$('size-value').textContent=iconSize+' px';$('inspector-content').querySelector('.preview-stack').style.setProperty('--icon-size',iconSize+'px');});
  document.querySelectorAll('[data-scene]').forEach(btn=>btn.addEventListener('click',()=>{mode=btn.dataset.scene;renderDetail();}));
}
function render(){renderStats();renderGrid();renderDetail();}
function switchApp(next){
  if(!['sport','meal','day'].includes(next))return;app=next;document.body.className='theme-'+next;
  document.querySelectorAll('[data-app]').forEach(b=>b.classList.toggle('selected',b.dataset.app===next));
  $('sport-view').hidden=next!=='sport';$('other-view').hidden=next==='sport';
  if(next==='sport')return;
  if(next==='meal'){
    $('other-eyebrow').textContent='Happy Meal · иллюстрации и UI';
    $('other-title').textContent='Meal · превью библиотеки';
    $('other-text').textContent='У Meal уже есть реальные иллюстрации в meal-img и встроенные элементы интерфейса. Пока показываем картинки в стилизованных карточках, не создавая второй каталог.';
    $('other-live').href='../meal/';
    $('other-preview').innerHTML='<div class="example-card"><img src="../meal-img/cover-bf-1.jpg" alt="Иллюстрация еды из GitHub"><div><strong>Завтрак</strong><small>Обложка из meal-img</small></div></div><div class="example-card"><img src="../meal-img/cover-dn-1.jpg" alt="Иллюстрация еды из GitHub"><div><strong>Ужин</strong><small>Обложка из meal-img</small></div></div><div class="preview-caption">Это реальные файлы GitHub, не отдельные иконки.</div>';
  }else{
    $('other-eyebrow').textContent='Happy Day · элементы интерфейса';
    $('other-title').textContent='Day · предварительный экран';
    $('other-text').textContent='Для Happy Day пока оставляем место под будущий каталог иконок состояний, сна, активности и заметок. Он будет связан с тем же принципом статусов и примерочной.';
    $('other-live').href='../day/';
    $('other-preview').innerHTML='<div class="example-card"><span class="day-preview-icon">☀</span><div><strong>Доброе утро</strong><small>Карточка самочувствия</small></div></div><div class="example-card"><span class="day-preview-icon">☾</span><div><strong>Сон и восстановление</strong><small>Карточка дневника</small></div></div><div class="preview-caption">Демонстрационные символы, не реальные ассеты Day.</div>';
  }
}
function bind(){
  document.querySelectorAll('[data-app]').forEach(b=>b.addEventListener('click',()=>switchApp(b.dataset.app)));
  $('search').addEventListener('input',renderGrid);
  ['category','variant','sort'].forEach(id=>$(id).addEventListener('change',renderGrid));
  document.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>{
    filterStatus=b.dataset.status;document.querySelectorAll('[data-status]').forEach(el=>el.classList.toggle('active',el===b));renderGrid();
  }));
  $('icon-grid').addEventListener('click',e=>{
    const button=e.target.closest('[data-id]');if(!button)return;selected=button.dataset.id;renderGrid();renderDetail();
    if(matchMedia('(max-width:850px)').matches)$('inspector').scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('add-btn').addEventListener('click',()=>{$('add-form').reset();$('new-category').value='strength';$('add-dialog').showModal();});
  $('add-cancel').addEventListener('click',()=>$('add-dialog').close());
  $('add-form').addEventListener('submit',onAdd);
  $('export-btn').addEventListener('click',exportAll);
  $('import-btn').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',importAll);
  $('reset-btn').addEventListener('click',async()=>{
    if(!window.confirm('Сбросить локальные статусы, заметки и добавленные позиции? Файлы в GitHub останутся без изменений.'))return;
    state={status:{},notes:{},custom:[]};Object.keys(media).forEach(k=>delete media[k]);await mediaClear();saveState();selected='sport:07_pullup_bar_rings';render();notify('Локальные изменения сброшены');
  });
}
async function onAdd(ev){
  ev.preventDefault();const title=$('new-name').value.trim(),cat=$('new-category').value;
  const url=$('new-url').value.trim(),file=$('new-file').files[0],character=$('new-character').value.trim(),note=$('new-note').value.trim();
  if(!title)return;
  if(url&&!safeUrl(url)){notify('Нужна корректная HTTPS-ссылка на изображение');return;}
  if(file&&(!['image/png','image/webp','image/jpeg'].includes(file.type)||file.size>5*1024*1024)){notify('PNG, JPEG или WebP размером до 5 МБ');return;}
  const id='custom:'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
  let src=url;
  if(file){
    if(!mediaDb){notify('Этот браузер не поддерживает локальное хранение изображений');return;}
    try{const data=await fileAsDataUrl(file);if(!await mediaPut(id,data)){notify('Не удалось сохранить файл локально');return;}media[id]=data;src='';}
    catch(e){notify('Ошибка чтения изображения');return;}
  }
  state.custom.push({id,label:title,category:cat,character,note,variant:'planned',origin:'custom',src,status:src||file?'review':'todo'});
  saveState();selected=id;$('add-dialog').close();
  $('search').value='';$('category').value='all';$('variant').value='all';filterStatus='all';document.querySelectorAll('[data-status]').forEach(el=>el.classList.toggle('active',el.dataset.status==='all'));
  switchApp('sport');render();notify('Добавлено в библиотеку · сохранено локально');
}
async function exportAll(){
  const payload={format:'happy-icon-studio',schemaVersion:1,exportedAt:new Date().toISOString(),repository:REPO,state,media};
  const json=JSON.stringify(payload,null,2),blob=new Blob([json],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='happy-icon-studio-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  notify('Выгружен JSON: статусы, заметки, свои изображения');
}
async function importAll(e){
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>30*1024*1024)throw new Error('JSON больше 30 МБ');
    const data=JSON.parse(await file.text());if(data.format!=='happy-icon-studio'||data.schemaVersion!==1||!data.state)throw new Error('Это не экспорт Icon Studio v1');
    const d=data.state;
    if(d.status&&typeof d.status==='object')for(const [id,s] of Object.entries(d.status)){if(['done','review','todo'].includes(s))state.status[id]=s;}
    if(d.notes&&typeof d.notes==='object')for(const [id,n] of Object.entries(d.notes)){if(typeof n==='string')state.notes[id]=n.slice(0,3000);}
    if(Array.isArray(d.custom))for(const c of d.custom){
      if(typeof c.id!=='string'||!c.id.startsWith('custom:')||typeof c.label!=='string')continue;
      const clean={id:c.id.slice(0,100),label:c.label.slice(0,110),category:CATEGORIES.some(x=>x[0]===c.category)?c.category:'other',character:String(c.character||'').slice(0,60),note:String(c.note||'').slice(0,700),variant:'planned',origin:'custom',src:safeUrl(c.src||''),status:['done','review','todo'].includes(c.status)?c.status:'todo'};
      const ix=state.custom.findIndex(x=>x.id===clean.id);if(ix>=0)state.custom[ix]=clean;else state.custom.push(clean);
    }
    if(data.media&&typeof data.media==='object')for(const [id,value] of Object.entries(data.media)){
      if(!id.startsWith('custom:')||typeof value!=='string'||value.length>7500000||!/^data:image\/(png|webp|jpeg);base64,/.test(value))continue;
      if(await mediaPut(id,value))media[id]=value;
    }
    saveState();render();notify('Импорт выполнен: данные объединены с локальными');
  }catch(err){notify('Не получилось импортировать: '+err.message);}finally{e.target.value='';}
}
start();
})();