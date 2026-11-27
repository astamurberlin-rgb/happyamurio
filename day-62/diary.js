/* Editor, reading view and selection mode within the existing Day screens. */
window.HappyDiary = function (api) {
  'use strict';
  const {h, data, block, header, guard, transact, notify} = api;
  const media = window.HappyDiaryMedia;
  const icons = {
    photo:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="1.4"/><path d="m4 17 5-5 4 4 3-3 4 4"/>',
    record:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/>',
    mic:'<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4M9 21h6"/>',
    clip:'<path d="m8 13 7-7a3 3 0 0 1 4.2 4.2l-9 9a5 5 0 0 1-7-7l9-9"/>',
    search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5.5 5.5"/>',
    filters:'<path d="M3 7h4m4 0h10M3 17h10m4 0h4"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
    list:'<path d="M8 6h12M8 12h12M8 18h12"/><g fill="currentColor" stroke="none"><circle cx="3.5" cy="6" r="1.4"/><circle cx="3.5" cy="12" r="1.4"/><circle cx="3.5" cy="18" r="1.4"/></g>',
    feelings:'<path d="M3 17a9 9 0 1 1 18 0M12 16l4-6"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/>',
    print:'<path d="M7 8V3h10v5M7 16H4V9h16v7h-3"/><path d="M7 13h10v8H7zM16 11h1"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    stop:'<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+icons[name]+'</svg>';
  const btn = (action,text,symbol='',attrs='') => '<button type="button" class="jd-btn" data-jd="'+action+'" '+attrs+'>'+(symbol?icon(symbol):'')+text+'</button>';
  const onlyIcon = (act,label,symbol) => btn(act,'',symbol,'data-icon-only aria-label="'+label+'" title="'+label+'"');
  const dateText = d => new Intl.DateTimeFormat('ru',{day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00'));
  const dayHeading = new Intl.DateTimeFormat('ru',{weekday:'long',day:'numeric',month:'long'});
  const entries = () => data().entries;
  const entryBy = id => entries().find(e=>e.id===id);
  const attachments = e => e.media || [];
  const allMedia = e => attachments(e).concat(...e.additions.map(attachments));
  const validSrc = item => /^(data:(?:audio|image)\/[\w.+=;-]+(?:,[\s\S]+)|\.\/diary-samples\/[\w.-]+)$/.test(item.src||'') ? h(item.src) : '';
  const currentDrafts = () => data().diaryDrafts || (data().diaryDrafts={});
  const hasContent = draft => Boolean(draft.text.trim() || draft.media.length);
  const titleOf = draft => draft.title.trim() || draft.text.trim().split('\n')[0].slice(0,70) || (draft.media.some(m=>m.kind==='photo')?'Фотография':'Голосовая запись');
  const sorted = () => [...entries()].sort((a,b)=>(b.date+' '+b.time).localeCompare(a.date+' '+a.time) || b.createdAt-a.createdAt);
  const state = {key:'new', entryId:null, mode:'read', parent:'care-diary', filtersOpen:false, query:'', filter:'all', selecting:false, selected:new Set()};
  let draft, editor, recorder, pendingVoice=false, timer, pendingFiles=0, saving=false, stopPending=false;
  let activeView='', activeKey='', keepScroll=0, printDialog;
  const composer = window.HappyDiaryComposer({h,renderItem,notify,retain:()=>{retain(state.key,draft);refreshEditor();}});
  function fresh(key) {
    const book = data().books.find(b=>b.id===data().lastDiaryBook) || data().books[0];
    let e=key.startsWith('edit:') ? entryBy(key.slice(5)) : null;
    return {title:e&&!e.autoTitle&&e.title!=='Без заголовка'?e.title:'', text:e?.text||'', date:e?.date||api.selectedDate(),
      time:e?.time||api.currentTime(),book:e?.bookId||book.id,media:(e?.media||[]).map(m=>({...m})),body:e?.body};
  }
  function retain(key,value,immediate=false) {
    if (!window.DayData?.signedIn() || window.DayData.outdated())return;
    const drafts=currentDrafts();
    if(key==='new'&&!hasContent(value)&&!value.title.trim())delete drafts[key];
    else drafts[key]={...value,media:value.media.slice()};
    if(immediate)api.flush();else api.persist();
  }
  function renderItem(item,paper=false) {
    const src=validSrc(item);
    if(!src)return '';
    if(item.kind==='photo'){
      const image='<img src="'+src+'" alt="'+h(item.name||'Фотография')+'">';
      return '<figure class="jd-photo'+(item.portrait?' jd-portrait':'')+'">'+(paper?image:'<button type="button" data-jd="zoom" aria-label="Рассмотреть фотографию">'+image+'</button>')+'</figure>';
    }
    return window.HappyDiaryWave.markup(item,src,paper);
  }
  function filesMarkup() {
    return '<input type="file" accept="image/*" data-input="photo" multiple hidden><input type="file" accept="image/*" capture="environment" data-input="camera" hidden><input type="file" data-input="files" multiple hidden><input type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.aac,.webm" data-input="audio" multiple hidden>';
  }
  function editorMarkup(key) {
    state.key=key;draft=currentDrafts()[key]||fresh(key);
    const title='<div class="jd-title-wrap"><input class="jd-title" type="text" name="title" maxlength="120" aria-label="Заголовок (необязательно)" placeholder="Заголовок" value="'+h(draft.title)+'"></div>';
    return '<form class="card jd-editor" data-editor="'+h(key)+'">'+title+
      '<div class="jd-compose-body" data-compose-body></div><div data-live-holder hidden></div><div class="jd-toolbar">'+
      '<div class="jd-tool-wrap">'+btn('styles','Аа','','data-icon-only aria-label="Стиль текста" title="Стиль текста" aria-expanded="false"')+
      '<div class="jd-popover jd-style-menu" data-happy-menu data-style-menu role="group" aria-label="Стиль текста" hidden>'+
      [['body','Обычный текст'],['heading','Подзаголовок'],['bold','Полужирный'],['italic','Курсив'],['underline','Подчёркнутый']].map(([k,t])=>'<button type="button" data-format="'+k+'">'+t+'</button>').join('')+'</div></div>'+
      '<div class="jd-tool-wrap">'+btn('photo','','photo','data-icon-only aria-label="Добавить фото" title="Добавить фото" aria-expanded="false"')+
      '<div data-choices data-happy-menu hidden class="jd-popover" role="group" aria-label="Добавить фото">'+btn('camera','Снять камерой')+btn('gallery','Из фотографий')+btn('files','Из файлов')+'</div></div>'+
      onlyIcon('voice','Записать голос','record')+onlyIcon('audio','Прикрепить аудиофайл','clip')+
      '<div class="jd-tool-wrap">'+btn('lists','','list','data-icon-only aria-label="Список" title="Список" aria-expanded="false"')+
      '<div class="jd-popover jd-list-menu" data-happy-menu role="group" aria-label="Вид списка" hidden>'+
      [['number','1.','Нумерованный'],['bullet','•','С точками'],['check','☑','Чек-лист']].map(([type,mark,label])=>'<button type="button" data-list-format="'+type+'"><span aria-hidden="true">'+mark+'</span>'+label+'</button>').join('')+'</div></div>'+
      onlyIcon('feelings','Отметить чувства сейчас','feelings')+'<button type="button" class="jd-btn jd-paste" data-compose="paste" hidden>Вставить</button></div>'+filesMarkup()+
      '<div data-record-status role="status"></div><div class="jd-save-row"><button type="submit" class="btn solid jd-save">Сохранить</button>'+(key.startsWith('edit:')?btn('cancel-edit','Отмена'):'')+'</div></form>';
  }
  function bookChooserMarkup(){
    return '<div class="jd-book-row"><div class="care-book-drum jd-inline-wheel" data-book-wheel></div></div>';
  }
  function mountBookWheel(root){
    const host=root.querySelector('[data-book-wheel]');
    if(!host)return;
    const source=draft, key=state.key;
    const books=data().books.map(book=>({v:book.id,t:book.name}));
    books.push({v:'',t:'+ Добавить раздел'});
    const current=()=>host.isConnected&&activeKey===key&&draft===source;
    const applyBook=id=>{
      if(!current())return;
      source.book=id;
      if(key==='new'){
        data().lastDiaryBook=id;
        state.selected.clear();
        updateList();
      }
      retain(key,source,true);
    };
    const wheel=window.HappyFields.drum(host,{
      groups:[{cols:[{name:'book',label:'Раздел дневника',options:books,value:source.book}]}],
      onChange:({book})=>{
        if(!current())return;
        if(book){applyBook(book);return;}
        wheel.set('book',source.book);
        createBook(id=>{
          if(!current())return;
          applyBook(id);
          mountBookWheel(root);
        });
      }
    });
  }
  function createBook(onChoose){
    const dialog=modal('Новый раздел','<form class="jd-book-create"><label>Название раздела<input type="text" maxlength="80" required autofocus></label>'+
      '<div class="jd-dialog-foot">'+btn('dismiss','Отмена')+'<button type="submit" class="jd-btn">Добавить</button></div></form>','','jd-book-dialog');
    const addForm=dialog.querySelector('form');
    const nameField=addForm.querySelector('input');
    addForm.addEventListener('submit',async event=>{
      event.preventDefault();
      const button=addForm.querySelector('[type="submit"]');
      if(button.disabled)return;
      const name=nameField.value.trim();
      if(!name){nameField.value='';nameField.reportValidity();return;}
      const existing=data().books.find(book=>book.name.toLocaleLowerCase('ru')===name.toLocaleLowerCase('ru'));
      if(existing){onChoose(existing.id);dialog.close();return;}
      button.disabled=true;
      let id;
      const ok=await transact(()=>{id=api.addBook(name);});
      if(ok){if(dialog.open){onChoose(id);dialog.close();}}
      else button.disabled=false;
    });
  }
  function refreshEditor() {
    if(!editor?.isConnected)return;
    const isRecording=!!recorder, working=pendingVoice||isRecording||pendingFiles>0||saving;
    const save=editor.querySelector('[type=submit]');
    save.disabled=working||!hasContent(draft);
    const voice=editor.querySelector('.jd-toolbar [data-jd=voice]');
    voice.disabled=pendingVoice||saving;
    if(voice.dataset.recording!==String(isRecording)){
      voice.dataset.recording=String(isRecording);
      voice.classList.toggle('jd-recording',isRecording);
      voice.innerHTML=isRecording?icon('stop'):icon('record');
      voice.title=isRecording?'Остановить запись':'Записать голос';
      voice.setAttribute('aria-label',voice.title);
    }
    const live=editor.querySelector('[data-live-holder]');
    live.hidden=!isRecording;
    if(isRecording){
      if(!live.firstElementChild)live.innerHTML=window.HappyDiaryWave.live();
      window.HappyDiaryWave.updateLive(live.firstElementChild,recorder);
    }else live.replaceChildren();
    editor.querySelector('[data-record-status]').textContent=pendingVoice?'Подключаем микрофон…':pendingFiles?'Готовим вложение…':'';
  }
  function mountEditor(root){editor=root.querySelector('[data-editor]');composer.mount(editor,draft);refreshEditor();}
  function showDiary(){
    if(activeView!=='care-diary'&&(recorder||pendingVoice))closeRecorder();
    state.entryId=null;state.mode='read';activeView='care-diary';activeKey='new';
    const root=block('diary');
    const form=editorMarkup('new');
    root.innerHTML=header('Дневник','day',false)+bookChooserMarkup()+form+
      '<div class="jd-history"><div class="jd-head"><h2>Мои записи</h2><details class="jd-menu"><summary aria-label="Действия с записями">'+icon('more')+'</summary><div data-happy-menu>'+btn('select','Выбрать и распечатать','print')+'</div></details></div>'+
      '<div class="jd-search-row"><label class="jd-search-field">'+icon('search')+'<input type="search" class="jd-query" aria-label="Поиск по дневнику" placeholder="Найти запись" value="'+h(state.query)+'"></label>'+
      btn('filters','','filters','aria-label="Фильтры записей" title="Фильтры записей" aria-controls="jd-media-filters" aria-expanded="'+state.filtersOpen+'"')+'</div>'+
      '<div id="jd-media-filters" class="jd-filters" role="group" aria-label="Фильтр по вложениям" '+(state.filtersOpen?'':'hidden')+'>'+
      [['all','Все'],['photo','С фото'],['audio','С аудио']].map(([k,t])=>btn('filter',t,'','data-filter="'+k+'" aria-pressed="'+(state.filter===k)+'"')).join('')+'</div>'+
      '<div data-pickbar></div><div data-list></div></div>';
    mountBookWheel(root);mountEditor(root);updateList();
    if(keepScroll){const top=keepScroll;keepScroll=0;requestAnimationFrame(()=>{root.scrollTop=top;});}
  }
  function updateList() {
    const root=block('diary');const list=root?.querySelector('[data-list]');if(!list)return;
    const q=state.query.toLocaleLowerCase('ru').trim();
    let lastDate='';
    const rows=sorted().filter(e=>(e.bookId||data().books[0]?.id)===draft.book&&(state.filter==='all'||allMedia(e).some(a=>a.kind===state.filter))&&
      (!q||[e.title,e.text,...e.additions.map(a=>a.text)].join(' ').toLocaleLowerCase('ru').includes(q)));
    list.innerHTML=rows.map(e=>{
      const day=e.date===lastDate?'':'<h3 class="jd-day">'+h(dayHeading.format(new Date(e.date+'T12:00:00')))+'</h3>';lastDate=e.date;
      const checked=state.selected.has(e.id);
      const files=allMedia(e), photo=files.find(m=>m.kind==='photo'),audio=files.find(m=>m.kind==='audio');
      const caption=[photo?icon('photo')+'Фото · '+files.filter(m=>m.kind==='photo').length:'',audio?icon('mic')+'Аудио'+(audio.seconds?' · '+media.clock(audio.seconds):''):''].filter(Boolean).join('　');
      const snippet=e.autoTitle?e.text.trim().slice(e.title.length).trim():e.text;
      return day+'<button type="button" class="card jd-row" data-jd="row" data-id="'+h(e.id)+'" '+(state.selecting?'aria-pressed="'+checked+'"':'')+'>'+
        '<time>'+h(e.time)+'</time><span class="jd-copy"><b>'+h(e.title)+'</b>'+
        (snippet?'<span>'+h(snippet)+'</span>':'')+(caption?'<small>'+caption+'</small>':'')+'</span>'+(photo&&!state.selecting?'<img class="jd-thumb" src="'+validSrc(photo)+'" alt="">':'')+(state.selecting?'<span class="jd-check" aria-hidden="true">'+(checked?'✓':'')+'</span>':'')+'</button>';
    }).join('')||'<p class="care-empty">'+(q||state.filter!=='all'?'Таких записей пока нет.':'Здесь появится твоя первая запись.')+'</p>';
    const count=state.selected.size;
    root.querySelector('[data-pickbar]').innerHTML=state.selecting?'<div class="jd-pick"><span>Выбрано · '+count+'</span>'+btn('cancel-selection','Отмена')+btn('print-selection','Печать / PDF','print',!count?'disabled':'')+'</div>':'';
    root.querySelector('.jd-history .jd-menu').hidden=state.selecting;
    root.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(state.filter===b.dataset.filter)));
  }
  function additions(e,paper=false) {
    return e.additions.map(a=>'<section class="jd-addition" id="'+(paper?'print-':'')+'addition-'+h(a.id)+'"><small>Дополнение · '+h(dateText(a.date))+' · '+h(a.time)+'</small>'+composer.reading(a,paper)+'</section>').join('');
  }
  function showEntry(id,mode='read') {
    const e=entryBy(id);if(!e)return;
    if(recorder||pendingVoice)closeRecorder();
    const root=block('entry');
    if(activeView==='care-entry')state.parent=root.querySelector('[data-care-close]')?.dataset.careClose||state.parent;
    else state.parent='care-diary';
    state.entryId=id;state.mode=mode;activeView='care-entry';activeKey=mode==='read'?'':mode+':'+id;
    let view=header(mode==='edit'?'Редактировать':e.title||e.text?.split('\n')[0]||'Без заголовка',state.parent,false);
    if(mode==='read'){
      view+='<article class="card jd-detail"><div class="jd-head"><span class="jd-date">'+h(dateText(e.date))+' · '+h(e.time)+'</span><details class="jd-menu"><summary aria-label="Действия с записью">'+icon('more')+'</summary><div data-happy-menu>'+btn('edit','Редактировать')+btn('print-one','Печать','print')+'</div></details></div>'+
        composer.reading(e)+additions(e)+'</article>';
    }else{
      const form=editorMarkup(activeKey);
      view+=bookChooserMarkup()+form;
    }
    root.innerHTML=view;mountBookWheel(root);mountEditor(root);
  }
  function bodyForPrint(e) {
    return '<article><div class="jd-print-date">'+h(dateText(e.date))+' · '+h(e.time)+'</div>'+
      (e.autoTitle&&e.text?'':'<h2>'+h(e.title)+'</h2>')+composer.reading(e,true)+additions(e,true)+'</article>';
  }
  function modal(title,body,actions,kind) {
    const dialog=document.createElement('dialog');dialog.className='jd-dialog '+kind;
    dialog.setAttribute('aria-label',title);
    dialog.innerHTML='<div class="jd-dialog-head"><h2>'+title+'</h2>'+onlyIcon('dismiss','Закрыть','close')+'</div>'+body+actions;
    document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.remove();if(printDialog===dialog){printDialog=null;document.body.classList.remove('jd-printing');}});
    dialog.showModal();return dialog;
  }
  function printEntries(records) {
    if(!records.length)return;
    const markup=records.map(bodyForPrint).join('');
    printDialog=modal('Предпросмотр','<div class="jd-paper">'+markup+'</div>','<div class="jd-dialog-foot">'+btn('system-print','Напечатать','print')+btn('pdf','Сохранить PDF')+'</div>','jd-print-preview');
    document.body.classList.add('jd-printing');
  }
  async function downloadPdf(button) {
    const records=Array.from(printDialog.querySelectorAll('.jd-paper article'));
    button.disabled=true;button.textContent='Готовим PDF…';
    try {
      const blob=await window.HappyDiaryPDF.create(records),url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download='Happy-Day-'+api.today()+'.pdf';
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch(error) {notify(error.message||'Не удалось сохранить PDF');}
    finally {button.textContent='Сохранить PDF';button.disabled=false;}
  }
  function closeRecorder(){
    stopPending=true;
    if(recorder)recorder.stop();
  }
  function navigating(name){
    if(activeView&&activeView!==name){
      if(activeView==='care-diary'&&(name==='care-entry'||name==='ring'))keepScroll=block('diary').scrollTop;
      if(recorder||pendingVoice)closeRecorder();
      activeView='';activeKey='';
    }else if(!activeView&&name==='care-diary')showDiary();
    else if(!activeView&&name==='care-entry'&&state.entryId){
      const top=block('entry').scrollTop;
      activeView=name;
      showEntry(state.entryId,state.mode);
      requestAnimationFrame(()=>{block('entry').scrollTop=top;});
    }
  }
  function addAttachments(key,target,items){
    const displayed=editor?.isConnected && activeKey===key && state.key===key;
    const latest=displayed?draft:(currentDrafts()[key]||target);
    composer.append(latest,items);retain(key,latest,true);
    if(displayed)refreshEditor();
  }
  async function importFiles(input) {
    if(!input.files?.length)return;
    const files=Array.from(input.files), target=draft, key=state.key;
    input.value='';pendingFiles++;refreshEditor();
    try{
      for(const file of files){
        const isAudio=input.dataset.input==='audio'||(input.dataset.input==='files'&&(/^audio\//.test(file.type)||/\.(m4a|mp3|wav|ogg|aac|webm)$/i.test(file.name)));
        const item=isAudio?await media.audio(file):await media.photo(file);
        addAttachments(key,target,[item]);
      }
    }catch(err){notify(err.message||'Не удалось прикрепить файл');}
    finally{pendingFiles--;refreshEditor();}
  }
  async function voice() {
    if(recorder){recorder.stop();return;}
    if(pendingVoice)return;
    const target=draft, key=state.key;
    pendingVoice=true;stopPending=false;refreshEditor();
    function finished(){clearInterval(timer);recorder=null;pendingVoice=false;refreshEditor();}
    try{
      recorder=await media.startVoice(item=>addAttachments(key,target,[item]),err=>notify(err.message),finished);
      pendingVoice=false;timer=setInterval(refreshEditor,110);
      if(stopPending)recorder.stop();
    }catch(err){
      finished();notify(err.name==='NotAllowedError'?'Микрофон недоступен. Разреши доступ или прикрепи аудиофайл.':err.message||'Микрофон недоступен');
    }
    refreshEditor();
  }
  async function submit(event) {
    const form=event.target;if(!form.matches('[data-editor]'))return;
    event.preventDefault();
    if(!form.reportValidity()||saving||pendingFiles||pendingVoice||recorder||!hasContent(draft))return;
    const key=state.key, record={...draft,media:[...draft.media]}, id=state.entryId;
    const isEdit=key.startsWith('edit:');
    const date=record.date;
    if(!guard(date)||(isEdit&&!guard(entryBy(id).date)))return;
    saving=true;refreshEditor();
    const ok=await transact(()=>{
      const title=titleOf(record);
      const e=isEdit?entryBy(id):api.createEntry(date,record.time,title,record.text,record.book,record.media);
      if(isEdit){
        api.moveEvent(e,date,record.time,title);
        Object.assign(e,{title,text:record.text.trim(),date,time:record.time,bookId:record.book,media:record.media});
      }
      if(record.body)e.body=record.body;
      e.autoTitle=!record.title.trim();data().lastDiaryBook=record.book;
      delete currentDrafts()[key];
    });
    saving=false;
    if(!ok){refreshEditor();return;}
    if(key==='new'){
      state.query='';state.filtersOpen=false;state.filter='all';state.selecting=false;state.selected.clear();
      showDiary();notify('Запись сохранена');
    }else{showEntry(id);notify('Изменения сохранены');}
  }
  function input(event){
    const el=event.target;
    if(el.matches('.jd-query')){state.query=el.value;updateList();return;}
    const f=el.closest('[data-editor]');if(!f||!el.name)return;
    draft[el.name]=el.value;
    retain(state.key,draft);refreshEditor();
  }
  // Лист прокручивается за нижним меню. Открываем панель там, где видны её команды.
  function placeMenu(menu){
    const trigger=menu.previousElementSibling.getBoundingClientRect();
    const screen=menu.closest('.screen').getBoundingClientRect(), vp=window.visualViewport;
    const top=Math.max(screen.top,vp?.offsetTop||0);
    const bottom=Math.min(screen.bottom,vp?vp.offsetTop+vp.height:innerHeight,
      document.querySelector('.dock').getBoundingClientRect().top,document.getElementById('fab').getBoundingClientRect().top);
    const gap=parseFloat(getComputedStyle(menu).getPropertyValue('--happy-space-select-gap'));
    const below=bottom-trigger.bottom-gap, above=trigger.top-top-gap;
    const up=below<menu.scrollHeight&&above>below;
    menu.toggleAttribute('data-above',up);
    menu.style.maxHeight=Math.max(0,Math.floor(up?above:below))+'px';
  }
  function placeOpenMenus(){
    document.querySelectorAll('.screen.on .jd-popover:not([hidden]),.screen.on .jd-menu[open]>[data-happy-menu]').forEach(placeMenu);
  }
  document.addEventListener('toggle',event=>{
    if(event.target.matches('.jd-menu[open]'))placeMenu(event.target.querySelector('[data-happy-menu]'));
  },true);
  document.addEventListener('scroll',event=>{
    if(event.target.matches?.('.screen.on'))placeOpenMenus();
  },{capture:true,passive:true});
  window.addEventListener('resize',placeOpenMenus);
  window.visualViewport?.addEventListener('resize',placeOpenMenus);
  window.visualViewport?.addEventListener('scroll',placeOpenMenus);
  function click(event){
    document.querySelectorAll('.jd-menu[open]').forEach(menu=>{
      if(!menu.contains(event.target)||event.target.closest('[data-jd]'))menu.open=false;
    });
    if(editor?.isConnected){
      for(const wrap of editor.querySelectorAll('.jd-tool-wrap')){
        if(!wrap.contains(event.target)){
          wrap.querySelector('.jd-popover').hidden=true;
          wrap.querySelector('[data-jd]').setAttribute('aria-expanded','false');
        }
      }
    }
    const b=event.target.closest('[data-jd]');if(!b)return;
    const act=b.dataset.jd;
    switch(act){
      case 'photo': case 'styles': case 'lists': {
        const menu=b.nextElementSibling;menu.hidden=!menu.hidden;
        if(!menu.hidden)placeMenu(menu);
        b.setAttribute('aria-expanded',String(!menu.hidden));break;
      }
      case 'gallery': case 'camera': case 'audio': case 'files':
        editor.querySelector('[data-choices]').hidden=true;
        editor.querySelector('[data-jd=photo]').setAttribute('aria-expanded','false');
        editor.querySelector('[data-input="'+(act==='gallery'?'photo':act)+'"]').click();break;
      case 'voice':voice();break;
      case 'feelings':retain(state.key,draft,true);api.openFeelings(activeView);break;
      case 'zoom':{
        const img=b.querySelector('img');
        modal('Фотография','<img class="jd-full-img" src="'+h(img.getAttribute('src'))+'" alt="'+h(img.alt)+'">','','jd-image-view');break;
      }
      case 'dismiss':b.closest('dialog').close();break;
      case 'system-print':window.print();break;
      case 'pdf':downloadPdf(b);break;
      case 'row':
        if(state.selecting){const id=b.dataset.id;if(state.selected.has(id))state.selected.delete(id);else state.selected.add(id);updateList();}
        else {keepScroll=block('diary').scrollTop;api.openEntry(b.dataset.id);}
        break;
      case 'filters':{
        state.filtersOpen=!state.filtersOpen;
        b.setAttribute('aria-expanded',String(state.filtersOpen));
        block('diary').querySelector('.jd-filters').hidden=!state.filtersOpen;
        break;
      }
      case 'filter':state.filter=b.dataset.filter;updateList();break;
      case 'select':case 'cancel-selection':
        state.selecting=act==='select';state.selected.clear();updateList();
        block('diary').querySelector(state.selecting?'[data-jd=cancel-selection]':'.jd-history summary').focus({preventScroll:true});break;
      case 'edit':if(guard(entryBy(state.entryId).date))showEntry(state.entryId,'edit');break;
      case 'cancel-edit':
        if(recorder||pendingVoice||pendingFiles){notify('Дождись окончания работы с вложением');break;}
        delete currentDrafts()[state.key];api.flush();showEntry(state.entryId);break;
      case 'print-one':printEntries([entryBy(state.entryId)]);break;
      case 'print-selection':printEntries(sorted().filter(e=>state.selected.has(e.id)).reverse());break;
    }
  }
  document.addEventListener('click',click);document.addEventListener('submit',submit);
  document.addEventListener('input',input);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const details=document.querySelector('.screen.on .jd-menu[open]');
    if(details){details.open=false;details.querySelector('summary').focus();event.preventDefault();return;}
    if(!editor?.isConnected)return;
    const menu=editor.querySelector('.jd-popover:not([hidden])');
    if(!menu)return;
    event.preventDefault();
    menu.hidden=true;
    menu.previousElementSibling.setAttribute('aria-expanded','false');
    menu.previousElementSibling.focus();
  });
  document.addEventListener('change',e=>{if(e.target.matches('[data-input]'))importFiles(e.target);});
  function suspend(){
    if(recorder||pendingVoice)closeRecorder();
    if(activeKey && currentDrafts()[activeKey])api.flush();
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
  window.addEventListener('pagehide',suspend);
  return {showDiary,showEntry,navigating};
};
