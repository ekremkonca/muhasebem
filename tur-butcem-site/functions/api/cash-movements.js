import { audit, errorResponse, getDb, json, requireSession } from '../_lib.js';

const fields = 'id,date,kind,amount,currency,rate,try_amount,account,note,created_at,updated_at';
const kinds = new Set(['Döviz Bozum','Kasa Giriş','Kasa Çıkış','Banka Transferi','Harcama','Diğer']);
const currencies = new Set(['TRY','USD','EUR','GBP']);

function cleanMovement(input = {}) {
  const amount = Number(input.amount);
  const currency = String(input.currency || 'TRY').toUpperCase();
  const rate = currency === 'TRY' ? 1 : Number(input.rate);
  const kind = String(input.kind || 'Diğer');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date || ''))) throw Object.assign(new Error('Geçerli tarih gerekli.'),{status:400});
  if (!kinds.has(kind)) throw Object.assign(new Error('Geçersiz hareket türü.'),{status:400});
  if (!currencies.has(currency)) throw Object.assign(new Error('Geçersiz para birimi.'),{status:400});
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) throw Object.assign(new Error('Geçerli tutar gerekli.'),{status:400});
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1e6) throw Object.assign(new Error('Geçerli kur gerekli.'),{status:400});
  return {
    id: String(input.id || crypto.randomUUID()),
    date: String(input.date), kind, amount, currency, rate,
    try_amount: Math.round(amount * rate * 100) / 100,
    account: String(input.account || '').trim().slice(0,60),
    note: String(input.note || '').trim().slice(0,240),
  };
}

export async function onRequestGet(context) {
  try {
    const db=await getDb(context); await requireSession(context,db);
    const result=await db.prepare(`SELECT ${fields} FROM cash_movements ORDER BY date DESC,created_at DESC`).all();
    return json({movements:result.results||[]});
  } catch(error){return errorResponse(error,'Kasa hareketleri okunamadı.');}
}

export async function onRequestPost(context) {
  try {
    const db=await getDb(context); await requireSession(context,db);
    const m=cleanMovement(await context.request.json());
    await db.prepare(`INSERT INTO cash_movements (id,date,kind,amount,currency,rate,try_amount,account,note) VALUES (?,?,?,?,?,?,?,?,?)`).bind(m.id,m.date,m.kind,m.amount,m.currency,m.rate,m.try_amount,m.account,m.note).run();
    await audit(db,m.id,'cash_movement_create',{after:m});
    return json({movement:m},201);
  } catch(error){return errorResponse(error,'Kasa hareketi eklenemedi.');}
}

export async function onRequestPatch(context) {
  try {
    const db=await getDb(context); await requireSession(context,db);
    const m=cleanMovement(await context.request.json());
    const before=await db.prepare(`SELECT ${fields} FROM cash_movements WHERE id=?`).bind(m.id).first();
    if(!before) return json({error:'Kasa hareketi bulunamadı.'},404);
    await db.prepare(`UPDATE cash_movements SET date=?,kind=?,amount=?,currency=?,rate=?,try_amount=?,account=?,note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(m.date,m.kind,m.amount,m.currency,m.rate,m.try_amount,m.account,m.note,m.id).run();
    await audit(db,m.id,'cash_movement_update',{before,after:m});
    return json({movement:m});
  } catch(error){return errorResponse(error,'Kasa hareketi güncellenemedi.');}
}

export async function onRequestDelete(context) {
  try {
    const db=await getDb(context); await requireSession(context,db);
    const id=String(new URL(context.request.url).searchParams.get('id')||'');
    const before=await db.prepare(`SELECT ${fields} FROM cash_movements WHERE id=?`).bind(id).first();
    if(!before) return json({error:'Kasa hareketi bulunamadı.'},404);
    await db.prepare('DELETE FROM cash_movements WHERE id=?').bind(id).run();
    await audit(db,id,'cash_movement_delete',{before});
    return json({id,deleted:true});
  } catch(error){return errorResponse(error,'Kasa hareketi silinemedi.');}
}
