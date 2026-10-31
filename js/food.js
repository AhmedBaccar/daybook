const food = () => typeof FOOD_DATA === 'undefined' ? null : FOOD_DATA;
const foodDay = iso => food()?.days?.[iso] || null;
const MACROS = [['protein', 'Protein', '#6f9bd8'], ['carb', 'Carbs', '#d6b45a'], ['fat', 'Fat', '#c98aa8']];

function foodStats(){
  const F = food(), today = parseDay(isoDay(now())), goal = Math.round(F.goals?.kcal || 0);
  const last = n => Array.from({ length: n }, (_, i) => isoDay(dayPlus(today, -i))).map(iso => ({ iso, d: foodDay(iso) }));
  const past7 = last(8).slice(1).filter(x => x.d?.kcal), avg = k => past7.length ? Math.round(past7.reduce((a, x) => a + x.d[k], 0) / past7.length) : 0;
  const onTarget = goal ? last(15).slice(1).filter(x => x.d?.kcal && Math.abs(x.d.kcal / goal - 1) <= .1).length : 0;
  return { F, today, goal, t: foodDay(isoDay(today)) || {}, avgKcal: avg('kcal'), avgProtein: avg('protein'), logged7: past7.length, onTarget, last };
}

function foodSyncNote(F){
  const age = (now() - new Date(F.updated)) / 36e5;
  return age > 3 ? `<div class="card upd-card" style="border-color:rgba(255,181,71,.4)">Last Yazio sync was ${countdown(new Date(F.updated))}. Check the <code>food-error</code> key in the Worker's KV.</div>` : '';
}

function stepsCard(s){
  const goal = s.F.goals?.steps || 0, days = s.last(14).reverse(), tIso = isoDay(s.today);
  const past = days.filter(x => x.iso !== tIso && x.d?.steps).map(x => x.d.steps);
  const over = goal ? past.filter(n => n >= goal).length : 0, best = Math.max(0, ...past);
  let streak = 0; for (const x of [...days].reverse().slice(1)) { if (goal && x.d?.steps >= goal) streak++; else break; }
  const bars = days.map(({ iso, d }) => { const x = parseDay(iso), n = d?.steps || 0;
    return { y: n, txt: n ? `${+(n / 1000).toFixed(1)}k` : '', label: `${x.getDate()}/${x.getMonth() + 1}`, now: iso === tIso, tip: `${fmtDate(x)} · ${fmtNum(n)} steps` }; });
  return `<div class="card" style="margin-bottom:16px"><h3>Last 14 days <span class="sub">${goal ? `dashed line = ${fmtNum(goal)} goal` : ''}</span></h3>
    <div class="st-wrap"><div class="gw-top st-nums">
      <div><div class="k">Today</div><div class="gw-mid">${fmtNum(s.t.steps || 0)}</div></div>
      <div><div class="k">Daily average</div><div class="gw-mid">${past.length ? fmtNum(avg(past)) : '—'}</div></div>
      <div><div class="k">Over goal</div><div class="gw-mid">${over}<small> / ${past.length} days</small></div></div>
      <div><div class="k">Streak</div><div class="gw-mid">${streak}<small> day${streak === 1 ? '' : 's'}</small></div></div>
      <div><div class="k">Best day</div><div class="gw-mid">${best ? fmtNum(best) : '—'}</div></div>
    </div><div>${barChart(bars, goal)}</div></div></div>`;
}

function pageFood(sub){
  const head = `<h1 class="page-title">Nutrition</h1>`;
  if (!food()) return `${head}<div class="card ph-box"><h2>No Yazio data yet</h2><p>It appears after the first hourly sync.</p></div>`;
  const s = foodStats(), { F, t, goal } = s, G = F.goals || {}, days = s.last(14).reverse();

  if (sub === 'steps') return `${backLink('#/food', 'Nutrition')}<h1 class="page-title">Steps</h1>${stepsCard(s)}`;
  if (sub === 'history') {
    const bars = days.map(({ iso, d }) => { const x = parseDay(iso), k = d?.kcal || 0;
      return { y: k, label: `${x.getDate()}/${x.getMonth() + 1}`, now: iso === isoDay(s.today), tip: `${fmtDate(x)} · ${k} kcal${goal ? ` (goal ${goal})` : ''}` }; });
    const rows = [...days].reverse().map(({ iso, d }) => `<tr><td>${iso === isoDay(s.today) ? '<b>Today</b>' : fmtDate(parseDay(iso))}</td>
      <td class="num">${d?.kcal ?? '—'}</td>${MACROS.map(([k]) => `<td class="num">${d ? Math.round(d[k]) : '—'}</td>`).join('')}</tr>`).join('');
    return `${backLink('#/food', 'Nutrition')}<h1 class="page-title">Calories</h1>
    <div class="card" style="margin-bottom:16px"><h3>Last 14 days <span class="sub">dashed line = ${goal} kcal goal</span></h3>${barChart(bars, goal)}</div>
    <div class="card"><h3>Daily log <span class="sub">grams</span></h3>
      <table class="g-table"><tr><th>Day</th><th class="num">kcal</th>${MACROS.map(m => `<th class="num">${m[1]}</th>`).join('')}</tr>${rows}</table></div>`;
  }

  const macro = ([k, name, c]) => { const v = Math.round(t[k] || 0), g = G[k];
    return `<div class="fd-macro"><div class="fd-mh"><span>${name}</span><b>${v}${g ? `<span class="hint"> / ${Math.round(g)} g</span>` : ' g'}</b></div>
      <div class="bar" style="--c:${c}"><i style="width:${g ? Math.min(100, v / g * 100) : 0}%"></i></div></div>`; };
  return `${head}${foodSyncNote(F)}
  <div class="card" style="margin-bottom:16px"><h3>Today <span class="sub">synced ${fmtTime(new Date(F.updated))}</span></h3>
    <div class="hero">${ring(goal ? (t.kcal || 0) / goal : 0, 120, 12, t.kcal > goal * 1.1 ? 'var(--red)' : 'var(--green)', `${t.kcal || 0}<br><small style="font-size:11px;color:var(--muted)">kcal</small>`, 22)}
      <div style="flex:1;min-width:200px">${MACROS.map(macro).join('')}</div></div>
    ${goal ? `<div class="hint" style="margin-top:12px">${t.kcal > goal ? `${t.kcal - goal} kcal over` : `${goal - (t.kcal || 0)} kcal left`} of your ${goal} kcal goal</div>` : ''}</div>
  <div class="stats">
    <div class="card stat"><div class="k">Avg last 7 days</div><div class="v">${s.avgKcal || '—'}</div><div class="k">kcal/day</div></div>
    <div class="card stat"><div class="k">Avg protein</div><div class="v">${s.avgProtein || '—'}<small> g</small></div><div class="k">${G.protein ? `goal ${Math.round(G.protein)} g` : 'per day'}</div></div>
    <div class="card stat"><div class="k">On target</div><div class="v">${s.onTarget}<small>/14</small></div><div class="k">days within ±10%</div></div>
    <div class="card stat"><div class="k">Weight</div><div class="v">${F.weight?.kg ?? '—'}<small> kg</small></div><div class="k">${F.weight ? fmtDate(parseDay(F.weight.date.slice(0, 10))) : 'none logged'}</div></div>
  </div>
  <div class="card nav-list">
    ${navRow('#/food/steps', 'Steps', `${fmtNum(t.steps || 0)} today${G.steps ? ` · goal ${fmtNum(G.steps)}` : ''}`)}
    ${navRow('#/food/history', 'Calories history', 'last 14 days and daily log')}
  </div>`;
}
