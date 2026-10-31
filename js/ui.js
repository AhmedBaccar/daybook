function ring(p, size=64, stroke=7, color='#6f9bd8', label=null, fs=15){
  const r = (size - stroke)/2, c = 2*Math.PI*r;
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px">
    <svg class="ring" width="${size}" height="${size}">
      <circle class="bg" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}"/>
      <circle class="fg" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}" stroke="${color}"
        stroke-dasharray="${c}" stroke-dashoffset="${c*(1-Math.max(0,Math.min(1,p)))}"/>
    </svg><div class="lab" style="font-size:${fs}px">${label ?? Math.round(p*100)+'%'}</div></div>`;
}
const linkTo = (url, html) => url ? `<a class="it-link" href="${esc(url)}" target="_blank" rel="noopener" title="Open source">${html}</a>` : html;
const backLink = (href, label) => `<a class="back" href="${href}">‹ ${label}</a>`;
const navRow = (href, title, sub = '', right = '') => `<a class="nav-row" href="${href}"><div><b>${title}</b>${sub ? `<div class="hint">${sub}</div>` : ''}</div>${right}<span class="nr-chev">›</span></a>`;
const BELL = '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function itemRow(it, {showSubj=false}={}){
  const done = isDone(it.id), t = now();
  const late = it.due < t && !done;
  const imp = IMPORTANT.includes(it.kind);
  const urgent = imp && !done && it.due - t < 3*864e5;
  const hasRem = state.myDeadlines.some(d => d.id === it.id);
  let right;
  if (imp) {
    const u = urgency(it.due, done);
    right = `<div class="it-right ${done?'':u}">${done ? (it.kind === 'prep' ? 'ready ✓' : 'submitted') : (late ? 'OVERDUE · ' : 'due ') + fmtDate(it.due) + ' ' + fmtTime(it.due)}<br><small>${done?'':countdown(it.due)}</small></div>`;
  } else {
    right = `<div class="it-right ${late?'red':''}">${fmtDate(it.when)}${it.custom ? '' : ' · '+fmtTime(it.when)}${late ? '<br><small>to catch up</small>' : ''}</div>`;
  }
  const tagTxt = {lecture:'Lecture', exercise:'Exercises', homework:'Graded', prep:'Prep', task:'Task'}[it.kind];
  return `<div class="item ${imp?'hw':''} ${done?'done':''} ${late?'late':''} ${urgent?'urgent':''}" style="--c:${it.s.color}">
    <button class="chk" data-act="toggle" data-id="${esc(it.id)}" aria-label="toggle">${CHECK}</button>
    <div class="it-body">
      <div class="it-title">${showSubj ? `<span class="tag subj" style="--c:${it.s.color}">${esc(it.s.code)}</span>` : ''}<span class="tag ${it.kind}">${tagTxt}</span>${linkTo(it.url, esc(it.topic || it.label))}</div>
      <div class="it-meta">${it.topic ? esc(it.label) : ''}${it.where ? ' · '+esc(it.where) : ''}${it.note ? ` · <span style="color:var(--amber)">${esc(it.note)}</span>` : ''}</div>
    </div>
    ${right}
    ${hasRem || !done ? `<button class="bell ${hasRem ? 'on' : ''}" data-act="remind" data-id="${esc(it.id)}" title="${hasRem ? 'Reminder set' : 'Add to deadlines & remind me'}" aria-label="reminder">${BELL}</button>` : ''}
    ${it.custom ? `<button class="x" data-act="delx" data-s="${it.s.id}" data-w="${it.week}" data-id="${esc(it.id)}" title="remove">×</button>` : ''}
  </div>`;
}

function deadlineRow(d){
  const done = isDone(d.id), past = d.at < now();
  const u = urgency(d.at, done || past);
  return `<div class="dl ${d.kind==='exam'?'exam':''} ${past&&!done?'':''} ${done?'dl-done past':''} ${past&&done?'past':''}" style="--c:${d.s.color}">
    <div class="date"><small>${MONTHS[d.at.getMonth()]}</small><b>${d.at.getDate()}</b></div>
    <div><div class="t">${linkTo(d.url || d.s.links?.[0]?.url, esc(d.title))}</div>
      <div class="s"><span class="tag subj" style="--c:${d.s.color}">${esc(d.s.code)}</span> ${fmtDate(d.at)} · ${fmtTime(d.at)}${d.weight ? ' · '+esc(d.weight) : ''}</div></div>
    <div class="cd ${u}">${done ? '✓ done' : countdown(d.at)}<br>
      ${d.kind !== 'exam' ? `<button class="btn" style="margin-top:4px;padding:3px 8px" data-act="toggle" data-id="${esc(d.id)}">${done?'undo':d.kind==='todo'?'mark done':'mark submitted'}</button>` : ''}</div>
  </div>`;
}

function confetti(x, y, count=40){
  const cv = document.getElementById('confetti'), ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  const colors = ['#6f9bd8','#d6b45a','#5fae84','#c98aa8','#e4e4e2'];
  const ps = Array.from({length:count}, () => ({ x, y, vx:(Math.random()-.5)*10, vy:-Math.random()*9-3, r:Math.random()*4+2, c:colors[Math.random()*5|0], a:1 }));
  (function tick(){
    ctx.clearRect(0,0,cv.width,cv.height);
    let alive = false;
    for (const p of ps) { p.x += p.vx; p.y += p.vy; p.vy += .35; p.a -= .015;
      if (p.a > 0) { alive = true; ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.r, p.r*1.6); } }
    if (alive) requestAnimationFrame(tick); else ctx.clearRect(0,0,cv.width,cv.height);
  })();
}
