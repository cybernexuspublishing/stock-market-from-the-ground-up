"""Isolated Chromium test: audit-note HTML injection remains inert DOM text."""
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
script=(R/'assets/js/admin-report-cases-v01424.js').read_text()
guard=r"if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;"
assert guard in script
with sync_playwright() as p:
 binary=which('chromium') or which('google-chrome')
 browser=p.chromium.launch(headless=True,executable_path=binary,args=['--no-sandbox']) if binary else p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':320,'height':800})
 page.set_content('<html><body><main class="admin-panel active" data-admin-panel="community"></main></body></html>')
 page.add_style_tag(content=(R/'assets/css/admin-report-cases-v01424.css').read_text())
 page.evaluate('''() => {
  window.logs=[];
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'valid-staff'}}})}});
  window.fetch=async(url,opts={})=>{
    window.logs.push(String(url));
    if(String(url).includes('/api/admin-report-case-history-v01425')){
      return Response.json({ok:true,history:[{action:'forum.report.case.resolve',from:'open',to:'resolved',note:'<img src=x onerror=window.injection=true>',loggedAt:'2026-10-15T04:10:00Z'}]});
    }
    return Response.json({ok:true,page:1,status:'open',hasMore:false,isOwner:false,cases:[{
      id:88,status:'open',reason:'spam',contentId:'commons:topic:8',details:'Sample report',createdAt:'2026-10-15T04:00:00Z'
    }]});
  };
}''')
 page.add_script_tag(content=script.replace(guard,'/* isolated browser test */'))
 page.get_by_role('button',name='View decision history').wait_for(timeout=7000)
 page.get_by_role('button',name='View decision history').click()
 history=page.locator('.gu-mod-history-v01425')
 history.get_by_text('<img src=x onerror=window.injection=true>').wait_for(timeout=7000)
 assert history.locator('img').count()==0
 assert not page.evaluate('window.injection===true')
 assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'),'320px overflow'
 page.get_by_role('button',name='View decision history').click()
 assert history.is_hidden()
 assert page.evaluate("window.logs.filter(x=>x.includes('admin-report-case-history')).length")==1
 browser.close()
print('PASS v014025: staff audit-history display, inert note markup, no mobile overflow, lazy fetch')
