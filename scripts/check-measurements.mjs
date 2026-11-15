/* Проверка общего формата замеров тела (shared/happy-measurements.js): чтение и запись записей общего документа
 * sport/body, правка, удаление и возврат, выгрузка CSV, выбор замера для сравнения. Замеры придуманные.
 * Формат тот же, что пишет Sport 42: если его папка ещё на месте, проверяется и чтение его раскладкой.
 * Сам экран в браузере смотрит сценарий scripts/browser/measurements.py.
 * Запуск: node scripts/check-measurements.mjs
 * — Claude · 14.11.2026 */
import {existsSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createContext,runInContext} from 'node:vm';
const require=createRequire(import.meta.url);
const H=require('../shared/happy-measurements.js');

let failed=0,passed=0;
function check(name,ok,detail){if(ok)passed++;else{failed++;console.log('FAIL · '+name+(detail!==undefined?' · '+JSON.stringify(detail):''))}}
const section=name=>console.log('— '+name);
const throws=fn=>{try{fn();return null}catch(e){return e.message}};

/* «Документ»: записи по номеру, как их отдаёт общий модуль (doc.all() и doc.putMany()). */
function makeDoc(records){
 const map=new Map((records||[]).map(r=>[r.id,JSON.parse(JSON.stringify(r.value))]));
 return {all:()=>[...map].map(([id,value])=>({id,value:JSON.parse(JSON.stringify(value))})),
  putMany(list){for(const x of list){if(x.deleted)map.delete(x.id);else map.set(x.id,JSON.parse(JSON.stringify(x.value)))}},map};
}
/* Записи в том виде, в каком их кладёт Sport 42. */
const M=(date,values,extra)=>({date,values,source:'Мой замер',note:'',...extra});
const A=M('2026-08-01',{neck:38,shoulders:118,waist:86,bicepsL:33,bicepsR:33.5,weight:82});
const B=M('2026-10-01',{neck:38,shoulders:119,waist:83,bicepsL:34,bicepsR:34.5,weight:80.5});
const C=M('2026-11-14',{neck:38.5,shoulders:120,waist:81,bicepsL:35,bicepsR:35,weight:79},{extra:{device:'лента'}});
const DELETED={id:'measure-deleted-1',record:M('2026-09-01',{waist:85})};
const sport42=()=>[
 {id:'measurements',value:{t:'list'}},
 {id:'measurements~2026-08-01',value:{i:0,v:A}},{id:'measurements~2026-10-01',value:{i:1,v:B}},{id:'measurements~2026-11-14',value:{i:2,v:C}},
 {id:'measurementTrash',value:{t:'value',v:[DELETED]}}
];

section('Чтение записей');
{
 const s=H.read(sport42());
 check('три замера по возрастанию даты',s.list.map(m=>m.date).join()==='2026-08-01,2026-10-01,2026-11-14');
 check('значения и незнакомые поля на месте',s.list[2].values.waist===81&&s.list[2].extra.device==='лента');
 check('удалённые замеры прочитаны',s.trash.length===1&&s.trash[0].id==='measure-deleted-1'&&s.trash[0].record.date==='2026-09-01');
 check('пустой документ — пустой список',H.read([]).list.length===0&&H.read([]).trash.length===0&&H.read(null).list.length===0);
 const broken=sport42().concat([{id:'measurements~2026-13-40',value:{i:9,v:M('2026-13-40',{waist:80})}},{id:'measurements~2026-12-01',value:{i:9,v:M('2026-12-02',{waist:80})}},
  {id:'measurements~2026-12-03',value:{i:9,v:{date:'2026-12-03',values:{waist:'80'}}}},{id:'measurements~2026-12-04',value:'мусор'}]);
 check('негодные записи пропускаются по одной, остальные читаются',H.read(broken).list.length===3);
 check('порядок записей и поле i на чтение не влияют',JSON.stringify(H.read(sport42().reverse()).list)===JSON.stringify(s.list));
}

section('Новый замер');
{
 const doc=makeDoc(sport42()),s=H.read(doc.all());
 const m=H.compose(s,'2026-11-20',{waist:'80,5',weight:'78.4',neck:''},null);
 check('замер собран: запятая в числе принята, пустое поле пропущено',m.values.waist===80.5&&m.values.weight===78.4&&!('neck' in m.values)&&m.source==='Мой замер');
 doc.putMany(H.saveChanges(s,m,null));
 const after=H.read(doc.all());
 check('замер добавлен, остальные не тронуты',after.list.length===4&&after.list[3].date==='2026-11-20'&&JSON.stringify(after.list.slice(0,3))===JSON.stringify(s.list));
 check('записан отдельной записью на дату, отметка списка на месте',doc.map.get('measurements~2026-11-20').v.date==='2026-11-20'&&doc.map.get('measurements').t==='list');
 const empty=makeDoc([]);empty.putMany(H.saveChanges(H.read(empty.all()),m,null));
 check('первый замер в пустом документе создаёт отметку списка',empty.map.get('measurements')?.t==='list'&&H.read(empty.all()).list.length===1);
 check('без даты не принимается',throws(()=>H.compose(s,'',{waist:'80'},null))==='Укажи дату замера.');
 check('несуществующая дата не принимается',!!throws(()=>H.compose(s,'2026-02-30',{waist:'80'},null)));
 check('без значений не принимается',throws(()=>H.compose(s,'2026-11-21',{waist:''},null))==='Внеси хотя бы один замер.');
 check('значение вне 1–500 не принимается',!!throws(()=>H.compose(s,'2026-11-21',{waist:'0'},null))&&!!throws(()=>H.compose(s,'2026-11-21',{waist:'501'},null))&&!!throws(()=>H.compose(s,'2026-11-21',{waist:'abc'},null)));
 check('вторая запись на ту же дату не принимается',/уже есть замер/.test(throws(()=>H.compose(s,'2026-10-01',{waist:'80'},null))||''));
}

section('Исправление замера');
{
 const doc=makeDoc(sport42());let s=H.read(doc.all());
 const before=s.list[2];
 let m=H.compose(s,'2026-11-14',{neck:'38.5',shoulders:'121',waist:'',bicepsL:'35',bicepsR:'35',weight:'79'},before);
 check('изменённое поле записано, очищенное убрано, нетронутые остались',m.values.shoulders===121&&!('waist' in m.values)&&m.values.neck===38.5&&m.values.weight===79);
 check('незнакомые поля замера сохранены',m.extra.device==='лента');
 doc.putMany(H.saveChanges(s,m,before.date));s=H.read(doc.all());
 check('замер на ту же дату заменён',s.list.length===3&&s.list[2].values.shoulders===121);
 m=H.compose(s,'2026-11-15',{shoulders:'121'},s.list[2]);
 doc.putMany(H.saveChanges(s,m,s.list[2].date));
 const moved=H.read(doc.all());
 check('перенос на другую дату: прежняя запись убрана, новая на месте',moved.list.map(x=>x.date).join()==='2026-08-01,2026-10-01,2026-11-15'&&!doc.map.has('measurements~2026-11-14'));
 const stale=JSON.parse(JSON.stringify(s.list[1]));stale.values.waist=99;
 check('замер изменили, пока форма была открыта — правка не принимается',/Открой его заново/.test(throws(()=>H.compose(moved,'2026-10-01',{waist:'82'},stale))||''));
 check('перенос на занятую дату не принимается',/уже есть замер/.test(throws(()=>H.compose(moved,'2026-08-01',{waist:'82'},moved.list[1]))||''));
}

section('Удаление и возврат');
{
 const doc=makeDoc(sport42());let s=H.read(doc.all());
 const r=H.removeChanges(s,'2026-10-01','measure-deleted-2');doc.putMany(r.changes);s=H.read(doc.all());
 check('замер убран и лежит в удалённых',s.list.map(m=>m.date).join()==='2026-08-01,2026-11-14'&&s.trash.map(x=>x.id).join()==='measure-deleted-1,measure-deleted-2'&&s.trash[1].record.values.waist===83);
 doc.putMany(H.restoreChanges(s,'measure-deleted-2'));s=H.read(doc.all());
 check('замер возвращён со всеми значениями',s.list.length===3&&JSON.stringify(s.list[1])===JSON.stringify(B)&&s.trash.length===1);
 doc.putMany(H.saveChanges(s,H.compose(s,'2026-09-01',{waist:'84'},null),null));s=H.read(doc.all());
 check('возврат на занятую дату не принимается',/уже есть замер/.test(throws(()=>H.restoreChanges(s,'measure-deleted-1'))||''));
 check('неизвестный удалённый замер не возвращается',!!throws(()=>H.restoreChanges(s,'нет такого'))&&!!throws(()=>H.removeChanges(s,'2020-01-01','x')));
}

section('Список, лежащий одной записью');
{
 const doc=makeDoc([{id:'measurements',value:{t:'value',v:[B,A]}}]);let s=H.read(doc.all());
 check('читается',s.list.map(m=>m.date).join()==='2026-08-01,2026-10-01'&&s.whole===true);
 doc.putMany(H.saveChanges(s,H.compose(s,'2026-11-14',{waist:'81'},null),null));s=H.read(doc.all());
 check('после правки разложен по записям, ничего не потеряно',s.whole===false&&s.list.length===3&&doc.map.get('measurements').t==='list'&&doc.map.has('measurements~2026-08-01')&&doc.map.has('measurements~2026-10-01'));
}

section('Сравнение и выгрузка');
{
 const list=[M('2026-05-01',{waist:90}),A,B,M('2026-11-01',{waist:82}),C];
 const p=(period,chosen)=>H.pair(list,period,chosen).old.date;
 check('последний замер — текущий',H.pair(list,'first',null).cur.date==='2026-11-14');
 check('первый, прошлый, месяц и три месяца',p('first')==='2026-05-01'&&p('previous')==='2026-11-01'&&p('month')==='2026-10-01'&&p('3months')==='2026-08-01',[p('first'),p('previous'),p('month'),p('3months')]);
 check('выбранная дата главнее периода',p('first','2026-10-01')==='2026-10-01'&&p('first','2099-01-01')==='2026-05-01');
 check('один замер сравнивается сам с собой, пустой список — без пары',H.pair([C],'first',null).old.date==='2026-11-14'&&H.pair([],'first',null).cur===null);
 const text=H.csv([A,M('2026-10-02',{waist:83,custom:'=1+1'})]),rows=text.replace('﻿','').split('\r\n');
 check('CSV: заголовок с единицами, строка на замер',rows.length===3&&rows[0].startsWith('"Дата";"Шея, см"')&&rows[0].includes('"Вес, кг"')&&rows[1].startsWith('"2026-08-01";"38"'));
 check('CSV: текст, похожий на формулу, обезврежен',rows[2].includes('"\'=1+1"')&&rows[0].includes('Дополнительное поле: custom'));
}

section('Силуэт');   // макет «Что изменилось» (Sport 43.2, Day 59.2, Meal 32.2): обхваты меняют ширину, кости неизменны
{
 const now=H.girths({waist:91.5,hips:100}),past=v=>H.girths(v,now);
 const drawn=(v,k)=>H.bodyPath(H.drawnPast(now,past(v),k));
 check('без изменения замера усиление ничего не меняет',drawn({waist:91.5,hips:100},1)===drawn({waist:91.5,hips:100},3)&&drawn({waist:91.5,hips:100},3)===H.bodyPath(now));
 check('изменение замера усиливается',drawn({waist:98},1)!==drawn({waist:98},3)&&H.drawnPast(now,past({waist:98}),3).waist>H.drawnPast(now,past({waist:98}),1).waist);
 check('усиленная разница не уходит за 0,7–1,35 от «сейчас»',H.drawnPast(now,past({waist:300}),3).waist===now.waist*1.35&&H.drawnPast(now,past({waist:10}),3).waist===now.waist*0.7);
 check('нет пары замеров — разницы нет',drawn({},3)===H.bodyPath(now)&&H.bodyPath(H.girths({}))===H.bodyPath(H.girths({},null)));
 check('парные замеры — среднее левой и правой, одна сторона — она сама',H.girths({bicepsL:34,bicepsR:36}).biceps===35&&H.girths({thighR:60}).thigh===60);
 const base={neck:39,shoulders:121,chest:103,bicepsL:36,bicepsR:36,forearmL:29.5,forearmR:29.5,waist:82,hips:97,thighL:58.5,thighR:58.5,calfL:38,calfR:38};
 const shape=v=>H.bodyPath(H.girths(v)),moved=[['neck'],['shoulders'],['chest'],['bicepsL','bicepsR'],['forearmL','forearmR'],['waist'],['hips'],['thighL','thighR'],['calfL','calfR']]
  .filter(keys=>{const low={...base},high={...base};for(const k of keys){low[k]=base[k]*0.85;high[k]=base[k]*1.15}return shape(low)===shape(base)||shape(high)===shape(base)}).map(k=>k[0]);
 check('каждый обхват меняет фигуру в обе стороны — и плечи, и грудь',moved.length===0,moved);
 check('недостающий обхват — в масштабе остальных: у крупного человека без замера бедра ноги не худые',H.girths({shoulders:126,chest:115}).thigh>H.girths({}).thigh&&H.girths({}).thigh===58.5);
 check('пустые и крайние замеры не дают нечисловых координат',![H.girths({}),H.girths({waist:1,hips:1,chest:1,shoulders:1}),H.girths({waist:500,hips:500,chest:500,shoulders:500,bicepsL:500})].some(m=>/NaN|Infinity/.test(H.bodyPath(m))));
}

if(existsSync(new URL('../sport-42/sport/src/sport-docs.js',import.meta.url))){
 section('Тот же формат, что у Sport 42');
 const context=createContext({});runInContext(readFileSync(new URL('../sport-42/sport/src/sport-docs.js',import.meta.url),'utf8'),context);
 const SportDocs=runInContext('SportDocs',context),plain=x=>JSON.parse(JSON.stringify(x));
 const state=SportDocs.blank();state.measurements=[A,B,C];state.measurementTrash=[DELETED];
 const projected=[...SportDocs.project(state).get('body')].map(([id,value])=>({id,value:plain(value)}));
 const s=H.read(projected);
 check('замеры, разложенные Sport 42, читаются',JSON.stringify(s.list)===JSON.stringify([A,B,C])&&JSON.stringify(s.trash)===JSON.stringify([DELETED]));
 const doc=makeDoc(projected);doc.putMany(H.saveChanges(s,H.compose(s,'2026-11-20',{waist:'80'},null),null));
 doc.putMany(H.removeChanges(H.read(doc.all()),'2026-08-01','measure-deleted-9').changes);
 const names=['workouts','active','exercises','routines','schedule','body','tallies','prefs','summary'];
 const built=plain(SportDocs.build(Object.fromEntries(names.map(n=>[n,n==='body'?doc.all():[]]))));
 check('замеры, записанные общим экраном, Sport 42 собирает в свой дневник',built.measurements.map(m=>m.date).sort().join()==='2026-10-01,2026-11-14,2026-11-20'&&built.measurements.find(m=>m.date==='2026-11-20').values.waist===80);
 check('и удалённые тоже',built.measurementTrash.map(x=>x.id).join()==='measure-deleted-1,measure-deleted-9');
}

console.log(failed?`Замеры тела: НЕ ПРОШЛО ${failed} из ${failed+passed}`:`Замеры тела: ${passed} проверок прошли`);
process.exit(failed?1:0);
