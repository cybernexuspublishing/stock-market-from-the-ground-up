"""Public production browser release gate. Does not bypass authentication or claim member acceptance."""
import os
from urllib.parse import urlparse, parse_qs
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.getenv('GU_PRODUCTION_URL','https://stock-market-from-the-ground-up-d1r.pages.dev').rstrip('/')
OUT=Path('artifacts/premium-browser')
OUT.mkdir(parents=True,exist_ok=True)
ROUTES=['','learn.html','labs.html','bootcamp-academy.html','store.html','dashboard.html','market-commons.html','simulator.html','journal.html','admin.html']
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    failures=[]
    # Layout success does not establish that deployed Functions execute.
    api=pw.request.new_context()
    for endpoint in ['/api/runtime-health-v014259','/api/website-design']:
        try:
            response=api.get(BASE+endpoint,timeout=30000)
            assert response.status==200,f'HTTP {response.status}'
            assert 'application/json' in response.headers.get('content-type',''),'Expected JSON; static HTML fallback is not a working API'
            data=response.json()
            if endpoint.endswith('website-design'):
                assert data.get('ok') is True and data.get('design',{}).get('theme') in ['premium-dark','premium-light']
                assert type(data['design'].get('revision')) is int
            else:
                assert data.get('service')=='ground-up-pages-functions'
                assert response.headers.get('x-gu-functions')=='v014259'
            print('PASS production API contract '+endpoint)
        except Exception as exc:
            failures.append(f'Production API {endpoint}: {exc}')
    api.dispose()
    for width in [1440,900,390]:
        for route in ROUTES:
            page=browser.new_page(viewport={'width':width,'height':900},device_scale_factor=1)
            url=f'{BASE}/{route}'
            errors=[]
            page.on('pageerror',lambda error, bucket=errors:bucket.append(str(error)))
            try:
                response=page.goto(url,wait_until='domcontentloaded',timeout=30000)
                page.wait_for_timeout(1300)
                status=response.status if response else 0
                if status>=400: raise AssertionError(f'HTTP {status}')
                # Guests cannot inspect protected learning, account, staff or
                # journal UI. A same-origin sign-in redirect with a preserved
                # return path is the PASS condition, not a missing layout hook.
                protected_routes={'labs.html','bootcamp-academy.html','dashboard.html',
                                  'market-commons.html','simulator.html','journal.html','admin.html'}
                final=urlparse(page.url)
                signin_redirect=route in protected_routes and final.path.rstrip('/') in ['/signin','/signin.html']
                if signin_redirect:
                    assert final.netloc==urlparse(BASE).netloc,'Cross-origin authentication redirect'
                    return_paths=parse_qs(final.query).get('next',[])
                    expected={'/'+route,'/'+route.removesuffix('.html')}
                    assert len(return_paths)==1 and return_paths[0] in expected,(
                        'Protected route lost intended destination',route,return_paths)
                    # Sign-in can arrive after the protected-route redirect and layout hydration.
                    # Still require the real password field: a redirect or loading shell alone cannot pass.
                    page.locator('input[type="password"]').wait_for(state='visible',timeout=12000)
                    assert page.locator('input[type="password"]').count()==1,'Missing sign-in form'
                    assert page.locator('body').get_attribute('data-gu-layout-route')=='signin','Missing sign-in layout hook'
                    if route=='market-commons.html':
                        assert page.locator('#gu-commons-root').count()==0,'Protected Commons content exposed'
                    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 6'),'Sign-in page horizontal overflow'
                    page.screenshot(path=str(OUT/f'{route.removesuffix(".html")}-signin-{width}.png'),full_page=True,animations='disabled')
                    print(f'PASS protected {route} sign-in return boundary {width}px')
                    continue
                if route in protected_routes:
                    assert final.path.rstrip('/') in ['/'+route,'/'+route.removesuffix('.html')],(
                        'Protected route redirected to an unauthorized destination',route,final.path)
                if route=='':
                    main=page.locator('main.gu-premium-home')
                    assert main.count()==1,'Premium home overwritten by legacy renderer'
                    assert page.locator('.gu-home-terminal').count()==1,'Missing chart workstation'
                    assert page.locator('#v132-home').count()==0,'Legacy homepage replaced premium design'
                    css=page.locator('.gu-home-stage').evaluate('(e)=>getComputedStyle(e).backgroundImage')
                    assert 'gradient' in css,'Premium hero background not painted'
                if route in ['learn.html','labs.html','bootcamp-academy.html','store.html','dashboard.html','market-commons.html','simulator.html','journal.html','admin.html']:
                    route_name=route.removesuffix('.html')
                    current=page.locator('body').get_attribute('data-gu-layout-route')
                    assert current==route_name,f'Missing sitewide layout hook on {route}: {current!r}'
                    assert page.locator('link[href*="sitewide-composition-v014234.css"]').count()>=1,'Shared CSS not injected'
                if route=='dashboard.html' and page.locator('.gu-single-member-nav').count():
                    assert page.locator('.v1322-member-tabs').is_hidden(),'Duplicate tab strip visible alongside authoritative sidebar'
                if width==390:
                    overflow=page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 6')
                    if overflow: failures.append(f'Horizontal overflow: {route or "home"} at {width}px')
                name=(route.removesuffix('.html') or 'home')
                page.screenshot(path=str(OUT/f'{name}-{width}.png'),full_page=True,animations='disabled')
                print(f'RETRIEVED {route or "/"} {width}px HTTP {status}, JS errors={len(errors)}')
                if route=='' and errors: failures.append('Homepage JavaScript exception: '+errors[0])
            except Exception as exc:
                failures.append(f'{url} {width}px: {exc}')
            page.close()
    browser.close()
assert not failures,'\n'.join(failures)
print('PASS public production viewport and structural smoke. Authenticated workflows remain outside this test.')
