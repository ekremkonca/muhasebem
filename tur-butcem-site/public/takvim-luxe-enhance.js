(() => {
  if (!window.location.pathname.startsWith('/takvim')) return;

  const escapeHTML = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);

  const textNumber = (value) => {
    const match = String(value || '').match(/-?\d+/);
    return match ? Number(match[0]) : 0;
  };

  const parseMoney = (value) => {
    const normalized = String(value || '')
      .replace(/[^0-9,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : 0;
  };

  const getEventCount = (day) => {
    const pills = [...day.querySelectorAll('.calendar-event-pills i')];
    return pills.reduce((count, pill) => {
      if (pill.classList.contains('event-more')) return count + textNumber(pill.textContent);
      return count + 1;
    }, 0);
  };

  const getEventItemsFromGrid = (calendar) => {
    const items = [];
    const days = [...calendar.querySelectorAll('.calendar-grid .calendar-day')].filter(
      (day) => !day.classList.contains('muted'),
    );

    days.forEach((day) => {
      const dayNumber = day.querySelector('.day-number')?.textContent?.trim();
      const dateLabel = dayNumber ? `${dayNumber} ${calendar.dataset.currentMonthShort || ''}`.trim() : '';
      [...day.querySelectorAll('.calendar-event-pills i:not(.event-more)')].forEach((pill) => {
        items.push({
          dateLabel,
          title: pill.textContent.trim(),
          statusClass:
            [...pill.classList].find((cls) => cls.startsWith('is-')) || 'is-planned',
        });
      });
    });

    return items.slice(0, 8);
  };

  const buildStats = (calendar) => {
    const toolbar = calendar.querySelector('.calendar-toolbar');
    if (!toolbar) return;

    let stats = calendar.querySelector('.calendar-luxe-stats');
    if (!stats) {
      stats = document.createElement('div');
      stats.className = 'calendar-luxe-stats';
      toolbar.insertAdjacentElement('afterend', stats);
    }

    const dayButtons = [...calendar.querySelectorAll('.calendar-grid .calendar-day')].filter(
      (day) => !day.classList.contains('muted'),
    );
    const eventCount = dayButtons.reduce((sum, day) => sum + getEventCount(day), 0);
    const recordDays = dayButtons.filter((day) => day.querySelector('.calendar-dots i')).length;
    const cancelledCount = calendar.querySelectorAll('.calendar-event-pills .is-cancelled').length;
    const busiest = dayButtons
      .map((day) => ({
        count: getEventCount(day),
        day: day.querySelector('.day-number')?.textContent?.trim() || '—',
      }))
      .sort((a, b) => b.count - a.count)[0] || { count: 0, day: '—' };

    const selectedCards = [...calendar.querySelectorAll('.compact-record-list article')];
    const selectedNet = selectedCards.reduce((sum, row) => {
      const label = row.querySelector('.calendar-record-amount span')?.textContent || '';
      const amount = parseMoney(row.querySelector('.calendar-record-amount strong')?.textContent);
      return sum + (label.includes('Gider') ? -amount : amount);
    }, 0);

    const selectedTitle = calendar.querySelector('.calendar-day-title h3')?.textContent?.trim() || 'Seçili gün';
    const selectedEventCount = calendar.querySelectorAll('.calendar-event-card').length;

    const trMoney = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const signedSelectedNet = `${selectedNet < 0 ? '-' : ''}${trMoney.format(Math.abs(selectedNet))}`;

    stats.innerHTML = `
      <article class="calendar-stat-card stat-primary">
        <small>Bu Ay Toplam Plan</small>
        <strong>${eventCount}</strong>
        <span>Takvim görünümündeki tüm etkinlikler</span>
      </article>
      <article class="calendar-stat-card stat-emerald">
        <small>Seçili Gün Özeti</small>
        <strong>${selectedEventCount} plan</strong>
        <span>${selectedTitle} · net ${signedSelectedNet}</span>
      </article>
      <article class="calendar-stat-card stat-violet">
        <small>En Yoğun Gün</small>
        <strong>${busiest.day}</strong>
        <span>${busiest.count || 0} etkinlik yoğunluğu</span>
      </article>
      <article class="calendar-stat-card stat-rose">
        <small>Kayıt / Risk</small>
        <strong>${recordDays} gün</strong>
        <span>${cancelledCount} iptal · kayıtlı iş günü</span>
      </article>
    `;
  };

  const buildLegend = (calendar) => {
    let legend = calendar.querySelector('.calendar-legend-glass');
    if (!legend) {
      legend = document.createElement('div');
      legend.className = 'calendar-legend-glass';
      calendar.querySelector('.calendar-luxe-stats')?.insertAdjacentElement('afterend', legend);
    }

    legend.innerHTML = `
      <div class="calendar-legend-group">
        <b>Durumlar</b>
        <span class="legend-chip is-planned"><i></i>Planlandı</span>
        <span class="legend-chip is-confirmed"><i></i>Kesinleşti</span>
        <span class="legend-chip is-completed"><i></i>Tamamlandı</span>
        <span class="legend-chip is-cancelled"><i></i>İptal</span>
      </div>
      <div class="calendar-legend-group">
        <b>Kategoriler</b>
        <span class="legend-chip type-chip series-income"><i></i>Gelir</span>
        <span class="legend-chip type-chip series-expense"><i></i>Gider</span>
        <span class="legend-chip type-chip series-tip"><i></i>Bahşiş</span>
        <span class="legend-chip type-chip series-commission"><i></i>Komisyon</span>
      </div>
    `;
  };

  const wrapLayout = (calendar) => {
    const wrap = calendar.querySelector('.modern-calendar-wrap');
    const details = calendar.querySelector('.calendar-day-details');
    if (!wrap || !details) return;

    let layout = calendar.querySelector('.calendar-luxe-layout');
    if (!layout) {
      layout = document.createElement('div');
      layout.className = 'calendar-luxe-layout';
      const main = document.createElement('div');
      main.className = 'calendar-main-column';
      main.appendChild(wrap);
      layout.appendChild(main);
      details.classList.add('calendar-agenda-panel', 'glass-panel');
      layout.appendChild(details);
      calendar.appendChild(layout);
    } else {
      if (!wrap.parentElement?.classList.contains('calendar-main-column')) {
        const main = layout.querySelector('.calendar-main-column') || document.createElement('div');
        main.className = 'calendar-main-column';
        main.appendChild(wrap);
        if (!layout.contains(main)) layout.prepend(main);
      }
      if (details.parentElement !== layout) layout.appendChild(details);
      details.classList.add('calendar-agenda-panel', 'glass-panel');
    }
  };

  const buildSelectedSummary = (calendar) => {
    const title = calendar.querySelector('.calendar-day-title');
    if (!title) return;

    const events = calendar.querySelectorAll('.calendar-event-card').length;
    const records = calendar.querySelectorAll('.compact-record-list article').length;
    const firstTime = calendar.querySelector('.calendar-event-card .event-card-time')?.textContent?.trim() || '—';
    const selectedNet = [...calendar.querySelectorAll('.compact-record-list article')].reduce((sum, row) => {
      const label = row.querySelector('.calendar-record-amount span')?.textContent || '';
      const amount = parseMoney(row.querySelector('.calendar-record-amount strong')?.textContent);
      return sum + (label.includes('Gider') ? -amount : amount);
    }, 0);

    let summary = calendar.querySelector('.selected-day-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'selected-day-summary';
      title.insertAdjacentElement('afterend', summary);
    }

    summary.innerHTML = `
      <article>
        <small>Günlük Net</small>
        <strong>${selectedNet < 0 ? '-' : ''}${Math.abs(Math.round(selectedNet)).toLocaleString('tr-TR')}</strong>
      </article>
      <article>
        <small>İlk Saat</small>
        <strong>${firstTime}</strong>
      </article>
      <article>
        <small>Plan Sayısı</small>
        <strong>${events}</strong>
      </article>
      <article>
        <small>Kayıt Sayısı</small>
        <strong>${records}</strong>
      </article>
    `;
  };

  const buildMonthAgenda = (calendar) => {
    const details = calendar.querySelector('.calendar-day-details');
    if (!details) return;

    let strip = details.querySelector('.month-agenda-strip');
    if (!strip) {
      strip = document.createElement('div');
      strip.className = 'month-agenda-strip';
      details.appendChild(strip);
    }

    const items = getEventItemsFromGrid(calendar);
    strip.innerHTML = `
      <div class="month-agenda-head">
        <span>AYLIK AJANDA</span>
        <b>${items.length} öğe</b>
      </div>
      <div class="month-agenda-list">
        ${
          items.length
            ? items
                .map(
                  (item) => `
                    <div class="month-agenda-item">
                      <time>
                        <strong>${item.dateLabel.split(' ')[0] || '—'}</strong>
                        <span>${item.dateLabel.split(' ')[1] || ''}</span>
                      </time>
                      <span class="month-agenda-copy">
                        <strong>${escapeHTML(item.title)}</strong>
                        <small>Takvim görünümünden derlendi</small>
                      </span>
                      <i class="event-status-dot ${item.statusClass}"></i>
                    </div>
                  `,
                )
                .join('')
            : `
              <div class="upcoming-empty">
                <span>✦</span>
                <p><strong>Bu ay ajanda boş.</strong>Yeni etkinlik eklenince burada görünür.</p>
              </div>
            `
        }
      </div>
    `;
  };

  const setMonthShort = (calendar) => {
    const monthLabel = calendar.querySelector('.modern-calendar-nav strong')?.textContent?.trim() || '';
    const parts = monthLabel.split(' ');
    const monthName = parts[0]?.toLocaleLowerCase('tr-TR') || '';
    const map = {
      ocak: 'Oca', şubat: 'Şub', mart: 'Mar', nisan: 'Nis', mayıs: 'May', haziran: 'Haz',
      temmuz: 'Tem', ağustos: 'Ağu', eylül: 'Eyl', ekim: 'Eki', kasım: 'Kas', aralık: 'Ara',
    };
    calendar.dataset.currentMonthShort = map[monthName] || parts[0] || '';
  };

  let raf = null;
  let observer = null;
  const observe = () => {
    if (!observer) return;
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  const enhance = () => {
    const calendar = document.querySelector('.standalone-calendar-page .calendar-modern');
    if (!calendar) return;
    observer?.disconnect();
    try {
      setMonthShort(calendar);
      wrapLayout(calendar);
      buildStats(calendar);
      buildLegend(calendar);
      buildSelectedSummary(calendar);
      buildMonthAgenda(calendar);
    } finally {
      observe();
    }
  };

  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(enhance);
  };

  observer = new MutationObserver(schedule);
  observe();
  window.addEventListener('load', schedule);
  window.addEventListener('popstate', schedule);
  schedule();
})();
