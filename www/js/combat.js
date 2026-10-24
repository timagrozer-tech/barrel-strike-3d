'use strict';
/* Космический бой — основа игры. Режимы: 'story' (розыск СОЧ, 4 операции), 'endless' (Бездна), 'parade' (Парад Дебилов). */
let state='splash',last=0,t=0,spawn=0,score=0,kills=0,phase=0,shake=0,inv=0,shots=[],foes=[],hostile=[],boss=null,player={x:270,y:820,hp:100,max:100,bombs:2},target={x:270,y:820},fire=0;
let mini=null,miniIndex=0,miniCleared=false,storyMiniSpawned=false,paradeKills=0,announcement='',announceTimer=0,announceSub='',perkChoices=0,perkDamage=1,perkShield=0,perkSpeed=1,runSeed=0,graze=0,warning=null,hangarTab='ship',phaseSeen=1,combatStats={bossModules:0};
let mode='story',droneCd=0,missileCd=0,wave=1,spawned=0,eliteKills=0,waveClock=0;
let warnBanner=0,achTick=0,hazards=[],pickups=[],overcharge=0,combo=0,comboTimer=0,deathTimer=0,runCredits=0,sideGunCd=0,paradeRest=0;
const keys=new Set();

// Эволюция корпуса: значения абсолютные для уровня, не суммируются.
const HULL=[
 {lvl:1,name:'Базовый корпус',module:'Стандартная рама',desc:'Стартовая конфигурация перехватчика.',cost:0,hp:0,speed:0},
 {lvl:2,name:'Стреловидные крылья',module:'Крылья',desc:'+10 к корпусу, +4% манёвренности.',cost:600,hp:10,speed:.04},
 {lvl:3,name:'Форсажные двигатели',module:'Двигатели',desc:'+20 к корпусу, +8% манёвренности.',cost:1100,hp:20,speed:.08},
 {lvl:4,name:'Оружейные крепления',module:'Крыльевые пушки',desc:'+30 к корпусу, 2 крыльевые пушки.',cost:1800,hp:30,speed:.08,sideGuns:true},
 {lvl:5,name:'Флагман розыска',module:'Дроновый узел и броня',desc:'+50 к корпусу, +1 боевой дрон, ракетные блоки.',cost:2800,hp:50,speed:.1,sideGuns:true,droneSlot:1}
];
const hullInfo=()=>HULL[clamp(hullLevel,1,5)-1];
const shipMaxHp=()=>Math.round((SHIPS[ship].hp+hullInfo().hp+(contraband.armor?25:0))*(mods.hpMul||1));
const activeDroneCount=()=>Math.min(6,drones+(SHIPS[ship].drones||0)+(contraband.shadowDrones?1:0)+(hullInfo().droneSlot||0));
const activeMissileCount=()=>Math.min(5,missiles+(SHIPS[ship].missiles||0)+(contraband.blackMissiles?1:0));
function currentPlayerTier(){return clamp(hullLevel||1,1,5)}

const FOE={
 scout:{hp:35,speed:150,size:62,r:22,score:60,fire:2.1,glow:'#ff4e83'},
 zig:{hp:42,speed:132,size:70,r:24,score:80,fire:2.3,glow:'#ff4e83'},
 heavy:{hp:90,speed:80,size:88,r:34,score:150,fire:1.25,glow:'#ff6848'},
 sniper:{hp:60,speed:150,size:74,r:24,score:180,fire:3,glow:'#ff4fd8'},
 carrier:{hp:230,speed:58,size:106,r:42,score:320,fire:3.4,glow:'#ff6a3a'},
 bomber:{hp:150,speed:72,size:100,r:36,score:260,fire:2.6,glow:'#ffa13a'},
 drone:{hp:14,speed:210,size:36,r:13,score:20,glow:'#ff5a3a'},
 duckling:{hp:22,speed:190,size:34,r:14,score:30,glow:'#ffd84a'}
};
const BULLET_COLORS={orb:'#ff3d73',heavy:'#ff8a2a',needle:'#ff4fd8',bomb:'#ffb02a',toxic:'#9dff5a',ice:'#7fe8ff'};

const MINI=[
 {name:'ЕБЛО УТИНОЕ',attack:'КРЯК АПОКАЛИПСИСА',special:'УТИНЫЙ ДЕСАНТ',color:'#ffcc48',kind:'duck',size:230},
 {name:'ЛОХ ЦВЕТОЧНЫЙ',attack:'ПЫЛЬЦА ПОЗОРА',special:'ЛЕПЕСТКОВЫЕ ЛУЧИ',color:'#fa75dc',kind:'flower',size:220},
 {name:'ЗАМИНИРОВАННЫЙ ТАПОК',attack:'ПОСЛЕДНИЙ ШЛЁПОК',special:'ТАРАН ТАПКОМ',color:'#b0e2ff',kind:'slipper',size:225},
 {name:'Я КАВКАЗ',attack:'ГОРНЫЙ АВТОРИТЕТ',special:'МИННОЕ ПОЛЕ',color:'#d4b391',kind:'mountain',size:250},
 {name:'ПЕЛЬМЕНЬ ВОЗМЕЗДИЯ',attack:'ПЕЛЬМЕННЫЙ ШТОРМ',special:'ПЕЛЬМЕННЫЙ ДОЖДЬ',color:'#ffe1a8',kind:'dumpling',size:200},
 {name:'БЕШЕНЫЙ УНИТАЗ',attack:'КОСМИЧЕСКИЙ СМЫВ',special:'ВОРОНКА',color:'#c1f4f6',kind:'toilet',size:190},
 {name:'ДЕД ПЕРЕГРЕВ',attack:'ТЕРМОУДАР',special:'ТЕПЛОВАЯ ВОЛНА',color:'#ff8855',kind:'grandpa',size:200},
 {name:'НОСОК АПОКАЛИПСИСА',attack:'ТОКСИЧНЫЙ ТУМАН',special:'ОБЛАКА ВОНИ',color:'#a1f77b',kind:'sock',size:190}
];

/* ---------- Создание объектов ---------- */
function shoot(x,y,vx,vy,enemy=false,r=5,dmg=10,kind,color){
 const arr=enemy?hostile:shots;if(arr.length>=(enemy?380:240))return null;
 const b={x,y,vx,vy,r,dmg:enemy?dmg:dmg*perkDamage,grazed:false,kind:kind||(enemy?'orb':weapon==='plasma'?'plasma':'laser'),color:color||(enemy?BULLET_COLORS.orb:weapon==='plasma'?'#4dffd2':'#56f6ff')};
 if(!enemy&&(b.kind==='laser'||b.kind==='plasma'))b.pierce=SHIPS[ship].pierce||0;
 arr.push(b);return b;
}
function enemyShot(x,y,ang,speed,r=6,dmg=13,kind='orb',color){speed*=mods.bulletSpeed||1;return shoot(x,y,Math.cos(ang)*speed,Math.sin(ang)*speed,true,r,dmg,kind,color||BULLET_COLORS[kind]||BULLET_COLORS.orb)}
function storyScale(){return mode==='story'?1+currentCaseStage*.12:1+(wave-1)*.16}
function makeFoe(type,x,y,extra={}){
 const elite=!!extra.elite||(!extra.noElite&&type!=='drone'&&type!=='duckling'&&Math.random()<(mods.elite||0)),d=FOE[type],hp=d.hp*storyScale()*(elite?2.2:1)*(mods.enemyHp||1);
 const f={type,x,y,hp,max:hp,age:0,cd:rnd(.8,1.8)*(d.fire||1),vx:rnd(-30,30),flash:0,state:0,timer:0,...extra,elite};
 foes.push(f);return f;
}
function spawnFoe(){
 spawned++;const roll=Math.random(),st=mode==='story'?currentCaseStage:Math.min(3,Math.floor((wave-1)/2));
 let type;
 if(mode==='story'&&st===0)type=roll<.5?'scout':roll<.78?'zig':roll<.92?'heavy':'sniper';
 else if(mode==='story'&&st===1)type=roll<.45?'zig':roll<.65?'heavy':roll<.82?'scout':'sniper';
 else if(mode==='story'&&st===2)type=roll<.38?'heavy':roll<.58?'zig':roll<.72?'bomber':roll<.86?'sniper':'scout';
 else if(mode==='story')type=roll<.28?'heavy':roll<.46?'zig':roll<.6?'bomber':roll<.72?'carrier':roll<.86?'sniper':'scout';
 else{const pool=['scout','scout','zig','heavy'];if(wave>=2)pool.push('sniper');if(wave>=4)pool.push('bomber','heavy');if(wave>=6)pool.push('carrier');type=pick(pool)}
 const elite=(mode==='endless'&&wave%5===0&&spawned%4===0)||(mode==='story'&&st>=2&&Math.random()<.05);
 // Формации: V-клин разведчиков или линия перехватчиков.
 if(t>9&&Math.random()<.24&&(type==='scout'||type==='zig')){
  const n=type==='scout'?5:4,cx=rnd(140,400);
  for(let i=0;i<n;i++){const off=i-(n-1)/2;makeFoe(type,clamp(cx+off*58,40,500),-40-Math.abs(off)*(type==='scout'?42:0),{vx:0,formation:true,phaseOff:i*.5})}
  return;
 }
 const big=type==='carrier'||type==='bomber';
 makeFoe(type,rnd(big?90:50,big?450:490),-50,{elite});
}
function spawnMini(){
 if(mini||boss)return;
 const type=mode==='story'?MINI.find(m=>m.kind===caseCurrent().mini):MINI[miniIndex++%MINI.length];
 const hp=mode==='story'?2000+currentCaseStage*650:mode==='parade'?2200+paradeKills*300:1600+wave*220;
 warnBanner=2.4;
 mini={...type,x:270,y:-160,ty:215,hitTaken:false,age:0,cd:1.6,hp,max:hp,phase2:false,specialCd:5.5,flash:0,charge:0,dashY:0};
 foes=[];hostile=[];hazards=[];
 announce(mode==='story'?'ПОМОЩНИК БЕГЛЕЦА: '+type.name:type.name,3,type.attack);sfx('boss');vibrate(60);
}
function spawnBoss(){
 announce(mode==='story'?'ЦЕЛЬ РОЗЫСКА: АРХИТЕКТОР!':'АРХИТЕКТОР БЕЗДНЫ',4,'ФЛАГМАН · 4 ФАЗЫ · РАЗРУШАЕМЫЕ ТУРЕЛИ');sfx('boss');vibrate([80,40,80]);
 warnBanner=3;phase=1;foes=[];hostile=[];hazards=[];
 const hp=mode==='endless'?4200*(1+wave*.12):7200;
 boss={x:270,y:-260,ty:285,hp,max:hp,age:0,cd:1.4,laserCd:3.3,specialCd:4.5,escortCd:6,phase:1,wing:0,flash:0,spiral:0,
  modules:[{x:-92,y:50,hp:520,max:520,wingMount:false,side:-1},{x:92,y:50,hp:520,max:520,wingMount:false,side:1},{x:-236,y:44,hp:420,max:420,wingMount:true,side:-1},{x:240,y:44,hp:420,max:420,wingMount:true,side:1}]};
 phaseSeen=1;warning=null;
}
function addHazard(h){hazards.push({t:0,state:'warn',dmg:20,warn:1,active:.6,...h});sfx('warning')}
function spawnPickup(x,y,type){pickups.push({x,y,vy:75,type,age:0})}
function dropLoot(f){
 let ch=f.elite?1:f.type==='carrier'?.3:f.type==='bomber'?.18:f.type==='heavy'?.1:f.type==='sniper'?.08:.03;
 if(Math.random()<ch){const r=Math.random();spawnPickup(f.x,f.y,player.hp<player.max*.5&&r<.4?'repair':r<.22?'repair':r<.36?(mods.noBombs?'credits':'bomb'):r<.54?'overcharge':r<.68?'shield':r<.8?'magnet':'credits')}
}

/* ---------- Старт забега ---------- */
function reset(){
 state='play';t=0;spawn=1.2;score=0;kills=0;phase=0;inv=0;shots=[];foes=[];hostile=[];FX.length=0;boss=null;mini=null;miniCleared=false;storyMiniSpawned=false;paradeKills=0;miniIndex=0;perkChoices=0;
 if(mode!=='endless')challengeActive=null;mods=challengeActive?{...MODS_DEFAULT(),...challengeActive.mods}:MODS_DEFAULT();runAchievements=[];stats.runs++;warnBanner=0;achTick=0;gameTimers.length=0;
 perkDamage=(contraband.overdrive?1.18:1)*(SHIPS[ship].dmg||1)*(mods.playerDmg||1);perkShield=0;perkSpeed=1;graze=0;warning=null;phaseSeen=1;combatStats={bossModules:0};audio.scene='';audio.step=0;audio.beat=0;runSeed=Math.floor(Math.random()*1e9);
 story=STORY_DEFAULT();caseBeacons=0;caseSpawnedMini=false;caseFinalFlag=false;if(contraband.jammer)story.suspicion=Math.max(0,story.suspicion-12);reports=[];storyAwards=0;
 hazards=[];pickups=[];overcharge=0;combo=0;comboTimer=0;deathTimer=0;runCredits=0;sideGunCd=0;paradeRest=0;
 const mx=shipMaxHp();player={x:270,y:H-150,hp:mx,max:mx,bombs:mods.noBombs?0:2+(SHIPS[ship].bombs||0),bank:0,dead:false,shieldCd:0,bubble:0,magnet:0,revived:false};target={x:270,y:H-150};fire=0;wave=1;waveClock=0;spawned=0;droneCd=0;missileCd=0;
 setBackgroundTheme(mode==='story'?currentCaseStage:mode==='endless'?4:5);initStars();
 panel.classList.remove('hangar','office-dialog');panel.style.display='none';document.body.classList.add('in-combat');
 bombBtn.style.display='flex';pauseBtn.style.display='flex';hideBtn.style.display=mode==='story'?'flex':'none';freezeBtn.style.display=mode==='story'?'flex':'none';updateBombButton();
 last=performance.now();
}
function updateBombButton(){document.querySelector('#bombCount').textContent=player.bombs;bombBtn.classList.toggle('empty',player.bombs<=0)}
function announce(text,duration=2,sub=''){announcement=text;announceTimer=duration;announceSub=sub;announceMax=duration}
let announceMax=2;

/* ---------- Действия игрока ---------- */
function bomb(){
 if(state!=='play'||player.bombs<=0||player.dead)return;player.bombs--;stats.bombs++;updateBombButton();
 for(const b of hostile)if(Math.random()<.35)fxAdd({kind:'spark',x:b.x,y:b.y,vx:0,vy:0,life:.4,max:.4,color:'#ffd36b',size:4});
 hostile=[];hazards=hazards.filter(h=>h.type==='pull');sfx('bomb');vibrate(120);addShake(14);
 fxAdd({kind:'ring',x:player.x,y:player.y,life:.8,max:.8,r:20,grow:900,color:'#ffe08a',w:14});fxAdd({kind:'flash',x:player.x,y:player.y,life:.4,max:.4,r:300,color:'#ffd36b'});
 for(const f of foes){f.hp-=100;f.flash=.2}if(boss){boss.hp-=Math.max(160,boss.max*.04);boss.flash=.2}if(mini){mini.hp-=Math.max(160,mini.max*.06);mini.flash=.2}
}
function addShake(v){if(settings.shake)shake=Math.max(shake,v)}
function hit(dmg){
 if(player.dead||inv>0||(mode==='story'&&story.hide>0))return;
 if(player.bubble>0||(SHIPS[ship].shield&&player.shieldCd<=0)){if(player.bubble>0)player.bubble=0;else player.shieldCd=SHIPS[ship].shield;inv=.6;sfx('module');fxAdd({kind:'ring',x:player.x,y:player.y,life:.45,max:.45,r:40,grow:160,color:'#ffe08a',w:6});popText(player.x,player.y-60,'ЩИТ','#ffe08a',14);return}
 if(mini)mini.hitTaken=true;
 if(mode==='story')changeSuspicion(8);
 player.hp-=contraband.phaseShield?Math.ceil(dmg*.8):dmg;sfx('hit');vibrate(40);inv=1.1;addShake(8);combo=0;
 burst(player.x,player.y,'#30ddff',14,200,.5);fxAdd({kind:'ring',x:player.x,y:player.y,life:.35,max:.35,r:30,grow:120,color:'#7ff6ff',w:4});
 if(player.hp<=0&&SHIPS[ship].revive&&!player.revived){player.revived=true;player.hp=Math.round(player.max*.5);inv=2.5;hostile=[];explosion(player.x,player.y,1.6,'#ffd27a');fxAdd({kind:'ring',x:player.x,y:player.y,life:.8,max:.8,r:20,grow:800,color:'#ffd27a',w:12});announce('ВТОРОЙ ШАНС',2,'ARCHON ВОССТАНОВЛЕН');sfx('phase');return}
 if(player.hp<=0){player.hp=0;player.dead=true;stats.deaths++;deathTimer=1.1;explosion(player.x,player.y,1.8,'#59e8ff');sfx('explodeBig');vibrate([100,60,200]);addShake(18);bombBtn.style.display='none';hideBtn.style.display='none';freezeBtn.style.display='none'}
}
function killFoe(f,i){
 explosion(f.x,f.y,f.type==='carrier'||f.type==='bomber'?1.3:f.type==='heavy'?1.05:f.type==='drone'||f.type==='duckling'?.45:.75,f.elite?'#c46bff':'#ff8a3d');
 combo++;comboTimer=2.2;const mult=1+Math.min(2,Math.floor(combo/8)*.25);const pts=Math.round(FOE[f.type].score*(f.elite?2.5:1)*mult);score+=pts;
 if(f.elite||f.type==='carrier'||f.type==='bomber')popText(f.x,f.y-20,'+'+pts,f.elite?'#e4a6ff':'#ffe28a');
 kills++;totalKills++;stats.kills++;if(f.elite){eliteKills++;stats.elites++}if(combo>stats.bestCombo)stats.bestCombo=combo;dropLoot(f);
 if(mode==='story'&&kills%6===0&&reports.length<5&&story.reports<story.need)reports.push({x:f.x,y:f.y,vy:76,life:13,spin:0});
 if(mode==='story')changeSuspicion(-.65);sfx('explode');foes.splice(i,1);
}

/* ---------- Обновление ---------- */
function update(dt){
 t+=dt;
 if(mode==='story'){story.hide=Math.max(0,story.hide-dt);story.freeze=Math.max(0,story.freeze-dt);story.hideCd=Math.max(0,story.hideCd-dt);story.freezeCd=Math.max(0,story.freezeCd-dt);story.alarmCd=Math.max(0,story.alarmCd-dt);if(!player.dead)changeSuspicion(dt*.18);updateAbilityButtons()}
 announceTimer=Math.max(0,announceTimer-dt);warnBanner=Math.max(0,warnBanner-dt);stats.playTime+=dt;achTick-=dt;if(achTick<=0){achTick=2;checkAchievements()}
 player.shieldCd=Math.max(0,(player.shieldCd||0)-dt);player.bubble=Math.max(0,(player.bubble||0)-dt);player.magnet=Math.max(0,(player.magnet||0)-dt);musicTick(dt);inv=Math.max(0,inv-dt);shake=Math.max(0,shake-dt*35);overcharge=Math.max(0,overcharge-dt);
 comboTimer-=dt;if(comboTimer<=0)combo=0;
 updateBackground(dt,boss?1.6:1);updateFX(dt);
 const slowFoes=mode==='story'&&story.freeze>0?.35:1;
 if(player.dead){deathTimer-=dt;if(deathTimer<=0){end(false);return}}
 else updatePlayer(dt);
 // Режиссёр волн.
 if(!boss&&!mini&&!player.dead){
  spawn-=dt;if(spawn<=0){if(mode!=='parade')spawnFoe();spawn=Math.max(.42,1.15-t*.009)*(mode==='endless'?Math.max(.6,1-wave*.03):1)/(mods.spawnRate||1)}
  if(mode==='story'&&t>8+caseBeacons*10&&caseBeacons<6&&story.reports<story.need){reports.push({x:clamp(player.x+rnd(-50,50),80,460),y:135,vy:96,life:14,spin:0});caseBeacons++;sfx('signal')}
  if(mode==='story'&&!storyMiniSpawned&&t>(currentCaseStage===3?25:27)&&(story.reports>=story.need||t>53)){spawnMini();storyMiniSpawned=true}
  if(mode==='story'&&currentCaseStage===3&&storyMiniSpawned&&miniCleared&&t>40&&!boss&&!caseFinalFlag){caseFinalFlag=true;spawnBoss()}
  if(mode==='parade'){paradeRest-=dt;if(t>2.5&&paradeRest<=0&&paradeKills<MINI.length)spawnMini()}
  if(mode==='endless'){waveClock+=dt;const next=Math.floor(waveClock/12)+1;if(next>wave){wave=next;sfx('upgrade');challengeWave(wave);announce('ВОЛНА '+wave,1.6,wave%10===0?'ФЛАГМАН ПРИБЛИЖАЕТСЯ':wave%5===0?'АНОМАЛИЯ НА РАДАРЕ':'');if(wave%10===0)spawnBoss();else if(wave%5===0)spawnMini();else if(wave%3===0)offerPerks()}}
 }
 updateFoes(dt,slowFoes);
 updateHazards(dt);
 if(boss)updateBoss(dt);
 if(mini)updateMini(dt);
 // Движение снарядов.
 const slowB=mode==='story'&&story.freeze>0?.3:1;
 for(const b of shots){
  if(b.homing){const tg=b.target&&(b.target.hp>0)?b.target:null;if(tg){const want=Math.atan2((tg.wy??tg.y)-b.y,(tg.wx??tg.x)-b.x),cur=Math.atan2(b.vy,b.vx);let da=want-cur;while(da>Math.PI)da-=TAU;while(da<-Math.PI)da+=TAU;const na=cur+clamp(da,-4*dt,4*dt),sp=Math.min(620,Math.hypot(b.vx,b.vy)+300*dt);b.vx=Math.cos(na)*sp;b.vy=Math.sin(na)*sp}
   if(QUALITY.trails&&Math.random()<.7)fxAdd({kind:'trail',x:b.x,y:b.y,vx:rnd(-10,10),vy:30,life:.35,max:.35,size:5,color:'#ffb05a'})}
  b.x+=b.vx*dt;b.y+=b.vy*dt}
 for(const b of hostile){
  if(b.kind==='bomb'){b.fuse-=dt;b.vy*=1-.9*dt;if(b.fuse<=0){b.dead=true;explodeBomb(b);continue}}
  b.x+=b.vx*dt*slowB;b.y+=b.vy*dt*slowB}
 if(hostile.some(b=>b.dead))hostile=hostile.filter(b=>!b.dead);
 collideShots();
 if(!player.dead)collidePlayer(dt);
 // Улики.
 for(let i=reports.length-1;i>=0;i--){const r=reports[i];r.y+=r.vy*dt;r.spin+=dt;if(!player.dead&&Math.hypot(r.x-player.x,r.y-player.y)<42){reports.splice(i,1);if(mode==='story')collectReport();continue}if(r.y>H+24||((r.life-=dt)<=0)){reports.splice(i,1);if(mode==='story')changeSuspicion(3)}}
 // Бонусы.
 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.age+=dt;const d=Math.hypot(p.x-player.x,p.y-player.y);if(!player.dead&&d<(player.magnet>0?320:110)){p.x+=(player.x-p.x)*dt*5;p.y+=(player.y-p.y)*dt*5}else p.y+=p.vy*dt;
  if(!player.dead&&d<34){collectPickup(p);pickups.splice(i,1)}else if(p.y>H+30)pickups.splice(i,1)}
 // Смерть мини-босса и босса.
 if(mini&&mini.hp<=0)defeatMini();
 if(state!=='play')return;
 if(boss&&boss.hp<=0){explosion(boss.x,boss.y,4,'#ffd064');for(let i=0;i<6;i++)explosion(boss.x+rnd(-200,200),boss.y+rnd(-80,120),1.5);sfx('explodeBig');addShake(20);vibrate([150,80,250]);score+=5000;boss=null;hazards=[];stats.bosses++;checkAchievements();
  if(mode==='story'){end(true);return}else{credits+=300+wave*20;runCredits+=300+wave*20;persist();hostile=[];sfx('win')}}
 shots=shots.filter(b=>b.y>-30&&b.y<H+30&&b.x>-30&&b.x<W+30&&!b.hit);
 hostile=hostile.filter(b=>b.y>-40&&b.y<H+40&&b.x>-40&&b.x<W+40);
}
function updatePlayer(dt){
 // Клавиатура (ПК).
 if(keys.size){const s=520*dt;if(keys.has('arrowleft')||keys.has('a'))target.x-=s;if(keys.has('arrowright')||keys.has('d'))target.x+=s;if(keys.has('arrowup')||keys.has('w'))target.y-=s;if(keys.has('arrowdown')||keys.has('s'))target.y+=s;target.x=clamp(target.x,30,W-30);target.y=clamp(target.y,140,H-45)}
 const sp=SHIPS[ship].speed*(1+hullInfo().speed)*perkSpeed*dt,dx=clamp(target.x-player.x,-sp,sp),dy=clamp(target.y-player.y,-sp,sp);
 player.x+=dx;player.y+=dy;player.bank=lerp(player.bank,clamp(dx/(sp||1),-1,1),.2);
 // Двигательный след.
 if(QUALITY.trails&&Math.random()<.85){const col=SHIPS[ship].engine;fxAdd({kind:'trail',x:player.x+rnd(-8,8),y:player.y+40,vx:rnd(-12,12),vy:rnd(160,240),life:.32,max:.32,size:6,color:col})}
 // Основное оружие.
 fire-=dt;if(fire<=0){firePrimary();fire=(weapon==='plasma'?.23:.135)*(overcharge>0?.62:1)}
 droneCd-=dt;missileCd-=dt;sideGunCd-=dt;
 const nd=activeDroneCount();if(nd&&droneCd<=0){for(let i=0;i<nd;i++){const p=dronePos(i,nd);shoot(p.x,p.y-10,0,-660,false,4,8+weaponLevel*2,'drone','#9fe7ff')}droneCd=.33}
 if(hullInfo().sideGuns&&sideGunCd<=0){const d=(6+weaponLevel*1.6);shoot(player.x-38,player.y-4,-40,-700,false,4,d,'drone','#ffd27a');shoot(player.x+38,player.y-4,40,-700,false,4,d,'drone','#ffd27a');sideGunCd=.3}
 const nm=activeMissileCount();if(nm&&missileCd<=0){for(let i=0;i<nm;i++){const x=player.x+(i-(nm-1)/2)*22,y=player.y-20,tg=missileTarget(i);const b=shoot(x,y,(i-(nm-1)/2)*120,-260,false,8,25+weaponLevel*5,'missile','#ffb05a');if(b){b.homing=true;b.target=tg}}missileCd=2.5}
}
function missileTarget(i){
 if(boss){const live=boss.modules.filter(m=>m.hp>0&&(!m.wingMount||boss.phase>=3));if(live.length&&i%2===0){const m=live[i%live.length];return {get hp(){return boss?m.hp:0},get wx(){return boss?modulePos(m).x:270},get wy(){return boss?modulePos(m).y:100}}}return {get hp(){return boss?boss.hp:0},get wx(){return boss?boss.x:270},get wy(){return boss?boss.y+30:100}}}
 if(mini)return mini;
 const list=foes.filter(f=>f.y>20).sort((a,b)=>b.y-a.y);return list[i%Math.max(1,list.length)]||null;
}
function dronePos(i,n){const side=i%2===0?-1:1,rank=Math.floor(i/2)+1;if(n%2===1&&i===n-1)return {x:player.x+Math.sin(t*3)*6,y:player.y+52};return {x:player.x+side*(36+rank*22),y:player.y+14+rank*8+Math.sin(t*3+i)*4}}
function firePrimary(){
 const L=weaponLevel,base=(weapon==='plasma'?16:10)+L*3,bonus=L>=9?.25:L>=6?.16:L>=3?.08:0,total=2*base*(1+bonus);
 const pl=weapon==='plasma',sp=pl?-690:-800,r=pl?8:5;
 const streams=[[-14,0,1],[14,0,1]];
 if(L>=3)streams.push([-22,-.12,.45],[22,.12,.45]);
 if(L>=6)streams.push([0,0,.6]);
 if(L>=9)streams.push([-28,-.26,.35],[28,.26,.35]);
 const sum=streams.reduce((s,a)=>s+a[2],0);
 for(const [ox,ang,w] of streams)shoot(player.x+ox,player.y-34,Math.sin(ang)*-sp,Math.cos(ang)*sp,false,w<1?r*.8:r,total*w/sum);
 fxAdd({kind:'flash',x:player.x,y:player.y-40,life:.06,max:.06,r:16,color:pl?'#4dffd2':'#56f6ff'});
 if(t-audio.lastShot>.12){sfx('shot');audio.lastShot=t}
}
function updateFoes(dt,slow){
 for(const f of foes){
  const d=FOE[f.type];f.age+=dt;f.cd-=dt*slow;f.flash=Math.max(0,f.flash-dt);const v=d.speed*dt*slow;
  switch(f.type){
   case 'zig':f.y+=v;f.x+=Math.sin(f.age*4+(f.phaseOff||0))*105*dt*slow;break;
   case 'sniper':
    if(f.state===0){f.y+=v;if(f.y>=(f.stop||(f.stop=rnd(150,260)))){f.state=1;f.timer=0;f.shotsLeft=3}}
    else if(f.state===1){f.timer+=dt*slow;f.aim=Math.atan2(player.y-f.y,player.x-f.x);if(f.timer>1.0){f.state=2;f.timer=0;sfx('charge')}}
    else if(f.state===2){f.timer+=dt*slow;if(f.timer>.3){enemyShot(f.x,f.y+20,f.aim,560,5,18,'needle');f.shotsLeft--;f.state=f.shotsLeft>0?1:3;f.timer=0}}
    else{f.y+=v*2.2}
    break;
   case 'carrier':
    if(f.y<(f.stop||(f.stop=rnd(150,230))))f.y+=v;else{f.x+=Math.sin(f.age*.6)*30*dt;f.timer+=dt;if(f.timer>14)f.y+=v*2.5}
    if(f.cd<=0&&f.y>40){for(const s of [-1,1])makeFoe('drone',f.x+s*40,f.y+20,{vx:s*60,home:2.2});f.cd=d.fire;sfx('drone')}
    break;
   case 'bomber':f.y+=v;f.x+=Math.sin(f.age*.8)*24*dt;
    if(f.cd<=0&&f.y>60&&f.y<H*.6){const b=shoot(f.x,f.y+30,rnd(-30,30),110,true,13,22,'bomb',BULLET_COLORS.bomb);if(b){b.fuse=1.5;b.max=1.5}f.cd=d.fire}
    break;
   case 'drone':case 'duckling':
    if(f.home>0){f.home-=dt;const a=Math.atan2(player.y-f.y,player.x-f.x);f.vx=lerp(f.vx,Math.cos(a)*d.speed,.06);f.vy=lerp(f.vy||60,Math.sin(a)*d.speed,.06)}
    f.x+=f.vx*dt*slow;f.y+=(f.vy||d.speed)*dt*slow;break;
   case 'heavy':f.y+=v;f.x+=Math.sin(f.age*.7)*14*dt;break;
   default:f.y+=v;if(!f.formation)f.x+=f.vx*dt*.4;
  }
  f.x=clamp(f.x,24,W-24);
  if(f.cd<=0&&f.y>10&&f.y<H*.82&&!player.dead){
   const ax=mode==='story'&&story.hide>0?W-player.x:player.x,a=Math.atan2(player.y-f.y,ax-f.x);
   if(f.type==='scout'){enemyShot(f.x,f.y+18,a,230,6,13);f.cd=d.fire}
   else if(f.type==='zig'){for(let k=0;k<3;k++)setTimeoutGame(()=>{if(foes.includes(f))enemyShot(f.x,f.y+18,Math.atan2(player.y-f.y,ax-f.x),260,5,11)},k*.12);f.cd=d.fire}
   else if(f.type==='heavy'){for(let k=-1;k<=1;k++)enemyShot(f.x,f.y+32,Math.PI/2+k*.22,190,8,15,'heavy');f.cd=d.fire}
   else if(f.elite&&f.type!=='sniper'&&f.type!=='carrier'&&f.type!=='bomber'){enemyShot(f.x,f.y,a,240,6,13);f.cd=1.6}
  }
 }
 for(let i=foes.length-1;i>=0;i--){const f=foes[i];if(f.hp<=0)killFoe(f,i);else if(f.y>H+70||f.x<-80||f.x>W+80){if(mode==='story'&&f.type!=='drone'&&f.type!=='duckling')changeSuspicion(5);foes.splice(i,1)}}
 runGameTimers(dt);
}
// Отложенные игровые действия, которые останавливаются вместе с паузой.
const gameTimers=[];
function setTimeoutGame(fn,delay){gameTimers.push({fn,delay})}
function runGameTimers(dt){for(let i=gameTimers.length-1;i>=0;i--){const tm=gameTimers[i];tm.delay-=dt;if(tm.delay<=0){gameTimers.splice(i,1);tm.fn()}}}
function explodeBomb(b){
 fxAdd({kind:'ring',x:b.x,y:b.y,life:.4,max:.4,r:10,grow:220,color:'#ffb02a',w:6});burst(b.x,b.y,'#ffb02a',12,160,.5);sfx('explode');
 const n=10;for(let i=0;i<n;i++)enemyShot(b.x,b.y,i/n*TAU+rnd(0,.3),165,6,12,'heavy');
 if(!player.dead&&Math.hypot(b.x-player.x,b.y-player.y)<58)hit(22);
}
function updateHazards(dt){
 for(const h of hazards){
  h.t+=dt;
  if(h.state==='warn'&&h.t>=h.warn){h.state='fire';h.t=0;if(h.type==='beamV'||h.type==='beamH'){sfx('laser');addShake(5)}else if(h.type==='circle'){explosion(h.x,h.y,.9,h.color||'#ffb02a')}if(h.onFire)h.onFire(h)}
  if(h.state==='fire'){
   if(h.follow)h.x=h.follow();
   if(!player.dead){
    let inside=false;
    if(h.type==='beamV')inside=Math.abs(player.x-h.x)<h.w/2+8&&player.y>(h.y0||120);
    else if(h.type==='beamH')inside=Math.abs(player.y-h.y)<h.w/2+8;
    else if(h.type==='circle')inside=h.t<.15&&Math.hypot(player.x-h.x,player.y-h.y)<h.r;
    else if(h.type==='cloud')inside=Math.hypot(player.x-h.x,player.y-h.y)<h.r;
    else if(h.type==='pull'){const a=Math.atan2(h.y-player.y,h.x-player.x);target.x+=Math.cos(a)*120*dt;target.y+=Math.sin(a)*120*dt;player.x+=Math.cos(a)*70*dt;player.y+=Math.sin(a)*70*dt}
    if(inside)hit(h.dmg);
   }
   if(h.t>=h.active)h.done=true;
  }
 }
 if(hazards.some(h=>h.done))hazards=hazards.filter(h=>!h.done);
}
function collectPickup(p){
 const labels={repair:'РЕМОНТ +25',bomb:'БОМБА +1',overcharge:'ПЕРЕГРУЗКА ОРУДИЙ',credits:'+40 ₡',shield:'ЭНЕРГОЩИТ',magnet:'МАГНИТ'};stats.pickups++;
 if(p.type==='shield')player.bubble=12;if(p.type==='magnet')player.magnet=12;
 if(p.type==='repair')player.hp=Math.min(player.max,player.hp+25);
 if(p.type==='bomb'){player.bombs=Math.min(4,player.bombs+1);updateBombButton()}
 if(p.type==='overcharge')overcharge=8;
 if(p.type==='credits'){credits+=40;runCredits+=40}
 popText(p.x,p.y-20,labels[p.type],'#9fffd9',15);sfx('powerup');
}
function collideShots(){
 for(const b of shots){
  if(b.hit)continue;
  for(const f of foes){if(f===b.last)continue;const r=FOE[f.type].r+b.r;if(Math.abs(b.x-f.x)<r&&Math.abs(b.y-f.y)<r&&Math.hypot(b.x-f.x,b.y-f.y)<r){f.hp-=b.dmg;f.flash=.08;burst(b.x,b.y,'#ffaa44',2,90,.25);if(b.pierce>0){b.pierce--;b.last=f}else b.hit=true;break}}
  if(b.hit)continue;
  if(mini&&mini.y>0&&Math.hypot(b.x-mini.x,(b.y-mini.y)*1.15)<mini.size*.36+b.r){mini.hp-=b.dmg;mini.flash=.06;b.hit=true;if(Math.random()<.3)burst(b.x,b.y,mini.color,2,90,.25);continue}
  if(boss&&boss.y>0){
   const m=boss.modules.find(m=>{if(m.hp<=0||(m.wingMount&&boss.phase<3))return false;const p=modulePos(m);return Math.hypot(b.x-p.x,b.y-p.y)<30});
   if(m){m.hp-=b.dmg;m.flash=.08;b.hit=true;if(m.hp<=0){const mp=modulePos(m);explosion(mp.x,mp.y,1.4);score+=250;combatStats.bossModules++;sfx('module');addShake(6);popText(boss.x+m.x,boss.y+m.y-30,'ТУРЕЛЬ +250','#ffd27a')}continue}
   const dx=(b.x-boss.x)/250,dy=(b.y-(boss.y+10))/105;if(dx*dx+dy*dy<1){boss.hp-=b.dmg;boss.flash=.05;b.hit=true;if(Math.random()<.18)burst(b.x,b.y,'#ff5b62',3,120,.3)}
  }
 }
}
function collidePlayer(dt){
 const hidden=mode==='story'&&story.hide>0;
 for(const b of hostile){
  const dist=Math.hypot(b.x-player.x,b.y-player.y);
  if(dist<b.r+11){if(b.kind==='bomb'){b.dead=true;explodeBomb(b)}else{b.y=H+999;hit(b.dmg)}}
  else if(!b.grazed&&dist<b.r+30&&!hidden){b.grazed=true;graze++;stats.graze++;if(graze>stats.bestRunGraze)stats.bestRunGraze=graze;score+=5;sfx('graze');if(graze%20===0){player.hp=Math.min(player.max,player.hp+5);popText(player.x,player.y-50,'GRAZE +5','#7ff6ff',13)}}
 }
 for(const f of foes){if(Math.hypot(f.x-player.x,f.y-player.y)<FOE[f.type].r+14){f.hp=0;hit(f.type==='drone'||f.type==='duckling'?14:22)}}
 if(mini&&mini.dashing&&Math.abs(mini.x-player.x)<70&&Math.abs(mini.y-player.y)<70)hit(28);
}

/* ---------- Мини-боссы: 2 фазы и предупреждения ---------- */
function updateMini(dt){
 const m=mini;m.age+=dt;m.flash=Math.max(0,m.flash-dt);m.charge=Math.max(0,m.charge-dt);
 if(m.y<m.ty&&!m.dashing){m.y=Math.min(m.ty,m.y+220*dt);return}
 if(!m.phase2&&m.hp<m.max*.5){m.phase2=true;announce(m.name+' · ФАЗА 2',2.4,'ЯРОСТЬ: '+m.attack);sfx('phase');explosion(m.x,m.y,1.4,m.color);m.cd=1.4;m.specialCd=2.4;addShake(8)}
 const spd=(m.kind==='slipper'?1.8:1.1)*(m.phase2?1.35:1);
 if(!m.dashing)m.x=270+Math.sin(m.age*spd)*(m.phase2?140:115);
 else{m.dashT+=dt;const k=m.dashT/1.1;m.y=m.ty+Math.sin(Math.min(1,k)*Math.PI)*(H-m.ty-120);if(k>=1){m.dashing=false;m.y=m.ty}}
 if(player.dead)return;
 m.cd-=dt;m.specialCd-=dt;
 const hard=m.phase2,aim=Math.atan2(player.y-m.y,player.x-m.x),k=m.kind,col=m.color;
 const fan=(n,spread,speed,r=7,damage=13,kind='orb')=>{for(let i=0;i<n;i++)enemyShot(m.x,m.y+55,aim+(i-(n-1)/2)*spread,speed,r,damage,kind)};
 if(m.cd<=0&&!m.dashing){
  if(k==='duck'){for(let i=0;i<(hard?19:11);i++){const a=.1+i*Math.PI/(hard?18:10);enemyShot(m.x,m.y+55,a,205,7,12,'orb','#ffd84a')}}
  else if(k==='flower'){for(let i=0;i<(hard?20:12);i++){const a=i*TAU/(hard?20:12)+m.age*.55;enemyShot(m.x,m.y,a,145,6,12,'orb','#ff7ad8')}}
  else if(k==='slipper'){fan(hard?5:3,.19,330,8,16);for(let i=-1;i<=1;i++)shoot(m.x+i*62,m.y+45,0,125,true,14,22,'heavy',BULLET_COLORS.heavy)}
  else if(k==='mountain'){fan(hard?7:5,.28,140,14,22,'heavy')}
  else if(k==='dumpling'){fan(hard?13:8,.18,190,9,14,'orb')}
  else if(k==='toilet'){for(let i=0;i<(hard?18:12);i++){const a=i*TAU/(hard?18:12)+m.age;enemyShot(m.x,m.y,a,175,7,14,'orb',BULLET_COLORS.ice)}}
  else if(k==='grandpa'){fan(hard?9:5,.11,hard?350:290,7,18,'heavy')}
  else if(k==='sock'){fan(hard?17:11,.26,hard?120:95,11,12,'toxic')}
  m.cd=hard?.85:1.55;
 }
 if(m.specialCd<=0&&!m.dashing){miniSpecial(m);m.specialCd=hard?4.6:7}
}
function miniSpecial(m){
 const hard=m.phase2,px=player.x;announce('⚠ '+(hard?m.attack:m.special),1.3);m.charge=1;
 switch(m.kind){
  case 'duck':
   for(let i=0;i<(hard?6:4);i++)makeFoe('duckling',m.x+(i-1.5)*40,m.y+40,{vx:(i-1.5)*80,vy:60,home:2.5});
   if(hard)setTimeoutGame(()=>{if(!mini)return;for(let r=0;r<3;r++)setTimeoutGame(()=>{if(!mini)return;for(let i=0;i<16;i++)enemyShot(mini.x,mini.y+40,i/16*TAU+r*.2,180,7,13,'orb','#ffd84a')},r*.25)},.9);
   break;
  case 'flower':{const xs=hard?[px,px-150,px+150,rnd(40,500)]:[px,rnd(40,500),rnd(40,500)];for(const x of xs)addHazard({type:'beamV',x:clamp(x,30,510),w:46,warn:1.05,active:.6,dmg:20,color:'#ff7ad8',label:'ЛЕПЕСТОК'});break}
  case 'slipper':addHazard({type:'beamV',x:clamp(px,60,480),w:120,warn:.95,active:1.1,dmg:0,color:'#b0e2ff',label:'ШЛЁПОК',onFire:h=>{if(mini){mini.x=h.x;mini.dashing=true;mini.dashT=0;addShake(10);sfx('bomb')}}});break;
  case 'mountain':for(let i=0;i<(hard?7:5);i++)addHazard({type:'circle',x:i===0?px:rnd(50,490),y:i===0?player.y:rnd(330,H-80),r:60,warn:1.25,active:.3,dmg:20,color:'#ff9a3a',label:'МИНА'});break;
  case 'dumpling':{const xs=[];for(let i=0;i<(hard?5:4);i++)xs.push(i===0?px:rnd(40,500));for(const x of xs)addHazard({type:'beamV',x:clamp(x,30,510),w:56,warn:1.1,active:.9,dmg:16,color:'#ffe1a8',label:'ПЕЛЬМЕНИ',rain:true});break}
  case 'toilet':addHazard({type:'pull',x:m.x,y:m.y,warn:.9,active:hard?3:2.2,dmg:0,color:'#5ff3ff',label:'СМЫВ'});if(hard)setTimeoutGame(()=>{if(mini)for(let i=0;i<24;i++)enemyShot(mini.x,mini.y,i/24*TAU,150,6,12,'orb',BULLET_COLORS.ice)},1.2);break;
  case 'grandpa':addHazard({type:'beamH',y:clamp(player.y,300,H-60),w:hard?90:70,warn:1.1,active:.7,dmg:22,color:'#ff6a2a',label:'ТЕРМОУДАР'});if(hard)addHazard({type:'beamV',x:px,w:50,warn:1.3,active:.6,dmg:20,color:'#ff6a2a'});break;
  case 'sock':for(let i=0;i<(hard?4:3);i++)addHazard({type:'cloud',x:i===0?px:rnd(60,480),y:i===0?player.y:rnd(320,H-100),r:hard?82:70,warn:1,active:4,dmg:9,color:'#9dff5a',label:'ВОНЬ'});break;
 }
}
function defeatMini(){
 const m=mini;explosion(m.x,m.y,2.6,m.color);for(let i=0;i<4;i++)explosion(m.x+rnd(-80,80),m.y+rnd(-50,50),1);sfx('explodeBig');addShake(14);vibrate([90,40,140]);
 if(!minisDefeated.includes(m.kind))minisDefeated.push(m.kind);stats.minis++;if(!m.hitTaken){stats.flawlessMini++;popText(m.x,m.y+40,'БЕЗ УРОНА!','#9fffd9',16)}
 score+=1200;credits+=120;runCredits+=120;persist();checkAchievements();mini=null;hostile=[];hazards=[];miniCleared=true;paradeKills++;sfx('win');popText(m.x,m.y,'+1200','#ffe28a',22);
 foes=foes.filter(f=>f.type!=='duckling');
 if(mode==='story'){if(currentCaseStage<3){finishCaseStage();return}else if(!story.interlude)showInterlude()}
 if(mode==='parade'){paradeBest=Math.max(paradeBest,paradeKills);persist();if(paradeKills>=MINI.length){paradeCleared=true;end(true);return}player.hp=Math.min(player.max,player.hp+20);paradeRest=2.5;announce('СЛЕДУЮЩИЙ: '+MINI[paradeKills].name,2.2,'ПАРАД ДЕБИЛОВ '+paradeKills+'/'+MINI.length+' · РЕМОНТ +20')}
}

/* ---------- Архитектор Бездны: 4 фазы ---------- */
const wingK=()=>1;
// Мировые координаты турели с учётом раскрытия щитов флагмана.
function modulePos(m){const b=boss;const sh=m.wingMount?m.side*b.wing*26:0;return {x:b.x+m.x+sh,y:b.y+m.y+(m.wingMount?b.wing*6:0)}}
function updateBoss(dt){
 const b=boss;b.age+=dt;b.flash=Math.max(0,b.flash-dt);
 if(b.y<b.ty){b.y=Math.min(b.ty,b.y+120*dt);return}
 const p=b.hp/b.max,bp=p>.75?1:p>.5?2:p>.25?3:4;
 if(bp!==b.phase){b.phase=bp;phaseSeen=bp;
  const names=['','','ТУРЕЛИ АКТИВНЫ','ЛУЧИ БЕЗДНЫ','АБСОЛЮТНЫЙ ЗАЛП'];announce('АРХИТЕКТОР · ФАЗА '+bp,2.4,names[bp]);sfx('phase');addShake(12);vibrate(90);
  explosion(b.x,b.y,2,bp>=3?'#ff3a4a':'#ffb04d');hostile=[];
  if(bp===3){for(const s of [-1,1])makeFoe('zig',270+s*170,-40,{elite:true})}
 }
 b.wing=lerp(b.wing,b.phase>=3?1:0,dt*1.5);
 b.x=270+Math.sin(b.age*(b.phase===4?1.15:.85))*(b.phase>=3?55:70);
 if(b.phase===4&&Math.random()<dt*6)fxAdd({kind:'smoke',x:b.x+rnd(-140,140),y:b.y+rnd(-40,80),vx:rnd(-10,10),vy:-30,life:1,max:1,r:16});
 if(player.dead)return;
 b.cd-=dt;b.laserCd-=dt;b.specialCd-=dt;b.escortCd-=dt;
 for(const m of b.modules)m.flash=Math.max(0,(m.flash||0)-dt);
 if(b.cd<=0){
  const n=b.phase===1?9:b.phase===2?13:b.phase===3?13:17;
  for(let i=0;i<n;i++){const a=(i/(n-1))*Math.PI*.92+Math.PI*.04;enemyShot(b.x,b.y+122,a,220,7,12,'orb')}
  if(b.phase>=2)for(const m of b.modules.filter(m=>m.hp>0&&(!m.wingMount||b.phase>=3))){const mp=modulePos(m),mx=mp.x,my=mp.y,a=Math.atan2(player.y-my,player.x-mx);enemyShot(mx,my+12,a,260,8,17,'heavy')}
  if(p<.65){const a=Math.atan2(player.y-b.y-48,player.x-b.x);for(let k=-1;k<=1;k++)enemyShot(b.x-3,b.y+48,a+k*.16,300,5,15,'needle')}
  b.cd=b.phase===1?1.35:b.phase===2?1.12:b.phase===3?.85:.6;
 }
 // Гравитационные кольца с проходом.
 if(b.specialCd<=0){const gaps=b.phase>=2?2:1,base=Math.atan2(player.y-b.y,player.x-b.x),n=26;
  for(let i=0;i<n;i++){const a=i/n*TAU;let skip=false;for(let gI=0;gI<gaps;gI++){let d=a-(base+gI*Math.PI);d=Math.atan2(Math.sin(d),Math.cos(d));if(Math.abs(d)<.32)skip=true}if(!skip)enemyShot(b.x,b.y+20,a,150,7,13,'orb','#a874ff')}
  fxAdd({kind:'ring',x:b.x,y:b.y+20,life:.5,max:.5,r:40,grow:300,color:'#a874ff',w:6});b.specialCd=b.phase===4?3.4:5}
 if(b.phase===2&&b.escortCd<=0){for(const s of [-1,1])makeFoe('scout',clamp(b.x+s*150,40,500),b.y+40);b.escortCd=8}
 if(b.phase>=3&&b.laserCd<=0){addHazard({type:'beamV',x:clamp(player.x,45,W-45),w:50,warn:1.1,active:.75,dmg:25,color:'#ff245b',label:'ЛАЗЕР',y0:b.y+125});if(b.phase===4)addHazard({type:'beamV',x:clamp(player.x+(Math.random()<.5?-140:140),45,W-45),w:50,warn:1.3,active:.75,dmg:25,color:'#ff245b',y0:b.y+125});b.laserCd=b.phase===4?3.2:4.6;sfx('charge')}
 if(b.phase===4){b.spiral+=dt;if(b.spiral>.16){b.spiral=0;for(let k=0;k<4;k++)enemyShot(b.x-3,b.y+20,b.age*2.2+k*TAU/4,170,6,12,'orb','#ff4a6a')}
  if(Math.random()<dt*.12&&!hazards.some(h=>h.type==='beamH'))addHazard({type:'beamH',y:clamp(player.y,b.y+200,H-60),w:70,warn:1.2,active:.6,dmg:22,color:'#ff245b',label:'АБСОЛЮТНЫЙ ЗАЛП'})}
}

/* ---------- Конец забега ---------- */
function end(win){
 if(state!=='play')return;
 document.body.classList.remove('in-combat');pauseBtn.style.display='none';hideBtn.style.display='none';freezeBtn.style.display='none';bombBtn.style.display='none';
 sfx(win?'win':'lose');const reward=Math.floor(score/10)+(win?400:0);credits+=reward;runCredits+=reward;bestScore=Math.max(bestScore,score);
 if(mode==='endless')abyssBestWave=Math.max(abyssBestWave,wave);
 const xpGain=Math.floor(score/25)+kills+(win?150:0),rankBefore=rankIndex();persist();checkAchievements();addXp(xpGain);lastRunSummary={xpGain,rankBefore};
 if(win&&mode==='story'){showEndingChoice();return}
 state=win?'win':'lose';panel.style.display='block';panel.classList.remove('hangar');
 const title=win?(mode==='parade'?'ПАРАД ОКОНЧЕН':'ПОБЕДА'):'КОРАБЛЬ УНИЧТОЖЕН';
 const sub=win?(mode==='parade'?'Все восемь аномалий повержены.':'Архитектор Бездны отступил.'):mode==='story'?'Розыскная операция прервана. Координаты цели сохранены.':'Конклав захватил сектор.';
 panel.innerHTML=`<div class="dialog-scene result ${win?'win':'lose'}"><span class="eyebrow">${mode==='story'?'РОЗЫСК СОЧ · '+caseCurrent().sector:mode==='endless'?'РЕЖИМ БЕЗДНА':'ПАРАД ДЕБИЛОВ'}</span><h1>${title}</h1><p>${sub}</p>
 <div class="result-grid"><div><b>${score.toLocaleString('ru-RU')}</b><span>ОЧКИ</span></div><div><b>${kills}</b><span>СБИТО</span></div><div><b>${graze}</b><span>GRAZE</span></div><div><b>${mode==='endless'?wave:mode==='parade'?paradeKills+'/'+MINI.length:combatStats.bossModules}</b><span>${mode==='endless'?'ВОЛНА':mode==='parade'?'АНОМАЛИИ':'ТУРЕЛИ'}</span></div></div>
 <div class="terminal"><span>НАГРАДА ЗА БОЙ: +${reward} ₡${runCredits>reward?' · ВСЕГО ЗА ВЫЛЕТ +'+runCredits+' ₡':''}</span><span>РЕКОРД: ${bestScore.toLocaleString('ru-RU')}${mode==='endless'?' · ЛУЧШАЯ ВОЛНА '+abyssBestWave:''}</span>${challengeActive?`<span>ИСПЫТАНИЕ «${challengeActive.name}»: ${challengeDoneToday()?'ПРОЙДЕНО ✓':'цель — волна '+CHALLENGE_GOAL}</span>`:''}</div>
 ${runSummaryHtml()}
 <button id="again">${mode==='story'?'ПОВТОРИТЬ ОПЕРАЦИЮ':'ИГРАТЬ СНОВА'}</button><button id="toHangar" class="ghost">В АНГАР</button><p class="hint">Награды сохранены в ангаре.</p></div>`;
 document.querySelector('#again').onclick=()=>mode==='story'?startCaseStage(currentCaseStage):reset();
 document.querySelector('#toHangar').onclick=()=>menu('ship');
}
let lastRunSummary=null;
// Блок итогов: опыт, звание, достижения за вылет.
function runSummaryHtml(){
 const s=lastRunSummary;if(!s)return '';const rp=rankProgress(),up=rp.i>s.rankBefore;
 return `<div class="run-sum"><div class="rank-line"><b>🎖 ${RANKS[rp.i][0]}</b><span>+${s.xpGain} опыта</span></div><div class="xpbar"><i style="width:${Math.round(rp.k*100)}%"></i></div>${up?'<p class="hint">Повышение звания! Награда зачислена.</p>':''}
 ${runAchievements.length?`<div class="ach-mini">${runAchievements.map(id=>{const a=ACH.find(x=>x.id===id);return `<span>${a.ic} ${a.name} · +${a.reward} ₡</span>`}).join('')}</div>`:''}</div>`;
}
function offerPerks(){
 if(state!=='play')return;state='perk';perkChoices++;panel.style.display='block';panel.classList.remove('hangar');
 panel.innerHTML=`<div class="dialog-scene"><span class="eyebrow">БЕЗДНА · ВОЛНА ${wave}</span><h1>УСИЛЕНИЕ ЗАБЕГА</h1><p>Выбери один модуль. Он действует до конца вылета.</p><div class="perk-grid"><button id="perk1"><i>⚡</i><b>ПЕРЕГРУЗКА</b><small>+20% урона</small></button><button id="perk2"><i>🛡</i><b>ЩИТ</b><small>Восстановить 35 HP</small></button><button id="perk3"><i>🚀</i><b>УСКОРИТЕЛЬ</b><small>+15% манёвренности</small></button></div></div>`;
 document.querySelector('#perk1').onclick=()=>{perkDamage*=1.2;resumePerk()};
 document.querySelector('#perk2').onclick=()=>{player.hp=Math.min(player.max,player.hp+35);perkShield++;resumePerk()};
 document.querySelector('#perk3').onclick=()=>{perkSpeed=Math.min(2,perkSpeed*1.15);resumePerk()};
}
function resumePerk(){sfx('upgrade');state='play';panel.style.display='none';last=performance.now()}
