import { audit, errorResponse, getDb, json, requireSession } from '../_lib.js';

const fields = 'id,title,party,invoice_date,due_date,amount,currency,status,note,created_at,updated_at';
const currencies = new Set(['TRY','USD','EUR','GBP']);
const statuses = new Set(['Bekliyor','Ödendi','Gecikti']);

function clean(input = {}) {
  const title = String(input.title || '').trim().slice(0, 160);
  const party = String(input.party || '').trim().slice(0, 120);
  const invoiceDate = String(input.invoice_date || '').slice(0, 10);
  const dueDate = String(input.due_date || '').slice(0, 10);
  const amount = Number(input.amount);
  const currency = String(input.currency || 'TRY').toUpperCase();
  const status = String(input.status || 'Bekliyor');
  if (!title) throw Object.assign(new Error('Fatura adı gerekli.'), { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw Object.assign(new Error('Geçerli tarihler gerekli.'), { status: 400 });
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) throw Object.assign(new Error('Geçerli tutar gerekli.'), { status: 400 });
  if (!currencies.has(currency) || !statuses.has(status)) throw Object.assign(new Error('Geçersiz fatura bilgisi.'), { status: 400 });
  return { id: String(input.id || crypto.randomUUID()), title, party, invoice_date: invoiceDate, due_date: dueDate, amount, currency, status, note: String(input.note || '').trim().slice(0, 500) };
}

export async function onRequestGet(context) {
  try {
    const db = await getDb(context); await requireSession(context, db);
    const result = await db.prepare(`SELECT ${fields} FROM invoices ORDER BY due_date ASC, created_at DESC`).all();
    return json({ invoices: result.results || [] });
  } catch (error) { return errorResponse(error, 'Faturalar okunamadı.'); }
}

export async function onRequestPost(context) {
  try {
    const db = await getDb(context); await requireSession(context, db);
    const invoice = clean(await context.request.json());
    await db.prepare(`INSERT INTO invoices (${fields.split(',').slice(0,9).join(',')},note) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind(invoice.id, invoice.title, invoice.party, invoice.invoice_date, invoice.due_date, invoice.amount, invoice.currency, invoice.status, invoice.note).run();
    await audit(db, invoice.id, 'invoice_create', { after: invoice });
    return json({ invoice }, 201);
  } catch (error) { return errorResponse(error, 'Fatura eklenemedi.'); }
}

export async function onRequestPatch(context) {
  try {
    const db = await getDb(context); await requireSession(context, db);
    const invoice = clean(await context.request.json());
    const before = await db.prepare(`SELECT ${fields} FROM invoices WHERE id=?`).bind(invoice.id).first();
    if (!before) return json({ error: 'Fatura bulunamadı.' }, 404);
    await db.prepare(`UPDATE invoices SET title=?,party=?,invoice_date=?,due_date=?,amount=?,currency=?,status=?,note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(invoice.title, invoice.party, invoice.invoice_date, invoice.due_date, invoice.amount, invoice.currency, invoice.status, invoice.note, invoice.id).run();
    await audit(db, invoice.id, 'invoice_update', { before, after: invoice });
    return json({ invoice });
  } catch (error) { return errorResponse(error, 'Fatura güncellenemedi.'); }
}

export async function onRequestDelete(context) {
  try {
    const db = await getDb(context); await requireSession(context, db);
    const id = String(new URL(context.request.url).searchParams.get('id') || '');
    const before = await db.prepare(`SELECT ${fields} FROM invoices WHERE id=?`).bind(id).first();
    if (!before) return json({ error: 'Fatura bulunamadı.' }, 404);
    await db.prepare('DELETE FROM invoices WHERE id=?').bind(id).run();
    await audit(db, id, 'invoice_delete', { before });
    return json({ id, deleted: true });
  } catch (error) { return errorResponse(error, 'Fatura silinemedi.'); }
}
