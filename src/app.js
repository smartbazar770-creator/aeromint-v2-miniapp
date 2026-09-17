import "./styles.css";
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();
try { if (tg) { tg.headerColor = '#06110d'; tg.backgroundColor = '#06110d'; tg.enableClosingConfirmation?.(); } } catch {}

const API_BASE = localStorage.getItem('AEROMINT_API') || 'https://aeromint-v2-backend-production.up.railway.app';
const state = { page:'mining', me:null, dashboard:null, mining:null, tasks:[], referrals:null, transactions:[], filter:'all', loading:true, busy:false, error:'' };
const $ = (s)=>document.querySelector(s);
const esc = (v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt = (n,d=2)=>Number(n||0).toFixed(d);
const initData = ()=>tg?.initData || localStorage.getItem('telegram_init_data') || '';

async function api(path,opt={}){
  const headers={'Content-Type':'application/json',...(opt.headers||{})};
  const data=initData(); if(data) headers['X-Telegram-Init-Data']=data;
  const r=await fetch(API_BASE+path,{...opt,headers});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||d.message||`Request failed (${r.status})`);
  return d;
}
function notify(message){ try{tg?.showAlert?.(message)}catch{} if(!tg?.showAlert) alert(message); }
function setPage(p){ state.page=p; render(); window.scrollTo({top:0,behavior:'smooth'}); }
function initials(){ const n=state.me?.first_name||state.me?.username||'AeroMint'; return n.slice(0,1).toUpperCase(); }
function navItem(page,icon,label){return `<button class="nav-item ${state.page===page?'active':''}" data-page="${page}"><span>${icon}</span><small>${label}</small></button>`}

async function refresh(renderAfter=true){
  try{
    state.error='';
    const [me,dash,mining,tasks,refs,tx]=await Promise.all([
      api('/api/me'), api('/api/dashboard'), api('/api/mining'), api('/api/tasks'), api('/api/referrals'), api('/api/transactions?limit=30')
    ]);
    state.me=me; state.dashboard=dash; state.mining=mining; state.tasks=tasks.tasks||[]; state.referrals=refs; state.transactions=tx.transactions||[];
  }catch(e){ state.error=e.message||'Could not connect to AeroMint server.'; }
  finally{ state.loading=false; if(renderAfter) render(); }
}

function render(){
  const name=state.me?.first_name||state.me?.username||'AeroMint User';
  const bal=fmt(state.dashboard?.balance||state.me?.balance||0);
  document.body.innerHTML = `<div id="app"><div class="shell">
    <header class="topbar">
      <div class="brand"><img src="./assets/aeromint-logo.png" onerror="this.style.display='none'"/><div><b>AeroMint</b><span>AMT REWARDS</span></div></div>
      <div class="top-actions"><div class="mini-balance">${bal} <i>AMT</i></div><button id="refreshBtn" class="round">↻</button></div>
    </header>
    ${state.error?`<div class="error-banner">${esc(state.error)} <button id="retry">Retry</button></div>`:''}
    <main>${pageHTML(name)}</main>
    <nav class="bottom-nav">${navItem('mining','⌁','Mining')}${navItem('tasks','✓','Tasks')}${navItem('referrals','↗','Referrals')}${navItem('account','●','Account')}</nav>
  </div></div>`;
  bind();
}
function pageHTML(name){
  if(state.loading) return `<section class="page"><div class="skeleton hero"></div><div class="skeleton line"></div><div class="skeleton line short"></div><div class="skeleton card"></div></section>`;
  if(state.page==='tasks') return tasksPage();
  if(state.page==='referrals') return referralPage();
  if(state.page==='account') return accountPage(name);
  return miningPage(name);
}
function miningPage(name){
  const m=state.mining||{}; const dash=state.dashboard||{}; const p=Math.max(0,Math.min(100,Number(m.progress_percent||0)));
  const rem=Number(m.remaining_seconds||0); const done=!m.active && state.mining?.session_id;
  return `<section class="page">
    <div class="welcome-row"><div><span class="eyebrow">AEROMINT</span><h1>Welcome, ${esc(name)} 👋</h1><p>Mine AMT rewards every hour.</p></div><div class="avatar"><img src="./assets/aeromint-logo.png"><span>${initials()}</span></div></div>
    <section class="balance-hero"><div><small>AVAILABLE BALANCE</small><strong>${fmt(dash.balance||0)} <em>AMT</em></strong></div><div class="hero-glow"></div></section>
    <div class="section-head"><div><h2>Mining</h2><p>24-hour earning session</p></div>${m.active?'<span class="live">● MINING LIVE</span>':''}</div>
    <section class="mine-card">
      <div class="mine-orb ${m.active?'active':''}"><img src="./assets/aeromint-logo.png"><span>+${fmt(m.rate||1)}<small>AMT/H</small></span></div>
      <h2>${m.active?`Mining ${fmt(m.live_reward||0)} AMT`:'Start Mining'}</h2>
      <p>${m.active?'Your session is running. Keep Telegram open or come back later.':'Tap start to begin a 24-hour mining session.'}</p>
      <div class="progress"><i style="width:${p}%"></i></div>
      <div class="progress-meta"><span>${m.active?fmt(m.live_reward||0):'0.00'} / ${fmt(m.daily_max||24)} AMT</span><span>${m.active?clock(rem):'24:00:00'}</span></div>
      <button id="mineBtn" class="primary" ${state.busy?'disabled':''}>${m.active?'Sync Mining':'Start Mining'}</button>
      ${m.active?'<div class="rate-note">Rate <b>+1.00 AMT/hour</b> · Max <b>24.00 AMT</b></div>':''}
      ${done?'<div class="complete-note">✓ Mining Session Completed! You earned up to 24.00 AMT.</div>':''}
    </section>
    <div class="stats-grid">
      <div class="stat"><small>MINING RATE</small><b>+${fmt(m.rate||1)} <i>AMT/H</i></b></div>
      <div class="stat"><small>TODAY'S MINING</small><b>${fmt(dash.today_mining||0)} <i>AMT</i></b></div>
      <div class="stat"><small>TIME REMAINING</small><b>${m.active?clock(rem):'--:--:--'}</b></div>
      <div class="stat"><small>SESSION MAX</small><b>${fmt(m.daily_max||24)} <i>AMT</i></b></div>
    </div>
    <section class="section"><div class="section-head"><div><h2>Quick Tasks</h2><p>Extra AMT rewards</p></div><button class="link-btn" data-page="tasks">View all →</button></div>
      ${state.tasks.slice(0,3).map(taskCompact).join('')||'<div class="empty">No active tasks right now.</div>'}
    </section>
  </section>`;
}
function clock(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return [h,m,s].map(x=>String(x).padStart(2,'0')).join(':')}
function taskCompact(t){const done=t.completed; return `<article class="task-row"><div class="task-icon">${t.task_type==='video'?'▶':t.task_type==='daily'?'◷':'✓'}</div><div class="task-main"><b>${esc(t.title)}</b><span>+${fmt(t.reward_amt)} AMT</span></div><button class="small-go" data-task="${t.id}" ${done?'disabled':''}>${done?'Done':'Go'}</button></article>`}
function tasksPage(){
  const filters=[['all','All'],['social','Social'],['daily','Daily'],['special','Special']];
  const list=state.tasks.filter(t=>state.filter==='all'||t.category===state.filter||t.task_type===state.filter);
  return `<section class="page"><div class="title-block"><span class="eyebrow">REWARDS CENTER</span><h1>Tasks</h1><p>Complete tasks and claim AMT instantly.</p></div>
    <div class="tabs">${filters.map(([k,l])=>`<button class="${state.filter===k?'selected':''}" data-filter="${k}">${l}</button>`).join('')}</div>
    <div class="task-list">${list.length?list.map(taskCard).join(''):'<div class="empty">No tasks in this category.</div>'}</div></section>`;
}
function taskCard(t){
  const done=t.completed||t.status==='claimed'||t.status==='completed';
  const action=done?`<span class="done">✓ Done</span>`:`<button class="go" data-task="${t.id}">${t.verification_type==='none'||t.verification_type==='daily'?'Claim':'Go'}</button>`;
  return `<article class="task-card"><div class="task-icon large">${t.task_type==='video'?'▶':t.task_type==='daily'?'◷':t.task_type==='referral'?'↗':'✓'}</div><div class="task-main"><h3>${esc(t.title)}</h3><p>${esc(t.description||'Complete this task to receive your reward.')}</p><b>+${fmt(t.reward_amt)} AMT</b></div><div class="task-action">${action}</div></article>`;
}
function referralPage(){
  const r=state.referrals||{}; const link=r.referral_link||''; const q=Number(r.qualified_referrals||0);
  const ms=[[1,.5],[5,2],[10,4],[15,6],[20,8],[25,10]];
  return `<section class="page"><section class="ref-hero"><div class="ref-visual"><img src="./assets/aeromint-logo.png"><span>↗</span></div><span class="eyebrow">REFERRAL PROGRAM</span><h1>Invite Friends<br><span>& Earn AMT</span></h1><p>Share your personal link. A referral qualifies after the new user starts their first mining session.</p></section>
    <div class="ref-stats"><div><b>${r.total_referrals||0}</b><span>Total Referrals</span></div><div><b>${q}</b><span>Qualified</span></div><div><b>${fmt(r.earned||0)}</b><span>Referral AMT</span></div></div>
    <section class="card"><label>Your Referral Link</label><div class="copy-row"><input readonly value="${esc(link)}" id="refLink"><button id="copyRef">Copy</button></div><button id="shareRef" class="primary share">Share Invite Link</button></section>
    <section class="milestones"><div class="section-head"><div><h2>Referral Bonuses</h2><p>Milestones are awarded automatically.</p></div></div>${ms.map(([n,a])=>`<div class="milestone ${q>=n?'reached':''}"><span>${q>=n?'✓':'○'} ${n} qualified referral${n>1?'s':''}</span><b>+${a.toFixed(2)} AMT</b></div>`).join('')}</section>
  </section>`;
}
function accountPage(name){
  const me=state.me||{}; const tx=state.transactions||[];
  return `<section class="page"><section class="profile-card"><div class="profile-top"><div class="avatar big"><img src="./assets/aeromint-logo.png"><span>${initials()}</span></div><div><h1>${esc(name)}</h1><p>${me.username?'@'+esc(me.username):'AeroMint member'}</p></div></div><div class="account-balance"><small>AMT BALANCE</small><b>${fmt(me.balance||0)} <i>AMT</i></b></div></section>
    <div class="section-head"><div><h2>Transactions</h2><p>Your reward history</p></div></div><div class="tx-list">${tx.length?tx.map(t=>`<div class="tx"><div class="tx-icon">${t.type==='mining'?'⌁':t.type==='referral'?'↗':'✓'}</div><div class="tx-main"><b>${esc(t.description||t.type)}</b><small>${new Date(t.created_at).toLocaleString()}</small></div><strong>+${fmt(t.amount)} AMT</strong></div>`).join(''):'<div class="empty">No transactions yet.</div>'}</div>
    <div class="account-note">AMT shown here is an in-app reward balance. Withdrawal/real-money conversion is not enabled in this version.</div>
  </section>`;
}

function bind(){
  document.querySelectorAll('[data-page]').forEach(x=>x.onclick=()=>setPage(x.dataset.page));
  document.querySelectorAll('[data-filter]').forEach(x=>x.onclick=()=>{state.filter=x.dataset.filter;render()});
  $('#refreshBtn')?.addEventListener('click',()=>refresh()); $('#retry')?.addEventListener('click',()=>refresh());
  $('#mineBtn')?.addEventListener('click',async()=>{try{state.busy=true;render();await api(state.mining?.active?'/api/mining/sync':'/api/mining/start',{method:'POST'});await refresh()}catch(e){state.busy=false;notify(e.message)} });
  document.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>runTask(b.dataset.task,b));
  $('#copyRef')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#refLink').value);$('#copyRef').textContent='Copied!';setTimeout(()=>$('#copyRef').textContent='Copy',1200)}catch{notify($('#refLink').value)}});
  $('#shareRef')?.addEventListener('click',()=>{const u=state.referrals?.referral_link||'';const text=encodeURIComponent('Join AeroMint and start earning AMT rewards!');window.open(`https://t.me/share/url?url=${encodeURIComponent(u)}&text=${text}`,'_blank')});
}
async function runTask(id,btn){
  try{
    btn.disabled=true;
    const started=await api(`/api/tasks/${id}/start`,{method:'POST'});
    const task=state.tasks.find(x=>String(x.id)===String(id));
    if(task?.verification_type==='manual') { notify('এই Video Task-এর verification এখন manual। Admin verification provider সংযুক্ত না করা পর্যন্ত এটি auto-claim হবে না।'); return; }
    const v=await api(`/api/tasks/${id}/verify`,{method:'POST'});
    if(v.claimable||v.verified) await api(`/api/tasks/${id}/claim`,{method:'POST'});
    else notify(v.message||'Task verification হয়নি।');
    await refresh();
  }catch(e){notify(e.message)}finally{if(btn)btn.disabled=false}
}
setInterval(()=>{if(state.page==='mining'&&state.mining?.active){api('/api/mining/sync',{method:'POST'}).then(()=>refresh()).catch(()=>{})}},60000);
setInterval(()=>{if(state.page==='mining'&&state.mining?.active){const el=document.querySelector('.progress-meta span:last-child'); if(el) el.textContent=clock(Number(state.mining.remaining_seconds||0));}},1000);
render(); refresh();
