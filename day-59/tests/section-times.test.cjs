'use strict';
/* Day 57.6 — время у каждой шкалы и тега раздела, прежние значения в журнале раздела.
   Day 59: как правки раздела с двух устройств сводятся по записям общего модуля («побеждает поставленное позже,
   второе остаётся строкой журнала») — в day-docs.test.cjs. */
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../selfcare-core.js');
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
