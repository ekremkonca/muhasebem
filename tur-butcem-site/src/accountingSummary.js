export const CATEGORY_TYPES = ['Tur Geliri', 'Tur Masrafı', 'Komisyon', 'Bahşiş'];
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
export const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;
export function categoryTotals(rows, convert) {
  return CATEGORY_TYPES.map(type => ({type, value: roundMoney(rows.filter(r => r.type === type).reduce((sum, r) => sum + convert(r), 0))}));
}
export function currencyTotals(rows, type, receivedOnly = false) {
  return ['EUR', 'GBP', 'USD', 'TRY'].map(code => ({code, amount: roundMoney(rows
    .filter(r => r.type === type && String(r.currency || 'TRY').trim().toUpperCase() === code)
    .reduce((sum, r) => sum + (receivedOnly ? r.status === 'Ödendi' ? number(r.amount) : r.status === 'İade edildi' ? 0 : Math.min(number(r.amount), Math.max(0, number(r.paid_amount))) : number(r.amount)), 0))}));
}
export function goalProgress(net, target) {
  return {current: number(net), percent: number(target) > 0 ? Math.max(0, Math.min(100, number(net) / number(target) * 100)) : 0};
}

const INCOME_TYPES = new Set(['Tur Geliri', 'Bahşiş', 'Komisyon']);
export function seasonMetrics(rows, convert, convertOutstanding) {
  const paid = rows.filter(row => row.status === 'Ödendi');
  const tourIncome = paid
    .filter(row => row.type === 'Tur Geliri')
    .reduce((sum, row) => sum + convert(row), 0);
  const expense = paid
    .filter(row => row.type === 'Tur Masrafı')
    .reduce((sum, row) => sum + convert(row), 0);
  const pending = rows
    .filter(row => row.status === 'Ödenmedi' && INCOME_TYPES.has(row.type))
    .reduce((sum, row) => sum + convertOutstanding(row), 0);
  const tourCount = new Set(rows
    .filter(row => row.type === 'Tur Geliri' && row.status !== 'İade edildi' && number(row.amount) > 0)
    .map(row => row.date)).size;
  return { tourIncome: roundMoney(tourIncome), expense: roundMoney(expense), pending: roundMoney(pending), tourCount };
}
