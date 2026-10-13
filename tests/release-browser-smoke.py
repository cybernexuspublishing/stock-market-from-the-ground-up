"""Pure fixture browser checks; not live Supabase or Cloudflare acceptance."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width in (1440,860,390):
        page=browser.new_page(viewport={'width':width,'height':900})
        page.set_content('''<form id="edit"><label><input name="title" value="A Lesson"></label><label><input name="summary" value="Sample"></label><label><textarea name="body_text">Existing approved text</textarea></label></form><section id="preview"><div class="site-page-live-body"></div></section>''')
        page.add_style_tag(path=str(root/'assets/css/page-composer.css'))
        page.add_script_tag(path=str(root/'assets/js/page-composer.js'))
        page.evaluate('window.GroundUpPageComposer.mount(document.querySelector("#edit"),document.querySelector("#preview"))')
        page.on('dialog',lambda d:d.accept())
        page.get_by_text('Enable block editor').click()
        page.locator('[data-add=heading]').click()
        page.locator('[data-blocks] [data-row="heading"] textarea').fill('Market evidence & <script>')
        body=page.locator('[name=body_text]').input_value()
        assert body.startswith('GU_BLOCKS_V1:')
        assert '<script>' not in page.locator('#preview .site-page-live-body').inner_html()
        assert 'Market evidence &amp; &lt;script&gt;' in page.locator('#preview .site-page-live-body').inner_html()
        assert page.locator('.gu-page-composer').evaluate('(el)=>el.scrollWidth<=el.clientWidth+2')
        page.close()
    page=browser.new_page(viewport={'width':900,'height':900})
    page.set_content('<form id="form"><label><textarea name="fields">[{"name":"email","label":"Email","type":"email","required":true}]</textarea></label></form>')
    page.add_script_tag(path=str(root/'assets/js/form-composer.js'))
    page.evaluate('window.GroundUpFormComposer.mount(document.querySelector("#form"))')
    page.get_by_text('Add Field').click()
    assert 'field_2' in page.locator('[name=fields]').input_value()
    page.locator('.gu-form-field').nth(1).locator('[name=name]').fill('email')
    assert not page.locator('[name=fields]').evaluate('(el)=>el.validity.valid')
    page.locator('.gu-form-field').nth(1).locator('[name=name]').fill('comment')
    assert page.locator('[name=fields]').evaluate('(el)=>el.validity.valid')
    browser.close()
print('Browser fixture checks PASS: visual CMS, XSS-escaped preview, responsive widths, form field uniqueness')
