function seedGym(){
  const ex = (name, fr, sets = '') => ({ id: uid(), name, fr, sets });
  return { log: [], days: [
    { id: uid(), name: 'Push', exercises: [
      ex('Chest press', 'press', '4×41'),
      ex('Incline Smith machine press', 'Développé incliné smith', '20×6, 12.5×11.5'),
      ex('Pec deck (machine fly)', 'pec deck'),
      ex('Hammer curl', 'marteau'),
      ex('Biceps burnout', 'biceps brûlant'),
      ex('Abs', 'abdos'),
    ]},
    { id: uid(), name: 'Pull', exercises: [
      ex('Pull-up / lat pulldown', 'traction / tirage vertical', '66×8, 52×10'),
      ex('Row', 'rowing', '15×8, 10×12'),
      ex('Seated cable row', 'tirage horizontal', '45×10, 25×14'),
      ex('Barbell shrugs', 'shrugs barbell', '50×12'),
      ex('Skull crusher (EZ bar)', 'barre au front', '7.5×7'),
      ex('Triceps extension', 'triceps extension', '18×7, 14×7'),
    ]},
    { id: uid(), name: 'Shoulders / Arms', exercises: [
      ex('Rear delt fly', 'épaule arrière', '23×12'),
      ex('Military press', 'militaire', '20×4, 12.5×10'),
      ex('Lateral raise', 'latéral', '(4.5 + 2.3)×10'),
      ex('Dumbbell skull crusher + spider curl superset', 'haltère au front + superset spider curl', '5×9×2, 10×10, 12.5×9'),
      ex('Dumbbell skull crusher + hammer curl superset', 'haltère au front + superset marteau', '5×9, 12.5×10'),
    ]},
    { id: uid(), name: 'Chest / Back 5', exercises: [
      ex('Pull-up', 'traction', '8, 7'),
      ex('Row', 'rowing', '41×10×2'),
      ex('Incline dumbbell press', 'inclined db press', '20×7, 12.5×12'),
      ex('Low-to-high cable fly', 'montée de pec poulie', '(4.5 + 2.3)×10, 9×8'),
      ex('Lateral raise', 'latéral', '9×10×2'),
    ]},
    { id: uid(), name: 'Legs 2', exercises: [
      ex('Squat', 'squat', '10×9, 10×10, 10×12'),
      ex('Romanian deadlift (RDL)', 'rdl'),
      ex('Bulgarian split squat', 'fente bulgare'),
    ]},
  ]};
}

const isoDay = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function gymStats(){
  const g = state.gym, today = now();
  const monday = new Date(today); monday.setHours(0,0,0,0); monday.setDate(monday.getDate() - (monday.getDay()+6)%7);
  const thisWeek = g.log.filter(l => parseDay(l.date) >= monday).length;
  const last = g.log[g.log.length - 1];
  const lastIdx = last ? g.days.findIndex(d => d.id === last.dayId) : -1;
  const next = g.days.length ? g.days[(lastIdx + 1) % g.days.length] : null;
  return { thisWeek, last, next };
}
function updateCard(){
  if (!LAST_UPDATE?.changes?.length) return '';
  const key = 'seen-update-' + LAST_UPDATE.date;
  if (state.seenUpdate === key) return '';
  return `<div class="card upd-card"><h3>Weekly update · ${esc(LAST_UPDATE.date)} <span class="sub"><button class="btn" data-act="upd-ok" data-k="${esc(key)}">Got it</button></span></h3>
    <ul>${LAST_UPDATE.changes.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
}
const CHART = '#6f9bd8';
function niceStep(span){ const p = 10 ** Math.floor(Math.log10(span || 1)), m = span / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
function lineChart(pts, unit, trend = null){
  const W = 600, H = 200, L = 44, Rt = 14, T = 14, B = 26;
  const ys = pts.map(p => p.y).concat(trend ? trend.map(p => p.y) : []), step = niceStep((Math.max(...ys) - Math.min(...ys)) / 3 || 1);
  const lo = Math.floor((Math.min(...ys) - step / 2) / step) * step, hi = Math.ceil((Math.max(...ys) + step / 2) / step) * step;
  const xs = pts.map(p => +p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const X = t => x1 === x0 ? (L + W - Rt) / 2 : L + (t - x0) / (x1 - x0) * (W - L - Rt);
  const Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  let grid = '';
  for (let v = lo; v <= hi + 1e-9; v += step) grid += `<line x1="${L}" x2="${W - Rt}" y1="${Y(v)}" y2="${Y(v)}" class="lc-grid"/><text x="${L - 8}" y="${Y(v) + 4}" class="lc-ax" text-anchor="end">${+v.toFixed(1)}</text>`;
  const cx = pts.map(p => X(+p.x)), d = pts.map((p, i) => `${i ? 'L' : 'M'}${cx[i].toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  const hits = pts.map((p, i) => { const a = i ? (cx[i - 1] + cx[i]) / 2 : L, z = i < pts.length - 1 ? (cx[i] + cx[i + 1]) / 2 : W - Rt;
    return `<rect class="lc-hit" x="${a}" y="0" width="${Math.max(1, z - a)}" height="${H}" data-cx="${cx[i]}" data-cy="${Y(p.y)}" data-tip="${esc(p.tip)}"/>`; }).join('');
  const last = pts[pts.length - 1];
  return `<svg class="lc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(unit)} over time">${grid}
    <text x="${L}" y="${H - 6}" class="lc-ax">${fmtDate(pts[0].x)}</text><text x="${W - Rt}" y="${H - 6}" class="lc-ax" text-anchor="end">${fmtDate(last.x)}</text>
    ${trend ? `<path d="${trend.map((p, i) => `${i ? 'L' : 'M'}${X(+p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('')}" fill="none" stroke="var(--gold)" stroke-width="2" stroke-dasharray="5 4"/>` : ''}
    <path d="${d}" fill="none" stroke="${CHART}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${trend ? 'opacity=".55"' : ''}/>
    ${pts.map((p, i) => `<circle cx="${cx[i]}" cy="${Y(p.y)}" r="4" fill="${CHART}" stroke="var(--bg)" stroke-width="2"/>`).join('')}
    <line class="lc-x" x1="0" x2="0" y1="${T}" y2="${H - B}"/><circle class="lc-dot" r="6" fill="${CHART}" stroke="var(--bg)" stroke-width="2"/>
    ${hits}</svg>`;
}
function barChart(bars, goal = 0){
  const W = 600, H = 150, L = 10, T = 18, B = 24, n = bars.length, bw = (W - 2 * L) / n, max = Math.max(1, goal, ...bars.map(b => b.y));
  return `<svg class="lc" viewBox="0 0 ${W} ${H}" role="img" aria-label="sessions per week">
    <line x1="${L}" x2="${W - L}" y1="${H - B}" y2="${H - B}" class="lc-grid"/>
    ${bars.map((b, i) => { const x = L + i * bw + 2, w = bw - 4, hgt = b.y / max * (H - T - B), y = H - B - hgt;
      return `${b.y ? `<path d="M${x},${H - B}V${y + 4}q0,-4 4,-4h${w - 8}q4,0 4,4V${H - B}z" fill="${CHART}" opacity="${b.now ? 1 : .55}"/>
        <text x="${x + w / 2}" y="${y - 5}" class="lc-ax" text-anchor="middle">${b.txt ?? b.y}</text>` : ''}
        <text x="${x + w / 2}" y="${H - 7}" class="lc-ax" text-anchor="middle">${esc(b.label)}</text>
        <rect class="lc-hit" x="${x - 2}" y="0" width="${bw}" height="${H}" data-tip="${esc(b.tip)}"/>`; }).join('')}
    ${goal ? `<line x1="${L}" x2="${W - L}" y1="${H - B - goal / max * (H - T - B)}" y2="${H - B - goal / max * (H - T - B)}" stroke="var(--gold)" stroke-dasharray="5 4"/>` : ''}</svg>`;
}
document.addEventListener('mouseover', e => {
  const r = e.target.closest?.('.lc-hit'), tip = document.getElementById('lcTip');
  if (!r) return;
  const svg = r.ownerSVGElement, x = svg.querySelector('.lc-x'), dot = svg.querySelector('.lc-dot');
  if (x && r.dataset.cx) { x.setAttribute('x1', r.dataset.cx); x.setAttribute('x2', r.dataset.cx); x.style.opacity = 1;
    dot.setAttribute('cx', r.dataset.cx); dot.setAttribute('cy', r.dataset.cy); dot.style.opacity = 1; }
  const box = r.getBoundingClientRect(); tip.textContent = r.dataset.tip; tip.style.opacity = 1;
  tip.style.left = Math.min(innerWidth - 220, box.left + box.width / 2 + 10) + 'px'; tip.style.top = (box.top + scrollY + 8) + 'px';
});
document.addEventListener('mouseout', e => {
  const svg = e.target.closest?.('.lc'); if (!svg || svg.contains(e.relatedTarget)) return;
  document.getElementById('lcTip').style.opacity = 0;
  svg.querySelectorAll('.lc-x,.lc-dot').forEach(el => el.style.opacity = 0);
});

function parseSets(str){
  return String(str || '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const parts = s.replace(/[*xX]/g, '×').split('×').map(t => t.trim());
    const num = t => (t.match(/\d+(?:[.,]\d+)?/g) || []).reduce((a, n) => a + parseFloat(n.replace(',', '.')), 0);
    if (parts.length === 1) return { w: 0, r: num(parts[0]) };
    return { w: num(parts[0]), r: num(parts[1]) };
  }).filter(x => x.r > 0);
}
function setRows(str){
  const n = t => { const v = (String(t).match(/\d+(?:[.,]\d+)?/g) || []).reduce((a, x) => a + parseFloat(x.replace(',', '.')), 0); return v ? +v.toFixed(2) : ''; };
  return String(str || '').split(',').map(s => s.trim()).filter(Boolean).flatMap(s => {
    const p = s.replace(/[*xX]/g, '×').split('×').map(t => t.trim());
    if (p.length === 1) return [{ w: '', r: n(p[0]) }];
    const times = p.length === 3 && /^\d+$/.test(p[2]) ? +p[2] : 1;
    return Array.from({ length: times }, () => ({ w: n(p[0]), r: n(p[1]) }));
  });
}
const setText = rows => rows.map(s => s.w ? `${s.w}×${s.r || 0}` : `${s.r || 0}`).join(', ');
const e1rm = s => s.w ? s.w * (1 + s.r / 30) : 0;
function exerciseHistory(exId){
  return state.gym.log.filter(l => l.sets?.[exId]).map(l => {
    const sets = parseSets(l.sets[exId]); if (!sets.length) return null;
    const bw = sets.every(s => !s.w);
    const top = sets.reduce((a, s) => (bw ? s.r > a.r : e1rm(s) > e1rm(a)) ? s : a, sets[0]);
    return { x: parseDay(l.date), y: bw ? top.r : Math.round(e1rm(top) * 10) / 10, bw, raw: l.sets[exId] };
  }).filter(Boolean);
}

function allWeights(){
  const by = {}, F = food();
  if (F?.weight?.date) by[F.weight.date.slice(0, 10)] = { date: F.weight.date.slice(0, 10), kg: F.weight.kg, src: 'yazio' };
  for (const [date, kg] of Object.entries(food()?.weights || {})) by[date] = { date, kg, src: 'yazio' };
  (state.gym.weights || []).forEach((w, i) => by[w.date] = { ...w, src: 'manual', i });
  return Object.values(by).sort((a, b) => a.date < b.date ? -1 : 1);
}
function weightTrend(W){
  return W.map(w => { const d = parseDay(w.date), from = dayPlus(d, -7);
    const win = W.filter(v => { const x = parseDay(v.date); return x > from && x <= d; });
    return { x: d, y: +(win.reduce((a, v) => a + v.kg, 0) / win.length).toFixed(1) }; });
}
function weightRate(W){
  const since = dayPlus(now(), -28), pts = W.filter(w => parseDay(w.date) >= since).map(w => [parseDay(w.date) / 864e5, w.kg]);
  if (pts.length < 3) return null;
  const mx = avg(pts.map(p => p[0])), my = avg(pts.map(p => p[1]));
  const den = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
  return den ? +(pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / den * 7).toFixed(2) : null;
}

function weightCard(){
  const W = allWeights(), rate = weightRate(W);
  const cur = W[W.length - 1], first = W[0];
  const monthAgo = new Date(now()); monthAgo.setDate(monthAgo.getDate() - 30);
  const ref30 = [...W].reverse().find(w => parseDay(w.date) <= monthAgo) || first;
  const delta = (a, b) => { if (!a || !b || a === b) return '—'; const d = +(a.kg - b.kg).toFixed(1); return `${d > 0 ? '+' : ''}${d} kg`; };
  return `<div class="card"><h3>Body weight <span class="sub">${W.length} entr${W.length === 1 ? 'y' : 'ies'}</span></h3>
    <div class="gw-top">
      <div><div class="k">Current</div><div class="gw-big">${cur ? cur.kg : '—'}<small> kg</small></div><div class="hint">${cur ? fmtDate(parseDay(cur.date)) : 'log your first weigh-in'}</div></div>
      <div><div class="k">30 days</div><div class="gw-mid">${delta(cur, ref30)}</div></div>
      <div><div class="k">Since start</div><div class="gw-mid">${delta(cur, first)}</div></div>
      <div><div class="k">Trend (4 wk)</div><div class="gw-mid">${rate == null ? '—' : `${rate > 0 ? '+' : ''}${rate} <small>kg/wk</small>`}</div></div>
    </div>
    <div class="add-row" style="margin:12px 0">
      <input id="gwKg" type="number" inputmode="decimal" step="0.1" min="20" max="400" placeholder="Today's weight (kg)" value="">
      <button class="btn primary" data-act="gym-wlog">Log</button>
    </div>
    ${W.length >= 2 ? lineChart(W.map(w => ({ x: parseDay(w.date), y: w.kg, tip: `${fmtDate(parseDay(w.date))} · ${w.kg} kg (${w.src})` })), 'kg', W.length >= 4 ? weightTrend(W) : null)
      : `<div class="empty">${W.length ? 'One more weigh-in and your curve starts here.' : 'Type your weight above to start your curve.'}</div>`}
    ${W.length ? `<details class="gw-list"><summary class="hint">All entries</summary>${[...W].reverse().map(w => `<div class="gw-row"><span>${fmtDate(parseDay(w.date))}</span><span class="hint">${w.src}</span><b>${w.kg} kg</b>${w.src === 'manual' ? `<button class="x" data-act="gym-wdel" data-i="${w.i}" title="delete">×</button>` : '<span style="width:20px"></span>'}</div>`).join('')}</details>` : ''}
  </div>`;
}

function progressCard(){
  const G = state.gym, exs = G.days.flatMap(d => d.exercises.map(x => ({ ...x, day: d.name })));
  const withHist = exs.map(x => ({ ...x, hist: exerciseHistory(x.id) })).filter(x => x.hist.length);
  const monday = new Date(now()); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const weeks = Array.from({ length: 8 }, (_, i) => { const s = new Date(monday); s.setDate(s.getDate() - 7 * (7 - i)); const e = new Date(s); e.setDate(e.getDate() + 7);
    const y = G.log.filter(l => { const d = parseDay(l.date); return d >= s && d < e; }).length;
    return { y, label: `${s.getDate()}/${s.getMonth() + 1}`, now: i === 7, tip: `week of ${fmtDate(s)} · ${y} session${y === 1 ? '' : 's'}` }; });
  const freq = `<div class="k" style="margin:4px 0 6px">Sessions per week</div>${barChart(weeks)}`;

  if (!withHist.length) return `<div class="card"><h3>Progression</h3>${freq}
    <div class="empty">Open a session and tap "Session done" after training:<br>your progress per exercise shows up here.</div></div>`;

  const sel = withHist.find(x => x.id === G.sel) || withHist[0], hs = sel.hist, a = hs[0], z = hs[hs.length - 1];
  const unit = z.bw ? 'reps' : 'kg (est. 1RM)', best = hs.reduce((m, p) => p.y > m.y ? p : m, hs[0]);
  const ch = a === z ? '—' : `${z.y >= a.y ? '+' : ''}${+(z.y - a.y).toFixed(1)} ${z.bw ? 'reps' : 'kg'} (${a.y ? Math.round((z.y / a.y - 1) * 100) : 0}%)`;
  const prs = withHist.map(x => { const b = x.hist.reduce((m, p) => p.y > m.y ? p : m, x.hist[0]);
    return `<div class="gw-row"><span>${esc(x.name)}</span><b>${b.y} ${b.bw ? 'reps' : 'kg'}</b><span class="hint">${fmtDate(b.x)}</span></div>`; }).join('');
  return `<div class="card"><h3>Progression <span class="sub">${G.log.length} sessions</span></h3>
    <select id="gymSel" class="gym-sel">${withHist.map(x => `<option value="${x.id}" ${x.id === sel.id ? 'selected' : ''}>${esc(x.day)} · ${esc(x.name)}</option>`).join('')}</select>
    <div class="gw-top" style="margin-top:10px">
      <div><div class="k">Latest</div><div class="gw-mid">${z.y} <small>${unit}</small></div><div class="hint">${esc(z.raw)}</div></div>
      <div><div class="k">Best</div><div class="gw-mid">${best.y}</div><div class="hint">${fmtDate(best.x)}</div></div>
      <div><div class="k">Since first</div><div class="gw-mid">${ch}</div></div>
    </div>
    ${hs.length >= 2 ? lineChart(hs.map(p => ({ x: p.x, y: p.y, tip: `${fmtDate(p.x)} · ${p.raw} → ${p.y} ${p.bw ? 'reps' : 'kg 1RM'}` })), unit)
      : '<div class="empty">Do this session once more to see your trend.</div>'}
    <div class="hint" style="margin-bottom:12px">${z.bw ? 'Bodyweight: best set\'s reps.' : 'Estimated 1-rep max of your best set (Epley: weight × (1 + reps/30)), so heavier and higher-rep sets are comparable.'}</div>
    ${freq}
    <details class="gw-list" style="margin-top:10px"><summary class="hint">Personal records</summary>${prs}</details>
  </div>`;
}

function pageGym(sub, arg){
  if (sub === 'day') return pageGymDay(+arg);
  if (sub === 'weight') return `${backLink('#/gym', 'Gym')}<h1 class="page-title">Body weight</h1>${weightCard()}`;
  if (sub === 'progress') return `${backLink('#/gym', 'Gym')}<h1 class="page-title">Progression</h1>${progressCard()}`;
  const g = state.gym, { thisWeek, next } = gymStats(), today = isoDay(now()), W = allWeights(), cur = W[W.length - 1];
  const days = g.days.map((d, di) => {
    const lastDone = [...g.log].reverse().find(l => l.dayId === d.id), doneToday = lastDone?.date === today;
    const right = doneToday ? '<span class="tag prep">✓ today</span>' : next?.id === d.id ? '<span class="tag exercise">next up</span>' : '';
    return navRow(`#/gym/day/${di}`, esc(d.name), `${lastDone ? 'last done ' + fmtDate(parseDay(lastDone.date)) : 'never logged'} · ${d.exercises.length} exercises`, right);
  }).join('');
  return `<h1 class="page-title">Gym</h1>
  <div class="stats" style="grid-template-columns:repeat(3,1fr)">
    <div class="card stat"><div class="k">This week</div><div class="v">${thisWeek}</div><div class="k">sessions</div></div>
    <div class="card stat"><div class="k">Next up</div><div class="v" style="font-size:20px">${next ? esc(next.name) : '—'}</div></div>
    <div class="card stat"><div class="k">Total</div><div class="v">${g.log.length}</div><div class="k">sessions</div></div>
  </div>
  <div class="card nav-list" style="margin-bottom:16px"><h3>Sessions</h3>${days}
    <button class="btn" style="margin-top:12px" data-act="gym-addday">+ Add training day</button></div>
  <div class="card nav-list">
    ${navRow('#/gym/weight', 'Body weight', cur ? `${cur.kg} kg · ${fmtDate(parseDay(cur.date))}` : 'no weigh-in yet')}
    ${navRow('#/gym/progress', 'Progression', 'charts per exercise and personal records')}
  </div>`;
}

function pageGymDay(di){
  const g = state.gym, d = g.days[di], today = isoDay(now());
  if (!d) return `${backLink('#/gym', 'Gym')}<div class="empty">This training day no longer exists.</div>`;
  const lastDone = [...g.log].reverse().find(l => l.dayId === d.id), doneToday = lastDone?.date === today;
  const prev = [...g.log].reverse().find(l => l.dayId === d.id && l.date !== today);
  const rows = d.exercises.map((x, xi) => {
    const at = `data-d="${di}" data-e="${xi}"`;
    const sets = setRows(x.sets).map((s, i) => `<div class="set-row"><span class="set-n">${i + 1}</span>
      <input class="gym-in set-in" inputmode="decimal" data-gset="w" ${at} data-i="${i}" value="${s.w}" placeholder="kg"><span class="set-x">×</span>
      <input class="gym-in set-in" inputmode="numeric" data-gset="r" ${at} data-i="${i}" value="${s.r}" placeholder="reps">
      <button class="x" data-act="gym-delset" ${at} data-i="${i}" title="remove set">×</button></div>`).join('');
    return `<div class="gym-ex">
      <div class="gym-ex-head">
        <input class="gym-in gym-name" data-gym="name" ${at} value="${esc(x.name)}" placeholder="Exercise">
        <div class="gym-move"><button class="x" data-act="gym-mv" ${at} data-dir="-1" title="move up">↑</button><button class="x" data-act="gym-mv" ${at} data-dir="1" title="move down">↓</button></div>
        <button class="x" data-act="gym-delex" ${at} title="remove exercise">×</button>
      </div>
      ${x.fr ? `<div class="hint gym-fr">FR: ${esc(x.fr)}</div>` : ''}
      ${prev?.sets?.[x.id] ? `<div class="hint gym-last">last (${fmtDate(parseDay(prev.date))}): ${esc(prev.sets[x.id])}</div>` : ''}
      <div class="sets">${sets}</div>
      <button class="btn set-add" data-act="gym-addset" ${at}>+ set</button>
    </div>`;
  }).join('');
  return `${backLink('#/gym', 'Gym')}
  <div class="card gym-day">
    <div class="gym-head"><input class="gym-in gym-title" data-gym="day" data-d="${di}" value="${esc(d.name)}"></div>
    <div class="hint" style="margin:-4px 0 10px">${lastDone ? 'last done ' + fmtDate(parseDay(lastDone.date)) : 'never logged'} · ${d.exercises.length} exercises</div>
    <div class="gym-list">${rows}</div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn" data-act="gym-addex" data-d="${di}">+ Exercise</button>
      <button class="btn danger" data-act="gym-delday" data-d="${di}" style="margin-left:auto">Delete day</button>
    </div>
  </div>
  <button class="btn ${doneToday ? '' : 'primary'} big-btn" data-act="gym-done" data-d="${di}">${doneToday ? '✓ Logged today (tap to undo)' : 'Session done'}</button>`;
}

function pageSettings(){
  return `<h1 class="page-title">Settings</h1>
  <div class="grid g-2">
    <div class="card"><h3>Automatic backup <span class="sub">${lastBackupText()}</span></h3>
      <p class="hint">${backupStatus === 'server' ? 'Every change is saved to your Cloudflare storage, and the last version of each day is kept for 35 days (restore one from /api/backups).'
        : backupStatus === 'download' ? 'This browser cannot write to a folder, so a backup file is downloaded once a week.'
        : backupStatus === 'none' ? 'Pick a folder (e.g. the backups folder inside SemesterTracker, or a OneDrive folder) and Daybook writes one file a day there, keeping the last 30.'
        : `Daily copy of everything into your backup folder, last 30 kept.${backupStatus === 'paused' ? ' Paused: Chrome needs your OK again.' : ''}`}</p>
      ${backupStatus === 'paused' ? '<button class="btn primary" data-act="backup-resume">Resume</button> ' : ''}
      ${window.showDirectoryPicker && !HOSTED ? `<button class="btn ${backupStatus === 'none' ? 'primary' : ''}" data-act="backup-choose">${backupStatus === 'none' ? 'Choose folder' : 'Change folder'}</button> ` : ''}
      ${backupStatus === 'ok' ? '<button class="btn" data-act="backup-now">Back up now</button> ' : ''}
      <button class="btn" data-act="export">Download a copy</button>${HOSTED ? ' <a class="btn" href="logout">Sign out</a>' : ''}</div>
    ${notifyCard()}
    <div class="card"><h3>Theme</h3>      <select id="themeSel" class="gym-sel">${[['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto']].map(([k, n]) => `<option value="${k}" ${(state.theme || 'auto') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="card"><h3>Import</h3><p class="hint">Restore from a backup file. This replaces the current data.</p><input type="file" id="importFile" accept=".json"></div>
    <div class="card"><h3>Reset</h3><p class="hint">Restore the original course data. Your checkmarks are kept unless you also clear them.</p>
      <button class="btn" data-act="reseed">Reload course data</button> <button class="btn danger" data-act="wipe">Erase everything</button></div>
  </div>`;
}
