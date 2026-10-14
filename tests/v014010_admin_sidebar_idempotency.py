"""Browser regression: later module watchdogs must not repopulate sidebar repeatedly."""
from pathlib import Path
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1]
html='''<!doctype html><html lang="en"><body>
<aside class="admin-sidebar"><nav id="admin-tabs">
<div class="v13-admin-group" id="original-admin-group"><div class="v13-admin-group-title">Original</div>
<button data-panel="dashboard">Dashboard</button><button data-panel="community">Market Commons</button>
</div></nav></aside>
<div id="admin-gate" hidden></div><main id="admin-app"><section class="admin-panel active">Dashboard</section></main>
</body></html>'''
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page()
    errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(html)
    page.evaluate('''() => {
      window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'valid-test-token'}}})}});
      window.fetch=async()=>new Response(JSON.stringify({ok:true,items:[]}),{status:200,headers:{'content-type':'application/json'}});
    }''')
    src=(r/'assets/js/admin-navigation.js').read_text().replace("if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;",'if(false)return;')
    page.add_script_tag(content=src)
    page.locator('#cc-control-manager').wait_for(timeout=10000)
    # Simulate real older Operations module, which checks its mount marker every tick.
    page.evaluate('''() => {
       window.__mountAttempts=0; window.__eventCount=0;
       window.__watchdog=setInterval(()=>{
         if(document.getElementById('v135-unified-operations'))return;
         window.__mountAttempts++;
         const g=document.createElement('div');g.id='v135-unified-operations';g.className='v13-admin-group';
         g.innerHTML='<div class="v13-admin-group-title">Learning Operations</div>';
         for(const [code,label] of [['cases','Competency Cases'],['features','Feature Inventory'],['labs','Lab Registry']]){
            const b=document.createElement('button');b.textContent=label;b.dataset.v135Control=code;
            b.addEventListener('click',()=>{window.__eventCount++;}); g.append(b);
         }
         document.getElementById('admin-tabs').append(g);
       },55);
    }''')
    page.wait_for_timeout(2400)
    for code in ('cases','features','labs'):
        assert page.locator(f'#admin-tabs button[data-v135-control="{code}"]').count()==1,code
    assert page.locator('#v135-unified-operations').count()==1
    assert page.evaluate('window.__mountAttempts')==1,page.evaluate('window.__mountAttempts')
    # A legacy routine sometimes injects the exact same action a second time.
    page.evaluate('''() => {const b=document.createElement('button');b.textContent='Competency Cases';b.dataset.v135Control='cases';document.getElementById('admin-tabs').append(b)}''')
    page.wait_for_timeout(400)
    assert page.locator('#admin-tabs button[data-v135-control="cases"]').count()==1
    page.locator('#admin-tabs button[data-v135-control="cases"]').click()
    assert page.evaluate('window.__eventCount')==1,'original action listener was lost'
    # Control registry contains each installed action exactly once.
    page.locator('#cc-control-manager').click()
    for code in ('cases','features','labs'):
        assert page.locator(f'#cc-control-list .cc-control-row[data-key="builtin:v135Control-{code}"]').count()==1
    page.evaluate('clearInterval(window.__watchdog)')
    assert not errors,errors
    browser.close()
print('PASS: module marker preserved, no re-mounts/duplicate controls, original handler intact, manager inventory deduplicated')
