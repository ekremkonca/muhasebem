import { audit, errorResponse, getDb, json, requireSession } from '../_lib.js';

const fields = 'id,title,party,invoice_date,due_date,amount,currency,status,note,repeat_monthly,copy_amount,series_id,created_at,updated_at';
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
  const id = String(input.id || crypto.randomUUID());
  const repeat_monthly = input.repeat_monthly ? 1 : 0;
  const copy_amount = input.copy_amount === false || input.copy_amount === 0 ? 0 : 1;
  return { id, title, party, invoice_date: invoiceDate, due_date: dueDate, amount, currency, status, note: String(input.note || '').trim().slice(0, 500), repeat_monthly, copy_amount, series_id:String(input.series_id || (repeat_monthly ? id : '')).slice(0, 100) };
}

function monthDate(value, months) {
  const [year, month, day] = value.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2,'0')}-${String(Math.min(day, lastDay)).padStart(2,'0')}`;
}

async function materializeMonthlyInvoices(db) {
  const sources = await db.prepare(`SELECT ${fields} FROM invoices WHERE repeat_monthly=1`).all();
  const currentMonth = new Date().toISOString().slice(0, 7);
  for (const source of sources.results || []) {
    const seriesId = source.series_id || source.id;
    let offset = 1;
    while (offset <= 240) {
      const dueDate = monthDate(source.due_date, offset);
      if (dueDate.slice(0, 7) > currentMonth) break;
      const exists = await db.prepare('SELECT id FROM invoices WHERE series_id=? AND due_date=? LIMIT 1').bind(seriesId, dueDate).first();
      if (!exists) {
        const invoiceDate = monthDate(source.invoice_date, offset);
        const generated = { ...source, id:crypto.randomUUID(), invoice_date:invoiceDate, due_date:dueDate, amount:source.copy_amount ? source.amount : 0, status:'Bekliyor', repeat_monthly:0, series_id:seriesId };
        await db.prepare(`INSERT INTO invoices (id,title,party,invoice_date,due_date,amount,currency,status,note,repeat_monthly,copy_amount,series_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(generated.id, generated.title, generated.party, generated.invoice_date, generated.due_date, generated.amount, generated.currency, generated.status, generated.note, 0, generated.copy_amount, generated.series_id).run();
        await audit(db, generated.id, 'invoice_recurring_create', { source_id:source.id, after:generated });
      }
      offset += 1;
    }
  }
}

export async function onRequestGet(context) {
  try {
    const db = await getDb(context); await requireSession(context, db);
    await materializeMonthlyInvoices(db);
    const result = await db.prepare(`SELECT ${fields} FROM invoices ORDER BY due_date ASC, created_at DESC`).all();
    return json({ invoices: result.results || [] });
  } catch (error) { return errorResponse(error, 'Faturalar okunamadı.'); }
}

export async function onRequestPost(context) {
  try {
    const db = await getDb(context); await requireSession(context, db);
    const invoice = clean(await context.request.json());
    await db.prepare(`INSERT INTO invoices (id,title,party,invoice_date,due_date,amount,currency,status,note,repeat_monthly,copy_amount,series_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(invoice.id, invoice.title, invoice.party, invoice.invoice_date, invoice.due_date, invoice.amount, invoice.currency, invoice.status, invoice.note, invoice.repeat_monthly, invoice.copy_amount, invoice.series_id).run();
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
    await db.prepare(`UPDATE invoices SET title=?,party=?,invoice_date=?,due_date=?,amount=?,currency=?,status=?,note=?,repeat_monthly=?,copy_amount=?,series_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(invoice.title, invoice.party, invoice.invoice_date, invoice.due_date, invoice.amount, invoice.currency, invoice.status, invoice.note, invoice.repeat_monthly, invoice.copy_amount, invoice.series_id, invoice.id).run();
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
