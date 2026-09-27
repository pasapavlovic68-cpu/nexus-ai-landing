// Выход из статистики: стираем cookie
export function onRequestPost(){
  return new Response(JSON.stringify({ ok:true }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'set-cookie': 'ns_auth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict',
    },
  });
}

export function onRequest(){ return new Response(null, { status: 405 }); }
