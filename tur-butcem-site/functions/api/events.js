import {
  audit,
  errorResponse,
  getDb,
  json,
  normalizeCalendarEvent,
  normalizeRecord,
  requireSession,
} from "../_lib.js";

const eventFields = [
  "id",
  "date",
  "time",
  "company",
  "title",
  "note",
  "status",
  "category",
  "amount",
  "currency",
  "recurrence",
  "linked_record_id",
];

const recordFields = ["id","date","tour","guest","agency","ship","type","amount","currency","status","due_date","paid_amount","tags","source_event_id","note"];
const eventType = category => category === "Gider" ? "Tur Masrafı" : category === "Tahsilat" ? "Komisyon" : "Tur Geliri";
const recordFromEvent = (event, recordId) => normalizeRecord({
  id: recordId,
  date: event.date,
  due_date: event.date,
  tour: event.title,
  guest: "",
  agency: event.company,
  ship: "",
  type: eventType(event.category),
  amount: Number(event.amount || 0),
  currency: event.currency || "TRY",
  status: "Ödenmedi",
  paid_amount: 0,
  tags: `Takvim, ${event.category}`,
  source_event_id: event.id,
  note: event.note || "Takvimden oluşturuldu",
});

export async function onRequestGet(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    await db.prepare(`
      UPDATE calendar_events
      SET title=COALESCE(NULLIF((
        SELECT CASE WHEN records.tour<>'Muhasebe kaydı' THEN records.tour ELSE records.agency END
        FROM records WHERE records.id=calendar_events.linked_record_id
      ),''),'Tur planı'), updated_at=CURRENT_TIMESTAMP
      WHERE title='Muhasebe kaydı' AND linked_record_id<>''
    `).run();
    const result = await db
      .prepare(
        `
      SELECT id,date,time,company,title,note,status,category,amount,currency,recurrence,linked_record_id,created_at,updated_at
      FROM calendar_events
      ORDER BY date, time, created_at
    `,
      )
      .all();
    return json({ events: result.results || [] });
  } catch (error) {
    return errorResponse(error, "Etkinlikler okunamadı.");
  }
}

export async function onRequestPost(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const body = await context.request.json().catch(() => ({}));
    const incoming = normalizeCalendarEvent(body?.event || body);
    const recordId = incoming.linked_record_id || crypto.randomUUID();
    const event = { ...incoming, linked_record_id: recordId };
    const record = recordFromEvent(event, recordId);
    await db.batch([
      db.prepare(`INSERT INTO calendar_events (${eventFields.join(",")}) VALUES (${eventFields.map(() => "?").join(",")})`).bind(...eventFields.map(field => event[field])),
      db.prepare(`INSERT INTO records (${recordFields.join(",")},deleted_at,updated_at) VALUES (${recordFields.map(() => "?").join(",")},NULL,CURRENT_TIMESTAMP)`).bind(...recordFields.map(field => record[field])),
    ]);
    await audit(db, event.id, "event_create", {
      date: event.date,
      title: event.title,
    });
    return json({ event }, 201);
  } catch (error) {
    return errorResponse(error, "Etkinlik eklenemedi.");
  }
}

export async function onRequestPatch(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const body = await context.request.json().catch(() => ({}));
    const incoming = normalizeCalendarEvent(body?.event || body);
    const existing = await db
      .prepare("SELECT id,linked_record_id FROM calendar_events WHERE id=?")
      .bind(incoming.id)
      .first();
    if (!existing?.id) return json({ error: "Etkinlik bulunamadı." }, 404);
    const recordId = existing.linked_record_id || incoming.linked_record_id || crypto.randomUUID();
    const event = { ...incoming, linked_record_id: recordId };
    const record = recordFromEvent(event, recordId);
    await db
      .prepare(
        `
      UPDATE calendar_events
      SET date=?, time=?, company=?, title=?, note=?, status=?, category=?, amount=?, currency=?, recurrence=?, linked_record_id=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `,
      )
      .bind(
        event.date,
        event.time,
        event.company,
        event.title,
        event.note,
        event.status,
        event.category,
        event.amount,
        event.currency,
        event.recurrence,
        event.linked_record_id,
        event.id,
      )
      .run();
    const linkedRecord = await db.prepare("SELECT id,status,paid_amount FROM records WHERE id=?").bind(recordId).first();
    if (linkedRecord?.id) {
      const paidAmount = Math.min(Number(linkedRecord.paid_amount || 0), record.amount);
      const status = paidAmount >= record.amount && record.amount > 0 ? "Ödendi" : "Ödenmedi";
      await db.prepare(`UPDATE records SET date=?,tour=?,agency=?,type=?,amount=?,currency=?,status=?,due_date=?,paid_amount=?,source_event_id=?,note=?,deleted_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(record.date,record.tour,record.agency,record.type,record.amount,record.currency,status,record.due_date,paidAmount,event.id,record.note,recordId).run();
    } else {
      await db.prepare(`INSERT INTO records (${recordFields.join(",")},deleted_at,updated_at) VALUES (${recordFields.map(() => "?").join(",")},NULL,CURRENT_TIMESTAMP)`)
        .bind(...recordFields.map(field => record[field])).run();
    }
    await audit(db, event.id, "event_update", {
      date: event.date,
      title: event.title,
    });
    return json({ event });
  } catch (error) {
    return errorResponse(error, "Etkinlik güncellenemedi.");
  }
}

export async function onRequestDelete(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const id = new URL(context.request.url).searchParams.get("id") || "";
    if (!id) return json({ error: "Etkinlik kimliği gerekli." }, 400);
    const existing = await db
      .prepare("SELECT id,title,date,linked_record_id FROM calendar_events WHERE id=?")
      .bind(id)
      .first();
    if (!existing?.id) return json({ error: "Etkinlik bulunamadı." }, 404);
    const statements = [db.prepare("DELETE FROM calendar_events WHERE id=?").bind(id)];
    if (existing.linked_record_id) statements.push(db.prepare("UPDATE records SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL").bind(existing.linked_record_id));
    await db.batch(statements);
    await audit(db, id, "event_delete", {
      date: existing.date,
      title: existing.title,
    });
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Etkinlik silinemedi.");
  }
}
