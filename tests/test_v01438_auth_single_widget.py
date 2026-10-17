"""Chromium regression: challenge never executes without a real user initiation.
Historical single-widget, native Supabase token, duplicate and fail-closed checks.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SRC = (ROOT / 'assets/js/turnstile-auth.js').read_text().replace(
    'const path=location.pathname.toLowerCase();', "const path='/signin.html';")
SIGNIN = (ROOT / 'assets/js/signin.js').read_text()
HTML = '''<!doctype html><html><body><div class="auth-card"><form onsubmit="doSignIn(event)">
<input id="login-identifier" value="person@example.com">
<input type="password" id="login-password" value="pass123">
<button type="submit" class="auth-submit">Sign in</button><div id="signin-message"></div>
</form></div><script>
window.renderCalls=0;window.execCalls=0;window.removals=0;window.logins=0;window.supabaseToken='';
window.fetch=async()=>new Response(JSON.stringify({ok:true,enabled:true,sitekey:'0123456789sitekey'}),
 {status:200,headers:{'content-type':'application/json'}});
window.getSupabaseClient=async()=>window.sb;
window.sb={auth:{
 signUp:async()=>({}),
 signInWithPassword:async(args)=>{window.logins++;window.supabaseToken=args.options?.captchaToken||'';return {error:null}},
 resetPasswordForEmail:async()=>({error:null}),getUser:async()=>({data:{user:null}})
}};
window.SiteSession={startSessionClock:()=>{}};
window.turnstile={
 render:(node,opts)=>{window.renderCalls++;node.setAttribute('data-rendered','1');node.innerHTML='<iframe title=\\\"Verification\\\" style=\\\"width:300px;height:65px\\\"></iframe>';window.turnstileOpts=opts;return 5},
 execute:()=>{window.execCalls++;window.turnstileOpts.callback('test-token')},
 remove:()=>{window.removals++}
};
</script></body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page()
    page.set_content(HTML)
    page.add_script_tag(content=SRC)
    page.add_script_tag(content=SRC)
    page.locator('#v143-start-human').wait_for(state='attached', timeout=3000)
    page.locator('#v143-start-human').wait_for(state='visible', timeout=3000)
    page.wait_for_function("!document.querySelector('#v143-start-human').disabled")
    assert page.evaluate('window.renderCalls') == 0, 'CAPTCHA must NOT auto-render on load'
    assert page.evaluate('window.execCalls') == 0, 'CAPTCHA must NOT execute on load'
    assert page.locator('button[type="submit"]').is_disabled(), 'sign-in must remain locked'
    assert page.locator('#v135-turnstile').count() == 1
    assert page.locator('#v135-turnstile').is_hidden(), 'challenge hidden until user starts it'
    page.locator('#v143-start-human').check()
    page.wait_for_function('window.execCalls===1')
    assert page.evaluate('window.renderCalls') == 1, 'one manually initiated widget'
    assert page.locator('#v135-turnstile').evaluate('(el)=>!el.hidden'), 'widget mount shown after manual start'
    assert not page.locator('button[type="submit"]').is_disabled()
    assert page.evaluate('window.turnstileOpts.appearance') == 'always'
    assert page.evaluate('window.turnstileOpts.execution') == 'execute'
    page.add_script_tag(content=SIGNIN)
    page.evaluate('window.doSignIn({preventDefault(){}})')
    page.wait_for_function('window.logins===1')
    assert page.evaluate('window.supabaseToken') == 'test-token'
    assert page.evaluate('window.removals') >= 1, 'one-time verification widget must be consumed'
    assert not page.locator('#v143-start-human').is_checked(), 'next attempt requires new click'
    assert page.locator('button[type="submit"]').is_disabled(), 'new attempt is locked'
    page.close()

    # Existing second CAPTCHA integration must fail closed without mounting another.
    other = browser.new_page()
    other.set_content(HTML.replace('</form>', '<div class="cf-turnstile"></div></form>'))
    other.add_script_tag(content=SRC)
    other.locator('#v135-auth-captcha-status').wait_for(state='attached', timeout=3000)
    assert other.locator('#v135-turnstile').count() == 0
    assert other.locator('button[type="submit"]').is_disabled()
    assert 'Duplicate human verification widget' in other.locator('#v135-auth-captcha-status').inner_text()
    other.close()
    browser.close()
print('PASS v01443: checkbox-initiated visible challenge only, single token and no duplicate integration')
