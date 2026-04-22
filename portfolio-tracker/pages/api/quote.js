export default async function handler(req, res) {
  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: 'symbols required' });

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,fiftyTwoWeekHigh,fiftyTwoWeekLow,regularMarketVolume,marketCap`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!r.ok) throw new Error(`Yahoo returned ${r.status}`);
    const data = await r.json();
    const quotes = data?.quoteResponse?.result || [];

    const symList = symbols.split(',').filter(Boolean);
    const result = symList.map(sym => {
      const q = quotes.find(x => x.symbol === sym);
      if (!q) return { symbol: sym, price: null, change: null, changePercent: null };
      return {
        symbol: q.symbol,
        price: q.regularMarketPrice ?? null,
        change: q.regularMarketChange ?? null,
        changePercent: q.regularMarketChangePercent ?? null,
        prevClose: q.regularMarketPreviousClose ?? null,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
        volume: q.regularMarketVolume ?? null,
        marketCap: q.marketCap ?? null,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
