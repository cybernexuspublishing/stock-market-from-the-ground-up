"""Controlled browser smoke tests for the two owner-reported defects and Market Commons page scope."""
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
ADMIN_JS=(R/'assets/js/admin-operations.js').read_text().replace(r"if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;", "/* fixture: path guard simulated */")
FORUM_JS=(R/'assets/js/market-commons-platform.js').read_text().replace('new URLSearchParams(location.search)', 'new URLSearchParams(window.__testSearch||location.search)')

def fixture(page, url, html):
    page.set_content(html)
    page.evaluate('(search)=>window.__testSearch=search', '?'+urlsplit(url).query)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for grouped in (False,True):
        page=browser.new_page(viewport={'width':1360,'height':900})
        left='<div class="v13-admin-group"><div class="v13-admin-group-title">Accounts &amp; Access</div>' if grouped else ''
        right='</div>' if grouped else ''
        html=f'''<!doctype html><html><body><nav id="admin-tabs">{left}
        <button data-panel="users">Accounts</button><button data-v1352-menu="1">Account Management</button>
        <button data-panel="roles">Roles & Permissions</button>{right}</nav>
        <div id="admin-gate" hidden></div><div id="admin-app"></div><dialog id="admin-user-dialog"></dialog></body></html>'''
        fixture(page,'http://localhost:18765/admin.html',html)
        page.evaluate('''window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'x.y.z',user:{id:'a'}}}})}});''')
        page.route('**/api/**',lambda route:route.fulfill(status=200,content_type='application/json',body='{"ok":true,"accounts":[],"owner":true,"synthetic":false,"vaultReady":false}'))
        page.add_script_tag(content=ADMIN_JS)
        page.wait_for_timeout(2000)
        assert page.locator('#admin-tabs [data-v1352-menu]').count()==1
        assert page.locator('#v1352-accounts').count()==1
        btn=page.locator('#admin-tabs [data-v1352-menu]')
        assert btn.is_visible(), 'Account Management missing from sidebar'
        if grouped: assert btn.evaluate("e=>e.parentElement.querySelector('.v13-admin-group-title').textContent.includes('Accounts')")
        btn.click()
        assert page.locator('#v1352-accounts').evaluate("e=>e.classList.contains('active')")
        print('PASS ADMIN SIDEBAR', 'grouped' if grouped else 'ungrouped','single Account Management item and selectable panel')
        page.close()
    for page_number, expected_start in [(1,0),(2,30),(3,60)]:
        page=browser.new_page(viewport={'width':1200,'height':900})
        fixture(page,f'http://localhost:18765/market-commons.html?forum=START_HERE&page={page_number}', '''<!doctype html><html><body>
          <div id="v13-commons"></div><dialog id="v13-topic-dialog"><select id="v13-topic-forum"></select>
          <span id="v13-topic-msg"></span><input id="v13-topic-title"><textarea id="v13-topic-body"></textarea>
          <input id="v13-topic-ticker"><button id="v13-topic-save">Post</button></dialog></body></html>''')
        page.evaluate('''() => {
          window.__calls=[];
          const mk=(name)=>{
            const state={name,eqs:[],range:null};
            return {select:(...a)=>{state.select=a;return chain},eq:(field,value)=>{state.eqs.push([field,value]);return chain},
              order:()=>chain,limit:n=>{state.limit=n;return chain},range:(a,b)=>{state.range=[a,b];return chain},
              then:(resolve,reject)=>{
                window.__calls.push(state);
                if(name==='commons_forums')return Promise.resolve({data:[{forum_code:'START_HERE',section_name:'Getting Started',name:'Start Here',active:true}],error:null}).then(resolve,reject);
                if(name==='commons_topics')return Promise.resolve({data:[{id:10,forum_code:'START_HERE',title:'Test Discussion',reply_count:0,is_official:false}],count:65,error:null}).then(resolve,reject);
                return Promise.resolve({data:[],error:null}).then(resolve,reject);
              }};
            var chain;
          };
          window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{user:{id:'test'}}}})},from:name=>{
             const s={name,eqs:[],range:null};const chain={select:(...args)=>{s.select=args;return chain},eq:(field,value)=>{s.eqs.push([field,value]);return chain},order:()=>chain,range:(a,b)=>{s.range=[a,b];return chain},limit:n=>{s.limit=n;return chain},then:(r,e)=>{window.__calls.push(s);return Promise.resolve(name==='commons_forums'?{data:[{forum_code:'START_HERE',section_name:'Getting Started',name:'Start Here',active:true}],error:null}:{data:[{id:10,forum_code:'START_HERE',title:'Test Discussion',reply_count:0,is_official:false}],count:65,error:null}).then(r,e)}};return chain;}});
        }''')
        page.add_script_tag(content=FORUM_JS)
        page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
        page.wait_for_function("() => document.getElementById('v13-commons').textContent.includes('Page')")
        got=page.evaluate('''()=>window.__calls.find(x=>x.name==='commons_topics')''')
        assert got['range']==[expected_start,expected_start+29],got
        assert ['status','forum_code'] == [e[0] for e in got['eqs']],got
        assert page.locator('.v13575-forum-pages').count()==1
        if page_number==3:assert page.locator('.v13575-forum-pages a').count()==1
        else: assert page.locator('.v13575-forum-pages a').count()==(1 if page_number==1 else 2)
        print('PASS FORUM SCOPE','page',page_number,'rows',got['range'],'published only, bounded')
        page.close()
    browser.close()
