#!/usr/bin/env python3
"""Deterministic source/reference inventory. Does not claim runtime Supabase correctness."""
from pathlib import Path
from html.parser import HTMLParser
import csv, hashlib, json, re, subprocess, sys, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
OMIT={'public','.git','node_modules','__pycache__'}
files=sorted(p for p in ROOT.rglob('*') if p.is_file() and not OMIT.intersection(p.relative_to(ROOT).parts) and not p.name.startswith("v0.14.0.13_") and p.name not in {"RELEASE_FILE_AUDIT.csv","RELEASE_AUDIT_FAILURES.csv"})
paths={p.relative_to(ROOT).as_posix() for p in files}
class Refs(HTMLParser):
 def __init__(self):super().__init__();self.refs=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if t in ('script','img','link','a'):
   for key in ('src','href'):
    if d.get(key):self.refs.append((t,key,d[key]))
issues=[];lines=[];js=0;html=0;svg=0;jsonfiles=0;checked_refs=0;apis=set();sources=[]
for p in files:
 rel=p.relative_to(ROOT).as_posix()
 data=p.read_bytes();record=[rel,len(data),hashlib.sha256(data).hexdigest(),p.suffix.lower(),'OK'];text=data.decode('utf-8','replace')
 try:
  if p.suffix in ('.js','.mjs'):
   js+=1
   c=subprocess.run(['node','--check',str(p)],capture_output=True,text=True,timeout=15)
   if c.returncode:raise ValueError('JS parse: '+c.stderr[-140:])
   for x in re.findall(r'[\'\"](/api/[A-Za-z0-9_./-]+)',text):
    route=x.split('?')[0].split('#')[0];apis.add((rel,route))
   # Literal JS relative imports, excluding dynamic build-time strings and URL imports.
   for dest in ([] if rel.startswith("tests/") else re.findall(r"\b(?:import\s+(?:[^;'\"]*?\s+from\s+)?|import\s*\(|export\s+[^;'\"]*?\s+from\s+)[\'\"](\.{1,2}/[^'\"]+)[\'\"]",text)):
    path=(p.parent/dest).resolve()
    if not path.exists() and not Path(str(path)+'.js').exists():issues.append([rel,'IMPORT_TARGET_MISSING',dest])
  elif p.suffix=='.html':
   html+=1;h=Refs();h.feed(text)
   for tag,key,url in h.refs:
    if url.startswith(('http:','https:','//','mailto:','tel:','#','data:','javascript:')):continue
    u=url.split('#')[0].split('?')[0];
    if not u:continue
    if u.startswith(('/api/','/f/','/p/')):continue
    target=ROOT/u.lstrip('/') if u.startswith('/') else p.parent/u
    checked_refs+=1
    if target.suffix and not target.is_file():issues.append([rel,'HTML_TARGET_MISSING',url])
  elif p.suffix in ('.json','.webmanifest'):jsonfiles+=1;json.loads(text)
  elif p.suffix=='.svg':svg+=1;ET.fromstring(data)
 except Exception as e:record[-1]='FAIL';issues.append([rel,'PARSE',str(e)[:240]])
 lines.append(record)
# Literal API path references are only a subset (JS template strings and aliases need integration tests).
api_missing=[]
for src,url in sorted(apis):
 if src.startswith("tests/"):continue
 endpoint=url.rstrip('/')
 if (ROOT/('functions/'+endpoint.lstrip('/')+'.js')).exists():continue
 # Directory handlers /api/name route used through path without explicit .js but functions/api/name.js exists.
 api_missing.append([src,'API_TARGET_MISSING',url]);issues.append([src,'API_TARGET_MISSING',url])
# Policy and production markers
if (ROOT/'data/interactive-labs.json').exists():issues.append(['data/interactive-labs.json','PRIVATE_SOURCE_IN_TREE','Do not publish private authored labs'])
m=json.loads((ROOT/'PROJECT_MANIFEST.json').read_text())
if m.get('version')!='0.14.0.13':issues.append(['PROJECT_MANIFEST.json','VERSION_MISMATCH',str(m.get('version'))])
if 'data/interactive-labs.json' not in (ROOT/'.gitignore').read_text():issues.append(['.gitignore','PRIVATE_EXCLUSION_MISSING','Authored data excluded from Git'])
if 'if [[ -e data/interactive-labs.json ]]' not in (ROOT/'scripts/build-pages.sh').read_text():issues.append(['scripts/build-pages.sh','SECURITY_BUILD_GUARD_MISSING','Fail closed if private source exists'])
if 'cp -R -- "data"' in (ROOT/'scripts/build-pages.sh').read_text():issues.append(['scripts/build-pages.sh','BROAD_DATA_COPY','Public data must be explicitly allowlisted'])
labs=json.loads((ROOT/'lab-catalog.json').read_text())['labs'];ids=[x['lab_id'] for x in labs]
if len(ids)!=419 or len(set(ids))!=419:issues.append(['lab-catalog.json','LAB_CATALOG_CONTRACT',f'{len(ids)} ids, {len(set(ids))} unique'])
(ROOT/'docs/v0.14.0.13_FILE_CONNECTIVITY_INVENTORY.csv').write_text('')
for filename,header,records in [
 ('docs/v0.14.0.13_FILE_CONNECTIVITY_INVENTORY.csv',['path','size_bytes','sha256','extension','source_result'],lines),
 ('docs/v0.14.0.13_API_LITERALS.csv',['source_file','referenced_api'],sorted(apis)),
 ('docs/v0.14.0.13_SOURCE_ISSUES.csv',['source','type','details'],issues)]:
 with (ROOT/filename).open('w',newline='',encoding='utf8') as h:w=csv.writer(h);w.writerow(header);w.writerows(records)
print(f'AUDIT {len(files)} files / JS {js} / HTML {html} / JSON {jsonfiles} / SVG {svg} / literal HTML references {checked_refs} / literal API refs {len(apis)} / Labs {len(ids)} / SOURCE ISSUES {len(issues)}')
for row in issues[:25]:print('ISSUE',*row)
if issues:sys.exit(1)
