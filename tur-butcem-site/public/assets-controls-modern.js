(() => {
  const qs = (root, selector) => root?.querySelector(selector);
  const qsa = (root, selector) => [...(root?.querySelectorAll(selector) || [])];

  function dispatchChange(el, value) {
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function modernButton(button, kind) {
    if (!button) return;
    const isDeposit = kind === 'deposit';
    button.classList.add('asset-action-modern', isDeposit ? 'deposit-action-modern' : 'fund-action-modern');
    const expected = isDeposit ? 'Mevduatı Düzenle' : 'Fon İşlemi';
    if (qs(button, 'b')?.textContent === expected) return;
    button.innerHTML = isDeposit
      ? '<span class="asset-action-icon">✎</span><span class="asset-action-copy"><b>Mevduatı Düzenle</b><small>Faiz ve vade bilgileri</small></span><span class="asset-action-arrow">›</span>'
      : '<span class="asset-action-icon">↕</span><span class="asset-action-copy"><b>Fon İşlemi</b><small>Alım / satım · adet</small></span><span class="asset-action-arrow">›</span>';
    button.setAttribute('aria-label', isDeposit ? 'Mevduatı manuel düzenle' : 'Fon alım satım işlemi ekle');
  }

  function rewriteField(label, title, help) {
    if (!label) return;
    const input = qs(label, 'input,select');
    if (!input) return;
    let caption = qs(label, '.asset-field-caption');
    if (!caption) {
      qsa(label, ':scope > .asset-field-help').forEach(n => n.remove());
      [...label.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).forEach(n => n.remove());
      caption = document.createElement('span');
      caption.className = 'asset-field-caption';
      label.insertBefore(caption, input);
    }
    caption.textContent = title;
    let hint = qs(label, '.asset-field-help');
    if (!hint) {
      hint = document.createElement('small');
      hint.className = 'asset-field-help';
      input.insertAdjacentElement('afterend', hint);
    }
    hint.textContent = help;
  }

  function enhanceDepositModal(modal) {
    if (!modal || modal.classList.contains('fund-movement-modal')) return;
    modal.classList.add('deposit-editor-modern');
    const head = qs(modal, '.asset-editor-head');
    const eyebrow = qs(head, '.eyebrow');
    const title = qs(head, 'h3');
    if (eyebrow && eyebrow.textContent !== 'MEVDUAT AYARLARI') eyebrow.textContent = 'MEVDUAT AYARLARI';
    if (title && title.textContent !== 'Mevduatı manuel güncelle') title.textContent = 'Mevduatı manuel güncelle';
    if (head && !qs(head, '.asset-editor-subtitle')) {
      const sub = document.createElement('p');
      sub.className = 'asset-editor-subtitle';
      sub.textContent = 'Bankadaki güncel mevduat koşullarını gir. Günlük net kazanç ve toplam tutar bundan sonra otomatik ilerler.';
      title?.insertAdjacentElement('afterend', sub);
    }

    const labels = qsa(modal, '.asset-form-grid label');
    const specs = [
      ['Banka', 'Mevduat hesabının bulunduğu banka'],
      ['Ana para', 'Vadeye bağladığın TL tutarı'],
      ['Yıllık brüt faiz', 'Bankanın verdiği yıllık faiz oranı (%)'],
      ['Başlangıç tarihi', 'Yeni vadenin başladığı gün'],
      ['Vade süresi', 'Toplam vade günü'],
      ['Stopaj', 'Faiz gelirinden kesilecek vergi (%)'],
    ];
    labels.forEach((label, i) => rewriteField(label, specs[i]?.[0] || 'Bilgi', specs[i]?.[1] || ''));

    const note = qs(modal, '.asset-editor-note');
    if (note) note.textContent = 'Kaydettiğinde günlük tahakkuk, net faiz, bugünkü toplam ve vade sonu değerleri otomatik yeniden hesaplanır.';
    const primary = qs(modal, '.asset-edit-btn.primary');
    if (primary && !primary.disabled && primary.textContent !== 'Mevduatı Kaydet') primary.textContent = 'Mevduatı Kaydet';
  }

  function findFundFields(grid) {
    const labels = qsa(grid, 'label');
    const typeLabel = labels.find(l => qs(l, 'select'));
    const typeSelect = qs(typeLabel, 'select');
    const dateLabel = labels.find(l => qs(l, 'input[type="date"]'));
    const numberLabels = labels.filter(l => qs(l, 'input[type="number"]'));
    const unitsLabel = numberLabels.find(l => /adet/i.test(l.textContent));
    const amountLabel = numberLabels.find(l => /tutar/i.test(l.textContent));
    const priceLabel = numberLabels.find(l => /fiyat|maliyet/i.test(l.textContent));
    const noteLabel = labels.find(l => /not/i.test(l.textContent));
    return { labels, typeLabel, typeSelect, dateLabel, unitsLabel, amountLabel, priceLabel, noteLabel };
  }

  function createTradeTabs(typeLabel, typeSelect) {
    const existing = typeLabel?.previousElementSibling;
    if (existing?.classList.contains('fund-trade-tabs')) return existing;
    const tabs = document.createElement('div');
    tabs.className = 'fund-trade-tabs';
    tabs.innerHTML = '<button type="button" data-trade="buy"><span class="trade-sign">＋</span><span><b>Fon Al</b><small>Portföye adet ekle</small></span></button><button type="button" data-trade="sell"><span class="trade-sign">−</span><span><b>Fon Sat</b><small>Portföyden adet çıkar</small></span></button>';
    typeLabel?.insertAdjacentElement('beforebegin', tabs);
    tabs.addEventListener('click', e => {
      const btn = e.target.closest('button[data-trade]');
      if (!btn || !typeSelect) return;
      dispatchChange(typeSelect, btn.dataset.trade);
      queueMicrotask(schedule);
    });
    return tabs;
  }

  function syncTradeTabs(tabs, typeSelect) {
    if (!tabs || !typeSelect) return;
    qsa(tabs, 'button[data-trade]').forEach(btn => btn.classList.toggle('active', btn.dataset.trade === typeSelect.value));
  }

  function enhanceFundModal(modal) {
    if (!modal) return;
    modal.classList.add('fund-trade-modern');
    const head = qs(modal, '.asset-editor-head');
    const eyebrow = qs(head, '.eyebrow');
    const title = qs(head, 'h3');
    const oldPortfolio = title?.textContent?.includes('adet') ? title.textContent.trim() : qs(head, '.asset-editor-subtitle')?.textContent?.trim();
    if (eyebrow && eyebrow.textContent !== 'ALE PORTFÖY İŞLEMİ') eyebrow.textContent = 'ALE PORTFÖY İŞLEMİ';
    if (title && title.textContent !== 'Fon alım / satım') title.textContent = 'Fon alım / satım';
    let subtitle = qs(head, '.asset-editor-subtitle');
    if (!subtitle && head) {
      subtitle = document.createElement('p');
      subtitle.className = 'asset-editor-subtitle';
      title?.insertAdjacentElement('afterend', subtitle);
    }
    if (subtitle && oldPortfolio && oldPortfolio !== 'Fon alım / satım') subtitle.textContent = oldPortfolio;

    const form = qs(modal, 'form');
    const grid = qs(form, '.asset-form-grid');
    if (!grid) return;
    const { typeLabel, typeSelect, dateLabel, unitsLabel, amountLabel, priceLabel, noteLabel } = findFundFields(grid);

    if (typeSelect) {
      qsa(typeSelect, 'option').forEach(opt => { if (!['buy', 'sell'].includes(opt.value)) opt.remove(); });
      if (!['buy', 'sell'].includes(typeSelect.value)) dispatchChange(typeSelect, 'buy');
    }

    const tabs = createTradeTabs(typeLabel, typeSelect);
    syncTradeTabs(tabs, typeSelect);
    typeLabel?.classList.add('asset-field-hidden');
    amountLabel?.classList.add('asset-field-hidden');
    priceLabel?.classList.add('asset-field-hidden');

    rewriteField(dateLabel, 'İşlem tarihi', 'Alım veya satım yaptığın gün');
    rewriteField(unitsLabel, 'Fon adedi', typeSelect?.value === 'sell' ? 'Portföyden çıkarılacak ALE adedi' : 'Portföye eklenecek ALE adedi');
    rewriteField(noteLabel, 'Not', 'İstersen kısa bir açıklama ekle');
    const unitsInput = qs(unitsLabel, 'input');
    if (unitsInput) {
      unitsInput.placeholder = 'Örn. 1.250';
      unitsInput.step = '0.001';
      unitsInput.inputMode = 'decimal';
    }

    let summary = qs(form, '.fund-trade-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'fund-trade-summary';
      grid.insertAdjacentElement('afterend', summary);
    }
    const priceInput = qs(priceLabel, 'input');
    const p = Number(priceInput?.value);
    const priceText = Number.isFinite(p) && p > 0 ? p.toLocaleString('tr-TR', { minimumFractionDigits: 6, maximumFractionDigits: 6 }) : '—';
    summary.innerHTML = `<span><small>İşlem fiyatı</small><b>${priceText} TL</b></span><span><small>Fiyat kaynağı</small><b>TEFAS otomatik</b></span><span><small>İşlem yönü</small><b>${typeSelect?.value === 'sell' ? 'Satış' : 'Alım'}</b></span>`;

    const note = qs(form, '.asset-editor-note');
    if (note) note.textContent = 'Sadece alım veya satım yönünü ve fon adedini gir. İşlem fiyatı ekrandaki güncel ALE / TEFAS fiyatından otomatik alınır.';
    const primary = qs(form, '.asset-edit-btn.primary');
    if (primary && !primary.disabled && primary.textContent !== 'Fon İşlemini Kaydet') primary.textContent = 'Fon İşlemini Kaydet';
  }

  function enhance() {
    const root = document.querySelector('.assets-fund-page');
    if (!root) return;
    modernButton(qs(root, '.deposit-side .asset-edit-trigger'), 'deposit');
    modernButton(qs(root, '.fund-side .asset-edit-trigger'), 'fund');
    qsa(document, '.asset-editor-modal').forEach(modal => {
      if (modal.classList.contains('fund-movement-modal')) enhanceFundModal(modal);
      else enhanceDepositModal(modal);
    });
  }

  let frame = 0;
  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(enhance);
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('popstate', schedule);
  addEventListener('hashchange', schedule);
  addEventListener('load', schedule);
  schedule();
})();