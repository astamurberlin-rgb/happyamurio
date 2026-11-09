'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {merge,resolve}=require('../day-account-profile.js');
const section=(k,t)=>({k,t});
test('first contact preserves a custom section, a server entry, draft and both plan dates',()=>{
 const defaults={sections:[section('am','Утро')],days:{},settings:{order:['mood','diary']},planHistory:[]};
 const a=structuredClone(defaults),b=structuredClone(defaults);
 a.sections.push(section('custom','Тестовый раздел'));a.days['2026-11-07']={note:''};a.draft={target:'custom'};
 a.settings.order.reverse();a.planHistory=[{from:'2026-11-07',goals:{mode:'manual'}}];
 b.days['2026-11-07']={note:'Текст B'};b.planHistory=[{from:'2026-11-06',goals:{mode:'manual'}}];
 const combined=merge(null,a,b,defaults);
 assert.equal(combined.sections.length,2);assert.equal(combined.days['2026-11-07'].note,'Текст B');
 assert.deepEqual(combined.draft,a.draft);assert.deepEqual(combined.settings.order,a.settings.order);
 assert.deepEqual(combined.planHistory.map(x=>x.from).sort(),['2026-11-06','2026-11-07']);
 assert.ok(!combined.accountConflicts);assert.deepEqual(merge(null,b,a,defaults),combined);
});
test('edits, deletions and additions against a known baseline retain unrelated changes',()=>{
 const base={sections:[section('a','A'),section('b','B')],goals:{weight:75},notes:{x:1}};
 const l=structuredClone(base),r=structuredClone(base);l.sections.shift();l.goals.weight=82;r.notes.y=2;
 const out=merge(base,l,r);assert.deepEqual(out.sections,[section('b','B')]);assert.equal(out.goals.weight,82);assert.equal(out.notes.y,2);assert.ok(!out.accountConflicts);
});
test('competing edits remain recoverable and an explicit resolution survives the next merge',()=>{
 const base={days:{d:{note:'base'}}},l={days:{d:{note:'first'}}},r={days:{d:{note:'second'}}};
 const m=merge(base,l,r),id=JSON.stringify(['days','d','note']);assert.equal(m.days.d.note,'second');
 const a=m.accountConflicts[id];assert.deepEqual(a.choices.map(x=>x.value).sort(),['first','second']);
 const chosen=structuredClone(m);assert.ok(resolve(chosen,id,a.choices.findIndex(x=>x.value==='first')));
 const result=merge(m,chosen,m);assert.equal(result.days.d.note,'first');assert.ok(!result.accountConflicts);
});
test('separate device histories are retained without adding overlapping time',()=>{
 const db=merge(null,{accountActivity:{A:{d:{sec:20}}}},{accountActivity:{B:{d:{sec:30}}}});
 assert.deepEqual(db.accountActivity,{A:{d:{sec:20}},B:{d:{sec:30}}});
});
