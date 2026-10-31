const WEEKS = ['2026-09-07','2026-09-14','2026-09-21','2026-09-28','2026-10-05','2026-10-12',
               '2026-10-26','2026-11-02','2026-11-09','2026-11-16','2026-11-23','2026-11-30','2026-12-07','2026-12-14'];
const BREAK_START = '2026-10-19';
const IMPORTANT = ['homework','prep'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_LONG = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STORE_KEY = 'semester-tracker-v1';

const parseDay = iso => { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d); };
const parseDT = s => { const [ds, ts='23:59'] = s.split('T'); const x = parseDay(ds); const [h,mi] = ts.split(':').map(Number); x.setHours(h, mi, 0, 0); return x; };
const weekStart = n => parseDay(WEEKS[n-1]);
const at = (n, day, time='23:59') => { const x = weekStart(n); x.setDate(x.getDate() + Number(day)); const [h,mi] = time.split(':').map(Number); x.setHours(h, mi, 0, 0); return x; };
const fmtDate = d => `${DAYS[(d.getDay()+6)%7]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const fmtTime = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const sameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtNum = n => Math.round(n).toLocaleString('fr-CH');
const uid = () => Math.random().toString(36).slice(2, 9);

function now(){ return new Date(); }
function currentWeek(){
  const t = now();
  if (t < weekStart(1)) return 'before';
  const bs = parseDay(BREAK_START), be = new Date(bs); be.setDate(be.getDate()+7);
  if (t >= bs && t < be) return 'break';
  for (let n = 14; n >= 1; n--) if (t >= weekStart(n)) {
    const end = weekStart(n); end.setDate(end.getDate()+7);
    return t < end ? n : (n === 14 ? 'after' : n);
  }
  return 'before';
}
const focusWeek = () => { const w = currentWeek(); return w === 'break' ? 7 : w === 'before' ? 1 : w === 'after' ? 14 : w; };

function countdown(date){
  const ms = date - now(), abs = Math.abs(ms);
  const d = Math.floor(abs/864e5), h = Math.floor(abs%864e5/36e5), m = Math.floor(abs%36e5/6e4);
  const txt = d >= 2 ? `${d} days` : d === 1 ? `1 day ${h}h` : h >= 1 ? `${h}h ${m}m` : `${m} min`;
  return ms < 0 ? `${txt} ago` : `in ${txt}`;
}
function urgency(date, done){
  if (done) return 'muted';
  const ms = date - now();
  if (ms < 0) return 'red';
  if (ms < 2*864e5) return 'red';
  if (ms < 7*864e5) return 'amber';
  return 'muted';
}
