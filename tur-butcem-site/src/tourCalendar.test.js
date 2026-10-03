import test from 'node:test';
import assert from 'node:assert/strict';
import { withTourPlans } from './tourCalendar.js';

test('manuel plan bulunan güne ikinci tur planı eklemez', () => {
  const events = [{ id: 'manual', date: '2026-10-22T00:00:00.000Z', title: 'Efes turu', company: '' }];
  const rows = [{ id: 'tour-1', date: '2026-10-22', type: 'Tur Geliri', agency: 'ABC Travel' }];
  assert.deepEqual(withTourPlans(events, rows), events);
});

test('aynı günün acentalarını tek otomatik planda birleştirir', () => {
  const rows = [
    { id: 'tour-1', date: '2026-07-10', type: 'Tur Geliri', agency: 'ABC Travel' },
    { id: 'tour-2', date: '2026-07-10', type: 'Tur Geliri', agency: 'XYZ Turizm' },
    { id: 'tour-3', date: '2026-07-10', type: 'Tur Geliri', agency: 'ABC Travel' },
  ];
  const result = withTourPlans([], rows);
  assert.equal(result.length, 1);
  assert.equal(result[0].date, '2026-07-10');
  assert.equal(result[0].title, 'ABC Travel · XYZ Turizm');
});

test('2026 yılının tamamını takvime yansıtır', () => {
  const rows = [
    { id: 'previous', date: '2025-12-31', type: 'Tur Geliri', agency: 'A' },
    { id: 'january', date: '2026-01-01', type: 'Tur Geliri', agency: 'B' },
    { id: 'october', date: '2026-10-22', type: 'Tur Geliri', agency: 'C' },
    { id: 'december', date: '2026-12-31', type: 'Tur Geliri', agency: 'D' },
    { id: 'next', date: '2027-01-01', type: 'Tur Geliri', agency: 'E' },
  ];
  assert.deepEqual(withTourPlans([], rows).map(event => event.date), ['2026-01-01', '2026-10-22', '2026-12-31']);
});
