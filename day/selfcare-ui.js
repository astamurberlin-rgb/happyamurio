(function(root){
'use strict';
const C=root.HappyCare;
const titles={mind:'Осознанность',mood:'Отметить самочувствие',diary:'Дневник',activity:'Активность'};
const icons={mood:'+',mind:'<svg viewBox="0 0 24 24"><path d="M12 20V12M12 16C4 17 3 10 3 5c6 0 9 4 9 9M12 14c0-7 3-10 9-10 0 7-2 11-9 11"/></svg>',diary:'<svg viewBox="0 0 24 24"><path d="M16 3H5a2 2 0 0 0-2 2v15h15v-7M7 8h5M7 12h3M14 11l6-6 2 2-6 6-3 1z"/></svg>'};
icons.activity='<svg viewBox="0 0 24 24"><circle cx="15" cy="4" r="2"/><path d="m12 8 4 4 4 1M12 8l-4 3-3 1M12 8l-2 7 5 3 2 4M10 15l-3 6H3"/></svg>';
const STRONG_URL='https://astamurberlin-rgb.github.io/happyamurio/sport/';
const h=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const $=id=>document.getElementById(id);
const num=v=>(Math.round(v*10)/10).toLocaleString('ru-RU');
const pct=v=>Math.round(v*100);
const signed=v=>(v>0?'+':v<0?'−':'')+Math.abs(pct(v));
const empty=t=>'<p class="care-empty">'+h(t)+'</p>';
let ready=false,active='mood',currentEntry=null,busy=false,strongBusy=false,strongStatus='';
let session=null,railTimer=null,railPainting=false;
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
 window.addEventListener('resize',()=>center(false));
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
 document.addEventListener('pointerdown',e=>{const grip=e.target.closest('.care-grip');if(!grip)return;const screen=grip.closest('.screen');drag={grip,screen,y:e.clientY,dy:0};grip.setPointerCapture(e.pointerId);screen.style.transition='none';});
 document.addEventListener('pointermove',e=>{if(!drag)return;drag.dy=Math.max(0,e.clientY-drag.y);drag.screen.style.transform='translateY('+drag.dy+'px)';});
 const finish=cancel=>{if(!drag)return;const d=drag;drag=null;d.screen.style.transition='transform .24s';d.screen.style.transform='';if(!cancel&&(d.dy>70||d.dy<6))closeCurrent();setTimeout(()=>{d.screen.style.transition='';},250);};
 document.addEventListener('pointerup',()=>finish(false));document.addEventListener('pointercancel',()=>finish(true));
 document.addEventListener('keydown',e=>{if(e.target.matches('.care-grip')&&['Enter',' '].includes(e.key)){e.preventDefault();closeCurrent();}});
}
function onNavigate(name){document.body.classList.toggle("now-editing",name==="ring"&&isCheckin()&&!session.readOnly);updateNowSave();if(session&&!session.readOnly&&CURS[cur])rememberScale(CURS[cur].k);if(session&&(name!=='ring'||curSec!==CURRENT)){session=null;if(curSec===CURRENT)curSec=DB.sections[0]?.k||'wake';}}
function checkinSection(){return data().checkinSection;}
function isCheckin(){return !!session&&curSec===CURRENT;}
function checkinReadOnly(){return isCheckin()&&session.readOnly;}
function checkinDay(){return {cp:{[CURRENT]:session.checkpoint}};}
function checkinScales(){return session?.readOnly?Object.values(session.defs):checkinSection().scales.map(k=>DB.metrics.find(m=>m.k===k)).filter(Boolean);}
function checkinTime(){return isCheckin()?{t:session.checkpoint.time,src:'manual'}:null;}
function saveCheckin(){ updateNowSave(); }
let undoNow=null;
function updateNowSave(){
 const b=document.getElementById('nowSave');if(!b)return;
 b.disabled=busy||!session||!(checkinSection().scales.some(k=>Number.isFinite(session.checkpoint[k]))||Object.values(session.checkpoint.tags||{}).some(Boolean));
}
async function submitNow(){
 if(busy||!isCheckin()||session.readOnly||!guard(session.date))return;
 const draft=C.copy(session);let record;
 const ok=await transact(()=>{record=C.saveSectionCheckin(DB,draft.date,draft.id,draft.checkpoint,DB.metrics,checkinSection());if(!record)throw Error('Сначала отметь самочувствие или тег');});
 if(!ok){updateNowSave();return;}
 undoNow=draft;go('day');renderDay();document.getElementById('nowNotice').hidden=false;
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

function openMood(recordId,returnTo='day'){
 document.getElementById('nowNotice').hidden=true;
 const record=recordId?C.readDay(DB,curDate).checkins.find(x=>x.id===recordId):null;
 const checkpoint={time:record?.time||nowHM(),tags:C.copy(record?.tags||{})},defs=C.copy(record?.metricDefs||{});
 if(record){Object.assign(checkpoint,record.metricValues||{});const old={feeling:['Самочувствие',-3,3],joy:['Радость',0,4],strain:['Напряжение',0,4]};for(const [key,value]of Object.entries(record.values||{})){const d=old[key];if(d){defs[key]={k:key,t:d[0],lo:d[1],hi:d[2],w:[],neg:key==='strain'};checkpoint[key]=value;}}}
 session={id:record?.id||C.uid(),date:curDate,checkpoint,defs,readOnly:!!record,returnTo};curSec=CURRENT;cur=0;
 buildTracks();if(!record)cur=Math.max(0,CURS.findIndex(m=>m.k===data().settings.activeScale));renderCpTags();$('cpName').textContent='Сейчас';paintCpMeal();go('ring');document.querySelector('[data-screen="ring"]').scrollTop=0;
}
function open(kind,id,parent){
 init();if(['mind','mood','diary','activity'].includes(kind)&&!id)rememberActive(kind);if(kind==='mood'){openMood(id,parent||'day');return;}
 if(kind==='updates')renderUpdates();
 else if(kind.startsWith('settings-'))renderSettingsPage(kind.slice(9));
 else if(kind==='diary')renderDiary();else if(kind==='entry'){currentEntry=id;renderEntry();}else if(kind==='mind')renderMind();else if(kind==='activity')renderActivity();
 go('care-'+kind);block(kind).scrollTop=0;
 if(parent){const grip=block(kind).querySelector('[data-care-close]');if(grip)grip.dataset.careClose=parent;}
 if(kind==='activity'&&data().strong?.source==='cloud'&&Date.now()-data().strong.updatedAt>60000)refreshStrong();
}
function renderUpdates(){
 block('updates').innerHTML=header('История обновлений','settings',false)+'<p class="care-help">Happy Day</p>'+(root.HappyDayReleases||[]).map(r=>'<article class="card release-card"><h2>'+h(r.title)+'</h2><time datetime="'+h(r.date)+'">'+h(r.date.split('-').reverse().join('.'))+'</time><ul>'+r.changes.map(t=>'<li>'+h(t)+'</li>').join('')+'</ul></article>').join('');
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
 return Object.entries(x.values||{}).map(([k,v])=>(names[k]||k)+': '+(v>0&&k==='feeling'?'+':'')+v).concat(Object.entries(x.metricValues||{}).map(([k,v])=>{const m=x.metricDefs?.[k]||DB.metrics.find(m=>m.k===k);return (m?.t||k)+': '+(m?valTxt(m,v):num(v));}),Object.keys(x.tags||{}).filter(k=>x.tags[k])).join(' · ');
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
function activityFacts(){
 const c=data(),a=C.activity(c,curDate),d=DB.days[curDate]||{},food=mealDay(curDate);
 const workouts=woOf(curDate),calories=workouts.map(w=>w.kcal??a.workouts.find(x=>x.id===w.id)?.energyKcal);
 return {food:food?{...food,g:DB.mealLink?.goals||{}}:null,eaten:food?.k??null,spent:null,rest:null,training:calories.length&&calories.every(C.finite)?calories.reduce((n,v)=>n+v,0):null,minutes:workouts.length?workouts.reduce((n,w)=>n+(w.min||0),0):a.connected?0:null,steps:null};
}
function paintEnergy(){const el=$('careEnergy');if(el)el.innerHTML=HappyDayEnergy.render(activityFacts(),data().activitySettings.mode,data().activitySettings.scale);}
function renderActivity(){
 const c=data(),a=C.activity(c,curDate);
 block('activity').innerHTML=header('Активность')+'<section class="card happy-energy" id="careEnergy" aria-label="Энергия и активность"></section><div class="eyebrow">Расписание</div>'+a.plans.map(p=>'<div class="card"><b>'+h(p.start.slice(11,16))+' · '+h(p.title)+'</b><p class="care-help">'+p.minutes+' мин · '+(a.workouts.some(w=>w.templateId===p.templateId&&w.plannedStart===p.start)?'выполнено':'план')+'</p>'+(p.note?'<p class="care-long">'+h(p.note)+'</p>':'')+'</div>').join('')+(a.plans.length?'':empty('На этот день тренировок в расписании нет.'))+'<div class="card"><h2>Happy Strong</h2><p class="care-help">Планируй движение и веди тренировки в Happy Strong.</p><a class="btn solid care-external" href="'+STRONG_URL+'" target="_blank" rel="noopener">Открыть Happy Strong ↗</a></div>';
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
 if(kind==='activity')html+='<form id="careActivitySettingsForm" class="card care-form"><h2>Виджет энергии</h2><label for="careEnergyMode">Начальный режим</label><select id="careEnergyMode" name="mode">'+options(c.activitySettings.mode,[['spent','Потрачено'],['eat','Съедено'],['balance','Баланс']])+'</select><label for="careEnergyScale">Масштаб кольца, ккал</label><input id="careEnergyScale" name="scale" type="number" min="100" max="20000" required value="'+c.activitySettings.scale+'"><button type="submit" class="btn solid care-submit">Сохранить</button></form>'+strongSettings();
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
 if(b.hasAttribute('data-energy-cycle')){const modes=['spent','balance','eat'],c=data();c.activitySettings.mode=modes[(modes.indexOf(c.activitySettings.mode)+1)%3];save();paintEnergy();return;}
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
 if(f.id==='careActivitySettingsForm'&&await transact(()=>{data().activitySettings={mode:v.mode,scale:+v.scale};}))toast('Настройки сохранены');
}
function journalEvents(date){const d=C.readDay(DB,date),entries=data().entries;
 return d.checkins.map(x=>({t:x.time,m:hmMin(x.time),dot:'#7CE3C9',title:'Самочувствие',sub:checkinText(x),careKind:'mood',careId:x.id,careDate:date})).concat(d.events.map(x=>({t:x.time,m:hmMin(x.time),dot:'#BC61FE',title:x.type==='diary-appended'?'Дополнен дневник':'Запись в дневнике',sub:entries.find(e=>e.id===x.entryId)?.title||x.title,careKind:'entry',careId:x.entryId,careDate:date,additionId:x.additionId})),d.practices.map(x=>({t:x.time,m:hmMin(x.time),dot:'#46FDFC',title:'Осознанность',sub:x.name+' · '+num(x.minutes)+' мин',careKind:'mind',careDate:date})),C.activity(data(),date).workouts.map(w=>({t:w.start.slice(11,16),m:hmMin(w.start.slice(11,16)),dot:'#FFE19A',title:'Активность · Happy Strong',sub:w.title+' · '+num(w.duration/60)+' мин',careKind:'activity',careId:w.id,careDate:date})));
}
function journalOpen(kind,id,date,additionId){curDate=date;open(kind,id,'trends');if(additionId)$('addition-'+additionId)?.scrollIntoView({block:'center'});}
root.SelfCare={data,init,renderNow,renderSettings,renderCheckinSettings,open,center,journalEvents,journalOpen,onNavigate,closeCurrent,checkinSection,isCheckin,checkinReadOnly,checkinDay,checkinScales,checkinTime,saveCheckin,rememberScale};
})(window);
