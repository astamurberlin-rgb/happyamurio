/* Shared lookup for label templates and saved variants. No nutritional projection. */
(function(root){'use strict';
const normalize=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/omega/g,'омега').replace(/magnesium/g,'магний').replace(/creatine/g,'креатин').replace(/protein/g,'протеин').replace(/[–—−-]/g,' ');
function matches(x,q){const S=root.HappySubstances;const text=normalize([x.name,x.form,x.templateId,x.category,...(x.components||[]).map(c=>{const f=S&&S.get(c.substanceId);return c.name+(f?' '+f.title+' '+f.key+' '+S.groups[f.group]:'')})].join(' '));return normalize(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean).every(t=>text.includes(t));}
function search(templates,variants,q,options={}){if(options.enabled===false)return [];const query=String(q||'').trim(),mode=options.mode||'all';if(!query&&mode==='all')return [];const used=new Set(options.recentIds||[]);const mine=variants.filter(x=>(mode!=='recent'||used.has(x.id))&&(mode!=='fav'||(options.favoriteIds||[]).includes(x.id))&&matches(x,query)).map(x=>({kind:'variant',item:x}));return mine.concat(mode==='all'?templates.filter(x=>matches(x,query)).map(x=>({kind:'template',item:x})):[]).slice(0,35);}
const api={normalize,matches,search};root.HappySupplementsSearch=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
