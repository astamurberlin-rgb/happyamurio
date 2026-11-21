/* Аудит единообразия Sport 18.11.2026 — удаление (часть 4 правок).
 * Свайп удаления везде справа налево, «Удалить» справа. Внутри карточки — красная «Удалить» внизу, сразу, без вопроса;
 * откат — «Вернуть» в сообщении. Свои тренировки пока удаляются в Настройках: «Мои тренировки», свайп влево. */

/* Свайп влево по строке списка (.row-swipe): то же, что у подходов, — «Удалить» выезжает справа. */
function setRowSwipeOpen(row,open){if(!row)return;row.classList.toggle('swipe-open',open);const c=row.querySelector('.swipe-content');if(c)c.style.transform=open?'translateX(-66px)':'';row.querySelector('.swipe-delete')?.setAttribute('tabindex',open?'0':'-1');}
let rowSwipeGesture=null,rowSwipeClickUntil=0;
document.addEventListener('pointerdown',e=>{const row=e.target.closest('.row-swipe');if(!row||e.button>0||e.target.closest('.swipe-delete'))return;rowSwipeGesture={row,id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,horizontal:false};});
document.addEventListener('pointermove',e=>{const g=rowSwipeGesture;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.horizontal){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){rowSwipeGesture=null;return;}if(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.4)return;g.horizontal=true;g.row.setPointerCapture?.(e.pointerId);}g.dx=dx;if(e.cancelable)e.preventDefault();g.row.classList.add('swipe-dragging');g.row.querySelector('.swipe-content').style.transform=`translateX(${Math.max(-80,Math.min(0,dx+(g.row.classList.contains('swipe-open')?-66:0)))}px)`;},{passive:false});
function endRowSwipe(e,cancel=false){const g=rowSwipeGesture;if(!g||g.id!==e.pointerId)return;rowSwipeGesture=null;g.row.classList.remove('swipe-dragging');if(!g.horizontal){if(cancel)setRowSwipeOpen(g.row,g.row.classList.contains('swipe-open'));return;}rowSwipeClickUntil=Date.now()+400;for(const r of document.querySelectorAll('.row-swipe.swipe-open'))if(r!==g.row)setRowSwipeOpen(r,false);setRowSwipeOpen(g.row,!cancel&&(g.dx< -35||(g.row.classList.contains('swipe-open')&&g.dx<25)));}
document.addEventListener('pointerup',e=>endRowSwipe(e));document.addEventListener('pointercancel',e=>endRowSwipe(e,true));
window.addEventListener('click',e=>{
  const row=e.target.closest?.('.row-swipe');if(!row||e.target.closest('.swipe-delete'))return;
  if(Date.now()<rowSwipeClickUntil){e.preventDefault();e.stopImmediatePropagation();return;}   // нажатие сразу после свайпа
  if(row.classList.contains('swipe-open')){e.preventDefault();e.stopImmediatePropagation();setRowSwipeOpen(row,false);}   // открыта «Удалить» — нажатие прячет её
},true);
document.addEventListener('keydown',e=>{const row=e.target.closest?.('.row-swipe');if(!row)return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();setRowSwipeOpen(row,true);row.querySelector('.swipe-delete')?.focus();}if(e.key==='Escape')setRowSwipeOpen(row,false);});

/* Своя тренировка: убирается отовсюду (главная, библиотека, расписание) вместе со своим расписанием; «Вернуть» — назад. */
function deleteOwnTemplate(id){
  const t=templates().find(t=>t.id===id);if(!t||t.recommended)return null;
  const schedules=state.schedules.filter(s=>s.templateId===id&&!s.archived);
  storeSportTemplate({...t,archived:true});for(const s of schedules)s.archived=true;persist();
  return ()=>{const now=(state.templateOverrides?.[id]||state.templates.find(x=>x.id===id));if(now){const {archived,...rest}=now;storeSportTemplate(rest);}for(const s of schedules)s.archived=false;persist();render();};
}
window.addEventListener('click',e=>{const b=e.target.closest?.('[data-action="delete-template"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const undo=deleteOwnTemplate(b.dataset.id);if(undo){render();toast('Тренировка удалена',undo);}},true);

/* Библиотека → «Мои тренировки» (Астамур 21.11.2026: «не на главной, а в библиотеке»): своя тренировка удаляется
   свайпом влево и здесь — так же, как в Настройках: карточка уезжает целиком, справа «Удалить», в сообщении «Вернуть».
   Рекомендуемые — примеры, их не удаляют. */
{const libraryTemplateRowBeforeDelete=libraryTemplateRow;
 libraryTemplateRow=function(t){const row=libraryTemplateRowBeforeDelete(t);if(t.recommended)return row;
  return `<div class="row-swipe template-swipe" data-id="${esc(t.id)}"><button type="button" class="swipe-delete" data-action="delete-template" data-id="${esc(t.id)}" aria-label="Удалить тренировку ${esc(t.title)}" tabindex="-1">${icon('trash')}<span>Удалить</span></button><div class="swipe-content">${row}</div></div>`;};}

/* Настройки → «Мои тренировки»: список своих тренировок, удаление свайпом влево. */
function settingsTemplatesMarkup(){
  const list=templates().filter(t=>!t.recommended);if(!list.length)return '';
  return `<div class="settings-section">Мои тренировки</div><div class="happy-card settings-templates">${list.map(t=>`<div class="row-swipe" data-id="${esc(t.id)}"><button type="button" class="swipe-delete" data-action="delete-template" data-id="${esc(t.id)}" aria-label="Удалить тренировку ${esc(t.title)}" tabindex="-1">${icon('trash')}<span>Удалить</span></button><div class="swipe-content"><button type="button" class="settings-template-row" data-action="preview-template" data-id="${esc(t.id)}">${esc(t.title)}</button></div></div>`).join('')}</div><p class="fineprint settings-templates-hint">Свайп влево — удалить.</p>`;
}
/* Группы упражнений — только в Настройках: «Создать → Группу упражнений» открывает форму сразу; «Мои группы» —
   свои группы списком: нажать — изменить (внизу красная «Удалить»), свайп влево — удалить. */
function settingsGroupsMarkup(){
  const list=exerciseGroups().filter(g=>g.type==='user');if(!list.length)return '';
  return `<div class="settings-section">Мои группы</div><div class="happy-card settings-templates settings-groups">${list.map(g=>`<div class="row-swipe" data-id="${esc(g.id)}"><button type="button" class="swipe-delete" data-action="settings-delete-group" data-id="${esc(g.id)}" aria-label="Удалить группу ${esc(groupPath(g.id))}" tabindex="-1">${icon('trash')}<span>Удалить</span></button><div class="swipe-content"><button type="button" class="settings-template-row" data-action="settings-edit-group" data-id="${esc(g.id)}">${esc(groupPath(g.id))}</button></div></div>`).join('')}</div>`;
}
function settingsGroupForm(id){editGroup(id||undefined);const form=$('#group-form');if(form)form.dataset.from='settings';}
function deleteGroupWithUndo(id){
  const before=clone(state.exerciseGroups),links=clone(state.exerciseOverrides||{}),custom=clone(state.customExercises);
  deleteExerciseGroup(id);persist();
  toast('Группа удалена',()=>{state.exerciseGroups=before;state.exerciseOverrides=links;state.customExercises=custom;persist();render();if($('#modal-root .group-manager'))openGroupManager();});
}
window.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-action="settings-create-group"],[data-action="settings-edit-group"],[data-action="settings-delete-group"],#group-form[data-from="settings"] [data-action="delete-group"]');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();const a=b.dataset.action,id=b.dataset.id;
  if(a==='settings-create-group'){settingsGroupForm(null);return;}
  if(a==='settings-edit-group'){settingsGroupForm(id);return;}
  if(a==='settings-delete-group'){deleteGroupWithUndo(id);render();return;}
  if(a==='delete-group'){closeSheet();deleteGroupWithUndo(id);render();}
},true);
window.addEventListener('submit',e=>{const f=e.target;if(f.id!=='group-form'||f.dataset.from!=='settings')return;e.preventDefault();e.stopImmediatePropagation();
  try{const v=new FormData(f),fresh=!f.dataset.id,group=saveExerciseGroup(f.dataset.id||null,v.get('name'),v.get('parentId'));persist();closeSheet();render();toast(fresh?'Группа «'+group.name+'» создана':'Группа сохранена');}
  catch(error){const box=f.querySelector('.form-error');if(box)box.textContent=error.message;}},true);
// Настройки уже разложены по разделам (settings-layout.js): «Мои тренировки» и «Мои группы» встают сразу после «Создать».
const renderProfileBeforeOwnTemplates=renderProfile;
renderProfile=function(){
  const html=renderProfileBeforeOwnTemplates.apply(this,arguments),label='<div class="settings-section">Создать</div>',i=html.indexOf(label);if(i<0)return html;
  const next=html.indexOf('<div class="settings-section"',i+label.length);if(next<0)return html;
  return html.slice(0,next)+settingsTemplatesMarkup()+settingsGroupsMarkup()+html.slice(next);
};
