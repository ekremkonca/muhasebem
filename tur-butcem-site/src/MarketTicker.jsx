import React, { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "muhasebe-tradingview-symbols-v1";
const DEFAULT_SYMBOLS = ["FX_IDC:USDTRY", "FX_IDC:EURTRY", "FX_IDC:GBPTRY", "BIST:XAUTRY1!", "BINANCE:BTCUSDT", "BINANCE:ETHUSDT"];
const normalize = (value) => String(value || "").trim().toUpperCase().replace(/\s+/g, "");
const validSymbol = (value) => /^[A-Z0-9_.-]+:[A-Z0-9_.!/-]+$/.test(value);

export default function MarketTicker() {
  const [symbols, setSymbols] = useState(() => { try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); return Array.isArray(stored) && stored.length ? stored : DEFAULT_SYMBOLS; } catch { return DEFAULT_SYMBOLS; } });
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(""), [error, setError] = useState(""), [widgetError, setWidgetError] = useState("");
  const widgetRef = useRef(null);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols)); }, [symbols]);
  useEffect(() => {
    const place = () => { const ticker = document.querySelector(".market-ticker-host"), nav = document.querySelector(".global-category-nav-host"); if (ticker && nav && ticker.previousElementSibling !== nav) nav.insertAdjacentElement("afterend", ticker); };
    place(); const observer = new MutationObserver(place); observer.observe(document.body, { childList: true, subtree: true }); return () => observer.disconnect();
  }, []);
  const symbolString = useMemo(() => symbols.join(","), [symbols]);
  useEffect(() => {
    const host = widgetRef.current;
    if (!host) return;
    host.replaceChildren(); setWidgetError("");
    const mount = document.createElement("div"); mount.className = "tradingview-widget-container__widget"; host.appendChild(mount);
    const script = document.createElement("script"); script.async = true; script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.textContent = JSON.stringify({ symbols: symbols.map((symbol) => ({ proName: symbol, title: symbol.split(":").at(-1) })), showSymbolLogo: true, isTransparent: true, displayMode: "adaptive", colorTheme: document.documentElement.dataset.mode === "dark" ? "dark" : "light", locale: "tr" });
    script.onerror = () => setWidgetError("TradingView bağlantısı kurulamadı."); host.appendChild(script);
    const timer = setTimeout(() => { if (!host.querySelector("iframe")) setWidgetError("TradingView verileri yüklenemedi. Yenilemeyi dene."); }, 10000);
    return () => clearTimeout(timer);
  }, [symbolString]);
  const add = (event) => {
    event.preventDefault(); const value = normalize(draft);
    if (!validSymbol(value)) { setError("TradingView kodunu BORSA:SEMBOL biçiminde gir."); return; }
    if (symbols.includes(value)) { setError("Bu sembol zaten bantta."); return; }
    if (symbols.length >= 20) { setError("En fazla 20 sembol eklenebilir."); return; }
    setSymbols((current) => [...current, value]); setDraft(""); setError("");
  };
  const remove = (symbol) => setSymbols((current) => current.filter((item) => item !== symbol));
  const reset = () => { setSymbols(DEFAULT_SYMBOLS); setError(""); };
  return <div className="market-ticker-host">
    <div className="market-ticker-toolbar"><span><i/> TRADINGVIEW</span><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>＋ Ekle / Kaldır</button></div>
    <div className="tradingview-ticker-shell"><div ref={widgetRef} className="tradingview-widget-container"><div className="market-ticker-placeholder">TradingView piyasa verileri yükleniyor…</div></div>{widgetError && <button type="button" className="market-widget-error" onClick={() => { const current = [...symbols]; setSymbols([]); queueMicrotask(() => setSymbols(current)); }}>{widgetError} Tekrar dene</button>}</div>
    {open && <div className="market-ticker-settings"><header><div><strong>Piyasa bandını düzenle</strong><small>TradingView kodu: BORSA:SEMBOL</small></div><button type="button" onClick={() => setOpen(false)}>×</button></header><form onSubmit={add}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Örn. BIST:THYAO veya BINANCE:SOLUSDT" autoFocus/><button type="submit">Ekle</button></form>{error && <p>{error}</p>}<div className="market-symbol-list">{symbols.map((symbol) => <div key={symbol}><span>{symbol}</span><button type="button" onClick={() => remove(symbol)} disabled={symbols.length === 1}>Kaldır</button></div>)}</div><footer><button type="button" onClick={reset}>Varsayılanları yükle</button><a href="https://www.tradingview.com/symbols/" target="_blank" rel="noreferrer">TradingView’da kod ara ↗</a></footer></div>}
  </div>;
}
