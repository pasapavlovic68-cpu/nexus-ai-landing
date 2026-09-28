// Приём событий статистики с лендинга -> D1 (привязка DB).
import { authed } from './stats.js';
// Тело: {sid, m?:{ref,us,um,uc,ut,lang}, ts?:'<токен Turnstile>', e:[{t,n,v}]} — sendBeacon/fetch с text/plain.
// Без cookie и персональных данных. Роботов отсекаем в три слоя:
//   1) User-Agent честных роботов; 2) сети дата-центров (Amazon, Google Cloud, Hetzner…);
//   3) визит считается «живым» (human = 1), только если прошёл невидимый Cloudflare Turnstile
//      или человек что-то сделал: листал, кликал, пробыл на странице от 5 секунд.

const TYPES = new Set(['pv','scroll','section','click','works_open','video_play','video_done','video_fs','faq','leave']);
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|telegram|whatsapp|vkshare|pingdom|monitor/i;
// сети хостингов и облаков: живые люди оттуда почти не заходят, сканеры и роботы — почти всегда
const DATACENTER = /amazon|aws|google|microsoft|azure|digitalocean|hetzner|ovh|linode|akamai|oracle|alibaba|tencent|contabo|vultr|choopa|scaleway|leaseweb|m247|datacamp|hostinger|ionos|cloudflare|fastly|zscaler|servers|hosting|colocation|data ?center|vps/i;
const MAX_EVENTS_PER_SESSION = 400;
const YEAR = 365 * 864e5;

const cut = (s, n) => (typeof s === 'string' && s) ? s.slice(0, n) : null;

function device(ua){
  if(/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet';
  if(/Mobi|iPhone|iPod|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}
function browser(ua){
  if(/YaBrowser/i.test(ua)) return 'Yandex';
  if(/Edg\//i.test(ua)) return 'Edge';
  if(/OPR\/|Opera/i.test(ua)) return 'Opera';
  if(/SamsungBrowser/i.test(ua)) return 'Samsung';
  if(/Firefox|FxiOS/i.test(ua)) return 'Firefox';
  if(/Chrome|CriOS/i.test(ua)) return 'Chrome';
  if(/Safari/i.test(ua)) return 'Safari';
  return 'Другой';
}
// действие, которое робот при простой загрузке страницы не делает
function engaged(ev, value){
  if(ev.t === 'scroll') return value >= 25;
  if(ev.t === 'leave') return value >= 5;
  return ev.t === 'click' || ev.t === 'faq' || ev.t === 'works_open' || ev.t === 'video_play' || ev.t === 'video_fs';
}
async function turnstileOk(env, token, ip){
  if(!env.TURNSTILE_SECRET || typeof token !== 'string' || !token || token.length > 2048) return false;
  try{
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', token);
    if(ip) form.append('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method:'POST', body:form });
    const d = await r.json();
    return !!d.success;
  }catch(e){ return false; }
}

export async function onRequestPost({ request, env }){
  const ok = new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  if(!env.DB) return ok;

  // только со своего сайта
  const origin = request.headers.get('origin');
  if(origin){
    let host = '';
    try{ host = new URL(origin).hostname; }catch(e){}
    if(!/(^|\.)nexusnova\.app$|\.pages\.dev$|^localhost$|^127\.0\.0\.1$/.test(host)) return new Response(null, { status: 403 });
  }
  const ua = request.headers.get('user-agent') || '';
  if(!ua || BOT.test(ua)) return ok;
  const net = (request.cf && request.cf.asOrganization) || '';
  if(net && DATACENTER.test(net)) return ok;
  // владелец (вошёл в /stats в этом браузере) — его визиты в статистику не пишем
  if(await authed(request, env.STATS_PASSWORD)) return ok;

  const raw = await request.text();
  if(raw.length > 16000) return ok;
  let body;
  try{ body = JSON.parse(raw); }catch(e){ return ok; }
  const sid = typeof body.sid === 'string' && /^[a-f0-9]{16,32}$/.test(body.sid) ? body.sid : null;
  const list = Array.isArray(body.e) ? body.e.slice(0, 40) : [];
  if(!sid || (!list.length && !body.ts)) return ok;   // подпись Turnstile может прийти отдельным запросом

  const db = env.DB, now = Date.now();

  // защита от флуда одной вкладкой
  const cnt = await db.prepare('SELECT COUNT(*) AS c FROM events WHERE sid = ?').bind(sid).first('c');
  if(cnt > MAX_EVENTS_PER_SESSION) return ok;

  const m = body.m || {};
  const stmts = [
    db.prepare(`INSERT OR IGNORE INTO sessions
      (sid, first_ts, last_ts, ref, utm_source, utm_medium, utm_campaign, utm_content, country, device, browser, lang, net)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      sid, now, now, cut(m.ref, 80), cut(m.us, 60), cut(m.um, 60), cut(m.uc, 80), cut(m.ut, 80),
      cut(request.headers.get('cf-ipcountry'), 2), device(ua), browser(ua), cut(m.lang, 12), cut(net, 80)),
    db.prepare('UPDATE sessions SET last_ts = ? WHERE sid = ?').bind(now, sid),
  ];

  let human = await turnstileOk(env, body.ts, request.headers.get('cf-connecting-ip'));
  for(const ev of list){
    if(!ev || !TYPES.has(ev.t)) continue;
    const name = cut(ev.n, 60);
    let value = Number(ev.v);
    value = Number.isFinite(value) ? Math.max(0, Math.min(value, 86400)) : null;
    if(engaged(ev, value)) human = true;
    stmts.push(db.prepare('INSERT INTO events (ts, sid, type, name, value) VALUES (?,?,?,?,?)').bind(now, sid, ev.t, name, value));
    if(ev.t === 'scroll' && value != null)
      stmts.push(db.prepare('UPDATE sessions SET max_scroll = MAX(max_scroll, ?) WHERE sid = ?').bind(Math.round(value), sid));
    if(ev.t === 'leave' && value != null)
      stmts.push(db.prepare('UPDATE sessions SET dur = MAX(dur, ?) WHERE sid = ?').bind(Math.round(Math.min(value, 3600)), sid));
    // любая размеченная кнопка на лендинге ведёт в Telegram — это и есть «лид»
    if(ev.t === 'click' && name)
      stmts.push(db.prepare('UPDATE sessions SET lead = 1 WHERE sid = ?').bind(sid));
  }
  if(human) stmts.push(db.prepare('UPDATE sessions SET human = 1 WHERE sid = ?').bind(sid));

  // изредка чистим данные старше года (срок хранения указан в политике конфиденциальности)
  if(Math.random() < 0.01){
    stmts.push(db.prepare('DELETE FROM events WHERE ts < ?').bind(now - YEAR));
    stmts.push(db.prepare('DELETE FROM sessions WHERE last_ts < ?').bind(now - YEAR));
  }

  try{ await db.batch(stmts); }catch(e){}
  return ok;
}

export function onRequest(){ return new Response(null, { status: 405 }); }
