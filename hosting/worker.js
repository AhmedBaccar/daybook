// Daybook on Cloudflare: serves the app behind a passphrase, stores the app state in KV (synced between
// devices) and pulls Yazio nutrition/steps data every hour (unofficial API).
// Also sends the push notifications planned by the app (state.pushPlan), checked every 5 minutes.
// Secrets (set with `npx wrangler secret put NAME`): PASSPHRASE, YAZIO_USER, YAZIO_PASS, YAZIO_CLIENT_ID, YAZIO_CLIENT_SECRET,
// VAPID_PRIVATE_JWK (optional: VAPID_SUBJECT, a mailto: or https: contact for push services).

const COOKIE = 'daybook_session';
const TZ = 'Europe/Zurich';
const enc = new TextEncoder();

async function hmac(key, msg){
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
function same(a, b){
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const sessionToken = env => hmac(env.PASSPHRASE, 'daybook-session-v1');
const cookieOf = req => (req.headers.get('cookie') || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1) || '';
const localDay = (d = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(d);
const localStamp = (d = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, dateStyle: 'short', timeStyle: 'medium' }).format(d).replace(' ', 'T');
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const loginPage = (error = '') => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Daybook</title>
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/icon-180.png"><meta name="theme-color" content="#121212">
<style>
:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#121212;color:#e4e4e2;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
form{width:min(340px,100% - 32px);display:flex;flex-direction:column;gap:12px}
.logo{width:40px;height:40px;border-radius:9px;background:#e4e4e2;color:#121212;display:grid;place-items:center;font-weight:700;font-size:18px}
input{background:#1c1c1c;border:1px solid #383838;border-radius:10px;padding:11px 12px;color:inherit;font:inherit;outline:none}
input:focus{border-color:#6f9bd8}button{background:#e4e4e2;color:#121212;border:0;border-radius:10px;padding:11px;font:inherit;font-weight:600;cursor:pointer}
.err{color:#e0665c;font-size:13px}
</style></head><body><form method="post" action="login">
<div class="logo">D</div><b style="font-size:20px">Daybook</b>
<input type="password" name="passphrase" placeholder="Passphrase" autocomplete="current-password" autofocus required>
${error ? `<div class="err">${error}</div>` : ''}<button>Unlock</button></form></body></html>`,
  { status: error ? 401 : 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-daybook-login': '1' } });

export default {
  async fetch(req, env){
    const url = new URL(req.url), path = url.pathname;

    if (path === '/login' && req.method === 'POST') {
      const pw = String((await req.formData()).get('passphrase') || '');
      if (!env.PASSPHRASE || !same(await hmac('cmp', pw), await hmac('cmp', env.PASSPHRASE))) {
        await new Promise(r => setTimeout(r, 1500));
        return loginPage('Wrong passphrase.');
      }
      return new Response(null, { status: 303, headers: { location: '/',
        'set-cookie': `${COOKIE}=${await sessionToken(env)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` } });
    }
    if (path === '/login') return loginPage();
    if (path === '/logout') return new Response(null, { status: 303, headers: { location: '/', 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });

    // the login page needs its icon before the user is signed in
    if (path.startsWith('/icons/') || path === '/manifest.webmanifest' || path === '/sw.js') return env.ASSETS.fetch(req);

    if (!env.PASSPHRASE || !same(cookieOf(req), await sessionToken(env)))
      return req.method === 'GET' && !path.startsWith('/api/') ? loginPage() : json({ error: 'signed out' }, 401);

    if (path === '/api/state') {
      if (req.method === 'GET') {
        const s = await env.DB.get('state');
        return s ? new Response(s, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }) : new Response(null, { status: 204 });
      }
      if (req.method === 'PUT') {
        const body = await req.text();
        let data; try { data = JSON.parse(body); } catch { return json({ error: 'not JSON' }, 400); }
        if (!Array.isArray(data.subjects)) return json({ error: 'not a Daybook state' }, 400);
        // keep the last version of each day for 35 days, written when a new day starts
        const today = localDay(), day = await env.DB.get('state-day');
        if (day !== today) {
          const prev = await env.DB.get('state');
          if (prev && day) await env.DB.put(`backup:${day}`, prev, { expirationTtl: 35 * 864e2 });
          await env.DB.put('state-day', today);
        }
        await env.DB.put('state', body);
        return json({ ok: true, savedAt: data.savedAt });
      }
    }
    if (path === '/api/backups') {
      const list = await env.DB.list({ prefix: 'backup:' });
      return json(list.keys.map(k => k.name.slice(7)));
    }
    if (path.startsWith('/api/backup/')) {
      const s = await env.DB.get('backup:' + path.slice(12));
      return s ? new Response(s, { headers: { 'content-type': 'application/json', 'content-disposition': `attachment; filename="daybook-${path.slice(12)}.json"` } }) : json({ error: 'none' }, 404);
    }
    if (path === '/api/sync-food' && req.method === 'POST') {
      try { return json({ ok: true, ...(await syncYazio(env)) }); }
      catch (e) { return json({ ok: false, error: String(e.message || e) }, 502); }
    }
    if (path === '/api/push/subscribe' && req.method === 'POST') {
      const sub = await req.json();
      if (!/^https:\/\//.test(sub?.endpoint || '') || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: 'bad subscription' }, 400);
      const subs = JSON.parse(await env.DB.get('push-subs') || '[]').filter(s => s.endpoint !== sub.endpoint);
      subs.push({ endpoint: sub.endpoint, keys: sub.keys });
      await env.DB.put('push-subs', JSON.stringify(subs));
      return json({ ok: true, devices: subs.length });
    }
    if (path === '/api/push/test' && req.method === 'POST') {
      if (!env.VAPID_PRIVATE_JWK) return json({ error: 'VAPID_PRIVATE_JWK secret missing' }, 500);
      return json({ ok: true, devices: await pushAll(env, { title: 'Daybook', body: 'Notifications work on this device.', tag: 'test', url: '#/settings' }) });
    }
    if (path === '/js/food-data.js') {
      const f = await env.DB.get('food');
      return new Response(f ? `var FOOD_DATA = ${f};\n` : '/* no Yazio sync yet */\n',
        { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' } });
    }

    const res = await env.ASSETS.fetch(req);
    if (!/\.(png|ico|webmanifest)$/.test(path)) {
      const r = new Response(res.body, res); r.headers.set('cache-control', 'no-cache'); return r;
    }
    return res;
  },

  async scheduled(event, env, ctx){
    if (env.VAPID_PRIVATE_JWK) ctx.waitUntil(sendDue(env).catch(e => env.DB.put('push-error', `${localStamp()} ${e.message || e}`)));
    if (new Date(event.scheduledTime).getUTCMinutes() === 5)
      ctx.waitUntil(syncYazio(env).catch(async e => env.DB.put('food-error', `${localStamp()} ${e.message || e}`)));
  },
};

// Yazio's (unofficial) API needs the app's OAuth client id/secret: set them as secrets YAZIO_CLIENT_ID, YAZIO_CLIENT_SECRET
const YAZIO = 'https://yzapi.yazio.com/v20';
const UA = 'YAZIO/12.89.0 (com.yazio.android; build:606121218; Android 36) OkHttp3/5.4.0';

async function syncYazio(env){
  const tr = await fetch(`${YAZIO}/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': UA },
    body: JSON.stringify({ grant_type: 'password', username: env.YAZIO_USER, password: env.YAZIO_PASS, client_id: env.YAZIO_CLIENT_ID, client_secret: env.YAZIO_CLIENT_SECRET }) });
  if (!tr.ok) throw new Error(`Yazio login failed (${tr.status}) ${await tr.text()}`);
  const h = { authorization: `Bearer ${(await tr.json()).access_token}`, 'user-agent': UA };
  const get = async p => { const r = await fetch(YAZIO + p, { headers: h }); if (!r.ok) throw new Error(`${p}: ${r.status}`); const t = await r.text(); return t ? JSON.parse(t) : null; };
  const num = (x, dec = 0) => { if (x == null) return 0; if (typeof x !== 'number') throw new Error(`Unexpected value in Yazio data: ${JSON.stringify(x)}`); return +x.toFixed(dec); };

  const prev = JSON.parse(await env.DB.get('food') || '{}'), days = prev.days || {}, weights = prev.weights || {};
  const dayAt = i => localDay(new Date(Date.now() - i * 864e5)), end = dayAt(0), start = dayAt(13);
  for (const n of await get(`/user/consumed-items/nutrients-daily?start=${start}&end=${end}`) || []) {
    Object.assign(days[n.date] ||= {}, { kcal: num(n.energy), protein: num(n.protein, 1), carb: num(n.carb, 1), fat: num(n.fat, 1) });
  }
  let summary;
  for (let i = 0; i < 14; i++) {
    const d = dayAt(i), s = await get(`/user/widgets/daily-summary?date=${d}`);
    Object.assign(days[d] ||= { kcal: 0, protein: 0, carb: 0, fat: 0 }, { steps: s?.steps ?? null });
    if (i === 0) summary = s;
  }
  const g = summary?.goals || {};
  const goals = { kcal: num(g['energy.energy']), protein: num(g['nutrient.protein']), carb: num(g['nutrient.carb']), fat: num(g['nutrient.fat']),
                  steps: num(g['activity.step']), weight: num(g['bodyvalue.weight'], 1) };
  const w = await get(`/user/bodyvalues/weight/last?date=${end}`);
  if (w?.date) weights[w.date.slice(0, 10)] = num(w.value, 1);

  const sort = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a < b ? -1 : 1));
  const data = { updated: localStamp(), goals, weight: w?.date ? { date: w.date, kg: w.value } : prev.weight || null, weights: sort(weights), days: sort(days) };
  await env.DB.put('food', JSON.stringify(data));
  await env.DB.delete('food-error');
  return { days: Object.keys(days).length, todayKcal: days[end]?.kcal ?? 0 };
}

// ---- Web Push (RFC 8291 payload encryption + RFC 8292 VAPID), with WebCrypto only ----
const VAPID_PUBLIC = 'BFmXVMty7vUAK4vSNzCfKvuMPkMXj5A-U_5NInPGCtBYM_YF-90c3N8oXhp1dVOlfhVITVigsLX10x1X1wWQaI0';
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const concat = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let i = 0; for (const p of parts) { out.set(p, i); i += p.length; } return out; };

async function hkdf(salt, ikm, info, bytes){
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, bytes * 8));
}

async function vapidAuth(env, endpoint){
  const part = o => b64u(enc.encode(JSON.stringify(o)));
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:admin@example.com' })}`;
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned));
  return `vapid t=${unsigned}.${b64u(sig)}, k=${VAPID_PUBLIC}`;
}

async function encrypt(sub, text){
  const uaPub = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const own = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const ownPub = new Uint8Array(await crypto.subtle.exportKey('raw', own.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, own.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode('WebPush: info\0'), uaPub, ownPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await crypto.subtle.importKey('raw', await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16), 'AES-GCM', false, ['encrypt']);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cek, concat(enc.encode(text), new Uint8Array([2]))));
  const head = new Uint8Array(21); head.set(salt); new DataView(head.buffer).setUint32(16, 4096); head[20] = 65;
  return concat(head, ownPub, body);
}

async function pushAll(env, msg){
  const subs = JSON.parse(await env.DB.get('push-subs') || '[]'), keep = [];
  for (const s of subs) {
    const r = await fetch(s.endpoint, { method: 'POST', body: await encrypt(s, JSON.stringify(msg)), headers: {
      authorization: await vapidAuth(env, s.endpoint), 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: '3600', urgency: 'high' } }).catch(() => null);
    if (r?.status !== 404 && r?.status !== 410) keep.push(s);   // 404/410: the device unsubscribed
  }
  if (keep.length !== subs.length) await env.DB.put('push-subs', JSON.stringify(keep));
  return keep.length;
}

async function sendDue(env){
  const state = JSON.parse(await env.DB.get('state') || '{}'), t = Date.now();
  const due = (state.pushPlan || []).filter(p => p.at <= t && p.at > t - 15 * 60e3);
  if (!due.length) return;
  const sent = JSON.parse(await env.DB.get('push-sent') || '{}');
  let changed = false;
  for (const p of due) {
    if (sent[p.tag]) continue;
    if (p.check?.prayer && state.prayers?.[p.check.prayer[0]]?.[p.check.prayer[1]]) continue;
    if (p.check?.done && state.done?.[p.check.done]) continue;
    await pushAll(env, { title: p.title, body: p.body, tag: p.tag, url: p.url });
    sent[p.tag] = t; changed = true;
  }
  if (changed) {
    for (const k in sent) if (sent[k] < t - 2 * 864e5) delete sent[k];
    await env.DB.put('push-sent', JSON.stringify(sent));
  }
}
