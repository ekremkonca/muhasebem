'use client';

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { createRecord, createRecords, deleteRecord, deleteRecords, loadRecords, updateRecordStatus } from './api';
import AnalyticsChart from './AnalyticsChart';
import CalendarView from './CalendarView';
import ICSImportModal from './ICSImportModal';
import ThemeSwitcher from './ThemeSwitcher';
import './features.css';

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
    upload:<><path d="M12 21V9m0 0-4 4m4-4 4 4M5 3h14"/></>,
    calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    wallet:<><path d="M4 7h14a2 2 0 0 1 2 2v9H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12v4m0 5h3"/><circle cx="16" cy="12" r="1" fill="currentColor"/></>,
    trash:<><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></>,
    filter:<><path d="M4 5h16l-6 7v5l-4 2v-7z"/></>,
    close:<><path d="m6 6 12 12M18 6 6 18"/></>,
    check:<><path d="m5 12 4 4L19 6"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function EntryModal({ onClose, onSave, currency }) {
  const [form,setForm]=useState({date:today,tour:'',guest:'',type:'Tur Geliri',amount:'',currency,status:'Alındı',note:''});
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v,...(k==='type'?{status:INCOME_TYPES.has(v)?'Alınmadı':'Ödenmedi'}:{})}));
  const statuses=INCOME_TYPES.has(form.type)?['Alındı','Alınmadı']:['Ödendi','Ödenmedi'];
  const submit=async(e)=>{e.preventDefault();if(!form.tour.trim()||!Number(form.amount)||saving)return;setSaving(true);try{await onSave({...form,id:uid(),amount:Number(form.amount)})}finally{setSaving(false)}};

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
  const [currency,setCurrency]=useState('TRY');
  const [filter,setFilter]=useState('Tümü');
  const [modal,setModal]=useState(false);
  const [icsModal,setIcsModal]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [selectedIds,setSelectedIds]=useState([]);

  useEffect(()=>{
    let mounted=true;
    loadRecords().then(data=>{if(mounted)setRows(data)}).catch(err=>{if(mounted)setError(err.message||'D1 verileri yüklenemedi.')}).finally(()=>{if(mounted)setLoading(false)});
    return()=>{mounted=false};
  },[]);

  const active=rows.filter(r=>r.currency===currency&&(filter==='Tümü'||r.type===filter));
  const activeSorted=[...active].sort((a,b)=>b.date.localeCompare(a.date));
  const visibleIds=activeSorted.map(r=>r.id);
  const allVisibleSelected=visibleIds.length>0&&visibleIds.every(id=>selectedIds.includes(id));
  const total=(fn)=>active.filter(fn).reduce((a,r)=>a+Number(r.amount),0);
  const income=total(r=>INCOME_TYPES.has(r.type));
  const expense=total(r=>r.type==='Tur Masrafı');
  const pending=total(r=>INCOME_TYPES.has(r.type)&&r.status==='Alınmadı');

  const saveRecord=async(record)=>{
    try{setError('');const saved=await createRecord(record);setRows(prev=>[saved,...prev.filter(x=>x.id!==saved.id)]);setModal(false);setCurrency(saved.currency)}catch(err){setError(err.message||'Kayıt eklenemedi.');throw err;}
  };

  const importCalendarRecords=async(records)=>{
    try{setError('');const saved=await createRecords(records);setRows(prev=>{const merged=new Map(prev.map(row=>[row.id,row]));saved.forEach(row=>merged.set(row.id,row));return [...merged.values()].sort((a,b)=>b.date.localeCompare(a.date));})}catch(err){setError(err.message||'Google Calendar kayıtları aktarılamadı.');throw err;}
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
    setSelectedIds(prev=>prev.filter(id=>id!==record.id));
    try{setError('');await deleteRecord(record.id)}catch(err){setRows(snapshot);setError(err.message||'Kayıt silinemedi.')}
  };

  const toggleSelected=(id)=>setSelectedIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const toggleAllVisible=()=>setSelectedIds(prev=>allVisibleSelected?prev.filter(id=>!visibleIds.includes(id)):[...new Set([...prev,...visibleIds])]);

  const removeSelected=async()=>{
    const ids=selectedIds.filter(id=>rows.some(row=>row.id===id));
    if(!ids.length)return;
    if(!window.confirm(`${ids.length} kaydı silmek istediğine emin misin?`))return;
    const snapshot=rows;
    setRows(prev=>prev.filter(row=>!ids.includes(row.id)));
    setSelectedIds([]);
    try{setError('');await deleteRecords(ids)}catch(err){setRows(snapshot);setError(err.message||'Seçilen kayıtlar silinemedi.')}
  };

  const exportExcel=()=>{
    const ordered=[...rows].sort((a,b)=>b.date.localeCompare(a.date));
    const data=ordered.map(r=>({'Tarih':r.date,'Tur':r.tour,'Misafir / Kaynak':r.guest,'Tür':r.type,'Tutar':r.amount,'Para Birimi':r.currency,'Durum':r.status,'Not':r.note}));
    const summary=CURRENCIES.map(c=>{const x=rows.filter(r=>r.currency===c);const g=x.filter(r=>INCOME_TYPES.has(r.type)).reduce((a,r)=>a+Number(r.amount),0);const m=x.filter(r=>r.type==='Tur Masrafı').reduce((a,r)=>a+Number(r.amount),0);return {'Para Birimi':c,'Toplam Gelir':g,'Toplam Gider':m,'Net':g-m,'Bekleyen Tahsilat':x.filter(r=>INCOME_TYPES.has(r.type)&&r.status==='Alınmadı').reduce((a,r)=>a+Number(r.amount),0)}});
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),'Kayıtlar');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(summary),'Özet');XLSX.writeFile(wb,`Tur-Butcesi-${today}.xlsx`);
  };

  return <>
    <header>
      <div className="brand"><div className="brand-mark"><Icon name="wallet" size={22}/></div><div><strong>Tur Bütçem</strong><span>Özel finans çalışma alanı</span></div></div>
      <ThemeSwitcher/>
      <div className="header-actions"><select className="currency" value={currency} onChange={e=>{setCurrency(e.target.value);setSelectedIds([])}}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select><button className="btn secondary desktop" onClick={exportExcel}><Icon name="download"/>Excel'e aktar</button><button className="btn primary" onClick={()=>setModal(true)}><Icon name="plus"/>Yeni kayıt</button></div>
    </header>
    <main className="main-dashboard">
      {error&&<p className="system-error">D1 bağlantı hatası: {error}</p>}
      <section className="dashboard">
        <div className="kpis"><article><span>Toplam gelir</span><strong>{money(income,currency)}</strong><small>{active.filter(r=>INCOME_TYPES.has(r.type)).length} gelir kaydı</small></article><article><span>Tur masrafı</span><strong>{money(expense,currency)}</strong><small>{active.filter(r=>r.type==='Tur Masrafı').length} gider kaydı</small></article><article className="net"><span>Net kazanç</span><strong>{money(income-expense,currency)}</strong><small>Gelir eksi masraf</small></article><article className="pending"><span>Alınmayı bekleyen</span><strong>{money(pending,currency)}</strong><small>{active.filter(r=>INCOME_TYPES.has(r.type)&&r.status==='Alınmadı').length} açık tahsilat</small></article></div>
        <AnalyticsChart rows={rows} currency={currency}/>
      </section>

      <section className="workspace-grid">
        <section className="records workspace-records">
          <div className="records-head">
            <div><span className="eyebrow">KAYITLAR</span><h2>Son hareketler</h2></div>
            <div className="records-tools">
              <div className="filter"><Icon name="filter" size={16}/><select value={filter} onChange={e=>{setFilter(e.target.value);setSelectedIds([])}}><option>Tümü</option>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <button type="button" className="btn secondary" onClick={toggleAllVisible} disabled={!visibleIds.length}>{allVisibleSelected?'Seçimi kaldır':'Tümünü seç'}</button>
              <button type="button" className="btn secondary" onClick={removeSelected} disabled={!selectedIds.length}><Icon name="trash"/>Seçilenleri sil{selectedIds.length?` (${selectedIds.length})`:''}</button>
              <button type="button" className="btn secondary records-import" onClick={()=>setIcsModal(true)}><Icon name="calendar"/>Google Calendar</button>
              <button type="button" className="btn primary records-add" onClick={()=>setModal(true)}><Icon name="plus"/>Yeni kayıt</button>
            </div>
          </div>
          <div className="mobile-record-actions"><button type="button" className="btn secondary" onClick={exportExcel}><Icon name="download"/>Excel</button><button type="button" className="btn secondary" onClick={toggleAllVisible} disabled={!visibleIds.length}>{allVisibleSelected?'Seçimi kaldır':'Tümünü seç'}</button><button type="button" className="btn secondary" onClick={removeSelected} disabled={!selectedIds.length}><Icon name="trash"/>Sil{selectedIds.length?` (${selectedIds.length})`:''}</button><button type="button" className="btn secondary" onClick={()=>setIcsModal(true)}><Icon name="upload"/>ICS aktar</button><button type="button" className="btn primary" onClick={()=>setModal(true)}><Icon name="plus"/>Yeni kayıt</button></div>
          <div className="table-scroll"><table><thead><tr><th style={{width:42,textAlign:'center'}}><input type="checkbox" aria-label="Tüm görünen kayıtları seç" checked={allVisibleSelected} onChange={toggleAllVisible}/></th><th>Tarih</th><th>Tur / Misafir</th><th>Tür</th><th>Durum</th><th className="right">Tutar</th><th/></tr></thead><tbody>
            {activeSorted.map(r=><tr key={r.id}><td style={{textAlign:'center'}}><input type="checkbox" aria-label={`${r.tour} kaydını seç`} checked={selectedIds.includes(r.id)} onChange={()=>toggleSelected(r.id)}/></td><td>{fmtDate(r.date)}</td><td><strong>{r.tour}</strong><span>{r.guest||r.note||'—'}</span></td><td><span className={`type type-${TYPES.indexOf(r.type)}`}>{r.type}</span></td><td><button className={`status ${['Alındı','Ödendi'].includes(r.status)?'done':'open'}`} onClick={()=>toggleStatus(r)}>{r.status}</button></td><td className="right amount">{money(r.amount,r.currency)}</td><td><button className="delete" onClick={()=>removeRecord(r)} aria-label="Sil"><Icon name="trash" size={17}/></button></td></tr>)}
            {loading&&<tr><td colSpan="7" className="empty">D1 kayıtları yükleniyor...</td></tr>}
            {!loading&&!active.length&&<tr><td colSpan="7" className="empty">Bu filtrede kayıt yok.</td></tr>}
          </tbody></table></div>
        </section>
        <CalendarView rows={rows}/>
      </section>
      <p className="privacy-note">Kayıtlar Cloudflare D1 veritabanında saklanır ve tüm cihazlarında aynı veriler görünür.</p>
    </main>
    {modal&&<EntryModal currency={currency} onClose={()=>setModal(false)} onSave={saveRecord}/>} 
    {icsModal&&<ICSImportModal onClose={()=>setIcsModal(false)} onImport={importCalendarRecords}/>} 
  </>;
}
