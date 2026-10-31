const VAPID_PUBLIC = 'BFmXVMty7vUAK4vSNzCfKvuMPkMXj5A-U_5NInPGCtBYM_YF-90c3N8oXhp1dVOlfhVITVigsLX10x1X1wWQaI0';
const notifyPrefs = () => ({ prayers: true, deadlines: true, homework: true, ...state.notify });
const canPush = () => HOSTED && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
let pushOn = false;

// what the server should send over the next 7 days; it skips anything already ticked when the time comes
function pushPlan(){
  const P = notifyPrefs(), t = now(), until = +t + 7 * 864e5, out = [];
  if (P.prayers) for (let i = 0; i < 7; i++) {
    const d = dayPlus(parseDay(isoDay(t)), i), iso = isoDay(d), times = prayerTimes(d);
    for (const [k, name] of PRAYERS) if (times[k] > t)
      out.push({ at: +times[k], tag: `pr-${iso}-${k}`, title: name, body: `It's ${fmtTime(times[k])}, time for ${name}`, url: '#/prayers', check: { prayer: [iso, k] } });
  }
  const remind = (id, due, what, title, url) => {
    for (const [h, when] of [[24, 'tomorrow'], [3, 'in 3 hours']]) {
      const at = +due - h * 36e5;
      if (at > +t && at < until) out.push({ at, tag: `due-${id}-${h}`, title: `${what} ${when}`, body: title, url, check: { done: id } });
    }
  };
  if (P.deadlines) for (const d of allDeadlines()) if (!isDone(d.id))
    remind(d.id, d.at, `${d.s.code}: ${d.kind === 'exam' ? 'exam' : d.kind === 'todo' ? 'to do' : 'due'}`, d.title, `#/deadlines/${encodeURIComponent(d.id)}`);
  if (P.homework) for (const s of state.subjects) for (const n of [focusWeek(), focusWeek() + 1]) if (n <= 14)
    for (const it of itemsFor(s, n)) if ((it.kind === 'homework' || it.kind === 'prep') && !isDone(it.id))
      remind(it.id, it.due, `${s.code}: ${it.kind === 'prep' ? 'prep' : 'graded homework'} due`, `${it.label}${it.topic ? ': ' + it.topic : ''}`, `#/s/${s.id}`);
  return out.sort((a, b) => a.at - b.at);
}

function updatePushPlan(){
  if (!HOSTED) return;
  const plan = pushPlan();
  if (JSON.stringify(plan) !== JSON.stringify(state.pushPlan)) { state.pushPlan = plan; save(); }
}

const b64uBytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function checkPush(){
  if (!canPush()) return;
  try { pushOn = Notification.permission === 'granted' && !!(await (await navigator.serviceWorker.ready).pushManager.getSubscription()); } catch {}
}
async function enablePush(){
  try {
    if (await Notification.requestPermission() !== 'granted') { toast('Notifications are blocked in your settings'); return rerender(); }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uBytes(VAPID_PUBLIC) });
    const r = await fetch('api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sub) });
    if (!r.ok) throw new Error(r.status);
    pushOn = true; updatePushPlan(); toast('Notifications on for this device');
  } catch { toast('Could not turn on notifications'); }
  rerender();
}
async function testPush(){
  const r = await fetch('api/push/test', { method: 'POST' }).catch(() => null);
  toast(r?.ok ? 'Test sent, it should arrive in a few seconds' : 'Test failed: is the server key set up?');
}

function notifyCard(){
  if (!HOSTED) return '';
  const P = notifyPrefs(), standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const status = !canPush() ? (standalone ? 'This browser cannot receive notifications.' : 'On iPhone, add Daybook to your Home Screen first (Safari → Share → Add to Home Screen), then open it from there.')
    : Notification.permission === 'denied' ? 'Blocked: allow notifications for Daybook in your phone settings.'
    : pushOn ? 'On for this device.' : 'Off on this device.';
  const tg = (k, label) => `<label class="tg"><input type="checkbox" data-notify="${k}" ${P[k] ? 'checked' : ''}><span>${label}</span></label>`;
  return `<div class="card"><h3>Notifications</h3><p class="hint">${status}</p>
    ${tg('prayers', 'Prayer times')}${tg('deadlines', 'Deadlines and exams (the day before and 3 h before)')}${tg('homework', 'Graded homework and SA prep not done yet')}
    <div style="display:flex;gap:8px;margin-top:12px">
      ${canPush() && !pushOn && Notification.permission !== 'denied' ? '<button class="btn primary" data-act="push-on">Turn on</button>' : ''}
      ${pushOn ? '<button class="btn" data-act="push-test">Send a test</button>' : ''}</div></div>`;
}
