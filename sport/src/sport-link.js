/* Shared summary, independent of rendering. Stable IDs make edits replace entries. */
const SPORT_LINK_KEY=globalThis.HappyProfile?HappyProfile.key('hd_link_sport_v1'):'hd_link_sport_v1';
function sportFacts(w){return {id:w.id,title:w.title,kind:w.kind,start:w.start,end:w.end,duration:Math.max(0,+w.duration||0),energyKcal:!w.demo&&Number.isFinite(w.energyKcal)?w.energyKcal:null}}
function sportMerge(a,b){
  const byId=new Map();
  for(const r of [...(a?.records||[]),...(b?.records||[])]){
    if(!r||typeof r.id!=='string'||!Number.isFinite(r.rev))continue;
    const old=byId.get(r.id);
    if(!old||r.rev>old.rev||(r.rev===old.rev&&r.deleted))byId.set(r.id,r);
  }
  return {v:1,at:Math.max(a?.at||0,b?.at||0),records:[...byId.values()]};
}
function sportTrack(workouts,previous,now=Date.now()){
  const old=new Map((previous?.records||[]).map(r=>[r.id,r])),seen=new Set(),records=[];
  for(const w of workouts.filter(w=>!w.demo)){
    const facts=sportFacts(w),prior=old.get(w.id);seen.add(w.id);
    const same=prior&&!prior.deleted&&JSON.stringify(sportFacts(prior))===JSON.stringify(facts);
    records.push(same?prior:{...facts,rev:Math.max(now,(prior?.rev||0)+1)});
  }
  for(const r of old.values())if(!seen.has(r.id))records.push(r.deleted?r:{id:r.id,deleted:true,rev:Math.max(now,r.rev+1)});
  return {v:1,at:records.reduce((n,r)=>Math.max(n,r.rev),0),records};
}
