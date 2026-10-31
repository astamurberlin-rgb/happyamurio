(function(){
  'use strict';
  const A=HappyArc,$=id=>document.getElementById(id),DRAFT='happy-day.arc-draft.v1',SAVED='happy-day.arc-presets.v1';
  const safeRead=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch(_){return fallback;}};
  let config=A.normalize(safeRead(DRAFT,A.read())),saved=safeRead(SAVED,[]),paused=false,kind='mood',progress=0;
  if(!Array.isArray(saved))saved=[];
  const names={mood:'Самочувствие',mind:'Осознанность',diary:'Дневник',activity:'Активность'};
  const icons={mind:'<path d="M12 20V12M12 16C4 17 3 10 3 5c6 0 9 4 9 9M12 14c0-7 3-10 9-10 0 7-2 11-9 11"/>',diary:'<path d="M16 3H5a2 2 0 0 0-2 2v15h15v-7M7 8h5M7 12h3M14 11l6-6 2 2-6 6-3 1z"/>',activity:'<path d="M7 8v8m-3-6v4m3-2h10m0-4v8m3-6v4"/>'};
  const mainRenderer=A.renderer($('mainCanvas'),()=>({...config,playing:!paused}));
  const peekRenderer=A.renderer($('peekCanvas'),()=>({...config,playing:!paused}));
  const miniRenderers=[];
  A.PRESETS.forEach(p=>{
    const b=document.createElement('button');b.className='variant';b.dataset.variant=p.id;b.setAttribute('aria-pressed',String(config.mode===p.id));b.setAttribute('title',p.note);b.innerHTML='<span class="variant-art"><canvas aria-hidden="true"></canvas></span><b>'+p.name+'</b>';$('variants').append(b);
    miniRenderers.push(A.renderer(b.querySelector('canvas'),()=>({...A.preset(p.id),playing:!paused})));
  });
  config.colors.forEach((c,i)=>{
    const div=document.createElement('div');div.className='color-stop';div.innerHTML='<label class="color-input" id="swatch'+i+'"><span class="sr-only">Выбрать цвет '+(i+1)+'</span><input type="color" id="color'+i+'" value="'+c+'"></label><div class="color-fields"><label for="hex'+i+'">Цвет '+(i+1)+'</label><input id="hex'+i+'" value="'+c+'" maxlength="7" spellcheck="false" aria-label="Цвет '+(i+1)+' в HEX"></div>';$('colorStops').append(div);
    $('color'+i).addEventListener('input',e=>{config.colors[i]=e.target.value;edited();});
    $('hex'+i).addEventListener('input',e=>{const v=e.target.value.trim();if(/^#[0-9a-f]{6}$/i.test(v)){e.target.setAttribute('aria-invalid','false');config.colors[i]=v;edited();}else{e.target.setAttribute('aria-invalid','true');}});
    $('hex'+i).addEventListener('blur',()=>{if($('hex'+i).getAttribute('aria-invalid')==='true'){$('hex'+i).value=config.colors[i];$('hex'+i).setAttribute('aria-invalid','false');}});
  });
  function persistDraft(){try{localStorage.setItem(DRAFT,JSON.stringify(config));}catch(_){$('saveStatus').textContent='Предпросмотр работает, но браузер не сохранил настройки.';}}
  function edited(){config=A.normalize({...config,enabled:true,playing:true});persistDraft();$('saveStatus').textContent='Изменения видны в предпросмотре. Примените, когда понравится.';sync();}
  function sync(){
    document.querySelectorAll('[data-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.variant===config.mode)));
    config.colors.forEach((c,i)=>{$('color'+i).value=c;$('hex'+i).value=c;$('swatch'+i).style.setProperty('--color',c);});
    $('gradientBar').style.background='linear-gradient(90deg,'+config.colors.concat(config.colors[0]).join(',')+')';
    $('duration').min=config.mode==='breathe'?'1.5':'4';$('duration').step=config.mode==='breathe'?'0.25':'1';$('durationMin').textContent='Быстрее · '+$('duration').min+' с';$('breathControls').hidden=config.mode!=='breathe';
    ['intensity','softness','duration','breathDepth'].forEach(k=>{const el=$(k);el.value=config[k];el.style.setProperty('--range',(config[k]-Number(el.min))/(Number(el.max)-Number(el.min))*100+'%');$(k+'Value').textContent=config[k]+(k==='duration'?' с':'%');});
    const staticMode=config.mode==='still';$('duration').disabled=staticMode;
    $('directionPicker').querySelectorAll('button').forEach(b=>{b.disabled=staticMode||config.mode==='breathe';b.setAttribute('aria-pressed',String(Number(b.dataset.direction)===config.direction));});
    $('motionHint').textContent=staticMode?'Неподвижный градиент':config.mode==='breathe'?'Плавное нарастание':'Без рывков';
    $('scope').value=config.scope;$('centerOnly').checked=config.centerOnly;
    $('pause').setAttribute('aria-pressed',String(paused));$('pause').innerHTML=paused?'<span aria-hidden="true">▷</span> Продолжить':'<span aria-hidden="true">Ⅱ</span> Пауза';
    const p=A.PRESETS.find(p=>p.id===config.mode);
    $('liveLabel').textContent=!config.enabled?'Исходная дуга':p.name+(paused?' · пауза':config.mode==='still'?'':' · '+config.duration+' с');
    $('peekLabel').textContent=!config.enabled?'Исходная дуга':p.name;
    $('reducedNote').hidden=!matchMedia('(prefers-reduced-motion: reduce)').matches;
    mainRenderer.refresh();peekRenderer.refresh();miniRenderers.forEach(r=>r.refresh());
  }
  function point(a){return [120+92*Math.cos(a*Math.PI/180),120+92*Math.sin(a*Math.PI/180)];}
  function arc(a,b){const s=point(a),e=point(b);return 'M'+s.join(',')+' A92 92 0 '+(Math.abs(b-a)>180?1:0)+' '+(b>a?1:0)+' '+e.join(',');}
  function renderPreview(){
    $('ringLabel').textContent=names[kind];$('previewButton').innerHTML=kind==='mood'?'<strong>Отметить<br>самочувствие</strong>':'<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[kind]+'</svg>';
    let paths='<path d="'+arc(122,418)+'" stroke="rgba(255,255,255,.2)"/>';
    if(progress){if(kind==='mood'){paths+='<path d="'+arc(-90,-90+148*progress)+'" stroke="#7CE3C9"/><path d="'+arc(-90,-90-148*progress*.65)+'" stroke="#FFB4C4"/>';}else paths+='<path d="'+arc(122,122+296*progress)+'" stroke="#B9EDE0"/>';}
    $('dataRing').innerHTML='<g fill="none" stroke-width="16" stroke-linecap="round">'+paths+'</g>'+(kind==='mood'&&progress?'<circle cx="120" cy="28" r="3" fill="white"/>':'');
    $('peekData').innerHTML=$('dataRing').innerHTML;
    document.querySelectorAll('[data-function]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.function===kind)));
    document.querySelectorAll('[data-progress]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.progress)===progress)));
  }
  $('variants').addEventListener('click',e=>{const b=e.target.closest('[data-variant]');if(!b)return;config={...A.preset(b.dataset.variant),scope:config.scope,centerOnly:config.centerOnly};paused=false;edited();});
  ['intensity','softness','duration','breathDepth'].forEach(k=>$(k).addEventListener('input',e=>{config[k]=Number(e.target.value);edited();}));
  document.querySelectorAll('[data-breath]').forEach(b=>b.onclick=()=>{const p={soft:[10,52,68],medium:[4,75,80],fast:[2,95,95]}[b.dataset.breath];config.duration=p[0];config.breathDepth=p[1];config.intensity=p[2];paused=false;edited();});
  $('reverseColors').onclick=()=>{config.colors.reverse();edited();};
  $('directionPicker').onclick=e=>{const b=e.target.closest('[data-direction]');if(b){config.direction=Number(b.dataset.direction);edited();}};
  $('functionPicker').onclick=e=>{const b=e.target.closest('[data-function]');if(b){kind=b.dataset.function;renderPreview();}};
  $('progressPicker').onclick=e=>{const b=e.target.closest('[data-progress]');if(b){progress=Number(b.dataset.progress);renderPreview();}};
  $('previewButton').onclick=()=>{const keys=Object.keys(names);kind=keys[(keys.indexOf(kind)+1)%keys.length];renderPreview();};
  $('scope').onchange=e=>{config.scope=e.target.value;edited();};$('centerOnly').onchange=e=>{config.centerOnly=e.target.checked;edited();};
  $('pause').onclick=()=>{paused=!paused;sync();};
  const palettes={mint:['#73E8B4','#FFA17C','#B199FF'],ocean:['#55DFD6','#67ADFF','#C4B0FF'],pearl:['#92DDD1','#F4FFFA','#C3D5FF']};
  document.querySelectorAll('[data-palette]').forEach(b=>b.onclick=()=>{config.colors=[...palettes[b.dataset.palette]];edited();});
  $('apply').onclick=()=>{try{config=A.write({...config,enabled:true,playing:true});persistDraft();sync();$('saveStatus').textContent='Применено. Откройте прототип — дуга уже обновлена.';}catch(_){$('saveStatus').textContent='Не удалось сохранить. Разрешите хранилище сайта или скачайте настройки.';}};
  $('reset').onclick=()=>{try{config=A.write({...config,enabled:false});persistDraft();sync();$('saveStatus').textContent='В прототипе возвращена исходная дуга без эффекта.';}catch(_){$('saveStatus').textContent='Браузер не сохранил изменение.';}};
  function showSaved(){
    $('savedPresets').replaceChildren();saved.forEach((p,i)=>{const row=document.createElement('div');row.className='saved-item';const b=document.createElement('button');b.textContent=p.name;b.onclick=()=>{config=A.normalize(p.settings);edited();};const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label','Удалить вариант «'+p.name+'»');del.onclick=()=>{const next=saved.filter((_,j)=>i!==j);try{localStorage.setItem(SAVED,JSON.stringify(next));saved=next;showSaved();}catch(_){$('fileStatus').textContent='Не удалось сохранить изменение.';}};row.append(b,del);$('savedPresets').append(row);});
  }
  $('saveForm').onsubmit=e=>{e.preventDefault();const name=$('presetName').value.trim();if(!name)return;if(saved.length>=30){$('fileStatus').textContent='Сохранено 30 вариантов. Удалите ненужный, чтобы добавить новый.';return;}try{const next=[...saved,{name,settings:A.normalize(config)}];localStorage.setItem(SAVED,JSON.stringify(next));saved=next;$('presetName').value='';showSaved();$('fileStatus').textContent='Вариант «'+name+'» сохранён.';}catch(_){$('fileStatus').textContent='Не удалось сохранить вариант. Можно скачать настройки.';}};
  $('export').onclick=()=>{const blob=new Blob([JSON.stringify({type:'happy-day-arc',version:1,settings:config},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='happy-day-arc-'+config.mode+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('fileStatus').textContent='Настройки подготовлены для скачивания.';};
  $('import').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>50000)throw Error('size');const parsed=JSON.parse(await f.text());if(parsed.type!=='happy-day-arc'||parsed.version!==1||!parsed.settings||!Array.isArray(parsed.settings.colors)||parsed.settings.colors.length!==3||!parsed.settings.colors.every(c=>/^#[0-9a-f]{6}$/i.test(c)))throw Error('format');config=A.normalize(parsed.settings);edited();$('fileStatus').textContent='Настройки загружены в предпросмотр.';}catch(_){$('fileStatus').textContent='Нужен JSON настроек из Студии дуг.';}finally{e.target.value='';}};
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',sync);
  const showPeek=()=>{$('mobilePeek').hidden=!(matchMedia('(max-width:780px)').matches&&$('previewCard').getBoundingClientRect().bottom<0);peekRenderer.refresh();};
  new IntersectionObserver(showPeek).observe($('previewCard'));window.addEventListener('resize',showPeek);
  renderPreview();sync();showSaved();
})();
