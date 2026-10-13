from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
html='''<!doctype html><html><head><meta charset="utf-8"></head><body><main><div class="wrap"><h1>Lab Registry</h1><p>Choose collection</p></div></main></body></html>'''
s=(R/'assets/js/lab-registry.js').read_text().replace("const path=location.pathname.toLowerCase();if(!/^\\/labs(?:\\.html)?$/.test(path))return;","const path='/labs.html';")
with sync_playwright() as w:
 browser=w.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (1440,390):
  page=browser.new_page(viewport={'width':width,'height':860});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content(html);page.add_style_tag(path=str(R/'assets/css/control-center.css'))
  page.evaluate('''() => {
    window.queries=[];
    window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{user:{id:'00000000-0000-4000-8000-000000000001'}}}})},from:(table)=>{
      const q={table,filters:{},start:0,end:999,orders:[]};window.queries.push(q);
      const query={select(){return query},eq(k,v){q.filters[k]=v;return query},order(k){q.orders.push(k);return query},range(start,end){q.start=start;q.end=end;return query},in(k,v){q.filters[k]=v;return query},then(resolve){
        if(table==='platform_labs'){const prefix=q.filters.book_code==='READING_THE_TAPE'?'TAPE':'F1';const n=q.filters.book_code==='READING_THE_TAPE'?19:72;
          const labs=Array.from({length:n},(_,i)=>({lab_id:prefix+'-'+String(i+1).padStart(3,'0'),title:'Evidence Lab '+(i+1),book_code:q.filters.book_code,ticker:'ABCD',lab_type:'core',metadata:{skill_group:'VWAP'}}));
          return Promise.resolve(resolve({data:labs.slice(q.start,q.end+1),error:null}));}
        return Promise.resolve(resolve({data:(q.filters.lab_id||[]).map(lab_id=>({lab_id,status:'not_started'})),error:null}));
      }};return query;}});
  }''')
  page.add_script_tag(content=s)
  page.wait_for_selector('#v1357-member-book',timeout=8000)
  assert page.evaluate('window.queries.length')==0,'Member Registry queried all Labs before collection selection'
  page.locator('#v1357-member-book').select_option('FOUNDATION_BOOK_1')
  page.wait_for_selector('.v133-lab-row')
  page.wait_for_function('document.querySelectorAll(".v133-lab-row").length===50')
  first=page.evaluate('window.queries');assert first[0]['filters']['book_code']=='FOUNDATION_BOOK_1' and first[0]['end']==50
  assert len(first[1]['filters']['lab_id'])==50
  page.locator('[data-next]').click()
  page.wait_for_function('document.querySelectorAll(".v133-lab-row").length===22')
  page.locator('#v1357-member-book').select_option('READING_THE_TAPE')
  page.wait_for_function('document.querySelectorAll(".v133-lab-row").length===19')
  assert 'TAPE-' in page.locator('.v133-lab-row').first.inner_text()
  assert not errs,errs
  print('PASS MEMBER LABS',width,'no eager 419 load; chosen collection; 50/page; per-page progress; page navigation; alternative collection')
 browser.close()
