import React, { useEffect, useRef, useState } from 'react';
import './styles/finance-score.css';

export default function FinanceScore({ score, onDetails }) {
  const card = useRef(null);
  const [visible, setVisible] = useState(false);
  const [replay, setReplay] = useState(0);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.5 });
    observer.observe(card.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    const stop = () => { cancelAnimationFrame(frame); setValue(score); };
    reduced.addEventListener('change', stop);
    if (reduced.matches) setValue(score);
    else {
      setValue(0);
      let start;
      const tick = (now) => {
        start ??= now;
        const progress = Math.min(1, (now - start) / 1800);
        setValue(score * (1 - Math.pow(1 - progress, 2)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    return () => { cancelAnimationFrame(frame); reduced.removeEventListener('change', stop); };
  }, [score, visible, replay]);
  return <article ref={card} className="v8-score-card finance-score-card">
    <div className="v8-card-title"><span>Kişisel finans skoru</span><button className="finance-score-info" onClick={onDetails} aria-label="Skor detayları">i</button></div>
    <button className="finance-score-dial" onClick={() => setReplay(n => n + 1)} aria-label={`Finans skoru ${score}/100. Dolumu yeniden oynat`} title="Dolumu yeniden oynat">
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="finance-score-track" cx="60" cy="60" r="50"/><circle className="finance-score-fill" cx="60" cy="60" r="50" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - value}/></svg>
      <span aria-hidden="true"><strong>{Math.round(value)}</strong><small>/100</small></span>
    </button>
    <p>{score >= 80 ? 'Finansal durumun çok iyi.' : score >= 60 ? 'Dengeli gidiyorsun.' : 'Bütçeni biraz daha yakından takip et.'}</p>
    <button className="finance-score-replay" onClick={() => setReplay(n => n + 1)}>↻ Dolumu tekrar göster</button>
  </article>;
}
