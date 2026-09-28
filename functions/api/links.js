// Короткие ссылки для дашборда: список, создание, удаление (только для вошедших).
// Переадресацию nexusnova.app/<slug> делает functions/_middleware.js.
import { authed } from './stats.js';

const RESERVED = new Set(['stats','privacy','api','assets','functions','favicon','robots','sitemap','index','404','og-image','wrangler','readme','en']);
const TARGETS = new Set(['/', '/#portfolio', '/#pricing', '/#funnels', '/#services', '/#faq',
  '/en/', '/en/#portfolio', '/en/#pricing', '/en/#funnels', '/en/#services', '/en/#faq']);
const ORIGIN = 'https://nexusnova.app';
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type':'application/json', 'cache-control':'no-store' } });
const tag = v => (typeof v === 'string' && /^[a-z0-9_-]{1,40}$/i.test(v.trim())) ? v.trim().toLowerCase() : null;
const out = r => ({ slug:r.slug, url:`${ORIGIN}/${r.slug}`, target:r.target, source:r.source, medium:r.medium, campaign:r.slug, content:r.content, hits:r.hits, created:r.created });

export async function onRequestGet({ request, env }){
  if(!(await authed(request, env.STATS_PASSWORD))) return json({ error:'unauthorized' }, 401);
  const r = await env.DB.prepare('SELECT * FROM links ORDER BY created DESC').all();
  return json({ links: (r.results || []).map(out) });
}

export async function onRequestPost({ request, env }){
  if(!(await authed(request, env.STATS_PASSWORD))) return json({ ok:false }, 401);
  let b = {}; try{ b = await request.json(); }catch(e){}
  const slug = typeof b.slug === 'string' ? b.slug.trim().toLowerCase().replace(/\/+$/, '') : '';
  if(!/^[a-z0-9-]{2,32}$/.test(slug)) return json({ ok:false, error:'slug' }, 400);
  if(RESERVED.has(slug)) return json({ ok:false, error:'reserved' }, 400);
  if(!TARGETS.has(b.target)) return json({ ok:false, error:'target' }, 400);
  const source = tag(b.source); if(!source) return json({ ok:false, error:'source' }, 400);
  const row = { slug, target:b.target, source, medium:tag(b.medium), content:tag(b.content), hits:0, created:Date.now() };
  try{
    await env.DB.prepare('INSERT INTO links (slug, target, source, medium, content, hits, created) VALUES (?,?,?,?,?,?,?)')
      .bind(row.slug, row.target, row.source, row.medium, row.content, 0, row.created).run();
  }catch(e){ return json({ ok:false, error:'taken' }, 400); }
  return json({ ok:true, link: out(row) });
}

export async function onRequestDelete({ request, env }){
  if(!(await authed(request, env.STATS_PASSWORD))) return json({ ok:false }, 401);
  const slug = new URL(request.url).searchParams.get('slug') || '';
  await env.DB.prepare('DELETE FROM links WHERE slug = ?').bind(slug.toLowerCase()).run();
  return json({ ok:true });
}

export function onRequest(){ return new Response(null, { status: 405 }); }
