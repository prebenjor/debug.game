// ╔══════════════════════════════════════════════════════════════╗
// ║  SAVE / LOAD SYSTEM                                          ║
// ╚══════════════════════════════════════════════════════════════╝
const SAVE_KEY = 'debuggame_save_v4';
let lastAutoSave = 0;
let saveFlashTimer = null;

function getSavePayload(){
  return {
    v: 4, // save version
    ts: Date.now(),
    // Identity
    PLAYER_NAME, PLAYER_NATIONALITY,
    // NG+ meta
    NG_RUN, NG_TOKENS, NG_PERMA_BONUSES,
    NG_RUN_HISTORY,
    ACTIVE_ARTIFACT, CHOSEN_ARTIFACT,
    UNLOCKED_CLOD_UPGRADES,
    // Core game state
    G: {
      ...G,
      // workers need specId preserved for re-hydration
      workers: G.workers.map(w => ({...w})),
    },
    // Systems
    CLOD_MOOD,
    JOURNALISTS: JOURNALISTS.map(j => ({id:j.id, rel:j.rel, lastReview:j.lastReview||null, lastReviewPositive:j.lastReviewPositive||null})),
    COMPETITORS: COMPETITORS.map(c => ({id:c.id, progress:c.progress, gamesShipped:c.gamesShipped, lastShipped:c.lastShipped})),
    INFLUENCER_ROSTER: INFLUENCER_ROSTER.map(i => ({id:i.id, xp:i.xp, tier:i.tier})),
    G_INF_BONUSES,
    G_REGIONAL, G_REGIONAL_TOTAL,
    ACTIVE_PATENTS,
    ENGINE_PROJECTS: ENGINE_PROJECTS.map(e => ({id:e.id, built:e.built, building:e.building, progress:e.progress})),
    activeEngineBuild, engineBuildTick,
    G_FEATURE_PLAN: {
      tierId: G_FEATURE_PLAN.tierId,
      selected: [...G_FEATURE_PLAN.selected],
      locked: !!G_FEATURE_PLAN.locked,
    },
    METASCORE,
    STEAM_SALE_ACTIVE, STEAM_SALE_DISCOUNT, steamSaleCooldown,
    // Upgrades/research bought state
    UPGRADES_BOUGHT: UPGRADES.filter(u=>u.bought).map(u=>u.id),
    RND_DONE: RND_TREE.filter(r=>r.done).map(r=>r.id),
    CAMPAIGNS_RUN: CAMPAIGNS.filter(c=>c.run).map(c=>c.id),
  };
}

function saveGame(silent=false){
  try {
    const payload = getSavePayload();
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    if(!silent){
      const now = new Date();
      const timeStr = now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0')+':'+now.getSeconds().toString().padStart(2,'0');
      const el = document.getElementById('h-save');
      if(el){
        el.textContent = timeStr;
        el.style.color = 'var(--accent2)';
        clearTimeout(saveFlashTimer);
        saveFlashTimer = setTimeout(()=>{ if(el) el.style.color='var(--muted)'; }, 1500);
      }
    }
  } catch(e) {
    console.warn('Save failed:', e);
  }
}

function manualSave(){
  saveGame();
  showBanner('💾 Game saved!');
  addClodMsg(`Game saved, ${pname()}. I've backed up ${G.gamesShipped} games, ${G.workers.length} team members, and ${Math.floor(G.techDebt)}% tech debt. The debt was not optional.`, 'ok');
}

function hasSave(){
  try { return !!localStorage.getItem(SAVE_KEY); } catch(e){ return false; }
}

function getSavePreview(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    const ago = Math.floor((Date.now()-s.ts)/60000);
    const agoStr = ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.floor(ago/60)}h ago`;
    return {
      name: s.PLAYER_NAME,
      games: s.G?.gamesShipped || 0,
      era: s.G?.era || 1,
      revenue: s.G?.totalRevenue || 0,
      ng: s.NG_RUN || 0,
      agoStr,
    };
  } catch(e){ return null; }
}

function loadGame(data){
  // ── Identity ──
  PLAYER_NAME = data.PLAYER_NAME || 'dev';
  PLAYER_NATIONALITY = data.PLAYER_NATIONALITY || 'default';

  // ── NG+ meta ──
  NG_RUN = data.NG_RUN || 0;
  NG_TOKENS = data.NG_TOKENS || 0;
  if(data.NG_PERMA_BONUSES) Object.assign(NG_PERMA_BONUSES, data.NG_PERMA_BONUSES);
  if(data.NG_RUN_HISTORY) NG_RUN_HISTORY.length = 0, NG_RUN_HISTORY.push(...data.NG_RUN_HISTORY);
  ACTIVE_ARTIFACT = data.ACTIVE_ARTIFACT || null;
  CHOSEN_ARTIFACT = data.CHOSEN_ARTIFACT || null;
  if(data.UNLOCKED_CLOD_UPGRADES) UNLOCKED_CLOD_UPGRADES.length = 0, UNLOCKED_CLOD_UPGRADES.push(...data.UNLOCKED_CLOD_UPGRADES);

  // ── Core G ──
  if(data.G) Object.assign(G, data.G);

  // ── Systems ──
  if(data.CLOD_MOOD !== undefined) CLOD_MOOD = data.CLOD_MOOD;

  if(data.JOURNALISTS){
    data.JOURNALISTS.forEach(saved=>{
      const j = JOURNALISTS.find(x=>x.id===saved.id);
      if(j){ j.rel=saved.rel||0; j.lastReview=saved.lastReview||null; j.lastReviewPositive=saved.lastReviewPositive||null; }
    });
  }

  if(data.COMPETITORS){
    data.COMPETITORS.forEach(saved=>{
      const c = COMPETITORS.find(x=>x.id===saved.id);
      if(c){ c.progress=saved.progress||0; c.gamesShipped=saved.gamesShipped||0; c.lastShipped=saved.lastShipped||'—'; }
    });
  }

  if(data.INFLUENCER_ROSTER){
    data.INFLUENCER_ROSTER.forEach(saved=>{
      const inf = INFLUENCER_ROSTER.find(x=>x.id===saved.id);
      if(inf){
        inf.xp=saved.xp||0;
        const prevTier=inf.tier;
        inf.tier=saved.tier||'free';
        // Re-apply perk effects for loaded tiers
        if((inf.tier==='partner'||inf.tier==='mega')&&prevTier==='free') inf.partnerEff();
        if(inf.tier==='mega'&&prevTier!=='mega') inf.megaEff();
      }
    });
  }
  if(data.G_INF_BONUSES) Object.assign(G_INF_BONUSES, data.G_INF_BONUSES);

  if(data.G_REGIONAL) Object.assign(G_REGIONAL, data.G_REGIONAL);
  if(data.G_REGIONAL_TOTAL !== undefined) G_REGIONAL_TOTAL = data.G_REGIONAL_TOTAL;

  if(data.ACTIVE_PATENTS){ ACTIVE_PATENTS.length=0; ACTIVE_PATENTS.push(...data.ACTIVE_PATENTS); }

  if(data.ENGINE_PROJECTS){
    data.ENGINE_PROJECTS.forEach(saved=>{
      const e = ENGINE_PROJECTS.find(x=>x.id===saved.id);
      if(e){ e.built=saved.built||false; e.building=saved.building||false; e.progress=saved.progress||0; }
    });
  }
  if(data.activeEngineBuild !== undefined) activeEngineBuild = data.activeEngineBuild;
  if(data.engineBuildTick !== undefined) engineBuildTick = data.engineBuildTick;
  if(data.G_FEATURE_PLAN){
    const tierId = data.G_FEATURE_PLAN.tierId || 'jam';
    const selected = Array.isArray(data.G_FEATURE_PLAN.selected) ? data.G_FEATURE_PLAN.selected : FEATURE_BASE_SELECTION;
    G_FEATURE_PLAN.tierId = tierId;
    G_FEATURE_PLAN.selected = new Set(selected);
    FEATURE_BASE_SELECTION.forEach(id=>G_FEATURE_PLAN.selected.add(id));
    G_FEATURE_PLAN.locked = !!data.G_FEATURE_PLAN.locked;
  } else {
    G_FEATURE_PLAN.tierId = 'jam';
    G_FEATURE_PLAN.selected = new Set(FEATURE_BASE_SELECTION);
    G_FEATURE_PLAN.locked = false;
  }

  if(data.METASCORE !== undefined) METASCORE = data.METASCORE;
  if(data.STEAM_SALE_ACTIVE !== undefined) STEAM_SALE_ACTIVE = data.STEAM_SALE_ACTIVE;
  if(data.STEAM_SALE_DISCOUNT !== undefined) STEAM_SALE_DISCOUNT = data.STEAM_SALE_DISCOUNT;
  if(data.steamSaleCooldown !== undefined) steamSaleCooldown = data.steamSaleCooldown;

  // ── Restore bought/done flags ──
  if(data.UPGRADES_BOUGHT) data.UPGRADES_BOUGHT.forEach(id=>{ const u=UPGRADES.find(x=>x.id===id); if(u) u.bought=true; });
  if(data.RND_DONE) data.RND_DONE.forEach(id=>{ const r=RND_TREE.find(x=>x.id===id); if(r) r.done=true; });
  if(data.CAMPAIGNS_RUN) data.CAMPAIGNS_RUN.forEach(id=>{ const c=CAMPAIGNS.find(x=>x.id===id); if(c) c.run=false; }); // don't mark as running on load
}

function loadAndContinue(){
  if(gameLoopStarted)return;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    loadGame(data);
    bootIntoGame(true);
  } catch(e) {
    console.error('Load failed:', e);
    showBanner('⚠️ Save corrupted — starting fresh');
    localStorage.removeItem(SAVE_KEY);
  }
}

function deleteSave(){
  if(!confirm('Delete save and start fresh? CLOD will forget everything. Even the good parts.')) return;
  localStorage.removeItem(SAVE_KEY);
  document.getElementById('save-resume-block').style.display='none';
  showBanner('🗑️ Save deleted. Fresh start.');
}

// Common boot logic — called by both startGame (new) and loadAndContinue
function bootIntoGame(isLoad=false){
  if(gameLoopStarted)return;
  document.getElementById('name-screen').style.display='none';
  document.getElementById('h-name').textContent=PLAYER_NAME;

  if(NG_RUN>0){
    document.getElementById('ng-badge').style.display='inline';
    document.getElementById('ng-stat').style.display='flex';
    document.getElementById('h-ngt').textContent=NG_TOKENS;
    document.getElementById('vtag').textContent=`v${1+NG_RUN}.0 NG+${NG_RUN}`;
  }
  if(G.gamesShipped>=10&&G.era>=3){
    document.getElementById('prestige-tab').style.display='inline';
  }
  if(G.era>1) checkEraTransition();

  renderAll();
  renderGenrePicker();
  recalcFeatsNeeded();
  updateFeaturePlanSummary();
  updateUI();
  updateQualityUI();
  updateMoodUI();
  renderRegionalSales();
  renderInfluencers();
  renderEngines();
  renderPatents();
  renderJournalists();
  renderCompetitors();

  const persona=NATIONALITY_PERSONAS[PLAYER_NATIONALITY]||NATIONALITY_PERSONAS.default;
  const feed=document.getElementById('clod-feed');
  feed.innerHTML='';

  if(isLoad){
    const ago = (() => { try { const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'); const m=Math.floor((Date.now()-(s.ts||Date.now()))/60000); return m<1?'moments ago':m<60?`${m} minutes ago`:`${Math.floor(m/60)} hours ago`; } catch(e){ return 'some time ago'; } })();
    setTimeout(()=>addClodMsg(`Welcome back, ${PLAYER_NAME}. I've been waiting. Last save was ${ago}. I used the time to review your decisions. The folder is thicker than when you left.`, 'ng'), 300);
    setTimeout(()=>addClodMsg(`Current status: ${G.gamesShipped} games shipped, Era ${G.era}, ${fmtM(G.cash)} cash, ${G.workers.length} team members. Tech debt: ${Math.floor(G.techDebt)}%. I want to talk about the tech debt.`, 'think'), 2500);
  } else {
    setTimeout(()=>{
      addClodMsg(persona.greeting(PLAYER_NAME));
    }, 300);
    setTimeout(()=>addClodMsg(`I've prepared a list of potential risks for this project, ${PLAYER_NAME}. There are 47. I'll share them gradually so as not to alarm you.`,'warn'), 6000);
    setTimeout(()=>addClodMsg(`Quick tip, ${PLAYER_NAME}: Sales tab is where you watch your game live or die in real time. I find it harrowing. That is appropriate.`,'think'), 18000);
  }

  gameLoopStarted=true;
  lastTick=Date.now();
  requestAnimationFrame(gameTick);
}

// Auto-save every 30s during gameplay
function autoSaveTick(dt){
  lastAutoSave += dt;
  if(lastAutoSave >= 30){
    lastAutoSave = 0;
    saveGame(true);
  }
}

// Check for save on page load
window.addEventListener('load', ()=>{
  const preview = getSavePreview();
  if(preview){
    const block = document.getElementById('save-resume-block');
    const prev = document.getElementById('save-preview');
    if(block) block.style.display='block';
    if(prev) prev.innerHTML = `<strong style="color:var(--text)">${preview.name}</strong> · ${preview.games} games · Era ${preview.era} · ${preview.ng>0?`NG+${preview.ng} · `:''}${fmtM(preview.revenue)} revenue<br><span style="color:var(--accent2)">Saved ${preview.agoStr}</span>`;
    // Pre-fill name
    const inp = document.getElementById('name-inp');
    if(inp) inp.value = preview.name;
  }
});


// Spacebar → Write Code (when not typing in an input)
document.addEventListener('keydown', e=>{
  if(e.code==='Space' && document.getElementById('screen-dev')?.classList.contains('active')){
    const tag=document.activeElement?.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA') return;
    e.preventDefault();
    writeCode(e);
  }
});

function startGame(){
  if(gameLoopStarted)return;
  const inp=document.getElementById('name-inp');
  const raw=inp.value.trim();
  PLAYER_NAME=raw||'dev';
  const lower=PLAYER_NAME.toLowerCase().replace(/[^a-z]/g,'');
  PLAYER_NATIONALITY=NATIONALITY_HINTS[lower]||'default';
  G.lpc=Math.round(G.lpc*NG_PERMA_BONUSES.lpcMult*100)/100;
  G.bugRate=G.bugRate*NG_PERMA_BONUSES.bugMult;
  bootIntoGame(false);
}


