'use strict';
/* Сохранения. Ключ localStorage остаётся 'vf02' (совместимость со всеми прежними версиями).
 * С версии 2.0 в объект добавлено поле saveVersion и новые поля; старые поля не переименованы.
 * Перед первой миграцией исходная запись копируется в 'vf02_backup_v1'. */
const SAVE_KEY='vf02',SAVE_VERSION=3,SAVE_BACKUP='vf02_backup_v1';
const SHIP_IDS=['astra','titan','specter','valkyrie','bastion','hive','nova','archon'];
let credits=0,weapon='laser',weaponLevel=1,ship='astra',shipUnlocked=false,drones=0,missiles=0,bestScore=0;
let officeBest=0,officeCleared=false,lowerMarketKnown=false,marketVisits=0,marketRaids=0;
let contraband={overdrive:false,armor:false,jammer:false,blackMissiles:false,shadowDrones:false,phaseShield:false};
let caseUnlocked=0,caseCleared=[false,false,false,false,false],caseBest=[0,0,0,0,0],caseEndings=[],storyEndings=[];
// Новое в 2.0
let hullLevel=1,abyssBestWave=0,paradeBest=0,paradeCleared=false,totalKills=0,profileCreated=0;
// Новое в 2.1: корабли, достижения, звания, ежедневные награды, статистика
let ownedShips=['astra','titan'],achievements=[],pilotXp=0,dailyStreak=0,dailyLast='',challengeDone='',minisDefeated=[];
const STATS_DEFAULT=()=>({kills:0,elites:0,minis:0,bosses:0,graze:0,bombs:0,runs:0,deaths:0,bestCombo:0,earned:0,pickups:0,flawlessMini:0,bestRunGraze:0,playTime:0,challenges:0,phantoms:0});
let stats=STATS_DEFAULT(),lastCreditsSeen=0;
const CONTRABAND_KEYS=['overdrive','armor','jammer','blackMissiles','shadowDrones','phaseShield'];
const ENDING_IDS=['escape','chief','loop'];
const num=(v,min,max,def=0)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):def};

// Мягкая миграция: принимает любой объект старой/новой версии, возвращает нормализованный профиль v2.
function migrateSave(raw){
 const s=raw&&typeof raw==='object'?raw:{};const ver=Number(s.saveVersion)||1;
 const out={
  saveVersion:SAVE_VERSION,
  credits:Math.floor(num(s.credits,0,1e9)),
  weaponLevel:Math.floor(num(s.weaponLevel,1,10,1)),
  weapon:s.weapon==='plasma'?'plasma':'laser',
  ship:SHIP_IDS.includes(s.ship)?s.ship:'astra',
  shipUnlocked:!!s.shipUnlocked,
  drones:Math.floor(num(s.drones,0,2)),missiles:Math.floor(num(s.missiles,0,3)),
  bestScore:Math.floor(num(s.bestScore,0,1e10)),officeBest:num(s.officeBest,0,1e6),officeCleared:!!s.officeCleared,
  lowerMarketKnown:!!s.lowerMarketKnown,marketVisits:Math.floor(num(s.marketVisits,0,1e6)),marketRaids:Math.floor(num(s.marketRaids,0,1e6)),
  contraband:Object.fromEntries(CONTRABAND_KEYS.map(k=>[k,!!(s.contraband&&s.contraband[k])])),
  caseUnlocked:Math.floor(num(s.caseUnlocked,0,4)),
  caseCleared:[0,1,2,3,4].map(i=>!!(Array.isArray(s.caseCleared)&&s.caseCleared[i])),
  caseBest:[0,1,2,3,4].map(i=>Math.floor(num(Array.isArray(s.caseBest)?s.caseBest[i]:0,0,1e10))),
  caseEndings:Array.isArray(s.caseEndings)?[...new Set(s.caseEndings.filter(e=>ENDING_IDS.includes(e)))]:[],
  storyEndings:Array.isArray(s.storyEndings)?[...new Set(s.storyEndings.filter(e=>ENDING_IDS.includes(e)))]:[],
  musicOn:s.musicOn!==false,soundOn:s.soundOn!==false,
  settings:{},
  hullLevel:1,abyssBestWave:Math.floor(num(s.abyssBestWave,0,1e5)),paradeBest:Math.floor(num(s.paradeBest,0,8)),paradeCleared:!!s.paradeCleared,
  totalKills:Math.floor(num(s.totalKills,0,1e9)),profileCreated:num(s.profileCreated,0,1e14,Date.now())
 };
 // Корабли: TITAN всегда был бесплатным, SPECTER — если был разблокирован.
 const owned=new Set(['astra','titan']);if(out.shipUnlocked)owned.add('specter');
 if(Array.isArray(s.ownedShips))s.ownedShips.forEach(id=>{if(SHIP_IDS.includes(id))owned.add(id)});
 out.ownedShips=SHIP_IDS.filter(id=>owned.has(id));out.shipUnlocked=owned.has('specter');
 if(!owned.has(out.ship))out.ship='astra';
 if(out.caseEndings.length&&out.caseUnlocked<4)out.caseUnlocked=4;
 out.achievements=Array.isArray(s.achievements)?[...new Set(s.achievements.filter(x=>typeof x==='string'))]:[];
 out.pilotXp=Math.floor(num(s.pilotXp,0,1e9));out.dailyStreak=Math.floor(num(s.dailyStreak,0,7));
 out.dailyLast=typeof s.dailyLast==='string'?s.dailyLast.slice(0,10):'';out.challengeDone=typeof s.challengeDone==='string'?s.challengeDone.slice(0,10):'';
 out.minisDefeated=Array.isArray(s.minisDefeated)?[...new Set(s.minisDefeated.filter(x=>typeof x==='string'))]:[];
 const st0=STATS_DEFAULT(),sst=s.stats&&typeof s.stats==='object'?s.stats:{};out.stats=Object.fromEntries(Object.keys(st0).map(k=>[k,num(sst[k],0,1e12)]));
 if(ver<3){out.stats.kills=Math.max(out.stats.kills,out.totalKills);out.pilotXp=Math.max(out.pilotXp,Math.floor(out.bestScore/25));}
 // Корпус: в 1.4–1.5 внешний вид корабля зависел от уровня оружия (ступени 1–4).
 // Чтобы обновление не «откатило» внешний вид, стартовый уровень корпуса = прежняя ступень.
 out.hullLevel=ver<2?Math.max(1,Math.min(4,out.weaponLevel)):Math.floor(num(s.hullLevel,1,5,1));
 const st=s.settings&&typeof s.settings==='object'?s.settings:{};
 out.settings={
  master:num(st.master,0,1,.8),fx:num(st.fx,0,1,.48),music:num(st.music,0,1,.15),
  musicCombat:num(st.musicCombat,0,1.5,1),musicBoss:num(st.musicBoss,0,1.5,1),musicBase:num(st.musicBase,0,1.5,1),
  quality:['auto','low','medium','high'].includes(st.quality)?st.quality:'auto',
  shake:st.shake!==false,vibrate:st.vibrate!==false,buttons:['s','m','l'].includes(st.buttons)?st.buttons:'m',control:st.control==='drag'?'drag':'point'
 };
 return out;
}
function applyProfile(p){
 credits=p.credits;weaponLevel=p.weaponLevel;weapon=p.weapon;ship=p.ship;shipUnlocked=p.shipUnlocked;drones=p.drones;missiles=p.missiles;
 bestScore=p.bestScore;officeBest=p.officeBest;officeCleared=p.officeCleared;lowerMarketKnown=p.lowerMarketKnown;marketVisits=p.marketVisits;marketRaids=p.marketRaids;
 contraband={...p.contraband};caseUnlocked=p.caseUnlocked;caseCleared=[...p.caseCleared];caseBest=[...p.caseBest];caseEndings=[...p.caseEndings];storyEndings=[...p.storyEndings];
 audio.musicOn=p.musicOn;audio.enabled=p.soundOn;Object.assign(settings,p.settings);
 ownedShips=[...p.ownedShips];achievements=[...p.achievements];pilotXp=p.pilotXp;dailyStreak=p.dailyStreak;dailyLast=p.dailyLast;challengeDone=p.challengeDone;minisDefeated=[...p.minisDefeated];stats={...p.stats};lastCreditsSeen=p.credits;
 hullLevel=p.hullLevel;abyssBestWave=p.abyssBestWave;paradeBest=p.paradeBest;paradeCleared=p.paradeCleared;totalKills=p.totalKills;profileCreated=p.profileCreated;
}
function snapshotProfile(){
 return {saveVersion:SAVE_VERSION,credits:Math.floor(credits),weaponLevel,weapon,ship,shipUnlocked,drones,missiles,bestScore,officeBest,officeCleared,lowerMarketKnown,marketVisits,marketRaids,contraband,caseUnlocked,caseCleared,caseBest,caseEndings,storyEndings,musicOn:audio.musicOn,soundOn:audio.enabled,settings,
  hullLevel,abyssBestWave,paradeBest,paradeCleared,totalKills,profileCreated,ownedShips,achievements,pilotXp,dailyStreak,dailyLast,challengeDone,minisDefeated,stats,savedAt:Date.now(),game:'VOID FRONTIER '+VF_VERSION};
}
function loadSave(){
 let raw=null;
 try{const txt=localStorage.getItem(SAVE_KEY);if(txt){raw=JSON.parse(txt);const v=Number(raw.saveVersion)||1;if(v<2&&!localStorage.getItem(SAVE_BACKUP))localStorage.setItem(SAVE_BACKUP,txt);if(v===2&&!localStorage.getItem('vf02_backup_v2'))localStorage.setItem('vf02_backup_v2',txt)}}catch(e){raw=null}
 applyProfile(migrateSave(raw));
 if(raw)persist();
}
function persist(){if(credits>lastCreditsSeen)stats.earned+=credits-lastCreditsSeen;lastCreditsSeen=credits;try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshotProfile()))}catch(e){}}
// Экспорт/импорт локального профиля — без облака: строка-код или файл .json.
function exportProfileCode(){const json=JSON.stringify(snapshotProfile());return 'VF2:'+btoa(unescape(encodeURIComponent(json)))}
function parseProfileCode(text){
 const t=String(text||'').trim();if(!t)throw new Error('Пустой код');
 let json=t;if(/^VF2:/i.test(t))json=decodeURIComponent(escape(atob(t.slice(4).replace(/\s+/g,''))));
 const obj=JSON.parse(json);if(!obj||typeof obj!=='object'||!('credits' in obj||'weaponLevel' in obj||'caseUnlocked' in obj))throw new Error('Это не профиль VOID FRONTIER');
 return migrateSave(obj);
}
function importProfile(text){
 const p=parseProfileCode(text);
 try{const cur=localStorage.getItem(SAVE_KEY);if(cur)localStorage.setItem('vf02_before_import',cur)}catch(e){}
 applyProfile(p);persist();applyVolumes();applyQuality();return p;
}
