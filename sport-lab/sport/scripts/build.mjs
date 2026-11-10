import { readFile, mkdir, writeFile, cp } from 'node:fs/promises';
import { loadSeed, loadLibrary, loadMedia, loadMediaPlaceholder, EXERCISE_LIBRARY_URL, EXERCISE_MEDIA_VERSION } from './seed.mjs';

const root = new URL('../', import.meta.url);
const [template, app, license] = await Promise.all([
  readFile(new URL('src/app.template.html', root), 'utf8'),
  readFile(new URL('src/app.js', root), 'utf8'),
  readFile(new URL('PHOSPHOR-LICENSE.txt', root), 'utf8'),
]);
// Update 38.2: exercises/equipment/muscles are embedded from the shared exercise library (see scripts/seed.mjs).
const seed=await loadSeed(),exerciseLibrary=await loadLibrary();
// Lab 10.11.2026: HAPPY_SPORT_LAB=1 builds a copy that carries its shared libraries beside it (relative paths), so it
// can be opened outside GitHub Pages. A release build keeps the permanent /happyamurio/assets/ addresses.
const LAB=process.env.HAPPY_SPORT_LAB==='1',assetBase=LAB?'./assets/':'/happyamurio/assets/';
const EXERCISE_MEDIA_LIBRARY=assetBase+'exercise-media/'+EXERCISE_MEDIA_VERSION+'/';
const exerciseMediaItems=await loadMedia(),exerciseMediaPlaceholder=await loadMediaPlaceholder();
const seedText=JSON.stringify({...seed,exerciseLibrary:{url:EXERCISE_LIBRARY_URL,version:exerciseLibrary.manifest.version,generated:exerciseLibrary.manifest.generated},exerciseFamilies:exerciseLibrary.families,exerciseCards:exerciseLibrary.cards,exerciseMedia:{base:EXERCISE_MEDIA_LIBRARY,items:exerciseMediaItems,placeholder:exerciseMediaPlaceholder&&{...exerciseMediaPlaceholder,cover:EXERCISE_MEDIA_LIBRARY+exerciseMediaPlaceholder.cover}}});
for (const field of ['workouts','measurements','rawMeasurements']) {
  if (seed[field]?.length) throw new Error('Публичная сборка не должна содержать личные записи: '+field);
}
if (!template.includes('__SEED__') || !template.includes('__APP__')) {
  throw new Error('В шаблоне отсутствуют места для данных или приложения.');
}
const read=path=>readFile(new URL(path,root),'utf8');
// Update 38.4: linked-app buttons take the current Day/Meal release directories from shared/apps.json at build time and open a new window.
const happyApps=JSON.parse(await readFile(new URL('../../shared/apps.json',root),'utf8')),releaseDir=app=>happyApps[app].entry.split('/')[0];
const [css,refinementsSource,navIcons,dock,auth,link,cloud]=await Promise.all([
  read('src/refinements.css'),read('src/refinements.js'),read('src/nav-icons.json'),read('src/dock-shape.js'),
  read('src/happy-auth.js'),read('src/sport-link.js'),read('src/sport-cloud.js')
]);
JSON.parse(navIcons);
const planning=await read('src/planning.js'),scheduleModel=await read('src/schedule-model.js'),scheduleCalendarJs=await read('src/schedule-calendar.js'),catalogGroups=await read('src/catalog-groups.js'),planFact=await read('src/plan-fact.js');
// Update 38.1: exercise icons live once in the shared, immutable library assets/sport-icons/v1/ (repo root).
// The catalog is embedded with absolute src paths; no icon files are copied into the release.
const SPORT_ICON_LIBRARY=assetBase+'sport-icons/v1/';
const sportCatalog=JSON.stringify(JSON.parse(await readFile(new URL('../../assets/sport-icons/v1/catalog.json',root),'utf8')).map(item=>({...item,src:SPORT_ICON_LIBRARY+item.src})));
const sportIcons=(await read('src/sport-icons.js')).replace('__SPORT_ICON_CATALOG__',()=>sportCatalog);
const setTime=await read('src/set-time.js');
const rests=await read('src/set-rest.js'),countdown=await read('src/set-countdown.js'),setSwipe=await read('src/set-swipe.js');
const pause=await read('src/workout-pause.js'),exerciseHistory=await read('src/exercise-history.js'),workoutIdentity=await read('src/workout-identity.js');
const measurements=await read('src/measurements-v2.js'),measurementModel=await readShared('measurements-model.js'),measurementShared=await read('src/measurements-shared.js');
const recommendations=await read('data/recommended-templates.json');JSON.parse(recommendations);
const muscles=JSON.stringify(exerciseLibrary.muscles);
const library=(await read('src/library-v2.js')).replace('__RECOMMENDED_TEMPLATES__',()=>recommendations.replaceAll('</','<\\/')).replace('__EXERCISE_MUSCLES__',()=>muscles);
const energyJs=await read('src/energy-widget.js'),energyCss=await read('src/energy-widget.css');
const dataTransfer=await read('src/data-transfer.js'),profileStore=await read('src/profile-store.js'),journalCloud=await read('src/journal-cloud.js'),recoveryVault=await read('src/recovery-vault.js');
// Update 39: the IndexedDB facade loads before the writer lock and before the app script (profile-lock.js awaits SportLocalStore.open()).
const localStore=await read('src/local-store.js'),profileLock=localStore+'\n'+await read('src/profile-lock.js');
const happyLinks=await readShared('happy-links.js'),releaseNotesShared=await readShared('release-notes.js'),releaseNotes=await read('src/release-notes.js'),templatePicker=await read('src/template-picker.js');
const iconStudioBridge=await read('src/icon-studio-bridge.js');
const setPlan=await read('src/set-plan.js'),freeTimerJs=await read('src/free-timer.js');
const quickValueInput=await read('src/quick-value-input.js'),restPill=await read('src/rest-pill.js');
const refinements=refinementsSource.replace('__HAPPY_DAY_DIR__',()=>releaseDir('day')).replace('__HAPPY_MEAL_DIR__',()=>releaseDir('meal'));
const exerciseConfig=await read('src/exercise-config.js'),exercisePlayer=await read('src/exercise-player.js'),experienceCss=await read('src/exercise-experience.css'),timerPrototypeCss=await read('src/timer-prototype.css');
async function readShared(name){
  try{return await readFile(new URL('../shared/'+name,root),'utf8')}
  catch(e){if(e.code!=='ENOENT')throw e;return readFile(new URL('shared/'+name,root),'utf8')}
}
const [sharedCss,sharedJs]=await Promise.all([readShared('happy-ui.css'),readShared('happy-ui.js')]);
const foodCounters=await readShared('food-counters.js'),sportFoodCounters=await read('src/food-counters.js');
const workoutInteractions=await read('src/workout-interactions.js');
const exerciseContext=await read('src/exercise-context.js')+'\n'+await read('src/exercise-families.js'),exerciseContextCss=await read('src/exercise-context.css');
const timerActionWheel=await read('src/timer-action-wheel.js'),timerActionWheelCss=await read('src/timer-action-wheel.css');
const metricField=await read('src/metric-field.js'),metricCss=await read('src/metric-field.css');
const appearanceCss=await readShared('happy-appearance.css');
const appearanceJs=(await Promise.all(['happy-gradients.js','happy-reference-themes.js','happy-appearance.js'].map(readShared))).join('\n');
const readOnlyGuard=await read('src/readonly-guard.js'),readOnlyAuth=await read('src/readonly-auth.js'),readOnlyUI=await read('src/readonly-ui.js'),controlledJournal=await read('src/controlled-journal.js'),controlledSyncUI=await read('src/controlled-sync-ui.js'),controlledLedger=await read('src/controlled-ledger.js'),controlledCAS=await read('src/controlled-cas.js');
const automaticSync=await read('src/automatic-sync.js'),automaticUI=await read('src/automatic-sync-ui.js'),liveTabs=await read('src/live-tabs.js');
const settingsLayout=await read('src/settings-layout.js'),settingsLayoutCss=await read('src/settings-layout.css');
const strongNativeCore=await read('src/strong-native-core.js'),strongNativeMappings=await read('src/strong-native-mappings.js'),strongNativeUI=await read('src/strong-native-ui.js');
// Lab 10.11.2026: a lab copy says so in its title and version line and lists its own note first in the update history;
// links to the neighbouring apps point at the published site, because the lab copy lives elsewhere.
const labNote=LAB?JSON.parse(await readFile(new URL('../LAB-NOTES.json',root),'utf8')):null;
const labText=text=>!LAB?text:text.replaceAll("'Happy Sport · Update 39.1'",()=>JSON.stringify(labNote.label)).replace('const sportReleases=[',()=>'const sportReleases=['+JSON.stringify(labNote.release)+',');
// Some viewers frame a hosted page without storage access (localStorage throws). The lab copy then keeps its journal
// in memory for the visit instead of stopping at «Журнал защищён». Release builds are not touched.
const labStorageShim=`<script>(function(){try{window.localStorage.getItem('happy-lab-probe');return}catch(e){}
function memory(){var m=new Map();return {getItem:function(k){k=String(k);return m.has(k)?m.get(k):null},setItem:function(k,v){m.set(String(k),String(v))},removeItem:function(k){m.delete(String(k))},clear:function(){m.clear()},key:function(i){var keys=Array.from(m.keys());return i<keys.length?keys[i]:null},get length(){return m.size}}}
try{Object.defineProperty(window,'localStorage',{value:memory(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:memory(),configurable:true});Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});window.happyLabMemoryStorage=true}catch(e){}})();</script>`;
const labPage=page=>!LAB?page:page.replace(/<title>[^<]*<\/title>/,()=>'<title>'+labNote.label+'</title>').replaceAll('href="/happyamurio/',()=>'href="https://astamurberlin-rgb.github.io/happyamurio/').replace('<script',()=>labStorageShim+'<script');
const html = labPage(template
  .replace('</style>',()=>css+energyCss+sharedCss+experienceCss+timerPrototypeCss+metricCss+exerciseContextCss+timerActionWheelCss+appearanceCss+settingsLayoutCss+'\n</style>')
  .replace('__READONLY_GUARD__',()=>readOnlyGuard)
  .replace('__PROFILE_LOCK__',()=>profileLock)
  .replace('__SEED__', () => seedText.replaceAll('</', '<\\/'))
  .replace('__APP__', () => [sharedJs,sportIcons,metricField,profileStore,app,dock,refinements.replace('__NAV_ICONS__',()=>navIcons),auth,readOnlyAuth,link,cloud,scheduleModel,scheduleCalendarJs,planning,measurements,library,rests,pause,countdown,setTime,setSwipe,exerciseHistory,workoutIdentity,energyJs,labText(dataTransfer),setPlan,exerciseConfig,exercisePlayer,quickValueInput,restPill,iconStudioBridge,catalogGroups,planFact,measurementModel,measurementShared,freeTimerJs,foodCounters,sportFoodCounters,releaseNotesShared,happyLinks,labText(releaseNotes),templatePicker,workoutInteractions,exerciseContext,timerActionWheel,appearanceJs,recoveryVault,journalCloud,readOnlyUI,controlledJournal,controlledLedger,controlledCAS,controlledSyncUI,automaticSync,automaticUI,liveTabs,strongNativeCore,strongNativeMappings,strongNativeUI,settingsLayout].join('\n'))
  .replace('</body>', () => `<!-- Phosphor Icons license\n${license.replaceAll('\r\n', '\n')}\n--></body>`));
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/index.html', root), html);
await writeFile(new URL('index.html', root), html);
// Lab 10.11.2026: an exercise page takes its text from the family in the library and its pictures from the media
// library; both are embedded here, so the page keeps working offline and never carries its own copy of the text.
// A card of its own (other equipment, families.json «cards») gets a page of its own from the same source: the family's
// phases and breathing, one variant and no pills; the file is named by the exercise id.
const cardPages=exerciseLibrary.cards.map(c=>{const family=exerciseLibrary.families.find(f=>f.id===c.techniqueFrom);return {...family,id:c.exerciseId,name:c.name,baseExerciseId:c.exerciseId,single:true,file:c.exerciseId,variants:[{exerciseId:c.exerciseId,pill:'',name:c.name,grip:c.grip,accent:c.accent,...(c.note?{note:c.note}:{})}],retiredExerciseIds:[]}});
for(const family of [...exerciseLibrary.families.filter(f=>f.page),...cardPages]){
  const source=await read('src/exercises/'+family.page+'.html');
  if(!source.includes('__EXERCISE_FAMILY__')||!source.includes('__EXERCISE_MEDIA__'))throw new Error('Exercise page has no places for family data: '+family.page);
  const pageBase=(LAB?'../assets/':'/happyamurio/assets/')+'exercise-media/'+EXERCISE_MEDIA_VERSION+'/',media={};
  for(const v of family.variants){const item=exerciseMediaItems[v.exerciseId];if(item?.frames)media[v.exerciseId]={frames:Object.fromEntries(Object.entries(item.frames).map(([k,path])=>[k,pageBase+path]))}}
  const inline=value=>JSON.stringify(value).replaceAll('</','<\\/');
  // The page shows the full name of the chosen variant when it is opened on its own.
  const {file,...pageSource}=family,pageFamily={...pageSource,variants:family.variants.map(v=>({...v,fullName:v.name||exerciseLibrary.exercises.find(e=>e.id===v.exerciseId)?.name||family.name}))};
  const page=source.replace('__EXERCISE_FAMILY__',()=>inline(pageFamily)).replace('__EXERCISE_MEDIA__',()=>inline(media));
  for(const directory of ['exercises/','dist/exercises/']){await mkdir(new URL(directory,root),{recursive:true});await writeFile(new URL(directory+(family.file||family.page)+'.html',root),page)}
}
console.log('Sport built.');

// App installation assets travel with both published Sport outputs.
for (const directory of ['', 'dist/']) {
  await cp(new URL('src/app-icons',root),new URL(directory+'app-icons',root),{recursive:true});
  await cp(new URL('src/manifest.webmanifest',root),new URL(directory+'manifest.webmanifest',root));
}
