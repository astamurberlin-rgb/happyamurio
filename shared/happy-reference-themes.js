/* Happy Family reference collection · 02 November 2026.
   Original editable gradients inspired by supplied colour references.
   Built-ins are separate from the user's 20 saved themes and never overwrite them. */
(function(root){'use strict';
 const G=root.HappyGradients,HEX=/^#[0-9a-f]{6}$/i;
 const copy=value=>JSON.parse(JSON.stringify(value));
 const glow=(color,x,y,radius,strength)=>({enabled:true,color,x,y,radius,strength});
 function theme(id,name,mode,note,colors,angle,lights,accent,ui={}){
  const backgroundGradient=G.normalize({type:'linear',angle,stops:colors.map((color,i)=>({color,position:[0,17,50,76,100][i]})),glow:lights[0],extraGlow:lights[1]});
  const state={angle,base:colors.slice(),glows:lights.map(g=>({color:g.color,opacity:g.strength/100,x:g.x,y:g.y,w:g.radius,h:g.radius})),backgroundGradient,
   wallpaper:'none',wallpaperData:'',brightness:100,saturationBoost:100,buttonColor:accent[0],buttonShine:0,buttonAlpha:100,fabAlpha:100,
   buttonGradient:G.normalize({type:'linear',angle:145,stops:accent.map((color,i)=>({color,position:i*100/(accent.length-1)}))}),buttonTextColor:ui.buttonTextColor||'#24132f',
   glassColor:ui.glassColor||'#201329',glassAlpha:mode==='night'?76:62,borderColor:ui.borderColor||accent[0],borderAlpha:mode==='night'?26:38,glassBlur:18,cornerRadius:22,
   themeTextColor:ui.textColor||'#fff8ff',themeMutedColor:ui.mutedColor||'#ead9ee',themeHeadingColor:ui.headingColor||'#fff8ff',themeMode:mode};
  return {id:'happy-ref-'+id+'-v1',name,mode,note,colors:[...new Set([...colors,...lights.map(g=>g.color)])].slice(0,8),state};
 }
 const themes=[
  theme('golden-sunset','Золотой закат','regular','Фиолетовое небо, розовый свет и тёплое золото.',
   ['#35205e','#652568','#a03d78','#df8d7c','#ffc977'],172,
   [glow('#ffdf87',78,93,66,90),glow('#ff984b',4,89,57,53)],['#ffe08a','#ffad68'],{glassColor:'#35213e',mutedColor:'#f2dfe6'}),
  theme('orchid','Орхидея','regular','Мягкий сиреневый свет на сливовом фоне.',
   ['#982bb7','#a037ad','#810d91','#650778','#59096c'],165,
   [glow('#efb0e9',100,7,95,94),glow('#ab40d1',8,6,61,25)],['#f4c1f1','#d88de9'],{glassColor:'#350d42',mutedColor:'#f1d3f0'}),
  theme('amethyst','Аметист','regular','Насыщенный фиолетовый с малиновым отблеском.',
   ['#7520b3','#7c159f','#74028d','#61077c','#50066c'],176,
   [glow('#d887d3',100,4,83,86),glow('#ae008d',100,65,72,24)],['#ec9ff1','#bd63e4'],{glassColor:'#290d3b',mutedColor:'#e8cff2'}),
  theme('lagoon','Лагуна','regular','Мята и изумруд переходят в глубину моря.',
   ['#40c7b8','#2bb79b','#148e80','#056175','#04355b'],177,
   [glow('#24bd77',100,18,96,55),glow('#0872ab',0,84,66,25)],['#82f4dc','#4bdab7'],{glassColor:'#063345',textColor:'#f1fffc',mutedColor:'#d1eee8',headingColor:'#073b43',buttonTextColor:'#06383b'}),
  theme('night-bay','Ночная бухта','night','Бирюзовый отблеск и янтарный свет на тёмном берегу.',
   ['#561547','#38233c','#4e2732','#271e23','#101819'],90,
   [glow('#1b98a3',17,13,55,90),glow('#f39c59',42,85,68,94)],['#91d8d5','#e2a779'],{glassColor:'#101e25',textColor:'#eef8f7',mutedColor:'#c3dedc',buttonTextColor:'#142b30'}),
  theme('midnight-iris','Полуночный ирис','night','Сливовая тень, ирисовое свечение и коралловый край.',
   ['#22092b','#3c0757','#740f86','#a91e5b','#dc6d83'],113,
   [glow('#b962ed',54,48,55,90),glow('#f2908d',85,98,64,82)],['#dbadf4','#efadba'],{glassColor:'#200e2d',mutedColor:'#e4cdeb'}),
  theme('neon-night','Неоновая ночь','night','Электрический синий, фиолетовый и розовое свечение.',
   ['#4924f0','#5918d9','#730b9f','#610675','#880c8a'],132,
   [glow('#edabe9',99,0,61,94),glow('#c777ec',0,100,63,83)],['#c6b5ff','#eca2eb'],{glassColor:'#1b1038',mutedColor:'#dfd3f6'})
 ];
 // Only validated optional tokens affect previews; old user themes keep their appearance.
 function uiCSS(st){
  if(!HEX.test(st.themeTextColor||''))return '';
  const text=st.themeTextColor,muted=HEX.test(st.themeMutedColor||'')?st.themeMutedColor:text;
  const heading=HEX.test(st.themeHeadingColor||'')?st.themeHeadingColor:text;
  const glass=HEX.test(st.glassColor||'')?st.glassColor:'#201329';
  const accent=HEX.test(st.buttonColor||'')?st.buttonColor:text;
  const rgb=[1,3,5].map(i=>parseInt(glass.slice(i,i+2),16)).join(',');
  return ':root{--ink:'+text+';--muted:'+muted+';--dim:'+muted+';--dockBg:rgba('+rgb+',.94);--dockInk:'+text+';--dockAccent:'+accent+';color-scheme:'+(st.themeMode==='night'?'dark':'normal')+';}'+
   'body,.card,.rowcard,.pin,.energy,.datePill,.date-pill,.sheet,.glass,.section-row,.voice,.latest{color:'+text+'!important;}'+
   '.top h1{color:'+heading+'!important;}'+
   '.metric small,.energy-legend,.balance span,.section-row small,.latest small,.rowcard small,.note{color:'+muted+'!important;}'+
   '.note{background-color:rgba('+rgb+',.72);padding:8px 10px;border-radius:10px;}'+
   '.dock .tab{color:'+muted+'!important;}.dock .tab.on{color:'+accent+'!important;}'+
   '.action.primary{background:'+G.css(st.buttonGradient)+'!important;color:'+st.buttonTextColor+'!important;}';
 }
 function mount(host,onSelect){
  const buttons=new Map();host.replaceChildren();
  const intro=document.createElement('p');intro.className='reference-intro';intro.textContent='Одна схема для Day, Meal и Sport. Нажми, чтобы увидеть её сразу во всех трёх превью. Любую схему можно изменить и сохранить как свой вариант.';host.append(intro);
  for(const [mode,label] of [['regular','Цветные темы'],['night','Ночные темы']]){
   const heading=document.createElement('h3');heading.className='reference-heading';heading.textContent=label;host.append(heading);
   const grid=document.createElement('div');grid.className='reference-grid reference-grid-'+mode;
   for(const item of themes.filter(t=>t.mode===mode)){
    const button=document.createElement('button');button.type='button';button.className='reference-card';button.dataset.themeId=item.id;
    button.setAttribute('aria-label','Применить тему «'+item.name+'» ко всем трём превью');button.setAttribute('aria-pressed','false');
    const swatch=document.createElement('span');swatch.className='reference-swatch';swatch.style.background=G.css(item.state.backgroundGradient);
    const badge=document.createElement('span');badge.className='reference-badge';badge.textContent=mode==='night'?'Ночная':'Day · Meal · Sport';swatch.append(badge);
    const accents=document.createElement('span');accents.className='reference-accents';
    for(const color of [item.state.buttonColor,item.state.themeTextColor,item.state.glassColor]){const dot=document.createElement('i');dot.style.background=color;accents.append(dot);}swatch.append(accents);
    const name=document.createElement('strong');name.textContent=item.name;const note=document.createElement('small');note.textContent=item.note;
    button.append(swatch,name,note);button.onclick=()=>onSelect(item.id);grid.append(button);buttons.set(item.id,button);
   }host.append(grid);
  }
  const status=document.createElement('p');status.className='reference-status';status.setAttribute('aria-live','polite');host.append(status);
  return {select(id){for(const [key,b] of buttons)b.setAttribute('aria-pressed',String(key===id));const item=themes.find(t=>t.id===id);status.textContent=item?'Выбрано: '+item.name+' · Day, Meal и Sport':'';}};
 }
 root.HappyReferenceThemes={version:1,themes,uiCSS,mount,copy};
})(typeof window!=='undefined'?window:globalThis);
