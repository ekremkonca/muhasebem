// Calendar projections are display-only: never create another financial entry.
export function withTourPlans(events = [], rows = []) {
  const seasonYear = '2026';
  const dayKey = value => String(value || '').trim().slice(0, 10);
  const occupiedDates = new Set(events.map(event => dayKey(event.date)).filter(Boolean));
  const linked = new Set(events.map(e => String(e.linked_record_id || '')).filter(Boolean));
  const toursByDate = new Map();
  const agenciesByDate = new Map();

  for (const row of rows) {
    const date = dayKey(row.date);
    const agency = String(row.agency || '').trim();
    if (!date.startsWith(`${seasonYear}-`) || !agency) continue;
    const agencies = agenciesByDate.get(date) || new Set();
    agencies.add(agency);
    agenciesByDate.set(date, agencies);
  }

  for (const row of rows) {
    const date = dayKey(row.date);
    if (row.type !== 'Tur Geliri' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!date.startsWith(`${seasonYear}-`)) continue;
    if (linked.has(String(row.id)) || occupiedDates.has(date)) continue;

    const day = toursByDate.get(date) || { rowId: row.id, companies: new Set() };
    const directAgency = String(row.agency || '').trim();
    const sameDayAgencies = agenciesByDate.get(date);
    if (directAgency) day.companies.add(directAgency);
    else if (sameDayAgencies?.size) sameDayAgencies.forEach(agency => day.companies.add(agency));
    else {
      const legacyLabel = [row.ship, row.guest, row.tour]
        .map(value => String(value || '').trim())
        .find(Boolean);
      day.companies.add(legacyLabel || 'Tur planı');
    }
    toursByDate.set(date, day);
  }

  const plans = [];
  for (const [date, day] of toursByDate) {
    const title = [...day.companies].join(' · ');
    plans.push({id: `tour-record-${day.rowId}`, date, title,
      company: '', time: '', status: 'Kesinleşti', category: 'Tur Geliri',
      recurrence: 'Yok', fromTourRecord: true});
  }
  return [...events, ...plans];
}
