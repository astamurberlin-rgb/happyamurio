/* Выпадающий список Happy — вместо системного меню (Астамур 26.11.2026: «на Windows открывается белое системное меню
 * с синей полоской… чтобы на Windows и iPhone выглядело одинаково»). Один файл для Day, Meal и Sport.
 * Поле <select> остаётся как есть (вид поля задают правила приложения); меняется только то, что открывается по нажатию:
 * непрозрачное меню цвета листа приложения (--hs-sheet-bg, следует за темой), скругление 22 — как подсказки дуг в Day.
 * Строка 44, текст 16 · 400, выбранная — 600 и галочка справа, между строками тонкая линия.
 * Выбор пишет value и шлёт input + change, как системный список, поэтому код приложений не меняется.
 * Клавиатура: Enter, пробел, Alt+↓ или F4 открывают; ↑ ↓ ходят по строкам; Esc закрывает. Стрелки на закрытом поле
 * меняют значение как раньше. Пропускаются select[multiple], select[size>1] и [data-native-select].
 * Claude · 26.11.2026. Общий образец и токены — Codex · 27.11.2026. */
(function(){
  if(window.HappySelect) return;
  var CSS=`
    .hsel-layer{position:fixed;inset:0;z-index:var(--happy-layer-select)}
    .hsel-menu{position:fixed}
    [data-happy-menu]:not([hidden]){
      display:flex;flex-direction:column;overflow-y:auto;overscroll-behavior:contain;
      box-sizing:border-box;border-radius:var(--happy-radius-sheet);background:var(--hs-sheet-bg);
      color:var(--happy-ink);box-shadow:var(--happy-shadow-select);scrollbar-width:none;
      font-family:var(--happy-font-sans);animation:hselIn var(--happy-motion-select-open) var(--happy-ease-select-open);
      -webkit-tap-highlight-color:transparent
    }
    [data-happy-menu]::-webkit-scrollbar{display:none}
    .hsel-menu.hsel-up{animation-name:hselUp}
    @keyframes hselIn{from{transform:translateY(calc(0px - var(--happy-space-4)))}}
    @keyframes hselUp{from{transform:translateY(var(--happy-space-4))}}
    [data-happy-menu]>button{
      display:flex;align-items:center;flex:none;box-sizing:border-box;gap:var(--happy-space-12);
      min-height:var(--happy-size-select-row);padding:var(--happy-space-10) var(--happy-space-16);
      border:0;border-radius:0;border-top:var(--happy-size-select-rule) solid var(--happy-select-divider);
      background:none;color:inherit;font:inherit;font-size:var(--happy-type-body-size);
      font-weight:var(--happy-type-body-weight);line-height:var(--happy-size-select-line);
      justify-content:flex-start;text-align:start;cursor:pointer
    }
    [data-happy-menu]>button:first-child,.hsel-group:first-child{border-top:0}
    .hsel-opt span{flex:1;min-width:0}
    [data-happy-menu]>button[aria-selected="true"]{font-weight:var(--happy-type-row-weight)}
    .hsel-opt svg{
      flex:none;width:var(--happy-size-select-check);height:var(--happy-size-select-check);
      fill:none;stroke:currentColor;stroke-width:var(--happy-size-select-check-stroke);
      stroke-linecap:round;stroke-linejoin:round
    }
    .hsel-opt:not([aria-selected="true"]) svg{visibility:hidden}
    @media (hover:hover){[data-happy-menu]>button:enabled:hover{background:var(--happy-select-hover)}}
    [data-happy-menu]>button:enabled:active,[data-happy-menu]>button:focus-visible{background:var(--happy-select-pressed)}
    [data-happy-menu]>button:disabled{color:var(--happy-select-disabled);cursor:default}
    .hsel-group{
      flex:none;padding:var(--happy-space-12) var(--happy-space-16) var(--happy-space-4);
      border-top:var(--happy-size-select-rule) solid var(--happy-select-divider);
      font-size:var(--happy-type-tab-label-size);font-weight:var(--happy-type-body-weight);color:var(--happy-muted)
    }
    @media (prefers-reduced-motion:reduce){[data-happy-menu]:not([hidden]){animation:none}}
  `;
  var CHECK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var open=null;
  // Оформление доступно и кнопочным меню «⋯» до первого нажатия на select.
  var sheet=document.createElement('style');
  sheet.id='hselStyle'; sheet.textContent=CSS; document.head.appendChild(sheet);
  function ours(t){ var s=t&&t.closest&&t.closest('select'); if(!s||s.disabled||s.multiple||s.size>1||s.hasAttribute('data-native-select')) return null; return s }
  function esc(t){ return String(t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
  function close(focusBack){
    if(!open) return; var o=open; open=null;
    o.layer.remove(); window.removeEventListener('resize',onWin); window.removeEventListener('scroll',onScroll,true);
    if(focusBack) try{ o.sel.focus({preventScroll:true}) }catch(e){}
  }
  function onWin(){ close(false) }
  function onScroll(e){ if(open&&!open.menu.contains(e.target)) close(false) }
  function pick(sel,i){
    if(sel.selectedIndex!==i){ sel.selectedIndex=i; sel.dispatchEvent(new Event('input',{bubbles:true})); sel.dispatchEvent(new Event('change',{bubbles:true})) }
    close(true);
  }
  function show(sel){
    close(false);
    var layer=document.createElement('div'); layer.className='hsel-layer'; layer.setAttribute('data-hs-keep','');
    var menu=document.createElement('div'); menu.className='hsel-menu'; menu.setAttribute('data-happy-menu',''); menu.setAttribute('role','listbox');
    var lab=sel.getAttribute('aria-label')||(sel.labels&&sel.labels[0]&&sel.labels[0].textContent.trim())||''; if(lab) menu.setAttribute('aria-label',lab);
    var html='',idx=0;
    Array.prototype.forEach.call(sel.children,function(ch){
      if(ch.tagName==='OPTGROUP'){ html+='<div class="hsel-group" role="presentation">'+esc(ch.label)+'</div>'; Array.prototype.forEach.call(ch.children,add) }
      else add(ch);
    });
    function add(o){
      if(o.tagName!=='OPTION'){ return }
      var i=o.index; if(o.hidden){ return }
      html+='<button type="button" class="hsel-opt" role="option" data-i="'+i+'" aria-selected="'+(i===sel.selectedIndex)+'"'+(o.matches(':disabled')?' disabled':'')+'><span>'+esc(o.textContent.trim()||'—')+'</span>'+CHECK+'</button>'; idx++;
    }
    if(!idx) return;
    menu.innerHTML=html;
    layer.appendChild(menu);
    // Диалог в верхнем слое браузера закрывает всё, что вставлено снаружи него.
    (sel.closest('dialog[open]')||document.body).appendChild(layer);
    var anchor=sel.getBoundingClientRect();
    var styles=getComputedStyle(menu);
    function pixels(name){ return parseFloat(styles.getPropertyValue('--happy-'+name)) }
    var gap=pixels('space-select-gap'), edge=pixels('space-16');
    var vw=document.documentElement.clientWidth, vh=window.innerHeight;
    var width=Math.min(Math.max(anchor.width,pixels('size-select-min-width')),Math.max(0,vw-edge-edge));
    menu.style.width=width+'px';
    menu.style.left=Math.max(edge,Math.min(anchor.left,vw-edge-width))+'px';
    var below=vh-anchor.bottom-gap-edge, above=anchor.top-gap-edge;
    var maxHeight=pixels('size-select-max-height');
    var preferred=Math.min(menu.scrollHeight,maxHeight,pixels('size-select-preferred-height'));
    var upward=below<preferred&&above>below;
    menu.classList.toggle('hsel-up',upward);
    if(upward) menu.style.bottom=(vh-anchor.top+gap)+'px';
    else menu.style.top=(anchor.bottom+gap)+'px';
    menu.style.maxHeight=Math.max(0,Math.min(upward?above:below,maxHeight))+'px';
    layer.addEventListener('pointerdown',function(e){ if(!menu.contains(e.target)){ e.preventDefault(); close(false) } });
    layer.addEventListener('click',function(e){ var b=e.target.closest('.hsel-opt'); if(b&&!b.disabled) pick(sel,+b.dataset.i) });
    menu.addEventListener('keydown',function(e){
      var list=Array.prototype.filter.call(menu.querySelectorAll('.hsel-opt'),function(b){ return !b.disabled }), k=list.indexOf(document.activeElement);
      if(e.key==='Escape'||e.key==='Tab'){ e.preventDefault(); close(true) }
      else if(e.key==='ArrowDown'){ e.preventDefault(); (list[Math.min(k+1,list.length-1)]||list[0]).focus() }
      else if(e.key==='ArrowUp'){ e.preventDefault(); (list[Math.max(k-1,0)]||list[0]).focus() }
      else if(!list.length) return;
      else if(e.key==='Home'){ e.preventDefault(); list[0]&&list[0].focus() }
      else if(e.key==='End'){ e.preventDefault(); list[list.length-1]&&list[list.length-1].focus() }
    });
    var cur=menu.querySelector('[aria-selected="true"]:enabled')||menu.querySelector('.hsel-opt:not(:disabled)');
    if(cur){ menu.scrollTop=Math.max(0,cur.offsetTop-menu.clientHeight/2+cur.offsetHeight/2); try{ cur.focus({preventScroll:true}) }catch(e){} }
    open={sel:sel,layer:layer,menu:menu};
    window.addEventListener('resize',onWin); window.addEventListener('scroll',onScroll,true);
  }
  /* Мышь и перо: системное меню открывается на mousedown — гасим его и открываем своё. */
  document.addEventListener('mousedown',function(e){ if(e.button!==0) return; var s=ours(e.target); if(!s) return; e.preventDefault(); try{ s.focus({preventScroll:true}) }catch(x){} if(open&&open.sel===s) close(false); else show(s) },true);
  /* Палец (iPhone): системный список открывается после касания — гасим конец касания, если палец не листал страницу. */
  var touch=null;
  document.addEventListener('touchstart',function(e){ var s=ours(e.target); touch=s?{s:s,x:e.touches[0].clientX,y:e.touches[0].clientY}:null },{capture:true,passive:true});
  document.addEventListener('touchend',function(e){
    if(!touch) return; var t=touch, c=e.changedTouches[0]; touch=null;
    var slop=parseFloat(getComputedStyle(t.s).getPropertyValue('--happy-space-10'));
    if(Math.abs(c.clientX-t.x)>slop||Math.abs(c.clientY-t.y)>slop) return;
    e.preventDefault(); show(t.s);
  },{capture:true,passive:false});
  document.addEventListener('click',function(e){ if(ours(e.target)) e.preventDefault() },true);
  document.addEventListener('keydown',function(e){
    var s=ours(e.target); if(!s||open) return;
    if(e.key==='Enter'||e.key===' '||e.key==='F4'||(e.altKey&&(e.key==='ArrowDown'||e.key==='ArrowUp'))){ e.preventDefault(); show(s) }
  },true);
  window.HappySelect={open:show,close:function(){ close(false) }};
})();
