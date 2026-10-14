from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
js=(root/'assets/js/forum-composer.js').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':820})
 page.set_content('<form id="thread"><textarea data-forum-composer id="topic" maxlength="10000">[b]Topic[/b]</textarea><button type="submit">Publish</button></form><article class="v01411-public-announcement"><p>[spoiler=News]Read the disclosure[/spoiler]</p></article>')
 page.evaluate("""() => {const memory=new Map();Object.defineProperty(window,'sessionStorage',{configurable:true,value:{setItem:(k,v)=>memory.set(k,String(v)),getItem:k=>memory.get(k)||null,removeItem:k=>memory.delete(k)}})}""")
 page.add_script_tag(content=js)
 page.wait_for_timeout(100)
 tests={
  '[b]Bold[/b]':'<strong>Bold</strong>',
  '[strike]Gone[/strike]':'<s>Gone</s>',
  '[highlight]Mark[/highlight]':'<mark>Mark</mark>',
  '[spoiler=Secret]Info[/spoiler]':'<details',
  '[quote=Trader]Observation[/quote]':'<cite>Trader</cite>',
  '[table][tr][th]Day[/th][/tr][tr][td]1[/td][/tr][/table]':'<table>',
  '[lang=es]Hola[/lang]':'lang="es"',
  '[list=a][*]One[*]Two[/list]':'<ol type="a">',
  '[mention]SomeUser[/mention]':'@SomeUser',
  '[email]foo@example.com[/email]':'mailto:foo@example.com',
  '[php]echo 1;[/php]':'data-code-language="php"',
  '[html]<script>alert(1)</script>[/html]':'&lt;script&gt;',
  '[noparse][b]literal[/b][/noparse]':'[b]literal[/b]',
  '[color=red]Warning[/color]':'color:#ff6666',
  '[anchor=research]A[/anchor][anchorlink=research]Back[/anchorlink]':'href="#gu-anchor-research"',
  '[ticker]AAPL[/ticker]':'$AAPL',
  '[timeframe]3M[/timeframe]':'Timeframe label',
  '[source=https://www.sec.gov/]SEC filing[/source]':'User-supplied citation',
  '[risk]Manage size[/risk]':'Risk considerations',
  '[evidence]Cited filing[/evidence]':'Member-provided evidence',
  '[url]https://example.com[/url]':'href="https://example.com/"',
  '[anchor]research[/anchor]':'id="gu-anchor-research"',
 }
 for text,expected in tests.items():
  rendered=page.evaluate('(x)=>window.GroundUpForumEditor.render(x)',text)
  assert expected in rendered, (text,rendered,expected)
 for attack in ['[img]javascript:alert(1)[/img]','[url=javascript:alert(2)]X[/url]','[font=Arial;display:none]X[/font]',
                '[quote=<img src=x onerror=alert(1)>]h[/quote]','[spoiler=<svg onload=alert(1)>]secret[/spoiler]',
                '<img src=x onerror=alert(4)>','[size=100]X[/size]', '[anchor=\" onmouseenter=alert(5)]X[/anchor]']:
  rendered=page.evaluate('(x)=>window.GroundUpForumEditor.render(x)',attack)
  assert '<script' not in rendered.lower() and '<svg ' not in rendered.lower(),(attack,rendered)
  assert page.evaluate('h=>{const d=new DOMParser().parseFromString(h,"text/html");return !Array.from(d.querySelectorAll("*")).some(n=>[...n.attributes].some(a=>a.name.startsWith("on")))}',rendered),(attack,rendered)
 assert page.locator('.v01411-public-announcement details').count()==1
 assert page.locator('#topic').is_visible()
 modes=page.get_by_label('Editor mode')
 modes.select_option('visual')
 assert page.locator('.gu-wysiwyg').is_visible()
 assert page.locator('#topic').is_hidden()
 page.locator('.gu-wysiwyg').fill('Changed visual message')
 modes.select_option('standard')
 assert 'Changed visual message' in page.locator('#topic').input_value()
 page.get_by_role('button',name='Save private draft').click()
 page.locator('#topic').fill('Other content')
 page.once('dialog',lambda d:d.accept())
 page.get_by_role('button',name='Restore draft').click()
 assert 'Changed visual message' in page.locator('#topic').input_value()
 page.get_by_role('button',name='Discard draft').click()
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 print('PASS advanced formatting, named spoilers, structured tables, malicious payloads, visual round-trip, opt-in session draft, responsive 390px')
 browser.close()
