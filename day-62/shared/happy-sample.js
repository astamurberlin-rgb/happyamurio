/* Happy: пример Amurio — вымышленная история на 9 месяцев для тестового аккаунта (решение Астамура 25.11.2026).
 *
 * Amurio — вымышленный человек: 40 лет, рост 185 см. За девять месяцев он проходит путь от тяжёлого начала
 * (наркотики, алкоголь, «марафоны» без сна и еды, бессонные ночи) к ровной жизни: психиатр и антидепрессант,
 * психотерапия, тренер, расставание с бойфрендом, который остался зависимым, свои закономерности и привычки.
 * Слова в записях — как есть, без нейтральных замен (решение Астамура 25.11.2026).
 *
 * Здесь только сценарий и общие документы (замеры тела, профиль). Записи своего приложения кладёт файл этого
 * приложения (Day — day-sample.js) и берёт дни отсюда: история одна на три приложения.
 *
 *   HappySample.allowed(account) — пример доступен: вошли в тестовый аккаунт (EMAIL) или это лаборатория;
 *   HappySample.days(today)      — 274 дня сценария, последний — today ('ГГГГ-ММ-ДД');
 *   HappySample.measurements(today), HappySample.profile(today) — замеры и профиль;
 *   HappySample.fillShared(bodyDoc, profileDoc, today), HappySample.clearShared(bodyDoc) — запись в общие документы.
 * Случайность — с постоянным зерном: одна и та же история при каждом нажатии. Чистая часть работает в Node.
 * — Claude со слов Астамура · 25.11.2026 */
(function(root){
'use strict';
const EMAIL='amuriotoday@gmail.com',SOURCE='Пример Amurio',LENGTH=274;
/* границы месяцев сценария, в днях от начала: 25 февраля → 25 ноября 2026 */
const MONTHS=[0,28,59,89,120,150,181,212,242,274];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
const dateAt=(today,back)=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-back);return d.toISOString().slice(0,10)};
const weekday=date=>new Date(date+'T12:00:00Z').getUTCDay();   // 0 — воскресенье
const monthOf=i=>{for(let m=0;m<9;m++)if(i<MONTHS[m+1])return m;return 8};
/* значение по опорным точкам [день, число] с плавным переходом */
function curve(points,i){
 for(let x=1;x<points.length;x++)if(i<=points[x][0]){const [a,va]=points[x-1],[b,vb]=points[x],f=(i-a)/(b-a||1);return va+(vb-va)*f}
 return points[points.length-1][1];
}
const at=(...values)=>MONTHS.map((d,x)=>[d,values[Math.min(x,values.length-1)]]);
const WEIGHT=at(64.5,65.5,68,72,76.5,80.5,83.5,82.5,81.5,81);
const WAIST=at(74,74,76,79,83,86,88,86,84,83),CHEST=at(90,90,91,93,96,99,101,102,103,104),BICEPS=at(28,28,28.5,30,32,33.5,34.5,35,35.5,36);
const HIPS=at(88,88,89,91,94,96,98,97,96,96),THIGH=at(48,48,49,51,54,56,58,58,58,58);
/* самочувствие 0…1 и его разброс по месяцам */
const WELL=at(.16,.22,.32,.42,.5,.62,.7,.68,.82,.9),SWING=at(.2,.22,.2,.17,.15,.11,.09,.1,.07,.05);
const LOGGED=at(.38,.45,.65,.8,.88,.93,.96,.96,1,1);
const EVENTS={
 drugs:[3,4,12,13,21,22,41,52,75],                  // последний раз — в середине третьего месяца
 marathon:[[3,5],[12,14],[21,23],[40,42]],          // без сна и еды; на следующий день — сон сутки
 psychiatrist:[9,37,65,96,126,157,190,220,250],
 breakup:92,instagramHidden:135,sweetInsight:128,firstTraining:61,lastAlcohol:58,
 overwork:[183,210],skippedTraining:[188,195],medicineFrom:9,therapyFrom:30
};
const NOTES={
 0:'Так больше не могу. Буду записывать.',9:'Первый раз у психиатра. Назначил антидепрессант.',23:'Трое суток без сна. Потом спал почти сутки.',
 30:'Первая встреча с психотерапевтом.',41:'Сорвался. Стыдно, но записываю как есть.',58:'Выпил в последний раз. Не хочется.',
 61:'Первая тренировка с тренером. Еле дошёл домой.',75:'Сорвались вместе. Рядом с ним я не удержусь.',92:'Расстались. Он остался там. Я ничего не смог сделать.',
 99:'Скучаю. Очень жаль его.',110:'Ем сладкое без остановки. Сплю плохо.',128:'Понял: сладкое с утра — и к обеду я труп.',
 135:'Убрал Instagram с экрана и поставил пароль.',150:'Аппетит зверский. Поднабрал.',165:'Грусть приходит волнами, но реже.',
 181:'Самый большой вес. Зато руки — уже руки.',205:'Работаю по 12 часов. Это уже перебор.',212:'Сбавляю обороты.',
 242:'Не пью совсем. И не тянет.',260:'Желаю ему выбраться. А у меня своя жизнь.',273:'Девять месяцев. Хочу жить.'
};
const within=(i,[a,b])=>i>=a&&i<=b;
function days(today){
 const out=[];
 for(let i=0;i<LENGTH;i++){
  const r=rng(1000+i),date=dateAt(today,LENGTH-1-i),wd=weekday(date),m=monthOf(i);
  const marathon=EVENTS.marathon.some(x=>within(i,x)),crash=EVENTS.marathon.some(x=>i===x[1]+1);
  const drugs=EVENTS.drugs.includes(i),alcohol=(wd===6||wd===5&&r()<.4)&&i<=EVENTS.lastAlcohol;
  const grief=i>=EVENTS.breakup&&i<EVENTS.breakup+21?.2:i>=EVENTS.breakup&&i<EVENTS.breakup+75&&r()<.18?.12:0;
  const overwork=within(i,EVENTS.overwork);
  /* тренировки: с тренером 1–2 раза в неделю, к концу — пн, ср, пт */
  let training=false;
  if(i>=EVENTS.firstTraining){
   const plan=m===2?[2,6]:m===3?[2,5]:m===4?[1,3,5]:[1,3,5];
   training=plan.includes(wd)&&!(m===2&&wd===6&&r()<.5)&&!(m===4&&wd===3&&r()<.4)&&!(EVENTS.skippedTraining.some(s=>i>=s&&i<s+7)&&wd===3);
  }
  const therapyDay=weekday(dateAt(today,LENGTH-1-EVENTS.therapyFrom));
  const therapy=i>=EVENTS.therapyFrom&&(wd===therapyDay&&(i<152||Math.floor(i/7)%2===0)||grief===.2&&wd===(therapyDay+3)%7);
  const medicine=i>=EVENTS.medicineFrom&&r()<(m===0?.6:m===1?.9:.98)&&!marathon;
  const sweet=!marathon&&r()<(i<EVENTS.sweetInsight?(m<2?.75:.65):i<EVENTS.sweetInsight+20?.2:.05)||grief===.2&&r()<.5;
  const phone=!marathon&&r()<(i<EVENTS.instagramHidden?.8:.08);
  let well=curve(WELL,i)+(r()-.5)*2*curve(SWING,i)-grief;
  if(marathon)well-=.12;if(crash)well-=.15;if(drugs)well-=.05;if(alcohol&&m<2)well-=.04;
  if(overwork)well-=.06;if(training)well+=.04;
  well=clamp(well,.02,.98);
  /* сон: в начале ложится под утро, к концу — 23:30; при марафоне сна нет, после — сутки */
  const bed=marathon?null:clamp(curve(at(5.5,5,3.5,2.3,2,.8,-.4,.3,-.4,-.5),i)+(r()-.5)*curve(at(4,3.5,2.5,2,1.5,1,.8,1,.5,.4),i)+(grief?.8:0),-1.5,8);
  const sleep=marathon?0:crash?15+r()*3:clamp(curve(at(6,9,10.5,9.5,9,8.5,8.2,7,7.8,8),i)+(r()-.5)*curve(at(5,4,3,2,1.6,1.2,1,1.2,.8,.6),i),3.5,13);
  const nap=!marathon&&!crash&&r()<curve(at(.3,.45,.55,.5,.4,.2,.08,.05,.04,.03),i);
  const wake=bed===null?null:(bed+sleep+24)%24;
  const screen=Math.round(60*clamp(curve(at(6.5,6,6.5,6,5.5,2.8,2.5,4.5,3,3),i)+(r()-.5)*2+(i<EVENTS.instagramHidden&&wd%6===0?1:0),.5,11));
  const work=Math.round(60*clamp(overwork?(wd===0||wd===6?4:10.5)+r()*2:curve(at(0,.5,1.5,3,4.5,6,7,8,7.5,7.5),i)*(wd===0||wd===6?.3:1)+(r()-.5)*1.5,0,13));
  const walk=!marathon&&r()<curve(at(.05,.08,.15,.3,.35,.45,.5,.35,.6,.7),i);
  const logged=i===0||i===LENGTH-1||!!NOTES[i]||r()<curve(LOGGED,i)*(marathon?.5:1);
  const tags=[];
  if(drugs)tags.push('Наркотики');if(alcohol)tags.push('Алкоголь');if(marathon)tags.push('Марафон','Бессонная ночь');
  if(i===EVENTS.breakup)tags.push('Расставание');
  out.push({i,date,weekday:wd,month:m+1,logged,well,marathon,crash,drugs,alcohol,training,therapy,psychiatrist:EVENTS.psychiatrist.includes(i),
   medicine,sweet,phone,nap,walk,overwork,grief:grief>0,bed,wake,sleep:Math.round(sleep*10)/10,screen,work,note:NOTES[i]||'',tags,
   weight:Math.round((curve(WEIGHT,i)+(r()-.5)*.9+(sweet&&m>1?.3:0)-(marathon?.8:0))*10)/10});
 }
 return out;
}
/* Замеры: вес сначала редко, потом 2–3 раза в неделю, к концу почти каждый день; обхваты — с третьего месяца, раз в 2–4 недели. */
function measurements(today){
 const out=[],half=v=>Math.round(v*2)/2;let nextTape=EVENTS.firstTraining;
 for(const d of days(today)){
  const r=rng(5000+d.i),m=d.month-1;
  const weigh=d.i===0||d.i===LENGTH-1||!d.marathon&&(m<2?d.i%6===2||r()<.05:r()<(m<5?.38:m<6?.6:.88));
  const tape=d.i>=nextTape&&!d.marathon&&(d.training||d.i===LENGTH-1);
  if(!weigh&&!tape)continue;
  const values={weight:d.weight};
  if(tape){
   nextTape=d.i+14+Math.floor(r()*14);
   const b=half(curve(BICEPS,d.i)+(r()-.5)*.4),t=half(curve(THIGH,d.i)+(r()-.5)*.5);
   Object.assign(values,{chest:half(curve(CHEST,d.i)+(r()-.5)*.6),waist:half(curve(WAIST,d.i)+(r()-.5)*.8),hips:half(curve(HIPS,d.i)+(r()-.5)*.6),
    bicepsL:b-(r()<.4?.5:0),bicepsR:b,thighL:t,thighR:t+(r()<.3?.5:0)});
  }
  out.push({date:d.date,values,source:SOURCE,note:tape&&d.month<7?'Мерил тренер':''});
 }
 return out;
}
/* 40 лет, 185 см. День рождения — 14 марта, чтобы возраст не менялся в последние месяцы истории. */
function profile(today){return {birthday:(Number(today.slice(0,4))-40)+'-03-14',height:185,sex:'male'}}

const emailOf=account=>{try{return String(account&&account.current&&account.current()&&account.current().email||'').trim().toLowerCase()}catch(e){return ''}};
const allowed=account=>!!root.HAPPY_LAB||emailOf(account)===EMAIL;
const local=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const sampleRecords=doc=>doc.all().filter(x=>/^measurements~/.test(x.id)&&x.value&&x.value.v);
/* Общие документы. Замеры кладутся, только если своих замеров ещё нет; профиль — только пустые поля. */
async function fillShared(bodyDoc,profileDoc,today){
 today=today||local();let body=0;
 if(bodyDoc&&!bodyDoc.newer&&!sampleRecords(bodyDoc).length){
  const M=root.HappyMeasurements,order=d=>Number(d.replaceAll('-','')),list=measurements(today);
  if(M&&list.some(m=>!M.valid(m)))throw Error('Пример замеров не прошёл проверку формата.');
  await bodyDoc.putMany([{id:'measurements',value:{t:'list'}}].concat(list.map(m=>({id:'measurements~'+m.date,value:{i:order(m.date),v:m}}))));
  body=list.length;
 }
 if(profileDoc&&!profileDoc.newer){
  const p=profile(today),put=[];
  for(const k of Object.keys(p)){const was=profileDoc.get(k);if(!was||was.v===''||was.v==null)put.push({id:k,value:{v:p[k]}})}
  if(put.length)await profileDoc.putMany(put);
 }
 return {measurements:body};
}
async function clearShared(bodyDoc){
 if(!bodyDoc||bodyDoc.newer)return 0;
 const mine=sampleRecords(bodyDoc).filter(x=>x.value.v.source===SOURCE);
 if(mine.length)await bodyDoc.putMany(mine.map(x=>({id:x.id,deleted:true})));
 return mine.length;
}
root.HappySample={EMAIL,SOURCE,LENGTH,MONTHS,EVENTS,NOTES,allowed,today:local,days,measurements,profile,fillShared,clearShared};
})(typeof globalThis!=='undefined'?globalThis:this);
