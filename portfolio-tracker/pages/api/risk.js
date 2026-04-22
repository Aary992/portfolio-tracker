// Risk & performance analytics — computed server-side from 1y daily closes.
// Fetches Yahoo chart data for all holdings + benchmarks, computes vol, beta,
// Sharpe, max drawdown, CAGR, VaR, HHI, correlation matrix, and benchmark
// comparison series (normalized to 100).

const RISK_FREE_RATE = 0.07; // India 10Y G-Sec, annual
const TRADING_DAYS = 252;

const BENCHMARKS = [
  { key: 'nifty50',     label: 'Nifty 50',          tickers: ['^NSEI'] },
  { key: 'nifty500',    label: 'Nifty 500',         tickers: ['^CRSLDX', 'NIFTY500.NS', 'MOM500.NS'] },
  { key: 'midcap150',   label: 'Nifty Midcap 150',  tickers: ['NIFTYMID150.NS', 'MID150BEES.NS', '^NSEMDCP50', '^CNXMIDCAP'] },
  { key: 'smallcap150', label: 'Nifty Smallcap 150',tickers: ['NIFTYSMLCAP250.NS', 'SMALLCAP.NS', '^CNXSC'] },
];

async function fetchDailyCloses(symbol, range = '1y') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!r.ok) return null;
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const ts = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const points = ts.map((t, i) => ({ ts: t, close: closes[i] })).filter(p => p.close != null && !Number.isNaN(p.close));
    return points.length >= 20 ? points : null;
  } catch { return null; }
}

// Try each ticker candidate in sequence until one returns data.
async function fetchWithFallback(tickers) {
  for (const t of tickers) {
    const data = await fetchDailyCloses(t);
    if (data) return { ticker: t, data };
  }
  return null;
}

// Math helpers
const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const variance = arr => {
  const m = mean(arr);
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
};
const stdev = arr => Math.sqrt(variance(arr));
const covariance = (a, b) => {
  const ma = mean(a), mb = mean(b);
  return a.reduce((s, x, i) => s + (x - ma) * (b[i] - mb), 0) / (a.length - 1);
};
const correlation = (a, b) => {
  const sa = stdev(a), sb = stdev(b);
  if (sa === 0 || sb === 0) return 0;
  return covariance(a, b) / (sa * sb);
};

const dailyReturns = closes => closes.slice(1).map((c, i) => c / closes[i] - 1);

const maxDrawdown = prices => {
  let peak = prices[0], mdd = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = (peak - p) / peak;
    if (dd > mdd) mdd = dd;
  }
  return mdd;
};

const percentile = (arr, p) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * sorted.length)));
  return sorted[idx];
};

// Align two series on common timestamps; returns { closesA, closesB }.
function alignSeries(a, b) {
  const mapB = new Map(b.map(p => [p.ts, p.close]));
  const aligned = a.filter(p => mapB.has(p.ts));
  return {
    closesA: aligned.map(p => p.close),
    closesB: aligned.map(p => mapB.get(p.ts)),
  };
}

// Align N series on the intersection of their timestamps.
function alignMultiple(seriesMap) {
  const symbols = Object.keys(seriesMap);
  if (symbols.length === 0) return { timestamps: [], closes: {} };
  const tsSets = symbols.map(s => new Set(seriesMap[s].map(p => p.ts)));
  const common = [...tsSets[0]].filter(t => tsSets.every(set => set.has(t))).sort((a, b) => a - b);
  const closes = {};
  symbols.forEach(s => {
    const m = new Map(seriesMap[s].map(p => [p.ts, p.close]));
    closes[s] = common.map(t => m.get(t));
  });
  return { timestamps: common, closes };
}

function computeStockMetrics(closes, benchmarkCloses) {
  const rets = dailyReturns(closes);
  const annVol = stdev(rets) * Math.sqrt(TRADING_DAYS);
  const annReturn = mean(rets) * TRADING_DAYS;
  const sharpe = annVol > 0 ? (annReturn - RISK_FREE_RATE) / annVol : 0;
  const mdd = maxDrawdown(closes);
  const cagr = (closes.at(-1) / closes[0]) ** (TRADING_DAYS / rets.length) - 1;

  let beta = null;
  if (benchmarkCloses && benchmarkCloses.length === closes.length) {
    const bRets = dailyReturns(benchmarkCloses);
    const bVar = variance(bRets);
    beta = bVar > 0 ? covariance(rets, bRets) / bVar : null;
  }

  return {
    vol: annVol,
    annReturn,
    sharpe,
    maxDD: mdd,
    cagr,
    beta,
  };
}

function computePortfolioSeries(holdings, stockSeries) {
  // Portfolio value = Σ qty_i * close_i,t, aligned on common timestamps.
  const symbolsWithData = holdings.filter(h => stockSeries[h.symbol]).map(h => h.symbol);
  const filtered = {};
  symbolsWithData.forEach(s => { filtered[s] = stockSeries[s]; });
  const { timestamps, closes } = alignMultiple(filtered);
  if (timestamps.length < 20) return null;

  const qtyMap = Object.fromEntries(holdings.map(h => [h.symbol, h.qty]));
  const values = timestamps.map((_, i) => {
    let v = 0;
    symbolsWithData.forEach(s => { v += qtyMap[s] * closes[s][i]; });
    return v;
  });
  return { timestamps, values, symbolsUsed: symbolsWithData };
}

export default async function handler(req, res) {
  const { holdings: holdingsParam } = req.query;
  if (!holdingsParam) return res.status(400).json({ error: 'holdings required' });

  let holdings;
  try {
    holdings = JSON.parse(holdingsParam);
  } catch { return res.status(400).json({ error: 'invalid holdings JSON' }); }

  try {
    // Fetch all holding closes + benchmark closes in parallel.
    const [holdingResults, benchmarkResults] = await Promise.all([
      Promise.all(holdings.map(async h => ({ symbol: h.symbol, data: await fetchDailyCloses(h.symbol) }))),
      Promise.all(BENCHMARKS.map(async b => ({ ...b, resolved: await fetchWithFallback(b.tickers) }))),
    ]);

    const stockSeries = {};
    holdingResults.forEach(r => { if (r.data) stockSeries[r.symbol] = r.data; });

    const benchmarkSeries = {};
    benchmarkResults.forEach(b => { if (b.resolved) benchmarkSeries[b.key] = { label: b.label, ticker: b.resolved.ticker, data: b.resolved.data }; });

    const niftyData = benchmarkSeries.nifty50?.data;

    // Per-stock metrics, aligned with Nifty 50 for beta.
    const stocks = {};
    for (const h of holdings) {
      const s = stockSeries[h.symbol];
      if (!s) { stocks[h.symbol] = null; continue; }
      const closes = s.map(p => p.close);
      let benchmarkCloses = null;
      if (niftyData) {
        const { closesA, closesB } = alignSeries(s, niftyData);
        if (closesA.length >= 20) {
          stocks[h.symbol] = computeStockMetrics(closesA, closesB);
          continue;
        }
      }
      stocks[h.symbol] = computeStockMetrics(closes, null);
    }

    // Portfolio-level series (hypothetical: current holdings held for full window).
    const port = computePortfolioSeries(holdings, stockSeries);
    let portfolio = null;
    const benchmarkComparison = { dates: [], series: {} };

    if (port) {
      const portRets = dailyReturns(port.values);
      const portVol = stdev(portRets) * Math.sqrt(TRADING_DAYS);
      const portAnnRet = mean(portRets) * TRADING_DAYS;
      const portSharpe = portVol > 0 ? (portAnnRet - RISK_FREE_RATE) / portVol : 0;
      const portMdd = maxDrawdown(port.values);
      const portCagr = (port.values.at(-1) / port.values[0]) ** (TRADING_DAYS / portRets.length) - 1;

      const dailyVol = stdev(portRets);
      const var95Parametric = 1.645 * dailyVol;
      const var95Historical = -percentile(portRets, 0.05);
      const lastValue = port.values.at(-1);

      // Portfolio beta vs Nifty 50 (on common dates).
      let portBeta = null, alpha = null;
      if (niftyData) {
        const niftyMap = new Map(niftyData.map(p => [p.ts, p.close]));
        const commonTs = port.timestamps.filter(t => niftyMap.has(t));
        if (commonTs.length >= 20) {
          const portCloses = port.timestamps.map((t, i) => ({ t, v: port.values[i] })).filter(x => niftyMap.has(x.t)).map(x => x.v);
          const niftyCloses = commonTs.map(t => niftyMap.get(t));
          const pRets = dailyReturns(portCloses);
          const nRets = dailyReturns(niftyCloses);
          const nVar = variance(nRets);
          portBeta = nVar > 0 ? covariance(pRets, nRets) / nVar : null;
          const niftyAnnRet = mean(nRets) * TRADING_DAYS;
          if (portBeta != null) {
            alpha = portAnnRet - (RISK_FREE_RATE + portBeta * (niftyAnnRet - RISK_FREE_RATE));
          }
        }
      }

      // Concentration: HHI, top-5, sector concentration.
      const totalValue = holdings.reduce((s, h) => {
        const last = stockSeries[h.symbol]?.at(-1)?.close;
        return s + (last ? last * h.qty : h.invested);
      }, 0);
      const weights = holdings.map(h => {
        const last = stockSeries[h.symbol]?.at(-1)?.close;
        const val = last ? last * h.qty : h.invested;
        return { symbol: h.symbol, name: h.name, sector: h.sector, weight: val / totalValue };
      });
      const hhi = weights.reduce((s, w) => s + w.weight * w.weight, 0);
      const top5 = [...weights].sort((a, b) => b.weight - a.weight).slice(0, 5).reduce((s, w) => s + w.weight, 0);
      const sectorWeights = {};
      weights.forEach(w => { sectorWeights[w.sector] = (sectorWeights[w.sector] || 0) + w.weight; });
      const maxSectorWeight = Math.max(...Object.values(sectorWeights));

      portfolio = {
        vol: portVol,
        annReturn: portAnnRet,
        sharpe: portSharpe,
        maxDD: portMdd,
        cagr: portCagr,
        beta: portBeta,
        alpha,
        var95Pct: var95Parametric,
        var95Value: var95Parametric * lastValue,
        var95Historical,
        hhi,
        top5,
        sectorWeights,
        maxSectorWeight,
      };

      // Benchmark comparison: normalize all to 100 at the portfolio start date.
      const dates = port.timestamps.map(ts => new Date(ts * 1000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
      const portBase = port.values[0];
      const portNorm = port.values.map(v => parseFloat(((v / portBase) * 100).toFixed(2)));
      benchmarkComparison.dates = dates;
      benchmarkComparison.series.portfolio = { label: 'Portfolio', values: portNorm };

      BENCHMARKS.forEach(b => {
        const bData = benchmarkSeries[b.key]?.data;
        if (!bData) return;
        const bMap = new Map(bData.map(p => [p.ts, p.close]));
        const vals = port.timestamps.map(t => bMap.get(t));
        const firstValid = vals.find(v => v != null);
        if (!firstValid) return;
        let prev = firstValid;
        const normalized = vals.map(v => {
          if (v != null) prev = v;
          return parseFloat(((prev / firstValid) * 100).toFixed(2));
        });
        benchmarkComparison.series[b.key] = { label: b.label, values: normalized };
      });
    }

    // Correlation matrix across holdings with data.
    const corrMatrix = { symbols: [], matrix: [] };
    const symbolsWithData = holdings.filter(h => stockSeries[h.symbol]).map(h => h.symbol);
    if (symbolsWithData.length >= 2) {
      const filtered = {};
      symbolsWithData.forEach(s => { filtered[s] = stockSeries[s]; });
      const { closes } = alignMultiple(filtered);
      const retsMap = {};
      symbolsWithData.forEach(s => { retsMap[s] = dailyReturns(closes[s]); });
      corrMatrix.symbols = symbolsWithData;
      corrMatrix.matrix = symbolsWithData.map(s1 =>
        symbolsWithData.map(s2 => s1 === s2 ? 1 : parseFloat(correlation(retsMap[s1], retsMap[s2]).toFixed(3)))
      );
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.status(200).json({
      stocks,
      portfolio,
      correlation: corrMatrix,
      benchmarkComparison,
      benchmarksResolved: Object.fromEntries(Object.entries(benchmarkSeries).map(([k, v]) => [k, v.ticker])),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
