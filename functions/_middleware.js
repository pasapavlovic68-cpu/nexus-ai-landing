// Короткие ссылки: nexusnova.app/<slug> -> 302 на страницу лендинга с utm-метками (campaign = slug).
// В базу смотрим только для путей из одного «слова» без точки — статике и API это не мешает.
const RESERVED = new Set(['stats','privacy','api','assets','functions','favicon','robots','sitemap','index','404','og-image','wrangler','readme','en']);
const BOT = /bot|crawl|spider|slurp|headless|preview|facebookexternalhit|telegram|whatsapp|vkshare/i;

export async function onRequest(ctx){
  const { request, env } = ctx;
  const url = new URL(request.url);
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
