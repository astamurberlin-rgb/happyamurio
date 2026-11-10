/* Lab 10.11.2026 · Exercise families: variants of one movement (for pull-ups — the grip) behind one library card.
   Data: SEED.exerciseFamilies (exercise library, families.json) and SEED.exerciseMedia (exercise media library).
   A variant stays a separate exercise with its own stable id and its own history; the family only groups them:
   one card in the library, one pill per variant in the instructions, and the chosen pill is what gets added. */
const exerciseFamilies=SEED.exerciseFamilies||[],exerciseCards=SEED.exerciseCards||[],exerciseMedia=SEED.exerciseMedia||{base:'',items:{}};
const retiredFamilyIds=new Set(exerciseFamilies.flatMap(f=>f.retiredExerciseIds||[]));
function exerciseFamily(id){return exerciseFamilies.find(f=>f.variants.some(v=>v.exerciseId===id)||(f.retiredExerciseIds||[]).includes(id))}
function exerciseMediaUrl(id,key='cover'){if(id==='placeholder')return exerciseMedia.placeholder?.cover||''; /* embedded with its full library address */const item=exerciseMedia.items?.[id],path=key==='cover'?item?.cover:item?.frames?.[key];return path?exerciseMedia.base+path:''}
function familyVariantCount(n,noun){const word=n%10===1&&n%100!==11?'вариант':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'варианта':'вариантов';return n+' '+word+(noun?' '+noun:'')}

// Retired ids (earlier duplicates) stay resolvable in old workouts, but search and pickers no longer offer them.
const matchesBeforeFamilies=matches;
matches=function(e,q){return !retiredFamilyIds.has(e.id)&&matchesBeforeFamilies(e,q)};
// Lab 10.11.2026 16:55: «разминка» / «разогрев» and «заминка» find the warm-up and cool-down exercises (the library's
// «Разминка» and «Заминка» filters, exerciseSports in library-v2.js) — their names do not contain these words.
const phaseSearchWords={warmup:['разминка','разогрев','warm-up','warmup'],cooldown:['заминка','cool-down','cooldown']};
function phaseSearch(q){const word=String(q||'').trim().toLowerCase().replaceAll('ё','е');if(word.length<4||/\s/.test(word))return null;return Object.keys(phaseSearchWords).find(k=>phaseSearchWords[k].some(w=>w.startsWith(word)||word.startsWith(w.slice(0,6))))||null}
const matchesBeforePhases=matches;
matches=function(e,q){if(matchesBeforePhases(e,q))return true;const phase=phaseSearch(q);return !!(phase&&e?.id&&!retiredFamilyIds.has(e.id)&&typeof exerciseSports==='function'&&exerciseSports(e).includes(phase))};

// Library list: one card per family. It opens on the variant the search named, otherwise on a favourite or the base.
const filteredBeforeFamilies=filteredExercises;
filteredExercises=function(q=query){
 const found=filteredBeforeFamilies(q),favorites=new Set(state.favoriteExercises||[]),out=[],done=new Set();
 for(const e of found){
  const family=exerciseFamily(e.id);
  if(!family){out.push(e);continue}
  if(done.has(family.id))continue;done.add(family.id);
  const members=family.variants.map(v=>found.find(x=>x.id===v.exerciseId)).filter(Boolean);if(!members.length)continue;
  const opened=(!String(q||'').trim()&&members.find(x=>favorites.has(x.id)))||members[0];
  out.push({...opened,name:family.name,familyId:family.id,familyNote:familyVariantCount(family.variants.length,family.variantNoun)});
 }
 return out;
};
const cardBeforeFamilies=exerciseCard;
exerciseCard=function(e,action='exercise-detail'){const html=cardBeforeFamilies(e,action);return e.familyNote?html.replace('<small>',()=>'<small>'+esc(e.familyNote)+' · '):html};

// Pictures: an exercise with its own cover in the media library shows it instead of the sport icon.
// A picture assigned by hand in Icon Studio still wins.
// Lab 10.11.2026 16:55: the placeholder (Daniel sitting on the floor) only replaces the generic fallback — the sneakers
// of «Другое занятие» that an exercise gets when neither its name nor its category matches a picture (own exercises,
// new library entries). Every picture the app finds by name or category stays as it was.
const sportIconBeforeFamilies=exerciseSportIcon;
exerciseSportIcon=function(e){if(sportStudioExerciseIcon(e.id))return sportIconBeforeFamilies(e);if(exerciseMediaUrl(e.id))return 'media:'+e.id;const found=sportIconBeforeFamilies(e);return found===baseSportIcon(37)&&exerciseMediaUrl('placeholder')?'media:placeholder':found};
const iconMarkupBeforeFamilies=sportIconMarkup;
sportIconMarkup=function(name){
 if(typeof name==='string'&&name.startsWith('media:')){const src=exerciseMediaUrl(name.slice(6));if(src)return `<img class="icon sport-icon" src="${sportIconEscape(src)}" alt="" width="64" height="64" loading="lazy" decoding="async">`}
 return iconMarkupBeforeFamilies(name);
};

// The instructions page reports the chosen pill; the card (title, star, History and Add tabs) follows it.
function selectFamilyVariant(id){
 const c=exerciseContext;if(!c||id===(c.variantId||c.id))return;
 c.variantId=id;currentExerciseId=id;
 const heading=c.sheet.querySelector('.exercise-context-title');if(heading)heading.textContent=exercise(id).name;
 const star=c.sheet.querySelector('.favorite-star');if(star)star.outerHTML=exerciseFavoriteButton();
}
const selectTabBeforeFamilies=selectExerciseContextTab;
selectExerciseContextTab=function(key,focus=false){
 const c=exerciseContext;
 if(c&&c.form.isConnected&&c.context==='library'&&c.variantId&&c.variantId!==c.id&&key!=='instructions')return openExerciseContext(c.variantId,key);
 return selectTabBeforeFamilies(key,focus);
};
window.addEventListener('message',e=>{
 const frame=[...document.querySelectorAll('.exercise-frame')].find(f=>f.contentWindow===e.source);
 if(!frame||e.origin!==self.origin||!e.data||typeof e.data.type!=='string')return; // self.origin: also right when the viewer frames the app without an origin
 if(e.data.type==='happy-sport.exercise-height'){const h=Number(e.data.height);if(h>200&&h<6000&&frame.classList.contains('local-instruction-frame'))frame.style.height=Math.ceil(h)+'px';return}
 const c=exerciseContext;if(!c||!c.form.isConnected||c.context!=='library'||!c.panels.instructions.contains(frame))return;
 const id=e.data.exerciseId,family=exerciseFamily(c.id);
 // A card of its own has no pills: «Добавить в тренировку» opens Add for this exercise.
 if(!family&&id===c.id&&exerciseCards.some(x=>x.exerciseId===id)){if(e.data.type==='happy-sport.exercise-add')selectExerciseContextTab('configure',true);return}
 if(!family||!family.variants.some(v=>v.exerciseId===id)||!exercise(id))return;
 if(e.data.type==='happy-sport.exercise-variant')selectFamilyVariant(id);
 else if(e.data.type==='happy-sport.exercise-add'){selectFamilyVariant(id);selectExerciseContextTab('configure',true)}
});
