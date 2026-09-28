import React, {useState} from 'react';

export default function FundEditModal({fund, portfolio, onSave, onClose, saving}) {
  const [units,setUnits]=useState(String(portfolio.units));
  const [average,setAverage]=useState(String(portfolio.averagePrice));
  const [manualPrice,setManualPrice]=useState(String(fund.lastManualPrice||''));
  const [error,setError]=useState('');
  async function save(event) {
    event.preventDefault();
    const quantity=Number(units), cost=Number(average), price=manualPrice===''?0:Number(manualPrice);
    if(!Number.isFinite(quantity)||quantity<0||!Number.isFinite(cost)||cost<0||!Number.isFinite(price)||price<0){setError('Fon adedi, ortalama maliyet ve işlem fiyatı sıfır veya pozitif bir sayı olmalı.');return;}
    try {await onSave({...fund,manualUnits:quantity,manualAveragePrice:cost,lastManualPrice:price});onClose();}
    catch(e){setError(e.message||'Fon kaydedilemedi.');}
  }
  return <div className="asset-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)onClose()}}>
    <form className="asset-editor-modal" role="dialog" aria-modal="true" aria-label="ALE fon hesabını yönet" onSubmit={save}>
      <div className="asset-editor-head"><div><span className="eyebrow">ALE PORTFÖY YÖNETİMİ</span><h3>Tüm fon bilgilerini manuel düzenle</h3></div><button type="button" className="asset-modal-close" onClick={onClose} disabled={saving} aria-label="Kapat">×</button></div>
      <div className="asset-form-grid"><label>Toplam fon adedi<input type="number" min="0" step="0.000001" value={units} onChange={e=>setUnits(e.target.value)} required disabled={saving}/></label><label>Ortalama alış maliyeti (TL)<input type="number" min="0" step="0.000001" value={average} onChange={e=>setAverage(e.target.value)} required disabled={saving}/></label><label>Son manuel işlem fiyatı (TL)<input type="number" min="0" step="0.000001" value={manualPrice} onChange={e=>setManualPrice(e.target.value)} placeholder="Bankadaki alış / satış fiyatın" disabled={saving}/></label></div>
      <div className="asset-editor-note">Bu ekranda yazdığın adet ve ortalama maliyet hesabın esas kaydı olur. Eski fon hareketleri korunur, silinmez. Son manuel işlem fiyatı referans için saklanır. TEFAS yalnızca fonun güncel piyasa değerini gösterir; buradaki alanları otomatik değiştirmez.</div>
      {error&&<p className="asset-editor-error" role="alert">{error}</p>}
      <div className="asset-editor-actions"><button type="button" className="asset-edit-btn secondary" onClick={onClose} disabled={saving}>Vazgeç</button><button className="asset-edit-btn primary" disabled={saving}>{saving?'Kaydediliyor…':'Tümünü kaydet'}</button></div>
    </form>
  </div>;
}
