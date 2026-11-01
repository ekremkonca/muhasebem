import test from'node:test';
import assert from'node:assert/strict';
import{summarizeSeason}from'../functions/api/seasons.js';

test('sezon arşivi ödenen gelirleri, masrafı ve kalan alacağı dondurur',()=>{
 const rows=[
  {type:'Tur Geliri',amount:100,currency:'EUR',status:'Ödendi',paid_amount:100},
  {type:'Tur Geliri',amount:2000,currency:'TRY',status:'Ödenmedi',paid_amount:500},
  {date:'2027-05-01',type:'Bahşiş',amount:20,currency:'USD',status:'Ödendi',paid_amount:20},
  {date:'2027-05-01',type:'Komisyon',amount:300,currency:'TRY',status:'Ödendi',paid_amount:300},
  {type:'Tur Masrafı',amount:400,currency:'TRY',status:'Ödendi',paid_amount:400},
  {type:'Tur Geliri',amount:900,currency:'TRY',status:'İade edildi',paid_amount:0},
 ];
 const result=summarizeSeason(rows,{TRY:1,EUR:50,USD:40,GBP:60},'2027-01-01');
 assert.equal(result.tourIncome,5000);
 assert.equal(result.tips,800);
 assert.equal(result.commission,300);
 assert.equal(result.expense,400);
 assert.equal(result.net,4900);
 assert.equal(result.recordedNet,5700);
 assert.equal(result.receivable,1500);
 assert.equal(result.tourCount,2);
});
