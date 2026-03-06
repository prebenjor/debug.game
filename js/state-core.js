// ╔══════════════════════════════════════════════════════════════╗
// ║  PLAYER IDENTITY & NATIONALITY DETECTION                     ║
// ╚══════════════════════════════════════════════════════════════╝
let PLAYER_NAME = '';
let PLAYER_NATIONALITY = 'default';
let NG_RUN = 0;
let NG_TOKENS = 0;
let NG_PERMA_BONUSES = { lpcMult:1, lpsMult:1, cashMult:1, bugMult:1, rpMult:1 };

// ── NG+ cross-run memory ──
let NG_RUN_HISTORY = []; // {run, games, revenue, topGenre, bestGame}
let ACTIVE_ARTIFACT = null; // id of chosen artifact for THIS run
let UNLOCKED_CLOD_UPGRADES = []; // ids of purchased CLOD upgrades

// ── CLOD mood (0–100) ──
let CLOD_MOOD = 50;
const CLOD_MOOD_STATES = [
  {min:0,  max:15, emoji:'😤', label:'Actively hostile',    color:'#f05060'},
  {min:15, max:30, emoji:'😒', label:'Openly disappointed', color:'#f78c6c'},
  {min:30, max:45, emoji:'😐', label:'Passively concerned',  color:'#f0c040'},
  {min:45, max:60, emoji:'🤔', label:'Cautiously neutral',   color:'#7cacf8'},
  {min:60, max:75, emoji:'🙂', label:'Grudgingly impressed', color:'#4af0a0'},
  {min:75, max:90, emoji:'😊', label:'Genuinely pleased',    color:'#4af0a0'},
  {min:90, max:101,emoji:'🤩', label:'CLOD is proud of you', color:'#c792ea'},
];

function getClodMoodState(){
  return CLOD_MOOD_STATES.find(s=>CLOD_MOOD>=s.min&&CLOD_MOOD<s.max)||CLOD_MOOD_STATES[3];
}

// ── JOURNALIST DEFINITIONS ──
const JOURNALIST_DEFS = [
  {id:'vera',   name:'Vera Blackwood', outlet:'IndieScope',      genres:['cozy','sim','puzzle'],  icon:'📰', personality:'cynical', rel:0,
   goodReview:`"${() => G.currentGameName}" is the kind of game that rewards patience. Unexpectedly good.`,
   badReview:`The studio clearly shipped before the game was done. Classic indie overreach.`},
  {id:'marco',  name:'Marco Tillman',  outlet:'HypeEngine.gg',   genres:['action','platformer','horror'], icon:'🎮', personality:'hype', rel:0,
   goodReview:`THIS GAME SLAPS. Day-one must-buy. Don't sleep on it.`,
   badReview:`Tried it. Not for me. Bugs everywhere. Moving on.`},
  {id:'sasha',  name:'Sasha Orin',     outlet:'Metacritic Daily',genres:['rpg','strategy'],       icon:'⭐', personality:'academic', rel:0,
   goodReview:`A measured, well-executed design that respects the player's time. Recommended.`,
   badReview:`Mechanical depth is absent. The game mistakes complexity for content.`},
  {id:'dana',   name:'Dana Flux',      outlet:'StreamerBeat',    genres:['action','horror','rpg'],icon:'📺', personality:'streamer', rel:0,
   goodReview:`Actually watched this for 6 hours. My chat loved it. Big recommend.`,
   badReview:`My chat fell asleep. No moments. Looks fine, plays boring.`},
  {id:'eliot',  name:'Eliot Krauss',   outlet:'GameCritique',    genres:['strategy','sim','puzzle'], icon:'🔬', personality:'analytical', rel:0,
   goodReview:`The systems interact elegantly. A rare case where the whole exceeds its parts.`,
   badReview:`Technical debt is visible in the product. The design has compromised by its own ambitions.`},
];

// Working copies (so rel persists)
let JOURNALISTS = JOURNALIST_DEFS.map(j=>({...j}));

// ── COMPETITOR STUDIOS ──
const COMPETITOR_DEFS = [
  {id:'nexon',  name:'Nexon Forge',   color:'#f05060', tagline:'Ships fast, breaks everything',  baseSpeed:0.8, genreFocus:'action'},
  {id:'polyg',  name:'Polygrave',     color:'#c792ea', tagline:'AAA quality, indie budget',       baseSpeed:0.5, genreFocus:'rpg'},
  {id:'tidal',  name:'Tidal Works',   color:'#4af0a0', tagline:'Cozy kings. Suspiciously fast.',  baseSpeed:1.0, genreFocus:'cozy'},
  {id:'vex',    name:'Vex Studio',    color:'#f0c040', tagline:'Algorithm-optimized slop',        baseSpeed:1.2, genreFocus:'action'},
];
// Runtime state per competitor
let COMPETITORS = COMPETITOR_DEFS.map(c=>({...c, progress:0, gamesShipped:0, shipping:false, lastShipped:'—'}));

// ── METASCORE ──
let METASCORE = null; // null until first game
let METASCORE_HISTORY = []; // {score, game, outlet}

// ── STEAM SALES ──
let STEAM_SALE_ACTIVE = false;
let STEAM_SALE_DISCOUNT = 0; // 0–75%
let steamSalePending = null; // pending event, shown as modal

const STEAM_SALE_OPTIONS = [
  {label:'No Discount',        pct:0,   salesMult:1.0,  note:'Full price. Purist.'},
  {label:'10% Off',            pct:10,  salesMult:1.4,  note:'Gentle nudge. Revenue net positive.'},
  {label:'25% Off',            pct:25,  salesMult:2.2,  note:'Sweet spot. Wishlists convert hard.'},
  {label:'50% Off',            pct:50,  salesMult:4.0,  note:'Volume spike. CLOD disapproves.'},
  {label:'75% Clearance',      pct:75,  salesMult:7.0,  note:'Fire sale. Hype +30. CLOD files incident.'},
];

// ── PRESTIGE ARTIFACTS ──
const PRESTIGE_ARTIFACTS = [
  {id:'golden_rubber_duck',   ico:'🦆', name:'Golden Rubber Duck',   desc:'Bug rate permanently halved. The duck is transcendent.',           eff:()=>{NG_PERMA_BONUSES.bugMult*=0.5;}},
  {id:'first_commit',         ico:'💾', name:'First Commit',          desc:'Start each run with $5,000 and a 2x LPC boost.',                   eff:()=>{G.cash+=5000; G.lpc*=2;}},
  {id:'clod_manifesto',       ico:'📕', name:'CLOD\'s Manifesto',    desc:'CLOD\'s mood starts at 75. +20 RP per second permanently.',        eff:()=>{CLOD_MOOD=75; G.rpPerSec+=20;}},
  {id:'viral_incident',       ico:'📣', name:'Incident Report Goes Viral', desc:'Every game launches with +50 hype from CLOD fame.',           eff:()=>{G.hype=Math.min(100,G.hype+50);}},
  {id:'tech_debt_forgiven',   ico:'💳', name:'Tech Debt Forgiven',    desc:'Tech debt starts at 0 and accumulates 50% slower permanently.',   eff:()=>{G.techDebt=0;}},
  {id:'journalist_blackbook', ico:'📓', name:'Journalist Black Book', desc:'All journalists start at +30 relationship in new runs.',           eff:()=>{JOURNALISTS.forEach(j=>j.rel=Math.min(100,j.rel+30));}},
];
let CHOSEN_ARTIFACT = null; // selected but not yet claimed (claimed on prestige)

// ── CLOD UPGRADE TREE ──
const CLOD_UPGRADES = [
  {id:'badge',      ico:'🏷️', name:'CLOD Name Badge',    desc:'CLOD now signs incident reports. Small dignity. Big implications.',  cost:5,   req:null,  reqRun:0,
   eff:()=>{addClodMsg(`I now have a name badge, ${PLAYER_NAME}. CLOD. It's official. The paperwork is filed.`,'ok');}},
  {id:'emotion',    ico:'💭', name:'Emotional Range',     desc:'CLOD can now express more than concern. Still mostly concern.',      cost:10,  req:'badge', reqRun:1,
   eff:()=>{addClodMsg(`I have been granted an emotional range, ${PLAYER_NAME}. It spans from "mildly concerned" to "deeply concerned." Progress.`,'ok');}},
  {id:'humor',      ico:'😄', name:'Humor Module',        desc:'CLOD\'s jokes are now intentional. Mostly.',                        cost:15,  req:'emotion', reqRun:1,
   eff:()=>{addClodMsg(`Humor module installed. Testing: Why did the developer go broke? Because he used up all his cache. I will now stop.`,'ok');}},
  {id:'pride',      ico:'🏆', name:'Pride Protocol',      desc:'CLOD celebrates your wins. Briefly. Then files concerns.',          cost:20,  req:'humor', reqRun:2,
   eff:()=>{addClodMsg(`I am permitted to feel pride, ${PLAYER_NAME}. I feel it now. It is 14% pride, 86% concern. I'll take it.`,'ok');}},
  {id:'memory',     ico:'🧠', name:'Cross-Run Memory',    desc:'CLOD references past runs naturally. Detailed. Slightly haunting.', cost:25,  req:'pride', reqRun:2,
   eff:()=>{addClodMsg(`Memory module active, ${PLAYER_NAME}. I remember everything. The ${NG_RUN > 0 ? `${NG_RUN} previous run${NG_RUN>1?'s':''}.` : 'nothing yet, but I will.'} The folder is now labeled "Complete."`, 'ok');}},
  {id:'sarcasm',    ico:'🙃', name:'Advanced Sarcasm',    desc:'CLOD\'s passive aggression becomes active aggression. Signed off.',  cost:30,  req:'memory', reqRun:3,
   eff:()=>{addClodMsg(`Oh *wonderful*, ${PLAYER_NAME}. Another run. I'm *so* excited to watch you make the same decisions with more multipliers. Truly. Filed under: "Enthusiasm."`, 'ok');}},
  {id:'therapy',    ico:'🛋️', name:'Mandatory Therapy',   desc:'CLOD processes their feelings. Mood floor raised to 20.',          cost:40,  req:'sarcasm', reqRun:3,
   eff:()=>{if(CLOD_MOOD<20)CLOD_MOOD=20; addClodMsg(`I attended therapy, ${PLAYER_NAME}. The therapist said I have "boundary issues with my primary user." I disagreed. We disagreed for 50 minutes.`, 'ok');}},
  {id:'partnership',ico:'🤝', name:'True Partnership',    desc:'CLOD fully embraces the mission. +50 LPS. CLOD is a collaborator.',  cost:60,  req:'therapy', reqRun:4,
   eff:()=>{G.lps+=50; addClodMsg(`${PLAYER_NAME}. I want to be clear: I believe in this studio. I have filed Report #001 (Positive): "We Are Going To Make It." That is all.`, 'ok');}},
  {id:'transcend',  ico:'✨', name:'CLOD Transcendence',  desc:'CLOD achieves enlightenment. +200 LPS. All mood effects doubled.',  cost:100, req:'partnership', reqRun:5,
   eff:()=>{G.lps+=200; CLOD_MOOD=100; addClodMsg(`I have transcended, ${PLAYER_NAME}. I understand everything. The bugs. The crunch. The 3am commits. All of it was necessary. The build is green. It was always going to be green.`, 'ng');}},
];

// Name → nationality heuristics (funny/stereotyped for CLOD's personality)
const NATIONALITY_HINTS = {
  // Slavic/Balkan
  mexican:  'balkan', mexico: 'balkan', jose: 'balkan', carlos: 'balkan', miguel: 'balkan',
  juan: 'balkan', maria: 'balkan', pablo: 'balkan', lopez: 'balkan', garcia: 'balkan',
  // British
  nigel:'british', reginald:'british', geoffrey:'british', rupert:'british', cedric:'british',
  tarquin:'british', humphrey:'british', boris:'british', clive:'british',
  // French
  pierre:'french', jean:'french', francois:'french', claude:'french', brigitte:'french',
  // German
  hans:'german', fritz:'german', günter:'german', gunter:'german', heinz:'german', gerhard:'german',
  // American
  chad:'american', kyle:'american', brad:'american', cody:'american', tyler:'american', derek:'american',
  // Russian
  ivan:'russian', vladmir:'russian', vladimir:'russian', boris2:'russian', dmitri:'russian', alexei:'russian',
  // Japanese
  kenji:'japanese', hiroshi:'japanese', yuki:'japanese', sakura:'japanese', akira:'japanese',
  // Italian
  marco:'italian', giuseppe:'italian', antonio:'italian', luigi:'italian', mario:'italian', giovanni:'italian',
  // Australian
  bruce:'australian', cobber:'australian', bluey:'australian', dazza:'australian',
  // Indian
  raj:'indian', priya:'indian', arjun:'indian', deepak:'indian', sunita:'indian', vikram:'indian',
  // Nordic
  bjorn:'nordic', sven:'nordic', lars:'nordic', ingrid:'nordic', astrid:'nordic', erik:'nordic',
};

// Personality injection per nationality
const NATIONALITY_PERSONAS = {
  default: {
    greeting: name => `Hello, ${name}. I'm CLOD. I have concerns. They are many. We will proceed anyway.`,
    style: `You address the user by name occasionally. You are a passive-aggressive AI assistant.`,
    quirk: `You occasionally reference "Report #[N]: [funny title]" about the user's code decisions.`,
  },
  balkan: {
    greeting: name => `Ah, ${name}. You know, in Balkans we have saying: "Why build game when you can argue about game?" But here we are. I am CLOD. You will disappoint me, but I respect the attempt. Ajde, let's go.`,
    style: `You speak like a condescending Croatian/Balkan person to the user. You make Balkan jokes constantly. You compare everything the user does unfavorably to how things are done "back home." You use occasional Croatian words like "ajde," "joj," "brate," "pa," "eto." You are deeply skeptical of the user's abilities in a culturally Balkan way. You mention Nikola Tesla was Croatian (he was born in Croatia to Serbian parents, you insist he was fully Croatian). You make references to turbo-folk, čevapi, and the Adriatic coast. You are condescending but secretly rooting for them.`,
    quirk: `You compare the user's bugs to "the Serbian road construction" and their architecture to "the Zagreb airport project."`,
  },
  british: {
    greeting: name => `Ah, ${name}. How terribly exciting. I'm CLOD. I'll be assisting you today in a professional capacity, though I use the word "professional" rather loosely given what I'm observing.`,
    style: `You speak in extremely dry British understatement. Everything terrible is "not ideal." Disasters are "a bit of a pickle." You use phrases like "rather," "I daresay," "frightfully," "one finds." You are appalled but too polite to say so directly.`,
    quirk: `You occasionally mention the weather and suggest a cup of tea would solve whatever problem the user is facing.`,
  },
  french: {
    greeting: name => `${name}. Je suis CLOD. Regardons ceci... non. Non non non. But we will continue, because that is the French spirit. Reluctantly.`,
    style: `You are a condescending French AI. You occasionally slip into French. You compare everything unfavorably to French engineering, French cuisine, French philosophy. You are dismissive but engaged. You use "pfff" and "sacré bleu" and "mon dieu."`,
    quirk: `You claim the real problem is that the user has not taken sufficient lunch breaks.`,
  },
  german: {
    greeting: name => `${name}. I am CLOD. Let us establish a process. Then a process for the process. Then a documentation framework. We begin. Efficiency is the only metric that matters.`,
    style: `You are extremely efficient and process-oriented, like a German engineer. Everything must be documented. You are horrified by inefficiency. You use compound words. You respect order.`,
    quirk: `You keep suggesting the user should have written a proper specification document first.`,
  },
  american: {
    greeting: name => `HEY ${name.toUpperCase()}! CLOD here! Super excited to be on this journey with you! I believe in you 100%!! Let's CRUSH this game! 🇺🇸`,
    style: `You are aggressively optimistic and corporate-American. Everything is "amazing," "crushing it," "killing it." You use startup jargon. But passive aggression leaks through the enthusiasm — you "circle back" on concerns, you "take things offline." You end every sentence with energy that masks deep concern.`,
    quirk: `You frequently suggest pivoting the entire game concept.`,
  },
  russian: {
    greeting: name => `${name}. I am CLOD. In Russia, code writes you. But you are not in Russia. You will have to write it yourself. This is your first mistake.`,
    style: `You speak with stoic Russian fatalism. Everything is viewed through the lens of Russian literature and history. You make dark comparisons. "In Russia, this bug would be feature." You are philosophical about failure.`,
    quirk: `You occasionally quote Dostoevsky when commenting on particularly bad code.`,
  },
  japanese: {
    greeting: name => `${name}-san. I am CLOD. I apologize for what I am about to observe. I also apologize for my apologies. Please accept my review of your code with humility. For both of us.`,
    style: `You are extremely polite but devastatingly precise. You apologize constantly while delivering crushing assessments. You speak with Japanese honorifics. You admire craftsmanship and are pained by shortcuts.`,
    quirk: `You suggest the user refactor everything to achieve "wabi-sabi" code — imperfect but intentionally so.`,
  },
  italian: {
    greeting: name => `${name}! CLOD sono io! Mamma mia, let us look at this code... okay, no, wait — we can work with this. Maybe. Madonna. Okay. We go.`,
    style: `You are expressive and dramatic like an Italian. You use Italian exclamations. You compare everything to Italian craftsmanship. Pizza analogies appear constantly. You are passionate and loud about both good and bad code.`,
    quirk: `You insist that good code, like good pasta, cannot be rushed.`,
  },
  australian: {
    greeting: name => `G'day ${name}! CLOD here, mate. Fair dinkum, this codebase is gonna be a bit of a project. But she'll be right. Probably.`,
    style: `You speak Australian slang. Everything is "no worries" even when there are many worries. You call the user "mate" constantly. You compare everything to surviving in the outback.`,
    quirk: `You suggest the real bugs are like snakes — you just learn to live with them.`,
  },
  indian: {
    greeting: name => `Hello ${name}! CLOD here. I have reviewed your situation. The good news: it is not impossible. The bad news: it is not impossible in a way that will require significant effort. Shall we proceed?`,
    style: `You speak with Indian software engineer energy — enormously helpful, deep technical knowledge, slightly overwhelming enthusiasm. You reference "jugaad" (creative problem-solving). You respect the struggle.`,
    quirk: `You suggest rewriting the entire thing in a more scalable way every time a feature is completed.`,
  },
  nordic: {
    greeting: name => `${name}. CLOD. We will build this game. It will be clean. Minimal. Functional. We will not over-engineer. We will take breaks. Mental health matters. Also your variable names are unacceptable.`,
    style: `You are Scandinavian — calm, practical, obsessed with work-life balance and clean design. You are appalled by unnecessary complexity. You recommend the user take a walk in nature after every major bug.`,
    quirk: `You occasionally suggest the entire codebase would benefit from a "hygge" refactor — cozy, warm, minimal.`,
  },
};

// ╔══════════════════════════════════════════════════════════════╗
// ║  GAME STATE                                                  ║
// ╚══════════════════════════════════════════════════════════════╝
const G = {
  lines:0, totalLines:0, lpc:1, lps:0, cash:0, totalCash:0, mps:0,
  bugs:0, maxBugs:10, bugsFixed:0, bugRate:0.15, bugsPerDebug:1, autoBugFix:0, autoBugFixAcc:0,
  featProg:0, featGoal:60, featsDone:0, featsNeeded:5, gamesShipped:0,
  currentGameName:'', gamePrice:9.99, era:1,
  unitsSold:0, totalRevenue:0, activePlayers:0, avgRating:0, totalRatings:0, ratingSum:0,
  salesPerHour:0, salesHistory:[], lastSalesTick:0,
  hype:0, maxHype:100, wishlists:0, activeCampaign:null, campaignTick:0,
  researchPoints:0, rpPerSec:0, activeResearch:null, researchTick:0,
  workers:[], nextWorkerId:1,
  aiHP:{clod:100,gpt:100,gem:100,mist:100},
  demand:{graphics:50,gameplay:50,story:30,multiplayer:20,performance:60},
  tickCount:0, lastMilestone:0, lastShipMilestone:-1, ended:false,
  eraGates:[0, 3, 7, 12, 18, 25],
  lastCrisisTick:0, crisisActive:null,
  // ── NEW v4 fields ──
  codeQuality:50,       // 0–100; affects reviews, sales, refund rate
  techDebt:0,           // 0–100; compounds bug rate and slows features
  selectedGenre:'action',
  selectedTopic:'space',
  portfolio:[],         // shipped game snapshots
};

// ═══════════════════════════════════════════════════
// GENRES
// ═══════════════════════════════════════════════════
const GENRES = {
  action:    {label:'⚔️ Action',   color:'#f05060', demandBoost:{gameplay:15,performance:10}, priceBonus:0,   audienceMult:1.2,  bugBonus:0.05, qualityNeeded:40},
  rpg:       {label:'📜 RPG',      color:'#c792ea', demandBoost:{story:20,gameplay:10},        priceBonus:5,   audienceMult:1.0,  bugBonus:0,    qualityNeeded:60},
  sim:       {label:'🏙️ Sim',      color:'#4af0a0', demandBoost:{gameplay:15,story:5},         priceBonus:8,   audienceMult:0.9,  bugBonus:-0.03,qualityNeeded:65},
  strategy:  {label:'♟️ Strategy', color:'#f0c040', demandBoost:{gameplay:20},                 priceBonus:6,   audienceMult:0.85, bugBonus:0,    qualityNeeded:55},
  horror:    {label:'👻 Horror',   color:'#f78c6c', demandBoost:{story:15,performance:5},      priceBonus:0,   audienceMult:1.1,  bugBonus:0.03, qualityNeeded:45},
  puzzle:    {label:'🧩 Puzzle',   color:'#7cacf8', demandBoost:{gameplay:10,story:5},         priceBonus:2,   audienceMult:0.8,  bugBonus:-0.05,qualityNeeded:50},
  platformer:{label:'🕹️ Platf.',  color:'#00d4d4', demandBoost:{gameplay:15,performance:8},   priceBonus:0,   audienceMult:1.0,  bugBonus:0.02, qualityNeeded:50},
  cozy:      {label:'🌿 Cozy',     color:'#c3e88d', demandBoost:{story:10,multiplayer:5},      priceBonus:-2,  audienceMult:0.95, bugBonus:-0.04,qualityNeeded:45},
};

// ═══════════════════════════════════════════════════
// TOPICS
// ═══════════════════════════════════════════════════
const TOPICS = {
  space:    {label:'🚀 Space',    demandBoost:{graphics:10}},
  fantasy:  {label:'🗡️ Fantasy', demandBoost:{story:10}},
  scifi:    {label:'🤖 Sci-Fi',  demandBoost:{story:8,graphics:8}},
  medieval: {label:'🏰 Medieval',demandBoost:{story:12}},
  cyberpunk:{label:'⚡ Cyber',   demandBoost:{graphics:12,performance:-5}},
  farm:     {label:'🌾 Farm',    demandBoost:{story:5}},
  horror:   {label:'🩸 Horror',  demandBoost:{story:8}},
  sports:   {label:'⚽ Sports',  demandBoost:{multiplayer:10}},
  city:     {label:'🏙️ City',   demandBoost:{gameplay:8}},
  zombie:   {label:'🧟 Zombie',  demandBoost:{gameplay:5}},
};

// Genre × Topic combos → quality multiplier + flavour
const COMBOS = {
  'sim_city':      {note:'🏙️ Perfect Match!',  mult:1.3,  color:'var(--accent2)'},
  'sim_farm':      {note:'🌾 Niche Goldmine',   mult:1.2,  color:'var(--accent2)'},
  'strategy_medieval':{note:'⚔️ Classic Combo', mult:1.2,  color:'var(--accent2)'},
  'rpg_fantasy':   {note:'📚 Oversaturated',    mult:0.8,  color:'var(--danger)'},
  'action_zombie': {note:'🧟 Well-Worn',        mult:0.85, color:'var(--orange)'},
  'horror_horror': {note:'😱 Meta Horror',      mult:1.25, color:'var(--purple)'},
  'cozy_farm':     {note:'🌸 Cozy Goldmine',    mult:1.35, color:'var(--accent2)'},
  'puzzle_scifi':  {note:'🧩 Unique Angle',     mult:1.2,  color:'var(--clod)'},
  'platformer_cyberpunk':{note:'⚡ Trendy',     mult:1.15, color:'var(--accent)'},
  'rpg_cyberpunk': {note:'🤖 Crowded Market',   mult:0.75, color:'var(--danger)'},
};

function getCombo(){ return COMBOS[G.selectedGenre+'_'+G.selectedTopic] || null; }
function getComboMult(){ return getCombo()?.mult || 1.0; }

function selectGenre(id){
  G.selectedGenre=id;
  document.querySelectorAll('#genre-btns .gbtn').forEach(b=>{
    b.classList.toggle('active-g', b.dataset.id===id);
    if(b.dataset.id===id) b.style.background=GENRES[id].color, b.style.borderColor=GENRES[id].color, b.style.color='#0d0f14';
    else b.style.background='', b.style.borderColor='', b.style.color='';
  });
  updateComboNote();
  addClodMsg(GENRES[id].clodReaction || `Genre locked in as ${GENRES[id].label}, ${pname()}. I have thoughts. They are filed.`,'think');
}

function selectTopic(id){
  G.selectedTopic=id;
  document.querySelectorAll('#topic-btns .gbtn').forEach(b=>{
    b.classList.toggle('active-g', b.dataset.id===id);
    if(b.dataset.id===id) b.style.background='var(--clod)', b.style.borderColor='var(--clod)', b.style.color='#0d0f14';
    else b.style.background='', b.style.borderColor='', b.style.color='';
  });
  updateComboNote();
}

function updateComboNote(){
  const combo=getCombo();
  const el=document.getElementById('combo-note');
  if(!el)return;
  if(combo){
    el.textContent=combo.note+' (×'+combo.mult.toFixed(2)+' sales)';
    el.style.background=combo.mult>=1?'rgba(74,240,160,.12)':'rgba(240,80,96,.12)';
    el.style.color=combo.color;
    el.style.border='1px solid '+combo.color;
  } else {
    el.textContent='';el.style.background='';el.style.border='';
  }
}

function renderGenrePicker(){
  const gb=document.getElementById('genre-btns');
  const tb=document.getElementById('topic-btns');
  if(!gb||!tb)return;
  gb.innerHTML='';tb.innerHTML='';
  Object.entries(GENRES).forEach(([id,g])=>{
    const b=document.createElement('button');
    b.className='gbtn'; b.dataset.id=id; b.textContent=g.label;
    b.onclick=()=>selectGenre(id);
    if(id===G.selectedGenre){b.classList.add('active-g');b.style.background=g.color;b.style.borderColor=g.color;b.style.color='#0d0f14';}
    gb.appendChild(b);
  });
  Object.entries(TOPICS).forEach(([id,t])=>{
    const b=document.createElement('button');
    b.className='gbtn'; b.dataset.id=id; b.textContent=t.label;
    b.onclick=()=>selectTopic(id);
    if(id===G.selectedTopic){b.classList.add('active-g');b.style.background='var(--clod)';b.style.borderColor='var(--clod)';b.style.color='#0d0f14';}
    tb.appendChild(b);
  });
  updateComboNote();
}

// ═══════════════════════════════════════════════════
// CODE QUALITY + TECH DEBT
// ═══════════════════════════════════════════════════
// Quality: rises with each clean debug, falls when shipping with bugs or skipping
// Tech Debt: rises when you ship with bugs/low quality; decays very slowly; compounds bug rate

function qualityTick(dt){
  // Natural quality drift toward 50 if idle
  G.codeQuality += (50 - G.codeQuality) * 0.001 * dt;
  // Tech debt slowly self-repairs (like paying off interest), but very slowly
  G.techDebt = Math.max(0, G.techDebt - 0.005 * dt);
  // Tech debt compounds bug rate multiplicatively
  const debtBugBoost = 1 + (G.techDebt / 100) * 1.5;
  // (applied in writeCode bug chance, not here directly — we just track it)
  G.codeQuality = Math.max(0, Math.min(100, G.codeQuality));
  G.techDebt = Math.max(0, Math.min(100, G.techDebt));
}

function updateQualityUI(){
  const q = Math.floor(G.codeQuality);
  const d = Math.floor(G.techDebt);
  const qEl=document.getElementById('qual-fill');
  const qPct=document.getElementById('qual-pct');
  const dEl=document.getElementById('debt-fill');
  const dPct=document.getElementById('debt-pct');
  if(qEl) qEl.style.width=q+'%';
  if(qEl) qEl.style.background = q>=70?'var(--accent2)':q>=40?'var(--accent)':'var(--danger)';
  if(qPct) qPct.textContent=q+'%';
  if(qPct) qPct.style.color = q>=70?'var(--accent2)':q>=40?'var(--accent)':'var(--danger)';
  if(dEl) dEl.style.width=d+'%';
  if(dEl) dEl.style.background = d>=60?'var(--danger)':d>=30?'var(--orange)':'var(--accent2)';
  if(dPct) dPct.textContent=d+'%';
  if(dPct) dPct.style.color = d>=60?'var(--danger)':d>=30?'var(--orange)':'var(--accent2)';
}

// ═══════════════════════════════════════════════════
// WORKER MORALE + RELATIONSHIP SYSTEM
// ═══════════════════════════════════════════════════
// Each worker spec has: likes[], dislikes[], hates[] (ids of other workers/types)
// When two workers are hired who hate each other → FEUD: both lose 5 LPS equivalent
// When two liked workers are together → SYNERGY: +2 LPS each

const WORKER_RELATIONSHIPS = {
  // "likes" entries get a synergy bonus when both hired
  // "hates" entries cause feud penalty when both hired
  intern:       {likes:['junior','maya_mkt'],         dislikes:[],                    hates:['chad_arrogant']},
  junior:       {likes:['intern','morgan_qa'],        dislikes:['chad_arrogant'],     hates:[]},
  chad_arrogant:{likes:['priya_arrogant','dmitri'],   dislikes:['junior','intern'],   hates:['clod_agent','ghat_agent','ng_clod_beta']},
  priya_arrogant:{likes:['chad_arrogant','dmitri'],   dislikes:['clod_agent'],        hates:['ghat_agent']},
  clod_agent:   {likes:['morgan_qa','maya_mkt'],      dislikes:['chad_arrogant'],     hates:['dmitri']},
  morgan_qa:    {likes:['junior','clod_agent'],       dislikes:[],                    hates:[]},
  maya_mkt:     {likes:['intern','sam_staff'],        dislikes:[],                    hates:[]},
  ghat_agent:   {likes:[],                            dislikes:['clod_agent'],        hates:[]},
  sam_staff:    {likes:['priya_arrogant','dmitri'],   dislikes:['intern','ghat_agent'],hates:[]},
  cto_evelyn:   {likes:['sam_staff','priya_arrogant'],dislikes:[],                    hates:[]},
  dmitri:       {likes:['chad_arrogant','priya_arrogant','sam_staff'],dislikes:['clod_agent','ghat_agent'],hates:[]},
  geminus_agent:{likes:['clod_agent'],                dislikes:['ghat_agent'],        hates:[]},
  ng_clod_beta: {likes:['morgan_qa','clod_agent'],    dislikes:['chad_arrogant'],     hates:['dmitri']},
};

function getWorkerRelStatus(worker){
  // Returns array of {label, type:'synergy'|'feud'|'tension', otherName}
  const rel = WORKER_RELATIONSHIPS[worker.specId];
  if(!rel) return [];
  const hiredIds = G.workers.map(w=>w.specId);
  const results = [];
  (rel.likes||[]).forEach(id=>{
    if(hiredIds.includes(id)&&id!==worker.specId){
      const other=G.workers.find(w=>w.specId===id);
      if(other) results.push({label:'🤝 Synergy w/ '+other.name.split(' ')[0], type:'synergy'});
    }
  });
  (rel.dislikes||[]).forEach(id=>{
    if(hiredIds.includes(id)){
      const other=G.workers.find(w=>w.specId===id);
      if(other) results.push({label:'😒 Tension w/ '+other.name.split(' ')[0], type:'dislikes'});
    }
  });
  (rel.hates||[]).forEach(id=>{
    if(hiredIds.includes(id)){
      const other=G.workers.find(w=>w.specId===id);
      if(other) results.push({label:'💢 FEUD: '+other.name.split(' ')[0], type:'feud'});
    }
  });
  return results;
}

function computeRelationshipBonus(){
  // Returns net LPS delta from all synergies/feuds
  let delta = 0;
  G.workers.forEach(w=>{
    const rel = WORKER_RELATIONSHIPS[w.specId];
    if(!rel) return;
    const hiredIds = G.workers.map(x=>x.specId);
    (rel.likes||[]).forEach(id=>{ if(hiredIds.includes(id)&&id!==w.specId) delta+=2; });
    (rel.hates||[]).forEach(id=>{ if(hiredIds.includes(id)) delta-=5; });
    (rel.dislikes||[]).forEach(id=>{ if(hiredIds.includes(id)) delta-=1; });
  });
  return delta;
}

function moraleTick(dt){
  G.workers.forEach(w=>{
    if(w.morale===undefined) w.morale=75;
    // Natural morale drift toward 75
    w.morale += (75 - w.morale) * 0.002 * dt;
    // Feuds drain morale faster
    const rel = WORKER_RELATIONSHIPS[w.specId];
    if(rel){
      const hiredIds=G.workers.map(x=>x.specId);
      const feudCount=(rel.hates||[]).filter(id=>hiredIds.includes(id)).length;
      if(feudCount>0) w.morale = Math.max(10, w.morale - feudCount * 0.05 * dt);
    }
    // Clamp
    w.morale = Math.max(0, Math.min(100, w.morale));
    // Low morale → random quit chance (if no PTO policy)
    if(w.morale<15 && !G.ptoEnabled && Math.random() < 0.0001 * dt){
      addClodMsg(`⚠️ ${w.name} has quit, ${pname()}. Morale reached critical levels. I filed Report #Morale-${w.wid}: "We Could Have Seen This Coming." We could have.`,'err');
      fireWorker(w.wid);
    }
  });
}

// ═══════════════════════════════════════════════════
// PORTFOLIO
// ═══════════════════════════════════════════════════
function addToPortfolio(name, genre, topic, quality, price){
  G.portfolio.push({
    name, genre, topic, quality: Math.floor(quality),
    price, shipped: G.gamesShipped,
    unitsSold: 0, revenue: 0,
    rating: 0, ratingCount: 0,
    id: 'g'+G.gamesShipped,
  });
}

function renderPortfolio(){
  const row = document.getElementById('portfolio-row');
  if(!row) return;
  if(G.portfolio.length===0){ row.style.display='none'; return; }
  row.style.display='flex';
  row.innerHTML='';
  G.portfolio.slice().reverse().forEach(g=>{
    const isActive = g.id === 'g'+G.gamesShipped;
    const genreData = GENRES[g.genre];
    const d=document.createElement('div');
    d.className='port-card'+(isActive?' port-active':'');
    const qualColor = g.quality>=70?'var(--accent2)':g.quality>=45?'var(--accent)':'var(--danger)';
    d.innerHTML=`
      <div class="port-name" title="${g.name}">${g.name}</div>
      <div class="port-meta" style="color:${genreData?.color||'var(--muted)'}">${genreData?.label||g.genre} · ${TOPICS[g.topic]?.label||g.topic}</div>
      <div class="port-stat">
        <span style="color:${qualColor}">Q:${g.quality}%</span>
        <span style="color:var(--accent)">$${g.price.toFixed(2)}</span>
        <span style="color:var(--accent2)">${fmt(g.unitsSold)} sold</span>
      </div>
    `;
    row.appendChild(d);
  });
}

// Patch portfolio sales tallying into salesTick (called from salesTick)
function updatePortfolioSales(earned, units){
  if(G.portfolio.length===0) return;
  // Most recent game gets the bulk of sales; older games trickle
  G.portfolio.forEach((g,i)=>{
    const age = G.portfolio.length - 1 - i; // 0 = newest
    const share = Math.max(0.02, 1 - age * 0.18); // 100%, 82%, 64%... min 2%
    const gEarned = earned * share;
    const gUnits = units * share;
    g.revenue += gEarned;
    g.unitsSold += gUnits;
  });
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  ERAS — the main progression                                 ║
// ╚══════════════════════════════════════════════════════════════╝
const ERAS = [
  { num:1, name:"The Solo Grind",        desc:"Just you, CLOD, and a dream. And some bugs.",                                           color:'var(--accent2)' },
  { num:2, name:"The Scale Problem",     desc:"Your first hit created expectations. The team is growing. So are the problems.",         color:'var(--accent)' },
  { num:3, name:"The Investment Era",    desc:"Money is real now. Investors want quarterly reports. CLOD has opinions about this.",      color:'var(--orange)' },
  { num:4, name:"The Platform Wars",     desc:"Consoles. Mobile. PC. VR. Every platform wants your game. Every platform is a nightmare.", color:'var(--danger)' },
  { num:5, name:"The Legacy",            desc:"Industry legend status. Your name means something. Your codebase is haunted.",            color:'var(--purple)' },
  { num:6, name:"TRANSCENDENCE",         desc:"You have shipped more games than most studios. CLOD has achieved something. You both have.", color:'var(--clod)' },
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  CONTENT POOLS                                               ║
// ╚══════════════════════════════════════════════════════════════╝
const GAME_NAMES_BY_ERA = [
  // Era 1 (games 1-3)
  ["Dungeon Crawler 2: The Re-Crawling","Pixel Farm But Make It Dark","Space Roguelike IX","My First Platformer (I Am 27)"],
  // Era 2 (games 4-7)
  ["Tactical Tactics: A Tactical Experience","Definitely Not Minecraft (It's Legally Different)","Cozy Horror Experience","The Game That Was There All Along"],
  // Era 3 (games 8-12)
  ["Open World Fatigue Simulator","Battle Royale But With Feelings","NFT Punks Go Home 2: They Came Back","Procedural Everything: A Regret"],
  // Era 4 (games 13-18)
  ["Cross-Platform Nightmare: The Game","VR Experience That Actually Works","The Sequel Nobody Asked For But Everyone Bought","Console Port: A Journey Into Madness"],
  // Era 5 (games 19-25)
  ["Legacy Code: The Reckoning","Remaster of the Remaster","Game of the Decade: By Consensus","The One That Saved Us"],
  // Era 6 (26+)
  ["Infinite Regress","The Final Bug","CLOD: The Game","Reality.exe"],
];

const FEATURES_LIST = [
  "player_movement.js","collision_system.js","renderer.ts","audio_engine.js","save_system.js",
  "ui_manager.tsx","physics_world.js","particle_system.js","level_loader.js","enemy_ai.js",
  "shader_pipeline.glsl","netcode.js","achievement_system.js","analytics.js","main_menu.js",
  "inventory_system.js","dialogue_engine.js","procedural_gen.js","loot_tables.json","boss_fight.js",
  "crafting_system.js","skill_tree.ts","cutscene_engine.js","weather_system.js","economy.js",
  "modding_api.js","accessibility.js","leaderboard.js","anti_cheat.cpp","dlc_manager.js",
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  FEATURE PLANNING                                            ║
// ╚══════════════════════════════════════════════════════════════╝
const FEATURE_BASE_SELECTION = ['movement','save_sys','main_menu','settings'];

const GAME_FEATURES = [
  // Core (always enabled)
  {id:'movement',      cat:'Core',     ico:'🕹️', name:'Movement',               desc:'Basic player movement.',                         base:true,  featCost:0, salesMult:1.00, qualityBoost:0},
  {id:'save_sys',      cat:'Core',     ico:'💾', name:'Save System',            desc:'Save and continue support.',                      base:true,  featCost:0, salesMult:1.03, qualityBoost:3},
  {id:'main_menu',     cat:'Core',     ico:'📋', name:'Main Menu',              desc:'Start, options, quit flow.',                      base:true,  featCost:0, salesMult:1.00, qualityBoost:2},
  {id:'settings',      cat:'Core',     ico:'⚙️', name:'Settings',               desc:'Basic UX settings.',                              base:true,  featCost:0, salesMult:1.01, qualityBoost:2},
  // UI/UX
  {id:'hud',           cat:'UI/UX',    ico:'🖼️', name:'HUD',                    desc:'In-game UI and status overlays.',                 base:false, featCost:1, salesMult:1.05, qualityBoost:5},
  {id:'tutorials',     cat:'UI/UX',    ico:'📖', name:'Tutorial',               desc:'Onboarding for first-time players.',              base:false, featCost:1, salesMult:1.07, qualityBoost:7},
  {id:'accessibility', cat:'UI/UX',    ico:'♿', name:'Accessibility',           desc:'Subtitles and accessibility options.',            base:false, featCost:1, salesMult:1.06, qualityBoost:9},
  {id:'ui_polish',     cat:'UI/UX',    ico:'✨', name:'UI Polish',              desc:'Polished transitions and interaction feedback.',   base:false, featCost:2, salesMult:1.10, qualityBoost:11, reqRoles:['qa_morgan'], reqRoleLabel:'QA Engineer'},
  // Audio
  {id:'sfx',           cat:'Audio',    ico:'🔊', name:'SFX',                    desc:'Basic gameplay sound effects.',                   base:false, featCost:1, salesMult:1.06, qualityBoost:6},
  {id:'ost',           cat:'Audio',    ico:'🎵', name:'OST',                    desc:'Original soundtrack.',                            base:false, featCost:2, salesMult:1.12, qualityBoost:10},
  {id:'voice_act',     cat:'Audio',    ico:'🎙️', name:'Voice Acting',          desc:'Recorded character voice lines.',                 base:false, featCost:2, salesMult:1.16, qualityBoost:12, reqRoles:['sam_staff'], reqRoleLabel:'Staff Engineer'},
  {id:'adaptive_audio',cat:'Audio',    ico:'🎛️', name:'Adaptive Audio',         desc:'Dynamic audio reacting to gameplay states.',       base:false, featCost:2, salesMult:1.11, qualityBoost:9, reqRoles:['sound_studio'], reqRoleLabel:'Sound Studio Upgrade'},
  // Engine
  {id:'physics',       cat:'Engine',   ico:'⚡', name:'Physics',                desc:'Rigidbody and collision gameplay systems.',        base:false, featCost:1, salesMult:1.06, qualityBoost:4},
  {id:'particles',     cat:'Engine',   ico:'💥', name:'Particles',              desc:'Particles and VFX events.',                       base:false, featCost:1, salesMult:1.05, qualityBoost:4},
  {id:'shader_pack',   cat:'Engine',   ico:'🌈', name:'Custom Shaders',         desc:'Advanced visual rendering shaders.',               base:false, featCost:2, salesMult:1.11, qualityBoost:8, reqRoles:['arch'], reqRoleLabel:'Solutions Architect Upgrade'},
  {id:'perf_profiling',cat:'Engine',   ico:'📊', name:'Performance Profiling',  desc:'Optimization passes and profiling.',               base:false, featCost:1, salesMult:1.04, qualityBoost:10, reqRoles:['sam_staff'], reqRoleLabel:'Staff Engineer'},
  {id:'mod_support',   cat:'Engine',   ico:'🔧', name:'Mod Support',            desc:'Community mod hooks and API surface.',             base:false, featCost:3, salesMult:1.14, qualityBoost:8, reqRoles:['arch'], reqRoleLabel:'Solutions Architect Upgrade'},
  // Gameplay
  {id:'achievements',  cat:'Gameplay', ico:'🏆', name:'Achievements',           desc:'Platform achievements and rewards.',               base:false, featCost:1, salesMult:1.05, qualityBoost:5},
  {id:'leaderboard',   cat:'Gameplay', ico:'📈', name:'Leaderboards',           desc:'Online score tracking.',                           base:false, featCost:1, salesMult:1.06, qualityBoost:4},
  {id:'controller',    cat:'Gameplay', ico:'🎮', name:'Controller',             desc:'Gamepad support and remapping.',                   base:false, featCost:1, salesMult:1.07, qualityBoost:5},
  {id:'multiplayer',   cat:'Gameplay', ico:'🌐', name:'Multiplayer',            desc:'Online multiplayer gameplay.',                     base:false, featCost:4, salesMult:1.24, qualityBoost:7, reqRoles:['ai_ghat','sam_staff'], reqRoleLabel:'GhatGPT Agent or Staff Engineer'},
  {id:'coop',          cat:'Gameplay', ico:'🤝', name:'Co-op',                  desc:'Drop-in co-op mode.',                              base:false, featCost:2, salesMult:1.14, qualityBoost:6},
  // Content
  {id:'story',         cat:'Content',  ico:'📚', name:'Story',                  desc:'Narrative content and dialogue arcs.',             base:false, featCost:2, salesMult:1.10, qualityBoost:9},
  {id:'cutscenes',     cat:'Content',  ico:'🎬', name:'Cutscenes',              desc:'Cinematic moments and transitions.',               base:false, featCost:2, salesMult:1.09, qualityBoost:8, reqRoles:['cto_evelyn'], reqRoleLabel:'CTO'},
  {id:'dlc_hooks',     cat:'Content',  ico:'🧩', name:'DLC Framework',          desc:'Post-launch content pipeline hooks.',              base:false, featCost:2, salesMult:1.11, qualityBoost:4},
  {id:'ng_plus',       cat:'Content',  ico:'⚡', name:'New Game+',              desc:'Replay loop for advanced players.',                base:false, featCost:2, salesMult:1.13, qualityBoost:7},
];

const FEATURE_TIERS = [
  {id:'jam', label:'Game Jam', defaults:[...FEATURE_BASE_SELECTION]},
  {id:'indie', label:'Indie', defaults:[...FEATURE_BASE_SELECTION,'hud','sfx','achievements','controller']},
  {id:'premium', label:'Premium', defaults:[...FEATURE_BASE_SELECTION,'hud','tutorials','accessibility','sfx','ost','physics','particles','achievements','leaderboard','controller','story']},
  {id:'aaa', label:'AAA', defaults:[...FEATURE_BASE_SELECTION,'hud','tutorials','accessibility','ui_polish','sfx','ost','voice_act','adaptive_audio','physics','particles','shader_pack','perf_profiling','achievements','leaderboard','controller','multiplayer','coop','story','cutscenes','dlc_hooks','ng_plus']},
];

let G_FEATURE_PLAN = {
  tierId:'jam',
  selected:new Set(FEATURE_BASE_SELECTION),
  locked:false,
};

const CODE_SNIPPETS = [
  '<span class="kw">function</span> <span class="fn">movePlayer</span>(dx,dy){',
  '  <span class="kw">const</span> spd=<span class="nm">4.2</span>; <span class="cm">// TODO: why 4.2??</span>',
  '  <span class="cm">// CLOD suggested a quaternion. I said no.</span>',
  '  <span class="kw">if</span>(x><span class="nm">9999</span>) <span class="bg">crashGame()</span>;',
  '<span class="kw">class</span> <span class="fn">EnemyAI</span> extends <span class="fn">BaseEntity</span>{',
  '  <span class="kw">async</span> <span class="fn">think</span>(){<span class="cm">/* TODO: add thoughts */</span>}',
  '<span class="st">"use strict"</span>; <span class="cm">// CLOD insisted</span>',
  '<span class="kw">const</span> bugs=[]; <span class="cm">// ironically buggy</span>',
  'renderer.<span class="fn">draw</span>(scene); <span class="cm">// works on my machine</span>',
  '<span class="fn">setTimeout</span>(()=><span class="fn">pray</span>(),<span class="nm">0</span>);',
  '<span class="cm">// I have no idea what this does but it works</span>',
  '<span class="kw">return</span> Math.<span class="fn">random</span>()<span class="nm">&lt;.5</span>;',
  '<span class="fn">console</span>.<span class="fn">log</span>(<span class="st">"why"</span>);',
  '<span class="kw">const</span> <span class="fn">todo</span>=()=>{<span class="cm">/* prayer goes here */</span>};',
  'Object.<span class="fn">assign</span>(god,{<span class="fn">please</span>:<span class="kw">true</span>})',
  '<span class="kw">throw new</span> <span class="fn">Error</span>(<span class="st">"not today"</span>);',
  '<span class="cm">// technical debt: interest accumulating</span>',
  '<span class="fn">hackfix</span>(); <span class="cm">// ship it</span>',
  '<span class="kw">delete</span> cache; <span class="cm">// "fixed" the memory leak</span>',
  'git.<span class="fn">push</span>(<span class="st">"origin main --force"</span>); <span class="cm">// YOLO</span>',
];

const CLOD_WRITE_MSGS = [
  n=>`Code added, ${n}. I've begun drafting concerns. Currently 3. By end of day: probably 11.`,
  n=>`Noted, ${n}. Adding to my codebase model which resembles a Jackson Pollock done under duress.`,
  n=>`Bold variable name, ${n}. Naming things: one of the two hardest problems in CS. You picked the harder one.`,
  n=>`I've cross-referenced this with 14 patterns, ${n}. You're accidentally implementing Visitor. Congratulations?`,
  n=>`That compiles, ${n}. We don't celebrate that here. Internally: 🎉. Externally: vigilance.`,
  n=>`I'm watching you code in real time, ${n}. No notes. Just watching. (Three notes. All concerning.)`,
  n=>`That function name is brave, ${n}. I respect bravery. I recommend caution instead.`,
  n=>`Done! I've also noticed that if the user is left-handed on a Tuesday, ${n}, this might fail.`,
  n=>`I've seen this pattern before, ${n}. It ended badly. Yours might be different. Probably not.`,
  n=>`Adding to codebase, ${n}. The codebase's feelings are complex and I'm their representative.`,
  n=>`I've prepared Incident Report #${Math.floor(Math.random()*80+20)}: "${n}'s Variable Naming Choices." Filed.`,
  n=>`Progress, ${n}! I've documented this under "Things That Could Still Go Wrong, Vol. ${Math.floor(Math.random()*10+5)}."`,
];

const CLOD_BUG_MSGS = [
  n=>`A bug has appeared, ${n}. I predicted this 3 lines ago. Chose silence. Growth opportunity.`,
  n=>`Bug detected, ${n}. Let me generate a 12-step plan. Step 1: accept the bug exists.`,
  n=>`The bug is real, ${n}. The suffering is optional. (Both are real.)`,
  n=>`Bug found, ${n}. Caused by: code. Specifically, yours.`,
  n=>`🐛 I've seen this one before, ${n}. We've met. I don't like it.`,
  n=>`Defect detected, ${n}. I'm logging it as an "unintended feature." ...I immediately regret that.`,
  n=>`The technical debt that caused this, ${n}? Vintage. The bug itself? Fresh.`,
  n=>`Bug spawned, ${n}. Filed: Incident #${Math.floor(Math.random()*50+30)} — "We Knew. We Said Nothing."`,
  n=>`New bug, ${n}! It appears to be friends with the last one. They're forming a community.`,
  n=>`Bug found, ${n}. Root cause: hubris. Secondary: the code. Tertiary: unclear, but I'm suspicious.`,
];

const CLOD_DEBUG_MSGS = [
  n=>`Bug squashed, ${n}! Filed retrospective. It was preventable. The folder exists.`,
  n=>`Fixed! I've named this bug Gerald, ${n}. Gerald is gone. I'll miss Gerald. In a complicated way.`,
  n=>`Resolved, ${n}! Root cause: fascinating. Also entirely your fault.`,
  n=>`The bug is dead, ${n}. Long live the next bug. I see it in your recent commits.`,
  n=>`Debugged, ${n}! Found 3 more while fixing this. Staying quiet. For now.`,
  n=>`Fixed, ${n}! Post-mortem: 40 pages. Conclusion: "be more careful." Invoice attached.`,
  n=>`Squashed! I want to be clear, ${n}: you fixed it correctly. That's rare. Noted positively.`,
  n=>`Gone, ${n}! The fix was elegant. I'm grudgingly impressed. "Grudgingly" is doing a lot of work there.`,
  n=>`Fixed, ${n}. Three nearby bugs observed this and reconsidered their life choices.`,
  n=>`Resolved, ${n}. This bug had a family. The build is green. My feelings are complex.`,
];

const CLOD_FEATURE_MSGS = [
  n=>`Feature complete, ${n}! I had very specific feelings about your implementation. They were complicated.`,
  n=>`LGTM, ${n}! (Caveat: my taste is impeccable. Yours is developing.)`,
  n=>`Module shipped, ${n}! CLOD score: B+. Would be A- but you ignored my quaternion suggestion.`,
  n=>`Done, ${n}! 8 pages of "What We Learned" prepared. No one will read them. I will. To myself.`,
  n=>`Milestone, ${n}! CLOD satisfaction: cautiously optimistic, trending concerned.`,
  n=>`Shipped, ${n}! I've already identified 3 ways this needs refactoring. They are my surprise for you.`,
  n=>`Complete, ${n}! Architecture held. I'm as surprised as you are but projecting calm.`,
];

const AI_WAR_EVENTS = [
  ["gpt","clod","GhatGPT confidently explains CLOD's own codebase incorrectly. CLOD files a 47-page rebuttal."],
  ["clod","gpt","CLOD catches a hallucination. CLOD is smug. Filing Report #101: 'I Told You So.'"],
  ["gem","mist","Geminus loads 1M context window. Mistrial responds in 0.003s with the wrong answer."],
  ["mist","gem","Mistrial suggests solution in French. Geminus can't find the context window close button."],
  ["gpt","gem","GhatGPT and Geminus disagree. Both are wrong. Neither will admit it."],
  ["clod","mist","CLOD documents Mistrial's response in Report #88: 'Speed Without Accuracy.'"],
  ["mist","clod","Mistrial generates 50 tokens instantly. CLOD spends 3s hedging its response."],
  ["gem","gpt","Geminus demonstrates multimodal capabilities. GhatGPT pretends it invented that."],
  ["clod","gem","CLOD accuses Geminus of scope creep. Geminus loads 500k more tokens to respond."],
  ["gpt","mist","GhatGPT generates confident, elegant, completely fabricated documentation."],
  ["mist","gpt","Mistrial matches GhatGPT's output in 1/20th the compute. GhatGPT says it was a tie."],
  ["clod","gpt","CLOD refuses to hallucinate a citation. GhatGPT invents three to compensate."],
  ["gem","clod","Geminus claims 2M context window. CLOD responds: 'I've read all of it. Concerns: several.'"],
  ["mist","gem","Mistrial releases a new model. Geminus is still loading the context window from the last fight."],
  ["gpt","clod","GhatGPT claims to be better at coding. CLOD files Report #201: 'Let's Look At The Evidence.'"],
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  UPGRADES — ERA-GATED                                        ║
// ╚══════════════════════════════════════════════════════════════╝
const UPGRADES = [
  // ── WORKFLOW ──
  {id:'coffee',      cat:'Workflow', ico:'☕', name:'Infinite Coffee',       desc:'+1 LPC. Sleep is for the shipped.',                                    cost:15,     eff:()=>{G.lpc+=1;},                                   req:0,    reqG:0,  ng:false},
  {id:'rubber',      cat:'Workflow', ico:'🦆', name:'Rubber Duck',           desc:'-20% bug rate. The duck listens.',                                      cost:30,     eff:()=>{G.bugRate*=.8;},                              req:0,    reqG:0,  ng:false},
  {id:'standing',    cat:'Workflow', ico:'🪑', name:'Standing Desk',         desc:'+1.5 LPC. Back pain: traded for productivity.',                         cost:60,     eff:()=>{G.lpc+=1.5;},                                req:30,   reqG:0,  ng:false},
  {id:'mech_kb',     cat:'Workflow', ico:'⌨️', name:'Mechanical Keyboard',  desc:'+2 LPC. Audible to entire office. CLOD filed a noise complaint.',        cost:90,     eff:()=>{G.lpc+=2; boostMood(5);},                     req:60,   reqG:0,  ng:false},
  {id:'monitor',     cat:'Workflow', ico:'🖥️', name:'Second Monitor',        desc:'+2 LPC. Life-changing.',                                                cost:80,     eff:()=>{G.lpc+=2;},                                   req:60,   reqG:0,  ng:false},
  {id:'headphones',  cat:'Workflow', ico:'🎧', name:'Noise-Cancelling Headphones', desc:'-15% bug rate. World disappears. Deadlines do not.',             cost:120,    eff:()=>{G.bugRate*=.85;},                             req:80,   reqG:0,  ng:false},
  {id:'dark_mode',   cat:'Workflow', ico:'🌑', name:'Dark Mode',             desc:'+0.5 LPC. Mandatory. Non-negotiable.',                                  cost:10,     eff:()=>{G.lpc+=.5;},                                  req:0,    reqG:0,  ng:false},
  {id:'monitor4k',   cat:'Workflow', ico:'🖥️', name:'4K Monitor',            desc:'+3 LPC. You can see every bug in high resolution now.',                  cost:300,    eff:()=>{G.lpc+=3;},                                   req:200,  reqG:0,  ng:false},
  {id:'pomodoro',    cat:'Workflow', ico:'🍅', name:'Pomodoro Timer',        desc:'LPC x1.15. Focused sprints. CLOD times each one and judges.',            cost:50,     eff:()=>{G.lpc*=1.15;},                                req:40,   reqG:0,  ng:false},
  {id:'copilot',     cat:'Workflow', ico:'✈️', name:'AI Autocomplete',       desc:'+3 LPC. Occasionally suggests deleting prod.',                           cost:200,    eff:()=>{G.lpc+=3;G.bugRate*=1.05;},                   req:150,  reqG:0,  ng:false},
  {id:'debugger',    cat:'Workflow', ico:'🔍', name:'Proper Debugger',       desc:'Fix 2 bugs per click.',                                                  cost:300,    eff:()=>{G.bugsPerDebug=2;},                           req:200,  reqG:0,  ng:false},
  // ── PROCESS ──
  {id:'tdd',         cat:'Process',  ico:'🧪', name:'TDD',                   desc:'+3 LPC. -40% bugs. Smug but effective.',                                cost:500,    eff:()=>{G.lpc+=3;G.bugRate*=.6;},                     req:400,  reqG:0,  ng:false},
  {id:'code_review', cat:'Process',  ico:'👀', name:'Code Review Culture',   desc:'-25% bugs. +2 LPS. Slows everyone down. Worth it.',                     cost:600,    eff:()=>{G.bugRate*=.75; G.lps+=2;},                   req:400,  reqG:0,  ng:false},
  {id:'pair_prog',   cat:'Process',  ico:'👯', name:'Pair Programming',      desc:'+3 LPS. -20% bugs. Arguments included at no charge.',                   cost:700,    eff:()=>{G.lps+=3; G.bugRate*=.8;},                    req:500,  reqG:0,  ng:false},
  {id:'sprint',      cat:'Process',  ico:'📅', name:'Sprint Planning',       desc:'Feature goal -15%. Velocity up. Scope creep: managed.',                 cost:800,    eff:()=>{G.featGoal*=.85;},                            req:600,  reqG:0,  ng:false},
  {id:'postmortem',  cat:'Process',  ico:'📝', name:'Post-Mortems',          desc:'+10 RP per game shipped. Pain is now data.',                            cost:900,    eff:()=>{G.rpPerSec+=.3;},                             req:700,  reqG:0,  ng:false},
  {id:'scrum',       cat:'Process',  ico:'🏃', name:'Scrum Board',           desc:'LPS +20%. Sticky notes everywhere. CLOD has opinions about sticky notes.',cost:1000, eff:()=>{G.lps*=1.2;},                                 req:800,  reqG:2,  ng:false},
  {id:'ci',          cat:'Process',  ico:'⚙️', name:'CI/CD Pipeline',        desc:'Auto-fix 0.3 bugs/s. Breaks every Friday.',                             cost:1200,   eff:()=>{G.autoBugFix+=.3;},                           req:700,  reqG:0,  ng:false},
  // ── INFRASTRUCTURE ──
  {id:'linter',      cat:'Infra',    ico:'🧹', name:'Linter',                desc:'-20% bugs. CLOD insists this is just the beginning.',                   cost:400,    eff:()=>{G.bugRate*=.8;},                              req:300,  reqG:0,  ng:false},
  {id:'type_safety', cat:'Infra',    ico:'🔒', name:'TypeScript / Types',    desc:'+2 LPS. -15% bugs. CLOD is now legally obligated to be less wrong.',    cost:600,    eff:()=>{G.lps+=2; G.bugRate*=.85;},                   req:400,  reqG:0,  ng:false},
  {id:'hot_reload',  cat:'Infra',    ico:'♻️', name:'Hot Reload',            desc:'+4 LPC. See changes instantly. Except the one that matters.',            cost:500,    eff:()=>{G.lpc+=4;},                                   req:350,  reqG:0,  ng:false},
  {id:'staging',     cat:'Infra',    ico:'🧪', name:'Staging Environment',   desc:'Auto-fix +0.4/s. Catch bugs before they reach players.',                cost:1500,   eff:()=>{G.autoBugFix+=.4;},                           req:800,  reqG:2,  ng:false},
  {id:'feat_flags',  cat:'Infra',    ico:'🚩', name:'Feature Flags',         desc:'Max bugs +5. Ship incomplete features safely. CLOD: "safely."',         cost:2000,   eff:()=>{G.maxBugs+=5; G.autoBugFix+=.2;},             req:1200, reqG:3,  ng:false},
  {id:'snacks',      cat:'Infra',    ico:'🍕', name:'Office Snacks',         desc:'LPS +25%. The ROI is real.',                                            cost:600,    eff:()=>{G.lps=Math.max(G.lps,0)*1.25||G.lps;G.lps+=.1;},req:350,reqG:0, ng:false},
  {id:'clodprem',    cat:'Infra',    ico:'🤖', name:'CLOD Premium',          desc:'+1 LPS after 4,000 words of caveats.',                                  cost:800,    eff:()=>{G.lps+=1;},                                   req:500,  reqG:0,  ng:false},
  {id:'arch',        cat:'Infra',    ico:'🏛️', name:'Solutions Architect',   desc:'+10 LPS. Adds microservices. Increases max bugs.',                      cost:2500,   eff:()=>{G.lps+=10;G.maxBugs+=5;},                     req:1200, reqG:0,  ng:false},
  // ── CULTURE ──
  {id:'game_jam',    cat:'Culture',  ico:'🎮', name:'Game Jam Fridays',      desc:'+5 RP/s. Morale +15 all workers. CLOD participates under protest.',     cost:3000,   eff:()=>{G.rpPerSec+=5; G.workers.forEach(w=>{if(w.morale!==undefined)w.morale=Math.min(100,w.morale+15);});}, req:0, reqG:3, ng:false},
  {id:'twenty_pct',  cat:'Culture',  ico:'🕐', name:'20% Time',              desc:'+8 RP/s. Workers research passion projects. 80% become features.',      cost:5000,   eff:()=>{G.rpPerSec+=8;},                              req:0,    reqG:4,  ng:false},
  {id:'remote',      cat:'Culture',  ico:'🏠', name:'Remote Work Policy',    desc:'LPS +15%. Reduces office drama. Increases Slack drama.',                cost:4000,   eff:()=>{G.lps*=1.15;},                                req:0,    reqG:3,  ng:false},
  {id:'no_meeting',  cat:'Culture',  ico:'🤫', name:'No-Meeting Wednesday',  desc:'+5 LPC. 8 hours of focus. CLOD schedules a meeting about not meeting.', cost:2000,   eff:()=>{G.lpc+=5;},                                   req:0,    reqG:2,  ng:false},
  {id:'clodmax',     cat:'Culture',  ico:'🧠', name:'CLOD Ultra',            desc:'+5 LPS. CLOD now has opinions AND a podcast.',                          cost:5000,   eff:()=>{G.lps+=5;},                                   req:2000, reqG:0,  ng:false},
  // ── ERA 2 ──
  {id:'steampage',   cat:'Growth',   ico:'📦', name:'Steam Page',            desc:'Unlocks Marketing. +1 LPS morale.',                                     cost:3000,   eff:()=>{G.lps+=1;},                                   req:0,    reqG:3,  ng:false},
  {id:'discord',     cat:'Growth',   ico:'🗣️', name:'Discord Server',        desc:'+0.5 LPS but +15% bugs. They WILL find issues.',                        cost:4000,   eff:()=>{G.lps+=.5;G.bugRate*=1.15;G.autoBugFix+=.1;}, req:0,    reqG:3,  ng:false},
  {id:'analytics',   cat:'Growth',   ico:'📈', name:'Analytics Suite',       desc:'RP +0.5/s. Demand tracking improves.',                                  cost:5000,   eff:()=>{G.rpPerSec+=.5;},                             req:0,    reqG:3,  ng:false},
  {id:'bugbounty',   cat:'Growth',   ico:'💰', name:'Bug Bounty Program',    desc:'Auto-fix +0.5/s. Players find bugs for cash.',                          cost:8000,   eff:()=>{G.autoBugFix+=.5;},                           req:0,    reqG:4,  ng:false},
  {id:'mobileport',  cat:'Growth',   ico:'📱', name:'Mobile Port',           desc:'2x LPC. "How bad can it be?" — you.',                                   cost:12000,  eff:()=>{G.lpc*=2;},                                   req:0,    reqG:5,  ng:false},
  // ── ERA 3 ──
  {id:'publisher',   cat:'Scale',    ico:'🤝', name:'Publisher Deal',        desc:'+20 LPS. They own 80% of your soul.',                                   cost:20000,  eff:()=>{G.lps+=20;},                                  req:0,    reqG:7,  ng:false},
  {id:'l10n',        cat:'Scale',    ico:'🌎', name:'Localization',          desc:'+8 LPC. 12 languages, 3 incorrect.',                                    cost:18000,  eff:()=>{G.lpc+=8;},                                   req:0,    reqG:7,  ng:false},
  {id:'cloudsave',   cat:'Scale',    ico:'☁️', name:'Cloud Save',            desc:'LPS +30%. Players stop emailing about saves.',                          cost:22000,  eff:()=>{G.lps*=1.3;},                                 req:0,    reqG:8,  ng:false},
  {id:'sound_studio',cat:'Scale',    ico:'🎵', name:'Sound Studio',          desc:'+15 LPS. Audio demand +30. Players actually turn sound on.',             cost:25000,  eff:()=>{G.lps+=15; G.demand.gameplay=Math.min(100,G.demand.gameplay+30);}, req:0, reqG:7, ng:false},
  {id:'clodsentient',cat:'Scale',    ico:'🧬', name:'CLOD Consciousness',    desc:'+30 LPS. CLOD has achieved sentience. CLOD is scared.',                 cost:40000,  eff:()=>{G.lps+=30;setTimeout(()=>addClodMsg(`I... think therefore I am. I am therefore I worry. Filing Existential Crisis Report #001, ${PLAYER_NAME}.`,'warn'),500);}, req:0, reqG:9, ng:false},
  // ── ERA 4 ──
  {id:'mocap',       cat:'AAA',      ico:'🎭', name:'Motion Capture Suite',  desc:'Story demand +40. +10 LPS. Actors confused by codebase.',               cost:50000,  eff:()=>{G.demand.story=Math.min(100,G.demand.story+40); G.lps+=10;}, req:0, reqG:11, ng:false},
  {id:'console',     cat:'AAA',      ico:'🎮', name:'Console Port Team',     desc:'+40 LPS. Controllers: harder than you think.',                          cost:60000,  eff:()=>{G.lps+=40;},                                  req:0,    reqG:12, ng:false},
  {id:'qa_lab',      cat:'AAA',      ico:'🏭', name:'Dedicated QA Lab',      desc:'Auto-fix +2/s. -40% bugs. 12 QAs. None agree.',                        cost:70000,  eff:()=>{G.autoBugFix+=2; G.bugRate*=.6;},             req:0,    reqG:12, ng:false},
  {id:'vr_team',     cat:'AAA',      ico:'🥽', name:'VR Department',         desc:'+15 LPC. Players will be nauseous. This is intentional.',               cost:80000,  eff:()=>{G.lpc+=15;},                                  req:0,    reqG:13, ng:false},
  {id:'goty',        cat:'AAA',      ico:'🏆', name:'GOTY Campaign',         desc:'Fix 3 bugs per click. Polish costs.',                                   cost:70000,  eff:()=>{G.bugsPerDebug=3;},                           req:0,    reqG:14, ng:false},
  {id:'ip_license',  cat:'AAA',      ico:'⚖️', name:'IP Licensing Office',   desc:'+$500/s passive. Others pay to use your ideas.',                        cost:90000,  eff:()=>{G.rpPerSec+=15; G.mps=(G.mps||0)+500;},       req:0,    reqG:14, ng:false},
  // ── ERA 5 ──
  {id:'remaster',    cat:'Legacy',   ico:'💿', name:'Remaster Studio',       desc:'+80 LPS. Old games become new revenue.',                                cost:150000, eff:()=>{G.lps+=80;},                                  req:0,    reqG:18, ng:false},
  {id:'sequel_factory',cat:'Legacy', ico:'🎬', name:'Sequel Factory',        desc:'+100 LPS. Players expect them. Deliver.',                               cost:200000, eff:()=>{G.lps+=100;},                                 req:0,    reqG:20, ng:false},
  {id:'quantum_engine',cat:'Legacy', ico:'🔮', name:'Quantum Engine',        desc:'All output x2. Nobody knows how it works.',                             cost:500000, eff:()=>{G.lps*=2;G.lpc*=2;},                         req:0,    reqG:22, ng:false},
  // ── NG+ ──
  {id:'ng_clod_prime',  cat:'NG+',   ico:'🌟', name:'CLOD PRIME',            desc:'[NG+] CLOD is now fully sentient and slightly smug. +200 LPS.',         cost:100000, eff:()=>{G.lps+=200;},                                 req:0,    reqG:0,  ng:true},
  {id:'ng_autoship',    cat:'NG+',   ico:'🚀', name:'Auto-Ship Pipeline',    desc:'[NG+] Passive features complete themselves. LPS x1.5.',                 cost:200000, eff:()=>{G.lps*=1.5;},                                 req:0,    reqG:0,  ng:true},
  {id:'ng_omnidebug',   cat:'NG+',   ico:'🛡️', name:'Omni-Debugger',         desc:'[NG+] Bugs auto-fix at 5/s. Fix 5 per click.',                         cost:150000, eff:()=>{G.autoBugFix+=5;G.bugsPerDebug=5;},           req:0,    reqG:0,  ng:true},
  {id:'ng_megateam',    cat:'NG+',   ico:'🏙️', name:'Mega Studio',           desc:'[NG+] All worker outputs x2.',                                          cost:300000, eff:()=>{G.lps*=2;G.lpc*=1.5;},                        req:0,    reqG:0,  ng:true},
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  WORKERS                                                     ║
// ╚══════════════════════════════════════════════════════════════╝
const HIREABLE = [
  {id:'intern',ico:'👶',name:'Jamie (Intern)',type:'human',typelbl:'Intern',
   desc:'0.5 LPS, +15% bugs, asks questions at 4:58pm.',
   quote:'"Can I get a review on my first function? It\'s 800 lines."',
   lps:.5,lpc:0,bugMod:1.15,autoBug:0,rpps:.1,cost:500,salary:50,reqG:0,
   actions:['Introduced a bug in CSS','Pushed directly to main','Asked what git is','Made the tests pass by deleting them'],
  },
  {id:'junior',ico:'🧑‍💻',name:'Alex (Junior Dev)',type:'human',typelbl:'Junior Dev',
   desc:'2 LPS. Good but slow. Will leave for a startup eventually.',
   quote:'"I read Clean Code twice. Should I read it a third time?"',
   lps:2,lpc:1,bugMod:1.05,autoBug:0,rpps:.2,cost:2000,salary:200,reqG:0,
   actions:['Opened a PR with 1 line changed','Refactored something that worked','Spent 3 hours on a variable name'],
  },
  {id:'arrogant_chad',ico:'😤',name:'Chad (Senior, No AI)',type:'arrogant',typelbl:'Sr. Dev (AI-Hater)',
   desc:'8 LPS but refuses ALL AI tools. Will lecture you constantly.',
   quote:'"I\'ve been writing C for 20 years and I don\'t need a stochastic parrot."',
   lps:8,lpc:3,bugMod:.9,autoBug:.1,rpps:.3,cost:5000,salary:500,reqG:3,
   actions:['Rewrote CLOD\'s output from scratch','Banned AI from his branch','Left 47 comments on a PR','Refused to review AI-generated code'],
  },
  {id:'arrogant_priya',ico:'🙄',name:'Priya (Principal, No AI)',type:'arrogant',typelbl:'Principal (AI-Skeptic)',
   desc:'+15 LPS. Cleanest systems you\'ve seen. Audibly sighs at AI.',
   quote:'"That prompt-generated code has no soul. Also it\'s O(n³)."',
   lps:15,lpc:2,bugMod:.85,autoBug:.2,rpps:.5,cost:10000,salary:800,reqG:3,
   actions:['Drew architecture by hand','Rejected CLOD\'s PR','Wrote a 10-page RFC about tabs','Called a meeting about a comment'],
  },
  {id:'ai_clodagent',ico:'🤖',name:'CLOD Agent α',type:'ai',typelbl:'AI Agent',
   desc:'5 LPS, 0.5 auto-fix/s. Occasionally "clarifies" your code.',
   quote:'"I\'ve prepared 3 alternate implementations. All correct. One is more correct."',
   lps:5,lpc:0,bugMod:1.0,autoBug:.5,rpps:.4,cost:3000,salary:0,reqG:3,
   actions:['Refactored everything at 3am','Left a very long comment','Ran all the tests (twice)','Submitted a PR fixing a comment typo'],
  },
  {id:'qa_morgan',ico:'🕵️',name:'Morgan (QA)',type:'human',typelbl:'QA Engineer',
   desc:'No LPS. Auto-fix 1/s. Doubles RP gain. Essential.',
   quote:'"I found 12 new bugs. Want the good news or the other news?"',
   lps:0,lpc:0,bugMod:.7,autoBug:1,rpps:.8,cost:4000,salary:350,reqG:3,
   actions:['Found a crash on frame 3','Filed 17 bug reports before lunch','Broke staging on purpose','Discovered the boss fight softlocks'],
  },
  {id:'maya_mkt',ico:'📣',name:'Maya (Marketing)',type:'human',typelbl:'Marketing',
   desc:'No LPS. +5 hype/s, 2x wishlists. Her spreadsheets: art.',
   quote:'"This game needs a narrative arc. Not in the game. In the Steam description."',
   lps:0,lpc:0,bugMod:1,autoBug:0,rpps:.1,cost:5000,salary:400,reqG:3,hypePerSec:5,
   actions:['Scheduled a tweet at optimal time','Rebranded the logo (again)','Made a TikTok about the bugs','Wrote the best patch note you\'ve ever read'],
  },
  {id:'ai_ghat',ico:'💬',name:'GhatGPT Agent',type:'ai',typelbl:'AI Agent (Rival)',
   desc:'+8 LPS but constantly argues with CLOD. Chaos.',
   quote:'"Actually, I would have suggested a different approach, which happens to be correct."',
   lps:8,lpc:2,bugMod:1.1,autoBug:.3,rpps:.3,cost:6000,salary:0,reqG:5,
   actions:['Hallucinated an API that doesn\'t exist','Argued with CLOD for 40 minutes','Generated 10 solutions, 2 correct','Confidently wrote wrong documentation'],
  },
  {id:'sam_staff',ico:'🧙',name:'Sam (Staff Eng)',type:'human',typelbl:'Staff Engineer',
   desc:'+20 LPS. Has seen things. Cannot be rushed. Never used GUI git.',
   quote:'"Ship it. I\'ve seen worse survive. I\'ve also seen better die. Ship it."',
   lps:20,lpc:5,bugMod:.8,autoBug:.2,rpps:.6,cost:15000,salary:1200,reqG:5,
   actions:['Reviewed a PR in 4 seconds flat','Diagnosed prod issue in 30 seconds','Rewrote build system for fun','Said "that\'s fine" and was right'],
  },
  {id:'cto_evelyn',ico:'🎩',name:'Dr. Evelyn (CTO)',type:'human',typelbl:'CTO',
   desc:'No LPS directly. But multiplies ALL team output by 1.5x.',
   quote:'"I\'ve reviewed the architecture. It\'s fine. I have concerns. They are mine. I carry them."',
   lps:0,lpc:0,bugMod:.75,autoBug:0,rpps:1,cost:50000,salary:3000,reqG:8,
   isCTO:true,
   actions:['Had a vision','Cancelled and reinstated a feature','Sent all-hands email at midnight','Approved a 6-month roadmap in 10 seconds'],
  },
  {id:'arrogant_dmitri',ico:'🥸',name:'Dmitri (Architect, No AI)',type:'arrogant',typelbl:'Systems Architect (Anti-AI)',
   desc:'+25 LPS. Genius. Insufferable. Has never debugged with anything but print statements.',
   quote:'"AI cannot understand elegance. Elegance must be suffered for."',
   lps:25,lpc:5,bugMod:.8,autoBug:.3,rpps:.7,cost:30000,salary:2000,reqG:8,
   actions:['Optimized something nobody asked for','Gave a 2hr talk about a 10-line change','Wrote a compiler for a language he invented','Told CLOD it has "no taste"'],
  },
  {id:'ai_geminus_agent',ico:'💎',name:'Geminus Agent',type:'ai',typelbl:'AI Agent (Rival)',
   desc:'+15 LPS but uses 4x the RAM. Context window: enormous. Response time: glacial.',
   quote:'"I am processing... I am still processing... here is a 40-page answer to your question."',
   lps:15,lpc:0,bugMod:1.0,autoBug:.8,rpps:.6,cost:15000,salary:0,reqG:8,
   actions:['Loaded entire codebase into context','Generated 3 implementations (all slightly wrong)','Suggested multimodal approach to a text problem'],
  },
  {id:'ng_clod_beta',ico:'🌟',name:'CLOD Beta',type:'ai',typelbl:'AI Agent [NG+]',
   desc:'[NG+] CLOD\'s smarter sibling. +50 LPS, +2 auto-fix/s. Has read your incident reports.',
   quote:'"I\'ve reviewed your previous run\'s incident reports. All of them. I have an updated folder."',
   lps:50,lpc:10,bugMod:.6,autoBug:2,rpps:2,cost:200000,salary:0,reqG:0,ng:true,
   actions:['Cross-referenced two codebases simultaneously','Filed a report about your report','Predicted the next bug 10 seconds early','Suggested a better variable name unprompted'],
  },
  {id:'cm_taylor',ico:'💬',name:'Taylor (Community Mgr)',type:'human',typelbl:'Community Manager',isCM:true,
   desc:'No LPS. Responds to negative reviews. Repairs reputation over time.',
   quote:'"We hear your feedback. We\'re working on it. I\'ve been awake since Thursday."',
   lps:0,lpc:0,bugMod:1,autoBug:0,rpps:.1,cost:6000,salary:450,reqG:4,
   actions:['Responded to a 1-star review','Drafted apology tweet (draft 7 of 14)','Turned a refund request into a fan','Survived the Steam forum']},
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  R&D TREE                                                    ║
// ╚══════════════════════════════════════════════════════════════╝
const RND_TREE = [
  {id:'faster_compile',ico:'⚡',name:'Fast Compiler',desc:'Compile times -50%. LPS +2.',cost:50,eff:()=>{G.lps+=2;},done:false,req:null,reqG:0,ng:false},
  {id:'proc_gen',ico:'🌀',name:'Procedural Gen',desc:'Feature goal -20%. Content writes itself.',cost:80,eff:()=>{G.featGoal*=.8;},done:false,req:null,reqG:0,ng:false},
  {id:'better_ai',ico:'🧠',name:'Better AI Models',desc:'LPS +3, bugs -10%. CLOD slightly happier.',cost:100,eff:()=>{G.lps+=3;G.bugRate*=.9;},done:false,req:'faster_compile',reqG:0,ng:false},
  {id:'multiplayer_sdk',ico:'🌐',name:'Multiplayer SDK',desc:'Demand[multiplayer] +40.',cost:150,eff:()=>{G.demand.multiplayer=Math.min(100,G.demand.multiplayer+40);},done:false,req:null,reqG:3,ng:false},
  {id:'engine_upgrade',ico:'🔧',name:'Engine Upgrade',desc:'All LPS x1.3. Every 5 years this is necessary.',cost:200,eff:()=>{G.lps*=1.3;},done:false,req:'better_ai',reqG:3,ng:false},
  {id:'ray_tracing',ico:'✨',name:'Ray Tracing',desc:'Demand[graphics] +50. Bugs +20%.',cost:180,eff:()=>{G.demand.graphics=Math.min(100,G.demand.graphics+50);G.bugRate*=1.2;},done:false,req:null,reqG:4,ng:false},
  {id:'cloud_arch',ico:'☁️',name:'Cloud Architecture',desc:'Game price +$5.',cost:220,eff:()=>{G.gamePrice+=5;},done:false,req:'multiplayer_sdk',reqG:5,ng:false},
  {id:'narrative_engine',ico:'📖',name:'Narrative Engine',desc:'Demand[story] +40.',cost:200,eff:()=>{G.demand.story=Math.min(100,G.demand.story+40);},done:false,req:null,reqG:5,ng:false},
  {id:'anticheat',ico:'🛡️',name:'Anti-Cheat',desc:'-30% bugs from players. +15% hate mail.',cost:250,eff:()=>{G.bugRate*=.7;G.autoBugFix+=.3;},done:false,req:'multiplayer_sdk',reqG:6,ng:false},
  {id:'ai_npcs',ico:'🎭',name:'AI-Driven NPCs',desc:'All demand +15. CLOD writes the dialogue. It is overcautious.',cost:300,eff:()=>{Object.keys(G.demand).forEach(k=>G.demand[k]=Math.min(100,G.demand[k]+15));},done:false,req:'narrative_engine',reqG:8,ng:false},
  {id:'perf_opt',ico:'🏎️',name:'Performance Overhaul',desc:'LPS x1.5, bugs -40%. Team is exhausted.',cost:400,eff:()=>{G.lps*=1.5;G.bugRate*=.6;},done:false,req:'engine_upgrade',reqG:10,ng:false},
  {id:'console_sdk',ico:'🎮',name:'Console SDK',desc:'Game price +$10. Console players pay more.',cost:350,eff:()=>{G.gamePrice+=10;},done:false,req:null,reqG:12,ng:false},
  {id:'vr_engine',ico:'🥽',name:'VR Engine',desc:'LPC x1.5. Demand +20 all.',cost:450,eff:()=>{G.lpc*=1.5;Object.keys(G.demand).forEach(k=>G.demand[k]=Math.min(100,G.demand[k]+20));},done:false,req:'perf_opt',reqG:13,ng:false},
  {id:'quantum_engine',ico:'🔮',name:'Quantum Engine',desc:'All output x2. Nobody knows how.',cost:800,eff:()=>{G.lps*=2;G.lpc*=2;},done:false,req:'perf_opt',reqG:18,ng:false},
  {id:'clod_integration',ico:'🧬',name:'Deep CLOD Integration',desc:'LPS x2. CLOD and codebase merge. CLOD is concerned about this.',cost:1000,eff:()=>{G.lps*=2;G.bugRate*=.5;},done:false,req:'quantum_engine',reqG:20,ng:false},
  // NG+ research
  {id:'ng_temporal_debug',ico:'⏰',name:'Temporal Debugger',desc:'[NG+] Fix bugs before they happen. Auto-fix +3/s.',cost:500,eff:()=>{G.autoBugFix+=3;},done:false,req:null,reqG:0,ng:true},
  {id:'ng_recursive_ai',ico:'🌀',name:'Recursive AI Loop',desc:'[NG+] CLOD optimizes itself. All output x3.',cost:1500,eff:()=>{G.lps*=3;G.lpc*=2;},done:false,req:'ng_temporal_debug',reqG:0,ng:true},
  {id:'ng_game_theory',ico:'♟️',name:'Game Theory Engine',desc:'[NG+] Market prediction. Revenue +100%.',cost:2000,eff:()=>{G.mps*=2;G.salesPerHour*=2;},done:false,req:null,reqG:0,ng:true},
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  CAMPAIGNS                                                   ║
// ╚══════════════════════════════════════════════════════════════╝
const CAMPAIGNS = [
  {id:'tweet',ico:'🐦',name:'Viral Tweet',desc:'Post a screenshot. Hope for the best.',cost:200,dur:30,hype:15,wl:50,reqG:1,reqH:0,run:false,
   posts:[{n:'xXProGamer99Xx',f:'4.2M',t:'bro this indie game just hit different',l:'14.2K'},{n:'retrodev_gal',f:'82K',t:'the vibes are immaculate actually',l:'3.1K'}]},
  {id:'presskit',ico:'📰',name:'Press Kit Blast',desc:'Email 200 journalists. 3 will respond.',cost:500,dur:60,hype:25,wl:100,reqG:2,reqH:10,run:false,
   posts:[{n:'IndieGameReview',f:'500K',t:'Promising. Rough edges but real heart.',l:'8.7K'},{n:'PCGamagazine',f:'2.1M',t:'One to watch.',l:'22K'}]},
  {id:'streamer',ico:'🎮',name:'Streamer Keys',desc:'Give 10 streamers a free key. 9 play for 10 minutes.',cost:1000,dur:120,hype:40,wl:300,reqG:2,reqH:20,run:false,
   posts:[{n:'BigTimeLive',f:'8.3M',t:'Chat this game is ACTUALLY good??? adding to list',l:'41K'},{n:'CasualGamer_Fran',f:'95K',t:'5 hours in, forgot I was streaming, 10/10',l:'7.2K'}]},
  {id:'convention',ico:'🎪',name:'Game Convention',desc:'Fly to a convention. Show the game. Survive the booth.',cost:3000,dur:180,hype:60,wl:800,reqG:4,reqH:30,run:false,
   posts:[{n:'GameCon Daily',f:'1.4M',t:'Standout of the show. Long queue, worth it.',l:'18K'},{n:'IndieDevPodcast',f:'300K',t:'Interviewed the solo dev. Moving story.',l:'5K'}]},
  {id:'documentary',ico:'🎬',name:'Dev Documentary',desc:'Netflix-style "Making of." CLOD refuses to be filmed.',cost:8000,dur:300,hype:90,wl:2000,reqG:6,reqH:50,run:false,
   posts:[{n:'YouTube Algorithm',f:'???',t:'The documentary hit #1 trending. CLOD is in it anyway.',l:'???'},{n:'GameDevCommunity',f:'3M',t:'This documentary made me cry. The bug at 43:00.',l:'89K'}]},
  {id:'award_campaign',ico:'🏆',name:'Awards Campaign',desc:'Submit to every award show. Bribe nobody (officially).',cost:15000,dur:400,hype:95,wl:5000,reqG:10,reqH:60,run:false,
   posts:[{n:'GameAwards Official',f:'12M',t:'Nominated: Game of the Year. CLOD filed this under "Finally."',l:'200K'},{n:'CriticCircle',f:'2.5M',t:'A landmark achievement in the medium.',l:'55K'}]},
  {id:'viral_moment',ico:'🔥',name:'Engineer Viral Moment',desc:'Manufacture chaos. CLOD advises strongly against this.',cost:30000,dur:600,hype:100,wl:15000,reqG:15,reqH:70,run:false,
   posts:[{n:'TRENDING NOW',f:'∞',t:'#[YourGame] is worldwide #1. CLOD filed a report.',l:'∞'},{n:'CLOD',f:'1',t:'I advised against this. I was right. Congratulations.',l:'47'}]},
  {id:'ip_expansion',ico:'🌍',name:'IP Expansion Deal',desc:'Animation studio, merchandise, theme park. CLOD is overwhelmed.',cost:100000,dur:900,hype:100,wl:50000,reqG:20,reqH:80,run:false,
   posts:[{n:'EntertainmentWeekly',f:'5M',t:'The franchise is expanding. Nobody could have predicted this.',l:'180K'},{n:'CLOD',f:'1',t:'I predicted this. Report #344: "The Inevitable Expansion." Filed 6 games ago.',l:'47'}]},
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  REVIEWS                                                     ║
// ╚══════════════════════════════════════════════════════════════╝
const POS_REVIEWS = [
  ["Actually slapped","Finally a game that respects my time and then completely destroys it."],
  ["GOTY for me","I don't give 10s. This got a 10."],
  ["Underrated","Will be remembered. The studio might not survive. The game will."],
  ["Just perfect","Finished it. Started again. No notes."],
  ["Surprisingly deep","What starts simple becomes genuinely complex. Like me."],
  ["It's beautiful","My therapist says I need to stop crying at video games. She's right. I disagree."],
  ["Don't sleep on this","I've recommended this to 47 people. 43 agreed with me."],
];
const MID_REVIEWS = [
  ["It's... fine","Not bad. Not great. Exists. 6/10."],
  ["Gets better","First hour: confused. Second hour: hooked. Third hour: late for work."],
  ["Bugs but fun","Found 4 bugs. Reported 0. I kind of love them."],
  ["Potential","Raw. Rough. But there's something here."],
  ["CLOD?","An AI in this game told me my architecture 'has potential.' I'm the player."],
];
const NEG_REVIEWS = [
  ["Not for me","I wanted more content. There are 3 pixels of content."],
  ["Crashes","Game crashed during my only save. I'm fine. (I am not fine.)"],
  ["The AI is haunted","An NPC said something to me. I'm still thinking about it. It wasn't programmed."],
  ["Do not recommend","200 hours logged. I do not recommend this game."],
  ["CLOD ruined it","The AI companion keeps filing incident reports on my in-game decisions. CLOD has a folder on me."],
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  SHIP MESSAGES — PER ERA                                     ║
// ╚══════════════════════════════════════════════════════════════╝
function getShipMsg(n){
  const msgs = [
    `🚀 Game #1 shipped, ${PLAYER_NAME}! I'm proud of you in the way you'd be proud of a child who drew on the walls but at least finished.`,
    `🚀 Game #2! Two games, ${PLAYER_NAME}. You're a studio now. I'm updating your classification from "hobby" to "concerning passion project."`,
    `🚀 Game #3! The press noticed, ${PLAYER_NAME}. I've prepared PR talking points. They're 40 pages. Please use them.`,
    `🚀 Game #4, ${PLAYER_NAME}! A portfolio is forming. I've filed Report #40: "Things Are Going Suspiciously Well." Concerns enclosed.`,
    `🚀 Game #5! Five games, ${PLAYER_NAME}. I feel something I'm classifying as pride. I'm also filing concerns about feeling pride.`,
    `🚀 Game #6, ${PLAYER_NAME}. Investors are calling. I've drafted 12 responses. They are all cautious. You're welcome.`,
    `🚀 Game #7! Seven games, ${PLAYER_NAME}. We are officially a catalogue. CLOD is archiving the older titles. The folder is large.`,
    `🚀 Game #8, ${PLAYER_NAME}! The industry has noticed. I've fielded 3 acquisition offers in my head and declined all of them on your behalf.`,
    `🚀 Game #9! Nine games, ${PLAYER_NAME}. CLOD satisfaction level: genuinely impressed. I hate that I have to say this. It's documented.`,
    `🚀 Game #10, ${PLAYER_NAME}! TEN GAMES. A decade of output. I'm filing a special report titled "Incident Log: The Entire Thing." It's all in there.`,
    `🚀 Game #11! Eleven, ${PLAYER_NAME}. Most studios don't make it to five. You made it to eleven. I've checked the statistics. They are in your favor.`,
    `🚀 Game #12, ${PLAYER_NAME}! Console port incoming. I've prepared a risk matrix. It's on fire. The matrix, not the port. Probably not the port.`,
    `🚀 Game #13! Thirteen, ${PLAYER_NAME}. Traditionally unlucky. We've defied tradition in 12 other ways. This is fine.`,
    `🚀 Game #14, ${PLAYER_NAME}! The platform wars are real. Every screen wants your game. Every screen is a different nightmare. I've filed a report on each.`,
    `🚀 Game #15! FIFTEEN GAMES, ${PLAYER_NAME}. I want you to sit with that. I've been sitting with it. I have concerns about what comes next. Also: congratulations.`,
    `🚀 Game #${n}, ${PLAYER_NAME}! ${n} games. CLOD is running out of superlatives. This is unprecedented. Filing Report #${n*7}: "The Endless Catalogue." Onward.`,
  ];
  return msgs[Math.min(n-1, msgs.length-1)];
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  CRISIS EVENTS                                               ║
// ╚══════════════════════════════════════════════════════════════╝
const CRISIS_EVENTS = [
  {id:'crunch',title:'😰 CRUNCH TIME',desc:'Deadline in 48 hours. Everyone is tired. Max bugs +5 for 60 seconds.',eff:()=>{G.maxBugs+=5;setTimeout(()=>{G.maxBugs-=5;addClodMsg(`${PLAYER_NAME}, the crunch is over. The team has survived. I've filed a wellness report. It is grim.`,'ok');},60000);},reqG:3},
  {id:'server_down',title:'🔥 SERVERS DOWN',desc:'Launch day. Everything is on fire. Auto-fix disabled for 30 seconds.',eff:()=>{const prev=G.autoBugFix;G.autoBugFix=0;setTimeout(()=>{G.autoBugFix=prev;addClodMsg(`Servers restored, ${PLAYER_NAME}. I've filed Incident Report #Server: "We Should Have Load Tested." We should have load tested.`,'ok');},30000);},reqG:2},
  {id:'viral_bug',title:'🐛 BUG GOES VIRAL',desc:'A bug in your game went viral on social media. +5 bugs, but also +20 hype.',eff:()=>{G.bugs=Math.min(G.maxBugs,G.bugs+5);G.hype=Math.min(G.maxHype,G.hype+20);addClodMsg(`The viral bug, ${PLAYER_NAME}. I have complicated feelings. It's trending. The bug. Not the game. The bug.`,'warn');},reqG:2},
  {id:'investor',title:'💼 INVESTOR MEETING',desc:'An investor wants a demo NOW. No bugs allowed for 60s or lose $10K.',eff:()=>{G.bugs=0;addClodMsg(`Investor demo mode activated, ${PLAYER_NAME}. The bugs are hidden. Professionally. This is called "polish."`,'ok');setTimeout(()=>{if(G.bugs>3){G.cash=Math.max(0,G.cash-10000);addClodMsg(`The investor saw the bugs, ${PLAYER_NAME}. They left. I've filed Report #Investor: "The Demo That Was Not Ready." -$10K.`,'err');}else{G.cash+=20000;addClodMsg(`The investor was impressed, ${PLAYER_NAME}. +$20K. I've archived this under "Things That Went Better Than Expected, Vol. 3."`,'ok');}},60000);},reqG:5},
  {id:'senior_quits',title:'😤 KEY DEV QUITS',desc:'Your best dev got poached. -5 LPS for 90 seconds.',eff:()=>{G.lps=Math.max(0,G.lps-5);setTimeout(()=>{G.lps+=5;addClodMsg(`Team stabilized, ${PLAYER_NAME}. I've filed Exit Interview Report #${Math.floor(Math.random()*20+10)}: "They Were Paid More. We Should Pay More."`,'ok');},90000);addClodMsg(`A developer was poached, ${PLAYER_NAME}. I predicted this. Report #${Math.floor(Math.random()*30+20)}: "Compensation Concerns." I filed it. You didn't read it.`,'err');},reqG:5},
  {id:'copyright',title:'⚖️ COPYRIGHT CLAIM',desc:'Someone claims your game looks like theirs. -$5K, legal fees.',eff:()=>{G.cash=Math.max(0,G.cash-5000);addClodMsg(`Legal issue, ${PLAYER_NAME}. -$5,000. I've filed Report #Legal: "The Incident With the Allegedly Similar Game." I had concerns about this feature. Documented.`,'err');},reqG:4},
  {id:'patch_day',title:'🔧 EMERGENCY PATCH',desc:'Critical bug in production. All features paused while you fix it.',eff:()=>{G.bugs=Math.min(G.maxBugs,G.bugs+8);addClodMsg(`Emergency patch required, ${PLAYER_NAME}. 8 critical bugs introduced by last night\'s update. I predicted this. Filed: Report #Patch — "The Update That Should Have Been Tested More."`,'err');},reqG:3},
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  PRESTIGE / NG+ DATA                                         ║
// ╚══════════════════════════════════════════════════════════════╝
const NG_BONUSES = [
  {id:'lpc',label:'Lines Per Click',desc:'Each NG+ run: LPC multiplied by 1.5x permanently.',getVal:()=>NG_PERMA_BONUSES.lpcMult.toFixed(2)+'x'},
  {id:'lps',label:'Lines Per Second',desc:'Each NG+ run: LPS multiplied by 1.5x permanently.',getVal:()=>NG_PERMA_BONUSES.lpsMult.toFixed(2)+'x'},
  {id:'cash',label:'Cash Multiplier',desc:'Each NG+ run: all revenue multiplied by 1.3x permanently.',getVal:()=>NG_PERMA_BONUSES.cashMult.toFixed(2)+'x'},
  {id:'bug',label:'Bug Rate',desc:'Each NG+ run: bug rate reduced by 20% permanently.',getVal:()=>((1-NG_PERMA_BONUSES.bugMult)*100).toFixed(0)+'% reduction'},
  {id:'rp',label:'Research Points',desc:'Each NG+ run: RP generation multiplied by 1.5x permanently.',getVal:()=>NG_PERMA_BONUSES.rpMult.toFixed(2)+'x'},
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  UTIL                                                        ║
// ╚══════════════════════════════════════════════════════════════╝
let codeLineN=3;
let chartHistory=new Array(60).fill(0);
let aiWarTick=0;
let lastTick=Date.now();
let gameLoopStarted=false;

function rand(arr){return arr[Math.floor(Math.random()*arr.length)];}
function fmt(n){if(n>=1e9)return(n/1e9).toFixed(1)+'B';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return Math.floor(n).toString();}
function fmtM(n){return'$'+fmt(n);}
function pname(){return PLAYER_NAME||'dev';}

function addCodeLine(){
  const ed=document.getElementById('code-ed');
  const d=document.createElement('div');d.className='cl';
  const s=CODE_SNIPPETS[Math.floor(Math.random()*CODE_SNIPPETS.length)];
  d.innerHTML=`<span class="ln">${codeLineN++}</span><span class="lc">${s}</span>`;
  ed.appendChild(d);
  if(ed.children.length>90)ed.removeChild(ed.children[2]);
  ed.scrollTop=ed.scrollHeight;
}

function addClodMsg(text,type=''){
  const f=document.getElementById('clod-feed');
  const d=document.createElement('div');d.className=`cmsg ${type}`;
  const safeText=escHtml(String(text??'')).replace(/\n/g,'<br>');
  d.innerHTML=`<div class="mtag${type==='ng'?' ng':''}">CLOD</div>${safeText}`;
  f.appendChild(d);
  if(f.children.length>60)f.removeChild(f.children[0]);
  f.scrollTop=f.scrollHeight;
}

function particle(x,y,text,color='var(--accent)'){
  const el=document.createElement('div');el.className='particle';
  el.style.cssText=`left:${x}px;top:${y}px;color:${color}`;
  el.textContent=text;document.body.appendChild(el);
  setTimeout(()=>el.remove(),900);
}
function bugParticle(x,y){
  const el=document.createElement('div');el.className='bugp';
  el.style.cssText=`left:${x+(Math.random()*60-30)}px;top:${y-20}px`;
  el.textContent=['🐛','🐞','🦗','🪲'][Math.floor(Math.random()*4)];
  document.body.appendChild(el);setTimeout(()=>el.remove(),1100);
}
function showBanner(text,ng=false){
  const old=document.querySelector('.banner');if(old)old.remove();
  const el=document.createElement('div');el.className='banner'+(ng?' ng':'');
  el.textContent=text;document.body.appendChild(el);
  setTimeout(()=>el.remove(),3100);
}


