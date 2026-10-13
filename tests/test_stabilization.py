"""Local Chromium regression fixtures; fake data, no production credentials/network."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
css=[
 'assets/css/styles.css',
 'assets/css/platform.css',
 'assets/css/production.css',
 'assets/css/frontend-complete.css',
 'assets/css/production-completion.css',
 'assets/css/dashboard.css',
 'assets/css/layout-integrity.css',
 'assets/css/control-center.css',
]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (1440,1024,768,390):
  page=b.new_page(viewport={'width':width,'height':950});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
<header class="site-header"><div class="wrap nav"><a href="/" class="brand">THE STOCK MARKET: <span>FROM THE GROUND UP</span></a>
<nav class="navlinks v11-nav v12-nav"></nav><div class="fe-header-tools"><button class="fe-command-button">Search site</button></div></div></header>
<main><section class="hero"><div class="wrap"><h1>Legacy introductory text</h1></div></section></main>
</body></html>''')
  for f in css:page.add_style_tag(path=str(R/f))
  page.evaluate('''() => {window.statsCalls=0;window.releaseStats=undefined;window.fetch=(url)=>{window.statsCalls++;return new Promise(resolve=>{window.releaseStats=()=>resolve({ok:true,json:async()=>({ok:true,show:true,mode:'live',online:1,registered:4,label:'Recent activity in the last five minutes'})})})};}''')
  source=(R/'assets/js/home-community.js').read_text().replace("if(!['/','/index.html'].includes(location.pathname.toLowerCase()))return;",'')
  page.add_script_tag(content=source)
  page.wait_for_function('window.statsCalls===1&&Boolean(window.releaseStats)',timeout=5000)
  # A production home redesign changes <main> during an in-flight statistics request.
  page.evaluate('''() => {document.querySelector('main').innerHTML=`<div id="v132-home"><section class="v132-home-hero"><div class="wrap v132-home-hero-grid"><div class="headline"><div class="eyebrow">THE STOCK MARKET: FROM THE GROUND UP</div><h1>Learn the concepts. Practice the decisions. Build the skill.</h1><p>The books teach the core concepts. The platform turns them into guided practice and historical replay.</p><div class="actions"><a class="btn" href="learn.html">Start Learning</a></div></div><div class="v132-hero-panel"><div><strong>Historical Labs</strong><span>Practice without hindsight</span></div><div><strong>Simulator</strong><span>Replay and simulated execution</span></div><div><strong>Journal</strong><span>Review and progress</span></div><div><strong>Market Tutor</strong><span>Learning support</span></div></div></div></section></div>`;window.releaseStats();}''')
  page.wait_for_function("document.querySelector('#v1353-member-stats [data-online]')?.textContent==='1'",timeout=7000)
  page.wait_for_timeout(300)
  assert page.evaluate('window.statsCalls')==1,'Duplicate requests triggered by redesign/bootstrap'
  assert page.locator('#v1353-member-stats').count()==1
  assert page.locator('#v1353-member-stats [data-registered]').inner_text()=='4'
  heading=page.locator('#v132-home .v132-home-hero h1')
  font=heading.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')
  assert font<=61,(width,font)
  metrics=page.evaluate('''() => {const hero=document.querySelector('#v132-home .v132-home-hero-grid');const h=document.querySelector('#v132-home h1');const stat=document.querySelector('#v1353-member-stats');const a=h.getBoundingClientRect(),s=stat.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth-innerWidth,headingLeft:a.left,headingWidth:a.width,statLeft:s.left,statTop:s.top,headingTop:a.top,statsWidth:s.width,statsColumns:getComputedStyle(hero).gridTemplateColumns}}''')
  assert metrics['overflow']<=2,(width,metrics)
  assert metrics['statsWidth']>120,(width,metrics)
  if width>=1024:assert metrics['statLeft']+100<metrics['headingLeft'],(width,metrics)
  assert not errors,(width,errors)
  print('PASS HERO/STATS',width,metrics,'font',round(font,1),'one API request after DOM replacement')
  page.close()
 # The legacy v0.13.5 links enhancer must never append competing top-bar items.
 page=b.new_page(viewport={'width':1440,'height':900})
 page.set_content('<html><body><header class="site-header"><nav class="navlinks v11-nav"><a class="v12-top-link" href="/market-commons.html">Market Commons</a></nav></header><div class="dashboard-quick-links"></div></body></html>')
 page.add_script_tag(path=str(R/'assets/js/links.js'))
 page.wait_for_timeout(1200)
 assert page.locator('.site-header .navlinks>a').count()==1
 assert page.locator('[data-v135-quick]').count()==1
 print('PASS HEADER', 'no legacy appended links; one non-header dashboard quick action')
 page.close()
 # All Dashboard destinations must be visible without horizontal scrolling.
 # A balanced two-row grid is preferable to truncation or a scrolling tab rail.
 for width in (1440,860,390):
  page=b.new_page(viewport={'width':width,'height':850});page.set_content('<!doctype html><html><body><main style="max-width:1060px;margin:auto"><div id="v1322-member-hub"><nav class="v1322-member-tabs v13-member-tabs"></nav></div></main></body></html>')
  for f in css:page.add_style_tag(path=str(R/f))
  page.evaluate('''() => {let nav=document.querySelector('.v1322-member-tabs');['Overview','Membership & Access','Skill Development','My Books','Settings','Help & Documentation','Support','Purchases & Billing','Activity'].forEach(t=>{let b=document.createElement('button');b.textContent=t;nav.append(b)})}''')
  result=page.evaluate('''() => {let n=document.querySelector('.v1322-member-tabs');let b=[...n.children];return {first:b[0].getBoundingClientRect().y,last:b.at(-1).getBoundingClientRect().y,wrap:getComputedStyle(n).flexWrap,overflow:document.documentElement.scrollWidth-innerWidth,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth}}''')
  assert result['scrollWidth']<=result['clientWidth']+1,(width,result)
  assert result['overflow']<=2,(width,result)
  print('PASS DASHBOARD TABS',width,result)
  page.close()
 # A selected collection in Learning Operations must open the same collection in Lab Registry.
 page=b.new_page(viewport={'width':1300,'height':800})
 page.set_content('''<html><body><div data-v135-unified-panel="overview"><div class="v135-unified-stat-grid"><article></article><article></article><article></article><article></article><article></article></div><select data-v1357-legacy-book><option value="">Choose</option><option value="FOUNDATION_BOOK_2">Foundations Book II</option></select></div><div data-v135-unified-panel="labs"></div><button data-v135-control="labs" type="button">Labs</button></body></html>''')
 page.evaluate('''() => {window.labClicks=0;document.querySelector('[data-v135-control="labs"]').onclick=()=>window.labClicks++;}''')
 src=(R/'assets/js/admin-core.js').read_text().replace("if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;",'')
 old="if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();"
 assert old in src
 src=src.replace(old,'window.testEnhanceOldOps=enhanceOldOps;')
 page.add_script_tag(content=src)
 page.evaluate('window.testEnhanceOldOps()')
 page.locator('[data-v1354-jump="labs"]').first.click()
 assert page.evaluate('window.labClicks')==0
 page.locator('[data-v1357-legacy-book]').select_option('FOUNDATION_BOOK_2')
 page.locator('[data-v1354-jump="labs"]').first.click()
 assert page.evaluate('window.labClicks')==1
 page.evaluate('window.testEnhanceOldOps()')
 assert page.locator('[data-v1354-jump="labs"]').count()==3
 assert page.locator('[data-v1354-jump="labs"]').first.inner_text()=='View Selected Labs'
 print('PASS ADMIN LAB ROUTING','no all-site load; selected collection retained; idempotent enhancements')
 page.close()
 b.close()
