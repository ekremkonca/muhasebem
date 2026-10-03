import test from 'node:test';
import assert from 'node:assert/strict';
import { withTourPlans } from './tourCalendar.js';

test('manuel plan bulunan güne ikinci tur planı eklemez', () => {
  const events = [{ id: 'manual', date: '2026-06-12', title: 'Efes turu', company: '' }];
  const rows = [{ id: 'tour-1', date: '2026-06-12', type: 'Tur Geliri', agency: 'ABC Travel' }];
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

test('yalnızca 2026 Nisan-Ekim sezonunu takvime yansıtır', () => {
  const rows = [
    { id: 'march', date: '2026-03-31', type: 'Tur Geliri', agency: 'A' },
    { id: 'april', date: '2026-04-01', type: 'Tur Geliri', agency: 'B' },
    { id: 'october', date: '2026-10-31', type: 'Tur Geliri', agency: 'C' },
    { id: 'november', date: '2026-11-01', type: 'Tur Geliri', agency: 'D' },
  ];
  assert.deepEqual(withTourPlans([], rows).map(event => event.date), ['2026-04-01', '2026-10-31']);
});
