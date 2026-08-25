'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { createRecord, deleteRecord, loadRecords, updateRecordStatus } from './api';

const TYPES = ['Tur Geliri', 'Tur Masrafı', 'Bahşiş', 'Komisyon'];
const INCOME_TYPES = new Set(['Tur Geliri', 'Bahşiş', 'Komisyon']);
const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];
const fmtDate = (d) => new Intl.DateTimeFormat('tr-TR', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(`${d}T12:00:00`));
const today = new Date().toISOString().slice(0,10);
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const money = (n, currency) => new Intl.NumberFormat('tr-TR', { style:'currency', currency, maximumFractionDigits:2 }).format(Number(n) || 0);

function Icon({name, size=18}) {
  const paths = {
    plus:<><path d="M12 5v14M5 12h14"/></>,
    download:<><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></>,
    wallet:<><path d="M4 7h14a2 2 0 0 1 2 2v9H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12v4m0 5h3"/><circle cx="16" cy="12" r="1" fill="currentColor"/></>,
    chart:<><path d="M4 19V9m6 10V5m6 14v-7m5 7H2"/></>,
    trash:<><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></>,
    filter:<><path d="M4 5h16l-6 7v5l-4 2v-7z"/></>,
    close:<><path d="m6 6 12 12M18 6 6 18"/></>,
    check:<><path d="m5 12 4 4L19 6"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function MiniChart({ rows, currency }) {
  const data = useMemo(() => {
    const months=[]; const base=new Date();
    for(let i=5;i>=0;i--){
      const d=new Date(base.getFullYear(),base.getMonth()-i,1); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const relevant=rows.filter(r=>r.currency===currency && r.date.startsWith(key));
      months.push({label:new Intl.DateTimeFormat('tr-TR',{month:'short'}).format(d), gelir:relevant.filter(r=>INCOME_TYPES.has(r.type)).reduce((a,r)=>a+Number(r.amount),0), gider:relevant.filter(r=>r.type==='Tur Masrafı').reduce((a,r)=>a+Number(r.amount),0)});
    }
    return months;
  },[rows,currency]);
  const max=Math.max(1,...data.flatMap(x=>[x.gelir,x.gider]));
  return <div className="chart-wrap">
    <div className="chart-legend"><span><i className="dot income"/>Gelir</span><span><i className="dot expense"/>Gider</span></div>
    <div className="bars">{data.map((x,i)=><div className="bar-group" key={i} title={`${x.label}: ${money(x.gelir,currency)} gelir, ${money(x.gider,currency)} gider`}>
      <div className="bar-pair"><div className="bar income" style={{height:`${Math.max(x.gelir?5:0,x.gelir/max*100)}%`}}/><div className="bar expense" style={{height:`${Math.max(x.gider?5:0,x.gider/max*100)}%`}}/></div><span>{x.label}</span>
    </div>)}</div>
  </div>;
}

function EntryModal({ onClose, onSave, currency }) {
  const [form,setForm]=useState({date:today,tour:'',guest:'',type:'Tur Geliri',amount:'',currency,status:'Alındı',note:''});
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v,...(k==='type'?{status:INCOME_TYPES.has(v)?'Alınmadı':'Ödenmedi'}:{})}));
  const statuses=INCOME_TYPES.has(form.type)?['Alındı','Alınmadı']:['Ödendi','Ödenmedi'];
  const submit=async(e)=>{e.preventDefault(); if(!form.tour.trim() || !Number(form.amount) || saving) return; setSaving(true); try{await onSave({...form,id:uid(),amount:Number(form.amount)});}finally{setSaving(false)}};
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal" onSubmit={submit}>
    <div className="modal-head"><div><span className="eyebrow">YENİ HAREKET</span><h2>Tur kaydı ekle</h2></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat"><Icon name="close"/></button></div>
    <div className="form-grid">
      <label>İşlem türü<select value={form.type} onChange={e=>set('type',e.target.value)}>{TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Tarih<input type="date" value={form.date} onChange={e=>set('date',e.target.value)} required/></label>
      <label className="wide">Tur adı<input value={form.tour} onChange={e=>set('tour',e.target.value)} placeholder="Örn. Efes Özel Tur" autoFocus required/></label>
      <label>Misafir / kaynak<input value={form.guest} onChange={e=>set('guest',e.target.value)} placeholder="İsteğe bağlı"/></label>
      <label>Durum<select value={form.status} onChange={e=>set('status',e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Tutar<input type="number" min="0" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0,00" required/></label>
      <label>Para birimi<select value={form.currency} onChange={e=>set('currency',e.target.value)}>{CURRENCIES.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="wide">Not<input value={form.note} onChange={e=>set('note',e.target.value)} placeholder="Açıklama ekle"/></label>
    </div>
    <div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose} disabled={saving}>Vazgeç</button><button className="btn primary" disabled={saving}><Icon name="check"/>{saving?'Kaydediliyor...':'Kaydı ekle'}</button></div>
  </form></div>;
}

export default function App(){
  const [rows,setRows]=useState([]);
  const [currency,setCurrency]=useState('TRY'); const [filter,setFilter]=useState('Tümü'); const [modal,setModal]=useState(false);
  const [loading,setLoading]=useState(true); const [error,setError]=useState('');

  useEffect(()=>{
    let active=true;
    loadRecords().then(data=>{if(active)setRows(data)}).catch(err=>{if(active)setError(err.message||'D1 verileri yüklenemedi.')}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[]);

  const active=rows.filter(r=>r.currency===currency && (filter==='Tümü'||r.type===filter));
  const total=(fn)=>active.filter(fn).reduce((a,r)=>a+Number(r.amount),0);
  const income=total(r=>INCOME_TYPES.has(r.type)); const expense=total(r=>r.type==='Tur Masrafı');
  const pending=total(r=>INCOME_TYPES.has(r.type)&&r.status==='Alınmadı');

  const saveRecord=async(record)=>{
    try{
      setError('');
      const saved=await createRecord(record);
      setRows(prev=>[saved,...prev.filter(x=>x.id!==saved.id)]);
      setModal(false);
      setCurrency(saved.currency);
    }catch(err){setError(err.message||'Kayıt eklenemedi.'); throw err;}
  };

  const toggleStatus=async(record)=>{
    const nextStatus=INCOME_TYPES.has(record.type)?(record.status==='Alındı'?'Alınmadı':'Alındı'):(record.status==='Ödendi'?'Ödenmedi':'Ödendi');
    const previous=record.status;
    setRows(prev=>prev.map(x=>x.id===record.id?{...x,status:nextStatus}:x));
    try{setError('');await updateRecordStatus(record.id,nextStatus)}catch(err){setRows(prev=>prev.map(x=>x.id===record.id?{...x,status:previous}:x));setError(err.message||'Durum güncellenemedi.')}
  };

  const removeRecord=async(record)=>{
    const snapshot=rows;
    setRows(prev=>prev.filter(x=>x.id!==record.id));
    try{setError('');await deleteRecord(record.id)}catch(err){setRows(snapshot);setError(err.message||'Kayıt silinemedi.')}
  };

  const exportExcel=()=>{
    const ordered=[...rows].sort((a,b)=>b.date.localeCompare(a.date));
    const data=ordered.map(r=>({'Tarih':r.date,'Tur':r.tour,'Misafir / Kaynak':r.guest,'Tür':r.type,'Tutar':r.amount,'Para Birimi':r.currency,'Durum':r.status,'Not':r.note}));
    const summary=CURRENCIES.map(c=>{const x=rows.filter(r=>r.currency===c);const g=x.filter(r=>INCOME_TYPES.has(r.type)).reduce((a,r)=>a+Number(r.amount),0);const m=x.filter(r=>r.type==='Tur Masrafı').reduce((a,r)=>a+Number(r.amount),0);return {'Para Birimi':c,'Toplam Gelir':g,'Toplam Gider':m,'Net':g-m,'Bekleyen Tahsilat':x.filter(r=>INCOME_TYPES.has(r.type)&&r.status==='Alınmadı').reduce((a,r)=>a+Number(r.amount),0)}});
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),'Kayıtlar'); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(summary),'Özet'); XLSX.writeFile(wb,`Tur-Butcesi-${today}.xlsx`);
  };
  return <>
    <header><div className="brand"><div className="brand-mark"><Icon name="wallet" size={22}/></div><div><strong>Tur Bütçem</strong><span>Özel finans çalışma alanı</span></div></div><div className="header-actions"><select className="currency" value={currency} onChange={e=>setCurrency(e.target.value)}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select><button className="btn secondary desktop" onClick={exportExcel}><Icon name="download"/>Excel'e aktar</button><button className="btn primary" onClick={()=>setModal(true)}><Icon name="plus"/>Yeni kayıt</button></div></header>
    <main>
      <section className="hero"><div><span className="eyebrow">TUR FİNANSLARI</span><h1>Kazancın net, tahsilatın kontrol altında.</h1><p>Tur gelirlerini, masrafları, bahşişleri ve komisyonları tek yerden yönet.</p></div><button className="btn secondary mobile" onClick={exportExcel}><Icon name="download"/>Excel'e aktar</button></section>
      {error&&<p className="privacy-note" style={{marginTop:0}}>D1 bağlantı hatası: {error}</p>}
      <section className="dashboard">
        <div className="kpis"><article><span>Toplam gelir</span><strong>{money(income,currency)}</strong><small>{active.filter(r=>INCOME_TYPES.has(r.type)).length} gelir kaydı</small></article><article><span>Tur masrafı</span><strong>{money(expense,currency)}</strong><small>{active.filter(r=>r.type==='Tur Masrafı').length} gider kaydı</small></article><article className="net"><span>Net kazanç</span><strong>{money(income-expense,currency)}</strong><small>Gelir eksi masraf</small></article><article className="pending"><span>Alınmayı bekleyen</span><strong>{money(pending,currency)}</strong><small>{active.filter(r=>INCOME_TYPES.has(r.type)&&r.status==='Alınmadı').length} açık tahsilat</small></article></div>
        <div className="analysis"><div className="section-title"><div><span className="eyebrow">SON 6 AY</span><h2>Gelir ve gider hareketi</h2></div><Icon name="chart" size={24}/></div><MiniChart rows={rows} currency={currency}/></div>
      </section>
      <section className="records"><div className="records-head"><div><span className="eyebrow">KAYITLAR</span><h2>Son hareketler</h2></div><div className="filter"><Icon name="filter" size={16}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Tümü</option>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div></div>
        <div className="table-scroll"><table><thead><tr><th>Tarih</th><th>Tur / Misafir</th><th>Tür</th><th>Durum</th><th className="right">Tutar</th><th/></tr></thead><tbody>{active.sort((a,b)=>b.date.localeCompare(a.date)).map(r=><tr key={r.id}><td>{fmtDate(r.date)}</td><td><strong>{r.tour}</strong><span>{r.guest||r.note||'—'}</span></td><td><span className={`type type-${TYPES.indexOf(r.type)}`}>{r.type}</span></td><td><button className={`status ${['Alındı','Ödendi'].includes(r.status)?'done':'open'}`} onClick={()=>toggleStatus(r)}>{r.status}</button></td><td className="right amount">{money(r.amount,r.currency)}</td><td><button className="delete" onClick={()=>removeRecord(r)} aria-label="Sil"><Icon name="trash" size={17}/></button></td></tr>)}{loading&&<tr><td colSpan="6" className="empty">D1 kayıtları yükleniyor...</td></tr>}{!loading&&!active.length&&<tr><td colSpan="6" className="empty">Bu filtrede kayıt yok.</td></tr>}</tbody></table></div>
      </section>
      <p className="privacy-note">Kayıtlar Cloudflare D1 veritabanında saklanır ve bu siteyi açtığın cihazlardan aynı verilere erişirsin.</p>
    </main>
    {modal&&<EntryModal currency={currency} onClose={()=>setModal(false)} onSave={saveRecord}/>} 
  </>;
}
