import {
  audit,
  errorResponse,
  getDb,
  json,
  requireSession,
  snapshotRecords,
} from "../_lib.js";

const fields = [
  "id",
  "date",
  "tour",
  "guest",
  "agency",
  "ship",
  "type",
  "amount",
  "currency",
  "status",
  "note",
  "deleted_at",
  "created_at",
  "updated_at",
];
const eventFields = [
  "id",
  "date",
  "time",
  "company",
  "title",
  "note",
  "status",
  "created_at",
  "updated_at",
];

function readBackupPayload(raw) {
  const payload = JSON.parse(raw);
  if (Array.isArray(payload)) return { records: payload, events: null };
  if (
    !payload ||
    !Array.isArray(payload.records) ||
    (payload.events != null && !Array.isArray(payload.events))
  ) {
    throw Object.assign(new Error("Yedek verisi bozuk."), { status: 400 });
  }
  return { records: payload.records, events: payload.events || [] };
}

export async function onRequestGet(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const result = await db
      .prepare(
        `SELECT id,title,kind,created_at,length(data) AS bytes FROM backups ORDER BY created_at DESC LIMIT 20`,
      )
      .all();
    return json({ backups: result.results || [] });
  } catch (error) {
    return errorResponse(error, "Yedekler okunamadı.");
  }
}

export async function onRequestPost(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const body = await context.request.json().catch(() => ({}));
    const action = String(body?.action || "create");

    if (action === "create") {
      const title = String(body?.title || "Manuel yedek").slice(0, 80);
      const id = await snapshotRecords(db, title, "manual");
      return json({ ok: true, id });
    }

    if (action === "restore") {
      const id = String(body?.id || "");
      if (!id) return json({ error: "Yedek kimliği gerekli." }, 400);
      const backup = await db
        .prepare("SELECT id,title,data FROM backups WHERE id=?")
        .bind(id)
        .first();
      if (!backup?.data) return json({ error: "Yedek bulunamadı." }, 404);

      await snapshotRecords(
        db,
        `Geri yükleme öncesi — ${backup.title}`,
        "pre-restore",
      );
      const { records: rows, events } = readBackupPayload(backup.data);

      await db.prepare("DELETE FROM records").run();
      if (events !== null)
        await db.prepare("DELETE FROM calendar_events").run();
      const statements = rows.map((row) =>
        db
          .prepare(
            `INSERT INTO records (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`,
          )
          .bind(
            ...fields.map(
              (key) =>
                row[key] ??
                (["guest", "agency", "ship", "note"].includes(key) ? "" : null),
            ),
          ),
      );
      for (let i = 0; i < statements.length; i += 40)
        await db.batch(statements.slice(i, i + 40));
      if (events !== null) {
        const eventStatements = events.map((event) =>
          db
            .prepare(
              `INSERT INTO calendar_events (${eventFields.join(",")}) VALUES (${eventFields.map(() => "?").join(",")})`,
            )
            .bind(
              ...eventFields.map(
                (key) =>
                  event[key] ??
                  (["time", "company", "note"].includes(key) ? "" : null),
              ),
            ),
        );
        for (let i = 0; i < eventStatements.length; i += 40)
          await db.batch(eventStatements.slice(i, i + 40));
      }
      await audit(db, null, "backup_restore", {
        backupId: id,
        title: backup.title,
        recordCount: rows.length,
        eventCount: events?.length ?? null,
      });
      return json({
        ok: true,
        restored: rows.length,
        restoredEvents: events?.length ?? null,
      });
    }

    if (action === "export") {
      const id = String(body?.id || "");
      const backup = await db
        .prepare("SELECT id,title,data,created_at FROM backups WHERE id=?")
        .bind(id)
        .first();
      if (!backup?.data) return json({ error: "Yedek bulunamadı." }, 404);
      const payload = readBackupPayload(backup.data);
      return json({
        backup: {
          id: backup.id,
          title: backup.title,
          created_at: backup.created_at,
          records: payload.records,
          events: payload.events || [],
        },
      });
    }

    return json({ error: "Geçersiz yedek işlemi." }, 400);
  } catch (error) {
    return errorResponse(error, "Yedek işlemi tamamlanamadı.");
  }
}
