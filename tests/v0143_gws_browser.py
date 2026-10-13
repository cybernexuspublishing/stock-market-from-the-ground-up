"""GWS owner-private preview/history browser contracts; simulated API, no production network."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'gws-projects.html').read_text()
html=re.sub(r'<script[^>]+></script>','',html)
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width in (390,1440):
        page=browser.new_page(viewport={'width':width,'height':850})
        problems=[]
        page.on('pageerror',lambda e:problems.append(str(e)))
        page.set_content(html)
        page.evaluate('''()=>{
           window.calls=[];window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})}});
           window.fetch=async(url,init={})=>{
             const u=new URL(url,'https://test.local'),body=init.body?JSON.parse(init.body):null;
             if(body)window.calls.push(body);
             let payload={ok:true,projects:[{id:'00000000-0000-4000-8000-000000000001',project_code:'EXAMPLE_SITE',label:'Example Site',revision_number:2,page_title:'<img src=x onerror="window.injected=1">',page_summary:'Private preview',page_blocks:[{type:'heading',text:'Hero'},{type:'paragraph',text:'Client intro'}]}]};
             if(u.searchParams.has('history'))payload={ok:true,revisions:[{revision_number:1,created_at:'2026-10-11T00:00:00Z'},{revision_number:2,created_at:'2026-10-12T00:00:00Z'}]};
             if(body)payload={ok:true,revision:3,notice:'Private draft saved.'};
             return {ok:true,status:200,json:async()=>payload};
           };
        }''')
        page.add_script_tag(content=(ROOT/'assets/js/gws-projects.js').read_text())
        page.wait_for_function("document.querySelectorAll('#gws-projects button').length===1")
        page.locator('#gws-projects button').click()
        assert page.locator('#gws-current').inner_text().find('revision 2')>=0
        page.locator('#gws-preview-toggle').click()
        assert page.locator('#gws-preview').is_visible()
        assert page.locator('#gws-preview img').count()==0,'Untrusted client input inserted as HTML'
        assert page.evaluate('window.injected||0')==0
        page.locator('#gws-history-toggle').click()
        assert page.locator('#gws-history').is_visible()
        assert page.get_by_text('Revision 1',exact=False).count()>0
        page.locator('#gws-form [name=label]').fill('Updated Client Site')
        page.locator('#gws-form button[type=submit]').click()
        page.wait_for_function("window.calls.some(x=>x.action==='save')")
        assert page.evaluate("window.calls.find(x=>x.action==='save').expectedRevision")==2
        assert not problems,problems
        page.close()
    browser.close()
print('PASS GWS private draft preview, escaped content, revision history, CAS save at 390px and 1440px')
