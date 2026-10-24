import sys
from playwright.sync_api import sync_playwright
url=sys.argv[1]; out=sys.argv[2]
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':412,'height':915},device_scale_factor=2,is_mobile=True,has_touch=True)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(url);pg.wait_for_timeout(800)
    pg.click('#start');pg.click('[data-tab="story"]');pg.click('[data-case="0"]')
    pg.wait_for_timeout(6000);pg.screenshot(path=out)
    print('state',pg.evaluate('state'),'canvas',pg.evaluate('JSON.stringify(document.querySelector("#game").getBoundingClientRect())'),'errs',errs)
    b.close()
