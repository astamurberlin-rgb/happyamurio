/* Workout-local entry points and reversible, intent-locked gestures. */
let localExerciseDraftReturn=null;
function keepLocalExerciseDraft(){const root=document.getElementById('modal-root'),sheet=document.querySelector('#overlay .sheet');if(!root||!sheet)return;localExerciseDraftReturn={nodes:[...root.childNodes],workout:state.active,kind:sheetKind,priorFocus,focus:document.activeElement,scroll:sheet.scrollTop||0};}
function returnLocalExerciseDraft(){const saved=localExerciseDraftReturn;localExerciseDraftReturn=null;if(!saved||state.active!==saved.workout)return;closeSheet();document.getElementById('modal-root').replaceChildren(...saved.nodes);sheetKind=saved.kind;priorFocus=saved.priorFocus;document.body.style.overflow='hidden';const sheet=document.querySelector('#overlay .sheet');if(sheet)sheet.scrollTop=saved.scroll;saved.focus?.focus?.();}
function openLocalInstructions(id){const e=exercise(id);const body=typeof pullVariantIds!=='undefined'&&pullVariantIds.includes(id)?`<iframe class="exercise-frame local-instruction-frame" title="Инструкция: ${esc(e?.name||'упражнение')}" src="${pullFrameUrl(id)+'&context=active'}"></iframe>`:`<p class="sheet-info">${esc(e?.description||'Инструкция для этого упражнения ещё не добавлена в библиотеку.')}</p>`;openSheet('Инструкция · '+(e?.name||'Упражнение'),body+'<button class="button" data-action="return-local-exercise">Вернуться к настройкам</button>');}
document.addEventListener('click',event=>{const b=event.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;if(!['local-exercise-history','local-exercise-instructions','return-local-exercise'].includes(a))return;event.preventDefault();event.stopImmediatePropagation();if(a==='return-local-exercise'){returnLocalExerciseDraft();return;}keepLocalExerciseDraft();if(a==='local-exercise-history'){openExerciseHistory(b.dataset.id);document.querySelector('#overlay .sheet').insertAdjacentHTML('beforeend','<button class="button" data-action="return-local-exercise">Вернуться к настройкам</button>');}else openLocalInstructions(b.dataset.id);},true);

// Аудит единообразия 18.11.2026: упражнение удаляется так же, как подход, — свайп влево по строке названия, свёрнутое оно
// или нет; справа красная «Удалить» высотой со строку названия (в одну или две строки). Внизу «Вернуть».
function deleteWorkoutExercise(ei){const w=state.active,e=w?.exercises[ei];if(!e)return null;const countdown=clone(w.countdown||null),player=clone(w.exercisePlayer||null);w.exercises.splice(ei,1);for(const key of ['countdown','exercisePlayer']){const timer=w[key];if(timer?.ei===ei)w[key]=null;else if(timer?.ei>ei)timer.ei--;}
 persist();return ()=>{if(state.active!==w||w.exercises.includes(e))return;w.exercises.splice(Math.min(ei,w.exercises.length),0,e);for(const key of ['countdown','exercisePlayer']){const current=w[key],prior=key==='countdown'?countdown:player;if(current?.ei>=ei)current.ei++;else if(!current&&prior?.ei===ei)w[key]=prior;}persist();render();};}
function setExerciseSwipeOpen(row,open){if(!row)return;row.classList.toggle('swipe-open',open);const heading=row.querySelector('.exercise-card-heading');if(heading)heading.style.transform=open?'translateX(-66px)':'';row.querySelector('.exercise-name-delete')?.setAttribute('tabindex',open?'0':'-1');}
let exerciseSwipeGesture=null,exerciseSwipeClickUntil=0;
document.addEventListener('pointerdown',event=>{const row=event.target.closest('.exercise-name-swipe');if(!row||event.button>0||event.target.closest('input,textarea,select,.exercise-technique,.exercise-name-delete'))return;const card=row.closest('[data-exercise-card]');exerciseSwipeGesture={row,card,workout:state.active,exercise:state.active?.exercises[Number(card?.dataset.exerciseCard)],id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,horizontal:false};});
document.addEventListener('pointermove',event=>{const g=exerciseSwipeGesture;if(!g||g.id!==event.pointerId)return;const dx=event.clientX-g.x,dy=event.clientY-g.y;if(!g.horizontal){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){exerciseSwipeGesture=null;return;}if(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.4)return;g.horizontal=true;g.row.setPointerCapture?.(event.pointerId);}g.dx=dx;if(event.cancelable)event.preventDefault();g.row.classList.add('swipe-dragging');const heading=g.row.querySelector('.exercise-card-heading');if(heading)heading.style.transform=`translateX(${Math.max(-80,Math.min(0,dx+(g.row.classList.contains('swipe-open')?-66:0)))}px)`;},{passive:false});
function endExerciseSwipe(event,cancel=false){const g=exerciseSwipeGesture;if(!g||g.id!==event.pointerId)return;exerciseSwipeGesture=null;g.row.classList.remove('swipe-dragging');if(!g.horizontal){if(cancel)setExerciseSwipeOpen(g.row,g.row.classList.contains('swipe-open'));return;}exerciseSwipeClickUntil=Date.now()+400;const valid=state.active===g.workout&&state.active?.exercises[Number(g.card?.dataset.exerciseCard)]===g.exercise;for(const r of document.querySelectorAll('.exercise-name-swipe.swipe-open'))if(r!==g.row)setExerciseSwipeOpen(r,false);setExerciseSwipeOpen(g.row,!cancel&&valid&&(g.dx< -35||(g.row.classList.contains('swipe-open')&&g.dx<25)));}
document.addEventListener('pointerup',event=>endExerciseSwipe(event));document.addEventListener('pointercancel',event=>endExerciseSwipe(event,true));
window.addEventListener('click',event=>{
 if(Date.now()<exerciseSwipeClickUntil&&event.target.closest?.('.exercise-name-swipe')&&!event.target.closest('.exercise-name-delete')){event.preventDefault();event.stopImmediatePropagation();return;}
 // Открыта «Удалить» — нажатие по строке названия просто прячет её, а не сворачивает упражнение.
 const open=event.target.closest?.('.exercise-name-swipe.swipe-open');if(open&&!event.target.closest('.exercise-name-delete')){event.preventDefault();event.stopImmediatePropagation();setExerciseSwipeOpen(open,false);return;}
 const b=event.target.closest?.('[data-action=delete-workout-exercise]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();const undo=deleteWorkoutExercise(Number(b.dataset.ei));if(undo){render();toast('Упражнение убрано из тренировки',undo);}
},true);
document.addEventListener('keydown',event=>{const row=event.target.closest?.('.exercise-name-swipe');if(!row||!event.target.matches('.exercise-collapse'))return;if(['Delete','Backspace'].includes(event.key)){event.preventDefault();setExerciseSwipeOpen(row,true);row.querySelector('.exercise-name-delete')?.focus();}if(event.key==='Escape')setExerciseSwipeOpen(row,false);});

/* Lab 10.11.2026 17:20 (Астамур: «после «Завершить тренировку» ещё раз окно «Завершить и сохранить» — одного раза
   хватит, правки сделаю в журнале»): «Завершить» saves at once. The same form is built and submitted, so every step of
   saving stays as it was (rest and timer capture, completion «Выполнено», link to the schedule, icon); the window just
   never shows. Name, time, note and completion are edited in the journal record. The toast offers «Отменить» for a
   mistaken tap: the record is removed and the workout runs on. */
if(typeof showWorkoutForm==='function'){
 const formBeforeQuickFinish=showWorkoutForm;
 showWorkoutForm=function(mode,id){
  formBeforeQuickFinish(mode,id);if(mode!=='finish')return;
  const form=document.getElementById('workout-form'),before=state.active&&clone(state.active);if(!form||!before)return;
  form.requestSubmit();if(state.active)return; // the form refused: its error stays visible in the window
  toast('Тренировка сохранена в журнале',()=>{if(state.active)return;state.workouts=state.workouts.filter(w=>w.id!==before.id);state.active=before;persist();goto('active');});
 };
}

/* Пункт 2 (Астамур 15.11.2026): шапка тренировки при прокрутке уезжает вверх, а у конца страницы опускается сверху и снова
   видна — там «Завершить», нижней карточки «Завершить тренировку» нет. Ушёл от конца вверх — шапка снова на своём месте. */
let workoutBarRevealed=false; // после перерисовки шапка остаётся на месте без повторного «опускания»
function clearWorkoutBarReveal(box){const bar=box?.querySelector(':scope>.current-bar');box?.classList.remove('bar-revealed','bar-still');if(box)box.style.height='';if(bar){bar.style.left='';bar.style.top='';bar.style.width='';}}
function updateWorkoutBarReveal(){
 const box=document.querySelector('.active-workout .workout-overview'),bar=box?.querySelector(':scope>.current-bar');if(!bar){workoutBarRevealed=false;return;}
 // Тренировка прокручивается внутри листа (.panel-body); без листа — сама страница.
 const sc=box.closest('.panel-body')||document.scrollingElement||document.documentElement,page=sc===document.scrollingElement||sc===document.documentElement;
 const top=page?0:sc.getBoundingClientRect().top,left=sc.scrollHeight-sc.scrollTop-sc.clientHeight,shown=box.classList.contains('bar-revealed');
 const show=box.getBoundingClientRect().bottom<top&&left<=(workoutBarRevealed?96:4);
 if(show===shown)return;
 if(!show){clearWorkoutBarReveal(box);workoutBarRevealed=false;return;}
 // У листа есть сдвиг (transform) — тогда «fixed» считается от листа, а не от экрана.
 const sheet=box.closest('.panel-screen'),base=sheet&&getComputedStyle(sheet).transform!=='none'?sheet.getBoundingClientRect():{left:0,top:0},r=bar.getBoundingClientRect();
 box.style.height=box.offsetHeight+'px';bar.style.left=(r.left-base.left)+'px';bar.style.top=(top-base.top+8)+'px';bar.style.width=r.width+'px';
 box.classList.toggle('bar-still',workoutBarRevealed);box.classList.add('bar-revealed');workoutBarRevealed=true;
}
document.addEventListener('scroll',updateWorkoutBarReveal,{capture:true,passive:true});
window.addEventListener('resize',()=>{clearWorkoutBarReveal(document.querySelector('.workout-overview.bar-revealed'));workoutBarRevealed=false;updateWorkoutBarReveal();},{passive:true});
{const renderBeforeBarReveal=render;render=function(){const out=renderBeforeBarReveal.apply(this,arguments);updateWorkoutBarReveal();return out;};}
