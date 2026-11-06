/* Happy Icon Studio v1 — public image library; no access to Happy journal storage. */
'use strict';
(function(){
const REPO='astamurberlin-rgb/happyamurio';
const KEY='happy_icon_studio_v1';
const CATEGORIES=[
  ['strength','Силовые и зал'],['cardio','Бег и кардио'],['water','Водные виды'],
  ['games','Игровые и единоборства'],['winter','Зимние и ролики'],
  ['wellness','Разминка и восстановление'],['outdoor','Природа и движение'],
  ['adaptive','Адаптивный спорт'],['other','Другое']
];
const CATEGORY_MAP={strength:[1,2,3,4,5,6,7,8,9,41],cardio:[10,11,12,13,17,36,45],water:[14,31,32,43],
  games:[19,20,21,22,23,24,25,26,38],winter:[28,29,30,40,44],wellness:[15,16,18],
  outdoor:[27,33,34,39,42],adaptive:[35],other:[37]};
const LABELS={done:'Готово · PNG',review:'Кандидат',todo:'Не сделано'};
const SYMBOLS={strength:'▰',cardio:'↗',water:'≈',games:'◈',winter:'✳',wellness:'✦',outdoor:'⌁',adaptive:'◉',other:'+'};
const $=id=>document.getElementById(id);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categoryName=id=>{
  const entry=state.categories.find(c=>c.id===id);
  return state.categoryNames[id]||entry?.name||CATEGORIES.find(x=>x[0]===id)?.[1]||'Другое';
};
function allCategories(){return CATEGORIES.map(x=>({id:x[0],name:categoryName(x[0])})).concat(state.categories.map(x=>({id:x.id,name:categoryName(x.id)})));}
function allCharacters(){
  return (manifest.characters||[]).concat(state.characters).map(c=>Object.assign({},c,state.characterProfiles[c.id]||{}));
}
function characterById(id){return allCharacters().find(c=>c.id===id);}
function iconCharacterId(i){
  if(Object.prototype.hasOwnProperty.call(state.characterAssignments,i.id))return state.characterAssignments[i.id];
  if(i.legacyId&&Object.prototype.hasOwnProperty.call(state.characterAssignments,i.legacyId))return state.characterAssignments[i.legacyId];
  return i.characterId||'';
}
function characterName(i){return characterById(iconCharacterId(i))?.name||'';}
function categoryOf(i){return state.categoryAssignments[i.id]||state.categoryAssignments[i.legacyId]||i.category||'other';}
function iconMeta(i){return Object.assign({sport:i.sport||'',exercise:i.exercise||''},state.iconMeta[i.legacyId]||{},state.iconMeta[i.id]||{});}
function refreshCategoryOptions(){
  for(const id of ['category','new-category']){
    const sel=$(id),old=sel.value;
    sel.innerHTML=(id==='category'?'<option value="all">Все категории</option>':'')+allCategories().map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
    if([...sel.options].some(o=>o.value===old))sel.value=old;
    else if(id==='new-category')sel.value='strength';
  }
}
function refreshCharacterOptions(){
  const select=$('new-character'),old=select.value;
  select.innerHTML='<option value="">Без персонажа</option>'+allCharacters().map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
  if([...select.options].some(o=>o.value===old))select.value=old;
}

let manifest={reviewIds:[],planned:[]},items=[],filtered=[],selected='sport:07_pullup_bar_rings';
let app='sport',filterStatus='all',mode='light',iconSize=68,mediaDb=null,toastTimer,editingId=null,replaceObjectUrl=null,editorExpanded=false;
let state={status:{},notes:{},custom:[],overrides:{},categories:[],categoryNames:{},characters:[],characterProfiles:{},characterAssignments:{},categoryAssignments:{},iconMeta:{},placements:{}};
let selectedCharacter='all',editingCategory='',editingCharacter='';
let scopeKind='category',scopeKey='sport:01_barbell',exercises=[],editingScope='',draftScopeKind='category',draftScopeKey='',draftAsset=null,editorLibraryMode='category',editorGroup='all';
const media={};
/* Normalized preview pixels, never the original PNG. Keeps illustrations
   centered even when a source image contains asymmetric transparent margins. */
const normalizedIcons=Object.create(null);
const FRAME=256;
function normalizedPixels(img){
  try{
    const w=img.naturalWidth,h=img.naturalHeight;
    if(!w||!h)return null;
    const source=document.createElement('canvas');
    source.width=FRAME;source.height=FRAME;
    const sx=FRAME/Math.max(w,h),dw=w*sx,dh=h*sx;
    const ctx=source.getContext('2d',{willReadFrequently:true});
    if(!ctx)return null;
    ctx.clearRect(0,0,FRAME,FRAME);
    ctx.drawImage(img,(FRAME-dw)/2,(FRAME-dh)/2,dw,dh);
    const px=ctx.getImageData(0,0,FRAME,FRAME).data;
    let left=FRAME,top=FRAME,right=-1,bottom=-1;
    for(let y=0;y<FRAME;y++){
      for(let x=0;x<FRAME;x++){
        if(px[(y*FRAME+x)*4+3]<=12)continue;
        if(x<left)left=x;if(x>right)right=x;
        if(y<top)top=y;if(y>bottom)bottom=y;
      }
    }
    if(right<left||bottom<top)return null;
    const boxW=right-left+1,boxH=bottom-top+1;
    const scale=Math.min(FRAME*.82/boxW,FRAME*.82/boxH);
    const final=document.createElement('canvas');
    final.width=FRAME;final.height=FRAME;
    const dc=final.getContext('2d');
    if(!dc)return null;
    dc.imageSmoothingEnabled=true;dc.imageSmoothingQuality='high';
    const outW=boxW*scale,outH=boxH*scale;
    dc.drawImage(source,left,top,boxW,boxH,(FRAME-outW)/2,(FRAME-outH)/2,outW,outH);
    return final.toDataURL('image/png');
  }catch(error){return null;} /* External images may deny canvas pixel access. */
}
function readyIcon(img){if(img&&img.dataset)img.dataset.iconReady='1';}
function onIconLoad(img){
  const id=img.dataset.iconKey;
  if(!id)return;
  if(img.dataset.iconStage==='normalized'||img.dataset.iconStage==='fallback'){readyIcon(img);return;}
  if(img.dataset.iconStage!=='original')return;
  const data=normalizedIcons[id]||normalizedPixels(img);
  if(data){
    normalizedIcons[id]=data;
    img.dataset.iconStage='normalized';
    img.src=data;
  }else{
    img.dataset.iconStage='fallback';
    readyIcon(img);
  }
}
function initIconEvents(){
  document.addEventListener('load',ev=>{
    const img=ev.target;
    if(img instanceof HTMLImageElement&&img.dataset.iconKey)onIconLoad(img);
  },true);
  document.addEventListener('error',ev=>{
    const img=ev.target;
    if(!(img instanceof HTMLImageElement)||!img.dataset.iconKey)return;
    if(img.dataset.iconStage==='normalized'){
      const original=findItem(img.dataset.iconKey);
      img.dataset.iconStage='fallback';
      if(original&&imageOf(original)){img.src=imageOf(original);return;}
    }
    readyIcon(img);
  },true);
}

function notify(s){const el=$('toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800);}
function readState(){
  const defaults={status:{},notes:{},custom:[],overrides:{},categories:[],categoryNames:{},characters:[],characterProfiles:{},characterAssignments:{},categoryAssignments:{},iconMeta:{},placements:{}};
  try{
    const d=JSON.parse(localStorage.getItem(KEY)||'{}');
    const obj=Object.assign({},defaults,d);
    for(const key of ['status','notes','overrides','categoryNames','characterProfiles','characterAssignments','categoryAssignments','iconMeta','placements'])
      if(!obj[key]||typeof obj[key]!=='object'||Array.isArray(obj[key]))obj[key]={};
    for(const key of ['custom','categories','characters'])if(!Array.isArray(obj[key]))obj[key]=[];
    return obj;
  }catch(error){return defaults;}
}
function saveState(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){notify('Не удалось сохранить в браузере. Экспортируй JSON.');}}
function categoryFor(n){return Object.keys(CATEGORY_MAP).find(k=>CATEGORY_MAP[k].includes(Number(n)))||'other';}
function safeUrl(s){if(!s)return '';try{const u=new URL(s,location.href);if(u.protocol==='https:'||u.origin===location.origin&&u.protocol==='http:')return u.href;}catch(e){}return '';}
function findItem(id){return allItems().find(i=>i.id===id);}
function statusOf(i){const s=state.status[i.id]||state.status[i.legacyId];return ['done','review','todo'].includes(s)?s:i.status;}
function noteOf(i){return Object.prototype.hasOwnProperty.call(state.notes,i.id)?state.notes[i.id]:(Object.prototype.hasOwnProperty.call(state.notes,i.legacyId)?state.notes[i.legacyId]:(i.note||''));}
function rawImageOf(i){return media[i.id]||(i.src?safeUrl(i.src):'');}
function imageOf(i){
  if(!i)return '';
  const overrideId=state.overrides?.[i.id]?i.id:i.legacyId||i.id;
  const override=state.overrides&&state.overrides[overrideId];
  if(override){
    if(override.kind==='upload'&&media['replace:'+overrideId])return media['replace:'+overrideId];
    if(override.kind==='url'&&safeUrl(override.url))return safeUrl(override.url);
    if(override.kind==='catalog'){
      const source=allItems().find(x=>x.id===override.sourceId);
      if(source&&source.id!==i.id&&rawImageOf(source))return rawImageOf(source);
    }
  }
  return rawImageOf(i);
}
function currentLabel(i){const name=characterName(i);return name?name+' · '+i.label:i.label;}
function imageMarkup(i,cls){
  const src=normalizedIcons[i.id]||imageOf(i);
  const stage=normalizedIcons[i.id]?'normalized':'original';
  return src?'<img class="'+(cls||'')+'" data-icon-key="'+esc(i.id)+'" data-icon-stage="'+stage+'" data-icon-ready="0" src="'+esc(src)+'" alt="'+esc(i.label)+'" loading="lazy" decoding="async">':'<span class="placeholder-sign" aria-hidden="true">'+esc(SYMBOLS[i.category]||'+')+'</span>';
}
function openDb(){return new Promise(resolve=>{if(!window.indexedDB){resolve(null);return;}try{const q=indexedDB.open('happy-icon-studio-images-v1',1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('images'))q.result.createObjectStore('images');};q.onsuccess=()=>resolve(q.result);q.onerror=()=>resolve(null);}catch(e){resolve(null);}});}
function mediaGet(id){return new Promise(resolve=>{if(!mediaDb){resolve(null);return;}try{const r=mediaDb.transaction('images','readonly').objectStore('images').get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>resolve(null);}catch(e){resolve(null);}});}
function mediaPut(id,value){return new Promise(resolve=>{if(!mediaDb){resolve(false);return;}try{const tx=mediaDb.transaction('images','readwrite');tx.objectStore('images').put(value,id);tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);}catch(e){resolve(false);}});}
function mediaClear(){return new Promise(resolve=>{if(!mediaDb){resolve();return;}try{const tx=mediaDb.transaction('images','readwrite');tx.objectStore('images').clear();tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();}catch(e){resolve();}});}
function mediaDelete(id){return new Promise(resolve=>{if(!mediaDb){resolve();return;}try{const tx=mediaDb.transaction('images','readwrite');tx.objectStore('images').delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();}catch(e){resolve();}});}
function fileAsDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader;r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Файл не прочитан'));r.readAsDataURL(file);});}
async function loadMedia(){
  const ids=state.custom.map(x=>x.id)
    .concat(Object.keys(state.overrides||{}).filter(id=>state.overrides[id]?.kind==='upload').map(id=>'replace:'+id))
    .concat(Object.entries(state.placements||{}).filter(([key,v])=>v?.kind==='upload').map(([key])=>'placement:'+key))
    .concat(Object.values(state.iconVariants||{}).flat().filter(v=>v?.asset?.kind==='upload').map(v=>v.asset.mediaKey));
  for(const id of ids){const saved=await mediaGet(id);if(typeof saved==='string'&&/^data:image\/(png|webp|jpeg);base64,/.test(saved))media[id]=saved;}
}
function renderTaxonomy(){
  const icons=libraryItems();
  $('taxonomy-categories').innerHTML=
    '<button type="button" class="taxonomy-item '+($('category').value==='all'?'on':'')+'" data-tax-category="all"><span>Все</span><small>'+icons.length+'</small></button>'+
    allCategories().map(c=>{
      const count=icons.filter(item=>categoryOf(item)===c.id).length;
      return '<div class="taxonomy-entry"><button type="button" class="taxonomy-item '+($('category').value===c.id?'on':'')+'" data-tax-category="'+esc(c.id)+'"><span>'+esc(c.name)+'</span><small>'+count+'</small></button><button type="button" class="taxonomy-edit" data-edit-category="'+esc(c.id)+'" aria-label="Переименовать '+esc(c.name)+'" title="Переименовать категорию">✎</button></div>';
    }).join('');
  $('taxonomy-characters').innerHTML=
    '<button type="button" class="taxonomy-item '+(selectedCharacter==='all'?'on':'')+'" data-tax-character="all"><span>Все</span><small>'+icons.length+'</small></button>'+
    allCharacters().map(c=>{
      const count=icons.filter(item=>iconCharacterId(item)===c.id).length;
      return '<div class="taxonomy-entry"><button type="button" class="taxonomy-item '+(selectedCharacter===c.id?'on':'')+'" data-tax-character="'+esc(c.id)+'"><span>'+esc(c.name)+'</span><small>'+count+'</small></button><button type="button" class="taxonomy-edit" data-edit-character="'+esc(c.id)+'" aria-label="Профиль '+esc(c.name)+'" title="Редактировать персонажа">✎</button></div>';
    }).join('');
}
function splitTags(value){return String(value||'').split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean).slice(0,50);}
function openCategory(id=''){
  editingCategory=id;
  $('category-form').reset();
  $('category-dialog-title').textContent=id?'Переименовать категорию':'Новая категория';
  if(id)$('category-name').value=categoryName(id);
  $('category-dialog').showModal();
}
function saveCategory(e){
  e.preventDefault();const name=$('category-name').value.trim();
  if(!name)return;
  if(editingCategory)state.categoryNames[editingCategory]=name.slice(0,65);
  else state.categories.push({id:'cat:user:'+Date.now().toString(36),name:name.slice(0,65)});
  saveState();refreshCategoryOptions();$('category-dialog').close();render();
  notify(editingCategory?'Категория переименована во всех связанных иконках':'Категория добавлена');
}
function openCharacter(id=''){
  editingCharacter=id;$('character-form').reset();
  const c=characterById(id);
  $('character-dialog-title').textContent=c?'Профиль '+c.name:'Новый персонаж';
  $('character-dialog-id').textContent=id;
  if(c){
    $('character-name').value=c.name;
    $('character-profile').value=c.profile||'';
    $('character-sports').value=(c.sports||[]).join('\n');
    $('character-exercises').value=(c.exercises||[]).join('\n');
  }
  $('character-dialog').showModal();
}
function saveCharacter(e){
  e.preventDefault();if(editingCharacter&&!canEdit('character:'+editingCharacter))return;const name=$('character-name').value.trim();if(!name)return;
  const value={name:name.slice(0,70),profile:$('character-profile').value.trim().slice(0,800),sports:splitTags($('character-sports').value),exercises:splitTags($('character-exercises').value)};
  if(editingCharacter){
    const index=state.characters.findIndex(c=>c.id===editingCharacter);
    if(index>=0)state.characters[index]=Object.assign({},state.characters[index],value);
    else state.characterProfiles[editingCharacter]=value;
  }else{
    const id='char:user:'+Date.now().toString(36);
    state.characters.push(Object.assign({id},value));
    selectedCharacter='all';
  }
  saveState();refreshCharacterOptions();$('character-dialog').close();render();
  notify(editingCharacter?'Имя и профиль обновлены во всех связанных позициях':'Новый персонаж добавлен');
}

function scopeOptionMarkup(kind){
  const groups=new Map();
  for(const c of scopeChoices(kind)){
    const key=c.sub||'Другое';
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(c);
  }
  return Array.from(groups.entries()).map(([name,opts])=>
    '<optgroup label="'+esc(name)+'">'+opts.map(o=>'<option value="'+esc(o.id)+'">'+esc(o.label)+'</option>').join('')+'</optgroup>'
  ).join('');
}
function scopeIdentifier(kind,key){return kind+':'+key;}
function placedItem(kind,key){
  const placement=state.placements[scopeIdentifier(kind,key)];
  if(placement?.kind==='catalog')return findItem(placement.id)||null;
  if(placement?.kind==='url'&&safeUrl(placement.url))
    return {id:'placement:'+scopeIdentifier(kind,key),label:'Свой вариант',category:'other',src:safeUrl(placement.url)};
  if(placement?.kind==='upload'&&media['placement:'+scopeIdentifier(kind,key)])
    return {id:'placement:'+scopeIdentifier(kind,key),label:'Свой вариант',category:'other',src:''};
  return defaultScopeItem(kind,key);
}
function scopeLabel(kind,key){return scopeChoices(kind).find(x=>x.id===key)?.label||'Не выбрано';}
function editorScopeId(){return scopeIdentifier(draftScopeKind,draftScopeKey);}
function renderEditorGroups(){
  const groups=editorLibraryMode==='category'?allCategories().map(x=>({id:x.id,name:x.name})):allCharacters().map(x=>({id:x.id,name:x.name}));
  $('editor-groups').innerHTML=
    '<button type="button" class="editor-group '+(editorGroup==='all'?'active':'')+'" data-editor-group="all">Все</button>'+
    groups.map(c=>'<button type="button" class="editor-group '+(editorGroup===c.id?'active':'')+'" data-editor-group="'+esc(c.id)+'">'+esc(c.name)+'</button>').join('');
  document.querySelectorAll('[data-library-mode]').forEach(b=>{
    b.classList.toggle('active',b.dataset.libraryMode===editorLibraryMode);
    b.setAttribute('aria-pressed',String(b.dataset.libraryMode===editorLibraryMode));
  });
}
function renderEditorCarousel(){
  let sources=libraryItems().filter(i=>Boolean(imageOf(i)));
  if(editorGroup!=='all'){
    sources=sources.filter(i=>editorLibraryMode==='category'?categoryOf(i)===editorGroup:iconCharacterId(i)===editorGroup);
  }
  sources.sort((a,b)=>categoryName(categoryOf(a)).localeCompare(categoryName(categoryOf(b)),'ru')||currentLabel(a).localeCompare(currentLabel(b),'ru'));
  $('editor-empty').hidden=sources.length>0;
  $('editor-carousel').innerHTML=sources.map(i=>
    '<button type="button" class="editor-option '+(draftAsset?.kind==='catalog'&&draftAsset.id===i.id?'selected':'')+'" data-candidate-id="'+esc(i.id)+'" aria-pressed="'+String(draftAsset?.kind==='catalog'&&draftAsset.id===i.id)+'">'+
    '<span class="editor-option-image">'+imageMarkup(i)+'</span><span class="editor-option-label">'+esc(currentLabel(i))+'</span></button>'
  ).join('');
}
async function onAdd(ev){
  ev.preventDefault();const title=$('new-name').value.trim(),cat=$('new-category').value;
  const url=$('new-url').value.trim(),file=$('new-file').files[0],characterId=$('new-character').value,note=$('new-note').value.trim();
  const sport=$('new-sport').value.trim().slice(0,100),exercise=$('new-exercise').value.trim().slice(0,120);
  if(!title)return;
  if(url&&!safeUrl(url)){notify('Нужна корректная HTTPS-ссылка на изображение');return;}
  if(file&&(!['image/png','image/webp','image/jpeg'].includes(file.type)||file.size>5*1024*1024)){notify('PNG, JPEG или WebP размером до 5 МБ');return;}
  const id='custom:'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
  let src=url;
  if(file){
    if(!mediaDb){notify('Этот браузер не поддерживает локальное хранение изображений');return;}
    try{const data=await fileAsDataUrl(file);if(!await mediaPut(id,data)){notify('Не удалось сохранить файл локально');return;}media[id]=data;src='';}
    catch(e){notify('Ошибка чтения изображения');return;}
  }
  state.custom.push({id,label:title,category:cat,characterId,sport,exercise,note,variant:'planned',origin:'custom',src,status:src||file?'review':'todo'});
  saveState();selected=id;$('add-dialog').close();
  $('search').value='';$('category').value='all';$('variant').value='all';filterStatus='all';document.querySelectorAll('[data-status]').forEach(el=>el.classList.toggle('active',el.dataset.status==='all'));
  selectedCharacter='all';render();notify('Добавлено в библиотеку · сохранено локально');
}
async function exportAll(){
 try{
  const appIcons=await globalThis.HappyAppIcons?.exportSnapshot();
  const payload={format:'happy-icon-studio',schemaVersion:1,exportedAt:new Date().toISOString(),repository:REPO,state,media,appIcons};
  const json=JSON.stringify(payload,null,2),blob=new Blob([json],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='happy-icon-studio-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  notify('Выгружен JSON: библиотека, иконки приложений, материалы и заметки');
 }catch(error){notify('Не удалось выгрузить: '+error.message);}
}
async function importAll(e){
  const lockedSnapshot=captureLockedState();
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>100*1024*1024)throw new Error('JSON больше 100 МБ');
    const data=JSON.parse(await file.text());if(data.format!=='happy-icon-studio'||data.schemaVersion!==1||!data.state)throw new Error('Это не экспорт Icon Studio v1');
    await globalThis.HappyAppIcons?.importSnapshot(data.appIcons);
    const d=data.state;
    if(d.status&&typeof d.status==='object')for(const [id,s] of Object.entries(d.status)){if(['done','review','todo'].includes(s))state.status[id]=s;}
    if(d.notes&&typeof d.notes==='object')for(const [id,n] of Object.entries(d.notes)){if(typeof n==='string')state.notes[id]=n.slice(0,3000);}
    if(d.overrides&&typeof d.overrides==='object'&&!Array.isArray(d.overrides)){
      for(const [id,v] of Object.entries(d.overrides)){
        if(!/^(sport:|plan:|custom:)/.test(id)||!v||typeof v!=='object')continue;
        if(v.kind==='catalog'&&typeof v.sourceId==='string'&&v.sourceId!==id)state.overrides[id]={kind:'catalog',sourceId:v.sourceId.slice(0,120)};
        if(v.kind==='url'&&typeof v.url==='string'&&safeUrl(v.url))state.overrides[id]={kind:'url',url:safeUrl(v.url)};
        if(v.kind==='upload')state.overrides[id]={kind:'upload'};
        delete normalizedIcons[id];
      }
    }
    /* v1.3 taxonomy. Preserve stable IDs and import older v1 backups unchanged. */
    if(Array.isArray(d.categories))for(const c of d.categories.slice(0,200)){
      if(!c||typeof c.id!=='string'||!/^cat:user:[a-z0-9-]+$/i.test(c.id)||typeof c.name!=='string')continue;
      const clean={id:c.id.slice(0,110),name:c.name.trim().slice(0,65)};
      const index=state.categories.findIndex(x=>x.id===clean.id);
      if(index<0)state.categories.push(clean);else state.categories[index]=clean;
    }
    if(d.categoryNames&&typeof d.categoryNames==='object'&&!Array.isArray(d.categoryNames))
      for(const [id,name] of Object.entries(d.categoryNames)){
        if((CATEGORIES.some(x=>x[0]===id)||state.categories.some(x=>x.id===id))&&typeof name==='string')state.categoryNames[id]=name.slice(0,65);
      }
    if(Array.isArray(d.characters))for(const c of d.characters.slice(0,100)){
      if(!c||typeof c.id!=='string'||!/^char:user:[a-z0-9-]+$/i.test(c.id)||typeof c.name!=='string')continue;
      const clean={id:c.id.slice(0,110),name:c.name.slice(0,70),profile:String(c.profile||'').slice(0,800),
        sports:Array.isArray(c.sports)?c.sports.filter(x=>typeof x==='string').slice(0,50).map(x=>x.slice(0,120)):[],
        exercises:Array.isArray(c.exercises)?c.exercises.filter(x=>typeof x==='string').slice(0,50).map(x=>x.slice(0,120)):[]};
      const index=state.characters.findIndex(x=>x.id===clean.id);
      if(index<0)state.characters.push(clean);else state.characters[index]=clean;
    }
    if(d.characterProfiles&&typeof d.characterProfiles==='object'&&!Array.isArray(d.characterProfiles))
      for(const [id,c] of Object.entries(d.characterProfiles)){
        if(!characterById(id)||!c||typeof c.name!=='string')continue;
        state.characterProfiles[id]={name:c.name.slice(0,70),profile:String(c.profile||'').slice(0,800),
          sports:Array.isArray(c.sports)?c.sports.filter(x=>typeof x==='string').slice(0,50).map(x=>x.slice(0,120)):[],
          exercises:Array.isArray(c.exercises)?c.exercises.filter(x=>typeof x==='string').slice(0,50).map(x=>x.slice(0,120)):[]};
      }
    if(d.characterAssignments&&typeof d.characterAssignments==='object'&&!Array.isArray(d.characterAssignments))
      for(const [id,cid] of Object.entries(d.characterAssignments))
        if(typeof cid==='string'&&(!cid||characterById(cid))&&/^(sport:|plan:|custom:)/.test(id))state.characterAssignments[id]=cid;
    if(d.categoryAssignments&&typeof d.categoryAssignments==='object'&&!Array.isArray(d.categoryAssignments))
      for(const [id,cat] of Object.entries(d.categoryAssignments))
        if(typeof cat==='string'&&allCategories().some(x=>x.id===cat)&&/^(sport:|plan:|custom:)/.test(id))state.categoryAssignments[id]=cat;
    if(d.iconMeta&&typeof d.iconMeta==='object'&&!Array.isArray(d.iconMeta))
      for(const [id,meta] of Object.entries(d.iconMeta)){
        if(!meta||typeof meta!=='object'||!/^(sport:|plan:|custom:)/.test(id))continue;
        state.iconMeta[id]={sport:String(meta.sport||'').slice(0,100),exercise:String(meta.exercise||'').slice(0,120)};
      }
    if(Array.isArray(d.custom))for(const c of d.custom){
      if(typeof c.id!=='string'||!c.id.startsWith('custom:')||typeof c.label!=='string')continue;
      const clean={id:c.id.slice(0,100),label:c.label.slice(0,110),category:allCategories().some(x=>x.id===c.category)?c.category:'other',
        characterId:(c.characterId==='char:denis'?'char:daniel':characterById(c.characterId)?.id)||(allCharacters().find(x=>x.name===c.character||(x.aliases||[]).includes(c.character))?.id||''),
        sport:String(c.sport||'').slice(0,100),exercise:String(c.exercise||'').slice(0,120),
        note:String(c.note||'').slice(0,700),variant:'planned',origin:'custom',
        src:safeUrl(c.src||''),status:['done','review','todo'].includes(c.status)?c.status:'todo'};
      const ix=state.custom.findIndex(x=>x.id===clean.id);if(ix>=0)state.custom[ix]=clean;else state.custom.push(clean);
    }
    if(d.placements&&typeof d.placements==='object'&&!Array.isArray(d.placements))
      for(const [key,v] of Object.entries(d.placements)){
        if(!/^(category|exercise|template|asset|character):[a-z0-9:_-]{1,120}$/i.test(key)||!v||typeof v!=='object')continue;
        if(v.kind==='catalog'&&typeof v.id==='string')state.placements[key]={kind:'catalog',id:v.id.slice(0,150)};
        if(v.kind==='url'&&typeof v.url==='string'&&safeUrl(v.url))state.placements[key]={kind:'url',url:safeUrl(v.url)};
        if(v.kind==='upload')state.placements[key]={kind:'upload'};
      }
    if(data.media&&typeof data.media==='object')for(const [id,value] of Object.entries(data.media)){
      if(!(id.startsWith('variant:')||id.startsWith('custom:')||id.startsWith('replace:')||id.startsWith('placement:'))||typeof value!=='string'||value.length>7500000||!/^data:image\/(png|webp|jpeg);base64,/.test(value))continue;
      if(await mediaPut(id,value)){media[id]=value;delete normalizedIcons[id.startsWith('replace:')?id.slice(8):id];}
    }
    if(d.iconVariants&&typeof d.iconVariants==='object')for(const [id,list] of Object.entries(d.iconVariants)){if(!/^(category|exercise|template|asset|character):[a-z0-9:_-]{1,120}$/i.test(id)||!Array.isArray(list)||isLocked(id))continue;state.iconVariants[id]=list.slice(0,30).filter(v=>v&&/^variant:[a-z0-9-]+$/.test(v.id)&&v.asset&&((v.asset.kind==='catalog'&&typeof v.asset.id==='string'&&findItem(v.asset.id))||(v.asset.kind==='url'&&safeUrl(v.asset.url))||(v.asset.kind==='upload'&&v.asset.mediaKey===v.id&&media[v.id]))).map(v=>({id:v.id,asset:v.asset.kind==='catalog'?{kind:'catalog',id:v.asset.id}:v.asset.kind==='url'?{kind:'url',url:safeUrl(v.asset.url)}:{kind:'upload',mediaKey:v.id}}));}
    importLibraryState(d);await restoreLockedState(lockedSnapshot);saveState();refreshCategoryOptions();refreshCharacterOptions();selectedCharacter='all';render();notify('Импорт выполнен: категории, персонажи и назначения объединены');
  }catch(err){notify('Не получилось импортировать: '+err.message);}finally{e.target.value='';}
}
/* The Sport library, isolated from diary, account and workout-session data. */
const BASE_TEMPLATES=[{id:'sea',title:'Плавание в море',kind:'sea',description:'Разминка на берегу, плавание, заминка',items:[['shoulder-stretch','warmup',1],['swimming','main',1],['calf-stretch','cooldown',1]]},{id:'gym',title:'Тренажёрный зал',kind:'gym',description:'Пример: разминка, три упражнения, заминка',items:[['walking','warmup',1],['barbell-bench-press','main',3],['barbell-back-squat','main',3],['cable-seated-row','main',3],['chest-stretch','cooldown',1]]},{id:'bars',title:'Турники',kind:'bars',description:'Разминка, подтягивания, отжимания, заминка',items:[['jumping-jack','warmup',1],['pull-up','main',3],['push-up','main',3],['shoulder-stretch','cooldown',1]]},{id:'football',title:'Футбол',kind:'cardio',items:[]},{id:'tennis',title:'Теннис',kind:'cardio',items:[]}];
let libraryTab='exercises',librarySport='all',libraryMuscle='all',libraryEquipment='all',libraryQuery='',positionFilter='all',detailPosition=null;
let muscleMap={},recommendedTemplates=[];
const sports=[['all','Все виды спорта'],['warmup','Разогрев'],['cooldown','Заминка'],['gym','Тренажёрный зал'],['bars','Турники'],['swimming','Плавание'],['running','Бег и ходьба'],['cycling','Велоспорт'],['rowing','Гребля'],['cardio','Другое кардио'],['mobility','Подвижность и растяжка']];
const muscles=[['all','Группы мышц'],['legs','Ноги'],['back','Спина'],['chest','Грудь'],['shoulders','Плечи'],['arms','Руки'],['glutes','Ягодицы'],['core','Пресс']];
const equipment=[['all','Оборудование'],['barbell','Штанга'],['dumbbell','Гантели'],['machine','Тренажёры'],['bodyweight','Без оборудования'],['cardio','Кардио'],['mobility','Разминка и заминка']];
const positionLabels={done:'Готово',review:'На ревизии',empty:'Нет своей иконки'};
function importLibraryState(d){
 initLibraryState();
 for(const [id,status] of Object.entries(d.positionStatus||{}))if(/^(exercise|category|template|asset|character):[a-z0-9:_-]+$/i.test(id)&&['done','review'].includes(status))state.positionStatus[id]=status;
 for(const [id,note] of Object.entries(d.positionNotes||{}))if(typeof note==='string')state.positionNotes[id]=note.slice(0,2000);
 for(const key of ['libraryExercises','libraryTemplates'])if(Array.isArray(d[key]))for(const entry of d[key].slice(0,1000))if(entry&&typeof entry.id==='string'&&typeof (entry.name||entry.title)==='string'){
  const idx=state[key].findIndex(x=>x.id===entry.id);if(idx<0)state[key].push(entry);else state[key][idx]=entry;
 }
 for(const key of ['libraryExerciseOverrides','libraryTemplateOverrides'])if(d[key]&&typeof d[key]==='object'&&!Array.isArray(d[key]))Object.assign(state[key],d[key]);
 for(const map of ['positionBookmarks','positionLocks'])if(d[map]&&typeof d[map]==='object')for(const [id,value] of Object.entries(d[map]))if(typeof value==='boolean'&&/^(exercise|template|category|asset|character):/.test(id))state[map][id]=value;
 for(const [id,value] of Object.entries(d.positionCharacters||{}))if(typeof value==='string'&&(!value||characterById(value)))state.positionCharacters[id]=value;
 for(const [id,value] of Object.entries(d.assetMetadata||{}))if(value&&typeof value.label==='string')state.assetMetadata[id]={label:value.label.slice(0,110)};
 if(Array.isArray(d.libraryFavorites))state.libraryFavorites=[...new Set([...state.libraryFavorites,...d.libraryFavorites.filter(x=>typeof x==='string')])];
}
function allExercises(){return exercises.map(e=>({...e,...state.libraryExerciseOverrides[e.id]})).concat(state.libraryExercises);}
function allTemplates(){return BASE_TEMPLATES.concat(recommendedTemplates).map(t=>({...t,...state.libraryTemplateOverrides[t.id]})).concat(state.libraryTemplates);}
function exerciseSports(e){const id=e.id;if(e.sport)return [e.sport];if(id==='swimming')return ['swimming'];if(['walking','running'].includes(id))return ['running'];if(id==='cycling')return ['cycling'];if(id==='rowing')return ['rowing'];if(['aerobics','elliptical'].includes(id))return ['cardio'];if(/stretch|cat-cow|hip-90|ankle|thoracic|balance/.test(id))return ['warmup','cooldown','mobility','gym','bars','swimming'];if(/pull-up|chin-up|^dip$|^weighted-dip$|hanging|dead-hang|inverted-row/.test(id))return ['bars','gym'];if(e.category==='Без оборудования')return ['gym','bars',...(['jumping-jack','squat','arm-circles'].includes(id)?['warmup']:[])];return ['gym'];}
function exerciseMuscles(e){return e.muscleGroups?.length?e.muscleGroups:muscleMap[e.id]||muscleMap[e.id.replace(/-(narrow|wide)$/,'')]||[];}
function equipmentMatches(e,k){return k==='all'||k==='barbell'&&e.id.startsWith('barbell')||k==='dumbbell'&&e.id.startsWith('dumbbell')||k==='machine'&&/^(machine|cable|smith)/.test(e.id)||k==='bodyweight'&&e.category==='Без оборудования'||k==='cardio'&&e.category==='Кардио'||k==='mobility'&&/stretch|cat-cow|hip-90|ankle|thoracic/.test(e.id)||(e.equipment||[]).includes(k);}
function templateSport(t){return t.sport||({gym:'gym',bars:'bars',sea:'swimming',cardio:'cardio'}[t.kind]||'gym');}
function templateSportMatches(t){return librarySport==='all'||(['warmup','cooldown'].includes(librarySport)?t.items.some(i=>i[1]===librarySport):templateSport(t)===librarySport);}
function baseIcon(number){return allItems().find(i=>i.variant==='base'&&i.number===number)||null;}
function allPositions(){return ['exercise','template','category'].flatMap(kind=>scopeChoices(kind).map(x=>({kind,key:x.id,label:x.label})));}
function matchesPosition(kind,key){return positionFilter==='all'||positionFilter==='manual'?positionFilter==='all'||!!state.placements[scopeIdentifier(kind,key)]:positionStatus(kind,key)===positionFilter;}
function fillSelect(id,options,value){$(id).innerHTML=options.map(([k,n])=>'<option value="'+esc(k)+'">'+esc(n)+'</option>').join('');$(id).value=value;}
function openExerciseForm(id=''){
 const e=allExercises().find(e=>e.id===id);$('exercise-form').reset();fillSelect('exercise-category',[...new Set(['Без оборудования','Мои упражнения',...allExercises().map(x=>x.category)])].map(x=>[x,x]),e?.category||'Мои упражнения');$('exercise-form').dataset.id=id;$('exercise-form-title').textContent=e?'Редактировать упражнение':'Своё упражнение';
 if(e){$('exercise-name').value=e.name;$('exercise-category').value=e.category;$('exercise-aliases').value=(e.aliases||[]).join(', ');$('exercise-equipment').value=(e.equipment||[]).join(', ');}
 $('exercise-muscles').innerHTML=muscles.slice(1).map(([k,n])=>'<label><input type="checkbox" name="muscle" value="'+k+'" '+(e&&exerciseMuscles(e).includes(k)?'checked':'')+'>'+n+'</label>').join('');$('exercise-dialog').showModal();
}
function saveExercise(ev){ev.preventDefault();if(ev.target.dataset.id&&!canEdit('exercise:'+ev.target.dataset.id))return;const form=ev.target,id=form.dataset.id||'user-exercise-'+Date.now().toString(36),entry={id,name:$('exercise-name').value.trim().slice(0,110),category:$('exercise-category').value,aliases:splitTags($('exercise-aliases').value),equipment:splitTags($('exercise-equipment').value),muscleGroups:[...form.querySelectorAll('[name=muscle]:checked')].map(x=>x.value),scope:'user',profile:'reps'};if(!entry.name)return;const idx=state.libraryExercises.findIndex(e=>e.id===id);if(idx>=0)state.libraryExercises[idx]=entry;else if(exercises.some(e=>e.id===id))state.libraryExerciseOverrides[id]=entry;else state.libraryExercises.push(entry);saveState();$('exercise-dialog').close();render();notify('Упражнение сохранено');}
function openTemplateForm(id=''){
 const t=allTemplates().find(t=>t.id===id);$('template-form').reset();$('template-form').dataset.id=id;$('template-title').value=t?.title||'';$('template-description').value=t?.description||'';fillSelect('template-sport',sports.filter(([k])=>!['all','warmup','cooldown'].includes(k)),t?templateSport(t):['all','warmup','cooldown'].includes(librarySport)?'gym':librarySport);$('template-items').innerHTML='';for(const [eid,phase,sets] of t?.items||[])addTemplateItem(eid,phase,sets);if(!t)addTemplateItem();$('template-dialog').showModal();
}
function addTemplateItem(id='',phase='main',sets=3){const row=document.createElement('div');row.className='template-form-row';row.innerHTML='<label>Упражнение<select name="eid" aria-label="Упражнение">'+allExercises().map(e=>'<option value="'+esc(e.id)+'">'+esc(e.name)+'</option>').join('')+'</select></label><label>Этап<select name="phase"><option value="warmup">Разминка</option><option value="main">Основная</option><option value="cooldown">Заминка</option></select></label><label>Подходы<input name="sets" type="number" min="1" max="30" required value="'+sets+'"></label><button type="button" class="icon-close" data-remove-template-item aria-label="Убрать упражнение">×</button>';$('template-items').append(row);if(id)row.querySelector('[name=eid]').value=id;row.querySelector('[name=phase]').value=phase;}
function saveTemplate(ev){ev.preventDefault();if(ev.target.dataset.id&&!canEdit('template:'+ev.target.dataset.id))return;const form=ev.target,id=form.dataset.id||'user-template-'+Date.now().toString(36),items=[...form.querySelectorAll('.template-form-row')].map(row=>[row.querySelector('[name=eid]').value,row.querySelector('[name=phase]').value,Math.max(1,Math.min(30,Number(row.querySelector('[name=sets]').value)||1))]);if(!items.length){notify('Добавь хотя бы одно упражнение');return;}const sport=$('template-sport').value,t={id,title:$('template-title').value.trim().slice(0,110),description:$('template-description').value.trim().slice(0,700),sport,kind:sport==='swimming'?'sea':sport==='bars'?'bars':sport==='gym'?'gym':'cardio',items};if(!t.title)return;const idx=state.libraryTemplates.findIndex(t=>t.id===id);if(idx>=0)state.libraryTemplates[idx]=t;else if(allTemplates().some(t=>t.id===id))state.libraryTemplateOverrides[id]=t;else state.libraryTemplates.push(t);saveState();$('template-dialog').close();render();notify('Шаблон сохранён');}
/* Page navigation, review marks, locks and character assignments. */
const EMPTY_ART='./assets/daniel-waiting.png';
let generationPlan={characters:[],assignments:{},templateIcons:{}},activeCharacter='all',routeReady=false,routeWasSet=false;
const kindLabels={exercise:'Упражнение',template:'Тренировка',category:'Вид спорта',asset:'Изображение',character:'Персонаж'};
function splitPosition(id){const n=id.indexOf(':');return {kind:id.slice(0,n),key:id.slice(n+1)};}
function uiIcon(name){
 const paths={search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',edit:'<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>',settings:'<path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',unlock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',back:'<path d="m14 5-7 7 7 7M7 12h14"/>',arrow:'<path d="m9 5 7 7-7 7"/>',plus:'<path d="M12 4v16M4 12h16"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',image:'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>'};
 return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.image)+'</svg>';
}
function initLibraryState(){
 for(const key of ['positionStatus','positionNotes','libraryExerciseOverrides','libraryTemplateOverrides','positionBookmarks','positionLocks','positionCharacters','assetMetadata','iconVariants'])if(!state[key]||typeof state[key]!=='object'||Array.isArray(state[key]))state[key]={};
 for(const key of ['libraryExercises','libraryTemplates','libraryFavorites'])if(!Array.isArray(state[key]))state[key]=[];
}
function allItems(){return items.concat(state.custom.map(c=>Object.assign({variant:'planned',origin:'custom',status:c.src?'review':'todo'},c))).map(i=>Object.assign({},i,state.assetMetadata[i.id]||{}));}
function libraryItems(){return allItems().filter(i=>!i.aliasOf&&i.variant!=='people'&&!i.legacy);}
function scopeChoices(kind){
 if(kind==='exercise')return allExercises().map(e=>({id:e.id,label:e.name,sub:e.category}));
 if(kind==='template')return allTemplates().map(t=>({id:t.id,label:t.title,sub:t.recommended?'Рекомендуемые шаблоны':'Мои шаблоны'}));
 if(kind==='asset')return libraryItems().map(i=>({id:i.id,label:currentLabel(i),sub:categoryName(categoryOf(i))}));
 if(kind==='character')return allCharacters().map(c=>({id:c.id,label:c.name,sub:'Персонажи'}));
 return libraryItems().filter(i=>i.variant==='base'||i.origin==='plan').map(i=>({id:i.id,label:i.label,sub:categoryName(categoryOf(i))}));
}
function assignedCharacter(id){
 if(Object.prototype.hasOwnProperty.call(state.positionCharacters,id))return state.positionCharacters[id];
 const {kind,key}=splitPosition(id);if(kind==='character')return key;
 if(kind==='asset'||kind==='category')return iconCharacterId(findItem(key)||{});
 if(generationPlan.assignments[id])return generationPlan.assignments[id];
 if(kind==='template'){const item=defaultScopeItem(kind,key);return item?iconCharacterId(item):'';}
 return '';
}
function defaultScopeItem(kind,key){
 if(kind==='category'||kind==='asset')return findItem(key)||null;
 if(kind==='character')return libraryItems().find(i=>iconCharacterId(i)===key&&imageOf(i))||null;
 if(kind==='template'){
  const mapped=generationPlan.templateIcons[key];if(mapped)return findItem(mapped)||null;
  const t=allTemplates().find(t=>t.id===key);return baseIcon(/футбол/i.test(t?.title)?19:/теннис/i.test(t?.title)?22:({gym:1,bars:7,sea:14,cardio:10})[t?.kind]||37);
 }
 const ex=allExercises().find(e=>e.id===key);
 return ex?libraryItems().find(i=>imageOf(i)&&iconMeta(i).exercise.trim().toLowerCase()===ex.name.toLowerCase())||null:null;
}
function lockKey(id){const {kind,key}=splitPosition(id);return kind==='asset'&&findItem(key)?.variant==='base'?'category:'+key:id;}
function isLocked(id){return state.positionLocks[lockKey(id)]===true||state.positionLocks[id]===true;}
function canEdit(id){if(isLocked(id)){notify('Сначала открой замок этой позиции');return false;}return true;}
function reviewMarked(id){if(Object.prototype.hasOwnProperty.call(state.positionBookmarks,id))return state.positionBookmarks[id];const {kind,key}=splitPosition(id);return positionStatus(kind,key)==='review';}
function toggleFavorite(id){if(!canEdit(id))return false;const i=state.libraryFavorites.indexOf(id);if(i<0)state.libraryFavorites.push(id);else state.libraryFavorites.splice(i,1);saveState();return true;}
function toggleReview(id){
 if(!canEdit(id))return false;const next=!reviewMarked(id);state.positionBookmarks[id]=next;
 const {kind,key}=splitPosition(id),value=next?'review':'done';
 if(kind==='asset')state.status[key]=value;else state.positionStatus[id]=value;
 saveState();return true;
}
function toggleLock(id){const next=!isLocked(id);state.positionLocks[lockKey(id)]=next;delete state.positionLocks[id===lockKey(id)?'__unused':id];saveState();return next;}
function positionStatus(kind,key){
 const id=scopeIdentifier(kind,key),item=placedItem(kind,key);if(!item||!imageOf(item))return 'empty';
 if(kind==='asset')return statusOf(item)==='review'?'review':statusOf(item)==='todo'?'empty':'done';
 return state.positionStatus[id]||(state.placements[id]?'review':statusOf(item)==='review'?'review':'done');
}
function positionPicture(kind,key,large=false){
 const item=placedItem(kind,key),src=item&&imageOf(item),label=scopeLabel(kind,key);
 return '<button class="position-picture '+(large?'large ':'')+(!src?'unassigned':'')+'" data-edit-position="'+esc(scopeIdentifier(kind,key))+'" type="button" aria-label="Открыть редактор: '+esc(label)+'">'+(src?imageMarkup(item):'<img class="empty-daniel" src="'+EMPTY_ART+'" alt="Дэниел ждёт: иконка не выбрана" loading="lazy">')+'</button>';
}
function rowTools(id){
 const locked=isLocked(id),fav=state.libraryFavorites.includes(id),review=reviewMarked(id);
 return '<div class="row-tools"><button class="mark-button '+(review?'marked':'')+'" type="button" data-review="'+esc(id)+'" aria-label="Ревизия: '+esc(scopeLabel(splitPosition(id).kind,splitPosition(id).key))+'" aria-pressed="'+review+'" '+(locked?'disabled':'')+'>'+uiIcon('bookmark')+'</button><button class="favorite '+(fav?'on':'')+'" data-favorite="'+esc(id)+'" type="button" aria-label="Избранное: '+esc(id)+'" aria-pressed="'+fav+'" '+(locked?'disabled':'')+'>'+uiIcon('star')+'</button><button class="lock-button '+(locked?'locked':'')+'" data-lock="'+esc(id)+'" type="button" aria-label="'+(locked?'Разблокировать: ':'Заблокировать: ')+esc(id)+'" aria-pressed="'+locked+'">'+uiIcon(locked?'lock':'unlock')+'</button></div>';
}
function row(kind,obj){
 const key=obj.id,id=scopeIdentifier(kind,key),label=kind==='exercise'?obj.name:kind==='template'?obj.title:obj.label,status=positionStatus(kind,key),person=characterById(assignedCharacter(id));
 const sub=kind==='exercise'?obj.category:kind==='template'?(obj.description||obj.items.length+' упражнений'):categoryName(categoryOf(obj));
 return '<article class="card library-row '+(isLocked(id)?'row-locked':'')+'">'+positionPicture(kind,key)+'<button class="row-copy" type="button" data-edit-position="'+esc(id)+'"><strong>'+esc(label)+'</strong><small>'+esc(sub)+(person?' · '+esc(person.name):'')+'</small><span class="row-status status-'+status+'"><i></i>'+positionLabels[status]+(state.placements[id]?' · вручную':'')+'</span></button>'+rowTools(id)+'</article>';
}
function renderStats(){
 const arr=allPositions(),counts={all:arr.length,done:0,review:0,empty:0,manual:0};
 for(const p of arr){counts[positionStatus(p.kind,p.key)]++;const item=placedItem(p.kind,p.key);if(state.placements[scopeIdentifier(p.kind,p.key)]&&item&&imageOf(item))counts.manual++;}
 $('stats').innerHTML=[['all','Всего позиций'],['done','Готово'],['manual','Вручную'],['review','На ревизии'],['empty','Пусто']].map(([key,label])=>'<button type="button" class="stat-box '+(positionFilter===key?'selected':'')+'" data-position-filter="'+key+'" aria-pressed="'+String(positionFilter===key)+'"><span class="stat-dot stat-'+key+'"></span><strong>'+counts[key]+'</strong><small>'+label+'</small></button>').join('');
 $('stats-summary').textContent=counts.done+' готово · '+counts.review+' на ревизии · '+counts.empty+' пусто';
 $('assets-count').textContent=libraryItems().filter(i=>imageOf(i)).length+' изображений · '+libraryItems().filter(i=>!imageOf(i)).length+' пустых позиций';
}
function characterArt(c){const item=placedItem('character',c.id);return item&&imageOf(item)?imageMarkup(item):'<img src="'+EMPTY_ART+'" alt="'+esc(c.name)+'" loading="lazy">';}
function renderCharacters(){
 $('character-carousel').innerHTML='<button type="button" class="character-card '+(activeCharacter==='all'?'selected':'')+'" data-character="all" aria-pressed="'+(activeCharacter==='all')+'"><span class="character-avatar all-characters">'+uiIcon('image')+'</span><strong>Все</strong></button>'+allCharacters().map(c=>'<button type="button" class="character-card '+(activeCharacter===c.id?'selected':'')+'" data-character="'+esc(c.id)+'" aria-pressed="'+(activeCharacter===c.id)+'"><span class="character-avatar">'+characterArt(c)+'</span><strong>'+esc(c.name)+'</strong></button>').join('');
 const current=characterById(activeCharacter);$('character-summary').innerHTML=current?'<div><strong>'+esc(current.name)+'</strong><p>'+esc(current.profile||'')+'</p></div><button type="button" class="button" data-edit-position="character:'+esc(current.id)+'">Профиль</button>':'<p>Выбери персонажа — здесь появятся его упражнения и иконки.</p>';
 const q=libraryQuery.toLowerCase().trim();let matches=allPositions().filter(p=>(activeCharacter==='all'||assignedCharacter(scopeIdentifier(p.kind,p.key))===activeCharacter)&&matchesPosition(p.kind,p.key)&&p.label.toLowerCase().includes(q));
 let html='';for(const [kind,title] of [['exercise','Упражнения'],['template','Тренировки'],['category','Виды спорта']]){
  const list=matches.filter(p=>p.kind===kind);if(!list.length)continue;
  html+='<h2 class="group-title">'+title+' · '+list.length+'</h2><div class="exercise-list">'+list.map(p=>{const obj=kind==='exercise'?allExercises().find(e=>e.id===p.key):kind==='template'?allTemplates().find(t=>t.id===p.key):findItem(p.key);return obj?row(kind,obj):'';}).join('')+'</div>';
 }
 const custom=libraryItems().filter(i=>i.origin==='custom'&&(activeCharacter==='all'||iconCharacterId(i)===activeCharacter)&&currentLabel(i).toLowerCase().includes(q));
 if(custom.length)html+='<h2 class="group-title">Свои изображения</h2><div class="exercise-list">'+custom.map(i=>row('asset',i)).join('')+'</div>';
 $('library-results').innerHTML=html||'<div class="empty">У этого персонажа пока нет назначений.</div>';$('library-count').textContent='Найдено: '+(matches.length+custom.length);
}
function renderLibrary(){
 const isTemplates=libraryTab==='templates',isCategories=libraryTab==='categories',isCharacters=libraryTab==='characters';
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('selected',b.dataset.tab===libraryTab);b.setAttribute('aria-selected',String(b.dataset.tab===libraryTab));});
 $('library-search').placeholder=isTemplates?'Найти тренировку':isCategories?'Найти вид спорта':isCharacters?'Найти среди иконок персонажа':'Все упражнения';$('library-search').setAttribute('aria-label',$('library-search').placeholder);
 $('sport-filter-row').hidden=isCategories||isCharacters;$('library-filters').hidden=isCategories||isCharacters;$('characters-view').hidden=!isCharacters;
 $('filter-reset').hidden=positionFilter==='all'&&librarySport==='all'&&libraryMuscle==='all'&&libraryEquipment==='all'&&!libraryQuery&&activeCharacter==='all';
 if(isCharacters){renderCharacters();return;}
 const eqVisible=['gym','bars'].includes(librarySport);$('equipment-filter').hidden=!eqVisible;if(!eqVisible)libraryEquipment='all';
 const pool=allExercises().filter(e=>librarySport==='all'||exerciseSports(e).includes(librarySport)),availableMuscles=new Set(pool.flatMap(exerciseMuscles));
 if(libraryMuscle!=='all'&&!availableMuscles.has(libraryMuscle))libraryMuscle='all';fillSelect('library-muscle',muscles.filter(([k])=>k==='all'||availableMuscles.has(k)),libraryMuscle);$('library-muscle').disabled=availableMuscles.size===0;
 fillSelect('library-equipment',equipment.filter(([k])=>k==='all'||pool.some(e=>equipmentMatches(e,k))),libraryEquipment);
 const q=libraryQuery.trim().toLowerCase().replaceAll('ё','е'),match=s=>String(s).toLowerCase().replaceAll('ё','е').includes(q);let arr=[];const kind=isCategories?'category':isTemplates?'template':'exercise';
 if(isTemplates)arr=allTemplates().filter(t=>templateSportMatches(t)&&match([t.title,t.description,...t.items.map(([id])=>allExercises().find(e=>e.id===id)?.name||id)].join(' '))&&(libraryEquipment==='all'||t.items.some(([id])=>equipmentMatches(allExercises().find(e=>e.id===id)||{},libraryEquipment)))&&(libraryMuscle==='all'||t.items.some(([id])=>exerciseMuscles(allExercises().find(e=>e.id===id)||{}).includes(libraryMuscle))));
 else if(isCategories)arr=scopeChoices('category').map(p=>findItem(p.id)).filter(i=>i&&match(i.label+' '+categoryName(categoryOf(i))));
 else arr=pool.filter(e=>match([e.name,e.en,...(e.aliases||[]),...(e.equipment||[])].join(' '))&&equipmentMatches(e,libraryEquipment)&&(libraryMuscle==='all'||exerciseMuscles(e).includes(libraryMuscle)));
 arr=arr.filter(x=>matchesPosition(kind,x.id));$('library-count').textContent='Найдено: '+arr.length;
 let markup='';const favorites=arr.filter(x=>state.libraryFavorites.includes(scopeIdentifier(kind,x.id))),rest=arr.filter(x=>!state.libraryFavorites.includes(scopeIdentifier(kind,x.id)));
 if(favorites.length)markup+='<h2 class="group-title">Избранное</h2><div class="exercise-list">'+favorites.map(x=>row(kind,x)).join('')+'</div>';
 if(isTemplates){const mine=rest.filter(t=>!t.recommended),rec=rest.filter(t=>t.recommended);markup+='<h2 class="group-title">Мои шаблоны</h2><div class="exercise-list">'+mine.map(t=>row(kind,t)).join('')+'</div><button class="button dashed create-button" data-create="template" type="button">'+uiIcon('plus')+' Создать свою тренировку</button><h2 class="group-title">Рекомендуемые шаблоны</h2><div class="exercise-list">'+rec.map(t=>row(kind,t)).join('')+'</div>';}
 else markup+=(favorites.length?'<h2 class="group-title">'+(isCategories?'Все виды спорта':'Упражнения')+'</h2>':'')+'<div class="exercise-list">'+rest.map(x=>row(kind,x)).join('')+'</div>';
 if(!arr.length)markup+='<div class="empty">Ничего не найдено. Попробуй изменить фильтры.</div>';
 if(!isTemplates&&!isCategories)markup+='<button class="button dashed create-button" data-create="exercise" type="button">'+uiIcon('plus')+' Создать своё упражнение</button>';
 $('library-results').innerHTML=markup;
}
function renderGrid(){
 const q=$('search').value.trim().toLowerCase(),cat=$('category').value,variant=$('variant').value,sort=$('sort').value;
 filtered=libraryItems().filter(i=>(!q||(currentLabel(i)+' '+iconMeta(i).sport+' '+iconMeta(i).exercise).toLowerCase().includes(q))&&(cat==='all'||categoryOf(i)===cat)&&(selectedCharacter==='all'||iconCharacterId(i)===selectedCharacter)&&(variant==='all'||i.variant===variant)&&(filterStatus==='all'||statusOf(i)===filterStatus));
 filtered.sort((a,b)=>sort==='name'?currentLabel(a).localeCompare(currentLabel(b),'ru'):sort==='status'?statusOf(a).localeCompare(statusOf(b)):categoryName(categoryOf(a)).localeCompare(categoryName(categoryOf(b)),'ru'));
 $('results-count').textContent='Показано: '+filtered.length;$('empty').hidden=filtered.length!==0;
 $('icon-grid').innerHTML=filtered.map(i=>'<article class="asset-tile"><button type="button" class="asset-open" data-edit-position="asset:'+esc(i.id)+'"><span class="icon-media">'+(imageOf(i)?imageMarkup(i):'<img src="'+EMPTY_ART+'" alt="Иконка не выбрана">')+'</span><strong>'+esc(currentLabel(i))+'</strong></button>'+rowTools('asset:'+i.id)+'</article>').join('');
}
function render(){initLibraryState();renderStats();renderLibrary();renderTaxonomy();renderGrid();}
function navigate(hash){routeWasSet=true;if(location.hash===hash)applyRoute();else location.hash=hash;}
function openPosition(id){navigate('#edit/'+encodeURIComponent(id));}
function closeEditor(){navigate('#library/'+libraryTab);}
function applyRoute(){
 if(!routeReady)return;const hash=location.hash;
 $('library-page').hidden=true;$('manage-dialog').hidden=true;$('replace-dialog').hidden=true;
 if(hash.startsWith('#edit/')){let id='';try{id=decodeURIComponent(hash.slice(6));}catch{}const {kind,key}=splitPosition(id);if(!kindLabels[kind]||!scopeChoices(kind).some(p=>p.id===key)){notify('Позиция не найдена');navigate('#library/'+libraryTab);return;}
  scopeKind=kind;scopeKey=key;openReplaceDialog();document.title=scopeLabel(kind,key)+' · Icon Studio';
 }else if(hash==='#collection'){$('manage-dialog').hidden=false;renderGrid();document.title='Изображения · Icon Studio';}
 else {const tab=hash.split('/')[1];if(['exercises','templates','categories','characters'].includes(tab))libraryTab=tab;$('library-page').hidden=false;render();document.title='Happy Icon Studio · Библиотека';}
 window.scrollTo({top:0,behavior:'instant'});
}
function openReplaceDialog(iconId){
 editingScope=scopeIdentifier(scopeKind,scopeKey);draftScopeKind=scopeKind;draftScopeKey=scopeKey;
 const current=placedItem(scopeKind,scopeKey);
 draftAsset=scopeKind==='asset'?{kind:'catalog',id:scopeKey}:state.placements[editingScope]?{...state.placements[editingScope]}:current&&imageOf(current)?{kind:'catalog',id:current.id}:null;
 if(iconId&&findItem(iconId))draftAsset={kind:'catalog',id:iconId};editorLibraryMode='category';editorGroup='all';
 if(replaceObjectUrl){URL.revokeObjectURL(replaceObjectUrl);replaceObjectUrl=null;}
 $('replace-form').reset();$('editor-own').open=false;$('scene-preview').classList.remove('night');
 $('position-status').value=positionStatus(scopeKind,scopeKey)==='done'?'done':'review';$('position-note').value=scopeKind==='asset'?noteOf(findItem(scopeKey)):state.positionNotes[editingScope]||'';
 renderEditorTargets();renderEditorMetadata();renderEditorGroups();renderEditorCarousel();renderReplaceSample();renderEditorVariants();$('replace-dialog').hidden=false;refreshEditorLocks();
}
function renderEditorTargets(){
 const choices=scopeChoices(draftScopeKind);if(!choices.some(x=>x.id===draftScopeKey))draftScopeKey=choices[0]?.id||'';
 $('editor-target-select').innerHTML=scopeOptionMarkup(draftScopeKind);$('editor-target-select').value=draftScopeKey;
 $('editor-kind-tabs').hidden=['asset','character'].includes(draftScopeKind);
 document.querySelectorAll('[data-edit-kind]').forEach(b=>{b.classList.toggle('active',b.dataset.editKind===draftScopeKind);b.setAttribute('aria-pressed',String(b.dataset.editKind===draftScopeKind));});
 $('replace-id').textContent=kindLabels[draftScopeKind];$('replace-title').textContent=scopeLabel(draftScopeKind,draftScopeKey);
 fillSelect('editor-character',[['','Без персонажа'],...allCharacters().map(c=>[c.id,c.name])],assignedCharacter(editorScopeId()));$('editor-character-row').hidden=draftScopeKind==='character';
}
function renderReplaceSample(){
 let src='',name='Иконка не выбрана';if(draftAsset?.kind==='catalog'){const item=findItem(draftAsset.id);if(item){src=imageOf(item);name=currentLabel(item);}}else if(draftAsset?.kind==='url'){src=safeUrl(draftAsset.url);name='Изображение по ссылке';}else if(draftAsset?.kind==='upload'){src=replaceObjectUrl||media[draftAsset.mediaKey]||media['placement:'+editingScope]||'';name='Своё изображение';}
 if(draftScopeKind==='asset'&&draftAsset?.kind==='catalog'&&draftAsset.id===draftScopeKey){const item=findItem(draftScopeKey);src=item?imageOf(item):'';}
 $('replace-sample').innerHTML='<div class="replacement-hero-art">'+(src?'<img src="'+esc(src)+'" alt="'+esc(name)+'">':'<img src="'+EMPTY_ART+'" alt="Дэниел ждёт: иконка не выбрана">')+'</div><div><strong>'+esc(name)+'</strong><span>'+esc(scopeLabel(draftScopeKind,draftScopeKey))+'</span></div>';
 $('scene-title').textContent=scopeLabel(draftScopeKind,draftScopeKey);$('scene-image').innerHTML='<img src="'+esc(src||EMPTY_ART)+'" alt="">';
}
function renderEditorMetadata(){
 const {kind,key}=splitPosition(editorScopeId());let name=scopeLabel(kind,key),description='',extra='';
 if(kind==='exercise'){const e=allExercises().find(e=>e.id===key);extra='<label>Категория<input id="entry-category" value="'+esc(e.category)+'"></label><label>Оборудование<input id="entry-equipment" value="'+esc((e.equipment||[]).join(', '))+'"></label>';}
 if(kind==='template'){const t=allTemplates().find(t=>t.id===key);description=t.description||'';extra='<div id="editor-template-list">'+t.items.map(([id,phase,sets])=>{const e=allExercises().find(e=>e.id===id);return e?'<div class="template-item-row">'+positionPicture('exercise',id)+'<button type="button" class="row-copy" data-edit-position="exercise:'+esc(id)+'"><strong>'+esc(e.name)+'</strong><small>'+sets+' подх. · '+({warmup:'Разминка',main:'Основная',cooldown:'Заминка'}[phase]||phase)+'</small></button></div>':'';}).join('')+'</div><button type="button" class="button" data-edit-template="'+esc(key)+'">Изменить состав тренировки</button>';}
 if(kind==='character'){const c=characterById(key);description=c.profile||'';extra='<label>Виды спорта<textarea id="entry-sports" rows="3">'+esc((c.sports||[]).join('\n'))+'</textarea></label>';}
 $('editor-metadata').innerHTML='<h3>'+({exercise:'Упражнение',template:'Тренировка',character:'Профиль персонажа',category:'Данные позиции',asset:'Данные изображения'}[kind])+'</h3><label>Название<input id="entry-name" required maxlength="110" value="'+esc(name)+'"></label>'+(['template','character'].includes(kind)?'<label>'+ (kind==='character'?'Профиль':'Описание')+'<textarea id="entry-description" rows="3" maxlength="2000">'+esc(description)+'</textarea></label>':'')+extra;
}
function refreshEditorLocks(){
 const id=editorScopeId(),locked=isLocked(id);$('editor-fields').disabled=locked;$('editor-save').disabled=locked;$('replace-reset').disabled=locked;$('editor-add-variant').disabled=locked;
 $('editor-lock-note').hidden=!locked;$('editor-bookmark').disabled=locked;$('editor-favorite').disabled=locked;
 $('editor-bookmark').classList.toggle('marked',reviewMarked(id));$('editor-bookmark').setAttribute('aria-pressed',String(reviewMarked(id)));$('editor-bookmark').innerHTML=uiIcon('bookmark');
 $('editor-favorite').classList.toggle('on',state.libraryFavorites.includes(id));$('editor-favorite').setAttribute('aria-pressed',String(state.libraryFavorites.includes(id)));$('editor-favorite').innerHTML=uiIcon('star');
 $('editor-lock').classList.toggle('locked',locked);$('editor-lock').setAttribute('aria-label',locked?'Разблокировать редактирование':'Заблокировать редактирование');$('editor-lock').setAttribute('aria-pressed',String(locked));$('editor-lock').innerHTML=uiIcon(locked?'lock':'unlock');
}
function saveEntryMetadata(){
 const id=editorScopeId(),{kind,key}=splitPosition(id),name=$('entry-name').value.trim();if(!name)return false;
 if(kind==='exercise'){const old=allExercises().find(e=>e.id===key),entry={...old,name,category:$('entry-category').value.trim(),equipment:splitTags($('entry-equipment').value)};const index=state.libraryExercises.findIndex(e=>e.id===key);if(index>=0)state.libraryExercises[index]=entry;else state.libraryExerciseOverrides[key]=entry;}
 if(kind==='template'){const old=allTemplates().find(t=>t.id===key),entry={...old,title:name,description:$('entry-description').value.trim()};const index=state.libraryTemplates.findIndex(t=>t.id===key);if(index>=0)state.libraryTemplates[index]=entry;else state.libraryTemplateOverrides[key]=entry;}
 if(kind==='character'){const old=characterById(key),entry={...old,name,profile:$('entry-description').value.trim().slice(0,2000),sports:splitTags($('entry-sports').value)};const index=state.characters.findIndex(c=>c.id===key);if(index>=0)state.characters[index]=entry;else state.characterProfiles[key]=entry;}
 if(kind==='asset'||kind==='category'){const prefix=(characterById(assignedCharacter(id))?.name||'')+' · ';state.assetMetadata[key]={...state.assetMetadata[key],label:name.startsWith(prefix)?name.slice(prefix.length):name};};
 if(kind!=='character'){state.positionCharacters[id]=$('editor-character').value;if(kind==='asset'||kind==='category')state.characterAssignments[key]=$('editor-character').value;}
 return true;
}
async function onReplace(ev){
 ev.preventDefault();const target=editorScopeId(),{kind,key}=splitPosition(target);if(!canEdit(target))return;
 const file=$('replace-file').files[0];
 if(draftAsset?.kind==='upload'){
  if(file){if(!['image/png','image/webp','image/jpeg'].includes(file.type)||file.size>5*1024*1024){notify('PNG, WebP или JPEG до 5 МБ');return;}if(!mediaDb){notify('Хранилище изображений недоступно');return;}const value=await fileAsDataUrl(file);const mediaKey=kind==='asset'?'replace:'+key:'placement:'+target;if(!await mediaPut(mediaKey,value)){notify('Не удалось сохранить изображение');return;}media[mediaKey]=value;}
  else if(draftAsset.mediaKey){const value=media[draftAsset.mediaKey];if(!value){notify('Файл варианта недоступен');return;}const mediaKey=kind==='asset'?'replace:'+key:'placement:'+target;if(!await mediaPut(mediaKey,value)){notify('Не удалось сохранить изображение');return;}media[mediaKey]=value;draftAsset={kind:'upload'};}
  else if(kind==='asset'){if(!media['replace:'+key]){notify('Выбери файл');return;}}
  else if(!media['placement:'+target]){notify('Выбери файл');return;}
 }
 if(draftAsset?.kind==='catalog'&&!findItem(draftAsset.id)){notify('Изображение не найдено');return;}
 if(draftAsset?.kind==='url'&&!safeUrl(draftAsset.url)){notify('Укажи HTTPS-ссылку');return;}
 if(!canEdit(target)||!saveEntryMetadata())return;
 if(kind==='asset'){
  if(draftAsset?.kind==='catalog'&&draftAsset.id!==key)state.overrides[key]={kind:'catalog',sourceId:draftAsset.id};
  else if(draftAsset?.kind==='url'||draftAsset?.kind==='upload')state.overrides[key]={...draftAsset};
  state.status[key]=$('position-status').value;state.notes[key]=$('position-note').value.trim().slice(0,2000);
 }else {if(draftAsset)state.placements[target]={...draftAsset};state.positionStatus[target]=$('position-status').value;state.positionNotes[target]=$('position-note').value.trim().slice(0,2000);}
 state.positionBookmarks[target]=$('position-status').value==='review';delete normalizedIcons['placement:'+target];delete normalizedIcons[key];saveState();render();closeEditor();notify('Изменения сохранены');
}
function renderEditorVariants(){
 const list=state.iconVariants[editorScopeId()]||[];
 $('editor-variants').innerHTML=list.map((v,i)=>{const src=v.asset.kind==='catalog'?imageOf(findItem(v.asset.id)||{}):v.asset.kind==='url'?safeUrl(v.asset.url):media[v.asset.mediaKey]||'';return '<button type="button" class="editor-variant" data-icon-variant="'+esc(v.id)+'">'+(src?'<img src="'+esc(src)+'" alt="">':'')+'<span>Вариант '+(i+1)+'</span></button>';}).join('');
}
async function addEditorVariant(){
 const target=editorScopeId();if(!canEdit(target))return;
 const list=state.iconVariants[target]||[];if(list.length>=30){notify('Можно сохранить до 30 вариантов');return;}
 if(!draftAsset){notify('Сначала выбери изображение');return;}
 let asset={...draftAsset};const id='variant:'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
 if(asset.kind==='upload'){
  const file=$('replace-file').files[0];let value;
  if(file){if(!['image/png','image/webp','image/jpeg'].includes(file.type)||file.size>5*1024*1024){notify('PNG, WebP или JPEG до 5 МБ');return;}value=await fileAsDataUrl(file);}
  else value=media[asset.mediaKey]||media[draftScopeKind==='asset'?'replace:'+draftScopeKey:'placement:'+target];
  if(!value||!await mediaPut(id,value)){notify('Не удалось сохранить файл варианта');return;}media[id]=value;asset={kind:'upload',mediaKey:id};
 }
 if(!canEdit(target))return;
 state.iconVariants[target]=list.concat({id,asset});saveState();renderEditorVariants();notify('Вариант добавлен');
}
async function restoreOriginal(){
 const id=editorScopeId(),{kind,key}=splitPosition(id);if(!canEdit(id))return;
 if(kind==='asset'){delete state.overrides[key];delete normalizedIcons[key];delete media['replace:'+key];await mediaDelete('replace:'+key);}
 else {delete state.placements[id];delete state.positionStatus[id];delete state.positionBookmarks[id];delete normalizedIcons['placement:'+id];delete media['placement:'+id];await mediaDelete('placement:'+id);}
 saveState();render();openReplaceDialog();notify('Показан исходный вариант');
}
function captureLockedState(){return {state:JSON.parse(JSON.stringify(state)),media:{...media}};}
async function restoreLockedState(snapshot){
 for(const [id,locked] of Object.entries(snapshot.state.positionLocks||{})){if(!locked)continue;const {kind,key}=splitPosition(id);const restore=(map,k)=>{if(Object.prototype.hasOwnProperty.call(snapshot.state[map]||{},k))state[map][k]=snapshot.state[map][k];else delete state[map][k];};
  for(const map of ['placements','positionStatus','positionNotes','positionBookmarks','positionCharacters','iconVariants'])restore(map,id);
  if(kind==='asset'||kind==='category')for(const map of ['overrides','status','notes','characterAssignments','categoryAssignments','assetMetadata'])restore(map,key);
  if(kind==='exercise')restore('libraryExerciseOverrides',key);if(kind==='template')restore('libraryTemplateOverrides',key);if(kind==='character')restore('characterProfiles',key);
  for(const list of ['libraryExercises','libraryTemplates','characters','custom']){const old=(snapshot.state[list]||[]).find(x=>x.id===key);if(old){const idx=state[list].findIndex(x=>x.id===key);if(idx>=0)state[list][idx]=old;}}
  state.libraryFavorites=state.libraryFavorites.filter(x=>x!==id);if(snapshot.state.libraryFavorites.includes(id))state.libraryFavorites.push(id);
  for(const mediaKey of ['placement:'+id,'replace:'+key]){if(snapshot.media[mediaKey]){media[mediaKey]=snapshot.media[mediaKey];await mediaPut(mediaKey,snapshot.media[mediaKey]);}else{delete media[mediaKey];await mediaDelete(mediaKey);}}
  state.positionLocks[id]=true;
 }
}
async function start(){
 state=readState();initLibraryState();mediaDb=await openDb();await loadMedia();initIconEvents();bind();
 try{
  const responses=await Promise.all(['./sport-icons/catalog.json','./data/icon-manifest.json','./data/seed.json','./data/recommended-templates.json','./data/exercise-muscles.json','./data/studio-plan.json'].map(url=>fetch(url,{cache:'no-cache'})));if(responses.some(r=>!r.ok))throw new Error('Не удалось загрузить справочники');
  const [catalog,m,seed,recommended,muscle,plan]=await Promise.all(responses.map(r=>r.json()));manifest=m;exercises=seed.exercises;recommendedTemplates=recommended;muscleMap=muscle;generationPlan=plan;
  items=catalog.filter(c=>c.group!=='people').map(c=>{const linked=manifest.planned.find(p=>p.catalogId===c.id);return {id:c.id,label:c.label,title:c.title,number:c.number,legacyId:linked?.id||'',category:categoryFor(c.number),variant:c.group,origin:'catalog',src:c.src?'./'+c.src:'',characterId:c.characterId||linked?.characterId||'',sport:c.label,exercise:'',status:!c.src?'todo':manifest.reviewIds.includes(c.id)?'review':'done'};}).concat(manifest.planned.map(p=>{const candidate=p.catalogId&&catalog.find(c=>c.id===p.catalogId);return {id:p.id,label:p.label,category:p.category||'other',variant:'planned',origin:'plan',characterId:p.characterId||'',sport:p.sport||'',exercise:p.exercise||'',src:candidate?.src?'./'+candidate.src:'',aliasOf:candidate?.id||'',status:candidate?.src?'review':'todo',note:p.note||''};}));
  refreshCategoryOptions();refreshCharacterOptions();fillSelect('library-sport',sports,librarySport);libraryQuery=$('library-search').value;routeReady=true;render();$('loading').hidden=true;applyRoute();
 }catch(error){$('loading').textContent='Не удалось открыть библиотеку. Обнови страницу.';notify(error.message);}
}
const LIBRARY_DISCLOSURE_KEY='happy_icon_studio_library_expanded_v1';
function expandLibrary(){
 $('library-disclosure').open=true;
 $('library-disclosure-action').textContent='Свернуть';
 try{localStorage.setItem(LIBRARY_DISCLOSURE_KEY,'true');}catch{}
}
function bindLibraryDisclosure(){
 const panel=$('library-disclosure');
 panel.open=true;
 $('library-disclosure-action').textContent=panel.open?'Свернуть':'Показать';
 panel.addEventListener('toggle',()=>{
  $('library-disclosure-action').textContent=panel.open?'Свернуть':'Показать';
  try{localStorage.setItem(LIBRARY_DISCLOSURE_KEY,String(panel.open));}catch{}
 });
}
function bind(){
 bindLibraryDisclosure();
 window.addEventListener('hashchange',applyRoute);
 window.addEventListener('storage',e=>{if(e.key!==KEY)return;state=readState();initLibraryState();loadMedia().then(()=>{render();if(!$('replace-dialog').hidden)refreshEditorLocks();});});
 $('library-search').addEventListener('input',e=>{libraryQuery=e.target.value;expandLibrary();renderLibrary();});
 for(const [id,fn] of [['library-sport',v=>{librarySport=v;libraryMuscle='all';libraryEquipment='all';}],['library-muscle',v=>libraryMuscle=v],['library-equipment',v=>libraryEquipment=v]])$(id).addEventListener('change',e=>{fn(e.target.value);expandLibrary();renderLibrary();});
 $('filter-reset').addEventListener('click',()=>{positionFilter='all';libraryQuery='';librarySport='all';libraryMuscle='all';libraryEquipment='all';activeCharacter='all';$('library-search').value='';$('library-sport').value='all';render();});
 document.addEventListener('click',async e=>{
  const close=e.target.closest('[data-close]');if(close){$(close.dataset.close).close();return;}
  const tab=e.target.closest('[data-tab]');if(tab){expandLibrary();libraryTab=tab.dataset.tab;libraryQuery='';$('library-search').value='';navigate('#library/'+libraryTab);return;}
  const character=e.target.closest('[data-character]');if(character){expandLibrary();activeCharacter=character.dataset.character;renderLibrary();return;}
  const stat=e.target.closest('[data-position-filter]');if(stat){expandLibrary();positionFilter=stat.dataset.positionFilter;render();$('library-search').scrollIntoView({block:'start',behavior:'smooth'});return;}
  const edit=e.target.closest('[data-edit-position]');if(edit){openPosition(edit.dataset.editPosition);return;}
  const favorite=e.target.closest('[data-favorite]');if(favorite){toggleFavorite(favorite.dataset.favorite);render();return;}
  const review=e.target.closest('[data-review]');if(review){toggleReview(review.dataset.review);render();return;}
  const lock=e.target.closest('[data-lock]');if(lock){toggleLock(lock.dataset.lock);render();return;}
  const create=e.target.closest('[data-create]');if(create){create.dataset.create==='exercise'?openExerciseForm():openTemplateForm();return;}
  const temp=e.target.closest('[data-edit-template]');if(temp){if(canEdit('template:'+temp.dataset.editTemplate))openTemplateForm(temp.dataset.editTemplate);return;}
  if(e.target.closest('[data-remove-template-item]'))e.target.closest('.template-form-row').remove();
 });
 $('manage-btn').addEventListener('click',()=>navigate('#collection'));$('collection-back').addEventListener('click',()=>navigate('#library/'+libraryTab));
 $('backup-btn').addEventListener('click',()=>$('backup-dialog').showModal());
 $('search').addEventListener('input',renderGrid);for(const id of ['category','variant','sort'])$(id).addEventListener('change',()=>{renderTaxonomy();renderGrid();});
 $('add-category').addEventListener('click',()=>openCategory());$('category-cancel').addEventListener('click',()=>$('category-dialog').close());$('category-form').addEventListener('submit',saveCategory);
 $('add-character').addEventListener('click',()=>openCharacter());$('character-cancel').addEventListener('click',()=>$('character-dialog').close());$('character-form').addEventListener('submit',saveCharacter);
 $('taxonomy-categories').addEventListener('click',e=>{const edit=e.target.closest('[data-edit-category]');if(edit){openCategory(edit.dataset.editCategory);return;}const b=e.target.closest('[data-tax-category]');if(b){$('category').value=b.dataset.taxCategory;renderTaxonomy();renderGrid();}});
 $('taxonomy-characters').addEventListener('click',e=>{const edit=e.target.closest('[data-edit-character]');if(edit){openPosition('character:'+edit.dataset.editCharacter);return;}const b=e.target.closest('[data-tax-character]');if(b){selectedCharacter=b.dataset.taxCharacter;renderTaxonomy();renderGrid();}});
 document.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>{filterStatus=b.dataset.status;document.querySelectorAll('[data-status]').forEach(x=>x.classList.toggle('active',x===b));renderGrid();}));
 $('add-btn').addEventListener('click',()=>{$('add-form').reset();refreshCategoryOptions();refreshCharacterOptions();$('add-dialog').showModal();});$('add-cancel').addEventListener('click',()=>$('add-dialog').close());$('add-form').addEventListener('submit',onAdd);
 $('replace-cancel').addEventListener('click',closeEditor);
 $('editor-lock').addEventListener('click',()=>{toggleLock(editorScopeId());refreshEditorLocks();render();});
 $('editor-favorite').addEventListener('click',()=>{toggleFavorite(editorScopeId());refreshEditorLocks();render();});
 $('editor-bookmark').addEventListener('click',()=>{if(toggleReview(editorScopeId()))$('position-status').value=reviewMarked(editorScopeId())?'review':'done';refreshEditorLocks();render();});
 $('position-status').addEventListener('change',()=>{$('editor-bookmark').classList.toggle('marked',$('position-status').value==='review');});
 document.querySelectorAll('[data-edit-kind]').forEach(b=>b.addEventListener('click',()=>{if(!canEdit(editorScopeId()))return;const k=b.dataset.editKind,p=scopeChoices(k)[0];if(p)openPosition(k+':'+p.id);}));
 $('editor-target-select').addEventListener('change',e=>{if(canEdit(editorScopeId()))openPosition(draftScopeKind+':'+e.target.value);});
 document.querySelectorAll('[data-library-mode]').forEach(b=>b.addEventListener('click',()=>{if(!canEdit(editorScopeId()))return;editorLibraryMode=b.dataset.libraryMode;editorGroup='all';renderEditorGroups();renderEditorCarousel();}));
 $('editor-groups').addEventListener('click',e=>{const b=e.target.closest('[data-editor-group]');if(b&&canEdit(editorScopeId())){editorGroup=b.dataset.editorGroup;renderEditorGroups();renderEditorCarousel();}});
 $('editor-carousel').addEventListener('click',e=>{const b=e.target.closest('[data-candidate-id]');if(!b||!canEdit(editorScopeId()))return;draftAsset={kind:'catalog',id:b.dataset.candidateId};$('replace-file').value='';$('replace-url').value='';if(replaceObjectUrl){URL.revokeObjectURL(replaceObjectUrl);replaceObjectUrl=null;}renderEditorCarousel();renderReplaceSample();});
 $('replace-file').addEventListener('change',e=>{if(!canEdit(editorScopeId())){e.target.value='';return;}const file=e.target.files[0];if(!file)return;if(!['image/png','image/webp','image/jpeg'].includes(file.type)||file.size>5*1024*1024){notify('PNG, WebP или JPEG до 5 МБ');e.target.value='';return;}if(replaceObjectUrl)URL.revokeObjectURL(replaceObjectUrl);replaceObjectUrl=URL.createObjectURL(file);draftAsset={kind:'upload'};$('replace-url').value='';renderEditorCarousel();renderReplaceSample();});
 $('replace-url').addEventListener('change',e=>{if(!canEdit(editorScopeId()))return;const value=safeUrl(e.target.value.trim());if(!value.startsWith('https:')){notify('Укажи корректную HTTPS-ссылку');return;}draftAsset={kind:'url',url:value};$('replace-file').value='';renderEditorCarousel();renderReplaceSample();});
 $('editor-add-variant').addEventListener('click',addEditorVariant);$('editor-variants').addEventListener('click',ev=>{const button=ev.target.closest('[data-icon-variant]');if(!button||!canEdit(editorScopeId()))return;const variant=(state.iconVariants[editorScopeId()]||[]).find(v=>v.id===button.dataset.iconVariant);if(!variant)return;draftAsset={...variant.asset};$('replace-file').value='';if(replaceObjectUrl){URL.revokeObjectURL(replaceObjectUrl);replaceObjectUrl=null;}renderReplaceSample();});
 $('replace-form').addEventListener('submit',onReplace);$('replace-reset').addEventListener('click',restoreOriginal);
 $('export-btn').addEventListener('click',exportAll);$('import-btn').addEventListener('click',()=>$('import-file').click());$('import-file').addEventListener('change',importAll);
 $('exercise-form').addEventListener('submit',saveExercise);$('template-form').addEventListener('submit',e=>{const key=e.target.dataset.id;if(key&&!canEdit('template:'+key)){e.preventDefault();return;}saveTemplate(e);if(!$('replace-dialog').hidden)openReplaceDialog();});$('add-template-item').addEventListener('click',()=>addTemplateItem());
 $('scene-mode').addEventListener('change',e=>$('scene-preview').classList.toggle('night',e.target.checked));
 $('reset-btn').addEventListener('click',async()=>{if(Object.values(state.positionLocks).some(Boolean)){notify('Для полного сброса сначала открой закрытые замки');return;}if(!confirm('Удалить все правки и свои изображения в этой студии?'))return;await globalThis.HappyAppIcons?.reset();localStorage.removeItem(KEY);await mediaClear();location.reload();});
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')],idx=tabs.indexOf(b),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(idx+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();}));
}

start();
})();
