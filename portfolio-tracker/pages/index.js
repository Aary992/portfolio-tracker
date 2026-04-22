import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

const PURCHASE_DATE = '2025-12-01';

const HOLDINGS = [
  { name: 'EMMVEE',     symbol: 'EMMVEE.NS',      qty: 22,  avg: 194.70, invested: 4283.40, sector: 'Solar' },
  { name: 'ADANIPOWER', symbol: 'ADANIPOWER.NS',  qty: 24,  avg: 148.27, invested: 3558.64, sector: 'Power' },
  { name: 'NATIONALUM', symbol: 'NATIONALUM.NS',  qty: 19,  avg: 334.63, invested: 6358.00, sector: 'Metals' },
  { name: 'CGPOWER',    symbol: 'CGPOWER.NS',     qty: 4,   avg: 589.90, invested: 2359.60, sector: 'Capital Goods' },
  { name: 'TATAPOWER',  symbol: 'TATAPOWER.NS',   qty: 10,  avg: 356.78, invested: 3567.80, sector: 'Power' },
  { name: 'PINELABS',   symbol: 'PINELABS.NS',    qty: 5,   avg: 161.81, invested:  809.05, sector: 'Fintech' },
  { name: 'HINDCOPPER', symbol: 'HINDCOPPER.NS',  qty: 11,  avg: 480.03, invested: 5280.35, sector: 'Metals' },
  { name: 'BHEL',       symbol: 'BHEL.NS',        qty: 8,   avg: 280.92, invested: 2247.40, sector: 'Capital Goods' },
  { name: 'E2E',        symbol: 'E2ENETWORKS.NS', qty: 1,   avg: 2132.00,invested: 2132.00, sector: 'Tech' },
  { name: 'ETERNAL',    symbol: 'ETERNAL.NS',     qty: 4,   avg: 275.00, invested: 1100.00, sector: 'Consumer' },
  { name: 'GROWW',      symbol: 'GROWW.NS',       qty: 10,  avg: 177.90, invested: 1779.00, sector: 'Fintech' },
  { name: 'IDEA',       symbol: 'IDEA.NS',        qty: 244, avg:  11.83, invested: 2886.90, sector: 'Telecom' },
  { name: 'ITC',        symbol: 'ITC.NS',         qty: 12,  avg: 325.12, invested: 3901.50, sector: 'FMCG' },
  { name: 'MOSCHIP',    symbol: 'MOSCHIP.NS',     qty: 14,  avg: 199.31, invested: 2790.40, sector: 'Tech' },
  { name: 'ONGC',       symbol: 'ONGC.NS',        qty: 13,  avg: 251.80, invested: 3273.42, sector: 'Oil & Gas' },
  { name: 'RVNL',       symbol: 'RVNL.NS',        qty: 6,   avg: 360.85, invested: 2165.10, sector: 'Infrastructure' },
  { name: 'SAIL',       symbol: 'SAIL.NS',        qty: 10,  avg: 148.00, invested: 1480.09, sector: 'Metals' },
  { name: 'SUZLON',     symbol: 'SUZLON.NS',      qty: 10,  avg:  65.87, invested:  658.70, sector: 'Solar' },
  { name: 'VIKRAMSOLR', symbol: 'VIKRAMSOLR.NS',  qty: 8,   avg: 203.92, invested: 1631.40, sector: 'Solar' },
];

const SECTOR_COLORS = {
  'Solar':          '#fbbf24',
  'Power':          '#60a5fa',
  'Metals':         '#a78bfa',
  'Capital Goods':  '#34d399',
  'Fintech':        '#f472b6',
  'Tech':           '#38bdf8',
  'Consumer':       '#fb923c',
  'Telecom':        '#94a3b8',
  'FMCG':           '#86efac',
  'Oil & Gas':      '#fca5a5',
  'Infrastructure': '#c084fc',
};

const BENCHMARK_COLORS = {
  portfolio:   '#00e5ff',
  nifty50:     '#fbbf24',
  nifty500:    '#a78bfa',
  midcap150:   '#34d399',
  smallcap150: '#f472b6',
};

const BENCHMARK_LABELS = {
  portfolio:   'Portfolio',
  nifty50:     'Nifty 50',
  nifty500:    'Nifty 500',
  midcap150:   'Midcap 150',
  smallcap150: 'Smallcap 150',
};

const fmt    = (n) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '—';
const fmtPct = (n) => n != null && Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : '—';
const fmtNum = (n, d = 2) => n != null && Number.isFinite(n) ? n.toFixed(d) : '—';
const fmtTime= (ts) => ts ? new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtVol = (v) => {
  if (!v) return '—';
  if (v >= 1e7) return `${(v/1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `${(v/1e5).toFixed(2)}L`;
  return v.toLocaleString('en-IN');
};

const C = {
  bg:     '#080808',
  card:   '#0f0f0f',
  card2:  '#131313',
  border: '#1e1e1e',
  border2:'#2a2a2a',
  green:  '#00e676',
  red:    '#ff5252',
  cyan:   '#00e5ff',
  amber:  '#fbbf24',
  text:   '#f0f0f0',
  text2:  '#b0b0b0',
  muted:  '#666',
  font:   "'JetBrains Mono', 'Courier New', monospace",
};

function makeSparkPath(data, W = 80, H = 24) {
  if (!data || data.length < 2) return null;
  const prices = data.map(d => d.price).filter(Boolean);
  if (prices.length < 2) return null;
  const min = Math.min(...prices), max = Math.max(...prices);
  const rng = max - min || 1;
  const pts = prices.map((p, i) => `${(i / (prices.length - 1)) * W},${H - ((p - min) / rng) * H}`);
  return { d: `M ${pts.join(' L ')}`, color: prices.at(-1) >= prices[0] ? C.green : C.red };
}

// Map correlation -> color (red = negative, black = 0, green = positive).
function corrColor(v) {
  if (v == null) return '#222';
  const abs = Math.min(1, Math.abs(v));
  if (v > 0) return `rgba(0, 230, 118, ${abs * 0.85 + 0.08})`;
  return `rgba(255, 82, 82, ${abs * 0.85 + 0.08})`;
}

function Card({ style, children }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, ...style }}>{children}</div>;
}

function SectionLabel({ children, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: C.muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>{children}</div>
      {sub && <div style={{ color: C.text2, fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MetricBox({ label, value, sub, color }) {
  return (
    <div style={{ background: C.card2, borderRadius: 6, padding: '12px 14px' }}>
      <div style={{ color: C.muted, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: color || C.text }}>{value ?? '—'}</div>
      {sub && <div style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ color: C.muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || C.text }}>{value}</div>
      {sub && <div style={{ color: color || C.text2, fontSize: 12, marginTop: 5 }}>{sub}</div>}
    </Card>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 4, padding: '8px 12px', fontFamily: C.font, fontSize: 11 }}>
      <div style={{ color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ color: C.text }}>Rs.{fmt(payload[0].value)}</div>
    </div>
  );
};

function NewsArticle({ a }) {
  return (
    <a href={a.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <div
        style={{ padding: '12px 16px', background: C.card2, borderRadius: 6, border: `1px solid ${C.border}`, transition: 'border-color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = C.border2}
        onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
      >
        <div style={{ color: C.text, fontSize: 13, lineHeight: 1.6 }}>{a.title}</div>
        <div style={{ color: C.muted, fontSize: 10, marginTop: 5 }}>{a.publisher} · {fmtTime(a.time)}</div>
      </div>
    </a>
  );
}

export default function Portfolio() {
  const [prices,          setPrices]          = useState({});
  const [sparklines,      setSparklines]      = useState({});
  const [lastUpdate,      setLastUpdate]      = useState(null);
  const [sortBy,          setSortBy]          = useState('pnl');
  const [sortDir,         setSortDir]         = useState(-1);
  const [expanded,        setExpanded]        = useState(null);
  const [chartData,       setChartData]       = useState([]);
  const [chartRange,      setChartRange]      = useState('3m');
  const [modalNews,       setModalNews]       = useState([]);
  const [allNews,         setAllNews]         = useState({});
  const [newsLoading,     setNewsLoading]     = useState(false);
  const [activeNewsStock, setActiveNewsStock] = useState(null);
  const [newsTab,         setNewsTab]         = useState('stock');
  const [risk,            setRisk]            = useState(null);
  const [riskLoading,     setRiskLoading]     = useState(false);

  const fetchPrices = useCallback(async () => {
    const symbols = HOLDINGS.map(h => h.symbol).join(',');
    try {
      const res  = await fetch(`/api/quote?symbols=${symbols}`);
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const map = {};
      data.forEach(q => { map[q.symbol] = q; });
      setPrices(map);
      setLastUpdate(new Date());
    } catch (e) { console.error('Price fetch error', e); }
  }, []);

  const fetchSparklines = useCallback(async () => {
    const results = await Promise.all(
      HOLDINGS.map(async (h) => {
        try {
          const res  = await fetch(`/api/chart?symbol=${h.symbol}&range=1mo`);
          const data = await res.json();
          return { symbol: h.symbol, data: Array.isArray(data) ? data : [] };
        } catch { return { symbol: h.symbol, data: [] }; }
      })
    );
    const map = {};
    results.forEach(({ symbol, data }) => { map[symbol] = data; });
    setSparklines(map);
  }, []);

  const fetchChart = useCallback(async (symbol, range) => {
    setChartData([]);
    try {
      const res  = await fetch(`/api/chart?symbol=${symbol}&range=${range}`);
      const data = await res.json();
      setChartData(Array.isArray(data) ? data : []);
    } catch { setChartData([]); }
  }, []);

  const fetchModalNews = useCallback(async (symbol) => {
    setModalNews([]);
    try {
      const res  = await fetch(`/api/news?symbol=${symbol}`);
      const data = await res.json();
      setModalNews(Array.isArray(data) ? data : []);
    } catch { setModalNews([]); }
  }, []);

  const fetchAllNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const symbols = HOLDINGS.map(h => h.symbol).join(',');
      const res  = await fetch(`/api/allnews?symbols=${symbols}`);
      const data = await res.json();
      if (data?.stockNews) {
        setAllNews(data);
        setActiveNewsStock(HOLDINGS[0].symbol);
      }
    } catch (e) { console.error(e); }
    setNewsLoading(false);
  }, []);

  const fetchRisk = useCallback(async () => {
    setRiskLoading(true);
    try {
      const payload = HOLDINGS.map(h => ({ symbol: h.symbol, qty: h.qty, invested: h.invested, name: h.name, sector: h.sector }));
      const res = await fetch(`/api/risk?holdings=${encodeURIComponent(JSON.stringify(payload))}`);
      const data = await res.json();
      if (data?.stocks) setRisk(data);
    } catch (e) { console.error('Risk fetch error', e); }
    setRiskLoading(false);
  }, []);

  useEffect(() => {
    fetchPrices();
    fetchSparklines();
    fetchAllNews();
    fetchRisk();
    const iv = setInterval(fetchPrices, 60000);
    return () => clearInterval(iv);
  }, [fetchPrices, fetchSparklines, fetchAllNews, fetchRisk]);

  useEffect(() => {
    if (expanded) {
      fetchChart(expanded.symbol, chartRange);
      fetchModalNews(expanded.symbol);
    }
  }, [expanded, chartRange, fetchChart, fetchModalNews]);

  const enriched = HOLDINGS.map(h => {
    const q            = prices[h.symbol];
    const price        = q?.price ?? null;
    const currentValue = price ? price * h.qty : null;
    const pnl          = currentValue != null ? currentValue - h.invested : null;
    const pnlPct       = pnl != null ? (pnl / h.invested) * 100 : null;
    const dayChange    = q?.change ?? null;
    const dayPnl       = dayChange != null ? dayChange * h.qty : null;
    const dayPct       = q?.changePercent ?? null;
    const week52High   = q?.fiftyTwoWeekHigh ?? null;
    const week52Low    = q?.fiftyTwoWeekLow  ?? null;
    const volume       = q?.volume ?? null;
    const marketCap    = q?.marketCap ?? null;
    const r            = risk?.stocks?.[h.symbol];
    return {
      ...h,
      price, currentValue, pnl, pnlPct, dayChange, dayPnl, dayPct,
      week52High, week52Low, volume, marketCap,
      vol: r?.vol, beta: r?.beta, sharpe: r?.sharpe, maxDD: r?.maxDD, cagr: r?.cagr,
    };
  });

  const priced        = enriched.filter(h => h.price != null);
  const totalInvested = HOLDINGS.reduce((s, h) => s + h.invested, 0);
  const totalValue    = priced.reduce((s, h) => s + h.currentValue, 0);
  const totalPnl      = priced.reduce((s, h) => s + h.pnl, 0);
  const totalPnlPct   = totalInvested ? (totalPnl / totalInvested) * 100 : 0;
  const dayPnlTotal   = priced.reduce((s, h) => s + (h.dayPnl || 0), 0);
  const winners       = priced.filter(h => h.pnl > 0).length;
  const losers        = priced.filter(h => h.pnl < 0).length;
  const winRate       = priced.length ? ((winners / priced.length) * 100).toFixed(0) : 0;
  const best          = priced.length ? priced.reduce((a, b) => b.pnlPct > a.pnlPct ? b : a) : null;
  const worst         = priced.length ? priced.reduce((a, b) => b.pnlPct < a.pnlPct ? b : a) : null;

  // Actual CAGR based on assumed Dec 1 2025 entry.
  const daysHeld = useMemo(() => {
    const purchase = new Date(PURCHASE_DATE);
    return Math.max(1, Math.floor((Date.now() - purchase.getTime()) / 86400000));
  }, []);
  const actualCagr = totalInvested > 0 && totalValue > 0
    ? (Math.pow(totalValue / totalInvested, 365 / daysHeld) - 1) * 100
    : null;

  const sectorMap = {};
  enriched.forEach(h => { sectorMap[h.sector] = (sectorMap[h.sector] || 0) + (h.currentValue || h.invested); });
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);

  const pnlBarData = enriched.filter(h => h.pnl != null).sort((a, b) => a.pnlPct - b.pnlPct).map(h => ({ name: h.name, pct: parseFloat(h.pnlPct.toFixed(2)), pnl: Math.round(h.pnl) }));

  const sorted = [...enriched].sort((a, b) => {
    const va = a[sortBy] ?? -Infinity, vb = b[sortBy] ?? -Infinity;
    return (vb - va) * sortDir;
  });

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d * -1);
    else { setSortBy(col); setSortDir(-1); }
  };

  const allocBar = enriched.filter(h => h.currentValue && h.currentValue > 0).sort((a, b) => b.currentValue - a.currentValue);

  // Benchmark comparison chart data — merge per-date values.
  const benchmarkChartData = useMemo(() => {
    if (!risk?.benchmarkComparison?.dates?.length) return [];
    const { dates, series } = risk.benchmarkComparison;
    return dates.map((date, i) => {
      const row = { date };
      Object.keys(series).forEach(key => { row[key] = series[key].values[i]; });
      return row;
    });
  }, [risk]);

  const benchmarkKeys = useMemo(() => (risk?.benchmarkComparison ? Object.keys(risk.benchmarkComparison.series) : []), [risk]);

  const tabBtnStyle = (active) => ({
    background: active ? C.cyan : C.border,
    color: active ? '#000' : C.text2,
    border: 'none',
    padding: '6px 18px',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: C.font,
    fontSize: 10,
    fontWeight: active ? 600 : 400,
    letterSpacing: 1,
  });

  const stockBtnStyle = (active, hasContent) => ({
    background: active ? C.cyan : C.border,
    color: active ? '#000' : hasContent ? C.text : C.muted,
    border: 'none',
    padding: '5px 11px',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: C.font,
    fontSize: 10,
    fontWeight: active ? 600 : 400,
    letterSpacing: 0.5,
  });

  const P = risk?.portfolio;

  return (
    <>
      <Head>
        <title>Aarit Shah Portfolio</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: ${C.bg}; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-thumb { background: ${C.border2}; border-radius: 3px; }
          a { color: inherit; }
        `}</style>
      </Head>

      <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: C.font, fontSize: 13 }}>

        {/* Header */}
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', letterSpacing: 1 }}>
              AARIT SHAH <span style={{ color: C.cyan }}>· PORTFOLIO</span>
            </div>
            <div style={{ color: C.text2, fontSize: 11, marginTop: 3 }}>
              {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Fetching prices...'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: C.green, fontSize: 11 }}>{priced.length}/{HOLDINGS.length} prices live</div>
            <div style={{ color: C.text2, fontSize: 11 }}>NSE · Auto-refresh 60s</div>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, padding: '20px 24px 0' }}>
          <SummaryCard label="Portfolio Value"  value={`Rs.${fmt(totalValue)}`}                                           sub={fmtPct(totalPnlPct)}   color={totalPnl >= 0 ? C.green : C.red} />
          <SummaryCard label="Total P&L"        value={`${totalPnl >= 0 ? '+' : '-'}Rs.${fmt(Math.abs(totalPnl))}`}      sub={fmtPct(totalPnlPct)}   color={totalPnl >= 0 ? C.green : C.red} />
          <SummaryCard label="Day's P&L"        value={`${dayPnlTotal >= 0 ? '+' : '-'}Rs.${fmt(Math.abs(dayPnlTotal))}`} sub="across all holdings"   color={dayPnlTotal >= 0 ? C.green : C.red} />
          <SummaryCard label="Invested"         value={`Rs.${fmt(totalInvested)}`}                                        sub={`since ${PURCHASE_DATE}`} color={C.text} />
          <SummaryCard label="CAGR (annualized)" value={fmtPct(actualCagr)}                                               sub={`${daysHeld}d held`}    color={actualCagr >= 0 ? C.green : C.red} />
          <SummaryCard label="Winners / Losers" value={`${winners} / ${losers}`}                                          sub={`${winRate}% win rate`} color={C.cyan} />
        </div>

        {/* Best / Worst */}
        {best && worst && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 24px 0' }}>
            {[{ label: 'BEST PERFORMER', h: best, color: C.green }, { label: 'WORST PERFORMER', h: worst, color: C.red }].map(({ label, h, color }) => (
              <Card key={label} style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: C.muted, fontSize: 10, letterSpacing: 2 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginTop: 4 }}>{h.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color, fontSize: 22, fontWeight: 600 }}>{fmtPct(h.pnlPct)}</div>
                  <div style={{ color, fontSize: 12 }}>{h.pnl >= 0 ? '+' : '-'}Rs.{fmt(Math.abs(h.pnl))}</div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── RISK & ANALYTICS ── */}
        <div style={{ padding: '12px 24px 0' }}>
          <Card style={{ padding: '20px 24px' }}>
            <SectionLabel sub="Computed from 1 year of daily returns · Risk-free rate 7% (India 10Y G-Sec) · Beta vs Nifty 50">
              Risk & Analytics
            </SectionLabel>
            {!P && riskLoading && <div style={{ color: C.muted, fontSize: 12 }}>Computing risk metrics from 1 year of price history…</div>}
            {!P && !riskLoading && <div style={{ color: C.muted, fontSize: 12 }}>Risk metrics unavailable. Try refreshing.</div>}
            {P && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
                  <MetricBox label="Annualized Vol" value={fmtPct(P.vol * 100)}                color={C.amber} sub="std dev · 1y" />
                  <MetricBox label="Beta vs Nifty"  value={fmtNum(P.beta, 2)}                  color={C.cyan}  sub={P.beta > 1 ? 'more volatile than market' : 'less volatile than market'} />
                  <MetricBox label="Sharpe Ratio"   value={fmtNum(P.sharpe, 2)}                color={P.sharpe > 1 ? C.green : P.sharpe > 0 ? C.amber : C.red} sub="risk-adjusted return" />
                  <MetricBox label="Alpha vs Nifty" value={fmtPct(P.alpha != null ? P.alpha * 100 : null)} color={P.alpha >= 0 ? C.green : C.red} sub="CAPM excess return" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
                  <MetricBox label="Max Drawdown"   value={fmtPct(-P.maxDD * 100)}             color={C.red}  sub="peak-to-trough" />
                  <MetricBox label="VaR 95% (1d)"   value={`Rs.${fmt(P.var95Value)}`}          color={C.red}  sub={`${(P.var95Pct * 100).toFixed(2)}% of portfolio`} />
                  <MetricBox label="HHI Concentration" value={fmtNum(P.hhi * 10000, 0)}          color={P.hhi > 0.18 ? C.red : P.hhi > 0.10 ? C.amber : C.green} sub={P.hhi > 0.18 ? 'concentrated' : P.hhi > 0.10 ? 'moderate' : 'diversified'} />
                  <MetricBox label="Top-5 Weight"   value={fmtPct(P.top5 * 100)}               color={C.cyan} sub="% of portfolio in top 5" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <MetricBox label="1Y Historical Return" value={fmtPct(P.annReturn * 100)}    color={P.annReturn >= 0 ? C.green : C.red} sub="hypothetical, held 1y" />
                  <MetricBox label="1Y CAGR (hypothetical)" value={fmtPct(P.cagr * 100)}        color={P.cagr >= 0 ? C.green : C.red} sub="if held 1y" />
                  <MetricBox label="VaR 95% Historical"  value={fmtPct(P.var95Historical * 100)} color={C.red}  sub="5th pctile daily loss" />
                  <MetricBox label="Max Sector Weight"  value={fmtPct(P.maxSectorWeight * 100)} color={P.maxSectorWeight > 0.35 ? C.red : C.text} sub="single sector exposure" />
                </div>
              </>
            )}
          </Card>
        </div>

        {/* ── BENCHMARK COMPARISON ── */}
        {benchmarkChartData.length > 0 && (
          <div style={{ padding: '12px 24px 0' }}>
            <Card style={{ padding: '20px 24px' }}>
              <SectionLabel sub="Normalized to 100 at start of 1-year window · hypothetical current holdings held throughout">
                Portfolio vs Benchmarks (1Y)
              </SectionLabel>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={benchmarkChartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9, fontFamily: C.font }} interval={Math.floor(benchmarkChartData.length / 10)} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 9, fontFamily: C.font }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 4, fontFamily: C.font, fontSize: 11 }}
                    labelStyle={{ color: C.muted }}
                    itemSorter={item => -item.value}
                  />
                  <Legend
                    iconType="line"
                    wrapperStyle={{ fontSize: 10, fontFamily: C.font, color: C.text2 }}
                    formatter={key => BENCHMARK_LABELS[key] || key}
                  />
                  {benchmarkKeys.map(key => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={BENCHMARK_COLORS[key] || '#888'}
                      strokeWidth={key === 'portfolio' ? 2.2 : 1.2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              {risk?.benchmarksResolved && (
                <div style={{ color: C.muted, fontSize: 9, marginTop: 8, letterSpacing: 1 }}>
                  Tickers: {Object.entries(risk.benchmarksResolved).map(([k, t]) => `${BENCHMARK_LABELS[k]} (${t})`).join(' · ')}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Performance Analytics (existing pie + bar) */}
        <div style={{ padding: '12px 24px 0' }}>
          <Card style={{ padding: '20px 24px' }}>
            <SectionLabel>Performance Analytics</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>

              {/* Sector Pie */}
              <div>
                <div style={{ color: C.text2, fontSize: 10, letterSpacing: 1.5, marginBottom: 12 }}>SECTOR BREAKDOWN</div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div style={{ flexShrink: 0, width: 170, height: 170 }}>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={sectorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} innerRadius={38} strokeWidth={0}>
                          {sectorData.map(s => <Cell key={s.name} fill={SECTOR_COLORS[s.name] || '#888'} />)}
                        </Pie>
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const pct = totalValue > 0 ? ((payload[0].value / totalValue) * 100).toFixed(1) : 0;
                          return (
                            <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 4, padding: '8px 12px', fontFamily: C.font, fontSize: 11 }}>
                              <div style={{ color: C.text }}>{payload[0].name}</div>
                              <div style={{ color: C.muted }}>Rs.{fmt(payload[0].value)} · {pct}%</div>
                            </div>
                          );
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1 }}>
                    {sectorData.map(s => {
                      const pct = totalValue > 0 ? ((s.value / totalValue) * 100).toFixed(1) : 0;
                      return (
                        <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: SECTOR_COLORS[s.name] || '#888', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: C.text2 }}>{s.name}</span>
                          </div>
                          <span style={{ color: C.text, fontSize: 11, fontWeight: 500 }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* P&L Bar */}
              <div>
                <div style={{ color: C.text2, fontSize: 10, letterSpacing: 1.5, marginBottom: 12 }}>RETURN BY STOCK (%)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={pnlBarData} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                    <XAxis type="number" dataKey="pct" tick={{ fill: C.muted, fontSize: 9, fontFamily: C.font }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: C.text2, fontSize: 9, fontFamily: C.font }} width={80} axisLine={false} tickLine={false} />
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical horizontal={false} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 4, padding: '8px 12px', fontFamily: C.font, fontSize: 11 }}>
                          <div style={{ color: C.text }}>{d.name}</div>
                          <div style={{ color: d.pct >= 0 ? C.green : C.red }}>{fmtPct(d.pct)} · {d.pnl >= 0 ? '+' : '-'}Rs.{fmt(Math.abs(d.pnl))}</div>
                        </div>
                      );
                    }} />
                    <Bar dataKey="pct" radius={[0, 3, 3, 0]} maxBarSize={14}>
                      {pnlBarData.map(e => <Cell key={e.name} fill={e.pct >= 0 ? C.green : C.red} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>

        {/* Holdings Table */}
        <div style={{ padding: '12px 24px 0' }}>
          <Card style={{ overflow: 'hidden' }}>
            <div style={{ color: C.text2, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', padding: '16px 16px 8px' }}>Holdings · click any row for details</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
                <thead>
                  <tr>
                    {[
                      ['name','STOCK'],
                      ['_spark','1M'],
                      ['price','LTP'],
                      ['invested','INVESTED'],
                      ['currentValue','CURRENT'],
                      ['pnl','P&L'],
                      ['vol','VOL'],
                      ['beta','BETA'],
                    ].map(([col, label]) => (
                      <th
                        key={col}
                        onClick={() => col !== '_spark' && handleSort(col)}
                        style={{ color: C.text2, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', padding: '10px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'left', cursor: col !== '_spark' ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}
                      >
                        {label} {sortBy === col ? (sortDir === -1 ? '↓' : '↑') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((h) => {
                    const spark = makeSparkPath(sparklines[h.symbol]);
                    return (
                      <tr
                        key={h.symbol}
                        onClick={() => { setExpanded(h); setChartRange('3m'); }}
                        style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#141414'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ fontWeight: 500, color: C.text }}>{h.name}</div>
                          <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{h.qty} shares · avg Rs.{h.avg}</div>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          {spark
                            ? <svg width={80} height={24} style={{ display: 'block' }}><path d={spark.d} fill="none" stroke={spark.color} strokeWidth={1.5} /></svg>
                            : <span style={{ color: C.muted }}>—</span>}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ color: C.text }}>{h.price ? `Rs.${fmt(h.price)}` : '—'}</div>
                          {h.dayPct != null && <div style={{ color: h.dayPct >= 0 ? C.green : C.red, fontSize: 11 }}>{fmtPct(h.dayPct)}</div>}
                        </td>
                        <td style={{ padding: '13px 16px', color: C.text }}>Rs.{fmt(h.invested)}</td>
                        <td style={{ padding: '13px 16px', color: C.text }}>{h.currentValue ? `Rs.${fmt(h.currentValue)}` : '—'}</td>
                        <td style={{ padding: '13px 16px' }}>
                          {h.pnl != null
                            ? <div style={{ color: h.pnl >= 0 ? C.green : C.red, fontWeight: 500 }}>{h.pnl >= 0 ? '+' : '-'}Rs.{fmt(Math.abs(h.pnl))}</div>
                            : <div style={{ color: C.muted }}>—</div>}
                          {h.pnlPct != null && <div style={{ color: h.pnlPct >= 0 ? C.green : C.red, fontSize: 11 }}>{fmtPct(h.pnlPct)}</div>}
                        </td>
                        <td style={{ padding: '13px 16px', color: C.text2, fontSize: 12 }}>
                          {h.vol != null ? `${(h.vol * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td style={{ padding: '13px 16px', color: h.beta != null && h.beta > 1 ? C.amber : C.text2, fontSize: 12 }}>
                          {h.beta != null ? h.beta.toFixed(2) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Correlation Heatmap */}
        {risk?.correlation?.symbols?.length >= 2 && (
          <div style={{ padding: '12px 24px 0' }}>
            <Card style={{ padding: '20px 24px' }}>
              <SectionLabel sub="Pearson correlation of daily returns · 1y · green = positive, red = negative">
                Correlation Matrix
              </SectionLabel>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 9, fontFamily: C.font }}>
                  <thead>
                    <tr>
                      <th style={{ padding: 4 }}></th>
                      {risk.correlation.symbols.map(s => {
                        const h = HOLDINGS.find(x => x.symbol === s);
                        return <th key={s} style={{ padding: '4px 2px', color: C.text2, fontSize: 9, writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 60 }}>{h?.name || s}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {risk.correlation.symbols.map((s1, i) => {
                      const h1 = HOLDINGS.find(x => x.symbol === s1);
                      return (
                        <tr key={s1}>
                          <td style={{ padding: '2px 8px 2px 0', color: C.text2, textAlign: 'right', fontSize: 10, whiteSpace: 'nowrap' }}>{h1?.name || s1}</td>
                          {risk.correlation.symbols.map((s2, j) => {
                            const v = risk.correlation.matrix[i][j];
                            return (
                              <td key={s2} title={`${h1?.name} ↔ ${HOLDINGS.find(x=>x.symbol===s2)?.name}: ${v?.toFixed(2)}`} style={{ width: 30, height: 22, background: corrColor(v), textAlign: 'center', color: Math.abs(v) > 0.5 ? '#000' : C.text, fontSize: 9, fontWeight: 500, border: `1px solid ${C.bg}` }}>
                                {i === j ? '' : (v ?? 0).toFixed(2).replace(/^0/, '').replace(/^-0/, '-')}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ color: C.muted, fontSize: 10, marginTop: 12 }}>
                Lower correlations = better diversification. Portfolio theory: target avg correlation &lt; 0.5.
              </div>
            </Card>
          </div>
        )}

        {/* Allocation Bar */}
        <div style={{ padding: '12px 24px 0' }}>
          <Card style={{ padding: '20px 24px' }}>
            <SectionLabel>Portfolio Allocation</SectionLabel>
            {totalValue > 0 && (
              <>
                <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 14 }}>
                  {allocBar.map((h, i) => {
                    const pct = (h.currentValue / totalValue) * 100;
                    return <div key={h.symbol} style={{ width: `${pct}%`, background: `hsl(${(i * 47) % 360}, 65%, 55%)` }} title={`${h.name}: ${pct.toFixed(1)}%`} />;
                  })}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                  {allocBar.map((h, i) => {
                    const pct = ((h.currentValue / totalValue) * 100).toFixed(1);
                    return (
                      <div key={h.symbol} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.text2 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: `hsl(${(i * 47) % 360}, 65%, 55%)` }} />
                        {h.name} <span style={{ color: C.text }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* News */}
        <div style={{ padding: '12px 24px 40px' }}>
          <Card style={{ padding: '20px 24px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <SectionLabel>Market News</SectionLabel>
              <button
                onClick={fetchAllNews}
                disabled={newsLoading}
                style={{ background: C.border, border: `1px solid ${C.border2}`, color: C.text2, padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: C.font, fontSize: 10, letterSpacing: 1 }}
              >
                {newsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 14 }}>
              {[['stock', 'My Stocks'], ['indian', 'Indian Markets'], ['global', 'Global Macro']].map(([key, label]) => (
                <button key={key} onClick={() => setNewsTab(key)} style={tabBtnStyle(newsTab === key)}>
                  {label.toUpperCase()}
                </button>
              ))}
            </div>

            {newsLoading && <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Loading news...</div>}

            {newsTab === 'stock' && (
              <>
                {allNews.stockNews ? (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                      {HOLDINGS.map(h => {
                        const count  = allNews.stockNews[h.symbol]?.length || 0;
                        const active = activeNewsStock === h.symbol;
                        return (
                          <button key={h.symbol} onClick={() => setActiveNewsStock(h.symbol)} style={stockBtnStyle(active, count > 0)}>
                            {h.name} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                          </button>
                        );
                      })}
                    </div>
                    {activeNewsStock && allNews.stockNews[activeNewsStock]?.length > 0
                      ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {allNews.stockNews[activeNewsStock].map((a, i) => <NewsArticle key={i} a={a} />)}
                        </div>
                      )
                      : activeNewsStock && (
                        <div style={{ color: C.muted, fontSize: 12 }}>
                          No news in the last 60 days for {activeNewsStock?.replace('.NS', '')}.
                        </div>
                      )
                    }
                  </>
                ) : !newsLoading && (
                  <div style={{ color: C.muted, fontSize: 12 }}>News loads automatically. If empty, click Refresh.</div>
                )}
              </>
            )}

            {newsTab === 'indian' && (
              <>
                {allNews.indianNews?.length > 0
                  ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {allNews.indianNews.map((a, i) => <NewsArticle key={i} a={a} />)}
                    </div>
                  )
                  : !newsLoading && (
                    <div style={{ color: C.muted, fontSize: 12 }}>No Indian markets news loaded. Click Refresh.</div>
                  )
                }
              </>
            )}

            {newsTab === 'global' && (
              <>
                {allNews.globalNews?.length > 0
                  ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {allNews.globalNews.map((a, i) => <NewsArticle key={i} a={a} />)}
                    </div>
                  )
                  : !newsLoading && (
                    <div style={{ color: C.muted, fontSize: 12 }}>No global macro news loaded. Click Refresh.</div>
                  )
                }
              </>
            )}

          </Card>
        </div>

        {/* Modal */}
        {expanded && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) setExpanded(null); }}
          >
            <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 12, width: '100%', maxWidth: 860, maxHeight: '92vh', overflow: 'auto', padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>{expanded.name}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{expanded.symbol} · {expanded.sector}</div>
                </div>
                <button onClick={() => setExpanded(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 24, lineHeight: 1 }}>x</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
                <MetricBox label="LTP"       value={expanded.price ? `Rs.${fmt(expanded.price)}` : '—'} />
                <MetricBox label="Avg Buy"   value={`Rs.${expanded.avg}`} />
                <MetricBox label="P&L"       value={expanded.pnl != null ? `${expanded.pnl >= 0 ? '+' : '-'}Rs.${fmt(Math.abs(expanded.pnl))}` : '—'} color={expanded.pnl != null ? (expanded.pnl >= 0 ? C.green : C.red) : undefined} />
                <MetricBox label="Return"    value={fmtPct(expanded.pnlPct)} color={expanded.pnlPct != null ? (expanded.pnlPct >= 0 ? C.green : C.red) : undefined} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
                <MetricBox label="Qty"        value={`${expanded.qty} shares`} />
                <MetricBox label="Invested"   value={`Rs.${fmt(expanded.invested)}`} />
                <MetricBox label="Current"    value={expanded.currentValue ? `Rs.${fmt(expanded.currentValue)}` : '—'} />
                <MetricBox label="Day Change" value={expanded.dayPct != null ? fmtPct(expanded.dayPct) : '—'} color={expanded.dayPct != null ? (expanded.dayPct >= 0 ? C.green : C.red) : undefined} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
                <MetricBox label="52W High"   value={expanded.week52High ? `Rs.${fmt(expanded.week52High)}` : '—'} color={C.green} />
                <MetricBox label="52W Low"    value={expanded.week52Low  ? `Rs.${fmt(expanded.week52Low)}`  : '—'} color={C.red} />
                <MetricBox label="Volume"     value={fmtVol(expanded.volume)} />
                <MetricBox label="Market Cap" value={expanded.marketCap ? `Rs.${fmtVol(expanded.marketCap)}` : '—'} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
                <MetricBox label="Vol (1Y)"     value={expanded.vol != null ? fmtPct(expanded.vol * 100) : '—'}  color={C.amber} sub="annualized std" />
                <MetricBox label="Beta"         value={fmtNum(expanded.beta, 2)}                                   color={expanded.beta > 1 ? C.amber : C.cyan} sub="vs Nifty 50" />
                <MetricBox label="Sharpe"       value={fmtNum(expanded.sharpe, 2)}                                 color={expanded.sharpe > 1 ? C.green : expanded.sharpe > 0 ? C.amber : C.red} />
                <MetricBox label="Max Drawdown" value={expanded.maxDD != null ? fmtPct(-expanded.maxDD * 100) : '—'} color={C.red} />
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['1w','1m','3m','6m','1y'].map(r => (
                  <button
                    key={r}
                    onClick={() => setChartRange(r)}
                    style={{ background: chartRange === r ? C.cyan : C.border, color: chartRange === r ? '#000' : C.text, border: 'none', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: C.font, fontSize: 11, fontWeight: chartRange === r ? 600 : 400 }}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>

              {chartData.length > 0
                ? <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9, fontFamily: C.font }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: C.muted, fontSize: 9, fontFamily: C.font }} domain={['auto','auto']} tickFormatter={v => `Rs.${v}`} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line type="monotone" dataKey="price" stroke={C.cyan} dot={false} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                : <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 12 }}>Loading chart...</div>
              }

              {modalNews.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ color: C.muted, fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>LATEST NEWS</div>
                  {modalNews.map((n, i) => (
                    <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
                      <div style={{ padding: '10px 14px', background: C.card2, borderRadius: 5, border: `1px solid ${C.border}` }}>
                        <div style={{ color: C.text, fontSize: 12, lineHeight: 1.5 }}>{n.title}</div>
                        <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>{n.publisher} · {fmtTime(n.time)}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '0 0 20px', color: C.muted, fontSize: 10 }}>
          Prices from Yahoo Finance · News from Moneycontrol, Economic Times, Yahoo · Not financial advice · For personal use only
        </div>
      </div>
    </>
  );
}
