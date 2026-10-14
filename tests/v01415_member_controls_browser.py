from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':830})
 page.set_content('<main><article data-forum-content="topic" data-content-id="2"><h2>Member discussion</h2></article><article data-forum-content="post" data-content-id="9"><p>My reply</p></article><article data-forum-content="post" data-content-id="10"><p>Another reply</p></article></main>')
 page.evaluate('''() => {
 window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'TEST'}}})}});
 window.fetch=async()=>new Response(JSON.stringify({ok:true,ownedTopic:true,ownedPosts:[9]}),{status:200,headers:{'content-type':'application/json'}});
 }''')
 page.add_script_tag(content=(root/'assets/js/forum-member-controls.js').read_text())
 page.evaluate("window.GroundUpForumMemberControls.bind('commons',2)")
 page.wait_for_timeout(200)
 assert page.locator('[data-forum-content="topic"] [data-member-actions] button').count()==2
 assert page.locator('[data-forum-content="post"][data-content-id="9"] [data-member-actions] button').count()==2
 assert page.locator('[data-forum-content="post"][data-content-id="10"] [data-member-actions]').count()==0
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 print('PASS member-owned topic and reply receive actions, others do not, responsive at 390px')
 browser.close()
