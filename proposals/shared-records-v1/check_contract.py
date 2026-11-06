"""Offline proposal validation, not production sync or migration tests."""
import copy,json
from pathlib import Path
from jsonschema import Draft202012Validator
P=Path(__file__).parent
schema=json.loads((P/'common-envelope.schema.json').read_text())
base=json.loads((P/'synthetic-envelope.json').read_text())
Draft202012Validator.check_schema(schema)
v=Draft202012Validator(schema)
def check(doc):
 v.validate(doc)
 assert not (set(doc['records']) & set(doc['tombstones'])), 'live/tombstone overlap'
 for kind in ['records','tombstones']:
  for key,r in doc[kind].items():
   assert key==r['id'],'ID mismatch'
   assert r['revision']['number']<=doc['document_revision'],'future revision'
   if kind=='records':
    assert r['source_app']==r['provenance']['source_app'], 'provenance app mismatch'
    if r['provenance']['method']=='created':
     creation=doc['operation_receipts'].get(r['provenance']['creation_operation_id'])
     assert creation and creation['result_revision']<=r['revision']['number'], 'missing/future creation receipt'
   if kind=='tombstones': assert r['prior_record_revision']<r['revision']['number'],'invalid deletion order'
 assert doc['profile']['revision']['number']<=doc['document_revision']
 # One accepted command targets one profile or one record, including delete/restore.
 revisions=[doc['profile']['revision']]+[r['revision'] for k in ['records','tombstones'] for r in doc[k].values()]
 assert len({r['operation_id'] for r in revisions})==len(revisions),'operation reused across example mutations'
 for r in revisions:
  receipt=doc['operation_receipts'].get(r['operation_id'])
  assert receipt and receipt['result_revision']==r['number'],'missing or inconsistent receipt'
 result_revisions=[r['result_revision'] for r in doc['operation_receipts'].values()]
 assert len(result_revisions)==len(set(result_revisions)), 'different operations share global revision'
 for receipt in doc['operation_receipts'].values():
  assert receipt['result_revision']<=doc['document_revision'],'future operation receipt'
check(base)
count=1
for filename in ['synthetic-bootstrap.json','synthetic-native-create.json']:
 check(json.loads((P/filename).read_text()));count+=1
def rejects(mutator,source=base):
 global count
 d=copy.deepcopy(source);mutator(d)
 try: check(d)
 except Exception: count+=1;return
 raise AssertionError('Invalid synthetic envelope was accepted')
rejects(lambda d:d.update(schema_version=2))
rejects(lambda d:d.update(authority_epoch=0))
rejects(lambda d:d['records']['synthetic-record-A'].update(id='different'))
rejects(lambda d:d['records']['synthetic-record-A']['revision'].update(number=9))
rejects(lambda d:d['tombstones']['synthetic-record-B'].update(prior_record_revision=4))
rejects(lambda d:d['profile'].update(password='synthetic-disallowed-field'))
rejects(lambda d:d['profile']['preferences'].update(display_name='duplicated-authority'))
rejects(lambda d:d['profile']['revision'].update(operation_id='synthetic-op-create'))
def overlap(d):
 t=copy.deepcopy(d['tombstones']['synthetic-record-B']);t['id']='synthetic-record-A';d['tombstones']['synthetic-record-A']=t
rejects(overlap)
rejects(lambda d:d['operation_receipts'].pop('synthetic-op-create'))
rejects(lambda d:d['operation_receipts']['synthetic-op-create'].update(result_revision=99))
rejects(lambda d:d['operation_receipts'].update({'synthetic-different-operation':{'request_digest':'synthetic-different','result_revision':2,'checkpoint_ref':'synthetic-checkpoint-X'}}))
rejects(lambda d:d['records']['synthetic-record-A']['provenance'].pop('legacy_ref'))
rejects(lambda d:d['records']['synthetic-record-A']['provenance'].pop('import_batch'))
rejects(lambda d:d['records']['synthetic-record-A']['provenance'].update(method='restored'))
native=json.loads((P/'synthetic-native-create.json').read_text())
rejects(lambda d:d['records']['synthetic-record-A']['provenance'].pop('creation_operation_id'),native)
rejects(lambda d:d['records']['synthetic-record-A']['provenance'].update(import_batch='invented-import'),native)
rejects(lambda d:d.update(migration={'state':'active'}),native)
rejects(lambda d:d['records']['synthetic-record-A']['provenance'].update(creation_operation_id='nonexistent'),native)
rejects(lambda d:d['records']['synthetic-record-A']['provenance'].update(source_app='meal'),native)
# Unknown measurement extensions round-trip without fabricated range/type filtering.
x=json.loads(json.dumps(base))
assert x['records']['synthetic-record-A']['payload']['values']==base['records']['synthetic-record-A']['payload']['values'];count+=1
inv=json.loads((P/'synthetic-inventory.json').read_text())
assert inv['source_count']==len(inv['occurrences'])==len({o['ref'] for o in inv['occurrences']});count+=1
assert next(o for o in inv['occurrences'] if o['ref']=='synthetic-2')['payload']['date']=='2030-02-31';count+=1
assert inv['occurrences'][0]['payload']==inv['occurrences'][3]['payload'] and inv['occurrences'][0]['ref']!=inv['occurrences'][3]['ref'];count+=1
legacy_map=json.loads((P/'synthetic-legacy-map.json').read_text())['entries']
def legacy_key(item):
 return tuple(item[k] for k in ['owner','source_namespace','source_collection','legacy_id'])
assert legacy_map[0]['legacy_id']==legacy_map[1]['legacy_id']
assert len({legacy_key(item):item['common_id'] for item in legacy_map})==2
assert len({item['common_id'] for item in legacy_map})==2;count+=1
result={'proposal_checks_passed':count,'network_calls':0,'scope':'JSON Schema and listed semantic invariants on synthetic fixtures only','not_tested':['production adapters','CAS transport','server fencing','encryption','live RLS','migration','devices','full Meal source']}
(P/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
