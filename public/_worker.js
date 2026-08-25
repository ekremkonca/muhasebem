const JSON_HEADERS = { 'content-type': 'application/json; charset=UTF-8' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
 
function findD1(env) {
  const preferred = [env.DB, env.db, env.D1, env.DATABASE, env.MUHASEBEM_DB].filter(Boolean);
  for (const candidate of preferred) {
    if (candidate && typeof candidate.prepare === 'function' && typeof candidate.batch === 'function') return candidate;
  }
  for (const [key, value] of Object.entries(env || {})) {
    if (key === 'ASSETS') continue;
    if (value && typeof value.prepare === 'function' && typeof value.batch === 'function') return value;
  }
  return null;
}
 
function bindingNames(env) {
  return Object.entries(env || {}).map(([key, value]) => ({
    name: key,
    type: value && typeof value.prepare === 'function' && typeof value.batch === 'function' ? 'D1' : key === 'ASSETS' ? 'ASSETS' : typeof value,
  }));
}
 
async function ensureSchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    tour TEXT NOT NULL,
    guest TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_records_date ON records(date DESC)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_records_currency ON records(currency)').run();
}
 
function normalizeRecord(input) {
  if (!input || typeof input !== 'object') throw new Error('Geçersiz kayıt.');
  const r = {
    id: String(input.id || crypto.randomUUID()),
    date: String(input.date || '').slice(0, 10),
    tour: String(input.tour || '').trim(),
    guest: String(input.guest || '').trim(),
    type: String(input.type || '').trim(),
    amount: Number(input.amount),
    currency: String(input.currency || '').trim(),
    status: String(input.status || '').trim(),
    note: String(input.note || '').trim(),
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || r.date < '2026-04-01') throw new Error('Kayıt tarihi 1 Nisan 2026 veya sonrası olmalı.');
  if (!r.tour) throw new Error('Tur adı gerekli.');
  if (!['Tur Geliri','Tur Masrafı','Bahşiş','Komisyon'].includes(r.type)) throw new Error('Geçersiz işlem türü.');
  if (!Number.isFinite(r.amount) || r.amount <= 0) throw new Error('Tutar sıfırdan büyük olmalı.');
  if (!['TRY','USD','EUR','GBP'].includes(r.currency)) throw new Error('Geçersiz para birimi.');
  if (!['Ödendi','Ödenmedi'].includes(r.status)) throw new Error('Geçersiz durum.');
  return r;
}
 
async function handleApi(request, env) {
  const db = findD1(env);
  if (!db) return json({ error: 'Cloudflare D1 binding bu deployment içinde görünmüyor.', bindings: bindingNames(env), hint: 'D1 binding Production ortamına eklenmeli ve ardından yeni deployment oluşmalı.' }, 500);
  const url = new URL(request.url);
  if (url.pathname === '/api/health') {
    try {
      const probe = await db.prepare('SELECT 1 AS ok').first();
      return json({ ok: true, d1: true, probe, bindings: bindingNames(env) });
    } catch (error) {
      return json({ ok: false, d1: true, error: error?.message || 'D1 sorgusu başarısız.', bindings: bindingNames(env) }, 500);
    }
  }
  await ensureSchema(db);
  if (request.method === 'GET') {
    const result = await db.prepare('SELECT id,date,tour,guest,type,amount,currency,status,note FROM records ORDER BY date DESC, created_at DESC').all();
    return json({ records: result.results || [] });
  }
  if (request.method === 'POST') {
    const body = await request.json();
    const incoming = Array.isArray(body?.records) ? body.records : [body?.record ?? body];
    const records = incoming.map(normalizeRecord);
    const statements = records.map(r => db.prepare(`INSERT INTO records (id,date,tour,guest,type,amount,currency,status,note,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET date=excluded.date,tour=excluded.tour,guest=excluded.guest,type=excluded.type,amount=excluded.amount,currency=excluded.currency,status=excluded.status,note=excluded.note,updated_at=CURRENT_TIMESTAMP`)
      .bind(r.id,r.date,r.tour,r.guest,r.type,r.amount,r.currency,r.status,r.note));
    if (statements.length === 1) await statements[0].run();
    else if (statements.length > 1) await db.batch(statements);
    return json({ records }, 201);
  }
  if (request.method === 'PATCH') {
    const body = await request.json();
    if (body?.record) {
      const r = normalizeRecord(body.record);
      const result = await db.prepare(`UPDATE records SET date=?,tour=?,guest=?,type=?,amount=?,currency=?,status=?,note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(r.date,r.tour,r.guest,r.type,r.amount,r.currency,r.status,r.note,r.id).run();
      if (!result.meta?.changes) return json({ error: 'Kayıt bulunamadı.' }, 404);
      return json({ record: r });
    }
    const id = String(body?.id || '');
    const status = String(body?.status || '');
    if (!id) return json({ error: 'Kayıt kimliği gerekli.' }, 400);
    if (!['Ödendi','Ödenmedi'].includes(status)) return json({ error: 'Geçersiz durum.' }, 400);
    const result = await db.prepare('UPDATE records SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(status,id).run();
    if (!result.meta?.changes) return json({ error: 'Kayıt bulunamadı.' }, 404);
    return json({ id, status });
  }
  if (request.method === 'DELETE') {
    const id = String(url.searchParams.get('id') || '');
    if (!id) return json({ error: 'Kayıt kimliği gerekli.' }, 400);
    const result = await db.prepare('DELETE FROM records WHERE id=?').bind(id).run();
    if (!result.meta?.changes) return json({ error: 'Kayıt bulunamadı.' }, 404);
    return json({ id });
  }
  return json({ error: 'Method not allowed' }, 405);
}
 
export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname === '/api/records' || url.pathname === '/api/health') return await handleApi(request, env);
      if (env.ASSETS && typeof env.ASSETS.fetch === 'function') return env.ASSETS.fetch(request);
      return new Response('Static asset binding bulunamadı.', { status: 500 });
    } catch (error) {
      return json({ error: error?.message || 'Sunucu hatası.', stack: error?.stack || null }, 500);
    }
  }
};
