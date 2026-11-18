/* Сборка Sport — одна команда из корня репозитория: node sport-NN/sport/scripts/build.mjs
 * Склеивает исходники src/ в одну страницу, встраивает справочник упражнений и общие файлы и пишет результат один раз,
 * в папку выпуска: index.html, exercises/, app-icons/, manifest.webmanifest. Промежуточных копий нет (16.11.2026).
 * Проверки берут собранное из памяти: import {files} from './build.mjs' — при импорте на диск ничего не пишется. */
import { readFile, mkdir, writeFile, cp } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
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
const [css,refinementsSource,navIcons,dock]=await Promise.all([
  read('src/refinements.css'),read('src/refinements.js'),read('src/nav-icons.json'),read('src/dock-shape.js')
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
// Sport 43: экран замеров общий (shared/happy-measurements.js); здесь только его подключение.
const measurementsScreen=await read('src/measurements-screen.js'),measurementsScreenCss=await read('src/measurements-screen.css');
const recommendations=await read('data/recommended-templates.json');JSON.parse(recommendations);
const muscles=JSON.stringify(exerciseLibrary.muscles);
const library=(await read('src/library-v2.js')).replace('__RECOMMENDED_TEMPLATES__',()=>recommendations.replaceAll('</','<\\/')).replace('__EXERCISE_MUSCLES__',()=>muscles);
const energyJs=await read('src/energy-widget.js'),energyCss=await read('src/energy-widget.css');
const dataTransfer=await read('src/data-transfer.js');
// Sport 42: запуск — общий вход, общий модуль хранения и документы Sport; приложение стартует после них (sport-boot.js).
const sportDocs=await read('src/sport-docs.js'),sportData=await read('src/sport-data.js'),sportSignIn=await read('src/sport-signin.js');
// Sport 43: форматы витрины — общие файлы: сводка и плановые занятия, замеры тела, свитчи связи.
// Sport 43.2: рамка выбора только с клавиатуры и без полос прокрутки — общий файл shared/happy-input.js, один для трёх приложений.
// Sport 44 (прототип Sport v2): первый экран, вход, профиль и цели — общие экраны shared/happy-screens.js, happy-welcome.js,
// happy-person.js, happy-goals.js; связь со Sport — src/sport-account.js. Они — часть запуска: первый экран появляется сразу.
const boot=[await readShared('happy-input.js'),await readShared('happy-account.js'),await readShared('happy-store.js'),await readShared('happy-sport-summary.js'),await readShared('happy-measurements.js'),await readShared('happy-app-links.js'),await readShared('happy-food.js'),
 await readShared('happy-screens.js'),await readShared('happy-welcome.js'),await readShared('happy-person.js'),await readShared('happy-goals.js'),sportDocs,
 // Лаборатория (ветка sport-lab-44, 16.11.2026): вместо sport-boot.js — lab-boot.js (вход «Лаборатория», без сервера, пример
 // данных), после sport-account.js — lab-head.js (строка внизу настроек). Выпуск берёт только sport-boot.js.
 await read(LAB?'src/lab-boot.js':'src/sport-boot.js'),await read('src/sport-account.js'),...(LAB?[await read('src/lab-head.js')]:[])].join('\n');
// Лаборатория: адреса соседей уже вписаны сборкой — apps.json с сайта не запрашивается.
const happyLinks=(await readShared('happy-links.js')).replace(LAB?'if(!root.fetch||!root.document)':'\0',()=>'if(true)'),releaseNotesShared=await readShared('release-notes.js'),releaseNotes=await read('src/release-notes.js'),templatePicker=await read('src/template-picker.js');
const iconStudioBridge=await read('src/icon-studio-bridge.js');
const setPlan=await read('src/set-plan.js'),freeTimerJs=await read('src/free-timer.js');
const quickValueInput=await read('src/quick-value-input.js'),restPill=await read('src/rest-pill.js');
// Кнопки соседей ведут на постоянные адреса /happyamurio/day/ и /happyamurio/meal/ (16.11.2026): номера выпусков Day и Meal
// в страницу не вшиваются, после их выпуска Sport пересобирать не нужно. Текущую папку подставляет shared/happy-links.js.
const refinements=refinementsSource;
const exerciseConfig=await read('src/exercise-config.js'),exercisePlayer=await read('src/exercise-player.js'),experienceCss=await read('src/exercise-experience.css'),timerPrototypeCss=await read('src/timer-prototype.css');
async function readShared(name){
  try{return await readFile(new URL('../shared/'+name,root),'utf8')}
  catch(e){if(e.code!=='ENOENT')throw e;return readFile(new URL('shared/'+name,root),'utf8')}
}
// 17.11.2026: оформление Happy (AGENTS.md, раздел 4) — последним слоем.
const designRulesCss=await read('src/design-rules.css');
const sharedCss=await readShared('happy-ui.css'),measurementsCss=await readShared('happy-measurements.css'),screensCss=await readShared('happy-screens.css');
// Sport 41: связь приложений — общий модуль shared/happy-app-links.js и свитчи Sport (src/app-links.js)
const sportAppLinks=await read('src/app-links.js');
const sportFoodCounters=await read('src/food-counters.js');
const workoutInteractions=await read('src/workout-interactions.js');
const exerciseContext=await read('src/exercise-context.js')+'\n'+await read('src/exercise-families.js'),exerciseContextCss=await read('src/exercise-context.css');
const timerActionWheel=await read('src/timer-action-wheel.js'),timerActionWheelCss=await read('src/timer-action-wheel.css');
const metricField=await read('src/metric-field.js'),metricCss=await read('src/metric-field.css');
const appearanceCss=await readShared('happy-appearance.css');
const appearanceJs=(await Promise.all(['happy-gradients.js','happy-reference-themes.js','happy-appearance.js'].map(readShared))).join('\n');
const settingsLayout=await read('src/settings-layout.js'),settingsLayoutCss=await read('src/settings-layout.css');
// Lab 10.11.2026 18:50: audit simplifications (decisions «Да» on the audit page), loaded after everything else.
const auditSimplify=await read('src/audit-simplify.js'),auditSimplifyCss=await read('src/audit-simplify.css');
// Sport 43.3 (лаборатория 15.11.2026): слои поверх прежних, по порядку — редактор тренировки (✓ вверху, удаления свайпом,
// один перерыв на упражнение), подход одной строкой (кружок с кольцом перерыва, ▶ у упражнений на время), журнал
// (лист занятия, пометки «Пропущено» / «Перенесено», лента с Meal).
const templateEditor=await read('src/template-editor.js'),templateEditorCss=await read('src/template-editor.css');
// Аудит единообразия 18.11.2026: листы — закрытие, шаг назад, «Правки не сохранены · Вернуть». Стоит последним.
const sheetRules=await read('src/sheet-rules.js');
// Аудит единообразия 18.11.2026: удаление — свайп влево, «Удалить» внизу карточки, свои тренировки в Настройках.
const deleteRules=await read('src/delete-rules.js');
// Аудит единообразия 18.11.2026: большой таймер — из настроек упражнения, круги = подходы, «Сохранить» отмечает подходы.
const timerRules=await read('src/timer-rules.js');
const setLine=await read('src/set-line.js'),setLineCss=await read('src/set-line.css');
const sportJournal=await read('src/sport-journal.js'),sportJournalCss=await read('src/sport-journal.css');
const strongNativeCore=await read('src/strong-native-core.js'),strongNativeMappings=await read('src/strong-native-mappings.js'),strongNativeUI=await read('src/strong-native-ui.js');
// Lab 10.11.2026: a lab copy says so in its title and version line and lists its own note first in the update history;
// links to the neighbouring apps point at the published site, because the lab copy lives elsewhere.
const labNote=LAB?JSON.parse(await readFile(new URL('../LAB-NOTES.json',root),'utf8')):null;
const labText=text=>!LAB?text:text.replaceAll("'Happy Sport · Update 44.4'",()=>JSON.stringify(labNote.label)).replace('const sportReleases=[',()=>'const sportReleases=['+JSON.stringify(labNote.release)+',');
// Some viewers frame a hosted page without storage access (localStorage throws). The lab copy then keeps its journal
// in memory for the visit instead of stopping at «Журнал защищён». Release builds are not touched.
const labStorageShim=`<script>(function(){try{window.localStorage.getItem('happy-lab-probe');return}catch(e){}
function memory(){var m=new Map();return {getItem:function(k){k=String(k);return m.has(k)?m.get(k):null},setItem:function(k,v){m.set(String(k),String(v))},removeItem:function(k){m.delete(String(k))},clear:function(){m.clear()},key:function(i){var keys=Array.from(m.keys());return i<keys.length?keys[i]:null},get length(){return m.size}}}
try{Object.defineProperty(window,'localStorage',{value:memory(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:memory(),configurable:true});Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});window.happyLabMemoryStorage=true}catch(e){}})();</script>`;
// Лаборатория: полоски наверху нет (Астамур 16.11.2026: «портит интерфейс»); к серверу страница не обращается (connect-src 'none').
const labBar='';
const labPage=page=>!LAB?page:page.replace(/connect-src [^;]*;/,()=>"connect-src 'none';").replace('<body><div class="bg"></div>',()=>'<body>'+labBar+'<div class="bg"></div>').replace(/<title>[^<]*<\/title>/,()=>'<title>'+labNote.label+'</title>').replaceAll('href="/happyamurio/',()=>'href="https://astamurberlin-rgb.github.io/happyamurio/').replace('<script',()=>labStorageShim+'<script');
const html = labPage(template
  .replace('</style>',()=>css+energyCss+sharedCss+experienceCss+timerPrototypeCss+metricCss+exerciseContextCss+timerActionWheelCss+appearanceCss+settingsLayoutCss+auditSimplifyCss+templateEditorCss+setLineCss+sportJournalCss+measurementsCss+measurementsScreenCss+screensCss+designRulesCss+'\n</style>')
  .replace('__BOOT__',()=>boot)
  .replace('__SEED__', () => seedText.replaceAll('</', '<\\/'))
  .replace('__APP__', () => [sportAppLinks,sportIcons,metricField,sportData,app,dock,refinements.replace('__NAV_ICONS__',()=>navIcons),scheduleModel,scheduleCalendarJs,planning,library,rests,pause,countdown,setTime,setSwipe,exerciseHistory,workoutIdentity,energyJs,labText(dataTransfer),setPlan,exerciseConfig,exercisePlayer,quickValueInput,restPill,iconStudioBridge,catalogGroups,planFact,freeTimerJs,sportFoodCounters,releaseNotesShared,happyLinks,labText(releaseNotes),templatePicker,workoutInteractions,exerciseContext,timerActionWheel,appearanceJs,strongNativeCore,strongNativeMappings,strongNativeUI,sportSignIn,settingsLayout,auditSimplify,templateEditor,setLine,sportJournal,measurementsScreen,timerRules,deleteRules,sheetRules].join('\n'))
  .replace('</body>', () => `<!-- Phosphor Icons license\n${license.replaceAll('\r\n', '\n')}\n--></body>`));
// Всё собранное: путь внутри папки выпуска → текст.
const files=new Map([['index.html',html]]);
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
  files.set('exercises/'+(family.file||family.page)+'.html',page);
}
export {files};
// Запущено командой — записать в папку выпуска (лаборатория — в lab/) вместе со значками и файлом установки.
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const out=new URL(LAB?'../lab/':'../',root);
  for(const [path,text] of files){const to=new URL(path,out);await mkdir(new URL('./',to),{recursive:true});await writeFile(to,text)}
  await cp(new URL('src/app-icons',root),new URL('app-icons',out),{recursive:true});
  await cp(new URL('src/manifest.webmanifest',root),new URL('manifest.webmanifest',out));
  console.log('Sport built: '+[...files.keys()].join(', ')+(LAB?' (лаборатория, lab/)':''));
}
