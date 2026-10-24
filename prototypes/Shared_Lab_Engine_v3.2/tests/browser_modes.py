from pathlib import Path
from playwright.sync_api import sync_playwright
HTML=(Path(__file__).resolve().parents[1]/'Preview_Standalone.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(HTML,wait_until='load')
 def btn(action):return page.locator(f'button[data-action="{action}"]').first
 def choose(k,v):page.locator(f'input[data-input="{k}"][value="{v}"]').check()
 btn('next').click();choose('introAnswer','range');btn('introCheck').click();assert '25%' in page.locator('.progress-value').inner_text()
 btn('modeMenu').click();page.locator('button[data-action="selectMode"][data-value="Practice"]').click()
 assert 'Practice' in page.locator('.red').inner_text()
 btn('cancelMode').click();assert 'Guided' in page.locator('.toolbar').inner_text()
 btn('modeMenu').click();page.locator('button[data-action="selectMode"][data-value="Assessment"]').click();btn('confirmMode').click()
 assert 'Assessment' in page.locator('.toolbar').inner_text() and '0%' in page.locator('.progress-value').inner_text()
 # Switch lab, then advance to >=33% to test grey lock and explicit reset
 page.locator('#lab-select').select_option('vwap');btn('next').click();choose('introAnswer','sum');btn('introCheck').click();choose('expAnswer','weight');btn('expCheck').click()
 assert '38%' in page.locator('.progress-value').inner_text()
 assert page.locator('button[data-action="modeMenu"]').first.is_disabled()
 page.locator('button[data-action="modeMenu"]').last.click()
 page.locator('button[data-action="selectMode"][data-value="Practice"]').click()
 btn('confirmMode').click()
 assert page.locator('h2').inner_text().startswith('Welcome') and '0%' in page.locator('.progress-value').inner_text()
 print('mode lock / reset tests passed; errors',errors);assert not errors;b.close()
