const FEEDS = [
  {
    url: 'https://news.google.com/rss/search?q=(%22Watcher.Guru%22%20OR%20%22The%20Spectator%20Index%22%20OR%20%22Current%20Report%22)%20when%3A2d&hl=en-US&gl=US&ceid=US%3Aen',
    source: 'Bağımsız kaynaklar',
    region: 'independent',
  },
  {
    url: 'https://news.google.com/rss/search?q=(WatcherGuru%20OR%20spectatorindex%20OR%20Currentreport1)%20when%3A2d&hl=en-US&gl=US&ceid=US%3Aen',
    source: 'X gündemi',
    region: 'independent',
  },
  {
    url: 'https://news.google.com/rss/search?q=(ekonomi%20OR%20piyasa%20OR%20merkez%20bankas%C4%B1)%20when%3A1d&hl=tr&gl=TR&ceid=TR%3Atr',
    source: 'Google Haberler',
    region: 'tr',
  },
  {
    url: 'https://news.google.com/rss/search?q=(%C4%B0ran%20OR%20sava%C5%9F%20OR%20petrol%20OR%20%22merkez%20bankas%C4%B1%22%20OR%20faiz%20OR%20enflasyon%20OR%20%22k%C3%BCresel%20piyasalar%22%20OR%20borsa%20OR%20dolar%20OR%20alt%C4%B1n%20OR%20yapt%C4%B1r%C4%B1m%20OR%20Fed%20OR%20OPEC%20OR%20ticaret)%20when%3A2d&hl=tr&gl=TR&ceid=TR%3Atr',
    source: 'Google Haberler',
    region: 'tr',
  },
  {
    url: 'https://news.google.com/rss/search?q=(Iran%20OR%20war%20OR%20oil%20OR%20sanctions%20OR%20inflation%20OR%20%22central%20bank%22%20OR%20Fed%20OR%20markets%20OR%20tariffs%20OR%20OPEC)%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen',
    source: 'Google News',
    region: 'world',
  },
  { url: 'https://www.aa.com.tr/tr/rss/default?cat=ekonomi', source: 'Anadolu Ajansı', region: 'tr' },
  { url: 'https://www.ntv.com.tr/ekonomi.rss', source: 'NTV Ekonomi', region: 'tr', atom: true },
  { url: 'https://www.dunya.com/rss', source: 'Dünya', region: 'tr' },
  { url: 'https://www.ekonomim.com/rss', source: 'Ekonomim', region: 'tr' },
  { url: 'https://www.cnbce.com/rss', source: 'CNBC-e', region: 'tr' },
  { url: 'https://www.bloomberght.com/rss', source: 'Bloomberg HT', region: 'tr' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', source: 'Bloomberg', region: 'world' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business', region: 'world' },
  { url: 'https://www.reddit.com/r/Yatirim/new/.rss', source: 'r/Yatirim', region: 'forum', atom: true },
];

const CRITICAL_TOPICS = [
  'iran', 'savaş', 'war', 'çatışma', 'conflict', 'yaptırım', 'sanction',
  'petrol', 'oil', 'doğal gaz', 'natural gas', 'opec', 'jeopolitik', 'geopolitic',
  'merkez bank', 'central bank', 'fed ', 'federal reserve', 'ecb', 'tcmb',
  'faiz', 'interest rate', 'enflasyon', 'inflation', 'tarife', 'tariff',
];
const MARKET_TOPICS = [
  'borsa', 'piyasa', 'market', 'dolar', 'dollar', 'euro', 'altın', 'gold',
  'tahvil', 'bond', 'bitcoin', 'crypto', 'ticaret', 'trade', 'ihracat', 'ithalat',
  'resesyon', 'recession', 'büyüme', 'growth', 'gdp', 'işsizlik', 'unemployment',
];
const LOW_IMPACT_TOPICS = [
  'okul üniform', 'school uniform', 'magazin', 'celebrity', 'futbol', 'football',
  'festival', 'yarışma', 'düğün', 'belediye etkinliği', 'havaalanı yolcu',
  'ayçiçeği üreticisi', 'fuarına yoğun ilgi', 'quiz', 'hollywood', 'film',
];
const PREMIUM_SOURCES = [
  'Watcher.Guru', 'Watcher Guru', 'The Spectator Index', 'Spectator Index', 'Current Report',
  'Reuters', 'Bloomberg', 'Financial Times', 'Associated Press', 'AP News',
  'CNBC', 'BBC Business', 'Anadolu Ajansı', 'Bloomberg HT', 'Dünya Gazetesi',
  'Ekonomim', 'NTV Haber', 'TRT Haber', 'Euronews',
];

const decode = value => String(value || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/\s+/g, ' ').trim();

const tag = (xml, name) => {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return decode(match?.[1]);
};

const safeUrl = value => {
  try {
    const url = new URL(decode(value));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
};

function parseFeed(xml, feed) {
  const rows = feed.atom
    ? [...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)]
    : [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
  return rows.map(([, item]) => {
    let title = tag(item, 'title');
    let source = tag(item, 'source') || feed.source;
    if (feed.source === 'Google Haberler' && !tag(item, 'source')) {
      const parts = title.split(' - ');
      if (parts.length > 1) source = parts.pop().trim();
      title = parts.join(' - ').trim();
    }
    const sourceSuffix = ` - ${source}`;
    if (title.endsWith(sourceSuffix)) title = title.slice(0, -sourceSuffix.length).trim();
    const atomLink = item.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*\/?>/i)?.[1] || '';
    const publishedRaw = tag(item, 'pubDate') || tag(item, 'dc:date') || tag(item, 'published') || tag(item, 'updated');
    const publishedAt = new Date(publishedRaw);
    return {
      id: tag(item, 'guid') || tag(item, 'id') || safeUrl(tag(item, 'link') || atomLink) || `${source}-${title}`,
      title,
      source,
      region: feed.region,
      url: safeUrl(tag(item, 'link') || atomLink),
      publishedAt: Number.isNaN(publishedAt.getTime()) ? null : publishedAt.toISOString(),
    };
  }).filter(row => row.title && row.url && row.publishedAt);
}

async function loadFeed(feed) {
  const response = await fetch(feed.url, {
    headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9', 'user-agent': 'Muhasebem-Ekonomi-Akisi/1.0' },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error(`${feed.source}: HTTP ${response.status}`);
  return parseFeed(await response.text(), feed);
}

async function loadXPosts(token) {
  if (!token) return [];
  const query = encodeURIComponent('(from:WatcherGuru OR from:spectatorindex OR from:Currentreport1) -is:reply -is:retweet');
  const response = await fetch(`https://api.x.com/2/tweets/search/recent?query=${query}&max_results=25&tweet.fields=created_at,author_id&expansions=author_id&user.fields=username,name`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error(`X API: HTTP ${response.status}`);
  const payload = await response.json();
  const users = new Map((payload.includes?.users || []).map(user => [user.id, user]));
  return (payload.data || []).map(post => {
    const author = users.get(post.author_id) || {};
    return {
      id: `x-${post.id}`,
      title: decode(post.text),
      source: author.name || `@${author.username || 'X'}`,
      region: 'independent',
      url: `https://x.com/${author.username || 'i'}/status/${post.id}`,
      publishedAt: post.created_at,
    };
  }).filter(item => item.title && item.publishedAt);
}

function qualityScore(item) {
  if (item.region === 'forum') return 0;
  const title = item.title.toLocaleLowerCase('tr');
  let score = item.region === 'independent' ? 10 : 0;
  for (const topic of CRITICAL_TOPICS) if (title.includes(topic)) score += 5;
  for (const topic of MARKET_TOPICS) if (title.includes(topic)) score += 2;
  for (const topic of LOW_IMPACT_TOPICS) if (title.includes(topic)) score -= 12;
  if (PREMIUM_SOURCES.some(source => item.source.toLocaleLowerCase('tr').includes(source.toLocaleLowerCase('tr')))) score += 3;
  const ageHours = Math.max(0, Date.now() - new Date(item.publishedAt).getTime()) / 3600000;
  score += ageHours < 2 ? 5 : ageHours < 6 ? 3 : ageHours < 24 ? 1 : 0;
  return score;
}

function diversify(items, limit = 100) {
  const sourceCounts = new Map();
  const selected = [];
  for (const item of items) {
    const max = item.region === 'forum' ? 30 : item.region === 'independent' ? 10 : 3;
    const count = sourceCounts.get(item.source) || 0;
    if (count >= max) continue;
    sourceCounts.set(item.source, count + 1);
    selected.push(item);
    if (selected.length >= limit) break;
  }
  return selected;
}

export async function onRequestGet(context = {}) {
  const settled = await Promise.allSettled([...FEEDS.map(loadFeed), loadXPosts(context.env?.X_BEARER_TOKEN)]);
  const seen = new Set();
  const candidates = settled.flatMap(result => result.status === 'fulfilled' ? result.value : [])
    .filter(item => {
      const key = item.title.toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]+/gi, ' ').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(item => ({ ...item, quality: qualityScore(item) }))
    .filter(item => item.region === 'forum' || item.quality >= 3)
    .sort((a, b) => b.quality - a.quality || String(b.publishedAt).localeCompare(String(a.publishedAt)));
  const rankedNews = candidates.filter(item => item.region !== 'forum');
  const forumItems = candidates.filter(item => item.region === 'forum')
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
    .slice(0, 25);
  const selectedNews = diversify(rankedNews, 75);
  const independentFallbacks = [
    { name: 'Watcher.Guru', handle: 'WatcherGuru' },
    { name: 'The Spectator Index', handle: 'spectatorindex' },
    { name: 'Current Report', handle: 'Currentreport1' },
  ].filter(source => !selectedNews.some(item => item.region === 'independent' && item.source.toLocaleLowerCase('tr').includes(source.name.toLocaleLowerCase('tr'))))
    .map(source => ({
      id: `x-profile-${source.handle}`,
      title: `${source.name} güncel paylaşımlarını X üzerinde görüntüle`,
      source: source.name,
      region: 'independent',
      url: `https://x.com/${source.handle}`,
      publishedAt: new Date().toISOString(),
      quality: 3,
    }));
  const items = [...selectedNews, ...independentFallbacks, ...forumItems];
  const unavailable = settled.map((result, index) => result.status === 'rejected' ? (FEEDS[index]?.source || 'X API') : null).filter(Boolean);
  return new Response(JSON.stringify({ items, unavailable, updatedAt: new Date().toISOString() }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=180',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } });
}
