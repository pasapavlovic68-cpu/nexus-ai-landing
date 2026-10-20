// Данные для дашборда /stats. Только для вошедших (cookie ns_auth, см. login.js).
// GET /api/stats?days=1|7|30|90&tz=<Date.getTimezoneOffset() в минутах>
// Считаются только живые визиты (sessions.human = 1, см. t.js); отсеянные роботы — kpi.bots.
// Посетитель = постоянный номер браузера sessions.vid (у старых визитов без vid — сам визит): COALESCE(vid, sid).
// Посетители, которых владелец пометил «это я» (таблица hidden_visitors), не входят ни в одну цифру.

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
  // живой визит, не скрытый владельцем; LIVE_SID — то же для таблицы событий
  const LIVE = `human = 1 AND ${PERSON} NOT IN (SELECT vid FROM hidden_visitors)`;
  const LIVE_SID = `sid IN (SELECT sid FROM sessions WHERE ${LIVE})`;
  const kpiSql = `SELECT COUNT(*) AS visits, COUNT(DISTINCT ${PERSON}) AS visitors, COALESCE(SUM(lead),0) AS leads,
                         COALESCE(ROUND(AVG(CASE WHEN dur > 0 THEN dur END)),0) AS avgDur
                  FROM sessions WHERE ${LIVE} AND first_ts >= ? AND first_ts < ?`;
  // вернувшиеся: посетители периода, у которых был живой визит раньше начала периода или ≥2 визитов за период
  // (у старых визитов без vid ключ — сам визит, раньше его быть не может: s2.vid = x.p их просто не находит)
  const backSql = `SELECT COUNT(*) AS c FROM (
                     SELECT ${PERSON} AS p, COUNT(*) AS n FROM sessions WHERE ${LIVE} AND first_ts >= ? AND first_ts < ? GROUP BY p
                   ) x WHERE x.n >= 2 OR EXISTS (SELECT 1 FROM sessions s2 WHERE s2.vid = x.p AND s2.human = 1 AND s2.first_ts < ?)`;
  const cntEv = `SELECT COUNT(*) AS c FROM events WHERE ${LIVE_SID} AND type = ? AND ts >= ? AND ts < ?`;
  const uniqSec = `SELECT COUNT(DISTINCT sid) AS c FROM events WHERE ${LIVE_SID} AND type = 'section' AND name = ? AND ts >= ? AND ts < ?`;
  // лента: последние посетители (вместе с роботами и скрытыми — у них своя пометка)
  const peopleSql = `SELECT ${PERSON} AS p, MAX(last_ts) AS last FROM sessions GROUP BY p ORDER BY last DESC LIMIT ${FEED_PEOPLE}`;
  // их визиты: последние FEED_VISITS + самый первый (откуда человек пришёл впервые); n — сколько визитов всего
  const feedVis = `WITH ppl AS (${peopleSql}),
    v AS (SELECT s.*, ${PERSON} AS p,
            ROW_NUMBER() OVER (PARTITION BY ${PERSON} ORDER BY first_ts DESC) AS rd,
            ROW_NUMBER() OVER (PARTITION BY ${PERSON} ORDER BY first_ts ASC) AS ra,
            COUNT(*) OVER (PARTITION BY ${PERSON}) AS n,
            MAX(lead) OVER (PARTITION BY ${PERSON}) AS plead
          FROM sessions s WHERE s.vid IN (SELECT p FROM ppl) OR s.sid IN (SELECT p FROM ppl))`;

  const r = await db.batch([
    /* 0 */ S(kpiSql, from, now + 1),
    /* 1 */ S(kpiSql, pFrom, from),
    /* 2 */ S(cntEv, 'video_play', from, now + 1),
    /* 3 */ S(cntEv, 'video_play', pFrom, from),
    /* 4 */ S(cntEv, 'works_open', from, now + 1),
    /* 5 */ S(cntEv, 'works_open', pFrom, from),
    /* 6 */ S(`SELECT ${localDay} AS d, COUNT(*) AS visits, COUNT(DISTINCT ${PERSON}) AS visitors, COALESCE(SUM(lead),0) AS leads
               FROM sessions WHERE ${LIVE} AND first_ts >= ? GROUP BY d ORDER BY d`, from),
    /* 7 */ S(uniqSec, 'portfolio', from, now + 1),
    /* 8 */ S(uniqSec, 'results', from, now + 1),
    /* 9 */ S(uniqSec, 'pricing', from, now + 1),
    /*10 */ S(`SELECT name, COUNT(*) AS count FROM events WHERE ${LIVE_SID} AND type = 'click' AND ts >= ? GROUP BY name ORDER BY count DESC LIMIT 20`, from),
    // источники и страны — по людям (один человек из двух источников есть в обоих); визиты — рядом
    /*11 */ S(`SELECT COALESCE(utm_source, ref, 'Прямой заход') AS name, COUNT(DISTINCT ${PERSON}) AS visitors, COUNT(*) AS visits, COALESCE(SUM(lead),0) AS leads
               FROM sessions WHERE ${LIVE} AND first_ts >= ? GROUP BY name ORDER BY visitors DESC, visits DESC LIMIT 15`, from),
    /*12 */ S(`SELECT utm_campaign AS campaign, COALESCE(utm_source,'—') AS source, COUNT(*) AS visits, COALESCE(SUM(lead),0) AS leads
               FROM sessions WHERE ${LIVE} AND first_ts >= ? AND utm_campaign IS NOT NULL GROUP BY campaign, source ORDER BY visits DESC LIMIT 20`, from),
    /*13 */ S(`SELECT SUM(max_scroll >= 25) AS s25, SUM(max_scroll >= 50) AS s50, SUM(max_scroll >= 75) AS s75, SUM(max_scroll >= 100) AS s100
               FROM sessions WHERE ${LIVE} AND first_ts >= ?`, from),
    /*14 */ S(`SELECT name, COUNT(DISTINCT sid) AS sessions FROM events WHERE ${LIVE_SID} AND type = 'section' AND ts >= ? GROUP BY name`, from),
    /*15 */ S(`SELECT name, type, COUNT(*) AS c FROM events WHERE ${LIVE_SID} AND (type IN ('video_play','video_done','video_fs','demo','demo_use') OR (type = 'click' AND name LIKE 'demo_cta_%')) AND ts >= ? GROUP BY name, type`, from),
    /*16 */ S(`SELECT device AS name, COUNT(*) AS visits FROM sessions WHERE ${LIVE} AND first_ts >= ? GROUP BY device ORDER BY visits DESC`, from),
    /*17 */ S(`SELECT COALESCE(country,'??') AS name, COUNT(DISTINCT ${PERSON}) AS visitors, COUNT(*) AS visits FROM sessions WHERE ${LIVE} AND first_ts >= ? GROUP BY name ORDER BY visitors DESC, visits DESC LIMIT 12`, from),
    /*18 */ S(`SELECT name, COUNT(*) AS count FROM events WHERE ${LIVE_SID} AND type = 'faq' AND ts >= ? GROUP BY name ORDER BY count DESC`, from),
    // в ленте и роботы, и скрытые «это я» — с подписью, кто это
    /*19 */ S(`${feedVis} SELECT v.sid, v.p, v.n, v.rd, v.first_ts, v.last_ts, v.country, v.device, v.browser, v.ref, v.utm_source, v.utm_campaign,
                 v.lead, v.plead, v.dur, v.max_scroll, v.human, v.net, v.bot,
                 CASE WHEN h.vid IS NULL THEN NULL ELSE COALESCE(h.label, 'Это я') END AS hidden
               FROM v LEFT JOIN hidden_visitors h ON h.vid = v.p WHERE v.rd <= ${FEED_VISITS} OR v.ra = 1`),
    /*20 */ S(`SELECT COUNT(*) AS c FROM sessions WHERE human = 0 AND first_ts >= ? AND ${PERSON} NOT IN (SELECT vid FROM hidden_visitors)`, from),   // отсеянные роботы
    /*21 */ S(`${feedVis} SELECT sid, ts, type, name, value FROM events
               WHERE sid IN (SELECT sid FROM v WHERE rd <= ${FEED_VISITS} OR ra = 1) ORDER BY id`),
    /*22 */ S(backSql, from, now + 1, from),
    /*23 */ S(backSql, pFrom, from, pFrom),
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
    daily.push({ d, visits: x ? x.visits : 0, visitors: x ? x.visitors : 0, leads: x ? x.leads : 0 });
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
  const ORDER = ['results','services','portfolio','about','process','why','pricing','faq','contact'];

  return json({
    range: { days, from, to: now },
    kpi: {
      visitors: k.visitors || 0, returning: one(22).c || 0,
      visits: k.visits || 0, leads: k.leads || 0, conv: conv(k.leads, k.visits), avgDur: k.avgDur || 0,
      videoPlays: one(2).c || 0, worksOpens: one(4).c || 0, bots: one(20).c || 0,
      prev: {
        visitors: kp.visitors || 0, returning: one(23).c || 0,
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
    people: feedPeople(rows(19), rows(21)),
  });
}

// ключ посетителя: постоянный номер браузера, а у старых визитов без него — номер визита
const PERSON = 'COALESCE(vid, sid)';
// лента по людям: последние посетители, у каждого — его визиты по времени, у визита — действия по порядку
const FEED_PEOPLE = 20, FEED_VISITS = 8, FEED_EVENTS = 80;
const KIND_RANK = { human: 0, unknown: 1, bot: 2 };
function feedPeople(sessions, events){
  const bySid = new Map();
  for(const e of events){
    let list = bySid.get(e.sid);
    if(!list) bySid.set(e.sid, list = []);
    list.push({ ts: e.ts, type: e.type, name: e.name, value: e.value });
  }
  const byP = new Map();
  for(const s of sessions){
    let list = byP.get(s.p);
    if(!list) byP.set(s.p, list = []);
    list.push(s);
  }
  const src = s => ({ ref: s.ref, us: s.utm_source, uc: s.utm_campaign });
  const out = [];
  for(const [p, list] of byP){
    list.sort((a, b) => a.first_ts - b.first_ts);        // по времени: первый визит — сверху
    const visits = list.map(s => {
      const evs = bySid.get(s.sid) || [];
      return {
        k: String(s.sid).slice(0, 12),        // ключ визита в ленте; полный номер визита наружу не отдаём
        first: s.first_ts, last: s.last_ts, country: s.country, device: s.device, browser: s.browser,
        ref: s.ref, us: s.utm_source, uc: s.utm_campaign, lead: s.lead, dur: s.dur, scroll: s.max_scroll,
        who: whoIs(s, evs),
        events: evs.slice(-FEED_EVENTS),
      };
    });
    const firstS = list[0], lastS = list[list.length - 1];
    // кто это в целом: если хоть один визит живой — человек; иначе пояснение «самого понятного» визита
    const best = visits.slice().sort((a, b) => KIND_RANK[a.who.kind] - KIND_RANK[b.who.kind] || b.last - a.last)[0];
    out.push({
      // id — полный ключ посетителя: нужен кнопке «Это я», отдаётся только вошедшему владельцу (весь /api/stats за входом)
      id: p, k: String(p).slice(0, 12),
      n: firstS.n,                           // визитов всего (в списке — первый и последние FEED_VISITS)
      first: firstS.first_ts, last: Math.max(...list.map(s => s.last_ts)),
      firstSrc: src(firstS), lastSrc: src(lastS),
      country: lastS.country, device: lastS.device,
      lead: Number(firstS.plead) === 1 ? 1 : 0,   // нажимал Telegram хоть в одном визите
      hidden: firstS.hidden || null,               // подпись «Это я», если владелец скрыл посетителя из цифр
      who: best.who,
      visits,
    });
  }
  return out.sort((a, b) => b.last - a.last);
}

// кто это был: человек, робот (чей) или не подтверждён — с коротким пояснением для ленты
const NOT_HUMAN = 'В цифры статистики не входит.';
const ORGS = [
  [/meta platforms|facebook/i, 'Робот Meta', 'Facebook, Instagram и Messenger сами открывают ссылку, когда её публикуют или по ней переходят, — проверяют, что страница безопасна.'],
  [/google/i, 'Робот Google', 'Google проверяет сайт для поиска или рекламы.'],
  [/microsoft|azure/i, 'Робот Microsoft', 'Bing, Outlook или Teams проверяют ссылку.'],
  [/yandex/i, 'Робот Яндекса', 'Яндекс проверяет сайт для поиска.'],
  [/apple/i, 'Робот Apple', 'Apple проверяет ссылку (превью в iMessage или поиск Siri).'],
  [/amazon|aws/i, 'Сервер Amazon', 'Программа на облачном сервере Amazon — сканер или сервис проверки сайтов.'],
  [/palo alto|zscaler|fortinet|forcepoint|cisco|checkpoint|check point|proofpoint|barracuda|sophos|kaspersky|norton|mcafee/i, 'Сканер безопасности',
    'Компания по кибербезопасности сама проверяет новые сайты на вирусы и мошенничество — для фильтров в офисах и браузерах.'],
  [/ucloud|alibaba|tencent|huawei|baidu/i, 'Сервер в Китае', 'Облачный сервер китайского хостинга — обычно сканер или сборщик сайтов.'],
  [/web services|hosting|cloud|server|data ?cent|vps|colo/i, 'Сервер в дата-центре', 'Заход с сервера хостинга, а не от домашнего или мобильного интернета, — обычно сканер или бот.'],
];
const UA_BOTS = [
  [/googlebot|google-inspectiontool|adsbot-google/, 'Робот Google', 'Google обходит сайт для поиска или проверки рекламы.'],
  [/bingbot/, 'Робот Bing', 'Поиск Microsoft обходит сайт.'],
  [/yandex/, 'Робот Яндекса', 'Яндекс обходит сайт для поиска.'],
  [/facebookexternalhit|meta-externalagent/, 'Робот Meta', 'Facebook или Instagram делают превью ссылки.'],
  [/telegrambot/, 'Telegram', 'Telegram делает превью ссылки, которую кто-то отправил.'],
  [/whatsapp/, 'WhatsApp', 'WhatsApp делает превью ссылки, которую кто-то отправил.'],
  [/twitterbot|linkedinbot|slackbot|discordbot|vkshare/, 'Превью ссылки', 'Соцсеть или мессенджер делает карточку ссылки.'],
  [/applebot/, 'Робот Apple', 'Apple обходит сайт для поиска Siri и Spotlight.'],
  [/ahrefsbot|semrushbot|petalbot|duckduckbot|baiduspider/, 'Поисковый сканер', 'Сервис SEO или поисковик обходит сайт.'],
  [/gptbot/, 'Робот OpenAI', 'OpenAI обходит сайт.'],
  [/headlesschrome|lighthouse|pingdom/, 'Автоматическая проверка', 'Программа проверяет скорость или доступность сайта.'],
];
function whoIs(s, events){
  const net = String(s.net || '').trim();
  // «пролистал» несколько разделов в одну и ту же секунду — человек так не листает
  const perTs = new Map();
  for(const e of events) if(e.type === 'section') perTs.set(e.ts, (perTs.get(e.ts) || 0) + 1);
  const burst = Math.max(0, ...perTs.values());
  const word = (burst % 10 >= 2 && burst % 10 <= 4 && (burst % 100 < 12 || burst % 100 > 14)) ? 'раздела' : 'разделов';
  const fast = burst >= 4 ? ` Пролистал ${burst} ${word} за одну секунду — так листает программа, а не человек.` : '';
  if(Number(s.human) === 1)
    return { kind:'human', title:'Человек', desc:'Живой посетитель: ' + (net ? 'обычный интернет-провайдер (' + net + ') и ' : '') + 'действия как у человека — листал, нажимал или прошёл проверку Cloudflare.' };
  const bot = String(s.bot || '').toLowerCase();
  if(bot && bot !== 'datacenter'){
    const m = UA_BOTS.find(([re]) => re.test(bot));
    return { kind:'bot', title: m ? m[1] : 'Робот', desc: (m ? m[2] : 'Программа, которая сама представилась роботом (' + bot + ').') + fast + ' ' + NOT_HUMAN };
  }
  const org = ORGS.find(([re]) => re.test(net));
  if(org) return { kind:'bot', title: org[1], desc: org[2] + ' Заход из сети ' + net + ', а не от обычного провайдера.' + fast + ' ' + NOT_HUMAN };
  if(bot === 'datacenter')
    return { kind:'bot', title:'Сервер в дата-центре', desc:'Заход с сервера хостинга' + (net ? ' (' + net + ')' : '') + ', а не от домашнего или мобильного интернета, — обычно сканер или бот.' + fast + ' ' + NOT_HUMAN };
  return { kind:'unknown', title:'Не подтверждён', desc:'Не прошёл проверку Cloudflare и ничего не сделал — не листал и не нажимал. Скорее всего робот или человек сразу закрыл страницу.' + fast + ' ' + NOT_HUMAN };
}

export function onRequest(){ return new Response(null, { status: 405 }); }
