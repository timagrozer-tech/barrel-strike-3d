#!/usr/bin/env python3
"""Полный регрессионный прогон VOID FRONTIER 2.0 в Chromium (Playwright) через реальный http-сервер.
Запуск: python3 -m http.server 8081 -d www  &&  python3 tests/full.py
Ускорение: тест подменяет таймеры/HP через JS, но использует реальные функции игры."""
import json,sys,os
from playwright.sync_api import sync_playwright
URL='http://localhost:8081/';OUT=os.environ.get('VF_OUT','/tmp/claude-0/s').rstrip('/')+'/';os.makedirs(OUT,exist_ok=True)
results=[];errors=[]
def ok(name,cond,info=''):
    results.append((name,bool(cond),info));print(('PASS ' if cond else 'FAIL ')+name+(' — '+str(info) if info else ''))
OLD_SAVE={"credits":5400,"weaponLevel":6,"weapon":"plasma","ship":"titan","shipUnlocked":True,"drones":1,"missiles":2,"bestScore":12520,"officeBest":61.3,"officeCleared":True,"lowerMarketKnown":True,"marketVisits":3,"marketRaids":1,"contraband":{"overdrive":True,"armor":False,"jammer":True,"blackMissiles":False,"shadowDrones":False,"phaseShield":False},"caseUnlocked":2,"caseCleared":[True,True,False,False],"caseBest":[3000,4200,0,0],"caseEndings":[],"storyEndings":["chief"],"musicOn":True,"soundOn":True,"settings":{"master":0.7,"fx":0.5,"music":0.2}}
def page(p,vw=412,vh=915):
    b=p.chromium.launch();pg=b.new_page(viewport={'width':vw,'height':vh},device_scale_factor=2,is_mobile=True,has_touch=True)
    pg.on('pageerror',lambda e:errors.append('pageerror: '+str(e)));pg.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None)
    return b,pg
def wait_state(pg,st,ms=15000):
    pg.wait_for_function(f"()=>state==={json.dumps(st)}",timeout=ms)
with sync_playwright() as p:
    # 1. Миграция старого сохранения v1.5
    b,pg=page(p);pg.goto(URL);pg.evaluate(f"localStorage.clear();localStorage.setItem('vf02',{json.dumps(json.dumps(OLD_SAVE))})");pg.reload();pg.wait_for_timeout(800)
    sv=pg.evaluate("JSON.parse(localStorage.getItem('vf02'))")
    ok('migration: credits/weapon/ship preserved',sv['credits']==5400 and sv['weaponLevel']==6 and sv['weapon']=='plasma' and sv['ship']=='titan')
    ok('migration: contraband & cases preserved',sv['contraband']['overdrive'] and sv['contraband']['jammer'] and sv['caseCleared'][:2]==[True,True] and sv['caseUnlocked']==2)
    ok('migration: old storyEndings kept',sv['storyEndings']==['chief'])
    ok('migration: saveVersion=3, hullLevel from old visual tier',sv['saveVersion']==3 and sv['hullLevel']==4,sv['hullLevel'])
    ok('migration: ships owned (astra, titan, specter from shipUnlocked)',sv['ownedShips']==['astra','titan','specter'] and sv['ship']=='titan',sv['ownedShips'])
    ok('migration: settings kept',abs(sv['settings']['master']-0.7)<1e-6 and abs(sv['settings']['music']-0.2)<1e-6)
    ok('migration: backup vf02_backup_v1 written',pg.evaluate("!!localStorage.getItem('vf02_backup_v1')"))
    pg.reload();pg.wait_for_timeout(500)
    ok('reload: profile stable after second load',pg.evaluate("credits")==5400 and pg.evaluate("hullLevel")==4)
    # Экспорт/импорт
    code=pg.evaluate("exportProfileCode()");pg.evaluate("credits=1;persist()")
    pg.evaluate(f"importProfile({json.dumps(code)})")
    ok('profile export/import roundtrip',pg.evaluate("credits")==5400 and pg.evaluate("hullLevel")==4)
    bad=pg.evaluate("(()=>{try{parseProfileCode('VF2:@@@');return 'no'}catch(e){return 'err'}})()")
    ok('import rejects garbage',bad=='err')
    b.close()

    # 2. Кампания: 4 операции + финал + 3 концовки
    b,pg=page(p);pg.goto(URL);pg.evaluate("localStorage.clear()");pg.reload();pg.wait_for_timeout(700)
    pg.click('#start');ok('hangar opens',pg.evaluate('state')=='menu')
    ok('hangar has 5 main tabs + codex/settings icons',pg.locator('.hangar-nav button').count()==5 and pg.locator('[data-tab=settings]').count()==1 and pg.locator('[data-tab=codex]').count()==1)
    pg.click('[data-tab="story"]');ok('4 operations listed',pg.locator('[data-case]').count()==4)
    ok('ops 2-4 locked at start',pg.locator('[data-case]:disabled').count()==3)
    for i in range(4):
        pg.evaluate(f"startCaseStage({i})");ok(f'op{i+1}: briefing',pg.evaluate('state')=='briefing')
        pg.click('#briefGo');ok(f'op{i+1}: combat started',pg.evaluate('state')=='play' and pg.evaluate('mode')=='story')
        pg.evaluate("player.max=1e6;player.hp=1e6");pg.wait_for_function("()=>foes.length>0||kills>0",timeout=8000)
        ok(f'op{i+1}: enemies spawn',True)
        pg.evaluate("()=>{story.reports=3;t=30}");pg.wait_for_function("()=>!!mini",timeout=8000)
        kind=pg.evaluate("mini.kind");ok(f'op{i+1}: correct mini-boss',kind==['duck','flower','slipper','mountain'][i],kind)
        pg.evaluate("mini.y=mini.ty;mini.hp=mini.max*.4");pg.wait_for_timeout(400);ok(f'op{i+1}: mini phase 2',pg.evaluate("mini&&mini.phase2"))
        pg.evaluate("mini.hp=0")
        if i<3:
            wait_state(pg,'caseResult');ok(f'op{i+1}: case result + unlock',pg.evaluate('caseUnlocked')==i+1 and pg.evaluate(f'caseCleared[{i}]'))
        else:
            wait_state(pg,'dialog');ok('op4: interlude before Architect',True);pg.click('#dialogNext')
            pg.evaluate("t=41");pg.wait_for_function("()=>!!boss",timeout=8000);ok('op4: Architect spawned',True)
            pg.evaluate("boss.y=boss.ty")
            for ph,k in [(2,.7),(3,.45),(4,.2)]:
                pg.evaluate(f"boss.hp=boss.max*{k}");pg.wait_for_timeout(500);ok(f'Architect phase {ph}',pg.evaluate('boss&&boss.phase')==ph)
            ok('Architect: wing turrets active in phase 4',pg.evaluate("boss.modules.filter(m=>m.wingMount&&m.hp>0).length")==2)
            pg.screenshot(path=OUT+'f_boss4.png')
            pg.evaluate("boss.hp=0");wait_state(pg,'ending');ok('ending choice shown',pg.locator('#takeChair').count()==1)
            pg.click('#takeChair');wait_state(pg,'ended');ok('ending chief recorded','chief' in pg.evaluate('caseEndings'))
            pg.evaluate("startCaseStage(3)");pg.click('#briefGo');pg.evaluate("()=>{player.max=1e6;player.hp=1e6;story.reports=3;story.suspicion=10;t=30}")
            pg.wait_for_function("()=>!!mini",timeout=8000);pg.evaluate("mini.hp=0");wait_state(pg,'dialog');pg.click('#dialogNext');pg.evaluate("t=41");pg.wait_for_function("()=>!!boss",timeout=8000)
            pg.evaluate("()=>{boss.hp=0;story.suspicion=10;story.caught=0}");wait_state(pg,'ending')
            ok('secret ending unlocked when conditions met',not pg.locator('#goHome').is_disabled());pg.click('#goHome');wait_state(pg,'ended')
            pg.evaluate("startCaseStage(3)");pg.click('#briefGo');pg.evaluate("()=>{player.max=1e6;player.hp=1e6;story.reports=3;t=30}");pg.wait_for_function("()=>!!mini",timeout=8000);pg.evaluate("mini.hp=0");wait_state(pg,'dialog');pg.click('#dialogNext');pg.evaluate("t=41");pg.wait_for_function("()=>!!boss",timeout=8000);pg.evaluate("boss.hp=0");wait_state(pg,'ending');pg.click('#rejectOrder');wait_state(pg,'ended')
            ok('all 3 endings recorded',sorted(pg.evaluate('caseEndings'))==['chief','escape','loop'])
    ok('campaign credits awarded',pg.evaluate('credits')>2000,pg.evaluate('credits'))
    # Прокачка корабля
    pg.evaluate("credits=20000;menu('ship')");pg.click('#hullUp');ok('hull upgrade 1→2',pg.evaluate('hullLevel')==2)
    for _ in range(3):pg.click('#hullUp')
    ok('hull reaches level 5 (5th visual stage)',pg.evaluate('hullLevel')==5 and pg.evaluate("IMG.player5.naturalWidth")>0)
    ok('hull 5 adds drone & HP',pg.evaluate('activeDroneCount()')>=1 and pg.evaluate('shipMaxHp()')==150)
    pg.click('[data-preview="2"]');ok('hangar preview of other stage',pg.evaluate('previewTier')==2)
    pg.click('[data-tab="arsenal"]');pg.click('#upgrade');ok('weapon upgrade still works',pg.evaluate('weaponLevel')==2)
    pg.click('#drone');pg.click('#missile');ok('drones/missiles purchase',pg.evaluate('drones')==1 and pg.evaluate('missiles')==1)
    pg.evaluate("menu('shop')");pg.click('[data-buy="specter"]');ok('shop: buy SPECTER',pg.evaluate('shipUnlocked') and pg.evaluate("ship")=='specter')
    pg.click('[data-buy="valkyrie"]');ok('shop: buy VALKYRIE (class A) and equip',pg.evaluate("ship")=='valkyrie' and 'valkyrie' in pg.evaluate('ownedShips'))
    ok('shop: legendary ARCHON locked by rank',pg.locator('[data-buy="archon"]').count()==0)
    pg.click('[data-equip="astra"]');ok('shop: equip owned ship',pg.evaluate("ship")=='astra')
    pg.evaluate("ship='valkyrie';mode='endless';reset()");ok('VALKYRIE: pierce + dmg x1.15',pg.evaluate("Math.abs(perkDamage-1.15)<1e-6"))
    pg.evaluate("firePrimary()");ok('VALKYRIE shots pierce',pg.evaluate("shots.some(b=>b.pierce===1)"))
    pg.evaluate("ownedShips.push('bastion');ship='bastion';reset();inv=0;hit(30)");ok('BASTION shield absorbs a hit',pg.evaluate("player.hp===player.max"))
    pg.evaluate("ownedShips.push('archon');ship='archon';reset();inv=0;player.hp=5;hit(50)");ok('ARCHON second chance',pg.evaluate("!player.dead&&player.revived&&player.hp>0"))
    pg.evaluate("ship='astra';persist();menu('rewards')")
    ok('achievements unlocked during play (kills/hull/weapon...)',pg.evaluate('achievements.length')>=3,pg.evaluate('achievements'))
    c0=pg.evaluate('credits');pg.click('#claimDaily');ok('daily reward claimed once',pg.evaluate('credits')>c0 and pg.evaluate('dailyAvailable()')==False)
    ok('rank & XP progress',pg.evaluate('pilotXp')>0)
    pg.click('#playChallenge');ok('daily challenge starts with modifiers',pg.evaluate("!!challengeActive&&mode==='endless'&&state==='play'"))
    pg.evaluate("player.max=1e6;player.hp=1e6;waveClock=71.9");pg.wait_for_function("()=>challengeDoneToday()",timeout=8000);ok('daily challenge completes at wave 6',pg.evaluate('stats.challenges')==1)
    ok('persisted after purchases',json.loads(pg.evaluate("localStorage.getItem('vf02')"))['hullLevel']==5)
    b.close()

    # 3. Штаб → КПП → рынок → покупка → возврат
    b,pg=page(p);pg.goto(URL);pg.evaluate("localStorage.clear()");pg.reload();pg.wait_for_timeout(600)
    pg.click('#start');pg.click('#deployBtn');pg.click('#mOffice');ok('prologue',pg.evaluate('state')=='intro')
    pg.click('#prologueOffice');ok('office mission running',pg.evaluate('state')=='office')
    pg.wait_for_timeout(600);pg.screenshot(path=OUT+'f_office.png')
    pg.evaluate("credits=3000;officeRun.hero.x=440;officeRun.hero.y=745;officeRun.target={x:454,y:755}");pg.wait_for_timeout(700)
    ok('lower market reached via checkpoint door',pg.evaluate('state')=='market')
    pg.wait_for_timeout(400);pg.screenshot(path=OUT+'f_market.png')
    pg.evaluate("marketRun.shopCd=0;marketRun.hero.x=170;marketRun.hero.y=340;marketRun.target={x:170,y:340}");pg.wait_for_function("()=>state==='marketShop'",timeout=5000)
    pg.click('#lmBuy');ok('contraband purchased (overdrive)',pg.evaluate('contraband.overdrive') and pg.evaluate('credits')==2480)
    pg.click('#lmBack');pg.evaluate("marketRun.hero.x=270;marketRun.hero.y=885;marketRun.target={x:270,y:890}");pg.wait_for_timeout(500)
    ok('returned to office from market',pg.evaluate('state')=='office')
    pg.evaluate("()=>{for(const t of officeRun.tasks){officeRun.hero.x=t.x;officeRun.hero.y=t.y;officeMission.update(.016)}}");pg.evaluate("officeRun.hero.x=270;officeRun.hero.y=200;officeMission.update(.016)")
    ok('office mission complete',pg.evaluate('state')=='officeComplete' and pg.evaluate('officeCleared'))
    pg.click('#officeFly');pg.click('#briefGo');ok('contraband affects combat (+18% dmg)',abs(pg.evaluate('perkDamage')-1.18)<1e-6)
    ok('office gives starting clue',pg.evaluate('story.reports')==1)
    # Пауза
    pg.click('#pause');ok('pause',pg.evaluate('state')=='pause');pg.click('#resume');ok('resume',pg.evaluate('state')=='play')
    # Сворачивание
    pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))");b.close()

    # 4. Бездна и Парад
    b,pg=page(p);pg.goto(URL);pg.evaluate("localStorage.clear()");pg.reload();pg.wait_for_timeout(600)
    pg.click('#start');pg.click('#deployBtn');pg.click('#mEndless');ok('endless running (not challenge)',pg.evaluate('challengeActive') is None);ok('endless running',pg.evaluate('mode')=='endless' and pg.evaluate('state')=='play')
    pg.evaluate("player.max=1e6;player.hp=1e6;waveClock=35.9");pg.wait_for_function("()=>state==='perk'",timeout=5000);ok('endless perk offer at wave 3',True)
    pg.click('#perk1');ok('perk applied',abs(pg.evaluate('perkDamage')-1.2)<1e-6 and pg.evaluate('state')=='play')
    pg.evaluate("waveClock=48");pg.wait_for_function("()=>!!mini",timeout=5000);ok('endless mini-boss at wave 5',True)
    pg.evaluate("mini.hp=0");pg.wait_for_timeout(300);pg.evaluate("waveClock=108");pg.wait_for_function("()=>!!boss",timeout=5000);ok('endless Architect at wave 10',True)
    pg.evaluate("boss.hp=0");pg.wait_for_timeout(400);ok('endless continues after boss',pg.evaluate('state')=='play' and pg.evaluate('boss')is None)
    pg.evaluate("player.max=100;player.hp=1;inv=0;hit(50)");pg.wait_for_function("()=>state==='lose'",timeout=5000);ok('death → result screen',pg.locator('.result').count()==1)
    ok('abyss best wave saved',json.loads(pg.evaluate("localStorage.getItem('vf02')"))['abyssBestWave']>=10)
    pg.evaluate("menu();showModeSelect()");pg.click('#mParade');ok('parade running',pg.evaluate('mode')=='parade')
    pg.evaluate("player.max=1e6;player.hp=1e6")
    seen=[]
    for i in range(8):
        pg.evaluate("paradeRest=0");pg.wait_for_function("()=>!!mini",timeout=8000);seen.append(pg.evaluate('mini.kind'));pg.evaluate("mini.hp=0");pg.wait_for_timeout(250)
    wait_state(pg,'win');ok('parade: all 8 mini-bosses then win',len(set(seen))==8,seen)
    b.close()

    # 5. Вьюпорты
    for vw,vh in [(360,720),(390,844),(412,915)]:
        b,pg=page(p,vw,vh);pg.goto(URL);pg.wait_for_timeout(700)
        ok(f'{vw}x{vh}: splash fits',pg.evaluate("document.querySelector('#panel').scrollHeight<=document.querySelector('#panel').clientHeight+2"))
        pg.screenshot(path=OUT+f'v_{vw}_splash.png');pg.click('#start')
        ok(f'{vw}x{vh}: no horizontal overflow',pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        ok(f'{vw}x{vh}: deploy button visible',pg.locator('#deployBtn').is_visible())
        pg.screenshot(path=OUT+f'v_{vw}_hangar.png')
        pg.click('#deployBtn');pg.click('#mEndless');pg.wait_for_timeout(1500)
        r=pg.evaluate("[document.querySelector('#game').getBoundingClientRect().width,document.querySelector('#game').getBoundingClientRect().height,H]")
        ok(f'{vw}x{vh}: canvas keeps aspect (no stretch)',abs(r[0]/r[1]-540/r[2])<0.01,r)
        bb=pg.evaluate("JSON.stringify(document.querySelector('#bomb').getBoundingClientRect())");pb=json.loads(bb)
        ok(f'{vw}x{vh}: bomb button inside screen',pb['right']<=vw and pb['bottom']<=vh)
        pg.screenshot(path=OUT+f'v_{vw}_play.png');b.close()
    # Прокрутка ангара пальцем (touch-action не должен блокировать)
    b,pg=page(p);pg.goto(URL);pg.wait_for_timeout(500);pg.click('#start');pg.click('[data-tab="rewards"]')
    ta=pg.evaluate("[getComputedStyle(document.body).touchAction,getComputedStyle(document.querySelector('.hangar-content')).touchAction]")
    ok('hangar is touch-scrollable (body not touch-action:none)',ta[0]!='none' and 'pan-y' in ta[1],ta)
    pg.mouse.move(206,600);sc0=pg.evaluate("document.querySelector('.hangar-content').scrollTop");pg.mouse.wheel(0,600);pg.wait_for_timeout(300)
    ok('hangar content scrolls',pg.evaluate("document.querySelector('.hangar-content').scrollTop")>sc0);b.close()
ok('no JS errors',not errors,errors[:5])
fails=[r for r in results if not r[1]]
print(f'\nИТОГО: {len(results)-len(fails)}/{len(results)} PASS')
sys.exit(1 if fails else 0)
