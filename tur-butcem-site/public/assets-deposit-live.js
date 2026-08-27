(() => {
  const TZ = 'Europe/Istanbul';
  let deposit = null;
  let raf = 0;

  const money = value => new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

  const number = (value, digits = 4) => new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value) || 0);

  const percent = value => `${Number(value || 0) >= 0 ? '+' : ''}${number(value, 4)}%`;

  const istanbulToday = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  };

  const utcDay = iso => {
    const [year, month, day] = String(iso || '').split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };

  const elapsedDays = (startDate, termDays) => {
    const start = utcDay(startDate);
    const today = utcDay(istanbulToday());
    if (!Number.isFinite(start) || !Number.isFinite(today)) return 0;
    return Math.max(0, Math.min(termDays, Math.floor((today - start) / 86400000)));
  };

  const calculate = raw => {
    if (!raw) return null;
    const principal = Number(raw.principal) || 0;
    const annualRate = Number(raw.annualRate) || 0;
    const days = Math.max(1, Math.round(Number(raw.days) || 1));
    const withholdingRate = Math.max(0, Number(raw.withholdingRate) || 0);
    const grossInterest = principal * (annualRate / 100) * (days / 365);
    const netInterest = grossInterest * (1 - withholdingRate / 100);
    const dailyNet = netInterest / days;
    const elapsed = elapsedDays(raw.startDate, days);
    const accruedNet = dailyNet * elapsed;
    return {
      principal,
      days,
      elapsed,
      dailyNet,
      accruedNet,
      currentTotal: principal + accruedNet,
      accruedReturn: principal ? (accruedNet / principal) * 100 : 0,
    };
  };

  const setText = (node, value) => {
    if (node && node.textContent !== value) node.textContent = value;
  };

  const findKpi = (root, label) => [...root.querySelectorAll('.fund-kpi')]
    .find(card => card.querySelector(':scope > span')?.textContent?.trim() === label);

  const findDetail = (root, label) => [...root.querySelectorAll('.compact-details-grid > div')]
    .find(row => row.querySelector('dt')?.textContent?.trim() === label);

  const patch = () => {
    const root = document.querySelector('.assets-fund-page .deposit-side');
    const model = calculate(deposit);
    if (!root || !model) return;

    const total = findKpi(root, 'Toplam Para');
    setText(total?.querySelector('strong'), money(model.currentTotal));
    setText(total?.querySelector('small'), `${model.elapsed}/${model.days} gün net tahakkuk`);

    const accrued = findKpi(root, 'Birikmiş Kazanç');
    setText(accrued?.querySelector('strong'), `+${money(model.accruedNet)}`);
    setText(accrued?.querySelector('small'), `Her gün +${money(model.dailyNet)}`);

    const accruedReturn = findKpi(root, 'Birikmiş Getiri (%)');
    setText(accruedReturn?.querySelector('strong'), percent(model.accruedReturn));

    const dayDetail = findDetail(root, 'Bugün tahakkuk');
    setText(dayDetail?.querySelector('dd'), `${model.elapsed}/${model.days} gün`);

    const totalDetail = findDetail(root, 'Bugünkü toplam');
    setText(totalDetail?.querySelector('dd'), money(model.currentTotal));

    const accruedDetail = findDetail(root, 'Birikmiş net faiz');
    setText(accruedDetail?.querySelector('dd'), `+${money(model.accruedNet)}`);

    const chartMeta = root.querySelector('.deposit-chart-card .fund-chart-meta');
    setText(chartMeta?.querySelector('div:first-child strong'), money(model.currentTotal));
    const chartStats = chartMeta?.querySelectorAll('.fund-chart-stats span');
    if (chartStats?.[0]) {
      const b = chartStats[0].querySelector('b');
      setText(b, money(model.accruedNet));
    }
  };

  const schedulePatch = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(patch);
  };

  const refreshSettings = async () => {
    try {
      const response = await fetch(`/api/assets?_=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const json = await response.json();
      if (json?.deposit) {
        deposit = json.deposit;
        patch();
      }
    } catch {}
  };

  const observer = new MutationObserver(schedulePatch);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  refreshSettings();
  setInterval(patch, 60 * 1000);
  setInterval(refreshSettings, 5 * 60 * 1000);
  addEventListener('focus', refreshSettings);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshSettings();
  });
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    if (button?.textContent?.trim() === 'Kaydet') setTimeout(refreshSettings, 900);
  }, true);
})();
