const JSON_HEADERS = {
  "content-type": "application/json; charset=UTF-8",
  "cache-control": "no-store",
};

export const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });

const textEncoder = new TextEncoder();
const bytesToHex = (bytes) =>
  Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
const randomHex = (bytes = 32) => {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return bytesToHex(data);
};

export async function hashPin(pin, saltHex) {
  const salt = new Uint8Array(
    saltHex.match(/.{1,2}/g).map((x) => parseInt(x, 16)),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(String(pin)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  return bytesToHex(bits);
}

export const makeSalt = () => randomHex(16);
export const makeSessionId = () => randomHex(32);

async function ensureColumn(db, table, column, sqlType) {
  const info = await db.prepare(`PRAGMA table_info(${table})`).all();
  const names = new Set((info.results || []).map((row) => row.name));
  if (!names.has(column))
    await db
      .prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqlType}`)
      .run();
}

export async function ensureSchema(db) {
  await db
    .prepare(
      `
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      tour TEXT NOT NULL,
      guest TEXT NOT NULL DEFAULT '',
      agency TEXT NOT NULL DEFAULT '',
      ship TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      due_date TEXT NOT NULL DEFAULT '',
      paid_amount REAL NOT NULL DEFAULT 0,
      tags TEXT NOT NULL DEFAULT '',
      source_event_id TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      deleted_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
    )
    .run();

  await ensureColumn(db, "records", "agency", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "records", "ship", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "records", "deleted_at", "TEXT DEFAULT NULL");
  await ensureColumn(db, "records", "due_date", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "records", "paid_amount", "REAL NOT NULL DEFAULT 0");
  await ensureColumn(db, "records", "tags", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "records", "source_event_id", "TEXT NOT NULL DEFAULT ''");

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    data TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    record_id TEXT,
    action TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS admin_auth (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    salt TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL
  )`,
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS login_attempts (
    client_id TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    window_started TEXT NOT NULL,
    blocked_until TEXT DEFAULT NULL
  )`,
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Planlandı',
      category TEXT NOT NULL DEFAULT 'Plan',
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'TRY',
      recurrence TEXT NOT NULL DEFAULT 'Yok',
      linked_record_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
    )
    .run();
  await ensureColumn(db, "calendar_events", "category", "TEXT NOT NULL DEFAULT 'Plan'");
  await ensureColumn(db, "calendar_events", "amount", "REAL NOT NULL DEFAULT 0");
  await ensureColumn(db, "calendar_events", "currency", "TEXT NOT NULL DEFAULT 'TRY'");
  await ensureColumn(db, "calendar_events", "recurrence", "TEXT NOT NULL DEFAULT 'Yok'");
  await ensureColumn(db, "calendar_events", "linked_record_id", "TEXT NOT NULL DEFAULT ''");

  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_records_date ON records(date DESC)",
    )
    .run();
  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_records_currency ON records(currency)",
    )
    .run();
  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_records_deleted ON records(deleted_at)",
    )
    .run();
  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC)",
    )
    .run();
  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_backups_created ON backups(created_at DESC)",
    )
    .run();
  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date, time)",
    )
    .run();

  const defaults = { TRY: 1, USD: 46.3, EUR: 53.0, GBP: 62.3 };
  for (const [key, value] of Object.entries(defaults)) {
    await db
      .prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`)
      .bind(`rate_${key}`, String(value))
      .run();
  }

  await purgeExpired(db);
}

function findD1(env) {
  const preferred = [
    env?.DB,
    env?.db,
    env?.D1,
    env?.DATABASE,
    env?.MUHASEBEM_DB,
  ].filter(Boolean);
  for (const candidate of preferred) {
    if (
      candidate &&
      typeof candidate.prepare === "function" &&
      typeof candidate.batch === "function"
    )
      return candidate;
  }
  for (const [key, value] of Object.entries(env || {})) {
    if (key === "ASSETS") continue;
    if (
      value &&
      typeof value.prepare === "function" &&
      typeof value.batch === "function"
    )
      return value;
  }
  return null;
}

export async function getDb(context) {
  const db = findD1(context.env);
  if (!db) {
    const bindings = Object.entries(context.env || {}).map(([name, value]) => ({
      name,
      type:
        value &&
        typeof value.prepare === "function" &&
        typeof value.batch === "function"
          ? "D1"
          : name === "ASSETS"
            ? "ASSETS"
            : typeof value,
    }));
    throw Object.assign(
      new Error(
        `D1 bağlantısı bulunamadı. Mevcut bindingler: ${bindings.map((x) => `${x.name}:${x.type}`).join(", ") || "yok"}`,
      ),
      { status: 500 },
    );
  }
  await ensureSchema(db);
  return db;
}

function readCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const piece of raw.split(";")) {
    const [k, ...rest] = piece.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export async function isAuthenticated(context, db) {
  const token = readCookie(context.request, "mh_session");
  if (!token) return false;
  const row = await db
    .prepare("SELECT expires_at FROM sessions WHERE id = ?")
    .bind(token)
    .first();
  if (!row?.expires_at) return false;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
    return false;
  }
  return true;
}

export async function requireSession(context, db) {
  if (!(await isAuthenticated(context, db)))
    throw Object.assign(new Error("Oturum gerekli."), { status: 401 });
}

export function sessionCookie(token) {
  return `mh_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`;
}

export function clearSessionCookie() {
  return "mh_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

export async function createSession(db) {
  const id = makeSessionId();
  const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
  await db
    .prepare("INSERT INTO sessions (id, expires_at) VALUES (?, ?)")
    .bind(id, expiresAt)
    .run();
  return id;
}

export async function deleteCurrentSession(context, db) {
  const token = readCookie(context.request, "mh_session");
  if (token)
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
}

export function normalizeRecord(input) {
  if (!input || typeof input !== "object")
    throw Object.assign(new Error("Geçersiz kayıt."), { status: 400 });
  const record = {
    id: String(input.id || crypto.randomUUID()),
    date: String(input.date || "").slice(0, 10),
    tour: String(input.tour || "").trim(),
    guest: String(input.guest || "").trim(),
    agency: String(input.agency || "").trim(),
    ship: String(input.ship || "").trim(),
    type: String(input.type || "").trim(),
    amount: Number(input.amount),
    currency: String(input.currency || "").trim(),
    status: String(input.status || "").trim(),
    due_date: String(input.due_date || "").slice(0, 10),
    paid_amount: Number(input.paid_amount ?? (input.status === "Ödendi" ? input.amount : 0)),
    tags: String(input.tags || "").trim(),
    source_event_id: String(input.source_event_id || "").trim(),
    note: String(input.note || "").trim(),
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date) || record.date < "2026-04-01")
    throw Object.assign(
      new Error("Kayıt tarihi 1 Nisan 2026 veya sonrası olmalı."),
      { status: 400 },
    );
  if (!record.tour)
    throw Object.assign(new Error("Tur adı gerekli."), { status: 400 });
  if (
    !["Tur Geliri", "Tur Masrafı", "Bahşiş", "Komisyon"].includes(record.type)
  )
    throw Object.assign(new Error("Geçersiz işlem türü."), { status: 400 });
  if (!Number.isFinite(record.amount) || record.amount <= 0)
    throw Object.assign(new Error("Tutar sıfırdan büyük olmalı."), {
      status: 400,
    });
  if (!["TRY", "USD", "EUR", "GBP"].includes(record.currency))
    throw Object.assign(new Error("Geçersiz para birimi."), { status: 400 });
  if (!["Ödendi", "Ödenmedi"].includes(record.status))
    throw Object.assign(new Error("Geçersiz durum."), { status: 400 });
  if (record.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(record.due_date))
    throw Object.assign(new Error("Geçersiz vade tarihi."), { status: 400 });
  if (!Number.isFinite(record.paid_amount) || record.paid_amount < 0 || record.paid_amount > record.amount)
    throw Object.assign(new Error("Tahsil edilen tutar toplam tutarı aşamaz."), { status: 400 });
  record.status = record.paid_amount >= record.amount ? "Ödendi" : "Ödenmedi";
  const limits = { tour: 200, guest: 200, agency: 200, ship: 200, tags: 300, source_event_id: 100, note: 2000 };
  for (const [field, limit] of Object.entries(limits)) {
    if (record[field].length > limit)
      throw Object.assign(
        new Error(`${field} alanı en fazla ${limit} karakter olabilir.`),
        { status: 400 },
      );
  }
  return record;
}

export function normalizeCalendarEvent(input) {
  if (!input || typeof input !== "object")
    throw Object.assign(new Error("Geçersiz etkinlik."), { status: 400 });
  const event = {
    id: String(input.id || crypto.randomUUID()),
    date: String(input.date || "").slice(0, 10),
    time: String(input.time || "").trim(),
    company: String(input.company || "").trim(),
    title: String(input.title || "").trim(),
    note: String(input.note || "").trim(),
    status: String(input.status || "Planlandı").trim(),
    category: String(input.category || "Plan").trim(),
    amount: Number(input.amount || 0),
    currency: String(input.currency || "TRY").trim(),
    recurrence: String(input.recurrence || "Yok").trim(),
    linked_record_id: String(input.linked_record_id || "").trim(),
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date))
    throw Object.assign(new Error("Geçerli bir etkinlik tarihi gerekli."), {
      status: 400,
    });
  if (event.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time))
    throw Object.assign(new Error("Etkinlik saati geçersiz."), { status: 400 });
  if (!event.title)
    throw Object.assign(new Error("Etkinlik başlığı gerekli."), {
      status: 400,
    });
  if (
    !["Planlandı", "Kesinleşti", "Tamamlandı", "İptal"].includes(event.status)
  )
    throw Object.assign(new Error("Geçersiz etkinlik durumu."), {
      status: 400,
    });
  if (!["Plan", "Gelir", "Gider", "Tahsilat", "Yatırım", "Vergi"].includes(event.category))
    throw Object.assign(new Error("Geçersiz etkinlik kategorisi."), { status: 400 });
  if (!Number.isFinite(event.amount) || event.amount < 0)
    throw Object.assign(new Error("Etkinlik tutarı geçersiz."), { status: 400 });
  if (!["TRY", "USD", "EUR", "GBP"].includes(event.currency))
    throw Object.assign(new Error("Geçersiz para birimi."), { status: 400 });
  if (!["Yok", "Haftalık", "Aylık", "Yıllık"].includes(event.recurrence))
    throw Object.assign(new Error("Geçersiz tekrar seçeneği."), { status: 400 });
  const limits = { company: 200, title: 200, note: 2000 };
  for (const [field, limit] of Object.entries(limits)) {
    if (event[field].length > limit)
      throw Object.assign(
        new Error(`${field} alanı en fazla ${limit} karakter olabilir.`),
        { status: 400 },
      );
  }
  return event;
}

export async function audit(db, recordId, action, details = {}) {
  await db
    .prepare(
      "INSERT INTO audit_log (id, record_id, action, details) VALUES (?, ?, ?, ?)",
    )
    .bind(
      crypto.randomUUID(),
      recordId || null,
      action,
      JSON.stringify(details || {}),
    )
    .run();
}

export async function snapshotRecords(
  db,
  title = "Manuel yedek",
  kind = "manual",
) {
  const result = await db
    .prepare(
      `SELECT id,date,tour,guest,agency,ship,type,amount,currency,status,due_date,paid_amount,tags,source_event_id,note,deleted_at,created_at,updated_at FROM records ORDER BY date DESC, created_at DESC`,
    )
    .all();
  const eventResult = await db
    .prepare(
      `SELECT id,date,time,company,title,note,status,category,amount,currency,recurrence,linked_record_id,created_at,updated_at FROM calendar_events ORDER BY date, time, created_at`,
    )
    .all();
  const id = crypto.randomUUID();
  const payload = {
    version: 2,
    records: result.results || [],
    events: eventResult.results || [],
  };
  await db
    .prepare("INSERT INTO backups (id, title, data, kind) VALUES (?, ?, ?, ?)")
    .bind(id, title, JSON.stringify(payload), kind)
    .run();
  return id;
}

export async function ensureDailyBackup(db) {
  const existing = await db
    .prepare(
      `SELECT id FROM backups WHERE kind='auto' AND date(created_at)=date('now') LIMIT 1`,
    )
    .first();
  if (!existing?.id) await snapshotRecords(db, "Otomatik günlük yedek", "auto");
  await db
    .prepare(
      `DELETE FROM backups WHERE kind='auto' AND id NOT IN (SELECT id FROM backups WHERE kind='auto' ORDER BY created_at DESC LIMIT 7)`,
    )
    .run();
}

export async function purgeExpired(db) {
  await db
    .prepare(`DELETE FROM sessions WHERE expires_at < ?`)
    .bind(new Date().toISOString())
    .run();
  await db
    .prepare(
      `DELETE FROM records WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now','-30 days')`,
    )
    .run();
}

export function errorResponse(error, fallback = "İşlem tamamlanamadı.") {
  const status = Number(error?.status) || 500;
  return json(
    { error: status < 500 ? error?.message || fallback : fallback },
    status,
  );
}
