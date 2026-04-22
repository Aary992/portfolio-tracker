// Yahoo v7 /quote endpoint now requires a crumb+cookie for unauthenticated clients
// and often returns 401. We use the v8 /chart endpoint instead which is still open —
// one call per symbol, in parallel. From chart meta we get regularMarketPrice,
// chartPreviousClose, fiftyTwoWeekHigh/Low, regularMarketVolume, marketCap is not
// available here so we omit it.

const YH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchOne(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const r = await fetch(url, { headers: YH_HEADERS });
    if (!r.ok) return { symbol, price: null };
    const json = await r.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return { symbol, price: null };
    const price = meta.regularMarketPrice ?? null;
    // previousClose = prior trading day's close (what Day's % should use).
    // chartPreviousClose = close before the chart window started (wrong for 5d range).
    // Fall back to the second-to-last daily close in the chart data if meta lacks it.
    const closes = result?.indicators?.quote?.[0]?.close || [];
    const validCloses = closes.filter(c => c != null && !Number.isNaN(c));
    const prevFromChart = validCloses.length >= 2 ? validCloses[validCloses.length - 2] : null;
    const prevClose = meta.previousClose ?? prevFromChart ?? meta.chartPreviousClose ?? null;
    const change = price != null && prevClose != null ? price - prevClose : null;
    const changePercent = change != null && prevClose ? (change / prevClose) * 100 : null;
    return {
      symbol,
      price,
      change,
      changePercent,
      prevClose,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow:  meta.fiftyTwoWeekLow ?? null,
      volume:           meta.regularMarketVolume ?? null,
      marketCap:        null,
    };
  } catch {
    return { symbol, price: null };
  }
}

export default async function handler(req, res) {
  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: 'symbols required' });
  const symList = symbols.split(',').filter(Boolean);
  try {
    const result = await Promise.all(symList.map(fetchOne));
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
