/* Ordered text and attachments for the diary. Old records derive their order from text and media. */
window.HappyDiaryComposer = function (api) {
  'use strict';
  const {h,renderItem,retain,notify}=api;
  const uid = () => crypto.randomUUID();
  const clipboardType = 'application/x-happy-diary-attachment';
  const allowedTags = new Set(['B','STRONG','I','EM','U','S','STRIKE','BR','P','DIV','H3','BLOCKQUOTE','UL','OL','LI']);
  let form, value, savedRange, clipboard;
  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) return h(node.data);
    if (node.nodeType !== Node.ELEMENT_NODE || /^(SCRIPT|STYLE|TEMPLATE)$/.test(node.tagName)) return '';
    if (node.tagName === 'BR') return '<br>';
    const inside = Array.from(node.childNodes, clean).join('');
    if (!allowedTags.has(node.tagName)) return inside;
    const tag = node.tagName.toLowerCase();
    const check = tag==='li' && node.parentElement?.tagName==='UL' && node.hasAttribute('data-jd-check')
      ? ' data-jd-check="'+(node.dataset.jdCheck==='true')+'"' : '';
    return '<'+tag+check+'>'+inside+'</'+tag+'>';
  }
  function safeHTML(source) {
    const template = document.createElement('template');
    template.innerHTML = source || '';
    return Array.from(template.content.childNodes, clean).join('');
  }
  function order(record) {
    const media = record.media || [];
    const unused = new Set(media);
    const parts = [];
    if (Array.isArray(record.body)) {
      for (const part of record.body) {
        if (part?.type === 'text') parts.push({html:safeHTML(part.html)});
        if (part?.type === 'media') {
          const item = media.find(m => m.id === part.id);
          if (unused.delete(item)) parts.push({item});
        }
      }
    } else if (record.text) parts.push({html:h(record.text).replace(/\r?\n/g,'<br>')});
    for (const item of unused) parts.push({item});
    return parts;
  }
  function reading(record, paper = false) {
    const html='<div class="jd-body-flow">'+order(record).map(part => part.item
      ? '<div class="jd-flow-media">'+renderItem(part.item,paper)+'</div>'
      : '<div class="jd-prose-read">'+part.html+'</div>').join('')+'</div>';
    const box=document.createElement('div');
    box.innerHTML=html;
    checkControls(box,false);
    if(!paper)galleries(box.firstElementChild);
    return box.innerHTML;
  }
  function galleries(root){
    for(const rail of root.querySelectorAll(':scope > .jd-gallery'))rail.replaceWith(...rail.children);
    let group;
    for(const node of Array.from(root.children)){
      if(!node.querySelector('.jd-photo')){group=null;continue;}
      if(!group){
        group=document.createElement('div');
        group.className='jd-gallery';
        node.before(group);
      }
      group.append(node);
      if(group.children.length===2){group.tabIndex=0;group.setAttribute('role','region');group.setAttribute('aria-label','Фотографии, листайте по горизонтали');}
    }
  }
  function slot(html = '') {
    const node = document.createElement('div');
    node.className = 'jd-prose';
    node.contentEditable = 'true';
    node.setAttribute('role','textbox');
    node.setAttribute('aria-multiline','true');
    node.setAttribute('aria-label','Текст записи');
    node.dataset.placeholder = 'О чём хочешь записать?';
    node.innerHTML = html;
    return node;
  }
  function tile(item) {
    const node = document.createElement('div');
    node.className = 'jd-edit-media';
    node.dataset.mediaId = item.id;
    node.tabIndex = 0;
    node.setAttribute('role','group');
    node.setAttribute('aria-label',item.kind === 'photo'?'Фотография':'Аудиозапись');
    const photo = item.kind === 'photo';
    node.innerHTML = renderItem(item,false)+(photo?'<button type="button" class="jd-photo-remove" data-compose="remove" aria-label="Убрать фотографию">×</button>':'')+
      '<div class="jd-tile-actions"><button type="button" data-compose="cut">Вырезать</button>'+(photo?'':'<button type="button" data-compose="remove">Убрать</button>')+'</div>';
    return node;
  }
  function flow() { return form.querySelector('[data-compose-body]'); }
  function focusAt(node, end = false) {
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(!end);
    node.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
  }
  function capture() {
    if (!form?.isConnected) return;
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    const el = range.commonAncestorContainer;
    const prose = (el.nodeType === 1 ? el : el.parentElement)?.closest('.jd-prose');
    if (prose && flow().contains(prose)) savedRange = range.cloneRange();
  }
  function restore() {
    if (!savedRange || !flow().contains(savedRange.commonAncestorContainer)) focusAt(flow().lastElementChild,true);
    else {
      const selection = window.getSelection();
      const node = savedRange.startContainer;
      (node.nodeType === 1 ? node : node.parentElement).closest('.jd-prose').focus();
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    return window.getSelection().getRangeAt(0);
  }
  function checkControls(root, editing) {
    for(const box of root.querySelectorAll('input.jd-check-toggle')){
      if(!box.parentElement.matches('ul>li[data-jd-check]') || box!==box.parentElement.querySelector(':scope>input.jd-check-toggle')) box.remove();
    }
    for(const item of root.querySelectorAll('li[data-jd-check]')){
      if(item.parentElement.tagName!=='UL'){delete item.dataset.jdCheck;continue;}
      let box=item.querySelector(':scope>input.jd-check-toggle');
      if(!box){
        box=document.createElement('input');
        box.type='checkbox';
        box.className='jd-check-toggle';
        box.contentEditable='false';
        item.prepend(box);
      }
      box.defaultChecked=item.dataset.jdCheck==='true';
      box.checked=box.defaultChecked;
      box.disabled=!editing;
      box.setAttribute('aria-label',item.textContent.trim()||'Пункт чек-листа');
    }
  }
  function caretItem(range) {
    const node=range?.startContainer;
    return (node?.nodeType===1?node:node?.parentElement)?.closest('li');
  }
  function itemsInRange(prose,range) {
    const current=caretItem(range);
    if(range.collapsed && current)return [current];
    return Array.from(prose.querySelectorAll('li')).filter(item=>range.intersectsNode(item));
  }
  function formatList(type) {
    let range=restore();
    const node=range.commonAncestorContainer;
    const prose=(node.nodeType===1?node:node.parentElement).closest('.jd-prose');
    const items=itemsInRange(prose,range);
    const unordered=document.queryCommandState('insertUnorderedList');
    const alreadyChecks=items.length>0 && items.every(item=>item.hasAttribute('data-jd-check'));
    const changeMarkers=unordered && (type==='check' ? !alreadyChecks : type==='bullet' && items.some(item=>item.hasAttribute('data-jd-check')));
    if(!changeMarkers)document.execCommand(type==='number'?'insertOrderedList':'insertUnorderedList');
    range=window.getSelection().getRangeAt(0);
    for(const item of itemsInRange(prose,range)){
      if(type==='check' && item.parentElement.tagName==='UL')item.dataset.jdCheck ||= 'false';
      else delete item.dataset.jdCheck;
    }
    checkControls(prose,true);
    capture();sync();
  }
  function select(node) {
    form?.querySelector('.jd-edit-media.is-selected')?.classList.remove('is-selected');
    if (node) node.classList.add('is-selected');
  }
  function sync() {
    const items = new Map(value.media.map(m => [m.id,m]));
    const body = [], media = [], texts = [];
    for (const node of flow().querySelectorAll(':scope > .jd-prose,:scope > .jd-edit-media,:scope > .jd-gallery > .jd-edit-media')) {
      if (node.dataset.mediaId) {
        const item = items.get(node.dataset.mediaId);
        if (item) { media.push(item); body.push({type:'media',id:item.id}); }
      } else {
        const text = node.innerText.replace(/\u00a0/g,' ');
        if (!text.trim() && !node.textContent.trim()) continue;
        texts.push(text);
        body.push({type:'text',html:Array.from(node.childNodes,clean).join('')});
      }
    }
    value.body = body;
    value.text = texts.join('\n');
    value.media = media;
    retain();
  }
  function insert(items, atEnd = false) {
    if (!items.length) return;
    const root = flow();
    if (atEnd || !savedRange || !root.contains(savedRange.commonAncestorContainer)) {
      const last = root.lastElementChild;
      if (last.textContent.trim() || last === root.firstElementChild) root.append(...items.map(tile),slot());
      else last.before(...items.map(tile));
    } else {
      const range = restore();
      const node = range.startContainer;
      const prose = (node.nodeType === 1 ? node : node.parentElement).closest('.jd-prose');
      range.deleteContents();
      const right = document.createRange();
      right.selectNodeContents(prose);
      right.setStart(range.startContainer,range.startOffset);
      const tail = slot();
      tail.append(right.extractContents());
      prose.after(...items.map(tile),tail);
      focusAt(tail);
    }
    value.media.push(...items);
    galleries(root);
    select(null);
    sync();
  }
  function append(target, items) {
    for (const item of items) item.id ||= uid();
    if (form?.isConnected && target === value) { insert(items,true); return; }
    target.media.push(...items);
    if (Array.isArray(target.body)) target.body.push(...items.map(m=>({type:'media',id:m.id})));
  }
  function pickItem(node) { return value.media.find(m=>m.id===node?.dataset.mediaId); }
  function remember(item) {
    clipboard = {item, token:uid()};
    const paste = form.querySelector('[data-compose=paste]');
    if (paste) paste.hidden = false;
  }
  function remove(node) {
    const target = node.nextElementSibling || node.previousElementSibling;
    node.remove();
    galleries(flow());
    select(null);
    if (target?.matches('.jd-prose')) focusAt(target);
    sync();
  }
  function pasteItem() { if (clipboard) insert([{...clipboard.item,id:uid()}]); }
  document.addEventListener('selectionchange',capture);
  function mount(next, record) {
    form = next;
    value = record;
    savedRange = null;
    if (!form) return;
    const root = flow();
    const children = [];
    for (const part of order(record)) {
      if (part.item) {
        part.item.id ||= uid();
        if (!children.length) children.push(slot());
        children.push(tile(part.item));
      } else children.push(slot(part.html));
    }
    if (!children.length || !children.at(-1).classList.contains('jd-prose')) children.push(slot());
    root.replaceChildren(...children);
    galleries(root);
    checkControls(root,true);
    form.querySelector('[data-compose=paste]').hidden = !clipboard;
    let splittingCheck=null;
    root.addEventListener('beforeinput',e=>{
      splittingCheck=null;
      if(e.inputType!=='insertParagraph')return;
      const selection=window.getSelection();
      if(!selection.rangeCount)return;
      const item=caretItem(selection.getRangeAt(0));
      if(!item?.hasAttribute('data-jd-check'))return;
      if(!item.textContent.trim() && selection.isCollapsed && !item.querySelector('ol,ul')){
        e.preventDefault();
        document.execCommand('insertUnorderedList');
        checkControls(root,true);capture();sync();
      }else splittingCheck=item;
    });
    root.addEventListener('input',e=>{
      if(e.target.matches('input.jd-check-toggle'))return;
      const selection=window.getSelection();
      if(splittingCheck && selection.rangeCount){
        const next=caretItem(selection.getRangeAt(0));
        if(next && next!==splittingCheck && next.parentElement.tagName==='UL')next.dataset.jdCheck='false';
      }
      splittingCheck=null;
      checkControls(root,true);capture();sync();
    });
    root.addEventListener('change',e=>{
      if(e.target.matches('input.jd-check-toggle')){
        e.target.parentElement.dataset.jdCheck=String(e.target.checked);
        sync();
      }
    });
    root.addEventListener('keyup',capture);
    root.addEventListener('pointerup',capture);
    root.addEventListener('focusin',e=>select(e.target.closest('.jd-edit-media')));
    root.addEventListener('click',e=>{
      if(e.target === root){focusAt(root.lastElementChild,true);return;}
      const node = e.target.closest('.jd-edit-media');
      if (!node) { select(null); return; }
      select(node);
      if (!e.target.closest('button,audio,input')) node.focus();
    });
    for (const eventName of ['copy','cut']) root.addEventListener(eventName,e=>{
      const node = e.target.closest('.jd-edit-media');
      const item = pickItem(node);
      if (!item || !e.clipboardData) return;
      remember(item);
      e.clipboardData.setData(clipboardType,clipboard.token);
      e.clipboardData.setData('text/plain',item.name || 'Вложение дневника');
      e.preventDefault();
      if (eventName === 'cut') remove(node);
    });
    root.addEventListener('paste',e=>{
      if (!e.target.closest('.jd-prose') || !e.clipboardData) return;
      e.preventDefault();
      capture();
      if (clipboard && e.clipboardData.getData(clipboardType) === clipboard.token) pasteItem();
      else document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));
    });
    root.addEventListener('drop',e=>{if(e.dataTransfer?.types.includes('text/html'))e.preventDefault();});
    form.addEventListener('pointerdown',e=>{
      if (e.target.closest('[data-format],[data-list-format],[data-jd=styles],[data-jd=lists],[data-compose=paste]')) { capture(); e.preventDefault(); }
    });
    form.addEventListener('click',e=>{
      const b=e.target.closest('[data-format],[data-list-format],[data-compose]');
      if(!b)return;
      if(b.dataset.format||b.dataset.listFormat){
        if(b.dataset.listFormat)formatList(b.dataset.listFormat);
        else{
          restore();
          const cmd=b.dataset.format;
          document.execCommand(cmd==='heading'||cmd==='body'?'formatBlock':cmd,false,cmd==='heading'?'h3':cmd==='body'?'div':null);
          capture();sync();
        }
        const menu=b.closest('.jd-popover');
        menu.hidden=true;
        menu.previousElementSibling.setAttribute('aria-expanded','false');
      }else if(b.dataset.compose==='paste')pasteItem();
      else {
        const node=b.closest('.jd-edit-media'),item=pickItem(node);
        if(!item)return;
        if(b.dataset.compose==='cut'){remember(item);notify('Выбери место в тексте и нажми «Вставить»');}
        remove(node);
      }
    });
  }
  return {mount, reading, append};
};
