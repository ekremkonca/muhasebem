// Calendar projections are display-only: never create another financial entry.
export function withTourPlans(events = [], rows = []) {
  const seasonYear = '2026';
  const dayKey = value => String(value || '').trim().slice(0, 10);
  const occupiedDates = new Set(events.map(event => dayKey(event.date)).filter(Boolean));
  const linked = new Set(events.map(e => String(e.linked_record_id || '')).filter(Boolean));
  const toursByDate = new Map();

  for (const row of rows) {
    const date = dayKey(row.date);
    if (row.type !== 'Tur Geliri' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!date.startsWith(`${seasonYear}-`)) continue;
    if (linked.has(String(row.id)) || occupiedDates.has(date)) continue;

    const company = String(row.agency || '').trim() || 'Acenta belirtilmemiş';
    const day = toursByDate.get(date) || { rowId: row.id, companies: new Set() };
    day.companies.add(company);
    toursByDate.set(date, day);
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
