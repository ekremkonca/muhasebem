(() => {
  const isAssetsPage = () => Boolean(document.querySelector('.assets-fund-page'));
  const qs = (root, selector) => root?.querySelector(selector);
  const qsa = (root, selector) => [...(root?.querySelectorAll(selector) || [])];

  function dispatchChange(el, value) {
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function enhanceHeaderButtons(root) {
    const deposit = qs(root, '.deposit-side .asset-edit-trigger');
    if (deposit) {
      deposit.classList.add('asset-action-modern', 'deposit-action-modern');
      deposit.innerHTML = '<span class="asset-action-icon">✎</span><span><b>Mevduatı Düzenle</b><small>Faiz ve vade bilgileri</small></span>';
      deposit.setAttribute('aria-label', 'Mevduatı manuel düzenle');
    }

    const fund = qs(root, '.fund-side .asset-edit-trigger');
    if (fund) {
      fund.classList.add('asset-action-modern', 'fund-action-modern');
      fund.innerHTML = '<span class="asset-action-icon">↕</span><span><b>Fon İşlemi</b><small>Alım / satım · adet</small></span>';
      fund.setAttribute('aria-label', 'Fon alım satım işlemi ekle');
    }
  }

  function enhanceDepositModal(modal) {
    if (!modal || modal.dataset.modernDeposit === '1') return;
    if (modal.classList.contains('fund-movement-modal')) return;
    modal.dataset.modernDeposit = '1';
    modal.classList.add('deposit-editor-modern');

    const head = qs(modal, '.asset-editor-head');
    if (head) {
      const eyebrow = qs(head, '.eyebrow');
      const title = qs(head, 'h3');
      if (eyebrow) eyebrow.textContent = 'MEVDUAT AYARLARI';
      if (title) title.textContent = 'Mevduatı manuel güncelle';
      if (!qs(head, '.asset-editor-subtitle')) {
        const sub = document.createElement('p');
        sub.className = 'asset-editor-subtitle';
        sub.textContent = 'Bankadan aldığın yeni oran ve vade bilgilerini buraya gir. Günlük net getiri otomatik hesaplanır.';
        title?.insertAdjacentElement('afterend', sub);
      }
    }

    const labels = qsa(modal, '.asset-form-grid label');
    const meta = [
      ['Banka', 'Mevduat hesabının bankası'],
      ['Ana para (TL)', 'Vadeye bağlanan tutar'],
      ['Yıllık brüt faiz (%)', 'Bankanın verdiği yıllık oran'],
      ['Başlangıç tarihi', 'Vadenin başladığı gün'],
      ['Vade (gün)', 'Toplam vade süresi'],
      ['Stopaj (%)', 'Faiz gelirinden kesilen vergi'],
    ];
    labels.forEach((label, i) => {
      if (label.dataset.modernField === '1') return;
      label.dataset.modernField = '1';
      const input = qs(label, 'input,select');
      const title = meta[i]?.[0] || label.childNodes[0]?.textContent?.trim() || '';
      const help = meta[i]?.[1] || '';
      [...label.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).forEach(n => n.remove());
      const cap = document.createElement('span');
      cap.className = 'asset-field-caption';
      cap.textContent = title;
      const hint = document.createElement('small');
      hint.className = 'asset-field-help';
      hint.textContent = help;
      label.insertBefore(cap, input);
      input?.insertAdjacentElement('afterend', hint);
    });

    const note = qs(modal, '.asset-editor-note');
    if (note) note.textContent = 'Kaydettiğinde günlük tahakkuk, net faiz, bugünkü toplam ve vade sonu tutarı otomatik olarak yeniden hesaplanır.';
    const primary = qs(modal, '.asset-edit-btn.primary');
    if (primary && !primary.disabled) primary.textContent = 'Mevduatı Kaydet';
  }

  function enhanceFundModal(modal) {
    if (!modal || modal.dataset.modernFund === '1') return;
    modal.dataset.modernFund = '1';
    modal.classList.add('fund-trade-modern');

    const head = qs(modal, '.asset-editor-head');
    const title = qs(head, 'h3');
    const portfolioText = title?.textContent?.trim() || '';
    const eyebrow = qs(head, '.eyebrow');
    if (eyebrow) eyebrow.textContent = 'ALE PORTFÖY İŞLEMİ';
    if (title) title.textContent = 'Fon alım / satım';
    if (head && !qs(head, '.asset-editor-subtitle')) {
      const sub = document.createElement('p');
      sub.className = 'asset-editor-subtitle';
      sub.textContent = portfolioText;
      title?.insertAdjacentElement('afterend', sub);
    }

    const form = qs(modal, 'form');
    const grid = qs(form, '.asset-form-grid');
    if (!grid) return;
    const labels = qsa(grid, 'label');
    const typeLabel = labels.find(l => qs(l, 'select'));
    const typeSelect = qs(typeLabel, 'select');
    const dateLabel = labels.find(l => qs(l, 'input[type="date"]'));
    const numberLabels = labels.filter(l => qs(l, 'input[type="number"]'));
    const unitsLabel = numberLabels.find(l => /adet/i.test(l.textContent));
    const amountLabel = numberLabels.find(l => /tutar/i.test(l.textContent));
    const priceLabel = numberLabels.find(l => /fiyat|maliyet/i.test(l.textContent));
    const noteLabel = labels.find(l => qs(l, 'input:not([type])')) || labels.find(l => /not/i.test(l.textContent));

    if (typeSelect) {
      qsa(typeSelect, 'option').forEach(opt => { if (!['buy','sell'].includes(opt.value)) opt.remove(); });
      if (!['buy','sell'].includes(typeSelect.value)) dispatchChange(typeSelect, 'buy');
      typeLabel.classList.add('asset-native-type-field');

      const tabs = document.createElement('div');
      tabs.className = 'fund-trade-tabs';
      tabs.innerHTML = '<button type="button" data-trade="buy"><span>＋</span><b>Fon Al</b><small>Adet ekle</small></button><button type="button" data-trade="sell"><span>−</span><b>Fon Sat</b><small>Adet çıkar</small></button>';
      typeLabel.insertAdjacentElement('beforebegin', tabs);
      const syncTabs = () => qsa(tabs, 'button').forEach(btn => btn.classList.toggle('active', btn.dataset.trade === typeSelect.value));
      tabs.addEventListener('click', e => {
        const btn = e.target.closest('button[data-trade]');
        if (!btn) return;
        dispatchChange(typeSelect, btn.dataset.trade);
        syncTabs();
      });
      typeSelect.addEventListener('change', syncTabs);
      syncTabs();
    }

    amountLabel?.classList.add('asset-field-hidden');
    priceLabel?.classList.add('asset-field-hidden');
    typeLabel?.classList.add('asset-field-hidden');

    [dateLabel, unitsLabel, noteLabel].forEach(label => label?.classList.add('fund-trade-field'));
    if (unitsLabel) {
      const input = qs(unitsLabel, 'input');
      if (input) {
        input.placeholder = 'Örn. 1.250 adet';
        input.step = '0.001';
      }
    }

    if (!qs(form, '.fund-trade-summary')) {
      const priceInput = qs(priceLabel, 'input');
      const summary = document.createElement('div');
      summary.className = 'fund-trade-summary';
      summary.innerHTML = `<span><small>İşlem fiyatı</small><b>${priceInput?.value ? Number(priceInput.value).toLocaleString('tr-TR',{minimumFractionDigits:6,maximumFractionDigits:6}) : '—'} TL</b></span><span><small>Fiyat kaynağı</small><b>TEFAS otomatik</b></span>`;
      grid.insertAdjacentElement('afterend', summary);
    }

    const note = qs(form, '.asset-editor-note');
    if (note) note.textContent = 'Sadece alım veya satım yönünü ve fon adedini gir. İşlem fiyatı TEFAS’taki güncel ALE fiyatından otomatik alınır.';
    const primary = qs(form, '.asset-edit-btn.primary');
    if (primary && !primary.disabled) primary.textContent = 'Fon İşlemini Kaydet';
  }

  function enhance() {
    const root = document.querySelector('.assets-fund-page');
    if (!root) return;
    enhanceHeaderButtons(root);
    qsa(document, '.asset-editor-modal').forEach(modal => {
      if (modal.classList.contains('fund-movement-modal')) enhanceFundModal(modal);
      else enhanceDepositModal(modal);
    });
  }

  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(enhance);
  };
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('popstate', schedule);
  addEventListener('hashchange', schedule);
  addEventListener('load', schedule);
  schedule();
})();