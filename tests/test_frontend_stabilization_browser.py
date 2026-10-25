"""Built-static frontend QA; APIs and external services unavailable by design.
Does not certify authenticated workflows or Cloudflare middleware.
"""
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
import json, mimetypes
ROOT=Path('public').resolve()
OUT=Path('artifacts/frontend-stabilization');OUT.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width in [1440,900,390]:
        for route in ['learn','dashboard','store','labs','bootcamp-academy','admin']:
            context=browser.new_context(viewport={'width':width,'height':900},device_scale_factor=1,reduced_motion='reduce')
            def serve(request_route):
                u=urlparse(request_route.request.url)
                if u.netloc!='fixture.test' or u.path.startswith('/api/'):
                    request_route.fulfill(status=503,content_type='application/json',body='{"ok":false,"error":"Offline QA fixture"}');return
                path=ROOT/unquote(u.path).lstrip('/')
                if not path.suffix:path=path.with_suffix('.html')
                if ROOT not in path.resolve().parents or not path.is_file():
                    request_route.fulfill(status=404,body='');return
                request_route.fulfill(status=200,content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream',body=path.read_bytes())
            context.route('**/*',serve)
            page=context.new_page()
            page.goto('https://fixture.test/'+route+'.html',wait_until='load')
            page.wait_for_timeout(300)
            links=page.locator('a.gu-skip-link')
            assert links.count()==1,(route,width,'duplicate bypass links',links.count())
            target=links.get_attribute('href')
            assert target and page.locator(target).count()==1,(route,'broken bypass target')
            page.keyboard.press('Tab')
            assert links.evaluate('(e)=>document.activeElement===e'),(route,'skip link is not first keyboard stop')
            # Admin controllers replace the initial static gate asynchronously.
            # Assert settled containment, rather than sampling that transition.
            page.wait_for_function('document.documentElement.scrollWidth <= innerWidth + 6',timeout=5000)
            measure=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,scale:visualViewport.scale})')
            assert measure['scale']==1,measure
            assert measure['scroll']<=width+6,(route,width,measure)
            page.screenshot(path=str(OUT/f'{route}-{width}.png'),full_page=True,animations='disabled')
            results.append({'route':route,'width':width,'result':'PASS','measurement':measure})
            context.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2))
print('PASS 18 built-static viewport checks: 100% scale, containment, one keyboard-first bypass link and valid target. Provider workflows NOT tested.')
