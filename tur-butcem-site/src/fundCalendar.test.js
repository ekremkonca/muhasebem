import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustFundDailyMetrics, fundDailyDisplayFactor } from './fundCalendar.js';

test('cumartesi ve pazar fon kazancini sifirlar', () => {
  assert.deepEqual(fundDailyDisplayFactor('2026-08-29', '2026-08-28'), { factor: 0, mode: 'weekend' });
  assert.deepEqual(fundDailyDisplayFactor('2026-08-30', '2026-08-28'), { factor: 0, mode: 'weekend' });
});

test('pazartesi yeni fiyat beklenirken cuma degerini iki kat gosterir', () => {
  assert.deepEqual(
    adjustFundDailyMetrics({ profit: 100, returnRate: 0.1, todayIso: '2026-08-31', publishedDate: '2026-08-28' }),
    { factor: 2, mode: 'monday-pending', profit: 200, returnRate: 0.2 },
  );
});

test('pazartesi fiyati yayimlaninca gercek farka ek carpim uygulamaz', () => {
  assert.deepEqual(fundDailyDisplayFactor('2026-08-31', '2026-08-31'), { factor: 1, mode: 'normal' });
});

test('normal islem gunlerinde degeri degistirmez', () => {
  assert.deepEqual(fundDailyDisplayFactor('2026-09-01', '2026-09-01'), { factor: 1, mode: 'normal' });
});
