(function(){
  // UI overrides for flattening panels, host-highlight, and podium rendering
  const css = `
/* Flatten panels */
.page {
  width: 98% !important;
  max-width: 980px !important;
  max-height: 92vh !important;
  overflow-y: auto !important;
  padding: calc(18px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom)) !important;
  background: rgba(255,255,255,0.92) !important;
  border-radius: 8px !important;
  border: 1px solid rgba(0,151,167,0.08) !important;
  box-shadow: none !important;
}

/* Host highlighted player area */
#host-player-highlight { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:8px; padding:8px 0; }
#host-player-highlight .player-card { display:flex; align-items:center; gap:10px; padding:8px; border-radius:8px; background:rgba(0,188,212,0.06); border:1px solid rgba(0,188,212,0.08); }
#host-player-highlight .avatar-small { width:38px; height:38px; }

/* Podium styles */
#podium-container { display:flex; justify-content:center; align-items:flex-end; gap:18px; height:220px; margin:18px auto 12px; width:100%; max-width:760px; }
.podium-slot { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:8px; }
.podium-avatar { width:56px; height:56px; border-radius:50%; overflow:hidden; margin-bottom:8px; border:3px solid rgba(255,255,255,0.6); display:flex; align-items:center; justify-content:center; background:#fff; }
.podium-bar { width:100%; border-radius:8px 8px 6px 6px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:18px 8px; box-shadow:0 6px 12px rgba(0,0,0,0.08); color:#063847; font-weight:900; min-height:64px; }
.podium-bar.first { background: linear-gradient(180deg,#FFD54F,#FFC107); color:#4A2B00; }
.podium-bar.second { background: linear-gradient(180deg,#E0E0E0,#BDBDBD); color:#2E2E2E; }
.podium-bar.third { background: linear-gradient(180deg,#FFE7B3,#FFD180); color:#4A2B00; }
`;
  const style = document.createElement('style'); style.id='ui-overrides-styles'; style.textContent = css; document.head.appendChild(style);

  function ensureHostHighlight(){
    const hostInfo = document.getElementById('host-room-info');
    if(!hostInfo) return;
    if(!document.getElementById('host-player-highlight')){
      const div = document.createElement('div');
      div.id='host-player-highlight';
      div.className='player-grid host-highlight';
      div.setAttribute('aria-live','polite');
      div.style.marginTop='12px';
      hostInfo.appendChild(div);
    }
  }

  function updateHostHighlight(){
    ensureHostHighlight();
    const container = document.getElementById('host-player-highlight');
    if(!container) return;
    const players = window.S && window.S.players ? window.S.players : {};
    container.innerHTML = '';
    Object.entries(players).forEach(([name, info]) => {
      const avatarIdx = (info && typeof info.avatar === 'number') ? info.avatar : 0;
      const avatarSrc = (window.AVATARS && window.AVATARS[avatarIdx]) ? window.AVATARS[avatarIdx] : (window.AVATARS?window.AVATARS[0]:'');
      const card = document.createElement('div');
      card.className = 'player-card';
      card.innerHTML = `
        <div class="avatar-small" style="width:38px;height:38px;border-radius:50%;overflow:hidden;background:transparent"><img src="${avatarSrc}" alt="avatar" style="width:100%;height:100%;object-fit:cover;display:block" draggable="false"></div>
        <div style="font-size:0.95rem;font-weight:700;color:#004D73;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(name)}</div>
      `;
      container.appendChild(card);
    });
  }

  function escapeHtml(s){ return String(s).replace(/[&<>\"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[c]); }

  // Wrap existing renderWaitingRoom to add host highlight update
  function wrapRenderWaitingRoom(){
    if(typeof window.renderWaitingRoom === 'function' && !window.renderWaitingRoom.__ui_overrides_wrapped){
      const orig = window.renderWaitingRoom;
      const wrapped = function(...args){
        try{ orig.apply(this,args); }catch(e){ console.error('renderWaitingRoom original error',e); }
        try{ updateHostHighlight(); }catch(e){ console.error('updateHostHighlight error',e); }
      };
      wrapped.__ui_overrides_wrapped = true;
      window.renderWaitingRoom = wrapped;
    }
  }

  // Provide a flexible podium renderer used by end-game/host-uploads
  window.renderPodium = function(containerId, groups){
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    const left = groups[1] || { players: [] };
    const center = groups[0] || { players: [] };
    const right = groups[2] || { players: [] };
    function buildSlot(group, cls){
      const slot = document.createElement('div'); slot.className = 'podium-slot';
      const topPlayer = group.players[0];
      const avatarIdx = topPlayer ? (topPlayer.avatar || 0) : 0;
      const avatarSrc = (window.AVATARS && window.AVATARS[avatarIdx]) ? window.AVATARS[avatarIdx] : (window.AVATARS?window.AVATARS[0]:'');
      const avatar = document.createElement('div'); avatar.className='podium-avatar'; avatar.innerHTML = `<img src="${avatarSrc}" style="width:100%;height:100%;object-fit:cover;display:block">`;
      const bar = document.createElement('div'); bar.className = 'podium-bar ' + cls;
      const title = document.createElement('div'); title.style.fontSize='0.9rem'; title.style.fontWeight='900'; title.style.marginBottom='6px';
      title.textContent = group.players.length === 0 ? '—' : (group.players.length === 1 ? group.players[0].name : group.players.map(p=>p.name).join(', '));
      const points = document.createElement('div'); points.style.fontSize='0.95rem'; points.style.opacity='0.95'; points.textContent = group.players.length === 0 ? '0 pts' : `${group.players[0].score || 0} pts`;
      bar.appendChild(title); bar.appendChild(points);
      slot.appendChild(avatar); slot.appendChild(bar);
      return slot;
    }
    const leftSlot = buildSlot(left,'second');
    const centerSlot = buildSlot(center,'first');
    const rightSlot = buildSlot(right,'third');
    // size tweaks
    try{ leftSlot.querySelector('.podium-bar').style.height='120px'; }catch(e){}
    try{ centerSlot.querySelector('.podium-bar').style.height='160px'; }catch(e){}
    try{ rightSlot.querySelector('.podium-bar').style.height='120px'; }catch(e){}
    container.appendChild(leftSlot); container.appendChild(centerSlot); container.appendChild(rightSlot);
  };

  // on load / interval: ensure wrapper and initial render
  function init(){
    try{ wrapRenderWaitingRoom(); }catch(e){ console.error(e); }
    ensureHostHighlight(); updateHostHighlight();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();

  // poll for S.players changes as a fallback (listeners already call renderWaitingRoom in original code)
  let last = JSON.stringify(window.S && window.S.players ? window.S.players : {});
  setInterval(()=>{
    const cur = JSON.stringify(window.S && window.S.players ? window.S.players : {});
    if(cur !== last){ last = cur; try{ updateHostHighlight(); }catch(e){} }
  }, 700);
})();
