/* Выпадающий список Happy — вместо системного меню (Астамур 26.11.2026: «на Windows открывается белое системное меню
 * с синей полоской… чтобы на Windows и iPhone выглядело одинаково»). Один файл для Day, Meal и Sport.
 * Поле <select> остаётся как есть (вид поля задают правила приложения); меняется только то, что открывается по нажатию:
 * стеклянное меню цвета листа приложения (--hs-sheet-bg, следует за темой), скругление 22 — как подсказки дуг в Day.
 * Строка 44, текст 16 · 400, выбранная — 600 и галочка справа, между строками тонкая линия.
 * Выбор пишет value и шлёт input + change, как системный список, поэтому код приложений не меняется.
 * Клавиатура: Enter, пробел, Alt+↓ или F4 открывают; ↑ ↓ ходят по строкам; Esc закрывает. Стрелки на закрытом поле
 * меняют значение как раньше. Пропускаются select[multiple], select[size>1] и [data-native-select].
 * — Claude · 26.11.2026 */
(function(){
  if(window.HappySelect) return;
  var CSS='.hsel-layer{position:fixed;inset:0;z-index:2147483000}'+
    '.hsel-menu{position:fixed;display:flex;flex-direction:column;overflow-y:auto;overscroll-behavior:contain;border-radius:22px;'+
      'background:var(--hs-sheet-bg,#2a2f45);color:#fff;-webkit-backdrop-filter:blur(18px) saturate(1.2);backdrop-filter:blur(18px) saturate(1.2);'+
      'box-shadow:inset 0 0 0 1px rgba(255,255,255,.28),0 18px 40px rgba(0,0,0,.28);animation:hselIn .16s ease-out;scrollbar-width:none;'+
      'font-family:inherit;-webkit-tap-highlight-color:transparent}'+
    '.hsel-menu::-webkit-scrollbar{display:none}'+
    '.hsel-menu.hsel-up{animation-name:hselUp}'+
    '@keyframes hselIn{from{opacity:0;transform:translateY(-4px)}}@keyframes hselUp{from{opacity:0;transform:translateY(4px)}}'+
    '.hsel-opt{display:flex;align-items:center;gap:12px;flex:none;min-height:44px;padding:10px 16px;border:0;border-top:1px solid rgba(255,255,255,.14);'+
      'background:none;color:inherit;font:inherit;font-size:16px;font-weight:400;line-height:22px;text-align:left;cursor:pointer;outline:0}'+
    '.hsel-opt:first-child{border-top:0}'+
    '.hsel-opt span{flex:1;min-width:0}'+
    '.hsel-opt[aria-selected="true"]{font-weight:600}'+
    '.hsel-opt svg{flex:none;width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}'+
    '.hsel-opt:not([aria-selected="true"]) svg{visibility:hidden}'+
    '.hsel-opt:active,.hsel-opt:focus-visible{background:rgba(255,255,255,.18)}'+
    '@media (hover:hover){.hsel-opt:hover{background:rgba(255,255,255,.12)}}'+
    '.hsel-opt:disabled{opacity:.45;cursor:default}'+
    '.hsel-group{flex:none;padding:12px 16px 4px;border-top:1px solid rgba(255,255,255,.14);font-size:12px;font-weight:400;color:rgba(255,255,255,.7)}'+
    '.hsel-group:first-child{border-top:0}'+
    '@media (prefers-reduced-motion:reduce){.hsel-menu{animation:none}}';
  var CHECK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var open=null;
  function style(){ if(document.getElementById('hselStyle')) return; var s=document.createElement('style'); s.id='hselStyle'; s.textContent=CSS; document.head.appendChild(s) }
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
    close(false); style();
    var layer=document.createElement('div'); layer.className='hsel-layer';
    var menu=document.createElement('div'); menu.className='hsel-menu'; menu.setAttribute('role','listbox');
    var lab=sel.getAttribute('aria-label')||(sel.labels&&sel.labels[0]&&sel.labels[0].textContent.trim())||''; if(lab) menu.setAttribute('aria-label',lab);
    var html='',idx=0;
    Array.prototype.forEach.call(sel.children,function(ch){
      if(ch.tagName==='OPTGROUP'){ html+='<div class="hsel-group" role="presentation">'+esc(ch.label)+'</div>'; Array.prototype.forEach.call(ch.children,add) }
      else add(ch);
    });
    function add(o){
      if(o.tagName!=='OPTION'){ return }
      var i=o.index; if(o.hidden){ return }
      html+='<button type="button" class="hsel-opt" role="option" data-i="'+i+'" aria-selected="'+(i===sel.selectedIndex)+'"'+(o.disabled?' disabled':'')+'><span>'+esc(o.textContent.trim()||'—')+'</span>'+CHECK+'</button>'; idx++;
    }
    if(!idx) return;
    menu.innerHTML=html; layer.appendChild(menu); document.body.appendChild(layer);
    /* место: под полем, если не влезает — над ним; ширина как у поля, не уже 200 и не шире экрана без 16 по краям */
    var r=sel.getBoundingClientRect(), vw=document.documentElement.clientWidth, vh=window.innerHeight, gap=6, edge=16;
    var w=Math.min(Math.max(r.width,200),vw-edge*2), left=Math.min(Math.max(r.left,edge),vw-edge-w);
    var below=vh-r.bottom-gap-edge, above=r.top-gap-edge, want=Math.min(menu.scrollHeight,340);
    menu.style.width=w+'px'; menu.style.left=left+'px';
    if(below>=Math.min(want,200)||below>=above){ menu.style.top=(r.bottom+gap)+'px'; menu.style.maxHeight=Math.max(below,132)+'px' }
    else{ menu.classList.add('hsel-up'); menu.style.bottom=(vh-r.top+gap)+'px'; menu.style.maxHeight=Math.max(above,132)+'px' }
    menu.style.maxHeight=Math.min(parseFloat(menu.style.maxHeight),340)+'px';
    layer.addEventListener('pointerdown',function(e){ if(!menu.contains(e.target)){ e.preventDefault(); close(false) } });
    layer.addEventListener('click',function(e){ var b=e.target.closest('.hsel-opt'); if(b&&!b.disabled) pick(sel,+b.dataset.i) });
    menu.addEventListener('keydown',function(e){
      var list=Array.prototype.filter.call(menu.querySelectorAll('.hsel-opt'),function(b){ return !b.disabled }), k=list.indexOf(document.activeElement);
      if(e.key==='Escape'||e.key==='Tab'){ e.preventDefault(); close(true) }
      else if(e.key==='ArrowDown'){ e.preventDefault(); (list[Math.min(k+1,list.length-1)]||list[0]).focus() }
      else if(e.key==='ArrowUp'){ e.preventDefault(); (list[Math.max(k-1,0)]||list[0]).focus() }
      else if(e.key==='Home'){ e.preventDefault(); list[0]&&list[0].focus() }
      else if(e.key==='End'){ e.preventDefault(); list[list.length-1]&&list[list.length-1].focus() }
    });
    var cur=menu.querySelector('[aria-selected="true"]')||menu.querySelector('.hsel-opt:not(:disabled)');
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
    if(Math.abs(c.clientX-t.x)>10||Math.abs(c.clientY-t.y)>10) return;
    e.preventDefault(); show(t.s);
  },{capture:true,passive:false});
  document.addEventListener('click',function(e){ if(ours(e.target)) e.preventDefault() },true);
  document.addEventListener('keydown',function(e){
    var s=ours(e.target); if(!s||open) return;
    if(e.key==='Enter'||e.key===' '||e.key==='F4'||(e.altKey&&(e.key==='ArrowDown'||e.key==='ArrowUp'))){ e.preventDefault(); show(s) }
  },true);
  window.HappySelect={open:show,close:function(){ close(false) }};
})();
