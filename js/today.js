const avg = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

function todayCard(){
  const t = now(), tIso = isoDay(t), F = food(), fd = foodDay(tIso) || {}, G = F?.goals || {};
  const { next } = gymStats(), gymToday = state.gym.log.find(l => l.date === tIso);
  const gymDay = gymToday && state.gym.days.find(d => d.id === gymToday.dayId);
  const metric = (href, k, v, sub) => `<a class="td-m" href="${href}"><span class="k">${k}</span><b>${v}</b><span class="hint">${sub}</span></a>`;
  return `<div class="card td-card">
    <div class="td-row"><span class="td-lbl">Prayers</span><div class="pr-mini">${PRAYERS.map(p => `${prayBtn(tIso, p, 'pr-pill')}${p[1]}</button>`).join('')}</div>
      <span class="hint td-next">${prayCount(tIso) === 5 ? 'all five done, alhamdulillah' : `next: ${nextPrayerLine()}`}</span></div>
    <div class="td-metrics">
      ${F ? metric('#/food', 'Calories', `${fd.kcal || 0}${G.kcal ? `<small> / ${Math.round(G.kcal)}</small>` : ''}`, `protein ${Math.round(fd.protein || 0)} g`) : ''}
      ${F ? metric('#/food', 'Steps', fmtNum(fd.steps || 0), G.steps ? `${Math.round((fd.steps || 0) / G.steps * 100)}% of ${fmtNum(G.steps)}` : '') : ''}
      ${metric('#/gym', 'Gym', gymDay ? `✓ ${esc(gymDay.name)}` : 'rest', gymDay ? 'logged today' : next ? `next up: ${esc(next.name)}` : '')}
    </div></div>`;
}
