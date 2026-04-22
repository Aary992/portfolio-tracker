export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  // 1. High-impact keywords for Indian Markets
  const MARKET_MOVERS = ['profit', 'loss', 'dividend', 'acquisition', 'rbi', 'sebi', 'order', 'contract', 'merger', 'hike', 'cut'];
  const FLUFF_BLOCKLIST = ['motley fool', 'zacks', 'investorplace', 'tipranks'];

  try {
    // Add "stock news india" to the query to narrow down results
    const searchQuery = `${symbol} stock news India`;
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQuery)}&newsCount=15&enableFuzzyQuery=false`;
    
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const data = await r.json();

    const articles = (data.news || [])
      .map(n => {
        const title = n.title.toLowerCase();
        const publisher = n.publisher.toLowerCase();
        
        // 2. Scoring Logic
        let score = 0;
        if (MARKET_MOVERS.some(word => title.includes(word))) score += 10;
        if (FLUFF_BLOCKLIST.some(word => publisher.includes(word))) score -= 20;
        
        return {
          title: n.title,
          publisher: n.publisher,
          link: n.link,
          time: n.providerPublishTime,
          score
        };
      })
      // 3. Filter out the absolute garbage and sort by score
      .filter(a => a.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(articles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
