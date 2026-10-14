from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
js=(root/'assets/js/forum-composer.js').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':375,'height':812})
 page.set_content('''<form id="member"><label>Message<textarea data-forum-composer maxlength="8000" id="forum">My message</textarea></label><button type="submit">Post</button></form><section class="v01411-public-announcement"><p id="announcement">[b]Hello[/b] [color=#fff000]World[/color]</p></section><section class="v01414-ann-preview"><p data-preview-body id="live-preview">[b]Draft announcement[/b]</p></section><form class="v01411-ann-editor"><textarea name="body" id="owner">[b]Notice[/b]</textarea><button type="submit">Save</button></form><div class="fe-notification"><p id="note">[url=javascript:alert(1)]click[/url]</p></div>''')
 page.add_script_tag(content=js)
 page.wait_for_timeout(100)
 assert page.locator('.gu-forum-editor').count()==2, 'forum and announcement textarea both enhance'
 assert page.locator('#announcement strong').inner_text()=='Hello'
 assert page.locator('#announcement span').inner_text()=='World'
 assert page.locator('#live-preview strong').inner_text()=='Draft announcement'
 page.locator('#live-preview').evaluate('(x)=>x.textContent="[i]Edited announcement[/i]"')
 page.wait_for_timeout(60)
 assert page.locator('#live-preview em').inner_text()=='Edited announcement'
 assert not page.locator('#note a').count(), 'invalid script protocol cannot create a link'
 urls=['[url=javascript:alert(1)]evil[/url]','[url=https://example.com/?q=%22onerror]safe[/url]','[color=red]bad[/color]','[size=200]bad[/size]','[img]javascript:alert(1)[/img]','<script>alert(1)</script>','[code]<svg onload=alert(1)>[/code]']
 for raw in urls:
  result=page.evaluate('t=>window.GroundUpForumEditor.render(t)',raw)
  assert '<script' not in result.lower() and '<svg' not in result.lower(),(raw,result)
  assert page.evaluate('h=>{const d=new DOMParser().parseFromString(h,"text/html");return !Array.from(d.querySelectorAll("*")).some(n=>Array.from(n.attributes).some(a=>a.name.startsWith("on")))}',result),(raw,result)
 unsafe_html='<p>Hello <b>world</b><script>alert(123)</script><img src="javascript:alert(1)" onerror="alert(2)"><a href="javascript:alert(3)">bad link</a><span style="color:red" onclick="alert(3)">safe</span></p>'
 transformed=page.evaluate('h=>window.GroundUpForumEditor.htmlToBBCode(h)',unsafe_html)
 assert '[b]world[/b]' in transformed and 'alert(123)' not in transformed and '[img]' not in transformed and '[url=javascript' not in transformed,(transformed)
 forum=page.locator('#forum');page.get_by_role('button',name='HTML source',exact=True).first.click()
 assert page.locator('.gu-source-panel textarea:visible').count()==1
 page.locator('.gu-source-panel textarea:visible').fill('<p><b>New</b> member message</p>')
 page.get_by_role('button',name='Apply safe HTML').first.click()
 assert '[b]New[/b]' in forum.input_value()
 page.get_by_role('button',name='Preview',exact=True).first.click()
 assert page.locator('.gu-forum-preview:visible strong').first.inner_text()=='New'
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'mobile overflow'
 page.locator('#owner').fill('Announcement [b]text[/b]')
 page.locator('#owner').dispatch_event('input')
 assert page.locator('#owner').input_value()=='Announcement [b]text[/b]'
 # asynchronous UI rendering and mutation observer; updated notification must safely display BBCode
 page.evaluate("document.body.insertAdjacentHTML('beforeend','<article class=\"fe-notification\"><p id=\"newnotice\">[i]Stay informed[/i]</p></article>')")
 page.wait_for_timeout(100)
 assert page.locator('#newnotice em').inner_text()=='Stay informed'
 print('PASS: renderer/HTML import/XSS restrictions, safe toolbar, mobile, announcements, notification, dynamic DOM')
 browser.close()
