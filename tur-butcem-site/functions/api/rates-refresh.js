import { errorResponse, getDb, json, requireSession } from '../_lib.js';

const CURRENCIES = ['USD', 'EUR', 'GBP'];

export async function onRequestPost(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
      headers: { accept: 'application/xml,text/xml' },
    });
    if (!response.ok) throw new Error(`TCMB yanıtı alınamadı (${response.status}).`);
    const xml = await response.text();
    const rates = { TRY: 1 };
    for (const code of CURRENCIES) {
      const block = xml.match(new RegExp(`<Currency[^>]*CurrencyCode=["']${code}["'][\\s\\S]*?<\\/Currency>`));
      const value = block?.[0]?.match(/<ForexBuying>\s*([0-9.,]+)\s*<\/ForexBuying>/)?.[1];
      const rate = Number(String(value || '').replace(',', '.'));
      if (!Number.isFinite(rate) || rate <= 0) throw new Error(`${code} kuru TCMB yanıtında bulunamadı.`);
      rates[code] = rate;
      await db.prepare(`INSERT INTO settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`)
        .bind(`rate_${code}`, String(rate)).run();
    }
    await db.prepare(`INSERT INTO settings (key,value,updated_at) VALUES ('rate_TRY','1',CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value='1',updated_at=CURRENT_TIMESTAMP`).run();
    const updatedAt = new Date().toISOString();
    return json({ rates, updatedAt, source: 'TCMB', sourceDate: new Date().toISOString().slice(0, 10) });
  } catch (error) {
    return errorResponse(error, 'TCMB kurları güncellenemedi.');
  }
}
