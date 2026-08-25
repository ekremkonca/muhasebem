import React, { useMemo, useState } from 'react';

const SERIES = [
  { type: 'Tur Geliri', key: 'income', label: 'Gelir', className: 'series-income' },
  { type: 'Tur Masrafı', key: 'expense', label: 'Gider', className: 'series-expense' },
  { type: 'Bahşiş', key: 'tip', label: 'Bahşiş', className: 'series-tip' },
  { type: 'Komisyon', key: 'commission', label: 'Komisyon', className: 'series-commission' },
];

const MODES = [
  { key: 'daily', label: 'Günlük' },
  { key: 'weekly', label: 'Haftalık' },
  { key: 'monthly', label: 'Aylık' },
  { key: 'yearly', label: 'Yıllık' },
];

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const money = (n, currency) => new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency, maximumFractionDigits: 0,
}).format(Number(n) || 0);

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function makeBuckets(mode) {
  const now = new Date();
  const buckets = [];

  if (mode === 'daily') {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      buckets.push({
        key: isoDate(d),
        label: new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' }).format(d),
        match: (row) => row.date === isoDate(d),
      });
    }
  }

  if (mode === 'weekly') {
    const current = startOfWeek(now);
    for (let i = 11; i >= 0; i--) {
      const start = new Date(current.getFullYear(), current.getMonth(), current.getDate() - i * 7);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      const startKey = isoDate(start);
      const endKey = isoDate(end);
      buckets.push({
        key: startKey,
        label: `${pad(start.getDate())} ${new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(start)}`,
        match: (row) => row.date >= startKey && row.date <= endKey,
      });
    }
  }

  if (mode === 'monthly') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      buckets.push({
        key: prefix,
        label: new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(d),
        match: (row) => row.date.startsWith(prefix),
      });
    }
  }

  if (mode === 'yearly') {
    for (let i = 4; i >= 0; i--) {
      const year = String(now.getFullYear() - i);
      buckets.push({ key: year, label: year, match: (row) => row.date.startsWith(year) });
    }
  }

  return buckets;
}

export default function AnalyticsChart({ rows, currency }) {
  const [mode, setMode] = useState('monthly');

  const data = useMemo(() => {
    const buckets = makeBuckets(mode);
    const source = rows.filter((row) => row.currency === currency);

    return buckets.map((bucket) => {
      const relevant = source.filter(bucket.match);
      const values = Object.fromEntries(SERIES.map((series) => [
        series.key,
        relevant.filter((row) => row.type === series.type).reduce((sum, row) => sum + Number(row.amount || 0), 0),
      ]));
      return { ...bucket, ...values };
    });
  }, [rows, currency, mode]);

  const max = Math.max(1, ...data.flatMap((item) => SERIES.map((series) => item[series.key])));
  const total = SERIES.reduce((acc, series) => {
    acc[series.key] = data.reduce((sum, item) => sum + item[series.key], 0);
    return acc;
  }, {});

  return <section className="analysis analytics-panel">
    <div className="analytics-head">
      <div>
        <span className="eyebrow">FİNANS ANALİZİ</span>
        <h2>Gelir dağılımı ve hareketler</h2>
      </div>
      <div className="period-tabs" role="tablist" aria-label="Grafik dönemi">
        {MODES.map((item) => <button
          type="button"
          key={item.key}
          className={mode === item.key ? 'active' : ''}
          onClick={() => setMode(item.key)}
        >{item.label}</button>)}
      </div>
    </div>

    <div className="analytics-legend">
      {SERIES.map((series) => <span key={series.key}><i className={series.className}/>{series.label}</span>)}
    </div>

    <div className="analytics-scroll">
      <div className={`analytics-chart analytics-${mode}`}>
        {data.map((item) => <div className="analytics-group" key={item.key}>
          <div className="analytics-bars">
            {SERIES.map((series) => {
              const value = item[series.key];
              const height = value ? Math.max(5, (value / max) * 100) : 0;
              return <div
                key={series.key}
                className={`analytics-bar ${series.className}`}
                style={{ '--bar-height': `${height}%` }}
                title={`${item.label} · ${series.label}: ${money(value, currency)}`}
              />;
            })}
          </div>
          <span>{item.label}</span>
        </div>)}
      </div>
    </div>

    <div className="analytics-summary">
      {SERIES.map((series) => <div key={series.key}>
        <span><i className={series.className}/>{series.label}</span>
        <strong>{money(total[series.key], currency)}</strong>
      </div>)}
    </div>
  </section>;
}
