#!/usr/bin/env python3
"""Fast source-level and package-level release safety checks (no Supabase network)."""
from pathlib import Path
from html.parser import HTMLParser
import json,subprocess,re,hashlib,sys,os
ROOT=Path(__file__).resolve().parents[1]
files=[p for p in ROOT.rglob('*') if p.is_file() and not str(p.relative_to(ROOT)).startswith('public/')]
errors=[]
class References(HTMLParser):
 def __init__(self):super().__init__();self.paths=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  for key in ('src','href'):
   if tag not in (('script' if key=='src' else 'link'),('img' if key=='src' else 'link')):continue
   v=a.get(key,'')
   if v:self.paths.append(v)
js=[p for p in files if p.suffix in ('.js','.mjs')]
for p in js:
 if subprocess.run(['node','--check',str(p)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=12).returncode:errors.append('JS syntax '+str(p.relative_to(ROOT)))
for p in files:
 if p.suffix in ('.json','.webmanifest'):
  try:json.loads(p.read_text())
  except Exception as e:errors.append('JSON '+str(p.relative_to(ROOT))+': '+str(e))
 if p.suffix=='.html':
  try:
   h=References();h.feed(p.read_text())
   for src in h.paths:
    if not src or src.startswith(('http:','https:','data:','mailto:','#','javascript:','//')):continue
    dest=src.split('?',1)[0].split('#',1)[0]
    path=ROOT/dest.lstrip('/') if dest.startswith('/') else p.parent/dest
    if path.is_file() is False:errors.append('Missing HTML resource '+str(p.relative_to(ROOT))+': '+src)
  except Exception as e:errors.append('HTML parse '+str(p.relative_to(ROOT))+': '+str(e))
catalog=json.loads((ROOT/'lab-catalog.json').read_text());ids=[x['id'] if 'id' in x else x['lab_id'] for x in catalog['labs']]
assert len(ids)==419 and len(set(ids))==419, 'Historical Lab ID count/uniqueness violation'
assert 'lab_instruction_v014' in (ROOT/'functions/api/lab-content.js').read_text()
assert not (ROOT/'data/interactive-labs.json').exists(), 'Private authored labs still publicly stored'
assert (ROOT/'data/interactive-lab-index.json').exists()
assert not any(p.name=='interactive-labs.js' for p in ROOT.rglob('*')), 'Full protected book instructions stored in public source'
assert all((ROOT/p).exists() for p in ['functions/api/plan-controls.js','functions/api/member-tool-access.js','functions/api/interactive-training.js','functions/api/gws-projects.js','functions/api/commons-report.js','functions/api/training-editor.js','supabase/migrations/v0.14.0.0_OWNER_PLANS_AND_INTERACTIVE_TRAINING.sql'])
for target,needle in [('functions/api/marketdata.js','toolAccess(env,request'),('assets/js/simulator.js','member-tool-access?tool=MARKET_SIMULATOR'),('assets/js/lab-player.js','/api/lab-content?id='),('functions/api/interactive-training.js','publicState'),('functions/api/home-member-stats-v01353.js','Date.now()-60*60000'),('functions/api/commons-report.js','rpc/v014_community_report')]:
 if needle not in (ROOT/target).read_text():errors.append('Missing required integration '+target)
manifest=json.loads((ROOT/'PROJECT_MANIFEST.json').read_text());print('manifest version:',manifest.get('version'))
print('files:',len(files),'javascript:',len(js),'html:',len([x for x in files if x.suffix=='.html']),'sql:',len([x for x in files if x.suffix=='.sql']),'lab ids:',len(ids))
if errors:
 for x in errors[:50]:print('FAILED',x)
 raise SystemExit(f'{len(errors)} release checks failed')
print('PASS: parse, references, private Lab content, versioned exercises, 60m activity, simulator server gate, forum atomic RPC integration')
