/* Sport 42–43 · раскладка дневника на документы общего модуля (src/sport-docs.js) и обратно.
   Что смотрит: дневник собирается обратно без потерь; каждая тренировка, упражнение и нажатие счётчика —
   отдельная запись (правки разных записей с двух устройств не мешают друг другу); сводка для Day и Meal — без
   демо-тренировок, в общем формате витрины; названия документов не совпадают со старыми строками облака; служебное
   прежних выпусков не хранится. Sport 43: замеры тела, свитчи связи и плановые занятия раскладка не пишет — их
   документы витрины пишут общие файлы (shared/happy-measurements.js, happy-app-links.js, happy-sport-summary.js);
   место записи в списке не меняется при удалении и вставке соседей — удаление тренировки на одном устройстве не
   затирает правку другой тренировки на втором и не возвращает удалённое им. */
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
const c=createContext({});c.globalThis=c;
runInContext(await readFile(new URL('../../shared/happy-store.js',import.meta.url),'utf8'),c);
runInContext(await readFile(new URL('../../shared/happy-sport-summary.js',import.meta.url),'utf8'),c);
runInContext(await readFile(new URL('../src/sport-docs.js',import.meta.url),'utf8'),c);
const S=runInContext('HappySportSummary',c);
const D=runInContext('SportDocs',c);
const plain=x=>JSON.parse(JSON.stringify(x));
const asDocs=projected=>{const out={};for(const [name,map] of projected)out[name]=[...map].map(([id,value])=>({id,value:plain(value)}));return out};

for(const old of ['journal','link','counters','supplements','measurements'])assert.ok(!D.NAMES.includes(old),'старое название: '+old);
assert.deepEqual(plain(D.NAMES),['workouts','active','exercises','routines','schedule','tallies','prefs','summary']);
assert.deepEqual(plain(D.OWN),['workouts','active','exercises','routines','schedule','tallies','prefs','summary','body','plans'],'все свои документы Sport для общего модуля');

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

// обратно без потерь (служебное прежних выпусков не хранится; замеры и свитчи связи раскладка не пишет и не собирает)
const back=plain(D.build(docs)),expected=plain(state);delete expected.sportOwner;delete expected.sportLink;delete expected.foodCounters;
delete expected.measurementTrash;delete expected.appLinks;expected.measurements=[];
assert.deepEqual(back,expected);
assert.ok(!('body' in docs)&&!('plans' in docs),'документы витрины пишут общие файлы, не раскладка');
assert.ok(!Object.values(docs).some(list=>list.some(r=>/^measurement|^appLinks/.test(r.id))),'замеры и свитчи связи не попадают в другие документы');
// прежняя запись свитчей в prefs (Sport 42) и чужие записи замеров в сборку дневника не попадают
const stale=plain(D.build({...docs,prefs:docs.prefs.concat([{id:'appLinks',value:{t:'value',v:[{pair:'meal|sport',on:false,at:5,by:'sport'}]}}]),body:[{id:'measurements',value:{t:'list'}},{id:'measurements~2026-11-01',value:{i:0,v:{date:'2026-11-01',values:{waist:80}}}}]}));
assert.deepEqual(stale,expected);
// каждая тренировка, замер, упражнение, шаблон и нажатие — отдельная запись своего документа
assert.deepEqual(ids('workouts'),['workouts','workouts~demo','workouts~w1']);
assert.deepEqual(ids('active'),['active']);
assert.ok(ids('exercises').includes('customExercises~custom-1')&&ids('exercises').includes('exerciseNotes~barbell-row'));
assert.ok(ids('routines').includes('templates~t-a'));
assert.ok(ids('schedule').includes('occurrences~s1:2026-11-16'));
assert.deepEqual(ids('tallies'),['customCounters','customCounters~c1','tap~e1','tap~e2']);
assert.ok(!ids('prefs').some(id=>/sportOwner|sportLink|foodCounters|version|appLinks/.test(id)));
// сводка для Day и Meal: только настоящие тренировки, без подходов
assert.deepEqual(docs.summary,[{id:'w1',value:{title:'Зал',kind:'gym',start:'2026-11-14T10:00',end:'2026-11-14T11:00',duration:3600,energyKcal:null}}]);
assert.deepEqual(plain(S.workouts(docs.summary)),[{id:'w1',title:'Зал',kind:'gym',start:'2026-11-14T10:00',end:'2026-11-14T11:00',duration:3600,energyKcal:null}],'сводку читает общий файл витрины');

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

// Места в списке. Устройство пишет только изменившиеся записи (как sport-data.js); у записи остаётся поздняя правка.
{
 const cloud={records:new Map(),clock:0};
 function device(){
  const local=new Map();let last=new Map();
  const self={state:null,writes:0,
   load(){const docs={};for(const [key,r] of local){if(r.deleted)continue;const cut=key.indexOf('\n');(docs[key.slice(0,cut)]||(docs[key.slice(0,cut)]=[])).push({id:key.slice(cut+1),value:plain(r.value)})}
    last=new Map(D.NAMES.map(n=>[n,new Map((docs[n]||[]).map(r=>[r.id,{text:JSON.stringify(r.value),i:r.value?.i}]))]));self.state=D.build(docs)},
   save(){
    for(const [name,map] of D.project(self.state,(n,id)=>last.get(n)?.get(id)?.i)){
     const before=last.get(name)||new Map(),seen=new Map();
     for(const [id,value] of map){const text=JSON.stringify(value);seen.set(id,{text,i:value?.i});if(before.get(id)?.text!==text){local.set(name+'\n'+id,{rev:++cloud.clock,value:plain(value)});self.writes++}}
     for(const id of before.keys())if(!map.has(id)){local.set(name+'\n'+id,{rev:++cloud.clock,deleted:true});self.writes++}
     last.set(name,seen);
    }},
   sync(){for(const [key,r] of local){const there=cloud.records.get(key);if(!there||r.rev>there.rev)cloud.records.set(key,r)}
    for(const [key,r] of cloud.records){const here=local.get(key);if(!here||r.rev>here.rev)local.set(key,r)}self.load()}};
  self.load();return self;
 }
 const phone=device(),computer=device(),workout=n=>({id:'w'+n,title:'Тренировка '+n,kind:'gym',start:'2026-11-0'+n+'T10:00',end:'2026-11-0'+n+'T11:00',duration:3600,exercises:[]});
 phone.state.workouts=[1,2,3,4,5].map(workout);phone.state.templates=[{id:'t-a',title:'А',items:[]},{id:'t-b',title:'Б',items:[]}];phone.save();phone.sync();computer.sync();
 assert.deepEqual(plain(computer.state.workouts.map(w=>w.id)),['w1','w2','w3','w4','w5']);
 // компьютер без связи: поправил четвёртую тренировку и удалил пятую; телефон позже удалил первую
 computer.state.workouts[3].title='Поправлено на компьютере';computer.state.workouts.pop();computer.save();
 phone.writes=0;phone.state.workouts=phone.state.workouts.filter(w=>w.id!=='w1');phone.save();
 assert.equal(phone.writes,2,'удаление одной тренировки — её запись и её строка сводки, соседние не переписываются');
 phone.sync();computer.sync();phone.sync();
 for(const d of [phone,computer]){
  assert.deepEqual(plain(d.state.workouts.map(w=>w.id)),['w2','w3','w4'],'удалённое вторым устройством не вернулось');
  assert.equal(d.state.workouts[2].title,'Поправлено на компьютере','правка соседней тренировки не затёрта');
 }
 // новая тренировка и новый шаблон — по одной записи (плюс строка сводки); порядок на обоих устройствах одинаковый
 phone.writes=0;phone.state.workouts.push(workout(6));phone.save();assert.equal(phone.writes,2);
 computer.state.templates.push({id:'t-c',title:'В',items:[]});computer.save();
 phone.sync();computer.sync();phone.sync();
 for(const d of [phone,computer]){assert.deepEqual(plain(d.state.workouts.map(w=>w.id)),['w2','w3','w4','w6']);assert.deepEqual(plain(d.state.templates.map(t=>t.id)),['t-a','t-b','t-c'])}
 // без правок ничего не пишется
 phone.writes=0;phone.save();assert.equal(phone.writes,0);
}

// пустой дневник — пустые списки, без текущей тренировки
assert.deepEqual(plain(D.build({})),plain(D.blank()));
// значение неизвестного вида не ломает сборку
assert.deepEqual(plain(D.build({workouts:[{id:'workouts',value:{t:'list'}},{id:'workouts~x',value:'испорчено'}]}).workouts),[]);
console.log('Passed: Sport documents — lossless round trip, one record per workout/exercise/tap, summary without demo in the shared format, showcase documents left to their shared files, new document names, list places that survive a neighbour being added or removed.');
