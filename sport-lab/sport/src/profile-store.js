/* Account-scoped local journal. The legacy slot is retained untouched for recovery.
 * Update 39.1 (owner, 09.11.2026): every tab is a writer. A journal changed by another tab is not an error any
 * more — it is merged three ways (what this tab last saw → what this tab has → what the other tab stored) with
 * SportControlledCAS.mergeData: record lists merge by id, a field changed differently in two tabs of the same
 * user keeps this tab's value (the user acted here last). Other tabs adopt the stored journal the same way. */
const SportProfiles=(()=>{
  const legacy='auth-readonly-happy-sport-prototype-v1',prefix=legacy+':profile:',session='auth_readonly_hd_cloud_v1';
  const read=k=>{const raw=sportStorage.getItem(k);return raw?JSON.parse(raw):null};
  const current=()=>read(session)?.s?.uid||'local';
  let owner='local',error='',blocked=false,observed=null;const listeners=new Set();let initiallyAbsent=false;
  const key=(uid=owner)=>prefix+encodeURIComponent(uid);
  try{
    owner=current();
    if(!(typeof SportWriterLock!=='undefined'&&SportWriterLock.embed)&&!sportStorage.getItem(prefix+'migrated')){
      const raw=sportStorage.getItem(legacy),old=raw?JSON.parse(raw):null;
      if(old){
        if(old.version!==1)throw Error('Неизвестный формат локального журнала');
        const target=key(old.sportOwner||'local');
        if(!sportStorage.getItem(target))sportStorage.setItem(target,raw);
      }
      // Written last. A failed copy can safely be retried; the original is never removed.
      sportStorage.setItem(prefix+'migrated','1');
    }
    observed=sportStorage.getItem(key());initiallyAbsent=observed===null;
  }catch(e){blocked=true;error='Не удалось открыть сохранённый журнал. Исходная копия сохранена: '+e.message}
  function assertOwner(){if(blocked)throw Error(error);if(current()!==owner)throw Error('Аккаунт изменился. Перезагрузи страницу перед редактированием.');}
  const parse=raw=>{try{return raw?JSON.parse(raw):null}catch{return null}};
  // Three-way merge of journal objects; without a usable base or merge engine the local copy wins.
  function merge(baseRaw,local,remoteRaw){
    const remote=parse(remoteRaw),base=parse(baseRaw);
    if(!remote||remote.version!==1||(remote.sportOwner&&remote.sportOwner!==owner))return {data:local,conflicts:[],changed:false};
    if(typeof SportControlledCAS==='undefined'||!SportControlledCAS.mergeData)return {data:local,conflicts:['merge-unavailable'],changed:false};
    const r=SportControlledCAS.mergeData(base&&base.version===1?base:null,local,remote);
    if(!r||!r.ok&&!r.data)return {data:local,conflicts:(r&&r.conflicts)||['merge-failed'],changed:false};
    return {data:r.data,conflicts:r.conflicts||[],changed:JSON.stringify(r.data)!==JSON.stringify(local)};
  }
  /* Another tab stored a newer journal: merge it with this tab's `local` (in-memory state) and return the result.
     Call with the current in-memory journal; the caller replaces its state with `data` when `changed`. */
  function adopt(local){
    const stored=sportStorage.getItem(key());if(stored===observed)return {data:local,conflicts:[],changed:false};
    const out=merge(observed,local,stored);observed=stored;return out;
  }
  return {get initiallyAbsent(){return initiallyAbsent},onSave(fn){listeners.add(fn);return ()=>listeners.delete(fn)},get owner(){return owner},get error(){return error},key,current,read,assertOwner,
    load(){if(blocked)return null;try{const data=read(key());if(data&&(data.version!==1||(data.sportOwner&&data.sportOwner!==owner)))throw Error('Журнал принадлежит другому профилю или имеет неизвестный формат');return data}catch(e){blocked=true;error=e.message;return null}},
    save(data){if(typeof SportWriterLock!=='undefined'&&SportWriterLock.embed)throw Error('Замеры не записывают полный журнал Sport');assertOwner();sportStorage.removeItem(key()+':journal-recovery-v2:headroom-probe');
      // Update 39.1: a journal written by another tab since we last looked is merged in, not refused.
      const stored=sportStorage.getItem(key());let merged=null;if(stored!==observed){const m=merge(observed,data,stored);if(m.changed){merged=m.data;data=m.data;}}
      const raw=JSON.stringify({...data,...(owner==='local'?{}:{sportOwner:owner})});
      // The write itself is compare-and-merge inside the IndexedDB transaction: a save by another tab that landed in the
      // same instant is merged there, and the tabs learn the stored result through the storage channel (adopt).
      const expected=stored;
      if(typeof SportLocalStore!=='undefined'&&SportLocalStore.writeMerged)SportLocalStore.writeMerged(key(),raw,expected,(baseRaw,localRaw,remoteRaw)=>{const m=merge(baseRaw,JSON.parse(localRaw),remoteRaw);return JSON.stringify({...m.data,...(owner==='local'?{}:{sportOwner:owner})})});
      else sportStorage.setItem(key(),raw);
      if(sportStorage.getItem(key())!==raw)throw Error('Сохранение журнала не прошло проверку');observed=raw;for(const fn of listeners){try{fn()}catch{}};return merged;},
    adopt,get observedRaw(){return observed},
    recoveryKey(suffix){return key()+suffix}
  };
})();
