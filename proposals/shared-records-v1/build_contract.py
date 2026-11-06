"""Generate proposal-only JSON contracts and synthetic examples. No network."""
import copy,json
from pathlib import Path
P=Path(__file__).parent
obj=lambda properties,required=None: {'type':'object','properties':properties,'required':list(properties) if required is None else required,'additionalProperties':False}
text={'type':'string','minLength':1}
revision=obj({'number':{'type':'integer','minimum':1},'operation_id':text})
prov={'oneOf':[
 obj({'source_app':{'enum':['day','meal','sport']},'method':{'const':'created'},'creation_operation_id':text}),
 obj({'source_app':{'enum':['day','meal','sport']},'method':{'const':'imported'},'source_namespace':text,'legacy_ref':text,'import_batch':text})
]}
record=obj({'id':text,'record_type':text,'source_app':{'enum':['day','meal','sport']},'payload_schema_version':{'type':'integer','minimum':1},'revision':revision,'provenance':prov,'payload':{'type':'object'}})
tomb=obj({'id':text,'record_type':text,'revision':revision,'prior_record_revision':{'type':'integer','minimum':1},'recovery_ref':text})
profile=obj({'revision':revision,'preferences':obj({'locale':text,'time_zone':text,'units':obj({'length':{'enum':['cm','in']},'mass':{'enum':['kg','lb']}},[])},[]),'app_preferences':obj({a:{'type':'object'} for a in ['day','meal','sport']},[])})
schema=obj({'schema_version':{'const':1},'owner_id':text,'authority_epoch':{'type':'integer','minimum':1},'document_revision':{'type':'integer','minimum':1},'profile':profile,'records':{'type':'object','additionalProperties':record},'tombstones':{'type':'object','additionalProperties':tomb},'migration':obj({'manifest_ref':text,'checkpoint_ref':text,'state':{'enum':['staged','active','read_only']}})})
schema['properties']['migration']={'oneOf':[{'type':'null'},schema['properties']['migration']]}
schema['properties']['operation_receipts']={'type':'object','additionalProperties':obj({'request_digest':text,'result_revision':{'type':'integer','minimum':1},'checkpoint_ref':text})}
schema['required'].append('operation_receipts')
schema['$schema']='https://json-schema.org/draft/2020-12/schema'
schema['title']='Proposed common Happy snapshot; not a deployed API'
example={'schema_version':1,'owner_id':'synthetic-owner-A','authority_epoch':1,'document_revision':4,'profile':{'revision':{'number':1,'operation_id':'synthetic-op-profile'},'preferences':{'locale':'ru','time_zone':'Etc/UTC','units':{'length':'cm','mass':'kg'}},'app_preferences':{}},'records':{'synthetic-record-A':{'id':'synthetic-record-A','record_type':'measurement','source_app':'sport','payload_schema_version':1,'revision':{'number':2,'operation_id':'synthetic-op-create'},'provenance':{'source_app':'sport','source_namespace':'sport/journal','legacy_ref':'measurements:synthetic-snapshot:occurrence-0','import_batch':'synthetic-batch-A','method':'imported'},'payload':{'date':'2030-01-02','values':{'waist':80,'unknownExtension':0,'unknownNullable':None},'units':{'waist':'cm'}}}},'tombstones':{'synthetic-record-B':{'id':'synthetic-record-B','record_type':'measurement','revision':{'number':4,'operation_id':'synthetic-op-delete'},'prior_record_revision':3,'recovery_ref':'synthetic-checkpoint-B'}},'migration':{'manifest_ref':'synthetic-manifest-A','checkpoint_ref':'synthetic-checkpoint-A','state':'staged'}}
example['operation_receipts']={r['operation_id']:{'request_digest':'synthetic-digest-'+str(r['number']),'result_revision':r['number'],'checkpoint_ref':'synthetic-checkpoint-'+str(r['number'])} for r in [example['profile']['revision']]+[x['revision'] for k in ['records','tombstones'] for x in example[k].values()]}
example['operation_receipts']['synthetic-op-B-create']={'request_digest':'synthetic-digest-3','result_revision':3,'checkpoint_ref':'synthetic-checkpoint-3'}
bootstrap=copy.deepcopy(example)
bootstrap.update(document_revision=1,records={},tombstones={},migration=None)
bootstrap['operation_receipts']={'synthetic-op-profile':copy.deepcopy(example['operation_receipts']['synthetic-op-profile'])}
native=copy.deepcopy(bootstrap)
native['document_revision']=2
native_record=copy.deepcopy(example['records']['synthetic-record-A'])
native_record['provenance']={'source_app':'sport','method':'created','creation_operation_id':'synthetic-op-create'}
native['records']={'synthetic-record-A':native_record}
native['operation_receipts']['synthetic-op-create']=copy.deepcopy(example['operation_receipts']['synthetic-op-create'])
inventory={'synthetic_only':True,'source_count':7,'occurrences':[{'ref':'synthetic-0','classification':'supported','payload':{'date':'2030-01-02','values':{'waist':80}}},{'ref':'synthetic-1','classification':'preserve_extension','payload':{'date':'2030-01-03','values':{'unknown':0,'nullable':None,'outsideOldRange':501,'negative':-1}}},{'ref':'synthetic-2','classification':'quarantine_invalid_calendar','payload':{'date':'2030-02-31','values':{'waist':80}}},{'ref':'synthetic-3','classification':'duplicate_candidate','duplicate_group':'synthetic-group-A','payload':{'date':'2030-01-02','values':{'waist':80}}},{'ref':'synthetic-4','classification':'unowned','payload':{'date':'2030-01-04','values':{'waist':80}}},{'ref':'synthetic-5','classification':'legacy_trash_requires_review','payload':{'date':'2030-01-05','values':{'waist':80}}},{'ref':'synthetic-6','classification':'unsupported_type','payload':{'type':'future.synthetic','content':{'preserve':True}}}]}
legacy_map={'synthetic_only':True,'entries':[
 {'owner':'synthetic-owner-A','source_namespace':'sport/journal','source_collection':'measurements','legacy_id':'synthetic-legacy-1','common_id':'synthetic-measurement-1'},
 {'owner':'synthetic-owner-A','source_namespace':'sport/journal','source_collection':'workouts','legacy_id':'synthetic-legacy-1','common_id':'synthetic-workout-1'}]}
for name,value in [('common-envelope.schema.json',schema),('synthetic-envelope.json',example),('synthetic-inventory.json',inventory),('synthetic-bootstrap.json',bootstrap),('synthetic-native-create.json',native),('synthetic-legacy-map.json',legacy_map)]:
 (P/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
