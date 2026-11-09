import { readFile, mkdir, writeFile, cp } from 'node:fs/promises';
import { loadSeed, loadLibrary, EXERCISE_LIBRARY_URL } from './seed.mjs';

const root = new URL('../', import.meta.url);
const [template, app, license] = await Promise.all([
  readFile(new URL('src/app.template.html', root), 'utf8'),
  readFile(new URL('src/app.js', root), 'utf8'),
  readFile(new URL('PHOSPHOR-LICENSE.txt', root), 'utf8'),
]);
// Update 38.2: exercises/equipment/muscles are embedded from the shared exercise library (see scripts/seed.mjs).
const seed=await loadSeed(),exerciseLibrary=await loadLibrary();
const seedText=JSON.stringify({...seed,exerciseLibrary:{url:EXERCISE_LIBRARY_URL,version:exerciseLibrary.manifest.version,generated:exerciseLibrary.manifest.generated}});
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
const SPORT_ICON_LIBRARY='/happyamurio/assets/sport-icons/v1/';
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
const dataTransfer=await read('src/data-transfer.js'),profileStore=await read('src/profile-store.js'),journalCloud=await read('src/journal-cloud.js'),profileLock=await read('src/profile-lock.js'),recoveryVault=await read('src/recovery-vault.js');
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
const exerciseContext=await read('src/exercise-context.js'),exerciseContextCss=await read('src/exercise-context.css');
const timerActionWheel=await read('src/timer-action-wheel.js'),timerActionWheelCss=await read('src/timer-action-wheel.css');
const metricField=await read('src/metric-field.js'),metricCss=await read('src/metric-field.css');
const appearanceCss=await readShared('happy-appearance.css');
const appearanceJs=(await Promise.all(['happy-gradients.js','happy-reference-themes.js','happy-appearance.js'].map(readShared))).join('\n');
const readOnlyGuard=await read('src/readonly-guard.js'),readOnlyAuth=await read('src/readonly-auth.js'),readOnlyUI=await read('src/readonly-ui.js'),controlledJournal=await read('src/controlled-journal.js'),controlledSyncUI=await read('src/controlled-sync-ui.js'),controlledLedger=await read('src/controlled-ledger.js'),controlledCAS=await read('src/controlled-cas.js');
const automaticSync=await read('src/automatic-sync.js'),automaticUI=await read('src/automatic-sync-ui.js');
const settingsLayout=await read('src/settings-layout.js'),settingsLayoutCss=await read('src/settings-layout.css');
const strongNativeCore=await read('src/strong-native-core.js'),strongNativeMappings=await read('src/strong-native-mappings.js'),strongNativeUI=await read('src/strong-native-ui.js');
const html = template
  .replace('</style>',()=>css+energyCss+sharedCss+experienceCss+timerPrototypeCss+metricCss+exerciseContextCss+timerActionWheelCss+appearanceCss+settingsLayoutCss+'\n</style>')
  .replace('__READONLY_GUARD__',()=>readOnlyGuard)
  .replace('__PROFILE_LOCK__',()=>profileLock)
  .replace('__SEED__', () => seedText.replaceAll('</', '<\\/'))
  .replace('__APP__', () => [sharedJs,sportIcons,metricField,profileStore,app,dock,refinements.replace('__NAV_ICONS__',()=>navIcons),auth,readOnlyAuth,link,cloud,scheduleModel,scheduleCalendarJs,planning,measurements,library,rests,pause,countdown,setTime,setSwipe,exerciseHistory,workoutIdentity,energyJs,dataTransfer,setPlan,exerciseConfig,exercisePlayer,quickValueInput,restPill,iconStudioBridge,catalogGroups,planFact,measurementModel,measurementShared,freeTimerJs,foodCounters,sportFoodCounters,releaseNotesShared,happyLinks,releaseNotes,templatePicker,workoutInteractions,exerciseContext,timerActionWheel,appearanceJs,recoveryVault,journalCloud,readOnlyUI,controlledJournal,controlledLedger,controlledCAS,controlledSyncUI,automaticSync,automaticUI,strongNativeCore,strongNativeMappings,strongNativeUI,settingsLayout].join('\n'))
  .replace('</body>', () => `<!-- Phosphor Icons license\n${license.replaceAll('\r\n', '\n')}\n--></body>`);
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/index.html', root), html);
await writeFile(new URL('index.html', root), html);
await cp(new URL('src/exercises',root),new URL('exercises',root),{recursive:true});
await cp(new URL('src/exercises',root),new URL('dist/exercises',root),{recursive:true});
console.log('Sport built.');

// App installation assets travel with both published Sport outputs.
for (const directory of ['', 'dist/']) {
  await cp(new URL('src/app-icons',root),new URL(directory+'app-icons',root),{recursive:true});
  await cp(new URL('src/manifest.webmanifest',root),new URL(directory+'manifest.webmanifest',root));
}
