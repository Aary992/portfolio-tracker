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

const INDIAN_GNEWS_QUERIES = [
  'Nifty Sensex India stock market',
  'India IPO listing',
  'RBI monetary policy',
  'India Q4 earnings results',
  'FII DII flows India equity',
];

const GLOBAL_GNEWS_QUERIES = [
  'US Federal Reserve interest rates economy',
  'crude oil OPEC prices commodities',
  'China economy trade tariffs',
  'dollar rupee forex currency',
  'global stock markets Wall Street',
  'ECB Europe inflation economy',
  'geopolitics Middle East Ukraine Russia trade',
  'US China tariffs trade war',
];

// Topic filter — keep finance/business/geopolitics, drop sports/entertainment/misc.
const GLOBAL_BLOCK = [
  'nba','nfl','mlb','nhl','premier league','la liga','serie a','bundesliga','football','soccer','basketball','cricket','ipl','tennis','wimbledon','golf','f1','formula 1','olympic','fifa','uefa','rugby','boxing','mma','ufc','wrestling',
  'celebrity','bollywood','hollywood','taylor swift','kardashian','movie','netflix','oscar','grammy','box office','music album','concert','tv show','streaming series',
  'recipe','horoscope','dating','lifestyle','fashion week','beauty',
];
const GLOBAL_ALLOW = [
  'fed','reserve','rate','bond','yield','treasury','inflation','cpi','ppi','gdp','jobs','payroll','unemployment',
  'oil','brent','wti','opec','gas','gold','copper','commodity',
  'stock','market','equity','nasdaq','dow','s&p','sensex','nifty','hang seng','nikkei',
  'dollar','euro','yen','rupee','forex','currency','imf','world bank',
  'china','us','trump','biden','russia','ukraine','israel','gaza','middle east','iran','opec','tariff','trade','sanction','export','import','geopolitic',
  'earnings','revenue','profit','ipo','merger','acquisition','bankruptcy',
  'economy','economic','recession','growth','policy','central bank','ecb','boj','pboc','rbi',
];
function isGlobalRelevant(title) {
  const t = (title || '').toLowerCase();
  if (GLOBAL_BLOCK.some(w => t.includes(w))) return false;
  return GLOBAL_ALLOW.some(w => t.includes(w));
}

function gNewsUrl(q, days = 14) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}+when:${days}d&hl=en-IN&gl=IN&ceid=IN:en`;
}

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
    // --- Stock-specific news (Google News RSS per ticker, last 60 days) ---
    // Yahoo search returns US PR newswire junk for Indian stocks. Google News
    // RSS with India locale gives proper coverage (MC, ET, LiveMint, BS, etc.)
    const stockNewsResults = await Promise.all(
      symList.map(async symbol => {
        const ticker = symbol.replace('.NS', '').replace('-BE', '');
        const query = `${ticker} share price OR stock NSE`;
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+when:60d&hl=en-IN&gl=IN&ceid=IN:en`;
        const raw = await fetchRss({ url, source: 'Google News' });
        // Google wraps each title as "Headline - Publisher"; extract publisher.
        const cleaned = raw.map(a => {
          const m = a.title.match(/^(.+?)\s+-\s+([^-]+)$/);
          return m ? { ...a, title: m[1].trim(), publisher: m[2].trim() } : a;
        });
        const articles = bySortedTime(withinDays(dedupe(cleaned), 60)).slice(0, 12);
        return [symbol, articles];
      })
    );
    const stockNews = Object.fromEntries(stockNewsResults);

    const cleanGoogleTitles = arts => arts.map(a => {
      const m = a.title.match(/^(.+?)\s+-\s+([^-]+)$/);
      return m ? { ...a, title: m[1].trim(), publisher: m[2].trim() } : a;
    });

    // --- Indian markets news (MC/ET RSS + Google News, last 14 days) ---
    const [rssIndian, gIndian] = await Promise.all([
      Promise.all(INDIAN_RSS.map(fetchRss)).then(arrs => arrs.flat()),
      Promise.all(INDIAN_GNEWS_QUERIES.map(q => fetchRss({ url: gNewsUrl(q, 14), source: 'Google News' }))).then(arrs => cleanGoogleTitles(arrs.flat())),
    ]);
    const indianNews = bySortedTime(withinDays(dedupe([...rssIndian, ...gIndian]), 14)).slice(0, 40);

    // --- Global macro news (MC/ET RSS + Google News, last 14 days) ---
    const [rssGlobal, gGlobal] = await Promise.all([
      Promise.all(GLOBAL_RSS.map(fetchRss)).then(arrs => arrs.flat()),
      Promise.all(GLOBAL_GNEWS_QUERIES.map(q => fetchRss({ url: gNewsUrl(q, 14), source: 'Google News' }))).then(arrs => cleanGoogleTitles(arrs.flat())),
    ]);
    const globalNews = bySortedTime(withinDays(dedupe([...rssGlobal, ...gGlobal]), 14))
      .filter(a => isGlobalRelevant(a.title))
      .slice(0, 30);

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.status(200).json({ stockNews, indianNews, globalNews });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
