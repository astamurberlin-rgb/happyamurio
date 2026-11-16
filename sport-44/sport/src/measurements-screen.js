/* Sport 43 · замеры тела — общий экран shared/happy-measurements.js, один для Day, Meal и Sport.
   Здесь только подключение: место на вкладке «Замеры тела» журнала и общий документ body. Страница Sport
   перерисовывается целиком, поэтому после каждой перерисовки экран ставится на новое место; его вид (период,
   сравнение) и открытое окно замера при этом сохраняются. — Claude · 14.11.2026 */
function mountSportMeasurements(){
 const box=document.getElementById('happy-measurements');
 if(!box){HappyMeasurements.unmount();return}
 HappyMeasurements.mount(box,{doc:()=>SportData.signedIn()?SportData.store.doc('body'):null,askSignIn:SportData.askSignIn,toast});
}
{const renderBeforeMeasurements=render;render=function(...args){const r=renderBeforeMeasurements(...args);mountSportMeasurements();return r}}
