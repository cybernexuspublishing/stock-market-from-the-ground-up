from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'Preview_Standalone.html').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1280,'height':900})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(HTML,wait_until='load')
 def click(a):
  page.locator('[data-action="'+a+'"]').first.click()
 def radio(key,value):
  page.locator('input[data-input="'+key+'"][value="'+value+'"]').check()
 def value(key,x):
  page.locator('input[data-input="'+key+'"]').fill(str(x))
 print('start',page.locator('h1').inner_text())
 click('next');radio('introAnswer','range');click('introCheck')
 assert 'Construct your own' in page.locator('h2').inner_text()
 radio('expAnswer','bear');click('expCheck');radio('predAnswer','Bearish');click('predCheck');click('next')
 assert 'Practice' in page.locator('h2').inner_text()
 # Credit confirmation must appear above the reveal and skip controls, and cancel must not debit.
 click('creditReveal');assert page.locator('#credit-confirm').count()==1
 page.locator('#credit-confirm').locator('[data-action="cancelCredit"]').click();assert page.locator('#credit-confirm').count()==0
 click('creditReveal');click('confirmCredit');assert 'Answer revealed' in page.locator('.feedback').last.inner_text()
 click('nextPractice');value('practiceAnswer',2);click('checkPractice');click('nextPractice')
 value('practiceAnswer',30);click('checkPractice');value('practiceAnswer',40);click('checkPractice')
 assert 'select a possible answer' in page.locator('.question').last.inner_text()
 radio('practiceChoice','50');click('checkPractice');click('nextPractice')
 assert page.locator('h2').inner_text().startswith('Assess')
 for k,v in [('a0',.8),('a1',2),('a2',40)]:value(k,v)
 click('submitAssessment');assert 'Original independent submission: 3/3' in page.locator('.content').inner_text()
 for k,v in [('r0',.4),('r1',1.2),('r2',100/3)]:value(k,v)
 click('submitRetry');assert 'Retry result: 3/3' in page.locator('.content').inner_text()
 click('next');radio('tDirection','Bearish')
 for k,v in [('tBody',.3),('tRange',.8),('tPercent',37.5)]:value(k,v)
 click('lockTransfer');assert '37.5%' in page.locator('.content').inner_text();click('next')
 assert 'Learning Development Report' in page.locator('h2').inner_text();print('candlestick end-to-end pass')
 # Switch via selector to VWAP reference
 page.locator('#lab-select').select_option('vwap');assert 'VWAP' in page.locator('h1').inner_text()
 click('next');radio('introAnswer','sum');click('introCheck')
 radio('expAnswer','weight');click('expCheck');radio('predAnswer','uncertain');click('predCheck');click('next')
 for k,v in [('practiceAnswer',2600)]:value(k,v)
 click('checkPractice');click('nextPractice');value('practiceAnswer',300);click('checkPractice');click('nextPractice')
 value('practiceAnswer',2600/300);click('checkPractice');click('nextPractice')
 for k,v in [('a0',3300),('a1',400),('a2',8.25)]:value(k,v)
 click('submitAssessment');assert 'Original independent submission: 3/3' in page.locator('.content').inner_text()
 click('next');assert 'Controlled VWAP market replay' in page.locator('h2').inner_text()
 assert 'Revealed 3/8' in page.locator('.content').inner_text()
 assert page.locator('svg[aria-label*="Exactly 3 completed"]').count()==1
 # wrong classification should not reveal new bar in guided
 radio('replayChoice','reclaim');radio('replayDecision','wait');radio('replayForecast','uncertain');click('lockReplay')
 assert 'Correction needed' in page.locator('.content').inner_text()
 assert 'Revealed 3/8' in page.locator('.content').inner_text()
 # derive correct classification from known first 3 bars
 radio('replayChoice','hold');click('lockReplay')
 assert 'Full instructor explanation' in page.locator('.content').inner_text()
 click('advanceReplay');assert 'Revealed 4/8' in page.locator('.content').inner_text()
 page.screenshot(path=str(ROOT/'screenshot_vwap_replay.png'),full_page=True)
 print('vwap replay locked/corrected pass')
 # finish remaining replay using browser state access unavailable; classify via text after feedback by options logic
 expected=['loss','below','reclaim','hold','loss']
 for i,label in enumerate(expected,4):
  radio('replayChoice',label);radio('replayDecision','wait');radio('replayForecast','uncertain');click('lockReplay')
  # Guidance mode may require correction, use built-in feedback (no reveal)
  if 'Correction needed' in page.locator('.content').inner_text():
   for possibility in ['hold','loss','reclaim','failed','below']:
    if possibility==label:continue
    radio('replayChoice',possibility);click('lockReplay')
    if 'Full instructor explanation' in page.locator('.content').inner_text():break
  assert 'Analysis recorded' in page.locator('.content').inner_text(), (i,page.locator('.content').inner_text()[-900:])
  click('advanceReplay')
 assert 'Learning Development Report' in page.locator('h2').inner_text()
 print('vwap full replay pass')
 print('browser errors',errors)
 assert not errors,errors
 browser.close()
