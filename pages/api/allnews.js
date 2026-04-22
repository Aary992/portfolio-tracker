// Three-tab news aggregator:
//   1. stockNews   — per-holding, Yahoo search
//   2. indianNews  — broad Indian markets + trending non-portfolio stocks (MC + ET RSS + Yahoo)
//   3. globalNews  — global macro (Fed/oil/FX/China/EU) from MC World + ET International + Yahoo

const INDIAN_RSS = [
  { url: 'https://www.moneycontrol.com/rss/marketsnews.xml',                    source: 'Moneycontrol' },
  { url: 'https://www.moneycontrol.com/rss/business.xml',                       source: 'Moneycontrol' },
  { url: 'https://www.moneycontrol.com/rss/results.xml',                        source: 'Moneycontrol' },
  { url: 'https://www.moneycontrol.com/rss/latestnews.xml',                     source: 'Moneycontrol' },
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',source: 'Economic Times' },
  { url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms', source: 'Economic Times' },
  { url: 'https://economictimes.indiatimes.com/industry/rssfeeds/13352306.cms', source: 'Economic Times' },
];

const GLOBAL_RSS = [
  { url: 'https://www.moneycontrol.com/rss/worldmarket.xml',                       source: 'Moneycontrol' },
  { url: 'https://economictimes.indiatimes.com/news/international/rssfeeds/1898272.cms', source: 'Economic Times' },
  { url: 'https://economictimes.indiatimes.com/news/international/business/rssfeeds/62619113.cms', source: 'Economic Times' },
];

const INDIAN_YAHOO_QUERIES = [
  'Nifty Sensex India stock market',
  'India IPO listing 2026',
  'RBI monetary policy India',
  'India earnings results Q4',
  'FII DII India equity',
];

const GLOBAL_YAHOO_QUERIES = [
  'US Federal Reserve interest rates',
  'crude oil OPEC prices market',
  'China economy trade',
  'dollar rupee forex RBI',
  'global markets emerging economies',
  'ECB Europe inflation',
];

// --- RSS parsing (no deps) ---
function stripCdata(s) {
  return s.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
}

function pickTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? stripCdata(m[1]) : '';
}

function parseRss(xml) {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return items.map(block => ({
    title:   pickTag(block, 'title'),
    link:    pickTag(block, 'link'),
    pubDate: pickTag(block, 'pubDate'),
    desc:    pickTag(block, 'description'),
  }));
}

async function fetchRss({ url, source }) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return [];
    const xml = await r.text();
    return parseRss(xml)
      .filter(it => it.title && it.link)
      .map(it => ({
        title: it.title,
        publisher: source,
        link: it.link,
        time: it.pubDate ? Math.floor(new Date(it.pubDate).getTime() / 1000) : null,
      }))
      .filter(a => !Number.isNaN(a.time));
  } catch { return []; }
}

// --- Yahoo search ---
async function yahooSearch(query, count = 10) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=${count}&enableFuzzyQuery=false&enableNavLinks=false`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json' },
    });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.news || []).map(n => ({
      title: n.title,
      publisher: n.publisher || 'Yahoo',
      link: n.link,
      time: n.providerPublishTime,
    }));
  } catch { return []; }
}

// --- Helpers ---
function dedupe(articles) {
  const seen = new Set();
  return articles.filter(a => {
    if (!a || !a.title || !a.link) return false;
    const key = a.link || a.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function withinDays(articles, days) {
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  return articles.filter(a => a.time && a.time >= cutoff);
}

function bySortedTime(articles) {
  return [...articles].sort((a, b) => (b.time || 0) - (a.time || 0));
}

export default async function handler(req, res) {
  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: 'symbols required' });
  const symList = symbols.split(',').filter(Boolean);

  try {
    // --- Stock-specific news (Yahoo per ticker, last 60 days) ---
    const stockNewsResults = await Promise.all(
      symList.map(async symbol => {
        const ticker = symbol.replace('.NS', '');
        const raw = await yahooSearch(`${ticker} NSE India`, 12);
        const articles = bySortedTime(withinDays(dedupe(raw), 60)).slice(0, 10);
        return [symbol, articles];
      })
    );
    const stockNews = Object.fromEntries(stockNewsResults);

    // --- Indian markets news (RSS + Yahoo queries, last 14 days) ---
    const [rssIndian, yahooIndian] = await Promise.all([
      Promise.all(INDIAN_RSS.map(fetchRss)).then(arrs => arrs.flat()),
      Promise.all(INDIAN_YAHOO_QUERIES.map(q => yahooSearch(q, 6))).then(arrs => arrs.flat()),
    ]);
    const indianNews = bySortedTime(withinDays(dedupe([...rssIndian, ...yahooIndian]), 14)).slice(0, 40);

    // --- Global macro news (RSS + Yahoo, last 14 days) ---
    const [rssGlobal, yahooGlobal] = await Promise.all([
      Promise.all(GLOBAL_RSS.map(fetchRss)).then(arrs => arrs.flat()),
      Promise.all(GLOBAL_YAHOO_QUERIES.map(q => yahooSearch(q, 5))).then(arrs => arrs.flat()),
    ]);
    const globalNews = bySortedTime(withinDays(dedupe([...rssGlobal, ...yahooGlobal]), 14)).slice(0, 30);

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.status(200).json({ stockNews, indianNews, globalNews });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
