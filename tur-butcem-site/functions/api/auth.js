import { clearSessionCookie, createSession, deleteCurrentSession, errorResponse, getDb, hashPin, isAuthenticated, json, makeSalt, sessionCookie } from '../_lib.js';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const clientId = (context) => context.request.headers.get('CF-Connecting-IP') || 'unknown';

async function checkLoginLimit(db, context) {
  const id = clientId(context);
  const row = await db.prepare('SELECT attempts,window_started,blocked_until FROM login_attempts WHERE client_id=?').bind(id).first();
  if (row?.blocked_until && new Date(row.blocked_until).getTime() > Date.now()) {
    throw Object.assign(new Error('Çok fazla başarısız deneme. 15 dakika sonra yeniden deneyin.'), { status: 429 });
  }
  if (!row || Date.now() - new Date(row.window_started).getTime() > WINDOW_MS) {
    await db.prepare(`INSERT INTO login_attempts (client_id,attempts,window_started,blocked_until) VALUES (?,0,CURRENT_TIMESTAMP,NULL)
      ON CONFLICT(client_id) DO UPDATE SET attempts=0,window_started=CURRENT_TIMESTAMP,blocked_until=NULL`).bind(id).run();
  }
  return id;
}

async function recordLoginFailure(db, id) {
  await db.prepare(`UPDATE login_attempts SET attempts=attempts+1,
    blocked_until=CASE WHEN attempts+1>=? THEN datetime('now','+15 minutes') ELSE NULL END WHERE client_id=?`)
    .bind(MAX_ATTEMPTS, id).run();
}

const clearLoginFailures = (db, id) => db.prepare('DELETE FROM login_attempts WHERE client_id=?').bind(id).run();

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
    const inserted = await db.prepare('INSERT OR IGNORE INTO admin_auth (id, salt, pin_hash) VALUES (1, ?, ?)').bind(salt, pinHash).run();
    if (!inserted.meta?.changes) return json({ error: 'PIN daha önce ayarlanmış.' }, 409);
    const token = await createSession(db);
    return json({ ok: true, configured: true, authenticated: true }, 200, { 'set-cookie': sessionCookie(token) });
  }

  if (action === 'login') {
    const id = await checkLoginLimit(db, context);
    const pin = String(body?.pin || '');
    const admin = await db.prepare('SELECT salt, pin_hash FROM admin_auth WHERE id = 1').first();
    if (!admin?.salt) return json({ error: 'Önce ilk kurulum PIN’i oluşturulmalı.' }, 409);
    const pinHash = await hashPin(pin, admin.salt);
    if (pinHash !== admin.pin_hash) {
      await recordLoginFailure(db, id);
      return json({ error: 'PIN yanlış.' }, 401);
    }
    await clearLoginFailures(db, id);
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
