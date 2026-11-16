/* Update 38 · one settings structure for Happy apps (agreed 08.11.2026):
   Аккаунт → Приложение → Данные → Связанные приложения → Для разработчика (hidden) → Версия.
   This is the LAST layer over renderProfile: it takes the composed screen and regroups known blocks by stable
   markers (section ids, element ids, data-attributes), without changing their markup or handlers. Developer-only
   blocks are rendered inside a hidden section that opens with a long press on the version line. Any block this
   layer does not recognise stays visible under «Приложение» and is flagged with data-settings-unmapped.
   Update 38.6 (owner, 09.11.2026): everything service-like is hidden, and the appearance picker sits first under
   «Приложение» in a data-happy-appearance-slot. Sport 42: in the developer section — the diary export and Strong history. */
const SPORT_DEV_FLAG='sport-settings-developer-v1';
let sportDevVisible=(()=>{try{return sessionStorage.getItem(SPORT_DEV_FLAG)==='1'}catch{return false}})();
function sportDevToggle(on){sportDevVisible=on;try{if(on)sessionStorage.setItem(SPORT_DEV_FLAG,'1');else sessionStorage.removeItem(SPORT_DEV_FLAG)}catch{}}
const sportLayoutProfile=renderProfile;
renderProfile=function(){return sportSettingsLayout(sportLayoutProfile())};
function sportSettingsLayout(html){
 const tpl=document.createElement('template');tpl.innerHTML=html;
 const root=tpl.content,settings=root.querySelector('.happy-settings');
 if(!settings)return html;
 const header=settings.querySelector(':scope>header.top');
 const nodes=[...settings.children].filter(n=>n!==header).concat([...root.children].filter(n=>n!==settings));
 const groups={account:[],app:[],data:[],links:[],developer:[],version:[]};
 const text=n=>(n.textContent||'').trim();
 const label=t=>{const d=document.createElement('div');d.className='settings-section';d.textContent=t;return d};
 const unwrap=section=>[...section.children].filter(n=>!(n.matches('h2.happy-heading')));
 const place=(group,...items)=>{for(const n of items)if(n)groups[group].push(n)};
 let pendingLabel=null;
 for(let i=0;i<nodes.length;i++){
  const n=nodes[i];
  if(n.matches('section[data-happy-section="account"]')){
   place('account',...unwrap(n));continue;
  }
  if(n.matches('section[data-happy-section="appearance"]')){place('app',...unwrap(n));continue;}
  if(n.matches('section[data-happy-section="backup"]')){
   const card=n.querySelector(':scope>.happy-card');
   if(card)place('developer',label('Резервная копия'),card);else place('developer',label('Резервная копия'),...unwrap(n));
   continue;
  }
  if(n.matches('section[data-happy-section="links"]')){place('links',...unwrap(n));continue;}
  if(n.matches('section[data-happy-section="icons"]')){place('app',label('Иконки'),...unwrap(n));continue;}
  if(n.matches('section.happy-section')){const h=n.querySelector(':scope>h2.happy-heading');place('app',h?label(text(h)):null,...unwrap(n));continue;}
  if(n.matches('h2.happy-heading')){pendingLabel=text(n);continue;}
  if(n.matches('div.settings-section')){
   // Sport's own small labels: «Мои данные» (counts) belong to Данные, the rest to the app group.
   const next=nodes[i+1],own=text(n);
   if(own==='Мои данные'&&next?.matches('.card')){place('data',label('Мои данные'),next);i++;continue;}
   pendingLabel=null;if(next?.matches('.card,.happy-card')){place('app',n,next);i++;}else place('app',n);continue;
  }
  if(pendingLabel&&(n.matches('.happy-card')||n.matches('.card'))){place('app',label(pendingLabel),n);pendingLabel=null;continue;}
  if(n.matches('footer.happy-version')){place('version',n);continue;}
  if(n.querySelector?.('[data-action="release-history"]')){place('version',n);continue;}
  if(n.querySelector?.('[data-strong]')){place('developer',n);continue;}
  n.setAttribute?.('data-settings-unmapped','');place('app',n);
 }
 if(pendingLabel)place('app',label(pendingLabel));
 // Blocks inside a group are (label, cards…) runs; order them the same way in every release.
 const slot=document.createElement('div');slot.className='happy-appearance-entry';slot.setAttribute('data-happy-appearance-slot','');const appearanceLabel=label('Оформление');appearanceLabel.hidden=true;groups.app.unshift(appearanceLabel,slot);   // Sport 41: подпись не видна — кнопка «Выбрать оформление» говорит сама
 const order={app:['Оформление','Библиотека','Таймер','Датчики','Настройки тренировок','Иконки'],data:['Мои данные'],developer:['Резервная копия']};
 for(const group of Object.keys(order)){
  const runs=[];for(const n of groups[group]){if(n.matches('.settings-section')||!runs.length)runs.push([n]);else runs.at(-1).push(n);}
  const rank=run=>{const i=order[group].indexOf(run[0].matches('.settings-section')?text(run[0]):'');return i<0?order[group].length:i};
  groups[group]=runs.map((run,i)=>[run,i]).sort((a,b)=>rank(a[0])-rank(b[0])||a[1]-b[1]).flatMap(([run])=>run);
 }
 const section=(id,title,children)=>{if(!children.length)return null;const s=document.createElement('section');s.className='happy-section';s.dataset.happySection=id;const h=document.createElement('h2');h.className='happy-heading';h.textContent=title;s.append(h,...children);return s};
 const out=document.createElement('div');out.className='happy-settings';if(header)out.append(header);
 const dev=section('developer','Для разработчика',groups.developer);
 if(dev){dev.hidden=!sportDevVisible;const hide=document.createElement('div');hide.className='happy-actions';const b=document.createElement('button');b.type='button';b.className='happy-button';b.dataset.settingsDeveloper='hide';b.textContent='Скрыть раздел';hide.append(b);const note=document.createElement('p');note.className='happy-note';note.textContent='Выгрузка дневника файлом и перенос истории Strong. Открывается долгим нажатием на строку версии.';dev.insertBefore(note,dev.children[1]||null);dev.append(hide);}
 const version=document.createElement('section');version.className='happy-section';version.dataset.happySection='version';version.append(...groups.version);
 const footer=version.querySelector('footer.happy-version');if(footer){footer.setAttribute('data-settings-developer','toggle');footer.setAttribute('title','Долгое нажатие открывает раздел для разработчика');}
 for(const s of [section('account','Аккаунт',groups.account),(typeof SportAppLinks!=='undefined'&&SportAppLinks?SportAppLinks.section(groups.links):section('links','Связанные приложения',groups.links)),section('app','Приложение',groups.app),section('data','Данные',groups.data),dev,version])   /* Sport 41: связь приложений — сразу под аккаунтом */if(s)out.append(s);
 return out.outerHTML;
}
// Long press on the version line opens the developer section; a button inside hides it again.
(()=>{
 let timer=null,target=null,startX=0,startY=0;
 const cancel=()=>{if(timer)clearTimeout(timer);timer=null;if(target)target.classList.remove('sport-version-pressing');target=null;};
 document.addEventListener('pointerdown',e=>{const f=e.target.closest?.('[data-settings-developer="toggle"]');if(!f||e.button>0)return;cancel();target=f;startX=e.clientX;startY=e.clientY;f.classList.add('sport-version-pressing');
  timer=setTimeout(()=>{cancel();sportDevToggle(true);render();toast('Раздел для разработчика открыт');document.querySelector('[data-happy-section="developer"]')?.scrollIntoView({behavior:'smooth',block:'start'});},1200);},true);
 document.addEventListener('pointermove',e=>{if(target&&Math.hypot(e.clientX-startX,e.clientY-startY)>12)cancel();},true);
 for(const type of ['pointerup','pointercancel','scroll'])document.addEventListener(type,cancel,true);
 document.addEventListener('contextmenu',e=>{if(e.target.closest?.('[data-settings-developer="toggle"]'))e.preventDefault();});
 document.addEventListener('click',e=>{if(!e.target.closest?.('[data-settings-developer="hide"]'))return;sportDevToggle(false);render();});
})();
