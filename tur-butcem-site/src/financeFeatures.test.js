import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCalendarEvent, normalizeRecord } from "../functions/_lib.js";

test("kısmi tahsilatı açık kayıt olarak tutar", () => {
  const record = normalizeRecord({
    id: "r1", date: "2026-08-31", tour: "Efes", type: "Tur Geliri",
    amount: 1000, paid_amount: 400, currency: "TRY", status: "Ödendi",
  });
  assert.equal(record.status, "Ödenmedi");
  assert.equal(record.paid_amount, 400);
});

test("tam tahsilatı otomatik kapatır", () => {
  const record = normalizeRecord({
    id: "r2", date: "2026-08-31", tour: "Meryem Ana", type: "Tur Geliri",
    amount: 1000, paid_amount: 1000, currency: "TRY", status: "Ödenmedi",
  });
  assert.equal(record.status, "Ödendi");
});

test("finansal takvim alanlarını doğrular", () => {
  const event = normalizeCalendarEvent({
    id: "e1", date: "2026-09-10", title: "Tahsilat", category: "Tahsilat",
    amount: 2500, currency: "EUR", recurrence: "Aylık",
  });
  assert.equal(event.category, "Tahsilat");
  assert.equal(event.amount, 2500);
  assert.equal(event.recurrence, "Aylık");
});
