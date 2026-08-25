import React, { useEffect, useState } from 'react';
import './themes.css';

const THEMES = [
  ['classic','Klasik','#176b4d'],
  ['ocean','Okyanus','#0f6d8c'],
  ['midnight','Gece','#7c9cff'],
  ['graphite','Grafit','#68727d'],
  ['forest','Orman','#347a43'],
  ['emerald','Zümrüt','#0f9f7a'],
  ['lavender','Lavanta','#7c5cc4'],
  ['rose','Gül','#c44f79'],
  ['sunset','Gün Batımı','#e06b4f'],
  ['amber','Kehribar','#b97a18'],
  ['cobalt','Kobalt','#315fc6'],
  ['teal','Turkuaz','#138a8a'],
  ['burgundy','Bordo','#8f3c53'],
  ['sand','Kum','#9a7443'],
  ['violet','Menekşe','#7048bd'],
];

export default function ThemeSwitcher(){
  const [theme,setTheme]=useState('classic');
  useEffect(()=>{document.documentElement.dataset.theme=theme},[theme]);
  return <div className="theme-switcher" aria-label="Tema seç">
    {THEMES.map(([id,name,color])=><button
      key={id}
      type="button"
      className={`theme-dot${theme===id?' active':''}`}
      style={{'--theme-dot':color}}
      title={name}
      aria-label={`${name} tema`}
      aria-pressed={theme===id}
      onClick={()=>setTheme(id)}
    />)}
  </div>;
}
