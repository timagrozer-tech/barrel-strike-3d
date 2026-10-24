import sys,json
from playwright.sync_api import sync_playwright
OUT='/tmp/claude-0/s/'
vw,vh=(int(x) for x in (sys.argv[1] if len(sys.argv)>1 else '412x915').split('x'))
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':vw,'height':vh},device_scale_factor=2,is_mobile=True,has_touch=True)
    errs=[];pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    pg.goto('http://localhost:8081/');pg.wait_for_timeout(1200)
    pg.screenshot(path=OUT+'q_splash.png')
    pg.click('#start');pg.wait_for_timeout(600);pg.screenshot(path=OUT+'q_hangar.png')
    for tab in ['arsenal','story','codex','settings']:
        pg.click(f'[data-tab="{tab}"]');pg.wait_for_timeout(300);pg.screenshot(path=OUT+f'q_{tab}.png')
    pg.click('#deployBtn');pg.wait_for_timeout(300);pg.screenshot(path=OUT+'q_modes.png')
    pg.click('#mCampaign');pg.wait_for_timeout(300);pg.screenshot(path=OUT+'q_brief.png')
    pg.click('#briefGo');pg.wait_for_timeout(5000);pg.screenshot(path=OUT+'q_play.png')
    print('state',pg.evaluate('state'),'H',pg.evaluate('H'),'foes',pg.evaluate('foes.length'),'fps',pg.evaluate('perfMon.fps'))
    print('errors',errs[:10])
    b.close()
