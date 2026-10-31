function applyLinks(list){
  for (const s of list) {
    const l = SEED_LINKS[s.id]; if (!l) continue;
    for (const sl of s.slots) if (l.slots?.[sl.id]) sl.url = l.slots[sl.id];
    s.weekUrls = l.weekUrls || {}; s.itemUrls = l.itemUrls || {};
    for (const d of s.deadlines) if (l.deadlines?.[d.id]) d.url = l.deadlines[d.id];
  }
  for (const s of list) if (SEED_GRADING[s.id]) s.grading = SEED_GRADING[s.id];
  return list;
}

let state;
function load(){
  try { state = JSON.parse(localStorage.getItem(STORE_KEY)); } catch { state = null; }
  if (!state || !Array.isArray(state.subjects)) state = { subjects: seedSubjects(), done:{}, extras:{}, seedVersion: SEED_VERSION };
  state.done ||= {}; state.extras ||= {}; state.whatif ||= {}; state.jobs ||= []; state.prayers ||= {};
  state.prayerCfg ||= {}; state.myDeadlines ||= [];
  delete state.habits; delete state.habitLog;
  if (!state.gym) { state.gym = seedGym(); save(); }
  const MUTED = { '#8b6cff': '#8f86c9', '#22d3ee': '#5fa8b8', '#f472b6': '#c98aa8', '#34d399': '#5fae84', '#ffb547': '#d6a347', '#a3e635': '#9db35c', '#60a5fa': '#6f9bd8' };
  for (const s of state.subjects) if (MUTED[s.color]) s.color = MUTED[s.color];
  mergeSeedJobs();
  if ((state.seedVersion || 1) < SEED_VERSION) {
    for (const sd of seedSubjects()) {
      const i = state.subjects.findIndex(s => s.id === sd.id);
      if (i < 0) state.subjects.push(sd);
      else if (state.subjects[i].placeholder || (state.seedVersion || 1) < (sd.replaceBelow || 0)) state.subjects[i] = sd;
      else {
        const cur = state.subjects[i];
        cur.topics = sd.topics; cur.notes = sd.notes; cur.skip = sd.skip;
        cur.weekUrls = sd.weekUrls; cur.itemUrls = sd.itemUrls; cur.grading = sd.grading;
        for (const sl of cur.slots) { const x = sd.slots.find(y => y.id === sl.id); if (x?.url) sl.url = x.url; }
        for (const d of sd.deadlines) {
          const j = cur.deadlines.findIndex(x => x.id === d.id);
          if (j < 0) cur.deadlines.push(d); else cur.deadlines[j] = d;
        }
      }
    }
    state.seedVersion = SEED_VERSION; save();
  }
}
function save(){ state.savedAt = Date.now(); try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} queuePush(); }
const subj = id => state.subjects.find(s => s.id === id);

function itemsFor(s, n){
  const out = [];
  for (const sl of s.slots) {
    if ((s.skip?.[n] || []).includes(sl.id)) continue;
    const when = at(n, sl.day, sl.time || '23:59');
    const due = (sl.kind === 'homework' || sl.kind === 'prep') ? when : at(n, sl.day, '23:59');
    out.push({ id:`${s.id}:w${n}:${sl.id}`, s, week:n, kind:sl.kind, label:sl.label,
      topic: s.topics?.[n]?.[sl.id] || '', note: s.notes?.[n]?.[sl.id] || '',
      when, due, graded: sl.kind === 'homework', where: sl.where || '',
      url: s.itemUrls?.[n]?.[sl.id] || sl.url || s.weekUrls?.[n] || s.links?.[0]?.url || '' });
  }
  for (const x of (state.extras[s.id]?.[n] || [])) {
    const due = at(n, x.day, '23:59');
    out.push({ id:x.id, s, week:n, kind:'task', label:x.label, topic:'', when:due, due, custom:true, url: s.weekUrls?.[n] || s.links?.[0]?.url || '' });
  }
  return out.sort((a,b) => a.when - b.when);
}
const allItems = s => Array.from({length:14}, (_,i) => itemsFor(s, i+1)).flat();
const isDone = id => !!state.done[id];
const findItem = id => { for (const s of state.subjects) { const it = allItems(s).find(x => x.id === id); if (it) return it; } };

function stats(s){
  const t = now(), r = { due:0, doneDue:0, total:0, done:0, backlog:[], kinds:{} };
  for (const it of allItems(s)) {
    const k = r.kinds[it.kind] ||= { due:0, done:0, total:0 };
    r.total++; k.total++;
    if (isDone(it.id)) { r.done++; }
    if (it.due <= t) { r.due++; k.due++; if (isDone(it.id)) { r.doneDue++; k.done++; } else r.backlog.push(it); }
  }
  r.upto = r.due ? r.doneDue / r.due : 1;
  r.sem = r.total ? r.done / r.total : 0;
  return r;
}
function overall(){
  let due = 0, doneDue = 0, backlog = 0;
  for (const s of state.subjects.filter(s => !s.placeholder)) { const st = stats(s); due += st.due; doneDue += st.doneDue; backlog += st.backlog.length; }
  return { upto: due ? doneDue/due : 1, backlog, due };
}
function statusOf(p, any=true){
  if (!any) return ['st-none','Not set up'];
  if (p >= .95) return ['st-ok','✓ Up to date'];
  if (p >= .75) return ['st-warn','Slightly behind'];
  if (p >= .5)  return ['st-bad','Behind'];
  return ['st-bad','Way behind'];
}
// deadlines added by hand (state.myDeadlines) hang off a course, or off this stand-in
const PERSO = { id:'perso', code:'Perso', name:'Personal', color:'var(--accent)', links:[] };
function allDeadlines(){
  return state.subjects.flatMap(s => (s.deadlines||[]).map(d => ({...d, s, at: parseDT(d.date)})))
    .concat(state.myDeadlines.map(d => ({...d, s: subj(d.sid) || PERSO, at: parseDT(d.date), mine:true})))
    .sort((a,b) => a.at - b.at);
}
function attention(){
  const t = now(), list = [];
  for (const s of state.subjects) for (const it of allItems(s)) {
    if (!IMPORTANT.includes(it.kind) || isDone(it.id)) continue;
    const ms = it.due - t;
    if (ms < 7*864e5 && ms > -7*864e5) list.push({ type:it.kind === 'prep' ? 'prep' : 'hw', at:it.due, s, title:`${it.label}: ${it.topic}`, item:it });
  }
  for (const d of allDeadlines()) {
    if (isDone(d.id) || list.some(x => x.item?.id === d.id)) continue;
    const ms = d.at - t;
    if (ms > -864e5 && ms < 14*864e5) list.push({ type:d.kind, at:d.at, s:d.s, title:d.title, dl:d });
  }
  return list.sort((a,b) => a.at - b.at);
}
