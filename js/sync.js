const HOSTED = location.protocol.startsWith('http');
let pulled = false, pushTimer = null, syncState = HOSTED ? 'connecting' : 'local';

const SYNC_LABEL = { local: 'Ahmed · 2026', connecting: 'connecting…', pending: 'saving…', ok: 'synced', offline: 'offline · saved on this device' };
function setSync(s){
  syncState = s;
  const el = document.getElementById('syncSt');
  if (el) { el.textContent = SYNC_LABEL[s]; el.className = `sync-${s}`; }
  const pill = document.getElementById('syncPill');
  if (pill) { pill.className = `sync-pill sp-${s}`; pill.textContent = s === 'offline' ? 'Offline · saved on this device' : s === 'pending' ? 'Saving…' : ''; }
}
const signedOut = () => { location.href = 'login'; };
function storeLocal(){ try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} }

function queuePush(){
  if (!HOSTED || !pulled) return;
  setSync('pending');
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushState, 2000);
}
async function pushState(){
  pushTimer = null;
  const savedAt = state.savedAt;
  try {
    const r = await fetch('api/state', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state) });
    if (r.status === 401) return signedOut();
    if (!r.ok) throw new Error(r.status);
    state.syncedAt = savedAt; storeLocal();
    if (!pushTimer) setSync('ok');
  } catch { setSync('offline'); }
}

async function pullState(){
  if (!HOSTED || pushTimer) return;
  try {
    const r = await fetch('api/state', { cache: 'no-store' });
    if (r.status === 401) return signedOut();
    if (!r.ok) throw new Error(r.status);
    const remote = r.status === 200 ? await r.json() : null;
    // a device that never synced takes the server copy; otherwise the most recently saved side wins
    if (remote && (!state.syncedAt || (remote.savedAt || 0) > (state.savedAt || 0))) {
      localStorage.setItem(STORE_KEY, JSON.stringify({ ...remote, syncedAt: remote.savedAt }));
      load(); applyTheme(); pulled = true; setSync('ok'); updatePushPlan(); rerender();
      return;
    }
    pulled = true;
    if (!remote || (state.savedAt || 0) > (remote.savedAt || 0)) await pushState(); else setSync('ok');
    updatePushPlan();
  } catch { setSync('offline'); }
}

if (HOSTED && 'serviceWorker' in navigator) {
  const hadWorker = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadWorker) location.reload(); });
}
if (HOSTED) {
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pullState(); });
  addEventListener('online', pullState);
  setInterval(() => syncState === 'offline' ? pullState() : null, 60_000);
}
