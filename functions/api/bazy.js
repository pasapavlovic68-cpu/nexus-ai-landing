// Пропуск для вкладки «Базы» (/karta/bazy/). Вошедшему (тот же вход и cookie ns_auth, что у карты)
// выдаёт пропуск на 15 минут: «срок.подпись», подпись — HMAC-SHA256 от BAZY_KEY. С ним браузер сам
// ходит на службу bazy на нашем сервере nova; сам секрет в браузер не уходит.
// Почему не посредник, как сначала: Cloudflare не выпускает запрос из функции сайта на адрес того
// же домена (bazy.nexusnova.app) — отдаёт 404 самого сайта.
// GET /api/bazy → { token, exp, base }
import { authed } from './stats.js';

const NOVA = 'https://bazy.nexusnova.app';
const TTL = 15 * 60 * 1000;
const enc = new TextEncoder();
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

async function sign(secret, msg){
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function onRequestGet({ request, env }){
  if(!(await authed(request, env.STATS_PASSWORD))) return json({ error: 'unauthorized' }, 401);
  if(!env.BAZY_KEY) return json({ error: 'not-configured' }, 503);
  const exp = Date.now() + TTL;
  return json({ token: exp + '.' + await sign(env.BAZY_KEY, 'bazy:' + exp), exp, base: NOVA });
}
