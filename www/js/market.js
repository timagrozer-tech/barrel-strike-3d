/* VOID FRONTIER v1.2 — Lower Market: interactive, offline, independent scene. */
'use strict';
const LM_VENDORS=[
 {id:'overdrive',name:'ТЁТЯ ПЛАЗМА',item:'ПЕРЕГРУЖЕННЫЙ РЕАКТОР',desc:'+18% урона во всех режимах',cost:520,x:170,y:294,color:'#f274fc',line:'Без чека, зато с перегревом!'},
 {id:'armor',name:'ДЯДЯ БРОНЯ',item:'КОНТРАБАНДНАЯ БРОНЯ',desc:'+25 единиц максимального корпуса',cost:560,x:370,y:294,color:'#83caff',line:'По документам это шкаф. А ты не спрашивай.'},
 {id:'jammer',name:'ГЛУШАК',item:'ГЛУШИЛКА ПРОПУСКА',desc:'Меньше стартовое подозрение и рост тревоги',cost:480,x:170,y:488,color:'#93f9bd',line:'Я никого не видел. Ты меня тоже.'},
 {id:'blackMissiles',name:'БАРЫГА РАКЕТ',item:'ЧЁРНЫЕ РАКЕТЫ',desc:'+1 ракета в каждом автоматическом залпе',cost:700,x:370,y:488,color:'#ffc66a',line:'Заводские? Не смеши мои боеголовки.'},
 {id:'shadowDrones',name:'СБОРЩИК ДРОНОВ',item:'ТЕНЕВОЙ ДРОН',desc:'+1 сопровождающий боевой дрон',cost:760,x:170,y:682,color:'#c7a4ff',line:'Он тихий. Пока не начнёт стрелять.'},
 {id:'phaseShield',name:'ФАЗОВЫЙ МАСТЕР',item:'ФАЗОВЫЙ ЩИТ',desc:'Получаемый урон снижается на 20%',cost:850,x:370,y:682,color:'#72e4fa',line:'В документах проходит как прозрачная папка.'}
];
const LM_STALLS=LM_VENDORS.map(v=>({x:v.x<270?49:372,y:v.y-40,w:119,h:83}));
const LM_RANGE={minX:35,maxX:505,minY:186,maxY:908};
let marketRun=null;
function lmCircleRect(x,y,r,o){const cx=Math.max(o.x,Math.min(x,o.x+o.w)),cy=Math.max(o.y,Math.min(y,o.y+o.h));return (cx-x)**2+(cy-y)**2<r*r}
function lmSolid(x,y,r=13){return x-r<LM_RANGE.minX||x+r>LM_RANGE.maxX||y-r<LM_RANGE.minY||y+r>LM_RANGE.maxY||LM_STALLS.some(o=>lmCircleRect(x,y,r,o))}
function lmMove(x,y){const h=marketRun.hero;if(!lmSolid(x,h.y))h.x=x;if(!lmSolid(h.x,y))h.y=y}
function lmNotice(text,duration=2.2){const r=marketRun;r.notice=text;r.noticeTime=duration}
function lmStatusButtons(){const r=marketRun;if(!r)return;setAbilityButton(hideBtn,'ALT+TAB','⌨',r.hideCd,15);setAbilityButton(freezeBtn,'EXCEL','❄',r.freezeCd,20)}
function lmPatrol(x,y,stops,speed=80){return {x,y,stops,waypoint:1,speed,angle:-Math.PI/2,range:125}}
const marketMission={
 start(){
  state='market';panel.classList.remove('hangar','office-dialog');panel.style.display='none';bombBtn.style.display='none';pauseBtn.style.display='flex';hideBtn.style.display='flex';freezeBtn.style.display='flex';
  marketVisits++;lowerMarketKnown=true;persist();
  marketRun={hero:{x:270,y:858},target:{x:270,y:858},keys:new Set(),elapsed:0,heat:10,hide:0,hideCd:0,freeze:0,freezeCd:0,scannerCd:0,shopCd:1.5,guardAlert:false,raid:false,raidTimer:0,inspectors:[lmPatrol(268,562,[{x:268,y:360},{x:268,y:696}],74),lmPatrol(313,440,[{x:210,y:440},{x:323,y:440}],56)],notice:'НИЖНИЙ РЫНОК · ПОДХОДИ К ПРИЛАВКАМ',noticeTime:4,sparks:Array.from({length:36},(_,i)=>({x:40+(i*73)%458,y:195+(i*101)%680,s:(i%3)+1}))};
  audio.scene='';audio.beat=0;audio.step=0;sfx('market');lmStatusButtons();last=performance.now();
 },
 point(e){if(!marketRun)return;const p=toScene(e);marketRun.target={x:clamp(p.x,43,498),y:clamp(p.y,196,900)}},
 hide(){if(state!=='market'||!marketRun||marketRun.hideCd>0)return;const r=marketRun;r.hide=3.2;r.hideCd=15;r.heat=Math.max(0,r.heat-15);lmNotice('ALT+TAB · КАМЕРЫ ТЕБЯ НЕ ВИДЯТ');sfx('hide');lmStatusButtons()},
 freeze(){if(state!=='market'||!marketRun||marketRun.freezeCd>0)return;const r=marketRun;r.freeze=4;r.freezeCd=20;lmNotice('EXCEL ЗАВИС · ОХРАНА ЗАМЕРЛА');sfx('freeze');lmStatusButtons()},
 showShop(v){
  if(!marketRun)return;const r=marketRun;
  state='marketShop';panel.style.display='block';panel.classList.add('office-dialog');r.shopCd=1.6;
  const owned=!!contraband[v.id];
  panel.innerHTML=`<div class="dialog-scene market-dialog"><span class="eyebrow">НИЖНИЙ РЫНОК · ЛАВКА № ${LM_VENDORS.indexOf(v)+1}</span><h1>${v.name}</h1><p>«${v.line}»</p><div class="terminal"><span>ТОВАР: ${v.item}</span><span>ЭФФЕКТ: ${v.desc}</span><span>ЦЕНА: ${v.cost} ₡ · ТВОИ КРЕДИТЫ: ${credits} ₡</span><span>ПОДОЗРЕНИЕ РЫНКА: ${Math.round(r.heat)}%</span></div><button id="lmBuy" ${owned?'disabled':''}>${owned?'✓ УЖЕ КУПЛЕНО':'КУПИТЬ БЕЗ ДОКУМЕНТОВ · '+v.cost+' ₡'}</button><p class="hint" id="lmFeedback">${owned?'Улучшение уже действует на всех твоих кораблях.':'После сделки повышается риск облавы.'}</p><button id="lmBack" class="ghost">ОТОЙТИ ОТ ПРИЛАВКА</button></div>`;
  document.getElementById('lmBuy').onclick=()=>{
   if(contraband[v.id])return;
   if(credits<v.cost){document.getElementById('lmFeedback').textContent='Недостаточно кредитов. Выполняй миссии, чтобы заработать.';sfx('hit');return}
   credits-=v.cost;contraband[v.id]=true;r.heat=Math.min(100,r.heat+18);sfx('trade');persist();marketMission.showShop(v);
  };
  document.getElementById('lmBack').onclick=()=>{panel.style.display='none';state='market';r.shopCd=2.0;r.hero.x=270;r.target.x=270;last=performance.now();if(r.heat>=100)marketMission.startRaid()};
 },
 startRaid(){const r=marketRun;if(!r||r.raid)return;r.raid=true;r.raidTimer=16;r.heat=100;lmNotice('ОБЛАВА! УХОДИ ЧЕРЕЗ ЮЖНЫЙ ВЫХОД!',4);sfx('raid')},
 exit(caught=false){
  if(!marketRun||!officeRun)return;
  const r=marketRun;
  if(caught){marketRaids++;const fine=Math.min(credits,100);credits-=fine;officeRun.alert=Math.max(officeRun.alert,66);officeRun.hide=2;hqAnnouncement('ОБЛАВА! ШТРАФ '+fine+' ₡ И ПОИСК НАЧАЛЬСТВА',4)}
  else{officeRun.alert=clamp(officeRun.alert+Math.round(r.heat*.2),0,95);hqAnnouncement('ПОКУПКИ В КОРАБЛЕ. ВОЗВРАЩАЙСЯ В ШТАБ',3)}
  persist();state='office';panel.style.display='none';panel.classList.remove('office-dialog');officeRun.hero.x=333;officeRun.hero.y=787;officeRun.target={x:333,y:787};hideBtn.style.display='flex';freezeBtn.style.display='flex';hqButtons();audio.scene='';sfx('door');last=performance.now();
 },
 pause(){if(state!=='market')return;state='marketPause';panel.style.display='block';panel.innerHTML='<div class="dialog-scene"><h1>ПАУЗА · НИЖНИЙ РЫНОК</h1><p>Подозрение и охрана заморожены, пока игра на паузе.</p><button id="lmResume">ПРОДОЛЖИТЬ</button><button id="lmLeave" class="ghost">ПОКИНУТЬ РЫНОК</button></div>';document.getElementById('lmResume').onclick=()=>{state='market';panel.style.display='none';last=performance.now()};document.getElementById('lmLeave').onclick=()=>marketMission.exit(marketRun.raid)},
 update(dt){
  const r=marketRun;if(!r)return;r.elapsed+=dt;r.noticeTime=Math.max(0,r.noticeTime-dt);r.hide=Math.max(0,r.hide-dt);r.hideCd=Math.max(0,r.hideCd-dt);r.freeze=Math.max(0,r.freeze-dt);r.freezeCd=Math.max(0,r.freezeCd-dt);r.scannerCd=Math.max(0,r.scannerCd-dt);r.shopCd=Math.max(0,r.shopCd-dt);musicTick(dt);
  if(Math.floor((r.elapsed-dt)*3)!==Math.floor(r.elapsed*3))lmStatusButtons();
  const h=r.hero;let dx=r.target.x-h.x,dy=r.target.y-h.y;
  if(r.keys.has('arrowleft')||r.keys.has('a'))dx=-180;if(r.keys.has('arrowright')||r.keys.has('d'))dx=180;
  if(r.keys.has('arrowup')||r.keys.has('w'))dy=-180;if(r.keys.has('arrowdown')||r.keys.has('s'))dy=180;
  if(Math.hypot(dx,dy)>4){const v=190*dt,m=Math.hypot(dx,dy);lmMove(h.x+dx/m*Math.min(m,v),h.y+dy/m*Math.min(m,v))}
  // Perimeter scanner: must pass through the pulsing gap.
  const gap=270+Math.sin(r.elapsed*1.5)*57;
  if(r.hide<=0&&r.freeze<=0&&Math.abs(h.y-777)<7&&h.x>190&&h.x<350&&Math.abs(h.x-gap)>34&&r.scannerCd<=0){r.scannerCd=1.2;r.heat=Math.min(100,r.heat+14);lmNotice('СКАНЕР ЗАМЕТИЛ ДВИЖЕНИЕ!');sfx('scanner')}
  let watched=false;
  for(const guard of r.inspectors){
   if(r.freeze<=0){if(r.raid){const angle=Math.atan2(h.y-guard.y,h.x-guard.x),step=Math.min(105*dt,Math.hypot(h.x-guard.x,h.y-guard.y));guard.x+=Math.cos(angle)*step;guard.y+=Math.sin(angle)*step;guard.angle=angle}
    else{const goal=guard.stops[guard.waypoint],vx=goal.x-guard.x,vy=goal.y-guard.y,d=Math.hypot(vx,vy);if(d<6)guard.waypoint=(guard.waypoint+1)%guard.stops.length;else{guard.x+=vx/d*Math.min(d,guard.speed*dt);guard.y+=vy/d*Math.min(d,guard.speed*dt);guard.angle=Math.atan2(vy,vx)}}}
   const dist=Math.hypot(h.x-guard.x,h.y-guard.y),dot=dist?((h.x-guard.x)*Math.cos(guard.angle)+(h.y-guard.y)*Math.sin(guard.angle))/dist:1;
   if(r.hide<=0&&r.freeze<=0&&dist<guard.range&&(r.raid||dot>Math.cos(.65)))watched=true;
   if(r.raid&&dist<23){marketMission.exit(true);return}
  }
  if(!r.raid){r.heat=clamp(r.heat+(watched?27:-2)*dt,0,100);if(r.heat>=100)marketMission.startRaid()}
  else{r.raidTimer-=dt;if(r.raidTimer<=0){marketMission.exit(true);return}}
  if(h.y>874&&Math.abs(h.x-270)<65){marketMission.exit(false);return}
  if(r.shopCd<=0&&!r.raid)for(const vendor of LM_VENDORS){if(Math.hypot(h.x-vendor.x,h.y-vendor.y)<58){marketMission.showShop(vendor);break}}
 },
 render(){
  const r=marketRun;if(!r)return;
  g.save();g.clearRect(0,0,W,960);const t=r.elapsed;
  const bg=g.createLinearGradient(0,145,W,H);bg.addColorStop(0,'#110d2d');bg.addColorStop(.54,'#101a2f');bg.addColorStop(1,'#071b29');g.fillStyle=bg;g.fillRect(0,0,W,960);
  // Floor and cyberpunk industrial grid.
  g.fillStyle='#111b2f';g.fillRect(32,157,476,755);g.strokeStyle='#4b3869';g.lineWidth=3;g.strokeRect(33,158,474,753);
  for(let y=178;y<915;y+=33){g.strokeStyle='rgba(114,102,180,.12)';g.lineWidth=1;g.beginPath();g.moveTo(34,y);g.lineTo(505,y);g.stroke()}
  for(let x=44;x<508;x+=38){g.beginPath();g.moveTo(x,158);g.lineTo(x,909);g.stroke()}
  // Central corridor and warning stripes.
  g.fillStyle='#17263b';g.fillRect(192,188,156,715);g.fillStyle='#624d4b';for(let y=204;y<908;y+=70){g.fillRect(191,y,5,24);g.fillRect(344,y,5,24)}
  g.save();g.globalAlpha=.36;for(const spark of r.sparks){const px=spark.x+Math.sin(t*.6+spark.y)*9,py=180+(spark.y-180+t*23)%720;g.fillStyle=spark.s===1?'#cc80ff':'#72cbed';g.fillRect(px,py,spark.s,6+spark.s*2)}g.restore();
  // Neon stalls, vendors and product signs.
  for(let i=0;i<LM_VENDORS.length;i++){
   const v=LM_VENDORS[i],o=LM_STALLS[i];g.save();g.shadowColor=v.color;g.shadowBlur=14+Math.sin(t*2+i)*4;g.fillStyle='#1b2343';g.fillRect(o.x,o.y,o.w,o.h);g.strokeStyle=v.color;g.lineWidth=2.5;g.strokeRect(o.x+3,o.y+3,o.w-6,o.h-6);g.shadowBlur=0;
   g.fillStyle=v.color;g.fillRect(o.x+8,o.y+9,o.w-16,7);g.fillStyle='#eaf5ff';g.font='bold 11px system-ui';g.textAlign='center';const shortNames={overdrive:'РЕАКТОР',armor:'БРОНЯ',jammer:'ГЛУШИЛКА',blackMissiles:'ЧЁРНЫЕ РАКЕТЫ',shadowDrones:'ТЕНЕВОЙ ДРОН',phaseShield:'ФАЗОВЫЙ ЩИТ'};g.fillText(contraband[v.id]?'ПРОДАНО':shortNames[v.id],o.x+o.w/2,o.y+44);
   g.fillStyle='#c8abdd';g.beginPath();g.arc(v.x,v.y-10,13,0,Math.PI*2);g.fill();g.fillStyle='#212647';g.fillRect(v.x-13,v.y-1,26,19);g.fillStyle=v.color;g.fillRect(v.x-7,v.y-12,5,3);g.fillRect(v.x+3,v.y-12,5,3);
   g.fillStyle='#b7d7ef';g.font='10px system-ui';g.fillText(v.cost+' ₡',o.x+o.w/2,o.y+70);g.restore();
  }
  const gap=270+Math.sin(t*1.5)*57;g.save();g.shadowColor='#ff527e';g.shadowBlur=14;g.strokeStyle='#ff527e';g.lineWidth=4;g.beginPath();g.moveTo(189,777);g.lineTo(gap-34,777);g.moveTo(gap+34,777);g.lineTo(351,777);g.stroke();g.restore();
  g.fillStyle='#b3ffd2';g.textAlign='center';g.font='bold 12px system-ui';g.fillText('⬇ ВЫХОД В ШТАБ ⬇',270,899);
  // Detection cones + inspectors.
  for(const guard of r.inspectors){g.save();g.translate(guard.x,guard.y);g.rotate(guard.angle);g.globalAlpha=r.freeze>0?.08:r.raid?.35:.17;g.fillStyle=r.raid?'#ff3158':'#ffca77';g.beginPath();g.moveTo(0,0);g.arc(0,0,guard.range,-.65,.65);g.closePath();g.fill();g.restore();g.save();g.translate(guard.x,guard.y);g.rotate(guard.angle+Math.PI/2);g.shadowColor='#ff5b81';g.shadowBlur=12;g.fillStyle=r.raid?'#ff3255':'#f7a46a';g.beginPath();g.moveTo(0,-16);g.lineTo(-13,12);g.lineTo(13,12);g.closePath();g.fill();g.restore()}
  g.save();g.translate(r.hero.x,r.hero.y);if(r.hide>0)g.globalAlpha=.38;g.shadowColor='#71f5f0';g.shadowBlur=22;g.fillStyle='#60d5e3';g.beginPath();g.arc(0,0,14,0,Math.PI*2);g.fill();g.fillStyle='#142d48';g.fillRect(-11,-4,22,9);g.fillStyle='#f8d9a9';g.beginPath();g.arc(0,-6,6,0,Math.PI*2);g.fill();g.restore();
  g.fillStyle='#090e21e8';g.fillRect(0,0,W,146);g.fillStyle='#f2f1ff';g.textAlign='left';g.font='bold 23px system-ui';g.fillText('НИЖНИЙ РЫНОК',18,32);g.fillStyle='#c9b0e8';g.font='13px system-ui';g.fillText('ТЁМНЫЕ СДЕЛКИ · СКРЫВАЙСЯ ОТ ОХРАНЫ',18,56);g.fillStyle='#302945';g.fillRect(18,70,506,15);g.fillStyle=r.heat<55?'#b884ef':r.heat<80?'#ffc56b':'#ff536e';g.fillRect(18,70,506*r.heat/100,15);g.fillStyle='#ddd8f6';g.font='bold 13px system-ui';g.fillText('ПОДОЗРЕНИЕ РЫНКА '+Math.floor(r.heat)+'%',18,108);g.fillText('КРЕДИТЫ '+Math.floor(credits)+' ₡ · КУПЛЕНО '+Object.values(contraband).filter(Boolean).length+'/6',18,131);
  if(r.noticeTime>0){g.fillStyle='rgba(13,14,34,.91)';g.fillRect(0,385,W,74);g.fillStyle='#ffd9a9';g.textAlign='center';g.font='bold 15px system-ui';g.fillText(r.notice.slice(0,49),W/2,414);g.fillStyle='#b7abe4';g.font='12px system-ui';g.fillText('ПОДОЙДИ К ПРИЛАВКУ, ЧТОБЫ ПОГОВОРИТЬ',W/2,437)}
  if(r.raid){g.fillStyle='rgba(210,27,53,'+(.12+.1*Math.sin(t*12))+')';g.fillRect(0,145,W,815);g.textAlign='center';g.font='bold 21px system-ui';g.fillStyle='#ff8999';g.fillText('ОБЛАВА! '+Math.ceil(r.raidTimer)+' СЕКУНД',270,189)}
  g.fillStyle='#c9dcf0';g.font='12px system-ui';g.textAlign='center';g.fillText('Тапни по полу · ALT+TAB — спрятаться · EXCEL — замедлить',270,946);
  g.restore();
 }
};
document.addEventListener('keydown',e=>{if(!marketRun||state!=='market')return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(k==='escape'){marketMission.pause();return}if(k===' '){marketMission.hide();return}if(k==='q'){marketMission.freeze();return}marketRun.keys.add(k)});
document.addEventListener('keyup',e=>{if(marketRun)marketRun.keys.delete(e.key.toLowerCase())});
