/* Bounded recovery, not an unlimited second journal. Atomic compact vault writes.
 * A first unresolved conflict is pinned and prevents another destructive sync.
 * The latest pre-restore snapshot is never pruned; only acknowledged history rotates.
 */
const SportRecovery=(()=>{
  const copy=x=>JSON.parse(JSON.stringify(x));
  function stable(x){if(Array.isArray(x))return x.map(stable);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));return x}
  const content=x=>JSON.stringify(stable(x?.data||x));
  const bytes=s=>2*String(s||'').length;
  const empty=()=>({v:2,blobs:{},history:[],beforeCloud:null,conflict:null});
  // Update 38.7: the origin is shared with Day and Meal; the browser's real quota is checked by the headroom probe, not by a 4 MiB guess.
  function create({storage,key,current,historyLimit=2,maxBytes=1536*1024,totalBudget=Infinity,reserveBytes=512*1024}){
    const probeKey=key+':headroom-probe';
    function clearProbe(){storage.removeItem(probeKey)}
    clearProbe();
    function read(){const raw=storage.getItem(key);if(!raw)return empty();const value=JSON.parse(raw);if(value?.v!==2||!value.blobs||!Array.isArray(value.history))throw Error('Неизвестный формат копий восстановления');return value}
    function add(v,backup){const text=content(backup);let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;const prefix=text.length+'-'+hash.toString(16);let id=prefix,n=0;while(v.blobs[id]&&content(v.blobs[id])!==text)id=prefix+'-'+(++n);if(!v.blobs[id])v.blobs[id]=copy(backup);return id}
    function compact(v){
      v.history=v.history.slice(-historyLimit);
      const ids=new Set(v.history.flatMap(h=>h.ids));if(v.beforeCloud)ids.add(v.beforeCloud.id);if(v.conflict){ids.add(v.conflict.local);if(v.conflict.remote)ids.add(v.conflict.remote)}
      for(const id of Object.keys(v.blobs))if(!ids.has(id))delete v.blobs[id];return v;
    }
    function write(v){
      compact(v);const raw=JSON.stringify(v),prior=storage.getItem(key)||'';if(raw===prior)return;
      // Reserve ordinary journal-save headroom before writing any recovery payload.
      // This conservative estimate cannot guarantee a browser's actual quota; setItem
      // remains atomic and a real quota failure aborts before journal replacement.
      const currentBytes=bytes(JSON.stringify(current()||{})),largest=Math.max(currentBytes,...Object.values(v.blobs).map(b=>bytes(JSON.stringify(b.data||b))));
      const reserve=Math.max(reserveBytes,2*largest+128*1024);
      let used=0;for(let i=0;i<(storage.length||0);i++){const k=storage.key(i);if(k!=null)used+=bytes(k)+bytes(storage.getItem(k));}
      const projected=used-bytes(prior)+bytes(raw);
      if(bytes(raw)>maxBytes||projected+reserve>totalBudget)throw Error('Недостаточно места для безопасного восстановления. Текущий журнал и первая конфликтная копия не изменены. Выгрузи JSON и разбери сохранённый конфликт; затем освободи место в браузере.');
      const probeChars=Math.ceil((Math.max(0,bytes(raw)-bytes(prior))+reserve)/2);
      try{storage.setItem(probeKey,'0'.repeat(probeChars))}finally{clearProbe()}
      storage.setItem(key,raw);
    }
    function before(backup){const v=read();if(v.conflict)throw Error('Сначала разбери сохранённый конфликт журнала');const id=add(v,backup);if(v.beforeCloud?.id===id)return;if(v.beforeCloud&&!v.beforeCloud.acknowledged)throw Error('Предыдущее восстановление не подтверждено. Сначала проверь синхронизацию или выгрузи JSON.');if(v.beforeCloud)v.history.push({kind:'restore',ids:[v.beforeCloud.id]});v.beforeCloud={id,acknowledged:false};write(v)}
    function acknowledge(){const v=read();if(v.beforeCloud&&!v.beforeCloud.acknowledged){v.beforeCloud.acknowledged=true;write(v)}}
    function conflict(local,remote){const v=read();if(v.conflict){if(content(v.blobs[v.conflict.local])===content(local)&&content(v.conflict.remote?v.blobs[v.conflict.remote]:null)===content(remote))return;throw Error('Первый конфликт уже сохранён. Новые копии не добавляются: сначала выбери версию журнала или выгрузи JSON.');}v.conflict={local:add(v,local),remote:remote?add(v,remote):null};write(v)}
    function resolve(){const v=read();if(!v.conflict)return;v.history.push({kind:'resolved-conflict',ids:[v.conflict.local,v.conflict.remote].filter(Boolean)});v.conflict=null;write(v)}
    function get(kind){const v=read(),id=kind==='before-cloud'?v.beforeCloud?.id:kind==='conflict-local'?v.conflict?.local:kind==='conflict-cloud'?v.conflict?.remote:null;return id?copy(v.blobs[id]):null}
    return {before,acknowledge,conflict,resolve,get,clearProbe,pending:()=>!!read().conflict,inspect:()=>copy(read()),limits:{historyLimit,maxBytes,totalBudget,reserveBytes}};
  }
  return {create};
})();
