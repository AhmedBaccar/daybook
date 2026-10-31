function render(){
  const route = (location.hash.replace(/^#\/?/,'') || '').split('/');
  renderSide(route); renderTabs(route);
  document.body.dataset.sec = { '': 'today', prayers: 'prayers', gym: 'gym', food: 'food' }[route[0]] || 'other';
  const main = document.getElementById('main');
  main.innerHTML =
    route[0] === 's' ? pageSubject(route[1]) :
    route[0] === 'deadlines' ? pageDeadlines(route[1], route[2]) :
    route[0] === 'edit' ? pageEdit(route[1]) :
    route[0] === 'settings' ? pageSettings() :
    route[0] === 'more' ? pageMore() :
    route[0] === 'grades' ? pageGrades(route[1]) :
    route[0] === 'gym' ? pageGym(route[1], route[2]) :
    route[0] === 'prayers' ? pagePrayers(route[1]) :
    route[0] === 'food' ? pageFood(route[1]) :
    route[0] === 'jobs' ? pageJobs(route[1]) : pageDashboard();
  document.getElementById('side').classList.remove('open');
  const imp = document.getElementById('importFile');
  if (imp) imp.onchange = async e => {
    try { const data = JSON.parse(await e.target.files[0].text()); if (!Array.isArray(data.subjects)) throw 0; state = data; save(); toast('Backup restored'); render(); }
    catch { toast('Invalid backup file'); }
  };
}
function rerender(){ const y = scrollY; const open = Object.fromEntries([...document.querySelectorAll('details[id]')].map(d => [d.id, d.open]));
  render(); document.querySelectorAll('details[id]').forEach(d => { if (d.id in open) d.open = open[d.id]; }); scrollTo(0,y); }

function toast(msg, undo){
  const t = document.getElementById('toast');
  t.innerHTML = esc(msg) + (undo ? ' <button class="toast-undo">Undo</button>' : '');
  if (undo) t.querySelector('button').onclick = () => { t.classList.remove('show'); undo(); };
  t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), undo ? 4500 : 2200);
}
// puts everything back as it was just before a tap
const undoTo = snap => () => { state = JSON.parse(snap); save(); rerender(); };

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'FORM') return;
  const a = b.dataset.act, snap = JSON.stringify(state);
  if (a === 'toggle') {
    const id = b.dataset.id;
    if (state.done[id]) delete state.done[id]; else { state.done[id] = Date.now(); if (/:hw$/.test(id) || !id.includes(':w')) confetti(e.clientX, e.clientY); }
    save(); rerender();
    toast(state.done[id] ? 'Marked done' : 'Unchecked', undoTo(snap));
    const m = id.match(/^(.+):w(\d+):/);
    if (state.done[id] && m) { const s = subj(m[1]); if (s) { const it = itemsFor(s,+m[2]); if (it.length && it.every(x=>isDone(x.id))) { confetti(innerWidth/2, innerHeight/3, 120); toast(`Week ${m[2]} of ${s.name} complete`); } } }
  }
  if (a === 'delx') { const L = state.extras[b.dataset.s]?.[b.dataset.w]; if (L) { state.extras[b.dataset.s][b.dataset.w] = L.filter(x => x.id !== b.dataset.id); delete state.done[b.dataset.id]; save(); rerender(); } }
  if (a === 'remind') { const id = b.dataset.id;
    location.hash = state.myDeadlines.some(d => d.id === id) ? `#/deadlines/${encodeURIComponent(id)}` : `#/deadlines/new/${encodeURIComponent(id)}`; }
  // a reminder made from a course item shares its id (and so its tick): keep the item's tick when deleting it
  if (a === 'mydl-del') { state.myDeadlines = state.myDeadlines.filter(d => d.id !== b.dataset.id); if (b.dataset.id.startsWith('my-')) delete state.done[b.dataset.id];
    save(); updatePushPlan(); location.hash = '#/deadlines'; toast('Deleted', undoTo(snap)); }
  if (a === 'weekall') { const s = subj(b.dataset.s), items = itemsFor(s, +b.dataset.w), all = items.every(x=>isDone(x.id));
    for (const it of items) all ? delete state.done[it.id] : (state.done[it.id] ||= Date.now()); save(); rerender(); }
  if (a === 'addrow') { document.getElementById(b.dataset.to).insertAdjacentHTML('beforeend', window.__tpl[b.dataset.t]); }
  if (a === 'rmrow') b.closest('[data-row]').remove();
  if (a === 'jump') { const d = document.getElementById('w'+b.dataset.w); if (d) { d.open = true; d.scrollIntoView({behavior:'smooth', block:'start'}); } }
  if (a === 'delsubj') { if (confirm('Delete this subject and its checklist?')) { state.subjects = state.subjects.filter(s => s.id !== b.dataset.id); save(); location.hash = '#/'; } }
  if (a === 'upd-ok') { state.seenUpdate = b.dataset.k; save(); rerender(); }
  if (a === 'job-add') { const j = newJob(); state.jobs.push(j); save(); location.hash = `#/jobs/${j.id}`; setTimeout(() => document.querySelector(`[data-job=company][data-id="${j.id}"]`)?.focus(), 50); }
  if (a === 'job-del') { const j = job(b.dataset.id); if (j && confirm(`Delete ${j.company || 'this application'}?`)) {
    state.jobs = state.jobs.filter(x => x !== j);
    if (j.source === 'seed') (state.jobsDismissed ||= []).push(j.id);
    save(); location.hash = '#/jobs'; } }
  if (a === 'pray') {
    const iso = b.dataset.d, day = state.prayers[iso] ||= {}, p = b.dataset.p;
    if (day[p]) delete day[p];
    else { day[p] = Date.now(); if (prayCount(iso) === 5) confetti(e.clientX, e.clientY, 80); }
    const name = PRAYERS.find(x => x[0] === p)[1];
    toast(prayCount(iso) === 5 && day[p] ? 'All five prayers done, alhamdulillah' : `${name} ${day[p] ? 'ticked' : 'unticked'}`, undoTo(snap));
    if (!Object.keys(day).length) delete state.prayers[iso];
    save(); rerender();
  }
  if (a === 'push-on') enablePush();
  if (a === 'push-test') testPush();
  if (a === 'backup-choose') chooseBackupDir();
  if (a === 'backup-resume') resumeBackup();
  if (a === 'backup-now') autoBackup(true).then(rerender);
  if (a === 'backup-nag-off') { state.backupNagOff = true; save(); rerender(); }
  if (a === 'job-track') { state.jobsTrack = b.dataset.k; save(); rerender(); }
  if (a.startsWith('gym-')) {
    const G = state.gym, d = G.days[+b.dataset.d], e = +b.dataset.e;
    if (a === 'gym-done') {
      const today = isoDay(now()), i = G.log.findIndex(l => l.dayId === d.id && l.date === today);
      if (i >= 0) G.log.splice(i, 1); else { G.log.push({ date: today, dayId: d.id, sets: Object.fromEntries(d.exercises.map(x => [x.id, x.sets])) }); confetti(e.clientX ?? innerWidth/2, innerHeight/3); toast(`${d.name} logged`, undoTo(snap)); }
    }
    if (a === 'gym-wlog') {
      const kg = parseFloat(String(document.getElementById('gwKg')?.value).replace(',', '.'));
      if (!(kg > 20 && kg < 400)) { toast('Enter your weight in kg'); return; }
      const today = isoDay(now()); G.weights ||= [];
      const w = G.weights.find(x => x.date === today);
      if (w) w.kg = kg; else G.weights.push({ date: today, kg });
      G.weights.sort((p, q) => p.date < q.date ? -1 : 1); toast(`${kg} kg logged`);
    }
    if (a === 'gym-wdel') G.weights.splice(+b.dataset.i, 1);
    if (a === 'gym-addex') d.exercises.push({ id: uid(), name: '', fr: '', sets: '' });
    if (a === 'gym-delex' && confirm(`Remove ${d.exercises[e].name || 'this exercise'}?`)) d.exercises.splice(e, 1);
    if (a === 'gym-addset' || a === 'gym-delset') {
      const x = d.exercises[e], rows = setRows(x.sets);
      if (a === 'gym-addset') rows.push({ ...(rows[rows.length - 1] || { w: '', r: '' }) }); else rows.splice(+b.dataset.i, 1);
      x.sets = setText(rows); logToday(d, x);
    }
    if (a === 'gym-mv') { const j = e + +b.dataset.dir; if (j >= 0 && j < d.exercises.length) [d.exercises[e], d.exercises[j]] = [d.exercises[j], d.exercises[e]]; }
    if (a === 'gym-addday') { G.days.push({ id: uid(), name: 'New day', exercises: [] }); location.hash = `#/gym/day/${G.days.length - 1}`; }
    if (a === 'gym-delday' && confirm(`Delete "${d.name}" and its exercises?`)) { G.days.splice(+b.dataset.d, 1); location.hash = '#/gym'; }
    save(); rerender();
  }
  if (a === 'export') downloadBackup();
  if (a === 'reseed') { const seeds = seedSubjects(); state.subjects = state.subjects.map(s => seeds.find(x => x.id === s.id && !x.placeholder) || s);
    for (const sd of seeds) if (!subj(sd.id)) state.subjects.push(sd); save(); toast('Course data reloaded'); render(); }
  if (a === 'wipe') { if (confirm('Erase all data and checkmarks?')) { localStorage.removeItem(STORE_KEY); load(); render(); toast('Reset done'); } }
});

// sets typed after "Session done" still belong to today's session
function logToday(d, x){ const entry = state.gym.log.find(l => l.dayId === d.id && l.date === isoDay(now())); if (entry) (entry.sets ||= {})[x.id] = x.sets; }

document.addEventListener('input', e => {
  const jf = e.target.dataset?.job;
  if (jf && jf !== 'status') { const j = job(e.target.dataset.id); if (j) { j[jf] = e.target.value; save(); } return; }
  const gs = e.target.dataset?.gset;
  if (gs) {
    const d = state.gym.days[+e.target.dataset.d], x = d.exercises[+e.target.dataset.e], rows = setRows(x.sets);
    rows[+e.target.dataset.i][gs] = e.target.value.replace(',', '.');
    x.sets = setText(rows); logToday(d, x); save(); return;
  }
  const f = e.target.dataset?.gym; if (!f) return;
  const d = state.gym.days[+e.target.dataset.d];
  if (f === 'day') d.name = e.target.value;
  else { const x = d.exercises[+e.target.dataset.e]; x[f] = e.target.value; }
  save();
});

document.addEventListener('change', e => {
  if (e.target.dataset?.job === 'status') {
    const j = job(e.target.dataset.id); j.status = e.target.value;
    if (j.status !== 'todo' && !j.applied) j.applied = isoDay(now());
    if (j.status === 'offer') { confetti(innerWidth/2, innerHeight/3, 120); toast(`Offer from ${j.company || '?'}`); }
    save(); rerender(); return;
  }
  if (['deadline', 'url', 'track'].includes(e.target.dataset?.job)) { rerender(); return; }
  if (e.target.dataset?.pcfg) { state.prayerCfg[e.target.dataset.pcfg] = e.target.dataset.pcfg === 'asr' ? +e.target.value : e.target.value; save(); rerender(); return; }
  if (e.target.dataset?.notify) { (state.notify ||= {})[e.target.dataset.notify] = e.target.checked; save(); updatePushPlan(); return; }
  if (e.target.id === 'themeSel') { state.theme = e.target.value; save(); applyTheme(); return; }
  if (e.target.id === 'gymSel') { state.gym.sel = e.target.value; save(); rerender(); return; }
  const k = e.target.dataset?.key; if (!k || !e.target.classList.contains('whatif')) return;
  const v = Math.max(0, Math.min(100, +e.target.value || 0)); state.whatif[k] = v; save(); rerender();
});

document.addEventListener('submit', e => {
  const f = e.target; e.preventDefault();
  if (f.dataset.act === 'addx') {
    const label = f.label.value.trim(); if (!label) return;
    const ex = state.extras[f.dataset.s] ||= {}; (ex[f.dataset.w] ||= []).push({ id:`x-${uid()}`, label, day:+f.day.value });
    save(); rerender(); document.querySelector(`form[data-s="${f.dataset.s}"][data-w="${f.dataset.w}"] input`)?.focus();
  }
  if (f.dataset.act === 'mydl') {
    const title = f.title.value.trim(); if (!title || !f.date.value) return;
    const data = { title, date: f.date.value, kind: f.kind.value, sid: f.sid.value };
    const old = state.myDeadlines.find(d => d.id === f.dataset.id);
    if (old) Object.assign(old, data); else state.myDeadlines.push({ id: f.dataset.from || `my-${uid()}`, ...data });
    save(); updatePushPlan(); toast(old ? 'Saved ✓' : 'Added ✓'); location.hash = '#/deadlines';
  }
  if (f.id === 'editForm') {
    const val = (row, n) => row.querySelector(`[name=${n}]`)?.value.trim() ?? '';
    const old = f.dataset.id ? subj(f.dataset.id) : null;
    const name = f.name.value.trim();
    const slots = [...f.querySelectorAll('[data-row=slot]')].map(r => ({
      id: r.dataset.id || 'x'+uid(), kind: val(r,'kind'), label: val(r,'label') || val(r,'kind'), day: +val(r,'day'),
      time: val(r,'time') || '23:59', where: val(r,'where'), url: val(r,'url'), graded: val(r,'kind') === 'homework' }));
    const deadlines = [...f.querySelectorAll('[data-row=dl]')].filter(r => val(r,'title') && val(r,'date')).map(r => ({
      id: r.dataset.id || 'd'+uid(), title: val(r,'title'), date: val(r,'date'), kind: val(r,'kind'), weight: val(r,'weight'), url: val(r,'url') }));
    const links = [...f.querySelectorAll('[data-row=link]')].filter(r => val(r,'url')).map(r => ({ label: val(r,'label') || 'Link', url: val(r,'url') }));
    const data = { name, code: f.code.value.trim() || name.slice(0,8), color: f.color.value, slots, deadlines, links, placeholder:false };
    let id;
    if (old) { Object.assign(old, data); id = old.id; }
    else { id = (name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,20) || 's') + '-' + uid().slice(0,3);
      state.subjects.push({ id, topics:{}, notes:{}, skip:{}, ...data }); }
    save(); toast('Saved ✓'); location.hash = `#/s/${id}`;
  }
});

document.addEventListener('click', e => {
  const side = document.getElementById('side');
  if (e.target.closest('[data-act="more"]')) { side.classList.toggle('open'); return; }
  if (side.classList.contains('open') && !side.contains(e.target)) { side.classList.remove('open'); e.preventDefault(); e.stopPropagation(); }
}, true);
addEventListener('hashchange', () => {
  render(); scrollTo(0, 0);
  const m = document.getElementById('main'); m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter');
});
const typing = () => document.activeElement?.matches('input, textarea, select');
setInterval(() => { if (!typing()) rerender(); }, 60_000);

function applyTheme(){ const t = state.theme || 'auto'; if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; }

let foodStamp = food()?.updated;
function refreshFood(){
  const s = document.createElement('script');
  s.src = `js/food-data.js?t=${Date.now()}`;
  s.onload = () => { s.remove(); if (food()?.updated !== foodStamp) { foodStamp = food()?.updated; if (!typing()) rerender(); } };
  s.onerror = () => s.remove();
  document.body.append(s);
}
setInterval(refreshFood, 5 * 60_000);

load(); applyTheme(); render();
pullState();
checkPush().then(() => location.hash.includes('settings') && rerender());
setInterval(updatePushPlan, 60 * 60_000);
autoBackup().then(rerender);
setInterval(() => autoBackup().then(() => { if (!typing()) rerender(); }), 60 * 60_000);
