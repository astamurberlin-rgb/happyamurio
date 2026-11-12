import { markdownHtml, htmlMarkdown } from './format.js';
import { mergeText, appendEntry, documentLink } from './core.js';
import { storage, fingerprint } from './storage.js';

export function createDocumentTools(ctx) {
  const { el, getKey, api, receive } = ctx;
  const writeApi = 'https://geqziziycpclhnucnsyx.supabase.co/functions/v1/notes-write';
  let active = null, scope = null, modalSerial = 0;
  const scopeKey = async () => scope ||= await fingerprint(getKey() || '');
  const keyFor = async id => `${await scopeKey()}:${id}`;
  const put = async (id,value) => storage('put',await keyFor(id),value);
  const get = async id => storage('get',await keyFor(id));
  const remove = async id => storage('delete',await keyFor(id));
  function button(text,fn,cls='btn') {
    const b=el('button',cls,text);b.type='button';
    b.addEventListener('click',()=>{try{Promise.resolve(fn()).catch(e=>error(e.message));}catch(e){error(e.message);}});return b;
  }
  function error(text) { if(active) {active.error.textContent=text; active.error.hidden=false;} }
  function close() { if(active) {active.dialog.close();} }
  function modal(title,{wide=false,onClose}={}) {
    close();
    const previous=document.activeElement;
    const dialog=el('dialog','notes-dialog'+(wide?' editor-dialog':''));
    const head=el('header','dialog-head');
    const h=el('h2',null,title);h.id='notes-dialog-title-'+(++modalSerial);
    dialog.setAttribute('aria-labelledby',h.id);
    const x=button('Готово',()=>dialog.close(),'link-btn');x.setAttribute('aria-label','Закрыть окно');
    head.append(h,x);
    const body=el('div','dialog-body');const footer=el('footer','dialog-footer');
    const err=el('p','inline-error');err.role='alert';err.hidden=true;
    dialog.append(head,body,err,footer);document.body.append(dialog);
    const item={dialog,body,footer,error:err};active=item;
    const scrollY=window.scrollY;
    document.body.classList.add('modal-open');
    dialog.addEventListener('close',()=>{
      onClose?.();dialog.remove();
      if(active===item){active=null;document.body.classList.remove('modal-open');window.scrollTo(0,scrollY);previous?.focus({preventScroll:true});}
    },{once:true});
    dialog.showModal();return item;
  }
  async function fetchDoc(path) {
    const res=await fetch(`${api}/${path.split('/').map(encodeURIComponent).join('/')}?format=json&key=${encodeURIComponent(getKey()||'')}`,{cache:'no-store',signal:AbortSignal.timeout(20000)});
    if(!res.ok)throw new Error(res.status===404?'Документ не прочитан. Проверь ключ и обнови страницу.':'Не удалось прочитать свежую версию. Попробуй ещё раз.');
    const d=await res.json();if(typeof d.content!=='string')throw new Error('Не удалось прочитать документ.');
    return {...d,version:Number(d.version)};
  }
  async function save(payload) {
    const res=await fetch(writeApi,{method:'POST',headers:{'Content-Type':'application/json','X-Notes-Key':getKey()||''},body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(25000)});
    if(res.status===409)throw Object.assign(new Error('Документ изменился'),{conflict:true});
    if(!res.ok)throw new Error(res.status===401?'Ключ не подошёл. Закрой редактор и войди снова — черновик останется.':res.status===413?'Документ слишком большой. Максимум — 2 МБ текста.':'Не удалось подтвердить сохранение. Черновик оставлен на устройстве; попробуй ещё раз.');
    const data=await res.json();if(!data.document)throw new Error('Ответ о сохранении не получен. Попробуй ещё раз.');
    return data.document;
  }
  function action(body,label,description,fn) {
    const b=button('',fn,'menu-action');
    b.append(el('span',null,label));if(description)b.append(el('small',null,description));body.append(b);return b;
  }
  function openMenu(doc) {
    const m=modal(doc.title);
    action(m.body,'Добавить запись','Новый фрагмент с сегодняшней датой',()=>openEditor(doc,'append'));
    action(m.body,'Редактировать','Исправить текст документа',()=>openEditor(doc));
    action(m.body,'Поделиться файлом…','PDF, Word или Markdown',()=>openExport(doc,'share'));
    action(m.body,'Скачать файл…','Сохранить отдельный документ',()=>openExport(doc,'download'));
    action(m.body,'Скопировать текст',null,async()=>{await navigator.clipboard.writeText(doc.content);m.error.hidden=false;m.error.textContent='Текст скопирован';});
    action(m.body,'Поделиться ссылкой','Для открытия понадобится свой ключ доступа',()=>{
      const url=documentLink(doc.path,location.href);
      if(navigator.share)return navigator.share({title:doc.title,url}).catch(e=>{if(e.name!=='AbortError')throw e;});
      return navigator.clipboard.writeText(url).then(()=>{m.error.hidden=false;m.error.textContent='Ссылка скопирована';});
    });
    action(m.body,'Загрузить изменения из файла…','DOCX, MD или TXT — с просмотром перед записью',()=>openImport(doc));
  }
  async function openExport(doc,intent) {
    const snapshot={...doc};const m=modal(doc.title);let objectUrl;
    m.dialog.addEventListener('close',()=>{if(objectUrl)setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);},{once:true});
    m.body.append(el('p','hint','Выбери формат файла.'));
    if(/!\[[^\]]*\]\(|<img\b/i.test(doc.content))m.body.append(el('p','hint','В PDF и Word изображения будут представлены подписями и ссылками. Исходные ссылки на изображения сохраняются в Markdown.'));
    const formats=el('div','format-list');m.body.append(formats);
    const status=el('p','hint');status.role='status';m.body.append(status);
    for(const [ext,title,hint] of [['pdf','PDF','Читать и делать пометки'],['docx','Word · DOCX','Редактировать в Pages или Word'],['md','Markdown · MD','Исходный текст и обратная загрузка']]) {
      action(formats,title,hint,async()=>{
        for(const b of formats.querySelectorAll('button'))b.disabled=true;
        m.error.hidden=true;status.textContent='Готовлю файл…';m.footer.textContent='';
        try {
          const id=crypto.randomUUID(); const metadata={schema:1,path:snapshot.path,version:snapshot.version,snapshot:id,hash:await fingerprint(snapshot.content)};
          try {await put('export:'+id,{...snapshot,exportedAt:Date.now()}); const ids=await get('exports')||[];ids.push(id);while(ids.length>30)await remove('export:'+ids.shift());await put('exports',ids);}catch{/* importing still offers a manual comparison */}
          const {exportFile}=await import('./export.js');
          const file=await exportFile(snapshot,ext,metadata);
          if(!m.dialog.open)return;
          if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);
          status.textContent=`${file.name} · ${Math.max(1,Math.round(file.size/1024))} КБ`;
          const download=el('a','btn'+(intent==='download'?' primary':''),'Скачать файл');download.href=objectUrl;download.download=file.name;
          const supported=!!navigator.share&&!!navigator.canShare?.({files:[file]});
          if(supported) m.footer.append(button('Поделиться файлом',()=>{
            // Called directly by a second tap: iOS transient activation is preserved.
            return navigator.share({files:[file],title:snapshot.title}).catch(e=>{if(e.name!=='AbortError')throw new Error('Не получилось поделиться. Файл можно скачать.');});
          },'btn'+(intent==='share'?' primary':'')));
          else if(intent==='share')status.append(document.createTextNode(' Системная отправка недоступна в этом браузере — скачай файл.'));
          m.footer.append(download);
          if(ext==='pdf'){const view=el('a','btn','Открыть PDF');view.href=objectUrl;view.target='_blank';view.rel='noopener';m.footer.append(view);}
        }catch(e){if(m.dialog.open)error(e.message||'Не удалось подготовить файл.');}
        finally{for(const b of formats.querySelectorAll('button'))b.disabled=false;}
      });
    }
  }
  async function openImport(doc) {
    const m=modal(doc.title);m.body.append(el('p','hint','Выбери изменённый документ. Перед сохранением увидишь его текст.'));
    const input=el('input','file-input');input.type='file';input.accept='.docx,.md,.markdown,.txt';input.setAttribute('aria-label','Файл с изменениями');m.body.append(input);
    const status=el('p','hint');m.body.append(status);
    input.addEventListener('change',async()=>{
      if(!input.files?.[0])return;input.disabled=true;status.textContent='Читаю файл…';
      try{
        const file=input.files[0];const {importFile}=await import('./import.js');const result=await importFile(file);
        if(!result.content.trim())throw new Error('В файле нет текста.');
        const current=await fetchDoc(doc.path);
        let base=null;
        if(result.metadata?.schema===1&&result.metadata.path===doc.path){
          try{const saved=await get('export:'+result.metadata.snapshot);if(saved&&saved.path===doc.path&&await fingerprint(saved.content)===result.metadata.hash)base=saved;}catch{}
        }
        if(!m.dialog.open)return;
        openImportPreview(current,result,base,file.name);
      }catch(e){if(m.dialog.open){error(e.message||'Не удалось прочитать файл.');input.disabled=false;status.textContent='';}}
    });
  }
  function openImportPreview(doc,result,base,name) {
    const m=modal('Загрузка в «'+doc.title+'»',{wide:true});
    m.body.append(el('p','hint',name));for(const w of result.warnings)m.body.append(el('p','hint',w));
    if(!base)m.body.append(el('p','hint','У файла нет доступной исходной версии. При обновлении сравни его с текущим документом: старый файл может не содержать новых записей.'));
    const view=el('div','md import-preview');view.innerHTML=markdownHtml(result.content);m.body.append(view);
    action(m.footer,'Добавить как новую запись',null,()=>openEditor(doc,'append',{content:result.content,imported:true}));
    action(m.footer,'Обновить этот документ',null,()=>openEditor(doc,'edit',{content:result.content,base:base||doc,imported:true,unknownBase:!base}));
    action(m.footer,'Сохранить отдельной заметкой',null,()=>openEditor({path:'personal/'+crypto.randomUUID()+'.md',title:name.replace(/\.[^.]+$/,''),content:'',version:0},'create',{content:result.content,imported:true}));
  }
  async function openEditor(original,mode='edit',options={}) {
    let base={...(options.base||original)}, local=options.content ?? (mode==='append'?'':original.content);
    let changed=false, pending=null, busy=false, draftSeq=Promise.resolve(), reviewCheck=null, reviewState=null;
    const draftId='draft:'+original.path+':'+mode;
    const m=modal((mode==='append'?'Добавить запись · ':mode==='create'?'Новая заметка · ':'Редактировать · ')+original.title,{wide:true,onClose:()=>{
      if(changed)persistDraft();
    }});
    const hint=el('p','hint',mode==='append'?'Запись появится в начале документа с датой и твоей подписью.':'Заголовки, списки и выделение доступны на панели.');m.body.append(hint);
    let titleInput;
    if(mode==='create'){const label=el('label',null,'Название заметки');titleInput=el('input','key-input');titleInput.value=original.title;titleInput.maxLength=180;label.append(titleInput);m.body.append(label);}
    const toolbar=el('div','editor-toolbar');toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Оформление текста');
    const editor=el('div','md rich-editor');editor.contentEditable='true';editor.setAttribute('role','textbox');editor.setAttribute('aria-multiline','true');editor.setAttribute('aria-label','Текст документа');editor.spellcheck=true;editor.innerHTML=markdownHtml(local)||'<p><br></p>';
    for(const [label,command,value] of [['Жирный','bold'],['Курсив','italic'],['Заголовок','formatBlock','h2'],['Текст','formatBlock','p'],['Список','insertUnorderedList'],['1. Список','insertOrderedList'],['Отменить','undo']]) {
      const b=button(label,()=>{editor.focus();document.execCommand(command,false,value);onInput();},'format-button');
      b.addEventListener('mousedown',e=>e.preventDefault());toolbar.append(b);
    }
    const status=el('p','draft-status');status.role='status';status.textContent='Черновик сохраняется на этом устройстве';
    const preview=el('div','md editor-preview');preview.hidden=true;
    const review=el('div','review-panel');review.hidden=true;
    m.body.append(toolbar,editor,status,review,preview);
    function content(){return changed?htmlMarkdown(editor.innerHTML):local;}
    function setContent(text){local=text;changed=false;editor.innerHTML=markdownHtml(text)||'<p><br></p>';}
    function persistDraft(){
      const data={base,local:content(),mode,title:titleInput?.value||original.title,pending,review:reviewState,at:Date.now()};
      draftSeq=draftSeq.catch(()=>{}).then(()=>put(draftId,data));
      draftSeq.then(()=>{status.textContent='Черновик сохранён на устройстве';},()=>{status.textContent='Не удалось сохранить черновик на устройстве. Скопируй текст перед закрытием.';});
      return draftSeq;
    }
    function onInput(){changed=true;pending=null;preview.hidden=true;persistDraft();}
    editor.addEventListener('input',onInput);titleInput?.addEventListener('input',onInput);
    editor.addEventListener('paste',e=>{
      e.preventDefault();const text=e.clipboardData.getData('text/plain');document.execCommand('insertText',false,text);onInput();
    });
    editor.addEventListener('drop',e=>e.preventDefault());
    editor.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault();});
    function comparison(remote,manual=false) {
      reviewState={remote:{...remote},manual};
      review.hidden=false;review.textContent='';
      review.append(el('h3',null,manual?'Нужно объединить изменения':'Документ обновился'));
      review.append(el('p','hint',manual?'Один и тот же фрагмент менялся в двух версиях. Сверь текущий текст ниже и внеси нужные дополнения в редактор.':'Новые записи включены в текст редактора. Просмотри результат перед сохранением.'));
      const details=el('details');details.append(el('summary',null,'Текущий документ в Notes'));
      const view=el('div','md');view.innerHTML=markdownHtml(remote.content);details.append(view);review.append(details);
      const label=el('label','review-check');reviewCheck=el('input');reviewCheck.type='checkbox';label.append(reviewCheck,document.createTextNode(manual?'Я объединил текст и сохранил нужные записи из обеих версий':'Я просмотрел объединённый текст'));review.append(label);
      requestAnimationFrame(()=>{if(m.dialog.open)review.scrollIntoView({block:'nearest'});});
    }
    if(options.unknownBase){comparison(original,true);review.querySelector('h3').textContent='Сравни файл с текущим документом';}
    const previewBtn=button('Предпросмотр',()=>{
      preview.innerHTML=markdownHtml(mode==='append'?appendEntry(base.content,content()):content());preview.hidden=!preview.hidden;
      if(!preview.hidden)preview.scrollIntoView({block:'start',behavior:'smooth'});
    });
    const saveBtn=button('Сохранить',commit,'btn primary');
    m.footer.append(previewBtn,saveBtn);
    async function commit(){
      if(busy)return;m.error.hidden=true;
      if(reviewCheck&&!reviewCheck.checked){error('Сначала сравни версии и отметь, что нужные записи сохранены.');return;}
      const mine=content();if(!mine.trim()){error('Сначала напиши текст.');return;}
      busy=true;saveBtn.disabled=true;saveBtn.textContent='Сохраняю…';editor.contentEditable='false';
      try{
        if(!pending){
          if(mode==='create')pending={mode:'create',path:original.path,title:titleInput.value.trim(),content:mine};
          else{
            const remote=await fetchDoc(original.path);
            if(mode==='append')pending={mode:'update',path:original.path,expectedVersion:remote.version,content:appendEntry(remote.content,mine)};
            else if(remote.version!==Number(base.version)){
              const merged=mergeText(base.content,mine,remote.content);
              base=remote;
              if(!merged.conflict)setContent(merged.text);
              comparison(remote,merged.conflict);changed=true;await persistDraft();return;
            }else pending={mode:'update',path:original.path,expectedVersion:remote.version,content:mine};
          }
          await persistDraft().catch(()=>{});
        }
        const saved=await save(pending);
        changed=false;await draftSeq.catch(()=>{});await remove(draftId).catch(()=>{});pending=null;
        receive(saved);m.dialog.close();
        ctx.notice('Сохранено в Notes');
      }catch(e){
        if(e.conflict){pending=null;error('Пока сохраняли, появилась новая версия. Нажми «Сохранить» ещё раз — сначала проверим изменения.');}
        else error(e.message||'Не удалось подтвердить сохранение. Черновик оставлен на устройстве.');
        changed=true;await persistDraft().catch(()=>{});
      }finally{busy=false;saveBtn.disabled=false;saveBtn.textContent='Сохранить';editor.contentEditable='true';}
    }
    // The dialog cannot be dismissed while a save is in flight.
    m.dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
    m.dialog.querySelector('.dialog-head button').addEventListener('click',e=>{if(busy)e.stopImmediatePropagation();},true);
    try{
      const draft=await get(draftId);
      if(draft&&m.dialog.open&&!options.imported){
        const box=el('div','draft-recovery');box.append(el('p',null,'На устройстве есть незавершённый черновик.'));
        box.append(button('Продолжить черновик',()=>{base=draft.base;setContent(draft.local);pending=draft.pending||null;changed=true;if(titleInput)titleInput.value=draft.title;if(draft.review)comparison(draft.review.remote,draft.review.manual);box.remove();persistDraft();},'btn primary'),button('Убрать черновик',async()=>{await remove(draftId);box.remove();}));m.body.prepend(box);
      }
    }catch{status.textContent='Хранилище черновиков недоступно. Скопируй текст перед закрытием.';}
    if(options.imported){changed=true;persistDraft();}
  }
  return {openMenu,openEditor,isOpen:()=>!!active,onForget:()=>{close();scope=null;}};
}
