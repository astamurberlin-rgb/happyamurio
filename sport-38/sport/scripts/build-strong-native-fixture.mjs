// Generates local QA pages only. Must never enter a publication artifact.
import fs from 'node:fs';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {source,current} from '../../../strong-native-additive-20261104/fixtures.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));const html=fs.readFileSync(root+'/dist/index.html','utf8');
const input=structuredClone(source);for(const w of input.workouts)for(const e of w.exercises)e.name='Bench Press (Barbell)';
const original={...structuredClone(current),sportOwner:'qa-strong-owner',customExercises:[],favoriteExercises:[]};
const blank={version:1,workouts:[],measurements:[],customExercises:[],templates:[],active:null,energy:{burn:0,intake:0,steps:0,training:0,minutes:0},demoPulse:false};
const library=(await (await import('./seed.mjs')).loadSeed()).exercises;
const variants=[['Seated Calf Raise (Plate Loaded)','machine-plate-loaded-seated-calf'],['Iso-Lateral Row (Machine)','machine-independent-lever-row'],['Bent Over Row (Dumbbell)','dumbbell-bilateral-simultaneous-row'],['Reverse Fly (Dumbbell)','dumbbell-incline-chest-supported-reverse-fly']].filter(([,id])=>library.some(e=>e.id===id));
for(const [i,[name]] of variants.entries())input.workouts[i].exercises[0].name=name;
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const envelope={app:'Happy Sport',version:1,data:{...blank,workouts:input.workouts}};
const fileSHA256=createHash('sha256').update(JSON.stringify(envelope)).digest('hex');
const review={version:1,sourceHash:digest({fileSHA256,workouts:input.workouts}),sourceFileSHA256:fileSHA256,decisions:{}};
for(const [i,[,id]] of variants.entries()){
 const w=input.workouts[i],e=w.exercises[0],target=library.find(e=>e.id===id),key=JSON.stringify([w.id,0,digest(e)]);
 review.decisions[key]={status:'confirmed',workoutId:w.id,groupIndex:0,sourceStart:w.start,sourceName:e.name,sourceWorkoutHash:digest(w),sourceExerciseHash:digest(e),targetId:id,targetHash:digest(target),identity:target.strongIdentity,loadBasis:target.loadBasis,evidence:'Synthetic explicit occurrence review',semanticLabel:id==='machine-plate-loaded-seated-calf'?'Условный выбор для синтетической проверки; фактический тип тренажёра неизвестен. Числа без пересчёта.':'Synthetic reviewed occurrence'};
}
for(const mode of ['original','fresh']){
 const prefix='qa-history-library-'+variants.length+'-'+mode,auth='qa-history-library-auth-'+variants.length+'-'+mode;
 const setup=`<script>(function(){
 const prefix=${JSON.stringify(prefix)},auth=${JSON.stringify(auth)},owner='qa-strong-owner',backendKey=${JSON.stringify('qa-history-library-'+variants.length+'-mock-server-v1')};
 const profile=prefix+':profile:'+owner;
 if(!localStorage.getItem(profile))localStorage.setItem(profile,JSON.stringify(${JSON.stringify(mode==='original'?original:blank)}));
 localStorage.setItem(auth,JSON.stringify({s:{uid:owner,at:'synthetic-token',rt:'synthetic-refresh',email:'synthetic@example.invalid',exp:Date.now()+86400000},k:btoa(String.fromCharCode(...new Uint8Array(32).fill(7))),last:0}));
 const counts={reads:0,writes:0,blocked:0};window.qaNativeCounts=counts;
 const ownOldQA=k=>k.startsWith('qa-strong-native-')||k.startsWith('qa-strong-auth-')||k==='qa-strong-mock-server-v1'||k.startsWith('qa-history-library-3-')||k.startsWith('qa-history-library-auth-3-');
 window.qaCleanupOld=function(){for(const k of Object.keys(localStorage))if(ownOldQA(k))localStorage.removeItem(k);qaStatus();};
 window.fetch=async function(input,init){const req=new Request(input,init),u=new URL(req.url);if(u.origin!=='https://geqziziycpclhnucnsyx.supabase.co'){counts.blocked++;throw Error('QA prevents all external/network fetch')}
 if(u.pathname!='/rest/v1/app_sync'){counts.blocked++;throw Error('QA no auth or other backend routes')}
 const row=JSON.parse(localStorage.getItem(backendKey)||'null');
 if(req.method==='GET'||req.method==='HEAD'){counts.reads++;return new Response(JSON.stringify(row?[row]:[]),{status:200,headers:{'Content-Type':'application/json'}})}
 if(!['POST','PATCH'].includes(req.method))throw Error('QA unexpected method');const next=await req.json();if(next.user_id!==owner||next.app!=='sport'||next.kind!=='journal')throw Error('QA unexpected owner/kind');counts.writes++;
 const match=req.method==='POST'?!row:row&&u.searchParams.get('at')==='eq.'+row.at&&u.searchParams.get('iv')==='eq.'+row.iv&&u.searchParams.get('user_id')==='eq.'+owner;
 if(match)localStorage.setItem(backendKey,JSON.stringify(next));return new Response(JSON.stringify(match?[next]:[]),{status:200,headers:{'Content-Type':'application/json'}});
 };
 window.qaStrongSource=${JSON.stringify(envelope)};window.qaStrongReview=${JSON.stringify(review)};
 window.qaStatus=function(){try{const p=JSON.parse(localStorage.getItem(profile)),l=JSON.parse(localStorage.getItem(profile+':controlled-sync-v3')||'null'),b=JSON.parse(localStorage.getItem(profile+':strong-native-backup-v1')||'null');document.getElementById('qa-result').textContent=JSON.stringify({mode:${JSON.stringify(mode)},workouts:p?.workouts.length,schedules:p?.schedules?.length||0,active:p?.active?.id||null,backupWorkouts:b?.state.workouts.length||0,baselineWorkouts:l?.baseline?.data.workouts.length||0,phase:l?.auto?.phase||null,sameOriginStorageBytes:Object.keys(localStorage).reduce((n,k)=>n+2*(k.length+(localStorage.getItem(k)||'').length),0),oldOwnQABytes:Object.keys(localStorage).filter(ownOldQA).reduce((n,k)=>n+2*(k.length+(localStorage.getItem(k)||'').length),0),counts},null,2)}catch(e){document.getElementById('qa-result').textContent=e.message}};
 window.qaSelect=function(ambiguous){const f=document.getElementById('sport-strong-file'),r=document.getElementById('sport-strong-decisions');if(!f||!r)return;const data=structuredClone(window.qaStrongSource);if(ambiguous)data.data.workouts[0].exercises[0].name='Squat (Barbell)';const transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(data)],'synthetic-strong.json',{type:'application/json'}));f.files=transfer.files;const reviews=new DataTransfer();if(!ambiguous)reviews.items.add(new File([JSON.stringify(window.qaStrongReview)],'synthetic-review.json',{type:'application/json'}));r.files=reviews.files;f.dispatchEvent(new Event('change',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));};
 window.addEventListener('DOMContentLoaded',()=>{const panel=document.createElement('section');panel.style.cssText='background:#fff;color:#123;padding:12px;position:relative;z-index:10000';panel.innerHTML='<b>LOCAL SYNTHETIC QA ONLY. No real account/network.</b><div><button id="qa-open">Open additive import</button> <button id="qa-file">Choose synthetic 32</button> <button id="qa-ambiguous">Choose ambiguous fixture</button> <button id="qa-status">Inspect synthetic result</button> <button id="qa-clean-old">Remove only prior owned synthetic fixtures</button></div><pre id="qa-result"></pre>';document.body.prepend(panel);document.getElementById('qa-open').onclick=()=>sportStrongOpen();document.getElementById('qa-file').onclick=()=>qaSelect(false);document.getElementById('qa-ambiguous').onclick=()=>qaSelect(true);document.getElementById('qa-status').onclick=qaStatus;document.getElementById('qa-clean-old').onclick=qaCleanupOld;setInterval(qaStatus,1500);});
})();<\/script>`;
 let page=html.replaceAll('auth-readonly-happy-sport-prototype-v1',prefix).replaceAll('auth_readonly_hd_cloud_v1',auth).replaceAll('auth-readonly-happy-sport-full-journal-writer-v1','qa-history-library-lock-'+mode).replace("connect-src 'self' https://geqziziycpclhnucnsyx.supabase.co","connect-src 'none'").replace('</head>',setup+'</head>');
 fs.writeFileSync(root+'/dist/qa-native-'+mode+'.html',page);
}
console.log('Built two isolated synthetic native QA pages; production source paths unchanged.');
