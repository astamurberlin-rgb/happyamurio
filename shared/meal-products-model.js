/* Happy Meal product composition v1. Pure, shared with future Day/Sport readers. */
(function(root){
'use strict';
var MACRO={kcal:'k',prot:'p',fat:'f',carb:'c'},UNITS={'г':1,'мг':0.001,'мкг':0.000001};
var ORIGINS=['copied','laboratory','calculated','user'],STATES=['value','missing','not_detected'];
var MAC_FIELDS=[['kcal','Калории','ккал'],['prot','Белки','г'],['fat','Жиры','г'],['carb','Углеводы','г']];
function clone(x){return x==null?x:JSON.parse(JSON.stringify(x))}
function uid(prefix){return prefix+(root.crypto&&root.crypto.randomUUID?root.crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2))}
function norm(s){return String(s||'').normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim()}
function finite(x){return typeof x==='number'&&Number.isFinite(x)?x:null}
function number(s){var t=String(s).trim().replace(',','.');if(!/^\d+(?:\.\d+)?$/.test(t))throw Error('Введи неотрицательное число');var n=Number(t);if(!Number.isFinite(n))throw Error('Число слишком большое');return n}
function unitFactor(from,to){if(from===to)return 1;if(UNITS[from]&&UNITS[to])return UNITS[from]/UNITS[to];return null}
function canonical(field){if(field.status!=='value')return null;var n=finite(field.value),factor=unitFactor(field.unit,field.canonicalUnit||field.unit);return n==null||factor==null?null:n*factor}
function fieldFor(food,key){
 var c=food&&food.composition;if(!c||c.version!==1)return null;
 return c.fields.find(function(f){return f.kind==='standard'&&f.key===key})||c.fields.find(function(f){return f.kind==='custom'&&f.mapsTo===key})||null;
}
function value(food,key,readBls){
 if(!food)return null;
 if(food.composition){var f=fieldFor(food,key);if(!f)return null;var v=canonical(f);return v==null?null:v*(100/food.composition.basisGrams)}
 if(MACRO[key])return finite(food[MACRO[key]]);
 return food.b&&readBls?finite(readBls(food.b,key)):null;
}
function fromFood(food,fields,readBls,options){
 options=options||{};var at=options.at||new Date().toISOString(),out=clone(food||{}),copy=!!options.copy;
 if(out.composition&&out.composition.version!==1)throw Error('Эта версия состава новее редактора. Обнови Happy Meal.');
 if(!out.composition){
   out.composition={version:1,basisGrams:100,fields:(fields||MAC_FIELDS.map(function(x){return {key:x[0],title:x[1],unit:x[2],group:'main'}})).map(function(f){
     var v=value(food,f.key,readBls);
     return {key:f.key,kind:'standard',name:f.title,unit:f.unit,canonicalUnit:f.unit,category:f.group,value:v,status:v==null?'missing':'value',origin:copy?'copied':'user',source:options.sourceInfo?String(options.sourceInfo.source||'')+(food.b?' · '+food.b:''):food?(food.src==='BLS'?'BLS 4.0 · Max Rubner-Institut (2025)'+(food.b?' · '+food.b:''):food.src||''):'',notes:''};
   })};
 }
 if(copy){
   out.copiedFrom={id:food.id,name:food.n,source:food.src||'',code:food.b||'',at:at,sourceInfo:clone(options.sourceInfo)||null};
   out.id=uid('u:');out.n=(food.n||'Продукт')+' — моя копия';out.revision=0;out.history=[];out.createdAt=at;
   out.composition.fields.forEach(function(f){f.copiedFrom={productId:food.id,productName:food.n,field:clone(f)};f.origin='copied'});
 }else if(!out.id){out.id=uid('u:');out.n=options.name||'';out.revision=0;out.history=[];out.createdAt=at}
 delete out.b;delete out.tmp;delete out.fromBls;delete out.kav;delete out.req;
 out.src='Мои';out.por=out.por||{};out.variety=out.variety||'';out.region=out.region||'';out.state=out.state||'';out.description=out.description||'';out.notes=out.notes||'';
 return project(out);
}
function project(food){Object.keys(MACRO).forEach(function(k){food[MACRO[k]]=value(food,k)});food.w=norm([food.n,food.variety,food.region,food.state].join(' ')).split(/[^a-zа-я0-9%]+/).filter(Boolean);return food}
function rebase(food,grams){
 if(!(grams>0)||!Number.isFinite(grams))throw Error('Масса основы должна быть больше нуля');
 var out=clone(food),c=out.composition,ratio=grams/c.basisGrams;
 c.fields.forEach(function(f){if(f.status==='value')f.value=Number((f.value*ratio).toPrecision(12))});c.basisGrams=grams;return project(out);
}
function validate(food){
 if(!food.id||!String(food.n||'').trim())throw Error('Укажи название продукта');
 if(food.n.length>200)throw Error('Название: не более 200 символов');
 Object.entries(food.por||{}).forEach(function(x){if(!x[0].trim()||x[0].length>80||x[0]==='г'||!(x[1]>0)||!Number.isFinite(x[1]))throw Error('Проверь название и массу порции');});
 var c=food.composition;if(!c||c.version!==1||!(c.basisGrams>0)||!Number.isFinite(c.basisGrams))throw Error('Проверь массу основы');
 var keys=new Set(),targets=new Set();
 c.fields.forEach(function(f){
   if(!f.key||keys.has(f.key))throw Error('Одно свойство добавлено дважды');keys.add(f.key);
   if(f.kind!=='standard'&&f.kind!=='custom')throw Error('Неизвестный тип свойства');
   if(f.kind==='custom'&&!f.key.startsWith('prop:'))throw Error('У своего свойства должен быть собственный идентификатор');
   if(!String(f.name||'').trim()||!String(f.unit||'').trim()||!String(f.category||'').trim())throw Error('Укажи название, единицу и категорию свойства');
   if(!ORIGINS.includes(f.origin)||!STATES.includes(f.status))throw Error('Проверь происхождение и состояние показателя');
   if(f.status==='value'&&(finite(f.value)==null||f.value<0))throw Error('Проверь значение «'+f.name+'»');
   if(f.status!=='value'&&f.value!==null)throw Error('Без результата числовое значение должно быть пустым');
   var target=f.kind==='standard'?f.key:f.mapsTo;
   if(target){if(targets.has(target))throw Error('«'+f.name+'»: стандартный нутриент уже есть. Сначала убери его строку.');targets.add(target);if(unitFactor(f.unit,f.canonicalUnit||f.unit)==null)throw Error('Несовместимые единицы у «'+f.name+'»')}
   if(f.measuredAt){var date=new Date(f.measuredAt+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(f.measuredAt)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==f.measuredAt)throw Error('Проверь дату измерения')}
 });return true;
}
function changes(before,after){
 var out=[];['n','variety','region','state','description','notes','drink','por'].forEach(function(k){if(JSON.stringify(before&&before[k])!==JSON.stringify(after[k]))out.push({path:k,before:clone(before&&before[k])??null,after:clone(after[k])??null})});
 var a=before&&before.composition,b=after.composition;
 if(!a||a.basisGrams!==b.basisGrams)out.push({path:'basisGrams',before:a?a.basisGrams:null,after:b.basisGrams});
 var old={},fresh={};(a?a.fields:[]).forEach(function(f){old[f.key]=f});b.fields.forEach(function(f){fresh[f.key]=f});
 Array.from(new Set(Object.keys(old).concat(Object.keys(fresh)))).forEach(function(k){if(JSON.stringify(old[k])!==JSON.stringify(fresh[k]))out.push({path:'field:'+k,before:clone(old[k])||null,after:clone(fresh[k])||null})});return out;
}
function upsert(db,draft,options){
 options=options||{};validate(draft);var next=clone(db),list=next.foods||(next.foods=[]),i=list.findIndex(function(f){return f.id===draft.id}),prev=i<0?null:list[i];
 if(prev&&(prev.revision||0)!==(options.expectedRevision??draft.revision??0))throw Error('Продукт изменён в другом окне. Открой его заново.');
 if(list.some(function(f){return f.id!==draft.id&&norm(f.n)===norm(draft.n)}))throw Error('Продукт с таким названием уже есть в «Моих продуктах»');
 var out=project(clone(draft)),diff=changes(prev,out),at=options.at||new Date().toISOString();
 if(prev&&!diff.length)return {db:next,food:prev,changed:false};
 out.n=out.n.trim();out.revision=(prev&&prev.revision||0)+1;out.createdAt=prev&&prev.createdAt||out.createdAt||at;out.updatedAt=at;
 out.history=clone(prev&&prev.history||[]);out.history.push({id:uid('rev:'),revision:out.revision,at:at,operation:prev?'update':out.copiedFrom?'copy':'create',changes:diff});
 if(i<0)list.push(out);else list[i]=out;
 var defs=next.propertyDefs||(next.propertyDefs=[]);
 out.composition.fields.filter(function(f){return f.kind==='custom'}).forEach(function(f){if(!defs.some(function(d){return d.key===f.key}))defs.push({key:f.key,kind:'custom',name:f.name,unit:f.unit,category:f.category})});
 next.productsVersion=1;return {db:next,food:out,changed:true};
}
function coefficient(food,keys,factor){
 if(!(factor>=0)||!Number.isFinite(factor))throw Error('Коэффициент должен быть неотрицательным числом');
 if(!keys.length)throw Error('Отметь показатели для пересчёта');
 var out=clone(food),count=0;
 out.composition.fields.forEach(function(f){if(keys.includes(f.key)&&f.status==='value'){var before=f.value;f.value=Number((before*factor).toPrecision(12));f.origin='calculated';f.calculation={operation:'coefficient',factor:factor,before:before};count++}});
 if(!count)throw Error('У выбранных показателей нет числовых значений');validate(out);return project(out);
}
function snapshot(food){var out=clone(food);delete out.history;delete out.w;return out}
function forItem(item,foods,db){return item.productSnapshot||(db&&db.productSnapshots&&db.productSnapshots[item.productRevision])||foods[item.fid]||null}
function snapshotItems(db,foods){
 var changed=false;
 Object.keys(db.days||{}).forEach(function(d){((db.days[d]||{}).items||[]).forEach(function(x){
   var f=x.productSnapshot||foods[x.fid];if(!f||!f.composition||x.productRevision)return;
   var key=f.id+'@'+(f.revision||0),snapshots=db.productSnapshots||(db.productSnapshots={});
   if(!snapshots[key])snapshots[key]=snapshot(f);x.productRevision=key;delete x.productSnapshot;changed=true;
 })});return changed;
}
function migrate(db){
 if(db.productsVersion>1)return {db:clone(db),changed:false,readOnly:true};
 var out=clone(db),changed=false;
 (out.foods||[]).forEach(function(f,i){if(!f.composition&&!f.b){out.foods[i]=fromFood(f);out.foods[i].revision=f.revision||0;changed=true}});
 if(out.productsVersion!==1){out.productsVersion=1;changed=true}if(!Array.isArray(out.propertyDefs)){out.propertyDefs=[];changed=true}
 return {db:out,changed:changed};
}
function exchange(db,foods,fields,readBls){
 var days={},products={};
 Object.keys(db.days||{}).forEach(function(date){
   var items=(db.days[date]||{}).items||[];if(!items.length)return;
   var standard={},custom={};
   fields.forEach(function(def){standard[def.key]={value:null,unit:def.unit,known:0,missing:0,notDetected:0}});
   items.forEach(function(item){var food=forItem(item,foods,db),mass=finite(item.g);if(food&&food.composition)products[food.id+'@'+(food.revision||0)]={id:food.id,name:food.n,revision:food.revision||0};
     fields.forEach(function(def){var a=standard[def.key],v=value(food,def.key,readBls),f=fieldFor(food,def.key);if(v!=null&&mass!=null){a.value=(a.value||0)+v*mass/100;a.known++}else if(f&&f.status==='not_detected')a.notDetected++;else a.missing++});
     if(food&&food.composition)food.composition.fields.filter(function(f){return f.kind==='custom'}).forEach(function(f){
       // Same property may use different display units; exchange uses its definition unit.
       var key=f.key+'|'+f.unit,a=custom[key]||(custom[key]={id:f.key,name:f.name,unit:f.unit,category:f.category,mapsTo:f.mapsTo||null,value:null,known:0,missing:items.length,notDetected:0});
       if(f.status==='value'&&mass!=null){a.value=(a.value||0)+f.value*mass/food.composition.basisGrams;a.known++;a.missing--}else if(f.status==='not_detected'){a.notDetected++;a.missing--}
     });
   });days[date]={standard:standard,custom:Object.values(custom)};
 });return {schema:'happy.meal.nutrition.v1',products:Object.values(products),days:days};
}
root.MealProducts={version:1,macro:MACRO,origins:ORIGINS,clone:clone,uid:uid,norm:norm,number:number,unitFactor:unitFactor,canonical:canonical,fieldFor:fieldFor,value:value,fromFood:fromFood,project:project,rebase:rebase,validate:validate,changes:changes,upsert:upsert,coefficient:coefficient,snapshot:snapshot,forItem:forItem,snapshotItems:snapshotItems,migrate:migrate,exchange:exchange};
})(globalThis);
