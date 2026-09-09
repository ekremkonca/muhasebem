import React, { useEffect, useState } from 'react';

export default function TourCountDonut({ count }) {
  const [replay, setReplay] = useState(0);
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    let start;
    const finish = () => {
      cancelAnimationFrame(frame);
      setProgress(1);
    };
    const tick = (now) => {
      start ??= now;
      const elapsed = Math.min(1, (now - start) / 1400);
      setProgress(1 - Math.pow(1 - elapsed, 2));
      if (elapsed < 1) frame = requestAnimationFrame(tick);
    };

    // Keep the ring visible when automatic motion is disabled; clicks explicitly replay it.
    if (reduced.matches && replay === 0) finish();
    else {
      setProgress(0);
      frame = requestAnimationFrame(tick);
    }
    reduced.addEventListener('change', finish);
    return () => {
      cancelAnimationFrame(frame);
      reduced.removeEventListener('change', finish);
    };
  }, [replay]);

  return (
    <article className="tour-count-donut-card">
      <div className="v8-card-title"><span>Tur sayısı</span><small>Tur geliri günleri</small></div>
      <button
        type="button"
        className="tour-count-donut finance-donut-control"
        onClick={() => setReplay(n => n + 1)}
        aria-label={`Tur sayısı ${count}. Dolumu yeniden oynat`}
        title="Dolumu yeniden oynat"
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="tour-count-track" cx="60" cy="60" r="50" />
          <circle className="tour-count-fill" cx="60" cy="60" r="50" pathLength="100" strokeDasharray="100" strokeDashoffset={100 * (1 - progress)} />
        </svg>
        <strong>{count}</strong>
      </button>
      <p className="tour-motivation">{['Damlaya damlaya göl olur.', 'İşleyen demir ışıldar.', 'Emek olmadan yemek olmaz.'][Math.floor(Date.now()/86400000)%3]}<small>Türk atasözü · Günün sözü</small></p>
    </article>
  );
}
