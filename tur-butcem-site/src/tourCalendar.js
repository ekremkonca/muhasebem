// Calendar projections are display-only: never create another financial entry.
export function withTourPlans(events = [], rows = []) {
  const seasonStart = '2026-04-01';
  const seasonEnd = '2026-10-31';
  const occupiedDates = new Set(events.map(event => event.date).filter(Boolean));
  const linked = new Set(events.map(e => String(e.linked_record_id || '')).filter(Boolean));
  const toursByDate = new Map();

  for (const row of rows) {
    if (row.type !== 'Tur Geliri' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date || '')) continue;
    if (row.date < seasonStart || row.date > seasonEnd) continue;
    if (linked.has(String(row.id)) || occupiedDates.has(row.date)) continue;

    const company = String(row.agency || '').trim() || 'Acenta belirtilmemiş';
    const day = toursByDate.get(row.date) || { rowId: row.id, companies: new Set() };
    day.companies.add(company);
    toursByDate.set(row.date, day);
  }

  const plans = [];
  for (const [date, day] of toursByDate) {
    const title = [...day.companies].join(' · ');
    plans.push({id: `tour-record-${day.rowId}`, date, title,
      company: '', time: '', status: 'Planlandı', category: 'Plan',
      recurrence: 'Yok', fromTourRecord: true});
  }
  return [...events, ...plans];
}
