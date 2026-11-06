/* Bounded create-only operation over the current journal. No timers or auto-run. */
const SportControlled=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x));
 const canonical=x=>JSON.stringify(sort(x));
 function sort(x){if(Array.isArray(x))return x.map(sort);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])]));return x}
 function create(d){
  let busy=false;
  function rows(value){if(!Array.isArray(value))throw Error('Сервер не подтвердил отсутствие журнала');return value}
  async function upload(dispatch){
   if(busy)throw Error('Действие уже выполняется');busy=true;let ctx,attempt,dispatched=false;
   try{
    ctx=d.capture();d.check(ctx);if(d.loadAttempt(ctx))throw Error('Попытка уже сохранена. Доступна только проверка результата без записи.');
    const payload=copy(d.snapshot());d.validate(payload);d.check(ctx);
    const expectedHash=await d.digest(payload.data);d.check(ctx);
    const present=rows(await d.readRows(ctx));d.check(ctx);if(present.length)throw Error('Облачный sport/journal уже существует. Создание и перезапись запрещены.');
    d.backup(ctx);d.check(ctx);
    const row=await d.encrypt(payload,ctx);d.check(ctx);
    attempt={v:1,id:d.id(),uid:ctx.uid,status:'pending',expectedHash,iv:row.iv,at:row.at};
    d.saveAttempt(ctx,attempt);d.check(ctx);
    // Marker is durable before dispatch; every post-dispatch failure stays blocked.
    dispatched=true;const response=await dispatch(row,ctx,()=>d.check(ctx));d.check(ctx);
    if(!response.ok)throw Error('Сервер не подтвердил запись ('+response.status+'). Повтор запрещён до проверки.');
    const inserted=await response.json();d.check(ctx);
    if(!Array.isArray(inserted))throw Error('Неоднозначный ответ создания');
    if(inserted.length===0){attempt.status='conflict';d.saveAttempt(ctx,attempt);return {status:'conflict'};}
    if(inserted.length!==1||inserted[0].iv!==row.iv||inserted[0].data!==row.data||inserted[0].user_id!==ctx.uid||inserted[0].app!=='sport'||inserted[0].kind!=='journal'||inserted[0].v!==row.v||inserted[0].at!==row.at)throw Error('Ответ создания не совпал с отправленной копией');
    const remote=await d.readBack(ctx);d.check(ctx);if(!remote)throw Error('Созданная копия пока не читается');d.validate(remote);
    const actual=await d.digest(remote.data);d.check(ctx);if(actual!==expectedHash)throw Error('Прочитанная копия отличается. Повторная запись запрещена.');
    attempt.status='verified';d.saveAttempt(ctx,attempt);d.check(ctx);d.acknowledge?.(ctx);d.check(ctx);return {status:'verified'};
   }catch(e){
    if(attempt&&dispatched){try{d.check(ctx);d.saveAttempt(ctx,{...attempt,status:'uncertain'})}catch{}}
    throw e;
   }finally{busy=false;}
  }
  async function reconcile(){
   if(busy)throw Error('Действие уже выполняется');busy=true;
   try{
    const ctx=d.capture(false);d.check(ctx);const attempt=d.loadAttempt(ctx);if(!attempt)throw Error('Сохранённой попытки нет');
    const present=rows(await d.readRows(ctx));d.check(ctx);
    if(!present.length){d.saveAttempt(ctx,{...attempt,status:'unresolved-absent'});return {status:'unresolved-absent'};}
    if(present.length!==1)throw Error('Неоднозначный результат чтения');
    const remote=await d.readBack(ctx);d.check(ctx);if(!remote)throw Error('Копия не прочитана');d.validate(remote);
    const actual=await d.digest(remote.data);d.check(ctx);const status=actual===attempt.expectedHash?'verified':'conflict';d.saveAttempt(ctx,{...attempt,status});d.check(ctx);return {status};
   }finally{busy=false;}
  }
  return {upload,reconcile,get busy(){return busy}};
 }
 return {canonical,create};
})();
