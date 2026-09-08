import React, { useEffect, useState } from 'react';
import './styles/currency-donuts.css';
const COLORS = { EUR:'#8064d9', GBP:'#3182ce', USD:'#08a66c', TRY:'#e58b24' };
export default function CurrencyDonuts({ totals, money }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => { let s; let f; const tick = n => { s ??= n; const t=Math.min(1,(n-s)/1100); setProgress(1-Math.pow(1-t,2)); if(t<1)f=requestAnimationFrame(tick); }; f=requestAnimationFrame(tick); return()=>cancelAnimationFrame(f); }, [totals]);
  return <div className="currency-donuts">{totals.map(({code,amount}) => <div className="currency-donut-item" key={code} title={`${code}: ${money(amount,code)}`}><div className="currency-donut-ring"><svg viewBox="0 0 54 54"><circle className="currency-donut-track" cx="27" cy="27" r="22"/><circle className="currency-donut-fill" cx="27" cy="27" r="22" pathLength="100" stroke={COLORS[code]} strokeDasharray="100" strokeDashoffset={100-progress*100}/></svg><span>{code}</span></div><b>{money(amount,code)}</b></div>)}</div>;
}
