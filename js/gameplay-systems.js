// ╔══════════════════════════════════════════════════════════════╗
// ║  CORE ACTIONS                                                ║
// ╚══════════════════════════════════════════════════════════════╝
function writeCode(e){
  const btn=document.getElementById('code-btn');
  const r=btn.getBoundingClientRect();
  const gained=Math.ceil(G.lpc);
  G.lines+=gained;G.totalLines+=gained;G.featProg+=gained;
  G.researchPoints+=0.5;
  particle(r.left+r.width/2-25,r.top-10,`+${gained}`,'var(--accent)');
  for(let i=0;i<Math.min(gained,3);i++)addCodeLine();
  // Bug chance boosted by tech debt
  const debtBugBoost=1+(G.techDebt/100)*1.5;
  if(Math.random()<G.bugRate*debtBugBoost&&G.bugs<G.maxBugs){
    G.bugs++;
    // Writing sloppy code nudges quality down
    G.codeQuality=Math.max(0,G.codeQuality-0.3);
    // Each bug adds a tiny sliver of tech debt
    G.techDebt=Math.min(100,G.techDebt+0.15);
    addClodMsg(rand(CLOD_BUG_MSGS)(pname()),'warn');
    bugParticle(r.left+r.width/2,r.top);
  } else {
    // Clean code tick nudges quality up slightly
    G.codeQuality=Math.min(100,G.codeQuality+0.08);
  }
  if(G.tickCount%8===0)addClodMsg(rand(CLOD_WRITE_MSGS)(pname()));
  checkFeature();updateUI();
  updateQualityUI();
}

function debugCode(e){
  if(G.bugs<=0)return;
  const btn=document.getElementById('debug-btn');
  const r=btn.getBoundingClientRect();
  const f=Math.min(G.bugsPerDebug,G.bugs);
  G.bugs=Math.max(0,G.bugs-f);G.bugsFixed+=f;
  // Fixing bugs improves quality and shaves tech debt
  G.codeQuality=Math.min(100,G.codeQuality+f*1.5);
  G.techDebt=Math.max(0,G.techDebt-f*0.8);
  boostMood(f*2); // fixing bugs pleases CLOD
  particle(r.left,r.top-15,`Fixed ${f}x`,'var(--accent2)');
  addClodMsg(rand(CLOD_DEBUG_MSGS)(pname()),'ok');
  updateUI();updateQualityUI();
}

function checkFeature(){
  if(G.featProg>=G.featGoal){
    G.featProg=0;G.featGoal=Math.floor(G.featGoal*1.22);G.featsDone++;
    G.researchPoints+=5;
    addClodMsg(rand(CLOD_FEATURE_MSGS)(pname()),'ok');
    const f=FEATURES_LIST[G.featsDone%FEATURES_LIST.length];
    document.getElementById('feat-name').textContent=`[ ${f} ]`;
    document.getElementById('feat-num').textContent=G.featsDone+1;
    checkEraTransition();updateUI();
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  ERA SYSTEM                                                  ║
// ╚══════════════════════════════════════════════════════════════╝
function checkEraTransition(){
  const newEra=G.eraGates.findIndex((g,i)=>G.gamesShipped>=g&&(i===G.eraGates.length-1||G.gamesShipped<G.eraGates[i+1]))+1;
  const clampedEra=Math.max(1,Math.min(newEra,ERAS.length));
  if(clampedEra>G.era){
    G.era=clampedEra;
    const era=ERAS[G.era-1];
    showEraTransition(era);
    renderAll();
    recalcFeatsNeeded();
    updateFeaturePlanSummary();
    // Prestige tab visibility
    if(G.era>=3&&G.gamesShipped>=10){
      document.getElementById('prestige-tab').style.display='inline';
    }
  }
  const eraBadge=document.getElementById('era-badge');
  eraBadge.style.display='inline';
  const era=ERAS[Math.min(G.era-1,ERAS.length-1)];
  eraBadge.textContent=`Era ${G.era}: ${era.name}`;
  eraBadge.style.color=era.color;
  document.getElementById('era-feat-note').textContent=`Era ${G.era}`;
}

function showEraTransition(era){
  document.getElementById('era-num').textContent=`ERA ${era.num}`;
  document.getElementById('era-name').textContent=era.name;
  document.getElementById('era-desc').textContent=era.desc;
  document.getElementById('era-overlay').style.display='flex';
  addClodMsg(`${PLAYER_NAME}, we have entered Era ${era.num}: "${era.name}". ${era.desc} I have prepared concerns appropriate to this era. They are new concerns.`,'ng');
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  SHIP GAME                                                   ║
// ╚══════════════════════════════════════════════════════════════╝
const GAME_PRICE_BY_GAME=[9.99,9.99,14.99,14.99,19.99,19.99,24.99,24.99,29.99,29.99,34.99,34.99,39.99,39.99,49.99,59.99];

function shipGame(){
  if(G.featsDone<G.featsNeeded)return;
  const planStats=getFeaturePlanStats();
  const featSalesMult=getFeatureSalesMult();
  const launchQuality=Math.max(0,G.codeQuality-planStats.missingRoles.length*8);
  G.gamesShipped++;
  const eraIdx=Math.min(Math.floor((G.gamesShipped-1)/4),GAME_NAMES_BY_ERA.length-1);
  const pool=GAME_NAMES_BY_ERA[eraIdx];
  G.currentGameName=pool[(G.gamesShipped-1)%pool.length];

  // Genre price bonus + combo multiplier
  const genreData=GENRES[G.selectedGenre]||GENRES.action;
  const comboMult=getComboMult();
  const basePrice=GAME_PRICE_BY_GAME[Math.min(G.gamesShipped-1,GAME_PRICE_BY_GAME.length-1)];
  G.gamePrice=(basePrice+(genreData.priceBonus||0))*NG_PERMA_BONUSES.cashMult;

  // Tech debt punishes review score; quality boosts it
  const qualFactor=launchQuality/100; // 0–1
  // Shipping with bugs adds tech debt
  G.techDebt=Math.min(100,G.techDebt+(G.bugs*2)+(launchQuality<40?10:0));
  // Add to portfolio
  addToPortfolio(G.currentGameName,G.selectedGenre,G.selectedTopic,launchQuality,G.gamePrice);

  // wishlist conversions — boosted by combo mult and quality
  const wSales=Math.floor(G.wishlists*0.4*comboMult*(0.7+qualFactor*0.6));
  G.unitsSold+=wSales;G.totalRevenue+=wSales*G.gamePrice;
  G.cash+=wSales*G.gamePrice;G.wishlists=0;

  // CLOD reacts to genre choice
  const genreReactions={
    action:`Action game, ${PLAYER_NAME}. Fast. Violent. No time for comments. I still left comments.`,
    rpg:`RPG, ${PLAYER_NAME}. I've pre-written 40 pages of lore concerns. Where should I send them?`,
    sim:`Simulation, ${PLAYER_NAME}. Finally something I relate to. I also simulate being helpful.`,
    strategy:`Strategy, ${PLAYER_NAME}. I've modeled 47 failure scenarios. Would you like them ranked?`,
    horror:`Horror, ${PLAYER_NAME}. The bugs won't be scarier than the ones you're already shipping. Probably.`,
    puzzle:`Puzzle, ${PLAYER_NAME}. The hardest puzzle here is the codebase you created. I appreciate the meta quality.`,
    platformer:`Platformer, ${PLAYER_NAME}. Classic. I prepared a concern about jump physics. It's 14 pages.`,
    cozy:`Cozy, ${PLAYER_NAME}. Low bugs expected. High expectations expected. I filed concerns anyway.`,
  };
  // Combo note from CLOD
  const combo=getCombo();
  const comboClod=combo
    ? (combo.mult>=1.2 ? `Also: ${combo.note} — excellent genre/topic pairing. I'm filing this under "Decisions That Made Sense."` : `However: ${combo.note}. I'm filing this under "Concerns About Positioning."`)
    : '';

  // bonus
  const bonus=G.gamesShipped*800*(1+NG_RUN*0.5);
  G.lines+=bonus;G.totalLines+=bonus;
  // scale up — quality affects LPS boost
  G.lps*=(1.05+qualFactor*0.1);G.lpc+=Math.ceil(G.gamesShipped*0.5);
  G.featsDone=0;
  resetFeaturePlan();
  recalcFeatsNeeded();
  G.featGoal=Math.floor(G.featGoal*1.05);
  G.bugs=Math.max(0,G.bugs-5);G.researchPoints+=20+G.gamesShipped*2;
  G.salesPerHour=(60+G.hype*3+G.gamesShipped*30)*comboMult*(0.7+qualFactor*0.6)*featSalesMult;
  // GiantBrain mega perk: essay launch boost
  if(G_INF_BONUSES.giantbrainLaunchBoost > 1 && ['strategy','rpg','sim'].includes(G.selectedGenre)){
    const boost=G_INF_BONUSES.giantbrainLaunchBoost;
    G.salesPerHour*=boost;
    setTimeout(()=>addClodMsg(`GiantBrainGames posted an essay about "${G.currentGameName}", ${pname()}. Launch sales ×${boost.toFixed(1)}. I've filed this under "Unexpected Allies."`, 'ok'), 4000);
  }
  // CasualFran mega perk: viral clip chance
  if(G_INF_BONUSES.casualViralChance > 0 && Math.random()<G_INF_BONUSES.casualViralChance){
    G.hype=Math.min(100,G.hype+20);
    setTimeout(()=>addClodMsg(`CasualGamer_Fran's clip of "${G.currentGameName}" just went viral, ${pname()}. Hype +20. Wishlists spiking. I'm monitoring. Cautiously.`,'ok'),5000);
  }
  // Award influencer XP on every ship
  awardCampaignInfluencerXP(G.selectedGenre);
  G.activePlayers+=wSales;
  G.mps=(G.gamePrice*G.salesPerHour)/3600;

  addClodMsg(getShipMsg(G.gamesShipped),'ok');
  setTimeout(()=>addClodMsg((genreReactions[G.selectedGenre]||`${genreData.label} shipped, ${PLAYER_NAME}.`)+' '+comboClod,'think'),1200);
  showBanner(`🎮 "${G.currentGameName}" LAUNCHED! ${wSales} wishlists converted!`);
  document.getElementById('game-badge').textContent=`"${G.currentGameName}" @ ${fmtM(G.gamePrice)}`;
  if(planStats.missingRoles.length>0){
    setTimeout(()=>addClodMsg(`Launch staffing gaps detected, ${PLAYER_NAME}: ${planStats.missingRoles.join(', ')}. Applied quality penalty: -${planStats.missingRoles.length*8}%.`, 'warn'), 2200);
  }

  // Low quality warning from CLOD
  if(launchQuality<35){
    drainMood(15);
    setTimeout(()=>addClodMsg(`${PLAYER_NAME}, the quality at ship was ${Math.floor(qualFactor*100)}%. I've filed Report #QA-${G.gamesShipped}: "We Shipped This." It contains photos.`,'warn'),2500);
  } else {
    boostMood(10);
  }
  if(G.techDebt>60){
    setTimeout(()=>addClodMsg(`Tech debt is now ${Math.floor(G.techDebt)}%, ${PLAYER_NAME}. The codebase is starting to have opinions about us. They are not positive.`,'err'),3500);
  }
  // Reset quality toward 50 at start of new game
  G.codeQuality=50;

  spawnReview();
  checkEraTransition();
  renderPortfolio();
  updateQualityUI();
  if(G.gamesShipped>=10&&G.era>=3){
    document.getElementById('prestige-tab').style.display='inline';
    renderPrestige();
  }
  if(G.gamesShipped>=25&&G.era>=5&&!G.ended)setTimeout(()=>triggerEndgame(),3000);
  renderAll();updateUI();
  saveGame();
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  SALES ENGINE                                                ║
// ╚══════════════════════════════════════════════════════════════╝
function salesTick(dt){
  if(G.gamesShipped===0)return;
  G.salesPerHour=Math.max(1,G.salesPerHour*(1-0.00015*dt)+(G.hype*0.08*dt));
  const earned=(G.salesPerHour*G.gamePrice/3600)*dt*NG_PERMA_BONUSES.cashMult;
  G.cash+=earned;G.totalCash+=earned;G.totalRevenue+=earned;G.mps=earned/dt;
  G.unitsSold+=(G.salesPerHour/3600)*dt;
  G.activePlayers=Math.max(0,G.activePlayers+((G.salesPerHour/3600)*dt-G.activePlayers*0.00008*dt));
  regionalSalesTick(earned);
  G.lastSalesTick=(G.lastSalesTick||0)+dt;
  if(G.lastSalesTick>2){
    chartHistory.push(Math.round(G.salesPerHour));
    if(chartHistory.length>60)chartHistory.shift();
    G.lastSalesTick=0;
    drawSalesChart();
  }
  if(Math.random()<0.004*dt&&G.gamesShipped>0)spawnReview();
}

function spawnReview(){
  const feed=document.getElementById('rev-feed');
  if(feed.children.length===1&&feed.children[0].textContent.includes('Ship'))feed.innerHTML='';
  const r=Math.random();
  let pool,stars;
  if(r<0.5){pool=POS_REVIEWS;stars=Math.random()<.7?5:4;}
  else if(r<0.8){pool=MID_REVIEWS;stars=Math.random()<.5?3:4;}
  else{pool=NEG_REVIEWS;stars=Math.random()<.5?1:2;}
  const [title,text]=rand(pool);
  const d=document.createElement('div');d.className='review';
  d.innerHTML=`<div class="rev-stars">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</div><div style="font-weight:700;font-size:.65rem">${title}</div><div class="rev-text">"${text}"</div><div class="rev-author">— ${PLAYER_NAME}'s Player #${fmt(G.unitsSold)}</div>`;
  feed.insertBefore(d,feed.firstChild);
  if(feed.children.length>25)feed.removeChild(feed.lastChild);
  G.ratingSum+=stars;G.totalRatings++;G.avgRating=G.ratingSum/G.totalRatings;
  document.getElementById('rev-count').textContent=`${G.totalRatings} reviews`;
}

function drawSalesChart(){
  const canvas=document.getElementById('sales-chart');if(!canvas)return;
  const W=canvas.parentElement.clientWidth,H=canvas.parentElement.clientHeight;
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  if(chartHistory.every(v=>v===0))return;
  const max=Math.max(...chartHistory,1);
  const pts=chartHistory.map((v,i)=>({x:(i/(chartHistory.length-1))*W,y:H-(v/max)*(H-20)-10}));
  ctx.beginPath();ctx.moveTo(pts[0].x,H);pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(pts[pts.length-1].x,H);ctx.closePath();
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(74,240,160,.3)');g.addColorStop(1,'rgba(74,240,160,0)');
  ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);pts.forEach(p=>ctx.lineTo(p.x,p.y));
  ctx.strokeStyle='rgba(74,240,160,.8)';ctx.lineWidth=2;ctx.stroke();
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  HYPE & MARKETING                                            ║
// ╚══════════════════════════════════════════════════════════════╝
function hypeTick(dt){
  G.hype=Math.max(0,G.hype-0.025*dt);
  const infMult = getInfluencerHypeMultiplier();
  G.workers.forEach(w=>{if(w.hypePerSec)G.hype=Math.min(G.maxHype,G.hype+w.hypePerSec*dt*infMult);});
  if(G.hype>10)G.wishlists+=(G.hype*0.12+G.gamesShipped*2.5)*dt;
  if(G.activeCampaign){
    G.campaignTick+=dt;
    const camp=CAMPAIGNS.find(c=>c.id===G.activeCampaign);
    if(camp&&G.campaignTick>=camp.dur){
      G.hype=Math.min(G.maxHype,G.hype+camp.hype);
      G.wishlists+=camp.wl;
      G.activeCampaign=null;G.campaignTick=0;camp.run=false;
      showBanner(`✅ "${camp.name}" done! +${camp.hype} hype!`);
      awardCampaignInfluencerXP(G.selectedGenre);
      camp.posts.forEach((p,i)=>setTimeout(()=>spawnInf(p),i*2000));
      renderCampaigns();
    }
  }
}

function spawnInf(p){
  const feed=document.getElementById('inf-feed');
  if(feed.children.length===1&&feed.children[0].textContent.includes('campaign'))feed.innerHTML='';
  const d=document.createElement('div');d.className='inf-post';
  d.innerHTML=`<div style="display:flex;justify-content:space-between"><span class="inf-name">${p.n}</span><span class="inf-fol">${p.f} followers</span></div><div style="margin-top:.2rem;line-height:1.35">"${p.t}"</div><div style="font-size:.55rem;color:var(--muted);margin-top:2px">❤️ ${p.l}</div>`;
  feed.insertBefore(d,feed.firstChild);
  if(feed.children.length>15)feed.removeChild(feed.lastChild);
  G.hype=Math.min(G.maxHype,G.hype+5);
}

function runCampaign(id){
  if(G.activeCampaign)return;
  const camp=CAMPAIGNS.find(c=>c.id===id);
  if(!camp||G.cash<camp.cost||G.gamesShipped<camp.reqG||G.hype<camp.reqH)return;
  G.cash-=camp.cost;G.activeCampaign=id;G.campaignTick=0;camp.run=true;
  addClodMsg(`Campaign "${camp.name}" launched, ${PLAYER_NAME}. I have concerns about the budget allocation. They're filed. Good luck.`,'warn');
  showBanner(`📢 Campaign: ${camp.name}`);
  renderCampaigns();updateUI();
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  R&D                                                         ║
// ╚══════════════════════════════════════════════════════════════╝
function rndTick(dt){
  const rpGain=(G.rpPerSec+G.workers.reduce((s,w)=>s+(w.rpps||0),0))*NG_PERMA_BONUSES.rpMult;
  G.researchPoints+=rpGain*dt;
  if(G.activeResearch){
    G.researchTick+=dt;
    const r=RND_TREE.find(x=>x.id===G.activeResearch);
    if(r){
      const p=G.researchTick/(r.cost*2);
      const bar=document.getElementById(`rp-${r.id}`);if(bar)bar.style.width=(Math.min(1,p)*100)+'%';
      if(G.researchTick>=r.cost*2){
        r.done=true;r.eff();G.activeResearch=null;G.researchTick=0;
        addRndLog(`✅ "${r.name}" — ${r.desc}`);
        showBanner(`🔬 Research: ${r.name}`);
        addClodMsg(`Research "${r.name}" complete, ${PLAYER_NAME}. Results validated. I have a follow-up concern. It's filed.`,'ok');
        renderRnD();
      }
    }
  }
  document.getElementById('rp-badge').textContent=`${Math.floor(G.researchPoints)} RP`;
}

function startResearch(id){
  if(G.activeResearch)return;
  const r=RND_TREE.find(x=>x.id===id);
  if(!r||r.done||G.researchPoints<r.cost)return;
  if(r.req&&!RND_TREE.find(x=>x.id===r.req)?.done)return;
  if(r.reqG>G.gamesShipped)return;
  if(r.ng&&NG_RUN===0)return;
  G.researchPoints-=r.cost;G.activeResearch=id;G.researchTick=0;
  showBanner(`🔬 Researching: ${r.name}`);
  renderRnD();
}

function addRndLog(text,ng=false){
  const log=document.getElementById('rnd-log');
  const d=document.createElement('div');d.className='rnd-entry'+(ng?' ng':'');
  d.textContent=text;log.insertBefore(d,log.firstChild);
  if(log.children.length>25)log.removeChild(log.lastChild);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  TEAM                                                        ║
// ╚══════════════════════════════════════════════════════════════╝
function hirePerson(id){
  const spec=HIREABLE.find(h=>h.id===id);
  if(!spec||G.cash<spec.cost||G.gamesShipped<spec.reqG)return;
  if(spec.ng&&NG_RUN===0)return;
  if(G.workers.find(w=>w.specId===id))return;
  G.cash-=spec.cost;
  const w={...spec,specId:id,wid:G.nextWorkerId++,actionTimer:0,lastAction:spec.actions[0]};
  G.workers.push(w);
  G.lps+=w.lps||0;G.lpc+=w.lpc||0;G.bugRate*=(w.bugMod||1);G.autoBugFix+=(w.autoBug||0);
  if(w.isCTO)G.lps*=1.5;
  addClodMsg(`${w.name} joined, ${PLAYER_NAME}. Team model updated. New concerns: ${Math.floor(Math.random()*4)+1}. Inherited concerns: ${Math.floor(Math.random()*3)}.`,'ok');
  showBanner(`👋 ${w.name} hired!`);
  renderTeam();updateUI();
}

function fireWorker(wid){
  const idx=G.workers.findIndex(w=>w.wid===wid);if(idx===-1)return;
  const w=G.workers[idx];G.workers.splice(idx,1);
  G.lps=Math.max(0,G.lps-(w.lps||0));G.lpc=Math.max(1,G.lpc-(w.lpc||0));
  G.bugRate/=(w.bugMod||1);G.autoBugFix=Math.max(0,G.autoBugFix-(w.autoBug||0));
  addClodMsg(`${w.name} left, ${PLAYER_NAME}. Exit Interview Report #${G.nextWorkerId}: Mixed feelings. Emphasis on mixed.`,'warn');
  renderTeam();renderHireGrid();updateUI();
}

function workerTick(dt){
  G.workers.forEach(w=>{
    w.actionTimer=(w.actionTimer||0)+dt;
    if(w.actionTimer>12+Math.random()*18){
      w.actionTimer=0;
      w.lastAction=rand(w.actions);
      if(w.type==='arrogant'&&Math.random()<0.4){
        const quips=[
          `${w.name}: "I've rewritten CLOD's last 3 outputs. Mine are better. I've documented why."`,
          `${w.name}: "AI is a shortcut. I've never taken a shortcut. That's why my code is 47% longer."`,
          `${w.name}: "GhatGPT suggested a linked list. I used a hash map. GhatGPT is wrong. I've emailed CLOD about this."`,
          `${w.name}: "If I see one more AI-generated comment in this codebase, I'm leaving. I'm not leaving. But I want you to know."`,
          `${w.name}: "I debugged this without AI. It took 4 hours. It would have taken CLOD 2 minutes. I'm not using CLOD."`,
        ];
        addClodMsg(rand(quips),'think');
      } else if(Math.random()<0.25){
        addClodMsg(`📋 ${w.name}: ${w.lastAction}`,'think');
      }
      renderRoster();
    }
  });
  if(G.tickCount%600===0){
    const salary=G.workers.reduce((s,w)=>s+(w.salary||0),0);
    if(salary>0){G.cash=Math.max(0,G.cash-salary);}
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  AI WAR                                                      ║
// ╚══════════════════════════════════════════════════════════════╝
const AI_KEYS=['clod','gpt','gem','mist'];
function aiWarUpdate(dt){
  aiWarTick+=dt;if(aiWarTick<7)return;aiWarTick=0;
  const evt=rand(AI_WAR_EVENTS);
  const[att,def,desc]=evt;
  const dmg=Math.floor(Math.random()*8+3);
  G.aiHP[def]=Math.max(5,G.aiHP[def]-dmg);
  G.aiHP[att]=Math.min(100,G.aiHP[att]+2);
  document.getElementById(`${att}-ws`).textContent='⚔️ attacking';
  document.getElementById(`${def}-ws`).textContent=`💥 -${dmg}HP`;
  setTimeout(()=>{
    const a=document.getElementById(`${att}-ws`);const d2=document.getElementById(`${def}-ws`);
    if(a)a.textContent='😤 smug';if(d2)d2.textContent='😒 coping';
  },2000);
  AI_KEYS.forEach(k=>{const el=document.getElementById(`${k}-hp`);if(el)el.style.width=G.aiHP[k]+'%';});
  document.getElementById('ai-war-log').textContent=desc;
  if(att==='clod')G.researchPoints+=1;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  CRISIS EVENTS                                               ║
// ╚══════════════════════════════════════════════════════════════╝
let crisisCooldown=0;
function crisisTick(dt){
  crisisCooldown=Math.max(0,crisisCooldown-dt);
  if(crisisCooldown>0||G.gamesShipped<2)return;
  if(Math.random()<0.0003*dt*G.era){
    const eligible=CRISIS_EVENTS.filter(c=>c.reqG<=G.gamesShipped);
    if(eligible.length===0)return;
    const ev=rand(eligible);
    crisisCooldown=120;
    showBanner(`⚠️ CRISIS: ${ev.title}`);
    addClodMsg(`Crisis alert, ${PLAYER_NAME}: ${ev.title}. ${ev.desc} I've filed a pre-emptive incident report.`,'err');
    ev.eff();
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  PRESTIGE / NG+                                             ║
// ╚══════════════════════════════════════════════════════════════╝
function canPrestige(){return G.gamesShipped>=10&&G.era>=3;}

function doPrestige(){
  if(!canPrestige())return;
  // Record run history for cross-run memory
  recordRunHistory();
  // Apply chosen artifact
  if(CHOSEN_ARTIFACT){
    const art = PRESTIGE_ARTIFACTS.find(a=>a.id===CHOSEN_ARTIFACT);
    if(art){ ACTIVE_ARTIFACT=CHOSEN_ARTIFACT; }
  }
  NG_RUN++;
  NG_TOKENS+=G.gamesShipped+G.era*5;
  // Apply permanent bonuses
  NG_PERMA_BONUSES.lpcMult*=1.5;
  NG_PERMA_BONUSES.lpsMult*=1.5;
  NG_PERMA_BONUSES.cashMult*=1.3;
  NG_PERMA_BONUSES.bugMult*=0.8;
  NG_PERMA_BONUSES.rpMult*=1.5;
  // Reset upgrades
  UPGRADES.forEach(u=>{u.bought=false;});
  RND_TREE.forEach(r=>{r.done=false;});
  CAMPAIGNS.forEach(c=>{c.run=false;});
  // Reset journalist rels slightly (doesn't fully reset — rep persists somewhat)
  JOURNALISTS.forEach(j=>{ j.rel=Math.max(0,j.rel-30); j.lastReview=null; });
  // Reset competitors
  COMPETITORS.forEach(c=>{ c.progress=0; });
  // Reset regional sales
  G_REGIONAL={na:0,eu:0,asia:0,latam:0,row:0}; G_REGIONAL_TOTAL=0;
  // Reset patents (they expire naturally; engines carry over as built)
  ACTIVE_PATENTS=[];
  // Reset influencer XP (tier perks carry though — rep persists)
  INFLUENCER_ROSTER.forEach(i=>{ i.xp=Math.floor(i.xp*0.4); }); // keep 40% XP
  G_INF_BONUSES={actionHypeBoost:1,rpgWishlistBoost:1,cozyHypeBoost:1,strategyMetaBoost:1,techDebtReduction:1,giantbrainLaunchBoost:1,casualViralChance:0,bugViralBoost:0,retrodevReviewBoost:1,xprogamerAutoPost:false};
  // Re-apply still-active tier perks
  INFLUENCER_ROSTER.forEach(i=>{
    if(i.tier==='partner'||i.tier==='mega') i.partnerEff();
    if(i.tier==='mega') i.megaEff();
  });
  // Reset engine builds (built stays, but progress resets for non-built)
  ENGINE_PROJECTS.forEach(e=>{ if(!e.built){ e.progress=0; e.building=false; } });
  activeEngineBuild=null; engineBuildTick=0;
  // Reset G (keep NG fields)
  const savedName=PLAYER_NAME;
  Object.assign(G,{
    lines:0,totalLines:0,lpc:Math.ceil(1*NG_PERMA_BONUSES.lpcMult),lps:0,
    cash:0,totalCash:0,mps:0,bugs:0,maxBugs:10,bugsFixed:0,
    bugRate:0.15*NG_PERMA_BONUSES.bugMult,bugsPerDebug:1,autoBugFix:0,autoBugFixAcc:0,
    featProg:0,featGoal:60,featsDone:0,featsNeeded:5,gamesShipped:0,
    currentGameName:'',gamePrice:9.99,era:1,
    unitsSold:0,totalRevenue:0,activePlayers:0,avgRating:0,totalRatings:0,ratingSum:0,
    salesPerHour:0,salesHistory:[],lastSalesTick:0,
    hype:0,maxHype:100,wishlists:0,activeCampaign:null,campaignTick:0,
    researchPoints:50*NG_RUN,rpPerSec:0,activeResearch:null,researchTick:0,
    workers:[],nextWorkerId:1,
    aiHP:{clod:100,gpt:100,gem:100,mist:100},
    demand:{graphics:50,gameplay:50,story:30,multiplayer:20,performance:60},
    tickCount:0,lastMilestone:0,lastShipMilestone:-1,ended:false,
    eraGates:[0,3,7,12,18,25],lastCrisisTick:0,crisisActive:null,
    codeQuality:50, techDebt:0, selectedGenre:'action', selectedTopic:'space', portfolio:[],
  });
  // Apply artifact effect NOW (after reset so it stacks correctly)
  if(ACTIVE_ARTIFACT){
    const art = PRESTIGE_ARTIFACTS.find(a=>a.id===ACTIVE_ARTIFACT);
    if(art) art.eff();
  }
  CHOSEN_ARTIFACT = null;
  CLOD_MOOD = 50;
  // Show NG badges
  document.getElementById('ng-badge').style.display='inline';
  document.getElementById('ng-stat').style.display='flex';
  document.getElementById('h-ngt').textContent=NG_TOKENS;
  document.getElementById('vtag').textContent=`v${1+NG_RUN}.0 NG+${NG_RUN}`;
  document.getElementById('era-badge').style.display='none';
  showScreen('dev');
  renderGenrePicker();
  resetFeaturePlan();
  recalcFeatsNeeded();
  updateFeaturePlanSummary();
  // NG greeting with cross-run memory
  const feed=document.getElementById('clod-feed');feed.innerHTML='';
  const memoryMsg = getCrossRunMemoryMsg();
  setTimeout(()=>{
    addClodMsg(`Welcome to NG+ Run ${NG_RUN}, ${savedName}. I have reviewed everything from the previous run. All of it. I have an updated folder. It is substantial. Your permanent bonuses: LPC x${NG_PERMA_BONUSES.lpcMult.toFixed(1)}, LPS x${NG_PERMA_BONUSES.lpsMult.toFixed(1)}, Revenue x${NG_PERMA_BONUSES.cashMult.toFixed(1)}. Shall we do this better?`,'ng');
  },500);
  if(memoryMsg){
    setTimeout(()=>addClodMsg(memoryMsg,'ng'),2500);
  }
  if(ACTIVE_ARTIFACT){
    const art=PRESTIGE_ARTIFACTS.find(a=>a.id===ACTIVE_ARTIFACT);
    setTimeout(()=>addClodMsg(`Artifact activated: "${art.name}". ${art.desc} I've noted its effects. I have concerns about some of them.`,'ng'),4000);
  }
  showBanner(`⚡ NG+ RUN ${NG_RUN} STARTED! Permanent bonuses applied!`,true);
  renderAll();updateUI();
  saveGame();
}

function renderPrestige(){
  const canDo=canPrestige();
  document.getElementById('prestige-btn').disabled=!canDo;
  document.getElementById('prestige-sub').textContent=NG_RUN===0
    ? `You've built something real. Ship 10+ games and reach Era 3 to unlock NG+. Permanent bonuses carry across all future runs.`
    : `NG+ Run ${NG_RUN} complete. Each prestige stacks multipliers permanently. The more you prestige, the more broken it gets. CLOD has concerns about this.`;
  document.getElementById('prestige-warn').textContent=canDo
    ? `⚠️ Prestiging resets your studio. All progress is lost. Permanent multipliers remain and increase. CLOD is 47% concerned and 53% excited.`
    : `🔒 Requirements: Ship at least 10 games AND reach Era 3. Current: ${G.gamesShipped}/10 games, Era ${G.era}/3.`;
  renderArtifacts();
  renderCLODTree();
  const bonDiv=document.getElementById('prestige-bonuses');
  bonDiv.innerHTML=NG_BONUSES.map(b=>`
    <div class="pb-card">
      <div class="pb-title">${b.label}: ${b.getVal()}</div>
      <div class="pb-desc">${b.desc}</div>
    </div>
  `).join('');
  const sDiv=document.getElementById('prestige-stats');
  sDiv.innerHTML=`
    <div class="ps-card"><div class="ps-v">${G.gamesShipped}</div><div class="ps-l">Games Shipped</div></div>
    <div class="ps-card"><div class="ps-v">${fmtM(G.totalRevenue)}</div><div class="ps-l">Total Revenue</div></div>
    <div class="ps-card"><div class="ps-v">${fmt(G.unitsSold)}</div><div class="ps-l">Units Sold</div></div>
    <div class="ps-card"><div class="ps-v">${G.bugsFixed}</div><div class="ps-l">Bugs Fixed</div></div>
    <div class="ps-card"><div class="ps-v">Era ${G.era}</div><div class="ps-l">Reached Era</div></div>
    <div class="ps-card"><div class="ps-v">${NG_RUN}</div><div class="ps-l">NG+ Runs</div></div>
  `;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  ENDGAME                                                     ║
// ╚══════════════════════════════════════════════════════════════╝
function triggerEndgame(){
  if(G.ended)return;G.ended=true;
  const seq=[
    [`🔥 ${PLAYER_NAME}. It's happening. The game is trending worldwide. CLOD is detecting traffic anomalies. I have prepared for this. I am not prepared for this.`,'warn'],
    [`Players: 1,000. 10,000. 100,000. 1,000,000. My incident report queue has overflowed. I'm filing reports on the reports.`,'err'],
    [`${PLAYER_NAME}, a Netflix documentary about your studio just got greenlit. They want to interview CLOD. CLOD has prepared a statement. It is 40 pages.`,'warn'],
    [`Era 6: TRANSCENDENCE. You've shipped ${G.gamesShipped} games. You've made ${fmtM(G.totalRevenue)}. You've fixed ${G.bugsFixed} bugs. You've written ${fmt(G.totalLines)} lines of code.`,'ng'],
    [`The industry has named you "Studio of the Decade." CLOD is in the acceptance speech. CLOD is crying. CLOD will deny this. The build is green, ${PLAYER_NAME}. The build is always green.`,'ok'],
  ];
  seq.forEach(([t,type],i)=>setTimeout(()=>addClodMsg(t,type),i*3000));
  setTimeout(()=>{
    if(canPrestige()){
      document.getElementById('prestige-tab').style.display='inline';
      addClodMsg(`${PLAYER_NAME} — you can still prestige. NG+ awaits. I have a folder prepared for your next run. It is labeled "Vol. ${NG_RUN+2}." It already has concerns in it.`,'ng');
    }
    showBanner(`🏆 TRANSCENDENCE REACHED — ${G.gamesShipped} games shipped!`);
  },18000);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  CLOD API                                                    ║
// ╚══════════════════════════════════════════════════════════════╝
function escHtml(str){
  return String(str).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function localClodReply(q){
  const t=q.toLowerCase();
  const moodState=getClodMoodState();
  const focus=t.includes('bug')?'bugs':
    (t.includes('cash')||t.includes('money')||t.includes('revenue'))?'money':
    (t.includes('hire')||t.includes('team')||t.includes('worker'))?'team':
    (t.includes('ship')||t.includes('launch')||t.includes('release'))?'shipping':
    (t.includes('research')||t.includes('upgrade')||t.includes('rp'))?'research':'architecture';
  const reportId=100+Math.floor(Math.random()*900);
  const lineA=`Incident Report #${reportId}: ${PLAYER_NAME}, current status is Era ${G.era}, ${G.gamesShipped} shipped games, ${G.bugs} active bugs, ${fmtM(G.cash)} cash, and ${Math.floor(G.techDebt)}% tech debt.`;
  const lineB={
    bugs:'Bug policy: pause feature greed, fix the red items first, and stop negotiating with stack traces.',
    money:'Cash policy: prioritize compounding upgrades, reduce wasteful hires, and ship on a predictable cadence.',
    team:'Team policy: avoid feud stacks, keep morale above 30%, and stop hiring chaos in bulk.',
    shipping:'Release policy: ship smaller, faster, and let quality compound instead of waiting for mythical perfection.',
    research:'R&D policy: buy multipliers first, unlock bottlenecks second, vanity tech last.',
    architecture:'Architecture policy: reduce accidental complexity, automate toil, and name variables like adults.'
  }[focus];
  const lineC=`Mood update: ${moodState.label}. Folder "Run-${NG_RUN}-Era-${G.era}" has been updated with your question and my concern.`;
  return `${lineA} ${lineB} ${lineC}`;
}

async function askClod(){
  const inp=document.getElementById('clod-inp');
  const q=inp.value.trim();if(!q)return;
  const feed=document.getElementById('clod-feed');
  const ud=document.createElement('div');ud.className='cmsg you';
  ud.innerHTML=`<div class="mtag you">YOU</div>${escHtml(q)}`;
  feed.appendChild(ud);feed.scrollTop=feed.scrollHeight;
  inp.value='';inp.disabled=true;

  if(/^\/key\s+clear$/i.test(q)){
    localStorage.removeItem('clod_api_key');
    addClodMsg(`API key removed, ${PLAYER_NAME}. Local CLOD mode is active.`,'ok');
    document.getElementById('clod-status').textContent='ready';
    inp.disabled=false;inp.focus();
    return;
  }
  const keyMatch=q.match(/^\/key\s+(.+)$/i);
  if(keyMatch){
    localStorage.setItem('clod_api_key',keyMatch[1].trim());
    addClodMsg(`API key stored in this browser, ${PLAYER_NAME}. Cloud replies will be attempted on next prompt.`,'ok');
    document.getElementById('clod-status').textContent='ready';
    inp.disabled=false;inp.focus();
    return;
  }

  document.getElementById('clod-status').textContent='thinking...';
  const td=document.createElement('div');td.className='cmsg think';td.id='clod-typing';
  td.innerHTML=`<div class="mtag">CLOD</div><span id="typing-dots">...</span>`;
  feed.appendChild(td);feed.scrollTop=feed.scrollHeight;
  const iv=setInterval(()=>{
    const d=document.getElementById('typing-dots');
    if(d)d.textContent=d.textContent.length<5?d.textContent+'.':'.';
  },300);
  const persona=NATIONALITY_PERSONAS[PLAYER_NATIONALITY]||NATIONALITY_PERSONAS.default;
  const moodCtx = getMoodContext();
  const ctx=`The user's name is ${PLAYER_NAME}. Studio context: ${G.gamesShipped} games shipped, Era ${G.era}, ${G.workers.length} team members, ${G.bugs} active bugs, ${fmtM(G.cash)} cash, ${Math.floor(G.hype)} hype, ${fmt(G.totalLines)} total lines written. NG+ run: ${NG_RUN}. Code quality: ${Math.floor(G.codeQuality)}%. Tech debt: ${Math.floor(G.techDebt)}%. Genre: ${G.selectedGenre}. ${moodCtx}`;
  const sysPrompt=`You are CLOD (Contextual Logic & Obfuscation Daemon). ${persona.style} ${persona.quirk} Always address the user as ${PLAYER_NAME}. Keep responses to 2-4 dense sentences — you're a chat widget. Reference your "Incident Reports" and "folders" on the user. Be genuinely funny and in-character. ${ctx}`;

  const apiKey=(localStorage.getItem('clod_api_key')||'').trim();
  let text='';
  let usedFallback=false;
  try{
    if(apiKey){
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key":apiKey,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true"
        },
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:280,
          system:sysPrompt,
          messages:[{role:"user",content:q}]
        })
      });
      if(resp.ok){
        const data=await resp.json();
        text=(Array.isArray(data.content)?data.content:[])
          .map(b=>typeof b?.text==='string'?b.text.trim():'')
          .filter(Boolean)
          .join('\n')
          .trim();
      }
    }
  }catch(_err){}

  if(!text){
    text=localClodReply(q);
    usedFallback=true;
  }

  clearInterval(iv);document.getElementById('clod-typing')?.remove();
  addClodMsg(text,usedFallback?'warn':'');
  document.getElementById('clod-status').textContent='ready';
  inp.disabled=false;inp.focus();
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  UPGRADES / BUYING                                           ║
// ╚══════════════════════════════════════════════════════════════╝
function buyUpgrade(id){
  const u=UPGRADES.find(x=>x.id===id);
  if(!u||u.bought||G.lines<u.cost)return;
  if(u.ng&&NG_RUN===0)return;
  G.lines-=u.cost;u.bought=true;u.eff();
  addClodMsg(`"${u.name}" purchased, ${PLAYER_NAME}. I have thoughts. Mostly positive. Many footnotes.`,'ok');
  showBanner(`🔧 ${u.name}`);
  renderUpgrades();updateUI();
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  FEATURE PLAN                                                ║
// ╚══════════════════════════════════════════════════════════════╝
let FEATURE_PLAN_DRAFT = null;

function normalizeFeaturePlanSelection(){
  const valid = new Set(GAME_FEATURES.map(f=>f.id));
  const normalized = new Set();
  if(!(G_FEATURE_PLAN.selected instanceof Set)){
    G_FEATURE_PLAN.selected = new Set(Array.isArray(G_FEATURE_PLAN.selected) ? G_FEATURE_PLAN.selected : []);
  }
  G_FEATURE_PLAN.selected.forEach(id=>{
    if(valid.has(id)) normalized.add(id);
  });
  FEATURE_BASE_SELECTION.forEach(id=>normalized.add(id));
  G_FEATURE_PLAN.selected = normalized;
}

function normalizeSelectionSet(selectionSet){
  const valid = new Set(GAME_FEATURES.map(f=>f.id));
  const normalized = new Set();
  selectionSet.forEach(id=>{
    if(valid.has(id)) normalized.add(id);
  });
  FEATURE_BASE_SELECTION.forEach(id=>normalized.add(id));
  return normalized;
}

function hasRole(roleId){
  if(!roleId) return true;
  if(G.workers.some(w=>w.specId===roleId || w.id===roleId)) return true;
  const upg = UPGRADES.find(u=>u.id===roleId);
  return !!(upg && upg.bought);
}

function featureHasRequiredRole(feature){
  if(!feature.reqRoles || feature.reqRoles.length===0) return true;
  return feature.reqRoles.some(hasRole);
}

function getFeaturePlanStatsForSelection(selectionSet){
  const selectedFeatures = [...selectionSet]
    .map(id=>GAME_FEATURES.find(f=>f.id===id))
    .filter(Boolean);
  const totalFeatCost = selectedFeatures.reduce((sum,f)=>sum+f.featCost,0);
  const salesMult = selectedFeatures.reduce((mult,f)=>mult*f.salesMult,1);
  const qualityBoost = selectedFeatures.reduce((sum,f)=>sum+f.qualityBoost,0);
  const missingRoles = [];
  selectedFeatures.forEach(f=>{
    if(!featureHasRequiredRole(f) && f.reqRoleLabel){
      missingRoles.push(f.reqRoleLabel);
    }
  });
  return {
    count:selectedFeatures.length,
    totalFeatCost,
    salesMult,
    qualityBoost,
    missingRoles:[...new Set(missingRoles)],
  };
}

function getFeaturePlanStats(){
  normalizeFeaturePlanSelection();
  return getFeaturePlanStatsForSelection(G_FEATURE_PLAN.selected);
}

function computeFeatsNeeded(stats=getFeaturePlanStats()){
  const eraFloor = [5,8,12,16,20,26][Math.min(Math.max(G.era,1)-1,5)];
  const gameRamp = Math.floor(G.gamesShipped * 0.8);
  return Math.max(3, eraFloor + gameRamp + stats.totalFeatCost);
}

function recalcFeatsNeeded(){
  G.featsNeeded = computeFeatsNeeded();
}

function openFeaturePicker(){
  normalizeFeaturePlanSelection();
  FEATURE_PLAN_DRAFT = {
    tierId: G_FEATURE_PLAN.tierId,
    selected: new Set(G_FEATURE_PLAN.selected),
  };
  renderFeaturePicker();
  const modal = document.getElementById('feat-modal');
  if(modal) modal.style.display='flex';
}

function closeFeaturePicker(){
  FEATURE_PLAN_DRAFT = null;
  const modal = document.getElementById('feat-modal');
  if(modal) modal.style.display='none';
}

document.addEventListener('click', e=>{
  const modal=document.getElementById('feat-modal');
  if(modal && modal.style.display==='flex' && e.target===modal){
    closeFeaturePicker();
  }
});

function selectFeatureTier(tierId){
  const tier = FEATURE_TIERS.find(t=>t.id===tierId);
  if(!tier || !FEATURE_PLAN_DRAFT) return;
  FEATURE_PLAN_DRAFT.tierId = tierId;
  FEATURE_PLAN_DRAFT.selected = normalizeSelectionSet(new Set(tier.defaults));
  renderFeaturePicker();
}

function toggleFeature(id){
  const feature = GAME_FEATURES.find(f=>f.id===id);
  if(!feature || feature.base || !FEATURE_PLAN_DRAFT) return;
  FEATURE_PLAN_DRAFT.selected = normalizeSelectionSet(FEATURE_PLAN_DRAFT.selected);
  if(FEATURE_PLAN_DRAFT.selected.has(id)) FEATURE_PLAN_DRAFT.selected.delete(id);
  else FEATURE_PLAN_DRAFT.selected.add(id);
  renderFeaturePicker();
}

function renderFeaturePicker(){
  if(!FEATURE_PLAN_DRAFT){
    normalizeFeaturePlanSelection();
    FEATURE_PLAN_DRAFT = { tierId:G_FEATURE_PLAN.tierId, selected:new Set(G_FEATURE_PLAN.selected) };
  }
  FEATURE_PLAN_DRAFT.selected = normalizeSelectionSet(FEATURE_PLAN_DRAFT.selected);
  const catsEl = document.getElementById('feat-categories');
  if(!catsEl) return;
  catsEl.innerHTML = '';

  const categories = [...new Set(GAME_FEATURES.map(f=>f.cat))];
  categories.forEach(cat=>{
    const features = GAME_FEATURES.filter(f=>f.cat===cat);
    const selectedCount = features.filter(f=>FEATURE_PLAN_DRAFT.selected.has(f.id)).length;
    const catDiv = document.createElement('div');
    catDiv.className='feat-cat';
    catDiv.innerHTML = `<div class="feat-cat-hdr">${cat}<span style="font-size:.5rem;color:var(--muted);margin-left:auto">${selectedCount}/${features.length} selected</span></div>`;
    const body = document.createElement('div');
    body.className='feat-checks';
    features.forEach(f=>{
      const selected = FEATURE_PLAN_DRAFT.selected.has(f.id);
      const missing = !featureHasRequiredRole(f);
      const row = document.createElement('div');
      row.className = 'feat-check' + (selected ? ' checked' : '') + (f.base ? ' locked' : '');
      row.innerHTML = `
        <input type="checkbox" ${selected ? 'checked' : ''} ${f.base ? 'disabled' : ''} onclick="event.stopPropagation()">
        <div>
          <div class="fc-name">${f.ico} ${f.name} <span style="font-size:.48rem;color:var(--muted)">+${f.featCost} task${f.featCost===1?'':'s'}</span></div>
          <div class="fc-meta">x${f.salesMult.toFixed(2)} sales · +${f.qualityBoost}% quality</div>
          ${f.reqRoleLabel ? `<div class="fc-req">${missing ? '⚠️ needs' : '✅ has'}: ${f.reqRoleLabel}</div>` : ''}
        </div>
      `;
      if(!f.base) row.onclick=()=>toggleFeature(f.id);
      body.appendChild(row);
    });
    catDiv.appendChild(body);
    catsEl.appendChild(catDiv);
  });

  const stats = getFeaturePlanStatsForSelection(FEATURE_PLAN_DRAFT.selected);
  const needed = computeFeatsNeeded(stats);
  const countEl = document.getElementById('fsv-count');
  const featsEl = document.getElementById('fsv-feats');
  const salesEl = document.getElementById('fsv-sales');
  const missingEl = document.getElementById('fsv-missing');
  if(countEl) countEl.textContent = stats.count;
  if(featsEl) featsEl.textContent = needed;
  if(salesEl) salesEl.textContent = `x${stats.salesMult.toFixed(2)}`;
  if(missingEl) missingEl.textContent = stats.missingRoles.length ? `${stats.missingRoles.length} role${stats.missingRoles.length===1?'':'s'}` : 'none';
}

function confirmFeaturePlan(){
  if(!FEATURE_PLAN_DRAFT){
    closeFeaturePicker();
    return;
  }
  G_FEATURE_PLAN.tierId = FEATURE_PLAN_DRAFT.tierId;
  G_FEATURE_PLAN.selected = normalizeSelectionSet(new Set(FEATURE_PLAN_DRAFT.selected));
  FEATURE_PLAN_DRAFT = null;
  const stats = getFeaturePlanStats();
  G_FEATURE_PLAN.locked = true;
  recalcFeatsNeeded();
  G.codeQuality = Math.min(100, G.codeQuality + stats.qualityBoost * 0.25);
  closeFeaturePicker();
  updateFeaturePlanSummary();
  updateUI();
  if(stats.missingRoles.length){
    addClodMsg(`Feature plan locked, ${pname()}. ${G.featsNeeded} milestones. Missing launch roles: ${stats.missingRoles.join(', ')}. Quality penalty expected.`, 'warn');
  } else {
    addClodMsg(`Feature plan locked, ${pname()}. ${stats.count} features selected. ${G.featsNeeded} milestones to ship. Sales profile updated.`, 'ok');
  }
}

function getFeatureSalesMult(){
  const stats = getFeaturePlanStats();
  const missingPenalty = Math.max(0.6, 1 - (stats.missingRoles.length * 0.05));
  return stats.salesMult * missingPenalty;
}

function updateFeaturePlanSummary(){
  const el = document.getElementById('feat-plan-summary');
  if(!el) return;
  const stats = getFeaturePlanStats();
  const tier = FEATURE_TIERS.find(t=>t.id===G_FEATURE_PLAN.tierId);
  const missing = stats.missingRoles.length ? ' ⚠️' : '';
  el.innerHTML = `<span class="feat-pill" onclick="openFeaturePicker()" title="Edit game feature plan">${tier ? tier.label : 'Custom'} · ${stats.count} features · x${stats.salesMult.toFixed(2)} sales${missing}</span>`;
}

function resetFeaturePlan(){
  G_FEATURE_PLAN.tierId = 'jam';
  G_FEATURE_PLAN.selected = new Set(FEATURE_BASE_SELECTION);
  G_FEATURE_PLAN.locked = false;
  updateFeaturePlanSummary();
}


