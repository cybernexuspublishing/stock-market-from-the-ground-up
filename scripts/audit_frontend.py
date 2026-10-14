#!/usr/bin/env python3
"""Read-only cross-page local frontend scan. Doesn't claim live/provider verification."""
import argparse,json,re,subprocess,collections,pathlib,sys
from bs4 import BeautifulSoup
root=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else pathlib.Path.cwd()
output=pathlib.Path(sys.argv[2]).resolve() if len(sys.argv)>2 else None
pages=sorted(f for f in root.rglob('*.html') if 'public' not in f.relative_to(root).parts and 'tests' not in f.relative_to(root).parts)
js=sorted(f for f in root.rglob('*.js') if 'public' not in f.relative_to(root).parts and 'tests' not in f.relative_to(root).parts and 'node_modules' not in f.relative_to(root).parts)
css=sorted(f for f in root.rglob('*.css') if 'public' not in f.relative_to(root).parts and 'tests' not in f.relative_to(root).parts)
result={'root':str(root),'counts':{'html':len(pages),'js':len(js),'css':len(css)},'issues':[],'checks':{}}
issues=result['issues']
def issue(sev,category,path,details):issues.append({'severity':sev,'category':category,'file':str(path.relative_to(root)) if path.is_relative_to(root) else str(path),'details':details})
jsErrors=[]
for f in js:
    is_module='functions' in f.relative_to(root).parts
    p=subprocess.run(['node','--input-type=module','--check'],input=f.read_text(encoding='utf-8',errors='replace'),capture_output=True,text=True) if is_module else subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
    if p.returncode: issue('P0','JS syntax',f,p.stderr[-400:]);jsErrors.append(str(f))
result['checks']['node_check']={'checked':len(js),'failed':len(jsErrors)}
external=set();referenced=[];duplicates=0;noLang=0
for f in pages:
    soup=BeautifulSoup(f.read_text(encoding='utf-8',errors='replace'),'html.parser')
    ids=[e.get('id') for e in soup.select('[id]')];counts=collections.Counter(ids)
    for id,count in counts.items():
        if count>1:duplicates+=1;issue('P1','duplicate id',f,f'#{id} occurs {count} times')
    if not soup.html or not soup.html.get('lang'):noLang+=1;issue('P1','language',f,'Missing html lang')
    for e in soup.select('script[src],link[href],img[src]'):
        attrib='href' if e.has_attr('href') else 'src';val=e.get(attrib,'').strip()
        if val.startswith(('https://','http://','//')):external.add(val);continue
        if val.startswith(('data:','#','mailto:','tel:','javascript:')) or not val:continue
        path=val.split('?')[0].split('#')[0]
        if path.startswith('/'):local=(root/path.lstrip('/'))
        else:local=f.parent/path
        referenced.append((f.name,val))
        if not local.is_file():issue('P1','missing asset',f,f'{attrib}={val}: not present')
    for e in soup.select('a[href]'):
        val=e.get('href','').strip();q=val.split('?')[0].split('#')[0]
        if not q.endswith('.html') or q.startswith(('http:','https:','//')):continue
        target=(root/q.lstrip('/')) if q.startswith('/') else f.parent/q
        if not target.is_file():issue('P2','missing page',f,f'href={val}')
    for e in soup.select('input:not([type=hidden]):not([type=submit]):not([type=button])'):
        if e.get('aria-label') or e.get('aria-labelledby') or (e.get('id') and soup.select_one('label[for="'+e['id']+'"]')) or e.find_parent('label'):continue
        # May use script-generated label; needs manual review, not automatically a failure.
        if e.get('type') not in ('checkbox','radio'):issue('REVIEW','unlabeled input',f,f'input id={e.get("id") or "(none)"}')
    for node in soup.select('button[onclick],a[onclick],form[onsubmit]'):
        issue('REVIEW','inline event handler',f,node.name+' '+(node.get('onclick') or node.get('onsubmit') or '')[:90])
result['checks'].update({'pages_scanned':len(pages),'css_count':len(css),'duplicate_ids':duplicates,'missing_lang_pages':noLang,'asset_refs':len(referenced),'third_party_refs':len(external)})
result['severity_totals']=dict(collections.Counter(i['severity'] for i in issues))
result['category_totals']=dict(collections.Counter(i['category'] for i in issues))
if output:output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(result,indent=2))
print(json.dumps({'counts':result['counts'],'checks':result['checks'],'severity_totals':result['severity_totals'],'category_totals':result['category_totals']},indent=2))
