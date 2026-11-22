/* Preview and Sport can read Icon Studio assignments on the same origin.
   Image data stays in this browser; ordinary Sport records are never rewritten. */
const SPORT_STUDIO_KEY='auth_readonly_happy_icon_studio_v1';
let sportStudioLoadSerial=0;
const studioObject=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};

async function sportStudioReadImages(ids){
 if(!ids.length||!window.indexedDB)return {};
 const db=await new Promise(resolve=>{
  try{const request=indexedDB.open('auth-readonly-happy-icon-studio-images-v1',1);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('images'))request.result.createObjectStore('images')};
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);
  }catch{resolve(null)}
 });
 if(!db)return {};
 const results=await Promise.all(ids.map(id=>new Promise(resolve=>{
  try{const request=db.transaction('images','readonly').objectStore('images').get(id);
   request.onsuccess=()=>resolve([id,typeof request.result==='string'?request.result:'']);request.onerror=()=>resolve([id,'']);
  }catch{resolve([id,''])}
 })));
 db.close();return Object.fromEntries(results);
}

async function loadSportStudioAssignments(){
 const serial=++sportStudioLoadSerial;let parsed={};
 try{parsed=JSON.parse(localStorage.getItem(SPORT_STUDIO_KEY)||'{}')||{}}catch{}
 const next={placements:studioObject(parsed.placements),overrides:studioObject(parsed.overrides),custom:Array.isArray(parsed.custom)?parsed.custom:[]};
 const ids=new Set();
 for(const [key,value] of Object.entries(next.placements))if(value?.kind==='upload')ids.add('placement:'+key);
 for(const [key,value] of Object.entries(next.overrides))if(value?.kind==='upload')ids.add('replace:'+key);
 for(const item of next.custom)if(typeof item?.id==='string'&&!item.src)ids.add(item.id);
 const media=await sportStudioReadImages([...ids]);if(serial!==sportStudioLoadSerial)return;
 sportStudioState=next;sportStudioMedia=media;
 // Avoid resetting a form that somebody is currently editing.
 if(!document.querySelector('#modal-root form, #panel-root form')&&typeof render==='function')render();
}
window.addEventListener('storage',event=>{if(event.key===SPORT_STUDIO_KEY)loadSportStudioAssignments()});
window.addEventListener('pageshow',()=>loadSportStudioAssignments());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadSportStudioAssignments()});
loadSportStudioAssignments();
