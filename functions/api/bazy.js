// Посредник вкладки «Базы» (/karta/bazy/): пускает только вошедших — тот же вход и cookie ns_auth,
// что у карты, — и идёт на службу bazy на нашем сервере nova с общим секретом BAZY_KEY.
// Секрет в браузер не уходит; сама служба только читает и прячет токены и пароли до отправки.
// GET /api/bazy?p=/v1/overview  (p — путь службы; остальные параметры передаются как есть)
import { authed } from './stats.js';

const NOVA = 'https://bazy.nexusnova.app';
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export async function onRequestGet({ request, env }){
  const url = new URL(request.url);
  const p = url.searchParams.get('p') || '/v1/overview';
  // ping — проверка связи без данных, ей вход не нужен
  if(p !== '/v1/ping' && !(await authed(request, env.STATS_PASSWORD))) return json({ error: 'unauthorized' }, 401);
  if(!/^\/v1\/[A-Za-z0-9_\-./%]*$/.test(p) || p.includes('..')) return json({ error: 'bad-path' }, 400);
  if(!env.BAZY_KEY) return json({ error: 'not-configured' }, 503);
  const qs = new URLSearchParams(url.searchParams); qs.delete('p');
  try{
    const r = await fetch(NOVA + p + (qs.toString() ? '?' + qs : ''), {
      headers: { 'x-bazy-key': env.BAZY_KEY },
      signal: AbortSignal.timeout(15000),
    });
    return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }catch(e){
    return json({ error: 'nova-unreachable' }, 502);
  }
}
