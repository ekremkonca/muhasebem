import React, { useMemo, useState } from 'react';

const SERIES = [
  { key: 'Tur Geliri', label: 'Gelir', className: 'income', color: '#ff8a34' },
  { key: 'Bahşiş', label: 'Bahşiş', className: 'tip', color: '#35d2bf' },
  { key: 'Komisyon', label: 'Komisyon', className: 'commission', color: '#8a5cf6' },
  { key: 'Tur Masrafı', label: 'Masraf', className: 'expense', color: '#d44de3' },
];

const money = (n, c) => new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: c,
  maximumFractionDigits: 0,
}).format(Number(n) || 0).replace(/,00$/, '');
const parse = (value) => new Date(`${value}T12:00:00`);
const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const startOf = (date, mode) => {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  if (mode === 'week') {
    const day = (next.getDay() + 6) % 7;
    next.setDate(next.getDate() - day);
  } else if (mode === 'month') next.setDate(1);
  else if (mode === 'year') next.setMonth(0, 1);
  return next;
};
const addStep = (date, mode) => {
  const next = new Date(date);
  if (mode === 'day') next.setDate(next.getDate() + 1);
  else if (mode === 'week') next.setDate(next.getDate() + 7);
  else if (mode === 'month') next.setMonth(next.getMonth() + 1, 1);
  else next.setFullYear(next.getFullYear() + 1, 0, 1);
  return next;
};
const labelFor = (date, mode) => {
  if (mode === 'year') return String(date.getFullYear());
  if (mode === 'month') return new Intl.DateTimeFormat('tr-TR', { month: 'short', year: '2-digit' }).format(date);
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(date);
};

export default function AnalyticsChart({ rows, currency, convert }) {
  const [mode, setMode] = useState('month');

  const { bars, buckets } = useMemo(() => {
    const paid = rows.filter((row) => row.status === 'Ödendi' && SERIES.some((item) => item.key === row.type));
    if (!paid.length) {
      return { bars: SERIES.map((item) => ({ ...item, value: 0 })), buckets: [] };
    }
    const dates = paid.map((row) => parse(row.date)).sort((a, b) => a - b);
    const first = startOf(dates[0], mode);
    const last = startOf(dates[dates.length - 1], mode);
    const buckets = [];
    for (let date = new Date(first); date <= last; date = addStep(date, mode)) {
      const bucket = { key: iso(date), label: labelFor(date, mode) };
      SERIES.forEach((item) => { bucket[item.key] = 0; });
      buckets.push(bucket);
    }
    const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    paid.forEach((row) => {
      const bucket = byKey.get(iso(startOf(parse(row.date), mode)));
      if (bucket) bucket[row.type] += convert(row);
    });
    return {
      buckets,
      bars: SERIES.map((item) => ({
        ...item,
        value: buckets.reduce((sum, bucket) => sum + Math.abs(Number(bucket[item.key] || 0)), 0),
      })),
    };
  }, [rows, currency, convert, mode]);

  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const last = buckets[buckets.length - 1];

  return <section className="analysis line-chart-panel finance-modern breakdown-bars-card">
    <div className="analytics-head">
      <div>
        <span className="eyebrow">FİNANS ANALİZİ</span>
        <h2>Kategori performansı</h2>
      </div>
      <div className="period-tabs">
        {[
          ['day', 'Gün'],
          ['week', 'Hafta'],
          ['month', 'Ay'],
          ['year', 'Yıl'],
        ].map(([key, label]) => <button key={key} className={mode === key ? 'active' : ''} onClick={() => setMode(key)}>{label}</button>)}
      </div>
    </div>
    <div className="breakdown-bar-plot" role="img" aria-label="Finans analizi yatay kategori grafiği">
      {bars.map((bar) => <div className="breakdown-bar-row" key={bar.key}>
        <span>{bar.label}</span>
        <i>
          <b className={bar.className} style={{ width: `${Math.max(bar.value ? 8 : 0, (bar.value / max) * 100)}%`, background: bar.color }} />
        </i>
        <strong>{money(bar.value, currency)}</strong>
      </div>)}
    </div>
    <div className="breakdown-axis">
      <span>{money(0, currency)}</span>
      <span>{money(max * .25, currency)}</span>
      <span>{money(max * .5, currency)}</span>
      <span>{money(max * .75, currency)}</span>
      <span>{money(max, currency)}</span>
    </div>
    <div className="finance-readout">
      <b>{last?.label || 'Dönem özeti'}</b>
      {SERIES.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}: <strong>{money(last?.[item.key] || 0, currency)}</strong></span>)}
    </div>
  </section>;
}
