// Установка / смена PIN для входа в статистику (только для уже вошедших).
// POST {pin:"123456"} -> хранится только PBKDF2-хеш с солью, сам PIN нигде не сохраняется.
import { authed } from './stats.js';
import { pinHash } from './login.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type':'application/json', 'cache-control':'no-store' },
});

export async function onRequestPost({ request, env }){
  if(!(await authed(request, env.STATS_PASSWORD))) return json({ ok:false }, 401);
  if(!env.DB) return json({ ok:false }, 503);

  let pin = '';
  try{ pin = String((await request.json()).pin || ''); }catch(e){}
  if(!/^\d{6}$/.test(pin)) return json({ ok:false, error:'pin-format' }, 400);

  const salt = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2,'0')).join('');
  const hash = await pinHash(pin, salt);
  const up = (k, v) => env.DB.prepare('INSERT INTO auth (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, v);
  await env.DB.batch([ up('pin_hash', salt + ':' + hash), up('pin_fails', '0'), up('pin_lock_until', '0') ]);
  return json({ ok:true });
}

export function onRequest(){ return new Response(null, { status: 405 }); }
