"""v0.14.0.24 isolated, mocked Chromium test; NO live data or Supabase calls."""
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
script=(R/'assets/js/admin-report-cases-v01424.js').read_text()
guard="if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;"
assert guard in script
with sync_playwright() as p:
 binary=which('chromium') or which('google-chrome')
 browser=p.chromium.launch(headless=True,executable_path=binary,args=['--no-sandbox']) if binary else p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':320,'height':800})
 page.set_content('<html><body><main class="admin-panel active" data-admin-panel="community"></main></body></html>')
 page.add_style_tag(content=(R/'assets/css/admin-report-cases-v01424.css').read_text())
 page.evaluate('''() => {
    window.fetchLog=[];window.serverStatus='open';
    window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'owner-jwt'}}})}});
    window.fetch=async(url,opts={})=>{
      const method=opts.method||'GET';window.fetchLog.push({url:String(url),method,body:opts.body});
      if(method==='POST'){
        const request=JSON.parse(opts.body);
        if(request.note.length<10)throw new Error('Missing decision reason');
        if(request.expectedStatus!=='open')return new Response(JSON.stringify({ok:false,error:'Stale report'}),{status:409});
        window.serverStatus='reviewing';
        return Response.json({ok:true,id:8,status:'reviewing',previousStatus:'open',audited:true});
      }
      return Response.json({ok:true,page:1,status:'open',hasMore:false,isOwner:true,cases:
        window.serverStatus==='open'?[{id:8,status:'open',reason:'spam',
           contentId:'commons:topic:15',details:'<img src=x onerror=window.bad=true>',createdAt:'2026-10-15T14:00:00Z'}]:[]});
    };
 }''')
 page.add_script_tag(content=script.replace(guard,'/* route guard bypass in isolated test */'))
 page.locator('#gu-mod-cases-v01424 .gu-mod-case').wait_for(timeout=7000)
 assert page.locator('#gu-mod-cases-v01424 img').count()==0,'Untrusted report details must not become HTML'
 assert '<img' in page.locator('#gu-mod-cases-v01424 .gu-mod-detail').inner_text()
 page.get_by_role('button',name='Start review').click()
 assert 'at least 10' in page.locator('#gu-mod-cases-v01424 .gu-mod-status').inner_text()
 assert page.evaluate('window.fetchLog.filter(x=>x.method==="POST").length')==0
 page.locator('#gu-mod-cases-v01424 textarea').fill('Reviewed spam evidence; inspect topic.')
 page.get_by_role('button',name='Start review').click()
 page.wait_for_function('window.fetchLog.filter(x=>x.method==="POST").length===1',timeout=5000)
 page.wait_for_function('document.querySelector("#gu-mod-cases-v01424 .gu-mod-status")?.textContent.includes("No reports") || document.querySelector("#gu-mod-cases-v01424 .gu-mod-list")?.textContent.includes("No reports")',timeout=5000)
 assert page.evaluate('window.fetchLog.filter(x=>x.method==="POST").length')==1,'Must never submit twice automatically'
 assert not page.evaluate('window.bad===true')
 assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'),'320px horizontal overflow'
 browser.close()
print('PASS v01424: mock Chromium moderation case UI, no HTML injection, required reason, one persisted transition, 320px layout.')
