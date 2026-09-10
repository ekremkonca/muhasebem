import React, { useEffect, useState } from 'react';

export default function FastCount({ value, format, ready = true, replay = 0 }) {
  const target = ready ? Number(value) || 0 : 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!target) {
      setDisplay(0);
      return undefined;
    }
    let frame;
    let startedAt;
    const tick = (time) => {
      startedAt ??= time;
      const progress = Math.min(1, (time - startedAt) / 300);
      setDisplay(target * progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    setDisplay(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, replay]);

  return <span className="fast-count" aria-label={format(target)}>{format(display)}</span>;
}
