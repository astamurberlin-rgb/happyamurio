/* Лаборатория одного приложения: пример замеров тела, чтобы таблица замеров сразу открывалась с историей и было
 * видно полосы. Только для закрытой страницы лаборатории (scripts/lab/build-app-lab.py … --sample-measurements).
 * В файлы приложений и в выпуск не попадает. Пишет так же, как экран замеров, — через общий документ замеров;
 * даты, которые уже есть, не трогает. Работает в Day, Meal и Sport. — Claude · 20.11.2026 */
(function(){
'use strict';
var tries=0,timer=setInterval(step,400),busy=false;
var rows=[
 ['2026-07-05',{neck:'40',chest:'101',waist:'89',hips:'101',weight:'84.6'}],
 ['2026-08-02',{neck:'40',chest:'101.5',waist:'88',hips:'100.5',weight:'83.9'}],
 ['2026-09-06',{neck:'39.5',chest:'102',waist:'86.5',hips:'100',weight:'82.8'}],
 ['2026-10-04',{neck:'39.5',chest:'102.5',waist:'85',hips:'99.5',weight:'81.7'}],
 ['2026-11-01',{neck:'39',chest:'103',waist:'83.5',hips:'99',weight:'80.6'}]
];
function measurementsDoc(HM){
 try{
  if(typeof SportData!=='undefined'&&SportData.signedIn&&SportData.signedIn())return SportData.store.doc('body');
  var D=typeof DayData!=='undefined'?DayData:typeof MealData!=='undefined'?MealData:null;
  if(D&&D.signedIn&&D.signedIn()&&D.store)return D.store.shared(HM.DOC.app,HM.DOC.name);
 }catch(e){}
 return null;
}
async function step(){
 if(busy)return;
 if(++tries>150){clearInterval(timer);return}
 var HM=typeof HappyMeasurements!=='undefined'?HappyMeasurements:null;if(!HM)return;
 var doc=measurementsDoc(HM);if(!doc||doc.newer)return;
 busy=true;clearInterval(timer);
 try{
  for(var i=0;i<rows.length;i++){
   var state=HM.read(doc.all());
   if(state.list.some(function(m){return m.date===rows[i][0]}))continue;
   await doc.putMany(HM.saveChanges(state,HM.compose(state,rows[i][0],rows[i][1])));
  }
 }catch(e){if(typeof console!=='undefined')console.warn('lab sample measurements',e)}
}
})();
