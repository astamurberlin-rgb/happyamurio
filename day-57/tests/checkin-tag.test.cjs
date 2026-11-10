const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
/* Update 57.1: свой тег в режиме «Отметить самочувствие» не терялся при снятии выбора.
   checkinSection() каждый раз собирает список тегов заново, поэтому тег должен попадать в настоящий раздел. */
const ui=fs.readFileSync(path.join(__dirname,'..','selfcare-ui.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const m=/function addCheckinTag\(tag\)\{[\s\S]*?\n\}\n/.exec(ui);
function load(session,DB,store){return new Function('session','DB','data',m[0]+';return addCheckinTag')(session,DB,()=>store);}
test('addCheckinTag exists, is exported and used by the «Свой тег» handler',()=>{
 assert.ok(m,'addCheckinTag missing in selfcare-ui.js');
 assert.match(ui,/root\.SelfCare=\{.*addCheckinTag/);
 assert.match(html,/SelfCare\.addCheckinTag\(t\)/);
});
test('tag added while checking in «Утро» lands in the real section and the tag catalog',()=>{
 const DB={sections:[{k:'wake',tags:['Умывание']}],tags:['Умывание']},store={checkinSection:{tags:[]}};
 assert.equal(load({target:'wake',checkpoint:{tags:{}}},DB,store)('Мой тег'),true);
 assert.deepEqual(DB.sections[0].tags,['Умывание','Мой тег']);
 assert.deepEqual(DB.tags,['Умывание','Мой тег']);
 assert.deepEqual(store.checkinSection.tags,[]);
});
test('tag added to «Текущие отметки» (no target section) is kept in the check-in list',()=>{
 const DB={sections:[{k:'wake',tags:[]}],tags:[]},store={checkinSection:{tags:[]}};
 load({target:null,checkpoint:{tags:{}}},DB,store)('Сейчас');
 assert.deepEqual(store.checkinSection.tags,['Сейчас']);
 assert.deepEqual(DB.tags,[]);
});
test('adding the same tag twice does not duplicate it',()=>{
 const DB={sections:[{k:'wake',tags:[]}],tags:[]},store={checkinSection:{tags:[]}},add=load({target:'wake',checkpoint:{tags:{}}},DB,store);
 add('Тег');add('Тег');
 assert.deepEqual(DB.sections[0].tags,['Тег']);assert.deepEqual(DB.tags,['Тег']);
});
