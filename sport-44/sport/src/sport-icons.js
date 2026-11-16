/* Supplied Happy Sport PNGs; stable IDs are persisted, never arbitrary image URLs. */
const SPORT_ICONS=__SPORT_ICON_CATALOG__;
function baseSportIcon(number){return SPORT_ICONS.find(i=>i.group==='base'&&i.number===number)?.id}
const sportIconAliases={barbell:1,waves:14,'person-simple':7,'person-simple-walk':11};
let sportStudioState={placements:{},overrides:{},custom:[]},sportStudioMedia={};
function sportIconId(name){return sportIconAliases[name]?baseSportIcon(sportIconAliases[name]):name}
function sportIconSafeUrl(value){
 if(typeof value!=='string'||!value.trim())return '';
 if(value.length<=7500000&&/^data:image\/(?:png|webp|jpeg);base64,[a-z0-9+/=]+$/i.test(value))return value;
 try{const url=new URL(value,location.href);return url.protocol==='https:'||(url.protocol==='http:'&&url.origin===location.origin)?url.href:''}catch{return ''}
}
function sportIconEscape(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function sportStudioAsset(id,seen=new Set()){
 if(!id||seen.has(id))return '';seen.add(id);
 const item=SPORT_ICONS.find(i=>i.id===id||(Array.isArray(i.aliases)&&i.aliases.includes(id))),custom=(sportStudioState.custom||[]).find(i=>i?.id===id);
 const oldAlias=item?.aliases?.find(alias=>sportStudioState.overrides?.[alias]);
 const overrideId=sportStudioState.overrides?.[id]?id:oldAlias||id,override=sportStudioState.overrides?.[overrideId];let replacement='';
 if(override?.kind==='upload')replacement=sportIconSafeUrl(sportStudioMedia['replace:'+overrideId]);
 else if(override?.kind==='url')replacement=sportIconSafeUrl(override.url);
 else if(override?.kind==='catalog')replacement=sportStudioAsset(override.sourceId,seen);
 if(replacement)return replacement;
 if(item)return item.src+'?v=36.3';
 if(custom)return sportIconSafeUrl(sportStudioMedia[id]||custom.src);
 return '';
}
function sportStudioPlacement(key){
 const placement=sportStudioState.placements?.[key];if(!placement)return '';
 if(placement.kind==='catalog')return sportStudioAsset(placement.id);
 if(placement.kind==='url')return sportIconSafeUrl(placement.url);
 if(placement.kind==='upload')return sportIconSafeUrl(sportStudioMedia['placement:'+key]);
 return '';
}
function sportStudioCategoryIcon(name){const id=sportIconId(name),key='category:'+id;return sportStudioPlacement(key)?'studio:'+key:name}
function sportStudioExerciseIcon(id){const key='exercise:'+id;return sportStudioPlacement(key)?'studio:'+key:undefined}
function sportIconMarkup(name){
 const source=typeof name==='string'&&name.startsWith('studio:')?sportStudioPlacement(name.slice(7)):sportStudioAsset(sportIconId(name));
 return source?`<img class="icon sport-icon" src="${sportIconEscape(source)}" alt="" width="64" height="64" loading="lazy" decoding="async">`:'';
}
function workoutIconOptions(kind,selected){const option=(id,label,title=label)=>`<button type="button" data-action="choose-workout-icon" data-icon="${id}" aria-label="${title}" title="${title}" aria-pressed="${id===selected}">${icon(id||kindIcon(kind))}<span>${label}</span></button>`;return option('','По виду спорта')+['base','people'].map(group=>`<h3 class="icon-group-title">${group==='base'?'Виды спорта и оборудование':'Варианты людей'}</h3>`+SPORT_ICONS.filter(i=>i.group===group).map(i=>option(i.id,i.label,i.title)).join('')).join('')}
// Only infer a picture when the title clearly names a sport. Manual choices
// remain authoritative and unrecognised names retain their existing fallback.
function namedSportIcon(value){
 const text=String(value||'').toLowerCase().replaceAll('ё','е');
 const matches=[
  [/биатлон/,40],[/стрельб.*лук|лучн|archery/,38],[/верхов|конн.{0,12}спорт|езд.{0,8}лошад|equestrian/,39],
  [/жим ногами|leg.press/,41],[/рыбал|рыбная ловля|fishing/,42],[/яхт|парусн.{0,12}спорт|sailing/,43],
  [/фигурн.{0,12}катан|коньк|figure.skat/,44],[/ролик|роллер|inline.skat/,30],
  [/бег.{0,15}дорож|treadmill/,45],[/настольн.{0,12}теннис|table.tennis/,23],
  [/бадминтон/,24],[/падел|сквош|padel|squash/,25],[/теннис|tennis/,22],
  [/адаптивн|коляск|wheelchair/,35],[/волейбол/,21],[/баскетбол/,20],[/футбол/,19],
  [/сноуборд|snowboard/,29],[/лыж|skiing/,28],[/скалолаз|climbing/,27],[/бокс|boxing/,26],
  [/серф|surfing/,32],[/каяк|каноэ|kayak/,31],[/танц|danc/,33],[/поход|треккинг|hiking/,34],
  [/плаван|swimming/,14],[/йога|пилатес|yoga|pilates/,16],[/растяж|stretch/,15],
  [/аэробик|aerobic/,17],[/велосипед|велоспорт|cycling/,12],[/бег|running/,10],[/ходьб|walking/,11],
  [/отжим|push.up/,9],[/турник|подтяг|pull.up/,7]
 ];
 const match=matches.find(([re])=>re.test(text));
 return match?baseSportIcon(match[1]):undefined;
}
function exerciseSportIcon(e){const assigned=sportStudioExerciseIcon(e.id);if(assigned)return assigned;const text=((e.name||'')+' '+(e.category||'')+' '+(Array.isArray(e.equipment)?e.equipment.join(' '):e.equipment||'')).toLowerCase();if(e.id==='machine-leg-press'||/жим ногами/.test(text))return sportStudioCategoryIcon(baseSportIcon(41));const matches=[[/плаван/,14],[/растяж|мобил/,15],[/йога|пилатес/,16],[/гантел/,2],[/штанг/,1],[/гир[яеи]/,3],[/блок|кроссовер/,4],[/резин|эспандер/,5],[/брусь/,8],[/подтяг|турник|перекладин/,7],[/тренаж[её]р/,6],[/велосипед/,12],[/эллип/,13],[/бег/,10],[/ходьб/,11],[/скакал|размин/,18],[/отжим/,9]];return sportStudioCategoryIcon(baseSportIcon(matches.find(([re])=>re.test(text))?.[1]||37))}
