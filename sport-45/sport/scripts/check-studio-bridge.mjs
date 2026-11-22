import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createContext,runInContext} from 'node:vm';

const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const catalog=await read('../../assets/sport-icons/v1/catalog.json');
const stored={'placement:exercise:machine-leg-press':'data:image/png;base64,AA=='};
const handlers={},documentHandlers={};let snapshot=JSON.stringify({placements:{'exercise:machine-leg-press':{kind:'upload'}},overrides:{},custom:[]}),rendered=0,editing=false;
const db={objectStoreNames:{contains:()=>true},close(){},transaction(){return{objectStore(){return{get(id){const req={};queueMicrotask(()=>{req.result=stored[id];req.onsuccess?.()});return req}}}}}};
const fakeIndexedDB={open(){const req={};queueMicrotask(()=>{req.result=db;req.onsuccess?.()});return req}};
const c=createContext({URL,location:{href:'https://preview.test/sport/',origin:'https://preview.test'},SEED:{icons:{}},kindIcon:()=>'',
 indexedDB:fakeIndexedDB,localStorage:{getItem:()=>snapshot,setItem(){throw Error('Studio bridge must not rewrite data')}},
 window:{indexedDB:fakeIndexedDB,addEventListener:(name,fn)=>{handlers[name]=fn}},
 document:{querySelector:()=>editing?{}:null,addEventListener:(name,fn)=>{documentHandlers[name]=fn},visibilityState:'visible'},
 render:()=>rendered++});
runInContext((await read('src/sport-icons.js')).replace('__SPORT_ICON_CATALOG__',catalog),c);
runInContext(await read('src/icon-studio-bridge.js'),c);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(runInContext("exerciseSportIcon({id:'machine-leg-press'})",c),'studio:exercise:machine-leg-press');
assert.ok(runInContext("sportIconMarkup(exerciseSportIcon({id:'machine-leg-press'}))",c).includes('data:image/png;base64,AA=='));
assert.equal(rendered,1);
snapshot=JSON.stringify({placements:{'category:sport:19_football':{kind:'catalog',id:'sport:21_volleyball'}}});
handlers.storage({key:'auth_readonly_happy_icon_studio_v1'});await new Promise(resolve=>setImmediate(resolve));
assert.ok(runInContext("sportIconMarkup(sportStudioCategoryIcon('sport:19_football'))",c).includes('21_volleyball.png'));
assert.equal(rendered,2);
editing=true;documentHandlers.visibilitychange();await new Promise(resolve=>setImmediate(resolve));
assert.equal(rendered,2,'Do not replace a form while the user is editing it');
console.log('Passed: same-origin Studio assignments, uploaded media, refresh and form preservation.');
