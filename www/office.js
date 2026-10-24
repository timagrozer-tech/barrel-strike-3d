'use strict';
/* VOID FRONTIER v1.0 — самостоятельная сцена проникновения в штаб.
 * Не использует физику шутера: отдельная карта, предметы, патрули, конусы видимости.
 * Не требует сервера и сторонних библиотек. Нельзя войти в кабинет сквозь столы.
 */
const HQ_WALLS=[
 {x:40,y:347,w:144,h:19},{x:356,y:347,w:144,h:19},
 {x:40,y:601,w:144,h:19},{x:356,y:601,w:144,h:19},
 {x:67,y:693,w:111,h:48},{x:363,y:688,w:106,h:47},
 {x:67,y:439,w:111,h:49},{x:363,y:439,w:108,h:49},
 {x:77,y:214,w:100,h:46},{x:361,y:215,w:108,h:44}
];
const HQ_COVER=[{x:51,y:798,w:66,h:70},{x:419,y:797,w:68,h:69},{x:55,y:517,w:56,h:56},{x:433,y:513,w:51,h:58}];
const HQ_TASKS=[
 {x:134,y:773,kind:'РАПОРТ',title:'Журнал службы',taken:false},
 {x:415,y:526,kind:'EXCEL',title:'Телеметрия флагмана',taken:false},
 {x:123,y:294,kind:'ПРИКАЗ',title:'Карточка розыска № 000',taken:false}
];
let officeRun=null;
const HQ_NAV={minX:46,maxX:494,minY:177,maxY:896};
const HQ_ANGLE=Math.cos(.59);
const HQ_BONUS=[
 {x:412,y:766,title:'ЧАЙ НАЧАЛЬСТВУ',reward:120},
 {x:128,y:535,title:'КАРТРИДЖ ДЛЯ ПРИНТЕРА',reward:150},
 {x:414,y:318,title:'СРОЧНАЯ ПЕЧАТЬ',reward:140}
];
const HQ_LOWER_MARKET={door:{x:454,y:755,r:25},corridor:{x1:374,x2:494},checkpoints:[{y:858,phase:0},{y:812,phase:1.25},{y:765,phase:2.2}]};
function hqBeamGap(beam,time){return 430+Math.sin(time*1.45+beam.phase)*34}
function hqBeamHit(hero,beam,time){if(hero.x<HQ_LOWER_MARKET.corridor.x1||hero.x>HQ_LOWER_MARKET.corridor.x2)return false;if(Math.abs(hero.y-beam.y)>7)return false;return Math.abs(hero.x-hqBeamGap(beam,time))>26}

function hqRectHit(x,y,r,rect){let nearestX=Math.max(rect.x,Math.min(x,rect.x+rect.w)),nearestY=Math.max(rect.y,Math.min(y,rect.y+rect.h));return (x-nearestX)**2+(y-nearestY)**2<(r*r)}
function hqSolid(x,y,r=14){if(x-r<HQ_NAV.minX||x+r>HQ_NAV.maxX||y-r<HQ_NAV.minY||y+r>HQ_NAV.maxY)return true;return [...HQ_WALLS,...HQ_COVER].some(rect=>hqRectHit(x,y,r,rect))}
function hqBlockedSight(x1,y1,x2,y2){const d=Math.hypot(x2-x1,y2-y1),steps=Math.ceil(d/14);for(let i=1;i<steps;i++){const f=i/steps;const x=x1+(x2-x1)*f,y=y1+(y2-y1)*f;if(HQ_WALLS.some(rect=>rect.x<=x&&x<=rect.x+rect.w&&rect.y<=y&&y<=rect.y+rect.h))return true;if(HQ_COVER.some(rect=>rect.x<=x&&x<=rect.x+rect.w&&rect.y<=y&&y<=rect.y+rect.h))return true}return false}
function hqMoveHero(x,y){const h=officeRun.hero;const desiredX=Math.max(HQ_NAV.minX+14,Math.min(HQ_NAV.maxX-14,x)),desiredY=Math.max(HQ_NAV.minY+14,Math.min(HQ_NAV.maxY-14,y));if(!hqSolid(desiredX,h.y))h.x=desiredX;if(!hqSolid(h.x,desiredY))h.y=desiredY}
function hqOfficer(x,y,stops,speed=70,range=145){return {x,y,stops,waypoint:1,angle:0,speed,range,noticed:false,blink:0}}
function hqAnnouncement(message,duration=2.6){if(!officeRun)return;officeRun.announcement=message;officeRun.announceTime=duration}
function hqButtons(){if(!officeRun)return;hideBtn.textContent=officeRun.hideCd>0?'ALT+TAB '+Math.ceil(officeRun.hideCd)+'с':'⌨ ALT+TAB';freezeBtn.textContent=officeRun.freezeCd>0?'EXCEL '+Math.ceil(officeRun.freezeCd)+'с':'❄ EXCEL ЗАВИС';hideBtn.disabled=officeRun.hideCd>0;freezeBtn.disabled=officeRun.freezeCd>0}
const officeMission={
 start(){
  mode='story';state='office';panel.classList.remove('hangar','office-dialog');panel.style.display='none';bombBtn.style.display='none';pauseBtn.style.display='block';hideBtn.style.display='block';freezeBtn.style.display='block';
  officeRun={hero:{x:270,y:837},target:{x:270,y:837},tasks:HQ_TASKS.map(t=>({...t})),
   patrols:[hqOfficer(232,680,[{x:190,y:680},{x:350,y:680}],68,139),hqOfficer(350,517,[{x:350,y:402},{x:350,y:555}],73,145),hqOfficer(215,285,[{x:188,y:285},{x:356,y:285}],62,153)],
   elapsed:0,alert:12,caught:0,delivered:0,bonus:{...HQ_BONUS[Math.floor(Math.random()*HQ_BONUS.length)],taken:false},hide:0,hideCd:0,freeze:0,freezeCd:0,guardCooldown:0,
   alarm:false,announcement:'СОБЕРИ 3 МАТЕРИАЛА ПО ДЕЛУ СОЧ',announceTime:4,
   exitReady:false,keys:new Set(),footTime:0,chief:null,marketKnown:false,marketVisited:false,beamCd:0,beamHits:0};
  target={x:270,y:837};audio.scene='';audio.beat=0;audio.step=0;sfx('door');hqButtons();last=performance.now();
 },
 point(e){if(!officeRun)return;const r=c.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;officeRun.target={x:clamp(x,60,480),y:clamp(y,184,886)}},
 hide(){if(state!=='office'||!officeRun||officeRun.hideCd>0)return;officeRun.hide=3.2;officeRun.hideCd=15;officeRun.alert=Math.max(0,officeRun.alert-22);hqAnnouncement('ALT+TAB · НЕВИДИМ ДЛЯ ПАТРУЛЯ',1.8);sfx('hide');hqButtons()},
 freeze(){if(state!=='office'||!officeRun||officeRun.freezeCd>0)return;officeRun.freeze=4;officeRun.freezeCd=20;hqAnnouncement('EXCEL ЗАВИС · ПАТРУЛИ ОСТАНОВЛЕНЫ',1.8);sfx('freeze');hqButtons()},

 market(){
  if(!officeRun||state!=='office')return;
  lowerMarketKnown=true;officeRun.marketVisited=true;persist();
  marketMission.start();
 },
 pause(){if(state!=='office')return;state='officePause';panel.style.display='block';panel.innerHTML='<div class="dialog-scene"><h1>ПАУЗА · ШТАБ</h1><p>Твои документы и патрули остаются на месте.</p><button id="officeResume">ПРОДОЛЖИТЬ</button><button id="officeQuit" class="ghost">В АНГАР</button></div>';document.querySelector('#officeResume').onclick=()=>{state='office';panel.style.display='none';last=performance.now()};document.querySelector('#officeQuit').onclick=()=>menu('story')},
 update(dt){
  const r=officeRun;if(!r)return;r.elapsed+=dt;r.announceTime=Math.max(0,r.announceTime-dt);r.hide=Math.max(0,r.hide-dt);r.hideCd=Math.max(0,r.hideCd-dt);r.freeze=Math.max(0,r.freeze-dt);r.freezeCd=Math.max(0,r.freezeCd-dt);r.guardCooldown=Math.max(0,r.guardCooldown-dt);r.beamCd=Math.max(0,r.beamCd-dt);
  if(r.elapsed<dt+.03||Math.floor((r.elapsed-dt)*4)!==Math.floor(r.elapsed*4))hqButtons();
  musicTick(dt);
  const h=r.hero;
  let dx=r.target.x-h.x,dy=r.target.y-h.y;
  if(r.keys.has('arrowleft')||r.keys.has('a'))dx=-150;
  if(r.keys.has('arrowright')||r.keys.has('d'))dx=150;
  if(r.keys.has('arrowup')||r.keys.has('w'))dy=-150;
  if(r.keys.has('arrowdown')||r.keys.has('s'))dy=150;
  if(Math.hypot(dx,dy)>5){const speed=r.keys.has('shift')?208:172;const step=Math.min(speed*dt,Math.hypot(dx,dy)),length=Math.hypot(dx,dy);hqMoveHero(h.x+dx/length*step,h.y+dy/length*step);r.footTime+=dt;if(r.footTime>.29){r.footTime=0;sfx('step')}}
  if(!r.bonus.taken&&Math.hypot(h.x-r.bonus.x,h.y-r.bonus.y)<30){r.bonus.taken=true;r.alert=Math.max(0,r.alert-18);hqAnnouncement('ПОРУЧЕНИЕ ВЫПОЛНЕНО: '+r.bonus.title,2.5);sfx('collect')}
  // Lower checkpoint route to the black market: timed beam scanners with moving gaps.
  if(!r.marketKnown&&h.x>390&&h.y>730){r.marketKnown=true;lowerMarketKnown=true;persist();hqAnnouncement('НИЖНЕЕ КПП: ПРОЙДИ СКАНЕРЫ К ФИОЛЕТОВОЙ ДВЕРИ',3.2);sfx('dialog')}
  if(r.freeze<=0&&r.hide<=0){for(const beam of HQ_LOWER_MARKET.checkpoints){if(hqBeamHit(h,beam,r.elapsed)&&r.beamCd<=0){r.beamCd=1.05;r.beamHits++;r.alert=clamp(r.alert+18,0,100);hqAnnouncement('СКАНЕР НИЖНЕГО КПП ЗАСЁК ТЕБЯ',2.2);sfx('warning');break}}}
  if(Math.hypot(h.x-HQ_LOWER_MARKET.door.x,h.y-HQ_LOWER_MARKET.door.y)<HQ_LOWER_MARKET.door.r){officeMission.market();return}
  for(const task of r.tasks){if(task.taken)continue;if(Math.hypot(h.x-task.x,h.y-task.y)<31){task.taken=true;r.delivered++;r.alert=Math.max(0,r.alert-12);hqAnnouncement('СОБРАНО: '+task.title.toUpperCase(),2.1);sfx('paper');if(r.delivered===r.tasks.length){r.exitReady=true;hqAnnouncement('ВСЕ ДОКУМЕНТЫ НАЙДЕНЫ! К ВЫХОДУ ↑',3.6);sfx('upgrade')}}}
  let detected=false;
  for(const guard of r.patrols){
   guard.blink=Math.max(0,guard.blink-dt);
   if(r.freeze<=0){const goal=guard.stops[guard.waypoint];const x=goal.x-guard.x,y=goal.y-guard.y;const distance=Math.hypot(x,y);if(distance<6){guard.waypoint=(guard.waypoint+1)%guard.stops.length}else{const n=Math.min(distance,guard.speed*dt);guard.x+=x/distance*n;guard.y+=y/distance*n;guard.angle=Math.atan2(y,x)}}
   const dist=Math.hypot(h.x-guard.x,h.y-guard.y);
   if(r.hide<=0&&r.freeze<=0&&dist<guard.range&&dist>0&&((h.x-guard.x)/dist*Math.cos(guard.angle)+(h.y-guard.y)/dist*Math.sin(guard.angle))>HQ_ANGLE&&!hqBlockedSight(guard.x,guard.y,h.x,h.y)){
    detected=true;if(!guard.noticed&&guard.blink<=0){sfx('warning');guard.blink=2.8}guard.noticed=true;
   }else guard.noticed=false;
  }
  // The chief only appears when the player is repeatedly noticed.
  if(r.alert>=72&&!r.chief){r.chief=hqOfficer(268,203,[{x:200,y:203},{x:340,y:203}],85,178);r.patrols.push(r.chief);hqAnnouncement('НАЧАЛЬСТВО ИДЁТ! ПОЯВИЛСЯ ГЛАВНЫЙ ПАТРУЛЬ',3);sfx('alert')}
  r.alert=clamp(r.alert+(detected?31:-8)*dt,0,100);
  if(r.alert>=100&&r.guardCooldown<=0){
   r.caught++;r.guardCooldown=3.1;r.alert=42;hqAnnouncement(r.caught>=3?'ТЕБЯ ПОЙМАЛИ. КОНЕЦ СМЕНЫ!':'ПОЙМАЛИ! ПОПЫТКА '+r.caught+' / 3',3.1);sfx('caught');
   if(r.caught>=3){officeMission.lose();return}
   const taken=r.tasks.filter(t=>t.taken).pop();if(taken){taken.taken=false;r.delivered--;r.exitReady=false}
   h.x=270;h.y=837;r.target={x:270,y:837};r.hide=2; // Spawn protection.
  }
  if(r.exitReady&&Math.hypot(h.x-270,h.y-191)<45){officeMission.win()}
 },
 win(){
  const r=officeRun;if(!r||state!=='office')return;state='officeComplete';hideBtn.style.display='none';freezeBtn.style.display='none';pauseBtn.style.display='none';const earned=Math.max(100,Math.round(550-r.elapsed*2-r.caught*60))+(r.bonus.taken?r.bonus.reward:0);credits+=earned;
  if(!officeCleared||officeBest===0||r.elapsed<officeBest)officeBest=Math.round(r.elapsed*10)/10;officeCleared=true;persist();sfx('win');panel.style.display='block';panel.classList.add('office-dialog');
  panel.innerHTML=`<div class="dialog-scene"><span class="eyebrow">ДОПОЛНИТЕЛЬНАЯ МИССИЯ · АРХИВ РОЗЫСКА</span><h1>«СЛЕД БЕГЛЕЦА»</h1><p>Ты нашёл служебный журнал, телеметрию беглеца и приказ № 000. На планшете загораются координаты его последнего следа.</p><div class="office-stat">ВРЕМЯ: ${r.elapsed.toFixed(1)} с<br>ОБНАРУЖЕНИЙ: ${r.caught}<br>ДОП. ПОРУЧЕНИЕ: ${r.bonus.taken?'ВЫПОЛНЕНО':'НЕ ВЫПОЛНЕНО'}<br>НИЖНИЙ РЫНОК: ${r.marketVisited?'ПОСЕЩЁН':'НЕТ'}<br>ЗАРАБОТАНО: ${earned} ₡<br>ЛУЧШЕЕ ВРЕМЯ: ${officeBest.toFixed(1)} с</div><button id="officeFly">НАЧАТЬ ПОГОНЮ В КОСМОСЕ →</button><button class="ghost" id="officeReturn">В АНГАР</button></div>`;
  document.getElementById('officeFly').onclick=()=>startCaseStage(caseUnlocked);
  document.getElementById('officeReturn').onclick=()=>menu('story');
 },
 lose(){state='officeFail';hideBtn.style.display='none';freezeBtn.style.display='none';pauseBtn.style.display='none';panel.style.display='block';panel.innerHTML='<div class="dialog-scene"><h1>НАЧАЛЬСТВО ТЕБЯ НАШЛО</h1><p>Тебя трижды заметили при поиске материалов. Архивный след остаётся закрытым, но космический розыск доступен из ангара.</p><button id="officeRetry">ПОВТОРИТЬ ПОПЫТКУ</button><button id="officeBack" class="ghost">В АНГАР</button></div>';document.querySelector('#officeRetry').onclick=()=>officeMission.start();document.querySelector('#officeBack').onclick=()=>menu('story');sfx('lose')},
 render(){
  const r=officeRun;if(!r)return;
  g.save();g.clearRect(0,0,W,H);const grd=g.createLinearGradient(0,0,W,H);grd.addColorStop(0,'#061a2c');grd.addColorStop(1,'#0a2634');g.fillStyle=grd;g.fillRect(0,0,W,H);
  g.fillStyle='#0a2432';g.fillRect(29,144,482,770);g.strokeStyle='#326b80';g.lineWidth=4;g.strokeRect(30,148,480,763);
  g.save();g.beginPath();g.rect(32,150,476,758);g.clip();
  for(let y=170;y<=915;y+=40){g.strokeStyle='rgba(119,182,206,.07)';g.lineWidth=1;g.beginPath();g.moveTo(31,y);g.lineTo(510,y);g.stroke()}
  for(let x=50;x<=510;x+=40){g.beginPath();g.moveTo(x,150);g.lineTo(x,910);g.stroke()}
  // Carpet and illuminated corridor strips.
  g.fillStyle='#102f43';g.fillRect(196,190,148,699);g.fillStyle='#1b5362';g.fillRect(200,190,3,699);g.fillRect(337,190,3,699);
  g.fillStyle='#174053';for(let y=198;y<890;y+=94){g.fillRect(262,y,16,36)}
  g.fillStyle='#174257';g.font='bold 12px system-ui';g.textAlign='center';
  g.fillText('АРХИВ',119,647);g.fillText('ТАБЛИЦЫ',419,396);g.fillText('КОМНАТА НАЧАЛЬСТВА',270,171);
  // Door: green means all tasks completed.
  g.shadowColor=r.exitReady?'#5cffc3':'#f6b568';g.shadowBlur=22;g.fillStyle=r.exitReady?'#30e6ab':'#a76c40';g.fillRect(237,177,66,11);g.shadowBlur=0;
  for(const block of HQ_WALLS){const wall=block.h<=22;g.fillStyle=wall?'#2f5266':'#315672';g.fillRect(block.x,block.y,block.w,block.h);g.fillStyle=wall?'#58839b':'#44657a';g.fillRect(block.x+4,block.y+3,Math.max(5,block.w-8),5);if(!wall){g.fillStyle='#132d40';g.fillRect(block.x+7,block.y+12,Math.max(6,block.w-14),8);g.fillStyle='#7cc6c7';g.fillRect(block.x+12,block.y+26,Math.min(25,block.w-24),4)}}
  for(const obj of HQ_COVER){g.fillStyle='#34526d';g.fillRect(obj.x,obj.y,obj.w,obj.h);g.strokeStyle='#81d8dc';g.lineWidth=2;g.strokeRect(obj.x+4,obj.y+4,obj.w-8,obj.h-8);g.fillStyle='#b2d5d5';g.font='bold 10px system-ui';g.fillText('ШКАФ',obj.x+obj.w/2,obj.y+obj.h/2+3)}
  // Lower checkpoint bypass and the illegal market door.
  g.fillStyle='rgba(32,61,78,.48)';g.fillRect(374,722,120,162);g.strokeStyle='rgba(116,181,205,.35)';g.strokeRect(374,722,120,162);g.fillStyle='#89c2c9';g.font='bold 10px system-ui';g.fillText('НИЖНЕЕ КПП',434,737);
  for(const beam of HQ_LOWER_MARKET.checkpoints){const gap=hqBeamGap(beam,r.elapsed);g.strokeStyle='rgba(255,80,112,.88)';g.lineWidth=4;g.beginPath();g.moveTo(HQ_LOWER_MARKET.corridor.x1,beam.y);g.lineTo(gap-26,beam.y);g.moveTo(gap+26,beam.y);g.lineTo(HQ_LOWER_MARKET.corridor.x2,beam.y);g.stroke();g.fillStyle='rgba(255,120,146,.85)';g.beginPath();g.arc(gap,beam.y,4,0,Math.PI*2);g.fill()}
  g.save();g.translate(HQ_LOWER_MARKET.door.x,HQ_LOWER_MARKET.door.y);g.shadowColor='#d86bff';g.shadowBlur=16;g.fillStyle='#8d3ac6';g.fillRect(-22,-18,44,36);g.fillStyle='#f3b7ff';g.font='bold 14px system-ui';g.fillText('₡',0,5);g.shadowBlur=0;g.fillStyle='#deb9ff';g.font='10px system-ui';g.fillText('НИЖНИЙ РЫНОК',0,31);g.restore()
  if(!r.bonus.taken){g.save();g.translate(r.bonus.x,r.bonus.y);g.fillStyle='#a8e8d3';g.shadowColor='#76ffd1';g.shadowBlur=14;g.beginPath();g.arc(0,0,17,0,Math.PI*2);g.fill();g.shadowBlur=0;g.fillStyle='#16443d';g.font='bold 17px system-ui';g.fillText('!',0,6);g.fillStyle='#b5f1d8';g.font='10px system-ui';g.fillText('ПОРУЧЕНИЕ',0,31);g.restore()}
  for(const task of r.tasks){if(task.taken)continue;g.save();g.translate(task.x,task.y);g.shadowColor='#ffe7ab';g.shadowBlur=24;g.fillStyle='#ffecc3';g.fillRect(-16,-17,32,36);g.fillStyle='#426f80';for(let i=0;i<3;i++)g.fillRect(-9,-10+i*9,19,2);g.shadowBlur=0;g.fillStyle='#fbe9a7';g.font='bold 10px system-ui';g.fillText(task.kind,0,33);g.restore()}
  // Vision cones drawn before guards: actual LOS includes furniture and walls.
  for(const guard of r.patrols){g.save();g.translate(guard.x,guard.y);g.rotate(guard.angle);g.globalAlpha=r.freeze>0?.15:.20;g.fillStyle=guard.noticed?'#ff3657':'#f4aa63';g.beginPath();g.moveTo(0,0);g.arc(0,0,guard.range,-.59,.59);g.closePath();g.fill();g.restore()}
  // Draw chief with distinct silhouette.
  for(const guard of r.patrols){g.save();g.translate(guard.x,guard.y);g.rotate(guard.angle+Math.PI/2);g.shadowColor=guard===r.chief?'#ff4e67':'#ffb862';g.shadowBlur=15;g.fillStyle=guard===r.chief?'#d34559':'#dfaf78';g.beginPath();g.moveTo(0,-15);g.lineTo(-13,11);g.lineTo(13,11);g.closePath();g.fill();g.shadowBlur=0;g.fillStyle='#111c2a';g.fillRect(-6,-3,12,6);g.restore();if(guard.noticed){g.fillStyle='#ff536c';g.font='bold 23px system-ui';g.fillText('!',guard.x,guard.y-25)}}
  // Player is a headset-wearing HQ employee, not the space ship.
  g.save();g.translate(r.hero.x,r.hero.y);if(r.hide>0){g.globalAlpha=.38;g.shadowColor='#7bfde4';g.shadowBlur=24}else{g.shadowColor='#44deed';g.shadowBlur=14}g.fillStyle='#58c9d8';g.beginPath();g.arc(0,-3,13,0,Math.PI*2);g.fill();g.fillStyle='#183a4d';g.fillRect(-10,-4,20,8);g.fillStyle='#f5dab2';g.beginPath();g.arc(0,-8,6,0,Math.PI*2);g.fill();g.strokeStyle='#cdfcff';g.lineWidth=2;g.beginPath();g.arc(0,-8,9,Math.PI*1.08,Math.PI*1.95);g.stroke();g.restore();
  // Exit cue after acquiring files.
  if(r.exitReady){g.strokeStyle='#65ffc6';g.lineWidth=4;g.setLineDash([10,9]);g.beginPath();g.moveTo(r.hero.x,r.hero.y);g.lineTo(270,188);g.stroke();g.setLineDash([])}
  g.restore();
  // HUD: all text drawn after clipping.
  g.fillStyle='#071521ef';g.fillRect(0,0,W,142);g.fillStyle='#e9fbff';g.textAlign='left';g.font='bold 22px system-ui';g.fillText('ШТАБ 291 · АРХИВ РОЗЫСКА',17,32);
  g.fillStyle='#a4cad6';g.font='14px system-ui';g.fillText('ДОКУМЕНТЫ: '+r.delivered+'/3  ·  ВРЕМЯ: '+Math.floor(r.elapsed)+' с  ·  ПОПЫТКИ: '+(3-r.caught),18,59);
  g.fillStyle='#1e3647';g.fillRect(17,70,505,15);g.fillStyle=r.alert>70?'#ff5369':r.alert>40?'#ffc565':'#4ae2ba';g.fillRect(17,70,505*r.alert/100,15);
  g.fillStyle='#d4e8ed';g.font='bold 13px system-ui';g.fillText('ПОДОЗРЕНИЕ '+Math.floor(r.alert)+'%',18,104);g.fillText(r.exitReady?'ЗАДАНИЯ ЗАКРЫТЫ! ВЫХОД ↑':'ПАПКИ И ПОРУЧЕНИЯ',18,128);g.textAlign='right';g.fillText('НИЖНИЙ РЫНОК ↘',520,128);g.textAlign='left';
  if(r.announceTime>0){g.fillStyle='rgba(5,20,34,.88)';g.fillRect(0,377,W,94);g.fillStyle=r.alert>65?'#ff7988':'#ffd58b';g.font='bold 16px system-ui';g.textAlign='center';g.fillText(r.announcement.slice(0,47),W/2,416);g.fillStyle='#a4cbd5';g.font='12px system-ui';g.fillText('ПРИКА́З № 000 · СОВЕРШЕННО НЕ ВОВРЕМЯ',W/2,443)}
  if(r.alert>=72){g.fillStyle='rgba(210,25,48,.13)';g.fillRect(0,142,W,H-142);g.fillStyle='#ff8c91';g.textAlign='center';g.font='bold 18px system-ui';g.fillText('НАЧАЛЬСТВО ИДЁТ!',W/2,188)}
  g.fillStyle='#d0eafa';g.textAlign='center';g.font='12px system-ui';g.fillText('Касайся пола и веди персонажа · ALT+TAB / EXCEL ЗАВИС',W/2,932);
  g.restore();
 }
};
document.addEventListener('keydown',e=>{if(!officeRun||state!=='office')return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(k==='escape'){officeMission.pause();return}if(k===' '){officeMission.hide();return}if(k==='q'){officeMission.freeze();return}officeRun.keys.add(k)});
document.addEventListener('keyup',e=>{if(officeRun)officeRun.keys.delete(e.key.toLowerCase())});
