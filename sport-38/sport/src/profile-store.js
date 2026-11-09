/* Account-scoped local journal. The legacy slot is retained untouched for recovery. */
const SportProfiles=(()=>{
  const legacy='auth-readonly-happy-sport-prototype-v1',prefix=legacy+':profile:',session='auth_readonly_hd_cloud_v1';
  const read=k=>{const raw=localStorage.getItem(k);return raw?JSON.parse(raw):null};
  const current=()=>read(session)?.s?.uid||'local';
  let owner='local',error='',blocked=false,observed=null;const listeners=new Set();let initiallyAbsent=false;
  const key=(uid=owner)=>prefix+encodeURIComponent(uid);
  try{
    owner=current();
    if(!(typeof SportWriterLock!=='undefined'&&SportWriterLock.embed)&&!localStorage.getItem(prefix+'migrated')){
      const raw=localStorage.getItem(legacy),old=raw?JSON.parse(raw):null;
      if(old){
        if(old.version!==1)throw Error('Неизвестный формат локального журнала');
        const target=key(old.sportOwner||'local');
        if(!localStorage.getItem(target))localStorage.setItem(target,raw);
      }
      // Written last. A failed copy can safely be retried; the original is never removed.
      localStorage.setItem(prefix+'migrated','1');
    }
    observed=localStorage.getItem(key());initiallyAbsent=observed===null;
  }catch(e){blocked=true;error='Не удалось открыть сохранённый журнал. Исходная копия сохранена: '+e.message}
  function assertOwner(){if(typeof SportWriterLock!=='undefined'&&!SportWriterLock.held&&!SportWriterLock.embed)throw Error('Sport открыт в другом окне — здесь только просмотр. Нажми «Продолжить здесь».');if(blocked)throw Error(error);if(current()!==owner)throw Error('Аккаунт изменился. Перезагрузи страницу перед редактированием.');if(localStorage.getItem(key())!==observed)throw Error('Журнал изменился в другой вкладке. Выгрузи текущие изменения в JSON, затем обнови страницу.');}
  return {get initiallyAbsent(){return initiallyAbsent},onSave(fn){listeners.add(fn);return ()=>listeners.delete(fn)},get owner(){return owner},get error(){return error},key,current,read,assertOwner,
    load(){if(blocked)return null;try{const data=read(key());if(data&&(data.version!==1||(data.sportOwner&&data.sportOwner!==owner)))throw Error('Журнал принадлежит другому профилю или имеет неизвестный формат');return data}catch(e){blocked=true;error=e.message;return null}},
    save(data){if(typeof SportWriterLock!=='undefined'&&SportWriterLock.embed)throw Error('Замеры не записывают полный журнал Sport');assertOwner();localStorage.removeItem(key()+':journal-recovery-v2:headroom-probe');const raw=JSON.stringify({...data,...(owner==='local'?{}:{sportOwner:owner})});localStorage.setItem(key(),raw);if(localStorage.getItem(key())!==raw)throw Error('Сохранение журнала не прошло проверку');observed=raw;for(const fn of listeners){try{fn()}catch{}};},
    recoveryKey(suffix){return key()+suffix}
  };
})();
