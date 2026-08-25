import React, { useMemo, useRef, useState } from 'react';

const TYPES = ['Tur Geliri', 'Tur Masrafı', 'Bahşiş', 'Komisyon'];
const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];
const INCOME_TYPES = new Set(['Tur Geliri', 'Bahşiş', 'Komisyon']);

const unescapeIcs = (value = '') => value
  .replace(/\\n/gi, '\n')
  .replace(/\\,/g, ',')
  .replace(/\\;/g, ';')
  .replace(/\\\\/g, '\\')
  .trim();

function unfoldIcs(text) {
  return String(text || '').replace(/\r?\n[ \t]/g, '');
}

function readProperty(block, name) {
  const match = block.match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'mi'));
  return match ? unescapeIcs(match[1]) : '';
}

function dateFromIcs(value) {
  const match = String(value || '').match(/(\d{4})(\d{2})(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function stableHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function parseLocalizedNumber(raw) {
  let value = String(raw || '').replace(/\s/g, '');
  if (!value) return 0;
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.';
    const thousands = decimal === ',' ? /\./g : /,/g;
    value = value.replace(thousands, '').replace(decimal, '.');
  } else if (lastComma >= 0) {
    const decimals = value.length - lastComma - 1;
    value = decimals > 0 && decimals <= 2 ? value.replace(',', '.') : value.replace(/,/g, '');
  } else if (lastDot >= 0) {
    const decimals = value.length - lastDot - 1;
    value = decimals > 0 && decimals <= 2 ? value : value.replace(/\./g, '');
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function currencyFromToken(token = '') {
  const upper = token.toUpperCase();
  if (upper.includes('USD') || token.includes('$')) return 'USD';
  if (upper.includes('EUR') || token.includes('€')) return 'EUR';
  if (upper.includes('GBP') || token.includes('£')) return 'GBP';
  return 'TRY';
}

function detectMoney(text) {
  const pattern = /(TRY|TL|₺|USD|US\$|\$|EUR|€|GBP|£)\s*([0-9][0-9\s.,]*)|([0-9][0-9\s.,]*)\s*(TRY|TL|₺|USD|US\$|\$|EUR|€|GBP|£)/gi;
  let match;
  while ((match = pattern.exec(text))) {
    const token = match[1] || match[4] || '';
    const amount = parseLocalizedNumber(match[2] || match[3]);
    if (amount > 0) return { amount, currency: currencyFromToken(token) };
  }
  return { amount: 0, currency: 'TRY' };
}

function inferType(text) {
  const value = text.toLocaleLowerCase('tr-TR');
  if (/(bahşiş|bahsis|tip\b|gratuity)/i.test(value)) return 'Bahşiş';
  if (/(komisyon|commission)/i.test(value)) return 'Komisyon';
  if (/(masraf|gider|expense|yakıt|yakit|fuel|otopark|parking|bilet|ticket|yemek|lunch|dinner)/i.test(value)) return 'Tur Masrafı';
  return 'Tur Geliri';
}

function inferStatus(type, text) {
  const value = text.toLocaleLowerCase('tr-TR');
  const done = /(alındı|alindi|tahsil|received|ödendi|odendi|paid)/i.test(value);
  if (INCOME_TYPES.has(type)) return done ? 'Alındı' : 'Alınmadı';
  return done ? 'Ödendi' : 'Ödenmedi';
}

function inferGuest(text) {
  const match = text.match(/(?:misafir|guest)\s*[:\-]\s*([^\n,;]+)/i);
  return match ? match[1].trim().slice(0, 120) : '';
}

function parseEvents(text) {
  const source = unfoldIcs(text);
  const blocks = source.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

  return blocks.map((block, index) => {
    if (/^STATUS:CANCELLED$/mi.test(block)) return null;
    const summary = readProperty(block, 'SUMMARY') || 'Google Calendar kaydı';
    const description = readProperty(block, 'DESCRIPTION');
    const location = readProperty(block, 'LOCATION');
    const uid = readProperty(block, 'UID') || `${summary}-${index}`;
    const date = dateFromIcs(readProperty(block, 'DTSTART'));
    const combined = [summary, description, location].filter(Boolean).join('\n');
    const money = detectMoney(combined);
    const type = inferType(combined);
    const status = inferStatus(type, combined);
    const noteParts = [];
    if (description) noteParts.push(description);
    if (location) noteParts.push(`Konum: ${location}`);
    const id = `ics-${stableHash(`${uid}|${date}`)}`;

    return {
      id,
      date,
      tour: summary.slice(0, 180),
      guest: inferGuest(combined),
      type,
      amount: money.amount,
      currency: money.currency,
      status,
      note: noteParts.join(' · ').slice(0, 500),
      selected: Boolean(date && money.amount > 0),
      confidence: money.amount > 0 ? (/bahşiş|bahsis|tip|gratuity|komisyon|commission|masraf|gider|expense/i.test(combined) ? 'Yüksek' : 'Orta') : 'Kontrol gerekli',
    };
  }).filter(Boolean);
}

export default function ICSImportModal({ onClose, onImport }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => items.filter(item => item.selected), [items]);
  const validSelected = selected.filter(item => item.date && item.tour.trim() && Number(item.amount) > 0 && CURRENCIES.includes(item.currency) && TYPES.includes(item.type));

  const update = (id, key, value) => setItems(current => current.map(item => item.id === id ? { ...item, [key]: value } : item));

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    if (!file.name.toLowerCase().endsWith('.ics') && file.type !== 'text/calendar') {
      setError('Lütfen Google Calendar’dan dışa aktarılmış bir .ics dosyası seç.');
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseEvents(text);
      if (!parsed.length) throw new Error('Dosyada aktarılabilir takvim etkinliği bulunamadı.');
      setFileName(file.name);
      setItems(parsed);
    } catch (err) {
      setItems([]);
      setError(err.message || 'ICS dosyası okunamadı.');
    }
  };

  const submit = async () => {
    if (!validSelected.length || saving) return;
    setSaving(true);
    setError('');
    try {
      await onImport(validSelected.map(({ selected: _selected, confidence: _confidence, ...record }) => ({ ...record, amount: Number(record.amount) })));
      onClose();
    } catch (err) {
      setError(err.message || 'Takvim kayıtları D1’e aktarılamadı.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && !saving && onClose()}>
    <div className="modal ics-modal" role="dialog" aria-modal="true" aria-label="Google Calendar ICS aktarımı">
      <div className="modal-head">
        <div><span className="eyebrow">GOOGLE CALENDAR</span><h2>Akıllı ICS içe aktar</h2></div>
        <button type="button" className="icon-btn" onClick={onClose} disabled={saving} aria-label="Kapat">×</button>
      </div>

      <p className="ics-intro">Google Calendar’dan dışa aktardığın <strong>.ics</strong> dosyasını seç. Sistem tarih, tur adı, işlem türü, tutar ve para birimini metinden tahmin eder; hiçbir kayıt önizleme ve onay olmadan D1’e yazılmaz.</p>

      <input ref={inputRef} type="file" accept=".ics,text/calendar" hidden onChange={e => handleFile(e.target.files?.[0])}/>
      <button type="button" className="ics-drop" onClick={() => inputRef.current?.click()} disabled={saving}>
        <strong>{fileName || 'ICS dosyası seç'}</strong>
        <span>{fileName ? 'Başka dosya seçmek için tıkla' : 'Google Calendar → Ayarlar → İçe aktarma ve dışa aktarma → Dışa aktar'}</span>
      </button>

      {error && <p className="ics-error">{error}</p>}

      {!!items.length && <>
        <div className="ics-stats">
          <span><strong>{items.length}</strong> etkinlik bulundu</span>
          <span><strong>{selected.length}</strong> seçili</span>
          <span><strong>{items.filter(x => !x.amount).length}</strong> tutar kontrolü gerekli</span>
        </div>

        <div className="ics-preview">
          {items.map(item => <article className={`ics-row${item.amount ? '' : ' needs-review'}`} key={item.id}>
            <label className="ics-check"><input type="checkbox" checked={item.selected} onChange={e => update(item.id, 'selected', e.target.checked)}/></label>
            <div className="ics-fields">
              <input type="date" value={item.date} onChange={e => update(item.id, 'date', e.target.value)}/>
              <input className="ics-tour" value={item.tour} onChange={e => update(item.id, 'tour', e.target.value)} aria-label="Tur adı"/>
              <select value={item.type} onChange={e => update(item.id, 'type', e.target.value)}>{TYPES.map(type => <option key={type}>{type}</option>)}</select>
              <input type="number" min="0" step="0.01" value={item.amount || ''} placeholder="Tutar" onChange={e => update(item.id, 'amount', e.target.value)}/>
              <select value={item.currency} onChange={e => update(item.id, 'currency', e.target.value)}>{CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}</select>
            </div>
            <div className="ics-row-meta"><span>{item.confidence}</span>{!item.amount && <b>Tutar gir</b>}</div>
          </article>)}
        </div>
      </>}

      <div className="modal-actions ics-actions">
        <button type="button" className="btn secondary" onClick={onClose} disabled={saving}>Vazgeç</button>
        <button type="button" className="btn primary" disabled={!validSelected.length || saving} onClick={submit}>{saving ? 'D1’e aktarılıyor...' : `${validSelected.length || 0} kaydı D1’e aktar`}</button>
      </div>
    </div>
  </div>;
}
