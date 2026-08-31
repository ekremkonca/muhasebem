import {
  audit,
  errorResponse,
  getDb,
  json,
  normalizeCalendarEvent,
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

export async function onRequestGet(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
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
    const event = normalizeCalendarEvent(body?.event || body);
    await db
      .prepare(
        `INSERT INTO calendar_events (${eventFields.join(",")}) VALUES (${eventFields.map(() => "?").join(",")})`,
      )
      .bind(...eventFields.map((field) => event[field]))
      .run();
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
    const event = normalizeCalendarEvent(body?.event || body);
    const existing = await db
      .prepare("SELECT id FROM calendar_events WHERE id=?")
      .bind(event.id)
      .first();
    if (!existing?.id) return json({ error: "Etkinlik bulunamadı." }, 404);
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
      .prepare("SELECT id,title,date FROM calendar_events WHERE id=?")
      .bind(id)
      .first();
    if (!existing?.id) return json({ error: "Etkinlik bulunamadı." }, 404);
    await db.prepare("DELETE FROM calendar_events WHERE id=?").bind(id).run();
    await audit(db, id, "event_delete", {
      date: existing.date,
      title: existing.title,
    });
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Etkinlik silinemedi.");
  }
}
