"""Repository-wide file inventory and deterministic static checks; no live-service claims."""
import csv,hashlib,json,re,subprocess,sys,xml.etree.ElementTree as ET
from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).resolve().parents[1]
exclude={'public','.git','node_modules','__pycache__'}
files=sorted(p for p in root.rglob('*') if p.is_file() and not (set(p.relative_to(root).parts)&exclude))
class References(HTMLParser):
 def __init__(self):super().__init__();self.refs=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  for k in ('src','href'):
   if k in d and d[k]:self.refs.append((tag,k,d[k]))
issues=[];rows=[];count={'js':0,'json':0,'html':0,'svg':0,'sql':0,'other':0};refs=0
for p in files:
 rel=p.relative_to(root).as_posix();bs=p.read_bytes();kind=p.suffix.lower();method='inventory';result='PASS'
 try:
  if kind in ('.js','.mjs'):
   count['js']+=1;method='node --check'
   proc=subprocess.run(['node','--check',str(p)],text=True,capture_output=True,timeout=9)
   if proc.returncode:raise ValueError(proc.stderr[-450:])
  elif kind in ('.json','.webmanifest'):
   count['json']+=1;method='JSON parse';json.loads(bs.decode('utf-8'))
  elif kind=='.html':
   count['html']+=1;method='HTML reference validation';x=References();x.feed(bs.decode('utf-8'))
   for tag,key,url in x.refs:
    if url.startswith(('https://','http://','//','#','mailto:','tel:','data:','javascript:')):continue
    local=url.split('?')[0].split('#')[0].lstrip('/')
    if not local:continue
    # relative paths resolve against html parent, root absolute stays at repo root
    target=(root/local if url.startswith('/') else p.parent/local)
    # Friendly routes /p/ are Cloudflare routes; no filesystem requirement
    if url.startswith(('/p/','/f/','/api/')):continue
    if (target.suffix or tag in ('script','img','link')) and not target.is_file():issues.append((rel,'missing_html_reference',url))
    refs+=1
  elif kind=='.svg':
   count['svg']+=1;method='SVG XML parse';ET.fromstring(bs)
  elif kind=='.sql':count['sql']+=1;method='migration source retained, not executed'
  else:count['other']+=1
 except Exception as e:
  result='FAIL';issues.append((rel,method,str(e)))
 rows.append([rel,len(bs),hashlib.sha256(bs).hexdigest(),method,result])
with (root/'docs/RELEASE_FILE_AUDIT.csv').open('w',newline='',encoding='utf8') as f:
 w=csv.writer(f);w.writerow(['path','bytes','sha256','method','result']);w.writerows(rows)
with (root/'docs/RELEASE_AUDIT_FAILURES.csv').open('w',newline='',encoding='utf8') as f:
 w=csv.writer(f);w.writerow(['path','check','detail']);w.writerows(issues)
labs=json.loads((root/'lab-catalog.json').read_text())['labs'];ids=[x['lab_id'] for x in labs]
if len(ids)!=419 or len(set(ids))!=len(ids):issues.append(('lab-catalog.json','identifier-preservation',f'{len(ids)} unique {len(set(ids))}'))
for p in ['assets/js/navigation.js','assets/js/admin-workflows.js','assets/js/page-composer.js','assets/js/form-composer.js','assets/js/lab-narrative.js','functions/api/commons-report.js','functions/api/admin-v0133.js','functions/p/[slug].js']:
 if not (root/p).exists():issues.append((p,'required_release_file','missing'))
print(f"Audited {len(files)} files; {count}; checked {refs} referenced HTML assets; Lab IDs {len(ids)} unique; issues={len(issues)}")
for x in issues[:22]:print('FAIL:',x)
if issues:sys.exit(1)
