from playwright.sync_api import sync_playwright
O='/tmp/claude-0/s/v21_'
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':412,'height':915},device_scale_factor=2,is_mobile=True,has_touch=True)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    pg.goto('http://localhost:8081/');pg.evaluate("localStorage.clear()");pg.reload();pg.wait_for_timeout(900)
    pg.evaluate("credits=30000;pilotXp=20000;persist()");pg.click('#start');pg.wait_for_timeout(500);pg.screenshot(path=O+'ship.png')
    for t in ['shop','rewards','codex']:
        pg.click(f'[data-tab="{t}"]');pg.wait_for_timeout(400);pg.screenshot(path=O+t+'.png')
    pg.click('[data-tab="shop"]');pg.click('[data-buy="archon"]');pg.wait_for_timeout(400);pg.screenshot(path=O+'shop2.png')
    pg.evaluate("settings.quality='high';applyQuality();mode='endless';reset();player.max=1e9;player.hp=1e9;spawnBoss();boss.y=boss.ty");pg.wait_for_timeout(2500);pg.screenshot(path=O+'boss1.png')
    for ph,k in [(2,.7),(3,.45),(4,.2)]:
        pg.evaluate(f"boss.hp=boss.max*{k}");pg.wait_for_timeout(2600);pg.screenshot(path=O+f'boss{ph}.png')
    print('errs',errs[:5]);b.close()
