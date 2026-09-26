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
