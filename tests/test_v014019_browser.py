"""Isolated Chromium component tests. URL/redirects are mocked; not production E2E."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML='''<!doctype html><html><body><main><div id="v13-commons"><form id="v13-reply">
<section class="gu-forum-editor"><div class="gu-forum-toolbar"><button type="button" class="gu-format-btn" onclick="window.legacyMention=(window.legacyMention||0)+1">Mention</button></div>
<textarea data-forum-composer id="reply-body"></textarea></section>
<button type="submit">Post Reply</button><p class="status-message"></p></form></div></main></body></html>'''
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':320,'height':720})
  page.set_content(HTML)
  page.evaluate('''() => {window.__testRPC=0;window.getSupabaseClient=async()=>({
    auth:{getSession:async()=>({data:{session:{access_token:'test',user:{id:'user123'}}}})},
    rpc:async(name,args)=>{window.__testRPC++;window.__postBody=args.p_body;return {data:{id:91},error:null}},
    from:(name)=>({select(){return this},eq(){return this},order(){return this},limit(){return this},then(resolve){return Promise.resolve({count:60,error:null,data:[]}).then(resolve)}})
  });window.fetch=async()=>({ok:true,json:async()=>({ok:true,matches:['TraderPro'],notificationDelivery:false})})}''')
  js=(ROOT/'assets/js/member-mentions.js').read_text().replace("if(!/^\\/(?:new-discussion|market-commons|forum-topic|forum)(?:\\.html)?$/.test(location.pathname))return;","if(false)return;")
  assert 'if(false)return;' in js
  page.add_script_tag(content=js)
  page.wait_for_function("document.querySelector('.gu-forum-toolbar button')?.dataset.verifiedMention === '1'")
  page.locator('.gu-forum-toolbar button').click()
  assert page.locator('#gu-verified-mention-dialog').evaluate('(e)=>e.open')
  page.locator('#gu-mention-query').fill('Tra')
  page.get_by_role('button',name='@TraderPro').click()
  assert page.locator('#reply-body').input_value()=='[mention]TraderPro[/mention]'
  assert page.evaluate('window.legacyMention||0')==0
  page.locator('#reply-body').fill('Testing a validated forum reply')
  reply=(ROOT/'assets/js/v014018-forum-corrections.js').read_text().replace('const commons=/^\\/market-commons(?:\\.html)?$/i.test(location.pathname);','const commons=true;').replace('const topic=Number.isSafeInteger(rawTopic)&&rawTopic>0?rawTopic:null;','const topic=77;').replace('location.assign(url.pathname+url.search+url.hash);','window.__redirected=url.pathname+url.search+url.hash;').replace("new URL('/market-commons.html',location.origin)","new URL('/market-commons.html','https://example.test')")
  assert 'const commons=true;' in reply and 'const topic=77;' in reply and 'window.__redirected=' in reply
  page.add_script_tag(content=reply)
  page.get_by_role('button',name='Post Reply').click()
  page.wait_for_function('window.__redirected!==undefined')
  assert page.evaluate('window.__testRPC')==1,'Duplicate RPC detected.'
  assert page.evaluate('window.__redirected')=='/market-commons.html?topic=77&repliesPage=2&reply=91#gu-reply-91'
  browser.close()
print('PASS: isolated Chromium (320px) mention picker, click interception, exactly-once reply and destination contract.')
