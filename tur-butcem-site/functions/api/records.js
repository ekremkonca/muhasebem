import { audit, ensureDailyBackup, errorResponse, getDb, json, normalizeRecord, requireSession } from '../_lib.js';

const selectFields = 'id,date,tour,guest,agency,ship,type,amount,currency,status,due_date,paid_amount,tags,source_event_id,note,deleted_at,created_at,updated_at';

export async function onRequestGet(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    await ensureDailyBackup(db);
    const url = new URL(context.request.url);
    const trash = url.searchParams.get('trash') === '1';
    const result = await db.prepare(`SELECT ${selectFields} FROM records WHERE deleted_at IS ${trash ? 'NOT NULL' : 'NULL'} ORDER BY date DESC, created_at DESC`).all();
    return json({ records: result.results || [] });
  } catch (error) {
    return errorResponse(error, 'Kayıtlar okunamadı.');
  }
}

export async function onRequestPost(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const body = await context.request.json();
    const incoming = Array.isArray(body?.records) ? body.records : [body?.record ?? body];
    if (incoming.length > 500) return json({ error: 'Tek istekte en fazla 500 kayıt eklenebilir.' }, 413);
    const records = incoming.map(normalizeRecord);
    const statements = records.map((r) => db.prepare(`
      INSERT INTO records (id,date,tour,guest,agency,ship,type,amount,currency,status,due_date,paid_amount,tags,source_event_id,note,deleted_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        date=excluded.date,tour=excluded.tour,guest=excluded.guest,agency=excluded.agency,ship=excluded.ship,
        type=excluded.type,amount=excluded.amount,currency=excluded.currency,status=excluded.status,due_date=excluded.due_date,
        paid_amount=excluded.paid_amount,tags=excluded.tags,source_event_id=excluded.source_event_id,note=excluded.note,
        deleted_at=NULL,updated_at=CURRENT_TIMESTAMP
    `).bind(r.id,r.date,r.tour,r.guest,r.agency,r.ship,r.type,r.amount,r.currency,r.status,r.due_date,r.paid_amount,r.tags,r.source_event_id,r.note));
    if (statements.length) await db.batch(statements);
    for (const r of records) await audit(db, r.id, 'create', { after: r });
    return json({ records }, 201);
  } catch (error) {
    return errorResponse(error, 'Kayıt eklenemedi.');
  }
}

export async function onRequestPatch(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const body = await context.request.json().catch(() => ({}));

    if (body?.action === 'restore') {
      const id = String(body?.id || '');
      if (!id) return json({ error: 'Kayıt kimliği gerekli.' }, 400);
      const before = await db.prepare(`SELECT ${selectFields} FROM records WHERE id=?`).bind(id).first();
      const result = await db.prepare('UPDATE records SET deleted_at=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
      if (!result.meta?.changes) return json({ error: 'Kayıt bulunamadı.' }, 404);
      await audit(db, id, 'restore', { before });
      const record = await db.prepare(`SELECT ${selectFields} FROM records WHERE id=?`).bind(id).first();
      return json({ record });
    }

    if (body?.record) {
      const r = normalizeRecord(body.record);
      const before = await db.prepare(`SELECT ${selectFields} FROM records WHERE id=?`).bind(r.id).first();
      const result = await db.prepare(`UPDATE records SET date=?,tour=?,guest=?,agency=?,ship=?,type=?,amount=?,currency=?,status=?,due_date=?,paid_amount=?,tags=?,source_event_id=?,note=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL`)
        .bind(r.date,r.tour,r.guest,r.agency,r.ship,r.type,r.amount,r.currency,r.status,r.due_date,r.paid_amount,r.tags,r.source_event_id,r.note,r.id).run();
      if (!result.meta?.changes) return json({ error: 'Kayıt bulunamadı.' }, 404);
      await audit(db, r.id, 'update', { before, after: r });
      return json({ record: r });
    }

    const id = String(body?.id || '');
    const status = String(body?.status || '');
    if (!id) return json({ error: 'Kayıt kimliği gerekli.' }, 400);
    if (!['Ödendi', 'Ödenmedi'].includes(status)) return json({ error: 'Geçersiz durum.' }, 400);
    const before = await db.prepare(`SELECT ${selectFields} FROM records WHERE id=?`).bind(id).first();
    const result = await db.prepare("UPDATE records SET status=?,paid_amount=CASE WHEN ?='Ödendi' THEN amount ELSE 0 END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL").bind(status,status,id).run();
    if (!result.meta?.changes) return json({ error: 'Kayıt bulunamadı.' }, 404);
    await audit(db, id, 'status', { before: before?.status, after: status });
    return json({ id, status });
  } catch (error) {
    return errorResponse(error, 'Kayıt güncellenemedi.');
  }
}

export async function onRequestDelete(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const url = new URL(context.request.url);
    const id = String(url.searchParams.get('id') || '');
    const permanent = url.searchParams.get('permanent') === '1';
    if (!id) return json({ error: 'Kayıt kimliği gerekli.' }, 400);
    const before = await db.prepare(`SELECT ${selectFields} FROM records WHERE id=?`).bind(id).first();
    if (!before) return json({ error: 'Kayıt bulunamadı.' }, 404);

    if (permanent) {
      const result = await db.prepare('DELETE FROM records WHERE id=? AND deleted_at IS NOT NULL').bind(id).run();
      if (!result.meta?.changes) return json({ error: 'Kalıcı silme yalnızca çöp kutusundaki kayıtlar için kullanılabilir.' }, 409);
      await audit(db, id, 'purge', { before });
      return json({ id, permanent: true });
    }

    const result = await db.prepare('UPDATE records SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL').bind(id).run();
    if (!result.meta?.changes) return json({ error: 'Kayıt bulunamadı veya zaten silinmiş.' }, 404);
    await audit(db, id, 'delete', { before });
    return json({ id, deleted: true });
  } catch (error) {
    return errorResponse(error, 'Kayıt silinemedi.');
  }
}
