// Calendar projections are display-only: never create another financial entry.
export function withTourPlans(events = [], rows = []) {
  const normalize = value => String(value || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
  const key = (date, company) => `${date}|${normalize(company)}`;
  const occupied = new Set(events.map(e => key(e.date, e.company || e.title)));
  const linked = new Set(events.map(e => String(e.linked_record_id || '')).filter(Boolean));
  const plans = [];
  for (const row of rows) {
    if (row.type !== 'Tur Geliri' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date || '')) continue;
    const company = String(row.agency || '').trim() || 'Acenta belirtilmemiş';
    const identity = key(row.date, company);
    if (linked.has(String(row.id)) || occupied.has(identity)) continue;
    occupied.add(identity);
    plans.push({id: `tour-record-${row.id}`, date: row.date, title: company,
      company: '', time: '', status: 'Planlandı', category: 'Plan',
      recurrence: 'Yok', fromTourRecord: true});
  }
  return [...events, ...plans];
}
