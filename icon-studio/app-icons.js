/* App-icon dossiers, separate from exercise and character assignments. */
'use strict';
(() => {
  const KEY = 'happy_icon_studio_app_icons_v1';
  const APP_IDS = ['day', 'meal', 'sport', 'studio', 'color', 'notes'];
  const ROLES = {reference:'Визуализация',background:'Фон',foreground:'Силуэт',document:'Документ'};
  const MAX_FILE = 8 * 1024 * 1024;
  const MAX_TOTAL = 40 * 1024 * 1024;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isImage = file => /^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type);
  const validData = value => typeof value === 'string' && /^data:(?:image\/(?:png|jpeg|webp|svg\+xml)|application\/(?:pdf|zip|x-zip-compressed|json|octet-stream)|text\/(?:plain|markdown));base64,[A-Za-z0-9+/\r\n]*={0,2}$/.test(value);
  const root = document.getElementById('app-icons-grid');
  const message = document.getElementById('app-icons-status');
  let catalog = [], state = {}, db = null;
  const files = new Map();
  function status(text, error = false) { message.textContent = text; message.classList.toggle('error', error); }
  function persist() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function openDb() {
    return new Promise(resolve => {
      try {
        const request = indexedDB.open('happy-icon-studio-app-materials-v1', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('files');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }
  function stored(key) {
    return new Promise(resolve => {
      if (!db) return resolve(null);
      const request = db.transaction('files').objectStore('files').get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }
  function putMany(entries, clear = false) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Хранилище файлов недоступно в этом браузере'));
      const tx = db.transaction('files', 'readwrite'), store = tx.objectStore('files');
      if (clear) store.clear();
      for (const [key, value] of entries) store.put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(new Error('Не удалось сохранить файлы. Освободи место и повтори.'));
      tx.onabort = tx.onerror;
    });
  }
  const blobData = blob => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve('data:'+(blob.type.split(';')[0] || 'application/octet-stream')+';base64,'+String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Не удалось прочитать файл')); reader.readAsDataURL(blob);
  });
  function appState(id) { return state[id] || {}; }
  function materials(id) {
    const defaults = catalog.find(app => app.id === id)?.materials || [];
    const added = appState(id).materials || [];
    return defaults.filter(file => !added.some(own => own.id === file.id)).concat(added)
      .map(file => ({...file, role:appState(id).roles?.[file.id] || file.role || 'reference'}));
  }
  const source = file => files.get(file.key) || file.src || '';
  function mainFile(id) { return materials(id).find(file => file.id === appState(id).masterId && isImage(file)); }
  function renderVariants(app, all, main) {
    const variants = (app.variants || []).map(variant => ({...variant, file:all.find(file => file.id === variant.id)})).filter(variant => variant.file && isImage(variant.file));
    if (!variants.length) return '';
    return '<section class="app-icon-versions" aria-label="Версии '+esc(app.name)+'"><h3>Версии иконки</h3><div class="app-icon-version-grid">'+variants.map(variant => {
      const selected = main?.id === variant.id;
      return '<article class="app-icon-version'+(selected?' is-main':'')+'" data-variant-id="'+esc(variant.id)+'"><a href="'+esc(source(variant.file))+'" download="'+esc(variant.file.name)+'" aria-label="Скачать версию '+esc(variant.version)+' — '+esc(variant.title)+'"><img src="'+esc(source(variant.file))+'" alt="Версия '+esc(variant.version)+': '+esc(variant.title)+'"><strong>Версия '+esc(variant.version)+'</strong><span>'+esc(variant.title)+'</span></a><button class="text-btn app-material-main" type="button" data-app-master="'+esc(variant.id)+'"'+(selected?' disabled':'')+'>'+(selected?'✓ Основной':'Сделать основным')+'</button></article>';
    }).join('')+'</div></section>';
  }
  function render() {
    const opened = new Set([...root.querySelectorAll('details[open]')].map(el => el.dataset.appRecord));
    root.innerHTML = catalog.map(app => {
      const all = materials(app.id), main = mainFile(app.id), preview = main || all.find(isImage);
      const image = preview ? '<img src="'+esc(source(preview))+'" alt="'+esc(app.name)+'" width="76" height="76">' : '<span class="app-icon-empty">PNG</span>';
      const note = appState(app.id).notes ?? app.notes ?? '';
      const versions = renderVariants(app, all, main);
      return '<details class="app-icon-card" data-app-record="'+app.id+'"'+(opened.has(app.id)?' open':'')+'><summary><span class="app-icon-thumb">'+image+'</span><span class="app-icon-summary"><strong>'+app.name+'</strong><small>'+(main?'Основной вариант':all.length?'Материалы':'Пока без изображения')+' · '+all.length+'</small></span><span class="app-icon-chevron" aria-hidden="true">⌄</span></summary><div class="app-icon-content"><div class="app-icon-overview">'+
        (main?'<a class="app-icon-main" href="'+esc(source(main))+'" download="'+esc(main.name)+'"><img src="'+esc(source(main))+'" alt="Основной вариант '+app.name+'"><span>Скачать основной ↓</span></a>':'<p class="app-icon-hint">Добавь изображение и выбери его основным.</p>')+
        '<div><button type="button" class="button light" data-color-editor="'+app.id+'">Цвет и градиенты · PNG</button></div><label class="app-icon-notes">Заметки<textarea rows="3" maxlength="6000" data-app-note="'+app.id+'" placeholder="Решения, правки, цвета, требования к слоям…">'+esc(note)+'</textarea></label></div><div class="app-icon-files">'+versions+'<div class="app-icon-material-heading"><h3>Материалы</h3><label class="button app-icon-upload">＋ Добавить<input type="file" multiple data-app-upload="'+app.id+'" accept="image/png,image/jpeg,image/webp,image/svg+xml,.zip,.pdf,.txt,.md,.json" hidden></label></div>'+
        '<ul class="app-icon-materials">'+all.map(file => '<li data-material-id="'+esc(file.id)+'"><a class="app-material-preview '+(file.role==='foreground'?'alpha-preview':'')+'" href="'+esc(source(file))+'" download="'+esc(file.name)+'" aria-label="Скачать '+esc(file.name)+'">'+(isImage(file)?'<img src="'+esc(source(file))+'" alt="'+esc(ROLES[file.role])+'" loading="lazy">':'<span>'+esc(file.name.split('.').pop().toUpperCase())+'</span>')+'</a><div class="app-material-info"><a href="'+esc(source(file))+'" download="'+esc(file.name)+'">'+esc(file.name)+'</a><select data-material-role="'+esc(file.id)+'" aria-label="Тип материала '+esc(file.name)+'">'+Object.entries(ROLES).map(([value,label])=>'<option value="'+value+'"'+(value===file.role?' selected':'')+'>'+label+'</option>').join('')+'</select>'+(isImage(file)?'<button class="text-btn app-material-main" type="button" data-app-master="'+esc(file.id)+'"'+(main?.id===file.id?' disabled':'')+'>'+(main?.id===file.id?'✓ Основной':'Сделать основным')+'</button>':'')+'</div></li>').join('')+'</ul><p class="app-icon-hint">PNG, SVG, изображения, ZIP, PDF и заметки. Один файл — до 8 МБ.</p></div></div></details>';
    }).join('');
  }
  async function init() {
    try {
      const response = await fetch('./data/app-icon-library.json', {cache:'no-cache'});
      if (!response.ok) throw new Error('Не удалось открыть материалы иконок');
      catalog = (await response.json()).apps;
      let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* recover defaults */ }
      db = await openDb();
      for (const app of catalog) {
        const existing = saved[app.id] && typeof saved[app.id] === 'object' ? saved[app.id] : {};
        state[app.id] = {masterId:app.masterId || '',notes:app.notes || '',materials:[],roles:{},...existing};
        // Promote a newly approved built-in revision without touching custom masters,
        // user notes, uploads or another app's record.
        const seedRevision=Number(app.revision)||1;
        if ((Number(existing.seedRevision)||1)<seedRevision && (!existing.masterId || (app.previousMasterIds||[]).includes(existing.masterId))) state[app.id].masterId=app.masterId||'';
        state[app.id].seedRevision=seedRevision;
        if (!Array.isArray(state[app.id].materials)) state[app.id].materials = [];
        for (const file of state[app.id].materials) if (file.key) {
          const value = await stored(file.key);
          if (validData(value)) files.set(file.key, value);
        }
      }
      render(); status('Заметки и добавленные материалы сохраняются в этом браузере и входят в общую выгрузку JSON.');
    } catch (error) { status(error.message, true); throw error; }
  }
  async function addFiles(appId, incoming) {
    const added = [], entries = [];
    for (const file of incoming) {
      if (!file.size || file.size > MAX_FILE) throw new Error('Каждый материал должен быть не больше 8 МБ');
      if (!/\.(png|jpe?g|webp|svg|zip|pdf|txt|md|json)$/i.test(file.name)) throw new Error('Этот формат материала не поддерживается');
      const id = 'upload-'+(crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('')), key = appId+':'+id;
      let data = await blobData(file);
      if (!validData(data)) data = 'data:application/octet-stream;base64,'+data.split(',')[1];
      entries.push([key,data]);
      added.push({id,key,name:file.name.slice(0,180),type:file.type || 'application/octet-stream',size:file.size,role:isImage(file)?'reference':'document'});
    }
    // A restored backup can contain cached copies of built-in packs. Count only
    // user-added materials against the separate upload quota after restoration.
    const total = APP_IDS.reduce((sum,id)=>{
      const defaults=new Set((catalog.find(app=>app.id===id)?.materials||[]).map(file=>file.id));
      return sum+(appState(id).materials||[]).reduce((n,file)=>n+(defaults.has(file.id)?0:(file.size||0)),0);
    },0);
    if (total+added.reduce((sum,file)=>sum+file.size,0)>MAX_TOTAL) throw new Error('Добавленные материалы заняли 40 МБ. Сохрани JSON перед добавлением новых.');
    await putMany(entries);
    for (const [key,value] of entries) files.set(key,value);
    state[appId].materials.push(...added);
    persist(); render(); status('Материалы добавлены и сохранены.');return added;
  }
  async function exportSnapshot() {
    await ready;
    const apps = {};
    for (const id of APP_IDS) {
      const exported = [];
      for (const file of materials(id)) {
        let data = files.get(file.key);
        if (!data && file.src) {
          const response = await fetch(file.src);
          if (!response.ok) throw new Error('Не удалось включить в JSON файл '+file.name);
          data = await blobData(await response.blob());
        }
        if (!validData(data)) throw new Error('Недоступен материал '+file.name+'. Повтори выгрузку.');
        exported.push({...file,src:undefined,key:undefined,data});
      }
      apps[id] = {notes:appState(id).notes,masterId:appState(id).masterId,materials:exported,colorDraft:appState(id).colorDraft||null,colorDrafts:appState(id).colorDrafts||{}};
    }
    return {format:'happy-app-icons',schemaVersion:1,apps};
  }
  async function importSnapshot(snapshot) {
    if (!snapshot) return; // Old exercise-library backups leave app dossiers intact.
    await ready;
    if (snapshot.format!=='happy-app-icons'||snapshot.schemaVersion!==1||!snapshot.apps) throw new Error('Неизвестный формат библиотеки иконок приложений');
    const next = JSON.parse(JSON.stringify(state)), entries = [];
    let total = 0;
    for (const id of APP_IDS) {
      const incoming = snapshot.apps[id]; if (!incoming) continue;
      if(incoming.colorDrafts){if(typeof incoming.colorDrafts!=='object'||JSON.stringify(incoming.colorDrafts).length>500000)throw new Error('Некорректные настройки градиентов');next[id].colorDrafts=JSON.parse(JSON.stringify(incoming.colorDrafts));}
      if(incoming.colorDraft){if(typeof incoming.colorDraft!=='object'||JSON.stringify(incoming.colorDraft).length>50000)throw new Error('Некорректные настройки градиента');next[id].colorDraft=JSON.parse(JSON.stringify(incoming.colorDraft));}
      if (!Array.isArray(incoming.materials)||incoming.materials.length>100) throw new Error('Некорректный список материалов');
      for (const file of incoming.materials) {
        if (!file||typeof file.id!=='string'||!/^[a-z0-9:_-]{1,100}$/i.test(file.id)||!validData(file.data)) throw new Error('Повреждён материал иконки');
        total += file.data.length;
        // Built-in Composer packs are included in portable backups alongside
        // up to 40 MiB of user uploads; leave room for their base64 encoding.
        if (file.data.length>12*1024*1024||total>128*1024*1024) throw new Error('Материалы в JSON слишком большие');
        const key = id+':'+file.id;
        const clean = {id:file.id,key,name:String(file.name||'material').slice(0,180),type:String(file.type||'application/octet-stream').slice(0,90),size:Math.floor(file.data.length*.75),role:ROLES[file.role]?file.role:'reference'};
        if(file.colorDraft && typeof file.colorDraft==='object' && JSON.stringify(file.colorDraft).length<=50000)clean.colorDraft=JSON.parse(JSON.stringify(file.colorDraft));
        const index = next[id].materials.findIndex(own=>own.id===clean.id);
        if (index>=0) next[id].materials[index]=clean; else next[id].materials.push(clean);
        next[id].roles[file.id]=clean.role;
        entries.push([key,file.data]);
      }
      if (typeof incoming.notes==='string') next[id].notes=incoming.notes.slice(0,6000);
      if (incoming.masterId==='') next[id].masterId='';
      if (typeof incoming.masterId==='string'&&next[id].materials.some(file=>file.id===incoming.masterId&&isImage(file))) next[id].masterId=incoming.masterId;
    }
    await putMany(entries);
    localStorage.setItem(KEY,JSON.stringify(next));
    state=next; for (const [key,value] of entries) files.set(key,value);
    render(); status('Иконки приложений, заметки и материалы восстановлены из JSON.');
  }
  async function reset() {
    await ready; if (db) await putMany([],true);
    localStorage.removeItem(KEY); files.clear();
  }
  root.addEventListener('input',event=>{
    const textarea=event.target.closest('[data-app-note]'); if (!textarea) return;
    state[textarea.dataset.appNote].notes=textarea.value.slice(0,6000);
    try { persist(); status('Заметки сохранены.'); } catch { status('Не удалось сохранить заметки в браузере. Сделай выгрузку JSON.',true); }
  });
  root.addEventListener('change',async event=>{
    const card=event.target.closest('[data-app-record]'); if (!card) return;
    const id=card.dataset.appRecord;
    try {
      if (event.target.matches('[data-app-upload]')) {
        event.target.disabled=true; status('Сохраняю материалы…');
        try { await addFiles(id,[...event.target.files]); } finally { event.target.disabled=false;event.target.value=''; }
      }
      if (event.target.matches('[data-material-role]')) {
        state[id].roles[event.target.dataset.materialRole]=event.target.value;persist();render();status('Тип материала сохранён.');
      }
    } catch (error) { status(error.message,true); }
  });
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-app-master]'); if (!button) return;
    const id=button.closest('[data-app-record]').dataset.appRecord;
    try {
      const previous=state[id].masterId, legacy=state[id].colorDraft;
      // Tie a legacy unscoped draft to its old master before switching. This
      // keeps it available there without applying it to another icon's layers.
      if(legacy && !legacy.masterId) {
        legacy.masterId=previous || '__unassigned__';
        if(previous) (state[id].colorDrafts ||= {})[previous] ||= JSON.parse(JSON.stringify(legacy));
      }
      state[id].masterId=button.dataset.appMaster;persist();render();status('Основной вариант сохранён.');
    }
    catch { status('Не удалось сохранить основной вариант в браузере.',true); }
  });
  for (const [id,target] of [['studio-export-bottom','export-btn'],['studio-import-bottom','import-btn']]) document.getElementById(id).addEventListener('click',()=>document.getElementById(target).click());
  window.addEventListener('storage',event=>{
    if (event.key===KEY) { try { state=JSON.parse(event.newValue||'{}'); location.reload(); } catch { /* ignore malformed external state */ } }
  });
  const ready=init();
  ready.catch(()=>{}); // A failed dossier fetch must not break the exercise editor.
  window.HappyAppIcons={ready,exportSnapshot,importSnapshot,reset,
    async editorSources(id){await ready;return materials(id).filter(isImage).map(file=>({id:file.id,name:file.name,role:file.role,type:file.type,src:source(file)}));},
    async editorInitial(id){
      await ready;
      const record=appState(id), master=mainFile(id);
      // Existing editable drafts remain authoritative; never infer stops from pixels.
      const saved=record.colorDrafts?.[record.masterId] || (record.colorDraft && (!record.colorDraft.masterId || record.colorDraft.masterId===record.masterId) ? record.colorDraft : null);
      if(saved)return JSON.parse(JSON.stringify({...saved,masterId:record.masterId}));
      if(master?.colorDraft)return JSON.parse(JSON.stringify({...master.colorDraft,masterId:record.masterId}));
      const pairs={
        'day-approved-2026-10-29':['day-03','day-05'],
        'meal-approved-2026-10-29':['meal-background','meal-foreground'],
        'meal-spoon-cap-2026-10-31':['meal-spoon-background-20261031','meal-spoon-silhouette-20261031'],
        'meal-softserve-warm-20261102':['meal-softserve-warm-bg-20261102','meal-softserve-warm-fg-20261102'],
        'meal-softserve-cool-20261102':['meal-softserve-cool-bg-20261102','meal-softserve-cool-fg-20261102'],
        'sport-approved':['sport-background','sport-foreground'],
        'studio-flat-2026-11-01':['studio-background','studio-foreground'],
        'notes-v3-flat-2026-11-07':['notes-v3-background','notes-v3-stencil']
      };
      const pair=pairs[master?.id], all=materials(id);
      if(pair && pair.every(key=>all.some(file=>file.id===key)))return {masterId:record.masterId,backgroundMode:'original',backgroundSourceId:pair[0],sourceId:pair[1]};
      // A flattened master without matching layers must not load another revision's silhouette.
      return master ? {masterId:record.masterId,backgroundMode:'original',backgroundSourceId:master.id,sourceId:'',iconVisible:false} : null;
    },
    async colorDraft(id){await ready;return JSON.parse(JSON.stringify(appState(id).colorDraft||null));},
    saveColorDraft(id,draft){if(!APP_IDS.includes(id)||JSON.stringify(draft).length>50000)throw new Error('Некорректные настройки');const copy=JSON.parse(JSON.stringify(draft));state[id].colorDraft=copy;if(copy.masterId)(state[id].colorDrafts ||= {})[copy.masterId]=copy;persist();},
    async backgroundFile(id,sourceId){await ready;const file=materials(id).find(item=>item.id===sourceId);const data=file && files.get(file.key);return data ? {name:file.name,data} : null;},
    async addBackgroundPNG(id,file){await ready;const added=await addFiles(id,[file]);added[0].role='background';persist();render();return added[0].id;},
    async addColorPNG(id,file,draft){await ready;const added=await addFiles(id,[file]);if(draft){added[0].colorDraft=JSON.parse(JSON.stringify({...draft,masterId:added[0].id}));persist();}return added[0].id;}
  };
})();
