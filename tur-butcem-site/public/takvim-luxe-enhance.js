(() => {
  if (!location.pathname.startsWith('/takvim')) return;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = (v) => Number(String(v ?? '').match(/-?\d+/)?.[0] || 0);
  const money = (v) => {
    const n = Number(String(v ?? '').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'));
    return Number.isFinite(n) ? n : 0;
  };
  const monthShort = (calendar) => {
    const label = calendar.querySelector('.modern-calendar-nav strong')?.textContent?.trim() || '';
    const key = label.split(' ')[0]?.toLocaleLowerCase('tr-TR') || '';
    const map = {ocak:'Oca',şubat:'Şub',mart:'Mar',nisan:'Nis',mayıs:'May',haziran:'Haz',temmuz:'Tem',ağustos:'Ağu',eylül:'Eyl',ekim:'Eki',kasım:'Kas',aralık:'Ara'};
    calendar.dataset.currentMonthShort = map[key] || label.split(' ')[0] || '';
  };
  const dayCount = (day) => [...day.querySelectorAll('.calendar-event-pills i')].reduce(
    (sum, pill) => sum + (pill.classList.contains('event-more') ? num(pill.textContent) : 1), 0,
  );
  const activeDays = (calendar) => [...calendar.querySelectorAll('.calendar-grid .calendar-day')].filter(d => !d.classList.contains('muted'));
  const selectedNet = (calendar) => [...calendar.querySelectorAll('.compact-record-list article')].reduce((sum,row) => {
    const label = row.querySelector('.calendar-record-amount span')?.textContent || '';
    const amount = money(row.querySelector('.calendar-record-amount strong')?.textContent);
    return sum + (label.includes('Gider') ? -amount : amount);
  }, 0);

  function ensureStats(calendar) {
    const toolbar = calendar.querySelector('.calendar-toolbar');
    if (!toolbar) return;
    let box = calendar.querySelector('.calendar-luxe-stats');
    if (!box) {
      box = document.createElement('div');
      box.className = 'calendar-luxe-stats';
      toolbar.insertAdjacentElement('afterend', box);
    }
    const days = activeDays(calendar);
    const total = days.reduce((s,d) => s + dayCount(d), 0);
    const recordDays = days.filter(d => d.querySelector('.calendar-dots i')).length;
    const cancelled = calendar.querySelectorAll('.calendar-event-pills .is-cancelled').length;
    const busiest = days.map(d => ({count:dayCount(d), day:d.querySelector('.day-number')?.textContent?.trim() || '—'})).sort((a,b)=>b.count-a.count)[0] || {count:0,day:'—'};
    const title = esc(calendar.querySelector('.calendar-day-title h3')?.textContent?.trim() || 'Seçili gün');
    const plans = calendar.querySelectorAll('.calendar-event-card').length;
    const net = selectedNet(calendar);
    box.innerHTML = `
      <article class="calendar-stat-card stat-primary"><small>Bu Ay Toplam Plan</small><strong>${total}</strong><span>Takvim görünümündeki tüm etkinlikler</span></article>
      <article class="calendar-stat-card stat-emerald"><small>Seçili Gün Özeti</small><strong>${plans} plan</strong><span>${title} · net ${net < 0 ? '-' : ''}${Math.abs(Math.round(net)).toLocaleString('tr-TR')}</span></article>
      <article class="calendar-stat-card stat-violet"><small>En Yoğun Gün</small><strong>${busiest.day}</strong><span>${busiest.count} etkinlik yoğunluğu</span></article>
      <article class="calendar-stat-card stat-rose"><small>Kayıt / Risk</small><strong>${recordDays} gün</strong><span>${cancelled} iptal · kayıtlı iş günü</span></article>`;
  }

  function ensureLegend(calendar) {
    let box = calendar.querySelector('.calendar-legend-glass');
    if (!box) {
      box = document.createElement('div');
      box.className = 'calendar-legend-glass';
      calendar.querySelector('.calendar-luxe-stats')?.insertAdjacentElement('afterend', box);
    }
    box.innerHTML = `
      <div class="calendar-legend-group"><b>Durumlar</b><span class="legend-chip is-planned"><i></i>Planlandı</span><span class="legend-chip is-confirmed"><i></i>Kesinleşti</span><span class="legend-chip is-completed"><i></i>Tamamlandı</span><span class="legend-chip is-cancelled"><i></i>İptal</span></div>
      <div class="calendar-legend-group"><b>Kategoriler</b><span class="legend-chip series-income"><i></i>Gelir</span><span class="legend-chip series-expense"><i></i>Gider</span><span class="legend-chip series-tip"><i></i>Bahşiş</span><span class="legend-chip series-commission"><i></i>Komisyon</span></div>`;
  }

  function applyLayout(calendar) {
    calendar.querySelector('.modern-calendar-wrap')?.classList.add('glass-panel');
    calendar.querySelector('.calendar-day-details')?.classList.add('calendar-agenda-panel','glass-panel');
  }

  function ensureSelectedSummary(calendar) {
    const title = calendar.querySelector('.calendar-day-title');
    if (!title) return;
    let box = calendar.querySelector('.selected-day-summary');
    if (!box) {
      box = document.createElement('div');
      box.className = 'selected-day-summary';
      title.insertAdjacentElement('afterend', box);
    }
    const plans = calendar.querySelectorAll('.calendar-event-card').length;
    const records = calendar.querySelectorAll('.compact-record-list article').length;
    const first = esc(calendar.querySelector('.calendar-event-card .event-card-time')?.textContent?.trim() || '—');
    const net = selectedNet(calendar);
    box.innerHTML = `<article><small>Günlük Net</small><strong>${net < 0 ? '-' : ''}${Math.abs(Math.round(net)).toLocaleString('tr-TR')}</strong></article><article><small>İlk Saat</small><strong>${first}</strong></article><article><small>Plan Sayısı</small><strong>${plans}</strong></article><article><small>Kayıt Sayısı</small><strong>${records}</strong></article>`;
  }

  function ensureAgenda(calendar) {
    const details = calendar.querySelector('.calendar-day-details');
    if (!details) return;
    let box = details.querySelector('.month-agenda-strip');
    if (!box) {
      box = document.createElement('div');
      box.className = 'month-agenda-strip';
      details.appendChild(box);
    }
    const items = [];
    activeDays(calendar).forEach(day => {
      const d = day.querySelector('.day-number')?.textContent?.trim() || '—';
      day.querySelectorAll('.calendar-event-pills i:not(.event-more)').forEach(pill => items.push({
        day:d,
        month:calendar.dataset.currentMonthShort || '',
        title:pill.textContent.trim(),
        status:[...pill.classList].find(c => c.startsWith('is-')) || 'is-planned',
      }));
    });
    const visible = items.slice(0,8);
    box.innerHTML = `<div class="month-agenda-head"><span>AYLIK AJANDA</span><b>${visible.length} öğe</b></div><div class="month-agenda-list">${visible.length ? visible.map(i => `<div class="month-agenda-item"><time><strong>${esc(i.day)}</strong><span>${esc(i.month)}</span></time><span class="month-agenda-copy"><strong>${esc(i.title)}</strong><small>Takvim görünümünden derlendi</small></span><i class="event-status-dot ${i.status}"></i></div>`).join('') : '<div class="upcoming-empty"><span>✦</span><p><strong>Bu ay ajanda boş.</strong>Yeni etkinlik eklenince burada görünür.</p></div>'}</div>`;
  }

  let observer;
  let raf;
  const observe = () => observer?.observe(document.body,{childList:true,subtree:true,characterData:true});
  const enhance = () => {
    const calendar = document.querySelector('.standalone-calendar-page .calendar-modern');
    if (!calendar) return;
    observer?.disconnect();
    try {
      monthShort(calendar);
      applyLayout(calendar);
      ensureStats(calendar);
      ensureLegend(calendar);
      ensureSelectedSummary(calendar);
      ensureAgenda(calendar);
    } finally { observe(); }
  };
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(enhance); };
  observer = new MutationObserver(schedule);
  observe();
  addEventListener('load', schedule);
  addEventListener('popstate', schedule);
  schedule();
})();
