import React, { useEffect, useMemo, useState } from "react";
import App from "./App.jsx";
import AssetsNav from "./AssetsNav.jsx";
import AssetsHeaderBridge from "./AssetsHeaderBridge.jsx";
import CalendarView from "./CalendarView.jsx";
import HomePage from "./HomePage.jsx";
import ExpensesPage from "./ExpensesPage.jsx";
import CategoryNavBridge from "./CategoryNavBridge.jsx";
import {
  createEvent,
  deleteEvent,
  getAuthState,
  loadEvents,
  loadRecords,
  login,
  setupPin,
  updateEvent,
} from "./api.js";
import { SITE_NAV_EVENT } from "./navigation.js";
import "./styles/pages.css";

const cleanPath = (value) => {
  let p = (value || "/").replace(/\/+$/, "") || "/";
  if (p.endsWith(".html")) p = p.slice(0, -5) || "/";
  return p;
};

function CalendarAuth({ configured, onDone }) {
  const [pin, setPin] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
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
      onDone();
    } catch (err) {
      setError(err.message || "Giriş yapılamadı.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">TAKVİM</span>
        <h1>{configured ? "Giriş" : "İlk güvenlik kurulumu"}</h1>
        <p>
          {configured
            ? "Takvim kayıtlarını görmek için PIN gir."
            : "4-8 rakamlı PIN oluştur."}
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
      </form>
    </div>
  );
}

function TakvimPage() {
  const [state, setState] = useState({
    loading: true,
    configured: false,
    authenticated: false,
  });
  const [rows, setRows] = useState([]),
    [events, setEvents] = useState([]),
    [error, setError] = useState("");
  const load = async () => {
    setError("");
    try {
      const [records, plans] = await Promise.all([loadRecords(), loadEvents()]);
      setRows(records);
      setEvents(plans);
    } catch (err) {
      setError(err.message || "Takvim kayıtları yüklenemedi.");
    }
  };
  useEffect(() => {
    getAuthState()
      .then((s) => setState({ loading: false, ...s }))
      .catch(() =>
        setState({ loading: false, configured: false, authenticated: false }),
      );
  }, []);
  useEffect(() => {
    if (state.authenticated) load();
  }, [state.authenticated]);
  const persistEvent = async (event) => {
    try {
      const saved = event.id
        ? await updateEvent(event)
        : await createEvent(event);
      setEvents((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      return saved;
    } catch (err) {
      setError(err.message || "Etkinlik kaydedilemedi.");
      throw err;
    }
  };
  const removeEvent = async (id) => {
    try {
      await deleteEvent(id);
      setEvents((current) => current.filter((event) => event.id !== id));
    } catch (err) {
      setError(err.message || "Etkinlik silinemedi.");
      throw err;
    }
  };
  if (!state.loading && !state.authenticated)
    return (
      <CalendarAuth
        configured={state.configured}
        onDone={() =>
          setState((s) => ({ ...s, configured: true, authenticated: true }))
        }
      />
    );
  return (
    <HomePage contentClassName="standalone-calendar-page">
      {state.authenticated && (
        <>
          {error && <p className="system-error">{error}</p>}
          <CalendarView
            rows={rows}
            events={events}
            onCreateEvent={persistEvent}
            onUpdateEvent={persistEvent}
            onDeleteEvent={removeEvent}
          />
        </>
      )}
    </HomePage>
  );
}

function VarliklarPage() {
  return (
    <>
      <App />
      <AssetsNav />
      <AssetsHeaderBridge />
    </>
  );
}

function MuhasebePage() {
  return (
    <>
      <App />
    </>
  );
}
function RedirectHome() {
  useEffect(() => {
    window.history.replaceState({}, "", "/anasayfa/");
    window.dispatchEvent(new Event(SITE_NAV_EVENT));
  }, []);
  return null;
}

export default function SiteRouter() {
  const [path, setPath] = useState(() => cleanPath(window.location.pathname));
  useEffect(() => {
    getAuthState().catch(() => {});
    const sync = () => setPath(cleanPath(window.location.pathname));
    window.addEventListener("popstate", sync);
    window.addEventListener(SITE_NAV_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(SITE_NAV_EVENT, sync);
    };
  }, []);
  const page = useMemo(() => {
    if (path === "/anasayfa") return <HomePage />;
    if (path === "/muhasebe") return <MuhasebePage />;
    if (path === "/varliklar") return <VarliklarPage />;
    if (path === "/takvim") return <TakvimPage />;
    if (path === "/harcamalar") return <ExpensesPage />;
    return <RedirectHome />;
  }, [path]);
  return (
    <>
      {page}
      <CategoryNavBridge />
    </>
  );
}
