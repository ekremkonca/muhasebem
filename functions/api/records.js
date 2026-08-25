const JSON_HEADERS = { 'content-type': 'application/json; charset=UTF-8' };
 
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
 
async function ensureSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS records (
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
    )
  `).run();
 
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_records_date ON records(date DESC)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_records_currency ON records(currency)').run();
}
 
function normalizeRecord(input) {
  if (!input || typeof input !== 'object') throw new Error('Geçersiz kayıt.');
 
  const record = {
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
 
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date) || record.date < '2026-04-01') throw new Error('Kayıt tarihi 1 Nisan 2026 veya sonrası olmalı.');
  if (!record.tour) throw new Error('Tur adı gerekli.');
  if (!['Tur Geliri', 'Tur Masrafı', 'Bahşiş', 'Komisyon'].includes(record.type)) throw new Error('Geçersiz işlem türü.');
  if (!Number.isFinite(record.amount) || record.amount <= 0) throw new Error('Tutar sıfırdan büyük olmalı.');
  if (!['TRY', 'USD', 'EUR', 'GBP'].includes(record.currency)) throw new Error('Geçersiz para birimi.');
  if (!['Ödendi', 'Ödenmedi'].includes(record.status)) throw new Error('Geçersiz durum.');
 
  return record;
}
 
async function getDb(context) {
  const db = context.env.DB;
  if (!db) {
    throw new Error('D1 bağlantısı bulunamadı. Cloudflare Pages projesinde D1 binding adını DB olarak ayarla.');
  }
  await ensureSchema(db);
  return db;
}
 
export async function onRequestGet(context) {
  try {
    const db = await getDb(context);
    const result = await db.prepare(`
      SELECT id, date, tour, guest, type, amount, currency, status, note
      FROM records
      ORDER BY date DESC, created_at DESC
    `).all();
    return json({ records: result.results || [] });
  } catch (error) {
    return json({ error: error.message || 'Kayıtlar okunamadı.' }, 500);
  }
}
 
export async function onRequestPost(context) {
  try {
    const db = await getDb(context);
    const body = await context.request.json();
    const incoming = Array.isArray(body?.records) ? body.records : [body?.record ?? body];
    const records = incoming.map(normalizeRecord);
 
    const statements = records.map((r) => db.prepare(`
      INSERT INTO records (id, date, tour, guest, type, amount, currency, status, note, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        tour = excluded.tour,
        guest = excluded.guest,
        type = excluded.type,
        amount = excluded.amount,
        currency = excluded.currency,
        status = excluded.status,
        note = excluded.note,
        updated_at = CURRENT_TIMESTAMP
    `).bind(r.id, r.date, r.tour, r.guest, r.type, r.amount, r.currency, r.status, r.note));
 
    if (statements.length) await db.batch(statements);
    return json({ records }, 201);
  } catch (error) {
    return json({ error: error.message || 'Kayıt eklenemedi.' }, 400);
  }
}
 
export async function onRequestPatch(context) {
  try {
    const db = await getDb(context);
    const body = await context.request.json();
    if (body?.record) {
      const r = normalizeRecord(body.record);
      const result = await db.prepare(`UPDATE records SET date=?, tour=?, guest=?, type=?, amount=?, currency=?, status=?, note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(r.date,r.tour,r.guest,r.type,r.amount,r.currency,r.status,r.note,r.id).run();
      if (!result.meta?.changes) return json({ error: 'Kayıt bulunamadı.' }, 404);
      return json({ record: r });
    }
    const id = String(body?.id || '');
    const status = String(body?.status || '');
 
    if (!id) return json({ error: 'Kayıt kimliği gerekli.' }, 400);
    if (!['Ödendi', 'Ödenmedi'].includes(status)) return json({ error: 'Geçersiz durum.' }, 400);
 
    const result = await db.prepare(`
      UPDATE records SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(status, id).run();
 
    if (!result.meta?.changes) return json({ error: 'Kayıt bulunamadı.' }, 404);
    return json({ id, status });
  } catch (error) {
    return json({ error: error.message || 'Kayıt güncellenemedi.' }, 400);
  }
}
 
export async function onRequestDelete(context) {
  try {
    const db = await getDb(context);
    const url = new URL(context.request.url);
    const id = String(url.searchParams.get('id') || '');
    if (!id) return json({ error: 'Kayıt kimliği gerekli.' }, 400);
 
    const result = await db.prepare('DELETE FROM records WHERE id = ?').bind(id).run();
    if (!result.meta?.changes) return json({ error: 'Kayıt bulunamadı.' }, 404);
    return json({ id });
  } catch (error) {
    return json({ error: error.message || 'Kayıt silinemedi.' }, 400);
  }
}
