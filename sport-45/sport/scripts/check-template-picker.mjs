import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
// DOM contract + real planning functions; this is not browser/layout QA.
const read=name=>readFile(new URL('../src/'+name+'.js',import.meta.url),'utf8');
const handlers={};let form,modal,focused=null;
class Node {
 constructor(kind='node'){this.kind=kind;this.dataset={};this.childNodes=[];this.scrollTop=0;this.value='';this.textContent='';this.isConnected=true;this.style={};}
 replaceChildren(...nodes){this.childNodes=nodes;for(const n of nodes)n.parentNode=this;}
 append(...nodes){this.childNodes.push(...nodes);for(const n of nodes)n.parentNode=this;}
 focus(){focused=this;document.activeElement=this;}
 contains(n){return this===n||this.childNodes.some(x=>x.contains?.(n));}
 setAttribute(k,v){this[k]=v;}
 querySelector(selector){if(selector==='.sheet')return this.sheet||null;if(selector==='[data-action="template-picker-back"]')return this.back||null;return this.nodes?.[selector]||null;}
 querySelectorAll(){return [];}
 closest(selector){if(selector==='.template-item')return this.row||null;if(selector==='#template-form')return form;return null;}
 dispatchEvent(event){event.target=this;for(const fn of handlers[event.type]||[])fn(event);return true;}
 set innerHTML(html){this.html=html;}
 get innerHTML(){return this.html||'';}
}
modal=new Node('modal');
const document={activeElement:null,body:{style:{},classList:{add(){},remove(){}}},addEventListener(type,fn){(handlers[type]??=[]).push(fn)},getElementById(id){return id==='modal-root'?modal:null},querySelector(selector){if(selector==='#modal-root')return modal;if(selector==='.sheet')return modal.sheet;if(selector==='#template-form')return modal.childNodes.includes(form)?form:null;return modal.nodes?.[selector]||null;}};
const c=createContext({console,Date,Math,Number,JSON,Map,document,Event:class{constructor(type,options){this.type=type;Object.assign(this,options)}},requestAnimationFrame:fn=>fn(),setTimeout:fn=>fn(),persist(){},render(){},toast(){},icon:s=>s,countdownTime:n=>String(n),esc:String,$:s=>document.querySelector(s)});
const run=s=>runInContext(s,c),plain=x=>JSON.parse(JSON.stringify(x));
run(`var SEED={equipment:{},exercises:[{id:'pull',name:'Подтягивания',en:'Pull-up',aliases:['турник'],equipment:['перекладина'],profile:'reps'},{id:'swim',name:'Плавание',en:'Swimming',profile:'distance_time'}]},state={workouts:[],customExercises:[],templates:[],lastRestSeconds:60,active:{id:'untouched',exercises:[]}};
var clone=x=>JSON.parse(JSON.stringify(x)),exercise=id=>state.customExercises.find(e=>e.id===id)||SEED.exercises.find(e=>e.id===id),allExercises=()=>[...SEED.exercises,...state.customExercises],localNow=()=> '2026-11-02T10:00:00',sheetKind='',priorFocus=null;
function blankSet(e){return {seconds:0,reps:0,weight:0,distance:0,done:false}};
function exerciseCard(e,action){return '<button data-action="'+action+'" data-id="'+e.id+'">'+e.name+'</button>'};`);
run(await read('metric-field'));
const app=await read('app'),config=await read('exercise-config');
run(app.match(/function matches\(e,q\)\{[^\n]+/)[0]);
run(config.slice(0,config.indexOf('// Shared editor')));
run(await read('set-plan'));
run((await read('set-rest')).split('document.addEventListener')[0]);
run((await read('set-time')).split('document.addEventListener')[0]);
c.openSheet=(title,html,kind='')=>{c.sheetTitle=title;run('sheetKind='+JSON.stringify(kind));const sheet=new Node('sheet'),search=new Node('input'),results=new Node('results');sheet.html=html;modal.sheet=sheet;modal.nodes={'#template-picker-search':search,'#template-picker-results':results};modal.replaceChildren(sheet);};
c.closeSheet=()=>{modal.replaceChildren();run("sheetKind=''");};
c.goto=()=>c.closeSheet();
c.openExerciseEditor=()=>{c.customActiveFlag=run("sheetKind==='picker'");c.openSheet('Создать упражнение','custom','exercise-config');const custom=new Node('custom-form'),plan=run("createSetPlan(null,'main',[{reps:7,done:false}],['reps'])"),root=new Node('plan');root.dataset.setPlan=plan.key;custom.dataset={id:'',ei:'',initialPlan:JSON.stringify(plan.sets),addActive:'false'};custom.fields={name:'Свое синтетическое',metrics:['reps'],timerMode:'countdown',workSeconds:'1:00',restSeconds:'0:30',rounds:'3',aliases:'',equipment:'',muscleGroups:[]};custom.nodes={'[data-set-plan]':root};modal.nodes['#exercise-config-form']=custom;modal.nodes['.sheet-top']={insertAdjacentHTML(){}};};
c.FormData=class{constructor(form){this.fields=form.fields;}get(k){return this.fields[k]??null;}getAll(k){const v=this.fields[k];return Array.isArray(v)?v:v==null?[]:[v];}};
run(config.slice(config.indexOf('function saveExerciseEditor('),config.indexOf('function restoreExerciseName(')));

function row(id='pull',sets=[{reps:12,restSeconds:90,done:false},{reps:8,restSeconds:60,done:false},{reps:8,done:false}]){
 const value=new Node('row'),input=new Node('input'),phase=new Node('input'),button=new Node('button'),root=new Node('plan'),time=new Node('switch');
 input.name='exerciseId';input.value=id;input.row=value;phase.value='main';button.dataset.action='template-exercise-picker';button.row=value;button.closest=selector=>selector==='[data-action]'?button:value;
 const draft=run(`createSetPlan(${JSON.stringify(id)},'main',${JSON.stringify(sets)})`);root.dataset.setPlan=draft.key;
 root.querySelectorAll=selector=>selector==='[data-plan-value]'?draft.sets.map((s,i)=>({dataset:{planIndex:String(i),planValue:'reps'},value:String(s.reps)})):selector==='[data-plan-rest]'?draft.sets.flatMap((s,i)=>s.restSeconds==null?[]:[{dataset:{planRest:String(i)},value:String(s.restSeconds)}]):[];
 value.nodes={'[name=exerciseId]':input,'[name=phase]':phase,'[data-set-plan]':root,'.set-plan-time-switch':time,'[data-action="template-exercise-picker"]':button};value.querySelectorAll=()=>[];value.draft=draft;value.button=button;return value;
}
const initial=row(),other=row('pull',[{reps:5,done:false}]),items=new Node('items');items.rows=[initial,other];items.querySelectorAll=()=>items.rows;
items.insertAdjacentHTML=(where,html)=>{const id=html.match(/name="exerciseId"[^>]*value="([^"]*)"/)?.[1]||html.match(/value="([^"]*)"[^>]*name="exerciseId"/)?.[1];assert.ok(id,'Inserted row retains an exercise identity');items.rows.push(row(id,run(`exercise(${JSON.stringify(id)})?.defaultSets`)||[{reps:0,done:false}]));};
Object.defineProperty(items,'lastElementChild',{get:()=>items.rows.at(-1)});
form=new Node('template');form.id='template-form';form.title={value:'Турник — синтетический тест'};form.schedule={value:'weekly',days:['1','3'],time:'17:45'};form.nodes={'#template-items':items};form.querySelectorAll=selector=>selector==='.template-item'?items.rows:[];
modal.replaceChildren(form);c.templateItemRow=item=>`<div><input name="exerciseId" value="${item[0]}"></div>`;
const beforeActive=plain(run('state.active'));
run(await read('template-picker'));
assert.equal(run("templateExerciseResults('ТУРНИК').length"),1);
assert.equal(run("templateExerciseResults('swim').length"),1);
assert.equal(run("templateExerciseResults('перекладина').length"),1);
assert.equal(run("templateExerciseResults('не существует').length"),0);
run("state.archivedExercises=['pull']");assert.equal(run("templateExerciseResults('ТУРНИК').length"),0,'Archived exercises are not selectable');run('state.archivedExercises=[]');
run("state.customExercises.push({...clone(SEED.exercises[0])})");assert.equal(run("templateExerciseResults('ТУРНИК').length"),1,'Duplicate catalog IDs are shown once');run('state.customExercises=[]');

c.testRow=initial;
function click(action,rowNode=null,id=null){const button=new Node('button');button.dataset={action,...(id?{id}:{})};button.closest=selector=>selector==='[data-action]'?button:rowNode;const event={target:button,preventDefault(){},stopImmediatePropagation(){this.stopped=true}};for(const fn of handlers.click||[]){fn(event);if(event.stopped)break;}}
click('template-exercise-picker',initial);
const search=document.querySelector('#template-picker-search');search.id='template-picker-search';search.value=' ТУРНИК ';
for(const fn of handlers.input||[])fn({target:search});
assert.match(document.querySelector('#template-picker-results').innerHTML,/Подтягивания/);
assert.doesNotMatch(document.querySelector('#template-picker-results').innerHTML,/Плавание/);
click('template-picker-back');assert.equal(modal.childNodes.includes(form),true);
run('openTemplateExercisePicker(testRow)');
assert.equal(modal.childNodes.includes(form),false);
run('closeSheet()');
assert.equal(modal.childNodes.includes(form),true,'Cancel restores the same live form nodes');
assert.equal(form.title.value,'Турник — синтетический тест');assert.deepEqual(form.schedule,{value:'weekly',days:['1','3'],time:'17:45'});
run("openTemplateExercisePicker(testRow);selectTemplateExercise('pull')");
assert.deepEqual(plain(initial.draft.sets).map(s=>s.reps),[12,8,8],'Re-selecting same exercise must not reset prescribed sets');
assert.deepEqual(plain(initial.draft.sets).map(s=>s.restSeconds),[90,60,undefined]);
const planRoot=initial.nodes['[data-set-plan]'],priorQuery=planRoot.querySelectorAll,partialInput={dataset:{planIndex:'0',planValue:'reps'},value:'-'};
planRoot.querySelectorAll=selector=>selector==='[data-plan-value]'?[partialInput]:priorQuery(selector);
run("openTemplateExercisePicker(testRow);selectTemplateExercise('pull')");assert.equal(partialInput.value,'-','Same-ID selection preserves unfinished input without validating/resetting it');
planRoot.querySelectorAll=priorQuery;

run('openTemplateExercisePicker(testRow);openTemplateCustomExercise()');
assert.equal(c.customActiveFlag,false,'Nested library creation is not active-workout creation');
run('closeSheet()');assert.equal(run('templateSheetStack.length'),1,'Cancel custom returns to picker');
run('closeSheet()');assert.equal(modal.childNodes.includes(form),true,'Cancel picker restores template');
run("openTemplateExercisePicker();openTemplateCustomExercise();saveExerciseEditor($('#exercise-config-form'))");
assert.equal(modal.childNodes.includes(form),true,'Custom save returns directly to preserved template');
const customId=run('state.customExercises[0].id');assert.equal(items.rows.at(-1).nodes['[name=exerciseId]'].value,customId);
assert.equal(items.rows.length,3);assert.equal(run('state.customExercises.length'),1);
assert.deepEqual(plain(run('state.active')),beforeActive,'Creating a template exercise leaves active workout untouched');
assert.equal(form.title.value,'Турник — синтетический тест');assert.equal(form.schedule.time,'17:45');
// Changing another row uses the existing delegated defaults handler, not library mutation.
c.otherRow=other;run("openTemplateExercisePicker(otherRow);selectTemplateExercise('swim')");
assert.equal(other.nodes['[name=exerciseId]'].value,'swim');
assert.deepEqual(plain(other.draft.metrics),['seconds','distance']);
assert.equal(other.button.textContent,'Плавание');
assert.deepEqual(plain(initial.draft.sets).map(s=>s.reps),[12,8,8]);
c.testForm=form;
run('var serializedPicker=serializeTemplateItems(testForm),savedPicker={id:"saved-picker",items:serializedPicker}');
assert.deepEqual(plain(run('serializedPicker[0][3].sets')).map(s=>s.reps),[12,8,8]);
assert.deepEqual(plain(run('templateEditorItems(savedPicker)[0][3].sets')),plain(run('serializedPicker[0][3].sets')),'Reopening retains all exact values');
run(`var templates=()=>[savedPicker];function startWorkout(){if(state.active)return;state.active={exercises:savedPicker.items.map(([id,phase,count])=>({id,phase,sets:Array.from({length:count},()=>blankSet(exercise(id)))}))}};function pickExercise(){};state.active=null;`);
run(config.slice(config.indexOf('const settingsStartWorkout='),config.indexOf('renderHistory=function')));
run("startWorkout('saved-picker')");
assert.deepEqual(plain(run('state.active.exercises[0].sets')),plain(run('serializedPicker[0][3].sets')),'Start retains 12/8/8 and per-set rests');
assert.equal(run("state.active.exercises[2].id"),customId);
run('openTemplateExercisePicker();openSheet("Unrelated", "Other settings", "other")');
assert.equal(run('templateSheetStack.length'),0,'Unrelated modal abandons picker state');
run('closeSheet()');assert.equal(modal.childNodes.includes(form),false,'Closing unrelated modal does not resurrect template');
modal.replaceChildren(form);
run('openTemplateExercisePicker();goto("library")');
assert.equal(run('templateSheetStack.length'),0,'Unrelated navigation drops nested state');
assert.equal(modal.childNodes.includes(form),false,'Navigation must not restore old draft over the new view');
console.log('Passed: template library search, cancel/custom return preserving exact draft nodes/title/sets/rest/schedule, same-ID selection, custom add without active mutation, save/reopen/start values.');
