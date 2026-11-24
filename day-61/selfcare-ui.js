(function(root){
'use strict';
const C=root.HappyCare;
const titles={mind:'Осознанность',mood:'Отметить самочувствие',diary:'Дневник',activity:'Активность'};
const icons={mood:'+',mind:'<svg viewBox="0 0 24 24"><path d="M12 20V12M12 16C4 17 3 10 3 5c6 0 9 4 9 9M12 14c0-7 3-10 9-10 0 7-2 11-9 11"/></svg>',diary:'<svg viewBox="0 0 24 24"><path d="M16 3H5a2 2 0 0 0-2 2v15h15v-7M7 8h5M7 12h3M14 11l6-6 2 2-6 6-3 1z"/></svg>'};
/* «Активность»: белый человечек в наклоне вбок (рисунок Астамура от 10.11, одобрен 10.11) вместо силуэта Айко. */
icons.activity='<span class="activity-icon"></span>';
/* 57.3: «Открыть Sport ↗» ведёт на текущий выпуск Sport. Адрес подставляет shared/happy-links.js из shared/apps.json
   (как у кнопки «Happy Sport» в настройках); ниже — запасной, если список выпусков не загрузился. Раньше здесь стоял
   адрес тестовой сборки от 04.11. */
const STRONG_URL='https://astamurberlin-rgb.github.io/happyamurio/sport-45/';
let strongLinks=null;
function strongLink(){try{if(!root.HappyLinks)return;strongLinks=strongLinks||root.HappyLinks.load();strongLinks.then(function(apps){if(apps)root.HappyLinks.apply(apps)})}catch(e){}}
/* Day 59: тренировки и плановые занятия Happy Sport приходят из его витрины — документы summary и plans общего
   модуля (формат — shared/happy-sport-summary.js). На том же устройстве они видны сразу, с другого — после обмена.
   В дневник Day не записываются. Пока связь с Sport выключена, начатое после выключения не отмечается. */
const SS=root.HappySportSummary||null;
let sportDays=[];
function sportApply(){
 const store=root.DayData&&root.DayData.signedIn()?root.DayData.store:null;
 if(!SS||!store){C.sportDay=null;C.sportPlans=null;sportDays=[];return;}
 const AL=typeof DayAppLinks!=='undefined'?DayAppLinks:null,on=x=>!AL||AL.sportOn(x.start);
 const byDay=Object.create(null),planDays=Object.create(null),put=(map,x)=>(map[x.start.slice(0,10)]||(map[x.start.slice(0,10)]=[])).push(x);
 for(const w of SS.workouts(store.neighbor('sport','summary').all()))if(on(w))put(byDay,w);
 for(const p of SS.active(SS.plans(store.neighbor('sport','plans').all())))if(on(p))put(planDays,p);
 C.sportDay=function(date){return byDay[date]||[];};C.sportPlans=function(date){return planDays[date]||[];};
 sportDays=Object.keys(byDay);
}
function sportRepaint(){
 try{if(typeof renderDay==='function')renderDay();}catch(e){}
 if(!ready)return;
 try{renderNow();}catch(e){}
 try{if(block('activity')?.classList.contains('on'))renderActivity();}catch(e){}
}
function sportChanged(){sportApply();sportRepaint();}
/* после запуска хранилища: читать витрину Sport и перерисовывать при каждой её правке */
function sportStart(){
 const store=root.DayData&&root.DayData.signedIn()?root.DayData.store:null;
 if(store&&SS)for(const name of ['summary','plans'])store.neighbor('sport',name).subscribe(sportChanged);
 sportApply();
}
const h=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const $=id=>document.getElementById(id);
const num=v=>(Math.round(v*10)/10).toLocaleString('ru-RU');
/* Поля даты, времени, выбора и числа — общий кусок shared/happy-fields.js (аудит Day 20.11.2026, п. 1–5, 30): рамка 48,
   строка по центру 14 / 600, у числа единица внутри («15 мин»), нажатие мимо поля отпускает поле. */
const HF=root.HappyFields;
const numField=(attrs,unit)=>HF.number(attrs,unit);
const minutesOf=v=>HF.parse(v);
const pct=v=>Math.round(v*100);
const signed=v=>(v>0?'+':v<0?'−':'')+Math.abs(pct(v));
const empty=t=>'<p class="care-empty">'+h(t)+'</p>';
let ready=false,active='mood',currentEntry=null,busy=false;
let session=null,railTimer=null,railPainting=false,pendingWheel=null;
/* Day 60.4: колеса разделов нет (Day 60.3, решение Астамура 17.11.2026) — его код убран. */
const CURRENT='care_current';
function data(){return C.init(DB,todayISO());}
function block(name){return document.querySelector('[data-screen="care-'+name+'"]');}
function guard(date){if(writeGuard())return false;if(date>todayISO()){toast('Будущие события пока не отмечаем');return false;}if(DB.days[date]?.locked){toast('День закрыт — открой замок, чтобы менять');return false;}return true;}
/* Day 59: запись сразу, через общий модуль (saveNow в index.html); без входа и для записей более новой версии — отказ. */
async function commit(){
 if(RO)throw Error(RO_TEXT);
 if(!DayData.signedIn()){askSignIn();throw Error('Войди в аккаунт Happy, чтобы записывать');}
 if(!saveNow())throw Error('Не получилось сохранить');
 renderNow();
}
async function transact(fn){
 if(busy)return;busy=true;const before=JSON.stringify(DB);
 try{fn();await commit();return true;}
 catch(e){Object.keys(DB).forEach(k=>delete DB[k]);Object.assign(DB,JSON.parse(before));toastLong(e.message||'Не получилось сохранить');return false;}
 finally{busy=false;}
}
function init(){
 data();if(ready)return;ready=true;
 const app=document.querySelector('.app');
 ['updates','diary','entry','mind','activity','settings-state','settings-diary','settings-mood','settings-activity','settings-mind'].forEach(k=>{const s=document.createElement('section');s.className='screen care-screen';s.dataset.screen='care-'+k;app.appendChild(s);});
 const settings=document.createElement('section');settings.className='care-settings';settings.id='careSettings';
 $('daySectionSettingsHeading').before(settings);
 document.addEventListener('click',click);
 document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('[data-care-plan-edit],[data-care-log-edit]')){e.preventDefault();e.target.click();}});
 document.addEventListener('click',function(e){const b=e.target.closest('[data-care-event]');if(!b)return;const v=JSON.parse(b.dataset.careEvent);journalOpen(v.kind,v.id,v.date,v.additionId);});
 document.addEventListener('submit',submit);
 document.addEventListener('focusout',leavePractice);
 HF.watch('.care-form input[type=date],.care-form input[type=time],.care-form input[type=datetime-local],.care-form select,.care-form input[data-unit],.fieldrow input[data-unit]');
 document.addEventListener('change',change);
 document.addEventListener('input',input);
 const rail=$('nwRail');
 active=data().settings.active||'mood';
 /* Кнопка в центре светлеет сразу, пока листаешь, а не после остановки: ожидание выглядело как задержка сети.
    Запоминается центральная кнопка по-прежнему после остановки. Day 60.2, шаг 1 — 16.11.2026, Claude. */
 let sideFrame=0;
 rail.addEventListener('scroll',()=>{if(!sideFrame)sideFrame=requestAnimationFrame(()=>{sideFrame=0;if(!railPainting&&rail.closest('.screen').classList.contains('on'))nwSide();});clearTimeout(railTimer);railTimer=setTimeout(()=>{if(railPainting||!rail.closest('.screen').classList.contains('on'))return;nwSide();const slide=rail.children[NW.idx];if(slide)rememberActive(slide.dataset.careKey);},160);},{passive:true});
 bindSettingsOrder();bindSettingsOrder(block('settings-state'),()=>data().settings.order);
 window.addEventListener('resize',()=>{center(false);if(session)requestAnimationFrame(renderNote);});
 document.querySelector('.nwWg').setAttribute('aria-label','Сейчас');
 rail.setAttribute('aria-label','Кнопки-виджеты дневника');
 $('nwTags').hidden=true;
 const config=document.createElement('div');config.id='careSectionConfig';block('settings-mood').append(config);
 config.addEventListener('click',e=>sectionSettingsClick(e,config));bindSectionDrag(config);
 bindCareNavigation();initNowSave();
 renderSettings();
}
function header(title,parent='day',date=true){
 return '<div class="grip care-grip" role="button" tabindex="0" data-care-close="'+parent+'" aria-label="Закрыть"><i></i></div><div class="top"><h1>'+h(title)+'</h1></div>'+(date?'<p class="care-date">'+h(ruDate(curDate))+'</p>':'');
}
function closeCurrent(){
 if(closeSheet())return true;
 const screen=document.querySelector('.screen.on');
 if(screen?.dataset.screen==='ring'){const dest=session?.returnTo||'day';go(dest);renderDay();return true;}
 const grip=screen?.querySelector('[data-care-close]');if(!grip)return false;
 const dest=grip.dataset.careClose;if(dest.startsWith('care-'))open(dest.slice(5));else go(dest);return true;
}
function bindCareNavigation(){
 let drag=null;
 /* Day 60.4: на экране отметок жест вниз уводит всё, кроме кольца с кнопкой: кольцо стоит на месте, как при переходе с главной. Другие экраны уезжают целиком. */

 function sheetMove(screen,dy,anim){const ring=screen.dataset.screen==='ring';
  /* Day 61.7: раздел закрывается «заворотом» (sheet-fold.js): палец ведёт лист, отпустили рано — лист ложится обратно */
  if(ring&&globalThis.SheetFold?.supported()){if(dy)SheetFold.drag(dy);else if(anim)SheetFold.release();return;}
  const parts=ring?[...document.querySelectorAll('#sectionPanel>:not(.swipeZone)')]:[screen];for(const el of parts){el.style.transition=anim?'transform .24s cubic-bezier(.22,.75,.25,1),opacity .24s':'none';el.style.transform=dy?'translateY('+dy+'px)':'';el.style.opacity=ring&&dy?String(Math.max(0,1-Math.pow(dy/320,3))):'';   /* почти без прозрачности: 100 точек — 97 %, 180 — 82 %, 250 — 52 % (Астамур 17.11.2026: «ещё менее прозрачные») */}
  /* Надпись на кнопке и цветное заполнение дуги гаснут по мере жеста (сама кнопка и серая дорожка стоят): 60 точек — 70 %, 120 — 40 %, 200 — 0. Главная после закрытия показывает свою надпись. */
  if(ring)for(const el of document.querySelectorAll('[data-screen="ring"] .ringSlide .knob>span,[data-screen="ring"] .ringSlide circle.fill')){el.style.transition=anim?'opacity .24s':'none';el.style.opacity=dy?String(Math.max(0,1-dy/200)):'';}}
 function sheetRest(screen){if(screen.dataset.screen==='ring'&&globalThis.SheetFold?.supported())return;setTimeout(()=>sheetMove(screen,0,false),260);}
 document.addEventListener('pointerdown',e=>{const grip=e.target.closest('.care-grip,#cpGrip');if(!grip)return;const screen=grip.closest('.screen');drag={grip,screen,y:e.clientY,dy:0,t:performance.now(),t0:performance.now()};grip.setPointerCapture(e.pointerId);sheetMove(screen,0,false);});
 document.addEventListener('pointermove',e=>{if(!drag)return;const now=performance.now(),ndy=Math.max(0,e.clientY-drag.y);if(now>drag.t)drag.v=(ndy-drag.dy)/(now-drag.t);drag.t=now;drag.dy=ndy;sheetMove(drag.screen,drag.dy,false);});
 /* аудит 20.11.2026, п. 16 (Астамур): закрывает и жест вниз, и нажатие на ручку (нажатие — палец почти не сдвинулся) */
 const finish=cancel=>{if(!drag)return;const d=drag;drag=null;const tap=!cancel&&d.dy<6&&performance.now()-d.t0<450;const close=tap||(!cancel&&(d.dy>70||(d.dy>24&&(d.v||0)>.25)));if(!close)sheetMove(d.screen,0,true);/* Day 60.2, шаг 8: закрывает только жест вниз — протянуть на 70 точек или смахнуть вниз (скорость в конце жеста больше 0,25 точки за мс); простое нажатие на черточку больше не закрывает */
  if(close)closeCurrent();sheetRest(d.screen);};
 document.addEventListener('pointerup',()=>finish(false));document.addEventListener('pointercancel',()=>finish(true));
 document.addEventListener('keydown',e=>{if(e.target.matches('.care-grip,#cpGrip')&&['Enter',' '].includes(e.key)){e.preventDefault();closeCurrent();}});
}
function onNavigate(name){if(name!=='ring'&&session?.autosave)commitSection(session);if(name!=='ring')cancelWheelSpeech();if(session&&!session.readOnly)stashWheel();document.body.classList.toggle('wheel-editing',name==='ring'&&!!session&&!session.readOnly); document.body.classList.toggle("now-editing",name==="ring"&&isCheckin()&&!session.readOnly);updateNowSave();if(session&&!session.readOnly&&CURS[cur])rememberScale(CURS[cur].k);if(session&&(name!=='ring'||curSec!==CURRENT)){session=null;if(curSec===CURRENT)curSec=DB.sections[0]?.k||'wake';}}
function checkinSection(){if(session?.readOnly)return {...data().checkinSection,t:session.sectionTitle||'Сейчас',scales:Object.keys(session.defs||{}),tags:Object.keys(session.checkpoint.tags||{})};const section=session?.target&&DB.sections.find(x=>x.k===session.target);const raw=section?{...section,k:CURRENT}:data().checkinSection,base={...raw,scales:[...raw.scales],tags:[...new Set([...raw.tags,...Object.keys(session?.checkpoint?.tags||{}).filter(k=>session.checkpoint.tags[k])])]};if(!session?.travelling)return base;return {...base,scales:[...new Set([...base.scales,...Object.keys(session.checkpoint).filter(k=>Number.isFinite(session.checkpoint[k])&&[...DB.metrics,...Object.values(session.defs||{})].some(m=>m.k===k))])],tags:[...new Set([...base.tags,...Object.keys(session.checkpoint.tags||{}).filter(k=>session.checkpoint.tags[k])])]};}
/* Свой тег в режиме «Отметить самочувствие»: checkinSection() каждый раз собирает список заново,
   поэтому тег, добавленный в его копию, жил только пока был отмечен. Записываем в настоящий список —
   в раздел, на который открыта отметка (Утро…), иначе в «Текущие отметки». */
function addCheckinTag(tag){
 if(!session)return false;
 const section=session.target&&DB.sections.find(x=>x.k===session.target);
 const holder=section||data().checkinSection;
 if(!Array.isArray(holder.tags))holder.tags=[];
 if(!holder.tags.includes(tag))holder.tags.push(tag);
 if(section&&!DB.tags.includes(tag))DB.tags.push(tag);
 return true;
}
function isCheckin(){return !!session&&curSec===CURRENT;}
function checkinReadOnly(){return isCheckin()&&session.readOnly;}
function checkinDay(){return {cp:{[CURRENT]:session.checkpoint}};}
function checkinScales(){return session?.readOnly?Object.values(session.defs):checkinSection().scales.map(k=>session?.defs?.[k]||DB.metrics.find(m=>m.k===k)).filter(Boolean);}
function checkinTime(){if(!isCheckin())return null;if(session.autosave&&typeof root.secStartOf==='function')return root.secStartOf(session.date,session.target,session.checkpoint);return {t:session.checkpoint.time,src:'manual'};}
function checkinDirty(){return !!session?.dirty;}
function restoreCheckinDirty(value){if(!session)return;if(session.autosave){scheduleSection();return;}session.dirty=value;if(value)stashWheel();else{delete data().wheelDrafts?.[session.date]?.[wheelDraftKey(session)];save();}updateNowSave();}
function saveCheckin(){ if(session?.autosave){scheduleSection();return;} if(session&&!session.readOnly){session.dirty=true;stashWheel();} updateNowSave(); }
/* 57.6: раздел, открытый с экрана дня, пишется сам — через 0,4 с после последней правки и сразу при уходе с экрана. */
let sectionTimer=0;
function scheduleSection(){if(!session?.autosave||session.readOnly)return;clearTimeout(sectionTimer);const s=session;sectionTimer=setTimeout(()=>commitSection(s),400);}
async function commitSection(s){
 clearTimeout(sectionTimer);if(!s?.autosave||s.readOnly)return true;
 if(busy){sectionTimer=setTimeout(()=>commitSection(s),200);return false;}
 if(RO||s.date>todayISO()||DB.days[s.date]?.locked)return false;
 const edited=C.copy(s.checkpoint);
 return transact(()=>{const d=day(s.date);d.cp=d.cp||{};const next=C.editSection(d.cp[s.target],s.baseline,edited,s.visit,{t:nowHM(),ms:Date.now()});if(next)d.cp[s.target]=next;else delete d.cp[s.target];const w=data().wheelDrafts?.[s.date];if(w&&w[s.target]&&!w[s.target].travelling)delete w[s.target];});
}
function toNewRecord(s){
 const baseline=s.baseline||{},cp=s.checkpoint||{},entered={time:cp.time||nowHM(),tags:{}};
 for(const m of DB.metrics)if(Number.isFinite(cp[m.k])&&cp[m.k]!==baseline[m.k])entered[m.k]=cp[m.k];
 for(const [tag,value]of Object.entries(cp.tags||{}))if(value&&value!==baseline.tags?.[tag])entered.tags[tag]=true;
 if(cp.note&&cp.note!==baseline.note)entered.note=cp.note;
 s.defs=Object.fromEntries(DB.metrics.map(m=>[m.k,C.copy(m)]));s.originKey=s.target||CURRENT;s.originTitle=DB.sections.find(x=>x.k===s.target)?.t||'Сейчас';
 s.checkpoint=entered;s.id=C.uid();s.travelling=true;s.baseline={};
 s.dirty=Object.keys(entered.tags).length>0||!!entered.note||DB.metrics.some(m=>Number.isFinite(entered[m.k]));
}
let undoNow=null;
function wheelHasEntry(){return !!session&&(checkinSection().scales.some(k=>Number.isFinite(session.checkpoint[k]))||Object.values(session.checkpoint.tags||{}).some(Boolean)||!!String(session.checkpoint.note||'').trim());}
function updateNowSave(){
 const b=document.getElementById('nowSave');if(!b)return;
 const canSave=!!session&&session.dirty;b.disabled=busy||!session; b.dataset.dirty=canSave;document.body.classList.toggle('now-dirty',canSave); b.innerHTML=canSave?'Сохранить':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';b.setAttribute('aria-label',canSave?'Сохранить в журнал':'Продиктовать заметку'); renderNote();
}
async function submitNow(){
 if(busy||!session||session.readOnly)return;
 if(!session.dirty){dictateWheel();return;}
 if(!guard(session.date))return;
 if(session.travelling){await saveTravellingCheckin();return;}
 if(session.target){toNewRecord(session);await saveTravellingCheckin();return;}   // 57.6: «Сохранить» значения раздела не заменяет — только новая запись
 const original=session,draft=C.copy(session);let record;pendingWheel={session:original,value:JSON.stringify(draft.checkpoint)};
 const ok=await transact(()=>{record=C.saveSectionCheckin(DB,draft.date,draft.id,draft.checkpoint,DB.metrics,checkinSection());if(!record)throw Error('Сначала отметь самочувствие или тег');record.note=draft.checkpoint.note||'';delete data().wheelDrafts?.[draft.date]?.[CURRENT];});
 pendingWheel=null;if(!ok){updateNowSave();return;}
 undoNow=draft;if(session===original&&JSON.stringify(session.checkpoint)===JSON.stringify(draft.checkpoint)){session=null;go('day');renderDay();toast('Запись сохранена в журнале',undoNowSave,'Вернуть',6000);}else if(session===original){stashWheel();updateNowSave();}
}
async function saveTravellingCheckin(){
 if(busy||!session?.dirty||!guard(session.date))return;
 const original=session,draft=C.copy(session),definition=C.copy(checkinSection());pendingWheel={session:original,value:JSON.stringify(draft.checkpoint)};
 const ok=await transact(()=>{const record=C.saveSectionCheckin(DB,draft.date,draft.id,draft.checkpoint,[...Object.values(draft.defs||{}),...DB.metrics.filter(m=>!draft.defs?.[m.k])],definition);if(!record)throw Error('Сначала отметь шкалу, тег или заметку');record.sectionKey=draft.target||CURRENT;record.sectionTitle=definition.t;record.sourceSectionKey=draft.originKey;record.sourceSectionTitle=draft.originTitle;delete data().wheelDrafts?.[draft.date]?.care_travelling;});
 pendingWheel=null;if(!ok){updateNowSave();return;}if(session===original&&JSON.stringify(session.checkpoint)===JSON.stringify(draft.checkpoint)){session=null;go('day');renderDay();}else if(session===original){stashWheel();updateNowSave();}toastLong('Новая запись: '+definition.t+' · '+ruDate(draft.date));
}

async function undoNowSave(){
 if(busy||!undoNow||!guard(undoNow.date))return;
 const draft=C.copy(undoNow);
 const ok=await transact(()=>{const list=C.dayData(DB,draft.date).checkins;const i=list.findIndex(x=>x.id===draft.id);if(i>=0)list.splice(i,1);});
 if(!ok)return;
 undoNow=null;curDate=draft.date;
 session=draft;curSec=CURRENT;buildTracks();cur=Math.max(0,CURS.findIndex(m=>m.k===data().settings.activeScale));renderCpTags();$('cpName').textContent='Сейчас';paintCpMeal();go('ring');updateNowSave();
}
function initNowSave(){
 const b=document.createElement('button');b.id='nowSave';b.className='now-save';b.textContent='Сохранить';b.onclick=submitNow;document.body.append(b);
}


function wheelDraftKey(draft){return draft.travelling?'care_travelling':draft.target||CURRENT;}
function stashWheel(){if(!session||session.readOnly||!session.dirty)return;if(pendingWheel?.session===session&&pendingWheel.value===JSON.stringify(session.checkpoint))return;const d=data();d.wheelDrafts=d.wheelDrafts||{};d.wheelDrafts[session.date]=d.wheelDrafts[session.date]||{};d.wheelDrafts[session.date][wheelDraftKey(session)]=C.copy(session);if(session.dirty)save();}
function prepareSectionPanel(){
 const screen=document.querySelector('[data-screen="ring"]');let panel=$('sectionPanel');
 if(!panel){panel=document.createElement('div');panel.id='sectionPanel';while(screen.firstChild)panel.append(screen.firstChild);screen.append(panel);const header=document.createElement('div');header.className='section-form-header';panel.prepend(header);['cpGrip'].forEach(k=>header.append($(k)));header.append($('cpName').closest('.top'));$('swipeZone').after($('cpMeal'));}
 return panel;
}
let recognition=null;
function cancelWheelSpeech(){if(recognition){const active=recognition;recognition=null;active.abort();}}

/* Кнопка-микрофон — в вырезе нижнего меню; есть что сохранить — пилюля «Сохранить» над меню (аудит 20.11.2026, п. 25).
   Под тегами — поле заметки. Раньше это делало колесо разделов. */
function renderNote(){
 if(!session||session.readOnly)return;
 const dock=document.querySelector('.dock'),fab=$('fab'),action=$('nowSave');
 if(dock&&fab&&action){const d=dock.getBoundingClientRect();if(action.dataset.dirty==='true')action.style.bottom=(innerHeight-d.top+14)+'px';else{const cy=parseFloat(fab.style.top)||18,size=60;action.style.bottom=(innerHeight-(d.top+cy)-size/2)+'px';}}
 let note=$('wheelNote');if(!note){note=document.createElement('textarea');note.id='wheelNote';note.placeholder='Заметка к этому разделу';note.setAttribute('aria-label','Заметка к выбранному разделу');$('cpTags').after(note);note.addEventListener('input',()=>{if(session&&!session.readOnly){session.checkpoint.note=note.value;saveCheckin();}});}if(document.activeElement!==note)note.value=session.checkpoint.note||'';
}
function dictateWheel(){
 const Speech=root.SpeechRecognition||root.webkitSpeechRecognition;if(!Speech){toastLong('Диктовка здесь не работает. Отметь шкалу или тег — появится «Сохранить».');return;}
 if(recognition)return;const target=session;recognition=new Speech();const engine=recognition;recognition.lang='ru-RU';recognition.onresult=e=>{if(recognition!==engine)return;target.checkpoint.note=(target.checkpoint.note?target.checkpoint.note+'\n':'')+e.results[0][0].transcript;if(target.autosave){if(session===target){const note=$('wheelNote');if(note)note.value=target.checkpoint.note;}commitSection(target);toast('Заметка добавлена');return;}target.dirty=true;const d=data();d.wheelDrafts=d.wheelDrafts||{};d.wheelDrafts[target.date]=d.wheelDrafts[target.date]||{};d.wheelDrafts[target.date][wheelDraftKey(target)]=C.copy(target);save();if(session===target)updateNowSave();toastLong('Диктовка добавлена в черновик: '+(DB.sections.find(s=>s.k===target.target)?.t||'Сейчас'));};recognition.onerror=()=>toast('Не удалось разобрать речь. Попробуй ещё раз');recognition.onend=()=>{if(recognition===engine)recognition=null;};try{recognition.start();}catch(e){recognition=null;toast('Диктовка здесь не работает');}
}

function openMood(recordId,returnTo='day',explicitKey=null){
 const panel=prepareSectionPanel(),home=document.querySelector('[data-screen="day"].on .ringWrap.nwR');if(home){const top=home.getBoundingClientRect().top+home.closest('.screen').scrollTop;document.documentElement.style.setProperty('--section-arc-top',Math.max(90,top)+'px');}
 const record=recordId?C.readDay(DB,curDate).checkins.find(x=>x.id===recordId):null;
 const checkpoint={time:record?.time||nowHM(),note:record?.note||'',tags:C.copy(record?.tags||{})},defs=C.copy(record?.metricDefs||{});
 if(record){Object.assign(checkpoint,record.metricValues||{});const old={feeling:['Самочувствие',-3,3],joy:['Радость',0,4],strain:['Напряжение',0,4]};for(const [key,value]of Object.entries(record.values||{})){const d=old[key];if(d){defs[key]={k:key,t:d[0],lo:d[1],hi:d[2],w:[],neg:key==='strain'};checkpoint[key]=value;}}}
 session={id:record?.id||C.uid(),date:curDate,checkpoint,defs,readOnly:!!record,returnTo,sectionTitle:record?.sectionTitle,sourceSectionTitle:record?.sourceSectionTitle}; if(!record){
  /* 57.6 (решение владельца 11.11.2026). Вход через раздел дня (explicitKey) — раздел сохраняется сам, без «Сохранить»;
     у каждой шкалы и тега своё время (C.editSection). Кнопка «Отметить самочувствие» — каждое «Сохранить» новая
     запись в журнал с выбранным разделом; значения раздела она не меняет и форма открывается пустой. */
  /* Day 60.3 (17.11.2026): кнопка «Отметить самочувствие» сразу открывает раздел «Сейчас»
     (шкалы и теги — в «Настройки «Сейчас»»), без колеса разделов и без выбора раздела по времени суток. */
  const key=explicitKey||CURRENT,drafts=data().wheelDrafts?.[curDate]||{};
  if(explicitKey&&key!==CURRENT){
   const stored=C.copy(DB.days[curDate]?.cp?.[key]||{}),old=drafts[key];
   session={...session,target:key,checkpoint:Object.keys(stored).length?C.copy(stored):{tags:{}},baseline:stored,autosave:true,visit:{id:C.uid(),at:{},tags:{}},dirty:false};
   if(old&&!old.travelling&&old.checkpoint)session.checkpoint=C.copy(old.checkpoint);   // несохранённый черновик 57.5 — сохраняется сразу
  }else{
   const saved=drafts[key];
   session=saved?C.copy(saved):{...session,target:key===CURRENT?null:key,checkpoint:{time:nowHM(),tags:{}},baseline:{},dirty:false};
   if(session.target&&!session.travelling)toNewRecord(session);
  }
  delete session.destination;if(!session.baseline)session.baseline={};session.returnTo=returnTo;
  if(session.autosave&&drafts[key]&&!drafts[key].travelling)scheduleSection();
 }curSec=CURRENT;cur=0;
 let recordNote=$('careRecordNote');if(!recordNote){recordNote=document.createElement('p');recordNote.id='careRecordNote';recordNote.className='care-help';recordNote.style.whiteSpace='pre-wrap';$('cpTags').after(recordNote);}recordNote.hidden=!record;recordNote.textContent=record?[(record.sourceSectionTitle?'Форма: '+record.sourceSectionTitle:''),record.note||''].filter(Boolean).join('\n'):'';buildTracks();if(!record)cur=Math.max(0,CURS.findIndex(m=>m.k===data().settings.activeScale));renderCpTags();$('cpName').textContent=record?(record.sectionTitle||'Сейчас'):(session.target?checkinSection().t:'Сейчас');paintCpMeal();go('ring');updateNowSave();document.querySelector('[data-screen="ring"]').scrollTop=0;
}
function open(kind,id,parent){
 init();if(['mind','mood','diary','activity'].includes(kind)&&!id)rememberActive(kind);if(kind==='mood'){openMood(id,parent||'day');return;}
 if(kind==='updates')renderUpdates();
 else if(kind.startsWith('settings-'))renderSettingsPage(kind.slice(9));
 else if(kind==='diary')renderDiary();else if(kind==='entry'){currentEntry=id;renderEntry();}else if(kind==='mind')renderMind();else if(kind==='activity')renderActivity();
 go('care-'+kind);block(kind).scrollTop=0;
 if(kind==='mind'&&id)practiceSheet(id);
 if(parent){const grip=block(kind).querySelector('[data-care-close]');if(grip)grip.dataset.careClose=parent;}
}
function renderUpdates(){
 const releases=root.HappyDayReleases||[];
 // Update 53: the shared Happy module draws every entry (label, date, changes, author and time of the release).
 const cards=root.HappyReleaseNotes?root.HappyReleaseNotes.render(releases,{heading:'h2'}).replaceAll('class="happy-card happy-release"','class="card release-card happy-release"'):releases.map(r=>'<article class="card release-card"><h2>'+h(r.title||r.label||('Версия '+r.version))+'</h2><time datetime="'+h(r.date)+'">'+h(r.date.split('-').reverse().join('.'))+'</time><ul>'+r.changes.map(t=>'<li>'+h(t)+'</li>').join('')+'</ul></article>').join('');
 block('updates').innerHTML=header('История обновлений','settings',false)+'<p class="care-help">Happy Day</p>'+cards;
}
/* Какая карточка «Сейчас» открыта последней — запоминается вместе с дневником, но это не запись человека:
   без входа просто не запоминаем (иначе листание карточек открывало бы вход). */
function rememberActive(key){if(!key)return;active=key;const s=data().settings;if(s.active!==key){s.active=key;if(!RO&&DayData.signedIn())save();}}
function rememberScale(key){if(!isCheckin()||session.readOnly)return;const s=data().settings;if(s.activeScale!==key){s.activeScale=key;if(!RO&&DayData.signedIn())save();}}
function center(smooth){const i=[...$('nwRail').children].findIndex(x=>x.dataset.careKey===active);if(i>=0)nwGo(i,smooth);}
function arcPath(a,b){const p=t=>[120+92*Math.cos(t*Math.PI/180),120+92*Math.sin(t*Math.PI/180)];const s=p(a),e=p(b);return 'M'+s.join(',')+' A92,92 0 0 '+(b>a?1:0)+' '+e.join(',');}
/* Баланс самочувствия (лаборатория Day 60, 16.11.2026): дуги позитива и негатива рисует HappyArc.balance на холсте
   .care-balance — цвета, плавный стык наверху и растворяющиеся концы из Студии дуг (вариант 3). Дорожка — одной дугой,
   без точки наверху: две половины с круглыми концами давали светлое пятно в месте стыка. */
function balanceArc(m){
 const p=t=>(120+92*Math.cos(t*Math.PI/180))+','+(120+92*Math.sin(t*Math.PI/180));
 return '<canvas class="care-balance" aria-hidden="true" data-pos="'+(m.positive||0)+'" data-neg="'+(m.negative||0)+'"></canvas>'+
 '<svg class="care-arc" viewBox="0 0 240 240" aria-hidden="true"><path class="care-track" d="M'+p(122)+' A92,92 0 1 1 '+p(58)+'"/></svg>';
}
function regularArc(f,k){return ringSvg({w:[]},'care-'+k).replace('stroke-dasharray="0 '+CIRC+'"','stroke-dasharray="'+(TRACK*C.clamp(f))+' '+CIRC+'" style="visibility:'+(f>0?'visible':'hidden')+'"');}
function renderNow(){
 init();const c=data(),m=C.mood(DB,curDate),dg=C.diaryProgress(DB,curDate),mg=C.mindGoal(c,curDate),mins=C.mindMinutes(DB,curDate),a=C.activity(c,curDate);
 const visible=c.settings.order.filter(k=>!c.settings.hidden.includes(k));
 document.querySelector('.nwWg').hidden=!visible.length;document.querySelector('.nwEb').hidden=!visible.length;
 if(!visible.includes(active))rememberActive(visible.includes('mood')?'mood':visible[0]);
 const arcs={mind:regularArc(C.progress(mins,mg.value),'mind'),diary:regularArc(C.progress(dg.count,dg.goal),'diary'),mood:balanceArc(m),activity:regularArc(C.progress(a.minutes,a.goal),'activity')};
 if(c.settings.moodView==='positive')arcs.mood=regularArc(m.positive||0,'mood');
 if(c.settings.moodView==='negative')arcs.mood=regularArc(m.negative||0,'mood');
 if(c.settings.moodView==='coverage')arcs.mood=regularArc(C.progress(m.count,c.settings.checkinGoal),'mood');
 railPainting=true;clearTimeout(railTimer);
 const selectedScale=DB.metrics.find(m=>m.k===c.settings.activeScale&&c.checkinSection.scales.includes(m.k));
 $('nwRail').innerHTML=visible.map((k,i)=>'<div class="nwSl'+(k===data().settings.active?'':' side')+'" data-i="'+i+'" data-care-key="'+k+'"><div class="ringWrap nwR">'+arcs[k]+'<button class="knob care-knob" data-care-open="'+k+'" aria-label="'+h(titles[k])+'">'+(k==='mood'?'<strong class="care-name">Отметить<br>самочувствие</strong>':'<span class="care-symbol" aria-hidden="true">'+icons[k]+'</span>')+'</button></div><button class="care-ring-label" data-care-open="'+k+'">'+h(k==='mood'?'Сейчас':titles[k])+'</button></div>').join('');
 $('nwTags').innerHTML='';$('nwTags').hidden=true;requestAnimationFrame(()=>{center(false);requestAnimationFrame(()=>{railPainting=false;});});
}
function checkinText(x){
 const names={feeling:'Самочувствие',joy:'Радость',strain:'Напряжение'};
 return Object.entries(x.values||{}).map(([k,v])=>(names[k]||k)+': '+(v>0&&k==='feeling'?'+':'')+v).concat(Object.entries(x.metricValues||{}).map(([k,v])=>{const m=x.metricDefs?.[k]||DB.metrics.find(m=>m.k===k);return (m?.t||k)+': '+(m?valTxt(m,v):num(v));}),Object.keys(x.tags||{}).filter(k=>x.tags[k]),x.note?[x.note]:[]).join(' · ');
}
function renderDiary(){
 const c=data(),p=C.diaryProgress(DB,curDate);
 block('diary').innerHTML=header('Дневник')+'<div class="card"><div class="care-stat">'+p.count+(p.goal?' / '+p.goal:'')+'</div><p class="care-help">'+(p.goal?'Записей за выбранный день.':'Записи за выбранный день.')+' '+(C.plan(c,curDate).goals.countAdditions!==false?'Сохранённые дополнения тоже учитываются.':'Считаются только новые записи.')+'</p></div><form id="careDiaryForm" class="card care-form"><h2>Новая запись</h2><div class="care-wheel" data-diary-wheel></div><input type="hidden" id="careBook" name="book" value="'+h(c.books[0]?.id||'')+'"><label for="careDiaryTitle">Заголовок · необязательно</label><input id="careDiaryTitle" name="title" maxlength="120" type="text" placeholder="О чём эта запись?"><label for="careDiaryWhen">Дата и время</label><input id="careDiaryWhen" name="when" type="datetime-local" required max="'+todayISO()+'T23:59" value="'+curDate+'T'+nowHM()+'"><label for="careDiaryText">Текст</label><textarea id="careDiaryText" name="text" required placeholder="Можно начать с одной мысли…"></textarea><button class="btn solid care-submit" type="submit">Сохранить запись</button></form><label class="care-label" for="careDiarySearch">Найти запись</label><input id="careDiarySearch" type="search" placeholder="Поиск по дневникам" style="width:100%;padding:13px;border-radius:14px;border:1px solid var(--glassBrd);font-size:16px;margin:10px 0 15px"><div id="careDiaryList"></div>';
 renderDiaryList('');
 /* аудит 20.11.2026, п. 5 (Астамур): дневник выбирается колесом — три строки, выбранная посередине, листается
    вверх-вниз; кнопки с выпадающим списком нет. Колесо — общее, как «Выберите цель» в Meal (HappyScreens.wheel). */
 const wb=block('diary').querySelector('[data-diary-wheel]'),hid=$('careBook');
 /* 22.11.2026 (Астамур, аудит 3): дневник выбирается тем же барабаном, что и время (shared/happy-drum.js),
    одной широкой колонкой с подписью «Дневник». — Claude */
 if(wb&&hid&&HF&&HF.drum){wb.classList.add('care-book-drum');const i0=Math.max(0,c.books.findIndex(b=>b.id===hid.value));
  HF.drum(wb,{groups:[{label:'Дневник',cols:[{name:'b',label:'Дневник для записи',options:c.books.map((b,i)=>({v:i,t:b.name})),value:i0}]}],onChange:v=>{const b=c.books[v.b];if(b)hid.value=b.id;}});}
}
function renderDiaryList(query){const c=data(),q=query.trim().toLocaleLowerCase('ru'),entries=c.entries.filter(x=>(x.title+' '+x.text+' '+x.additions.map(a=>a.text).join(' ')).toLocaleLowerCase('ru').includes(q));
 $('careDiaryList').innerHTML=entries.slice().sort((a,b)=>b.createdAt-a.createdAt).map(e=>'<button class="card care-record" data-care-entry="'+h(e.id)+'"><time>'+h(ruDate(e.date))+' · '+h(e.time)+' · '+h(c.books.find(b=>b.id===e.bookId)?.name||'Дневник')+'</time><b>'+h(e.title)+'</b><p>'+h(e.text.slice(0,160))+(e.text.length>160?'…':'')+'</p><p class="care-help">'+(e.additions.length?'Дополнений: '+e.additions.length:'Открыть запись')+'</p></button>').join('')||empty(q?'Ничего не найдено.':'Здесь будут твои записи.');
}
function renderEntry(){const e=data().entries.find(x=>x.id===currentEntry);if(!e){open('diary');return;}
 block('entry').innerHTML=header('Запись','care-diary')+'<article class="card"><h2>'+h(e.title)+'</h2><p class="care-help">'+h(ruDate(e.date))+' · '+h(e.time)+'</p><div class="care-long">'+h(e.text)+'</div>'+e.additions.map(a=>'<section class="care-addition" id="addition-'+h(a.id)+'"><p class="care-help">Дополнение · '+h(ruDate(a.date))+' · '+h(a.time)+'</p><div class="care-long">'+h(a.text)+'</div></section>').join('')+'</article><form id="careAppendForm" class="card care-form"><h2>Дополнить запись</h2><p class="care-help">Дополнение будет отмечено в журнале за '+h(ruDate(curDate))+'. Исходная запись останется.</p><label for="careAppendText">Продолжение</label><textarea id="careAppendText" name="text" required></textarea><button class="btn solid care-submit" type="submit">Сохранить дополнение</button></form>';
}
const WD=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const PLUS='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const swDel=attr=>'<button class="swDel" '+attr+' hidden tabindex="-1" aria-hidden="true"></button>';
function planWhen(x){return x.kind==='once'?ruDate(x.date):[1,2,3,4,5,6,0].filter(i=>(x.days||[]).includes(i)).map(i=>WD[i].toLowerCase()).join(', ');}
/* 21.11.2026 (Астамур): в «Расписании» и «Выполнено» каждая строка — своя карточка, как в Sport и в Настройках Day;
   свайп влево уводит карточку целиком, «Убрать» — отдельная пилюля справа (row-swipe.js). */
/* Аудит Day 20.11.2026 (Астамур). Расписание практик живёт здесь, на странице «Осознанность», а не в Настройках (п. 32):
   «+» — новая практика листом снизу; нажал на строку — тот же лист с её полями; свайп влево — убрать с сегодняшнего дня.
   Записанную практику можно поправить и удалить (п. 28): нажал — лист с полями, «Сохранить» и красная «Удалить»; свайп — удалить.
   Удаление без вопроса, в сообщении «Вернуть» (п. 26). Карточка «Дыхание и медитации · В разработке» убрана (п. 38). */
function renderMind(){const c=data(),goal=C.mindGoal(c,curDate),minutes=C.mindMinutes(DB,curDate),today=new Set(C.scheduled(c,curDate).map(p=>p.id)),logs=C.readDay(DB,curDate).practices;
 const plans=c.schedule.filter(x=>x.enabled!==false&&(x.kind!=='once'||x.date>=todayISO())).sort((a,b)=>a.time.localeCompare(b.time));
 block('mind').innerHTML=header('Осознанность')+'<div class="card"><div class="care-stat">'+num(minutes)+(goal.value>0?' / '+num(goal.value):'')+' мин</div><p class="care-help">'+(goal.source==='schedule'?(goal.value?'Полный круг — сумма длительностей практик в расписании на этот день.':'На этот день практики не запланированы. Можно заниматься без цели.'):(goal.value?'Полный круг — твоя личная цель.':'Практики за выбранный день.'))+'</p></div>'+
 '<div class="eyebrow care-head-add"><span>Расписание</span><button type="button" class="care-add" data-care-plan-new aria-label="Добавить практику в расписание">'+PLUS+'</button></div>'+
 (plans.length?'<div class="care-cards">'+plans.map(p=>'<div class="card care-card"><div class="care-row swRow" data-care-plan-edit="'+h(p.id)+'" role="button" tabindex="0"><span class="care-row-t"><b>'+h(p.time)+' · '+h(p.name)+'</b><small>'+num(p.minutes)+' мин · '+h(planWhen(p))+'</small></span>'+(today.has(p.id)?'<button type="button" class="mini" data-care-practice="'+h(p.id)+'">Отметить</button>':'')+swDel('data-care-remove-plan="'+h(p.id)+'"')+'</div></div>').join('')+'</div>':empty('Расписание пустое. Добавить практику — «+».'))+
 '<form id="carePracticeForm" class="card care-form"><h2>Записать практику</h2><input type="hidden" name="planId" value=""><label for="carePracticeName">Название</label><input name="name" id="carePracticeName" type="text" placeholder="Медитация, дыхание…" maxlength="100"><div data-drum></div><input type="hidden" name="time" value="'+nowHM()+'"><input type="hidden" name="minutes" value=""><p class="care-help">План сам по себе не засчитывается. В дугу попадают сохранённые минуты практики и импортированные сессии осознанности; время просмотра приложения не учитывается.</p><button class="btn solid care-submit" type="submit">Сохранить практику</button></form>'+
 '<div class="eyebrow">Выполнено</div>'+(logs.length?'<div class="care-cards">'+logs.slice().reverse().map(x=>'<div class="card care-card"><div class="care-row swRow" data-care-log-edit="'+h(x.id)+'" role="button" tabindex="0"><span class="care-row-t"><b>'+h(x.time)+' · '+h(x.name)+'</b><small>'+num(x.minutes)+' мин</small></span>'+swDel('data-care-log-del="'+h(x.id)+'"')+'</div></div>').join('')+'</div>':empty('За этот день практик нет.'));
 const pf=$('carePracticeForm');if(pf)pf._drum=timeDurDrum(pf,pf.elements.time.value,0);
}
/* Лист снизу для расписания и практики: ручка, затемнение позади; закрыть — жест вниз, нажатие на ручку,
   нажатие мимо листа или «×» внизу (sheet-grip.js). */
function careSheet(html){
 let w=$('careSheet');
 if(!w){w=document.createElement('div');w.className='imp';w.id='careSheet';w.innerHTML='<div class="impScrim"></div><div class="impSheet care-sheet" role="dialog" aria-modal="true"></div>';$('toast').before(w);w.querySelector('.impScrim').addEventListener('click',closeSheet);}
 w.querySelector('.impSheet').innerHTML='<div class="grip imp-grip" role="button" tabindex="0" aria-label="Закрыть"><i></i></div>'+html;
 void w.offsetWidth;w.classList.add('on');return w.querySelector('.impSheet');
}
function closeSheet(){const w=$('careSheet');if(!w||!w.classList.contains('on'))return false;w.classList.remove('on');if(w.contains(document.activeElement))document.activeElement.blur();return true;}
/* Барабан для времени, даты и минут (Астамур 21.11.2026: «как в iPhone — большие цифры, карусель вертикальная») */
const pad2=n=>String(n).padStart(2,'0');
/* время и длительность — в одном виде 00:00: часы и минуты (длительность бывает больше часа; Астамур 21.11.2026);
   колёса — из общего shared/happy-drum.js, такие же в Sport */
const timeCols=t=>HF.drumTimeCols(t),durCols=min=>HF.drumDurationCols(min);
/* время и длительность рядом — два барабана, у каждого своя полоса; пишут в скрытые поля формы time и minutes */
function timeDurDrum(f,time,minutes){
 return HF.drum(f.querySelector('[data-drum]'),{groups:[{label:'Время',cols:timeCols(time)},{label:'Длительность',cols:durCols(minutes)}],
  onChange:v=>{const t=pad2(v.h)+':'+pad2(v.m),d=v.dh*60+v.dm;if(f.elements.time.value!==t)f.elements.time.value=t;
   if(String(f.elements.minutes.value)===''&&d===0)return;if(Math.round(Number(f.elements.minutes.value))!==d)f.elements.minutes.value=d;}});
}
function nextHour(){const d=new Date();d.setMinutes(0,0,0);d.setHours(d.getHours()+1);return {date:iso(d),time:String(d.getHours()).padStart(2,'0')+':00'};}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function planSheet(id){
 const c=data(),x=id?c.schedule.find(p=>p.id===id):null;if(id&&!x)return;
 const nh=nextHour(),kind=x?.kind||'once',days=x?.days||[],time=x?.time||nh.time,date=x?.kind==='once'?x.date:nh.date;
 careSheet('<form id="carePlanSheet" class="care-form care-sheet-form" data-plan-id="'+h(id||'')+'" novalidate><h3>'+(x?'Практика в расписании':'Новая практика')+'</h3>'+
  '<div class="care-seg" role="radiogroup" aria-label="Повторение">'+[['once','Один раз'],['weekly','По дням недели']].map(([k,t])=>'<button type="button" role="radio" data-plan-kind="'+k+'" aria-checked="'+(kind===k)+'">'+t+'</button>').join('')+'</div><input type="hidden" name="kind" value="'+kind+'">'+
  '<label for="carePlanName">Практика</label><input id="carePlanName" name="name" type="text" maxlength="100" placeholder="Например, утренняя медитация" value="'+h(x?.name||'')+'">'+
  '<div class="care-days" data-plan-days'+(kind==='weekly'?'':' hidden')+'>'+[1,2,3,4,5,6,0].map(i=>'<label><input type="checkbox" name="days" value="'+i+'"'+(days.includes(i)?' checked':'')+'><span>'+WD[i]+'</span></label>').join('')+'</div>'+
  '<div data-plan-once'+(kind==='once'?'':' hidden')+'><label for="carePlanWhen">Дата и время</label><input id="carePlanWhen" name="when" type="datetime-local" min="'+todayISO()+'T00:00" value="'+date+'T'+time+'"></div>'+
  '<div data-plan-weekly'+(kind==='weekly'?'':' hidden')+'><label for="carePlanTime">Время</label><input id="carePlanTime" name="time" type="time" value="'+time+'"></div>'+
  '<div data-drum></div><input type="hidden" name="minutes" value="'+(x?x.minutes:10)+'">'+
  '<button type="submit" class="btn solid care-submit">Сохранить</button>'+(x?'<button type="button" class="btn care-danger" data-care-remove-plan="'+h(x.id)+'">Убрать из расписания</button>':'')+'</form>');
 const f=$('carePlanSheet');
 /* длительность всегда справа, подпись сверху; один барабан — тоже в правой колонке (Астамур 21.11.2026, макет) */
 HF.drum(f.querySelector('[data-drum]'),{groups:[{label:'Длительность',cols:durCols(x?x.minutes:10)}],onChange:v=>{f.elements.minutes.value=v.dh*60+v.dm;}});
}
function practiceSheet(id){
 const x=C.readDay(DB,curDate).practices.find(p=>p.id===id);if(!x)return;
 careSheet('<form id="careLogSheet" class="care-form care-sheet-form" data-log-id="'+h(id)+'" data-log-date="'+curDate+'" novalidate><h3>Практика</h3>'+
  '<label for="careLogName">Название</label><input id="careLogName" name="name" type="text" maxlength="100" value="'+h(x.name)+'">'+
  '<div data-drum></div><input type="hidden" name="time" value="'+h(x.time)+'"><input type="hidden" name="minutes" value="'+x.minutes+'">'+
  '<button type="submit" class="btn solid care-submit">Сохранить</button><button type="button" class="btn care-danger" data-care-log-del="'+h(id)+'">Удалить</button></form>');
 const f=$('careLogSheet');timeDurDrum(f,x.time,x.minutes);
}
async function removePlan(id){
 if(RO){roWarn();return;}
 let removed=null,at=-1;
 if(!await transact(()=>{const c=data();at=c.schedule.findIndex(x=>x.id===id);if(at<0)return;removed=c.schedule.splice(at,1)[0];C.rememberPlan(c,todayISO());}))return;
 closeSheet();renderMind();if(!removed)return;
 toast('«'+removed.name+'» убрана из расписания',async()=>{if(await transact(()=>{const c=data();c.schedule.splice(Math.min(at,c.schedule.length),0,removed);C.rememberPlan(c,todayISO());}))renderMind();},'Вернуть',5000);
}
async function removeLog(id,date){
 if(!guard(date))return;
 let removed=null,at=-1;
 if(!await transact(()=>{const list=C.dayData(DB,date).practices;at=list.findIndex(x=>x.id===id);if(at<0)return;removed=list.splice(at,1)[0];}))return;
 closeSheet();if(curDate===date)renderMind();if(!removed)return;
 toast('Практика удалена',async()=>{if(!guard(date))return;if(await transact(()=>{const list=C.dayData(DB,date).practices;list.splice(Math.min(at,list.length),0,removed);})&&curDate===date)renderMind();},'Вернуть',5000);
}
/* «Съедено» за день — итог из сводки Meal и нажатия на счётчики еды, которые Meal ещё не посчитал (нажатие в Day
   попадает в кольцо сразу; правило — в shared/happy-food.js). Сводки нет или в дне нет ни еды, ни порций — null:
   «не записано», а не ноль. */
function mealFood(date){
 const day=mealDay(date),F=root.HappyFood,s=root.MEAL_SUMMARY,counters=root.HappyDayCounters;
 if(!F||!s)return day;
 if(typeof DayAppLinks!=='undefined'&&!DayAppLinks.mealDayOn(date))return day;   /* связь с Meal выключена весь день */
 const sum=F.eaten(s,date,counters?counters.taps():[],counters?counters.foods():[],counters?counters.apps():[]);
 if(!sum||!sum.recorded)return day;
 const food={...(day||{}),k:sum.k,p:sum.p,f:sum.f,c:sum.c};
 if(sum.fib!=null)food.fib=sum.fib;
 return food;
}
/* пришла свежая сводка Meal или изменились счётчики, а экран «Активность» открыт — кольцо пересчитывается на месте */
function mealChanged(){try{if(ready&&block('activity')?.classList.contains('on'))paintEnergy();}catch(e){}}
function activityFacts(){
 const c=data(),a=C.activity(c,curDate),d=DB.days[curDate]||{},food=mealFood(curDate);
 const workouts=woOf(curDate),calories=workouts.map(w=>w.kcal??a.workouts.find(x=>x.id===w.id)?.energyKcal);
 return {food:food?{...food,g:DB.mealLink?.goals||{}}:null,eaten:food?.k??null,spent:null,rest:null,training:calories.length&&calories.every(C.finite)?calories.reduce((n,v)=>n+v,0):null,minutes:workouts.length?workouts.reduce((n,w)=>n+(w.min||0),0):a.connected?0:null,steps:null};
}
/* 57.4: вид виджета — «Начальный режим» из настроек (по умолчанию «баланс»); нажатие на кольцо меняет его до
   закрытия страницы и в дневник не записывается (решение владельца 11.11.2026). */
let energyMode=null;
function paintEnergy(){const el=$('careEnergy');if(el)el.innerHTML=HappyDayEnergy.render(activityFacts(),energyMode||data().activitySettings.start,data().activitySettings.scale);}
function renderActivity(){
 const c=data(),a=C.activity(c,curDate);
 block('activity').innerHTML=header('Активность')+'<section class="card happy-energy" id="careEnergy" aria-label="Энергия и активность"></section><div class="eyebrow">Расписание</div>'+a.plans.map(p=>'<div class="card"><b>'+h(p.start.slice(11,16))+' · '+h(p.title)+'</b><p class="care-help">'+p.minutes+' мин · '+(p.status==='completed'||p.status==='partial'?'выполнено':'план')+'</p>'+(p.note?'<p class="care-long">'+h(p.note)+'</p>':'')+'</div>').join('')+(a.plans.length?'':empty('На этот день тренировок в расписании нет.'))+'<div class="card"><h2>Happy Sport</h2><p class="care-help">Тренировки и плановые занятия приходят из Happy Sport сами.</p><a class="btn solid care-external" href="'+STRONG_URL+'" data-happy-app="sport" target="_blank" rel="noopener">Открыть Sport ↗</a></div>';
 strongLink();
 paintEnergy();
}
/* Форма расписания из Настроек убрана: расписание — на странице «Осознанность» (аудит 20.11.2026, п. 32). */
function options(value,arr){return arr.map(([v,t])=>'<option value="'+v+'"'+(value===v?' selected':'')+'>'+t+'</option>').join('');}
function mappingRows(c){const defs=[['check:feeling','Общее ощущение','bipolar'],['check:joy','Радость','positive'],['check:strain','Напряжение','negative']].concat(DB.metrics.map(m=>['metric:'+m.k,m.t,metricNeg(m)?'negative':'bipolar']));
 return defs.map(([key,title,def])=>{const m=c.settings.mappings[key]||{mode:def};return '<div class="care-mapping" data-mapping="'+h(key)+'"><label class="care-label">'+h(title)+'</label><select data-map-mode aria-label="Направление шкалы '+h(title)+'">'+options(m.mode,[['bipolar','От неприятного (−) к приятному (+)'],['positive','Больше → сильнее приятное (+)'],['negative','Больше → сильнее неприятное (−)'],['optimal','Комфортен средний диапазон'],['ignore','Не учитывать в дуге']])+'</select><div class="care-grid" data-map-range'+(m.mode==='optimal'?'':' hidden')+'><div><label>Нижняя граница</label>'+numField('data-map-low aria-label="Нижняя граница, %" value="'+pct(m.low??.35)+'"','%')+'</div><div><label>Верхняя граница</label>'+numField('data-map-high aria-label="Верхняя граница, %" value="'+pct(m.high??.65)+'"','%')+'</div></div></div>';}).join('');
}
function renderSettings(){
 if(!ready)return;const s=data().settings;
 const names={state:'Текущее состояние',diary:'Дневник',mood:'Самочувствие',activity:'Активность',mind:'Осознанность'};
 const order=s.settingsOrder||['state',...s.order];
 $('careSettings').innerHTML='<div class="eyebrow"><span>Настройки «Сейчас»</span></div><div class="care-function-list">'+order.map(k=>functionRow(k,names[k],true)).join('')+'</div>';
}
/* Строка настройки «Сейчас»: название (в Настройках — с переходом), выключатель показа, «≡» — зажал и перетащил.
   Та же строка — в «Текущее состояние → Кнопки-виджеты» (аудит 20.11.2026, п. 7: вместо галочек и стрелок «← →»). */
function functionRow(k,name,openable){const s=data().settings;return '<div class="card care-function-row" data-care-function="'+k+'">'+(openable?'<button class="care-function-open" data-care-open="settings-'+k+'"><span>'+name+'</span>'+CHEV+'</button>':'<span class="care-function-name">'+name+'</span>')+(k==='state'?'':'<label class="care-switch"><input type="checkbox" data-care-visible="'+k+'" aria-label="Показывать '+titles[k]+'"'+(!s.hidden.includes(k)?' checked':'')+'><i></i></label>')+'<button class="dragH care-function-drag" aria-label="Переместить '+name+'" title="Перетащи или используй стрелки вверх и вниз"><svg viewBox="0 0 24 24"><path d="M4 8h16M4 12h16M4 16h16"/></svg></button></div>';}
function moveFunction(key,to){
 const s=data().settings,order=s.settingsOrder.slice(),from=order.indexOf(key);if(RO||from<0||to<0||to>=order.length||from===to)return;
 order.splice(to,0,order.splice(from,1)[0]);s.settingsOrder=order;s.order=order.filter(k=>k!=='state');save();renderSettings();renderNow();if(block('settings-state')?.classList.contains('on'))renderSettingsPage('state');
}
function bindSettingsOrder(host=$('careSettings'),keys=()=>data().settings.settingsOrder){
 let drag=null;
 const place=(key,to)=>{const k=keys()[to];if(k)moveFunction(key,data().settings.settingsOrder.indexOf(k));};
 host.addEventListener('pointerdown',e=>{const handle=e.target.closest('.care-function-drag');if(!handle||RO)return;const row=handle.closest('[data-care-function]');drag={handle,row,key:row.dataset.careFunction,y:e.clientY,centres:[...host.querySelectorAll('[data-care-function]')].map(r=>{const b=r.getBoundingClientRect();return b.top+b.height/2;}),to:keys().indexOf(row.dataset.careFunction)};handle.setPointerCapture(e.pointerId);row.classList.add('dragging');e.preventDefault();});
 host.addEventListener('pointermove',e=>{if(!drag)return;drag.row.style.transform='translateY('+(e.clientY-drag.y)+'px)';drag.to=drag.centres.reduce((best,y,i)=>Math.abs(y-e.clientY)<Math.abs(drag.centres[best]-e.clientY)?i:best,0);});
 const finish=cancel=>{if(!drag)return;const d=drag;drag=null;d.row.style.transform='';d.row.classList.remove('dragging');if(!cancel)place(d.key,d.to);};
 host.addEventListener('pointerup',()=>finish(false));host.addEventListener('pointercancel',()=>finish(true));
 host.addEventListener('keydown',e=>{const handle=e.target.closest('.care-function-drag');if(!handle||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const key=handle.closest('[data-care-function]').dataset.careFunction;place(key,keys().indexOf(key)+(e.key==='ArrowDown'?1:-1));host.querySelector('[data-care-function="'+key+'"] .care-function-drag')?.focus();});
}
function renderCheckinSettings(){const host=$('careSectionConfig');if(host)host.innerHTML='<div class="secListInner">'+sectionMarkup(checkinSection(),-1)+'</div>';}
function renderSettingsPage(kind){
 const c=data(),s=c.settings,screen=block('settings-'+kind),title={state:'Текущее состояние',mood:'Самочувствие',diary:'Дневник',activity:'Активность',mind:'Осознанность'}[kind];
 const host=$('careSectionConfig');if(host)host.remove();
 let html=header(title,'settings',false);
 if(kind==='state')html+='<div class="eyebrow"><span>Кнопки-виджеты</span></div><div class="care-function-list" data-care-widgets>'+s.order.map(k=>functionRow(k,titles[k],false)).join('')+'</div><p class="care-help care-note">Порядок слева направо — сверху вниз. Зажми «≡» и перетащи.</p>';
 if(kind==='mood')html+='<form id="careMoodSettingsForm" class="card care-form">'+moodSettings(c,s)+'<button type="submit" class="btn solid care-submit">Сохранить</button></form>';
 if(kind==='mind')html+='<form id="careMindSettingsForm" class="card care-form">'+mindSettings(c,s)+'<button type="submit" class="btn solid care-submit">Сохранить</button></form><p class="care-help care-note">Расписание практик — на странице «Осознанность»: «+» над списком.</p>';
 if(kind==='diary')html+='<div class="card"><h2>Мои дневники</h2>'+c.books.map(b=>'<div class="care-setting-row"><span>'+h(b.name)+'</span></div>').join('')+'<button class="btn care-submit" data-care-book>Добавить дневник</button></div><form id="careDiarySettingsForm" class="card care-form">'+diarySettings(c,s)+'<button type="submit" class="btn solid care-submit">Сохранить</button></form>';
 if(kind==='activity')html+='<form id="careActivitySettingsForm" class="card care-form"><h2>Виджет энергии</h2><label for="careEnergyMode">Начальный режим</label><select id="careEnergyMode" name="start">'+options(c.activitySettings.start,[['balance','Баланс'],['eat','Съедено'],['spent','Потрачено']])+'</select><p class="care-help">С этого вида виджет открывается. Нажатие на кольцо меняет вид до следующего открытия.</p><label for="careEnergyScale">Масштаб кольца, ккал</label>'+numField('id="careEnergyScale" name="scale" required value="'+c.activitySettings.scale+'"','ккал')+'<button type="submit" class="btn solid care-submit">Сохранить</button></form>';
 screen.innerHTML=html;
 if(host){if(kind==='mood'){screen.querySelector('form').before(host);renderCheckinSettings();}else block('settings-mood').append(host);}
}
function moodSettings(c,s){return '<details open><summary class="care-summary">Самочувствие · смысл дуги</summary><label for="careMoodView">Показывать</label><select name="moodView" id="careMoodView">'+options(s.moodView,[['balance','Две стороны: приятные и неприятные'],['positive','Только приятные ощущения'],['negative','Только неприятные ощущения'],['coverage','Количество отметок относительно цели']])+'</select><label for="careAggregation">Какие отметки учитывать</label><select name="aggregation" id="careAggregation">'+options(s.aggregation,[['average','Среднее за выбранный день'],['latest','Последняя отметка']])+'</select><label for="careCheckinGoal">Личная цель отметок в день · необязательно</label>'+numField('name="checkinGoal" id="careCheckinGoal" value="'+(s.checkinGoal||'')+'"','в день')+'<p class="care-help">Баланс = приятная часть − неприятная, от −100 до +100. Две стороны остаются видимы даже при нулевом балансе. Пропуск не считается нулём. Это личная шкала ощущений.</p><details><summary class="care-summary">Настроить значения ощущений</summary>'+mappingRows(c)+'<p class="care-help">Проценты задают положение комфортного диапазона на исходной шкале: 0% — её минимум, 100% — максимум. Внутри — +100; к краям оценка постепенно снижается до −100.</p></details><details><summary class="care-summary">Подгружать разделы дня</summary>'+DB.sections.map(x=>'<label class="care-check"><input name="sections" type="checkbox" value="'+h(x.k)+'"'+(!s.sectionKeys||s.sectionKeys.includes(x.k)?' checked':'')+'>'+h(x.t)+'</label>').join('')+'</details></details>';}
function mindSettings(c,s){return '<details open><summary class="care-summary">Осознанность · цель круга</summary><label for="careGoalMode">Источник цели</label><select id="careGoalMode" name="mindMode">'+options(c.goals.scheduleEnabled?'schedule':'manual',[['manual','Моя цель в минутах'],['schedule','Сумма практик в расписании']])+'</select><label for="careMindGoal">Моя цель, минут в день</label>'+numField('id="careMindGoal" name="mindManual" value="'+(c.goals.mindManual||'')+'"'+(c.goals.scheduleEnabled?' disabled':''),'мин')+'<p class="care-help">При расписании 5 + 10 минут полный круг = 15 минут. Без практик в расписании на день — день без плановой цели. Прошлые дни сохраняют свой план.</p></details>';}
function diarySettings(c,s){return '<details open><summary class="care-summary">Дневник · частота записей</summary><label for="careDiaryGoal">Сколько записей в день ты хочешь делать?</label>'+numField('id="careDiaryGoal" name="diaryGoal" value="'+(c.goals.diaryGoal||'')+'"','в день')+'<label class="care-check"><input name="countAdditions" type="checkbox"'+(c.goals.countAdditions?' checked':'')+'>Учитывать сохранённые дополнения</label><p class="care-help">При достижении цели круг заполнен. Лишние записи остаются видны числом, без штрафа.</p></details>';}
async function click(ev){
 const b=ev.target.closest('[data-care-open],[data-care-entry],[data-care-book],[data-care-practice],[data-care-remove-plan],[data-energy-cycle],[data-care-plan-new],[data-care-plan-edit],[data-care-log-edit],[data-care-log-del],[data-plan-kind]');if(!b)return;
 if(b.hasAttribute('data-care-open')){open(b.dataset.careOpen);return;}
 if(b.dataset.careEntry){open('entry',b.dataset.careEntry);return;}
 if(b.hasAttribute('data-care-book')){const name=await ask('Название дневника','');if(name?.trim()&&await transact(()=>data().books.push({id:C.uid(),name:name.trim().slice(0,80)})))renderSettingsPage('diary');return;}
 if(b.hasAttribute('data-energy-cycle')){const modes=['spent','balance','eat'];energyMode=modes[(modes.indexOf(energyMode||data().activitySettings.start)+1)%3];paintEnergy();return;}
 if(b.hasAttribute('data-care-plan-new')){planSheet(null);return;}
 if(b.dataset.carePlanEdit){planSheet(b.dataset.carePlanEdit);return;}
 if(b.dataset.careLogEdit){practiceSheet(b.dataset.careLogEdit);return;}
 if(b.dataset.careLogDel){removeLog(b.dataset.careLogDel,b.closest('form')?.dataset.logDate||curDate);return;}
 if(b.dataset.planKind){const f=b.closest('form'),k=b.dataset.planKind;f.elements.kind.value=k;f.querySelectorAll('[data-plan-kind]').forEach(x=>x.setAttribute('aria-checked',String(x===b)));f.querySelector('[data-plan-days]').hidden=k!=='weekly';f.querySelector('[data-plan-once]').hidden=k!=='once';f.querySelector('[data-plan-weekly]').hidden=k!=='weekly';return;}
 if(b.dataset.carePractice){const p=C.scheduled(data(),curDate).find(x=>x.id===b.dataset.carePractice);if(p){const f=$('carePracticeForm');fillPractice(f,{planId:p.id,name:p.name,time:p.time,minutes:p.minutes});f.scrollIntoView({block:'start'});}return;}
 if(b.dataset.careRemovePlan){removePlan(b.dataset.careRemovePlan);return;}
}
async function change(ev){const el=ev.target;

 if(el.dataset.careVisible){const k=el.dataset.careVisible;if(await transact(()=>{const s=data().settings;s.hidden=s.hidden.filter(x=>x!==k);if(!el.checked)s.hidden.push(k);})){renderSettings();if(block('settings-state').classList.contains('on'))renderSettingsPage('state');}return;}
 if(el.id==='careGoalMode'){$('careMindGoal').disabled=el.value==='schedule';HF.refresh($('careMindGoal'));}
 if(el.hasAttribute('data-map-mode'))el.parentElement.querySelector('[data-map-range]').hidden=el.value!=='optimal';
}
function input(ev){if(ev.target.id==='careDiarySearch')renderDiaryList(ev.target.value);}
/* «Записать практику» — единое поведение ввода, как в замерах (Астамур 20.11.2026): ввёл минуты и вышел из формы —
   нажал мимо полей или убрал клавиатуру — практика записывается сама; «Сохранить практику» делает то же. Переход между
   полями формы ничего не записывает. В сообщении — «Вернуть»: запись убирается, введённое возвращается в форму. */
/* заполнить «Записать практику»: поля и барабан */
function fillPractice(f,v){f.elements.planId.value=v.planId||'';f.elements.name.value=v.name||'';f.elements.time.value=v.time;f.elements.minutes.value=v.minutes;
 if(f._drum){f._drum.set('h',+String(v.time).slice(0,2));f._drum.set('m',+String(v.time).slice(3,5));const m=Math.round(Number(v.minutes)||0);f._drum.set('dh',Math.min(23,Math.floor(m/60)));f._drum.set('dm',m%60);}}
async function savePractice(v){
 const date=curDate;let saved=null;
 if(!await transact(()=>{saved=C.addPractice(DB,date,v.time,minutesOf(v.minutes),v.name,v.planId);}))return false;
 renderMind();
 toast('Практика записана · '+num(saved.minutes)+' мин',async()=>{
  if(!await transact(()=>{const d=C.dayData(DB,date);d.practices=d.practices.filter(x=>x.id!==saved.id);}))return;
  if(curDate!==date)return;
  renderMind();const f=$('carePracticeForm');if(!f)return;
  fillPractice(f,v);
 },null,6000);
 return true;
}
let practiceButtonTap=false;
function leavePractice(ev){
 const f=ev.target.closest&&ev.target.closest('#carePracticeForm');if(!f)return;
 if(ev.relatedTarget&&f.contains(ev.relatedTarget))return;                 // перешёл в соседнее поле формы
 if(practiceButtonTap)return;                                              // нажал «Сохранить практику» — запишет она
 setTimeout(()=>{
  if(!f.isConnected||f.contains(document.activeElement)||busy)return;
  if(!String(f.elements.minutes.value).trim())return;                       // минут нет — записывать нечего
  if(!guard(curDate))return;
  savePractice(Object.fromEntries(new FormData(f)));
 },0);
}
/* нажал «Сохранить практику» — запишет она, а не уход из поля */
document.addEventListener('pointerdown',ev=>{practiceButtonTap=!!(ev.target.closest&&ev.target.closest('#carePracticeForm .care-submit'));},true);
async function submit(ev){const f=ev.target;if(!f.id?.startsWith('care'))return;ev.preventDefault();practiceButtonTap=false;if(!f.reportValidity()||busy)return;const v=Object.fromEntries(new FormData(f));
 const diaryWhen=f.id==='careDiaryForm'?String(v.when||'').split('T'):null;
  if(diaryWhen&&!/^\d{4}-\d{2}-\d{2}$/.test(diaryWhen[0])){toast('Выбери дату и время');return;}
  if(['careDiaryForm','careAppendForm','carePracticeForm'].includes(f.id)&&!guard(diaryWhen?diaryWhen[0]:curDate))return;
 if(f.id==='careDiaryForm'){let entry;if(await transact(()=>{entry=C.addEntry(DB,diaryWhen[0],(diaryWhen[1]||'').slice(0,5),v.title,v.text,v.book);})){open('entry',entry.id);toast('Запись добавлена в дневник и журнал дня');}}
 if(f.id==='careAppendForm'){if(await transact(()=>C.appendEntry(DB,currentEntry,curDate,nowHM(),v.text))){renderEntry();toast('Дополнение сохранено отдельным событием');}}
 if(f.id==='carePracticeForm')await savePractice(v);
 if(f.id==='carePlanSheet'){
  const days=new FormData(f).getAll('days').map(Number),name=String(v.name||'').trim(),kind=v.kind==='weekly'?'weekly':'once',when=String(v.when||'').split('T');
  const time=kind==='weekly'?String(v.time||''):(when[1]||'').slice(0,5),date=kind==='once'?when[0]:todayISO();
  if(!name){toast('Напиши, какая практика');return;}
  if(kind==='weekly'&&!days.length){toast('Выбери дни недели');return;}
  if(kind==='once'&&!/^\d{4}-\d{2}-\d{2}$/.test(date)){toast('Выбери дату');return;}
  if(!/^\d{2}:\d{2}$/.test(time)){toast('Выбери время');return;}
  if(kind==='once'&&date<todayISO()){toast('Эта дата уже прошла');return;}
  const planMinutes=minutesOf(v.minutes);if(!Number.isInteger(planMinutes)||planMinutes<1||planMinutes>1440){toast('Укажи длительность от 1 до 1440 минут, целым числом');return;}
  const id=f.dataset.planId,fields={name,time,minutes:planMinutes,kind,date,days:kind==='weekly'?days:[]};
  if(await transact(()=>{const c=data(),x=id&&c.schedule.find(p=>p.id===id);if(x)Object.assign(x,fields);else{c.schedule.push({id:C.uid(),...fields,since:todayISO(),enabled:true});c.goals.scheduleEnabled=true;}C.rememberPlan(c,todayISO());})){closeSheet();renderMind();toast(id?'Расписание обновлено':'Расписание и цель дня обновлены');}
 }
 if(f.id==='careLogSheet'){
  const date=f.dataset.logDate,id=f.dataset.logId,m=minutesOf(v.minutes),time=String(v.time||'');
  if(!/^\d{2}:\d{2}$/.test(time)){toast('Выбери время');return;}
  if(!(m>0&&m<=1440)){toast('Укажи длительность от 0,1 до 1440 минут');return;}
  if(!guard(date))return;
  if(await transact(()=>{const x=C.dayData(DB,date).practices.find(p=>p.id===id);if(!x)throw Error('Практика не найдена');Object.assign(x,{name:String(v.name||'').trim()||'Практика',time,minutes:Math.round(m*100)/100});})){closeSheet();if(curDate===date)renderMind();toast('Практика сохранена');}
 }
 if(f.id==='careMoodSettingsForm'){
  const mappings={...data().settings.mappings};let invalid=false;
  f.querySelectorAll('[data-mapping]').forEach(row=>{const mode=row.querySelector('[data-map-mode]').value,low=HF.parse(row.querySelector('[data-map-low]').value)/100,high=HF.parse(row.querySelector('[data-map-high]').value)/100;if(mode==='optimal'&&(isNaN(low)||isNaN(high)))invalid=true;if(mode==='optimal'&&low>high)invalid=true;mappings[row.dataset.mapping]={mode,low,high};});
  if(invalid){toast('Нижняя граница должна быть не выше верхней');return;}
  if(v.moodView==='coverage'&&!v.checkinGoal){toast('Для дуги количества укажи свою цель отметок');return;}
  if(await transact(()=>{const c=data();Object.assign(c.settings,{moodView:v.moodView,aggregation:v.aggregation,checkinGoal:v.checkinGoal&&HF.parse(v.checkinGoal)>0?Math.round(HF.parse(v.checkinGoal)):null,sectionKeys:new FormData(f).getAll('sections'),mappings});})){toast('Настройки сохранены');}
 }
 if(f.id==='careMindSettingsForm'&&await transact(()=>{const c=data();Object.assign(c.goals,{scheduleEnabled:v.mindMode==='schedule',mindManual:v.mindManual&&HF.parse(v.mindManual)>0?HF.parse(v.mindManual):v.mindMode==='schedule'?c.goals.mindManual:null});C.rememberPlan(c,todayISO());}))toast('Настройки сохранены');
 if(f.id==='careDiarySettingsForm'&&await transact(()=>{const c=data();Object.assign(c.goals,{diaryGoal:v.diaryGoal&&HF.parse(v.diaryGoal)>0?Math.round(HF.parse(v.diaryGoal)):null,countAdditions:!!v.countAdditions});C.rememberPlan(c,todayISO());}))toast('Настройки сохранены');
 if(f.id==='careActivitySettingsForm'&&!(HF.parse(v.scale)>=100&&HF.parse(v.scale)<=20000)){toast('Масштаб кольца — от 100 до 20000 ккал');return;}
 if(f.id==='careActivitySettingsForm'&&await transact(()=>{data().activitySettings={start:['spent','eat','balance'].includes(v.start)?v.start:'balance',scale:HF.parse(v.scale)};})){energyMode=null;toast('Настройки сохранены');}
}
function journalEvents(date){const d=C.readDay(DB,date),entries=data().entries;
 return d.checkins.map(x=>({t:x.time,m:hmMin(x.time),dot:'#7CE3C9',title:x.sectionTitle||'Отметка дня',sub:(x.sourceSectionTitle?'Форма: '+x.sourceSectionTitle+' · ':'')+checkinText(x),careKind:'mood',careId:x.id,careDate:date})).concat(d.events.map(x=>({t:x.time,m:hmMin(x.time),dot:'#BC61FE',title:x.type==='diary-appended'?'Дополнен дневник':'Запись в дневнике',sub:entries.find(e=>e.id===x.entryId)?.title||x.title,careKind:'entry',careId:x.entryId,careDate:date,additionId:x.additionId})),d.practices.map(x=>({t:x.time,m:hmMin(x.time),dot:'#46FDFC',title:'Осознанность',sub:x.name+' · '+num(x.minutes)+' мин',careKind:'mind',careId:x.id,careDate:date})),C.activity(data(),date).workouts.map(w=>({t:w.start.slice(11,16),m:hmMin(w.start.slice(11,16)),dot:'#FFE19A',title:'Активность · Happy Sport',sub:w.title+' · '+num(w.duration/60)+' мин',careKind:'activity',careId:w.id,careDate:date})));
}
function journalOpen(kind,id,date,additionId){curDate=date;open(kind,id,'trends');if(additionId)$('addition-'+additionId)?.scrollIntoView({block:'center'});}
/* 57.6: свернули приложение посреди правки раздела — записать сразу */
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&session?.autosave)commitSection(session);});
addEventListener('pagehide',function(){if(session?.autosave)commitSection(session);});
/* главная кнопка-микрофон (аудит 20.11.2026, п. 37): после open('mood') — сразу слушать заметку */
function dictate(){if(session&&!session.readOnly)dictateWheel();}
root.SelfCare={sportStart,sportChanged,sportDates(){return sportDays.slice();},mealChanged,openSection(k){init();if(DB.sections.some(s=>s.k===k))openMood(null,'day',k);},checkinDirty,restoreCheckinDirty,data,init,renderNow,renderSettings,renderCheckinSettings,open,center,journalEvents,journalOpen,onNavigate,closeCurrent,checkinSection,addCheckinTag,isCheckin,checkinReadOnly,checkinDay,checkinScales,checkinTime,saveCheckin,rememberScale,sessionTarget:()=>session?.target||null,flushSection:()=>session?.autosave?commitSection(session):true,dictate};
})(window);
