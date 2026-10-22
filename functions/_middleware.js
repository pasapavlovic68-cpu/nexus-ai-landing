// Короткие ссылки: nexusnova.app/<slug> -> 302 на страницу лендинга с utm-метками (campaign = slug).
// В базу смотрим только для путей из одного «слова» без точки — статике и API это не мешает.
// /karta (карта системы) — только для вошедших: тот же вход и та же cookie ns_auth, что у /stats.
import { authed } from './api/stats.js';
import { KARTA_LOGIN } from './karta-login.js';

const RESERVED = new Set(['stats','privacy','api','assets','functions','favicon','robots','sitemap','index','404','og-image','wrangler','readme','en','demo','karta']);
const BOT = /bot|crawl|spider|slurp|headless|preview|facebookexternalhit|telegram|whatsapp|vkshare/i;

export async function onRequest(ctx){
  const { request, env } = ctx;
  const url = new URL(request.url);
  if(url.pathname === '/karta' || url.pathname.startsWith('/karta/')){
    const priv = { 'cache-control':'no-store', 'x-robots-tag':'noindex, nofollow' };
    if(!(await authed(request, env.STATS_PASSWORD))){
      if(url.pathname.endsWith('.json')) return new Response('{"error":"unauthorized"}', { status: 401, headers: Object.assign({ 'content-type':'application/json' }, priv) });
      return new Response(KARTA_LOGIN, { status: 401, headers: Object.assign({ 'content-type':'text/html; charset=utf-8' }, priv) });
    }
    const res = await ctx.next();
    const out = new Response(res.body, res);
    for(const [k, v] of Object.entries(priv)) out.headers.set(k, v);
    return out;
  }
  const m = url.pathname.match(/^\/([a-z0-9-]{2,32})\/?$/i);
  if(request.method === 'GET' && m && env.DB && !RESERVED.has(m[1].toLowerCase())){
    const slug = m[1].toLowerCase();
    try{
      const row = await env.DB.prepare('SELECT target, source, medium, content FROM links WHERE slug = ?').bind(slug).first();
      if(row){
        // превью-боты мессенджеров тоже открывают ссылку — их в счётчик не пишем
        if(!BOT.test(request.headers.get('user-agent') || ''))
          ctx.waitUntil(env.DB.prepare('UPDATE links SET hits = hits + 1 WHERE slug = ?').bind(slug).run());
        const [path, hash] = row.target.split('#');
        const dest = new URL(path || '/', url.origin);
        dest.searchParams.set('utm_source', row.source);
        if(row.medium) dest.searchParams.set('utm_medium', row.medium);
        dest.searchParams.set('utm_campaign', slug);
        if(row.content) dest.searchParams.set('utm_content', row.content);
        return new Response(null, { status: 302, headers: { location: dest.toString() + (hash ? '#' + hash : ''), 'cache-control': 'no-store' } });
      }
    }catch(e){}
  }
  return ctx.next();
}
