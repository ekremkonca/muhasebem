import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryTotals, currencyTotals, goalProgress, paidIncomeTotal} from './accountingSummary.js';
test('category totals convert each denomination before summing', () => {
 const rows = [{type:'Komisyon',amount:100,currency:'EUR'},{type:'Komisyon',amount:200,currency:'TRY'},{type:'Tur Masrafı',amount:20,currency:'USD'}];
 const rates = {EUR:50,TRY:1,USD:40};
 const totals = categoryTotals(rows,r=>r.amount*rates[r.currency]);
 assert.equal(totals.find(r=>r.type==='Komisyon').value,5200);
 assert.equal(totals.find(r=>r.type==='Tur Masrafı').value,800);
});
test('tip receipts and commission entitlements retain original currency', () => {
 const rows = [{type:'Bahşiş',amount:100,currency:'EUR',status:'Ödendi'}, {type:'Bahşiş',amount:50,currency:'EUR',status:'Ödenmedi',paid_amount:10}, {type:'Bahşiş',amount:30,currency:'USD',status:'Ödenmedi'}, {type:'Komisyon',amount:9,currency:'GBP',status:'Ödenmedi'}];
 assert.equal(currencyTotals(rows,'Bahşiş',true)[0].amount,110);
 assert.equal(currencyTotals(rows,'Bahşiş',true)[2].amount,0);
 assert.equal(currencyTotals(rows,'Komisyon')[1].amount,9);
});
test('net income includes paid tour income, tips and commissions only', () => {
 const rows = [
  {type:'Tur Geliri',amount:100,currency:'TRY',status:'Ödendi'},
  {type:'Bahşiş',amount:20,currency:'EUR',status:'Ödendi'},
  {type:'Komisyon',amount:30,currency:'USD',status:'Ödendi'},
  {type:'Bahşiş',amount:99,currency:'TRY',status:'Ödenmedi'},
  {type:'Tur Masrafı',amount:25,currency:'TRY',status:'Ödendi'},
 ];
 const rates = {TRY:1, EUR:50, USD:40};
 assert.equal(paidIncomeTotal(rows, row => row.amount * rates[row.currency]), 2300);
});
test('goal reflects edits, losses and target overflow without stale snapshots', () => {
 assert.deepEqual(goalProgress(500,1000),{current:500,percent:50});
 assert.deepEqual(goalProgress(800,1000),{current:800,percent:80});
 assert.deepEqual(goalProgress(-10,1000),{current:-10,percent:0});
 assert.equal(goalProgress(2000,1000).percent,100);
});
