import { errorResponse, getDb, json, requireSession } from '../_lib.js';

const allowed = ['TRY','USD','EUR','GBP'];

export async function onRequestGet(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const result = await db.prepare("SELECT key,value,updated_at FROM settings WHERE key LIKE 'rate_%'").all();
    const rates = { TRY: 1, USD: 46.30, EUR: 53.00, GBP: 62.30 };
    let updatedAt = null;
    for (const row of result.results || []) {
      const currency = String(row.key).replace('rate_','');
      if (allowed.includes(currency)) rates[currency] = Number(row.value) || rates[currency];
      if (!updatedAt || row.updated_at > updatedAt) updatedAt = row.updated_at;
    }
    rates.TRY = 1;
    return json({ rates, updatedAt });
  } catch (error) {
    return errorResponse(error, 'Kur ayarları okunamadı.');
  }
}

export async function onRequestPut(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const body = await context.request.json().catch(() => ({}));
    const rates = body?.rates || {};
    for (const currency of ['USD','EUR','GBP']) {
      const value = Number(rates[currency]);
      if (!Number.isFinite(value) || value <= 0) return json({ error: `${currency} kuru sıfırdan büyük olmalı.` }, 400);
      await db.prepare(`INSERT INTO settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`)
        .bind(`rate_${currency}`, String(value)).run();
    }
    await db.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('rate_TRY','1',CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value='1',updated_at=CURRENT_TIMESTAMP`).run();
    return onRequestGet(context);
  } catch (error) {
    return errorResponse(error, 'Kur ayarları kaydedilemedi.');
  }
}
