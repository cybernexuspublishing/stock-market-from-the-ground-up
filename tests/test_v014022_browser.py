"""v0.14.0.22 offline Chromium E2E component checks of post-commit response loss.
These do not exercise real Cloudflare/Supabase; no private keys or DB writes.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    # Preference saving can commit successfully and then lose its network response.
    page=browser.new_page(viewport={'width':360,'height':740})
    page.set_content('''<!doctype html><html><body>
    <div role="tablist"><button data-s="notifications" class="active">Notifications</button></div>
    <div data-settings-body><article class="v13-card"><div class="v132-setting-list"><label>Old checkbox<input checked></label></div></article></div>
    <script>
    window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock-member-jwt'}}})}});
    window.confirmedServer=false;window.postCount=0;window.getCount=0;
    window.fetch=async(_url,opts={})=>{
      if(opts.method==='POST'){postCount++;confirmedServer=JSON.parse(opts.body).subscribedRepliesEnabled;throw new Error('POST response lost after DB commit')}
      getCount++;return new Response(JSON.stringify({ok:true,preferences:{subscribedRepliesEnabled:confirmedServer}}),{status:200});
    };
    </script></body></html>''')
    script=(ROOT/'assets/js/member-notification-preferences-v01421.js').read_text().replace('location.pathname',"'/dashboard.html'")
    page.add_script_tag(content=script)
    box=page.locator('[data-gu-v01421-preferences] input[type=checkbox]')
    box.wait_for(state='visible');page.wait_for_function("document.querySelector('[data-gu-v01421-preferences] input').disabled===false")
    assert not box.is_checked()
    box.check()
    page.wait_for_function("document.querySelector('.gu-pref-status').textContent.includes('server confirms')")
    assert box.is_checked()
    assert page.evaluate('postCount')==1
    assert page.evaluate('getCount')>=2
    page.close()

    # Same dropped-response condition for per-topic Follow/Unfollow.
    page=browser.new_page(viewport={'width':320,'height':720})
    page.set_content('''<!doctype html><html><body><div id="v13-commons" class="v13-topic-detail"><article data-forum-content="topic">A discussion</article></div>
    <script>
    window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock-member-jwt'}}})}});
    window.serverFollow=false;window.postCount=0;window.getCount=0;
    window.fetch=async(_url,opts={})=>{
      if(opts.method==='POST'){postCount++;serverFollow=JSON.parse(opts.body).subscribe;throw new Error('Response interrupted AFTER write')}
      getCount++;return new Response(JSON.stringify({ok:true,available:true,subscribed:serverFollow}),{status:200});
    };
    </script></body></html>''')
    script=(ROOT/'assets/js/commons-follow-v01421.js').read_text().replace('location.pathname',"'/market-commons.html'").replace('location.search',"'?topic=13'")
    page.add_script_tag(content=script)
    page.get_by_role('button',name='Follow discussion').wait_for()
    page.get_by_role('button',name='Follow discussion').click()
    page.get_by_role('button',name='Unfollow discussion').wait_for()
    page.wait_for_function("document.querySelector('.gu-follow-status').textContent.includes('server confirms')")
    assert page.evaluate('postCount')==1
    assert page.evaluate('getCount')>=2
    page.close();browser.close()
print('PASS: v0.14.0.22 isolated Chromium post-commit response-loss reconciliation; no blind retries.')
