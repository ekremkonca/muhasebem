import React, { useEffect, useMemo, useRef, useState } from "react";
import { SITE_NAV_EVENT } from "./navigation.js";

const STORAGE_KEY = "muhasebe-tradingview-symbols-v1";
const MODE_EVENT = "muhasebe:mode-change";
const DEFAULT_SYMBOLS = ["FX_IDC:USDTRY", "FX_IDC:EURTRY", "FX_IDC:GBPTRY", "BIST:XAUTRY1!", "BINANCE:BTCUSDT", "BINANCE:ETHUSDT"];
const normalize = (value) => String(value || "").trim().toUpperCase().replace(/\s+/g, "");
const validSymbol = (value) => /^[A-Z0-9_.-]+:[A-Z0-9_.!/-]+$/.test(value);

const loadSymbols = () => { try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); return Array.isArray(stored) && stored.some(validSymbol) ? [...new Set(stored.map(normalize).filter(validSymbol))].slice(0, 20) : DEFAULT_SYMBOLS; } catch { return DEFAULT_SYMBOLS; } };

export default function MarketTicker() {
  const [symbols, setSymbols] = useState(loadSymbols);
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(""), [error, setError] = useState(""), [widgetError, setWidgetError] = useState("");
  const [mode, setMode] = useState(() => document.documentElement.dataset.mode === "dark" ? "dark" : "light"), [retry, setRetry] = useState(0);
  const widgetRef = useRef(null);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols)); } catch {} }, [symbols]);
  useEffect(() => {
    let frame = 0;
    const place = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { const ticker = document.querySelector(".market-ticker-host"), header = document.querySelector(".v7-header"); if (ticker && header && ticker.previousElementSibling !== header) header.insertAdjacentElement("afterend", ticker); }); };
    place(); window.addEventListener(SITE_NAV_EVENT, place); window.addEventListener("popstate", place);
    return () => { cancelAnimationFrame(frame); window.removeEventListener(SITE_NAV_EVENT, place); window.removeEventListener("popstate", place); };
  }, []);
  useEffect(() => { const sync = (event) => setMode(event.detail === "dark" ? "dark" : "light"); window.addEventListener(MODE_EVENT, sync); return () => window.removeEventListener(MODE_EVENT, sync); }, []);
  const symbolString = useMemo(() => symbols.join(","), [symbols]);
  useEffect(() => {
    const host = widgetRef.current;
    if (!host) return;
    let active = true;
    host.replaceChildren(); setWidgetError("");
    const mount = document.createElement("div"); mount.className = "tradingview-widget-container__widget"; host.appendChild(mount);
    const observer = new MutationObserver(() => { if (host.querySelector("iframe")) { setWidgetError(""); observer.disconnect(); } });
    observer.observe(host, { childList: true, subtree: true });
    const script = document.createElement("script"); script.async = true; script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.textContent = JSON.stringify({ symbols: symbols.map((symbol) => ({ proName: symbol, title: symbol.split(":").at(-1) })), showSymbolLogo: true, isTransparent: false, displayMode: "regular", colorTheme: mode, locale: "tr" });
    script.onerror = () => active && setWidgetError("TradingView bağlantısı kurulamadı."); host.appendChild(script);
    const timer = setTimeout(() => { if (active && !host.querySelector("iframe")) setWidgetError("TradingView verileri yüklenemedi."); }, 12000);
    return () => { active = false; clearTimeout(timer); observer.disconnect(); host.replaceChildren(); };
  }, [symbolString, mode, retry]);
  const add = (event) => {
    event.preventDefault(); const value = normalize(draft);
    if (!validSymbol(value)) { setError("TradingView kodunu BORSA:SEMBOL biçiminde gir."); return; }
    if (symbols.includes(value)) { setError("Bu sembol zaten bantta."); return; }
    if (symbols.length >= 20) { setError("En fazla 20 sembol eklenebilir."); return; }
    setSymbols((current) => [...current, value]); setDraft(""); setError("");
  };
  const remove = (symbol) => { if (symbols.length === 1) { setError("Bantta en az bir piyasa kalmalı."); return; } setSymbols((current) => current.filter((item) => item !== symbol)); setError(""); };
  const reset = () => { setSymbols(DEFAULT_SYMBOLS); setError(""); };
  return <div className="market-ticker-host" aria-label="Canlı piyasa bandı">
    <div className="market-ticker-toolbar"><span><i/> TradingView</span><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>＋ Ekle / Kaldır</button></div>
    <div className="tradingview-ticker-shell"><div ref={widgetRef} className="tradingview-widget-container"><div className="market-ticker-placeholder">Canlı piyasa verileri yükleniyor…</div></div>{widgetError && <button type="button" className="market-widget-error" onClick={() => setRetry((value) => value + 1)}>{widgetError} Tekrar dene</button>}</div>
    {open && <div className="market-ticker-settings"><header><div><strong>Piyasa bandını düzenle</strong><small>TradingView kodu: BORSA:SEMBOL</small></div><button type="button" onClick={() => setOpen(false)} aria-label="Kapat">×</button></header><form onSubmit={add}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Örn. BIST:THYAO veya BINANCE:SOLUSDT" autoFocus/><button type="submit">Ekle</button></form>{error && <p>{error}</p>}<div className="market-symbol-list">{symbols.map((symbol) => <div key={symbol}><span>{symbol}</span><button type="button" onClick={() => remove(symbol)} disabled={symbols.length === 1}>Kaldır</button></div>)}</div><footer><button type="button" onClick={reset}>Varsayılanları yükle</button><a href="https://www.tradingview.com/symbols/" target="_blank" rel="noreferrer">Kod ara ↗</a></footer></div>}
  </div>;
}
