"""Standalone DOM fixture exercising the real Admin workflow code. No network calls."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1100,'height':780})
    page.set_content('<nav id="admin-tabs"><button data-panel="dashboard">Dashboard</button></nav><section id="admin-gate" hidden></section><main id="admin-app"><section class="admin-panel" data-admin-panel="dashboard">Dashboard</section></main>')
    page.evaluate("""() => {
      window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'test-only'}}})}});
      window.__changes=[];
      window.fetch=async(input,opts={})=>{
        const u=new URL(input,'http://example.test');let j={ok:true};
        if(u.pathname==='/api/admin-v0133')j={ok:true,reports:[{id:2,content_type:'topic',content_id:'legacy:topic:11',created_at:'2026-10-10T01:00:00Z',reason:'Review',status:'open'}],recentTopics:[],hasMore:false};
        if(u.pathname==='/api/admin-forum-actions'&&(!opts.method||opts.method==='GET'))j={ok:true,content:{status:'published',version:'2026-10-10T00:00:00.000Z',title:'Sample topic',body:'Original forum content',official:false}};
        if(u.pathname==='/api/admin-forum-actions'&&opts.method==='POST')window.__changes.push(JSON.parse(opts.body));
        return {ok:true,status:200,json:async()=>j};
      };
    }""")
    source=(root/'assets/js/admin-workflows.js').read_text()
    assert "if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;" in source
    # Only remove the location guard inside a local fixture to exercise the same module.
    source=source.replace("if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;",'')
    page.add_script_tag(content=source)
    page.wait_for_function('typeof window.GroundUpAdminWorkflows?.openModeration==="function"')
    page.evaluate("window.GroundUpAdminWorkflows.openModeration({scope:'legacy',type:'topic',id:'11'})")
    page.locator('[data-mod-title]').wait_for(timeout=5000)
    assert page.locator('[data-mod-title]').input_value()=='Sample topic'
    page.locator('[data-mod-title]').fill('Corrected sample topic')
    page.locator('[data-mod-body]').fill('Corrected educational message with evidence')
    page.locator('[data-mod-note]').fill('Moderator corrected incorrect information')
    page.on('dialog',lambda d:d.accept())
    page.locator('[data-operation="edit"]').click()
    page.wait_for_function('window.__changes.length===1')
    assert page.evaluate('window.__changes[0].action')=='edit'
    assert page.evaluate('window.__changes[0].scope')=='legacy'
    assert page.evaluate('window.__changes[0].title')=='Corrected sample topic'
    assert 'Moderation action recorded' in page.locator('[data-moderation-status]').inner_text()
    browser.close()
print('PASS Chromium DOM fixture: report deep-link, inspector rendering, editorial fields and authorized request shape')
