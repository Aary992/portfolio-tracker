# Portfolio Tracker — VZK723

Personal stock portfolio dashboard with live NSE prices, P&L tracking, charts, and news.

## Features
- Live prices from Yahoo Finance (auto-refreshes every 60s)
- Total portfolio value, P&L, day's P&L
- Per-stock: LTP, avg buy, invested, current value, P&L %
- 1-month sparklines for every holding
- Click any stock → price history chart (1w/1m/3m/6m/1y) + latest news
- Portfolio allocation bar
- Sort by any column
- Works on mobile

## Deploy to Vercel (5 minutes)

### Option A — GitHub + Vercel (recommended)

1. Create a new GitHub repo
2. Push this entire folder to it:
   ```
   git init
   git add .
   git commit -m "init"
   git remote add origin https://github.com/YOUR_USERNAME/portfolio-tracker.git
   git push -u origin main
   ```
3. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
4. Click Deploy. Done.

Your dashboard will be live at `https://portfolio-tracker-xxx.vercel.app`

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel
```

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Update Holdings

Edit the `HOLDINGS` array in `pages/index.js`. Each entry:
```js
{ name: 'DISPLAY_NAME', symbol: 'TICKER.NS', qty: 10, avg: 100.00, invested: 1000.00 }
```

`.NS` suffix = NSE. `.BO` = BSE.

## Stack
- Next.js 14 (React)
- Yahoo Finance (free, no API key)
- Recharts for charts
- Zero external dependencies beyond that
