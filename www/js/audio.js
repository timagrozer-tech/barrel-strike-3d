'use strict';
/* Web Audio: синтезированные эффекты и процедурная музыка без внешних файлов.
 * Шины: master → компрессор → выход; fx и music — отдельные регуляторы.
 * Контекст создаётся на первом касании и возобновляется после сворачивания. */
const audio={ctx:null,master:null,fxBus:null,musicBus:null,comp:null,noise:null,enabled:true,musicOn:true,fx:.48,musicVolume:.15,lastShot:0,beat:0,step:0,scene:'',bar:0,lastSfx:{}};
function initAudio(){
 try{
  if(!audio.ctx){
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
   const ctx=audio.ctx=new AC({latencyHint:'interactive'});
   audio.comp=ctx.createDynamicsCompressor();audio.comp.threshold.value=-14;audio.comp.ratio.value=5;audio.comp.connect(ctx.destination);
   audio.master=ctx.createGain();audio.master.connect(audio.comp);
   audio.fxBus=ctx.createGain();audio.fxBus.connect(audio.master);
   audio.musicBus=ctx.createGain();audio.musicBus.connect(audio.master);
   const len=ctx.sampleRate*1.2,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
   for(let i=0;i<len;i++)d[i]=Math.random()*2-1;audio.noise=buf;
   applyVolumes();
  }
  if(audio.ctx.state!=='running')audio.ctx.resume().catch(()=>{});
 }catch(e){console.warn('Audio unavailable',e)}
}
function applyVolumes(){
 audio.fx=settings.fx;audio.musicVolume=settings.music;
 if(!audio.ctx)return;const now=audio.ctx.currentTime;
 audio.master.gain.setTargetAtTime(settings.master,now,.02);
 audio.fxBus.gain.setTargetAtTime(audio.enabled?settings.fx*2.1:0,now,.02);
 audio.musicBus.gain.setTargetAtTime(audio.musicOn?settings.music*2.2:0,now,.05);
}
// Возобновление после сворачивания: без «догоняющих» нот, т.к. планировщик идёт от dt кадра.
['pointerdown','touchstart','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(audio.ctx&&audio.ctx.state!=='running')audio.ctx.resume().catch(()=>{})},{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!audio.ctx)return;if(document.hidden)audio.ctx.suspend().catch(()=>{});else{audio.beat=0;audio.ctx.resume().catch(()=>{})}});

function tone(freq=440,duration=.12,type='sine',vol=.12,slide=0,delay=0,bus){
 if(!audio.ctx||audio.ctx.state!=='running')return;const ctx=audio.ctx,now=ctx.currentTime+delay,o=ctx.createOscillator(),v=ctx.createGain();
 o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),now);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),now+duration);
 v.gain.setValueAtTime(.0001,now);v.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),now+.008);v.gain.exponentialRampToValueAtTime(.0001,now+duration);
 o.connect(v);v.connect(bus||audio.fxBus);o.start(now);o.stop(now+duration+.03);
}
function noiseBurst(duration=.3,vol=.3,freq=900,delay=0,bus,q=.7,sweep=0){
 if(!audio.ctx||audio.ctx.state!=='running'||!audio.noise)return;const ctx=audio.ctx,now=ctx.currentTime+delay;
 const s=ctx.createBufferSource();s.buffer=audio.noise;s.playbackRate.value=rnd(.8,1.2);
 const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(freq,now);f.Q.value=q;if(sweep)f.frequency.exponentialRampToValueAtTime(Math.max(40,freq+sweep),now+duration);
 const v=ctx.createGain();v.gain.setValueAtTime(vol,now);v.gain.exponentialRampToValueAtTime(.0001,now+duration);
 s.connect(f);f.connect(v);v.connect(bus||audio.fxBus);s.start(now,rnd(0,.5));s.stop(now+duration+.05);
}
const SFX_GAP={shot:.075,hit:.06,enemy:.05,explode:.045,collect:.04,graze:.09,module:.08,drone:.1};
function sfx(name){
 if(!audio.ctx||!audio.enabled)return;
 const nowT=performance.now()/1000,gap=SFX_GAP[name]||0;if(gap&&audio.lastSfx[name]&&nowT-audio.lastSfx[name]<gap)return;audio.lastSfx[name]=nowT;
 switch(name){
  case 'shot':tone(weapon==='plasma'?330:620,.07,'sawtooth',.028,weapon==='plasma'?-180:-400);break;
  case 'hit':tone(170,.2,'square',.09,-125);noiseBurst(.18,.12,1600,0,null,.7,-1200);break;
  case 'enemy':case 'explode':noiseBurst(.32,.16,1400,0,null,.8,-1100);tone(120,.24,'sawtooth',.05,-80);break;
  case 'explodeBig':noiseBurst(.9,.34,2400,0,null,.6,-2200);tone(70,.8,'sine',.16,-35);tone(140,.4,'sawtooth',.07,-90,.04);break;
  case 'bomb':noiseBurst(1.1,.38,3000,0,null,.5,-2800);tone(110,.65,'sawtooth',.15,-80);tone(440,.5,'triangle',.07,-390);break;
  case 'boss':for(let i=0;i<3;i++)tone(120+i*38,.4,'sawtooth',.11,-55,i*.22);break;
  case 'win':for(let i=0;i<5;i++)tone([330,440,550,660,880][i],.35,'triangle',.1,0,i*.13);break;
  case 'lose':for(let i=0;i<4;i++)tone(420-i*75,.32,'triangle',.08,-55,i*.15);break;
  case 'upgrade':tone(500,.15,'sine',.09,300);tone(800,.2,'sine',.06,200,.12);break;
  case 'warning':tone(670,.1,'square',.07,-250);tone(680,.1,'square',.06,-250,.21);break;
  case 'charge':tone(220,.7,'sawtooth',.05,620);tone(440,.7,'sine',.04,900);break;
  case 'laser':noiseBurst(.6,.16,4200,0,null,2,-3000);tone(90,.6,'sawtooth',.09,30);break;
  case 'phase':tone(130,.5,'sawtooth',.11,360);tone(250,.7,'triangle',.08,400,.12);noiseBurst(.6,.12,900,.05);break;
  case 'module':noiseBurst(.4,.2,1800,0,null,.7,-1500);tone(220,.18,'square',.08,-130);tone(155,.35,'sawtooth',.08,-90,.13);break;
  case 'collect':tone(800,.09,'sine',.07,210);break;
  case 'powerup':tone(520,.1,'triangle',.08,260);tone(780,.12,'triangle',.07,320,.08);tone(1040,.16,'sine',.06,200,.16);break;
  case 'graze':tone(1500,.04,'sine',.025,300);break;
  case 'drone':tone(900,.06,'square',.025,-500);break;
  case 'paper':tone(680,.12,'triangle',.09,240);tone(1040,.1,'sine',.05,100,.1);break;
  case 'alert':for(let i=0;i<3;i++){tone(320,.17,'square',.09,-150,i*.25);tone(460,.14,'triangle',.06,-200,i*.25+.13)}break;
  case 'hide':tone(380,.34,'sine',.06,-230);tone(760,.15,'triangle',.05,-500,.1);break;
  case 'freeze':tone(880,.45,'triangle',.07,-700);tone(660,.3,'sine',.07,-400,.16);break;
  case 'dialog':tone(510,.075,'triangle',.06,-35);break;
  case 'step':tone(120,.055,'triangle',.025,-38);break;
  case 'caught':tone(170,.45,'sawtooth',.13,-130);tone(710,.22,'square',.07,-430,.12);break;
  case 'door':tone(355,.22,'triangle',.08,400);tone(490,.16,'sine',.07,160,.2);break;
  case 'signal':tone(400,.14,'triangle',.09,250);tone(660,.12,'sine',.06,180,.15);tone(830,.2,'triangle',.06,210,.27);break;
  case 'clue':tone(660,.12,'triangle',.07,160);tone(900,.16,'sine',.08,160,.09);break;
  case 'market':tone(110,.35,'sawtooth',.06,-40);tone(220,.18,'triangle',.05,190,.16);break;
  case 'trade':tone(540,.13,'triangle',.09,400);tone(830,.19,'sine',.08,250,.12);break;
  case 'scanner':tone(930,.1,'square',.06,-380);tone(440,.2,'sawtooth',.05,-290,.09);break;
  case 'raid':for(let i=0;i<4;i++)tone(260+i*30,.19,'square',.08,-120,i*.22);break;
  case 'click':tone(700,.04,'triangle',.04,-200);break;
 }
}
// Процедурная музыка: у каждой сцены свой темп, бас, мелодия и ударные.
const MUSIC={
 combat:{beat:.155,cat:'musicCombat',bass:[55,55,65.41,55,73.42,55,65.41,49],lead:[220,0,329.6,0,293.7,0,392,329.6,0,261.6,0,293.7,329.6,0,0,0],drum:'x.h.s.h.x.x.s.h.'},
 pursuit:{beat:.14,cat:'musicCombat',bass:[73.42,73.42,87.31,73.42,98,73.42,65.41,58.27],lead:[293.7,0,392,440,0,329.6,0,293.7,246.9,0,261.6,0,349.2,0,0,0],drum:'x.hhs.h.x.xhs.hh'},
 alert:{beat:.125,cat:'musicCombat',bass:[46.25,46.25,61.74,46.25,41.2,46.25,55,41.2],lead:[185,0,185,246.9,0,164.8,185,0,220,0,164.8,0,146.8,0,0,0],drum:'x.hsx.hsx.hsxshs'},
 anomaly:{beat:.13,cat:'musicBoss',bass:[55,69.3,82.41,61.74,73.42,55,82.41,92.5],lead:[220,277.2,329.6,0,246.9,0,293.7,220,0,329.6,0,370,0,0,0,0],drum:'x.hsx.hsxxhs.hsh'},
 anomaly2:{beat:.11,cat:'musicBoss',bass:[55,55,69.3,55,82.41,55,92.5,98],lead:[440,0,554.4,0,659.3,0,493.9,587.3,0,440,0,659.3,739.9,0,0,0],drum:'xhsxxhsxxhsxxsss'},
 architect1:{beat:.16,cat:'musicBoss',bass:[41.2,41.2,49,41.2,61.74,55,49,36.71],lead:[164.8,0,0,196,0,0,246.9,220,0,0,146.8,0,185,0,0,0],drum:'x...s...x.x.s...'},
 architect2:{beat:.14,cat:'musicBoss',bass:[41.2,49,61.74,55,36.71,46.25,55,61.74],lead:[164.8,196,246.9,0,220,0,146.8,185,0,220,0,246.9,0,0,0,0],drum:'x.h.s.h.x.xhs.h.'},
 architect3:{beat:.12,cat:'musicBoss',bass:[41.2,41.2,55,41.2,58.27,41.2,61.74,65.41],lead:[329.6,0,392,0,466.2,0,440,392,0,329.6,0,493.9,0,0,0,0],drum:'x.hsx.hsx.hsxshs'},
 architect4:{beat:.1,cat:'musicBoss',bass:[41.2,41.2,43.65,41.2,49,41.2,51.91,55],lead:[659.3,0,622.3,659.3,0,493.9,0,523.3,0,587.3,0,659.3,698.5,0,0,0],drum:'xhsxxhsxxhsxxsss'},
 sneak:{beat:.26,cat:'musicBase',bass:[73.42,0,87.31,0,65.41,0,82.41,0],lead:[293.7,0,0,349.2,0,0,261.6,0,0,329.6,0,0,0,0,0,0],drum:'..h...h...h...hs'},
 market:{beat:.22,cat:'musicBase',bass:[65.41,98,65.41,73.42,110,73.42,61.74,92.5],lead:[261.6,0,311.1,0,0,392,0,349.2,0,311.1,0,261.6,0,0,0,0],drum:'x.h.s.hhx.h.s.h.'}
};
function musicNote(freq,type,vol,len,when,cat){
 const ctx=audio.ctx,o=ctx.createOscillator(),v=ctx.createGain();o.type=type;o.frequency.value=freq;
 v.gain.setValueAtTime(.0001,when);v.gain.linearRampToValueAtTime(Math.max(.0002,vol*cat),when+.015);v.gain.exponentialRampToValueAtTime(.0001,when+len);
 o.connect(v);v.connect(audio.musicBus);o.start(when);o.stop(when+len+.03);
}
function musicDrum(kind,when,cat){
 const ctx=audio.ctx;
 if(kind==='x'){const o=ctx.createOscillator(),v=ctx.createGain();o.frequency.setValueAtTime(140,when);o.frequency.exponentialRampToValueAtTime(42,when+.12);v.gain.setValueAtTime(.55*cat,when);v.gain.exponentialRampToValueAtTime(.0001,when+.16);o.connect(v);v.connect(audio.musicBus);o.start(when);o.stop(when+.2)}
 else{const s=ctx.createBufferSource();s.buffer=audio.noise;const f=ctx.createBiquadFilter();f.type=kind==='h'?'highpass':'bandpass';f.frequency.value=kind==='h'?7000:1800;const v=ctx.createGain();const len=kind==='h'?.04:.11;v.gain.setValueAtTime((kind==='h'?.12:.3)*cat,when);v.gain.exponentialRampToValueAtTime(.0001,when+len);s.connect(f);f.connect(v);v.connect(audio.musicBus);s.start(when,Math.random()*.5);s.stop(when+len+.02)}
}
function currentMusicScene(){
 if(state==='market')return 'market';if(state==='office')return 'sneak';
 if(typeof boss!=='undefined'&&boss)return 'architect'+(boss.phase||1);
 if(typeof mini!=='undefined'&&mini)return mini.phase2?'anomaly2':'anomaly';
 if(mode==='story')return story.suspicion>70?'alert':'pursuit';
 return 'combat';
}
function musicTick(dt){
 if(!audio.ctx||!audio.musicOn||audio.ctx.state!=='running'||!['play','office','market'].includes(state))return;
 const scene=currentMusicScene();if(audio.scene!==scene){audio.scene=scene;audio.beat=0;audio.step=0}
 audio.beat-=dt;if(audio.beat>0)return;
 const m=MUSIC[scene],cat=settings[m.cat]??1;audio.beat+=m.beat;if(audio.beat<-.3)audio.beat=0;
 const step=audio.step++,when=audio.ctx.currentTime+.03;
 const lead=m.lead[step%16];if(lead)musicNote(lead,scene.startsWith('architect')?'sawtooth':'triangle',scene.startsWith('architect')?.11:.17,m.beat*1.6,when,cat);
 if(step%2===0){const b=m.bass[(step/2|0)%8];if(b)musicNote(b,'sawtooth',.2,m.beat*1.8,when,cat);if(b)musicNote(b/2,'sine',.32,m.beat*2,when,cat)}
 const d=m.drum[step%16];if(d&&d!=='.')musicDrum(d,when,cat);
 if(scene.startsWith('architect')&&step%16===0)musicNote(m.bass[0]*2,'triangle',.16,m.beat*12,when,cat);
}
