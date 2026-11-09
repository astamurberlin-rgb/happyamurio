/* Day account data. Merge independent edits; keep both versions of a disputed field. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HappyDayProfileData = api;
})(globalThis, function() {
  'use strict';
  const absent = Symbol('missing');
  const copy = value => value === absent ? absent : JSON.parse(JSON.stringify(value));
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const stable = value => JSON.stringify(value, (_, v) => object(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k,v[k]])) : v);
  const equal = (a,b) => a === b || (a !== absent && b !== absent && stable(a) === stable(b));
  const property = (obj,k) => object(obj) && Object.hasOwn(obj,k) ? obj[k] : absent;
  const choice = v => v === absent ? {present:false} : {present:true,value:copy(v)};
  const safeKey = k => !['__proto__','prototype','constructor'].includes(k);

  function mergeOrder(left,right,base) {
    const common = left.filter(k => right.includes(k));
    const other = right.filter(k => left.includes(k));
    let primary, secondary, conflict=false;
    if (equal(common,other)) {
      // Either order has the same shared anchors. Break ties consistently.
      [primary,secondary] = stable(left) < stable(right) ? [left,right] : [right,left];
    } else {
      const original = Array.isArray(base) ? base.filter(k => common.includes(k)) : [];
      if (equal(common,original)) [primary,secondary]=[right,left];
      else if (equal(other,original)) [primary,secondary]=[left,right];
      else { [primary,secondary]=[right,left]; conflict=true; }
    }
    const out=primary.slice();
    secondary.forEach((k,i) => {
      if (out.includes(k)) return;
      const next = secondary.slice(i+1).find(x => out.includes(x));
      if (next !== undefined) out.splice(out.indexOf(next),0,k);
      else out.push(k);
    });
    return {order:out,conflict};
  }

  function keyedField(a,b,base,path) {
    const all=[...a,...b,...(Array.isArray(base)?base:[])];
    if (!all.length) return null;
    const names=path.at(-1)==='planHistory'?['from','id','k']:['id','k'];
    return names.find(k => all.every(x=>object(x)&&typeof x[k]==='string'&&x[k]) &&
      [a,b,...(Array.isArray(base)?[base]:[])].every(list=>new Set(list.map(x=>x[k])).size===list.length)) || null;
  }

  function merge(base,local,remote,defaults={}) {
    const hasBase=base!=null, variants=new Map();
    function record(path,values) {
      const id=stable(path), old=variants.get(id)||{path:copy(path),choices:[]};
      for(const v of values) if(!old.choices.some(x=>equal(x,v))) old.choices.push(copy(v));
      old.choices.sort((x,y)=>stable(x).localeCompare(stable(y)));
      variants.set(id,old);
    }
    // Existing unresolved alternatives survive unrelated edits. An explicit
    // resolution is a deletion against a known baseline, not a permanent tombstone.
    const archiveKey='accountConflicts';
    const archived = db => object(db) && object(db[archiveKey]) ? db[archiveKey] : {};
    const al=archived(local), ar=archived(remote), ab=archived(base);
    for(const id of new Set([...Object.keys(al),...Object.keys(ar)])) {
      if(!safeKey(id)) throw Error('Недопустимый ключ профиля.');
      const l=al[id],r=ar[id],b=ab[id];
      if(hasBase && b && ((!l&&equal(r,b))||(!r&&equal(l,b)))) continue;
      for(const e of [l,r]) if(e) {
        if(!Array.isArray(e.path)||stable(e.path)!==id||!Array.isArray(e.choices)) throw Error('Неподдерживаемая запись сверки профиля.');
        record(e.path,e.choices);
      }
    }
    function choose(path,b,l,r,d) {
      if(equal(l,r)) return copy(l);
      if(hasBase && equal(l,b))return copy(r);
      if(hasBase && equal(r,b))return copy(l);
      if(l===absent||r===absent) {
        if(!hasBase||b===absent)return copy(l===absent?r:l);
        record(path,[choice(l),choice(r)]);return copy(r);
      }
      if(path.at(-1)==='passiveMindArchive'){record(path,[choice(l),choice(r)]);return copy(r);}
      if(object(l)&&object(r)&&(b===absent||object(b))) {
        const out={};
        for(const k of new Set([...Object.keys(l),...Object.keys(r),...(object(b)?Object.keys(b):[])])) {
          if(!safeKey(k))throw Error('Недопустимое поле профиля.');
          if(!path.length&&k===archiveKey)continue;
          const value=choose([...path,k],property(b,k),property(l,k),property(r,k),property(d,k));
          if(value!==absent)out[k]=value;
        }
        return out;
      }
      if(Array.isArray(l)&&Array.isArray(r)) {
        const key=keyedField(l,r,b,path);
        if(key) {
          const ids=list=>list.map(v=>v[key]);
          const find=(list,id)=>Array.isArray(list)?list.find(x=>x[key]===id)??absent:absent;
          const original=Array.isArray(b)?b:Array.isArray(d)?d:[];
          const sorted=mergeOrder(ids(l),ids(r),ids(original));
          const values=new Map();
          for(const id of sorted.order) {
            const v=choose([...path,{key,id}],find(b,id),find(l,id),find(r,id),find(d,id));
            if(v!==absent)values.set(id,v);
          }
          if(sorted.conflict)record([...path,{order:key}],[choice(ids(l)),choice(ids(r))]);
          return sorted.order.filter(id=>values.has(id)).map(id=>values.get(id));
        }
        if(!hasBase&&(!l.length||!r.length))return copy(l.length?l:r);
      }
      if(!hasBase) {
        if(d!==absent&&equal(l,d))return copy(r);
        if(d!==absent&&equal(r,d))return copy(l);
        if(path.at(-1)==='note' && (l===''||r===''))return copy(l===''?r:l);
      }
      record(path,[choice(l),choice(r)]);return copy(r);
    }
    const result=choose([],hasBase?base:absent,local,remote,defaults);
    if(variants.size)result[archiveKey]=Object.fromEntries([...variants].sort(([a],[b])=>a.localeCompare(b)));
    else delete result[archiveKey];
    return result;
  }

  function resolve(db,id,index) {
    const entry=db.accountConflicts?.[id], selected=entry?.choices?.[index];
    if(!selected || !entry.path.length || !equal(stable(entry.path),id))return false;
    let node=db;
    for(let i=0;i<entry.path.length;i++) {
      const part=entry.path[i],last=i===entry.path.length-1;
      if(typeof part==='string') {
        if(!safeKey(part)||!object(node))return false;
        if(last) { if(selected.present)node[part]=copy(selected.value);else delete node[part]; }
        else node=node[part];
      } else if(part.order && last && Array.isArray(node)&&Array.isArray(selected.value)) {
        const rank=new Map(selected.value.map((k,i)=>[k,i]));node.sort((a,b)=>(rank.get(a[part.order])??Infinity)-(rank.get(b[part.order])??Infinity));
      } else if(Array.isArray(node)&&typeof part.key==='string'&&safeKey(part.key)) {
        const pos=node.findIndex(x=>x?.[part.key]===part.id);
        if(last){
          if(selected.present){
            if(selected.value?.[part.key]!==part.id)return false;
            if(pos<0)node.push(copy(selected.value));else node[pos]=copy(selected.value);
          }else if(pos>=0)node.splice(pos,1);
        }else if(pos>=0)node=node[pos];else return false;
      }else return false;
    }
    delete db.accountConflicts[id];if(!Object.keys(db.accountConflicts).length)delete db.accountConflicts;
    return true;
  }
  return {merge,resolve};
});
