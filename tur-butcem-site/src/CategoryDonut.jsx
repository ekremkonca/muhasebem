import React, { useEffect, useMemo, useState } from 'react';
import './styles/category-donut.css';

const COLORS = {
  'Tur Geliri': '#6c6ff6',
  'Tur Geliri (TL)': '#6c6ff6',
  'Bahşiş': '#ffcb46',
  'Bahşiş (TL)': '#ffcb46',
  'Bahşiş (Döviz)': '#f59e0b',
  'Komisyon': '#32b8ef',
  'Komisyon (TL)': '#32b8ef',
  'Komisyon (Döviz)': '#0ea5e9',
  'Tur Masrafı': '#ff5f7a',
  'Masraf': '#ff5f7a',
};
const LABELS = {
  'Tur Geliri': 'Gelir',
  'Bahşiş': 'Bahşiş',
  'Komisyon': 'Komisyon',
  'Tur Masrafı': 'Masraf',
};

export default function CategoryDonut({ cats, totalOverride, currency, money }) {
  const [progress, setProgress] = useState(0);
  const [replay, setReplay] = useState(0);
  const [details, setDetails] = useState(false);

  const items = useMemo(() => cats.map((cat, index) => ({
    type: cat.type,
    label: LABELS[cat.type] || cat.type,
    value: Number(cat.value || 0),
    color: COLORS[cat.type] || ['#8b5cf6', '#14b8a6', '#f97316', '#ec4899'][index % 4],
  })), [cats]);

  const total = Number.isFinite(Number(totalOverride)) ? Number(totalOverride) : items.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  useEffect(() => {
    let start;
    let frame;
    const tick = (now) => {
      start ??= now;
      const t = Math.min(1, (now - start) / 900);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setProgress(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [replay]);

  return <article className="category-donut-card dashboard-breakdown-card">
    <div className="breakdown-head">
      <span>Kategori dağılımı</span>
      <button type="button" onClick={() => setDetails(true)}>Detay</button>
    </div>
    <div className="breakdown-body">
      <button
        className="category-donut finance-donut-control"
        type="button"
        onClick={() => setReplay((next) => next + 1)}
        aria-label="Kategori dağılımını yeniden oynat"
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="category-donut-track" cx="60" cy="60" r={radius} />
          {items.map((item) => {
            const share = total > 0 ? Math.max(0, item.value) / total : 0;
            const dash = circumference * share * progress;
            const gap = item.value > 0 ? 2.2 : 0;
            const segment = <circle
              key={item.type}
              className="category-donut-segment"
              cx="60"
              cy="60"
              r={radius}
              stroke={item.color}
              strokeDasharray={`${Math.max(0, dash - gap)} ${circumference - Math.max(0, dash - gap)}`}
              strokeDashoffset={-offset}
            >
              <title>{`${item.label}: ${money(item.value, currency)}`}</title>
            </circle>;
            offset += circumference * share * progress;
            return segment;
          })}
        </svg>
        <span>
          <strong>{money(total, currency)}</strong>
          <small>Toplam hareket</small>
        </span>
      </button>
      <div className="breakdown-list">
        {items.map((item) => <div key={item.type}>
          <i style={{ background: item.color }} />
          <span>{item.label}</span>
          <b>{money(item.value, currency)}</b>
        </div>)}
      </div>
    </div>
    {details && <div className="v8-modal-backdrop" onClick={() => setDetails(false)}>
      <div className="v8-score-detail" role="dialog" aria-modal="true" aria-label="Kategori dağılımı detayları" onClick={(event) => event.stopPropagation()}>
        <button onClick={() => setDetails(false)} aria-label="Kapat">×</button>
        <h3>Kategori dağılımı</h3>
        <ul>
          {items.map((item) => <li key={item.type}>{item.label}: {money(item.value, currency)}</li>)}
        </ul>
      </div>
    </div>}
  </article>;
}
