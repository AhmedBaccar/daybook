const BACKUP_KEEP = 30;
let backupStatus = 'unknown';

function idb(mode, fn){
  return new Promise((ok, fail) => {
    const req = indexedDB.open('daybook', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onerror = () => fail(req.error);
    req.onsuccess = () => { const tx = req.result.transaction('kv', mode), r = fn(tx.objectStore('kv'));
      tx.oncomplete = () => ok(r?.result); tx.onerror = () => fail(tx.error); };
  });
}
const backupDir = () => idb('readonly', s => s.get('backupDir'));

async function writeBackup(dir){
  const name = `daybook-${isoDay(now())}.json`;
  const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
  state.lastBackup = Date.now(); save();
  await w.write(JSON.stringify(state, null, 1)); await w.close();
  const old = [];
  for await (const [n, h] of dir.entries()) if (h.kind === 'file' && /^daybook-\d{4}-\d\d-\d\d\.json$/.test(n)) old.push(n);
  for (const n of old.sort().slice(0, -BACKUP_KEEP)) await dir.removeEntry(n);
}

async function autoBackup(force = false){
  if (HOSTED) { backupStatus = 'server'; return; }
  if (!window.showDirectoryPicker) {
    backupStatus = 'download';
    if (!state.lastBackup || now() - state.lastBackup > 7 * 864e5) { state.lastBackup = Date.now(); save(); downloadBackup(); }
    return;
  }
  let dir; try { dir = await backupDir(); } catch { dir = null; }
  if (!dir) { backupStatus = 'none'; return; }
  if (await dir.queryPermission({ mode: 'readwrite' }) !== 'granted') { backupStatus = 'paused'; return; }
  backupStatus = 'ok';
  if (force || !state.lastBackup || now() - state.lastBackup > 20 * 36e5) {
    try { await writeBackup(dir); if (force) toast(`Backed up to ${dir.name}`); }
    catch { backupStatus = 'error'; }
  }
}

async function chooseBackupDir(){
  try {
    const dir = await showDirectoryPicker({ id: 'daybook-backup', mode: 'readwrite', startIn: 'documents' });
    await idb('readwrite', s => s.put(dir, 'backupDir'));
    await autoBackup(true);
  } catch {}
  rerender();
}
async function resumeBackup(){
  const dir = await backupDir();
  if (dir && await dir.requestPermission({ mode: 'readwrite' }) === 'granted') await autoBackup();
  rerender();
}

function downloadBackup(){
  const u = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const l = document.createElement('a'); l.href = u; l.download = `daybook-${isoDay(now())}.json`; l.click(); URL.revokeObjectURL(u);
}

const lastBackupText = () => state.lastBackup ? `last backup ${countdown(new Date(state.lastBackup))}` : 'never backed up';

function backupNote(){
  if (backupStatus === 'none' && !state.backupNagOff) return `<div class="card upd-card td-note">Your data only lives in this browser. Pick a folder once and Daybook will save a copy there every day.
    <span class="td-note-btns"><button class="btn primary" data-act="backup-choose">Choose backup folder</button><button class="btn" data-act="backup-nag-off">Later</button></span></div>`;
  if (backupStatus === 'paused') return `<div class="card upd-card td-note">Daily backup is paused until you allow folder access again (Chrome asks after a restart; pick "Allow on every visit" to stop this). ${lastBackupText()}.
    <span class="td-note-btns"><button class="btn primary" data-act="backup-resume">Resume backup</button></span></div>`;
  if (backupStatus === 'error') return `<div class="card upd-card td-note" style="border-left-color:var(--red)">The last automatic backup failed (folder moved or deleted?). <span class="td-note-btns"><button class="btn primary" data-act="backup-choose">Choose folder again</button></span></div>`;
  return '';
}
