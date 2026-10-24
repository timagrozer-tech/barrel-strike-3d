'use strict';
/* Прогрессия вне боя: магазин кораблей по классам, звания пилота, достижения, ежедневные награды, испытание дня. */
const SHIP_CLASSES={C:{name:'КЛАСС C',color:'#9fb9cc'},B:{name:'КЛАСС B',color:'#56f0ff'},A:{name:'КЛАСС A',color:'#7dff9a'},S:{name:'КЛАСС S',color:'#c69bff'},L:{name:'ЛЕГЕНДА',color:'#ffd27a'}};
const SHIPS={
 astra:{name:'ASTRA-01',cls:'C',type:'Перехватчик',hp:100,speed:440,dmg:1,price:0,engine:'#6ff0ff',scale:1,sprite:null,special:'Сбалансированный перехватчик. Внешний вид растёт с эволюцией корпуса.',tag:'БАЗОВЫЙ'},
 titan:{name:'TITAN-02',cls:'B',type:'Штурмовик',hp:160,speed:350,dmg:1,price:0,engine:'#ff9a4a',scale:1.08,sprite:null,special:'Толстая броня, ниже скорость.',tag:'ТЯЖЁЛЫЙ'},
 specter:{name:'SPECTER-03',cls:'B',type:'Дроновод',hp:115,speed:405,dmg:1,price:1200,engine:'#c69bff',scale:.97,sprite:null,drones:1,special:'+1 боевой дрон.',tag:'ДРОНЫ'},
 valkyrie:{name:'VALKYRIE-X',cls:'A',type:'Снайперский перехватчик',hp:95,speed:470,dmg:1.15,price:3500,engine:'#7fe8ff',scale:1,sprite:'ship_valkyrie',pierce:1,special:'+15% урона. Лучи пробивают одну цель насквозь.',tag:'ПРОБИТИЕ'},
 bastion:{name:'BASTION',cls:'A',type:'Летающая крепость',hp:220,speed:320,dmg:1.05,price:4000,engine:'#ffcf4a',scale:1.1,sprite:'ship_bastion',shield:6,special:'Энергощит гасит одно попадание каждые 6 секунд.',tag:'ЩИТ'},
 hive:{name:'HIVE',cls:'S',type:'Носитель роя',hp:135,speed:385,dmg:1,price:7000,engine:'#5dff9a',scale:1.06,sprite:'ship_hive',drones:2,special:'+2 боевых дрона в сопровождении.',tag:'РОЙ'},
 nova:{name:'NOVA',cls:'S',type:'Бомбардировщик',hp:125,speed:415,dmg:1.05,price:7500,engine:'#c46bff',scale:1.08,sprite:'ship_nova',missiles:2,bombs:1,special:'+2 ракеты в залпе и +1 бомба на вылет.',tag:'РАКЕТЫ'},
 archon:{name:'ARCHON',cls:'L',type:'Легендарный флагман',hp:175,speed:450,dmg:1.25,price:15000,rank:7,engine:'#ffd27a',scale:1.08,sprite:'ship_archon',drones:1,revive:true,special:'+25% урона, +1 дрон, второй шанс: один раз за вылет восстаётся с 50% корпуса.',tag:'ЛЕГЕНДА'}
};
for(const id of ['ship_valkyrie','ship_bastion','ship_hive','ship_nova','ship_archon'])IMG[id]=loadImage('assets/sprites/'+id+'.png');
const shipImageSrc=id=>SHIPS[id].sprite?'assets/sprites/'+SHIPS[id].sprite+'.png':'assets/sprites/player_lvl'+Math.max(id==='astra'?1:2,currentPlayerTierSafe())+'.png';
function currentPlayerTierSafe(){return Math.max(1,Math.min(5,hullLevel||1))}

/* ---------- Звания ---------- */
const RANKS=[['Рядовой',0],['Ефрейтор',400],['Младший сержант',1200],['Сержант',2500],['Старшина',4500],['Прапорщик',7500],['Лейтенант',11500],['Капитан',17000],['Майор',24000],['Подполковник',33000],['Полковник',45000],['Генерал',60000],['Маршал розыска',80000]];
function rankIndex(xp=pilotXp){let i=0;while(i+1<RANKS.length&&xp>=RANKS[i+1][1])i++;return i}
function rankProgress(){const i=rankIndex();if(i>=RANKS.length-1)return {i,k:1,cur:pilotXp,next:pilotXp};const a=RANKS[i][1],b=RANKS[i+1][1];return {i,k:(pilotXp-a)/(b-a),cur:pilotXp-a,next:b-a}}
function addXp(n){
 n=Math.max(0,Math.floor(n));if(!n)return [];const before=rankIndex();pilotXp+=n;const after=rankIndex();const ups=[];
 for(let r=before+1;r<=after;r++){const reward=250*r;credits+=reward;ups.push(RANKS[r][0]);notify('🎖 НОВОЕ ЗВАНИЕ: '+RANKS[r][0].toUpperCase(),'+'+reward+' ₡');}
 persist();return ups;
}

/* ---------- Достижения ---------- */
const ACH=[
 {id:'first',ic:'🎯',name:'Первая кровь',desc:'Сбей первого врага',reward:50,p:()=>[stats.kills,1]},
 {id:'ace',ic:'✈',name:'Ас эскадрильи',desc:'Сбей 100 врагов',reward:300,p:()=>[stats.kills,100]},
 {id:'legend',ic:'🌟',name:'Гроза сектора',desc:'Сбей 1000 врагов',reward:1500,p:()=>[stats.kills,1000]},
 {id:'elite',ic:'💜',name:'Охотник на элиту',desc:'Уничтожь 25 элитных врагов',reward:500,p:()=>[stats.elites,25]},
 {id:'duck',ic:'🦆',name:'Утиный вопрос закрыт',desc:'Победи Ебло Утиное',reward:200,p:()=>[minisDefeated.includes('duck')?1:0,1]},
 {id:'anomalies',ic:'🤡',name:'Знаток аномалий',desc:'Победи всех 8 мини-боссов',reward:1000,p:()=>[minisDefeated.length,8]},
 {id:'architect',ic:'👁',name:'Конец Бездны',desc:'Победи Архитектора Бездны',reward:800,p:()=>[stats.bosses,1]},
 {id:'case',ic:'📁',name:'Дело закрыто',desc:'Заверши первые 4 операции',reward:1000,p:()=>[caseCleared.slice(0,4).filter(Boolean).length,4]},
 {id:'phantom',ic:'😏',name:'Хлеб не помог',desc:'Поймай Капитана Ухмылку',reward:2000,p:()=>[stats.phantoms+(caseCleared[4]?1:0)>0?1:0,1]},
 {id:'truths',ic:'⚖',name:'Три правды',desc:'Открой все 3 концовки',reward:1500,p:()=>[caseEndings.length,3]},
 {id:'quiet',ic:'🤫',name:'Тихий возврат',desc:'Открой секретную концовку',reward:700,p:()=>[caseEndings.includes('escape')?1:0,1]},
 {id:'graze100',ic:'💨',name:'На волоске',desc:'100 опасных сближений за один вылет',reward:400,p:()=>[stats.bestRunGraze,100]},
 {id:'graze2k',ic:'🌪',name:'Мастер уклонения',desc:'2000 опасных сближений всего',reward:800,p:()=>[stats.graze,2000]},
 {id:'combo',ic:'🔥',name:'Огненная серия',desc:'Комбо из 40 сбитых подряд',reward:500,p:()=>[stats.bestCombo,40]},
 {id:'abyss10',ic:'🌀',name:'Взгляд в Бездну',desc:'Дойди до 10-й волны Бездны',reward:600,p:()=>[abyssBestWave,10]},
 {id:'abyss20',ic:'🕳',name:'Бездна смотрит в ответ',desc:'Дойди до 20-й волны Бездны',reward:1500,p:()=>[abyssBestWave,20]},
 {id:'parade',ic:'🎪',name:'Парад окончен',desc:'Пройди Парад Дебилов целиком',reward:1200,p:()=>[paradeCleared?1:0,1]},
 {id:'smuggler',ic:'🕶',name:'Контрабандист',desc:'Купи модуль на Нижнем рынке',reward:150,p:()=>[Object.values(contraband).filter(Boolean).length,1]},
 {id:'blackmarket',ic:'💼',name:'Чёрный рынок',desc:'Собери все 6 контрабандных модулей',reward:1000,p:()=>[Object.values(contraband).filter(Boolean).length,6]},
 {id:'clerk',ic:'🗄',name:'Архивариус',desc:'Пройди архив штаба',reward:300,p:()=>[officeCleared?1:0,1]},
 {id:'hull5',ic:'🛠',name:'Эволюция',desc:'Улучши корпус до 5 уровня',reward:800,p:()=>[hullLevel,5]},
 {id:'weapon10',ic:'🔫',name:'Оружейник',desc:'Улучши оружие до 10 уровня',reward:800,p:()=>[weaponLevel,10]},
 {id:'fleet4',ic:'🚀',name:'Коллекционер',desc:'Владей 4 кораблями',reward:1000,p:()=>[ownedShips.length,4]},
 {id:'fleet8',ic:'🛸',name:'Личный флот',desc:'Владей всеми 8 кораблями',reward:3000,p:()=>[ownedShips.length,8]},
 {id:'flawless',ic:'🛡',name:'Без царапины',desc:'Победи мини-босса, не получив урона',reward:600,p:()=>[stats.flawlessMini,1]},
 {id:'bomber',ic:'💥',name:'Бомбардир',desc:'Используй 50 бомб',reward:300,p:()=>[stats.bombs,50]},
 {id:'rich',ic:'💰',name:'Миллионер розыска',desc:'Заработай 50 000 ₡ за всё время',reward:2000,p:()=>[stats.earned,50000]},
 {id:'challenge',ic:'🏅',name:'Испытатель',desc:'Пройди 3 испытания дня',reward:900,p:()=>[stats.challenges,3]},
 {id:'collector',ic:'🎁',name:'Сборщик трофеев',desc:'Подбери 100 бонусов',reward:400,p:()=>[stats.pickups,100]}
];
let runAchievements=[];
function checkAchievements(){
 let any=false;
 for(const a of ACH){if(achievements.includes(a.id))continue;const [cur,max]=a.p();if(cur>=max){achievements.push(a.id);credits+=a.reward;runAchievements.push(a.id);any=true;notify(a.ic+' ДОСТИЖЕНИЕ: '+a.name.toUpperCase(),'+'+a.reward+' ₡ · +'+Math.round(a.reward/2)+' опыта');pilotXp+=Math.round(a.reward/2);}}
 if(any){addXp(0);persist()}return any;
}

/* ---------- Уведомления (работают в бою и в меню) ---------- */
const notifyQueue=[];let notifyBusy=false;
function notify(title,sub=''){notifyQueue.push([title,sub]);if(!notifyBusy)nextNotify()}
function nextNotify(){
 const el=document.getElementById('achToast');if(!el)return;const n=notifyQueue.shift();if(!n){notifyBusy=false;return}
 notifyBusy=true;el.innerHTML=`<b>${esc(n[0])}</b><span>${esc(n[1])}</span>`;el.classList.add('show');sfx('powerup');
 setTimeout(()=>{el.classList.remove('show');setTimeout(nextNotify,350)},2600);
}

/* ---------- Ежедневные награды ---------- */
const DAILY_REWARDS=[150,250,350,500,700,900,1500];
const dayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function dailyAvailable(){return dailyLast!==dayKey()}
function nextDailyStreak(){const y=new Date();y.setDate(y.getDate()-1);return dailyLast===dayKey(y)?(dailyStreak%7)+1:1}
function claimDaily(){if(!dailyAvailable())return 0;dailyStreak=nextDailyStreak();dailyLast=dayKey();const r=DAILY_REWARDS[dailyStreak-1];credits+=r;addXp(40);persist();notify('🎁 НАГРАДА ДНЯ '+dailyStreak+'/7','+'+r+' ₡');return r}

/* ---------- Испытание дня (Бездна с модификатором) ---------- */
const CHALLENGES=[
 {id:'glass',name:'Стеклянная пушка',desc:'Урон ×2, но корпус вдвое меньше',mods:{playerDmg:2,hpMul:.5}},
 {id:'swarm',name:'Рой',desc:'Враги появляются в 1,7 раза чаще',mods:{spawnRate:1.7}},
 {id:'bullets',name:'Свинцовый дождь',desc:'Вражеские снаряды на 35% быстрее',mods:{bulletSpeed:1.35}},
 {id:'elite',name:'Парад элиты',desc:'30% врагов — элита (больше бонусов)',mods:{elite:.3}},
 {id:'nobomb',name:'Без бомб',desc:'Бомбы отключены, урон +20%',mods:{noBombs:true,playerDmg:1.2}},
 {id:'armor',name:'Броненосцы',desc:'Враги прочнее в 1,5 раза',mods:{enemyHp:1.5}}
];
const MODS_DEFAULT=()=>({playerDmg:1,hpMul:1,spawnRate:1,bulletSpeed:1,elite:0,noBombs:false,enemyHp:1});
let mods=MODS_DEFAULT(),challengeActive=null;
const CHALLENGE_GOAL=6,CHALLENGE_REWARD=800;
function todayChallenge(){const k=dayKey();let h=0;for(const ch of k)h=(h*31+ch.charCodeAt(0))>>>0;return CHALLENGES[h%CHALLENGES.length]}
function challengeDoneToday(){return challengeDone===dayKey()}
function startChallenge(){const ch=todayChallenge();challengeActive=ch;mode='endless';initAudio();reset();announce('ИСПЫТАНИЕ: '+ch.name.toUpperCase(),3,ch.desc+' · ЦЕЛЬ: ВОЛНА '+CHALLENGE_GOAL)}
function challengeWave(w){
 if(!challengeActive||w<CHALLENGE_GOAL||challengeDoneToday())return;
 challengeDone=dayKey();stats.challenges++;credits+=CHALLENGE_REWARD;runCredits+=CHALLENGE_REWARD;addXp(300);persist();notify('🏅 ИСПЫТАНИЕ ДНЯ ПРОЙДЕНО','+'+CHALLENGE_REWARD+' ₡ · +300 опыта');checkAchievements();
}
