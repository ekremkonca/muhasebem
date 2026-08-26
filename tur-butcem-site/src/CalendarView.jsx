import React, { useEffect, useMemo, useState } from "react";
import "./calendar-modern.css";

const TYPE_META = {
  "Tur Geliri": { label: "Gelir", className: "series-income" },
  "Tur Masrafı": { label: "Gider", className: "series-expense" },
  Bahşiş: { label: "Bahşiş", className: "series-tip" },
  Komisyon: { label: "Komisyon", className: "series-commission" },
};

const STATUS_META = {
  Planlandı: { label: "Planlandı", className: "is-planned" },
  Kesinleşti: { label: "Kesinleşti", className: "is-confirmed" },
  Tamamlandı: { label: "Tamamlandı", className: "is-completed" },
  İptal: { label: "İptal", className: "is-cancelled" },
};

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = isoDate(new Date());
const parseDate = (value) => new Date(`${value}T12:00:00`);
const fmtMoney = (n, currency) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
const fmtDate = (value, options) =>
  new Intl.DateTimeFormat("tr-TR", options).format(parseDate(value));

function buildCalendar(viewDate) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(
    first.getFullYear(),
    first.getMonth(),
    1 - mondayOffset,
  );
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i,
    );
    return {
      date,
      key: isoDate(date),
      currentMonth: date.getMonth() === viewDate.getMonth(),
    };
  });
}

function EventModal({ initialEvent, selectedDate, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => ({
    id: initialEvent?.id,
    date: initialEvent?.date || selectedDate || today,
    time: initialEvent?.time || "",
    company: initialEvent?.company || "",
    title: initialEvent?.title || "",
    note: initialEvent?.note || "",
    status: initialEvent?.status || "Planlandı",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose]);

  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || "Etkinlik kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (
      !initialEvent?.id ||
      !window.confirm("Bu etkinlik kalıcı olarak silinsin mi?")
    )
      return;
    setError("");
    setBusy(true);
    try {
      await onDelete(initialEvent.id);
      onClose();
    } catch (err) {
      setError(err.message || "Etkinlik silinemedi.");
      setBusy(false);
    }
  };

  return (
    <div
      className="event-modal-backdrop"
      role="presentation"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !busy && onClose()
      }
    >
      <form
        className="event-modal"
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
      >
        <div className="event-modal-head">
          <div>
            <span className="eyebrow">GELECEK PLANI</span>
            <h2 id="event-modal-title">
              {initialEvent ? "Etkinliği düzenle" : "Yeni etkinlik"}
            </h2>
          </div>
          <button
            type="button"
            className="event-modal-close"
            onClick={onClose}
            aria-label="Pencereyi kapat"
            disabled={busy}
          >
            ×
          </button>
        </div>

        <div className="event-form-grid">
          <label>
            Tarih
            <input
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              required
            />
          </label>
          <label>
            Saat <small>isteğe bağlı</small>
            <input
              type="time"
              value={form.time}
              onChange={(e) => update("time", e.target.value)}
            />
          </label>
          <label className="event-form-wide">
            Firma / acente
            <input
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              maxLength="200"
              placeholder="Özrota Turizm"
            />
          </label>
          <label className="event-form-wide">
            Etkinlik / iş
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              maxLength="200"
              placeholder="Efes öğrenci grubu"
              required
              autoFocus
            />
          </label>
          <label>
            Durum
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              {Object.keys(STATUS_META).map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="event-form-wide">
            Not <small>isteğe bağlı</small>
            <textarea
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              maxLength="2000"
              rows="3"
              placeholder="Buluşma noktası, kişi sayısı veya sözleşme notu…"
            />
          </label>
        </div>

        {error && <p className="event-form-error">{error}</p>}
        <div className="event-modal-actions">
          {initialEvent && (
            <button
              type="button"
              className="event-delete-button"
              onClick={remove}
              disabled={busy}
            >
              Sil
            </button>
          )}
          <span />
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            disabled={busy}
          >
            Vazgeç
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Kaydediliyor…" : "Etkinliği kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function UpcomingEvents({ events = [], onOpenCalendar }) {
  const upcoming = useMemo(
    () =>
      events
        .filter((event) => event.date >= today && event.status !== "İptal")
        .slice()
        .sort((a, b) =>
          `${a.date} ${a.time || ""}`.localeCompare(
            `${b.date} ${b.time || ""}`,
          ),
        )
        .slice(0, 6),
    [events],
  );

  return (
    <section className="upcoming-panel">
      <div className="upcoming-panel-head">
        <div>
          <span className="eyebrow">PLANLAR</span>
          <h2>Yaklaşan Etkinlikler</h2>
        </div>
        <button type="button" onClick={onOpenCalendar}>
          Takvimi aç <span>→</span>
        </button>
      </div>
      <div className="upcoming-list">
        {upcoming.map((event) => {
          const meta = STATUS_META[event.status] || STATUS_META.Planlandı;
          return (
            <button
              type="button"
              className="upcoming-event"
              key={event.id}
              onClick={onOpenCalendar}
            >
              <time dateTime={event.date}>
                <strong>{fmtDate(event.date, { day: "2-digit" })}</strong>
                <span>
                  {fmtDate(event.date, { month: "short" }).replace(".", "")}
                </span>
              </time>
              <span className="upcoming-event-copy">
                <strong>{event.title}</strong>
                <small>
                  {[event.company, event.time].filter(Boolean).join(" · ") ||
                    "Etkinlik planı"}
                </small>
              </span>
              <i
                className={`event-status-dot ${meta.className}`}
                title={meta.label}
              />
            </button>
          );
        })}
        {!upcoming.length && (
          <div className="upcoming-empty">
            <span>✦</span>
            <p>
              <strong>Henüz yaklaşan etkinlik yok.</strong>Takvimden yeni bir iş
              planı ekleyebilirsin.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function CalendarView({
  rows = [],
  events = [],
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}) {
  const now = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [modal, setModal] = useState(null);

  const byDate = useMemo(
    () =>
      rows.reduce((map, row) => {
        if (!map[row.date]) map[row.date] = [];
        map[row.date].push(row);
        return map;
      }, {}),
    [rows],
  );
  const eventsByDate = useMemo(
    () =>
      events.reduce((map, event) => {
        if (!map[event.date]) map[event.date] = [];
        map[event.date].push(event);
        return map;
      }, {}),
    [events],
  );

  const days = useMemo(() => buildCalendar(viewDate), [viewDate]);
  const selectedRows = (byDate[selectedDate] || [])
    .slice()
    .sort((a, b) => b.amount - a.amount);
  const selectedEvents = (eventsByDate[selectedDate] || [])
    .slice()
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const monthPrefix = `${viewDate.getFullYear()}-${pad(viewDate.getMonth() + 1)}-`;
  const monthEventCount = events.filter((event) =>
    event.date.startsWith(monthPrefix),
  ).length;
  const monthLabel = new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(viewDate);
  const selectedLabel = fmtDate(selectedDate, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const moveMonth = (delta) => {
    const next = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() + delta,
      1,
    );
    const selectedDay = parseDate(selectedDate).getDate();
    const lastDay = new Date(
      next.getFullYear(),
      next.getMonth() + 1,
      0,
    ).getDate();
    setViewDate(next);
    setSelectedDate(
      isoDate(
        new Date(
          next.getFullYear(),
          next.getMonth(),
          Math.min(selectedDay, lastDay),
        ),
      ),
    );
  };
  const goToday = () => {
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(today);
  };
  const openCreate = (date = selectedDate) => {
    setSelectedDate(date);
    setModal({ mode: "create", date });
  };
  const saveEvent = async (event) => {
    if (event.id) await onUpdateEvent?.(event);
    else await onCreateEvent?.(event);
    setSelectedDate(event.date);
    setViewDate(parseDate(event.date));
  };

  return (
    <section className="calendar-panel calendar-modern">
      <div className="calendar-head modern-calendar-head">
        <div>
          <span className="eyebrow">PLANLAMA MERKEZİ</span>
          <h2>Takvim</h2>
          <p>İşlerini ve muhasebe hareketlerini tek yerde gör.</p>
        </div>
        <button
          type="button"
          className="calendar-add-button"
          onClick={() => openCreate()}
          disabled={!onCreateEvent}
        >
          <span>＋</span> Etkinlik ekle
        </button>
      </div>

      <div className="calendar-toolbar">
        <div className="calendar-nav modern-calendar-nav">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label="Önceki ay"
          >
            ‹
          </button>
          <strong>{monthLabel}</strong>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="Sonraki ay"
          >
            ›
          </button>
        </div>
        <div className="calendar-toolbar-meta">
          <span>{monthEventCount} etkinlik</span>
          <button type="button" onClick={goToday}>
            Bugün
          </button>
        </div>
      </div>

      <div className="calendar-wrap modern-calendar-wrap">
        <div className="calendar-weekdays">
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map((day) => {
            const records = byDate[day.key] || [];
            const dayEvents = eventsByDate[day.key] || [];
            const visibleTypes = [
              ...new Set(records.map((row) => row.type)),
            ].slice(0, 4);
            const summary =
              [
                dayEvents.length && `${dayEvents.length} etkinlik`,
                records.length && `${records.length} kayıt`,
              ]
                .filter(Boolean)
                .join(", ") || "Plan yok";
            return (
              <button
                type="button"
                key={day.key}
                className={`calendar-day${day.currentMonth ? "" : " muted"}${day.key === today ? " today" : ""}${day.key === selectedDate ? " selected" : ""}`}
                onClick={() => setSelectedDate(day.key)}
                onDoubleClick={() => onCreateEvent && openCreate(day.key)}
                title={`${summary}. Çift tıklayarak etkinlik ekleyebilirsin.`}
              >
                <span className="day-number">{day.date.getDate()}</span>
                <span className="calendar-event-pills">
                  {dayEvents.slice(0, 2).map((event) => (
                    <i
                      key={event.id}
                      className={
                        STATUS_META[event.status]?.className || "is-planned"
                      }
                    >
                      {event.time
                        ? `${event.time} ${event.title}`
                        : event.title}
                    </i>
                  ))}
                  {dayEvents.length > 2 && (
                    <i className="event-more">+{dayEvents.length - 2}</i>
                  )}
                </span>
                {!!records.length && (
                  <span className="calendar-dots">
                    {visibleTypes.map((type) => (
                      <i
                        key={type}
                        className={TYPE_META[type]?.className || ""}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="calendar-day-details">
        <div className="calendar-day-title">
          <div>
            <span>SEÇİLİ GÜN</span>
            <h3>{selectedLabel}</h3>
          </div>
          <button
            type="button"
            onClick={() => openCreate(selectedDate)}
            disabled={!onCreateEvent}
          >
            ＋ Plan ekle
          </button>
        </div>

        <div className="calendar-event-list">
          {selectedEvents.map((event) => {
            const meta = STATUS_META[event.status] || STATUS_META.Planlandı;
            return (
              <button
                type="button"
                className="calendar-event-card"
                key={event.id}
                onClick={() => setModal({ mode: "edit", event })}
                disabled={!onUpdateEvent}
              >
                <span className={`event-card-accent ${meta.className}`} />
                <span className="event-card-time">
                  {event.time || "Tüm gün"}
                </span>
                <span className="event-card-copy">
                  <strong>{event.title}</strong>
                  <small>
                    {event.company || event.note || "Etkinlik planı"}
                  </small>
                </span>
                <span className={`event-status ${meta.className}`}>
                  {meta.label}
                </span>
              </button>
            );
          })}
          {!selectedEvents.length && (
            <button
              type="button"
              className="calendar-event-empty"
              onClick={() => openCreate(selectedDate)}
              disabled={!onCreateEvent}
            >
              <span>＋</span>
              <strong>Bu güne plan ekle</strong>
              <small>Tur, grup veya sözleşme notu oluştur.</small>
            </button>
          )}
        </div>

        {!!selectedRows.length && (
          <div className="calendar-accounting-block">
            <div className="calendar-accounting-title">
              <span>Muhasebe hareketleri</span>
              <b>{selectedRows.length} kayıt</b>
            </div>
            <div className="calendar-record-list compact-record-list">
              {selectedRows.map((row) => {
                const meta = TYPE_META[row.type] || {
                  label: row.type,
                  className: "",
                };
                return (
                  <article key={row.id}>
                    <i className={meta.className} />
                    <div>
                      <strong>{row.tour}</strong>
                      <span>{row.guest || row.note || meta.label}</span>
                    </div>
                    <div className="calendar-record-amount">
                      <strong>{fmtMoney(row.amount, row.currency)}</strong>
                      <span>{meta.label}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <EventModal
          initialEvent={modal.event}
          selectedDate={modal.date || selectedDate}
          onClose={() => setModal(null)}
          onSave={saveEvent}
          onDelete={onDeleteEvent}
        />
      )}
    </section>
  );
}
