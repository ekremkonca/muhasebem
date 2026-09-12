import React from 'react';
import ThemeSwitcher from './ThemeSwitcher.jsx';
import MarketTicker from './MarketTicker.jsx';
import {logout,loadBackups,loadHistory,loadRecords} from './api.js';
import {navigateTo} from './navigation.js';

function Icon({name,size=18}){
  const paths={
    temple:<><path d="M3 21h18M5 18h14M6 18V10h12v8M3 10h18L12 3z"/><path d="M9 10v8m3-8v8m3-8v8"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/></>,
    backup:<><path d="M4 5h12l4 4v10H4z"/><path d="M8 5v5h8V5M8 19v-5h8v5"/></>,
    history:<><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    box:<><path d="m3 7 9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10"/></>,
    report:<><path d="M6 3h9l3 3v15H6z"/><path d="M9 12h6M9 16h6M9 8h3"/></>,
    download:<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>,
    plus:<path d="M12 5v14M5 12h14"/>,
    logout:<><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function HeaderToolPanel({tool,onClose}){
  const [items,setItems]=React.useState([]),[loading,setLoading]=React.useState(true);
  React.useEffect(()=>{let live=true;setLoading(true);const run=tool==='Yedekler'?loadBackups:tool==='İşlem geçmişi'?()=>loadHistory(100):()=>loadRecords(true);Promise.resolve(run()).then(data=>{if(live)setItems(data?.backups||data?.history||data||[])}).catch(()=>{if(live)setItems([])}).finally(()=>live&&setLoading(false));return()=>{live=false}},[tool]);
  return <div className="header-tool-panel-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}><section className="header-tool-panel" role="dialog" aria-modal="true"><header><div><span className="eyebrow">SİSTEM</span><h2>{tool}</h2></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">×</button></header>{loading?<p>Yükleniyor…</p>:<div className="header-tool-panel-list">{items.length?items.slice(0,30).map((item,i)=><article key={item.id||i}><strong>{item.title||item.tour||item.action||'Kayıt'}</strong><small>{item.created_at||item.date||item.status||''}</small></article>):<p>Henüz kayıt bulunmuyor.</p>}</div>}</section></div>;
}

export default function HomePage({children,contentClassName=''}){
  const [activeTool,setActiveTool]=React.useState('');
  const openAccountingTool=(title)=>setActiveTool(title);
  const signOut=async()=>{
    try{await logout()}finally{window.location.replace('/muhasebe/')}
  };
  return <div className="home-page-shell">
    <header className="v7-header home-v7-header">
      <div className="brand home-brand">
        <div className="brand-mark brand-logo-mark">
          <img className="brand-logo-image" src="/ek-logo-clean.png" alt="EK" />
        </div>
        <div className="header-tool-grid"><ThemeSwitcher/>
        <div className="system-shortcuts" aria-label="Sistem araçları">
          <button className="system-shortcut-card" type="button" onClick={()=>openAccountingTool('Yedekler')} title="Yedekler"><Icon name="backup"/><span>Yedekler</span></button>
          <button className="system-shortcut-card" type="button" onClick={()=>openAccountingTool('İşlem geçmişi')} title="İşlem geçmişi"><Icon name="history"/><span>İşlem geçmişi</span></button>
          <button className="system-shortcut-card" type="button" onClick={()=>openAccountingTool('Çöp kutusu')} title="Çöp kutusu"><Icon name="box"/><span>Çöp kutusu</span></button>
          <button className="system-shortcut-card" type="button" onClick={()=>openAccountingTool('Güvenlik')} title="Güvenlik"><Icon name="settings"/><span>Güvenlik</span></button>
        </div></div>
      </div>
      <div className="header-actions home-header-actions">
        <button className="btn secondary" type="button" onClick={()=>openAccountingTool('Aylık rapor')}><Icon name="report"/>Aylık rapor</button>
        <button className="btn primary" type="button" onClick={()=>openAccountingTool('Yeni kayıt')}><Icon name="plus"/>Yeni kayıt</button>
        <button className="icon-btn header-tool" type="button" onClick={signOut} title="Çıkış" aria-label="Çıkış yap"><Icon name="logout"/></button>
      </div>
    </header>
    <MarketTicker/>
    <main className={contentClassName||'home-content-area'}>{children}</main>{activeTool&&<HeaderToolPanel tool={activeTool} onClose={()=>setActiveTool('')}/>} 
  </div>;
}
