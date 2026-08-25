import React, { useMemo, useState } from 'react';

const TYPE_META = {
  'Tur Geliri': { label: 'Gelir', className: 'series-income' },
  'Tur Masrafı': { label: 'Gider', className: 'series-expense' },
  'Bahşiş': { label: 'Bahşiş', className: 'series-tip' },
  'Komisyon': { label: 'Komisyon', className: 'series-commission' },
};

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = isoDate(new Date());
const fmtMoney = (n, currency) => new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(Number(n) || 0);

function buildCalendar(viewDate) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return {
      date: d,
      key: isoDate(d),
      currentMonth: d.getMonth() === viewDate.getMonth(),
    };
  });
}

export default function CalendarView({ rows }) {
  const now = new Date();
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  const byDate = useMemo(() => rows.reduce((map, row) => {
    if (!map[row.date]) map[row.date] = [];
    map[row.date].push(row);
    return map;
  }, {}), [rows]);

  const days = useMemo(() => buildCalendar(viewDate), [viewDate]);
  const selectedRows = (byDate[selectedDate] || []).slice().sort((a, b) => b.amount - a.amount);
  const monthLabel = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(viewDate);
  const selectedLabel = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${selectedDate}T12:00:00`));

  const moveMonth = (delta) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const goToday = () => {
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(today);
  };

  return <section className="calendar-panel">
    <div className="calendar-head">
      <div>
        <span className="eyebrow">TAKVİM</span>
        <h2>Tüm kayıtlar</h2>
      </div>
      <div className="calendar-nav">
        <button type="button" onClick={() => moveMonth(-1)} aria-label="Önceki ay">‹</button>
        <strong>{monthLabel}</strong>
        <button type="button" onClick={() => moveMonth(1)} aria-label="Sonraki ay">›</button>
        <button type="button" className="today-btn" onClick={goToday}>Bugün</button>
      </div>
    </div>

    <div className="calendar-layout">
      <div className="calendar-wrap">
        <div className="calendar-weekdays">
          {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="calendar-grid">
          {days.map((day) => {
            const records = byDate[day.key] || [];
            const visibleTypes = [...new Set(records.map((row) => row.type))].slice(0, 4);
            return <button
              type="button"
              key={day.key}
              className={`calendar-day${day.currentMonth ? '' : ' muted'}${day.key === today ? ' today' : ''}${day.key === selectedDate ? ' selected' : ''}`}
              onClick={() => setSelectedDate(day.key)}
            >
              <span className="day-number">{day.date.getDate()}</span>
              {records.length > 0 && <>
                <div className="calendar-dots">
                  {visibleTypes.map((type) => <i key={type} className={TYPE_META[type]?.className || ''}/>) }
                </div>
                <small>{records.length} kayıt</small>
              </>}
            </button>;
          })}
        </div>
      </div>

      <aside className="calendar-details">
        <div className="calendar-details-head">
          <div><span>Seçilen gün</span><strong>{selectedLabel}</strong></div>
          <b>{selectedRows.length}</b>
        </div>
        <div className="calendar-record-list">
          {selectedRows.map((row) => {
            const meta = TYPE_META[row.type] || { label: row.type, className: '' };
            return <article key={row.id}>
              <i className={meta.className}/>
              <div>
                <strong>{row.tour}</strong>
                <span>{row.guest || row.note || meta.label}</span>
              </div>
              <div className="calendar-record-amount">
                <strong>{fmtMoney(row.amount, row.currency)}</strong>
                <span>{meta.label}</span>
              </div>
            </article>;
          })}
          {!selectedRows.length && <p className="calendar-empty">Bu tarihte kayıt yok.</p>}
        </div>
      </aside>
    </div>
  </section>;
}
