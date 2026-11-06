#!/usr/bin/env python3
"""Deterministically convert the complete official SR Legacy April 2018 JSON snapshot.
Run: python scripts/build-usda.py --archive /path/to/sr-legacy.zip
No API key; no historical diary changes. Python standard library only.
"""
import argparse, hashlib, json, math, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
URL = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip'
# Only compatible definitions. Absent, ambiguous and non-equivalent fields stay absent.
MAP = {1003:'prot',1004:'fat',1008:'kcal',1009:'sta',1010:'suc',1011:'glc',1012:'fru',1013:'lac',1014:'mal',1018:'alc',1051:'water',1075:'gal',1079:'fib',1087:'ca',1089:'fe',1090:'mg',1091:'p',1092:'k',1093:'na',1095:'zn',1098:'cu',1099:'fl',1101:'mn',1107:'bcar',1114:'vD',1162:'vC',1165:'b1',1166:'b2',1167:'b3',1170:'b5',1175:'b6',1177:'b9',1178:'b12',1210:'trp',1211:'thr',1212:'ile',1213:'leu',1214:'lys',1215:'met_',1217:'phe_',1218:'tyr_',1219:'val',1220:'arg',1221:'his',1222:'ala',1223:'asp',1224:'glu',1225:'gly',1226:'pro',1227:'ser',1253:'chol',1258:'sfa',1272:'dha',1278:'epa',1280:'dpa',1292:'mufa',1293:'pufa',1316:'la',1404:'ala3',2000:'sug'}
FACTORS={1099:0.001,1107:0.001,1272:1000,1278:1000,1280:1000}
# Curated translation by exact NDB number, not loose name substitution.
RU = {
2001:('Перец душистый, молотый','душистый перец молотый allspice'),
2002:('Анис, семена','анис анисовые семена'),2003:('Базилик сушёный','базилик сушеный'),
2004:('Лавровый лист','лавровый лист лаврушка'),2005:('Тмин, семена','тмин семена caraway'),
2006:('Кардамон','кардамон'),2007:('Сельдерей, семена','семена сельдерея'),
2008:('Кервель сушёный','кервель сушеный'),2009:('Приправа чили — смесь специй','chili powder приправа смесь специй чили'),
2010:('Корица молотая','корица молотая'),2011:('Гвоздика молотая','гвоздика молотая'),
2012:('Кинза сушёная (листья кориандра)','кинза сушеная листья кориандра'),
2013:('Кориандр, семена','кориандр семена кориандра'),2014:('Кумин (зира), семена','кумин зира семена'),
2015:('Карри, порошок','карри приправа смесь curry powder'),2016:('Укроп, семена','семена укропа'),
2017:('Укроп сушёный','укроп сушеный сушеная зелень укропа'),2018:('Фенхель, семена','семена фенхеля'),
2019:('Пажитник, семена','пажитник фенугрек шамбала семена'),2020:('Чесночный порошок','чеснок сушеный молотый чесночный порошок'),
2021:('Имбирь молотый','имбирь сушеный молотый порошок'),2022:('Мацис (мускатный цвет), молотый','мацис мускатный цвет молотый'),
2023:('Майоран сушёный','майоран сушеный'),2024:('Горчичное семя, молотое','горчица горчичный порошок молотые семена'),
2025:('Мускатный орех, молотый','мускатный орех молотый'),2026:('Луковый порошок','лук сушеный молотый луковый порошок'),
2027:('Орегано сушёный','орегано душица сушеная сушеный'),2028:('Паприка — специя','паприка молотая порошок паприки сушеная paprika'),
2029:('Петрушка сушёная','петрушка сушеная'),2030:('Перец чёрный — специя','черный чёрный перец молотый ground black pepper'),
2031:('Перец красный острый или кайенский — специя','перец красный острый кайенский молотый chili cayenne hot pepper'),
2032:('Перец белый — специя','белый перец молотый white pepper'),2033:('Мак, семена','мак семена мака'),
2034:('Приправа для птицы','смесь специй приправа для птицы'),2035:('Приправа для тыквенного пирога','смесь специй тыквенный пирог'),
2036:('Розмарин сушёный','розмарин сушеный'),2037:('Шафран','шафран'),
2038:('Шалфей молотый','шалфей сушеный молотый'),2039:('Чабер молотый','чабер молотый'),
2041:('Эстрагон сушёный','эстрагон тархун сушеный'),2042:('Тимьян сушёный','тимьян чабрец сушеный'),
2043:('Куркума молотая','куркума молотая'),2045:('Укроп свежий','укроп свежий укропа'),
2049:('Тимьян свежий','тимьян чабрец свежий'),2063:('Розмарин свежий','розмарин свежий'),
2065:('Мята колосистая, свежая','мята мяты свежая spearmint'),
11165:('Кинза свежая (листья кориандра)','кинза свежая кориандр листья'),
6170:('Бульон говяжий домашний','бульон говяжий домашний stock beef')}
LEGACY={'dil':'usda:172233','mnt':'usda:173475','cil':'usda:169997','ros':'usda:173473','thy':'usda:173470','ore':'usda:171328','tar':'usda:170937','sag':'usda:170935'}
# bbf is intentionally NOT an exact alias: old app says bone broth / fat removed;
# source only specifies beef home-prepared stock, without those qualifiers.
NOTES={
'carb':'Not mapped: carbohydrate by difference includes fibre; retained as prop:usda:1005. Not equivalent to BLS available carbohydrate. No fibre subtraction inferred.',
'vA':'Not mapped: Vitamin A RAE and IU are retained separately; not BLS retinol equivalents.',
'vE':'Not mapped: alpha-tocopherol retained separately; not vitamin E equivalents.',
'vK':'Phylloquinone, menaquinone-4 and dihydrophylloquinone retained separately, not presented as total K.',
'b9':'Total folate (1177), not dietary folate equivalents (1190). Food folate and folic acid remain separate.',
'b3':'Niacin, not niacin equivalents.',
'cys_':'Cystine (1216) is not silently relabelled cysteine.',
'fattyAcids':'Only explicit n-6 linoleic and n-3 ALA mapped. Unspecified 18:2/18:3 retained separately. No omega-3/omega-6 totals synthesized.',
'units':'EPA/DPA/DHA g to mg; fluoride and beta-carotene micrograms to mg. All original USDA units/values retained.',
'zero':'Explicit numeric zero retained. Missing amount never synthesized as zero.',
'language':'English descriptions original. Russian translations and aliases limited to 49 curated records; all remaining descriptions stay English.',
'portions':'USDA gramWeight applies to the stated amount and modifier, not necessarily one unit. No guessed household portion weights.',
'legacy':'Known exact generic herb matches are supplied only to de-duplicate new search. No mutation or migration of historic IDs/snapshots. bbf is not an exact match.'}

def main():
 p=argparse.ArgumentParser();p.add_argument('--archive',type=Path,required=True);p.add_argument('--output',type=Path,default=ROOT/'meal-data/usda-sr-legacy.json');a=p.parse_args()
 blob=a.archive.read_bytes(); sha=hashlib.sha256(blob).hexdigest()
 assert sha=='0fe8ae486a2c8eb42cb96413f058deb51863a46c8fb8eeb4b1fb45006dd338ef', 'Archive changed: review official release before updating pinned hash'
 with zipfile.ZipFile(a.archive) as z:
  names=[n for n in z.namelist() if n.endswith('.json')];assert len(names)==1
  raw=z.read(names[0]); records=json.loads(raw)['SRLegacyFoods']
 assert len(records)==7793, 'Unexpected release/record count; audit before updating'
 definitions={};foods=[]
 for f in sorted(records,key=lambda x:x['fdcId']):
  assert f['dataType']=='SR Legacy'
  fid=f['fdcId']; nd=int(f['ndbNumber']); names={'en':f['description']}; aliases=[]
  if nd in RU: names['ru']=RU[nd][0];aliases=[RU[nd][1]]
  nut={};source_nutrients={}
  for item in f['foodNutrients']:
   n=item['nutrient'];i=n['id'];amount=item.get('amount');factor=FACTORS.get(i,1)
   definitions[str(i)]={'id':i,'number':n['number'],'name':n['name'],'unit':n['unitName'],'key':MAP.get(i,'prop:usda:'+str(i)),'factor':factor,'standard':i in MAP}
   if not isinstance(amount,(float,int)) or not math.isfinite(amount):continue
   assert str(i) not in source_nutrients, (fid,i)
   source_nutrients[str(i)]=amount
   if i in MAP:nut[MAP[i]]=round(amount*factor,9)
  portions=[]
  for x in f.get('foodPortions',[]):
   if isinstance(x.get('gramWeight'),(int,float)) and x['gramWeight']>0:
    portions.append({k:x[k] for k in ['id','amount','modifier','gramWeight','measureUnit','portionDescription'] if k in x})
  foods.append({'id':'usda:'+str(fid),'code':str(fid),'fdcId':fid,'ndbNumber':nd,'names':names,'aliases':aliases,'nut':nut,'sourceNutrients':source_nutrients,'portions':portions,'sourceUrl':f'https://fdc.nal.usda.gov/food-details/{fid}/nutrients','publicationDate':f.get('publicationDate'),'category':f.get('foodCategory',{}).get('description','')})
 assert len({f['id'] for f in foods})==7793
 assert sum(len(f['sourceNutrients']) for f in foods)==644125
 assert sum(len(f['portions']) for f in foods)==14449
 assert len(definitions)==149
 for f in foods:
  assert not {'carb','vA','vE','vK','cys_','n3','n6'} & f['nut'].keys()
 by_id={f['fdcId']:f for f in foods}
 assert by_id[171329]['nut']['kcal']==282
 assert by_id[171329]['nut']['bcar']==26.2
 assert by_id[170931]['nut']['fl']==0.0342
 assert by_id[171319]['sourceNutrients']['1093']==2870
 assert by_id[170932]['sourceNutrients']['1093']==30
 for f in foods:
  if f['ndbNumber'] in (23424,23425):
   assert f['sourceNutrients']['1101']=={23424:0.328,23425:0.299}[f['ndbNumber']]
 translated=sum('ru' in f['names'] for f in foods);NOTES['language']=NOTES['language'].replace('49',str(translated))
 out={'version':1,'basisGrams':100,'source':{'id':'USDA','dataType':'SR Legacy','edition':'USDA FoodData Central — SR Legacy, final release April 2018','releaseDate':'2018-04','fdcPublicationDate':'2019-04-01','revision':20180401,'retrievedOn':'2026-11-01','url':'https://fdc.nal.usda.gov/download-datasets/','downloadUrl':URL,'archiveSha256':sha,'jsonSha256':hashlib.sha256(raw).hexdigest(),'license':'CC0-1.0','termsUrl':'https://fdc.nal.usda.gov/api-guide/#licensing','attribution':'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central. SR Legacy, final release April 2018; FDC publication 2019. Field mapping and selected Russian translations: Happy Meal.','recordCount':len(foods),'translatedRecordCount':translated},'nutrientDefinitions':dict(sorted(definitions.items(),key=lambda x:int(x[0]))),'mappingNotes':NOTES,'legacySearchReplacements':LEGACY,'foods':foods}
 a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
 print(json.dumps({'records':len(foods),'nutrients':len(definitions),'translated':translated,'bytes':a.output.stat().st_size,'archiveSha256':sha}))
if __name__=='__main__':main()
