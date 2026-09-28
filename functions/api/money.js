// Деньги в дашборде /stats: продажи и расходы на рекламу (вносятся вручную) + окупаемость кампаний.
// GET    /api/money?days=1|7|30|90&tz=<getTimezoneOffset>  — сводка за период
// POST   /api/money {kind:'sale'|'spend', date, amount, product?, campaign?, source?, note?}
// DELETE /api/money?kind=sale|spend&id=N
// Только для вошедших (cookie ns_auth). Суммы — в долларах.
import { authed } from './stats.js';

const PRODUCTS = ['Chrome-расширение','Telegram-бот / Mini App','Сайт / лендинг','Дашборд / аналитика',
  'Интеграция / автоматизация','CRM','Поддержка','Другое'];
const DAY = 864e5;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type':'application/json', 'cache-control':'no-store' },
});
const cut = (s, n) => (typeof s === 'string' && s.trim()) ? s.trim().slice(0, n) : null;
const round2 = x => Math.round(x * 100) / 100;
const pct = (a, b) => b > 0 ? Math.round(a / b * 1000) / 10 : null;
const iso = ms => new Date(ms).toISOString().slice(0, 10);

function range(url){
  const days = [1, 7, 30, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30;
  let tz = Number(url.searchParams.get('tz'));
  if(!Number.isFinite(tz) || Math.abs(tz) > 840) tz = 0;
  const off = tz * 60000, now = Date.now();
  const from = Math.floor((now - off) / DAY) * DAY - (days - 1) * DAY + off;   // локальная полночь, мс UTC
  return {
    days, from,
    fromDate: iso(from - off), toDate: iso(now - off),
    pFromDate: iso(from - off - days * DAY), pToDate: iso(from - off - DAY),
  };
}

export async function onRequestGet({ request, env }){
  if(!(await authed(request, env.STATS_PASSWORD))) return json({ error:'unauthorized' }, 401);
  if(!env.DB) return json({ error:'no-db' }, 503);
  const db = env.DB, r = range(new URL(request.url));
  const S = (sql, ...b) => db.prepare(sql).bind(...b);

  const res = await db.batch([
    /* 0 */ S(`SELECT COALESCE(SUM(amount),0) AS s, COUNT(*) AS n FROM sales WHERE date BETWEEN ? AND ?`, r.fromDate, r.toDate),
    /* 1 */ S(`SELECT COALESCE(SUM(amount),0) AS s FROM spend WHERE date BETWEEN ? AND ?`, r.fromDate, r.toDate),
    /* 2 */ S(`SELECT COALESCE(SUM(amount),0) AS s, COUNT(*) AS n FROM sales WHERE date BETWEEN ? AND ?`, r.pFromDate, r.pToDate),
    /* 3 */ S(`SELECT COALESCE(SUM(amount),0) AS s FROM spend WHERE date BETWEEN ? AND ?`, r.pFromDate, r.pToDate),
    /* 4 */ S(`SELECT COALESCE(utm_campaign,'—') AS campaign, MAX(utm_source) AS source, COUNT(*) AS visits, COALESCE(SUM(lead),0) AS leads
               FROM sessions WHERE human = 1 AND first_ts >= ? GROUP BY campaign`, r.from),
    /* 5 */ S(`SELECT COALESCE(campaign,'—') AS campaign, MAX(source) AS source, COUNT(*) AS sales, SUM(amount) AS revenue
               FROM sales WHERE date BETWEEN ? AND ? GROUP BY campaign`, r.fromDate, r.toDate),
    /* 6 */ S(`SELECT campaign, MAX(source) AS source, SUM(amount) AS spend FROM spend WHERE date BETWEEN ? AND ? GROUP BY campaign`, r.fromDate, r.toDate),
    /* 7 */ S(`SELECT product, COUNT(*) AS sales, SUM(amount) AS revenue FROM sales WHERE date BETWEEN ? AND ? GROUP BY product ORDER BY revenue DESC`, r.fromDate, r.toDate),
    /* 8 */ S(`SELECT id, 'sale' AS kind, date, amount, product, campaign, source, note, created FROM sales WHERE date BETWEEN ? AND ?
            UNION ALL
            SELECT id, 'spend' AS kind, date, amount, NULL, campaign, source, note, created FROM spend WHERE date BETWEEN ? AND ?
            ORDER BY date DESC, created DESC LIMIT 200`, r.fromDate, r.toDate, r.fromDate, r.toDate),
    /* 9 */ S(`SELECT utm_campaign AS campaign, MAX(utm_source) AS source FROM sessions WHERE utm_campaign IS NOT NULL GROUP BY utm_campaign
            UNION SELECT campaign, MAX(source) FROM sales WHERE campaign IS NOT NULL GROUP BY campaign
            UNION SELECT campaign, MAX(source) FROM spend GROUP BY campaign`),
  ]);
  const rows = i => res[i].results || [];
  const one = i => rows(i)[0] || {};

  // сводим визиты/клики, продажи и расходы в одну строку на кампанию
  const map = new Map();
  const row = c => map.get(c) || map.set(c, { campaign:c, source:null, visits:0, leads:0, sales:0, revenue:0, spend:0 }).get(c);
  for(const x of rows(4)){ const o = row(x.campaign); o.visits = x.visits; o.leads = x.leads; o.source = o.source || x.source; }
  for(const x of rows(5)){ const o = row(x.campaign); o.sales = x.sales; o.revenue = round2(x.revenue); o.source = o.source || x.source; }
  for(const x of rows(6)){ const o = row(x.campaign); o.spend = round2(x.spend); o.source = o.source || x.source; }
  const byCampaign = [...map.values()].map(o => Object.assign(o, {
    profit: round2(o.revenue - o.spend),
    romi: o.spend > 0 ? Math.round((o.revenue - o.spend) / o.spend * 1000) / 10 : null,
  })).sort((a, b) => (b.spend + b.revenue) - (a.spend + a.revenue) || b.visits - a.visits);

  // эффективность рекламы считаем только по кампаниям, на которые были расходы
  const paid = byCampaign.filter(o => o.spend > 0);
  const spend = round2(one(1).s), revenue = round2(one(0).s), sales = one(0).n || 0;
  const paidLeads = paid.reduce((a, o) => a + o.leads, 0);
  const paidSales = paid.reduce((a, o) => a + o.sales, 0);
  const paidRevenue = paid.reduce((a, o) => a + o.revenue, 0);

  const seen = new Set(), campaigns = [];
  for(const x of rows(9)) if(x.campaign && !seen.has(x.campaign)){ seen.add(x.campaign); campaigns.push({ campaign:x.campaign, source:x.source || null }); }

  return json({
    range: { days: r.days, from: r.fromDate, to: r.toDate },
    totals: {
      revenue, spend, profit: round2(revenue - spend),
      romi: spend > 0 ? Math.round((paidRevenue - spend) / spend * 1000) / 10 : null,
      sales, avgCheck: sales ? round2(revenue / sales) : 0,
      leads: paidLeads,
      cpl: spend > 0 && paidLeads > 0 ? round2(spend / paidLeads) : null,
      cps: spend > 0 && paidSales > 0 ? round2(spend / paidSales) : null,
      convLeadToSale: pct(paidSales, paidLeads),
    },
    prev: { revenue: round2(one(2).s), spend: round2(one(3).s), profit: round2(one(2).s - one(3).s), sales: one(2).n || 0 },
    byCampaign,
    byProduct: rows(7).map(x => ({ product:x.product, sales:x.sales, revenue:round2(x.revenue) })),
    items: rows(8).map(({ created, ...x }) => x),
    campaigns: campaigns.sort((a, b) => a.campaign.localeCompare(b.campaign)),
    products: PRODUCTS,
  });
}

export async function onRequestPost({ request, env }){
  if(!(await authed(request, env.STATS_PASSWORD))) return json({ ok:false }, 401);
  if(!env.DB) return json({ ok:false }, 503);
  let b = {};
  try{ b = await request.json(); }catch(e){}

  const kind = b.kind;
  if(kind !== 'sale' && kind !== 'spend') return json({ ok:false, error:'kind' }, 400);
  const date = typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date) && !isNaN(Date.parse(b.date)) ? b.date : null;
  if(!date) return json({ ok:false, error:'date' }, 400);
  const amount = Number(b.amount);
  if(!Number.isFinite(amount) || amount <= 0 || amount > 1e6) return json({ ok:false, error:'amount' }, 400);
  const campaign = cut(b.campaign, 80), source = cut(b.source, 60), note = cut(b.note, 200), now = Date.now();

  if(kind === 'sale'){
    const product = cut(b.product, 60);
    if(!product) return json({ ok:false, error:'product' }, 400);
    const r = await env.DB.prepare('INSERT INTO sales (date, amount, product, campaign, source, note, created) VALUES (?,?,?,?,?,?,?)')
      .bind(date, round2(amount), product, campaign, source, note, now).run();
    return json({ ok:true, id: r.meta.last_row_id });
  }
  if(!campaign) return json({ ok:false, error:'campaign' }, 400);
  const r = await env.DB.prepare('INSERT INTO spend (date, amount, campaign, source, note, created) VALUES (?,?,?,?,?,?)')
    .bind(date, round2(amount), campaign, source, note, now).run();
  return json({ ok:true, id: r.meta.last_row_id });
}

export async function onRequestDelete({ request, env }){
  if(!(await authed(request, env.STATS_PASSWORD))) return json({ ok:false }, 401);
  if(!env.DB) return json({ ok:false }, 503);
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind'), id = Number(url.searchParams.get('id'));
  if(!['sale','spend'].includes(kind) || !Number.isInteger(id) || id < 1) return json({ ok:false }, 400);
  await env.DB.prepare(`DELETE FROM ${kind === 'sale' ? 'sales' : 'spend'} WHERE id = ?`).bind(id).run();
  return json({ ok:true });
}

export function onRequest(){ return new Response(null, { status: 405 }); }
