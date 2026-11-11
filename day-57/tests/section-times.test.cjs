'use strict';
/* Day 57.6 — время у каждой шкалы и тега раздела, прежние значения в журнале, «побеждает более поздняя правка». */
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../selfcare-core.js');
const {merge}=require('../day-account-profile.js');
const at=(t,ms)=>({t,ms});
const visit=id=>({id,at:{},tags:{}});

test('сценарий владельца: умывание в 9:00 остаётся, новое настроение — новая отметка, новый тег — своё время',()=>{
 // Первый заход в 9:00: тег «Умывание» и настроение 6.
 const v1=visit('v1');
 let cp=C.editSection(undefined,{},{tags:{'Умывание':true},mood:6},v1,at('09:00',1000));
 assert.equal(cp.time,'09:00');assert.equal(cp.tagAt['Умывание'],'09:00');assert.deepEqual(cp.at.mood,at('09:00',1000));assert.ok(!cp.log);
 // Второй заход в 14:05: настроение испортилось — 3, добавлен тег «Устал».
 const base=structuredClone(cp),v2=visit('v2'),edited={...structuredClone(cp),mood:3,tags:{'Умывание':true,'Устал':true}};
 cp=C.editSection(cp,base,edited,v2,at('14:05',5000));
 assert.equal(cp.mood,3);assert.deepEqual(cp.at.mood,at('14:05',5000));
 assert.deepEqual(cp.log,[{id:'v2:mood',k:'mood',v:6,t:'09:00',ms:1000}]);
 assert.equal(cp.tagAt['Умывание'],'09:00','неизменённый тег не переписывается');
 assert.equal(cp.tagAt['Устал'],'14:05');assert.equal(cp.time,'09:00','начало раздела — первая отметка');
});

test('ведение пальцем за один заход — одна отметка со временем первой правки',()=>{
 const base={time:'09:00',mood:6,at:{mood:at('09:00',1)}},v=visit('v');
 let cp=C.editSection(base,base,{...base,mood:5},v,at('12:00',10));
 cp=C.editSection(cp,base,{...base,mood:4},v,at('12:01',20));
 cp=C.editSection(cp,base,{...base,mood:3},v,at('12:02',30));
 assert.equal(cp.mood,3);assert.deepEqual(cp.at.mood,at('12:00',10));assert.equal(cp.log.length,1);assert.equal(cp.log[0].v,6);
});

test('вернул прежнее значение за тот же заход — лишней отметки нет, время прежнее',()=>{
 const base={time:'09:00',mood:6,tags:{a:true},tagAt:{a:'09:00'},at:{mood:at('09:00',1)}},v=visit('v');
 let cp=C.editSection(base,base,{...base,mood:2,tags:{}},v,at('12:00',10));
 assert.equal(cp.log.length,1);assert.ok(!cp.tags);
 cp=C.editSection(cp,base,{...base,mood:6,tags:{a:true}},v,at('12:01',20));
 assert.deepEqual(cp,base);
});

test('правки другого устройства во время захода не затираются',()=>{
 const base={time:'09:00',mood:6,energy:2},v=visit('v');
 const stored={...base,energy:4,at:{energy:at('10:00',50)}};   // пришло из облака, пока раздел открыт
 const cp=C.editSection(stored,base,{...base,mood:5},v,at('10:30',60));
 assert.equal(cp.energy,4);assert.deepEqual(cp.at.energy,at('10:00',50));assert.equal(cp.mood,5);
});

test('снятый тег уходит без следа, заметка и ручное время сохраняются и откатываются',()=>{
 const base={time:'09:00',tags:{a:true,b:true},tagAt:{a:'09:00',b:'09:00'},note:''},v=visit('v');
 let cp=C.editSection(base,base,{...base,tags:{a:true,b:false},note:'текст',time:'08:30',tm:'m',t0:'09:00'},v,at('11:00',1));
 assert.deepEqual(cp.tags,{a:true});assert.deepEqual(cp.tagAt,{a:'09:00'});assert.equal(cp.note,'текст');
 assert.equal(cp.time,'08:30');assert.equal(cp.tm,'m');assert.equal(cp.t0,'09:00');
 cp=C.editSection(cp,base,{...base,tags:{a:true,b:false},note:'текст'},v,at('11:01',2));
 assert.equal(cp.time,'09:00');assert.ok(!cp.tm);assert.ok(!cp.t0);
 assert.equal(C.editSection(cp,structuredClone(cp),{tags:{}},visit('w'),at('12:00',3)),null,'стёрли всё — раздела нет');
});

test('старые разделы без времени у отметок: прежнее значение берёт время раздела',()=>{
 const base={time:'08:10',mood:4,tags:{x:true}},v=visit('v');
 const cp=C.editSection(base,base,{...base,mood:1},v,at('20:00',9));
 assert.deepEqual(cp.log,[{id:'v:mood',k:'mood',v:4,t:'08:10',ms:0}]);assert.ok(!cp.tagAt,'у старого тега время не придумываем');
});

test('синхронизация: одну шкалу поменяли на двух устройствах — побеждает поставленное позже, второе остаётся отметкой',()=>{
 const base={days:{d:{cp:{am:{time:'09:00',mood:6,at:{mood:at('09:00',100)}}}}}};
 const phone=structuredClone(base),computer=structuredClone(base);
 Object.assign(phone.days.d.cp.am,{mood:7});phone.days.d.cp.am.at.mood=at('09:30',300);
 Object.assign(computer.days.d.cp.am,{mood:5});computer.days.d.cp.am.at.mood=at('09:40',400);
 for(const [l,r] of [[phone,computer],[computer,phone]]){
  const out=merge(base,l,r).days.d.cp.am;
  assert.equal(out.mood,5);assert.deepEqual(out.at.mood,at('09:40',400));
  assert.deepEqual(out.log,[{id:'merge:mood:300:7',k:'mood',v:7,t:'09:30',ms:300}]);
  assert.ok(!merge(base,l,r).accountConflicts,'выбирать вручную нечего');
 }
 // Повторное сведение не плодит отметок.
 const once=merge(base,phone,computer),twice=merge(once,once,merge(base,computer,phone));
 assert.equal(twice.days.d.cp.am.log.length,1);
});

test('синхронизация без общей основы и с разными шкалами, тегами и записями кнопки',()=>{
 const l={days:{d:{cp:{am:{time:'09:00',mood:6,at:{mood:at('09:00',100)},tags:{a:true,c:false},tagAt:{a:'09:00'}}},care:{checkins:[{id:'r1',time:'10:00'}]}}}};
 const r={days:{d:{cp:{am:{time:'09:05',energy:3,at:{energy:at('09:05',150)},tags:{a:true,b:true},tagAt:{a:'09:10',b:'09:05'}}},care:{checkins:[{id:'r2',time:'11:00'}]}}}};
 const out=merge(null,l,r),am=out.days.d.cp.am;
 assert.equal(am.mood,6);assert.equal(am.energy,3);assert.deepEqual(am.tags,{a:true,b:true});
 assert.deepEqual(am.tagAt,{a:'09:00',b:'09:05'});assert.equal(am.time,'09:00');
 assert.deepEqual(out.days.d.care.checkins.map(x=>x.id).sort(),['r1','r2'],'записи кнопки не спорят');
 assert.ok(!out.accountConflicts);
});

test('синхронизация: правка на одном устройстве против нетронутого другого, ручное время главнее',()=>{
 const base={days:{d:{cp:{pm:{time:'13:00',mood:2}}}}};
 const l=structuredClone(base),r=structuredClone(base);
 l.days.d.cp.pm.mood=4;l.days.d.cp.pm.at={mood:at('15:00',9)};
 r.days.d.cp.pm.time='12:40';r.days.d.cp.pm.tm='m';r.days.d.cp.pm.t0='13:00';
 const pm=merge(base,l,r).days.d.cp.pm;
 assert.equal(pm.mood,4);assert.deepEqual(pm.at.mood,at('15:00',9));assert.ok(!pm.log);
 assert.equal(pm.time,'12:40');assert.equal(pm.tm,'m');
});

test('пример владельца: 6 в 9:00 синхронизировано; телефон 7 в 9:30, компьютер 5 в 9:40 — в разделе 5, в журнале 6 и 7 по одному разу',()=>{
 const first=C.editSection(null,{},{mood:6,tags:{}},visit('v0'),at('09:00',1000)),base={days:{d:{cp:{am:first}}}};
 const phone={days:{d:{cp:{am:C.editSection(first,structuredClone(first),{...structuredClone(first),mood:7},visit('vp'),at('09:30',3000))}}}};
 const computer={days:{d:{cp:{am:C.editSection(first,structuredClone(first),{...structuredClone(first),mood:5},visit('vc'),at('09:40',4000))}}}};
 for(const [l,r] of [[phone,computer],[computer,phone]]){
  const am=merge(base,l,r).days.d.cp.am;
  assert.equal(am.mood,5);assert.equal(am.at.mood.t,'09:40');
  assert.deepEqual(am.log.map(x=>[x.v,x.t]).sort(),[[6,'09:00'],[7,'09:30']]);
 }
 // Телефон получил итог и снова сводится с компьютером — строк не прибавляется.
 const once=merge(base,phone,computer);
 assert.equal(merge(base,once,computer).days.d.cp.am.log.length,2);
});
