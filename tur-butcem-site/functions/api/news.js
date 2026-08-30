const FEEDS = [
  {
    url: 'https://news.google.com/rss/search?q=(ekonomi%20OR%20piyasa%20OR%20merkez%20bankas%C4%B1)%20when%3A1d&hl=tr&gl=TR&ceid=TR%3Atr',
    source: 'Google Haberler',
    region: 'tr',
  },
  { url: 'https://www.aa.com.tr/tr/rss/default?cat=ekonomi', source: 'Anadolu Ajansı', region: 'tr' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', source: 'Bloomberg', region: 'world' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business', region: 'world' },
  { url: 'https://www.reddit.com/r/Yatirim/new/.rss', source: 'r/Yatirim', region: 'forum', atom: true },
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

export async function onRequestGet() {
  const settled = await Promise.allSettled(FEEDS.map(loadFeed));
  const seen = new Set();
  const items = settled.flatMap(result => result.status === 'fulfilled' ? result.value : [])
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
    .filter(item => {
      const key = item.title.toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]+/gi, ' ').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 100);
  const unavailable = settled.map((result, index) => result.status === 'rejected' ? FEEDS[index].source : null).filter(Boolean);
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
