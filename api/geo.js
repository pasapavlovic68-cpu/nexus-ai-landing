export const config = { runtime: 'edge' };

const CIS = new Set(['RU','BY','KZ','KG','UZ','TJ','TM','AM','AZ','MD','GE']);
// UA намеренно не включена -> EN. Можно добавить при желании.

export default function handler(request) {
  const country = (request.headers.get('x-vercel-ip-country') || '').toUpperCase();
  const lang = CIS.has(country) ? 'ru' : 'en';
  return new Response(JSON.stringify({ country, lang }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
