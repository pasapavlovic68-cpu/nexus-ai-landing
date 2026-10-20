// «Это я — не считать»: владелец исключает посетителя из статистики (только для вошедших, cookie ns_auth).
// POST   {id, label?} -> посетитель в hidden_visitors: его прошлые визиты уходят из цифр /stats, новые t.js не пишет.
// DELETE {id}         -> вернуть посетителя в статистику (прошлые визиты снова считаются).
// id — ключ посетителя из /api/stats (people[].id): постоянный номер браузера vid,
// у старых визитов без vid — номер визита. Подпись видна только в /stats.
import { authed } from './stats.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type':'application/json', 'cache-control':'no-store' },
});
async function readId(request){
  let body = {};
  try{ body = await request.json(); }catch(e){}
  const id = typeof body.id === 'string' && /^[a-f0-9]{16,32}$/.test(body.id) ? body.id : null;
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 40) : 'Это я';
  return { id, label };
}

export async function onRequestPost({ request, env }){
  if(!(await authed(request, env.STATS_PASSWORD))) return json({ ok:false }, 401);
  if(!env.DB) return json({ ok:false }, 503);
  const { id, label } = await readId(request);
  if(!id) return json({ ok:false, error:'id' }, 400);
  await env.DB.prepare(`INSERT INTO hidden_visitors (vid, label, created) VALUES (?, ?, ?)
    ON CONFLICT(vid) DO UPDATE SET label = excluded.label`).bind(id, label, Date.now()).run();
  return json({ ok:true });
}

export async function onRequestDelete({ request, env }){
  if(!(await authed(request, env.STATS_PASSWORD))) return json({ ok:false }, 401);
  if(!env.DB) return json({ ok:false }, 503);
  const { id } = await readId(request);
  if(!id) return json({ ok:false, error:'id' }, 400);
  await env.DB.prepare('DELETE FROM hidden_visitors WHERE vid = ?').bind(id).run();
  return json({ ok:true });
}

export function onRequest(){ return new Response(null, { status: 405 }); }
