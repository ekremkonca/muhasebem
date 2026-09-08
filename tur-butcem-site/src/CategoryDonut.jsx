import React, { useEffect, useState } from 'react';
import './styles/category-donut.css';

const COLORS = ['#08a66c', '#3182ce', '#8064d9', '#e58b24'];

export default function CategoryDonut({ cats, currency, money }) {
  const [active, setActive] = useState(true);
  const [progress, setProgress] = useState(0);
  const [replay, setReplay] = useState(0);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(false);
  const total = Math.max(cats.reduce((sum, cat) => sum + cat.value, 0), 1);
  useEffect(() => {
    if (!active) return;
    let start; let frame;
    const tick = (now) => {
      start ??= now;
      const t = Math.min(1, (now - start) / 1300);
      setProgress(1 - Math.pow(1 - t, 2));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setProgress(0); frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, replay]);
  const radius = 43; const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <article className="category-donut-card">
    <div className="v8-card-title"><span>Kategori dağılımı</span><div className="category-donut-title-actions"><small>{currency}</small><button className="category-donut-info" onClick={() => setDetails((value) => !value)} aria-label="Kategori toplamlarını göster" aria-expanded={details}>i</button></div></div>
    <button className="category-donut" onClick={() => { setActive(true); setReplay(n => n + 1); }} aria-label="Kategori dağılımını doldur" title="Doldurmak için tıkla">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="category-donut-track" cx="60" cy="60" r={radius}/>
        {cats.map((cat, index) => {
          const share = cat.value / total;
          const dash = circumference * share * progress;
          const gap = cat.value ? 1.8 : 0;
          const item = <circle key={cat.type} className="category-donut-segment" cx="60" cy="60" r={radius} stroke={COLORS[index]} strokeDasharray={`${Math.max(0, dash - gap)} ${circumference - Math.max(0, dash - gap)}`} strokeDashoffset={-offset} onMouseEnter={() => setHovered(cat)} onMouseLeave={() => setHovered(null)} onClick={(event) => { event.stopPropagation(); setSelected(cat); setHovered(cat); }} tabIndex="0" role="button" aria-label={`${cat.type}: ${money(cat.value, currency)}`}>
            <title>{`${cat.type}: ${money(cat.value, currency)}`}</title>
          </circle>;
          offset += circumference * share * progress;
          return item;
        })}
      </svg>
      <span><strong>{cats.filter(cat => cat.value > 0).length}</strong><small>kategori</small></span>
      {(selected || hovered) && <span className={`category-donut-tooltip${selected ? " is-selected" : ""}`} style={{ color: COLORS[cats.indexOf(selected || hovered)] }}><b>{(selected || hovered).type}</b><small>{money((selected || hovered).value, currency)}</small></span>}
    </button>
    {details && <div className="category-details-backdrop" onClick={() => setDetails(false)}><div className="category-details-modal" role="dialog" aria-modal="true" aria-label="Kategori toplamları" onClick={(event) => event.stopPropagation()}><button className="category-details-close" onClick={() => setDetails(false)} aria-label="Kapat">×</button><h3>Kategori dağılımı</h3><p>Kayıt defterindeki güncel toplamlar</p>{cats.map((cat, index) => <div className="category-details-row" key={cat.type}><i style={{ background: COLORS[index] }} /><span>{cat.type}</span><b>{money(cat.value, currency)}</b></div>)}</div></div>}
    <div className="category-donut-legend">{cats.map((cat, index) => <span key={cat.type}><i style={{ background: COLORS[index] }}/><b>{cat.type.replace('Tur ', '')}</b><small>{money(cat.value, currency)}</small></span>)}</div>
  </article>;
}
