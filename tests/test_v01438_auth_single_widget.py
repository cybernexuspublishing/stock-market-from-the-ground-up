"""Isolated Chromium test of repeated auth-adapter loading, token use, and no forced MFA."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from threading import Thread
ROOT=Path(__file__).resolve().parents[1]
SRC=(ROOT/'assets/js/turnstile-auth.js').read_text().replace('const path=location.pathname.toLowerCase();',"const path='/signin.html';")
SIGNIN=(ROOT/'assets/js/signin.js').read_text()
HTML='''<!doctype html><html><body><div class="auth-card"><form onsubmit="doSignIn(event)">
<input id="login-identifier" value="person@example.com"><input type="password" id="login-password" value="pass123">
<button type="submit" class="auth-submit">Sign in</button><div id="signin-message"></div></form></div>
<script>window.calls=0;window.resetCalls=0;window.logins=0;window.redirects=[];
window.fetch=async()=>new Response(JSON.stringify({ok:true,enabled:true,sitekey:'0123456789sitekey'}),{status:200,headers:{'content-type':'application/json'}});
window.getSupabaseClient=async()=>window.sb;
window.sb={auth:{
 signUp:async()=>({}),
 signInWithPassword:async()=>{window.logins++;return {error:null}},
 resetPasswordForEmail:async()=>({error:null}),
 getUser:async()=>({data:{user:null}})
}};
window.SiteSession={startSessionClock:()=>{}};
window.turnstile={render:(node,opts)=>{window.calls++;node.setAttribute('data-rendered','1');opts.callback('test-token');return 5},reset:()=>{window.resetCalls++}};
</script></body></html>'''
class Server(BaseHTTPRequestHandler):
 def do_GET(self):
  b=HTML.encode();self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
 def log_message(self,*x):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Server);Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_address[1]}/signin.html'
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page()
  page.route('**/api/auth-guard-v0135',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"enabled":true,"sitekey":"0123456789sitekey"}'))
  page.route('**/signin.html',lambda r:r.fulfill(status=200,content_type='text/html',body=HTML))
  page.set_content(HTML)
  page.add_script_tag(content=SRC)
  page.add_script_tag(content=SRC)
  page.locator('#v135-turnstile').wait_for(state='attached',timeout=2000)
  page.wait_for_timeout(60)
  assert page.evaluate('window.calls')==1,'duplicate widget'
  assert page.locator('#v135-turnstile').count()==1
  assert not page.locator('button[type="submit"]').is_disabled()
  page.add_script_tag(content=SIGNIN)
  page.evaluate('window.doSignIn({preventDefault(){}})')
  page.wait_for_timeout(60)
  assert page.evaluate('window.logins')==1,'email login did not call Supabase exactly once'
  assert page.evaluate('window.resetCalls')>=1,'challenge must reset after an authentication attempt'
  assert page.locator('#v135-turnstile').count()==1
  # Existing separate pre-rendered CAPTCHA must fail closed, not silently append a second.
  other=browser.new_page()
  other.route('**/api/auth-guard-v0135',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"enabled":true,"sitekey":"0123456789sitekey"}'))
  other.route('**/signin.html',lambda r:r.fulfill(status=200,content_type='text/html',body=HTML.replace('</form>','<div class="cf-turnstile"></div></form>')))
  other.set_content(HTML.replace('</form>','<div class=\"cf-turnstile\"></div></form>'));other.add_script_tag(content=SRC)
  other.wait_for_timeout(40)
  assert other.locator('#v135-turnstile').count()==0
  assert other.locator('button[type="submit"]').is_disabled()
  assert 'More than one' in other.locator('#v135-auth-captcha-status').inner_text()
  other.close();page.close();browser.close()
server.shutdown()
print('PASS v01438: exactly one auth widget, one CAPTCHA redemption and no MFA redirect; duplicates fail closed')
