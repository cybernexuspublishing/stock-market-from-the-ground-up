"""Local Instructor Owner editor contract; mock backend, no real answer-key writes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1120,'height':900})
 page.set_content((R/'training-editor.html').read_text())
 page.add_style_tag(content=(R/'assets/css/owner-editors.css').read_text())
 page.evaluate('''() => {
  window.calls=[];
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock'}}})}});
  window.fetch=async(url,opts={})=>{calls.push({url:String(url),body:opts.body});if(String(url).includes('action=list'))return new Response(JSON.stringify({ok:true,sets:[]}));if(String(url).includes('action=draft'))return new Response(JSON.stringify({ok:true,labId:'F2-C07-L01',version:1,notice:'Saved'}));return new Response(JSON.stringify({ok:true}));};
 }''')
 page.add_script_tag(content=(R/'assets/js/training-editor.js').read_text())
 assert page.locator('.v01414-question-preview').count()==1
 page.locator('input[name=labId]').fill('F2-C07-L01')
 page.locator('input[name=title]').fill('Candle mechanics assessment')
 q=page.locator('.v014-question-editor').first
 q.locator('[data-q=prompt]').fill('What is the full price range?')
 q.locator('[data-q=kind]').select_option('number')
 assert q.locator('[data-q=options]').locator('xpath=..').is_hidden()
 assert q.locator('[data-q=tolerance]').locator('xpath=..').is_visible()
 q.locator('[data-q=answer]').fill('0.6')
 q.locator('[data-q=tolerance]').fill('0.01')
 q.locator('[data-q=explanation]').fill('Subtract the candle low from its high.')
 assert 'What is the full price range?' in q.locator('.v01414-question-preview').inner_text()
 page.get_by_role('button',name='Save Draft').click()
 page.wait_for_function("calls.some(x=>x.url.includes('action=draft'))")
 saved=page.evaluate("JSON.parse(calls.findLast(x=>x.url.includes('action=draft')).body)")
 assert saved['questions'][0]['kind']=='number'
 assert saved['answerKey']['q1']==0.6
 browser.close()
print('PASS v0.14.0.14: instructor typed fields, learner preview, numeric validation, reviewed draft payload browser fixture')
