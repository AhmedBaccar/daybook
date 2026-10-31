const PRAYERS = [
  ['fajr', 'Fajr', '🌅'],
  ['dhuhr', 'Dhuhr', '☀️'],
  ['asr', 'Asr', '🌤'],
  ['maghrib', 'Maghrib', '🌇'],
  ['isha', 'Isha', '🌙'],
];
const prayDay = iso => state.prayers[iso] || {};
const prayCount = iso => PRAYERS.filter(p => prayDay(iso)[p[0]]).length;
const dayPlus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function prayerStats(){
  const today = parseDay(isoDay(now())), tIso = isoDay(today);
  let streak = 0, d = prayCount(tIso) === 5 ? today : dayPlus(today, -1);
  while (prayCount(isoDay(d)) === 5) { streak++; d = dayPlus(d, -1); }
  let best = 0, run = 0, prev = '';
  for (const k of Object.keys(state.prayers).filter(k => prayCount(k) === 5).sort()) {
    run = prev && isoDay(dayPlus(parseDay(prev), 1)) === k ? run + 1 : 1; best = Math.max(best, run); prev = k;
  }
  const monday = dayPlus(today, -((today.getDay() + 6) % 7));
  let week = 0, weekMax = 0;
  for (let x = monday; x <= today; x = dayPlus(x, 1)) { week += prayCount(isoDay(x)); weekMax += 5; }
  const next = PRAYERS.find(p => !prayDay(tIso)[p[0]]);
  return { today: prayCount(tIso), tIso, streak, best, week, weekMax, next };
}

const nextPrayerKey = iso => { if (iso !== isoDay(now())) return ''; const { p, at } = nextPrayerTime(); return sameDay(at, now()) && !prayDay(iso)[p[0]] ? p[0] : ''; };
const prayBtn = (iso, [k, name], cls, attrs = '') => `<button class="${cls} ${prayDay(iso)[k] ? 'on' : ''} ${cls !== 'chk' && nextPrayerKey(iso) === k ? 'next' : ''}" ${attrs} data-act="pray" data-d="${iso}" data-p="${k}" title="${name}">`;

function nextPrayerLine(){
  const { p, at } = nextPrayerTime();
  return `${p[1]} at ${fmtTime(at)} · ${countdown(at)}`;
}

function pagePrayers(sub){
  const s = prayerStats(), today = parseDay(s.tIso), times = prayerTimes(today), cfg = prayerCfg();
  if (sub === 'history') {
    const start = dayPlus(today, -((today.getDay() + 6) % 7) - 7 * 15);
    let heat = '';
    for (let x = start; x <= today; x = dayPlus(x, 1)) {
      const n = prayCount(isoDay(x));
      heat += `<i style="background:${n ? `color-mix(in srgb, var(--green) ${20 + n * 16}%, transparent)` : 'var(--panel-2)'}" title="${fmtDate(x)} · ${n}/5"></i>`;
    }
    const rows = Array.from({ length: 14 }, (_, i) => {
      const d = dayPlus(today, -i), iso = isoDay(d), n = prayCount(iso);
      return `<div class="pr-row"><span>${i === 0 ? '<b>Today</b>' : i === 1 ? 'Yesterday' : fmtDate(d)}</span>
        ${PRAYERS.map(p => `<span class="${prayDay(iso)[p[0]] ? 'done' : ''}">${prayBtn(iso, p, 'chk', 'style="--c:var(--green)"')}${CHECK}</button></span>`).join('')}
        <span class="pr-n ${n === 5 ? 'full' : ''}">${n}/5</span></div>`;
    }).join('');
    return `${backLink('#/prayers', 'Prayers')}<h1 class="page-title">History</h1>
    <div class="stats" style="grid-template-columns:repeat(2,1fr)">
      <div class="card stat"><div class="k">Best streak</div><div class="v">${s.best}</div><div class="k">full days</div></div>
      <div class="card stat"><div class="k">This week</div><div class="v">${s.week}<small>/${s.weekMax}</small></div><div class="bar" style="--c:var(--green)"><i style="width:${s.week / s.weekMax * 100}%"></i></div></div>
    </div>
    <div class="card" style="margin-bottom:16px"><h3>Last 14 days</h3>
      <div class="pr-row pr-headrow"><span></span>${PRAYERS.map(p => `<span>${p[1]}</span>`).join('')}<span></span></div>${rows}</div>
    <div class="card" style="margin-bottom:16px"><h3>Last 16 weeks</h3><div class="pr-heat">${heat}</div></div>
    <div class="card"><h3>Prayer times</h3><div class="pr-cfg"><span class="hint">${PLACE.name} · sunrise ${fmtTime(times.sunrise)}</span>
      <select data-pcfg="method">${Object.entries(PRAYER_METHODS).map(([k, [n, f, i]]) => `<option value="${k}" ${cfg.method === k ? 'selected' : ''}>${n} (${f}° / ${i}°)</option>`).join('')}</select>
      <select data-pcfg="asr"><option value="1" ${cfg.asr == 1 ? 'selected' : ''}>Asr: standard</option><option value="2" ${cfg.asr == 2 ? 'selected' : ''}>Asr: Hanafi</option></select></div></div>`;
  }
  const tiles = PRAYERS.map(p => `${prayBtn(s.tIso, p, 'pr-tile')}<b>${p[1]}</b>
    <span class="pr-time">${fmtTime(times[p[0]])}</span><small>${prayDay(s.tIso)[p[0]] ? '✓ prayed' : nextPrayerKey(s.tIso) === p[0] ? countdown(times[p[0]]) : times[p[0]] < now() ? 'tap when done' : '&nbsp;'}</small></button>`).join('');
  return `<h1 class="page-title">Prayers</h1>
  <div class="card" style="margin-bottom:16px"><h3>Today <span class="sub">${s.today}/5</span></h3><div class="pr-today">${tiles}</div>
    <div class="hint" style="margin-top:12px">${s.today === 5 ? 'All five done, alhamdulillah' : `next: ${nextPrayerLine()}`}</div></div>
  <div class="stats" style="grid-template-columns:repeat(2,1fr)">
    <div class="card stat"><div class="k">Streak</div><div class="v">${s.streak}</div><div class="k">full day${s.streak === 1 ? '' : 's'} in a row</div></div>
    <div class="card stat"><div class="k">This week</div><div class="v">${s.week}<small>/${s.weekMax}</small></div><div class="bar" style="--c:var(--green)"><i style="width:${s.week / s.weekMax * 100}%"></i></div></div>
  </div>
  <div class="card nav-list">${navRow('#/prayers/history', 'History', `last 14 days, 16-week calendar, prayer-time settings`)}</div>`;
}
