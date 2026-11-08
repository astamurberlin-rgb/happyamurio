/* Pure, local Strong mapping preview. No storage, network, source records or private reviews.
 * Call resolve({input,effectiveLibrary,sourceHash,digest,occurrenceKey,review?}).
 * sourceHash is digest(input), not the original file hash in input.fileSHA256.
 * A separately reviewed runtime manifest has version:1, sourceHash,
 * sourceFileSHA256, and decisions keyed by occurrenceKey(workout, groupIndex).
 * Each review binds workoutId, groupIndex, sourceStart, sourceName,
 * sourceWorkoutHash and sourceExerciseHash. It never applies by name/date alone.
 * A confirmed review also supplies targetId, targetHash, evidence, loadBasis.
 * Variant cards require reviewed identity metadata, except the exact public
 * back-squat card under an explicit back-position occurrence review.
 * This resolver never creates cards or infers missing occurrence load basis.
 * Generic review proposals are not approvals. Do not bundle private manifests.
 */
(function(root){
'use strict';
const metricOrder=['seconds','distance','reps','weight'];
const loadBases=['unknown','total_external','per_hand','plates_only','machine_display','assistance'];
const ropeApproximationLabel='Фактически использован канат. Временная привязка к общей карточке разгибания на блоке; вариант рукояти не сопоставлен с отдельной карточкой';
const unsafe=new Set(['__proto__','constructor','prototype']);
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.trim().length>0;
// Generic reviewed taxonomy and the exact public seed identities, not user history.
const reviewedRows=
[["Overhead Press (Barbell)","barbell-overhead-press","Жим штанги стоя вверх","Standing barbell overhead press","Штанга",["barbell"],"load_reps","total_external"],["Разгибание спины на наклонной скамье","back-extension","Разгибание спины на наклонной скамье","Back extension","С опорой, перекладиной или петлями",["back_extension_bench"],"reps",null],["Lat Pulldown (Cable)","cable-lat-pulldown","Тяга верхнего блока к груди","Lat pulldown","Блоки и эластичные ленты",["cable_station"],"load_reps","machine_display"],["Bench Press (Barbell)","barbell-bench-press","Жим штанги лёжа","Barbell bench press","Штанга",["barbell","bench","rack"],"load_reps","total_external"],["Bent Over Row (Barbell)","barbell-row","Тяга штанги в наклоне","Bent-over barbell row","Штанга",["barbell"],"load_reps","total_external"],["Hip Thrust (Barbell)","barbell-hip-thrust","Подъём таза со штангой с опорой на скамью","Barbell hip thrust","Штанга",["barbell","bench"],"load_reps","total_external"],["Подтягивание прямым хватом","pull-up","Подтягивание прямым хватом","Pull-up","С опорой, перекладиной или петлями",["pull_up_bar"],"reps",null],["Chest Dip","dip","Отжимание на брусьях","Parallel-bar dip","С опорой, перекладиной или петлями",["parallel_bars"],"reps",null],["Отжимание от пола","push-up","Отжимание от пола","Push-up","Без оборудования",[],"reps",null],["Плавание","swimming","Плавание","Swimming","Кардио",[],"distance_time",null],["Подтягивание широким хватом","wide-pull-up","Подтягивание широким хватом","Wide Pull Up","Из моих записей",[],"reps",null],["Seated Row (Cable)","cable-seated-row","Горизонтальная тяга блока сидя","Seated cable row","Блоки и эластичные ленты",["cable_station"],"load_reps","machine_display"],["Bicep Curl (Barbell)","barbell-curl","Сгибание рук со штангой","Barbell curl","Штанга",["barbell"],"load_reps","total_external"],["Leg Extension (Machine)","machine-leg-extension","Разгибание ног в тренажёре","Machine leg extension","Тренажёры",["machine"],"load_reps","machine_display"],["Standing Calf Raise (Bodyweight)","calf-raise","Подъём на носки стоя","Standing calf raise","Без оборудования",[],"reps",null],["Подъём ног лёжа","flat-leg-raise","Подъём ног лёжа","Flat Leg Raise","Из моих записей",[],"reps",null],["Аэробика","aerobics","Аэробика","Aerobics","Кардио",[],"duration",null],["Lying Leg Curl (Machine)","machine-lying-curl","Сгибание ног лёжа в тренажёре","Lying leg curl","Тренажёры",["machine"],"load_reps","machine_display"],["Incline Bench Press (Barbell)","barbell-incline-press","Жим штанги на наклонной скамье","Incline barbell press","Штанга",["barbell","bench","rack"],"load_reps","total_external"],["Reverse Fly (Machine)","machine-reverse-fly","Обратное разведение рук в тренажёре","Machine reverse fly","Тренажёры",["machine"],"load_reps","machine_display"],["Lateral Raise (Dumbbell)","dumbbell-lateral-raise","Подъём гантелей через стороны","Dumbbell lateral raise","Гантели и гири",["dumbbell"],"load_reps","per_hand"],["Incline Bench Press (Dumbbell)","dumbbell-incline-press","Жим гантелей на наклонной скамье","Incline dumbbell press","Гантели и гири",["dumbbell","bench"],"load_reps","per_hand"],["Face Pull (Cable)","cable-face-pull","Тяга каната к лицу","Cable face pull","Блоки и эластичные ленты",["cable_station"],"load_reps","machine_display"]];
const variants={
 'Squat (Barbell)':{family:'barbell_squat',reason:'Не уточнено положение штанги. Приседание на спине не выбрано автоматически.',requires:['barPosition'],blocked:[]},
 'Iso-Lateral Row (Machine)':{family:'independent_lever_row',reason:'Нужна отдельная точная карточка независимых рычагов и проверка опоры и учёта веса для этой записи.',requires:['leverAction','support','loadBasis'],blocked:['machine-row']},
 'Bent Over Row (Dumbbell)':{family:'dumbbell_row',reason:'Нужно сохранить работу рук, опору и учёт веса именно этой записи. Карточка тяги одной рукой не подходит автоматически.',requires:['armAction','support','loadBasis'],blocked:['dumbbell-single-arm-row']},
 'Reverse Fly (Dumbbell)':{family:'dumbbell_reverse_fly',reason:'Нужна точная карточка с проверенным положением корпуса и опорой. Общее разведение в наклоне не выбрано автоматически.',requires:['support','benchPosition','loadBasis'],blocked:['dumbbell-rear-fly']},
 'Seated Calf Raise (Plate Loaded)':{family:'seated_plate_loaded_calf_raise',reason:'Нужна точная карточка тренажёра с блинами и проверенный учёт нагрузки. Значение шкалы тренажёра не подставляется.',requires:['loading','loadBasis'],blocked:['machine-seated-calf']},
 'Triceps Pushdown (Cable - Straight Bar)':{family:'cable_triceps_pushdown',reason:'Рукоять и возможное исправление исходного названия должны быть подтверждены отдельно для этой записи.',requires:['attachment','loadBasis'],blocked:['cable-triceps-pushdown']}
};
const byName=new Map(reviewedRows.map(row=>[row[0],row]));
function snapshot(value){
 const encoded=JSON.stringify(value,(key,item)=>{
  if(unsafe.has(key)||['undefined','function','symbol','bigint'].includes(typeof item)||typeof item==='number'&&!Number.isFinite(item))throw Error('Unsafe mapping input');
  return item;
 });
 if(encoded===undefined)throw Error('Missing mapping input');
 return JSON.parse(encoded);
}
const canonical=x=>Array.isArray(x)?x.map(canonical):object(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function definitionMetrics(e){
 if(Array.isArray(e.metrics))return metricOrder.filter(k=>e.metrics.includes(k));
 if(/distance_time|swim|ergometer|treadmill/.test(e.profile||''))return ['seconds','distance'];
 if(/duration|hold/.test(e.profile||''))return ['seconds'];
 return /load|assisted/.test(e.profile||'')?['reps','weight']:['reps'];
}
function exactReviewedTarget(target,row){
 if(!target||!row)return false;
 const [_,id,name,en,category,equipment,profile,basis]=row;
 const expected={id,name,en,category,equipment,profile,loadBasis:basis};
 const actual={id:target.id,name:target.name,en:target.en,category:target.category,equipment:target.equipment,profile:target.profile,loadBasis:target.loadBasis??null};
 if(!equal(actual,expected))return false;
 return target.metrics===undefined||Array.isArray(target.metrics)&&target.metrics.length===new Set(target.metrics).size&&target.metrics.every(k=>metricOrder.includes(k))&&equal([...target.metrics].sort(),definitionMetrics(expected).sort());
}
function metricProblem(exercise){
 if(!Array.isArray(exercise.sets)||!exercise.sets.length)return 'Нет подходов для проверки показателей.';
 if(exercise.metrics!==undefined&&(!Array.isArray(exercise.metrics)||exercise.metrics.some(k=>!metricOrder.includes(k))))return 'Неизвестные показатели исходного упражнения.';
 const found=new Set(exercise.metrics||[]);
 for(const set of exercise.sets){
  if(!object(set))return 'Повреждены исходные подходы.';
  for(const key of metricOrder){
   if(set[key]!=null&&(typeof set[key]!=='number'||!Number.isFinite(set[key])||set[key]<0))return 'Неизвестный формат числового показателя: '+key+'.';
   if(set[key]>0)found.add(key);
  }
 }
 if(!found.size)return 'Нулевые значения не определяют показатели. Нужна явная проверка исходных metrics.';
 for(const [key,unit] of [['weightUnit','kg'],['distanceUnit','m'],['timeUnit','s']]){
  if(exercise[key]!==undefined&&exercise[key]!==unit)return 'Неподдерживаемые единицы измерения: '+key+'.';
  if(exercise.sets.some(s=>s[key]!==undefined&&s[key]!==unit))return 'Неподдерживаемые единицы измерения подхода: '+key+'.';
 }
 const nativeUnits={seconds:'s',distance:'m',reps:'count',weight:'kg'};
 for(const row of [exercise,...exercise.sets])for(const key of ['units','metricUnits'])if(row[key]!==undefined){
  if(!object(row[key])||Object.entries(row[key]).some(([metric,unit])=>nativeUnits[metric]!==unit))return 'Неизвестные единицы исходных показателей.';
 }
 return null;
}
function validateInput(input,library){
 if(!object(input)||!hex(input.fileSHA256)||!Array.isArray(input.workouts)||!input.workouts.length||input.workouts.length>2000)throw Error('Invalid normalized Strong input');
 const ids=new Set();
 for(const w of input.workouts){
  if(!object(w)||!text(w.id)||!text(w.start)||!Array.isArray(w.exercises)||w.exercises.length>500||w.strongImport||ids.has(w.id))throw Error('Invalid or repeated source workout');
  ids.add(w.id);
  if(w.exercises.some(e=>!object(e)||!text(e.id)||!text(e.name)||e.strongImport))throw Error('Use original normalized source exercises');
 }
 if(!Array.isArray(library)||library.some(e=>!object(e)||!text(e.id)||!text(e.name))||new Set(library.map(e=>e.id)).size!==library.length)throw Error('Invalid effective exercise library');
}
function reviewProblem(entry,context){
 const {workout,index,exercise,workoutHash,exerciseHash}=context;
 if(!object(entry)||!['confirmed','requires_definition','unresolved'].includes(entry.status))return 'Недопустимый статус проверки записи.';
 if(entry.workoutId!==workout.id||entry.groupIndex!==index||entry.sourceStart!==workout.start||entry.sourceName!==exercise.name||entry.sourceWorkoutHash!==workoutHash||entry.sourceExerciseHash!==exerciseHash)return 'Проверка относится к другому содержимому или порядку исходной записи.';
 if(!text(entry.evidence)||entry.evidence.length>120)return 'Нет отдельного подтверждения смысла этой записи.';
 if(entry.loadBasis!==undefined&&!loadBases.includes(entry.loadBasis))return 'Неизвестный способ учёта нагрузки.';
 if(entry.semanticLabel!==undefined&&(typeof entry.semanticLabel!=='string'||entry.semanticLabel.length>500))return 'Повреждено описание смысла записи.';
 if(entry.binding!==undefined&&entry.binding!=='approved_generic_approximation')return 'Неизвестный режим подтверждения соответствия.';
 if(entry.binding==='approved_generic_approximation'&&[ropeApproximationLabel,entry.semanticLabel].filter(Boolean).join('. ').length>500)return 'Описание временного соответствия слишком длинное.';
 return null;
}
function reviewedVariantProblem(entry,target,variant){
 // A temporary generic binding is a separate, occurrence-scoped approval.
 // It preserves the actual attachment and never claims an exact variant match.
 if(entry.binding!==undefined){
  const ropeIdentity={family:'cable_triceps_pushdown',attachment:'rope'};
  const genericRow=['Triceps Pushdown (Cable - Straight Bar)','cable-triceps-pushdown','Разгибание рук вниз на блоке','Cable triceps pushdown','Блоки и эластичные ленты',['cable_station'],'load_reps','machine_display'];
  if(entry.binding!=='approved_generic_approximation'||variant?.family!=='cable_triceps_pushdown'||!equal(entry.identity,ropeIdentity)||!exactReviewedTarget(target,genericRow)||target.scope!=='app'||target.strongIdentity!==undefined)return 'Временная привязка каната требует отдельного подтверждения и точной общей карточки разгибания на блоке.';
  return null;
 }
 // The existing public back-squat card has a precise identity but predates
 // strongIdentity metadata. An explicit occurrence review may use that exact
 // card without changing it. This never makes an unreviewed squat automatic.
 // The caller has already verified the complete current target hash.
 if(variant?.family==='barbell_squat'&&entry.identity?.barPosition==='back'){
  const backIdentity={family:'barbell_squat',barPosition:'back'};
  const backRow=['Squat (Barbell)','barbell-back-squat','Приседание со штангой на спине','Barbell back squat','Штанга',['barbell','rack'],'load_reps','total_external'];
  if(!equal(entry.identity,backIdentity)||!exactReviewedTarget(target,backRow)||target.scope!=='app'||target.strongIdentity!==undefined)return 'Подтверждение приседания на спине требует точной существующей карточки со штангой на спине.';
  return null;
 }
 // A label or matching family is insufficient. Only an explicit, reviewed
 // exact identity on both the runtime decision and the existing card can bind.
 if(!object(entry.identity)||!object(target.strongIdentity)||!equal(entry.identity,target.strongIdentity))return 'Точная проверенная идентичность варианта отсутствует в карточке.';
 if(variant&&entry.identity.family!==variant.family)return 'Проверенная карточка относится к другому семейству движения.';
 if(variant&&variant.blocked.includes(target.id))return 'Общая или другая карточка не сохраняет подтверждённый вариант.';
 if(variant&&variant.requires.some(k=>!text(entry.identity[k])))return 'Проверенная идентичность варианта неполная.';
 if(variant?.family==='barbell_squat'&&!['back','front','overhead'].includes(entry.identity.barPosition))return 'Положение штанги всё ещё не подтверждено.';
 if(entry.identity.loadBasis!==undefined&&entry.identity.loadBasis!==entry.loadBasis)return 'Учёт нагрузки не совпадает с проверенной идентичностью.';
 return null;
}
async function resolve({input,effectiveLibrary,sourceHash,digest,occurrenceKey,review=null}={}){
 if(typeof digest!=='function'||typeof occurrenceKey!=='function')throw Error('Hash and occurrence-key helpers required');
 const source=snapshot(input),library=snapshot(effectiveLibrary),manifest=review===null?null:snapshot(review);
 validateInput(source,library);
 const hashed=async x=>{const result=await digest(x);if(!hex(result))throw Error('SHA-256 helper required');return result};
 if(!hex(sourceHash)||await hashed(source)!==sourceHash)throw Error('Normalized source hash changed');
 if(manifest&&(!object(manifest)||manifest.version!==1||manifest.sourceHash!==sourceHash||manifest.sourceFileSHA256!==source.fileSHA256||!object(manifest.decisions)))throw Error('Runtime review does not match this source');
 const definitions=new Map(library.map(e=>[e.id,e])),decisions=Object.create(null),unresolved=[],newDefinitionProposals=[],seenKeys=new Set();
 for(const workout of source.workouts){
  const workoutHash=await hashed(workout);
  for(let index=0;index<workout.exercises.length;index++){
   const exercise=workout.exercises[index],key=await occurrenceKey(workout,index),exerciseHash=await hashed(exercise);
   if(!text(key)||unsafe.has(key)||seenKeys.has(key))throw Error('Invalid or repeated occurrence key');
   seenKeys.add(key);
   const row=byName.get(exercise.name),variant=Object.hasOwn(variants,exercise.name)?variants[exercise.name]:null;
   const entry=manifest&&Object.hasOwn(manifest.decisions,key)?manifest.decisions[key]:null;
   const info={occurrenceKey:key,workoutId:workout.id,index,sourceId:exercise.id,sourceName:exercise.name};
   const reject=(code,reason,proposal=false)=>{
    unresolved.push({...info,code,reason});
    if(proposal)newDefinitionProposals.push({...info,status:'unresolved',createsDefinition:false,family:variant?.family||null,requiredIdentityFields:variant?.requires||[],...(entry?.identity?{reviewedIdentity:snapshot(entry.identity)}:{}),...(entry?.loadBasis?{loadBasis:entry.loadBasis}:{}),...(entry?.semanticLabel?{semanticLabel:entry.semanticLabel}:{}),reason});
   };
   const metrics=metricProblem(exercise);
   if(metrics){reject('source_metrics_unresolved',metrics);continue}
   if(entry){
    const problem=reviewProblem(entry,{workout,index,exercise,workoutHash,exerciseHash});
    if(problem){reject('review_changed',problem);continue}
    if(entry.status!=='confirmed'){
     reject(entry.status==='requires_definition'?'definition_required':'review_unresolved',entry.status==='requires_definition'?'Смысл этой записи проверен, но точная карточка ещё не утверждена и не добавлена.':variant?.reason||'Привязка этой записи ещё не подтверждена.',entry.status==='requires_definition');continue;
    }
    const target=definitions.get(entry.targetId);
    if(!target||!hex(entry.targetHash)||await hashed(target)!==entry.targetHash){reject('target_changed','Подтверждённая карточка отсутствует или изменилась.',!!variant);continue}
    const exact=exactReviewedTarget(target,row);
    const variantProblem=entry.binding!==undefined||!exact||variant?reviewedVariantProblem(entry,target,variant):null;
    if(variantProblem){reject('target_identity_unresolved',variantProblem,!!variant);continue}
    if(!loadBases.includes(entry.loadBasis)){reject('load_basis_unresolved','В проверке не указан способ учёта нагрузки.');continue}
    const semanticLabel=entry.binding==='approved_generic_approximation'?[ropeApproximationLabel,entry.semanticLabel].filter(Boolean).join('. '):entry.semanticLabel;
    decisions[key]={status:'confirmed',sourceWorkoutHash:workoutHash,targetId:target.id,targetHash:entry.targetHash,loadBasis:entry.loadBasis,evidence:entry.evidence,...(semanticLabel!==undefined?{semanticLabel}:{})};continue;
   }
   if(variant){reject('variant_review_required',variant.reason,true);continue}
   if(!row){reject('source_name_unreviewed','Нет проверенного соответствия для исходного названия.');continue}
   const target=definitions.get(row[1]);
   if(!exactReviewedTarget(target,row)){reject('library_identity_changed','Точная проверенная карточка отсутствует или её идентичность изменилась.');continue}
   // Family identity is reviewed; numeric load semantics are not inferred.
   // Per-occurrence source metrics may extend the library defaults (e.g. weight).
   decisions[key]={status:'confirmed',sourceWorkoutHash:workoutHash,targetId:target.id,targetHash:await hashed(target),loadBasis:'unknown',evidence:'Reviewed exact source-name and library identity'};
  }
 }
 if(manifest&&Object.keys(manifest.decisions).some(key=>!seenKeys.has(key)))throw Error('Runtime review contains an occurrence outside this source');
 return {sourceHash,decisions,unresolved,newDefinitionProposals};
}
root.StrongNativeMappings=Object.freeze({resolve});
})(globalThis);
