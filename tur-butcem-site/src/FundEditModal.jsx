import React, {useState} from 'react';

export default function FundEditModal({fund, portfolio, onSave, onClose, saving}) {
  const [units,setUnits]=useState(String(portfolio.units));
  const [cost,setCost]=useState(String(portfolio.averagePrice));
  const [error,setError]=useState('');
  async function save(event) {
    event.preventDefault();
    const quantity=Number(units), average=Number(cost);
    if(!Number.isFinite(quantity)||quantity<0||!Number.isFinite(average)||average<0){setError('Adet ve maliyet sıfır veya pozitif bir sayı olmalı.');return;}
    if(!window.confirm('Fon hesabı girdiğin adet ve maliyetle yeniden başlayacak. Eski fon hareketleri temizlenecek. Kaydedilsin mi?'))return;
    try {await onSave({...fund,baseUnits:quantity,baseAveragePrice:average,transactions:[]});onClose();}
    catch(e){setError(e.message||'Fon kaydedilemedi.');}
  }
  async function reset() {
    if(!window.confirm('Fon adedi, maliyeti ve tüm fon hareketleri sıfırlansın mı? Fon kutusu kalacak; yeniden manuel giriş yapabilirsin.'))return;
    try{await onSave({...fund,baseUnits:0,baseAveragePrice:0,transactions:[]});onClose();}
    catch(e){setError(e.message||'Fon sıfırlanamadı.');}
  }
  return <div className="asset-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)onClose()}}>
    <form className="asset-editor-modal" role="dialog" aria-modal="true" aria-label="Fon hesabını düzenle" onSubmit={save}>
      <div className="asset-editor-head"><div><span className="eyebrow">FON HESABI</span><h3>{fund.fundCode} · Fon hesabını düzenle</h3></div><button type="button" className="asset-modal-close" onClick={onClose} disabled={saving} aria-label="Kapat">×</button></div>
      <div className="asset-form-grid"><label>Toplam fon adedi<input type="number" min="0" step="any" value={units} onChange={e=>setUnits(e.target.value)} required disabled={saving}/></label><label>Ortalama alış fiyatı (TL)<input type="number" min="0" step="any" value={cost} onChange={e=>setCost(e.target.value)} required disabled={saving}/></label></div>
      <div className="asset-editor-note">Bu bilgiler yeni başlangıç bakiyen olur ve eski fon hareketlerini temizler. Güncel değer TEFAS fiyatıyla, kâr/zarar girdiğin maliyetle yeniden hesaplanır. Sonraki alım ve satımlar için “İşlem” düğmesini kullan.</div>
      {error&&<p className="asset-editor-error" role="alert">{error}</p>}
      <div className="asset-editor-actions"><button type="button" className="asset-edit-btn secondary" onClick={reset} disabled={saving}>Hesabı sıfırla</button><button type="button" className="asset-edit-btn secondary" onClick={onClose} disabled={saving}>Vazgeç</button><button className="asset-edit-btn primary" disabled={saving}>{saving?'Kaydediliyor…':'Kaydet ve hesapla'}</button></div>
    </form>
  </div>;
}
