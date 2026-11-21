/* Happy appearance picker v2.1 — slot data-happy-appearance-slot (Day 54.1 / Meal 26.1 / Sport 38.6). Live preview is transactional. Presets: Color Studio 12.5, collection v3.
   Only a validated ID is stored. No diary/auth writes or default migration.
   19.11.2026 (Sport 44.5): необязательное поле button — главная кнопка с микрофоном: 'theme' (как у темы, по умолчанию,
   и для прежних записей без поля), 'original' (исходная кнопка приложения) или id темы. Sport выбирает его каруселями в
   «Настроить тему» (data-happy-appearance-entry="inline" — без кнопки «Выбрать оформление»); Day и Meal — как прежде. */
(function(root){'use strict';
 const G=root.HappyGradients,R=root.HappyReferenceThemes;
 if(!G||!R)return;
 const themes=R.themes||R.items;
 if(!Array.isArray(themes)||themes.length!==10)return;
 const app=document.documentElement.dataset.happyAppearanceApp;
 if(!['day','meal','sport'].includes(app))return;
 const key='happy-'+app+'-appearance-v1';
 let current='',currentButton='theme',previewId=null,ready=false,dialog=null,opener=null,busy=false,outsideStart=null;
 const valid=id=>id===''||themes.some(t=>t.id===id);
 const validButton=b=>b==='theme'||b==='original'||themes.some(t=>t.id===b);
 const name=id=>themes.find(t=>t.id===id)?.name||'По умолчанию · исходное';
 const rgba=(h,a)=>'rgba('+[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(',')+','+a+')';
 function skin(id,button){
  if(button===undefined)button=currentButton;
  let style=document.getElementById('happy-appearance-skin');
  const t=id?themes.find(t=>t.id===id):null;if(id&&!t)return;
  const src=button==='theme'?id:button==='original'?'':button,b=src?themes.find(t=>t.id===src):null;
  document.documentElement.dataset.happyAppearanceButton=button;
  if(!t&&!b){if(style)style.remove();document.documentElement.removeAttribute('data-happy-appearance');return;}
  let css='';
  if(t){const s=t.state,bg=G.css(s.backgroundGradient);
   css+='html{background:'+bg+'!important;}body{background:transparent!important;} html[data-happy-appearance] body>.bg{background:'+bg+'!important;} :root{--sport-background:'+bg+';}';}
  if(b){const s=b.state,btn=G.css(s.buttonGradient),shine=Number(s.buttonShine);
   const shadow=shine>0?'0 6px 14px #2a184844,0 0 25px '+rgba(s.buttonColor,Math.min(.5,shine/72)):'0 5px 14px #00000028,inset 0 1px 0 #ffffff40';
   // Studio's default glass tokens deliberately retain each application's glass.
   css+=' :root{--fab:'+G.colors(s.buttonGradient)[0].color+';}';
   css+=' .fab,#fab,.dockFab,.mic-fab,.mlMic,#sport-fab,#nowSave{background:'+btn+'!important;background-blend-mode:normal!important;box-shadow:'+shadow+'!important;filter:none!important;color:'+s.buttonTextColor+'!important;}';
   css+=' .fab::before,.fab::after,.dockFab::before,.dockFab::after,.mic-fab::before,.mic-fab::after,#nowSave::before,#nowSave::after{background:none!important;box-shadow:none!important;}';
   css+=' .fab svg,.dockFab svg,.mic-fab svg,.mlMic svg,#sport-fab svg,#nowSave svg{stroke:'+s.buttonTextColor+'!important;filter:none!important;} .fab svg [stroke],.dockFab svg [stroke],.mic-fab svg [stroke],#nowSave svg [stroke]{stroke:'+s.buttonTextColor+'!important;}';}
  // Лаборатория 21.11.2026: тема подменяет общие цвета (shared/happy-colors.css) — текст, подписи, заголовок, акцент.
  const ok=c=>/^#[0-9a-f]{6}$/i.test(c||'');let tokens='';
  if(t&&t.ui){const u=t.ui;if(ok(u.textColor))tokens+='--happy-ink:'+u.textColor+';';if(ok(u.mutedColor))tokens+='--happy-muted:'+u.mutedColor+';--happy-dim:'+rgba(u.mutedColor,.7)+';';if(ok(u.headingColor||u.textColor))tokens+='--happy-heading:'+(u.headingColor||u.textColor)+';';}
  if(b){const s=b.state,a=s.buttonColor;if(ok(a))tokens+='--happy-accent:'+a+';--happy-dock-accent:'+a+';--hs-switch-on:'+(b.mode==='night'?'color-mix(in srgb,'+a+' 55%,#fff)':a)+';--hs-seg-ink:'+a+';--hs-cancel-ink:'+a+';--hs-pill-on-ink:'+a+';--hs-primary:'+G.css(s.buttonGradient)+';';if(ok(s.buttonTextColor))tokens+='--happy-on-accent:'+s.buttonTextColor+';';}
  if(tokens)css+=' :root:root{'+tokens+'}';
  if(!style){style=document.createElement('style');style.id='happy-appearance-skin';document.head.append(style);}style.textContent=css;
  if(t)document.documentElement.dataset.happyAppearance=id;else document.documentElement.removeAttribute('data-happy-appearance');
 }
 function labels(){document.querySelectorAll('[data-happy-appearance-label]').forEach(el=>{el.textContent=name(current)});}
 function entry(){
  if(document.documentElement.dataset.happyAppearanceEntry==='inline')return;   // выбор встроен в страницу приложения (Sport — «Настроить тему»)
  const button=()=>{const b=document.createElement('button');b.type='button';b.className='happy-button';b.dataset.happyAppearanceOpen='';b.setAttribute('aria-haspopup','dialog');
   const title=document.createElement('span');title.textContent='Выбрать оформление';const label=document.createElement('small');label.dataset.happyAppearanceLabel='';label.textContent=name(current);b.append(title,label);return b;};
  // Settings structure (AGENTS.md): the picker lives under «Приложение → Оформление» when the page provides a slot, as in Sport.
  document.querySelectorAll('[data-happy-appearance-slot]').forEach(slot=>{if(!slot.querySelector('[data-happy-appearance-open]'))slot.append(button())});
  if(document.querySelector('[data-happy-appearance-slot]'))return;
  document.querySelectorAll('[data-happy-section="account"]').forEach(account=>{
   if(account.nextElementSibling?.classList.contains('happy-appearance-entry'))return;
   const section=document.createElement('section');section.className='happy-section happy-appearance-entry';section.dataset.happySection='appearance';
   section.append(button());account.after(section);
  });
 }
 function paintDialog(id){
  if(!dialog)return;
  const preset=themes.find(t=>t.id===id),st=preset?.state;
  const back=document.querySelector('body>.bg'),fab=document.querySelector('#nowSave,.fab,.dockFab,.mlMic,#sport-fab');
  const bg=st?G.css(st.backgroundGradient):(back?getComputedStyle(back).backgroundImage:getComputedStyle(document.documentElement).backgroundImage);
  const button=st?G.css(st.buttonGradient):(fab?getComputedStyle(fab).backgroundImage:'none');
  const base=st?.base?.[2]||getComputedStyle(document.documentElement).getPropertyValue('--base').trim()||'#ffffff';
  // Neutral contrast treatment only; the actual palette/gradients are the approved preset.
  const luminance=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const light=st?['happy-ref-mint-v1','happy-ref-sport-v1'].includes(id):false;
  dialog.style.setProperty('--ha-bg',bg);
  dialog.style.setProperty('--ha-base',base);
  dialog.style.setProperty('--ha-ink',light?'#101828':'#ffffff');
  dialog.style.setProperty('--ha-glass',light?'rgba(255,255,255,.38)':'rgba(0,0,0,.50)');
  dialog.style.setProperty('--ha-line',light?'rgba(16,24,40,.48)':'rgba(255,255,255,.55)');
  dialog.style.setProperty('--ha-focus',light?'#101828':'#ffffff');
  dialog.style.setProperty('--ha-button',button);
  dialog.style.setProperty('--ha-button-color',st?.buttonColor||(fab?getComputedStyle(fab).backgroundColor:base));
  dialog.style.setProperty('--ha-button-text',st?(luminance(st.buttonColor)>.183?'#101828':st.buttonTextColor):(fab?getComputedStyle(fab).color:'#ffffff'));
  dialog.dataset.previewPreset=id||'original';
 }
 function preview(id){
  if(!valid(id))return;previewId=id;skin(id);paintDialog(id);
  if(dialog){dialog.querySelectorAll('input').forEach(x=>x.checked=x.value===id);const status=dialog.querySelector('.ha-preview-status');status.textContent=id===current?'Сохранённое оформление: '+name(current):'Предпросмотр: '+name(id)+' · ещё не сохранено';}
 }
 function close(){if(busy)return;skin(current);previewId=null;if(dialog?.open)dialog.close();opener?.focus();}
 function open(button){
  if(!ready||busy)return;opener=button;
  if(!dialog){
   dialog=document.createElement('dialog');dialog.id='happy-appearance-dialog';dialog.setAttribute('aria-labelledby','happy-appearance-title');dialog.setAttribute('aria-describedby','happy-appearance-help');
   dialog.innerHTML='<div class="ha-layout"><header class="ha-head"><h2 id="happy-appearance-title">Выбрать оформление</h2></header><div class="ha-body"><p id="happy-appearance-help">Нажми на тему — увидишь её сразу. «Применить» сохранит выбор, «Отмена» вернёт прежний вид.</p><p class="ha-preview-status" role="status" aria-live="polite"></p><fieldset><legend>Оформление приложения</legend><label class="ha-choice"><input type="radio" name="happy-appearance" value=""><span>По умолчанию · исходное</span></label><div class="ha-grid" style="margin-top:10px"></div></fieldset></div><p class="ha-error" role="alert" hidden></p><footer class="ha-actions"><button type="button" class="ha-cancel">Отмена</button><button type="button" class="ha-apply">Применить</button></footer></div>';
   const grid=dialog.querySelector('.ha-grid');themes.forEach(t=>{const label=document.createElement('label');label.className='ha-choice';const radio=document.createElement('input');radio.type='radio';radio.name='happy-appearance';radio.value=t.id;const text=document.createElement('span');text.className='ha-theme';const swatch=document.createElement('span');swatch.className='ha-swatch';swatch.style.background=G.css(t.state.backgroundGradient);swatch.setAttribute('aria-hidden','true');const title=document.createElement('span');title.textContent=t.name;text.append(swatch,title);label.append(radio,text);grid.append(label)});
   document.body.append(dialog);
   dialog.querySelector('.ha-close')?.addEventListener('click',close);dialog.querySelector('.ha-cancel').addEventListener('click',close);
   dialog.addEventListener('change',e=>{if(!busy&&e.target.matches('input[name="happy-appearance"]')){dialog.querySelector('.ha-error').hidden=true;preview(e.target.value)}});
   const isOutside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};
   dialog.addEventListener('pointerdown',e=>{outsideStart=e.target===dialog&&isOutside(e)?{id:e.pointerId,x:e.clientX,y:e.clientY}:null});
   dialog.addEventListener('pointercancel',()=>{outsideStart=null});
   dialog.addEventListener('pointerup',e=>{const p=outsideStart;outsideStart=null;if(p&&p.id===e.pointerId&&e.target===dialog&&isOutside(e)&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<8)close()});
   dialog.addEventListener('close',()=>{if(!dialog.open){skin(current);previewId=null;outsideStart=null}});
   dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
   dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();close()}},true);
   dialog.querySelector('.ha-apply').addEventListener('click',async()=>{
    if(busy)return;const id=dialog.querySelector('input:checked')?.value;if(!valid(id))return;
    if(id===current){close();return;}busy=true;dialog.querySelectorAll('button,input').forEach(x=>x.disabled=true);
    const error=dialog.querySelector('.ha-error');error.hidden=true;
    try{await root.rawSet(key,JSON.stringify({version:1,presetId:id,button:currentButton}));current=id;skin(id);labels();busy=false;close();}
    catch(e){preview(current);error.textContent='Не удалось сохранить оформление. Возвращён прежний вид. Выбери тему и попробуй ещё раз.';error.hidden=false;}
    finally{busy=false;dialog.querySelectorAll('button,input').forEach(x=>x.disabled=false);}
   });
  }
  dialog.querySelectorAll('input').forEach(x=>x.checked=x.value===current);dialog.querySelector('.ha-error').hidden=true;
  preview(current);dialog.showModal();dialog.querySelector('input:checked').focus();
 }
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-happy-appearance-open]');if(b)open(b)});
 async function init(){
  try{const saved=JSON.parse(await root.rawGet(key)||'null');if(saved?.version===1&&valid(saved.presetId)){current=saved.presetId;if(validButton(saved.button))currentButton=saved.button;skin(current)}}catch(e){}
  ready=true;entry();labels();
  new MutationObserver(entry).observe(document.body,{childList:true,subtree:true});
 }
 /* Выбор без окна (Sport, «Настроить тему»): сохранить тему и/или главную кнопку сразу. */
 async function choose(theme,button){
  if(theme===undefined)theme=current;if(button===undefined)button=currentButton;
  if(!valid(theme)||!validButton(button))throw Error('Неизвестное оформление');
  await root.rawSet(key,JSON.stringify({version:1,presetId:theme,button}));
  current=theme;currentButton=button;skin(current);labels();
 }
 root.HappyAppearance={init,skin,themes,choose,validButton,get button(){return currentButton},get selected(){return current},get previewed(){return previewId},get ready(){return ready}};
 init();
})(globalThis);
