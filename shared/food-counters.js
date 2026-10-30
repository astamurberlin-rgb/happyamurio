/* Shared food counters. Definitions and individual servings merge by ID/revision.
   Only explicitly linked counters travel through this document. */
(function(root){
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x));
  const empty=()=>({v:1,definitions:[],events:[]});
  const id=()=>root.crypto.randomUUID?root.crypto.randomUUID():Array.from(root.crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  const number=x=>typeof x==='number'&&Number.isFinite(x);
  const positive=x=>number(x)&&x>0;
  const text=x=>typeof x==='string'&&x.length>0&&x.length<500;
  function validDate(x){const d=new Date(x+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(d)&&d.toISOString().slice(0,10)===x}
  function valid(d){
    if(!d||d.v!==1||!Array.isArray(d.definitions)||!Array.isArray(d.events))return false;
    const base=x=>x&&text(x.id)&&positive(x.rev)&&text(x.writer);
    return d.definitions.every(x=>base(x)&&(x.deleted||(text(x.title)&&text(x.fid)&&positive(x.q)&&positive(x.g)&&text(x.u)&&x.food&&x.food.id===x.fid&&text(x.food.n))))&&
      d.events.every(x=>base(x)&&text(x.cid)&&validDate(x.date)&&(x.deleted||(x.item&&text(x.item.fid)&&positive(x.item.q)&&positive(x.item.g)&&text(x.item.u)&&(x.item.t==null||/^([01]\d|2[0-3]):[0-5]\d$/.test(x.item.t)))));
  }
  function check(d){if(d&&!valid(d))throw new Error('Не удалось прочитать общие счётчики. Сохранённые данные не изменены.');return d||empty()}
  function compare(a,b){return a.rev-b.rev||String(a.writer).localeCompare(String(b.writer))||(Number(!!a.deleted)-Number(!!b.deleted))||JSON.stringify(a).localeCompare(JSON.stringify(b))}
  function merge(a,b){
    a=check(a);b=check(b);const out=empty();
    for(const type of ['definitions','events']){const map=new Map();for(const x of [...a[type],...b[type]]){const old=map.get(x.id);if(!old||compare(x,old)>0)map.set(x.id,x)}out[type]=[...map.values()].sort((x,y)=>x.id.localeCompare(y.id)).map(copy)}
    return out;
  }
  function revision(d){return Math.max(Date.now(),...d.definitions.map(x=>x.rev+1),...d.events.map(x=>x.rev+1))}
  function patch(d,type,value,writer){const out=empty();out[type]=[{...copy(value),rev:revision(d),writer:writer||id()}];return merge(d,out)}
  function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}
  function create(options){
    const o=options,owner=o.owner,key='happy-food-counters-v1:'+owner,writer=id(),storage=o.storage||root.localStorage;
    let doc=empty(),busy=false,again=false,timer,status='',stopped=false;
    // An immutable pending patch is written before the compact document. Separate
    // keys protect concurrent local tabs and also survive a crash between writes.
    function read(){let d=check(JSON.parse(storage.getItem(key)||'null'));for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&k.startsWith(key+':pending:'))d=merge(d,JSON.parse(storage.getItem(k)))}return d}
    function publish(d){doc=d;storage.setItem(key,JSON.stringify(d));o.apply(copy(d));}
    function setStatus(s){status=s;if(o.status)o.status(s)}
    function current(){return !stopped&&o.currentOwner()===owner}
    function update(type,value){
      if(!current())throw new Error('Аккаунт изменился. Открой приложение снова.');
      doc=merge(doc,read());const p=empty(),old=doc[type].find(x=>x.id===value.id);p[type]=[{...copy(value),rev:revision(doc),writer:writer+':'+id()}];if(type==='events')p[type][0].created=old&&(old.created||old.rev)||p[type][0].rev;check(p);
      storage.setItem(key+':pending:'+id(),JSON.stringify(p));doc=merge(doc,p);storage.setItem(key,JSON.stringify(doc));
      queue();return copy(p[type][0]);
    }
    function queue(){clearTimeout(timer);timer=setTimeout(sync,700)}
    function accept(incoming){if(!current())return;if(o.capture)o.capture();const merged=merge(merge(doc,read()),incoming);if(!same(doc,merged)){publish(merged)}else doc=merged}
    async function sync(){
      if(!current())return;if(busy){again=true;return}busy=true;
      try{
        accept(null);
        if(!o.online()){setStatus('Сохранено на устройстве · для других устройств войди в тот же аккаунт Happy.');return}
        setStatus('Синхронизация счётчиков…');
        for(let attempt=0;attempt<4;attempt++){
          const remote=await o.get();if(!current())return;
          accept(remote&&remote.doc);const next=copy(doc);
          if(!remote&&!next.definitions.length&&!next.events.length){setStatus('Счётчики готовы к синхронизации');return}
          if(remote&&same(next,check(remote.doc))){clean(next);setStatus('Счётчики синхронизированы');return}
          const at=Math.max(Date.now(),(remote&&remote.at||0)+1);
          if(!await o.put(next,remote?remote.at:null,at))continue;
          if(!current())return;clean(next);accept(next);
          if(!same(doc,next)){again=true;setStatus('Сохранено · отправляем новые нажатия…')}else setStatus('Счётчики синхронизированы');
          return;
        }
        again=true;throw new Error('Счётчики обновились на другом устройстве; повторяем обмен.');
      }catch(e){setStatus('Сохранено на устройстве. '+(e.message||'Синхронизация будет повторена.'))}
      finally{busy=false;if(again){again=false;queue()}}
    }
    function clean(confirmed){
      const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&k.startsWith(key+':pending:'))keys.push(k)}
      // Remove only patches already represented in the confirmed server version.
      keys.forEach(k=>{const p=JSON.parse(storage.getItem(k));if(same(merge(confirmed,p),confirmed))storage.removeItem(k)});
    }
    function local(){try{accept(null)}catch(e){setStatus(e.message)}}
    doc=merge(read(),o.backup||null);publish(doc);
    if(root.addEventListener){root.addEventListener('storage',e=>{if(e.key===key||(e.key||'').startsWith(key+':pending:')){local();queue()}});root.addEventListener('online',sync);root.addEventListener('focus',sync);}
    if(root.document){root.document.addEventListener('visibilitychange',()=>{if(!root.document.hidden)sync()});setInterval(()=>{if(!root.document.hidden)sync()},15000)}
    queue();
    return {update,refresh:local,sync,document:()=>copy(doc),status:()=>status,stop:()=>{stopped=true;clearTimeout(timer)}};
  }
  // Uses the existing encrypted app_sync API and account key. No schema change.
  function transport(){
    const uid=root.CL.s&&root.CL.s.uid,cryptoKey=root.CL.ck;
    function guard(){if(!root.CL.s||root.CL.s.uid!==uid||!root.clOn())throw new Error('Аккаунт изменился')}
    return {
      async get(){guard();const a=await root.clRest('GET','?select=v,iv,data,at&app=eq.meal&kind=eq.counters');guard();if(!a||!a[0])return null;const r=a[0];let bytes;
        try{bytes=await root.crypto.subtle.decrypt({name:'AES-GCM',iv:root.clUnb64(r.iv),additionalData:root.clUtf(uid+'|meal|counters')},cryptoKey,root.clUnb64(r.data))}catch(e){throw new Error('Общие счётчики не удалось расшифровать; проверь вход в обоих приложениях.')}
        guard();return {at:r.at,doc:check(JSON.parse(new TextDecoder().decode(bytes)))};
      },
      async put(d,expected,at){guard();const iv=root.crypto.getRandomValues(new Uint8Array(12));const data=new Uint8Array(await root.crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:root.clUtf(uid+'|meal|counters')},cryptoKey,root.clUtf(JSON.stringify(d))));guard();
        if(data.length>2900000)throw new Error('Объём счётчиков превысил лимит обмена. Выгрузи резервную копию.');
        const row={user_id:uid,app:'meal',kind:'counters',v:1,iv:root.clB64(iv),data:root.clB64(data),at};
        const result=expected==null?await root.clRest('POST','?on_conflict=user_id,app,kind',row,'resolution=ignore-duplicates,return=representation'):await root.clRest('PATCH','?app=eq.meal&kind=eq.counters&at=eq.'+expected,row,'return=representation');guard();return !!(result&&result.length);
      }
    };
  }
  root.HappyFoodCounters={copy,empty,id,valid,merge,patch,same,create,transport};
})(globalThis);
