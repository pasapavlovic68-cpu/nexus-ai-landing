// Вход в статистику /stats.
// GET  -> {pin:true|false} — задан ли PIN (какую форму показывать).
// POST {password} — запасной вход по паролю из секрета STATS_PASSWORD;
// POST {pin}      — вход по PIN из 6 цифр; 5 ошибок подряд -> блокировка PIN на 15 минут.
// Успех -> подписанная cookie ns_auth на 30 дней (подпись зависит от STATS_PASSWORD:
// смена пароля разлогинивает всех).

const enc = new TextEncoder();
const DAYS = 30, MAX_FAILS = 5, LOCK_MS = 15 * 60 * 1000;

async function hmac(secret, msg){
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
// сравнение без утечки по времени: сравниваем HMAC обеих строк
async function safeEqual(a, b, secret){
  const [x, y] = await Promise.all([hmac(secret, 'cmp:' + a), hmac(secret, 'cmp:' + b)]);
  return x === y;
}
export async function pinHash(pin, saltHex){
  const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations:100000 }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2,'0')).join('');
}

const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status, headers: Object.assign({ 'content-type':'application/json', 'cache-control':'no-store' }, extra),
});
const getAuth = async (db, k) => (await db.prepare('SELECT v FROM auth WHERE k = ?').bind(k).first('v'));
const setAuth = (db, k, v) => db.prepare('INSERT INTO auth (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, String(v));

async function session(secret, needPin){
  const exp = Date.now() + DAYS * 864e5;
  const token = exp + '.' + await hmac(secret, 'nexus-stats:' + exp);
  return json({ ok:true, needPin }, 200, {
    'set-cookie': `ns_auth=${token}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Strict`,
  });
}

export async function onRequestGet({ env }){
  const pin = env.DB ? !!(await getAuth(env.DB, 'pin_hash')) : false;
  return json({ pin });
}

export async function onRequestPost({ request, env }){
  const secret = env.STATS_PASSWORD, db = env.DB;
  if(!secret || !db) return json({ ok:false, error:'not-configured' }, 503);

  let body = {};
  try{ body = await request.json(); }catch(e){}
  const stored = await getAuth(db, 'pin_hash');

  // --- запасной вход по паролю ---
  if(typeof body.password === 'string'){
    if(body.password && await safeEqual(body.password, secret, secret)){
      await setAuth(db, 'pin_fails', 0).run();          // пароль снимает блокировку PIN
      await setAuth(db, 'pin_lock_until', 0).run();
      return session(secret, !stored);
    }
    await new Promise(r => setTimeout(r, 700));         // тормозим перебор
    return json({ ok:false }, 401);
  }

  // --- вход по PIN ---
  const pin = String(body.pin || '');
  if(!stored || !/^\d{6}$/.test(pin)) return json({ ok:false, left: MAX_FAILS }, 401);

  const now = Date.now();
  const lockUntil = Number(await getAuth(db, 'pin_lock_until')) || 0;
  if(lockUntil > now) return json({ ok:false, retry: Math.ceil((lockUntil - now) / 1000) }, 429);

  const [salt, hash] = stored.split(':');
  if(await safeEqual(await pinHash(pin, salt), hash, secret)){
    await setAuth(db, 'pin_fails', 0).run();
    return session(secret, false);
  }

  const fails = (Number(await getAuth(db, 'pin_fails')) || 0) + 1;
  await new Promise(r => setTimeout(r, 400));
  if(fails >= MAX_FAILS){
    await db.batch([ setAuth(db, 'pin_fails', 0), setAuth(db, 'pin_lock_until', now + LOCK_MS) ]);
    return json({ ok:false, retry: LOCK_MS / 1000 }, 429);
  }
  await setAuth(db, 'pin_fails', fails).run();
  return json({ ok:false, left: MAX_FAILS - fails }, 401);
}

export function onRequest(){ return new Response(null, { status: 405 }); }
