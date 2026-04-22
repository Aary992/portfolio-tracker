// Maps display range (1w/1m/3m/6m/1y) → Yahoo Finance range + interval
const RANGE_MAP = {
  '1w':  { range: '5d',  interval: '1h'  },
  '1m':  { range: '1mo', interval: '1d'  },
  '1mo': { range: '1mo', interval: '1d'  },
  '3m':  { range: '3mo', interval: '1d'  },
  '6m':  { range: '6mo', interval: '1wk' },
  '1y':  { range: '1y',  interval: '1wk' },
};

export default async function handler(req, res) {
  const { symbol, range = '3m' } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const { range: yahooRange, interval } = RANGE_MAP[range] || RANGE_MAP['3m'];

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${yahooRange}`;
    const r   = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const data   = await r.json();
    const result = data?.chart?.result?.[0];

    if (!result) return res.status(404).json({ error: 'No data for symbol' });

    const timestamps = result.timestamp || [];
    const closes     = result.indicators?.quote?.[0]?.close || [];

    const points = timestamps
      .map((ts, i) => ({
        date:  new Date(ts * 1000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        price: closes[i] != null ? parseFloat(closes[i].toFixed(2)) : null,
      }))
      .filter(p => p.price != null);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(points);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
