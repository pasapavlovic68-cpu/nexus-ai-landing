export function onRequest(context) {
  const country = (context.request.headers.get('cf-ipcountry') || '').toUpperCase();
  const CIS = new Set(['RU','BY','KZ','KG','UZ','TJ','TM','AM','AZ','MD','GE']);
  // UA намеренно не включена -> EN
  const lang = CIS.has(country) ? 'ru' : 'en';
  return new Response(JSON.stringify({ country, lang }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
