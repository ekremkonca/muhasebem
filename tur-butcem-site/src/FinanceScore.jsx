import React, { useEffect, useState } from 'react';
import './styles/finance-score.css';

export default function FinanceScore({ score, onDetails }) {
  const [active, setActive] = useState(true);
  const [replay, setReplay] = useState(0);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    const stop = () => { cancelAnimationFrame(frame); setValue(score); };
    reduced.addEventListener('change', stop);
    // An explicit replay is a user request for motion, even with reduced motion enabled.
    if (reduced.matches && replay === 0) setValue(score);
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
  }, [score, active, replay]);
  return <article className="v8-score-card finance-score-card">
    <div className="v8-card-title"><span>Kişisel finans skoru</span><button className="finance-score-info" onClick={onDetails} aria-label="Skor detayları">i</button></div>
    <button className="finance-score-dial" onClick={() => { setActive(true); setReplay(n => n + 1); }} aria-label={`Finans skoru ${score}/100. Dolumu başlat`} title="Dolumu başlatmak için tıkla">
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="finance-score-track" cx="60" cy="60" r="50"/><circle className="finance-score-fill" cx="60" cy="60" r="50" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - value}/></svg>
      <span aria-hidden="true"><strong>{Math.round(value)}</strong><small>/100</small></span>
    </button>
    <p>{score >= 80 ? 'Finansal durumun çok iyi.' : score >= 60 ? 'Dengeli gidiyorsun.' : 'Bütçeni biraz daha yakından takip et.'}</p>
  </article>;
}
