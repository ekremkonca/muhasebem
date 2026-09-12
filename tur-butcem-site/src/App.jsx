"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { categoryTotals, currencyTotals, goalProgress } from './accountingSummary.js';
import './styles/accounting-refresh.css';
import FinanceScore from './FinanceScore.jsx';
import CategoryDonut from './CategoryDonut.jsx';
import CurrencyDonuts from './CurrencyDonuts.jsx';
import TourCountDonut from './TourCountDonut.jsx';
import {
  createBackup,
  deleteBackup,
  deleteAllBackups,
  deleteAllHistory,
  deleteHistory,
  createEvent,
  createRecord,
  changePin,
  deleteEvent,
  deleteRecord,
  deleteRecords,
  exportBackup,
  getAuthStateWithRetry,
  getAuthState,
  loadBackups,
  loadEvents,
  loadHistory,
  loadRecords,
  loadSettings,
  login,
  logout,
  logoutAllSessions,
  permanentDeleteRecord,
  permanentDeleteAllTrash,
  restoreBackup,
  restoreRecord,
  saveRates,
  setupPin,
  updateRecord,
  updateRecordStatus,
  updateEvent,
} from "./api";
import AnalyticsChart from "./AnalyticsChart";
import MarketTicker from "./MarketTicker";
import CalendarView, { UpcomingEvents } from "./CalendarView";
import { navigateTo } from "./navigation";
import ThemeSwitcher from "./ThemeSwitcher";
import "./features.css";
import "./v5.css";
import "./v7.css";

const TYPES = ["Tur Geliri", "Tur Masrafı", "Bahşiş", "Komisyon"],
  CURRENCIES = ["TRY", "USD", "EUR", "GBP"],
  MIN_DATE = "2026-04-01",
  PAGE_SIZE = 20;
const INCOME_TYPES = new Set(["Tur Geliri", "Bahşiş", "Komisyon"]);
const EXPENSE_TYPES = new Set(["Tur Masrafı"]);
const REALIZED_FX_EXCHANGES = [
  { code: "USD", amount: 260, rate: 46.44 },
  { code: "GBP", amount: 320, rate: 62.34 },
  { code: "EUR", amount: 545, rate: 53.07 },
];
const REALIZED_FX_TRY = REALIZED_FX_EXCHANGES.reduce(
  (sum, item) => sum + item.amount * item.rate,
  0,
);
const CASH_FX_BALANCES = [
  { code: "USD", amount: 159 },
  { code: "EUR", amount: 123 },
];
const pad = (n) => String(n).padStart(2, "0");
const localISO = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => localISO(new Date());
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const fmtDate = (d) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${d}T12:00:00`));
const fmtDateTime = (d) =>
  d
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(d))
    : "—";
const money = (n, c) => {
  const formatted = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
  return formatted.replace(/,00$/, "");
};
const topValues = (rows, key, limit = 5) => {
  const counts = new Map();
  rows.forEach((row) => {
    const value = String(row?.[key] || "").trim();
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr-TR"))
    .slice(0, limit)
    .map(([value]) => value);
};

function AnimatedMoney({ value, currency }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setDisplay(target);
      return undefined;
    }
    const startValue = 0;
    let startedAt;
    // Start at the first frame, after the dashboard has rendered.
    const duration = 300;
    let frame;
    const tick = (time) => {
      startedAt ??= time;
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = progress;
      setDisplay(startValue + (target - startValue) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    setDisplay(startValue);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <span className="animated-money" data-counter="linear-300" aria-label={money(target, currency)}>
      {money(display, currency)}
    </span>
  );
}
const tidy = (v) =>
  String(v || "")
    .trim()
    .toLocaleLowerCase("tr-TR");
const normalizeStatus = (s) =>
  ["iade edildi", "iade", "refund", "refunded"].includes(tidy(s))
    ? "İade edildi"
    : ["ödendi", "odendi", "alındı", "alindi", "paid", "tahsil edildi"].includes(
    tidy(s),
  )
    ? "Ödendi"
    : "Ödenmedi";
const normalizeType = (t) => {
  const k = tidy(t);
  if (["tur geliri", "gelir", "income", "tour income"].includes(k))
    return "Tur Geliri";
  if (
    [
      "tur masrafı",
      "tur masrafi",
      "masraf",
      "gider",
      "expense",
      "tur gideri",
    ].includes(k)
  )
    return "Tur Masrafı";
  if (["bahşiş", "bahsis", "tip"].includes(k)) return "Bahşiş";
  if (["komisyon", "commission"].includes(k)) return "Komisyon";
  return TYPES.includes(t) ? t : "Tur Geliri";
};
const normalizeCurrency = (c) => {
  const x = String(c || "TRY").toUpperCase();
  return CURRENCIES.includes(x) ? x : "TRY";
};
const normalizeRecord = (r) => ({
  ...r,
  id: r.id || "",
  date: r.date || today(),
  tour: r.tour || "",
  guest: r.guest || "",
  agency: r.agency || "",
  ship: r.ship || "",
  type: normalizeType(r.type),
  amount: Number(r.amount || 0),
  currency: normalizeCurrency(r.currency),
  status: normalizeStatus(r.status),
  due_date: r.due_date || "",
  paid_amount: Number(r.paid_amount ?? (normalizeStatus(r.status) === "Ödendi" ? r.amount : 0)),
  tags: r.tags || "",
  source_event_id: r.source_event_id || "",
  note: r.note || "",
});
const isIncome = (r) => INCOME_TYPES.has(normalizeType(r.type));
const isExpense = (r) => EXPENSE_TYPES.has(normalizeType(r.type));

function Icon({ name, size = 18 }) {
  const p = {
    plus: <path d="M12 5v14M5 12h14" />,
    download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6" />
      </>
    ),
    edit: (
      <>
        <path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5z" />
        <path d="m13.8 6.7 3.5 3.5" />
      </>
    ),
    filter: <path d="M4 5h16l-6 7v5l-4 2v-7z" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    temple: (
      <>
        <path d="M3 21h18M5 18h14M6 18V10h12v8M3 10h18L12 3z" />
        <path d="M9 10v8m3-8v8m3-8v8" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z" />
      </>
    ),
    backup: (
      <>
        <path d="M4 5h12l4 4v10H4z" />
        <path d="M8 5v5h8V5M8 19v-5h8v5" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
      </>
    ),
    box: (
      <>
        <path d="m3 7 9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10" />
      </>
    ),
    report: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M9 12h6M9 16h6M9 8h3" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {p[name]}
    </svg>
  );
}

function AuthScreen({ configured, onDone }) {
  const [pin, setPin] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [nativeBiometric, setNativeBiometric] = useState(false);
  useEffect(() => setNativeBiometric(Boolean(window.AndroidAuth)), []);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{4,8}$/.test(pin)) {
      setError("PIN 4-8 rakam olmalı.");
      return;
    }
    if (!configured && pin !== confirm) {
      setError("PIN doğrulaması eşleşmiyor.");
      return;
    }
    setBusy(true);
    try {
      configured ? await login(pin) : await setupPin(pin);
      try { window.AndroidAuth?.savePin(pin); } catch {}
      onDone();
    } catch (err) {
      try {
        const recovered = await getAuthState(true);
        if (recovered?.authenticated) {
          try { window.AndroidAuth?.savePin(pin); } catch {}
          onDone();
          return;
        }
      } catch {}
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <img className="auth-logo-image" src="/ek-logo-clean.png" alt="EK" />
        <span className="eyebrow">MUHASEBE V7</span>
        <h1>{configured ? "Giriş" : "İlk güvenlik kurulumu"}</h1>
        <p>
          {configured
            ? "Muhasebe verilerine erişmek için PIN gir."
            : "Bu PIN cihazlar arasında hesabını korur. 4-8 rakam belirle."}
        </p>
        <label>
          PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength="8"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
        </label>
        {!configured && (
          <label>
            PIN tekrar
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="8"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
            />
          </label>
        )}
        {error && <p className="auth-error">{error}</p>}
        <button className="btn primary auth-submit" disabled={busy}>
          {busy
            ? "Kontrol ediliyor..."
            : configured
              ? "Giriş yap"
              : "PIN’i oluştur"}
        </button>
        {nativeBiometric && configured && (
          <button
            type="button"
            className="btn auth-biometric"
            onClick={() => window.AndroidAuth.authenticate()}
          >
            👆 Parmak izi ile giriş
          </button>
        )}
      </form>
    </div>
  );
}

function EntryModal({ record, onClose, onSave, currency, quickDefaults, agencyOptions = [], typeOptions = TYPES, currencyOptions = CURRENCIES }) {
  const editing = Boolean(record?.id);
  const [form, setForm] = useState(
    normalizeRecord(
      record || {
        id: "",
        date: today(),
        tour: "",
        guest: "",
        agency: quickDefaults?.agency || "",
        ship: "",
        type: quickDefaults?.type || "Tur Geliri",
        amount: "",
        currency: quickDefaults?.currency || currency,
        status: "Ödendi",
        due_date: "",
        paid_amount: "",
        tags: "",
        note: "",
      },
    ),
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const applyQuick = (values) => setForm((f) => normalizeRecord({ ...f, ...values, amount: f.amount }));
  const submit = async (e) => {
    e.preventDefault();
    if (!Number(form.amount) || saving) return;
    setSaving(true);
    try {
      await onSave(
        normalizeRecord({
          ...form,
          tour: form.tour || "Muhasebe kaydı",
          id: form.id || uid(),
          amount: Number(form.amount),
        }),
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form className="modal v7-entry" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              {editing ? "KAYIT DÜZENLE" : "YENİ HAREKET"}
            </span>
            <h2>{editing ? "Kaydı güncelle" : "Tur kaydı ekle"}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {!editing && (
          <div className="quick-entry-panel" aria-label="Hızlı kayıt önerileri">
            {agencyOptions.length > 0 && (
              <div>
                <span>Sık acentalar</span>
                <div>
                  {agencyOptions.map((agency) => (
                    <button type="button" key={agency} onClick={() => applyQuick({ agency })}>
                      {agency}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <span>İşlem</span>
              <div>
                {typeOptions.map((type) => (
                  <button type="button" key={type} className={form.type === type ? "active" : ""} onClick={() => applyQuick({ type })}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span>Para birimi</span>
              <div>
                {currencyOptions.map((item) => (
                  <button type="button" key={item} className={form.currency === item ? "active" : ""} onClick={() => applyQuick({ currency: item })}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="form-grid">
          <label>
            İşlem türü
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
            >
              {TYPES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Tarih
            <input
              type="date"
              min={MIN_DATE}
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              required
            />
          </label>
          <label>
            Acenta
            <input
              value={form.agency}
              onChange={(e) => set("agency", e.target.value)}
              placeholder="Örn. X Travel"
            />
          </label>
          <label>
            Durum
            <select
              value={form.status}
              onChange={(e) => {
                const next = e.target.value;
                setForm((f) => ({ ...f, status: next, paid_amount: next === "Ödendi" ? f.amount : 0 }));
              }}
            >
              <option>Ödendi</option>
              <option>Ödenmedi</option>
              <option>İade edildi</option>
            </select>
          </label>
          <label>
            Tutar
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => {
                const amount = e.target.value;
                setForm((f) => ({ ...f, amount, paid_amount: f.status === "Ödendi" ? amount : Math.min(Number(f.paid_amount || 0), Number(amount || 0)) }));
              }}
              required
            />
          </label>
          <label>
            Para birimi
            <select
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
            >
              {CURRENCIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="wide">
            Not
            <input
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn primary" disabled={saving}>
            <Icon name="check" />
            {saving ? "Kaydediliyor..." : editing ? "Kaydet" : "Kaydı ekle"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReportModal({ rows, currency, convert, onExcel, onPdf, onWhatsApp, onClose }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const monthRows = rows.filter((r) => r.date.startsWith(month));
  const paid = monthRows.filter((r) => r.status === "Ödendi");
  const income = paid
      .filter((r) => normalizeType(r.type) === "Tur Geliri")
      .reduce((s, r) => s + convert(r), 0),
    expense = paid.filter(isExpense).reduce((s, r) => s + convert(r), 0),
    tips = paid
      .filter((r) => r.type === "Bahşiş")
      .reduce((s, r) => s + convert(r), 0),
    commission = paid
      .filter((r) => r.type === "Komisyon")
      .reduce((s, r) => s + convert(r), 0),
    tourCount = new Set(monthRows.map((r) => `${r.date}|${r.tour}`)).size,
    pending = monthRows
      .filter((r) => r.status === "Ödenmedi" && isIncome(r))
      .reduce((s, r) => s + convert(r), 0);
  const nativeSummary = (type) => currencyTotals(paid, type)
    .filter((item) => item.amount !== 0)
    .map((item) => money(item.amount, item.code))
    .join(" · ") || money(0, "TRY");
  const reportText = [
    `REHBERLİK MUHASEBE — ${month}`,
    "",
    `Gelir: ${money(income, currency)}`,
    `Masraf: ${money(expense, currency)}`,
    `Net: ${money(income - expense, currency)}`,
    `Bahşiş: ${nativeSummary("Bahşiş")}`,
    `Komisyon: ${nativeSummary("Komisyon")}`,
    `Tur sayısı: ${tourCount}`,
    `Bekleyen tahsilat: ${money(pending, currency)}`,
  ].join("\n");
  return (
    <div className="modal-backdrop report-backdrop">
      <section className="modal report-modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">AYLIK RAPOR</span>
            <h2>{month} özeti</h2>
          </div>
          <button className="icon-btn no-print" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="report-toolbar no-print">
          <input
            type="month"
            min="2026-04"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button className="btn primary" onClick={() => onPdf ? onPdf({ text: reportText, month }) : window.print()}>
            <Icon name="report" />
            Yazdır / PDF
          </button>
          <button className="btn secondary" onClick={() => onExcel?.({ rows: monthRows, month })}>
            <Icon name="download" />
            Excel
          </button>
          <button className="btn whatsapp-share" onClick={() => onWhatsApp?.({ text: reportText, month })}>
            WhatsApp'ta paylaş
          </button>
        </div>
        <div className="report-grid">
          <article>
            <span>Gelir</span>
            <strong>{money(income, currency)}</strong>
          </article>
          <article>
            <span>Masraf</span>
            <strong>{money(expense, currency)}</strong>
          </article>
          <article>
            <span>Net</span>
            <strong>{money(income - expense, currency)}</strong>
          </article>
          <article>
            <span>Tur sayısı</span>
            <strong>{tourCount}</strong>
          </article>
          <article>
            <span>Bahşiş</span>
            <strong>{nativeSummary("Bahşiş")}</strong>
          </article>
          <article>
            <span>Komisyon</span>
            <strong>{nativeSummary("Komisyon")}</strong>
          </article>
          <article>
            <span>Alacak</span>
            <strong>{money(pending, currency)}</strong>
          </article>
        </div>
        <div className="report-table">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tur</th>
                <th>Tür</th>
                <th>Durum</th>
                <th className="right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {monthRows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.date)}</td>
                  <td>{r.tour}</td>
                  <td>{r.type}</td>
                  <td>{r.status}</td>
                  <td className="right">{["Bahşiş", "Komisyon"].includes(normalizeType(r.type)) && normalizeCurrency(r.currency) !== currency ? money(r.amount, r.currency) : money(convert(r), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SecurityPanel({ onChangePin, onLogoutAll }) {
  const [pin, setPin] = useState(""), [confirm, setConfirm] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(pin) || pin !== confirm) { setMessage("PIN 4-8 rakam olmalı ve tekrar alanı eşleşmeli."); return; }
    setBusy(true); setMessage("");
    try { await onChangePin(pin); setPin(""); setConfirm(""); setMessage("PIN değiştirildi."); }
    catch (error) { setMessage(error.message || "PIN değiştirilemedi."); }
    finally { setBusy(false); }
  };
  return <div className="security-panel">
    <form onSubmit={submit} className="security-form">
      <p>Yeni PIN 4-8 rakamdan oluşmalıdır.</p>
      <label>Yeni PIN<input type="password" inputMode="numeric" maxLength="8" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} /></label>
      <label>Yeni PIN tekrar<input type="password" inputMode="numeric" maxLength="8" value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} /></label>
      {message && <p className="system-message">{message}</p>}
      <button className="btn primary" disabled={busy}>{busy ? "Kaydediliyor..." : "PIN’i değiştir"}</button>
    </form>
    <div className="security-danger">
      <strong>Tüm cihazlardan çıkış</strong>
      <p>Açık olan tüm oturumlar kapatılır ve her cihazda yeniden PIN istenir.</p>
      <button className="btn danger" onClick={onLogoutAll}>Tüm cihazlardan çıkış yap</button>
    </div>
  </div>;
}

function SystemPanel({
  tab,
  onClose,
  rates,
  setRates,
  ratesUpdatedAt,
  onSaveRates,
  backups,
  onCreateBackup,
  onRestoreBackup,
  onExportBackup,
  onDeleteBackup,
  onDeleteAllBackups,
  history,
  onDeleteHistory,
  onDeleteAllHistory,
  trash,
  onRestoreTrash,
  onPurgeTrash,
  onPurgeAllTrash,
  onChangePin,
  onLogoutAll,
}) {
  if (!tab) return null;
  const actionLabel = {
    create: "Kayıt oluşturuldu",
    update: "Kayıt düzenlendi",
    status: "Durum değişti",
    delete: "Çöp kutusuna taşındı",
    restore: "Geri yüklendi",
    purge: "Kalıcı silindi",
    backup_restore: "Yedek geri yüklendi",
  };
  return (
    <section className="system-panel">
      <div className="system-panel-head">
        <div>
          <span className="eyebrow">SİSTEM</span>
          <h2>
            {tab === "rates"
              ? "Kur ayarları"
              : tab === "backups"
                ? "Yedekleme merkezi"
                : tab === "history"
                  ? "İşlem geçmişi"
                  : tab === "security"
                    ? "Güvenlik"
                    : "Çöp kutusu"}
          </h2>
        </div>
        <button className="icon-btn" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {tab === "rates" && (
        <div className="rates-panel">
          <p>
            TRY bazlı manuel kurlar. Son güncelleme:{" "}
            <b>{fmtDateTime(ratesUpdatedAt)}</b>
          </p>
          <div className="rate-grid">
            {["USD", "EUR", "GBP"].map((c) => (
              <label key={c}>
                {c} / TRY
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={rates[c] || ""}
                  onChange={(e) =>
                    setRates((x) => ({ ...x, [c]: Number(e.target.value) }))
                  }
                />
              </label>
            ))}
          </div>
          <button className="btn primary" onClick={onSaveRates}>
            Kurları kaydet
          </button>
        </div>
      )}
      {tab === "backups" && (
        <div className="backup-panel">
          <div className="panel-actions">
            <button className="btn primary" onClick={onCreateBackup}>
              <Icon name="backup" />
              Şimdi yedekle
            </button>
            <button className="btn danger" disabled={!backups.length} onClick={onDeleteAllBackups}>Tümünü tamamen sil</button>
          </div>
          <div className="system-list">
            {backups.map((b) => (
              <article key={b.id}>
                <div>
                  <strong>{b.title}</strong>
                  <span>
                    {fmtDateTime(b.created_at)} ·{" "}
                    {b.kind === "auto"
                      ? "Otomatik"
                      : b.kind === "pre-restore"
                        ? "Geri yükleme öncesi"
                        : "Manuel"}
                  </span>
                </div>
                <div className="mini-actions">
                  <button onClick={() => onExportBackup(b)}>JSON</button>
                  <button onClick={() => onRestoreBackup(b)}>Geri yükle</button>
                  <button className="danger" onClick={() => onDeleteBackup(b)}>Kalıcı sil</button>
                </div>
              </article>
            ))}
            {!backups.length && <p>Henüz yedek yok.</p>}
          </div>
        </div>
      )}
      {tab === "history" && (
        <div>
          <div className="panel-actions"><button className="btn danger" disabled={!history.length} onClick={onDeleteAllHistory}>Tümünü tamamen sil</button></div>
          <div className="system-list history-list">
          {history.map((h) => (
            <article key={h.id}>
              <div>
                <strong>{actionLabel[h.action] || h.action}</strong>
                <span>
                  {fmtDateTime(h.created_at)}
                  {h.record_id ? ` · ${h.record_id.slice(0, 8)}` : ""}
                </span>
              </div>
              <div className="mini-actions">
                <button className="danger" onClick={() => onDeleteHistory(h)}>Kalıcı sil</button>
              </div>
            </article>
          ))}
          {!history.length && <p>İşlem geçmişi boş.</p>}
          </div>
        </div>
      )}
      {tab === "trash" && (
        <div>
          <div className="panel-actions"><button className="btn danger" disabled={!trash.length} onClick={onPurgeAllTrash}>Tümünü tamamen sil</button></div>
          <div className="system-list trash-list">
          {trash.map((r) => (
            <article key={r.id}>
              <div>
                <strong>{r.tour}</strong>
                <span>
                  {fmtDate(r.date)} · {money(r.amount, r.currency)} · 30 gün
                  içinde otomatik silinir
                </span>
              </div>
              <div className="mini-actions">
                <button onClick={() => onRestoreTrash(r)}>Geri al</button>
                <button className="danger-text" onClick={() => onPurgeTrash(r)}>
                  Kalıcı sil
                </button>
              </div>
            </article>
          ))}
          {!trash.length && <p>Çöp kutusu boş.</p>}
          </div>
        </div>
      )}
      {tab === "security" && <SecurityPanel onChangePin={onChangePin} onLogoutAll={onLogoutAll} />}
    </section>
  );
}

function V8Enhancements({ rows, income, expense, pending, currency, tourCount, net, convert }) {
  const [customize, setCustomize] = useState(false);
  const [cardOrder, setCardOrder] = useState(() => { try { return JSON.parse(localStorage.getItem("v8-card-order") || '["score","chart","notice"]'); } catch { return ["score","chart","notice"]; } });
  const [dragCard, setDragCard] = useState(null);
  const [hidden, setHidden] = useState(() => { try { return JSON.parse(localStorage.getItem("v8-hidden-cards") || "[]"); } catch { return []; } });
  const score = Math.max(0, Math.min(100, Math.round(70 + (income > 0 ? Math.min(20, (income - expense) / Math.max(income, 1) * 20) : 0) - (pending > income * .4 ? 15 : 0))));
  const toggle = (id) => setHidden((items) => { const next = items.includes(id) ? items.filter((x) => x !== id) : [...items, id]; try { localStorage.setItem("v8-hidden-cards", JSON.stringify(next)); } catch {} return next; });
  const moveCard = (id) => { if (!dragCard || dragCard === id) return; const next = [...cardOrder]; const from = next.indexOf(dragCard); const to = next.indexOf(id); next.splice(from, 1); next.splice(to, 0, dragCard); setCardOrder(next); localStorage.setItem("v8-card-order", JSON.stringify(next)); setDragCard(null); };
  const cats = categoryTotals(rows, convert);
  const max = Math.max(...cats.map((x) => x.value), 1);
  const notices = rows.filter((r) => r.status === "Ödenmedi");
  const recentRows = [...rows].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const [goal, setGoal] = useState(() => { try { return JSON.parse(localStorage.getItem("v8-goal") || "null"); } catch { return null; } });
  const {current: goalCurrent, percent: goalPercent} = goalProgress(net, goal?.target);
  const [goalInput, setGoalInput] = useState("");
  const [detail, setDetail] = useState(false);
  const [trendReplay, setTrendReplay] = useState(0);
  const saveGoal = () => { const value = Number(goalInput); if (!value) return; const next = {target:value, current:Math.max(0,income-expense)}; setGoal(next); localStorage.setItem("v8-goal", JSON.stringify(next)); setGoalInput(""); };
  const monthBars = Array.from({length:6}, (_, i) => { const d = new Date(); d.setMonth(d.getMonth()-5+i); const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; const value = rows.filter(r => String(r.date||"").startsWith(key)).reduce((s,r)=>s+(r.status === "Ödendi" ? (normalizeType(r.type) === "Tur Masrafı" ? -convert(r) : normalizeType(r.type) === "Tur Geliri" ? convert(r) : 0) : 0),0); return {label:d.toLocaleDateString("tr-TR",{month:"short"}),value}; });
  return <section className="v8-enhancements" aria-label="V8 finans araçları">
    <div className="v8-enhance-head"><div><span className="eyebrow">V8 ÖZET</span><h3>Finans görünümü</h3></div><button className="btn secondary" onClick={() => setCustomize((x) => !x)}>{customize ? "Tamam" : "Kartları düzenle"}</button></div>
    {customize && <div className="v8-card-picker">{[["score","Finans skoru"],["chart","Kategori grafiği"]].map(([id,label]) => <label key={id}><input type="checkbox" checked={!hidden.includes(id)} onChange={() => toggle(id)}/>{label}</label>)}</div>}
    <div className="v8-enhance-grid">
      {!hidden.includes("score") && <FinanceScore score={score} onDetails={() => setDetail(true)} />}
      {!hidden.includes("chart") && <CategoryDonut cats={cats} currency={currency} money={money} />}
      <TourCountDonut count={tourCount} />
    </div>
    <div className="v8-suite-grid">
      <article><div className="v8-card-title"><span>Gelir / gider trendi</span><button className="v8-link trend-replay" onClick={()=>setTrendReplay(n=>n+1)}>↻ Oynat</button></div><div className="v8-line-chart" key={trendReplay}>{monthBars.map((m,i)=><div key={i} title={`${m.label}: ${money(m.value,currency)}`}><i style={{height:`${Math.max(8,Math.min(100,m.value/(Math.max(...monthBars.map(x=>x.value),1))*100))}%`}}/><small>{m.label}</small></div>)}</div></article>
      <article><div className="v8-card-title"><span>Birikim hedefi</span><button className="v8-link" onClick={()=>{const v=prompt("Hedef tutarı", goal?.target || ""); if(Number.isFinite(Number(v)) && Number(v)>0){setGoal({target:Number(v),current:Math.max(0,income-expense)});localStorage.setItem("v8-goal",JSON.stringify({target:Number(v),current:Math.max(0,income-expense)}));}}}>Hedef belirle</button></div>{goal ? <><strong className="v8-goal-value">{money(goalCurrent,currency)} / {money(goal.target,currency)}</strong><div className="v8-progress"><i style={{width:`${goalPercent}%`}}/></div><small>%{Math.round(goalPercent)} tamamlandı</small></> : <p className="v8-muted">Birikim hedefi ekle.</p>}</article>
      <article className="scroll-summary"><div className="v8-card-title"><span>Yaklaşan ödemeler</span><small>{notices.length}</small></div><div className="summary-scroll" tabIndex="0" aria-label="Yaklaşan ödemeler">{notices.map(r=><div className="v8-debt" key={r.id}><span>{[r.agency, r.note].filter(Boolean).join(" · ") || r.tour || "Ödeme"}</span><b>{money(Math.max(0,Number(r.amount)-Number(r.paid_amount||0)),normalizeCurrency(r.currency))}</b></div>)}{!notices.length&&<p className="v8-muted">Yaklaşan ödeme yok.</p>}</div></article>
      <article className="scroll-summary"><div className="v8-card-title"><span>Son işlemler</span><small>{recentRows.length}</small></div><div className="summary-scroll" tabIndex="0" aria-label="Son işlemler">{recentRows.map(r=><div className="v8-debt recent-debt" key={r.id}><span>{r.tour || 'Kayıt'}<small>{r.type} · {r.date}</small></span><b>{money(r.amount, normalizeCurrency(r.currency))}</b></div>)}{!recentRows.length&&<p className="v8-muted">Henüz işlem yok.</p>}</div></article>
    </div>
    <div className="v8-suite-actions"><button className="btn secondary" onClick={()=>document.documentElement.classList.toggle("v8-colorblind")}>Erişilebilir renkler</button></div>
    {detail && <div className="v8-modal-backdrop" onClick={()=>setDetail(false)}><div className="v8-score-detail" onClick={e=>e.stopPropagation()}><button onClick={()=>setDetail(false)}>×</button><h3>Finans skorun {score}/100</h3><p>Gelir-gider dengesi, bekleyen alacaklar ve kayıt düzenine göre hesaplanır.</p><ul><li>Net akış: {money(income-expense,currency)}</li><li>Bekleyen alacak: {money(pending,currency)}</li><li>Takip önerisi: {pending > income*.4 ? "Bekleyen ödemeleri azalt." : "Düzenli takibe devam et."}</li></ul></div></div>}
  </section>;
}

function MonthlySummary({ rows, currency, convert }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const monthRows = rows.filter((r) => String(r.date || "").startsWith(month));
  const paid = monthRows.filter((r) => r.status === "Ödendi");
  const incomeValue = paid.filter(isIncome).reduce((sum, row) => sum + convert(row), 0);
  const expenseValue = paid.filter(isExpense).reduce((sum, row) => sum + convert(row), 0);
  const pendingValue = monthRows.filter((r) => r.status === "Ödenmedi").reduce((sum, row) => sum + convert(row), 0);
  const byAgency = {};
  paid.forEach((row) => {
    const key = row.agency || row.tour || "Diğer";
    byAgency[key] = (byAgency[key] || 0) + (isExpense(row) ? -convert(row) : convert(row));
  });
  const topAgency = Object.entries(byAgency).sort((a, b) => b[1] - a[1])[0] || ["—", 0];
  const categories = TYPES.map((type) => ({
    type,
    value: monthRows.filter((row) => row.type === type).reduce((sum, row) => sum + Math.abs(convert(row)), 0),
  }));
  const max = Math.max(...categories.map((item) => item.value), 1);
  return (
    <section className="monthly-summary">
      <div className="monthly-summary-head">
        <div>
          <span className="eyebrow">AYLIK ÖZET</span>
          <h3>Bu ayın net resmi</h3>
        </div>
        <input type="month" min="2026-04" value={month} onChange={(event) => setMonth(event.target.value)} />
      </div>
      <div className="monthly-summary-grid">
        <article><span>Kazanç</span><strong>{money(incomeValue, currency)}</strong><small>{paid.filter(isIncome).length} gelir kaydı</small></article>
        <article><span>Masraf</span><strong>{money(expenseValue, currency)}</strong><small>{paid.filter(isExpense).length} masraf kaydı</small></article>
        <article><span>Net</span><strong>{money(incomeValue - expenseValue, currency)}</strong><small>{monthRows.length} toplam kayıt</small></article>
        <article><span>Alacak</span><strong>{money(pendingValue, currency)}</strong><small>{monthRows.filter((r) => r.status === "Ödenmedi").length} bekleyen</small></article>
        <article className="wide"><span>En iyi kaynak</span><strong>{topAgency[0]}</strong><small>{money(topAgency[1], currency)}</small></article>
      </div>
      <div className="monthly-category-bars">
        {categories.map((item) => (
          <div key={item.type}>
            <span>{item.type}</span>
            <i><b style={{ width: `${Math.max(5, (item.value / max) * 100)}%` }} /></i>
            <strong>{money(item.value, currency)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function DailyGreeting({rows,currency,convert}){
 const now=new Date(),hour=now.getHours(),greeting=hour<12?'Günaydın':hour<18?'İyi günler':'İyi akşamlar',todayKey=localISO(now),todayRows=rows.filter(r=>r.date===todayKey&&r.status==='Ödendi');
 const todayIncome=todayRows.filter(isIncome).reduce((s,r)=>s+convert(r),0),todayTours=todayRows.filter(r=>normalizeType(r.type)==='Tur Geliri').length;
 return <article className="daily-hello summary-greeting"><div><span className="eyebrow">GÜNÜN ÖZETİ</span><h2>{greeting}, Ekrem</h2><p>Bugün <b>{todayTours} tur</b> ve <b>{money(todayIncome,currency)}</b> kayıtlı kazanç var.</p></div><div className="daily-orbit"><i/><strong>{now.getDate()}</strong><small>{now.toLocaleDateString('tr-TR',{month:'short'}).toUpperCase()}</small></div></article>;
}

function VisualExperience({rows,income,expense,pending,tourCount,currency,convert}){
  const now=new Date(),hour=now.getHours(),greeting=hour<12?'Günaydın':hour<18?'İyi günler':'İyi akşamlar',todayKey=localISO(now),todayRows=rows.filter(r=>r.date===todayKey&&r.status==='Ödendi');
  const todayIncome=todayRows.filter(isIncome).reduce((s,r)=>s+convert(r),0),todayTours=todayRows.filter(r=>normalizeType(r.type)==='Tur Geliri').length;
  const agencies={};rows.filter(r=>r.status==='Ödendi').forEach(r=>{const key=r.agency||r.tour||'Diğer';agencies[key]=(agencies[key]||0)+(isExpense(r)?-convert(r):convert(r))});
  const top=Object.entries(agencies).sort((a,b)=>b[1]-a[1]).slice(0,4),net=income-expense,ratio=income?Math.max(0,Math.min(100,net/income*100)):0;
  const badges=[tourCount>=50&&['🏆','50+ tur'],net>=100000&&['✦','₺100 bin+'],pending===0&&['✓','Alacaksız'],expense===0&&['◆','Masrafsız dönem']].filter(Boolean);
  return <section className="visual-experience"><article className="success-story"><span>AYLIK BAŞARI HİKÂYESİ</span><h3>Gelirin %{Math.round(ratio)}’ı sende kaldı</h3><div className="story-track"><i style={{width:`${ratio}%`}}/></div><p>Net durum: <b>{money(net,currency)}</b> · Bekleyen: <b>{money(pending,currency)}</b></p></article><article className="money-flow"><span>CANLI FİNANS HARİTASI</span><div><i className="flow-income">Gelir<strong>{money(income,currency)}</strong></i><b className="flow-core">NET<em>{money(net,currency)}</em></b><i className="flow-expense">Masraf<strong>{money(expense,currency)}</strong></i></div></article><article className="agency-showcase"><span>ACENTA PROFİLLERİ</span><div>{top.map(([name,value],index)=><div key={name}><i>{String(name).split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}</i><span><b>{name}</b><small>{money(value,currency)}</small></span><em>#{index+1}</em></div>)}</div></article>{badges.length>0&&<article className="achievement-strip"><span>BAŞARILAR</span><div>{badges.map(([icon,label])=><b key={label}><i>{icon}</i>{label}</b>)}</div></article>}</section>
}

function CompactReceivables({rows,currency,convertOutstanding,keepNativeCurrency,onPaid}){
  const open=rows.filter(r=>r.status==='Ödenmedi').sort((a,b)=>convertOutstanding(b)-convertOutstanding(a)),total=open.reduce((s,r)=>s+convertOutstanding(r),0);
  return <section className="compact-receivables"><div className="panel-title"><div><span className="eyebrow">ALACAKLAR</span><h2>{money(total,currency)}</h2></div><span>{open.length} kayıt</span></div><div className="compact-receivable-list">{open.slice(0,6).map(r=><article key={r.id}><div><strong>{[r.agency,r.note].filter(Boolean).join(' · ')||r.tour||'Kayıt'}</strong><small>{r.type} · {fmtDate(r.date)}</small></div><div><b>{keepNativeCurrency(r)?money(Math.max(0,r.amount-r.paid_amount),r.currency):money(convertOutstanding(r),currency)}</b><button onClick={()=>onPaid(r)}>Ödendi yap</button></div></article>)}{!open.length&&<p className="empty-mini">Bekleyen alacak yok.</p>}</div></section>
}

function Dashboard({ onSignedOut }) {
  const [rows, setRows] = useState([]),
    [events, setEvents] = useState([]),
    [currency, setCurrency] = useState("TRY"),
    [rates, setRates] = useState({ TRY: 1, USD: 46.3, EUR: 53, GBP: 62.3 }),
    [ratesUpdatedAt, setRatesUpdatedAt] = useState(null),
    [typeFilter, setTypeFilter] = useState("Tümü"),
    [statusFilter, setStatusFilter] = useState("Tümü"),
    [currencyFilter, setCurrencyFilter] = useState("Tümü"),
    [agencyFilter, setAgencyFilter] = useState("Tümü"),
    [amountMin, setAmountMin] = useState(""),
    [amountMax, setAmountMax] = useState(""),
    [sortOrder, setSortOrder] = useState("desc"),
    [search, setSearch] = useState(""),
    [datePreset, setDatePreset] = useState("all"),
    [customFrom, setCustomFrom] = useState(MIN_DATE),
    [customTo, setCustomTo] = useState(today()),
    [page, setPage] = useState(1),
    [modal, setModal] = useState(null),
    [reportOpen, setReportOpen] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState([]),
    [toolTab, setToolTab] = useState(""),
    [backups, setBackups] = useState([]),
    [history, setHistory] = useState([]),
    [trash, setTrash] = useState([]),
    [undo, setUndo] = useState(null),
    [installPrompt, setInstallPrompt] = useState(null),
    [recordsCollapsed, setRecordsCollapsed] = useState(() => {
      try {
        return localStorage.getItem("records-collapsed") === "1";
      } catch {
        return false;
      }
    });
  const undoTimer = useRef(null);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [r, s, b, h, e] = await Promise.all([
        loadRecords(),
        loadSettings(),
        loadBackups(),
        loadHistory(50),
        loadEvents(),
      ]);
      setRows(r.filter((x) => x.date >= MIN_DATE).map(normalizeRecord));
      setEvents(e);
      setRates(s.rates);
      setRatesUpdatedAt(s.updatedAt);
      setBackups(b.backups || []);
      setHistory(h.history || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const convertAmount = (amount, from, to) => {
    const value = Number(amount || 0),
      src = normalizeCurrency(from),
      dst = normalizeCurrency(to);
    if (src === dst) return value;
    const tryValue = value * (Number(rates[src]) || 1);
    return dst === "TRY" ? tryValue : tryValue / (Number(rates[dst]) || 1);
  };
  const converted = (r) => convertAmount(r.amount, r.currency, currency);
  const convertedOutstanding = (r) =>
    convertAmount(Math.max(0, r.amount - r.paid_amount), r.currency, currency);
  const keepNativeCurrency = (r) =>
    ["Bahşiş", "Komisyon"].includes(normalizeType(r.type)) &&
    normalizeCurrency(r.currency) !== currency;
  const accountingValue = (r) => converted(r);
  const accountingOutstanding = (r) => convertedOutstanding(r);

  const dateRange = useMemo(() => {
    const now = new Date(),
      to = today();
    if (datePreset === "today") return [to, to];
    if (datePreset === "week") {
      const d = new Date(now),
        offset = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - offset);
      return [localISO(d), to];
    }
    if (datePreset === "month")
      return [`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to];
    if (datePreset === "year") return [`${now.getFullYear()}-01-01`, to];
    if (datePreset === "custom")
      return [customFrom || MIN_DATE, customTo || to];
    return [MIN_DATE, "9999-12-31"];
  }, [datePreset, customFrom, customTo]);
  const accountingRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.date >= MIN_DATE &&
          r.date >= dateRange[0] &&
          r.date <= dateRange[1],
      ),
    [rows, dateRange],
  );
  const filteredRows = useMemo(() => {
    const q = tidy(search);
    const min = amountMin === "" ? null : Number(amountMin);
    const max = amountMax === "" ? null : Number(amountMax);
    return accountingRows
      .filter(
        (r) => {
          const value = Math.abs(accountingValue(r));
          return (
          (typeFilter === "Tümü" || r.type === typeFilter) &&
          (statusFilter === "Tümü" || r.status === statusFilter) &&
          (currencyFilter === "Tümü" || normalizeCurrency(r.currency) === currencyFilter) &&
          (agencyFilter === "Tümü" || (r.agency || "Acentasız") === agencyFilter) &&
          (min === null || value >= min) &&
          (max === null || value <= max) &&
          (!q ||
            [r.tour, r.guest, r.agency, r.ship, r.note, r.tags, r.type, r.status].some(
              (v) => tidy(Array.isArray(v) ? v.join(" ") : v).includes(q),
            ))
          );
        },
      )
      .sort((a, b) =>
        sortOrder === "asc"
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date),
      );
  }, [accountingRows, typeFilter, statusFilter, currencyFilter, agencyFilter, amountMin, amountMax, sortOrder, search, currency, rates]);
  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter, currencyFilter, agencyFilter, amountMin, amountMax, datePreset, customFrom, customTo]);
  const paid = accountingRows.filter((r) => r.status === "Ödendi"),
    tourIncome = paid
      .filter((r) => normalizeType(r.type) === "Tur Geliri")
      .reduce((s, r) => s + accountingValue(r), 0),
    expense = paid.filter(isExpense).reduce((s, r) => s + accountingValue(r), 0),
    pending = accountingRows
      .filter((r) => r.status === "Ödenmedi")
      .reduce((s, r) => s + accountingOutstanding(r), 0),
    realizedFxValue = convertAmount(REALIZED_FX_TRY, "TRY", currency),
    income = tourIncome + realizedFxValue,
    operatingNet = tourIncome - expense,
    net = operatingNet + realizedFxValue,
    tourCount = new Set(accountingRows.filter((r) => r.type === "Tur Geliri").map((r) => r.date)).size,
    average = tourCount ? operatingNet / tourCount : 0;
  const tipTotals = currencyTotals(accountingRows, 'Bahşiş', true);
  const commissionTotals = currencyTotals(accountingRows, 'Komisyon');
  const cashFxTotals = CASH_FX_BALANCES.map((item) => ({ ...item }));
  const cashFxTryBreakdown = CASH_FX_BALANCES.map((item) => {
    const rate = Number(rates?.[item.code]) || 0;
    return { ...item, rate, tryValue: item.amount * rate };
  });
  const cashFxTryValue = cashFxTryBreakdown.reduce(
    (sum, item) => sum + item.tryValue,
    0,
  );
  const topTour = useMemo(() => {
    const m = {};
    paid
      .filter((r) => normalizeType(r.type) === "Tur Geliri")
      .forEach((r) => (m[r.tour] = (m[r.tour] || 0) + accountingValue(r)));
    return Object.entries(m).sort((a, b) => b[1] - a[1])[0] || ["—", 0];
  }, [paid, currency, rates]);
  const topCommission = useMemo(() => {
    const m = {};
    paid
      .filter((r) => r.type === "Komisyon")
      .forEach((r) => {
        const k = r.agency || r.guest || r.ship || "Diğer";
        m[k] = (m[k] || 0) + accountingValue(r);
      });
    return Object.entries(m).sort((a, b) => b[1] - a[1])[0] || ["—", 0];
  }, [paid, currency, rates]);
  const monthDelta = useMemo(() => {
    const now = new Date(),
      current = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
      prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1),
      prev = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;
    const calc = (m) =>
      rows
        .filter((r) => r.date.startsWith(m) && r.status === "Ödendi")
        .reduce((s, r) => {
          const type = normalizeType(r.type);
          if (type === "Tur Masrafı") return s - accountingValue(r);
          if (type === "Tur Geliri") return s + accountingValue(r);
          return s;
        }, 0);
    const a = calc(current),
      b = calc(prev);
    return b === 0 ? (a ? 100 : 0) : ((a - b) / Math.abs(b)) * 100;
  }, [rows, currency, rates]);
  const receivables = useMemo(
    () =>
      rows
        .filter((r) => r.status === "Ödenmedi")
        .sort((a, b) => convertedOutstanding(b) - convertedOutstanding(a)),
    [rows, currency, rates],
  );
  const cashForecast = useMemo(() => {
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const endKey = localISO(end);
    const expectedIn = rows.filter((r) => isIncome(r) && r.status === "Ödenmedi" && (r.due_date || r.date) <= endKey).reduce((s, r) => s + accountingOutstanding(r), 0);
    const expectedOut = rows.filter((r) => isExpense(r) && r.status === "Ödenmedi" && (r.due_date || r.date) <= endKey).reduce((s, r) => s + accountingOutstanding(r), 0);
    return { expectedIn, expectedOut, net: expectedIn - expectedOut };
  }, [rows, currency, rates]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  useEffect(
    () => setPage(1),
    [
      typeFilter,
      statusFilter,
      sortOrder,
      search,
      datePreset,
      customFrom,
      customTo,
    ],
  );
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    ids = filteredRows.map((r) => r.id),
    all = ids.length > 0 && ids.every((id) => selected.includes(id));
  const agencyOptions = useMemo(() => topValues(rows, "agency", 8), [rows]);
  const quickDefaults = useMemo(() => ({
    agency: agencyOptions[0] || "",
    type: topValues(rows, "type", 1)[0] || "Tur Geliri",
    currency: topValues(rows, "currency", 1)[0] || currency,
  }), [rows, agencyOptions, currency]);
  const reloadSide = async (tab) => {
    setToolTab(tab);
    try {
      if (tab === "trash")
        setTrash((await loadRecords(true)).map(normalizeRecord));
      if (tab === "backups") setBackups((await loadBackups()).backups || []);
      if (tab === "history") setHistory((await loadHistory(100)).history || []);
    } catch (e) {
      setError(e.message);
    }
  };
  const persist = async (r) => {
    const record = normalizeRecord(r);
    try {
      const saved =
        record.id && rows.some((x) => x.id === record.id)
          ? await updateRecord(record)
          : await createRecord(record);
      setRows((x) => [
        normalizeRecord(saved),
        ...x.filter((a) => a.id !== record.id && a.id !== saved.id),
      ]);
      setModal(null);
      setHistory((await loadHistory(50)).history || []);
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };
  const persistEvent = async (event) => {
    try {
      const saved = event.id
        ? await updateEvent(event)
        : await createEvent(event);
      setEvents((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      setHistory((await loadHistory(50)).history || []);
      return saved;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };
  const removeEvent = async (id) => {
    try {
      await deleteEvent(id);
      setEvents((current) => current.filter((event) => event.id !== id));
      setHistory((await loadHistory(50)).history || []);
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };
  const convertEventToRecord = async (event) => {
    if (event.linked_record_id) return null;
    const record = normalizeRecord({
      id: uid(), date: event.date, due_date: event.date,
      tour: event.title, guest: "", agency: event.company || "", ship: "",
      type: event.category === "Gider" ? "Tur Masrafı" : event.category === "Tahsilat" ? "Komisyon" : "Tur Geliri",
      amount: Number(event.amount), currency: event.currency || "TRY",
      status: "Ödenmedi", paid_amount: 0, tags: `Takvim, ${event.category}`,
      source_event_id: event.id, note: event.note || "Takvimden oluşturuldu",
    });
    const saved = await createRecord(record);
    const updatedEvent = await updateEvent({ ...event, status: "Tamamlandı", linked_record_id: saved.id });
    setRows((current) => [normalizeRecord(saved), ...current]);
    setEvents((current) => current.map((item) => item.id === updatedEvent.id ? updatedEvent : item));
    return saved;
  };
  const setRecordStatus = async (r, next) => {
    const old = r;
    setRows((x) => x.map((a) => (a.id === r.id ? { ...a, status: next, paid_amount: next === "Ödendi" ? a.amount : 0 } : a)));
    try {
      await updateRecordStatus(r.id, next);
      setHistory((await loadHistory(50)).history || []);
    } catch (e) {
      setRows((x) => x.map((a) => (a.id === r.id ? old : a)));
      setError(e.message);
    }
  };
  const status = async (r) => {
    const next = r.status === "Ödendi" ? "Ödenmedi" : "Ödendi";
    await setRecordStatus(r, next);
  };
  const armUndo = (deletedRows) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ rows: deletedRows, seconds: 10 });
    undoTimer.current = setTimeout(() => setUndo(null), 10000);
  };
  useEffect(() => {
    if (!undo) return;
    const i = setInterval(
      () =>
        setUndo((u) => (u ? { ...u, seconds: Math.max(0, u.seconds - 1) } : u)),
      1000,
    );
    return () => clearInterval(i);
  }, [Boolean(undo)]);
  const remove = async (r) => {
    if (!window.confirm("Kayıt çöp kutusuna taşınsın mı?")) return;
    setRows((x) => x.filter((a) => a.id !== r.id));
    try {
      await deleteRecord(r.id);
      armUndo([r]);
    } catch (e) {
      setRows((x) => [r, ...x]);
      setError(e.message);
    }
  };
  const removeSelected = async () => {
    if (
      !selected.length ||
      !window.confirm(`${selected.length} kayıt çöp kutusuna taşınsın mı?`)
    )
      return;
    const gone = rows.filter((r) => selected.includes(r.id));
    setRows((x) => x.filter((a) => !selected.includes(a.id)));
    setSelected([]);
    try {
      await deleteRecords(gone.map((r) => r.id));
      armUndo(gone);
    } catch (e) {
      setRows((x) => [...gone, ...x]);
      setError(e.message);
    }
  };
  const undoDelete = async () => {
    if (!undo) return;
    const copy = undo.rows;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(null);
    try {
      for (const r of copy) await restoreRecord(r.id);
      setRows((x) => [...copy, ...x]);
    } catch (e) {
      setError(e.message);
      refresh();
    }
  };
  const restoreTrashItem = async (r) => {
    await restoreRecord(r.id);
    setTrash((x) => x.filter((a) => a.id !== r.id));
    setRows((x) => [r, ...x]);
    setHistory((await loadHistory(50)).history || []);
  };
  const purgeTrashItem = async (r) => {
    if (
      !window.confirm(
        "Bu kayıt kalıcı olarak silinsin mi? Bu işlem geri alınamaz.",
      )
    )
      return;
    await permanentDeleteRecord(r.id);
    setTrash((x) => x.filter((a) => a.id !== r.id));
  };
  const saveRateSettings = async () => {
    try {
      const s = await saveRates(rates);
      setRates(s.rates);
      setRatesUpdatedAt(s.updatedAt);
      setToolTab("");
    } catch (e) {
      setError(e.message);
    }
  };
  const doBackup = async () => {
    await createBackup(
      `Manuel yedek — ${fmtDateTime(new Date().toISOString())}`,
    );
    setBackups((await loadBackups()).backups || []);
  };
  const doRestoreBackup = async (b) => {
    if (
      !window.confirm(
        `${b.title} geri yüklensin mi? Mevcut durum önce otomatik yedeklenecek.`,
      )
    )
      return;
    await restoreBackup(b.id);
    await refresh();
    setToolTab("");
  };
  const doExportBackup = async (b) => {
    const data = await exportBackup(b.id),
      blob = new Blob([JSON.stringify(data.backup, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `Muhasebe-Yedek-${b.created_at.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const excel = ({ rows: reportRows = rows, month: reportMonth = today().slice(0, 7) } = {}) => {
    const columns = [
      ["Tarih", "date"],
      ["Tur", "tour"],
      ["Misafir / Kaynak", "guest"],
      ["Acenta", "agency"],
      ["Gemi / Kaynak", "ship"],
      ["Tür", "type"],
      ["Tutar", "amount"],
      ["Para Birimi", "currency"],
      ["Durum", "status"],
      ["Not", "note"],
    ];
    const safe = (value) => {
      const raw = String(value ?? "");
      const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
      return `"${guarded.replaceAll('"', '""')}"`;
    };
    const csv =
      "\uFEFF" +
      [
        columns.map(([label]) => safe(label)).join(";"),
        ...reportRows.map((row) =>
          columns
            .map(([, key]) =>
              safe(key === "amount" ? Number(row[key] || 0) : row[key]),
            )
            .join(";"),
        ),
      ].join("\r\n");
    const bytes = new TextEncoder().encode(csv);
    if (window.AndroidAuth?.shareFileBase64) {
      let binary = "";
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      window.AndroidAuth.shareFileBase64(`Muhasebe-${reportMonth}.csv`, "application/vnd.ms-excel", btoa(binary));
      return;
    }
    if (navigator.share) {
      const file = new File([bytes], `Muhasebe-${reportMonth}.csv`, { type: "application/vnd.ms-excel" });
      navigator.share({ title: "Muhasebe raporu", files: [file] }).catch(() => {});
      return;
    }
    const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = `Muhasebe-${reportMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };
  const signOut = async () => {
    await logout();
    onSignedOut();
  };
  const sharePdf = ({ text, month: reportMonth } = {}) => {
    if (window.AndroidAuth?.sharePdfText) {
      window.AndroidAuth.sharePdfText(`Muhasebe-${reportMonth || today()}`, text || "Muhasebe raporu");
      return;
    }
    window.print();
  };
  const shareWhatsApp = ({ text } = {}) => {
    const message = text || "Rehberlik Muhasebe raporu";
    if (window.AndroidAuth?.shareText) {
      window.AndroidAuth.shareText(message);
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  const changePinAndKeepSession = async (pin) => {
    await changePin(pin);
    try { window.AndroidAuth?.savePin(pin); } catch {}
  };
  const signOutAll = async () => {
    if (!window.confirm("Tüm cihazlardaki oturumlar kapatılsın mı?")) return;
    await logoutAllSessions();
    try { window.AndroidAuth?.clearPin(); } catch {}
    onSignedOut();
  };
  const pageStart = filteredRows.length ? (page - 1) * PAGE_SIZE + 1 : 0,
    pageEnd = Math.min(page * PAGE_SIZE, filteredRows.length);

  return (
    <>
      <header className="v7-header home-v7-header">
        <div className="brand home-brand">
          <div className="brand-mark brand-logo-mark">
            <img className="brand-logo-image" src="/ek-logo-clean.png" alt="EK" />
          </div>
          <div className="header-tool-grid"><ThemeSwitcher />
          <div className="system-shortcuts" aria-label="Sistem araçları">
            <button
              className="system-shortcut-card"
              onClick={() => reloadSide("backups")}
              title="Yedekler"
            >
              <Icon name="backup" />
              <span>Yedekler</span>
            </button>
            <button
              className="system-shortcut-card"
              onClick={() => reloadSide("history")}
              title="İşlem geçmişi"
            >
              <Icon name="history" />
              <span>İşlem geçmişi</span>
            </button>
            <button
              className="system-shortcut-card"
              onClick={() => reloadSide("trash")}
              title="Çöp kutusu"
            >
              <Icon name="box" />
              <span>Çöp kutusu</span>
            </button>
            <button
              className="system-shortcut-card"
              onClick={() => reloadSide("security")}
              title="Güvenlik"
            >
              <Icon name="settings" />
              <span>Güvenlik</span>
            </button>
          </div></div>
        </div>
        <div className="header-actions home-header-actions">
          {installPrompt && (
            <button className="btn secondary desktop" onClick={install}>
              Uygulamayı kur
            </button>
          )}

          <button
            className="btn secondary"
            onClick={() => setReportOpen(true)}
          >
            <Icon name="report" />
            Aylık rapor
          </button>
          <button
            className="icon-btn header-tool"
            onClick={signOut}
            title="Çıkış"
            aria-label="Çıkış yap"
          >
            <Icon name="logout" />
          </button>
        </div>
      </header>
      <MarketTicker />
      <main className={`main-dashboard v7-dashboard${loading ? " is-loading" : ""}`} aria-busy={loading}>
        {error && (
          <p className="system-error" onClick={() => setError("")}>
            {error}
          </p>
        )}
        <SystemPanel
          tab={toolTab}
          onClose={() => setToolTab("")}
          rates={rates}
          setRates={setRates}
          ratesUpdatedAt={ratesUpdatedAt}
          onSaveRates={saveRateSettings}
          backups={backups}
          onCreateBackup={doBackup}
          onRestoreBackup={doRestoreBackup}
          onExportBackup={doExportBackup}
          onDeleteBackup={async (backup) => {
            if (!window.confirm("Bu yedek kalıcı olarak silinsin mi?")) return;
            await deleteBackup(backup.id);
            setBackups((items) => items.filter((item) => item.id !== backup.id));
          }}
          onDeleteAllBackups={async () => {
            if (!window.confirm("Tüm yedekler kalıcı olarak silinsin mi? Bu işlem geri alınamaz.")) return;
            await deleteAllBackups();
            setBackups([]);
          }}
          history={history}
          onDeleteHistory={async (entry) => {
            if (!window.confirm("Bu işlem geçmişten kalıcı olarak silinsin mi?")) return;
            await deleteHistory(entry.id);
            setHistory((items) => items.filter((item) => item.id !== entry.id));
          }}
          onDeleteAllHistory={async () => {
            if (!window.confirm("Tüm işlem geçmişi kalıcı olarak silinsin mi? Bu işlem geri alınamaz.")) return;
            await deleteAllHistory();
            setHistory([]);
          }}
          trash={trash}
          onRestoreTrash={restoreTrashItem}
          onPurgeTrash={purgeTrashItem}
          onPurgeAllTrash={async () => {
            if (!window.confirm("Çöp kutusundaki tüm kayıtlar kalıcı olarak silinsin mi? Bu işlem geri alınamaz.")) return;
            await permanentDeleteAllTrash();
            setTrash([]);
          }}
          onChangePin={changePinAndKeepSession}
          onLogoutAll={signOutAll}
        />
        <section className="v7-filterbar">
          <div className="searchbox">
            <Icon name="search" size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tur, misafir, acenta, gemi veya not ara..."
            />
          </div>
          <div className="date-presets">
            {[
              ["all", "Tümü"],
              ["today", "Bugün"],
              ["week", "Bu hafta"],
              ["month", "Bu ay"],
              ["year", "Bu yıl"],
              ["custom", "Özel"],
            ].map(([k, l]) => (
              <button
                key={k}
                className={datePreset === k ? "active" : ""}
                onClick={() => setDatePreset(k)}
              >
                {l}
              </button>
            ))}
          </div>
          {datePreset === "custom" && (
            <div className="custom-range">
              <input
                type="date"
                min={MIN_DATE}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span>→</span>
              <input
                type="date"
                min={MIN_DATE}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          )}
        </section>
        <div className="v7-layout unified-accounting-layout">
          <div className="v7-left">
        <div className="accounting-overview-row">
          <div className="accounting-primary-summary">
        <div className="kpis compact v7-kpis">
          <article className="currency-totals-kpi filter-card" onClick={() => { setTypeFilter("Komisyon"); setStatusFilter("Tümü"); }}>
            <span>Komisyon</span>
            <CurrencyDonuts totals={commissionTotals} money={money} fast />
            <small>Hak edilen toplam · tüm durumlar</small>
          </article>
          <article className="net filter-card" onClick={() => { setTypeFilter("Tümü"); setStatusFilter("Tümü"); }}>
            <span>Net gelir</span>
            <strong>
              <AnimatedMoney value={loading ? 0 : net} currency={currency} />
            </strong>
            <small className="average-under-net">Tur başı ortalama · <AnimatedMoney value={loading ? 0 : average} currency={currency} /></small>
            <small>Gerçekleşmiş döviz dahil · +{money(REALIZED_FX_TRY, "TRY")}</small>
          </article>
          <article className="pending filter-card" onClick={() => { setTypeFilter("Tümü"); setStatusFilter("Ödenmedi"); }}>
            <span>Alacak</span>
            <strong>
              <AnimatedMoney value={loading ? 0 : pending} currency={currency} />
            </strong>
          </article>
          <article className="currency-totals-kpi filter-card" onClick={() => { setTypeFilter("Bahşiş"); setStatusFilter("Tümü"); }}>
            <span>Bahşiş</span>
            <CurrencyDonuts totals={tipTotals} money={money} fast />
            <small>Alınan toplam · tahsil edilen</small>
          </article>
          <article className="currency-totals-kpi cash-fx-kpi">
            <span>Kasa Döviz</span>
            <div className="cash-fx-try-summary">
              <small>Güncel TL karşılığı</small>
              <strong>{money(cashFxTryValue, "TRY")}</strong>
            </div>
            <CurrencyDonuts totals={cashFxTotals} money={money} fast />
            <div className="cash-fx-rate-breakdown">
              {cashFxTryBreakdown.map((item) => (
                <small key={`cash-try-${item.code}`}>
                  {item.code}: {money(item.tryValue, "TRY")} · kur {item.rate.toFixed(2)}
                </small>
              ))}
            </div>
            <small className="cash-fx-net-note">Net gelire dahil değil</small>
          </article>
<DailyGreeting rows={accountingRows} currency={currency} convert={accountingValue}/>
        </div>
        <div className="v7-insights">
          <article>
            <span>En çok kazandıran tur</span>
            <strong>{topTour[0]}</strong>
            <small>{money(topTour[1], currency)}</small>
          </article>
          <article>
            <span>En yüksek komisyon kaynağı</span>
            <strong>{topCommission[0]}</strong>
            <small>{money(topCommission[1], currency)}</small>
          </article>
          <article>
            <span>Geçen aya göre net</span>
            <strong>
              {monthDelta >= 0 ? "+" : ""}
              {monthDelta.toFixed(1)}%
            </strong>
            <small>Mevcut ay karşılaştırması</small>
          </article>
          <article className="rates-insight">
            <span>Kur güncellemesi</span>
            <button
              className="insight-corner-button"
              onClick={() => reloadSide("rates")}
              title="Kur ayarları"
              aria-label="Kur ayarlarını aç"
            >
              <Icon name="settings" size={16} />
            </button>
            <strong>
              USD {Number(rates.USD).toFixed(2)} · EUR{" "}
              {Number(rates.EUR).toFixed(2)}
            </strong>
            <small>{fmtDateTime(ratesUpdatedAt)}</small>
          </article>
        </div>
          </div>
        </div>
            <section className="records workspace-records">
              <div className="records-head">
                <div>
                  
                  <div className="records-title-line">
                    <h2>GİRDİLER</h2>
                    <button
                      className={`records-collapse${recordsCollapsed ? " is-collapsed" : ""}`}
                      onClick={() => setRecordsCollapsed((collapsed) => {
                        const next = !collapsed;
                        try { localStorage.setItem("records-collapsed", next ? "1" : "0"); } catch {}
                        return next;
                      })}
                      aria-expanded={!recordsCollapsed}
                      aria-label={recordsCollapsed ? "Muhasebe kayıtlarını aç" : "Muhasebe kayıtlarını küçült"}
                      title={recordsCollapsed ? "Kayıtları aç" : "Kayıtları küçült"}
                    >
                      <Icon name="chevron" size={18} />
                    </button>
                  </div>
                  {recordsCollapsed && <small className="records-collapsed-summary">{filteredRows.length} kayıt · Açmak için oka tıkla</small>}
                </div>
                {!recordsCollapsed && <div className="records-tools">
                  <div className="filter">
                    <Icon name="filter" size={16} />
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option>Tümü</option>
                      {TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="Tümü">Tümü</option>
                      <option>Ödendi</option>
                      <option>Ödenmedi</option>
                      <option>İade edildi</option>
                    </select>
                  </div>
                  <div className="filter records-sort">
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                    >
                      <option value="desc">En yeni → En eski</option>
                      <option value="asc">En eski → En yeni</option>
                    </select>
                  </div>
                  <button
                    className="btn secondary"
                    onClick={() => setSelected(all ? [] : ids)}
                    aria-label={all ? "Seçimi kaldır" : "Tümünü seç"}
                    title={all ? "Seçimi kaldır" : "Tümünü seç"}
                  >
                    {all ? "Seçimi kaldır" : "Tümünü seç"}
                  </button>
                  <button
                    className="btn secondary"
                    onClick={removeSelected}
                    aria-label="Seçilenleri sil"
                    title="Seçilenleri sil"
                    disabled={!selected.length}
                  >
                    <Icon name="trash" />
                    Sil
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => setModal({ currency })}
                    aria-label="Yeni kayıt"
                    title="Yeni kayıt"
                  >
                    <Icon name="plus" />
                    Yeni kayıt
                  </button>
                </div>}
              </div>
              {!recordsCollapsed && <>
              <div className="table-scroll">
                <table className="records-table" role="table" aria-label="Muhasebe kayıtları">
                  <thead>
                    <tr>
                      <th />
                      <th>Tarih {selected.length > 0 && <span className="selection-count" role="status">{selected.length} seçildi</span>}</th>
                      <th>Tur / Kaynak</th>
                      <th>Tür</th>
                      <th>Durum</th>
                      <th className="right">Tutar</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id} className={r.due_date && r.due_date < today() && r.status === "Ödenmedi" ? "record-overdue" : ""}>
                        <td className="record-select">
                          <input
                            type="checkbox"
                            aria-label={`${r.agency || r.tour || 'Muhasebe'} kaydını seç`}
                            checked={selected.includes(r.id)}
                            onChange={() =>
                              setSelected((x) =>
                                x.includes(r.id)
                                  ? x.filter((i) => i !== r.id)
                                  : [...x, r.id],
                              )
                            }
                          />
                        </td>
                        <td className="record-date" data-label="Tarih">{fmtDate(r.date)}</td>
                        <td className="record-source" data-label="Tur / Kaynak">
                          <strong>{r.agency || r.tour || r.guest || r.ship || "Kayıt"}</strong>
                          <span>
                            {r.note || [r.guest, r.ship].filter(Boolean).join(" · ") || "—"}
                          </span>
                          {(r.due_date || r.tags) && <small>{[r.due_date && `Vade: ${fmtDate(r.due_date)}`, r.tags].filter(Boolean).join(" · ")}</small>}
                        </td>
                        <td className="record-type" data-label="Tür">
                          <span
                            className={"type type-" + TYPES.indexOf(r.type)}
                          >
                            {r.type}
                          </span>
                        </td>
                        <td className="record-status" data-label="Durum">
                          <button className={"status " + (r.status === "Ödendi" ? "done" : r.status === "İade edildi" ? "refunded" : "open")} onClick={() => status(r)}>
                            {r.paid_amount > 0 && r.paid_amount < r.amount ? "Kısmi" : r.status}
                          </button>
                          {r.paid_amount > 0 && r.paid_amount < r.amount && <small>{money(r.paid_amount, r.currency)} tahsil</small>}
                        </td>
                        <td className="right amount record-amount" data-label="Tutar">
                          <strong>{keepNativeCurrency(r) ? money(r.amount, r.currency) : money(converted(r), currency)}</strong>
                          {r.status === "Ödenmedi" && <small>Kalan: {keepNativeCurrency(r) ? money(Math.max(0, r.amount - r.paid_amount), r.currency) : money(convertedOutstanding(r), currency)}</small>}
                          {r.currency !== currency && !keepNativeCurrency(r) && (
                            <small>{money(r.amount, r.currency)}</small>
                          )}
                        </td>
                        <td className="row-actions" data-label="İşlemler">
                          <button className="quick-paid" onClick={() => setRecordStatus(r, "Ödendi")} aria-label="Ödendi yap" title="Ödendi yap" disabled={r.status === "Ödendi"}>
                            <Icon name="check" />
                            <span>Ödendi</span>
                          </button>
                          <button className="quick-refund" onClick={() => setRecordStatus(r, "İade edildi")} aria-label="İade edildi yap" title="İade edildi yap" disabled={r.status === "İade edildi"}>
                            <Icon name="history" />
                            <span>İade</span>
                          </button>
                          <button
                            className="edit"
                            onClick={() => setModal(r)}
                            aria-label="Düzenle"
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            className="delete"
                            onClick={() => remove(r)}
                            aria-label="Sil"
                          >
                            <Icon name="trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {loading && (
                      <tr>
                        <td colSpan="7" className="empty">
                          Kayıtlar yükleniyor...
                        </td>
                      </tr>
                    )}
                    {!loading && !filteredRows.length && (
                      <tr>
                        <td colSpan="7" className="empty">
                          Bu filtrede kayıt yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {!loading && filteredRows.length > 0 && (
                <div className="records-pagination">
                  <span>
                    {pageStart}-{pageEnd} / {filteredRows.length} kayıt
                  </span>
                  <div className="page-buttons">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      ‹
                    </button>
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map(
                      (n) => (
                        <button
                          key={n}
                          className={n === page ? "active" : ""}
                          onClick={() => setPage(n)}
                        >
                          {n}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      disabled={page === pageCount}
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}
              </>}
            </section>
            <AnalyticsChart
              rows={accountingRows}
              currency={currency}
              convert={accountingValue}
            />
          </div>
          <aside className="v7-right">
            <div className="compact-finance-side entries-side-cards">
              <CompactReceivables rows={rows} currency={currency} convertOutstanding={accountingOutstanding} keepNativeCurrency={keepNativeCurrency} onPaid={r=>setRecordStatus(r,'Ödendi')}/>
              <UpcomingEvents events={events} onOpenCalendar={() => navigateTo("/takvim/")} />
            </div>
            <section className="receivables-panel legacy-receivables-panel">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">ALACAKLAR</span>
                  <h2>
                    {money(
                      rows
                        .filter((r) => r.status === "Ödenmedi")
                        .reduce((s, r) => s + accountingOutstanding(r), 0),
                      currency,
                    )}
                  </h2>
                </div>
                <span>
                  {
                    rows.filter((r) => r.status === "Ödenmedi")
                      .length
                  }{" "}
                  kayıt
                </span>
              </div>
              <div className="receivable-list">
                {receivables.map((r) => (
                  <article key={r.id}>
                    <div>
                      <strong>{[r.agency, r.note].filter(Boolean).join(" · ") || r.tour || "Kayıt"}</strong>
                      <span>{r.type} · {fmtDate(r.date)}</span>
                    </div>
                    <div>
                      <strong>{keepNativeCurrency(r) ? money(Math.max(0, r.amount - r.paid_amount), r.currency) : money(convertedOutstanding(r), currency)}</strong>
                      <button onClick={() => status(r)}>Ödendi yap</button>
                    </div>
                  </article>
                ))}
                {!receivables.length && (
                  <p className="empty-mini">Bekleyen alacak yok.</p>
                )}
              </div>
            </section>
            <CalendarView
              rows={[]}
              events={events}
              onCreateEvent={persistEvent}
              onUpdateEvent={persistEvent}
              onDeleteEvent={removeEvent}
            />
          </aside>
        </div>
        <details className="detailed-analysis">
          <summary><span><b>Detaylı Analiz</b><small>Aylık özet, V8 göstergeleri ve ayrıntılı finans görünümü</small></span><i>⌄</i></summary>
          <div className="detailed-analysis-content">
            <MonthlySummary rows={accountingRows} currency={currency} convert={accountingValue} />
            <V8Enhancements rows={accountingRows} income={income} expense={expense} pending={pending} currency={currency} tourCount={tourCount} net={net} convert={accountingValue} />
            <VisualExperience rows={accountingRows} income={income} expense={expense} pending={pending} tourCount={tourCount} currency={currency} convert={accountingValue}/>
          </div>
        </details>
      </main>
      {modal && (
        <EntryModal
          record={modal?.id ? modal : null}
          currency={modal.currency || currency}
          onClose={() => setModal(null)}
          onSave={persist}
          quickDefaults={quickDefaults}
          agencyOptions={agencyOptions}
        />
      )}{" "}
      {reportOpen && (
        <ReportModal
          rows={rows}
          currency={currency}
          convert={accountingValue}
          onExcel={excel}
          onPdf={sharePdf}
          onWhatsApp={shareWhatsApp}
          onClose={() => setReportOpen(false)}
        />
      )}{" "}
      {undo && (
        <div className="undo-toast strong-undo">
          <span><b>{undo.rows.length} kayıt silindi.</b> Yanlışlık olduysa geri alabilirsin.</span>
          <button onClick={undoDelete}>GERİ AL</button>
          <b>{undo.seconds}</b>
        </div>
      )}
    </>
  );
}

export default function App() {
  const [state, setState] = useState({
    loading: true,
    configured: false,
    authenticated: false,
    error: "",
  });
  const loadAuth = () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    getAuthStateWithRetry()
      .then((s) => setState({ loading: false, ...s, error: "" }))
      .catch((error) =>
        setState((s) => ({ ...s, loading: false, error: error.message || "Sunucuya bağlanılamadı." })),
      );
  };
  useEffect(() => {
    loadAuth();
  }, []);
  if (state.loading)
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h2>Yükleniyor...</h2>
        </div>
      </div>
    );
  if (state.error)
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h2>Sunucu bağlantısı bekleniyor</h2>
          <p>{state.error}</p>
          <button className="btn primary auth-submit" onClick={loadAuth}>Tekrar dene</button>
        </div>
      </div>
    );
  if (!state.authenticated)
    return (
      <AuthScreen
        configured={state.configured}
        onDone={() =>
          setState((s) => ({ ...s, configured: true, authenticated: true }))
        }
      />
    );
  return (
    <Dashboard
      onSignedOut={() => setState((s) => ({ ...s, authenticated: false }))}
    />
  );
}
