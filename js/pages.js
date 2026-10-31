function renderSide(route){
  const att = attention().filter(a => urgency(a.at,false) === 'red').length;
  const link = (href, inner, active) => `<a href="${href}" class="${active?'active':''}">${inner}</a>`;
  document.getElementById('side').innerHTML = `
    <div class="brand"><div class="logo">D</div><div><b>Daybook</b><small id="syncSt" class="sync-${syncState}">${SYNC_LABEL[syncState]}</small></div></div>
    <nav class="nav">
      ${link('#/', `Dashboard${att?`<span class="alert">${att}</span>`:''}`, route[0]==='')}
      ${link('#/deadlines', 'Deadlines', route[0]==='deadlines')}
      ${link('#/grades', 'Grades', route[0]==='grades')}
      ${link('#/gym', 'Gym', route[0]==='gym')}
      ${link('#/prayers', `Prayers<span class="pct">${prayCount(isoDay(now()))}/5</span>`, route[0]==='prayers')}
      ${link('#/food', 'Nutrition & steps', route[0]==='food')}
      ${link('#/jobs', 'Internships', route[0]==='jobs')}
      <div class="nav-label">Subjects</div>
      ${state.subjects.filter(s => s.role !== 'ta').map(s => {
        const st = s.placeholder ? null : stats(s);
        return link(`#/s/${s.id}`, `<span class="dot" style="background:${s.color}"></span>${esc(s.name)}<span class="pct">${st ? Math.round(st.upto*100)+'%' : 'setup'}</span>`, route[0]==='s' && route[1]===s.id);
      }).join('')}
      ${state.subjects.some(s => s.role === 'ta') ? '<div class="nav-label">Student assistant</div>' : ''}
      ${state.subjects.filter(s => s.role === 'ta').map(s => {
        const st = stats(s);
        return link(`#/s/${s.id}`, `<span class="dot" style="background:${s.color}"></span>${esc(s.name)}<span class="pct">${Math.round(st.upto*100)}%</span>`, route[0]==='s' && route[1]===s.id);
      }).join('')}
      <div class="nav-label">Manage</div>
      ${link('#/edit/new', 'Add subject', route[0]==='edit' && route[1]==='new')}
      ${link('#/settings', 'Settings', route[0]==='settings')}
    </nav>`;
}

const TAB_ICONS = {
  today: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  prayers: '<path d="M12 3a6 6 0 0 0 4.5 10A7 7 0 1 1 12 3z"/>',
  gym: '<path d="M6.5 8v8M3.5 10v4M17.5 8v8M20.5 10v4M6.5 12h11"/>',
  food: '<path d="M12 21a8 8 0 0 0 8-8H4a8 8 0 0 0 8 8zM9 9c0-2 1.5-2 1.5-4M13.5 9c0-2 1.5-2 1.5-4"/>',
  more: '<path d="M4 7h16M4 12h16M4 17h16"/>',
};
function renderTabs(route){
  const tabs = [['', 'Today', 'today'], ['prayers', 'Prayers', 'prayers'], ['gym', 'Gym', 'gym'], ['food', 'Food', 'food']];
  const icon = k => `<svg viewBox="0 0 24 24">${TAB_ICONS[k]}</svg>`;
  const main = tabs.some(([r]) => r === route[0]);
  document.getElementById('tabbar').innerHTML = tabs.map(([r, name, k]) =>
    `<a href="#/${r}" class="${route[0] === r ? 'on' : ''}" data-sec="${k}">${icon(k)}${name}</a>`).join('')
    + `<a href="#/more" class="${main ? '' : 'on'}">${icon('more')}More</a>`;
}

function pageMore(){
  const subj = s => navRow(`#/s/${s.id}`, `<span class="dot" style="background:${s.color}"></span>${esc(s.name)}`, esc(s.code), s.placeholder ? '' : `<span class="hint">${Math.round(stats(s).upto*100)}%</span>`);
  const own = state.subjects.filter(s => s.role !== 'ta'), ta = state.subjects.filter(s => s.role === 'ta');
  const dl = allDeadlines().filter(d => d.at > now() && !isDone(d.id));
  return `<h1 class="page-title">More</h1>
  <div class="card nav-list" style="margin-bottom:16px">
    ${navRow('#/deadlines', 'Deadlines', dl[0] ? `next: ${esc(dl[0].title)} · ${countdown(dl[0].at)}` : 'nothing upcoming')}
    ${navRow('#/grades', 'Grades')}
    ${navRow('#/jobs', 'Internships', `${state.jobs.filter(j => j.status === 'todo').length} to apply`)}
  </div>
  <h2 class="sec-h">Courses</h2><div class="card nav-list" style="margin-bottom:16px">${own.map(subj).join('')}</div>
  ${ta.length ? `<h2 class="sec-h">Student assistant</h2><div class="card nav-list" style="margin-bottom:16px">${ta.map(subj).join('')}</div>` : ''}
  <div class="card nav-list">${navRow('#/settings', 'Settings', 'notifications, theme, backup')}${navRow('#/edit/new', 'Add a subject')}</div>`;
}

const DASH_ICONS = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  studies: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  jobs: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>'
};
function dashHead(key, title, href, more){
  return `<div class="dash-h"><span class="dash-ic ic-${key}"><svg viewBox="0 0 24 24">${DASH_ICONS[key]}</svg></span><h2>${title}</h2>${href ? `<a href="${href}">${more} ›</a>` : ''}</div>`;
}

function pageDashboard(){
  const w = currentWeek(), fw = focusWeek(), t = now();
  const o = overall(), [stc, stl] = statusOf(o.upto, o.due > 0);
  const greet = t.getHours() < 12 ? 'Good morning' : t.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const wkLabel = typeof w === 'number' ? `Week ${w} of 14` : w === 'break' ? 'Break week' : w === 'before' ? 'Semester starts soon' : 'Semester over · exam session';
  const att = attention();

  const semBar = WEEKS.map((_,i) => {
    const n = i+1, cls = n === w ? 'now' : (typeof w === 'number' ? n < w : (w === 'after' || (w === 'break' && n <= 6))) ? 'past' : '';
    return (n === 7 ? `<div class="brk ${w==='break'?'now':(typeof w==='number'&&w>=7)||w==='after'?'past':''}" title="Break"></div>` : '') + `<div class="${cls}" title="Week ${n}"></div>`;
  }).join('');

  const weekItems = state.subjects.flatMap(s => itemsFor(s, fw));
  const byDay = Array.from({length:7}, () => []);
  for (const it of weekItems) byDay[(it.when.getDay()+6)%7].push(it);
  const wkDone = weekItems.filter(i => isDone(i.id)).length;
  const weekList = byDay.map((arr, d) => arr.length ? `<div class="day-h ${sameDay(at(fw,d),t)?'today':''}">${DAYS_LONG[d]} ${at(fw,d).getDate()} ${MONTHS[at(fw,d).getMonth()]}</div><div class="items">${arr.map(it => itemRow(it,{showSubj:true})).join('')}</div>` : '').join('');

  const backlog = state.subjects.filter(s=>!s.placeholder).flatMap(s => stats(s).backlog).filter(it => it.week !== fw);

  return `
  <div class="topline">${fmtDate(t)} ${t.getFullYear()} · ${wkLabel}</div>
  <h1 class="page-title">${greet}, Ahmed</h1>
  ${backupNote()}
  <section class="dash-sec">
  ${dashHead('today', 'Today')}
  ${todayCard()}
  </section>

  <section class="dash-sec">
  ${dashHead('studies', 'Studies', '#/deadlines', 'All deadlines')}
  ${updateCard()}

  ${att.length ? `<div class="alerts">${att.map((a, i) => {
      const u = urgency(a.at, false);
      const sub = a.type === 'hw' ? 'Graded homework · do not forget!' : a.type === 'prep' ? `Prepare before your Thursday session${a.item.where ? ' · '+a.item.where : ''}` : (a.dl.weight || { todo: 'To do', project: 'Due' }[a.type] || a.type);
      return `${i === 3 ? `<details class="more-alerts" id="fold-alerts"><summary class="btn">${att.length - 3} more ›</summary><div class="alerts">` : ''}<div class="alert-item ${u === 'red' ? 'red' : 'amber'}">
        <div><div class="t">${a.dl?.mine ? `<a href="#/deadlines/${encodeURIComponent(a.dl.id)}">${esc(a.title)}</a>` : linkTo(a.item?.url || a.dl?.url, esc(a.title))}</div><div class="s"><span class="tag subj" style="--c:${a.s.color}">${esc(a.s.code)}</span> ${esc(sub)}</div></div>
        <div class="cd">${a.at < t ? 'OVERDUE' : countdown(a.at)}<small>${fmtDate(a.at)} · ${fmtTime(a.at)}</small></div>
        ${a.item ? `<button class="btn" data-act="toggle" data-id="${esc(a.item.id)}">Done ✓</button>` : `<button class="btn" data-act="toggle" data-id="${esc(a.dl.id)}">${a.type === 'todo' ? 'Done' : 'Submitted'} ✓</button>`}
      </div>`; }).join('')}${att.length > 3 ? '</div></details>' : ''}</div>` : ''}

  <div class="grid g-hero" style="margin-bottom:16px">
    <div class="card">
      <h3>Overall: are you up to date?</h3>
      <div class="hero">
        ${ring(o.upto, 120, 12, '#6f9bd8', null, 26)}
        <div>
          <div class="big">${o.backlog}</div>
          <div class="lbl">item${o.backlog===1?'':'s'} to catch up across all subjects</div>
          <span class="status-pill ${stc}">${stl}</span>
        </div>
      </div>
      <div class="sem-bar">${semBar}</div>
      <div class="sem-meta"><span>7 Sep</span><span>${wkLabel}</span><span>18 Dec</span></div>
    </div>
    <div class="card">
      <h3>Next deadlines <a class="sub" href="#/deadlines">see all →</a></h3>
      ${allDeadlines().filter(d => d.at > t && !isDone(d.id)).slice(0,4).map(deadlineRow).join('') || '<div class="empty">Nothing upcoming</div>'}
    </div>
  </div>

  <div class="grid g-subj" style="margin-bottom:16px">
    ${state.subjects.map(s => {
      if (s.placeholder) return `<a class="card scard ph" href="#/edit/${s.id}" style="--c:${s.color}">
        <div class="row">${ring(0,56,6,s.color,'?')}<div><div class="code">${esc(s.code)}</div><div class="name">${esc(s.name)}</div></div></div>
        <div class="mini">Click to add its weekly schedule</div></a>`;
      const st = stats(s), [c, l] = statusOf(st.upto);
      const hw = st.kinds.homework;
      return `<a class="card scard" href="#/s/${s.id}" style="--c:${s.color}">
        <div class="row">${ring(st.upto,56,6,s.color)}<div><div class="code">${esc(s.code)}</div><div class="name">${esc(s.name)}</div></div></div>
        <div class="mini"><span class="status-pill ${c}" style="margin:0">${l}</span><span><b>${st.backlog.length}</b> backlog</span>${hw ? `<span><b>${hw.done}/${hw.due}</b> HW</span>` : ''}<span><b>${Math.round(st.sem*100)}%</b> of semester</span></div>
      </a>`;
    }).join('')}
  </div>

  <details class="card fold" id="fold-week">
    <summary><h3>${typeof w === 'number' ? 'This week' : w === 'break' ? 'Coming up · week 7' : 'Week '+fw} <span class="sub">${wkDone}/${weekItems.length} done</span><span class="nr-chev">›</span></h3></summary>
    ${weekList || '<div class="empty">No items this week.</div>'}
  </details>
  <details class="card fold" id="fold-backlog">
    <summary><h3>Catch-up list <span class="sub">${backlog.length} from past weeks</span><span class="nr-chev">›</span></h3></summary>
    ${backlog.length ? `<div class="items">${backlog.slice(0,30).map(it => itemRow(it,{showSubj:true})).join('')}</div>${backlog.length>30?`<div class="hint" style="margin-top:8px">+${backlog.length-30} more on subject pages</div>`:''}` : '<div class="empty">Nothing to catch up.</div>'}
  </details>
  </section>

  ${state.jobs.length ? `<section class="dash-sec">${dashHead('jobs', 'Internships', '#/jobs', 'Open')}${jobsTeaser()}</section>` : ''}`;
}

function pageSubject(id){
  const s = subj(id);
  if (!s) return '<div class="empty">Subject not found.</div>';
  const linksHtml = (s.links||[]).map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">↗ ${esc(l.label)}</a>`).join('');
  if (s.placeholder || !s.slots.length) return `
    <div class="s-head"><div class="ttl"><div class="topline">${esc(s.code)}</div><h1>${esc(s.name)}</h1><div class="links">${linksHtml}</div></div></div>
    <div class="card ph-box" style="--c:${s.color}">
      <h2>This subject isn't set up yet</h2>
      <p>I couldn't read this course's page (Moodle requires your EPFL login). Add its weekly lecture, exercise and homework slots plus its deadlines, and the checklist and stats will appear.</p>
      <a class="btn primary" href="#/edit/${s.id}">Set up subject</a>
    </div>`;

  const st = stats(s), [c,l] = statusOf(st.upto), w = currentWeek(), fw = focusWeek(), t = now();
  const k = st.kinds;
  const kindStat = (key, label) => k[key] ? `<div class="card stat" style="--c:${s.color}"><div class="k">${label}</div><div class="v">${k[key].done}<span style="color:var(--dim);font-size:16px">/${k[key].due}</span></div><div class="bar"><i style="width:${k[key].due ? k[key].done/k[key].due*100 : 0}%"></i></div></div>` : '';
  const nextDl = (s.deadlines||[]).map(d => ({...d, s, at:parseDT(d.date)})).filter(d => d.at > t && !isDone(d.id)).sort((a,b)=>a.at-b.at)[0];

  const week = n => {
    const items = itemsFor(s,n), dn = items.filter(x=>isDone(x.id)).length;
    const hasBacklog = items.some(x => !isDone(x.id) && x.due < t);
    const open = n === fw;
    const end = weekStart(n); end.setDate(end.getDate()+6);
    return `<details class="week ${n===w?'cur':''}" id="w${n}" ${open?'open':''} style="--c:${s.color}">
      <summary><span class="chev">▶</span><span class="wk-n">Week ${n}</span><span class="wk-d">${weekStart(n).getDate()} ${MONTHS[weekStart(n).getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]}${n===w?' · <b style="color:var(--text)">now</b>':''}</span>${s.weekUrls?.[n] ? `<a class="wk-link" href="${esc(s.weekUrls[n])}" target="_blank" rel="noopener">Moodle ↗</a>` : ''}
        <span class="wk-p">${hasBacklog?'<span style="color:var(--red)">● behind</span>':''}${dn}/${items.length}<span class="bar"><i style="width:${items.length?dn/items.length*100:0}%"></i></span></span></summary>
      <div class="wk-body">
        <div class="items">${items.map(it => itemRow(it)).join('')}</div>
        <form class="add-row" data-act="addx" data-s="${s.id}" data-w="${n}">
          <input name="label" placeholder="+ Add a task for this week (e.g. read chapter 3, revise slides)" autocomplete="off">
          <select name="day">${DAYS.map((d,j)=>`<option value="${j}" ${j===4?'selected':''}>${d}</option>`).join('')}</select>
          <button class="btn" type="submit">Add</button>
          <button class="btn" type="button" data-act="weekall" data-s="${s.id}" data-w="${n}">${dn===items.length&&items.length?'Uncheck all':'Check all'}</button>
        </form>
      </div>
    </details>`;
  };
  const others = Array.from({length:14}, (_,i) => i+1).filter(n => n !== fw);
  const behind = others.filter(n => itemsFor(s,n).some(x => !isDone(x.id) && x.due < t)).length;
  const dls = (s.deadlines||[]).map(d=>({...d,s,at:parseDT(d.date)})).sort((a,b)=>a.at-b.at);

  return `<div class="topline">${esc(s.code)}</div><h1 class="page-title" style="margin-bottom:10px">${esc(s.name)}</h1>
  <div class="links" style="margin:0 0 18px">${linksHtml}<a href="#/edit/${s.id}">Edit</a></div>
  <div class="stats">
    <div class="card stat" style="--c:${s.color}"><div class="k">Up to date</div><div class="v">${Math.round(st.upto*100)}<small>%</small></div><div class="k"><span class="${c.replace('st-','txt-')}">${l}</span></div></div>
    <div class="card stat"><div class="k">To catch up</div><div class="v">${st.backlog.length}</div><div class="k">item${st.backlog.length===1?'':'s'}</div></div>
    ${kindStat('homework','Graded homework')}${kindStat('prep','Séries prepared')}
    ${!k.homework && !k.prep ? `<div class="card stat"><div class="k">Semester</div><div class="v">${Math.round(st.sem*100)}<small>%</small></div><div class="k">done</div></div>` : ''}
  </div>
  <h2 class="sec-h">${typeof w === 'number' ? 'This week' : 'Week ' + fw}</h2>
  <div class="weeks">${week(fw)}</div>
  ${dls.length ? `<h2 class="sec-h">Deadlines</h2><div class="card nav-list">${dls.map(deadlineLine).join('')}</div>` : ''}
  <details class="card fold" id="fold-weeks" style="margin-top:16px">
    <summary><h3>All weeks <span class="sub">${behind ? `<span style="color:var(--red)">${behind} behind</span> · ` : ''}14</span><span class="nr-chev">›</span></h3></summary>
    <div class="weeks">${others.map(week).join('')}</div>
  </details>`;
}

function deadlineLine(d){
  const done = isDone(d.id), u = urgency(d.at, done || d.at < now());
  return `<a class="nav-row dl-row ${done ? 'dl-done' : ''}" href="#/deadlines/${encodeURIComponent(d.id)}" style="--c:${d.s.color}">
    <div class="date"><small>${MONTHS[d.at.getMonth()]}</small><b>${d.at.getDate()}</b></div>
    <div><b>${esc(d.title)}</b><div class="hint">${esc(d.s.code)} · ${d.kind === 'exam' ? 'exam · ' : ''}${fmtTime(d.at)}</div></div>
    <span class="cd ${u}">${done ? '✓' : countdown(d.at).replace('in ', '')}</span><span class="nr-chev">›</span></a>`;
}

function pageDeadlines(id, from){
  const t = now(), dls = allDeadlines();
  if (id === 'new') {
    const it = from && findItem(decodeURIComponent(from));
    const pre = it && { title: it.topic ? `${it.label}: ${it.topic}` : it.label, sid: it.s.id, kind: IMPORTANT.includes(it.kind) ? 'project' : 'todo',
      date: `${isoDay(IMPORTANT.includes(it.kind) ? it.due : it.when)}T${fmtTime(IMPORTANT.includes(it.kind) ? it.due : it.when)}` };
    return `${backLink(it ? `#/s/${it.s.id}` : '#/deadlines', it ? it.s.name : 'Deadlines')}<h1 class="page-title">New deadline</h1>${myDlForm(null, pre, it?.id)}`;
  }
  if (id) {
    const d = dls.find(x => x.id === decodeURIComponent(id));
    if (!d) return `${backLink('#/deadlines', 'Deadlines')}<div class="empty">This deadline no longer exists.</div>`;
    const done = isDone(d.id), url = d.url || d.s.links?.[0]?.url;
    return `${backLink('#/deadlines', 'Deadlines')}
    <div class="topline">${esc(d.s.code)} · ${esc(d.s.name)}</div><h1 class="page-title title-long">${esc(d.title)}</h1>
    <div class="card" style="--c:${d.s.color}">
      <div class="gw-top">
        <div><div class="k">When</div><div class="gw-mid">${fmtDate(d.at)} · ${fmtTime(d.at)}</div></div>
        <div><div class="k">${d.at < t ? 'Was' : 'Time left'}</div><div class="gw-mid cd ${urgency(d.at, done)}">${done ? '✓ done' : countdown(d.at)}</div></div>
        ${d.weight ? `<div><div class="k">Counts for</div><div class="gw-mid">${esc(d.weight)}</div></div>` : ''}
      </div>
      ${url ? `<a class="btn" style="margin-top:16px" href="${esc(url)}" target="_blank" rel="noopener">Open on ${/edstem/.test(url) ? 'Ed' : /moodle/.test(url) ? 'Moodle' : 'the course page'} ↗</a>` : ''}
    </div>
    ${d.kind !== 'exam' ? `<button class="btn ${done ? '' : 'primary'} big-btn" data-act="toggle" data-id="${esc(d.id)}">${done ? `✓ ${d.kind === 'todo' ? 'Done' : 'Submitted'} (tap to undo)` : d.kind === 'todo' ? 'Mark as done' : 'Mark as submitted'}</button>` : ''}
    ${d.mine ? `<h2 class="sec-h">Edit</h2>${myDlForm(d)}` : ''}`;
  }
  const up = dls.filter(d => d.at >= t && !isDone(d.id)), past = dls.filter(d => d.at < t || isDone(d.id)).reverse();
  const week = dayPlus(parseDay(isoDay(t)), 8);
  const group = (title, list, gid, open = true) => list.length ? `<details class="card fold nav-list" id="${gid}" ${open ? 'open' : ''}>
    <summary><h3>${title} <span class="sub">${list.length}</span><span class="nr-chev">›</span></h3></summary>${list.map(deadlineLine).join('')}</details>` : '';
  return `<h1 class="page-title">Deadlines</h1>
  ${up.length ? '' : '<div class="card empty">Nothing upcoming.</div>'}
  ${group('Next 7 days', up.filter(d => d.at < week), 'fold-dl-week')}
  ${group('Later', up.filter(d => d.at >= week), 'fold-dl-later')}
  ${group('Past & submitted', past, 'fold-dl-past', false)}
  <a class="btn primary big-btn" href="#/deadlines/new">+ Deadline or reminder</a>
  <p class="hint" style="text-align:center;margin-top:8px">You get a notification the day before and 3 h before, until you tick it.</p>`;
}

function myDlForm(d, pre = d, from = ''){
  const def = isoDay(dayPlus(parseDay(isoDay(now())), 1)) + 'T18:00';
  const subs = state.subjects.filter(s => !s.placeholder);
  return `<form class="card form" data-act="mydl" data-id="${d ? esc(d.id) : ''}" data-from="${esc(from)}">
    <label>What<input name="title" required value="${esc(pre?.title || '')}" placeholder="e.g. Send the Pictet application, ML project report" autocomplete="off"></label>
    <div class="frow" style="grid-template-columns:1fr 1fr">
      <label>When<input name="date" type="datetime-local" required value="${esc(pre?.date || def)}"></label>
      <label>Type<select name="kind">${[['todo', 'To do'], ['project', 'Due (hand in)'], ['exam', 'Exam']].map(([k, l]) => `<option value="${k}" ${(pre?.kind || 'todo') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    </div>
    <label>Course<select name="sid"><option value="">Personal</option>${subs.map(s => `<option value="${s.id}" ${pre?.sid === s.id ? 'selected' : ''}>${esc(s.code)} · ${esc(s.name)}</option>`).join('')}</select></label>
    <button class="btn primary" type="submit">${d ? 'Save' : 'Add'}</button>
    ${d ? `<button class="btn" type="button" style="color:var(--red)" data-act="mydl-del" data-id="${esc(d.id)}">Delete</button>` : ''}
  </form>`;
}

function pageEdit(id){
  const isNew = id === 'new';
  const s = isNew ? { id:'', code:'', name:'', color:'#a78bfa', links:[], slots:[], deadlines:[] } : subj(id);
  if (!s) return '<div class="empty">Subject not found.</div>';
  const kindOpt = v => ['lecture','exercise','homework','prep'].map(k => `<option value="${k}" ${v===k?'selected':''}>${{homework:'Graded HW', prep:'SA prep'}[k] || k[0].toUpperCase()+k.slice(1)}</option>`).join('');
  const dayOpt = v => DAYS.map((d,j)=>`<option value="${j}" ${+v===j?'selected':''}>${d}</option>`).join('');
  const slotRow = sl => `<div class="frow f-slot" data-row="slot" data-id="${esc(sl.id||'')}">
      <label>Type<select name="kind">${kindOpt(sl.kind)}</select></label>
      <label>Label<input name="label" value="${esc(sl.label)}" placeholder="Lecture"></label>
      <label>Day<select name="day">${dayOpt(sl.day ?? 0)}</select></label>
      <label>${'Time / due'}<input name="time" type="time" value="${esc(sl.time||'08:15')}"></label>
      <label>Where / note<input name="where" value="${esc(sl.where||'')}" placeholder="Room"></label>
      <label>Link<input name="url" value="${esc(sl.url||'')}" placeholder="https://moodle…"></label><button type="button" class="x" data-act="rmrow">×</button></div>`;
  const linkRow = l => `<div class="frow f-link" data-row="link"><label>Label<input name="label" value="${esc(l.label)}"></label><label>URL<input name="url" value="${esc(l.url)}"></label><button type="button" class="x" data-act="rmrow">×</button></div>`;
  const dlRow = d => `<div class="frow f-dl" data-row="dl" data-id="${esc(d.id||'')}">
      <label>Title<input name="title" value="${esc(d.title)}" placeholder="Midterm"></label>
      <label>Date & time<input name="date" type="datetime-local" value="${esc(d.date||'')}"></label>
      <label>Kind<select name="kind">${['homework','project','exam','other'].map(k=>`<option ${d.kind===k?'selected':''}>${k}</option>`).join('')}</select></label>
      <label>Weight<input name="weight" value="${esc(d.weight||'')}" placeholder="20% of grade"></label>
      <label>Link<input name="url" value="${esc(d.url||'')}" placeholder="https://moodle…"></label>
      <button type="button" class="x" data-act="rmrow">×</button></div>`;
  window.__tpl = { slot: slotRow({kind:'lecture',label:'',day:0,time:'08:15'}), link: linkRow({label:'',url:''}), dl: dlRow({title:'',date:'',kind:'project'}) };
  return `<div class="topline">${isNew ? 'New subject' : esc(s.code)}</div>
  <h1 class="page-title">${isNew ? 'Add subject' : 'Edit subject'}</h1>
  <form class="form" id="editForm" data-id="${esc(s.id)}">
    <div class="card"><h3>Basics</h3><div class="frow f-basic">
      <label>Name<input name="name" value="${esc(s.placeholder ? '' : s.name)}" placeholder="e.g. Computer Networks" required></label>
      <label>Code<input name="code" value="${esc(s.code)}" placeholder="CS-xxx"></label>
      <label>Color<input name="color" type="color" value="${esc(s.color)}"></label></div></div>
    <div class="card"><h3>Weekly schedule <span class="sub">repeats every teaching week · mark graded homework so it gets highlighted</span></h3>
      <div id="slots" class="form">${s.slots.map(slotRow).join('')}</div>
      <button type="button" class="btn" style="margin-top:12px" data-act="addrow" data-t="slot" data-to="slots">+ Add slot</button></div>
    <div class="card"><h3>Deadlines & exams</h3>
      <div id="dls" class="form">${(s.deadlines||[]).map(dlRow).join('')}</div>
      <button type="button" class="btn" style="margin-top:12px" data-act="addrow" data-t="dl" data-to="dls">+ Add deadline</button></div>
    <div class="card"><h3>Links</h3>
      <div id="links" class="form">${(s.links||[]).map(linkRow).join('')}</div>
      <button type="button" class="btn" style="margin-top:12px" data-act="addrow" data-t="link" data-to="links">+ Add link</button></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn primary" type="submit">Save subject</button>
      ${isNew ? '' : `<a class="btn" href="#/s/${s.id}">Cancel</a><button class="btn danger" type="button" data-act="delsubj" data-id="${s.id}" style="margin-left:auto">Delete subject</button>`}
    </div>
  </form>`;
}
