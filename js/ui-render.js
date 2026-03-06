// ╔══════════════════════════════════════════════════════════════╗
// ║  RENDERING                                                   ║
// ╚══════════════════════════════════════════════════════════════╝
function renderUpgrades(){
  const el=document.getElementById('rpanel-upg');el.innerHTML='';
  const ng=NG_RUN>0;
  const avail=UPGRADES.filter(u=>(u.reqG<=G.gamesShipped)&&(!u.ng||ng));
  const categories=[...new Set(avail.map(u=>u.cat||'Other'))];
  categories.forEach(cat=>{
    const hdr=document.createElement('div');
    hdr.className='upg-cat';
    hdr.textContent=cat;
    el.appendChild(hdr);
    avail.filter(u=>(u.cat||'Other')===cat).forEach(u=>{
      const lineOk=G.totalLines>=u.req;
      const d=document.createElement('div');
      d.className='ucard'+(u.bought?' bought':'')+((!lineOk&&!u.bought)?' locked':'')+(u.ng?' ng-upg':'');
      if(!u.bought&&lineOk&&G.lines>=u.cost)d.classList.add('afford');
      d.dataset.id=u.id;
      d.innerHTML=`<div class="uico">${u.ico}</div><div><div class="uname">${u.name}${u.ng?' <span style="font-size:.55rem;color:var(--purple)">[NG+]</span>':''}</div><div class="udesc">${u.desc}</div><div class="ucost">${u.bought?'✓ Owned':fmt(u.cost)+' lines'}${!lineOk&&!u.bought?' 🔒':''}</div></div>`;
      if(!u.bought&&lineOk)d.onclick=()=>buyUpgrade(u.id);
      el.appendChild(d);
    });
  });
  const next=UPGRADES.find(u=>!u.ng&&u.reqG===G.gamesShipped+1);
  if(next){
    const t=document.createElement('div');t.className='ucard teaser';
    t.innerHTML=`<div class="uico">🔒</div><div><div class="uname" style="color:var(--muted)">More unlocks after Game #${next.reqG}</div><div class="udesc">Keep shipping.</div></div>`;
    el.appendChild(t);
  }
}

function renderTeam(){renderRoster();renderHireGrid();document.getElementById('team-count').textContent=`${G.workers.length} members`;}

function renderRoster(){
  const el=document.getElementById('roster-list');el.innerHTML='';
  if(G.workers.length===0){
    el.innerHTML='<div style="padding:.65rem;font-size:.6rem;color:var(--muted);text-align:center">Just you and CLOD.<br>CLOD counts as half a person.</div>';
    return;
  }
  const relBonus=computeRelationshipBonus();
  G.workers.forEach(w=>{
    if(w.morale===undefined)w.morale=75;
    const morale=Math.floor(w.morale);
    const moraleColor=morale>=60?'var(--accent2)':morale>=30?'var(--accent)':'var(--danger)';
    const rels=getWorkerRelStatus(w);
    const relHTML=rels.length?`<div class="rel-chips">${rels.map(r=>`<span class="rel-chip ${r.type==='synergy'?'likes':r.type==='feud'?'feud':'dislikes'}">${r.label}</span>`).join('')}</div>`:'';
    const d=document.createElement('div');
    d.className=`worker-card ${w.ng?'ng-worker':w.type}`;
    d.innerHTML=`
      <button class="fire-btn" onclick="fireWorker(${w.wid})">✕</button>
      <div class="wname">${w.ico} ${w.name}</div><div class="wrole">${w.typelbl}</div>
      <div class="wstats">
        ${w.lps>0?`<span class="wstat g">+${w.lps} LPS</span>`:''}
        ${w.lpc>0?`<span class="wstat y">+${w.lpc} LPC</span>`:''}
        ${w.autoBug>0?`<span class="wstat b">fix ${w.autoBug}/s</span>`:''}
        ${w.rpps>0?`<span class="wstat">${w.rpps} RP/s</span>`:''}
        ${w.salary>0?`<span class="wstat r">-$${w.salary}/c</span>`:''}
      </div>
      <div class="morale-row">
        <div class="morale-lbl"><span>Morale</span><span style="color:${moraleColor}">${morale}%</span></div>
        <div class="morale-bar"><div class="morale-fill" style="width:${morale}%;background:${moraleColor}"></div></div>
      </div>
      ${relHTML}
      <div class="wquote">${w.quote}</div>
      <div class="waction">→ ${w.lastAction||'working...'}</div>`;
    el.appendChild(d);
  });
  // Show team relationship summary if significant
  if(relBonus!==0){
    const label=relBonus>0?`🤝 Team synergy: +${relBonus} LPS bonus`:`💢 Team feuds: ${relBonus} LPS penalty`;
    const color=relBonus>0?'var(--accent2)':'var(--danger)';
    const d=document.createElement('div');
    d.style.cssText=`font-size:.54rem;color:${color};padding:.3rem .5rem;border-top:1px solid var(--border);text-align:center;`;
    d.textContent=label;
    el.appendChild(d);
  }
}

function renderHireGrid(){
  const el=document.getElementById('hire-grid');el.innerHTML='';
  const ng=NG_RUN>0;
  const hiredIds=G.workers.map(w=>w.specId);
  HIREABLE.filter(h=>!h.ng||ng).forEach(h=>{
    const alreadyHired=G.workers.find(w=>w.specId===h.id);
    const canAfford=G.cash>=h.cost;
    const meetsG=G.gamesShipped>=h.reqG;
    const cant=!canAfford||!meetsG||alreadyHired;
    // Build relationship preview based on who's already hired
    const relDef=WORKER_RELATIONSHIPS[h.id]||{};
    const synergies=(relDef.likes||[]).filter(id=>hiredIds.includes(id));
    const tensions=(relDef.dislikes||[]).filter(id=>hiredIds.includes(id));
    const feuds=(relDef.hates||[]).filter(id=>hiredIds.includes(id));
    const relPreview=[
      ...synergies.map(id=>{const w=G.workers.find(x=>x.specId===id);return w?`<span class="rel-chip likes">🤝 ${w.name.split(' ')[0]}</span>`:'';}),
      ...tensions.map(id=>{const w=G.workers.find(x=>x.specId===id);return w?`<span class="rel-chip dislikes">😒 ${w.name.split(' ')[0]}</span>`:'';}),
      ...feuds.map(id=>{const w=G.workers.find(x=>x.specId===id);return w?`<span class="rel-chip feud">💢 ${w.name.split(' ')[0]}</span>`:'';}),
    ].filter(Boolean).join('');
    const d=document.createElement('div');
    d.className='hire-card'+(cant?' cant':'')+(h.ng?' ng-hire':'');
    d.innerHTML=`
      <div class="hc-name">${h.ico} ${h.name}</div>
      <div class="hc-type ${h.ng?'ng-t':h.type}">${h.typelbl}</div>
      <div class="hc-desc">${h.desc}</div>
      ${relPreview?`<div class="rel-chips" style="margin:.2rem 0">${relPreview}</div>`:''}
      <div class="hc-cost">${alreadyHired?'✓ On team':meetsG?fmtM(h.cost):`🔒 Need ${h.reqG} games`}</div>`;
    if(!cant)d.onclick=()=>openHireNegotiation(h.id);
    el.appendChild(d);
  });
}

function renderCampaigns(){
  const el=document.getElementById('camp-list');el.innerHTML='';
  CAMPAIGNS.forEach(c=>{
    const canRun=G.gamesShipped>=c.reqG&&!G.activeCampaign&&G.cash>=c.cost&&G.hype>=c.reqH;
    const locked=G.gamesShipped<c.reqG;
    const prog=c.run?Math.min(100,Math.floor((G.campaignTick/c.dur)*100)):null;
    const d=document.createElement('div');
    d.className='camp-card'+(c.run?' running':'')+(locked?' locked-c':'');
    d.innerHTML=`
      <div class="camp-name">${c.ico} ${c.name}</div>
      <div class="camp-desc">${c.desc}</div>
      <div class="camp-cost">${locked?`🔒 Need ${c.reqG} games`:fmtM(c.cost)}</div>
      <div class="camp-eff">+${c.hype} hype · +${c.wl} wishlists · ${c.dur}s</div>
      ${c.run?`<div style="margin-top:.3rem"><div class="pbar"><div class="pfill" style="width:${prog}%"></div></div><div style="font-size:.55rem;color:var(--muted);margin-top:2px">Running... ${prog}%</div></div>`:''}`;
    if(!c.run&&!locked&&canRun)d.onclick=()=>runCampaign(c.id);
    el.appendChild(d);
  });
}

function renderRnD(){
  const el=document.getElementById('rnd-grid');el.innerHTML='';
  const ng=NG_RUN>0;
  RND_TREE.filter(r=>!r.ng||ng).forEach(r=>{
    const prereqOk=!r.req||(RND_TREE.find(x=>x.id===r.req)?.done);
    const gOk=r.reqG<=G.gamesShipped;
    const isActive=G.activeResearch===r.id;
    const locked=!prereqOk||!gOk;
    const canStart=!r.done&&prereqOk&&gOk&&!G.activeResearch&&G.researchPoints>=r.cost;
    const d=document.createElement('div');
    d.className='rnd-card'+(r.done?' done':'')+(locked?' locked-r':'')+(isActive?' researching':'')+(r.ng?' ng-rnd':'');
    d.innerHTML=`
      <div class="rnd-ico">${r.ico}</div>
      <div class="rnd-name">${r.name}${r.ng?' <span style="font-size:.55rem;color:var(--purple)">[NG+]</span>':''}</div>
      <div class="rnd-desc">${r.desc}</div>
      <div class="rnd-cost">${r.done?'✅ Done':locked?'🔒 Locked':`${r.cost} RP`}</div>
      <div class="rnd-bw" id="rnd-bw-${r.id}" style="${isActive?'display:block':''}"><div class="rnd-b"><div class="rnd-p" id="rp-${r.id}" style="width:0%"></div></div></div>`;
    if(canStart)d.onclick=()=>startResearch(r.id);
    el.appendChild(d);
  });
}

function renderDemand(){
  const el=document.getElementById('demand-list');el.innerHTML='';
  const labels={graphics:'🎨 Graphics',gameplay:'🕹️ Gameplay',story:'📖 Story',multiplayer:'🌐 Multi',performance:'⚡ Perf'};
  const colors={graphics:'#c792ea',gameplay:'var(--accent)',story:'var(--orange)',multiplayer:'var(--clod)',performance:'var(--accent2)'};
  Object.entries(G.demand).forEach(([k,v])=>{
    el.innerHTML+=`<div class="dem-item"><span style="min-width:68px;font-size:.6rem">${labels[k]}</span><div class="dem-bar"><div class="dem-fill" style="width:${v}%;background:${colors[k]}"></div></div><span style="min-width:26px;font-size:.57rem;color:var(--muted)">${Math.round(v)}%</span></div>`;
  });
}

function renderStats(){
  const el=document.getElementById('rpanel-stats');
  el.innerHTML=`
    <div class="srow"><span class="skey">Patent Royalties</span><span class="sval g">${fmtM(ACTIVE_PATENTS.filter(p=>p.active).reduce((s,p)=>s+p.income,0))}/s</span></div>
    <div class="srow"><span class="skey">Active Patents</span><span class="sval">${ACTIVE_PATENTS.filter(p=>p.active).length}</span></div>
    <div class="srow"><span class="skey">Inf. Partners</span><span class="sval y">${INFLUENCER_ROSTER.filter(i=>i.tier!=='free').length}/5</span></div>
    <div class="srow"><span class="skey">Top Region</span><span class="sval" style="color:var(--clod)">${(()=>{const r=Object.entries(G_REGIONAL).sort((a,b)=>b[1]-a[1])[0];return r?REGIONS.find(x=>x.id===r[0])?.label+'  '+fmtM(r[1]):'—';})()}</span></div>
    <div class="srow"><span class="skey">Genre</span><span class="sval" style="color:${GENRES[G.selectedGenre]?.color||'var(--muted)'}">${GENRES[G.selectedGenre]?.label||'—'}</span></div>
    <div class="srow"><span class="skey">Topic</span><span class="sval">${TOPICS[G.selectedTopic]?.label||'—'}</span></div>
    <div class="srow"><span class="skey">Code Quality</span><span class="sval ${G.codeQuality>=70?'g':G.codeQuality>=40?'y':'r'}">${Math.floor(G.codeQuality)}%</span></div>
    <div class="srow"><span class="skey">Tech Debt</span><span class="sval ${G.techDebt>=60?'r':G.techDebt>=30?'y':'g'}">${Math.floor(G.techDebt)}%</span></div>
    <div class="srow"><span class="skey">Combo Mult</span><span class="sval ${getComboMult()>=1?'g':'r'}">×${getComboMult().toFixed(2)}</span></div>
    <div class="srow"><span class="skey">Team Rel Bonus</span><span class="sval ${computeRelationshipBonus()>=0?'g':'r'}">${computeRelationshipBonus()>0?'+':''}${computeRelationshipBonus()} LPS</span></div>
    <div class="srow"><span class="skey">Player</span><span class="sval y">${PLAYER_NAME}</span></div>
    <div class="srow"><span class="skey">NG+ Run</span><span class="sval p">${NG_RUN}</span></div>
    <div class="srow"><span class="skey">Era</span><span class="sval p">${G.era} — ${ERAS[Math.min(G.era-1,ERAS.length-1)].name}</span></div>
    <div class="srow"><span class="skey">Lines</span><span class="sval y">${fmt(G.totalLines)}</span></div>
    <div class="srow"><span class="skey">LPC</span><span class="sval">${G.lpc.toFixed(1)}</span></div>
    <div class="srow"><span class="skey">LPS</span><span class="sval">${G.lps.toFixed(1)}</span></div>
    <div class="srow"><span class="skey">Cash</span><span class="sval g">${fmtM(G.cash)}</span></div>
    <div class="srow"><span class="skey">$/sec</span><span class="sval g">${fmtM(G.mps)}</span></div>
    <div class="srow"><span class="skey">Total Revenue</span><span class="sval g">${fmtM(G.totalRevenue)}</span></div>
    <div class="srow"><span class="skey">Bugs Fixed</span><span class="sval g">${G.bugsFixed}</span></div>
    <div class="srow"><span class="skey">Bug Rate</span><span class="sval r">${(G.bugRate*100).toFixed(0)}%</span></div>
    <div class="srow"><span class="skey">Auto-fix/s</span><span class="sval">${G.autoBugFix.toFixed(1)}</span></div>
    <div class="srow"><span class="skey">Features</span><span class="sval">${G.featsDone}/${G.featsNeeded}</span></div>
    <div class="srow"><span class="skey">Games Shipped</span><span class="sval g">${G.gamesShipped}</span></div>
    <div class="srow"><span class="skey">Research Points</span><span class="sval">${Math.floor(G.researchPoints)}</span></div>
    <div class="srow"><span class="skey">Team Size</span><span class="sval">${G.workers.length}</span></div>
    <div class="srow"><span class="skey">Hype</span><span class="sval y">${Math.floor(G.hype)}</span></div>
    <div class="srow"><span class="skey">Wishlists</span><span class="sval g">${fmt(G.wishlists)}</span></div>
    <div class="srow"><span class="skey">Units Sold</span><span class="sval g">${fmt(G.unitsSold)}</span></div>
    <div class="srow"><span class="skey">NG+ Tokens</span><span class="sval p">${NG_TOKENS}</span></div>
    <div class="srow"><span class="skey">Perm LPC Mult</span><span class="sval p">${NG_PERMA_BONUSES.lpcMult.toFixed(2)}x</span></div>
    <div class="srow"><span class="skey">Perm LPS Mult</span><span class="sval p">${NG_PERMA_BONUSES.lpsMult.toFixed(2)}x</span></div>
  `;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  UPDATE UI                                                   ║
// ╚══════════════════════════════════════════════════════════════╝
function updateUI(){
  updateFeaturePlanSummary();
  document.getElementById('h-lines').textContent=fmt(G.totalLines)+' lines';
  document.getElementById('h-mps').textContent=fmtM(G.mps);
  document.getElementById('h-cash').textContent=fmtM(G.cash);
  document.getElementById('h-hype').textContent=Math.floor(G.hype);
  document.getElementById('bug-count').textContent=G.bugs;
  document.getElementById('max-bugs').textContent=G.maxBugs;
  const bpct=(G.bugs/G.maxBugs)*100;
  document.getElementById('bug-fill').style.width=bpct+'%';
  document.getElementById('bug-warn').textContent=bpct>80?'⚠️ CRITICAL':'';
  document.getElementById('debug-btn').disabled=G.bugs===0;
  const fpct=Math.min(100,Math.floor((G.featProg/G.featGoal)*100));
  document.getElementById('feat-fill').style.width=fpct+'%';
  document.getElementById('feat-pct').textContent=fpct+'%';
  document.getElementById('feat-total').textContent=G.featsNeeded;
  const spct=Math.min(100,Math.floor((G.featsDone/G.featsNeeded)*100));
  document.getElementById('ship-fill').style.width=spct+'%';
  document.getElementById('ship-pct').textContent=spct+'%';
  document.getElementById('ship-btn').disabled=G.featsDone<G.featsNeeded;
  document.getElementById('ship-btn').textContent=`SHIP GAME #${G.gamesShipped+1}`;
  // Upgrade affordability
  document.querySelectorAll('.ucard').forEach(c=>{
    const u=UPGRADES.find(x=>x.id===c.dataset.id);
    if(!u||u.bought)return;
    c.classList.toggle('afford',G.lines>=u.cost&&G.totalLines>=u.req);
  });
  // Sales metrics
  if(G.gamesShipped>0){
    document.getElementById('m-units').textContent=fmt(G.unitsSold);
    document.getElementById('m-rev').textContent=fmtM(G.totalRevenue);
    document.getElementById('m-rat').textContent=G.avgRating?G.avgRating.toFixed(1)+'★':'—';
    document.getElementById('m-play').textContent=fmt(G.activePlayers);
    document.getElementById('m-ud').innerHTML=`<span class="du">+${fmt(G.salesPerHour)}/hr</span>`;
    document.getElementById('m-rd').innerHTML=`<span class="du">${fmtM(G.mps)}/s</span>`;
    document.getElementById('m-ratd').innerHTML=G.totalRatings?`<span class="${G.avgRating>=3.5?'du':'dd'}">${G.totalRatings} reviews</span>`:'—';
  }
  document.getElementById('hype-val').textContent=Math.floor(G.hype);
  document.getElementById('hype-fill').style.width=Math.min(100,G.hype)+'%';
  document.getElementById('wl-ct').textContent=fmt(G.wishlists);
  document.getElementById('wl-badge').textContent=fmt(G.wishlists);
  document.getElementById('wl-rate').textContent=`+${fmt((G.hype*0.12+G.gamesShipped*2.5)*3600)}/hr`;
  if(NG_RUN>0)document.getElementById('h-ngt').textContent=NG_TOKENS;
  renderStats();
}

function renderAll(){
  renderUpgrades();renderTeam();renderRnD();renderCampaigns();renderDemand();
  renderCompetitors();renderJournalists();renderCLODTree();renderArtifacts();
  renderEngines();renderPatents();renderInfluencers();renderRegionalSales();
  if(G.gamesShipped>=10&&G.era>=3)renderPrestige();
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  NAV                                                         ║
// ╚══════════════════════════════════════════════════════════════╝
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(t=>t.classList.remove('active'));
  document.getElementById(`screen-${id}`).classList.add('active');
  const idx={'dev':0,'team':1,'market':2,'mkt':3,'rnd':4,'prestige':5}[id];
  document.querySelectorAll('.ntab')[idx]?.classList.add('active');
  if(id==='team')renderTeam();
  if(id==='market'){drawSalesChart();renderDemand();}
  if(id==='mkt')renderCampaigns();
  if(id==='rnd')renderRnD();
  if(id==='prestige')renderPrestige();
}
function switchRTab(t){
  document.getElementById('rpanel-upg').style.display=t==='upg'?'flex':'none';
  document.getElementById('rpanel-stats').style.display=t==='stats'?'flex':'none';
  document.getElementById('rtab-upg').className='rtab'+(t==='upg'?' active':'');
  document.getElementById('rtab-stats').className='rtab'+(t==='stats'?' active':'');
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  MILESTONES                                                  ║
// ╚══════════════════════════════════════════════════════════════╝
const MILESTONES=[
  [100,n=>`100 lines, ${n}. I've opened a folder on you. It already has entries.`],
  [1000,n=>`1,000 lines, ${n}. The folder is getting thick. I'm considering a binder.`],
  [5000,n=>`5,000 lines, ${n}. Professional territory. CLOD is cautiously impressed. This is rare.`],
  [25000,n=>`25K lines, ${n}. You're either building something or processing trauma. Possibly both.`],
  [100000,n=>`100K lines, ${n}. A full game's worth of code. Filed under: "The Impressive Pile."`],
  [500000,n=>`500K lines, ${n}. This is more code than some studios ship in a decade. I have concerns about the technical debt.`],
];

function checkMilestones(){
  MILESTONES.forEach(([n,msgFn])=>{
    if(G.totalLines>=n&&G.lastMilestone<n){G.lastMilestone=n;addClodMsg(msgFn(pname()),'ok');showBanner(`🎉 ${fmt(n)} lines!`);}
  });
  if(G.gamesShipped>G.lastShipMilestone){G.lastShipMilestone=G.gamesShipped;renderAll();}
}


