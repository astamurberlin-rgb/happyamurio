/* Экраны аккаунта, профиля и целей (прототипы Meal v7, Sport v2, Day v2; shared/happy-person.js, shared/happy-goals.js):
   правила, которые не видны глазом, — на настоящем коде общих файлов в Node.
   Профиль: запись только изменившихся полей; единицы еды — своё поле в units (Meal 33.10); новый вес — замер на свою дату, история не переписывается, вес за ту же дату
   правит замер этой даты и не трогает его остальные значения. Цели веса: колесо и линейка — одна модель (левее диапазона —
   снижение, правее — набор, внутри — последний центральный режим). Meal: доли БЖУ всегда 100 %, расчёт по формуле прототипа.
   Sport: смена одного фокуса не повторяет цель веса. Day: новый выбор — со второй строки, сохранённый не сбрасывается,
   своя цель и тема — без пустых и повторов. Числа — придуманные. — Claude · 16.11.2026 */
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const ctx=createContext({});ctx.globalThis=ctx;
for(const f of ['happy-measurements.js','happy-screens.js','happy-person.js','happy-goals.js'])runInContext(await read('shared/'+f),ctx,{filename:f});
const P=ctx.HappyPerson,G=ctx.HappyGoals,M=ctx.HappyMeasurements,plain=x=>JSON.parse(JSON.stringify(x));

/* ── профиль ── */
{const before=P.read([]);
 assert.deepEqual(plain(before),{birthday:'',heightCm:null,sex:'',units:{weight:'kg',height:'cm',food:'metric'},photo:''},'пустой профиль');
 const list=plain(P.changes(before,Object.assign({},before,{birthday:'1990-05-14',heightCm:178,sex:'male'})));
 assert.deepEqual(list.map(x=>x.id),['birthday','height','sex'],'пишутся только изменившиеся поля');
 const after=P.read(list);assert.equal(after.heightCm,178);assert.equal(after.sex,'male');assert.equal(after.birthday,'1990-05-14');
 assert.deepEqual(plain(P.changes(after,after)),[],'без изменений ничего не пишется');
 assert.throws(()=>P.changes(after,Object.assign({},after,{heightCm:20})),/рост/i);
 assert.throws(()=>P.changes(after,Object.assign({},after,{birthday:'1990-02-30'})),/дату рождения/i);
 assert.deepEqual(plain(P.read([{id:'units',value:{v:{weight:'lb',height:'ft'}}}]).units),{weight:'lb',height:'ft',food:'metric'},'единицы веса и роста отдельно; запись без еды — граммы');
 /* единицы еды (Meal 33.10): одно поле на аккаунт, отдельно от веса */
 const oz=plain(P.changes(after,Object.assign({},after,{units:{weight:'kg',height:'cm',food:'oz'}})));
 assert.deepEqual(oz,[{id:'units',value:{v:{weight:'kg',height:'cm',food:'oz'}}}],'смена единиц еды пишет одно поле units');
 assert.equal(P.read(oz).units.food,'oz');assert.equal(P.read(oz).units.weight,'kg','вес остаётся в кг');
 assert.equal(P.read([{id:'units',value:{v:{weight:'lb',height:'cm',food:'cups'}}}]).units.food,'metric','неизвестное значение — граммы');
 assert.equal(P.read([{id:'photo',value:{v:'javascript:alert(1)'}}]).photo,'','фото — только картинка data:image');}
/* вес: замер на дату */
{let records=[];const apply=list=>{const map=new Map(records.map(r=>[r.id,r]));for(const c of list){if(c.deleted)map.delete(c.id);else map.set(c.id,{id:c.id,value:c.value})}records=[...map.values()]};
 apply(M.saveChanges(M.read(records),{date:'2026-11-01',values:{weight:80,waist:84},source:'Мой замер',note:''}));
 apply(P.weightChanges(records,'2026-11-10',79.4));
 assert.deepEqual(plain(P.weightsOf(records)),[{date:'2026-11-01',kg:80},{date:'2026-11-10',kg:79.4}],'новый вес — новый замер, прежний не переписан');
 apply(P.weightChanges(records,'2026-11-01',80.6));
 const first=M.read(records).list.find(m=>m.date==='2026-11-01');
 assert.equal(first.values.weight,80.6);assert.equal(first.values.waist,84,'вес за ту же дату правит замер этой даты, талия на месте');
 assert.equal(M.read(records).list.length,2);
 assert.throws(()=>P.weightChanges(records,'2026-11-11',5),/вес/i);
 assert.equal(P.ageAt('1990-05-14','2026-05-13'),35);assert.equal(P.ageAt('1990-05-14','2026-05-14'),36);}

/* ── цели веса: одна модель для колеса, линейки и поля ── */
{const g0=Object.assign(G.weightOnly(null),{targetKg:80,anchorKg:80});
 assert.equal(G.moveWeight(g0,79.4,80).kind,'loss','левее диапазона ±0,5 — снижение');
 assert.equal(G.moveWeight(g0,80.6,80).kind,'gain','правее — набор');
 assert.equal(G.moveWeight(g0,80.3,80).kind,'maintain','внутри — поддержание');
 const recomp=G.chooseKind(g0,'recomp',80);assert.equal(recomp.targetKg,80);assert.equal(recomp.centralKind,'recomp');
 assert.equal(G.moveWeight(recomp,80.2,80).kind,'recomp','внутри диапазона остаётся последний центральный режим');
 const loss=G.chooseKind(recomp,'loss',80);assert.ok(loss.targetKg<80-loss.bandKg,'снижение переносит желаемый вес за границу диапазона');
 assert.equal(G.chooseKind(loss,'maintain',80).targetKg,80,'поддержание возвращает желаемый вес к текущему');
 const gain=G.chooseKind(g0,'gain',80);assert.ok(gain.targetKg>80+gain.bandKg);
 const wide=Object.assign({},g0,{bandKg:2});assert.equal(G.moveWeight(wide,78.5,80).kind,'maintain','ширину диапазона можно изменить');}
/* Meal: доли БЖУ и расчёт */
{let shares=[25,27,48];
 for(const [i,v] of [[0,40],[1,10],[2,80],[0,0],[1,100]]){shares=G.redistribute(shares,i,v);assert.ok(Math.abs(shares.reduce((a,b)=>a+b,0)-100)<1e-9,'доли — 100 %');assert.equal(Math.round(shares[i]),v)}
 const two=G.redistribute([25,27,48],0,50);assert.ok(Math.abs(two[1]/two[2]-27/48)<1e-9,'две другие доли — пропорционально');
 assert.equal(G.percentages([33.4,33.3,33.3]).reduce((a,b)=>a+b,0),100);
 const profile={birthday:'1996-01-01',heightCm:180,sex:'male'},calc={sex:'',activity:1.6,adjustment:10};
 assert.equal(G.calculation(profile,80,calc,'2026-11-16'),(10*80+6.25*180-5*30+5)*1.6,'Миффлин — Сан Жеор × активность');
 const base=Object.assign(G.weightOnly(null),{shares:[25,27,48],calc,method:'manual'});
 assert.equal(G.calculateGoal(Object.assign({},base,{kind:'maintain'}),profile,80,calc,'2026-11-16').calories,2850,'поддержание — без поправки, до 10 ккал');
 assert.equal(G.calculateGoal(Object.assign({},base,{kind:'loss'}),profile,80,calc,'2026-11-16').calories,2560,'снижение — минус 10 %');
 assert.equal(G.calculateGoal(Object.assign({},base,{kind:'gain'}),profile,80,Object.assign({},calc,{adjustment:20}),'2026-11-16').calories,3420,'набор — плюс поправка 0–20 %');
 assert.equal(G.calculation(Object.assign({},profile,{birthday:'2010-01-01'}),80,calc,'2026-11-16'),null,'расчёт — для 19–78 лет');
 assert.equal(G.calculation(Object.assign({},profile,{sex:''}),80,calc,'2026-11-16'),null,'без пола расчёта нет');
 const g=Object.assign({},base,{calories:2000});assert.deepEqual(G.grams(g).map(x=>Math.round(x*10)/10),[125,60,240],'граммы через 4 / 9 / 4 ккал');}
/* Sport: фокус отдельно от веса */
{const w=Object.assign(G.weightOnly(null),{kind:'loss',targetKg:76,anchorKg:78});
 const first=G.saveSport({},w,'strength','2026-11-16');assert.equal(first.versions.length,1);assert.equal(first.focus,'strength');
 const again=G.saveSport(first,w,'competition','2026-11-16');assert.equal(again.versions.length,1,'смена одного фокуса не повторяет цель веса');assert.equal(again.focus,'competition');
 const moved=G.saveSport(again,Object.assign({},w,{targetKg:75}),'competition','2026-11-17');assert.equal(moved.versions.length,2,'изменённый вес — новая версия с датой');
 assert.equal(G.saveSport({},w,'nonsense','2026-11-16').focus,'none');
 assert.equal(G.FOCUS.length,12);assert.equal(G.FOCUS[0].label,'Пока не выбран');
 assert.equal(G.goalFor(moved.versions,'2026-11-16').targetKg,76,'цель на дату — последняя версия не позже этой даты');}
/* Day: жизненный фокус, свои цели и темы */
{assert.equal(G.dayDraft(null).focus,'habits','новый выбор — со второй строки: видны соседи сверху и снизу');
 assert.equal(G.dayDraft({focus:'none',focusInitialized:true,topics:[]}).focus,'none','сохранённое «Пока не выбран» остаётся');
 assert.equal(G.dayDraft({focus:'sleep',focusInitialized:true}).focus,'sleep','сохранённая цель не заменяется начальной');
 let d=G.dayDraft(null);
 assert.equal(G.addCustom(d,'focus','   ').error,'Введите название');
 let r=G.addCustom(d,'focus','  Больше   времени для себя ','a1');assert.equal(r.error,'');d=r.draft;
 assert.equal(d.customFocuses[0].label,'Больше времени для себя','пробелы по краям убираются, повторные схлопываются');assert.equal(d.focus,'custom-a1','новая цель выбрана');
 r=G.addCustom(d,'focus','больше времени ДЛЯ себя','a2');assert.equal(r.draft.customFocuses.length,1,'повтор без учёта регистра выбирает существующую');
 r=G.addCustom(d,'focus','отслеживать эмоции','a3');assert.equal(r.draft.focus,'emotions');assert.equal(r.draft.customFocuses.length,1);
 r=G.addCustom(d,'topic','Творчество');d=r.draft;assert.deepEqual(plain(d.customTopics),['Творчество']);assert.ok(d.topics.includes('Творчество'),'новая тема сразу выбрана');
 r=G.addCustom(d,'topic',' сон ');assert.deepEqual(plain(r.draft.customTopics),['Творчество'],'тема «Сон» уже есть — не дублируется');assert.ok(r.draft.topics.includes('Сон'));
 assert.equal(G.addCustom(d,'topic','x'.repeat(80)).draft.customTopics.at(-1).length,60,'название — до 60 знаков');}
console.log('Passed: profile writes only changed fields, a new weight is a dated measurement and the same date corrects it; weight goal wheel and ruler share one model; macro shares stay 100 % and the prototype formula; Sport focus does not duplicate the weight goal; Day starts on the second row and adds own goals and topics without blanks or duplicates.');
