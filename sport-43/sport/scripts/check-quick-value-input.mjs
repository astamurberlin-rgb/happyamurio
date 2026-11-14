/* Быстрый ввод числа в тренировке (src/quick-value-input.js): нажал на поле — оно очищается под новое значение;
   ушёл с пустым полем или нажал Escape — возвращается прежнее. Поля общей формы замера (класс hm-form,
   shared/happy-measurements.js) это правило не трогает: там пустое поле значит «убрать замер».
   Sport 43: сама форма замера проверяется в scripts/check-measurements.mjs и в сценарии measurements. */
import {fileURLToPath} from 'node:url';import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
function env(){
 const handlers={};
 const c=vm.createContext({console,state:{active:null},Event:class{constructor(type,options){this.type=type;Object.assign(this,options)}},document:{addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn)}});
 vm.runInContext(fs.readFileSync(root+'src/quick-value-input.js','utf8'),c);
 const fire=(type,input,key)=>{const event={type,target:input,key,preventDefault(){},stopImmediatePropagation(){this.stopped=true}};for(const fn of handlers[type]||[]){fn(event);if(event.stopped)break}};
 /* поле: measurement=true — внутри общей формы замера */
 const input=(value,measurement=false)=>{const el={value,readOnly:false,disabled:false,dataset:{},matches:()=>true,closest:selector=>measurement&&selector==='.hm-form'?{}:null,dispatchEvent(event){fire(event.type,el)},blur(){fire('focusout',el)}};return el};
 return {fire,input};
}
let passed=0;function test(name,run){run();passed++;console.log('PASS '+name)}
test('workout field clears on focus for a new value',()=>{const e=env(),w=e.input('80');e.fire('focusin',w);assert.equal(w.value,'')});
test('workout numeric blank on blur cancels the edit',()=>{const e=env(),w=e.input('80');e.fire('focusin',w);e.fire('change',w);e.fire('focusout',w);assert.equal(w.value,'80')});
test('workout new value stays',()=>{const e=env(),w=e.input('80');e.fire('focusin',w);w.value='90';e.fire('input',w);e.fire('change',w);e.fire('focusout',w);assert.equal(w.value,'90')});
test('workout Escape restores the original',()=>{const e=env(),w=e.input('80');e.fire('focusin',w);w.value='90';e.fire('input',w);e.fire('keydown',w,'Escape');assert.equal(w.value,'80')});
for(const flag of ['readOnly','disabled'])test('workout '+flag+' field is untouched',()=>{const e=env(),w=e.input('80');w[flag]=true;e.fire('focusin',w);assert.equal(w.value,'80');e.fire('focusout',w);assert.equal(w.value,'80')});
test('shared measurement form: focus does not clear the field',()=>{const e=env(),w=e.input('81',true);e.fire('focusin',w);assert.equal(w.value,'81');e.fire('focusout',w);assert.equal(w.value,'81')});
test('shared measurement form: an explicit blank stays blank',()=>{const e=env(),w=e.input('81',true);e.fire('focusin',w);w.value='';e.fire('input',w);e.fire('change',w);e.fire('focusout',w);assert.equal(w.value,'')});
console.log(JSON.stringify({passed,failed:0,syntheticOnly:true}));
