const JOB_STATUS = [
  ['todo', 'To apply', '#8a8a86'],
  ['applied', 'Applied', '#6f9bd8'],
  ['test', 'Online test', '#a593cc'],
  ['interview', 'Interview', '#d6a347'],
  ['offer', 'Offer', '#5fae84'],
  ['rejected', 'Rejected', '#e0665c'],
];
const JOB_TRACKS = [
  ['data', 'Data', '#6f9bd8'],
  ['software', 'Software', '#a593cc'],
  ['security', 'Security', '#d48a7c'],
  ['finance', 'Finance', '#5fae84'],
];
const jobStatus = k => JOB_STATUS.find(s => s[0] === k) || JOB_STATUS[0];
const jobTrack = k => JOB_TRACKS.find(t => t[0] === k) || JOB_TRACKS[0];
const cvFile = k => `cv/Ahmed_Baccar_CV_${jobTrack(k)[1]}.pdf`;
const job = id => state.jobs.find(j => j.id === id);
const newJob = () => ({ id: uid(), company: '', role: '', where: '', url: '', deadline: '', status: 'todo', applied: '', next: '', notes: '',
  track: JOB_TRACKS.some(t => t[0] === state.jobsTrack) ? state.jobsTrack : 'data', source: 'me' });

function mergeSeedJobs(){
  if (typeof SEED_JOBS === 'undefined') return;
  state.jobsDismissed ||= [];
  let changed = false;
  for (const s of SEED_JOBS) {
    const cur = state.jobs.find(j => j.id === s.id);
    if (s.drop) {
      if (cur && cur.source === 'seed' && cur.status === 'todo') { state.jobs = state.jobs.filter(j => j !== cur); changed = true; }
      continue;
    }
    if (cur) {
      if (cur.source === 'seed' && cur.notes === (cur.seedNotes ?? cur.notes) && cur.notes !== s.notes) { cur.notes = cur.seedNotes = s.notes; changed = true; }
      if (s.status && cur.status === 'todo' && s.status !== 'todo') { cur.status = s.status; cur.applied ||= s.applied || ''; changed = true; }
      if (cur.source === 'seed' && s.next && !cur.next) { cur.next = s.next; changed = true; }
      if (cur.source === 'seed' && cur.where === (cur.seedWhere ?? cur.where) && cur.where !== s.where) { cur.where = cur.seedWhere = s.where; changed = true; }
      continue;
    }
    if (state.jobsDismissed.includes(s.id)) continue;
    state.jobs.push({ ...newJob(), ...s, status: s.status || 'todo', source: 'seed', seedNotes: s.notes }); changed = true;
  }
  if (changed) save();
}

function jobsOpen(list){
  const key = j => j.status === 'todo' && j.deadline ? parseDay(j.deadline) : new Date(8.64e15);
  return list.filter(j => j.status !== 'rejected').sort((a, b) => key(a) - key(b));
}

function jobsTeaser(){
  if (!state.jobs.length) return '';
  const todo = state.jobs.filter(j => j.status === 'todo');
  const live = state.jobs.filter(j => ['applied', 'test', 'interview'].includes(j.status)).length;
  const next = todo.filter(j => j.deadline && parseDay(j.deadline) >= parseDay(isoDay(now())))
    .sort((a, b) => a.deadline < b.deadline ? -1 : 1)[0];
  return `<a class="card gym-teaser" href="#/jobs">
    <div><b>${todo.length} to apply · ${live} in progress</b><div class="hint">${state.jobs.filter(j => j.status === 'offer').length} offer(s) · ${state.jobs.length} tracked</div></div>
    ${next ? `<span class="gym-next">next deadline: <b>${esc(next.company || 'untitled')}</b> ${countdown(parseDT(next.deadline))}</span>` : ''}</a>`;
}

function jobCard(j){
  const [, label, color] = jobStatus(j.status);
  const [, tLabel, tColor] = jobTrack(j.track);
  const due = j.deadline ? parseDT(j.deadline) : null;
  const u = due && j.status === 'todo' ? urgency(due, false) : 'muted';
  const f = (k, ph, cls = '') => `<input class="gym-in ${cls}" data-job="${k}" data-id="${j.id}" value="${esc(j[k])}" placeholder="${ph}">`;
  return `<div class="card job" style="--c:${color}">
    <div class="job-head">
      ${f('company', 'Company', 'gym-title')}
      <select class="job-st" data-job="track" data-id="${j.id}" style="color:${tColor}" title="Which CV this application uses">
        ${JOB_TRACKS.map(([k, l]) => `<option value="${k}" ${k === j.track ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <select class="job-st" data-job="status" data-id="${j.id}" style="color:${color}">
        ${JOB_STATUS.map(([k, l]) => `<option value="${k}" ${k === j.status ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="job-grid">
      ${f('role', 'Role (e.g. Data Science intern)')}
      ${f('where', 'Location')}
      <div class="job-url">${f('url', 'Posting link')}${j.url ? `<a class="wk-link" href="${esc(j.url)}" target="_blank" rel="noopener">open ↗</a>` : ''}</div>
      <label class="job-lbl">Deadline <input type="date" class="gym-in" data-job="deadline" data-id="${j.id}" value="${esc(j.deadline)}"></label>
      <label class="job-lbl">Applied <input type="date" class="gym-in" data-job="applied" data-id="${j.id}" value="${esc(j.applied)}"></label>
      ${f('next', 'Next step (e.g. HireVue by Fri)')}
    </div>
    <textarea class="gym-in job-notes" data-job="notes" data-id="${j.id}" placeholder="Notes: contacts, referral, what they asked…">${esc(j.notes)}</textarea>
    <div class="hint">${j.source === 'seed' ? '<span class="tag exercise">suggested</span> ' : ''}${label}${due && j.status === 'todo' ? ` · <span class="cd ${u}">deadline ${countdown(due)}</span>` : ''}${j.applied ? ` · applied ${fmtDate(parseDay(j.applied))}` : ''}
      ${HOSTED ? '' : `· <a class="it-link" href="${cvFile(j.track)}" target="_blank" title="The CV for this track">${tLabel} CV</a>`}</div>
    <button class="btn danger" style="margin-top:14px" data-act="job-del" data-id="${j.id}">Delete application</button>
  </div>`;
}

function jobRow(j){
  const [, label, color] = jobStatus(j.status);
  const due = j.deadline ? parseDT(j.deadline) : null;
  const right = j.status === 'todo'
    ? (due ? `<span class="cd ${urgency(due, false)}">${due < now() ? 'closed?' : countdown(due).replace('in ', '')}</span>` : '')
    : `<span class="tag" style="color:${color};background:color-mix(in srgb, ${color} 14%, transparent)">${label}</span>`;
  return navRow(`#/jobs/${j.id}`, esc(j.company || 'Untitled'), esc([j.role, j.where].filter(Boolean).join(' · ')), right);
}

function pageJobs(id){
  if (id) {
    const j = job(id);
    return `${backLink('#/jobs', 'Internships')}${j ? jobCard(j) : '<div class="empty">This application was deleted.</div>'}`;
  }
  const sel = state.jobsTrack || 'all';
  const list = sel === 'all' ? state.jobs : state.jobs.filter(j => (j.track || 'data') === sel);
  const tab = (k, l, c, n) => `<button class="btn job-tab ${sel === k ? 'on' : ''}" data-act="job-track" data-k="${k}" style="--c:${c}">${l} <b>${n}</b></button>`;
  const tabs = tab('all', 'All', 'var(--text)', state.jobs.length)
    + JOB_TRACKS.map(([k, l, c]) => tab(k, l, c, state.jobs.filter(j => (j.track || 'data') === k).length)).join('');
  const open = jobsOpen(list);
  const group = (title, js, id) => js.length ? `<details class="card fold nav-list" id="${id}" ${id === 'fold-jobs-rejected' ? '' : 'open'}>
    <summary><h3>${title} <span class="sub">${js.length}</span><span class="nr-chev">›</span></h3></summary>${js.map(jobRow).join('')}</details>` : '';
  return `<h1 class="page-title">Internships</h1>
  <div class="job-tabs">${tabs}</div>
  <div class="stats" style="grid-template-columns:repeat(3,1fr)">
    <div class="card stat"><div class="k">To apply</div><div class="v">${list.filter(j => j.status === 'todo').length}</div></div>
    <div class="card stat"><div class="k">In progress</div><div class="v">${list.filter(j => ['applied', 'test', 'interview'].includes(j.status)).length}</div></div>
    <div class="card stat"><div class="k">Offers</div><div class="v">${list.filter(j => j.status === 'offer').length}</div></div>
  </div>
  ${group('Offers', open.filter(j => j.status === 'offer'), 'fold-jobs-offer')}
  ${group('In progress', open.filter(j => ['applied', 'test', 'interview'].includes(j.status)), 'fold-jobs-live')}
  ${group('To apply', open.filter(j => j.status === 'todo'), 'fold-jobs-todo')}
  ${group('Rejected', list.filter(j => j.status === 'rejected'), 'fold-jobs-rejected')}
  ${list.length ? '' : '<div class="card ph-box"><p>No applications here yet.</p></div>'}
  <button class="btn primary big-btn" data-act="job-add">+ Application</button>`;
}
