const PRAYER_METHODS = {
  mwl: ['Muslim World League', 18, 17],
  uoif: ['UOIF (France)', 12, 12],
  isna: ['ISNA', 15, 15],
  egypt: ['Egyptian Authority', 19.5, 17.5],
};
const PLACE = { name: 'Lausanne', lat: 46.5197, lon: 6.6323 };
const prayerCfg = () => ({ method: 'mwl', asr: 1, ...state.prayerCfg });

const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const fixAngle = a => a - 360 * Math.floor(a / 360), fixHour = h => h - 24 * Math.floor(h / 24);

function sunPosition(jd){
  const D = jd - 2451545, g = fixAngle(357.529 + 0.98560028 * D), q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * Math.sin(rad(g)) + 0.020 * Math.sin(rad(2 * g))), e = 23.439 - 0.00000036 * D;
  const ra = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
  return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: q / 15 - fixHour(ra) };
}

function prayerTimes(date){
  const { lat, lon } = PLACE, cfg = prayerCfg(), [, fajrA, ishaA] = PRAYER_METHODS[cfg.method] || PRAYER_METHODS.mwl;
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const Y = m <= 2 ? y - 1 : y, M = m <= 2 ? m + 12 : m, A = Math.floor(Y / 100);
  const jd = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + 2 - A + Math.floor(A / 4) - 1524.5 - lon / 360;
  const noon = t => fixHour(12 - sunPosition(jd + t).eqt);
  const angleTime = (angle, t, before) => {
    const { decl } = sunPosition(jd + t);
    const T = deg(Math.acos((-Math.sin(rad(angle)) - Math.sin(rad(decl)) * Math.sin(rad(lat))) / (Math.cos(rad(decl)) * Math.cos(rad(lat))))) / 15;
    return noon(t) + (before ? -T : T);
  };
  const asr = t => { const { decl } = sunPosition(jd + t);
    return angleTime(-deg(Math.atan(1 / (cfg.asr + Math.tan(rad(Math.abs(lat - decl)))))), t); };
  const h = { fajr: angleTime(fajrA, 5 / 24, true), sunrise: angleTime(0.833, 6 / 24, true), dhuhr: noon(12 / 24),
              asr: asr(13 / 24), maghrib: angleTime(0.833, 18 / 24), isha: angleTime(ishaA, 18 / 24) };
  const night = 24 - (h.maghrib - h.sunrise);
  if (isNaN(h.fajr)) h.fajr = h.sunrise - night * fajrA / 60;
  if (isNaN(h.isha)) h.isha = h.maghrib + night * ishaA / 60;
  const tz = -new Date(y, m - 1, d, 12).getTimezoneOffset() / 60, out = {};
  for (const [k, v] of Object.entries(h)) {
    const mins = Math.round((v + tz - lon / 15) * 60), x = new Date(y, m - 1, d); x.setMinutes(mins); out[k] = x;
  }
  return out;
}

function nextPrayerTime(){
  const t = now(), today = prayerTimes(t);
  const p = PRAYERS.find(([k]) => today[k] > t);
  if (p) return { p, at: today[p[0]] };
  const tm = new Date(t); tm.setDate(tm.getDate() + 1);
  return { p: PRAYERS[0], at: prayerTimes(tm).fajr };
}
