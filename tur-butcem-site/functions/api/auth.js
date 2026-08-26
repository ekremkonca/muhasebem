import { clearSessionCookie, createSession, deleteCurrentSession, errorResponse, getDb, hashPin, isAuthenticated, json, makeSalt, sessionCookie } from '../_lib.js';

async function handleGet(context) {
  const db = await getDb(context);
  const admin = await db.prepare('SELECT id FROM admin_auth WHERE id = 1').first();
  const authenticated = admin?.id ? await isAuthenticated(context, db) : false;
  return json({ configured: Boolean(admin?.id), authenticated });
}

async function handlePost(context) {
  const db = await getDb(context);
  const body = await context.request.json().catch(() => ({}));
  const action = String(body?.action || 'login');

  if (action === 'setup') {
    const existing = await db.prepare('SELECT id FROM admin_auth WHERE id = 1').first();
    if (existing?.id) return json({ error: 'PIN daha önce ayarlanmış.' }, 409);
    const pin = String(body?.pin || '');
    if (!/^\d{4,8}$/.test(pin)) return json({ error: 'PIN 4-8 rakam olmalı.' }, 400);
    const salt = makeSalt();
    const pinHash = await hashPin(pin, salt);
    await db.prepare('INSERT INTO admin_auth (id, salt, pin_hash) VALUES (1, ?, ?)').bind(salt, pinHash).run();
    const token = await createSession(db);
    return json({ ok: true, configured: true, authenticated: true }, 200, { 'set-cookie': sessionCookie(token) });
  }

  if (action === 'login') {
    const pin = String(body?.pin || '');
    const admin = await db.prepare('SELECT salt, pin_hash FROM admin_auth WHERE id = 1').first();
    if (!admin?.salt) return json({ error: 'Önce ilk kurulum PIN’i oluşturulmalı.' }, 409);
    const pinHash = await hashPin(pin, admin.salt);
    if (pinHash !== admin.pin_hash) return json({ error: 'PIN yanlış.' }, 401);
    const token = await createSession(db);
    return json({ ok: true, authenticated: true }, 200, { 'set-cookie': sessionCookie(token) });
  }

  if (action === 'logout') {
    await deleteCurrentSession(context, db);
    return json({ ok: true, authenticated: false }, 200, { 'set-cookie': clearSessionCookie() });
  }

  return json({ error: 'Geçersiz kimlik doğrulama işlemi.' }, 400);
}

export async function onRequest(context) {
  try {
    const method = context.request.method.toUpperCase();
    if (method === 'GET') return await handleGet(context);
    if (method === 'POST') return await handlePost(context);
    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: 'GET, POST, OPTIONS' } });
    return json({ error: `HTTP ${method} desteklenmiyor.` }, 405, { Allow: 'GET, POST, OPTIONS' });
  } catch (error) {
    return errorResponse(error, 'Kimlik doğrulama işlemi başarısız.');
  }
}
