/* Sport 42 · без входа: на экране тренировок — предложение войти; записи без входа не принимаются (sport-data.js).
   Правки с другой вкладки или устройства, пришедшие при открытом окне, показываются после его закрытия. */
{const diaryBeforeSignIn=renderDiary;renderDiary=function(){
 const html=diaryBeforeSignIn();if(SportData.signedIn())return html;
 /* лаборатория 24.11: вместо карточки сверху — полоска над микрофоном, как в Day; цвет — Sport или темы */
 const bar=`<div class="sport-signin"><span>Войди, чтобы записывать</span><button type="button" data-sport-signin>Войти</button></div>`;
 return html+bar;
}}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-sport-signin]'))HappyWelcome.open('login')});
{const closeBeforeAdopt=closeSheet;closeSheet=function(...args){const r=closeBeforeAdopt(...args);SportData.afterSheet();return r}}
/* Sport 43: при открытии приложения окно плановых занятий для Day и Meal сдвигается на сегодня. */
SportData.syncPlans();
/* Sport 43: ссылка на тренировку из Day («Открыть запись в Sport») и ссылка на упражнение («Поделиться») снова
   открывают их. В Sport 42 эти переходы ушли вместе с прежним обменом (sport-cloud.js). */
{const asked=new URLSearchParams(location.search),workoutId=asked.get('workout'),exerciseId=asked.get('exercise');
 if(workoutId&&state.workouts.some(w=>w.id===workoutId)){detailId=workoutId;goto('detail')}
 else if(exerciseId&&exercise(exerciseId))showExercise(exerciseId)}
