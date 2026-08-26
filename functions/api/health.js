import { errorResponse, getDb, json } from '../_lib.js';

export async function onRequestGet(context) {
  try {
    const db = await getDb(context);
    const probe = await db.prepare('SELECT 1 AS ok').first();
    return json({ ok: true, api: 'pages-functions-v7', d1: true, probe, time: new Date().toISOString() });
  } catch (error) {
    return errorResponse(error, 'API sağlık kontrolü başarısız.');
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } });
}
