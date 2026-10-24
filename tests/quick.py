#!/usr/bin/env python3
"""Скриншоты экранов дизайна №2 (штаб, флот, операции, досье, награды, настройки, бой) на 360/412 px. VF_OUT задаёт папку."""
import sys
from playwright.sync_api import sync_playwright
import os;OUT=os.environ.get('VF_OUT','/tmp/vf_shots').rstrip('/')+'/';os.makedirs(OUT,exist_ok=True)
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch()
  for vw,vh in [(360,720),(412,915)]:
    pg=b.new_page(viewport={'width':vw,'height':vh},device_scale_factor=2,has_touch=True)
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto('http://localhost:8081/index.html');pg.evaluate("localStorage.clear()");pg.reload();pg.wait_for_timeout(1200)
    def shot(n):pg.wait_for_timeout(400);pg.screenshot(path=OUT+f'{vw}_{n}.png')
    shot('home')
    for t in ['fleet','ops','dossier','awards']:
      pg.evaluate(f"menu('{t}')");shot(t)
    pg.evaluate("fleetSub='shop';menu('fleet')");shot('shipyard')
    pg.evaluate("fleetSub='arsenal';menu('fleet')");shot('arsenal')
    pg.evaluate("menu('settings')");shot('settings')
    pg.evaluate("fleetSub='ship';menu('fleet')");pg.click('#hullUp');shot('confirm')
    pg.evaluate("document.querySelector('.confirm-wrap')&&document.querySelector('.confirm-wrap').remove();menu('home')")
    pg.click('#continue');shot('briefing')
    pg.evaluate("[...document.querySelectorAll('#panel button')].pop().click()");pg.wait_for_timeout(300);shot('after_brief')
    for i in range(4):
      if pg.evaluate("state")!='play':pg.evaluate("[...document.querySelectorAll('#panel button')].pop().click()");pg.wait_for_timeout(300)
    pg.wait_for_timeout(2500);shot('combat')
    pg.evaluate("spawnBoss('architect');boss.y=boss.ty");pg.wait_for_timeout(800);shot('boss')
    pg.evaluate("pauseGame()");shot('pause')
    pg.close()
  b.close()
print('ERRS',errs[:10])
