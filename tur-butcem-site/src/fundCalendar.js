const parseIsoDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function fundDailyDisplayFactor(todayIso, publishedDate) {
  const today = parseIsoDate(todayIso);
  if (!today) return { factor: 1, mode: 'normal' };

  const weekday = today.getDay();
  if (weekday === 0 || weekday === 6) {
    return { factor: 0, mode: 'weekend' };
  }

  const published = parseIsoDate(String(publishedDate || '').slice(0, 10));
  if (weekday === 1 && published && published < today) {
    return { factor: 2, mode: 'monday-pending' };
  }

  return { factor: 1, mode: 'normal' };
}

export function adjustFundDailyMetrics({ profit, returnRate, todayIso, publishedDate }) {
  const calendar = fundDailyDisplayFactor(todayIso, publishedDate);
  return {
    ...calendar,
    profit: Number(profit || 0) * calendar.factor,
    returnRate: Number(returnRate || 0) * calendar.factor,
  };
}
