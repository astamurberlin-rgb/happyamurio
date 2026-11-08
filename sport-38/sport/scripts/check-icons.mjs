import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createContext,runInContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const catalog=JSON.parse(await read('src/sport-icons/catalog.json'));
const studio=JSON.parse(await read('../prototypes/happy-icon-studio-manifest.json'));
for(const p of studio.planned.filter(x=>x.catalogId))assert.ok(catalog.find(x=>x.id===p.catalogId)?.aliases?.includes(p.id),'Missing Studio alias: '+p.id);
const context=createContext({URL,location:{href:'https://example.test/sport/',origin:'https://example.test'},SEED:{icons:{'calendar-blank':'calendar',waves:'waves',barbell:'barbell'}},kindIcon:k=>({sea:'waves',bars:'person-simple',gym:'barbell'}[k]||'barbell')});
runInContext((await read('src/sport-icons.js')).replace('__SPORT_ICON_CATALOG__',JSON.stringify(catalog)),context);
const identity=await read('src/workout-identity.js');
runInContext(identity.slice(0,identity.indexOf('function workoutIdentityForm')),context);
const result=expr=>runInContext(expr,context);

for(const [name,id] of [
 ['Стрельба из лука','sport:38_archery'],['Верховая езда','sport:39_equestrian'],
 ['Биатлон на лыжах','sport:40_biathlon'],['Жим ногами','sport:41_leg_press'],
 ['Фигурное катание на коньках','sport:44_figure_skating'],['Ролики','sport:30_skates_rollers'],
 ['Бег на дорожке','sport:45_treadmill'],['Настольный теннис','sport:23_table_tennis'],
 ['Баскетбол на коляске','sport:35_adaptive_sport'],['Теннис','sport:22_tennis']
])assert.equal(result(`namedSportIcon(${JSON.stringify(name)})`),id,name);
assert.equal(result("exerciseSportIcon({id:'machine-leg-press',name:'Жим ногами',category:'Тренажёры'})"),'sport:41_leg_press');
assert.equal(result("workoutIconName({title:'Футбол',kind:'gym'})"),'sport:19_football');
assert.equal(result("workoutIconName({title:'Футбол',icon:'sport:10_running_f_dark',kind:'gym'})"),'sport:10_running_f_dark');
assert.equal(result("workoutIconName({title:'Моя тренировка',kind:'sea'})"),'waves');
assert.equal(result("workoutIconName({title:'Моя тренировка',kind:'sea'},true)"),'calendar-blank');
assert.ok(result("sportIconMarkup('sport:38_archery')").includes('38_archery.png?v=36.3'));
assert.equal(result("sportIconSafeUrl('')"),'');
// Studio's exercise assignments win over category suggestions; a person's
// explicit workout icon remains their own choice.
runInContext("sportStudioState.placements={'exercise:machine-leg-press':{kind:'catalog',id:'sport:22_tennis'},'category:sport:19_football':{kind:'catalog',id:'sport:21_volleyball'}}",context);
assert.equal(result("exerciseSportIcon({id:'machine-leg-press',name:'Жим ногами'})"),'studio:exercise:machine-leg-press');
assert.ok(result("sportIconMarkup(exerciseSportIcon({id:'machine-leg-press',name:'Жим ногами'}))").includes('22_tennis.png'));
assert.equal(result("workoutIconName({title:'Футбол',kind:'gym'})"),'studio:category:sport:19_football');
assert.ok(result("sportIconMarkup(workoutIconName({title:'Футбол',kind:'gym'}))").includes('21_volleyball.png'));
assert.equal(result("workoutIconName({title:'Футбол',icon:'sport:10_running_f_dark',kind:'gym'})"),'sport:10_running_f_dark');
runInContext("sportStudioState.placements={'exercise:machine-leg-press':{kind:'upload'}};sportStudioMedia={'placement:exercise:machine-leg-press':'data:image/png;base64,AA=='}",context);
assert.ok(result("sportIconMarkup(exerciseSportIcon({id:'machine-leg-press'}))").includes('data:image/png;base64,AA=='));
runInContext("sportStudioState.placements={'category:sport:30_skates_rollers':{kind:'catalog',id:'plan:aiko-rollers'}}",context);
assert.ok(result("sportIconMarkup(sportStudioCategoryIcon('sport:30_skates_rollers'))").includes('30_skates_rollers.png'));
runInContext("sportStudioState.overrides={'plan:aiko-rollers':{kind:'upload'}};sportStudioMedia={'replace:plan:aiko-rollers':'data:image/png;base64,AA=='}",context);
assert.ok(result("sportIconMarkup('sport:30_skates_rollers')").includes('data:image/png;base64,AA=='));
runInContext("sportStudioState.placements={'exercise:machine-leg-press':{kind:'url',url:'javascript:alert(1)'}}",context);
assert.equal(result("exerciseSportIcon({id:'machine-leg-press'})"),'sport:41_leg_press');
const app=await read('src/app.js');
const templates=createContext({state:{templateOverrides:{},templates:[]}});
runInContext(app.slice(app.indexOf('const baseTemplates='),app.indexOf('function renderTemplates()')),templates);
assert.deepEqual(JSON.parse(runInContext("JSON.stringify(templates().map(t=>t.id))",templates)),['sea','gym','bars','football','tennis']);
runInContext("state.templates.push({id:'my-football',title:'Футбол',items:[]})",templates);
assert.equal(runInContext("templates().filter(t=>t.title==='Футбол').length",templates),1);
runInContext("state.templateOverrides.tennis={id:'tennis',title:'Теннис',favorite:false,items:[]}",templates);
assert.equal(runInContext("templates().find(t=>t.id==='tennis').favorite",templates),false);
console.log('Passed: activity icons, manual choices, planned fallback and leg press.');
