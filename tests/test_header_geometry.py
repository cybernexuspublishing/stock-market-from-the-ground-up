"""Geometry regression of the complete signed-in desktop header at intermediate widths."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1440,1100,1024,940,901]:
  page=browser.new_page(viewport={'width':width,'height':800})
  page.set_content('''<html><body><header class="site-header"><div class="wrap nav"><a class="brand" href="/">THE STOCK MARKET: <span>FROM THE GROUND UP</span></a><nav class="navlinks"></nav><div class="fe-header-tools"><button class="fe-command-button" aria-label="Search">Search site <kbd>Ctrl K</kbd></button><button class="fe-notify-button" aria-label="Notifications">● Alerts</button></div></div></header></body></html>''')
  for f in ['assets/css/styles.css','assets/css/platform.css','assets/css/production.css','assets/css/frontend-complete.css','assets/css/production-completion.css','assets/css/layout-integrity.css']:
   page.add_style_tag(path=str(R/f))
  page.evaluate("() => {const OldURL=window.URL;window.URL=class extends OldURL{constructor(u,b){super(u,b==='null'?'https://test.example':b)}}}")
  src=(R/'assets/js/navigation.js').read_text().split('/* CANONICAL_DESKTOP_NAV */\n',1)[1]
  page.add_script_tag(content=src[:-6]+'window.__testMakeNav=makeNav;\n})();\n')
  page.evaluate('''() => window.__testMakeNav({authenticated:true,username:'ExampleReader',planCode:'LIFETIME',staffRoles:['OWNER'],controlPanel:true,books:[],tools:[]},[])''')
  metrics=page.evaluate('''() => {const brand=document.querySelector('.brand').getBoundingClientRect(),nav=document.querySelector('.navlinks'),first=[...nav.children].find(x=>x.getBoundingClientRect().width>1)?.getBoundingClientRect();return {brandRight:brand.right,firstLeft:first?.left,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth}}''')
  assert metrics['firstLeft']>=metrics['brandRight']-1,(width,metrics)
  assert metrics['documentWidth']<=width+1,(width,metrics)
  print('PASS DESKTOP HEADER',width,'no brand/menu collision or horizontal overflow')
  page.close()
 browser.close()
