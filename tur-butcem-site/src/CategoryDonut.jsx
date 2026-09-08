import React, { useEffect, useRef, useState } from 'react';
import './styles/category-donut.css';

const COLORS = ['#08a66c', '#3182ce', '#8064d9', '#e58b24'];

export default function CategoryDonut({ cats, currency, money }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replay, setReplay] = useState(0);
  const total = Math.max(cats.reduce((sum, cat) => sum + cat.value, 0), 1);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .45 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let start; let frame;
    const tick = (now) => {
      start ??= now;
      const t = Math.min(1, (now - start) / 1300);
      setProgress(1 - Math.pow(1 - t, 2));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setProgress(0); frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, replay]);
  const radius = 43; const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <article ref={ref} className="category-donut-card">
    <div className="v8-card-title"><span>Kategori dağılımı</span><small>{currency}</small></div>
    <button className="category-donut" onClick={() => setReplay(n => n + 1)} aria-label="Kategori dağılımını yeniden oynat" title="Dolumu yeniden oynat">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="category-donut-track" cx="60" cy="60" r={radius}/>
        {cats.map((cat, index) => {
          const share = cat.value / total;
          const dash = circumference * share * progress;
          const gap = cat.value ? 1.8 : 0;
          const item = <circle key={cat.type} className="category-donut-segment" cx="60" cy="60" r={radius} stroke={COLORS[index]} strokeDasharray={`${Math.max(0, dash - gap)} ${circumference - Math.max(0, dash - gap)}`} strokeDashoffset={-offset}>
            <title>{`${cat.type}: ${money(cat.value, currency)}`}</title>
          </circle>;
          offset += circumference * share * progress;
          return item;
        })}
      </svg>
      <span><strong>{cats.filter(cat => cat.value > 0).length}</strong><small>kategori</small></span>
    </button>
    <div className="category-donut-legend">{cats.map((cat, index) => <span key={cat.type}><i style={{ background: COLORS[index] }}/><b>{cat.type.replace('Tur ', '')}</b><small>{money(cat.value, currency)}</small></span>)}</div>
  </article>;
}
