// Данные для дашборда /stats. Только для вошедших (cookie ns_auth, см. login.js).
// GET /api/stats?days=1|7|30|90&tz=<Date.getTimezoneOffset() в минутах>
// Считаются только живые визиты (sessions.human = 1, см. t.js); отсеянные роботы — kpi.bots.

const enc = new TextEncoder();

async function hmac(secret, msg){
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export async function authed(request, secret){
  if(!secret) return false;
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)ns_auth=(\d+)\.([\w-]+)/);
  if(!m || Number(m[1]) < Date.now()) return false;
  return (await hmac(secret, 'nexus-stats:' + m[1])) === m[2];
}
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type':'application/json', 'cache-control':'no-store' },
});

export async function onRequestGet({ request, env }){
  if(!(await authed(request, env.STATS_PASSWORD))) return json({ error:'unauthorized' }, 401);
  if(!env.DB) return json({ error:'no-db' }, 503);

  const url = new URL(request.url);
  const days = [1, 7, 30, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 7;
  let tz = Number(url.searchParams.get('tz'));
  if(!Number.isFinite(tz) || Math.abs(tz) > 840) tz = 0;

  // период: с локальной полуночи (days-1) дней назад до сейчас; прошлый период — такой же длины перед ним
  const now = Date.now(), DAY = 864e5, off = tz * 60000;
  const from = Math.floor((now - off) / DAY) * DAY - (days - 1) * DAY + off;
  const pFrom = from - days * DAY;
  const localDay = `date(first_ts / 1000 - ${tz * 60}, 'unixepoch')`;   // tz — число, проверено выше

  const db = env.DB;
  const S = (sql, ...b) => db.prepare(sql).bind(...b);
  const kpiSql = `SELECT COUNT(*) AS visits, COALESCE(SUM(lead),0) AS leads,
                         COALESCE(ROUND(AVG(CASE WHEN dur > 0 THEN dur END)),0) AS avgDur
                  FROM sessions WHERE human = 1 AND first_ts >= ? AND first_ts < ?`;
  const cntEv = `SELECT COUNT(*) AS c FROM events WHERE sid IN (SELECT sid FROM sessions WHERE human = 1) AND type = ? AND ts >= ? AND ts < ?`;
  const uniqSec = `SELECT COUNT(DISTINCT sid) AS c FROM events WHERE sid IN (SELECT sid FROM sessions WHERE human = 1) AND type = 'section' AND name = ? AND ts >= ? AND ts < ?`;

  const r = await db.batch([
    /* 0 */ S(kpiSql, from, now + 1),
    /* 1 */ S(kpiSql, pFrom, from),
    /* 2 */ S(cntEv, 'video_play', from, now + 1),
    /* 3 */ S(cntEv, 'video_play', pFrom, from),
    /* 4 */ S(cntEv, 'works_open', from, now + 1),
    /* 5 */ S(cntEv, 'works_open', pFrom, from),
    /* 6 */ S(`SELECT ${localDay} AS d, COUNT(*) AS visits, COALESCE(SUM(lead),0) AS leads
               FROM sessions WHERE human = 1 AND first_ts >= ? GROUP BY d ORDER BY d`, from),
    /* 7 */ S(uniqSec, 'portfolio', from, now + 1),
    /* 8 */ S(uniqSec, 'results', from, now + 1),
    /* 9 */ S(uniqSec, 'pricing', from, now + 1),
    /*10 */ S(`SELECT name, COUNT(*) AS count FROM events WHERE sid IN (SELECT sid FROM sessions WHERE human = 1) AND type = 'click' AND ts >= ? GROUP BY name ORDER BY count DESC LIMIT 20`, from),
    /*11 */ S(`SELECT COALESCE(utm_source, ref, 'Прямой заход') AS name, COUNT(*) AS visits, COALESCE(SUM(lead),0) AS leads
               FROM sessions WHERE human = 1 AND first_ts >= ? GROUP BY name ORDER BY visits DESC LIMIT 15`, from),
    /*12 */ S(`SELECT utm_campaign AS campaign, COALESCE(utm_source,'—') AS source, COUNT(*) AS visits, COALESCE(SUM(lead),0) AS leads
               FROM sessions WHERE human = 1 AND first_ts >= ? AND utm_campaign IS NOT NULL GROUP BY campaign, source ORDER BY visits DESC LIMIT 20`, from),
    /*13 */ S(`SELECT SUM(max_scroll >= 25) AS s25, SUM(max_scroll >= 50) AS s50, SUM(max_scroll >= 75) AS s75, SUM(max_scroll >= 100) AS s100
               FROM sessions WHERE human = 1 AND first_ts >= ?`, from),
    /*14 */ S(`SELECT name, COUNT(DISTINCT sid) AS sessions FROM events WHERE sid IN (SELECT sid FROM sessions WHERE human = 1) AND type = 'section' AND ts >= ? GROUP BY name`, from),
    /*15 */ S(`SELECT name, type, COUNT(*) AS c FROM events WHERE sid IN (SELECT sid FROM sessions WHERE human = 1) AND (type IN ('video_play','video_done','video_fs','demo','demo_use') OR (type = 'click' AND name LIKE 'demo_cta_%')) AND ts >= ? GROUP BY name, type`, from),
    /*16 */ S(`SELECT device AS name, COUNT(*) AS visits FROM sessions WHERE human = 1 AND first_ts >= ? GROUP BY device ORDER BY visits DESC`, from),
    /*17 */ S(`SELECT COALESCE(country,'??') AS name, COUNT(*) AS visits FROM sessions WHERE human = 1 AND first_ts >= ? GROUP BY name ORDER BY visits DESC LIMIT 12`, from),
    /*18 */ S(`SELECT name, COUNT(*) AS count FROM events WHERE sid IN (SELECT sid FROM sessions WHERE human = 1) AND type = 'faq' AND ts >= ? GROUP BY name ORDER BY count DESC`, from),
    /*19 */ S(`SELECT e.ts, e.type, e.name, e.value, s.country, s.device
               FROM events e JOIN sessions s ON s.sid = e.sid AND s.human = 1 ORDER BY e.id DESC LIMIT 40`),
    /*20 */ S(`SELECT COUNT(*) AS c FROM sessions WHERE human = 0 AND first_ts >= ?`, from),   // отсеянные роботы
  ]);
  const rows = i => r[i].results || [];
  const one = i => rows(i)[0] || {};

  const k = one(0), kp = one(1);
  const conv = (l, v) => v ? Math.round(l / v * 1000) / 10 : 0;

  // дни без визитов — нулями, чтобы график был непрерывным
  const byDay = new Map(rows(6).map(x => [x.d, x]));
  const daily = [];
  for(let i = 0; i < days; i++){
    const d = new Date(from - off + i * DAY + DAY / 2).toISOString().slice(0, 10);
    const x = byDay.get(d);
    daily.push({ d, visits: x ? x.visits : 0, leads: x ? x.leads : 0 });
  }

  const vids = {};
  for(const x of rows(15)){
    // клик «Хочу такое» внутри демо приходит как click:demo_cta_<имя> — относим к той же работе
    const key = x.type === 'click' ? String(x.name || '').replace(/^demo_cta_/, '') : x.name;
    const v = vids[key] || (vids[key] = { name: key, plays: 0, done: 0, fs: 0, demo: 0, demoUse: 0, demoCta: 0 });
    if(x.type === 'demo') v.demo = x.c;
    if(x.type === 'demo_use') v.demoUse = x.c;
    if(x.type === 'click') v.demoCta = x.c;
    if(x.type === 'video_play') v.plays = x.c;
    if(x.type === 'video_done') v.done = x.c;
    if(x.type === 'video_fs') v.fs = x.c;
  }
  const sc = one(13);
  const ORDER = ['results','services','portfolio','process','why','pricing','faq','contact'];

  return json({
    range: { days, from, to: now },
    kpi: {
      visits: k.visits || 0, leads: k.leads || 0, conv: conv(k.leads, k.visits), avgDur: k.avgDur || 0,
      videoPlays: one(2).c || 0, worksOpens: one(4).c || 0, bots: one(20).c || 0,
      prev: {
        visits: kp.visits || 0, leads: kp.leads || 0, conv: conv(kp.leads, kp.visits), avgDur: kp.avgDur || 0,
        videoPlays: one(3).c || 0, worksOpens: one(5).c || 0,
      },
    },
    daily,
    // воронка — по порядку блоков на странице (открытие работ и видео — отдельными блоками)
    funnel: [
      { key:'visit',     label:'Зашли на сайт',          count: k.visits || 0 },
      { key:'results',   label:'Прочитали первый блок',  count: one(8).c || 0 },
      { key:'portfolio', label:'Дошли до работ',         count: one(7).c || 0 },
      { key:'pricing',   label:'Дошли до цен',           count: one(9).c || 0 },
      { key:'lead',      label:'Нажали Telegram',        count: k.leads || 0 },
    ],
    clicks: rows(10),
    sources: rows(11),
    campaigns: rows(12),
    scroll: { 25: sc.s25 || 0, 50: sc.s50 || 0, 75: sc.s75 || 0, 100: sc.s100 || 0 },
    sections: rows(14).sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name)),
    videos: Object.values(vids),
    devices: rows(16),
    countries: rows(17),
    faq: rows(18),
    recent: rows(19),
  });
}

export function onRequest(){ return new Response(null, { status: 405 }); }
