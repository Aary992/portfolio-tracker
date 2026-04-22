// Per-stock news via Google News RSS (India locale). Yahoo search returns
// US-centric PR newswire content for Indian tickers, so we skip it.

function stripCdata(s) { return s.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim(); }
function pickTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? stripCdata(m[1]) : '';
}

export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ticker = symbol.replace('.NS', '').replace('-BE', '');
  const query  = `${ticker} share price OR stock NSE`;
  const url    = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+when:60d&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!r.ok) return res.status(200).json([]);
    const xml = await r.text();
    const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

    const articles = items.map(block => {
      const rawTitle = pickTag(block, 'title');
      const pubDate  = pickTag(block, 'pubDate');
      const link     = pickTag(block, 'link');
      // Google wraps each title as "Headline - Publisher"
      const m = rawTitle.match(/^(.+?)\s+-\s+([^-]+)$/);
      const title     = m ? m[1].trim() : rawTitle;
      const publisher = m ? m[2].trim() : 'Google News';
      return { title, publisher, link, time: pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : null };
    }).filter(a => a.title && a.link && a.time).slice(0, 10);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(articles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
