/* Color Studio workspace: persistent palettes and touch-sortable independent panels. */
(function(root){'use strict';
 const HEX=/^#[0-9a-f]{6}$/i,copy=v=>JSON.parse(JSON.stringify(v));
 // Exact colours of the sun on the current Day home (day/index.html, wake icon).
 const BUILT_INS=[
  {id:'day-sun',name:'Солнце Happy Day',colors:['#FFE9A3','#FFC53D','#FF9500'],note:'Оранжевый главной · #FF9500'},
  {id:'happy-family',name:'Happy · три приложения',colors:['#00A8F5','#7CE3C9','#5A50D1','#FF9500'],note:'Основные цвета Happy'},
  {id:'blue-hour',name:'Синий час',colors:['#142E4F','#1E3A60','#315479','#86B7DF','#B7D7F2'],note:'Холодная палитра'},
  {id:'sea-sunset',name:'Морской закат',colors:['#6542C5','#9570DD','#FFD396','#6486CC','#2759B2'],note:'Тёплый свет и море'}
 ];
 function validate(value){
  if(value==null)return {palettes:[],layout:{order:[],open:{}}};
  if(typeof value!=='object'||Array.isArray(value))throw Error('Некорректные настройки панелей');
  const items=value.palettes||[];
  if(!Array.isArray(items)||items.length>120)throw Error('Некорректная библиотека палитр');
  const seen=new Set();const palettes=items.map(p=>{
   if(!p||typeof p.id!=='string'||!/^palette-[\w-]+$/.test(p.id)||seen.has(p.id)||typeof p.name!=='string'||!p.name.trim()||!Array.isArray(p.colors)||p.colors.length<2||p.colors.length>8||!p.colors.every(c=>typeof c==='string'&&HEX.test(c)))throw Error('Некорректная палитра');
   seen.add(p.id);return {id:p.id,name:p.name.trim().slice(0,40),colors:p.colors.map(c=>c.toUpperCase())};
  });
  const layout=value.layout||{},order=Array.isArray(layout.order)?[...new Set(layout.order.filter(k=>typeof k==='string'))]:[],open={};
  for(const [k,v] of Object.entries(layout.open||{}))if(/^[a-z-]+$/.test(k)&&typeof v==='boolean')open[k]=v;
  return {palettes,layout:{order,open}};
 }
 function mount(options){
  const {container,notify,persist}=options;let data;
  try{data=validate(options.saved)}catch(e){data=validate(null);notify('Не удалось прочитать палитры. Исходная копия остаётся в резерве браузера.');}
  const panels=new Map();let selected=null,draft=null,drag=null,suppressClick=false;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const button=(text,fn,cls='smallbtn')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
  const live=el('div','studio-live');live.setAttribute('aria-live','polite');container.before(live);
  const toolbar=el('div','studio-toolbar');toolbar.append(el('p','','Тап — свернуть. Потяни за ⠿, чтобы переместить раздел.'),button('Свернуть всё',()=>{for(const p of panels.values())p.open=false;}));container.before(toolbar);
  function announce(text){live.textContent=text;}
  function order(){return [...container.children].filter(n=>n.dataset.panel).map(n=>n.dataset.panel);}
  function remember(){data.layout.order=order();for(const [id,p] of panels)data.layout.open[id]=p.open;return persist();}
  function move(panel,direction){const all=[...panels.values()].sort((a,b)=>order().indexOf(a.dataset.panel)-order().indexOf(b.dataset.panel)),i=all.indexOf(panel);if(direction==='top')container.prepend(panel);else if(direction<0&&i>0)container.insertBefore(panel,all[i-1]);else if(direction>0&&i<all.length-1)container.insertBefore(panel,all[i+1].nextSibling);remember();announce('Раздел перемещён');}
  function wrap(panel,id,title,initialOpen=false){
   const d=el('details','studio-group studio-panel');d.dataset.panel=id;d.open=data.layout.open[id]??initialOpen;
   const summary=el('summary');const heading=typeof title==='string'?el('h2','',title):title;
   const marker=el('span','panel-toggle');marker.setAttribute('aria-hidden','true');
   const grip=button('⠿',e=>{e.preventDefault();e.stopPropagation();if(suppressClick){suppressClick=false;return}menu.hidden=!menu.hidden;if(!menu.hidden)d.open=true;},'panel-grip');grip.setAttribute('aria-label','Переместить раздел: '+heading.textContent);grip.title='Потяни вверх или вниз. С клавиатуры — стрелки.';
   const menu=el('div','panel-move-menu');menu.hidden=true;menu.append(button('Под превью',()=>{move(d,'top');menu.hidden=true;}),button('Выше',()=>move(d,-1)),button('Ниже',()=>move(d,1)));
   summary.append(heading,marker,grip);d.append(summary,menu,panel);panels.set(id,d);container.append(d);
   d.addEventListener('toggle',()=>{data.layout.open[id]=d.open;persist();});
   grip.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();if(e.key==='End'){container.append(d);remember()}else move(d,e.key==='Home'?'top':e.key==='ArrowUp'?-1:1);grip.focus();});
   grip.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={panel:d,handle:grip,pointer:e.pointerId,startY:e.clientY,y:e.clientY,started:false,open:d.open,order:order(),pending:order(),frame:0};grip.setPointerCapture(e.pointerId);});
   grip.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;drag.y=e.clientY;if(!drag.started&&Math.abs(e.clientY-drag.startY)>7){drag.started=true;d.open=false;menu.hidden=true;d.classList.add('is-dragging');drag.frame=requestAnimationFrame(tick);}if(drag.started){e.preventDefault();reorderAt(e.clientY);}});
   function end(e,cancel=false){if(!drag||drag.pointer!==e.pointerId)return;const state=drag;drag=null;cancelAnimationFrame(state.frame);d.classList.remove('is-dragging');if(state.started){(cancel?state.order:state.pending).forEach(k=>{const panel=panels.get(k);container.append(panel);panel.style.order='';});d.open=state.open;suppressClick=true;setTimeout(()=>{suppressClick=false},200);remember();announce(cancel?'Перемещение отменено':'Порядок разделов сохранён');}}
   grip.addEventListener('pointerup',e=>end(e));grip.addEventListener('pointercancel',e=>end(e,true));grip.addEventListener('lostpointercapture',e=>end(e,true));
   return d;
  }
  function reorderAt(y){if(!drag)return;const id=drag.panel.dataset.panel,others=drag.pending.filter(k=>k!==id);const index=others.findIndex(k=>{const r=panels.get(k).getBoundingClientRect();return y<r.top+Math.min(r.height,80)/2;});others.splice(index<0?others.length:index,0,id);drag.pending=others;others.forEach((k,i)=>panels.get(k).style.order=String(i));}
  function tick(){if(!drag?.started)return;const top=document.querySelector('.preview-dock').getBoundingClientRect().bottom+35,bottom=innerHeight-65;const speed=drag.y<top?-Math.min(18,(top-drag.y)/5):drag.y>bottom?Math.min(18,(drag.y-bottom)/5):0;if(speed){window.scrollBy({top:speed,behavior:'instant'});reorderAt(drag.y)}drag.frame=requestAnimationFrame(tick);}
  const source=[...container.querySelectorAll(':scope > details > .group-body > .panel')];
  const ids=['background','wallpapers','presets','glass','opacity','button','fonts'];
  source.forEach((panel,i)=>{const title=panel.querySelector('h2');wrap(panel,ids[i],title,ids[i]==='background');const head=panel.querySelector('.panel-head');if(head&&!head.children.length)head.remove();});
  container.querySelectorAll(':scope > details[data-group]').forEach(n=>n.remove());
  const themes=document.getElementById('savedThemes');wrap(themes,'themes','Мои варианты оформления');themes.querySelector('.shared-head strong')?.remove();
  const library=el('section','panel palette-library');library.append(el('p','palette-library-intro','Наборы цветов для фона и кнопок. Свои палитры сохраняются на этом устройстве и в JSON-копии настроек.'));
  const actions=el('div','palette-actions');actions.append(button('＋ Создать палитру',()=>edit(null),'primary'),button('Из текущего фона',()=>edit(null,options.readColors('background'))),button('Из текущей кнопки',()=>edit(null,options.readColors('button'))));library.append(actions,el('h3','palette-subtitle','Наборы Happy'));
  const builtinGrid=el('div','palette-library-grid');library.append(builtinGrid,el('h3','palette-subtitle','Мои палитры'));const userGrid=el('div','palette-library-grid');library.append(userGrid);
  const selection=el('div','palette-selection');selection.hidden=true;library.append(selection);
  const editor=el('div','palette-editor');editor.hidden=true;library.append(editor);
  const status=el('p','palette-status');status.setAttribute('aria-live','polite');library.append(status);
  wrap(library,'palettes','Палитры цветов',true);
  function applyOrder(){for(const id of data.layout.order)if(panels.has(id))container.append(panels.get(id));for(const id of ids.concat('themes','palettes'))if(!data.layout.order.includes(id))container.append(panels.get(id));}
  function restore(value){const next=validate(value);data=next;applyOrder();for(const [id,p] of panels)p.open=data.layout.open[id]??['background','palettes'].includes(id);selected=null;draft=null;selection.hidden=true;editor.hidden=true;render();}
  function choose(p){selected=p;render();selection.replaceChildren(el('strong','',p.name));selection.hidden=false;const swatches=el('div','palette-swatches');for(const color of p.colors){const b=button('',()=>{navigator.clipboard?.writeText(color).then(()=>{status.textContent=color+' скопирован'},()=>{status.textContent=color});status.textContent=color},'');b.style.background=color;b.title=color;b.setAttribute('aria-label','Скопировать '+color);swatches.append(b)}selection.append(swatches);
   const row=el('div','palette-actions');row.append(button('Применить к фону',()=>{options.applyColors('background',p.colors);status.textContent='Палитра применена к фону выбранного превью.'},'primary'),button('Применить к кнопке',()=>{options.applyColors('button',p.colors);status.textContent='Палитра применена к кнопке выбранного превью.'}));selection.append(row);}
  function render(){for(const [grid,items,custom] of [[builtinGrid,BUILT_INS,false],[userGrid,data.palettes,true]]){grid.replaceChildren();for(const p of items){const card=el('div','palette-card'+(p.id===selected?.id?' selected':''));const pick=button('',()=>choose(p),'');pick.setAttribute('aria-label','Выбрать палитру '+p.name);const square=el('span','palette-square');for(const color of p.colors){const stripe=el('i');stripe.style.background=color;square.append(stripe)}pick.append(square,el('span','palette-card-name',p.name),el('small','',p.note||'Цветов: '+p.colors.length));card.append(pick);const row=el('div','palette-card-actions');row.append(button(custom?'Изменить':'Создать копию',()=>edit(custom?p:null,p.colors),''));if(custom)row.append(button('Удалить',()=>{const before=copy(data.palettes);data.palettes=data.palettes.filter(x=>x.id!==p.id);if(!persist()){data.palettes=before;return}if(selected?.id===p.id){selected=null;selection.hidden=true}render();status.replaceChildren(document.createTextNode('Палитра удалена. '),button('Отменить',()=>{const current=data.palettes;data.palettes=before;if(!persist()){data.palettes=current;return}render();status.textContent='Палитра восстановлена'}));},''));card.append(row);grid.append(card)}}}
  function edit(p,colors){draft=p?copy(p):{id:'palette-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),name:'',colors:copy(colors||['#FF9500','#00A8F5','#5A50D1'])};editor.hidden=false;drawEditor();editor.scrollIntoView({block:'nearest',behavior:'smooth'});}
  function drawEditor(){editor.replaceChildren(el('h3','',data.palettes.some(p=>p.id===draft.id)?'Редактировать палитру':'Новая палитра'));const label=el('label','','Название');const name=el('input');name.type='text';name.maxLength=40;name.value=draft.name;name.placeholder='Например, апельсиновый вечер';name.setAttribute('aria-label','Название палитры');name.oninput=()=>{draft.name=name.value;};label.append(name);editor.append(label);
   const colors=el('div','palette-colors');draft.colors.forEach((color,i)=>{const row=el('div','palette-color');const picker=el('input');picker.type='color';picker.value=color;picker.setAttribute('aria-label','Цвет '+(i+1));const hex=el('input');hex.type='text';hex.value=color;hex.maxLength=7;hex.spellcheck=false;hex.setAttribute('aria-label','HEX цвета '+(i+1));picker.oninput=()=>{draft.colors[i]=picker.value.toUpperCase();hex.value=draft.colors[i];hex.setCustomValidity('')};hex.oninput=()=>{const good=HEX.test(hex.value);hex.setCustomValidity(good?'':'Введите цвет вида #FF9500');if(good){draft.colors[i]=hex.value.toUpperCase();picker.value=hex.value;}};const del=button('×',()=>{draft.colors.splice(i,1);drawEditor()},'');del.disabled=draft.colors.length<=2;del.setAttribute('aria-label','Удалить цвет '+(i+1));row.append(picker,hex,del);colors.append(row)});editor.append(colors);
   const row=el('div','palette-actions');const add=button('＋ Цвет',()=>{draft.colors.push('#FFFFFF');drawEditor()});add.disabled=draft.colors.length>=8;row.append(add,button('Сохранить палитру',()=>{if(!draft.name.trim()){name.focus();status.textContent='Введи название палитры.';return}for(const input of editor.querySelectorAll('input'))if(!input.reportValidity())return;const before=copy(data.palettes);const i=data.palettes.findIndex(p=>p.id===draft.id);if(i<0&&data.palettes.length>=120){status.textContent='Достигнут предел 120 палитр.';return}const saved={...copy(draft),name:draft.name.trim()};if(i<0)data.palettes.push(saved);else data.palettes[i]=saved;if(!persist()){data.palettes=before;return}editor.hidden=true;draft=null;choose(saved);status.textContent='Палитра сохранена.'},'primary'),button('Отмена',()=>{draft=null;editor.hidden=true}));editor.append(row);
  }
  applyOrder();render();
  return {snapshot:()=>copy({palettes:data.palettes,layout:{order:order(),open:Object.fromEntries([...panels].map(([id,p])=>[id,p.open]))}}),validate,restore,setVisible(visible){toolbar.hidden=!visible;}};
 }
 root.HappyColorWorkspace={mount,validate};
})(window);
