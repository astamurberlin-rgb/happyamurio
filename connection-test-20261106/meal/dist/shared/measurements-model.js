/* Per-date revisions and deletion markers for Happy body measurements. */
(function(root){
'use strict';
function validDate(d){return /^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d}
function valid(r){return r&&validDate(r.date)&&Number.isSafeInteger(r.rev)&&r.rev>=0&&(r.deleted===true||r.values&&typeof r.values==='object'&&!Array.isArray(r.values)&&Object.values(r.values).every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=1&&n<=500))}
function merge(a,b){var out=new Map();for(var r of [...(a?.records||[]),...(b?.records||[])]){if(!valid(r))continue;var old=out.get(r.date);if(!old||r.rev>old.rev||r.rev===old.rev&&(r.deleted||JSON.stringify(r)>JSON.stringify(old)))out.set(r.date,r)}return {v:1,records:[...out.values()].sort((a,b)=>a.date.localeCompare(b.date))}}
function visible(d){return (d?.records||[]).filter(r=>!r.deleted).map(r=>({date:r.date,values:{...r.values},source:r.source||'Мой замер',note:r.note||''}))}
function changes(before,after,doc,now){var records=[],old=new Map(before.map(r=>[r.date,r])),next=new Map(after.map(r=>[r.date,r])),revs=new Map((doc?.records||[]).map(r=>[r.date,r.rev]));for(var date of new Set([...old.keys(),...next.keys()])){var a=old.get(date),b=next.get(date);if(JSON.stringify(a)===JSON.stringify(b))continue;records.push(b?{...b,rev:Math.max(now,(revs.get(date)||0)+1)}:{date,deleted:true,rev:Math.max(now,(revs.get(date)||0)+1)})}return merge(doc,{records})}
root.HappyMeasurements={validDate,valid,merge,visible,changes};
})(typeof globalThis!=='undefined'?globalThis:this);
