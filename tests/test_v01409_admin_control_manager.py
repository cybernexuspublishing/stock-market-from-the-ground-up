"""Local browser DOM/API mock for v0.14.0.9, not Supabase production certification."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
html='''<!doctype html><html><head><style>.cc-owner-hidden{display:none!important}</style></head><body><main class="admin-shell"><aside class="admin-sidebar"><nav id="admin-tabs">
<button data-panel="dashboard">Dashboard</button><button data-panel="users">User Accounts</button><button data-panel="community">Market Commons</button><button id="unrecognized" type="button">Special Lab Tool</button>
</nav></aside><section class="admin-main"><div id="admin-gate" hidden></div><div id="admin-app"><section class="admin-panel" data-admin-panel="dashboard"></section></div></section></main></body></html>'''
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html)
 page.evaluate('''()=>{window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'x'}}})}});
 window.__config={items:[]};
 window.fetch=async (url,opts={})=>{if(!String(url).includes('admin-control-registry'))throw Error('Unexpected fetch');if(opts.method==='POST'){
  const x=JSON.parse(opts.body);const idx=window.__config.items.findIndex(t=>t.control_key===x.controlKey);
  const row={control_key:x.controlKey,label:x.label,group_name:x.group,kind:x.kind,href:x.href,sort_order:x.order,is_visible:x.visible,archived:!!x.remove};
  if(idx>=0)window.__config.items[idx]=row;else window.__config.items.push(row);
  return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}})}
 return new Response(JSON.stringify({ok:true,items:window.__config.items}),{status:200,headers:{'content-type':'application/json'}});
 };}''')
 script=(R/'assets/js/admin-navigation.js').read_text().replace("if(!/^\\/admin(?:\\.html)?$/i.test(location.pathname))return;","if(false)return;")
 page.add_script_tag(content=script)
 page.locator('#cc-control-manager').wait_for(timeout=8000)
 assert page.locator('#admin-tabs button',has_text='Special Lab Tool').count()==1
 page.locator('#cc-control-manager').click()
 page.locator('#cc-control-add input[name="label"]').fill('Private Training Editor')
 page.locator('#cc-control-add input[name="href"]').fill('/training-editor.html')
 page.locator('#cc-control-add button[type="submit"]').click()
 page.locator('#admin-tabs a[href="/training-editor.html"]',has_text='Private Training Editor').wait_for(timeout=8000)
 assert page.locator('#admin-tabs button',has_text='Special Lab Tool').count()==1
 page.locator('#cc-control-manager').click()
 form=page.locator('.cc-control-row[data-key="builtin:panel-users"]')
 form.locator('input[name="visible"]').uncheck()
 form.locator('button[type="submit"]').click()
 page.locator('#admin-tabs [data-panel="users"].cc-owner-hidden').wait_for(state='attached',timeout=8000)
 assert page.locator('#admin-tabs [data-panel="users"]').is_hidden()
 # The viewer-visible customizations never delete the underlying handlers or DOM element.
 assert page.locator('#admin-tabs [data-panel="users"]').count()==1
 assert not errors,errors
 browser.close()
print('PASS real Chromium: installed controls kept, adding custom link and hiding existing control persisted through API mock')
