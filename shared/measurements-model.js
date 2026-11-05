/* Per-date revisions and deletion markers for Happy body measurements. */
(function(root){
'use strict';
function validDate(d){return /^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d}
function valid(r){return r&&validDate(r.date)&&Number.isSafeInteger(r.rev)&&r.rev>=0&&(r.deleted===true||r.values&&typeof r.values==='object'&&!Array.isArray(r.values)&&Object.values(r.values).every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=1&&n<=500))}
function stable(x){if(x===null||typeof x!=='object')return JSON.stringify(x);if(Array.isArray(x))return '['+x.map(stable).join(',')+']';return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}'}
function compare(a,b){if(a.rev!==b.rev)return a.rev>b.rev?1:-1;if(!!a.deleted!==!!b.deleted)return a.deleted?1:-1;var sa=stable(a),sb=stable(b);return sa===sb?0:sa>sb?1:-1}
function merge(a,b){var out=new Map();for(var r of [...(a?.records||[]),...(b?.records||[])]){if(!valid(r))continue;var old=out.get(r.date);if(!old||compare(r,old)>0)out.set(r.date,r)}return {v:1,records:[...out.values()].sort((a,b)=>a.date.localeCompare(b.date))}}
function visible(d){return (d?.records||[]).filter(r=>!r.deleted).map(r=>({date:r.date,values:{...r.values},source:r.source||'Мой замер',note:r.note||''}))}
function changes(before,after,doc,now){var records=[],old=new Map(before.map(r=>[r.date,r])),next=new Map(after.map(r=>[r.date,r])),revs=new Map((doc?.records||[]).map(r=>[r.date,r.rev]));for(var date of new Set([...old.keys(),...next.keys()])){var a=old.get(date),b=next.get(date);if(JSON.stringify(a)===JSON.stringify(b))continue;records.push(b?{...b,rev:Math.max(now,(revs.get(date)||0)+1)}:{date,deleted:true,rev:Math.max(now,(revs.get(date)||0)+1)})}return merge(doc,{records})}
root.HappyMeasurements={validDate,valid,merge,visible,changes};
})(typeof globalThis!=='undefined'?globalThis:this);
