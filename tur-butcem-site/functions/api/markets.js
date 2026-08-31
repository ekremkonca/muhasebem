const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=120, s-maxage=300, stale-while-revalidate=900" } });
const readJson = async (url) => { const response = await fetch(url, { headers: { accept: "application/json" } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); };

export async function onRequestGet() {
  const fetchedAt = new Date().toISOString();
  const [fxResult, cryptoResult, goldResult] = await Promise.allSettled([
    readJson("https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP"),
    readJson("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=try&include_24hr_change=true"),
    readJson("https://api.gold-api.com/price/XAU"),
  ]);
  const items = [];
  if (fxResult.status === "fulfilled") {
    const rates = fxResult.value?.rates || {};
    if (rates.TRY) {
      items.push({ symbol: "USD/TRY", label: "Dolar", value: rates.TRY, currency: "TRY" });
      if (rates.EUR) items.push({ symbol: "EUR/TRY", label: "Euro", value: rates.TRY / rates.EUR, currency: "TRY" });
      if (rates.GBP) items.push({ symbol: "GBP/TRY", label: "Sterlin", value: rates.TRY / rates.GBP, currency: "TRY" });
    }
  }
  if (goldResult.status === "fulfilled") {
    const ounceUsd = Number(goldResult.value?.price), usdTry = items.find((item) => item.symbol === "USD/TRY")?.value;
    if (ounceUsd > 0 && usdTry > 0) items.push({ symbol: "ALTIN", label: "Gram Altın", value: ounceUsd * usdTry / 31.1034768, currency: "TRY" });
  }
  if (cryptoResult.status === "fulfilled") {
    const bitcoin = cryptoResult.value?.bitcoin, ethereum = cryptoResult.value?.ethereum;
    if (bitcoin?.try) items.push({ symbol: "BTC", label: "Bitcoin", value: bitcoin.try, currency: "TRY", change: Number(bitcoin.try_24h_change) || 0 });
    if (ethereum?.try) items.push({ symbol: "ETH", label: "Ethereum", value: ethereum.try, currency: "TRY", change: Number(ethereum.try_24h_change) || 0 });
  }
  if (!items.length) return json({ error: "Piyasa verileri şu anda alınamadı.", items: [], fetchedAt }, 502);
  return json({ items, fetchedAt, partial: [fxResult, cryptoResult, goldResult].some((result) => result.status === "rejected") });
}
export function onRequestOptions() { return new Response(null, { status: 204, headers: { allow: "GET, OPTIONS" } }); }
