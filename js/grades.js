const toSwiss = p => Math.round((1 + 5 * Math.max(0, Math.min(1, p / 100))) * 4) / 4;
function partScore(s, p){
  if (p.auto === 'hw') {
    const due = allItems(s).filter(i => i.kind === 'homework' && i.due <= now());
    return due.length ? { score: 100 * due.filter(i => isDone(i.id)).length / due.length, partial: true,
      detail: `${due.filter(i => isDone(i.id)).length}/${due.length} chats ticked as done` } : null;
  }
  if (p.sub?.length) return { score: p.sub.reduce((a,b) => a+b, 0) / p.sub.length, partial: true, detail: `average of ${p.sub.length} graded` };
  if (p.score != null) return { score: p.score };
  return null;
}
function gradeCalc(s){
  const parts = (s.grading?.parts || []).map(p => ({ ...p, got: partScore(s, p) }));
  const graded = parts.filter(p => p.got);
  const wG = graded.reduce((a,p) => a + p.weight, 0);
  const current = wG ? graded.reduce((a,p) => a + p.weight * p.got.score, 0) / wG : null;
  const assume = p => p.got ? p.got.score : (state.whatif[s.id + ':' + p.id] ?? 75);
  const total = parts.reduce((a,p) => a + p.weight, 0) || 1;
  const projected = parts.reduce((a,p) => a + p.weight * assume(p), 0) / total;
  const secured = graded.filter(p => !p.got.partial).reduce((a,p) => a + p.weight * p.got.score / 100, 0);
  const lost = graded.filter(p => !p.got.partial).reduce((a,p) => a + p.weight * (100 - p.got.score) / 100, 0);
  return { parts, current, projected, assume, wG, total, secured, lost };
}
function pageGrades(id){
  const subs = state.subjects.filter(s => s.role !== 'ta' && s.grading);
  if (!id) {
    const rows = subs.map(s => { const g = gradeCalc(s);
      return navRow(`#/grades/${s.id}`, `${esc(s.name)}`, `${esc(s.code)} · so far ${g.current != null ? toSwiss(g.current).toFixed(2) : '—'}`,
        `<span class="g-proj"><b>${toSwiss(g.projected).toFixed(2)}</b><small>projected</small></span>`).replace('<a class="nav-row"', `<a class="nav-row" style="--c:${s.color}"`); }).join('');
    return `<h1 class="page-title">Grades</h1><div class="card nav-list g-list">${rows}</div>`;
  }
  const cards = subs.filter(s => s.id === id).map(s => {
    const g = gradeCalc(s);
    const rows = g.parts.map(p => {
      const key = s.id + ':' + p.id;
      const status = p.got
        ? `<b style="color:${p.got.score >= 75 ? 'var(--green)' : p.got.score >= 50 ? 'var(--amber)' : 'var(--red)'}">${Math.round(p.got.score*10)/10}/100</b>${p.got.detail ? ` <span class="hint">· ${p.got.detail}</span>` : ''}`
        : `<span class="hint">not graded yet · assume</span> <input class="whatif" type="number" min="0" max="100" step="5" data-key="${esc(key)}" value="${Math.round(g.assume(p))}">`;
      return `<tr><td>${linkTo(p.url, esc(p.label))}${p.note ? `<div class="hint">${esc(p.note)}</div>` : ''}</td><td class="num">${p.weight}%</td><td>${status}</td></tr>`;
    }).join('');
    const seg = (w, c) => w > 0 ? `<i style="width:${w}%;background:${c}"></i>` : '';
    return `<div class="topline">${esc(s.code)}</div><h1 class="page-title">${esc(s.name)}</h1><div class="card" style="--c:${s.color}">
      <div class="g-head">
        ${ring(g.current != null ? g.current/100 : 0, 92, 10, s.color, g.current != null ? Math.round(g.current) + '%' : '—', 20)}
        <div class="g-nums">
          <div><span class="k">So far</span><b>${g.current != null ? toSwiss(g.current).toFixed(2) : '—'}</b><span class="hint">${g.current != null ? `on ${g.wG}% of the grade` : 'nothing graded yet'}</span></div>
          <div><span class="k">Projected</span><b>${toSwiss(g.projected).toFixed(2)}</b><span class="hint">${Math.round(g.projected)}% overall</span></div>
        </div>
      </div>
      <div class="g-bar" title="locked in / lost / still open">${seg(g.secured, s.color)}${seg(g.lost, 'var(--red)')}</div>
      <div class="hint" style="margin:4px 0 12px">${Math.round(g.secured*10)/10} pts locked in · ${Math.round(g.lost*10)/10} pts lost · ${Math.round((g.total - g.secured - g.lost)*10)/10} pts still open</div>
      <table class="g-table"><thead><tr><th>Component</th><th class="num">Weight</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }).join('');
  return `${backLink('#/grades', 'Grades')}${cards || '<div class="empty">No grading info for this course.</div>'}`;
}
