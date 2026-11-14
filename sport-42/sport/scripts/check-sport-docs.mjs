/* Sport 42 · раскладка дневника на документы общего модуля (src/sport-docs.js) и обратно.
   Что смотрит: дневник собирается обратно без потерь; каждая тренировка, замер, упражнение и нажатие счётчика —
   отдельная запись (правки разных записей с двух устройств не мешают друг другу); сводка для Day и Meal — без
   демо-тренировок; названия документов не совпадают со старыми строками облака; служебное прежних выпусков не хранится. */
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
const c=createContext({});
runInContext(await readFile(new URL('../src/sport-docs.js',import.meta.url),'utf8'),c);
const D=runInContext('SportDocs',c);
const plain=x=>JSON.parse(JSON.stringify(x));
const asDocs=projected=>{const out={};for(const [name,map] of projected)out[name]=[...map].map(([id,value])=>({id,value:plain(value)}));return out};

for(const old of ['journal','link','counters','supplements','measurements'])assert.ok(!D.NAMES.includes(old),'старое название: '+old);
assert.deepEqual(plain(D.NAMES),['workouts','active','exercises','routines','schedule','body','tallies','prefs','summary']);

const state={version:1,
 workouts:[{id:'w1',title:'Зал',kind:'gym',start:'2026-11-14T10:00',end:'2026-11-14T11:00',duration:3600,exercises:[{id:'barbell-row',name:'Тяга',sets:[{weight:60,reps:8,done:true}]}]},
           {id:'demo',title:'Демо',kind:'gym',start:'2026-11-13T10:00',end:'2026-11-13T10:30',duration:1800,demo:true,exercises:[]}],
 active:{id:'local-1',title:'Сейчас',start:'2026-11-14T18:00',exercises:[]},
 measurements:[{date:'2026-11-01',values:{waist:80}},{date:'2026-11-08',values:{waist:79}}],
 measurementTrash:[{id:'t1',record:{date:'2026-10-01',values:{}}}],
 customExercises:[{id:'custom-1',name:'Моя тяга',aliases:[],equipment:[],profile:'load'}],
 exerciseOverrides:{'barbell-row':{id:'barbell-row',name:'Тяга штанги'}},exerciseNotes:{'barbell-row':'спина ровная'},
 favoriteExercises:['barbell-row'],templates:[{id:'t-a',title:'А',items:[]},{id:'t-b',title:'Б',items:[]}],templateOverrides:{},
 schedules:[{id:'s1',templateId:'t-a',mode:'weekly',days:[1],startDate:'2026-11-01',time:'18:00',timeZone:'Europe/Moscow',minutes:60}],
 occurrences:{'s1:2026-11-16':{id:'s1:2026-11-16',scheduleId:'s1',date:'2026-11-16',start:'2026-11-16T18:00'}},
 customCounters:[{id:'c1',title:'Вода',unit:'стакан',events:[{id:'e1',date:'2026-11-14',at:1},{id:'e2',date:'2026-11-14',at:2}]}],
 energy:{burn:0,intake:0,steps:0,training:0,minutes:0},demoPulse:false,freeTimer:null,appLinks:[{pair:'meal|sport',on:false,at:5,by:'sport'}],
 sportOwner:'old-owner',sportLink:{v:1,records:[]},foodCounters:{v:1}};
const projected=D.project(state),docs=asDocs(projected);
const ids=name=>docs[name].map(r=>r.id).sort();

// обратно без потерь (служебное прежних выпусков не хранится)
const back=plain(D.build(docs)),expected=plain(state);delete expected.sportOwner;delete expected.sportLink;delete expected.foodCounters;
assert.deepEqual(back,expected);
// каждая тренировка, замер, упражнение, шаблон и нажатие — отдельная запись своего документа
assert.deepEqual(ids('workouts'),['workouts','workouts~demo','workouts~w1']);
assert.deepEqual(ids('active'),['active']);
assert.ok(ids('body').includes('measurements~2026-11-01')&&ids('body').includes('measurements~2026-11-08'));
assert.ok(ids('exercises').includes('customExercises~custom-1')&&ids('exercises').includes('exerciseNotes~barbell-row'));
assert.ok(ids('routines').includes('templates~t-a'));
assert.ok(ids('schedule').includes('occurrences~s1:2026-11-16'));
assert.deepEqual(ids('tallies'),['customCounters','customCounters~c1','tap~e1','tap~e2']);
assert.ok(ids('prefs').includes('appLinks')&&!ids('prefs').some(id=>/sportOwner|sportLink|foodCounters|version/.test(id)));
// сводка для Day и Meal: только настоящие тренировки, без подходов
assert.deepEqual(docs.summary,[{id:'w1',value:{title:'Зал',kind:'gym',start:'2026-11-14T10:00',end:'2026-11-14T11:00',duration:3600,energyKcal:null}}]);

// нажатия на одном счётчике с двух телефонов: у каждого своя запись — после обмена остаются оба
const phoneA=plain(state),phoneB=plain(state);
phoneA.customCounters[0].events.push({id:'eA',date:'2026-11-14',at:10});
phoneB.customCounters[0].events.push({id:'eB',date:'2026-11-14',at:11});
const union=(...lists)=>{const m=new Map();for(const l of lists)for(const r of l)m.set(r.id,r);return [...m.values()]};
const da=asDocs(D.project(phoneA)),db=asDocs(D.project(phoneB));
const merged=D.build(Object.fromEntries(D.NAMES.map(n=>[n,union(da[n],db[n])])));
assert.deepEqual(plain(merged.customCounters[0].events.map(e=>e.id)),['e1','e2','eA','eB']);
// разные тренировки с двух телефонов — обе
phoneA.workouts.push({...state.workouts[0],id:'wA'});phoneB.workouts.push({...state.workouts[0],id:'wB'});
const m2=D.build(Object.fromEntries(D.NAMES.map(n=>[n,union(asDocs(D.project(phoneA))[n],asDocs(D.project(phoneB))[n])])));
assert.deepEqual(plain(m2.workouts.map(w=>w.id)).sort(),['demo','w1','wA','wB']);

// пустой дневник — пустые списки, без текущей тренировки
assert.deepEqual(plain(D.build({})),plain(D.blank()));
// значение неизвестного вида не ломает сборку
assert.deepEqual(plain(D.build({workouts:[{id:'workouts',value:{t:'list'}},{id:'workouts~x',value:'испорчено'}]}).workouts),[]);
console.log('Passed: Sport documents — lossless round trip, one record per workout/measurement/exercise/tap, summary without demo, new document names.');
