from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
html='''<!doctype html><html><body><main class="admin-shell"><nav id="admin-tabs"><div class="v13-admin-group"><span class="v13-admin-group-title">Site & Governance</span></div></nav><div id="admin-app"><div class="admin-panel active" data-admin-panel="dashboard">Admin dashboard</div></div></main></body></html>'''
s=(R/'assets/js/admin-core.js').read_text().replace("if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;",'')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (1440,760):
  page=b.new_page(viewport={'width':width,'height':890});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.add_style_tag(path=str(R/'assets/css/control-center.css'))
  page.evaluate('''() => {
    window.requests=[];
    window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'owner-demo'}}})}});
    window.fetch=async(url)=>{const u=new URL(url,'https://test.example');window.requests.push({action:u.searchParams.get('action'),book:u.searchParams.get('bookCode'),page:u.searchParams.get('page')});
      if(u.searchParams.get('action')==='labs'){
        const ids=Array.from({length:51},(_,i)=>({lab_id:'DT-'+String(i+1).padStart(3,'0'),title:'Day Trading '+i,book_code:'DAY_TRADING_BOOK_1',lab_type:'core',active:true,registry_visible:true}));
        const page=Number(u.searchParams.get('page')||0);return {ok:true,status:200,json:async()=>({ok:true,labs:page===0?ids.slice(0,50):ids.slice(50),hasMore:page===0,bookCode:u.searchParams.get('bookCode'),page})};}
      return {ok:true,status:200,json:async()=>({ok:true,modules:[],events:[],checks:[]})};};
  }''')
  page.add_script_tag(content=s)
  page.wait_for_selector('#v1354-console',state='attached')
  page.locator('#v1354-main-nav').click()
  page.locator('#v1354-console [data-v1354-tab="labs"]').first.click()
  page.wait_for_selector('[data-v1357-book]')
  assert not any(x['action']=='labs' for x in page.evaluate('window.requests')),'Admin fetched all Labs before selection'
  page.locator('[data-v1357-book]').select_option('DAY_TRADING_BOOK_1')
  page.wait_for_selector('[data-v1354-act=lab-view]')
  assert page.locator('[data-v1354-act=lab-view]').count()==50
  assert page.locator('[data-v1354-act=lab-edit]').count()==50
  assert page.evaluate('window.requests.at(-1).book')=='DAY_TRADING_BOOK_1'
  page.locator('[data-v1354-act=lab-next]').click()
  page.wait_for_function('document.querySelectorAll("#v1354-console [data-v1354-act=lab-view]").length===1')
  assert page.evaluate('window.requests.at(-1).page')=='1'
  assert not errors,errors
  print('PASS ADMIN LABS',width,'collection gating, server-side 50 page limit, separate View/Edit, pagination')
 b.close()
