"""Synthetic browser tests of existing authorized CMS editor preview and bounded thread reads."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page()
 page.set_content('<!doctype html><html><body><div id="v1354-console"></div><div id="v1354-content"></div><p id="v1354-status"></p></body></html>')
 script=(R/'assets/js/admin-core.js').read_text();script=script.replace(r"if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;",'/* synthetic fixture */')
 last="if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();"
 assert last in script
 script=script.replace(last,'window.testPageDialog=pageDialog;')
 page.add_script_tag(content=script)
 page.evaluate('''() => {window.testPageDialog({slug:'lesson',title:'First Title',summary:'Initial summary',body_text:'First content'});}''')
 assert 'First Title' in page.locator('.site-page-live-preview h4').inner_text()
 page.locator('[name="title"]').fill('Updated Lesson')
 page.locator('[name="body_text"]').fill('<script>alert(1)</script>')
 assert page.locator('.site-page-live-preview h4').inner_text()=='Updated Lesson'
 assert page.locator('.site-page-live-body').inner_text()=='<script>alert(1)</script>'
 assert page.locator('.site-page-live-body script').count()==0
 print('PASS CMS PREVIEW', 'live title/body preview, unsafe HTML rendered as text')
 page.close()
 for number,expected in [(1,[0,49]),(2,[50,99])]:
  page=browser.new_page()
  page.set_content('''<!doctype html><html><body><div id="v13-commons"></div><dialog id="v13-topic-dialog"><select id="v13-topic-forum"></select><span id="v13-topic-msg"></span><input id="v13-topic-title"><textarea id="v13-topic-body"></textarea><input id="v13-topic-ticker"><button id="v13-topic-save">Post</button></dialog></body></html>''')
  page.evaluate('''n => {window.__testSearch='?topic=7&repliesPage='+n;window.__calls=[];window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{user:{id:'mock'}}}})},from:table=>{const state={table,eqs:[]};const chain={select:(...opts)=>{state.select=opts;return chain},eq:(field,value)=>{state.eqs.push([field,value]);return chain},order:()=>chain,range:(from,to)=>{state.range=[from,to];return chain},maybeSingle:()=>{window.__calls.push(state);return Promise.resolve({data:{id:7,forum_code:'START_HERE',title:'Mock Topic',body:'Safe context',status:'published',is_locked:true}})},then:(cb)=>{window.__calls.push(state);return Promise.resolve(table==='commons_forums'?{data:[{forum_code:'START_HERE',name:'Start Here',section_name:'Start Here',active:true}]}:{data:[],error:null,count:77}).then(cb)}};return chain;}})};''',number)
  src=(R/'assets/js/market-commons-platform.js').read_text().replace('new URLSearchParams(location.search)','new URLSearchParams(window.__testSearch||location.search)')
  page.add_script_tag(content=src)
  page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
  page.wait_for_function("document.querySelector('.v13575-forum-pages') !== null",timeout=5000)
  result=page.evaluate("window.__calls.find(x=>x.table==='commons_posts')")
  assert result['range']==expected,(number,result)
  links=page.locator('.v13575-forum-pages a').all_text_contents()
  assert ('Previous replies' in links)==(number>1),(number,links)
  assert ('Next replies' in links)==(number==1),(number,links)
  print('PASS MARKET COMMONS REPLIES','page',number,'range',expected)
  page.close()
 browser.close()
