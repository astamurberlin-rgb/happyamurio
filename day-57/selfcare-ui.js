(function(root){
'use strict';
const C=root.HappyCare;
const titles={mind:'Осознанность',mood:'Отметить самочувствие',diary:'Дневник',activity:'Активность'};
const icons={mood:'+',mind:'<svg viewBox="0 0 24 24"><path d="M12 20V12M12 16C4 17 3 10 3 5c6 0 9 4 9 9M12 14c0-7 3-10 9-10 0 7-2 11-9 11"/></svg>',diary:'<svg viewBox="0 0 24 24"><path d="M16 3H5a2 2 0 0 0-2 2v15h15v-7M7 8h5M7 12h3M14 11l6-6 2 2-6 6-3 1z"/></svg>'};
icons.activity='<span class="aiko-activity-icon"></span>';
/* 57.3: «Открыть Sport ↗» ведёт на текущий выпуск Sport. Адрес подставляет shared/happy-links.js из shared/apps.json
   (как у кнопки «Happy Sport» в настройках); ниже — запасной, если список выпусков не загрузился. Раньше здесь стоял
   адрес тестовой сборки от 04.11. */
const STRONG_URL='https://astamurberlin-rgb.github.io/happyamurio/sport-40/';
let strongLinks=null;
function strongLink(){try{if(!root.HappyLinks)return;strongLinks=strongLinks||root.HappyLinks.load();strongLinks.then(function(apps){if(apps)root.HappyLinks.apply(apps)})}catch(e){}}
/* 57.4: сводка тренировок Happy Sport приходит сама, как сводка Meal. Источники: ключ hd_link_sport_v1 в области
   аккаунта на этом устройстве (его пишет Happy Sport) и, после входа, облачная строка sport/link — только чтение:
   сначала время строки, сама сводка скачивается, если она новее сохранённой. Разбор — общий shared/happy-summaries.js.
   Тренировки сводки добавляются к тем, что Day уже знает (Apple Здоровье, снимок журнала Sport), без повторов —
   это делает HappyCare.activity через C.sportDay. В дневник Day сводка не записывается; копия лежит рядом, в том же
   ключе. Сводка другого аккаунта не принимается. Ошибки чтения — молча: остаётся то, что уже показано. */
const S=root.HappySummaries||null,SPORT_KEY=S?S.sport.key:'hd_link_sport_v1';
let sportSummary=null,sportSeen=null,sportBusy=false;
function sportApply(o){sportSummary=o;const byDay=o?S.sport.byDay(o):null;C.sportDay=byDay?function(date){return byDay[date]||[]}:null;}
function sportOwn(o){return S.sport.valid(o)&&(o.owner===undefined||o.owner===root.HappyProfile.owner);}
function sportMark(owner,raw){return owner+'|'+(raw?raw.length+'|'+raw.slice(0,96):'');}
function sportRead(){
 if(!S||!root.HappyProfile)return false;
 let raw=null;try{raw=localStorage.getItem(root.HappyProfile.key(SPORT_KEY));}catch(e){}
 const seen=sportMark(root.HappyProfile.owner,raw);if(seen===sportSeen)return false;sportSeen=seen;
 const o=S.parse(raw);sportApply(sportOwn(o)?o:null);return true;
}
async function sportCloud(){
 if(!S||sportBusy||typeof clOn!=='function'||!clOn())return false;
 const profile=root.HappyProfile,owner=profile.owner;sportBusy=true;
 try{
  const guard=await clMealReadReady();   // тот же закреплённый вход, что у чтения сводки Meal
  const at=await clAt('sport','link',guard);guard();
  if(!Number.isSafeInteger(at)||at<=0||(sportSummary&&sportSummary.at>=at))return false;
  const o=await clGet('sport','link',guard);guard();
  if(root.HappyProfile!==profile||!S.sport.valid(o)||(o.owner!==undefined&&o.owner!==owner))return false;
  o.owner=owner;o.at=at;   // время строки в облаке: по нему видно, что копия уже свежая
  const raw=JSON.stringify(o);
  try{localStorage.setItem(profile.key(SPORT_KEY),raw);sportSeen=sportMark(owner,raw);}catch(e){}
  sportApply(o);return true;
 }catch(e){return false;}
 finally{sportBusy=false;}
}
function sportRepaint(){
 try{if(typeof renderDay==='function')renderDay();}catch(e){}
 if(!ready)return;
 try{renderNow();}catch(e){}
 try{if(block('activity')?.classList.contains('on'))renderActivity();}catch(e){}
}
function sportPoll(){if(sportRead())sportRepaint();return sportCloud().then(function(changed){if(changed)sportRepaint();},function(){});}
const h=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const $=id=>document.getElementById(id);
const num=v=>(Math.round(v*10)/10).toLocaleString('ru-RU');
const pct=v=>Math.round(v*100);
const signed=v=>(v>0?'+':v<0?'−':'')+Math.abs(pct(v));
const empty=t=>'<p class="care-empty">'+h(t)+'</p>';
let ready=false,active='mood',currentEntry=null,busy=false,strongBusy=false,strongStatus='';
let session=null,railTimer=null,railPainting=false,pendingWheel=null;
let shownWheel=null,wheelMoving=false,wheelRevealing=false,wheelFrame=0,wheelEpoch=0,wheelAngle=0,wheelLift=0,fontWaiting=false;
const wheelFontReady=document.fonts.load('700 18px "Day Wheel Rounded"','УТРО ЗАВТРАК ЁЙ').then(f=>f.length>0).catch(()=>false);
function wheelDestinationKey(){return session?.target??CURRENT;}
function wheelDestinationTitle(){return wheelItems().find(s=>s.k===wheelDestinationKey())?.t||'Сейчас';}
function stopWheelMotion(){cancelAnimationFrame(wheelFrame);wheelEpoch++;wheelMoving=false;wheelRevealing=false;}
function paintWheelMotion(angle,lift=0){wheelAngle=angle;wheelLift=lift;const el=$('sectionWheel');if(!el)return;el.querySelector('.wheel-lift').style.transform='translateY('+lift+'px)';el.querySelector('.wheel-disc').style.transform='rotate('+angle+'deg)';}
function animateWheelMotion(angle,lift,duration=300){stopWheelMotion();const epoch=wheelEpoch,from=wheelAngle,fromLift=wheelLift;if(matchMedia('(prefers-reduced-motion:reduce)').matches||!duration){paintWheelMotion(angle,lift);return;}wheelMoving=true;const started=performance.now();function frame(now){if(epoch!==wheelEpoch)return;const t=Math.min(1,(now-started)/duration),e=1-Math.pow(1-t,3);paintWheelMotion(from+(angle-from)*e,fromLift+(lift-fromLift)*e);if(t<1)wheelFrame=requestAnimationFrame(frame);else {wheelMoving=false;wheelRevealing=false;}}wheelFrame=requestAnimationFrame(frame);}

const CURRENT='care_current';
function data(){return C.init(DB,todayISO());}
function block(name){return document.querySelector('[data-screen="care-'+name+'"]');}
function guard(date){if(RO){roWarn();return false;}if(date>todayISO()){toast('Будущие события пока не отмечаем');return false;}if(DB.days[date]?.locked){toast('День закрыт — сначала открой замок');return false;}return true;}
async function commit(){
 if(RO)throw Error('Эта версия открыта только для чтения');
 clearTimeout(saveT);await fmtCheck();if(RO)throw Error('Данные созданы более новой версией');
 await rawSet(K_FMT,String(FMT));await rawSet(K.db,JSON.stringify(DB));renderNow();
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
 document.addEventListener('click',function(e){const b=e.target.closest('[data-care-event]');if(!b)return;const v=JSON.parse(b.dataset.careEvent);journalOpen(v.kind,v.id,v.date,v.additionId);});
 document.addEventListener('submit',submit);
 document.addEventListener('change',change);
 document.addEventListener('input',input);
 const rail=$('nwRail');
 active=data().settings.active||'mood';
 rail.addEventListener('scroll',()=>{clearTimeout(railTimer);railTimer=setTimeout(()=>{if(railPainting||!rail.closest('.screen').classList.contains('on'))return;nwSide();const slide=rail.children[NW.idx];if(slide)rememberActive(slide.dataset.careKey);},160);},{passive:true});
 let touchY=0,touchX=0;
 rail.addEventListener('touchstart',e=>{touchY=e.touches[0].clientY;touchX=e.touches[0].clientX;},{passive:true});
 rail.addEventListener('touchmove',e=>{const t=e.touches[0];if(Math.abs(t.clientY-touchY)>Math.abs(t.clientX-touchX)&&e.cancelable)e.preventDefault();},{passive:false});
 bindSettingsOrder();
 window.addEventListener('resize',()=>{center(false);if(session)requestAnimationFrame(renderWheel);});
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
 const screen=document.querySelector('.screen.on');
 if(screen?.dataset.screen==='ring'){const dest=session?.returnTo||'day';go(dest);renderDay();return true;}
 const grip=screen?.querySelector('[data-care-close]');if(!grip)return false;
 const dest=grip.dataset.careClose;if(dest.startsWith('care-'))open(dest.slice(5));else go(dest);return true;
}
function bindCareNavigation(){
 let drag=null;
 document.addEventListener('pointerdown',e=>{const grip=e.target.closest('.care-grip,#cpGrip');if(!grip)return;const screen=grip.closest('.screen');drag={grip,screen,y:e.clientY,dy:0};grip.setPointerCapture(e.pointerId);screen.style.transition='none';});
 document.addEventListener('pointermove',e=>{if(!drag)return;drag.dy=Math.max(0,e.clientY-drag.y);drag.screen.style.transform='translateY('+drag.dy+'px)';});
 const finish=cancel=>{if(!drag)return;const d=drag;drag=null;d.screen.style.transition='transform .24s';d.screen.style.transform='';if(!cancel&&(d.dy>70||d.dy<6))closeCurrent();setTimeout(()=>{d.screen.style.transition='';},250);};
 document.addEventListener('pointerup',()=>finish(false));document.addEventListener('pointercancel',()=>finish(true));
 document.addEventListener('keydown',e=>{if(e.target.matches('.care-grip,#cpGrip')&&['Enter',' '].includes(e.key)){e.preventDefault();closeCurrent();}});
}
function onNavigate(name){if(name!=='ring'){cancelWheelSpeech();stopWheelMotion();shownWheel=null;$('sectionWheel')?.classList.remove('wheel-visible');}if(session&&!session.readOnly)stashWheel();document.body.classList.toggle('wheel-editing',name==='ring'&&!!session&&!session.readOnly); document.body.classList.toggle("now-editing",name==="ring"&&isCheckin()&&!session.readOnly);updateNowSave();if(session&&!session.readOnly&&CURS[cur])rememberScale(CURS[cur].k);if(session&&(name!=='ring'||curSec!==CURRENT)){session=null;if(curSec===CURRENT)curSec=DB.sections[0]?.k||'wake';}}
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
function checkinTime(){return isCheckin()?{t:session.checkpoint.time,src:'manual'}:null;}
function checkinDirty(){return !!session?.dirty;}
function restoreCheckinDirty(value){if(!session)return;session.dirty=value;if(value)stashWheel();else{delete data().wheelDrafts?.[session.date]?.[wheelDraftKey(session)];save();}updateNowSave();}
function saveCheckin(){ if(session&&!session.readOnly){session.dirty=true;stashWheel();} updateNowSave(); }
let undoNow=null;
function wheelHasEntry(){return !!session&&(checkinSection().scales.some(k=>Number.isFinite(session.checkpoint[k]))||Object.values(session.checkpoint.tags||{}).some(Boolean)||!!String(session.checkpoint.note||'').trim());}
function updateNowSave(){
 const b=document.getElementById('nowSave');if(!b)return;
 const canSave=!!session&&session.dirty;b.disabled=busy||fontWaiting||!session; b.dataset.dirty=canSave; b.innerHTML=canSave?'Save':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';b.setAttribute('aria-label',canSave?(shownWheel===session?'Save — сохранить в '+wheelDestinationTitle():'Save — выбрать раздел'):'Продиктовать заметку'); renderWheel();
}
async function submitNow(){
 if(busy||fontWaiting||wheelMoving||!session||session.readOnly)return;
 if(!session.dirty){dictateWheel();return;}
 if(!guard(session.date))return;
 if(shownWheel!==session){const original=session;fontWaiting=true;updateNowSave();const ok=await wheelFontReady;fontWaiting=false;if(session!==original){updateNowSave();return;}if(!ok){toastLong('Не удалось загрузить шрифт колеса. Обнови страницу.');updateNowSave();return;}shownWheel=session;const existing=$('sectionWheel')?.querySelector('.wheel-disc');if(existing)delete existing.dataset.clearanceKey;renderWheel();const a=wheelItems(),i=a.findIndex(s=>s.k===wheelDestinationKey()),angle=-i*360/a.length;paintWheelMotion(angle+18,58);$('sectionWheel').classList.add('wheel-visible');animateWheelMotion(angle,0,420);wheelRevealing=wheelMoving;updateNowSave();return;}
 if(session.travelling){await saveTravellingCheckin();return;}
 if(session.target){await saveWheelSection();return;}
 const original=session,draft=C.copy(session);let record;pendingWheel={session:original,value:JSON.stringify(draft.checkpoint)};
 const ok=await transact(()=>{record=C.saveSectionCheckin(DB,draft.date,draft.id,draft.checkpoint,DB.metrics,checkinSection());if(!record)throw Error('Сначала отметь самочувствие или тег');record.note=draft.checkpoint.note||'';delete data().wheelDrafts?.[draft.date]?.[CURRENT];});
 pendingWheel=null;if(!ok){updateNowSave();return;}
 undoNow=draft;if(session===original&&JSON.stringify(session.checkpoint)===JSON.stringify(draft.checkpoint)){session=null;go('day');renderDay();document.getElementById('nowNotice').hidden=false;}else if(session===original){stashWheel();updateNowSave();}
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
 undoNow=null;document.getElementById('nowNotice').hidden=true;curDate=draft.date;
 session=draft;curSec=CURRENT;buildTracks();cur=Math.max(0,CURS.findIndex(m=>m.k===data().settings.activeScale));renderCpTags();$('cpName').textContent='Сейчас';paintCpMeal();go('ring');updateNowSave();
}
function initNowSave(){
 const b=document.createElement('button');b.id='nowSave';b.className='now-save';b.textContent='Сохранить';b.onclick=submitNow;document.body.append(b);
 const n=document.createElement('div');n.id='nowNotice';n.className='now-notice';n.hidden=true;n.setAttribute('role','status');n.innerHTML='<span>Запись сохранена в журнал</span><button type="button">Отменить</button>';n.querySelector('button').onclick=undoNowSave;document.body.append(n);
}


function defaultWheelSection(){
 const hour=new Date().getHours(),cp=DB.days[curDate]?.cp||{};
 const morningDone=DB.sections.find(x=>x.k==='wake')?.scales.some(k=>Number.isFinite(cp.wake?.[k]))||Object.values(cp.wake?.tags||{}).some(Boolean)||(DB.days[curDate]?.care?.checkins||[]).some(x=>x.sectionKey==='wake');
 const desired=hour>=4&&hour<12&&!morningDone?'wake':hour>=4&&hour<12?'am':hour>=12&&hour<17?'pm':hour>=17&&hour<21?'dn':hour>=21||hour<4?'eve':CURRENT;
 return DB.sections.some(s=>s.k===desired)?desired:CURRENT;
}
function wheelDraftKey(draft){return draft.travelling?'care_travelling':draft.target||CURRENT;}
function stashWheel(){if(!session||session.readOnly||!session.dirty)return;if(pendingWheel?.session===session&&pendingWheel.value===JSON.stringify(session.checkpoint))return;const d=data();d.wheelDrafts=d.wheelDrafts||{};d.wheelDrafts[session.date]=d.wheelDrafts[session.date]||{};d.wheelDrafts[session.date][wheelDraftKey(session)]=C.copy(session);if(session.dirty)save();}
function wheelItems(){return DB.sections.concat([{...data().checkinSection,t:'Сейчас'}]);}
let panelAnimations=[];
function prepareSectionPanel(){
 const screen=document.querySelector('[data-screen="ring"]');let panel=$('sectionPanel');
 if(!panel){panel=document.createElement('div');panel.id='sectionPanel';while(screen.firstChild)panel.append(screen.firstChild);screen.append(panel);const header=document.createElement('div');header.className='section-form-header';panel.prepend(header);['cpGrip'].forEach(k=>header.append($(k)));header.append($('cpName').closest('.top'));$('swipeZone').after($('cpMeal'));}
 return panel;
}
function slideSectionPanel(oldPanel,direction){
 const panel=prepareSectionPanel();panelAnimations.forEach(a=>a.cancel());panelAnimations=[];document.querySelectorAll('.section-outgoing').forEach(x=>x.remove());
 if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 const width=panel.clientWidth;oldPanel.removeAttribute('id');oldPanel.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));oldPanel.classList.add('section-outgoing');oldPanel.setAttribute('aria-hidden','true');oldPanel.inert=true;panel.parentNode.append(oldPanel);
 const opts={duration:300,easing:'cubic-bezier(.22,.75,.25,1)'};
 const out=oldPanel.animate([{transform:'translateX(0)'},{transform:'translateX('+(-direction*width)+'px)'}],opts),incoming=panel.animate([{transform:'translateX('+(direction*width)+'px)'},{transform:'translateX(0)'}],opts);panelAnimations=[out,incoming];out.onfinish=()=>oldPanel.remove();
}
function switchWheel(key){
 if(busy||fontWaiting||wheelRevealing||!session||session.readOnly||shownWheel!==session||wheelDestinationKey()===key)return;
 const a=wheelItems(),i=a.findIndex(s=>s.k===key);if(i<0)return;const base=-i*360/a.length,angle=base+Math.round((wheelAngle-base)/360)*360,direction=angle<wheelAngle?1:-1;
 const existingTravel=data().wheelDrafts?.[session.date]?.care_travelling;if(!session.travelling&&existingTravel){toastLong('Есть незавершённая запись: открой «Отметить самочувствие» на главной и сохрани её. Текущий черновик тоже сохранён.');stashWheel();return;}
 cancelWheelSpeech();stashWheel();const originDraftKey=session.target||CURRENT,originDraftId=session.id,oldPanel=prepareSectionPanel().cloneNode(true);
 if(!session.travelling){
 const baseline=session.baseline||{},cp=session.checkpoint,entered={time:cp.time,tags:{}};
 for(const m of DB.metrics)if(Number.isFinite(cp[m.k])&&cp[m.k]!==baseline[m.k])entered[m.k]=cp[m.k];
 for(const [tag,value]of Object.entries(cp.tags||{}))if(value&&value!==baseline.tags?.[tag])entered.tags[tag]=true;
 if(cp.note&&cp.note!==baseline.note)entered.note=cp.note;
 session.defs=Object.fromEntries(DB.metrics.map(m=>[m.k,C.copy(m)]));session.originKey=session.target||CURRENT;session.originTitle=checkinSection().t;session.checkpoint=entered;session.id=C.uid();session.travelling=true;session.dirty=Object.keys(entered.tags).length>0||!!entered.note||cp.time!==baseline.time||DB.metrics.some(m=>Number.isFinite(entered[m.k]));
 }
 session.target=key===CURRENT?null:key;delete session.destination;shownWheel=session;stashWheel();const drafts=data().wheelDrafts?.[session.date];if(drafts?.[originDraftKey]?.id===originDraftId){delete drafts[originDraftKey];save();}cur=0;buildTracks();renderCpTags();$('cpName').textContent=checkinSection().t;paintCpMeal();renderFacts();CURS.forEach((_,i)=>paint(i));updateNowSave();document.querySelector('[data-screen="ring"]').scrollTop=0;slideSectionPanel(oldPanel,direction);animateWheelMotion(angle,0);
}

let wheelDrag=null,recognition=null;
function cancelWheelSpeech(){if(recognition){const active=recognition;recognition=null;active.abort();}}

function syncWheelClearance(el){
 const dock=document.querySelector('.dock'),fab=$('fab'),action=$('nowSave');if(!dock||!fab||!action||!el.clientWidth)return;
 const d=dock.getBoundingClientRect(),cy=parseFloat(fab.style.top)||18;
 const buttonSize=action.getBoundingClientRect().width||60,buttonCenter=d.top+cy;
 action.style.bottom=(innerHeight-buttonCenter-buttonSize/2)+'px';
 const disc=el.querySelector('.wheel-disc');if(disc){const radius=buttonSize*(134/60),centerY=buttonCenter+buttonSize*(40/60);disc.style.width=disc.style.height=(radius*2)+'px';disc.style.marginLeft=(-radius)+'px';disc.style.top=(centerY-radius-el.getBoundingClientRect().top)+'px';}
 // The real disc is behind the original footer and button; the notch reveals green.
 el.style.maskImage='none';el.style.webkitMaskImage='none';
}
function balanceWheelLabelClearance(el){
 const disc=el.querySelector('.wheel-disc'),button=$('nowSave');if(!disc||!button||!el.clientWidth)return;
 const rimTop=el.getBoundingClientRect().top+parseFloat(getComputedStyle(disc).top),scale=(button.getBoundingClientRect().width||60)/60,target=(button.getBoundingClientRect().top-rimTop)/(2*scale);
 const sample=disc.querySelector('text'),font=sample?getComputedStyle(sample).font:'';
 const key=disc.dataset.items+'|'+target.toFixed(3)+'|'+font;if(disc.dataset.clearanceKey===key)return;let measured=true;
 disc.querySelectorAll('.wheel-label').forEach(group=>{const text=group.querySelector('text'),path=group.querySelector('path');const r=64;let arcCenter=target+r;
  for(let pass=0;pass<3;pass++){
   const x=r*Math.sin(100*Math.PI/180),y=arcCenter-r*Math.cos(100*Math.PI/180);
   path.setAttribute('d','M'+(134-x)+' '+y+' A'+r+' '+r+' 0 1 1 '+(134+x)+' '+y);
   let box;try{box=text.getBBox();}catch(_){measured=false;break;}if(!box.height||!Number.isFinite(box.y+box.height)){measured=false;break;}
   if(pass<2)arcCenter+=target-(box.y+box.height/2);
  }
  group.dataset.labelRadius=r.toFixed(3);

 });if(measured)disc.dataset.clearanceKey=key;
}
function renderWheel(){
 let el=$('sectionWheel');if(!el){el=document.createElement('div');el.id='sectionWheel';el.innerHTML='<div class="wheel-destination" role="status"></div><div class="wheel-lift"><div class="wheel-disc" role="group" aria-label="Выбрать раздел"></div></div><div class="wheel-draft"></div>';document.body.append(el);
 const destination=el.querySelector('.wheel-destination');destination.id='wheelDestination';$('cpMeal').after(destination);
 const disc=el.querySelector('.wheel-disc');
 let rotation=0,startIndex=0;
 function down(e){if(!session||busy||fontWaiting||wheelRevealing||shownWheel!==session||e.isPrimary===false)return;e.preventDefault();stopWheelMotion();rotation=wheelAngle;wheelDrag={x:e.clientX,id:e.pointerId,dx:0};disc.classList.add('dragging');disc.setPointerCapture(e.pointerId);}
 function move(e){if(!wheelDrag||e.pointerId!==wheelDrag.id)return;e.preventDefault();wheelDrag.dx=e.clientX-wheelDrag.x;paintWheelMotion(rotation+wheelDrag.dx*.42);}
 function finish(e,cancel){if(!wheelDrag||e.pointerId!==wheelDrag.id)return;e.preventDefault();const dx=wheelDrag.dx;wheelDrag=null;disc.classList.remove('dragging');const a=wheelItems(),step=360/a.length;if(cancel||Math.abs(dx)<24){const i=a.findIndex(s=>s.k===wheelDestinationKey()),base=-i*step;animateWheelMotion(base+Math.round((wheelAngle-base)/360)*360,0);return;}const next=((Math.round(-wheelAngle/step)%a.length)+a.length)%a.length;if(a[next].k===wheelDestinationKey()){const base=-next*step;animateWheelMotion(base+Math.round((wheelAngle-base)/360)*360,0);}else switchWheel(a[next].k);}
 disc.addEventListener('pointerdown',down);disc.addEventListener('pointermove',move);disc.addEventListener('pointerup',e=>finish(e,false));disc.addEventListener('pointercancel',e=>finish(e,true));
 disc.addEventListener('lostpointercapture',()=>{if(wheelDrag){wheelDrag=null;disc.classList.remove('dragging');const a=wheelItems(),i=a.findIndex(s=>s.k===wheelDestinationKey()),base=-i*360/a.length;animateWheelMotion(base+Math.round((wheelAngle-base)/360)*360,0);}});
 // Prevent Safari scrolling from stealing the horizontal wheel gesture.
 disc.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
 disc.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
 el.tabIndex=0;el.setAttribute('role','slider');el.setAttribute('aria-label','Раздел — проведи по колесу влево или вправо');
 el.addEventListener('keydown',e=>{if(shownWheel===session&&!fontWaiting&&!wheelRevealing&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const a=wheelItems(),i=a.findIndex(s=>s.k===wheelDestinationKey());const j=e.key==='Home'?0:e.key==='End'?a.length-1:(i+(e.key==='ArrowRight'?1:-1)+a.length)%a.length;switchWheel(a[j].k);el.focus({preventScroll:true});}});
 }
 if(!session||session.readOnly){el.classList.remove('wheel-visible');return;}syncWheelClearance(el);el.classList.toggle('wheel-visible',shownWheel===session);el.tabIndex=shownWheel===session?0:-1;el.setAttribute('aria-hidden',String(shownWheel!==session));
 let note=$('wheelNote');if(!note){note=document.createElement('textarea');note.id='wheelNote';note.placeholder='Заметка к этому разделу';note.setAttribute('aria-label','Заметка к выбранному разделу');$('cpTags').after(note);note.addEventListener('input',()=>{if(session&&!session.readOnly){session.checkpoint.note=note.value;saveCheckin();}});}if(document.activeElement!==note)note.value=session.checkpoint.note||'';
 const a=wheelItems(),i=a.findIndex(s=>s.k===wheelDestinationKey());
 const disc=el.querySelector('.wheel-disc'),signature=a.map(s=>s.k+':'+s.t).join('|');
 if(disc.dataset.items!==signature){disc.dataset.items=signature;disc.innerHTML='<svg class="wheel-type" viewBox="0 0 268 268" aria-hidden="true">'+a.map((s,n)=>'<g class="wheel-label" transform="rotate('+(n*360/a.length)+' 134 134)"><defs><path id="wheelText'+n+'" d="M110.69 31.36 A164 164 0 0 1 249.31 31.36"/></defs><text dominant-baseline="middle"><textPath dominant-baseline="middle" href="#wheelText'+n+'" startOffset="50%" text-anchor="middle">'+h(s.t.toLocaleUpperCase('ru'))+'</textPath></text></g>').join('')+'</svg>';}
 balanceWheelLabelClearance(el);
 if(shownWheel!==session&&!wheelDrag&&!wheelMoving)paintWheelMotion(-i*360/a.length);
 el.setAttribute('aria-valuemin','0');el.setAttribute('aria-valuemax',String(a.length-1));el.setAttribute('aria-valuenow',String(i));el.setAttribute('aria-valuetext',a[i]?.t||'Сейчас');
 $('wheelDestination').textContent=(session.travelling?'Новая запись → ':'Журнал → ')+wheelDestinationTitle()+' · '+ruDate(session.date)+(session.travelling?' · сохранённые записи не меняются':'');
 el.querySelector('.wheel-draft').textContent=session.dirty?'Черновик · сохранится в выбранный раздел':'Свайп по дуге · выбор раздела';
}
async function saveWheelSection(){
 if(busy||!session?.dirty||!guard(session.date))return;
 const original=session,draft=C.copy(session),section=DB.sections.find(x=>x.k===draft.target);if(!section)return;pendingWheel={session:original,value:JSON.stringify(draft.checkpoint)};
 const ok=await transact(()=>{
 const d=day(draft.date);d.wheelHistory=d.wheelHistory||[];
 if(d.cp[draft.target])d.wheelHistory.push({section:draft.target,checkpoint:C.copy(d.cp[draft.target]),replacedAt:new Date().toISOString()});
 d.cp[draft.target]=C.copy(draft.checkpoint);delete data().wheelDrafts?.[draft.date]?.[draft.target];
 });
 pendingWheel=null;if(!ok){updateNowSave();return;}
 if(session===original&&JSON.stringify(session.checkpoint)===JSON.stringify(draft.checkpoint)){session.dirty=false;session=null;go('day');renderDay();}else if(session===original){stashWheel();updateNowSave();}toastLong('Сохранено: '+section.t+' · '+ruDate(draft.date));
}
function dictateWheel(){
 const Speech=root.SpeechRecognition||root.webkitSpeechRecognition;if(!Speech){toastLong('Голосовой ввод недоступен в этом браузере. Отметь шкалу или тег — появится «Сохранить».');return;}
 if(recognition)return;const target=session;recognition=new Speech();const engine=recognition;recognition.lang='ru-RU';recognition.onresult=e=>{if(recognition!==engine)return;target.checkpoint.note=(target.checkpoint.note?target.checkpoint.note+'\n':'')+e.results[0][0].transcript;target.dirty=true;const d=data();d.wheelDrafts=d.wheelDrafts||{};d.wheelDrafts[target.date]=d.wheelDrafts[target.date]||{};d.wheelDrafts[target.date][wheelDraftKey(target)]=C.copy(target);save();if(session===target)updateNowSave();toastLong('Диктовка добавлена в черновик: '+(DB.sections.find(s=>s.k===target.target)?.t||'Сейчас'));};recognition.onerror=()=>toast('Не удалось распознать речь');recognition.onend=()=>{if(recognition===engine)recognition=null;};try{recognition.start();}catch(e){recognition=null;toast('Голосовой ввод недоступен');}
}

function openMood(recordId,returnTo='day',explicitKey=null){
 const panel=prepareSectionPanel(),home=document.querySelector('[data-screen="day"].on .ringWrap.nwR');if(home){const top=home.getBoundingClientRect().top+home.closest('.screen').scrollTop;document.documentElement.style.setProperty('--section-arc-top',Math.max(90,top)+'px');}
 document.getElementById('nowNotice').hidden=true;
 const record=recordId?C.readDay(DB,curDate).checkins.find(x=>x.id===recordId):null;
 const checkpoint={time:record?.time||nowHM(),note:record?.note||'',tags:C.copy(record?.tags||{})},defs=C.copy(record?.metricDefs||{});
 if(record){Object.assign(checkpoint,record.metricValues||{});const old={feeling:['Самочувствие',-3,3],joy:['Радость',0,4],strain:['Напряжение',0,4]};for(const [key,value]of Object.entries(record.values||{})){const d=old[key];if(d){defs[key]={k:key,t:d[0],lo:d[1],hi:d[2],w:[],neg:key==='strain'};checkpoint[key]=value;}}}
 session={id:record?.id||C.uid(),date:curDate,checkpoint,defs,readOnly:!!record,returnTo,sectionTitle:record?.sectionTitle,sourceSectionTitle:record?.sourceSectionTitle}; if(!record){const key=explicitKey||defaultWheelSection();const saved=(!explicitKey&&data().wheelDrafts?.[curDate]?.care_travelling)||data().wheelDrafts?.[curDate]?.[key];session=saved?C.copy(saved):{...session,target:key===CURRENT?null:key,checkpoint:C.copy(DB.days[curDate]?.cp?.[key]||{time:nowHM(),tags:{}}),dirty:false};delete session.destination;if(!session.baseline)session.baseline=C.copy(DB.days[curDate]?.cp?.[session.target]||{});session.returnTo=returnTo;}shownWheel=null;stopWheelMotion();curSec=CURRENT;cur=0;
 let recordNote=$('careRecordNote');if(!recordNote){recordNote=document.createElement('p');recordNote.id='careRecordNote';recordNote.className='care-help';recordNote.style.whiteSpace='pre-wrap';$('cpTags').after(recordNote);}recordNote.hidden=!record;recordNote.textContent=record?[(record.sourceSectionTitle?'Форма: '+record.sourceSectionTitle:''),record.note||''].filter(Boolean).join('\n'):'';buildTracks();if(!record)cur=Math.max(0,CURS.findIndex(m=>m.k===data().settings.activeScale));renderCpTags();$('cpName').textContent=record?(record.sectionTitle||'Сейчас'):checkinSection().t;paintCpMeal();go('ring');updateNowSave();document.querySelector('[data-screen="ring"]').scrollTop=0;
}
function open(kind,id,parent){
 init();if(['mind','mood','diary','activity'].includes(kind)&&!id)rememberActive(kind);if(kind==='mood'){openMood(id,parent||'day');return;}
 if(kind==='updates')renderUpdates();
 else if(kind.startsWith('settings-'))renderSettingsPage(kind.slice(9));
 else if(kind==='diary')renderDiary();else if(kind==='entry'){currentEntry=id;renderEntry();}else if(kind==='mind')renderMind();else if(kind==='activity')renderActivity();
 go('care-'+kind);block(kind).scrollTop=0;
 if(parent){const grip=block(kind).querySelector('[data-care-close]');if(grip)grip.dataset.careClose=parent;}
 if(kind==='activity'&&data().strong?.source==='cloud'&&Date.now()-data().strong.updatedAt>60000)refreshStrong();
 if(kind==='activity')sportPoll();
}
function renderUpdates(){
 const releases=root.HappyDayReleases||[];
 // Update 53: the shared Happy module draws every entry (label, date, changes, author and time of the release).
 const cards=root.HappyReleaseNotes?root.HappyReleaseNotes.render(releases,{heading:'h2'}).replaceAll('class="happy-card happy-release"','class="card release-card happy-release"'):releases.map(r=>'<article class="card release-card"><h2>'+h(r.title||r.label||('Версия '+r.version))+'</h2><time datetime="'+h(r.date)+'">'+h(r.date.split('-').reverse().join('.'))+'</time><ul>'+r.changes.map(t=>'<li>'+h(t)+'</li>').join('')+'</ul></article>').join('');
 block('updates').innerHTML=header('История обновлений','settings',false)+'<p class="care-help">Happy Day</p>'+cards;
}
function rememberActive(key){if(!key)return;active=key;const s=data().settings;if(s.active!==key){s.active=key;if(!RO)save();}}
function rememberScale(key){if(!isCheckin()||session.readOnly)return;const s=data().settings;if(s.activeScale!==key){s.activeScale=key;if(!RO)save();}}
function center(smooth){const i=[...$('nwRail').children].findIndex(x=>x.dataset.careKey===active);if(i>=0)nwGo(i,smooth);}
function arcPath(a,b){const p=t=>[120+92*Math.cos(t*Math.PI/180),120+92*Math.sin(t*Math.PI/180)];const s=p(a),e=p(b);return 'M'+s.join(',')+' A92,92 0 0 '+(b>a?1:0)+' '+e.join(',');}
function balanceArc(m){
 return '<svg class="care-arc" viewBox="0 0 240 240" aria-hidden="true"><path class="care-track" d="'+arcPath(-90,58)+'"/><path class="care-track" d="'+arcPath(-90,-238)+'"/>'+
 (m.positive>0?'<path class="care-positive" d="'+arcPath(-90,-90+148*m.positive)+'"/>':'')+
 (m.negative>0?'<path class="care-negative" d="'+arcPath(-90,-90-148*m.negative)+'"/>':'')+
 (m.positive!==null?'<circle class="care-zero" cx="120" cy="28" r="3"/>':'')+'</svg>';
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
 $('nwRail').innerHTML=visible.map((k,i)=>'<div class="nwSl" data-i="'+i+'" data-care-key="'+k+'"><div class="ringWrap nwR">'+arcs[k]+'<button class="knob care-knob" data-care-open="'+k+'" aria-label="'+h(titles[k])+'">'+(k==='mood'?'<strong class="care-name">Отметить<br>самочувствие</strong>':'<span class="care-symbol" aria-hidden="true">'+icons[k]+'</span>')+'</button></div><button class="care-ring-label" data-care-open="'+k+'">'+h(k==='mood'?(selectedScale?.t||'Самочувствие'):titles[k])+'</button></div>').join('');
 $('nwTags').innerHTML='';$('nwTags').hidden=true;requestAnimationFrame(()=>{center(false);requestAnimationFrame(()=>{railPainting=false;});});
}
function checkinText(x){
 const names={feeling:'Самочувствие',joy:'Радость',strain:'Напряжение'};
 return Object.entries(x.values||{}).map(([k,v])=>(names[k]||k)+': '+(v>0&&k==='feeling'?'+':'')+v).concat(Object.entries(x.metricValues||{}).map(([k,v])=>{const m=x.metricDefs?.[k]||DB.metrics.find(m=>m.k===k);return (m?.t||k)+': '+(m?valTxt(m,v):num(v));}),Object.keys(x.tags||{}).filter(k=>x.tags[k]),x.note?[x.note]:[]).join(' · ');
}
function renderDiary(){
 const c=data(),p=C.diaryProgress(DB,curDate);
 block('diary').innerHTML=header('Дневник')+'<div class="card"><div class="care-stat">'+p.count+(p.goal?' / '+p.goal:'')+'</div><p class="care-help">'+(p.goal?'Записей за выбранный день.':'Записи за выбранный день.')+' '+(C.plan(c,curDate).goals.countAdditions!==false?'Сохранённые дополнения тоже учитываются.':'Считаются только новые записи.')+'</p></div><form id="careDiaryForm" class="card care-form"><h2>Новая запись</h2><label for="careBook">Дневник</label><select id="careBook" name="book">'+c.books.map(b=>'<option value="'+h(b.id)+'">'+h(b.name)+'</option>').join('')+'</select><label for="careDiaryTitle">Заголовок · необязательно</label><input id="careDiaryTitle" name="title" maxlength="120" type="text" placeholder="О чём эта запись?"><label for="careDiaryTime">Время</label><input id="careDiaryTime" name="time" type="time" required value="'+nowHM()+'"><label for="careDiaryText">Текст</label><textarea id="careDiaryText" name="text" required placeholder="Можно начать с одной мысли…"></textarea><button class="btn solid care-submit" type="submit">Сохранить запись</button></form><label class="care-label" for="careDiarySearch">Найти запись</label><input id="careDiarySearch" type="search" placeholder="Поиск по дневникам" style="width:100%;padding:13px;border-radius:14px;border:1px solid var(--glassBrd);font-size:16px;margin:10px 0 15px"><div id="careDiaryList"></div>';
 renderDiaryList('');
}
function renderDiaryList(query){const c=data(),q=query.trim().toLocaleLowerCase('ru'),entries=c.entries.filter(x=>(x.title+' '+x.text+' '+x.additions.map(a=>a.text).join(' ')).toLocaleLowerCase('ru').includes(q));
 $('careDiaryList').innerHTML=entries.slice().sort((a,b)=>b.createdAt-a.createdAt).map(e=>'<button class="card care-record" data-care-entry="'+h(e.id)+'"><time>'+h(ruDate(e.date))+' · '+h(e.time)+' · '+h(c.books.find(b=>b.id===e.bookId)?.name||'Дневник')+'</time><b>'+h(e.title)+'</b><p>'+h(e.text.slice(0,160))+(e.text.length>160?'…':'')+'</p><p class="care-help">'+(e.additions.length?'Дополнений: '+e.additions.length:'Открыть запись')+'</p></button>').join('')||empty(q?'Ничего не найдено.':'Здесь будут твои записи.');
}
function renderEntry(){const e=data().entries.find(x=>x.id===currentEntry);if(!e){open('diary');return;}
 block('entry').innerHTML=header('Запись','care-diary')+'<article class="card"><h2>'+h(e.title)+'</h2><p class="care-help">'+h(ruDate(e.date))+' · '+h(e.time)+'</p><div class="care-long">'+h(e.text)+'</div>'+e.additions.map(a=>'<section class="care-addition" id="addition-'+h(a.id)+'"><p class="care-help">Дополнение · '+h(ruDate(a.date))+' · '+h(a.time)+'</p><div class="care-long">'+h(a.text)+'</div></section>').join('')+'</article><form id="careAppendForm" class="card care-form"><h2>Дополнить запись</h2><p class="care-help">Дополнение будет отмечено в журнале за '+h(ruDate(curDate))+'. Исходная запись останется.</p><label for="careAppendText">Продолжение</label><textarea id="careAppendText" name="text" required></textarea><button class="btn solid care-submit" type="submit">Сохранить дополнение</button></form>';
}
function renderMind(){const c=data(),goal=C.mindGoal(c,curDate),minutes=C.mindMinutes(DB,curDate),plan=C.scheduled(c,curDate),logs=C.readDay(DB,curDate).practices;
 block('mind').innerHTML=header('Осознанность')+'<div class="card"><div class="care-stat">'+num(minutes)+(goal.value>0?' / '+num(goal.value):'')+' мин</div><p class="care-help">'+(goal.source==='schedule'?(goal.value?'Полный круг — сумма длительностей практик в расписании на этот день.':'На этот день практики не запланированы. Можно заниматься без цели.'):(goal.value?'Полный круг — твоя личная цель.':'Практики за выбранный день.'))+'</p></div><div class="card"><h2>Дыхание и медитации</h2><b>В разработке</b><p class="care-help">Здесь появятся быстрые упражнения и контент для поддержки состояния. Уже можно составить расписание и отметить выполненную практику.</p></div><div class="eyebrow"><span>Расписание на '+h(ruDate(curDate))+'</span></div>'+plan.map(p=>'<div class="card"><b>'+h(p.time)+' · '+h(p.name)+'</b><p class="care-help">'+p.minutes+' минут · план</p><button class="mini" data-care-practice="'+h(p.id)+'">Отметить выполненное время</button></div>').join('')+(plan.length?'':empty('На этот день расписание пустое.'))+
 '<form id="carePracticeForm" class="card care-form"><h2>Записать практику</h2><input type="hidden" name="planId" value=""><label for="carePracticeName">Название</label><input name="name" id="carePracticeName" type="text" placeholder="Медитация, дыхание…" maxlength="100"><div class="care-grid"><div><label for="carePracticeTime">Время</label><input id="carePracticeTime" name="time" type="time" required value="'+nowHM()+'"></div><div><label for="carePracticeMinutes">Фактически, мин</label><input id="carePracticeMinutes" name="minutes" type="number" min="0.1" max="1440" step="0.1" required placeholder="Сколько провёл"></div></div><p class="care-help">План сам по себе не засчитывается. В дугу попадают сохранённые минуты практики и импортированные сессии осознанности; время просмотра приложения не учитывается.</p><button class="btn solid care-submit" type="submit">Сохранить практику</button></form><div class="eyebrow">Выполнено</div>'+logs.slice().reverse().map(x=>'<div class="card"><b>'+h(x.time)+' · '+h(x.name)+'</b><p class="care-help">'+num(x.minutes)+' мин</p></div>').join('');
}
/* 57.5: «съедено» за день — итог из сводки Meal и порции со счётчиков, которые Meal ещё не посчитал (нажатие в Day
   или Sport попадает в кольцо сразу; правило — в shared/happy-summaries.js). Сводки нет или в дне нет ни еды, ни
   порций — null: «не записано», а не ноль. */
function mealFood(date){
 const day=mealDay(date);
 if(!S||!DB.mealLink)return day;
 const sum=S.meal.day(DB.mealLink,date,DB.mealCounters);
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
 block('activity').innerHTML=header('Активность')+'<section class="card happy-energy" id="careEnergy" aria-label="Энергия и активность"></section><div class="eyebrow">Расписание</div>'+a.plans.map(p=>'<div class="card"><b>'+h(p.start.slice(11,16))+' · '+h(p.title)+'</b><p class="care-help">'+p.minutes+' мин · '+(a.workouts.some(w=>w.templateId===p.templateId&&w.plannedStart===p.start)?'выполнено':'план')+'</p>'+(p.note?'<p class="care-long">'+h(p.note)+'</p>':'')+'</div>').join('')+(a.plans.length?'':empty('На этот день тренировок в расписании нет.'))+'<div class="card"><h2>Happy Strong</h2><p class="care-help">Sport открывается отдельно. Войди тем же аккаунтом; переход сам по себе не переносит записи.</p><a class="btn solid care-external" href="'+STRONG_URL+'" data-happy-app="sport" target="_blank" rel="noopener">Открыть Sport ↗</a></div>';
 strongLink();
 paintEnergy();
}
function strongSettings(){const s=data().strong;
 return '<div class="card care-form"><h2>Связь с Happy Strong</h2><p class="care-help">'+(s?'Обновлено '+h(new Date(s.updatedAt).toLocaleString('ru-RU'))+' · '+(s.source==='cloud'?'облачная копия':'JSON-копия'):'Расписание ещё не подключено.')+'</p><p class="care-help">В Strong сохрани облачную копию или выгрузи дневник. Здесь читаются расписание и краткие итоги тренировок.</p><button class="btn care-submit" data-care-strong-refresh'+(strongBusy?' disabled':'')+'>'+(strongBusy?'Читаем…':'Прочитать облачную копию')+'</button><label class="btn care-submit care-file-picker">Выбрать JSON-копию Strong<input type="file" id="careStrongFile" accept=".json,application/json"></label><p class="care-help" role="status">'+h(strongStatus||'Для облака нужен тот же аккаунт Happy. Свежие планы появятся после сохранения копии в Strong.')+'</p></div>';
}
function refreshStrongUI(){if(block('settings-activity').classList.contains('on'))renderSettingsPage('activity');if(block('activity').classList.contains('on'))renderActivity();}

async function refreshStrong(){
 if(strongBusy)return;if(!clOn()){strongStatus='Войди в свой аккаунт Happy в настройках или выбери JSON-копию Strong.';refreshStrongUI();return;}
 const uid=CL.s.uid,db=DB;strongBusy=true;strongStatus='';refreshStrongUI();
 try{const input=await clGet('sport','journal');if(CL.s?.uid!==uid||DB!==db)throw Error('Аккаунт изменился — повтори загрузку.');if(!input)throw Error('Облачная копия Strong ещё не сохранена. Сохрани её в настройках Strong или загрузи файл.');const next=C.strongSnapshot(input,data().strong,todayISO(),'cloud');if(await transact(()=>{data().strong=next;}))strongStatus='Расписание обновлено из облачной копии.';}
 catch(e){strongStatus=e.message||'Не удалось прочитать копию. Сохранённое расписание остаётся.';}
 finally{strongBusy=false;refreshStrongUI();}
}
function scheduleForm(c){return '<details class="card care-form"><summary class="care-summary">Настроить расписание</summary><p class="care-help">Изменения действуют с сегодняшнего дня. Прошлые цели сохраняются.</p><div>'+c.schedule.map(x=>'<div class="care-setting-row"><span>'+h(x.name)+' · '+h(x.time)+' · '+x.minutes+' мин<br><small>'+h(x.kind==='once'?ruDate(x.date):x.days.map(i=>['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][i]).join(', '))+'</small></span><button type="button" class="mini" data-care-remove-plan="'+h(x.id)+'" aria-label="Удалить практику из расписания">×</button></div>').join('')+'</div><form id="careScheduleForm"><label for="carePlanName">Практика</label><input id="carePlanName" name="name" type="text" required maxlength="100" placeholder="Например, утренняя медитация"><div class="care-grid"><div><label for="carePlanTime">Время</label><input id="carePlanTime" name="time" type="time" required></div><div><label for="carePlanMinutes">План, мин</label><input id="carePlanMinutes" name="minutes" type="number" required min="1" max="1440" placeholder="Длительность"></div></div><label for="carePlanKind">Повторение</label><select id="carePlanKind" name="kind"><option value="once">Один день</option><option value="weekly">По дням недели</option></select><div id="carePlanDateRow"><label for="carePlanDate">Дата</label><input id="carePlanDate" name="date" type="date" min="'+todayISO()+'" value="'+todayISO()+'"></div><div id="carePlanDaysRow" hidden><label>Дни недели</label><div class="care-days">'+[1,2,3,4,5,6,0].map(i=>'<label><input type="checkbox" name="days" value="'+i+'">'+['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][i]+'</label>').join('')+'</div></div><button class="btn solid care-submit" type="submit">Добавить в расписание</button><p class="care-help">Добавление практики включает расчёт цели по расписанию. Ручную цель можно выбрать в настройках.</p></form></details>';}
function options(value,arr){return arr.map(([v,t])=>'<option value="'+v+'"'+(value===v?' selected':'')+'>'+t+'</option>').join('');}
function mappingRows(c){const defs=[['check:feeling','Общее ощущение','bipolar'],['check:joy','Радость','positive'],['check:strain','Напряжение','negative']].concat(DB.metrics.map(m=>['metric:'+m.k,m.t,metricNeg(m)?'negative':'bipolar']));
 return defs.map(([key,title,def])=>{const m=c.settings.mappings[key]||{mode:def};return '<div class="care-mapping" data-mapping="'+h(key)+'"><label class="care-label">'+h(title)+'</label><select data-map-mode aria-label="Направление шкалы '+h(title)+'">'+options(m.mode,[['bipolar','От неприятного (−) к приятному (+)'],['positive','Больше → сильнее приятное (+)'],['negative','Больше → сильнее неприятное (−)'],['optimal','Комфортен средний диапазон'],['ignore','Не учитывать в дуге']])+'</select><div class="care-grid" data-map-range'+(m.mode==='optimal'?'':' hidden')+'><div><label>Нижняя граница, %</label><input data-map-low type="number" min="0" max="100" value="'+pct(m.low??.35)+'"></div><div><label>Верхняя граница, %</label><input data-map-high type="number" min="0" max="100" value="'+pct(m.high??.65)+'"></div></div></div>';}).join('');
}
function renderSettings(){
 if(!ready)return;const s=data().settings;
 const names={state:'Текущее состояние',diary:'Дневник',mood:'Самочувствие',activity:'Активность',mind:'Осознанность'};
 const order=s.settingsOrder||['state',...s.order];
 $('careSettings').innerHTML='<div class="eyebrow"><span>Настройки «Сейчас»</span></div><div class="care-function-list">'+order.map(k=>'<div class="card care-function-row" data-care-function="'+k+'"><button class="care-function-open" data-care-open="settings-'+k+'"><span>'+names[k]+'</span>'+CHEV+'</button>'+(k==='state'?'':'<label class="care-switch"><input type="checkbox" data-care-visible="'+k+'" aria-label="Показывать '+titles[k]+'"'+(!s.hidden.includes(k)?' checked':'')+'><i></i></label>')+'<button class="dragH care-function-drag" aria-label="Переместить '+names[k]+'" title="Перетащи или используй стрелки вверх и вниз"><svg viewBox="0 0 24 24"><path d="M4 8h16M4 12h16M4 16h16"/></svg></button></div>').join('')+'</div>';
}
function moveFunction(key,to){
 const s=data().settings,order=s.settingsOrder.slice(),from=order.indexOf(key);if(RO||from<0||to<0||to>=order.length||from===to)return;
 order.splice(to,0,order.splice(from,1)[0]);s.settingsOrder=order;s.order=order.filter(k=>k!=='state');save();renderSettings();renderNow();
}
function bindSettingsOrder(){
 const host=$('careSettings');let drag=null;
 host.addEventListener('pointerdown',e=>{const handle=e.target.closest('.care-function-drag');if(!handle||RO)return;const row=handle.closest('[data-care-function]');drag={handle,row,key:row.dataset.careFunction,y:e.clientY,centres:[...host.querySelectorAll('[data-care-function]')].map(r=>{const b=r.getBoundingClientRect();return b.top+b.height/2;}),to:data().settings.settingsOrder.indexOf(row.dataset.careFunction)};handle.setPointerCapture(e.pointerId);row.classList.add('dragging');e.preventDefault();});
 host.addEventListener('pointermove',e=>{if(!drag)return;drag.row.style.transform='translateY('+(e.clientY-drag.y)+'px)';drag.to=drag.centres.reduce((best,y,i)=>Math.abs(y-e.clientY)<Math.abs(drag.centres[best]-e.clientY)?i:best,0);});
 const finish=cancel=>{if(!drag)return;const d=drag;drag=null;d.row.style.transform='';d.row.classList.remove('dragging');if(!cancel)moveFunction(d.key,d.to);};
 host.addEventListener('pointerup',()=>finish(false));host.addEventListener('pointercancel',()=>finish(true));
 host.addEventListener('keydown',e=>{const handle=e.target.closest('.care-function-drag');if(!handle||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const key=handle.closest('[data-care-function]').dataset.careFunction;moveFunction(key,data().settings.settingsOrder.indexOf(key)+(e.key==='ArrowDown'?1:-1));host.querySelector('[data-care-function="'+key+'"] .care-function-drag')?.focus();});
}
function renderCheckinSettings(){const host=$('careSectionConfig');if(host)host.innerHTML='<div class="secListInner">'+sectionMarkup(checkinSection(),-1)+'</div>';}
function renderSettingsPage(kind){
 const c=data(),s=c.settings,screen=block('settings-'+kind),title={state:'Текущее состояние',mood:'Самочувствие',diary:'Дневник',activity:'Активность',mind:'Осознанность'}[kind];
 const host=$('careSectionConfig');if(host)host.remove();
 let html=header(title,'settings',false);
 if(kind==='state')html+='<div class="card"><h2>Кнопки-виджеты</h2>'+s.order.map((k,i)=>'<div class="care-setting-row"><span>'+titles[k]+'</span><button class="mini" data-care-move="'+k+'" data-dir="-1" aria-label="'+titles[k]+': влево"'+(!i?' disabled':'')+'>←</button><button class="mini" data-care-move="'+k+'" data-dir="1" aria-label="'+titles[k]+': вправо"'+(i===s.order.length-1?' disabled':'')+'>→</button><input type="checkbox" data-care-visible="'+k+'" aria-label="Показывать '+titles[k]+'"'+(!s.hidden.includes(k)?' checked':'')+'></div>').join('')+'</div>';
 if(kind==='mood')html+='<form id="careMoodSettingsForm" class="card care-form">'+moodSettings(c,s)+'<button type="submit" class="btn solid care-submit">Сохранить</button></form>';
 if(kind==='mind')html+='<form id="careMindSettingsForm" class="card care-form">'+mindSettings(c,s)+'<button type="submit" class="btn solid care-submit">Сохранить</button></form>'+scheduleForm(c);
 if(kind==='diary')html+='<div class="card"><h2>Мои дневники</h2>'+c.books.map(b=>'<div class="care-setting-row"><span>'+h(b.name)+'</span></div>').join('')+'<button class="btn care-submit" data-care-book>Добавить дневник</button></div><form id="careDiarySettingsForm" class="card care-form">'+diarySettings(c,s)+'<button type="submit" class="btn solid care-submit">Сохранить</button></form>';
 if(kind==='activity')html+='<form id="careActivitySettingsForm" class="card care-form"><h2>Виджет энергии</h2><label for="careEnergyMode">Начальный режим</label><select id="careEnergyMode" name="start">'+options(c.activitySettings.start,[['balance','Баланс'],['eat','Съедено'],['spent','Потрачено']])+'</select><p class="care-help">С этого вида виджет открывается. Нажатие на кольцо меняет вид до следующего открытия.</p><label for="careEnergyScale">Масштаб кольца, ккал</label><input id="careEnergyScale" name="scale" type="number" min="100" max="20000" required value="'+c.activitySettings.scale+'"><button type="submit" class="btn solid care-submit">Сохранить</button></form>'+strongSettings();
 screen.innerHTML=html;
 if(host){if(kind==='mood'){screen.querySelector('form').before(host);renderCheckinSettings();}else block('settings-mood').append(host);}
}
function moodSettings(c,s){return '<details open><summary class="care-summary">Самочувствие · смысл дуги</summary><label for="careMoodView">Показывать</label><select name="moodView" id="careMoodView">'+options(s.moodView,[['balance','Две стороны: приятные и неприятные'],['positive','Только приятные ощущения'],['negative','Только неприятные ощущения'],['coverage','Количество отметок относительно цели']])+'</select><label for="careAggregation">Какие отметки учитывать</label><select name="aggregation" id="careAggregation">'+options(s.aggregation,[['average','Среднее за выбранный день'],['latest','Последняя отметка']])+'</select><label for="careCheckinGoal">Личная цель отметок в день · необязательно</label><input name="checkinGoal" id="careCheckinGoal" type="number" min="1" max="100" value="'+(s.checkinGoal||'')+'" placeholder="Без цели"><p class="care-help">Баланс = приятная часть − неприятная, от −100 до +100. Две стороны остаются видимы даже при нулевом балансе. Пропуск не считается нулём. Это личная шкала ощущений.</p><details><summary class="care-summary">Настроить значения ощущений</summary>'+mappingRows(c)+'<p class="care-help">Проценты задают положение комфортного диапазона на исходной шкале: 0% — её минимум, 100% — максимум. Внутри — +100; к краям оценка постепенно снижается до −100.</p></details><details><summary class="care-summary">Подгружать разделы дня</summary>'+DB.sections.map(x=>'<label class="care-check"><input name="sections" type="checkbox" value="'+h(x.k)+'"'+(!s.sectionKeys||s.sectionKeys.includes(x.k)?' checked':'')+'>'+h(x.t)+'</label>').join('')+'</details></details>';}
function mindSettings(c,s){return '<details open><summary class="care-summary">Осознанность · цель круга</summary><label for="careGoalMode">Источник цели</label><select id="careGoalMode" name="mindMode">'+options(c.goals.scheduleEnabled?'schedule':'manual',[['manual','Моя цель в минутах'],['schedule','Сумма практик в расписании']])+'</select><label for="careMindGoal">Моя цель, минут в день</label><input id="careMindGoal" name="mindManual" type="number" min="1" max="1440" value="'+(c.goals.mindManual||'')+'" placeholder="Выбери сам"'+(c.goals.scheduleEnabled?' disabled':'')+'><p class="care-help">При расписании 5 + 10 минут полный круг = 15 минут. Без практик в расписании на день — день без плановой цели. Прошлые дни сохраняют свой план.</p></details>';}
function diarySettings(c,s){return '<details open><summary class="care-summary">Дневник · частота записей</summary><label for="careDiaryGoal">Сколько записей в день ты хочешь делать?</label><input id="careDiaryGoal" name="diaryGoal" type="number" min="1" max="100" value="'+(c.goals.diaryGoal||'')+'" placeholder="Без цели"><label class="care-check"><input name="countAdditions" type="checkbox"'+(c.goals.countAdditions?' checked':'')+'>Учитывать сохранённые дополнения</label><p class="care-help">При достижении цели круг заполнен. Лишние записи остаются видны числом, без штрафа.</p></details>';}
async function click(ev){
 const b=ev.target.closest('[data-care-open],[data-care-entry],[data-care-book],[data-care-practice],[data-care-remove-plan],[data-care-move],[data-care-strong-refresh],[data-energy-cycle]');if(!b)return;
 if(b.hasAttribute('data-care-open')){open(b.dataset.careOpen);return;}
 if(b.dataset.careEntry){open('entry',b.dataset.careEntry);return;}
 if(b.hasAttribute('data-care-book')){const name=await ask('Название дневника','');if(name?.trim()&&await transact(()=>data().books.push({id:C.uid(),name:name.trim().slice(0,80)})))renderSettingsPage('diary');return;}
 if(b.hasAttribute('data-care-strong-refresh')){refreshStrong();return;}
 if(b.hasAttribute('data-energy-cycle')){const modes=['spent','balance','eat'];energyMode=modes[(modes.indexOf(energyMode||data().activitySettings.start)+1)%3];paintEnergy();return;}
 if(b.dataset.careMove){if(RO){roWarn();return;}const c=data(),i=c.settings.order.indexOf(b.dataset.careMove),j=i+(+b.dataset.dir);if(j<0||j>=c.settings.order.length)return;if(await transact(()=>{[c.settings.order[i],c.settings.order[j]]=[c.settings.order[j],c.settings.order[i]];const stateAt=c.settings.settingsOrder.indexOf('state');c.settings.settingsOrder=c.settings.order.slice();c.settings.settingsOrder.splice(stateAt,0,'state');}))renderSettingsPage('state');return;}
 if(b.dataset.carePractice){const p=C.scheduled(data(),curDate).find(x=>x.id===b.dataset.carePractice);if(p){const f=$('carePracticeForm');f.elements.planId.value=p.id;f.elements.name.value=p.name;f.elements.time.value=p.time;f.elements.minutes.value='';f.scrollIntoView({block:'start'});f.elements.minutes.focus();}return;}
 if(b.dataset.careRemovePlan&&await confirmBox('Убрать практику из расписания с сегодняшнего дня? Прошедшие планы сохранятся.','Убрать')){if(await transact(()=>{const c=data();c.schedule=c.schedule.filter(x=>x.id!==b.dataset.careRemovePlan);C.rememberPlan(c,todayISO());}))renderSettingsPage('mind');}
}
async function change(ev){const el=ev.target;
 if(el.id==='careStrongFile'){const file=el.files?.[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error('Копия больше 20 МБ. Используй облачную копию.');const input=JSON.parse(await file.text()),next=C.strongSnapshot(input,data().strong,todayISO());if(await transact(()=>{data().strong=next;}))strongStatus='Расписание загружено из файла. Данные Strong не изменены.';}catch(e){strongStatus=e.message||'Не удалось прочитать файл';}refreshStrongUI();return;}

 if(el.dataset.careVisible){const k=el.dataset.careVisible;if(await transact(()=>{const s=data().settings;s.hidden=s.hidden.filter(x=>x!==k);if(!el.checked)s.hidden.push(k);})){renderSettings();if(block('settings-state').classList.contains('on'))renderSettingsPage('state');}return;}
 if(el.id==='carePlanKind'){$('carePlanDateRow').hidden=el.value==='weekly';$('carePlanDaysRow').hidden=el.value!=='weekly';}
 if(el.id==='careGoalMode')$('careMindGoal').disabled=el.value==='schedule';
 if(el.hasAttribute('data-map-mode'))el.parentElement.querySelector('[data-map-range]').hidden=el.value!=='optimal';
}
function input(ev){if(ev.target.id==='careDiarySearch')renderDiaryList(ev.target.value);}
async function submit(ev){const f=ev.target;if(!f.id?.startsWith('care'))return;ev.preventDefault();if(!f.reportValidity()||busy)return;const v=Object.fromEntries(new FormData(f));
 if(['careDiaryForm','careAppendForm','carePracticeForm'].includes(f.id)&&!guard(curDate))return;
 if(f.id==='careDiaryForm'){let entry;if(await transact(()=>{entry=C.addEntry(DB,curDate,v.time,v.title,v.text,v.book);})){open('entry',entry.id);toast('Запись добавлена в дневник и журнал дня');}}
 if(f.id==='careAppendForm'){if(await transact(()=>C.appendEntry(DB,currentEntry,curDate,nowHM(),v.text))){renderEntry();toast('Дополнение сохранено отдельным событием');}}
 if(f.id==='carePracticeForm'){if(await transact(()=>C.addPractice(DB,curDate,v.time,+v.minutes,v.name,v.planId))){renderMind();toast('Фактическое время сохранено');}}
 if(f.id==='careScheduleForm'){
  const days=new FormData(f).getAll('days').map(Number);if(v.kind==='weekly'&&!days.length){toast('Выбери дни недели');return;}
  if(await transact(()=>{const c=data();c.schedule.push({id:C.uid(),name:v.name.trim(),time:v.time,minutes:+v.minutes,kind:v.kind,date:v.date,days,since:todayISO(),enabled:true});c.goals.scheduleEnabled=true;C.rememberPlan(c,todayISO());})){renderSettingsPage('mind');toast('Расписание и цель дня обновлены');}
 }
 if(f.id==='careMoodSettingsForm'){
  const mappings={...data().settings.mappings};let invalid=false;
  f.querySelectorAll('[data-mapping]').forEach(row=>{const mode=row.querySelector('[data-map-mode]').value,low=+row.querySelector('[data-map-low]').value/100,high=+row.querySelector('[data-map-high]').value/100;if(mode==='optimal'&&low>high)invalid=true;mappings[row.dataset.mapping]={mode,low,high};});
  if(invalid){toast('Нижняя граница должна быть не выше верхней');return;}
  if(v.moodView==='coverage'&&!v.checkinGoal){toast('Для дуги количества укажи свою цель отметок');return;}
  if(await transact(()=>{const c=data();Object.assign(c.settings,{moodView:v.moodView,aggregation:v.aggregation,checkinGoal:v.checkinGoal?+v.checkinGoal:null,sectionKeys:new FormData(f).getAll('sections'),mappings});})){toast('Настройки сохранены');}
 }
 if(f.id==='careMindSettingsForm'&&await transact(()=>{const c=data();Object.assign(c.goals,{scheduleEnabled:v.mindMode==='schedule',mindManual:v.mindManual?+v.mindManual:v.mindMode==='schedule'?c.goals.mindManual:null});C.rememberPlan(c,todayISO());}))toast('Настройки сохранены');
 if(f.id==='careDiarySettingsForm'&&await transact(()=>{const c=data();Object.assign(c.goals,{diaryGoal:v.diaryGoal?+v.diaryGoal:null,countAdditions:!!v.countAdditions});C.rememberPlan(c,todayISO());}))toast('Настройки сохранены');
 if(f.id==='careActivitySettingsForm'&&await transact(()=>{data().activitySettings={start:['spent','eat','balance'].includes(v.start)?v.start:'balance',scale:+v.scale};})){energyMode=null;toast('Настройки сохранены');}
}
function journalEvents(date){const d=C.readDay(DB,date),entries=data().entries;
 return d.checkins.map(x=>({t:x.time,m:hmMin(x.time),dot:'#7CE3C9',title:x.sectionTitle||'Самочувствие',sub:(x.sourceSectionTitle?'Форма: '+x.sourceSectionTitle+' · ':'')+checkinText(x),careKind:'mood',careId:x.id,careDate:date})).concat(d.events.map(x=>({t:x.time,m:hmMin(x.time),dot:'#BC61FE',title:x.type==='diary-appended'?'Дополнен дневник':'Запись в дневнике',sub:entries.find(e=>e.id===x.entryId)?.title||x.title,careKind:'entry',careId:x.entryId,careDate:date,additionId:x.additionId})),d.practices.map(x=>({t:x.time,m:hmMin(x.time),dot:'#46FDFC',title:'Осознанность',sub:x.name+' · '+num(x.minutes)+' мин',careKind:'mind',careDate:date})),C.activity(data(),date).workouts.map(w=>({t:w.start.slice(11,16),m:hmMin(w.start.slice(11,16)),dot:'#FFE19A',title:'Активность · Happy Strong',sub:w.title+' · '+num(w.duration/60)+' мин',careKind:'activity',careId:w.id,careDate:date})));
}
function journalOpen(kind,id,date,additionId){curDate=date;open(kind,id,'trends');if(additionId)$('addition-'+additionId)?.scrollIntoView({block:'center'});}
sportRead();
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')sportPoll();});
window.addEventListener('storage',function(e){if(root.HappyProfile&&e.key===root.HappyProfile.key(SPORT_KEY)&&sportRead())sportRepaint();});
/* после запуска вход ещё загружается — спросим облако чуть позже и ещё раз, если не успел; после входа — сразу */
setTimeout(sportPoll,2500);setTimeout(sportPoll,9000);
{const afterSignIn=root.clAfterIn;root.clAfterIn=function(){sportPoll();return afterSignIn&&afterSignIn.apply(this,arguments);};}
root.SelfCare={sportPoll,mealChanged,openSection(k){init();if(DB.sections.some(s=>s.k===k))openMood(null,'day',k);},checkinDirty,restoreCheckinDirty,data,init,renderNow,renderSettings,renderCheckinSettings,open,center,journalEvents,journalOpen,onNavigate,closeCurrent,checkinSection,addCheckinTag,isCheckin,checkinReadOnly,checkinDay,checkinScales,checkinTime,saveCheckin,rememberScale};
})(window);
