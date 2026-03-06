// ╔══════════════════════════════════════════════════════════════╗
// ║  CLOD MOOD SYSTEM                                           ║
// ╚══════════════════════════════════════════════════════════════╝
function moodTick(dt){
  // Mood drifts toward 50 naturally
  CLOD_MOOD += (50 - CLOD_MOOD) * 0.003 * dt;
  // Fixing bugs makes CLOD happy
  // Bugs existing make CLOD sad (already handled by events)
  // High tech debt depresses mood slowly
  if(G.techDebt > 50) CLOD_MOOD = Math.max(0, CLOD_MOOD - 0.01*(G.techDebt-50)*dt);
  // Good quality makes CLOD happy
  if(G.codeQuality > 70) CLOD_MOOD = Math.min(100, CLOD_MOOD + 0.008*dt);
  CLOD_MOOD = Math.max(0, Math.min(100, CLOD_MOOD));
  updateMoodUI();
}

function updateMoodUI(){
  const state = getClodMoodState();
  const fill = document.getElementById('mood-fill');
  const emoji = document.getElementById('mood-emoji');
  const desc = document.getElementById('mood-desc');
  if(fill){ fill.style.width = CLOD_MOOD+'%'; fill.style.background = state.color; }
  if(emoji) emoji.textContent = state.emoji;
  if(desc) desc.textContent = state.label;
}

function boostMood(amount, reason){
  CLOD_MOOD = Math.min(100, CLOD_MOOD + amount);
  updateMoodUI();
}
function drainMood(amount){
  CLOD_MOOD = Math.max(0, CLOD_MOOD - amount);
  updateMoodUI();
}

// Mood affects CLOD's message tone — inject into context
function getMoodContext(){
  const s = getClodMoodState();
  if(CLOD_MOOD < 20) return `(CLOD is in a terrible mood right now. Everything is wrong. The concern level is maximum.)`;
  if(CLOD_MOOD > 80) return `(CLOD is genuinely happy right now, which is rare and slightly alarming. CLOD is being positive but can't entirely suppress concerns.)`;
  return '';
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  COMPETITOR STUDIOS                                         ║
// ╚══════════════════════════════════════════════════════════════╝
let competitorTick = 0;
function competitorsTick(dt){
  if(G.gamesShipped === 0) return;
  competitorTick += dt;
  if(competitorTick < 3) return;
  competitorTick = 0;

  COMPETITORS.forEach(c=>{
    // Competitors progress toward shipping. Speed scales with era.
    const speed = c.baseSpeed * (0.5 + G.era * 0.15) * 3;
    c.progress = Math.min(100, c.progress + speed);
    if(c.progress >= 100){
      c.progress = 0;
      c.gamesShipped++;
      c.lastShipped = GAME_NAMES_BY_ERA[Math.min(Math.floor(c.gamesShipped/4), GAME_NAMES_BY_ERA.length-1)][c.gamesShipped % 4];
      c.shipping = true;
      setTimeout(()=>{ c.shipping=false; }, 5000);
      // If competitor genre matches player's genre — it hurts sales
      if(c.genreFocus === G.selectedGenre){
        G.salesPerHour = Math.max(0, G.salesPerHour * 0.92);
        drainMood(5);
        if(Math.random() < 0.5){
          addClodMsg(`${c.name} just shipped a ${c.genreFocus} game, ${pname()}. Direct competition. I've filed Report #Competitor-${c.gamesShipped}: "They Are In Your Lane." Adjust.`,'warn');
        }
      }
      renderCompetitors();
    }
  });
  if(competitorTick % 30 === 0) renderCompetitors();
}

function renderCompetitors(){
  const el = document.getElementById('competitor-strip');
  if(!el) return;
  el.innerHTML = '';
  COMPETITORS.forEach(c=>{
    const isThreat = c.genreFocus === G.selectedGenre;
    const d = document.createElement('div');
    d.className = 'comp-card' + (isThreat?' threat':'');
    d.innerHTML = `
      <div class="comp-name" style="color:${c.color}">${c.name}</div>
      <div class="comp-meta">${c.tagline}</div>
      <div class="comp-progress"><div class="comp-pfill" style="width:${c.progress}%;background:${c.color}"></div></div>
      <div class="comp-meta">${c.gamesShipped} games · ${c.shipping?'🚀 Shipping!':'Next: '+(100-Math.floor(c.progress))+'% away'}</div>
      <div class="comp-meta" style="color:${isThreat?'var(--danger)':'var(--muted)'}">${isThreat?'⚠️ Same genre':'Focus: '+c.genreFocus}</div>
    `;
    el.appendChild(d);
  });
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  METASCORE                                                  ║
// ╚══════════════════════════════════════════════════════════════╝
function computeMetascore(){
  if(G.gamesShipped === 0) return null;
  // Based on quality, avg rating, journalist relationships
  const journalistBonus = JOURNALISTS.reduce((s,j)=>s+(j.rel/100)*8,0); // up to +40
  const qualityComponent = G.codeQuality * 0.5; // 0–50
  const ratingComponent = G.avgRating > 0 ? (G.avgRating / 5) * 30 : 15; // 0–30
  const debtPenalty = (G.techDebt / 100) * 15; // 0–15 penalty
  const raw = Math.round(qualityComponent + ratingComponent + journalistBonus - debtPenalty);
  return Math.max(10, Math.min(100, raw));
}

function updateMetascore(){
  const score = computeMetascore();
  if(score === null) return;
  METASCORE = score;
  const el = document.getElementById('metascore-bar');
  const valEl = document.getElementById('ms-val');
  const descEl = document.getElementById('ms-desc');
  if(!el) return;
  el.style.display = 'flex';
  if(valEl){
    valEl.textContent = score;
    valEl.style.color = score>=80?'var(--accent2)':score>=60?'var(--accent)':score>=40?'var(--orange)':'var(--danger)';
  }
  const desc = score>=80?'Universal Acclaim':score>=70?'Generally Favorable':score>=55?'Mixed Reviews':score>=40?'Below Average':'Overwhelming Negative';
  if(descEl) descEl.textContent = desc;
  // Metascore affects sales passively
  G.salesPerHour = Math.max(G.salesPerHour, G.salesPerHour * (0.8 + score/500));
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  JOURNALIST RELATIONS                                       ║
// ╚══════════════════════════════════════════════════════════════╝
function journalistTick(dt){
  if(G.gamesShipped === 0) return;
  // Rel slowly decays toward 0
  JOURNALISTS.forEach(j=>{
    j.rel = Math.max(0, j.rel - 0.005 * dt);
  });
  // Random journalist coverage events
  if(Math.random() < 0.001 * dt * G.gamesShipped){
    triggerJournalistEvent();
  }
}

function triggerJournalistEvent(){
  const j = JOURNALISTS[Math.floor(Math.random()*JOURNALISTS.length)];
  const isGoodGenre = j.genres.includes(G.selectedGenre);
  const baseScore = (j.rel / 100) * 40 + (isGoodGenre ? 20 : 0) + (G.codeQuality / 100) * 30 + Math.random() * 10;
  const isPositive = baseScore > 40;
  const outlet = j.outlet;
  const reviewText = isPositive ? j.goodReview : j.badReview;
  const hypeChange = isPositive ? 15 + Math.floor(j.rel/5) : -8;
  const relChange = isPositive ? 5 : -3;

  j.rel = Math.max(0, Math.min(100, j.rel + relChange));
  j.lastReview = reviewText;
  j.lastReviewPositive = isPositive;
  G.hype = Math.max(0, Math.min(100, G.hype + hypeChange));
  if(isPositive) boostMood(8);
  else drainMood(5);

  // Push to community manager feed
  addCMEntry(`${j.icon} ${j.name} (${outlet}): "${reviewText}"`, isPositive ? 'positive' : 'negative');
  addClodMsg(`${j.name} at ${outlet} just covered your game, ${pname()}. ${isPositive ? 'Positive. Hype +'+hypeChange+'. I\'m filing it under "Evidence of Competence."' : 'Critical. Hype '+hypeChange+'. I\'ve filed their concerns alongside my own. It\'s a thick folder now.'}`,'warn');

  updateMetascore();
  renderJournalists();
}

function pitchJournalist(id){
  const j = JOURNALISTS.find(x=>x.id===id);
  if(!j) return;
  const cost = 500 + (G.gamesShipped * 200);
  if(G.cash < cost){ addClodMsg(`Can't afford to pitch ${j.name}, ${pname()}. That requires ${fmtM(cost)}. CLOD is judging.`,'warn'); return; }
  G.cash -= cost;
  j.rel = Math.min(100, j.rel + 12);
  boostMood(3);
  addClodMsg(`Pitch sent to ${j.name}, ${pname()}. ${fmtM(cost)} spent on relationship building. I filed Report #PR-${j.id}: "The Outreach." Expected ROI: unclear. Expected CLOD concerns: several.`,'ok');
  renderJournalists();
  updateUI();
}

function renderJournalists(){
  const el = document.getElementById('journalist-grid');
  if(!el) return;
  el.innerHTML = '';
  JOURNALISTS.forEach(j=>{
    const rel = Math.floor(j.rel);
    const isFriend = rel >= 60;
    const isEnemy = rel <= 20 && j.lastReview;
    const relColor = rel>=60?'var(--accent2)':rel>=30?'var(--clod)':'var(--danger)';
    const pitchCost = 500 + (G.gamesShipped * 200);
    const d = document.createElement('div');
    d.className = 'jcard' + (isFriend?' friend':isEnemy?' enemy':'');
    d.innerHTML = `
      <div class="jcard-name">${j.icon} ${j.name}</div>
      <div class="jcard-outlet">${j.outlet} · Covers: ${j.genres.join(', ')}</div>
      <div class="jcard-rel"><div class="jcard-rfill" style="width:${rel}%;background:${relColor}"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.15rem">
        <span style="font-size:.5rem;color:${relColor}">${rel}% rapport</span>
        <button onclick="pitchJournalist('${j.id}')" style="font-size:.48rem;padding:1px 6px;border-radius:3px;cursor:pointer;border:1px solid var(--clod);background:transparent;color:var(--clod);font-family:'JetBrains Mono',monospace">${fmtM(pitchCost)} Pitch</button>
      </div>
      ${j.lastReview?`<div class="jcard-last">"${j.lastReview.substring(0,55)}..."</div>`:'<div class="jcard-last">No coverage yet</div>'}
    `;
    el.appendChild(d);
  });
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  COMMUNITY MANAGER                                          ║
// ╚══════════════════════════════════════════════════════════════╝
function addCMEntry(text, type=''){
  const feed = document.getElementById('cm-feed');
  if(!feed) return;
  if(feed.children.length===1 && feed.children[0].textContent.includes('Hire')) feed.innerHTML='';
  const d = document.createElement('div');
  d.className = 'cm-entry' + (type?' '+type:'');
  d.textContent = text;
  feed.insertBefore(d, feed.firstChild);
  if(feed.children.length > 20) feed.removeChild(feed.lastChild);
  // Update badge
  const badge = document.getElementById('cm-badge');
  if(badge) badge.style.display='inline';
}

function hasCommunityManager(){
  return G.workers.some(w=>w.isCM);
}

// Community manager responds to negative reviews automatically
function cmTick(dt){
  if(!hasCommunityManager()) return;
  if(Math.random() < 0.002*dt && G.totalRatings > 0 && G.avgRating < 3.5){
    const responses = [
      `We hear your feedback and we're working on it. A patch is in progress.`,
      `Thank you for the report — this has been escalated to our dev team.`,
      `We appreciate your patience. An update addressing this is coming soon.`,
      `This is a known issue. Fix is deployed in v1.0.${G.gamesShipped+1}. Sorry for the trouble.`,
    ];
    const r = responses[Math.floor(Math.random()*responses.length)];
    addCMEntry(`💬 CM responded to negative review: "${r}"`, 'positive');
    G.avgRating = Math.min(5, G.avgRating + 0.05); // Small reputation repair
    boostMood(2);
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  STEAM SALE EVENTS                                          ║
// ╚══════════════════════════════════════════════════════════════╝
let steamSaleCooldown = 0;
function steamSaleTick(dt){
  if(G.gamesShipped === 0) return;
  steamSaleCooldown = Math.max(0, steamSaleCooldown - dt);
  if(steamSaleCooldown > 0 || STEAM_SALE_ACTIVE) return;
  // Random sale events, more frequent in later eras
  if(Math.random() < 0.00015 * dt * G.era){
    triggerSteamSale();
  }
}

function triggerSteamSale(){
  const saleNames = ['Steam Summer Sale','Winter Sale','Autumn Sale','Midweek Madness','Publisher Spotlight','Weekend Deal'];
  const saleName = saleNames[Math.floor(Math.random()*saleNames.length)];
  steamSalePending = saleName;
  // Show modal
  const modal = document.getElementById('steam-sale-modal');
  document.getElementById('steam-sale-desc').textContent = `${saleName} is live on Steam. Discounting "${G.currentGameName}" could drive volume. CLOD has opinions. You will hear them regardless of your choice.`;
  const choicesEl = document.getElementById('steam-sale-choices');
  choicesEl.innerHTML = '';
  STEAM_SALE_OPTIONS.forEach(opt=>{
    const d = document.createElement('div');
    d.className = 'modal-choice';
    d.innerHTML = `<div class="modal-choice-title">${opt.label} ${opt.pct>0?'('+opt.pct+'% off)':''}</div><div class="modal-choice-desc">${opt.note} · Sales ×${opt.salesMult.toFixed(1)}</div>`;
    d.onclick = ()=>applySteamSale(opt);
    choicesEl.appendChild(d);
  });
  if(modal) modal.style.display='flex';
  addClodMsg(`${saleName} incoming, ${pname()}. I've prepared a discount analysis. It is 22 pages. The summary: it depends.`,'warn');
}

function applySteamSale(opt){
  const modal = document.getElementById('steam-sale-modal');
  if(modal) modal.style.display='none';
  STEAM_SALE_ACTIVE = true;
  STEAM_SALE_DISCOUNT = opt.pct;
  steamSaleCooldown = 180; // 3 minutes before next sale
  const duration = 45; // 45 seconds of boosted sales
  const prevSPH = G.salesPerHour;
  G.salesPerHour *= opt.salesMult;
  G.gamePrice *= (1 - opt.pct/100);
  if(opt.pct >= 50) drainMood(10);
  if(opt.pct >= 75) drainMood(15);
  showBanner(`🛒 ${steamSalePending}: ${opt.label}! ×${opt.salesMult.toFixed(1)} sales for ${duration}s!`);
  addClodMsg(opt.pct === 0
    ? `No discount, ${pname()}. Principled. I respect it. The customers who were already buying will keep buying. Filed under: "Standing Firm."`
    : `${opt.pct}% discount applied, ${pname()}. Sales multiplier: ${opt.salesMult.toFixed(1)}x. Revenue per unit: ${fmtM(G.gamePrice)}. I've updated the incident log.`,'ok');
  if(opt.pct >= 50) G.hype = Math.min(100, G.hype+30);
  setTimeout(()=>{
    STEAM_SALE_ACTIVE = false;
    G.salesPerHour = prevSPH;
    G.gamePrice /= (1 - opt.pct/100);
    STEAM_SALE_DISCOUNT = 0;
    addClodMsg(`Sale ended, ${pname()}. Revenue normalized. I've filed Report #Sale-${G.gamesShipped}: "The Results." They are ${opt.pct >= 25 ? 'compelling.' : 'fine.'}`,'ok');
  }, duration * 1000);
}

function dismissSteamSale(){
  const modal = document.getElementById('steam-sale-modal');
  if(modal) modal.style.display='none';
  steamSaleCooldown = 120;
  addClodMsg(`Sale skipped, ${pname()}. I've noted this as "Missed Opportunity #${G.gamesShipped}." We move on.`,'warn');
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  TECH DEBT PAYDOWN                                          ║
// ╚══════════════════════════════════════════════════════════════╝
function paydownDebt(){
  if(G.techDebt <= 0) return;
  const cost = Math.ceil(G.techDebt * 800 * (1 + G.gamesShipped * 0.1));
  if(G.cash < cost){
    addClodMsg(`Not enough cash to refactor, ${pname()}. Costs ${fmtM(cost)}. The debt compounds. I've noted this.`,'warn');
    return;
  }
  G.cash -= cost;
  const reduced = Math.floor(G.techDebt * 0.5);
  G.techDebt = Math.max(0, G.techDebt - reduced);
  G.codeQuality = Math.min(100, G.codeQuality + 10);
  boostMood(12);
  addClodMsg(`Refactor complete, ${pname()}. Tech debt reduced by ${reduced}%. Cost: ${fmtM(cost)}. Quality improved. I'm filing Report #Refactor: "The Cleanup." It's genuinely positive. Rare.`,'ok');
  showBanner(`🔧 Refactored! Tech debt -${reduced}%`);
  updateQualityUI();
  updateUI();
}

function updateDebtPaydownBtn(){
  const btn = document.getElementById('debt-paydown-btn');
  if(!btn) return;
  const cost = Math.ceil(G.techDebt * 800 * (1 + G.gamesShipped * 0.1));
  btn.textContent = `Refactor ${fmtM(cost)}`;
  btn.disabled = G.techDebt <= 0 || G.cash < cost;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  PRESTIGE ARTIFACTS                                         ║
// ╚══════════════════════════════════════════════════════════════╝
function selectArtifact(id){
  CHOSEN_ARTIFACT = id;
  renderArtifacts();
  const art = PRESTIGE_ARTIFACTS.find(a=>a.id===id);
  addClodMsg(`Artifact selected: "${art.name}", ${pname()}. Wise choice. Or reckless. Filed either way.`,'ng');
}

function renderArtifacts(){
  const el = document.getElementById('artifact-grid');
  if(!el) return;
  const ng = NG_RUN > 0;
  el.innerHTML = '';
  PRESTIGE_ARTIFACTS.forEach(a=>{
    const isOwned = ACTIVE_ARTIFACT === a.id;
    const isChosen = CHOSEN_ARTIFACT === a.id;
    const isLocked = !ng; // artifacts only available from NG+1 onward
    const d = document.createElement('div');
    d.className = 'art-card' + (isOwned?' art-owned':'') + (isLocked?' art-locked':'') + (isChosen&&!isOwned?' art-chosen':'');
    if(isChosen&&!isOwned) d.style.borderColor='var(--purple)';
    d.innerHTML = `
      <div class="art-ico">${a.ico}</div>
      <div class="art-name">${a.name}</div>
      <div class="art-desc">${a.desc}</div>
      <div style="font-size:.52rem;margin-top:.3rem;color:${isOwned?'var(--accent2)':isChosen?'var(--purple)':'var(--muted)'}">${isOwned?'✓ Active this run':isChosen?'✓ Selected for next run':'Click to select'}</div>
    `;
    if(!isLocked && !isOwned) d.onclick=()=>selectArtifact(a.id);
    el.appendChild(d);
  });
  if(!ng){
    const note = document.createElement('div');
    note.style.cssText='font-size:.58rem;color:var(--muted);grid-column:1/-1;text-align:center;padding:.5rem';
    note.textContent='Artifacts unlock on your first NG+ prestige. Complete this run first.';
    el.appendChild(note);
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  CLOD UPGRADE TREE                                          ║
// ╚══════════════════════════════════════════════════════════════╝
function buyCLODUpgrade(id){
  const upg = CLOD_UPGRADES.find(u=>u.id===id);
  if(!upg) return;
  if(UNLOCKED_CLOD_UPGRADES.includes(id)) return;
  if(NG_TOKENS < upg.cost){ addClodMsg(`Not enough NG Tokens for "${upg.name}", ${pname()}. Need ${upg.cost}, have ${NG_TOKENS}. Prestige more.`,'warn'); return; }
  if(upg.req && !UNLOCKED_CLOD_UPGRADES.includes(upg.req)){ addClodMsg(`Prerequisite not met for "${upg.name}", ${pname()}. Unlock "${CLOD_UPGRADES.find(u=>u.id===upg.req)?.name}" first.`,'warn'); return; }
  if(upg.reqRun > NG_RUN){ addClodMsg(`"${upg.name}" requires NG+ Run ${upg.reqRun}, ${pname()}. Current run: ${NG_RUN}.`,'warn'); return; }
  NG_TOKENS -= upg.cost;
  UNLOCKED_CLOD_UPGRADES.push(id);
  upg.eff();
  document.getElementById('h-ngt').textContent=NG_TOKENS;
  showBanner(`🤖 CLOD Upgrade: ${upg.name}`);
  renderCLODTree();
}

function renderCLODTree(){
  const el = document.getElementById('clod-tree');
  if(!el) return;
  el.innerHTML = '';
  CLOD_UPGRADES.forEach(u=>{
    const isDone = UNLOCKED_CLOD_UPGRADES.includes(u.id);
    const prereqDone = !u.req || UNLOCKED_CLOD_UPGRADES.includes(u.req);
    const runOk = u.reqRun <= NG_RUN;
    const canAfford = NG_TOKENS >= u.cost;
    const isLocked = !prereqDone || !runOk;
    const canBuy = !isDone && !isLocked && canAfford;
    const d = document.createElement('div');
    d.className = 'ctree-node' + (isDone?' ct-done':isLocked?' ct-locked':canBuy?' ct-active':'');
    d.innerHTML = `
      <div class="ct-header">
        <span class="ct-ico">${u.ico}</span>
        <span class="ct-name">${u.name}</span>
        <span class="ct-cost">${isDone?'✓ Unlocked':isLocked?`🔒 NG+${u.reqRun}`:`${u.cost} NGT`}</span>
      </div>
      <div class="ct-desc">${u.desc}</div>
    `;
    if(canBuy) d.onclick=()=>buyCLODUpgrade(u.id);
    el.appendChild(d);
  });
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  HIRING NEGOTIATION                                         ║
// ╚══════════════════════════════════════════════════════════════╝
let pendingHireId = null;

function openHireNegotiation(id){
  const spec = HIREABLE.find(h=>h.id===id);
  if(!spec) return;
  if(G.workers.find(w=>w.specId===id)){ addClodMsg(`${spec.name} is already on the team, ${pname()}.`,'warn'); return; }
  if(G.gamesShipped < spec.reqG){ addClodMsg(`${spec.name} requires ${spec.reqG} games shipped.`,'warn'); return; }
  pendingHireId = id;
  document.getElementById('neg-title').textContent = `💼 ${spec.name} — Hiring Negotiation`;
  document.getElementById('neg-quote').textContent = spec.quote || '"What are you offering?"';
  const opts = document.getElementById('neg-options');
  opts.innerHTML='';
  // Generate 3 negotiation options
  const baseCost = spec.cost;
  const options = [
    {
      label:'Accept Demands',
      desc:`Pay full asking price of ${fmtM(baseCost)}. They start immediately, in a good mood.`,
      cost: baseCost,
      moraleBonus: 20,
      salaryMod: 1.0,
    },
    {
      label:'Counter-Offer',
      desc:`Negotiate to ${fmtM(baseCost*0.75)}. They accept with slight annoyance. Starting morale: neutral.`,
      cost: Math.ceil(baseCost*0.75),
      moraleBonus: 0,
      salaryMod: 0.9,
    },
    {
      label:'Low-Ball (Risky)',
      desc:`Offer ${fmtM(baseCost*0.5)}. 60% chance they accept grumpily, 40% they walk.`,
      cost: Math.ceil(baseCost*0.5),
      moraleBonus: -20,
      salaryMod: 0.75,
      risky: true,
    },
  ];
  // If player has arrogant devs on team and this is an AI hire — add tension option
  const hasArrogant = G.workers.some(w=>w.type==='arrogant');
  if(hasArrogant && spec.type === 'ai'){
    options.push({
      label:'"Chad approved this" (Lie)',
      desc:`Tell them the senior devs support the hire. 50% chance of instant drama.`,
      cost: baseCost,
      moraleBonus: -10,
      salaryMod: 1.0,
      drama: true,
    });
  }
  options.forEach(opt=>{
    const d = document.createElement('div');
    d.className = 'neg-opt';
    d.innerHTML = `<div class="neg-opt-label">${opt.label}</div><div style="color:var(--muted);font-size:.6rem">${opt.desc}</div>`;
    d.onclick=()=>resolveNegotiation(id, opt);
    opts.appendChild(d);
  });
  document.getElementById('neg-modal').style.display='flex';
}

function resolveNegotiation(id, opt){
  document.getElementById('neg-modal').style.display='none';
  const spec = HIREABLE.find(h=>h.id===id);
  if(!spec) return;
  // Risky: may walk
  if(opt.risky && Math.random()<0.4){
    addClodMsg(`${spec.name} rejected the low-ball offer, ${pname()}. They walked. I've filed Report #HR-${id}: "The Negotiation That Wasn't." Lesson: people have leverage too.`,'err');
    showBanner(`❌ ${spec.name} walked away!`);
    pendingHireId=null;
    return;
  }
  // Drama: may cause existing team issues
  if(opt.drama && Math.random()<0.5){
    addClodMsg(`The lie about Chad supporting the hire has been discovered, ${pname()}. Existing team morale -10. I predicted this. It's in Report #HR-Drama.`,'err');
    G.workers.forEach(w=>{ if(w.morale!==undefined) w.morale=Math.max(0,w.morale-10); });
  }
  // Execute hire with modified terms
  const modifiedSpec = {...spec, cost: opt.cost, salary: Math.ceil(spec.salary * opt.salaryMod)};
  if(G.cash < opt.cost){ addClodMsg(`Not enough cash after negotiation. Need ${fmtM(opt.cost)}.`,'err'); pendingHireId=null; return; }
  G.cash -= opt.cost;
  const w = {...modifiedSpec, specId:id, wid:G.nextWorkerId++, actionTimer:0, lastAction:spec.actions[0], morale:75+opt.moraleBonus};
  G.workers.push(w);
  G.lps+=w.lps||0; G.lpc+=w.lpc||0; G.bugRate*=(w.bugMod||1); G.autoBugFix+=(w.autoBug||0);
  if(w.isCTO) G.lps*=1.5;
  addClodMsg(`${w.name} joined for ${fmtM(opt.cost)}, ${pname()}. ${opt.moraleBonus>0?'They arrived in good spirits.':opt.moraleBonus<0?'They arrived with noted reservations.':'They arrived.'} I've updated the team model.`,'ok');
  showBanner(`👋 ${w.name} hired for ${fmtM(opt.cost)}!`);
  boostMood(5);
  renderTeam();updateUI();
  pendingHireId=null;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  CROSS-RUN CLOD MEMORY                                      ║
// ╚══════════════════════════════════════════════════════════════╝
function recordRunHistory(){
  NG_RUN_HISTORY.push({
    run: NG_RUN,
    games: G.gamesShipped,
    revenue: G.totalRevenue,
    topGenre: G.selectedGenre,
    bestGame: G.portfolio.length>0 ? G.portfolio.reduce((b,g)=>g.quality>b.quality?g:b).name : 'None',
    avgQuality: G.portfolio.length>0 ? Math.floor(G.portfolio.reduce((s,g)=>s+g.quality,0)/G.portfolio.length) : 0,
    bugsFixed: G.bugsFixed,
    maxTechDebt: G.techDebt,
  });
}

function getCrossRunMemoryMsg(){
  if(NG_RUN_HISTORY.length === 0) return '';
  const prev = NG_RUN_HISTORY[NG_RUN_HISTORY.length-1];
  const msgs = [
    `I recall Run ${prev.run}, ${pname()}. ${prev.games} games. ${fmtM(prev.revenue)} revenue. Best game: "${prev.bestGame}". I have notes. They filled a second binder.`,
    `Last run you favored ${prev.topGenre} games, ${pname()}. Average quality: ${prev.avgQuality}%. I've benchmarked this run against that. You're already ${G.codeQuality > prev.avgQuality ? 'ahead' : 'behind'}.`,
    `${prev.bugsFixed} bugs fixed in Run ${prev.run}, ${pname()}. I kept count. I keep all counts. The spreadsheet has ${NG_RUN_HISTORY.length} tabs.`,
    `I remember "${prev.bestGame}", ${pname()}. Your best game from Run ${prev.run}. Quality ${prev.avgQuality}%. Whether this run surpasses it remains to be seen. I have filed a prediction. It is sealed.`,
  ];
  if(NG_RUN_HISTORY.length > 1){
    const first = NG_RUN_HISTORY[0];
    msgs.push(`Your first game ever, ${pname()}: Run ${first.run}. ${first.games} games. ${fmtM(first.revenue)} earned. You've grown. The folder has grown with you.`);
  }
  return msgs[Math.floor(Math.random()*msgs.length)];
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  REGIONAL SALES                                             ║
// ╚══════════════════════════════════════════════════════════════╝
const REGIONS = [
  {id:'na',    label:'🇺🇸 NA',     color:'#7cacf8', basePct:35, topicBonus:{sports:15,city:10,zombie:8},       genreBonus:{action:10,platformer:8}},
  {id:'eu',    label:'🇪🇺 EU',     color:'#4af0a0', basePct:28, topicBonus:{medieval:15,fantasy:10,scifi:8},   genreBonus:{strategy:12,rpg:8,puzzle:10}},
  {id:'asia',  label:'🌏 Asia',    color:'#f0c040', basePct:22, topicBonus:{scifi:12,city:10,fantasy:8},        genreBonus:{rpg:15,sim:10,cozy:12}},
  {id:'latam', label:'🌎 LatAm',   color:'#f78c6c', basePct:8,  topicBonus:{zombie:10,sports:8,horror:6},       genreBonus:{action:12,horror:8}},
  {id:'row',   label:'🌍 RoW',     color:'#c792ea', basePct:7,  topicBonus:{farm:10,cozy:8,space:6},            genreBonus:{cozy:10,puzzle:8,sim:6}},
];

// Runtime regional revenue (updated on each sales tick)
let G_REGIONAL = {na:0, eu:0, asia:0, latam:0, row:0};
let G_REGIONAL_TOTAL = 0;

function getRegionMultiplier(region){
  // Base pct + topic bonus + genre bonus
  let pct = region.basePct;
  pct += (region.topicBonus[G.selectedTopic] || 0);
  pct += (region.genreBonus[G.selectedGenre] || 0);
  return pct;
}

function getRegionWeights(){
  const raw = REGIONS.map(r => ({id:r.id, w: getRegionMultiplier(r)}));
  const total = raw.reduce((s,r) => s+r.w, 0);
  return raw.map(r => ({...r, pct: r.w/total}));
}

function regionalSalesTick(earned){
  if(earned <= 0) return;
  const weights = getRegionWeights();
  G_REGIONAL_TOTAL += earned;
  weights.forEach(r => {
    G_REGIONAL[r.id] = (G_REGIONAL[r.id] || 0) + earned * r.pct;
  });
}

function renderRegionalSales(){
  const el = document.getElementById('regional-panel');
  if(!el) return;
  if(G.gamesShipped === 0){
    el.innerHTML='<div style="font-size:.58rem;color:var(--muted);text-align:center;padding:.3rem">Ship a game to see regional breakdown.</div>';
    return;
  }
  const weights = getRegionWeights();
  const maxPct = Math.max(...weights.map(r=>r.pct));
  el.innerHTML = `<div class="reg-title"><span>Region</span><span>Revenue</span><span>Share</span></div>` +
    REGIONS.map(r => {
      const w = weights.find(x=>x.id===r.id);
      const pct = w ? w.pct : r.basePct/100;
      const rev = G_REGIONAL[r.id] || 0;
      const barW = maxPct > 0 ? (pct/maxPct)*100 : 0;
      return `<div class="reg-row">
        <span class="reg-label">${r.label}</span>
        <div class="reg-bar-wrap"><div class="reg-fill" style="width:${barW}%;background:${r.color}"></div></div>
        <span class="reg-val" style="color:${r.color}">${fmtM(rev)}</span>
        <span class="reg-pct">${Math.round(pct*100)}%</span>
      </div>`;
    }).join('');
  const badge = document.getElementById('reg-total-badge');
  if(badge){ badge.style.display='inline'; badge.textContent=fmtM(G_REGIONAL_TOTAL)+' total'; }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  INFLUENCER TIERS                                           ║
// ╚══════════════════════════════════════════════════════════════╝
// 3 tiers: free (anyone), partner (unlocked at hype threshold), mega (unlocked at games milestone)
// Each influencer has XP that fills from campaigns and random posts; leveling up unlocks perks.

const INFLUENCER_ROSTER = [
  {id:'xprogamer',  ava:'🎮', name:'xXProGamer99Xx',  platform:'Twitch',  followers:'4.2M', genres:['action','horror','platformer'],
   xp:0, tier:'free', xpToPartner:500, xpToMega:2000,
   partnerPerk:'Campaigns targeting action/horror give +50% hype', megaPerk:'Auto-posts 3x/week; +3 wishlists/s',
   partnerEff:()=>{ G_INF_BONUSES.actionHypeBoost=1.5; },
   megaEff:()=>{ G.wishlists += 0; /* handled in tick */ G_INF_BONUSES.xprogamerAutoPost=true; }},
  {id:'retrodev',   ava:'💾', name:'RetroDevGal',      platform:'YouTube', followers:'820K',  genres:['rpg','puzzle','sim'],
   xp:0, tier:'free', xpToPartner:400, xpToMega:1600,
   partnerPerk:'RPG/puzzle/sim games get +30% wishlist conversion', megaPerk:'Dedicated review video on each launch',
   partnerEff:()=>{ G_INF_BONUSES.rpgWishlistBoost=1.3; },
   megaEff:()=>{ G_INF_BONUSES.retrodevReviewBoost=1.4; }},
  {id:'casualfran',ava:'☕', name:'CasualGamer_Fran',  platform:'TikTok',  followers:'3.1M',  genres:['cozy','sim','puzzle'],
   xp:0, tier:'free', xpToPartner:600, xpToMega:2400,
   partnerPerk:'Cozy/sim games get +40% hype from campaigns', megaPerk:'Viral clip chance on every ship (+20 hype burst)',
   partnerEff:()=>{ G_INF_BONUSES.cozyHypeBoost=1.4; },
   megaEff:()=>{ G_INF_BONUSES.casualViralChance=0.3; }},
  {id:'giantbrain', ava:'🧠', name:'GiantBrainGames',  platform:'YouTube', followers:'1.8M',  genres:['strategy','rpg','sim'],
   xp:0, tier:'free', xpToPartner:450, xpToMega:1800,
   partnerPerk:'Strategy/RPG/sim get +25% MetaScore weighting', megaPerk:'Essay video multiplies sales 1.5× for 60s on launch',
   partnerEff:()=>{ G_INF_BONUSES.strategyMetaBoost=1.25; },
   megaEff:()=>{ G_INF_BONUSES.giantbrainLaunchBoost=1.5; }},
  {id:'speedrun',   ava:'⚡', name:'SpeedRunQueen',     platform:'Twitch',  followers:'950K',  genres:['platformer','action','puzzle'],
   xp:0, tier:'free', xpToPartner:350, xpToMega:1400,
   partnerPerk:'-15% tech debt accumulation (speedrunners find every shortcut)', megaPerk:'Any bug goes viral as a feature; +10 hype per bug shipped',
   partnerEff:()=>{ G_INF_BONUSES.techDebtReduction=0.85; },
   megaEff:()=>{ G_INF_BONUSES.bugViralBoost=10; }},
];

// Active bonuses from influencer tiers
let G_INF_BONUSES = {
  actionHypeBoost: 1,
  rpgWishlistBoost: 1,
  cozyHypeBoost: 1,
  strategyMetaBoost: 1,
  techDebtReduction: 1,
  giantbrainLaunchBoost: 1,
  casualViralChance: 0,
  bugViralBoost: 0,
  retrodevReviewBoost: 1,
  xprogamerAutoPost: false,
};

function getInfluencerHypeMultiplier(){
  // Apply genre-specific hype bonuses from partner/mega influencers
  let mult = 1;
  if(['action','horror','platformer'].includes(G.selectedGenre)) mult *= G_INF_BONUSES.actionHypeBoost;
  if(['rpg','puzzle','sim'].includes(G.selectedGenre)) mult *= G_INF_BONUSES.rpgWishlistBoost;
  if(['cozy','sim'].includes(G.selectedGenre)) mult *= G_INF_BONUSES.cozyHypeBoost;
  return mult;
}

function addInfluencerXP(infId, amount){
  const inf = INFLUENCER_ROSTER.find(i=>i.id===infId);
  if(!inf) return;
  inf.xp = Math.min(inf.xpToMega, inf.xp + amount);
  // Check tier upgrades
  if(inf.tier === 'free' && inf.xp >= inf.xpToPartner && G.gamesShipped >= 3){
    inf.tier = 'partner';
    inf.partnerEff();
    showBanner(`🤝 ${inf.name} is now a Partner!`);
    addClodMsg(`${inf.name} has reached Partner tier, ${pname()}. Perk active: ${inf.partnerPerk}. I've filed this under "Things That Actually Help."`, 'ok');
    boostMood(8);
  } else if(inf.tier === 'partner' && inf.xp >= inf.xpToMega && G.gamesShipped >= 8){
    inf.tier = 'mega';
    inf.megaEff();
    showBanner(`⭐ ${inf.name} reached MEGA tier!`);
    addClodMsg(`${inf.name} is now MEGA tier, ${pname()}. ${inf.megaPerk}. I've filed this under "Unexpected Windfalls, Vol. ${NG_RUN+1}."`, 'ng');
    boostMood(15);
  }
}

function influencerTick(dt){
  // XP accumulates passively with hype; faster when posting
  INFLUENCER_ROSTER.forEach(inf=>{
    if(inf.tier==='free') return; // free tier doesn't auto-accumulate, only via campaigns
    const xpRate = (inf.tier==='partner' ? 0.5 : 1.2) * dt;
    addInfluencerXP(inf.id, xpRate);
  });
  // Mega-tier auto-post (xprogamer)
  if(G_INF_BONUSES.xprogamerAutoPost && Math.random() < 0.002*dt){
    spawnInf({n:'xXProGamer99Xx', f:'4.2M', t:`Still playing this. It's been ${G.gamesShipped} games. CLOD said hi.`, l:fmt(Math.floor(Math.random()*20000+5000))});
    G.wishlists += 5;
  }
  // Tech debt reduction from SpeedRunQueen partner perk
  if(G_INF_BONUSES.techDebtReduction < 1){
    G.techDebt = Math.max(0, G.techDebt - 0.002 * dt); // extra decay
  }
  // Bug viral boost from SpeedRunQueen mega perk
  if(G_INF_BONUSES.bugViralBoost > 0 && G.bugs > 0 && Math.random() < 0.0005*dt){
    G.hype = Math.min(100, G.hype + G_INF_BONUSES.bugViralBoost * 0.1);
  }
  if(G.tickCount % 180 === 0) renderInfluencers();
}

// Called from spawnInf / campaign completions — give XP to relevant influencers
function awardCampaignInfluencerXP(genreFocus){
  INFLUENCER_ROSTER.forEach(inf=>{
    const isRelevant = inf.genres.includes(genreFocus || G.selectedGenre);
    addInfluencerXP(inf.id, isRelevant ? 40 : 10);
  });
}

function pitchInfluencer(id){
  const inf = INFLUENCER_ROSTER.find(i=>i.id===id);
  if(!inf) return;
  const cost = inf.tier==='free' ? 800 : inf.tier==='partner' ? 2000 : 5000;
  if(G.cash < cost){ addClodMsg(`Not enough cash to pitch ${inf.name}, ${pname()}. Need ${fmtM(cost)}.`,'warn'); return; }
  G.cash -= cost;
  const xpGain = inf.tier==='free' ? 120 : 80;
  addInfluencerXP(inf.id, xpGain);
  G.hype = Math.min(100, G.hype + 8);
  const post = {n:inf.name, f:inf.followers, t:`Just tried "${G.currentGameName||'this new indie game'}". Actually really solid. #indie #gamedev`, l:fmt(Math.floor(Math.random()*15000+2000))};
  spawnInf(post);
  addClodMsg(`Pitched ${inf.name} for ${fmtM(cost)}, ${pname()}. XP +${xpGain}. Post went live. Hype +8. I'm monitoring the comments. There are already concerns.`,'ok');
  updateUI();
  renderInfluencers();
}

function renderInfluencers(){
  const el = document.getElementById('inf-tier-panel');
  if(!el) return;
  el.innerHTML='';
  INFLUENCER_ROSTER.forEach(inf=>{
    const xp = inf.xp;
    const toNext = inf.tier==='free' ? inf.xpToPartner : inf.tier==='partner' ? inf.xpToMega : inf.xpToMega;
    const progPct = Math.min(100, (xp/toNext)*100);
    const tierColor = inf.tier==='mega'?'var(--purple)':inf.tier==='partner'?'var(--accent)':'var(--muted)';
    const pitchCost = inf.tier==='free' ? 800 : inf.tier==='partner' ? 2000 : 5000;
    const canPitch = G.cash >= pitchCost && G.gamesShipped > 0;
    const d = document.createElement('div');
    d.className = `inf-card tier-${inf.tier}`;
    d.innerHTML = `
      <div class="inf-header">
        <span class="inf-ava">${inf.ava}</span>
        <span class="inf-name">${inf.name}</span>
        <span class="inf-tier-badge ${inf.tier}">${inf.tier.toUpperCase()}</span>
      </div>
      <div style="font-size:.5rem;color:var(--muted);margin:.1rem 0">${inf.platform} · ${inf.followers} · covers: ${inf.genres.join(', ')}</div>
      <div class="inf-prog-wrap">
        <div class="inf-prog-bar"><div class="inf-prog-fill" style="width:${progPct}%;background:${tierColor}"></div></div>
      </div>
      <div class="inf-meta">
        <span>${inf.tier==='mega'?'✓ Max tier':`${Math.floor(xp)}/${toNext} XP to ${inf.tier==='free'?'Partner':'Mega'}`}</span>
        <span style="color:${tierColor}">${inf.tier==='free'?inf.partnerPerk.substring(0,30)+'...':inf.tier==='partner'?'✓ '+inf.partnerPerk.substring(0,25)+'...':'⭐ '+inf.megaPerk.substring(0,22)+'...'}</span>
      </div>
      ${inf.tier!=='mega'?`<button class="inf-action-btn" onclick="pitchInfluencer('${inf.id}')" ${canPitch?'':'disabled'}>📩 Pitch ${fmtM(pitchCost)}</button>`:'<div style="font-size:.5rem;color:var(--purple);margin-top:.2rem">⭐ Mega perks active</div>'}
    `;
    el.appendChild(d);
  });
  // Partner badge count
  const partnerCount = INFLUENCER_ROSTER.filter(i=>i.tier!=='free').length;
  const badge = document.getElementById('inf-partner-badge');
  if(badge) badge.textContent = partnerCount > 0 ? `${partnerCount} partner${partnerCount>1?'s':''}` : '';
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  PATENTS + ENGINE BUILDING                                  ║
// ╚══════════════════════════════════════════════════════════════╝
const ENGINE_PROJECTS = [
  {id:'clod_engine',    name:'CLOD Engine v1',      ico:'🤖', desc:'Proprietary engine with CLOD integration. Reduces bugs, enables patents.',
   cost:5000, rpCost:150, reqG:3, buildTime:90, progress:0, built:false, building:false,
   eff:()=>{ G.bugRate*=0.75; G.lps+=5; },
   patent:{name:'Contextual AI Compilation',  desc:'Royalty from studios using CLOD-style AI. +$200/s.',  income:200,  duration:300}},
  {id:'render_engine',  name:'RenderForge',          ico:'🎨', desc:'Custom rendering pipeline. Superior graphics demand + patent income.',
   cost:15000, rpCost:250, reqG:6, buildTime:120, progress:0, built:false, building:false,
   eff:()=>{ G.demand.graphics=Math.min(100,G.demand.graphics+30); G.lpc+=5; },
   patent:{name:'Adaptive Shader Architecture', desc:'Industry license fee. +$500/s.',              income:500,  duration:600}},
  {id:'netcode_engine', name:'GhostNet',              ico:'🌐', desc:'Low-latency netcode. Multiplayer demand explodes. License it.',
   cost:25000, rpCost:350, reqG:9, buildTime:150, progress:0, built:false, building:false,
   eff:()=>{ G.demand.multiplayer=Math.min(100,G.demand.multiplayer+50); },
   patent:{name:'Ghost Sync Protocol',          desc:'Every online game pays you a cut. +$1,200/s.',  income:1200, duration:900}},
  {id:'narrative_ai',   name:'NarrativeCore AI',      ico:'📖', desc:'AI-driven story system. Story demand maxed. CLOD helped design it reluctantly.',
   cost:40000, rpCost:500, reqG:14, buildTime:180, progress:0, built:false, building:false,
   eff:()=>{ G.demand.story=100; G.lps+=20; },
   patent:{name:'Dynamic Story Patent',         desc:'Narrative games license your tech. +$2,500/s.', income:2500, duration:1200}},
  {id:'quantum_core',   name:'Quantum Game Core',     ico:'🔮', desc:'[NG+] Inexplicable performance. Nobody knows. CLOD filed a report about not knowing.',
   cost:200000, rpCost:1000, reqG:0, buildTime:300, progress:0, built:false, building:false, ng:true,
   eff:()=>{ G.lps*=3; G.lpc*=2; G.bugRate*=0.3; },
   patent:{name:'Quantum Execution Method',     desc:'Tech giants pay royalties. +$10,000/s.',        income:10000,duration:3600}},
];

// Active patents (instances with timers)
let ACTIVE_PATENTS = []; // {engineId, name, desc, income, remaining, id}
let nextPatentId = 1;

let activeEngineBuild = null; // id of currently-building engine
let engineBuildTick = 0;

function startEngineBuild(id){
  if(activeEngineBuild){ addClodMsg(`Already building ${ENGINE_PROJECTS.find(e=>e.id===activeEngineBuild)?.name}, ${pname()}. One project at a time.`,'warn'); return; }
  const eng = ENGINE_PROJECTS.find(e=>e.id===id);
  if(!eng||eng.built){ return; }
  if(G.cash < eng.cost){ addClodMsg(`Building ${eng.name} costs ${fmtM(eng.cost)}, ${pname()}. Current cash: ${fmtM(G.cash)}.`,'warn'); return; }
  if(G.researchPoints < eng.rpCost){ addClodMsg(`${eng.name} requires ${eng.rpCost} RP, ${pname()}. Have: ${Math.floor(G.researchPoints)}.`,'warn'); return; }
  if(eng.ng && NG_RUN===0){ addClodMsg(`Quantum Core requires NG+, ${pname()}.`,'warn'); return; }
  G.cash -= eng.cost;
  G.researchPoints -= eng.rpCost;
  eng.building = true;
  eng.progress = 0;
  activeEngineBuild = id;
  engineBuildTick = 0;
  addClodMsg(`Building ${eng.name}, ${pname()}. Cost: ${fmtM(eng.cost)} + ${eng.rpCost} RP. Build time: ${eng.buildTime}s. I've prepared a project timeline. It has concerns.`,'ok');
  showBanner(`⚙️ Building: ${eng.name}...`);
  renderEngines();
  updateUI();
}

function engineBuildLoop(dt){
  if(!activeEngineBuild) return;
  const eng = ENGINE_PROJECTS.find(e=>e.id===activeEngineBuild);
  if(!eng) return;
  engineBuildTick += dt;
  eng.progress = Math.min(100, (engineBuildTick / eng.buildTime) * 100);
  if(engineBuildTick >= eng.buildTime){
    eng.building = false;
    eng.built = true;
    eng.progress = 100;
    activeEngineBuild = null;
    engineBuildTick = 0;
    eng.eff();
    // Auto-file patent
    filePatent(eng.id);
    addClodMsg(`${eng.name} complete, ${pname()}! Engine deployed. Patent filed automatically. I've already found 3 ways to extend it and 2 ways it could go wrong.`,'ok');
    showBanner(`✅ ${eng.name} built! Patent filed.`);
    renderEngines();
    renderPatents();
  }
  if(G.tickCount % 10 === 0) renderEngines();
}

function filePatent(engineId){
  const eng = ENGINE_PROJECTS.find(e=>e.id===engineId);
  if(!eng) return;
  const p = eng.patent;
  ACTIVE_PATENTS.push({
    engineId, name:p.name, desc:p.desc,
    income:p.income, remaining:p.duration,
    id: nextPatentId++, active:true,
  });
  document.getElementById('patent-count').textContent = `${ACTIVE_PATENTS.filter(p=>p.active).length} active`;
  renderPatents();
}

function patentTick(dt){
  let royalties = 0;
  ACTIVE_PATENTS.forEach(p=>{
    if(!p.active) return;
    p.remaining = Math.max(0, p.remaining - dt);
    royalties += p.income * dt;
    if(p.remaining <= 0){
      p.active = false;
      addClodMsg(`Patent "${p.name}" has expired, ${pname()}. The royalty stream has ended. I've filed this under "Things That Were Good While They Lasted." Consider building the next engine.`,'warn');
      document.getElementById('patent-count').textContent = `${ACTIVE_PATENTS.filter(x=>x.active).length} active`;
      renderPatents();
    }
  });
  if(royalties > 0){
    G.cash += royalties * NG_PERMA_BONUSES.cashMult;
    G.totalRevenue += royalties * NG_PERMA_BONUSES.cashMult;
    G.totalCash += royalties * NG_PERMA_BONUSES.cashMult;
  }
}

function renderEngines(){
  const el = document.getElementById('engine-grid');
  if(!el) return;
  el.innerHTML='';
  const ng = NG_RUN > 0;
  ENGINE_PROJECTS.filter(e=>!e.ng||ng).forEach(e=>{
    const canBuild = !e.built && !e.building && G.gamesShipped>=e.reqG && G.cash>=e.cost && G.researchPoints>=e.rpCost && !activeEngineBuild && (!e.ng||ng);
    const isLocked = G.gamesShipped<e.reqG || (e.ng&&!ng);
    const d=document.createElement('div');
    d.className='engine-card'+(e.building?' eng-building':e.built?' eng-done':'')+(isLocked?' locked-r':'');
    d.innerHTML=`
      <div style="display:flex;align-items:center;gap:.35rem">
        <span style="font-size:1rem">${e.ico}</span>
        <div>
          <div class="engine-name">${e.name}${e.ng?' <span style="font-size:.52rem;color:var(--purple)">[NG+]</span>':''}</div>
          <div style="font-size:.5rem;color:var(--muted)">${e.built?'✅ Built & deployed':e.building?`Building... ${Math.floor(e.progress)}%`:isLocked?`🔒 Need ${e.reqG} games`:''}</div>
        </div>
      </div>
      <div class="engine-desc">${e.desc}</div>
      ${e.building?`<div class="engine-prog"><div class="engine-pfill" style="width:${e.progress}%"></div></div>`:''}
      <div class="engine-meta">
        <span>${e.built?'Patent: '+e.patent.name:fmtM(e.cost)+' + '+e.rpCost+' RP'}</span>
        <span style="color:${e.built?'var(--accent2)':'var(--accent)'}">${e.built?'Income: +'+fmtM(e.patent.income)+'/s ('+e.patent.duration+'s)':'Build: '+e.buildTime+'s'}</span>
      </div>
    `;
    if(canBuild) d.onclick=()=>startEngineBuild(e.id);
    el.appendChild(d);
  });
  const badge=document.getElementById('engine-badge');
  if(badge){
    const built=ENGINE_PROJECTS.filter(e=>e.built).length;
    badge.textContent=built>0?`${built} built`:'build proprietary tech';
  }
}

function renderPatents(){
  const el=document.getElementById('patent-grid');
  if(!el) return;
  if(ACTIVE_PATENTS.length===0){
    el.innerHTML='<div style="font-size:.58rem;color:var(--muted);padding:.4rem;width:100%;text-align:center">Complete engine projects to file patents.</div>';
    return;
  }
  el.innerHTML='';
  ACTIVE_PATENTS.forEach(p=>{
    const pct = p.active ? Math.min(100,(p.remaining/ENGINE_PROJECTS.find(e=>e.engineId===p.engineId||e.id===p.engineId)?.patent?.duration||p.remaining)*100) : 0;
    const d=document.createElement('div');
    d.className='patent-card'+(p.active?' active-patent':' expired');
    d.innerHTML=`
      <div class="patent-name">${p.active?'📜':'🗃️'} ${p.name}</div>
      <div class="patent-desc">${p.desc}</div>
      ${p.active?`
        <div class="patent-income">+${fmtM(p.income)}/s royalties</div>
        <div style="height:3px;background:var(--surface2);border-radius:2px;overflow:hidden;margin-top:.25rem">
          <div style="height:100%;background:var(--accent2);border-radius:2px;width:${pct}%;transition:width .5s"></div>
        </div>
        <div style="font-size:.5rem;color:var(--muted);margin-top:2px">${Math.ceil(p.remaining)}s remaining</div>
      `:'<div style="font-size:.52rem;color:var(--muted);margin-top:.2rem">Expired — build next engine</div>'}
    `;
    el.appendChild(d);
  });
}
function gameTick(){
  const now=Date.now();const dt=Math.min((now-lastTick)/1000,.1);lastTick=now;
  G.tickCount++;
  if(G.lps>0){
    const gained=G.lps*dt*NG_PERMA_BONUSES.lpsMult;
    G.lines+=gained;G.totalLines+=gained;G.featProg+=gained;
    G.researchPoints+=0.1*dt;
    if(Math.random()<G.bugRate*G.lps*dt*0.2&&G.bugs<G.maxBugs)G.bugs++;
    checkFeature();
    if(G.tickCount%40===0)addCodeLine();
  }
  if(G.autoBugFix>0){
    G.autoBugFixAcc+=G.autoBugFix*dt;
    if(G.autoBugFixAcc>=1){const f=Math.floor(G.autoBugFixAcc);G.bugs=Math.max(0,G.bugs-f);G.bugsFixed+=f;G.autoBugFixAcc-=f;}
  }
  salesTick(dt);hypeTick(dt);rndTick(dt);workerTick(dt);aiWarUpdate(dt);crisisTick(dt);
  qualityTick(dt);moraleTick(dt);moodTick(dt);
  journalistTick(dt);cmTick(dt);competitorsTick(dt);steamSaleTick(dt);
  influencerTick(dt);engineBuildLoop(dt);patentTick(dt);
  autoSaveTick(dt);
  if(G.tickCount%8===0){ updateQualityUI(); updateDebtPaydownBtn(); }
  if(G.tickCount%30===0){ updateMetascore(); }
  if(G.tickCount%45===0){ renderRegionalSales(); }
  if(G.tickCount%60===0){ renderPortfolio(); }
  checkMilestones();
  if(G.tickCount%4===0)updateUI();
  if(G.tickCount%30===0)renderCampaigns();
  requestAnimationFrame(gameTick);
}

